-- MI VISUAL - Produccion elegibilidad bidireccional V2
-- GAR/VTR confirmado/reasignado excluye produccion normal.
-- NO_ES_GAR_VTR recupera elegibilidad de produccion normal.
-- Periodos protegidos se conservan como snapshot y no se recalculan para corte.

begin;

create or replace view public.mv_produccion_orden_elegibilidad_v2 as
select
  e.*,
  g.estado_calificacion as decision_gar_vtr,
  g.tipo as tipo_gar_vtr,
  g.ticket as ticket_gar_vtr,
  g.fecha_ultima_edicion as fecha_decision_gar_vtr,
  case
    when upper(trim(coalesce(g.estado_calificacion,'')))='NO_ES_GAR_VTR' then false
    when upper(trim(coalesce(g.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO') then true
    else e.candidato_gar_vtr_raw
  end as es_gar_vtr_efectivo,
  (
    upper(trim(coalesce(e.estado_win,'')))='FINALIZADA'
    and not (
      case
        when upper(trim(coalesce(g.estado_calificacion,'')))='NO_ES_GAR_VTR' then false
        when upper(trim(coalesce(g.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO') then true
        else e.candidato_gar_vtr_raw
      end
    )
  ) as elegible_produccion_efectiva,
  case
    when upper(trim(coalesce(e.estado_win,'')))<>'FINALIZADA' then 'ESTADO_NO_FINALIZADO'
    when upper(trim(coalesce(g.estado_calificacion,'')))='NO_ES_GAR_VTR' then 'RECUPERADA_NO_ES_GAR_VTR'
    when upper(trim(coalesce(g.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO') then 'EXCLUIDA_GAR_VTR_VALIDADO'
    when e.candidato_gar_vtr_raw then 'EXCLUIDA_GAR_VTR_RAW'
    else 'ELEGIBLE_PRODUCCION'
  end as motivo_elegibilidad_efectiva
from public.mv_produccion_orden_elegibilidad_v1 e
left join public.mv_vtr_gar_decision_por_orden g
  on g.orden_id=e.orden_id;

create or replace view public.mv_produccion_conciliacion_activa_v2 as
with cortes as (
  select
    p.periodo,
    pp.estado as estado_periodo,
    pp.protegido,
    max(p.fecha) as ultima_fecha_prod,
    max(p.fecha_actualizacion) as ultima_actualizacion_prod,
    sum(p.cantidad) as cantidad_legacy
  from public.produccion_legacy_snapshot p
  left join public.produccion_periodos pp on pp.periodo=p.periodo
  group by p.periodo,pp.estado,pp.protegido
),
calc as (
  select
    c.*,
    count(*) filter (
      where e.elegible_produccion_efectiva
        and e.fecha_ejecucion <= c.ultima_fecha_prod
        and (
          c.ultima_actualizacion_prod is null
          or c.ultima_actualizacion_prod::time = time '00:00:00'
          or c.ultima_actualizacion_prod::date <> c.ultima_fecha_prod
          or e.momento_ejecucion <= c.ultima_actualizacion_prod
        )
    )::numeric as cantidad_calculada
  from cortes c
  join public.mv_produccion_orden_elegibilidad_v2 e
    on e.periodo_solicitud=c.periodo
  group by c.periodo,c.estado_periodo,c.protegido,c.ultima_fecha_prod,c.ultima_actualizacion_prod,c.cantidad_legacy
)
select
  periodo,
  estado_periodo,
  protegido,
  case when protegido then 'SNAPSHOT_PROTEGIDO' else 'CALCULO_ACTIVO' end as modo,
  ultima_fecha_prod,
  ultima_actualizacion_prod,
  cantidad_legacy,
  case when protegido then null else cantidad_calculada end as cantidad_calculada_activa,
  case when protegido then null else cantidad_calculada-cantidad_legacy end as diferencia_activa
from calc;

commit;
