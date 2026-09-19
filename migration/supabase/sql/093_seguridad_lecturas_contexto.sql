
-- 093_seguridad_lecturas_contexto.sql
-- Lecturas seguras y contexto del módulo Seguridad ATS/PETAR.

create or replace function public.mv_seguridad_es_jefatura(p_perfil text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select public.mv_actividad_texto(p_perfil) in (
    'JEFATURA','JEFATURA GENERAL','JEFATURA OPERACIONES','JEFATURA DE OPERACIONES',
    'GERENCIA LIMA','GERENCIA GENERAL','GERENCIAL GENERAL','ADMIN','ADMINISTRADOR'
  );
$$;

create or replace function public.mv_seguridad_contexto_usuario(p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perm record;
begin
  u:=public.mv_actividad_usuario(p_usuario);

  select *
  into perm
  from public.app_permissions
  where perfil=u->>'perfil'
    and modulo='SEGURIDAD'
  limit 1;

  if not found or not coalesce(perm.activo,false) or not coalesce(perm.ver,false) then
    raise exception 'No tiene permiso para acceder a Seguridad';
  end if;

  return u || jsonb_build_object(
    'puedeVer',true,
    'puedeRegistrar',coalesce(perm.registrar,false),
    'puedeValidar',coalesce(perm.validar,false),
    'puedeDescargar',coalesce(perm.descargar,false),
    'alcanceDatos',coalesce(perm.alcance_datos,'')
  );
end;
$$;

create or replace function public.mv_seguridad_firma_activa_json(p_usuario text)
returns jsonb
language sql
stable
set search_path=public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'usuario',f.usuario,
        'nombre',coalesce(f.nombre,''),
        'dni',coalesce(f.dni,''),
        'perfil',coalesce(f.perfil,''),
        'sede',coalesce(f.sede,''),
        'version',f.version,
        'activa',f.activa,
        'archivoId',coalesce(f.archivo_id,''),
        'url',coalesce(f.url,''),
        'gpsRegistro',coalesce(f.gps_registro,''),
        'fechaRegistro',case when f.fecha_registro is null then '' else to_char(f.fecha_registro at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS') end,
        'autorizacionCambioId',coalesce(f.autorizacion_cambio_id,'')
      )
      from public.seguridad_firmas_migracion f
      where f.usuario=public.mv_bono_sup_usuario_key(p_usuario)
        and f.activa
      order by f.version desc
      limit 1
    ),
    jsonb_build_object(
      'usuario',public.mv_bono_sup_usuario_key(p_usuario),
      'version',0,
      'activa',false,
      'url',''
    )
  );
$$;

create or replace function public.mv_seguridad_aceptados(p_aceptaciones jsonb)
returns integer
language sql
immutable
set search_path=public
as $$
  select case
    when p_aceptaciones is null or jsonb_typeof(p_aceptaciones)<>'array' then 0
    else jsonb_array_length(p_aceptaciones)
  end;
$$;

create or replace function public.mv_seguridad_total_integrantes(a public.seguridad_ats_migracion)
returns integer
language sql
immutable
set search_path=public
as $$
  select
    (case when coalesce(trim(a.t1_usuario),'')<>'' then 1 else 0 end) +
    (case when coalesce(trim(a.t2_usuario),'')<>'' then 1 else 0 end);
$$;

create or replace function public.mv_seguridad_resumen_ats_json(a public.seguridad_ats_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',a.id,
    'numero',a.numero,
    'fecha',case when a.fecha is null then '' else to_char(a.fecha,'YYYY-MM-DD') end,
    'sede',coalesce(a.sede,''),
    'cuadrilla',coalesce(a.cuadrilla,''),
    'estado',coalesce(a.estado,''),
    'petarId',coalesce(a.petar_id,''),
    'aceptados',public.mv_seguridad_aceptados(a.aceptaciones_json),
    'total',public.mv_seguridad_total_integrantes(a),
    'pdfUrl',coalesce(a.pdf_url,''),
    'version',a.version
  );
$$;

