/* ==========================================================
   MI VISUAL V515A - VTR/GAR TICKET CON MULTIPLES ORDENES WIN
   PEGAR INMEDIATAMENTE DESPUES DE V515 EN EL MISMO Code.gs.

   AJUSTE PUNTUAL
   - Un ticket VTR/GAR puede tener varias ORDEN_ID por reprogramacion,
     rescate o nueva atencion.
   - La incidencia se contabiliza UNA sola vez.
   - Solo cuenta si Jefatura ya dejo responsabilidad CONFIRMADA/REASIGNADA
     y AL MENOS UNA orden WIN asociada al ticket esta FINALIZADA.
   - CANCELADA / REPROGRAMADA / ANULADA no cuentan por si solas.
   - Las filas PENDIENTE solo aportan nuevas ORDEN_ID; nunca cambian
     la responsabilidad definida por Jefatura.
   - No modifica Dashboard, POR VTR/GAR, PRODUCCION_APP ni julio.
========================================================== */

var MV515A_VERSION_ = "V515A-VTRGAR-TICKET-MULTIPLES-ORDENES-20260828";

mv515IncidenciasRanking_ = function(cortePeriodo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV515_HOJA_BASE_);
  var estadosWin = mv515EstadosWinPorOrden_();
  var grupos = {};
  var diagnostico = {
    leidas:0,
    periodo:0,
    deduplicadas:0,
    noFinalizadas:0,
    sinEstadoWin:0,
    contabilizadas:0,
    ticketsMultiplesOrdenes:0
  };

  if (!hoja || hoja.getLastRow() <= 1) {
    return {propias:{}, diagnostico:diagnostico};
  }

  var datos = hoja.getDataRange().getValues();
  var cab = datos[0].map(mv515Norm_);
  var idx = {
    clave: mv515Idx_(cab, "CLAVE", 0),
    fecha: mv515Idx_(cab, "FECHA_INCIDENCIA", 1),
    tipo: mv515Idx_(cab, "TIPO", 2),
    ticket: mv515Idx_(cab, "TICKET", 3),
    orden: mv515Idx_(cab, "CODIGO_LIQUIDACION", 7),
    ejecutora: mv515Idx_(cab, "CUADRILLA_EJECUTORA", 9),
    estado: mv515Idx_(cab, "ESTADO_CALIFICACION", 11),
    responsable: mv515Idx_(cab, "CUADRILLA_RESPONSABLE", 12),
    fechaCalificacion: mv515Idx_(cab, "FECHA_CALIFICACION", 15),
    ultimaEdicion: mv515Idx_(cab, "FECHA_ULTIMA_EDICION", 17)
  };

  for (var i = 1; i < datos.length; i++) {
    diagnostico.leidas++;
    var fila = datos[i];
    if (!mv515MismoPeriodo_(fila[idx.fecha], cortePeriodo)) continue;
    diagnostico.periodo++;

    var tipo = mv515Norm_(fila[idx.tipo]);
    if (tipo !== "VTR" && tipo !== "GAR") continue;

    var clave = mv515ClaveIncidencia_(fila, idx);
    if (!grupos[clave]) grupos[clave] = [];
    var momento = mv515MomentoDecision_(fila, idx);
    grupos[clave].push({
      clave:clave,
      tipo:tipo,
      orden:String(fila[idx.orden] == null ? "" : fila[idx.orden]).trim(),
      ejecutora:mv515Cuadrilla_(fila[idx.ejecutora]),
      responsable:mv515Cuadrilla_(fila[idx.responsable]),
      estado:mv515Norm_(fila[idx.estado]),
      ts:momento ? momento.getTime() : 0
    });
  }

  var propias = {};

  Object.keys(grupos).forEach(function(clave) {
    var grupo = grupos[clave];
    if (grupo.length > 1) diagnostico.deduplicadas += grupo.length - 1;

    var item = mv515ElegirDecision_(grupo);
    if (!item || !item.responsable) return;

    var ordenesVistas = {};
    var estadosGrupo = [];
    grupo.forEach(function(g) {
      var orden = String(g && g.orden || "").trim();
      if (!orden || ordenesVistas[orden]) return;
      ordenesVistas[orden] = true;
      if (estadosWin[orden] && estadosWin[orden].estado) {
        estadosGrupo.push(estadosWin[orden].estado);
      }
    });

    if (Object.keys(ordenesVistas).length > 1) {
      diagnostico.ticketsMultiplesOrdenes++;
    }

    if (!estadosGrupo.length) {
      diagnostico.sinEstadoWin++;
      return;
    }

    var tieneFinalizada = estadosGrupo.some(function(estado) {
      return estado === "FINALIZADA" || estado === "FINALIZADO";
    });

    if (!tieneFinalizada) {
      diagnostico.noFinalizadas++;
      return;
    }

    var responsable = item.responsable;
    if (!propias[responsable]) propias[responsable] = {gar:0, vtr:0, total:0};
    if (item.tipo === "GAR") propias[responsable].gar++;
    if (item.tipo === "VTR") propias[responsable].vtr++;
    propias[responsable].total++;
    diagnostico.contabilizadas++;
  });

  return {propias:propias, diagnostico:diagnostico};
};

function DIAGNOSTICO_V515A_VTRGAR() {
  var corte = typeof obtenerCorteRankingAutomatico === "function"
    ? obtenerCorteRankingAutomatico()
    : {};
  var fecha = typeof convertirFechaRanking === "function"
    ? convertirFechaRanking(corte.actualizadoAl || "")
    : new Date();
  var calc = mv515IncidenciasRanking_(fecha);
  return {
    ok:true,
    version:MV515A_VERSION_,
    baseV515:typeof MV515_VERSION_ !== "undefined" ? MV515_VERSION_ : "NO_DETECTADA",
    regla:"RESPONSABLE_ORIGEN + TICKET_UNICO + ALGUNA_ORDEN_WIN_FINALIZADA",
    dashboardModificado:false,
    produccionAppModificada:false,
    periodo:corte.periodo || mv515PeriodoIso_(fecha),
    actualizadoAl:corte.actualizadoAl || "",
    diagnostico:calc.diagnostico,
    propias:calc.propias
  };
}
