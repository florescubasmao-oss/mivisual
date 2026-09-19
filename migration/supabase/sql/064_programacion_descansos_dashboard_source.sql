
-- 064_programacion_descansos_dashboard_source.sql
-- Dashboard deja de leer el snapshot parcial y usa el motor completo de Descansos.

create or replace view public.mv_dashboard_descansos_aprobados
with (security_invoker=true) as
select
  source_row,
  id,
  periodo,
  fecha,
  sede,
  cuadrilla,
  plataforma,
  supervisor,
  version,
  estado_vigente as estado_dia
from public.mv_descansos_ultimo_aprobado
where upper(trim(cuadrilla)) not like 'PERSONAL|%';

revoke all on public.mv_dashboard_descansos_aprobados from anon,authenticated;
grant select on public.mv_dashboard_descansos_aprobados to service_role;

update public.migration_live_source_control
set postgres_target='programacion_descansos_migracion',
    source_mode='SHEET_LIVE_SNAPSHOT',
    legacy_writes_continue=true,
    requires_final_resync=true,
    last_audit_at=now(),
    sheet_rows=705,
    postgres_rows=705,
    content_match=true,
    audit_scope='38_COLUMNAS+ESTADO_VIGENTE+VERSIONES+COBERTURA',
    status='OK_AUDITADO',
    notes='Motor completo migrado. 705/705 movimientos; 427 combinaciones cuadrilla/fecha con 0 diferencias vs bridge Dashboard. App legacy aún escribe en Sheets: requiere delta final.',
    updated_at=now()
where modulo='PROGRAMACION_DESCANSOS';
