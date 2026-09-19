
-- 096_seguridad_firmas_transacciones.sql
-- Firma digital versionada y solicitudes de cambio.

create or replace function public.mv_seguridad_registrar_firma(
  p_usuario text,
  p_dni text,
  p_gps text,
  p_url text,
  p_archivo_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  usuario_u text;
  dni_u text:=regexp_replace(coalesce(p_dni,''),'[^0-9]','','g');
  url_u text:=trim(coalesce(p_url,''));
  version_nueva integer;
  solicitud_id text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);
  usuario_u:=u->>'usuario';

  if dni_u !~ '^[0-9]{8,12}$' then
    raise exception 'Ingrese DNI válido';
  end if;
  if url_u='' then
    raise exception 'La firma digital no fue almacenada correctamente';
  end if;

  if exists(
    select 1
    from public.seguridad_firmas_migracion
    where usuario=usuario_u and activa
  ) then
    raise exception 'Ya existe una firma activa. Para cambiarla debe solicitar autorización';
  end if;

  select coalesce(max(version),0)+1
  into version_nueva
  from public.seguridad_firmas_migracion
  where usuario=usuario_u;

  select s.id
  into solicitud_id
  from public.seguridad_firma_solicitudes_migracion s
  where s.usuario=usuario_u
    and s.estado='APROBADO'
  order by s.resuelto_en desc nulls last,s.created_at desc
  limit 1;

  if version_nueva>1 and solicitud_id is null then
    raise exception 'No existe autorización aprobada para registrar una nueva versión de firma';
  end if;

  insert into public.seguridad_firmas_migracion(
    usuario,version,nombre,dni,perfil,sede,activa,archivo_id,url,gps_registro,
    fecha_registro,autorizacion_cambio_id,source_kind,created_at,updated_at
  ) values (
    usuario_u,version_nueva,
    coalesce(u->>'nombresApellidos',''),
    dni_u,
    u->>'perfil',
    u->>'sede',
    true,
    nullif(trim(coalesce(p_archivo_id,'')),''),
    url_u,
    nullif(trim(coalesce(p_gps,'')),''),
    now(),
    solicitud_id,
    'POSTGRESQL',
    now(),now()
  );

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    usuario_u,'REGISTRAR_FIRMA',usuario_u,u->>'perfil',
    jsonb_build_object(
      'version',version_nueva,
      'gps',coalesce(p_gps,''),
      'autorizacionCambioId',coalesce(solicitud_id,'')
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'modulo','SEGURIDAD',
    'accion','REGISTRAR_FIRMA',
    'firma',public.mv_seguridad_firma_activa_json(usuario_u)
  );
end;
$$;

create or replace function public.mv_seguridad_solicitar_cambio_firma(
  p_usuario text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  motivo_u text:=trim(coalesce(p_motivo,''));
  id_u text;
  existente text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if motivo_u='' then raise exception 'Indique el motivo del cambio de firma'; end if;

  if not exists(
    select 1 from public.seguridad_firmas_migracion
    where usuario=u->>'usuario' and activa
  ) then
    raise exception 'No existe una firma activa para solicitar cambio';
  end if;

  select id into existente
  from public.seguridad_firma_solicitudes_migracion
  where usuario=u->>'usuario' and estado='PENDIENTE'
  order by solicitado_en desc nulls last
  limit 1;

  if existente is not null then
    return jsonb_build_object(
      'ok',true,'modulo','SEGURIDAD','accion','SOLICITAR_CAMBIO_FIRMA',
      'id',existente,'estado','PENDIENTE','yaExistia',true
    );
  end if;

  id_u:='FIRREQ-'||
    to_char(clock_timestamp() at time zone 'America/Lima','YYYYMMDDHH24MISS')||
    '-'||lpad((100+floor(random()*900))::integer::text,3,'0');

  insert into public.seguridad_firma_solicitudes_migracion(
    id,usuario,nombre,sede,motivo,estado,solicitado_en,
    source_kind,created_at,updated_at
  ) values (
    id_u,u->>'usuario',coalesce(u->>'nombresApellidos',''),u->>'sede',
    motivo_u,'PENDIENTE',now(),'POSTGRESQL',now(),now()
  );

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    u->>'usuario','SOLICITAR_CAMBIO_FIRMA',u->>'usuario',u->>'perfil',
    jsonb_build_object('solicitudId',id_u,'motivo',motivo_u),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','SOLICITAR_CAMBIO_FIRMA',
    'id',id_u,'estado','PENDIENTE','yaExistia',false
  );
