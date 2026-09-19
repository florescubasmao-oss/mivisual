
-- 049_dashboard_descansos_bridge.sql
-- Bridge de solo lectura para que Dashboard reproduzca meta diaria sin migrar todavía el módulo completo de Descansos.

create table if not exists public.dashboard_descansos_legacy_snapshot (
  source_row integer primary key,
  id text,
  periodo text,
  fecha date,
  sede text,
  cuadrilla text,
  plataforma text,
  supervisor text,
  estado_dia text,
  estado_programacion text,
  resultado_jefatura text,
  version integer not null default 0,
  estado_validacion text,
  estado_nuevo text,
  id_origen text,
  imported_at timestamptz not null default now()
);

create index if not exists dashboard_descansos_periodo_fecha_idx
  on public.dashboard_descansos_legacy_snapshot(periodo,fecha);
create index if not exists dashboard_descansos_cuadrilla_idx
  on public.dashboard_descansos_legacy_snapshot(cuadrilla);

create or replace function public.mv_dashboard_estado_dia_norm(v text)
returns text
language sql
immutable
as $$
  select case
    when upper(trim(coalesce(v,''))) in ('C','CAMPO','EN CAMPO') then 'EN CAMPO'
    when upper(trim(coalesce(v,''))) in ('CB','C B','Cᴮ','CAMPO BOLSA','EN CAMPO BOLSA','BOLSA') then 'EN CAMPO BOLSA'
    when upper(trim(coalesce(v,''))) in ('D','DESCANSO') then 'DESCANSO'
    when upper(trim(coalesce(v,''))) in ('V','VACACIONES') then 'VACACIONES'
    when nullif(trim(coalesce(v,'')),'') is null then 'EN CAMPO'
    else upper(trim(v))
  end;
$$;

revoke execute on function public.mv_dashboard_estado_dia_norm(text) from public,anon,authenticated;
grant execute on function public.mv_dashboard_estado_dia_norm(text) to service_role;

create or replace view public.mv_dashboard_descansos_aprobados
with (security_invoker=true) as
with base as (
  select
    s.*,
    public.mv_observaciones_cuadrilla_norm(s.cuadrilla) as cuadrilla_norm,
    replace(upper(trim(coalesce(s.estado_validacion,s.estado_programacion,''))),'_',' ') as estado_validacion_norm,
    row_number() over (
      partition by public.mv_observaciones_cuadrilla_norm(s.cuadrilla),s.fecha
      order by s.version desc,s.source_row desc
    ) as rn
  from public.dashboard_descansos_legacy_snapshot s
  where s.fecha is not null
    and nullif(trim(coalesce(s.cuadrilla,'')),'') is not null
    and upper(trim(s.cuadrilla)) not like 'PERSONAL|%'
    and (
      replace(upper(trim(coalesce(s.estado_validacion,s.estado_programacion,''))),'_',' ') in ('APROBADO','APLICADO')
      or upper(trim(coalesce(s.resultado_jefatura,'')))='APROBADO'
    )
)
select
  source_row,id,periodo,fecha,sede,cuadrilla_norm as cuadrilla,plataforma,supervisor,version,
  public.mv_dashboard_estado_dia_norm(coalesce(nullif(estado_nuevo,''),estado_dia,'EN CAMPO')) as estado_dia
from base
where rn=1;

create or replace view public.mv_dashboard_fecha_corte
with (security_invoker=true) as
with periodos as (
  select distinct periodo from public.mv_ranking_migracion
), prod as (
  select
    to_char(fecha_ejecucion,'YYYY-MM') as periodo,
    max(fecha_ejecucion) filter(where elegible_produccion_efectiva) as fecha_max
  from public.mv_produccion_partida_motor_migracion_v1
  where fecha_ejecucion is not null
  group by 1
)
select
  p.periodo,
  case
    when p.periodo=to_char(now() at time zone 'America/Lima','YYYY-MM')
      then least(
        coalesce(prod.fecha_max,(now() at time zone 'America/Lima')::date),
        (now() at time zone 'America/Lima')::date
      )
    else coalesce(
      prod.fecha_max,
      (date_trunc('month',(p.periodo||'-01')::date)+interval '1 month - 1 day')::date
    )
  end as fecha_corte
from periodos p
left join prod using(periodo);

create or replace view public.mv_dashboard_cumplimiento_diario
with (security_invoker=true) as
with universo as (
  select distinct periodo,public.mv_observaciones_cuadrilla_norm(cuadrilla) as cuadrilla
  from public.mv_ranking_migracion
  where nullif(public.mv_observaciones_cuadrilla_norm(cuadrilla),'') is not null
), dias as (
  select
    u.periodo,u.cuadrilla,c.fecha_corte,
    gs::date as fecha
  from universo u
  join public.mv_dashboard_fecha_corte c using(periodo)
  cross join lateral generate_series(
    (u.periodo||'-01')::date,
    c.fecha_corte,
    interval '1 day'
  ) gs
), marcado as (
  select
    d.*,
    a.estado_dia,
    (a.source_row is not null) as tiene_programacion
  from dias d
  left join public.mv_dashboard_descansos_aprobados a
    on a.cuadrilla=d.cuadrilla and a.fecha=d.fecha
)
select
  periodo,
  cuadrilla,
  max(fecha_corte) as fecha_corte,
  5::numeric as meta_diaria,
  count(*) filter(where coalesce(estado_dia,'EN CAMPO') not in ('DESCANSO','VACACIONES','EN CAMPO BOLSA'))::integer as dias_campo,
  count(*) filter(where estado_dia='DESCANSO')::integer as dias_descanso,
  count(*) filter(where estado_dia='VACACIONES')::integer as dias_vacaciones,
  count(*) filter(where estado_dia='EN CAMPO BOLSA')::integer as dias_bolsa,
  count(*) filter(where not tiene_programacion)::integer as dias_sin_programacion,
  (
    count(*) filter(where coalesce(estado_dia,'EN CAMPO') not in ('DESCANSO','VACACIONES','EN CAMPO BOLSA'))*5
  )::numeric as meta_acumulada
from marcado
group by periodo,cuadrilla;

alter table public.dashboard_descansos_legacy_snapshot enable row level security;
revoke all on public.dashboard_descansos_legacy_snapshot from anon,authenticated;
revoke all on public.mv_dashboard_descansos_aprobados from anon,authenticated;
revoke all on public.mv_dashboard_fecha_corte from anon,authenticated;
revoke all on public.mv_dashboard_cumplimiento_diario from anon,authenticated;

grant select on public.dashboard_descansos_legacy_snapshot to service_role;
grant select on public.mv_dashboard_descansos_aprobados to service_role;
grant select on public.mv_dashboard_fecha_corte to service_role;
grant select on public.mv_dashboard_cumplimiento_diario to service_role;
