
-- 082_bono_supervisores_api_control.sql
-- API backend y escrituras manuales de Bonos Supervisores.
-- La UI legacy continúa operando en Apps Script hasta cutover.

create or replace function public.mv_bono_sup_es_jefatura(p_perfil text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select public.mv_actividad_texto(p_perfil) in ('JEFATURA','ADMIN','ADMINISTRADOR');
$$;

create or replace function public.mv_bono_sup_preguntas()
returns jsonb
language sql
immutable
set search_path=public
as $$
select jsonb_build_array(
  '¿Verificó que sus cuadrillas cumplieran con el uso correcto de EPP?',
  '¿Realizó seguimiento a las observaciones de seguridad detectadas?',
  '¿Corrigió oportunamente las condiciones o actos inseguros reportados?',
  '¿Comunicó oportunamente las alertas y disposiciones de seguridad?',
  '¿Reforzó los procedimientos de seguridad con sus cuadrillas?',
  '¿Controló el inicio oportuno de jornada de sus cuadrillas?',
  '¿Realizó seguimiento al cumplimiento de las rutas asignadas?',
  '¿Atendió oportunamente las incidencias reportadas durante la jornada?',
  '¿Verificó el cumplimiento de los procedimientos establecidos por WIN?',
  '¿Mantuvo actualizada la información operativa bajo su responsabilidad?',
  '¿Brindó orientación clara a sus cuadrillas durante el mes?',
  '¿Mantuvo una comunicación respetuosa y efectiva con su equipo?',
  '¿Tomó decisiones oportunas ante problemas operativos?',
  '¿Promovió el trabajo coordinado entre los integrantes de sus cuadrillas?',
  '¿Mostró disposición para apoyar y resolver consultas de su equipo?',
  '¿Realizó seguimiento a las cuadrillas con indicadores rezagados?',
  '¿Impulsó acciones para mejorar la productividad y efectividad?',
  '¿Dio seguimiento al cierre de observaciones dentro de los plazos?',
  '¿Informó oportunamente a Jefatura sobre riesgos o incumplimientos?',
  '¿Cumplió los compromisos y acciones asignadas durante el período?'
);
$$;

create or replace function public.mv_bono_sup_generar_escalas(
  p_monto_total numeric,
  p_entrada jsonb
)
returns jsonb
language plpgsql
immutable
set search_path=public
as $$
declare
  monto numeric:=round(p_monto_total,2);
  claves text[]:=array['PRODUCTIVIDAD','CALIDAD','SLA','SATISFACCION','SEGURIDAD'];
  cantidades integer[]:=array[3,3,3,2,2];
  pesos numeric[]:=array[0.25,0.25,0.20,0.15,0.15];
  proporciones jsonb[]:=array[
    '[0.60,0.80,1.00]'::jsonb,
    '[0.60,0.80,1.00]'::jsonb,
    '[0.50,0.75,1.00]'::jsonb,
    '[0.6666666666666667,1.00]'::jsonb,
    '[0.6666666666666667,1.00]'::jsonb
  ];
  defaults jsonb:=public.mv_bono_sup_default_escalas();
  salida jsonb:='{}'::jsonb;
  lista jsonb;
  props jsonb;
  niveles jsonb;
  item jsonb;
  desde numeric;
  anterior numeric;
  maximo numeric;
  monto_nivel numeric;
  i integer;
  j integer;
begin
  if monto is null or monto<=0 or monto>100000 then
    raise exception 'El bono máximo debe ser mayor a cero y no superar S/ 100,000';
  end if;

  for i in 1..array_length(claves,1) loop
    lista:=case
      when p_entrada is not null
       and jsonb_typeof(p_entrada->claves[i])='array'
      then p_entrada->claves[i]
      else defaults->claves[i]
    end;

    if jsonb_array_length(lista)<>cantidades[i] then
      raise exception '% debe conservar % niveles',claves[i],cantidades[i];
    end if;

    anterior:=-1;
    niveles:='[]'::jsonb;
    maximo:=case
      when i<5 then round(monto*pesos[i],2)
      else monto
           -round(monto*pesos[1],2)
           -round(monto*pesos[2],2)
           -round(monto*pesos[3],2)
           -round(monto*pesos[4],2)
    end;
    props:=proporciones[i];

    for j in 0..cantidades[i]-1 loop
      item:=lista->j;
      desde:=nullif(item->>'desde','')::numeric;
      if desde is null or desde<0 or desde>100 then
        raise exception 'El porcentaje del nivel % de % debe estar entre 0%% y 100%%',j+1,claves[i];
      end if;
      if desde<=anterior then
        raise exception 'Los porcentajes de % deben aumentar en cada nivel',claves[i];
      end if;
      anterior:=desde;

      monto_nivel:=case
        when j=cantidades[i]-1 then maximo
        else round(maximo*((props->>j)::numeric),2)
      end;

      niveles:=niveles||jsonb_build_array(
        jsonb_build_object('desde',round(desde,2),'monto',monto_nivel)
      );
    end loop;

    salida:=salida||jsonb_build_object(claves[i],niveles);
  end loop;

  return salida;
end;
$$;

create or replace function public.mv_bono_sup_periodos_disponibles()
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  d date:=date '2026-07-01';
  fin date:=date_trunc('month',clock_timestamp() at time zone 'America/Lima')::date;
  arr jsonb:='[]'::jsonb;
begin
  while d<=fin loop
    arr:=jsonb_build_array(to_char(d,'YYYY-MM'))||arr;
    d:=(d+interval '1 month')::date;
  end loop;
  return arr;
end;
$$;

create or replace function public.mv_bono_sup_parametros_sla(p_periodo text)
returns jsonb
language sql
stable
set search_path=public
as $$
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'id',p.id,
      'tipoOrden',p.tipo_orden,
      'clasificacion',p.clasificacion,
      'minutos',p.sla_minutos,
      'vigenciaDesde',coalesce(to_char(p.vigencia_desde,'YYYY-MM-DD'),''),
      'vigenciaHasta',coalesce(to_char(p.vigencia_hasta,'YYYY-MM-DD'),''),
      'estado','ACTIVO'
    )
    order by p.source_row
  ),
  '[]'::jsonb
)
from public.mv_sla_parametro_periodo_v323 p
where p.periodo=public.mv_bono_sup_periodo(p_periodo);
$$;

