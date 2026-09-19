
-- 108_ajustes_partida_v502_v503.sql
-- Porta V502/V503: Partner propone, Jefatura valida; solo IR <-> IC.
-- Conserva ajustes legacy como snapshot y guarda decisiones nuevas en tabla PostgreSQL.

create table if not exists public.ajustes_partida_win_postgresql (
  id text primary key,
  orden_id text not null,
  periodo text not null,
  fecha_orden timestamp without time zone,
  cuadrilla text,
  sede text,
  partida_win text,
  puntos_win numeric(12,3),
  partida_partner text,
  puntos_partner numeric(12,3),
  partida_propuesta text,
  puntos_propuesta numeric(12,3),
  origen_propuesta text,
  motivo text,
  estado text not null,
  solicitado_por text,
  fecha_solicitud timestamp without time zone not null default timezone('America/Lima',now()),
  validado_por text,
  fecha_validacion timestamp without time zone,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ajustes_pg_estado_chk check (upper(trim(estado)) in ('PENDIENTE','VALIDADO','RECHAZADO')),
  constraint ajustes_pg_periodo_chk check (periodo ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$')
);

create index if not exists ajustes_partida_pg_orden_idx
  on public.ajustes_partida_win_postgresql(orden_id,fecha_validacion desc nulls last,fecha_solicitud desc);
create index if not exists ajustes_partida_pg_periodo_idx
  on public.ajustes_partida_win_postgresql(periodo,estado);

alter table public.ajustes_partida_win_postgresql enable row level security;
revoke all on public.ajustes_partida_win_postgresql from anon,authenticated;
grant select,insert,update on public.ajustes_partida_win_postgresql to service_role;

create or replace function public.mv_par_ajuste_partida_autorizado_v502(a text,b text)
returns boolean
language sql
immutable
as $$
  select
    (upper(trim(coalesce(a,'')))='IR' and upper(trim(coalesce(b,'')))='IC')
    or
    (upper(trim(coalesce(a,'')))='IC' and upper(trim(coalesce(b,'')))='IR');
$$;

revoke execute on function public.mv_par_ajuste_partida_autorizado_v502(text,text)
  from public,anon,authenticated;
grant execute on function public.mv_par_ajuste_partida_autorizado_v502(text,text)
  to service_role;

create or replace view public.mv_ajustes_partida_todos_v502
with (security_invoker=true) as
select
  l.id::text id,
  l.source_row::integer source_row,
  l.orden_id::text orden_id,
  l.periodo::text periodo,
  l.fecha_orden::timestamp without time zone fecha_orden,
  l.cuadrilla::text cuadrilla,
  l.sede::text sede,
  l.partida_win::text partida_win,
  l.puntos_win::numeric(12,3) puntos_win,
  l.partida_partner::text partida_partner,
  l.puntos_partner::numeric(12,3) puntos_partner,
  l.partida_propuesta::text partida_propuesta,
  l.puntos_propuesta::numeric(12,3) puntos_propuesta,
  l.origen_propuesta::text origen_propuesta,
  l.motivo::text motivo,
  upper(trim(coalesce(l.estado,'')))::text estado,
  l.solicitado_por::text solicitado_por,
  l.fecha_solicitud::timestamp without time zone fecha_solicitud,
  l.validado_por::text validado_por,
  l.fecha_validacion::timestamp without time zone fecha_validacion,
  l.observacion::text observacion,
  l.imported_at::timestamptz imported_at,
  'LEGACY_SNAPSHOT'::text fuente
from public.ajustes_partida_win l
union all
select
  p.id::text,
  null::integer,
  p.orden_id::text,
  p.periodo::text,
  p.fecha_orden::timestamp without time zone,
  p.cuadrilla::text,
  p.sede::text,
  p.partida_win::text,
  p.puntos_win::numeric(12,3),
  p.partida_partner::text,
  p.puntos_partner::numeric(12,3),
  p.partida_propuesta::text,
  p.puntos_propuesta::numeric(12,3),
  p.origen_propuesta::text,
  p.motivo::text,
  upper(trim(coalesce(p.estado,'')))::text,
  p.solicitado_por::text,
  p.fecha_solicitud::timestamp without time zone,
  p.validado_por::text,
  p.fecha_validacion::timestamp without time zone,
  p.observacion::text,
  p.created_at::timestamptz,
  'POSTGRESQL_V502'::text
from public.ajustes_partida_win_postgresql p;

revoke all on public.mv_ajustes_partida_todos_v502 from anon,authenticated;
grant select on public.mv_ajustes_partida_todos_v502 to service_role;

create or replace view public.mv_ajuste_partida_vigente
with (security_invoker=true) as
select distinct on (orden_id)
  id,source_row,orden_id,periodo,fecha_orden,cuadrilla,sede,partida_win,puntos_win,
  partida_partner,puntos_partner,partida_propuesta,puntos_propuesta,origen_propuesta,
  motivo,estado,solicitado_por,fecha_solicitud,validado_por,fecha_validacion,observacion,imported_at
from public.mv_ajustes_partida_todos_v502
where estado in ('VALIDADO','APROBADO')
order by orden_id,fecha_validacion desc nulls last,imported_at desc nulls last,source_row desc nulls last,id desc;

revoke all on public.mv_ajuste_partida_vigente from anon,authenticated;
grant select on public.mv_ajuste_partida_vigente to service_role;

create or replace view public.mv_partner_partida_orden_v502
with (security_invoker=true) as
with src as (
  select
    b.periodo,
    trim(b.codigo_liquidacion) orden_id,
    b.source_row,
    coalesce(c1.codigo,c2.codigo) codigo_partner
  from public.base_operativa_legacy b
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida)
    order by c.source_row
    limit 1
  ) c1 on true
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where c1.codigo is null
      and public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida_alterna)
    order by c.source_row
    limit 1
  ) c2 on true
  where nullif(trim(coalesce(b.codigo_liquidacion,'')),'') is not null
    and coalesce(c1.codigo,c2.codigo) is not null
),
agg as (
  select
    periodo,orden_id,
    count(distinct upper(trim(codigo_partner)))::integer codigos_distintos,
    min(upper(trim(codigo_partner))) codigo_partner,
    max(source_row)::integer source_row
  from src
  group by periodo,orden_id
)
select * from agg;

