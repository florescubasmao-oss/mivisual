
-- 110_equipos_averiados_v399.sql
-- MI VISUAL - Equipos Averiados
-- Porta V267 + endurecimiento V399/V537 a PostgreSQL.
-- No toca Google Sheets ni Apps Script.

create table if not exists public.equipos_averiados_solicitudes_migracion (
  id text primary key,
  source_row integer unique,
  fecha_registro date not null,
  hora_registro time without time zone,
  origen_registro text not null,
  registrado_por text not null,
  perfil_registro text not null,
  sede text not null,
  plataforma text,
  cuadrilla text,
  usuario_tecnico text not null,
  tecnico text,
  estado text not null,
  cantidad_referencial integer not null default 0,
  equipos jsonb not null default '[]'::jsonb,
  fecha_completado_tecnico date,
  hora_completado_tecnico time without time zone,
  validado_por text,
  perfil_validacion text,
  fecha_validacion date,
  hora_validacion time without time zone,
  observacion_almacen text,
  id_cargo text,
  link_cargo text,
  estado_win text,
  fecha_entrega_win date,
  hora_entrega_win time without time zone,
  recibido_win_por text,
  documento_win text,
  observacion_win text,
  ultima_actualizacion timestamp without time zone,
  historial jsonb not null default '[]'::jsonb,
  ultima_solicitud_id_recepcion text,
  source_kind text not null default 'POSTGRESQL_PILOT',
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ea_solicitudes_equipos_array_chk check (jsonb_typeof(equipos)='array'),
  constraint ea_solicitudes_historial_array_chk check (jsonb_typeof(historial)='array'),
  constraint ea_solicitudes_cantidad_chk check (cantidad_referencial between 0 and 8)
);

create table if not exists public.equipos_averiados_cargos_migracion (
  id_cargo text primary key,
  source_row integer unique,
  id_solicitud text not null,
  fecha_cargo date not null,
  hora_cargo time without time zone,
  sede text not null,
  plataforma text,
  cuadrilla text,
  usuario_tecnico text,
  tecnico text,
  recibido_por text,
  perfil_recibe text,
  total_equipos integer not null default 0,
  equipos jsonb not null default '[]'::jsonb,
  link_pdf text,
  nombre_pdf text,
  estado text not null default 'GENERADO',
  solicitud_id_cliente text,
  operacion jsonb,
  storage_path text,
  source_kind text not null default 'POSTGRESQL_PILOT',
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ea_cargos_equipos_array_chk check (jsonb_typeof(equipos)='array'),
  constraint ea_cargos_total_chk check (total_equipos between 0 and 8)
);

create index if not exists ea_sol_usuario_tecnico_idx
  on public.equipos_averiados_solicitudes_migracion(usuario_tecnico);
create index if not exists ea_sol_sede_estado_idx
  on public.equipos_averiados_solicitudes_migracion(sede,estado);
create index if not exists ea_sol_cuadrilla_idx
  on public.equipos_averiados_solicitudes_migracion(cuadrilla);
create index if not exists ea_sol_fecha_idx
  on public.equipos_averiados_solicitudes_migracion(fecha_registro desc);
create index if not exists ea_cargo_solicitud_idx
  on public.equipos_averiados_cargos_migracion(id_solicitud);
create unique index if not exists ea_cargo_solicitud_cliente_uidx
  on public.equipos_averiados_cargos_migracion(solicitud_id_cliente)
  where nullif(trim(coalesce(solicitud_id_cliente,'')),'') is not null;

alter table public.equipos_averiados_solicitudes_migracion enable row level security;
alter table public.equipos_averiados_cargos_migracion enable row level security;

revoke all on public.equipos_averiados_solicitudes_migracion from anon,authenticated;
revoke all on public.equipos_averiados_cargos_migracion from anon,authenticated;
grant select,insert,update on public.equipos_averiados_solicitudes_migracion to service_role;
grant select,insert,update on public.equipos_averiados_cargos_migracion to service_role;

create or replace function public.mv_ea_norm_tipo(p_tipo text)
returns text
language plpgsql
immutable
as $$
declare t text:=public.mv_norm_key(p_tipo);
begin
  if t='ONTHUAWEI' then return 'ONT HUAWEI'; end if;
  if t='ONTZTE' then return 'ONT ZTE'; end if;
  if t='MESHHUAWEI' then return 'MESH HUAWEI'; end if;
  if t='MESHZTE' then return 'MESH ZTE'; end if;
  if t in ('WINBOX','WINBOX') then return 'WINBOX'; end if;
  if t='TELEFONO' then return 'TELEFONO'; end if;
  raise exception 'Tipo de equipo no permitido: %',coalesce(p_tipo,'');
