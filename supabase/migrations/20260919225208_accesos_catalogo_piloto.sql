create table public.accesos_catalogo_migracion (
 source_row integer primary key check(source_row>1),
 id_legacy text not null,
 destino text not null default '',
 perfil text not null default '',
 nombre text not null default '',
 link text not null default '',
 source_kind text not null default 'LEGACY_SNAPSHOT' check(source_kind in ('LEGACY_SNAPSHOT','POSTGRESQL_PILOT')),
 updated_at timestamptz not null default now()
);
alter table public.accesos_catalogo_migracion enable row level security;
revoke all on public.accesos_catalogo_migracion from public, anon, authenticated;
grant select on public.accesos_catalogo_migracion to service_role;
comment on table public.accesos_catalogo_migracion is 'Copia piloto de ACCESOS; consulta autenticada mediante accesos-pilot. Sin cutover. Incluye filas sin link para conciliacion.';
