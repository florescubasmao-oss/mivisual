
-- 098_seguridad_alineacion_v437.sql
-- Alineación exacta con bloque productivo V437/V432 recibido 19/09/2026.

create table if not exists public.seguridad_config_migracion (
  id text primary key,
  source_version text not null,
  epp jsonb not null,
  epp_petar jsonb not null,
  tareas jsonb not null,
  checklist jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seguridad_config_migracion enable row level security;
revoke all on public.seguridad_config_migracion from anon, authenticated;
grant select,insert,update,delete on public.seguridad_config_migracion to service_role;

insert into public.seguridad_config_migracion(id,source_version,epp,epp_petar,tareas,checklist,updated_at)
values (
  'SEGURIDAD_V437',
  'V437/V432',
  $json$["CASCO DE SEGURIDAD","BARBIQUEJO","LENTES DE SEGURIDAD","UNIFORME DE TRABAJO","GUANTES DE SEGURIDAD","BOTAS DE SEGURIDAD","ESTROBO","OTROS"]$json$::jsonb,
  $json$["ESTROBO","CHALECO","CASCO","BARBIQUEJO","LENTES OSCUROS","LENTES TRANSPARENTES","SOBRE LENTES OSCUROS","SOBRE LENTES TRANSPARENTES","GUANTES DIELECTRICOS","BOTINES CON PUNTA DE ACERO","OTROS"]$json$::jsonb,
  $json$[
    {"tarea":"TRASLADO AL PUNTO DE TRABAJO","danos":["GOLPES","OTROS"],"controles":["Usar cinturón de seguridad.","Respetar reglas de tránsito y límites de velocidad.","No usar celular durante la conducción.","Asegurar escalera, herramientas y materiales dentro de la unidad.","Conducir atento a peatones, motocicletas y condiciones de la vía."]},
    {"tarea":"REVISION DE UNIDAD, EPP, HERRAMIENTAS Y MATERIALES","danos":["GOLPES","CORTES","ATRAPAMIENTO","LESIONES EN MANOS"],"controles":["Inspeccionar unidad, herramientas, equipos y materiales antes de iniciar.","Verificar escalera, conos, barras, estrobo y EPP antes de salir.","Confirmar que herramientas y equipos estén operativos y sin daños visibles.","Mantener orden y asegurar correctamente la carga."]},
    {"tarea":"IDENTIFICACION, DELIMITACION Y SEÑALIZACION DEL AREA","danos":["CAIDA A NIVEL","GOLPES","CAIDA DE OBJETOS","OTROS"],"controles":["Evaluar el entorno antes de iniciar y mantener libres las rutas de paso.","Delimitar y señalizar el área de trabajo.","Para intervención en CTO utilizar 4 conos y 4 barras cuando corresponda.","Colocar 1 cono en poste de apoyo y 1 cono junto al portabobina cuando aplique.","Proteger a peatones, cliente y terceros del área de trabajo."]},
    {"tarea":"MANIPULACION Y POSICIONAMIENTO DE ESCALERA","danos":["CAIDA DE OBJETOS","CAIDA A DESNIVEL","GOLPES","ATRAPAMIENTO","LESIONES EN MANOS"],"controles":["Inspeccionar escalera, peldaños y apoyos antes de utilizarla.","Trasladar y posicionar la escalera entre dos personas cuando corresponda.","Ubicar sobre superficie firme, estable y con ángulo seguro.","Mantener apoyo/control del segundo técnico y delimitar el nivel inferior.","No usar escalera defectuosa o con condiciones inseguras."]},
    {"tarea":"ASCENSO, DESCENSO Y TRABAJO EN ALTURA","danos":["ELECTROCUCION","CAIDA DE OBJETOS","CAIDA A DESNIVEL","GOLPES"],"controles":["Usar casco con barbiquejo, calzado de seguridad y EPP completo.","Usar estrobo/sistema anticaídas y permanecer enganchado al punto seguro.","Verificar punto de apoyo o anclaje antes del ascenso.","Mantener distancia segura respecto de líneas o equipos energizados.","Mantener observador y proteger el área inferior ante posible caída de objetos.","Suspender el trabajo ante condición insegura o falta de protección contra caídas."]},
    {"tarea":"TRABAJO EN POSTE, CTO O FACHADA","danos":["ELECTROCUCION","CAIDA DE OBJETOS","CAIDA A DESNIVEL","GOLPES","CORTES"],"controles":["Verificar estabilidad del poste, fachada, escalera y punto de apoyo.","Mantener enganche permanente durante el trabajo en altura.","Señalizar y aislar el área conforme al punto de trabajo.","No dejar herramientas, conectores o materiales sueltos en altura.","Verificar proximidad a redes eléctricas antes de intervenir."]},
    {"tarea":"INSTALACION DE HERRAJES, CLEVIS, TEMPLADORES O ANCLAJES","danos":["CAIDA DE OBJETOS","CAIDA A DESNIVEL","GOLPES","CORTES","LESIONES EN MANOS"],"controles":["Usar guantes, lentes y EPP completo.","Verificar el estado de herrajes, templadores y puntos de fijación.","Mantener herramientas aseguradas durante el trabajo en altura.","Evitar ubicar manos en puntos de atrapamiento o tensión.","Comprobar fijación y estabilidad antes de liberar la carga."]},
    {"tarea":"TENDIDO AEREO DE FIBRA O DROP","danos":["ELECTROCUCION","CAIDA DE OBJETOS","CAIDA A DESNIVEL","CORTES","LESIONES EN MANOS","OTROS"],"controles":["Usar guantes, lentes y EPP completo.","Mantener distancia segura de redes eléctricas.","Controlar bobina/portabobina, templado y recorrido del cable.","Evitar tensión brusca, atrapamiento o cruce inseguro sobre vías y accesos.","Señalizar y controlar el área inferior durante el tendido."]},
    {"tarea":"RETIRO DE CABLES DANADOS O RECABLEADO","danos":["ELECTROCUCION","CAIDA DE OBJETOS","CAIDA A DESNIVEL","CORTES","LESIONES EN MANOS"],"controles":["Identificar correctamente el cable antes de retirarlo.","Usar guantes, lentes y herramientas adecuadas.","Controlar la caída y el recorrido del cable retirado.","Mantener señalizada el área y proteger a terceros.","No intervenir conductores, cables o redes ajenas al trabajo autorizado."]},
    {"tarea":"CABLEADO EXTERIOR, FIJACION O GRAPEADO","danos":["CAIDA A NIVEL","CORTES","LESIONES EN MANOS","PROYECCION DE PARTICULAS"],"controles":["Usar guantes y lentes de seguridad.","Mantener orden del cable durante el tendido y fijación.","Utilizar grapas y herramientas adecuadas sin dañar cable ni superficies.","Evitar dejar cable, residuos o herramientas en zonas de tránsito."]},
    {"tarea":"PERFORACION","danos":["ELECTROCUCION","PROYECCION DE PARTICULAS","CORTES","LESIONES EN MANOS","CONTACTO CON SUSTANCIAS PELIGROSAS"],"controles":["Verificar ausencia de instalaciones eléctricas, agua u otros servicios ocultos.","Usar lentes, guantes y herramienta adecuada.","Revisar taladro, extensión, enchufe y broca antes de usar.","Controlar la proyección de partículas y proteger al cliente y sus bienes.","Mantener cables eléctricos y extensión fuera de zonas húmedas o de paso."]},
    {"tarea":"INSTALACION INTERIOR, ROSETA, RESERVA O FIJACION","danos":["CAIDA A NIVEL","GOLPES","CORTES","LESIONES EN MANOS"],"controles":["Coordinar con el cliente el recorrido y punto de instalación.","Proteger paredes, muebles y acabados.","Mantener reserva y cableado ordenados, sin generar obstáculos.","Usar herramientas adecuadas y retirar residuos al finalizar."]},
    {"tarea":"INSTALACION O CAMBIO DE ONT, MESH U OTROS EQUIPOS","danos":["ELECTROCUCION","GOLPES","CORTES","LESIONES EN MANOS"],"controles":["Desenergizar cuando corresponda antes de manipular conexiones.","Manipular equipos con cuidado y en superficie estable.","Usar herramientas adecuadas y en buen estado.","Mantener orden de fuentes, patchcord y cableado para evitar daños o tropiezos."]},
    {"tarea":"EMPALME, CONECTORIZACION O LIMPIEZA DE FIBRA","danos":["CORTES","LESIONES EN MANOS","PROYECCION DE PARTICULAS","CONTACTO CON SUSTANCIAS PELIGROSAS"],"controles":["Usar lentes y guantes adecuados.","Manipular restos de fibra con cuidado y desecharlos en recipiente seguro.","Mantener limpia y ordenada el área de trabajo.","Manipular alcohol isopropílico de forma segura y mantener el recipiente cerrado.","No dejar residuos de fibra expuestos ni dirigir el láser óptico hacia los ojos."]},
    {"tarea":"TRABAJO EN DOMICILIO DEL CLIENTE","danos":["CAIDA A NIVEL","GOLPES","CORTES","LESIONES EN MANOS","OTROS"],"controles":["Coordinar con el cliente el área a intervenir y mantener trato adecuado.","Proteger bienes, acabados y zonas de tránsito del cliente.","Mantener orden y limpieza durante toda la atención.","Informar antes de perforaciones, movimientos de equipos o intervención visible.","Dejar el área segura y limpia antes de retirarse."]},
    {"tarea":"ORDEN Y LIMPIEZA DEL AREA","danos":["CAIDA A NIVEL","CORTES","LESIONES EN MANOS"],"controles":["Retirar residuos, sobrantes y restos de fibra.","Guardar herramientas, materiales y equipos.","Dejar la zona segura, limpia y sin elementos que generen tropiezos o cortes.","Realizar una revisión final antes de retirarse."]}
  ]$json$::jsonb,
  $json$[
    {"texto":"Se ha aislado y señalizado el área de trabajo en el nivel inferior (suelo).","critico":false,"estado":"","observacion":""},
    {"texto":"Los trabajadores revisan los accesos al área de trabajo y los requerimientos de rescate en caso de una emergencia.","critico":true,"estado":"","observacion":""},
    {"texto":"El personal está entrenado para realizar trabajos en altura.","critico":true,"estado":"","observacion":""},
    {"texto":"El personal cuenta con el EPP adecuado para trabajo en altura.","critico":true,"estado":"","observacion":""},
    {"texto":"Ha inspeccionado su EPP y verificado que se encuentra en buen estado.","critico":true,"estado":"","observacion":""},
    {"texto":"Se cuenta con una estructura donde el trabajador pueda asegurarse.","critico":true,"estado":"","observacion":""},
    {"texto":"Los trabajadores realizan los PETAR y ATS en el lugar de trabajo y lo socializan antes de iniciar.","critico":true,"estado":"","observacion":""},
    {"texto":"Se tienen en cuenta medidas de trabajo seguras para labores en cercanías a líneas y/o equipos energizados.","critico":true,"estado":"","observacion":""},
    {"texto":"Se considera la presencia de un observador que advierta al personal de entorno la posible caída de materiales y/o carga.","critico":false,"estado":"","observacion":""},
    {"texto":"Se recalcó al personal que siempre debe estar enganchado a su punto de anclaje con el estrobo.","critico":true,"estado":"","observacion":""}
  ]$json$::jsonb,
  now()
)
on conflict(id) do update set
  source_version=excluded.source_version,
  epp=excluded.epp,
  epp_petar=excluded.epp_petar,
  tareas=excluded.tareas,
  checklist=excluded.checklist,
  updated_at=now();

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

  if not found or not coalesce(perm.activo,false) or not coalesce(perm.ver,false)
     or public.mv_actividad_texto(coalesce(perm.alcance_datos,''))='SIN ACCESO' then
    raise exception 'No tiene permiso para Seguridad';
  end if;

  return u || jsonb_build_object(
    'puedeVer',coalesce(perm.ver,false),
    'puedeRegistrar',coalesce(perm.registrar,false),
    'puedeEditar',coalesce(perm.editar,false),
    'puedeObservar',coalesce(perm.observar,false),
    'puedeAprobar',coalesce(perm.aprobar,false),
    'puedeValidar',coalesce(perm.validar,false),
    'puedeDescargar',coalesce(perm.descargar,false),
    'puedeAdministrar',coalesce(perm.administrar,false),
    'alcanceDatos',coalesce(perm.alcance_datos,'')
  );
end;
$$;

create or replace function public.mv_seguridad_catalogo()
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  cfg public.seguridad_config_migracion%rowtype;
  herramientas jsonb;
begin
  select * into cfg
  from public.seguridad_config_migracion
  where id='SEGURIDAD_V437';

  if not found then raise exception 'Configuración Seguridad V437 no encontrada'; end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'herramienta',h.herramienta,
        'categoria',coalesce(nullif(trim(h.categoria),''),'GENERAL')
      )
      order by
        public.mv_actividad_texto(coalesce(h.categoria,'GENERAL')),
        public.mv_actividad_texto(h.herramienta)
    ),
    '[]'::jsonb
  )
  into herramientas
  from public.catalogo_herramientas_migracion h
  where public.mv_actividad_texto(coalesce(h.estado,'ACTIVO'))='ACTIVO';

  return jsonb_build_object(
    'epp',cfg.epp,
    'eppPetar',cfg.epp_petar,
    'herramientas',herramientas,
    'tareas',cfg.tareas,
    'catalogoCompleto',true,
    'sourceVersion',cfg.source_version
  );
