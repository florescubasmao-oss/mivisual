# Validación V497 — Publicador WIN

Fecha: 19/09/2026  
Rama: `migracion-supabase`  
Estado: **LIVE_VALIDAR / SIN CUTOVER PRODUCTIVO**

## Fuente recuperada

Bloque productivo:

- `MI VISUAL V497 - PUBLICADOR WIN ACTIVO DESDE AGOSTO 2026`
- Base validada V487.12.
- Integrado posteriormente en V503.

Reglas preservadas:

- Julio 2026 y anteriores congelados.
- `OrdenId` es la llave única.
- WIN / MAPA_ORDENES es fuente oficial.
- Partner es auxiliar y no reemplaza ejecutor WIN.
- Partner conserva uso puntual para RESERVA y correcciones previamente validadas.
- VTR/GAR nunca aporta Producción.
- VTR/GAR gestionado se conserva.
- WIN agrega únicamente VTR/GAR nuevos como PENDIENTE.
- Cada publicación reconstruye solo el período solicitado.
- Producción bloquea publicación si existe una orden elegible sin partida confiable.
- Publicación requiere confirmación explícita `PUBLICAR_V487_CONFIRMADO`.

## Diferencia técnica Apps Script vs PostgreSQL

Apps Script toma snapshots de seis hojas y las restaura ante error.

PostgreSQL usa una sola transacción:

1. PREVISUALIZAR.
2. Validar período y Producción.
3. Advisory lock por período.
4. Crear snapshot de publicación.
5. Snapshot Producción.
6. Snapshot Efectividad.
7. Snapshot Recableado.
8. Snapshot VTR/GAR.
9. Agregar VTR/GAR nuevos como PENDIENTE.
10. Refrescar caches Ranking/Dashboard.
11. COMMIT.

Si falla cualquier paso, PostgreSQL realiza rollback de toda la transacción.

## Migraciones

- `105_publicador_win_v497.sql`
- `106_publicador_win_v497_sede_fix.sql`

Commits:

- V497 base: `478d99855b4dc8b00a377fbdd0e89adf57fd6d17`
- Fix REGION legacy -> `ordenes.sede`: `3a99a01f6c5e5aedbb478b832358ed2c65646082`

## Tablas de publicación

- `publicador_win_publicaciones`
- `publicador_win_produccion_snapshot`
- `publicador_win_efectividad_snapshot`
- `publicador_win_recableado_snapshot`
- `publicador_win_vtrgar_snapshot`
- `vtr_gar_detectados_postgresql`

Vistas:

- `mv_publicador_win_ultima_v497`
- `mv_publicador_win_produccion_actual_v497`
- `mv_publicador_win_efectividad_actual_v497`
- `mv_publicador_win_recableado_actual_v497`
- `mv_publicador_win_vtrgar_actual_v497`
- `mv_vtr_gar_pendientes_v497`

Funciones:

- `mv_publicador_win_validar_periodo_v497`
- `mv_publicador_win_preview_v497`
- `mv_publicador_win_publicar_v497`

## VTR/GAR

No se escribe en `vtr_gar_clasificacion_legacy`.

Los nuevos casos WIN se almacenan en:

- `vtr_gar_detectados_postgresql`
- estado inicial: `PENDIENTE`
- llave: `orden_id`
- clave: `WIN|orden_id`

`mv_vt_gar_vtr_contexto_ticket` ya incluye esta cola para que los tickets nuevos puedan formar parte del contexto GAR/VTR sin contaminar el snapshot histórico.

Las decisiones legacy existentes conservan prioridad.

## Previsualización 19/09/2026 — septiembre

Fuente WIN actual:

- filas del período: 1,796
- OrdenId únicos: 1,796
- corte de estado: 18/09/2026 01:21
- última importación: 18/09/2026 07:05

Producción:

- 1,080 órdenes elegibles
- 1,925 puntos
- 679 filas agrupadas cuadrilla/fecha/partida
- 0 órdenes sin partida
- 43 VTR/GAR excluidos de Producción
- PREVALIDACIÓN: correcta

Efectividad:

- finalizadas: 1,109
- canceladas: 341
- regestiones: 48
- reprogramadas: 240
- total evaluable: 1,738
- no evaluables: 58
- efectividad: 63.81 %

Recableado:

- LOS Rojo finalizadas: 244
- recableados: 153
- porcentaje: 62.70 %

VTR/GAR:

- GAR: 1
- VTR: 8
- total confirmado/reasignado: 9
- indicador: 0.81 %
- PENDIENTE legacy: 20
- nuevos pendientes WIN actualmente: 0

Esto valida que V497 no duplicaría los casos GAR/VTR ya existentes.

## Prueba transaccional

Se ejecutó la publicación de septiembre dentro de una transacción con ROLLBACK.

Primer intento:
- detectó correctamente un mapeo legacy `REGION` que en PostgreSQL corresponde a `ordenes.sede`.
- la operación falló sin dejar registros.

Después del fix:
- publicación completa ejecutada dentro de transacción.
- rollback final aplicado.

Estado posterior:

- publicaciones: 0
- snapshots Producción: 0
- snapshots Efectividad: 0
- snapshots Recableado: 0
- snapshots VTR/GAR: 0
- pendientes PostgreSQL: 0

No quedó residuo de pruebas.

## Seguridad

- RLS activo en las 6 tablas V497.
- 0 privilegios directos `anon` / `authenticated`.
- Funciones de escritura solo `service_role`.

Edge Function:

- `publicador-win-pilot`
- ACTIVE v1
- JWT obligatorio
- Publicación limitada a JEFATURA / JEFATURA GENERAL.

Acciones compatibles con Apps Script:

- `previsualizarPublicacionIndicadoresWinV487`
- `publicarIndicadoresWinV487`
- `estadoPublicadorIndicadoresWinV487`

## Piloto web

Archivo:

- `migration/pilot/publicador-win-pilot.html`

Commit:

- `f2ead7b9e95f9f3a0b4bcd00b6713f11ba84469e`

JavaScript validado sintácticamente.

Flujo:

1. Login.
2. Elegir período.
3. Previsualizar.
4. Revisar Producción/Efectividad/Recableado/VTR-GAR.
5. Confirmar revisión.
6. Escribir `PUBLICAR`.
7. Publicar período piloto.

## Situación de fuentes

V497 ya está portado como publicador/snapshot del piloto, pero las vistas actuales de Producción/Efectividad/Recableado/VTR-GAR siguen siendo motores derivados en tiempo real.

No se sustituirán por los snapshots V497 hasta completar:

- prueba Auth real con Jefatura;
- comparación de una publicación piloto real;
- conciliación contra legacy al mismo corte;
- resync final antes del cutover.

Por ahora Apps Script, Sheets, Drive y `main` continúan sin cambios.
