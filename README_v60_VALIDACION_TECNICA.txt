# MI VISUAL v60 - Validación Técnica

Cambios incluidos:
- Nuevo módulo: Validación Técnica.
- Técnico registra RECABLEADO, GAR o VTR.
- ID automático: CODIGO-TIPO (ejemplo: 3030002-RECABLEADO).
- Ticket con prefijo AT-, VTEXT-, GAR-, VTR- o NO APLICA.
- Pantalla final para pantallazo + botón Telegram según sede.
- Supervisor/Jefatura validan RECABLEADO: APROBADO, RECHAZADO u OBSERVADO.
- Jefatura valida GAR/VTR: BONO o NO BONO.
- Recableado pendiente por más de 20 minutos pasa a SIN RESPUESTA / APROBADO AUTOMÁTICAMENTE para el técnico.
- Apps Script incluye función crearTriggerValidacionTecnica para automatizar la revisión cada 5 minutos.

Hoja requerida: VALIDACION_TECNICA con 22 columnas:
ID, FECHA_REGISTRO, HORA_REGISTRO, SEDE, TECNICO, CUADRILLA, TIPO_VALIDACION, CODIGO, TIPO_TICKET, NUMERO_TICKET, TICKET_FINAL, DNI_CLIENTE, MOTIVO_TECNICO, ESTADO, RESULTADO_FINAL, VALIDADO_POR, PERFIL_VALIDADOR, FECHA_VALIDACION, HORA_VALIDACION, MOTIVO_VALIDACION, LINK_TELEGRAM, HORA_LIMITE.
