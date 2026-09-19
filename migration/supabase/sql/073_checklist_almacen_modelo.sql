
-- 073_checklist_almacen_modelo.sql
-- Modelo PostgreSQL para CHECKLIST_ALMACEN V141 / 83 columnas.
-- La hoja productiva sigue siendo la fuente viva hasta cutover.

create table if not exists public.checklist_almacen_legacy_snapshot (
  source_row integer primary key,
  id text,
  row_json jsonb not null,
  imported_at timestamptz not null default now()
);

create table if not exists public.checklist_almacen_migracion (
  id text primary key,
  source_row integer unique,
  fecha_registro date,
  hora_registro time without time zone,
  usuario text,
  nombres_apellidos text,
  sede text,
  cuadrilla text,
  fecha_gestion date,
  estado_general text,

  ont_zte text,
  fotos_series_ont_zte text,
  ont_huawei text,
  fotos_series_ont_huawei text,
  mesh_zte text,
  fotos_mesh_zte text,
  mesh_huawei text,
  fotos_mesh_huawei text,
  winbox text,
  foto_winbox text,
  fonowin text,
  foto_fonowin text,

  cable_drop numeric,
  pre50 numeric,
  pre100 numeric,
  pre150 numeric,
  pre200 numeric,
  anclaje_p numeric,
  cinta_band_it numeric,
  hebilla numeric,
  acoplador numeric,
  roseta numeric,
  conectores_opticos numeric,
  templadores numeric,
  splitter numeric,
  clevis numeric,
  utp_cat5 numeric,
  utp_cat6 numeric,
  patch_apc_apc numeric,
  patch_upc_apc numeric,
  rj45 numeric,

  resultado_almacen text,
  motivo_almacen text,
  validado_almacen_por text,
  fecha_validacion_almacen date,
  hora_validacion_almacen time without time zone,

  resultado_jefatura text,
  motivo_jefatura text,
  validado_jefatura_por text,
  fecha_validacion_jefatura date,
  hora_validacion_jefatura time without time zone,

  version integer not null default 1,
  origen_registro text not null default 'TECNICO',
  registrado_por text,
  perfil_registro text,
  comentario_final text,

  tipo_checklist text not null default 'MATERIALES',

  resultado_herramientas text,
  observacion_herramientas text,

  foto_unidad_frente text,
  foto_unidad_posterior text,
  foto_unidad_lado_izquierdo text,
  foto_unidad_lado_derecho text,
  foto_extintor text,
  foto_botiquin text,
  foto_reja_separadora text,
  foto_parrilla_1 text,
  foto_parrilla_2 text,
  resultado_unidad text,
  observacion_unidad text,

  licencia_fecha_vencimiento date,
  licencia_foto_frente text,
  licencia_foto_reverso text,
  soat_fecha_vencimiento date,
  soat_archivo text,
  revision_tecnica_fecha_vencimiento date,
  revision_tecnica_archivo text,
  resultado_documentacion text,
  observacion_documentacion text,

  foto_personal_completo text,
  foto_botas text,
  foto_fotocheck text,
  resultado_epp text,
  observacion_epp text,

  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_herramientas_detalle_migracion (
  id_detalle text primary key,
  id_checklist text not null references public.checklist_almacen_migracion(id) on delete cascade,
  fecha_registro timestamptz,
  sede text,
  cuadrilla text,
  herramienta text not null,
  codigo_serie text,
  estado text,
  motivo text,
  foto text,
  registrado_por text,
  perfil_registro text,
  cantidad numeric not null default 0,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now()
);

create table if not exists public.catalogo_herramientas_migracion (
  herramienta text primary key,
  categoria text,
  requiere_serie text,
  estado text,
  source_row integer,
  source_kind text not null default 'SHEET',
  imported_at timestamptz not null default now()
);

create table if not exists public.checklist_almacen_eventos_migracion (
  seq bigserial primary key,
  checklist_id text not null,
  evento text not null,
  usuario text,
  perfil text,
  detalle jsonb not null default '{}'::jsonb,
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now()
);

create index if not exists idx_checklist_fecha_gestion
  on public.checklist_almacen_migracion(fecha_gestion);
create index if not exists idx_checklist_sede
  on public.checklist_almacen_migracion(sede);
create index if not exists idx_checklist_cuadrilla
  on public.checklist_almacen_migracion(cuadrilla);
create index if not exists idx_checklist_estado
  on public.checklist_almacen_migracion(estado_general);
create index if not exists idx_checklist_tipo
  on public.checklist_almacen_migracion(tipo_checklist);

create unique index if not exists uq_checklist_cuadrilla_fecha_tipo
  on public.checklist_almacen_migracion(
    public.mv_actividad_cuadrilla_norm(cuadrilla),
    fecha_gestion,
    public.mv_actividad_texto(tipo_checklist)
  );

alter table public.checklist_almacen_legacy_snapshot enable row level security;
alter table public.checklist_almacen_migracion enable row level security;
alter table public.checklist_herramientas_detalle_migracion enable row level security;
alter table public.catalogo_herramientas_migracion enable row level security;
alter table public.checklist_almacen_eventos_migracion enable row level security;

revoke all on public.checklist_almacen_legacy_snapshot from anon,authenticated;
revoke all on public.checklist_almacen_migracion from anon,authenticated;
revoke all on public.checklist_herramientas_detalle_migracion from anon,authenticated;
revoke all on public.catalogo_herramientas_migracion from anon,authenticated;
revoke all on public.checklist_almacen_eventos_migracion from anon,authenticated;

grant select,insert,update,delete on public.checklist_almacen_legacy_snapshot to service_role;
grant select,insert,update,delete on public.checklist_almacen_migracion to service_role;
grant select,insert,update,delete on public.checklist_herramientas_detalle_migracion to service_role;
grant select,insert,update,delete on public.catalogo_herramientas_migracion to service_role;
grant select,insert,update,delete on public.checklist_almacen_eventos_migracion to service_role;
grant usage,select on sequence public.checklist_almacen_eventos_migracion_seq_seq to service_role;

create or replace function public.mv_checklist_fecha_sheet(v jsonb)
returns date
language plpgsql
immutable
set search_path=public
as $$
declare t text; n numeric; m text[];
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='number' then
    n:=(v#>>'{}')::numeric;
    return date '1899-12-30'+floor(n)::integer;
  end if;
  t:=trim(v#>>'{}');
  if t='' then return null; end if;
  m:=regexp_match(t,'^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})$');
  if m is not null then return make_date(m[3]::int,m[2]::int,m[1]::int); end if;
  m:=regexp_match(t,'^([0-9]{4})[/-]([0-9]{1,2})[/-]([0-9]{1,2})$');
  if m is not null then return make_date(m[1]::int,m[2]::int,m[3]::int); end if;
  return t::date;
exception when others then return null;
end;
$$;

create or replace function public.mv_checklist_hora_sheet(v jsonb)
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
  t:=trim(v#>>'{}');
  if t='' then return null; end if;
  return t::time;
exception when others then return null;
end;
$$;

create or replace function public.mv_checklist_numero(v jsonb)
returns numeric
language plpgsql
immutable
set search_path=public
as $$
declare t text;
begin
  if v is null or v='null'::jsonb then return 0; end if;
  t:=trim(v#>>'{}');
  if t='' then return 0; end if;
  return greatest(0,replace(t,',','.')::numeric);
exception when others then return 0;
end;
$$;

create or replace function public.mv_checklist_tipo(v text)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare t text;
begin
  t:=public.mv_actividad_texto(coalesce(v,'MATERIALES'));
  if t='' then t:='MATERIALES'; end if;
  if t not in ('MATERIALES','HERRAMIENTAS','UNIDAD VEHICULAR','DOCUMENTACION','EPP') then
    raise exception 'Tipo de checklist no válido';
  end if;
  return t;
end;
$$;

create or replace function public.mv_checklist_generar_id()
returns text
language sql
volatile
set search_path=public
as $$
  select 'CHK-'||
         to_char(clock_timestamp() at time zone 'America/Lima','YYYYMMDDHH24MISS')||
         '-'||
         lpad((100+floor(random()*900))::int::text,3,'0');
$$;

create or replace view public.mv_checklist_almacen_actual
with (security_invoker=true)
as
select * from public.checklist_almacen_migracion;

revoke all on public.mv_checklist_almacen_actual from anon,authenticated;
grant select on public.mv_checklist_almacen_actual to service_role;

revoke execute on function public.mv_checklist_fecha_sheet(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_checklist_hora_sheet(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_checklist_numero(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_checklist_tipo(text) from public,anon,authenticated;
revoke execute on function public.mv_checklist_generar_id() from public,anon,authenticated;

grant execute on function public.mv_checklist_fecha_sheet(jsonb) to service_role;
grant execute on function public.mv_checklist_hora_sheet(jsonb) to service_role;
grant execute on function public.mv_checklist_numero(jsonb) to service_role;
grant execute on function public.mv_checklist_tipo(text) to service_role;
grant execute on function public.mv_checklist_generar_id() to service_role;
