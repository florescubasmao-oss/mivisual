
-- 079_bono_supervisores_modelo.sql
-- Modelo base de Bonos Supervisores. No cambia la app legacy.

create table if not exists public.bono_supervisores_legacy_snapshot (
  sheet_name text not null,
  source_row integer not null,
  row_json jsonb not null,
  imported_at timestamptz not null default now(),
  primary key(sheet_name,source_row)
);

create table if not exists public.bono_supervisores_asignaciones (
  periodo text not null,
  usuario_supervisor text not null,
  nombre_supervisor text,
  sede text,
  cuadrillas jsonb not null default '[]'::jsonb,
  total_cuadrillas integer not null default 0,
  origen text,
  fecha_actualizacion timestamptz,
  actualizado_por text,
  source_row integer,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(periodo,usuario_supervisor)
);

create table if not exists public.bono_supervisores_evaluaciones (
  periodo text not null,
  usuario_supervisor text not null,
  nombre_supervisor text,
  sede text,
  respuestas jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  evaluado_por text,
  fecha_actualizacion timestamptz,
  source_row integer,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(periodo,usuario_supervisor)
);

create table if not exists public.bono_supervisores_configuracion (
  periodo text primary key,
  monto_total numeric(12,2) not null default 1000,
  productividad_pct numeric(7,2) not null default 25,
  calidad_pct numeric(7,2) not null default 25,
  sla_pct numeric(7,2) not null default 20,
  satisfaccion_pct numeric(7,2) not null default 15,
  seguridad_pct numeric(7,2) not null default 15,
  actualizado_por text,
  fecha_actualizacion timestamptz,
  activador_productividad numeric(7,2) not null default 85,
  activador_calidad numeric(7,2) not null default 85,
  activador_sla numeric(7,2) not null default 95,
  activador_satisfaccion numeric(7,2) not null default 85,
  activador_seguridad numeric(7,2) not null default 85,
  escalas_json jsonb,
  source_row integer,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bono_supervisores_satisfaccion (
  periodo text not null,
  usuario_supervisor text not null,
  nombre_supervisor text,
  sede text,
  clientes_llamados integer not null default 0,
  conformes integer not null default 0,
  no_conformes integer not null default 0,
  observacion text,
  registrado_por text,
  fecha_actualizacion timestamptz,
  source_row integer,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(periodo,usuario_supervisor)
);

create table if not exists public.bono_supervisores_actas (
  periodo text not null,
  usuario_supervisor text not null,
  nombre_supervisor text,
  sede text,
  actas_sin_pendientes text,
  registrado_por text,
  fecha_actualizacion timestamptz,
  source_row integer,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(periodo,usuario_supervisor)
);

create table if not exists public.bono_supervisores_eventos (
  seq bigserial primary key,
  periodo text,
  usuario_supervisor text,
  evento text not null,
  usuario_actor text,
  detalle jsonb not null default '{}'::jsonb,
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now()
);

create index if not exists idx_bono_sup_asig_sede
  on public.bono_supervisores_asignaciones(periodo,sede);
create index if not exists idx_bono_sup_eventos_periodo
  on public.bono_supervisores_eventos(periodo,usuario_supervisor);

alter table public.bono_supervisores_legacy_snapshot enable row level security;
alter table public.bono_supervisores_asignaciones enable row level security;
alter table public.bono_supervisores_evaluaciones enable row level security;
alter table public.bono_supervisores_configuracion enable row level security;
alter table public.bono_supervisores_satisfaccion enable row level security;
alter table public.bono_supervisores_actas enable row level security;
alter table public.bono_supervisores_eventos enable row level security;

revoke all on public.bono_supervisores_legacy_snapshot from anon,authenticated;
revoke all on public.bono_supervisores_asignaciones from anon,authenticated;
revoke all on public.bono_supervisores_evaluaciones from anon,authenticated;
revoke all on public.bono_supervisores_configuracion from anon,authenticated;
revoke all on public.bono_supervisores_satisfaccion from anon,authenticated;
revoke all on public.bono_supervisores_actas from anon,authenticated;
revoke all on public.bono_supervisores_eventos from anon,authenticated;

grant select,insert,update,delete on public.bono_supervisores_legacy_snapshot to service_role;
grant select,insert,update,delete on public.bono_supervisores_asignaciones to service_role;
grant select,insert,update,delete on public.bono_supervisores_evaluaciones to service_role;
grant select,insert,update,delete on public.bono_supervisores_configuracion to service_role;
grant select,insert,update,delete on public.bono_supervisores_satisfaccion to service_role;
grant select,insert,update,delete on public.bono_supervisores_actas to service_role;
grant select,insert,update,delete on public.bono_supervisores_eventos to service_role;
grant usage,select on sequence public.bono_supervisores_eventos_seq_seq to service_role;

create or replace function public.mv_bono_sup_timestamp_sheet(v jsonb)
returns timestamptz
language plpgsql
immutable
set search_path=public
as $$
declare
  t text;
  n numeric;
  d timestamp;
  m text[];
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='number' then
    n:=(v#>>'{}')::numeric;
    d:=timestamp '1899-12-30 00:00:00' + make_interval(secs => round(n*86400)::integer);
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

create or replace function public.mv_bono_sup_periodo(v text)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare t text; m text[];
begin
  t:=trim(coalesce(v,''));
  m:=regexp_match(t,'^([0-9]{4})[-/]([0-9]{1,2})');
  if m is not null then return m[1]||'-'||lpad((m[2]::int)::text,2,'0'); end if;
  m:=regexp_match(t,'^([0-9]{1,2})[-/]([0-9]{1,2})[-/]([0-9]{4})');
  if m is not null then return m[3]||'-'||lpad((m[2]::int)::text,2,'0'); end if;
  return '';
end;
$$;

create or replace function public.mv_bono_sup_usuario_key(v text)
returns text
language sql
immutable
set search_path=public
as $$
  select replace(public.mv_actividad_texto(v),' ','');
$$;

create or replace view public.mv_bono_supervisores_asignaciones_actual
with (security_invoker=true)
as select * from public.bono_supervisores_asignaciones;

revoke all on public.mv_bono_supervisores_asignaciones_actual from anon,authenticated;
grant select on public.mv_bono_supervisores_asignaciones_actual to service_role;

revoke execute on function public.mv_bono_sup_timestamp_sheet(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_periodo(text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_usuario_key(text) from public,anon,authenticated;

grant execute on function public.mv_bono_sup_timestamp_sheet(jsonb) to service_role;
grant execute on function public.mv_bono_sup_periodo(text) to service_role;
grant execute on function public.mv_bono_sup_usuario_key(text) to service_role;
