-- MI VISUAL - Validacion Tecnica: modelo normalizado de migracion
-- Sin cutover: la hoja productiva sigue siendo la fuente de escritura.

begin;

alter table public.validacion_tecnica_legacy_snapshot
  add column if not exists origen_orden text;

update public.validacion_tecnica_legacy_snapshot
set origen_orden = case
  when upper(trim(coalesce(hora_limite_2,''))) in ('PROPIA','ASIGNADA')
    then upper(trim(hora_limite_2))
  else null
end
where origen_orden is null;

create table if not exists public.validacion_tecnica_migracion (
  id text primary key,
  source_row integer,
  registro_at timestamp without time zone not null,
  sede text,
  tecnico text,
  cuadrilla text,
  tipo_validacion text not null,
  codigo text not null,
  tipo_ticket text,
  numero_ticket text,
  ticket_final text,
  dni_cliente text,
  motivo_tecnico text,
  estado text not null,
  resultado_final text,
  validado_por text,
  perfil_validador text,
  validado_at timestamp without time zone,
  motivo_validacion text,
  link_telegram text,
  hora_limite timestamp without time zone,
  origen_orden text,
  periodo text not null,
  fuente text not null default 'LEGACY_SHEET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vt_tipo_chk check (
    upper(trim(tipo_validacion)) in ('RECABLEADO','GAR','VTR','OTRO')
  ),
  constraint vt_origen_chk check (
    origen_orden is null or upper(trim(origen_orden)) in ('PROPIA','ASIGNADA')
  )
);

create index if not exists vt_migracion_periodo_idx
  on public.validacion_tecnica_migracion(periodo);
create index if not exists vt_migracion_tipo_estado_idx
  on public.validacion_tecnica_migracion(tipo_validacion,estado);
create index if not exists vt_migracion_sede_idx
  on public.validacion_tecnica_migracion(sede);
create index if not exists vt_migracion_cuadrilla_idx
  on public.validacion_tecnica_migracion(cuadrilla);
create index if not exists vt_migracion_codigo_idx
  on public.validacion_tecnica_migracion(codigo);
create index if not exists vt_migracion_ticket_idx
  on public.validacion_tecnica_migracion(ticket_final);

alter table public.validacion_tecnica_migracion enable row level security;
revoke all on table public.validacion_tecnica_migracion from anon,authenticated;

truncate table public.validacion_tecnica_migracion;

insert into public.validacion_tecnica_migracion(
  id,source_row,registro_at,sede,tecnico,cuadrilla,tipo_validacion,codigo,
  tipo_ticket,numero_ticket,ticket_final,dni_cliente,motivo_tecnico,
  estado,resultado_final,validado_por,perfil_validador,validado_at,
  motivo_validacion,link_telegram,hora_limite,origen_orden,periodo,fuente
)
select
  id,
  source_row,
  (fecha_registro::text||' '||coalesce(hora_registro::text,'00:00:00'))::timestamp,
  sede,
  tecnico,
  cuadrilla,
  upper(trim(tipo_validacion)),
  codigo,
  tipo_ticket,
  numero_ticket,
  ticket_final,
  dni_cliente,
  motivo_tecnico,
  upper(trim(estado)),
  nullif(trim(resultado_final),''),
  nullif(trim(validado_por),''),
  nullif(trim(perfil_validador),''),
  case
    when fecha_validacion is not null
      then (fecha_validacion::text||' '||coalesce(hora_validacion::text,'00:00:00'))::timestamp
    else null
  end,
  nullif(trim(motivo_validacion),''),
  nullif(trim(link_telegram),''),
  case
    when nullif(trim(hora_limite_1),'') is null then null
    when trim(hora_limite_1) ~ '^\d{1,2}/\d{1,2}/\d{4}'
      then to_timestamp(trim(hora_limite_1),'DD/MM/YYYY HH24:MI:SS')::timestamp
    else null
  end,
  origen_orden,
  periodo,
  'LEGACY_SHEET'
from public.validacion_tecnica_legacy_snapshot;

create or replace view public.mv_validacion_tecnica_reglas as
select
  v.*,
  case
    when tipo_validacion='RECABLEADO' then true
    else false
  end as permite_auto_15_min,
  case
    when tipo_validacion in ('GAR','VTR') then 'JEFATURA'
    when tipo_validacion in ('RECABLEADO','OTRO') then 'SUPERVISOR_O_JEFATURA'
    else 'NO_DEFINIDO'
  end as perfil_validador_requerido,
  case
    when tipo_validacion in ('GAR','VTR') then 'BONO|NO BONO'
    when tipo_validacion in ('RECABLEADO','OTRO') then 'APROBADO|RECHAZADO|OBSERVADO'
    else ''
  end as resultados_permitidos,
  case
    when tipo_validacion='RECABLEADO' and hora_limite is not null
      then greatest(hora_limite, registro_at + interval '15 minutes')
    when tipo_validacion='RECABLEADO'
      then registro_at + interval '15 minutes'
    else null
  end as hora_limite_efectiva
from public.validacion_tecnica_migracion v;

create or replace view public.mv_validacion_tecnica_resumen as
select
  periodo,
  tipo_validacion,
  estado,
  coalesce(resultado_final,'') as resultado_final,
  count(*)::integer as cantidad
from public.validacion_tecnica_migracion
group by periodo,tipo_validacion,estado,coalesce(resultado_final,'');

commit;
