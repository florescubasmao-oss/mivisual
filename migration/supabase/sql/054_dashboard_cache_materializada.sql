
-- 054_dashboard_cache_materializada.sql
-- Cache operacional para evitar recomputar todas las vistas en cada carga del Dashboard.

create table if not exists public.dashboard_ranking_cache (
  periodo text not null,
  cuadrilla text not null,
  sede text,
  plataforma text,
  produccion numeric,
  efectividad numeric,
  recableado numeric,
  vtrgar numeric,
  observaciones integer,
  monto_total_obs numeric,
  monto_afectado_obs numeric,
  sla_bruto numeric,
  sla_ajustado numeric,
  sla_evaluables integer,
  sla_fuera integer,
  sla_excepciones_aprobadas integer,
  puntaje_final numeric,
  puesto_region integer,
  puesto_sede integer,
  puesto_plataforma integer,
  pesos_ranking jsonb,
  aporte_produccion numeric,
  aporte_efectividad numeric,
  aporte_sla numeric,
  aporte_observaciones numeric,
  aporte_recableado numeric,
  aporte_vtrgar numeric,
  produccion_ordenes integer,
  actualizado_at timestamptz not null default now(),
  primary key(periodo,cuadrilla)
);

create table if not exists public.dashboard_cumplimiento_cache (
  periodo text not null,
  cuadrilla text not null,
  fecha_corte date,
  meta_diaria numeric,
  dias_campo integer,
  dias_descanso integer,
  dias_vacaciones integer,
  dias_bolsa integer,
  dias_sin_programacion integer,
  meta_acumulada numeric,
  actualizado_at timestamptz not null default now(),
  primary key(periodo,cuadrilla)
);

alter table public.dashboard_ranking_cache enable row level security;
alter table public.dashboard_cumplimiento_cache enable row level security;

revoke all on public.dashboard_ranking_cache from anon,authenticated;
revoke all on public.dashboard_cumplimiento_cache from anon,authenticated;
grant select on public.dashboard_ranking_cache to service_role;
grant select on public.dashboard_cumplimiento_cache to service_role;

