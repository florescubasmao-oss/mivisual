
-- 057_live_delta_sync_20260919.sql
-- Delta detectado mientras la app Apps Script/Sheets sigue operativa.
-- No modifica Google Sheets ni la rama main.

update public.app_users
set nombres_apellidos=case usuario
  when 'P23VISUALSGI' then 'Jorge Martin Espinoza Franco'
  when 'P23VISUALSGI2' then 'Harold Hiomar Herrera Zapata'
  else nombres_apellidos
end,
updated_at=now()
where usuario in ('P23VISUALSGI','P23VISUALSGI2');

update public.catalogo_partidas_migracion
set monto=case source_row
  when 29 then 90
  when 30 then 90
  when 31 then 90
  when 32 then 312
  when 33 then 270
  when 34 then 90
  else monto
end,
imported_at=now()
where source_row between 29 and 34;

update public.migration_live_source_control
set last_audit_at=now(),sheet_rows=80,postgres_rows=80,content_match=true,
    audit_scope='USUARIO+CORREO+CUADRILLA+SEDE+PLATAFORMA+PERFIL+NIVEL+ESTADO+SUPERVISOR+DATOS_OPERATIVOS',
    status='OK_AUDITADO',
    notes='Auditoría 19/09/2026: 80/80. Nombres P23 sincronizados.',
    updated_at=now()
where modulo='USUARIOS';

update public.migration_live_source_control
set last_audit_at=now(),sheet_rows=267,postgres_rows=267,content_match=true,
    audit_scope='PERFIL+MODULO+FLAGS+ALCANCE+VISTA+OBSERVACION',
    status='OK_AUDITADO',
    notes='Auditoría semántica 19/09/2026: 267/267, 0 diferencias.',
    updated_at=now()
where modulo='PERMISOS';

update public.migration_live_source_control
set last_audit_at=now(),sheet_rows=2,postgres_rows=2,content_match=true,
    audit_scope='MODULO+ESTADO+ACTUALIZADO_POR',
    status='OK_AUDITADO',
    notes='Auditoría 19/09/2026: 2/2, 0 diferencias semánticas.',
    updated_at=now()
where modulo='CONFIG_MODULOS';

update public.migration_live_source_control
set last_audit_at=now(),sheet_rows=33,postgres_rows=33,content_match=true,
    audit_scope='CODIGO+TIPO+PLATAFORMA+PUNTAJE+GRUPO+MONTO',
    status='OK_AUDITADO',
    notes='Auditoría 19/09/2026: 33/33. Sincronizados 6 montos en filas 29-34; puntajes/grupos sin cambios.',
    updated_at=now()
where modulo='CATALOGO_ORDENES';

update public.migration_live_source_control
set last_audit_at=now(),sheet_rows=3,postgres_rows=3,content_match=true,
    audit_scope='PERIODO+PESOS+TOTAL+ESTADO+ACTUALIZADO_POR',
    status='OK_AUDITADO',
    notes='Auditoría 19/09/2026: 3/3, 0 diferencias. Septiembre productivo 50/20/5/5/5/15.',
    updated_at=now()
where modulo='CONFIGURACION_RANKING';

update public.migration_live_source_control
set last_audit_at=now(),sheet_rows=56,postgres_rows=56,content_match=true,
    audit_scope='ID+TIPO_ORDEN+CLASIFICACION+SLA_MINUTOS+ESTADO+ACTUALIZADO_POR',
    status='OK_AUDITADO',
    notes='Auditoría 19/09/2026: 56/56, 0 diferencias semánticas.',
    updated_at=now()
where modulo='PARAMETROS_SLA';
