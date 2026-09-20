-- 129_base_operativa_parallel_dependencies.sql
-- Dependencias paralelas sobre mv_base_operativa_unificada_pilot.
-- No reemplaza vistas productivas.

create or replace view public.mv_efectividad_reservas_partner_v487_pilot
with (security_invoker=true) as
select distinct
  to_char(fecha::timestamp with time zone,'YYYY-MM') as periodo,
  trim(codigo_liquidacion) as orden_id
from public.mv_base_operativa_unificada_pilot
where upper(trim(coalesce(estado,''))) in ('RESERVA','RESERVADO')
  and fecha is not null
  and nullif(trim(coalesce(codigo_liquidacion,'')),'') is not null;

create or replace view public.mv_partner_partida_orden_v502_pilot
with (security_invoker=true) as
with src as (
  select
    b.periodo,
    trim(b.codigo_liquidacion) as orden_id,
    b.source_row,
    coalesce(c1.codigo,c2.codigo) as codigo_partner
  from public.mv_base_operativa_unificada_pilot b
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida)
    order by c.source_row
    limit 1
  ) c1 on true
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where c1.codigo is null
      and public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida_alterna)
    order by c.source_row
    limit 1
  ) c2 on true
  where nullif(trim(coalesce(b.codigo_liquidacion,'')),'') is not null
    and coalesce(c1.codigo,c2.codigo) is not null
), agg as (
  select
    periodo,
    orden_id,
    count(distinct upper(trim(codigo_partner)))::integer as codigos_distintos,
    min(upper(trim(codigo_partner))) as codigo_partner,
    max(source_row) as source_row
  from src
  group by periodo,orden_id
)
select periodo,orden_id,codigos_distintos,codigo_partner,source_row
from agg;

create or replace view public.mv_produccion_motivo_historico_v1_pilot
with (security_invoker=true) as
with base as (
  select
    public.mv_norm_key(b.tipo_trabajo) as motivo_norm,
    coalesce(c1.codigo,c2.codigo) as codigo
  from public.mv_base_operativa_unificada_pilot b
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida)
    order by c.source_row
    limit 1
  ) c1 on true
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where c1.codigo is null
      and public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida_alterna)
    order by c.source_row
    limit 1
  ) c2 on true
  where upper(trim(coalesce(b.estado,'')))='FINALIZADA'
    and nullif(public.mv_norm_key(b.tipo_trabajo),'') is not null
), agg as (
  select motivo_norm,codigo,count(*)::integer as soporte
  from base
  where codigo is not null
  group by motivo_norm,codigo
), tot as (
  select motivo_norm,sum(soporte)::integer as total
  from agg
  group by motivo_norm
), ranked as (
  select
    a.motivo_norm,a.codigo,a.soporte,t.total,
    a.soporte::numeric/nullif(t.total,0)::numeric as pureza,
    row_number() over(partition by a.motivo_norm order by a.soporte desc,a.codigo) as rn
  from agg a
  join tot t using(motivo_norm)
)
select motivo_norm,codigo,soporte,total,pureza
from ranked
where rn=1;

create or replace view public.mv_sla_partida_codigo_v323_pilot
with (security_invoker=true) as
with snapshot as (
  select
    s.periodo,
    public.mv_norm_key(s.codigo) as codigo_key,
    s.partida,
    'SLA_SNAPSHOT'::text as origen,
    s.source_row
  from public.sla_ordenes_legacy_snapshot s
  where public.mv_norm_key(s.codigo)<>''
), base_src as (
  select
    b.periodo,b.source_row,'BASE_LIQ'::text as origen,
    public.mv_norm_key(b.codigo_liquidacion) as codigo_key,
    coalesce(nullif(trim(b.tipo_partida),''),nullif(trim(b.tipo_partida_alterna),'')) as partida,
    0 as prioridad
  from public.mv_base_operativa_unificada_pilot b
  where public.mv_norm_key(b.codigo_liquidacion)<>''
  union all
  select
    b.periodo,b.source_row,'BASE_PEDIDO'::text as origen,
    public.mv_norm_key(b.codigo_pedido) as codigo_key,
    coalesce(nullif(trim(b.tipo_partida),''),nullif(trim(b.tipo_partida_alterna),'')) as partida,
    1 as prioridad
  from public.mv_base_operativa_unificada_pilot b
  where public.mv_norm_key(b.codigo_pedido)<>''
), base_ranked as (
  select
    b.*,
    row_number() over(
      partition by b.periodo,b.codigo_key
      order by b.prioridad,
        case when b.prioridad=0 then b.source_row end desc,
        case when b.prioridad=1 then b.source_row end
    ) as rn
  from base_src b
  where b.partida is not null
), base_final as (
  select periodo,codigo_key,partida,origen,source_row
  from base_ranked
  where rn=1
)
select periodo,codigo_key,partida,origen,source_row from snapshot
union all
select b.periodo,b.codigo_key,b.partida,b.origen,b.source_row
from base_final b
where not exists(
  select 1 from snapshot s
  where s.periodo=b.periodo and s.codigo_key=b.codigo_key
);

revoke all on public.mv_efectividad_reservas_partner_v487_pilot from anon,authenticated;
revoke all on public.mv_partner_partida_orden_v502_pilot from anon,authenticated;
revoke all on public.mv_produccion_motivo_historico_v1_pilot from anon,authenticated;
revoke all on public.mv_sla_partida_codigo_v323_pilot from anon,authenticated;

grant select on public.mv_efectividad_reservas_partner_v487_pilot to service_role;
grant select on public.mv_partner_partida_orden_v502_pilot to service_role;
grant select on public.mv_produccion_motivo_historico_v1_pilot to service_role;
grant select on public.mv_sla_partida_codigo_v323_pilot to service_role;
