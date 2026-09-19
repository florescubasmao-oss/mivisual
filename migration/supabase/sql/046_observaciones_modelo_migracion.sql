
-- 046_observaciones_modelo_migracion.sql
-- Modelo operativo de Observaciones/Penalidades preservando snapshot histórico.

create or replace function public.mv_observaciones_factor_estado(p_estado text)
returns numeric
language sql
immutable
as $$
  select case
    when upper(trim(coalesce(p_estado,''))) in ('SUBSANADO','ANULADO') then 0.20::numeric
    else 1.00::numeric
  end;
$$;

revoke execute on function public.mv_observaciones_factor_estado(text) from public,anon,authenticated;
grant execute on function public.mv_observaciones_factor_estado(text) to service_role;

create table if not exists public.observaciones_migracion (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  fecha_registro timestamptz not null,
  periodo text not null,
  registrado_por text not null,
  perfil_registro text not null,
  sede text not null,
  plataforma text,
  supervisor text,
  cuadrilla text not null,
  fuente text not null,
  codigo_ticket text,
  tipo_observacion text not null,
  descripcion text,
  estado text not null,
  monto numeric(12,2) not null default 0,
  fecha_descargo timestamptz,
  descargo_tecnico text,
  fecha_revision timestamptz,
  plazo timestamptz,
  source_kind text not null default 'LEGACY_SNAPSHOT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observaciones_periodo_chk check (periodo ~ '^20[0-9]{2}-[0-9]{2}$'),
  constraint observaciones_fuente_chk check (fuente in ('WIN','VISUAL')),
  constraint observaciones_tipo_chk check (tipo_observacion in ('SEGURIDAD','IMPLEMENTACION','GESTION TECNICA')),
  constraint observaciones_estado_chk check (estado in ('DERIVADO','EN PROCESO','PENALIZADO','APELADO','SUBSANADO','ANULADO')),
  constraint observaciones_monto_chk check (monto>=0)
);

create index if not exists observaciones_migracion_periodo_idx
  on public.observaciones_migracion(periodo);
create index if not exists observaciones_migracion_cuadrilla_idx
  on public.observaciones_migracion(cuadrilla);
create index if not exists observaciones_migracion_estado_idx
  on public.observaciones_migracion(estado);
create index if not exists observaciones_migracion_sede_idx
  on public.observaciones_migracion(sede);
create index if not exists observaciones_migracion_codigo_idx
  on public.observaciones_migracion(codigo_ticket);

truncate table public.observaciones_migracion cascade;

insert into public.observaciones_migracion (
  legacy_id,fecha_registro,periodo,registrado_por,perfil_registro,sede,plataforma,supervisor,
  cuadrilla,fuente,codigo_ticket,tipo_observacion,descripcion,estado,monto,
  fecha_descargo,descargo_tecnico,fecha_revision,plazo,source_kind
)
select
  s.id,
  s.fecha_registro at time zone 'America/Lima',
  case
    when lower(trim(s.periodo_texto)) like 'enero %' then substring(s.periodo_texto from '[0-9]{4}')||'-01'
    when lower(trim(s.periodo_texto)) like 'febrero %' then substring(s.periodo_texto from '[0-9]{4}')||'-02'
    when lower(trim(s.periodo_texto)) like 'marzo %' then substring(s.periodo_texto from '[0-9]{4}')||'-03'
    when lower(trim(s.periodo_texto)) like 'abril %' then substring(s.periodo_texto from '[0-9]{4}')||'-04'
    when lower(trim(s.periodo_texto)) like 'mayo %' then substring(s.periodo_texto from '[0-9]{4}')||'-05'
    when lower(trim(s.periodo_texto)) like 'junio %' then substring(s.periodo_texto from '[0-9]{4}')||'-06'
    when lower(trim(s.periodo_texto)) like 'julio %' then substring(s.periodo_texto from '[0-9]{4}')||'-07'
    when lower(trim(s.periodo_texto)) like 'agosto %' then substring(s.periodo_texto from '[0-9]{4}')||'-08'
    when lower(trim(s.periodo_texto)) like 'septiembre %' or lower(trim(s.periodo_texto)) like 'setiembre %'
      then substring(s.periodo_texto from '[0-9]{4}')||'-09'
    when lower(trim(s.periodo_texto)) like 'octubre %' then substring(s.periodo_texto from '[0-9]{4}')||'-10'
    when lower(trim(s.periodo_texto)) like 'noviembre %' then substring(s.periodo_texto from '[0-9]{4}')||'-11'
    when lower(trim(s.periodo_texto)) like 'diciembre %' then substring(s.periodo_texto from '[0-9]{4}')||'-12'
    else to_char(s.fecha_registro,'YYYY-MM')
  end,
  upper(trim(s.registrado_por)),
  upper(trim(s.perfil_registro)),
  upper(trim(s.sede)),
  nullif(upper(trim(s.plataforma)),''),
  nullif(upper(trim(s.supervisor)),''),
  regexp_replace(trim(s.cuadrilla),'^P[[:space:]]+([0-9]+)','P\1'),
  upper(trim(s.fuente)),
  nullif(trim(s.codigo_ticket),''),
  case
    when upper(trim(s.tipo_observacion)) in ('IMPLEMENTACIÓN','IMPLEMENTACION') then 'IMPLEMENTACION'
    when upper(trim(s.tipo_observacion)) in ('GESTIÓN TÉCNICA','GESTION TECNICA') then 'GESTION TECNICA'
    else upper(trim(s.tipo_observacion))
  end,
  nullif(trim(s.descripcion),''),
  upper(trim(s.estado)),
  coalesce(s.monto,0),
  case when s.fecha_descargo is null then null else s.fecha_descargo at time zone 'America/Lima' end,
  nullif(trim(s.descargo_tecnico),''),
  case when s.fecha_revision is null then null else s.fecha_revision at time zone 'America/Lima' end,
  case when s.plazo is null then null else s.plazo at time zone 'America/Lima' end,
  'LEGACY_SNAPSHOT'
