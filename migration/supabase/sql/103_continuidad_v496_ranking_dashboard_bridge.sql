
-- 103_continuidad_v496_ranking_dashboard_bridge.sql
-- Integra V496 en Ranking y Dashboard sin reescribir fuentes históricas.
-- Las agregaciones se hacen por identidad canónica del MES y se recalculan porcentajes desde sus conteos.

create or replace view public.mv_continuidad_produccion_ranking_v496
with (security_invoker=true) as
select
  p.periodo,
  public.mv_continuidad_cuadrilla(p.periodo,p.cuadrilla) as cuadrilla,
  max(nullif(trim(p.sede),'')) as sede,
  sum(coalesce(p.ordenes_elegibles,0))::integer as ordenes_elegibles,
  sum(coalesce(p.produccion,0))::numeric as produccion,
  sum(coalesce(p.partidas_fallback_1,0))::integer as partidas_fallback_1
from public.mv_ranking_produccion_migracion p
group by p.periodo,public.mv_continuidad_cuadrilla(p.periodo,p.cuadrilla);

create or replace view public.mv_continuidad_efectividad_v496
with (security_invoker=true) as
with g as (
  select
    e.periodo,
    public.mv_continuidad_cuadrilla(e.periodo,e.cuadrilla) as cuadrilla,
    max(e.actualizacion) as actualizacion,
    sum(coalesce(e.finalizada,0))::integer as finalizada,
    sum(coalesce(e.cancelada,0))::integer as cancelada,
    sum(coalesce(e.regestion,0))::integer as regestion,
    sum(coalesce(e.reprogramado,0))::integer as reprogramado,
    sum(coalesce(e.total_general,0))::integer as total_general,
    sum(coalesce(e.no_evaluables,0))::integer as no_evaluables
  from public.mv_efectividad_migracion e
  group by e.periodo,public.mv_continuidad_cuadrilla(e.periodo,e.cuadrilla)
)
select
  periodo,cuadrilla,actualizacion,finalizada,cancelada,regestion,reprogramado,total_general,
  case when total_general>0 then finalizada::numeric/total_general::numeric else 0::numeric end as efectividad,
  no_evaluables,
  'V496_CONTINUIDAD'::text as fuente
from g;

create or replace view public.mv_continuidad_recableado_v496
with (security_invoker=true) as
with g as (
  select
    r.periodo,
    public.mv_continuidad_cuadrilla(r.periodo,r.cuadrilla) as cuadrilla,
    max(r.actualizacion) as actualizacion,
    sum(coalesce(r.los_rojo_asignadas,0))::integer as los_rojo_asignadas,
    sum(coalesce(r.recableados,0))::integer as recableados
  from public.mv_recableado_migracion r
  group by r.periodo,public.mv_continuidad_cuadrilla(r.periodo,r.cuadrilla)
)
select
  periodo,cuadrilla,actualizacion,los_rojo_asignadas,recableados,
  case when los_rojo_asignadas>0 then recableados::numeric/los_rojo_asignadas::numeric else 0::numeric end as porcentaje,
  'V496_CONTINUIDAD'::text as fuente
from g;

create or replace view public.mv_continuidad_vtrgar_ranking_v496
with (security_invoker=true) as
with g as (
  select
    v.periodo,
    public.mv_continuidad_cuadrilla(v.periodo,v.cuadrilla) as cuadrilla,
    max(v.actualizacion) as actualizacion,
    sum(coalesce(v.total_finalizadas,0))::integer as total_finalizadas,
    sum(coalesce(v.gar,0))::integer as gar,
    sum(coalesce(v.vtr,0))::integer as vtr
  from public.mv_ranking_vtr_gar_propias_v493 v
  group by v.periodo,public.mv_continuidad_cuadrilla(v.periodo,v.cuadrilla)
)
select
  periodo,cuadrilla,actualizacion,total_finalizadas,gar,vtr,(gar+vtr)::integer as total_gar_vtr,
  case when total_finalizadas>0 then (gar+vtr)::numeric/total_finalizadas::numeric else 0::numeric end as porcentaje,
  'V493_SOLO_PROPIAS+V496_CONTINUIDAD'::text as criterio_ranking
