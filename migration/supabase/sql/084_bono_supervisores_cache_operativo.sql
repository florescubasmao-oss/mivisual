
-- 084_bono_supervisores_cache_operativo.sql
-- Cache mensual por cuadrilla con las bases que Bonos Supervisores necesita.
-- Evita recalcular seis vistas pesadas por cada supervisor.

create table if not exists public.bono_supervisores_operativo_cache (
  periodo text not null,
  cuadrilla text not null,

  produccion numeric(12,2) not null default 0,
  produccion_ordenes integer not null default 0,

  finalizadas integer not null default 0,
  total_gestionadas integer not null default 0,
  efectividad_pct numeric(10,4),

  rojo_asignadas integer not null default 0,
  recableados integer not null default 0,
  recableado_pct numeric(10,4),

  total_gar_vtr integer not null default 0,
  finalizadas_vtr integer not null default 0,
  vtrgar_pct numeric(10,4),

  observaciones_win integer not null default 0,
  observaciones_win_penalizadas integer not null default 0,
  monto_penalizado_win numeric(14,2) not null default 0,

  sla_total_finalizadas integer not null default 0,
  sla_evaluables integer not null default 0,
  sla_cumplen_bruto integer not null default 0,
  sla_cumplen_ajustado integer not null default 0,
  sla_sin_tiempos integer not null default 0,
  sla_sin_partida integer not null default 0,
  sla_sin_parametro integer not null default 0,
  sla_instalaciones_total integer not null default 0,
  sla_instalaciones_cumplen_ajustado integer not null default 0,
  sla_visitas_total integer not null default 0,
  sla_visitas_cumplen_ajustado integer not null default 0,
  sla_excepciones_aprobadas integer not null default 0,
  sla_excepciones_pendientes integer not null default 0,
  sla_excepciones_rechazadas integer not null default 0,
  sla_bruto numeric(10,4),
  sla_ajustado numeric(10,4),
  sla_detalle jsonb not null default '[]'::jsonb,

  source_updated_at timestamptz,
  refreshed_at timestamptz not null default now(),

  primary key(periodo,cuadrilla)
);

create index if not exists idx_bono_sup_operativo_periodo
  on public.bono_supervisores_operativo_cache(periodo);

alter table public.bono_supervisores_operativo_cache enable row level security;
revoke all on public.bono_supervisores_operativo_cache from anon,authenticated;
grant select,insert,update,delete on public.bono_supervisores_operativo_cache to service_role;

