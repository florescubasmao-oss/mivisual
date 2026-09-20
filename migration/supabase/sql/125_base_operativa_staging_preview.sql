-- 125_base_operativa_staging_preview.sql
-- 20/09/2026
-- Previsualización segura de Base Operativa sobre migration_sync_staging.
-- NO aplica cambios a base_operativa_legacy ni reconstruye indicadores.

create or replace function public.mv_base_operativa_preview_staging(
  p_run_id uuid,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  v_staged int;
  v_corte date;
  v_periodo text;
  v_protegido boolean;
  v_invalidos int;
  v_finalizadas int;
  v_duplicados int;
  v_partidas jsonb;
  v_cuadrillas jsonb;
  v_actual jsonb;
  v_nuevo jsonb;
begin
  select * into r
  from public.migration_sync_runs
  where id=p_run_id
  limit 1;

  if not found then raise exception 'Carga no encontrada'; end if;
  if upper(trim(r.modulo))<>'BASE_OPERATIVA' then raise exception 'La carga no corresponde a Base Operativa'; end if;
  if r.status not in ('STAGING','STAGED','VALIDATED') then
    raise exception 'La carga no puede previsualizarse en estado %',r.status;
  end if;
  if r.source_rows is null or r.source_rows<=0 then raise exception 'source_rows inválido'; end if;

  select count(*) into v_staged
  from public.migration_sync_staging s
  where s.run_id=p_run_id;

  if v_staged<>r.source_rows then
    raise exception 'Carga incompleta: esperadas %, recibidas %',r.source_rows,v_staged;
  end if;

  with parsed as (
    select
      s.source_row,
      nullif(trim(coalesce(s.row_data->>'fecha','')),'') as fecha_txt,
      trim(coalesce(s.row_data->>'cuadrilla','')) as cuadrilla,
      upper(trim(coalesce(s.row_data->>'estado',''))) as estado,
      trim(coalesce(s.row_data->>'tipoTrabajo',s.row_data->>'tipo_trabajo','')) as tipo_trabajo,
      trim(coalesce(s.row_data->>'numeroDocumento',s.row_data->>'numero_documento','')) as numero_documento,
      trim(coalesce(s.row_data->>'cliente','')) as cliente,
      trim(coalesce(s.row_data->>'sede','')) as sede,
      trim(coalesce(s.row_data->>'codigoPedido',s.row_data->>'codigo_pedido','')) as codigo_pedido,
      trim(coalesce(s.row_data->>'ticket','')) as ticket,
      trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')) as codigo_liquidacion,
      trim(coalesce(s.row_data->>'tipoAtencion',s.row_data->>'tipo_atencion','')) as tipo_atencion,
      trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) as tipo_partida,
      trim(coalesce(s.row_data->>'tipoPartidaAlterna',s.row_data->>'tipo_partida_alterna','')) as tipo_partida_alterna
    from public.migration_sync_staging s
    where s.run_id=p_run_id
  ), typed as (
    select *,
      case when fecha_txt ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then fecha_txt::date else null end as fecha
    from parsed
  )
  select
    count(*) filter(where fecha is null or cuadrilla='' or estado=''),
    max(fecha) filter(where estado='FINALIZADA')
  into v_invalidos,v_corte
  from typed;

  if v_invalidos>0 then
    raise exception 'La carga contiene % fila(s) sin Fecha/Cuadrilla/Estado válido',v_invalidos;
  end if;
  if v_corte is null then raise exception 'La carga no contiene órdenes FINALIZADAS'; end if;

  v_periodo:=to_char(v_corte,'YYYY-MM');

  select protegido into v_protegido
  from public.produccion_periodos
  where periodo=v_periodo;

  if coalesce(v_protegido,false) then
    raise exception 'El período % está protegido y no puede actualizarse desde Base Operativa',v_periodo;
  end if;

  with parsed as (
    select
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end as fecha,
      trim(coalesce(s.row_data->>'cuadrilla','')) as cuadrilla,
      upper(trim(coalesce(s.row_data->>'estado',''))) as estado,
      trim(coalesce(s.row_data->>'tipoTrabajo',s.row_data->>'tipo_trabajo','')) as tipo_trabajo,
      trim(coalesce(s.row_data->>'numeroDocumento',s.row_data->>'numero_documento','')) as numero_documento,
      trim(coalesce(s.row_data->>'cliente','')) as cliente,
      trim(coalesce(s.row_data->>'sede','')) as sede,
      trim(coalesce(s.row_data->>'codigoPedido',s.row_data->>'codigo_pedido','')) as codigo_pedido,
      trim(coalesce(s.row_data->>'ticket','')) as ticket,
      trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')) as codigo_liquidacion,
      trim(coalesce(s.row_data->>'tipoAtencion',s.row_data->>'tipo_atencion','')) as tipo_atencion,
      trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) as tipo_partida,
      trim(coalesce(s.row_data->>'tipoPartidaAlterna',s.row_data->>'tipo_partida_alterna','')) as tipo_partida_alterna
    from public.migration_sync_staging s
    where s.run_id=p_run_id
  ), scope as (
    select *
    from parsed
    where fecha is not null
      and to_char(fecha,'YYYY-MM')=v_periodo
      and fecha<=v_corte
  ), dup as (
    select
      md5(concat_ws('|',
        fecha::text,public.mv_norm_key(cuadrilla),estado,public.mv_norm_key(tipo_trabajo),
        public.mv_norm_key(numero_documento),public.mv_norm_key(cliente),public.mv_norm_key(sede),
        public.mv_norm_key(codigo_pedido),public.mv_norm_key(ticket),public.mv_norm_key(codigo_liquidacion),
        public.mv_norm_key(tipo_atencion),public.mv_norm_key(tipo_partida),public.mv_norm_key(tipo_partida_alterna)
      )) k,
      count(*) c
    from scope
    group by 1
    having count(*)>1
  )
  select
    count(*) filter(where estado='FINALIZADA'),
    coalesce(sum(c-1),0)
  into v_finalizadas,v_duplicados
  from scope
  left join dup on false;

  -- El SELECT anterior no puede combinar agregados de scope y dup directamente.
  select count(*) into v_finalizadas
  from (
    select 1
    from public.migration_sync_staging s
    where s.run_id=p_run_id
      and upper(trim(coalesce(s.row_data->>'estado','')))='FINALIZADA'
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  ) q;

  with scope as (
    select
      case when coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           then (s.row_data->>'fecha')::date else null end fecha,
      trim(coalesce(s.row_data->>'cuadrilla','')) cuadrilla,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado,
      trim(coalesce(s.row_data->>'tipoTrabajo',s.row_data->>'tipo_trabajo','')) tipo_trabajo,
      trim(coalesce(s.row_data->>'numeroDocumento',s.row_data->>'numero_documento','')) numero_documento,
      trim(coalesce(s.row_data->>'cliente','')) cliente,
      trim(coalesce(s.row_data->>'sede','')) sede,
      trim(coalesce(s.row_data->>'codigoPedido',s.row_data->>'codigo_pedido','')) codigo_pedido,
      trim(coalesce(s.row_data->>'ticket','')) ticket,
      trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')) codigo_liquidacion,
      trim(coalesce(s.row_data->>'tipoAtencion',s.row_data->>'tipo_atencion','')) tipo_atencion,
      trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) tipo_partida,
      trim(coalesce(s.row_data->>'tipoPartidaAlterna',s.row_data->>'tipo_partida_alterna','')) tipo_partida_alterna
    from public.migration_sync_staging s
    where s.run_id=p_run_id
  ), d as (
    select count(*) c
    from scope
    where fecha is not null and to_char(fecha,'YYYY-MM')=v_periodo and fecha<=v_corte
    group by md5(concat_ws('|',
      fecha::text,public.mv_norm_key(cuadrilla),estado,public.mv_norm_key(tipo_trabajo),
      public.mv_norm_key(numero_documento),public.mv_norm_key(cliente),public.mv_norm_key(sede),
      public.mv_norm_key(codigo_pedido),public.mv_norm_key(ticket),public.mv_norm_key(codigo_liquidacion),
      public.mv_norm_key(tipo_atencion),public.mv_norm_key(tipo_partida),public.mv_norm_key(tipo_partida_alterna)
    ))
    having count(*)>1
  )
  select coalesce(sum(c-1),0)::int into v_duplicados from d;

  with scope as (
    select distinct trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')) tipo_partida
    from public.migration_sync_staging s
    where s.run_id=p_run_id
      and upper(trim(coalesce(s.row_data->>'estado','')))='FINALIZADA'
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  )
  select coalesce(jsonb_agg(tipo_partida order by tipo_partida),'[]'::jsonb)
  into v_partidas
  from scope x
  where coalesce(trim(tipo_partida),'')=''
     or not exists(
       select 1
       from public.catalogo_partidas_migracion c
       where public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(x.tipo_partida)
         and upper(trim(coalesce(c.estado_tarifa,'ACTIVO')))='ACTIVO'
     );

  with scope as (
    select distinct trim(coalesce(s.row_data->>'cuadrilla','')) cuadrilla
    from public.migration_sync_staging s
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  )
  select coalesce(jsonb_agg(cuadrilla order by cuadrilla),'[]'::jsonb)
  into v_cuadrillas
  from scope x
  where coalesce(trim(cuadrilla),'')=''
     or not exists(
       select 1 from public.app_users u
       where upper(trim(coalesce(u.estado,'')))='ACTIVO'
         and upper(trim(coalesce(u.perfil,'')))='TECNICO'
         and public.mv_norm_key(u.cuadrilla)=public.mv_norm_key(x.cuadrilla)
     );

  select jsonb_build_object(
    'registros',count(*),
    'finalizadas',count(*) filter(where upper(trim(estado))='FINALIZADA'),
    'canceladas',count(*) filter(where upper(trim(estado))='CANCELADA'),
    'regestiones',count(*) filter(where upper(trim(estado)) in ('REGESTION','REGESTIÓN')),
    'reprogramadas',count(*) filter(where upper(trim(estado)) in ('REPROGRAMADO','REPROGRAMADA'))
  ) into v_actual
  from public.base_operativa_legacy
  where periodo=v_periodo and fecha<=v_corte;

  with scope as (
    select
      (s.row_data->>'fecha')::date fecha,
      upper(trim(coalesce(s.row_data->>'estado',''))) estado
    from public.migration_sync_staging s
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  )
  select jsonb_build_object(
    'registros',count(*),
    'finalizadas',count(*) filter(where estado='FINALIZADA'),
    'canceladas',count(*) filter(where estado='CANCELADA'),
    'regestiones',count(*) filter(where estado in ('REGESTION','REGESTIÓN')),
    'reprogramadas',count(*) filter(where estado in ('REPROGRAMADO','REPROGRAMADA'))
  ) into v_nuevo
  from scope;

  return jsonb_build_object(
    'ok',true,
    'modulo','BASE_OPERATIVA',
    'runId',p_run_id,
    'archivo',r.source_name,
    'sourceRows',r.source_rows,
    'stagedRows',v_staged,
    'periodo',v_periodo,
    'corte',to_char(v_corte,'YYYY-MM-DD'),
    'periodoProtegido',coalesce(v_protegido,false),
    'invalidos',v_invalidos,
    'finalizadasPeriodo',v_finalizadas,
    'duplicadosExactos',v_duplicados,
    'partidasNoEncontradas',v_partidas,
    'cuadrillasNoEncontradas',v_cuadrillas,
    'actual',v_actual,
    'nuevo',v_nuevo,
    'puedeAplicar',
      jsonb_array_length(v_partidas)=0
      and jsonb_array_length(v_cuadrillas)=0
      and v_invalidos=0,
    'actor',p_actor,
    'mensaje','Previsualización completada. No se modificó información operativa.'
  );
