-- MI VISUAL - Validacion Tecnica: seguridad transaccional y contexto GAR/VTR
begin;

create or replace function public.mv_vt_ticket_key(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(upper(trim(coalesce(v,''))),'[^A-Z0-9]','','g');
$$;

revoke execute on function public.mv_vt_ticket_key(text) from public,anon,authenticated;
grant execute on function public.mv_vt_ticket_key(text) to service_role;

create unique index if not exists vt_migracion_codigo_tipo_ticket_uq
on public.validacion_tecnica_migracion(
  public.mv_norm_key(codigo),
  upper(trim(tipo_validacion)),
  public.mv_vt_ticket_key(coalesce(nullif(trim(ticket_final),''),coalesce(tipo_ticket,'')||coalesce(numero_ticket,'')))
);

create or replace function public.mv_vt_aplicar_vencidos()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  n integer;
  ahora timestamp without time zone := timezone('America/Lima',now());
begin
  update public.validacion_tecnica_migracion
     set estado='SIN RESPUESTA',
         resultado_final='APROBADO AUTOMÁTICAMENTE',
         validado_por='SISTEMA',
         perfil_validador='AUTOMÁTICO',
         validado_at=ahora,
         motivo_validacion='Aprobación automática por no recibir respuesta dentro de los 15 minutos establecidos.',
         updated_at=now()
   where upper(trim(tipo_validacion))='RECABLEADO'
     and upper(trim(estado))='PENDIENTE'
     and (
       case
         when hora_limite is not null then greatest(hora_limite,registro_at + interval '15 minutes')
         else registro_at + interval '15 minutes'
       end
     ) <= ahora;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.mv_vt_aplicar_vencidos() from public,anon,authenticated;
grant execute on function public.mv_vt_aplicar_vencidos() to service_role;

create or replace function public.mv_vt_ticket_canon(v text, tipo_sugerido text default null)
returns text
language plpgsql
immutable
as $$
declare
  t text := upper(trim(coalesce(v,'')));
  tipo text := upper(trim(coalesce(tipo_sugerido,'')));
  dig text;
  m text[];
begin
  t := regexp_replace(t,'\s+','','g');
  m := regexp_match(t,'(VTR|GAR)-?([0-9]+)');
  if m is not null then
    return m[1]||'-'||m[2];
  end if;
  if tipo in ('REITERADA','VTR') then tipo:='VTR';
  elsif tipo in ('GARANTIA','GARANTÍA','GAR') then tipo:='GAR';
  else return null;
  end if;
  dig := regexp_replace(t,'\D','','g');
  if dig='' then return null; end if;
  return tipo||'-'||dig;
end;
$$;

revoke execute on function public.mv_vt_ticket_canon(text,text) from public,anon,authenticated;
grant execute on function public.mv_vt_ticket_canon(text,text) to service_role;

create or replace function public.mv_vt_estado_win_efectivo(
  p_estado text,
  p_motivo_cancelacion text,
  p_motivo_anulacion text
)
returns text
language sql
immutable
as $$
  select case
    when public.mv_norm_key(p_estado) in ('FINALIZADA','FINALIZADO') then 'FINALIZADA'
    when public.mv_norm_key(p_estado) like '%ANUL%'
      or nullif(trim(coalesce(p_motivo_anulacion,'')),'') is not null then 'ANULADA'
    when public.mv_norm_key(p_estado) like '%REPROGRAM%' then 'REPROGRAMADA'
    when public.mv_norm_key(p_estado) like '%CANCEL%'
      and public.mv_norm_key(p_motivo_cancelacion) like '%REPROGRAM%' then 'REPROGRAMADA'
    when public.mv_norm_key(p_estado) like '%CANCEL%' then 'CANCELADA'
    else 'POR_REVISAR'
  end;
$$;

revoke execute on function public.mv_vt_estado_win_efectivo(text,text,text) from public,anon,authenticated;
grant execute on function public.mv_vt_estado_win_efectivo(text,text,text) to service_role;

create or replace view public.mv_vt_gar_vtr_decisiones_validas as
select
  b.*,
  public.mv_vt_ticket_canon(b.ticket,b.tipo) as ticket_canon,
  coalesce(b.fecha_ultima_edicion,b.fecha_calificacion,b.fecha_incidencia::timestamp) as momento_decision
from public.vtr_gar_clasificacion_legacy b
where upper(trim(coalesce(b.estado_calificacion,''))) in ('CONFIRMADO','REASIGNADO','ANULADO','NO_ES_GAR_VTR')
  and nullif(trim(coalesce(b.calificado_por,'')),'') is not null
  and b.fecha_calificacion is not null
  and b.fecha_incidencia is not null
  and b.fecha_calificacion::date >= b.fecha_incidencia
  and public.mv_vt_ticket_canon(b.ticket,b.tipo) is not null;

create or replace view public.mv_vt_gar_vtr_decision_ticket as
select distinct on (periodo,ticket_canon)
  periodo,
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
order by periodo,ticket_canon,momento_decision desc nulls last,source_row desc;

create or replace view public.mv_vt_gar_vtr_ordenes_ticket as
with base as (
  select distinct
    b.periodo,
    public.mv_vt_ticket_canon(b.ticket,b.tipo) as ticket,
    b.codigo_liquidacion as orden_id
  from public.vtr_gar_clasificacion_legacy b
  where public.mv_vt_ticket_canon(b.ticket,b.tipo) is not null
    and nullif(trim(coalesce(b.codigo_liquidacion,'')),'') is not null
),
win_directo as (
  select
    to_char(o.fecha_solicitud,'YYYY-MM') as periodo,
    public.mv_vt_ticket_canon(o.codigo_seguimiento,o.tipo_trabajo) as ticket,
    o.orden_id
  from public.ordenes o
  where public.mv_vt_ticket_canon(o.codigo_seguimiento,o.tipo_trabajo) is not null
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
  o.cuadrilla,
  o.codigo_cliente,
  o.numero_documento
from llaves l
join public.ordenes o on o.orden_id=l.orden_id
where l.ticket is not null;

create or replace view public.mv_vt_gar_vtr_estado_win_ticket as
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
  momento_win,
  ordenes_win
from x;

create or replace view public.mv_vt_gar_vtr_contexto_ticket as
with tickets as (
  select distinct periodo,public.mv_vt_ticket_canon(ticket,tipo) as ticket
  from public.vtr_gar_clasificacion_legacy
  where public.mv_vt_ticket_canon(ticket,tipo) is not null
  union
  select distinct periodo,public.mv_vt_ticket_canon(ticket_final,tipo_validacion)
  from public.validacion_tecnica_migracion
  where tipo_validacion in ('GAR','VTR')
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
  d.cuadrilla_responsable,
  d.sede_responsable,
  d.calificado_por,
  d.fecha_calificacion,
  coalesce(w.ordenes_win,0)::integer as ordenes_win
from tickets t
left join public.mv_vt_gar_vtr_decision_ticket d
  on d.periodo=t.periodo and d.ticket=t.ticket
left join public.mv_vt_gar_vtr_estado_win_ticket w
  on w.periodo=t.periodo and w.ticket=t.ticket;

commit;
