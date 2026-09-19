-- 039_ranking_cuadrilla_canonica.sql
-- Normaliza P 8 -> P8 solo en la clave de emparejamiento de app_users.
create or replace view public.mv_ranking_cuadrilla_meta
with (security_invoker=true) as
with base as (
  select case when left(trim(cuadrilla),2)='P ' then 'P'||substring(trim(cuadrilla) from 3) else trim(cuadrilla) end cuadrilla_canonica,
         usuario,sede,plataforma,estado
  from public.app_users
  where nullif(trim(cuadrilla),'') is not null and upper(trim(cuadrilla))<>'TODAS'
)
select cuadrilla_canonica cuadrilla,
  max(nullif(trim(usuario),'')) usuario,
  max(nullif(upper(trim(sede)),'')) filter (where upper(trim(coalesce(sede,'')))<>'TODAS') sede,
  max(nullif(upper(trim(plataforma)),'')) filter (where upper(trim(coalesce(plataforma,'')))<>'TODAS') plataforma,
  bool_or(upper(trim(coalesce(estado,'')))='ACTIVO') tiene_usuario_activo
from base group by cuadrilla_canonica;
revoke all on public.mv_ranking_cuadrilla_meta from anon,authenticated;
grant select on public.mv_ranking_cuadrilla_meta to service_role;