revoke all on public.mv_partner_partida_orden_v502 from anon,authenticated;
grant select on public.mv_partner_partida_orden_v502 to service_role;

create or replace view public.mv_ajustes_partida_propuestas_v502
with (security_invoker=true) as
select
  m.periodo_solicitud periodo,
  m.orden_id,
  m.fecha_ejecucion fecha,
  public.mv_continuidad_cuadrilla(m.periodo_solicitud,m.cuadrilla) cuadrilla,
  m.sede,
  upper(trim(m.partida_motor)) partida_win,
  coalesce(cw.puntaje_consistente,0)::numeric(12,3) puntos_win,
  p.codigo_partner partida_partner,
  coalesce(cp.puntaje_consistente,0)::numeric(12,3) puntos_partner,
  p.codigo_partner partida_propuesta,
  coalesce(cp.puntaje_consistente,0)::numeric(12,3) puntos_propuesta,
  m.tipo_servicio_win,
  m.motivo_finalizacion,
  'Diferencia WIN vs Partner IR/IC detectada. Requiere validación humana.'::text motivo
from public.mv_produccion_partida_motor_migracion_v1 m
join public.mv_partner_partida_orden_v502 p
  on p.periodo=m.periodo_solicitud and trim(p.orden_id)=trim(m.orden_id)
left join public.mv_catalogo_puntaje_codigo cw
  on cw.codigo=upper(trim(m.partida_motor))
left join public.mv_catalogo_puntaje_codigo cp
  on cp.codigo=upper(trim(p.codigo_partner))
left join public.mv_ajuste_partida_vigente a
  on trim(a.orden_id)=trim(m.orden_id)
