
-- 048_ranking_observaciones_motor.sql
-- Ranking deja de leer economico_observaciones_snapshot y consume el motor transaccional.

create or replace view public.mv_ranking_observaciones_migracion
with (security_invoker=true) as
select
  o.periodo,
  public.mv_observaciones_cuadrilla_norm(o.cuadrilla) as cuadrilla,
  count(*)::integer as observaciones,
  round(sum(o.monto),2) as monto_total,
  round(sum(o.monto*public.mv_observaciones_factor_estado(o.estado)),2) as monto_afectado
from public.observaciones_migracion o
where nullif(public.mv_observaciones_cuadrilla_norm(o.cuadrilla),'') is not null
group by o.periodo,public.mv_observaciones_cuadrilla_norm(o.cuadrilla);

revoke all on public.mv_ranking_observaciones_migracion from anon,authenticated;
grant select on public.mv_ranking_observaciones_migracion to service_role;
