
-- 105_publicador_win_v497.sql
-- Porta MI VISUAL V497 / V487.12 al piloto PostgreSQL.
-- PREVISUALIZAR -> CONFIRMACION EXPLICITA -> PUBLICACION ATOMICA.
-- Julio 2026 y anteriores protegidos. WIN/ordenes es fuente.
-- Partner no reemplaza ejecutor WIN. VTR/GAR no aporta Produccion.
-- Nuevos VTR/GAR WIN se registran PENDIENTE sin alterar decisiones legacy.

create table if not exists public.publicador_win_publicaciones (
  id uuid primary key default gen_random_uuid(),
  periodo text not null,
  version text not null default 'V497-POSTGRESQL',
  estado text not null default 'PUBLICADO',
  confirmacion text not null,
  publicado_por text not null,
  publicado_at timestamptz not null default now(),
  corte_estado timestamp without time zone,
  ultima_importacion timestamp without time zone,
  resumen jsonb not null default '{}'::jsonb,
  source_kind text not null default 'POSTGRESQL',
  created_at timestamptz not null default now(),
  constraint publicador_periodo_chk check (periodo ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  constraint publicador_estado_chk check (estado in ('PUBLICADO','SUPERSEDIDA','ANULADA'))
);

create index if not exists publicador_win_publicaciones_periodo_idx
  on public.publicador_win_publicaciones(periodo,publicado_at desc);

create table if not exists public.publicador_win_produccion_snapshot (
  publicacion_id uuid not null references public.publicador_win_publicaciones(id) on delete cascade,
  periodo text not null,
  cuadrilla text not null,
  fecha date not null,
  codigo text not null,
  cantidad integer not null,
  puntos_unitarios numeric not null default 0,
  puntos_total numeric not null default 0,
  primary key(publicacion_id,cuadrilla,fecha,codigo)
);

create table if not exists public.publicador_win_efectividad_snapshot (
  publicacion_id uuid not null references public.publicador_win_publicaciones(id) on delete cascade,
  periodo text not null,
  cuadrilla text not null,
  actualizacion timestamp without time zone,
  finalizada integer not null default 0,
  cancelada integer not null default 0,
  regestion integer not null default 0,
  reprogramado integer not null default 0,
  total_general integer not null default 0,
  efectividad numeric not null default 0,
  no_evaluables integer not null default 0,
  primary key(publicacion_id,cuadrilla)
);

create table if not exists public.publicador_win_recableado_snapshot (
  publicacion_id uuid not null references public.publicador_win_publicaciones(id) on delete cascade,
  periodo text not null,
  cuadrilla text not null,
  actualizacion timestamp without time zone,
  los_rojo_asignadas integer not null default 0,
  recableados integer not null default 0,
  porcentaje numeric not null default 0,
  primary key(publicacion_id,cuadrilla)
);

create table if not exists public.publicador_win_vtrgar_snapshot (
  publicacion_id uuid not null references public.publicador_win_publicaciones(id) on delete cascade,
  periodo text not null,
  cuadrilla text not null,
  actualizacion timestamp without time zone,
  total_finalizadas integer not null default 0,
  gar integer not null default 0,
  vtr integer not null default 0,
  total_gar_vtr integer not null default 0,
  porcentaje numeric not null default 0,
  primary key(publicacion_id,cuadrilla)
);

create table if not exists public.vtr_gar_detectados_postgresql (
  id uuid primary key default gen_random_uuid(),
  orden_id text not null unique,
  periodo text not null,
  clave text not null unique,
  fecha_incidencia date,
  tipo text not null,
  ticket text,
  numero_documento text,
  cliente text,
  codigo_pedido text,
  tipo_partida text,
  cuadrilla_ejecutora text,
  sede_ejecutora text,
  estado_calificacion text not null default 'PENDIENTE',
  cuadrilla_responsable text,
  sede_responsable text,
  calificado_por text,
  fecha_calificacion timestamp without time zone,
  observacion text,
  fecha_ultima_edicion timestamp without time zone,
  fecha_corte timestamp without time zone,
  publicacion_id uuid references public.publicador_win_publicaciones(id),
  detectado_at timestamptz not null default now(),
  source_kind text not null default 'WIN_POSTGRESQL_V497',
  constraint vtr_gar_pg_tipo_chk check (tipo in ('GAR','VTR')),
  constraint vtr_gar_pg_estado_chk check (
    estado_calificacion in ('PENDIENTE','CONFIRMADO','REASIGNADO','ANULADO','NO_ES_GAR_VTR')
  )
);

create index if not exists vtr_gar_detectados_periodo_estado_idx
  on public.vtr_gar_detectados_postgresql(periodo,estado_calificacion);

alter table public.publicador_win_publicaciones enable row level security;
alter table public.publicador_win_produccion_snapshot enable row level security;
alter table public.publicador_win_efectividad_snapshot enable row level security;
alter table public.publicador_win_recableado_snapshot enable row level security;
alter table public.publicador_win_vtrgar_snapshot enable row level security;
alter table public.vtr_gar_detectados_postgresql enable row level security;

revoke all on public.publicador_win_publicaciones from anon,authenticated;
revoke all on public.publicador_win_produccion_snapshot from anon,authenticated;
revoke all on public.publicador_win_efectividad_snapshot from anon,authenticated;
revoke all on public.publicador_win_recableado_snapshot from anon,authenticated;
revoke all on public.publicador_win_vtrgar_snapshot from anon,authenticated;
revoke all on public.vtr_gar_detectados_postgresql from anon,authenticated;

grant select,insert,update on public.publicador_win_publicaciones to service_role;
grant select,insert on public.publicador_win_produccion_snapshot to service_role;
grant select,insert on public.publicador_win_efectividad_snapshot to service_role;
grant select,insert on public.publicador_win_recableado_snapshot to service_role;
grant select,insert on public.publicador_win_vtrgar_snapshot to service_role;
grant select,insert,update on public.vtr_gar_detectados_postgresql to service_role;

create or replace view public.mv_publicador_win_ultima_v497
with (security_invoker=true) as
select distinct on (periodo)
  id,periodo,version,estado,confirmacion,publicado_por,publicado_at,
  corte_estado,ultima_importacion,resumen,source_kind
from public.publicador_win_publicaciones
where estado='PUBLICADO'
order by periodo,publicado_at desc,id desc;

create or replace view public.mv_publicador_win_produccion_actual_v497
with (security_invoker=true) as
select s.*
from public.publicador_win_produccion_snapshot s
join public.mv_publicador_win_ultima_v497 u
  on u.id=s.publicacion_id;

create or replace view public.mv_publicador_win_efectividad_actual_v497
with (security_invoker=true) as
select s.*
from public.publicador_win_efectividad_snapshot s
join public.mv_publicador_win_ultima_v497 u
  on u.id=s.publicacion_id;

create or replace view public.mv_publicador_win_recableado_actual_v497
with (security_invoker=true) as
select s.*
from public.publicador_win_recableado_snapshot s
join public.mv_publicador_win_ultima_v497 u
  on u.id=s.publicacion_id;

create or replace view public.mv_publicador_win_vtrgar_actual_v497
with (security_invoker=true) as
select s.*
from public.publicador_win_vtrgar_snapshot s
join public.mv_publicador_win_ultima_v497 u
  on u.id=s.publicacion_id;

create or replace view public.mv_vtr_gar_pendientes_v497
with (security_invoker=true) as
select
  id,orden_id,periodo,clave,fecha_incidencia,tipo,ticket,numero_documento,
  cliente,codigo_pedido,tipo_partida,cuadrilla_ejecutora,sede_ejecutora,
  estado_calificacion,cuadrilla_responsable,sede_responsable,calificado_por,
  fecha_calificacion,observacion,fecha_ultima_edicion,fecha_corte,
  publicacion_id,detectado_at,source_kind
from public.vtr_gar_detectados_postgresql
where estado_calificacion='PENDIENTE';

revoke all on public.mv_publicador_win_ultima_v497 from anon,authenticated;
revoke all on public.mv_publicador_win_produccion_actual_v497 from anon,authenticated;
revoke all on public.mv_publicador_win_efectividad_actual_v497 from anon,authenticated;
revoke all on public.mv_publicador_win_recableado_actual_v497 from anon,authenticated;
revoke all on public.mv_publicador_win_vtrgar_actual_v497 from anon,authenticated;
revoke all on public.mv_vtr_gar_pendientes_v497 from anon,authenticated;

grant select on public.mv_publicador_win_ultima_v497 to service_role;
grant select on public.mv_publicador_win_produccion_actual_v497 to service_role;
grant select on public.mv_publicador_win_efectividad_actual_v497 to service_role;
grant select on public.mv_publicador_win_recableado_actual_v497 to service_role;
grant select on public.mv_publicador_win_vtrgar_actual_v497 to service_role;
grant select on public.mv_vtr_gar_pendientes_v497 to service_role;

create or replace function public.mv_publicador_win_validar_periodo_v497(p_periodo text)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  p text:=trim(coalesce(p_periodo,''));
  protegido boolean;
begin
  if p !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then
    raise exception 'V497: periodo no válido. Use YYYY-MM.';
  end if;
  if p<'2026-08' then
    raise exception 'V497: JULIO 2026 y periodos anteriores están congelados.';
  end if;

  select pp.protegido into protegido
  from public.produccion_periodos pp
  where pp.periodo=p;

  if coalesce(protegido,false) then
    raise exception 'V497: el periodo % está protegido y no puede publicarse.',p;
  end if;

  return p;
end;
$$;

revoke execute on function public.mv_publicador_win_validar_periodo_v497(text) from public,anon,authenticated;
grant execute on function public.mv_publicador_win_validar_periodo_v497(text) to service_role;

create or replace function public.mv_publicador_win_preview_v497(p_periodo text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  p text;
  prod jsonb;
  ef jsonb;
  rec jsonb;
  vg jsonb;
  pendientes integer;
  gestion jsonb;
  corte timestamp without time zone;
  importacion timestamp without time zone;
  filas_win integer;
  ordenes_unicas integer;
  sin_partida integer;
begin
  p:=public.mv_publicador_win_validar_periodo_v497(p_periodo);

  select
    count(*)::integer,
    count(distinct o.orden_id)::integer,
    max(coalesce(o.fecha_ultimo_estado,o.fecha_solicitud::timestamp)),
    max(o.fecha_importacion)
  into filas_win,ordenes_unicas,corte,importacion
  from public.ordenes o
  where to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM')=p;

  select jsonb_build_object(
    'ordenes',count(*) filter(where m.elegible_produccion_efectiva),
    'puntos',coalesce(sum(coalesce(c.puntaje_consistente,0))
      filter(where m.elegible_produccion_efectiva),0),
    'filas',count(distinct (
      public.mv_continuidad_cuadrilla(p,m.cuadrilla),
      m.fecha_ejecucion,
      m.partida_motor
    )) filter(where m.elegible_produccion_efectiva and m.partida_motor is not null),
    'sinPartida',count(*) filter(
      where m.elegible_produccion_efectiva and nullif(trim(coalesce(m.partida_motor,'')),'') is null
    ),
    'excluidasVtrGar',count(*) filter(where m.es_gar_vtr_efectivo),
    'fuente','WIN / ordenes'
  ),
  count(*) filter(
    where m.elegible_produccion_efectiva and nullif(trim(coalesce(m.partida_motor,'')),'') is null
  )::integer
  into prod,sin_partida
  from public.mv_produccion_partida_motor_migracion_v1 m
  left join public.mv_catalogo_puntaje_codigo c
    on c.codigo=upper(trim(m.partida_motor))
  where m.periodo_solicitud=p;

  select coalesce(to_jsonb(x),'{}'::jsonb) into ef
  from (
    select
      sum(finalizada)::integer finalizadas,
      sum(cancelada)::integer canceladas,
      sum(regestion)::integer regestiones,
      sum(reprogramado)::integer reprogramadas,
      sum(total_general)::integer total_general,
      case when sum(total_general)>0
           then sum(finalizada)::numeric/sum(total_general)::numeric else 0 end efectividad,
      sum(no_evaluables)::integer no_evaluables,
      count(*)::integer cuadrillas
    from public.mv_continuidad_efectividad_v496
    where periodo=p
  ) x;

  select coalesce(to_jsonb(x),'{}'::jsonb) into rec
  from (
    select
      sum(los_rojo_asignadas)::integer los_rojo_finalizadas,
      sum(recableados)::integer recableados,
      case when sum(los_rojo_asignadas)>0
           then sum(recableados)::numeric/sum(los_rojo_asignadas)::numeric else 0 end porcentaje,
      count(*)::integer cuadrillas
    from public.mv_continuidad_recableado_v496
    where periodo=p
  ) x;

  select coalesce(to_jsonb(x),'{}'::jsonb) into vg
  from (
    select
      sum(total_finalizadas)::integer total_finalizadas,
      sum(gar)::integer gar,
      sum(vtr)::integer vtr,
      sum(total_gar_vtr)::integer total_gar_vtr,
      case when sum(total_finalizadas)>0
           then sum(total_gar_vtr)::numeric/sum(total_finalizadas)::numeric else 0 end porcentaje,
      count(*)::integer cuadrillas
    from public.mv_continuidad_vtrgar_dashboard_v496
    where periodo=p
  ) x;

  select count(*)::integer into pendientes
  from public.ordenes o
  where to_char(coalesce(o.fecha_solicitud,o.fecha_ultimo_estado::date),'YYYY-MM')=p
    and public.mv_norm_key(o.estado) in ('FINALIZADA','FINALIZADO')
    and public.mv_vtr_gar_tipo_win(o.tipo_trabajo,o.codigo_seguimiento) is not null
    and not exists (
      select 1 from public.vtr_gar_clasificacion_legacy l
      where trim(coalesce(l.codigo_liquidacion,''))=trim(o.orden_id)
    )
    and not exists (
      select 1 from public.vtr_gar_detectados_postgresql q
      where q.orden_id=o.orden_id
    );

  select jsonb_build_object(
    'legacy',jsonb_build_object(
      'pendiente',count(*) filter(where upper(trim(coalesce(estado_calificacion,'')))='PENDIENTE'),
      'confirmado',count(*) filter(where upper(trim(coalesce(estado_calificacion,'')))='CONFIRMADO'),
      'reasignado',count(*) filter(where upper(trim(coalesce(estado_calificacion,'')))='REASIGNADO'),
      'anulado',count(*) filter(where upper(trim(coalesce(estado_calificacion,'')))='ANULADO'),
      'noEsGarVtr',count(*) filter(where upper(trim(coalesce(estado_calificacion,'')))='NO_ES_GAR_VTR')
    ),
    'postgresqlPendientes',(
      select count(*) from public.vtr_gar_detectados_postgresql q
      where q.periodo=p and q.estado_calificacion='PENDIENTE'
    )
  ) into gestion
  from public.vtr_gar_clasificacion_legacy l
  where to_char(l.fecha_incidencia,'YYYY-MM')=p;

  return jsonb_build_object(
    'ok',true,
    'version','V497-POSTGRESQL-20260919',
    'accion','PREVISUALIZAR',
    'periodo',p,
    'soloPrevisualizacion',true,
    'historico',jsonb_build_object(
      'julio2026Congelado',true,
      'periodosAnterioresCongelados',true,
      'periodoMinimo','2026-08'
    ),
    'fuente','WIN / ordenes principal + Partner solo como apoyo ya validado por motor',
    'win',jsonb_build_object(
      'filasPeriodo',coalesce(filas_win,0),
      'ordenesUnicas',coalesce(ordenes_unicas,0),
      'corteEstado',corte,
      'ultimaImportacion',importacion
    ),
    'produccion',prod,
    'efectividad',ef,
    'recableado',rec,
    'vtrGar',vg || jsonb_build_object(
      'nuevosPendientesWin',coalesce(pendientes,0),
      'gestionExistente',gestion,
      'reglaMigracion','Conservar gestion existente; WIN agrega solo incidencias nuevas como PENDIENTE.'
    ),
    'puedePublicar',coalesce(sin_partida,0)=0,
    'bloqueo',case when coalesce(sin_partida,0)>0
                   then format('Producción tiene %s orden(es) sin partida confiable.',sin_partida)
                   else '' end,
    'controles',jsonb_build_object(
      'escribeProduccion',false,
      'escribeEfectividad',false,
      'escribeRecableado',false,
      'escribeVtrGar',false,
      'escribeRanking',false,
      'modificaJulio',false,
      'conservaValidacionesVtrGar',true
    )
  );
end;
$$;

revoke execute on function public.mv_publicador_win_preview_v497(text) from public,anon,authenticated;
grant execute on function public.mv_publicador_win_preview_v497(text) to service_role;

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
    o.region,'PENDIENTE',
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

-- Los nuevos pendientes WIN aparecen en el contexto GAR/VTR sin tocar el snapshot legacy.
create or replace view public.mv_vt_gar_vtr_contexto_ticket
with (security_invoker=true) as
with tickets as (
  select distinct
    to_char(b.fecha_incidencia,'YYYY-MM') as periodo,
    public.mv_vt_ticket_canon(b.ticket,b.tipo) as ticket
  from public.vtr_gar_clasificacion_legacy b
  where b.fecha_incidencia is not null
    and public.mv_vt_ticket_canon(b.ticket,b.tipo) is not null
  union
  select distinct
    q.periodo,
    public.mv_vt_ticket_canon(q.ticket,q.tipo) as ticket
  from public.vtr_gar_detectados_postgresql q
  where public.mv_vt_ticket_canon(q.ticket,q.tipo) is not null
  union
  select distinct
    v.periodo,
    public.mv_vt_ticket_canon(v.ticket_final,v.tipo_validacion) as ticket
  from public.validacion_tecnica_migracion v
  where v.periodo ~ '^20[0-9]{2}-[0-9]{2}$'
    and v.tipo_validacion in ('GAR','VTR')
    and public.mv_vt_ticket_canon(v.ticket_final,v.tipo_validacion) is not null
)
select
  t.periodo,t.ticket,
  coalesce(d.tipo,case when t.ticket like 'GAR-%' then 'GAR' else 'VTR' end) as tipo,
  coalesce(d.estado_responsabilidad,'PENDIENTE') as estado_responsabilidad,
  coalesce(w.estado_win,'POR_REVISAR') as estado_win,
  coalesce(d.estado_responsabilidad,'PENDIENTE') in ('CONFIRMADO','REASIGNADO') as es_gar_vtr_confirmado,
  coalesce(w.estado_win,'POR_REVISAR')='FINALIZADA'
    and coalesce(d.estado_responsabilidad,'PENDIENTE') in ('CONFIRMADO','REASIGNADO') as bono_habilitado,
  d.cuadrilla_responsable,d.sede_responsable,d.calificado_por,d.fecha_calificacion,
  coalesce(w.ordenes_win,0) as ordenes_win
from tickets t
left join public.mv_vt_gar_vtr_decision_ticket d
  on d.periodo=t.periodo and d.ticket=t.ticket
left join public.mv_vt_gar_vtr_estado_win_ticket w
  on w.periodo=t.periodo and w.ticket=t.ticket;

revoke all on public.mv_vt_gar_vtr_contexto_ticket from anon,authenticated;
grant select on public.mv_vt_gar_vtr_contexto_ticket to service_role;
