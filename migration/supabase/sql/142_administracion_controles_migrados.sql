-- 142_administracion_controles_migrados.sql
-- 20/09/2026
-- Cierra controles operativos de Administracion sin tocar main/Sheets.

create table if not exists public.administracion_eventos_migracion (
  id bigint generated always as identity primary key,
  actor_usuario text not null,
  actor_perfil text not null,
  evento text not null,
  entidad text not null,
  entidad_id text,
  estado_anterior jsonb,
  estado_nuevo jsonb,
  creado_at timestamptz not null default now()
);

alter table public.administracion_eventos_migracion enable row level security;
revoke all on public.administracion_eventos_migracion from anon,authenticated;
grant select,insert on public.administracion_eventos_migracion to service_role;
grant usage,select on sequence public.administracion_eventos_migracion_id_seq to service_role;

create or replace function public.mv_admin_contexto(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u public.app_users%rowtype;
  p public.app_permissions%rowtype;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'')))='ACTIVO'
  order by id
  limit 1;
  if not found then raise exception 'Usuario administrador no encontrado o inactivo'; end if;

  select * into p
  from public.app_permissions
  where perfil=u.perfil and modulo='ADMINISTRACION'
  limit 1;

  if not found or not p.activo or not p.ver or not p.administrar then
    raise exception 'Sin permiso de Administración';
  end if;

  return jsonb_build_object(
    'usuario',u.usuario,'perfil',u.perfil,'sede',coalesce(u.sede,''),
    'editar',coalesce(p.editar,false),'administrar',coalesce(p.administrar,false),
    'alcanceDatos',coalesce(p.alcance_datos,'')
  );
end $$;

