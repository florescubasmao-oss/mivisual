-- 113_live_source_control_audit_20260920.sql
-- Auditoría integral 20/09/2026. No modifica fuentes legacy.
-- Registra drift real durante convivencia y módulos omitidos detectados.

update public.migration_live_source_control
set last_audit_at=now(), sheet_rows=6786, postgres_rows=6549, content_match=false,
    status='REQUIERE_RESYNC_FINAL',
    audit_scope='CONTEO_ACTUAL_MAPA_ORDENES_VS_ORDENES',
    notes='Auditoría 20/09/2026: MAPA_ORDENES 6786 filas vs PostgreSQL 6549. Drift esperado porque la app legacy sigue activa; no hacer cutover hasta resync controlado.',
    updated_at=now()
where modulo='MAPA_OPERATIVO';

insert into public.migration_live_source_control(
  modulo,legacy_sheet,postgres_target,source_mode,legacy_writes_continue,
  requires_final_resync,last_audit_at,sheet_rows,postgres_rows,content_match,
  audit_scope,status,notes
) values (
  'CATALOGO_CTO','CATALOGO_CTO','catalogo_cto','SHEET_LIVE_SNAPSHOT',true,true,
  now(),6994,6815,false,'CONTEO_ACTUAL_CATALOGO_CTO',
  'REQUIERE_RESYNC_FINAL',
  'Auditoría 20/09/2026: CATALOGO_CTO 6994 filas vs PostgreSQL 6815. Requiere resync antes del cutover.'
)
on conflict(modulo) do update set
  legacy_sheet=excluded.legacy_sheet,postgres_target=excluded.postgres_target,
  source_mode=excluded.source_mode,legacy_writes_continue=excluded.legacy_writes_continue,
  requires_final_resync=excluded.requires_final_resync,last_audit_at=excluded.last_audit_at,
  sheet_rows=excluded.sheet_rows,postgres_rows=excluded.postgres_rows,
  content_match=excluded.content_match,audit_scope=excluded.audit_scope,
  status=excluded.status,notes=excluded.notes,updated_at=now();

update public.migration_live_source_control
set last_audit_at=now(), sheet_rows=2339, postgres_rows=2294, content_match=false,
    status='REQUIERE_RESYNC_FINAL',
    audit_scope='CONTEO_ACTUAL_ACTAS_ESCANEADAS',
    notes='Auditoría 20/09/2026: 2339 filas productivas vs 2294 migradas. +45 filas legacy desde la última conciliación.',
    updated_at=now()
where modulo='ACTAS';

update public.migration_live_source_control
set last_audit_at=now(), sheet_rows=687, postgres_rows=674, content_match=false,
    status='REQUIERE_RESYNC_FINAL',
    audit_scope='CONTEO_ACTUAL_VALIDACION_TECNICA',
    notes='Auditoría 20/09/2026: 687 filas productivas vs 674 migradas. +13 filas legacy desde la última conciliación.',
    updated_at=now()
where modulo='VALIDACION_TECNICA';

update public.migration_live_source_control
set last_audit_at=now(), sheet_rows=723, postgres_rows=705, content_match=false,
    status='REQUIERE_RESYNC_FINAL',
    audit_scope='CONTEO_ACTUAL_PROGRAMACION_DESCANSOS',
    notes='Auditoría 20/09/2026: 723 filas productivas vs 705 migradas. +18 filas legacy desde la última conciliación.',
    updated_at=now()
where modulo='PROGRAMACION_DESCANSOS';

update public.migration_live_source_control
set last_audit_at=now(), sheet_rows=267, postgres_rows=275, content_match=true,
    status='OK_AUDITADO',
    audit_scope='267_PERMISOS_LEGACY_MAS_8_PERMISOS_PROPIOS_PLANTILLA_ORDEN',
    notes='Auditoría 20/09/2026: las 8 filas adicionales (IDs 268-275) son permisos deliberados del piloto PLANTILLA ORDEN. No son drift ni duplicados.',
    updated_at=now()
where modulo='PERMISOS';

insert into public.migration_live_source_control(
  modulo,legacy_sheet,postgres_target,source_mode,legacy_writes_continue,
  requires_final_resync,last_audit_at,sheet_rows,postgres_rows,content_match,
  audit_scope,status,notes
) values (
  'ASIGNACIONES_CAMPO','ASIGNACIONES_CAMPO',null,'PENDIENTE_MIGRACION',true,true,
  now(),null,null,null,'MODULO_OMITIDO_DETECTADO_AUDITORIA_20260920',
  'PENDIENTE_MIGRACION',
  'Fuente legacy operativa + Drive clasificada de riesgo alto. No existe cierre funcional ni tabla objetivo propia en PostgreSQL.'
)
on conflict(modulo) do update set
  legacy_sheet=excluded.legacy_sheet,postgres_target=excluded.postgres_target,
  source_mode=excluded.source_mode,legacy_writes_continue=excluded.legacy_writes_continue,
  requires_final_resync=excluded.requires_final_resync,last_audit_at=excluded.last_audit_at,
  audit_scope=excluded.audit_scope,status=excluded.status,notes=excluded.notes,updated_at=now();
