/* ==========================================================
   MI VISUAL V477 - AUTODETECCION SEGURA GAR / VTR
   Fecha: 23/08/2026

   OBJETIVO
   - Detectar automáticamente el origen de GAR/VTR usando BASE_OPERATIVA_HISTORICA.
   - Regla fuerte: DNI exacto + trabajo FINALIZADO anterior + máximo 30 días.
   - GAR: exige antecedente de INSTALACION.
   - VTR: exige antecedente de VISITA TECNICA / AVERIA / otra gestión de servicio elegible.
   - Misma cuadrilla = PROPIA / CONFIRMADO.
   - Cuadrilla distinta = ASIGNADA / REASIGNADO a la cuadrilla origen.
   - Casos sin evidencia suficiente permanecen PENDIENTES para gestión manual.
   - Nunca modifica automáticamente períodos anteriores al período operativo activo.
   - Nunca sobreescribe CONFIRMADO / REASIGNADO / ANULADO ya existentes.

   SEGURIDAD / RENDIMIENTO
   - La pantalla de Calificación VTR/GAR usa lectura directa sin crear/migrar hojas.
   - La detección arma un índice por DNI una sola vez por consulta.
   - La escritura automática se hace en lote bajo un tryLock corto.
   - VTR/GAR y Ranking se recalculan UNA sola vez por lote automático.
   - El flujo manual existente continúa usando calificarIncidenciaVtrGar original.
========================================================== */

var MV477_VERSION_ = "V477-AUTODETECCION-GAR-VTR-30D-20260823";
var MV477_DIAS_MAXIMOS_ = 30;
var MV477_USUARIO_SISTEMA_ = "SISTEMA AUTO V477";

function mv477NormalizarDocumento_(valor) {
  return String(valor == null ? "" : valor).replace(/[^0-9A-Za-z]/g, "").toUpperCase().trim();
}

function mv477DiasEntre_(anterior, posterior) {
  var a = fechaBaseOperativa(anterior);
  var b = fechaBaseOperativa(posterior);
  if (!a || !b) return null;
  var diaMs = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / diaMs);
}

function mv477PeriodoActivo_() {
  var hoja = obtenerHoja(HOJA_EFECTIVIDAD);
  if (!hoja || hoja.getLastRow() <= 1) return "";
  var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, Math.max(4, hoja.getLastColumn())).getValues();
  var corte = null;
  for (var i = 0; i < datos.length; i++) {
    var f = fechaBaseOperativa(datos[i][3]);
    if (f && (!corte || f > corte)) corte = f;
  }
  return corte ? clavePeriodoBaseOperativa(corte) : "";
}

function mv477LeerGestionSoloLectura_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_BASE_VTR_GAR_DETECTADA);
  if (!hoja || hoja.getLastRow() <= 1) return {hoja:hoja, lista:[], mapa:{}};
  var columnas = Math.max(20, hoja.getLastColumn());
  var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, columnas).getValues();
  var lista = [], mapa = {};
  for (var i = 0; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    var item = filaGestionVtrGarAObjeto(datos[i]);
    item._filaHojaV477 = i + 2;
    lista.push(item);
    mapa[item.clave] = item;
  }
  return {hoja:hoja, lista:lista, mapa:mapa};
}

function mv477LeerHistoricaSoloLectura_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_BASE_OPERATIVA_HISTORICA);
  if (!hoja || hoja.getLastRow() <= 1) return [];
  var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, Math.max(18, hoja.getLastColumn())).getValues();
  var lista = [];
  for (var i = 0; i < datos.length; i++) {
    var item = filaHistoricaARegistroBaseOperativa(datos[i]);
    if (item && item.fecha && item.cuadrilla && item.estado) lista.push(item);
  }
  return lista;
}

