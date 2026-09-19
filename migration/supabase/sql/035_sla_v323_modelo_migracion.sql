-- MI VISUAL - SLA V323/V367 backend migration model
-- Source remains productive Google Sheets in read-only mode.
-- No cutover. No changes to main.

begin;

create table if not exists public.sla_parametros_legacy_snapshot (
  source_row integer primary key,
  id text,
  tipo_orden text not null,
  clasificacion text,
  sla_minutos integer not null,
  vigencia_desde date,
  vigencia_hasta date,
  estado text,
  actualizado_por text,
  fecha_actualizacion timestamp without time zone,
  imported_at timestamptz not null default now(),
  constraint sla_param_min_chk check (sla_minutos > 0)
);

create table if not exists public.sla_excepciones_legacy_snapshot (
  source_row integer primary key,
  id text,
  periodo text not null,
  codigo text not null,
  codigo_pedido text,
  sede text,
  cuadrilla text,
  supervisor text,
  tipo_general text,
  minutos_gestion integer,
  sla_minutos integer,
  motivo text,
  comentario text,
  evidencia text,
  estado text,
  solicitado_por text,
  fecha_solicitud timestamp without time zone,
  evaluado_por text,
  fecha_evaluacion timestamp without time zone,
  comentario_jefatura text,
  imported_at timestamptz not null default now(),
  constraint sla_ex_periodo_chk check (periodo ~ '^20[0-9]{2}-[0-9]{2}$')
);

create table if not exists public.sla_ordenes_legacy_snapshot (
  source_row integer primary key,
  id text,
  periodo text not null,
  version_fuente text,
  codigo text not null,
  codigo_pedido text,
  sede text,
  cuadrilla text,
  supervisor text,
  tipo_general text,
  tipo_trabajo text,
  motivo_finalizacion text,
  partida text,
  inicio timestamp without time zone,
  fin timestamp without time zone,
  minutos_gestion integer,
  sla_minutos integer,
  evaluable boolean not null default false,
  cumple_bruto boolean not null default false,
  excepcion_estado text,
  cumple_ajustado boolean not null default false,
  exceso_minutos integer,
  resultado text,
  fecha_importacion timestamp without time zone,
  actualizado_al timestamp without time zone,
  imported_at timestamptz not null default now(),
  constraint sla_ord_periodo_chk check (periodo ~ '^20[0-9]{2}-[0-9]{2}$')
);

create index if not exists sla_param_tipo_idx
  on public.sla_parametros_legacy_snapshot ((public.mv_norm_key(tipo_orden)));
create index if not exists sla_ex_periodo_codigo_idx
  on public.sla_excepciones_legacy_snapshot (periodo,(public.mv_norm_key(codigo)));
create index if not exists sla_ord_periodo_codigo_idx
  on public.sla_ordenes_legacy_snapshot (periodo,(public.mv_norm_key(codigo)));
create index if not exists sla_ord_periodo_cuadrilla_idx
  on public.sla_ordenes_legacy_snapshot (periodo,cuadrilla);

alter table public.sla_parametros_legacy_snapshot enable row level security;
alter table public.sla_excepciones_legacy_snapshot enable row level security;
alter table public.sla_ordenes_legacy_snapshot enable row level security;

revoke all on table public.sla_parametros_legacy_snapshot from anon,authenticated;
revoke all on table public.sla_excepciones_legacy_snapshot from anon,authenticated;
revoke all on table public.sla_ordenes_legacy_snapshot from anon,authenticated;
grant all on table public.sla_parametros_legacy_snapshot to service_role;
grant all on table public.sla_excepciones_legacy_snapshot to service_role;
grant all on table public.sla_ordenes_legacy_snapshot to service_role;

create or replace view public.mv_sla_partida_codigo_v323
with (security_invoker=true) as
with src as (
  select periodo,source_row,'LIQ'::text as origen,
         public.mv_norm_key(codigo_liquidacion) as codigo_key,
         coalesce(nullif(trim(tipo_partida),''),nullif(trim(tipo_partida_alterna),'')) as partida
  from public.base_operativa_legacy
  where public.mv_norm_key(codigo_liquidacion)<>''

  union all

  select periodo,source_row,'PEDIDO'::text as origen,
         public.mv_norm_key(codigo_pedido) as codigo_key,
         coalesce(nullif(trim(tipo_partida),''),nullif(trim(tipo_partida_alterna),'')) as partida
  from public.base_operativa_legacy
  where public.mv_norm_key(codigo_pedido)<>''
),
validos as (
  select * from src where partida is not null
),
ranked as (
  select v.*,
         row_number() over(
           partition by periodo,codigo_key
           order by
             case when origen='LIQ' then 0 else 1 end,
             case when origen='LIQ' then source_row end desc,
             case when origen='PEDIDO' then source_row end asc
         ) as rn
  from validos v
)
select periodo,codigo_key,partida,origen,source_row
from ranked
where rn=1;