create or replace function public.mv_dashboard_refrescar_ranking_cache(p_periodo text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_filas integer;
begin
  if p_periodo is null then
    delete from public.dashboard_ranking_cache
    where periodo in (
      select periodo from public.ranking_configuracion_motor where upper(estado)='ACTIVO'
    );

    insert into public.dashboard_ranking_cache(
      periodo,cuadrilla,sede,plataforma,produccion,efectividad,recableado,vtrgar,
      observaciones,monto_total_obs,monto_afectado_obs,sla_bruto,sla_ajustado,
      sla_evaluables,sla_fuera,sla_excepciones_aprobadas,puntaje_final,
      puesto_region,puesto_sede,puesto_plataforma,pesos_ranking,
      aporte_produccion,aporte_efectividad,aporte_sla,aporte_observaciones,aporte_recableado,aporte_vtrgar,
      produccion_ordenes,actualizado_at
    )
    select
      r.periodo,r.cuadrilla,r.sede,r.plataforma,
      round(r.produccion,2),
      round(case when abs(r.efectividad)<=1 then r.efectividad*100 else r.efectividad end,2),
      round(case when abs(r.recableado)<=1 then r.recableado*100 else r.recableado end,2),
      round(case when abs(r.vtrgar)<=1 then r.vtrgar*100 else r.vtrgar end,2),
      r.observaciones,round(r.monto_total,2),round(r.monto_afectado,2),
      round(r.sla_bruto,2),round(r.sla_ajustado,2),
      r.sla_evaluables,r.sla_fuera,r.sla_excepciones_aprobadas,
      r.puntaje_final,r.puesto_region,r.puesto_sede,r.puesto_plataforma,r.pesos_json,
      round(r.score_produccion*r.produccion_pct/100,4),
      round(r.score_efectividad*r.efectividad_pct/100,4),
      round(r.score_sla*r.sla_pct/100,4),
      round(r.score_observaciones*r.observaciones_pct/100,4),
      round(r.score_recableado*r.recableado_pct/100,4),
      round(r.score_vtrgar*r.vtrgar_pct/100,4),
      r.produccion_ordenes,now()
    from public.mv_ranking_motor_migracion r;
  else
    delete from public.dashboard_ranking_cache where periodo=p_periodo;

    insert into public.dashboard_ranking_cache(
      periodo,cuadrilla,sede,plataforma,produccion,efectividad,recableado,vtrgar,
      observaciones,monto_total_obs,monto_afectado_obs,sla_bruto,sla_ajustado,
      sla_evaluables,sla_fuera,sla_excepciones_aprobadas,puntaje_final,
      puesto_region,puesto_sede,puesto_plataforma,pesos_ranking,
      aporte_produccion,aporte_efectividad,aporte_sla,aporte_observaciones,aporte_recableado,aporte_vtrgar,
      produccion_ordenes,actualizado_at
    )
    select
      r.periodo,r.cuadrilla,r.sede,r.plataforma,
      round(r.produccion,2),
      round(case when abs(r.efectividad)<=1 then r.efectividad*100 else r.efectividad end,2),
      round(case when abs(r.recableado)<=1 then r.recableado*100 else r.recableado end,2),
      round(case when abs(r.vtrgar)<=1 then r.vtrgar*100 else r.vtrgar end,2),
      r.observaciones,round(r.monto_total,2),round(r.monto_afectado,2),
      round(r.sla_bruto,2),round(r.sla_ajustado,2),
      r.sla_evaluables,r.sla_fuera,r.sla_excepciones_aprobadas,
      r.puntaje_final,r.puesto_region,r.puesto_sede,r.puesto_plataforma,r.pesos_json,
      round(r.score_produccion*r.produccion_pct/100,4),
      round(r.score_efectividad*r.efectividad_pct/100,4),
      round(r.score_sla*r.sla_pct/100,4),
      round(r.score_observaciones*r.observaciones_pct/100,4),
      round(r.score_recableado*r.recableado_pct/100,4),
      round(r.score_vtrgar*r.vtrgar_pct/100,4),
      r.produccion_ordenes,now()
    from public.mv_ranking_motor_migracion r
    where r.periodo=p_periodo;
  end if;

  get diagnostics v_filas = row_count;
  return jsonb_build_object('ok',true,'cache','RANKING','periodo',p_periodo,'filas',v_filas);
end;
$$;

create or replace function public.mv_dashboard_refrescar_cumplimiento_cache(p_periodo text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_filas integer;
begin
  if p_periodo is null then
    truncate table public.dashboard_cumplimiento_cache;
    insert into public.dashboard_cumplimiento_cache(
      periodo,cuadrilla,fecha_corte,meta_diaria,dias_campo,dias_descanso,dias_vacaciones,dias_bolsa,
      dias_sin_programacion,meta_acumulada,actualizado_at
    )
    select periodo,cuadrilla,fecha_corte,meta_diaria,dias_campo,dias_descanso,dias_vacaciones,dias_bolsa,
           dias_sin_programacion,meta_acumulada,now()
    from public.mv_dashboard_cumplimiento_diario;
  else
    delete from public.dashboard_cumplimiento_cache where periodo=p_periodo;
    insert into public.dashboard_cumplimiento_cache(
      periodo,cuadrilla,fecha_corte,meta_diaria,dias_campo,dias_descanso,dias_vacaciones,dias_bolsa,
      dias_sin_programacion,meta_acumulada,actualizado_at
    )
    select periodo,cuadrilla,fecha_corte,meta_diaria,dias_campo,dias_descanso,dias_vacaciones,dias_bolsa,
           dias_sin_programacion,meta_acumulada,now()
    from public.mv_dashboard_cumplimiento_diario
    where periodo=p_periodo;
  end if;

  get diagnostics v_filas = row_count;
  return jsonb_build_object('ok',true,'cache','CUMPLIMIENTO','periodo',p_periodo,'filas',v_filas);
end;
$$;

revoke execute on function public.mv_dashboard_refrescar_ranking_cache(text) from public,anon,authenticated;
revoke execute on function public.mv_dashboard_refrescar_cumplimiento_cache(text) from public,anon,authenticated;
grant execute on function public.mv_dashboard_refrescar_ranking_cache(text) to service_role;
grant execute on function public.mv_dashboard_refrescar_cumplimiento_cache(text) to service_role;
