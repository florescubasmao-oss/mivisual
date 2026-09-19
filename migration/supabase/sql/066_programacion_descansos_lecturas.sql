
-- 066_programacion_descansos_lecturas.sql
-- Lectura optimizada por perfil/sede/cuadrilla, equivalente a listarProgramacionDescansos.

create or replace view public.mv_descansos_entidades_listado
with (security_invoker=true) as
with nombres as (
  select
    public.mv_descansos_cuadrilla_norm(cuadrilla) as cuadrilla,
    jsonb_agg(distinct coalesce(nullif(trim(nombres_apellidos),''),upper(trim(usuario)))
      order by coalesce(nullif(trim(nombres_apellidos),''),upper(trim(usuario)))) as tecnicos
  from public.app_users
  where upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
    and upper(trim(coalesce(perfil,'')))='TECNICO'
    and nullif(public.mv_descansos_cuadrilla_norm(cuadrilla),'') is not null
  group by public.mv_descansos_cuadrilla_norm(cuadrilla)
)
select
  c.cuadrilla,c.sede,c.plataforma,c.supervisor,c.usuario as tecnico,
  coalesce(n.tecnicos,'[]'::jsonb) as tecnicos,
  'CUADRILLA'::text as tipo_personal,
  ''::text as nombre_personal
from public.mv_descansos_cuadrillas_activas c
left join nombres n using(cuadrilla)
union all
select
  p.cuadrilla,p.sede,'PERSONAL',p.supervisor,p.usuario,
  '[]'::jsonb,p.tipo_personal,coalesce(p.nombres_apellidos,p.usuario)
from public.mv_descansos_personal_activo p;

create or replace function public.mv_descansos_item_json(p_id text,p_modo text default 'NORMAL')
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  r public.programacion_descansos_migracion%rowtype;
  estado_vigente text;
  pendiente boolean;
begin
  select * into r from public.programacion_descansos_migracion where id=p_id;
  if not found then return '{}'::jsonb; end if;

  estado_vigente:=public.mv_descansos_estado_aprobado(r.cuadrilla,r.fecha);
  pendiente:=replace(upper(trim(coalesce(nullif(r.estado_validacion,''),r.estado_programacion,''))),'_',' ')
    in ('PENDIENTE SUPERVISOR','PENDIENTE JEFATURA','OBSERVADO');

  return jsonb_build_object(
    'id',r.id,
    'periodo',r.periodo,
    'fecha',to_char(r.fecha,'YYYY-MM-DD'),
    'diaSemana',coalesce(r.dia_semana,public.mv_descansos_dia_semana(r.fecha)),
    'sede',r.sede,
    'cuadrilla',r.cuadrilla,
    'plataforma',r.plataforma,
    'supervisor',coalesce(r.supervisor,''),
    'tecnicosAfectados',coalesce(r.tecnicos_afectados,''),
    'estadoDia',case
      when upper(p_modo)='APROBADO' then public.mv_descansos_estado_norm(coalesce(nullif(r.estado_nuevo,''),r.estado_dia,'EN CAMPO'))
      when upper(p_modo)='PENDIENTE' then estado_vigente
      else public.mv_descansos_estado_norm(coalesce(nullif(r.estado_nuevo,''),r.estado_dia,'EN CAMPO'))
    end,
    'estadoProgramacion',case
      when upper(p_modo)='APROBADO' then 'APROBADO'
      when upper(p_modo)='PENDIENTE' then replace(upper(trim(coalesce(nullif(r.estado_validacion,''),r.estado_programacion,''))),'_',' ')
      else r.estado_programacion
    end,
    'solicitudCambio',case
      when upper(p_modo)='APROBADO' then ''
      when upper(p_modo)='PENDIENTE'
        then public.mv_descansos_estado_norm(coalesce(nullif(r.estado_nuevo,''),nullif(r.solicitud_cambio,''),estado_vigente))
      else coalesce(r.solicitud_cambio,'')
    end,
    'motivoSolicitud',coalesce(r.motivo_solicitud,''),
    'solicitadoPor',coalesce(r.solicitado_por,''),
    'fechaSolicitud',case when r.fecha_solicitud is null then '' else to_char(r.fecha_solicitud at time zone 'America/Lima','YYYY-MM-DD HH24:MI:SS') end,
    'resultadoSupervisor',coalesce(r.resultado_supervisor,''),
    'motivoSupervisor',coalesce(r.motivo_supervisor,''),
    'validadoSupervisorPor',coalesce(r.validado_supervisor_por,''),
    'resultadoJefatura',coalesce(r.resultado_jefatura,''),
    'motivoJefatura',coalesce(r.motivo_jefatura,''),
    'validadoJefaturaPor',coalesce(r.validado_jefatura_por,''),
    'coberturaSede',r.cobertura_sede,
    'estadoCobertura',coalesce(r.estado_cobertura,''),
    'version',r.version,
    'estadoValidacion',case when upper(p_modo)='APROBADO' then 'APROBADO' else coalesce(r.estado_validacion,r.estado_programacion) end,
    'comentarioSupervisor',coalesce(r.comentario_supervisor,''),
    'comentarioJefatura',coalesce(r.comentario_jefatura,''),
    'validadoPor',coalesce(r.validado_por,''),
    'tipoRegistro',coalesce(r.tipo_registro,'PROGRAMACION_INICIAL'),
    'estadoAnterior',coalesce(r.estado_anterior,''),
    'estadoNuevo',coalesce(r.estado_nuevo,r.estado_dia,'EN CAMPO'),
    'idOrigen',r.id_origen,
    'accion',coalesce(r.tipo_registro,'PROGRAMACION_INICIAL'),
    'origen',case when upper(coalesce(r.tipo_registro,'')) like '%JEFATURA%' then 'JEFATURA' else 'SUPERVISOR' end,
    'usuario',coalesce(r.validado_por,r.solicitado_por,''),
    'motivo',coalesce(r.comentario_jefatura,r.comentario_supervisor,r.motivo_solicitud,r.motivo_jefatura,''),
    'fechaAfectada',to_char(r.fecha,'YYYY-MM-DD'),
    'esPendiente',pendiente
  );
