# Validación de migración — Checklist Almacén

Fecha de auditoría: 19/09/2026  
Rama: `migracion-supabase`  
Producción legacy: continúa activa en Google Sheets / Drive.

## Estado

- Hoja viva: `CHECKLIST_ALMACEN`.
- Registros conciliados: 114/114.
- Diferencias contra snapshot PostgreSQL: 0.
- Esquema efectivo V141: 83 columnas.
- Históricos: fallback `MATERIALES`.
- Filas con `TIPO_CHECKLIST=MATERIALES` explícito: 94.
- Catálogo de herramientas: 28.
- `HERRAMIENTAS_DETALLE` histórico: 0 filas.
- Registros PostgreSQL de prueba persistentes: 0.
- Eventos PostgreSQL de prueba persistentes: 0.
- `migration_live_source_control`: `OK_AUDITADO`.
- `requires_final_resync=true` hasta cutover.

## Tipos V141

- MATERIALES
- HERRAMIENTAS
- UNIDAD VEHICULAR
- DOCUMENTACION
- EPP

## Matriz de acceso preservada

- Técnico: registra su cuadrilla y ve su cuadrilla.
- Supervisor: registra desde Actividad en Campo; ve su sede; valida Unidad Vehicular, Documentación y EPP.
- Almacén: ve su sede y valida Materiales/Herramientas.
- Jefatura de Almacén: validación final de Materiales/Herramientas.
- Jefatura/Admin: alcance general; validación operativa según lógica legacy.

## Validaciones preservadas

- Unicidad: cuadrilla + fecha de gestión + tipo de checklist.
- Herramientas: cantidad > 0; estado BUENO/REGULAR/MALO; motivo obligatorio en REGULAR/MALO; foto obligatoria en MALO.
- Unidad: 9 evidencias obligatorias.
- Documentación: fechas de vencimiento + licencia frente/reverso + SOAT + revisión técnica.
- EPP: personal completo + botas + fotocheck.
- Estados de Almacén/Jefatura/Supervisor reproducidos desde V141.
- Cálculo de vencimiento: VENCIDO / PROXIMO A VENCER / VIGENTE / NO APLICA.

## Evidencias

- Bucket privado: `mi-visual-evidencias`.
- Edge Function: `evidencias-pilot` V1, JWT obligatorio.
- La app legacy continúa usando Drive hasta el cutover.

## SQL versionado

- 073_checklist_almacen_modelo.sql
- 074_checklist_almacen_lecturas_validacion.sql
- 075_checklist_almacen_item_json_fix.sql
- 076_checklist_almacen_transacciones.sql
- 077_actividad_campo_checklist_integracion.sql
- 078_evidencias_storage_bucket.sql

## Seguridad

- RLS activo.
- Sin acceso directo de `anon` / `authenticated`.
- Funciones `mv_checklist_*` con `search_path=public`.
- Vista principal con `security_invoker=true`.
- Bucket privado; archivos servidos mediante URL firmada por Edge Function.

## Cutover

Antes de cambiar la UI:
1. Releer A:CE de `CHECKLIST_ALMACEN`.
2. Releer `HERRAMIENTAS_DETALLE` y `CATALOGO_HERRAMIENTAS`.
3. Aplicar solo delta.
4. Confirmar 0 diferencias y 0 duplicados.
5. Cambiar subida de Drive a `evidencias-pilot`.
6. Cambiar lecturas/escrituras a PostgreSQL.
