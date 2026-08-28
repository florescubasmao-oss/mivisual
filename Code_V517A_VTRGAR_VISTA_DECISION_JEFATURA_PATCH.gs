/* ==========================================================
   MI VISUAL V517A - VTR/GAR VISTA CONSOLIDADA + DECISION JEFATURA

   ETAPA SEGURA:
   - Presenta VTR/GAR consolidado desde V517R.
   - Mini dashboard por estado WIN.
   - Registro tecnico REGISTRADA / NO REGISTRADA.
   - Antecedentes como ayuda, nunca como decision automatica.
   - Casos sin ticket VTR/GAR valido se separan como NO ESTANDAR.
   - SOLO JEFZNORTE puede decidir:
       CORRESPONDE
       REASIGNAR
       NO ES GAR/VTR
       ANULAR
   - Guarda la decision en BASE_VTR_GAR_DETECTADA.
   - NO recalcula Ranking, Dashboard, PRODUCCION_APP ni valorizacion.
   - Si se marca NO ES GAR/VTR y la orden esta FINALIZADA,
     la recuperacion a Produccion queda PENDIENTE para una etapa posterior.
========================================================== */

var MV517A_VERSION_ = "V517A-VTRGAR-VISTA-DECISION-JEFATURA-20260828";
var MV517A_PERIODO_CERRADO_HASTA_ = "2026-07";

function mv517APeriodosDisponibles_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(MV517_HOJA_BASE_);
  var vistos = {};
  if (!h || h.getLastRow() <= 1) return [];
  var vals = h.getRange(2,2,h.getLastRow()-1,1).getValues();
  vals.forEach(function(r){
    var p = mv517PeriodoIso_(r[0]);
    if (p) vistos[p] = true;
  });
  return Object.keys(vistos).sort().reverse();
}

function mv517AEsPeriodoCerrado_(periodo) {
  var p = String(periodo || "");
  return !!p && p <= MV517A_PERIODO_CERRADO_HASTA_;
}

function mv517ACumpleAlcance_(ctx, sede, cuadrilla) {
  try {
    return registroCumpleAlcanceCentral(ctx.usuario,ctx.permiso,{
      sede:sede || "",
      cuadrilla:cuadrilla || ""
    });
  } catch (_) {
    return true;
  }
}

function mv517AEstadoDecisionFinal_(estado) {
  var e = mv517Norm_(estado);
  return ["CONFIRMADO","REASIGNADO","ANULADO","NO_ES_GAR_VTR"].indexOf(e) >= 0;
}

function mv517ANotificacion_(incidencias, noEstandar) {
  var claves = {};
  var detalle = {
    clasificacion:0,
    bono:0,
    sinAntecedente:0,
    noEstandar:0,
    porRevisar:0
  };

  (incidencias || []).forEach(function(x){
    var key = "T|" + x.ticket;
    var finalizada = x.estadoWin === "FINALIZADA";
    var decision = !!x.decisionJefaturaValida;
    var requiere = false;

    if (finalizada && !decision) {
      detalle.clasificacion++;
      requiere = true;
      if (x.antecedente && x.antecedente.estado !== "SI") {
        detalle.sinAntecedente++;
      }
    }

    if (finalizada && x.validacionId) {
      var b = mv517Norm_(x.bono);
      if (b !== "BONO" && b !== "NO BONO") {
        detalle.bono++;
        requiere = true;
      }
    }

    if (x.estadoWin === "POR_REVISAR" && !decision) {
      detalle.porRevisar++;
      requiere = true;
    }

    if (requiere) claves[key] = true;
  });

  (noEstandar || []).forEach(function(x){
    if (x.resuelto) return;
    if (x.estadoWin !== "FINALIZADA" && x.estadoWin !== "POR_REVISAR") return;
    detalle.noEstandar++;
    claves["N|" + x.clave] = true;
  });

  return {
    usuarioExclusivo:MV517_USUARIO_VALIDADOR_,
    mostrarSoloJefatura:true,
    totalPendientes:Object.keys(claves).length,
    detalle:detalle
  };
}

