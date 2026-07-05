CAMBIOS REALIZADOS - MI VISUAL

1. js/dashboards.js
- El botón ACTUALIZAR EFECTIVIDAD ahora abre la pantalla mostrarImportarEfectividad().
- Se retiró la función antigua actualizarEfectividad() del flujo principal.

2. js/accesos.js
- Se agregó mostrarImportarEfectividad().
- Se agregó procesarEfectividad().
- Ahora Efectividad funciona igual que Producción: pegar base, vista previa, procesar y enviar a Apps Script.

3. apps_script/Code.gs
- Se agregó el código completo actualizado para Google Apps Script.
- Incluye procesarEfectividad(registros).
- Incluye doPost(e) actualizado para accion: procesarEfectividad.

PASO IMPORTANTE:
Debes copiar el contenido de apps_script/Code.gs y pegarlo en tu proyecto de Google Apps Script.
Luego guardar y desplegar una nueva versión del Web App.
