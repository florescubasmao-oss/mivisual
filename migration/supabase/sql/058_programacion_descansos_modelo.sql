
-- 058_programacion_descansos_modelo.sql
-- Modelo completo de Programación de Descansos. Preserva histórico y semántica del Apps Script.

create table if not exists public.programacion_descansos_legacy_snapshot (
  source_row integer primary key,
  id text not null,
  row_json jsonb not null,
  imported_at timestamptz not null default now()
);

create unique index if not exists programacion_descansos_legacy_id_uq
  on public.programacion_descansos_legacy_snapshot(id);

create table if not exists public.programacion_descansos_migracion (
  seq bigint generated always as identity unique,
  id text primary key,
  source_row integer unique,
  periodo text not null,
  fecha date not null,
  dia_semana text,
  sede text not null,
  cuadrilla text not null,
  plataforma text not null,
  supervisor text,
  tecnicos_afectados text,
  estado_dia text not null default 'EN CAMPO',
  estado_programacion text not null default 'APROBADO',
  solicitud_cambio text,
  motivo_solicitud text,
  solicitado_por text,
  fecha_solicitud timestamptz,
  resultado_supervisor text,
  motivo_supervisor text,
  validado_supervisor_por text,
  fecha_validacion_supervisor timestamptz,
  resultado_jefatura text,
  motivo_jefatura text,
  validado_jefatura_por text,
  fecha_validacion_jefatura timestamptz,
  cobertura_sede numeric(10,6) not null default 0,
  estado_cobertura text,
  version integer not null default 1,
  estado_validacion text,
  comentario_supervisor text,
  comentario_jefatura text,
  fecha_validacion timestamptz,
  validado_por text,
  tipo_registro text,
  estado_anterior text,
  estado_nuevo text,
  id_origen text not null,
  source_kind text not null default 'LEGACY_SNAPSHOT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programacion_descansos_periodo_chk check (periodo ~ '^20[0-9]{2}-[0-9]{2}$'),
  constraint programacion_descansos_version_chk check (version >= 1)
);

create index if not exists programacion_descansos_periodo_idx
  on public.programacion_descansos_migracion(periodo);
create index if not exists programacion_descansos_fecha_idx
  on public.programacion_descansos_migracion(fecha);
create index if not exists programacion_descansos_cuadrilla_fecha_idx
  on public.programacion_descansos_migracion(cuadrilla,fecha);
create index if not exists programacion_descansos_id_origen_idx
  on public.programacion_descansos_migracion(id_origen);
create index if not exists programacion_descansos_estado_validacion_idx
  on public.programacion_descansos_migracion(estado_validacion);

create table if not exists public.programacion_descansos_eventos_migracion (
  event_id bigint generated always as identity primary key,
  movimiento_id text not null references public.programacion_descansos_migracion(id) on delete cascade,
  evento text not null,
  actor text,
  perfil_actor text,
  estado_anterior jsonb,
  estado_nuevo jsonb,
  origen text not null default 'POSTGRESQL',
  creado_at timestamptz not null default now()
);

create index if not exists programacion_descansos_eventos_mov_idx
  on public.programacion_descansos_eventos_migracion(movimiento_id,creado_at);

create or replace function public.mv_descansos_cuadrilla_norm(v text)
returns text
language sql
immutable
as $$
  select public.mv_observaciones_cuadrilla_norm(v);
$$;

create or replace function public.mv_descansos_plataforma(v text)
returns text
language sql
immutable
as $$
  select case
    when upper(trim(coalesce(v,''))) like '%TRASL%' then 'TRASLADOS'
    when upper(trim(coalesce(v,''))) like '%SGA%'
      or upper(trim(coalesce(v,''))) like '%VISITA%' then 'VISITA TECNICA'
    else 'INSTALACIONES'
  end;
$$;

