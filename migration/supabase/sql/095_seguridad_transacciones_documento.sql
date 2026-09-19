
-- 095_seguridad_transacciones_documento.sql
-- Núcleo transaccional ATS/PETAR. PDF/archivos se gestionan fuera de PostgreSQL.

create or replace function public.mv_seguridad_no_cumple_critico(p_checklist jsonb)
returns boolean
language sql
immutable
set search_path=public
as $$
  select exists(
    select 1
    from jsonb_array_elements(coalesce(p_checklist,'[]'::jsonb)) x
    where lower(coalesce(x->>'critico','false')) in ('true','1','si','sí')
      and public.mv_actividad_texto(x->>'estado')='NO CUMPLE'
  );
$$;

create or replace function public.mv_seguridad_validar_completo(p_ats_id text)
returns boolean
language plpgsql
stable
set search_path=public
as $$
declare
  a public.seguridad_ats_migracion%rowtype;
  p public.seguridad_petar_migracion%rowtype;
  x jsonb;
  estado_item text;
begin
  select * into a
  from public.seguridad_ats_migracion
  where id=p_ats_id;

  if not found then raise exception 'ATS no encontrado'; end if;

  if coalesce(trim(a.trabajo),'')='' then raise exception 'Complete el trabajo a realizar'; end if;
  if coalesce(trim(a.lugar_trabajo),'')='' then raise exception 'Complete el lugar de trabajo'; end if;
  if jsonb_array_length(coalesce(a.epp_json,'[]'::jsonb))=0 then raise exception 'Seleccione al menos un EPP'; end if;
  if jsonb_array_length(coalesce(a.tareas_json,'[]'::jsonb))=0 then raise exception 'Seleccione al menos una tarea'; end if;

  for x in select value from jsonb_array_elements(coalesce(a.tareas_json,'[]'::jsonb))
  loop
    if coalesce(trim(x->>'tarea'),'')='' then
      raise exception 'Existe una tarea sin descripción';
    end if;
    if jsonb_typeof(coalesce(x->'danos','[]'::jsonb))<>'array'
       or jsonb_array_length(coalesce(x->'danos','[]'::jsonb))=0 then
      raise exception 'Falta confirmar posibles daños de: %',x->>'tarea';
    end if;
    if coalesce(trim(x->>'controles'),'')='' then
      raise exception 'Falta confirmar medidas de control de: %',x->>'tarea';
    end if;
  end loop;

  if coalesce(a.petar_id,'')<>'' then
    select * into p
    from public.seguridad_petar_migracion
    where id=a.petar_id;

    if found then
      if jsonb_array_length(coalesce(p.epp_json,'[]'::jsonb))=0 then
        raise exception 'Seleccione al menos un EPP requerido para PETAR';
      end if;

      for x in select value from jsonb_array_elements(coalesce(p.checklist_json,'[]'::jsonb))
      loop
        estado_item:=public.mv_actividad_texto(x->>'estado');
        if estado_item not in ('CUMPLE','NO CUMPLE','NO APLICA') then
          raise exception 'Complete toda la lista de verificación del PETAR';
        end if;
        if estado_item='NO CUMPLE'
           and coalesce(trim(x->>'observacion'),'')='' then
          raise exception 'Todo NO CUMPLE del PETAR debe tener observación';
        end if;
      end loop;

      if public.mv_seguridad_no_cumple_critico(p.checklist_json) then
        raise exception 'Existe un NO CUMPLE crítico. El trabajo no puede autorizarse hasta corregir la condición';
      end if;
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.mv_seguridad_guardar_ats(
  p_usuario text,
  p_id text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  a public.seguridad_ats_migracion%rowtype;
  petar_data jsonb;
  checklist_nuevo jsonb;
  epp_petar_nuevo jsonb;
  critico boolean:=false;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if u->>'perfil'<>'TECNICO' or not coalesce((u->>'puedeRegistrar')::boolean,false) then
    raise exception 'Solo Técnico puede editar ATS/PETAR';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;
  if public.mv_actividad_cuadrilla_norm(a.cuadrilla)<>public.mv_actividad_cuadrilla_norm(u->>'cuadrilla') then
    raise exception 'El ATS no pertenece a su cuadrilla';
  end if;
  if a.estado not in ('BORRADOR','OBSERVADO') then
    raise exception 'El ATS ya no está disponible para edición';
  end if;

  update public.seguridad_ats_migracion
  set trabajo=coalesce(nullif(trim(p_data->>'trabajo'),''),trabajo),
      lugar_trabajo=coalesce(nullif(trim(p_data->>'lugarTrabajo'),''),lugar_trabajo),
      hora_inicio=coalesce(public.mv_seguridad_time(to_jsonb(nullif(trim(p_data->>'horaInicio'),''))),hora_inicio),
      hora_final=public.mv_seguridad_time(to_jsonb(nullif(trim(p_data->>'horaFinal'),''))),
      herramientas_json=case
        when jsonb_typeof(p_data->'herramientas')='array' then p_data->'herramientas'
        else herramientas_json
      end,
      epp_json=case
        when jsonb_typeof(p_data->'epp')='array' then p_data->'epp'
        else epp_json
      end,
      tareas_json=case
        when jsonb_typeof(p_data->'tareas')='array' then p_data->'tareas'
        else tareas_json
      end,
      actualizado_en=now(),
      updated_at=now()
  where id=p_id;

  petar_data:=p_data->'petar';
  if petar_data is not null
     and jsonb_typeof(petar_data)='object'
     and coalesce(a.petar_id,'')<>'' then
    select
      case when jsonb_typeof(petar_data->'checklist')='array' then petar_data->'checklist' else p.checklist_json end,
      case when jsonb_typeof(petar_data->'epp')='array' then petar_data->'epp' else p.epp_json end
    into checklist_nuevo,epp_petar_nuevo
    from public.seguridad_petar_migracion p
    where p.id=a.petar_id;

    critico:=public.mv_seguridad_no_cumple_critico(checklist_nuevo);

    update public.seguridad_petar_migracion
    set trabajo=coalesce((select trabajo from public.seguridad_ats_migracion where id=p_id),trabajo),
        ubicacion=coalesce((select lugar_trabajo from public.seguridad_ats_migracion where id=p_id),ubicacion),
        hora_inicio=coalesce((select hora_inicio from public.seguridad_ats_migracion where id=p_id),hora_inicio),
        hora_final=(select hora_final from public.seguridad_ats_migracion where id=p_id),
        checklist_json=coalesce(checklist_nuevo,checklist_json),
        epp_json=coalesce(epp_petar_nuevo,epp_json),
        no_cumple_critico=case when critico then 'SI' else 'NO' end,
        actualizado_en=now(),
        updated_at=now()
    where id=a.petar_id;
  end if;

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    p_id,a.petar_id,'GUARDAR_BORRADOR',u->>'usuario',u->>'perfil',
    jsonb_build_object('estado',a.estado),'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','GUARDAR_ATS',
    'id',p_id,'estado',a.estado
  );
