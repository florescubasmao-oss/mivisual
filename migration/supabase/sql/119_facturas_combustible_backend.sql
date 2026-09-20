-- 119_facturas_combustible_backend.sql
-- MI VISUAL - Facturas de combustible / migración Supabase
-- 20/09/2026

create table if not exists public.facturas_config_migracion(
  parametro text primary key,
  valor text not null,
  descripcion text,
  updated_at timestamptz not null default now()
);

insert into public.facturas_config_migracion(parametro,valor,descripcion) values
('MONTO_COMBUSTIBLE','100','Total obligatorio por pendiente'),
('MAX_FACTURAS','10','Máximo de fotografías/comprobantes por pendiente'),
('ANCHO_MAX_IMAGEN','1280','Compresión realizada en navegador'),
('CALIDAD_IMAGEN','0.72','Calidad JPEG realizada en navegador')
on conflict(parametro) do update set valor=excluded.valor,descripcion=excluded.descripcion,updated_at=now();

create table if not exists public.facturas_pendientes_migracion(
  id uuid primary key default gen_random_uuid(),
  periodo_mes text not null,
  fecha_desde date not null,
  fecha_hasta date not null,
  usuario_responsable text not null,
  nombre_responsable text,
  perfil_responsable text,
  sede text,
  cuadrilla text,
  placa text,
  frecuencia integer,
  monto_requerido numeric(12,2) not null default 100,
  observacion text default '',
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE','PRESENTADO','OBSERVADO','APROBADO')),
  creado_por text not null,
  creado_at timestamptz not null default now(),
  presentado_at timestamptz,
  aprobado_at timestamptz,
  aprobado_por text,
  updated_at timestamptz not null default now(),
  source_kind text not null default 'POSTGRESQL'
);

create index if not exists idx_facturas_pendientes_periodo on public.facturas_pendientes_migracion(periodo_mes);
create index if not exists idx_facturas_pendientes_responsable on public.facturas_pendientes_migracion(usuario_responsable);
create index if not exists idx_facturas_pendientes_estado on public.facturas_pendientes_migracion(estado);

create table if not exists public.facturas_detalle_migracion(
  id uuid primary key default gen_random_uuid(),
  pendiente_id uuid not null references public.facturas_pendientes_migracion(id) on delete cascade,
  numero_factura text not null,
  monto numeric(12,2) not null check(monto>0),
  nombre_archivo text,
  storage_ref text not null,
  fecha_carga timestamptz not null default now(),
  responsable text not null,
  subido_por text not null,
  estado_detalle text not null default 'PRESENTADO'
    check(estado_detalle in ('PRESENTADO','OBSERVADO','APROBADO','REEMPLAZADO')),
  observacion text default '',
  reemplaza_a uuid references public.facturas_detalle_migracion(id),
  fecha_validacion timestamptz,
  validado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_facturas_detalle_pendiente on public.facturas_detalle_migracion(pendiente_id);
create index if not exists idx_facturas_detalle_estado on public.facturas_detalle_migracion(estado_detalle);

alter table public.facturas_config_migracion enable row level security;
alter table public.facturas_pendientes_migracion enable row level security;
alter table public.facturas_detalle_migracion enable row level security;

revoke all on public.facturas_config_migracion from anon,authenticated;
revoke all on public.facturas_pendientes_migracion from anon,authenticated;
revoke all on public.facturas_detalle_migracion from anon,authenticated;
grant select,insert,update,delete on public.facturas_config_migracion to service_role;
grant select,insert,update,delete on public.facturas_pendientes_migracion to service_role;
grant select,insert,update,delete on public.facturas_detalle_migracion to service_role;

create or replace function public.mv_facturas_usuario(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare u public.app_users%rowtype; p public.app_permissions%rowtype;
begin
  select * into u from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario)) and upper(coalesce(estado,''))='ACTIVO'
  limit 1;
  if not found then raise exception 'Usuario inactivo o inexistente'; end if;

  select * into p from public.app_permissions
  where perfil=u.perfil and modulo='FACTURAS' and activo=true and ver=true
  limit 1;
  if not found then raise exception 'Sin acceso a Facturas'; end if;

  return jsonb_build_object(
    'usuario',u.usuario,'nombre',u.nombres_apellidos,'perfil',u.perfil,'sede',u.sede,
    'cuadrilla',u.cuadrilla,'tieneUnidad',u.tiene_unidad,'placa',u.placa_unidad,
    'frecuencia',u.frecuencia_combustible,'facturasActivo',u.facturas_activo,
    'registrar',p.registrar,'editar',p.editar,'observar',p.observar,'aprobar',p.aprobar,
    'administrar',p.administrar,'descargar',p.descargar,'alcance',p.alcance_datos
  );
