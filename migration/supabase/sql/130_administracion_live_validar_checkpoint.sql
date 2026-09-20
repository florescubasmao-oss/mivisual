-- 130_administracion_live_validar_checkpoint.sql
-- Administración pasa a LIVE_VALIDAR: backend migrado, producción legacy aún sin cutover.

update public.migration_live_source_control
set postgres_target='app_users + app_permissions + auth.users + auth-admin-pilot + base_operativa_migracion + motores reutilizados',
    source_mode='SHEET_LIVE_SNAPSHOT',
    status='LIVE_VALIDAR',
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='AUTH_USUARIOS + PERMISOS + BASE_OPERATIVA_VERSIONADA + REUSO_VTRGAR_RANKING_CATALOGO',
    notes='Administración piloto ya cubre usuarios/Auth y Base Operativa versionada con staging, conciliación, APPLY aislado y rollback. VTR/GAR, Ranking, Catálogo y Permisos reutilizan backends migrados. Falta cutover final y publicación del shell actualizado.',
    updated_at=now()
where modulo='ADMINISTRACION';

update public.migration_live_source_control
set postgres_target='base_operativa_legacy + base_operativa_migracion + mv_base_operativa_unificada_pilot + staging/reconciliation/apply',
    source_mode='SHEET_LIVE_SNAPSHOT',
    status='LIVE_VALIDAR',
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='HISTORICO_4144_4144 + STAGING + CONCILIACION + APPLY_ROLLBACK + DEPENDENCIAS_PARALELAS',
    notes='Histórico protegido 4144/4144. Nueva capa versionada aislada de producción con rollback. Cuatro dependencias paralelas comparadas contra productivas con 0 diferencias antes de cargar un periodo activo real.',
    updated_at=now()
where modulo='BASE_OPERATIVA';
