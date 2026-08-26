# V487 - Impacto de Producción, Efectividad y % Recableado

## Principio de implementación
V487 cambia principalmente la fuente y la obtención de datos. No se rediseñan las pantallas ni se cambian los contratos de datos que ya consume MI VISUAL.

Fuente principal: WIN / MAPA_ORDENES + histórico propio por OrdenId.
Fuente auxiliar opcional: Partner, solo para completar/corregir casos que requieran revisión; no sobrescribe WIN automáticamente.

## Salidas compatibles que se conservan
- PRODUCCION_APP
- EFECTIVIDAD
- PORCENTAJE REC

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

## Histórico y homologación
- Una orden vista anteriormente no se borra si deja de aparecer en una descarga WIN posterior.
- Cambio de número/nombre de la misma cuadrilla puede homologarse manteniendo continuidad de indicadores y trazabilidad del ejecutor original.
- Reemplazo de persona/cuadrilla no transfiere automáticamente ejecución ni indicadores.
- Las diferencias/homologaciones se muestran mediante Observación desplegable, sin recargar la tarjeta principal.

## Módulos consumidores a proteger
1. Indicadores del Técnico: lee EFECTIVIDAD y PORCENTAJE REC.
2. Dashboard Técnico / Supervisor / Jefatura: recibe efectividad, recableado y sus detalles desde el resumen consolidado.
3. Mi Desempeño: consume el mismo resumen consolidado y abre los módulos individuales.
4. Ranking: usa Producción, Efectividad y Recableado en puntaje y posiciones.
5. Ranking detallado e informe Excel: reutiliza detEfectividad y detRecableado.
6. Informe Gerencial PDF/Excel: reutiliza la lista ya consolidada del Dashboard.
7. Bono Supervisor: backend consume Producción, Efectividad y Recableado para sus componentes.
8. Análisis Económico / Utilidad: depende de PRODUCCION_APP; mantener estructura evita romperlo.
9. Materiales: existen controles que toman FINALIZADAS desde EFECTIVIDAD; deben recibir las finalizadas deduplicadas correctas.
10. Corte automático de Ranking: usa fechas de PRODUCCION_APP y EFECTIVIDAD; las nuevas cargas WIN deben actualizar el corte sin intervención manual.

## Estrategia de seguridad
- No conectar cada pantalla directamente a MAPA_ORDENES.
- Centralizar cálculo en backend y escribir/servir salidas compatibles.
- Mantener nombres de campos y estructura actuales.
- Invalidar/reconstruir resúmenes y cachés después de una importación WIN válida para que Dashboard, Ranking, Mi Desempeño, informes y Bono Supervisor reciban el nuevo corte.
- No tocar V486/main durante pruebas.
- PR permanece Draft hasta comparar cuadrilla por cuadrilla y supervisor.

## Pruebas obligatorias antes del Merge
- Comparación por cuadrilla: actual vs WIN para Producción, Efectividad y Recableado.
- Comparación por supervisor y sede.
- Ranking antes/después.
- Mi Desempeño técnico.
- Dashboard Supervisor y Jefatura.
- Informe gerencial y Ranking Excel.
- Bono Supervisor.
- Análisis Económico (solo comprobar que la nueva Producción mantiene contrato y totales esperados).
- Materiales (finalizadas).
- Cambio de estado en cargas sucesivas: pendiente -> finalizada/cancelada/reprogramada/regestión/anulada y cancelada -> agendada.
- Orden ausente en carga posterior.
- Homologación de cuadrilla y reemplazo de persona.
