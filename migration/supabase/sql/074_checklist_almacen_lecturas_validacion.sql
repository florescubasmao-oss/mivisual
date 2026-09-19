
-- 074_checklist_almacen_lecturas_validacion.sql
-- Lecturas, catálogo, vencimientos y matriz de validación V141.

create or replace function public.mv_checklist_dias_vencimiento(p_fecha date)
returns integer
language sql
stable
set search_path=public
as $$
  select case
    when p_fecha is null then null
    else p_fecha - (clock_timestamp() at time zone 'America/Lima')::date
  end;
$$;

create or replace function public.mv_checklist_herramientas_json(p_checklist_id text)
returns jsonb
language sql
stable
set search_path=public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'idDetalle',d.id_detalle,
        'idChecklist',d.id_checklist,
        'fechaRegistro',case when d.fecha_registro is null then '' else to_char(d.fecha_registro at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS') end,
        'sede',coalesce(d.sede,''),
        'cuadrilla',coalesce(d.cuadrilla,''),
        'herramienta',coalesce(d.herramienta,''),
        'codigoSerie',coalesce(d.codigo_serie,''),
        'estado',coalesce(d.estado,''),
        'motivo',coalesce(d.motivo,''),
        'foto',coalesce(d.foto,''),
        'registradoPor',coalesce(d.registrado_por,''),
        'perfilRegistro',coalesce(d.perfil_registro,''),
        'cantidad',coalesce(d.cantidad,0)
      )
      order by d.id_detalle
    ),
    '[]'::jsonb
  )
  from public.checklist_herramientas_detalle_migracion d
  where d.id_checklist=p_checklist_id;
$$;

create or replace function public.mv_checklist_item_json(c public.checklist_almacen_migracion)
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  supervisor_out text:='';
  d1 integer;
  d2 integer;
  d3 integer;
  dmin integer;
  estado_venc text;
