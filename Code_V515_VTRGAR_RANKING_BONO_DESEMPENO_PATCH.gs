/* ==========================================================
   MI VISUAL V515 - VTR/GAR RANKING + PUNTAJE/BONO + MI DESEMPEÑO
   PEGAR AL FINAL DEL Code.gs VIGENTE (después de V493/V514)

   ALCANCE ESTRICTO
   1) RANKING VTR/GAR:
      - Solo incidencias VTR/GAR con trabajo WIN FINALIZADO.
      - CANCELADA / REPROGRAMADA / cualquier otro estado NO cuenta.
      - Penaliza a la CUADRILLA RESPONSABLE / ORIGEN.
      - La ejecutora puede ser distinta y NO cambia la responsabilidad.
      - Una derivación manual a una cuadrilla cuenta para esa responsable.
      - Deduplica TICKET/WIN de la misma incidencia.
      - NO modifica POR VTR/GAR ni Dashboard.
   2) JEFATURA:
      - Define BONO / NO BONO y el PUNTAJE VTR/GAR.
      - NO BONO fuerza puntaje 0.
      - El comentario sigue guardándose en MOTIVO_VALIDACION sin prefijos.
   3) MI DESEMPEÑO:
      - Expone VTR/GAR registrados por el técnico para mostrarlos en detalle.
      - No escribe ni valoriza PRODUCCION_APP.
   4) JULIO y periodos históricos no se reconstruyen automáticamente.
========================================================== */

var MV515_VERSION_ = "V515-VTRGAR-RANKING-BONO-DESEMPENO-20260828";
var MV515_HOJA_BASE_ = "BASE_VTR_GAR_DETECTADA";
var MV515_HOJA_MAPA_ = "MAPA_ORDENES";
var MV515_HOJA_VT_ = "VALIDACION_TECNICA";
var MV515_COLUMNA_PUNTAJE_ = "PUNTAJE_VTR_GAR";

// V515 debe pegarse al final del Code.gs vigente para capturar el núcleo previo a V493.
var MV515_actualizarRankingCore_ =
  (typeof MV493_actualizarRankingBase_ === "function")
    ? MV493_actualizarRankingBase_
    : actualizarRanking;

var MV515_obtenerVtrGarBase_ =
  (typeof MV493_obtenerVtrGarPorCuadrillaBase_ === "function")
    ? MV493_obtenerVtrGarPorCuadrillaBase_
    : obtenerVtrGarPorCuadrilla;

