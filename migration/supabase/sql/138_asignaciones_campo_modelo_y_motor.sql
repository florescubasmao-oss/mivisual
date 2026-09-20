-- 138_asignaciones_campo_modelo_y_motor.sql
-- 20/09/2026
-- Subflujo de Actividad en Campo: planificación Jefatura -> ejecución Supervisor.

create table if not exists public.asignaciones_campo_migracion (
  id text primary key,
  fecha_asignacion date not null,
  hora_asignacion time without time zone not null,
  asignado_por text not null,
  sede text not null,
  supervisor text not null,
  codigo_ingresado text,
  codigo_orden text,
  codigo_pedido text,
  cliente text,
  dni text,
  cuadrilla text not null,
  tipo_actividad text not null,
  motivo text not null,
  prioridad text not null default 'NORMAL',
  fecha_limite date,
  estado text not null default 'PENDIENTE',
  fecha_inicio date,
  hora_inicio time without time zone,
  fecha_cierre date,
  hora_cierre time without time zone,
  id_actividad_campo text,
  observacion_jefatura text,
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asignaciones_campo_tipo_check check (
    tipo_actividad in (
      'AUDITORIA EN FRIO','AUDITORIA EN CALIENTE','SEGUIMIENTO',
      'VALIDACION DE OBSERVACION','CAPACITACION','CHECKLIST'
    )
  ),
  constraint asignaciones_campo_prioridad_check check (
    prioridad in ('NORMAL','ALTA','URGENTE')
  ),
  constraint asignaciones_campo_estado_check check (
    estado in ('PENDIENTE','EN PROCESO','COMPLETADO','ANULADO')
  )
);

create index if not exists idx_asignaciones_campo_supervisor_estado
  on public.asignaciones_campo_migracion(supervisor,estado);
create index if not exists idx_asignaciones_campo_sede_estado
  on public.asignaciones_campo_migracion(sede,estado);
create index if not exists idx_asignaciones_campo_cuadrilla
  on public.asignaciones_campo_migracion((public.mv_norm_key(cuadrilla)));
create index if not exists idx_asignaciones_campo_orden
  on public.asignaciones_campo_migracion((public.mv_norm_key(codigo_orden)));

