# V487.12 - Indicadores operativos desde WIN

V487.12 queda listo para activación desde AGOSTO 2026. JULIO 2026 y periodos anteriores permanecen congelados.

La fuente principal es WIN / MAPA_ORDENES con histórico propio por OrdenId. Partner queda como auxiliar para clasificación, correcciones puntuales y para confirmar los pocos casos de RESERVA que WIN representa como Cancelada. El último estado se determina por FECHA_ULTIMO_ESTADO y, en empate, por FECHA_IMPORTACION. Una orden ausente de una carga posterior no se elimina.

Producción se reconstruye solo para el periodo publicado. VTR/GAR siempre aporta 0 Producción, también cuando la incidencia se reconoce por ticket. Si alguna orden normal no tiene una partida confiable, se bloquea la publicación completa y se restaura el estado anterior.

Efectividad conserva FINALIZADAS / total de órdenes cerradas elegibles. Toda FINALIZADA cuenta, incluido VTR/GAR. Cancelada, Reprogramada, Regestión y Anulada entran al denominador; Anulada se agrupa con Cancelada. Los estados abiertos y las reservas pendientes quedan fuera. Una Cancelada con texto de reserva solo se excluye cuando Partner confirma que sigue RESERVA/RESERVADO.

Recableado usa como denominador FINALIZADA cuyo TIPO_TRABAJO contenga LOS ROJO, incluyendo INTERMITENCIA LOS ROJO. El numerador es el subconjunto exacto cuyo MOTIVO_FINALIZACION contiene RECABLEADO, por lo que no puede superar 100%.

VTR/GAR conserva todos los casos ya CONFIRMADOS, REASIGNADOS, ANULADOS o PENDIENTES. Solo CONFIRMADO y REASIGNADO afectan el indicador. WIN agrega únicamente incidencias nuevas como PENDIENTE. El denominador es el total de FINALIZADAS de Efectividad y las incidencias se atribuyen a la cuadrilla de origen/responsable.

Para cuadrillas, un cambio de número/nombre con la misma identidad puede homologarse a la vigente conservando trazabilidad. Un reemplazo por una persona distinta no transfiere automáticamente la ejecución.

El publicador `apps_script/V487_Publicador.gs` usa periodo mínimo 2026-08, confirmación interna, ScriptLock, snapshots y rollback automático. Reconstruye solo el periodo solicitado e invalida los cachés y Ranking al finalizar.

El módulo Mapa ya carga el control de estado WIN y el sincronizador V487.12. Después de una importación WIN válida, el sincronizador solicita la publicación del periodo importado; periodos anteriores a agosto se omiten por cierre.

`Code_V487_COMPLETO.gs` es el artefacto único de despliegue de Apps Script. Contiene el backend vigente, las rutas V487 y el publicador, y pasó la validación automática de sintaxis en GitHub Actions.

Estado actual: código listo en la rama V487; PR todavía Draft y sin Merge. Falta desplegar el backend V487 en Apps Script antes de fusionar GitHub Pages.
