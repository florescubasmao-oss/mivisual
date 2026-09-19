
-- 104_continuidad_v496_normalizacion_cuadrilla.sql
-- V496 usa normalizarCuadrilla antes de consolidar. En PostgreSQL se replica con
-- mv_observaciones_cuadrilla_norm para evitar claves duplicadas como "P 8" vs "P8".

create or replace function public.mv_continuidad_cuadrilla(
  p_periodo text,
  p_cuadrilla text
)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  actual text := public.mv_observaciones_cuadrilla_norm(trim(coalesce(p_cuadrilla,'')));
  siguiente text;
  clave text;
  vistos text[] := array[]::text[];
  i integer;
begin
  if actual='' then return ''; end if;
  if coalesce(p_periodo,'') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then return actual; end if;

  for i in 1..50 loop
    clave := public.mv_norm_key(actual);
    if clave = any(vistos) then
      return actual;
    end if;
    vistos := array_append(vistos,clave);

    select public.mv_observaciones_cuadrilla_norm(c.cuadrilla_nueva)
      into siguiente
    from public.continuidad_cuadrillas_migracion c
    where upper(trim(c.estado))='ACTIVO'
      and to_char(c.fecha_efectiva,'YYYY-MM') <= p_periodo
      and public.mv_norm_key(c.cuadrilla_anterior)=clave
    order by c.source_row asc nulls last,c.fecha_registro asc,c.id asc
    limit 1;

    if siguiente is null or trim(siguiente)='' then
      return actual;
    end if;

    actual := siguiente;
  end loop;

  return actual;
end;
$$;

revoke execute on function public.mv_continuidad_cuadrilla(text,text) from public,anon,authenticated;
grant execute on function public.mv_continuidad_cuadrilla(text,text) to service_role;
