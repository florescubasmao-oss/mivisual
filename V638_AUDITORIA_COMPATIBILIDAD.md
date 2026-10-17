# V638 — Auditoría de compatibilidad previa a implementación
Fecha 2026-10-17 · rama de trabajo aislada · ninguna operación sobre main ni Sheets.

## Fuentes contrastadas
- Archivo Code.gs aportado por el usuario: funciones importarMapaOperativo, combinarFilasMapaOperativo_, filaImportacionMapa, listarProgramacionDescansos.
- Repositorio main: js/mapa_operativo.js y js/programacion_descansos.js.
- Sheets, lectura de encabezados exclusivamente: MAPA_ORDENES, PROGRAMACION_DESCANSOS, USUARIOS, PERMISOS_MODULOS.
- Historial del proyecto: optimizaciones del módulo Descansos, bloqueos de importación, caché, integridad histórica y separación de versiones V637/V638.

## Hallazgo crítico 01: corte 08:20
MAPA_ORDENES.FECHA_IMPORTACION cambia a 'ahora' al fusionar cargas que aportaron información, según combinarFilasMapaOperativo_:
- salida[26] = ahora; salida[27] = usuario.usuario.
- En filas antiguas, puede conservarse fecha de importación previa si no se actualizó.
CONSECUENCIA: FECHA_IMPORTACION en la hoja no demuestra por sí sola que FECHA_INICIO_VISITA fue conocida por primera vez después de las 08:20.
ACCIÓN: implementar captura de evidencias de asistencia solamente para cargas efectivamente recibidas después de las 08:20, en ruta append-only/snapshot propio, **antes** de que el algoritmo de reconciliación de Mapa sobrescriba información histórica. No cambiar la lógica de merge vigente.
Solo evaluar si la ejecución de importación resulta confirmada exitosa. Excluir importaciones anteriores al corte aunque se vean luego en la hoja. No retroprocesar históricas anteriores sin autorización.

## Hallazgo crítico 02: hora de asignación inexistente
- Mapa Operativo dispone de HORA_SOLICITUD (tramo) y FECHA_INICIO_VISITA, no sello de asignación WIN verificable.
- No asumir que HORA_SOLICITUD=hora asignada.
- Desfase tras 08:15 no implica automáticamente F. En caso de asignación tardía conocida por supervisor, PV y validación.
- En ausencia de hora de inicio, PV, no F.
- No confundir una visita finalizada, cancelada o reprogramada con 'no iniciada' si FECHA_INICIO_VISITA está presente.

## Hallazgo crítico 03: permisos y alcance
- USUARIOS trae PERFIL, NIVEL DE ACCESO, CUADRILLA, SEDE, ESTADO.
- PERMISOS_MODULOS mantiene permisos por módulo y alcance de datos.
- listarProgramacionDescansos aplica exigirPermisoModuloCentral y registroCumpleAlcanceCentral, con excepción técnica de vista propia.
- La futura ruta de asistencia debe autenticar al usuario, aplicar el alcance central real en backend, y devolver datos únicamente de cuadrillas autorizadas.
- Perfil ampliado requerido: TECNICO, SUPERVISOR, JEFATURA, GERENCIA, GERENCIA LIMA, GERENCIA GENERAL. Confirmar alias vigentes de perfiles en permisos antes de construir condición final.
- Otros perfiles continúan con CAMPO/DESCANSO, sin datos ni controles de asistencia en respuesta.

## Hallazgo crítico 04: Programación vs asistencia
- La UI actual mezcla cuadrillas con personal no técnico en una grilla.
- EN CAMPO BOLSA figura en funciones de normalización, estilos, calendario de técnico, consulta operativa y exportación Excel. Retirar solo como opción de nuevos registros, NO borrar etiquetas/datos históricos ni reinterpretar el pasado.
- D/V/SA son asignaciones de supervisor y deben preceder a cualquier A/T/TD calculado. Conflictos con órdenes iniciadas deben generar revisión, no sobrescritura silenciosa.
- Mantener solicitudes de cambio de descanso, aprobaciones Supervisor/Jefatura, auditoría de cambios, capacidad y cachés.
- Respetar periodos cruzados y solo consultar el resumen de asistencia por mes/usuario autorizado, con degradación a calendario original ante fallos.

## Hallazgo crítico 05: rendimiento, concurrencia y paridad
- Mapa usa reserva específica V394, reconciliación V484, escritura diferencial V551 y sincronización de indicadores en cola V547.
- No incluir escaneo total del Mapa ni escritura pesada síncrona dentro del proceso de importación.
- Evitar doble cómputo por recargas y correcciones. Identidad sugerida fecha de inicio + cuadrilla normalizada, conservar ID y hora de orden de sustento.
- Procesar separadamente una cola/snapshot de asistencia con confirmación idempotente y control de error.
- No tocar PRODUCCION_APP, RANKING, PARNET, GAR/VTR, V637 ni los datos actuales de Descansos.

## Pruebas imprescindibles
1. 08:19 frente a 08:20 y 08:21; reloj horario Perú.
2. 08:05:00 A; 08:05:01 T; 08:15:00 T; 08:15:01 TD.
3. Múltiples órdenes de una cuadrilla; primera iniciada, con estado final indiferente.
4. Corrección tardía de hora, carga repetida, orden duplicada, reinicio y cuadrilla renombrada.
5. Ninguna orden/no hora => PV; asignación tardía reconocida => PV; F solo supervisor.
6. Supervisor sin autorización de otra sede => denegado; técnico solamente su cuadrilla; otro perfil sin campos extras.
7. D/V/SA y Bolsa históricos intactos.
8. Resumen, reportes Excel, permisos y velocidad comparados contra main.

Estado: auditoría documentada. **NO** equivale a implementación completada ni prueba real de backend desplegado.
