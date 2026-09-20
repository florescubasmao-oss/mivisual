-- 111_ranking_pesos_por_periodo.sql
-- Corrección 20/09/2026.
-- Regla: los pesos de Ranking son por período; no existe configuración global.
-- Julio/agosto permanecen protegidos y no se recalculan.
-- Septiembre se alinea con CONFIGURACION_RANKING productiva vigente.

do $$
begin
  if not exists (
    select 1
    from public.ranking_configuracion_productiva_snapshot
    where periodo='2026-09'
  ) then
    raise exception 'No existe configuración productiva para 2026-09';
  end if;

  insert into public.ranking_configuracion_motor (
    periodo, produccion_pct, efectividad_pct, sla_pct, observaciones_pct,
    recableado_pct, vtrgar_pct, estado, origen, actualizado_por, actualizado_at
  )
  select
    periodo, produccion_pct, efectividad_pct, sla_pct, observaciones_pct,
    recableado_pct, vtrgar_pct, 'ACTIVO',
    'CONFIGURACION_PRODUCTIVA_POR_PERIODO',
    'CORRECCION MIGRACION 2026-09-20',
    now()
  from public.ranking_configuracion_productiva_snapshot
  where periodo='2026-09'
  on conflict (periodo) do update set
    produccion_pct=excluded.produccion_pct,
    efectividad_pct=excluded.efectividad_pct,
    sla_pct=excluded.sla_pct,
    observaciones_pct=excluded.observaciones_pct,
    recableado_pct=excluded.recableado_pct,
    vtrgar_pct=excluded.vtrgar_pct,
    estado=excluded.estado,
    origen=excluded.origen,
    actualizado_por=excluded.actualizado_por,
    actualizado_at=excluded.actualizado_at;
end $$;

-- El refresco del cache se ejecuta después de aplicar la migración:
-- select public.mv_dashboard_refrescar_ranking_cache('2026-09');