create or replace function public.mv_bono_sup_refrescar_operativo(p_periodo text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p text:=public.mv_bono_sup_periodo(p_periodo);
  n integer:=0;
  t0 timestamptz:=clock_timestamp();
begin
  if p='' then
    p:=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM');
  end if;

  delete from public.bono_supervisores_operativo_cache where periodo=p;

  insert into public.bono_supervisores_operativo_cache(
    periodo,cuadrilla,
    produccion,produccion_ordenes,
    finalizadas,total_gestionadas,efectividad_pct,
    rojo_asignadas,recableados,recableado_pct,
    total_gar_vtr,finalizadas_vtr,vtrgar_pct,
    observaciones_win,observaciones_win_penalizadas,monto_penalizado_win,
    sla_total_finalizadas,sla_evaluables,sla_cumplen_bruto,sla_cumplen_ajustado,
    sla_sin_tiempos,sla_sin_partida,sla_sin_parametro,
    sla_instalaciones_total,sla_instalaciones_cumplen_ajustado,
    sla_visitas_total,sla_visitas_cumplen_ajustado,
    sla_excepciones_aprobadas,sla_excepciones_pendientes,sla_excepciones_rechazadas,
    sla_bruto,sla_ajustado,sla_detalle,
    source_updated_at,refreshed_at
  )
  with universo as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla
      from public.mv_dashboard_produccion_detalle where periodo=p
    union
    select public.mv_actividad_cuadrilla_norm(cuadrilla)
      from public.mv_dashboard_efectividad_detalle where periodo=p
    union
    select public.mv_actividad_cuadrilla_norm(cuadrilla)
      from public.mv_dashboard_recableado_detalle where periodo=p
    union
    select public.mv_actividad_cuadrilla_norm(cuadrilla)
      from public.mv_dashboard_vtrgar_detalle where periodo=p
    union
    select public.mv_actividad_cuadrilla_norm(cuadrilla)
      from public.mv_dashboard_observaciones_detalle where periodo=p
    union
    select public.mv_actividad_cuadrilla_norm(cuadrilla)
      from public.mv_dashboard_sla_detalle where periodo=p
  ),
  prod as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla,
           sum(total_puntos)::numeric produccion,
           sum(total_ordenes)::int produccion_ordenes
    from public.mv_dashboard_produccion_detalle
    where periodo=p
    group by 1
  ),
  efec as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla,
           sum(finalizada)::int finalizadas,
           sum(total_general)::int total_gestionadas,
           case when sum(total_general)>0
                then round(sum(finalizada)::numeric/sum(total_general)*100,4)
                else max(efectividad_pct) end efectividad_pct,
           max(actualizacion) actualizacion
    from public.mv_dashboard_efectividad_detalle
    where periodo=p
    group by 1
  ),
  rec as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla,
           sum(los_rojo_asignadas)::int rojo_asignadas,
           sum(recableados)::int recableados,
           case when sum(los_rojo_asignadas)>0
                then round(sum(recableados)::numeric/sum(los_rojo_asignadas)*100,4)
                else max(porcentaje_pct) end recableado_pct,
           max(actualizacion) actualizacion
    from public.mv_dashboard_recableado_detalle
    where periodo=p
    group by 1
  ),
  vg as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla,
           sum(total_gar_vtr)::int total_gar_vtr,
           sum(total_finalizadas)::int finalizadas_vtr,
           case when sum(total_finalizadas)>0
                then round(sum(total_gar_vtr)::numeric/sum(total_finalizadas)*100,4)
                else max(porcentaje_pct) end vtrgar_pct,
           max(actualizacion) actualizacion
    from public.mv_dashboard_vtrgar_detalle
    where periodo=p
    group by 1
  ),
  obs as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla,
           sum(win_total)::int observaciones_win,
           sum(win_penalizadas)::int observaciones_win_penalizadas,
           sum(win_monto_penalizado)::numeric monto_penalizado_win
    from public.mv_dashboard_observaciones_detalle
    where periodo=p
    group by 1
  ),
  sla as (
    select public.mv_actividad_cuadrilla_norm(cuadrilla) cuadrilla,
           sum(total_finalizadas)::int sla_total_finalizadas,
           sum(evaluables)::int sla_evaluables,
           sum(cumplen_bruto)::int sla_cumplen_bruto,
           sum(cumplen_ajustado)::int sla_cumplen_ajustado,
           sum(sin_tiempos)::int sla_sin_tiempos,
           sum(sin_partida)::int sla_sin_partida,
           sum(sin_parametro)::int sla_sin_parametro,
           sum(instalaciones_total)::int sla_instalaciones_total,
           sum(instalaciones_cumplen_ajustado)::int sla_instalaciones_cumplen_ajustado,
           sum(visitas_tecnicas_total)::int sla_visitas_total,
           sum(visitas_tecnicas_cumplen_ajustado)::int sla_visitas_cumplen_ajustado,
           sum(excepciones_aprobadas)::int sla_excepciones_aprobadas,
           sum(excepciones_pendientes)::int sla_excepciones_pendientes,
           sum(excepciones_rechazadas)::int sla_excepciones_rechazadas,
           case when sum(evaluables)>0
                then round(sum(cumplen_bruto)::numeric/sum(evaluables)*100,4)
                else max(sla_bruto) end sla_bruto,
           case when sum(evaluables)>0
                then round(sum(cumplen_ajustado)::numeric/sum(evaluables)*100,4)
                else max(sla_ajustado) end sla_ajustado,
           coalesce(jsonb_agg(detalle) filter(where detalle is not null),'[]'::jsonb) detalle
    from public.mv_dashboard_sla_detalle
    where periodo=p
    group by 1
  )
  select
    p,
    u.cuadrilla,
    coalesce(pr.produccion,0),
    coalesce(pr.produccion_ordenes,0),
    coalesce(e.finalizadas,0),
    coalesce(e.total_gestionadas,0),
    e.efectividad_pct,
    coalesce(r.rojo_asignadas,0),
    coalesce(r.recableados,0),
    r.recableado_pct,
    coalesce(v.total_gar_vtr,0),
    coalesce(v.finalizadas_vtr,0),
    v.vtrgar_pct,
    coalesce(o.observaciones_win,0),
    coalesce(o.observaciones_win_penalizadas,0),
    coalesce(o.monto_penalizado_win,0),
    coalesce(s.sla_total_finalizadas,0),
    coalesce(s.sla_evaluables,0),
    coalesce(s.sla_cumplen_bruto,0),
    coalesce(s.sla_cumplen_ajustado,0),
    coalesce(s.sla_sin_tiempos,0),
    coalesce(s.sla_sin_partida,0),
    coalesce(s.sla_sin_parametro,0),
    coalesce(s.sla_instalaciones_total,0),
    coalesce(s.sla_instalaciones_cumplen_ajustado,0),
    coalesce(s.sla_visitas_total,0),
    coalesce(s.sla_visitas_cumplen_ajustado,0),
    coalesce(s.sla_excepciones_aprobadas,0),
    coalesce(s.sla_excepciones_pendientes,0),
    coalesce(s.sla_excepciones_rechazadas,0),
    s.sla_bruto,
    s.sla_ajustado,
    coalesce(s.detalle,'[]'::jsonb),
    greatest(e.actualizacion,r.actualizacion,v.actualizacion)::timestamptz,
    now()
  from universo u
  left join prod pr on pr.cuadrilla=u.cuadrilla
  left join efec e on e.cuadrilla=u.cuadrilla
  left join rec r on r.cuadrilla=u.cuadrilla
  left join vg v on v.cuadrilla=u.cuadrilla
  left join obs o on o.cuadrilla=u.cuadrilla
  left join sla s on s.cuadrilla=u.cuadrilla;

  get diagnostics n=row_count;

  perform public.mv_bono_sup_marcar_cache_dirty(p,null);

  return jsonb_build_object(
    'ok',true,
    'periodo',p,
    'registros',n,
    'duracionMs',round(extract(epoch from (clock_timestamp()-t0))*1000),
    'refreshedAt',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS')
  );
end;
$$;

revoke execute on function public.mv_bono_sup_refrescar_operativo(text) from public,anon,authenticated;
grant execute on function public.mv_bono_sup_refrescar_operativo(text) to service_role;