create or replace function public.mv_seguridad_catalogo()
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  herramientas jsonb;
  tareas jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'herramienta',h.herramienta,
        'categoria',coalesce(h.categoria,'GENERAL')
      )
      order by h.source_row,h.herramienta
    ),
    '[]'::jsonb
  )
  into herramientas
  from public.catalogo_herramientas_migracion h
  where public.mv_actividad_texto(coalesce(h.estado,'ACTIVO'))='ACTIVO';

  select coalesce(
    jsonb_agg(x order by x->>'tarea'),
    '[]'::jsonb
  )
  into tareas
  from (
    select distinct jsonb_build_object(
      'tarea',t->>'tarea',
      'danos',coalesce(t->'danos','[]'::jsonb),
      'controles',
        case
          when coalesce(trim(t->>'controles'),'')='' then '[]'::jsonb
          else to_jsonb(regexp_split_to_array(t->>'controles',E'\\n+'))
        end
    ) x
    from public.seguridad_ats_migracion a
    cross join lateral jsonb_array_elements(coalesce(a.tareas_json,'[]'::jsonb)) t
    where coalesce(trim(t->>'tarea'),'')<>''
  ) q;

  return jsonb_build_object(
    'epp',jsonb_build_array(
      'CASCO DE SEGURIDAD',
      'BARBIQUEJO',
      'LENTES DE SEGURIDAD',
      'UNIFORME DE TRABAJO',
      'GUANTES DE SEGURIDAD',
      'BOTAS DE SEGURIDAD',
      'ESTROBO',
      'OTROS'
    ),
    'eppPetar',jsonb_build_array(
      'ESTROBO',
      'CHALECO',
      'CASCO',
      'BARBIQUEJO',
      'LENTES OSCUROS',
      'LENTES TRANSPARENTES',
      'SOBRE LENTES OSCUROS',
      'SOBRE LENTES TRANSPARENTES',
      'GUANTES DIELECTRICOS',
      'BOTINES CON PUNTA DE ACERO',
      'OTROS'
    ),
    'herramientas',herramientas,
    'tareas',tareas,
    'catalogoCompleto',false,
    'notaCatalogo','Herramientas y EPP reconciliados. Falta recuperar el catálogo completo de tareas del Apps Script V432 antes de habilitar creación.'
  );
end;
$$;