create or replace function public.mv_bono_sup_obtener(
  p_usuario text,
  p_periodo text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  perfil_u text;
  usuario_u text;
  p text;
  puede_editar boolean;
  asign record;
  bonos jsonb:='[]'::jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  perfil_u:=u->>'perfil';
  usuario_u:=u->>'usuario';

  if perfil_u<>'SUPERVISOR'
     and not public.mv_bono_sup_es_jefatura(perfil_u)
     and perfil_u<>'GERENCIA LIMA' then
    raise exception 'El bono de supervisores solo está disponible en los dashboards autorizados';
  end if;

  p:=public.mv_bono_sup_periodo(p_periodo);
  if p='' then p:=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM'); end if;
  puede_editar:=public.mv_bono_sup_es_jefatura(perfil_u);

  for asign in
    select *
    from public.mv_bono_sup_asignaciones_periodo(p) a
    where perfil_u<>'SUPERVISOR' or a.usuario=usuario_u
    order by a.sede,a.usuario
  loop
    bonos:=bonos||jsonb_build_array(
      public.mv_bono_sup_calcular_supervisor(p,asign.usuario)
      ||jsonb_build_object('puedeEditar',puede_editar)
    );
  end loop;

  return jsonb_build_object(
    'ok',true,
    'modulo','BONO_SUPERVISORES',
    'accion','OBTENER',
    'periodo',p,
    'bonos',bonos,
    'periodosDisponibles',public.mv_bono_sup_periodos_disponibles(),
    'puedeEditar',puede_editar,
    'puedeEditarSla',puede_editar and p>='2026-07',
    'puedeEditarConfiguracion',puede_editar,
    'configuracion',public.mv_bono_sup_configuracion_json(p),
    'parametrosSla',public.mv_bono_sup_parametros_sla(p),
    'parametrosSlaConfiguracion',public.mv_bono_sup_parametros_sla(p),
    'criterio','SUMA_COMPONENTES',
    'metasDashboard',jsonb_build_object(
      'puntosPorCuadrilla',130,
      'efectividadPct',70,
      'recableadoPct',42,
      'vtrGarPct',3,
      'observacionesMonto',300
    ),
    'preguntasLiderazgo',public.mv_bono_sup_preguntas(),
    'nota','El monto se calcula con las escalas fijas configuradas para cada componente.',
    'desdeCache',false,
    'calculadoEn',to_char(clock_timestamp() at time zone 'America/Lima','DD/MM/YYYY HH24:MI')
  );
end;
$$;

create or replace function public.mv_bono_sup_guardar_evaluacion(
  p_usuario text,
  p_periodo text,
  p_supervisor text,
  p_respuestas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  p text:=public.mv_bono_sup_periodo(p_periodo);
  sup text:=public.mv_bono_sup_usuario_key(p_supervisor);
  asign record;
  x jsonb;
  total numeric:=0;
  i integer:=0;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if not public.mv_bono_sup_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura puede registrar la evaluación de liderazgo';
  end if;

  select * into asign
  from public.mv_bono_sup_asignaciones_periodo(p) a
  where a.usuario=sup limit 1;
  if not found then raise exception 'No se encontró al supervisor en el período seleccionado'; end if;

  if jsonb_typeof(p_respuestas)<>'array' or jsonb_array_length(p_respuestas)<>20 then
    raise exception 'Debe responder las 20 preguntas de liderazgo';
  end if;

  for x in select value from jsonb_array_elements(p_respuestas) loop
    i:=i+1;
    if x='null'::jsonb or jsonb_typeof(x)<>'number' then
      raise exception 'Debe seleccionar una opción en la pregunta %',i;
    end if;
    if (x#>>'{}')::numeric not in (0,1.5,3) then
      raise exception 'Puntaje no válido en la pregunta %',i;
    end if;
    total:=total+(x#>>'{}')::numeric;
  end loop;

  insert into public.bono_supervisores_evaluaciones(
    periodo,usuario_supervisor,nombre_supervisor,sede,respuestas,total,
    evaluado_por,fecha_actualizacion,source_kind,created_at,updated_at
  ) values (
    p,sup,asign.nombre,asign.sede,p_respuestas,total,
    u->>'usuario',now(),'POSTGRESQL',now(),now()
  )
  on conflict(periodo,usuario_supervisor) do update set
    nombre_supervisor=excluded.nombre_supervisor,
    sede=excluded.sede,
    respuestas=excluded.respuestas,
    total=excluded.total,
    evaluado_por=excluded.evaluado_por,
    fecha_actualizacion=excluded.fecha_actualizacion,
    source_kind='POSTGRESQL',
    updated_at=now();

  insert into public.bono_supervisores_eventos(
    periodo,usuario_supervisor,evento,usuario_actor,detalle,source_kind
  ) values (
    p,sup,'GUARDAR_EVALUACION',u->>'usuario',
    jsonb_build_object('total',total),'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','BONO_SUPERVISORES','accion','GUARDAR_EVALUACION',
    'periodo',p,'supervisor',sup,'total',total
  );
end;
$$;

create or replace function public.mv_bono_sup_guardar_satisfaccion(
  p_usuario text,
  p_periodo text,
  p_supervisor text,
  p_clientes_llamados integer,
  p_conformes integer,
  p_no_conformes integer,
  p_observacion text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  p text:=public.mv_bono_sup_periodo(p_periodo);
  sup text:=public.mv_bono_sup_usuario_key(p_supervisor);
  asign record;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if not public.mv_bono_sup_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura puede registrar las llamadas opcionales de atención al cliente';
  end if;

  select * into asign
  from public.mv_bono_sup_asignaciones_periodo(p) a
  where a.usuario=sup limit 1;
  if not found then raise exception 'No se encontró al supervisor en el período seleccionado'; end if;

  if coalesce(p_clientes_llamados,-1)<0
     or coalesce(p_conformes,-1)<0
     or coalesce(p_no_conformes,-1)<0 then
    raise exception 'Las cantidades deben ser números enteros iguales o mayores a cero';
  end if;
  if p_clientes_llamados=0 and (p_conformes>0 or p_no_conformes>0) then
    raise exception 'Para no considerar llamadas, registre todos los valores en cero';
  end if;
  if p_conformes+p_no_conformes>p_clientes_llamados then
    raise exception 'Conformes más no conformes no puede superar a los clientes llamados';
  end if;

  insert into public.bono_supervisores_satisfaccion(
    periodo,usuario_supervisor,nombre_supervisor,sede,clientes_llamados,
    conformes,no_conformes,observacion,registrado_por,fecha_actualizacion,
    source_kind,created_at,updated_at
  ) values (
    p,sup,asign.nombre,asign.sede,p_clientes_llamados,p_conformes,p_no_conformes,
    trim(coalesce(p_observacion,'')),u->>'usuario',now(),'POSTGRESQL',now(),now()
  )
  on conflict(periodo,usuario_supervisor) do update set
    nombre_supervisor=excluded.nombre_supervisor,
    sede=excluded.sede,
    clientes_llamados=excluded.clientes_llamados,
    conformes=excluded.conformes,
    no_conformes=excluded.no_conformes,
    observacion=excluded.observacion,
    registrado_por=excluded.registrado_por,
    fecha_actualizacion=excluded.fecha_actualizacion,
    source_kind='POSTGRESQL',
    updated_at=now();

  insert into public.bono_supervisores_eventos(
    periodo,usuario_supervisor,evento,usuario_actor,detalle,source_kind
  ) values (
    p,sup,'GUARDAR_SATISFACCION',u->>'usuario',
    jsonb_build_object(
      'clientesLlamados',p_clientes_llamados,
      'conformes',p_conformes,'noConformes',p_no_conformes
    ),'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','BONO_SUPERVISORES','accion','GUARDAR_SATISFACCION',
    'periodo',p,'supervisor',sup,'llamadasIncluidas',p_clientes_llamados>0
  );
end;
$$;

create or replace function public.mv_bono_sup_guardar_actas(
  p_usuario text,
  p_periodo text,
  p_supervisor text,
  p_respuesta text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  p text:=public.mv_bono_sup_periodo(p_periodo);
  sup text:=public.mv_bono_sup_usuario_key(p_supervisor);
  resp text:=public.mv_actividad_texto(p_respuesta);
  asign record;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if not public.mv_bono_sup_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura puede validar las actas sin pendientes';
  end if;

  if resp in ('SÍ') then resp:='SI'; end if;
  if resp not in ('SI','NO') then
    raise exception 'Seleccione Sí o No para validar las actas sin pendientes';
  end if;

  select * into asign
  from public.mv_bono_sup_asignaciones_periodo(p) a
  where a.usuario=sup limit 1;
  if not found then raise exception 'No se encontró al supervisor en el período seleccionado'; end if;

  insert into public.bono_supervisores_actas(
    periodo,usuario_supervisor,nombre_supervisor,sede,actas_sin_pendientes,
    registrado_por,fecha_actualizacion,source_kind,created_at,updated_at
  ) values (
    p,sup,asign.nombre,asign.sede,resp,u->>'usuario',now(),'POSTGRESQL',now(),now()
  )
  on conflict(periodo,usuario_supervisor) do update set
    nombre_supervisor=excluded.nombre_supervisor,
    sede=excluded.sede,
    actas_sin_pendientes=excluded.actas_sin_pendientes,
    registrado_por=excluded.registrado_por,
    fecha_actualizacion=excluded.fecha_actualizacion,
    source_kind='POSTGRESQL',
    updated_at=now();

  insert into public.bono_supervisores_eventos(
    periodo,usuario_supervisor,evento,usuario_actor,detalle,source_kind
  ) values (
    p,sup,'GUARDAR_ACTAS_SIN_PENDIENTES',u->>'usuario',
    jsonb_build_object('respuesta',resp),'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','BONO_SUPERVISORES',
    'accion','GUARDAR_ACTAS_SIN_PENDIENTES',
    'periodo',p,'supervisor',sup,'respuesta',resp
  );
end;
$$;

create or replace function public.mv_bono_sup_guardar_configuracion(
  p_usuario text,
  p_periodo text,
  p_monto_total numeric,
  p_escalas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u jsonb;
  p text:=public.mv_bono_sup_periodo(p_periodo);
  escalas_final jsonb;
begin
  u:=public.mv_actividad_usuario(p_usuario);
  if not public.mv_bono_sup_es_jefatura(u->>'perfil') then
    raise exception 'Solo Jefatura puede modificar la configuración del bono';
  end if;

  escalas_final:=public.mv_bono_sup_generar_escalas(p_monto_total,p_escalas);

  insert into public.bono_supervisores_configuracion(
    periodo,monto_total,productividad_pct,calidad_pct,sla_pct,satisfaccion_pct,seguridad_pct,
    actualizado_por,fecha_actualizacion,
    activador_productividad,activador_calidad,activador_sla,activador_satisfaccion,activador_seguridad,
    escalas_json,source_kind,created_at,updated_at
  ) values (
    p,round(p_monto_total,2),25,25,20,15,15,
    u->>'usuario',now(),
    (escalas_final->'PRODUCTIVIDAD'->0->>'desde')::numeric,
    (escalas_final->'CALIDAD'->0->>'desde')::numeric,
    (escalas_final->'SLA'->0->>'desde')::numeric,
    (escalas_final->'SATISFACCION'->0->>'desde')::numeric,
    (escalas_final->'SEGURIDAD'->0->>'desde')::numeric,
    escalas_final,'POSTGRESQL',now(),now()
  )
  on conflict(periodo) do update set
    monto_total=excluded.monto_total,
    productividad_pct=25,calidad_pct=25,sla_pct=20,satisfaccion_pct=15,seguridad_pct=15,
    actualizado_por=excluded.actualizado_por,
    fecha_actualizacion=excluded.fecha_actualizacion,
    activador_productividad=excluded.activador_productividad,
    activador_calidad=excluded.activador_calidad,
    activador_sla=excluded.activador_sla,
    activador_satisfaccion=excluded.activador_satisfaccion,
    activador_seguridad=excluded.activador_seguridad,
    escalas_json=excluded.escalas_json,
    source_kind='POSTGRESQL',
    updated_at=now();

  insert into public.bono_supervisores_eventos(
    periodo,evento,usuario_actor,detalle,source_kind
  ) values (
    p,'GUARDAR_CONFIGURACION',u->>'usuario',
    jsonb_build_object('montoTotal',round(p_monto_total,2),'escalas',escalas_final),
    'POSTGRESQL'
  );

  return jsonb_build_object(
    'ok',true,'modulo','BONO_SUPERVISORES','accion','GUARDAR_CONFIGURACION',
    'configuracion',public.mv_bono_sup_configuracion_json(p)
  );
end;
$$;

revoke execute on function public.mv_bono_sup_es_jefatura(text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_preguntas() from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_generar_escalas(numeric,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_periodos_disponibles() from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_parametros_sla(text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_obtener(text,text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_guardar_evaluacion(text,text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_guardar_satisfaccion(text,text,text,integer,integer,integer,text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_guardar_actas(text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_guardar_configuracion(text,text,numeric,jsonb) from public,anon,authenticated;

grant execute on function public.mv_bono_sup_es_jefatura(text) to service_role;
grant execute on function public.mv_bono_sup_preguntas() to service_role;
grant execute on function public.mv_bono_sup_generar_escalas(numeric,jsonb) to service_role;
grant execute on function public.mv_bono_sup_periodos_disponibles() to service_role;
grant execute on function public.mv_bono_sup_parametros_sla(text) to service_role;
grant execute on function public.mv_bono_sup_obtener(text,text) to service_role;
grant execute on function public.mv_bono_sup_guardar_evaluacion(text,text,text,jsonb) to service_role;
grant execute on function public.mv_bono_sup_guardar_satisfaccion(text,text,text,integer,integer,integer,text) to service_role;
grant execute on function public.mv_bono_sup_guardar_actas(text,text,text,text) to service_role;
grant execute on function public.mv_bono_sup_guardar_configuracion(text,text,numeric,jsonb) to service_role;
