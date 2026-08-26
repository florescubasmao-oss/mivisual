/* ==========================================================
   MI VISUAL V487.25 - DIAGNOSTICO V2 TIPO VTR/GAR DESDE WIN

   REQUIERE que ya exista en el mismo proyecto el diagnostico base:
   Code_V487_25_DIAGNOSTICO_WIN_SOLO_LECTURA.gs

   SEGURIDAD
   - SOLO LECTURA.
   - NO escribe hojas.
   - NO recalcula indicadores.
   - NO modifica Recableados, Produccion, Efectividad ni Ranking.

   REGLA NUEVA
   1) Se localiza el ticket en MAPA_ORDENES (WIN).
   2) Si CODIGO_SEGUIMIENTO inicia VTR- => tipo usado VTR.
   3) Si CODIGO_SEGUIMIENTO inicia GAR- => tipo usado GAR.
   4) El tipo historico se conserva solo como trazabilidad.
   5) Si existe discrepancia, WIN manda para buscar antecedente.
========================================================== */

function V48725_DIAG_V2_tipoPrefijo_(ticket) {
  var t = V48725_DIAG_norm_(ticket).replace(/\s+/g, "");
  if (/^VTR(?:-|$)/.test(t)) return "VTR";
  if (/^GAR(?:-|$)/.test(t)) return "GAR";
  return "";
}

function V48725_DIAG_V2_indiceTicketsWin_(win) {
  var indice = {};
  (win && win.lista ? win.lista : []).forEach(function(x){
    var ticket = String(x.codigoSeguimiento || "").trim();
    if (!ticket) return;
    var clave = V48725_DIAG_norm_(ticket);
    var tipo = V48725_DIAG_V2_tipoPrefijo_(ticket);
    if (!tipo) return;
    if (!indice[clave]) indice[clave] = [];
    indice[clave].push({
      tipo: tipo,
      ticket: ticket,
      ordenId: x.ordenId || "",
      dni: x.numeroDocumento || "",
      cuadrilla: x.cuadrilla || "",
      tipoTrabajoWin: x.tipoTrabajo || ""
    });
  });
  return indice;
}

function V48725_DIAG_V2_resolverTipo_(inc, indiceTickets) {
  var tipoHistorico = V48725_DIAG_norm_(inc && inc.tipo);
  var ticket = String(inc && inc.ticket || "").trim();
  var clave = V48725_DIAG_norm_(ticket);
  var coincidencias = (indiceTickets && indiceTickets[clave]) || [];

  if (!coincidencias.length) {
    return {
      fuenteTipo: "SIN_COINCIDENCIA_WIN",
      tipoHistorico: tipoHistorico,
      tipoWin: "",
      tipoUsado: tipoHistorico,
      discrepancia: false,
      ticketEncontradoWin: false
    };
  }

  var tipos = {};
  coincidencias.forEach(function(x){ if (x.tipo) tipos[x.tipo] = true; });
  var listaTipos = Object.keys(tipos);
  if (listaTipos.length !== 1) {
    return {
      fuenteTipo: "WIN_AMBIGUO",
      tipoHistorico: tipoHistorico,
      tipoWin: "",
      tipoUsado: tipoHistorico,
      discrepancia: false,
      ticketEncontradoWin: true,
      motivo: "El mismo ticket aparece con mas de un tipo en WIN"
    };
  }

  var tipoWin = listaTipos[0];
  return {
    fuenteTipo: "WIN_CODIGO_SEGUIMIENTO",
    tipoHistorico: tipoHistorico,
    tipoWin: tipoWin,
    tipoUsado: tipoWin,
    discrepancia: !!tipoHistorico && tipoHistorico !== tipoWin,
    ticketEncontradoWin: true,
    coincidenciasWin: coincidencias.length,
    tipoTrabajoWin: coincidencias[0].tipoTrabajoWin || ""
  };
}

