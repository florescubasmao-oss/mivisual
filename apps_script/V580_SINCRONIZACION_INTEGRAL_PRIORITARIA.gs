/* ============================================================
   MI VISUAL V580 - SINCRONIZACION INTEGRAL PRIORITARIA
   29/09/2026

   OBJETIVOS
   1) Toda importacion exitosa de MAPA_ORDENES debe programar V547,
      incluso cuando la ruta activa es el guardado incremental V518.
   2) El trigger existente de 1 minuto atiende primero MAPA -> INDICADORES.
   3) Diagnostico integral de capas por periodo.
   4) Reintento seguro sin volver a cargar el Excel ni reescribir MAPA.
============================================================ */

var MV580_VERSION_ = "V580-SYNC-INTEGRAL-PRIORITARIA-20260929";
var MV580_IMPORTAR_MAPA_BASE_ = importarMapaOperativo;
var MV580_VALIDACION_TECNICA_BASE_ = procesarValidacionesTecnicasVencidas;

function mv580PerfilPuedeSincronizar_(perfil) {
  var p = normalizarTexto(perfil || "");
  return [
    "JEFATURA",
    "JEFATURA GENERAL",
    "ADMIN",
    "ADMINISTRADOR"
  ].indexOf(p) >= 0;
}

function mv580PeriodoActual_() {
  return Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM");
}

function mv580PeriodoValido_(periodo) {
  periodo = String(periodo || "").trim();
  return /^\d{4}-\d{2}$/.test(periodo) && periodo >= "2026-08";
}

function mv580FechaDia_(valor) {
  if (!valor) return "";

  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, "America/Lima", "yyyy-MM-dd");
  }

  var s = String(valor || "").trim();
  if (!s) return "";

  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
  }

  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  }

  return "";
}

function mv580FechaMs_(valor) {
  if (!valor) return 0;

  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
    return valor.getTime();
  }

  var s = String(valor || "").trim();
  if (!s) return 0;

  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    ).getTime();
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    ).getTime();
  }

  var n = Date.parse(s);
  return isFinite(n) ? n : 0;
}

function mv580TextoFecha_(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, "America/Lima", "dd/MM/yyyy HH:mm");
  }
  return String(valor || "").trim();
}

function mv580PeriodosCargaMapa_(registros) {
  var bolsa = {};
  (Array.isArray(registros) ? registros : []).forEach(function(r) {
    try {
      mv547RegistrarPeriodoImpactado_(bolsa, r || {});
    } catch (_) {
      var fecha = r && (r.fechaSolicitud || r.FECHA_SOLICITUD || r.fechaUltimoEstado || r.FECHA_ULTIMO_ESTADO);
      var dia = mv580FechaDia_(fecha);
      if (dia) bolsa[dia.slice(0,7)] = true;
    }
  });

  var out = Object.keys(bolsa).filter(mv580PeriodoValido_).sort().reverse();
  if (!out.length) {
    var actual = mv580PeriodoActual_();
    if (mv580PeriodoValido_(actual)) out.push(actual);
  }
  return out;
}

function mv580UltimaImportacionMapaPeriodo_(ss, periodo) {
  var h = ss.getSheetByName("MAPA_ORDENES");
  if (!h || h.getLastRow() <= 1) return {iso:"",texto:"",dia:"",usuario:""};

  var n = h.getLastRow() - 1;
  var fechasSolicitud = h.getRange(2,3,n,1).getValues();
  var fechasImportacion = h.getRange(2,27,n,1).getValues();
  var usuarios = h.getRange(2,28,n,1).getDisplayValues();

  var mejorMs = 0;
  var mejor = null;
  var usuario = "";

  for (var i=0;i<n;i++) {
    var diaSolicitud = mv580FechaDia_(fechasSolicitud[i][0]);
    if (!diaSolicitud || diaSolicitud.slice(0,7) !== periodo) continue;

    var ms = mv580FechaMs_(fechasImportacion[i][0]);
    if (ms > mejorMs) {
      mejorMs = ms;
      mejor = fechasImportacion[i][0];
      usuario = String(usuarios[i][0] || "").trim();
    }
  }

  return {
    iso: mejorMs ? new Date(mejorMs).toISOString() : "",
    texto: mejor ? mv580TextoFecha_(mejor) : "",
    dia: mejor ? mv580FechaDia_(mejor) : "",
    usuario: usuario
  };
}