from g;

create or replace view public.mv_continuidad_vtrgar_dashboard_v496
with (security_invoker=true) as
with g as (
  select
    v.periodo,
    public.mv_continuidad_cuadrilla(v.periodo,v.cuadrilla) as cuadrilla,
    max(v.actualizacion) as actualizacion,
    sum(coalesce(v.total_finalizadas,0))::integer as total_finalizadas,
    sum(coalesce(v.gar,0))::integer as gar,
    sum(coalesce(v.vtr,0))::integer as vtr
  from public.mv_vtr_gar_indicador_migracion v
  group by v.periodo,public.mv_continuidad_cuadrilla(v.periodo,v.cuadrilla)
)
select
  periodo,cuadrilla,actualizacion,total_finalizadas,gar,vtr,(gar+vtr)::integer as total_gar_vtr,
  case when total_finalizadas>0 then (gar+vtr)::numeric/total_finalizadas::numeric else 0::numeric end as porcentaje
from g;

create or replace view public.mv_continuidad_observaciones_ranking_v496
with (security_invoker=true) as
select
  o.periodo,
  public.mv_continuidad_cuadrilla(o.periodo,o.cuadrilla) as cuadrilla,
  sum(coalesce(o.observaciones,0))::integer as observaciones,
  sum(coalesce(o.monto_total,0))::numeric as monto_total,
  sum(coalesce(o.monto_afectado,0))::numeric as monto_afectado
from public.mv_ranking_observaciones_migracion o
group by o.periodo,public.mv_continuidad_cuadrilla(o.periodo,o.cuadrilla);

create or replace view public.mv_continuidad_sla_v496
with (security_invoker=true) as
with g as (
  select
    s.periodo,
    public.mv_continuidad_cuadrilla(s.periodo,s.cuadrilla) as cuadrilla,
    sum(coalesce(s.total_finalizadas,0))::integer as total_finalizadas,
    sum(coalesce(s.evaluables,0))::integer as evaluables,
    sum(coalesce(s.cumplen_bruto,0))::integer as cumplen_bruto,
    sum(coalesce(s.cumplen_ajustado,0))::integer as cumplen_ajustado,
    sum(coalesce(s.no_evaluables,0))::integer as no_evaluables,
    sum(coalesce(s.sin_tiempos,0))::integer as sin_tiempos,
    sum(coalesce(s.sin_partida,0))::integer as sin_partida,
    sum(coalesce(s.sin_parametro,0))::integer as sin_parametro,
    sum(coalesce(s.instalaciones_total,0))::integer as instalaciones_total,
    sum(coalesce(s.instalaciones_cumplen_ajustado,0))::integer as instalaciones_cumplen_ajustado,
    sum(coalesce(s.visitas_tecnicas_total,0))::integer as visitas_tecnicas_total,
    sum(coalesce(s.visitas_tecnicas_cumplen_ajustado,0))::integer as visitas_tecnicas_cumplen_ajustado,
    sum(coalesce(s.excepciones_aprobadas,0))::integer as excepciones_aprobadas,
    sum(coalesce(s.excepciones_pendientes,0))::integer as excepciones_pendientes,
    sum(coalesce(s.excepciones_rechazadas,0))::integer as excepciones_rechazadas
  from public.mv_sla_resumen_actual_v323 s
  group by s.periodo,public.mv_continuidad_cuadrilla(s.periodo,s.cuadrilla)
)
select
  periodo,cuadrilla,total_finalizadas,evaluables,cumplen_bruto,cumplen_ajustado,
  no_evaluables,sin_tiempos,sin_partida,sin_parametro,
  instalaciones_total,instalaciones_cumplen_ajustado,
  visitas_tecnicas_total,visitas_tecnicas_cumplen_ajustado,
  excepciones_aprobadas,excepciones_pendientes,excepciones_rechazadas,
  case when evaluables>0 then round(cumplen_bruto::numeric*100/evaluables::numeric,2) else 0::numeric end as sla_bruto,
  case when evaluables>0 then round(cumplen_ajustado::numeric*100/evaluables::numeric,2) else 0::numeric end as sla_ajustado
from g;

