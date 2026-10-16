# MI VISUAL V629 — Auditoría preliminar de rutas de escritura e invalidación de caché

**Estado:** diagnóstico documental, no desplegado. **Alcance comprobado:** archivo del repositorio `apps_script/Code.gs` de `main`. No se ha comprobado que ese archivo coincida con la versión implementada de Apps Script; pueden existir otros proyectos, scripts de importación o ediciones manuales.

## Fuentes que usa el registro de actas

`crearContextoDatosAutomaticosActas()` reconstruye:
- `MAPA_ORDENES`, 26 columnas con `getValues()`, para identificar orden, cliente, fecha, sede y cuadrilla.
- `PRODUCCION_APP`, 7 columnas, para relacionar cuadrilla, fecha, código y cantidad.
- `CATALOGO_ORDENES`, catálogo completo, para determinar tipo de partida.

Estas fuentes pueden actualizarse después de haber sido almacenadas en caché.

## Rutas de escritura comprobadas

| Fuente | Función/ruta reconocida | Operación o riesgo |
|---|---|---|
| `PRODUCCION_APP` | `procesarProduccion(registros)` | `setValue` y `setValues` actualizan filas existentes e insertan nuevas. |
| `PRODUCCION_APP` | Procesamiento/cargas de base operativa que usan `obtenerHoja(HOJA_PRODUCCION)` | Requiere inventario completo de invocaciones y helpers de escritura; hay funciones de carga por múltiples períodos. |
| `CATALOGO_ORDENES` | `registrarPartidaCatalogoOperativa(data)` | `appendRow` modifica catálogo de partidas. |
| `MAPA_ORDENES` | `asegurarHojaMapaOperativo()` | Crea hoja/columnas y escribe encabezados; NO basta para ubicar todas las escrituras de datos. |
| Tres hojas | Ediciones directas desde Google Sheets, otros Apps Scripts, conectores/importaciones | No pueden darse por instrumentadas únicamente modificando `Code.gs`. |

## Resultados y riesgos

1. **No se ha demostrado cobertura completa de las rutas de escritura.** La invalidación solamente en `procesarProduccion` o `registrarPartidaCatalogoOperativa` dejaría actualizaciones sin capturar.
2. **Una comprobación profunda de frescura elimina el ahorro.** V628 consultó hojas actuales durante 14.846 segundos frente a 23 ms de lectura de caché; esa comprobación debe evitarse si se busca acelerar las subidas.
3. **Una TTL corta no garantiza consistencia.** Ante cambios inmediatamente después de guardar caché, una subida podría usar cliente, DNI, fecha o partida antiguos.
4. **No deben almacenarse datos personales en una caché compartida operativa sin diseñar controles de acceso y caducidad.** La prueba V628 guardó solamente huellas, no clientes ni DNI.
5. **El contexto completo no cabe necesariamente en una sola entrada de CacheService.** V627 probó solo tres segmentos, no el contexto real distribuido ni su invalidación.

## Dictamen V629

**NO ACTIVAR todavía una caché de identidad para guardar actas.** Mantener `registrarActaEscaneada`, V621, Drive y `ACTAS_ESCANEADAS` sin cambios. La auditoría preliminar demuestra que una solución de versiones requiere instrumentar TODOS los escritores, incluidos procesos de importación, y definir qué hacer con ediciones externas.

## Siguiente experimento recomendado (solo lectura)

Medir tiempos por etapas en UNA ejecución del flujo, sin subir archivos: validación de orden, resolución de identidad, búsqueda en producción, catálogo y localización de carpetas sin crearlas. Contrastar con varias órdenes de distintas sedes y plataformas. Como optimización de menor riesgo, explorar índices de búsqueda mantenidos por el pipeline de carga o lectura de rangos acotados, con fallback a la ruta completa; descartar si no hay equivalencia de resultados.

**No se ha modificado** `main`, el Apps Script publicado, los PDF, las hojas ni los módulos productivos.
