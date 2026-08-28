/* ==========================================================
   MI VISUAL V517 - VTR/GAR CONSOLIDACION WIN + ACCESO UNICO
   PEGAR AL FINAL DEL Code.gs VIGENTE, DESPUES DE V515A.

   OBJETIVOS
   1) MAPA_ORDENES es la fuente WIN oficial para el estado operativo.
   2) Un ticket VTR/GAR se consolida UNA sola vez aunque tenga varias ordenes.
   3) Si alguna orden del ticket termina FINALIZADA => ticket FINALIZADA.
   4) Si nunca finaliza, conserva su ultimo resultado operativo:
      REPROGRAMADA / CANCELADA / ANULADA / POR_REVISAR.
   5) Cruza VALIDACION_TECNICA para indicar REGISTRADA / NO_REGISTRADA.
   6) Compara tickets detectados en MAPA_ORDENES contra BASE_VTR_GAR_DETECTADA.
   7) Solo el usuario JEFZNORTE puede validar responsabilidad,
      BONO / NO BONO, puntaje y comentario VTR/GAR.
   8) Los demas perfiles con permiso VER pueden consultar en solo lectura.
   9) NO modifica Dashboard, Ranking, PRODUCCION_APP ni Produccion Valorizada.
========================================================== */

var MV517_VERSION_ = "V517-VTRGAR-CONSOLIDACION-WIN-ACCESO-20260828";
var MV517_USUARIO_VALIDADOR_ = "JEFZNORTE";
var MV517_HOJA_MAPA_ = "MAPA_ORDENES";
var MV517_HOJA_BASE_ = "BASE_VTR_GAR_DETECTADA";
var MV517_HOJA_VT_ = "VALIDACION_TECNICA";

function mv517Norm_(v) {
  return String(v == null ? "" : v)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mv517Fecha_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return new Date(v.getTime());
  var t = String(v == null ? "" : v).trim();
  if (!t) return null;
  var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    return isNaN(d.getTime()) ? null : d;
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var di = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    return isNaN(di.getTime()) ? null : di;
  }
  var dg = new Date(t);
  return isNaN(dg.getTime()) ? null : dg;
}

function mv517PeriodoIso_(v) {
  var f = mv517Fecha_(v);
  if (!f) return "";
  return String(f.getFullYear()) + "-" + String(f.getMonth() + 1).padStart(2, "0");
}

