-- 144_sync_mapa_preserve_import_metadata.sql
-- Fuente viva Mapa puede no incluir metadatos de importación.
-- Conserva los valores existentes cuando el staging no los trae.

create or replace function public.mv_sync_apply_mapa(
  p_run_id uuid,p_actor text,p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  p jsonb;
  v_applied int:=0;v_total int:=0;v_new int:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_MAPA_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_MAPA_SYNC'));

  select * into r
  from public.migration_sync_runs
  where id=p_run_id
  for update;

  if not found or r.modulo<>'MAPA_OPERATIVO' then raise exception 'Run MAPA inválido'; end if;
  if r.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED'; end if;

  p:=public.mv_sync_preview_mapa(p_run_id);
  if not coalesce((p->>'puedeAplicar')::boolean,false) then
    raise exception 'Preview MAPA bloqueado: %',p;
  end if;

  delete from public.migration_sync_apply_backup
  where run_id=p_run_id and modulo='MAPA_OPERATIVO';

  insert into public.migration_sync_apply_backup(run_id,modulo,source_key,existed_before,row_before)
  select p_run_id,'MAPA_OPERATIVO',s.orden_id,(o.orden_id is not null),
         case when o.orden_id is not null then to_jsonb(o) else null end
  from (
    select trim(row_data->>'orden_id') orden_id,(row_data->>'fecha_solicitud')::date fecha_solicitud
    from public.migration_sync_staging
    where run_id=p_run_id
      and coalesce(row_data->>'fecha_solicitud','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
  ) s
  left join public.ordenes o on o.orden_id=s.orden_id
  left join public.produccion_periodos pp on pp.periodo=to_char(s.fecha_solicitud,'YYYY-MM')
  where not coalesce(pp.protegido,false);

  with src as (
    select s.source_row,s.row_data,
      trim(s.row_data->>'orden_id') orden_id,
      (s.row_data->>'fecha_solicitud')::date fecha_solicitud
    from public.migration_sync_staging s
    left join public.produccion_periodos pp
      on pp.periodo=to_char((s.row_data->>'fecha_solicitud')::date,'YYYY-MM')
    where s.run_id=p_run_id
      and not coalesce(pp.protegido,false)
  )
  insert into public.ordenes(
    orden_id,tipo_trabajo,grupo_trabajo,fecha_solicitud,hora_solicitud,cliente,tipo,producto_origen,
    cuadrilla,estado,direccion,direccion_adicional,fecha_ultimo_estado,producto_servicio,sede,codigo_cliente,
    numero_documento,telefono_movil,telefono_fijo,fecha_fin_visita,fecha_inicio_visita,motivo_cancelacion,
    motivo_finalizacion,motivo_anulacion,latitud,longitud,detalle,fecha_importacion,usuario_importacion,
    cto_1,coordenada_cto_1,cto_2,coordenada_cto_2,cto_3,coordenada_cto_3,cto,puerto,codigo_seguimiento,
    updated_at
  )
  select
    orden_id,
    nullif(trim(row_data->>'tipo_trabajo'),''),
    public.mv_mapa_grupo_trabajo(row_data->>'tipo_trabajo'),
    fecha_solicitud,
    nullif(row_data->>'hora_solicitud','')::time,
    nullif(trim(row_data->>'cliente'),''),
    nullif(trim(row_data->>'tipo'),''),
    nullif(trim(row_data->>'producto_origen'),''),
    nullif(trim(row_data->>'cuadrilla'),''),
    nullif(trim(row_data->>'estado'),''),
    nullif(trim(row_data->>'direccion'),''),
    nullif(trim(row_data->>'direccion_adicional'),''),
    nullif(row_data->>'fecha_ultimo_estado','')::timestamp,
    nullif(trim(row_data->>'producto_servicio'),''),
    nullif(upper(trim(row_data->>'sede')),''),
    nullif(trim(row_data->>'codigo_cliente'),''),
    nullif(trim(row_data->>'numero_documento'),''),
    nullif(trim(row_data->>'telefono_movil'),''),
    nullif(trim(row_data->>'telefono_fijo'),''),
    nullif(row_data->>'fecha_fin_visita','')::timestamp,
    nullif(row_data->>'fecha_inicio_visita','')::timestamp,
    nullif(trim(row_data->>'motivo_cancelacion'),''),
    nullif(trim(row_data->>'motivo_finalizacion'),''),
    nullif(trim(row_data->>'motivo_anulacion'),''),
    nullif(row_data->>'latitud','')::double precision,
    nullif(row_data->>'longitud','')::double precision,
    nullif(trim(row_data->>'detalle'),''),
    nullif(row_data->>'fecha_importacion','')::timestamp,
    nullif(trim(row_data->>'usuario_importacion'),''),
    nullif(trim(row_data->>'cto_1'),''),
    nullif(trim(row_data->>'coordenada_cto_1'),''),
    nullif(trim(row_data->>'cto_2'),''),
    nullif(trim(row_data->>'coordenada_cto_2'),''),
    nullif(trim(row_data->>'cto_3'),''),
    nullif(trim(row_data->>'coordenada_cto_3'),''),
    nullif(trim(row_data->>'cto'),''),
    nullif(trim(row_data->>'puerto'),''),
    nullif(trim(row_data->>'codigo_seguimiento'),''),
    now()
  from src
  on conflict(orden_id) do update set
    tipo_trabajo=excluded.tipo_trabajo,
    grupo_trabajo=coalesce(excluded.grupo_trabajo,public.ordenes.grupo_trabajo),
    fecha_solicitud=excluded.fecha_solicitud,
    hora_solicitud=excluded.hora_solicitud,
    cliente=excluded.cliente,
    tipo=excluded.tipo,
    producto_origen=excluded.producto_origen,
    cuadrilla=excluded.cuadrilla,
    estado=excluded.estado,
    direccion=excluded.direccion,
    direccion_adicional=excluded.direccion_adicional,
    fecha_ultimo_estado=excluded.fecha_ultimo_estado,
    producto_servicio=excluded.producto_servicio,
    sede=excluded.sede,
    codigo_cliente=excluded.codigo_cliente,
    numero_documento=excluded.numero_documento,
    telefono_movil=excluded.telefono_movil,
    telefono_fijo=excluded.telefono_fijo,
    fecha_fin_visita=excluded.fecha_fin_visita,
    fecha_inicio_visita=excluded.fecha_inicio_visita,
    motivo_cancelacion=excluded.motivo_cancelacion,
    motivo_finalizacion=excluded.motivo_finalizacion,
    motivo_anulacion=excluded.motivo_anulacion,
    latitud=excluded.latitud,
    longitud=excluded.longitud,
    detalle=excluded.detalle,
    fecha_importacion=coalesce(excluded.fecha_importacion,public.ordenes.fecha_importacion),
    usuario_importacion=coalesce(excluded.usuario_importacion,public.ordenes.usuario_importacion),
    cto_1=excluded.cto_1,
    coordenada_cto_1=excluded.coordenada_cto_1,
    cto_2=excluded.cto_2,
    coordenada_cto_2=excluded.coordenada_cto_2,
    cto_3=excluded.cto_3,
    coordenada_cto_3=excluded.coordenada_cto_3,
    cto=excluded.cto,
    puerto=excluded.puerto,
    codigo_seguimiento=excluded.codigo_seguimiento,
    updated_at=now();

  get diagnostics v_applied=row_count;
  select count(*) into v_total from public.ordenes;
  v_new:=coalesce((p->>'nuevas')::int,0);

  update public.migration_sync_runs
  set status='APPLIED',applied_rows=v_applied,applied_at=now(),
      notes=concat_ws(' | ',notes,'MAPA aplicado solo a periodos no protegidos por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync MAPA aplicado a periodos no protegidos; PostgreSQL='||v_total||
            '. Legacy sigue activo, requiere delta final antes de cutover.',
      updated_at=now()
  where modulo='MAPA_OPERATIVO';

  return jsonb_build_object(
    'ok',true,'modulo','MAPA_OPERATIVO','run_id',p_run_id,
    'applied_rows',v_applied,'new_rows_source',v_new,'postgres_rows',v_total,'backup',true
  );
end $$;



revoke all on function public.mv_sync_apply_mapa(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mv_sync_apply_mapa(uuid,text,text) to service_role;
