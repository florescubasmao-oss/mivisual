
-- 055_dashboard_salida_final.sql
-- Salida rápida final: histórico protegido + septiembre/futuro desde cache PostgreSQL.

create or replace view public.mv_dashboard_actual_cache
with (security_invoker=true) as
select
  r.periodo,
  c.fecha_corte as actualizado_al,
  r.cuadrilla,
  r.sede,
  r.plataforma,
  coalesce(m.supervisor,'') as supervisor,
  coalesce(m.usuario,'ADMIN') as usuario,
  r.produccion,
  r.efectividad,
  r.recableado,
  r.vtrgar,
  r.observaciones,
  r.monto_total_obs,
  r.monto_afectado_obs,
  r.sla_bruto,
  r.sla_ajustado,
  r.puntaje_final,
  r.puesto_region,
  r.puesto_sede,
  r.puesto_plataforma,
  r.pesos_ranking,
  jsonb_build_object(
    'cuadrilla',r.cuadrilla,
    'fechaCorte',to_char(c.fecha_corte,'YYYY-MM-DD'),
    'metaDiaria',coalesce(c.meta_diaria,5),
    'diasCampo',coalesce(c.dias_campo,0),
    'diasDescanso',coalesce(c.dias_descanso,0),
    'diasVacaciones',coalesce(c.dias_vacaciones,0),
    'diasBolsa',coalesce(c.dias_bolsa,0),
    'diasSinProgramacion',coalesce(c.dias_sin_programacion,0),
    'metaAcumulada',coalesce(c.meta_acumulada,0)
  ) as cumplimiento_diario,
  jsonb_build_object(
    'id',r.periodo||'|'||r.cuadrilla,
    'periodo',r.periodo,
    'actualizacion',to_char(c.fecha_corte,'YYYY-MM-DD'),
    'cuadrilla',r.cuadrilla,
    'usuario',coalesce(m.usuario,'ADMIN'),
    'sede',r.sede,
    'plataforma',r.plataforma,
    'supervisor',coalesce(m.supervisor,''),
    'produccion',r.produccion,
    'efectividad',r.efectividad,
    'recableado',r.recableado,
    'vtrgar',r.vtrgar,
    'observaciones',r.observaciones,
    'montoTotalObs',r.monto_total_obs,
    'montoAfectadoObs',r.monto_afectado_obs,
    'slaBruto',r.sla_bruto,
    'slaAjustado',r.sla_ajustado,
    'sla',r.sla_ajustado,
    'puntaje',r.puntaje_final,
    'puntajeFinal',r.puntaje_final,
    'puestoRegion',r.puesto_region,
    'puestoSede',r.puesto_sede,
    'puestoPlataforma',r.puesto_plataforma,
    'pesosRanking',r.pesos_ranking,
    'aporteProduccion',r.aporte_produccion,
    'aporteEfectividad',r.aporte_efectividad,
    'aporteSla',r.aporte_sla,
    'aporteObservaciones',r.aporte_observaciones,
    'aporteRecableado',r.aporte_recableado,
    'aporteVtrGar',r.aporte_vtrgar,
    'detProduccion',jsonb_build_object(
      'totalOrdenes',coalesce(r.produccion_ordenes,0),
      'totalPuntos',r.produccion,
      'detalleBajoDemanda',true,
      'fuenteDetalle','mv_dashboard_produccion_detalle'
    ),
    'detEfectividad',jsonb_build_object('detalleBajoDemanda',true,'fuenteDetalle','mv_dashboard_efectividad_detalle'),
    'detRecableado',jsonb_build_object('detalleBajoDemanda',true,'fuenteDetalle','mv_dashboard_recableado_detalle'),
    'detVtrGar',jsonb_build_object('detalleBajoDemanda',true,'fuenteDetalle','mv_dashboard_vtrgar_detalle'),
    'detObservaciones',jsonb_build_object('detalleBajoDemanda',true,'fuenteDetalle','mv_dashboard_observaciones_detalle'),
    'detSla',jsonb_build_object(
      'evaluables',coalesce(r.sla_evaluables,0),
      'fueraAjustado',coalesce(r.sla_fuera,0),
      'excepcionesAprobadas',coalesce(r.sla_excepciones_aprobadas,0),
      'slaBruto',r.sla_bruto,
      'slaAjustado',r.sla_ajustado,
      'detalleBajoDemanda',true,
      'fuenteDetalle','mv_dashboard_sla_detalle'
    ),
    'mv353CumplimientoDia',jsonb_build_object(
      'cuadrilla',r.cuadrilla,
      'fechaCorte',to_char(c.fecha_corte,'YYYY-MM-DD'),
      'metaDiaria',coalesce(c.meta_diaria,5),
      'diasCampo',coalesce(c.dias_campo,0),
      'diasDescanso',coalesce(c.dias_descanso,0),
      'diasVacaciones',coalesce(c.dias_vacaciones,0),
      'diasBolsa',coalesce(c.dias_bolsa,0),
      'diasSinProgramacion',coalesce(c.dias_sin_programacion,0),
      'metaAcumulada',coalesce(c.meta_acumulada,0)
    ),
    'fuenteRanking','POSTGRESQL_UNICA',
    'modoDetalle','BAJO_DEMANDA'
  ) as resumen_json,
  'MOTOR_POSTGRESQL_CACHE'::text as origen