end;
$$;

create or replace function public.mv_ea_normalizar_equipos(p_equipos jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  e jsonb;
  out_arr jsonb:='[]'::jsonb;
  seen text[]:=array[]::text[];
  tipo text;
  serie text;
  mac text;
  k text;
  estado text;
  n integer;
begin
  if p_equipos is null or jsonb_typeof(p_equipos)<>'array' then
    raise exception 'Debe registrar al menos un equipo';
  end if;
  n:=jsonb_array_length(p_equipos);
  if n<1 then raise exception 'Debe registrar al menos un equipo'; end if;
  if n>8 then raise exception 'Se permiten como máximo 8 equipos por solicitud'; end if;

  for e in select value from jsonb_array_elements(p_equipos)
  loop
    tipo:=public.mv_ea_norm_tipo(e->>'tipo');
    serie:=upper(trim(regexp_replace(coalesce(e->>'serie',''),'\s+',' ','g')));
    mac:=trim(regexp_replace(coalesce(e->>'codigoCliente',''),'\s+',' ','g'));
    if serie='' then raise exception 'Ingrese la serie (SN) del equipo'; end if;
    if mac='' then raise exception 'Ingrese la MAC del equipo'; end if;
    k:=public.mv_norm_key(serie);
    if k=any(seen) then raise exception 'La serie % está repetida en la solicitud',serie; end if;
    seen:=array_append(seen,k);

    estado:=upper(trim(coalesce(e->>'estadoRecepcion','PENDIENTE')));
    if estado='' then estado:='PENDIENTE'; end if;
    if estado not in ('PENDIENTE','RECIBIDO','OBSERVADO','RECHAZADO') then
      raise exception 'Estado de recepción no válido';
    end if;

    out_arr:=out_arr || jsonb_build_array(
      jsonb_build_object(
        'tipo',tipo,
        'serie',serie,
        'codigoCliente',mac,
        'estadoRecepcion',estado,
        'observacionAlmacen',coalesce(e->>'observacionAlmacen',''),
        'recibidoPor',coalesce(e->>'recibidoPor',''),
        'fechaRecepcion',coalesce(e->>'fechaRecepcion',''),
        'horaRecepcion',coalesce(e->>'horaRecepcion',''),
        'cargoId',coalesce(e->>'cargoId',''),
        'estadoWin',coalesce(e->>'estadoWin','PENDIENTE'),
        'fechaWin',coalesce(e->>'fechaWin',''),
        'horaWin',coalesce(e->>'horaWin',''),
        'recibidoWinPor',coalesce(e->>'recibidoWinPor',''),
        'documentoWin',coalesce(e->>'documentoWin','')
      )
    );
  end loop;

  return out_arr;
end;
$$;

create or replace function public.mv_ea_historial_agregar(
  p_historial jsonb,
  p_usuario text,
  p_perfil text,
  p_accion text,
  p_detalle text
)
returns jsonb
language sql
stable
as $$
  select coalesce(
           case when jsonb_typeof(p_historial)='array' then p_historial else '[]'::jsonb end,
           '[]'::jsonb
         ) ||
         jsonb_build_array(
           jsonb_build_object(
             'fecha',to_char(timezone('America/Lima',now()),'DD/MM/YYYY'),
             'hora',to_char(timezone('America/Lima',now()),'HH24:MI:SS'),
             'usuario',coalesce(p_usuario,''),
             'perfil',coalesce(p_perfil,''),
             'accion',coalesce(p_accion,''),
             'detalle',coalesce(p_detalle,'')
           )
         );
$$;

create or replace function public.mv_ea_nuevo_id(p_prefijo text)
returns text
language sql
volatile
as $$
  select upper(coalesce(nullif(trim(p_prefijo),''),'EA')) || '-' ||
         to_char(timezone('America/Lima',now()),'YYYYMMDD-HH24MISS') || '-' ||
         upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
$$;

create or replace view public.mv_ea_solicitudes_v1
with (security_invoker=true) as
select
  s.*,
  jsonb_array_length(s.equipos) as equipos_total,
  (
    select count(*) from jsonb_array_elements(s.equipos) e
    where upper(trim(coalesce(e->>'estadoRecepcion','')))='RECIBIDO'
  )::integer as equipos_recibidos,
  (
    select count(*) from jsonb_array_elements(s.equipos) e
    where upper(trim(coalesce(e->>'estadoRecepcion','')))='PENDIENTE'
  )::integer as equipos_pendientes,
  (
    select count(*) from jsonb_array_elements(s.equipos) e
    where upper(trim(coalesce(e->>'estadoRecepcion','')))='OBSERVADO'
  )::integer as equipos_observados,
  (
    select count(*) from jsonb_array_elements(s.equipos) e
    where upper(trim(coalesce(e->>'estadoRecepcion','')))='RECHAZADO'
  )::integer as equipos_rechazados
from public.equipos_averiados_solicitudes_migracion s;

create or replace view public.mv_ea_cargos_v1
with (security_invoker=true) as
select c.*
from public.equipos_averiados_cargos_migracion c;

revoke all on public.mv_ea_solicitudes_v1 from anon,authenticated;
revoke all on public.mv_ea_cargos_v1 from anon,authenticated;
grant select on public.mv_ea_solicitudes_v1 to service_role;
grant select on public.mv_ea_cargos_v1 to service_role;

create or replace function public.mv_ea_registrar_tecnico(
  p_usuario text,
  p_perfil text,
  p_sede text,
  p_plataforma text,
  p_cuadrilla text,
  p_tecnico text,
  p_equipos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamp without time zone:=timezone('America/Lima',now());
  v_id text:=public.mv_ea_nuevo_id('EA');
  v_equipos jsonb;
  v_hist jsonb;
begin
  if public.mv_norm_key(p_perfil)<>'TECNICO' then
    raise exception 'Solo el técnico puede registrar sus equipos averiados';
  end if;
  v_equipos:=public.mv_ea_normalizar_equipos(p_equipos);
  v_hist:=public.mv_ea_historial_agregar(
    '[]'::jsonb,p_usuario,p_perfil,'REGISTRO TECNICO',
    jsonb_array_length(v_equipos)::text||' equipo(s) registrados'
  );

  insert into public.equipos_averiados_solicitudes_migracion(
    id,fecha_registro,hora_registro,origen_registro,registrado_por,perfil_registro,
    sede,plataforma,cuadrilla,usuario_tecnico,tecnico,estado,cantidad_referencial,
    equipos,fecha_completado_tecnico,hora_completado_tecnico,ultima_actualizacion,
    historial,source_kind
  ) values (
    v_id,v_now::date,v_now::time,'TECNICO',p_usuario,p_perfil,
    coalesce(p_sede,''),coalesce(p_plataforma,''),coalesce(p_cuadrilla,''),
    p_usuario,coalesce(p_tecnico,p_usuario),'PENDIENTE DE ENTREGA',
    jsonb_array_length(v_equipos),v_equipos,v_now::date,v_now::time,v_now,
    v_hist,'POSTGRESQL_PILOT'
  );

  return jsonb_build_object(
    'ok',true,'modulo','EQUIPOS_AVERIADOS','accion','REGISTRAR_TECNICO',
    'id',v_id,'equipos',jsonb_array_length(v_equipos),
    'fecha',to_char(v_now,'DD/MM/YYYY'),'hora',to_char(v_now,'HH24:MI:SS')
  );
end;
$$;

create or replace function public.mv_ea_crear_solicitud_almacen(
  p_usuario text,
  p_perfil text,
  p_sede_actor text,
  p_usuario_tecnico text,
  p_tecnico text,
  p_sede_tecnico text,
  p_plataforma text,
  p_cuadrilla text,
  p_cantidad integer,
  p_observacion text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamp without time zone:=timezone('America/Lima',now());
  v_id text:=public.mv_ea_nuevo_id('EA');
  v_hist jsonb;
  v_existente text;
  v_p text:=public.mv_norm_key(p_perfil);
  v_cant integer:=greatest(1,least(8,coalesce(p_cantidad,1)));
begin
  if v_p not in ('ALMACEN','RESPONSABLEALMACEN','RESPONSABLEDEALMACEN','JEFATURAALMACEN') then
    raise exception 'Solo Responsable o Jefatura de Almacén puede crear la solicitud pendiente';
  end if;
  if v_p in ('ALMACEN','RESPONSABLEALMACEN','RESPONSABLEDEALMACEN')
     and public.mv_norm_key(p_sede_actor)<>public.mv_norm_key(p_sede_tecnico) then
    raise exception 'Solo puede crear solicitudes para técnicos de su sede';
  end if;

  select id into v_existente
  from public.equipos_averiados_solicitudes_migracion
  where public.mv_norm_key(usuario_tecnico)=public.mv_norm_key(p_usuario_tecnico)
    and upper(trim(estado)) in (
      'PENDIENTE DE REGISTRO POR TECNICO','PENDIENTE DE ENTREGA',
      'RECIBIDO PARCIALMENTE','OBSERVADO'
    )
  order by fecha_registro desc,hora_registro desc
  limit 1;

  if v_existente is not null then
    raise exception 'El técnico ya tiene una solicitud abierta: %',v_existente;
  end if;

  v_hist:=public.mv_ea_historial_agregar(
    '[]'::jsonb,p_usuario,p_perfil,'SOLICITUD CREADA POR ALMACEN',
    'Cantidad referencial: '||v_cant::text||
    case when nullif(trim(coalesce(p_observacion,'')),'') is not null
         then '. '||trim(p_observacion) else '' end
  );

  insert into public.equipos_averiados_solicitudes_migracion(
    id,fecha_registro,hora_registro,origen_registro,registrado_por,perfil_registro,
    sede,plataforma,cuadrilla,usuario_tecnico,tecnico,estado,cantidad_referencial,
    equipos,observacion_almacen,ultima_actualizacion,historial,source_kind
  ) values (
    v_id,v_now::date,v_now::time,'ALMACEN',p_usuario,p_perfil,
    coalesce(p_sede_tecnico,''),coalesce(p_plataforma,''),coalesce(p_cuadrilla,''),
    p_usuario_tecnico,coalesce(p_tecnico,p_usuario_tecnico),
    'PENDIENTE DE REGISTRO POR TECNICO',v_cant,'[]'::jsonb,
    coalesce(p_observacion,''),v_now,v_hist,'POSTGRESQL_PILOT'
  );

  return jsonb_build_object(
    'ok',true,'modulo','EQUIPOS_AVERIADOS','accion','CREAR_SOLICITUD_ALMACEN',
    'id',v_id,'cantidadReferencial',v_cant
  );
end;
$$;

create or replace function public.mv_ea_completar_tecnico(
  p_id text,
  p_usuario text,
  p_perfil text,
  p_equipos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.equipos_averiados_solicitudes_migracion%rowtype;
  v_new jsonb;
  v_merged jsonb:='[]'::jsonb;
  e jsonb;
  olde jsonb;
  matched boolean;
  v_now timestamp without time zone:=timezone('America/Lima',now());
  v_hist jsonb;
begin
  if public.mv_norm_key(p_perfil)<>'TECNICO' then
    raise exception 'Solo el técnico puede completar esta solicitud';
  end if;

  select * into r
  from public.equipos_averiados_solicitudes_migracion
  where id=p_id
  for update;
  if not found then raise exception 'No se encontró la solicitud de equipos averiados'; end if;

  if public.mv_norm_key(r.usuario_tecnico)<>public.mv_norm_key(p_usuario) then
    raise exception 'La solicitud no pertenece al técnico actual';
  end if;
  if upper(trim(r.estado)) in ('RECIBIDO POR ALMACEN','RECHAZADO') then
    raise exception 'La solicitud ya no puede modificarse';
  end if;

  v_new:=public.mv_ea_normalizar_equipos(p_equipos);

  for e in select value from jsonb_array_elements(v_new)
  loop
    matched:=false;
    for olde in
      select value from jsonb_array_elements(r.equipos)
      where upper(trim(coalesce(value->>'estadoRecepcion','')))='RECIBIDO'
    loop
      if public.mv_norm_key(olde->>'serie')=public.mv_norm_key(e->>'serie') then
        v_merged:=v_merged||jsonb_build_array(olde);
        matched:=true;
        exit;
      end if;
    end loop;
    if not matched then v_merged:=v_merged||jsonb_build_array(e); end if;
  end loop;

  for olde in
    select value from jsonb_array_elements(r.equipos)
    where upper(trim(coalesce(value->>'estadoRecepcion','')))='RECIBIDO'
  loop
    if not exists (
      select 1 from jsonb_array_elements(v_merged) x
      where public.mv_norm_key(x->>'serie')=public.mv_norm_key(olde->>'serie')
    ) then
      v_merged:=v_merged||jsonb_build_array(olde);
    end if;
  end loop;

  if jsonb_array_length(v_merged)>8 then
    raise exception 'La solicitud no puede superar 8 equipos, incluyendo los ya recibidos';
  end if;

  v_hist:=public.mv_ea_historial_agregar(
    r.historial,p_usuario,p_perfil,'SOLICITUD COMPLETADA POR TECNICO',
    jsonb_array_length(v_merged)::text||' equipo(s)'
  );

  update public.equipos_averiados_solicitudes_migracion
     set estado='PENDIENTE DE ENTREGA',
         cantidad_referencial=jsonb_array_length(v_merged),
         equipos=v_merged,
         fecha_completado_tecnico=v_now::date,
         hora_completado_tecnico=v_now::time,
         ultima_actualizacion=v_now,
         historial=v_hist,
         updated_at=now()
   where id=p_id;

  return jsonb_build_object(
    'ok',true,'modulo','EQUIPOS_AVERIADOS','accion','COMPLETAR_TECNICO',
    'id',p_id,'equipos',jsonb_array_length(v_merged)
  );
end;
$$;

create or replace function public.mv_ea_preparar_recepcion_v399(
  p_id text,
  p_solicitud_id text,
  p_usuario text,
  p_nombre_actor text,
  p_perfil text,
  p_sede_actor text,
  p_decisiones jsonb,
  p_observacion_general text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.equipos_averiados_solicitudes_migracion%rowtype;
  c public.equipos_averiados_cargos_migracion%rowtype;
  v_now timestamp without time zone:=timezone('America/Lima',now());
  v_sid text:=upper(trim(coalesce(p_solicitud_id,'')));
  v_p text:=public.mv_norm_key(p_perfil);
  e jsonb;
  d jsonb;
  newe jsonb;
  equipos_out jsonb:='[]'::jsonb;
  nuevos_recibidos jsonb:='[]'::jsonb;
  estado_dec text;
  obs text;
  total_rec integer:=0;
  total_pen integer:=0;
  total_obs integer:=0;
  total_rech integer:=0;
  v_estado text:='PENDIENTE DE ENTREGA';
  v_hist jsonb;
  v_idcargo text;
  v_operacion jsonb;
begin
  if v_p not in ('ALMACEN','RESPONSABLEALMACEN','RESPONSABLEDEALMACEN','JEFATURAALMACEN') then
    raise exception 'Solo Responsable o Jefatura de Almacén puede validar la recepción';
  end if;
  if v_sid='' then raise exception 'Falta solicitudId de idempotencia'; end if;
  if p_decisiones is null or jsonb_typeof(p_decisiones)<>'array' then p_decisiones:='[]'::jsonb; end if;

  perform pg_advisory_xact_lock(hashtext('EA|'||p_id));

  select * into r
  from public.equipos_averiados_solicitudes_migracion
  where id=p_id
  for update;
  if not found then raise exception 'No se encontró la solicitud de equipos averiados'; end if;

  if v_p in ('ALMACEN','RESPONSABLEALMACEN','RESPONSABLEDEALMACEN')
     and public.mv_norm_key(r.sede)<>public.mv_norm_key(p_sede_actor) then
    raise exception 'La solicitud pertenece a otra sede';
  end if;

  if r.ultima_solicitud_id_recepcion=v_sid then
    select * into c
    from public.equipos_averiados_cargos_migracion
    where solicitud_id_cliente=v_sid
    limit 1;
    return jsonb_build_object(
      'ok',true,'yaExistia',true,'aplicado',true,'id',p_id,'estado',r.estado,
      'solicitudId',v_sid,
      'cargo',case when c.id_cargo is null then null else
        jsonb_build_object('idCargo',c.id_cargo,'linkPdf',c.link_pdf,'nombrePdf',c.nombre_pdf,
                           'estado',c.estado,'storagePath',c.storage_path,'totalEquipos',c.total_equipos) end
    );
  end if;

  select * into c
  from public.equipos_averiados_cargos_migracion
  where solicitud_id_cliente=v_sid
  limit 1;

  if c.id_cargo is not null then
    return jsonb_build_object(
      'ok',true,'yaExistia',true,'aplicado',false,'requiereFinalizar',true,
      'id',p_id,'estado',r.estado,'solicitudId',v_sid,
      'cargo',jsonb_build_object(
        'idCargo',c.id_cargo,'linkPdf',c.link_pdf,'nombrePdf',c.nombre_pdf,
        'estado',c.estado,'storagePath',c.storage_path,'totalEquipos',c.total_equipos,
        'equipos',c.equipos
      )
    );
  end if;

  if jsonb_array_length(r.equipos)=0 then
    raise exception 'El técnico todavía no registró los equipos';
  end if;

  for e in select value from jsonb_array_elements(r.equipos)
  loop
    if upper(trim(coalesce(e->>'estadoRecepcion','')))='RECIBIDO' then
      equipos_out:=equipos_out||jsonb_build_array(e);
      continue;
    end if;

    d:=null;
    select value into d
    from jsonb_array_elements(p_decisiones)
    where public.mv_norm_key(value->>'serie')=public.mv_norm_key(e->>'serie')
    limit 1;

    if d is null then
      equipos_out:=equipos_out||jsonb_build_array(e);
      continue;
    end if;

    estado_dec:=upper(trim(coalesce(d->>'estado',d->>'estadoRecepcion','PENDIENTE')));
    if estado_dec not in ('PENDIENTE','RECIBIDO','OBSERVADO','RECHAZADO') then
      raise exception 'Estado de recepción no válido';
    end if;
    obs:=trim(coalesce(d->>'observacion',d->>'observacionAlmacen',''));

    newe:=e || jsonb_build_object(
      'estadoRecepcion',estado_dec,
      'observacionAlmacen',obs
    );

    if estado_dec='RECIBIDO' then
      newe:=newe||jsonb_build_object(
        'recibidoPor',p_usuario,
        'fechaRecepcion',to_char(v_now,'DD/MM/YYYY'),
        'horaRecepcion',to_char(v_now,'HH24:MI:SS'),
        'estadoWin','','fechaWin','','horaWin','','recibidoWinPor','','documentoWin',''
      );
      nuevos_recibidos:=nuevos_recibidos||jsonb_build_array(newe);
    end if;

    equipos_out:=equipos_out||jsonb_build_array(newe);
  end loop;

  select
    count(*) filter(where upper(trim(coalesce(x->>'estadoRecepcion','')))='RECIBIDO'),
    count(*) filter(where upper(trim(coalesce(x->>'estadoRecepcion','')))='PENDIENTE'),
    count(*) filter(where upper(trim(coalesce(x->>'estadoRecepcion','')))='OBSERVADO'),
    count(*) filter(where upper(trim(coalesce(x->>'estadoRecepcion','')))='RECHAZADO')
  into total_rec,total_pen,total_obs,total_rech
  from jsonb_array_elements(equipos_out) x;

  if total_rec=jsonb_array_length(equipos_out) then v_estado:='RECIBIDO POR ALMACEN';
  elsif total_rec>0 then v_estado:='RECIBIDO PARCIALMENTE';
  elsif total_obs>0 then v_estado:='OBSERVADO';
  elsif total_rech=jsonb_array_length(equipos_out) then v_estado:='RECHAZADO';
  else v_estado:='PENDIENTE DE ENTREGA';
  end if;

  v_hist:=public.mv_ea_historial_agregar(
    r.historial,p_usuario,p_perfil,'CONFORMIDAD DE RECEPCION',
    'Recibidos: '||total_rec||', pendientes: '||total_pen||
    ', observados: '||total_obs||', rechazados: '||total_rech
  );

  v_operacion:=jsonb_build_object(
    'version','V399-POSTGRESQL',
    'solicitudId',v_sid,
    'idSolicitud',p_id,
    'ahora',v_now,
    'estado',v_estado,
    'equipos',equipos_out,
    'observacionGeneral',coalesce(p_observacion_general,''),
    'validadoPor',coalesce(p_nombre_actor,p_usuario),
    'perfilValidacion',p_perfil,
    'historial',v_hist,
    'totalRecibidos',total_rec,
    'totalPendientes',total_pen,
    'totalObservados',total_obs,
    'totalRechazados',total_rech
  );

  if jsonb_array_length(nuevos_recibidos)>0 then
    v_idcargo:=public.mv_ea_nuevo_id('CEA');

    nuevos_recibidos:=(
      select coalesce(jsonb_agg(
        value||jsonb_build_object('cargoId',v_idcargo)
      ),'[]'::jsonb)
      from jsonb_array_elements(nuevos_recibidos)
    );

    equipos_out:=(
      select coalesce(jsonb_agg(
        case
          when upper(trim(coalesce(value->>'estadoRecepcion','')))='RECIBIDO'
               and nullif(coalesce(value->>'cargoId',''),'') is null
          then value||jsonb_build_object('cargoId',v_idcargo)
          else value
        end
      ),'[]'::jsonb)
      from jsonb_array_elements(equipos_out)
    );

    v_operacion:=v_operacion||jsonb_build_object(
      'equipos',equipos_out,'idCargo',v_idcargo
    );

    insert into public.equipos_averiados_cargos_migracion(
      id_cargo,id_solicitud,fecha_cargo,hora_cargo,sede,plataforma,cuadrilla,
      usuario_tecnico,tecnico,recibido_por,perfil_recibe,total_equipos,equipos,
      estado,solicitud_id_cliente,operacion,source_kind
    ) values (
      v_idcargo,r.id,v_now::date,v_now::time,r.sede,r.plataforma,r.cuadrilla,
      r.usuario_tecnico,r.tecnico,coalesce(p_nombre_actor,p_usuario),p_perfil,
      jsonb_array_length(nuevos_recibidos),nuevos_recibidos,'PENDIENTE_PDF',
      v_sid,v_operacion,'POSTGRESQL_PILOT'
    );

    return jsonb_build_object(
      'ok',true,'yaExistia',false,'aplicado',false,'requierePdf',true,
      'id',p_id,'estado',v_estado,'solicitudId',v_sid,
      'totalRecibidos',total_rec,
      'cargo',jsonb_build_object(
        'idCargo',v_idcargo,'totalEquipos',jsonb_array_length(nuevos_recibidos),
        'equipos',nuevos_recibidos
      )
    );
  end if;

  update public.equipos_averiados_solicitudes_migracion
     set estado=v_estado,
         equipos=equipos_out,
         validado_por=coalesce(p_nombre_actor,p_usuario),
         perfil_validacion=p_perfil,
         fecha_validacion=v_now::date,
         hora_validacion=v_now::time,
         observacion_almacen=coalesce(p_observacion_general,''),
         ultima_actualizacion=v_now,
         historial=v_hist,
         ultima_solicitud_id_recepcion=v_sid,
         updated_at=now()
   where id=p_id;

  return jsonb_build_object(
    'ok',true,'yaExistia',false,'aplicado',true,'requierePdf',false,
    'id',p_id,'estado',v_estado,'solicitudId',v_sid,'totalRecibidos',total_rec,'cargo',null
  );
end;
$$;

create or replace function public.mv_ea_finalizar_recepcion_v399(
  p_solicitud_id text,
  p_link_pdf text,
  p_nombre_pdf text,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.equipos_averiados_cargos_migracion%rowtype;
  r public.equipos_averiados_solicitudes_migracion%rowtype;
  op jsonb;
  v_now timestamp without time zone:=timezone('America/Lima',now());
begin
  select * into c
  from public.equipos_averiados_cargos_migracion
  where solicitud_id_cliente=upper(trim(p_solicitud_id))
  for update;
  if not found then raise exception 'No se encontró el cargo de la recepción'; end if;

  select * into r
  from public.equipos_averiados_solicitudes_migracion
  where id=c.id_solicitud
  for update;
  if not found then raise exception 'No se encontró la solicitud asociada al cargo'; end if;

  op:=c.operacion;

  update public.equipos_averiados_cargos_migracion
     set link_pdf=coalesce(nullif(p_link_pdf,''),link_pdf),
         nombre_pdf=coalesce(nullif(p_nombre_pdf,''),nombre_pdf),
         storage_path=coalesce(nullif(p_storage_path,''),storage_path),
         estado='GENERADO',
         updated_at=now()
   where id_cargo=c.id_cargo;

  if r.ultima_solicitud_id_recepcion<>upper(trim(p_solicitud_id))
     or r.ultima_solicitud_id_recepcion is null then
    update public.equipos_averiados_solicitudes_migracion
       set estado=coalesce(op->>'estado',estado),
           equipos=coalesce(op->'equipos',equipos),
           validado_por=coalesce(op->>'validadoPor',validado_por),
           perfil_validacion=coalesce(op->>'perfilValidacion',perfil_validacion),
           fecha_validacion=coalesce((op->>'ahora')::timestamp::date,v_now::date),
           hora_validacion=coalesce((op->>'ahora')::timestamp::time,v_now::time),
           observacion_almacen=coalesce(op->>'observacionGeneral',''),
           id_cargo=c.id_cargo,
           link_cargo=coalesce(nullif(p_link_pdf,''),c.link_pdf),
           ultima_actualizacion=coalesce((op->>'ahora')::timestamp,v_now),
           historial=coalesce(op->'historial',historial),
           ultima_solicitud_id_recepcion=upper(trim(p_solicitud_id)),
           updated_at=now()
     where id=r.id;
  end if;

  return jsonb_build_object(
    'ok',true,'modulo','EQUIPOS_AVERIADOS','accion','VALIDAR_RECEPCION',
    'id',r.id,'estado',coalesce(op->>'estado',r.estado),
    'solicitudId',upper(trim(p_solicitud_id)),
    'totalRecibidos',coalesce((op->>'totalRecibidos')::integer,c.total_equipos),
    'cargo',jsonb_build_object(
      'idCargo',c.id_cargo,
      'linkPdf',coalesce(nullif(p_link_pdf,''),c.link_pdf),
      'nombrePdf',coalesce(nullif(p_nombre_pdf,''),c.nombre_pdf),
      'storagePath',coalesce(nullif(p_storage_path,''),c.storage_path),
      'totalEquipos',c.total_equipos
    )
  );
end;
$$;

create or replace function public.mv_ea_verificar_recepcion_v399(
  p_id text,
  p_solicitud_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.equipos_averiados_solicitudes_migracion%rowtype;
  c public.equipos_averiados_cargos_migracion%rowtype;
  sid text:=upper(trim(coalesce(p_solicitud_id,'')));
begin
  select * into r
  from public.equipos_averiados_solicitudes_migracion
  where id=p_id;
  if not found then raise exception 'No se encontró la solicitud de equipos averiados'; end if;

  select * into c
  from public.equipos_averiados_cargos_migracion
  where solicitud_id_cliente=sid
  limit 1;

  return jsonb_build_object(
    'ok',true,'modulo','EQUIPOS_AVERIADOS','accion','VERIFICAR_RECEPCION_V399',
    'confirmado',r.ultima_solicitud_id_recepcion=sid,
    'solicitudId',sid,'id',p_id,'estado',r.estado,
    'cargo',case when c.id_cargo is null then null else jsonb_build_object(
      'idCargo',c.id_cargo,'linkPdf',c.link_pdf,'nombrePdf',c.nombre_pdf,
      'storagePath',c.storage_path,'estado',c.estado,'totalEquipos',c.total_equipos
    ) end
  );
end;
$$;

create or replace function public.mv_ea_volver_pendiente(
  p_id text,
  p_usuario text,
  p_perfil text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.equipos_averiados_solicitudes_migracion%rowtype;
  e jsonb;
  arr jsonb:='[]'::jsonb;
  hist jsonb;
  v_now timestamp without time zone:=timezone('America/Lima',now());
begin
  if public.mv_norm_key(p_perfil)<>'JEFATURAALMACEN' then
    raise exception 'Solo Jefatura de Almacén puede volver una recepción a pendiente';
  end if;

  select * into r
  from public.equipos_averiados_solicitudes_migracion
  where id=p_id
  for update;
  if not found then raise exception 'No se encontró la solicitud de equipos averiados'; end if;

  if upper(trim(r.estado)) not in ('RECIBIDO POR ALMACEN','RECIBIDO PARCIALMENTE') then
    raise exception 'La solicitud no tiene una recepción confirmada para revertir';
  end if;

  for e in select value from jsonb_array_elements(r.equipos)
  loop
    arr:=arr||jsonb_build_array(
      e||jsonb_build_object(
        'estadoRecepcion','PENDIENTE','observacionAlmacen','','recibidoPor','',
        'fechaRecepcion','','horaRecepcion','','cargoId','','estadoWin','',
        'fechaWin','','horaWin','','recibidoWinPor','','documentoWin',''
      )
    );
  end loop;

  hist:=public.mv_ea_historial_agregar(
    r.historial,p_usuario,p_perfil,'RECEPCION VUELTA A PENDIENTE',
    'La conformidad anterior fue revertida por Jefatura de Almacén. El cargo anterior permanece en el historial de cargos.'
  );

  update public.equipos_averiados_solicitudes_migracion
     set estado='PENDIENTE DE ENTREGA',
         equipos=arr,
         validado_por=null,perfil_validacion=null,fecha_validacion=null,hora_validacion=null,
         observacion_almacen='',id_cargo=null,link_cargo=null,
         estado_win='',fecha_entrega_win=null,hora_entrega_win=null,
         recibido_win_por='',documento_win='',observacion_win='',
         ultima_actualizacion=v_now,historial=hist,ultima_solicitud_id_recepcion=null,
         updated_at=now()
   where id=p_id;

  return jsonb_build_object(
    'ok',true,'modulo','EQUIPOS_AVERIADOS','accion','VOLVER_PENDIENTE',
    'id',p_id,'estado','PENDIENTE DE ENTREGA'
  );
end;
$$;

revoke execute on function public.mv_ea_registrar_tecnico(text,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_ea_crear_solicitud_almacen(text,text,text,text,text,text,text,text,integer,text) from public,anon,authenticated;
revoke execute on function public.mv_ea_completar_tecnico(text,text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_ea_preparar_recepcion_v399(text,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
revoke execute on function public.mv_ea_finalizar_recepcion_v399(text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_ea_verificar_recepcion_v399(text,text) from public,anon,authenticated;
revoke execute on function public.mv_ea_volver_pendiente(text,text,text) from public,anon,authenticated;

grant execute on function public.mv_ea_registrar_tecnico(text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.mv_ea_crear_solicitud_almacen(text,text,text,text,text,text,text,text,integer,text) to service_role;
grant execute on function public.mv_ea_completar_tecnico(text,text,text,jsonb) to service_role;
grant execute on function public.mv_ea_preparar_recepcion_v399(text,text,text,text,text,text,jsonb,text) to service_role;
grant execute on function public.mv_ea_finalizar_recepcion_v399(text,text,text,text) to service_role;
grant execute on function public.mv_ea_verificar_recepcion_v399(text,text) to service_role;
grant execute on function public.mv_ea_volver_pendiente(text,text,text) to service_role;