end $$;

create or replace function public.mv_facturas_estado_visible(p_estado text,p_fecha_hasta date)
returns text
language sql immutable
set search_path=public,pg_temp
as $$
  select case
    when p_estado='PENDIENTE' and p_fecha_hasta < (current_timestamp at time zone 'America/Lima')::date then 'VENCIDO'
    else p_estado
  end
$$;

create or replace function public.mv_facturas_contexto(p_usuario text,p_periodo text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb; v_perfil text; v_usuario text; v_periodo text;
  cfg jsonb; lista jsonb; responsables jsonb; res jsonb;
begin
  u:=public.mv_facturas_usuario(p_usuario);
  v_perfil:=u->>'perfil'; v_usuario:=u->>'usuario';
  v_periodo:=coalesce(nullif(trim(p_periodo),''),to_char((current_timestamp at time zone 'America/Lima')::date,'YYYY-MM'));

  select coalesce(jsonb_object_agg(parametro,valor),'{}'::jsonb) into cfg
  from public.facturas_config_migracion;

  select coalesce(jsonb_agg(x order by x.fecha_desde desc,x.creado_at desc),'[]'::jsonb) into lista
  from (
    select
      p.id,p.periodo_mes as "periodoMes",
      to_char(p.fecha_desde,'YYYY-MM-DD') as "fechaDesde",
      to_char(p.fecha_hasta,'YYYY-MM-DD') as "fechaHasta",
      p.usuario_responsable as "usuarioResponsable",p.nombre_responsable as "nombreResponsable",
      p.perfil_responsable as "perfilResponsable",p.sede,p.cuadrilla,p.placa,p.frecuencia,
      p.monto_requerido as "montoRequerido",p.observacion,p.estado,
      public.mv_facturas_estado_visible(p.estado,p.fecha_hasta) as "estadoVisible",
      (select count(*) from public.facturas_detalle_migracion d
       where d.pendiente_id=p.id and d.estado_detalle<>'REEMPLAZADO') as cantidad
    from public.facturas_pendientes_migracion p
    where p.periodo_mes=v_periodo
      and (
        v_perfil='GERENCIA GENERAL'
        or p.usuario_responsable=v_usuario
        or (v_perfil in ('JEFATURA','JEFATURA GENERAL') and upper(coalesce(u->>'alcance','')) like '%ZONA%')
        or (v_perfil='SUPERVISOR' and p.sede=u->>'sede')
      )
  ) x;

  if v_perfil='GERENCIA GENERAL' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'usuario',a.usuario,'nombre',a.nombres_apellidos,'perfil',a.perfil,'sede',a.sede,
      'cuadrilla',a.cuadrilla,'placa',a.placa_unidad,
      'frecuencia',nullif(regexp_replace(coalesce(a.frecuencia_combustible,''),'[^0-9]','','g'),'')::int
    ) order by a.sede,a.perfil,a.nombres_apellidos),'[]'::jsonb)
    into responsables
    from public.app_users a
    join public.app_permissions pp on pp.perfil=a.perfil and pp.modulo='FACTURAS' and pp.activo and pp.ver
    where upper(coalesce(a.estado,''))='ACTIVO'
      and (
        upper(coalesce(a.facturas_activo,''))='SI'
        or a.perfil in ('SUPERVISOR','JEFATURA','JEFATURA GENERAL')
      );
  else responsables:='[]'::jsonb; end if;

  select jsonb_build_object(
    'pendientes',count(*) filter(where public.mv_facturas_estado_visible(p.estado,p.fecha_hasta)='PENDIENTE'),
    'presentados',count(*) filter(where p.estado='PRESENTADO'),
    'observados',count(*) filter(where p.estado='OBSERVADO'),
    'aprobados',count(*) filter(where p.estado='APROBADO'),
    'vencidos',count(*) filter(where public.mv_facturas_estado_visible(p.estado,p.fecha_hasta)='VENCIDO')
  ) into res
  from public.facturas_pendientes_migracion p
  where p.periodo_mes=v_periodo
    and (
      v_perfil='GERENCIA GENERAL'
      or p.usuario_responsable=v_usuario
      or (v_perfil in ('JEFATURA','JEFATURA GENERAL') and upper(coalesce(u->>'alcance','')) like '%ZONA%')
      or (v_perfil='SUPERVISOR' and p.sede=u->>'sede')
    );

  return jsonb_build_object(
    'ok',true,'modulo','FACTURAS','accion','CONTEXTO','usuario',u,
    'periodoMes',v_periodo,'periodos',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (
      select distinct periodo_mes x from public.facturas_pendientes_migracion
      union select v_periodo order by 1 desc
    ) z),
    'configuracion',jsonb_build_object(
      'monto',coalesce((cfg->>'MONTO_COMBUSTIBLE')::numeric,100),
      'maxFacturas',coalesce((cfg->>'MAX_FACTURAS')::int,10),
      'anchoMaxImagen',coalesce((cfg->>'ANCHO_MAX_IMAGEN')::int,1280),
      'calidadImagen',coalesce((cfg->>'CALIDAD_IMAGEN')::numeric,.72)
    ),
    'visibleMenu',case when v_perfil='TECNICO' then upper(coalesce(u->>'facturasActivo',''))='SI'
                       else true end,
    'puedeCrear',v_perfil='GERENCIA GENERAL',
    'responsables',responsables,'resumen',res,'lista',lista,'fuente','POSTGRESQL PILOTO'
  );
