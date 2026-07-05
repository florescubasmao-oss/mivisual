const HOJA_PRODUCCION = "PRODUCCION_APP";
const HOJA_EFECTIVIDAD = "EFECTIVIDAD";
const HOJA_RECABLEADO = "PORCENTAJE REC";
const HOJA_VTRGAR = "POR VTR/GAR";

function doGet() {
  return ContentService
    .createTextOutput("MI VISUAL API OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* =========================
   FUNCIONES GENERALES
========================= */

function normalizarCuadrilla(nombre) {
  return (nombre || "")
    .toString()
    .replace(/^P\s+(\d+)/i, "P$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarFecha(fecha) {
  if (fecha instanceof Date) {
    return Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyyMMdd");
  }

  const partes = fecha.toString().split("/");
  if (partes.length == 3) {
    return partes[2] + partes[1].padStart(2, "0") + partes[0].padStart(2, "0");
  }

  return fecha.toString();
}

function obtenerMes(fecha) {
  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  if (fecha instanceof Date) {
    return meses[fecha.getMonth()];
  }

  const texto = fecha.toString();
  const partes = texto.split("/");

  if (partes.length == 3) {
    return meses[Number(partes[1]) - 1];
  }

  return texto.toUpperCase();
}

function formatearFecha(fecha) {
  if (fecha instanceof Date) {
    return Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }

  return fecha.toString();
}

function generarID(cuadrilla, fecha, codigo) {
  return normalizarCuadrilla(cuadrilla) + "|" + normalizarFecha(fecha) + "|" + codigo.toString().trim();
}

function responderJSON(respuesta) {
  return ContentService
    .createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}

function leerBaseEfectividad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_EFECTIVIDAD);

  if (!hoja) throw new Error("No existe la hoja EFECTIVIDAD");

  const datos = hoja.getDataRange().getValues();
  const base = [];

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const usuario = fila[1] || "ADMIN";
    const cuadrilla = normalizarCuadrilla(fila[2]);
    const finalizadas = Number(fila[4]) || 0;

    if (!cuadrilla) continue;

    base.push({
      usuario: usuario,
      cuadrilla: cuadrilla,
      finalizadas: finalizadas
    });
  }

  return base;
}

/* =========================
   PRODUCCIÓN
========================= */

function procesarProduccion(registros) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_PRODUCCION);

  if (!hoja) throw new Error("No existe PRODUCCION_APP");

  const ultimaFila = hoja.getLastRow();
  let base = [];

  if (ultimaFila > 1) {
    base = hoja.getRange(2, 1, ultimaFila - 1, 7).getValues();
  }

  const indice = {};

  base.forEach((fila, i) => {
    let id = fila[5];

    if (!id) {
      id = generarID(fila[1], fila[2], fila[3]);
      hoja.getRange(i + 2, 6).setValue(id);
    }

    indice[id] = i + 2;
  });

  const insertar = [];
  let nuevos = 0;
  let actualizados = 0;

  registros.forEach(r => {
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    const id = generarID(cuadrilla, r.fecha, r.codigo);
    const ahora = new Date();

    if (indice[id]) {
      hoja.getRange(indice[id], 1, 1, 7).setValues([[
        r.usuario,
        cuadrilla,
        r.fecha,
        r.codigo,
        r.cantidad,
        id,
        ahora
      ]]);

      actualizados++;
    } else {
      insertar.push([
        r.usuario,
        cuadrilla,
        r.fecha,
        r.codigo,
        r.cantidad,
        id,
        ahora
      ]);

      nuevos++;
    }
  });

  if (insertar.length > 0) {
    hoja.getRange(hoja.getLastRow() + 1, 1, insertar.length, 7).setValues(insertar);
  }

  return {
    ok: true,
    modulo: "PRODUCCION",
    nuevos: nuevos,
    actualizados: actualizados
  };
}

/* =========================
   EFECTIVIDAD
========================= */

