
-- 047_observaciones_transacciones.sql
-- Porta registro, descargo y cambio de estado con permisos equivalentes al Apps Script productivo.

create or replace function public.mv_observaciones_cuadrilla_norm(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(regexp_replace(trim(coalesce(v,'')),'[[:space:]]+',' ','g'),'^P[[:space:]]+([0-9]+)','P\1','i');
$$;

create or replace function public.mv_observaciones_tipo_norm(v text)
returns text
language sql
immutable
as $$
  select case
    when upper(trim(coalesce(v,''))) in ('IMPLEMENTACIÓN','IMPLEMENTACION') then 'IMPLEMENTACION'
    when upper(trim(coalesce(v,''))) in ('GESTIÓN TÉCNICA','GESTION TECNICA') then 'GESTION TECNICA'
    else upper(trim(coalesce(v,'')))
  end;
$$;

create or replace function public.mv_observaciones_id_solicitud_norm(v text)
returns text
language plpgsql
immutable
as $$
declare
  x text := upper(coalesce(v,''));
begin
  x := regexp_replace(x,'[^A-Z0-9_-]','','g');
  x := left(x,80);
  if x ~ '^OBS-[A-Z0-9_-]+$' then return x; end if;
  return null;
end;
$$;

revoke execute on function public.mv_observaciones_cuadrilla_norm(text) from public,anon,authenticated;
revoke execute on function public.mv_observaciones_tipo_norm(text) from public,anon,authenticated;
revoke execute on function public.mv_observaciones_id_solicitud_norm(text) from public,anon,authenticated;
grant execute on function public.mv_observaciones_cuadrilla_norm(text) to service_role;
grant execute on function public.mv_observaciones_tipo_norm(text) to service_role;
grant execute on function public.mv_observaciones_id_solicitud_norm(text) to service_role;

create or replace function public.mv_observaciones_registrar(
  p_usuario text,
  p_cuadrilla text,
  p_fuente text,
  p_codigo_ticket text,
  p_tipo_observacion text,
  p_descripcion text,
  p_estado text default 'DERIVADO',
  p_monto numeric default 0,
  p_id_solicitud text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  c record;
  v_fuente text := upper(trim(coalesce(p_fuente,'')));
  v_tipo text := public.mv_observaciones_tipo_norm(p_tipo_observacion);
  v_estado text := upper(trim(coalesce(p_estado,'DERIVADO')));
  v_cuadrilla text := public.mv_observaciones_cuadrilla_norm(p_cuadrilla);
  v_id_solicitud text := public.mv_observaciones_id_solicitud_norm(p_id_solicitud);
  v_legacy_id text;
  v_id uuid;
  v_ahora timestamptz := now();
  existente record;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id
  limit 1;

  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if upper(trim(coalesce(u.perfil,''))) not in ('SUPERVISOR','JEFATURA','ADMIN','ADMINISTRADOR') then
    raise exception 'Solo Supervisor o Jefatura pueden registrar observaciones';
  end if;

  if nullif(v_cuadrilla,'') is null then raise exception 'Debe seleccionar una cuadrilla'; end if;

  select
    public.mv_observaciones_cuadrilla_norm(x.cuadrilla) as cuadrilla,
    upper(trim(x.sede)) as sede,
    upper(trim(coalesce(x.plataforma,''))) as plataforma,
    nullif(upper(trim(coalesce(x.usuario_supervisor,''))),'') as supervisor
  into c
  from public.app_users x
  where public.mv_observaciones_cuadrilla_norm(x.cuadrilla)=v_cuadrilla
    and upper(trim(coalesce(x.estado,'ACTIVO')))='ACTIVO'
    and upper(trim(coalesce(x.perfil,'')))='TECNICO'
  order by x.id
  limit 1;

  if not found then raise exception 'La cuadrilla seleccionada no existe o no está activa'; end if;

  if upper(trim(coalesce(u.perfil,'')))='SUPERVISOR'
     and upper(trim(coalesce(u.sede,'')))<>c.sede then
    raise exception 'Supervisor solo puede registrar observaciones de su sede';
  end if;

  if v_fuente not in ('WIN','VISUAL') then raise exception 'Fuente no válida. Usa WIN o VISUAL'; end if;
  if v_tipo not in ('SEGURIDAD','IMPLEMENTACION','GESTION TECNICA') then raise exception 'Tipo de observación no válido'; end if;
  if v_estado not in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO','SUBSANADO','ANULADO') then
    raise exception 'Estado no válido';
  end if;
  if coalesce(p_monto,0)<0 then raise exception 'El monto no puede ser negativo'; end if;

  if v_id_solicitud is not null then
    select * into existente
    from public.observaciones_migracion
    where legacy_id=v_id_solicitud
    for update;

    if found then
      if upper(trim(existente.registrado_por))<>upper(trim(u.usuario)) then
        raise exception 'El identificador de la solicitud ya está en uso';
      end if;
      return jsonb_build_object(
        'ok',true,'modulo','OBSERVACIONES','accion','REGISTRAR',
        'id',existente.id,'legacyId',existente.legacy_id,'yaExistia',true
      );
    end if;
  end if;

  v_legacy_id := coalesce(
    v_id_solicitud,
    'OBS-'||to_char(v_ahora at time zone 'America/Lima','YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
  );

  insert into public.observaciones_migracion(
    legacy_id,fecha_registro,periodo,registrado_por,perfil_registro,sede,plataforma,supervisor,
    cuadrilla,fuente,codigo_ticket,tipo_observacion,descripcion,estado,monto,plazo,source_kind,updated_at
  ) values (
    v_legacy_id,
    v_ahora,
    to_char(v_ahora at time zone 'America/Lima','YYYY-MM'),
    upper(trim(u.usuario)),
    upper(trim(u.perfil)),
    c.sede,
    nullif(c.plataforma,''),
    c.supervisor,
    c.cuadrilla,
    v_fuente,
    nullif(trim(coalesce(p_codigo_ticket,'')),''),
    v_tipo,
    nullif(trim(coalesce(p_descripcion,'')),''),
    v_estado,
    coalesce(p_monto,0),
    v_ahora+interval '24 hours',
    'POSTGRESQL',
    v_ahora
  ) returning id into v_id;

  insert into public.observaciones_eventos_migracion(
    observacion_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  ) values (
    v_id,'REGISTRAR',upper(trim(u.usuario)),upper(trim(u.perfil)),null,
    jsonb_build_object(
      'estado',v_estado,'monto',coalesce(p_monto,0),'fuente',v_fuente,'tipoObservacion',v_tipo,
      'cuadrilla',c.cuadrilla,'sede',c.sede,'codigoTicket',nullif(trim(coalesce(p_codigo_ticket,'')),'')
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','OBSERVACIONES','accion','REGISTRAR',
    'id',v_id,'legacyId',v_legacy_id,'yaExistia',false,'estado',v_estado,
    'periodo',to_char(v_ahora at time zone 'America/Lima','YYYY-MM')
  );
exception
  when unique_violation then
    raise exception 'El identificador de la solicitud ya está en uso';
end;
$$;

create or replace function public.mv_observaciones_registrar_descargo(
  p_usuario text,
  p_observacion_id uuid,
  p_descargo text,
  p_evidencias jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  o public.observaciones_migracion%rowtype;
  n integer;
  i integer;
  item jsonb;
  v_url text;
  v_drive text;
  links jsonb := '[]'::jsonb;
  old jsonb;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id
  limit 1;

  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if upper(trim(coalesce(u.perfil,'')))<>'TECNICO' then
    raise exception 'Solo el técnico puede registrar descargo';
  end if;

  select * into o
  from public.observaciones_migracion
  where id=p_observacion_id
  for update;

  if not found then raise exception 'No se encontró la observación'; end if;

  if public.mv_observaciones_cuadrilla_norm(u.cuadrilla)<>public.mv_observaciones_cuadrilla_norm(o.cuadrilla) then
    raise exception 'El técnico solo puede descargar observaciones de su cuadrilla';
  end if;

  if p_evidencias is null then p_evidencias:='[]'::jsonb; end if;
  if jsonb_typeof(p_evidencias)<>'array' then raise exception 'Las evidencias deben enviarse como una lista'; end if;

  n:=jsonb_array_length(p_evidencias);
  if n>5 then raise exception 'Solo se permite subir máximo 5 fotos'; end if;

  old:=jsonb_build_object(
    'fechaDescargo',o.fecha_descargo,
    'descargoTecnico',o.descargo_tecnico,
    'cantidadEvidencias',(select count(*) from public.observaciones_evidencias_migracion e where e.observacion_id=o.id)
  );

  update public.observaciones_migracion
  set fecha_descargo=now(),
      descargo_tecnico=coalesce(p_descargo,''),
      source_kind='POSTGRESQL',
      updated_at=now()
  where id=o.id;

  if n>0 then
    delete from public.observaciones_evidencias_migracion where observacion_id=o.id;

    for i in 0..n-1 loop
      item:=p_evidencias->i;
      v_url:=nullif(trim(coalesce(item->>'url','')),'');
      v_drive:=nullif(trim(coalesce(item->>'driveFileId','')),'');
      if v_url is null then raise exception 'Cada evidencia debe tener URL'; end if;

      insert into public.observaciones_evidencias_migracion(
        observacion_id,orden,url,drive_file_id,origen
      ) values (
        o.id,i+1,v_url,coalesce(v_drive,substring(v_url from '/d/([^/]+)')),'TECNICO'
      );
    end loop;
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('orden',e.orden,'url',e.url,'driveFileId',e.drive_file_id) order by e.orden),
    '[]'::jsonb
  ) into links
  from public.observaciones_evidencias_migracion e
  where e.observacion_id=o.id;

  insert into public.observaciones_eventos_migracion(
    observacion_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  ) values (
    o.id,'DESCARGO',upper(trim(u.usuario)),upper(trim(u.perfil)),old,
    jsonb_build_object(
      'fechaDescargo',now(),'descargoTecnico',coalesce(p_descargo,''),
      'cantidadEvidencias',jsonb_array_length(links)
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','OBSERVACIONES','accion','DESCARGO',
    'id',o.id,'legacyId',o.legacy_id,'evidencias',links
  );
end;
$$;

create or replace function public.mv_observaciones_actualizar_estado(
  p_usuario text,
  p_observacion_id uuid,
  p_estado text,
  p_monto numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  o public.observaciones_migracion%rowtype;
  v_estado text := upper(trim(coalesce(p_estado,'')));
  puede boolean := false;
  v_monto numeric;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id
  limit 1;

  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if v_estado not in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO','SUBSANADO','ANULADO') then
    raise exception 'Estado no válido';
  end if;

  select * into o
  from public.observaciones_migracion
  where id=p_observacion_id
  for update;

  if not found then raise exception 'No se encontró la observación'; end if;

  if upper(trim(coalesce(u.perfil,''))) in ('JEFATURA','ADMIN','ADMINISTRADOR') then
    puede:=true;
  elsif upper(trim(coalesce(u.perfil,'')))='SUPERVISOR'
    and upper(trim(o.perfil_registro))='SUPERVISOR'
    and upper(trim(o.registrado_por))=upper(trim(u.usuario))
    and upper(trim(o.sede))=upper(trim(u.sede)) then
    puede:=true;
  end if;

  if not puede then raise exception 'No tienes permiso para cambiar el estado de esta observación'; end if;

  v_monto:=case when p_monto is null then o.monto else p_monto end;
  if v_monto<0 then raise exception 'El monto no puede ser negativo'; end if;

  update public.observaciones_migracion
  set estado=v_estado,
      monto=v_monto,
      fecha_revision=now(),
      source_kind='POSTGRESQL',
      updated_at=now()
  where id=o.id;

  insert into public.observaciones_eventos_migracion(
    observacion_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  ) values (
    o.id,'CAMBIAR_ESTADO',upper(trim(u.usuario)),upper(trim(u.perfil)),
    jsonb_build_object('estado',o.estado,'monto',o.monto,'fechaRevision',o.fecha_revision),
    jsonb_build_object(
      'estado',v_estado,'monto',v_monto,'fechaRevision',now(),
      'factorAfectacion',public.mv_observaciones_factor_estado(v_estado),
      'montoAfectado',round(v_monto*public.mv_observaciones_factor_estado(v_estado),2)
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','OBSERVACIONES','accion','CAMBIAR_ESTADO',
    'id',o.id,'legacyId',o.legacy_id,'estado',v_estado,'monto',v_monto,
    'montoAfectado',round(v_monto*public.mv_observaciones_factor_estado(v_estado),2)
  );
end;
$$;

revoke execute on function public.mv_observaciones_registrar(text,text,text,text,text,text,text,numeric,text) from public,anon,authenticated;
revoke execute on function public.mv_observaciones_registrar_descargo(text,uuid,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_observaciones_actualizar_estado(text,uuid,text,numeric) from public,anon,authenticated;

grant execute on function public.mv_observaciones_registrar(text,text,text,text,text,text,text,numeric,text) to service_role;
grant execute on function public.mv_observaciones_registrar_descargo(text,uuid,text,jsonb) to service_role;
grant execute on function public.mv_observaciones_actualizar_estado(text,uuid,text,numeric) to service_role;