create table if not exists public.asignaciones_campo_eventos_migracion (
  seq bigint generated always as identity primary key,
  asignacion_id text not null,
  evento text not null,
  usuario text not null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.asignaciones_campo_migracion enable row level security;
alter table public.asignaciones_campo_eventos_migracion enable row level security;
revoke all on public.asignaciones_campo_migracion from anon,authenticated;
revoke all on public.asignaciones_campo_eventos_migracion from anon,authenticated;
grant select,insert,update,delete on public.asignaciones_campo_migracion to service_role;
grant select,insert on public.asignaciones_campo_eventos_migracion to service_role;
grant usage,select on sequence public.asignaciones_campo_eventos_migracion_seq_seq to service_role;

create or replace function public.mv_asignacion_perfil_gestion(p_perfil text)
returns boolean
language sql
immutable
set search_path=public,pg_temp
as $$
  select public.mv_norm_key(p_perfil) in (
    'JEFATURA','JEFATURAGENERAL','ADMIN','ADMINISTRADOR',
    'JEFATURAOPERACIONES','JEFATURADEOPERACIONES','OPERACIONES',
    'GERENCIAGENERAL','GERENCIALGENERAL','GERENCIALIMA'
  );
$$;

create or replace function public.mv_asignaciones_campo_listar(
  p_usuario text,
  p_filtros jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  v_perfil text;
  v_usuario text;
  v_estado text:=upper(trim(coalesce(p_filtros->>'estado','')));
  v_sede text:=upper(trim(coalesce(p_filtros->>'sede','')));
  v_supervisor text:=trim(coalesce(p_filtros->>'supervisor',''));
  v_tipo text:=upper(trim(coalesce(p_filtros->>'tipoActividad','')));
  v_lista jsonb;
  v_totales jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  v_perfil:=u->>'perfil';
  v_usuario:=u->>'usuario';

  if v_perfil<>'SUPERVISOR' and not public.mv_asignacion_perfil_gestion(v_perfil) then
    raise exception 'Sin acceso a Asignaciones Campo';
  end if;

  with q as (
    select a.*
    from public.asignaciones_campo_migracion a
    where
      (v_perfil<>'SUPERVISOR' or public.mv_norm_key(a.supervisor)=public.mv_norm_key(v_usuario))
      and (v_estado in ('','TODOS') or a.estado=v_estado)
      and (v_sede='' or public.mv_norm_key(a.sede)=public.mv_norm_key(v_sede))
      and (v_supervisor='' or public.mv_norm_key(a.supervisor)=public.mv_norm_key(v_supervisor))
      and (v_tipo='' or public.mv_norm_key(a.tipo_actividad)=public.mv_norm_key(v_tipo))
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',id,'fechaAsignacion',fecha_asignacion,'horaAsignacion',hora_asignacion,
      'asignadoPor',asignado_por,'sede',sede,'supervisor',supervisor,
      'codigoIngresado',codigo_ingresado,'codigoOrden',codigo_orden,'codigoPedido',codigo_pedido,
      'cliente',cliente,'dni',dni,'cuadrilla',cuadrilla,'tipoActividad',tipo_actividad,
      'motivo',motivo,'prioridad',prioridad,'fechaLimite',fecha_limite,'estado',estado,
      'fechaInicio',fecha_inicio,'horaInicio',hora_inicio,'fechaCierre',fecha_cierre,
      'horaCierre',hora_cierre,'idActividadCampo',id_actividad_campo,
      'observacionJefatura',observacion_jefatura,'sourceKind',source_kind,
      'updatedAt',updated_at
    )
    order by
      case prioridad when 'URGENTE' then 1 when 'ALTA' then 2 else 3 end,
      coalesce(fecha_limite,'2999-12-31'::date),
      fecha_asignacion desc,hora_asignacion desc
  ),'[]'::jsonb) into v_lista
  from q;

  with q as (
    select a.estado
    from public.asignaciones_campo_migracion a
    where v_perfil<>'SUPERVISOR' or public.mv_norm_key(a.supervisor)=public.mv_norm_key(v_usuario)
  )
  select jsonb_build_object(
    'PENDIENTE',count(*) filter(where estado='PENDIENTE'),
    'EN PROCESO',count(*) filter(where estado='EN PROCESO'),
    'COMPLETADO',count(*) filter(where estado='COMPLETADO'),
    'ANULADO',count(*) filter(where estado='ANULADO'),
    'TOTAL',count(*)
  ) into v_totales from q;

  return jsonb_build_object(
    'ok',true,'modulo','ASIGNACIONES_CAMPO',
    'asignaciones',v_lista,'totales',v_totales,
    'puedeAsignar',public.mv_asignacion_perfil_gestion(v_perfil),
    'perfil',v_perfil,'usuario',v_usuario
  );
end $$;

create or replace function public.mv_asignaciones_campo_catalogo(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  v_perfil text;
  v_sedes jsonb;
  v_cuadrillas jsonb;
  v_supervisores jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  v_perfil:=u->>'perfil';

  if not public.mv_asignacion_perfil_gestion(v_perfil) then
    raise exception 'Solo Jefatura/Gerencia pueden asignar trabajos';
  end if;

  select coalesce(jsonb_agg(x.sede order by x.sede),'[]'::jsonb)
  into v_sedes
  from (
    select distinct upper(trim(sede)) sede
    from public.app_users
    where upper(trim(coalesce(estado,'')))='ACTIVO'
      and nullif(trim(coalesce(sede,'')),'') is not null
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'cuadrilla',x.cuadrilla,'sede',x.sede,'plataforma',x.plataforma
  ) order by x.sede,x.cuadrilla),'[]'::jsonb)
  into v_cuadrillas
  from (
    select distinct on (public.mv_norm_key(cuadrilla))
      trim(cuadrilla) cuadrilla,upper(trim(sede)) sede,trim(coalesce(plataforma,'')) plataforma
    from public.app_users
    where upper(trim(coalesce(estado,'')))='ACTIVO'
      and upper(trim(coalesce(perfil,'')))='TECNICO'
      and nullif(trim(coalesce(cuadrilla,'')),'') is not null
    order by public.mv_norm_key(cuadrilla),usuario
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'usuario',x.usuario,'nombresApellidos',x.nombres_apellidos,'sede',x.sede
  ) order by x.sede,x.nombres_apellidos,x.usuario),'[]'::jsonb)
  into v_supervisores
  from (
    select usuario,nombres_apellidos,upper(trim(sede)) sede
    from public.app_users
    where upper(trim(coalesce(estado,'')))='ACTIVO'
      and upper(trim(coalesce(perfil,'')))='SUPERVISOR'
  ) x;

  return jsonb_build_object(
    'ok',true,'modulo','ASIGNACIONES_CAMPO',
    'sedes',v_sedes,'cuadrillas',v_cuadrillas,'supervisores',v_supervisores
  );
