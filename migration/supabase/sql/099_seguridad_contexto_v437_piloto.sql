
-- 099_seguridad_contexto_v437_piloto.sql
-- Contexto y alcance alineados con V436/V437 productivo.

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
begin
  u:=public.mv_seguridad_contexto_usuario(p_usuario);

  select * into a
  from public.seguridad_ats_migracion
  where id=p_ats_id;

  if not found then return false; end if;

  if u->>'perfil'='TECNICO' then
    return public.mv_actividad_cuadrilla_norm(a.cuadrilla)
           =public.mv_actividad_cuadrilla_norm(u->>'cuadrilla');
  end if;

  if u->>'perfil'='SUPERVISOR' then
    return public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(u->>'sede');
  end if;

  return coalesce((u->>'puedeVer')::boolean,false);
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
      and public.mv_actividad_cuadrilla_norm(a.cuadrilla)
          =public.mv_actividad_cuadrilla_norm(cuadrilla_u)
    order by a.created_at desc,a.numero desc
    limit 1;
  else
    select coalesce(
      jsonb_agg(x.item order by x.fecha desc,x.numero desc),
      '[]'::jsonb
    )
    into pendientes
    from (
      select
        a.fecha,
        a.numero,
        public.mv_seguridad_resumen_ats_json(a) item
      from public.seguridad_ats_migracion a
      where
        (
          perfil_u='SUPERVISOR'
          and coalesce((u->>'puedeAprobar')::boolean,false)
          and public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(sede_u)
          and (
            a.estado='PENDIENTE SUPERVISOR'
            or (
              a.estado='PENDIENTE ACEPTACION'
              and public.mv_seguridad_aceptados(a.aceptaciones_json)>=1
            )
          )
        )
        or
        (
          perfil_u not in ('TECNICO','SUPERVISOR')
          and coalesce((u->>'puedeValidar')::boolean,false)
          and (
            a.estado in ('PENDIENTE VALIDACION','PENDIENTE SUPERVISOR')
            or (
              a.estado='PENDIENTE ACEPTACION'
              and public.mv_seguridad_aceptados(a.aceptaciones_json)>=1
            )
          )
        )
      order by a.created_at desc,a.numero desc
      limit 50
    ) x;

    select coalesce(
      jsonb_agg(x.item order by x.fecha desc,x.numero desc),
      '[]'::jsonb
    )
    into seguimiento
    from (
      select
        a.fecha,
        a.numero,
        public.mv_seguridad_resumen_ats_json(a) item
      from public.seguridad_ats_migracion a
      where a.fecha=hoy
        and (
          (perfil_u='SUPERVISOR'
            and public.mv_actividad_texto(a.sede)=public.mv_actividad_texto(sede_u))
          or
          (perfil_u not in ('TECNICO','SUPERVISOR')
            and coalesce((u->>'puedeVer')::boolean,false))
        )
        and not (
          (
            perfil_u='SUPERVISOR'
            and coalesce((u->>'puedeAprobar')::boolean,false)
            and (
              a.estado='PENDIENTE SUPERVISOR'
              or (
                a.estado='PENDIENTE ACEPTACION'
                and public.mv_seguridad_aceptados(a.aceptaciones_json)>=1
              )
            )
          )
          or
          (
            perfil_u not in ('TECNICO','SUPERVISOR')
            and coalesce((u->>'puedeValidar')::boolean,false)
            and (
              a.estado in ('PENDIENTE VALIDACION','PENDIENTE SUPERVISOR')
              or (
                a.estado='PENDIENTE ACEPTACION'
                and public.mv_seguridad_aceptados(a.aceptaciones_json)>=1
              )
            )
          )
        )
      order by a.created_at desc,a.numero desc
      limit 80
    ) x;

    if coalesce((u->>'puedeAprobar')::boolean,false) then
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',s.id,
            'usuario',s.usuario,
            'nombre',coalesce(s.nombre,''),
            'sede',coalesce(s.sede,''),
            'motivo',coalesce(s.motivo,''),
            'estado',s.estado
          )
          order by s.solicitado_en
        ),
        '[]'::jsonb
      )
      into solicitudes
      from public.seguridad_firma_solicitudes_migracion s
      where public.mv_actividad_texto(s.estado)='PENDIENTE'
        and (
          perfil_u<>'SUPERVISOR'
          or public.mv_actividad_texto(s.sede)=public.mv_actividad_texto(sede_u)
        );
    end if;
  end if;

  return jsonb_build_object(
    'ok',true,
    'modulo','SEGURIDAD',
    'version','V436',
    'usuario',jsonb_build_object(
      'usuario',u->>'usuario',
      'nombre',coalesce(u->>'nombresApellidos',''),
      'perfil',perfil_u,
      'sede',sede_u,
      'cuadrilla',cuadrilla_u,
      'plataforma',coalesce(u->>'plataforma','')
    ),
    'firma',firma,
    'hoy',jsonb_build_object('ats',hoy_ats),
    'pendientes',pendientes,
    'seguimiento',seguimiento,
    'solicitudesFirma',case when perfil_u='TECNICO' then '[]'::jsonb else solicitudes end,
    'catalogo',null
  );
end;
$$;

-- Compatibilidad con funciones de 095 mientras se completa el puerto PDF.
create or replace function public.mv_seguridad_autocompletar_aceptaciones(
  p_ats_id text,
  p_actor text,
  p_actor_perfil text,
  p_actor_nombre text
)
returns jsonb
language sql
security definer
set search_path=public
as $$
  select public.mv_seguridad_autocompletar_aceptaciones(
    p_ats_id,p_actor,p_actor_perfil,p_actor_nombre,'AUTORIZACION',''
  );
$$;

revoke execute on function public.mv_seguridad_puede_ver_documento(text,text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_obtener_contexto(text) from public,anon,authenticated;
revoke execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text) from public,anon,authenticated;

grant execute on function public.mv_seguridad_puede_ver_documento(text,text) to service_role;
grant execute on function public.mv_seguridad_obtener_contexto(text) to service_role;
grant execute on function public.mv_seguridad_autocompletar_aceptaciones(text,text,text,text) to service_role;
