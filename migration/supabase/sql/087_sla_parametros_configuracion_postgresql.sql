
-- 087_sla_parametros_configuracion_postgresql.sql
-- Capa editable de SLA. El snapshot legacy queda inmutable y sirve de base histórica.

create table if not exists public.sla_parametros_configuracion (
  id bigserial primary key,
  tipo_orden text not null,
  tipo_orden_key text not null,
  clasificacion text not null default 'OTROS',
  sla_minutos integer not null,
  vigencia_desde date not null,
  vigencia_hasta date,
  estado text not null default 'ACTIVO',
  actualizado_por text,
  fecha_actualizacion timestamptz not null default now(),
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sla_parametros_config_min check (sla_minutos between 1 and 600),
  constraint sla_parametros_config_estado check (estado in ('ACTIVO','INACTIVO')),
  constraint sla_parametros_config_fechas check (vigencia_hasta is null or vigencia_hasta>=vigencia_desde)
);

create unique index if not exists uq_sla_parametros_config_tipo_inicio
  on public.sla_parametros_configuracion(tipo_orden_key,vigencia_desde);

alter table public.sla_parametros_configuracion enable row level security;
revoke all on public.sla_parametros_configuracion from anon,authenticated;
grant select,insert,update,delete on public.sla_parametros_configuracion to service_role;
grant usage,select on sequence public.sla_parametros_configuracion_id_seq to service_role;

create or replace view public.mv_sla_parametro_periodo_v323
with (security_invoker=true)
as
with periodos as (
  select distinct
    to_char(
      coalesce(o.fecha_fin_visita,o.fecha_inicio_visita,o.fecha_solicitud::timestamp without time zone),
      'YYYY-MM'
    ) as periodo
  from public.ordenes o
  where coalesce(o.fecha_fin_visita,o.fecha_inicio_visita,o.fecha_solicitud::timestamp without time zone) is not null
),
fuentes as (
  select
    s.source_row,
    s.id,
    s.tipo_orden,
    public.mv_norm_key(s.tipo_orden) as tipo_orden_key,
    upper(trim(coalesce(s.clasificacion,'OTROS'))) as clasificacion,
    s.sla_minutos,
    s.vigencia_desde,
    s.vigencia_hasta,
    upper(trim(coalesce(s.estado,'ACTIVO'))) as estado,
    1 as prioridad,
    s.fecha_actualizacion::timestamptz as orden_actualizacion
  from public.sla_parametros_legacy_snapshot s
  where public.mv_norm_key(s.tipo_orden)<>''

  union all

  select
    (100000000+c.id)::integer as source_row,
    'PG-'||c.id::text as id,
    c.tipo_orden,
    c.tipo_orden_key,
    upper(trim(coalesce(c.clasificacion,'OTROS'))) as clasificacion,
    c.sla_minutos,
    c.vigencia_desde,
    c.vigencia_hasta,
    c.estado,
    2 as prioridad,
    c.fecha_actualizacion as orden_actualizacion
  from public.sla_parametros_configuracion c
),
candidatos as (
  select
    p.periodo,
    f.*,
    row_number() over (
      partition by p.periodo,f.tipo_orden_key
      order by
        coalesce(f.vigencia_desde,date '1900-01-01') desc,
        f.prioridad desc,
        coalesce(f.orden_actualizacion,timestamptz '1900-01-01 00:00:00+00') desc,
        f.source_row desc
    ) as rn
  from periodos p
  join fuentes f
    on (
      f.vigencia_desde is null
      or make_date(split_part(p.periodo,'-',1)::int,split_part(p.periodo,'-',2)::int,15)>=f.vigencia_desde
    )
   and (
      f.vigencia_hasta is null
      or make_date(split_part(p.periodo,'-',1)::int,split_part(p.periodo,'-',2)::int,15)<=f.vigencia_hasta
   )
)
select
  periodo,source_row,id,tipo_orden,tipo_orden_key,clasificacion,
  sla_minutos,vigencia_desde,vigencia_hasta
from candidatos
where rn=1 and estado='ACTIVO';

revoke all on public.mv_sla_parametro_periodo_v323 from anon,authenticated;
grant select on public.mv_sla_parametro_periodo_v323 to service_role;

