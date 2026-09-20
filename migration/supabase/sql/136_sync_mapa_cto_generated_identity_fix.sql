-- 136_sync_mapa_cto_generated_identity_fix.sql
-- Respeta identity/generadas de ordenes y catalogo_cto.

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
    fecha_importacion=excluded.fecha_importacion,
    usuario_importacion=excluded.usuario_importacion,
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

create or replace function public.mv_sync_apply_cto(
  p_run_id uuid,p_actor text,p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  p jsonb;
  v_applied int:=0;v_total int:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_CTO_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_CTO_SYNC'));

  select * into r
  from public.migration_sync_runs
  where id=p_run_id
  for update;

  if not found or r.modulo<>'CATALOGO_CTO' then raise exception 'Run CTO inválido'; end if;
  if r.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED'; end if;

  p:=public.mv_sync_preview_cto(p_run_id);
  if not coalesce((p->>'puedeAplicar')::boolean,false) then
    raise exception 'Preview CTO bloqueado: %',p;
  end if;

  delete from public.migration_sync_apply_backup
  where run_id=p_run_id and modulo='CATALOGO_CTO';

  insert into public.migration_sync_apply_backup(run_id,modulo,source_key,existed_before,row_before)
  select p_run_id,'CATALOGO_CTO',s.codigo,(c.codigo_cto is not null),
         case when c.codigo_cto is not null then to_jsonb(c) else null end
  from (
    select trim(row_data->>'codigo_cto') codigo
    from public.migration_sync_staging
    where run_id=p_run_id
  ) s
  left join public.catalogo_cto c on c.codigo_cto=s.codigo;

  with src as (
    select source_row,row_data,trim(row_data->>'codigo_cto') codigo
    from public.migration_sync_staging
    where run_id=p_run_id
  )
  insert into public.catalogo_cto(
    codigo_cto,latitud,longitud,coordenada,sede,primera_deteccion,ultima_actualizacion,
    orden_referencia,codigo_cliente,tipo_trabajo,puerto_referencia,usuario_actualizacion,
    veces_detectada,updated_at
  )
  select
    codigo,
    nullif(row_data->>'latitud','')::double precision,
    nullif(row_data->>'longitud','')::double precision,
    nullif(trim(row_data->>'coordenada'),''),
    nullif(upper(trim(row_data->>'sede')),''),
    nullif(row_data->>'primera_deteccion','')::timestamp,
    nullif(row_data->>'ultima_actualizacion','')::timestamp,
    nullif(trim(row_data->>'orden_referencia'),''),
    nullif(trim(row_data->>'codigo_cliente'),''),
    nullif(trim(row_data->>'tipo_trabajo'),''),
    nullif(trim(row_data->>'puerto_referencia'),''),
    nullif(trim(row_data->>'usuario_actualizacion'),''),
    greatest(coalesce(nullif(row_data->>'veces_detectada','')::integer,1),1),
    now()
  from src
  on conflict(codigo_cto) do update set
    latitud=excluded.latitud,
    longitud=excluded.longitud,
    coordenada=excluded.coordenada,
    sede=excluded.sede,
    primera_deteccion=excluded.primera_deteccion,
    ultima_actualizacion=excluded.ultima_actualizacion,
    orden_referencia=excluded.orden_referencia,
    codigo_cliente=excluded.codigo_cliente,
    tipo_trabajo=excluded.tipo_trabajo,
    puerto_referencia=excluded.puerto_referencia,
    usuario_actualizacion=excluded.usuario_actualizacion,
    veces_detectada=excluded.veces_detectada,
    updated_at=now();

  get diagnostics v_applied=row_count;
  select count(*) into v_total from public.catalogo_cto;

  update public.migration_sync_runs
  set status='APPLIED',applied_rows=v_applied,applied_at=now(),
      notes=concat_ws(' | ',notes,'CATALOGO_CTO aplicado por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync CATALOGO_CTO aplicado; PostgreSQL='||v_total||
            '. Legacy sigue activo, requiere delta final antes de cutover.',
      updated_at=now()
  where modulo='CATALOGO_CTO';

  return jsonb_build_object(
    'ok',true,'modulo','CATALOGO_CTO','run_id',p_run_id,
    'applied_rows',v_applied,'postgres_rows',v_total,'backup',true
  );
end $$;

create or replace function public.mv_sync_rollback_mapa(
  p_run_id uuid,p_actor text,p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  b record;
  v_restored int:=0;
  v_deleted int:=0;
begin
  if coalesce(p_confirmacion,'')<>'ROLLBACK_MAPA_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_MAPA_SYNC'));

  for b in
    select *
    from public.migration_sync_apply_backup
    where run_id=p_run_id and modulo='MAPA_OPERATIVO'
  loop
    if not b.existed_before then
      delete from public.ordenes where orden_id=b.source_key;
      v_deleted:=v_deleted+1;
    else
      update public.ordenes o set
        tipo_trabajo=b.row_before->>'tipo_trabajo',
        grupo_trabajo=b.row_before->>'grupo_trabajo',
        fecha_solicitud=nullif(b.row_before->>'fecha_solicitud','')::date,
        hora_solicitud=nullif(b.row_before->>'hora_solicitud','')::time,
        cliente=b.row_before->>'cliente',
        tipo=b.row_before->>'tipo',
        producto_origen=b.row_before->>'producto_origen',
        cuadrilla=b.row_before->>'cuadrilla',
        estado=b.row_before->>'estado',
        direccion=b.row_before->>'direccion',
        direccion_adicional=b.row_before->>'direccion_adicional',
        fecha_ultimo_estado=nullif(b.row_before->>'fecha_ultimo_estado','')::timestamp,
        producto_servicio=b.row_before->>'producto_servicio',
        sede=b.row_before->>'sede',
        codigo_cliente=b.row_before->>'codigo_cliente',
        numero_documento=b.row_before->>'numero_documento',
        telefono_movil=b.row_before->>'telefono_movil',
        telefono_fijo=b.row_before->>'telefono_fijo',
        fecha_fin_visita=nullif(b.row_before->>'fecha_fin_visita','')::timestamp,
        fecha_inicio_visita=nullif(b.row_before->>'fecha_inicio_visita','')::timestamp,
        motivo_cancelacion=b.row_before->>'motivo_cancelacion',
        motivo_finalizacion=b.row_before->>'motivo_finalizacion',
        motivo_anulacion=b.row_before->>'motivo_anulacion',
        latitud=nullif(b.row_before->>'latitud','')::double precision,
        longitud=nullif(b.row_before->>'longitud','')::double precision,
        detalle=b.row_before->>'detalle',
        fecha_importacion=nullif(b.row_before->>'fecha_importacion','')::timestamp,
        usuario_importacion=b.row_before->>'usuario_importacion',
        cto_1=b.row_before->>'cto_1',
        coordenada_cto_1=b.row_before->>'coordenada_cto_1',
        cto_2=b.row_before->>'cto_2',
        coordenada_cto_2=b.row_before->>'coordenada_cto_2',
        cto_3=b.row_before->>'cto_3',
        coordenada_cto_3=b.row_before->>'coordenada_cto_3',
        cto=b.row_before->>'cto',
        puerto=b.row_before->>'puerto',
        codigo_seguimiento=b.row_before->>'codigo_seguimiento',
        updated_at=coalesce(nullif(b.row_before->>'updated_at','')::timestamptz,now())
      where o.orden_id=b.source_key;

      v_restored:=v_restored+1;
    end if;
  end loop;

  update public.migration_sync_runs
  set status='ROLLED_BACK',
      notes=concat_ws(' | ',notes,'Rollback MAPA por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id and modulo='MAPA_OPERATIVO';

  return jsonb_build_object(
    'ok',true,'modulo','MAPA_OPERATIVO','restored',v_restored,'deleted',v_deleted
  );
end $$;

revoke all on function public.mv_sync_apply_mapa(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mv_sync_apply_cto(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mv_sync_rollback_mapa(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mv_sync_apply_mapa(uuid,text,text) to service_role;
grant execute on function public.mv_sync_apply_cto(uuid,text,text) to service_role;
grant execute on function public.mv_sync_rollback_mapa(uuid,text,text) to service_role;
