CAMBIOS APLICADOS - EFECTIVIDAD CON PERIODO MANUAL

1. Se agregó en la pantalla Actualizar Efectividad:
   - Desplegable de Periodo.
   - Campo de fecha Actualizado al.
   - Cuadro para pegar base de efectividad.

2. La app ahora envía al Apps Script:
   - accion: procesarEfectividad
   - periodo
   - actualizadoAl
   - registros

3. Apps Script actualizado:
   - procesarEfectividad(registros, periodoManual, actualizadoAlManual)
   - Guarda la fecha manual en la columna ACTUALIZACION cuando la base no trae fecha.
   - Devuelve mensaje final con periodo y actualizadoAl.

4. URL de Apps Script usada en accesos.js:
   https://script.google.com/macros/s/AKfycbzW2H9GImLJlo4Rydu0jvBVsI3_FGIxEc-SKtBQU7hiRth9bSu3SNVaYLsggUxneHZL/exec

PASOS:
1. Reemplazar archivos del proyecto por los del ZIP.
2. Copiar apps_script/Code.gs y pegarlo completo en Google Apps Script.
3. Guardar y desplegar nueva version.
4. Probar Actualizar Efectividad.
