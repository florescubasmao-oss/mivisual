-- MI VISUAL - Bonos de Produccion: calculo diario y conciliacion
-- Produccion normal + BONO GAR/VTR activo + PEXT validado.
-- PDG excluido por fecha; tarifa normal/especial parametrizada.
-- No publica pagos ni modifica historicos productivos.

begin;

create table if not exists public.bono_vtr_gar_snapshot (
  ticket text primary key,
  fecha_incidencia date,
  tipo text,
  codigo_pedido text,
  codigo_liquidacion text,
  estado_calificacion text,
  cuadrilla_ejecutora text,
  cuadrilla_puntaje text,
  sede text,
  resultado text,
  puntos_vtr_gar numeric(12,3),
  snapshot_at timestamptz not null default now()
);

create table if not exists public.bono_pext_snapshot (
  id text primary key,
  fecha_trabajo date,
  cuadrilla text,
  tipo_trabajo text,
  cantidad_conectorizados integer,
  cantidad_recableados integer,
  puntos_pext numeric(12,3),
  origen_puntos text,
  resultado_tecnico text,
  resultado_jefatura text,
  estado_bono text,
  snapshot_at timestamptz not null default now()
);

alter table public.bono_vtr_gar_snapshot enable row level security;
alter table public.bono_pext_snapshot enable row level security;
revoke all on table public.bono_vtr_gar_snapshot from anon,authenticated;
revoke all on table public.bono_pext_snapshot from anon,authenticated;

create or replace view public.mv_bono_fuentes_diarias_corte_v1 as
with cortes as (
  select periodo,fecha_corte
  from public.produccion_cortes_migracion
  where estado='VALIDADO_MIGRACION'
),
prod_migracion as (
  select
    c.periodo,
    m.fecha_ejecucion as fecha,
    m.cuadrilla,
    sum(coalesce(cat.puntaje_consistente,0))::numeric as puntos_produccion
  from cortes c
  join public.mv_produccion_partida_motor_migracion_v1 m
    on m.periodo_solicitud=c.periodo
   and m.elegible_produccion_efectiva
   and m.momento_ejecucion<=c.fecha_corte
  left join public.mv_catalogo_puntaje_codigo cat
    on cat.codigo=upper(trim(m.partida_motor))
  group by c.periodo,m.fecha_ejecucion,m.cuadrilla
),
vtr as (
  select
    to_char(fecha_incidencia,'YYYY-MM') as periodo,
    fecha_incidencia as fecha,
    cuadrilla_puntaje as cuadrilla,
    sum(case when resultado='BONO' then coalesce(puntos_vtr_gar,0) else 0 end)::numeric as puntos_vtr_gar
  from public.bono_vtr_gar_snapshot
  where estado_calificacion in ('CONFIRMADO','REASIGNADO')
  group by 1,2,3
),
pext as (
  select
    to_char(fecha_trabajo,'YYYY-MM') as periodo,
    fecha_trabajo as fecha,
    cuadrilla,
    sum(case when estado_bono='VALIDADO' then coalesce(puntos_pext,0) else 0 end)::numeric as puntos_pext
  from public.bono_pext_snapshot
  group by 1,2,3
),
claves as (
  select periodo,fecha,cuadrilla from prod_migracion
  union
  select periodo,fecha,cuadrilla from vtr
  union
  select periodo,fecha,cuadrilla from pext
)
select
  k.periodo,k.fecha,k.cuadrilla,
  coalesce(p.puntos_produccion,0)::numeric as puntos_produccion,
  coalesce(v.puntos_vtr_gar,0)::numeric as puntos_vtr_gar,
  coalesce(x.puntos_pext,0)::numeric as puntos_pext,
  (coalesce(p.puntos_produccion,0)+coalesce(v.puntos_vtr_gar,0)+coalesce(x.puntos_pext,0))::numeric as puntos_total
from claves k
left join prod_migracion p using(periodo,fecha,cuadrilla)
left join vtr v using(periodo,fecha,cuadrilla)
left join pext x using(periodo,fecha,cuadrilla);

create or replace view public.mv_bono_produccion_diario_migracion_v1 as
with p as (
  select valor from public.bono_produccion_parametros
  where id='VALOR_PUNTO_NORMAL'
  order by vigente_desde desc
  limit 1
)
select
  f.periodo,
  f.fecha,
  date_trunc('week',f.fecha)::date as semana_inicio,
  (date_trunc('week',f.fecha)::date + 6) as semana_fin,
  (date_trunc('week',f.fecha)::date + 14) as fecha_referencial,
  f.cuadrilla,
  f.puntos_produccion,
  f.puntos_vtr_gar,
  f.puntos_pext,
  f.puntos_total,
  coalesce(r.tratamiento,'NORMAL') as tratamiento,
  coalesce(r.valor_punto,p.valor) as valor_punto,
  r.id_regla,
  calc.genera,
  calc.puntos_produccion_comisionables,
  calc.puntos_pext_comisionables,
  calc.bono_produccion,
  calc.bono_pext,
  calc.bono_cuadrilla,
  calc.bono_tecnico