function mv517FechaIso_(v) {
  var f = mv517Fecha_(v);
  if (!f) return "";
  return Utilities.formatDate(f, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function mv517PeriodoObjetivo_(data) {
  var p = String((data || {}).periodo || "").trim();
  if (/^\d{4}-\d{2}$/.test(p)) return p;
  try {
    var corte = obtenerCorteRankingAutomatico();
    var f = convertirFechaRanking(corte.actualizadoAl || "");
    if (f) return mv517PeriodoIso_(f);
  } catch (_) {}
  return mv517PeriodoIso_(new Date());
}

function mv517Idx_(cab, nombre, respaldo) {
  var n = mv517Norm_(nombre);
  for (var i = 0; i < cab.length; i++) {
    if (mv517Norm_(cab[i]) === n) return i;
  }
  return respaldo;
}

function mv517TicketCanon_(valor, tipoSugerido) {
  var t = mv517Norm_(valor).replace(/\s+/g, "");
  var m = t.match(/(VTR|GAR)-?(\d+)/);
  if (m) return m[1] + "-" + m[2];
  var tipo = mv517Norm_(tipoSugerido);
  if (tipo === "REITERADA") tipo = "VTR";
  if (tipo === "GARANTIA" || tipo === "GARANTÍA") tipo = "GAR";
  if (tipo !== "VTR" && tipo !== "GAR") return "";
  var dig = t.replace(/\D/g, "");
  return dig ? tipo + "-" + dig : "";
}

function mv517TipoTicket_(ticket, respaldo) {
  var t = mv517Norm_(ticket);
  if (t.indexOf("VTR-") === 0) return "VTR";
  if (t.indexOf("GAR-") === 0) return "GAR";
  var r = mv517Norm_(respaldo);
  if (r === "REITERADA") return "VTR";
  if (r === "GARANTIA" || r === "GARANTÍA") return "GAR";
  return r === "VTR" || r === "GAR" ? r : "";
}

function mv517MomentoMax_() {
  var mejor = null;
  for (var i = 0; i < arguments.length; i++) {
    var f = mv517Fecha_(arguments[i]);
    if (f && (!mejor || f.getTime() > mejor.getTime())) mejor = f;
  }
  return mejor;
}

function mv517EstadoEfectivo_(estado, motivoCancelacion, motivoAnulacion) {
  var e = mv517Norm_(estado);
  var mc = mv517Norm_(motivoCancelacion);
  var ma = mv517Norm_(motivoAnulacion);
  if (e === "FINALIZADA" || e === "FINALIZADO") return "FINALIZADA";
  if (e.indexOf("ANUL") >= 0 || ma) return "ANULADA";
  if (e.indexOf("REPROGRAM") >= 0) return "REPROGRAMADA";
  if (e.indexOf("CANCEL") >= 0 && mc.indexOf("REPROGRAM") >= 0) return "REPROGRAMADA";
  if (e.indexOf("CANCEL") >= 0) return "CANCELADA";
  return e || "POR_REVISAR";
}

function mv517LeerMapa_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV517_HOJA_MAPA_);
  var salida = {porOrden:{}, porTicket:{}, lista:[]};
  if (!hoja || hoja.getLastRow() <= 1) return salida;

  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  var idx = {
    orden:mv517Idx_(cab,"ORDEN_ID",0),
    tipoTrabajo:mv517Idx_(cab,"TIPO_TRABAJO",1),
    fechaSolicitud:mv517Idx_(cab,"FECHA_SOLICITUD",2),
    cuadrilla:mv517Idx_(cab,"CUADRILLA",7),
    estado:mv517Idx_(cab,"ESTADO",8),
    fechaUltimo:mv517Idx_(cab,"FECHA_ULTIMO_ESTADO",11),
    region:mv517Idx_(cab,"REGION",13),
    codigoCliente:mv517Idx_(cab,"CODIGO_CLIENTE",14),
    dni:mv517Idx_(cab,"NUMERO_DOCUMENTO",15),
    fechaFin:mv517Idx_(cab,"FECHA_FIN_VISITA",18),
    fechaInicio:mv517Idx_(cab,"FECHA_INICIO_VISITA",19),
    motivoCancel:mv517Idx_(cab,"MOTIVO_CANCELACION",20),
    motivoFinal:mv517Idx_(cab,"MOTIVO_FINALIZACION",21),
    motivoAnul:mv517Idx_(cab,"MOTIVO_ANULACION",22),
    fechaImport:mv517Idx_(cab,"FECHA_IMPORTACION",26),
    seguimiento:mv517Idx_(cab,"CODIGO_SEGUIMIENTO",36)
  };

  var porOrden = {};
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    var orden = String(f[idx.orden] == null ? "" : f[idx.orden]).trim();
    if (!orden) continue;
    var momento = mv517MomentoMax_(f[idx.fechaUltimo],f[idx.fechaFin],f[idx.fechaInicio],f[idx.fechaSolicitud],f[idx.fechaImport]);
    var ts = momento ? momento.getTime() : 0;
    var ticket = mv517TicketCanon_(f[idx.seguimiento],f[idx.tipoTrabajo]);
    var item = {
      ordenId:orden,
      ticket:ticket,
      tipo:mv517TipoTicket_(ticket,f[idx.tipoTrabajo]),
      tipoTrabajo:String(f[idx.tipoTrabajo] == null ? "" : f[idx.tipoTrabajo]).trim(),
      fechaSolicitud:f[idx.fechaSolicitud],
      fechaSolicitudISO:mv517FechaIso_(f[idx.fechaSolicitud]),
      cuadrilla:String(f[idx.cuadrilla] == null ? "" : f[idx.cuadrilla]).trim(),
      sede:String(f[idx.region] == null ? "" : f[idx.region]).trim(),
      codigoCliente:String(f[idx.codigoCliente] == null ? "" : f[idx.codigoCliente]).trim(),
      dni:String(f[idx.dni] == null ? "" : f[idx.dni]).trim(),
      estadoOriginal:String(f[idx.estado] == null ? "" : f[idx.estado]).trim(),
      estadoWin:mv517EstadoEfectivo_(f[idx.estado],f[idx.motivoCancel],f[idx.motivoAnul]),
      motivoCancelacion:String(f[idx.motivoCancel] == null ? "" : f[idx.motivoCancel]).trim(),
      motivoFinalizacion:String(f[idx.motivoFinal] == null ? "" : f[idx.motivoFinal]).trim(),
      motivoAnulacion:String(f[idx.motivoAnul] == null ? "" : f[idx.motivoAnul]).trim(),
      momento:ts
    };
    if (!porOrden[orden] || ts >= porOrden[orden].momento) porOrden[orden] = item;
  }

  salida.porOrden = porOrden;
  Object.keys(porOrden).forEach(function(orden){
    var item = porOrden[orden];
    salida.lista.push(item);
    if (!item.ticket) return;
    if (!salida.porTicket[item.ticket]) salida.porTicket[item.ticket] = [];
    salida.porTicket[item.ticket].push(item);
  });
  return salida;
}