end $$;

create or replace function public.mv_facturas_crear_pendiente(
  p_actor text,p_usuario_responsable text,p_fecha_desde date,p_fecha_hasta date,p_observacion text default ''
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare u jsonb; r public.app_users%rowtype; v_monto numeric; v_id uuid; v_periodo text; v_freq int;
begin
  u:=public.mv_facturas_usuario(p_actor);
  if u->>'perfil'<>'GERENCIA GENERAL' then raise exception 'Solo Gerencia General puede crear pendientes'; end if;
  if p_fecha_desde is null or p_fecha_hasta is null or p_fecha_hasta<p_fecha_desde then raise exception 'Periodo de fechas inválido'; end if;

  select * into r from public.app_users
  where upper(usuario)=upper(trim(p_usuario_responsable)) and upper(coalesce(estado,''))='ACTIVO' limit 1;
  if not found then raise exception 'Responsable no válido'; end if;
  if not exists(select 1 from public.app_permissions where perfil=r.perfil and modulo='FACTURAS' and activo and ver) then
    raise exception 'El responsable no tiene acceso a Facturas';
  end if;
  if r.perfil='TECNICO' and upper(coalesce(r.facturas_activo,''))<>'SI' then
    raise exception 'El técnico no está habilitado para Facturas';
  end if;

  select coalesce(valor::numeric,100) into v_monto from public.facturas_config_migracion where parametro='MONTO_COMBUSTIBLE';
  v_periodo:=to_char(p_fecha_desde,'YYYY-MM');
  v_freq:=nullif(regexp_replace(coalesce(r.frecuencia_combustible,''),'[^0-9]','','g'),'')::int;

  insert into public.facturas_pendientes_migracion(
    periodo_mes,fecha_desde,fecha_hasta,usuario_responsable,nombre_responsable,perfil_responsable,
    sede,cuadrilla,placa,frecuencia,monto_requerido,observacion,estado,creado_por
  ) values (
    v_periodo,p_fecha_desde,p_fecha_hasta,r.usuario,r.nombres_apellidos,r.perfil,
    r.sede,r.cuadrilla,r.placa_unidad,v_freq,v_monto,coalesce(p_observacion,''),'PENDIENTE',u->>'usuario'
  ) returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id,'periodo',v_periodo,'monto',v_monto,'mensaje','Pendiente creado');
end $$;