function mv477LeerSolicitudesBonoSoloLectura_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_VALIDACION_TECNICA);
  var lista = [], exactos = {};
  if (!hoja || hoja.getLastRow() <= 1) return {lista:lista, exactos:exactos};
  var columnas = Math.max(23, hoja.getLastColumn());
  var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, columnas).getValues();
  for (var i = 0; i < datos.length; i++) {
    var fila = datos[i];
    var tipo = normalizarTexto(fila[6]);
    if (tipo !== "VTR" && tipo !== "GAR") continue;
    var ticket = textoValidoBaseOperativa(fila[10]) || ((fila[8] || "").toString() + (fila[9] || "").toString());
    var item = {
      id:(fila[0] || "").toString(),
      tipo:tipo,
      ticket:ticket,
      variantesTicket:variantesTicketBonoVtrGar(ticket),
      codigoPedido:textoValidoBaseOperativa(fila[7]),
      cuadrilla:normalizarCuadrilla(fila[5]),
      fechaISO:fechaIsoBaseOperativa(fechaBaseOperativa(fila[1])),
      numeroDocumento:textoValidoBaseOperativa(fila[11]),
      estado:normalizarTexto(fila[13] || "PENDIENTE"),
      resultado:normalizarTexto(fila[14] || ""),
      validadoPor:(fila[15] || "").toString(),
      fechaSolicitud:fechaHoraVisibleBonoVtrGar(fila[1], fila[2]),
      fechaValidacion:fechaHoraVisibleBonoVtrGar(fila[17], fila[18]),
      motivoValidacion:(fila[19] || "").toString(),
      origenOrden:normalizarTexto(fila[22]) || "SIN REGISTRO"
    };
    var indice = lista.length;
    lista.push(item);
    item.variantesTicket.forEach(function(t){
      if (!exactos[t]) exactos[t] = [];
      exactos[t].push(indice);
    });
  }
  return {lista:lista, exactos:exactos};
}

function mv477AgregarEstadoBonoSoloLectura_(lista) {
  var indice = mv477LeerSolicitudesBonoSoloLectura_();
  return (lista || []).map(function(item){
    var salida = Object.assign({}, item);
    var estado = buscarSolicitudBonoParaIncidenciaVtrGar(item, indice);
    Object.keys(estado).forEach(function(k){ salida[k] = estado[k]; });
    return salida;
  });
}

function mv477EsIncidencia_(registro) {
  return !!tipoIncidenciaBaseOperativa(registro);
}

function mv477TextoTrabajo_(registro) {
  return normalizarTexto([
    registro.tipoTrabajo || "",
    registro.tipoAtencion || "",
    registro.tipoPartida || "",
    registro.tipoPartidaAlterna || ""
  ].join(" "));
}

function mv477ClasificarTrabajoOrigen_(registro) {
  if (!registro || normalizarTexto(registro.estado) !== "FINALIZADA") return "";
  if (mv477EsIncidencia_(registro)) return "";
  var t = mv477TextoTrabajo_(registro);
  if (!t) return "";

  if (t.indexOf("INSTALACION") >= 0 || t.indexOf("INSTALACIÓN") >= 0) return "INSTALACION";

  var clavesServicio = [
    "VISITA TECNICA", "VISITA TÉCNICA", "AVERIA", "AVERÍA", "RECABLEADO",
    "TRASLADO", "POSTVENTA", "POST VENTA", "POSVENTA", "MESH", "ONT",
    "WINBOX", "WIN BOX", "UTP", "REUBICACION", "REUBICACIÓN", "DESCARTE",
    "ASISTENCIA", "PATCHCORD", "CONECTOR", "MEJORA TECNOLOGICA", "MEJORA TECNOLÓGICA"
  ];
  for (var i = 0; i < clavesServicio.length; i++) {
    if (t.indexOf(clavesServicio[i]) >= 0) return "SERVICIO";
  }

  // Para VTR aceptamos una gestión finalizada no identificada como instalación
  // únicamente si existe contenido operacional y no es otra GAR/VTR.
  return "SERVICIO";
}

function mv477ConstruirIndiceHistorico_(registros) {
  var porDni = {};
  (registros || []).forEach(function(r){
    if (normalizarTexto(r.estado) !== "FINALIZADA") return;
    var dni = mv477NormalizarDocumento_(r.numeroDocumento);
    if (!dni) return;
    if (!porDni[dni]) porDni[dni] = [];
    porDni[dni].push(r);
  });
  Object.keys(porDni).forEach(function(dni){
    porDni[dni].sort(function(a,b){
      var fa = fechaBaseOperativa(a.fecha), fb = fechaBaseOperativa(b.fecha);
      return (fa ? fa.getTime() : 0) - (fb ? fb.getTime() : 0);
    });
  });
  return porDni;
}

function mv477Manual_(motivo, extras) {
  return Object.assign({
    auto:false,
    resultado:"MANUAL",
    motivo:motivo || "No se encontró un antecedente suficientemente confiable",
    origenOrden:"SIN REGISTRO",
    decision:"",
    cuadrillaOrigen:"",
    fechaOrigen:"",
    fechaOrigenISO:"",
    codigoPedidoOrigen:"",
    tipoTrabajoOrigen:"",
    diasTranscurridos:null,
    criterio:"DNI exacto + FINALIZADA + máximo 30 días"
  }, extras || {});
}

