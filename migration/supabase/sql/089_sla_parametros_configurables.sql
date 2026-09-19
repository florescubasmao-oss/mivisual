
-- 089_sla_parametros_configurables.sql
-- Catálogo SLA configurable incluyendo partidas INACTIVAS.

create or replace function public.mv_bono_sup_parametros_sla_configurables(p_periodo text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
with p as (
  select public.mv_bono_sup_periodo(p_periodo) periodo
),
ref as (
  select periodo,
         make_date(split_part(periodo,'-',1)::int,split_part(periodo,'-',2)::int,15) fecha_ref
  from p
),
catalogo as (
  select distinct on (public.mv_norm_key(s.tipo_orden))
    public.mv_norm_key(s.tipo_orden) tipo_orden_key,
    s.tipo_orden,
    upper(trim(coalesce(s.clasificacion,'OTROS'))) clasificacion,
    s.id base_id
  from public.sla_parametros_legacy_snapshot s
  where public.mv_norm_key(s.tipo_orden)<>''
  order by public.mv_norm_key(s.tipo_orden),s.source_row asc
),
fuentes as (
  select
    s.id,
    s.tipo_orden,
    public.mv_norm_key(s.tipo_orden) tipo_orden_key,
    upper(trim(coalesce(s.clasificacion,'OTROS'))) clasificacion,
    s.sla_minutos,
    s.vigencia_desde,
    s.vigencia_hasta,
    upper(trim(coalesce(s.estado,'ACTIVO'))) estado,
    1 prioridad,
    s.fecha_actualizacion::timestamptz orden_actualizacion,
    s.source_row orden_fila
  from public.sla_parametros_legacy_snapshot s

  union all

  select
    'PG-'||c.id::text,
    c.tipo_orden,
    c.tipo_orden_key,
    c.clasificacion,
    c.sla_minutos,
    c.vigencia_desde,
    c.vigencia_hasta,
    c.estado,
    2,
    c.fecha_actualizacion,
    (100000000+c.id)::integer
  from public.sla_parametros_configuracion c
),
seleccion as (
  select *
  from (
    select
      f.*,
      row_number() over (
        partition by f.tipo_orden_key
        order by
          coalesce(f.vigencia_desde,date '1900-01-01') desc,
          f.prioridad desc,
          coalesce(f.orden_actualizacion,timestamptz '1900-01-01 00:00:00+00') desc,
          f.orden_fila desc
      ) rn
    from fuentes f
    cross join ref r
    where (f.vigencia_desde is null or r.fecha_ref>=f.vigencia_desde)
      and (f.vigencia_hasta is null or r.fecha_ref<=f.vigencia_hasta)
  ) x
  where rn=1
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'id',coalesce(s.id,c.base_id),
      'tipoOrden',c.tipo_orden,
      'clasificacion',coalesce(s.clasificacion,c.clasificacion),
      'minutos',coalesce(s.sla_minutos,140),
      'estado',coalesce(s.estado,'INACTIVO')
    )
    order by c.tipo_orden
  ),
  '[]'::jsonb
)
from catalogo c
left join seleccion s on s.tipo_orden_key=c.tipo_orden_key;
$$;

revoke execute on function public.mv_bono_sup_parametros_sla_configurables(text) from public,anon,authenticated;
grant execute on function public.mv_bono_sup_parametros_sla_configurables(text) to service_role;