create or replace function public.mv_facturas_detalle(p_usuario text,p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare u jsonb; p public.facturas_pendientes_migracion%rowtype; arr jsonb; cfg jsonb; v_perfil text;
begin
  u:=public.mv_facturas_usuario(p_usuario);v_perfil:=u->>'perfil';
  select * into p from public.facturas_pendientes_migracion where id=p_id limit 1;
  if not found then raise exception 'Pendiente no encontrado'; end if;

  if not (
    v_perfil='GERENCIA GENERAL'
    or p.usuario_responsable=u->>'usuario'
    or (v_perfil in ('JEFATURA','JEFATURA GENERAL') and upper(coalesce(u->>'alcance','')) like '%ZONA%')
    or (v_perfil='SUPERVISOR' and p.sede=u->>'sede')
  ) then raise exception 'Pendiente fuera de su alcance'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'numero',d.numero_factura,'monto',d.monto,'nombreArchivo',d.nombre_archivo,
    'storageRef',d.storage_ref,'fechaCarga',d.fecha_carga,'responsable',d.responsable,
    'subidoPor',d.subido_por,'estado',d.estado_detalle,'observacion',d.observacion,
    'reemplazaId',d.reemplaza_a,'fechaValidacion',d.fecha_validacion,'validadoPor',d.validado_por
  ) order by d.fecha_carga),'[]'::jsonb) into arr
  from public.facturas_detalle_migracion d where d.pendiente_id=p_id;

  select coalesce(jsonb_object_agg(parametro,valor),'{}'::jsonb) into cfg from public.facturas_config_migracion;

  return jsonb_build_object(
    'ok',true,'modulo','FACTURAS','accion','DETALLE','usuario',u,
    'pendiente',jsonb_build_object(
      'id',p.id,'periodoMes',p.periodo_mes,'fechaDesde',p.fecha_desde,'fechaHasta',p.fecha_hasta,
      'usuarioResponsable',p.usuario_responsable,'nombreResponsable',p.nombre_responsable,
      'perfilResponsable',p.perfil_responsable,'sede',p.sede,'cuadrilla',p.cuadrilla,
      'placa',p.placa,'frecuencia',p.frecuencia,'montoRequerido',p.monto_requerido,
      'observacion',p.observacion,'estado',p.estado,'estadoVisible',public.mv_facturas_estado_visible(p.estado,p.fecha_hasta)
    ),
    'detalles',arr,
    'configuracion',jsonb_build_object('maxFacturas',coalesce((cfg->>'MAX_FACTURAS')::int,10)),
    'puedeCargar',(p.usuario_responsable=u->>'usuario' and p.estado in ('PENDIENTE','OBSERVADO')),
    'puedeValidar',(v_perfil='GERENCIA GENERAL'),
    'fuente','POSTGRESQL PILOTO'
  );
end $$;

