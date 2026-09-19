
-- 065_programacion_descansos_cache_refresh.sql
-- Refresca cumplimiento Dashboard cuando cambia un estado aprobado/aplicado.

create or replace function public.mv_descansos_refresh_dashboard_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  estado_new text;
  estado_old text;
  requiere boolean:=false;
begin
  estado_new:=replace(upper(trim(coalesce(nullif(new.estado_validacion,''),new.estado_programacion,''))),'_',' ');

  if tg_op='INSERT' then
    requiere:=estado_new in ('APROBADO','APLICADO');
  elsif tg_op='UPDATE' then
    estado_old:=replace(upper(trim(coalesce(nullif(old.estado_validacion,''),old.estado_programacion,''))),'_',' ');
    requiere:=
      estado_new in ('APROBADO','APLICADO')
      and (
        estado_old not in ('APROBADO','APLICADO')
        or old.estado_dia is distinct from new.estado_dia
        or old.estado_nuevo is distinct from new.estado_nuevo
        or old.fecha is distinct from new.fecha
      );
  end if;

  if requiere then
    perform public.mv_dashboard_refrescar_cumplimiento_cache(new.periodo);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_descansos_refresh_dashboard on public.programacion_descansos_migracion;
create trigger trg_descansos_refresh_dashboard
after insert or update on public.programacion_descansos_migracion
for each row execute function public.mv_descansos_refresh_dashboard_trigger();

revoke execute on function public.mv_descansos_refresh_dashboard_trigger() from public,anon,authenticated;
grant execute on function public.mv_descansos_refresh_dashboard_trigger() to service_role;
