-- MI VISUAL - Efectividad: snapshot legacy y reglas de clasificacion
-- Diagnostico paralelo; no modifica la hoja EFECTIVIDAD productiva.

begin;

create table if not exists public.efectividad_legacy_snapshot (
  source_row integer primary key,
  id text,
  usuario text,
  cuadrilla text,
  actualizacion date,
  finalizada integer not null default 0,
  cancelada integer not null default 0,
  regestion integer not null default 0,
  reprogramado integer not null default 0,
  total_general integer not null default 0,
  efectividad numeric(12,8),
  periodo text,
  imported_at timestamptz not null default now()
);

create index if not exists efectividad_legacy_periodo_cuadrilla_idx
  on public.efectividad_legacy_snapshot(periodo,cuadrilla);

alter table public.efectividad_legacy_snapshot enable row level security;
revoke all on table public.efectividad_legacy_snapshot from anon,authenticated;

create or replace function public.mv_efectividad_clasificacion(
  p_estado text,
  p_motivo_cancelacion text,
  p_motivo_anulacion text
)
returns text
language sql
immutable
as $$
  select case
    when public.mv_norm_key(p_estado)='FINALIZADA' then 'FINALIZADA'
    when public.mv_norm_key(p_estado)='REGESTION' then 'REGESTION'
    when public.mv_norm_key(p_estado)='ANULADA' then 'CANCELADA'
    when public.mv_norm_key(p_estado)='CANCELADA'
      and (
        public.mv_norm_key(p_motivo_cancelacion) like 'REPROGRAMACION%'
        or public.mv_norm_key(p_motivo_cancelacion)='RESCATEDIRECCIONERRADA'
      )
      then 'REPROGRAMADO'
    when public.mv_norm_key(p_estado)='CANCELADA' then 'CANCELADA'
    else 'NO_EVALUABLE'
  end;
$$;

revoke execute on function public.mv_efectividad_clasificacion(text,text,text)
  from public,anon,authenticated;
grant execute on function public.mv_efectividad_clasificacion(text,text,text)
  to service_role;

commit;