end;
$$;

create or replace function public.mv_seguridad_checklist_base()
returns jsonb
language sql
stable
set search_path=public
as $$
  select checklist
  from public.seguridad_config_migracion
  where id='SEGURIDAD_V437';
$$;

create or replace function public.mv_seguridad_integrantes_cuadrilla(p_cuadrilla text)
returns jsonb
language sql
stable
set search_path=public
as $$
  with q as (
    select
      public.mv_bono_sup_usuario_key(u.usuario) usuario,
      coalesce(nullif(trim(u.nombres_apellidos),''),u.usuario) nombre,
      row_number() over(order by u.usuario) rn
    from public.app_users u
    where public.mv_actividad_cuadrilla_norm(u.cuadrilla)=public.mv_actividad_cuadrilla_norm(p_cuadrilla)
      and public.mv_actividad_texto(u.perfil)='TECNICO'
      and public.mv_actividad_texto(coalesce(u.estado,'ACTIVO'))='ACTIVO'
    order by u.usuario
    limit 2
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'usuario',usuario,
        'nombre',nombre,
        'cargo',case when rn=1 then 'T1' else 'T2' end
      )
      order by rn
    ),
    '[]'::jsonb
  )
  from q;
$$;

create or replace function public.mv_seguridad_supervisor_json(p_usuario_supervisor text)
returns jsonb
language sql
stable
set search_path=public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'usuario',public.mv_bono_sup_usuario_key(u.usuario),
        'nombre',coalesce(nullif(trim(u.nombres_apellidos),''),u.usuario)
      )
      from public.app_users u
      where public.mv_bono_sup_usuario_key(u.usuario)=public.mv_bono_sup_usuario_key(p_usuario_supervisor)
      limit 1
    ),
    jsonb_build_object('usuario','','nombre','')
  );
