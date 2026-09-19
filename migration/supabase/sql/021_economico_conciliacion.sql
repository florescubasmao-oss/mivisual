-- MI VISUAL - Analisis Economico: conciliacion legacy vs migracion
begin;

create or replace view public.mv_economico_resumen_legacy_periodo as
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
  round(sum(costos),2) as costos,
  round(sum(utilidad_legacy),2) as utilidad,
  count(*) filter(where costos_completos_legacy)::integer as cuadrillas_completas,
  count(*) filter(where not costos_completos_legacy)::integer as cuadrillas_incompletas
from public.mv_economico_utilidad_legacy
group by periodo;

create or replace view public.mv_economico_conciliacion_periodo as
select
  coalesce(l.periodo,m.periodo) as periodo,
  l.produccion as produccion_legacy,
  m.produccion as produccion_migracion,
  m.produccion-l.produccion as diferencia_produccion,
  l.materiales,
  l.bonos as bonos_legacy,
  m.bonos as bonos_migracion,
  m.bonos-l.bonos as diferencia_bonos,
  l.pago_pdg as pago_pdg_legacy,
  m.pago_pdg as pago_pdg_migracion,
  m.pago_pdg-l.pago_pdg as diferencia_pdg,
  l.penalidades_win,
  l.costos as costos_legacy,
  m.costos_parciales as costos_migracion_parciales,
  l.utilidad as utilidad_legacy,
  m.utilidad_parcial as utilidad_migracion_parcial,
  m.utilidad_parcial-l.utilidad as diferencia_utilidad_parcial,
  l.cuadrillas_completas as completas_legacy,
  m.cuadrillas_completas as completas_migracion,
  m.cuadrillas_incompletas as incompletas_migracion
from public.mv_economico_resumen_legacy_periodo l
full join public.mv_economico_resumen_periodo m using(periodo);

commit;
