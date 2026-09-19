
-- 059_programacion_descansos_regex_cuadrillas.sql
-- PostgreSQL POSIX no interpreta \b como límite de palabra igual que JavaScript.

create or replace view public.mv_descansos_cuadrillas_activas
with (security_invoker=true) as
with ultimo as (
  select distinct on (public.mv_descansos_cuadrilla_norm(cuadrilla))
    id,
    public.mv_descansos_cuadrilla_norm(cuadrilla) as cuadrilla,
    upper(trim(coalesce(sede,''))) as sede,
    public.mv_descansos_plataforma(plataforma) as plataforma,
    upper(trim(coalesce(perfil,''))) as perfil,
    upper(trim(coalesce(estado,'ACTIVO'))) as estado,
    upper(trim(coalesce(usuario,''))) as usuario,
    upper(trim(coalesce(usuario_supervisor,''))) as supervisor,
    nombres_apellidos
  from public.app_users
  where nullif(public.mv_descansos_cuadrilla_norm(cuadrilla),'') is not null
  order by public.mv_descansos_cuadrilla_norm(cuadrilla),id desc
)
select
  cuadrilla,sede,plataforma,supervisor,usuario,nombres_apellidos
from ultimo
where estado='ACTIVO'
  and perfil='TECNICO'
  and cuadrilla ~* '^P[0-9]+([[:space:]]|$)'
  and sede<>'' and sede<>'TODAS';

revoke all on public.mv_descansos_cuadrillas_activas from anon,authenticated;
grant select on public.mv_descansos_cuadrillas_activas to service_role;
