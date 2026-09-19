
-- 107_plantilla_orden_v301_v404.sql
-- Porta Consulta de Plantilla de Orden (V271/V301) + CTO cercanas (V404).
-- Solo lectura. Fuente principal: ordenes PostgreSQL.
-- Código de pedido se resuelve contra Actas, Base Operativa y SLA.

create or replace function public.mv_id_mapa_norm(v text)
returns text
language sql
immutable
as $$
  select public.mv_norm_key(
    regexp_replace(trim(coalesce(v,'')), '\.0+$', '', 'g')
  );
$$;

revoke execute on function public.mv_id_mapa_norm(text) from public,anon,authenticated;
grant execute on function public.mv_id_mapa_norm(text) to service_role;

create or replace function public.mv_plantilla_buscar_ordenes(
  p_consulta text,
  p_cuadrillas text[] default null
)
returns table(
  criterio_busqueda text,
  codigo_pedido_relacion text,
  orden_id text,
  tipo_trabajo text,
  grupo_trabajo text,
  fecha_solicitud date,
  hora_solicitud time,
  cliente text,
  tipo text,
  producto_origen text,
  cuadrilla text,
  estado text,
  direccion text,
  direccion_adicional text,
  fecha_ultimo_estado timestamp,
  producto_servicio text,
  sede text,
  codigo_cliente text,
  numero_documento text,
  telefono_movil text,
  telefono_fijo text,
  fecha_fin_visita timestamp,
  fecha_inicio_visita timestamp,
  motivo_cancelacion text,
  motivo_finalizacion text,
  motivo_anulacion text,
  latitud double precision,
  longitud double precision,
  detalle text,
  fecha_importacion timestamp,
  cto_1 text,
  coordenada_cto_1 text,
  cto_2 text,
  coordenada_cto_2 text,
  cto_3 text,
  coordenada_cto_3 text,
  cto text,
  puerto text,
  codigo_seguimiento text
)
language sql
stable
security definer
set search_path=public
as $$
with params as (
  select public.mv_id_mapa_norm(p_consulta) q
),
permitidas as (
  select unnest(coalesce(p_cuadrillas,array[]::text[])) c
),
directas as (
  select
    case
      when public.mv_id_mapa_norm(o.orden_id)=p.q then 'Código de orden'
      when public.mv_id_mapa_norm(o.codigo_cliente)=p.q then 'Código de cliente'
      when public.mv_id_mapa_norm(o.numero_documento)=p.q then 'DNI'
      else null
    end criterio,
    ''::text codigo_pedido,
    o.*
  from public.ordenes o cross join params p
  where p.q<>''
    and (
      public.mv_id_mapa_norm(o.orden_id)=p.q or
      public.mv_id_mapa_norm(o.codigo_cliente)=p.q or
      public.mv_id_mapa_norm(o.numero_documento)=p.q
    )
    and (
      p_cuadrillas is null or
      exists (
        select 1 from permitidas a
        where public.mv_norm_key(a.c)=public.mv_norm_key(o.cuadrilla)
      )
    )
),
relaciones_pedido as (
  select public.mv_id_mapa_norm(a.codigo_orden) orden_norm, a.codigo_pedido
  from public.actas_migracion a cross join params p
  where public.mv_id_mapa_norm(a.codigo_pedido)=p.q
  union
  select public.mv_id_mapa_norm(b.codigo_liquidacion), b.codigo_pedido
  from public.base_operativa_legacy b cross join params p
  where public.mv_id_mapa_norm(b.codigo_pedido)=p.q
  union
  select public.mv_id_mapa_norm(s.codigo), s.codigo_pedido
  from public.sla_ordenes_legacy_snapshot s cross join params p
  where public.mv_id_mapa_norm(s.codigo_pedido)=p.q
),
por_pedido as (
  select
    'Código de pedido'::text criterio,
    max(r.codigo_pedido)::text codigo_pedido,
    o.*
  from relaciones_pedido r
  join public.ordenes o
    on public.mv_id_mapa_norm(o.orden_id)=r.orden_norm
  where not exists(select 1 from directas)
    and (
      p_cuadrillas is null or
      exists (
        select 1 from permitidas a
        where public.mv_norm_key(a.c)=public.mv_norm_key(o.cuadrilla)
      )
    )
  group by o.id
),
candidatas as (
  select * from directas
  union all
  select * from por_pedido
)
select
  c.criterio,c.codigo_pedido,
  c.orden_id,c.tipo_trabajo,c.grupo_trabajo,c.fecha_solicitud,c.hora_solicitud,
  c.cliente,c.tipo,c.producto_origen,c.cuadrilla,c.estado,c.direccion,c.direccion_adicional,
  c.fecha_ultimo_estado,c.producto_servicio,c.sede,c.codigo_cliente,c.numero_documento,
  c.telefono_movil,c.telefono_fijo,c.fecha_fin_visita,c.fecha_inicio_visita,c.motivo_cancelacion,
  c.motivo_finalizacion,c.motivo_anulacion,c.latitud,c.longitud,c.detalle,c.fecha_importacion,
  c.cto_1,c.coordenada_cto_1,c.cto_2,c.coordenada_cto_2,c.cto_3,c.coordenada_cto_3,c.cto,c.puerto,
  c.codigo_seguimiento