create or replace function public.mv_facturas_presentar(
  p_actor text,p_id uuid,p_facturas jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare u jsonb;p public.facturas_pendientes_migracion%rowtype;x jsonb;v_total numeric:=0;v_count int:=0;v_max int;v_old uuid;
begin
  u:=public.mv_facturas_usuario(p_actor);
  select * into p from public.facturas_pendientes_migracion where id=p_id for update;
  if not found then raise exception 'Pendiente no encontrado'; end if;
  if p.usuario_responsable<>u->>'usuario' then raise exception 'Solo el responsable puede presentar facturas'; end if;
  if p.estado not in ('PENDIENTE','OBSERVADO') then raise exception 'El pendiente no admite presentación en estado %',p.estado; end if;
  if jsonb_typeof(p_facturas)<>'array' or jsonb_array_length(p_facturas)=0 then raise exception 'Ingrese al menos una factura'; end if;
  select coalesce(valor::int,10) into v_max from public.facturas_config_migracion where parametro='MAX_FACTURAS';
  if jsonb_array_length(p_facturas)>v_max then raise exception 'Máximo % facturas',v_max; end if;

  for x in select value from jsonb_array_elements(p_facturas) loop
    if trim(coalesce(x->>'numero',''))='' then raise exception 'Número de factura obligatorio'; end if;
    if coalesce((x->>'monto')::numeric,0)<=0 then raise exception 'Monto inválido'; end if;
    if trim(coalesce(x->>'storageRef',''))='' then raise exception 'Evidencia obligatoria'; end if;
    v_total:=v_total+(x->>'monto')::numeric;v_count:=v_count+1;
  end loop;

  if p.estado='PENDIENTE' and abs(v_total-p.monto_requerido)>.009 then
    raise exception 'La suma debe ser exactamente S/ %',p.monto_requerido;
  end if;

  if p.estado='OBSERVADO' then
    -- En reemplazo se exige una factura nueva por cada detalle observado indicado.
    if exists(
      select 1 from jsonb_array_elements(p_facturas) y
      where coalesce(y->>'reemplazaId','')=''
    ) then raise exception 'Cada reemplazo debe indicar la factura observada'; end if;
  end if;

  for x in select value from jsonb_array_elements(p_facturas) loop
    v_old:=nullif(x->>'reemplazaId','')::uuid;
    if v_old is not null then
      if not exists(select 1 from public.facturas_detalle_migracion d where d.id=v_old and d.pendiente_id=p_id and d.estado_detalle='OBSERVADO') then
        raise exception 'Factura observada a reemplazar no válida';
      end if;
      update public.facturas_detalle_migracion set estado_detalle='REEMPLAZADO',updated_at=now() where id=v_old;
    end if;
    insert into public.facturas_detalle_migracion(
      pendiente_id,numero_factura,monto,nombre_archivo,storage_ref,responsable,subido_por,estado_detalle,reemplaza_a
    ) values(
      p_id,upper(trim(x->>'numero')),(x->>'monto')::numeric,x->>'nombreArchivo',x->>'storageRef',
      p.usuario_responsable,u->>'usuario','PRESENTADO',v_old
    );
  end loop;

  -- El conjunto vigente completo debe sumar exactamente el monto requerido.
  select coalesce(sum(monto),0) into v_total
  from public.facturas_detalle_migracion
  where pendiente_id=p_id and estado_detalle in ('PRESENTADO','APROBADO');

  if abs(v_total-p.monto_requerido)>.009 then raise exception 'El total vigente queda en S/ %, debe ser S/ %',v_total,p.monto_requerido; end if;

  update public.facturas_pendientes_migracion
  set estado='PRESENTADO',presentado_at=now(),updated_at=now()
  where id=p_id;

  return jsonb_build_object('ok',true,'id',p_id,'facturas',v_count,'total',v_total,'mensaje','Facturas presentadas');
end $$;

create or replace function public.mv_facturas_observar_detalle(
  p_actor text,p_detalle_id uuid,p_observacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare u jsonb;d public.facturas_detalle_migracion%rowtype;
begin
  u:=public.mv_facturas_usuario(p_actor);
  if u->>'perfil'<>'GERENCIA GENERAL' then raise exception 'Solo Gerencia General puede observar'; end if;
  if trim(coalesce(p_observacion,''))='' then raise exception 'Motivo obligatorio'; end if;
  select * into d from public.facturas_detalle_migracion where id=p_detalle_id for update;
  if not found or d.estado_detalle<>'PRESENTADO' then raise exception 'Factura no disponible para observar'; end if;
  update public.facturas_detalle_migracion
  set estado_detalle='OBSERVADO',observacion=trim(p_observacion),fecha_validacion=now(),validado_por=u->>'usuario',updated_at=now()
  where id=p_detalle_id;
  update public.facturas_pendientes_migracion set estado='OBSERVADO',updated_at=now() where id=d.pendiente_id;
  return jsonb_build_object('ok',true,'id',p_detalle_id,'pendienteId',d.pendiente_id,'mensaje','Factura observada');
end $$;

create or replace function public.mv_facturas_aprobar_presentacion(p_actor text,p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare u jsonb;p public.facturas_pendientes_migracion%rowtype;v_total numeric;v_obs int;
begin
  u:=public.mv_facturas_usuario(p_actor);
  if u->>'perfil'<>'GERENCIA GENERAL' then raise exception 'Solo Gerencia General puede aprobar'; end if;
  select * into p from public.facturas_pendientes_migracion where id=p_id for update;
  if not found or p.estado<>'PRESENTADO' then raise exception 'Presentación no disponible para aprobar'; end if;
  select coalesce(sum(monto),0),count(*) filter(where estado_detalle='OBSERVADO')
    into v_total,v_obs
  from public.facturas_detalle_migracion
  where pendiente_id=p_id and estado_detalle<>'REEMPLAZADO';
  if v_obs>0 then raise exception 'Existen facturas observadas'; end if;
  if abs(v_total-p.monto_requerido)>.009 then raise exception 'El total presentado no coincide con el monto requerido'; end if;
  update public.facturas_detalle_migracion
  set estado_detalle='APROBADO',fecha_validacion=now(),validado_por=u->>'usuario',updated_at=now()
  where pendiente_id=p_id and estado_detalle='PRESENTADO';
  update public.facturas_pendientes_migracion
  set estado='APROBADO',aprobado_at=now(),aprobado_por=u->>'usuario',updated_at=now()
  where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'total',v_total,'mensaje','Presentación aprobada');
end $$;

do $$
declare r record;
begin
  for r in select p.oid::regprocedure sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'mv_facturas_%'
  loop
    execute format('revoke all on function %s from public,anon,authenticated',r.sig);
    execute format('grant execute on function %s to service_role',r.sig);
  end loop;
end $$;

update public.migration_live_source_control
set postgres_target='facturas_config_migracion + facturas_pendientes_migracion + facturas_detalle_migracion',
    status='LIVE_VALIDAR',sheet_rows=0,postgres_rows=0,content_match=true,
    requires_final_resync=true,last_audit_at=now(),
    audit_scope='FACTURAS_PENDIENTES=0 + FACTURAS_DETALLE=0; CONFIG MIGRADA',
    notes='Backend Facturas creado. Configuración legacy migrada; no había pendientes ni detalles al corte. Mientras Apps Script siga activo se requiere verificación/resync final antes de cutover.',
    updated_at=now()
where modulo='FACTURAS';
