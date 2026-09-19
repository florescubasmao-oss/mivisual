-- 068_actividad_campo_modelo.sql
-- Modelo base de Actividad en Campo. No reemplaza aún la app legacy.

create table if not exists public.actividad_campo_legacy_snapshot (
  source_row integer primary key,
  id text,
  row_json jsonb not null,
  imported_at timestamptz not null default now()
);

create table if not exists public.actividad_campo_migracion (
  id text primary key,
  source_row integer unique,
  fecha date,
  hora time without time zone,
  sede text,
  supervisor text,
  cuadrilla text,
  tipo_actividad_original text,
  tipo_actividad text,
  cliente_presente text,
  dni_validado text,
  estado_instalacion text,
  drop_metraje text,
  templadores text,
  reserva_cable text,
  potencia_conforme text,
  velocidad_conforme text,
  limpieza_trabajo text,
  cliente_conforme text,
  observaciones text,
  foto_1 text,
  foto_2 text,
  foto_acta text,
  tipo_orden text,
  codigo_pedido text,
  dni_cliente text,
  cliente text,
  direccion text,
  ticket text,
  auditoria_json jsonb,
  puntaje_calidad numeric(10,2),
  puntaje_seguridad numeric(10,2),
  puntaje_cliente numeric(10,2),
  puntaje_orden_limpieza numeric(10,2),
  puntaje_total numeric(10,2),
  clasificacion text,
  requiere_seguimiento text,
  fecha_compromiso text,
  responsable_subsanar text,
  estado_auditoria text,
  acciones_correctivas text,
  foto_4 text,
  desc_foto_1 text,
  desc_foto_2 text,
  desc_foto_3 text,
  desc_foto_4 text,
  source_kind text not null default 'SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.actividad_campo_eventos_migracion (
  seq bigserial primary key,
  actividad_id text not null,
  evento text not null,
  usuario text,
  detalle jsonb not null default '{}'::jsonb,
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now()
);

create index if not exists idx_actividad_campo_fecha on public.actividad_campo_migracion(fecha);
create index if not exists idx_actividad_campo_supervisor on public.actividad_campo_migracion(supervisor);
create index if not exists idx_actividad_campo_sede on public.actividad_campo_migracion(sede);
create index if not exists idx_actividad_campo_cuadrilla on public.actividad_campo_migracion(cuadrilla);
create index if not exists idx_actividad_campo_tipo on public.actividad_campo_migracion(tipo_actividad);
create index if not exists idx_actividad_campo_clasificacion on public.actividad_campo_migracion(clasificacion);

alter table public.actividad_campo_legacy_snapshot enable row level security;
alter table public.actividad_campo_migracion enable row level security;
alter table public.actividad_campo_eventos_migracion enable row level security;

revoke all on public.actividad_campo_legacy_snapshot from anon, authenticated;
revoke all on public.actividad_campo_migracion from anon, authenticated;
revoke all on public.actividad_campo_eventos_migracion from anon, authenticated;

grant select, insert, update, delete on public.actividad_campo_legacy_snapshot to service_role;
grant select, insert, update, delete on public.actividad_campo_migracion to service_role;
grant select, insert, update, delete on public.actividad_campo_eventos_migracion to service_role;
grant usage, select on sequence public.actividad_campo_eventos_migracion_seq_seq to service_role;

create or replace function public.mv_actividad_texto(v text)
returns text language sql immutable set search_path=public
as $$
  select upper(trim(regexp_replace(
    translate(coalesce(v,''),'áéíóúÁÉÍÓÚñÑ','aeiouAEIOUnN'),
    '\s+',' ','g'
  )));
$$;

create or replace function public.mv_actividad_tipo_canonico(v text)
returns text language sql immutable set search_path=public
as $$
  select case
    when public.mv_actividad_texto(v)='SUPERVISION EN CALIENTE' then 'AUDITORIA EN CALIENTE'
    else public.mv_actividad_texto(v)
  end;
$$;

create or replace function public.mv_actividad_es_auditoria(v text)
returns boolean language sql immutable set search_path=public
as $$
  select public.mv_actividad_tipo_canonico(v) in ('AUDITORIA EN FRIO','AUDITORIA EN CALIENTE');
$$;

