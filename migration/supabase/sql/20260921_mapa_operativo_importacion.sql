-- MI VISUAL · Mapa Operativo
-- Importación operativa desde Excel hacia PostgreSQL.
-- Protege periodos cerrados, conserva valores cuando la carga viene vacía,
-- evita retrocesos por FECHA_ULTIMO_ESTADO y actualiza CATALOGO_CTO.

CREATE OR REPLACE FUNCTION public.mv_mapa_importar_operativo(p_rows jsonb, p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_source int := 0; v_valid_order int := 0; v_distinct_order int := 0; v_repeated int := 0;
  v_new int := 0; v_updated int := 0; v_protected int := 0; v_invalid_new_date int := 0;
  v_state_regressions int := 0; v_applied int := 0; v_total int := 0;
  v_cto_new int := 0; v_cto_updated int := 0; v_cto_total int := 0;
  v_now timestamp := timezone('America/Lima', now());
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'La carga del Mapa debe ser un arreglo JSON.';
  end if;
  v_source := jsonb_array_length(p_rows);
  if v_source = 0 then raise exception 'No se recibieron órdenes para importar.'; end if;
  if v_source > 10000 then raise exception 'La importación supera el máximo de 10,000 órdenes por carga.'; end if;

  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_MAPA_IMPORT'));

  select count(*), count(distinct nullif(btrim(x->>'orden_id'),''))
    into v_valid_order, v_distinct_order
  from jsonb_array_elements(p_rows) x
  where nullif(btrim(x->>'orden_id'),'') is not null;
  v_repeated := greatest(v_valid_order - v_distinct_order, 0);

  create temp table _mv_mapa_input on commit drop as
  with src as (
    select ordinality::bigint source_ord, j
    from jsonb_array_elements(p_rows) with ordinality t(j,ordinality)
  ), parsed as (
    select
      source_ord,
      nullif(btrim(j->>'orden_id'),'') as orden_id,
      nullif(btrim(j->>'tipo_trabajo'),'') as tipo_trabajo,
      case when coalesce(j->>'fecha_solicitud','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
        then (j->>'fecha_solicitud')::date else null end as fecha_solicitud,
      case when coalesce(j->>'hora_solicitud','') ~ '^[0-2][0-9]:[0-5][0-9](:[0-5][0-9])?$'
        then (j->>'hora_solicitud')::time else null end as hora_solicitud,
      nullif(btrim(j->>'cliente'),'') as cliente,
      nullif(btrim(j->>'tipo'),'') as tipo,
      nullif(btrim(j->>'producto_origen'),'') as producto_origen,
      nullif(btrim(j->>'cuadrilla'),'') as cuadrilla,
      nullif(btrim(j->>'estado'),'') as estado,
      nullif(btrim(j->>'direccion'),'') as direccion,
      nullif(btrim(j->>'direccion_adicional'),'') as direccion_adicional,
      case when coalesce(j->>'fecha_ultimo_estado','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-2][0-9]:[0-5][0-9](:[0-5][0-9])?$'
        then (j->>'fecha_ultimo_estado')::timestamp else null end as fecha_ultimo_estado,
      nullif(btrim(j->>'producto_servicio'),'') as producto_servicio,
      nullif(upper(btrim(j->>'sede')),'') as sede,
      nullif(btrim(j->>'codigo_cliente'),'') as codigo_cliente,
      nullif(btrim(j->>'numero_documento'),'') as numero_documento,
      nullif(btrim(j->>'telefono_movil'),'') as telefono_movil,
      nullif(btrim(j->>'telefono_fijo'),'') as telefono_fijo,
      case when coalesce(j->>'fecha_fin_visita','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-2][0-9]:[0-5][0-9](:[0-5][0-9])?$'
        then (j->>'fecha_fin_visita')::timestamp else null end as fecha_fin_visita,
      case when coalesce(j->>'fecha_inicio_visita','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-2][0-9]:[0-5][0-9](:[0-5][0-9])?$'
        then (j->>'fecha_inicio_visita')::timestamp else null end as fecha_inicio_visita,
      nullif(btrim(j->>'motivo_cancelacion'),'') as motivo_cancelacion,
      nullif(btrim(j->>'motivo_finalizacion'),'') as motivo_finalizacion,
      nullif(btrim(j->>'motivo_anulacion'),'') as motivo_anulacion,
      case when coalesce(j->>'latitud','') ~ '^-?[0-9]+([.][0-9]+)?$' then (j->>'latitud')::double precision else null end as latitud,
      case when coalesce(j->>'longitud','') ~ '^-?[0-9]+([.][0-9]+)?$' then (j->>'longitud')::double precision else null end as longitud,
      nullif(btrim(j->>'detalle'),'') as detalle,
      nullif(btrim(j->>'cto_1'),'') as cto_1,
      nullif(btrim(j->>'coordenada_cto_1'),'') as coordenada_cto_1,
      nullif(btrim(j->>'cto_2'),'') as cto_2,
      nullif(btrim(j->>'coordenada_cto_2'),'') as coordenada_cto_2,
      nullif(btrim(j->>'cto_3'),'') as cto_3,
      nullif(btrim(j->>'coordenada_cto_3'),'') as coordenada_cto_3,
      nullif(btrim(j->>'cto'),'') as cto,
      nullif(btrim(j->>'puerto'),'') as puerto,
      nullif(btrim(j->>'codigo_seguimiento'),'') as codigo_seguimiento,
      row_number() over (partition by nullif(btrim(j->>'orden_id'),'') order by source_ord desc) as rn
    from src
  )
  select * from parsed where orden_id is not null and rn=1;

  create temp table _mv_mapa_apply on commit drop as
  select i.*,(o.orden_id is not null) existed_before,
         coalesce(i.fecha_solicitud,o.fecha_solicitud) fecha_efectiva,
         coalesce(pp.protegido,false) protegido,
         (o.orden_id is null and i.fecha_solicitud is null) nueva_sin_fecha
  from _mv_mapa_input i
  left join public.ordenes o on o.orden_id=i.orden_id
  left join public.produccion_periodos pp
    on pp.periodo=to_char(coalesce(i.fecha_solicitud,o.fecha_solicitud),'YYYY-MM');

  select count(*) filter(where protegido),
         count(*) filter(where nueva_sin_fecha),
         count(*) filter(where not protegido and not nueva_sin_fecha and existed_before),
         count(*) filter(where not protegido and not nueva_sin_fecha and not existed_before)
    into v_protected,v_invalid_new_date,v_updated,v_new
  from _mv_mapa_apply;

  select count(*) into v_state_regressions
  from _mv_mapa_apply a join public.ordenes o on o.orden_id=a.orden_id
  where not a.protegido and not a.nueva_sin_fecha
    and a.fecha_ultimo_estado is not null and o.fecha_ultimo_estado is not null
    and a.fecha_ultimo_estado < o.fecha_ultimo_estado;

  insert into public.ordenes(
    orden_id,tipo_trabajo,grupo_trabajo,fecha_solicitud,hora_solicitud,cliente,tipo,producto_origen,
    cuadrilla,estado,direccion,direccion_adicional,fecha_ultimo_estado,producto_servicio,sede,codigo_cliente,
    numero_documento,telefono_movil,telefono_fijo,fecha_fin_visita,fecha_inicio_visita,motivo_cancelacion,
    motivo_finalizacion,motivo_anulacion,latitud,longitud,detalle,fecha_importacion,usuario_importacion,
    cto_1,coordenada_cto_1,cto_2,coordenada_cto_2,cto_3,coordenada_cto_3,cto,puerto,codigo_seguimiento,updated_at
  )
  select orden_id,tipo_trabajo,public.mv_mapa_grupo_trabajo(tipo_trabajo),
         fecha_solicitud,hora_solicitud,cliente,tipo,producto_origen,cuadrilla,estado,direccion,direccion_adicional,
         fecha_ultimo_estado,producto_servicio,sede,codigo_cliente,numero_documento,telefono_movil,telefono_fijo,
         fecha_fin_visita,fecha_inicio_visita,motivo_cancelacion,motivo_finalizacion,motivo_anulacion,
         latitud,longitud,detalle,v_now,p_actor,cto_1,coordenada_cto_1,cto_2,coordenada_cto_2,
         cto_3,coordenada_cto_3,cto,puerto,codigo_seguimiento,now()
  from _mv_mapa_apply
  where not protegido and not nueva_sin_fecha
  on conflict(orden_id) do update set
    tipo_trabajo=coalesce(excluded.tipo_trabajo,public.ordenes.tipo_trabajo),
    grupo_trabajo=coalesce(excluded.grupo_trabajo,public.ordenes.grupo_trabajo),
    fecha_solicitud=coalesce(excluded.fecha_solicitud,public.ordenes.fecha_solicitud),
    hora_solicitud=coalesce(excluded.hora_solicitud,public.ordenes.hora_solicitud),
    cliente=coalesce(excluded.cliente,public.ordenes.cliente),
    tipo=coalesce(excluded.tipo,public.ordenes.tipo),
    producto_origen=coalesce(excluded.producto_origen,public.ordenes.producto_origen),
    cuadrilla=coalesce(excluded.cuadrilla,public.ordenes.cuadrilla),
    estado=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.estado else coalesce(excluded.estado,public.ordenes.estado) end,
    direccion=coalesce(excluded.direccion,public.ordenes.direccion),
    direccion_adicional=coalesce(excluded.direccion_adicional,public.ordenes.direccion_adicional),
    fecha_ultimo_estado=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.fecha_ultimo_estado else coalesce(excluded.fecha_ultimo_estado,public.ordenes.fecha_ultimo_estado) end,
    producto_servicio=coalesce(excluded.producto_servicio,public.ordenes.producto_servicio),
    sede=coalesce(excluded.sede,public.ordenes.sede),
    codigo_cliente=coalesce(excluded.codigo_cliente,public.ordenes.codigo_cliente),
    numero_documento=coalesce(excluded.numero_documento,public.ordenes.numero_documento),
    telefono_movil=coalesce(excluded.telefono_movil,public.ordenes.telefono_movil),
    telefono_fijo=coalesce(excluded.telefono_fijo,public.ordenes.telefono_fijo),
    fecha_fin_visita=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.fecha_fin_visita else coalesce(excluded.fecha_fin_visita,public.ordenes.fecha_fin_visita) end,
    fecha_inicio_visita=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.fecha_inicio_visita else coalesce(excluded.fecha_inicio_visita,public.ordenes.fecha_inicio_visita) end,
    motivo_cancelacion=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.motivo_cancelacion else coalesce(excluded.motivo_cancelacion,public.ordenes.motivo_cancelacion) end,
    motivo_finalizacion=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.motivo_finalizacion else coalesce(excluded.motivo_finalizacion,public.ordenes.motivo_finalizacion) end,
    motivo_anulacion=case when excluded.fecha_ultimo_estado is not null and public.ordenes.fecha_ultimo_estado is not null
      and excluded.fecha_ultimo_estado < public.ordenes.fecha_ultimo_estado
      then public.ordenes.motivo_anulacion else coalesce(excluded.motivo_anulacion,public.ordenes.motivo_anulacion) end,
    latitud=coalesce(excluded.latitud,public.ordenes.latitud),
    longitud=coalesce(excluded.longitud,public.ordenes.longitud),
    detalle=coalesce(excluded.detalle,public.ordenes.detalle),
    fecha_importacion=v_now,usuario_importacion=p_actor,
    cto_1=coalesce(excluded.cto_1,public.ordenes.cto_1),
    coordenada_cto_1=coalesce(excluded.coordenada_cto_1,public.ordenes.coordenada_cto_1),
    cto_2=coalesce(excluded.cto_2,public.ordenes.cto_2),
    coordenada_cto_2=coalesce(excluded.coordenada_cto_2,public.ordenes.coordenada_cto_2),
    cto_3=coalesce(excluded.cto_3,public.ordenes.cto_3),
    coordenada_cto_3=coalesce(excluded.coordenada_cto_3,public.ordenes.coordenada_cto_3),
    cto=coalesce(excluded.cto,public.ordenes.cto),
    puerto=coalesce(excluded.puerto,public.ordenes.puerto),
    codigo_seguimiento=coalesce(excluded.codigo_seguimiento,public.ordenes.codigo_seguimiento),
    updated_at=now();
  get diagnostics v_applied = row_count;

  create temp table _mv_cto on commit drop as
  with eligible as (
    select * from _mv_mapa_apply where not protegido and not nueva_sin_fecha
  ), expanded as (
    select source_ord*10+1 seq,orden_id,codigo_cliente,tipo_trabajo,sede,cto_1 codigo,coordenada_cto_1 coord,null::text puerto from eligible where cto_1 is not null
    union all select source_ord*10+2,orden_id,codigo_cliente,tipo_trabajo,sede,cto_2,coordenada_cto_2,null::text from eligible where cto_2 is not null
    union all select source_ord*10+3,orden_id,codigo_cliente,tipo_trabajo,sede,cto_3,coordenada_cto_3,null::text from eligible where cto_3 is not null
    union all select source_ord*10+4,orden_id,codigo_cliente,tipo_trabajo,sede,cto,null::text,puerto from eligible where cto is not null
  ), parsed as (
    select *,regexp_replace(upper(btrim(codigo)),'\s+','','g') cto_key,
      case when coalesce(coord,'') ~ '^\s*-?[0-9]+([.][0-9]+)?\s*,\s*-?[0-9]+([.][0-9]+)?\s*$'
        then split_part(regexp_replace(coord,'\s','','g'),',',1)::double precision end lat,
      case when coalesce(coord,'') ~ '^\s*-?[0-9]+([.][0-9]+)?\s*,\s*-?[0-9]+([.][0-9]+)?\s*$'
        then split_part(regexp_replace(coord,'\s','','g'),',',2)::double precision end lon
    from expanded where nullif(btrim(codigo),'') is not null
  )
  select cto_key,
    (array_agg(btrim(codigo) order by seq desc))[1] codigo_cto,
    (array_agg(lat order by seq desc) filter(where lat between -90 and 90))[1] latitud,
    (array_agg(lon order by seq desc) filter(where lon between -180 and 180))[1] longitud,
    (array_agg(case when lat between -90 and 90 and lon between -180 and 180 then lat::text||','||lon::text end order by seq desc)
      filter(where lat between -90 and 90 and lon between -180 and 180))[1] coordenada,
    (array_agg(nullif(sede,'') order by seq desc) filter(where nullif(sede,'') is not null))[1] sede,
    (array_agg(orden_id order by seq desc))[1] orden_referencia,
    (array_agg(nullif(codigo_cliente,'') order by seq desc) filter(where nullif(codigo_cliente,'') is not null))[1] codigo_cliente,
    (array_agg(nullif(tipo_trabajo,'') order by seq desc) filter(where nullif(tipo_trabajo,'') is not null))[1] tipo_trabajo,
    (array_agg(nullif(puerto,'') order by seq desc) filter(where nullif(puerto,'') is not null))[1] puerto_referencia,
    count(*)::int hits
  from parsed where cto_key <> '' group by cto_key;

  update public.catalogo_cto c
  set latitud=coalesce(t.latitud,c.latitud),longitud=coalesce(t.longitud,c.longitud),
      coordenada=coalesce(t.coordenada,c.coordenada),sede=coalesce(t.sede,c.sede),
      ultima_actualizacion=v_now,orden_referencia=coalesce(t.orden_referencia,c.orden_referencia),
      codigo_cliente=coalesce(t.codigo_cliente,c.codigo_cliente),tipo_trabajo=coalesce(t.tipo_trabajo,c.tipo_trabajo),
      puerto_referencia=coalesce(t.puerto_referencia,c.puerto_referencia),usuario_actualizacion=p_actor,
      veces_detectada=greatest(coalesce(c.veces_detectada,0),0)+t.hits,updated_at=now()
  from _mv_cto t
  where regexp_replace(upper(btrim(c.codigo_cto)),'\s+','','g')=t.cto_key;
  get diagnostics v_cto_updated = row_count;

  insert into public.catalogo_cto(
    codigo_cto,latitud,longitud,coordenada,sede,primera_deteccion,ultima_actualizacion,
    orden_referencia,codigo_cliente,tipo_trabajo,puerto_referencia,usuario_actualizacion,veces_detectada,updated_at
  )
  select t.codigo_cto,t.latitud,t.longitud,t.coordenada,t.sede,v_now,v_now,t.orden_referencia,t.codigo_cliente,
         t.tipo_trabajo,t.puerto_referencia,p_actor,greatest(t.hits,1),now()
  from _mv_cto t
  where not exists (
    select 1 from public.catalogo_cto c where regexp_replace(upper(btrim(c.codigo_cto)),'\s+','','g')=t.cto_key
  )
  on conflict(codigo_cto) do update set
    latitud=coalesce(excluded.latitud,public.catalogo_cto.latitud),
    longitud=coalesce(excluded.longitud,public.catalogo_cto.longitud),
    coordenada=coalesce(excluded.coordenada,public.catalogo_cto.coordenada),
    sede=coalesce(excluded.sede,public.catalogo_cto.sede),
    ultima_actualizacion=excluded.ultima_actualizacion,
    orden_referencia=coalesce(excluded.orden_referencia,public.catalogo_cto.orden_referencia),
    codigo_cliente=coalesce(excluded.codigo_cliente,public.catalogo_cto.codigo_cliente),
    tipo_trabajo=coalesce(excluded.tipo_trabajo,public.catalogo_cto.tipo_trabajo),
    puerto_referencia=coalesce(excluded.puerto_referencia,public.catalogo_cto.puerto_referencia),
    usuario_actualizacion=excluded.usuario_actualizacion,
    veces_detectada=public.catalogo_cto.veces_detectada+excluded.veces_detectada,
    updated_at=now();
  get diagnostics v_cto_new = row_count;

  select count(*) into v_total from public.ordenes;
  select count(*) into v_cto_total from public.catalogo_cto;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Carga operativa desde Mapa Operativo piloto por '||coalesce(p_actor,'SISTEMA')||
            '. Legacy continúa activo; requiere delta final antes de cutover.',updated_at=now()
  where modulo='MAPA_OPERATIVO';

  return jsonb_build_object(
    'ok',true,'modulo','MAPA_OPERATIVO','accion','IMPORTAR','sourceRows',v_source,
    'nuevos',v_new,'actualizados',v_updated,'repetidosCarga',v_repeated,
    'omitidos',greatest(v_source-v_valid_order,0)+v_invalid_new_date,
    'protegidosOmitidos',v_protected,'retrocesosEstadoEvitados',v_state_regressions,
    'appliedRows',v_applied,'totalGuardado',v_total,
    'catalogoCto',jsonb_build_object('nuevos',v_cto_new,'actualizados',v_cto_updated,'total',v_cto_total),
    'ultimaActualizacion',v_now,'ultimaActualizacionTexto',to_char(v_now,'DD/MM/YYYY HH24:MI')
  );
end;
$function$