from candidatas c
order by
  coalesce(
    c.fecha_solicitud::timestamp + coalesce(c.hora_solicitud,time '00:00'),
    c.fecha_ultimo_estado,
    c.fecha_importacion
  ) desc nulls last,
  c.fecha_importacion desc nulls last,
  case when c.orden_id ~ '^[0-9]+$' then c.orden_id::numeric else 0 end desc,
  c.orden_id desc
limit 100;
$$;

revoke execute on function public.mv_plantilla_buscar_ordenes(text,text[]) from public,anon,authenticated;
grant execute on function public.mv_plantilla_buscar_ordenes(text,text[]) to service_role;

create or replace function public.mv_plantilla_ctos_cercanas(
  p_latitud double precision,
  p_longitud double precision,
  p_radio integer default 400,
  p_limite integer default 20
)
returns table(
  codigo text,
  latitud double precision,
  longitud double precision,
  sede text,
  ultima_actualizacion timestamp,
  orden_referencia text,
  codigo_cliente text,
  tipo_trabajo text,
  puerto text,
  veces_detectada integer,
  distancia_metros integer
)
language sql
stable
security definer
set search_path=public
as $$
with cfg as (
  select
    greatest(50,least(coalesce(p_radio,400),1000))::double precision radio,
    greatest(1,least(coalesce(p_limite,20),50)) lim
),
calc as (
  select
    c.codigo_cto codigo,c.latitud,c.longitud,c.sede,c.ultima_actualizacion,
    c.orden_referencia,c.codigo_cliente,c.tipo_trabajo,c.puerto_referencia puerto,
    c.veces_detectada,
    (
      6371000 * 2 * asin(
        least(1::double precision,
          sqrt(
            power(sin(radians(c.latitud-p_latitud)/2),2) +
            cos(radians(p_latitud))*cos(radians(c.latitud))*
            power(sin(radians(c.longitud-p_longitud)/2),2)
          )
        )
      )
    ) distancia
  from public.catalogo_cto c
  where c.latitud is not null and c.longitud is not null
)
select
  codigo,latitud,longitud,sede,ultima_actualizacion,orden_referencia,codigo_cliente,
  tipo_trabajo,puerto,veces_detectada,round(distancia)::integer distancia_metros
from calc,cfg
where distancia<=cfg.radio
order by distancia asc,veces_detectada desc,codigo asc
limit (select lim from cfg);
$$;

revoke execute on function public.mv_plantilla_ctos_cercanas(double precision,double precision,integer,integer)
  from public,anon,authenticated;
grant execute on function public.mv_plantilla_ctos_cercanas(double precision,double precision,integer,integer)
  to service_role;
