# V487 - Impacto de Producción, Efectividad, % Recableado y VTR/GAR

## Principio de implementación
V487 cambia principalmente la fuente y la obtención de datos. No se rediseñan las pantallas ni se cambian los contratos de datos que ya consume MI VISUAL.

Fuente principal: WIN / MAPA_ORDENES + histórico propio por OrdenId.
Fuente auxiliar opcional: Partner, solo para completar/corregir casos que requieran revisión; no sobrescribe WIN automáticamente.

## Salidas compatibles que se conservan
- PRODUCCION_APP
- EFECTIVIDAD
- PORCENTAJE REC
- POR VTR/GAR

Estas hojas deben seguir entregando la misma estructura que hoy espera el aplicativo. El nuevo motor las generará desde WIN/histórico/homologaciones, evitando modificar cada módulo consumidor.

## Efectividad
- OrdenId único.
- Manda el último estado por FECHA_ULTIMO_ESTADO; empate: FECHA_IMPORTACION más reciente.
- Agendada, En camino, Iniciada, Revisión y Reserva/Orden reservada = pendientes; no entran.
- Cuando la misma OrdenId evoluciona, se actualiza a su último estado.
- Finalizada entra al numerador y denominador.
- Cancelada, Reprogramada, Regestión y Anulada entran al denominador cuando son el estado vigente.
- VTR/GAR se mantiene fuera de Efectividad cuando TIPO_TRABAJO WIN es REITERADA/GARANTIA.

## % Recableado
- Medición al período.
- Denominador: FINALIZADA y TIPO_TRABAJO contiene LOS ROJO.
- Incluye LOS ROJO, INTERMITENCIA LOS ROJO y futuras variantes que contengan ese texto.
- Numerador: subconjunto anterior cuyo MOTIVO_FINALIZACION contiene RECABLEADO.
- Nunca puede superar 100%.

## Producción
- OrdenId único.
- VTR/GAR siempre 0 puntos de Producción.
- No cuentan en meta diaria, meta mensual ni Ranking-Producción.
- Aplica a técnico/cuadrilla y supervisor.

## VTR/GAR
- Forma parte del mismo cierre V487; no es un módulo aislado.
- Fuente principal de existencia/estado: WIN / MAPA_ORDENES.
- Detección por TIPO_TRABAJO REITERADA/GARANTIA y control adicional por ticket VTR-/GAR- cuando corresponda.
- La validación operativa permanece centralizada en VALIDACION_TECNICA.
- PROPIA / ASIGNADA / MANUAL y BONO / NO BONO se conservan para el control e indicador VTR/GAR, nunca para sumar Producción.
- El indicador se atribuye a la cuadrilla/origen responsable de la orden que generó la incidencia, no necesariamente a quien resolvió la VTR/GAR.
- Reporte ausente o correspondencia dudosa queda en revisión sin alterar Producción.
- La corrección de una validación debe conservar trazabilidad/historial; durante la prueba el guardado real sigue bloqueado.
- La salida POR VTR/GAR debe mantener el contrato esperado por Dashboard, Mi Desempeño, Ranking, informes y Supervisor.

## Histórico y homologación
- Una orden vista anteriormente no se borra si deja de aparecer en una descarga WIN posterior.
- Cambio de número/nombre de la misma cuadrilla puede homologarse manteniendo continuidad de indicadores y trazabilidad del ejecutor original.
- Reemplazo de persona/cuadrilla no transfiere automáticamente ejecución ni indicadores.
- Las diferencias/homologaciones se muestran mediante Observación desplegable, sin recargar la tarjeta principal.

## Módulos consumidores a proteger
1. Indicadores del Técnico: lee Producción, EFECTIVIDAD, PORCENTAJE REC y POR VTR/GAR.
2. Validación Técnica: Recableado conserva su flujo actual y VTR/GAR concentra reporte, validación, origen y correcciones auditables.
3. Dashboard Técnico / Supervisor / Jefatura: recibe Producción, Efectividad, Recableado, VTR/GAR y sus detalles desde el resumen consolidado.
4. Mi Desempeño: consume el mismo resumen consolidado y abre los módulos individuales.
5. Ranking: usa Producción, Efectividad, Recableado y VTR/GAR en puntaje y posiciones; VTR/GAR nunca suma Producción.
6. Ranking detallado e informe Excel: reutiliza detProduccion, detEfectividad, detRecableado y detVtrGar.
7. Informe Gerencial PDF/Excel: reutiliza la lista ya consolidada del Dashboard.
8. Bono Supervisor: backend consume los indicadores operativos; cualquier cambio de fuente debe conservar el contrato y la atribución por supervisor/cuadrillas.
9. Análisis Económico / Utilidad: depende de PRODUCCION_APP; mantener estructura evita romperlo.
10. Materiales: existen controles que toman FINALIZADAS desde EFECTIVIDAD; deben recibir las finalizadas deduplicadas correctas.
11. Corte automático de Ranking: usa fechas de PRODUCCION_APP y EFECTIVIDAD; las nuevas cargas WIN deben actualizar el corte sin intervención manual.
12. VTR/GAR por Supervisor: el consolidado del supervisor debe reflejar las incidencias atribuibles a sus cuadrillas/origen, sin convertirlas en Producción.

## Estrategia de seguridad
- No conectar cada pantalla directamente a MAPA_ORDENES.
- Centralizar cálculo en backend y escribir/servir salidas compatibles.
- Mantener nombres de campos y estructura actuales.
- Invalidar/reconstruir resúmenes y cachés después de una importación WIN válida para que Dashboard, Ranking, Mi Desempeño, informes y Bono Supervisor reciban el nuevo corte.
- Mantener VTR/GAR separado de Producción en todos los cálculos y vistas.
- No tocar V486/main durante pruebas.
- PR permanece Draft hasta comparar cuadrilla por cuadrilla y supervisor.

## Pruebas obligatorias antes del Merge
- Comparación por cuadrilla: actual vs WIN para Producción, Efectividad, Recableado y VTR/GAR.
- Comparación por supervisor y sede para los cuatro indicadores.
- Ranking antes/después, comprobando que VTR/GAR no sume Producción y sí afecte solo su indicador propio.
- Mi Desempeño técnico.
- Dashboard Supervisor y Jefatura.
- Validación Técnica VTR/GAR: reportada/no reportada, PROPIA/ASIGNADA/MANUAL, BONO/NO BONO, ejecutor vs origen, correspondencia dudosa y edición auditada en preview.
- Informe gerencial y Ranking Excel.
- Bono Supervisor.
- Análisis Económico (solo comprobar que la nueva Producción mantiene contrato y totales esperados).
- Materiales (finalizadas).
- Cambio de estado en cargas sucesivas: pendiente -> finalizada/cancelada/reprogramada/regestión/anulada y cancelada -> agendada.
- Orden ausente en carga posterior.
- Homologación de cuadrilla y reemplazo de persona.
- Atribución VTR/GAR: incidencia resuelta por una cuadrilla distinta debe afectar el indicador de la cuadrilla/origen responsable, no la Producción de la cuadrilla ejecutora.
