-- 131_refresh_live_drift_20260920.sql
update public.migration_live_source_control
set sheet_rows=2342,postgres_rows=2294,status='REQUIERE_RESYNC_FINAL',requires_final_resync=true,
    last_audit_at=now(),
    notes='Auditoría actualizada 20/09/2026: ACTAS_ESCANEADAS 2342 filas vs PostgreSQL 2294. Drift +48.',
    updated_at=now()
where modulo='ACTAS';

update public.migration_live_source_control
set sheet_rows=689,postgres_rows=674,status='REQUIERE_RESYNC_FINAL',requires_final_resync=true,
    last_audit_at=now(),
    notes='Auditoría actualizada 20/09/2026: VALIDACION_TECNICA 689 filas vs PostgreSQL 674. Drift +15.',
    updated_at=now()
where modulo='VALIDACION_TECNICA';

update public.migration_live_source_control
set sheet_rows=723,postgres_rows=705,status='REQUIERE_RESYNC_FINAL',requires_final_resync=true,
    last_audit_at=now(),
    notes='Auditoría actualizada 20/09/2026: PROGRAMACION_DESCANSOS 723 filas vs PostgreSQL 705. Drift +18.',
    updated_at=now()
where modulo='PROGRAMACION_DESCANSOS';

update public.migration_live_source_control
set sheet_rows=6788,postgres_rows=6549,status='REQUIERE_RESYNC_FINAL',requires_final_resync=true,
    last_audit_at=now(),
    notes='Auditoría actualizada 20/09/2026: MAPA_ORDENES 6788 filas vs PostgreSQL 6549. Drift +239.',
    updated_at=now()
where modulo='MAPA_OPERATIVO';

update public.migration_live_source_control
set sheet_rows=6995,postgres_rows=6815,status='REQUIERE_RESYNC_FINAL',requires_final_resync=true,
    last_audit_at=now(),
    notes='Auditoría actualizada 20/09/2026: CATALOGO_CTO 6995 filas vs PostgreSQL 6815. Drift +180.',
    updated_at=now()
where modulo='CATALOGO_CTO';
