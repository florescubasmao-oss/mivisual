
-- 056_migration_live_source_control.sql
-- Control de fuentes vivas durante la convivencia Apps Script/Sheets + PostgreSQL.

create table if not exists public.migration_live_source_control (
  modulo text primary key,
  legacy_sheet text,
  postgres_target text,
  source_mode text not null,
  legacy_writes_continue boolean not null default true,
  requires_final_resync boolean not null default true,
  last_audit_at timestamptz,
  sheet_rows integer,
  postgres_rows integer,
  content_match boolean,
  audit_scope text,
  status text not null,
  notes text,
  updated_at timestamptz not null default now(),
  constraint migration_source_mode_chk check (
    source_mode in (
      'LIVE_POSTGRES',
      'DERIVED_POSTGRES',
      'SHEET_LIVE_SNAPSHOT',
      'HISTORICO_PROTEGIDO',
      'PENDIENTE_MIGRACION'
    )
  ),
  constraint migration_source_status_chk check (
    status in (
      'OK_AUDITADO',
      'LIVE_VALIDAR',
      'REQUIERE_RESYNC_FINAL',
      'HISTORICO_PROTEGIDO',
      'PENDIENTE_MIGRACION'
    )
  )
);

insert into public.migration_live_source_control(
  modulo,legacy_sheet,postgres_target,source_mode,legacy_writes_continue,
  requires_final_resync,last_audit_at,sheet_rows,postgres_rows,content_match,audit_scope,status,notes
)
values
  ('MAPA_OPERATIVO','MAPA_ORDENES','ordenes','LIVE_POSTGRES',true,true,now(),null,null,null,
   'POSTGRESQL_CONTIENE_ORDENES_18_09','LIVE_VALIDAR',
   'PostgreSQL ya recibe órdenes recientes. Mantener control de última actualización hasta cutover.'),

  ('PRODUCCION','PRODUCCION_APP','mv_produccion_partida_motor_migracion_v1','DERIVED_POSTGRES',true,true,now(),null,null,null,
   'MOTOR_DESDE_ORDENES','LIVE_VALIDAR',
   'Septiembre se deriva del motor PostgreSQL; julio/agosto quedan protegidos.'),

  ('EFECTIVIDAD','EFECTIVIDAD','mv_efectividad_migracion','DERIVED_POSTGRES',true,true,now(),83,83,null,
   'LEGACY_SNAPSHOT_MAS_MOTOR','LIVE_VALIDAR',
   'Histórico conciliado; periodo activo sigue cambiando con órdenes productivas.'),

  ('RECABLEADO','PORCENTAJE REC','mv_recableado_migracion','DERIVED_POSTGRES',true,true,now(),83,83,null,
   'LEGACY_SNAPSHOT_MAS_MOTOR','LIVE_VALIDAR',
   'Histórico conciliado; periodo activo sigue cambiando.'),

  ('VTR_GAR','POR VTR/GAR','mv_vtr_gar_indicador_migracion','DERIVED_POSTGRES',true,true,now(),null,null,null,
   'MOTOR_POSTGRESQL','LIVE_VALIDAR',
   'La clasificación e indicador activo dependen de órdenes y decisiones vigentes.'),

  ('VALIDACION_TECNICA','VALIDACION_TECNICA','validacion_tecnica_migracion','SHEET_LIVE_SNAPSHOT',true,true,now(),674,674,true,
   'ID+ESTADO+RESULTADO+VALIDADOR+MOTIVO+PUNTAJE','OK_AUDITADO',
   'Auditoría 19/09/2026: 674/674, 0 diferencias en campos mutables.'),

  ('ACTAS','ACTAS_ESCANEADAS','actas_migracion','SHEET_LIVE_SNAPSHOT',true,true,now(),2294,2294,true,
   'ID+VALIDACIONES+ENTREGA_FISICA+VERSION+CARPETA','OK_AUDITADO',
   'Auditoría 19/09/2026: 2294/2294, 0 diferencias en campos mutables.'),

  ('OBSERVACIONES','OBSERVACIONES','observaciones_migracion','SHEET_LIVE_SNAPSHOT',true,true,now(),78,78,true,
   'ID+ESTADO+MONTO+DESCARGO+EVIDENCIA','OK_AUDITADO',
   'Auditoría 19/09/2026: 78/78, 0 diferencias.'),

  ('PROGRAMACION_DESCANSOS','PROGRAMACION_DESCANSOS','dashboard_descansos_legacy_snapshot','SHEET_LIVE_SNAPSHOT',true,true,now(),705,705,true,
   'RECARGA_DIRECTA_COMPLETA','OK_AUDITADO',
   'Bridge de solo lectura recargado desde la hoja para Dashboard. Módulo funcional aún no migrado.'),

  ('RANKING','RANKING','ranking_legacy_snapshot','HISTORICO_PROTEGIDO',true,true,now(),86,86,null,
   'HISTORICO_PROTEGIDO+MOTOR_ACTIVO','HISTORICO_PROTEGIDO',
   'Julio/agosto se preservan; septiembre/futuro usan motor PostgreSQL. La hoja legacy tuvo drift de configuraciones.'),

  ('SLA','SLA_ORDENES_RESUMEN','mv_sla_resumen_actual_v323','DERIVED_POSTGRES',true,true,now(),4238,4238,null,
   'LEGACY_HISTORICO+MOTOR_ACTIVO','LIVE_VALIDAR',
   'Motor activo usa órdenes actuales; parámetros/excepciones legacy requieren control final.'),

  ('DASHBOARD','RESUMEN_DASHBOARD_RANKING','mv_dashboard_migracion','DERIVED_POSTGRES',true,true,now(),100,86,null,
   'HISTORICO_PROTEGIDO+CACHE_ACTIVA','LIVE_VALIDAR',
   'Salida final: 27 julio, 26 agosto y 33 septiembre. Detalles pesados bajo demanda.'),

  ('USUARIOS','USUARIOS','app_users','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PENDIENTE_AUDITORIA_FINAL','REQUIERE_RESYNC_FINAL',
   'Altas, bajas, cuadrillas, sedes, supervisor y estado pueden seguir cambiando en la app antigua.'),

  ('PERMISOS','PERMISOS_MODULOS','app_permissions','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PENDIENTE_AUDITORIA_FINAL','REQUIERE_RESYNC_FINAL',
   'Permisos continúan administrándose en producción.'),

  ('CONFIG_MODULOS','CONFIG_MODULOS','module_config','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PENDIENTE_AUDITORIA_FINAL','REQUIERE_RESYNC_FINAL',
   'Configuración funcional debe resincronizarse justo antes del cutover.'),

  ('CATALOGO_ORDENES','CATALOGO_ORDENES','catalogo_partidas_migracion','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PENDIENTE_AUDITORIA_FINAL','REQUIERE_RESYNC_FINAL',
   'Cambios de partida/puntaje/tarifa impactan Producción, Dashboard y Ranking.'),

  ('CONFIGURACION_RANKING','CONFIGURACION_RANKING','ranking_configuracion_productiva_snapshot','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PENDIENTE_AUDITORIA_FINAL','REQUIERE_RESYNC_FINAL',
   'No sobrescribir automáticamente la configuración del motor; comparar y auditar cualquier cambio productivo.'),

  ('PARAMETROS_SLA','PARAMETROS_SLA_WIN','sla_parametros_legacy_snapshot','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PENDIENTE_AUDITORIA_FINAL','REQUIERE_RESYNC_FINAL',
   'Parámetros pueden cambiar SLA. Requiere delta final.'),

  ('ACTIVIDAD_CAMPO','ACTIVIDAD_CAMPO',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Módulo sigue operativo en Sheets.'),

  ('CHECKLIST_ALMACEN','CHECKLIST_ALMACEN',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Módulo sigue operativo en Sheets.'),

  ('EQUIPOS_AVERIADOS','EQUIPOS_AVERIADOS',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Incluye cargos asociados.'),

  ('PEXT_CONJUNTA','TRABAJOS_CONJUNTA',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Trabajos y bonos PEXT siguen operativos.'),

  ('MATERIALES','CONSUMO_MATERIALES',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Incluye importación y catálogo de precios.'),

  ('MESA_AYUDA','CONSULTAS_RECLAMOS',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Incluye historial y catálogos.'),

  ('ANALISIS_ECONOMICO','ANALISIS_ECONOMICO','mv_economico_resumen_periodo','SHEET_LIVE_SNAPSHOT',true,true,null,null,null,null,
   'PARCIAL_MIGRADO','REQUIERE_RESYNC_FINAL','Fuentes económicas continúan cambiando en la app antigua.'),

  ('BONOS_SUPERVISORES','RESUMEN_BONO_SUPERVISORES',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Evaluaciones, satisfacción, configuración y actas siguen vivas.'),

  ('SEGURIDAD','SEGURIDAD_ATS',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','ATS/PETAR/firmas/solicitudes continúan en producción.'),

  ('FACTURAS','FACTURAS_DETALLE',null,'PENDIENTE_MIGRACION',true,true,null,null,null,null,
   'NO_MIGRADO','PENDIENTE_MIGRACION','Detalle/configuración/pendientes aún no migrados.')
on conflict(modulo) do update set
  legacy_sheet=excluded.legacy_sheet,
  postgres_target=excluded.postgres_target,
  source_mode=excluded.source_mode,
  legacy_writes_continue=excluded.legacy_writes_continue,
  requires_final_resync=excluded.requires_final_resync,
  last_audit_at=excluded.last_audit_at,
  sheet_rows=excluded.sheet_rows,
  postgres_rows=excluded.postgres_rows,
  content_match=excluded.content_match,
  audit_scope=excluded.audit_scope,
  status=excluded.status,
  notes=excluded.notes,
  updated_at=now();

create or replace view public.mv_migration_live_source_status
with (security_invoker=true) as
select
  modulo,legacy_sheet,postgres_target,source_mode,legacy_writes_continue,requires_final_resync,
  last_audit_at,sheet_rows,postgres_rows,content_match,audit_scope,status,notes,
  case
    when source_mode='PENDIENTE_MIGRACION' then 'PENDIENTE'
    when requires_final_resync and status in ('OK_AUDITADO','LIVE_VALIDAR','REQUIERE_RESYNC_FINAL') then 'RESYNC_ANTES_CUTOVER'
    when status='HISTORICO_PROTEGIDO' then 'PROTEGER'
    else 'VALIDAR'
  end as accion_cutover
from public.migration_live_source_control
order by
  case status
    when 'PENDIENTE_MIGRACION' then 1
    when 'REQUIERE_RESYNC_FINAL' then 2
    when 'LIVE_VALIDAR' then 3
    when 'OK_AUDITADO' then 4
    when 'HISTORICO_PROTEGIDO' then 5
    else 9
  end,
  modulo;

alter table public.migration_live_source_control enable row level security;
revoke all on public.migration_live_source_control from anon,authenticated;
revoke all on public.mv_migration_live_source_status from anon,authenticated;
grant select on public.migration_live_source_control to service_role;
grant select on public.mv_migration_live_source_status to service_role;