function mv517ANoEstandar_(periodo, mapa, ctx) {
  var base = mv517RLeerBase_(periodo,mapa);
  var salida = [];

  (base.sinTicket || []).forEach(function(x){
    var mo = x.mapOrden || null;
    var estadoDecision = x.decisionValida
      ? mv517Norm_(x.estadoResponsabilidad)
      : "PENDIENTE";
    var sede = (mo && mo.sede) || x.sedeEjecutora || "";
    var cuadrilla = (mo && mo.cuadrilla) || x.cuadrillaEjecutora || "";
    if (!mv517ACumpleAlcance_(ctx,sede,cuadrilla)) return;

    salida.push({
      casoId:"BASE|" + x.clave,
      clave:x.clave,
      fila:x.fila,
      ticketMostrar:(mo && mo.codigoSeguimiento) || x.ticketBaseRaw || "SIN TICKET VTR/GAR",
      ordenId:x.ordenId,
      tipoBase:x.tipoBase,
      fechaIncidencia:mv517FechaIso_(x.fecha),
      codigoPedido:(mo && mo.codigoCliente) || x.codigoPedido || "",
      dni:(mo && mo.dni) || x.dni || "",
      sedeEjecutora:sede,
      cuadrillaEjecutora:cuadrilla,
      estadoWin:mo ? mo.estadoWin : "POR_REVISAR",
      motivoWin:mo ? (mo.motivoAnulacion || mo.motivoCancelacion || mo.motivoFinalizacion || "") : "",
      estadoDecision:estadoDecision,
      resuelto:!!x.decisionValida,
      calificadoPor:x.calificadoPor || "",
      observacion:x.observacion || "",
      requiereIntervencion:!x.decisionValida &&
        (!mo || mo.estadoWin === "FINALIZADA" || mo.estadoWin === "POR_REVISAR"),
      recuperacionProduccionPendiente:
        estadoDecision === "NO_ES_GAR_VTR" && !!mo && mo.estadoWin === "FINALIZADA"
    });
  });

  return salida;
}

function mv517AConstruirVista_(data) {
  data = data || {};
  var ctx = mv517AccesoLectura_(data);
  var periodo = String(data.periodo || mv517PeriodoObjetivo_(data)).trim();
  var mapa = mv517RLeerMapa_();
  var res = mv517Consolidar_({periodo:periodo});
  var vt = mv517LeerValidaciones_();

  var lista = (res.incidencias || []).filter(function(x){
    return mv517ACumpleAlcance_(
      ctx,
      x.sedeResponsable || x.sedeEjecutora || "",
      x.cuadrillaResponsable || x.cuadrillaEjecutora || ""
    );
  }).map(function(x){
    var y = Object.assign({},x);
    var r = vt[y.ticket] || null;
    y.validacionId = r ? r.id : "";
    y.registroTecnico = r ? "REGISTRADA" : "NO_REGISTRADA";
    y.tecnicoRegistro = r ? r.tecnico : "";
    y.cuadrillaRegistro = r ? r.cuadrilla : "";
    y.bono = r ? (r.resultado || "PENDIENTE") : "SIN_REGISTRO";
    y.puntajeVtrGar = r ? r.puntajeVtrGar : null;
    y.comentarioJefatura = r ? r.motivo : "";
    y.validadoPor = r ? r.validadoPor : "";
    y.sinAntecedenteDetectado = !!(y.antecedente && y.antecedente.estado === "NO");
    y.antecedenteCandidato = !!(y.antecedente && y.antecedente.estado === "CANDIDATO");
    y.requiereClasificacion = y.estadoWin === "FINALIZADA" && !y.decisionJefaturaValida;
    y.requiereBono = y.estadoWin === "FINALIZADA" && !!y.validacionId &&
      ["BONO","NO BONO"].indexOf(mv517Norm_(y.bono)) < 0;
    y.requiereIntervencion = y.requiereClasificacion || y.requiereBono ||
      (y.estadoWin === "POR_REVISAR" && !y.decisionJefaturaValida);
    return y;
  });

  var noEstandar = mv517ANoEstandar_(periodo,mapa,ctx);
  var resumen = mv517Resumen_(lista);
  resumen.sinAntecedenteDetectado = lista.filter(function(x){return x.sinAntecedenteDetectado;}).length;
  resumen.antecedenteCandidato = lista.filter(function(x){return x.antecedenteCandidato;}).length;
  resumen.noEstandar = noEstandar.length;
  resumen.noEstandarFinalizadas = noEstandar.filter(function(x){return x.estadoWin === "FINALIZADA";}).length;

  var notificacion = mv517ANotificacion_(lista,noEstandar);
  var cuadrillas = [];
  try {
    cuadrillas = Object.keys(cuadrillasTecnicasBaseOperativa() || {}).sort();
  } catch (_) {}

  return {
    ok:true,
    version:MV517A_VERSION_,
    baseV517R:MV517R_VERSION_,
    periodo:periodo,
    periodosDisponibles:mv517APeriodosDisponibles_(),
    periodoCerrado:mv517AEsPeriodoCerrado_(periodo),
    perfil:ctx.usuario.perfil,
    usuario:ctx.usuario.usuario,
    puedeValidar:mv517EsValidadorUnico_(ctx.usuario) && !mv517AEsPeriodoCerrado_(periodo),
    soloLectura:!mv517EsValidadorUnico_(ctx.usuario) || mv517AEsPeriodoCerrado_(periodo),
    usuarioValidadorUnico:MV517_USUARIO_VALIDADOR_,
    resumen:resumen,
    notificacionJefatura:notificacion,
    incidencias:lista,
    noEstandar:noEstandar,
    cuadrillas:cuadrillas,
    dashboardModificado:false,
    rankingModificado:false,
    produccionAppModificada:false,
    produccionValorizadaModificada:false
  };
}