create or replace function public.mv_seguridad_integrantes_json(a public.seguridad_ats_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select coalesce(
    jsonb_agg(x order by x->>'orden'),
    '[]'::jsonb
  ) - 'orden'
  from (
    select jsonb_build_object(
      'orden',1,
      'usuario',coalesce(a.t1_usuario,''),
      'nombre',coalesce(a.t1_nombre,''),
      'cargo','T1'
    ) x
    where coalesce(trim(a.t1_usuario),'')<>''
    union all
    select jsonb_build_object(
      'orden',2,
      'usuario',coalesce(a.t2_usuario,''),
      'nombre',coalesce(a.t2_nombre,''),
      'cargo','T2'
    )
    where coalesce(trim(a.t2_usuario),'')<>''
  ) z;
$$;

create or replace function public.mv_seguridad_ats_json(a public.seguridad_ats_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',a.id,
    'numero',a.numero,
    'fecha',case when a.fecha is null then '' else to_char(a.fecha,'YYYY-MM-DD') end,
    'horaInicio',case when a.hora_inicio is null then '' else to_char(a.hora_inicio,'HH24:MI') end,
    'horaFinal',case when a.hora_final is null then '' else to_char(a.hora_final,'HH24:MI') end,
    'sede',coalesce(a.sede,''),
    'plataforma',coalesce(a.plataforma,''),
    'cuadrilla',coalesce(a.cuadrilla,''),
    't1Usuario',coalesce(a.t1_usuario,''),
    't1Nombre',coalesce(a.t1_nombre,''),
    't2Usuario',coalesce(a.t2_usuario,''),
    't2Nombre',coalesce(a.t2_nombre,''),
    'supervisorUsuario',coalesce(a.supervisor_usuario,''),
    'supervisorNombre',coalesce(a.supervisor_nombre,''),
    'gps',coalesce(a.gps,''),
    'trabajo',coalesce(a.trabajo,''),
    'lugarTrabajo',coalesce(a.lugar_trabajo,''),
    'epp',coalesce(a.epp_json,'[]'::jsonb),
    'herramientas',coalesce(a.herramientas_json,'[]'::jsonb),
    'tareas',coalesce(a.tareas_json,'[]'::jsonb),
    'estado',coalesce(a.estado,''),
    'petarId',coalesce(a.petar_id,''),
    'aceptaciones',coalesce(a.aceptaciones_json,'[]'::jsonb),
    'supervisorFirma',a.supervisor_firma_json,
    'validadorFirma',a.validador_firma_json,
    'observacion',coalesce(a.observacion,''),
    'version',a.version,
    'pdfUrl',coalesce(a.pdf_url,''),
    'pdfId',coalesce(a.pdf_id,''),
    'creadoPor',coalesce(a.creado_por,''),
    'integrantes',public.mv_seguridad_integrantes_json(a)
  );
$$;

create or replace function public.mv_seguridad_petar_json(p public.seguridad_petar_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',p.id,
    'numero',p.numero,
    'atsId',coalesce(p.ats_id,''),
    'fecha',case when p.fecha is null then '' else to_char(p.fecha,'YYYY-MM-DD') end,
    'horaInicio',case when p.hora_inicio is null then '' else to_char(p.hora_inicio,'HH24:MI') end,
    'horaFinal',case when p.hora_final is null then '' else to_char(p.hora_final,'HH24:MI') end,
    'sede',coalesce(p.sede,''),
    'cuadrilla',coalesce(p.cuadrilla,''),
    'trabajo',coalesce(p.trabajo,''),
    'ubicacion',coalesce(p.ubicacion,''),
    'checklist',coalesce(p.checklist_json,'[]'::jsonb),
    'epp',coalesce(p.epp_json,'[]'::jsonb),
    'estado',coalesce(p.estado,''),
    'noCumpleCritico',public.mv_actividad_texto(p.no_cumple_critico)='SI',
    'pdfUrl',coalesce(p.pdf_url,''),
    'pdfId',coalesce(p.pdf_id,''),
    'version',p.version
  );
$$;

create or replace function public.mv_seguridad_puede_ver_documento(
  p_usuario text,
  p_ats_id text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  a public.seguridad_ats_migracion%rowtype;
  perfil_u text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);
  perfil_u:=u->>'perfil';

  select * into a
  from public.seguridad_ats_migracion
  where id=p_ats_id;

  if not found then return false; end if;

  if perfil_u='TECNICO' then
    return public.mv_actividad_cuadrilla_norm(a.cuadrilla)=public.mv_actividad_cuadrilla_norm(u->>'cuadrilla');
  elsif perfil_u='SUPERVISOR' then
    return public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(u->>'sede');
  else
    return public.mv_seguridad_es_jefatura(perfil_u);
  end if;
end;
$$;

create or replace function public.mv_seguridad_obtener_documento(
  p_usuario text,
  p_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.seguridad_ats_migracion%rowtype;
  p public.seguridad_petar_migracion%rowtype;
  petar_json jsonb:=null;
begin
  if not public.mv_seguridad_puede_ver_documento(p_usuario,p_id) then
    raise exception 'No tiene acceso a este documento de Seguridad';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id;

  if coalesce(a.petar_id,'')<>'' then
    select * into p
    from public.seguridad_petar_migracion
    where id=a.petar_id;
    if found then petar_json:=public.mv_seguridad_petar_json(p); end if;
  end if;

  return jsonb_build_object(
    'ok',true,
    'modulo','SEGURIDAD',
    'accion','OBTENER_DOCUMENTO',
    'ats',public.mv_seguridad_ats_json(a),
    'petar',petar_json,
    'catalogo',public.mv_seguridad_catalogo()
  );
end;
$$;

create or replace function public.mv_seguridad_obtener_contexto(p_usuario text)
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
  hoy date:=(clock_timestamp() at time zone 'America/Lima')::date;
  firma jsonb;
  hoy_ats jsonb:=null;
  pendientes jsonb:='[]'::jsonb;
  seguimiento jsonb:='[]'::jsonb;
  solicitudes jsonb:='[]'::jsonb;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  sede_u:=u->>'sede';
  cuadrilla_u:=u->>'cuadrilla';
  firma:=public.mv_seguridad_firma_activa_json(u->>'usuario');

  if perfil_u='TECNICO' then
    select public.mv_seguridad_resumen_ats_json(a)
    into hoy_ats
    from public.seguridad_ats_migracion a
    where a.fecha=hoy
      and public.mv_actividad_cuadrilla_norm(a.cuadrilla)=public.mv_actividad_cuadrilla_norm(cuadrilla_u)
    order by a.numero desc nulls last,a.created_at desc
    limit 1;
  else
    select coalesce(
      jsonb_agg(public.mv_seguridad_resumen_ats_json(a) order by a.fecha desc,a.numero desc),
      '[]'::jsonb
    )
    into pendientes
    from public.seguridad_ats_migracion a
    where
      (
        (perfil_u='SUPERVISOR' and public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(sede_u))
        or
        (perfil_u<>'SUPERVISOR' and public.mv_seguridad_es_jefatura(perfil_u))
      )
      and public.mv_seguridad_aceptados(a.aceptaciones_json)>=1
      and (
        (perfil_u='SUPERVISOR' and a.estado in ('PENDIENTE ACEPTACION','PENDIENTE SUPERVISOR'))
        or
        (perfil_u<>'SUPERVISOR' and a.estado in ('PENDIENTE ACEPTACION','PENDIENTE SUPERVISOR','PENDIENTE VALIDACION'))
      );

    select coalesce(
      jsonb_agg(public.mv_seguridad_resumen_ats_json(a) order by a.numero desc),
      '[]'::jsonb
    )
    into seguimiento
    from public.seguridad_ats_migracion a
    where a.fecha=hoy
      and (
        (perfil_u='SUPERVISOR' and public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(sede_u))
        or
        (perfil_u<>'SUPERVISOR' and public.mv_seguridad_es_jefatura(perfil_u))
      )
      and a.estado not in ('FINALIZADO','CERRADO','RECHAZADO');

    if public.mv_seguridad_es_jefatura(perfil_u) then
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',s.id,
            'usuario',s.usuario,
            'nombre',coalesce(s.nombre,''),
            'sede',coalesce(s.sede,''),
            'motivo',coalesce(s.motivo,''),
            'estado',s.estado,
            'solicitadoEn',case when s.solicitado_en is null then '' else to_char(s.solicitado_en at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS') end
          )
          order by s.solicitado_en
        ),
        '[]'::jsonb
      )
      into solicitudes
      from public.seguridad_firma_solicitudes_migracion s
      where s.estado='PENDIENTE';
    end if;
  end if;

  return jsonb_build_object(
    'ok',true,
    'modulo','SEGURIDAD',
    'accion','OBTENER_CONTEXTO',
    'usuario',u,
    'firma',firma,
    'hoy',jsonb_build_object('ats',hoy_ats),
    'pendientes',pendientes,
    'seguimiento',seguimiento,
    'solicitudesFirma',solicitudes,
    'catalogo',public.mv_seguridad_catalogo(),
    'crearHabilitado',false,
    'crearBloqueadoMotivo','Pendiente recuperar catálogo completo de tareas V432 antes de habilitar creación en el piloto.'
  );