$$;

create or replace function public.mv_seguridad_numero_texto(p_numero integer)
returns text
language sql
immutable
set search_path=public
as $$
  select lpad(coalesce(p_numero,0)::text,6,'0');
$$;

create or replace function public.mv_seguridad_resumen_ats_json(a public.seguridad_ats_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',a.id,
    'numero',public.mv_seguridad_numero_texto(a.numero),
    'fecha',case when a.fecha is null then '' else to_char(a.fecha,'DD/MM/YYYY') end,
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

create or replace function public.mv_seguridad_ats_json(a public.seguridad_ats_migracion)
returns jsonb
language sql
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',a.id,
    'numero',public.mv_seguridad_numero_texto(a.numero),
    'fecha',case when a.fecha is null then '' else to_char(a.fecha,'DD/MM/YYYY') end,
    'horaInicio',case when a.hora_inicio is null then '' else to_char(a.hora_inicio,'HH12:MI AM') end,
    'horaFinal',case when a.hora_final is null then '' else to_char(a.hora_final,'HH12:MI AM') end,
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
    'numero',public.mv_seguridad_numero_texto(p.numero),
    'atsId',coalesce(p.ats_id,''),
    'fecha',case when p.fecha is null then '' else to_char(p.fecha,'DD/MM/YYYY') end,
    'horaInicio',case when p.hora_inicio is null then '' else to_char(p.hora_inicio,'HH12:MI AM') end,
    'horaFinal',case when p.hora_final is null then '' else to_char(p.hora_final,'HH12:MI AM') end,
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

create or replace function public.mv_seguridad_crear_ats_dia(
  p_usuario text,
  p_gps text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  hoy date:=(clock_timestamp() at time zone 'America/Lima')::date;
  existente public.seguridad_ats_migracion%rowtype;
  integrantes jsonb;
  sup jsonb;
  cfg public.seguridad_config_migracion%rowtype;
  tarea_base jsonb;
  controles_texto text;
  epp_base jsonb;
  epp_petar_base jsonb;
  ats_num integer;
  petar_num integer;
  ats_id text;
  petar_id text;
  t1 jsonb;
  t2 jsonb;
  trabajo_u text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if u->>'perfil'<>'TECNICO'
     or not coalesce((u->>'puedeRegistrar')::boolean,false) then
    raise exception 'Solo Técnico puede generar ATS/PETAR';
  end if;

  select *
  into existente
  from public.seguridad_ats_migracion a
  where a.fecha=hoy
    and public.mv_actividad_cuadrilla_norm(a.cuadrilla)
        =public.mv_actividad_cuadrilla_norm(u->>'cuadrilla')
  order by a.created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok',true,
      'id',existente.id,
      'numero',public.mv_seguridad_numero_texto(existente.numero),
      'existente',true
    );
  end if;

  integrantes:=public.mv_seguridad_integrantes_cuadrilla(u->>'cuadrilla');
  t1:=coalesce(integrantes->0,'{}'::jsonb);
  t2:=coalesce(integrantes->1,'{}'::jsonb);
  sup:=public.mv_seguridad_supervisor_json(u->>'usuarioSupervisor');

  select * into cfg
  from public.seguridad_config_migracion
  where id='SEGURIDAD_V437';

  if not found then raise exception 'Configuración Seguridad V437 no encontrada'; end if;

  select x
  into tarea_base
  from jsonb_array_elements(cfg.tareas) x
  where public.mv_actividad_texto(x->>'tarea')='TRASLADO AL PUNTO DE TRABAJO'
  limit 1;

  if tarea_base is null then tarea_base:=cfg.tareas->0; end if;

  select string_agg(value,E'\n')
  into controles_texto
  from jsonb_array_elements_text(coalesce(tarea_base->'controles','[]'::jsonb));

  tarea_base:=jsonb_build_object(
    'tarea',coalesce(tarea_base->>'tarea',''),
    'danos',coalesce(tarea_base->'danos','[]'::jsonb),
    'controles',coalesce(controles_texto,'')
  );

  select coalesce(jsonb_agg(to_jsonb(value)),'[]'::jsonb)
  into epp_base
  from jsonb_array_elements_text(cfg.epp)
  where public.mv_actividad_texto(value)<>'OTROS';

  select coalesce(jsonb_agg(to_jsonb(value)),'[]'::jsonb)
  into epp_petar_base
  from jsonb_array_elements_text(cfg.epp_petar)
  where public.mv_actividad_texto(value)<>'OTROS';

  perform pg_advisory_xact_lock(hashtext('SEGURIDAD_V437_NUMERACION'));

  select *
  into existente
  from public.seguridad_ats_migracion a
  where a.fecha=hoy
    and public.mv_actividad_cuadrilla_norm(a.cuadrilla)
        =public.mv_actividad_cuadrilla_norm(u->>'cuadrilla')
  order by a.created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok',true,
      'id',existente.id,
      'numero',public.mv_seguridad_numero_texto(existente.numero),
      'existente',true
    );
  end if;

  select coalesce(max(numero),0)+1 into ats_num
  from public.seguridad_ats_migracion;

  select coalesce(max(numero),0)+1 into petar_num
  from public.seguridad_petar_migracion;

  ats_id:='ATS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  petar_id:='PET-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  trabajo_u:=coalesce(nullif(trim(u->>'plataforma'),''),'TRABAJO TECNICO');

  insert into public.seguridad_ats_migracion(
    id,numero,fecha,hora_inicio,hora_final,sede,plataforma,cuadrilla,
    t1_usuario,t1_nombre,t2_usuario,t2_nombre,
    supervisor_usuario,supervisor_nombre,gps,trabajo,lugar_trabajo,
    epp_json,herramientas_json,tareas_json,estado,petar_id,aceptaciones_json,
    supervisor_firma_json,validador_firma_json,observacion,version,pdf_url,pdf_id,
    creado_por,creado_en,actualizado_en,source_kind,created_at,updated_at
  )
  values(
    ats_id,ats_num,hoy,time '07:45',null,
    u->>'sede',u->>'plataforma',u->>'cuadrilla',
    coalesce(t1->>'usuario',''),coalesce(t1->>'nombre',''),
    coalesce(t2->>'usuario',''),coalesce(t2->>'nombre',''),
    coalesce(sup->>'usuario',''),coalesce(sup->>'nombre',''),
    coalesce(p_gps,''),trabajo_u,u->>'sede',
    epp_base,'[]'::jsonb,jsonb_build_array(tarea_base),
    'BORRADOR',petar_id,'[]'::jsonb,null,null,'',1,'','',
    u->>'usuario',now(),now(),'POSTGRESQL',now(),now()
  );

  insert into public.seguridad_petar_migracion(
    id,numero,ats_id,fecha,hora_inicio,hora_final,sede,cuadrilla,
    trabajo,ubicacion,checklist_json,epp_json,estado,no_cumple_critico,
    pdf_url,pdf_id,version,actualizado_en,source_kind,created_at,updated_at
  )
  values(
    petar_id,petar_num,ats_id,hoy,time '07:45',null,
    u->>'sede',u->>'cuadrilla',trabajo_u,u->>'sede',
    cfg.checklist,epp_petar_base,'BORRADOR','NO','','',1,now(),
    'POSTGRESQL',now(),now()
  );

  insert into public.seguridad_eventos_migracion(
    ats_id,petar_id,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    ats_id,petar_id,'CREAR_ATS_DIA',u->>'usuario',u->>'perfil',
    jsonb_build_object(
      'numeroAts',public.mv_seguridad_numero_texto(ats_num),
      'numeroPetar',public.mv_seguridad_numero_texto(petar_num),
      'fecha',to_char(hoy,'DD/MM/YYYY'),
      'horaInicio','07:45 AM'
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'id',ats_id,
    'numero',public.mv_seguridad_numero_texto(ats_num),
    'petarNumero',public.mv_seguridad_numero_texto(petar_num)
  );
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

  if u->>'perfil'<>'TECNICO'
     or not coalesce((u->>'puedeEditar')::boolean,false) then
    raise exception 'No puede editar ATS';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  if public.mv_actividad_cuadrilla_norm(a.cuadrilla)
     <>public.mv_actividad_cuadrilla_norm(u->>'cuadrilla') then
    raise exception 'ATS de otra cuadrilla';
  end if;

  if a.estado not in ('BORRADOR','OBSERVADO') then
    raise exception 'El documento está bloqueado';
  end if;

  update public.seguridad_ats_migracion
  set hora_inicio=coalesce(
        public.mv_seguridad_time(to_jsonb(nullif(trim(coalesce(p_data->>'horaInicio','')),''))),
        hora_inicio,
        time '07:45'
      ),
      hora_final=public.mv_seguridad_time(to_jsonb(nullif(trim(coalesce(p_data->>'horaFinal','')),''))),
      trabajo=coalesce(nullif(p_data->>'trabajo',''),trabajo),
      lugar_trabajo=coalesce(nullif(p_data->>'lugarTrabajo',''),lugar_trabajo),
      epp_json=case when jsonb_typeof(p_data->'epp')='array' then p_data->'epp' else '[]'::jsonb end,
      herramientas_json=case when jsonb_typeof(p_data->'herramientas')='array' then p_data->'herramientas' else herramientas_json end,
      tareas_json=case when jsonb_typeof(p_data->'tareas')='array' then p_data->'tareas' else '[]'::jsonb end,
      actualizado_en=now(),
      updated_at=now()
  where id=p_id;

  petar_data:=p_data->'petar';

  if petar_data is not null
     and jsonb_typeof(petar_data)='object'
     and coalesce(a.petar_id,'')<>'' then

    select
      case when jsonb_typeof(petar_data->'checklist')='array'
           then petar_data->'checklist'
           else p.checklist_json end,
      case when jsonb_typeof(petar_data->'epp')='array'
           then petar_data->'epp'
           else '[]'::jsonb end
    into checklist_nuevo,epp_petar_nuevo
    from public.seguridad_petar_migracion p
    where p.id=a.petar_id;

    critico:=public.mv_seguridad_no_cumple_critico(checklist_nuevo);

    update public.seguridad_petar_migracion
    set hora_inicio=(select hora_inicio from public.seguridad_ats_migracion where id=p_id),
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
  )
  values(
    p_id,a.petar_id,'GUARDAR_BORRADOR',u->>'usuario',u->>'perfil',
    jsonb_build_object('estado',a.estado),'POSTGRESQL'
  );

  return jsonb_build_object('ok',true);
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
  existe_integrante boolean;
  completos boolean;
  nuevo_estado text;
  hora_fin time;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);
  usuario_u:=u->>'usuario';
  firma:=public.mv_seguridad_firma_activa_json(usuario_u);

  if not coalesce((firma->>'activa')::boolean,false)
     or coalesce(firma->>'url','')='' then
    raise exception 'Registre su firma digital antes de aceptar';
  end if;

  select * into a
  from public.seguridad_ats_migracion
  where id=p_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  if u->>'perfil'<>'TECNICO'
     or public.mv_actividad_cuadrilla_norm(a.cuadrilla)
        <>public.mv_actividad_cuadrilla_norm(u->>'cuadrilla') then
    raise exception 'No puede aceptar este ATS';
  end if;

  existe_integrante :=
    usuario_u=public.mv_bono_sup_usuario_key(a.t1_usuario)
    or usuario_u=public.mv_bono_sup_usuario_key(a.t2_usuario);

  if not existe_integrante then
    raise exception 'No figura como integrante de la cuadrilla';
  end if;

  if a.hora_final is null then
    hora_fin:=(clock_timestamp() at time zone 'America/Lima')::time;

    update public.seguridad_ats_migracion
    set hora_final=hora_fin,actualizado_en=now(),updated_at=now()
    where id=p_id;

    if coalesce(a.petar_id,'')<>'' then
      update public.seguridad_petar_migracion
      set hora_final=hora_fin,actualizado_en=now(),updated_at=now()
      where id=a.petar_id;
    end if;
  end if;

  select coalesce(jsonb_agg(x),'[]'::jsonb)
  into acept
  from jsonb_array_elements(coalesce(a.aceptaciones_json,'[]'::jsonb)) x
  where public.mv_bono_sup_usuario_key(x->>'usuario')<>usuario_u;

  acept:=acept||jsonb_build_array(
    jsonb_build_object(
      'usuario',usuario_u,
      'nombre',coalesce(u->>'nombresApellidos',''),
      'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
      'gps',coalesce(p_gps,''),
      'firma',jsonb_build_object(
        'url',firma->>'url',
        'version',firma->'version'
      )
    )
  );

  completos :=
    public.mv_seguridad_total_integrantes(a)>0
    and (
      (coalesce(trim(a.t1_usuario),'')='' or exists(
        select 1 from jsonb_array_elements(acept) x
        where public.mv_bono_sup_usuario_key(x->>'usuario')
             =public.mv_bono_sup_usuario_key(a.t1_usuario)
      ))
      and
      (coalesce(trim(a.t2_usuario),'')='' or exists(
        select 1 from jsonb_array_elements(acept) x
        where public.mv_bono_sup_usuario_key(x->>'usuario')
             =public.mv_bono_sup_usuario_key(a.t2_usuario)
      ))
    );

  nuevo_estado:=case when completos then 'PENDIENTE SUPERVISOR' else 'PENDIENTE ACEPTACION' end;

  update public.seguridad_ats_migracion
  set aceptaciones_json=acept,
      estado=nuevo_estado,
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
  )
  values(
    p_id,a.petar_id,'ACEPTAR_TECNICO',usuario_u,u->>'perfil',
    jsonb_build_object('gps',coalesce(p_gps,''),'estado',nuevo_estado),
    'POSTGRESQL'
  );

  return jsonb_build_object('ok',true,'estado',nuevo_estado);
