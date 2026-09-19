-- MI VISUAL - Produccion / valorizacion
-- Preserva la regla legacy (ultima fila) y agrega tarifa efectiva mejorada.
-- No modifica CATALOGO_ORDENES ni historicos productivos.

begin;

create or replace view public.mv_catalogo_tarifa_legacy_v1 as
select distinct on (upper(trim(codigo)))
  upper(trim(codigo)) as codigo,
  source_row,
  tipo_orden,
  plataforma_orden,
  puntaje,
  monto,
  estado_tarifa
from public.catalogo_partidas_migracion
order by upper(trim(codigo)),source_row desc;

create or replace view public.mv_catalogo_tarifa_migracion_v1 as
with agg as (
  select
    upper(trim(codigo)) as codigo,
    count(distinct monto) filter (
      where monto>0 and upper(trim(coalesce(estado_tarifa,'')))='ACTIVO'
    )::integer as montos_positivos_distintos,
    min(monto) filter (
      where monto>0 and upper(trim(coalesce(estado_tarifa,'')))='ACTIVO'
    ) as monto_min,
    max(monto) filter (
      where monto>0 and upper(trim(coalesce(estado_tarifa,'')))='ACTIVO'
    ) as monto_max,
    max(source_row) as ultima_source_row
  from public.catalogo_partidas_migracion
  group by upper(trim(codigo))
),
legacy as (
  select * from public.mv_catalogo_tarifa_legacy_v1
)
select
  a.codigo,
  l.monto as monto_legacy,
  l.estado_tarifa as estado_legacy,
  l.tipo_orden as tipo_orden_legacy,
  l.plataforma_orden as plataforma_legacy,
  a.montos_positivos_distintos,
  a.monto_min,
  a.monto_max,
  case
    when a.montos_positivos_distintos=1 then a.monto_min
    else null
  end as monto_efectivo_migracion,
  case
    when a.montos_positivos_distintos=1
      and coalesce(l.monto,0)>0
      and l.monto=a.monto_min
      then 'UNIVOCA_VIGENTE'
    when a.montos_positivos_distintos=1
      and coalesce(l.monto,0)<=0
      then 'UNIVOCA_RECUPERADA'
    when a.montos_positivos_distintos>1
      then 'AMBIGUA_REQUIERE_DESDOBLE'
    else 'SIN_TARIFA'
  end as estado_tarifa_migracion
from agg a
left join legacy l using(codigo);

create or replace view public.mv_produccion_valorizacion_snapshot_comparada_v1 as
with p as (
  select periodo,upper(trim(codigo)) codigo,sum(cantidad) cantidad
  from public.produccion_legacy_snapshot
  group by periodo,upper(trim(codigo))
)
select
  p.periodo,
  sum(p.cantidad) as ordenes,
  sum(
    case
      when upper(trim(coalesce(l.estado_tarifa,'')))='ACTIVO' and coalesce(l.monto,0)>0
      then p.cantidad else 0
    end
  ) as ordenes_valorizadas_legacy,
  sum(
    case
      when upper(trim(coalesce(l.estado_tarifa,'')))='ACTIVO' and coalesce(l.monto,0)>0
      then p.cantidad*l.monto else 0
    end
  ) as monto_legacy,
  sum(
    case when m.monto_efectivo_migracion>0 then p.cantidad else 0 end
  ) as ordenes_valorizables_migracion,
  sum(
    case when m.monto_efectivo_migracion>0
      then p.cantidad*m.monto_efectivo_migracion else 0 end
  ) as monto_migracion,
  sum(
    case
      when (coalesce(l.monto,0)<=0 or upper(trim(coalesce(l.estado_tarifa,'')))<>'ACTIVO')
       and m.estado_tarifa_migracion='UNIVOCA_RECUPERADA'
      then p.cantidad*m.monto_efectivo_migracion else 0
    end
  ) as monto_recuperable,
  sum(
    case
      when m.estado_tarifa_migracion='AMBIGUA_REQUIERE_DESDOBLE'
      then p.cantidad else 0
    end
  ) as ordenes_tarifa_ambigua
from p
left join public.mv_catalogo_tarifa_legacy_v1 l using(codigo)
left join public.mv_catalogo_tarifa_migracion_v1 m using(codigo)
group by p.periodo;

commit;