function mv517AFilasObjetivo_(periodo, ticket, clave) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(MV517_HOJA_BASE_);
  if (!h || h.getLastRow() <= 1) throw new Error("No existe base VTR/GAR");

  var datos = h.getDataRange().getValues();
  var cab = datos[0];
  var idx = {
    clave:mv517Idx_(cab,"CLAVE",0),
    fecha:mv517Idx_(cab,"FECHA_INCIDENCIA",1),
    tipo:mv517Idx_(cab,"TIPO",2),
    ticket:mv517Idx_(cab,"TICKET",3),
    orden:mv517Idx_(cab,"CODIGO_LIQUIDACION",7),
    ejecutora:mv517Idx_(cab,"CUADRILLA_EJECUTORA",9)
  };

  var mapa = mv517RLeerMapa_();
  var ticketCanon = mv517TicketCanon_(ticket,"");
  var filas = [];

  for (var i=1; i<datos.length; i++) {
    var f = datos[i];
    if (mv517PeriodoIso_(f[idx.fecha]) !== periodo) continue;
    var claveFila = String(f[idx.clave] == null ? "" : f[idx.clave]).trim();
    var orden = String(f[idx.orden] == null ? "" : f[idx.orden]).trim();
    var mo = orden ? mapa.porOrden[orden] : null;
    var tWin = mo ? mv517TicketCanon_(mo.codigoSeguimiento,"") : "";
    var tBase = mv517TicketCanon_(f[idx.ticket],"");
    var tResuelto = tWin || tBase;

    if (clave && claveFila === clave) {
      filas.push({fila:i+1,datos:f,ticket:tResuelto,mapOrden:mo});
      continue;
    }
    if (ticketCanon && tResuelto === ticketCanon) {
      filas.push({fila:i+1,datos:f,ticket:tResuelto,mapOrden:mo});
    }
  }

  return {hoja:h,cab:cab,idx:idx,filas:filas,ticketCanon:ticketCanon};
}

function mv517AClasificar_(data) {
  data = data || {};
  var usuario = mv517ExigirValidadorUnico_(data);
  var periodo = String(data.periodo || mv517PeriodoObjetivo_(data)).trim();
  if (mv517AEsPeriodoCerrado_(periodo)) {
    throw new Error("El periodo " + periodo + " esta cerrado y queda en solo lectura.");
  }

  var decision = mv517Norm_(data.decision);
  if (["CORRESPONDE","REASIGNAR","ANULAR","NO_ES_GAR_VTR"].indexOf(decision) < 0) {
    throw new Error("Decision VTR/GAR no valida");
  }

  var ticket = String(data.ticket || "").trim();
  var clave = String(data.clave || "").trim();
  if (!ticket && !clave) throw new Error("Falta identificar el caso VTR/GAR");

  var observacion = String(data.observacion || "").trim();
  if ((decision === "ANULAR" || decision === "NO_ES_GAR_VTR") && !observacion) {
    throw new Error("Debe ingresar el motivo de la decision.");
  }

  var obj = mv517AFilasObjetivo_(periodo,ticket,clave);
  if (!obj.filas.length) throw new Error("No se encontro el caso en BASE_VTR_GAR_DETECTADA");

  var estadoNuevo = "";
  var responsable = "";
  var sedeResponsable = "";
  var cuadrillas = cuadrillasTecnicasBaseOperativa() || {};

  if (decision === "CORRESPONDE") {
    estadoNuevo = "CONFIRMADO";
    var ref = obj.filas[0];
    responsable = normalizarCuadrilla(
      (ref.mapOrden && ref.mapOrden.cuadrilla) || ref.datos[obj.idx.ejecutora] || ""
    );
  } else if (decision === "REASIGNAR") {
    estadoNuevo = "REASIGNADO";
    responsable = normalizarCuadrilla(data.cuadrillaResponsable || "");
    if (!responsable) throw new Error("Seleccione la cuadrilla responsable");
  } else if (decision === "NO_ES_GAR_VTR") {
    estadoNuevo = "NO_ES_GAR_VTR";
  } else {
    estadoNuevo = "ANULADO";
  }

  if (responsable) {
    if (!cuadrillas[responsable]) throw new Error("La cuadrilla responsable no existe o no esta activa");
    sedeResponsable = cuadrillas[responsable].sede || "";
  }

  var ahora = new Date();
  var tipoCanon = obj.ticketCanon ? mv517TipoTicket_(obj.ticketCanon,"") : "";

  obj.filas.forEach(function(x){
    if (obj.ticketCanon) {
      if (tipoCanon) obj.hoja.getRange(x.fila,3).setValue(tipoCanon);
      obj.hoja.getRange(x.fila,4).setValue(obj.ticketCanon);
    }
    obj.hoja.getRange(x.fila,12,1,7).setValues([[
      estadoNuevo,
      responsable,
      sedeResponsable,
      usuario.usuario,
      ahora,
      observacion,
      ahora
    ]]);
    obj.hoja.getRange(x.fila,16).setNumberFormat("dd/mm/yyyy hh:mm");
    obj.hoja.getRange(x.fila,18).setNumberFormat("dd/mm/yyyy hh:mm");
  });

  SpreadsheetApp.flush();

  var estadoWin = "";
  try {
    var vista = mv517AConstruirVista_({usuario:usuario.usuario,periodo:periodo});
    var caso = (vista.incidencias || []).filter(function(x){
      return obj.ticketCanon && x.ticket === obj.ticketCanon;
    })[0];
    if (!caso && clave) {
      caso = (vista.noEstandar || []).filter(function(x){return x.clave === clave;})[0];
    }
    estadoWin = caso ? caso.estadoWin : "";
  } catch (_) {}

  return {
    ok:true,
    version:MV517A_VERSION_,
    decision:decision,
    estado:estadoNuevo,
    ticket:obj.ticketCanon || ticket || "",
    clave:clave,
    filasActualizadas:obj.filas.length,
    cuadrillaResponsable:responsable,
    estadoWin:estadoWin,
    recuperacionProduccionPendiente:
      decision === "NO_ES_GAR_VTR" && estadoWin === "FINALIZADA",
    impactoIndicadoresPendiente:true,
    dashboardModificado:false,
    rankingModificado:false,
    produccionAppModificada:false,
    produccionValorizadaModificada:false
  };
}

