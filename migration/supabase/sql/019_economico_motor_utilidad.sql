-- MI VISUAL - Analisis Economico / Utilidad por cuadrilla
-- Motor paralelo legacy vs migracion mejorada.
-- No modifica hojas ni datos productivos.

begin;

create table if not exists public.economico_pdg_aliases (
  codigo text primary key,
  nombre_tarifario text not null,
  observacion text
);

insert into public.economico_pdg_aliases(codigo,nombre_tarifario,observacion)
values
('IC','INSTALACION Y ACTIVACION DE ABONADOS EN CONDOMINIOS-V3','Alias heredado del backend legacy.'),
('UTP5','CABLEADO UTP CAT 5 O CAT 6 - POST VENTA','Alias heredado del backend legacy.')
on conflict(codigo) do update set
  nombre_tarifario=excluded.nombre_tarifario,
  observacion=excluded.observacion;

alter table public.economico_pdg_aliases enable row level security;
revoke all on table public.economico_pdg_aliases from anon,authenticated;

create or replace function public.mv_periodo_es(v text)
returns text
language sql
immutable
as $$
  select case
    when upper(coalesce(v,'')) like '%ENERO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-01'
    when upper(coalesce(v,'')) like '%FEBRERO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-02'
    when upper(coalesce(v,'')) like '%MARZO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-03'
    when upper(coalesce(v,'')) like '%ABRIL%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-04'
    when upper(coalesce(v,'')) like '%MAYO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-05'
    when upper(coalesce(v,'')) like '%JUNIO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-06'
    when upper(coalesce(v,'')) like '%JULIO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-07'
    when upper(coalesce(v,'')) like '%AGOSTO%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-08'
    when upper(coalesce(v,'')) like '%SEPTIEMBRE%' or upper(coalesce(v,'')) like '%SETIEMBRE%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-09'
    when upper(coalesce(v,'')) like '%OCTUBRE%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-10'
    when upper(coalesce(v,'')) like '%NOVIEMBRE%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-11'
    when upper(coalesce(v,'')) like '%DICIEMBRE%' then substring(coalesce(v,'') from '(20[0-9]{2})')||'-12'
    when coalesce(v,'') ~ '^20[0-9]{2}-[0-9]{2}$' then v
    else null
  end;
$$;

revoke execute on function public.mv_periodo_es(text) from public,anon,authenticated;
grant execute on function public.mv_periodo_es(text) to service_role;

create or replace view public.mv_economico_cuadrillas_activas as
select
  public.mv_norm_key(cuadrilla) as cuadrilla_key,
  min(cuadrilla) as cuadrilla,
  min(sede) as sede,
  min(plataforma) as plataforma,
  count(*)::integer as tecnicos_activos
from public.app_users
where upper(trim(coalesce(estado,'')))='ACTIVO'
  and upper(trim(coalesce(perfil,'')))='TECNICO'
  and coalesce(trim(cuadrilla),'')<>''
group by public.mv_norm_key(cuadrilla);

create or replace view public.mv_economico_materiales_cuadrilla as
select
  to_char(fecha,'YYYY-MM') as periodo,
  public.mv_norm_key(cuadrilla) as cuadrilla_key,
  min(cuadrilla) as cuadrilla,
  min(sede) as sede,
  round(sum(coalesce(costo_total,0)),2) as materiales,
  count(*)::integer as filas_materiales
from public.economico_materiales_snapshot
where fecha is not null and coalesce(trim(cuadrilla),'')<>''
group by 1,2;

