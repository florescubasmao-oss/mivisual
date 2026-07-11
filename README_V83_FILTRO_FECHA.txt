MI VISUAL V83 - CORRECCION FILTRO DE FECHA

Archivo modificado:
- js/validacion_tecnica.js

Correccion:
- El filtro HOY reconoce fechas ISO provenientes de Google Sheets/API,
  por ejemplo: 2026-07-10T05:00:00.000Z.
- Se compara únicamente YYYY-MM-DD para evitar desfases de zona horaria.
- No modifica Apps Script, Google Sheets ni otros módulos.
