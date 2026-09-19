-- MI VISUAL - Bonos de Produccion: motor base migracion
-- Preserva reglas vigentes: minimo 4.5, base 4, tarifa 30/45, PEXT 30.
-- PDG y tarifas especiales quedan fechadas/auditables.

begin;

create table if not exists public.bono_produccion_parametros (
  id text primary key,
  valor numeric(12,3) not null,
  vigente_desde date not null,
  vigente_hasta date,
  observacion text,
  created_at timestamptz not null default now()
);

insert into public.bono_produccion_parametros(id,valor,vigente_desde,vigente_hasta,observacion)
values
('MINIMO_BONO',4.5,'2026-01-01',null,'Puntaje diario minimo para generar bono.'),
('BASE_SIN_BONO',4,'2026-01-01',null,'Primeros 4 puntos del dia no son comisionables.'),
('VALOR_PUNTO_NORMAL',30,'2026-01-01',null,'Tarifa normal por punto comisionable de Produccion.'),
('VALOR_PUNTO_ESPECIAL',45,'2026-01-01',null,'Tarifa especial por punto comisionable de Produccion.'),
('VALOR_PUNTO_PEXT',30,'2026-01-01',null,'Tarifa por punto PEXT comisionable.')
on conflict(id) do update set
  valor=excluded.valor,
  vigente_desde=excluded.vigente_desde,
  vigente_hasta=excluded.vigente_hasta,
  observacion=excluded.observacion;

create table if not exists public.bono_produccion_reglas_cuadrilla (
  id_regla text primary key,
  codigo text not null,
  termino_plataforma text,
  terminos_nombre text[] not null default '{}',
  tratamiento text not null,
  valor_punto numeric(12,3),
  vigente_desde date not null,
  vigente_hasta date,
  observacion text,
  created_at timestamptz not null default now()
);

