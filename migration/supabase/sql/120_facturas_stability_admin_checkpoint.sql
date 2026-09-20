-- 120_facturas_stability_admin_checkpoint.sql
-- Corrección de volatilidad y estado parcial de Administración.

create or replace function public.mv_facturas_estado_visible(p_estado text,p_fecha_hasta date)
returns text
language sql stable
set search_path=public,pg_temp
as $$
  select case
    when p_estado='PENDIENTE' and p_fecha_hasta < (current_timestamp at time zone 'America/Lima')::date then 'VENCIDO'
    else p_estado
  end
$$;

revoke all on function public.mv_facturas_estado_visible(text,date) from public,anon,authenticated;
grant execute on function public.mv_facturas_estado_visible(text,date) to service_role;

update public.migration_live_source_control
set postgres_target='app_users + app_permissions + auth.users + auth-admin-pilot',
    status='PENDIENTE_MIGRACION',
    content_match=null,
    requires_final_resync=true,
    last_audit_at=now(),
    audit_scope='ADMINISTRACION_AUTH_USUARIOS_PERMISOS',
    notes='Contenedor UI de Administración integrado para usuarios/Auth, pero el módulo completo continúa PENDIENTE_MIGRACION. Catálogos, cargas y otras acciones legacy permanecen pendientes y no se consideran migradas.',
    updated_at=now()
where modulo='ADMINISTRACION';
