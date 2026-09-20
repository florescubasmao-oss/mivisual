create table public.capacitacion_catalogo_migracion (
 source_row integer primary key check(source_row>1),
 id_legacy text not null,
 nombre text not null default '',
 tipo text not null default '',
 link text not null default '',
 source_kind text not null default 'LEGACY_SNAPSHOT' check(source_kind in ('LEGACY_SNAPSHOT','POSTGRESQL_PILOT')),
 updated_at timestamptz not null default now()
);
alter table public.capacitacion_catalogo_migracion enable row level security;
revoke all on public.capacitacion_catalogo_migracion from public, anon, authenticated;
grant select on public.capacitacion_catalogo_migracion to service_role;
comment on table public.capacitacion_catalogo_migracion is 'Catalogo piloto CAPACITACION; documentos en Drive. Mis Funciones V467/V468/V473/V474 conserva resultados locales no persistidos. Sin cutover.';