function mv517LeerBase_(periodo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV517_HOJA_BASE_);
  var grupos = {};
  var leidas = 0;
  if (!hoja || hoja.getLastRow() <= 1) return {grupos:grupos,leidas:0};

  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  var idx = {
    clave:mv517Idx_(cab,"CLAVE",0),
    fecha:mv517Idx_(cab,"FECHA_INCIDENCIA",1),
    tipo:mv517Idx_(cab,"TIPO",2),
    ticket:mv517Idx_(cab,"TICKET",3),
    dni:mv517Idx_(cab,"NUMERO_DOCUMENTO",4),
    cliente:mv517Idx_(cab,"CLIENTE",5),
    pedido:mv517Idx_(cab,"CODIGO_PEDIDO",6),
    orden:mv517Idx_(cab,"CODIGO_LIQUIDACION",7),
    ejecutora:mv517Idx_(cab,"CUADRILLA_EJECUTORA",9),
    sedeEjecutora:mv517Idx_(cab,"SEDE_EJECUTORA",10),
    estadoCalif:mv517Idx_(cab,"ESTADO_CALIFICACION",11),
    responsable:mv517Idx_(cab,"CUADRILLA_RESPONSABLE",12),
    sedeResponsable:mv517Idx_(cab,"SEDE_RESPONSABLE",13),
    calificadoPor:mv517Idx_(cab,"CALIFICADO_POR",14),
    fechaCalif:mv517Idx_(cab,"FECHA_CALIFICACION",15),
    observacion:mv517Idx_(cab,"OBSERVACION",16),
    ultimaEdicion:mv517Idx_(cab,"FECHA_ULTIMA_EDICION",17)
  };

  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    if (mv517PeriodoIso_(f[idx.fecha]) !== periodo) continue;
    var tipo = mv517Norm_(f[idx.tipo]);
    if (tipo !== "VTR" && tipo !== "GAR") continue;
    leidas++;
    var ticket = mv517TicketCanon_(f[idx.ticket],tipo);
    if (!ticket) ticket = mv517TicketCanon_(f[idx.clave],tipo);
    if (!ticket) continue;
    if (!grupos[ticket]) grupos[ticket] = {ticket:ticket,tipo:tipo,filas:[],ordenes:{}};
    var momento = mv517MomentoMax_(f[idx.ultimaEdicion],f[idx.fechaCalif],f[idx.fecha]);
    var item = {
      ticket:ticket,
      tipo:tipo,
      fecha:f[idx.fecha],
      dni:String(f[idx.dni] == null ? "" : f[idx.dni]).trim(),
      cliente:String(f[idx.cliente] == null ? "" : f[idx.cliente]).trim(),
      codigoPedido:String(f[idx.pedido] == null ? "" : f[idx.pedido]).trim(),
      ordenId:String(f[idx.orden] == null ? "" : f[idx.orden]).trim(),
      cuadrillaEjecutora:String(f[idx.ejecutora] == null ? "" : f[idx.ejecutora]).trim(),
      sedeEjecutora:String(f[idx.sedeEjecutora] == null ? "" : f[idx.sedeEjecutora]).trim(),
      estadoResponsabilidad:mv517Norm_(f[idx.estadoCalif]) || "PENDIENTE",
      cuadrillaResponsable:String(f[idx.responsable] == null ? "" : f[idx.responsable]).trim(),
      sedeResponsable:String(f[idx.sedeResponsable] == null ? "" : f[idx.sedeResponsable]).trim(),
      calificadoPor:String(f[idx.calificadoPor] == null ? "" : f[idx.calificadoPor]).trim(),
      observacion:String(f[idx.observacion] == null ? "" : f[idx.observacion]).trim(),
      momentoDecision:momento ? momento.getTime() : 0
    };
    grupos[ticket].filas.push(item);
    if (item.ordenId) grupos[ticket].ordenes[item.ordenId] = true;
  }

  Object.keys(grupos).forEach(function(ticket){
    grupos[ticket].filas.sort(function(a,b){ return b.momentoDecision - a.momentoDecision; });
    grupos[ticket].actual = grupos[ticket].filas[0] || {};
  });
  return {grupos:grupos,leidas:leidas};
}

