
-- 080_bono_supervisores_motor_calculo.sql
-- Motor de cálculo equivalente a la lógica V353/V368 de Apps Script.

-- Corrige respuestas históricas: celda vacía = JSON null; 0 sigue siendo puntaje válido.
update public.bono_supervisores_evaluaciones e
set respuestas = (
  select jsonb_agg(
    case
      when nullif(s.row_json->>(4+i),'') is null then 'null'::jsonb
      else to_jsonb((s.row_json->>(4+i))::numeric)
    end
    order by i
  )
  from public.bono_supervisores_legacy_snapshot s,
       generate_series(0,19) i
  where s.sheet_name='EVALUACION_BONO_SUPERVISORES_20'
    and s.source_row=e.source_row
),
updated_at=now()
where e.source_kind='SHEET';

create or replace function public.mv_bono_sup_default_escalas()
returns jsonb
language sql
immutable
set search_path=public
as $$
select jsonb_build_object(
  'PRODUCTIVIDAD',jsonb_build_array(
    jsonb_build_object('desde',85,'monto',150),
    jsonb_build_object('desde',90,'monto',200),
    jsonb_build_object('desde',100,'monto',250)
  ),
  'CALIDAD',jsonb_build_array(
    jsonb_build_object('desde',85,'monto',150),
    jsonb_build_object('desde',90,'monto',200),
    jsonb_build_object('desde',100,'monto',250)
  ),
  'SLA',jsonb_build_array(
    jsonb_build_object('desde',95,'monto',100),
    jsonb_build_object('desde',98,'monto',150),
    jsonb_build_object('desde',100,'monto',200)
  ),
  'SATISFACCION',jsonb_build_array(
    jsonb_build_object('desde',85,'monto',100),
    jsonb_build_object('desde',100,'monto',150)
  ),
  'SEGURIDAD',jsonb_build_array(
    jsonb_build_object('desde',85,'monto',100),
    jsonb_build_object('desde',100,'monto',150)
  )
);
$$;

create or replace function public.mv_bono_sup_configuracion_json(p_periodo text)
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  p text:=public.mv_bono_sup_periodo(p_periodo);
  c public.bono_supervisores_configuracion%rowtype;
  esc jsonb;
begin
  select * into c from public.bono_supervisores_configuracion where periodo=p;
  if not found then
    return jsonb_build_object(
      'periodo',p,'montoTotal',1000,
      'pesos',jsonb_build_object(
        'PRODUCTIVIDAD',25,'CALIDAD',25,'SLA',20,'SATISFACCION',15,'SEGURIDAD',15
      ),
      'componentes',jsonb_build_object(
        'PRODUCTIVIDAD',250,'CALIDAD',250,'SLA',200,'SATISFACCION',150,'SEGURIDAD',150
      ),
      'activadores',jsonb_build_object(
        'PRODUCTIVIDAD',85,'CALIDAD',85,'SLA',95,'SATISFACCION',85,'SEGURIDAD',85
      ),
      'escalas',public.mv_bono_sup_default_escalas(),
      'configurado',false
    );
  end if;

  esc:=coalesce(c.escalas_json,public.mv_bono_sup_default_escalas());

  return jsonb_build_object(
    'periodo',p,
    'montoTotal',c.monto_total,
    'pesos',jsonb_build_object(
      'PRODUCTIVIDAD',25,'CALIDAD',25,'SLA',20,'SATISFACCION',15,'SEGURIDAD',15
    ),
    'componentes',jsonb_build_object(
      'PRODUCTIVIDAD',round(c.monto_total*0.25,2),
      'CALIDAD',round(c.monto_total*0.25,2),
      'SLA',round(c.monto_total*0.20,2),
      'SATISFACCION',round(c.monto_total*0.15,2),
      'SEGURIDAD',c.monto_total-round(c.monto_total*0.25,2)-round(c.monto_total*0.25,2)-round(c.monto_total*0.20,2)-round(c.monto_total*0.15,2)
    ),
    'activadores',jsonb_build_object(
      'PRODUCTIVIDAD',c.activador_productividad,
      'CALIDAD',c.activador_calidad,
      'SLA',c.activador_sla,
      'SATISFACCION',c.activador_satisfaccion,
      'SEGURIDAD',c.activador_seguridad
    ),
    'escalas',esc,
    'actualizadoPor',coalesce(c.actualizado_por,''),
    'fechaActualizacion',case when c.fecha_actualizacion is null then '' else to_char(c.fecha_actualizacion at time zone 'America/Lima','DD/MM/YYYY HH24:MI') end,
    'configurado',true
  );
