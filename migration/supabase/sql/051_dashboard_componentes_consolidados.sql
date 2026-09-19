
-- 051_dashboard_componentes_consolidados.sql

create or replace view public.mv_dashboard_cuadrilla_meta
with (security_invoker=true) as
select distinct on (public.mv_observaciones_cuadrilla_norm(cuadrilla))
  public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  upper(trim(usuario)) as usuario,
  upper(trim(coalesce(sede,''))) as sede,
  upper(trim(coalesce(plataforma,''))) as plataforma,
  upper(trim(coalesce(usuario_supervisor,''))) as supervisor
from public.app_users
where upper(trim(coalesce(perfil,'')))='TECNICO'
  and nullif(public.mv_observaciones_cuadrilla_norm(cuadrilla),'') is not null
order by public.mv_observaciones_cuadrilla_norm(cuadrilla),id desc;

create or replace view public.mv_dashboard_catalogo_codigo
with (security_invoker=true) as
select distinct on (upper(trim(codigo)))
  upper(trim(codigo)) as codigo,
  nullif(trim(tipo_orden),'') as tipo_orden,
  upper(trim(coalesce(plataforma_orden,''))) as plataforma_orden,
  coalesce(puntaje,1)::numeric as puntaje,
  replace(upper(trim(coalesce(grupo,'OTROS'))),' ','_') as grupo
from public.catalogo_partidas_migracion
where nullif(trim(codigo),'') is not null
order by upper(trim(codigo)),source_row desc;

create or replace view public.mv_dashboard_produccion_detalle
with (security_invoker=true) as
with b as (
  select
    to_char(p.fecha_ejecucion,'YYYY-MM') as periodo,
    public.mv_observaciones_cuadrilla_norm(p.cuadrilla) as cuadrilla,
    p.fecha_ejecucion,
    p.partida_motor as codigo,
    coalesce(sc.puntaje_consistente,1)::numeric as puntos,
    coalesce(c.tipo_orden,p.partida_motor,'TRABAJO REGISTRADO') as tipo,
    coalesce(nullif(c.grupo,''),'OTROS') as grupo
  from public.mv_produccion_partida_motor_migracion_v1 p
  left join public.mv_catalogo_puntaje_codigo sc
    on upper(trim(sc.codigo))=upper(trim(p.partida_motor))
  left join public.mv_dashboard_catalogo_codigo c
    on c.codigo=upper(trim(p.partida_motor))
  where p.elegible_produccion_efectiva is true
    and p.fecha_ejecucion is not null
    and nullif(public.mv_observaciones_cuadrilla_norm(p.cuadrilla),'') is not null
), tot as (
  select periodo,cuadrilla,count(*)::integer total_ordenes,round(sum(puntos),2) total_puntos
  from b group by periodo,cuadrilla
), gg as (
  select periodo,cuadrilla,grupo,count(*)::integer cantidad,round(sum(puntos),2) puntos
  from b group by periodo,cuadrilla,grupo
), gj as (
  select periodo,cuadrilla,
         jsonb_object_agg(grupo,jsonb_build_object('cantidad',cantidad,'puntos',puntos) order by grupo) grupos
  from gg group by periodo,cuadrilla
), tt as (
  select periodo,cuadrilla,tipo,count(*)::integer cantidad,round(sum(puntos),2) puntos,
         max(puntos) as puntaje_referencia
  from b group by periodo,cuadrilla,tipo
), tj as (
  select periodo,cuadrilla,
         jsonb_object_agg(tipo,jsonb_build_object('cantidad',cantidad,'puntos',puntos,'puntaje',puntaje_referencia) order by tipo) tipos
  from tt group by periodo,cuadrilla
), dd as (
  select periodo,cuadrilla,fecha_ejecucion,count(*)::integer cantidad,round(sum(puntos),2) puntos
  from b group by periodo,cuadrilla,fecha_ejecucion
), dj as (
  select periodo,cuadrilla,
         jsonb_object_agg(to_char(fecha_ejecucion,'YYYY-MM-DD'),jsonb_build_object('cantidad',cantidad,'puntos',puntos) order by fecha_ejecucion) fechas
  from dd group by periodo,cuadrilla
)
select
  t.periodo,t.cuadrilla,t.total_ordenes,t.total_puntos,
  jsonb_build_object(
    'totalOrdenes',t.total_ordenes,
    'totalPuntos',t.total_puntos,
    'grupos',coalesce(g.grupos,'{}'::jsonb),
    'tipos',coalesce(x.tipos,'{}'::jsonb),
    'fechas',coalesce(d.fechas,'{}'::jsonb)
  ) as detalle
from tot t
left join gj g using(periodo,cuadrilla)
left join tj x using(periodo,cuadrilla)
left join dj d using(periodo,cuadrilla);

create or replace view public.mv_dashboard_efectividad_detalle
with (security_invoker=true) as
select
  periodo,
  public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  finalizada,cancelada,regestion,reprogramado,total_general,
  round((case when abs(efectividad)<=1 then efectividad*100 else efectividad end),2) as efectividad_pct,
  actualizacion
from public.mv_efectividad_migracion;

create or replace view public.mv_dashboard_recableado_detalle
with (security_invoker=true) as
select
  periodo,
  public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  los_rojo_asignadas,recableados,
  round((case when abs(porcentaje)<=1 then porcentaje*100 else porcentaje end),2) as porcentaje_pct,
  actualizacion
from public.mv_recableado_migracion;

