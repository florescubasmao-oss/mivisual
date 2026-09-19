-- MI VISUAL - Efectividad: motor V487 en PostgreSQL
-- Fuente principal WIN / ordenes; Partner solo excluye reservas pendientes.
-- No modifica EFECTIVIDAD productiva.

begin;

create or replace function public.mv_cuadrilla_identidad_v487(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(public.mv_norm_key(v),'^P[0-9]+','');
$$;

revoke execute on function public.mv_cuadrilla_identidad_v487(text)
  from public,anon,authenticated;
grant execute on function public.mv_cuadrilla_identidad_v487(text)
  to service_role;

create or replace function public.mv_efectividad_clase_v487(
  p_estado text,
  p_motivo_cancelacion text,
  p_motivo_anulacion text,
  p_detalle text,
  p_reserva_partner boolean
)
returns text
language sql
immutable
as $$
  select case
    when public.mv_norm_key(p_estado) in ('RESERVA','RESERVADO') then 'NO_EVALUABLE'
    when public.mv_norm_key(p_estado) in ('CANCELADA','CANCELADO')
      and coalesce(p_reserva_partner,false) then 'NO_EVALUABLE'
    when public.mv_norm_key(p_estado) in ('FINALIZADA','FINALIZADO') then 'FINALIZADA'
    when public.mv_norm_key(p_estado) like 'REGEST%' then 'REGESTION'
    when public.mv_norm_key(p_estado) in ('ANULADA','ANULADO') then 'CANCELADA'
    when public.mv_norm_key(p_estado) in ('REPROGRAMADA','REPROGRAMADO') then 'REPROGRAMADO'
    when public.mv_norm_key(p_estado) in ('CANCELADA','CANCELADO')
      and public.mv_norm_key(
        coalesce(p_motivo_cancelacion,'')||' '||
        coalesce(p_motivo_anulacion,'')||' '||
        coalesce(p_detalle,'')
      ) ~ '(REPROGRAM|POSTERGA)'
      then 'REPROGRAMADO'
    when public.mv_norm_key(p_estado) in ('CANCELADA','CANCELADO') then 'CANCELADA'
    else 'NO_EVALUABLE'
  end;
$$;

revoke execute on function public.mv_efectividad_clase_v487(text,text,text,text,boolean)
  from public,anon,authenticated;
grant execute on function public.mv_efectividad_clase_v487(text,text,text,text,boolean)
  to service_role;

create or replace view public.mv_cuadrillas_tecnicas_v487 as
select distinct trim(cuadrilla) as cuadrilla,
       public.mv_norm_key(cuadrilla) as cuadrilla_key,
       public.mv_cuadrilla_identidad_v487(cuadrilla) as identidad
from public.app_users
where upper(trim(coalesce(estado,'')))='ACTIVO'
  and upper(trim(coalesce(perfil,'')))='TECNICO'
  and nullif(trim(coalesce(cuadrilla,'')),'') is not null;

create or replace view public.mv_cuadrilla_identidad_unica_v487 as
select identidad,min(cuadrilla) as cuadrilla,count(*)::integer as candidatos
from public.mv_cuadrillas_tecnicas_v487
where nullif(identidad,'') is not null
group by identidad
having count(*)=1;

create or replace view public.mv_efectividad_reservas_partner_v487 as
select distinct
  to_char(fecha,'YYYY-MM') as periodo,
  trim(codigo_liquidacion) as orden_id
from public.base_operativa_legacy
where upper(trim(coalesce(estado,''))) in ('RESERVA','RESERVADO')
  and fecha is not null
  and nullif(trim(coalesce(codigo_liquidacion,'')),'') is not null;

create or replace view public.mv_efectividad_orden_v487 as
with base as (
  select
    o.*,
    to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM') as periodo,
    coalesce(ex.cuadrilla,iu.cuadrilla,o.cuadrilla) as cuadrilla_homologada,
    case
      when ex.cuadrilla is not null then 'SIN_CAMBIO'
      when iu.cuadrilla is not null then 'CAMBIO_NUMERO_NOMBRE'
      else 'HISTORICA_SIN_HOMOLOGAR'
    end as tipo_homologacion,
    (rp.orden_id is not null) as reserva_partner
  from public.ordenes o
  left join public.mv_cuadrillas_tecnicas_v487 ex
    on ex.cuadrilla_key=public.mv_norm_key(o.cuadrilla)
  left join public.mv_cuadrilla_identidad_unica_v487 iu
    on iu.identidad=public.mv_cuadrilla_identidad_v487(o.cuadrilla)
  left join public.mv_efectividad_reservas_partner_v487 rp
    on rp.periodo=to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM')
   and rp.orden_id=o.orden_id
)
select
  orden_id,
  periodo,
  fecha_solicitud,
  fecha_ultimo_estado,
  fecha_importacion,
  cuadrilla as cuadrilla_original,
  cuadrilla_homologada as cuadrilla,
  tipo_homologacion,
  estado,
  motivo_cancelacion,
  motivo_anulacion,
  detalle,
  reserva_partner,
  public.mv_efectividad_clase_v487(
    estado,motivo_cancelacion,motivo_anulacion,detalle,reserva_partner
  ) as clase_efectividad,
  (
    public.mv_efectividad_clase_v487(
      estado,motivo_cancelacion,motivo_anulacion,detalle,reserva_partner
    ) <> 'NO_EVALUABLE'
  ) as evaluable
from base;

create or replace view public.mv_efectividad_actual_v487 as
select
  periodo,
  cuadrilla,
  count(*) filter(where clase_efectividad='FINALIZADA')::integer as finalizada,
  count(*) filter(where clase_efectividad='CANCELADA')::integer as cancelada,
  count(*) filter(where clase_efectividad='REGESTION')::integer as regestion,
  count(*) filter(where clase_efectividad='REPROGRAMADO')::integer as reprogramado,
  count(*) filter(where evaluable)::integer as total_general,
  case
    when count(*) filter(where evaluable)>0
    then count(*) filter(where clase_efectividad='FINALIZADA')::numeric
         / count(*) filter(where evaluable)::numeric
    else 0
  end as efectividad,
  count(*) filter(where not evaluable)::integer as no_evaluables,
  max(coalesce(fecha_ultimo_estado,fecha_solicitud::timestamp)) as corte_estado,
  max(fecha_importacion) as ultima_importacion
from public.mv_efectividad_orden_v487
where nullif(trim(coalesce(cuadrilla,'')),'') is not null
group by periodo,cuadrilla;

create table if not exists public.efectividad_cortes_migracion (
  periodo text primary key,
  corte timestamp without time zone,
  fuente text not null default 'EFECTIVIDAD',
  estado text not null,
  observacion text,
  created_at timestamptz not null default now()
);

insert into public.efectividad_cortes_migracion(periodo,corte,estado,observacion)
values
('2026-07','2026-07-31 23:59:59','PROTEGIDO','Periodo cerrado. Snapshot EFECTIVIDAD es autoridad histórica.'),
('2026-08','2026-08-31 23:59:59','PROTEGIDO','Periodo protegido. Snapshot EFECTIVIDAD es autoridad histórica.'),
('2026-09','2026-09-17 20:34:00','VALIDACION_MIGRACION','Mismo corte operacional usado en Producción; snapshot publicado es evidencia del estado de ese momento.')
on conflict(periodo) do update set
  corte=excluded.corte,
  estado=excluded.estado,
  observacion=excluded.observacion;

alter table public.efectividad_cortes_migracion enable row level security;
revoke all on table public.efectividad_cortes_migracion from anon,authenticated;

create or replace view public.mv_efectividad_snapshot_resumen as
select
  periodo,
  max(actualizacion) as actualizacion,
  count(*)::integer as cuadrillas,
  sum(finalizada)::integer as finalizadas,
  sum(cancelada)::integer as canceladas,
  sum(regestion)::integer as regestiones,
  sum(reprogramado)::integer as reprogramadas,
  sum(total_general)::integer as total_general,
  case when sum(total_general)>0
    then sum(finalizada)::numeric/sum(total_general)::numeric
    else 0 end as efectividad
from public.efectividad_legacy_snapshot
group by periodo;

commit;