end;
$$;

create or replace function public.mv_seguridad_autocompletar_aceptaciones(
  p_ats_id text,
  p_actor text,
  p_actor_perfil text,
  p_actor_nombre text,
  p_origen text default 'AUTORIZACION',
  p_gps text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.seguridad_ats_migracion%rowtype;
  acept jsonb;
  firma_actor jsonb;
  firma_tecnico jsonb;
  usar jsonb;
  usuario_i text;
  nombre_i text;
  cargo_i text;
  ya boolean;
  fuente text;
begin
  select * into a
  from public.seguridad_ats_migracion
  where id=p_ats_id
  for update;

  if not found then raise exception 'ATS no encontrado'; end if;

  firma_actor:=public.mv_seguridad_firma_activa_json(p_actor);
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
      where public.mv_bono_sup_usuario_key(x->>'usuario')
            =public.mv_bono_sup_usuario_key(usuario_i)
    )
    into ya;

    if ya then continue; end if;

    firma_tecnico:=public.mv_seguridad_firma_activa_json(usuario_i);

    if coalesce((firma_tecnico->>'activa')::boolean,false)
       and coalesce(firma_tecnico->>'url','')<>'' then
      usar:=firma_tecnico;
      fuente:='FIRMA_TECNICO_REGISTRADA';
    else
      usar:=firma_actor;
      fuente:='FIRMA_AUTORIZADOR_SUPLENCIA';
    end if;

    if usar is null
       or not coalesce((usar->>'activa')::boolean,false)
       or coalesce(usar->>'url','')='' then
      continue;
    end if;

    acept:=acept||jsonb_build_array(
      jsonb_build_object(
        'usuario',usuario_i,
        'nombre',coalesce(nombre_i,''),
        'fecha',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI:SS'),
        'gps',coalesce(p_gps,''),
        'firma',jsonb_build_object(
          'url',usar->>'url',
          'version',usar->'version'
        ),
        'autocompletada','SI',
        'fuente',fuente,
        'autorizadaPor',p_actor,
        'autorizadaNombre',coalesce(p_actor_nombre,''),
        'autorizadaPerfil',p_actor_perfil,
        'origen',coalesce(nullif(p_origen,''),'AUTORIZACION')
      )
    );
  end loop;

  return acept;