from public.dashboard_ranking_cache r
left join public.dashboard_cumplimiento_cache c
  on c.periodo=r.periodo and c.cuadrilla=r.cuadrilla
left join public.mv_dashboard_cuadrilla_meta m
  on m.cuadrilla=r.cuadrilla;

create or replace view public.mv_dashboard_historico_protegido_cache
with (security_invoker=true) as
with r as (
  select
    rl.periodo,
    public.mv_observaciones_cuadrilla_norm(rl.cuadrilla) as cuadrilla,
    rl.sede,
    rl.plataforma,
    rl.produccion,
    rl.efectividad,
    rl.recableado,
    rl.vtrgar,
    rl.observaciones,
    rl.monto_total,
    rl.monto_afectado,
    rl.sla_bruto,
    rl.sla_ajustado,
    rl.puntaje_final,
    rl.puesto_region,
    rl.puesto_sede,
    rl.puesto_plataforma,
    rl.pesos_json
  from public.ranking_legacy_snapshot rl
  where upper(trim(rl.cuadrilla))<>'TODAS'
    and rl.periodo not in (
      select periodo from public.ranking_configuracion_motor where upper(estado)='ACTIVO'
    )
)
select
  r.periodo,
  coalesce(l.actualizado_al,c.fecha_corte) as actualizado_al,
  r.cuadrilla,
  coalesce(nullif(l.sede,''),r.sede) as sede,
  coalesce(nullif(l.plataforma,''),r.plataforma) as plataforma,
  coalesce(nullif(l.supervisor,''),m.supervisor,'') as supervisor,
  coalesce(nullif(l.usuario,''),m.usuario,'ADMIN') as usuario,
  coalesce(l.produccion,r.produccion) as produccion,
  coalesce(l.efectividad,case when abs(r.efectividad)<=1 then r.efectividad*100 else r.efectividad end) as efectividad,
  coalesce(l.recableado,case when abs(r.recableado)<=1 then r.recableado*100 else r.recableado end) as recableado,
  coalesce(l.vtrgar,case when abs(r.vtrgar)<=1 then r.vtrgar*100 else r.vtrgar end) as vtrgar,
  coalesce(l.observaciones,r.observaciones) as observaciones,
  coalesce(l.monto_total_obs,r.monto_total) as monto_total_obs,
  coalesce(l.monto_afectado_obs,r.monto_afectado) as monto_afectado_obs,
  coalesce(l.sla_bruto,r.sla_bruto) as sla_bruto,
  coalesce(l.sla_ajustado,r.sla_ajustado) as sla_ajustado,
  coalesce(l.puntaje_final,r.puntaje_final) as puntaje_final,
  coalesce(nullif(l.puesto_region,0),r.puesto_region) as puesto_region,
  coalesce(nullif(l.puesto_sede,0),r.puesto_sede) as puesto_sede,
  coalesce(nullif(l.puesto_plataforma,0),r.puesto_plataforma) as puesto_plataforma,
  coalesce(nullif(l.pesos_ranking,'{}'::jsonb),r.pesos_json) as pesos_ranking,
  coalesce(
    nullif(l.cumplimiento_diario,'{}'::jsonb),
    jsonb_build_object(
      'cuadrilla',r.cuadrilla,
      'fechaCorte',to_char(c.fecha_corte,'YYYY-MM-DD'),
      'metaDiaria',coalesce(c.meta_diaria,5),
      'diasCampo',coalesce(c.dias_campo,0),
      'diasDescanso',coalesce(c.dias_descanso,0),
      'diasVacaciones',coalesce(c.dias_vacaciones,0),
      'diasBolsa',coalesce(c.dias_bolsa,0),
      'diasSinProgramacion',coalesce(c.dias_sin_programacion,0),
      'metaAcumulada',coalesce(c.meta_acumulada,0)
    )
  ) as cumplimiento_diario,
  coalesce(
    l.resumen_json,
    jsonb_build_object(
      'id',r.periodo||'|'||r.cuadrilla,
      'periodo',r.periodo,
      'actualizacion',to_char(coalesce(l.actualizado_al,c.fecha_corte),'YYYY-MM-DD'),
      'cuadrilla',r.cuadrilla,
      'usuario',coalesce(m.usuario,'ADMIN'),
      'sede',coalesce(nullif(l.sede,''),r.sede),
      'plataforma',coalesce(nullif(l.plataforma,''),r.plataforma),
      'supervisor',coalesce(nullif(l.supervisor,''),m.supervisor,''),
      'produccion',r.produccion,
      'efectividad',case when abs(r.efectividad)<=1 then round(r.efectividad*100,2) else round(r.efectividad,2) end,
      'recableado',case when abs(r.recableado)<=1 then round(r.recableado*100,2) else round(r.recableado,2) end,
      'vtrgar',case when abs(r.vtrgar)<=1 then round(r.vtrgar*100,2) else round(r.vtrgar,2) end,
      'observaciones',r.observaciones,
      'montoTotalObs',r.monto_total,
      'montoAfectadoObs',r.monto_afectado,
      'slaBruto',r.sla_bruto,
      'slaAjustado',r.sla_ajustado,
      'sla',r.sla_ajustado,
      'puntaje',r.puntaje_final,
      'puntajeFinal',r.puntaje_final,
      'puestoRegion',r.puesto_region,
      'puestoSede',r.puesto_sede,
      'puestoPlataforma',r.puesto_plataforma,
      'pesosRanking',r.pesos_json,
      'mv353CumplimientoDia',jsonb_build_object(
        'cuadrilla',r.cuadrilla,
        'fechaCorte',to_char(c.fecha_corte,'YYYY-MM-DD'),
        'metaDiaria',coalesce(c.meta_diaria,5),
        'diasCampo',coalesce(c.dias_campo,0),
        'diasDescanso',coalesce(c.dias_descanso,0),
        'diasVacaciones',coalesce(c.dias_vacaciones,0),
        'diasBolsa',coalesce(c.dias_bolsa,0),
        'diasSinProgramacion',coalesce(c.dias_sin_programacion,0),
        'metaAcumulada',coalesce(c.meta_acumulada,0)
      ),
      'historicoReconstruido',true
    )
  ) as resumen_json,
  case when l.source_row is null then 'HISTORICO_RECONSTRUIDO_FALTANTE' else 'LEGACY_PROTEGIDO' end as origen
