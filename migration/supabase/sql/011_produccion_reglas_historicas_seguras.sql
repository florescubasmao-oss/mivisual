-- MI VISUAL - Produccion: reglas históricas seguras por motivo liquidado
-- Solo diagnóstico. Usa pureza 100% y soporte >=2. No publica Producción.

begin;

create or replace view public.mv_produccion_motivo_historico_v1 as
with base as (
  select
    public.mv_norm_key(b.tipo_trabajo) as motivo_norm,
    coalesce(c1.codigo,c2.codigo) as codigo
  from public.base_operativa_legacy b
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida)
    order by c.source_row
    limit 1
  ) c1 on true
  left join lateral (
    select c.codigo
    from public.catalogo_partidas_migracion c
    where c1.codigo is null
      and public.mv_norm_key(c.tipo_orden)=public.mv_norm_key(b.tipo_partida_alterna)
    order by c.source_row
    limit 1
  ) c2 on true
  where upper(trim(coalesce(b.estado,'')))='FINALIZADA'
    and nullif(public.mv_norm_key(b.tipo_trabajo),'') is not null
),
agg as (
  select motivo_norm,codigo,count(*)::integer as soporte
  from base
  where codigo is not null
  group by 1,2
),
tot as (
  select motivo_norm,sum(soporte)::integer as total
  from agg
  group by 1
),
ranked as (
  select
    a.*,t.total,
    a.soporte::numeric/nullif(t.total,0) as pureza,
    row_number() over(partition by a.motivo_norm order by a.soporte desc,a.codigo) as rn
  from agg a
  join tot t using(motivo_norm)
)
select motivo_norm,codigo,soporte,total,pureza
from ranked
where rn=1;

create or replace view public.mv_produccion_reglas_historicas_seguras_v1 as
select motivo_norm,codigo,soporte,total,pureza
from public.mv_produccion_motivo_historico_v1
where pureza=1
  and soporte>=2;

commit;
