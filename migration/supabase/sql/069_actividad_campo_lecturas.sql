
-- 069_actividad_campo_lecturas.sql
-- Lecturas, alcance por perfil, resumen y búsqueda de datos de auditoría.

create or replace function public.mv_actividad_usuario_key(v text)
returns text
language sql
immutable
set search_path=public
as $$
  select replace(public.mv_actividad_texto(v),' ','');
$$;

create or replace function public.mv_actividad_cuadrilla_norm(v text)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare t text;
begin
  t := trim(regexp_replace(coalesce(v,''),'\s+',' ','g'));
  t := regexp_replace(t,'^P\s+([0-9]+)','P\1','i');
  return t;
end;
$$;

create or replace function public.mv_actividad_cuadrilla_clave(v text)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare
  t text;
  m text[];
  modalidad text:='';
begin
  t := public.mv_actividad_texto(public.mv_actividad_cuadrilla_norm(v));
  m := regexp_match(t,'^P\s*([0-9]+)');
  if m is null then return regexp_replace(t,'[^A-Z0-9]','','g'); end if;
  if t like '%TRASLADO%' then modalidad:='TRASLADO';
  elsif t ~ '(^| )SGA( |$)' then modalidad:='SGA';
  elsif t ~ '(^| )SGI( |$)' then modalidad:='SGI';
  end if;
  return 'P'||(m[1]::int)::text||'|'||modalidad;
end;
$$;

create or replace function public.mv_actividad_id_key(v text)
returns text
language sql
immutable
set search_path=public
as $$
  select regexp_replace(public.mv_actividad_texto(v),'[^A-Z0-9]','','g');
$$;

create or replace function public.mv_actividad_fecha_texto(v text)
returns date
language plpgsql
immutable
set search_path=public
as $$
declare t text; m text[];
begin
  t:=trim(coalesce(v,''));
  if t='' then return null; end if;
  m:=regexp_match(t,'^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})$');
  if m is not null then return make_date(m[3]::int,m[2]::int,m[1]::int); end if;
  m:=regexp_match(t,'^([0-9]{4})[/-]([0-9]{1,2})[/-]([0-9]{1,2})$');
  if m is not null then return make_date(m[1]::int,m[2]::int,m[3]::int); end if;
  return t::date;
exception when others then return null;
end;
$$;