create or replace function public.mv_descansos_estado_norm(v text)
returns text
language sql
immutable
as $$
  select case
    when upper(trim(coalesce(v,'EN CAMPO'))) in ('C','CAMPO','EN CAMPO') then 'EN CAMPO'
    when upper(trim(coalesce(v,''))) in ('CB','C B','Cᴮ','CAMPO BOLSA','EN CAMPO BOLSA','BOLSA') then 'EN CAMPO BOLSA'
    when upper(trim(coalesce(v,''))) in ('D','DESCANSO') then 'DESCANSO'
    when upper(trim(coalesce(v,''))) in ('V','VACACIONES') then 'VACACIONES'
    when nullif(trim(coalesce(v,'')),'') is null then 'EN CAMPO'
    else upper(trim(v))
  end;
$$;

create or replace function public.mv_descansos_es_jefatura(v text)
returns boolean
language sql
immutable
as $$
  select upper(trim(coalesce(v,''))) in ('JEFATURA','JEFATURA GENERAL','ADMIN','ADMINISTRADOR');
$$;

create or replace view public.mv_descansos_cuadrillas_activas
with (security_invoker=true) as
with ultimo as (
  select distinct on (public.mv_descansos_cuadrilla_norm(cuadrilla))
    id,
    public.mv_descansos_cuadrilla_norm(cuadrilla) as cuadrilla,
    upper(trim(coalesce(sede,''))) as sede,
    public.mv_descansos_plataforma(plataforma) as plataforma,
    upper(trim(coalesce(perfil,''))) as perfil,
    upper(trim(coalesce(estado,'ACTIVO'))) as estado,
    upper(trim(coalesce(usuario,''))) as usuario,
    upper(trim(coalesce(usuario_supervisor,''))) as supervisor,
    nombres_apellidos
  from public.app_users
  where nullif(public.mv_descansos_cuadrilla_norm(cuadrilla),'') is not null
  order by public.mv_descansos_cuadrilla_norm(cuadrilla),id desc
)
select
  cuadrilla,sede,plataforma,supervisor,usuario,nombres_apellidos
from ultimo
where estado='ACTIVO'
  and perfil='TECNICO'
  and cuadrilla ~* '^P[0-9]+\b'
  and sede<>'' and sede<>'TODAS';

create or replace view public.mv_descansos_personal_activo
with (security_invoker=true) as
select
  'PERSONAL|'||upper(trim(usuario)) as cuadrilla,
  upper(trim(sede)) as sede,
  'PERSONAL'::text as plataforma,
  case
    when upper(trim(perfil))='SUPERVISOR' then upper(trim(usuario))
    else upper(trim(coalesce(usuario_supervisor,'')))
  end as supervisor,
  upper(trim(usuario)) as usuario,
  nombres_apellidos,
  case
    when upper(trim(perfil)) in ('ALMACEN','RESPONSABLE ALMACEN','RESPONSABLE DE ALMACEN') then 'ALMACEN'
    else 'SUPERVISOR'
  end as tipo_personal
from public.app_users
where upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  and upper(trim(coalesce(sede,'')))<>'' and upper(trim(coalesce(sede,'')))<>'TODAS'
  and upper(trim(perfil)) in ('SUPERVISOR','ALMACEN','RESPONSABLE ALMACEN','RESPONSABLE DE ALMACEN');

create or replace view public.mv_descansos_ultimo_aprobado
with (security_invoker=true) as
select distinct on (public.mv_descansos_cuadrilla_norm(cuadrilla),fecha)
  id,seq,source_row,periodo,fecha,dia_semana,sede,
  public.mv_descansos_cuadrilla_norm(cuadrilla) as cuadrilla,
  plataforma,supervisor,tecnicos_afectados,
  public.mv_descansos_estado_norm(coalesce(nullif(estado_nuevo,''),estado_dia,'EN CAMPO')) as estado_vigente,
  estado_dia,estado_programacion,solicitud_cambio,motivo_solicitud,solicitado_por,fecha_solicitud,
  resultado_supervisor,motivo_supervisor,validado_supervisor_por,fecha_validacion_supervisor,
  resultado_jefatura,motivo_jefatura,validado_jefatura_por,fecha_validacion_jefatura,
  cobertura_sede,estado_cobertura,version,estado_validacion,comentario_supervisor,comentario_jefatura,
  fecha_validacion,validado_por,tipo_registro,estado_anterior,estado_nuevo,id_origen,source_kind
