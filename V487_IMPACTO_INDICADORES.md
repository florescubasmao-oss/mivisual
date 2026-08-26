# V487.12 - Indicadores operativos desde WIN

## Estado
V487.12 está preparado para activarse desde AGOSTO 2026. JULIO 2026 y periodos anteriores permanecen congelados.

## Principio
El cambio es principalmente de fuente de datos y actualización interna. No se rediseñan los módulos consumidores ni se cambian sus contratos.

- Fuente principal: WIN / MAPA_ORDENES + histórico propio por OrdenId.
- Fuente auxiliar: Partner, solo para correcciones puntuales, clasificación y control de RESERVA.
- OrdenId es la llave única.
- Manda FECHA_ULTIMO_ESTADO; empate: FECHA_IMPORTACION más reciente.
- Una orden ausente de una carga posterior no se elimina.

## Producción
- Se reconstruye solamente el periodo publicado.
- VTR/GAR siempre 0 Producción, incluso cuando el TipoTrabajo no sea REITERADA/GARANTIA pero el ticket identifique VTR/GAR.
- No cuenta en meta diaria, meta mensual ni Ranking-Producción.
- Si existe una orden sin partida confiable, se bloquea toda la publicación y se restaura el estado anterior.

## Efectividad
- FINALIZADAS / total de órdenes cerradas elegibles.
- Toda FINALIZADA cuenta, incluido VTR/GAR.
- Cancelada, Reprogramada, Regestión y Anulada forman parte del denominador.
- Anulada se agrupa en Cancelada.
- Agendada, En camino, Iniciada y estados abiertos quedan fuera.
- RESERVA/RESERVADO queda pendiente.
- Una Cancelada con texto de reserva solo se excluye si Partner confirma que actualmente está RESERVA/RESERVADO; el texto WIN por sí solo no basta.

## % Recableado
- Denominador: FINALIZADA cuyo TIPO_TRABAJO contenga LOS ROJO.
- Incluye INTERMITENCIA LOS ROJO y futuras variantes.
- Numerador: subconjunto exacto anterior cuyo MOTIVO_FINALIZACION contiene RECABLEADO.
- Nunca puede superar 100%.

## VTR/GAR
- Denominador: Total de órdenes FINALIZADAS de Efectividad.
- VTR/GAR ya CONFIRMADO, REASIGNADO, ANULADO o PENDIENTE se conserva.
- Solo CONFIRMADO y REASIGNADO afectan el indicador.
- WIN agrega únicamente incidencias nuevas como PENDIENTE.
- Una incidencia histórica no se elimina si deja de aparecer como REITERADA/GARANTIA en WIN.
- El indicador se atribuye a la cuadrilla de origen/responsable; la atención VTR/GAR aporta 0 Producción.

## Cuadrillas e histórico
- Cambio de número/nombre con la misma identidad puede homologarse automáticamente a la cuadrilla vigente.
- Reemplazo por persona distinta no transfiere automáticamente la ejecución.
- Se conserva la cuadrilla ejecutora original para trazabilidad.

## Publicador V487.12
Archivo fuente: `apps_script/V487_Publicador.gs`.

Protecciones:
- `MV487_PUBLICADOR_PERIODO_MINIMO_ = "2026-08"`.
- Confirmación interna obligatoria `PUBLICAR_V487_CONFIRMADO`.
- ScriptLock durante la publicación.
- Snapshots de Producción, Efectividad, Recableado, VTR/GAR, base VTR/GAR y Ranking.
- Rollback automático si falla cualquier etapa.
- Reconstrucción solo del periodo solicitado.
- Invalidación de cachés y reconstrucción de Ranking/resumen al finalizar.

## Actualización automática
Al abrir Mapa Operativo se cargan:
- `mapa_partner_visual_v386.js?v=V48712-ESTADO-WIN`
- `indicadores_win_sync_v4879.js?v=V48712-PUBLICADOR-ACTIVO`

Después de una importación WIN válida, el sincronizador solicita al backend la publicación del periodo importado. Periodos anteriores a agosto se omiten por cierre.

## Despliegue
`Code_V487_COMPLETO.gs` es el artefacto completo para Apps Script. Contiene el backend vigente, las rutas de publicación y el publicador V487.12 en un único archivo.

El orden seguro de puesta en producción es:
1. Desplegar `Code_V487_COMPLETO.gs` en Apps Script.
2. Validar la ruta V487.12.
3. Fusionar el PR a main para que GitHub Pages cargue el sincronizador.
4. Ejecutar la primera publicación completa de agosto.
5. Validar Dashboard, Ranking, Mi Desempeño y los cuatro indicadores.
