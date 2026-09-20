-- 114_sync_staging_control.sql
-- Capa de staging para sincronización controlada Sheets -> PostgreSQL.
-- No aplica datos a tablas operativas.

create table if not exists public.migration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  source_name text not null,
  source_snapshot_at timestamptz,
  source_rows integer not null default 0 check (source_rows >= 0),
  staged_rows integer not null default 0 check (staged_rows >= 0),
  applied_rows integer not null default 0 check (applied_rows >= 0),
  source_checksum text,
  status text not null default 'STAGING'
    check (status in ('STAGING','STAGED','VALIDATED','APPLIED','FAILED','CANCELLED')),
  created_by text,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  applied_at timestamptz,
  notes text
);

create index if not exists migration_sync_runs_modulo_created_idx
  on public.migration_sync_runs(modulo,created_at desc);

create table if not exists public.migration_sync_staging (
  run_id uuid not null references public.migration_sync_runs(id) on delete cascade,
  source_key text not null,
  source_row integer,
  row_hash text not null,
  row_data jsonb not null,
  staged_at timestamptz not null default now(),
  primary key(run_id,source_key)
);

create index if not exists migration_sync_staging_run_row_idx
  on public.migration_sync_staging(run_id,source_row);

create or replace view public.mv_migration_sync_status
with (security_invoker=true) as
select
  r.id,r.modulo,r.source_name,r.source_snapshot_at,r.source_rows,r.staged_rows,
  r.applied_rows,r.source_checksum,r.status,r.created_by,r.created_at,
  r.validated_at,r.applied_at,r.notes,
  case
    when r.status='VALIDATED' and r.source_rows=r.staged_rows then true
    else false
  end as listo_para_aplicador_especifico
from public.migration_sync_runs r
order by r.created_at desc;

alter table public.migration_sync_runs enable row level security;
alter table public.migration_sync_staging enable row level security;

revoke all on public.migration_sync_runs from anon,authenticated;
revoke all on public.migration_sync_staging from anon,authenticated;
revoke all on public.mv_migration_sync_status from anon,authenticated;

grant all on public.migration_sync_runs to service_role;
grant all on public.migration_sync_staging to service_role;
grant select on public.mv_migration_sync_status to service_role;
