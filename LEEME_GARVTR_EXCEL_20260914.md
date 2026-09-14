# Informe Excel de Gestión GAR/VTR

Se agrega “Descargar Excel” junto al selector de periodo del panel consolidado.

## Contenido
- RESUMEN: periodo, filtros, fecha de generación y cantidades.
- GAR VTR: detalle de tickets, cuadrillas, responsables, registro técnico, bono, puntos y comentarios.
- ORDENES WIN: todas las órdenes asociadas a los tickets seleccionados.
- ANTECEDENTES: antecedentes disponibles de los tickets seleccionados.
- REVISION MANUAL: casos no estándar pendientes del periodo. Como en el panel, este bloque no aplica los filtros del listado GAR/VTR; se explica en RESUMEN.

## Alcance técnico
- Usa únicamente la consulta existente listarVtrGarV517A y conserva las capas de asociación y caché del panel. No promete información más reciente que esa consulta.
- Respeta VER, DESCARGAR y el alcance devuelto por el servidor. Vuelve a verificar sesión y permisos antes de generar el archivo.
- No ejecuta guardados, validaciones, reclasificaciones ni recálculos de indicadores.
- No modifica Apps Script, el informe antiguo de Recableados ni sus registros.
- No modifica el estado del panel al descargar. Los filtros se capturan al pulsar el botón.
- Reutiliza el generador Excel de Validación Técnica; los códigos, DNI y comentarios se pasan como texto, sin fórmulas.
- Las referencias de versión en el puente GAR/VTR, index.html y sw.js evitan reutilizar los archivos antiguos. Se conserva el nombre y la estrategia de caché existente.

## Verificación
Comando reproducible, con Node.js y el historial git disponible:
`node tests/gar_vtr_excel.test.cjs`

62 comprobaciones con datos simulados: filtros iguales a la base, casos sin registro, múltiples órdenes, antecedentes, revisión manual, ceros iniciales, puntos ausentes/cero, permisos, doble clic, cambio de selección, respuestas inválidas, error de red y timeout.

Pendiente: descarga y apertura del XLSX en navegador real con datos de la app. No hubo entorno de navegador disponible en esta sesión.

## Uso
Recargar la app, entrar en Validación Técnica → GAR/VTR, seleccionar periodo y filtros, pulsar “Descargar Excel”.
No reemplazar ni ejecutar ningún script en Apps Script para este cambio.
