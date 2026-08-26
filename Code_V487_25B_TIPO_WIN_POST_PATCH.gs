/* ==========================================================
   MI VISUAL V487.25B - CORRECCION DE TIPO VTR/GAR DESDE WIN

   USO
   - Este bloque debe ir DESPUES del parche funcional V487.25
     dentro del mismo archivo de Apps Script, para garantizar el orden.

   OBJETIVO
   - WIN manda tambien para determinar si la incidencia es VTR o GAR.
   - CODIGO_SEGUIMIENTO VTR- => VTR.
   - CODIGO_SEGUIMIENTO GAR- => GAR.
   - El tipo historico se conserva como trazabilidad.
   - Si hay discrepancia, se muestra en la respuesta, pero no se reescribe
     BASE_VTR_GAR_DETECTADA ni Validacion Tecnica.
   - La deteccion de cuadrilla responsable se recalcula con el tipo WIN.

   NO CAMBIA
   - Recableados.
   - Produccion.
   - Efectividad.
   - Registros historicos.
   - Regla CONFIRMADO + REASIGNADO para indicador VTR/GAR.
========================================================== */

var MV48725B_VERSION_ = "V487.25B-TIPO-WIN-20260826";

function mv48725bTipoPrefijoWin_(ticket) {
  var t = normalizarTexto(ticket || "").replace(/\s+/g, "");
  if (/^VTR(?:-|$)/.test(t)) return "VTR";
  if (/^GAR(?:-|$)/.test(t)) return "GAR";
  return "";
}

function mv48725bIndiceTicketsWin_(win) {
  var indice = {};
  ((win && win.lista) || []).forEach(function(x){
    var ticket = String(x.codigoSeguimiento || "").trim();
    if (!ticket) return;
    var tipo = mv48725bTipoPrefijoWin_(ticket);
    if (!tipo) return;
    var k = normalizarTexto(ticket);
    if (!indice[k]) indice[k] = [];
    indice[k].push({
      tipo:tipo,
      ticket:ticket,
      ordenId:x.ordenId || "",
      numeroDocumento:x.numeroDocumento || "",
      cuadrilla:x.cuadrilla || "",
      tipoTrabajoWin:x.tipoTrabajo || ""
    });
  });
  return indice;
}

function mv48725bResolverTipoWin_(item, indiceTickets) {
  var tipoHistorico = normalizarTexto(item && item.tipo);
  var ticket = String(item && item.ticket || "").trim();
  var k = normalizarTexto(ticket);
  var coincidencias = (indiceTickets && indiceTickets[k]) || [];

  if (!coincidencias.length) {
    return {
      tipoHistorico:tipoHistorico,
      tipoWin:"",
      tipoUsado:tipoHistorico,
      fuenteTipo:"HISTORICO_SIN_COINCIDENCIA_WIN",
      discrepancia:false,
      ticketEncontradoWin:false
    };
  }

  var tipos = {};
  coincidencias.forEach(function(x){ if (x.tipo) tipos[x.tipo] = true; });
  var listaTipos = Object.keys(tipos);
  if (listaTipos.length !== 1) {
    return {
      tipoHistorico:tipoHistorico,
      tipoWin:"",
      tipoUsado:tipoHistorico,
      fuenteTipo:"WIN_AMBIGUO",
      discrepancia:false,
      ticketEncontradoWin:true
    };
  }

  var tipoWin = listaTipos[0];
  return {
    tipoHistorico:tipoHistorico,
    tipoWin:tipoWin,
    tipoUsado:tipoWin,
    fuenteTipo:"WIN_CODIGO_SEGUIMIENTO",
    discrepancia:!!tipoHistorico && tipoHistorico !== tipoWin,
    ticketEncontradoWin:true,
    tipoTrabajoWin:coincidencias[0].tipoTrabajoWin || ""
  };
}

var MV48725B_listarGestionVtrGarBase_ = listarGestionVtrGar;
listarGestionVtrGar = function(data) {
  var r = MV48725B_listarGestionVtrGarBase_(data || {});
  if (!r || !r.ok || !Array.isArray(r.incidencias)) return r;

  var win = mv48725LeerMapaWinUltimoEstado_();
  var indiceTickets = mv48725bIndiceTicketsWin_(win);
  var discrepancias = 0;

  r.incidencias = r.incidencias.map(function(item){
    var salida = Object.assign({}, item);
    var tipo = mv48725bResolverTipoWin_(salida, indiceTickets);

    salida.tipoHistorico = tipo.tipoHistorico;
    salida.tipoWin = tipo.tipoWin;
    salida.tipo = tipo.tipoUsado;
    salida.fuenteTipo = tipo.fuenteTipo;
    salida.discrepanciaTipo = tipo.discrepancia;
    salida.tipoTrabajoWin = tipo.tipoTrabajoWin || salida.tipoTrabajoWin || "";

    if (tipo.discrepancia) {
      discrepancias++;
      var nota = "TIPO HISTORICO: " + (tipo.tipoHistorico || "-") +
        " | TIPO WIN: " + (tipo.tipoWin || "-") +
        " | WIN tiene prioridad para el analisis.";
      salida.observacionTipo = nota;
      salida.observacion = String(salida.observacion || "").trim();
      salida.observacion = salida.observacion ? (salida.observacion + " | " + nota) : nota;
    }

    salida.deteccionWin = mv48725DetectarOrigenWin_(salida, win);
    salida.fuentePrincipal = "WIN";
    return salida;
  });

  r.versionTipoWin = MV48725B_VERSION_;
  r.reglaTipo = "CODIGO_SEGUIMIENTO WIN VTR-/GAR- TIENE PRIORIDAD";
  r.discrepanciasTipo = discrepancias;
  r.win = Object.assign({}, r.win || {}, {
    tipoIncidencia:"CODIGO_SEGUIMIENTO VTR-/GAR-",
    prioridadTipoWin:true
  });
  return r;
};

function DIAGNOSTICO_V48725B_TIPO_WIN_SOLO_LECTURA() {
  var gestion = mv48725LeerGestionVtrGar_();
  var lista = (gestion && gestion.lista) || [];
  var win = mv48725LeerMapaWinUltimoEstado_();
  var indiceTickets = mv48725bIndiceTicketsWin_(win);

  var pendientes = lista.filter(function(x){
    return normalizarTexto(x.estadoCalificacion) === "PENDIENTE";
  });

  var casos = pendientes.map(function(item){
    var tipo = mv48725bResolverTipoWin_(item, indiceTickets);
    var corregido = Object.assign({}, item, {tipo:tipo.tipoUsado});
    var deteccion = mv48725DetectarOrigenWin_(corregido, win);
    return {
      ticket:item.ticket,
      tipoHistorico:tipo.tipoHistorico,
      tipoWin:tipo.tipoWin,
      tipoUsado:tipo.tipoUsado,
      discrepancia:tipo.discrepancia,
      propuesta:deteccion.propuesta || "REVISION MANUAL",
      cuadrillaOrigen:deteccion.cuadrillaOrigen || ""
    };
  });

  var salida = {
    ok:true,
    version:MV48725B_VERSION_,
    modo:"SOLO_LECTURA",
    pendientes:pendientes.length,
    discrepanciasTipo:casos.filter(function(x){return x.discrepancia;}).length,
    casosDiscrepantes:casos.filter(function(x){return x.discrepancia;}),
    seguridad:{
      escribeHojas:false,
      recalculaIndicadores:false,
      modificaRecableados:false
    }
  };

  var texto = JSON.stringify(salida, null, 2);
  console.log(texto);
  Logger.log(texto);
  return salida;
}
