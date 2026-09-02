-- =====================================================================
-- 0003 — ENDURECIMENTO DE SEGURANÇA
--
-- Corrige achados da auditoria de defaults inseguros.
-- Aditiva e idempotente: pode ser executada mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ACHADO 1 (alto) — seed_defaults era chamável por qualquer um.
--
-- A função é SECURITY DEFINER, então roda como dona do banco e ignora o
-- RLS. Ela recebe o uid como PARÂMETRO, e no Postgres toda função nasce
-- com EXECUTE concedido a PUBLIC. O resultado: qualquer pessoa com a
-- chave publishable — que é pública, está no site — podia chamar
-- POST /rest/v1/rpc/seed_defaults {"uid":"<uuid de outra pessoa>"}
-- e gravar linhas na conta alheia. E, como o uid tem chave estrangeira
-- para auth.users, a diferença entre sucesso e erro revelava se um
-- identificador de usuário existe.
--
-- Correção: tirar o EXECUTE de todo mundo. ensure_defaults() e
-- handle_new_user() continuam funcionando porque também são SECURITY
-- DEFINER e rodam como a dona, que mantém o privilégio.
-- ---------------------------------------------------------------------
revoke all on function public.seed_defaults(uuid) from public;
revoke all on function public.seed_defaults(uuid) from anon;
revoke all on function public.seed_defaults(uuid) from authenticated;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.touch_updated_at() from public;
revoke all on function public.touch_updated_at() from anon;
revoke all on function public.touch_updated_at() from authenticated;

-- ensure_defaults() é a porta legítima: não aceita parâmetro, usa
-- auth.uid() e recusa sessão nula. Só quem está autenticado entra.
revoke all on function public.ensure_defaults() from public;
revoke all on function public.ensure_defaults() from anon;
grant execute on function public.ensure_defaults() to authenticated;

-- ---------------------------------------------------------------------
-- ACHADO 2 (médio) — o papel anon não deve enxergar o schema.
--
-- Nenhuma tela funciona sem login. Retirar o acesso do anon fecha a
-- porta antes do RLS, em vez de depender só dele.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke usage on schema public from anon;

-- ---------------------------------------------------------------------
-- ACHADO 3 (médio) — grant coletivo era inseguro para o futuro.
--
-- A migração 0002 concedeu acesso a "all tables in schema public". Isso
-- resolveu o presente, mas qualquer tabela criada depois entrava sem
-- RLS e já nascia legível por todos os usuários autenticados.
--
-- Correção: default privileges que valem só para tabelas futuras, e uma
-- verificação que ACUSA qualquer tabela sem RLS em vez de deixar passar.
-- ---------------------------------------------------------------------
do $$
declare faltando text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into faltando
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if faltando is not null then
    raise exception 'Tabelas sem RLS em public: %. Habilite antes de continuar.', faltando;
  end if;
end $$;

do $$
declare sem_politica text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into sem_politica
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relkind = 'r'
    and not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
    );

  if sem_politica is not null then
    raise exception 'Tabelas com RLS mas sem política: %.', sem_politica;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Fecha o buraco para o futuro: tabelas criadas daqui em diante não
-- recebem acesso automático. Quem criar terá que conceder de propósito,
-- depois de habilitar o RLS.
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema public revoke all on functions from anon;

-- ---------------------------------------------------------------------
-- Relatório final: o que ficou exposto e para quem.
-- ---------------------------------------------------------------------
select
  c.relname                                as tabela,
  c.relrowsecurity                         as rls_ativo,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as politicas,
  has_table_privilege('anon', c.oid, 'SELECT')          as anon_le,
  has_table_privilege('authenticated', c.oid, 'SELECT') as autenticado_le
from pg_class c
join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public' and c.relkind = 'r'
order by c.relname;
