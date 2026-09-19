
-- 052_dashboard_motor_actual.sql
-- Motor actual del Dashboard. No recalcula Ranking: consume mv_ranking_motor_migracion.

create or replace view public.mv_dashboard_motor_base
with (security_invoker=true) as
select
  r.periodo,
  c.fecha_corte as actualizado_al,
  r.cuadrilla,
  r.sede,
  r.plataforma,
  coalesce(m.supervisor,'') as supervisor,
  coalesce(m.usuario,'ADMIN') as usuario,

  round(r.produccion,2) as produccion,
  round(case when abs(r.efectividad)<=1 then r.efectividad*100 else r.efectividad end,2) as efectividad,
  round(case when abs(r.recableado)<=1 then r.recableado*100 else r.recableado end,2) as recableado,
  round(case when abs(r.vtrgar)<=1 then r.vtrgar*100 else r.vtrgar end,2) as vtrgar,

  r.observaciones,
  round(r.monto_total,2) as monto_total_obs,
  round(r.monto_afectado,2) as monto_afectado_obs,

  round(r.sla_bruto,2) as sla_bruto,
  round(r.sla_ajustado,2) as sla_ajustado,

  r.puntaje_final,
  r.puesto_region,
  r.puesto_sede,
  r.puesto_plataforma,
  r.pesos_json as pesos_ranking,

  round(r.score_produccion*r.produccion_pct/100,4) as aporte_produccion,
  round(r.score_efectividad*r.efectividad_pct/100,4) as aporte_efectividad,
  round(r.score_sla*r.sla_pct/100,4) as aporte_sla,
  round(r.score_observaciones*r.observaciones_pct/100,4) as aporte_observaciones,
  round(r.score_recableado*r.recableado_pct/100,4) as aporte_recableado,
  round(r.score_vtrgar*r.vtrgar_pct/100,4) as aporte_vtrgar,

  coalesce(p.detalle,jsonb_build_object(
    'totalOrdenes',0,'totalPuntos',0,'grupos','{}'::jsonb,'tipos','{}'::jsonb,'fechas','{}'::jsonb
  )) as det_produccion,

  jsonb_build_object(
    'finalizadas',coalesce(e.finalizada,0),
    'canceladas',coalesce(e.cancelada,0),
    'regestion',coalesce(e.regestion,0),
    'reprogramadas',coalesce(e.reprogramado,0),
    'total',coalesce(e.total_general,0),
    'efectividad',coalesce(e.efectividad_pct,0)
  ) as det_efectividad,

  jsonb_build_object(
    'los',coalesce(rc.los_rojo_asignadas,0),
    'recableados',coalesce(rc.recableados,0),
    'porcentaje',coalesce(rc.porcentaje_pct,0)
  ) as det_recableado,

  jsonb_build_object(
    'finalizadas',coalesce(v.total_finalizadas,0),
    'gar',coalesce(v.gar,0),
    'vtr',coalesce(v.vtr,0),
    'total',coalesce(v.total_gar_vtr,0),
    'porcentaje',coalesce(v.porcentaje_pct,0)
  ) as det_vtr_gar,

  jsonb_build_object(
    'total',coalesce(o.total,0),
    'pendientes',coalesce(o.pendientes,0),
    'montoTotal',coalesce(o.monto_total,0),
    'montoPendiente',coalesce(o.monto_pendiente,0),
    'montoAfectado',coalesce(o.monto_afectado,0),
    'estados',coalesce(o.estados,'{}'::jsonb)
  ) as det_observaciones,

  coalesce(s.detalle,'{}'::jsonb) as det_sla,

  jsonb_build_object(
    'cuadrilla',r.cuadrilla,
    'fechaCorte',to_char(cum.fecha_corte,'YYYY-MM-DD'),
    'metaDiaria',coalesce(cum.meta_diaria,5),
    'diasCampo',coalesce(cum.dias_campo,0),
    'diasDescanso',coalesce(cum.dias_descanso,0),
    'diasVacaciones',coalesce(cum.dias_vacaciones,0),
    'diasBolsa',coalesce(cum.dias_bolsa,0),
    'diasSinProgramacion',coalesce(cum.dias_sin_programacion,0),
    'metaAcumulada',coalesce(cum.meta_acumulada,0)
  ) as cumplimiento_diario,

  jsonb_build_object(
    'total',coalesce(o.win_total,0),
    'penalizadas',coalesce(o.win_penalizadas,0),
    'montoPenalizado',coalesce(o.win_monto_penalizado,0),
    'subsanadas',coalesce(o.win_subsanadas,0),
    'montoSubsanado',coalesce(o.win_monto_subsanado,0)
  ) as observaciones_win