end $$;

create or replace function public.mv_asignaciones_campo_preparar(
  p_usuario text,
  p_codigo text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  v_codigo text:=public.mv_norm_key(p_codigo);
  o public.ordenes%rowtype;
  a public.actas_migracion%rowtype;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if (u->>'perfil')<>'SUPERVISOR' and not public.mv_asignacion_perfil_gestion(u->>'perfil') then
    raise exception 'Sin acceso a Asignaciones Campo';
  end if;
  if v_codigo='' then raise exception 'Ingrese Código o DNI'; end if;

  select *
  into o
  from public.ordenes x
  where public.mv_norm_key(x.orden_id)=v_codigo
     or public.mv_norm_key(x.codigo_cliente)=v_codigo
     or public.mv_norm_key(x.numero_documento)=v_codigo
  order by coalesce(x.fecha_ultimo_estado,x.fecha_importacion) desc nulls last,x.id desc
  limit 1;

  if not found then
    raise exception 'No se encontró una orden para el Código/DNI ingresado';
  end if;

  select *
  into a
  from public.actas_migracion x
  where public.mv_norm_key(x.codigo_orden)=public.mv_norm_key(o.orden_id)
     or public.mv_norm_key(x.codigo_pedido)=public.mv_norm_key(o.codigo_cliente)
  order by x.updated_at desc,x.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok',true,'modulo','ASIGNACIONES_CAMPO',
    'orden',jsonb_build_object(
      'ordenId',o.orden_id,'codigoPedido',o.codigo_cliente,'codigoCliente',o.codigo_cliente,
      'cliente',o.cliente,'numeroDocumento',o.numero_documento,'region',o.sede,
      'cuadrilla',o.cuadrilla,'fechaSolicitud',o.fecha_solicitud,'horaSolicitud',o.hora_solicitud,
      'direccion',o.direccion,'estado',o.estado,'tipoTrabajo',o.tipo_trabajo,
      'productoServicio',o.producto_servicio,'productoOrigen',o.producto_origen,
      'telefonoMovil',o.telefono_movil,'latitud',o.latitud,'longitud',o.longitud
    ),
    'acta',case when a.id is null then null else jsonb_build_object(
      'id',a.id,'linkActa',a.link_acta,'estado',a.estado,
      'estadoEntregaFisica',a.estado_entrega_fisica
    ) end
  );
end $$;

create or replace function public.mv_asignaciones_campo_generar_id()
returns text
language plpgsql
volatile
set search_path=public,pg_temp
as $$
declare
  v text;
begin
  loop
    v:='ASG-'||to_char(clock_timestamp() at time zone 'America/Lima','YYYYMMDDHH24MISS')
       ||'-'||lpad((floor(random()*900)+100)::int::text,3,'0');
    exit when not exists(select 1 from public.asignaciones_campo_migracion where id=v);
  end loop;
  return v;
end $$;