end;
$$;

create or replace function public.mv_seguridad_resolver_cambio_firma(
  p_usuario text,
  p_id text,
  p_resultado text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  s public.seguridad_firma_solicitudes_migracion%rowtype;
  resultado_u text:=public.mv_actividad_texto(p_resultado);
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if not public.mv_seguridad_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura/Gerencia puede resolver cambios de firma';
  end if;

  if resultado_u not in ('APROBADO','RECHAZADO') then
    raise exception 'Resultado de solicitud no válido';
  end if;

  select * into s
  from public.seguridad_firma_solicitudes_migracion
  where id=p_id
  for update;

  if not found then raise exception 'Solicitud no encontrada'; end if;
  if s.estado<>'PENDIENTE' then raise exception 'La solicitud ya fue resuelta'; end if;

  update public.seguridad_firma_solicitudes_migracion
  set estado=resultado_u,
      resuelto_por=u->>'usuario',
      resuelto_en=now(),
      updated_at=now()
  where id=p_id;

  if resultado_u='APROBADO' then
    update public.seguridad_firmas_migracion
    set activa=false,
        updated_at=now()
    where usuario=s.usuario and activa;
  end if;

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    s.usuario,'RESOLVER_CAMBIO_FIRMA',u->>'usuario',u->>'perfil',
    jsonb_build_object('solicitudId',p_id,'resultado',resultado_u),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','RESOLVER_CAMBIO_FIRMA',
    'id',p_id,'usuario',s.usuario,'estado',resultado_u
  );
end;
$$;

create or replace function public.mv_seguridad_reiniciar_firma_pruebas(
  p_usuario text,
  p_usuario_objetivo text,
  p_confirmacion text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  objetivo text:=public.mv_bono_sup_usuario_key(p_usuario_objetivo);
  n integer:=0;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if public.mv_actividad_texto(u->>'perfil') not in ('JEFATURA','JEFATURA GENERAL','ADMIN','ADMINISTRADOR') then
    raise exception 'Solo Jefatura/Admin puede reiniciar firmas de prueba';
  end if;
  if public.mv_actividad_texto(p_confirmacion)<>'REINICIAR' then
    raise exception 'Confirmación de reinicio inválida';
  end if;
  if objetivo='' then raise exception 'Usuario objetivo obligatorio'; end if;

  delete from public.seguridad_firmas_migracion
  where usuario=objetivo;
  get diagnostics n=row_count;

  delete from public.seguridad_firma_solicitudes_migracion
  where usuario=objetivo;

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    objetivo,'REINICIAR_FIRMA_PRUEBAS',u->>'usuario',u->>'perfil',
    jsonb_build_object('borradas',n),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','REINICIAR_FIRMA_PRUEBAS',
    'usuario',objetivo,'borradas',n
  );
end;
$$;

revoke execute on function public.mv_seguridad_registrar_firma(text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_solicitar_cambio_firma(text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_resolver_cambio_firma(text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_reiniciar_firma_pruebas(text,text,text) from public,anon,authenticated;

grant execute on function public.mv_seguridad_registrar_firma(text,text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_solicitar_cambio_firma(text,text) to service_role;
grant execute on function public.mv_seguridad_resolver_cambio_firma(text,text,text) to service_role;
grant execute on function public.mv_seguridad_reiniciar_firma_pruebas(text,text,text) to service_role;
