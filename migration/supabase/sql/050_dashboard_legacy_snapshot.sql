
-- 050_dashboard_legacy_snapshot.sql
-- Snapshot del RESUMEN_DASHBOARD_RANKING productivo para proteger histórico y conciliar el motor nuevo.

create table if not exists public.dashboard_legacy_snapshot (
  source_row integer primary key,
  periodo text not null,
  version_fuente text,
  actualizado_al date,
  cuadrilla text not null,
  sede text,
  plataforma text,
  supervisor text,
  usuario text,
  resumen_json jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create index if not exists dashboard_legacy_periodo_cuadrilla_idx
  on public.dashboard_legacy_snapshot(periodo,cuadrilla);

create or replace view public.mv_dashboard_legacy_normalizado
with (security_invoker=true) as
select
  d.source_row,
  d.periodo,
  d.version_fuente,
  d.actualizado_al,
  public.mv_observaciones_cuadrilla_norm(d.cuadrilla) as cuadrilla,
  upper(trim(coalesce(d.sede,''))) as sede,
  upper(trim(coalesce(d.plataforma,''))) as plataforma,
  upper(trim(coalesce(d.supervisor,''))) as supervisor,
  upper(trim(coalesce(d.usuario,''))) as usuario,
  coalesce((d.resumen_json->>'produccion')::numeric,0) as produccion,
  coalesce((d.resumen_json->>'efectividad')::numeric,0) as efectividad,
  coalesce((d.resumen_json->>'recableado')::numeric,0) as recableado,
  coalesce((d.resumen_json->>'vtrgar')::numeric,0) as vtrgar,
  coalesce((d.resumen_json->>'observaciones')::integer,0) as observaciones,
  coalesce((d.resumen_json->>'montoTotalObs')::numeric,0) as monto_total_obs,
  coalesce((d.resumen_json->>'montoAfectadoObs')::numeric,0) as monto_afectado_obs,
  coalesce((d.resumen_json->>'slaBruto')::numeric,0) as sla_bruto,
  coalesce((d.resumen_json->>'slaAjustado')::numeric,0) as sla_ajustado,
  coalesce(
    nullif(d.resumen_json->>'puntajeFinal','')::numeric,
    nullif(d.resumen_json->>'puntaje','')::numeric,
    0
  ) as puntaje_final,
  coalesce((d.resumen_json->>'puestoRegion')::integer,0) as puesto_region,
  coalesce((d.resumen_json->>'puestoSede')::integer,0) as puesto_sede,
  coalesce((d.resumen_json->>'puestoPlataforma')::integer,0) as puesto_plataforma,
  coalesce(d.resumen_json->'pesosRanking','{}'::jsonb) as pesos_ranking,
  coalesce(d.resumen_json->'detProduccion','{}'::jsonb) as det_produccion,
  coalesce(d.resumen_json->'detEfectividad','{}'::jsonb) as det_efectividad,
  coalesce(d.resumen_json->'detRecableado','{}'::jsonb) as det_recableado,
  coalesce(d.resumen_json->'detVtrGar','{}'::jsonb) as det_vtr_gar,
  coalesce(d.resumen_json->'detObservaciones','{}'::jsonb) as det_observaciones,
  coalesce(d.resumen_json->'detSla','{}'::jsonb) as det_sla,
  coalesce(d.resumen_json->'mv353CumplimientoDia','{}'::jsonb) as cumplimiento_diario,
  coalesce(d.resumen_json->'mv361ObservacionesWin','{}'::jsonb) as observaciones_win,
  d.resumen_json
from public.dashboard_legacy_snapshot d;

alter table public.dashboard_legacy_snapshot enable row level security;
revoke all on public.dashboard_legacy_snapshot from anon,authenticated;
revoke all on public.mv_dashboard_legacy_normalizado from anon,authenticated;
grant select on public.dashboard_legacy_snapshot to service_role;
grant select on public.mv_dashboard_legacy_normalizado to service_role;