create or replace function public.mv_asignaciones_campo_crear(
  p_usuario text,
  p_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  v_perfil text;
  v_usuario text;
  v_sede text:=upper(trim(coalesce(p_data->>'sede','')));
  v_cuadrilla text:=trim(coalesce(p_data->>'cuadrilla',''));
  v_supervisor text:=trim(coalesce(p_data->>'supervisor',''));
  v_tipo text:=upper(trim(coalesce(p_data->>'tipoActividad','')));
  v_prioridad text:=upper(trim(coalesce(p_data->>'prioridad','NORMAL')));
  v_motivo text:=trim(coalesce(p_data->>'motivo',''));
  v_codigo text:=trim(coalesce(p_data->>'codigo',''));
  v_fecha_limite date:=null;
  v_id text;
  v_ord jsonb:=null;
  v_now timestamp:=(clock_timestamp() at time zone 'America/Lima');
begin
  u:=public.mv_actividad_usuario(p_usuario);
  v_perfil:=u->>'perfil';
  v_usuario:=u->>'usuario';

  if not public.mv_asignacion_perfil_gestion(v_perfil) then
    raise exception 'Solo Jefatura/Gerencia pueden asignar trabajos';
  end if;
  if v_sede='' or v_cuadrilla='' or v_supervisor='' then
    raise exception 'Sede, Cuadrilla y Supervisor son obligatorios';
  end if;
  if v_tipo not in (
    'AUDITORIA EN FRIO','AUDITORIA EN CALIENTE','SEGUIMIENTO',
    'VALIDACION DE OBSERVACION','CAPACITACION','CHECKLIST'
  ) then raise exception 'Tipo de actividad no válido'; end if;
  if v_prioridad not in ('NORMAL','ALTA','URGENTE') then raise exception 'Prioridad no válida'; end if;
  if v_motivo='' then raise exception 'Motivo obligatorio'; end if;

  if nullif(trim(coalesce(p_data->>'fechaLimite','')),'') is not null then
    v_fecha_limite:=(p_data->>'fechaLimite')::date;
  end if;

  if not exists(
    select 1 from public.app_users x
    where upper(trim(coalesce(x.estado,'')))='ACTIVO'
      and upper(trim(coalesce(x.perfil,'')))='SUPERVISOR'
      and public.mv_norm_key(x.usuario)=public.mv_norm_key(v_supervisor)
      and public.mv_norm_key(x.sede)=public.mv_norm_key(v_sede)
  ) then raise exception 'Supervisor no válido para la sede'; end if;

  if not exists(
    select 1 from public.app_users x
    where upper(trim(coalesce(x.estado,'')))='ACTIVO'
      and upper(trim(coalesce(x.perfil,'')))='TECNICO'
      and public.mv_norm_key(x.cuadrilla)=public.mv_norm_key(v_cuadrilla)
      and public.mv_norm_key(x.sede)=public.mv_norm_key(v_sede)
  ) then raise exception 'Cuadrilla no válida para la sede'; end if;

  if v_codigo<>'' then
    v_ord:=public.mv_asignaciones_campo_preparar(v_usuario,v_codigo);
  end if;

  if v_tipo in ('AUDITORIA EN FRIO','AUDITORIA EN CALIENTE')
     and coalesce(v_ord#>>'{orden,ordenId}','')='' then
    raise exception 'Para auditoría debe vincular una orden mediante Código o DNI';
  end if;

  v_id:=public.mv_asignaciones_campo_generar_id();

  insert into public.asignaciones_campo_migracion(
    id,fecha_asignacion,hora_asignacion,asignado_por,sede,supervisor,
    codigo_ingresado,codigo_orden,codigo_pedido,cliente,dni,cuadrilla,
    tipo_actividad,motivo,prioridad,fecha_limite,estado,observacion_jefatura,
    source_kind,created_at,updated_at
  ) values (
    v_id,v_now::date,v_now::time(0),v_usuario,v_sede,v_supervisor,
    nullif(v_codigo,''),
    nullif(v_ord#>>'{orden,ordenId}',''),
    nullif(v_ord#>>'{orden,codigoPedido}',''),
    nullif(v_ord#>>'{orden,cliente}',''),
    nullif(v_ord#>>'{orden,numeroDocumento}',''),
    v_cuadrilla,v_tipo,v_motivo,v_prioridad,v_fecha_limite,'PENDIENTE',
    nullif(trim(coalesce(p_data->>'observacionJefatura','')),''),
    'POSTGRESQL',now(),now()
  );

  insert into public.asignaciones_campo_eventos_migracion(
    asignacion_id,evento,usuario,detalle
  ) values (
    v_id,'CREAR',v_usuario,
    jsonb_build_object(
      'sede',v_sede,'cuadrilla',v_cuadrilla,'supervisor',v_supervisor,
      'tipoActividad',v_tipo,'prioridad',v_prioridad,
      'codigoOrden',v_ord#>>'{orden,ordenId}'
    )
  );

  return jsonb_build_object(
    'ok',true,'modulo','ASIGNACIONES_CAMPO','accion','CREAR',
    'id',v_id,'codigoOrden',v_ord#>>'{orden,ordenId}','estado','PENDIENTE'
  );
end $$;

create or replace function public.mv_asignaciones_campo_iniciar(
  p_usuario text,p_id text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  a public.asignaciones_campo_migracion%rowtype;
  v_now timestamp:=(clock_timestamp() at time zone 'America/Lima');
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if (u->>'perfil')<>'SUPERVISOR' then raise exception 'Solo Supervisor puede iniciar la asignación'; end if;

  select * into a
  from public.asignaciones_campo_migracion
  where id=p_id
  for update;
  if not found then raise exception 'Asignación no encontrada'; end if;
  if public.mv_norm_key(a.supervisor)<>public.mv_norm_key(u->>'usuario') then
    raise exception 'Asignación fuera de su alcance';
  end if;
  if a.estado not in ('PENDIENTE','EN PROCESO') then
    raise exception 'La asignación no puede iniciarse en estado %',a.estado;
  end if;

  if a.estado='PENDIENTE' then
    update public.asignaciones_campo_migracion
    set estado='EN PROCESO',fecha_inicio=v_now::date,hora_inicio=v_now::time(0),updated_at=now()
    where id=p_id;

    insert into public.asignaciones_campo_eventos_migracion(asignacion_id,evento,usuario,detalle)
    values(p_id,'INICIAR',u->>'usuario',jsonb_build_object('estadoAnterior','PENDIENTE'));
  end if;

  return jsonb_build_object('ok',true,'id',p_id,'estado','EN PROCESO');
end $$;

create or replace function public.mv_asignaciones_campo_anular(
  p_usuario text,p_id text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  a public.asignaciones_campo_migracion%rowtype;
  v_now timestamp:=(clock_timestamp() at time zone 'America/Lima');
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if not public.mv_asignacion_perfil_gestion(u->>'perfil') then
    raise exception 'Solo Jefatura/Gerencia puede anular la asignación';
  end if;

  select * into a from public.asignaciones_campo_migracion where id=p_id for update;
  if not found then raise exception 'Asignación no encontrada'; end if;
  if a.estado not in ('PENDIENTE','EN PROCESO') then
    raise exception 'La asignación no puede anularse en estado %',a.estado;
  end if;

  update public.asignaciones_campo_migracion
  set estado='ANULADO',fecha_cierre=v_now::date,hora_cierre=v_now::time(0),updated_at=now()
  where id=p_id;

  insert into public.asignaciones_campo_eventos_migracion(asignacion_id,evento,usuario,detalle)
  values(p_id,'ANULAR',u->>'usuario',jsonb_build_object('estadoAnterior',a.estado));

  return jsonb_build_object('ok',true,'id',p_id,'estado','ANULADO');
end $$;

create or replace function public.mv_asignaciones_campo_completar(
  p_usuario text,p_id text,p_actividad_id text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb;
  a public.asignaciones_campo_migracion%rowtype;
  v_now timestamp:=(clock_timestamp() at time zone 'America/Lima');
begin
  u:=public.mv_actividad_usuario(p_usuario);

  select * into a
  from public.asignaciones_campo_migracion
  where id=p_id
  for update;
  if not found then raise exception 'Asignación no encontrada'; end if;

  if (u->>'perfil')='SUPERVISOR'
     and public.mv_norm_key(a.supervisor)<>public.mv_norm_key(u->>'usuario') then
    raise exception 'Asignación fuera de su alcance';
  elsif (u->>'perfil')<>'SUPERVISOR' and not public.mv_asignacion_perfil_gestion(u->>'perfil') then
    raise exception 'Sin permiso para completar la asignación';
  end if;

  if a.estado='COMPLETADO' then
    if coalesce(a.id_actividad_campo,'')=coalesce(p_actividad_id,'') then
      return jsonb_build_object('ok',true,'id',p_id,'estado','COMPLETADO','idActividadCampo',a.id_actividad_campo,'yaCompletada',true);
    end if;
    raise exception 'La asignación ya fue completada con otra actividad';
  end if;
  if a.estado='ANULADO' then raise exception 'La asignación está anulada'; end if;

  if not exists(select 1 from public.actividad_campo_migracion x where x.id=p_actividad_id) then
    raise exception 'Actividad Campo no encontrada';
  end if;

  update public.asignaciones_campo_migracion
  set estado='COMPLETADO',
      fecha_inicio=coalesce(fecha_inicio,v_now::date),
      hora_inicio=coalesce(hora_inicio,v_now::time(0)),
      fecha_cierre=v_now::date,hora_cierre=v_now::time(0),
      id_actividad_campo=p_actividad_id,updated_at=now()
  where id=p_id;

  insert into public.asignaciones_campo_eventos_migracion(asignacion_id,evento,usuario,detalle)
  values(p_id,'COMPLETAR',u->>'usuario',jsonb_build_object('actividadId',p_actividad_id,'estadoAnterior',a.estado));

  return jsonb_build_object(
    'ok',true,'id',p_id,'estado','COMPLETADO',
    'idActividadCampo',p_actividad_id,'yaCompletada',false
  );
end $$;

create or replace function public.mv_actividad_registrar_con_asignacion(
  p_usuario text,p_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r jsonb;
  v_asignacion text:=trim(coalesce(p_data->>'asignacionCampoId',''));
  c jsonb:=null;
begin
  r:=public.mv_actividad_registrar(p_usuario,p_data);

  if v_asignacion<>'' then
    c:=public.mv_asignaciones_campo_completar(
      p_usuario,v_asignacion,r->>'id'
    );
  end if;

  return r || jsonb_build_object(
    'asignacionCampoId',nullif(v_asignacion,''),
    'asignacionCompletada',case when c is null then false else true end
  );
end $$;

revoke all on function public.mv_asignacion_perfil_gestion(text) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_listar(text,jsonb) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_catalogo(text) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_preparar(text,text) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_generar_id() from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_crear(text,jsonb) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_iniciar(text,text) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_anular(text,text) from public,anon,authenticated;
revoke all on function public.mv_asignaciones_campo_completar(text,text,text) from public,anon,authenticated;
revoke all on function public.mv_actividad_registrar_con_asignacion(text,jsonb) from public,anon,authenticated;

grant execute on function public.mv_asignacion_perfil_gestion(text) to service_role;
grant execute on function public.mv_asignaciones_campo_listar(text,jsonb) to service_role;
grant execute on function public.mv_asignaciones_campo_catalogo(text) to service_role;
grant execute on function public.mv_asignaciones_campo_preparar(text,text) to service_role;
grant execute on function public.mv_asignaciones_campo_generar_id() to service_role;
grant execute on function public.mv_asignaciones_campo_crear(text,jsonb) to service_role;
grant execute on function public.mv_asignaciones_campo_iniciar(text,text) to service_role;
grant execute on function public.mv_asignaciones_campo_anular(text,text) to service_role;
grant execute on function public.mv_asignaciones_campo_completar(text,text,text) to service_role;
grant execute on function public.mv_actividad_registrar_con_asignacion(text,jsonb) to service_role;

update public.migration_live_source_control
set postgres_target='asignaciones_campo_migracion + asignaciones_campo_eventos_migracion',
    source_mode='SHEET_LIVE_SNAPSHOT',
    status='REQUIERE_RESYNC_FINAL',
    sheet_rows=4,
    postgres_rows=(select count(*) from public.asignaciones_campo_migracion),
    content_match=false,
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='MODELO+CRUD+ALCANCE+VINCULO_ACTIVIDAD_TRANSACCIONAL',
    notes='Backend completo creado. ASIGNACIONES_CAMPO tiene 4 filas legacy al corte; no se transfieren directamente desde Drive entre conectores. Requiere resync autenticado desde Excel antes de cutover.',
    updated_at=now()
where modulo='ASIGNACIONES_CAMPO';