end;
$$;

create or replace function public.mv_seguridad_solicitar_cambio_firma(
  p_usuario text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  motivo_u text:=trim(coalesce(p_motivo,''));
  id_u text;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if not exists(
    select 1
    from public.seguridad_firmas_migracion
    where usuario=u->>'usuario' and activa
  ) then
    raise exception 'No tiene una firma activa';
  end if;

  if motivo_u='' then raise exception 'Indique el motivo'; end if;

  id_u:='SF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.seguridad_firma_solicitudes_migracion(
    id,usuario,nombre,sede,motivo,estado,solicitado_en,
    source_kind,created_at,updated_at
  )
  values(
    id_u,u->>'usuario',coalesce(u->>'nombresApellidos',''),u->>'sede',
    motivo_u,'PENDIENTE',now(),'POSTGRESQL',now(),now()
  );

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    u->>'usuario','SOLICITAR_CAMBIO_FIRMA',u->>'usuario',u->>'perfil',
    jsonb_build_object('solicitudId',id_u,'motivo',motivo_u),
    'POSTGRESQL'
  );

  return jsonb_build_object('ok',true,'id',id_u);
end;
$$;

create or replace function public.mv_seguridad_resolver_cambio_firma(
  p_usuario text,
  p_id text,
  p_resultado text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  s public.seguridad_firma_solicitudes_migracion%rowtype;
  resultado_u text:=public.mv_actividad_texto(p_resultado);
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if not coalesce((u->>'puedeAprobar')::boolean,false) then
    raise exception 'No puede autorizar cambios de firma';
  end if;

  select * into s
  from public.seguridad_firma_solicitudes_migracion
  where id=p_id
  for update;

  if not found then raise exception 'Solicitud no encontrada'; end if;
  if public.mv_actividad_texto(s.estado)<>'PENDIENTE' then
    raise exception 'Solicitud ya resuelta';
  end if;

  if u->>'perfil'='SUPERVISOR'
     and public.mv_actividad_texto(s.sede)<>public.mv_actividad_texto(u->>'sede') then
    raise exception 'Solo puede autorizar su sede';
  end if;

  if public.mv_bono_sup_usuario_key(s.usuario)=u->>'usuario' then
    raise exception 'No puede autorizar su propio cambio';
  end if;

  if resultado_u not in ('APROBADO','RECHAZADO') then
    raise exception 'Resultado no válido';
  end if;

  update public.seguridad_firma_solicitudes_migracion
  set estado=resultado_u,
      resuelto_por=u->>'usuario',
      resuelto_en=now(),
      updated_at=now()
  where id=p_id;

  if resultado_u='APROBADO' then
    update public.seguridad_firmas_migracion
    set activa=false,updated_at=now()
    where usuario=s.usuario and activa;
  end if;

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    s.usuario,'RESOLVER_CAMBIO_FIRMA',u->>'usuario',u->>'perfil',
    jsonb_build_object('solicitudId',p_id,'resultado',resultado_u),
    'POSTGRESQL'
  );

  return jsonb_build_object('ok',true,'estado',resultado_u);