create or replace view public.mv_sla_parametro_periodo_v323
with (security_invoker=true) as
with periodos as (
  select distinct to_char(
    coalesce(o.fecha_fin_visita,o.fecha_inicio_visita,o.fecha_solicitud::timestamp),
    'YYYY-MM'
  ) as periodo
  from public.ordenes o
  where coalesce(o.fecha_fin_visita,o.fecha_inicio_visita,o.fecha_solicitud::timestamp) is not null
),
candidatos as (
  select p.periodo,s.source_row,s.id,s.tipo_orden,
         public.mv_norm_key(s.tipo_orden) as tipo_orden_key,
         upper(trim(coalesce(s.clasificacion,'OTROS'))) as clasificacion,
         s.sla_minutos,s.vigencia_desde,s.vigencia_hasta,
         upper(trim(coalesce(s.estado,'ACTIVO'))) as estado,
         row_number() over(
           partition by p.periodo,public.mv_norm_key(s.tipo_orden)
           order by s.source_row desc
         ) rn
  from periodos p
  join public.sla_parametros_legacy_snapshot s
    on upper(trim(coalesce(s.estado,'ACTIVO')))='ACTIVO'
   and (s.vigencia_desde is null or
        make_date(split_part(p.periodo,'-',1)::int,split_part(p.periodo,'-',2)::int,15) >= s.vigencia_desde)
   and (s.vigencia_hasta is null or
        make_date(split_part(p.periodo,'-',1)::int,split_part(p.periodo,'-',2)::int,15) <= s.vigencia_hasta)
  where public.mv_norm_key(s.tipo_orden)<>''
)
select periodo,source_row,id,tipo_orden,tipo_orden_key,clasificacion,sla_minutos,
       vigencia_desde,vigencia_hasta
from candidatos where rn=1;

create or replace view public.mv_sla_excepcion_ultima_v323
with (security_invoker=true) as
select periodo,codigo_key,id,codigo,codigo_pedido,sede,cuadrilla,supervisor,
       tipo_general,minutos_gestion,sla_minutos,motivo,comentario,evidencia,
       estado,solicitado_por,fecha_solicitud,evaluado_por,fecha_evaluacion,
       comentario_jefatura,source_row
from (
  select s.*,public.mv_norm_key(s.codigo) codigo_key,
         row_number() over(
           partition by periodo,public.mv_norm_key(codigo)
           order by source_row desc
         ) rn
  from public.sla_excepciones_legacy_snapshot s
) x
where rn=1 and codigo_key<>'';

