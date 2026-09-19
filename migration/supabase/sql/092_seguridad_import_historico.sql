
-- 092_seguridad_import_historico.sql
-- Tipificación inicial desde snapshots de las cuatro hojas productivas.

insert into public.seguridad_ats_migracion(
  id,source_row,numero,fecha,hora_inicio,hora_final,sede,plataforma,cuadrilla,
  t1_usuario,t1_nombre,t2_usuario,t2_nombre,supervisor_usuario,supervisor_nombre,
  gps,trabajo,lugar_trabajo,epp_json,herramientas_json,tareas_json,estado,petar_id,
  aceptaciones_json,supervisor_firma_json,validador_firma_json,observacion,version,
  pdf_url,pdf_id,creado_por,creado_en,actualizado_en,source_kind,updated_at
)
select
  s.row_json->>0,
  s.source_row,
  nullif(s.row_json->>1,'')::integer,
  public.mv_checklist_fecha_sheet(s.row_json->2),
  public.mv_seguridad_time(s.row_json->3),
  public.mv_seguridad_time(s.row_json->4),
  public.mv_actividad_texto(s.row_json->>5),
  nullif(s.row_json->>6,''),
  public.mv_actividad_cuadrilla_norm(s.row_json->>7),
  nullif(s.row_json->>8,''),
  nullif(s.row_json->>9,''),
  nullif(s.row_json->>10,''),
  nullif(s.row_json->>11,''),
  nullif(s.row_json->>12,''),
  nullif(s.row_json->>13,''),
  nullif(s.row_json->>14,''),
  nullif(s.row_json->>15,''),
  nullif(s.row_json->>16,''),
  public.mv_seguridad_json_array(s.row_json->17),
  public.mv_seguridad_json_array(s.row_json->18),
  public.mv_seguridad_json_array(s.row_json->19),
  public.mv_actividad_texto(coalesce(nullif(s.row_json->>20,''),'BORRADOR')),
  nullif(s.row_json->>21,''),
  public.mv_seguridad_json_array(s.row_json->22),
  public.mv_seguridad_json_object_or_null(s.row_json->23),
  public.mv_seguridad_json_object_or_null(s.row_json->24),
  nullif(s.row_json->>25,''),
  coalesce(nullif(s.row_json->>26,'')::integer,1),
  nullif(s.row_json->>27,''),
  nullif(s.row_json->>28,''),
  nullif(s.row_json->>29,''),
  public.mv_seguridad_timestamp(s.row_json->30),
  public.mv_seguridad_timestamp(s.row_json->31),
  'SHEET',
  now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_ATS'
  and coalesce(s.row_json->>0,'')<>''
on conflict(id) do update set
  source_row=excluded.source_row,
  numero=excluded.numero,
  fecha=excluded.fecha,
  hora_inicio=excluded.hora_inicio,
  hora_final=excluded.hora_final,
  sede=excluded.sede,
  plataforma=excluded.plataforma,
  cuadrilla=excluded.cuadrilla,
  t1_usuario=excluded.t1_usuario,
  t1_nombre=excluded.t1_nombre,
  t2_usuario=excluded.t2_usuario,
  t2_nombre=excluded.t2_nombre,
  supervisor_usuario=excluded.supervisor_usuario,
  supervisor_nombre=excluded.supervisor_nombre,
  gps=excluded.gps,
  trabajo=excluded.trabajo,
  lugar_trabajo=excluded.lugar_trabajo,
  epp_json=excluded.epp_json,
  herramientas_json=excluded.herramientas_json,
  tareas_json=excluded.tareas_json,
  estado=excluded.estado,
  petar_id=excluded.petar_id,
  aceptaciones_json=excluded.aceptaciones_json,
  supervisor_firma_json=excluded.supervisor_firma_json,
  validador_firma_json=excluded.validador_firma_json,
  observacion=excluded.observacion,
  version=excluded.version,
  pdf_url=excluded.pdf_url,
  pdf_id=excluded.pdf_id,
  creado_por=excluded.creado_por,
  creado_en=excluded.creado_en,
  actualizado_en=excluded.actualizado_en,
  source_kind='SHEET',
  updated_at=now();

insert into public.seguridad_petar_migracion(
  id,source_row,numero,ats_id,fecha,hora_inicio,hora_final,sede,cuadrilla,
  trabajo,ubicacion,checklist_json,epp_json,estado,no_cumple_critico,
  pdf_url,pdf_id,version,actualizado_en,source_kind,updated_at
)
select
  s.row_json->>0,
  s.source_row,
  nullif(s.row_json->>1,'')::integer,
  nullif(s.row_json->>2,''),
  public.mv_checklist_fecha_sheet(s.row_json->3),
  public.mv_seguridad_time(s.row_json->4),
  public.mv_seguridad_time(s.row_json->5),
  public.mv_actividad_texto(s.row_json->>6),
  public.mv_actividad_cuadrilla_norm(s.row_json->>7),
  nullif(s.row_json->>8,''),
  nullif(s.row_json->>9,''),
  public.mv_seguridad_json_array(s.row_json->10),
  public.mv_seguridad_json_array(s.row_json->11),
  public.mv_actividad_texto(coalesce(nullif(s.row_json->>12,''),'BORRADOR')),
  public.mv_actividad_texto(coalesce(nullif(s.row_json->>13,''),'NO')),
  nullif(s.row_json->>14,''),
  nullif(s.row_json->>15,''),
  coalesce(nullif(s.row_json->>16,'')::integer,1),
  public.mv_seguridad_timestamp(s.row_json->17),
  'SHEET',
  now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_PETAR'
  and coalesce(s.row_json->>0,'')<>''