from public.programacion_descansos_migracion
where replace(upper(trim(coalesce(nullif(estado_validacion,''),estado_programacion,''))),'_',' ')
  in ('APROBADO','APLICADO')
order by public.mv_descansos_cuadrilla_norm(cuadrilla),fecha,seq desc;

create or replace view public.mv_descansos_ultimo_pendiente
with (security_invoker=true) as
select distinct on (public.mv_descansos_cuadrilla_norm(cuadrilla),fecha)
  *
from public.programacion_descansos_migracion
where replace(upper(trim(coalesce(nullif(estado_validacion,''),estado_programacion,''))),'_',' ')
  in ('PENDIENTE SUPERVISOR','PENDIENTE JEFATURA','OBSERVADO')
order by public.mv_descansos_cuadrilla_norm(cuadrilla),fecha,version desc,seq desc;

create or replace function public.mv_descansos_estado_aprobado(p_cuadrilla text,p_fecha date)
returns text
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (
      select estado_vigente
      from public.mv_descansos_ultimo_aprobado
      where cuadrilla=public.mv_descansos_cuadrilla_norm(p_cuadrilla)
        and fecha=p_fecha
      limit 1
    ),
    'EN CAMPO'
  );
$$;

create or replace function public.mv_descansos_regla_cobertura(p_plataforma text,p_fecha date)
returns jsonb
language plpgsql
immutable
as $$
declare
  domingo boolean := extract(dow from p_fecha)=0;
  p text := public.mv_descansos_plataforma(p_plataforma);
  objetivo numeric;
  minimo numeric;
begin
  if domingo and p='INSTALACIONES' then
    objetivo:=0.60; minimo:=0.60;
  elsif domingo then
    objetivo:=0.70; minimo:=0.60;
  else
    objetivo:=0.90; minimo:=0.80;
  end if;
  return jsonb_build_object('objetivo',objetivo,'minimo',minimo);
end;
$$;

