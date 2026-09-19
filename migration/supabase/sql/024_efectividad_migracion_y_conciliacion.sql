-- MI VISUAL - Efectividad: vista de migracion y conciliacion
-- Periodos protegidos usan snapshot. Periodo activo usa motor V487 vivo.

begin;

create or replace view public.mv_efectividad_migracion as
with protegidos as (
  select
    l.periodo,
    l.cuadrilla,
    l.actualizacion::timestamp as actualizacion,
    l.finalizada,
    l.cancelada,
    l.regestion,
    l.reprogramado,
    l.total_general,
    l.efectividad,
    0::integer as no_evaluables,
    'SNAPSHOT_PROTEGIDO'::text as fuente
  from public.efectividad_legacy_snapshot l
  join public.produccion_periodos p
    on p.periodo=l.periodo and p.protegido
),
periodos_activos as (
  select periodo
  from public.produccion_periodos
  where not protegido
),
claves_activas as (
  select a.periodo,a.cuadrilla
  from public.mv_efectividad_actual_v487 a
  join periodos_activos p using(periodo)
  union
  select p.periodo,c.cuadrilla
  from periodos_activos p
  cross join public.mv_cuadrillas_tecnicas_v487 c
),
cortes as (
  select periodo,max(corte_estado) as corte
  from public.mv_efectividad_actual_v487
  group by periodo
),
activos as (
  select
    k.periodo,
    k.cuadrilla,
    c.corte as actualizacion,
    coalesce(a.finalizada,0)::integer as finalizada,
    coalesce(a.cancelada,0)::integer as cancelada,
    coalesce(a.regestion,0)::integer as regestion,
    coalesce(a.reprogramado,0)::integer as reprogramado,
    coalesce(a.total_general,0)::integer as total_general,
    case
      when coalesce(a.total_general,0)>0
      then coalesce(a.finalizada,0)::numeric/a.total_general::numeric
      else 0
    end as efectividad,
    coalesce(a.no_evaluables,0)::integer as no_evaluables,
    'WIN_POSTGRESQL_V487'::text as fuente
  from claves_activas k
  left join public.mv_efectividad_actual_v487 a
    on a.periodo=k.periodo
   and public.mv_norm_key(a.cuadrilla)=public.mv_norm_key(k.cuadrilla)
  left join cortes c on c.periodo=k.periodo
)
select * from protegidos
union all
select * from activos;

create or replace view public.mv_efectividad_resumen_migracion as
select
  periodo,
  max(actualizacion) as actualizacion,
  count(*)::integer as cuadrillas,
  sum(finalizada)::integer as finalizadas,
  sum(cancelada)::integer as canceladas,
  sum(regestion)::integer as regestiones,
  sum(reprogramado)::integer as reprogramadas,
  sum(total_general)::integer as total_general,
  case
    when sum(total_general)>0
    then sum(finalizada)::numeric/sum(total_general)::numeric
    else 0
  end as efectividad,
  sum(no_evaluables)::integer as no_evaluables,
  min(fuente) as fuente
from public.mv_efectividad_migracion
group by periodo;

create or replace view public.mv_efectividad_conciliacion_periodo as
select
  coalesce(s.periodo,m.periodo) as periodo,
  s.actualizacion as snapshot_actualizacion,
  m.actualizacion as motor_actualizacion,
  s.finalizadas as finalizadas_snapshot,
  m.finalizadas as finalizadas_motor,
  m.finalizadas-s.finalizadas as diferencia_finalizadas,
  s.canceladas as canceladas_snapshot,
  m.canceladas as canceladas_motor,
  m.canceladas-s.canceladas as diferencia_canceladas,
  s.regestiones as regestiones_snapshot,
  m.regestiones as regestiones_motor,
  m.regestiones-s.regestiones as diferencia_regestiones,
  s.reprogramadas as reprogramadas_snapshot,
  m.reprogramadas as reprogramadas_motor,
  m.reprogramadas-s.reprogramadas as diferencia_reprogramadas,
  s.total_general as total_snapshot,
  m.total_general as total_motor,
  m.total_general-s.total_general as diferencia_total,
  round(s.efectividad*100,2) as efectividad_snapshot_pct,
  round(m.efectividad*100,2) as efectividad_motor_pct,
  round((m.efectividad-s.efectividad)*100,2) as diferencia_pp
from public.mv_efectividad_snapshot_resumen s
full join public.mv_efectividad_resumen_migracion m using(periodo);

commit;
