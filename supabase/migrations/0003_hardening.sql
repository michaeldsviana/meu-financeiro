-- =====================================================================
-- 0003 — ENDURECIMENTO DE SEGURANÇA  (versão 2)
--
-- A versão 1 abortava ao encontrar tabela sem RLS. Abortar é seguro,
-- mas não conserta: como a transação inteira volta atrás, nenhuma das
-- outras correções chega a ser aplicada, e a exposição continua.
--
-- Esta versão falha fechada em vez de falhar parada: qualquer tabela
-- sem RLS tem o acesso REVOGADO em vez de bloquear o script. Revogar
-- não apaga dado nenhum e não quebra o app, que consulta apenas as 18
-- tabelas listadas na seção 4.
--
-- Só interrompe se faltar RLS numa tabela que o app realmente usa —
-- aí sim é erro que exige decisão humana.
--
-- Aditiva e idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funções internas não podem ser chamadas de fora
--
-- seed_defaults é SECURITY DEFINER e recebe o uid como parâmetro. Como
-- toda função no Postgres nasce com EXECUTE para PUBLIC, ela estava
-- exposta na API: dava para gravar na conta de outra pessoa e usar o
-- erro de chave estrangeira para descobrir identificadores válidos.
--
-- ensure_defaults() continua chamando seed_defaults normalmente, porque
-- também é SECURITY DEFINER e executa como a dona do banco.
-- ---------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.proname in ('seed_defaults', 'handle_new_user', 'touch_updated_at')
  loop
    execute format('revoke all on function %s from public',        f.assinatura);
    execute format('revoke all on function %s from anon',          f.assinatura);
    execute format('revoke all on function %s from authenticated', f.assinatura);
  end loop;
end $$;

-- A porta legítima: sem parâmetro, usa auth.uid(), recusa sessão nula.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'ensure_defaults'
  ) then
    revoke all on function public.ensure_defaults() from public;
    revoke all on function public.ensure_defaults() from anon;
    grant execute on function public.ensure_defaults() to authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. O papel anon não precisa de nada
--
-- Nenhuma tela funciona sem login. Tirar o acesso do anon fecha a porta
-- antes do RLS, em vez de depender só dele. O login continua funcionando:
-- a autenticação passa pelo schema auth, não pelo public.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke usage on schema public from anon;

-- ---------------------------------------------------------------------
-- 3. Tabela sem RLS perde o acesso, em vez de parar o script
--
-- Nada é apagado. Se depois se confirmar que a tabela é necessária,
-- basta habilitar o RLS, criar a política e conceder de novo.
-- ---------------------------------------------------------------------
do $$
declare t record;
declare tratadas text := '';
begin
  for t in
    select c.relname, c.oid
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format('revoke all on public.%I from anon', t.relname);
    execute format('revoke all on public.%I from authenticated', t.relname);
    tratadas := tratadas || t.relname || ', ';
  end loop;

  if tratadas <> '' then
    raise notice 'Sem RLS, acesso revogado (dados preservados): %',
      rtrim(tratadas, ', ');
  else
    raise notice 'Todas as tabelas de public tem RLS ativo.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. As tabelas que o app usa são inegociáveis
--
-- Esta é a única condição que interrompe o script. Se uma delas estiver
-- sem RLS ou sem política, o app está expondo dado de verdade e a
-- decisão precisa ser sua.
-- ---------------------------------------------------------------------
do $$
declare problema text;
begin
  select string_agg(t.nome, ', ' order by t.nome) into problema
  from (
    select unnest(array[
      'bank_accounts','credit_cards','categories','objectives','investments',
      'investment_allocations','investment_interest','transactions','properties',
      'property_obligations','liabilities','subscriptions','health_costs',
      'capital_costs','reconciliations','import_batches','import_rules',
      'net_worth_snapshots','settings','profiles'
    ]) as nome
  ) t
  join pg_class c on c.relname = t.nome
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where not c.relrowsecurity
     or not exists (
       select 1 from pg_policies p
       where p.schemaname = 'public' and p.tablename = t.nome
     );

  if problema is not null then
    raise exception 'Tabela usada pelo app sem RLS ou sem politica: %', problema;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Fecha o futuro
--
-- Tabela criada daqui em diante não recebe acesso automático. Quem criar
-- precisa habilitar o RLS e conceder de propósito.
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on tables    from authenticated;
alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema public revoke all on functions from anon;

-- ---------------------------------------------------------------------
-- 6. Estado final: o que ficou exposto, e para quem
-- ---------------------------------------------------------------------
select
  c.relname                                             as tabela,
  c.relrowsecurity                                      as rls_ativo,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname) as politicas,
  has_table_privilege('anon',          c.oid, 'SELECT') as anon_le,
  has_table_privilege('authenticated', c.oid, 'SELECT') as autenticado_le
from pg_class c
join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity, c.relname;
