-- 137_mapa_cto_resync_tooling_checkpoint.sql
-- Herramientas listas; datos reales aún no resyncronizados.

update public.migration_live_source_control
set status='REQUIERE_RESYNC_FINAL',
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='DRIFT + PREVIEW + PERIODOS_PROTEGIDOS + BACKUP + APPLY + ROLLBACK',
    notes='Drift vigente: MAPA_ORDENES 6788 vs PostgreSQL 6549 (+239). Tooling de resync seguro listo y probado: preview, bloqueo de julio/agosto protegidos, clasificación de grupo, backup, APPLY y rollback exacto. Datos reales aún no aplicados.',
    updated_at=now()
where modulo='MAPA_OPERATIVO';

update public.migration_live_source_control
set status='REQUIERE_RESYNC_FINAL',
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='DRIFT + PREVIEW + BACKUP + APPLY + ROLLBACK',
    notes='Drift vigente: CATALOGO_CTO 6995 vs PostgreSQL 6815 (+180). Tooling de resync seguro listo y probado: preview, backup, APPLY y rollback exacto. Datos reales aún no aplicados.',
    updated_at=now()
where modulo='CATALOGO_CTO';
