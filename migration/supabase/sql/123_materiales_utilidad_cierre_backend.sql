-- 123_materiales_utilidad_cierre_backend.sql
-- 20/09/2026
-- Normaliza catálogo de materiales y formaliza los motores de Materiales / Utilidad Cuadrilla.

create or replace view public.mv_economico_catalogo_materiales_limpio
with (security_invoker=true) as
select
  source_row,
  trim(material) as material,
  precio_unitario,
  upper(trim(estado)) as estado,
  observacion,
  imported_at
from public.economico_catalogo_materiales_snapshot
where coalesce(trim(material),'')<>''
  and upper(trim(coalesce(estado,''))) in ('ACTIVO','PENDIENTE')
  and upper(trim(material))<>'MATERIAL';

create or replace view public.mv_economico_materiales_lotes
with (security_invoker=true) as
select
  lote_importacion as lote,
  min(fecha) as fecha_min,
  max(fecha) as fecha_max,
  min(fecha_importacion) as fecha_importacion,
  min(usuario_importacion) as usuario_importacion,
  count(*)::integer as filas,
  count(distinct cuadrilla)::integer as cuadrillas,
  count(distinct material)::integer as materiales_distintos,
  round(sum(coalesce(costo_total,0)),2) as costo_total
from public.economico_materiales_snapshot
where coalesce(trim(lote_importacion),'')<>''
group by lote_importacion;

create or replace view public.mv_economico_materiales_resumen_periodo
with (security_invoker=true) as
select
  to_char(fecha,'YYYY-MM') as periodo,
  round(sum(coalesce(costo_total,0)),2) as costo_total,
  count(*)::integer as filas,
  count(distinct public.mv_norm_key(cuadrilla))::integer as cuadrillas,
  count(distinct material)::integer as materiales_distintos,
  min(fecha) as fecha_min,
  max(fecha) as fecha_max,
  max(fecha_importacion) as ultima_importacion
from public.economico_materiales_snapshot
where fecha is not null
group by 1;

revoke all on public.mv_economico_catalogo_materiales_limpio from anon,authenticated;
revoke all on public.mv_economico_materiales_lotes from anon,authenticated;
revoke all on public.mv_economico_materiales_resumen_periodo from anon,authenticated;
grant select on public.mv_economico_catalogo_materiales_limpio to service_role;
grant select on public.mv_economico_materiales_lotes to service_role;
grant select on public.mv_economico_materiales_resumen_periodo to service_role;

update public.migration_live_source_control
set postgres_target='economico_materiales_snapshot + mv_economico_catalogo_materiales_limpio + mv_economico_materiales_cuadrilla',
    source_mode='SHEET_LIVE_SNAPSHOT',
    status='LIVE_VALIDAR',
    sheet_rows=1392,
    postgres_rows=(select count(*) from public.economico_materiales_snapshot),
    content_match=null,
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='CONTEO_COMPLETO + MUESTRA_PRIMEROS_ULTIMOS + CATALOGO_LIMPIO',
    notes='CONSUMO_MATERIALES coincide en 1392 filas al corte y muestras de extremos coinciden. Catálogo operativo filtra filas de texto/cabecera; TELEFONO permanece PENDIENTE sin precio. IMPORTAR_MATERIALES legacy sigue siendo fuente viva y requiere resync/cutover controlado.',
    updated_at=now()
where modulo='MATERIALES';

update public.migration_live_source_control
set postgres_target='mv_economico_utilidad_migracion + mv_economico_resumen_periodo + economico_resumen_protegido_snapshot',
    source_mode='DERIVED_POSTGRES',
    status='LIVE_VALIDAR',
    content_match=null,
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='MOTOR_UTILIDAD_ACTIVO + RESUMEN_HISTORICO_PROTEGIDO',
    notes='Utilidad Cuadrilla ya tiene motor PostgreSQL para período activo. Julio/agosto usan resumen protegido; detalle monetario histórico por cuadrilla sigue bloqueado hasta snapshot monetario inmutable. Requiere resync de gastos/materiales/producción antes de cutover.',
    updated_at=now()
where modulo='UTILIDAD_CUADRILLA';
