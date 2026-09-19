
-- 109_pext_conjunta_v152.sql
-- MI VISUAL PEXT V152 + ajustes posteriores hasta V517D.
-- Supervisor registra -> Técnico revisa -> Jefatura valida -> conformidad final.
-- Visto bueno técnico automático después de 24 horas.
-- La configuración PEXT se conserva informativa: legacy exigePextActivo() devuelve true.

create table if not exists public.pext_trabajos_migracion (
  id text primary key,
  source_row integer unique,
  fecha_registro date not null,
  hora_registro time without time zone,
  registro_at timestamp without time zone not null,
  supervisor_registra text not null,
  cuadrilla text not null,
  tipo_trabajo text not null,
  fecha_trabajo date not null,
  hora_inicio time without time zone not null,
  hora_fin time without time zone not null,
  descripcion_trabajo text,
  cto text,
  cantidad_conectorizados integer not null default 0,
  codigos_conectorizados text,
  cantidad_recableados integer not null default 0,
  codigos_recableados text,
  cantidad_cuadras numeric(12,2) not null default 0,
  zona_referencia text,
  trabajos_adicionales text,
  evidencia_1 text,
  evidencia_2 text,
  evidencia_3 text,
  puntos_solicitados numeric(12,3) not null default 0,
  comentario_final text not null,
  resultado_tecnico text,
  observacion_tecnico text,
  tecnico_revisa_por text,
  revision_tecnico_at timestamp without time zone,
  resultado_jefatura text,
  observacion_jefatura text,
  validado_por text,
  validacion_at timestamp without time zone,
  conformidad_final text,
  estado_general text not null,
  version integer not null default 1,
  jornada_validada text,
  source_kind text not null default 'POSTGRESQL_PILOT',
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pext_tipo_chk check (upper(trim(tipo_trabajo)) in ('NORMALIZACION','CONJUNTA PEXT','ORDENAMIENTO')),
  constraint pext_horas_chk check (hora_fin > hora_inicio),
  constraint pext_cantidades_chk check (
    cantidad_conectorizados >= 0 and cantidad_recableados >= 0 and cantidad_cuadras >= 0 and puntos_solicitados >= 0
  )
);

create index if not exists pext_trabajos_periodo_idx
  on public.pext_trabajos_migracion(fecha_trabajo,cuadrilla);
create index if not exists pext_trabajos_estado_idx
  on public.pext_trabajos_migracion(estado_general,registro_at);
create index if not exists pext_trabajos_supervisor_idx
  on public.pext_trabajos_migracion(supervisor_registra,fecha_trabajo);

alter table public.pext_trabajos_migracion enable row level security;
revoke all on public.pext_trabajos_migracion from anon,authenticated;
grant select,insert,update on public.pext_trabajos_migracion to service_role;

create or replace function public.mv_pext_puntos_conectorizados(p_cantidad integer)
returns integer
language sql
immutable
as $$
  select case
    when greatest(coalesce(p_cantidad,0),0)=0 then 0
    when greatest(coalesce(p_cantidad,0),0)<=2 then 1
    when greatest(coalesce(p_cantidad,0),0)<=6 then 2
    when greatest(coalesce(p_cantidad,0),0)<=12 then 3
    else 4
  end;
$$;