on conflict(id) do update set
  source_row=excluded.source_row,
  numero=excluded.numero,
  ats_id=excluded.ats_id,
  fecha=excluded.fecha,
  hora_inicio=excluded.hora_inicio,
  hora_final=excluded.hora_final,
  sede=excluded.sede,
  cuadrilla=excluded.cuadrilla,
  trabajo=excluded.trabajo,
  ubicacion=excluded.ubicacion,
  checklist_json=excluded.checklist_json,
  epp_json=excluded.epp_json,
  estado=excluded.estado,
  no_cumple_critico=excluded.no_cumple_critico,
  pdf_url=excluded.pdf_url,
  pdf_id=excluded.pdf_id,
  version=excluded.version,
  actualizado_en=excluded.actualizado_en,
  source_kind='SHEET',
  updated_at=now();

insert into public.seguridad_firmas_migracion(
  usuario,version,nombre,dni,perfil,sede,activa,archivo_id,url,gps_registro,
  fecha_registro,autorizacion_cambio_id,source_row,source_kind,updated_at
)
select
  public.mv_bono_sup_usuario_key(s.row_json->>0),
  coalesce(nullif(s.row_json->>5,'')::integer,1),
  nullif(s.row_json->>1,''),
  nullif(s.row_json->>2,''),
  public.mv_actividad_texto(s.row_json->>3),
  public.mv_actividad_texto(s.row_json->>4),
  public.mv_actividad_texto(coalesce(s.row_json->>6,'SI')) in ('SI','SÍ','TRUE','1','ACTIVA','ACTIVO'),
  nullif(s.row_json->>7,''),
  nullif(s.row_json->>8,''),
  nullif(s.row_json->>9,''),
  public.mv_seguridad_timestamp(s.row_json->10),
  nullif(s.row_json->>11,''),
  s.source_row,
  'SHEET',
  now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_FIRMAS'
  and coalesce(s.row_json->>0,'')<>''
on conflict(usuario,version) do update set
  nombre=excluded.nombre,
  dni=excluded.dni,
  perfil=excluded.perfil,
  sede=excluded.sede,
  activa=excluded.activa,
  archivo_id=excluded.archivo_id,
  url=excluded.url,
  gps_registro=excluded.gps_registro,
  fecha_registro=excluded.fecha_registro,
  autorizacion_cambio_id=excluded.autorizacion_cambio_id,
  source_row=excluded.source_row,
  source_kind='SHEET',
  updated_at=now();

insert into public.seguridad_firma_solicitudes_migracion(
  id,usuario,nombre,sede,motivo,estado,solicitado_en,resuelto_por,resuelto_en,
  source_row,source_kind,updated_at
)
select
  s.row_json->>0,
  public.mv_bono_sup_usuario_key(s.row_json->>1),
  nullif(s.row_json->>2,''),
  public.mv_actividad_texto(s.row_json->>3),
  nullif(s.row_json->>4,''),
  public.mv_actividad_texto(coalesce(nullif(s.row_json->>5,''),'PENDIENTE')),
  public.mv_seguridad_timestamp(s.row_json->6),
  nullif(s.row_json->>7,''),
  public.mv_seguridad_timestamp(s.row_json->8),
  s.source_row,
  'SHEET',
  now()
from public.seguridad_legacy_snapshot s
where s.sheet_name='SEGURIDAD_FIRMA_SOLICITUDES'
  and coalesce(s.row_json->>0,'')<>''
on conflict(id) do update set
  usuario=excluded.usuario,
  nombre=excluded.nombre,
  sede=excluded.sede,
  motivo=excluded.motivo,
  estado=excluded.estado,
  solicitado_en=excluded.solicitado_en,
  resuelto_por=excluded.resuelto_por,
  resuelto_en=excluded.resuelto_en,
  source_row=excluded.source_row,
  source_kind='SHEET',
  updated_at=now();

insert into public.seguridad_eventos_migracion(
  ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
)
select
  a.id,a.petar_id,'IMPORTACION_LEGACY',a.creado_por,null,
  jsonb_build_object(
    'sourceRow',a.source_row,
    'numero',a.numero,
    'estado',a.estado,
    'sede',a.sede,
    'cuadrilla',a.cuadrilla
  ),
  'SHEET'
from public.seguridad_ats_migracion a
where not exists(
  select 1 from public.seguridad_eventos_migracion e
  where e.ats_id=a.id and e.evento='IMPORTACION_LEGACY' and e.source_kind='SHEET'
);

select
  (select count(*) from public.seguridad_ats_migracion) ats,
  (select count(*) from public.seguridad_petar_migracion) petar,
  (select count(*) from public.seguridad_firmas_migracion) firmas,
  (select count(*) from public.seguridad_firma_solicitudes_migracion) solicitudes,
  (select count(*) from public.seguridad_eventos_migracion where source_kind='SHEET') eventos;