end;
$$;

create or replace function public.mv_descansos_listar(
  p_usuario text,
  p_periodo text default null,
  p_sede text default 'TODAS',
  p_periodos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  u record;
  v_perfil text;
  v_periodo text;
  v_sede_filtro text:=upper(trim(coalesce(p_sede,'TODAS')));
  v_alcance text;
  v_operativo boolean:=false;
  v_periodos text[]:=array[]::text[];
  v text;
  entidades jsonb;
  programacion jsonb;
  historial jsonb;
begin
  select * into u
  from public.app_users
  where upper(trim(usuario))=upper(trim(p_usuario))
    and upper(trim(coalesce(estado,'ACTIVO')))='ACTIVO'
  order by id desc limit 1;
  if not found then raise exception 'Usuario no encontrado o inactivo'; end if;

  v_perfil:=upper(trim(coalesce(u.perfil,'')));
  v_periodo:=case
    when coalesce(p_periodo,'') ~ '^20[0-9]{2}-[0-9]{2}$' then p_periodo
    else to_char(now() at time zone 'America/Lima','YYYY-MM')
  end;
  v_periodos:=array_append(v_periodos,v_periodo);

  if p_periodos is not null and jsonb_typeof(p_periodos)='array' then
    for v in select jsonb_array_elements_text(p_periodos)
    loop
      if v ~ '^20[0-9]{2}-[0-9]{2}$'
         and not (v=any(v_periodos))
         and array_length(v_periodos,1)<3 then
        v_periodos:=array_append(v_periodos,v);
      end if;
    end loop;
  end if;

  if v_perfil='TECNICO' then
    v_alcance:='CUADRILLA';
    v_operativo:=true;
  else
    select upper(trim(coalesce(ap.alcance_datos,''))),
           (coalesce(ap.registrar,false) or coalesce(ap.editar,false) or coalesce(ap.observar,false)
            or coalesce(ap.aprobar,false) or coalesce(ap.validar,false) or coalesce(ap.administrar,false))
    into v_alcance,v_operativo
    from public.app_permissions ap
    where upper(trim(ap.perfil))=v_perfil
      and upper(trim(ap.modulo))='PROGRAMACION DESCANSOS'
      and ap.activo is true and ap.mostrar_modulo is true and ap.ver is true
    order by ap.id desc limit 1;

    if v_alcance is null then raise exception 'No tienes permiso para ver Programación de Descansos'; end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'cuadrilla',e.cuadrilla,'sede',e.sede,'plataforma',e.plataforma,'supervisor',e.supervisor,
      'tecnico',e.tecnico,'tecnicos',e.tecnicos,'tipoPersonal',e.tipo_personal,'nombrePersonal',e.nombre_personal
    ) order by e.sede,
      case e.tipo_personal when 'CUADRILLA' then 1 when 'SUPERVISOR' then 2 when 'ALMACEN' then 3 else 9 end,
      coalesce(nullif(e.nombre_personal,''),e.cuadrilla)
  ),'[]'::jsonb)
  into entidades
  from public.mv_descansos_entidades_listado e
  where
    (
      (v_perfil='TECNICO' and e.cuadrilla=public.mv_descansos_cuadrilla_norm(u.cuadrilla))
      or (v_perfil='SUPERVISOR' and e.sede=upper(trim(coalesce(u.sede,''))))
      or (v_perfil not in ('TECNICO','SUPERVISOR')
          and case
            when v_alcance in ('SEDE','SEDE / PROPIOS') then e.sede=upper(trim(coalesce(u.sede,'')))
            when v_alcance in ('CUADRILLA','PERSONAL') then e.cuadrilla=public.mv_descansos_cuadrilla_norm(u.cuadrilla)
            else true
          end)
    )
    and (v_sede_filtro in ('','TODAS') or e.sede=v_sede_filtro);

  with visibles as (
    select p.*
    from public.programacion_descansos_migracion p
    where p.periodo=any(v_periodos)
      and (v_sede_filtro in ('','TODAS') or upper(trim(p.sede))=v_sede_filtro)
      and (
        (v_perfil='TECNICO' and public.mv_descansos_cuadrilla_norm(p.cuadrilla)=public.mv_descansos_cuadrilla_norm(u.cuadrilla))
        or (v_perfil='SUPERVISOR' and upper(trim(p.sede))=upper(trim(coalesce(u.sede,''))))
        or (v_perfil not in ('TECNICO','SUPERVISOR')
            and case
              when v_alcance in ('SEDE','SEDE / PROPIOS') then upper(trim(p.sede))=upper(trim(coalesce(u.sede,'')))
              when v_alcance in ('CUADRILLA','PERSONAL') then public.mv_descansos_cuadrilla_norm(p.cuadrilla)=public.mv_descansos_cuadrilla_norm(u.cuadrilla)
              else true
            end)
      )
  ), keys as (
    select distinct public.mv_descansos_cuadrilla_norm(cuadrilla) cuadrilla,fecha from visibles
  ), elegidos as (
    select
      k.cuadrilla,k.fecha,
      a.id as aprobado_id,
      pd.id as pendiente_id
    from keys k
    left join lateral (
      select v.id
      from visibles v
      where public.mv_descansos_cuadrilla_norm(v.cuadrilla)=k.cuadrilla and v.fecha=k.fecha
        and replace(upper(trim(coalesce(nullif(v.estado_validacion,''),v.estado_programacion,''))),'_',' ')
          in ('APROBADO','APLICADO')
      order by v.seq desc limit 1
    ) a on true
    left join lateral (
      select v.id
      from visibles v
      where public.mv_descansos_cuadrilla_norm(v.cuadrilla)=k.cuadrilla and v.fecha=k.fecha
        and replace(upper(trim(coalesce(nullif(v.estado_validacion,''),v.estado_programacion,''))),'_',' ')
          in ('PENDIENTE SUPERVISOR','PENDIENTE JEFATURA','OBSERVADO')
      order by v.version desc,v.seq desc limit 1
    ) pd on true
  )
  select coalesce(jsonb_agg(item order by item->>'sede',item->>'cuadrilla',item->>'fecha'),'[]'::jsonb)
  into programacion
  from (
    select case
      when not v_operativo and e.aprobado_id is not null then public.mv_descansos_item_json(e.aprobado_id,'APROBADO')
      when v_operativo and e.pendiente_id is not null then public.mv_descansos_item_json(e.pendiente_id,'PENDIENTE')
      when e.aprobado_id is not null then public.mv_descansos_item_json(e.aprobado_id,'APROBADO')
      else null
    end item
    from elegidos e
  ) z
  where item is not null;

  select coalesce(jsonb_agg(public.mv_descansos_item_json(v.id,'NORMAL') order by v.seq desc),'[]'::jsonb)
  into historial
  from (
    select p.*
    from public.programacion_descansos_migracion p
    where p.periodo=any(v_periodos)
      and (v_sede_filtro in ('','TODAS') or upper(trim(p.sede))=v_sede_filtro)
      and (
        (v_perfil='TECNICO' and public.mv_descansos_cuadrilla_norm(p.cuadrilla)=public.mv_descansos_cuadrilla_norm(u.cuadrilla))
        or (v_perfil='SUPERVISOR' and upper(trim(p.sede))=upper(trim(coalesce(u.sede,''))))
        or (v_perfil not in ('TECNICO','SUPERVISOR')
            and case
              when v_alcance in ('SEDE','SEDE / PROPIOS') then upper(trim(p.sede))=upper(trim(coalesce(u.sede,'')))
              when v_alcance in ('CUADRILLA','PERSONAL') then public.mv_descansos_cuadrilla_norm(p.cuadrilla)=public.mv_descansos_cuadrilla_norm(u.cuadrilla)
              else true
            end)
      )
    order by p.seq desc
    limit 100
  ) v;

  return jsonb_build_object(
    'ok',true,'modulo','PROGRAMACION_DESCANSOS','accion','LISTAR',
    'perfil',u.perfil,'periodo',v_periodo,'periodosConsulta',to_jsonb(v_periodos),
    'cuadrillas',entidades,'programacion',programacion,'historial',historial,'optimizado',true
  );
end;
$$;

revoke all on public.mv_descansos_entidades_listado from anon,authenticated;
revoke execute on function public.mv_descansos_item_json(text,text) from public,anon,authenticated;
revoke execute on function public.mv_descansos_listar(text,text,text,jsonb) from public,anon,authenticated;

grant select on public.mv_descansos_entidades_listado to service_role;
grant execute on function public.mv_descansos_item_json(text,text) to service_role;
grant execute on function public.mv_descansos_listar(text,text,text,jsonb) to service_role;
