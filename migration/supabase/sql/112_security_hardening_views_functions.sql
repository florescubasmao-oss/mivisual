-- 112_security_hardening_views_functions.sql
-- 20/09/2026
-- Endurecimiento transversal sin cambiar lógica de negocio ni datos.
-- 1) Todas las vistas public.* aún SECURITY DEFINER pasan a security_invoker.
-- 2) Funciones public.* sin search_path fijo pasan a public, pg_temp.

do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='v'
      and not (coalesce(c.reloptions,'{}'::text[]) @> array['security_invoker=true'])
  loop
    execute format('alter view public.%I set (security_invoker=true)', r.relname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig,'{}'::text[])) x
        where x like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.signature);
  end loop;
end $$;