create or replace function public.mv_actividad_fecha_sheet(v jsonb)
returns date language plpgsql immutable set search_path=public
as $$
declare t text; n numeric; m text[];
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='number' then
    n := (v #>> '{}')::numeric;
    return date '1899-12-30' + floor(n)::integer;
  end if;
  t := trim(v #>> '{}');
  if t='' then return null; end if;
  m := regexp_match(t,'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$');
  if m is not null then return make_date(m[3]::int,m[2]::int,m[1]::int); end if;
  m := regexp_match(t,'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$');
  if m is not null then return make_date(m[1]::int,m[2]::int,m[3]::int); end if;
  return t::date;
exception when others then return null;
end;
$$;

create or replace function public.mv_actividad_hora_sheet(v jsonb)
returns time without time zone language plpgsql immutable set search_path=public
as $$
declare t text; n numeric; segundos integer;
begin
  if v is null or v='null'::jsonb then return null; end if;
  if jsonb_typeof(v)='number' then
    n := (v #>> '{}')::numeric;
    segundos := round((n-floor(n))*86400)::integer % 86400;
    return time '00:00:00' + make_interval(secs => segundos);
  end if;
  t := trim(v #>> '{}');
  if t='' then return null; end if;
  return t::time;
exception when others then return null;
end;
$$;

create or replace function public.mv_actividad_numero(v jsonb)
returns numeric language plpgsql immutable set search_path=public
as $$
declare t text;
begin
  if v is null or v='null'::jsonb then return null; end if;
  t := trim(v #>> '{}');
  if t='' then return null; end if;
  return replace(t,',','.')::numeric;
exception when others then return null;
end;
$$;

create or replace function public.mv_actividad_calcular_puntajes(p_auditoria jsonb)
returns jsonb language plpgsql set search_path=public
as $$
declare
  c jsonb; categoria text; respuesta text; obs text; cid text;
  calidad_cumple int:=0; calidad_aplica int:=0;
  seguridad_cumple int:=0; seguridad_aplica int:=0;
  cliente_cumple int:=0; cliente_aplica int:=0;
  orden_cumple int:=0; orden_aplica int:=0;
  calidad numeric; seguridad numeric; cliente numeric; orden_limpieza numeric; total numeric;
  seguridad_critica boolean:=false; clasificacion text;
begin
  if p_auditoria is null
     or jsonb_typeof(coalesce(p_auditoria->'criterios','null'::jsonb)) <> 'array'
     or jsonb_array_length(p_auditoria->'criterios')=0 then
    raise exception 'Debe completar la lista de verificación de la auditoría';
  end if;

  for c in select value from jsonb_array_elements(p_auditoria->'criterios')
  loop
    categoria := public.mv_actividad_texto(c->>'categoria');
    respuesta := public.mv_actividad_texto(c->>'respuesta');
    if respuesta in ('NO APLICA','NA') then respuesta := 'N/A'; end if;
    obs := trim(coalesce(c->>'observacion',''));
    cid := lower(trim(coalesce(c->>'id','')));

    if categoria not in ('CALIDAD TECNICA','SEGURIDAD','ATENCION AL CLIENTE','ORDEN Y LIMPIEZA') then
      raise exception 'Categoría de auditoría no válida: %', categoria;
    end if;
    if respuesta not in ('CUMPLE','NO CUMPLE','N/A') then
      raise exception 'Respuesta de criterio no válida';
    end if;
    if respuesta='NO CUMPLE' and obs='' then
      raise exception 'Ingrese observación en cada criterio que no cumple';
    end if;

    if respuesta <> 'N/A' then
      if categoria='CALIDAD TECNICA' then
        calidad_aplica:=calidad_aplica+1;
        if respuesta='CUMPLE' then calidad_cumple:=calidad_cumple+1; end if;
      elsif categoria='SEGURIDAD' then
        seguridad_aplica:=seguridad_aplica+1;
        if respuesta='CUMPLE' then seguridad_cumple:=seguridad_cumple+1; end if;
      elsif categoria='ATENCION AL CLIENTE' then
        cliente_aplica:=cliente_aplica+1;
        if respuesta='CUMPLE' then cliente_cumple:=cliente_cumple+1; end if;
      elsif categoria='ORDEN Y LIMPIEZA' then
        orden_aplica:=orden_aplica+1;
        if respuesta='CUMPLE' then orden_cumple:=orden_cumple+1; end if;
      end if;
    end if;

    if categoria='SEGURIDAD' and respuesta='NO CUMPLE' and cid in ('uso_epp','trabajo_seguro') then
      seguridad_critica:=true;
    end if;
  end loop;

  calidad := round(case when calidad_aplica>0 then 40.0*calidad_cumple/calidad_aplica else 40 end,2);
  seguridad := round(case when seguridad_aplica>0 then 20.0*seguridad_cumple/seguridad_aplica else 20 end,2);
  cliente := round(case when cliente_aplica>0 then 20.0*cliente_cumple/cliente_aplica else 20 end,2);
  orden_limpieza := round(case when orden_aplica>0 then 20.0*orden_cumple/orden_aplica else 20 end,2);
  total := round(calidad+seguridad+cliente+orden_limpieza,2);

  clasificacion := case when total>=90 then 'EXCELENTE' when total>=80 then 'CONFORME'
                        when total>=70 then 'OBSERVADO' else 'CRITICO' end;
  if seguridad_critica then clasificacion:='CRITICO'; end if;

  return jsonb_build_object(
    'calidad',calidad,'seguridad',seguridad,'cliente',cliente,'ordenLimpieza',orden_limpieza,
    'total',total,'clasificacion',clasificacion,'seguridadCritica',seguridad_critica
  );
end;
$$;

create or replace view public.mv_actividad_campo_actual
with (security_invoker=true)
as select * from public.actividad_campo_migracion;

revoke all on public.mv_actividad_campo_actual from anon, authenticated;
grant select on public.mv_actividad_campo_actual to service_role;

revoke execute on function public.mv_actividad_texto(text) from public, anon, authenticated;
revoke execute on function public.mv_actividad_tipo_canonico(text) from public, anon, authenticated;
revoke execute on function public.mv_actividad_es_auditoria(text) from public, anon, authenticated;
revoke execute on function public.mv_actividad_fecha_sheet(jsonb) from public, anon, authenticated;
revoke execute on function public.mv_actividad_hora_sheet(jsonb) from public, anon, authenticated;
revoke execute on function public.mv_actividad_numero(jsonb) from public, anon, authenticated;
revoke execute on function public.mv_actividad_calcular_puntajes(jsonb) from public, anon, authenticated;

grant execute on function public.mv_actividad_texto(text) to service_role;
grant execute on function public.mv_actividad_tipo_canonico(text) to service_role;
grant execute on function public.mv_actividad_es_auditoria(text) to service_role;
grant execute on function public.mv_actividad_fecha_sheet(jsonb) to service_role;
grant execute on function public.mv_actividad_hora_sheet(jsonb) to service_role;
grant execute on function public.mv_actividad_numero(jsonb) to service_role;
grant execute on function public.mv_actividad_calcular_puntajes(jsonb) to service_role;
