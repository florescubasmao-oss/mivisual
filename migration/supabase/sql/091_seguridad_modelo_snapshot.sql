
-- 091_seguridad_modelo_snapshot.sql
-- Modelo base Seguridad ATS/PETAR + firmas. La app legacy continúa activa.

create table if not exists public.seguridad_legacy_snapshot (
  sheet_name text not null,
  source_row integer not null,
  row_json jsonb not null,
  imported_at timestamptz not null default now(),
  primary key(sheet_name,source_row)
);

create table if not exists public.seguridad_ats_migracion (
  id text primary key,
  source_row integer unique,
  numero integer,
  fecha date,
  hora_inicio time without time zone,
  hora_final time without time zone,
  sede text,
  plataforma text,
  cuadrilla text,
  t1_usuario text,
  t1_nombre text,
  t2_usuario text,
  t2_nombre text,
  supervisor_usuario text,
  supervisor_nombre text,
  gps text,
  trabajo text,
  lugar_trabajo text,
  epp_json jsonb not null default '[]'::jsonb,
  herramientas_json jsonb not null default '[]'::jsonb,
  tareas_json jsonb not null default '[]'::jsonb,
  estado text not null default 'BORRADOR',
  petar_id text,
  aceptaciones_json jsonb not null default '[]'::jsonb,
  supervisor_firma_json jsonb,
  validador_firma_json jsonb,
  observacion text,
  version integer not null default 1,
  pdf_url text,
  pdf_id text,
  creado_por text,
  creado_en timestamptz,
  actualizado_en timestamptz,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seguridad_petar_migracion (
  id text primary key,
  source_row integer unique,
  numero integer,
  ats_id text,
  fecha date,
  hora_inicio time without time zone,
  hora_final time without time zone,
  sede text,
  cuadrilla text,
  trabajo text,
  ubicacion text,
  checklist_json jsonb not null default '[]'::jsonb,
  epp_json jsonb not null default '[]'::jsonb,
  estado text not null default 'BORRADOR',
  no_cumple_critico text not null default 'NO',
  pdf_url text,
  pdf_id text,
  version integer not null default 1,
  actualizado_en timestamptz,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seguridad_firmas_migracion (
  usuario text not null,
  version integer not null,
  nombre text,
  dni text,
  perfil text,
  sede text,
  activa boolean not null default true,
  archivo_id text,
  url text,
  gps_registro text,
  fecha_registro timestamptz,
  autorizacion_cambio_id text,
  source_row integer,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(usuario,version)
);

create table if not exists public.seguridad_firma_solicitudes_migracion (
  id text primary key,
  usuario text not null,
  nombre text,
  sede text,
  motivo text,
  estado text not null default 'PENDIENTE',
  solicitado_en timestamptz,
  resuelto_por text,
  resuelto_en timestamptz,
  source_row integer unique,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seguridad_eventos_migracion (
  seq bigserial primary key,
  ats_id text,
  petar_id text,
  firma_usuario text,
  evento text not null,
  usuario_actor text,
  perfil_actor text,
  detalle jsonb not null default '{}'::jsonb,
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now()
);

create unique index if not exists uq_seguridad_ats_numero on public.seguridad_ats_migracion(numero) where numero is not null;
create unique index if not exists uq_seguridad_petar_numero on public.seguridad_petar_migracion(numero) where numero is not null;
create unique index if not exists uq_seguridad_ats_cuadrilla_fecha
  on public.seguridad_ats_migracion(public.mv_actividad_cuadrilla_norm(cuadrilla),fecha);
create index if not exists idx_seguridad_ats_estado on public.seguridad_ats_migracion(estado);
create index if not exists idx_seguridad_ats_sede_fecha on public.seguridad_ats_migracion(sede,fecha);
create index if not exists idx_seguridad_petar_ats on public.seguridad_petar_migracion(ats_id);
create index if not exists idx_seguridad_solicitudes_estado on public.seguridad_firma_solicitudes_migracion(estado);

alter table public.seguridad_legacy_snapshot enable row level security;
alter table public.seguridad_ats_migracion enable row level security;
alter table public.seguridad_petar_migracion enable row level security;
alter table public.seguridad_firmas_migracion enable row level security;
alter table public.seguridad_firma_solicitudes_migracion enable row level security;
alter table public.seguridad_eventos_migracion enable row level security;

revoke all on public.seguridad_legacy_snapshot from anon,authenticated;
revoke all on public.seguridad_ats_migracion from anon,authenticated;
revoke all on public.seguridad_petar_migracion from anon,authenticated;
revoke all on public.seguridad_firmas_migracion from anon,authenticated;
revoke all on public.seguridad_firma_solicitudes_migracion from anon,authenticated;
revoke all on public.seguridad_eventos_migracion from anon,authenticated;

grant select,insert,update,delete on public.seguridad_legacy_snapshot to service_role;
grant select,insert,update,delete on public.seguridad_ats_migracion to service_role;
grant select,insert,update,delete on public.seguridad_petar_migracion to service_role;
grant select,insert,update,delete on public.seguridad_firmas_migracion to service_role;
grant select,insert,update,delete on public.seguridad_firma_solicitudes_migracion to service_role;
grant select,insert,update,delete on public.seguridad_eventos_migracion to service_role;
grant usage,select on sequence public.seguridad_eventos_migracion_seq_seq to service_role;

create or replace function public.mv_seguridad_json_array(v jsonb)
returns jsonb
language plpgsql
immutable
set search_path=public
as $$
declare t text;
begin
  if v is null or v='null'::jsonb then return '[]'::jsonb; end if;
  if jsonb_typeof(v)='array' then return v; end if;
  t:=trim(v#>>'{}');
  if t='' then return '[]'::jsonb; end if;
  if jsonb_typeof(t::jsonb)='array' then return t::jsonb; end if;
  return '[]'::jsonb;
exception when others then return '[]'::jsonb;
end;
$$;

create or replace function public.mv_seguridad_json_object_or_null(v jsonb)
returns jsonb
language plpgsql
immutable
set search_path=public
as $$
declare t text; j jsonb;
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='object' then return v; end if;
  t:=trim(v#>>'{}');
  if t='' then return null; end if;
  j:=t::jsonb;
  if jsonb_typeof(j)='object' then return j; end if;
  return null;
exception when others then return null;
end;
$$;

create or replace function public.mv_seguridad_time(v jsonb)
returns time without time zone
language plpgsql
immutable
set search_path=public
as $$
declare t text; n numeric; segundos integer;
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='number' then
    n:=(v#>>'{}')::numeric;
    segundos:=round((n-floor(n))*86400)::integer%86400;
    return time '00:00:00'+make_interval(secs=>segundos);
  end if;
  t:=upper(trim(v#>>'{}'));
  if t='' then return null; end if;
  begin return t::time; exception when others then null; end;
  if t ~ '^[0-9]{1,2}:[0-9]{2}\s*(AM|PM)$' then
    return to_timestamp(t,'HH12:MI AM')::time;
  end if;
  return null;
end;
$$;

create or replace function public.mv_seguridad_timestamp(v jsonb)
returns timestamptz
language plpgsql
immutable
set search_path=public
as $$
declare t text; n numeric; d timestamp; m text[];
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='number' then
    n:=(v#>>'{}')::numeric;
    d:=timestamp '1899-12-30 00:00:00'+make_interval(secs=>round(n*86400)::integer);
    return d at time zone 'America/Lima';
  end if;
  t:=trim(v#>>'{}');
  if t='' then return null; end if;
  m:=regexp_match(t,'^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})(?:\s+([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?)?$');
  if m is not null then
    d:=make_timestamp(m[3]::int,m[2]::int,m[1]::int,coalesce(m[4],'0')::int,coalesce(m[5],'0')::int,coalesce(m[6],'0')::double precision);
    return d at time zone 'America/Lima';
  end if;
  return t::timestamptz;
exception when others then return null;
end;
$$;

create or replace view public.mv_seguridad_ats_actual
with (security_invoker=true)
as select * from public.seguridad_ats_migracion;

revoke all on public.mv_seguridad_ats_actual from anon,authenticated;
grant select on public.mv_seguridad_ats_actual to service_role;

revoke execute on function public.mv_seguridad_json_array(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_json_object_or_null(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_time(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_timestamp(jsonb) from public,anon,authenticated;

grant execute on function public.mv_seguridad_json_array(jsonb) to service_role;
grant execute on function public.mv_seguridad_json_object_or_null(jsonb) to service_role;
grant execute on function public.mv_seguridad_time(jsonb) to service_role;
grant execute on function public.mv_seguridad_timestamp(jsonb) to service_role;