function mv515Norm_(v) {
  if (typeof normalizarTexto === "function") return normalizarTexto(v);
  return String(v == null ? "" : v)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mv515Cuadrilla_(v) {
  if (typeof normalizarCuadrilla === "function") return normalizarCuadrilla(v);
  return String(v == null ? "" : v)
    .replace(/^P\s+(\d+)/i, "P$1")
    .replace(/\s+/g, " ")
    .trim();
}

function mv515Fecha_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return new Date(valor.getTime());
  var t = String(valor == null ? "" : valor).trim();
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

function mv515MismoPeriodo_(fecha, corte) {
  var f = mv515Fecha_(fecha);
  var c = mv515Fecha_(corte);
  if (!f || !c) return false;
  return f.getFullYear() === c.getFullYear() && f.getMonth() === c.getMonth();
}

function mv515PeriodoIso_(valor) {
  var f = mv515Fecha_(valor);
  if (!f) return "";
  return String(f.getFullYear()) + "-" + String(f.getMonth() + 1).padStart(2, "0");
}

function mv515FechaIso_(valor) {
  var f = mv515Fecha_(valor);
  if (!f) return "";
  return Utilities.formatDate(f, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function mv515FechaVisible_(valor) {
  var f = mv515Fecha_(valor);
  if (!f) return String(valor == null ? "" : valor);
  return Utilities.formatDate(f, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function mv515Idx_(cab, nombre, respaldo) {
  var i = cab.indexOf(mv515Norm_(nombre));
  return i >= 0 ? i : respaldo;
}

function mv515MomentoMapa_(fila, idx) {
  var opciones = [
    fila[idx.fechaUltimoEstado],
    fila[idx.fechaFin],
    fila[idx.fechaInicio],
    fila[idx.fechaSolicitud],
    fila[idx.fechaImportacion]
  ];
  var mejor = null;
  opciones.forEach(function(v) {
    var f = mv515Fecha_(v);
    if (f && (!mejor || f.getTime() > mejor.getTime())) mejor = f;
  });
  return mejor;
}

function mv515EstadosWinPorOrden_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV515_HOJA_MAPA_);
  var salida = {};
  if (!hoja || hoja.getLastRow() <= 1) return salida;

  var datos = hoja.getDataRange().getValues();
  var cab = datos[0].map(mv515Norm_);
  var idx = {
    orden: mv515Idx_(cab, "ORDEN_ID", 0),
    estado: mv515Idx_(cab, "ESTADO", 8),
    fechaSolicitud: mv515Idx_(cab, "FECHA_SOLICITUD", 2),
    fechaUltimoEstado: mv515Idx_(cab, "FECHA_ULTIMO_ESTADO", 11),
    fechaFin: mv515Idx_(cab, "FECHA_FIN_VISITA", 18),
    fechaInicio: mv515Idx_(cab, "FECHA_INICIO_VISITA", 19),
    fechaImportacion: mv515Idx_(cab, "FECHA_IMPORTACION", 26)
  };

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var orden = String(fila[idx.orden] == null ? "" : fila[idx.orden]).trim();
    if (!orden) continue;
    var momento = mv515MomentoMapa_(fila, idx);
    var ts = momento ? momento.getTime() : 0;
    var anterior = salida[orden];
    if (!anterior || ts >= anterior.ts) {
      salida[orden] = {
        estado: mv515Norm_(fila[idx.estado]),
        ts: ts
      };
    }
  }
  return salida;
}

function mv515ClaveIncidencia_(fila, idx) {
  var ticket = mv515Norm_(fila[idx.ticket]).replace(/\s+/g, "");
  var mt = ticket.match(/(?:VTR|GAR)-?\d+/);
  if (mt) return mt[0].replace(/^(VTR|GAR)(\d)/, "$1-$2");
  var orden = String(fila[idx.orden] == null ? "" : fila[idx.orden]).trim();
  if (orden) return "ORDEN|" + orden;
  var clave = String(fila[idx.clave] == null ? "" : fila[idx.clave]).trim();
  if (clave) return "CLAVE|" + clave;
  return "FILA|" + Utilities.getUuid();
}

function mv515MomentoDecision_(fila, idx) {
  return mv515Fecha_(fila[idx.ultimaEdicion]) ||
    mv515Fecha_(fila[idx.fechaCalificacion]) ||
    mv515Fecha_(fila[idx.fecha]) ||
    new Date(0);
}

function mv515ElegirDecision_(lista) {
  var finales = [];
  var anulados = [];
  (lista || []).forEach(function(x) {
    var e = mv515Norm_(x.estado);
    if (e === "CONFIRMADO" || e === "REASIGNADO") finales.push(x);
    else if (e === "ANULADO") anulados.push(x);
  });
  if (!finales.length) return null;

  finales.sort(function(a, b) { return b.ts - a.ts; });
  anulados.sort(function(a, b) { return b.ts - a.ts; });

  // Un pendiente duplicado nunca borra una decisión final.
  // Un ANULADO posterior sí invalida la incidencia.
  if (anulados.length && anulados[0].ts >= finales[0].ts) return null;
  return finales[0];
}

function mv515IncidenciasRanking_(cortePeriodo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV515_HOJA_BASE_);
  var estadosWin = mv515EstadosWinPorOrden_();
  var grupos = {};
  var diagnostico = {leidas:0, periodo:0, deduplicadas:0, noFinalizadas:0, sinEstadoWin:0, contabilizadas:0};

  if (!hoja || hoja.getLastRow() <= 1) return {propias:{}, diagnostico:diagnostico};

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
      clave: clave,
      tipo: tipo,
      orden: String(fila[idx.orden] == null ? "" : fila[idx.orden]).trim(),
      ejecutora: mv515Cuadrilla_(fila[idx.ejecutora]),
      responsable: mv515Cuadrilla_(fila[idx.responsable]),
      estado: mv515Norm_(fila[idx.estado]),
      ts: momento ? momento.getTime() : 0
    });
  }

  var propias = {};
  Object.keys(grupos).forEach(function(clave) {
    var grupo = grupos[clave];
    if (grupo.length > 1) diagnostico.deduplicadas += grupo.length - 1;
    var item = mv515ElegirDecision_(grupo);
    if (!item || !item.responsable) return;

    var estadoWin = item.orden && estadosWin[item.orden] ? estadosWin[item.orden].estado : "";
    if (!estadoWin) {
      diagnostico.sinEstadoWin++;
      return;
    }
    if (estadoWin !== "FINALIZADA" && estadoWin !== "FINALIZADO") {
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
}

function mv515VtrGarRankingPorCuadrilla_(cortePeriodo) {
  var base = MV515_obtenerVtrGarBase_(cortePeriodo) || {};
  var calculo = mv515IncidenciasRanking_(cortePeriodo);
  var propias = calculo.propias || {};
  var salida = {};

  Object.keys(base).forEach(function(cuadrilla) {
    var b = base[cuadrilla] || {};
    var clave = mv515Cuadrilla_(cuadrilla);
    var p = propias[clave] || {gar:0, vtr:0, total:0};
    var finalizadas = Number(b.finalizadas) || 0;
    var gar = Number(p.gar) || 0;
    var vtr = Number(p.vtr) || 0;
    var total = gar + vtr;
    salida[cuadrilla] = {
      finalizadas: finalizadas,
      gar: gar,
      vtr: vtr,
      totalGarVtr: total,
      porcentajeVtrGar: finalizadas > 0 ? total / finalizadas : 0,
      criterioRanking: "V515_SOLO_PROPIAS_RESPONSABLE_FINALIZADAS"
    };
  });

  Object.keys(propias).forEach(function(cuadrilla) {
    var ya = Object.keys(salida).some(function(k) { return mv515Cuadrilla_(k) === cuadrilla; });
    if (ya) return;
    salida[cuadrilla] = {
      finalizadas: 0,
      gar: Number(propias[cuadrilla].gar) || 0,
      vtr: Number(propias[cuadrilla].vtr) || 0,
      totalGarVtr: Number(propias[cuadrilla].total) || 0,
      porcentajeVtrGar: 0,
      criterioRanking: "V515_SOLO_PROPIAS_SIN_DENOMINADOR"
    };
  });

  return salida;
}

actualizarRanking = function(periodoManual, actualizadoAlManual, omitirResumenObservaciones) {
  var funcionVtrOriginal = obtenerVtrGarPorCuadrilla;
  try {
    obtenerVtrGarPorCuadrilla = mv515VtrGarRankingPorCuadrilla_;
    var resultado = MV515_actualizarRankingCore_(periodoManual, actualizadoAlManual, omitirResumenObservaciones);
    if (resultado && typeof resultado === "object") {
      resultado.versionVtrGarRanking = MV515_VERSION_;
      resultado.reglaVtrGarRanking = "SOLO_RESPONSABLE_ORIGEN_Y_SOLO_FINALIZADAS_WIN";
      resultado.dashboardModificado = false;
      resultado.produccionModificada = false;
    }
    return resultado;
  } finally {
    obtenerVtrGarPorCuadrilla = funcionVtrOriginal;
  }
};

function mv515AsegurarColumnaPuntaje_(hoja) {
  var ultima = Math.max(1, hoja.getLastColumn());
  var cab = hoja.getRange(1, 1, 1, ultima).getDisplayValues()[0];
  for (var i = 0; i < cab.length; i++) {
    if (mv515Norm_(cab[i]) === MV515_COLUMNA_PUNTAJE_) return i + 1;
  }
  var col = ultima + 1;
  hoja.getRange(1, col).setValue(MV515_COLUMNA_PUNTAJE_);
  return col;
}

function mv515ExigirJefatura_(data) {
  var usuario = obtenerUsuarioApp((data || {}).usuario);
  if (!esPerfilJefatura(usuario.perfil)) throw new Error("Solo Jefatura puede definir bono y puntaje VTR/GAR");
  return usuario;
}

function mv515RegistroVtrGar_(id) {
  var encontrado = buscarFilaValidacionTecnica(id);
  var tipo = mv515Norm_(encontrado.datos && encontrado.datos[6]);
  if (tipo !== "VTR" && tipo !== "GAR") throw new Error("El registro no corresponde a VTR/GAR");
  return encontrado;
}

function mv515ValidarBonoPuntaje_(data) {
  mv515ExigirJefatura_(data);
  var id = String((data || {}).id || "").trim();
  var resultado = mv515Norm_((data || {}).resultado);
  var motivo = String((data || {}).motivoValidacion || (data || {}).motivo || "").trim();
  if (!id) throw new Error("ID obligatorio");
  if (resultado !== "BONO" && resultado !== "NO BONO") throw new Error("Resultado VTR/GAR no válido");
  if (!motivo) throw new Error("El motivo/comentario de Jefatura es obligatorio");

  var puntaje = resultado === "NO BONO" ? 0 : Number((data || {}).puntajeVtrGar);
  if (resultado === "BONO" && (!isFinite(puntaje) || puntaje <= 0)) {
    throw new Error("Jefatura debe ingresar un puntaje VTR/GAR mayor a 0 cuando corresponde BONO");
  }

  var encontrado = mv515RegistroVtrGar_(id);
  var colPuntaje = mv515AsegurarColumnaPuntaje_(encontrado.hoja);

  // Conserva íntegra la validación existente: permisos, resultado, fecha y comentario.
  var respuesta = validarValidacionTecnica({
    usuario: data.usuario,
    id: id,
    resultado: resultado,
    motivoValidacion: motivo
  });

  encontrado.hoja.getRange(encontrado.fila, colPuntaje).setValue(puntaje);
  SpreadsheetApp.flush();

  if (!respuesta || typeof respuesta !== "object") respuesta = {ok:true};
  respuesta.ok = true;
  respuesta.versionV515 = MV515_VERSION_;
  respuesta.puntajeVtrGar = puntaje;
  respuesta.resultadoVtrGar = resultado;
  return respuesta;
}

function mv515ActualizarPuntaje_(data) {
  mv515ExigirJefatura_(data);
  var id = String((data || {}).id || "").trim();
  var puntaje = Number((data || {}).puntajeVtrGar);
  if (!id) throw new Error("ID obligatorio");
  if (!isFinite(puntaje) || puntaje < 0) throw new Error("Puntaje VTR/GAR no válido");
  var encontrado = mv515RegistroVtrGar_(id);
  var resultado = mv515Norm_(encontrado.datos && encontrado.datos[14]);
  if (resultado === "NO BONO") puntaje = 0;
  if (resultado !== "BONO" && resultado !== "NO BONO") {
    throw new Error("Primero debe validar BONO / NO BONO");
  }
  var colPuntaje = mv515AsegurarColumnaPuntaje_(encontrado.hoja);
  encontrado.hoja.getRange(encontrado.fila, colPuntaje).setValue(puntaje);
  SpreadsheetApp.flush();
  return {ok:true, versionV515:MV515_VERSION_, id:id, resultado:resultado, puntajeVtrGar:puntaje};
}

function mv515ClavesTecnico_(usuarioObj, usuarioEntrada) {
  var claves = {};
  [
    usuarioEntrada,
    usuarioObj && usuarioObj.usuario,
    usuarioObj && usuarioObj.correo,
    usuarioObj && usuarioObj.email,
    usuarioObj && usuarioObj.user
  ].forEach(function(v) {
    var n = mv515Norm_(v);
    if (n) claves[n] = true;
  });
  return claves;
}

function mv515ListarDesempenoVtrGar_(data) {
  var usuarioEntrada = String((data || {}).usuario || "").trim();
  var usuarioObj = obtenerUsuarioApp(usuarioEntrada);
  var perfil = mv515Norm_(usuarioObj.perfil);
  if (perfil !== "TECNICO") throw new Error("Esta consulta corresponde a Mi Desempeño del técnico");

  var periodo = String((data || {}).periodo || "").trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV515_HOJA_VT_);
  if (!hoja || hoja.getLastRow() <= 1) {
    return {ok:true, versionV515:MV515_VERSION_, periodo:periodo, registros:[]};
  }

  var ultimaCol = Math.max(20, hoja.getLastColumn());
  var datos = hoja.getRange(1, 1, hoja.getLastRow(), ultimaCol).getValues();
  var cab = datos[0].map(mv515Norm_);
  var colPuntaje = cab.indexOf(MV515_COLUMNA_PUNTAJE_);
  var clavesTecnico = mv515ClavesTecnico_(usuarioObj, usuarioEntrada);
  var cuadrillaUsuario = mv515Cuadrilla_(usuarioObj.cuadrilla || (data || {}).cuadrilla || "");
  var lista = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var tipo = mv515Norm_(fila[6]);
    if (tipo !== "VTR" && tipo !== "GAR") continue;
    if (periodo && mv515PeriodoIso_(fila[1]) !== periodo) continue;

    var tecnicoFila = mv515Norm_(fila[4]);
    var cuadrillaFila = mv515Cuadrilla_(fila[5]);
    var esMismoTecnico = !!clavesTecnico[tecnicoFila];
    // Respaldo para cuentas técnicas donde el login histórico quedó vacío:
    // solo se usa la cuadrilla cuando TECNICO está realmente vacío.
    if (!esMismoTecnico && tecnicoFila) continue;
    if (!esMismoTecnico && !tecnicoFila && cuadrillaUsuario && cuadrillaFila !== cuadrillaUsuario) continue;

    var resultado = mv515Norm_(fila[14]);
    var puntajeGuardado = colPuntaje >= 0 ? fila[colPuntaje] : "";
    var puntaje = Number(puntajeGuardado);
    var tienePuntaje = puntajeGuardado !== "" && puntajeGuardado !== null && isFinite(puntaje);
    if (resultado === "NO BONO") {
      puntaje = 0;
      tienePuntaje = true;
    }

    lista.push({
      id: String(fila[0] == null ? "" : fila[0]),
      fecha: mv515FechaVisible_(fila[1]),
      fechaISO: mv515FechaIso_(fila[1]),
      tecnico: String(fila[4] == null ? "" : fila[4]),
      cuadrilla: String(fila[5] == null ? "" : fila[5]),
      tipo: tipo,
      codigo: String(fila[7] == null ? "" : fila[7]),
      ticket: String(fila[10] || fila[9] || ""),
      estado: mv515Norm_(fila[13] || "PENDIENTE"),
      resultado: resultado || "PENDIENTE",
      puntajeVtrGar: tienePuntaje ? puntaje : null,
      puntajePendiente: resultado === "BONO" && !tienePuntaje,
      motivoValidacion: String(fila[19] == null ? "" : fila[19]),
      validadoPor: String(fila[15] == null ? "" : fila[15]),
      fechaValidacion: mv515FechaVisible_(fila[17])
    });
  }

  lista.sort(function(a, b) {
    return String(b.fechaISO || "").localeCompare(String(a.fechaISO || ""));
  });

  return {
    ok:true,
    versionV515:MV515_VERSION_,
    periodo:periodo,
    produccionAppModificada:false,
    registros:lista
  };
}

