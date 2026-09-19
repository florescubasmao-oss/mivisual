
-- 042_actas_motor_migracion.sql
-- Modelo operacional de Actas, identidad V344, auditoria y enlace a Mapa.

create table if not exists public.actas_migracion (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  registrado_at timestamptz,
  sede text not null,
  cuadrilla text not null,
  supervisor text,
  tecnico text,
  fecha_gestion date,
  tipo_ejecucion text,
  tipo_partida text,
  codigo_orden text,
  codigo_orden_norm text,
  codigo_pedido text,
  codigo_pedido_norm text,
  numero_acta text,
  numero_acta_norm text,
  dni text,
  cliente text,
  nombre_archivo text,
  drive_file_id text,
  link_acta text,
  estado text not null default 'PENDIENTE',
  resultado_almacen text,
  motivo_almacen text,
  validado_almacen_por text,
  validado_almacen_at timestamptz,
  resultado_jefatura text,
  motivo_jefatura text,
  validado_jefatura_por text,
  validado_jefatura_at timestamptz,
  version integer not null default 1,
  estado_entrega_fisica text not null default 'PENDIENTE',
  confirmado_fisico_por text,
  perfil_confirmacion_fisica text,
  confirmado_fisico_at timestamptz,
  motivo_reversion_fisica text,
  origen_registro text not null default 'TECNICO',
  motivo_acta_faltante text,
  registrado_faltante_por text,
  registrado_faltante_at timestamptz,
  estado_fecha_carpeta text,
  fecha_limite_verificacion timestamptz,
  ultimo_intento_fecha timestamptz,
  intentos_fecha integer not null default 0,
  fecha_carpeta date,
  fecha_confirmada_por text,
  perfil_confirmacion_fecha text,
  origen_fecha_carpeta text,
  source_kind text not null default 'LEGACY_SNAPSHOT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actas_estado_chk check (estado in ('PENDIENTE','FINALIZADO')),
  constraint actas_resultado_almacen_chk check (resultado_almacen is null or resultado_almacen in ('CORRECTO','OBSERVADO')),
  constraint actas_resultado_jefatura_chk check (resultado_jefatura is null or resultado_jefatura in ('CORRECTO','OBSERVADO')),
  constraint actas_entrega_chk check (estado_entrega_fisica in ('PENDIENTE','ENTREGADA')),
  constraint actas_fecha_carpeta_chk check (
    estado_fecha_carpeta is null or estado_fecha_carpeta in ('CONFIRMADA','PENDIENTE_MAPA','REQUIERE_CONFIRMACION')
  ),
  constraint actas_version_chk check (version >= 0),
  constraint actas_intentos_chk check (intentos_fecha >= 0)
);

create unique index if not exists actas_migracion_codigo_orden_uidx
  on public.actas_migracion(codigo_orden_norm)
  where codigo_orden_norm is not null and codigo_orden_norm <> '';

create unique index if not exists actas_migracion_numero_acta_uidx
  on public.actas_migracion(numero_acta_norm)
  where numero_acta_norm is not null and numero_acta_norm <> '';

create unique index if not exists actas_migracion_drive_file_uidx
  on public.actas_migracion(drive_file_id)
  where drive_file_id is not null and drive_file_id <> '';

create index if not exists actas_migracion_periodo_idx on public.actas_migracion(fecha_gestion);
create index if not exists actas_migracion_sede_cuadrilla_idx on public.actas_migracion(sede,cuadrilla);
create index if not exists actas_migracion_estado_idx on public.actas_migracion(estado,estado_entrega_fisica);

truncate table public.actas_migracion cascade;