begin
  select coalesce(x.usuario_supervisor,'')
  into supervisor_out
  from public.mv_actividad_cuadrilla_ultima x
  where x.cuadrilla=public.mv_actividad_cuadrilla_norm(c.cuadrilla)
  limit 1;

  d1:=public.mv_checklist_dias_vencimiento(c.licencia_fecha_vencimiento);
  d2:=public.mv_checklist_dias_vencimiento(c.soat_fecha_vencimiento);
  d3:=public.mv_checklist_dias_vencimiento(c.revision_tecnica_fecha_vencimiento);

  select min(v) into dmin
  from unnest(array[d1,d2,d3]) v
  where v is not null;

  estado_venc:=case
    when dmin is null then 'NO APLICA'
    when dmin<0 then 'VENCIDO'
    when dmin<=30 then 'PROXIMO A VENCER'
    else 'VIGENTE'
  end;

  return jsonb_build_object(
    'id',coalesce(c.id,''),
    'fechaRegistro',case when c.fecha_registro is null then '' else to_char(c.fecha_registro,'DD/MM/YYYY') end,
    'horaRegistro',case when c.hora_registro is null then '' else to_char(c.hora_registro,'HH24:MI:SS') end,
    'usuario',coalesce(c.usuario,''),
    'nombresApellidos',coalesce(c.nombres_apellidos,''),
    'sede',coalesce(c.sede,''),
    'cuadrilla',coalesce(c.cuadrilla,''),
    'fechaGestion',case when c.fecha_gestion is null then '' else to_char(c.fecha_gestion,'YYYY-MM-DD') end,
    'estadoGeneral',coalesce(c.estado_general,''),
    'ontZte',coalesce(c.ont_zte,''),
    'fotosOntZte',coalesce(c.fotos_series_ont_zte,''),
    'ontHuawei',coalesce(c.ont_huawei,''),
    'fotosOntHuawei',coalesce(c.fotos_series_ont_huawei,''),
    'meshZte',coalesce(c.mesh_zte,''),
    'fotosMeshZte',coalesce(c.fotos_mesh_zte,''),
    'meshHuawei',coalesce(c.mesh_huawei,''),
    'fotosMeshHuawei',coalesce(c.fotos_mesh_huawei,''),
    'winbox',coalesce(c.winbox,''),
    'fotosWinbox',coalesce(c.foto_winbox,''),
    'fonowin',coalesce(c.fonowin,''),
    'fotosFonowin',coalesce(c.foto_fonowin,''),
    'cableDrop',coalesce(c.cable_drop,0),
    'pre50',coalesce(c.pre50,0),
    'pre100',coalesce(c.pre100,0),
    'pre150',coalesce(c.pre150,0),
    'pre200',coalesce(c.pre200,0),
    'anclajeP',coalesce(c.anclaje_p,0),
    'cintaBandIt',coalesce(c.cinta_band_it,0),
    'hebilla',coalesce(c.hebilla,0),
    'acoplador',coalesce(c.acoplador,0),
    'roseta',coalesce(c.roseta,0),
    'conectoresOpticos',coalesce(c.conectores_opticos,0),
    'templadores',coalesce(c.templadores,0),
    'splitter',coalesce(c.splitter,0),
    'clevis',coalesce(c.clevis,0),
    'utpCat5',coalesce(c.utp_cat5,0),
    'utpCat6',coalesce(c.utp_cat6,0),
    'patchApcApc',coalesce(c.patch_apc_apc,0),
    'patchUpcApc',coalesce(c.patch_upc_apc,0),
    'rj45',coalesce(c.rj45,0),
    'resultadoAlmacen',coalesce(c.resultado_almacen,''),
    'motivoAlmacen',coalesce(c.motivo_almacen,''),
    'validadoAlmacenPor',coalesce(c.validado_almacen_por,''),
    'fechaValidacionAlmacen',case when c.fecha_validacion_almacen is null then '' else to_char(c.fecha_validacion_almacen,'DD/MM/YYYY') end,
    'horaValidacionAlmacen',case when c.hora_validacion_almacen is null then '' else to_char(c.hora_validacion_almacen,'HH24:MI:SS') end,
    'resultadoJefatura',coalesce(c.resultado_jefatura,''),
    'motivoJefatura',coalesce(c.motivo_jefatura,''),
    'validadoJefaturaPor',coalesce(c.validado_jefatura_por,''),
    'fechaValidacionJefatura',case when c.fecha_validacion_jefatura is null then '' else to_char(c.fecha_validacion_jefatura,'DD/MM/YYYY') end,
    'horaValidacionJefatura',case when c.hora_validacion_jefatura is null then '' else to_char(c.hora_validacion_jefatura,'HH24:MI:SS') end,
    'version',c.version,
    'origenRegistro',coalesce(c.origen_registro,'TECNICO'),
    'registradoPor',coalesce(c.registrado_por,c.usuario,''),
    'perfilRegistro',coalesce(c.perfil_registro,'TECNICO'),
    'comentarioFinal',coalesce(c.comentario_final,''),
    'tipoChecklist',coalesce(c.tipo_checklist,'MATERIALES'),
    'resultadoHerramientas',coalesce(c.resultado_herramientas,''),
    'observacionHerramientas',coalesce(c.observacion_herramientas,''),
    'fotoUnidadFrente',coalesce(c.foto_unidad_frente,''),
    'fotoUnidadPosterior',coalesce(c.foto_unidad_posterior,''),
    'fotoUnidadLadoIzquierdo',coalesce(c.foto_unidad_lado_izquierdo,''),
    'fotoUnidadLadoDerecho',coalesce(c.foto_unidad_lado_derecho,''),
    'fotoExtintor',coalesce(c.foto_extintor,''),
    'fotoBotiquin',coalesce(c.foto_botiquin,''),
    'fotoRejaSeparadora',coalesce(c.foto_reja_separadora,''),
    'fotoParrilla1',coalesce(c.foto_parrilla_1,''),
    'fotoParrilla2',coalesce(c.foto_parrilla_2,''),
    'resultadoUnidad',coalesce(c.resultado_unidad,''),
    'observacionUnidad',coalesce(c.observacion_unidad,''),
    'licenciaFechaVencimiento',case when c.licencia_fecha_vencimiento is null then '' else to_char(c.licencia_fecha_vencimiento,'YYYY-MM-DD') end,
    'licenciaFotoFrente',coalesce(c.licencia_foto_frente,''),
    'licenciaFotoReverso',coalesce(c.licencia_foto_reverso,''),
    'soatFechaVencimiento',case when c.soat_fecha_vencimiento is null then '' else to_char(c.soat_fecha_vencimiento,'YYYY-MM-DD') end,
    'soatArchivo',coalesce(c.soat_archivo,''),
    'revisionTecnicaFechaVencimiento',case when c.revision_tecnica_fecha_vencimiento is null then '' else to_char(c.revision_tecnica_fecha_vencimiento,'YYYY-MM-DD') end,
    'revisionTecnicaArchivo',coalesce(c.revision_tecnica_archivo,''),
    'resultadoDocumentacion',coalesce(c.resultado_documentacion,''),
    'observacionDocumentacion',coalesce(c.observacion_documentacion,''),
    'fotoPersonalCompleto',coalesce(c.foto_personal_completo,''),
    'fotoBotas',coalesce(c.foto_botas,''),
    'fotoFotocheck',coalesce(c.foto_fotocheck,''),
    'resultadoEpp',coalesce(c.resultado_epp,''),
    'observacionEpp',coalesce(c.observacion_epp,''),
    'herramientasDetalle',public.mv_checklist_herramientas_json(c.id),
    'supervisor',supervisor_out,
    'diasVencimientoMinimo',dmin,
    'estadoVencimiento',estado_venc
  );
