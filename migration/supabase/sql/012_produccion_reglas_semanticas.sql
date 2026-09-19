-- MI VISUAL - Produccion: reglas semanticas mejoradas
-- Reglas explicitas para huecos de V513. Solo motor de migracion.
-- No modifica Google Sheets ni Produccion productiva.

begin;

create table if not exists public.reglas_partida_semanticas_migracion (
  id_regla text primary key,
  familia_servicio text not null,
  tipo_trabajo_norm text not null,
  motivo_norm text not null,
  codigo_partida text not null,
  origen text not null default 'MIGRACION_MEJORADA',
  estado text not null default 'ACTIVA_MIGRACION',
  observacion text,
  created_at timestamptz not null default now()
);

insert into public.reglas_partida_semanticas_migracion
(id_regla,familia_servicio,tipo_trabajo_norm,motivo_norm,codigo_partida,observacion)
values
('MIG-P-001','RESIDENCIAL','RECABLEADO','RECABLEADOPOSTVENTA','SRPV','Postventa residencial: servicio completo de recableado.'),
('MIG-P-002','CONDOMINIO','LOSROJO','RECABLEADOAVERIADOPORTERCEROS','SRCONDO','Visita tecnica en condominio: recableado completo.'),
('MIG-P-003','RESIDENCIAL','LOSROJO','RECABLEADOCORTEMUNICIPAL','SRV','Visita tecnica residencial: recableado completo.'),
('MIG-P-004','RESIDENCIAL','1MESH','ENTREGACONFIG1MESH','MESHPV','Entrega y configuracion de un MESH postventa.'),
('MIG-P-005','RESIDENCIAL','CABLEADOMESH1MESH','CABLEADOMESHENTREGAYCONFIG1MESHPOSTVENTA','UTPM5MESH1','Cableado UTP postventa mas un MESH.'),
('MIG-P-006','RESIDENCIAL','DESCARTEDETELEFONO','CAMBIODEPHONOWIN','FONO','Cambio efectivo de Fono WIN.'),
('MIG-P-007','CONDOMINIO','1MESH','ENTREGACONFIG1MESH','MESHPV','Entrega y configuracion de un MESH postventa.'),
('MIG-P-008','CONDOMINIO','DEGRADACIONDEPOTENCIAS','CAMBIODEONTNOSINCRONIZANOEMITESENAL','ONT','Cambio efectivo de ONT.'),
('MIG-P-009','CONDOMINIO','INTERMITENCIALOSROJO','RECABLEADOAVERIADOPORTERCEROS','SRCONDO','Visita tecnica en condominio: recableado completo.'),
('MIG-P-010','RESIDENCIAL','CABLEADOMESH2MESH','CABLEADOMESHENTREGAYCONFIG2MESHPOSTVENTA','CAT6MESH2','Cableado postventa mas dos MESH.'),
('MIG-P-011','RESIDENCIAL','INTERMITENCIALOSROJO','RECABLEADOAVERIADOPORCLIENTE','SRV','Visita tecnica residencial: recableado completo.'),
('MIG-P-012','RESIDENCIAL','INTERMITENCIALOSROJO','RECABLEADOCORTEMUNICIPAL','SRV','Visita tecnica residencial: recableado completo.'),
('MIG-P-013','RESIDENCIAL','LOSROJO','RECABLEADOAVERIADOPORCLIENTE','SRV','Visita tecnica residencial: recableado completo.'),
('MIG-P-014','RESIDENCIAL','MEJORATECNOLOGICAONT','CAMBIODEONTMEJORATECNOLOGICAPOSTVENTA','ONT','Cambio efectivo de ONT por mejora tecnologica.')
on conflict (id_regla) do update set
  familia_servicio=excluded.familia_servicio,
  tipo_trabajo_norm=excluded.tipo_trabajo_norm,
  motivo_norm=excluded.motivo_norm,
  codigo_partida=excluded.codigo_partida,
  observacion=excluded.observacion;

create unique index if not exists reglas_partida_semanticas_migracion_match_idx
  on public.reglas_partida_semanticas_migracion
  (familia_servicio,tipo_trabajo_norm,motivo_norm)
  where estado='ACTIVA_MIGRACION';

alter table public.reglas_partida_semanticas_migracion enable row level security;
revoke all on table public.reglas_partida_semanticas_migracion from anon,authenticated;

create or replace view public.mv_produccion_partida_motor_migracion_v1 as
select
  p.*,
  hs.codigo as partida_historica_segura,
  sm.id_regla as regla_semantica_id,
  sm.codigo_partida as partida_semantica,
  coalesce(
    p.partida_preliminar,
    hs.codigo,
    sm.codigo_partida
  ) as partida_motor,
  case
    when p.partida_preliminar is not null then p.origen_partida_preliminar
    when hs.codigo is not null then 'REGLA_HISTORICA_SEGURA'
    when sm.codigo_partida is not null then 'REGLA_SEMANTICA_MIGRACION'
    else 'REVISION_JEFATURA'
  end as origen_partida_motor
from public.mv_produccion_partida_preliminar_v1 p
left join public.mv_produccion_reglas_historicas_seguras_v1 hs
  on hs.motivo_norm=public.mv_norm_key(p.motivo_finalizacion)
left join public.reglas_partida_semanticas_migracion sm
  on sm.estado='ACTIVA_MIGRACION'
 and sm.familia_servicio=p.familia_servicio
 and sm.tipo_trabajo_norm=public.mv_norm_key(p.tipo_trabajo)
 and sm.motivo_norm=public.mv_norm_key(p.motivo_finalizacion);

commit;
