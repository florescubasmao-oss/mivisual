-- MI VISUAL - Produccion: elegibilidad por orden V1
-- Diagnostico paralelo. No publica ni modifica Produccion productiva.

begin;

create or replace function public.mv_norm_key(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      upper(coalesce(trim(v),'')),
      'ÁÉÍÓÚÜÑáéíóúüñ',
      'AEIOUUNAEIOUUN'
    ),
    '[^A-Z0-9]+',
    '',
    'g'
  );
$$;

revoke execute on function public.mv_norm_key(text) from public, anon, authenticated;
grant execute on function public.mv_norm_key(text) to service_role;

create or replace view public.mv_produccion_orden_elegibilidad_v1 as
select
  o.orden_id,
  to_char(o.fecha_solicitud,'YYYY-MM') as periodo_solicitud,
  coalesce(o.fecha_fin_visita::date,o.fecha_solicitud) as fecha_ejecucion,
  coalesce(o.fecha_fin_visita,o.fecha_ultimo_estado,o.fecha_solicitud::timestamp) as momento_ejecucion,
  o.fecha_solicitud,
  o.fecha_fin_visita,
  o.cuadrilla,
  o.sede,
  o.estado as estado_win,
  o.grupo_trabajo,
  o.codigo_seguimiento,
  o.codigo_cliente,
  o.numero_documento,
  o.tipo_trabajo,
  o.tipo as tipo_servicio_win,
  o.motivo_finalizacion,
  o.producto_origen,
  o.producto_servicio,
  (
    public.mv_norm_key(o.grupo_trabajo)='VTRYGAR'
    or upper(trim(coalesce(o.codigo_seguimiento,''))) ~ '^(VTR|GAR)[[:space:]-]?'
  ) as candidato_gar_vtr_raw,
  a.id as ajuste_partida_id,
  a.partida_win as ajuste_partida_win,
  a.partida_propuesta as ajuste_partida_propuesta,
  a.puntos_win as ajuste_puntos_win,
  a.puntos_propuesta as ajuste_puntos_propuesta,
  a.fecha_validacion as ajuste_fecha_validacion,
  (
    upper(trim(coalesce(o.estado,'')))='FINALIZADA'
    and not (
      public.mv_norm_key(o.grupo_trabajo)='VTRYGAR'
      or upper(trim(coalesce(o.codigo_seguimiento,''))) ~ '^(VTR|GAR)[[:space:]-]?'
    )
  ) as elegible_produccion_base,
  case
    when upper(trim(coalesce(o.estado,'')))<>'FINALIZADA' then 'ESTADO_NO_FINALIZADO'
    when public.mv_norm_key(o.grupo_trabajo)='VTRYGAR' then 'GRUPO_VTR_GAR'
    when upper(trim(coalesce(o.codigo_seguimiento,''))) ~ '^(VTR|GAR)[[:space:]-]?' then 'TICKET_VTR_GAR'
    else 'ELEGIBLE_BASE'
  end as motivo_elegibilidad_base
from public.ordenes o
left join public.mv_ajuste_partida_vigente a
  on a.orden_id=o.orden_id;

create or replace view public.mv_produccion_conciliacion_cantidad_v1 as
with cortes as (
  select
    periodo,
    max(fecha) as ultima_fecha_prod,
    max(fecha_actualizacion) as ultima_actualizacion_prod,
    sum(cantidad) as cantidad_legacy
  from public.produccion_legacy_snapshot
  group by periodo
),
calc as (
  select
    c.periodo,
    c.ultima_fecha_prod,
    c.ultima_actualizacion_prod,
    c.cantidad_legacy,
    count(*) filter (
      where e.elegible_produccion_base
        and e.fecha_ejecucion <= c.ultima_fecha_prod
        and (
          c.ultima_actualizacion_prod is null
          or c.ultima_actualizacion_prod::time = time '00:00:00'
          or c.ultima_actualizacion_prod::date <> c.ultima_fecha_prod
          or e.momento_ejecucion <= c.ultima_actualizacion_prod
        )
    )::numeric as cantidad_calculada
  from cortes c
  join public.mv_produccion_orden_elegibilidad_v1 e
    on e.periodo_solicitud=c.periodo
  group by c.periodo,c.ultima_fecha_prod,c.ultima_actualizacion_prod,c.cantidad_legacy
)
select
  periodo,
  ultima_fecha_prod,
  ultima_actualizacion_prod,
  cantidad_legacy,
  cantidad_calculada,
  cantidad_calculada-cantidad_legacy as diferencia
from calc;

commit;