function DIAGNOSTICO_V517A_VTRGAR() {
  return mv517AConstruirVista_({usuario:MV517_USUARIO_VALIDADOR_});
}

function VER_DIAGNOSTICO_V517A_VTRGAR() {
  var r = DIAGNOSTICO_V517A_VTRGAR();
  console.log(JSON.stringify({
    ok:r.ok,
    version:r.version,
    periodo:r.periodo,
    periodoCerrado:r.periodoCerrado,
    puedeValidar:r.puedeValidar,
    usuarioValidadorUnico:r.usuarioValidadorUnico,
    resumen:r.resumen,
    notificacionJefatura:r.notificacionJefatura,
    noEstandar:r.noEstandar,
    muestraPendientes:(r.incidencias || []).filter(function(x){
      return x.requiereIntervencion;
    }).slice(0,10)
  },null,2));
  return r;
}

var MV517A_doGetBase_ = doGet;
doGet = function(e) {
  var p = typeof parametrosGetMiVisual_ === "function"
    ? parametrosGetMiVisual_(e)
    : Object.assign({}, e && e.parameter ? e.parameter : {});
  try {
    if (p.accion === "diagnosticoV517AVtrGar") {
      return respuestaJson({
        ok:true,
        versionV517A:MV517A_VERSION_,
        activo:true,
        usuarioValidadorUnico:MV517_USUARIO_VALIDADOR_,
        dashboardModificado:false,
        rankingModificado:false,
        produccionAppModificada:false
      });
    }
    if (p.accion === "notificacionVtrGarV517A") {
      var r = mv517AConstruirVista_(p);
      return respuestaJson({
        ok:true,
        versionV517A:MV517A_VERSION_,
        periodo:r.periodo,
        puedeValidar:r.puedeValidar,
        notificacionJefatura:r.notificacionJefatura
      });
    }
  } catch (err) {
    return respuestaJson({
      ok:false,
      error:err && err.message ? err.message : String(err),
      versionV517A:MV517A_VERSION_
    });
  }
  return MV517A_doGetBase_(e);
};

var MV517A_doPostBase_ = doPost;
doPost = function(e) {
  var data = {};
  try {
    data = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (_) {
    data = {};
  }

  try {
    if (data.accion === "listarVtrGarV517A") {
      return respuestaJson(mv517AConstruirVista_(data));
    }
    if (data.accion === "clasificarVtrGarV517A") {
      return respuestaJson(mv517AClasificar_(data));
    }
  } catch (err) {
    return respuestaJson({
      ok:false,
      error:err && err.message ? err.message : String(err),
      versionV517A:MV517A_VERSION_
    });
  }

  return MV517A_doPostBase_(e);
};