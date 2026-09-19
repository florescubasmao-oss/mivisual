
-- 043_actas_transacciones_v344.sql
-- Port de reglas V344: identidad, registro/reemplazo, faltantes, validaciones y entrega física.
-- Las funciones quedan cerradas a service_role hasta completar el enlace Auth/RPC.

create or replace function public.mv_actas_key(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(upper(trim(coalesce(v,''))),'[^A-Z0-9]','','g');
$$;

create or replace function public.mv_actas_numero_key(v text)
returns text
language plpgsql
immutable
as $$
declare
  k text := public.mv_actas_key(v);
  z text;
begin
  if k ~ '^[0-9]+$' then
    z := ltrim(k,'0');
    return case when z='' then '0' else z end;
  end if;
  return k;
end;
$$;

create or replace function public.mv_actas_cuadrilla_key(v text)
returns text
language plpgsql
immutable
as $$
declare
  t text := upper(trim(coalesce(v,'')));
  n text;
  modalidad text := '';
begin
  t := regexp_replace(t,'[[:space:]]+',' ','g');
  n := substring(t from '^P[[:space:]]*([0-9]+)');
  if n is null then
    return regexp_replace(t,'[^A-Z0-9]','','g');
  end if;
  if t like '%TRASLADO%' then modalidad := 'TRASLADO';
  elsif t ~ '(^| )SGA( |$)' then modalidad := 'SGA';
  elsif t ~ '(^| )SGI( |$)' then modalidad := 'SGI';
  end if;
  return 'P'||(n::integer)::text||'|'||modalidad;
end;
$$;

revoke execute on function public.mv_actas_key(text) from public,anon,authenticated;
revoke execute on function public.mv_actas_numero_key(text) from public,anon,authenticated;
revoke execute on function public.mv_actas_cuadrilla_key(text) from public,anon,authenticated;
grant execute on function public.mv_actas_key(text) to service_role;
grant execute on function public.mv_actas_numero_key(text) to service_role;
grant execute on function public.mv_actas_cuadrilla_key(text) to service_role;

create unique index if not exists actas_migracion_orden_v344_uidx
on public.actas_migracion(public.mv_actas_key(codigo_orden))
where public.mv_actas_key(codigo_orden) not in ('','0');

create unique index if not exists actas_migracion_numero_v344_uidx
on public.actas_migracion(public.mv_actas_numero_key(numero_acta))
where public.mv_actas_numero_key(numero_acta) <> '';

create or replace function public.mv_actas_resolver_mapa_v344(
  p_codigo_orden text,
  p_codigo_pedido text,
  p_cuadrilla text
)
returns table(
  orden_id text,
  codigo_cliente text,
  numero_documento text,
  cliente text,
  cuadrilla text,
  sede text,
  tipo_trabajo text,
  fecha_gestion date,
  score_match integer,
  tipo_match text,
  codigo_partida text,
  tipo_partida text
)
language sql
stable
security definer
set search_path=public
as $$
with k as (
 select public.mv_actas_key(p_codigo_orden) orden_key,
        public.mv_actas_key(p_codigo_pedido) pedido_key,
        public.mv_actas_cuadrilla_key(p_cuadrilla) cuadrilla_key
), candidato as (
 select
   o.*,
   (
     case when k.orden_key<>'' and public.mv_actas_key(o.orden_id)=k.orden_key then 120 else 0 end +
     case when k.pedido_key<>'' and public.mv_actas_key(o.codigo_cliente)=k.pedido_key then 110 else 0 end +
     case when k.orden_key<>'' and public.mv_actas_key(o.codigo_cliente)=k.orden_key then 45 else 0 end +
     case when k.pedido_key<>'' and public.mv_actas_key(o.orden_id)=k.pedido_key then 40 else 0 end +
     case when k.orden_key<>'' and k.pedido_key<>''
                and public.mv_actas_key(o.orden_id)=k.orden_key
                and public.mv_actas_key(o.codigo_cliente)=k.pedido_key then 100 else 0 end
   )::integer score_match
 from public.ordenes o cross join k
 where public.mv_actas_cuadrilla_key(o.cuadrilla)=k.cuadrilla_key
   and (
     (k.orden_key<>'' and (public.mv_actas_key(o.orden_id)=k.orden_key or public.mv_actas_key(o.codigo_cliente)=k.orden_key))
     or
     (k.pedido_key<>'' and (public.mv_actas_key(o.codigo_cliente)=k.pedido_key or public.mv_actas_key(o.orden_id)=k.pedido_key))
   )
 order by score_match desc,o.fecha_ultimo_estado desc nulls last,o.id desc
 limit 1
), motor as (
 select p.orden_id,p.partida_motor
 from public.mv_produccion_partida_motor_migracion_v1 p
 join candidato c on c.orden_id=p.orden_id
 limit 1
)
select
 c.orden_id,c.codigo_cliente,c.numero_documento,c.cliente,c.cuadrilla,c.sede,c.tipo_trabajo,
 coalesce(c.fecha_fin_visita::date,c.fecha_inicio_visita::date,c.fecha_solicitud) fecha_gestion,
 c.score_match,
 case
   when public.mv_actas_key(c.orden_id)=public.mv_actas_key(p_codigo_orden)
    and public.mv_actas_key(c.codigo_cliente)=public.mv_actas_key(p_codigo_pedido) then 'ORDEN_PEDIDO_EXACTO'
   when public.mv_actas_key(c.orden_id)=public.mv_actas_key(p_codigo_orden) then 'ORDEN'
   when public.mv_actas_key(c.codigo_cliente)=public.mv_actas_key(p_codigo_pedido) then 'PEDIDO'
   when public.mv_actas_key(c.codigo_cliente)=public.mv_actas_key(p_codigo_orden) then 'CRUCE_ORDEN_CLIENTE'
   when public.mv_actas_key(c.orden_id)=public.mv_actas_key(p_codigo_pedido) then 'CRUCE_PEDIDO_ORDEN'
   else null
 end tipo_match,
 m.partida_motor,
 cp.tipo_orden
from candidato c
left join motor m on m.orden_id=c.orden_id
left join lateral (
 select x.tipo_orden
 from public.catalogo_partidas_migracion x
 where upper(trim(x.codigo))=upper(trim(m.partida_motor))
 order by x.source_row
 limit 1
) cp on true;
$$;

revoke execute on function public.mv_actas_resolver_mapa_v344(text,text,text) from public,anon,authenticated;
grant execute on function public.mv_actas_resolver_mapa_v344(text,text,text) to service_role;

create or replace function public.mv_actas_registrar_v344(
  p_usuario text,
  p_codigo_orden text,
  p_codigo_pedido text,
  p_numero_acta text,
  p_nombre_archivo text,
  p_link_acta text,
  p_drive_file_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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
      (anterior.origen_registro='ALMACEN' and anterior.link_acta is null)
      or anterior.resultado_almacen='OBSERVADO'
      or anterior.resultado_jefatura='OBSERVADO';
    if not permitir_reemplazo then
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
$$;

create or replace function public.mv_actas_registrar_faltante_v344(
  p_usuario text,
  p_cuadrilla text,
  p_fecha_gestion date,
  p_tipo_ejecucion text,
  p_tipo_partida text,
  p_codigo_orden text,
  p_codigo_pedido text,
  p_numero_acta text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u record;
  t record;
  v_id uuid;
  v_legacy text;
  v_num text := nullif(trim(coalesce(p_numero_acta,'')),'');
  v_tipo text := upper(trim(coalesce(p_tipo_ejecucion,'')));
begin
  select * into u from public.app_users
   where upper(trim(usuario))=upper(trim(p_usuario))
     and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
   order by id limit 1;
  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
  if upper(trim(coalesce(u.perfil,''))) not in ('ALMACEN','JEFATURA ALMACEN') then
    raise exception 'Solo Almacén o Jefatura Almacén pueden registrar actas faltantes';
  end if;

  select * into t from public.app_users
   where public.mv_actas_cuadrilla_key(cuadrilla)=public.mv_actas_cuadrilla_key(p_cuadrilla)
     and upper(trim(coalesce(perfil,'')))='TECNICO'
   order by case when upper(trim(coalesce(estado,'')))='ACTIVO' then 0 else 1 end,id limit 1;
  if not found then raise exception 'La cuadrilla seleccionada no existe'; end if;
  if upper(trim(u.perfil))='ALMACEN' and upper(trim(coalesce(u.sede,'')))<>upper(trim(coalesce(t.sede,''))) then
    raise exception 'Almacén solo puede registrar faltantes de su sede';
  end if;
  if p_fecha_gestion is null then raise exception 'Debe ingresar la fecha de gestión'; end if;
  if p_fecha_gestion>(now() at time zone 'America/Lima')::date then raise exception 'La fecha de gestión no puede ser futura'; end if;
  if nullif(trim(coalesce(p_tipo_partida,'')),'') is null then raise exception 'Debe seleccionar el tipo de partida'; end if;
  if v_tipo not in ('INSTALACION','VISITA TECNICA') then raise exception 'Tipo de ejecución no válido'; end if;
  if public.mv_actas_key(p_codigo_orden) in ('','0') then raise exception 'Debe ingresar el código de orden'; end if;
  if public.mv_actas_key(p_codigo_pedido)='' then raise exception 'Debe ingresar el código de pedido'; end if;
  if nullif(trim(coalesce(p_motivo,'')),'') is null then raise exception 'Debe ingresar el motivo del acta faltante'; end if;

  if exists(select 1 from public.actas_migracion where public.mv_actas_key(codigo_orden)=public.mv_actas_key(p_codigo_orden)) then
    raise exception 'El Código de Orden ya está registrado en otra acta. No se permiten códigos de orden duplicados.';
  end if;
  if v_num is not null and exists(select 1 from public.actas_migracion where public.mv_actas_numero_key(numero_acta)=public.mv_actas_numero_key(v_num)) then
    raise exception 'El Número de Acta ya está registrado. No se permiten números de acta duplicados.';
  end if;

  v_legacy:='ACTA-'||trim(p_codigo_orden)||case when v_num is not null then '-'||v_num else '' end;
  insert into public.actas_migracion(
    legacy_id,registrado_at,sede,cuadrilla,supervisor,tecnico,fecha_gestion,tipo_ejecucion,tipo_partida,
    codigo_orden,codigo_orden_norm,codigo_pedido,codigo_pedido_norm,numero_acta,numero_acta_norm,
    estado,version,estado_entrega_fisica,origen_registro,motivo_acta_faltante,registrado_faltante_por,
    registrado_faltante_at,estado_fecha_carpeta,intentos_fecha,fecha_carpeta,fecha_confirmada_por,
    perfil_confirmacion_fecha,origen_fecha_carpeta,source_kind,updated_at
  ) values(
    v_legacy,now(),upper(trim(t.sede)),t.cuadrilla,t.usuario_supervisor,t.usuario,p_fecha_gestion,v_tipo,trim(p_tipo_partida),
    trim(p_codigo_orden),public.mv_actas_key(p_codigo_orden),trim(p_codigo_pedido),public.mv_actas_key(p_codigo_pedido),
    v_num,case when v_num is null then null else public.mv_actas_numero_key(v_num) end,
    'PENDIENTE',0,'PENDIENTE','ALMACEN',trim(p_motivo),u.usuario,now(),'CONFIRMADA',0,p_fecha_gestion,u.usuario,u.perfil,
    'REGISTRO_ALMACEN','POSTGRESQL',now()
  ) returning id into v_id;

  insert into public.actas_eventos_migracion(acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen)
  values(v_id,'REGISTRAR_FALTANTE',u.usuario,u.perfil,null,
    jsonb_build_object('estado','PENDIENTE','origenRegistro','ALMACEN','fechaGestion',p_fecha_gestion,'motivo',p_motivo),'POSTGRESQL');

  return jsonb_build_object('ok',true,'modulo','ACTAS','accion','REGISTRAR_FALTANTE','id',v_id,'legacyId',v_legacy);
exception
  when unique_violation then
    raise exception 'El Código de Orden o Número de Acta ya está registrado.';
end;
$$;

create or replace function public.mv_actas_validar_v344(
  p_usuario text,
  p_acta_id uuid,
  p_resultado text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 u record;
 a public.actas_migracion%rowtype;
 r text := upper(trim(coalesce(p_resultado,'')));
 old jsonb;
begin
 select * into u from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id limit 1;
 if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
 if upper(trim(coalesce(u.perfil,''))) not in ('ALMACEN','JEFATURA ALMACEN') then
   raise exception 'Solo Almacén o Jefatura Almacén pueden validar actas';
 end if;
 if r not in ('CORRECTO','OBSERVADO') then raise exception 'Resultado no válido'; end if;
 if r='OBSERVADO' and nullif(trim(coalesce(p_motivo,'')),'') is null then raise exception 'Debe ingresar el motivo de observación'; end if;

 select * into a from public.actas_migracion where id=p_acta_id for update;
 if not found then raise exception 'No se encontró el acta'; end if;
 if a.link_acta is null then raise exception 'El técnico aún no ha subido el PDF del acta faltante'; end if;
 if upper(trim(u.perfil))='ALMACEN' and upper(trim(coalesce(u.sede,'')))<>upper(trim(coalesce(a.sede,''))) then
   raise exception 'Almacén solo puede validar actas de su sede';
 end if;

 old:=jsonb_build_object('estado',a.estado,'resultadoAlmacen',a.resultado_almacen,'resultadoJefatura',a.resultado_jefatura);

 if upper(trim(u.perfil))='ALMACEN' then
   update public.actas_migracion set
     resultado_almacen=r,motivo_almacen=case when r='OBSERVADO' then trim(p_motivo) else null end,
     validado_almacen_por=u.usuario,validado_almacen_at=now(),estado='PENDIENTE',updated_at=now()
   where id=a.id;
 else
   update public.actas_migracion set
     resultado_jefatura=r,motivo_jefatura=case when r='OBSERVADO' then trim(p_motivo) else null end,
     validado_jefatura_por=u.usuario,validado_jefatura_at=now(),
     estado=case when r='CORRECTO' then 'FINALIZADO' else 'PENDIENTE' end,updated_at=now()
   where id=a.id;
 end if;

 insert into public.actas_eventos_migracion(acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen)
 values(a.id,case when upper(trim(u.perfil))='ALMACEN' then 'VALIDAR_ALMACEN' else 'VALIDAR_JEFATURA' end,
        u.usuario,u.perfil,old,
        jsonb_build_object('resultado',r,'estado',case when upper(trim(u.perfil))='JEFATURA ALMACEN' and r='CORRECTO' then 'FINALIZADO' else 'PENDIENTE' end,'motivo',case when r='OBSERVADO' then trim(p_motivo) else null end),
        'POSTGRESQL');

 return jsonb_build_object('ok',true,'modulo','ACTAS','accion',case when upper(trim(u.perfil))='ALMACEN' then 'VALIDAR_ALMACEN' else 'VALIDAR_JEFATURA' end,
   'id',a.id,'resultado',r,'estado',case when upper(trim(u.perfil))='JEFATURA ALMACEN' and r='CORRECTO' then 'FINALIZADO' else 'PENDIENTE' end);
end;
$$;

create or replace function public.mv_actas_entrega_fisica_v344(
  p_usuario text,
  p_acta_id uuid,
  p_estado text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 u record;
 a public.actas_migracion%rowtype;
 e text := upper(trim(coalesce(p_estado,'')));
begin
 select * into u from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id limit 1;
 if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
 if upper(trim(coalesce(u.perfil,''))) not in ('ALMACEN','JEFATURA ALMACEN') then
   raise exception 'Solo Almacén o Jefatura Almacén pueden gestionar la entrega física';
 end if;
 if e not in ('PENDIENTE','ENTREGADA') then raise exception 'Estado de entrega física no válido'; end if;

 select * into a from public.actas_migracion where id=p_acta_id for update;
 if not found then raise exception 'No se encontró el acta'; end if;
 if a.link_acta is null then raise exception 'El técnico aún no ha completado el acta faltante'; end if;
 if upper(trim(u.perfil))='ALMACEN' and upper(trim(coalesce(u.sede,'')))<>upper(trim(coalesce(a.sede,''))) then
   raise exception 'Almacén solo puede gestionar actas de su sede';
 end if;
 if e='PENDIENTE' and upper(trim(u.perfil))<>'JEFATURA ALMACEN' then
   raise exception 'Solo Jefatura de Almacén puede regresar una entrega a pendiente';
 end if;
 if e='PENDIENTE' and nullif(trim(coalesce(p_motivo,'')),'') is null then
   raise exception 'Debe ingresar el motivo de reversión';
 end if;
 if upper(trim(u.perfil))='ALMACEN' and a.estado_entrega_fisica='ENTREGADA' then
   raise exception 'La entrega ya fue confirmada. Solo Jefatura de Almacén puede revertirla';
 end if;

 update public.actas_migracion set
   estado_entrega_fisica=e,confirmado_fisico_por=u.usuario,perfil_confirmacion_fisica=u.perfil,
   confirmado_fisico_at=now(),motivo_reversion_fisica=case when e='PENDIENTE' then trim(p_motivo) else null end,
   updated_at=now()
 where id=a.id;

 insert into public.actas_eventos_migracion(acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen)
 values(a.id,'ENTREGA_FISICA',u.usuario,u.perfil,
   jsonb_build_object('estadoEntregaFisica',a.estado_entrega_fisica,'motivoReversion',a.motivo_reversion_fisica),
   jsonb_build_object('estadoEntregaFisica',e,'motivoReversion',case when e='PENDIENTE' then trim(p_motivo) else null end),
   'POSTGRESQL');

 return jsonb_build_object('ok',true,'modulo','ACTAS','accion','ENTREGA_FISICA','id',a.id,'estado',e,'confirmadoPor',u.usuario,'perfil',u.perfil);
end;
$$;

create or replace function public.mv_actas_confirmar_fecha_v344(
  p_usuario text,
  p_acta_id uuid,
  p_fecha_gestion date
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 u record;
 a public.actas_migracion%rowtype;
begin
 select * into u from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id limit 1;
 if not found then raise exception 'Usuario no encontrado o inactivo'; end if;
 if upper(trim(coalesce(u.perfil,''))) not in ('SUPERVISOR','ALMACEN','JEFATURA ALMACEN') then
   raise exception 'Solo Supervisor o Almacén pueden confirmar la fecha de atención';
 end if;
 if p_fecha_gestion is null or p_fecha_gestion>(now() at time zone 'America/Lima')::date then
   raise exception 'La fecha de atención no es válida o es futura';
 end if;

 select * into a from public.actas_migracion where id=p_acta_id for update;
 if not found then raise exception 'No se encontró el acta'; end if;
 if a.link_acta is null then raise exception 'El acta todavía no tiene PDF'; end if;
 if upper(trim(u.perfil)) in ('SUPERVISOR','ALMACEN')
    and upper(trim(coalesce(u.sede,'')))<>upper(trim(coalesce(a.sede,''))) then
   raise exception 'El usuario solo puede confirmar actas de su sede';
 end if;
 if a.estado_fecha_carpeta<>'REQUIERE_CONFIRMACION' then
   raise exception 'Esta acta todavía no requiere confirmación manual de fecha';
 end if;

 update public.actas_migracion set
   fecha_gestion=p_fecha_gestion,estado_fecha_carpeta='CONFIRMADA',ultimo_intento_fecha=now(),
   fecha_carpeta=p_fecha_gestion,fecha_confirmada_por=u.usuario,perfil_confirmacion_fecha=u.perfil,
   origen_fecha_carpeta='CONFIRMACION_MANUAL',updated_at=now()
 where id=a.id;

 insert into public.actas_eventos_migracion(acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen)
 values(a.id,'CONFIRMAR_FECHA_ATENCION',u.usuario,u.perfil,
   jsonb_build_object('fechaGestion',a.fecha_gestion,'estadoFechaCarpeta',a.estado_fecha_carpeta),
   jsonb_build_object('fechaGestion',p_fecha_gestion,'estadoFechaCarpeta','CONFIRMADA'),
   'POSTGRESQL');

 return jsonb_build_object('ok',true,'modulo','ACTAS','accion','CONFIRMAR_FECHA_ATENCION','id',a.id,'fechaGestion',p_fecha_gestion,'confirmadoPor',u.usuario,'perfil',u.perfil);
end;
$$;

create or replace view public.mv_actas_pendientes_fecha_migracion
with (security_invoker=true) as
select
 a.id,a.legacy_id,a.sede,a.cuadrilla,a.codigo_orden,a.codigo_pedido,a.numero_acta,
 a.estado_fecha_carpeta,a.fecha_limite_verificacion,a.ultimo_intento_fecha,a.intentos_fecha,
 r.mapa_orden_id,
 coalesce(r.fecha_fin_visita::date,r.fecha_inicio_visita::date,r.fecha_solicitud) as fecha_gestion_mapa,
 case
   when r.mapa_orden_id is not null then 'UBICADA_MAPA'
   when a.fecha_limite_verificacion is not null and now()>=a.fecha_limite_verificacion then 'REQUIERE_CONFIRMACION'
   else 'SEGUIR_ESPERANDO'
 end as accion_sugerida
from public.actas_migracion a
left join public.mv_actas_mapa_resolucion r on r.acta_id=a.id
where a.link_acta is not null and a.estado_fecha_carpeta='PENDIENTE_MAPA';

revoke execute on function public.mv_actas_registrar_v344(text,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_actas_registrar_faltante_v344(text,text,date,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_actas_validar_v344(text,uuid,text,text) from public,anon,authenticated;
revoke execute on function public.mv_actas_entrega_fisica_v344(text,uuid,text,text) from public,anon,authenticated;
revoke execute on function public.mv_actas_confirmar_fecha_v344(text,uuid,date) from public,anon,authenticated;
revoke all on public.mv_actas_pendientes_fecha_migracion from anon,authenticated;

grant execute on function public.mv_actas_registrar_v344(text,text,text,text,text,text,text) to service_role;
grant execute on function public.mv_actas_registrar_faltante_v344(text,text,date,text,text,text,text,text,text) to service_role;
grant execute on function public.mv_actas_validar_v344(text,uuid,text,text) to service_role;
grant execute on function public.mv_actas_entrega_fisica_v344(text,uuid,text,text) to service_role;
grant execute on function public.mv_actas_confirmar_fecha_v344(text,uuid,date) to service_role;
grant select on public.mv_actas_pendientes_fecha_migracion to service_role;