from r
left join public.mv_dashboard_legacy_normalizado l
  on l.periodo=r.periodo and l.cuadrilla=r.cuadrilla
left join public.dashboard_cumplimiento_cache c
  on c.periodo=r.periodo and c.cuadrilla=r.cuadrilla
left join public.mv_dashboard_cuadrilla_meta m
  on m.cuadrilla=r.cuadrilla;

create or replace view public.mv_dashboard_migracion
with (security_invoker=true) as
select
  periodo,actualizado_al,cuadrilla,sede,plataforma,supervisor,usuario,
  produccion,efectividad,recableado,vtrgar,observaciones,monto_total_obs,monto_afectado_obs,
  sla_bruto,sla_ajustado,puntaje_final,puesto_region,puesto_sede,puesto_plataforma,pesos_ranking,
  cumplimiento_diario,resumen_json,origen
from public.mv_dashboard_historico_protegido_cache
union all
select
  periodo,actualizado_al,cuadrilla,sede,plataforma,supervisor,usuario,
  produccion,efectividad,recableado,vtrgar,observaciones,monto_total_obs,monto_afectado_obs,
  sla_bruto,sla_ajustado,puntaje_final,puesto_region,puesto_sede,puesto_plataforma,pesos_ranking,
  cumplimiento_diario,resumen_json,origen
from public.mv_dashboard_actual_cache;

create or replace view public.mv_dashboard_periodos_migracion
with (security_invoker=true) as
select
  periodo,
  count(*)::integer as cuadrillas,
  max(actualizado_al) as corte,
  count(*) filter(where origen='LEGACY_PROTEGIDO')::integer as legacy_protegido,
  count(*) filter(where origen='HISTORICO_RECONSTRUIDO_FALTANTE')::integer as historico_reconstruido,
  count(*) filter(where origen='MOTOR_POSTGRESQL_CACHE')::integer as motor_postgresql
from public.mv_dashboard_migracion
group by periodo;

revoke all on public.mv_dashboard_actual_cache from anon,authenticated;
revoke all on public.mv_dashboard_historico_protegido_cache from anon,authenticated;
revoke all on public.mv_dashboard_migracion from anon,authenticated;
revoke all on public.mv_dashboard_periodos_migracion from anon,authenticated;

grant select on public.mv_dashboard_actual_cache to service_role;
grant select on public.mv_dashboard_historico_protegido_cache to service_role;
grant select on public.mv_dashboard_migracion to service_role;
grant select on public.mv_dashboard_periodos_migracion to service_role;
