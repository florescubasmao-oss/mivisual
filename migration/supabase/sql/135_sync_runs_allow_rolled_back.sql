-- 135_sync_runs_allow_rolled_back.sql
-- Estado explícito para rollback auditado.

alter table public.migration_sync_runs
  drop constraint if exists migration_sync_runs_status_check;

alter table public.migration_sync_runs
  add constraint migration_sync_runs_status_check
  check (status in ('STAGING','STAGED','VALIDATED','APPLIED','ROLLED_BACK','FAILED','CANCELLED'));