end;
$$;

create or replace function public.mv_seguridad_registrar_firma(
  p_usuario text,
  p_dni text,
  p_gps text,
  p_url text,
  p_archivo_id text default null,
  p_autorizacion_cambio_id text default null,
  p_reintento boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  usuario_u text;
  dni_u text:=regexp_replace(coalesce(p_dni,''),'[^0-9]','','g');
  url_u text:=trim(coalesce(p_url,''));
  actual jsonb;
  version_nueva integer;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);
  usuario_u:=u->>'usuario';

  actual:=public.mv_seguridad_firma_activa_json(usuario_u);

  if coalesce((actual->>'activa')::boolean,false) then
    if p_reintento then
      return jsonb_build_object(
        'ok',true,
        'version',actual->'version',
        'url',actual->>'url',
        'existente',true
      );
    end if;
    raise exception 'Ya tiene una firma activa. Solicite autorización para cambiarla.';
  end if;

  if length(dni_u)<8 then raise exception 'DNI no válido'; end if;
  if url_u='' then raise exception 'Dibuje su firma'; end if;

  select coalesce(max(version),0)+1
  into version_nueva
  from public.seguridad_firmas_migracion
  where usuario=usuario_u;

  insert into public.seguridad_firmas_migracion(
    usuario,version,nombre,dni,perfil,sede,activa,archivo_id,url,gps_registro,
    fecha_registro,autorizacion_cambio_id,source_kind,created_at,updated_at
  )
  values(
    usuario_u,version_nueva,
    coalesce(u->>'nombresApellidos',''),
    dni_u,u->>'perfil',u->>'sede',true,
    nullif(trim(coalesce(p_archivo_id,'')),''),
    url_u,nullif(trim(coalesce(p_gps,'')),''),
    now(),nullif(trim(coalesce(p_autorizacion_cambio_id,'')),''),
    'POSTGRESQL',now(),now()
  );

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    usuario_u,'REGISTRAR_FIRMA',usuario_u,u->>'perfil',
    jsonb_build_object(
      'version',version_nueva,
      'gps',coalesce(p_gps,''),
      'autorizacionCambioId',coalesce(p_autorizacion_cambio_id,'')
    ),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,
    'version',version_nueva,
    'url',url_u
  );