from public.mv_ranking_motor_migracion r
join public.mv_dashboard_fecha_corte c using(periodo)
left join public.mv_dashboard_cuadrilla_meta m on m.cuadrilla=r.cuadrilla
left join public.mv_dashboard_produccion_detalle p on p.periodo=r.periodo and p.cuadrilla=r.cuadrilla
left join public.mv_dashboard_efectividad_detalle e on e.periodo=r.periodo and e.cuadrilla=r.cuadrilla
left join public.mv_dashboard_recableado_detalle rc on rc.periodo=r.periodo and rc.cuadrilla=r.cuadrilla
left join public.mv_dashboard_vtrgar_detalle v on v.periodo=r.periodo and v.cuadrilla=r.cuadrilla
left join public.mv_dashboard_observaciones_detalle o on o.periodo=r.periodo and o.cuadrilla=r.cuadrilla
left join public.mv_dashboard_sla_detalle s on s.periodo=r.periodo and s.cuadrilla=r.cuadrilla
left join public.mv_dashboard_cumplimiento_diario cum on cum.periodo=r.periodo and cum.cuadrilla=r.cuadrilla;

create or replace view public.mv_dashboard_motor_migracion
with (security_invoker=true) as
select
  b.*,
  jsonb_build_object(
    'id',b.periodo||'|'||b.cuadrilla,
    'periodo',b.periodo,
    'actualizacion',to_char(b.actualizado_al,'YYYY-MM-DD'),
    'cuadrilla',b.cuadrilla,
    'usuario',b.usuario,
    'sede',b.sede,
    'plataforma',b.plataforma,
    'supervisor',b.supervisor,
    'produccion',b.produccion,
    'efectividad',b.efectividad,
    'recableado',b.recableado,
    'vtrgar',b.vtrgar,
    'observaciones',b.observaciones,
    'montoTotalObs',b.monto_total_obs,
    'montoAfectadoObs',b.monto_afectado_obs,
    'slaBruto',b.sla_bruto,
    'slaAjustado',b.sla_ajustado,
    'sla',b.sla_ajustado,
    'puntaje',b.puntaje_final,
    'puntajeFinal',b.puntaje_final,
    'puestoRegion',b.puesto_region,
    'puestoSede',b.puesto_sede,
    'puestoPlataforma',b.puesto_plataforma,
    'pesosRanking',b.pesos_ranking,
    'aporteProduccion',b.aporte_produccion,
    'aporteEfectividad',b.aporte_efectividad,
    'aporteSla',b.aporte_sla,
    'aporteObservaciones',b.aporte_observaciones,
    'aporteRecableado',b.aporte_recableado,
    'aporteVtrGar',b.aporte_vtrgar,
    'detProduccion',b.det_produccion,
    'detEfectividad',b.det_efectividad,
    'detRecableado',b.det_recableado,
    'detVtrGar',b.det_vtr_gar,
    'detObservaciones',b.det_observaciones,
    'detSla',b.det_sla,
    'mv353CumplimientoDia',b.cumplimiento_diario,
    'mv361ObservacionesWin',b.observaciones_win,
    'fuenteRanking','POSTGRESQL_UNICA'
  ) as resumen_json,
  'MOTOR_POSTGRESQL'::text as origen
from public.mv_dashboard_motor_base b;

revoke all on public.mv_dashboard_motor_base from anon,authenticated;
revoke all on public.mv_dashboard_motor_migracion from anon,authenticated;
grant select on public.mv_dashboard_motor_base to service_role;
grant select on public.mv_dashboard_motor_migracion to service_role;