create or replace view public.mv_dashboard_vtrgar_detalle
with (security_invoker=true) as
select
  periodo,
  public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  total_finalizadas,gar,vtr,total_gar_vtr,
  round((case when abs(porcentaje)<=1 then porcentaje*100 else porcentaje end),2) as porcentaje_pct,
  actualizacion
from public.mv_vtr_gar_indicador_migracion;

create or replace view public.mv_dashboard_observaciones_detalle
with (security_invoker=true) as
with base as (
  select
    periodo,
    public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
    fuente,estado,monto
  from public.observaciones_migracion
), estados as (
  select periodo,cuadrilla,estado,count(*)::integer cantidad
  from base group by periodo,cuadrilla,estado
), estados_json as (
  select periodo,cuadrilla,jsonb_object_agg(estado,cantidad order by estado) estados
  from estados group by periodo,cuadrilla
)
select
  b.periodo,b.cuadrilla,
  count(*)::integer as total,
  count(*) filter(where estado in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO'))::integer as pendientes,
  round(sum(monto),2) as monto_total,
  round(coalesce(sum(monto) filter(where estado in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO')),0),2) as monto_pendiente,
  round(sum(monto*public.mv_observaciones_factor_estado(estado)),2) as monto_afectado,
  coalesce(e.estados,'{}'::jsonb) as estados,
  count(*) filter(where fuente='WIN')::integer as win_total,
  count(*) filter(where fuente='WIN' and estado='PENALIZADO')::integer as win_penalizadas,
  round(coalesce(sum(monto) filter(where fuente='WIN' and estado='PENALIZADO'),0),2) as win_monto_penalizado,
  count(*) filter(where fuente='WIN' and estado='SUBSANADO')::integer as win_subsanadas,
  round(coalesce(sum(monto) filter(where fuente='WIN' and estado='SUBSANADO'),0),2) as win_monto_subsanado
from base b
left join estados_json e using(periodo,cuadrilla)
group by b.periodo,b.cuadrilla,e.estados;

create or replace view public.mv_dashboard_sla_detalle
with (security_invoker=true) as
select
  periodo,
  public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla,
  total_finalizadas,evaluables,cumplen_bruto,cumplen_ajustado,no_evaluables,
  sin_tiempos,sin_partida,sin_parametro,
  instalaciones_total,instalaciones_cumplen_ajustado,
  visitas_tecnicas_total,visitas_tecnicas_cumplen_ajustado,
  excepciones_aprobadas,excepciones_pendientes,excepciones_rechazadas,
  sla_bruto,sla_ajustado,
  jsonb_build_object(
    'cuadrilla',public.mv_observaciones_cuadrilla_norm(cuadrilla),
    'evaluables',evaluables,
    'cumplenBruto',cumplen_bruto,
    'cumplenAjustado',cumplen_ajustado,
    'fueraBruto',greatest(evaluables-cumplen_bruto,0),
    'fueraAjustado',greatest(evaluables-cumplen_ajustado,0),
    'finalizadasDetectadas',total_finalizadas,
    'noEvaluables',no_evaluables,
    'sinTiempos',sin_tiempos,
    'sinPartida',sin_partida,
    'sinParametro',sin_parametro,
    'instalacionesTotal',instalaciones_total,
    'instalacionesCumplenAjustado',instalaciones_cumplen_ajustado,
    'visitasTecnicasTotal',visitas_tecnicas_total,
    'visitasTecnicasCumplenAjustado',visitas_tecnicas_cumplen_ajustado,
    'excepcionesPendientes',excepciones_pendientes,
    'excepcionesAprobadas',excepciones_aprobadas,
    'excepcionesRechazadas',excepciones_rechazadas,
    'slaBruto',round(sla_bruto,2),
    'slaAjustado',round(sla_ajustado,2),
    'semaforo',
      case
        when sla_ajustado<60 then jsonb_build_object('codigo','ROJO','icono','🔴','texto','CRÍTICO')
        when sla_ajustado<80 then jsonb_build_object('codigo','NARANJA','icono','🟠','texto','BAJO')
        when sla_ajustado<90 then jsonb_build_object('codigo','AMARILLO','icono','🟡','texto','EN SEGUIMIENTO')
        else jsonb_build_object('codigo','VERDE','icono','🟢','texto','CONFORME')
      end
  ) as detalle
from public.mv_sla_resumen_actual_v323;

revoke all on public.mv_dashboard_cuadrilla_meta from anon,authenticated;
revoke all on public.mv_dashboard_catalogo_codigo from anon,authenticated;
revoke all on public.mv_dashboard_produccion_detalle from anon,authenticated;
revoke all on public.mv_dashboard_efectividad_detalle from anon,authenticated;
revoke all on public.mv_dashboard_recableado_detalle from anon,authenticated;
revoke all on public.mv_dashboard_vtrgar_detalle from anon,authenticated;
revoke all on public.mv_dashboard_observaciones_detalle from anon,authenticated;
revoke all on public.mv_dashboard_sla_detalle from anon,authenticated;

grant select on public.mv_dashboard_cuadrilla_meta to service_role;
grant select on public.mv_dashboard_catalogo_codigo to service_role;
grant select on public.mv_dashboard_produccion_detalle to service_role;
grant select on public.mv_dashboard_efectividad_detalle to service_role;
grant select on public.mv_dashboard_recableado_detalle to service_role;
grant select on public.mv_dashboard_vtrgar_detalle to service_role;
grant select on public.mv_dashboard_observaciones_detalle to service_role;
grant select on public.mv_dashboard_sla_detalle to service_role;
