# Checkpoint integral de migración — 20/09/2026

## Decisión
La migración a Supabase/PostgreSQL continúa siendo viable. No reiniciar. No tocar `main` ni cortar la app Apps Script/Sheets todavía.

## Seguridad corregida
- 52 vistas legacy pasaron a `security_invoker=true`.
- 22 funciones public.* quedaron con `search_path=public,pg_temp`.
- Grants directos de `anon` / `authenticated` sobre `app_users` y vistas public.* fueron revocados.
- Edge Functions continúan como frontera de acceso a datos.
- Security Advisor ya no reporta `security_definer_view` ni `function_search_path_mutable`.
- Pendiente externo: activar Leaked Password Protection en Supabase Auth.
- Las tablas permanecen con RLS habilitado y sin políticas públicas directas por diseño backend-only.

## Convivencia / drift detectado
Auditoría directa contra las hojas productivas activas:
- MAPA_ORDENES: 6786 filas vs PostgreSQL 6549.
- CATALOGO_CTO: 6994 vs 6815.
- ACTAS_ESCANEADAS: 2339 vs 2294.
- VALIDACION_TECNICA: 687 vs 674.
- PROGRAMACION_DESCANSOS: 723 vs 705.
- OBSERVACIONES: 78 vs 78.
- ACTIVIDAD_CAMPO: 72 vs 72.
- CHECKLIST_ALMACEN: 114 vs 114.
- USUARIOS: 80 vs 80.
- PERMISOS legacy: 267. PostgreSQL: 275 = 267 legacy + 8 permisos deliberados del piloto PLANTILLA ORDEN.

Conclusión: mientras la app antigua siga escribiendo, PostgreSQL puede quedar desfasado. No declarar cutover con snapshots viejos.

## Sincronización segura
Se incorporó:
- `migration_sync_runs`
- `migration_sync_staging`
- `mv_migration_sync_status`
- Edge Function `legacy-sync-pilot` V2, JWT obligatorio.
- staging por bloques con hash de fila, conteo e idempotencia por `run_id + source_key`.
- validación obligatoria antes de aplicar.
- cancelación sin tocar tablas operativas.
- primer aplicador específico: `mv_sync_apply_validacion_tecnica`.
- acción Edge `aplicarValidacionTecnica` con confirmación explícita.

Prueba transaccional del staging: 1/1 VALIDATED y rollback correcto.

No se transfirieron automáticamente filas privadas desde Google Drive a Supabase mediante los conectores: el control de seguridad de la plataforma bloqueó esa transferencia directa. Se verificó que no hubo escritura parcial: VALIDACION_TECNICA permanece en 674 filas y no existe run parcial del delta.

## Módulos omitidos/pendientes confirmados
- ASIGNACIONES_CAMPO: detectado como módulo legacy de riesgo alto; añadido al control maestro como PENDIENTE_MIGRACION.
- FACTURAS: pendiente.
- ADMINISTRACION completa: pendiente; Auth/usuarios/permisos no equivalen al módulo completo.
- MATERIALES/UTILIDAD: motor económico parcial; falta cierre funcional/resync.
- Frontend piloto único: pendiente de consolidación; las páginas por módulo siguen siendo harnesses de prueba, no arquitectura final.

## Ranking
Regla definitiva: pesos por período.
Septiembre 2026 vigente: 50 / 20 / 5 / 5 / 5 / 15.
Julio y agosto permanecen protegidos y no se recalculan.

## Archivos/migraciones nuevas de este checkpoint
- 111_ranking_pesos_por_periodo.sql
- 112_security_hardening_views_functions.sql
- 113_live_source_control_audit_20260920.sql
- 114_sync_staging_control.sql
- 115_security_revoke_direct_public_access.sql
- 116_sync_apply_validacion_tecnica.sql
- Edge `legacy-sync-pilot` V2.

## Orden recomendado desde aquí
1. Mantener seguridad backend-only y resolver Leaked Password Protection.
2. Completar aplicadores de sync por módulo sin escribir a ciegas.
3. Construir el shell único del piloto MI VISUAL (un login / un menú / módulos internos).
4. Cerrar módulos omitidos: Asignaciones Campo, Facturas, Administración y cierre Económico/Materiales.
5. Ampliar Auth por perfiles controlados.
6. Resync final de todas las fuentes vivas.
7. Ensayo de cutover y validación móvil/PC.
8. Solo después sustituir Apps Script/Sheets como backend productivo.
