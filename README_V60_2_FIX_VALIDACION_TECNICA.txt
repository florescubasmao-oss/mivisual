MI VISUAL v60.2 - Fix Validación Técnica Supervisor

Cambios:
- En Supervisor/Jefatura, la sección "Validaciones pendientes" muestra solo ESTADO = PENDIENTE.
- El Historial ya no muestra registros pendientes.
- En Historial se eliminan los botones Aprobar / Observar / Rechazar / Bono / No Bono.
- En Historial queda solo "Ver detalle".
- KPIs por perfil:
  Técnico/Supervisor: Total, Pendientes, Aprobados, Observados, Rechazados, Automáticos.
  Jefatura/Admin: Total, Pendientes, Bono, No bono, Aprobados, Automáticos.
- No se modifica Apps Script ni estructura de hojas.

Archivo principal modificado:
- js/validacion_tecnica.js