revoke all on public.mv_continuidad_produccion_ranking_v496 from anon,authenticated;
revoke all on public.mv_continuidad_efectividad_v496 from anon,authenticated;
revoke all on public.mv_continuidad_recableado_v496 from anon,authenticated;
revoke all on public.mv_continuidad_vtrgar_ranking_v496 from anon,authenticated;
revoke all on public.mv_continuidad_vtrgar_dashboard_v496 from anon,authenticated;
revoke all on public.mv_continuidad_observaciones_ranking_v496 from anon,authenticated;
revoke all on public.mv_continuidad_sla_v496 from anon,authenticated;
grant select on public.mv_continuidad_produccion_ranking_v496 to service_role;
grant select on public.mv_continuidad_efectividad_v496 to service_role;
grant select on public.mv_continuidad_recableado_v496 to service_role;
grant select on public.mv_continuidad_vtrgar_ranking_v496 to service_role;
grant select on public.mv_continuidad_vtrgar_dashboard_v496 to service_role;
grant select on public.mv_continuidad_observaciones_ranking_v496 to service_role;
grant select on public.mv_continuidad_sla_v496 to service_role;

-- Ranking: solo periodos activos del motor. Los históricos protegidos siguen intactos.
create or replace view public.mv_ranking_universo_migracion
with (security_invoker=true) as
with periodos as (
  select periodo from public.ranking_configuracion_motor where upper(estado)='ACTIVO'
), candidatos as (
  select p.periodo,public.mv_continuidad_cuadrilla(p.periodo,m.cuadrilla) as cuadrilla
    from periodos p join public.mv_ranking_cuadrilla_meta m on m.tiene_usuario_activo
  union select x.periodo,x.cuadrilla from public.mv_continuidad_produccion_ranking_v496 x join periodos p on p.periodo=x.periodo
  union select x.periodo,x.cuadrilla from public.mv_continuidad_efectividad_v496 x join periodos p on p.periodo=x.periodo
  union select x.periodo,x.cuadrilla from public.mv_continuidad_recableado_v496 x join periodos p on p.periodo=x.periodo
  union select x.periodo,x.cuadrilla from public.mv_continuidad_vtrgar_ranking_v496 x join periodos p on p.periodo=x.periodo
  union select x.periodo,x.cuadrilla from public.mv_continuidad_sla_v496 x join periodos p on p.periodo=x.periodo
  union select x.periodo,x.cuadrilla from public.mv_continuidad_observaciones_ranking_v496 x join periodos p on p.periodo=x.periodo
)
select periodo,cuadrilla
from candidatos
where nullif(trim(cuadrilla),'') is not null and upper(trim(cuadrilla))<>'TODAS';

create or replace view public.mv_ranking_componentes_migracion
with (security_invoker=true) as
select
  u.periodo,u.cuadrilla,
  coalesce(m.sede,p.sede,'SIN SEDE') as sede,
  coalesce(m.plataforma,
    case when upper(u.cuadrilla) like '%TRASLADO%' then 'TRASLADO'
         when upper(u.cuadrilla) like '% SGA %' then 'VISITA TECNICA'
         when upper(u.cuadrilla) like '% SGI %' then 'INSTALACION'
         else 'SIN PLATAFORMA' end) as plataforma,
  coalesce(p.produccion,0)::numeric as produccion,
  coalesce(e.efectividad,0)::numeric as efectividad,
  coalesce(r.porcentaje,0)::numeric as recableado,
  coalesce(v.porcentaje,0)::numeric as vtrgar,
  coalesce(o.observaciones,0)::integer as observaciones,
  coalesce(o.monto_total,0)::numeric as monto_total,
  coalesce(o.monto_afectado,0)::numeric as monto_afectado,
  coalesce(s.sla_bruto,0)::numeric as sla_bruto,
  coalesce(s.sla_ajustado,0)::numeric as sla_ajustado,
  coalesce(s.evaluables,0)::integer as sla_evaluables,
  greatest(coalesce(s.evaluables,0)-coalesce(s.cumplen_ajustado,0),0)::integer as sla_fuera,
  coalesce(s.excepciones_aprobadas,0)::integer as sla_excepciones_aprobadas,
  coalesce(p.ordenes_elegibles,0)::integer as produccion_ordenes,
  coalesce(p.partidas_fallback_1,0)::integer as produccion_fallback_1
