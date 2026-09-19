
-- 100_seguridad_cierre_pdf_v442.sql
-- Cierre ATS/PETAR en dos fases:
-- 1) prepara snapshot final sin persistir
-- 2) PDF se genera y almacena fuera de PostgreSQL
-- 3) confirma cierre solo si el documento no cambió.

create or replace function public.mv_seguridad_preparar_cierre_supervisor(
  p_usuario text,
  p_id text,
  p_gps text default '',
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  firma jsonb;
  firma_obj jsonb;
  a public.seguridad_ats_migracion%rowtype;
  p public.seguridad_petar_migracion%rowtype;
  acept jsonb;
  acept_actual integer;
  reparar boolean;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if u->>'perfil'<>'SUPERVISOR'
     or not coalesce((u->>'puedeAprobar')::boolean,false) then
    raise exception 'Solo Supervisor autorizado';
  end if;

  firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');
  if not coalesce((firma->>'activa')::boolean,false)
     or coalesce(firma->>'url','')='' then
    raise exception 'Supervisor debe registrar su firma digital';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id;

  if not found then raise exception 'ATS no encontrado'; end if;

  reparar:=a.estado='FINALIZADO' and coalesce(a.pdf_url,'')='';

  if public.mv_actividad_texto(a.sede)<>public.mv_actividad_texto(u->>'sede')
     or (
       not reparar
       and a.estado not in ('PENDIENTE SUPERVISOR','PENDIENTE ACEPTACION')
     ) then
    raise exception 'ATS no disponible para autorización';
  end if;

  if coalesce(a.petar_id,'')<>'' then
    select * into p
    from public.seguridad_petar_migracion
    where id=a.petar_id;
  end if;

  acept_actual:=public.mv_seguridad_aceptados(a.aceptaciones_json);

  if acept_actual<1 then
    raise exception 'Se requiere al menos la aceptación de un técnico antes de autorizar';
  end if;

  if p.id is not null and public.mv_actividad_texto(p.no_cumple_critico)='SI' then
    raise exception 'PETAR tiene un NO CUMPLE crítico. TRABAJO NO AUTORIZADO';
  end if;

  if p.id is not null and exists(
    select 1
    from jsonb_array_elements(coalesce(p.checklist_json,'[]'::jsonb)) x
    where public.mv_actividad_texto(x->>'estado')=''
  ) then
    raise exception 'Complete todas las verificaciones del PETAR antes de autorizar';
  end if;

  firma_obj:=jsonb_build_object(
    'usuario',u->>'usuario',
    'nombre',coalesce(u->>'nombresApellidos',''),
    'perfil',u->>'perfil',
    'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
    'firma',jsonb_build_object(
      'url',firma->>'url',
      'version',firma->'version'
    )
  );

  acept:=public.mv_seguridad_autocompletar_aceptaciones(
    p_id,u->>'usuario',u->>'perfil',u->>'nombresApellidos',
    'SUPERVISOR',coalesce(p_gps,'')
  );

  a.aceptaciones_json:=acept;
  a.supervisor_firma_json:=firma_obj;
  a.observacion:=coalesce(p_motivo,'');

  return jsonb_build_object(
    'ok',true,
    'modulo','SEGURIDAD',
    'accion','PREPARAR_CIERRE_SUPERVISOR',
    'id',p_id,
    'repararPdf',reparar,
    'expectedUpdatedAt',a.updated_at,
    'ats',public.mv_seguridad_ats_json(a),
    'petar',case when p.id is null then null else public.mv_seguridad_petar_json(p) end,
    'aceptacionesAutocompletadas',
      greatest(0,public.mv_seguridad_aceptados(acept)-acept_actual)
  );
end;
$$;

create or replace function public.mv_seguridad_confirmar_cierre_supervisor(
  p_usuario text,
  p_id text,
  p_expected_updated_at timestamptz,
  p_pdf_ats_url text,
  p_pdf_ats_id text,
  p_pdf_petar_url text default '',
  p_pdf_petar_id text default '',
  p_gps text default '',
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  firma jsonb;
  firma_obj jsonb;
  a public.seguridad_ats_migracion%rowtype;
  p public.seguridad_petar_migracion%rowtype;
  acept jsonb;
  acept_actual integer;
  reparar boolean;
begin
  if coalesce(trim(p_pdf_ats_url),'')='' then
    raise exception 'PDF ATS obligatorio antes de finalizar';
  end if;

  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if u->>'perfil'<>'SUPERVISOR'
     or not coalesce((u->>'puedeAprobar')::boolean,false) then
    raise exception 'Solo Supervisor autorizado';
  end if;

  firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');
  if not coalesce((firma->>'activa')::boolean,false)
     or coalesce(firma->>'url','')='' then
    raise exception 'Supervisor debe registrar su firma digital';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  if p_expected_updated_at is null or a.updated_at<>p_expected_updated_at then
    raise exception 'El ATS cambió durante la generación del PDF. Vuelva a autorizar';
  end if;

  reparar:=a.estado='FINALIZADO' and coalesce(a.pdf_url,'')='';

  if public.mv_actividad_texto(a.sede)<>public.mv_actividad_texto(u->>'sede')
     or (
       not reparar
       and a.estado not in ('PENDIENTE SUPERVISOR','PENDIENTE ACEPTACION')
     ) then
    raise exception 'ATS no disponible para autorización';
  end if;

  if coalesce(a.petar_id,'')<>'' then
    select * into p
    from public.seguridad_petar_migracion
    where id=a.petar_id
    for update;
  end if;

  acept_actual:=public.mv_seguridad_aceptados(a.aceptaciones_json);

  if acept_actual<1 then
    raise exception 'Se requiere al menos la aceptación de un técnico antes de autorizar';
  end if;

  if p.id is not null and public.mv_actividad_texto(p.no_cumple_critico)='SI' then
    raise exception 'PETAR tiene un NO CUMPLE crítico. TRABAJO NO AUTORIZADO';
  end if;

  if p.id is not null and exists(
    select 1
    from jsonb_array_elements(coalesce(p.checklist_json,'[]'::jsonb)) x
    where public.mv_actividad_texto(x->>'estado')=''
  ) then
    raise exception 'Complete todas las verificaciones del PETAR antes de autorizar';
  end if;

  if p.id is not null and coalesce(trim(p_pdf_petar_url),'')='' then
    raise exception 'PDF PETAR obligatorio antes de finalizar';
  end if;

  firma_obj:=jsonb_build_object(
    'usuario',u->>'usuario',
    'nombre',coalesce(u->>'nombresApellidos',''),
    'perfil',u->>'perfil',
    'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
    'firma',jsonb_build_object(
      'url',firma->>'url',
      'version',firma->'version'
    )
  );

  acept:=public.mv_seguridad_autocompletar_aceptaciones(
    p_id,u->>'usuario',u->>'perfil',u->>'nombresApellidos',
    'SUPERVISOR',coalesce(p_gps,'')
  );

  update public.seguridad_ats_migracion
  set aceptaciones_json=acept,
      supervisor_firma_json=firma_obj,
      observacion=coalesce(p_motivo,''),
      pdf_url=p_pdf_ats_url,
      pdf_id=coalesce(p_pdf_ats_id,''),
      estado='FINALIZADO',
      actualizado_en=now(),
      updated_at=now()
  where id=p_id;

  if p.id is not null then
    update public.seguridad_petar_migracion
    set pdf_url=p_pdf_petar_url,
        pdf_id=coalesce(p_pdf_petar_id,''),
        estado='FINALIZADO',
        actualizado_en=now(),
        updated_at=now()
    where id=p.id;
  end if;

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    p_id,a.petar_id,'AUTORIZAR_FINALIZAR_SUPERVISOR',
    u->>'usuario',u->>'perfil',
    jsonb_build_object(
      'pdfAts',p_pdf_ats_url,
      'pdfPetar',coalesce(p_pdf_petar_url,''),
      'repararPdf',reparar,
      'aceptacionesAutocompletadas',
        greatest(0,public.mv_seguridad_aceptados(acept)-acept_actual)
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'estado','FINALIZADO',
    'pdfUrl',p_pdf_ats_url,
    'petarPdfUrl',coalesce(p_pdf_petar_url,''),
    'aceptacionesAutocompletadas',
      greatest(0,public.mv_seguridad_aceptados(acept)-acept_actual)
  );
end;
$$;

create or replace function public.mv_seguridad_preparar_cierre_final(
  p_usuario text,
  p_id text,
  p_gps text default '',
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  firma jsonb;
  firma_obj jsonb;
  a public.seguridad_ats_migracion%rowtype;
  p public.seguridad_petar_migracion%rowtype;
  acept jsonb;
  acept_actual integer;
  reparar boolean;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if not coalesce((u->>'puedeValidar')::boolean,false) then
    raise exception 'No puede realizar validación final';
  end if;

  firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');
  if not coalesce((firma->>'activa')::boolean,false)
     or coalesce(firma->>'url','')='' then
    raise exception 'Registre su firma digital antes de validar';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id;

  if not found then raise exception 'ATS no encontrado'; end if;

  reparar:=a.estado='FINALIZADO' and coalesce(a.pdf_url,'')='';

  if not reparar
     and a.estado not in ('PENDIENTE VALIDACION','PENDIENTE SUPERVISOR','PENDIENTE ACEPTACION') then
    raise exception 'ATS no está disponible para validación';
  end if;

  acept_actual:=public.mv_seguridad_aceptados(a.aceptaciones_json);

  if acept_actual<1 then
    raise exception 'Se requiere al menos la aceptación de un técnico antes de finalizar';
  end if;

  if coalesce(a.petar_id,'')<>'' then
    select * into p
    from public.seguridad_petar_migracion
    where id=a.petar_id;
  end if;

  firma_obj:=jsonb_build_object(
    'usuario',u->>'usuario',
    'nombre',coalesce(u->>'nombresApellidos',''),
    'perfil',u->>'perfil',
    'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
    'firma',jsonb_build_object(
      'url',firma->>'url',
      'version',firma->'version'
    )
  );

  acept:=public.mv_seguridad_autocompletar_aceptaciones(
    p_id,u->>'usuario',u->>'perfil',u->>'nombresApellidos',
    'VALIDACION FINAL',coalesce(p_gps,'')
  );

  a.aceptaciones_json:=acept;
  a.validador_firma_json:=firma_obj;
  if a.supervisor_firma_json is null then
    a.supervisor_firma_json:=firma_obj;
  end if;
  a.observacion:=coalesce(p_motivo,'');

  return jsonb_build_object(
    'ok',true,
    'modulo','SEGURIDAD',
    'accion','PREPARAR_CIERRE_FINAL',
    'id',p_id,
    'repararPdf',reparar,
    'expectedUpdatedAt',a.updated_at,
    'ats',public.mv_seguridad_ats_json(a),
    'petar',case when p.id is null then null else public.mv_seguridad_petar_json(p) end,
    'aceptacionesAutocompletadas',
      greatest(0,public.mv_seguridad_aceptados(acept)-acept_actual)
  );
end;
$$;

create or replace function public.mv_seguridad_confirmar_cierre_final(
  p_usuario text,
  p_id text,
  p_expected_updated_at timestamptz,
  p_pdf_ats_url text,
  p_pdf_ats_id text,
  p_pdf_petar_url text default '',
  p_pdf_petar_id text default '',
  p_gps text default '',
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  firma jsonb;
  firma_obj jsonb;
  a public.seguridad_ats_migracion%rowtype;
  p public.seguridad_petar_migracion%rowtype;
  acept jsonb;
  reparar boolean;
begin
  if coalesce(trim(p_pdf_ats_url),'')='' then
    raise exception 'PDF ATS obligatorio antes de finalizar';
  end if;

  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if not coalesce((u->>'puedeValidar')::boolean,false) then
    raise exception 'No puede realizar validación final';
  end if;

  firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');
  if not coalesce((firma->>'activa')::boolean,false)
     or coalesce(firma->>'url','')='' then
    raise exception 'Registre su firma digital antes de validar';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  if p_expected_updated_at is null or a.updated_at<>p_expected_updated_at then
    raise exception 'El ATS cambió durante la generación del PDF. Vuelva a validar';
  end if;

  reparar:=a.estado='FINALIZADO' and coalesce(a.pdf_url,'')='';

  if not reparar
     and a.estado not in ('PENDIENTE VALIDACION','PENDIENTE SUPERVISOR','PENDIENTE ACEPTACION') then
    raise exception 'ATS no está disponible para validación';
  end if;

  if public.mv_seguridad_aceptados(a.aceptaciones_json)<1 then
    raise exception 'Se requiere al menos la aceptación de un técnico antes de finalizar';
  end if;

  if coalesce(a.petar_id,'')<>'' then
    select * into p
    from public.seguridad_petar_migracion
    where id=a.petar_id
    for update;
  end if;

  if p.id is not null and coalesce(trim(p_pdf_petar_url),'')='' then
    raise exception 'PDF PETAR obligatorio antes de finalizar';
  end if;

  firma_obj:=jsonb_build_object(
    'usuario',u->>'usuario',
    'nombre',coalesce(u->>'nombresApellidos',''),
    'perfil',u->>'perfil',
    'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
    'firma',jsonb_build_object(
      'url',firma->>'url',
      'version',firma->'version'
    )
  );

  acept:=public.mv_seguridad_autocompletar_aceptaciones(
    p_id,u->>'usuario',u->>'perfil',u->>'nombresApellidos',
    'VALIDACION FINAL',coalesce(p_gps,'')
  );

  update public.seguridad_ats_migracion
  set aceptaciones_json=acept,
      validador_firma_json=firma_obj,
      supervisor_firma_json=coalesce(supervisor_firma_json,firma_obj),
      observacion=coalesce(p_motivo,''),
      pdf_url=p_pdf_ats_url,
      pdf_id=coalesce(p_pdf_ats_id,''),
      estado='FINALIZADO',
      actualizado_en=now(),
      updated_at=now()
  where id=p_id;

  if p.id is not null then
    update public.seguridad_petar_migracion
    set pdf_url=p_pdf_petar_url,
        pdf_id=coalesce(p_pdf_petar_id,''),
        estado='FINALIZADO',
        actualizado_en=now(),
        updated_at=now()
    where id=p.id;
  end if;

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    p_id,a.petar_id,'VALIDAR_FINALIZAR',
    u->>'usuario',u->>'perfil',
    jsonb_build_object(
      'pdfAts',p_pdf_ats_url,
      'pdfPetar',coalesce(p_pdf_petar_url,''),
      'repararPdf',reparar
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'estado','FINALIZADO',
    'pdfUrl',p_pdf_ats_url,
    'petarPdfUrl',coalesce(p_pdf_petar_url,'')
  );
end;
$$;

revoke execute on function public.mv_seguridad_preparar_cierre_supervisor(text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_confirmar_cierre_supervisor(text,text,timestamptz,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_preparar_cierre_final(text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_confirmar_cierre_final(text,text,timestamptz,text,text,text,text,text,text) from public,anon,authenticated;

grant execute on function public.mv_seguridad_preparar_cierre_supervisor(text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_confirmar_cierre_supervisor(text,text,timestamptz,text,text,text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_preparar_cierre_final(text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_confirmar_cierre_final(text,text,timestamptz,text,text,text,text,text,text) to service_role;