create or replace view public.mv_sla_orden_actual_v323
with (security_invoker=true) as
with base as (
  select
    o.orden_id,
    public.mv_norm_key(o.orden_id) as codigo_key,
    o.codigo_cliente as codigo_pedido,
    o.sede,
    o.cuadrilla,
    o.tipo_trabajo,
    o.motivo_finalizacion,
    o.estado,
    o.fecha_inicio_visita as inicio,
    o.fecha_fin_visita as fin,
    coalesce(
      o.fecha_fin_visita,
      o.fecha_inicio_visita,
      o.fecha_solicitud::timestamp + coalesce(o.hora_solicitud,time '00:00')
    ) as fecha_periodo,
    o.fecha_importacion
  from public.ordenes o
  where upper(trim(coalesce(o.estado,'')))='FINALIZADA'
),
ctx as (
  select
    b.*,
    to_char(b.fecha_periodo,'YYYY-MM') as periodo,
    p.partida,
    sp.sla_minutos,
    coalesce(ex.estado,'SIN SOLICITUD') as excepcion_estado
  from base b
  left join public.mv_sla_partida_codigo_v323 p
    on p.periodo=to_char(b.fecha_periodo,'YYYY-MM')
   and p.codigo_key=b.codigo_key
  left join public.mv_sla_parametro_periodo_v323 sp
    on sp.periodo=to_char(b.fecha_periodo,'YYYY-MM')
   and sp.tipo_orden_key=public.mv_norm_key(p.partida)
  left join public.mv_sla_excepcion_ultima_v323 ex
    on ex.periodo=to_char(b.fecha_periodo,'YYYY-MM')
   and ex.codigo_key=b.codigo_key
  where b.fecha_periodo is not null
),
calc as (
  select
    c.*,
    case
      when public.mv_norm_key(c.tipo_trabajo) in ('INSTALACION','INSTALACIONPOSIBLEFRAUDE')
       and public.mv_norm_key(c.motivo_finalizacion) in ('','INSTALADO')
      then 'INSTALACIÓN'
      else 'VISITA TÉCNICA'
    end as tipo_general,
    case
      when c.inicio is null or c.fin is null or c.fin<c.inicio then false
      when c.partida is null or trim(c.partida)='' then false
      when c.sla_minutos is null or c.sla_minutos<=0 then false
      else true
    end as evaluable,
    case
      when c.inicio is not null and c.fin is not null and c.fin>=c.inicio
      then round(extract(epoch from (c.fin-c.inicio))/60.0)::integer
      else 0
    end as minutos_gestion
  from ctx c
)
select
  periodo||'|'||orden_id as id,
  periodo,orden_id as codigo,codigo_pedido,sede,cuadrilla,
  tipo_general,upper(trim(coalesce(tipo_trabajo,''))) as tipo_trabajo,
  upper(trim(coalesce(motivo_finalizacion,''))) as motivo_finalizacion,
  partida,inicio,fin,minutos_gestion,coalesce(sla_minutos,0)::integer as sla_minutos,
  evaluable,
  (evaluable and minutos_gestion<=sla_minutos) as cumple_bruto,
  upper(trim(coalesce(excepcion_estado,'SIN SOLICITUD'))) as excepcion_estado,
  (evaluable and (
     minutos_gestion<=sla_minutos
     or upper(trim(coalesce(excepcion_estado,'')))='APROBADA'
   )) as cumple_ajustado,
  case when evaluable then greatest(0,minutos_gestion-sla_minutos) else 0 end as exceso_minutos,
  case
    when inicio is null or fin is null or fin<inicio then 'SIN TIEMPOS'
    when partida is null or trim(partida)='' then 'SIN PARTIDA'
    when sla_minutos is null or sla_minutos<=0 then 'SIN PARÁMETRO'
    when minutos_gestion<=sla_minutos then 'DENTRO SLA'
    when upper(trim(coalesce(excepcion_estado,'')))='APROBADA' then 'EXCEPCIÓN APROBADA'
    when upper(trim(coalesce(excepcion_estado,'')))='PENDIENTE' then 'FUERA SLA - EXCEPCIÓN PENDIENTE'
    else 'FUERA SLA'
  end as resultado,
  fecha_importacion
from calc;

create or replace view public.mv_sla_resumen_actual_v323
with (security_invoker=true) as
select
  periodo,cuadrilla,
  count(*)::integer as total_finalizadas,
  count(*) filter(where evaluable)::integer as evaluables,
  count(*) filter(where evaluable and cumple_bruto)::integer as cumplen_bruto,
  count(*) filter(where evaluable and cumple_ajustado)::integer as cumplen_ajustado,
  count(*) filter(where not evaluable)::integer as no_evaluables,
  count(*) filter(where resultado='SIN TIEMPOS')::integer as sin_tiempos,
  count(*) filter(where resultado='SIN PARTIDA')::integer as sin_partida,
  count(*) filter(where resultado='SIN PARÁMETRO')::integer as sin_parametro,
  count(*) filter(where evaluable and tipo_general='INSTALACIÓN')::integer as instalaciones_total,
  count(*) filter(where evaluable and tipo_general='INSTALACIÓN' and cumple_ajustado)::integer as instalaciones_cumplen_ajustado,
  count(*) filter(where evaluable and tipo_general='VISITA TÉCNICA')::integer as visitas_tecnicas_total,
  count(*) filter(where evaluable and tipo_general='VISITA TÉCNICA' and cumple_ajustado)::integer as visitas_tecnicas_cumplen_ajustado,
  count(*) filter(where excepcion_estado='APROBADA')::integer as excepciones_aprobadas,
  count(*) filter(where excepcion_estado='PENDIENTE')::integer as excepciones_pendientes,
  count(*) filter(where excepcion_estado='RECHAZADA')::integer as excepciones_rechazadas,
  case when count(*) filter(where evaluable)>0
       then round(100.0*count(*) filter(where evaluable and cumple_bruto)/count(*) filter(where evaluable),2)
       else 0 end as sla_bruto,
  case when count(*) filter(where evaluable)>0
       then round(100.0*count(*) filter(where evaluable and cumple_ajustado)/count(*) filter(where evaluable),2)
       else 0 end as sla_ajustado
from public.mv_sla_orden_actual_v323
group by periodo,cuadrilla;

