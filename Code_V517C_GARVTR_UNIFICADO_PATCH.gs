/* ==========================================================
   MI VISUAL V517C - GAR/VTR UNIFICADO
   BACKEND ADITIVO / COMPATIBLE

   OBJETIVO
   - El técnico mantiene el mismo registro en VALIDACION_TECNICA.
   - GAR/VTR deja de requerir PROPIA / ASIGNADA.
   - Si un frontend antiguo todavía envía origenOrden, se ignora para
     GAR/VTR: la responsabilidad se determina por WIN + Jefatura.
   - Los registros históricos y su columna ORIGEN_ORDEN NO se borran.
   - Recableado y OTRO conservan su flujo actual.
   - No modifica Ranking, Dashboard, PRODUCCION_APP ni valorización.
========================================================== */

var MV517C_VERSION_ = "V517C-GARVTR-UNIFICADO-REGISTRO-SIN-ORIGEN-20260828";

/* V517C: el origen manual deja de ser obligatorio.
   Solo modifica el comportamiento ante valor vacío; valores inválidos
   distintos de vacío continúan rechazándose. */
var MV517C_normalizarOrigenOrdenBase_ = normalizarOrigenOrdenValidacion;
normalizarOrigenOrdenValidacion = function(origen, permitirVacio) {
  var valor = normalizarTexto(origen);
  if (!valor) return "";
  if (valor === "PROPIA" || valor === "ASIGNADA") return valor;
  return MV517C_normalizarOrigenOrdenBase_(origen, permitirVacio);
};

/* V517C: protección servidor. Aunque un navegador antiguo siga mostrando
   PROPIA/ASIGNADA, el backend no usa esa declaración para GAR/VTR. */
var MV517C_registrarValidacionTecnicaBase_ = registrarValidacionTecnica;
registrarValidacionTecnica = function(data) {
  var copia = Object.assign({}, data || {});
  var tipoTicket = normalizarTipoTicketValidacion(copia.tipoTicket || copia.tipo_ticket);
  var tipoValidacion = obtenerTipoValidacionPorTicket(tipoTicket);

  if (tipoValidacion === "GAR" || tipoValidacion === "VTR") {
    copia.origenOrden = "";
    copia.origen_orden = "";
  }

  return MV517C_registrarValidacionTecnicaBase_(copia);
};

function DIAGNOSTICO_V517C_GARVTR() {
  return {
    ok:true,
    version:MV517C_VERSION_,
    integradoSobre:MV517A_VERSION_,
    registroTecnico:{
      hoja:"VALIDACION_TECNICA",
      conservaHistorico:true,
      origenManualObligatorio:false,
      origenManualNuevoIgnorado:true,
      camposConservados:[
        "TICKET","CODIGO","DNI","MOTIVO_TECNICO",
        "TECNICO","CUADRILLA","FECHA_REGISTRO"
      ]
    },
    jefatura:{
      usuarioValidadorUnico:MV517_USUARIO_VALIDADOR_,
      detalleRegistroDisponible:true,
      bonoNoBonoConservado:true,
      comentarioObligatorioConservado:true
    },
    recableadoModificado:false,
    rankingModificado:false,
    dashboardModificado:false,
    produccionAppModificada:false,
    produccionValorizadaModificada:false
  };
}

function VER_DIAGNOSTICO_V517C_GARVTR() {
  var r = DIAGNOSTICO_V517C_GARVTR();
  console.log(JSON.stringify(r,null,2));
  return r;
}

var MV517C_doGetBase_ = doGet;
doGet = function(e) {
  var p = typeof parametrosGetMiVisual_ === "function"
    ? parametrosGetMiVisual_(e)
    : Object.assign({}, e && e.parameter ? e.parameter : {});
  if (p.accion === "diagnosticoV517CGarVtr") {
    return respuestaJson(DIAGNOSTICO_V517C_GARVTR());
  }
  return MV517C_doGetBase_(e);
};
