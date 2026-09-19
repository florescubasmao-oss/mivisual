-- MI VISUAL - SLA bridge de partida preservando histórico publicado
-- Prioridad: SLA_ORDENES_RESUMEN ya publicado por código/periodo.
-- Fallback: BASE_OPERATIVA_HISTORICA migrada para códigos nuevos fuera del snapshot.
-- No altera hojas productivas ni main.

begin;

create or replace view public.mv_sla_partida_codigo_v323
with (security_invoker=true) as
with snapshot as (
  select
    periodo,
    public.mv_norm_key(codigo) as codigo_key,
    partida,
    'SLA_SNAPSHOT'::text as origen,
    source_row
  from public.sla_ordenes_legacy_snapshot
  where public.mv_norm_key(codigo)<>''
),
base_src as (
  select periodo,source_row,'BASE_LIQ'::text as origen,
         public.mv_norm_key(codigo_liquidacion) as codigo_key,
         coalesce(nullif(trim(tipo_partida),''),nullif(trim(tipo_partida_alterna),'')) as partida,
         0 as prioridad
  from public.base_operativa_legacy
  where public.mv_norm_key(codigo_liquidacion)<>''

  union all

  select periodo,source_row,'BASE_PEDIDO'::text as origen,
         public.mv_norm_key(codigo_pedido) as codigo_key,
         coalesce(nullif(trim(tipo_partida),''),nullif(trim(tipo_partida_alterna),'')) as partida,
         1 as prioridad
  from public.base_operativa_legacy
  where public.mv_norm_key(codigo_pedido)<>''
),
base_ranked as (
  select b.*,
         row_number() over(
           partition by periodo,codigo_key
           order by
             prioridad,
             case when prioridad=0 then source_row end desc,
             case when prioridad=1 then source_row end asc
         ) as rn
  from base_src b
  where partida is not null
),
base_final as (
  select periodo,codigo_key,partida,origen,source_row
  from base_ranked
  where rn=1
)
select periodo,codigo_key,partida,origen,source_row
from snapshot

union all

select b.periodo,b.codigo_key,b.partida,b.origen,b.source_row
from base_final b
where not exists (
  select 1
  from snapshot s
  where s.periodo=b.periodo and s.codigo_key=b.codigo_key
);

revoke all on public.mv_sla_partida_codigo_v323 from anon,authenticated;
grant select on public.mv_sla_partida_codigo_v323 to service_role;

commit;