function mv477DetectarOrigen_(incidencia, indiceHistorico) {
  var tipo = normalizarTexto(incidencia && incidencia.tipo);
  if (tipo !== "GAR" && tipo !== "VTR") return mv477Manual_("Tipo de incidencia no reconocido");
  var dni = mv477NormalizarDocumento_(incidencia.numeroDocumento);
  if (!dni) return mv477Manual_("Sin DNI para realizar el cruce histórico");
  var fechaInc = fechaBaseOperativa(incidencia.fechaISO || incidencia.fecha);
  if (!fechaInc) return mv477Manual_("La incidencia no tiene una fecha válida");

  var lista = (indiceHistorico && indiceHistorico[dni]) || [];
  if (!lista.length) return mv477Manual_("No existe historial FINALIZADO para el mismo DNI en la base operativa");

  var candidatos = [];
  for (var i = 0; i < lista.length; i++) {
    var r = lista[i];
    var dias = mv477DiasEntre_(r.fecha, fechaInc);
    if (dias == null || dias < 1 || dias > MV477_DIAS_MAXIMOS_) continue;
    var clase = mv477ClasificarTrabajoOrigen_(r);
    if (!clase) continue;
    if (tipo === "GAR" && clase !== "INSTALACION") continue;
    if (tipo === "VTR" && clase !== "SERVICIO") continue;
    candidatos.push({registro:r, dias:dias, clase:clase});
  }

  if (!candidatos.length) {
    return mv477Manual_(tipo === "GAR"
      ? "No existe una instalación FINALIZADA del mismo DNI en los 30 días anteriores"
      : "No existe una gestión FINALIZADA elegible del mismo DNI en los 30 días anteriores");
  }

  candidatos.sort(function(a,b){
    var fa = fechaBaseOperativa(a.registro.fecha), fb = fechaBaseOperativa(b.registro.fecha);
    return (fb ? fb.getTime() : 0) - (fa ? fa.getTime() : 0);
  });
  var fechaMejor = fechaIsoBaseOperativa(fechaBaseOperativa(candidatos[0].registro.fecha));
  var mismoDia = candidatos.filter(function(x){
    return fechaIsoBaseOperativa(fechaBaseOperativa(x.registro.fecha)) === fechaMejor;
  });
  var cuadrillas = {};
  mismoDia.forEach(function(x){
    var c = normalizarCuadrilla(x.registro.cuadrilla);
    if (c) cuadrillas[c] = true;
  });
  var listaCuadrillas = Object.keys(cuadrillas);
  if (listaCuadrillas.length !== 1) {
    return mv477Manual_("El antecedente más reciente tiene más de una cuadrilla posible y requiere revisión manual", {
      fechaOrigen:fechaVisibleBaseOperativa(fechaBaseOperativa(candidatos[0].registro.fecha)),
      fechaOrigenISO:fechaMejor,
      diasTranscurridos:candidatos[0].dias
    });
  }

  var elegido = mismoDia.filter(function(x){
    return normalizarCuadrilla(x.registro.cuadrilla) === listaCuadrillas[0];
  })[0] || candidatos[0];
  var origen = normalizarCuadrilla(elegido.registro.cuadrilla);
  var ejecutora = normalizarCuadrilla(incidencia.cuadrillaEjecutora);
  if (!origen || !ejecutora) return mv477Manual_("No se pudo determinar una cuadrilla válida para el antecedente");

  var propia = origen === ejecutora;
  return {
    auto:true,
    resultado:propia ? "PROPIA" : "ASIGNADA",
    origenOrden:propia ? "PROPIA" : "ASIGNADA",
    decision:propia ? "CORRESPONDE" : "REASIGNAR",
    estadoDestino:propia ? "CONFIRMADO" : "REASIGNADO",
    cuadrillaOrigen:origen,
    cuadrillaEjecutora:ejecutora,
    fechaOrigen:fechaVisibleBaseOperativa(fechaBaseOperativa(elegido.registro.fecha)),
    fechaOrigenISO:fechaIsoBaseOperativa(fechaBaseOperativa(elegido.registro.fecha)),
    codigoPedidoOrigen:elegido.registro.codigoPedido || "",
    tipoTrabajoOrigen:elegido.registro.tipoPartida || elegido.registro.tipoPartidaAlterna || elegido.registro.tipoAtencion || elegido.registro.tipoTrabajo || "",
    diasTranscurridos:elegido.dias,
    motivo:propia
      ? "Mismo DNI y misma cuadrilla en antecedente FINALIZADO dentro de 30 días"
      : "Mismo DNI con antecedente FINALIZADO de otra cuadrilla dentro de 30 días",
    criterio:"DNI exacto + FINALIZADA + máximo 30 días + tipo compatible"
  };
}