end $$;

revoke all on function public.mv_base_operativa_preview_staging(uuid,text) from public,anon,authenticated;
grant execute on function public.mv_base_operativa_preview_staging(uuid,text) to service_role;

insert into public.migration_live_source_control(
  modulo,legacy_sheet,postgres_target,source_mode,legacy_writes_continue,requires_final_resync,
  last_audit_at,sheet_rows,postgres_rows,content_match,audit_scope,status,notes,updated_at
)
values(
  'BASE_OPERATIVA','BASE_OPERATIVA_HISTORICA',
  'base_operativa_legacy + migration_sync_staging + mv_base_operativa_preview_staging',
  'SHEET_LIVE_SNAPSHOT',true,true,now(),4144,
  (select count(*) from public.base_operativa_legacy),true,
  'CONTEO_COMPLETO + MUESTRA_EXTREMOS','LIVE_VALIDAR',
  'Base histórica alineada 4144/4144. Se habilita staging/previsualización PostgreSQL para nuevas cargas. La aplicación/reconstrucción final aún no se habilita.',
  now()
)
on conflict(modulo) do update set
  legacy_sheet=excluded.legacy_sheet,
  postgres_target=excluded.postgres_target,
  source_mode=excluded.source_mode,
  legacy_writes_continue=excluded.legacy_writes_continue,
  requires_final_resync=excluded.requires_final_resync,
  last_audit_at=excluded.last_audit_at,
  sheet_rows=excluded.sheet_rows,
  postgres_rows=excluded.postgres_rows,
  content_match=excluded.content_match,
  audit_scope=excluded.audit_scope,
  status=excluded.status,
  notes=excluded.notes,
  updated_at=excluded.updated_at;