from public.mv_ranking_universo_migracion u
left join public.mv_ranking_cuadrilla_meta m
  on public.mv_norm_key(m.cuadrilla)=public.mv_norm_key(u.cuadrilla)
left join public.mv_continuidad_produccion_ranking_v496 p
  on p.periodo=u.periodo and public.mv_norm_key(p.cuadrilla)=public.mv_norm_key(u.cuadrilla)
left join public.mv_continuidad_efectividad_v496 e
  on e.periodo=u.periodo and public.mv_norm_key(e.cuadrilla)=public.mv_norm_key(u.cuadrilla)
left join public.mv_continuidad_recableado_v496 r
  on r.periodo=u.periodo and public.mv_norm_key(r.cuadrilla)=public.mv_norm_key(u.cuadrilla)
left join public.mv_continuidad_vtrgar_ranking_v496 v
  on v.periodo=u.periodo and public.mv_norm_key(v.cuadrilla)=public.mv_norm_key(u.cuadrilla)
left join public.mv_continuidad_observaciones_ranking_v496 o
  on o.periodo=u.periodo and public.mv_norm_key(o.cuadrilla)=public.mv_norm_key(u.cuadrilla)
left join public.mv_continuidad_sla_v496 s
  on s.periodo=u.periodo and public.mv_norm_key(s.cuadrilla)=public.mv_norm_key(u.cuadrilla);

revoke all on public.mv_ranking_universo_migracion from anon,authenticated;
revoke all on public.mv_ranking_componentes_migracion from anon,authenticated;
grant select on public.mv_ranking_universo_migracion to service_role;
grant select on public.mv_ranking_componentes_migracion to service_role;

-- Dashboard: detalle general VTR/GAR sigue usando el indicador completo, no V493.
create or replace view public.mv_dashboard_efectividad_detalle
with (security_invoker=true) as
select
  periodo,mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  finalizada,cancelada,regestion,reprogramado,total_general,
  round(case when abs(efectividad)<=1 then efectividad*100 else efectividad end,2) as efectividad_pct,
  actualizacion
from public.mv_continuidad_efectividad_v496;

create or replace view public.mv_dashboard_recableado_detalle
with (security_invoker=true) as
select
  periodo,mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  los_rojo_asignadas,recableados,
  round(case when abs(porcentaje)<=1 then porcentaje*100 else porcentaje end,2) as porcentaje_pct,
  actualizacion
from public.mv_continuidad_recableado_v496;

create or replace view public.mv_dashboard_vtrgar_detalle
with (security_invoker=true) as
select
  periodo,mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  total_finalizadas,gar,vtr,total_gar_vtr,
  round(case when abs(porcentaje)<=1 then porcentaje*100 else porcentaje end,2) as porcentaje_pct,
  actualizacion
from public.mv_continuidad_vtrgar_dashboard_v496;

create or replace view public.mv_dashboard_sla_detalle
with (security_invoker=true) as
select
  periodo,mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  total_finalizadas,evaluables,cumplen_bruto,cumplen_ajustado,no_evaluables,
  sin_tiempos,sin_partida,sin_parametro,instalaciones_total,instalaciones_cumplen_ajustado,
  visitas_tecnicas_total,visitas_tecnicas_cumplen_ajustado,
  excepciones_aprobadas,excepciones_pendientes,excepciones_rechazadas,
  sla_bruto,sla_ajustado,
  jsonb_build_object(
    'cuadrilla',mv_observaciones_cuadrilla_norm(cuadrilla),
    'evaluables',evaluables,'cumplenBruto',cumplen_bruto,'cumplenAjustado',cumplen_ajustado,
    'fueraBruto',greatest(evaluables-cumplen_bruto,0),
    'fueraAjustado',greatest(evaluables-cumplen_ajustado,0),
    'finalizadasDetectadas',total_finalizadas,'noEvaluables',no_evaluables,
    'sinTiempos',sin_tiempos,'sinPartida',sin_partida,'sinParametro',sin_parametro,
    'instalacionesTotal',instalaciones_total,'instalacionesCumplenAjustado',instalaciones_cumplen_ajustado,
    'visitasTecnicasTotal',visitas_tecnicas_total,'visitasTecnicasCumplenAjustado',visitas_tecnicas_cumplen_ajustado,
    'excepcionesPendientes',excepciones_pendientes,'excepcionesAprobadas',excepciones_aprobadas,
    'excepcionesRechazadas',excepciones_rechazadas,
    'slaBruto',round(sla_bruto,2),'slaAjustado',round(sla_ajustado,2),
    'semaforo',
      case when sla_ajustado<60 then jsonb_build_object('codigo','ROJO','icono','🔴','texto','CRÍTICO')
           when sla_ajustado<80 then jsonb_build_object('codigo','NARANJA','icono','🟠','texto','BAJO')
           when sla_ajustado<90 then jsonb_build_object('codigo','AMARILLO','icono','🟡','texto','EN SEGUIMIENTO')
           else jsonb_build_object('codigo','VERDE','icono','🟢','texto','CONFORME') end
  ) as detalle