function mv580MaxActualizacionPorPeriodo_(ss, hojaNombre, periodo, config) {
  config = config || {};
  var h = ss.getSheetByName(hojaNombre);
  if (!h || h.getLastRow() <= 1) return {texto:"",dia:"",ms:0};

  var n = h.getLastRow() - 1;
  var columnaPeriodo = Number(config.columnaPeriodo || 1);
  var columnaFecha = Number(config.columnaFecha || 1);
  var modoPeriodo = String(config.modoPeriodo || "EXACTO");

  var periodos = h.getRange(2,columnaPeriodo,n,1).getDisplayValues();
  var fechas = h.getRange(2,columnaFecha,n,1).getValues();

  var mejorMs = 0;
  var mejor = null;

  for (var i=0;i<n;i++) {
    var clave = String(periodos[i][0] || "").trim();
    var coincide = false;

    if (modoPeriodo === "ID_CONTIENE") {
      coincide =
        clave.indexOf("|" + periodo + "|") >= 0 ||
        clave.indexOf(periodo + "|") === 0;
    } else if (modoPeriodo === "FECHA") {
      coincide = mv580FechaDia_(clave).slice(0,7) === periodo;
    } else {
      coincide = clave === periodo;
    }

    if (!coincide) continue;

    var ms = mv580FechaMs_(fechas[i][0]);
    if (ms > mejorMs) {
      mejorMs = ms;
      mejor = fechas[i][0];
    }
  }

  return {
    texto: mejor ? mv580TextoFecha_(mejor) : "",
    dia: mejor ? mv580FechaDia_(mejor) : "",
    ms: mejorMs
  };
}

function mv580EstadoCapa_(nombre, actual, mapaDia) {
  actual = actual || {};
  var dia = String(actual.dia || "");
  var alDia = !!(mapaDia && dia && dia >= mapaDia);

  return {
    nombre:nombre,
    fecha:actual.texto || "",
    dia:dia,
    alDia:alDia
  };
}

