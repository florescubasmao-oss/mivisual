# Coexistencia viva y Resync incremental — 20/09/2026

## Regla operativa

MI VISUAL legacy sigue en producción y continúa modificando Google Sheets. Por tanto ningún snapshot previo al freeze es definitivo.

Estrategia:
1. legacy continúa escribiendo Sheets;
2. PostgreSQL se mantiene como destino de migración;
3. las fuentes aptas usan captura GET de solo lectura hacia staging;
4. toda captura pasa por preview;
5. APPLY es explícito, nunca automático;
6. se repite el delta antes del cutover;
7. en el freeze final se detienen escrituras legacy, se captura el último delta, se comparan campos mutables y recién entonces se cambia la fuente operativa.

## Corte vivo verificado

Fuente: Google Sheet APP CUADRILLAS WIN.

- MAPA_OPERATIVO: Sheets 6790 / PostgreSQL 6549 / delta +241
- CATALOGO_CTO: 6995 / 6815 / +180
- VALIDACION_TECNICA: 690 / 674 / +16
- ACTAS: 2355 / 2294 / +61
- PROGRAMACION_DESCANSOS: 723 / 705 / +18
- OBSERVACIONES: 80 / 78 / +2
- PEXT_CONJUNTA: 30 / 28 / +2
- ASIGNACIONES_CAMPO: 4 / 0 / +4

Todos continúan con requires_final_resync=true.

## Captura viva implementada

### Mapa
legacy-sync-pilot V6+:
- GET listarMapaOperativo;
- solo período abierto;
- rechaza período protegido;
- staging exacto;
- preview obligatorio;
- APPLY explícito;
- backup/rollback existente;
- preserva fecha_importacion y usuario_importacion de filas existentes.

SQL:
- 144_sync_mapa_preserve_import_metadata.sql

### Actas
legacy-sync-pilot V7:
- GET listarActasEscaneadas;
- staging completo;
- preview obligatorio;
- bloquea cambios exclusivos PostgreSQL;
- bloquea PDF Supabase Storage;
- bloquea choque Código de Orden / Número de Acta / Drive ID;
- APPLY vuelve a ejecutar el guard.

SQL:
- 145_sync_actas_preview_conflict_guard.sql

QA Actas:
- legacy normal => puedeAplicar true;
- misma fila simulada como POSTGRESQL => puedeAplicar false;
- APPLY bloqueado;
- todo con ROLLBACK.

## Fuentes que NO se automatizan por GET todavía

VALIDACION_TECNICA:
- listarValidacionTecnica puede ejecutar vencimientos automáticos;
- no expone PUNTAJE_VTR_GAR;
- no usar como dump read-only.

PROGRAMACION_DESCANSOS:
- GET devuelve proyección vigente colapsada y solo historial inicial limitado;
- no representa todas las filas fuente.

CATALOGO_CTO:
- endpoint existente es geográfico y limitado, no un dump completo.

Estas fuentes siguen por snapshot Excel/hoja y delta final hasta disponer de una ruta de lectura pura y completa.

## Snapshot Drive

Se exportó APP CUADRILLAS WIN a XLSX como snapshot de trabajo.
La exportación es solo lectura y no altera la hoja productiva.

## Importante

La implementación de captura viva está lista, pero su ejecución requiere una sesión Supabase Auth real de Jefatura. No se creó bypass JWT ni endpoint administrativo abierto.
