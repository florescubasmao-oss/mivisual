-- 133_sync_mapa_cto_safe.sql
-- Resync seguro de MAPA_OPERATIVO y CATALOGO_CTO con preview, backup y rollback.

create table if not exists public.migration_sync_apply_backup(
  run_id uuid not null references public.migration_sync_runs(id) on delete cascade,
  modulo text not null,
  source_key text not null,
  existed_before boolean not null,
  row_before jsonb,
  created_at timestamptz not null default now(),
  primary key(run_id,modulo,source_key)
);
alter table public.migration_sync_apply_backup enable row level security;
revoke all on public.migration_sync_apply_backup from anon,authenticated;
grant select,insert,delete on public.migration_sync_apply_backup to service_role;

create or replace view public.mv_mapa_grupo_trabajo_ref
with (security_invoker=true) as
with g as (
  select public.mv_norm_key(tipo_trabajo) tipo_key,
         nullif(trim(grupo_trabajo),'') grupo_trabajo,
         count(*) casos
  from public.ordenes
  where nullif(public.mv_norm_key(tipo_trabajo),'') is not null
    and nullif(trim(coalesce(grupo_trabajo,'')),'') is not null
  group by 1,2
), r as (
  select *,row_number() over(partition by tipo_key order by casos desc,grupo_trabajo) rn
  from g
)
select tipo_key,grupo_trabajo,casos
from r where rn=1;

revoke all on public.mv_mapa_grupo_trabajo_ref from anon,authenticated;
grant select on public.mv_mapa_grupo_trabajo_ref to service_role;

create or replace function public.mv_mapa_grupo_trabajo(p_tipo text)
returns text
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce(
    (
      select r.grupo_trabajo
      from public.mv_mapa_grupo_trabajo_ref r
      where r.tipo_key=public.mv_norm_key(p_tipo)
      limit 1
    ),
    case
      when public.mv_norm_key(p_tipo) like 'INSTALACION%' then 'INSTALACIONES'
      when public.mv_norm_key(p_tipo) like 'TRASLADO%' then 'TRASLADOS'
      when public.mv_norm_key(p_tipo) in ('GARANTIA','REITERADA') then 'VTR Y GAR'
      when public.mv_norm_key(p_tipo) like '%LOSROJO%'
        or public.mv_norm_key(p_tipo) like 'RECABLEADO%' then 'RECABLEADOS - VISITA TECNICA'
      when public.mv_norm_key(p_tipo) like 'DESCARTE%'
        or public.mv_norm_key(p_tipo) like 'MEJORATECNOLOGICA%' then 'DESCARTES Y MEJORAS TECNOLOGICAS'
      when public.mv_norm_key(p_tipo) like '%MESH%'
        or public.mv_norm_key(p_tipo) like '%WINBOX%'
        or public.mv_norm_key(p_tipo) like 'CAMBIODEONT%'
        or public.mv_norm_key(p_tipo) like 'PENDIENTEDEENTREGA%' then 'POSTVENTA / EQUIPOS ADICIONALES'
      when public.mv_norm_key(p_tipo) like 'ASISTENCIA%'
        or public.mv_norm_key(p_tipo) like 'DEGRADACION%'
        or public.mv_norm_key(p_tipo)='PATCHCORD'
        or public.mv_norm_key(p_tipo) like 'REUBICACION%'
        or public.mv_norm_key(p_tipo) like 'PROBLEMASESTETICOS%' then 'ULTIMA MILLA / OTRAS ATENCIONES'
      else null
    end
  );
$$;
revoke all on function public.mv_mapa_grupo_trabajo(text) from public,anon,authenticated;
grant execute on function public.mv_mapa_grupo_trabajo(text) to service_role;

create or replace function public.mv_sync_preview_mapa(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  v_invalid int:=0; v_dup int:=0; v_existing int:=0; v_new int:=0;
  v_active int:=0; v_protected int:=0; v_new_protected int:=0; v_unknown_group int:=0;
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
           to_char(s.fecha_solicitud,'YYYY-MM') periodo
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
    count(*) filter(where not protegido and public.mv_mapa_grupo_trabajo(tipo_trabajo) is null)
  into v_existing,v_new,v_active,v_protected,v_new_protected,v_unknown_group
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
    'periodos',v_periods,
    'puedeAplicar',v_invalid=0 and v_dup=0 and v_new_protected=0
  );
