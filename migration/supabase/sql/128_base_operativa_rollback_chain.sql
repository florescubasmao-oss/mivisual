-- 128_base_operativa_rollback_chain.sql
-- Conserva cadena de versiones en rollback y marca estados de run.

create or replace function public.mv_base_operativa_rollback_migracion(
  p_periodo text,
  p_actor text,
  p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  a public.base_operativa_migracion_activa%rowtype;
  v_target uuid;
  v_target_previous uuid;
begin
  if coalesce(trim(p_confirmacion),'') <> 'ROLLBACK_BASE_OPERATIVA_MIGRACION' then
    raise exception 'Confirmación explícita inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_BASE_OPERATIVA_APPLY'));

  select * into a
  from public.base_operativa_migracion_activa
  where periodo=p_periodo
  for update;

  if not found then
    raise exception 'No existe Base Operativa migrada activa para %',p_periodo;
  end if;

  if exists(
    select 1 from public.produccion_periodos
    where periodo=p_periodo and protegido
  ) then
    raise exception 'El período % está protegido',p_periodo;
  end if;

  v_target:=a.previous_run_id;

  if v_target is not null then
    select h.previous_run_id
    into v_target_previous
    from public.base_operativa_migracion_historial h
    where h.periodo=p_periodo
      and h.accion='APPLY'
      and h.run_id=v_target
    order by h.created_at desc,h.id desc
    limit 1;
  end if;

  insert into public.base_operativa_migracion_historial(
    periodo,run_id,previous_run_id,accion,actor,detalle
  ) values (
    p_periodo,a.run_id,v_target,'ROLLBACK',p_actor,
    jsonb_build_object(
      'runDesactivado',a.run_id,
      'runRestaurado',v_target,
      'previousDelRestaurado',v_target_previous
    )
  );

  update public.migration_sync_runs
  set status='ROLLED_BACK',
      notes='Base Operativa migrada revertida. La versión permanece almacenada para auditoría.'
  where id=a.run_id;

  if v_target is null then
    delete from public.base_operativa_migracion_activa
    where periodo=p_periodo;
  else
    update public.base_operativa_migracion_activa
    set run_id=v_target,
        previous_run_id=v_target_previous,
        activated_by=p_actor,
        activated_at=now()
    where periodo=p_periodo;

    update public.migration_sync_runs
    set status='APPLIED',
        notes='Base Operativa migrada restaurada por rollback de una versión posterior.'
    where id=v_target;
  end if;

  return jsonb_build_object(
    'ok',true,
    'modulo','BASE_OPERATIVA',
    'accion','ROLLBACK_MIGRACION',
    'periodo',p_periodo,
    'runDesactivado',a.run_id,
    'runRestaurado',v_target,
    'previousDelRestaurado',v_target_previous,
    'fallbackLegacy',v_target is null,
    'impactoProductivo',false,
    'mensaje','Rollback de la capa migrada completado. Producción legacy y ordenes no fueron modificadas.'
  );
end $$;

revoke all on function public.mv_base_operativa_rollback_migracion(text,text,text)
from public,anon,authenticated;
grant execute on function public.mv_base_operativa_rollback_migracion(text,text,text)
to service_role;
