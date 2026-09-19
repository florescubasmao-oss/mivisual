-- MI VISUAL - Recableado: motor V487 y conciliacion
-- Fuente WIN / ordenes. Periodos protegidos usan snapshot.

begin;

create or replace view public.mv_recableado_actual_v487 as
with base as (
  select
    to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM') as periodo,
    coalesce(ex.cuadrilla,iu.cuadrilla,o.cuadrilla) as cuadrilla,
    o.estado,
    o.tipo_trabajo,
    o.motivo_finalizacion,
    o.fecha_ultimo_estado,
    o.fecha_importacion
  from public.ordenes o
  left join public.mv_cuadrillas_tecnicas_v487 ex
    on ex.cuadrilla_key=public.mv_norm_key(o.cuadrilla)
  left join public.mv_cuadrilla_identidad_unica_v487 iu
    on iu.identidad=public.mv_cuadrilla_identidad_v487(o.cuadrilla)
),
calc as (
  select
    periodo,
    cuadrilla,
    count(*) filter(
      where public.mv_norm_key(estado) in ('FINALIZADA','FINALIZADO')
        and public.mv_norm_key(tipo_trabajo) like '%LOSROJO%'
    )::integer as los_rojo_asignadas,
    count(*) filter(
      where public.mv_norm_key(estado) in ('FINALIZADA','FINALIZADO')
        and public.mv_norm_key(tipo_trabajo) like '%LOSROJO%'
        and public.mv_norm_key(motivo_finalizacion) like '%RECABLEADO%'
    )::integer as recableados,
    max(coalesce(fecha_ultimo_estado,fecha_importacion)) as actualizacion
  from base
  where nullif(trim(coalesce(cuadrilla,'')),'') is not null
  group by periodo,cuadrilla
),
universo as (
  select periodo,cuadrilla
  from public.mv_efectividad_migracion
  where fuente='WIN_POSTGRESQL_V487'
)
select
  u.periodo,
  u.cuadrilla,
  coalesce(c.actualizacion, max(c.actualizacion) over(partition by u.periodo)) as actualizacion,
  coalesce(c.los_rojo_asignadas,0)::integer as los_rojo_asignadas,
  coalesce(c.recableados,0)::integer as recableados,
  case
    when coalesce(c.los_rojo_asignadas,0)>0
    then coalesce(c.recableados,0)::numeric/c.los_rojo_asignadas::numeric
    else 0
  end as porcentaje
from universo u
left join calc c
  on c.periodo=u.periodo
 and public.mv_norm_key(c.cuadrilla)=public.mv_norm_key(u.cuadrilla);

create or replace view public.mv_recableado_migracion as
with protegidos as (
  select
    l.periodo,
    l.cuadrilla,
    l.actualizacion::timestamp as actualizacion,
    l.los_rojo_asignadas,
    l.recableados,
    l.porcentaje,
    'SNAPSHOT_PROTEGIDO'::text as fuente
  from public.recableado_legacy_snapshot l
  join public.produccion_periodos p
    on p.periodo=l.periodo and p.protegido
),
activos as (
  select
    a.periodo,a.cuadrilla,a.actualizacion,
    a.los_rojo_asignadas,a.recableados,a.porcentaje,
    'WIN_POSTGRESQL_V487'::text as fuente
  from public.mv_recableado_actual_v487 a
  join public.produccion_periodos p
    on p.periodo=a.periodo and not p.protegido
)
select * from protegidos
union all
select * from activos;

create or replace view public.mv_recableado_resumen_migracion as
select
  periodo,
  max(actualizacion) as actualizacion,
  count(*)::integer as cuadrillas,
  sum(los_rojo_asignadas)::integer as los_rojo_asignadas,
  sum(recableados)::integer as recableados,
  case
    when sum(los_rojo_asignadas)>0
    then sum(recableados)::numeric/sum(los_rojo_asignadas)::numeric
    else 0
  end as porcentaje,
  min(fuente) as fuente
from public.mv_recableado_migracion
group by periodo;

create or replace view public.mv_recableado_conciliacion_periodo as
select
  coalesce(s.periodo,m.periodo) as periodo,
  s.actualizacion as snapshot_actualizacion,
  m.actualizacion as motor_actualizacion,
  s.los_rojo_asignadas as los_rojo_snapshot,
  m.los_rojo_asignadas as los_rojo_motor,
  m.los_rojo_asignadas-s.los_rojo_asignadas as diferencia_los_rojo,
  s.recableados as recableados_snapshot,
  m.recableados as recableados_motor,
  m.recableados-s.recableados as diferencia_recableados,
  round(s.porcentaje*100,2) as porcentaje_snapshot,
  round(m.porcentaje*100,2) as porcentaje_motor,
  round((m.porcentaje-s.porcentaje)*100,2) as diferencia_pp
from public.mv_recableado_snapshot_resumen s
full join public.mv_recableado_resumen_migracion m using(periodo);

commit;
