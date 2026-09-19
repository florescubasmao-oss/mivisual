-- MI VISUAL - Recableado: snapshot legacy
begin;

create table if not exists public.recableado_legacy_snapshot (
  source_row integer primary key,
  id text,
  usuario text,
  cuadrilla text,
  actualizacion date,
  los_rojo_asignadas integer not null default 0,
  recableados integer not null default 0,
  porcentaje numeric(12,8),
  periodo text,
  imported_at timestamptz not null default now()
);

create index if not exists recableado_legacy_periodo_cuadrilla_idx
  on public.recableado_legacy_snapshot(periodo,cuadrilla);

alter table public.recableado_legacy_snapshot enable row level security;
revoke all on table public.recableado_legacy_snapshot from anon,authenticated;

create or replace view public.mv_recableado_snapshot_resumen as
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
  end as porcentaje
from public.recableado_legacy_snapshot
group by periodo;

commit;