function mv517LeerValidaciones_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV517_HOJA_VT_);
  var porTicket = {};
  if (!hoja || hoja.getLastRow() <= 1) return porTicket;

  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  var idx = {
    id:mv517Idx_(cab,"ID",0),
    fecha:mv517Idx_(cab,"FECHA_REGISTRO",1),
    hora:mv517Idx_(cab,"HORA_REGISTRO",2),
    sede:mv517Idx_(cab,"SEDE",3),
    tecnico:mv517Idx_(cab,"TECNICO",4),
    cuadrilla:mv517Idx_(cab,"CUADRILLA",5),
    tipo:mv517Idx_(cab,"TIPO_VALIDACION",6),
    codigo:mv517Idx_(cab,"CODIGO",7),
    ticket:mv517Idx_(cab,"TICKET_FINAL",10),
    estado:mv517Idx_(cab,"ESTADO",13),
    resultado:mv517Idx_(cab,"RESULTADO_FINAL",14),
    validadoPor:mv517Idx_(cab,"VALIDADO_POR",15),
    fechaVal:mv517Idx_(cab,"FECHA_VALIDACION",17),
    horaVal:mv517Idx_(cab,"HORA_VALIDACION",18),
    motivo:mv517Idx_(cab,"MOTIVO_VALIDACION",19),
    puntaje:mv517Idx_(cab,"PUNTAJE_VTR_GAR",-1)
  };

  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    var tipo = mv517Norm_(f[idx.tipo]);
    if (tipo !== "VTR" && tipo !== "GAR") continue;
    var ticket = mv517TicketCanon_(f[idx.ticket],tipo);
    if (!ticket) continue;
    var momento = mv517MomentoMax_(f[idx.fechaVal],f[idx.fecha]);
    var item = {
      id:String(f[idx.id] == null ? "" : f[idx.id]).trim(),
      ticket:ticket,
      fechaRegistro:mv517FechaIso_(f[idx.fecha]),
      sede:String(f[idx.sede] == null ? "" : f[idx.sede]).trim(),
      tecnico:String(f[idx.tecnico] == null ? "" : f[idx.tecnico]).trim(),
      cuadrilla:String(f[idx.cuadrilla] == null ? "" : f[idx.cuadrilla]).trim(),
      estado:mv517Norm_(f[idx.estado]) || "PENDIENTE",
      resultado:mv517Norm_(f[idx.resultado]) || "PENDIENTE",
      validadoPor:String(f[idx.validadoPor] == null ? "" : f[idx.validadoPor]).trim(),
      motivo:String(f[idx.motivo] == null ? "" : f[idx.motivo]).trim(),
      puntajeVtrGar:idx.puntaje >= 0 && f[idx.puntaje] !== "" ? Number(f[idx.puntaje]) : null,
      momento:momento ? momento.getTime() : 0
    };
    if (!porTicket[ticket] || item.momento >= porTicket[ticket].momento) porTicket[ticket] = item;
  }
  return porTicket;
}