function EJECUTAR_DIAGNOSTICO_V48725_TIPO_WIN_V2() {
  var win = V48725_DIAG_leerWin_();
  var pendientes = V48725_DIAG_leerPendientes_();
  var indiceTickets = V48725_DIAG_V2_indiceTicketsWin_(win);

  var resultados = pendientes.map(function(x){
    var resolucion = V48725_DIAG_V2_resolverTipo_(x, indiceTickets);
    var corregida = Object.assign({}, x, { tipo: resolucion.tipoUsado });
    var deteccion = V48725_DIAG_detectar_(corregida, win);
    return {
      ticket: x.ticket,
      dni: x.numeroDocumento,
      ejecutora: x.cuadrillaEjecutora,
      tipoHistorico: resolucion.tipoHistorico,
      tipoWin: resolucion.tipoWin,
      tipoUsado: resolucion.tipoUsado,
      fuenteTipo: resolucion.fuenteTipo,
      tipoTrabajoWin: resolucion.tipoTrabajoWin || "",
      discrepancia: resolucion.discrepancia,
      propuesta: deteccion.propuesta || "REVISION MANUAL",
      cuadrillaOrigen: deteccion.cuadrillaOrigen || "",
      ordenIdOrigen: deteccion.ordenIdOrigen || "",
      motivo: deteccion.motivo || ""
    };
  });

  var discrepancias = resultados.filter(function(x){ return x.discrepancia; });
  var conteo = { PROPIA:0, ASIGNADA:0, "REVISION MANUAL":0 };
  resultados.forEach(function(x){
    var p = x.propuesta || "REVISION MANUAL";
    conteo[p] = (conteo[p] || 0) + 1;
  });

  var esperados = [
    { ticket:"VTR-46128271", tipo:"VTR", propuesta:"PROPIA", cuadrilla:"P1 VISUAL SGI ELVI RONALD ATARAMA HERNANDEZ" },
    { ticket:"GAR-46249523", tipo:"GAR", propuesta:"ASIGNADA", cuadrilla:"P4 VISUAL SGI CESAR AUGUSTO INGOL RODRIGUEZ" },
    { ticket:"VTR-46866989", tipo:"VTR", propuesta:"REVISION MANUAL", cuadrilla:"" },
    { ticket:"VTR-46251243", tipo:"VTR", propuesta:"REVISION MANUAL", cuadrilla:"" }
  ];

  var controles = esperados.map(function(e){
    var r = resultados.filter(function(x){
      return V48725_DIAG_norm_(x.ticket) === V48725_DIAG_norm_(e.ticket);
    })[0];
    var ok = !!r &&
      r.tipoUsado === e.tipo &&
      r.propuesta === e.propuesta &&
      (!e.cuadrilla || V48725_DIAG_cuad_(r.cuadrillaOrigen) === V48725_DIAG_cuad_(e.cuadrilla));
    return {
      ticket:e.ticket,
      tipoEsperado:e.tipo,
      tipoHistorico:r ? r.tipoHistorico : "NO ENCONTRADO",
      tipoWin:r ? r.tipoWin : "NO ENCONTRADO",
      tipoUsado:r ? r.tipoUsado : "NO ENCONTRADO",
      propuestaEsperada:e.propuesta,
      propuestaObtenida:r ? r.propuesta : "NO ENCONTRADO",
      cuadrillaObtenida:r ? r.cuadrillaOrigen : "",
      discrepancia:r ? r.discrepancia : false,
      ok:ok
    };
  });

  var salida = {
    ok:true,
    version:"V487.25-DIAGNOSTICO-TIPO-WIN-V2",
    modo:"SOLO_LECTURA",
    reglaTipo:"CODIGO_SEGUIMIENTO WIN VTR-/GAR- TIENE PRIORIDAD",
    ordenesWinUnicas:win.ordenesUnicas,
    pendientesVtrGar:pendientes.length,
    propuestas:conteo,
    discrepanciasTipo:discrepancias.length,
    detalleDiscrepancias:discrepancias,
    controles:controles,
    seguridad:{
      escribeHojas:false,
      recalculaIndicadores:false,
      modificaRecableados:false,
      redefineFuncionesVigentes:false,
      partnerUsado:false
    }
  };

  var texto = JSON.stringify(salida, null, 2);
  console.log(texto);
  Logger.log(texto);
  return salida;
}
