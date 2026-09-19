-- MI VISUAL - Indicador VTR/GAR sobre decision por orden existente
begin;

create or replace function public.mv_vtr_gar_tipo_win(
  p_tipo_trabajo text,
  p_codigo_seguimiento text
)
returns text
language sql
immutable
as $$
  select case
    when public.mv_norm_key(p_tipo_trabajo)='REITERADA' then 'VTR'
    when public.mv_norm_key(p_tipo_trabajo)='GARANTIA' then 'GAR'
    when public.mv_norm_key(p_codigo_seguimiento) like 'VTR%' then 'VTR'
    when public.mv_norm_key(p_codigo_seguimiento) like 'GAR%' then 'GAR'
    else null
  end;
$$;

revoke execute on function public.mv_vtr_gar_tipo_win(text,text)
  from public,anon,authenticated;
grant execute on function public.mv_vtr_gar_tipo_win(text,text)
  to service_role;

create or replace view public.mv_vtr_gar_indicador_actual_v487 as
with numerador as (
  select
    to_char(o.fecha_solicitud,'YYYY-MM') as periodo,
    trim(coalesce(nullif(d.cuadrilla_responsable,''),o.cuadrilla)) as cuadrilla,
    count(*) filter(where upper(trim(d.tipo))='GAR')::integer as gar,
    count(*) filter(where upper(trim(d.tipo))='VTR')::integer as vtr
  from public.mv_vtr_gar_decision_por_orden d
  join public.ordenes o on o.orden_id=d.orden_id
  where upper(trim(coalesce(d.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO')
    and public.mv_norm_key(o.estado) in ('FINALIZADA','FINALIZADO')
    and public.mv_vtr_gar_tipo_win(o.tipo_trabajo,o.codigo_seguimiento) is not null
  group by 1,2
)
select
  e.periodo,
  e.cuadrilla,
  e.actualizacion,
  e.finalizada::integer as total_finalizadas,
  coalesce(n.gar,0)::integer as gar,
  coalesce(n.vtr,0)::integer as vtr,
  (coalesce(n.gar,0)+coalesce(n.vtr,0))::integer as total_gar_vtr,
  case
    when e.finalizada>0
    then (coalesce(n.gar,0)+coalesce(n.vtr,0))::numeric/e.finalizada::numeric
    else 0
  end as porcentaje
from public.mv_efectividad_migracion e
left join numerador n
  on n.periodo=e.periodo
 and public.mv_norm_key(n.cuadrilla)=public.mv_norm_key(e.cuadrilla)
where e.fuente='WIN_POSTGRESQL_V487';

create or replace view public.mv_vtr_gar_indicador_migracion as
with protegidos as (
  select
    l.periodo,l.cuadrilla,l.actualizacion::timestamp as actualizacion,
    l.total_finalizadas,l.gar,l.vtr,l.total_gar_vtr,l.porcentaje,
    'SNAPSHOT_PROTEGIDO'::text as fuente
  from public.vtr_gar_indicador_legacy_snapshot l
  join public.produccion_periodos p
    on p.periodo=l.periodo and p.protegido
),
activos as (
  select
    a.periodo,a.cuadrilla,a.actualizacion,
    a.total_finalizadas,a.gar,a.vtr,a.total_gar_vtr,a.porcentaje,
    'WIN_POSTGRESQL_V487'::text as fuente
  from public.mv_vtr_gar_indicador_actual_v487 a
  join public.produccion_periodos p
    on p.periodo=a.periodo and not p.protegido
)
select * from protegidos
union all
select * from activos;

create or replace view public.mv_vtr_gar_indicador_resumen_migracion as
select
  periodo,
  max(actualizacion) as actualizacion,
  count(*)::integer as cuadrillas,
  sum(total_finalizadas)::integer as total_finalizadas,
  sum(gar)::integer as gar,
  sum(vtr)::integer as vtr,
  sum(total_gar_vtr)::integer as total_gar_vtr,
  case
    when sum(total_finalizadas)>0
    then sum(total_gar_vtr)::numeric/sum(total_finalizadas)::numeric
    else 0
  end as porcentaje,
  min(fuente) as fuente
from public.mv_vtr_gar_indicador_migracion
group by periodo;

create or replace view public.mv_vtr_gar_indicador_conciliacion as
select
  coalesce(s.periodo,m.periodo) as periodo,
  s.actualizacion as snapshot_actualizacion,
  m.actualizacion as motor_actualizacion,
  s.total_finalizadas as finalizadas_snapshot,
  m.total_finalizadas as finalizadas_motor,
  m.total_finalizadas-s.total_finalizadas as diferencia_finalizadas,
  s.gar as gar_snapshot,
  m.gar as gar_motor,
  m.gar-s.gar as diferencia_gar,
  s.vtr as vtr_snapshot,
  m.vtr as vtr_motor,
  m.vtr-s.vtr as diferencia_vtr,
  s.total_gar_vtr as total_snapshot,
  m.total_gar_vtr as total_motor,
  m.total_gar_vtr-s.total_gar_vtr as diferencia_total,
  round(s.porcentaje*100,2) as porcentaje_snapshot,
  round(m.porcentaje*100,2) as porcentaje_motor,
  round((m.porcentaje-s.porcentaje)*100,2) as diferencia_pp
from public.mv_vtr_gar_indicador_snapshot_resumen s
full join public.mv_vtr_gar_indicador_resumen_migracion m using(periodo);

commit;