create or replace view public.mv_sla_resumen_legacy_snapshot
with (security_invoker=true) as
select
  periodo,cuadrilla,
  count(*)::integer as total_finalizadas,
  count(*) filter(where evaluable)::integer as evaluables,
  count(*) filter(where evaluable and cumple_bruto)::integer as cumplen_bruto,
  count(*) filter(where evaluable and cumple_ajustado)::integer as cumplen_ajustado,
  count(*) filter(where not evaluable)::integer as no_evaluables,
  count(*) filter(where resultado='SIN TIEMPOS')::integer as sin_tiempos,
  count(*) filter(where resultado='SIN PARTIDA')::integer as sin_partida,
  count(*) filter(where resultado='SIN PARÁMETRO')::integer as sin_parametro,
  count(*) filter(where evaluable and public.mv_norm_key(tipo_general)='INSTALACION')::integer as instalaciones_total,
  count(*) filter(where evaluable and public.mv_norm_key(tipo_general)='INSTALACION' and cumple_ajustado)::integer as instalaciones_cumplen_ajustado,
  count(*) filter(where evaluable and public.mv_norm_key(tipo_general)<>'INSTALACION')::integer as visitas_tecnicas_total,
  count(*) filter(where evaluable and public.mv_norm_key(tipo_general)<>'INSTALACION' and cumple_ajustado)::integer as visitas_tecnicas_cumplen_ajustado,
  count(*) filter(where upper(trim(coalesce(excepcion_estado,'')))='APROBADA')::integer as excepciones_aprobadas,
  count(*) filter(where upper(trim(coalesce(excepcion_estado,'')))='PENDIENTE')::integer as excepciones_pendientes,
  count(*) filter(where upper(trim(coalesce(excepcion_estado,'')))='RECHAZADA')::integer as excepciones_rechazadas,
  case when count(*) filter(where evaluable)>0
       then round(100.0*count(*) filter(where evaluable and cumple_bruto)/count(*) filter(where evaluable),2)
       else 0 end as sla_bruto,
  case when count(*) filter(where evaluable)>0
       then round(100.0*count(*) filter(where evaluable and cumple_ajustado)/count(*) filter(where evaluable),2)
       else 0 end as sla_ajustado
from public.sla_ordenes_legacy_snapshot
group by periodo,cuadrilla;

create or replace view public.mv_sla_conciliacion_cuadrilla_v323
with (security_invoker=true) as
select
  coalesce(l.periodo,m.periodo) as periodo,
  coalesce(l.cuadrilla,m.cuadrilla) as cuadrilla,
  l.total_finalizadas as legacy_total,
  m.total_finalizadas as motor_total,
  coalesce(m.total_finalizadas,0)-coalesce(l.total_finalizadas,0) as dif_total,
  l.evaluables as legacy_evaluables,
  m.evaluables as motor_evaluables,
  coalesce(m.evaluables,0)-coalesce(l.evaluables,0) as dif_evaluables,
  l.cumplen_ajustado as legacy_cumplen,
  m.cumplen_ajustado as motor_cumplen,
  coalesce(m.cumplen_ajustado,0)-coalesce(l.cumplen_ajustado,0) as dif_cumplen,
  l.sla_ajustado as legacy_sla,
  m.sla_ajustado as motor_sla,
  round(coalesce(m.sla_ajustado,0)-coalesce(l.sla_ajustado,0),2) as dif_pp,
  case
    when l.periodo is null then 'SOLO_MOTOR'
    when m.periodo is null then 'SOLO_LEGACY'
    when l.total_finalizadas=m.total_finalizadas
     and l.evaluables=m.evaluables
     and l.cumplen_ajustado=m.cumplen_ajustado
    then 'OK'
    else 'REVISAR'
  end as conciliacion
from public.mv_sla_resumen_legacy_snapshot l
full join public.mv_sla_resumen_actual_v323 m
  on m.periodo=l.periodo and m.cuadrilla=l.cuadrilla;

revoke all on public.mv_sla_partida_codigo_v323 from anon,authenticated;
revoke all on public.mv_sla_parametro_periodo_v323 from anon,authenticated;
revoke all on public.mv_sla_excepcion_ultima_v323 from anon,authenticated;
revoke all on public.mv_sla_orden_actual_v323 from anon,authenticated;
revoke all on public.mv_sla_resumen_actual_v323 from anon,authenticated;
revoke all on public.mv_sla_resumen_legacy_snapshot from anon,authenticated;
revoke all on public.mv_sla_conciliacion_cuadrilla_v323 from anon,authenticated;

grant select on public.mv_sla_partida_codigo_v323 to service_role;
grant select on public.mv_sla_parametro_periodo_v323 to service_role;
grant select on public.mv_sla_excepcion_ultima_v323 to service_role;
grant select on public.mv_sla_orden_actual_v323 to service_role;
grant select on public.mv_sla_resumen_actual_v323 to service_role;
grant select on public.mv_sla_resumen_legacy_snapshot to service_role;
grant select on public.mv_sla_conciliacion_cuadrilla_v323 to service_role;

commit;