end;
$$;

create or replace function public.mv_seguridad_aceptar_ats(
  p_usuario text,
  p_id text,
  p_gps text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  a public.seguridad_ats_migracion%rowtype;
  firma jsonb;
  acept jsonb;
  usuario_u text;
  nombre_u text;
  cargo_u text;
  ya boolean:=false;
  aceptados integer;
  total integer;
  nuevo_estado text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);
  usuario_u:=u->>'usuario';
  nombre_u:=u->>'nombresApellidos';

  if u->>'perfil'<>'TECNICO' then
    raise exception 'Solo un integrante técnico puede aceptar el ATS/PETAR';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  if public.mv_actividad_cuadrilla_norm(a.cuadrilla)<>public.mv_actividad_cuadrilla_norm(u->>'cuadrilla') then
    raise exception 'El ATS no pertenece a su cuadrilla';
  end if;

  if usuario_u not in (coalesce(a.t1_usuario,''),coalesce(a.t2_usuario,'')) then
    raise exception 'El usuario no forma parte de este ATS';
  end if;

  if a.estado not in ('BORRADOR','OBSERVADO','PENDIENTE ACEPTACION','PENDIENTE SUPERVISOR') then
    raise exception 'El ATS ya no admite aceptación técnica';
  end if;

  perform public.mv_seguridad_validar_completo(p_id);

  firma:=public.mv_seguridad_firma_activa_json(usuario_u);
  if not coalesce((firma->>'activa')::boolean,false) or coalesce(firma->>'url','')='' then
    raise exception 'Debe registrar su firma digital antes de aceptar';
  end if;

  select exists(
    select 1
    from jsonb_array_elements(coalesce(a.aceptaciones_json,'[]'::jsonb)) x
    where public.mv_bono_sup_usuario_key(x->>'usuario')=usuario_u
  ) into ya;

  if not ya then
    cargo_u:=case when usuario_u=a.t1_usuario then 'T1' else 'T2' end;

    acept:=jsonb_build_object(
      'usuario',usuario_u,
      'nombre',coalesce(nombre_u,''),
      'cargo',cargo_u,
      'gps',coalesce(p_gps,''),
      'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
      'firma',firma,
      'autocompletada','NO'
    );

    a.aceptaciones_json:=coalesce(a.aceptaciones_json,'[]'::jsonb)||jsonb_build_array(acept);
  end if;

  aceptados:=public.mv_seguridad_aceptados(a.aceptaciones_json);
  total:=public.mv_seguridad_total_integrantes(a);
  nuevo_estado:=case when total>0 and aceptados>=total then 'PENDIENTE SUPERVISOR' else 'PENDIENTE ACEPTACION' end;

  update public.seguridad_ats_migracion
  set aceptaciones_json=a.aceptaciones_json,
      estado=nuevo_estado,
      observacion=case when a.estado='OBSERVADO' then '' else observacion end,
      actualizado_en=now(),
      updated_at=now()
  where id=p_id;

  if coalesce(a.petar_id,'')<>'' then
    update public.seguridad_petar_migracion
    set estado=nuevo_estado,actualizado_en=now(),updated_at=now()
    where id=a.petar_id;
  end if;

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    p_id,a.petar_id,'ACEPTAR_TECNICO',usuario_u,u->>'perfil',
    jsonb_build_object('gps',coalesce(p_gps,''),'aceptados',aceptados,'total',total,'estado',nuevo_estado),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','ACEPTAR_ATS',
    'id',p_id,'estado',nuevo_estado,'aceptados',aceptados,'total',total
  );
