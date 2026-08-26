/* ==========================================================
   MI VISUAL V493 - RANKING VTR/GAR SOLO PROPIAS

   REGLA DEFINITIVA
   ----------------------------------------------------------
   DASHBOARD / INDICADOR VTR-GAR:
   - Mantiene la logica vigente.
   - La incidencia se atribuye a la CUADRILLA RESPONSABLE / ORIGEN.
   - Puede ser distinta de la cuadrilla que ejecuto la VTR/GAR actual.
   - CONFIRMADO / REASIGNADO siguen alimentando el indicador operativo.
   - No se modifica POR VTR/GAR.

   RANKING:
   - Penaliza UNICAMENTE VTR/GAR PROPIAS.
   - PROPIA = cuadrillaResponsable == cuadrillaEjecutora.
   - ASIGNADA / REASIGNADA a otra cuadrilla NO penaliza Ranking.
   - BONO / NO BONO / PENDIENTE BONO / SIN REGISTRO VT
     NO CAMBIAN esta regla.
   - PENDIENTE de responsabilidad y ANULADO no penalizan.
========================================================== */

var MV493_VERSION_ =
  "V493-RANKING-VTRGAR-SOLO-PROPIAS-20260826";

var MV493_actualizarRankingBase_ =
  actualizarRanking;

var MV493_obtenerVtrGarPorCuadrillaBase_ =
  obtenerVtrGarPorCuadrilla;

function mv493Fecha_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return new Date(valor.getTime());
  var t = String(valor == null ? "" : valor).trim();
  if (!t) return null;
  var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    var d = new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    var di = new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return isNaN(di.getTime()) ? null : di;
  }
  var dg = new Date(t);
  return isNaN(dg.getTime()) ? null : dg;
}

function mv493MismoPeriodo_(fecha,corte) {
  var f = mv493Fecha_(fecha);
  var c = mv493Fecha_(corte);
  if (!f || !c) return false;
  return f.getFullYear() === c.getFullYear() && f.getMonth() === c.getMonth();
}

function mv493EstadoContabilizable_(estado) {
  if (typeof estadoVtrGarContabilizable === "function") return !!estadoVtrGarContabilizable(estado);
  var e = normalizarTexto(estado);
  return e === "CONFIRMADO" || e === "REASIGNADO";
}

function mv493VtrGarPropiasRankingPorCuadrilla_(cortePeriodo) {
  var base = MV493_obtenerVtrGarPorCuadrillaBase_(cortePeriodo) || {};
  var propias = {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName("BASE_VTR_GAR_DETECTADA");

  if (hoja && hoja.getLastRow() > 1) {
    var datos = hoja.getDataRange().getValues();
    var cab = datos[0].map(function(x){ return normalizarTexto(x); });
    function idx(nombre,respaldo) {
      var i = cab.indexOf(normalizarTexto(nombre));
      return i >= 0 ? i : respaldo;
    }
    var cFecha = idx("FECHA_INCIDENCIA",1);
    var cTipo = idx("TIPO",2);
    var cEjecutora = idx("CUADRILLA_EJECUTORA",10);
    var cEstado = idx("ESTADO_CALIFICACION",12);
    var cResponsable = idx("CUADRILLA_RESPONSABLE",13);

    for (var i=1;i<datos.length;i++) {
      var fila = datos[i];
      if (!mv493MismoPeriodo_(fila[cFecha],cortePeriodo)) continue;
      if (!mv493EstadoContabilizable_(fila[cEstado])) continue;
      var ejecutora = normalizarCuadrilla(fila[cEjecutora]);
      var responsable = normalizarCuadrilla(fila[cResponsable]);
      if (!ejecutora || !responsable || ejecutora !== responsable) continue;
      var tipo = normalizarTexto(fila[cTipo]);
      if (tipo !== "GAR" && tipo !== "VTR") continue;
      if (!propias[responsable]) propias[responsable] = {gar:0,vtr:0};
      if (tipo === "GAR") propias[responsable].gar++;
      if (tipo === "VTR") propias[responsable].vtr++;
    }
  }

  var salida = {};
  Object.keys(base).forEach(function(cuadrilla){
    var b = base[cuadrilla] || {};
    var p = propias[cuadrilla] || {gar:0,vtr:0};
    var finalizadas = Number(b.finalizadas)||0;
    var gar = Number(p.gar)||0;
    var vtr = Number(p.vtr)||0;
    var total = gar+vtr;
    salida[cuadrilla] = {
      finalizadas:finalizadas,
      gar:gar,
      vtr:vtr,
      totalGarVtr:total,
      porcentajeVtrGar:finalizadas>0 ? total/finalizadas : 0,
      criterioRanking:"SOLO_PROPIAS"
    };
  });

  Object.keys(propias).forEach(function(cuadrilla){
    if (salida[cuadrilla]) return;
    salida[cuadrilla] = {
      finalizadas:0,
      gar:Number(propias[cuadrilla].gar)||0,
      vtr:Number(propias[cuadrilla].vtr)||0,
      totalGarVtr:(Number(propias[cuadrilla].gar)||0)+(Number(propias[cuadrilla].vtr)||0),
      porcentajeVtrGar:0,
      criterioRanking:"SOLO_PROPIAS_SIN_DENOMINADOR"
    };
  });

  return salida;
}

actualizarRanking = function(periodoManual,actualizadoAlManual,omitirResumenObservaciones) {
  var funcionVtrOriginal = obtenerVtrGarPorCuadrilla;
  try {
    obtenerVtrGarPorCuadrilla = mv493VtrGarPropiasRankingPorCuadrilla_;
    var resultado = MV493_actualizarRankingBase_(periodoManual,actualizadoAlManual,omitirResumenObservaciones);
    if (resultado && typeof resultado === "object") {
      resultado.versionVtrGarRanking = MV493_VERSION_;
      resultado.reglaVtrGarRanking = "SOLO_PROPIAS_RESPONSABLE_IGUAL_EJECUTORA";
    }
    return resultado;
  } finally {
    obtenerVtrGarPorCuadrilla = funcionVtrOriginal;
  }
};

function DIAGNOSTICO_V493_RANKING_VTRGAR_PROPIAS() {
  var corte = obtenerCorteRankingAutomatico();
  var fecha = convertirFechaRanking(corte.actualizadoAl || "");
  var completo = MV493_obtenerVtrGarPorCuadrillaBase_(fecha);
  var propias = mv493VtrGarPropiasRankingPorCuadrilla_(fecha);
  var resumen = [];
  Object.keys(completo || {}).sort().forEach(function(cuadrilla){
    var c = completo[cuadrilla] || {};
    var p = propias[cuadrilla] || {};
    resumen.push({
      cuadrilla:cuadrilla,
      dashboardTotal:Number(c.totalGarVtr)||0,
      rankingPropias:Number(p.totalGarVtr)||0,
      dashboardPct:Number(c.porcentajeVtrGar)||0,
      rankingPct:Number(p.porcentajeVtrGar)||0
    });
  });
  return {
    ok:true,
    version:MV493_VERSION_,
    modo:"SOLO_LECTURA",
    periodo:corte.periodo||"",
    actualizadoAl:corte.actualizadoAl||"",
    regla:"DASHBOARD_COMPLETO__RANKING_SOLO_PROPIAS",
    bonoAfectaRanking:false,
    resumen:resumen
  };
}