end;
$$;

create or replace function public.mv_bono_sup_monto_escala(
  p_escalas jsonb,p_clave text,p_cumplimiento numeric
)
returns numeric
language plpgsql
immutable
set search_path=public
as $$
declare
  x jsonb;
  monto numeric:=0;
  desde numeric;
begin
  if p_escalas is null then return 0; end if;
  for x in select value from jsonb_array_elements(coalesce(p_escalas->p_clave,'[]'::jsonb))
  loop
    desde:=coalesce((x->>'desde')::numeric,0);
    if coalesce(p_cumplimiento,0)>=desde then
      monto:=coalesce((x->>'monto')::numeric,0);
    end if;
  end loop;
  return round(monto,2);
end;
$$;

create or replace function public.mv_bono_sup_puntaje_mayor(p_valor numeric,p_meta numeric)
returns numeric
language sql
immutable
set search_path=public
as $$
  select case
    when p_valor is null or coalesce(p_meta,0)<=0 then 0
    else least(100,greatest(0,(p_valor/p_meta)*100))
  end;
$$;

create or replace function public.mv_bono_sup_puntaje_menor(p_valor numeric,p_meta numeric)
returns numeric
language sql
immutable
set search_path=public
as $$
  select case
    when p_valor is null then 0
    when p_valor<=p_meta then 100
    when p_valor>0 then least(100,greatest(0,(p_meta/p_valor)*100))
    else 100
  end;
$$;

create or replace function public.mv_bono_sup_asignaciones_periodo(p_periodo text)
returns table(
  periodo text,
  usuario text,
  nombre text,
  sede text,
  cuadrillas jsonb,
  total_cuadrillas integer,
  origen text
)
language plpgsql
security definer
set search_path=public
as $$
declare
  p text:=public.mv_bono_sup_periodo(p_periodo);
  actual text:=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM');
begin
  if exists(select 1 from public.bono_supervisores_asignaciones a where a.periodo=p) then
    return query
    select a.periodo,a.usuario_supervisor,a.nombre_supervisor,a.sede,
           a.cuadrillas,a.total_cuadrillas,coalesce(a.origen,'')
    from public.bono_supervisores_asignaciones a
    where a.periodo=p
    order by a.sede,a.usuario_supervisor;
    return;
  end if;

  if p<>actual then return; end if;

  return query
  with sup as (
    select distinct on (public.mv_bono_sup_usuario_key(u.usuario))
      public.mv_bono_sup_usuario_key(u.usuario) as usuario,
      coalesce(nullif(trim(u.nombres_apellidos),''),u.usuario) as nombre,
      public.mv_actividad_texto(u.sede) as sede,
      u.id
    from public.app_users u
    where public.mv_actividad_texto(u.perfil)='SUPERVISOR'
      and public.mv_actividad_texto(coalesce(u.estado,'ACTIVO'))='ACTIVO'
    order by public.mv_bono_sup_usuario_key(u.usuario),u.id desc
  ), tec as (
    select
      public.mv_bono_sup_usuario_key(u.usuario_supervisor) as supervisor,
      jsonb_agg(distinct public.mv_actividad_cuadrilla_norm(u.cuadrilla))
        filter(where coalesce(trim(u.cuadrilla),'')<>'') as cuadrillas
    from public.app_users u
    where public.mv_actividad_texto(u.perfil)='TECNICO'
      and public.mv_actividad_texto(coalesce(u.estado,'ACTIVO'))='ACTIVO'
    group by public.mv_bono_sup_usuario_key(u.usuario_supervisor)
  )
  select
    p,s.usuario,s.nombre,s.sede,
    coalesce(t.cuadrillas,'[]'::jsonb),
    jsonb_array_length(coalesce(t.cuadrillas,'[]'::jsonb)),
    'USUARIOS'
  from sup s
  left join tec t on t.supervisor=s.usuario
  order by s.sede,s.usuario;
