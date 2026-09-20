-- 127_base_operativa_versioned_apply.sql
-- 20/09/2026
-- APPLY versionado de Base Operativa SOLO en capa de migración.
-- No toca base_operativa_legacy ni ordenes ni publicaciones productivas.

create table if not exists public.base_operativa_migracion (
  run_id uuid not null references public.migration_sync_runs(id) on delete restrict,
  source_row integer not null,
  clave_registro text,
  periodo text not null,
  fecha date not null,
  cuadrilla text,
  estado text,
  tipo_trabajo text,
  numero_documento text,
  cliente text,
  sede text,
  codigo_pedido text,
  ticket text,
  codigo_liquidacion text,
  tipo_atencion text,
  tipo_partida text,
  tipo_partida_alterna text,
  archivo_carga text,
  usuario_carga text,
  fecha_carga timestamptz not null default now(),
  row_hash text,
  primary key(run_id,source_row)
);

create index if not exists idx_base_operativa_migracion_periodo
  on public.base_operativa_migracion(periodo);
create index if not exists idx_base_operativa_migracion_liq
  on public.base_operativa_migracion((public.mv_norm_key(codigo_liquidacion)));
create index if not exists idx_base_operativa_migracion_pedido
  on public.base_operativa_migracion((public.mv_norm_key(codigo_pedido)));

create table if not exists public.base_operativa_migracion_activa (
  periodo text primary key,
  run_id uuid not null references public.migration_sync_runs(id) on delete restrict,
  previous_run_id uuid references public.migration_sync_runs(id) on delete restrict,
  activated_by text not null,
  activated_at timestamptz not null default now()
);