end;
$$;

create or replace function public.mv_seguridad_reiniciar_firma_pruebas(
  p_usuario text,
  p_usuario_objetivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  objetivo text;
  n integer:=0;
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  if public.mv_actividad_texto(u->>'perfil')
     not in ('JEFATURA','JEFATURA GENERAL','ADMIN','ADMINISTRADOR') then
    raise exception 'Solo Jefatura puede reiniciar firmas durante pruebas';
  end if;

  objetivo:=public.mv_bono_sup_usuario_key(
    coalesce(nullif(trim(coalesce(p_usuario_objetivo,'')),''),u->>'usuario')
  );

  delete from public.seguridad_firmas_migracion
  where usuario=objetivo;
  get diagnostics n=row_count;

  delete from public.seguridad_firma_solicitudes_migracion
  where usuario=objetivo;

  insert into public.seguridad_eventos_migracion(
    firma_usuario,evento,usuario_actor,perfil_actor,detalle,source_kind
  )
  values(
    objetivo,'REINICIAR_FIRMA_PRUEBAS',u->>'usuario',u->>'perfil',
    jsonb_build_object('borradas',n),'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'usuario',objetivo,'borradas',n,'reiniciado',true
  );
end;
$$;

revoke execute on function public.mv_seguridad_contexto_usuario(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_catalogo() from public,anon,authenticated;
revoke execute on function public.mv_seguridad_checklist_base() from public,anon,authenticated;
revoke execute on function public.mv_seguridad_integrantes_cuadrilla(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_supervisor_json(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_numero_texto(integer) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_resumen_ats_json(public.seguridad_ats_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_ats_json(public.seguridad_ats_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_petar_json(public.seguridad_petar_migracion) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_crear_ats_dia(text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_guardar_ats(text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_aceptar_ats(text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_solicitar_cambio_firma(text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_resolver_cambio_firma(text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_registrar_firma(text,text,text,text,text,text,boolean) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_reiniciar_firma_pruebas(text,text) from public,anon,authenticated;

grant execute on function public.mv_seguridad_contexto_usuario(text) to service_role;
grant execute on function public.mv_seguridad_catalogo() to service_role;
grant execute on function public.mv_seguridad_checklist_base() to service_role;
grant execute on function public.mv_seguridad_integrantes_cuadrilla(text) to service_role;
grant execute on function public.mv_seguridad_supervisor_json(text) to service_role;
grant execute on function public.mv_seguridad_numero_texto(integer) to service_role;
grant execute on function public.mv_seguridad_resumen_ats_json(public.seguridad_ats_migracion) to service_role;
grant execute on function public.mv_seguridad_ats_json(public.seguridad_ats_migracion) to service_role;
grant execute on function public.mv_seguridad_petar_json(public.seguridad_petar_migracion) to service_role;
grant execute on function public.mv_seguridad_crear_ats_dia(text,text) to service_role;
grant execute on function public.mv_seguridad_guardar_ats(text,text,jsonb) to service_role;
grant execute on function public.mv_seguridad_aceptar_ats(text,text,text) to service_role;
grant execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text,text,text) to service_role;
grant execute on function public.mv_seguridad_solicitar_cambio_firma(text,text) to service_role;
grant execute on function public.mv_seguridad_resolver_cambio_firma(text,text,text) to service_role;
grant execute on function public.mv_seguridad_registrar_firma(text,text,text,text,text,text,boolean) to service_role;
grant execute on function public.mv_seguridad_reiniciar_firma_pruebas(text,text) to service_role;
