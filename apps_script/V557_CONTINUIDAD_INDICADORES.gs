/* =====================================================================
   MI VISUAL V557 - CONTINUIDAD DE CUADRILLAS EN FUENTE CANONICA
   21/09/2026

   OBJETIVO:
   - Aplicar CONTINUIDAD_CUADRILLAS antes de construir Produccion,
     Efectividad, Recableado, VTR/GAR, Ranking y Dashboard.
   - Respeta FECHA_EFECTIVA.
   - NO reescribe MAPA_ORDENES.
   - NO modifica historicos anteriores a la fecha efectiva.
   - Conserva cuadrillaOriginal para trazabilidad.
===================================================================== */

var MV557_VERSION_ = "V557-CONTINUIDAD-INDICADORES-20260921";
var MV557_LEER_MAPA_BASE_ = mv487sLeerMapaCanonico_;

function mv557Norm_(v) {
  return String(v == null ? "" : v).trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");
}

function mv557Fecha_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  var s = String(v == null ? "" : v).trim();
  if (!s) return null;
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})/);
  if (m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
  m = s.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function mv557LeerContinuidades_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("CONTINUIDAD_CUADRILLAS");
  var reglas = [];
  if (!sh || sh.getLastRow() <= 1) return reglas;

  var vals = sh.getRange(2,1,sh.getLastRow()-1,8).getDisplayValues();
  vals.forEach(function(r, i) {
    var anterior = normalizarCuadrilla(r[1] || "");
    var nueva = normalizarCuadrilla(r[2] || "");
    var fecha = mv557Fecha_(r[3] || "");
    var estado = mv557Norm_(r[5] || "");
    if (!anterior || !nueva || !fecha || estado !== "ACTIVO") return;
    reglas.push({
      fila:i+2,
      id:String(r[0] || ""),
      anterior:anterior,
      nueva:nueva,
      anteriorKey:mv557Norm_(anterior),
      fechaEfectiva:fecha,
      fechaEfectivaMs:fecha.getTime(),
      motivo:String(r[4] || "")
    });
  });

  reglas.sort(function(a,b) {
    if (a.fechaEfectivaMs !== b.fechaEfectivaMs) return a.fechaEfectivaMs-b.fechaEfectivaMs;
    return a.fila-b.fila;
  });
  return reglas;
}

function mv557FechaOrden_(o) {
  return o && (
    o.fechaSolicitud ||
    o.fechaInicioVisita ||
    o.fechaFinVisita ||
    o.fechaUltimoEstado ||
    null
  );
}

function mv557CanonConContinuidad_(cuadrilla, fechaOrden, reglas) {
  var original = normalizarCuadrilla(cuadrilla || "");
  var actual = original;
  var fecha = mv557Fecha_(fechaOrden);
  if (!actual || !fecha) {
    return {original:original, cuadrilla:actual, cambios:[]};
  }

  var cambios = [];
  var vistos = {};
  for (var paso=0; paso<10; paso++) {
    var key = mv557Norm_(actual);
    if (!key || vistos[key]) break;
    vistos[key] = true;

    var candidata = null;
    (reglas || []).forEach(function(r) {
      if (r.anteriorKey !== key) return;
      if (fecha.getTime() < r.fechaEfectivaMs) return;
      if (!candidata || r.fechaEfectivaMs >= candidata.fechaEfectivaMs) candidata = r;
    });

    if (!candidata) break;
    var nueva = normalizarCuadrilla(candidata.nueva || "");
    if (!nueva || mv557Norm_(nueva) === key) break;

    cambios.push({
      id:candidata.id,
      anterior:actual,
      nueva:nueva,
      fechaEfectiva:candidata.fechaEfectiva,
      motivo:candidata.motivo
    });
    actual = nueva;
  }

  return {original:original, cuadrilla:actual, cambios:cambios};
}

mv487sLeerMapaCanonico_ = function(periodoSolicitado) {
  var base = MV557_LEER_MAPA_BASE_.apply(this, arguments);
  if (!base || !Array.isArray(base.ordenes)) return base;

  var reglas = mv557LeerContinuidades_();
  var aplicadas = {};

  base.ordenes.forEach(function(o) {
    if (!o) return;
    var fechaOrden = mv557FechaOrden_(o);
    var res = mv557CanonConContinuidad_(o.cuadrilla, fechaOrden, reglas);
    if (!res.cambios.length || !res.cuadrilla) return;

    var anterior = normalizarCuadrilla(o.cuadrilla || "");
    o.cuadrilla = res.cuadrilla;
    o.tipoHomologacion = "CONTINUIDAD_CUADRILLAS";
    o.observacionHomologacion =
      "Continuidad operativa: " + anterior + " → " + res.cuadrilla;

    res.cambios.forEach(function(c) {
      aplicadas[c.id || (mv557Norm_(c.anterior)+"|"+mv557Norm_(c.nueva))] = {
        id:c.id || "",
        anterior:c.anterior,
        nueva:c.nueva,
        motivo:c.motivo || ""
      };
    });
  });

  var previas = Array.isArray(base.homologaciones) ? base.homologaciones.slice() : [];
  Object.keys(aplicadas).forEach(function(k) {
    var a = aplicadas[k];
    previas.push("V557 " + (a.id || "") + ": " + a.anterior + " → " + a.nueva);
  });
  base.homologaciones = previas;
  base.versionContinuidadIndicadores = MV557_VERSION_;
  base.continuidadesAplicadas = Object.keys(aplicadas).map(function(k){ return aplicadas[k]; });

  return base;
};

mv487sLeerMapaCanonico_.MV557 = true;
mv487sLeerMapaCanonico_.VERSION = MV557_VERSION_;

function V557_DIAGNOSTICO_SETIEMBRE_CONTINUIDAD() {
  var base = mv487sLeerMapaCanonico_("2026-09");
  var nombres = {};
  var p12LuisAlex = 0;
  var p12LuisElias = 0;
  var p9Anterior = 0;

  (base.ordenes || []).forEach(function(o) {
    var c = normalizarCuadrilla(o && o.cuadrilla || "");
    nombres[c] = (nombres[c] || 0) + 1;
    if (c === normalizarCuadrilla("P12 VISUAL SGI LUIS ALEX FERNANDEZ CHANTA")) p12LuisAlex++;
    if (c === normalizarCuadrilla("P12 VISUAL SGI LUIS ELIAS VASQUEZ BULLON")) p12LuisElias++;
    if (c === normalizarCuadrilla("P9 VISUAL SGA PEDRO PABLO ZAPATA YOVERA")) p9Anterior++;
  });

  var salida = {
    ok:true,
    version:MV557_VERSION_,
    periodo:"2026-09",
    noEscribeHojas:true,
    ordenes:(base.ordenes || []).length,
    continuidadesAplicadas:base.continuidadesAplicadas || [],
    control:{
      p12LuisAlex:p12LuisAlex,
      p12LuisEliasResidual:p12LuisElias,
      p9AnteriorResidual:p9Anterior
    },
    listoParaRepublicar:
      p12LuisAlex > 0 &&
      p12LuisElias === 0 &&
      p9Anterior === 0
  };
  Logger.log(JSON.stringify(salida,null,2));
  return salida;
}