end $$;

create or replace function public.mv_sync_preview_cto(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  v_invalid int:=0;v_dup int:=0;v_existing int:=0;v_new int:=0;
begin
  select * into r from public.migration_sync_runs where id=p_run_id;
  if not found then raise exception 'Run no existe'; end if;
  if r.modulo<>'CATALOGO_CTO' then raise exception 'Run pertenece a otro módulo'; end if;
  if r.status not in ('STAGED','VALIDATED') then raise exception 'Run no está listo para preview'; end if;
  if r.source_rows<>r.staged_rows then raise exception 'Staging incompleto'; end if;

  select count(*) into v_invalid
  from public.migration_sync_staging s
  where s.run_id=p_run_id
    and nullif(trim(coalesce(s.row_data->>'codigo_cto','')),'') is null;

  with d as (
    select trim(row_data->>'codigo_cto') codigo,count(*) c
    from public.migration_sync_staging where run_id=p_run_id
    group by 1 having count(*)>1
  ) select coalesce(sum(c-1),0)::int into v_dup from d;

  with s as (
    select trim(row_data->>'codigo_cto') codigo
    from public.migration_sync_staging where run_id=p_run_id
  )
  select count(*) filter(where c.codigo_cto is not null),
         count(*) filter(where c.codigo_cto is null)
  into v_existing,v_new
  from s left join public.catalogo_cto c on c.codigo_cto=s.codigo;

  return jsonb_build_object(
    'ok',true,'modulo','CATALOGO_CTO','runId',p_run_id,
    'sourceRows',r.source_rows,'stagedRows',r.staged_rows,
    'invalidos',v_invalid,'duplicados',v_dup,
    'existentes',v_existing,'nuevas',v_new,
    'puedeAplicar',v_invalid=0 and v_dup=0
  );
end $$;

create or replace function public.mv_sync_apply_mapa(
  p_run_id uuid,p_actor text,p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;
  p jsonb;
  v_max_id bigint;
  v_applied int:=0;v_total int:=0;v_new int:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_MAPA_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_MAPA_SYNC'));
  select * into r from public.migration_sync_runs where id=p_run_id for update;
  if not found or r.modulo<>'MAPA_OPERATIVO' then raise exception 'Run MAPA inválido'; end if;
  if r.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED'; end if;
  p:=public.mv_sync_preview_mapa(p_run_id);
  if not coalesce((p->>'puedeAplicar')::boolean,false) then raise exception 'Preview MAPA bloqueado: %',p; end if;

  delete from public.migration_sync_apply_backup where run_id=p_run_id and modulo='MAPA_OPERATIVO';

  insert into public.migration_sync_apply_backup(run_id,modulo,source_key,existed_before,row_before)
  select p_run_id,'MAPA_OPERATIVO',s.orden_id,(o.orden_id is not null),
         case when o.orden_id is not null then to_jsonb(o) else null end
  from (
    select trim(row_data->>'orden_id') orden_id,(row_data->>'fecha_solicitud')::date fecha_solicitud
    from public.migration_sync_staging
    where run_id=p_run_id
      and coalesce(row_data->>'fecha_solicitud','') ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
  ) s
  left join public.ordenes o on o.orden_id=s.orden_id
  left join public.produccion_periodos pp on pp.periodo=to_char(s.fecha_solicitud,'YYYY-MM')
  where not coalesce(pp.protegido,false);

  select coalesce(max(id),0) into v_max_id from public.ordenes;

  with src0 as (
    select s.source_row,s.row_data,
      trim(s.row_data->>'orden_id') orden_id,
      (s.row_data->>'fecha_solicitud')::date fecha_solicitud
    from public.migration_sync_staging s
    where s.run_id=p_run_id
  ), src1 as (
    select x.*,o.id existing_id,
      sum(case when o.id is null then 1 else 0 end) over(order by x.source_row rows unbounded preceding) new_rank
    from src0 x
    left join public.ordenes o on o.orden_id=x.orden_id
    left join public.produccion_periodos pp on pp.periodo=to_char(x.fecha_solicitud,'YYYY-MM')
    where not coalesce(pp.protegido,false)
  )
  insert into public.ordenes(
    id,orden_id,tipo_trabajo,grupo_trabajo,fecha_solicitud,hora_solicitud,cliente,tipo,producto_origen,
    cuadrilla,estado,direccion,direccion_adicional,fecha_ultimo_estado,producto_servicio,sede,codigo_cliente,
    numero_documento,telefono_movil,telefono_fijo,fecha_fin_visita,fecha_inicio_visita,motivo_cancelacion,
    motivo_finalizacion,motivo_anulacion,latitud,longitud,detalle,fecha_importacion,usuario_importacion,
    cto_1,coordenada_cto_1,cto_2,coordenada_cto_2,cto_3,coordenada_cto_3,cto,puerto,codigo_seguimiento,
    orden_id_norm,codigo_cliente_norm,numero_documento_norm,updated_at
  )
  select
    coalesce(existing_id,v_max_id+new_rank),orden_id,
    nullif(trim(row_data->>'tipo_trabajo'),''),
    public.mv_mapa_grupo_trabajo(row_data->>'tipo_trabajo'),
    fecha_solicitud,nullif(row_data->>'hora_solicitud','')::time,
    nullif(trim(row_data->>'cliente'),''),nullif(trim(row_data->>'tipo'),''),
    nullif(trim(row_data->>'producto_origen'),''),nullif(trim(row_data->>'cuadrilla'),''),
    nullif(trim(row_data->>'estado'),''),nullif(trim(row_data->>'direccion'),''),
    nullif(trim(row_data->>'direccion_adicional'),''),
    nullif(row_data->>'fecha_ultimo_estado','')::timestamp,
    nullif(trim(row_data->>'producto_servicio'),''),
    nullif(upper(trim(row_data->>'sede')),''),
    nullif(trim(row_data->>'codigo_cliente'),''),
    nullif(trim(row_data->>'numero_documento'),''),
    nullif(trim(row_data->>'telefono_movil'),''),
    nullif(trim(row_data->>'telefono_fijo'),''),
    nullif(row_data->>'fecha_fin_visita','')::timestamp,
    nullif(row_data->>'fecha_inicio_visita','')::timestamp,
    nullif(trim(row_data->>'motivo_cancelacion'),''),
    nullif(trim(row_data->>'motivo_finalizacion'),''),
    nullif(trim(row_data->>'motivo_anulacion'),''),
    nullif(row_data->>'latitud','')::double precision,
    nullif(row_data->>'longitud','')::double precision,
    nullif(trim(row_data->>'detalle'),''),
    nullif(row_data->>'fecha_importacion','')::timestamp,
    nullif(trim(row_data->>'usuario_importacion'),''),
    nullif(trim(row_data->>'cto_1'),''),
    nullif(trim(row_data->>'coordenada_cto_1'),''),
    nullif(trim(row_data->>'cto_2'),''),
    nullif(trim(row_data->>'coordenada_cto_2'),''),
    nullif(trim(row_data->>'cto_3'),''),
    nullif(trim(row_data->>'coordenada_cto_3'),''),
    nullif(trim(row_data->>'cto'),''),
    nullif(trim(row_data->>'puerto'),''),
    nullif(trim(row_data->>'codigo_seguimiento'),''),
    public.mv_norm_key(orden_id),
    nullif(public.mv_norm_key(row_data->>'codigo_cliente'),''),
    nullif(public.mv_norm_key(row_data->>'numero_documento'),''),
    now()
  from src1
  on conflict(orden_id) do update set
    tipo_trabajo=excluded.tipo_trabajo,
    grupo_trabajo=coalesce(excluded.grupo_trabajo,public.ordenes.grupo_trabajo),
    fecha_solicitud=excluded.fecha_solicitud,hora_solicitud=excluded.hora_solicitud,
    cliente=excluded.cliente,tipo=excluded.tipo,producto_origen=excluded.producto_origen,
    cuadrilla=excluded.cuadrilla,estado=excluded.estado,direccion=excluded.direccion,
    direccion_adicional=excluded.direccion_adicional,fecha_ultimo_estado=excluded.fecha_ultimo_estado,
    producto_servicio=excluded.producto_servicio,sede=excluded.sede,codigo_cliente=excluded.codigo_cliente,
    numero_documento=excluded.numero_documento,telefono_movil=excluded.telefono_movil,
    telefono_fijo=excluded.telefono_fijo,fecha_fin_visita=excluded.fecha_fin_visita,
    fecha_inicio_visita=excluded.fecha_inicio_visita,motivo_cancelacion=excluded.motivo_cancelacion,
    motivo_finalizacion=excluded.motivo_finalizacion,motivo_anulacion=excluded.motivo_anulacion,
    latitud=excluded.latitud,longitud=excluded.longitud,detalle=excluded.detalle,
    fecha_importacion=excluded.fecha_importacion,usuario_importacion=excluded.usuario_importacion,
    cto_1=excluded.cto_1,coordenada_cto_1=excluded.coordenada_cto_1,
    cto_2=excluded.cto_2,coordenada_cto_2=excluded.coordenada_cto_2,
    cto_3=excluded.cto_3,coordenada_cto_3=excluded.coordenada_cto_3,
    cto=excluded.cto,puerto=excluded.puerto,codigo_seguimiento=excluded.codigo_seguimiento,
    orden_id_norm=excluded.orden_id_norm,codigo_cliente_norm=excluded.codigo_cliente_norm,
    numero_documento_norm=excluded.numero_documento_norm,updated_at=now();

  get diagnostics v_applied=row_count;
  select count(*) into v_total from public.ordenes;
  v_new:=coalesce((p->>'nuevas')::int,0);

  update public.migration_sync_runs set status='APPLIED',applied_rows=v_applied,applied_at=now(),
    notes=concat_ws(' | ',notes,'MAPA aplicado solo a periodos no protegidos por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;

  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync MAPA aplicado a periodos no protegidos; PostgreSQL='||v_total||
            '. Legacy sigue activo, requiere delta final antes de cutover.',updated_at=now()
  where modulo='MAPA_OPERATIVO';

  return jsonb_build_object('ok',true,'modulo','MAPA_OPERATIVO','run_id',p_run_id,
    'applied_rows',v_applied,'new_rows_source',v_new,'postgres_rows',v_total,'backup',true);
end $$;

create or replace function public.mv_sync_apply_cto(
  p_run_id uuid,p_actor text,p_confirmacion text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.migration_sync_runs%rowtype;p jsonb;v_max_id bigint;v_applied int:=0;v_total int:=0;
begin
  if coalesce(p_confirmacion,'')<>'APLICAR_CTO_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_CTO_SYNC'));
  select * into r from public.migration_sync_runs where id=p_run_id for update;
  if not found or r.modulo<>'CATALOGO_CTO' then raise exception 'Run CTO inválido'; end if;
  if r.status<>'VALIDATED' then raise exception 'Run debe estar VALIDATED'; end if;
  p:=public.mv_sync_preview_cto(p_run_id);
  if not coalesce((p->>'puedeAplicar')::boolean,false) then raise exception 'Preview CTO bloqueado: %',p; end if;

  delete from public.migration_sync_apply_backup where run_id=p_run_id and modulo='CATALOGO_CTO';
  insert into public.migration_sync_apply_backup(run_id,modulo,source_key,existed_before,row_before)
  select p_run_id,'CATALOGO_CTO',s.codigo,(c.codigo_cto is not null),
         case when c.codigo_cto is not null then to_jsonb(c) else null end
  from (
    select trim(row_data->>'codigo_cto') codigo
    from public.migration_sync_staging where run_id=p_run_id
  ) s left join public.catalogo_cto c on c.codigo_cto=s.codigo;

  select coalesce(max(id),0) into v_max_id from public.catalogo_cto;
  with src0 as (
    select source_row,row_data,trim(row_data->>'codigo_cto') codigo
    from public.migration_sync_staging where run_id=p_run_id
  ), src1 as (
    select x.*,c.id existing_id,
      sum(case when c.id is null then 1 else 0 end) over(order by x.source_row rows unbounded preceding) new_rank
    from src0 x left join public.catalogo_cto c on c.codigo_cto=x.codigo
  )
  insert into public.catalogo_cto(
    id,codigo_cto,latitud,longitud,coordenada,sede,primera_deteccion,ultima_actualizacion,
    orden_referencia,codigo_cliente,tipo_trabajo,puerto_referencia,usuario_actualizacion,
    veces_detectada,updated_at
  )
  select
    coalesce(existing_id,v_max_id+new_rank),codigo,
    nullif(row_data->>'latitud','')::double precision,
    nullif(row_data->>'longitud','')::double precision,
    nullif(trim(row_data->>'coordenada'),''),
    nullif(upper(trim(row_data->>'sede')),''),
    nullif(row_data->>'primera_deteccion','')::timestamp,
    nullif(row_data->>'ultima_actualizacion','')::timestamp,
    nullif(trim(row_data->>'orden_referencia'),''),
    nullif(trim(row_data->>'codigo_cliente'),''),
    nullif(trim(row_data->>'tipo_trabajo'),''),
    nullif(trim(row_data->>'puerto_referencia'),''),
    nullif(trim(row_data->>'usuario_actualizacion'),''),
    greatest(coalesce(nullif(row_data->>'veces_detectada','')::integer,1),1),
    now()
  from src1
  on conflict(codigo_cto) do update set
    latitud=excluded.latitud,longitud=excluded.longitud,coordenada=excluded.coordenada,
    sede=excluded.sede,primera_deteccion=excluded.primera_deteccion,
    ultima_actualizacion=excluded.ultima_actualizacion,orden_referencia=excluded.orden_referencia,
    codigo_cliente=excluded.codigo_cliente,tipo_trabajo=excluded.tipo_trabajo,
    puerto_referencia=excluded.puerto_referencia,usuario_actualizacion=excluded.usuario_actualizacion,
    veces_detectada=excluded.veces_detectada,updated_at=now();

  get diagnostics v_applied=row_count;
  select count(*) into v_total from public.catalogo_cto;

  update public.migration_sync_runs set status='APPLIED',applied_rows=v_applied,applied_at=now(),
    notes=concat_ws(' | ',notes,'CATALOGO_CTO aplicado por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id;
  update public.migration_live_source_control
  set postgres_rows=v_total,last_audit_at=now(),content_match=null,status='LIVE_VALIDAR',
      notes='Resync CATALOGO_CTO aplicado; PostgreSQL='||v_total||
            '. Legacy sigue activo, requiere delta final antes de cutover.',updated_at=now()
  where modulo='CATALOGO_CTO';

  return jsonb_build_object('ok',true,'modulo','CATALOGO_CTO','run_id',p_run_id,
    'applied_rows',v_applied,'postgres_rows',v_total,'backup',true);
end $$;

create or replace function public.mv_sync_rollback_mapa(p_run_id uuid,p_actor text,p_confirmacion text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare b record;v_restored int:=0;v_deleted int:=0;
begin
  if coalesce(p_confirmacion,'')<>'ROLLBACK_MAPA_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_MAPA_SYNC'));
  for b in select * from public.migration_sync_apply_backup where run_id=p_run_id and modulo='MAPA_OPERATIVO'
  loop
    if not b.existed_before then
      delete from public.ordenes where orden_id=b.source_key;v_deleted:=v_deleted+1;
    else
      update public.ordenes o set
        tipo_trabajo=b.row_before->>'tipo_trabajo',
        grupo_trabajo=b.row_before->>'grupo_trabajo',
        fecha_solicitud=nullif(b.row_before->>'fecha_solicitud','')::date,
        hora_solicitud=nullif(b.row_before->>'hora_solicitud','')::time,
        cliente=b.row_before->>'cliente',tipo=b.row_before->>'tipo',
        producto_origen=b.row_before->>'producto_origen',cuadrilla=b.row_before->>'cuadrilla',
        estado=b.row_before->>'estado',direccion=b.row_before->>'direccion',
        direccion_adicional=b.row_before->>'direccion_adicional',
        fecha_ultimo_estado=nullif(b.row_before->>'fecha_ultimo_estado','')::timestamp,
        producto_servicio=b.row_before->>'producto_servicio',sede=b.row_before->>'sede',
        codigo_cliente=b.row_before->>'codigo_cliente',numero_documento=b.row_before->>'numero_documento',
        telefono_movil=b.row_before->>'telefono_movil',telefono_fijo=b.row_before->>'telefono_fijo',
        fecha_fin_visita=nullif(b.row_before->>'fecha_fin_visita','')::timestamp,
        fecha_inicio_visita=nullif(b.row_before->>'fecha_inicio_visita','')::timestamp,
        motivo_cancelacion=b.row_before->>'motivo_cancelacion',
        motivo_finalizacion=b.row_before->>'motivo_finalizacion',
        motivo_anulacion=b.row_before->>'motivo_anulacion',
        latitud=nullif(b.row_before->>'latitud','')::double precision,
        longitud=nullif(b.row_before->>'longitud','')::double precision,
        detalle=b.row_before->>'detalle',
        fecha_importacion=nullif(b.row_before->>'fecha_importacion','')::timestamp,
        usuario_importacion=b.row_before->>'usuario_importacion',
        cto_1=b.row_before->>'cto_1',coordenada_cto_1=b.row_before->>'coordenada_cto_1',
        cto_2=b.row_before->>'cto_2',coordenada_cto_2=b.row_before->>'coordenada_cto_2',
        cto_3=b.row_before->>'cto_3',coordenada_cto_3=b.row_before->>'coordenada_cto_3',
        cto=b.row_before->>'cto',puerto=b.row_before->>'puerto',
        codigo_seguimiento=b.row_before->>'codigo_seguimiento',
        orden_id_norm=b.row_before->>'orden_id_norm',
        codigo_cliente_norm=b.row_before->>'codigo_cliente_norm',
        numero_documento_norm=b.row_before->>'numero_documento_norm',
        updated_at=coalesce(nullif(b.row_before->>'updated_at','')::timestamptz,now())
      where o.orden_id=b.source_key;
      v_restored:=v_restored+1;
    end if;
  end loop;
  update public.migration_sync_runs set status='ROLLED_BACK',
    notes=concat_ws(' | ',notes,'Rollback MAPA por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id and modulo='MAPA_OPERATIVO';
  return jsonb_build_object('ok',true,'modulo','MAPA_OPERATIVO','restored',v_restored,'deleted',v_deleted);
end $$;

create or replace function public.mv_sync_rollback_cto(p_run_id uuid,p_actor text,p_confirmacion text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare b record;v_restored int:=0;v_deleted int:=0;
begin
  if coalesce(p_confirmacion,'')<>'ROLLBACK_CTO_STAGING' then raise exception 'Confirmación inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('MI_VISUAL_CTO_SYNC'));
  for b in select * from public.migration_sync_apply_backup where run_id=p_run_id and modulo='CATALOGO_CTO'
  loop
    if not b.existed_before then
      delete from public.catalogo_cto where codigo_cto=b.source_key;v_deleted:=v_deleted+1;
    else
      update public.catalogo_cto c set
        latitud=nullif(b.row_before->>'latitud','')::double precision,
        longitud=nullif(b.row_before->>'longitud','')::double precision,
        coordenada=b.row_before->>'coordenada',sede=b.row_before->>'sede',
        primera_deteccion=nullif(b.row_before->>'primera_deteccion','')::timestamp,
        ultima_actualizacion=nullif(b.row_before->>'ultima_actualizacion','')::timestamp,
        orden_referencia=b.row_before->>'orden_referencia',
        codigo_cliente=b.row_before->>'codigo_cliente',
        tipo_trabajo=b.row_before->>'tipo_trabajo',
        puerto_referencia=b.row_before->>'puerto_referencia',
        usuario_actualizacion=b.row_before->>'usuario_actualizacion',
        veces_detectada=coalesce(nullif(b.row_before->>'veces_detectada','')::integer,1),
        updated_at=coalesce(nullif(b.row_before->>'updated_at','')::timestamptz,now())
      where c.codigo_cto=b.source_key;
      v_restored:=v_restored+1;
    end if;
  end loop;
  update public.migration_sync_runs set status='ROLLED_BACK',
    notes=concat_ws(' | ',notes,'Rollback CTO por '||coalesce(p_actor,'SISTEMA'))
  where id=p_run_id and modulo='CATALOGO_CTO';
  return jsonb_build_object('ok',true,'modulo','CATALOGO_CTO','restored',v_restored,'deleted',v_deleted);
end $$;

revoke all on function public.mv_sync_preview_mapa(uuid) from public,anon,authenticated;
revoke all on function public.mv_sync_preview_cto(uuid) from public,anon,authenticated;
revoke all on function public.mv_sync_apply_mapa(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mv_sync_apply_cto(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mv_sync_rollback_mapa(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mv_sync_rollback_cto(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mv_sync_preview_mapa(uuid) to service_role;
grant execute on function public.mv_sync_preview_cto(uuid) to service_role;
grant execute on function public.mv_sync_apply_mapa(uuid,text,text) to service_role;
grant execute on function public.mv_sync_apply_cto(uuid,text,text) to service_role;
grant execute on function public.mv_sync_rollback_mapa(uuid,text,text) to service_role;
grant execute on function public.mv_sync_rollback_cto(uuid,text,text) to service_role;
