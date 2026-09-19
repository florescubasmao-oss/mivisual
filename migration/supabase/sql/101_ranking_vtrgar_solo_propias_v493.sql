
-- 101_ranking_vtrgar_solo_propias_v493.sql
-- Porta V493: el indicador POR VTR/GAR general NO cambia.
-- Ranking usa únicamente VTR/GAR PROPIAS:
-- responsable/origen == cuadrilla ejecutora.
-- CONFIRMADO / REASIGNADO contabilizan; PENDIENTE / ANULADO no.
-- BONO/NO BONO no altera esta regla.

create or replace view public.mv_ranking_vtr_gar_propias_v493
with (security_invoker=true) as
with propias as (
  select
    to_char(o.fecha_solicitud,'YYYY-MM') as periodo,
    public.mv_norm_key(o.cuadrilla) as cuadrilla_key,
    count(*) filter (where upper(trim(d.tipo))='GAR')::integer as gar,
    count(*) filter (where upper(trim(d.tipo))='VTR')::integer as vtr
  from public.mv_vtr_gar_decision_por_orden d
  join public.ordenes o on o.orden_id=d.orden_id
  where upper(trim(coalesce(d.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO')
    and public.mv_norm_key(o.estado) in ('FINALIZADA','FINALIZADO')
    and public.mv_vtr_gar_tipo_win(o.tipo_trabajo,o.codigo_seguimiento) is not null
    and public.mv_norm_key(coalesce(d.cuadrilla_responsable,''))
        = public.mv_norm_key(coalesce(o.cuadrilla,''))
  group by 1,2
)
select
  f.periodo,
  f.cuadrilla,
  f.actualizacion,
  f.total_finalizadas,
  coalesce(p.gar,0)::integer as gar,
  coalesce(p.vtr,0)::integer as vtr,
  (coalesce(p.gar,0)+coalesce(p.vtr,0))::integer as total_gar_vtr,
  case when f.total_finalizadas>0
       then (coalesce(p.gar,0)+coalesce(p.vtr,0))::numeric/f.total_finalizadas::numeric
       else 0::numeric
  end as porcentaje,
  'V493_SOLO_PROPIAS'::text as criterio_ranking
from public.mv_vtr_gar_indicador_migracion f
left join propias p
  on p.periodo=f.periodo
 and p.cuadrilla_key=public.mv_norm_key(f.cuadrilla);

revoke all on public.mv_ranking_vtr_gar_propias_v493 from anon,authenticated;
grant select on public.mv_ranking_vtr_gar_propias_v493 to service_role;

create or replace view public.mv_ranking_universo_migracion
with (security_invoker=true) as
with periodos as (
  select periodo from public.ranking_configuracion_motor where upper(estado)='ACTIVO'
), candidatos as (
  select p.periodo,m.cuadrilla from periodos p join public.mv_ranking_cuadrilla_meta m on m.tiene_usuario_activo
  union select x.periodo,case when left(trim(x.cuadrilla),2)='P ' then 'P'||substring(trim(x.cuadrilla) from 3) else trim(x.cuadrilla) end
    from public.mv_ranking_produccion_migracion x join periodos p on p.periodo=x.periodo
  union select x.periodo,case when left(trim(x.cuadrilla),2)='P ' then 'P'||substring(trim(x.cuadrilla) from 3) else trim(x.cuadrilla) end
    from public.mv_efectividad_migracion x join periodos p on p.periodo=x.periodo
  union select x.periodo,case when left(trim(x.cuadrilla),2)='P ' then 'P'||substring(trim(x.cuadrilla) from 3) else trim(x.cuadrilla) end
    from public.mv_recableado_migracion x join periodos p on p.periodo=x.periodo
  union select x.periodo,case when left(trim(x.cuadrilla),2)='P ' then 'P'||substring(trim(x.cuadrilla) from 3) else trim(x.cuadrilla) end
    from public.mv_ranking_vtr_gar_propias_v493 x join periodos p on p.periodo=x.periodo
  union select x.periodo,case when left(trim(x.cuadrilla),2)='P ' then 'P'||substring(trim(x.cuadrilla) from 3) else trim(x.cuadrilla) end
    from public.mv_sla_resumen_actual_v323 x join periodos p on p.periodo=x.periodo
  union select x.periodo,case when left(trim(x.cuadrilla),2)='P ' then 'P'||substring(trim(x.cuadrilla) from 3) else trim(x.cuadrilla) end
    from public.mv_ranking_observaciones_migracion x join periodos p on p.periodo=x.periodo
)
select periodo,cuadrilla from candidatos
where nullif(trim(cuadrilla),'') is not null and upper(trim(cuadrilla))<>'TODAS';

create or replace view public.mv_ranking_componentes_migracion
with (security_invoker=true) as
with prod as (
 select periodo,case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla,
        sede,produccion,ordenes_elegibles,partidas_fallback_1
 from public.mv_ranking_produccion_migracion
), ef as (
 select periodo,case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla,efectividad
 from public.mv_efectividad_migracion
), rec as (
 select periodo,case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla,porcentaje
 from public.mv_recableado_migracion
), vg as (
 select periodo,case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla,porcentaje
 from public.mv_ranking_vtr_gar_propias_v493
), sla as (
 select periodo,case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla,
        sla_bruto,sla_ajustado,evaluables,cumplen_ajustado,excepciones_aprobadas
 from public.mv_sla_resumen_actual_v323
), obs as (
 select periodo,case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla,
        observaciones,monto_total,monto_afectado
 from public.mv_ranking_observaciones_migracion
)
select u.periodo,u.cuadrilla,coalesce(m.sede,p.sede,'SIN SEDE') sede,
  coalesce(m.plataforma,case when upper(u.cuadrilla) like '%TRASLADO%' then 'TRASLADO'
    when upper(u.cuadrilla) like '% SGA %' then 'VISITA TECNICA'
    when upper(u.cuadrilla) like '% SGI %' then 'INSTALACION' else 'SIN PLATAFORMA' end) plataforma,
  coalesce(p.produccion,0)::numeric produccion,coalesce(e.efectividad,0)::numeric efectividad,
  coalesce(r.porcentaje,0)::numeric recableado,coalesce(v.porcentaje,0)::numeric vtrgar,
  coalesce(o.observaciones,0)::integer observaciones,coalesce(o.monto_total,0)::numeric monto_total,
  coalesce(o.monto_afectado,0)::numeric monto_afectado,coalesce(s.sla_bruto,0)::numeric sla_bruto,
  coalesce(s.sla_ajustado,0)::numeric sla_ajustado,coalesce(s.evaluables,0)::integer sla_evaluables,
  greatest(coalesce(s.evaluables,0)-coalesce(s.cumplen_ajustado,0),0)::integer sla_fuera,
  coalesce(s.excepciones_aprobadas,0)::integer sla_excepciones_aprobadas,
  coalesce(p.ordenes_elegibles,0)::integer produccion_ordenes,coalesce(p.partidas_fallback_1,0)::integer produccion_fallback_1
from public.mv_ranking_universo_migracion u
left join public.mv_ranking_cuadrilla_meta m on m.cuadrilla=u.cuadrilla
left join prod p on p.periodo=u.periodo and p.cuadrilla=u.cuadrilla
left join ef e on e.periodo=u.periodo and e.cuadrilla=u.cuadrilla
left join rec r on r.periodo=u.periodo and r.cuadrilla=u.cuadrilla
left join vg v on v.periodo=u.periodo and v.cuadrilla=u.cuadrilla
left join obs o on o.periodo=u.periodo and o.cuadrilla=u.cuadrilla
left join sla s on s.periodo=u.periodo and s.cuadrilla=u.cuadrilla;

revoke all on public.mv_ranking_universo_migracion from anon,authenticated;
revoke all on public.mv_ranking_componentes_migracion from anon,authenticated;
grant select on public.mv_ranking_universo_migracion to service_role;
grant select on public.mv_ranking_componentes_migracion to service_role;