where m.elegible_produccion_efectiva
  and p.codigos_distintos=1
  and a.orden_id is null
  and public.mv_par_ajuste_partida_autorizado_v502(m.partida_motor,p.codigo_partner);

revoke all on public.mv_ajustes_partida_propuestas_v502 from anon,authenticated;
grant select on public.mv_ajustes_partida_propuestas_v502 to service_role;

create or replace function public.mv_ajuste_partida_validar_v502(
  p_orden_id text,
  p_partida_propuesta text,
  p_usuario text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  o record;
  m record;
  prop record;
  cat_actual record;
  cat_nueva record;
  nuevo_id text;
  pub jsonb;
begin
  if nullif(trim(coalesce(p_orden_id,'')),'') is null
     or nullif(trim(coalesce(p_partida_propuesta,'')),'') is null then
    raise exception 'V502: indique OrdenId y partida propuesta.';
  end if;

  perform pg_advisory_xact_lock(hashtext('V502_AJUSTE|'||trim(p_orden_id)));

  select * into o from public.ordenes
  where trim(orden_id)=trim(p_orden_id)
  limit 1;
  if not found then raise exception 'V502: OrdenId no encontrada en WIN/ordenes.'; end if;
  if public.mv_norm_key(o.estado) not in ('FINALIZADA','FINALIZADO') then
    raise exception 'V502: solo se corrige Producción de órdenes WIN FINALIZADAS.';
  end if;

  select * into m
  from public.mv_produccion_partida_motor_migracion_v1
  where trim(orden_id)=trim(p_orden_id)
  limit 1;
  if not found or not coalesce(m.elegible_produccion_efectiva,false) then
    raise exception 'V502: la orden no aparece como Producción elegible.';
  end if;

  if not public.mv_par_ajuste_partida_autorizado_v502(m.partida_motor,p_partida_propuesta) then
    raise exception 'V502: por seguridad esta versión solo permite corregir IR <-> IC.';
  end if;

  select * into cat_actual
  from public.mv_catalogo_puntaje_codigo
  where codigo=upper(trim(m.partida_motor))
  limit 1;

  select * into cat_nueva
  from public.mv_catalogo_puntaje_codigo
  where codigo=upper(trim(p_partida_propuesta))
  limit 1;
  if not found then raise exception 'V502: partida propuesta no existe en CATALOGO_ORDENES.'; end if;

  select * into prop
  from public.mv_ajustes_partida_propuestas_v502
  where trim(orden_id)=trim(p_orden_id)
  limit 1;

  nuevo_id:='AJ-PG-'||to_char(timezone('America/Lima',clock_timestamp()),'YYYYMMDD-HH24MISS-MS');

  insert into public.ajustes_partida_win_postgresql(
    id,orden_id,periodo,fecha_orden,cuadrilla,sede,partida_win,puntos_win,
    partida_partner,puntos_partner,partida_propuesta,puntos_propuesta,
    origen_propuesta,motivo,estado,solicitado_por,fecha_solicitud,
    validado_por,fecha_validacion,observacion
  ) values (
    nuevo_id,trim(p_orden_id),m.periodo_solicitud,
    coalesce(m.momento_ejecucion,m.fecha_ejecucion::timestamp),
    public.mv_continuidad_cuadrilla(m.periodo_solicitud,m.cuadrilla),m.sede,
    upper(trim(m.partida_motor)),coalesce(cat_actual.puntaje_consistente,0)::numeric(12,3),
    coalesce(prop.partida_partner,upper(trim(p_partida_propuesta))),
    coalesce(prop.puntos_partner,cat_nueva.puntaje_consistente,0)::numeric(12,3),
    upper(trim(p_partida_propuesta)),coalesce(cat_nueva.puntaje_consistente,0)::numeric(12,3),
    'MANUAL JEFATURA',
    coalesce(nullif(trim(p_motivo),''),'Corrección de clasificación IR/IC validada'),
    'VALIDADO',trim(p_usuario),timezone('America/Lima',now()),
    trim(p_usuario),timezone('America/Lima',now()),
    'WIN original se conserva; solo cambia partida operativa validada.'
  );

  pub:=public.mv_publicador_win_publicar_v497(
    m.periodo_solicitud,trim(p_usuario),'PUBLICAR_V487_CONFIRMADO'
  );

  return jsonb_build_object(
    'ok',true,'version','V502-POSTGRESQL-20260919',
    'ordenId',trim(p_orden_id),'partidaAnterior',upper(trim(m.partida_motor)),
    'partidaNueva',upper(trim(p_partida_propuesta)),
    'impactoInmediato',true,'ajusteId',nuevo_id,'publicacion',pub
  );
end;
$$;

revoke execute on function public.mv_ajuste_partida_validar_v502(text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.mv_ajuste_partida_validar_v502(text,text,text,text)
  to service_role;

create or replace function public.mv_ajuste_partida_rechazar_v502(
  p_orden_id text,
  p_partida_propuesta text,
  p_usuario text,
  p_motivo text default null,
  p_observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  o record;
  m record;
  prop record;
  nuevo_id text;
  periodo_resuelto text;
begin
  if nullif(trim(coalesce(p_orden_id,'')),'') is null then
    raise exception 'V502: indique OrdenId.';
  end if;

  select * into o from public.ordenes where trim(orden_id)=trim(p_orden_id) limit 1;
  if not found then raise exception 'V502: OrdenId no encontrada en WIN.'; end if;

  select * into m
  from public.mv_produccion_partida_motor_migracion_v1
  where trim(orden_id)=trim(p_orden_id)
  limit 1;

  select * into prop
  from public.mv_ajustes_partida_propuestas_v502
  where trim(orden_id)=trim(p_orden_id)
  limit 1;

  periodo_resuelto:=coalesce(m.periodo_solicitud,to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM'));
  nuevo_id:='AJ-PG-'||to_char(timezone('America/Lima',clock_timestamp()),'YYYYMMDD-HH24MISS-MS');

  insert into public.ajustes_partida_win_postgresql(
    id,orden_id,periodo,fecha_orden,cuadrilla,sede,partida_win,puntos_win,
    partida_partner,puntos_partner,partida_propuesta,puntos_propuesta,
    origen_propuesta,motivo,estado,solicitado_por,fecha_solicitud,
    validado_por,fecha_validacion,observacion
  ) values (
    nuevo_id,trim(p_orden_id),
    periodo_resuelto,
    coalesce(m.momento_ejecucion,o.fecha_solicitud::timestamp),
    coalesce(public.mv_continuidad_cuadrilla(periodo_resuelto,m.cuadrilla),o.cuadrilla),
    coalesce(m.sede,o.sede),
    coalesce(upper(trim(m.partida_motor)),prop.partida_win),
    coalesce(prop.puntos_win,0)::numeric(12,3),
    prop.partida_partner,coalesce(prop.puntos_partner,0)::numeric(12,3),
    upper(trim(coalesce(nullif(p_partida_propuesta,''),prop.partida_propuesta,''))),
    coalesce(prop.puntos_propuesta,0)::numeric(12,3),
    'PARTNER',
    coalesce(nullif(trim(p_motivo),''),'Propuesta revisada'),
    'RECHAZADO',trim(p_usuario),timezone('America/Lima',now()),
    trim(p_usuario),timezone('America/Lima',now()),
    coalesce(nullif(trim(p_observacion),''),'Jefatura rechazó la corrección propuesta.')
  );

  return jsonb_build_object(
    'ok',true,'version','V502-POSTGRESQL-20260919',
    'ordenId',trim(p_orden_id),'estado','RECHAZADO','ajusteId',nuevo_id
  );
end;
$$;

revoke execute on function public.mv_ajuste_partida_rechazar_v502(text,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.mv_ajuste_partida_rechazar_v502(text,text,text,text,text)
  to service_role;
