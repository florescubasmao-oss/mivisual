-- MI VISUAL - Validacion Tecnica: unificar periodo GAR/VTR a YYYY-MM
begin;

drop view if exists public.mv_vt_gar_vtr_contexto_ticket;
drop view if exists public.mv_vt_gar_vtr_estado_win_ticket;
drop view if exists public.mv_vt_gar_vtr_ordenes_ticket;
drop view if exists public.mv_vt_gar_vtr_decision_ticket;
drop view if exists public.mv_vt_gar_vtr_decisiones_validas;

create view public.mv_vt_gar_vtr_decisiones_validas as
select
  b.*,
  to_char(b.fecha_incidencia,'YYYY-MM') as periodo_iso,
  public.mv_vt_ticket_canon(b.ticket,b.tipo) as ticket_canon,
  coalesce(b.fecha_ultima_edicion,b.fecha_calificacion,b.fecha_incidencia::timestamp) as momento_decision
from public.vtr_gar_clasificacion_legacy b
where upper(trim(coalesce(b.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO','ANULADO','NO_ES_GAR_VTR')
  and nullif(trim(coalesce(b.calificado_por,'')),'') is not null
  and b.fecha_calificacion is not null
  and b.fecha_incidencia is not null
  and b.fecha_calificacion::date >= b.fecha_incidencia
  and public.mv_vt_ticket_canon(b.ticket,b.tipo) is not null;

create view public.mv_vt_gar_vtr_decision_ticket as
select distinct on (periodo_iso,ticket_canon)
  periodo_iso as periodo,
  ticket_canon as ticket,
  tipo,
  upper(trim(estado_calificacion)) as estado_responsabilidad,
  cuadrilla_responsable,
  sede_responsable,
  calificado_por,
  fecha_calificacion,
  momento_decision,
  codigo_liquidacion as orden_referencia
from public.mv_vt_gar_vtr_decisiones_validas
order by periodo_iso,ticket_canon,momento_decision desc nulls last,source_row desc;

create view public.mv_vt_gar_vtr_ordenes_ticket as
with base as (
  select distinct
    to_char(b.fecha_incidencia,'YYYY-MM') as periodo,
    public.mv_vt_ticket_canon(b.ticket,b.tipo) as ticket,
    b.codigo_liquidacion as orden_id
  from public.vtr_gar_clasificacion_legacy b
  where b.fecha_incidencia is not null
    and public.mv_vt_ticket_canon(b.ticket,b.tipo) is not null
    and nullif(trim(coalesce(b.codigo_liquidacion,'')),'') is not null
),
win_directo as (
  select
    to_char(o.fecha_solicitud,'YYYY-MM') as periodo,
    public.mv_vt_ticket_canon(o.codigo_seguimiento,o.tipo_trabajo) as ticket,
    o.orden_id
  from public.ordenes o
  where o.fecha_solicitud is not null
    and public.mv_vt_ticket_canon(o.codigo_seguimiento,o.tipo_trabajo) is not null
),
llaves as (
  select * from base
  union
  select * from win_directo
)
select distinct
  l.periodo,l.ticket,o.orden_id,
  public.mv_vt_estado_win_efectivo(o.estado,o.motivo_cancelacion,o.motivo_anulacion) as estado_win,
  coalesce(o.fecha_ultimo_estado,o.fecha_fin_visita,o.fecha_inicio_visita,o.fecha_solicitud::timestamp) as momento,
  o.cuadrilla,o.codigo_cliente,o.numero_documento
from llaves l
join public.ordenes o on o.orden_id=l.orden_id
where l.ticket is not null;

create view public.mv_vt_gar_vtr_estado_win_ticket as
with x as (
  select
    periodo,ticket,
    bool_or(estado_win='FINALIZADA') as alguna_finalizada,
    (array_agg(estado_win order by momento desc nulls last,orden_id desc))[1] as estado_mas_reciente,
    max(momento) as momento_win,
    count(*)::integer as ordenes_win
  from public.mv_vt_gar_vtr_ordenes_ticket
  group by periodo,ticket
)
select
  periodo,ticket,
  case
    when alguna_finalizada then 'FINALIZADA'
    when estado_mas_reciente in ('REPROGRAMADA','CANCELADA','ANULADA') then estado_mas_reciente
    else 'POR_REVISAR'
  end as estado_win,
  momento_win,ordenes_win
from x;

create view public.mv_vt_gar_vtr_contexto_ticket as
with tickets as (
  select distinct
    to_char(fecha_incidencia,'YYYY-MM') as periodo,
    public.mv_vt_ticket_canon(ticket,tipo) as ticket
  from public.vtr_gar_clasificacion_legacy
  where fecha_incidencia is not null
    and public.mv_vt_ticket_canon(ticket,tipo) is not null
  union
  select distinct
    periodo,
    public.mv_vt_ticket_canon(ticket_final,tipo_validacion)
  from public.validacion_tecnica_migracion
  where periodo ~ '^20[0-9]{2}-[0-9]{2}$'
    and tipo_validacion in ('GAR','VTR')
    and public.mv_vt_ticket_canon(ticket_final,tipo_validacion) is not null
)
select
  t.periodo,t.ticket,
  coalesce(d.tipo,case when t.ticket like 'GAR-%' then 'GAR' else 'VTR' end) as tipo,
  coalesce(d.estado_responsabilidad,'PENDIENTE') as estado_responsabilidad,
  coalesce(w.estado_win,'POR_REVISAR') as estado_win,
  (coalesce(d.estado_responsabilidad,'PENDIENTE') in ('CONFIRMADO','REASIGNADO')) as es_gar_vtr_confirmado,
  (
    coalesce(w.estado_win,'POR_REVISAR')='FINALIZADA'
    and coalesce(d.estado_responsabilidad,'PENDIENTE') in ('CONFIRMADO','REASIGNADO')
  ) as bono_habilitado,
  d.cuadrilla_responsable,d.sede_responsable,d.calificado_por,d.fecha_calificacion,
  coalesce(w.ordenes_win,0)::integer as ordenes_win
from tickets t
left join public.mv_vt_gar_vtr_decision_ticket d
  on d.periodo=t.periodo and d.ticket=t.ticket
left join public.mv_vt_gar_vtr_estado_win_ticket w
  on w.periodo=t.periodo and w.ticket=t.ticket;

commit;