function mv477EnriquecerGestion_(gestion) {
  var historica = mv477LeerHistoricaSoloLectura_();
  var indice = mv477ConstruirIndiceHistorico_(historica);
  return (gestion || []).map(function(item){
    var salida = Object.assign({}, item);
    salida.deteccionAutomatica = mv477DetectarOrigen_(salida, indice);
    return salida;
  });
}

// V477: reemplazo de SOLO LECTURA. Evita funciones asegurar* al abrir la pantalla.
var MV477_listarGestionVtrGarBase_ = listarGestionVtrGar;
listarGestionVtrGar = function(data) {
  validarAdministracionBaseOperativa((data || {}).usuario);
  var gestionDirecta = mv477LeerGestionSoloLectura_();
  var gestion = mv477AgregarEstadoBonoSoloLectura_(gestionDirecta.lista);
  gestion = mv477EnriquecerGestion_(gestion);

  var mapa = cuadrillasTecnicasBaseOperativa();
  var cuadrillas = Object.keys(mapa).sort().map(function(c){ return mapa[c]; });
  var pendientes = 0, confirmados = 0, reasignados = 0, anulados = 0;
  var autoDetectables = 0, manualesPendientes = 0;
  gestion.forEach(function(x){
    var estado = normalizarTexto(x.estadoCalificacion || "PENDIENTE");
    if (estado === "PENDIENTE") {
      pendientes++;
      if (x.deteccionAutomatica && x.deteccionAutomatica.auto) autoDetectables++;
      else manualesPendientes++;
    }
    if (estado === "CONFIRMADO") confirmados++;
    if (estado === "REASIGNADO") reasignados++;
    if (estado === "ANULADO") anulados++;
  });

  return {
    ok:true,
    modulo:"GESTION_VTR_GAR",
    version:MV477_VERSION_,
    registros:gestion.length,
    incidencias:gestion,
    cuadrillas:cuadrillas,
    resumen:{
      pendientes:pendientes,
      confirmados:confirmados,
      reasignados:reasignados,
      anulados:anulados,
      autoDetectables:autoDetectables,
      manualesPendientes:manualesPendientes
    }
  };
};

function mv477ObservacionAutomatica_(inc, det) {
  return [
    "AUTO V477",
    det.origenOrden,
    "DNI " + (inc.numeroDocumento || "-"),
    "origen " + (det.fechaOrigen || "-") + " / " + (det.cuadrillaOrigen || "-"),
    "atendió " + (inc.cuadrillaEjecutora || "-"),
    String(det.diasTranscurridos == null ? "-" : det.diasTranscurridos) + " día(s)",
    det.tipoTrabajoOrigen || ""
  ].filter(function(x){ return !!String(x || "").trim(); }).join(" · ");
}

function mv477RegistrarHistorialSeguro_(inc, det, estadoNuevo, responsable) {
  try {
    registrarHistorialGestionVtrGar(
      inc.clave,
      MV477_USUARIO_SISTEMA_,
      det.decision,
      inc.estadoCalificacion || "PENDIENTE",
      estadoNuevo,
      inc.cuadrillaResponsable || "",
      responsable,
      mv477ObservacionAutomatica_(inc, det)
    );
  } catch (e) {
    // La incidencia ya queda trazada en OBSERVACION/CALIFICADO_POR de la base principal.
    // Un fallo accesorio del historial no debe perder una clasificación válida.
  }
}