create or replace function public.mv_pext_calcular_puntos(
  p_tipo text,
  p_conectorizados integer,
  p_recableados integer,
  p_puntos_solicitados numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when public.mv_norm_key(p_tipo)='CONJUNTAPEXT' then
      case
        when public.mv_pext_puntos_conectorizados(p_conectorizados)
             + greatest(coalesce(p_recableados,0),0)*2 > 0
        then public.mv_pext_puntos_conectorizados(p_conectorizados)
             + greatest(coalesce(p_recableados,0),0)*2
        else greatest(coalesce(p_puntos_solicitados,0),0)
      end::numeric
    else greatest(coalesce(p_puntos_solicitados,0),0)
  end;
$$;

revoke execute on function public.mv_pext_puntos_conectorizados(integer) from public,anon,authenticated;
revoke execute on function public.mv_pext_calcular_puntos(text,integer,integer,numeric) from public,anon,authenticated;
grant execute on function public.mv_pext_puntos_conectorizados(integer) to service_role;
grant execute on function public.mv_pext_calcular_puntos(text,integer,integer,numeric) to service_role;

create or replace view public.mv_pext_trabajos_v1
with (security_invoker=true) as
select
  t.*,
  to_char(t.fecha_trabajo,'YYYY-MM') as periodo,
  public.mv_continuidad_cuadrilla(to_char(t.fecha_trabajo,'YYYY-MM'),t.cuadrilla) as cuadrilla_mostrada,
  coalesce(u.sede,'') as sede,
  public.mv_pext_calcular_puntos(
    t.tipo_trabajo,t.cantidad_conectorizados,t.cantidad_recableados,t.puntos_solicitados
  )::numeric(12,3) as puntos_pext,
  case
    when public.mv_norm_key(t.tipo_trabajo)='CONJUNTAPEXT'
      and public.mv_pext_puntos_conectorizados(t.cantidad_conectorizados)
          + greatest(coalesce(t.cantidad_recableados,0),0)*2 > 0
      then 'AUTOMATICO'
    else 'SUPERVISOR'
  end as origen_puntos,
  (upper(trim(coalesce(t.resultado_tecnico,''))) in ('VISTO BUENO','VISTO BUENO AUTOMATICO')) as visto_bueno_tecnico,
  (upper(trim(coalesce(t.resultado_jefatura,'')))='APROBADO') as validado_area
from public.pext_trabajos_migracion t
left join lateral (
  select a.sede
  from public.app_users a
  where upper(trim(coalesce(a.estado,'')))='ACTIVO'
    and upper(trim(coalesce(a.perfil,'')))='TECNICO'
    and public.mv_norm_key(a.cuadrilla)=public.mv_norm_key(
      public.mv_continuidad_cuadrilla(to_char(t.fecha_trabajo,'YYYY-MM'),t.cuadrilla)
    )
  order by a.updated_at desc nulls last,a.usuario
  limit 1
) u on true;

create or replace view public.mv_pext_bonos_v1
with (security_invoker=true) as
select
  id,periodo,fecha_trabajo,cuadrilla,cuadrilla_mostrada,sede,tipo_trabajo,cto,
  cantidad_conectorizados,
  public.mv_pext_puntos_conectorizados(cantidad_conectorizados) as puntos_conectorizados,
  cantidad_recableados,
  cantidad_recableados*2 as puntos_recableados,
  puntos_pext,origen_puntos,
  visto_bueno_tecnico,validado_area,
  case when visto_bueno_tecnico and validado_area then 'VALIDADO' else 'PENDIENTE' end as estado_bono,
  estado_general,resultado_tecnico,resultado_jefatura,jornada_validada
from public.mv_pext_trabajos_v1
where puntos_pext>0
  and upper(trim(tipo_trabajo)) in ('CONJUNTA PEXT','NORMALIZACION','ORDENAMIENTO');

revoke all on public.mv_pext_trabajos_v1 from anon,authenticated;
revoke all on public.mv_pext_bonos_v1 from anon,authenticated;
grant select on public.mv_pext_trabajos_v1 to service_role;
grant select on public.mv_pext_bonos_v1 to service_role;

create or replace function public.mv_pext_aplicar_vistos_buenos_automaticos()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare n integer:=0;
begin
  update public.pext_trabajos_migracion t
     set resultado_tecnico='VISTO BUENO AUTOMATICO',
         observacion_tecnico='Visto bueno automático después de 24 horas sin respuesta del técnico.',
         tecnico_revisa_por='SISTEMA',
         revision_tecnico_at=timezone('America/Lima',now()),
         estado_general=case
           when upper(trim(coalesce(t.resultado_jefatura,'')))='APROBADO'
             then 'PENDIENTE CONFORMIDAD FINAL'
           else 'PENDIENTE DE VALIDACION JEFATURA'
         end,
         updated_at=now()
   where upper(trim(coalesce(t.estado_general,'')))='PENDIENTE DE VISTO BUENO TECNICO'
     and nullif(trim(coalesce(t.resultado_tecnico,'')),'') is null
     and timezone('America/Lima',now()) - t.registro_at >= interval '24 hours';
  get diagnostics n=row_count;
  return jsonb_build_object('ok',true,'actualizados',n);
end;
$$;

create or replace function public.mv_pext_responder_tecnico(
  p_id text,p_usuario text,p_cuadrilla text,p_resultado text,p_observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.pext_trabajos_migracion%rowtype; res text:=upper(trim(coalesce(p_resultado,''))); obs text:=trim(coalesce(p_observacion,''));
begin
  perform public.mv_pext_aplicar_vistos_buenos_automaticos();
  select * into r from public.pext_trabajos_migracion where id=p_id for update;
  if not found then raise exception 'No se encontró el trabajo en conjunta: %',p_id; end if;
  if public.mv_norm_key(r.cuadrilla)<>public.mv_norm_key(p_cuadrilla) then
    raise exception 'Este registro no corresponde a su cuadrilla';
  end if;
  if upper(trim(r.estado_general))<>'PENDIENTE DE VISTO BUENO TECNICO' then
    raise exception 'El registro ya fue revisado por el Técnico';
  end if;
  if res not in ('VISTO BUENO','OBSERVADO') then raise exception 'Resultado técnico no válido'; end if;
  if res='OBSERVADO' and obs='' then raise exception 'La observación es obligatoria'; end if;

  update public.pext_trabajos_migracion
     set resultado_tecnico=res,observacion_tecnico=obs,tecnico_revisa_por=p_usuario,
         revision_tecnico_at=timezone('America/Lima',now()),
         estado_general=case
           when res='VISTO BUENO' then
             case when upper(trim(coalesce(r.resultado_jefatura,'')))='APROBADO'
               then 'PENDIENTE CONFORMIDAD FINAL' else 'PENDIENTE DE VALIDACION JEFATURA' end
           else 'OBSERVADO POR TECNICO'
         end,
         updated_at=now()
   where id=p_id;

  return jsonb_build_object('ok',true,'modulo','TRABAJOS_CONJUNTA','accion','RESPUESTA_TECNICO','id',p_id,'resultado',res);
end;
$$;

create or replace function public.mv_pext_validar_jefatura(
  p_id text,p_usuario text,p_resultado text,p_observacion text default null,p_jornada_validada text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.pext_trabajos_migracion%rowtype;
  res text:=upper(trim(coalesce(p_resultado,'')));
  obs text:=trim(coalesce(p_observacion,''));
  jornada text:=upper(trim(coalesce(p_jornada_validada,'')));
  tecnico_ok boolean;
begin
  perform public.mv_pext_aplicar_vistos_buenos_automaticos();
  select * into r from public.pext_trabajos_migracion where id=p_id for update;
  if not found then raise exception 'No se encontró el trabajo en conjunta: %',p_id; end if;
  if upper(trim(r.estado_general)) not in (
    'PENDIENTE DE VISTO BUENO TECNICO','PENDIENTE DE VALIDACION JEFATURA','OBSERVADO POR TECNICO'
  ) then raise exception 'El registro no está pendiente de validación'; end if;
  if res not in ('APROBADO','OBSERVADO','RECHAZADO') then raise exception 'Resultado de validación no válido'; end if;
  if res<>'APROBADO' and obs='' then raise exception 'El motivo es obligatorio'; end if;
  if res='APROBADO' and jornada not in ('MEDIO DIA','MEDIO DÍA','DIA COMPLETO','DÍA COMPLETO') then
    raise exception 'Seleccione Medio día o Día completo';
  end if;
  if jornada in ('MEDIO DIA','MEDIO DÍA') then jornada:='MEDIO DÍA';
  elsif jornada in ('DIA COMPLETO','DÍA COMPLETO') then jornada:='DÍA COMPLETO';
  else jornada:=''; end if;

  tecnico_ok:=upper(trim(coalesce(r.resultado_tecnico,''))) in ('VISTO BUENO','VISTO BUENO AUTOMATICO');

  update public.pext_trabajos_migracion
     set resultado_jefatura=res,observacion_jefatura=obs,validado_por=p_usuario,
         validacion_at=timezone('America/Lima',now()),
         jornada_validada=case when res='APROBADO' then jornada else '' end,
         estado_general=case
           when res='APROBADO' then case when tecnico_ok then 'PENDIENTE CONFORMIDAD FINAL' else 'PENDIENTE DE VISTO BUENO TECNICO' end
           when res='OBSERVADO' then 'OBSERVADO POR JEFATURA'
           else 'RECHAZADO'
         end,
         updated_at=now()
   where id=p_id;

  return jsonb_build_object('ok',true,'modulo','TRABAJOS_CONJUNTA','accion','VALIDAR_JEFATURA','id',p_id,'resultado',res);
end;
$$;

create or replace function public.mv_pext_conformidad_final(
  p_id text,p_usuario text,p_resultado text,p_observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.pext_trabajos_migracion%rowtype; res text:=upper(trim(coalesce(p_resultado,''))); obs text:=trim(coalesce(p_observacion,''));
begin
  select * into r from public.pext_trabajos_migracion where id=p_id for update;
  if not found then raise exception 'No se encontró el trabajo en conjunta: %',p_id; end if;
  if upper(trim(r.estado_general))<>'PENDIENTE CONFORMIDAD FINAL' then
    raise exception 'El registro no está pendiente de conformidad final';
  end if;
  if upper(trim(coalesce(r.resultado_tecnico,''))) not in ('VISTO BUENO','VISTO BUENO AUTOMATICO')
     or upper(trim(coalesce(r.resultado_jefatura,'')))<>'APROBADO' then
    raise exception 'Falta el visto bueno del Técnico o la validación del área encargada';
  end if;
  if res not in ('CONFORME','SIN CONFORMIDAD') then raise exception 'Conformidad final no válida'; end if;
  if res='SIN CONFORMIDAD' and obs='' then raise exception 'El motivo es obligatorio'; end if;

  update public.pext_trabajos_migracion
     set observacion_jefatura=coalesce(nullif(obs,''),r.observacion_jefatura,''),
         validado_por=p_usuario,validacion_at=timezone('America/Lima',now()),
         conformidad_final=res,
         estado_general=case when res='CONFORME' then 'CONFORMIDAD FINAL' else 'SIN CONFORMIDAD' end,
         updated_at=now()
   where id=p_id;

  return jsonb_build_object('ok',true,'modulo','TRABAJOS_CONJUNTA','accion','CONFORMIDAD_FINAL','id',p_id,'resultado',res);
end;
$$;

revoke execute on function public.mv_pext_aplicar_vistos_buenos_automaticos() from public,anon,authenticated;
revoke execute on function public.mv_pext_responder_tecnico(text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_pext_validar_jefatura(text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.mv_pext_conformidad_final(text,text,text,text) from public,anon,authenticated;
grant execute on function public.mv_pext_aplicar_vistos_buenos_automaticos() to service_role;
grant execute on function public.mv_pext_responder_tecnico(text,text,text,text,text) to service_role;
grant execute on function public.mv_pext_validar_jefatura(text,text,text,text,text) to service_role;
grant execute on function public.mv_pext_conformidad_final(text,text,text,text) to service_role;
