
-- 076_checklist_almacen_transacciones.sql
-- Registro transaccional V141. Los archivos deben llegar previamente almacenados como URL.
-- La futura Edge Function se encargará del transporte de archivos; PostgreSQL conserva la lógica operativa.

create or replace function public.mv_checklist_nombres_tecnicos(p_cuadrilla text)
returns text
language sql
stable
set search_path=public
as $$
  select coalesce(
    string_agg(x.nombre,' | ' order by x.nombre),
    ''
  )
  from (
    select distinct coalesce(nullif(trim(nombres_apellidos),''),usuario) as nombre
    from public.app_users
    where public.mv_actividad_texto(perfil)='TECNICO'
      and public.mv_actividad_texto(coalesce(estado,'ACTIVO'))='ACTIVO'
      and public.mv_actividad_cuadrilla_norm(cuadrilla)=public.mv_actividad_cuadrilla_norm(p_cuadrilla)
      and coalesce(nullif(trim(nombres_apellidos),''),usuario,'')<>''
  ) x;
$$;

create or replace function public.mv_checklist_foto_url(p_valor jsonb)
returns text
language plpgsql
immutable
set search_path=public
as $$
begin
  if p_valor is null or p_valor='null'::jsonb then return ''; end if;
  if jsonb_typeof(p_valor)='string' then return trim(p_valor#>>'{}'); end if;
  if jsonb_typeof(p_valor)='object' then
    return trim(coalesce(
      nullif(p_valor->>'url',''),
      nullif(p_valor->>'fotoUrl',''),
      nullif(p_valor->>'archivoUrl',''),
      ''
    ));
  end if;
  return '';
end;
$$;

create or replace function public.mv_checklist_equipo_resumen(
  p_equipos jsonb,
  p_categoria text,
  p_maximo integer
)
returns jsonb
language plpgsql
immutable
set search_path=public
as $$
declare
  e jsonb;
  serie text;
  foto text;
  series text[]:=array[]::text[];
  links text[]:=array[]::text[];
  n integer:=0;
begin
  if p_equipos is null or jsonb_typeof(p_equipos)<>'array' then
    return jsonb_build_object('series','','links','');
  end if;

  if jsonb_array_length(p_equipos)>p_maximo then
    raise exception 'Máximo % equipos para %',p_maximo,p_categoria;
  end if;

  for e in select value from jsonb_array_elements(p_equipos)
  loop
    serie:=trim(coalesce(e->>'serie',''));
    foto:=coalesce(
      nullif(trim(e->>'fotoUrl'),''),
      public.mv_checklist_foto_url(e->'foto')
    );

    if serie='' and foto='' then continue; end if;
    if serie='' then raise exception 'Debe ingresar la serie o código de %',p_categoria; end if;
    if foto='' then raise exception 'Debe subir la foto de % - %',p_categoria,serie; end if;

    n:=n+1;
    series:=array_append(series,serie);
    links:=array_append(links,foto);
  end loop;

  return jsonb_build_object(
    'series',array_to_string(series,' | '),
    'links',array_to_string(links,'|')
  );
end;
$$;

create or replace function public.mv_checklist_registrar(
  p_usuario text,
  p_data jsonb
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
  es_campo boolean:=false;
  cuadrilla_u text;
  dc public.mv_actividad_cuadrilla_ultima%rowtype;
  fecha_g date;
  tipo_u text;
  id_u text;
  hoy date;
  ahora time;
  nombres_u text;
  estado_u text:='PENDIENTE DE VALIDACION POR AREA DE ALMACEN';

  ont_zte_r jsonb:=jsonb_build_object('series','','links','');
  ont_huawei_r jsonb:=jsonb_build_object('series','','links','');
  mesh_zte_r jsonb:=jsonb_build_object('series','','links','');
  mesh_huawei_r jsonb:=jsonb_build_object('series','','links','');
  winbox_r jsonb:=jsonb_build_object('series','','links','');
  fonowin_r jsonb:=jsonb_build_object('series','','links','');

  resultado_herr text:='';
  obs_herr text:='';
  detalle jsonb;
  x jsonb;
  i integer:=0;
  nombre_h text;
  cantidad_h numeric;
  estado_h text;
  motivo_h text;
  foto_h text;
  observadas integer:=0;

  unidad_frente text:='';
  unidad_posterior text:='';
  unidad_izq text:='';
  unidad_der text:='';
  extintor text:='';
  botiquin text:='';
  reja text:='';
  parrilla1 text:='';
  parrilla2 text:='';

  licencia_f date;
  licencia_frente text:='';
  licencia_reverso text:='';
  soat_f date;
  soat_file text:='';
  rt_f date;
  rt_file text:='';

  epp_personal text:='';
  epp_botas text:='';
  epp_fotocheck text:='';

  origen_u text;
  registrado_por_u text;
  comentario_u text;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  sede_u:=u->>'sede';
  usuario_u:=u->>'usuario';

  es_campo:=perfil_u='SUPERVISOR'
            and public.mv_actividad_texto(coalesce(p_data->>'origenRegistro',''))='ACTIVIDAD_CAMPO';

  if not (perfil_u='TECNICO' or es_campo) then
    raise exception 'Solo Técnico o Supervisor desde Actividad en Campo pueden registrar checklist';
  end if;

  cuadrilla_u:=public.mv_actividad_cuadrilla_norm(
    case when es_campo then p_data->>'cuadrilla' else u->>'cuadrilla' end
  );
  if cuadrilla_u='' then raise exception 'Debe seleccionar una cuadrilla'; end if;

  select *
  into dc
  from public.mv_actividad_cuadrilla_ultima x
  where x.cuadrilla=cuadrilla_u
  limit 1;

  if not found then raise exception 'No se encontró la cuadrilla en USUARIOS: %',cuadrilla_u; end if;

  if es_campo and public.mv_actividad_texto(dc.sede)<>sede_u then
    raise exception 'Supervisor solo puede registrar checklist de su sede';
  end if;

  fecha_g:=public.mv_actividad_fecha_texto(coalesce(p_data->>'fechaGestion',p_data->>'fecha_gestion',''));
  if fecha_g is null then raise exception 'Debe ingresar la fecha de gestión'; end if;

  tipo_u:=public.mv_checklist_tipo(coalesce(p_data->>'tipoChecklist','MATERIALES'));

  if exists(
    select 1
    from public.checklist_almacen_migracion c
    where public.mv_actividad_cuadrilla_norm(c.cuadrilla)=cuadrilla_u
      and c.fecha_gestion=fecha_g
      and c.tipo_checklist=tipo_u
  ) then
    raise exception 'Ya existe un checklist de % para esta cuadrilla y fecha',tipo_u;
  end if;

  if tipo_u='MATERIALES' then
    ont_zte_r:=public.mv_checklist_equipo_resumen(
      coalesce(p_data->'ontZteEquipos',p_data->'equipos'->'ontZte','[]'::jsonb),'ONT_ZTE',10
    );
    ont_huawei_r:=public.mv_checklist_equipo_resumen(
      coalesce(p_data->'ontHuaweiEquipos',p_data->'equipos'->'ontHuawei','[]'::jsonb),'ONT_HUAWEI',10
    );
    mesh_zte_r:=public.mv_checklist_equipo_resumen(
      coalesce(p_data->'meshZteEquipos',p_data->'equipos'->'meshZte','[]'::jsonb),'MESH_ZTE',10
    );
    mesh_huawei_r:=public.mv_checklist_equipo_resumen(
      coalesce(p_data->'meshHuaweiEquipos',p_data->'equipos'->'meshHuawei','[]'::jsonb),'MESH_HUAWEI',10
    );
    winbox_r:=public.mv_checklist_equipo_resumen(
      coalesce(p_data->'winboxEquipos',p_data->'equipos'->'winbox','[]'::jsonb),'WINBOX',5
    );
    fonowin_r:=public.mv_checklist_equipo_resumen(
      coalesce(p_data->'fonowinEquipos',p_data->'equipos'->'fonowin','[]'::jsonb),'FONOWIN',5
    );

  elsif tipo_u='HERRAMIENTAS' then
    detalle:=coalesce(p_data->'herramientas','[]'::jsonb);
    if jsonb_typeof(detalle)<>'array' or jsonb_array_length(detalle)=0 then
      raise exception 'Debe registrar al menos una herramienta';
    end if;

    for x in select value from jsonb_array_elements(detalle)
    loop
      nombre_h:=trim(coalesce(x->>'herramienta',''));
      if nombre_h='' then continue; end if;

      begin
        cantidad_h:=replace(coalesce(x->>'cantidad',''),',','.')::numeric;
      exception when others then
        cantidad_h:=null;
      end;
      if cantidad_h is null or cantidad_h<=0 then
        raise exception 'Cantidad obligatoria y mayor a cero en %',nombre_h;
      end if;

      estado_h:=public.mv_actividad_texto(coalesce(x->>'estado','BUENO'));
      motivo_h:=trim(coalesce(x->>'motivo',''));
      if estado_h not in ('BUENO','REGULAR','MALO') then
        raise exception 'Estado no válido en %',nombre_h;
      end if;
      if estado_h in ('REGULAR','MALO') and motivo_h='' then
        raise exception 'Motivo obligatorio en %',nombre_h;
      end if;

      foto_h:=coalesce(
        nullif(trim(x->>'fotoUrl'),''),
        public.mv_checklist_foto_url(x->'foto')
      );
      if estado_h='MALO' and foto_h='' then
        raise exception 'Foto obligatoria en %',nombre_h;
      end if;

      if estado_h<>'BUENO' then observadas:=observadas+1; end if;
    end loop;

    resultado_herr:=case when observadas>0 then 'OBSERVADO' else 'CONFORME' end;
    obs_herr:=observadas::text||' herramienta(s) con estado Regular o Malo';

  elsif tipo_u='UNIDAD VEHICULAR' then
    unidad_frente:=coalesce(nullif(p_data->>'fotoUnidadFrenteUrl',''),public.mv_checklist_foto_url(p_data->'fotoUnidadFrente'));
    unidad_posterior:=coalesce(nullif(p_data->>'fotoUnidadPosteriorUrl',''),public.mv_checklist_foto_url(p_data->'fotoUnidadPosterior'));
    unidad_izq:=coalesce(nullif(p_data->>'fotoUnidadLadoIzquierdoUrl',''),public.mv_checklist_foto_url(p_data->'fotoUnidadLadoIzquierdo'));
    unidad_der:=coalesce(nullif(p_data->>'fotoUnidadLadoDerechoUrl',''),public.mv_checklist_foto_url(p_data->'fotoUnidadLadoDerecho'));
    extintor:=coalesce(nullif(p_data->>'fotoExtintorUrl',''),public.mv_checklist_foto_url(p_data->'fotoExtintor'));
    botiquin:=coalesce(nullif(p_data->>'fotoBotiquinUrl',''),public.mv_checklist_foto_url(p_data->'fotoBotiquin'));
    reja:=coalesce(nullif(p_data->>'fotoRejaSeparadoraUrl',''),public.mv_checklist_foto_url(p_data->'fotoRejaSeparadora'));
    parrilla1:=coalesce(nullif(p_data->>'fotoParrilla1Url',''),public.mv_checklist_foto_url(p_data->'fotoParrilla1'));
    parrilla2:=coalesce(nullif(p_data->>'fotoParrilla2Url',''),public.mv_checklist_foto_url(p_data->'fotoParrilla2'));

    if '' in (unidad_frente,unidad_posterior,unidad_izq,unidad_der,extintor,botiquin,reja,parrilla1,parrilla2) then
      raise exception 'Falta evidencia obligatoria de unidad';
    end if;

  elsif tipo_u='DOCUMENTACION' then
    licencia_f:=public.mv_actividad_fecha_texto(p_data->>'licenciaFechaVencimiento');
    soat_f:=public.mv_actividad_fecha_texto(p_data->>'soatFechaVencimiento');
    rt_f:=public.mv_actividad_fecha_texto(p_data->>'revisionTecnicaFechaVencimiento');
    if licencia_f is null or soat_f is null or rt_f is null then
      raise exception 'Complete las fechas de vencimiento';
    end if;

    licencia_frente:=coalesce(nullif(p_data->>'licenciaFotoFrenteUrl',''),public.mv_checklist_foto_url(p_data->'licenciaFotoFrente'));
    licencia_reverso:=coalesce(nullif(p_data->>'licenciaFotoReversoUrl',''),public.mv_checklist_foto_url(p_data->'licenciaFotoReverso'));
    soat_file:=coalesce(nullif(p_data->>'soatArchivoUrl',''),public.mv_checklist_foto_url(p_data->'soatArchivo'));
    rt_file:=coalesce(nullif(p_data->>'revisionTecnicaArchivoUrl',''),public.mv_checklist_foto_url(p_data->'revisionTecnicaArchivo'));

    if '' in (licencia_frente,licencia_reverso,soat_file,rt_file) then
      raise exception 'Faltan archivos de documentación';
    end if;

  elsif tipo_u='EPP' then
    epp_personal:=coalesce(nullif(p_data->>'fotoPersonalCompletoUrl',''),public.mv_checklist_foto_url(p_data->'fotoPersonalCompleto'));
    epp_botas:=coalesce(nullif(p_data->>'fotoBotasUrl',''),public.mv_checklist_foto_url(p_data->'fotoBotas'));
    epp_fotocheck:=coalesce(nullif(p_data->>'fotoFotocheckUrl',''),public.mv_checklist_foto_url(p_data->'fotoFotocheck'));
    if '' in (epp_personal,epp_botas,epp_fotocheck) then
      raise exception 'Faltan evidencias de EPP';
    end if;
  end if;

  loop
    id_u:=public.mv_checklist_generar_id();
    exit when not exists(select 1 from public.checklist_almacen_migracion where id=id_u);
  end loop;

  hoy:=(clock_timestamp() at time zone 'America/Lima')::date;
  ahora:=(clock_timestamp() at time zone 'America/Lima')::time(0);

  nombres_u:=trim(coalesce(
    nullif(p_data->>'nombresApellidos',''),
    case when es_campo then nullif(public.mv_checklist_nombres_tecnicos(cuadrilla_u),'') end,
    nullif(u->>'nombresApellidos',''),
    nullif(dc.usuario,''),
    usuario_u
  ));

  origen_u:=case when es_campo then 'ACTIVIDAD_CAMPO' else 'TECNICO' end;
  registrado_por_u:=usuario_u;
  comentario_u:=trim(coalesce(p_data->>'comentarioFinal',''));

  insert into public.checklist_almacen_migracion(
    id,source_row,fecha_registro,hora_registro,usuario,nombres_apellidos,sede,cuadrilla,fecha_gestion,estado_general,
    ont_zte,fotos_series_ont_zte,ont_huawei,fotos_series_ont_huawei,mesh_zte,fotos_mesh_zte,mesh_huawei,fotos_mesh_huawei,
    winbox,foto_winbox,fonowin,foto_fonowin,
    cable_drop,pre50,pre100,pre150,pre200,anclaje_p,cinta_band_it,hebilla,acoplador,roseta,conectores_opticos,templadores,
    splitter,clevis,utp_cat5,utp_cat6,patch_apc_apc,patch_upc_apc,rj45,
    version,origen_registro,registrado_por,perfil_registro,comentario_final,tipo_checklist,
    resultado_herramientas,observacion_herramientas,
    foto_unidad_frente,foto_unidad_posterior,foto_unidad_lado_izquierdo,foto_unidad_lado_derecho,
    foto_extintor,foto_botiquin,foto_reja_separadora,foto_parrilla_1,foto_parrilla_2,resultado_unidad,observacion_unidad,
    licencia_fecha_vencimiento,licencia_foto_frente,licencia_foto_reverso,soat_fecha_vencimiento,soat_archivo,
    revision_tecnica_fecha_vencimiento,revision_tecnica_archivo,resultado_documentacion,observacion_documentacion,
    foto_personal_completo,foto_botas,foto_fotocheck,resultado_epp,observacion_epp,
    source_kind,created_at,updated_at
  ) values (
    id_u,null,hoy,ahora,
    case when es_campo then coalesce(nullif(dc.usuario,''),cuadrilla_u) else usuario_u end,
    nombres_u,coalesce(nullif(dc.sede,''),sede_u),cuadrilla_u,fecha_g,estado_u,
    ont_zte_r->>'series',ont_zte_r->>'links',
    ont_huawei_r->>'series',ont_huawei_r->>'links',
    mesh_zte_r->>'series',mesh_zte_r->>'links',
    mesh_huawei_r->>'series',mesh_huawei_r->>'links',
    winbox_r->>'series',winbox_r->>'links',
    fonowin_r->>'series',fonowin_r->>'links',
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'cableDrop',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'pre50',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'pre100',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'pre150',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'pre200',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'anclajeP',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'cintaBandIt',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'hebilla',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'acoplador',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'roseta',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'conectoresOpticos',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'templadores',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'splitter',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'clevis',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'utpCat5',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'utpCat6',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'patchApcApc',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'patchUpcApc',''))),
    public.mv_checklist_numero(to_jsonb(coalesce(p_data->>'rj45',''))),
    1,origen_u,registrado_por_u,perfil_u,comentario_u,tipo_u,
    resultado_herr,obs_herr,
    unidad_frente,unidad_posterior,unidad_izq,unidad_der,
    extintor,botiquin,reja,parrilla1,parrilla2,
    case when tipo_u='UNIDAD VEHICULAR' then 'CONFORME' else '' end,
    case when tipo_u='UNIDAD VEHICULAR' then coalesce(p_data->>'observacionUnidad','') else '' end,
    licencia_f,licencia_frente,licencia_reverso,soat_f,soat_file,
    rt_f,rt_file,
    case when tipo_u='DOCUMENTACION' then 'CONFORME' else '' end,
    case when tipo_u='DOCUMENTACION' then coalesce(p_data->>'observacionDocumentacion','') else '' end,
    epp_personal,epp_botas,epp_fotocheck,
    case when tipo_u='EPP' then 'CONFORME' else '' end,
    case when tipo_u='EPP' then coalesce(p_data->>'observacionEpp','') else '' end,
    'POSTGRESQL',now(),now()
  );

  if tipo_u='HERRAMIENTAS' then
    i:=0;
    for x in select value from jsonb_array_elements(detalle)
    loop
      nombre_h:=trim(coalesce(x->>'herramienta',''));
      if nombre_h='' then continue; end if;
      i:=i+1;
      cantidad_h:=replace(coalesce(x->>'cantidad','0'),',','.')::numeric;
      estado_h:=public.mv_actividad_texto(coalesce(x->>'estado','BUENO'));
      motivo_h:=trim(coalesce(x->>'motivo',''));
      foto_h:=coalesce(
        nullif(trim(x->>'fotoUrl'),''),
        public.mv_checklist_foto_url(x->'foto')
      );

      insert into public.checklist_herramientas_detalle_migracion(
        id_detalle,id_checklist,fecha_registro,sede,cuadrilla,herramienta,codigo_serie,
        estado,motivo,foto,registrado_por,perfil_registro,cantidad,source_kind
      ) values (
        'HD-'||id_u||'-'||lpad(i::text,2,'0'),
        id_u,now(),coalesce(nullif(dc.sede,''),sede_u),cuadrilla_u,nombre_h,
        coalesce(x->>'codigoSerie',''),estado_h,motivo_h,foto_h,usuario_u,perfil_u,cantidad_h,'POSTGRESQL'
      );
    end loop;
  end if;

  insert into public.checklist_almacen_eventos_migracion(
    checklist_id,evento,usuario,perfil,detalle,source_kind
  ) values (
    id_u,'REGISTRAR',usuario_u,perfil_u,
    jsonb_build_object(
      'tipoChecklist',tipo_u,
      'sede',coalesce(nullif(dc.sede,''),sede_u),
      'cuadrilla',cuadrilla_u,
      'fechaGestion',to_char(fecha_g,'YYYY-MM-DD'),
      'origenRegistro',origen_u
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'modulo','CHECKLIST_ALMACEN',
    'accion','REGISTRAR',
    'id',id_u,
    'tipoChecklist',tipo_u,
    'estadoGeneral',estado_u,
    'sede',coalesce(nullif(dc.sede,''),sede_u),
    'cuadrilla',cuadrilla_u,
    'origenRegistro',origen_u,
    'registradoPor',usuario_u,
    'comentarioFinal',comentario_u
  );
end;
$$;

revoke execute on function public.mv_checklist_nombres_tecnicos(text) from public,anon,authenticated;
revoke execute on function public.mv_checklist_foto_url(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_checklist_equipo_resumen(jsonb,text,integer) from public,anon,authenticated;
revoke execute on function public.mv_checklist_registrar(text,jsonb) from public,anon,authenticated;

grant execute on function public.mv_checklist_nombres_tecnicos(text) to service_role;
grant execute on function public.mv_checklist_foto_url(jsonb) to service_role;
grant execute on function public.mv_checklist_equipo_resumen(jsonb,text,integer) to service_role;
grant execute on function public.mv_checklist_registrar(text,jsonb) to service_role;
