/* =====================================================================
   MI VISUAL V556 - RESTAURA COLA MAPA -> INDICADORES
   21/09/2026

   CAUSA CORREGIDA:
   - V518 Fase 2 reemplaza importarMapaOperativo por mv518F2ImportarRapido_.
   - Esa ruta optimizada conserva Mapa/CTO/caches, pero omitio programar V547.
   - Resultado: MAPA_ORDENES avanza y la cola queda SIN_COLA.

   ALCANCE:
   - NO modifica reglas de Produccion, GAR/VTR, Efectividad, Recableado,
     Ranking, Dashboard, Partidas, CTO ni guardado incremental V518.
   - Solo vuelve a programar la cola V547 DESPUES de una importacion exitosa.
   - Si el importador base ya programo V547 (fallback historico), no duplica.
===================================================================== */

var MV556_VERSION_ = "V556-MAPA-COLA-INDICADORES-20260921";
var MV556_IMPORTAR_MAPA_BASE_ = importarMapaOperativo;

function mv556PeriodosRegistros_(registros) {
  var bolsa = {};
  (Array.isArray(registros) ? registros : []).forEach(function(r) {
    r = r || {};
    try {
      mv547RegistrarPeriodoImpactado_(bolsa, {
        fechaSolicitud: r.fechaSolicitud || r.FECHA_SOLICITUD || "",
        fechaUltimoEstado: r.fechaUltimoEstado || r.FECHA_ULTIMO_ESTADO || "",
        fechaFinVisita: r.fechaFinVisita || r.FECHA_FIN_VISITA || "",
        fechaInicioVisita: r.fechaInicioVisita || r.FECHA_INICIO_VISITA || ""
      });
    } catch (_) {}
  });
  return Object.keys(bolsa).sort().reverse();
}

importarMapaOperativo = function(data) {
  var salida = MV556_IMPORTAR_MAPA_BASE_.apply(this, arguments);
  if (!salida || salida.ok === false) return salida;

  try {
    /* El fallback historico ya puede haber programado V547. */
    if (
      salida.sincronizacionIndicadores &&
      salida.sincronizacionIndicadores.programada === true
    ) {
      salida.versionIntegracionMapaIndicadores = MV556_VERSION_;
      salida.colaV547Restaurada = true;
      salida.colaV547YaProgramadaPorBase = true;
      return salida;
    }

    var periodos = mv556PeriodosRegistros_(data && data.registros);
    var ultimaTexto =
      salida.ultimaActualizacionTexto ||
      (
        typeof obtenerUltimaActualizacionMapaOperativo === "function"
          ? (
              obtenerUltimaActualizacionMapaOperativo(
                asegurarHojaMapaOperativo()
              ).ultimaActualizacionTexto || ""
            )
          : ""
      );

    var sync = mv547ProgramarSincronizacionMapa_(
      periodos,
      data && data.usuario ? String(data.usuario) : "",
      ultimaTexto
    );

    salida.sincronizacionIndicadores = sync;
    salida.versionIntegracionMapaIndicadores = MV556_VERSION_;
    salida.colaV547Restaurada = true;
    salida.colaV547YaProgramadaPorBase = false;
  } catch (error) {
    /*
      El Mapa ya fue guardado por V518. No convertimos una carga exitosa
      en fallo solo porque la cola no pudo programarse; dejamos trazabilidad.
    */
    salida.sincronizacionIndicadores = {
      programada: false,
      version: MV556_VERSION_,
      estado: "ERROR_PROGRAMANDO_COLA",
      error: error && error.message ? error.message : String(error)
    };
    salida.versionIntegracionMapaIndicadores = MV556_VERSION_;
    salida.colaV547Restaurada = false;
  }

  return salida;
};

importarMapaOperativo.MV556 = true;
importarMapaOperativo.VERSION = MV556_VERSION_;

/*
   Recuperacion puntual del periodo actual.
   SOLO escribe ScriptProperties de la cola V547.
   NO reimporta Mapa y NO escribe hojas operativas.
*/
function V556_RECUPERAR_SETIEMBRE_INDICADORES() {
  var hoja = asegurarHojaMapaOperativo();
  var ultima = obtenerUltimaActualizacionMapaOperativo(hoja);

  var sync = mv547ProgramarSincronizacionMapa_(
    ["2026-09"],
    "JEFZNORTE",
    ultima && ultima.ultimaActualizacionTexto
      ? ultima.ultimaActualizacionTexto
      : ""
  );

  var salida = {
    ok: true,
    version: MV556_VERSION_,
    periodo: "2026-09",
    sincronizacion: sync,
    cola: mv547ResumenEstadoCola_(mv547LeerColaMapaIndicadores_()),
    noReimportaMapa: true,
    noEscribeHojasOperativas: true,
    mensaje:
      "Septiembre fue colocado en la cola V547. El trigger existente procesara la publicacion integral."
  };

  Logger.log(JSON.stringify(salida, null, 2));
  return salida;
}

function V556_DIAGNOSTICO_INSTALACION() {
  var salida = {
    ok: true,
    version: MV556_VERSION_,
    wrapperActivo:
      !!(importarMapaOperativo && importarMapaOperativo.MV556 === true),
    v518Disponible:
      typeof mv518F2ImportarRapido_ === "function",
    v547Disponible:
      typeof mv547ProgramarSincronizacionMapa_ === "function" &&
      typeof mv547ProcesarColaMapaIndicadores_ === "function",
    cola: mv547ResumenEstadoCola_(mv547LeerColaMapaIndicadores_()),
    noEscribeHojas: true
  };
  Logger.log(JSON.stringify(salida, null, 2));
  return salida;
}