function procesarEfectividad(registros, periodoManual, actualizadoAlManual) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_EFECTIVIDAD);

  if (!hoja) throw new Error("No existe la hoja EFECTIVIDAD");

  if (!registros || registros.length === 0) {
    throw new Error("No se recibieron registros de efectividad");
  }

  const salida = [[
    "ID",
    "Usuario",
    "Cuadrilla",
    "ACTUALIZACION",
    "Finalizada",
    "Cancelada",
    "Regestión",
    "Reprogramado",
    "Total General",
    "Efectividad"
  ]];

  let totalFinalizadas = 0;
  let totalGeneral = 0;

  registros.forEach((r, i) => {
    const usuario = r.usuario || "ADMIN";
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    const fecha = actualizadoAlManual || "";

    const finalizada = Number(r.finalizada) || 0;
    const cancelada = Number(r.cancelada) || 0;
    const regestion = Number(r.regestion) || 0;
    const reprogramado = Number(r.reprogramado) || 0;
    const total = Number(r.total) || 0;

    if (!cuadrilla || total === 0) return;

    const efectividad = finalizada / total;
    const id = cuadrilla + "|" + periodoManual + "|" + (i + 1);

    salida.push([
      id,
      usuario,
      cuadrilla,
      fecha,
      finalizada,
      cancelada,
      regestion,
      reprogramado,
      total,
      efectividad
    ]);

    totalFinalizadas += finalizada;
    totalGeneral += total;
  });

  if (salida.length <= 1) {
    throw new Error("No se encontraron registros válidos");
  }

  const periodo = periodoManual || "";
  const actualizadoAl = actualizadoAlManual || "";

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 10, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "EFECTIVIDAD",
    registros: salida.length - 1,
    periodo: periodo,
    actualizadoAl: actualizadoAl,
    promedio: totalGeneral > 0 ? totalFinalizadas / totalGeneral : 0
  };
}

/* =========================
   RECABLEADO
   Incluye en cero cuadrillas que no aparecen
   tomando como base EFECTIVIDAD
========================= */

function procesarRecableado(registros, periodoManual, actualizadoAlManual) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_RECABLEADO);

  if (!hoja) throw new Error("No existe la hoja PORCENTAJE REC");

  const baseEfectividad = leerBaseEfectividad();

  if (baseEfectividad.length === 0) {
    throw new Error("No hay base de EFECTIVIDAD para completar cuadrillas en cero");
  }

  const mapa = {};

  (registros || []).forEach(r => {
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    if (!cuadrilla) return;

    mapa[cuadrilla] = {
      totalRojo: Number(r.rojoAsignadas || r.total || r.totalRojo || r.losRojoAsignadas) || 0,
      recableados: Number(r.recableados || r.recableado) || 0
    };
  });

  const salida = [[
    "ID",
    "Usuario",
    "Cuadrilla",
    "ACTUALIZACION",
    "los rojo asignadas",
    "Recableados",
    "PORCENTAJE"
  ]];

  let totalRojo = 0;
  let totalRecableados = 0;

  baseEfectividad.forEach((base, i) => {
    const dato = mapa[base.cuadrilla] || { totalRojo: 0, recableados: 0 };
    const rojoAsignadas = Number(dato.totalRojo) || 0;
    const recableados = Number(dato.recableados) || 0;
    const porcentaje = rojoAsignadas > 0 ? recableados / rojoAsignadas : 0;
    const id = base.cuadrilla + "|" + periodoManual + "|" + (i + 1);

    salida.push([
      id,
      base.usuario,
      base.cuadrilla,
      actualizadoAlManual || "",
      rojoAsignadas,
      recableados,
      porcentaje
    ]);

    totalRojo += rojoAsignadas;
    totalRecableados += recableados;
  });

  const periodo = periodoManual || "";
  const actualizadoAl = actualizadoAlManual || "";
  const promedio = totalRojo > 0 ? totalRecableados / totalRojo : 0;

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 7, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "RECABLEADO",
    registros: salida.length - 1,
    periodo: periodo,
    actualizadoAl: actualizadoAl,
    totalRojo: totalRojo,
    totalRecableados: totalRecableados,
    promedio: promedio
  };
}

/* =========================
   VTR / GAR
   La cantidad pegada se toma como VTR/GAR.
   GAR queda en 0 por ahora.
   Finalizadas se toman desde EFECTIVIDAD.
   Cuadrillas no pegadas quedan en 0.
========================= */