end;
$$;

revoke execute on function public.mv_seguridad_es_jefatura(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_contexto_usuario(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_firma_activa_json(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_aceptados(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_total_integrantes(public.seguridad_ats_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_resumen_ats_json(public.seguridad_ats_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_catalogo() from public,anon,authenticated;
revoke execute on function public.mv_seguridad_integrantes_json(public.seguridad_ats_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_ats_json(public.seguridad_ats_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_petar_json(public.seguridad_petar_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_puede_ver_documento(text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_obtener_documento(text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_obtener_contexto(text) from public,anon,authenticated;

grant execute on function public.mv_seguridad_es_jefatura(text) to service_role;
grant execute on function public.mv_seguridad_contexto_usuario(text) to service_role;
grant execute on function public.mv_seguridad_firma_activa_json(text) to service_role;
grant execute on function public.mv_seguridad_aceptados(jsonb) to service_role;
grant execute on function public.mv_seguridad_total_integrantes(public.seguridad_ats_migracion) to service_role;
grant execute on function public.mv_seguridad_resumen_ats_json(public.seguridad_ats_migracion) to service_role;
grant execute on function public.mv_seguridad_catalogo() to service_role;
grant execute on function public.mv_seguridad_integrantes_json(public.seguridad_ats_migracion) to service_role;
grant execute on function public.mv_seguridad_ats_json(public.seguridad_ats_migracion) to service_role;
grant execute on function public.mv_seguridad_petar_json(public.seguridad_petar_migracion) to service_role;
grant execute on function public.mv_seguridad_puede_ver_documento(text,text) to service_role;
grant execute on function public.mv_seguridad_obtener_documento(text,text) to service_role;
grant execute on function public.mv_seguridad_obtener_contexto(text) to service_role;