function estadoSincronizacionIntegralV580(data) {
  data = data || {};
  var usuario = obtenerUsuarioApp(data.usuario);
  var periodo = String(data.periodo || mv580PeriodoActual_()).trim();

  if (!mv580PeriodoValido_(periodo)) {
    throw new Error("Periodo no válido para sincronización integral");
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mapa = mv580UltimaImportacionMapaPeriodo_(ss, periodo);

  var prod = mv580MaxActualizacionPorPeriodo_(ss, HOJA_PRODUCCION, periodo, {
    columnaPeriodo:3,
    columnaFecha:7,
    modoPeriodo:"FECHA"
  });

  var ef = mv580MaxActualizacionPorPeriodo_(ss, HOJA_EFECTIVIDAD, periodo, {
    columnaPeriodo:1,
    columnaFecha:4,
    modoPeriodo:"ID_CONTIENE"
  });

  var rec = mv580MaxActualizacionPorPeriodo_(ss, HOJA_RECABLEADO, periodo, {
    columnaPeriodo:1,
    columnaFecha:4,
    modoPeriodo:"ID_CONTIENE"
  });

  var vtr = mv580MaxActualizacionPorPeriodo_(ss, HOJA_VTRGAR, periodo, {
    columnaPeriodo:1,
    columnaFecha:4,
    modoPeriodo:"ID_CONTIENE"
  });

  var ranking = mv580MaxActualizacionPorPeriodo_(ss, HOJA_RANKING, periodo, {
    columnaPeriodo:1,
    columnaFecha:3,
    modoPeriodo:"ID_CONTIENE"
  });

  var dashboard = mv580MaxActualizacionPorPeriodo_(ss, HOJA_RESUMEN_DASHBOARD_RANKING_V361, periodo, {
    columnaPeriodo:1,
    columnaFecha:3,
    modoPeriodo:"EXACTO"
  });

  var sla = mv580MaxActualizacionPorPeriodo_(ss, HOJA_SLA_ORDENES_RESUMEN_V363, periodo, {
    columnaPeriodo:2,
    columnaFecha:24,
    modoPeriodo:"EXACTO"
  });

  var selloV512 = {};
  try {
    selloV512 = obtenerActualizacionIndicadoresWinV512({
      usuario:data.usuario,
      periodo:periodo
    }) || {};
  } catch (_) {}

  var cola = mv547LeerColaMapaIndicadores_();
  var colaResumen = mv547ResumenEstadoCola_(cola);

  var capas = {
    produccion:mv580EstadoCapa_("Producción",prod,mapa.dia),
    efectividad:mv580EstadoCapa_("Efectividad",ef,mapa.dia),
    recableado:mv580EstadoCapa_("Recableado",rec,mapa.dia),
    vtrGar:mv580EstadoCapa_("VTR/GAR",vtr,mapa.dia),
    ranking:mv580EstadoCapa_("Ranking",ranking,mapa.dia),
    dashboard:mv580EstadoCapa_("Dashboard",dashboard,mapa.dia),
    sla:mv580EstadoCapa_("SLA",sla,mapa.dia)
  };

  var claves = Object.keys(capas);
  var todasAlDia = !!mapa.dia && claves.every(function(k){ return capas[k].alDia; });

  var colaPendiente =
    colaResumen &&
    Array.isArray(colaResumen.periodos) &&
    colaResumen.periodos.indexOf(periodo) >= 0 &&
    ["PENDIENTE","PROCESANDO","ESPERA_REINTENTO","SISTEMA_OCUPADO","ERROR"].indexOf(String(colaResumen.estado || "")) >= 0;

  var estado = !mapa.dia
    ? "SIN_DATOS_MAPA"
    : (todasAlDia && !colaPendiente ? "SINCRONIZADO" : "PENDIENTE");

  return {
    ok:true,
    version:MV580_VERSION_,
    modulo:"SINCRONIZACION_INTEGRAL",
    periodo:periodo,
    usuario:usuario && usuario.usuario ? usuario.usuario : String(data.usuario || ""),
    mapa:mapa,
    capas:capas,
    selloV512:{
      fechaPublicacion:String(selloV512.fechaPublicacion || ""),
      fechaPublicacionTexto:String(selloV512.fechaPublicacionTexto || ""),
      actualizadoPor:String(selloV512.actualizadoPor || "")
    },
    cola:colaResumen,
    estado:estado,
    sincronizado:todasAlDia && !colaPendiente,
    puedeReintentar:mv580PerfilPuedeSincronizar_(usuario.perfil)
  };
}

function reintentarSincronizacionIntegralV580(data) {
  data = data || {};
  var usuario = obtenerUsuarioApp(data.usuario);

  if (!mv580PerfilPuedeSincronizar_(usuario.perfil)) {
    throw new Error("Solo Jefatura o Administración puede reintentar la sincronización integral");
  }

  var periodo = String(data.periodo || mv580PeriodoActual_()).trim();
  if (!mv580PeriodoValido_(periodo)) {
    throw new Error("Periodo no válido");
  }

  var cola = mv547LeerColaMapaIndicadores_() || {};
  var estadoActual = String(cola.estado || "");

  if (estadoActual === "PROCESANDO") {
    var inicio = Date.parse(String(cola.enProcesoDesde || ""));
    if (inicio && Date.now() - inicio < MV547_PROCESO_VENCIDO_MS_) {
      return {
        ok:true,
        version:MV580_VERSION_,
        programada:false,
        estado:"PROCESANDO",
        mensaje:"La sincronización ya se está ejecutando."
      };
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mapa = mv580UltimaImportacionMapaPeriodo_(ss, periodo);

  var programacion = mv547ProgramarSincronizacionMapa_(
    [periodo],
    usuario.usuario || String(data.usuario || ""),
    mapa.texto || ""
  );

  return {
    ok:true,
    version:MV580_VERSION_,
    accion:"REINTENTAR_SINCRONIZACION",
    periodo:periodo,
    programada:!!programacion.programada,
    cola:programacion,
    mensaje:"Sincronización programada. No vuelva a cargar el Excel; el trigger la procesará con prioridad."
  };
}

/*
   V580 CORRECCION CENTRAL:
   V518 reemplazó importarMapaOperativo por una ruta incremental y esa ruta
   no programaba V547. El wrapper garantiza que TODA importación exitosa,
   incremental o fallback, deje la publicación integral en cola.
*/
importarMapaOperativo = function(data) {
  data = data || {};
  var periodos = mv580PeriodosCargaMapa_(data.registros);
  var antes = "";

  try {
    var ssAntes = SpreadsheetApp.getActiveSpreadsheet();
    var mapaAntes = mv580UltimaImportacionMapaPeriodo_(
      ssAntes,
      periodos[0] || mv580PeriodoActual_()
    );
    antes = mapaAntes.iso || "";
  } catch (_) {}

  try {
    var resultado = MV580_IMPORTAR_MAPA_BASE_(data);

    if (resultado && resultado.ok === true && !resultado.sinCambios) {
      var usuario = obtenerUsuarioApp(data.usuario);
      var programacionExistente = resultado.sincronizacionIndicadores;

      if (!programacionExistente || !programacionExistente.programada) {
        var programacion = mv547ProgramarSincronizacionMapa_(
          periodos,
          usuario && usuario.usuario ? usuario.usuario : String(data.usuario || ""),
          resultado.ultimaActualizacionTexto || resultado.ultimaActualizacion || ""
        );
        resultado.sincronizacionIndicadores = programacion;
      }

      resultado.versionSincronizacionIntegral = MV580_VERSION_;
      resultado.mapaIndicadoresEnCola = !!(
        resultado.sincronizacionIndicadores &&
        resultado.sincronizacionIndicadores.programada
      );
    }

    return resultado;

  } catch (error) {
    /*
       Si el guardado alcanzó a impactar MAPA pero una etapa posterior perdió
       la respuesta, la cola igual queda programada. Nunca repetimos el Excel.
    */
    try {
      var ssDespues = SpreadsheetApp.getActiveSpreadsheet();
      var mapaDespues = mv580UltimaImportacionMapaPeriodo_(
        ssDespues,
        periodos[0] || mv580PeriodoActual_()
      );

      if (mapaDespues.iso && mapaDespues.iso !== antes) {
        var usuarioError = obtenerUsuarioApp(data.usuario);
        mv547ProgramarSincronizacionMapa_(
          periodos,
          usuarioError && usuarioError.usuario ? usuarioError.usuario : String(data.usuario || ""),
          mapaDespues.texto || ""
        );
      }
    } catch (_) {}

    throw error;
  }
};

/*
   PRIORIDAD DEL TRIGGER:
   antes de revisar vencimientos de Validación Técnica, atiende la cola V547.
   Si acaba de publicar un periodo o existe otra publicación activa, termina
   el minuto allí para no competir por tiempo/locks.
*/
procesarValidacionesTecnicasVencidas = function() {
  var inicio = Date.now();
  var sync = null;

  try {
    sync = mv547ProcesarColaMapaIndicadores_();
  } catch (error) {
    sync = {
      ok:false,
      estado:"ERROR",
      error:error && error.message ? error.message : String(error)
    };
  }

  var estado = String(sync && sync.estado || "");

  if (
    (sync && sync.periodoPublicado) ||
    estado === "PROCESANDO" ||
    estado === "SISTEMA_OCUPADO" ||
    estado === "NUEVA_IMPORTACION_PENDIENTE"
  ) {
    return {
      ok:sync && sync.ok !== false,
      modulo:"SINCRONIZACION_INTEGRAL",
      accion:"TRIGGER_PRIORITARIO_V580",
      prioridadMapa:true,
      validacionTecnicaPospuesta:true,
      sincronizacionMapaIndicadoresV580:sync,
      duracionMs:Date.now()-inicio
    };
  }

  var resultado = MV580_VALIDACION_TECNICA_BASE_.apply(this, arguments) || {};
  resultado.prioridadMapaV580 = true;
  resultado.sincronizacionPrioritariaV580 = sync;
  return resultado;
};

function V580_DIAGNOSTICO_SETIEMBRE() {
  return estadoSincronizacionIntegralV580({
    usuario:"JEFZNORTE",
    periodo:"2026-09"
  });
}

function V580_REINTENTAR_SETIEMBRE() {
  return reintentarSincronizacionIntegralV580({
    usuario:"JEFZNORTE",
    periodo:"2026-09"
  });
}