create or replace function public.mv_actividad_usuario(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.app_users%rowtype;
begin
  select *
  into r
  from public.app_users
  where public.mv_actividad_usuario_key(usuario)=public.mv_actividad_usuario_key(p_usuario)
  order by id asc
  limit 1;

  if not found then
    raise exception 'No se encontró el usuario: %', p_usuario;
  end if;

  return jsonb_build_object(
    'usuario',public.mv_actividad_usuario_key(r.usuario),
    'correo',coalesce(r.correo,''),
    'cuadrilla',public.mv_actividad_cuadrilla_norm(r.cuadrilla),
    'sede',public.mv_actividad_texto(r.sede),
    'plataforma',public.mv_actividad_texto(r.plataforma),
    'perfil',public.mv_actividad_texto(r.perfil),
    'nivelAcceso',public.mv_actividad_texto(r.nivel_acceso),
    'estado',public.mv_actividad_texto(r.estado),
    'usuarioSupervisor',public.mv_actividad_usuario_key(r.usuario_supervisor),
    'nombresApellidos',coalesce(nullif(trim(r.nombres_apellidos),''),r.usuario,'')
  );
end;
$$;

create or replace view public.mv_actividad_cuadrilla_ultima
with (security_invoker=true)
as
select distinct on (public.mv_actividad_cuadrilla_norm(cuadrilla))
  public.mv_actividad_cuadrilla_norm(cuadrilla) as cuadrilla,
  public.mv_actividad_usuario_key(usuario) as usuario,
  public.mv_actividad_texto(sede) as sede,
  public.mv_actividad_texto(plataforma) as plataforma,
  public.mv_actividad_texto(perfil) as perfil,
  public.mv_actividad_texto(nivel_acceso) as nivel_acceso,
  public.mv_actividad_texto(estado) as estado,
  public.mv_actividad_usuario_key(usuario_supervisor) as usuario_supervisor,
  id as source_id
from public.app_users
where coalesce(trim(cuadrilla),'')<>''
order by public.mv_actividad_cuadrilla_norm(cuadrilla),id desc;

revoke all on public.mv_actividad_cuadrilla_ultima from anon, authenticated;
grant select on public.mv_actividad_cuadrilla_ultima to service_role;

create or replace function public.mv_actividad_item_json(a public.actividad_campo_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
select jsonb_build_object(
  'id',coalesce(a.id,''),
  'fecha',case when a.fecha is null then '' else to_char(a.fecha,'DD/MM/YYYY') end,
  'hora',case when a.hora is null then '' else to_char(a.hora,'HH24:MI:SS') end,
  'sede',coalesce(a.sede,''),
  'supervisor',coalesce(a.supervisor,''),
  'cuadrilla',coalesce(a.cuadrilla,''),
  'tipoActividad',coalesce(a.tipo_actividad,''),
  'tipoActividadOriginal',coalesce(a.tipo_actividad_original,''),
  'clientePresente',coalesce(a.cliente_presente,''),
  'dniValidado',coalesce(a.dni_validado,''),
  'estadoInstalacion',coalesce(a.estado_instalacion,''),
  'dropMetraje',coalesce(a.drop_metraje,''),
  'templadores',coalesce(a.templadores,''),
  'reservaCable',coalesce(a.reserva_cable,''),
  'potenciaConforme',coalesce(a.potencia_conforme,''),
  'velocidadConforme',coalesce(a.velocidad_conforme,''),
  'limpiezaTrabajo',coalesce(a.limpieza_trabajo,''),
  'clienteConforme',coalesce(a.cliente_conforme,''),
  'observaciones',coalesce(a.observaciones,''),
  'foto1',coalesce(a.foto_1,''),
  'foto2',coalesce(a.foto_2,''),
  'foto3',coalesce(a.foto_acta,''),
  'fotoActa',coalesce(a.foto_acta,''),
  'foto4',coalesce(a.foto_4,''),
  'descFoto1',coalesce(a.desc_foto_1,''),
  'descFoto2',coalesce(a.desc_foto_2,''),
  'descFoto3',coalesce(a.desc_foto_3,''),
  'descFoto4',coalesce(a.desc_foto_4,''),
  'tipoOrden',coalesce(a.tipo_orden,coalesce(a.auditoria_json->>'tipoOrden','')),
  'codigoPedido',coalesce(a.codigo_pedido,coalesce(a.auditoria_json->>'codigoPedido','')),
  'dniCliente',coalesce(a.dni_cliente,coalesce(a.auditoria_json->>'dniCliente','')),
  'cliente',coalesce(a.cliente,coalesce(a.auditoria_json->>'cliente','')),
  'direccion',coalesce(a.direccion,coalesce(a.auditoria_json->>'direccion','')),
  'ticket',coalesce(a.ticket,coalesce(a.auditoria_json->>'ticket','')),
  'auditoria',a.auditoria_json,
  'puntajeCalidad',case when a.puntaje_calidad is null then to_jsonb(''::text) else to_jsonb(a.puntaje_calidad) end,
  'puntajeSeguridad',case when a.puntaje_seguridad is null then to_jsonb(''::text) else to_jsonb(a.puntaje_seguridad) end,
  'puntajeCliente',case when a.puntaje_cliente is null then to_jsonb(''::text) else to_jsonb(a.puntaje_cliente) end,
  'puntajeOrdenLimpieza',case when a.puntaje_orden_limpieza is null then to_jsonb(''::text) else to_jsonb(a.puntaje_orden_limpieza) end,
  'puntajeTotal',case when a.puntaje_total is null then to_jsonb(''::text) else to_jsonb(a.puntaje_total) end,
  'clasificacion',coalesce(a.clasificacion,''),
  'requiereSeguimiento',coalesce(a.requiere_seguimiento,''),
  'fechaCompromiso',coalesce(a.fecha_compromiso,''),
  'responsableSubsanar',coalesce(a.responsable_subsanar,''),
  'estadoAuditoria',coalesce(a.estado_auditoria,''),
  'accionesCorrectivas',coalesce(a.acciones_correctivas,'')
);
$$;

create or replace function public.mv_actividad_filtrar(p_usuario text,p_filtros jsonb default '{}'::jsonb)
returns setof public.actividad_campo_migracion
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil text;
  usuario_key text;
  f_desde date;
  f_hasta date;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil:=u->>'perfil';
  usuario_key:=u->>'usuario';

  if perfil not in ('SUPERVISOR','JEFATURA','ADMIN','ADMINISTRADOR','GERENCIA LIMA','OPERACIONES LIMA') then
    raise exception 'No tienes permiso para ver actividad en campo';
  end if;

  f_desde:=public.mv_actividad_fecha_texto(p_filtros->>'fechaDesde');
  f_hasta:=public.mv_actividad_fecha_texto(p_filtros->>'fechaHasta');

  return query
  select a.*
  from public.actividad_campo_migracion a
  where
    (perfil<>'SUPERVISOR' or public.mv_actividad_usuario_key(a.supervisor)=usuario_key)
    and (coalesce(p_filtros->>'sede','')='' or public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(p_filtros->>'sede'))
    and (coalesce(p_filtros->>'supervisor','')='' or public.mv_actividad_usuario_key(a.supervisor)=public.mv_actividad_usuario_key(p_filtros->>'supervisor'))
    and (coalesce(p_filtros->>'cuadrilla','')='' or public.mv_actividad_cuadrilla_norm(a.cuadrilla)=public.mv_actividad_cuadrilla_norm(p_filtros->>'cuadrilla'))
    and (coalesce(p_filtros->>'tipoActividad','')='' or a.tipo_actividad=public.mv_actividad_tipo_canonico(p_filtros->>'tipoActividad'))
    and (coalesce(p_filtros->>'tipoOrden','')='' or public.mv_actividad_texto(a.tipo_orden)=public.mv_actividad_texto(p_filtros->>'tipoOrden'))
    and (coalesce(p_filtros->>'clasificacion','')='' or public.mv_actividad_texto(a.clasificacion)=public.mv_actividad_texto(p_filtros->>'clasificacion'))
    and (coalesce(p_filtros->>'estadoAuditoria','')='' or public.mv_actividad_texto(a.estado_auditoria)=public.mv_actividad_texto(p_filtros->>'estadoAuditoria'))
    and (f_desde is null or a.fecha>=f_desde)
    and (f_hasta is null or a.fecha<=f_hasta)
  order by a.source_row nulls last,a.created_at;
end;
$$;

create or replace function public.mv_actividad_listar(p_usuario text,p_filtros jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  arr jsonb;
  perfil text;
begin
  perfil:=public.mv_actividad_usuario(p_usuario)->>'perfil';
  select coalesce(jsonb_agg(public.mv_actividad_item_json(x) order by x.source_row nulls last,x.created_at),'[]'::jsonb)
  into arr
  from public.mv_actividad_filtrar(p_usuario,p_filtros) x;

  return jsonb_build_object(
    'ok',true,'modulo','ACTIVIDAD_CAMPO','accion','LISTAR',
    'perfil',perfil,'registros',jsonb_array_length(arr),'actividades',arr
  );
end;
$$;

create or replace function public.mv_actividad_resumen(p_usuario text,p_filtros jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  total_reg int;
  totales jsonb;
  resumen_supervisor jsonb;
  aud jsonb;
  por_sede jsonb;
  criterios jsonb;
begin
  with f as (
    select * from public.mv_actividad_filtrar(p_usuario,p_filtros)
  ), tipos as (
    select unnest(array['AUDITORIA EN FRIO','AUDITORIA EN CALIENTE','SEGUIMIENTO','VALIDACION DE OBSERVACION','CAPACITACION','CHECKLIST']) as tipo
  ), tc as (
    select tipo,count(f.id)::int as n
    from tipos
    left join f on f.tipo_actividad=tipo
    group by tipo
  )
  select
    (select count(*)::int from f),
    jsonb_object_agg(tipo,n) || jsonb_build_object('TOTAL',(select count(*)::int from f))
  into total_reg,totales
  from tc;

  with f as (
    select * from public.mv_actividad_filtrar(p_usuario,p_filtros)
  ), s as (
    select
      public.mv_actividad_usuario_key(supervisor) as supervisor,
      count(*) filter(where tipo_actividad='AUDITORIA EN FRIO')::int as frio,
      count(*) filter(where tipo_actividad='AUDITORIA EN CALIENTE')::int as caliente,
      count(*) filter(where tipo_actividad='SEGUIMIENTO')::int as seguimiento,
      count(*) filter(where tipo_actividad='VALIDACION DE OBSERVACION')::int as validacion,
      count(*) filter(where tipo_actividad='CAPACITACION')::int as capacitacion,
      count(*) filter(where tipo_actividad='CHECKLIST')::int as checklist,
      count(*)::int as total,
      round(avg(puntaje_total) filter(where public.mv_actividad_es_auditoria(tipo_actividad) and puntaje_total is not null),2) as promedio
    from f
    group by public.mv_actividad_usuario_key(supervisor)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'supervisor',supervisor,
    'AUDITORIA EN FRIO',frio,
    'AUDITORIA EN CALIENTE',caliente,
    'SEGUIMIENTO',seguimiento,
    'VALIDACION DE OBSERVACION',validacion,
    'CAPACITACION',capacitacion,
    'CHECKLIST',checklist,
    'TOTAL',total,
    'promedioAuditoria',case when promedio is null then to_jsonb(''::text) else to_jsonb(promedio) end
  ) order by supervisor),'[]'::jsonb)
  into resumen_supervisor
  from s;

  with f as (
    select * from public.mv_actividad_filtrar(p_usuario,p_filtros)
    where public.mv_actividad_es_auditoria(tipo_actividad)
  ), s as (
    select
      public.mv_actividad_texto(sede) as sede,
      count(*)::int as total,
      round(avg(puntaje_total) filter(where puntaje_total is not null),2) as promedio,
      count(*) filter(where public.mv_actividad_texto(clasificacion)='CRITICO')::int as critico,
      count(*) filter(where public.mv_actividad_texto(clasificacion)='OBSERVADO')::int as observado
    from f group by public.mv_actividad_texto(sede)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'sede',sede,'total',total,
    'promedio',case when promedio is null then to_jsonb(''::text) else to_jsonb(promedio) end,
    'critico',critico,'observado',observado
  ) order by sede),'[]'::jsonb)
  into por_sede from s;

  with f as (
    select auditoria_json
    from public.mv_actividad_filtrar(p_usuario,p_filtros)
    where public.mv_actividad_es_auditoria(tipo_actividad) and auditoria_json is not null
  ), c as (
    select coalesce(e->>'criterio',e->>'id','Criterio') as criterio,count(*)::int as cantidad
    from f cross join lateral jsonb_array_elements(coalesce(f.auditoria_json->'criterios','[]'::jsonb)) e
    where public.mv_actividad_texto(e->>'respuesta')='NO CUMPLE'
    group by 1 order by cantidad desc,criterio limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('criterio',criterio,'cantidad',cantidad) order by cantidad desc,criterio),'[]'::jsonb)
  into criterios from c;

  with f as (
    select * from public.mv_actividad_filtrar(p_usuario,p_filtros)
    where public.mv_actividad_es_auditoria(tipo_actividad)
  )
  select jsonb_build_object(
    'total',count(*)::int,
    'promedioGeneral',case when count(puntaje_total)>0 then to_jsonb(round(avg(puntaje_total),2)) else to_jsonb(''::text) end,
    'excelente',count(*) filter(where public.mv_actividad_texto(clasificacion)='EXCELENTE')::int,
    'conforme',count(*) filter(where public.mv_actividad_texto(clasificacion)='CONFORME')::int,
    'observado',count(*) filter(where public.mv_actividad_texto(clasificacion)='OBSERVADO')::int,
    'critico',count(*) filter(where public.mv_actividad_texto(clasificacion)='CRITICO')::int,
    'pendientesSeguimiento',count(*) filter(where public.mv_actividad_texto(requiere_seguimiento)='SI' or public.mv_actividad_texto(estado_auditoria)='EN SEGUIMIENTO')::int,
    'cuadrillasAuditadas',count(distinct public.mv_actividad_cuadrilla_norm(cuadrilla)) filter(where coalesce(trim(cuadrilla),'')<>'')::int,
    'porSede',por_sede,
    'criteriosIncumplidos',criterios
  )
  into aud from f;

  return jsonb_build_object(
    'ok',true,'modulo','ACTIVIDAD_CAMPO','accion','RESUMEN',
    'registros',total_reg,'totales',totales,'resumen',resumen_supervisor,'auditorias',aud
  );
