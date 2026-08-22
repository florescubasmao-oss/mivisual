/* ============================================================
   MI VISUAL V459B - PROTECCION DEL HISTORICO V459 EN RANKING

   IMPORTANTE:
   - PEGAR INMEDIATAMENTE DESPUES del bloque V459 principal.
   - No cambia ningún cálculo.
   - Solo conserva las columnas adicionales V459 de meses anteriores cuando
     el Ranking original vuelve a escribir sus 27 columnas históricas.
============================================================ */

var MV459B_actualizarRankingBase_ = actualizarRanking;

function mv459bSnapshotRanking_() {
  var hoja = obtenerHoja(HOJA_RANKING);
  var mapa = {};
  if (!hoja || hoja.getLastRow() <= 1 || hoja.getLastColumn() < 36) return mapa;

  var datos = hoja.getRange(2,1,hoja.getLastRow()-1,36).getValues();
  datos.forEach(function(fila) {
    var periodo = periodoTecnicoV367_(fila[0]);
    var cuadrilla = normalizarCuadrilla(fila[1]);
    var regla = String(fila[35] || "");
    if (!periodo || !cuadrilla || regla.indexOf("V459") < 0) return;
    mapa[periodo + "|" + cuadrilla] = fila.slice(27,36);
  });
  return mapa;
}

function mv459bRestaurarRanking_(snapshot, periodoActual) {
  if (!snapshot || !Object.keys(snapshot).length) return;
  var hoja = obtenerHoja(HOJA_RANKING);
  if (!hoja || hoja.getLastRow() <= 1) return;
  if (hoja.getMaxColumns() < 36) {
    hoja.insertColumnsAfter(hoja.getMaxColumns(),36-hoja.getMaxColumns());
  }

  var cantidad = hoja.getLastRow()-1;
  var claves = hoja.getRange(2,1,cantidad,2).getValues();
  var extras = hoja.getRange(2,28,cantidad,9).getValues();
  var huboCambios = false;

  claves.forEach(function(fila,i) {
    var periodo = periodoTecnicoV367_(fila[0]);
    var cuadrilla = normalizarCuadrilla(fila[1]);
    if (!periodo || !cuadrilla || periodo === periodoActual) return;
    var guardado = snapshot[periodo + "|" + cuadrilla];
    if (!guardado) return;
    extras[i] = guardado.slice();
    huboCambios = true;
  });

  if (huboCambios) hoja.getRange(2,28,cantidad,9).setValues(extras);
}

actualizarRanking = function(periodoManual, actualizadoAlManual, omitirResumenObservaciones) {
  var snapshot = mv459bSnapshotRanking_();
  var respuesta = MV459B_actualizarRankingBase_.apply(this,arguments);
  var periodo = respuesta && respuesta.periodoClave
    ? respuesta.periodoClave
    : periodoSlaV363_(periodoManual);
  mv459bRestaurarRanking_(snapshot,periodo);
  return respuesta;
};
