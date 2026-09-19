# Dashboard y convivencia con la app productiva – Validación 19/09/2026

## Estado
**DASHBOARD backend/lógica: CERRADO.**

**Sincronización de convivencia: ABIERTA hasta el cutover.**

La app productiva de MI VISUAL continúa operando sobre Apps Script + Google Sheets. Por lo tanto, mientras no se realice el cutover, las hojas productivas siguen siendo fuentes vivas y pueden cambiar después de cada snapshot.

No se modificó `main`, Google Sheets ni el Apps Script productivo durante esta validación.

## Migraciones aplicadas
- 049_dashboard_descansos_bridge.sql
- 050_dashboard_legacy_snapshot.sql
- 051_dashboard_componentes_consolidados.sql
- 052_dashboard_motor_actual.sql
- 053_dashboard_fast_path.sql
- 054_dashboard_cache_materializada.sql
- 055_dashboard_salida_final.sql
- 056_migration_live_source_control.sql
- 057_live_delta_sync_20260919.sql

## Arquitectura final de Dashboard
El Dashboard PostgreSQL no recalcula Ranking por separado.

Fuente única:
`mv_ranking_motor_migracion -> dashboard_ranking_cache -> mv_dashboard_actual_cache -> mv_dashboard_migracion`.

Esto evita diferencias entre la pantalla de Ranking y el Dashboard.

### Histórico
- Julio 2026: 27 cuadrillas, protegido.
- Agosto 2026: 26 cuadrillas, 24 recuperadas del Dashboard histórico + 2 históricas válidas reconstruidas.
- Septiembre 2026: 33 cuadrillas desde PostgreSQL/cache.

La antigua hoja RESUMEN_DASHBOARD_RANKING tenía:
- Julio: 36 filas.
- Agosto: 32 filas.
- Septiembre: 32 filas.

Las filas adicionales legacy provenían del mapa de usuarios vigente en el momento de construir el resumen y no representan necesariamente el universo operativo del período. El motor migrado usa el universo validado de Ranking por período.

## Fast path
Se detectó que ensamblar todos los JSON de detalle de Producción/SLA/indicadores en cada carga era costoso.

Se implementó:
- KPI y Ranking desde cache directa.
- Detalles pesados bajo demanda.
- `mv_dashboard_produccion_detalle`
- `mv_dashboard_efectividad_detalle`
- `mv_dashboard_recableado_detalle`
- `mv_dashboard_vtrgar_detalle`
- `mv_dashboard_observaciones_detalle`
- `mv_dashboard_sla_detalle`

La consulta principal ya no debe reconstruir todos los detalles para todas las cuadrillas en cada apertura.

## Cumplimiento diario / Descansos
Dashboard necesita PROGRAMACION_DESCANSOS para:
- días en campo;
- descanso;
- vacaciones;
- campo bolsa;
- días sin programación;
- meta acumulada.

Se cargó un bridge read-only:
- 705 registros de PROGRAMACION_DESCANSOS.
- 91 registros personales, que la lógica de cuadrillas excluye.
- 610 registros aprobados de cuadrilla antes de deduplicación por fecha/versión.

El módulo completo de Descansos todavía no está migrado. El bridge existe únicamente para reproducir el Dashboard.

Histórico:
- Julio/agosto conservan el resumen histórico porque la programación productiva recibió correcciones posteriores.
- Septiembre/futuro usan el bridge actual.

## Corte de septiembre
No se cambia el corte a 18/09/2026.

PostgreSQL contiene 42 órdenes con fecha de ejecución 18/09/2026, pero las 42 están:
`ESTADO_NO_FINALIZADO`.

La regla productiva del Dashboard usa la última fecha con Producción elegible. Por ello el corte 17/09/2026 es correcto hasta que existan órdenes finalizadas/elegibles del día 18.

## Resultado septiembre
- Cuadrillas: 33
- Producción: 1,925 puntos
- Observaciones: 21
- Monto total observaciones: S/ 4,130
- Monto afectado: S/ 1,618

Ranking se conserva sin cambios después de las optimizaciones y del delta de catálogo.

## Convivencia con la app antigua
Se confirmó que el Apps Script productivo no tiene actualmente:
- llamadas `UrlFetchApp.fetch` hacia Supabase;
- URL de Supabase;
- shadow-write a PostgreSQL.

Por lo tanto, los cambios hechos en módulos que siguen escribiendo en Sheets NO pasan automáticamente a Supabase.

Se creó:
- `migration_live_source_control`
- `mv_migration_live_source_status`