function DIAGNOSTICO_V515_VTRGAR() {
  var corte = typeof obtenerCorteRankingAutomatico === "function" ? obtenerCorteRankingAutomatico() : {};
  var fecha = typeof convertirFechaRanking === "function" ? convertirFechaRanking(corte.actualizadoAl || "") : new Date();
  var calc = mv515IncidenciasRanking_(fecha);
  return {
    ok:true,
    version:MV515_VERSION_,
    reglaRanking:"RESPONSABLE_ORIGEN + SOLO FINALIZADAS WIN + DEDUP TICKET/WIN",
    dashboardModificado:false,
    produccionAppModificada:false,
    periodo:corte.periodo || mv515PeriodoIso_(fecha),
    actualizadoAl:corte.actualizadoAl || "",
    diagnostico:calc.diagnostico,
    propias:calc.propias
  };
}

/* ----------------------------------------------------------
   RUTAS INCREMENTALES
   Se envuelven doGet/doPost existentes. Al pegar V515 al FINAL del
   Code.gs, todas las acciones anteriores siguen pasando al backend base.
---------------------------------------------------------- */
var MV515_doGetBase_ = doGet;
doGet = function(e) {
  var p = typeof parametrosGetMiVisual_ === "function"
    ? parametrosGetMiVisual_(e)
    : Object.assign({}, e && e.parameter ? e.parameter : {});

  try {
    if (p.accion === "diagnosticoV515VtrGar") {
      return respuestaJson({ok:true, versionV515:MV515_VERSION_, activo:true});
    }
    if (p.accion === "listarDesempenoVtrGarV515") {
      return respuestaJson(mv515ListarDesempenoVtrGar_(p));
    }
  } catch (err) {
    return respuestaJson({ok:false, error:err && err.message ? err.message : String(err), versionV515:MV515_VERSION_});
  }
  return MV515_doGetBase_(e);
};

var MV515_doPostBase_ = doPost;
doPost = function(e) {
  var data = {};
  try {
    data = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (_) {
    data = {};
  }

  try {
    if (data.accion === "validarBonoVtrGarV515") {
      return respuestaJson(mv515ValidarBonoPuntaje_(data));
    }
    if (data.accion === "actualizarPuntajeVtrGarV515") {
      return respuestaJson(mv515ActualizarPuntaje_(data));
    }
  } catch (err) {
    return respuestaJson({ok:false, error:err && err.message ? err.message : String(err), versionV515:MV515_VERSION_});
  }
  return MV515_doPostBase_(e);
};