create or replace view public.mv_economico_gastos_cuadrilla as
select
  periodo,
  public.mv_norm_key(cuadrilla) as cuadrilla_key,
  min(cuadrilla) as cuadrilla,
  min(sede) as sede,
  round(sum(coalesce(monto,0)) filter(where public.mv_norm_key(concepto) in ('SUELDOS','SUELDOTECNICO1','SUELDOTECNICO2')),2) as sueldos,
  round(sum(coalesce(monto,0)) filter(where public.mv_norm_key(concepto) in ('COMBUSTIBLE','GASOLINA','PETROLEO','DIESEL')),2) as combustible,
  round(sum(coalesce(monto,0)) filter(where public.mv_norm_key(concepto) in ('ALQUILER','ALQUILERUNIDAD','ALQUILERDEUNIDAD','UNIDAD','ALQUILERVEHICULO','ALQUILERDEVEHICULO')),2) as alquiler_unidad,
  bool_or(public.mv_norm_key(concepto) in ('SUELDOS','SUELDOTECNICO1')) as tiene_sueldo_t1,
  bool_or(public.mv_norm_key(concepto) in ('SUELDOS','SUELDOTECNICO2')) as tiene_sueldo_t2,
  bool_or(public.mv_norm_key(concepto) in ('COMBUSTIBLE','GASOLINA','PETROLEO','DIESEL')) as tiene_combustible,
  bool_or(public.mv_norm_key(concepto) in ('ALQUILER','ALQUILERUNIDAD','ALQUILERDEUNIDAD','UNIDAD','ALQUILERVEHICULO','ALQUILERDEVEHICULO')) as tiene_alquiler,
  max(fecha_carga) as ultima_carga_gastos
from public.economico_gastos_snapshot
where coalesce(trim(periodo),'')<>'' and coalesce(trim(cuadrilla),'')<>''
group by periodo,public.mv_norm_key(cuadrilla);

create or replace view public.mv_economico_penalidades_win_cuadrilla as
select
  coalesce(public.mv_periodo_es(periodo_texto),to_char(fecha_registro,'YYYY-MM')) as periodo,
  public.mv_norm_key(cuadrilla) as cuadrilla_key,
  min(cuadrilla) as cuadrilla,
  round(sum(coalesce(monto,0)),2) as penalidades_win,
  count(*)::integer as cantidad_penalidades
from public.economico_observaciones_snapshot
where upper(trim(coalesce(fuente,'')))='WIN'
  and upper(trim(coalesce(estado,'')))='PENALIZADO'
  and coalesce(trim(cuadrilla),'')<>''
group by 1,2;

create or replace view public.mv_economico_tarifa_pdg_codigo as
with codigos as (
  select distinct upper(trim(codigo)) as codigo
  from public.catalogo_partidas_migracion
  where coalesce(trim(codigo),'')<>''
),
base as (
  select
    c.codigo,
    cl.tipo_orden,
    a.nombre_tarifario as alias_nombre
  from codigos c
  left join public.mv_catalogo_tarifa_legacy_v1 cl on cl.codigo=c.codigo
  left join public.economico_pdg_aliases a on upper(trim(a.codigo))=c.codigo
)
select
  b.codigo,
  b.tipo_orden,
  t.source_row as tarifa_source_row,
  t.nombre_partida,
  t.tarifa_1_60,
  t.tarifa_61_mas,
  case
    when nullif(trim(coalesce(t.codigo_partida,'')),'') is not null
      and public.mv_norm_key(t.codigo_partida)=public.mv_norm_key(b.codigo) then 'CODIGO'
    when public.mv_norm_key(t.nombre_partida)=public.mv_norm_key(b.tipo_orden) then 'NOMBRE'
    when b.alias_nombre is not null
      and public.mv_norm_key(t.nombre_partida)=public.mv_norm_key(b.alias_nombre) then 'ALIAS'
    else 'SIN_TARIFA'
  end as metodo