Cada módulo queda marcado como:
- LIVE_POSTGRES
- DERIVED_POSTGRES
- SHEET_LIVE_SNAPSHOT
- HISTORICO_PROTEGIDO
- PENDIENTE_MIGRACION

Además se registra:
- última auditoría;
- filas Sheet;
- filas PostgreSQL;
- comparación de contenido;
- necesidad de resincronización antes del cutover.

## Auditoría de fuentes vivas 19/09/2026

### Observaciones
- Sheet: 78
- PostgreSQL: 78
- Diferencias: 0
- Campos verificados: estado, monto, descargo y evidencia.

### Validación Técnica
- Sheet: 674
- PostgreSQL: 674
- Diferencias: 0
- Campos verificados: estado, resultado, validador, perfil, motivo y puntaje GAR/VTR.

### Actas
- Sheet: 2,294
- PostgreSQL: 2,294
- Diferencias: 0
- Se verificaron validaciones Almacén/Jefatura, entrega física, versión y estado de carpeta.

### Programación de Descansos
- Sheet: 705
- Snapshot Dashboard: 705
- Recargado directamente desde la hoja.

### Usuarios
- Sheet: 80
- PostgreSQL: 80
- Se detectaron 2 nombres faltantes en PostgreSQL:
  - P23VISUALSGI -> Jorge Martin Espinoza Franco
  - P23VISUALSGI2 -> Harold Hiomar Herrera Zapata
- Corregidos únicamente en Supabase.
- Resto de campos operativos conciliados.

### Permisos
- Sheet: 267
- PostgreSQL: 267
- Diferencias semánticas: 0
- SI/NO de Sheets se comparó contra TRUE/FALSE de PostgreSQL.

### Config módulos
- Sheet: 2
- PostgreSQL: 2
- Diferencias semánticas: 0.

### Catálogo de órdenes
- Sheet: 33
- PostgreSQL: 33

Se detectaron 6 montos recientes que estaban nulos/S/0 en Supabase:
- source_row 29: S/90
- source_row 30: S/90
- source_row 31: S/90
- source_row 32: S/312
- source_row 33: S/270
- source_row 34: S/90

Fueron sincronizados en la migración 057.

No cambiaron:
- código;
- tipo;
- plataforma;
- puntaje;
- grupo.

Resultado:
- Producción septiembre sigue en 1,925 puntos.
- Ranking conserva las mismas posiciones.
- La capa tarifaria reconoce los montos como vigentes.

### Configuración Ranking
- 3/3 filas.
- 0 diferencias frente al snapshot productivo.
- Septiembre productivo sigue en:
  - Producción 50%
  - Efectividad 20%
  - SLA 5%
  - Observaciones 5%
  - Recableado 5%
  - VTR/GAR 15%

Esto se conserva como snapshot productivo y no debe sobrescribir silenciosamente una configuración distinta del motor migrado.

### Parámetros SLA
- 56/56.
- 0 diferencias semánticas.

## Estado general de fuentes
Al finalizar esta auditoría:
- 10 módulos: OK_AUDITADO.
- 7 módulos: LIVE_VALIDAR.
- 1 módulo: HISTORICO_PROTEGIDO.
- 1 módulo: REQUIERE_RESYNC_FINAL.
- 9 módulos: PENDIENTE_MIGRACION.

Módulos todavía pendientes de migración funcional:
- Actividad en Campo
- Checklist Almacén
- Equipos Averiados
- PEXT / Trabajos Conjunta
- Materiales
- Mesa de Ayuda
- Bonos Supervisores
- Seguridad
- Facturas

Análisis Económico está parcialmente migrado pero requiere resincronización final de sus fuentes.

## Regla obligatoria hasta cutover
Mientras la app anterior siga activa:

1. No asumir que un snapshot permanece actual.
2. Antes de cerrar un módulo, comparar la fuente viva con PostgreSQL.
3. Antes del cutover, ejecutar resincronización/delta final de todos los registros con `requires_final_resync=true`.
4. Después del delta final, recalcular caches/indicadores derivados.
5. Validar conteos y campos mutables.
6. Recién entonces bloquear la escritura de la app antigua y cambiar el frontend a PostgreSQL.

## Seguridad
Nuevas tablas/vistas de Dashboard y control de fuentes:
- RLS habilitado donde corresponde.
- 0 grants directos a `anon`.
- 0 grants directos a `authenticated`.
- Acceso backend mediante `service_role`.

## Conclusión
La lógica del Dashboard queda cerrada.

La migración completa todavía no está lista para cutover porque la aplicación Apps Script/Sheets continúa activa y existen módulos funcionales pendientes.

El control de convivencia evita que un módulo sea considerado actualizado únicamente por haber sido importado una vez.
