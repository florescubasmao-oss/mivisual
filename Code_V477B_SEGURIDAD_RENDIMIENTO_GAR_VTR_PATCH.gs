/* ==========================================================
   MI VISUAL V477B - ENDURECIMIENTO GAR/VTR
   Complementa V477 sin cambiar estados, hojas ni formulas.

   1) VTR solo acepta antecedentes de servicio reconocibles.
   2) El lote automatico escribe las calificaciones en una sola operacion.
   3) El historial se registra despues de liberar el ScriptLock.
========================================================== */

var MV477B_VERSION_ = "V477B-GAR-VTR-SEGURO-BATCH-20260823";
var MV477B_CATALOGO_ = null;

function mv477bCatalogo_() {
  if (MV477B_CATALOGO_) return MV477B_CATALOGO_;
  try { MV477B_CATALOGO_ = catalogoPartidasBaseOperativa(); }
  catch (e) { MV477B_CATALOGO_ = {porTipo:{}}; }
  return MV477B_CATALOGO_;
}

// Sustituye la clasificacion amplia de V477 por una regla conservadora.
mv477ClasificarTrabajoOrigen_ = function(registro) {
  if (!registro || normalizarTexto(registro.estado) !== "FINALIZADA") return "";
  if (tipoIncidenciaBaseOperativa(registro)) return "";

  var catalogo = mv477bCatalogo_();
  var partida = normalizarTexto(registro.tipoPartida || "");
  var alterna = normalizarTexto(registro.tipoPartidaAlterna || "");
  var cat = catalogo && catalogo.porTipo
    ? (catalogo.porTipo[partida] || catalogo.porTipo[alterna] || null)
    : null;
  var grupo = normalizarTexto(cat && cat.grupo || "");
  var texto = normalizarTexto([
    registro.tipoTrabajo || "",
    registro.tipoAtencion || "",
    partida,
    alterna,
    grupo
  ].join(" "));

  if (grupo.indexOf("INSTAL") >= 0 || texto.indexOf("INSTALACION") >= 0) {
    return "INSTALACION";
  }

  // Si el catalogo reconoce un grupo operacional que no es Instalacion ni VTR/GAR,
  // se considera gestion de servicio valida para una VTR.
  if (grupo && grupo !== "VTR Y GAR" && grupo.indexOf("INSTAL") < 0) {
    return "SERVICIO";
  }

  var expresion = /(VISITA TECNICA|AVERIA|RECABLEADO|TRASLADO|POSTVENTA|POST VENTA|POSVENTA|ULTIMA MILLA|REUBICACION|DESCARTE|MEJORA TECNOLOGICA|PATCHCORD|ASISTENCIA|CAMBIO DE ONT|MESH|WINBOX|WIN BOX|UTP|CONECTOR)/;
  return expresion.test(texto) ? "SERVICIO" : "";
};

function mv477bObservacion_(inc, det) {
  return [
    "AUTO V477",
    det.origenOrden,
    "DNI " + (inc.numeroDocumento || "-"),
    "origen " + (det.fechaOrigen || "-") + " / " + (det.cuadrillaOrigen || "-"),
    "atendio " + (inc.cuadrillaEjecutora || "-"),
    String(det.diasTranscurridos == null ? "-" : det.diasTranscurridos) + " dia(s)",
    det.tipoTrabajoOrigen || ""
  ].filter(function(x){ return !!String(x || "").trim(); }).join(" · ");
}