create or replace function public.mv_bono_sup_guardar_parametros_sla(
  p_usuario text,
  p_periodo text,
  p_parametros jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  p text:=public.mv_bono_sup_periodo(p_periodo);
  inicio date;
  item jsonb;
  tipo text;
  tipo_key text;
  minutos integer;
  estado_nuevo text;
  base record;
  actualizados integer:=0;
  ranking_result jsonb;
  operativo_result jsonb;
  a record;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if not public.mv_bono_sup_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura puede modificar los tiempos SLA WIN';
  end if;

  if p<'2026-07' then
    raise exception 'Los parámetros SLA se administran desde julio de 2026';
  end if;

  if p_parametros is null
     or jsonb_typeof(p_parametros)<>'array'
     or jsonb_array_length(p_parametros)=0 then
    raise exception 'No se recibieron parámetros para guardar';
  end if;

  inicio:=make_date(split_part(p,'-',1)::int,split_part(p,'-',2)::int,1);

  for item in select value from jsonb_array_elements(p_parametros)
  loop
    tipo:=trim(coalesce(item->>'tipoOrden',item->>'tipo_orden',''));
    tipo_key:=public.mv_norm_key(tipo);
    minutos:=nullif(coalesce(item->>'minutos',item->>'sla_minutos',''),'')::integer;
    estado_nuevo:=upper(trim(coalesce(item->>'estado','ACTIVO')));

    if tipo_key='' then raise exception 'Partida SLA no reconocida'; end if;
    if minutos is null or minutos<1 or minutos>600 then
      raise exception 'El SLA debe estar entre 1 y 600 minutos';
    end if;
    if estado_nuevo not in ('ACTIVO','INACTIVO') then
      raise exception 'Estado SLA no válido';
    end if;

    select
      s.tipo_orden,
      upper(trim(coalesce(s.clasificacion,'OTROS'))) clasificacion
    into base
    from public.sla_parametros_legacy_snapshot s
    where public.mv_norm_key(s.tipo_orden)=tipo_key
    order by s.source_row desc
    limit 1;

    if not found then raise exception 'Partida SLA no reconocida: %',tipo; end if;

    insert into public.sla_parametros_configuracion(
      tipo_orden,tipo_orden_key,clasificacion,sla_minutos,
      vigencia_desde,vigencia_hasta,estado,
      actualizado_por,fecha_actualizacion,source_kind,created_at,updated_at
    ) values (
      base.tipo_orden,tipo_key,base.clasificacion,minutos,
      inicio,null,estado_nuevo,
      u->>'usuario',now(),'POSTGRESQL',now(),now()
    )
    on conflict(tipo_orden_key,vigencia_desde) do update set
      tipo_orden=excluded.tipo_orden,
      clasificacion=excluded.clasificacion,
      sla_minutos=excluded.sla_minutos,
      vigencia_hasta=excluded.vigencia_hasta,
      estado=excluded.estado,
      actualizado_por=excluded.actualizado_por,
      fecha_actualizacion=excluded.fecha_actualizacion,
      source_kind='POSTGRESQL',
      updated_at=now();

    actualizados:=actualizados+1;
  end loop;

  insert into public.bono_supervisores_eventos(
    periodo,evento,usuario_actor,detalle,source_kind
  ) values (
    p,'GUARDAR_PARAMETROS_SLA',u->>'usuario',
    jsonb_build_object('actualizados',actualizados,'parametros',p_parametros),
    'POSTGRESQL'
  );

  ranking_result:=public.mv_dashboard_refrescar_ranking_cache(p);
  operativo_result:=public.mv_bono_sup_refrescar_operativo(p);

  for a in select * from public.mv_bono_sup_asignaciones_periodo(p)
  loop
    perform public.mv_bono_sup_refrescar_supervisor(p,a.usuario);
  end loop;

  return jsonb_build_object(
    'ok',true,
    'modulo','BONO_SUPERVISORES',
    'accion','GUARDAR_PARAMETROS_SLA',
    'periodo',p,
    'actualizados',actualizados,
    'ranking',ranking_result,
    'operativo',operativo_result,
    'parametrosConfiguracion',public.mv_bono_sup_parametros_sla(p)
  );
end;
$$;

revoke execute on function public.mv_bono_sup_guardar_parametros_sla(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.mv_bono_sup_guardar_parametros_sla(text,text,jsonb) to service_role;