function mv517EstadoConsolidado_(ordenes) {
  var lista = ordenes || [];
  if (!lista.length) return "POR_REVISAR";
  var finalizada = lista.some(function(x){ return x.estadoWin === "FINALIZADA"; });
  if (finalizada) return "FINALIZADA";
  lista.sort(function(a,b){ return (b.momento || 0) - (a.momento || 0); });
  var e = lista[0] && lista[0].estadoWin ? lista[0].estadoWin : "POR_REVISAR";
  if (["REPROGRAMADA","CANCELADA","ANULADA"].indexOf(e) >= 0) return e;
  return "POR_REVISAR";
}

function mv517Resumen_(lista) {
  var r = {
    total:0,finalizadas:0,reprogramadas:0,canceladas:0,anuladas:0,porRevisar:0,
    registradas:0,noRegistradas:0,responsabilidadDefinida:0,responsabilidadPendiente:0
  };
  (lista || []).forEach(function(x){
    r.total++;
    if (x.estadoWin === "FINALIZADA") r.finalizadas++;
    else if (x.estadoWin === "REPROGRAMADA") r.reprogramadas++;
    else if (x.estadoWin === "CANCELADA") r.canceladas++;
    else if (x.estadoWin === "ANULADA") r.anuladas++;
    else r.porRevisar++;
    if (x.registroTecnico === "REGISTRADA") r.registradas++; else r.noRegistradas++;
    if (x.responsabilidadDefinida) r.responsabilidadDefinida++; else r.responsabilidadPendiente++;
  });
  return r;
}

