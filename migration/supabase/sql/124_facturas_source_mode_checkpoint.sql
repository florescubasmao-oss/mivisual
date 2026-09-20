-- 124_facturas_source_mode_checkpoint.sql
-- Facturas tiene backend piloto, pero la fuente productiva legacy sigue siendo Sheets hasta cutover.
update public.migration_live_source_control
set source_mode='SHEET_LIVE_SNAPSHOT',
    status='LIVE_VALIDAR',
    requires_final_resync=true,
    notes='Backend PostgreSQL/Edge/UI listo en piloto. Hojas legacy estaban vacías al corte pero Apps Script continúa operativo; antes de cutover se debe verificar nuevamente FACTURAS_PENDIENTES/FACTURAS_DETALLE y congelar escritura legacy.',
    updated_at=now()
where modulo='FACTURAS';
