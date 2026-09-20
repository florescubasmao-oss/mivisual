-- 134_sync_mapa_preview_group_guard.sql
-- Bloquea nuevas órdenes activas cuyo tipo_trabajo no tenga clasificación segura.

create or replace function public.mv_sync_preview_mapa(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  v_invalid int:=0; v_dup int:=0; v_existing int:=0; v_new int:=0;
  v_active int:=0; v_protected int:=0; v_new_protected int:=0;
  v_unknown_group int:=0; v_new_unknown_group int:=0;
  v_periods jsonb:='{}'::jsonb;
begin
  select * into r from public.migration_sync_runs where id=p_run_id;
  if not found then raise exception 'Run no existe'; end if;
  if r.modulo<>'MAPA_OPERATIVO' then raise exception 'Run pertenece a otro módulo'; end if;
  if r.status not in ('STAGED','VALIDATED') then raise exception 'Run no está listo para preview'; end if;
  if r.source_rows<>r.staged_rows then raise exception 'Staging incompleto'; end if;

  with s as (
    select source_key,row_data
    from public.migration_sync_staging where run_id=p_run_id
  )
  select count(*) into v_invalid
  from s
  where nullif(trim(coalesce(row_data->>'orden_id','')),'') is null
     or coalesce(row_data->>'fecha_solicitud','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$';

  with s as (
    select trim(row_data->>'orden_id') orden_id,count(*) c
    from public.migration_sync_staging where run_id=p_run_id
    group by 1 having count(*)>1
  ) select coalesce(sum(c-1),0)::int into v_dup from s;

  with s as (
    select
      trim(row_data->>'orden_id') orden_id,
      (row_data->>'fecha_solicitud')::date fecha_solicitud,
      trim(row_data->>'tipo_trabajo') tipo_trabajo
    from public.migration_sync_staging
    where run_id=p_run_id
      and coalesce(row_data->>'fecha_solicitud','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
  ), x as (
    select s.*,o.orden_id existing_id,
           coalesce(p.protegido,false) protegido,
           to_char(s.fecha_solicitud,'YYYY-MM') periodo,
           public.mv_mapa_grupo_trabajo(s.tipo_trabajo) grupo
    from s
    left join public.ordenes o on o.orden_id=s.orden_id
    left join public.produccion_periodos p on p.periodo=to_char(s.fecha_solicitud,'YYYY-MM')
  )
  select
    count(*) filter(where existing_id is not null),
    count(*) filter(where existing_id is null),
    count(*) filter(where not protegido),
    count(*) filter(where protegido),
    count(*) filter(where protegido and existing_id is null),
    count(*) filter(where not protegido and grupo is null),
    count(*) filter(where not protegido and existing_id is null and grupo is null)
  into v_existing,v_new,v_active,v_protected,v_new_protected,v_unknown_group,v_new_unknown_group
  from x;

  with s as (
    select to_char((row_data->>'fecha_solicitud')::date,'YYYY-MM') periodo,count(*) c
    from public.migration_sync_staging
    where run_id=p_run_id
      and coalesce(row_data->>'fecha_solicitud','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    group by 1
  )
  select coalesce(jsonb_object_agg(periodo,c),'{}'::jsonb) into v_periods from s;

  return jsonb_build_object(
    'ok',true,'modulo','MAPA_OPERATIVO','runId',p_run_id,
    'sourceRows',r.source_rows,'stagedRows',r.staged_rows,
    'invalidos',v_invalid,'duplicados',v_dup,
    'existentes',v_existing,'nuevas',v_new,
    'filasPeriodoActivo',v_active,'filasProtegidas',v_protected,
    'nuevasEnProtegidos',v_new_protected,
    'grupoSinClasificarActivo',v_unknown_group,
    'nuevasSinClasificarActivo',v_new_unknown_group,
    'periodos',v_periods,
    'puedeAplicar',v_invalid=0 and v_dup=0 and v_new_protected=0 and v_new_unknown_group=0
  );
end $$;

revoke all on function public.mv_sync_preview_mapa(uuid) from public,anon,authenticated;
grant execute on function public.mv_sync_preview_mapa(uuid) to service_role;