from public.economico_observaciones_snapshot s;

create table if not exists public.observaciones_evidencias_migracion (
  id bigint generated always as identity primary key,
  observacion_id uuid not null references public.observaciones_migracion(id) on delete cascade,
  orden integer not null,
  url text not null,
  drive_file_id text,
  origen text not null default 'TECNICO',
  creado_at timestamptz not null default now(),
  unique(observacion_id,orden)
);

truncate table public.observaciones_evidencias_migracion restart identity;

insert into public.observaciones_evidencias_migracion(observacion_id,orden,url,drive_file_id,origen)
select
  o.id,
  x.ordinality::integer,
  trim(x.url),
  substring(trim(x.url) from '/d/([^/]+)'),
  'LEGACY_SNAPSHOT'
from public.economico_observaciones_snapshot s
join public.observaciones_migracion o on o.legacy_id=s.id
cross join lateral unnest(string_to_array(coalesce(s.evidencia_tecnico,''),'|')) with ordinality as x(url,ordinality)
where nullif(trim(x.url),'') is not null;

create table if not exists public.observaciones_eventos_migracion (
  id bigint generated always as identity primary key,
  observacion_id uuid not null references public.observaciones_migracion(id) on delete cascade,
  evento text not null,
  actor text,
  perfil_actor text,
  estado_anterior jsonb,
  estado_nuevo jsonb,
  origen text not null,
  creado_at timestamptz not null default now()
);

truncate table public.observaciones_eventos_migracion restart identity;

insert into public.observaciones_eventos_migracion(
  observacion_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen,creado_at
)
select
  id,'IMPORT_LEGACY','MIGRACION','SISTEMA',null,
  jsonb_build_object(
    'legacyId',legacy_id,'estado',estado,'monto',monto,'descargo',descargo_tecnico,
    'fechaDescargo',fecha_descargo,'fechaRevision',fecha_revision,'plazo',plazo
  ),
  'OBSERVACIONES',
  now()
from public.observaciones_migracion;

create or replace view public.mv_observaciones_migracion
with (security_invoker=true) as
select
  o.*,
  public.mv_observaciones_factor_estado(o.estado) as factor_afectacion,
  round(o.monto*public.mv_observaciones_factor_estado(o.estado),2) as monto_afectado,
  coalesce(e.evidencias,'[]'::jsonb) as evidencias,
  coalesce(e.cantidad,0)::integer as cantidad_evidencias,
  case
    when o.fecha_descargo is null then 'SIN_DESCARGO'
    when o.plazo is null then 'DESCARGO_SIN_PLAZO'
    when o.fecha_descargo<=o.plazo then 'DESCARGO_EN_PLAZO'
    else 'DESCARGO_FUERA_PLAZO'
  end as estado_plazo_descargo
from public.observaciones_migracion o
left join lateral (
  select
    jsonb_agg(
      jsonb_build_object('orden',x.orden,'url',x.url,'driveFileId',x.drive_file_id,'origen',x.origen)
      order by x.orden
    ) as evidencias,
    count(*) as cantidad
  from public.observaciones_evidencias_migracion x
  where x.observacion_id=o.id
) e on true;

create or replace view public.mv_observaciones_resumen_migracion
with (security_invoker=true) as
select
  periodo,
  sede,
  cuadrilla,
  count(*)::integer as observaciones,
  round(sum(monto),2) as monto_total,
  round(sum(monto*public.mv_observaciones_factor_estado(estado)),2) as monto_afectado,
  count(*) filter(where estado='DERIVADO')::integer as derivadas,
  count(*) filter(where estado='EN PROCESO')::integer as en_proceso,
  count(*) filter(where estado='PENALIZADO')::integer as penalizadas,
  count(*) filter(where estado='APELADO')::integer as apeladas,
  count(*) filter(where estado='SUBSANADO')::integer as subsanadas,
  count(*) filter(where estado='ANULADO')::integer as anuladas
from public.observaciones_migracion
group by periodo,sede,cuadrilla;

alter table public.observaciones_migracion enable row level security;
alter table public.observaciones_evidencias_migracion enable row level security;
alter table public.observaciones_eventos_migracion enable row level security;

revoke all on public.observaciones_migracion from anon,authenticated;
revoke all on public.observaciones_evidencias_migracion from anon,authenticated;
revoke all on public.observaciones_eventos_migracion from anon,authenticated;
revoke all on public.mv_observaciones_migracion from anon,authenticated;
revoke all on public.mv_observaciones_resumen_migracion from anon,authenticated;

grant select on public.observaciones_migracion to service_role;
grant select on public.observaciones_evidencias_migracion to service_role;
grant select on public.observaciones_eventos_migracion to service_role;
grant select on public.mv_observaciones_migracion to service_role;
grant select on public.mv_observaciones_resumen_migracion to service_role;
