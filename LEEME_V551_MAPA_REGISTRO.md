# V551 — Registro del Mapa

El hook de indicadores consultaba el sello remoto antes de mostrar la barra.
Además podía publicar desde el navegador después de que V547 ya programara
la misma actualización en segundo plano.

## Cambios

- La barra y el botón Cargando aparecen antes de cualquier consulta remota.
- Un solo envío durante un registro; elegir/leer archivo queda bloqueado mientras dura.
- La etapa de envío aparece cuando comienza el registro base, después de la validación.
- El resultado real del POST decide si hubo éxito, error o ausencia de cambios.
- Se respeta la cola V547. El navegador no vuelve a publicar esos indicadores.
- Servidores anteriores sin cola conservan una publicación tras un POST confirmado.
- Un sello global reciente no confirma por sí solo una carga con respuesta perdida.
- Se renuevan versiones de los archivos afectados y la caché de la aplicación.

No cambia permisos, clasificación GAR/VTR, fórmulas, ranking, puntos ni publicador.
El bloqueo global del publicador se conserva porque protege escrituras y rollback.
Por eso no se promete aislamiento total ni un tiempo fijo de Apps Script.

## Backend entregado por separado

El Código.gs adjuntado por el usuario es más reciente que Code.gs del repositorio.
Por eso NO se reemplaza ese archivo de GitHub por una versión supuesta.
El paquete Code_V551_COMPLETO.gs se deriva exclusivamente del adjunto vigente:
solo cambia importarMapaOperativo y alimentarCatalogoCtoMapaOperativo_, y añade
mv551EscribirDiferenciasMapa_. Conserva todas las demás funciones textualmente.

La consolidación y comparación de versiones siguen iguales. Se escriben bloques
con diferencias (máximo 16) en vez de reescribir todo. La lectura histórica sigue
siendo necesaria. Si hay duplicados viejos, se conserva la consolidación anterior.
El resultado añade métricas de filas leídas/escritas para comprobar la mejora.

## Verificación

- `node --test tests/mapa_registro_v551.test.cjs`: 6 escenarios de interfaz y API simuladas.
- `node --test tests/gar_vtr_excel.test.cjs`: 62 comprobaciones existentes.
- Backend original vs corregido: 6 escenarios de datos y validación de límites.
- Caso simulado 6.000 órdenes / 62 cambios: 62 filas escritas, mismo resultado final.
- Compilación sintáctica completa de Apps Script y JavaScript modificado.

No se ejecutaron importaciones ni publicaciones de prueba sobre las hojas reales.
La prueba visual con Chromium no estuvo disponible; las pruebas usan DOM simulado.
La velocidad de Apps Script y el trigger V547 requieren comprobación tras implementar.

## Aplicación y reversión

Frontend: cambios de esta revisión. Para volver, revertir el commit V551.
Backend: respaldar Código.gs, reemplazar SOLO su contenido con Code_V551_COMPLETO.gs,
guardar y actualizar la implementación existente a una nueva versión manteniendo URL.
No añadir el archivo completo como un .gs adicional: duplicaría funciones.
Conservar todos los demás .gs del proyecto y el trigger existente.
Para revertir backend, restaurar el contenido anterior y volver a implementar.
