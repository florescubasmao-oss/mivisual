-- 115_security_revoke_direct_public_access.sql
-- 20/09/2026
-- Los pilotos usan Auth + Edge Functions. Se elimina acceso SQL directo
-- heredado para anon/authenticated sobre app_users y vistas public.*.

revoke all on table public.app_users from anon, authenticated;

do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('v','m')
  loop
    execute format('revoke all on table public.%I from anon, authenticated', r.relname);
  end loop;
end $$;

grant select on table public.app_users to service_role;
