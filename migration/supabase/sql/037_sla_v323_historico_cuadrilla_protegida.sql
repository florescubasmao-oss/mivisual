-- MI VISUAL - SLA: congelamiento de asignacion historica por cuadrilla
-- Julio y agosto son periodos protegidos.
-- Setiembre y periodos activos usan la cuadrilla actual del Mapa.

begin;

create or replace view public.mv_sla_orden_operativa_v323
with (security_invoker=true) as
select
  o.id,
  o.periodo,
  o.codigo,
  o.codigo_pedido,
  o.sede,
  case
    when o.periodo in ('2026-07','2026-08')
      then coalesce(nullif(trim(s.cuadrilla),''),o.cuadrilla)
    else o.cuadrilla
  end as cuadrilla,
  o.tipo_general,
  o.tipo_trabajo,
  o.motivo_finalizacion,
  o.partida,
  o.inicio,
  o.fin,
  o.minutos_gestion,
  o.sla_minutos,
  o.evaluable,
  o.cumple_bruto,
  o.excepcion_estado,
  o.cumple_ajustado,
  o.exceso_minutos,
  o.resultado,
  o.fecha_importacion,
  case
    when o.periodo in ('2026-07','2026-08')
     and nullif(trim(s.cuadrilla),'') is not null
     and public.mv_norm_key(s.cuadrilla)<>public.mv_norm_key(o.cuadrilla)
    then 'CUADRILLA_HISTORICA_SLA'
    else 'CUADRILLA_MAPA_ACTUAL'
  end as fuente_cuadrilla
from public.mv_sla_orden_actual_v323 o
left join public.sla_ordenes_legacy_snapshot s
  on s.periodo=o.periodo
 and public.mv_norm_key(s.codigo)=public.mv_norm_key(o.codigo);

create or replace view public.mv_sla_resumen_actual_v323
with (security_invoker=true) as
select
  periodo,cuadrilla,
  count(*)::integer as total_finalizadas,
  count(*) filter(where evaluable)::integer as evaluables,
  count(*) filter(where evaluable and cumple_bruto)::integer as cumplen_bruto,
  count(*) filter(where evaluable and cumple_ajustado)::integer as cumplen_ajustado,
  count(*) filter(where not evaluable)::integer as no_evaluables,
  count(*) filter(where resultado='SIN TIEMPOS')::integer as sin_tiempos,
  count(*) filter(where resultado='SIN PARTIDA')::integer as sin_partida,
  count(*) filter(where resultado='SIN PARÁMETRO')::integer as sin_parametro,
  count(*) filter(where evaluable and tipo_general='INSTALACIÓN')::integer as instalaciones_total,
  count(*) filter(where evaluable and tipo_general='INSTALACIÓN' and cumple_ajustado)::integer as instalaciones_cumplen_ajustado,
  count(*) filter(where evaluable and tipo_general='VISITA TÉCNICA')::integer as visitas_tecnicas_total,
  count(*) filter(where evaluable and tipo_general='VISITA TÉCNICA' and cumple_ajustado)::integer as visitas_tecnicas_cumplen_ajustado,
  count(*) filter(where excepcion_estado='APROBADA')::integer as excepciones_aprobadas,
  count(*) filter(where excepcion_estado='PENDIENTE')::integer as excepciones_pendientes,
  count(*) filter(where excepcion_estado='RECHAZADA')::integer as excepciones_rechazadas,
  case when count(*) filter(where evaluable)>0
       then round(100.0*count(*) filter(where evaluable and cumple_bruto)/count(*) filter(where evaluable),2)
       else 0 end as sla_bruto,
  case when count(*) filter(where evaluable)>0
       then round(100.0*count(*) filter(where evaluable and cumple_ajustado)/count(*) filter(where evaluable),2)
       else 0 end as sla_ajustado
from public.mv_sla_orden_operativa_v323
group by periodo,cuadrilla;

revoke all on public.mv_sla_orden_operativa_v323 from anon,authenticated;
revoke all on public.mv_sla_resumen_actual_v323 from anon,authenticated;
grant select on public.mv_sla_orden_operativa_v323 to service_role;
grant select on public.mv_sla_resumen_actual_v323 to service_role;

commit;