from public.mv_continuidad_sla_v496;

create or replace view public.mv_dashboard_observaciones_detalle
with (security_invoker=true) as
with base as (
  select
    o.periodo,
    mv_observaciones_cuadrilla_norm(public.mv_continuidad_cuadrilla(o.periodo,o.cuadrilla)) as cuadrilla,
    o.fuente,o.estado,o.monto
  from public.observaciones_migracion o
), estados as (
  select periodo,cuadrilla,estado,count(*)::integer as cantidad
  from base group by periodo,cuadrilla,estado
), estados_json as (
  select periodo,cuadrilla,jsonb_object_agg(estado,cantidad order by estado) as estados
  from estados group by periodo,cuadrilla
)
select
  b.periodo,b.cuadrilla,
  count(*)::integer as total,
  count(*) filter (where b.estado in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO'))::integer as pendientes,
  round(sum(b.monto),2) as monto_total,
  round(coalesce(sum(b.monto) filter (where b.estado in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO')),0),2) as monto_pendiente,
  round(sum(b.monto*mv_observaciones_factor_estado(b.estado)),2) as monto_afectado,
  coalesce(e.estados,'{}'::jsonb) as estados,
  count(*) filter (where b.fuente='WIN')::integer as win_total,
  count(*) filter (where b.fuente='WIN' and b.estado='PENALIZADO')::integer as win_penalizadas,
  round(coalesce(sum(b.monto) filter (where b.fuente='WIN' and b.estado='PENALIZADO'),0),2) as win_monto_penalizado,
  count(*) filter (where b.fuente='WIN' and b.estado='SUBSANADO')::integer as win_subsanadas,
  round(coalesce(sum(b.monto) filter (where b.fuente='WIN' and b.estado='SUBSANADO'),0),2) as win_monto_subsanado
from base b
left join estados_json e using(periodo,cuadrilla)
group by b.periodo,b.cuadrilla,e.estados;

create or replace view public.mv_dashboard_produccion_detalle
with (security_invoker=true) as
with b as (
  select
    to_char(p.fecha_ejecucion,'YYYY-MM') as periodo,
    mv_observaciones_cuadrilla_norm(
      public.mv_continuidad_cuadrilla(to_char(p.fecha_ejecucion,'YYYY-MM'),p.cuadrilla)
    ) as cuadrilla,
    p.fecha_ejecucion,
    p.partida_motor as codigo,
    coalesce(sc.puntaje_consistente,1::numeric) as puntos,
    coalesce(c.tipo_orden,p.partida_motor,'TRABAJO REGISTRADO') as tipo,
    coalesce(nullif(c.grupo,''),'OTROS') as grupo
  from public.mv_produccion_partida_motor_migracion_v1 p
  left join public.mv_catalogo_puntaje_codigo sc on upper(trim(sc.codigo))=upper(trim(p.partida_motor))
  left join public.mv_dashboard_catalogo_codigo c on c.codigo=upper(trim(p.partida_motor))
  where p.elegible_produccion_efectiva is true
    and p.fecha_ejecucion is not null
    and nullif(mv_observaciones_cuadrilla_norm(p.cuadrilla),'') is not null
), tot as (
  select periodo,cuadrilla,count(*)::integer total_ordenes,round(sum(puntos),2) total_puntos
  from b group by periodo,cuadrilla
), gg as (
  select periodo,cuadrilla,grupo,count(*)::integer cantidad,round(sum(puntos),2) puntos
  from b group by periodo,cuadrilla,grupo
), gj as (
  select periodo,cuadrilla,jsonb_object_agg(grupo,jsonb_build_object('cantidad',cantidad,'puntos',puntos) order by grupo) grupos
  from gg group by periodo,cuadrilla
), tt as (
  select periodo,cuadrilla,tipo,count(*)::integer cantidad,round(sum(puntos),2) puntos,max(puntos) puntaje_referencia
  from b group by periodo,cuadrilla,tipo
), tj as (
  select periodo,cuadrilla,jsonb_object_agg(tipo,jsonb_build_object('cantidad',cantidad,'puntos',puntos,'puntaje',puntaje_referencia) order by tipo) tipos
  from tt group by periodo,cuadrilla
), dd as (
  select periodo,cuadrilla,fecha_ejecucion,count(*)::integer cantidad,round(sum(puntos),2) puntos
  from b group by periodo,cuadrilla,fecha_ejecucion
), dj as (
  select periodo,cuadrilla,
         jsonb_object_agg(to_char(fecha_ejecucion,'YYYY-MM-DD'),jsonb_build_object('cantidad',cantidad,'puntos',puntos) order by fecha_ejecucion) fechas
  from dd group by periodo,cuadrilla
)
select t.periodo,t.cuadrilla,t.total_ordenes,t.total_puntos,
       jsonb_build_object('totalOrdenes',t.total_ordenes,'totalPuntos',t.total_puntos,
                          'grupos',coalesce(g.grupos,'{}'::jsonb),
                          'tipos',coalesce(x.tipos,'{}'::jsonb),
                          'fechas',coalesce(d.fechas,'{}'::jsonb)) as detalle
from tot t
left join gj g using(periodo,cuadrilla)
left join tj x using(periodo,cuadrilla)
left join dj d using(periodo,cuadrilla);

create or replace view public.mv_dashboard_descansos_aprobados
with (security_invoker=true) as
select distinct on (
  d.periodo,
  public.mv_norm_key(public.mv_continuidad_cuadrilla(d.periodo,d.cuadrilla)),
  d.fecha
)
  d.source_row,d.id,d.periodo,d.fecha,d.sede,
  public.mv_continuidad_cuadrilla(d.periodo,d.cuadrilla) as cuadrilla,
  d.plataforma,d.supervisor,d.version,d.estado_vigente as estado_dia
from public.mv_descansos_ultimo_aprobado d
where upper(trim(d.cuadrilla)) not like 'PERSONAL|%'
order by
  d.periodo,
  public.mv_norm_key(public.mv_continuidad_cuadrilla(d.periodo,d.cuadrilla)),
  d.fecha,
  d.source_row desc;

revoke all on public.mv_dashboard_efectividad_detalle from anon,authenticated;
revoke all on public.mv_dashboard_recableado_detalle from anon,authenticated;
revoke all on public.mv_dashboard_vtrgar_detalle from anon,authenticated;
revoke all on public.mv_dashboard_sla_detalle from anon,authenticated;
revoke all on public.mv_dashboard_observaciones_detalle from anon,authenticated;
revoke all on public.mv_dashboard_produccion_detalle from anon,authenticated;
revoke all on public.mv_dashboard_descansos_aprobados from anon,authenticated;
grant select on public.mv_dashboard_efectividad_detalle to service_role;
grant select on public.mv_dashboard_recableado_detalle to service_role;
grant select on public.mv_dashboard_vtrgar_detalle to service_role;
grant select on public.mv_dashboard_sla_detalle to service_role;
grant select on public.mv_dashboard_observaciones_detalle to service_role;
grant select on public.mv_dashboard_produccion_detalle to service_role;
grant select on public.mv_dashboard_descansos_aprobados to service_role;
