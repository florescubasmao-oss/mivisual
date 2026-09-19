
-- 062_programacion_descansos_helper_alias_fix.sql
-- Renombra variables internas para evitar ambigüedad con columnas SQL.

create or replace function public.mv_descansos_aplicar_solicitud_tecnico(
  p_solicitud_id text,
  p_usuario_jefatura text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  item public.programacion_descansos_migracion%rowtype;
  u record;
  entidad jsonb;
  v_cuadrilla text;
  fecha_anterior date;
  fecha_nueva date;
  estado_nueva_fecha text;
  v_sede text;
  v_plataforma text;
  otra text;
  cambios jsonb;
  cobertura jsonb;
  cobertura_dia jsonb;
  ahora timestamptz:=clock_timestamp();
  supervisor_validado boolean;
  resultado_supervisor text;
  supervisor_por text;
  supervisor_fecha timestamptz;
  origen text;
  version_n integer;
  id_salida text;
  id_nueva text;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario_jefatura))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;
  if not found or not public.mv_descansos_es_jefatura(u.perfil) then
    raise exception 'Solo Jefatura puede aplicar la solicitud';
  end if;

  select * into item
  from public.programacion_descansos_migracion
  where id=p_solicitud_id
  for update;
  if not found then raise exception 'No se encontró la solicitud de descanso'; end if;
  if upper(trim(coalesce(item.tipo_registro,'')))<>'SOLICITUD_TECNICO' then
    raise exception 'El registro no es una solicitud de técnico';
  end if;

  v_cuadrilla:=public.mv_descansos_cuadrilla_norm(item.cuadrilla);
  fecha_anterior:=item.fecha;
  if coalesce(item.solicitud_cambio,'') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'La solicitud no contiene fechas válidas';
  end if;
  fecha_nueva:=item.solicitud_cambio::date;

  if fecha_anterior=fecha_nueva then raise exception 'La nueva fecha debe ser diferente al descanso actual'; end if;
  if fecha_nueva < (now() at time zone 'America/Lima')::date then
    raise exception 'La nueva fecha de descanso no puede estar en el pasado';
  end if;
  if public.mv_descansos_estado_aprobado(v_cuadrilla,fecha_anterior)<>'DESCANSO' then
    raise exception 'El descanso original ya no se encuentra vigente';
  end if;

  estado_nueva_fecha:=public.mv_descansos_estado_aprobado(v_cuadrilla,fecha_nueva);
  if estado_nueva_fecha='DESCANSO' then
    raise exception 'La cuadrilla ya tiene descanso aprobado en la nueva fecha';
  end if;
  if estado_nueva_fecha='VACACIONES' then
    raise exception 'La nueva fecha coincide con vacaciones de la cuadrilla';
  end if;

  entidad:=public.mv_descansos_entidad(v_cuadrilla);
  v_sede:=upper(trim(coalesce(entidad->>'sede',item.sede)));
  v_plataforma:=public.mv_descansos_plataforma(coalesce(entidad->>'plataforma',item.plataforma));

  select c.cuadrilla into otra
  from public.mv_descansos_cuadrillas_activas c
  where c.sede=v_sede
    and c.plataforma=v_plataforma
    and c.cuadrilla<>v_cuadrilla
    and public.mv_descansos_estado_aprobado(c.cuadrilla,fecha_nueva)='DESCANSO'
  limit 1;
  if otra is not null then
    raise exception 'Ya existe otra cuadrilla de la misma plataforma en descanso el %: %',to_char(fecha_nueva,'YYYY-MM-DD'),otra;
  end if;

  cambios:=jsonb_build_object(
    v_cuadrilla||'|'||to_char(fecha_anterior,'YYYY-MM-DD'),'EN CAMPO',
    v_cuadrilla||'|'||to_char(fecha_nueva,'YYYY-MM-DD'),'DESCANSO'
  );
  cobertura:=public.mv_descansos_calcular_cobertura(fecha_nueva,v_sede,v_plataforma,cambios);
  if cobertura->>'estado'='ROJO' then
    raise exception 'El cambio no cumple la cobertura mínima de la sede para la nueva fecha';
  end if;

  supervisor_validado:=
    upper(trim(coalesce(item.resultado_supervisor,'')))='APROBADO'
    or replace(upper(trim(coalesce(item.estado_validacion,''))),'_',' ')='PENDIENTE JEFATURA';
  resultado_supervisor:=case when supervisor_validado then 'APROBADO' else 'OMITIDO POR JEFATURA' end;
  supervisor_por:=case when supervisor_validado then coalesce(item.validado_supervisor_por,'') else '' end;
  supervisor_fecha:=case when supervisor_validado then item.fecha_validacion_supervisor else null end;

  origen:='DESC|'||v_cuadrilla||'|'||to_char(fecha_anterior,'YYYY-MM-DD');
  perform pg_advisory_xact_lock(hashtext(origen)::bigint);
  select count(*)+1 into version_n
  from public.programacion_descansos_migracion p
  where upper(trim(p.id_origen))=upper(trim(origen));
  cobertura_dia:=public.mv_descansos_calcular_cobertura(fecha_anterior,v_sede,v_plataforma,cambios);
  id_salida:=public.mv_descansos_generar_id(v_cuadrilla,fecha_anterior);

  insert into public.programacion_descansos_migracion(
    id,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
    estado_dia,estado_programacion,motivo_solicitud,solicitado_por,fecha_solicitud,
    resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
    resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
    cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
    fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind
  ) values (
    id_salida,to_char(fecha_anterior,'YYYY-MM'),fecha_anterior,public.mv_descansos_dia_semana(fecha_anterior),
    v_sede,v_cuadrilla,v_plataforma,coalesce(item.supervisor,entidad->>'supervisor'),
    coalesce(item.tecnicos_afectados,entidad->>'tecnicosAfectados',item.solicitado_por),
    'EN CAMPO','APROBADO',trim(p_motivo),item.solicitado_por,coalesce(item.fecha_solicitud,ahora),
    resultado_supervisor,coalesce(item.motivo_supervisor,item.comentario_supervisor),
    nullif(supervisor_por,''),supervisor_fecha,
    'APROBADO',trim(p_motivo),upper(trim(u.usuario)),ahora,
    coalesce((cobertura_dia->>'porcentaje')::numeric,0),cobertura_dia->>'estado',version_n,'APROBADO',
    item.comentario_supervisor,trim(p_motivo),ahora,upper(trim(u.usuario)),
    'CAMBIO_DESCANSO_TECNICO_SALIDA','DESCANSO','EN CAMPO',origen,'POSTGRESQL'
  );

  origen:='DESC|'||v_cuadrilla||'|'||to_char(fecha_nueva,'YYYY-MM-DD');
  perform pg_advisory_xact_lock(hashtext(origen)::bigint);
  select count(*)+1 into version_n
  from public.programacion_descansos_migracion p
  where upper(trim(p.id_origen))=upper(trim(origen));
  id_nueva:=public.mv_descansos_generar_id(v_cuadrilla,fecha_nueva);

  insert into public.programacion_descansos_migracion(
    id,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
    estado_dia,estado_programacion,motivo_solicitud,solicitado_por,fecha_solicitud,
    resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
    resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
    cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
    fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind
  ) values (
    id_nueva,to_char(fecha_nueva,'YYYY-MM'),fecha_nueva,public.mv_descansos_dia_semana(fecha_nueva),
    v_sede,v_cuadrilla,v_plataforma,coalesce(item.supervisor,entidad->>'supervisor'),
    coalesce(item.tecnicos_afectados,entidad->>'tecnicosAfectados',item.solicitado_por),
    'DESCANSO','APROBADO',trim(p_motivo),item.solicitado_por,coalesce(item.fecha_solicitud,ahora),
    resultado_supervisor,coalesce(item.motivo_supervisor,item.comentario_supervisor),
    nullif(supervisor_por,''),supervisor_fecha,
    'APROBADO',trim(p_motivo),upper(trim(u.usuario)),ahora,
    coalesce((cobertura->>'porcentaje')::numeric,0),cobertura->>'estado',version_n,'APROBADO',
    item.comentario_supervisor,trim(p_motivo),ahora,upper(trim(u.usuario)),
    'CAMBIO_DESCANSO_TECNICO_NUEVA_FECHA',estado_nueva_fecha,'DESCANSO',origen,'POSTGRESQL'
  );

  insert into public.programacion_descansos_eventos_migracion(
    movimiento_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  ) values
    (id_salida,'APLICAR_SOLICITUD_TECNICO',upper(trim(u.usuario)),upper(trim(u.perfil)),
      jsonb_build_object('estado','DESCANSO'),jsonb_build_object('estado','EN CAMPO'),'POSTGRESQL'),
    (id_nueva,'APLICAR_SOLICITUD_TECNICO',upper(trim(u.usuario)),upper(trim(u.perfil)),
      jsonb_build_object('estado',estado_nueva_fecha),jsonb_build_object('estado','DESCANSO','cobertura',cobertura),'POSTGRESQL');

  return jsonb_build_object(
    'fechaAnterior',to_char(fecha_anterior,'YYYY-MM-DD'),
    'fechaNueva',to_char(fecha_nueva,'YYYY-MM-DD'),
    'cobertura',cobertura,'idSalida',id_salida,'idNueva',id_nueva
  );
end;
$$;

revoke execute on function public.mv_descansos_aplicar_solicitud_tecnico(text,text,text) from public,anon,authenticated;
grant execute on function public.mv_descansos_aplicar_solicitud_tecnico(text,text,text) to service_role;
