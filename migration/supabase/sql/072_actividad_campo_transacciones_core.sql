
-- 072_actividad_campo_transacciones_core.sql
-- Registro transaccional de Actividad en Campo.
-- CHECKLIST queda bloqueado hasta integrar CHECKLIST_ALMACEN en PostgreSQL.

create or replace function public.mv_actividad_validar_si_no(v text,p_campo text)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare x text;
begin
  x:=public.mv_actividad_texto(v);
  if x='' then return ''; end if;
  if x in ('SI','NO','NO APLICA','NA','N/A') then return x; end if;
  raise exception '% no válido. Usa SI, NO o NO APLICA',p_campo;
end;
$$;

create or replace function public.mv_actividad_generar_id()
returns text
language sql
volatile
set search_path=public
as $$
  select 'ACT-'||to_char(clock_timestamp() at time zone 'America/Lima','YYYYMMDDHH24MISSMS');
$$;

create or replace function public.mv_actividad_registrar(p_usuario text,p_data jsonb)
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
  cuadrilla_in text;
  datos_cuadrilla public.mv_actividad_cuadrilla_ultima%rowtype;
  tipo_actividad text;
  estado_instalacion text;
  v_id text;
  v_fecha date;
  v_hora time;
  auditoria jsonb:=null;
  puntajes jsonb:=null;
  tipo_orden text:='';
  requiere text:='';
  estado_auditoria text:='';
  observaciones_texto text:='';
  foto1 text:='';
  foto2 text:='';
  foto3 text:='';
  foto4 text:='';
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  sede_u:=u->>'sede';
  usuario_u:=u->>'usuario';

  if perfil_u not in ('SUPERVISOR','JEFATURA','ADMIN','ADMINISTRADOR') then
    raise exception 'Solo Supervisor o Jefatura pueden registrar actividad en campo';
  end if;

  cuadrilla_in:=public.mv_actividad_cuadrilla_norm(p_data->>'cuadrilla');
  if cuadrilla_in='' then raise exception 'Debe seleccionar una cuadrilla'; end if;

  select *
  into datos_cuadrilla
  from public.mv_actividad_cuadrilla_ultima x
  where x.cuadrilla=cuadrilla_in
  limit 1;

  if not found then
    raise exception 'No se encontró la cuadrilla en USUARIOS: %',cuadrilla_in;
  end if;

  if perfil_u='SUPERVISOR' and public.mv_actividad_texto(datos_cuadrilla.sede)<>sede_u then
    raise exception 'Supervisor solo puede registrar actividades de su sede';
  end if;

  tipo_actividad:=public.mv_actividad_tipo_canonico(
    coalesce(
      nullif(p_data->>'tipoActividad',''),
      nullif(p_data->>'tipo_actividad',''),
      nullif(p_data->>'tipo',''),
      'AUDITORIA EN FRIO'
    )
  );

  if tipo_actividad not in (
    'AUDITORIA EN FRIO','AUDITORIA EN CALIENTE','SEGUIMIENTO',
    'VALIDACION DE OBSERVACION','CAPACITACION','CHECKLIST'
  ) then
    raise exception 'Tipo de actividad no válido';
  end if;

  if tipo_actividad='CHECKLIST' then
    raise exception 'CHECKLIST_ALMACEN pendiente de integración PostgreSQL; no se registra Actividad en Campo para evitar datos huérfanos';
  end if;

  estado_instalacion:=public.mv_actividad_texto(
    coalesce(p_data->>'estadoInstalacion',p_data->>'estado_instalacion','')
  );

  if tipo_actividad='AUDITORIA EN FRIO'
     and estado_instalacion not in ('FINALIZADA','CANCELADA','REPROGRAMADA') then
    raise exception 'Estado de instalación no válido. Usa FINALIZADA, CANCELADA o REPROGRAMADA';
  end if;

  if public.mv_actividad_es_auditoria(tipo_actividad) then
    auditoria:=coalesce(p_data->'auditoria','{}'::jsonb);
    tipo_orden:=public.mv_actividad_texto(
      coalesce(nullif(auditoria->>'tipoOrden',''),p_data->>'tipoOrden','')
    );

    if tipo_orden not in ('ALTA','VT','GARANTIA','PEXT','VTR') then
      raise exception 'Seleccione el tipo de orden de la auditoría';
    end if;

    puntajes:=public.mv_actividad_calcular_puntajes(auditoria);
    requiere:=case
      when public.mv_actividad_texto(coalesce(auditoria->>'requiereSeguimiento','NO'))='SI' then 'SI'
      else 'NO'
    end;
    estado_auditoria:=case
      when requiere='SI' then 'EN SEGUIMIENTO'
      else puntajes->>'clasificacion'
    end;

    auditoria:=auditoria || jsonb_build_object(
      'tipoOrden',tipo_orden,
      'tipoAuditoria',tipo_actividad,
      'puntajes',puntajes,
      'clasificacion',puntajes->>'clasificacion',
      'seguridadCritica',(puntajes->>'seguridadCritica')::boolean,
      'requiereSeguimiento',requiere,
      'estadoAuditoria',estado_auditoria,
      'fechaCompromiso',coalesce(auditoria->>'fechaCompromiso',''),
      'responsableSubsanar',trim(coalesce(auditoria->>'responsableSubsanar','')),
      'accionesCorrectivas',trim(coalesce(auditoria->>'accionesCorrectivas',''))
    );
  end if;

  v_id:=public.mv_actividad_generar_id();
  v_fecha:=(clock_timestamp() at time zone 'America/Lima')::date;
  v_hora:=(clock_timestamp() at time zone 'America/Lima')::time(0);

  observaciones_texto:=coalesce(p_data->>'observaciones','');

  foto1:=coalesce(p_data->>'foto1Url',case when jsonb_typeof(p_data->'foto1')='string' then p_data->>'foto1' else '' end,'');
  foto2:=coalesce(p_data->>'foto2Url',case when jsonb_typeof(p_data->'foto2')='string' then p_data->>'foto2' else '' end,'');
  foto3:=coalesce(p_data->>'foto3Url',p_data->>'fotoActaUrl',case when jsonb_typeof(p_data->'foto3')='string' then p_data->>'foto3' else '' end,'');
  foto4:=coalesce(p_data->>'foto4Url',case when jsonb_typeof(p_data->'foto4')='string' then p_data->>'foto4' else '' end,'');

  insert into public.actividad_campo_migracion(
    id,source_row,fecha,hora,sede,supervisor,cuadrilla,tipo_actividad_original,tipo_actividad,
    cliente_presente,dni_validado,estado_instalacion,drop_metraje,templadores,reserva_cable,
    potencia_conforme,velocidad_conforme,limpieza_trabajo,cliente_conforme,observaciones,
    foto_1,foto_2,foto_acta,tipo_orden,codigo_pedido,dni_cliente,cliente,direccion,ticket,
    auditoria_json,puntaje_calidad,puntaje_seguridad,puntaje_cliente,puntaje_orden_limpieza,
    puntaje_total,clasificacion,requiere_seguimiento,fecha_compromiso,responsable_subsanar,
    estado_auditoria,acciones_correctivas,foto_4,desc_foto_1,desc_foto_2,desc_foto_3,desc_foto_4,
    source_kind,created_at,updated_at
  ) values (
    v_id,null,v_fecha,v_hora,
    coalesce(nullif(datos_cuadrilla.sede,''),sede_u),
    usuario_u,
    cuadrilla_in,
    tipo_actividad,
    tipo_actividad,
    public.mv_actividad_validar_si_no(coalesce(p_data->>'clientePresente',p_data->>'cliente_presente',''),'Cliente presente'),
    public.mv_actividad_validar_si_no(coalesce(p_data->>'dniValidado',p_data->>'dni_validado',''),'DNI validado'),
    estado_instalacion,
    coalesce(p_data->>'dropMetraje',p_data->>'drop_metraje',''),
    coalesce(p_data->>'templadores',''),
    public.mv_actividad_validar_si_no(coalesce(p_data->>'reservaCable',p_data->>'reserva_cable',''),'Reserva de cable'),
    public.mv_actividad_validar_si_no(coalesce(p_data->>'potenciaConforme',p_data->>'potencia_conforme',''),'Potencia conforme'),
    public.mv_actividad_validar_si_no(coalesce(p_data->>'velocidadConforme',p_data->>'velocidad_conforme',''),'Velocidad conforme'),
    public.mv_actividad_validar_si_no(coalesce(p_data->>'limpiezaTrabajo',p_data->>'limpieza_trabajo',''),'Limpieza del trabajo'),
    public.mv_actividad_validar_si_no(coalesce(p_data->>'clienteConforme',p_data->>'cliente_conforme',''),'Cliente conforme'),
    observaciones_texto,
    foto1,foto2,foto3,
    case when auditoria is null then null else tipo_orden end,
    case when auditoria is null then null else nullif(auditoria->>'codigoPedido','') end,
    case when auditoria is null then null else nullif(auditoria->>'dniCliente','') end,
    case when auditoria is null then null else nullif(auditoria->>'cliente','') end,
    case when auditoria is null then null else nullif(auditoria->>'direccion','') end,
    case when auditoria is null then null else nullif(auditoria->>'ticket','') end,
    auditoria,
    case when puntajes is null then null else (puntajes->>'calidad')::numeric end,
    case when puntajes is null then null else (puntajes->>'seguridad')::numeric end,
    case when puntajes is null then null else (puntajes->>'cliente')::numeric end,
    case when puntajes is null then null else (puntajes->>'ordenLimpieza')::numeric end,
    case when puntajes is null then null else (puntajes->>'total')::numeric end,
    case when puntajes is null then null else puntajes->>'clasificacion' end,
    case when auditoria is null then null else requiere end,
    case when auditoria is null then null else auditoria->>'fechaCompromiso' end,
    case when auditoria is null then null else auditoria->>'responsableSubsanar' end,
    case when auditoria is null then null else estado_auditoria end,
    case when auditoria is null then null else auditoria->>'accionesCorrectivas' end,
    foto4,
    coalesce(p_data->>'descFoto1',''),
    coalesce(p_data->>'descFoto2',''),
    coalesce(p_data->>'descFoto3',''),
    coalesce(p_data->>'descFoto4',''),
    'POSTGRESQL',now(),now()
  );

  insert into public.actividad_campo_eventos_migracion(
    actividad_id,evento,usuario,detalle,source_kind
  ) values (
    v_id,'REGISTRAR',usuario_u,
    jsonb_build_object(
      'tipoActividad',tipo_actividad,
      'cuadrilla',cuadrilla_in,
      'sede',coalesce(nullif(datos_cuadrilla.sede,''),sede_u),
      'clasificacion',case when puntajes is null then '' else puntajes->>'clasificacion' end,
      'puntajeTotal',case when puntajes is null then null else (puntajes->>'total')::numeric end
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'modulo','ACTIVIDAD_CAMPO',
    'accion','REGISTRAR',
    'id',v_id,
    'carpeta','',
    'checklistId','',
    'puntajeTotal',case when puntajes is null then to_jsonb(''::text) else to_jsonb((puntajes->>'total')::numeric) end,
    'clasificacion',case when puntajes is null then '' else puntajes->>'clasificacion' end
  );
end;
$$;

revoke execute on function public.mv_actividad_validar_si_no(text,text)
from public,anon,authenticated;
revoke execute on function public.mv_actividad_generar_id()
from public,anon,authenticated;
revoke execute on function public.mv_actividad_registrar(text,jsonb)
from public,anon,authenticated;

grant execute on function public.mv_actividad_validar_si_no(text,text)
to service_role;
grant execute on function public.mv_actividad_generar_id()
to service_role;
grant execute on function public.mv_actividad_registrar(text,jsonb)
to service_role;
