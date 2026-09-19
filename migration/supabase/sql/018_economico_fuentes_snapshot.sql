-- MI VISUAL - Analisis Economico: fuentes snapshot de migracion
-- Copia historica de solo lectura desde Google Sheets. No modifica productivo.

begin;

create table if not exists public.economico_materiales_snapshot (
  source_row integer primary key,
  fecha date,
  mes text,
  sede text,
  plataforma text,
  cuadrilla text,
  tecnico text,
  tipo_trabajo text,
  finalizadas numeric(12,3),
  material text,
  cantidad numeric(14,3),
  precio_unitario numeric(14,4),
  costo_total numeric(14,4),
  promedio_x_finalizada numeric(14,4),
  usuario_importacion text,
  fecha_importacion timestamp without time zone,
  lote_importacion text,
  imported_at timestamptz not null default now()
);

create table if not exists public.economico_gastos_snapshot (
  source_row integer primary key,
  id text,
  periodo text,
  fecha_carga timestamp without time zone,
  sede text,
  cuadrilla text,
  concepto text,
  monto numeric(14,2),
  filas_origen numeric(12,3),
  observacion text,
  usuario_carga text,
  lote text,
  imported_at timestamptz not null default now()
);

create table if not exists public.economico_tarifario_pdg_snapshot (
  source_row integer primary key,
  codigo_partida text,
  tipo_servicio text,
  nombre_partida text,
  tarifa_1_60 numeric(14,2),
  tarifa_61_mas numeric(14,2),
  estado text,
  imported_at timestamptz not null default now()
);

create table if not exists public.economico_observaciones_snapshot (
  source_row integer primary key,
  id text,
  fecha_registro timestamp without time zone,
  periodo_texto text,
  registrado_por text,
  perfil_registro text,
  sede text,
  plataforma text,
  supervisor text,
  cuadrilla text,
  fuente text,
  codigo_ticket text,
  tipo_observacion text,
  descripcion text,
  estado text,
  monto numeric(14,2),
  fecha_descargo timestamp without time zone,
  descargo_tecnico text,
  evidencia_tecnico text,
  fecha_revision timestamp without time zone,
  plazo timestamp without time zone,
  imported_at timestamptz not null default now()
);

create table if not exists public.economico_catalogo_materiales_snapshot (
  source_row integer primary key,
  material text,
  precio_unitario numeric(14,4),
  estado text,
  observacion text,
  imported_at timestamptz not null default now()
);

create index if not exists eco_materiales_periodo_cuadrilla_idx
  on public.economico_materiales_snapshot(fecha,cuadrilla);
create index if not exists eco_gastos_periodo_cuadrilla_idx
  on public.economico_gastos_snapshot(periodo,cuadrilla);
create index if not exists eco_obs_estado_fuente_idx
  on public.economico_observaciones_snapshot(fuente,estado,fecha_registro);
create index if not exists eco_tarifario_pdg_codigo_idx
  on public.economico_tarifario_pdg_snapshot(codigo_partida);

alter table public.economico_materiales_snapshot enable row level security;
alter table public.economico_gastos_snapshot enable row level security;
alter table public.economico_tarifario_pdg_snapshot enable row level security;
alter table public.economico_observaciones_snapshot enable row level security;
alter table public.economico_catalogo_materiales_snapshot enable row level security;

revoke all on table public.economico_materiales_snapshot from anon,authenticated;
revoke all on table public.economico_gastos_snapshot from anon,authenticated;
revoke all on table public.economico_tarifario_pdg_snapshot from anon,authenticated;
revoke all on table public.economico_observaciones_snapshot from anon,authenticated;
revoke all on table public.economico_catalogo_materiales_snapshot from anon,authenticated;

commit;