end;
$$;

create or replace function public.mv_bono_sup_evaluacion_completa(p_respuestas jsonb)
returns boolean
language sql
immutable
set search_path=public
as $$
select
  jsonb_typeof(p_respuestas)='array'
  and jsonb_array_length(p_respuestas)=20
  and not exists(
    select 1
    from jsonb_array_elements(p_respuestas) x
    where x='null'::jsonb
       or jsonb_typeof(x)<>'number'
       or (x#>>'{}')::numeric not in (0,1.5,3)
  );
$$;

create or replace function public.mv_bono_sup_calcular_supervisor(
  p_periodo text,
  p_supervisor text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p text:=public.mv_bono_sup_periodo(p_periodo);
  sup text:=public.mv_bono_sup_usuario_key(p_supervisor);
  a record;
  cfg jsonb;
  escalas jsonb;
  monto_total numeric;
  cuadrillas text[];

  -- Productividad
  puntos numeric:=0;
  meta_puntos numeric:=0;
  finalizadas integer:=0;
  total_gestionadas integer:=0;
  efectividad_pct numeric;
  productividad_pct numeric;
  puntaje_productividad numeric:=0;
  puntaje_efectividad numeric:=0;
  cump_productividad numeric:=0;
  monto_productividad numeric:=0;
  eval_productividad boolean:=false;

  -- Calidad
  obs_win integer:=0;
  obs_pen integer:=0;
  monto_pen numeric:=0;
  rojo integer:=0;
  recableados integer:=0;
  rec_pct numeric:=0;
  vtr_inc integer:=0;
  vtr_fin integer:=0;
  vtr_pct numeric:=0;
  puntaje_obs_cantidad numeric:=0;
  puntaje_obs_monto numeric:=0;
  puntaje_obs numeric:=0;
  puntaje_rec numeric:=0;
  puntaje_vtr numeric:=0;
  cump_calidad numeric:=0;
  monto_calidad numeric:=0;
  eval_calidad boolean:=false;

  -- SLA
  sla_eval integer:=0;
  sla_cumplen integer:=0;
  sla_bruto_cumplen integer:=0;
  sla_total_finalizadas integer:=0;
  sla_sin_tiempos integer:=0;
  sla_sin_partida integer:=0;
  sla_sin_parametro integer:=0;
  sla_inst_total integer:=0;
  sla_inst_cumplen integer:=0;
  sla_vt_total integer:=0;
  sla_vt_cumplen integer:=0;
  sla_exc_aprob integer:=0;
  sla_exc_pend integer:=0;
  sla_exc_rech integer:=0;
  sla_bruto numeric:=0;
  cump_sla numeric:=0;
  monto_sla numeric:=0;

  -- Satisfaccion
  aud_count integer:=0;
  suma_cliente numeric:=0;
  suma_orden numeric:=0;
  aud_cliente_pct numeric;
  aud_orden_pct numeric;
  llamados integer:=0;
  conformes integer:=0;
  no_conformes integer:=0;
  respondieron integer:=0;
  muestras integer:=0;
  llamadas_pct numeric;
  atencion_combinada numeric;
  cump_satisfaccion numeric:=0;
  monto_satisfaccion numeric:=0;
  eval_satisfaccion boolean:=false;

  -- Liderazgo
  actas_evaluada boolean:=false;
  actas_si boolean:=false;
  actas_pct numeric;
  slots_cumplidos integer:=0;
  slots_meta integer:=0;
  checklist_pct numeric;
  actividades integer:=0;
  actividad_pct numeric:=0;
  eval_total numeric:=0;
  eval_completa boolean:=false;
  evaluacion_pct numeric:=0;
  cump_seguridad numeric:=0;
  monto_seguridad numeric:=0;
  eval_seguridad boolean:=false;

  monto_final numeric:=0;
  pendientes jsonb:='[]'::jsonb;
begin
  select * into a
  from public.mv_bono_sup_asignaciones_periodo(p) x
  where x.usuario=sup
  limit 1;

  if not found then
    raise exception 'No se encontró al supervisor en el período seleccionado';
  end if;

  select coalesce(array_agg(public.mv_actividad_cuadrilla_norm(x.value)),'{}'::text[])
  into cuadrillas
  from jsonb_array_elements_text(a.cuadrillas) x;

  cfg:=public.mv_bono_sup_configuracion_json(p);
  escalas:=cfg->'escalas';
  monto_total:=(cfg->>'montoTotal')::numeric;

  -- Productividad y efectividad.
  select
    coalesce(sum(d.total_puntos),0),
    coalesce(sum(e.finalizada),0),
    coalesce(sum(e.total_general),0)
  into puntos,finalizadas,total_gestionadas
  from unnest(cuadrillas) q(cuadrilla)
  left join public.mv_dashboard_produccion_detalle d
    on d.periodo=p and public.mv_actividad_cuadrilla_norm(d.cuadrilla)=q.cuadrilla
  left join public.mv_dashboard_efectividad_detalle e
    on e.periodo=p and public.mv_actividad_cuadrilla_norm(e.cuadrilla)=q.cuadrilla;

  meta_puntos:=coalesce(array_length(cuadrillas,1),0)*130;
  productividad_pct:=case when meta_puntos>0 then round(puntos/meta_puntos*100,2) else null end;
  efectividad_pct:=case when total_gestionadas>0 then round(finalizadas::numeric/total_gestionadas*100,2) else null end;
  eval_productividad:=meta_puntos>0 and (puntos>0 or total_gestionadas>0);
  puntaje_productividad:=public.mv_bono_sup_puntaje_mayor(productividad_pct,100);
  puntaje_efectividad:=public.mv_bono_sup_puntaje_mayor(efectividad_pct,70);
  cump_productividad:=case when eval_productividad then round(puntaje_productividad*0.60+puntaje_efectividad*0.40,2) else 0 end;
  monto_productividad:=case when eval_productividad then public.mv_bono_sup_monto_escala(escalas,'PRODUCTIVIDAD',cump_productividad) else 0 end;

  -- Calidad.
  select
    coalesce(sum(o.win_total),0),
    coalesce(sum(o.win_penalizadas),0),
    coalesce(sum(o.win_monto_penalizado),0),
    coalesce(sum(r.los_rojo_asignadas),0),
    coalesce(sum(r.recableados),0),
    coalesce(sum(v.total_gar_vtr),0),
    coalesce(sum(v.total_finalizadas),0)
  into obs_win,obs_pen,monto_pen,rojo,recableados,vtr_inc,vtr_fin
  from unnest(cuadrillas) q(cuadrilla)
  left join public.mv_dashboard_observaciones_detalle o
    on o.periodo=p and public.mv_actividad_cuadrilla_norm(o.cuadrilla)=q.cuadrilla
  left join public.mv_dashboard_recableado_detalle r
    on r.periodo=p and public.mv_actividad_cuadrilla_norm(r.cuadrilla)=q.cuadrilla
  left join public.mv_dashboard_vtrgar_detalle v
    on v.periodo=p and public.mv_actividad_cuadrilla_norm(v.cuadrilla)=q.cuadrilla;

  if rojo>0 then
    rec_pct:=round(recableados::numeric/rojo*100,2);
  else
    select coalesce(round(avg(r.porcentaje_pct),2),0)
    into rec_pct
    from public.mv_dashboard_recableado_detalle r
    where r.periodo=p and public.mv_actividad_cuadrilla_norm(r.cuadrilla)=any(cuadrillas);
  end if;

  if vtr_fin>0 then
    vtr_pct:=round(vtr_inc::numeric/vtr_fin*100,2);
  else
    select coalesce(round(avg(v.porcentaje_pct),2),0)
    into vtr_pct
    from public.mv_dashboard_vtrgar_detalle v
    where v.periodo=p and public.mv_actividad_cuadrilla_norm(v.cuadrilla)=any(cuadrillas);
  end if;

  eval_calidad:=coalesce(array_length(cuadrillas,1),0)>0
    and (finalizadas>0 or rojo>0 or vtr_fin>0 or obs_win>0 or monto_pen>0);

  puntaje_obs_cantidad:=case when obs_win=0 then 100 else 0 end;
  puntaje_obs_monto:=public.mv_bono_sup_puntaje_menor(monto_pen,300);
  puntaje_obs:=round(puntaje_obs_cantidad*0.10+puntaje_obs_monto*0.90,2);
  puntaje_rec:=public.mv_bono_sup_puntaje_menor(rec_pct,42);
  puntaje_vtr:=public.mv_bono_sup_puntaje_menor(vtr_pct,3);
  cump_calidad:=case when eval_calidad then round(puntaje_obs*0.30+puntaje_rec*0.40+puntaje_vtr*0.30,2) else 0 end;
  monto_calidad:=case when eval_calidad then public.mv_bono_sup_monto_escala(escalas,'CALIDAD',cump_calidad) else 0 end;

  -- SLA ajustado consolidado.
  select
    coalesce(sum(s.instalaciones_total+s.visitas_tecnicas_total),0),
    coalesce(sum(s.instalaciones_cumplen_ajustado+s.visitas_tecnicas_cumplen_ajustado),0),
    coalesce(sum(s.cumplen_bruto),0),
    coalesce(sum(s.total_finalizadas),0),
    coalesce(sum(s.sin_tiempos),0),
    coalesce(sum(s.sin_partida),0),
    coalesce(sum(s.sin_parametro),0),
    coalesce(sum(s.instalaciones_total),0),
    coalesce(sum(s.instalaciones_cumplen_ajustado),0),
    coalesce(sum(s.visitas_tecnicas_total),0),
    coalesce(sum(s.visitas_tecnicas_cumplen_ajustado),0),
    coalesce(sum(s.excepciones_aprobadas),0),
    coalesce(sum(s.excepciones_pendientes),0),
    coalesce(sum(s.excepciones_rechazadas),0)
  into
    sla_eval,sla_cumplen,sla_bruto_cumplen,sla_total_finalizadas,
    sla_sin_tiempos,sla_sin_partida,sla_sin_parametro,
    sla_inst_total,sla_inst_cumplen,sla_vt_total,sla_vt_cumplen,
    sla_exc_aprob,sla_exc_pend,sla_exc_rech
  from public.mv_dashboard_sla_detalle s
  where s.periodo=p and public.mv_actividad_cuadrilla_norm(s.cuadrilla)=any(cuadrillas);

  cump_sla:=case when sla_eval>0 then round(sla_cumplen::numeric/sla_eval*100,2) else 0 end;
  sla_bruto:=case when sla_eval>0 then round(sla_bruto_cumplen::numeric/sla_eval*100,2) else 0 end;
  monto_sla:=case when sla_eval>0 then public.mv_bono_sup_monto_escala(escalas,'SLA',cump_sla) else 0 end;

  -- Satisfacción: auditorías + llamadas opcionales.
  select
    count(*)::int,
    coalesce(sum(least(100,greatest(0,a.puntaje_cliente/20*100))),0),
    coalesce(sum(least(100,greatest(0,a.puntaje_orden_limpieza/20*100))),0)
  into aud_count,suma_cliente,suma_orden
  from public.actividad_campo_migracion a
  where to_char(a.fecha,'YYYY-MM')=p
    and public.mv_bono_sup_usuario_key(a.supervisor)=sup
    and public.mv_actividad_es_auditoria(a.tipo_actividad)
    and a.puntaje_cliente is not null
    and a.puntaje_orden_limpieza is not null;

  aud_cliente_pct:=case when aud_count>0 then round(suma_cliente/aud_count,2) else null end;
  aud_orden_pct:=case when aud_count>0 then round(suma_orden/aud_count,2) else null end;

  select coalesce(s.clientes_llamados,0),coalesce(s.conformes,0),coalesce(s.no_conformes,0)
  into llamados,conformes,no_conformes
  from public.bono_supervisores_satisfaccion s
  where s.periodo=p and s.usuario_supervisor=sup;
  if not found then llamados:=0; conformes:=0; no_conformes:=0; end if;

  respondieron:=conformes+no_conformes;
  llamadas_pct:=case when respondieron>0 then round(conformes::numeric/respondieron*100,2) else null end;
  muestras:=aud_count+respondieron;
  atencion_combinada:=case when muestras>0 then round((suma_cliente+conformes*100)/muestras,2) else null end;
  eval_satisfaccion:=aud_count>0 and atencion_combinada is not null and aud_orden_pct is not null;
  cump_satisfaccion:=case when eval_satisfaccion then round(atencion_combinada*0.60+aud_orden_pct*0.40,2) else 0 end;
  monto_satisfaccion:=case when eval_satisfaccion then public.mv_bono_sup_monto_escala(escalas,'SATISFACCION',cump_satisfaccion) else 0 end;

  -- Liderazgo / Seguridad.
  select
    exists(
      select 1 from public.bono_supervisores_actas x
      where x.periodo=p and x.usuario_supervisor=sup
        and public.mv_actividad_texto(x.actas_sin_pendientes) in ('SI','SÍ','NO')
    ),
    exists(
      select 1 from public.bono_supervisores_actas x
      where x.periodo=p and x.usuario_supervisor=sup
        and public.mv_actividad_texto(x.actas_sin_pendientes) in ('SI','SÍ')
    )
  into actas_evaluada,actas_si;
  actas_pct:=case when not actas_evaluada then null when actas_si then 100 else 0 end;

  select count(*)::int
  into slots_cumplidos
  from (
    select distinct
      public.mv_actividad_cuadrilla_norm(c.cuadrilla) cuadrilla,
      case when extract(day from c.fecha_gestion)<=15 then 'Q1' else 'Q2' end quincena
    from public.checklist_almacen_migracion c
    where to_char(c.fecha_gestion,'YYYY-MM')=p
      and public.mv_actividad_cuadrilla_norm(c.cuadrilla)=any(cuadrillas)
  ) z;

  slots_meta:=coalesce(array_length(cuadrillas,1),0)*2;
  checklist_pct:=case when slots_meta>0 then round(slots_cumplidos::numeric/slots_meta*100,2) else null end;

  select count(*)::int
  into actividades
  from public.actividad_campo_migracion x
  where to_char(x.fecha,'YYYY-MM')=p
    and public.mv_bono_sup_usuario_key(x.supervisor)=sup;
  actividad_pct:=least(100,case when actividades>0 then round(actividades::numeric/15*100,2) else 0 end);

  select coalesce(e.total,0),public.mv_bono_sup_evaluacion_completa(e.respuestas)
  into eval_total,eval_completa
  from public.bono_supervisores_evaluaciones e
  where e.periodo=p and e.usuario_supervisor=sup;
  if not found then eval_total:=0; eval_completa:=false; end if;
  evaluacion_pct:=least(100,round(eval_total/60*100,2));

  cump_seguridad:=round(
    (coalesce(actas_pct,0)+coalesce(checklist_pct,0)+actividad_pct+evaluacion_pct)/4,
    2
  );
  eval_seguridad:=actas_evaluada or slots_cumplidos>0 or actividades>0 or eval_completa;
  monto_seguridad:=case when eval_seguridad then public.mv_bono_sup_monto_escala(escalas,'SEGURIDAD',cump_seguridad) else 0 end;

  monto_final:=round(monto_productividad+monto_calidad+monto_sla+monto_satisfaccion+monto_seguridad,2);

  if not eval_satisfaccion then
    pendientes:=pendientes||jsonb_build_array('Auditorías de Atención al cliente y Orden y limpieza pendientes');
  end if;
  if not actas_evaluada then
    pendientes:=pendientes||jsonb_build_array('Validación manual de actas sin pendientes');
  end if;
  if not eval_completa then
    pendientes:=pendientes||jsonb_build_array('Evaluación manual de liderazgo pendiente');
  end if;
  if sla_sin_partida+sla_sin_parametro>0 then
    pendientes:=pendientes||jsonb_build_array((sla_sin_partida+sla_sin_parametro)::text||' orden(es) sin partida o parámetro SLA');
  end if;

  return jsonb_build_object(
    'usuario',a.usuario,
    'nombre',a.nombre,
    'sede',a.sede,
    'periodo',p,
    'cuadrillas',a.cuadrillas,
    'totalCuadrillas',a.total_cuadrillas,
    'bonoMaximo',monto_total,
    'maximoEvaluado',monto_total,
    'montoProvisional',monto_final,
    'porcentajeEvaluado',case when monto_total>0 then round(monto_final/monto_total*100,2) else 0 end,
    'estado',case when p=to_char(clock_timestamp() at time zone 'America/Lima','YYYY-MM') then 'EN CURSO' else 'HISTÓRICO PROVISIONAL' end,
    'componentes',jsonb_build_array(
      jsonb_build_object(
        'clave','PRODUCTIVIDAD','nombre','Productividad operativa',
        'maximo',(cfg->'componentes'->>'PRODUCTIVIDAD')::numeric,
        'evaluable',eval_productividad,'cumplimiento',cump_productividad,
        'monto',monto_productividad,
        'activador',(cfg->'activadores'->>'PRODUCTIVIDAD')::numeric,
        'estado',case when not eval_productividad then 'SIN DATOS' when monto_productividad>0 then 'BONO ACTIVO' else 'NO ACTIVA BONO' end,
        'metricas',jsonb_build_object(
          'efectividadPct',efectividad_pct,'productividadPct',productividad_pct,
          'puntajeProductividad',round(puntaje_productividad,2),
          'puntajeEfectividad',round(puntaje_efectividad,2),
          'puntos',round(puntos,1),'metaPuntos',meta_puntos,
          'totalOrdenes',total_gestionadas,'finalizadas',finalizadas
        )
      ),
      jsonb_build_object(
        'clave','CALIDAD','nombre','Calidad de instalaciones y averías',
        'maximo',(cfg->'componentes'->>'CALIDAD')::numeric,
        'evaluable',eval_calidad,'cumplimiento',cump_calidad,
        'monto',monto_calidad,
        'activador',(cfg->'activadores'->>'CALIDAD')::numeric,
        'estado',case when not eval_calidad then 'SIN DATOS' when monto_calidad>0 then 'BONO ACTIVO' else 'NO ACTIVA BONO' end,
        'metricas',jsonb_build_object(
          'observaciones',obs_win,'observacionesWin',obs_win,
          'observacionesWinPenalizadas',obs_pen,
          'montoPenalizadoWin',round(monto_pen,2),
          'puntajeCantidadObservaciones',puntaje_obs_cantidad,
          'puntajeMontoPenalizado',round(puntaje_obs_monto,2),
          'puntajeObservaciones',puntaje_obs,
          'recableadoPct',rec_pct,'puntajeRecableado',round(puntaje_rec,2),
          'rojoAsignadas',rojo,'recableados',recableados,
          'vtrGarPct',vtr_pct,'puntajeVtrGar',round(puntaje_vtr,2),
          'incidenciasVtrGar',vtr_inc,'finalizadasVtrGar',vtr_fin
        )
      ),
      jsonb_build_object(
        'clave','SLA','nombre','Tiempo de Gestión - SLA',
        'maximo',(cfg->'componentes'->>'SLA')::numeric,
        'evaluable',sla_eval>0,'cumplimiento',cump_sla,
        'monto',monto_sla,
        'activador',(cfg->'activadores'->>'SLA')::numeric,
        'estado',case when sla_eval=0 then 'SIN DATOS' when monto_sla>0 then 'BONO ACTIVO' else 'NO ACTIVA BONO' end,
        'metricas',jsonb_build_object(
          'evaluables',sla_eval,'cumplen',sla_cumplen,
          'vencidas',greatest(0,sla_eval-sla_cumplen),
          'cumplimientoBrutoPct',sla_bruto,'cumplimientoAjustadoPct',cump_sla,
          'cumplenBruto',sla_bruto_cumplen,'cumplenAjustado',sla_cumplen,
          'finalizadasDetectadas',sla_total_finalizadas,
          'sinTiempos',sla_sin_tiempos,'sinPartida',sla_sin_partida,'sinParametro',sla_sin_parametro,
          'instalacionesTotal',sla_inst_total,'instalacionesCumplenAjustado',sla_inst_cumplen,
          'visitasTecnicasTotal',sla_vt_total,'visitasTecnicasCumplenAjustado',sla_vt_cumplen,
          'excepcionesPendientes',sla_exc_pend,'excepcionesAprobadas',sla_exc_aprob,'excepcionesRechazadas',sla_exc_rech
        )
      ),
      jsonb_build_object(
        'clave','SATISFACCION','nombre','Satisfacción del cliente',
        'maximo',(cfg->'componentes'->>'SATISFACCION')::numeric,
        'evaluable',eval_satisfaccion,
        'cumplimiento',case when eval_satisfaccion then cump_satisfaccion else null end,
        'monto',monto_satisfaccion,
        'activador',(cfg->'activadores'->>'SATISFACCION')::numeric,
        'estado',case when not eval_satisfaccion then 'PENDIENTE AUDITORÍAS' when monto_satisfaccion>0 then 'BONO ACTIVO' else 'NO ACTIVA BONO' end,
        'metricas',jsonb_build_object(
          'auditoriasEvaluadas',aud_count,'atencionAuditoriasPct',aud_cliente_pct,
          'ordenLimpiezaPct',aud_orden_pct,'atencionCombinadaPct',atencion_combinada,
          'muestrasAtencion',muestras,'llamadasIncluidas',llamados>0,
          'llamadasPct',llamadas_pct,'clientesLlamados',llamados,
          'respondieron',respondieron,'conformes',conformes,'noConformes',no_conformes,
          'noRespondieron',greatest(0,llamados-respondieron)
        )
      ),
      jsonb_build_object(
        'clave','SEGURIDAD','nombre','Liderazgo',
        'maximo',(cfg->'componentes'->>'SEGURIDAD')::numeric,
        'evaluable',eval_seguridad,'cumplimiento',cump_seguridad,
        'monto',monto_seguridad,
        'activador',(cfg->'activadores'->>'SEGURIDAD')::numeric,
        'estado',case
          when not eval_seguridad then 'SIN DATOS'
          when not actas_evaluada then 'PENDIENTE ACTAS'
          when not eval_completa then 'PENDIENTE EVALUACIÓN'
          when monto_seguridad>0 then 'BONO ACTIVO'
          else 'NO ACTIVA BONO' end,
        'metricas',jsonb_build_object(
          'actasPct',actas_pct,'actasEvaluadas',actas_evaluada,
          'actasSinPendientes',actas_si,
          'checklistCumplimientoPct',checklist_pct,
          'slotsCumplidos',slots_cumplidos,'slotsMeta',slots_meta,
          'actividadesCampo',actividades,'metaActividadesCampo',15,'actividadPct',actividad_pct,
          'evaluacionPct',evaluacion_pct,'puntajeEvaluacion',eval_total,
          'maximoIndicador',round(((cfg->'componentes'->>'SEGURIDAD')::numeric)/4,2)
        )
      )
    ),
    'pendientes',pendientes
  );
end;
$$;

revoke execute on function public.mv_bono_sup_default_escalas() from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_configuracion_json(text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_monto_escala(jsonb,text,numeric) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_puntaje_mayor(numeric,numeric) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_puntaje_menor(numeric,numeric) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_asignaciones_periodo(text) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_evaluacion_completa(jsonb) from public,anon,authenticated;
revoke execute on function public.mv_bono_sup_calcular_supervisor(text,text) from public,anon,authenticated;

grant execute on function public.mv_bono_sup_default_escalas() to service_role;
grant execute on function public.mv_bono_sup_configuracion_json(text) to service_role;
grant execute on function public.mv_bono_sup_monto_escala(jsonb,text,numeric) to service_role;
grant execute on function public.mv_bono_sup_puntaje_mayor(numeric,numeric) to service_role;
grant execute on function public.mv_bono_sup_puntaje_menor(numeric,numeric) to service_role;
grant execute on function public.mv_bono_sup_asignaciones_periodo(text) to service_role;
grant execute on function public.mv_bono_sup_evaluacion_completa(jsonb) to service_role;
grant execute on function public.mv_bono_sup_calcular_supervisor(text,text) to service_role;
