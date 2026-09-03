# V528 · Diagnóstico de rendimiento de Mapa Operativo

## Estado validado

La carga de 67 órdenes del 03/09/2026 terminó correctamente en 178 s: 9 nuevas, 58 actualizadas, 0 repetidos consolidados y 0 omitidos. El sello de MAPA_ORDENES quedó en 03/09/2026 10:06 por JEFZNORTE.

## Cuello de botella encontrado

El backend vigente conserva correctamente la lógica V394 de concurrencia y el historial, pero al persistir una carga normal vuelve a escribir el resultado completo de MAPA_ORDENES y de CATALOGO_CTO.

Con los tamaños actuales, una carga pequeña puede terminar escribiendo miles de filas aunque solo cambien decenas. El costo evitable está en la persistencia completa, no en las reglas de negocio.

## Alcance de V528

V528 propone cambiar exclusivamente la persistencia a escritura incremental por tramos modificados. Se conserva:

- bloqueo/concurrencia V394;
- permisos y perfiles;
- misma orden + mismo día = actualización;
- misma orden + otro día = historial;
- consolidación de duplicados;
- extracción y consolidación CTO;
- contadores de nuevos/actualizados/omitidos/repetidos;
- última actualización;
- invalidación de cachés;
- sincronizador V512 y publicación conjunta de Producción/Efectividad/Recableado/VTR-GAR;
- frontend V527 y protección contra Failed to fetch.

## Despliegue

Este diagnóstico y `V528_MAPA_RENDIMIENTO_PATCH.txt` no se ejecutan en GitHub Pages. La mejora real requiere aplicar el reemplazo controlado dentro del Apps Script publicado y desplegar una nueva versión del Web App. No debe simularse desde frontend ni mediante una nueva capa JavaScript.