end;
$$;

create or replace function public.mv_seguridad_autocompletar_aceptaciones(
  p_ats_id text,
  p_actor text,
  p_actor_perfil text,
  p_actor_nombre text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.seguridad_ats_migracion%rowtype;
  acept jsonb;
  firma jsonb;
  usuario_i text;
  nombre_i text;
  cargo_i text;
  ya boolean;
begin
  select * into a
  from public.seguridad_ats_migracion
  where id=p_ats_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;
  acept:=coalesce(a.aceptaciones_json,'[]'::jsonb);

  for usuario_i,nombre_i,cargo_i in
    select a.t1_usuario,a.t1_nombre,'T1'
    union all
    select a.t2_usuario,a.t2_nombre,'T2'
  loop
    if coalesce(trim(usuario_i),'')='' then continue; end if;

    select exists(
      select 1
      from jsonb_array_elements(acept) x
      where public.mv_bono_sup_usuario_key(x->>'usuario')=public.mv_bono_sup_usuario_key(usuario_i)
    ) into ya;

    if ya then continue; end if;

    firma:=public.mv_seguridad_firma_activa_json(usuario_i);
    if not coalesce((firma->>'activa')::boolean,false) or coalesce(firma->>'url','')='' then
      raise exception 'No se puede completar la firma faltante de %: no tiene firma digital activa',coalesce(nombre_i,usuario_i);
    end if;

    acept:=acept||jsonb_build_array(
      jsonb_build_object(
        'usuario',usuario_i,
        'nombre',coalesce(nombre_i,''),
        'cargo',cargo_i,
        'gps','',
        'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
        'firma',firma,
        'autocompletada','SI',
        'autorizadaPor',p_actor,
        'autorizadaNombre',coalesce(p_actor_nombre,''),
        'autorizadaPerfil',p_actor_perfil
      )
    );
  end loop;

  return acept;
end;
$$;

create or replace function public.mv_seguridad_revisar_supervisor(
  p_usuario text,
  p_id text,
  p_resultado text,
  p_motivo text default '',
  p_gps text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  a public.seguridad_ats_migracion%rowtype;
  resultado_u text:=public.mv_actividad_texto(p_resultado);
  motivo_u text:=trim(coalesce(p_motivo,''));
  firma jsonb;
  acept jsonb;
  nuevo_estado text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if u->>'perfil'<>'SUPERVISOR' then
    raise exception 'Solo Supervisor puede usar esta autorización';
  end if;

  if resultado_u not in ('AUTORIZAR','OBSERVAR','RECHAZAR') then
    raise exception 'Resultado de Supervisor no válido';
  end if;
  if resultado_u<>'AUTORIZAR' and motivo_u='' then
    raise exception 'Debe ingresar el motivo';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;
  if public.mv_actividad_texto(a.sede)<>public.mv_actividad_texto(u->>'sede') then
    raise exception 'Supervisor solo puede revisar ATS de su sede';
  end if;

  if resultado_u='AUTORIZAR' then
    if a.estado='FINALIZADO' then
      return jsonb_build_object(
        'ok',true,'modulo','SEGURIDAD','accion','REVISAR_SUPERVISOR',
        'id',p_id,'estado','FINALIZADO','pdfUrl',coalesce(a.pdf_url,''),
        'requierePdf',coalesce(a.pdf_url,'')=''
      );
    end if;

    if a.estado not in ('PENDIENTE ACEPTACION','PENDIENTE SUPERVISOR','PENDIENTE VALIDACION') then
      raise exception 'El ATS no está pendiente de autorización';
    end if;
    if public.mv_seguridad_aceptados(a.aceptaciones_json)<1 then
      raise exception 'Se requiere al menos una aceptación técnica';
    end if;

    perform public.mv_seguridad_validar_completo(p_id);

    firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');
    if not coalesce((firma->>'activa')::boolean,false) or coalesce(firma->>'url','')='' then
      raise exception 'Supervisor debe registrar su firma digital antes de autorizar';
    end if;

    acept:=public.mv_seguridad_autocompletar_aceptaciones(
      p_id,u->>'usuario',u->>'perfil',u->>'nombresApellidos'
    );

    update public.seguridad_ats_migracion
    set aceptaciones_json=acept,
        supervisor_firma_json=jsonb_build_object(
          'usuario',u->>'usuario',
          'nombre',coalesce(u->>'nombresApellidos',''),
          'perfil',u->>'perfil',
          'gps',coalesce(p_gps,''),
          'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
          'firma',firma
        ),
        estado='FINALIZADO',
        observacion='',
        actualizado_en=now(),
        updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set estado='FINALIZADO',actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;

    nuevo_estado:='FINALIZADO';
  elsif resultado_u='OBSERVAR' then
    if a.estado in ('FINALIZADO','CERRADO','RECHAZADO') then
      raise exception 'El ATS ya no puede observarse';
    end if;

    update public.seguridad_ats_migracion
    set estado='OBSERVADO',
        observacion=motivo_u,
        aceptaciones_json='[]'::jsonb,
        supervisor_firma_json=null,
        validador_firma_json=null,
        actualizado_en=now(),
        updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set estado='OBSERVADO',actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;
    nuevo_estado:='OBSERVADO';
  else
    if a.estado in ('FINALIZADO','CERRADO') then
      raise exception 'El ATS finalizado no puede rechazarse';
    end if;

    update public.seguridad_ats_migracion
    set estado='RECHAZADO',
        observacion=motivo_u,
        actualizado_en=now(),
        updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set estado='RECHAZADO',actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;
    nuevo_estado:='RECHAZADO';
  end if;

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    p_id,a.petar_id,'REVISION_SUPERVISOR',u->>'usuario',u->>'perfil',
    jsonb_build_object(
      'resultado',resultado_u,'motivo',motivo_u,'gps',coalesce(p_gps,''),'estado',nuevo_estado
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','REVISAR_SUPERVISOR',
    'id',p_id,'estado',nuevo_estado,
    'pdfUrl',coalesce((select pdf_url from public.seguridad_ats_migracion where id=p_id),''),
    'requierePdf',nuevo_estado='FINALIZADO' and coalesce((select pdf_url from public.seguridad_ats_migracion where id=p_id),'')=''
  );
end;
$$;

create or replace function public.mv_seguridad_validar_final(
  p_usuario text,
  p_id text,
  p_resultado text,
  p_motivo text default '',
  p_gps text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  a public.seguridad_ats_migracion%rowtype;
  resultado_u text:=public.mv_actividad_texto(p_resultado);
  motivo_u text:=trim(coalesce(p_motivo,''));
  firma jsonb;
  acept jsonb;
  nuevo_estado text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if not public.mv_seguridad_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura/Gerencia puede realizar la validación final';
  end if;

  if resultado_u not in ('VALIDAR','OBSERVAR','RECHAZAR') then
    raise exception 'Resultado final no válido';
  end if;
  if resultado_u<>'VALIDAR' and motivo_u='' then
    raise exception 'Debe ingresar el motivo';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  if resultado_u='VALIDAR' then
    if a.estado='FINALIZADO' then
      return jsonb_build_object(
        'ok',true,'modulo','SEGURIDAD','accion','VALIDAR_FINAL',
        'id',p_id,'estado','FINALIZADO','pdfUrl',coalesce(a.pdf_url,''),
        'requierePdf',coalesce(a.pdf_url,'')=''
      );
    end if;

    if a.estado not in ('PENDIENTE ACEPTACION','PENDIENTE SUPERVISOR','PENDIENTE VALIDACION') then
      raise exception 'El ATS no está pendiente de validación';
    end if;
    if public.mv_seguridad_aceptados(a.aceptaciones_json)<1 then
      raise exception 'Se requiere al menos una aceptación técnica';
    end if;

    perform public.mv_seguridad_validar_completo(p_id);

    firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');
    if not coalesce((firma->>'activa')::boolean,false) or coalesce(firma->>'url','')='' then
      raise exception 'El validador debe registrar su firma digital antes de cerrar';
    end if;

    acept:=public.mv_seguridad_autocompletar_aceptaciones(
      p_id,u->>'usuario',u->>'perfil',u->>'nombresApellidos'
    );

    update public.seguridad_ats_migracion
    set aceptaciones_json=acept,
        validador_firma_json=jsonb_build_object(
          'usuario',u->>'usuario',
          'nombre',coalesce(u->>'nombresApellidos',''),
          'perfil',u->>'perfil',
          'gps',coalesce(p_gps,''),
          'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
          'firma',firma
        ),
        estado='FINALIZADO',
        observacion='',
        actualizado_en=now(),
        updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set estado='FINALIZADO',actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;

    nuevo_estado:='FINALIZADO';
  elsif resultado_u='OBSERVAR' then
    if a.estado in ('FINALIZADO','CERRADO','RECHAZADO') then
      raise exception 'El ATS ya no puede observarse';
    end if;

    update public.seguridad_ats_migracion
    set estado='OBSERVADO',
        observacion=motivo_u,
        aceptaciones_json='[]'::jsonb,
        supervisor_firma_json=null,
        validador_firma_json=null,
        actualizado_en=now(),
        updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set estado='OBSERVADO',actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;
    nuevo_estado:='OBSERVADO';
  else
    if a.estado in ('FINALIZADO','CERRADO') then
      raise exception 'El ATS finalizado no puede rechazarse';
    end if;

    update public.seguridad_ats_migracion
    set estado='RECHAZADO',
        observacion=motivo_u,
        actualizado_en=now(),
        updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set estado='RECHAZADO',actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;
    nuevo_estado:='RECHAZADO';
  end if;

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  ) values (
    p_id,a.petar_id,'VALIDACION_FINAL',u->>'usuario',u->>'perfil',
    jsonb_build_object(
      'resultado',resultado_u,'motivo',motivo_u,'gps',coalesce(p_gps,''),'estado',nuevo_estado
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','SEGURIDAD','accion','VALIDAR_FINAL',
    'id',p_id,'estado',nuevo_estado,
    'pdfUrl',coalesce((select pdf_url from public.seguridad_ats_migracion where id=p_id),''),
    'requierePdf',nuevo_estado='FINALIZADO' and coalesce((select pdf_url from public.seguridad_ats_migracion where id=p_id),'')=''
  );
end;
$$;

revoke execute on function public.mv_seguridad_no_cumple_critico(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_validar_completo(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_guardar_ats(text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_aceptar_ats(text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_revisar_supervisor(text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_validar_final(text,text,text,text,text) from public,anon,authenticated;

grant execute on function public.mv_seguridad_no_cumple_critico(jsonb) to service_role;
grant execute on function public.mv_seguridad_validar_completo(text) to service_role;
grant execute on function public.mv_seguridad_guardar_ats(text,text,jsonb) to service_role;
grant execute on function public.mv_seguridad_aceptar_ats(text,text,text) to service_role;
grant execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_revisar_supervisor(text,text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_validar_final(text,text,text,text,text) to service_role;
