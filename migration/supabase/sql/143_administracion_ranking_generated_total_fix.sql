-- 143_administracion_ranking_generated_total_fix.sql
-- Corrige escritura de total_pct: es columna generada.

create or replace function public.mv_admin_guardar_ranking_config(
  p_usuario text,
  p_periodo text,
  p_produccion numeric,
  p_efectividad numeric,
  p_sla numeric,
  p_observaciones numeric,
  p_recableado numeric,
  p_vtrgar numeric
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  ctx jsonb;
  v_total numeric;
  old jsonb;
  nuevo jsonb;
  v_cache integer;
begin
  ctx:=public.mv_admin_contexto(p_usuario);

  if p_periodo !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then
    raise exception 'Periodo inválido';
  end if;
  if p_periodo<'2026-09' then
    raise exception 'Periodo histórico protegido';
  end if;

  if least(p_produccion,p_efectividad,p_sla,p_observaciones,p_recableado,p_vtrgar)<0
     or greatest(p_produccion,p_efectividad,p_sla,p_observaciones,p_recableado,p_vtrgar)>100 then
    raise exception 'Cada peso debe estar entre 0 y 100';
  end if;

  v_total:=round(p_produccion+p_efectividad+p_sla+p_observaciones+p_recableado+p_vtrgar,4);
  if v_total<>100 then raise exception 'Los pesos deben sumar 100. Total: %',v_total; end if;

  select to_jsonb(x) into old
  from public.ranking_configuracion_motor x
  where periodo=p_periodo;

  insert into public.ranking_configuracion_motor(
    periodo,produccion_pct,efectividad_pct,sla_pct,observaciones_pct,recableado_pct,vtrgar_pct,
    estado,origen,actualizado_por,actualizado_at
  ) values (
    p_periodo,p_produccion,p_efectividad,p_sla,p_observaciones,p_recableado,p_vtrgar,
    'ACTIVO','ADMINISTRACION_MIGRADA',ctx->>'usuario',now()
  )
  on conflict(periodo) do update set
    produccion_pct=excluded.produccion_pct,
    efectividad_pct=excluded.efectividad_pct,
    sla_pct=excluded.sla_pct,
    observaciones_pct=excluded.observaciones_pct,
    recableado_pct=excluded.recableado_pct,
    vtrgar_pct=excluded.vtrgar_pct,
    estado='ACTIVO',
    origen='ADMINISTRACION_MIGRADA',
    actualizado_por=excluded.actualizado_por,
    actualizado_at=now();

  perform public.mv_dashboard_refrescar_ranking_cache(p_periodo);

  select count(*) into v_cache
  from public.dashboard_ranking_cache
  where periodo=p_periodo;

  select to_jsonb(x) into nuevo
  from public.ranking_configuracion_motor x
  where periodo=p_periodo;

  insert into public.administracion_eventos_migracion(
    actor_usuario,actor_perfil,evento,entidad,entidad_id,estado_anterior,estado_nuevo
  ) values (
    ctx->>'usuario',ctx->>'perfil','ACTUALIZAR_RANKING','RANKING_CONFIGURACION',
    p_periodo,old,nuevo
  );

  return jsonb_build_object(
    'ok',true,'accion','ACTUALIZAR_RANKING','periodo',p_periodo,
    'configuracion',nuevo,'cacheRegistros',v_cache
  );
end $$;

revoke all on function public.mv_admin_guardar_ranking_config(text,text,numeric,numeric,numeric,numeric,numeric,numeric)
from public,anon,authenticated;
grant execute on function public.mv_admin_guardar_ranking_config(text,text,numeric,numeric,numeric,numeric,numeric,numeric)
to service_role;