from base b
left join lateral (
  select x.*
  from public.economico_tarifario_pdg_snapshot x
  where upper(trim(coalesce(x.estado,'ACTIVO')))='ACTIVO'
    and (
      (
        nullif(trim(coalesce(x.codigo_partida,'')),'') is not null
        and public.mv_norm_key(x.codigo_partida)=public.mv_norm_key(b.codigo)
      )
      or public.mv_norm_key(x.nombre_partida)=public.mv_norm_key(b.tipo_orden)
      or (
        b.alias_nombre is not null
        and public.mv_norm_key(x.nombre_partida)=public.mv_norm_key(b.alias_nombre)
      )
    )
  order by
    case
      when nullif(trim(coalesce(x.codigo_partida,'')),'') is not null
       and public.mv_norm_key(x.codigo_partida)=public.mv_norm_key(b.codigo) then 0
      when public.mv_norm_key(x.nombre_partida)=public.mv_norm_key(b.tipo_orden) then 1
      else 2
    end,
    x.source_row
  limit 1
) t on true;

create or replace view public.mv_economico_ingreso_legacy_cuadrilla as
select
  p.periodo,
  public.mv_norm_key(p.cuadrilla) as cuadrilla_key,
  min(p.cuadrilla) as cuadrilla,
  sum(p.cantidad)::numeric as ordenes,
  sum(
    case
      when upper(trim(coalesce(t.estado_tarifa,'')))='ACTIVO' and coalesce(t.monto,0)>0
      then p.cantidad*t.monto else 0
    end
  )::numeric as ingreso_legacy,
  sum(
    case
      when upper(trim(coalesce(t.estado_tarifa,'')))='ACTIVO' and coalesce(t.monto,0)>0
      then p.cantidad else 0
    end
  )::numeric as ordenes_valorizadas_legacy
from public.produccion_legacy_snapshot p
left join public.mv_catalogo_tarifa_legacy_v1 t
  on t.codigo=upper(trim(p.codigo))
group by p.periodo,public.mv_norm_key(p.cuadrilla);