from public.mv_bono_fuentes_diarias_corte_v1 f
cross join p
left join lateral public.mv_bono_regla_cuadrilla(f.cuadrilla,f.fecha) r on true
left join lateral public.mv_bono_calcular(
  f.puntos_total,
  f.puntos_pext,
  coalesce(r.valor_punto,p.valor)
) calc on true
where coalesce(r.tratamiento,'NORMAL')<>'PDG';

create or replace view public.mv_bono_produccion_diario_legacy_v1 as
with prod as (
  select
    periodo,fecha,cuadrilla,
    sum(p.cantidad*coalesce(c.puntaje_consistente,0))::numeric as puntos_produccion
  from public.produccion_legacy_snapshot p
  left join public.mv_catalogo_puntaje_codigo c
    on c.codigo=upper(trim(p.codigo))
  group by periodo,fecha,cuadrilla
),
vtr as (
  select
    to_char(fecha_incidencia,'YYYY-MM') periodo,
    fecha_incidencia fecha,
    cuadrilla_puntaje cuadrilla,
    sum(case when resultado='BONO' then coalesce(puntos_vtr_gar,0) else 0 end)::numeric puntos_vtr_gar
  from public.bono_vtr_gar_snapshot
  where estado_calificacion in ('CONFIRMADO','REASIGNADO')
  group by 1,2,3
),
pext as (
  select
    to_char(fecha_trabajo,'YYYY-MM') periodo,
    fecha_trabajo fecha,
    cuadrilla,
    sum(case when estado_bono='VALIDADO' then coalesce(puntos_pext,0) else 0 end)::numeric puntos_pext
  from public.bono_pext_snapshot
  group by 1,2,3
),
claves as (
  select periodo,fecha,cuadrilla from prod
  union select periodo,fecha,cuadrilla from vtr
  union select periodo,fecha,cuadrilla from pext
),
fuentes as (
  select
    k.periodo,k.fecha,k.cuadrilla,
    coalesce(p.puntos_produccion,0)::numeric puntos_produccion,
    coalesce(v.puntos_vtr_gar,0)::numeric puntos_vtr_gar,
    coalesce(x.puntos_pext,0)::numeric puntos_pext,
    (coalesce(p.puntos_produccion,0)+coalesce(v.puntos_vtr_gar,0)+coalesce(x.puntos_pext,0))::numeric puntos_total
  from claves k
  left join prod p using(periodo,fecha,cuadrilla)
  left join vtr v using(periodo,fecha,cuadrilla)
  left join pext x using(periodo,fecha,cuadrilla)
),
p as (
  select valor from public.bono_produccion_parametros
  where id='VALOR_PUNTO_NORMAL'
  order by vigente_desde desc
  limit 1
)
select
  f.*,
  coalesce(r.tratamiento,'NORMAL') tratamiento,
  coalesce(r.valor_punto,p.valor) valor_punto,
  r.id_regla,
  calc.genera,
  calc.bono_produccion,
  calc.bono_pext,
  calc.bono_cuadrilla,
  calc.bono_tecnico
from fuentes f
cross join p
left join lateral public.mv_bono_regla_cuadrilla(f.cuadrilla,f.fecha) r on true
left join lateral public.mv_bono_calcular(
  f.puntos_total,
  f.puntos_pext,
  coalesce(r.valor_punto,p.valor)
) calc on true
where coalesce(r.tratamiento,'NORMAL')<>'PDG';

create or replace view public.mv_bono_produccion_conciliacion_corte_v1 as
with legacy as (
  select periodo,
    sum(puntos_produccion)::numeric puntos_produccion,
    sum(puntos_vtr_gar)::numeric puntos_vtr_gar,
    sum(puntos_pext)::numeric puntos_pext,
    sum(puntos_total)::numeric puntos_total,
    sum(bono_cuadrilla)::numeric bono_cuadrilla,
    sum(bono_tecnico)::numeric bono_tecnico_referencial,
    count(*) filter(where genera)::integer dias_cuadrilla_con_bono
  from public.mv_bono_produccion_diario_legacy_v1
  group by periodo
),
mig as (
  select periodo,
    sum(puntos_produccion)::numeric puntos_produccion,
    sum(puntos_vtr_gar)::numeric puntos_vtr_gar,
    sum(puntos_pext)::numeric puntos_pext,
    sum(puntos_total)::numeric puntos_total,
    sum(bono_cuadrilla)::numeric bono_cuadrilla,
    sum(bono_tecnico)::numeric bono_tecnico_referencial,
    count(*) filter(where genera)::integer dias_cuadrilla_con_bono
  from public.mv_bono_produccion_diario_migracion_v1
  group by periodo
)
select
  coalesce(l.periodo,m.periodo) periodo,
  l.puntos_produccion puntos_produccion_legacy,
  m.puntos_produccion puntos_produccion_migracion,
  l.puntos_vtr_gar,
  l.puntos_pext,
  l.puntos_total puntos_total_legacy,
  m.puntos_total puntos_total_migracion,
  l.bono_cuadrilla bono_cuadrilla_legacy,
  m.bono_cuadrilla bono_cuadrilla_migracion,
  m.bono_cuadrilla-l.bono_cuadrilla diferencia_bono_cuadrilla,
  l.dias_cuadrilla_con_bono dias_bono_legacy,
  m.dias_cuadrilla_con_bono dias_bono_migracion
from legacy l
full join mig m using(periodo);

commit;
