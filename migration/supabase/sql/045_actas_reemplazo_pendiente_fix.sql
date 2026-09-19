-- 045_actas_reemplazo_pendiente_fix.sql
-- Corrige semantica NULL: un acta PENDIENTE sin observacion no puede reemplazarse.

CREATE OR REPLACE FUNCTION public.mv_actas_registrar_v344(p_usuario text, p_codigo_orden text, p_codigo_pedido text, p_numero_acta text, p_nombre_archivo text, p_link_acta text, p_drive_file_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u record;
  m record;
  por_orden public.actas_migracion%rowtype;
  por_numero public.actas_migracion%rowtype;
  anterior public.actas_migracion%rowtype;
  tiene_anterior boolean := false;
  permitir_reemplazo boolean := false;
  ahora timestamptz := now();
  fecha_g date;
  tipo_e text;
  tipo_p text;
  v_dni text;
  v_cliente text;
  v_version integer;
  v_estado_fecha text;
  v_fecha_limite timestamptz;
  v_origen_fecha text;
  v_id uuid;
  old_file_id text;
  new_legacy_id text;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id
  limit 1;
  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if upper(trim(coalesce(u.perfil,'')))<>'TECNICO' then
    raise exception 'Solo el técnico puede registrar actas';
  end if;
  if nullif(trim(coalesce(u.cuadrilla,'')),'') is null then
    raise exception 'El técnico no tiene cuadrilla asignada';
  end if;
  if public.mv_actas_key(p_codigo_orden) in ('','0') then raise exception 'Debe ingresar el código de orden'; end if;
  if public.mv_actas_key(p_codigo_pedido)='' then raise exception 'Debe ingresar el código de pedido'; end if;
  if public.mv_actas_numero_key(p_numero_acta)='' then raise exception 'Debe ingresar el número de acta'; end if;
  if nullif(trim(coalesce(p_link_acta,'')),'') is null or nullif(trim(coalesce(p_drive_file_id,'')),'') is null then
    raise exception 'El PDF debe haberse guardado en Drive antes de registrar sus metadatos';
  end if;

  select * into por_orden
  from public.actas_migracion
  where public.mv_actas_key(codigo_orden)=public.mv_actas_key(p_codigo_orden)
  for update;

  select * into por_numero
  from public.actas_migracion
  where public.mv_actas_numero_key(numero_acta)=public.mv_actas_numero_key(p_numero_acta)
  for update;

  if por_orden.id is not null and por_numero.id is not null and por_orden.id<>por_numero.id then
    raise exception 'El Código de Orden y el Número de Acta pertenecen a registros diferentes. Verifique los datos.';
  end if;

  if por_orden.id is not null then anterior:=por_orden; tiene_anterior:=true;
  elsif por_numero.id is not null then anterior:=por_numero; tiene_anterior:=true;
  end if;

  if tiene_anterior then
    if public.mv_actas_cuadrilla_key(anterior.cuadrilla)<>public.mv_actas_cuadrilla_key(u.cuadrilla) then
      raise exception 'El Código de Orden o el Número de Acta ya pertenece a otra cuadrilla.';
    end if;
    if anterior.estado='FINALIZADO' or anterior.resultado_jefatura='CORRECTO' then
      raise exception 'Esta acta ya está FINALIZADA. No se puede volver a subir.';
    end if;
    permitir_reemplazo :=
      coalesce(anterior.origen_registro='ALMACEN' and anterior.link_acta is null,false)
      or coalesce(anterior.resultado_almacen='OBSERVADO',false)
      or coalesce(anterior.resultado_jefatura='OBSERVADO',false);
    if not coalesce(permitir_reemplazo,false) then
      raise exception 'Este Código de Orden o Número de Acta ya tiene un registro pendiente. Solo puede completarse si fue registrado como faltante o reemplazarse cuando esté OBSERVADO.';
    end if;
  end if;

  select * into m
  from public.mv_actas_resolver_mapa_v344(p_codigo_orden,p_codigo_pedido,u.cuadrilla)
  limit 1;

  fecha_g := coalesce(m.fecha_gestion,case when tiene_anterior then anterior.fecha_gestion else null end);
  tipo_p := coalesce(m.tipo_partida,case when tiene_anterior then anterior.tipo_partida else null end);
  tipo_e := coalesce(
    case when m.orden_id is not null then case when upper(coalesce(m.tipo_trabajo,'')) like '%INSTALACION%' then 'INSTALACION' else 'VISITA TECNICA' end end,
    case when tiene_anterior then anterior.tipo_ejecucion else null end,
    case when upper(coalesce(u.cuadrilla,'')) like '%SGA%'
           or upper(coalesce(u.cuadrilla,'')) like '%TRASLADO%'
           or upper(coalesce(u.cuadrilla,'')) like '%VISITA TECNICA%'
         then 'VISITA TECNICA' else 'INSTALACION' end
  );
  v_dni := coalesce(nullif(trim(coalesce(m.numero_documento,'')),''),case when tiene_anterior then anterior.dni else null end);
  v_cliente := coalesce(nullif(upper(trim(coalesce(m.cliente,''))),''),case when tiene_anterior then anterior.cliente else null end);
  v_version := case when tiene_anterior then anterior.version+1 else 1 end;
  v_estado_fecha := case when fecha_g is not null then 'CONFIRMADA' else 'PENDIENTE_MAPA' end;
  v_fecha_limite := case when fecha_g is not null then null else ahora+interval '24 hours' end;
  v_origen_fecha := case
    when m.orden_id is not null then 'MAPA_OPERATIVO'
    when fecha_g is not null and tiene_anterior then coalesce(anterior.origen_fecha_carpeta,'REGISTRO_PREVIO')
    when fecha_g is not null then 'REGISTRO_PREVIO'
    else 'PENDIENTE_MAPA'
  end;

  if tiene_anterior then
    v_id:=anterior.id;
    old_file_id:=anterior.drive_file_id;
    update public.actas_migracion set
      registrado_at=ahora,
      sede=coalesce(nullif(upper(trim(u.sede)),''),anterior.sede),
      cuadrilla=u.cuadrilla,
      supervisor=coalesce(nullif(trim(u.usuario_supervisor),''),anterior.supervisor),
      tecnico=u.usuario,
      fecha_gestion=fecha_g,
      tipo_ejecucion=tipo_e,
      tipo_partida=tipo_p,
      codigo_orden=trim(p_codigo_orden),
      codigo_orden_norm=nullif(public.mv_actas_key(p_codigo_orden),''),
      codigo_pedido=trim(p_codigo_pedido),
      codigo_pedido_norm=nullif(public.mv_actas_key(p_codigo_pedido),''),
      numero_acta=trim(p_numero_acta),
      numero_acta_norm=nullif(public.mv_actas_numero_key(p_numero_acta),''),
      dni=v_dni,
      cliente=v_cliente,
      nombre_archivo=trim(p_nombre_archivo),
      link_acta=trim(p_link_acta),
      drive_file_id=trim(p_drive_file_id),
      estado='PENDIENTE',
      resultado_almacen=null,motivo_almacen=null,validado_almacen_por=null,validado_almacen_at=null,
      resultado_jefatura=null,motivo_jefatura=null,validado_jefatura_por=null,validado_jefatura_at=null,
      version=v_version,
      estado_fecha_carpeta=v_estado_fecha,
      fecha_limite_verificacion=v_fecha_limite,
      ultimo_intento_fecha=ahora,
      intentos_fecha=case when fecha_g is null then 1 else anterior.intentos_fecha end,
      fecha_carpeta=fecha_g,
      fecha_confirmada_por=case when fecha_g is not null then case when m.orden_id is not null then 'SISTEMA' else coalesce(anterior.fecha_confirmada_por,'REGISTRO_PREVIO') end else null end,
      perfil_confirmacion_fecha=case when fecha_g is not null then case when m.orden_id is not null then 'AUTOMATICO' else coalesce(anterior.perfil_confirmacion_fecha,'REGISTRO_PREVIO') end else null end,
      origen_fecha_carpeta=v_origen_fecha,
      source_kind='POSTGRESQL',
      updated_at=ahora
    where id=v_id;
  else
    new_legacy_id:='ACTA-'||trim(p_codigo_orden)||'-'||trim(p_numero_acta);
    insert into public.actas_migracion(
      legacy_id,registrado_at,sede,cuadrilla,supervisor,tecnico,fecha_gestion,tipo_ejecucion,tipo_partida,
      codigo_orden,codigo_orden_norm,codigo_pedido,codigo_pedido_norm,numero_acta,numero_acta_norm,dni,cliente,
      nombre_archivo,drive_file_id,link_acta,estado,version,estado_entrega_fisica,origen_registro,
      estado_fecha_carpeta,fecha_limite_verificacion,ultimo_intento_fecha,intentos_fecha,fecha_carpeta,
      fecha_confirmada_por,perfil_confirmacion_fecha,origen_fecha_carpeta,source_kind,updated_at
    ) values(
      new_legacy_id,ahora,upper(trim(u.sede)),u.cuadrilla,u.usuario_supervisor,u.usuario,fecha_g,tipo_e,tipo_p,
      trim(p_codigo_orden),nullif(public.mv_actas_key(p_codigo_orden),''),
      trim(p_codigo_pedido),nullif(public.mv_actas_key(p_codigo_pedido),''),
      trim(p_numero_acta),nullif(public.mv_actas_numero_key(p_numero_acta),''),
      v_dni,v_cliente,trim(p_nombre_archivo),trim(p_drive_file_id),trim(p_link_acta),'PENDIENTE',1,'PENDIENTE','TECNICO',
      v_estado_fecha,v_fecha_limite,ahora,case when fecha_g is null then 1 else 0 end,fecha_g,
      case when fecha_g is not null and m.orden_id is not null then 'SISTEMA' else null end,
      case when fecha_g is not null and m.orden_id is not null then 'AUTOMATICO' else null end,
      v_origen_fecha,'POSTGRESQL',ahora
    ) returning id into v_id;
  end if;

  insert into public.actas_eventos_migracion(acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen)
  values(
    v_id,case when tiene_anterior then 'REEMPLAZAR_PDF' else 'REGISTRAR' end,u.usuario,u.perfil,
    case when tiene_anterior then jsonb_build_object('estado',anterior.estado,'version',anterior.version,'driveFileId',anterior.drive_file_id,'resultadoAlmacen',anterior.resultado_almacen,'resultadoJefatura',anterior.resultado_jefatura) else null end,
    jsonb_build_object('estado','PENDIENTE','version',v_version,'driveFileId',p_drive_file_id,'estadoFechaCarpeta',v_estado_fecha),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','ACTAS','accion',case when tiene_anterior then 'REEMPLAZAR' else 'REGISTRAR' end,
    'id',v_id,'legacyId',coalesce(anterior.legacy_id,new_legacy_id),'estado','PENDIENTE','version',v_version,
    'fechaGestion',fecha_g,'estadoFechaCarpeta',v_estado_fecha,'oldDriveFileId',old_file_id
  );
exception
  when unique_violation then
    raise exception 'El Código de Orden, Número de Acta o archivo Drive ya está registrado.';
end;
$function$
;

revoke execute on function public.mv_actas_registrar_v344(text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.mv_actas_registrar_v344(text,text,text,text,text,text,text) to service_role;
