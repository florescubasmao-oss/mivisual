-- MI VISUAL - Produccion: resolver de partida e inferencia histórica
-- Diagnóstico paralelo. No publica ni modifica Producción productiva.

begin;

create or replace function public.mv_servicio_familia(v text)
returns text
language sql
immutable
as $$
  select case
    when public.mv_norm_key(v) in ('RESIDENCIAL','MULTIFAMILIAR','HOGAR') then 'RESIDENCIAL'
    when public.mv_norm_key(v) like 'CONDOMINIOEDIFICIO%' then 'CONDOMINIO'
    else public.mv_norm_key(v)
  end;
$$;

revoke execute on function public.mv_servicio_familia(text) from public, anon, authenticated;
grant execute on function public.mv_servicio_familia(text) to service_role;

create or replace view public.mv_produccion_partida_preliminar_v1 as
with candidatos_regla as (
  select
    e.orden_id,
    r.id_regla,
    r.codigo_partida,
    row_number() over(
      partition by e.orden_id
      order by
        (
          case when nullif(trim(coalesce(r.producto_origen_win,'')),'') is not null then 8 else 0 end +
          case when nullif(trim(coalesce(r.producto_servicio_win,'')),'') is not null then 4 else 0 end +
          case when nullif(trim(coalesce(r.motivo_finalizacion_win,'')),'') is not null then 2 else 0 end +
          coalesce(r.prioridad_regla,0)
        ) desc,
        coalesce(r.soporte_historico,0) desc,
        r.id_regla
    ) as rn
  from public.mv_produccion_orden_elegibilidad_v2 e
  join public.reglas_partida_win r
    on upper(trim(r.estado))='ACTIVO'
   and upper(trim(coalesce(r.aplica_produccion,'')))='SI'
   and public.mv_norm_key(r.tipo_traba_win)=public.mv_norm_key(e.tipo_trabajo)
   and (
     nullif(public.mv_norm_key(r.motivo_finalizacion_win),'') is null
     or public.mv_norm_key(r.motivo_finalizacion_win)=public.mv_norm_key(e.motivo_finalizacion)
   )
   and (
     nullif(public.mv_norm_key(r.tipo_servicio_win),'') is null
     or public.mv_norm_key(r.tipo_servicio_win)=public.mv_servicio_familia(e.tipo_servicio_win)
   )
   and (
     nullif(public.mv_norm_key(r.producto_origen_win),'') is null
     or public.mv_norm_key(r.producto_origen_win)=public.mv_norm_key(e.producto_origen)
   )
   and (
     nullif(public.mv_norm_key(r.producto_servicio_win),'') is null
     or public.mv_norm_key(r.producto_servicio_win)=public.mv_norm_key(e.producto_servicio)
   )
)
select
  e.*,
  public.mv_servicio_familia(e.tipo_servicio_win) as familia_servicio,
  cr.id_regla,
  cr.codigo_partida as partida_regla,
  case
    when nullif(trim(coalesce(e.ajuste_partida_propuesta,'')),'') is not null
      then upper(trim(e.ajuste_partida_propuesta))
    when cr.codigo_partida is not null
      then upper(trim(cr.codigo_partida))
    when public.mv_norm_key(e.tipo_trabajo) in ('INSTALACION','INSTALACIONPOSIBLEFRAUDE')
      then case when public.mv_servicio_familia(e.tipo_servicio_win)='CONDOMINIO' then 'IC' else 'IR' end
    when public.mv_norm_key(e.tipo_trabajo)='TRASLADO'
      then case when public.mv_servicio_familia(e.tipo_servicio_win)='CONDOMINIO' then 'TC' else 'TR' end
    else null
  end as partida_preliminar,
  case
    when nullif(trim(coalesce(e.ajuste_partida_propuesta,'')),'') is not null then 'AJUSTE_VALIDADO'
    when cr.codigo_partida is not null then 'REGLA_ACTIVA'
    when public.mv_norm_key(e.tipo_trabajo) in ('INSTALACION','INSTALACIONPOSIBLEFRAUDE','TRASLADO') then 'BASE_TIPO_SERVICIO'
    else 'SIN_REGLA'
  end as origen_partida_preliminar
from public.mv_produccion_orden_elegibilidad_v2 e
left join candidatos_regla cr
  on cr.orden_id=e.orden_id and cr.rn=1;