create or replace function public.mv_admin_actualizar_permiso(
  p_usuario text,
  p_permiso_id bigint,
  p_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  ctx jsonb;
  r public.app_permissions%rowtype;
  old jsonb;
  nuevo jsonb;
  v_actor_perfil text;
  v_alcance text;
begin
  ctx:=public.mv_admin_contexto(p_usuario);
  v_actor_perfil:=ctx->>'perfil';

  select * into r from public.app_permissions where id=p_permiso_id for update;
  if not found then raise exception 'Permiso no encontrado'; end if;

  old:=to_jsonb(r);

  v_alcance:=case when p_data ? 'alcanceDatos'
    then upper(trim(coalesce(p_data->>'alcanceDatos','')))
    else r.alcance_datos end;
  if coalesce(v_alcance,'')='' then raise exception 'Alcance de datos obligatorio'; end if;

  if r.perfil=v_actor_perfil and r.modulo='ADMINISTRACION' then
    if (p_data ? 'activo' and not (p_data->>'activo')::boolean)
       or (p_data ? 'ver' and not (p_data->>'ver')::boolean)
       or (p_data ? 'administrar' and not (p_data->>'administrar')::boolean)
       or (p_data ? 'mostrarModulo' and not (p_data->>'mostrarModulo')::boolean) then
      raise exception 'No puede retirar el acceso de Administración a su propio perfil';
    end if;
  end if;

  update public.app_permissions
  set activo=case when p_data ? 'activo' then (p_data->>'activo')::boolean else activo end,
      orden_menu=case when p_data ? 'ordenMenu' then greatest(0,coalesce((p_data->>'ordenMenu')::integer,0)) else orden_menu end,
      mostrar_modulo=case when p_data ? 'mostrarModulo' then (p_data->>'mostrarModulo')::boolean else mostrar_modulo end,
      ver=case when p_data ? 'ver' then (p_data->>'ver')::boolean else ver end,
      registrar=case when p_data ? 'registrar' then (p_data->>'registrar')::boolean else registrar end,
      editar=case when p_data ? 'editar' then (p_data->>'editar')::boolean else editar end,
      observar=case when p_data ? 'observar' then (p_data->>'observar')::boolean else observar end,
      aprobar=case when p_data ? 'aprobar' then (p_data->>'aprobar')::boolean else aprobar end,
      validar=case when p_data ? 'validar' then (p_data->>'validar')::boolean else validar end,
      descargar=case when p_data ? 'descargar' then (p_data->>'descargar')::boolean else descargar end,
      administrar=case when p_data ? 'administrar' then (p_data->>'administrar')::boolean else administrar end,
      alcance_datos=v_alcance,
      vista_perfil=case when p_data ? 'vistaPerfil' then nullif(upper(trim(p_data->>'vistaPerfil')),'') else vista_perfil end,
      observacion=case when p_data ? 'observacion' then nullif(trim(p_data->>'observacion'),'') else observacion end,
      updated_at=now()
  where id=p_permiso_id
  returning to_jsonb(app_permissions.*) into nuevo;

  insert into public.administracion_eventos_migracion(
    actor_usuario,actor_perfil,evento,entidad,entidad_id,estado_anterior,estado_nuevo
  ) values (
    ctx->>'usuario',ctx->>'perfil','ACTUALIZAR_PERMISO','APP_PERMISSIONS',
    p_permiso_id::text,old,nuevo
  );

  return jsonb_build_object('ok',true,'accion','ACTUALIZAR_PERMISO','permiso',nuevo);
exception when invalid_text_representation then
  raise exception 'Valor inválido en permiso';
end $$;

create or replace function public.mv_admin_actualizar_usuario(
  p_usuario text,
  p_target_id bigint,
  p_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  ctx jsonb;
  u public.app_users%rowtype;
  old jsonb;
  nuevo jsonb;
  v_estado text;
  v_perfil text;
  v_correo text;
begin
  ctx:=public.mv_admin_contexto(p_usuario);

  select * into u from public.app_users where id=p_target_id for update;
  if not found then raise exception 'Usuario objetivo no encontrado'; end if;

  old:=to_jsonb(u);
  v_estado:=case when p_data ? 'estado' then upper(trim(p_data->>'estado')) else u.estado end;
  if v_estado not in ('ACTIVO','INACTIVO') then raise exception 'Estado de usuario no válido'; end if;

  if upper(trim(u.usuario))=upper(trim(ctx->>'usuario')) and v_estado='INACTIVO' then
    raise exception 'No puede inactivar su propio usuario';
  end if;

  v_perfil:=case when p_data ? 'perfil' then upper(trim(p_data->>'perfil')) else u.perfil end;
  if not exists(select 1 from public.app_permissions where perfil=v_perfil) then
    raise exception 'Perfil no reconocido en la matriz de permisos';
  end if;

  v_correo:=case when p_data ? 'correo' then lower(trim(coalesce(p_data->>'correo',''))) else coalesce(u.correo,'') end;
  if u.auth_user_id is not null and lower(trim(coalesce(u.correo,'')))<>v_correo then
    raise exception 'El correo de un usuario ya vinculado a Auth no se cambia desde este panel';
  end if;
  if v_correo<>'' and v_correo !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Correo no válido';
  end if;

  update public.app_users
  set nombres_apellidos=case when p_data ? 'nombresApellidos' then nullif(trim(p_data->>'nombresApellidos'),'') else nombres_apellidos end,
      correo=nullif(v_correo,''),
      perfil=v_perfil,
      sede=case when p_data ? 'sede' then nullif(upper(trim(p_data->>'sede')),'') else sede end,
      cuadrilla=case when p_data ? 'cuadrilla' then nullif(trim(p_data->>'cuadrilla'),'') else cuadrilla end,
      plataforma=case when p_data ? 'plataforma' then nullif(upper(trim(p_data->>'plataforma')),'') else plataforma end,
      nivel_acceso=case when p_data ? 'nivelAcceso' then nullif(upper(trim(p_data->>'nivelAcceso')),'') else nivel_acceso end,
      estado=v_estado,
      usuario_supervisor=case when p_data ? 'usuarioSupervisor' then nullif(upper(trim(p_data->>'usuarioSupervisor')),'') else usuario_supervisor end,
      tiene_unidad=case when p_data ? 'tieneUnidad' then nullif(upper(trim(p_data->>'tieneUnidad')),'') else tiene_unidad end,
      placa_unidad=case when p_data ? 'placaUnidad' then nullif(upper(trim(p_data->>'placaUnidad')),'') else placa_unidad end,
      frecuencia_combustible=case when p_data ? 'frecuenciaCombustible' then nullif(trim(p_data->>'frecuenciaCombustible'),'') else frecuencia_combustible end,
      facturas_activo=case when p_data ? 'facturasActivo' then nullif(upper(trim(p_data->>'facturasActivo')),'') else facturas_activo end,
      updated_at=now()
  where id=p_target_id
  returning to_jsonb(app_users.*) - 'auth_user_id' into nuevo;

  insert into public.administracion_eventos_migracion(
    actor_usuario,actor_perfil,evento,entidad,entidad_id,estado_anterior,estado_nuevo
  ) values (
    ctx->>'usuario',ctx->>'perfil','ACTUALIZAR_USUARIO','APP_USERS',
    p_target_id::text,old - 'auth_user_id',nuevo
  );

  return jsonb_build_object('ok',true,'accion','ACTUALIZAR_USUARIO','usuario',nuevo);
exception when unique_violation then
  raise exception 'El correo ya está asignado a otro usuario';
end $$;

create or replace function public.mv_admin_guardar_ranking_config(
  p_usuario text,
  p_periodo text,
  p_produccion numeric,
  p_efectividad numeric,
  p_sla numeric,
  p_observaciones numeric,
  p_recableado numeric,
  p_vtrgar numeric
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  ctx jsonb;
  v_total numeric;
  old jsonb;
  nuevo jsonb;
  v_cache integer;
begin
  ctx:=public.mv_admin_contexto(p_usuario);

  if p_periodo !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then
    raise exception 'Periodo inválido';
  end if;
  if p_periodo<'2026-09' then
    raise exception 'Periodo histórico protegido';
  end if;

  if least(p_produccion,p_efectividad,p_sla,p_observaciones,p_recableado,p_vtrgar)<0
     or greatest(p_produccion,p_efectividad,p_sla,p_observaciones,p_recableado,p_vtrgar)>100 then
    raise exception 'Cada peso debe estar entre 0 y 100';
  end if;

  v_total:=round(p_produccion+p_efectividad+p_sla+p_observaciones+p_recableado+p_vtrgar,4);
  if v_total<>100 then raise exception 'Los pesos deben sumar 100. Total: %',v_total; end if;

  select to_jsonb(x) into old from public.ranking_configuracion_motor x where periodo=p_periodo;

  insert into public.ranking_configuracion_motor(
    periodo,produccion_pct,efectividad_pct,sla_pct,observaciones_pct,recableado_pct,vtrgar_pct,
    total_pct,estado,origen,actualizado_por,actualizado_at
  ) values (
    p_periodo,p_produccion,p_efectividad,p_sla,p_observaciones,p_recableado,p_vtrgar,
    100,'ACTIVO','ADMINISTRACION_MIGRADA',ctx->>'usuario',now()
  )
  on conflict(periodo) do update set
    produccion_pct=excluded.produccion_pct,
    efectividad_pct=excluded.efectividad_pct,
    sla_pct=excluded.sla_pct,
    observaciones_pct=excluded.observaciones_pct,
    recableado_pct=excluded.recableado_pct,
    vtrgar_pct=excluded.vtrgar_pct,
    total_pct=100,
    estado='ACTIVO',
    origen='ADMINISTRACION_MIGRADA',
    actualizado_por=excluded.actualizado_por,
    actualizado_at=now();

  perform public.mv_dashboard_refrescar_ranking_cache(p_periodo);

  select count(*) into v_cache from public.dashboard_ranking_cache where periodo=p_periodo;
  select to_jsonb(x) into nuevo from public.ranking_configuracion_motor x where periodo=p_periodo;

  insert into public.administracion_eventos_migracion(
    actor_usuario,actor_perfil,evento,entidad,entidad_id,estado_anterior,estado_nuevo
  ) values (
    ctx->>'usuario',ctx->>'perfil','ACTUALIZAR_RANKING','RANKING_CONFIGURACION',
    p_periodo,old,nuevo
  );

  return jsonb_build_object(
    'ok',true,'accion','ACTUALIZAR_RANKING','periodo',p_periodo,
    'configuracion',nuevo,'cacheRegistros',v_cache
  );
end $$;

revoke all on function public.mv_admin_contexto(text) from public,anon,authenticated;
revoke all on function public.mv_admin_actualizar_permiso(text,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.mv_admin_actualizar_usuario(text,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.mv_admin_guardar_ranking_config(text,text,numeric,numeric,numeric,numeric,numeric,numeric) from public,anon,authenticated;

grant execute on function public.mv_admin_contexto(text) to service_role;
grant execute on function public.mv_admin_actualizar_permiso(text,bigint,jsonb) to service_role;
grant execute on function public.mv_admin_actualizar_usuario(text,bigint,jsonb) to service_role;
grant execute on function public.mv_admin_guardar_ranking_config(text,text,numeric,numeric,numeric,numeric,numeric,numeric) to service_role;
