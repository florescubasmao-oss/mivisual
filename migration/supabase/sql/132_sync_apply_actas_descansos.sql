-- 132_sync_apply_actas_descansos.sql
-- Aplicadores transaccionales e idempotentes para ACTAS y PROGRAMACION_DESCANSOS.
-- Consumen runs VALIDATED del staging general y no borran filas.

create or replace function public.mv_sync_apply_actas(
  p_run_id uuid,
  p_actor text,
  p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_run public.migration_sync_runs%rowtype;
  v_applied integer:=0;
  v_total integer:=0;
  v_conflicts integer:=0;
  v_invalid integer:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_ACTAS_STAGING' then
    raise exception 'Confirmación de aplicación inválida';
  end if;

  select * into v_run
  from public.migration_sync_runs
  where id=p_run_id
  for update;

  if not found then raise exception 'Run de sincronización no existe'; end if;
  if v_run.modulo<>'ACTAS' then raise exception 'Run pertenece a otro módulo: %',v_run.modulo; end if;
  if v_run.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED. Estado actual: %',v_run.status; end if;
  if v_run.source_rows<>v_run.staged_rows or v_run.staged_rows<=0 then
    raise exception 'Conteo staging inválido: fuente %, staging %',v_run.source_rows,v_run.staged_rows;
  end if;

  select count(*) into v_invalid
  from public.migration_sync_staging s
  where s.run_id=p_run_id
    and (
      nullif(trim(coalesce(s.row_data->>'id','')),'') is null
      or nullif(trim(coalesce(s.row_data->>'sede','')),'') is null
      or nullif(trim(coalesce(s.row_data->>'cuadrilla','')),'') is null
    );
  if v_invalid>0 then raise exception 'ACTAS contiene % fila(s) sin ID/Sede/Cuadrilla',v_invalid; end if;

  select count(*) into v_conflicts
  from public.migration_sync_staging s
  join public.actas_migracion a
    on a.legacy_id=trim(s.row_data->>'id')
  where s.run_id=p_run_id
    and upper(trim(coalesce(a.source_kind,''))) not in ('LEGACY_SNAPSHOT','LEGACY_SYNC');
  if v_conflicts>0 then
    raise exception 'ACTAS tiene % registro(s) PostgreSQL no-legacy que requieren conciliación manual',v_conflicts;
  end if;

  insert into public.actas_migracion(
    legacy_id,registrado_at,sede,cuadrilla,supervisor,tecnico,fecha_gestion,tipo_ejecucion,tipo_partida,
    codigo_orden,codigo_orden_norm,codigo_pedido,codigo_pedido_norm,numero_acta,numero_acta_norm,dni,cliente,
    nombre_archivo,drive_file_id,link_acta,estado,resultado_almacen,motivo_almacen,validado_almacen_por,
    validado_almacen_at,resultado_jefatura,motivo_jefatura,validado_jefatura_por,validado_jefatura_at,
    version,estado_entrega_fisica,confirmado_fisico_por,perfil_confirmacion_fisica,confirmado_fisico_at,
    motivo_reversion_fisica,origen_registro,motivo_acta_faltante,registrado_faltante_por,registrado_faltante_at,
    estado_fecha_carpeta,fecha_limite_verificacion,ultimo_intento_fecha,intentos_fecha,fecha_carpeta,
    fecha_confirmada_por,perfil_confirmacion_fecha,origen_fecha_carpeta,source_kind,updated_at
  )
  select
    trim(s.row_data->>'id'),
    nullif(s.row_data->>'registrado_at','')::timestamptz,
    coalesce(nullif(upper(trim(s.row_data->>'sede')),''),'SIN SEDE'),
    trim(s.row_data->>'cuadrilla'),
    nullif(trim(s.row_data->>'supervisor'),''),
    nullif(trim(s.row_data->>'tecnico'),''),
    nullif(s.row_data->>'fecha_gestion','')::date,
    nullif(upper(trim(s.row_data->>'tipo_ejecucion')),''),
    nullif(trim(s.row_data->>'tipo_partida'),''),
    nullif(trim(s.row_data->>'codigo_orden'),''),
    nullif(regexp_replace(trim(coalesce(s.row_data->>'codigo_orden','')),'^0+$',''),''),
    nullif(trim(s.row_data->>'codigo_pedido'),''),
    nullif(trim(s.row_data->>'codigo_pedido'),''),
    nullif(trim(s.row_data->>'numero_acta'),''),
    nullif(trim(s.row_data->>'numero_acta'),''),
    nullif(trim(s.row_data->>'dni'),''),
    nullif(trim(s.row_data->>'cliente'),''),
    nullif(trim(s.row_data->>'nombre_archivo'),''),
    coalesce(
      nullif(trim(s.row_data->>'drive_file_id'),''),
      substring(nullif(trim(s.row_data->>'link_acta'),'') from '/d/([^/]+)')
    ),
    nullif(trim(s.row_data->>'link_acta'),''),
    case when upper(trim(coalesce(s.row_data->>'estado','PENDIENTE')))='FINALIZADO' then 'FINALIZADO' else 'PENDIENTE' end,
    case when upper(trim(coalesce(s.row_data->>'resultado_almacen',''))) in ('CORRECTO','OBSERVADO')
      then upper(trim(s.row_data->>'resultado_almacen')) else null end,
    nullif(trim(s.row_data->>'motivo_almacen'),''),
    nullif(trim(s.row_data->>'validado_almacen_por'),''),
    nullif(s.row_data->>'validado_almacen_at','')::timestamptz,
    case when upper(trim(coalesce(s.row_data->>'resultado_jefatura',''))) in ('CORRECTO','OBSERVADO')
      then upper(trim(s.row_data->>'resultado_jefatura')) else null end,
    nullif(trim(s.row_data->>'motivo_jefatura'),''),
    nullif(trim(s.row_data->>'validado_jefatura_por'),''),
    nullif(s.row_data->>'validado_jefatura_at','')::timestamptz,
    greatest(coalesce(nullif(s.row_data->>'version','')::integer,0),0),
    case when upper(trim(coalesce(s.row_data->>'estado_entrega_fisica','PENDIENTE')))='ENTREGADA'
      then 'ENTREGADA' else 'PENDIENTE' end,
    nullif(trim(s.row_data->>'confirmado_fisico_por'),''),
    nullif(trim(s.row_data->>'perfil_confirmacion_fisica'),''),
    nullif(s.row_data->>'confirmado_fisico_at','')::timestamptz,
    nullif(trim(s.row_data->>'motivo_reversion_fisica'),''),
    coalesce(nullif(upper(trim(s.row_data->>'origen_registro')),''),'TECNICO'),
    nullif(trim(s.row_data->>'motivo_acta_faltante'),''),
    nullif(trim(s.row_data->>'registrado_faltante_por'),''),
    nullif(s.row_data->>'registrado_faltante_at','')::timestamptz,
    coalesce(
      case when upper(trim(coalesce(s.row_data->>'estado_fecha_carpeta',''))) in ('CONFIRMADA','PENDIENTE_MAPA','REQUIERE_CONFIRMACION')
        then upper(trim(s.row_data->>'estado_fecha_carpeta')) end,
      case when nullif(trim(s.row_data->>'link_acta'),'') is not null
             and nullif(s.row_data->>'fecha_gestion','') is not null then 'CONFIRMADA' end
    ),
    nullif(s.row_data->>'fecha_limite_verificacion','')::timestamptz,
    nullif(s.row_data->>'ultimo_intento_fecha','')::timestamptz,
    greatest(coalesce(nullif(s.row_data->>'intentos_fecha','')::integer,0),0),
    nullif(s.row_data->>'fecha_carpeta','')::date,
    nullif(trim(s.row_data->>'fecha_confirmada_por'),''),
    nullif(trim(s.row_data->>'perfil_confirmacion_fecha'),''),
    nullif(upper(trim(s.row_data->>'origen_fecha_carpeta')),''),
    'LEGACY_SYNC',
    now()
  from public.migration_sync_staging s
  where s.run_id=p_run_id
  on conflict(legacy_id) do update set
    registrado_at=excluded.registrado_at,
    sede=excluded.sede,
    cuadrilla=excluded.cuadrilla,
    supervisor=excluded.supervisor,
    tecnico=excluded.tecnico,
    fecha_gestion=excluded.fecha_gestion,
    tipo_ejecucion=excluded.tipo_ejecucion,
    tipo_partida=excluded.tipo_partida,
    codigo_orden=excluded.codigo_orden,
    codigo_orden_norm=excluded.codigo_orden_norm,
    codigo_pedido=excluded.codigo_pedido,
    codigo_pedido_norm=excluded.codigo_pedido_norm,
    numero_acta=excluded.numero_acta,
    numero_acta_norm=excluded.numero_acta_norm,
    dni=excluded.dni,
    cliente=excluded.cliente,
    nombre_archivo=excluded.nombre_archivo,
    drive_file_id=excluded.drive_file_id,
    link_acta=excluded.link_acta,
    estado=excluded.estado,
    resultado_almacen=excluded.resultado_almacen,
    motivo_almacen=excluded.motivo_almacen,
    validado_almacen_por=excluded.validado_almacen_por,
    validado_almacen_at=excluded.validado_almacen_at,
    resultado_jefatura=excluded.resultado_jefatura,
    motivo_jefatura=excluded.motivo_jefatura,
    validado_jefatura_por=excluded.validado_jefatura_por,
    validado_jefatura_at=excluded.validado_jefatura_at,
    version=excluded.version,
    estado_entrega_fisica=excluded.estado_entrega_fisica,
    confirmado_fisico_por=excluded.confirmado_fisico_por,
    perfil_confirmacion_fisica=excluded.perfil_confirmacion_fisica,
    confirmado_fisico_at=excluded.confirmado_fisico_at,
    motivo_reversion_fisica=excluded.motivo_reversion_fisica,
    origen_registro=excluded.origen_registro,
    motivo_acta_faltante=excluded.motivo_acta_faltante,
    registrado_faltante_por=excluded.registrado_faltante_por,
    registrado_faltante_at=excluded.registrado_faltante_at,
    estado_fecha_carpeta=excluded.estado_fecha_carpeta,
    fecha_limite_verificacion=excluded.fecha_limite_verificacion,
    ultimo_intento_fecha=excluded.ultimo_intento_fecha,
    intentos_fecha=excluded.intentos_fecha,
    fecha_carpeta=excluded.fecha_carpeta,
    fecha_confirmada_por=excluded.fecha_confirmada_por,
    perfil_confirmacion_fecha=excluded.perfil_confirmacion_fecha,
    origen_fecha_carpeta=excluded.origen_fecha_carpeta,
    source_kind='LEGACY_SYNC',
    updated_at=now();

  get diagnostics v_applied=row_count;

  update public.migration_sync_runs
  set status='APPLIED',applied_rows=v_applied,applied_at=now(),
      notes=concat_ws(' | ',notes,'Resync ACTAS aplicado por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  select count(*) into v_total from public.actas_migracion;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync completo ACTAS aplicado desde staging; PostgreSQL='||v_total||
            '. Legacy sigue activo: requiere verificación final inmediatamente antes del cutover.',
      updated_at=now()
  where modulo='ACTAS';

  return jsonb_build_object(
    'ok',true,'run_id',p_run_id,'modulo','ACTAS',
    'applied_rows',v_applied,'postgres_rows',v_total,'actor',p_actor
  );
end $$;

create or replace function public.mv_sync_apply_descansos(
  p_run_id uuid,
  p_actor text,
  p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_run public.migration_sync_runs%rowtype;
  v_applied integer:=0;
  v_total integer:=0;
  v_conflicts integer:=0;
  v_invalid integer:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_DESCANSOS_STAGING' then
    raise exception 'Confirmación de aplicación inválida';
  end if;

  select * into v_run
  from public.migration_sync_runs
  where id=p_run_id
  for update;

  if not found then raise exception 'Run de sincronización no existe'; end if;
  if v_run.modulo<>'PROGRAMACION_DESCANSOS' then raise exception 'Run pertenece a otro módulo: %',v_run.modulo; end if;
  if v_run.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED. Estado actual: %',v_run.status; end if;
  if v_run.source_rows<>v_run.staged_rows or v_run.staged_rows<=0 then
    raise exception 'Conteo staging inválido: fuente %, staging %',v_run.source_rows,v_run.staged_rows;
  end if;

  select count(*) into v_invalid
  from public.migration_sync_staging s
  where s.run_id=p_run_id
    and (
      nullif(trim(coalesce(s.row_data->>'id','')),'') is null
      or coalesce(s.row_data->>'periodo','') !~ '^20[0-9]{2}-[0-9]{2}$'
      or coalesce(s.row_data->>'fecha','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      or nullif(trim(coalesce(s.row_data->>'sede','')),'') is null
      or nullif(trim(coalesce(s.row_data->>'cuadrilla','')),'') is null
      or nullif(trim(coalesce(s.row_data->>'plataforma','')),'') is null
    );
  if v_invalid>0 then raise exception 'DESCANSOS contiene % fila(s) inválida(s)',v_invalid; end if;

  select count(*) into v_conflicts
  from public.migration_sync_staging s
  join public.programacion_descansos_migracion d
    on d.id=trim(s.row_data->>'id')
  where s.run_id=p_run_id
    and upper(trim(coalesce(d.source_kind,''))) not in ('LEGACY_SNAPSHOT','LEGACY_SYNC');
  if v_conflicts>0 then
    raise exception 'DESCANSOS tiene % registro(s) PostgreSQL no-legacy que requieren conciliación manual',v_conflicts;
  end if;

  insert into public.programacion_descansos_migracion(
    id,source_row,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
    estado_dia,estado_programacion,solicitud_cambio,motivo_solicitud,solicitado_por,fecha_solicitud,
    resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
    resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
    cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
    fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind,updated_at
  )
  select
    trim(s.row_data->>'id'),
    coalesce(nullif(s.row_data->>'source_row','')::integer,s.source_row),
    trim(s.row_data->>'periodo'),
    (s.row_data->>'fecha')::date,
    nullif(trim(s.row_data->>'dia_semana'),''),
    upper(trim(s.row_data->>'sede')),
    trim(s.row_data->>'cuadrilla'),
    public.mv_descansos_plataforma(s.row_data->>'plataforma'),
    nullif(trim(s.row_data->>'supervisor'),''),
    nullif(trim(s.row_data->>'tecnicos_afectados'),''),
    public.mv_descansos_estado_norm(s.row_data->>'estado_dia'),
    coalesce(nullif(upper(trim(s.row_data->>'estado_programacion')),''),'APROBADO'),
    nullif(trim(s.row_data->>'solicitud_cambio'),''),
    nullif(trim(s.row_data->>'motivo_solicitud'),''),
    nullif(trim(s.row_data->>'solicitado_por'),''),
    nullif(s.row_data->>'fecha_solicitud','')::timestamptz,
    nullif(upper(trim(s.row_data->>'resultado_supervisor')),''),
    nullif(trim(s.row_data->>'motivo_supervisor'),''),
    nullif(trim(s.row_data->>'validado_supervisor_por'),''),
    nullif(s.row_data->>'fecha_validacion_supervisor','')::timestamptz,
    nullif(upper(trim(s.row_data->>'resultado_jefatura')),''),
    nullif(trim(s.row_data->>'motivo_jefatura'),''),
    nullif(trim(s.row_data->>'validado_jefatura_por'),''),
    nullif(s.row_data->>'fecha_validacion_jefatura','')::timestamptz,
    coalesce(nullif(s.row_data->>'cobertura_sede','')::numeric,0),
    nullif(upper(trim(s.row_data->>'estado_cobertura')),''),
    greatest(coalesce(nullif(s.row_data->>'version','')::integer,1),1),
    nullif(upper(trim(s.row_data->>'estado_validacion')),''),
    nullif(trim(s.row_data->>'comentario_supervisor'),''),
    nullif(trim(s.row_data->>'comentario_jefatura'),''),
    nullif(s.row_data->>'fecha_validacion','')::timestamptz,
    nullif(trim(s.row_data->>'validado_por'),''),
    nullif(upper(trim(s.row_data->>'tipo_registro')),''),
    nullif(upper(trim(s.row_data->>'estado_anterior')),''),
    nullif(upper(trim(s.row_data->>'estado_nuevo')),''),
    coalesce(nullif(trim(s.row_data->>'id_origen'),''),trim(s.row_data->>'id')),
    'LEGACY_SYNC',
    now()
  from public.migration_sync_staging s
  where s.run_id=p_run_id
  on conflict(id) do update set
    source_row=excluded.source_row,
    periodo=excluded.periodo,
    fecha=excluded.fecha,
    dia_semana=excluded.dia_semana,
    sede=excluded.sede,
    cuadrilla=excluded.cuadrilla,
    plataforma=excluded.plataforma,
    supervisor=excluded.supervisor,
    tecnicos_afectados=excluded.tecnicos_afectados,
    estado_dia=excluded.estado_dia,
    estado_programacion=excluded.estado_programacion,
    solicitud_cambio=excluded.solicitud_cambio,
    motivo_solicitud=excluded.motivo_solicitud,
    solicitado_por=excluded.solicitado_por,
    fecha_solicitud=excluded.fecha_solicitud,
    resultado_supervisor=excluded.resultado_supervisor,
    motivo_supervisor=excluded.motivo_supervisor,
    validado_supervisor_por=excluded.validado_supervisor_por,
    fecha_validacion_supervisor=excluded.fecha_validacion_supervisor,
    resultado_jefatura=excluded.resultado_jefatura,
    motivo_jefatura=excluded.motivo_jefatura,
    validado_jefatura_por=excluded.validado_jefatura_por,
    fecha_validacion_jefatura=excluded.fecha_validacion_jefatura,
    cobertura_sede=excluded.cobertura_sede,
    estado_cobertura=excluded.estado_cobertura,
    version=excluded.version,
    estado_validacion=excluded.estado_validacion,
    comentario_supervisor=excluded.comentario_supervisor,
    comentario_jefatura=excluded.comentario_jefatura,
    fecha_validacion=excluded.fecha_validacion,
    validado_por=excluded.validado_por,
    tipo_registro=excluded.tipo_registro,
    estado_anterior=excluded.estado_anterior,
    estado_nuevo=excluded.estado_nuevo,
    id_origen=excluded.id_origen,
    source_kind='LEGACY_SYNC',
    updated_at=now();

  get diagnostics v_applied=row_count;

  update public.migration_sync_runs
  set status='APPLIED',applied_rows=v_applied,applied_at=now(),
      notes=concat_ws(' | ',notes,'Resync PROGRAMACION_DESCANSOS aplicado por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  select count(*) into v_total from public.programacion_descansos_migracion;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync completo PROGRAMACION_DESCANSOS aplicado desde staging; PostgreSQL='||v_total||
            '. Legacy sigue activo: requiere verificación final inmediatamente antes del cutover.',
      updated_at=now()
  where modulo='PROGRAMACION_DESCANSOS';

  return jsonb_build_object(
    'ok',true,'run_id',p_run_id,'modulo','PROGRAMACION_DESCANSOS',
    'applied_rows',v_applied,'postgres_rows',v_total,'actor',p_actor
  );
end $$;

revoke all on function public.mv_sync_apply_actas(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mv_sync_apply_descansos(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mv_sync_apply_actas(uuid,text,text) to service_role;
grant execute on function public.mv_sync_apply_descansos(uuid,text,text) to service_role;
