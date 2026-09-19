# Validación de migración — Actividad en Campo

Fecha de auditoría: 19/09/2026  
Rama: `migracion-supabase`  
Producción legacy: continúa activa en Google Sheets / Drive.

## Estado

- Hoja viva: `ACTIVIDAD_CAMPO`.
- Registros conciliados: 72/72.
- Diferencias contra snapshot PostgreSQL: 0.
- IDs duplicados: 0.
- Auditorías con JSON/puntaje: 47.
- Recalculo PostgreSQL de auditorías: 47/47 sin diferencias semánticas.
- Registros PostgreSQL de prueba persistentes: 0.
- Eventos PostgreSQL de prueba persistentes: 0.
- `migration_live_source_control`: `OK_AUDITADO`.
- `requires_final_resync=true` hasta cutover.

## Lógica preservada

- `SUPERVISION EN CALIENTE` se conserva como valor histórico y se interpreta como `AUDITORIA EN CALIENTE`.
- Auditoría: pesos 40/20/20/20.
- Seguridad crítica: `uso_epp` o `trabajo_seguro` en NO CUMPLE fuerza clasificación `CRITICO`.
- Supervisor solo registra cuadrillas de su sede.
- Lectura de Supervisor: solo actividades registradas por ese Supervisor.
- Jefatura/Admin: lectura global según lógica legacy.
- Búsqueda de datos de auditoría usa `ordenes` y `vtr_gar_clasificacion_legacy`.
- `CHECKLIST` crea Checklist Almacén y Actividad dentro de la misma transacción.

## Evidencias

- Bucket privado: `mi-visual-evidencias`.
- Límite: 10 MB.
- MIME: JPEG, PNG, WEBP, HEIC, HEIF, PDF.
- Edge Function: `evidencias-pilot` V1, JWT obligatorio.
- La app legacy continúa usando Drive hasta el cutover.

## SQL versionado

- 068_actividad_campo_modelo.sql
- 069_actividad_campo_lecturas.sql
- 070_actividad_campo_cuadrillas_alias_fix.sql
- 071_actividad_campo_busqueda_fuente_fix.sql
- 072_actividad_campo_transacciones_core.sql
- 077_actividad_campo_checklist_integracion.sql
- 078_evidencias_storage_bucket.sql

## Seguridad

- RLS activo en tablas del módulo.
- Sin privilegios directos para `anon` / `authenticated`.
- Funciones `mv_actividad_*` con `search_path=public`.
- Vistas con `security_invoker=true`.
- Security Advisor: solo aviso informativo `rls_enabled_no_policy`, coherente con acceso exclusivo por backend/service_role.

## Cutover

Antes de cambiar la UI:
1. Releer las 44 columnas de `ACTIVIDAD_CAMPO`.
2. Aplicar delta por ID/source_row.
3. Recalcular nuevamente las auditorías nuevas.
4. Confirmar 0 diferencias.
5. Cambiar API/UI a PostgreSQL + `evidencias-pilot`.
