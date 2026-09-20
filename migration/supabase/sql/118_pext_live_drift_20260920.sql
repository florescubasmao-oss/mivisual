-- 118_pext_live_drift_20260920.sql
-- Auditoría de convivencia: TRABAJOS_CONJUNTA continúa viva en Sheets.
update public.migration_live_source_control
set sheet_rows=30,
    postgres_rows=28,
    content_match=false,
    requires_final_resync=true,
    status='REQUIERE_RESYNC_FINAL',
    audit_scope='CONTEO_ACTUAL_TRABAJOS_CONJUNTA',
    last_audit_at=now(),
    notes='Auditoría 20/09/2026 durante integración UI: TRABAJOS_CONJUNTA tiene 30 filas en Sheets y PostgreSQL 28. Existen al menos 2 filas nuevas legacy desde la conciliación anterior. No hacer cutover de PEXT hasta resync.',
    updated_at=now()
where modulo='PEXT_CONJUNTA';