insert into public.actas_migracion (
 legacy_id,registrado_at,sede,cuadrilla,supervisor,tecnico,fecha_gestion,tipo_ejecucion,tipo_partida,
 codigo_orden,codigo_orden_norm,codigo_pedido,codigo_pedido_norm,numero_acta,numero_acta_norm,dni,cliente,
 nombre_archivo,drive_file_id,link_acta,estado,resultado_almacen,motivo_almacen,validado_almacen_por,
 validado_almacen_at,resultado_jefatura,motivo_jefatura,validado_jefatura_por,validado_jefatura_at,
 version,estado_entrega_fisica,confirmado_fisico_por,perfil_confirmacion_fisica,confirmado_fisico_at,
 motivo_reversion_fisica,origen_registro,motivo_acta_faltante,registrado_faltante_por,registrado_faltante_at,
 estado_fecha_carpeta,fecha_limite_verificacion,ultimo_intento_fecha,intentos_fecha,fecha_carpeta,
 fecha_confirmada_por,perfil_confirmacion_fecha,origen_fecha_carpeta,source_kind
)
select
 a.id,
 case when a.registrado_at is null then null else a.registrado_at at time zone 'America/Lima' end,
 coalesce(nullif(upper(trim(a.sede)),''),'SIN SEDE'),
 trim(a.cuadrilla),
 nullif(trim(a.supervisor),''),
 nullif(trim(a.tecnico),''),
 a.fecha_gestion_date,
 nullif(upper(trim(a.tipo_ejecucion)),''),
 nullif(trim(a.tipo_partida),''),
 nullif(trim(a.codigo_orden),''),
 a.codigo_orden_norm,
 nullif(trim(a.codigo_pedido),''),
 a.codigo_pedido_norm,
 nullif(trim(a.numero_acta),''),
 a.numero_acta_norm,
 a.dni_norm,
 nullif(trim(a.cliente),''),
 nullif(trim(a.nombre_archivo),''),
 a.drive_file_id,
 nullif(trim(a.link_acta),''),
 coalesce(nullif(upper(trim(a.estado)),''),'PENDIENTE'),
 nullif(upper(trim(a.resultado_almacen)),''),
 nullif(trim(a.motivo_almacen),''),
 nullif(trim(a.validado_almacen_por),''),
 case when a.validado_almacen_at is null then null else a.validado_almacen_at at time zone 'America/Lima' end,
 nullif(upper(trim(a.resultado_jefatura)),''),
 nullif(trim(a.motivo_jefatura),''),
 nullif(trim(a.validado_jefatura_por),''),
 case when a.validado_jefatura_at is null then null else a.validado_jefatura_at at time zone 'America/Lima' end,
 case when trim(coalesce(a.version,'')) ~ '^[0-9]+$' then a.version::integer else 0 end,
 coalesce(nullif(upper(trim(a.estado_entrega_fisica)),''),'PENDIENTE'),
 nullif(trim(a.confirmado_fisico_por),''),
 nullif(trim(a.perfil_confirmacion_fisica),''),
 case when a.confirmado_fisico_at is null then null else a.confirmado_fisico_at at time zone 'America/Lima' end,
 nullif(trim(a.motivo_reversion_fisica),''),
 coalesce(nullif(upper(trim(a.origen_registro)),''),'TECNICO'),
 nullif(trim(a.motivo_acta_faltante),''),
 nullif(trim(a.registrado_faltante_por),''),
 case when trim(coalesce(a.fecha_registro_faltante,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then (timestamp '1899-12-30' + a.fecha_registro_faltante::numeric * interval '1 day') at time zone 'America/Lima'
      else null end,
 coalesce(
   nullif(upper(trim(a.estado_fecha_carpeta)),''),
   case when nullif(trim(a.link_acta),'') is not null and a.fecha_gestion_date is not null then 'CONFIRMADA' else null end
 ),
 case when trim(coalesce(a.fecha_limite_verificacion,'')) ~ '^[0-9]+([.][0-9]+)?$'
      then (timestamp '1899-12-30' + a.fecha_limite_verificacion::numeric * interval '1 day') at time zone 'America/Lima'
      else null end,
 case when a.ultimo_intento_fecha_at is null then null else a.ultimo_intento_fecha_at at time zone 'America/Lima' end,
 case when trim(coalesce(a.intentos_fecha,'')) ~ '^[0-9]+$' then a.intentos_fecha::integer else 0 end,
 a.fecha_carpeta_date,
 nullif(trim(a.fecha_confirmada_por),''),
 nullif(trim(a.perfil_confirmacion_fecha),''),
 nullif(upper(trim(a.origen_fecha_carpeta)),''),
 'LEGACY_SNAPSHOT'
from public.mv_actas_legacy_normalizada a;

create table if not exists public.actas_eventos_migracion (
  id bigint generated always as identity primary key,
  acta_id uuid not null references public.actas_migracion(id) on delete cascade,
  evento text not null,
  actor text,
  perfil_actor text,
  estado_anterior jsonb,
  estado_nuevo jsonb,
  origen text not null,
  creado_at timestamptz not null default now()
);

truncate table public.actas_eventos_migracion restart identity;

insert into public.actas_eventos_migracion(acta_id,evento,actor,perfil_actor,estado_anterior,estado_nuevo,origen)
select
 id,'IMPORT_LEGACY','MIGRACION','SISTEMA',null,
 jsonb_build_object(
   'legacyId',legacy_id,'estado',estado,'resultadoAlmacen',resultado_almacen,
   'resultadoJefatura',resultado_jefatura,'version',version,'estadoEntregaFisica',estado_entrega_fisica,
   'estadoFechaCarpeta',estado_fecha_carpeta,'driveFileId',drive_file_id
 ),
 'ACTAS_ESCANEADAS'
from public.actas_migracion;

create or replace view public.mv_actas_mapa_resolucion
with (security_invoker=true) as
select
 a.id as acta_id,
 a.legacy_id,
 a.codigo_orden_norm as codigo_orden_acta,
 a.codigo_pedido_norm as codigo_pedido_acta,
 m.orden_id as mapa_orden_id,
 m.codigo_cliente as mapa_codigo_cliente,
 m.numero_documento as mapa_dni,
 m.cliente as mapa_cliente,
 m.cuadrilla as mapa_cuadrilla,
 m.sede as mapa_sede,
 m.tipo_trabajo as mapa_tipo_trabajo,
 m.fecha_fin_visita,
 m.fecha_inicio_visita,
 m.fecha_solicitud,
 m.score_match,
 m.tipo_match
from public.actas_migracion a
left join lateral (
  select
    o.*,
    (
      case when a.codigo_orden_norm is not null and o.orden_id_norm=a.codigo_orden_norm then 120 else 0 end +
      case when a.codigo_pedido_norm is not null and o.codigo_cliente_norm=a.codigo_pedido_norm then 110 else 0 end +
      case when a.codigo_orden_norm is not null and o.codigo_cliente_norm=a.codigo_orden_norm then 45 else 0 end +
      case when a.codigo_pedido_norm is not null and o.orden_id_norm=a.codigo_pedido_norm then 40 else 0 end +
      case when a.codigo_orden_norm is not null and a.codigo_pedido_norm is not null
                 and o.orden_id_norm=a.codigo_orden_norm and o.codigo_cliente_norm=a.codigo_pedido_norm then 100 else 0 end
    )::integer as score_match,
    case
      when a.codigo_orden_norm is not null and a.codigo_pedido_norm is not null
       and o.orden_id_norm=a.codigo_orden_norm and o.codigo_cliente_norm=a.codigo_pedido_norm then 'ORDEN_PEDIDO_EXACTO'
      when a.codigo_orden_norm is not null and o.orden_id_norm=a.codigo_orden_norm then 'ORDEN'
      when a.codigo_pedido_norm is not null and o.codigo_cliente_norm=a.codigo_pedido_norm then 'PEDIDO'
      when a.codigo_orden_norm is not null and o.codigo_cliente_norm=a.codigo_orden_norm then 'CRUCE_ORDEN_CLIENTE'
      when a.codigo_pedido_norm is not null and o.orden_id_norm=a.codigo_pedido_norm then 'CRUCE_PEDIDO_ORDEN'
      else null
    end as tipo_match
  from public.ordenes o
  where
    regexp_replace(upper(trim(coalesce(o.cuadrilla,''))), '^P[[:space:]]+([0-9]+)', 'P\1')
      = regexp_replace(upper(trim(coalesce(a.cuadrilla,''))), '^P[[:space:]]+([0-9]+)', 'P\1')
    and (
      (a.codigo_orden_norm is not null and (o.orden_id_norm=a.codigo_orden_norm or o.codigo_cliente_norm=a.codigo_orden_norm))
      or
      (a.codigo_pedido_norm is not null and (o.codigo_cliente_norm=a.codigo_pedido_norm or o.orden_id_norm=a.codigo_pedido_norm))
    )
  order by score_match desc, o.fecha_ultimo_estado desc nulls last, o.id desc
  limit 1
) m on true;

create or replace view public.mv_actas_datos_automaticos_migracion
with (security_invoker=true) as
select
 r.*,
 coalesce(r.fecha_fin_visita::date,r.fecha_inicio_visita::date,r.fecha_solicitud) as fecha_gestion_mapa,
 case
   when upper(coalesce(r.mapa_tipo_trabajo,'')) like '%INSTALACION%' then 'INSTALACION'
   when r.mapa_orden_id is not null then 'VISITA TECNICA'
   else null
 end as tipo_ejecucion_mapa,
 p.partida_motor as codigo_partida_motor,
 c.tipo_orden as tipo_partida_motor
from public.mv_actas_mapa_resolucion r
left join public.mv_produccion_partida_motor_migracion_v1 p on p.orden_id=r.mapa_orden_id
left join lateral (
  select cp.tipo_orden
  from public.catalogo_partidas_migracion cp
  where upper(trim(cp.codigo))=upper(trim(p.partida_motor))
  order by cp.source_row
  limit 1
) c on true;

create or replace view public.mv_actas_migracion
with (security_invoker=true) as
select
 a.*,
 case
   when a.resultado_jefatura='CORRECTO' or a.estado='FINALIZADO' then 'FINALIZADO'
   when a.resultado_jefatura='OBSERVADO' or a.resultado_almacen='OBSERVADO' then 'OBSERVADO'
   else 'PENDIENTE'
 end as estado_visible_tecnico,
 coalesce(a.resultado_jefatura,a.resultado_almacen) as resultado_validacion,
 coalesce(a.motivo_jefatura,a.motivo_almacen) as motivo_observacion,
 coalesce(a.validado_jefatura_por,a.validado_almacen_por) as validado_por,
 (a.origen_registro='ALMACEN' and a.link_acta is null) as es_acta_faltante,
 d.mapa_orden_id,
 d.tipo_match as mapa_tipo_match,
 d.score_match as mapa_score_match,
 d.fecha_gestion_mapa,
 d.tipo_ejecucion_mapa,
 d.codigo_partida_motor,
 d.tipo_partida_motor
from public.actas_migracion a
left join public.mv_actas_datos_automaticos_migracion d on d.acta_id=a.id;

create or replace view public.mv_actas_resumen_migracion
with (security_invoker=true) as
select
 coalesce(to_char(fecha_gestion,'YYYY-MM'),'SIN_FECHA') as periodo,
 sede,
 cuadrilla,
 count(*)::integer as escaneadas,
 count(*) filter(where estado='FINALIZADO' or resultado_jefatura='CORRECTO')::integer as finalizadas,
 count(*) filter(where resultado_almacen='OBSERVADO' or resultado_jefatura='OBSERVADO')::integer as observadas,
 count(*) filter(where estado='PENDIENTE')::integer as pendientes,
 count(*) filter(where resultado_almacen='CORRECTO')::integer as correctas_almacen,
 count(*) filter(where resultado_almacen='OBSERVADO')::integer as observadas_almacen,
 count(*) filter(where resultado_jefatura='CORRECTO')::integer as correctas_jefatura,
 count(*) filter(where resultado_jefatura='OBSERVADO')::integer as observadas_jefatura,
 count(*) filter(where estado_entrega_fisica='ENTREGADA')::integer as entregadas_fisicas,
 count(*) filter(where estado_entrega_fisica<>'ENTREGADA')::integer as pendientes_entrega_fisica,
 count(*) filter(where estado_fecha_carpeta='PENDIENTE_MAPA')::integer as pendientes_fecha,
 count(*) filter(where estado_fecha_carpeta='REQUIERE_CONFIRMACION')::integer as requieren_confirmacion_fecha
from public.actas_migracion
group by 1,2,3;

alter table public.actas_migracion enable row level security;
alter table public.actas_eventos_migracion enable row level security;

revoke all on public.actas_migracion from anon,authenticated;
revoke all on public.actas_eventos_migracion from anon,authenticated;
revoke all on public.mv_actas_mapa_resolucion from anon,authenticated;
revoke all on public.mv_actas_datos_automaticos_migracion from anon,authenticated;
revoke all on public.mv_actas_migracion from anon,authenticated;
revoke all on public.mv_actas_resumen_migracion from anon,authenticated;

grant select on public.actas_migracion to service_role;
grant select on public.actas_eventos_migracion to service_role;
grant select on public.mv_actas_mapa_resolucion to service_role;
grant select on public.mv_actas_datos_automaticos_migracion to service_role;
grant select on public.mv_actas_migracion to service_role;
grant select on public.mv_actas_resumen_migracion to service_role;