function procesarVtrGar(registros, periodoManual, actualizadoAlManual) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_VTRGAR);

  if (!hoja) throw new Error("No existe la hoja POR VTR/GAR");

  const baseEfectividad = leerBaseEfectividad();

  if (baseEfectividad.length === 0) {
    throw new Error("No hay base de EFECTIVIDAD para calcular VTR/GAR");
  }

  const mapa = {};

  (registros || []).forEach(r => {
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    if (!cuadrilla) return;

    const gar = Number(r.gar) || 0;
    const vtr = Number(r.vtr || r.vtrgar || r.total || r.cantidad) || 0;

    if (!mapa[cuadrilla]) {
      mapa[cuadrilla] = { gar: 0, vtr: 0 };
    }

    mapa[cuadrilla].gar += gar;
    mapa[cuadrilla].vtr += vtr;
  });

  const salida = [[
    "ID",
    "Usuario",
    "Cuadrilla",
    "ACTUALIZACION",
    "Total Ordenes FINALIZADAS",
    "GAR",
    "VTR",
    "TOTAL GAR/VTR",
    "% VTR/GAR"
  ]];

  let totalFinalizadas = 0;
  let totalGar = 0;
  let totalVtr = 0;
  let totalVtrGar = 0;

  baseEfectividad.forEach((base, i) => {
    const dato = mapa[base.cuadrilla] || { gar: 0, vtr: 0 };
    const finalizadas = Number(base.finalizadas) || 0;
    const gar = Number(dato.gar) || 0;
    const vtr = Number(dato.vtr) || 0;
    const total = gar + vtr;
    const porcentaje = finalizadas > 0 ? total / finalizadas : 0;
    const id = base.cuadrilla + "|" + periodoManual + "|" + (i + 1);

    salida.push([
      id,
      base.usuario,
      base.cuadrilla,
      actualizadoAlManual || "",
      finalizadas,
      gar,
      vtr,
      total,
      porcentaje
    ]);

    totalFinalizadas += finalizadas;
    totalGar += gar;
    totalVtr += vtr;
    totalVtrGar += total;
  });

  const periodo = periodoManual || "";
  const actualizadoAl = actualizadoAlManual || "";
  const promedio = totalFinalizadas > 0 ? totalVtrGar / totalFinalizadas : 0;

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 9, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "VTR/GAR",
    registros: salida.length - 1,
    periodo: periodo,
    actualizadoAl: actualizadoAl,
    totalFinalizadas: totalFinalizadas,
    totalGar: totalGar,
    totalVtr: totalVtr,
    totalVtrGar: totalVtrGar,
    promedio: promedio
  };
}

/* =========================
   EFECTIVIDAD MODO ANTERIOR
   Se mantiene por seguridad
========================= */

function actualizarEfectividad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_EFECTIVIDAD);

  if (!hoja) throw new Error("No existe la hoja EFECTIVIDAD");

  const datos = hoja.getDataRange().getValues();

  if (datos.length < 2) {
    throw new Error("La hoja EFECTIVIDAD no tiene datos");
  }

  const salida = [[
    "ID",
    "Usuario",
    "Cuadrilla",
    "ACTUALIZACION",
    "Finalizada",
    "Cancelada",
    "Regestión",
    "Reprogramado",
    "Total General",
    "Efectividad"
  ]];

  let totalFinalizadas = 0;
  let totalGeneral = 0;
  let fechaMasReciente = null;

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    const id = fila[0] || i;
    const usuario = fila[1];
    const cuadrilla = normalizarCuadrilla(fila[2]);
    const fecha = fila[3];

    const finalizada = Number(fila[4]) || 0;
    const cancelada = Number(fila[5]) || 0;
    const regestion = Number(fila[6]) || 0;
    const reprogramado = Number(fila[7]) || 0;
    const total = Number(fila[8]) || 0;

    if (!usuario || !cuadrilla || total === 0) continue;

    if (fecha instanceof Date) {
      if (fechaMasReciente === null || fecha > fechaMasReciente) {
        fechaMasReciente = fecha;
      }
    }

    const efectividad = finalizada / total;

    salida.push([
      id,
      usuario,
      cuadrilla,
      fecha,
      finalizada,
      cancelada,
      regestion,
      reprogramado,
      total,
      efectividad
    ]);

    totalFinalizadas += finalizada;
    totalGeneral += total;
  }

  const periodo = fechaMasReciente ? obtenerMes(fechaMasReciente) : "";
  const actualizadoAl = fechaMasReciente ? formatearFecha(fechaMasReciente) : "";

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);

  if (salida.length > 1) {
    hoja.getRange(2, 10, salida.length - 1, 1).setNumberFormat("0.00%");
  }

  return {
    ok: true,
    modulo: "EFECTIVIDAD",
    registros: salida.length - 1,
    periodo: periodo,
    actualizadoAl: actualizadoAl,
    promedio: totalGeneral > 0 ? totalFinalizadas / totalGeneral : 0
  };
}

/* =========================
   API PRINCIPAL
========================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.accion === "procesarEfectividad") {
      return responderJSON(procesarEfectividad(
        data.registros,
        data.periodo,
        data.actualizadoAl
      ));
    }

    if (data.accion === "procesarRecableado") {
      return responderJSON(procesarRecableado(
        data.registros,
        data.periodo,
        data.actualizadoAl
      ));
    }

    if (data.accion === "procesarVtrGar") {
      return responderJSON(procesarVtrGar(
        data.registros,
        data.periodo,
        data.actualizadoAl
      ));
    }

    if (data.accion === "actualizarEfectividad") {
      return responderJSON(actualizarEfectividad());
    }

    return responderJSON(procesarProduccion(data));

  } catch (err) {
    return responderJSON({
      ok: false,
      error: err.toString()
    });
  }
}
