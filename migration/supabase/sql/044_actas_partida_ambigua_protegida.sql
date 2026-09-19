
-- 044_actas_partida_ambigua_protegida.sql
-- Evita autocompletar TIPO_PARTIDA cuando un mismo codigo tiene multiples descripciones.

create or replace view public.mv_actas_catalogo_tipo_unico
with (security_invoker=true) as
select
  upper(trim(codigo)) as codigo,
  max(tipo_orden) as tipo_orden
from public.catalogo_partidas_migracion
where nullif(trim(codigo),'') is not null
  and nullif(trim(tipo_orden),'') is not null
group by upper(trim(codigo))
having count(distinct tipo_orden)=1;

create or replace view public.mv_actas_catalogo_ambiguedad
with (security_invoker=true) as
select
  upper(trim(codigo)) as codigo,
  count(distinct tipo_orden)::integer as variantes,
  string_agg(distinct tipo_orden,' | ' order by tipo_orden) as tipos
from public.catalogo_partidas_migracion
where nullif(trim(codigo),'') is not null
  and nullif(trim(tipo_orden),'') is not null
group by upper(trim(codigo))
having count(distinct tipo_orden)>1;

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
 u.tipo_orden
from candidato c
left join motor m on m.orden_id=c.orden_id
left join public.mv_actas_catalogo_tipo_unico u
  on u.codigo=upper(trim(m.partida_motor));
$$;

create or replace view public.mv_actas_datos_automaticos_migracion
with (security_invoker=true) as
select
 r.*,
 coalesce(r.fecha_fin_visita::date,r.fecha_inicio_visita::date,r.fecha_solicitud) as fecha_gestion_mapa,
 case
   when upper(coalesce(r.mapa_tipo_trabajo,'')) like '%INSTALACION%' then 'INSTALACION'
   when r.mapa_orden_id is not null then 'VISITA TECNICA'
   else null
 end as tipo_ejecucion_mapa,
 p.partida_motor as codigo_partida_motor,
 u.tipo_orden as tipo_partida_motor,
 (amb.codigo is not null) as tipo_partida_ambigua,
 amb.variantes as tipo_partida_variantes,
 amb.tipos as tipo_partida_opciones
from public.mv_actas_mapa_resolucion r
left join public.mv_produccion_partida_motor_migracion_v1 p on p.orden_id=r.mapa_orden_id
left join public.mv_actas_catalogo_tipo_unico u on u.codigo=upper(trim(p.partida_motor))
left join public.mv_actas_catalogo_ambiguedad amb on amb.codigo=upper(trim(p.partida_motor));

revoke all on public.mv_actas_catalogo_tipo_unico from anon,authenticated;
revoke all on public.mv_actas_catalogo_ambiguedad from anon,authenticated;
revoke all on public.mv_actas_datos_automaticos_migracion from anon,authenticated;
grant select on public.mv_actas_catalogo_tipo_unico to service_role;
grant select on public.mv_actas_catalogo_ambiguedad to service_role;
grant select on public.mv_actas_datos_automaticos_migracion to service_role;

revoke execute on function public.mv_actas_resolver_mapa_v344(text,text,text) from public,anon,authenticated;
grant execute on function public.mv_actas_resolver_mapa_v344(text,text,text) to service_role;
