-- MI VISUAL - VTR/GAR indicador + Validacion Tecnica snapshots
begin;

create table if not exists public.vtr_gar_indicador_legacy_snapshot (
  source_row integer primary key,
  id text,
  usuario text,
  cuadrilla text,
  actualizacion date,
  total_finalizadas integer not null default 0,
  gar integer not null default 0,
  vtr integer not null default 0,
  total_gar_vtr integer not null default 0,
  porcentaje numeric(12,8),
  periodo text,
  imported_at timestamptz not null default now()
);

create index if not exists vtr_gar_ind_legacy_periodo_cuadrilla_idx
  on public.vtr_gar_indicador_legacy_snapshot(periodo,cuadrilla);

create table if not exists public.validacion_tecnica_legacy_snapshot (
  source_row integer primary key,
  id text,
  fecha_registro date,
  hora_registro time,
  sede text,
  tecnico text,
  cuadrilla text,
  tipo_validacion text,
  codigo text,
  tipo_ticket text,
  numero_ticket text,
  ticket_final text,
  dni_cliente text,
  motivo_tecnico text,
  estado text,
  resultado_final text,
  validado_por text,
  perfil_validador text,
  fecha_validacion date,
  hora_validacion time,
  motivo_validacion text,
  link_telegram text,
  hora_limite_1 text,
  hora_limite_2 text,
  puntaje_vtr_gar numeric(12,3),
  periodo text,
  imported_at timestamptz not null default now()
);

create index if not exists validacion_tecnica_periodo_tipo_idx
  on public.validacion_tecnica_legacy_snapshot(periodo,tipo_validacion,estado);
create index if not exists validacion_tecnica_codigo_idx
  on public.validacion_tecnica_legacy_snapshot(codigo);
create index if not exists validacion_tecnica_ticket_idx
  on public.validacion_tecnica_legacy_snapshot(ticket_final);

create table if not exists public.vtr_gar_historial_legacy_snapshot (
  source_row integer primary key,
  id text,
  clave text,
  fecha_evento date,
  hora_evento time,
  usuario text,
  accion text,
  estado_anterior text,
  estado_nuevo text,
  cuadrilla_anterior text,
  cuadrilla_nuevo text,
  observacion text,
  imported_at timestamptz not null default now()
);

alter table public.vtr_gar_indicador_legacy_snapshot enable row level security;
alter table public.validacion_tecnica_legacy_snapshot enable row level security;
alter table public.vtr_gar_historial_legacy_snapshot enable row level security;

revoke all on table public.vtr_gar_indicador_legacy_snapshot from anon,authenticated;
revoke all on table public.validacion_tecnica_legacy_snapshot from anon,authenticated;
revoke all on table public.vtr_gar_historial_legacy_snapshot from anon,authenticated;

create or replace view public.mv_vtr_gar_indicador_snapshot_resumen as
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
  end as porcentaje
from public.vtr_gar_indicador_legacy_snapshot
group by periodo;

commit;
