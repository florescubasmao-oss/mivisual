
-- 060_programacion_descansos_transacciones.sql
-- Porta operaciones productivas: programar, resolver, solicitud técnico, validaciones y consultas.

create or replace function public.mv_descansos_dia_semana(p_fecha date)
returns text
language sql
immutable
as $$
  select case extract(dow from p_fecha)::int
    when 0 then 'DOMINGO'
    when 1 then 'LUNES'
    when 2 then 'MARTES'
    when 3 then 'MIERCOLES'
    when 4 then 'JUEVES'
    when 5 then 'VIERNES'
    when 6 then 'SABADO'
  end;
$$;

create or replace function public.mv_descansos_generar_id(p_cuadrilla text,p_fecha date)
returns text
language sql
volatile
as $$
  select
    'DESC|'||public.mv_descansos_cuadrilla_norm(p_cuadrilla)||'|'||to_char(p_fecha,'YYYY-MM-DD')||'|'||
    to_char(clock_timestamp() at time zone 'America/Lima','YYYYMMDDHH24MISS')||'|'||
    lpad((floor(random()*900+100)::int)::text,3,'0');
$$;

create or replace function public.mv_descansos_entidad(p_clave text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  c text := public.mv_descansos_cuadrilla_norm(p_clave);
  r record;
begin
  if upper(c) like 'PERSONAL|%' then
    select * into r
    from public.mv_descansos_personal_activo
    where upper(cuadrilla)=upper(c)
    limit 1;
    if not found then raise exception 'No se encontró el personal en USUARIOS: %',p_clave; end if;
    return jsonb_build_object(
      'cuadrilla',r.cuadrilla,'sede',r.sede,'plataforma','PERSONAL','supervisor',r.supervisor,
      'tecnicosAfectados',r.usuario,'tipoPersonal',r.tipo_personal
    );
  end if;

  select * into r
  from public.mv_descansos_cuadrillas_activas
  where cuadrilla=c
  limit 1;
  if not found then raise exception 'No se encontró la cuadrilla activa en USUARIOS: %',p_clave; end if;

  return jsonb_build_object(
    'cuadrilla',r.cuadrilla,'sede',r.sede,'plataforma',r.plataforma,'supervisor',r.supervisor,
    'tecnicosAfectados',r.usuario,'tipoPersonal','CUADRILLA'
  );
end;
$$;

create or replace function public.mv_descansos_guardar(
  p_usuario text,
  p_registros jsonb,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  item jsonb;
  entidad jsonb;
  es_supervisor boolean;
  es_jefatura boolean;
  es_personal boolean;
  cuadrilla text;
  fecha_txt text;
  fecha date;
  nuevo text;
  anterior text;
  sede text;
  plataforma text;
  origen text;
  mov_id text;
  estado_validacion text;
  tipo_registro text;
  cobertura jsonb;
  cobertura_pct numeric;
  cobertura_estado text;
  cambios jsonb := '{}'::jsonb;
  ahora timestamptz;
  version_n integer;
  guardados integer := 0;
  alertas integer := 0;
  existe_origen boolean;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc
  limit 1;

  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;

  es_supervisor:=upper(trim(coalesce(u.perfil,'')))='SUPERVISOR';
  es_jefatura:=public.mv_descansos_es_jefatura(u.perfil);
  if not (es_supervisor or es_jefatura) then
    raise exception 'Solo Supervisor o Jefatura pueden programar descansos';
  end if;

  if p_registros is null or jsonb_typeof(p_registros)<>'array' or jsonb_array_length(p_registros)=0 then
    raise exception 'No hay cambios para guardar';
  end if;
  if nullif(trim(coalesce(p_motivo,'')),'') is null then
    raise exception 'El motivo es obligatorio';
  end if;

  -- Replica cambiosTemporales del Apps Script para calcular cobertura del lote completo.
  for item in select value from jsonb_array_elements(p_registros)
  loop
    cuadrilla:=public.mv_descansos_cuadrilla_norm(item->>'cuadrilla');
    fecha_txt:=trim(coalesce(item->>'fecha',''));
    if cuadrilla<>'' and fecha_txt ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
      cambios:=cambios || jsonb_build_object(
        cuadrilla||'|'||fecha_txt,
        public.mv_descansos_estado_norm(coalesce(item->>'estadoDia','EN CAMPO'))
      );
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_registros)
  loop
    cuadrilla:=public.mv_descansos_cuadrilla_norm(item->>'cuadrilla');
    fecha_txt:=trim(coalesce(item->>'fecha',''));
    if cuadrilla='' or fecha_txt !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
      continue;
    end if;
    fecha:=fecha_txt::date;
    nuevo:=public.mv_descansos_estado_norm(coalesce(item->>'estadoDia','EN CAMPO'));

    if nuevo not in ('EN CAMPO','EN CAMPO BOLSA','DESCANSO','VACACIONES') then
      continue;
    end if;

    entidad:=public.mv_descansos_entidad(cuadrilla);
    sede:=upper(trim(entidad->>'sede'));
    es_personal:=upper(trim(entidad->>'tipoPersonal'))<>'CUADRILLA';
    plataforma:=case when es_personal then 'PERSONAL' else public.mv_descansos_plataforma(entidad->>'plataforma') end;

    if es_supervisor and es_personal then
      raise exception 'Supervisor solo puede programar sus cuadrillas';
    end if;
    if es_supervisor and sede<>upper(trim(coalesce(u.sede,''))) then
      raise exception 'Supervisor solo puede programar su sede';
    end if;

    anterior:=public.mv_descansos_estado_aprobado(cuadrilla,fecha);
    if anterior=nuevo then continue; end if;

    if es_personal then
      cobertura:=jsonb_build_object('porcentaje',1,'estado','NO APLICA');
    else
      cobertura:=public.mv_descansos_calcular_cobertura(fecha,sede,plataforma,cambios);
      if cobertura->>'estado'='ROJO' then alertas:=alertas+1; end if;
    end if;

    cobertura_pct:=coalesce((cobertura->>'porcentaje')::numeric,0);
    cobertura_estado:=coalesce(cobertura->>'estado','');

    origen:='DESC|'||cuadrilla||'|'||to_char(fecha,'YYYY-MM-DD');
    perform pg_advisory_xact_lock(hashtext(origen)::bigint);

    select exists(
      select 1 from public.programacion_descansos_migracion
      where upper(trim(id_origen))=upper(trim(origen))
    ) into existe_origen;

    select count(*)+1 into version_n
    from public.programacion_descansos_migracion
    where upper(trim(id_origen))=upper(trim(origen));

    mov_id:=public.mv_descansos_generar_id(cuadrilla,fecha);
    ahora:=clock_timestamp();
    estado_validacion:=case when es_jefatura then 'APLICADO' else 'PENDIENTE_JEFATURA' end;
    tipo_registro:=case
      when es_jefatura then 'CAMBIO_JEFATURA'
      when existe_origen then 'CAMBIO_SUPERVISOR'
      else 'PROGRAMACION_INICIAL'
    end;

    insert into public.programacion_descansos_migracion(
      id,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
      estado_dia,estado_programacion,solicitud_cambio,motivo_solicitud,solicitado_por,fecha_solicitud,
      resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
      resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
      cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
      fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind,created_at,updated_at
    ) values (
      mov_id,to_char(fecha,'YYYY-MM'),fecha,public.mv_descansos_dia_semana(fecha),sede,cuadrilla,plataforma,
      nullif(entidad->>'supervisor',''),nullif(entidad->>'tecnicosAfectados',''),
      case when es_jefatura then nuevo else anterior end,
      case when es_jefatura then 'APROBADO' else 'PENDIENTE JEFATURA' end,
      case when es_jefatura then null else nuevo end,
      trim(p_motivo),upper(trim(u.usuario)),ahora,
      case when es_supervisor then 'ENVIADO' else null end,
      case when es_supervisor then trim(p_motivo) else null end,
      case when es_supervisor then upper(trim(u.usuario)) else null end,
      case when es_supervisor then ahora else null end,
      case when es_jefatura then 'APROBADO' else null end,
      case when es_jefatura then trim(p_motivo) else null end,
      case when es_jefatura then upper(trim(u.usuario)) else null end,
      case when es_jefatura then ahora else null end,
      cobertura_pct,cobertura_estado,version_n,estado_validacion,
      case when es_supervisor then trim(p_motivo) else null end,
      case when es_jefatura then trim(p_motivo) else null end,
      case when es_jefatura then ahora else null end,
      case when es_jefatura then upper(trim(u.usuario)) else null end,
      tipo_registro,anterior,nuevo,origen,'POSTGRESQL',ahora,ahora
    );

    insert into public.programacion_descansos_eventos_migracion(
      movimiento_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
    ) values (
      mov_id,'GUARDAR_PROGRAMACION',upper(trim(u.usuario)),upper(trim(u.perfil)),
      jsonb_build_object('estado',anterior),
      jsonb_build_object('estado',nuevo,'estadoValidacion',estado_validacion,'version',version_n,'cobertura',cobertura),
      'POSTGRESQL'
    );

    guardados:=guardados+1;
  end loop;

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','GUARDAR',
    'guardados',guardados,'alertas',alertas,
    'estado',case when es_jefatura then 'APLICADO' else 'PENDIENTE JEFATURA' end
  );
