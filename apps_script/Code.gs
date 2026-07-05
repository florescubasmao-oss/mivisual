const HOJA_PRODUCCION = "PRODUCCION_APP";
const HOJA_EFECTIVIDAD = "EFECTIVIDAD";
const HOJA_RECABLEADO = "POR RECABLEADO";

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
    const fecha = actualizadoAlManual || r.fecha || "";

    const finalizada = Number(r.finalizada) || 0;
    const cancelada = Number(r.cancelada) || 0;
    const regestion = Number(r.regestion) || 0;
    const reprogramado = Number(r.reprogramado) || 0;
    const total = Number(r.total) || 0;

    if (!cuadrilla || total === 0) return;

    const efectividad = finalizada / total;
    const id = cuadrilla + "|" + (periodoManual || "") + "|" + (i + 1);

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
========================= */

function procesarRecableado(registros, periodoManual, actualizadoAlManual) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_RECABLEADO);

  if (!hoja) throw new Error("No existe la hoja POR RECABLEADO");

  if (!registros || registros.length === 0) {
    throw new Error("No se recibieron registros de recableado");
  }

  const salida = [[
    "ID",
    "Usuario",
    "Cuadrilla",
    "ACTUALIZACION",
    "los rojo asignadas",
    "Recableados",
    "PORCENTAJE"
  ]];

  let totalRojoGeneral = 0;
  let totalRecableados = 0;

  registros.forEach((r, i) => {
    const usuario = r.usuario || "ADMIN";
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    const fecha = actualizadoAlManual || "";

    const totalRojo = Number(r.totalRojo) || 0;
    const recableados = Number(r.recableados) || 0;

    if (!cuadrilla || totalRojo === 0) return;

    const porcentaje = recableados / totalRojo;
    const id = cuadrilla + "|" + (periodoManual || "") + "|" + (i + 1);

    salida.push([
      id,
      usuario,
      cuadrilla,
      fecha,
      totalRojo,
      recableados,
      porcentaje
    ]);

    totalRojoGeneral += totalRojo;
    totalRecableados += recableados;
  });

  if (salida.length <= 1) {
    throw new Error("No se encontraron registros válidos de recableado");
  }

  const periodo = periodoManual || "";
  const actualizadoAl = actualizadoAlManual || "";

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 7, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "RECABLEADO",
    registros: salida.length - 1,
    periodo: periodo,
    actualizadoAl: actualizadoAl,
    promedio: totalRojoGeneral > 0 ? totalRecableados / totalRojoGeneral : 0
  };
}

/* =========================
   EFECTIVIDAD MODO ANTERIOR
========================= */

function actualizarEfectividad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_EFECTIVIDAD);

  if (!hoja) throw new Error("No existe la hoja EFECTIVIDAD");

  const datos = hoja.getDataRange().getValues();

  if (datos.length < 2) {
    throw new Error("La hoja EFECTIVIDAD no tiene datos");
  }

  const registros = [];

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    registros.push({
      usuario: fila[1],
      cuadrilla: fila[2],
      fecha: fila[3],
      finalizada: fila[4],
      cancelada: fila[5],
      regestion: fila[6],
      reprogramado: fila[7],
      total: fila[8]
    });
  }

  return procesarEfectividad(registros, "", "");
}

/* =========================
   API PRINCIPAL
========================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.accion === "procesarEfectividad") {
      const respuesta = procesarEfectividad(
        data.registros,
        data.periodo,
        data.actualizadoAl
      );

      return ContentService
        .createTextOutput(JSON.stringify(respuesta))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "procesarRecableado") {
      const respuesta = procesarRecableado(
        data.registros,
        data.periodo,
        data.actualizadoAl
      );

      return ContentService
        .createTextOutput(JSON.stringify(respuesta))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "actualizarEfectividad") {
      const respuesta = actualizarEfectividad();

      return ContentService
        .createTextOutput(JSON.stringify(respuesta))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const respuesta = procesarProduccion(data);

    return ContentService
      .createTextOutput(JSON.stringify(respuesta))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
