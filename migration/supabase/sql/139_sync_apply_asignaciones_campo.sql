-- 139_sync_apply_asignaciones_campo.sql
create or replace function public.mv_sync_apply_asignaciones_campo(
  p_run_id uuid,
  p_actor text,
  p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_run public.migration_sync_runs%rowtype;
  v_invalid integer:=0;
  v_conflicts integer:=0;
  v_applied integer:=0;
  v_total integer:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_ASIGNACIONES_CAMPO_STAGING' then
    raise exception 'Confirmación de aplicación inválida';
  end if;

  select * into v_run
  from public.migration_sync_runs
  where id=p_run_id
  for update;

  if not found then raise exception 'Run de sincronización no existe'; end if;
  if v_run.modulo<>'ASIGNACIONES_CAMPO' then raise exception 'Run pertenece a otro módulo: %',v_run.modulo; end if;
  if v_run.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED. Estado actual: %',v_run.status; end if;
  if v_run.source_rows<>v_run.staged_rows or v_run.staged_rows<=0 then
    raise exception 'Conteo staging inválido: fuente %, staging %',v_run.source_rows,v_run.staged_rows;
  end if;

  select count(*) into v_invalid
  from public.migration_sync_staging s
  where s.run_id=p_run_id
    and (
      nullif(trim(coalesce(s.row_data->>'id','')),'') is null
      or coalesce(s.row_data->>'fecha_asignacion','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      or nullif(trim(coalesce(s.row_data->>'sede','')),'') is null
      or nullif(trim(coalesce(s.row_data->>'supervisor','')),'') is null
      or nullif(trim(coalesce(s.row_data->>'cuadrilla','')),'') is null
      or upper(trim(coalesce(s.row_data->>'tipo_actividad',''))) not in (
        'AUDITORIA EN FRIO','AUDITORIA EN CALIENTE','SEGUIMIENTO',
        'VALIDACION DE OBSERVACION','CAPACITACION','CHECKLIST'
      )
      or upper(trim(coalesce(s.row_data->>'estado',''))) not in (
        'PENDIENTE','EN PROCESO','COMPLETADO','ANULADO'
      )
    );

  if v_invalid>0 then
    raise exception 'ASIGNACIONES_CAMPO contiene % fila(s) inválida(s)',v_invalid;
  end if;

  select count(*) into v_conflicts
  from public.migration_sync_staging s
  join public.asignaciones_campo_migracion a
    on a.id=trim(s.row_data->>'id')
  where s.run_id=p_run_id
    and upper(trim(coalesce(a.source_kind,''))) not in ('LEGACY_SNAPSHOT','LEGACY_SYNC');

  if v_conflicts>0 then
    raise exception 'ASIGNACIONES_CAMPO tiene % registro(s) PostgreSQL no-legacy con la misma clave',v_conflicts;
  end if;

  insert into public.asignaciones_campo_migracion(
    id,fecha_asignacion,hora_asignacion,asignado_por,sede,supervisor,
    codigo_ingresado,codigo_orden,codigo_pedido,cliente,dni,cuadrilla,
    tipo_actividad,motivo,prioridad,fecha_limite,estado,
    fecha_inicio,hora_inicio,fecha_cierre,hora_cierre,id_actividad_campo,
    observacion_jefatura,source_kind,updated_at
  )
  select
    trim(s.row_data->>'id'),
    (s.row_data->>'fecha_asignacion')::date,
    coalesce(nullif(s.row_data->>'hora_asignacion','')::time,'00:00:00'::time),
    trim(coalesce(s.row_data->>'asignado_por','')),
    upper(trim(s.row_data->>'sede')),
    trim(s.row_data->>'supervisor'),
    nullif(trim(s.row_data->>'codigo_ingresado'),''),
    nullif(trim(s.row_data->>'codigo_orden'),''),
    nullif(trim(s.row_data->>'codigo_pedido'),''),
    nullif(trim(s.row_data->>'cliente'),''),
    nullif(trim(s.row_data->>'dni'),''),
    trim(s.row_data->>'cuadrilla'),
    upper(trim(s.row_data->>'tipo_actividad')),
    trim(s.row_data->>'motivo'),
    case
      when upper(trim(coalesce(s.row_data->>'prioridad','NORMAL'))) in ('NORMAL','ALTA','URGENTE')
      then upper(trim(coalesce(s.row_data->>'prioridad','NORMAL')))
      else 'NORMAL'
    end,
    nullif(s.row_data->>'fecha_limite','')::date,
    upper(trim(s.row_data->>'estado')),
    nullif(s.row_data->>'fecha_inicio','')::date,
    nullif(s.row_data->>'hora_inicio','')::time,
    nullif(s.row_data->>'fecha_cierre','')::date,
    nullif(s.row_data->>'hora_cierre','')::time,
    nullif(trim(s.row_data->>'id_actividad_campo'),''),
    nullif(trim(s.row_data->>'observacion_jefatura'),''),
    'LEGACY_SYNC',
    now()
  from public.migration_sync_staging s
  where s.run_id=p_run_id
  on conflict(id) do update set
    fecha_asignacion=excluded.fecha_asignacion,
    hora_asignacion=excluded.hora_asignacion,
    asignado_por=excluded.asignado_por,
    sede=excluded.sede,
    supervisor=excluded.supervisor,
    codigo_ingresado=excluded.codigo_ingresado,
    codigo_orden=excluded.codigo_orden,
    codigo_pedido=excluded.codigo_pedido,
    cliente=excluded.cliente,
    dni=excluded.dni,
    cuadrilla=excluded.cuadrilla,
    tipo_actividad=excluded.tipo_actividad,
    motivo=excluded.motivo,
    prioridad=excluded.prioridad,
    fecha_limite=excluded.fecha_limite,
    estado=excluded.estado,
    fecha_inicio=excluded.fecha_inicio,
    hora_inicio=excluded.hora_inicio,
    fecha_cierre=excluded.fecha_cierre,
    hora_cierre=excluded.hora_cierre,
    id_actividad_campo=excluded.id_actividad_campo,
    observacion_jefatura=excluded.observacion_jefatura,
    source_kind='LEGACY_SYNC',
    updated_at=now();

  get diagnostics v_applied=row_count;

  update public.migration_sync_runs
  set status='APPLIED',applied_rows=v_applied,applied_at=now(),
      notes=concat_ws(' | ',notes,'Resync ASIGNACIONES_CAMPO aplicado por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  select count(*) into v_total from public.asignaciones_campo_migracion;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),
      content_match=null,status='LIVE_VALIDAR',
      notes='Resync ASIGNACIONES_CAMPO aplicado desde staging; PostgreSQL='||v_total||
            '. Legacy sigue activo: requiere verificación final antes del cutover.',
      updated_at=now()
  where modulo='ASIGNACIONES_CAMPO';

  return jsonb_build_object(
    'ok',true,'run_id',p_run_id,'modulo','ASIGNACIONES_CAMPO',
    'applied_rows',v_applied,'postgres_rows',v_total,'actor',p_actor
  );
end $$;

revoke all on function public.mv_sync_apply_asignaciones_campo(uuid,text,text)
from public,anon,authenticated;
grant execute on function public.mv_sync_apply_asignaciones_campo(uuid,text,text)
to service_role;
