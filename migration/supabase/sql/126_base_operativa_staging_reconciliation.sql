-- 126_base_operativa_staging_reconciliation.sql
-- 20/09/2026
-- Conciliación semántica/cobertura Base Operativa vs motores PostgreSQL.
-- SOLO LECTURA. No habilita APPLY.

create or replace function public.mv_base_operativa_reconcile_staging(
  p_run_id uuid,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  v_periodo text;
  v_corte date;
  v_total int:=0;
  v_con_liq int:=0;
  v_vinculadas int:=0;
  v_sin_orden int:=0;
  v_cuadrilla_difiere int:=0;
  v_estado_exacto int:=0;
  v_estado_difiere int:=0;
  v_unmatched jsonb:='[]'::jsonb;
  v_effect_base jsonb:='{}'::jsonb;
  v_effect_motor jsonb:='{}'::jsonb;
  v_rec_base jsonb:='{}'::jsonb;
  v_rec_motor jsonb:='{}'::jsonb;
  v_vtr_base jsonb:='{}'::jsonb;
  v_vtr_motor jsonb:='{}'::jsonb;
  v_prod_base jsonb:='{}'::jsonb;
  v_prod_motor jsonb:='{}'::jsonb;
  v_pct numeric:=0;
begin
  select * into r
  from public.migration_sync_runs
  where id=p_run_id and upper(trim(modulo))='BASE_OPERATIVA'
  limit 1;

  if not found then raise exception 'Carga Base Operativa no encontrada'; end if;
  if r.status not in ('STAGING','STAGED','VALIDATED') then
    raise exception 'La carga no puede conciliarse en estado %',r.status;
  end if;

  with s as (
    select
      s.source_row,
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado
    from public.migration_sync_staging s
    where s.run_id=p_run_id
  )
  select to_char(max(fecha) filter(where estado='FINALIZADA'),'YYYY-MM'),
         max(fecha) filter(where estado='FINALIZADA')
  into v_periodo,v_corte
  from s;

  if v_corte is null then raise exception 'No hay FINALIZADAS para determinar corte'; end if;

  with stg as (
    select
      s.source_row,
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      trim(coalesce(s.row_data->>'cuadrilla','')) cuadrilla,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado,
      trim(coalesce(s.row_data->>'tipoTrabajo',s.row_data->>'tipo_trabajo','')) tipo_trabajo,
      trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')) codigo_liquidacion,
      trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) tipo_partida
    from public.migration_sync_staging s
    where s.run_id=p_run_id
  ), scope as (
    select * from stg
    where fecha is not null
      and to_char(fecha,'YYYY-MM')=v_periodo
      and fecha<=v_corte
  ), linked as (
    select q.*,o.orden_id,o.estado estado_orden,o.cuadrilla cuadrilla_orden,
           o.tipo_trabajo tipo_trabajo_orden,o.motivo_finalizacion,
           o.motivo_cancelacion,o.motivo_anulacion,o.detalle
    from scope q
    left join public.ordenes o
      on nullif(public.mv_norm_key(q.codigo_liquidacion),'') is not null
     and public.mv_norm_key(o.orden_id)=public.mv_norm_key(q.codigo_liquidacion)
  )
  select
    count(*),
    count(*) filter(where nullif(trim(codigo_liquidacion),'') is not null),
    count(*) filter(where orden_id is not null),
    count(*) filter(where orden_id is null),
    count(*) filter(where orden_id is not null
      and public.mv_norm_key(cuadrilla)<>public.mv_norm_key(cuadrilla_orden)),
    count(*) filter(where orden_id is not null
      and public.mv_norm_key(estado)=public.mv_norm_key(estado_orden)),
    count(*) filter(where orden_id is not null
      and public.mv_norm_key(estado)<>public.mv_norm_key(estado_orden))
  into v_total,v_con_liq,v_vinculadas,v_sin_orden,v_cuadrilla_difiere,v_estado_exacto,v_estado_difiere
  from linked;

  v_pct:=case when v_con_liq>0 then round(100.0*v_vinculadas/v_con_liq,2) else 0 end;

  with stg as (
    select s.source_row,
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')) codigo_liquidacion,
      trim(coalesce(s.row_data->>'codigoPedido',s.row_data->>'codigo_pedido','')) codigo_pedido,
      trim(coalesce(s.row_data->>'cuadrilla','')) cuadrilla,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado
    from public.migration_sync_staging s where s.run_id=p_run_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'sourceRow',x.source_row,'codigoLiquidacion',x.codigo_liquidacion,
    'codigoPedido',x.codigo_pedido,'cuadrilla',x.cuadrilla,'estado',x.estado
  ) order by x.source_row),'[]'::jsonb)
  into v_unmatched
  from (
    select q.*
    from stg q
    left join public.ordenes o
      on nullif(public.mv_norm_key(q.codigo_liquidacion),'') is not null
     and public.mv_norm_key(o.orden_id)=public.mv_norm_key(q.codigo_liquidacion)
    where q.fecha is not null
      and to_char(q.fecha,'YYYY-MM')=v_periodo
      and q.fecha<=v_corte
      and o.orden_id is null
    order by q.source_row
    limit 100
  ) x;

  -- Efectividad según categorías almacenadas en Base Operativa.
  with stg as (
    select
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado
    from public.migration_sync_staging s where s.run_id=p_run_id
  ), x as (
    select case
      when public.mv_norm_key(estado) in ('FINALIZADA','FINALIZADO') then 'FINALIZADA'
      when public.mv_norm_key(estado) in ('CANCELADA','CANCELADO','ANULADA','ANULADO') then 'CANCELADA'
      when public.mv_norm_key(estado) like 'REGEST%' then 'REGESTION'
      when public.mv_norm_key(estado) in ('REPROGRAMADA','REPROGRAMADO') then 'REPROGRAMADO'
      else 'NO_EVALUABLE'
    end clase
    from stg
    where fecha is not null and to_char(fecha,'YYYY-MM')=v_periodo and fecha<=v_corte
  )
  select jsonb_build_object(
    'finalizada',count(*) filter(where clase='FINALIZADA'),
    'cancelada',count(*) filter(where clase='CANCELADA'),
    'regestion',count(*) filter(where clase='REGESTION'),
    'reprogramado',count(*) filter(where clase='REPROGRAMADO'),
    'noEvaluable',count(*) filter(where clase='NO_EVALUABLE'),
    'totalGeneral',count(*) filter(where clase<>'NO_EVALUABLE')
  ) into v_effect_base from x;

  -- Efectividad del motor, limitada a las órdenes vinculadas del mismo staging.
  with ids as (
    select distinct o.orden_id
    from public.migration_sync_staging s
    join public.ordenes o
      on public.mv_norm_key(o.orden_id)=public.mv_norm_key(
        coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')
      )
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  ), x as (
    select e.clase_efectividad clase
    from ids i
    join public.mv_efectividad_orden_v487 e on e.orden_id=i.orden_id
  )
  select jsonb_build_object(
    'finalizada',count(*) filter(where clase='FINALIZADA'),
    'cancelada',count(*) filter(where clase='CANCELADA'),
    'regestion',count(*) filter(where clase='REGESTION'),
    'reprogramado',count(*) filter(where clase='REPROGRAMADO'),
    'noEvaluable',count(*) filter(where clase='NO_EVALUABLE'),
    'totalGeneral',count(*) filter(where clase<>'NO_EVALUABLE')
  ) into v_effect_motor from x;

  -- Recableado según Base.
  with stg as (
    select
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado,
      trim(coalesce(s.row_data->>'tipoTrabajo',s.row_data->>'tipo_trabajo','')) tipo_trabajo,
      trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) tipo_partida
    from public.migration_sync_staging s where s.run_id=p_run_id
  )
  select jsonb_build_object(
    'los',count(*) filter(where public.mv_norm_key(estado) in ('FINALIZADA','FINALIZADO')
      and public.mv_norm_key(tipo_trabajo) like '%LOSROJO%'),
    'recableados',count(*) filter(where public.mv_norm_key(estado) in ('FINALIZADA','FINALIZADO')
      and public.mv_norm_key(tipo_trabajo) like '%LOSROJO%'
      and public.mv_norm_key(tipo_partida) like '%RECABLEADO%')
  ) into v_rec_base
  from stg
  where fecha is not null and to_char(fecha,'YYYY-MM')=v_periodo and fecha<=v_corte;

  -- Recableado del motor sobre las órdenes vinculadas.
  with ids as (
    select distinct o.orden_id
    from public.migration_sync_staging s
    join public.ordenes o
      on public.mv_norm_key(o.orden_id)=public.mv_norm_key(
        coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')
      )
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  )
  select jsonb_build_object(
    'los',count(*) filter(where public.mv_norm_key(o.estado) in ('FINALIZADA','FINALIZADO')
      and public.mv_norm_key(o.tipo_trabajo) like '%LOSROJO%'),
    'recableados',count(*) filter(where public.mv_norm_key(o.estado) in ('FINALIZADA','FINALIZADO')
      and public.mv_norm_key(o.tipo_trabajo) like '%LOSROJO%'
      and public.mv_norm_key(o.motivo_finalizacion) like '%RECABLEADO%')
  ) into v_rec_motor
  from ids i join public.ordenes o on o.orden_id=i.orden_id;

  -- Etiquetas VTR/GAR presentes en Base (si el archivo ya viene procesado).
  with stg as (
    select
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado
    from public.migration_sync_staging s where s.run_id=p_run_id
  )
  select jsonb_build_object(
    'garEtiquetadas',count(*) filter(where public.mv_norm_key(estado) like 'GARANTIA%'),
    'vtrEtiquetadas',count(*) filter(where public.mv_norm_key(estado) like 'VTR%')
  ) into v_vtr_base
  from stg
  where fecha is not null and to_char(fecha,'YYYY-MM')=v_periodo and fecha<=v_corte;

  with ids as (
    select distinct o.orden_id
    from public.migration_sync_staging s
    join public.ordenes o
      on public.mv_norm_key(o.orden_id)=public.mv_norm_key(
        coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')
      )
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  )
  select jsonb_build_object(
    'gar',count(*) filter(where upper(trim(d.tipo))='GAR'
      and upper(trim(coalesce(d.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO')),
    'vtr',count(*) filter(where upper(trim(d.tipo))='VTR'
      and upper(trim(coalesce(d.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO')),
    'noEsGarVtr',count(*) filter(where upper(trim(coalesce(d.estado_calificacion,'')))='NO_ES_GAR_VTR')
  ) into v_vtr_motor
  from ids i
  left join public.mv_vtr_gar_decision_por_orden d on d.orden_id=i.orden_id;

  -- Producción Base: finalizadas con partida reconocida, valoradas con puntaje vigente.
  with stg as (
    select
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado,
      trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) tipo_partida
    from public.migration_sync_staging s where s.run_id=p_run_id
  ), x as (
    select s.*,
      c.codigo,
      p.puntaje_consistente
    from stg s
    left join public.catalogo_partidas_migracion c
      on public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(s.tipo_partida)
     and upper(trim(coalesce(c.estado_tarifa,'ACTIVO')))='ACTIVO'
    left join public.mv_catalogo_puntaje_codigo p
      on upper(trim(p.codigo))=upper(trim(c.codigo))
    where s.fecha is not null
      and to_char(s.fecha,'YYYY-MM')=v_periodo
      and s.fecha<=v_corte
      and public.mv_norm_key(s.estado) in ('FINALIZADA','FINALIZADO')
  )
  select jsonb_build_object(
    'finalizadas',count(*),
    'catalogadas',count(*) filter(where codigo is not null),
    'sinCatalogo',count(*) filter(where codigo is null),
    'puntos',round(sum(coalesce(puntaje_consistente,0)),4)
  ) into v_prod_base from x;

  -- Producción motor solo sobre las órdenes vinculadas al staging y dentro del corte.
  with ids as (
    select distinct o.orden_id
    from public.migration_sync_staging s
    join public.ordenes o
      on public.mv_norm_key(o.orden_id)=public.mv_norm_key(
        coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')
      )
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  ), x as (
    select p.orden_id,p.elegible_produccion_efectiva,p.partida_motor,c.puntaje_consistente
    from ids i
    join public.mv_produccion_partida_motor_migracion_v1 p on p.orden_id=i.orden_id
    left join public.mv_catalogo_puntaje_codigo c
      on upper(trim(c.codigo))=upper(trim(p.partida_motor))
  )
  select jsonb_build_object(
    'ordenesElegibles',count(*) filter(where elegible_produccion_efectiva is true),
    'puntos',round(sum(coalesce(puntaje_consistente,1))
      filter(where elegible_produccion_efectiva is true),4),
    'sinPartida',count(*) filter(where elegible_produccion_efectiva is true and partida_motor is null)
  ) into v_prod_motor from x;

  return jsonb_build_object(
    'ok',true,
    'modulo','BASE_OPERATIVA',
    'accion','CONCILIAR_STAGING',
    'runId',p_run_id,
    'periodo',v_periodo,
    'corte',to_char(v_corte,'YYYY-MM-DD'),
    'cobertura',jsonb_build_object(
      'filasPeriodo',v_total,
      'conCodigoLiquidacion',v_con_liq,
      'vinculadasOrdenes',v_vinculadas,
      'sinOrden',v_sin_orden,
      'porcentaje',v_pct,
      'cuadrillaDifiere',v_cuadrilla_difiere,
      'estadoExacto',v_estado_exacto,
      'estadoDifiere',v_estado_difiere
    ),
    'ordenesNoVinculadas',v_unmatched,
    'efectividad',jsonb_build_object('base',v_effect_base,'motor',v_effect_motor),
    'recableado',jsonb_build_object('base',v_rec_base,'motor',v_rec_motor),
    'vtrGar',jsonb_build_object('baseEtiquetas',v_vtr_base,'motorDecisiones',v_vtr_motor),
    'produccion',jsonb_build_object('base',v_prod_base,'motor',v_prod_motor),
    'estado','SOLO_LECTURA',
    'applyHabilitado',false,
    'actor',p_actor,
    'mensaje','Conciliación completada. No se modificó información operativa.'
  );
end $$;

revoke all on function public.mv_base_operativa_reconcile_staging(uuid,text)
from public,anon,authenticated;
grant execute on function public.mv_base_operativa_reconcile_staging(uuid,text)
to service_role;
