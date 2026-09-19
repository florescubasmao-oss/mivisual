# Validación Equipos Averiados — V399 / V537

Fecha: 19/09/2026
Rama: `migracion-supabase`
Estado: **LIVE_VALIDAR / SIN CUTOVER PRODUCTIVO**

## Fuente productiva

Hojas:
- `EQUIPOS_AVERIADOS`
- `CARGOS_EQUIPOS_AVERIADOS`

Código vigente recuperado: V267 + endurecimiento V399 + optimizaciones V537.

## Reglas preservadas

- Técnico registra de 1 a 8 equipos.
- Tipos permitidos:
  - ONT HUAWEI
  - ONT ZTE
  - MESH HUAWEI
  - MESH ZTE
  - WINBOX
  - TELEFONO
- Cada equipo exige SN y MAC.
- No se permiten series repetidas dentro de una misma solicitud.
- Almacén puede crear una solicitud pendiente para un Técnico.
- Responsable de Almacén opera solo su sede.
- Jefatura de Almacén opera Zona Norte.
- Técnico puede completar su solicitud.
- Si hubo recepción parcial, los equipos ya RECIBIDOS no se pierden ni vuelven a pendiente al completar.
- Recepción por equipo: PENDIENTE / RECIBIDO / OBSERVADO / RECHAZADO.
- Estado general:
  - RECIBIDO POR ALMACEN
  - RECIBIDO PARCIALMENTE
  - OBSERVADO
  - RECHAZADO
  - PENDIENTE DE ENTREGA
- Solo Jefatura de Almacén puede revertir una recepción a pendiente.
- El cargo anterior permanece en el historial.

## Idempotencia V399

Se preservó la lógica de `SOLICITUD_ID_CLIENTE` / `ULTIMA_SOLICITUD_ID_RECEPCION`.

PostgreSQL usa:
- advisory lock por solicitud;
- índice único parcial sobre `solicitud_id_cliente`;
- operación persistida en el cargo;
- estado `PENDIENTE_PDF` antes de aplicar la recepción;
- finalización posterior del cargo/recepción;
- reintentos con la misma solicitud no crean un segundo cargo.

## Modelo PostgreSQL

Tablas:
- `equipos_averiados_solicitudes_migracion`
- `equipos_averiados_cargos_migracion`

Vistas:
- `mv_ea_solicitudes_v1`
- `mv_ea_cargos_v1`

Funciones:
- `mv_ea_norm_tipo`
- `mv_ea_normalizar_equipos`
- `mv_ea_historial_agregar`
- `mv_ea_nuevo_id`
- `mv_ea_registrar_tecnico`
- `mv_ea_crear_solicitud_almacen`
- `mv_ea_completar_tecnico`
- `mv_ea_preparar_recepcion_v399`
- `mv_ea_finalizar_recepcion_v399`
- `mv_ea_verificar_recepcion_v399`
- `mv_ea_volver_pendiente`

Migración:
- `110_equipos_averiados_v399.sql`

Commit:
- `3c3aae8e22103ab589952fde425d791413ae9bd4`

## Snapshot histórico

Solicitudes:
- Sheets: 101
- PostgreSQL: 101
- Columnas comparadas: 32
- Diferencias: **0**

Cargos:
- Sheets: 90
- PostgreSQL: 90
- Columnas comparadas: 18
- Diferencias: **0**

No se corrigieron inconsistencias históricas automáticamente.

### Estados actuales

- RECIBIDO POR ALMACEN: 86
- RECIBIDO PARCIALMENTE: 1
- RECHAZADO: 1
- PENDIENTE DE ENTREGA: 13

### Por sede

- CHICLAYO: 55
- TRUJILLO: 28
- PIURA: 18

### Origen

- TECNICO: 100
- ALMACEN: 1

### Cargos

- GENERADO: 90
- Cargos con SOLICITUD_ID_CLIENTE V399: 80
- Solicitudes con ULTIMA_SOLICITUD_ID_RECEPCION: 78

La diferencia 80 vs 78 se conserva como estado histórico real.

## Prueba transaccional

Se probó dentro de transacción:
1. Registro Técnico.
2. Preparación de recepción.
3. Recepción parcial.
4. Creación de cargo.
5. Finalización V399.
6. Verificación idempotente.
7. Reintento con mismo `solicitudId`.
8. Reversa por Jefatura de Almacén.
9. Preservación del cargo histórico.

Resultado posterior al ROLLBACK:
- solicitudes piloto persistentes: 0
- cargos piloto persistentes: 0

## API piloto

Edge Function:
- `equipos-averiados-pilot`
- ACTIVE v1
- JWT obligatorio.

Acciones:
- `catalogosEquiposAveriados`
- `registrarEquiposAveriadosTecnico`
- `crearSolicitudEquiposAveriadosAlmacen`
- `completarSolicitudEquiposAveriadosTecnico`
- `listarEquiposAveriados`
- `validarRecepcionEquiposAveriados`
- `verificarRecepcionEquiposAveriadosV399`
- `volverPendienteEquiposAveriados`
- `listarCargosEquiposAveriados`

Commit API:
- `8e061981e0be934f1b28ef6ff27805cf8ba9ba9b`

## Cargos PDF

Los cargos históricos conservan los enlaces de Google Drive existentes.

Los cargos nuevos del piloto:
- se generan en PDF;
- contienen dos copias: Técnico / Almacén;
- se guardan en bucket privado `mi-visual-evidencias`;
- se exponen mediante URL firmada temporal.

Bucket:
- privado;
- límite 10 MB;
- permite application/pdf.

## Seguridad

- RLS activo en ambas tablas.
- 0 grants directos para anon/authenticated.
- Escrituras solo por backend service_role.
- Edge Function con JWT.
- Alcance preservado:
  - Técnico: propio / cuadrilla.
  - Almacén: sede.
  - Jefatura de Almacén: Zona Norte.
  - Jefatura/Admin: consulta según permisos actuales.

## Piloto web

Archivo:
- `migration/pilot/equipos-averiados-pilot.html`

Commit:
- `fd07a219e3a64fca792bac551ceaa82325c2c6b6`

Incluye:
- login;
- consulta y filtros;
- registro técnico;
- recepción V399;
- verificación idempotente;
- reversa para Jefatura de Almacén;
- consulta de cargos.

## Pendiente antes del cutover

1. Prueba Auth real con Técnico.
2. Prueba Auth real con Responsable de Almacén.
3. Generar un cargo PDF piloto real.
4. Prueba con Jefatura de Almacén de reversa.
5. Resync final de ambas hojas.
6. Integración visual final en la nueva app.

Apps Script, Google Sheets, Drive y `main` continúan sin cambios.