insert into public.bono_produccion_reglas_cuadrilla
(id_regla,codigo,termino_plataforma,terminos_nombre,tratamiento,valor_punto,vigente_desde,vigente_hasta,observacion)
values
('BONO-PDG-P8','P8','SGI',array['BASTIDAS','GONZALEZ','ALEX'],'PDG',0,'2026-01-01',null,'P8 SGI no participa en Bonos.'),
('BONO-PDG-P7-HIST','P7','SGI',array['PACHERRES','RUIZ','VICTOR'],'PDG',0,'2026-01-01','2026-07-31','P7 SGI fue PDG hasta julio 2026.'),
('BONO-ESP-P7','P7','SGI',array['PACHERRES','RUIZ','VICTOR'],'ESPECIAL',45,'2026-08-01',null,'P7 SGI participa desde agosto con tarifa especial.'),
('BONO-ESP-P5-SGI','P5','SGI',array['SANCHEZ','TUME','MAXIMO'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P6-SGI','P6','SGI',array['ESPINOZA','ESTRADA','ROBERTO'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P10-TRAS','P10','TRASLADO',array['VERGARA','TRELLES','ROBERTSON'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P4-SGI','P4','SGI',array['INGOL','RODRIGUEZ','CESAR'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P1-TRAS','P1','TRASLADO',array['ATENCIO','RELUZ','DANY','DANI'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P3-SGI','P3','SGI',array['ELERA','CUEVA','ROBERTO'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P12-SGI','P12','SGI',array['FERNANDEZ','MUNDACA','MOISES'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P2-TRAS','P2','TRASLADO',array['ESPIRE','CHIQUEZ','LUIS'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P10-SGI','P10','SGI',array['YNGA','MORE','JAIME'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P16-SGI','P16','SGI',array['AZABACHE','SANCHEZ','FRANK'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.'),
('BONO-ESP-P14-SGI','P14','SGI',array['BARRANZUELA','ALEMAN','WILSON','RUBEN'],'ESPECIAL',45,'2026-01-01',null,'Tarifa especial legacy.')
on conflict(id_regla) do update set
 codigo=excluded.codigo,
 termino_plataforma=excluded.termino_plataforma,
 terminos_nombre=excluded.terminos_nombre,
 tratamiento=excluded.tratamiento,
 valor_punto=excluded.valor_punto,
 vigente_desde=excluded.vigente_desde,
 vigente_hasta=excluded.vigente_hasta,
 observacion=excluded.observacion;

alter table public.bono_produccion_parametros enable row level security;
alter table public.bono_produccion_reglas_cuadrilla enable row level security;
revoke all on table public.bono_produccion_parametros from anon,authenticated;
revoke all on table public.bono_produccion_reglas_cuadrilla from anon,authenticated;

create or replace function public.mv_bono_regla_cuadrilla(p_cuadrilla text,p_fecha date)
returns table(tratamiento text, valor_punto numeric, id_regla text)
language sql
stable
security definer
set search_path=public
as $$
  with n as (
    select
      public.mv_norm_key(p_cuadrilla) as k,
      upper(regexp_replace(coalesce(p_cuadrilla,''),'^\s*','')) as raw
  ),
  candidatos as (
    select r.*,
      (
        case when n.k like public.mv_norm_key(r.codigo)||'%' then 10 else 0 end +
        case when r.termino_plataforma is null or n.k like '%'||public.mv_norm_key(r.termino_plataforma)||'%' then 5 else -100 end +
        case when exists (
          select 1 from unnest(r.terminos_nombre) t
          where n.k like '%'||public.mv_norm_key(t)||'%'
        ) then 2 else -100 end
      ) as score
    from public.bono_produccion_reglas_cuadrilla r
    cross join n
    where p_fecha>=r.vigente_desde
      and (r.vigente_hasta is null or p_fecha<=r.vigente_hasta)
      and n.k like public.mv_norm_key(r.codigo)||'%'
      and (r.termino_plataforma is null or n.k like '%'||public.mv_norm_key(r.termino_plataforma)||'%')
      and exists (
        select 1 from unnest(r.terminos_nombre) t
        where n.k like '%'||public.mv_norm_key(t)||'%'
      )
  )
  select c.tratamiento,
         coalesce(c.valor_punto,
           (select valor from public.bono_produccion_parametros where id='VALOR_PUNTO_NORMAL')
         ) as valor_punto,
         c.id_regla
  from candidatos c
  order by score desc,
           case c.tratamiento when 'PDG' then 1 when 'ESPECIAL' then 2 else 9 end,
           c.id_regla
  limit 1;
$$;

revoke execute on function public.mv_bono_regla_cuadrilla(text,date) from public,anon,authenticated;
grant execute on function public.mv_bono_regla_cuadrilla(text,date) to service_role;

create or replace function public.mv_bono_calcular(
  p_puntos_total numeric,
  p_puntos_pext numeric,
  p_valor_punto numeric
)
returns table(
  genera boolean,
  puntos_produccion numeric,
  puntos_pext numeric,
  puntos_produccion_comisionables numeric,
  puntos_pext_comisionables numeric,
  bono_produccion numeric,
  bono_pext numeric,
  bono_cuadrilla numeric,
  bono_tecnico numeric
)
language sql
stable
security definer
set search_path=public
as $$
with prm as (
  select
    max(valor) filter(where id='MINIMO_BONO') as minimo,
    max(valor) filter(where id='BASE_SIN_BONO') as base,
    max(valor) filter(where id='VALOR_PUNTO_PEXT') as tarifa_pext
  from public.bono_produccion_parametros
),
x as (
  select
    greatest(coalesce(p_puntos_total,0),0) as total,
    greatest(least(coalesce(p_puntos_pext,0),greatest(coalesce(p_puntos_total,0),0)),0) as pext,
    prm.*
  from prm
),
y as (
  select *,
    greatest(total-pext,0) as prod
  from x
),
z as (
  select *,
    case when total+0.000001<minimo then 0 else greatest(prod-base,0) end as prod_com,
    case when total+0.000001<minimo then 0 else greatest(pext-greatest(base-prod,0),0) end as pext_com
  from y
)
select
  (round(prod_com*coalesce(p_valor_punto,30),2)+round(pext_com*tarifa_pext,2))>0 as genera,
  prod,
  pext,
  prod_com,
  pext_com,
  round(prod_com*coalesce(p_valor_punto,30),2),
  round(pext_com*tarifa_pext,2),
  round(prod_com*coalesce(p_valor_punto,30),2)+round(pext_com*tarifa_pext,2),
  round((round(prod_com*coalesce(p_valor_punto,30),2)+round(pext_com*tarifa_pext,2))/2,2)
from z;
$$;

revoke execute on function public.mv_bono_calcular(numeric,numeric,numeric) from public,anon,authenticated;
grant execute on function public.mv_bono_calcular(numeric,numeric,numeric) to service_role;

commit;