create table if not exists public.base_operativa_migracion_historial (
  id bigint generated always as identity primary key,
  periodo text not null,
  run_id uuid,
  previous_run_id uuid,
  accion text not null,
  actor text not null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.base_operativa_migracion enable row level security;
alter table public.base_operativa_migracion_activa enable row level security;
alter table public.base_operativa_migracion_historial enable row level security;

revoke all on public.base_operativa_migracion from anon,authenticated;
revoke all on public.base_operativa_migracion_activa from anon,authenticated;
revoke all on public.base_operativa_migracion_historial from anon,authenticated;

grant select,insert,update,delete on public.base_operativa_migracion to service_role;
grant select,insert,update,delete on public.base_operativa_migracion_activa to service_role;
grant select,insert on public.base_operativa_migracion_historial to service_role;
grant usage,select on sequence public.base_operativa_migracion_historial_id_seq to service_role;

create or replace view public.mv_base_operativa_migracion_activa
with (security_invoker=true) as
select m.*
from public.base_operativa_migracion m
join public.base_operativa_migracion_activa a
  on a.periodo=m.periodo and a.run_id=m.run_id;

create or replace view public.mv_base_operativa_unificada_pilot
with (security_invoker=true) as
with legacy_protegido as (
  select
    null::uuid run_id,
    b.source_row,
    b.clave_registro,
    b.periodo,
    b.fecha,
    b.cuadrilla,
    b.estado,
    b.tipo_trabajo,
    b.numero_documento,
    b.cliente,
    b.sede,
    b.codigo_pedido,
    b.ticket,
    b.codigo_liquidacion,
    b.tipo_atencion,
    b.tipo_partida,
    b.tipo_partida_alterna,
    b.archivo_ultima_carga as archivo_carga,
    b.usuario_ultima_carga as usuario_carga,
    b.imported_at as fecha_carga,
    null::text row_hash,
    'LEGACY_PROTEGIDO'::text origen
  from public.base_operativa_legacy b
  join public.produccion_periodos p
    on p.periodo=b.periodo and p.protegido
), migracion_activa as (
  select
    m.run_id,m.source_row,m.clave_registro,m.periodo,m.fecha,m.cuadrilla,m.estado,
    m.tipo_trabajo,m.numero_documento,m.cliente,m.sede,m.codigo_pedido,m.ticket,
    m.codigo_liquidacion,m.tipo_atencion,m.tipo_partida,m.tipo_partida_alterna,
    m.archivo_carga,m.usuario_carga,m.fecha_carga,m.row_hash,
    'MIGRACION_ACTIVA'::text origen
  from public.mv_base_operativa_migracion_activa m
  join public.produccion_periodos p
    on p.periodo=m.periodo and not p.protegido
), legacy_fallback_activo as (
  select
    null::uuid run_id,
    b.source_row,
    b.clave_registro,
    b.periodo,
    b.fecha,
    b.cuadrilla,
    b.estado,
    b.tipo_trabajo,
    b.numero_documento,
    b.cliente,
    b.sede,
    b.codigo_pedido,
    b.ticket,
    b.codigo_liquidacion,
    b.tipo_atencion,
    b.tipo_partida,
    b.tipo_partida_alterna,
    b.archivo_ultima_carga as archivo_carga,
    b.usuario_ultima_carga as usuario_carga,
    b.imported_at as fecha_carga,
    null::text row_hash,
    'LEGACY_FALLBACK_ACTIVO'::text origen
  from public.base_operativa_legacy b
  join public.produccion_periodos p
    on p.periodo=b.periodo and not p.protegido
  where not exists (
    select 1
    from public.base_operativa_migracion_activa a
    where a.periodo=b.periodo
  )
)
select * from legacy_protegido
union all
select * from migracion_activa
union all
select * from legacy_fallback_activo;

revoke all on public.mv_base_operativa_migracion_activa from anon,authenticated;
revoke all on public.mv_base_operativa_unificada_pilot from anon,authenticated;
grant select on public.mv_base_operativa_migracion_activa to service_role;
grant select on public.mv_base_operativa_unificada_pilot to service_role;

create or replace function public.mv_base_operativa_apply_staging(
  p_run_id uuid,
  p_actor text,
  p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  v_preview jsonb;
  v_recon jsonb;
  v_periodo text;
  v_corte date;
  v_previous uuid;
  v_inserted int:=0;
  v_expected int:=0;
  v_protegido boolean:=false;
begin
  if coalesce(trim(p_confirmacion),'') <> 'APLICAR_BASE_OPERATIVA_MIGRACION' then
    raise exception 'Confirmación explícita inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_BASE_OPERATIVA_APPLY'));

  select * into r
  from public.migration_sync_runs
  where id=p_run_id and upper(trim(modulo))='BASE_OPERATIVA'
  for update;

  if not found then raise exception 'Carga Base Operativa no encontrada'; end if;
  if r.status not in ('STAGED','VALIDATED') then
    raise exception 'La carga no puede aplicarse en estado %',r.status;
  end if;
  if r.created_by is distinct from p_actor then
    raise exception 'La carga pertenece a otro usuario';
  end if;
  if r.source_rows is null or r.source_rows<=0 or r.staged_rows is distinct from r.source_rows then
    raise exception 'La carga no está completa';
  end if;

  v_preview:=public.mv_base_operativa_preview_staging(p_run_id,p_actor);
  v_recon:=public.mv_base_operativa_reconcile_staging(p_run_id,p_actor);
  v_periodo:=v_preview->>'periodo';
  v_corte:=(v_preview->>'corte')::date;

  select protegido into v_protegido
  from public.produccion_periodos
  where periodo=v_periodo;

  if coalesce(v_protegido,false) then
    raise exception 'El período % está protegido',v_periodo;
  end if;

  if coalesce((v_preview->>'invalidos')::int,0)<>0 then
    raise exception 'Hay filas inválidas';
  end if;
  if jsonb_array_length(coalesce(v_preview->'partidasNoEncontradas','[]'::jsonb))<>0 then
    raise exception 'Hay partidas sin catálogo';
  end if;
  if jsonb_array_length(coalesce(v_preview->'cuadrillasNoEncontradas','[]'::jsonb))<>0 then
    raise exception 'Hay cuadrillas no reconocidas';
  end if;
  if coalesce((v_preview->>'duplicadosExactos')::int,0)<>0 then
    raise exception 'Hay duplicados exactos pendientes de resolver';
  end if;

  -- Para activar una Base Operativa en el motor migrado exigimos cobertura completa.
  if coalesce((v_recon#>>'{cobertura,sinOrden}')::int,0)<>0 then
    raise exception 'Hay órdenes de la Base Operativa no vinculadas a PostgreSQL';
  end if;
  if coalesce((v_recon#>>'{cobertura,porcentaje}')::numeric,0)<>100 then
    raise exception 'La cobertura de órdenes no es 100%%';
  end if;

  select run_id into v_previous
  from public.base_operativa_migracion_activa
  where periodo=v_periodo
  for update;

  delete from public.base_operativa_migracion
  where run_id=p_run_id;

  with src as (
    select
      s.source_row,
      s.row_hash,
      s.row_data,
      (s.row_data->>'fecha')::date fecha
    from public.migration_sync_staging s
    where s.run_id=p_run_id
      and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
      and (s.row_data->>'fecha')::date<=v_corte
  )
  insert into public.base_operativa_migracion(
    run_id,source_row,clave_registro,periodo,fecha,cuadrilla,estado,tipo_trabajo,
    numero_documento,cliente,sede,codigo_pedido,ticket,codigo_liquidacion,
    tipo_atencion,tipo_partida,tipo_partida_alterna,archivo_carga,usuario_carga,row_hash
  )
  select
    p_run_id,
    s.source_row,
    'LIQ|'||trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')),
    v_periodo,
    s.fecha,
    trim(coalesce(s.row_data->>'cuadrilla','')),
    trim(coalesce(s.row_data->>'estado','')),
    trim(coalesce(s.row_data->>'tipoTrabajo',s.row_data->>'tipo_trabajo','')),
    trim(coalesce(s.row_data->>'numeroDocumento',s.row_data->>'numero_documento','')),
    trim(coalesce(s.row_data->>'cliente','')),
    trim(coalesce(s.row_data->>'sede','')),
    trim(coalesce(s.row_data->>'codigoPedido',s.row_data->>'codigo_pedido','')),
    trim(coalesce(s.row_data->>'ticket','')),
    trim(coalesce(s.row_data->>'codigoLiquidacion',s.row_data->>'codigo_liquidacion','')),
    trim(coalesce(s.row_data->>'tipoAtencion',s.row_data->>'tipo_atencion','')),
    trim(coalesce(s.row_data->>'tipoPartida',s.row_data->>'tipo_partida','')),
    trim(coalesce(s.row_data->>'tipoPartidaAlterna',s.row_data->>'tipo_partida_alterna','')),
    r.source_name,
    p_actor,
    s.row_hash
  from src s;

  get diagnostics v_inserted=row_count;

  select count(*) into v_expected
  from public.migration_sync_staging s
  where s.run_id=p_run_id
    and coalesce(s.row_data->>'fecha','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    and to_char((s.row_data->>'fecha')::date,'YYYY-MM')=v_periodo
    and (s.row_data->>'fecha')::date<=v_corte;

  if v_inserted<>v_expected or v_inserted<=0 then
    raise exception 'Inserción incompleta: esperadas %, insertadas %',v_expected,v_inserted;
  end if;

  insert into public.base_operativa_migracion_activa(
    periodo,run_id,previous_run_id,activated_by,activated_at
  ) values (
    v_periodo,p_run_id,v_previous,p_actor,now()
  )
  on conflict(periodo) do update set
    previous_run_id=public.base_operativa_migracion_activa.run_id,
    run_id=excluded.run_id,
    activated_by=excluded.activated_by,
    activated_at=excluded.activated_at;

  insert into public.base_operativa_migracion_historial(
    periodo,run_id,previous_run_id,accion,actor,detalle
  ) values (
    v_periodo,p_run_id,v_previous,'APPLY',p_actor,
    jsonb_build_object(
      'archivo',r.source_name,
      'corte',to_char(v_corte,'YYYY-MM-DD'),
      'filas',v_inserted,
      'preview',v_preview,
      'conciliacion',v_recon
    )
  );

  update public.migration_sync_runs
  set status='APPLIED',
      applied_rows=v_inserted,
      applied_at=now(),
      notes='Base Operativa aplicada en capa versionada de migración. No modifica legacy ni ordenes.'
  where id=p_run_id;

  update public.migration_live_source_control
  set last_audit_at=now(),
      status='LIVE_VALIDAR',
      requires_final_resync=true,
      notes='Base Operativa histórica 4144/4144 protegida. Periodo activo aplicado solo en capa versionada de migración; dependencias productivas aún no conmutadas.',
      updated_at=now()
  where modulo='BASE_OPERATIVA';

  return jsonb_build_object(
    'ok',true,
    'modulo','BASE_OPERATIVA',
    'accion','APPLY_MIGRACION',
    'runId',p_run_id,
    'periodo',v_periodo,
    'corte',to_char(v_corte,'YYYY-MM-DD'),
    'filasAplicadas',v_inserted,
    'runAnterior',v_previous,
    'rollbackDisponible',true,
    'impactoProductivo',false,
    'mensaje','Base Operativa aplicada en capa versionada de migración. Producción legacy y ordenes no fueron modificadas.'
  );
end $$;

create or replace function public.mv_base_operativa_rollback_migracion(
  p_periodo text,
  p_actor text,
  p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  a public.base_operativa_migracion_activa%rowtype;
  v_target uuid;
begin
  if coalesce(trim(p_confirmacion),'') <> 'ROLLBACK_BASE_OPERATIVA_MIGRACION' then
    raise exception 'Confirmación explícita inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_BASE_OPERATIVA_APPLY'));

  select * into a
  from public.base_operativa_migracion_activa
  where periodo=p_periodo
  for update;

  if not found then
    raise exception 'No existe Base Operativa migrada activa para %',p_periodo;
  end if;

  if exists(
    select 1 from public.produccion_periodos
    where periodo=p_periodo and protegido
  ) then
    raise exception 'El período % está protegido',p_periodo;
  end if;

  v_target:=a.previous_run_id;

  insert into public.base_operativa_migracion_historial(
    periodo,run_id,previous_run_id,accion,actor,detalle
  ) values (
    p_periodo,a.run_id,v_target,'ROLLBACK',p_actor,
    jsonb_build_object('runDesactivado',a.run_id,'runRestaurado',v_target)
  );

  if v_target is null then
    delete from public.base_operativa_migracion_activa
    where periodo=p_periodo;
  else
    update public.base_operativa_migracion_activa
    set run_id=v_target,
        previous_run_id=null,
        activated_by=p_actor,
        activated_at=now()
    where periodo=p_periodo;
  end if;

  return jsonb_build_object(
    'ok',true,
    'modulo','BASE_OPERATIVA',
    'accion','ROLLBACK_MIGRACION',
    'periodo',p_periodo,
    'runDesactivado',a.run_id,
    'runRestaurado',v_target,
    'fallbackLegacy',v_target is null,
    'impactoProductivo',false,
    'mensaje','Rollback de la capa migrada completado. Producción legacy y ordenes no fueron modificadas.'
  );
end $$;

revoke all on function public.mv_base_operativa_apply_staging(uuid,text,text)
from public,anon,authenticated;
revoke all on function public.mv_base_operativa_rollback_migracion(text,text,text)
from public,anon,authenticated;
grant execute on function public.mv_base_operativa_apply_staging(uuid,text,text) to service_role;
grant execute on function public.mv_base_operativa_rollback_migracion(text,text,text) to service_role;