end;
$$;

create or replace function public.mv_checklist_listar(p_usuario text,p_filtros jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil_u text;
  sede_u text;
  cuadrilla_u text;
  arr jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  sede_u:=u->>'sede';
  cuadrilla_u:=u->>'cuadrilla';

  if perfil_u not in ('TECNICO','ALMACEN','SUPERVISOR','JEFATURA ALMACEN','JEFATURA','ADMIN','ADMINISTRADOR') then
    raise exception 'No tienes permiso para ver Checklist Almacén';
  end if;

  select coalesce(
    jsonb_agg(public.mv_checklist_item_json(c) order by c.source_row desc nulls first,c.created_at desc),
    '[]'::jsonb
  )
  into arr
  from public.checklist_almacen_migracion c
  where
    (
      (perfil_u='TECNICO' and public.mv_actividad_cuadrilla_norm(c.cuadrilla)=cuadrilla_u)
      or (perfil_u in ('ALMACEN','SUPERVISOR') and public.mv_actividad_texto(c.sede)=sede_u)
      or (perfil_u in ('JEFATURA ALMACEN','JEFATURA','ADMIN','ADMINISTRADOR'))
    )
    and (perfil_u<>'ALMACEN' or c.tipo_checklist in ('MATERIALES','HERRAMIENTAS'))
    and (coalesce(p_filtros->>'sede','')='' or public.mv_actividad_texto(c.sede)=public.mv_actividad_texto(p_filtros->>'sede'))
    and (coalesce(p_filtros->>'cuadrilla','')='' or public.mv_actividad_cuadrilla_norm(c.cuadrilla)=public.mv_actividad_cuadrilla_norm(p_filtros->>'cuadrilla'))
    and (coalesce(p_filtros->>'estado','')='' or public.mv_actividad_texto(c.estado_general)=public.mv_actividad_texto(p_filtros->>'estado'))
    and (coalesce(p_filtros->>'tipoChecklist','')='' or c.tipo_checklist=public.mv_checklist_tipo(p_filtros->>'tipoChecklist'));

  return jsonb_build_object(
    'ok',true,
    'modulo','CHECKLIST_ALMACEN',
    'accion','LISTAR',
    'perfil',perfil_u,
    'registros',jsonb_array_length(arr),
    'checklist',arr
  );
end;
$$;

create or replace function public.mv_checklist_catalogo_herramientas(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil_u text;
  arr jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';

  if perfil_u not in ('TECNICO','SUPERVISOR','ALMACEN','JEFATURA ALMACEN','JEFATURA','ADMIN','ADMINISTRADOR') then
    raise exception 'No tienes acceso al catálogo de herramientas';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'herramienta',herramienta,
        'categoria',coalesce(categoria,''),
        'requiereSerie',coalesce(requiere_serie,'NO')
      )
      order by source_row,herramienta
    ),
    '[]'::jsonb
  )
  into arr
  from public.catalogo_herramientas_migracion
  where public.mv_actividad_texto(coalesce(estado,'ACTIVO'))='ACTIVO';

  return jsonb_build_object(
    'ok',true,'modulo','CHECKLIST_ALMACEN','accion','CATALOGO_HERRAMIENTAS',
    'registros',jsonb_array_length(arr),'herramientas',arr
  );
