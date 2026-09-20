-- 121_economico_proteccion_historica_real.sql
-- 20/09/2026
-- Corrige el defecto de diseño donde el "snapshot protegido" seguía valorizando
-- códigos históricos contra un catálogo mutable. Julio/agosto quedan congelados
-- a nivel RESUMEN con los valores validados en migration/10_economic_validation.md.
-- El detalle monetario por cuadrilla de períodos protegidos NO se declara
-- autoritativo hasta contar con snapshot monetario inmutable por cuadrilla.

create table if not exists public.economico_resumen_protegido_snapshot(
  periodo text primary key,
  produccion numeric(14,2) not null,
  materiales numeric(14,2) not null,
  sueldos numeric(14,2) not null,
  combustible numeric(14,2) not null,
  alquiler_unidad numeric(14,2) not null,
  bonos numeric(14,2) not null,
  pago_pdg numeric(14,2) not null,
  penalidades_win numeric(14,2) not null,
  costos_parciales numeric(14,2) not null,
  utilidad_parcial numeric(14,2) not null,
  utilidad_confirmada_solo_completas numeric(14,2),
  cuadrillas integer not null,
  cuadrillas_completas integer not null,
  cuadrillas_incompletas integer not null,
  detalle_cuadrilla_autoritativo boolean not null default false,
  fuente_validacion text not null,
  congelado_at timestamptz not null default now()
);

alter table public.economico_resumen_protegido_snapshot enable row level security;
revoke all on public.economico_resumen_protegido_snapshot from anon,authenticated;
grant select,insert,update,delete on public.economico_resumen_protegido_snapshot to service_role;

insert into public.economico_resumen_protegido_snapshot(
  periodo,produccion,materiales,sueldos,combustible,alquiler_unidad,bonos,pago_pdg,
  penalidades_win,costos_parciales,utilidad_parcial,utilidad_confirmada_solo_completas,
  cuadrillas,cuadrillas_completas,cuadrillas_incompletas,
  detalle_cuadrilla_autoritativo,fuente_validacion
) values
(
  '2026-07',289440.00,57960.71,65770.00,11000.00,20650.00,19507.50,9312.25,
  400.00,184600.46,104839.54,104839.54,
  23,23,0,false,
  'VALIDACION_ECONOMICA_18_09_2026 + REGLA_PERIODO_CERRADO'
),
(
  '2026-08',314570.00,54039.97,0.00,0.00,0.00,19732.50,12068.23,
  600.00,86440.70,228129.30,null,
  28,2,26,false,
  'VALIDACION_ECONOMICA_18_09_2026 + REGLA_PERIODO_PROTEGIDO'
)
on conflict(periodo) do update set
  produccion=excluded.produccion,
  materiales=excluded.materiales,
  sueldos=excluded.sueldos,
  combustible=excluded.combustible,
  alquiler_unidad=excluded.alquiler_unidad,
  bonos=excluded.bonos,
  pago_pdg=excluded.pago_pdg,
  penalidades_win=excluded.penalidades_win,
  costos_parciales=excluded.costos_parciales,
  utilidad_parcial=excluded.utilidad_parcial,
  utilidad_confirmada_solo_completas=excluded.utilidad_confirmada_solo_completas,
  cuadrillas=excluded.cuadrillas,
  cuadrillas_completas=excluded.cuadrillas_completas,
  cuadrillas_incompletas=excluded.cuadrillas_incompletas,
  detalle_cuadrilla_autoritativo=false,
  fuente_validacion=excluded.fuente_validacion,
  congelado_at=now();

create or replace view public.mv_economico_resumen_periodo_dinamico
with (security_invoker=true) as
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

create or replace view public.mv_economico_resumen_periodo
with (security_invoker=true) as
select
  s.periodo,s.produccion,s.materiales,s.sueldos,s.combustible,s.alquiler_unidad,
  s.bonos,s.pago_pdg,s.penalidades_win,s.costos_parciales,s.utilidad_parcial,
  s.utilidad_confirmada_solo_completas,s.cuadrillas,s.cuadrillas_completas,s.cuadrillas_incompletas
from public.economico_resumen_protegido_snapshot s
join public.produccion_periodos p on p.periodo=s.periodo and p.protegido
union all
select d.*
from public.mv_economico_resumen_periodo_dinamico d
join public.produccion_periodos p on p.periodo=d.periodo and not p.protegido;

create or replace view public.mv_economico_resumen_legacy_periodo_dinamico
with (security_invoker=true) as
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

create or replace view public.mv_economico_resumen_legacy_periodo
with (security_invoker=true) as
select
  s.periodo,s.produccion,s.materiales,s.sueldos,s.combustible,s.alquiler_unidad,
  s.bonos,s.pago_pdg,s.penalidades_win,
  s.costos_parciales as costos,
  s.utilidad_parcial as utilidad,
  s.cuadrillas_completas,s.cuadrillas_incompletas
from public.economico_resumen_protegido_snapshot s
join public.produccion_periodos p on p.periodo=s.periodo and p.protegido
union all
select d.*
from public.mv_economico_resumen_legacy_periodo_dinamico d
join public.produccion_periodos p on p.periodo=d.periodo and not p.protegido;

create or replace view public.mv_economico_conciliacion_periodo
with (security_invoker=true) as
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

revoke all on public.mv_economico_resumen_periodo_dinamico from anon,authenticated;
revoke all on public.mv_economico_resumen_periodo from anon,authenticated;
revoke all on public.mv_economico_resumen_legacy_periodo_dinamico from anon,authenticated;
revoke all on public.mv_economico_resumen_legacy_periodo from anon,authenticated;
revoke all on public.mv_economico_conciliacion_periodo from anon,authenticated;

grant select on public.mv_economico_resumen_periodo_dinamico to service_role;
grant select on public.mv_economico_resumen_periodo to service_role;
grant select on public.mv_economico_resumen_legacy_periodo_dinamico to service_role;
grant select on public.mv_economico_resumen_legacy_periodo to service_role;
grant select on public.mv_economico_conciliacion_periodo to service_role;

update public.migration_live_source_control
set status='REQUIERE_RESYNC_FINAL',
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='RESUMEN_PROTEGIDO_JUL_AGO + MOTOR_ACTIVO_SEP',
    notes='Protección histórica corregida: julio/agosto resumen económico congelado; no se revaloriza con catálogo mutable. Detalle monetario por cuadrilla de períodos protegidos no es autoritativo hasta crear snapshot inmutable por cuadrilla. Septiembre continúa dinámico y requiere resync de fuentes vivas.',
    updated_at=now()
where modulo='ANALISIS_ECONOMICO';
