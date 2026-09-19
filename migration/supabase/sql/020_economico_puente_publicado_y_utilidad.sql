-- MI VISUAL - Economico: puente publicado + correcciones validadas
-- Lo ya publicado conserva codigo economico. Las reclasificaciones nuevas no
-- reescriben retroactivamente el snapshot. Ordenes futuras usan motor nuevo.

begin;

create or replace view public.mv_economico_ingreso_migracion_cuadrilla as
with protegido as (
  select
    l.periodo,l.cuadrilla_key,l.cuadrilla,l.ordenes,
    l.ingreso_legacy as ingreso_migracion,
    l.ordenes_valorizadas_legacy as ordenes_valorizadas,
    0::integer as partidas_sin_tarifa,
    'SNAPSHOT_PROTEGIDO'::text as modo
  from public.mv_economico_ingreso_legacy_cuadrilla l
  join public.produccion_periodos pp on pp.periodo=l.periodo
  where pp.protegido
),
publicado_activo as (
  select
    p.periodo,
    public.mv_norm_key(p.cuadrilla) as cuadrilla_key,
    min(p.cuadrilla) as cuadrilla,
    sum(p.cantidad)::numeric as ordenes,
    sum(p.cantidad*coalesce(t.monto_efectivo_migracion,0))::numeric as ingreso,
    sum(p.cantidad) filter(where coalesce(t.monto_efectivo_migracion,0)>0)::numeric as valorizadas,
    sum(p.cantidad) filter(where t.monto_efectivo_migracion is null)::integer as sin_tarifa
  from public.produccion_legacy_snapshot p
  join public.produccion_periodos pp on pp.periodo=p.periodo and not pp.protegido
  left join public.mv_catalogo_tarifa_migracion_v1 t on t.codigo=upper(trim(p.codigo))
  group by p.periodo,public.mv_norm_key(p.cuadrilla)
),
correcciones as (
  select
    c.periodo,
    public.mv_norm_key(o.cuadrilla) as cuadrilla_key,
    min(o.cuadrilla) as cuadrilla,
    count(*) filter(where c.accion='RECUPERAR_PRODUCCION' and c.estado='VALIDADA_MIGRACION')::numeric as ordenes,
    sum(
      case when c.accion='RECUPERAR_PRODUCCION' and c.estado='VALIDADA_MIGRACION'
        then coalesce(t.monto_efectivo_migracion,0) else 0 end
    )::numeric as ingreso,
    count(*) filter(
      where c.accion='RECUPERAR_PRODUCCION'
        and c.estado='VALIDADA_MIGRACION'
        and coalesce(t.monto_efectivo_migracion,0)>0
    )::numeric as valorizadas,
    count(*) filter(
      where c.accion='RECUPERAR_PRODUCCION'
        and c.estado='VALIDADA_MIGRACION'
        and t.monto_efectivo_migracion is null
    )::integer as sin_tarifa
  from public.produccion_correcciones_migracion c
  join public.ordenes o on o.orden_id=c.orden_id
  left join public.mv_catalogo_tarifa_migracion_v1 t
    on t.codigo=upper(trim(c.codigo_partida))
  join public.produccion_periodos pp on pp.periodo=c.periodo and not pp.protegido
  group by c.periodo,public.mv_norm_key(o.cuadrilla)
),
activo as (
  select
    coalesce(p.periodo,c.periodo) as periodo,
    coalesce(p.cuadrilla_key,c.cuadrilla_key) as cuadrilla_key,
    coalesce(p.cuadrilla,c.cuadrilla) as cuadrilla,
    coalesce(p.ordenes,0)+coalesce(c.ordenes,0) as ordenes,
    coalesce(p.ingreso,0)+coalesce(c.ingreso,0) as ingreso_migracion,
    coalesce(p.valorizadas,0)+coalesce(c.valorizadas,0) as ordenes_valorizadas,
    coalesce(p.sin_tarifa,0)+coalesce(c.sin_tarifa,0) as partidas_sin_tarifa,
    'SNAPSHOT_ACTIVO_MAS_CORRECCIONES'::text as modo
  from publicado_activo p
  full join correcciones c using(periodo,cuadrilla_key)
)
select * from protegido
union all
select * from activo;

