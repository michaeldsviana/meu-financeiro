-- =====================================================================
-- DIAGNÓSTICO — investments2 e health_costs2
--
-- Este script NÃO altera nada. Só lê. Pode rodar à vontade.
-- Objetivo: decidir com fato, não com suposição, se essas tabelas
-- devem ser removidas ou protegidas.
-- =====================================================================

-- 1. Elas têm dados? E têm coluna user_id (dona identificável)?
select
  c.relname                                          as tabela,
  c.relrowsecurity                                   as rls_ativo,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname) as politicas,
  has_table_privilege('anon',          c.oid, 'SELECT') as anon_le,
  has_table_privilege('authenticated', c.oid, 'SELECT') as autenticado_le,
  exists (
    select 1 from information_schema.columns col
    where col.table_schema = 'public'
      and col.table_name = c.relname
      and col.column_name = 'user_id'
  )                                                  as tem_user_id
from pg_class c
join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('investments2', 'health_costs2', 'investments', 'health_costs')
order by c.relname;

-- 2. Quantas linhas há em cada uma?
select 'investments2'  as tabela, count(*) as linhas from public.investments2
union all
select 'investments',        count(*) from public.investments
union all
select 'health_costs2',      count(*) from public.health_costs2
union all
select 'health_costs',       count(*) from public.health_costs;

-- 3. As colunas são iguais às das originais?
--    Se a lista vier vazia, a estrutura é idêntica — indício forte de cópia.
select 'investments2 tem coluna que investments não tem' as observacao, column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'investments2'
  and column_name not in (
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'investments'
  )
union all
select 'investments tem coluna que investments2 não tem', column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'investments'
  and column_name not in (
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'investments2'
  );

-- 4. Alguma coisa no banco depende delas? (chaves estrangeiras, views)
select
  tc.table_name    as tabela_que_depende,
  kcu.column_name  as coluna,
  ccu.table_name   as aponta_para
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name in ('investments2', 'health_costs2');

-- 5. Quando foram criadas, comparado às originais?
--    Ordem de criação (oid crescente) sugere qual veio primeiro.
select c.relname as tabela, c.oid as ordem_de_criacao
from pg_class c
join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public' and c.relkind = 'r'
order by c.oid;
