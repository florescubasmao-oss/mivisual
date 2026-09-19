create table public.biblioteca_catalogo_migracion (
 source_row integer primary key check(source_row>1),
 id_legacy text not null,
 nombre text not null default '',
 link text not null default '',
 source_kind text not null default 'LEGACY_SNAPSHOT' check(source_kind in ('LEGACY_SNAPSHOT','POSTGRESQL_PILOT')),
 updated_at timestamptz not null default now()
);
alter table public.biblioteca_catalogo_migracion enable row level security;
revoke all on public.biblioteca_catalogo_migracion from public, anon, authenticated;
grant select on public.biblioteca_catalogo_migracion to service_role;
comment on table public.biblioteca_catalogo_migracion is 'Catalogo piloto BIBLIOTECA. Documentos permanecen en Drive; consulta autorizada por biblioteca-pilot. Sin cutover.';
