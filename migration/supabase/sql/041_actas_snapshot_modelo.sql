
-- 041_actas_snapshot_modelo.sql
-- Snapshot fiel de ACTAS_ESCANEADAS + vista normalizada. No altera el Google Sheet ni Drive.

create table if not exists public.actas_legacy_snapshot (
  source_row integer not null,
  id text primary key,
  fecha_registro text,
  hora_registro text,
  sede text,
  cuadrilla text,
  supervisor text,
  tecnico text,
  fecha_gestion text,
  tipo_ejecucion text,
  tipo_partida text,
  codigo_orden text,
  codigo_pedido text,
  numero_acta text,
  dni text,
  cliente text,
  nombre_archivo text,
  link_acta text,
  estado text,
  resultado_almacen text,
  motivo_almacen text,
  validado_almacen_por text,
  fecha_validacion_almacen text,
  hora_validacion_almacen text,
  resultado_jefatura text,
  motivo_jefatura text,
  validado_jefatura_por text,
  fecha_validacion_jefatura text,
  hora_validacion_jefatura text,
  version text,
  estado_entrega_fisica text,
  confirmado_fisico_por text,
  perfil_confirmacion_fisica text,
  fecha_confirmacion_fisica text,
  hora_confirmacion_fisica text,
  motivo_reversion_fisica text,
  origen_registro text,
  motivo_acta_faltante text,
  registrado_faltante_por text,
  fecha_registro_faltante text,
  hora_registro_faltante text,
  estado_fecha_carpeta text,
  fecha_limite_verificacion text,
  ultimo_intento_fecha text,
  intentos_fecha text,
  fecha_carpeta text,
  fecha_confirmada_por text,
  perfil_confirmacion_fecha text,
  origen_fecha_carpeta text,
  imported_at timestamptz not null default now()
);

create index if not exists actas_legacy_codigo_orden_idx on public.actas_legacy_snapshot(codigo_orden);
create index if not exists actas_legacy_codigo_pedido_idx on public.actas_legacy_snapshot(codigo_pedido);
create index if not exists actas_legacy_numero_acta_idx on public.actas_legacy_snapshot(numero_acta);
create index if not exists actas_legacy_cuadrilla_idx on public.actas_legacy_snapshot(cuadrilla);
create index if not exists actas_legacy_estado_idx on public.actas_legacy_snapshot(estado);

create or replace view public.mv_actas_legacy_normalizada
with (security_invoker=true) as
select
  a.*,
  nullif(regexp_replace(trim(coalesce(a.codigo_orden,'')), '^0+$', ''),'') as codigo_orden_norm,
  nullif(trim(a.codigo_pedido),'') as codigo_pedido_norm,
  nullif(trim(a.numero_acta),'') as numero_acta_norm,
  nullif(trim(a.dni),'') as dni_norm,
  case
    when trim(coalesce(a.fecha_gestion,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then (date '1899-12-30' + floor(a.fecha_gestion::numeric)::integer)
    else null
  end as fecha_gestion_date,
  case
    when trim(coalesce(a.fecha_registro,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then (timestamp '1899-12-30'
            + (a.fecha_registro::numeric * interval '1 day')
            + case
                when trim(coalesce(a.hora_registro,'')) ~ '^[0-9]+([.][0-9]+)?$'
                then a.hora_registro::numeric * interval '1 day'
                else interval '0'
              end)
    else null
  end as registrado_at,
  case
    when trim(coalesce(a.fecha_validacion_almacen,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then timestamp '1899-12-30' + a.fecha_validacion_almacen::numeric * interval '1 day'
    else null
  end as validado_almacen_at,
  case
    when trim(coalesce(a.fecha_validacion_jefatura,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then timestamp '1899-12-30' + a.fecha_validacion_jefatura::numeric * interval '1 day'
    else null
  end as validado_jefatura_at,
  case
    when trim(coalesce(a.fecha_confirmacion_fisica,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then timestamp '1899-12-30' + a.fecha_confirmacion_fisica::numeric * interval '1 day'
    else null
  end as confirmado_fisico_at,
  case
    when trim(coalesce(a.fecha_carpeta,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then (date '1899-12-30' + floor(a.fecha_carpeta::numeric)::integer)
    else null
  end as fecha_carpeta_date,
  case
    when trim(coalesce(a.ultimo_intento_fecha,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then timestamp '1899-12-30' + a.ultimo_intento_fecha::numeric * interval '1 day'
    else null
  end as ultimo_intento_fecha_at,
  substring(a.link_acta from '/d/([^/]+)') as drive_file_id
from public.actas_legacy_snapshot a;

alter table public.actas_legacy_snapshot enable row level security;
revoke all on public.actas_legacy_snapshot from anon, authenticated;
revoke all on public.mv_actas_legacy_normalizada from anon, authenticated;
grant select on public.actas_legacy_snapshot to service_role;
grant select on public.mv_actas_legacy_normalizada to service_role;
