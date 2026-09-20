# Checkpoint Resync Final — 20/09/2026

## Drift vivo actualizado
Conteos sin cabecera:
- ACTAS_ESCANEADAS: 2342 vs PostgreSQL 2294 → +48.
- VALIDACION_TECNICA: 689 vs PostgreSQL 674 → +15.
- PROGRAMACION_DESCANSOS: 723 vs PostgreSQL 705 → +18.
- MAPA_ORDENES: 6788 vs PostgreSQL 6549 → +239.
- CATALOGO_CTO: 6995 vs PostgreSQL 6815 → +180.

Migration 131 actualizó migration_live_source_control con estos cortes.

## Legacy Sync V3
legacy-sync-pilot:
- versión V3-LEGACY-SYNC-FINAL-20260920
- ACTIVE
- JWT obligatorio
- solo JEFATURA / JEFATURA GENERAL.

Acciones de staging:
- crearStaging
- validarStaging
- cancelarStaging

Aplicadores:
- aplicarValidacionTecnica
  - confirmación APLICAR_VALIDACION_TECNICA_STAGING
- aplicarDescansos
  - confirmación APLICAR_DESCANSOS_STAGING
- aplicarActas
  - confirmación APLICAR_ACTAS_STAGING

## Aplicadores transaccionales nuevos
Migration 132:
- mv_sync_apply_actas
- mv_sync_apply_descansos

Reglas:
- run debe estar VALIDATED.
- source_rows == staged_rows.
- no borran registros.
- upsert por clave estable.
- bloquean automáticamente si el destino contiene una fila no-legacy con la misma clave.
- marcan run APPLIED y actualizan conteo de control.

ACTAS:
- clave estable legacy_id.
- conserva estados, validaciones, entrega física, carpeta y Drive link.
- source_kind → LEGACY_SYNC.

DESCANSOS:
- clave estable id.
- conserva versión, validación, comentarios y cambios.
- usa motores existentes de normalización de estado/plataforma.
- source_kind → LEGACY_SYNC.

## UI de Resync Final
Archivo:
- migration/pilot/resync-final-pilot.html

Flujo:
1. usuario carga un Excel actual de MI VISUAL.
2. se leen exclusivamente:
   - VALIDACION_TECNICA
   - PROGRAMACION_DESCANSOS
   - ACTAS_ESCANEADAS
3. se normalizan los campos en navegador.
4. cada módulo crea staging por bloques de 500.
5. validarStaging exige conteo completo.
6. aparece APPLY separado por módulo.
7. ninguna aplicación se ejecuta automáticamente.

VALIDACION_TECNICA:
- soporta los dos encabezados HORA_LIMITE.
- primer HORA_LIMITE → hora_limite.
- segundo HORA_LIMITE → origen_orden si PROPIA/ASIGNADA.
- periodo se deriva de FECHA_REGISTRO.
- puntaje_vtr_gar se toma de la última columna.

## Pruebas
- UI Resync Final: JavaScript válido.
- Administración: JavaScript válido.
- legacy-sync-pilot V3: ACTIVE/JWT.
- Security Advisor: sin nuevos WARN; solo leaked password protection ya conocido.
- Aplicador ACTAS: probado dentro de transacción con fila real.
- Aplicador DESCANSOS: probado dentro de transacción con fila real.
- ROLLBACK completo.
- residuos de prueba: 0.
- conteos después de prueba siguen:
  - Actas 2294
  - Descansos 705
  - Validación 674.

## Importante
No se hizo transferencia directa Drive → Supabase desde conectores.
El resync real debe ejecutarse desde el flujo autenticado de la aplicación usando el Excel cargado por el usuario.
Mapa/CTO quedan para la siguiente etapa porque alimentan el motor de Producción.

## Producción
Sin cambios en:
- main
- Apps Script
- Google Sheets
- Drive
- GitHub Pages productivo.
