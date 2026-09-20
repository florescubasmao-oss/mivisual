-- 122_facturas_contexto_order_fix.sql
-- Corrige ordenamiento por alias del JSON de contexto Facturas.

create or replace function public.mv_facturas_contexto(p_usuario text,p_periodo text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  u jsonb; v_perfil text; v_usuario text; v_periodo text;
  cfg jsonb; lista jsonb; responsables jsonb; res jsonb;
begin
  u:=public.mv_facturas_usuario(p_usuario);
  v_perfil:=u->>'perfil'; v_usuario:=u->>'usuario';
  v_periodo:=coalesce(nullif(trim(p_periodo),''),to_char((current_timestamp at time zone 'America/Lima')::date,'YYYY-MM'));

  select coalesce(jsonb_object_agg(parametro,valor),'{}'::jsonb) into cfg
  from public.facturas_config_migracion;

  select coalesce(jsonb_agg(x order by x."fechaDesde" desc,x."creadoAt" desc),'[]'::jsonb) into lista
  from (
    select
      p.id,p.periodo_mes as "periodoMes",
      to_char(p.fecha_desde,'YYYY-MM-DD') as "fechaDesde",
      to_char(p.fecha_hasta,'YYYY-MM-DD') as "fechaHasta",
      p.usuario_responsable as "usuarioResponsable",p.nombre_responsable as "nombreResponsable",
      p.perfil_responsable as "perfilResponsable",p.sede,p.cuadrilla,p.placa,p.frecuencia,
      p.monto_requerido as "montoRequerido",p.observacion,p.estado,
      p.creado_at as "creadoAt",
      public.mv_facturas_estado_visible(p.estado,p.fecha_hasta) as "estadoVisible",
      (select count(*) from public.facturas_detalle_migracion d
       where d.pendiente_id=p.id and d.estado_detalle<>'REEMPLAZADO') as cantidad
    from public.facturas_pendientes_migracion p
    where p.periodo_mes=v_periodo
      and (
        v_perfil='GERENCIA GENERAL'
        or p.usuario_responsable=v_usuario
        or (v_perfil in ('JEFATURA','JEFATURA GENERAL') and upper(coalesce(u->>'alcance','')) like '%ZONA%')
        or (v_perfil='SUPERVISOR' and p.sede=u->>'sede')
      )
  ) x;

  if v_perfil='GERENCIA GENERAL' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'usuario',a.usuario,'nombre',a.nombres_apellidos,'perfil',a.perfil,'sede',a.sede,
      'cuadrilla',a.cuadrilla,'placa',a.placa_unidad,
      'frecuencia',nullif(regexp_replace(coalesce(a.frecuencia_combustible,''),'[^0-9]','','g'),'')::int
    ) order by a.sede,a.perfil,a.nombres_apellidos),'[]'::jsonb)
    into responsables
    from public.app_users a
    join public.app_permissions pp on pp.perfil=a.perfil and pp.modulo='FACTURAS' and pp.activo and pp.ver
    where upper(coalesce(a.estado,''))='ACTIVO'
      and (
        upper(coalesce(a.facturas_activo,''))='SI'
        or a.perfil in ('SUPERVISOR','JEFATURA','JEFATURA GENERAL')
      );
  else responsables:='[]'::jsonb; end if;

  select jsonb_build_object(
    'pendientes',count(*) filter(where public.mv_facturas_estado_visible(p.estado,p.fecha_hasta)='PENDIENTE'),
    'presentados',count(*) filter(where p.estado='PRESENTADO'),
    'observados',count(*) filter(where p.estado='OBSERVADO'),
    'aprobados',count(*) filter(where p.estado='APROBADO'),
    'vencidos',count(*) filter(where public.mv_facturas_estado_visible(p.estado,p.fecha_hasta)='VENCIDO')
  ) into res
  from public.facturas_pendientes_migracion p
  where p.periodo_mes=v_periodo
    and (
      v_perfil='GERENCIA GENERAL'
      or p.usuario_responsable=v_usuario
      or (v_perfil in ('JEFATURA','JEFATURA GENERAL') and upper(coalesce(u->>'alcance','')) like '%ZONA%')
      or (v_perfil='SUPERVISOR' and p.sede=u->>'sede')
    );

  return jsonb_build_object(
    'ok',true,'modulo','FACTURAS','accion','CONTEXTO','usuario',u,
    'periodoMes',v_periodo,'periodos',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (
      select distinct periodo_mes x from public.facturas_pendientes_migracion
      union select v_periodo order by 1 desc
    ) z),
    'configuracion',jsonb_build_object(
      'monto',coalesce((cfg->>'MONTO_COMBUSTIBLE')::numeric,100),
      'maxFacturas',coalesce((cfg->>'MAX_FACTURAS')::int,10),
      'anchoMaxImagen',coalesce((cfg->>'ANCHO_MAX_IMAGEN')::int,1280),
      'calidadImagen',coalesce((cfg->>'CALIDAD_IMAGEN')::numeric,.72)
    ),
    'visibleMenu',case when v_perfil='TECNICO' then upper(coalesce(u->>'facturasActivo',''))='SI'
                       else true end,
    'puedeCrear',v_perfil='GERENCIA GENERAL',
    'responsables',responsables,'resumen',res,'lista',lista,'fuente','POSTGRESQL PILOTO'
  );
end $$;

revoke all on function public.mv_facturas_contexto(text,text) from public,anon,authenticated;
grant execute on function public.mv_facturas_contexto(text,text) to service_role;
