MI VISUAL v45 - Actividad en Campo

Cambios implementados:
- Nueva tarjeta: Actividad en Campo.
- Visible solo para SUPERVISOR, JEFATURA, ADMIN y ADMINISTRADOR.
- Técnico no visualiza el módulo.
- Formulario inicial: Auditoría en Frío.
- Campos: Cliente presente, DNI validado, Estado instalación, DROP metraje, Templadores, Reserva cable, Potencia, Velocidad, Limpieza, Cliente conforme, Observaciones.
- Permite subir Foto 1, Foto 2 y Foto Acta.
- Conectado al nuevo Apps Script:
  https://script.google.com/macros/s/AKfycbxirv6JT0W68dY0SZV7_mHzR8lzizybcDTyXTqvn8BOWMWEmYaJRx01DEpgTDBvbg_x/exec
- Jefatura visualiza resumen por supervisor y listado general.
- Supervisor registra y visualiza sus propias actividades.

Antes de probar:
1. Apps Script debe estar implementado como Web App.
2. La función autorizarDriveActividadCampo debe ejecutarse una vez.
3. Debe existir la hoja ACTIVIDAD_CAMPO o el Apps Script la crea al primer registro.