create or replace function public.mv_descansos_calcular_cobertura(
  p_fecha date,
  p_sede text,
  p_plataforma text,
  p_cambios jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  total integer := 0;
  campo integer := 0;
  c record;
  key text;
  estado text;
  regla jsonb;
  objetivo numeric;
  minimo numeric;
  objetivo_cuadrillas integer;
  minimo_cuadrillas integer;
  porcentaje numeric;
  semaforo text := 'ROJO';
begin
  for c in
    select *
    from public.mv_descansos_cuadrillas_activas
    where sede=upper(trim(coalesce(p_sede,'')))
      and plataforma=public.mv_descansos_plataforma(p_plataforma)
  loop
    total:=total+1;
    key:=c.cuadrilla||'|'||to_char(p_fecha,'YYYY-MM-DD');
    estado:=public.mv_descansos_estado_norm(
      coalesce(nullif(p_cambios->>key,''),public.mv_descansos_estado_aprobado(c.cuadrilla,p_fecha))
    );
    if estado<>'DESCANSO' then campo:=campo+1; end if;
  end loop;

  porcentaje:=case when total>0 then campo::numeric/total else 0 end;
  regla:=public.mv_descansos_regla_cobertura(p_plataforma,p_fecha);
  objetivo:=(regla->>'objetivo')::numeric;
  minimo:=(regla->>'minimo')::numeric;
  objetivo_cuadrillas:=floor(total*objetivo+0.5);
  minimo_cuadrillas:=floor(total*minimo+0.5);

  if campo>=objetivo_cuadrillas then semaforo:='VERDE';
  elsif campo>=minimo_cuadrillas then semaforo:='AMARILLO';
  else semaforo:='ROJO';
  end if;

  return jsonb_build_object(
    'total',total,
    'enCampo',campo,
    'enDescanso',greatest(total-campo,0),
    'porcentaje',porcentaje,
    'estado',semaforo,
    'objetivo',objetivo,
    'minimo',minimo,
    'objetivoCuadrillas',objetivo_cuadrillas,
    'minimoCuadrillas',minimo_cuadrillas
  );
end;
$$;

create or replace view public.mv_descansos_programacion_actual
with (security_invoker=true) as
with keys as (
  select distinct public.mv_descansos_cuadrilla_norm(cuadrilla) cuadrilla,fecha
  from public.programacion_descansos_migracion
), a as (
  select * from public.mv_descansos_ultimo_aprobado
), p as (
  select * from public.mv_descansos_ultimo_pendiente
)
select
  k.cuadrilla,k.fecha,
  coalesce(p.id,a.id) as id_visible,
  a.id as id_aprobado,
  p.id as id_pendiente,
  coalesce(p.periodo,a.periodo,to_char(k.fecha,'YYYY-MM')) as periodo,
  coalesce(p.sede,a.sede,'') as sede,
  coalesce(p.plataforma,a.plataforma,'') as plataforma,
  coalesce(p.supervisor,a.supervisor,'') as supervisor,
  coalesce(p.tecnicos_afectados,a.tecnicos_afectados,'') as tecnicos_afectados,
  coalesce(a.estado_vigente,'EN CAMPO') as estado_dia_vigente,
  case when p.id is not null
    then public.mv_descansos_estado_norm(coalesce(nullif(p.estado_nuevo,''),nullif(p.solicitud_cambio,''),a.estado_vigente,'EN CAMPO'))
    else null end as solicitud_cambio_estado,
  case when p.id is not null
    then replace(upper(trim(coalesce(nullif(p.estado_validacion,''),p.estado_programacion,''))),'_',' ')
    else 'APROBADO' end as estado_programacion_visible,
  coalesce(p.tipo_registro,a.tipo_registro,'PROGRAMACION_INICIAL') as tipo_registro
from keys k
left join a on a.cuadrilla=k.cuadrilla and a.fecha=k.fecha
left join p on public.mv_descansos_cuadrilla_norm(p.cuadrilla)=k.cuadrilla and p.fecha=k.fecha
where a.id is not null or p.id is not null;

alter table public.programacion_descansos_legacy_snapshot enable row level security;
alter table public.programacion_descansos_migracion enable row level security;
alter table public.programacion_descansos_eventos_migracion enable row level security;

revoke all on public.programacion_descansos_legacy_snapshot from anon,authenticated;
revoke all on public.programacion_descansos_migracion from anon,authenticated;
revoke all on public.programacion_descansos_eventos_migracion from anon,authenticated;
revoke all on public.mv_descansos_cuadrillas_activas from anon,authenticated;
revoke all on public.mv_descansos_personal_activo from anon,authenticated;
revoke all on public.mv_descansos_ultimo_aprobado from anon,authenticated;
revoke all on public.mv_descansos_ultimo_pendiente from anon,authenticated;
revoke all on public.mv_descansos_programacion_actual from anon,authenticated;

revoke execute on function public.mv_descansos_cuadrilla_norm(text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_plataforma(text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_estado_norm(text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_es_jefatura(text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_estado_aprobado(text,date) from public,anon,authenticated;
revoke execute on function public.mv_descansos_regla_cobertura(text,date) from public,anon,authenticated;
revoke execute on function public.mv_descansos_calcular_cobertura(date,text,text,jsonb) from public,anon,authenticated;

grant select on public.programacion_descansos_legacy_snapshot to service_role;
grant select on public.programacion_descansos_migracion to service_role;
grant select on public.programacion_descansos_eventos_migracion to service_role;
grant select on public.mv_descansos_cuadrillas_activas to service_role;
grant select on public.mv_descansos_personal_activo to service_role;
grant select on public.mv_descansos_ultimo_aprobado to service_role;
grant select on public.mv_descansos_ultimo_pendiente to service_role;
grant select on public.mv_descansos_programacion_actual to service_role;

grant execute on function public.mv_descansos_cuadrilla_norm(text) to service_role;
grant execute on function public.mv_descansos_plataforma(text) to service_role;
grant execute on function public.mv_descansos_estado_norm(text) to service_role;
grant execute on function public.mv_descansos_es_jefatura(text) to service_role;
grant execute on function public.mv_descansos_estado_aprobado(text,date) to service_role;
grant execute on function public.mv_descansos_regla_cobertura(text,date) to service_role;
grant execute on function public.mv_descansos_calcular_cobertura(date,text,text,jsonb) to service_role;