end;
$$;

create or replace function public.mv_actividad_listar_cuadrillas(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil text;
  sede_u text;
  cuad_u text;
  arr jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil:=u->>'perfil';
  sede_u:=u->>'sede';
  cuad_u:=u->>'cuadrilla';

  if perfil not in ('SUPERVISOR','TECNICO','JEFATURA','ADMIN','ADMINISTRADOR') then
    return jsonb_build_object('ok',true,'modulo','OBSERVACIONES','accion','LISTAR_CUADRILLAS','perfil',perfil,'sede',sede_u,'registros',0,'cuadrillas','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'cuadrilla',x.cuadrilla,'sede',x.sede,'plataforma',x.plataforma,'supervisor',x.usuario_supervisor
  ) order by x.sede,x.cuadrilla),'[]'::jsonb)
  into arr
  from public.mv_actividad_cuadrilla_ultima x
  where (x.estado='' or x.estado='ACTIVO')
    and (
      (perfil='SUPERVISOR' and x.sede=sede_u)
      or (perfil='TECNICO' and x.cuadrilla=cuad_u)
      or (perfil in ('JEFATURA','ADMIN','ADMINISTRADOR'))
    );

  return jsonb_build_object(
    'ok',true,'modulo','OBSERVACIONES','accion','LISTAR_CUADRILLAS',
    'perfil',perfil,'sede',sede_u,'registros',jsonb_array_length(arr),'cuadrillas',arr
  );