end;
$$;

create or replace function public.mv_descansos_solicitar_cambio(
  p_usuario text,
  p_fecha_descanso_actual date,
  p_nueva_fecha date,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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
    from public.programacion_descansos_migracion
    where public.mv_descansos_cuadrilla_norm(cuadrilla)=public.mv_descansos_cuadrilla_norm(u.cuadrilla)
      and upper(trim(coalesce(tipo_registro,'')))='SOLICITUD_TECNICO'
      and replace(upper(trim(coalesce(nullif(estado_validacion,''),estado_programacion,''))),'_',' ')
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
$$;

create or replace function public.mv_descansos_validar_supervisor(
  p_usuario text,
  p_id text,
  p_resultado text,
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  r public.programacion_descansos_migracion%rowtype;
  resultado text:=upper(trim(coalesce(p_resultado,'')));
  ahora timestamptz:=clock_timestamp();
  estado_nuevo_validacion text;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;

  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if upper(trim(coalesce(u.perfil,'')))<>'SUPERVISOR' then
    raise exception 'Solo Supervisor puede realizar esta validación';
  end if;
  if resultado not in ('APROBADO','RECHAZADO') then raise exception 'Resultado no válido'; end if;

  select * into r
  from public.programacion_descansos_migracion
  where id=p_id
  for update;
  if not found then raise exception 'No se encontró el registro de descanso: %',p_id; end if;

  if upper(trim(r.sede))<>upper(trim(coalesce(u.sede,''))) then
    raise exception 'Supervisor solo valida su sede';
  end if;

  estado_nuevo_validacion:=case when resultado='APROBADO' then 'PENDIENTE_JEFATURA' else 'RECHAZADO' end;

  update public.programacion_descansos_migracion
  set resultado_supervisor=resultado,
      motivo_supervisor=nullif(trim(coalesce(p_motivo,'')),''),
      validado_supervisor_por=upper(trim(u.usuario)),
      fecha_validacion_supervisor=ahora,
      estado_validacion=estado_nuevo_validacion,
      comentario_supervisor=nullif(trim(coalesce(p_motivo,'')),''),
      estado_programacion=case when resultado='APROBADO' then 'PENDIENTE JEFATURA' else 'RECHAZADO' end,
      updated_at=ahora
  where id=r.id;

  insert into public.programacion_descansos_eventos_migracion(
    movimiento_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
  ) values (
    r.id,'VALIDAR_SUPERVISOR',upper(trim(u.usuario)),upper(trim(u.perfil)),
    jsonb_build_object('estadoValidacion',r.estado_validacion,'resultadoSupervisor',r.resultado_supervisor),
    jsonb_build_object('estadoValidacion',estado_nuevo_validacion,'resultadoSupervisor',resultado),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','VALIDAR_SUPERVISOR',
    'estado',case when resultado='APROBADO' then 'PENDIENTE JEFATURA' else 'RECHAZADO' end
  );
end;
$$;

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
  cuadrilla text;
  fecha_anterior date;
  fecha_nueva date;
  estado_nueva_fecha text;
  sede text;
  plataforma text;
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

  cuadrilla:=public.mv_descansos_cuadrilla_norm(item.cuadrilla);
  fecha_anterior:=item.fecha;
  if coalesce(item.solicitud_cambio,'') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'La solicitud no contiene fechas válidas';
  end if;
  fecha_nueva:=item.solicitud_cambio::date;

  if fecha_anterior=fecha_nueva then raise exception 'La nueva fecha debe ser diferente al descanso actual'; end if;
  if fecha_nueva < (now() at time zone 'America/Lima')::date then
    raise exception 'La nueva fecha de descanso no puede estar en el pasado';
  end if;
  if public.mv_descansos_estado_aprobado(cuadrilla,fecha_anterior)<>'DESCANSO' then
    raise exception 'El descanso original ya no se encuentra vigente';
  end if;

  estado_nueva_fecha:=public.mv_descansos_estado_aprobado(cuadrilla,fecha_nueva);
  if estado_nueva_fecha='DESCANSO' then
    raise exception 'La cuadrilla ya tiene descanso aprobado en la nueva fecha';
  end if;
  if estado_nueva_fecha='VACACIONES' then
    raise exception 'La nueva fecha coincide con vacaciones de la cuadrilla';
  end if;

  entidad:=public.mv_descansos_entidad(cuadrilla);
  sede:=upper(trim(coalesce(entidad->>'sede',item.sede)));
  plataforma:=public.mv_descansos_plataforma(coalesce(entidad->>'plataforma',item.plataforma));

  select c.cuadrilla into otra
  from public.mv_descansos_cuadrillas_activas c
  where c.sede=sede
    and c.plataforma=plataforma
    and c.cuadrilla<>cuadrilla
    and public.mv_descansos_estado_aprobado(c.cuadrilla,fecha_nueva)='DESCANSO'
  limit 1;
  if otra is not null then
    raise exception 'Ya existe otra cuadrilla de la misma plataforma en descanso el %: %',to_char(fecha_nueva,'YYYY-MM-DD'),otra;
  end if;

  cambios:=jsonb_build_object(
    cuadrilla||'|'||to_char(fecha_anterior,'YYYY-MM-DD'),'EN CAMPO',
    cuadrilla||'|'||to_char(fecha_nueva,'YYYY-MM-DD'),'DESCANSO'
  );
  cobertura:=public.mv_descansos_calcular_cobertura(fecha_nueva,sede,plataforma,cambios);
  if cobertura->>'estado'='ROJO' then
    raise exception 'El cambio no cumple la cobertura mínima de la sede para la nueva fecha';
  end if;

  supervisor_validado:=
    upper(trim(coalesce(item.resultado_supervisor,'')))='APROBADO'
    or replace(upper(trim(coalesce(item.estado_validacion,''))),'_',' ')='PENDIENTE JEFATURA';
  resultado_supervisor:=case when supervisor_validado then 'APROBADO' else 'OMITIDO POR JEFATURA' end;
  supervisor_por:=case when supervisor_validado then coalesce(item.validado_supervisor_por,'') else '' end;
  supervisor_fecha:=case when supervisor_validado then item.fecha_validacion_supervisor else null end;

  -- Salida de la fecha original.
  origen:='DESC|'||cuadrilla||'|'||to_char(fecha_anterior,'YYYY-MM-DD');
  perform pg_advisory_xact_lock(hashtext(origen)::bigint);
  select count(*)+1 into version_n from public.programacion_descansos_migracion where upper(trim(id_origen))=upper(trim(origen));
  cobertura_dia:=public.mv_descansos_calcular_cobertura(fecha_anterior,sede,plataforma,cambios);
  id_salida:=public.mv_descansos_generar_id(cuadrilla,fecha_anterior);

  insert into public.programacion_descansos_migracion(
    id,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
    estado_dia,estado_programacion,motivo_solicitud,solicitado_por,fecha_solicitud,
    resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
    resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
    cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
    fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind
  ) values (
    id_salida,to_char(fecha_anterior,'YYYY-MM'),fecha_anterior,public.mv_descansos_dia_semana(fecha_anterior),
    sede,cuadrilla,plataforma,coalesce(item.supervisor,entidad->>'supervisor'),
    coalesce(item.tecnicos_afectados,entidad->>'tecnicosAfectados',item.solicitado_por),
    'EN CAMPO','APROBADO',trim(p_motivo),item.solicitado_por,coalesce(item.fecha_solicitud,ahora),
    resultado_supervisor,coalesce(item.motivo_supervisor,item.comentario_supervisor),
    nullif(supervisor_por,''),supervisor_fecha,
    'APROBADO',trim(p_motivo),upper(trim(u.usuario)),ahora,
    coalesce((cobertura_dia->>'porcentaje')::numeric,0),cobertura_dia->>'estado',version_n,'APROBADO',
    item.comentario_supervisor,trim(p_motivo),ahora,upper(trim(u.usuario)),
    'CAMBIO_DESCANSO_TECNICO_SALIDA','DESCANSO','EN CAMPO',origen,'POSTGRESQL'
  );

  -- Nueva fecha de descanso.
  origen:='DESC|'||cuadrilla||'|'||to_char(fecha_nueva,'YYYY-MM-DD');
  perform pg_advisory_xact_lock(hashtext(origen)::bigint);
  select count(*)+1 into version_n from public.programacion_descansos_migracion where upper(trim(id_origen))=upper(trim(origen));
  id_nueva:=public.mv_descansos_generar_id(cuadrilla,fecha_nueva);

  insert into public.programacion_descansos_migracion(
    id,periodo,fecha,dia_semana,sede,cuadrilla,plataforma,supervisor,tecnicos_afectados,
    estado_dia,estado_programacion,motivo_solicitud,solicitado_por,fecha_solicitud,
    resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
    resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
    cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
    fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind
  ) values (
    id_nueva,to_char(fecha_nueva,'YYYY-MM'),fecha_nueva,public.mv_descansos_dia_semana(fecha_nueva),
    sede,cuadrilla,plataforma,coalesce(item.supervisor,entidad->>'supervisor'),
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

create or replace function public.mv_descansos_resolver_jefatura(
  p_usuario text,
  p_ids jsonb,
  p_resultado text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  r record;
  ids jsonb:=coalesce(p_ids,'[]'::jsonb);
  resultado text:=upper(trim(coalesce(p_resultado,'')));
  ahora timestamptz;
  actualizados integer:=0;
  solicitudes_aplicadas integer:=0;
  aplicacion jsonb;
  es_solicitud boolean;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;
  if not found or not public.mv_descansos_es_jefatura(u.perfil) then
    raise exception 'Solo Jefatura puede resolver la programación';
  end if;
  if resultado not in ('APROBADO','OBSERVADO','RECHAZADO') then raise exception 'Resultado no válido'; end if;
  if nullif(trim(coalesce(p_motivo,'')),'') is null then
    raise exception 'Debe ingresar el comentario de Jefatura';
  end if;
  if jsonb_typeof(ids)<>'array' then raise exception 'La lista de IDs no es válida'; end if;

  for r in
    select *
    from public.programacion_descansos_migracion x
    where (
      jsonb_array_length(ids)>0
      and x.id in (select jsonb_array_elements_text(ids))
    ) or (
      jsonb_array_length(ids)=0
      and replace(upper(trim(coalesce(nullif(x.estado_validacion,''),x.estado_programacion,''))),'_',' ')
        in ('PENDIENTE JEFATURA','OBSERVADO')
    )
    order by x.seq
    for update
  loop
    ahora:=clock_timestamp();
    es_solicitud:=upper(trim(coalesce(r.tipo_registro,'')))='SOLICITUD_TECNICO';

    if resultado='APROBADO' and es_solicitud then
      aplicacion:=public.mv_descansos_aplicar_solicitud_tecnico(r.id,u.usuario,p_motivo);
      solicitudes_aplicadas:=solicitudes_aplicadas+1;
    end if;

    update public.programacion_descansos_migracion
    set resultado_jefatura=resultado,
        motivo_jefatura=trim(p_motivo),
        validado_jefatura_por=upper(trim(u.usuario)),
        fecha_validacion_jefatura=ahora,
        comentario_jefatura=trim(p_motivo),
        fecha_validacion=ahora,
        validado_por=upper(trim(u.usuario)),
        estado_dia=case
          when resultado='APROBADO' and not es_solicitud
            then public.mv_descansos_estado_norm(coalesce(nullif(r.estado_nuevo,''),nullif(r.solicitud_cambio,''),r.estado_dia))
          else r.estado_dia
        end,
        solicitud_cambio=case when resultado='APROBADO' and not es_solicitud then null else r.solicitud_cambio end,
        estado_programacion=case
          when resultado='APROBADO' then 'APROBADO'
          when resultado='OBSERVADO' then 'OBSERVADO'
          else 'RECHAZADO'
        end,
        estado_validacion=case
          when resultado='APROBADO' then 'APROBADO'
          when resultado='OBSERVADO' then 'OBSERVADO'
          else 'RECHAZADO'
        end,
        updated_at=ahora
    where id=r.id;

    insert into public.programacion_descansos_eventos_migracion(
      movimiento_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen
    ) values (
      r.id,'RESOLVER_JEFATURA',upper(trim(u.usuario)),upper(trim(u.perfil)),
      jsonb_build_object('estadoProgramacion',r.estado_programacion,'estadoValidacion',r.estado_validacion,'resultadoJefatura',r.resultado_jefatura),
      jsonb_build_object('estadoProgramacion',case when resultado='APROBADO' then 'APROBADO' when resultado='OBSERVADO' then 'OBSERVADO' else 'RECHAZADO' end,
                         'estadoValidacion',case when resultado='APROBADO' then 'APROBADO' when resultado='OBSERVADO' then 'OBSERVADO' else 'RECHAZADO' end,
                         'resultadoJefatura',resultado),
      'POSTGRESQL'
    );
    actualizados:=actualizados+1;
  end loop;

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion',resultado,
    'actualizados',actualizados,'solicitudesAplicadas',solicitudes_aplicadas
  );
end;
$$;

create or replace function public.mv_descansos_notificaciones(p_usuario text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  u record;
  perfil text;
  solicitudes jsonb;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;
  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;

  perfil:=upper(trim(coalesce(u.perfil,'')));
  if perfil<>'SUPERVISOR' and not public.mv_descansos_es_jefatura(perfil) then
    return jsonb_build_object('ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','NOTIFICACIONES','pendientes',0,'solicitudes','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(x.obj order by x.seq desc),'[]'::jsonb) into solicitudes
  from (
    select
      p.seq,
      jsonb_build_object(
        'id',p.id,'cuadrilla',p.cuadrilla,'sede',p.sede,'fecha',to_char(p.fecha,'YYYY-MM-DD'),
        'solicitudCambio',p.solicitud_cambio,
        'estado',coalesce(p.estado_validacion,p.estado_programacion),
        'tipoRegistro',p.tipo_registro
      ) obj
    from public.programacion_descansos_migracion p
    where (
      perfil='SUPERVISOR'
      and replace(upper(trim(coalesce(nullif(p.estado_validacion,''),p.estado_programacion,''))),'_',' ')='PENDIENTE SUPERVISOR'
      and upper(trim(p.sede))=upper(trim(coalesce(u.sede,'')))
    ) or (
      public.mv_descansos_es_jefatura(perfil)
      and replace(upper(trim(coalesce(nullif(p.estado_validacion,''),p.estado_programacion,''))),'_',' ')
        in ('PENDIENTE SUPERVISOR','PENDIENTE JEFATURA','OBSERVADO')
    )
    order by p.seq desc
    limit 20
  ) x;

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','NOTIFICACIONES',
    'pendientes',jsonb_array_length(solicitudes),'solicitudes',solicitudes
  );
end;
$$;

create or replace function public.mv_descansos_resumen_cobertura(
  p_usuario text,
  p_fecha date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  u record;
  perfil text;
  alcance text;
  resumen jsonb:='[]'::jsonb;
  sede_item text;
  plataforma_item text;
  cob jsonb;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;
  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;

  perfil:=upper(trim(coalesce(u.perfil,'')));
  if perfil='TECNICO' then raise exception 'No tienes permiso para consultar cobertura general'; end if;

  select upper(trim(coalesce(alcance_datos,''))) into alcance
  from public.app_permissions
  where upper(trim(perfil))=upper(trim(u.perfil))
    and upper(trim(modulo))='PROGRAMACION DESCANSOS'
    and ver is true
  order by id desc limit 1;
  if alcance is null then raise exception 'No tienes permiso para ver Programación de Descansos'; end if;

  for sede_item in
    select s from unnest(
      case when alcance in ('SEDE','SEDE / PROPIOS')
        then array[upper(trim(coalesce(u.sede,'')))]
        else array['CHICLAYO','PIURA','TRUJILLO']
      end
    ) s
  loop
    foreach plataforma_item in array array['INSTALACIONES','VISITA TECNICA','TRASLADOS']
    loop
      cob:=public.mv_descansos_calcular_cobertura(p_fecha,sede_item,plataforma_item,'{}'::jsonb);
      resumen:=resumen || jsonb_build_array(
        jsonb_build_object(
          'fecha',to_char(p_fecha,'YYYY-MM-DD'),'sede',sede_item,'plataforma',plataforma_item,
          'total',cob->'total','enCampo',cob->'enCampo','enDescanso',cob->'enDescanso',
          'porcentaje',cob->'porcentaje','estado',cob->'estado','objetivo',cob->'objetivo',
          'minimo',cob->'minimo','objetivoCuadrillas',cob->'objetivoCuadrillas','minimoCuadrillas',cob->'minimoCuadrillas'
        )
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','RESUMEN_COBERTURA',
    'fecha',to_char(p_fecha,'YYYY-MM-DD'),'resumen',resumen
  );
end;
$$;

create or replace view public.mv_descansos_notificaciones_pendientes
with (security_invoker=true) as
select
  id,seq,periodo,fecha,sede,cuadrilla,plataforma,supervisor,solicitud_cambio,
  replace(upper(trim(coalesce(nullif(estado_validacion,''),estado_programacion,''))),'_',' ') as estado,
  tipo_registro,solicitado_por,fecha_solicitud
from public.programacion_descansos_migracion
where replace(upper(trim(coalesce(nullif(estado_validacion,''),estado_programacion,''))),'_',' ')
  in ('PENDIENTE SUPERVISOR','PENDIENTE JEFATURA','OBSERVADO');

revoke execute on function public.mv_descansos_dia_semana(date) from public,anon,authenticated;
revoke execute on function public.mv_descansos_generar_id(text,date) from public,anon,authenticated;
revoke execute on function public.mv_descansos_entidad(text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_guardar(text,jsonb,text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_solicitar_cambio(text,date,date,text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_validar_supervisor(text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_aplicar_solicitud_tecnico(text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_resolver_jefatura(text,jsonb,text,text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_notificaciones(text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_resumen_cobertura(text,date) from public,anon,authenticated;
revoke all on public.mv_descansos_notificaciones_pendientes from anon,authenticated;

grant execute on function public.mv_descansos_dia_semana(date) to service_role;
grant execute on function public.mv_descansos_generar_id(text,date) to service_role;
grant execute on function public.mv_descansos_entidad(text) to service_role;
grant execute on function public.mv_descansos_guardar(text,jsonb,text) to service_role;
grant execute on function public.mv_descansos_solicitar_cambio(text,date,date,text) to service_role;
grant execute on function public.mv_descansos_validar_supervisor(text,text,text,text) to service_role;
grant execute on function public.mv_descansos_aplicar_solicitud_tecnico(text,text,text) to service_role;
grant execute on function public.mv_descansos_resolver_jefatura(text,jsonb,text,text) to service_role;
grant execute on function public.mv_descansos_notificaciones(text) to service_role;
grant execute on function public.mv_descansos_resumen_cobertura(text,date) to service_role;
grant select on public.mv_descansos_notificaciones_pendientes to service_role;
