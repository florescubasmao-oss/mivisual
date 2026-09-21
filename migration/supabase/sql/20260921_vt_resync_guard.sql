-- MI VISUAL migracion-supabase
-- 2026-09-21
-- Refuerza el resync de Validacion Tecnica para coexistencia legacy/PostgreSQL.
-- No modifica datos por si solo: solo redefine la funcion APPLY.

create or replace function public.mv_sync_apply_validacion_tecnica(
  p_run_id uuid,
  p_actor text,
  p_confirmacion text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_run public.migration_sync_runs%rowtype;
  v_applied integer := 0;
  v_total integer := 0;
  v_conflicts integer := 0;
begin
  if coalesce(p_confirmacion,'') <> 'APLICAR_VALIDACION_TECNICA_STAGING' then
    raise exception 'Confirmación de aplicación inválida';
  end if;

  select * into v_run
  from public.migration_sync_runs
  where id=p_run_id
  for update;

  if not found then raise exception 'Run de sincronización no existe'; end if;
  if v_run.modulo <> 'VALIDACION_TECNICA' then raise exception 'Run pertenece a otro módulo: %', v_run.modulo; end if;
  if v_run.status <> 'VALIDATED' then raise exception 'Run debe estar VALIDATED. Estado actual: %', v_run.status; end if;
  if v_run.source_rows <> v_run.staged_rows or v_run.staged_rows <= 0 then
    raise exception 'Conteo staging inválido: fuente %, staging %', v_run.source_rows, v_run.staged_rows;
  end if;

  select count(*) into v_conflicts
  from public.migration_sync_staging s
  join public.validacion_tecnica_migracion v on v.id = trim(s.row_data->>'id')
  where s.run_id=p_run_id
    and upper(trim(coalesce(v.fuente,''))) not in ('LEGACY_SHEET','LEGACY_SYNC');

  if v_conflicts > 0 then
    raise exception 'VALIDACION_TECNICA tiene % registro(s) PostgreSQL no-legacy con la misma ID; requiere conciliación manual', v_conflicts;
  end if;

  insert into public.validacion_tecnica_migracion(
    id,source_row,registro_at,sede,tecnico,cuadrilla,tipo_validacion,codigo,
    tipo_ticket,numero_ticket,ticket_final,dni_cliente,motivo_tecnico,
    estado,resultado_final,validado_por,perfil_validador,validado_at,
    motivo_validacion,link_telegram,hora_limite,origen_orden,periodo,
    fuente,puntaje_vtr_gar,updated_at
  )
  select
    nullif(trim(s.row_data->>'id'),''),
    nullif(s.row_data->>'source_row','')::integer,
    (s.row_data->>'registro_at')::timestamp,
    nullif(trim(s.row_data->>'sede'),''),
    nullif(trim(s.row_data->>'tecnico'),''),
    nullif(trim(s.row_data->>'cuadrilla'),''),
    upper(trim(s.row_data->>'tipo_validacion')),
    trim(s.row_data->>'codigo'),
    nullif(trim(s.row_data->>'tipo_ticket'),''),
    nullif(trim(s.row_data->>'numero_ticket'),''),
    nullif(trim(s.row_data->>'ticket_final'),''),
    nullif(trim(s.row_data->>'dni_cliente'),''),
    nullif(trim(s.row_data->>'motivo_tecnico'),''),
    upper(trim(s.row_data->>'estado')),
    nullif(trim(s.row_data->>'resultado_final'),''),
    nullif(trim(s.row_data->>'validado_por'),''),
    nullif(trim(s.row_data->>'perfil_validador'),''),
    nullif(s.row_data->>'validado_at','')::timestamp,
    nullif(trim(s.row_data->>'motivo_validacion'),''),
    nullif(trim(s.row_data->>'link_telegram'),''),
    nullif(s.row_data->>'hora_limite','')::timestamp,
    case
      when upper(trim(coalesce(s.row_data->>'origen_orden',''))) in ('PROPIA','ASIGNADA')
      then upper(trim(s.row_data->>'origen_orden'))
      else null
    end,
    trim(s.row_data->>'periodo'),
    'LEGACY_SYNC',
    nullif(s.row_data->>'puntaje_vtr_gar','')::numeric,
    now()
  from public.migration_sync_staging s
  where s.run_id=p_run_id
  on conflict(id) do update set
    source_row=excluded.source_row,
    registro_at=excluded.registro_at,
    sede=excluded.sede,
    tecnico=excluded.tecnico,
    cuadrilla=excluded.cuadrilla,
    tipo_validacion=excluded.tipo_validacion,
    codigo=excluded.codigo,
    tipo_ticket=excluded.tipo_ticket,
    numero_ticket=excluded.numero_ticket,
    ticket_final=excluded.ticket_final,
    dni_cliente=excluded.dni_cliente,
    motivo_tecnico=excluded.motivo_tecnico,
    estado=excluded.estado,
    resultado_final=excluded.resultado_final,
    validado_por=excluded.validado_por,
    perfil_validador=excluded.perfil_validador,
    validado_at=excluded.validado_at,
    motivo_validacion=excluded.motivo_validacion,
    link_telegram=excluded.link_telegram,
    hora_limite=excluded.hora_limite,
    origen_orden=excluded.origen_orden,
    periodo=excluded.periodo,
    fuente='LEGACY_SYNC',
    puntaje_vtr_gar=excluded.puntaje_vtr_gar,
    updated_at=now();

  get diagnostics v_applied = row_count;

  update public.migration_sync_runs
  set status='APPLIED',applied_rows=v_applied,applied_at=now(),
      notes=concat_ws(' | ',notes,'Resync VALIDACION_TECNICA aplicado por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  select count(*) into v_total from public.validacion_tecnica_migracion;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync completo VALIDACION_TECNICA aplicado desde staging; PostgreSQL='||v_total||
            '. Legacy sigue activo: requiere verificación final inmediatamente antes del cutover.',
      updated_at=now()
  where modulo='VALIDACION_TECNICA';

  return jsonb_build_object(
    'ok',true,'run_id',p_run_id,'modulo','VALIDACION_TECNICA',
    'applied_rows',v_applied,'postgres_rows',v_total,'actor',p_actor
  );
end
$function$;