end;
$$;

create or replace function public.mv_checklist_validar(
  p_usuario text,
  p_id text,
  p_resultado text,
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil_u text;
  sede_u text;
  usuario_u text;
  resultado_u text;
  motivo_u text;
  c public.checklist_almacen_migracion%rowtype;
  tipo_u text;
  es_material boolean;
  es_operativo boolean;
  hoy date;
  ahora time;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  sede_u:=u->>'sede';
  usuario_u:=u->>'usuario';
  resultado_u:=public.mv_actividad_texto(p_resultado);
  motivo_u:=trim(coalesce(p_motivo,''));

  if coalesce(trim(p_id),'')='' then raise exception 'ID obligatorio'; end if;

  select *
  into c
  from public.checklist_almacen_migracion
  where id=p_id
  for update;

  if not found then raise exception 'No se encontró el checklist: %',p_id; end if;

  tipo_u:=public.mv_checklist_tipo(c.tipo_checklist);
  es_material:=tipo_u in ('MATERIALES','HERRAMIENTAS');
  es_operativo:=tipo_u in ('UNIDAD VEHICULAR','DOCUMENTACION','EPP');
  hoy:=(clock_timestamp() at time zone 'America/Lima')::date;
  ahora:=(clock_timestamp() at time zone 'America/Lima')::time(0);

  if perfil_u='ALMACEN' then
    if not es_material then raise exception 'Almacén solo valida Materiales y Herramientas'; end if;
    if public.mv_actividad_texto(c.sede)<>sede_u then raise exception 'Almacén solo puede validar checklist de su sede'; end if;
    if resultado_u not in ('VISTO BUENO','OBSERVADO') then raise exception 'Resultado no válido para Almacén'; end if;
    if resultado_u='OBSERVADO' and motivo_u='' then raise exception 'Debe ingresar el motivo'; end if;

    update public.checklist_almacen_migracion
    set resultado_almacen=resultado_u,
        motivo_almacen=case when resultado_u='OBSERVADO' then motivo_u else '' end,
        validado_almacen_por=usuario_u,
        fecha_validacion_almacen=hoy,
        hora_validacion_almacen=ahora,
        estado_general=case when resultado_u='VISTO BUENO' then 'VISTO BUENO ALMACEN' else 'OBSERVADO ALMACEN' end,
        updated_at=now()
    where id=p_id;

  elsif perfil_u='SUPERVISOR' then
    if not es_operativo then raise exception 'Supervisor valida Unidad Vehicular, Documentación y EPP'; end if;
    if public.mv_actividad_texto(c.sede)<>sede_u then raise exception 'Supervisor solo puede validar checklist de su sede'; end if;
    if resultado_u not in ('CONFORME','OBSERVADO') then raise exception 'Resultado no válido para Supervisor'; end if;
    if motivo_u='' then
      if resultado_u='CONFORME' then raise exception 'Debe ingresar el comentario de conformidad';
      else raise exception 'Debe ingresar el motivo de observación'; end if;
    end if;

    update public.checklist_almacen_migracion
    set resultado_almacen=resultado_u,
        motivo_almacen=motivo_u,
        validado_almacen_por=usuario_u,
        fecha_validacion_almacen=hoy,
        hora_validacion_almacen=ahora,
        estado_general=case when resultado_u='CONFORME' then 'CONFORME SUPERVISOR' else 'OBSERVADO SUPERVISOR' end,
        updated_at=now()
    where id=p_id;

  elsif perfil_u='JEFATURA ALMACEN' then
    if not es_material then raise exception 'Jefatura de Almacén solo valida Materiales y Herramientas'; end if;
    if resultado_u not in ('CONFORME','OBSERVADO') then raise exception 'Resultado no válido para Jefatura de Almacén'; end if;
    if motivo_u='' then
      if resultado_u='CONFORME' then raise exception 'Debe ingresar el comentario de conformidad';
      else raise exception 'Debe ingresar el motivo de observación'; end if;
    end if;

    update public.checklist_almacen_migracion
    set resultado_jefatura=resultado_u,
        motivo_jefatura=motivo_u,
        validado_jefatura_por=usuario_u,
        fecha_validacion_jefatura=hoy,
        hora_validacion_jefatura=ahora,
        estado_general=case when resultado_u='CONFORME' then 'CONFORME' else 'OBSERVADO JEFATURA' end,
        updated_at=now()
    where id=p_id;

  elsif perfil_u in ('JEFATURA','ADMIN','ADMINISTRADOR') then
    if not es_operativo then raise exception 'Jefatura General valida Unidad Vehicular, Documentación y EPP'; end if;
    if resultado_u not in ('CONFORME','OBSERVADO') then raise exception 'Resultado no válido para Jefatura'; end if;
    if motivo_u='' then
      if resultado_u='CONFORME' then raise exception 'Debe ingresar el comentario de conformidad';
      else raise exception 'Debe ingresar el motivo de observación'; end if;
    end if;

    update public.checklist_almacen_migracion
    set resultado_jefatura=resultado_u,
        motivo_jefatura=motivo_u,
        validado_jefatura_por=usuario_u,
        fecha_validacion_jefatura=hoy,
        hora_validacion_jefatura=ahora,
        estado_general=case when resultado_u='CONFORME' then 'CONFORME' else 'OBSERVADO JEFATURA' end,
        updated_at=now()
    where id=p_id;

  else
    raise exception 'No tienes permiso para validar este tipo de checklist';
  end if;

  insert into public.checklist_almacen_eventos_migracion(
    checklist_id,evento,usuario,perfil,detalle,source_kind
  ) values (
    p_id,'VALIDAR',usuario_u,perfil_u,
    jsonb_build_object(
      'tipoChecklist',tipo_u,
      'resultado',resultado_u,
      'motivo',motivo_u
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'modulo','CHECKLIST_ALMACEN',
    'accion','VALIDAR',
    'id',p_id,
    'resultado',resultado_u,
    'tipoChecklist',tipo_u
  );
end;
$$;

revoke execute on function public.mv_checklist_dias_vencimiento(date) from public,anon,authenticated;
revoke execute on function public.mv_checklist_herramientas_json(text) from public,anon,authenticated;
revoke execute on function public.mv_checklist_item_json(public.checklist_almacen_migracion) from public,anon,authenticated;
revoke execute on function public.mv_checklist_listar(text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_checklist_catalogo_herramientas(text) from public,anon,authenticated;
revoke execute on function public.mv_checklist_validar(text,text,text,text) from public,anon,authenticated;

grant execute on function public.mv_checklist_dias_vencimiento(date) to service_role;
grant execute on function public.mv_checklist_herramientas_json(text) to service_role;
grant execute on function public.mv_checklist_item_json(public.checklist_almacen_migracion) to service_role;
grant execute on function public.mv_checklist_listar(text,jsonb) to service_role;
grant execute on function public.mv_checklist_catalogo_herramientas(text) to service_role;
grant execute on function public.mv_checklist_validar(text,text,text,text) to service_role;