create or replace view public.mv_economico_ingreso_post_corte_motor as
select
  m.periodo_solicitud as periodo,
  public.mv_norm_key(m.cuadrilla) as cuadrilla_key,
  min(m.cuadrilla) as cuadrilla,
  count(*)::numeric as ordenes,
  sum(coalesce(t.monto_efectivo_migracion,0))::numeric as ingreso_motor,
  count(*) filter(where t.monto_efectivo_migracion is null)::integer as partidas_sin_tarifa
from public.mv_produccion_partida_motor_migracion_v1 m
join public.produccion_cortes_migracion c on c.periodo=m.periodo_solicitud
left join public.mv_catalogo_tarifa_migracion_v1 t
  on t.codigo=upper(trim(m.partida_motor))
where m.elegible_produccion_efectiva
  and m.momento_ejecucion>c.fecha_corte
group by m.periodo_solicitud,public.mv_norm_key(m.cuadrilla);

create or replace view public.mv_economico_utilidad_migracion as
with base as (
  select
    u.periodo,u.cuadrilla_key,
    pp.protegido,
    coalesce(im.cuadrilla,ca.cuadrilla,m.cuadrilla,g.cuadrilla,pen.cuadrilla,pdgl.cuadrilla,pdgm.cuadrilla,bl.cuadrilla,bm.cuadrilla) as cuadrilla,
    coalesce(ca.sede,m.sede,g.sede,'SIN SEDE') as sede,
    case
      when pp.protegido then
        case
          when u.cuadrilla_key like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
            or u.cuadrilla_key like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
          then 'PDG' else 'LEGACY_REGULAR' end
      else coalesce(r.tratamiento,'NORMAL')
    end as tratamiento,
    coalesce(im.ingreso_migracion,0)::numeric as produccion,
    coalesce(m.materiales,0)::numeric as materiales,
    coalesce(g.sueldos,0)::numeric as sueldos,
    coalesce(g.combustible,0)::numeric as combustible,
    coalesce(g.alquiler_unidad,0)::numeric as alquiler_unidad,
    case when pp.protegido
      then coalesce(bl.bonos_legacy_utilidad,0)
      else coalesce(bm.bonos_migracion,0)
    end::numeric as bonos,
    case when pp.protegido
      then coalesce(pdgl.pago_pdg,0)
      else coalesce(pdgm.pago_pdg,0)
    end::numeric as pago_pdg,
    coalesce(pen.penalidades_win,0)::numeric as penalidades_win,
    case when pp.protegido
      then coalesce(pdgl.partidas_sin_tarifa,0)
      else coalesce(pdgm.partidas_sin_tarifa,0)
    end::integer as partidas_pdg_sin_tarifa,
    coalesce(im.partidas_sin_tarifa,0)::integer as partidas_ingreso_sin_tarifa,
    coalesce(g.tiene_sueldo_t1,false) as tiene_sueldo_t1,
    coalesce(g.tiene_sueldo_t2,false) as tiene_sueldo_t2,
    coalesce(g.tiene_combustible,false) as tiene_combustible,
    coalesce(g.tiene_alquiler,false) as tiene_alquiler
  from public.mv_economico_universo u
  join public.produccion_periodos pp on pp.periodo=u.periodo
  left join public.mv_economico_ingreso_migracion_cuadrilla im using(periodo,cuadrilla_key)
  left join public.mv_economico_cuadrillas_activas ca using(cuadrilla_key)
  left join public.mv_economico_materiales_cuadrilla m using(periodo,cuadrilla_key)
  left join public.mv_economico_gastos_cuadrilla g using(periodo,cuadrilla_key)
  left join public.mv_economico_penalidades_win_cuadrilla pen using(periodo,cuadrilla_key)
  left join public.mv_economico_pago_pdg_legacy pdgl using(periodo,cuadrilla_key)
  left join public.mv_economico_pago_pdg_migracion pdgm using(periodo,cuadrilla_key)
  left join public.mv_economico_bono_legacy_utilidad bl using(periodo,cuadrilla_key)
  left join public.mv_economico_bono_migracion bm using(periodo,cuadrilla_key)
  left join lateral public.mv_bono_regla_cuadrilla(
    coalesce(im.cuadrilla,ca.cuadrilla,m.cuadrilla,g.cuadrilla,pen.cuadrilla,pdgm.cuadrilla,bm.cuadrilla),
    (u.periodo||'-01')::date
  ) r on true
)
select
  *,
  case
    when tratamiento='PDG'
      then materiales+pago_pdg+penalidades_win
    else materiales+sueldos+combustible+alquiler_unidad+bonos+penalidades_win
  end::numeric as costos_parciales,
  (
    produccion -
    case
      when tratamiento='PDG'
        then materiales+pago_pdg+penalidades_win
      else materiales+sueldos+combustible+alquiler_unidad+bonos+penalidades_win
    end
  )::numeric as utilidad_parcial,
  case
    when tratamiento='PDG'
      then partidas_pdg_sin_tarifa=0 and partidas_ingreso_sin_tarifa=0
    else tiene_sueldo_t1 and tiene_sueldo_t2 and tiene_combustible and tiene_alquiler
      and partidas_ingreso_sin_tarifa=0
  end as costos_completos,
  case
    when tratamiento='PDG'
      and partidas_pdg_sin_tarifa=0 and partidas_ingreso_sin_tarifa=0
      then produccion-(materiales+pago_pdg+penalidades_win)
    when tratamiento<>'PDG'
      and tiene_sueldo_t1 and tiene_sueldo_t2 and tiene_combustible and tiene_alquiler
      and partidas_ingreso_sin_tarifa=0
      then produccion-(materiales+sueldos+combustible+alquiler_unidad+bonos+penalidades_win)
    else null
  end::numeric as utilidad_confirmada,
  case
    when tratamiento='PDG' and (partidas_pdg_sin_tarifa>0 or partidas_ingreso_sin_tarifa>0)
      then 'INCOMPLETO_TARIFA'
    when tratamiento<>'PDG' and not (tiene_sueldo_t1 and tiene_sueldo_t2 and tiene_combustible and tiene_alquiler)
      then 'INCOMPLETO_GASTOS'
    when partidas_ingreso_sin_tarifa>0
      then 'INCOMPLETO_TARIFA'
    else 'COMPLETO'
  end as estado_economico
from base;

create or replace view public.mv_economico_resumen_periodo as
select
  periodo,
  round(sum(produccion),2) as produccion,
  round(sum(materiales),2) as materiales,
  round(sum(sueldos),2) as sueldos,
  round(sum(combustible),2) as combustible,
  round(sum(alquiler_unidad),2) as alquiler_unidad,
  round(sum(bonos),2) as bonos,
  round(sum(pago_pdg),2) as pago_pdg,
  round(sum(penalidades_win),2) as penalidades_win,
  round(sum(costos_parciales),2) as costos_parciales,
  round(sum(utilidad_parcial),2) as utilidad_parcial,
  round(sum(utilidad_confirmada) filter(where utilidad_confirmada is not null),2) as utilidad_confirmada_solo_completas,
  count(*)::integer as cuadrillas,
  count(*) filter(where estado_economico='COMPLETO')::integer as cuadrillas_completas,
  count(*) filter(where estado_economico<>'COMPLETO')::integer as cuadrillas_incompletas
from public.mv_economico_utilidad_migracion
group by periodo;

commit;
