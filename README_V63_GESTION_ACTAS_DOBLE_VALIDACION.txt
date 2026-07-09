MI VISUAL v63 - Gestión de Actas Doble Validación

Cambios incluidos:
- API actualizada a la URL vigente indicada por el usuario.
- Gestión de Actas con nueva estructura de 28 columnas.
- Nuevo campo Tipo de Ejecución: INSTALACION / VISITA TECNICA.
- Tipo de partida filtrado según Tipo de Ejecución:
  * INSTALACION: solo instalación residencial y condominio.
  * VISITA TECNICA: resto del catálogo.
- Drive organiza las actas por:
  SEDE > CUADRILLA > TIPO_EJECUCION > FECHA_GESTION > CODIGO_PEDIDO.pdf
- Responsable de Almacén puede realizar primera validación: CORRECTO / OBSERVADO.
- Jefatura Almacén realiza validación final: CORRECTO / OBSERVADO.
- Solo cuando Jefatura Almacén marca CORRECTO, el acta queda FINALIZADA.
- Si Almacén o Jefatura observa, el técnico puede reemplazar el PDF.
- Al reemplazar, el PDF anterior se envía a papelera y se sube el nuevo con el mismo nombre.