create or replace view public.mv_economico_ingreso_migracion_cuadrilla as
with legacy_protegido as (
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
activo as (
  select
    m.periodo_solicitud as periodo,
    public.mv_norm_key(m.cuadrilla) as cuadrilla_key,
    min(m.cuadrilla) as cuadrilla,
    count(*)::numeric as ordenes,
    sum(coalesce(t.monto_efectivo_migracion,0))::numeric as ingreso_migracion,
    count(*) filter(where coalesce(t.monto_efectivo_migracion,0)>0)::numeric as ordenes_valorizadas,
    count(*) filter(where t.monto_efectivo_migracion is null)::integer as partidas_sin_tarifa,
    'MOTOR_ACTIVO'::text as modo
  from public.mv_produccion_partida_motor_migracion_v1 m
  join public.produccion_periodos pp
    on pp.periodo=m.periodo_solicitud and not pp.protegido
  left join public.produccion_cortes_migracion c
    on c.periodo=m.periodo_solicitud
  left join public.mv_catalogo_tarifa_migracion_v1 t
    on t.codigo=upper(trim(m.partida_motor))
  where m.elegible_produccion_efectiva
    and (c.fecha_corte is null or m.momento_ejecucion<=c.fecha_corte)
  group by m.periodo_solicitud,public.mv_norm_key(m.cuadrilla)
)
select * from legacy_protegido
union all
select * from activo;

create or replace view public.mv_economico_pago_pdg_legacy as
with prod as (
  select
    periodo,
    public.mv_norm_key(cuadrilla) as cuadrilla_key,
    min(cuadrilla) as cuadrilla,
    upper(trim(codigo)) as codigo,
    sum(cantidad)::numeric as cantidad
  from public.produccion_legacy_snapshot
  where (
    public.mv_norm_key(cuadrilla) like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
    or public.mv_norm_key(cuadrilla) like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
  )
  group by periodo,public.mv_norm_key(cuadrilla),upper(trim(codigo))
),
tot as (
  select periodo,cuadrilla_key,sum(cantidad)::numeric total_trabajos
  from prod group by periodo,cuadrilla_key
)
select
  p.periodo,p.cuadrilla_key,min(p.cuadrilla) as cuadrilla,
  max(t.total_trabajos)::numeric as total_trabajos_pdg,
  case when max(t.total_trabajos)>=61 then '61 A MAS' else '1 A 60' end as tramo_pdg,
  sum(
    p.cantidad *
    case when t.total_trabajos>=61 then coalesce(x.tarifa_61_mas,0) else coalesce(x.tarifa_1_60,0) end
  )::numeric as pago_pdg,
  count(*) filter(where x.tarifa_source_row is null)::integer as partidas_sin_tarifa
from prod p
join tot t using(periodo,cuadrilla_key)
left join public.mv_economico_tarifa_pdg_codigo x on x.codigo=p.codigo
group by p.periodo,p.cuadrilla_key;

create or replace view public.mv_economico_pago_pdg_migracion as
with candidatos as (
  select
    p.periodo,
    public.mv_norm_key(p.cuadrilla) as cuadrilla_key,
    min(p.cuadrilla) as cuadrilla,
    upper(trim(p.codigo)) as codigo,
    sum(p.cantidad)::numeric as cantidad
  from public.produccion_legacy_snapshot p
  left join lateral public.mv_bono_regla_cuadrilla(
    p.cuadrilla,(p.periodo||'-01')::date
  ) r on true
  where r.tratamiento='PDG'
  group by p.periodo,public.mv_norm_key(p.cuadrilla),upper(trim(p.codigo))
),
tot as (
  select periodo,cuadrilla_key,sum(cantidad)::numeric total_trabajos
  from candidatos group by periodo,cuadrilla_key
)
select
  p.periodo,p.cuadrilla_key,min(p.cuadrilla) as cuadrilla,
  max(t.total_trabajos)::numeric as total_trabajos_pdg,
  case when max(t.total_trabajos)>=61 then '61 A MAS' else '1 A 60' end as tramo_pdg,
  sum(
    p.cantidad *
    case when t.total_trabajos>=61 then coalesce(x.tarifa_61_mas,0) else coalesce(x.tarifa_1_60,0) end
  )::numeric as pago_pdg,
  count(*) filter(where x.tarifa_source_row is null)::integer as partidas_sin_tarifa
from candidatos p
join tot t using(periodo,cuadrilla_key)
left join public.mv_economico_tarifa_pdg_codigo x on x.codigo=p.codigo
group by p.periodo,p.cuadrilla_key;

create or replace view public.mv_economico_bono_legacy_utilidad as
with prod as (
  select
    p.periodo,p.fecha,public.mv_norm_key(p.cuadrilla) cuadrilla_key,min(p.cuadrilla) cuadrilla,
    sum(p.cantidad*coalesce(c.puntaje_consistente,0))::numeric puntos_produccion
  from public.produccion_legacy_snapshot p
  left join public.mv_catalogo_puntaje_codigo c on c.codigo=upper(trim(p.codigo))
  where not (
    public.mv_norm_key(p.cuadrilla) like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
    or public.mv_norm_key(p.cuadrilla) like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
  )
  group by p.periodo,p.fecha,public.mv_norm_key(p.cuadrilla)
),
pext as (
  select
    to_char(fecha_trabajo,'YYYY-MM') periodo,fecha_trabajo fecha,
    public.mv_norm_key(cuadrilla) cuadrilla_key,min(cuadrilla) cuadrilla,
    sum(case when estado_bono='VALIDADO' then coalesce(puntos_pext,0) else 0 end)::numeric puntos_pext
  from public.bono_pext_snapshot
  group by 1,2,3
),
keys as (
  select periodo,fecha,cuadrilla_key from prod
  union
  select periodo,fecha,cuadrilla_key from pext
),
dias as (
  select
    k.periodo,k.fecha,k.cuadrilla_key,
    coalesce(p.cuadrilla,x.cuadrilla) cuadrilla,
    coalesce(p.puntos_produccion,0)::numeric puntos_produccion,
    coalesce(x.puntos_pext,0)::numeric puntos_pext
  from keys k
  left join prod p using(periodo,fecha,cuadrilla_key)
  left join pext x using(periodo,fecha,cuadrilla_key)
),
calc as (
  select
    d.*,
    coalesce(r.valor_punto,30)::numeric tarifa,
    b.bono_cuadrilla
  from dias d
  left join lateral public.mv_bono_regla_cuadrilla(d.cuadrilla,d.fecha) r on true
  left join lateral public.mv_bono_calcular(
    d.puntos_produccion+d.puntos_pext,
    d.puntos_pext,
    coalesce(r.valor_punto,30)
  ) b on true
)
select
  periodo,cuadrilla_key,min(cuadrilla) cuadrilla,
  sum(coalesce(bono_cuadrilla,0))::numeric bonos_legacy_utilidad
from calc
group by periodo,cuadrilla_key;

create or replace view public.mv_economico_bono_migracion as
select
  periodo,
  public.mv_norm_key(cuadrilla) as cuadrilla_key,
  min(cuadrilla) as cuadrilla,
  sum(coalesce(bono_cuadrilla,0))::numeric as bonos_migracion
from public.mv_bono_produccion_diario_migracion_v1
group by periodo,public.mv_norm_key(cuadrilla);

create or replace view public.mv_economico_universo as
with p as (select periodo from public.produccion_periodos),
keys as (
  select periodo,cuadrilla_key from public.mv_economico_ingreso_legacy_cuadrilla
  union select periodo,cuadrilla_key from public.mv_economico_ingreso_migracion_cuadrilla
  union select periodo,cuadrilla_key from public.mv_economico_materiales_cuadrilla
  union select periodo,cuadrilla_key from public.mv_economico_gastos_cuadrilla
  union select periodo,cuadrilla_key from public.mv_economico_penalidades_win_cuadrilla
  union select periodo,cuadrilla_key from public.mv_economico_pago_pdg_legacy
  union select periodo,cuadrilla_key from public.mv_economico_pago_pdg_migracion
)
select distinct k.periodo,k.cuadrilla_key
from keys k
join p using(periodo);

create or replace view public.mv_economico_utilidad_legacy as
select
  u.periodo,u.cuadrilla_key,
  coalesce(il.cuadrilla,ca.cuadrilla,m.cuadrilla,g.cuadrilla,pen.cuadrilla,pdg.cuadrilla,b.cuadrilla) as cuadrilla,
  coalesce(ca.sede,m.sede,g.sede,'SIN SEDE') as sede,
  case
    when u.cuadrilla_key like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
      or u.cuadrilla_key like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
    then true else false end as es_pdg,
  coalesce(il.ingreso_legacy,0)::numeric as produccion,
  coalesce(m.materiales,0)::numeric as materiales,
  coalesce(g.sueldos,0)::numeric as sueldos,
  coalesce(g.combustible,0)::numeric as combustible,
  coalesce(g.alquiler_unidad,0)::numeric as alquiler_unidad,
  coalesce(b.bonos_legacy_utilidad,0)::numeric as bonos,
  coalesce(pdg.pago_pdg,0)::numeric as pago_pdg,
  coalesce(pen.penalidades_win,0)::numeric as penalidades_win,
  case
    when u.cuadrilla_key like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
      or u.cuadrilla_key like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
    then coalesce(m.materiales,0)+coalesce(pdg.pago_pdg,0)+coalesce(pen.penalidades_win,0)
    else coalesce(m.materiales,0)+coalesce(g.sueldos,0)+coalesce(g.combustible,0)+coalesce(g.alquiler_unidad,0)+coalesce(b.bonos_legacy_utilidad,0)+coalesce(pen.penalidades_win,0)
  end::numeric as costos,
  (
    coalesce(il.ingreso_legacy,0) -
    case
      when u.cuadrilla_key like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
        or u.cuadrilla_key like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
      then coalesce(m.materiales,0)+coalesce(pdg.pago_pdg,0)+coalesce(pen.penalidades_win,0)
      else coalesce(m.materiales,0)+coalesce(g.sueldos,0)+coalesce(g.combustible,0)+coalesce(g.alquiler_unidad,0)+coalesce(b.bonos_legacy_utilidad,0)+coalesce(pen.penalidades_win,0)
    end
  )::numeric as utilidad_legacy,
  case
    when u.cuadrilla_key like 'P8VISUALSGIALEXOSWALDOBASTIDASGONZALEZ%'
      or u.cuadrilla_key like 'P7VISUALSGIVICTORMANUELPACHERRESRUIZ%'
    then coalesce(pdg.partidas_sin_tarifa,0)=0
    else coalesce(g.tiene_sueldo_t1,false) and coalesce(g.tiene_sueldo_t2,false)
      and coalesce(g.tiene_combustible,false) and coalesce(g.tiene_alquiler,false)
  end as costos_completos_legacy
from public.mv_economico_universo u
left join public.mv_economico_ingreso_legacy_cuadrilla il using(periodo,cuadrilla_key)
left join public.mv_economico_cuadrillas_activas ca using(cuadrilla_key)
left join public.mv_economico_materiales_cuadrilla m using(periodo,cuadrilla_key)
left join public.mv_economico_gastos_cuadrilla g using(periodo,cuadrilla_key)
left join public.mv_economico_penalidades_win_cuadrilla pen using(periodo,cuadrilla_key)
left join public.mv_economico_pago_pdg_legacy pdg using(periodo,cuadrilla_key)
left join public.mv_economico_bono_legacy_utilidad b using(periodo,cuadrilla_key);

create or replace view public.mv_economico_utilidad_migracion as
with base as (
  select
    u.periodo,u.cuadrilla_key,
    coalesce(im.cuadrilla,ca.cuadrilla,m.cuadrilla,g.cuadrilla,pen.cuadrilla,pdg.cuadrilla,b.cuadrilla) as cuadrilla,
    coalesce(ca.sede,m.sede,g.sede,'SIN SEDE') as sede,
    coalesce(r.tratamiento,'NORMAL') as tratamiento,
    coalesce(im.ingreso_migracion,0)::numeric as produccion,
    coalesce(m.materiales,0)::numeric as materiales,
    coalesce(g.sueldos,0)::numeric as sueldos,
    coalesce(g.combustible,0)::numeric as combustible,
    coalesce(g.alquiler_unidad,0)::numeric as alquiler_unidad,
    coalesce(b.bonos_migracion,0)::numeric as bonos,
    coalesce(pdg.pago_pdg,0)::numeric as pago_pdg,
    coalesce(pen.penalidades_win,0)::numeric as penalidades_win,
    coalesce(pdg.partidas_sin_tarifa,0)::integer as partidas_pdg_sin_tarifa,
    coalesce(im.partidas_sin_tarifa,0)::integer as partidas_ingreso_sin_tarifa,
    coalesce(g.tiene_sueldo_t1,false) as tiene_sueldo_t1,
    coalesce(g.tiene_sueldo_t2,false) as tiene_sueldo_t2,
    coalesce(g.tiene_combustible,false) as tiene_combustible,
    coalesce(g.tiene_alquiler,false) as tiene_alquiler
  from public.mv_economico_universo u
  left join public.mv_economico_ingreso_migracion_cuadrilla im using(periodo,cuadrilla_key)
  left join public.mv_economico_cuadrillas_activas ca using(cuadrilla_key)
  left join public.mv_economico_materiales_cuadrilla m using(periodo,cuadrilla_key)
  left join public.mv_economico_gastos_cuadrilla g using(periodo,cuadrilla_key)
  left join public.mv_economico_penalidades_win_cuadrilla pen using(periodo,cuadrilla_key)
  left join public.mv_economico_pago_pdg_migracion pdg using(periodo,cuadrilla_key)
  left join public.mv_economico_bono_migracion b using(periodo,cuadrilla_key)
  left join lateral public.mv_bono_regla_cuadrilla(
    coalesce(im.cuadrilla,ca.cuadrilla,m.cuadrilla,g.cuadrilla,pen.cuadrilla,pdg.cuadrilla,b.cuadrilla),
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