create or replace view public.mv_produccion_inferencia_orden_v1 as
with cortes as (
  select
    periodo,
    max(fecha) as ultima_fecha,
    max(fecha_actualizacion) as ultima_actualizacion
  from public.produccion_legacy_snapshot
  group by periodo
),
universo as (
  select p.*
  from public.mv_produccion_partida_preliminar_v1 p
  join cortes c on c.periodo=p.periodo_solicitud
  where p.elegible_produccion_efectiva
    and p.fecha_ejecucion <= c.ultima_fecha
    and (
      c.ultima_actualizacion is null
      or c.ultima_actualizacion::time=time '00:00:00'
      or c.ultima_actualizacion::date<>c.ultima_fecha
      or p.momento_ejecucion<=c.ultima_actualizacion
    )
),
resueltos as (
  select
    periodo_solicitud as periodo,
    fecha_ejecucion as fecha,
    cuadrilla,
    partida_preliminar as codigo,
    count(*)::integer as cantidad
  from universo
  where partida_preliminar is not null
  group by 1,2,3,4
),
residual_codigo as (
  select
    l.periodo,l.fecha,l.cuadrilla,l.codigo,
    greatest(l.cantidad-coalesce(r.cantidad,0),0)::integer as residual
  from public.produccion_legacy_snapshot l
  left join resueltos r
    on r.periodo=l.periodo
   and r.fecha=l.fecha
   and r.cuadrilla=l.cuadrilla
   and upper(trim(r.codigo))=upper(trim(l.codigo))
),
residual_bucket as (
  select
    periodo,fecha,cuadrilla,
    sum(residual)::integer as residual_total,
    count(*) filter(where residual>0)::integer as codigos_residuales,
    min(codigo) filter(where residual>0) as codigo_unico
  from residual_codigo
  group by 1,2,3
),
sin_regla as (
  select
    periodo_solicitud as periodo,
    fecha_ejecucion as fecha,
    cuadrilla,
    count(*)::integer as pendientes
  from universo
  where partida_preliminar is null
  group by 1,2,3
),
buckets_deterministas as (
  select
    s.periodo,s.fecha,s.cuadrilla,s.pendientes,
    b.codigo_unico
  from sin_regla s
  join residual_bucket b using(periodo,fecha,cuadrilla)
  where b.codigos_residuales=1
    and b.residual_total=s.pendientes
)
select
  u.orden_id,
  u.periodo_solicitud as periodo,
  u.fecha_ejecucion,
  u.cuadrilla,
  u.tipo_servicio_win,
  u.familia_servicio,
  u.tipo_trabajo,
  u.motivo_finalizacion,
  u.producto_origen,
  u.producto_servicio,
  b.codigo_unico as codigo_inferido,
  'BUCKET_HISTORICO_DETERMINISTA'::text as origen_inferencia
from universo u
join buckets_deterministas b
  on b.periodo=u.periodo_solicitud
 and b.fecha=u.fecha_ejecucion
 and b.cuadrilla=u.cuadrilla
where u.partida_preliminar is null;

create or replace view public.mv_produccion_reglas_candidatas_v1 as
with x as (
  select
    familia_servicio,
    public.mv_norm_key(tipo_trabajo) as tipo_trabajo_norm,
    public.mv_norm_key(motivo_finalizacion) as motivo_norm,
    public.mv_norm_key(producto_origen) as producto_origen_norm,
    public.mv_norm_key(producto_servicio) as producto_servicio_norm,
    codigo_inferido,
    count(*)::integer as soporte
  from public.mv_produccion_inferencia_orden_v1
  group by 1,2,3,4,5,6
),
tot as (
  select
    familia_servicio,tipo_trabajo_norm,motivo_norm,producto_origen_norm,producto_servicio_norm,
    sum(soporte)::integer as total
  from x
  group by 1,2,3,4,5
),
ranked as (
  select
    x.*,
    t.total,
    x.soporte::numeric/nullif(t.total,0) as pureza,
    row_number() over(
      partition by x.familia_servicio,x.tipo_trabajo_norm,x.motivo_norm,x.producto_origen_norm,x.producto_servicio_norm
      order by x.soporte desc,x.codigo_inferido
    ) as rn
  from x
  join tot t using(familia_servicio,tipo_trabajo_norm,motivo_norm,producto_origen_norm,producto_servicio_norm)
)
select
  familia_servicio,tipo_trabajo_norm,motivo_norm,producto_origen_norm,producto_servicio_norm,
  codigo_inferido,soporte,total,pureza,
  case
    when pureza=1 and soporte>=3 then 'CANDIDATA_ALTA'
    when pureza=1 and soporte>=2 then 'CANDIDATA'
    else 'REVISAR'
  end as estado_candidata
from ranked
where rn=1;

commit;