// Reemplazo optimizado del lote V477. La deteccion y reglas siguen siendo las mismas.
mv477AplicarAutomaticos_ = function(data) {
  data = data || {};
  validarAdministracionBaseOperativa(data.usuario);
  var periodoActivo = mv477PeriodoActivo_();
  if (!periodoActivo) {
    return {ok:true, version:MV477B_VERSION_, aplicados:0, motivo:"SIN_PERIODO_ACTIVO"};
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1800)) {
    return {
      ok:true,
      version:MV477B_VERSION_,
      aplicados:0,
      omitidoConcurrencia:true,
      mensaje:"Hay otra actualizacion en curso. La deteccion automatica se reintentara al volver a abrir la pantalla."
    };
  }

  var cambios = [];
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(HOJA_BASE_VTR_GAR_DETECTADA);
    if (!hoja || hoja.getLastRow() <= 1) {
      return {ok:true, version:MV477B_VERSION_, aplicados:0, periodo:periodoActivo};
    }

    var n = hoja.getLastRow() - 1;
    var datos = hoja.getRange(2, 1, n, 20).getValues();
    var calificaciones = datos.map(function(fila){ return fila.slice(11,18); });
    var historica = mv477LeerHistoricaSoloLectura_();
    var indice = mv477ConstruirIndiceHistorico_(historica);
    var usuarios = cuadrillasTecnicasBaseOperativa();
    var ahora = new Date();

    for (var i = 0; i < datos.length; i++) {
      if (!datos[i][0]) continue;
      var inc = filaGestionVtrGarAObjeto(datos[i]);
      if (normalizarTexto(inc.estadoCalificacion || "PENDIENTE") !== "PENDIENTE") continue;
      var fechaInc = fechaBaseOperativa(inc.fechaISO || inc.fecha);
      if (!fechaInc || clavePeriodoBaseOperativa(fechaInc) !== periodoActivo) continue;

      var det = mv477DetectarOrigen_(inc, indice);
      if (!det || !det.auto) continue;
      var responsable = normalizarCuadrilla(det.cuadrillaOrigen);
      if (!responsable || !usuarios[responsable]) continue;

      var estadoNuevo = det.origenOrden === "PROPIA" ? "CONFIRMADO" : "REASIGNADO";
      var sedeResponsable = usuarios[responsable].sede || "";
      var observacionAuto = mv477bObservacion_(inc, det);
      var observacionAnterior = String(datos[i][16] || "").trim();
      var observacion = observacionAnterior ? observacionAnterior + " | " + observacionAuto : observacionAuto;

      calificaciones[i] = [
        estadoNuevo,
        responsable,
        sedeResponsable,
        MV477_USUARIO_SISTEMA_,
        ahora,
        observacion,
        ahora
      ];
      cambios.push({
        clave:inc.clave,
        tipo:inc.tipo,
        fecha:inc.fechaISO || inc.fecha,
        anterior:inc.estadoCalificacion || "PENDIENTE",
        nuevo:estadoNuevo,
        cuadrillaAnterior:inc.cuadrillaResponsable || "",
        cuadrillaNueva:responsable,
        observacion:observacionAuto,
        deteccion:det
      });
    }

    if (cambios.length) {
      // Una unica escritura para todas las incidencias del lote.
      hoja.getRange(2, 12, n, 7).setValues(calificaciones);
      hoja.getRange(2, 16, n, 1).setNumberFormat("dd/mm/yyyy hh:mm");
      hoja.getRange(2, 18, n, 1).setNumberFormat("dd/mm/yyyy hh:mm");
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }

  // La auditoria se escribe fuera del candado global para reducir contencion.
  var historialErrores = [];
  cambios.forEach(function(c){
    try {
      registrarHistorialGestionVtrGar(
        c.clave,
        MV477_USUARIO_SISTEMA_,
        c.deteccion.decision,
        c.anterior,
        c.nuevo,
        c.cuadrillaAnterior,
        c.cuadrillaNueva,
        c.observacion
      );
    } catch (e) {
      historialErrores.push(c.clave + ": " + (e && e.message ? e.message : String(e)));
    }
  });

  var recalculo = null;
  var recalculoError = "";
  if (cambios.length) {
    try {
      recalculo = recalcularVtrGarDesdeBaseOperativa(MV477_USUARIO_SISTEMA_, cambios[0].fecha);
    } catch (e) {
      recalculoError = e && e.message ? e.message : String(e);
    }
    try { if (typeof invalidarCacheBonosSupervisores_ === "function") invalidarCacheBonosSupervisores_(); } catch (e) {}
    try { if (typeof invalidarResumenDashboardRankingV361_ === "function") invalidarResumenDashboardRankingV361_(); } catch (e) {}
  }

  return {
    ok:true,
    version:MV477B_VERSION_,
    periodo:periodoActivo,
    aplicados:cambios.length,
    detalle:cambios.map(function(c){
      return {
        clave:c.clave,
        tipo:c.tipo,
        origenOrden:c.deteccion.origenOrden,
        responsable:c.cuadrillaNueva,
        cuadrillaEjecutora:c.deteccion.cuadrillaEjecutora || "",
        fechaOrigen:c.deteccion.fechaOrigen || "",
        diasTranscurridos:c.deteccion.diasTranscurridos,
        estado:c.nuevo
      };
    }),
    recalculo:recalculo,
    recalculoError:recalculoError,
    historialErrores:historialErrores
  };
};