function mv517Consolidar_(data) {
  var periodo = mv517PeriodoObjetivo_(data);
  var mapa = mv517LeerMapa_();
  var base = mv517LeerBase_(periodo);
  var vt = mv517LeerValidaciones_();
  var ticketsBase = base.grupos || {};
  var lista = [];

  Object.keys(ticketsBase).sort().forEach(function(ticket){
    var g = ticketsBase[ticket];
    var actual = g.actual || {};
    var candidatos = {};

    (mapa.porTicket[ticket] || []).forEach(function(x){ candidatos[x.ordenId] = x; });
    Object.keys(g.ordenes || {}).forEach(function(orden){
      if (mapa.porOrden[orden]) candidatos[orden] = mapa.porOrden[orden];
    });

    var ordenes = Object.keys(candidatos).map(function(k){ return candidatos[k]; });
    var estadoWin = mv517EstadoConsolidado_(ordenes.slice());
    var reg = vt[ticket] || null;
    var estadoResp = mv517Norm_(actual.estadoResponsabilidad || "PENDIENTE");
    var respDef = (estadoResp === "CONFIRMADO" || estadoResp === "REASIGNADO") && !!actual.cuadrillaResponsable;

    lista.push({
      ticket:ticket,
      tipo:g.tipo || mv517TipoTicket_(ticket,""),
      fechaIncidencia:mv517FechaIso_(actual.fecha),
      sedeEjecutora:actual.sedeEjecutora || "",
      cuadrillaEjecutora:actual.cuadrillaEjecutora || "",
      dni:actual.dni || "",
      codigoPedido:actual.codigoPedido || "",
      estadoWin:estadoWin,
      ordenesWin:ordenes.map(function(x){
        return {
          ordenId:x.ordenId,
          estado:x.estadoWin,
          estadoOriginal:x.estadoOriginal,
          fechaSolicitud:x.fechaSolicitudISO,
          cuadrilla:x.cuadrilla,
          motivoCancelacion:x.motivoCancelacion,
          motivoFinalizacion:x.motivoFinalizacion,
          motivoAnulacion:x.motivoAnulacion
        };
      }),
      cantidadOrdenesWin:ordenes.length,
      registroTecnico:reg ? "REGISTRADA" : "NO_REGISTRADA",
      tecnicoRegistro:reg ? reg.tecnico : "",
      cuadrillaRegistro:reg ? reg.cuadrilla : "",
      estadoRegistroTecnico:reg ? reg.estado : "SIN_REGISTRO",
      bono:reg ? reg.resultado : "SIN_REGISTRO",
      puntajeVtrGar:reg ? reg.puntajeVtrGar : null,
      comentarioJefatura:reg ? reg.motivo : "",
      validadoPor:reg ? reg.validadoPor : "",
      estadoResponsabilidad:estadoResp || "PENDIENTE",
      cuadrillaResponsable:actual.cuadrillaResponsable || "",
      sedeResponsable:actual.sedeResponsable || "",
      responsabilidadDefinida:respDef,
      impactaRanking:estadoWin === "FINALIZADA" && respDef,
      impactaProduccionNormal:false,
      impactaProduccionValorizada:false
    });
  });

  var winPeriodo = {};
  mapa.lista.forEach(function(x){
    if (!x.ticket || mv517PeriodoIso_(x.fechaSolicitud) !== periodo) return;
    if (x.tipo !== "VTR" && x.tipo !== "GAR") return;
    winPeriodo[x.ticket] = true;
  });

  var faltantesEnBase = Object.keys(winPeriodo).filter(function(ticket){ return !ticketsBase[ticket]; }).sort();
  var sinCruceWin = lista.filter(function(x){ return !x.cantidadOrdenesWin; }).map(function(x){ return x.ticket; }).sort();

  return {
    ok:true,
    version:MV517_VERSION_,
    periodo:periodo,
    fuentePrincipal:MV517_HOJA_MAPA_,
    baseConsolidada:MV517_HOJA_BASE_,
    validacionTecnica:MV517_HOJA_VT_,
    usuarioValidadorUnico:MV517_USUARIO_VALIDADOR_,
    dashboardModificado:false,
    rankingModificado:false,
    produccionAppModificada:false,
    produccionValorizadaModificada:false,
    resumen:mv517Resumen_(lista),
    integridad:{
      filasBasePeriodo:base.leidas,
      ticketsUnicosBase:Object.keys(ticketsBase).length,
      ticketsWinPeriodo:Object.keys(winPeriodo).length,
      faltantesEnBase:faltantesEnBase,
      cantidadFaltantesEnBase:faltantesEnBase.length,
      ticketsBaseSinCruceWin:sinCruceWin,
      cantidadBaseSinCruceWin:sinCruceWin.length
    },
    incidencias:lista
  };
}

function mv517EsValidadorUnico_(usuarioObj) {
  if (!usuarioObj) return false;
  return mv517Norm_(usuarioObj.usuario) === MV517_USUARIO_VALIDADOR_ &&
    mv517Norm_(usuarioObj.perfil) === "JEFATURA";
}

function mv517ExigirValidadorUnico_(data) {
  var usuario = obtenerUsuarioApp((data || {}).usuario);
  if (!mv517EsValidadorUnico_(usuario)) {
    throw new Error("Solo JEFZNORTE puede validar o modificar VTR/GAR. Los demas perfiles son de solo lectura.");
  }
  exigirPermisoModuloCentral(usuario,"VALIDACION TECNICA","VALIDAR");
  return usuario;
}

function mv517AccesoLectura_(data) {
  var usuario = obtenerUsuarioApp((data || {}).usuario);
  if (mv517Norm_(usuario.perfil) === "TECNICO") {
    throw new Error("La vista consolidada VTR/GAR no corresponde al perfil Tecnico.");
  }
  var permiso = exigirPermisoModuloCentral(usuario,"VALIDACION TECNICA","VER");
  return {usuario:usuario,permiso:permiso};
}