end;
$$;

create or replace function public.mv_actividad_tipo_orden_datos(
  p_tipo_trabajo text,p_tipo text,p_producto_origen text,p_producto_servicio text,p_detalle text,p_tipo_base text,p_tipo_partida text
)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare t text;
begin
  t:=public.mv_actividad_texto(concat_ws(' ',p_tipo_trabajo,p_tipo,p_producto_origen,p_producto_servicio,p_detalle,p_tipo_base,p_tipo_partida));
  if t like '%PEXT%' or t like '%PLANTA EXTERNA%' then return 'PEXT'; end if;
  if t like '%GARANTIA%' or t ~ '(^| )GAR( |$)' then return 'GARANTIA'; end if;
  if t like '%REITERADA%' or t ~ '(^| )VTR( |$)' then return 'VTR'; end if;
  if t like '%INSTALACION%' or t like '%ALTA%' then return 'ALTA'; end if;
  if t<>'' then return 'VT'; end if;
  return '';
end;
$$;

create or replace function public.mv_actividad_buscar_datos_auditoria(
  p_usuario text,p_codigo text,p_cuadrilla text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil text;
  codigo_key text;
  cuad_key text;
  om public.ordenes%rowtype;
  bm public.base_operativa_legacy%rowtype;
  hay_o boolean:=false;
  hay_b boolean:=false;
  direccion_out text:='';
  ticket_out text:='';
  tipo_out text:='';
  source_out text:='';
  ticket_match text;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil:=u->>'perfil';
  if perfil not in ('SUPERVISOR','JEFATURA','ADMIN','ADMINISTRADOR','GERENCIA LIMA') then
    raise exception 'No tienes permiso para consultar datos de auditoría';
  end if;

  codigo_key:=public.mv_actividad_id_key(p_codigo);
  if codigo_key='' then raise exception 'Ingrese el código de pedido'; end if;
  cuad_key:=public.mv_actividad_cuadrilla_clave(p_cuadrilla);

  select o.*
  into om
  from public.ordenes o
  where
    (coalesce(cuad_key,'')='' or public.mv_actividad_cuadrilla_clave(o.cuadrilla)=cuad_key)
    and (
      public.mv_actividad_id_key(o.orden_id)=codigo_key
      or public.mv_actividad_id_key(o.codigo_cliente)=codigo_key
    )
  order by
    (
      case when public.mv_actividad_id_key(o.orden_id)=codigo_key then 120 else 0 end +
      case when public.mv_actividad_id_key(o.codigo_cliente)=codigo_key then 110 else 0 end +
      case when public.mv_actividad_id_key(o.codigo_cliente)=codigo_key then 45 else 0 end +
      case when public.mv_actividad_id_key(o.orden_id)=codigo_key then 40 else 0 end +
      case when public.mv_actividad_id_key(o.orden_id)=codigo_key and public.mv_actividad_id_key(o.codigo_cliente)=codigo_key then 100 else 0 end
    ) desc,
    o.id desc
  limit 1;
  hay_o:=found;

  select b.*
  into bm
  from public.base_operativa_legacy b
  where public.mv_actividad_id_key(b.codigo_pedido)=codigo_key
  order by
    case when cuad_key<>'' and public.mv_actividad_cuadrilla_clave(b.cuadrilla)=cuad_key then 1 else 0 end desc,
    b.source_row desc nulls last,b.id desc
  limit 1;
  hay_b:=found;

  if not hay_o and not hay_b then
    return jsonb_build_object('ok',true,'modulo','ACTIVIDAD_CAMPO','accion','BUSCAR_DATOS_AUDITORIA','encontrado',false);
  end if;

  if hay_o then
    direccion_out:=concat_ws(' - ',nullif(trim(om.direccion),''),nullif(trim(om.direccion_adicional),''));
    select upper(replace((regexp_match(concat_ws(' ',om.detalle,om.motivo_finalizacion,om.motivo_cancelacion,om.motivo_anulacion,om.producto_origen,om.producto_servicio),'(?i)\m(GAR|VTR|AT)\s*[-:]?\s*[0-9]{4,}\M'))[1] || '-' ||
                         regexp_replace((regexp_match(concat_ws(' ',om.detalle,om.motivo_finalizacion,om.motivo_cancelacion,om.motivo_anulacion,om.producto_origen,om.producto_servicio),'(?i)\m(GAR|VTR|AT)\s*[-:]?\s*([0-9]{4,})\M'))[2],'\s','','g'),':','-'))
    into ticket_match;
  end if;

  tipo_out:=public.mv_actividad_tipo_orden_datos(
    case when hay_o then om.tipo_trabajo else null end,
    case when hay_o then om.tipo else null end,
    case when hay_o then om.producto_origen else null end,
    case when hay_o then om.producto_servicio else null end,
    case when hay_o then om.detalle else null end,
    case when hay_b then bm.tipo_trabajo else null end,
    case when hay_b then bm.tipo_partida else null end
  );

  ticket_out:=coalesce(case when hay_b then nullif(trim(bm.ticket),'') end,ticket_match,'');
  source_out:=case when hay_o and hay_b then 'Mapa Operativo y base de Producción'
                   when hay_o then 'Mapa Operativo'
                   else 'base de Producción' end;

  return jsonb_build_object(
    'ok',true,'modulo','ACTIVIDAD_CAMPO','accion','BUSCAR_DATOS_AUDITORIA','encontrado',true,
    'fuente',source_out,
    'tipoOrden',tipo_out,
    'ticket',ticket_out,
    'dniCliente',coalesce(case when hay_o then nullif(trim(om.numero_documento),'') end,case when hay_b then nullif(trim(bm.numero_documento),'') end,''),
    'cliente',coalesce(case when hay_o then nullif(trim(om.cliente),'') end,case when hay_b then nullif(trim(bm.cliente),'') end,''),
    'direccion',direccion_out,
    'codigoPedido',coalesce(case when hay_o then nullif(trim(om.codigo_cliente),'') end,case when hay_o then nullif(trim(om.orden_id),'') end,case when hay_b then nullif(trim(bm.codigo_pedido),'') end,trim(p_codigo)),
    'cuadrillaEncontrada',coalesce(case when hay_o then nullif(trim(om.cuadrilla),'') end,case when hay_b then nullif(trim(bm.cuadrilla),'') end,'')
  );
end;
$$;

revoke execute on function public.mv_actividad_usuario_key(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_cuadrilla_norm(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_cuadrilla_clave(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_id_key(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_fecha_texto(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_usuario(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_item_json(public.actividad_campo_migracion) from public,anon,authenticated;
revoke execute on function public.mv_actividad_filtrar(text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_actividad_listar(text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_actividad_resumen(text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_actividad_listar_cuadrillas(text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_tipo_orden_datos(text,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_actividad_buscar_datos_auditoria(text,text,text) from public,anon,authenticated;

grant execute on function public.mv_actividad_usuario_key(text) to service_role;
grant execute on function public.mv_actividad_cuadrilla_norm(text) to service_role;
grant execute on function public.mv_actividad_cuadrilla_clave(text) to service_role;
grant execute on function public.mv_actividad_id_key(text) to service_role;
grant execute on function public.mv_actividad_fecha_texto(text) to service_role;
grant execute on function public.mv_actividad_usuario(text) to service_role;
grant execute on function public.mv_actividad_item_json(public.actividad_campo_migracion) to service_role;
grant execute on function public.mv_actividad_filtrar(text,jsonb) to service_role;
grant execute on function public.mv_actividad_listar(text,jsonb) to service_role;
grant execute on function public.mv_actividad_resumen(text,jsonb) to service_role;
grant execute on function public.mv_actividad_listar_cuadrillas(text) to service_role;
grant execute on function public.mv_actividad_tipo_orden_datos(text,text,text,text,text,text,text) to service_role;
grant execute on function public.mv_actividad_buscar_datos_auditoria(text,text,text) to service_role;
