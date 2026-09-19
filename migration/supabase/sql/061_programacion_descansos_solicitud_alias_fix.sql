-- 061_programacion_descansos_solicitud_alias_fix.sql
-- Evita ambigüedad PL/pgSQL entre variable cuadrilla y columna cuadrilla.

CREATE OR REPLACE FUNCTION public.mv_descansos_solicitar_cambio(p_usuario text, p_fecha_descanso_actual date, p_nueva_fecha date, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u record;
  entidad jsonb;
  cuadrilla text;
  ahora timestamptz:=clock_timestamp();
  mov_id text;
  origen text;
  pendiente boolean;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;

  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if upper(trim(coalesce(u.perfil,'')))<>'TECNICO' then
    raise exception 'Solo el técnico puede solicitar cambio de descanso';
  end if;
  if p_fecha_descanso_actual is null or p_nueva_fecha is null or nullif(trim(coalesce(p_motivo,'')),'') is null then
    raise exception 'Complete las fechas y el motivo';
  end if;
  if p_fecha_descanso_actual=p_nueva_fecha then
    raise exception 'La nueva fecha debe ser diferente al descanso actual';
  end if;
  if p_nueva_fecha < (now() at time zone 'America/Lima')::date then
    raise exception 'La nueva fecha no puede estar en el pasado';
  end if;

  cuadrilla:=public.mv_descansos_cuadrilla_norm(u.cuadrilla);
  if public.mv_descansos_estado_aprobado(cuadrilla,p_fecha_descanso_actual)<>'DESCANSO' then
    raise exception 'La fecha seleccionada no es un descanso aprobado';
  end if;

  select exists(
    select 1
    from public.programacion_descansos_migracion p
    where public.mv_descansos_cuadrilla_norm(p.cuadrilla)=public.mv_descansos_cuadrilla_norm(u.cuadrilla)
      and upper(trim(coalesce(p.tipo_registro,'')))='SOLICITUD_TECNICO'
      and replace(upper(trim(coalesce(nullif(p.estado_validacion,''),p.estado_programacion,''))),'_',' ')
        in ('PENDIENTE SUPERVISOR','PENDIENTE JEFATURA','OBSERVADO')
  ) into pendiente;
  if pendiente then
    raise exception 'Ya existe una solicitud de cambio pendiente para esta cuadrilla';
  end if;

  entidad:=public.mv_descansos_entidad(cuadrilla);
  origen:='DESC|'||cuadrilla||'|'||to_char(p_fecha_descanso_actual,'YYYY-MM-DD');
  perform pg_advisory_xact_lock(hashtext(origen)::bigint);
  mov_id:=public.mv_descansos_generar_id(cuadrilla,p_fecha_descanso_actual);

  insert into public.programacion_descansos_migracion(
    id,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
    estado_dia,estado_programacion,solicitud_cambio,motivo_solicitud,solicitado_por,fecha_solicitud,
    cobertura_sede,estado_cobertura,version,estado_validacion,tipo_registro,estado_anterior,estado_nuevo,id_origen,
    source_kind,created_at,updated_at
  ) values (
    mov_id,to_char(p_fecha_descanso_actual,'YYYY-MM'),p_fecha_descanso_actual,
    public.mv_descansos_dia_semana(p_fecha_descanso_actual),upper(trim(entidad->>'sede')),cuadrilla,
    public.mv_descansos_plataforma(entidad->>'plataforma'),nullif(entidad->>'supervisor',''),
    upper(trim(u.usuario)),
    'DESCANSO','PENDIENTE SUPERVISOR',to_char(p_nueva_fecha,'YYYY-MM-DD'),trim(p_motivo),upper(trim(u.usuario)),ahora,
    0,null,1,'PENDIENTE_SUPERVISOR','SOLICITUD_TECNICO','DESCANSO','DESCANSO',origen,
    'POSTGRESQL',ahora,ahora
  );

  insert into public.programacion_descansos_eventos_migracion(
    movimiento_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  ) values (
    mov_id,'SOLICITAR_CAMBIO',upper(trim(u.usuario)),upper(trim(u.perfil)),
    jsonb_build_object('fechaDescanso',to_char(p_fecha_descanso_actual,'YYYY-MM-DD')),
    jsonb_build_object('nuevaFecha',to_char(p_nueva_fecha,'YYYY-MM-DD'),'estado','PENDIENTE SUPERVISOR'),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','SOLICITAR_CAMBIO',
    'id',mov_id,'estado','PENDIENTE SUPERVISOR'
  );
end;
$function$
;

revoke execute on function public.mv_descansos_solicitar_cambio(text,date,date,text) from public,anon,authenticated;
grant execute on function public.mv_descansos_solicitar_cambio(text,date,date,text) to service_role;