function mv517ListarParaUsuario_(data) {
  var ctx = mv517AccesoLectura_(data);
  var res = mv517Consolidar_(data);
  res.incidencias = (res.incidencias || []).filter(function(x){
    return registroCumpleAlcanceCentral(ctx.usuario,ctx.permiso,{
      sede:x.sedeResponsable || x.sedeEjecutora || "",
      cuadrilla:x.cuadrillaResponsable || x.cuadrillaEjecutora || ""
    });
  });
  res.resumen = mv517Resumen_(res.incidencias);
  res.perfil = ctx.usuario.perfil;
  res.alcance = ctx.permiso.alcanceDatos || "";
  res.puedeValidar = mv517EsValidadorUnico_(ctx.usuario);
  res.soloLectura = !res.puedeValidar;
  return res;
}

/* Seguridad incremental sobre las rutas de escritura existentes. */
if (typeof mv515ExigirJefatura_ === "function") {
  mv515ExigirJefatura_ = function(data) {
    return mv517ExigirValidadorUnico_(data);
  };
}

var MV517_calificarIncidenciaVtrGarBase_ = calificarIncidenciaVtrGar;
calificarIncidenciaVtrGar = function(data) {
  mv517ExigirValidadorUnico_(data || {});
  return MV517_calificarIncidenciaVtrGarBase_(data || {});
};

var MV517_validarValidacionTecnicaBase_ = validarValidacionTecnica;
validarValidacionTecnica = function(data) {
  data = data || {};
  var id = String(data.id || "").trim();
  if (!id) return MV517_validarValidacionTecnicaBase_(data);
  try {
    var encontrado = buscarFilaValidacionTecnica(id);
    var tipo = mv517Norm_(encontrado && encontrado.datos ? encontrado.datos[6] : "");
    if (tipo === "VTR" || tipo === "GAR") mv517ExigirValidadorUnico_(data);
  } catch (e) {
    if (String(e && e.message || "").indexOf("Solo JEFZNORTE") >= 0) throw e;
  }
  return MV517_validarValidacionTecnicaBase_(data);
};

function DIAGNOSTICO_V517_VTRGAR() {
  return mv517Consolidar_({});
}

function VER_DIAGNOSTICO_V517_VTRGAR() {
  var r = DIAGNOSTICO_V517_VTRGAR();
  console.log(JSON.stringify({
    ok:r.ok,
    version:r.version,
    periodo:r.periodo,
    usuarioValidadorUnico:r.usuarioValidadorUnico,
    resumen:r.resumen,
    integridad:r.integridad,
    muestra:r.incidencias.slice(0,15)
  },null,2));
  return r;
}

/* Rutas nuevas: solo lectura y diagnostico de activacion. */
var MV517_doGetBase_ = doGet;
doGet = function(e) {
  var p = typeof parametrosGetMiVisual_ === "function"
    ? parametrosGetMiVisual_(e)
    : Object.assign({}, e && e.parameter ? e.parameter : {});
  try {
    if (p.accion === "diagnosticoV517VtrGar") {
      return respuestaJson({
        ok:true,
        versionV517:MV517_VERSION_,
        activo:true,
        usuarioValidadorUnico:MV517_USUARIO_VALIDADOR_,
        dashboardModificado:false,
        rankingModificado:false,
        produccionAppModificada:false
      });
    }
  } catch (err) {
    return respuestaJson({ok:false,error:err && err.message ? err.message : String(err),versionV517:MV517_VERSION_});
  }
  return MV517_doGetBase_(e);
};

var MV517_doPostBase_ = doPost;
doPost = function(e) {
  var data = {};
  try { data = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; }
  catch (_) { data = {}; }
  try {
    if (data.accion === "listarVtrGarConsolidadoV517") {
      return respuestaJson(mv517ListarParaUsuario_(data));
    }
  } catch (err) {
    return respuestaJson({ok:false,error:err && err.message ? err.message : String(err),versionV517:MV517_VERSION_});
  }
  return MV517_doPostBase_(e);
};
