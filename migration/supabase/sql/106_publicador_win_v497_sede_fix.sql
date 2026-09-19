
-- 106_publicador_win_v497_sede_fix.sql
-- Corrige mapeo legacy REGION -> PostgreSQL ordenes.sede.

create or replace function public.mv_publicador_win_publicar_v497(
  p_periodo text,
  p_usuario text,
  p_confirmacion text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p text;
  previo jsonb;
  pub uuid;
  corte timestamp without time zone;
  importacion timestamp without time zone;
  pendientes_agregados integer:=0;
  prod_filas integer:=0;
  ef_filas integer:=0;
  rec_filas integer:=0;
  vg_filas integer:=0;
  ranking_result jsonb;
  cumplimiento_result jsonb;
begin
  p:=public.mv_publicador_win_validar_periodo_v497(p_periodo);

  if trim(coalesce(p_confirmacion,''))<>'PUBLICAR_V487_CONFIRMADO' then
    raise exception 'V497: falta confirmación explícita para publicar.';
  end if;

  if nullif(trim(coalesce(p_usuario,'')),'') is null then
    raise exception 'V497: usuario publicador obligatorio.';
  end if;

  perform pg_advisory_xact_lock(hashtext('V497_PUBLICAR|'||p));

  previo:=public.mv_publicador_win_preview_v497(p);
  if not coalesce((previo->>'puedePublicar')::boolean,false) then
    raise exception 'V497: publicación bloqueada. %',coalesce(previo->>'bloqueo','');
  end if;

  corte:=(previo->'win'->>'corteEstado')::timestamp;
  importacion:=(previo->'win'->>'ultimaImportacion')::timestamp;

  update public.publicador_win_publicaciones
     set estado='SUPERSEDIDA'
   where periodo=p and estado='PUBLICADO';

  insert into public.publicador_win_publicaciones(
    periodo,version,estado,confirmacion,publicado_por,corte_estado,ultima_importacion,resumen
  ) values (
    p,'V497-POSTGRESQL-20260919','PUBLICADO','PUBLICAR_V487_CONFIRMADO',
    trim(p_usuario),corte,importacion,previo
  )
  returning id into pub;

  insert into public.publicador_win_produccion_snapshot(
    publicacion_id,periodo,cuadrilla,fecha,codigo,cantidad,puntos_unitarios,puntos_total
  )
  select
    pub,p,
    public.mv_continuidad_cuadrilla(p,m.cuadrilla),
    m.fecha_ejecucion,
    upper(trim(m.partida_motor)),
    count(*)::integer,
    max(coalesce(c.puntaje_consistente,0))::numeric,
    sum(coalesce(c.puntaje_consistente,0))::numeric
  from public.mv_produccion_partida_motor_migracion_v1 m
  left join public.mv_catalogo_puntaje_codigo c
    on c.codigo=upper(trim(m.partida_motor))
  where m.periodo_solicitud=p
    and m.elegible_produccion_efectiva
    and nullif(trim(coalesce(m.partida_motor,'')),'') is not null
  group by
    public.mv_continuidad_cuadrilla(p,m.cuadrilla),
    m.fecha_ejecucion,upper(trim(m.partida_motor));
  get diagnostics prod_filas=row_count;

  insert into public.publicador_win_efectividad_snapshot(
    publicacion_id,periodo,cuadrilla,actualizacion,finalizada,cancelada,regestion,
    reprogramado,total_general,efectividad,no_evaluables
  )
  select pub,periodo,cuadrilla,actualizacion,finalizada,cancelada,regestion,
         reprogramado,total_general,efectividad,no_evaluables
  from public.mv_continuidad_efectividad_v496
  where periodo=p;
  get diagnostics ef_filas=row_count;

  insert into public.publicador_win_recableado_snapshot(
    publicacion_id,periodo,cuadrilla,actualizacion,los_rojo_asignadas,recableados,porcentaje
  )
  select pub,periodo,cuadrilla,actualizacion,los_rojo_asignadas,recableados,porcentaje
  from public.mv_continuidad_recableado_v496
  where periodo=p;
  get diagnostics rec_filas=row_count;

  insert into public.publicador_win_vtrgar_snapshot(
    publicacion_id,periodo,cuadrilla,actualizacion,total_finalizadas,gar,vtr,total_gar_vtr,porcentaje
  )
  select pub,periodo,cuadrilla,actualizacion,total_finalizadas,gar,vtr,total_gar_vtr,porcentaje
  from public.mv_continuidad_vtrgar_dashboard_v496
  where periodo=p;
  get diagnostics vg_filas=row_count;

  insert into public.vtr_gar_detectados_postgresql(
    orden_id,periodo,clave,fecha_incidencia,tipo,ticket,numero_documento,cliente,
    codigo_pedido,tipo_partida,cuadrilla_ejecutora,sede_ejecutora,estado_calificacion,
    observacion,fecha_corte,publicacion_id
  )
  select
    o.orden_id,p,'WIN|'||o.orden_id,
    coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),
    public.mv_vtr_gar_tipo_win(o.tipo_trabajo,o.codigo_seguimiento),
    o.codigo_seguimiento,o.numero_documento,o.cliente,o.codigo_cliente,
    coalesce(nullif(o.motivo_finalizacion,''),o.tipo_trabajo),
    public.mv_continuidad_cuadrilla(p,o.cuadrilla),
    o.sede,'PENDIENTE',
    case
      when public.mv_norm_key(public.mv_continuidad_cuadrilla(p,o.cuadrilla))
           <>public.mv_norm_key(o.cuadrilla)
      then 'Ejecutor WIN original: '||coalesce(o.cuadrilla,'')||'. Detectado automáticamente desde WIN.'
      else 'Detectado automáticamente desde WIN.'
    end,
    corte,pub
  from public.ordenes o
  where to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM')=p
    and public.mv_norm_key(o.estado) in ('FINALIZADA','FINALIZADO')
    and public.mv_vtr_gar_tipo_win(o.tipo_trabajo,o.codigo_seguimiento) is not null
    and not exists (
      select 1 from public.vtr_gar_clasificacion_legacy l
      where trim(coalesce(l.codigo_liquidacion,''))=trim(o.orden_id)
    )
  on conflict (orden_id) do nothing;
  get diagnostics pendientes_agregados=row_count;

  select public.mv_dashboard_refrescar_ranking_cache(p) into ranking_result;
  select public.mv_dashboard_refrescar_cumplimiento_cache(p) into cumplimiento_result;

  update public.publicador_win_publicaciones
     set resumen=previo || jsonb_build_object(
       'accion','PUBLICAR',
       'publicacionId',pub,
       'publicadoPor',trim(p_usuario),
       'filasPreparadas',jsonb_build_object(
         'produccion',prod_filas,'efectividad',ef_filas,'recableado',rec_filas,'vtrgar',vg_filas
       ),
       'vtrGarPendientesAgregados',pendientes_agregados,
       'rankingCache',ranking_result,
       'cumplimientoCache',cumplimiento_result,
       'rollbackAutomatico',true
     )
   where id=pub;

  return jsonb_build_object(
    'ok',true,
    'version','V497-POSTGRESQL-20260919',
    'accion','PUBLICAR',
    'publicacionId',pub,
    'periodo',p,
    'actualizadoAl',corte,
    'julioCongelado',true,
    'fuente','WIN / ordenes',
    'produccion',jsonb_build_object('filas',prod_filas,'resumen',previo->'produccion'),
    'efectividad',jsonb_build_object('filas',ef_filas,'control',previo->'efectividad'),
    'recableado',jsonb_build_object('filas',rec_filas,'control',previo->'recableado'),
    'vtrGar',jsonb_build_object(
      'filas',vg_filas,
      'pendientesNuevos',pendientes_agregados,
      'control',previo->'vtrGar'
    ),
    'ranking',ranking_result,
    'cumplimiento',cumplimiento_result,
    'rollbackAutomatico',true
  );
end;
$$;

revoke execute on function public.mv_publicador_win_publicar_v497(text,text,text) from public,anon,authenticated;
grant execute on function public.mv_publicador_win_publicar_v497(text,text,text) to service_role;