function mv477AplicarAutomaticos_(data) {
  data = data || {};
  validarAdministracionBaseOperativa(data.usuario);
  var periodoActivo = mv477PeriodoActivo_();
  if (!periodoActivo) return {ok:true, version:MV477_VERSION_, aplicados:0, motivo:"SIN_PERIODO_ACTIVO"};

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1800)) {
    return {
      ok:true,
      version:MV477_VERSION_,
      aplicados:0,
      omitidoConcurrencia:true,
      mensaje:"Hay otra actualización en curso. La detección automática se reintentará al volver a abrir la pantalla."
    };
  }

  var aplicados = [];
  try {
    var gestionDirecta = mv477LeerGestionSoloLectura_();
    if (!gestionDirecta.hoja || !gestionDirecta.lista.length) {
      return {ok:true, version:MV477_VERSION_, aplicados:0, periodo:periodoActivo};
    }
    var historica = mv477LeerHistoricaSoloLectura_();
    var indice = mv477ConstruirIndiceHistorico_(historica);
    var usuarios = cuadrillasTecnicasBaseOperativa();

    gestionDirecta.lista.forEach(function(inc){
      if (normalizarTexto(inc.estadoCalificacion || "PENDIENTE") !== "PENDIENTE") return;
      var fechaInc = fechaBaseOperativa(inc.fechaISO || inc.fecha);
      if (!fechaInc || clavePeriodoBaseOperativa(fechaInc) !== periodoActivo) return;

      var det = mv477DetectarOrigen_(inc, indice);
      if (!det.auto) return;
      var responsable = normalizarCuadrilla(det.cuadrillaOrigen);
      if (!responsable || !usuarios[responsable]) return;
      var estadoNuevo = det.estadoDestino;
      var sedeResponsable = usuarios[responsable].sede || "";
      var ahora = new Date();
      var observacion = mv477ObservacionAutomatica_(inc, det);
      var fila = Number(inc._filaHojaV477 || 0);
      if (!fila) return;

      gestionDirecta.hoja.getRange(fila, 12, 1, 7).setValues([[
        estadoNuevo,
        responsable,
        sedeResponsable,
        MV477_USUARIO_SISTEMA_,
        ahora,
        observacion,
        ahora
      ]]);
      gestionDirecta.hoja.getRange(fila, 16).setNumberFormat("dd/mm/yyyy hh:mm");
      gestionDirecta.hoja.getRange(fila, 18).setNumberFormat("dd/mm/yyyy hh:mm");
      mv477RegistrarHistorialSeguro_(inc, det, estadoNuevo, responsable);
      aplicados.push({
        clave:inc.clave,
        tipo:inc.tipo,
        dni:inc.numeroDocumento,
        origenOrden:det.origenOrden,
        cuadrillaOrigen:responsable,
        cuadrillaEjecutora:inc.cuadrillaEjecutora,
        fechaOrigen:det.fechaOrigen,
        diasTranscurridos:det.diasTranscurridos,
        estado:estadoNuevo
      });
    });

    if (aplicados.length) SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  var recalculo = null;
  if (aplicados.length) {
    // Una sola actualización del indicador y Ranking para todo el lote.
    try {
      var referencia = periodoActivo + "-01";
      recalculo = recalcularVtrGarDesdeBaseOperativa(MV477_USUARIO_SISTEMA_, referencia);
    } catch (e) {
      return {
        ok:false,
        version:MV477_VERSION_,
        aplicados:aplicados.length,
        detalle:aplicados,
        errorRecalculo:e && e.message ? e.message : String(e)
      };
    }
  }

  return {
    ok:true,
    version:MV477_VERSION_,
    periodo:periodoActivo,
    aplicados:aplicados.length,
    detalle:aplicados,
    recalculo:recalculo
  };
}

// Conserva todo el comportamiento manual anterior y añade una acción interna
// por lote usando la ruta ya existente calificarIncidenciaVtrGar.
var MV477_calificarIncidenciaVtrGarBase_ = calificarIncidenciaVtrGar;
calificarIncidenciaVtrGar = function(data) {
  if (data && (data.autoLote === true || normalizarTexto(data.autoLote) === "SI")) {
    return mv477AplicarAutomaticos_(data);
  }
  return MV477_calificarIncidenciaVtrGarBase_.apply(this, arguments);
};

// Después de una actualización normal de la Base Operativa se intenta aplicar
// únicamente los casos fuertes del período recién cargado. Un problema en esta
// capa no invalida ni revierte una carga operativa que ya terminó correctamente.
var MV477_procesarBaseOperativaBase_ = procesarBaseOperativa;
procesarBaseOperativa = function(data) {
  var respuesta = MV477_procesarBaseOperativaBase_.apply(this, arguments);
  try {
    var auto = mv477AplicarAutomaticos_({usuario:data && data.usuario});
    respuesta.mv477Autodeteccion = auto;
    if (auto && auto.aplicados) {
      respuesta.vtrGarAutodetectados = auto.aplicados;
      respuesta.vtrGarAutoDetalle = auto.detalle || [];
    }
  } catch (e) {
    respuesta.mv477Autodeteccion = {
      ok:false,
      aplicados:0,
      error:e && e.message ? e.message : String(e)
    };
  }
  return respuesta;
};
