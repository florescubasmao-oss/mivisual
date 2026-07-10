const HOJA_PRODUCCION = "PRODUCCION_APP";
const HOJA_CATALOGO_ORDENES = "CATALOGO_ORDENES";
const HOJA_EFECTIVIDAD = "EFECTIVIDAD";
const HOJA_RECABLEADO = "PORCENTAJE REC";
const HOJA_VTRGAR = "POR VTR/GAR";
const HOJA_USUARIOS = "USUARIOS";
const HOJA_RANKING = "RANKING";
const HOJA_OBSERVACIONES = "OBSERVACIONES";
const HOJA_RESUMEN_OBSERVACIONES = "RESUMEN_OBSERVACIONES";
const CARPETA_EVIDENCIAS_OBSERVACIONES = "1W23rJjyUgmYGTlG2NzrpvasIWbwKBV6h";
const HOJA_ACTIVIDAD_CAMPO = "ACTIVIDAD_CAMPO";
const CARPETA_ACTIVIDAD_CAMPO = "1tu6DWyOkM0b-W1nI_MIXGuTmlZypjsBV";
const HOJA_VALIDACION_TECNICA = "VALIDACION_TECNICA";
const HOJA_ACTAS_ESCANEADAS = "ACTAS_ESCANEADAS";
const HOJA_ANALISIS_ECONOMICO = "ANALISIS_ECONOMICO";
const CARPETA_ACTAS_ESCANEADAS = "1EZALuMsXo_ZRO93FjKyuDgRmvAe2C69L";

function doGet() {
  return ContentService
    .createTextOutput("MI VISUAL API OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* =========================
   FUNCIONES GENERALES
========================= */

function obtenerHoja(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error("No existe la hoja " + nombre);
  return hoja;
}

function normalizarCuadrilla(nombre) {
  return (nombre || "")
    .toString()
    .replace(/^P\s+(\d+)/i, "P$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTexto(txt) {
  return (txt || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarFecha(fecha) {
  if (fecha instanceof Date) {
    return Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyyMMdd");
  }

  const partes = fecha.toString().split("/");
  if (partes.length === 3) {
    return partes[2] + partes[1].padStart(2, "0") + partes[0].padStart(2, "0");
  }

  return fecha.toString();
}

function generarID(cuadrilla, fecha, codigo) {
  return normalizarCuadrilla(cuadrilla) + "|" + normalizarFecha(fecha) + "|" + codigo.toString().trim();
}

function respuestaJson(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizarUsuario(txt) {
  return normalizarTexto(txt).replace(/\s+/g, "");
}

function formatearFechaArchivo(fecha) {
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyyMMdd");
}

function obtenerPeriodoActual(fecha) {
  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];
  return meses[fecha.getMonth()] + " " + fecha.getFullYear();
}

/* =========================
   PRODUCCIÓN
========================= */

function procesarProduccion(registros) {
  const hoja = obtenerHoja(HOJA_PRODUCCION);

  if (!Array.isArray(registros)) {
    throw new Error("Producción no recibió una lista válida");
  }

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
    nuevos,
    actualizados
  };
}

/* =========================
   EFECTIVIDAD
========================= */

function procesarEfectividad(registros, periodoManual, actualizadoAlManual) {
  const hoja = obtenerHoja(HOJA_EFECTIVIDAD);

  if (!Array.isArray(registros) || registros.length === 0) {
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
    throw new Error("No se encontraron registros válidos de efectividad");
  }

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 10, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "EFECTIVIDAD",
    registros: salida.length - 1,
    periodo: periodoManual || "",
    actualizadoAl: actualizadoAlManual || "",
    promedio: totalGeneral > 0 ? totalFinalizadas / totalGeneral : 0
  };
}

/* =========================
   BASE EFECTIVIDAD
========================= */

function obtenerBaseEfectividad() {
  const hoja = obtenerHoja(HOJA_EFECTIVIDAD);
  const datos = hoja.getDataRange().getValues();
  const lista = [];
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const usuario = fila[1] || "ADMIN";
    const cuadrilla = normalizarCuadrilla(fila[2]);
    const finalizadas = Number(fila[4]) || 0;

    if (!cuadrilla) continue;
    if (mapa[cuadrilla]) continue;

    const item = { usuario, cuadrilla, finalizadas };
    lista.push(item);
    mapa[cuadrilla] = item;
  }

  return { lista, mapa };
}

/* =========================
   RECABLEADO
========================= */

function procesarRecableado(registros, periodoManual, actualizadoAlManual) {
  const hoja = obtenerHoja(HOJA_RECABLEADO);

  if (!Array.isArray(registros) || registros.length === 0) {
    throw new Error("No se recibieron registros de recableado");
  }

  const baseEfectividad = obtenerBaseEfectividad();
  const baseLista = baseEfectividad.lista;
  const mapaRecableado = {};

  registros.forEach(r => {
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    if (!cuadrilla) return;

    mapaRecableado[cuadrilla] = {
      usuario: r.usuario || "ADMIN",
      rojoAsignadas: Number(r.rojoAsignadas || r.total || r.totalRojo || r.losRojoAsignadas) || 0,
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

  const filasBase = baseLista.length > 0
    ? baseLista
    : Object.keys(mapaRecableado).map(c => ({ usuario: "ADMIN", cuadrilla: c }));

  filasBase.forEach((b, i) => {
    const cuadrilla = normalizarCuadrilla(b.cuadrilla);
    const datos = mapaRecableado[cuadrilla] || {};

    const usuario = b.usuario || datos.usuario || "ADMIN";
    const fecha = actualizadoAlManual || "";
    const rojoAsignadas = Number(datos.rojoAsignadas) || 0;
    const recableados = Number(datos.recableados) || 0;
    const porcentaje = rojoAsignadas > 0 ? recableados / rojoAsignadas : 0;
    const id = cuadrilla + "|" + periodoManual + "|" + (i + 1);

    salida.push([
      id,
      usuario,
      cuadrilla,
      fecha,
      rojoAsignadas,
      recableados,
      porcentaje
    ]);

    totalRojo += rojoAsignadas;
    totalRecableados += recableados;
  });

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 7, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "RECABLEADO",
    registros: salida.length - 1,
    periodo: periodoManual || "",
    actualizadoAl: actualizadoAlManual || "",
    totalRojo,
    totalRecableados,
    promedio: totalRojo > 0 ? totalRecableados / totalRojo : 0
  };
}

/* =========================
   VTR/GAR
========================= */

function convertirRegistrosVtrGar(registros) {
  const mapa = {};

  if (!Array.isArray(registros)) {
    throw new Error("VTR/GAR no recibió una lista válida");
  }

  registros.forEach(r => {
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    if (!cuadrilla) return;

    mapa[cuadrilla] = {
      usuario: r.usuario || "ADMIN",
      gar: Number(r.gar) || 0,
      vtr: Number(r.vtr) || 0
    };
  });

  return mapa;
}

function procesarVtrGar(registros, periodoManual, actualizadoAlManual) {
  const hoja = obtenerHoja(HOJA_VTRGAR);

  const baseEfectividad = obtenerBaseEfectividad();
  const baseLista = baseEfectividad.lista;

  if (baseLista.length === 0) {
    throw new Error("La hoja EFECTIVIDAD no tiene cuadrillas para calcular VTR/GAR");
  }

  const mapaVtrGar = convertirRegistrosVtrGar(registros);

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
  let totalGarVtr = 0;

  baseLista.forEach((b, i) => {
    const cuadrilla = normalizarCuadrilla(b.cuadrilla);
    const datos = mapaVtrGar[cuadrilla] || {};

    const usuario = b.usuario || datos.usuario || "ADMIN";
    const fecha = actualizadoAlManual || "";
    const finalizadas = Number(b.finalizadas) || 0;
    const gar = Number(datos.gar) || 0;
    const vtr = Number(datos.vtr) || 0;
    const total = gar + vtr;
    const porcentaje = finalizadas > 0 ? total / finalizadas : 0;
    const id = cuadrilla + "|" + periodoManual + "|" + (i + 1);

    salida.push([
      id,
      usuario,
      cuadrilla,
      fecha,
      finalizadas,
      gar,
      vtr,
      total,
      porcentaje
    ]);

    totalFinalizadas += finalizadas;
    totalGar += gar;
    totalVtr += vtr;
    totalGarVtr += total;
  });

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
  hoja.getRange(2, 9, salida.length - 1, 1).setNumberFormat("0.00%");

  return {
    ok: true,
    modulo: "VTR/GAR",
    registros: salida.length - 1,
    periodo: periodoManual || "",
    actualizadoAl: actualizadoAlManual || "",
    totalFinalizadas,
    gar: totalGar,
    vtr: totalVtr,
    totalGarVtr,
    totalVtrGar: totalGarVtr,
    promedio: totalFinalizadas > 0 ? totalGarVtr / totalFinalizadas : 0
  };
}

/* =========================
   USUARIOS
========================= */

function encabezadoUsuarios() {
  return [[
    "Usuario",
    "Correo",
    "Clave",
    "Cuadrilla",
    "Sede",
    "Plataforma",
    "Perfil",
    "Nivel de Acceso",
    "Estado",
    "UsuarioSupervisor"
  ]];
}

function procesarUsuarios(registros) {
  const hoja = obtenerHoja(HOJA_USUARIOS);

  if (!Array.isArray(registros) || registros.length === 0) {
    throw new Error("No se recibieron registros de usuarios");
  }

  const salida = encabezadoUsuarios();

  registros.forEach(r => {
    const usuario = normalizarTexto(r.usuario).replace(/\s+/g, "");
    const correo = (r.correo || "").toString().trim();
    const clave = (r.clave || "").toString().trim();
    const cuadrilla = normalizarCuadrilla(r.cuadrilla);
    const sede = normalizarTexto(r.sede);
    const plataforma = normalizarTexto(r.plataforma);
    const perfil = normalizarTexto(r.perfil || "TECNICO");
    const nivelAcceso = normalizarTexto(r.nivelAcceso || r["nivel de acceso"] || "CUADRILLA");
    const estado = normalizarTexto(r.estado || "ACTIVO");
    const usuarioSupervisor = normalizarTexto(r.usuarioSupervisor || "");

    if (!usuario) return;

    salida.push([
      usuario,
      correo,
      clave,
      cuadrilla,
      sede,
      plataforma,
      perfil,
      nivelAcceso,
      estado,
      usuarioSupervisor
    ]);
  });

  if (salida.length <= 1) {
    throw new Error("No se encontraron usuarios válidos");
  }

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);

  return {
    ok: true,
    modulo: "USUARIOS",
    accion: "IMPORTAR",
    registros: salida.length - 1
  };
}

function buscarFilaUsuario(usuarioBuscar) {
  const hoja = obtenerHoja(HOJA_USUARIOS);
  const datos = hoja.getDataRange().getValues();
  const usuarioNormalizado = normalizarTexto(usuarioBuscar).replace(/\s+/g, "");

  for (let i = 1; i < datos.length; i++) {
    const usuario = normalizarTexto(datos[i][0]).replace(/\s+/g, "");
    if (usuario === usuarioNormalizado) {
      return {
        hoja,
        fila: i + 1,
        datos: datos[i]
      };
    }
  }

  throw new Error("No se encontró el usuario: " + usuarioBuscar);
}

function editarUsuario(usuarioBuscar, cambios) {
  const encontrado = buscarFilaUsuario(usuarioBuscar);
  const hoja = encontrado.hoja;
  const fila = encontrado.fila;
  const actual = encontrado.datos;

  const nuevo = [
    cambios.usuario ? normalizarTexto(cambios.usuario).replace(/\s+/g, "") : actual[0],
    cambios.correo !== undefined ? cambios.correo : actual[1],
    cambios.clave !== undefined ? cambios.clave : actual[2],
    cambios.cuadrilla !== undefined ? normalizarCuadrilla(cambios.cuadrilla) : actual[3],
    cambios.sede !== undefined ? normalizarTexto(cambios.sede) : actual[4],
    cambios.plataforma !== undefined ? normalizarTexto(cambios.plataforma) : actual[5],
    cambios.perfil !== undefined ? normalizarTexto(cambios.perfil) : actual[6],
    cambios.nivelAcceso !== undefined ? normalizarTexto(cambios.nivelAcceso) : actual[7],
    cambios.estado !== undefined ? normalizarTexto(cambios.estado) : actual[8],
    cambios.usuarioSupervisor !== undefined ? normalizarTexto(cambios.usuarioSupervisor) : actual[9]
  ];

  hoja.getRange(fila, 1, 1, 10).setValues([nuevo]);

  return {
    ok: true,
    modulo: "USUARIOS",
    accion: "EDITAR",
    usuario: nuevo[0]
  };
}

function cambiarClave(usuarioBuscar, nuevaClave) {
  if (!nuevaClave) throw new Error("La nueva clave no puede estar vacía");
  return editarUsuario(usuarioBuscar, { clave: nuevaClave });
}

function cambiarEstadoUsuario(usuarioBuscar, estadoNuevo) {
  const estado = normalizarTexto(estadoNuevo);

  if (!["ACTIVO", "SUSPENDIDO", "BAJA"].includes(estado)) {
    throw new Error("Estado no válido. Usa ACTIVO, SUSPENDIDO o BAJA");
  }

  return editarUsuario(usuarioBuscar, { estado });
}

function cambiarPermisoUsuario(usuarioBuscar, perfilNuevo, nivelNuevo) {
  const perfil = normalizarTexto(perfilNuevo);
  const nivel = normalizarTexto(nivelNuevo);

  if (!["TECNICO", "SUPERVISOR", "JEFATURA", "ADMIN", "ADMINISTRADOR", "ALMACEN", "JEFATURA ALMACEN"].includes(perfil)) {
    throw new Error("Perfil no válido");
  }

  if (!["CUADRILLA", "SEDE", "ZONA", "ZONA NORTE", "ADMIN"].includes(nivel)) {
    throw new Error("Nivel de acceso no válido");
  }

  return editarUsuario(usuarioBuscar, {
    perfil,
    nivelAcceso: nivel
  });
}

function listarUsuarios() {
  const hoja = obtenerHoja(HOJA_USUARIOS);
  const datos = hoja.getDataRange().getValues();

  const usuarios = [];

  for (let i = 1; i < datos.length; i++) {
    usuarios.push({
      usuario: datos[i][0],
      correo: datos[i][1],
      clave: datos[i][2],
      cuadrilla: datos[i][3],
      sede: datos[i][4],
      plataforma: datos[i][5],
      perfil: datos[i][6],
      nivelAcceso: datos[i][7],
      estado: datos[i][8],
      usuarioSupervisor: datos[i][9]
    });
  }

  return {
    ok: true,
    modulo: "USUARIOS",
    usuarios
  };
}

function listarCuadrillasObservacion(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  const mapaUsuarios = obtenerMapaUsuarios();
  const lista = [];
  const vistos = {};

  Object.keys(mapaUsuarios).forEach(cuadrilla => {
    const item = mapaUsuarios[cuadrilla];
    const cuad = normalizarCuadrilla(cuadrilla);
    if (!cuad || vistos[cuad]) return;

    const estado = normalizarTexto(item.estado || "ACTIVO");
    if (estado && estado !== "ACTIVO") return;

    if (usuario.perfil === "SUPERVISOR") {
      if (normalizarTexto(item.sede) !== normalizarTexto(usuario.sede)) return;
    } else if (usuario.perfil === "TECNICO") {
      if (normalizarCuadrilla(usuario.cuadrilla) !== cuad) return;
    } else if (!esPerfilJefatura(usuario.perfil)) {
      return;
    }

    lista.push({
      cuadrilla: cuad,
      sede: item.sede,
      plataforma: item.plataforma,
      supervisor: item.usuarioSupervisor
    });

    vistos[cuad] = true;
  });

  lista.sort((a, b) => {
    const sedeA = (a.sede || "").localeCompare(b.sede || "");
    if (sedeA !== 0) return sedeA;
    return (a.cuadrilla || "").localeCompare(b.cuadrilla || "");
  });

  return {
    ok: true,
    modulo: "OBSERVACIONES",
    accion: "LISTAR_CUADRILLAS",
    perfil: usuario.perfil,
    sede: usuario.sede,
    registros: lista.length,
    cuadrillas: lista
  };
}




/* =========================
   OBSERVACIONES
========================= */

function encabezadoObservaciones() {
  return [[
    "ID",
    "FECHA DE REGISTRO",
    "PERIODO",
    "Registrado Por",
    "Perfil Registro",
    "Sede",
    "Plataforma",
    "Supervisor",
    "Cuadrilla",
    "Fuente",
    "Código",
    "Tipo Observación",
    "Descripción",
    "Estado",
    "Monto",
    "Fecha Descargo",
    "Descargo Técnico",
    "Evidencia Técnico",
    "Fecha Revisión",
    "Plazo"
  ]];
}

function asegurarHojaObservaciones() {
  const hoja = obtenerHoja(HOJA_OBSERVACIONES);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, 20).setValues(encabezadoObservaciones());
  }
  return hoja;
}

function generarIdObservacion() {
  return "OBS-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
}

function limpiarNombreArchivo(txt) {
  return (txt || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function obtenerUsuarioApp(usuarioBuscar) {
  const hoja = obtenerHoja(HOJA_USUARIOS);
  const datos = hoja.getDataRange().getValues();
  const usuarioNormalizado = normalizarUsuario(usuarioBuscar);

  for (let i = 1; i < datos.length; i++) {
    const usuario = normalizarUsuario(datos[i][0]);
    if (usuario === usuarioNormalizado) {
      return {
        usuario,
        correo: datos[i][1],
        clave: datos[i][2],
        cuadrilla: normalizarCuadrilla(datos[i][3]),
        sede: normalizarTexto(datos[i][4]),
        plataforma: normalizarTexto(datos[i][5]),
        perfil: normalizarTexto(datos[i][6]),
        nivelAcceso: normalizarTexto(datos[i][7]),
        estado: normalizarTexto(datos[i][8]),
        usuarioSupervisor: normalizarUsuario(datos[i][9])
      };
    }
  }

  throw new Error("No se encontró el usuario: " + usuarioBuscar);
}

function esPerfilJefatura(perfil) {
  const p = normalizarTexto(perfil);
  return p === "JEFATURA" || p === "ADMIN" || p === "ADMINISTRADOR";
}

function obtenerDatosCuadrillaApp(cuadrillaBuscar) {
  const mapa = obtenerMapaUsuarios();
  const cuadrilla = normalizarCuadrilla(cuadrillaBuscar);
  if (!mapa[cuadrilla]) throw new Error("No se encontró la cuadrilla en USUARIOS: " + cuadrillaBuscar);
  return mapa[cuadrilla];
}


function autorizarDriveObservaciones() {
  const carpeta = DriveApp.getFolderById(CARPETA_EVIDENCIAS_OBSERVACIONES);
  return {
    ok: true,
    carpeta: carpeta.getName(),
    url: carpeta.getUrl()
  };
}

function guardarEvidenciaObservacion(cuadrilla, codigo, evidenciaBase64, evidenciaNombre, evidenciaMimeType, indice) {
  if (!evidenciaBase64) return "";

  const carpeta = DriveApp.getFolderById(CARPETA_EVIDENCIAS_OBSERVACIONES);
  const extension = evidenciaNombre && evidenciaNombre.indexOf(".") >= 0
    ? evidenciaNombre.split(".").pop().toLowerCase()
    : "jpg";

  const correlativo = indice ? "_" + String(indice).padStart(2, "0") : "";
  const nombreArchivo = limpiarNombreArchivo(cuadrilla) + "_" +
    limpiarNombreArchivo(codigo) + "_" +
    formatearFechaArchivo(new Date()) + correlativo + "." + extension;

  const bytes = Utilities.base64Decode(evidenciaBase64);
  const blob = Utilities.newBlob(bytes, evidenciaMimeType || "image/jpeg", nombreArchivo);
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}

function guardarEvidenciasObservacion(cuadrilla, codigo, evidencias) {
  if (!Array.isArray(evidencias) || evidencias.length === 0) return "";
  if (evidencias.length > 5) throw new Error("Solo se permite subir máximo 5 fotos");

  const links = [];
  evidencias.forEach((ev, i) => {
    if (!ev || !ev.base64) return;
    const link = guardarEvidenciaObservacion(
      cuadrilla,
      codigo,
      ev.base64,
      ev.nombre || ("evidencia_" + (i + 1) + ".jpg"),
      ev.mime || "image/jpeg",
      i + 1
    );
    if (link) links.push(link);
  });

  return links.join("|");
}
function registrarObservacion(data) {
  const hoja = asegurarHojaObservaciones();
  const usuarioRegistro = obtenerUsuarioApp(data.usuario);

  if (!(usuarioRegistro.perfil === "SUPERVISOR" || esPerfilJefatura(usuarioRegistro.perfil))) {
    throw new Error("Solo Supervisor o Jefatura pueden registrar observaciones");
  }

  const cuadrilla = normalizarCuadrilla(data.cuadrilla);
  const datosCuadrilla = obtenerDatosCuadrillaApp(cuadrilla);

  if (usuarioRegistro.perfil === "SUPERVISOR" && usuarioRegistro.sede !== datosCuadrilla.sede) {
    throw new Error("Supervisor solo puede registrar observaciones de su sede");
  }

  const fuente = normalizarTexto(data.fuente);
  const tipo = normalizarTexto(data.tipoObservacion || data.tipo);
  const estado = normalizarTexto(data.estado || "DERIVADO");

  if (!["WIN", "VISUAL"].includes(fuente)) throw new Error("Fuente no válida. Usa WIN o VISUAL");
  if (!["SEGURIDAD", "IMPLEMENTACION", "IMPLEMENTACIÓN", "GESTION TECNICA", "GESTIÓN TÉCNICA"].includes(tipo)) throw new Error("Tipo de observación no válido");
  if (!["DERIVADO", "EN PROCESO", "PENALIZADO", "APELADO", "SUBSANADO", "ANULADO"].includes(estado)) throw new Error("Estado no válido");

  const ahora = new Date();
  const plazo = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
  const id = generarIdObservacion();

  hoja.appendRow([
    id,
    ahora,
    obtenerPeriodoActual(ahora),
    usuarioRegistro.usuario,
    usuarioRegistro.perfil,
    datosCuadrilla.sede,
    datosCuadrilla.plataforma,
    datosCuadrilla.usuarioSupervisor,
    cuadrilla,
    fuente,
    data.codigo || "",
    tipo,
    data.descripcion || "",
    estado,
    Number(data.monto) || 0,
    "",
    "",
    "",
    "",
    plazo
  ]);

  const fila = hoja.getLastRow();
  hoja.getRange(fila, 2).setNumberFormat("dd/mm/yyyy hh:mm");
  hoja.getRange(fila, 15).setNumberFormat('"S/ "0.00');
  hoja.getRange(fila, 20).setNumberFormat("dd/mm/yyyy hh:mm");

  actualizarResumenObservaciones();
  actualizarRanking();

  return { ok: true, modulo: "OBSERVACIONES", accion: "REGISTRAR", id };
}

function listarObservaciones(data) {
  const hoja = asegurarHojaObservaciones();
  const datos = hoja.getDataRange().getValues();
  const usuario = obtenerUsuarioApp(data.usuario);
  const lista = [];

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const item = {
      id: fila[0],
      fechaRegistro: fila[1],
      periodo: fila[2],
      registradoPor: fila[3],
      perfilRegistro: fila[4],
      sede: fila[5],
      plataforma: fila[6],
      supervisor: fila[7],
      cuadrilla: fila[8],
      fuente: fila[9],
      codigo: fila[10],
      tipoObservacion: fila[11],
      descripcion: fila[12],
      estado: fila[13],
      monto: fila[14],
      fechaDescargo: fila[15],
      descargoTecnico: fila[16],
      evidenciaTecnico: fila[17],
      fechaRevision: fila[18],
      plazo: fila[19]
    };

    let permitir = false;
    if (usuario.perfil === "TECNICO") permitir = normalizarCuadrilla(usuario.cuadrilla) === normalizarCuadrilla(item.cuadrilla);
    if (usuario.perfil === "SUPERVISOR") permitir = normalizarTexto(usuario.sede) === normalizarTexto(item.sede);
    if (esPerfilJefatura(usuario.perfil)) permitir = true;
    if (!permitir) continue;

    if (data.estado && normalizarTexto(data.estado) !== normalizarTexto(item.estado)) continue;
    if (data.fuente && normalizarTexto(data.fuente) !== normalizarTexto(item.fuente)) continue;
    if (data.sede && normalizarTexto(data.sede) !== normalizarTexto(item.sede)) continue;

    lista.push(item);
  }

  return { ok: true, modulo: "OBSERVACIONES", accion: "LISTAR", registros: lista.length, observaciones: lista };
}

function buscarFilaObservacion(id) {
  const hoja = obtenerHoja(HOJA_OBSERVACIONES);
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if ((datos[i][0] || "").toString() === id.toString()) {
      return { hoja, fila: i + 1, datos: datos[i] };
    }
  }
  throw new Error("No se encontró la observación: " + id);
}

function registrarDescargo(data) {
  const encontrado = buscarFilaObservacion(data.id);
  const hoja = encontrado.hoja;
  const fila = encontrado.fila;
  const obs = encontrado.datos;
  const usuario = obtenerUsuarioApp(data.usuario);

  if (usuario.perfil !== "TECNICO") throw new Error("Solo el técnico puede registrar descargo");
  if (normalizarCuadrilla(usuario.cuadrilla) !== normalizarCuadrilla(obs[8])) throw new Error("El técnico solo puede descargar observaciones de su cuadrilla");

  let evidencias = [];

  if (Array.isArray(data.evidencias)) {
    evidencias = data.evidencias;
  } else if (data.evidenciaBase64) {
    evidencias = [{
      base64: data.evidenciaBase64,
      nombre: data.evidenciaNombre || "evidencia.jpg",
      mime: data.evidenciaMimeType || "image/jpeg"
    }];
  }

  if (evidencias.length > 5) throw new Error("Solo se permite subir máximo 5 fotos");

  const links = guardarEvidenciasObservacion(obs[8], obs[10], evidencias);
  const ahora = new Date();

  hoja.getRange(fila, 16).setValue(ahora);
  hoja.getRange(fila, 17).setValue(data.descargoTecnico || "");
  if (links) hoja.getRange(fila, 18).setValue(links);
  hoja.getRange(fila, 16).setNumberFormat("dd/mm/yyyy hh:mm");

  return { ok: true, modulo: "OBSERVACIONES", accion: "DESCARGO", id: data.id, evidencias: links };
}
function actualizarEstadoObservacion(data) {
  const encontrado = buscarFilaObservacion(data.id);
  const hoja = encontrado.hoja;
  const fila = encontrado.fila;
  const obs = encontrado.datos;
  const usuario = obtenerUsuarioApp(data.usuario);
  const nuevoEstado = normalizarTexto(data.estado);

  if (!["DERIVADO", "EN PROCESO", "PENALIZADO", "APELADO", "SUBSANADO", "ANULADO"].includes(nuevoEstado)) throw new Error("Estado no válido");

  const registradoPor = normalizarUsuario(obs[3]);
  const perfilRegistro = normalizarTexto(obs[4]);
  let puedeEditar = false;

  if (esPerfilJefatura(usuario.perfil)) puedeEditar = true;
  if (usuario.perfil === "SUPERVISOR" && perfilRegistro === "SUPERVISOR" && registradoPor === usuario.usuario && normalizarTexto(usuario.sede) === normalizarTexto(obs[5])) puedeEditar = true;

  if (!puedeEditar) throw new Error("No tienes permiso para cambiar el estado de esta observación");

  hoja.getRange(fila, 14).setValue(nuevoEstado);
  if (data.monto !== undefined && data.monto !== null && data.monto !== "") {
    hoja.getRange(fila, 15).setValue(Number(data.monto) || 0);
    hoja.getRange(fila, 15).setNumberFormat('"S/ "0.00');
  }

  const ahora = new Date();
  hoja.getRange(fila, 19).setValue(ahora);
  hoja.getRange(fila, 19).setNumberFormat("dd/mm/yyyy hh:mm");

  actualizarResumenObservaciones();
  actualizarRanking();

  return { ok: true, modulo: "OBSERVACIONES", accion: "CAMBIAR_ESTADO", id: data.id, estado: nuevoEstado };
}


/* =========================
   RESUMEN OBSERVACIONES
========================= */

function factorEstadoObservacion(estado) {
  const e = normalizarTexto(estado);

  if (e === "PENALIZADO") return 1;
  if (e === "EN PROCESO") return 1;
  if (e === "APELADO") return 1;
  if (e === "SUBSANADO") return 0.20;
  if (e === "ANULADO") return 0.20;

  return 1;
}

function actualizarResumenObservaciones() {
  const hojaObs = obtenerHoja(HOJA_OBSERVACIONES);
  const hojaResumen = obtenerHoja(HOJA_RESUMEN_OBSERVACIONES);

  const datos = hojaObs.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    const cuadrilla = normalizarCuadrilla(fila[8]);
    const estado = normalizarTexto(fila[13]);
    const monto = Number(fila[14]) || 0;

    if (!cuadrilla) continue;

    if (!mapa[cuadrilla]) {
      mapa[cuadrilla] = {
        cuadrilla,
        observaciones: 0,
        montoTotal: 0,
        montoAfectado: 0
      };
    }

    mapa[cuadrilla].observaciones++;
    mapa[cuadrilla].montoTotal += monto;
    mapa[cuadrilla].montoAfectado += monto * factorEstadoObservacion(estado);
  }

  const salida = [[
    "Cuadrilla",
    "Observaciones",
    "Monto Total",
    "Monto Afectado"
  ]];

  Object.keys(mapa)
    .sort()
    .forEach(c => {
      const item = mapa[c];
      salida.push([
        item.cuadrilla,
        item.observaciones,
        item.montoTotal,
        item.montoAfectado
      ]);
    });

  hojaResumen.clearContents();
  hojaResumen.getRange(1, 1, salida.length, salida[0].length).setValues(salida);

  if (salida.length > 1) {
    hojaResumen.getRange(2, 3, salida.length - 1, 2).setNumberFormat('"S/ "0.00');
  }

  return {
    ok: true,
    modulo: "RESUMEN_OBSERVACIONES",
    registros: salida.length - 1
  };
}

function obtenerResumenObservacionesPorCuadrilla() {
  const hoja = obtenerHoja(HOJA_RESUMEN_OBSERVACIONES);
  const datos = hoja.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const cuadrilla = normalizarCuadrilla(datos[i][0]);

    if (!cuadrilla) continue;

    mapa[cuadrilla] = {
      observaciones: Number(datos[i][1]) || 0,
      montoTotal: Number(datos[i][2]) || 0,
      montoAfectado: Number(datos[i][3]) || 0
    };
  }

  return mapa;
}

/* =========================
   RANKING
========================= */

function obtenerMapaUsuarios() {
  const hoja = obtenerHoja(HOJA_USUARIOS);
  const datos = hoja.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const usuario = normalizarTexto(fila[0]).replace(/\s+/g, "");
    const cuadrilla = normalizarCuadrilla(fila[3]);

    if (!cuadrilla) continue;

    mapa[cuadrilla] = {
      usuario,
      sede: normalizarTexto(fila[4]),
      plataforma: normalizarTexto(fila[5]),
      perfil: normalizarTexto(fila[6]),
      nivelAcceso: normalizarTexto(fila[7]),
      estado: normalizarTexto(fila[8]),
      usuarioSupervisor: normalizarTexto(fila[9])
    };
  }

  return mapa;
}

function numeroProduccion(valor) {
  if (typeof valor === "number") return valor;
  return Number((valor || "").toString().replace(",", ".")) || 0;
}

function obtenerCatalogoPuntajesProduccion() {
  const mapa = {};

  try {
    const hoja = obtenerHoja(HOJA_CATALOGO_ORDENES);
    const datos = hoja.getDataRange().getValues();

    for (let i = 1; i < datos.length; i++) {
      const codigo = (datos[i][0] || "").toString().trim();
      const tipo = normalizarTexto(datos[i][1] || "");
      const puntaje = numeroProduccion(datos[i][3]);

      if (codigo) mapa[codigo] = puntaje;
      if (tipo) mapa[tipo] = puntaje;
    }
  } catch (e) {
    // Si la hoja catálogo no existe, se mantiene fallback en 1 punto para no romper ranking.
  }

  return mapa;
}

function obtenerPuntajeProduccion(codigo, catalogo) {
  const cod = (codigo || "").toString().trim();
  const codNorm = normalizarTexto(cod);

  if (catalogo[cod] !== undefined && catalogo[cod] !== null && catalogo[cod] !== "") {
    return numeroProduccion(catalogo[cod]);
  }

  if (catalogo[codNorm] !== undefined && catalogo[codNorm] !== null && catalogo[codNorm] !== "") {
    return numeroProduccion(catalogo[codNorm]);
  }

  // Fallback seguro: si no encuentra el código en catálogo, cuenta 1 punto por orden.
  return 1;
}

function obtenerProduccionPorCuadrilla() {
  const hoja = obtenerHoja(HOJA_PRODUCCION);
  const datos = hoja.getDataRange().getValues();
  const catalogo = obtenerCatalogoPuntajesProduccion();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const usuario = fila[0] || "ADMIN";
    const cuadrilla = normalizarCuadrilla(fila[1]);
    const codigo = (fila[3] || "").toString().trim();
    const cantidad = numeroProduccion(fila[4]);
    const puntaje = obtenerPuntajeProduccion(codigo, catalogo);
    const puntos = cantidad * puntaje;

    if (!cuadrilla) continue;

    if (!mapa[cuadrilla]) {
      mapa[cuadrilla] = {
        usuario,
        produccion: 0,
        ordenes: 0
      };
    }

    mapa[cuadrilla].ordenes += cantidad;
    mapa[cuadrilla].produccion += puntos;
  }

  return mapa;
}

function obtenerEfectividadPorCuadrilla() {
  const hoja = obtenerHoja(HOJA_EFECTIVIDAD);
  const datos = hoja.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    const usuario = fila[1] || "ADMIN";
    const cuadrilla = normalizarCuadrilla(fila[2]);
    const fecha = fila[3];
    const finalizadas = Number(fila[4]) || 0;
    const total = Number(fila[8]) || 0;
    const efectividad = Number(fila[9]) || 0;

    if (!cuadrilla) continue;

    mapa[cuadrilla] = {
      usuario,
      fecha,
      finalizadas,
      total,
      efectividad
    };
  }

  return mapa;
}

function obtenerRecableadoPorCuadrilla() {
  const hoja = obtenerHoja(HOJA_RECABLEADO);
  const datos = hoja.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    const cuadrilla = normalizarCuadrilla(fila[2]);
    const rojoAsignadas = Number(fila[4]) || 0;
    const recableados = Number(fila[5]) || 0;
    const porcentaje = Number(fila[6]) || 0;

    if (!cuadrilla) continue;

    mapa[cuadrilla] = {
      rojoAsignadas,
      recableados,
      porcentajeRecableado: porcentaje
    };
  }

  return mapa;
}

function obtenerVtrGarPorCuadrilla() {
  const hoja = obtenerHoja(HOJA_VTRGAR);
  const datos = hoja.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    const cuadrilla = normalizarCuadrilla(fila[2]);
    const finalizadas = Number(fila[4]) || 0;
    const gar = Number(fila[5]) || 0;
    const vtr = Number(fila[6]) || 0;
    const totalGarVtr = Number(fila[7]) || 0;
    const porcentaje = Number(fila[8]) || 0;

    if (!cuadrilla) continue;

    mapa[cuadrilla] = {
      finalizadas,
      gar,
      vtr,
      totalGarVtr,
      porcentajeVtrGar: porcentaje
    };
  }

  return mapa;
}

function puntajePositivo(valor, maximo) {
  if (maximo <= 0) return 0;
  return (valor / maximo) * 100;
}

function puntajeNegativo(valor, maximo) {
  if (maximo <= 0) return 100;
  return 100 - ((valor / maximo) * 100);
}

function asignarPuestos(lista, campoOrden, campoPuesto, grupoCampo) {
  const grupos = {};

  lista.forEach(item => {
    const grupo = grupoCampo ? item[grupoCampo] : "GENERAL";
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(item);
  });

  Object.keys(grupos).forEach(grupo => {
    grupos[grupo]
      .sort((a, b) => b[campoOrden] - a[campoOrden])
      .forEach((item, index) => {
        item[campoPuesto] = index + 1;
      });
  });
}

function obtenerMedalla(puesto) {
  if (puesto === 1) return "🥇";
  if (puesto === 2) return "🥈";
  if (puesto === 3) return "🥉";
  return "";
}


function convertirFechaRanking(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor;
  }

  const texto = valor.toString().trim();
  if (!texto) return null;

  let partes = texto.split("/");
  if (partes.length === 3) {
    const dia = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const anio = Number(partes[2]);
    const fecha = new Date(anio, mes, dia);
    if (!isNaN(fecha.getTime())) return fecha;
  }

  partes = texto.split("-");
  if (partes.length === 3) {
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    if (!isNaN(fecha.getTime())) return fecha;
  }

  return null;
}

function obtenerNombreMesRanking(fecha) {
  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return "";

  return meses[fecha.getMonth()];
}

function obtenerCorteRankingAutomatico() {
  const fuentes = [
    { hoja: HOJA_PRODUCCION, columna: 3 },
    { hoja: HOJA_EFECTIVIDAD, columna: 4 }
  ];

  let fechaMaxima = null;

  fuentes.forEach(fuente => {
    const hoja = obtenerHoja(fuente.hoja);
    const ultimaFila = hoja.getLastRow();

    if (ultimaFila <= 1) return;

    const valores = hoja.getRange(2, fuente.columna, ultimaFila - 1, 1).getValues();

    valores.forEach(fila => {
      const fecha = convertirFechaRanking(fila[0]);

      if (fecha && (!fechaMaxima || fecha > fechaMaxima)) {
        fechaMaxima = fecha;
      }
    });
  });

  if (!fechaMaxima) {
    return {
      periodo: "",
      actualizadoAl: ""
    };
  }

  return {
    periodo: obtenerNombreMesRanking(fechaMaxima),
    actualizadoAl: Utilities.formatDate(fechaMaxima, Session.getScriptTimeZone(), "dd/MM/yyyy")
  };
}


function actualizarRanking(periodoManual, actualizadoAlManual) {
  const hojaRanking = obtenerHoja(HOJA_RANKING);
  const corteAutomatico = obtenerCorteRankingAutomatico();
  const periodoRanking = periodoManual || corteAutomatico.periodo || "";
  const actualizadoAlRanking = actualizadoAlManual || corteAutomatico.actualizadoAl || "";

  actualizarResumenObservaciones();

  const mapaUsuarios = obtenerMapaUsuarios();
  const mapaProduccion = obtenerProduccionPorCuadrilla();
  const mapaEfectividad = obtenerEfectividadPorCuadrilla();
  const mapaRecableado = obtenerRecableadoPorCuadrilla();
  const mapaVtrGar = obtenerVtrGarPorCuadrilla();
  const mapaObservaciones = obtenerResumenObservacionesPorCuadrilla();

  const cuadrillas = {};

  Object.keys(mapaUsuarios).forEach(c => cuadrillas[c] = true);
  Object.keys(mapaProduccion).forEach(c => cuadrillas[c] = true);
  Object.keys(mapaEfectividad).forEach(c => cuadrillas[c] = true);
  Object.keys(mapaRecableado).forEach(c => cuadrillas[c] = true);
  Object.keys(mapaVtrGar).forEach(c => cuadrillas[c] = true);
  Object.keys(mapaObservaciones).forEach(c => cuadrillas[c] = true);

  const lista = [];

  Object.keys(cuadrillas).forEach(cuadrilla => {
    const u = mapaUsuarios[cuadrilla] || {};
    const p = mapaProduccion[cuadrilla] || {};
    const e = mapaEfectividad[cuadrilla] || {};
    const r = mapaRecableado[cuadrilla] || {};
    const v = mapaVtrGar[cuadrilla] || {};
    const o = mapaObservaciones[cuadrilla] || {};

    lista.push({
      cuadrilla,
      usuario: u.usuario || p.usuario || e.usuario || "ADMIN",
      sede: u.sede || "",
      plataforma: u.plataforma || "",
      actualizacion: actualizadoAlRanking || e.fecha || "",
      produccion: Number(p.produccion) || 0,
      efectividad: Number(e.efectividad) || 0,
      recableado: Number(r.porcentajeRecableado) || 0,
      vtrgar: Number(v.porcentajeVtrGar) || 0,
      observaciones: Number(o.observaciones) || 0,
      montoTotalObservaciones: Number(o.montoTotal) || 0,
      montoAfectadoObservaciones: Number(o.montoAfectado) || 0
    });
  });

  if (lista.length === 0) {
    throw new Error("No hay información para generar ranking");
  }

  const maxProduccion = Math.max(...lista.map(x => x.produccion));
  const maxRecableado = Math.max(...lista.map(x => x.recableado));
  const maxVtrGar = Math.max(...lista.map(x => x.vtrgar));
  const maxObservaciones = Math.max(...lista.map(x => x.montoAfectadoObservaciones));

  lista.forEach(item => {
    const scoreProduccion = puntajePositivo(item.produccion, maxProduccion);
    const scoreEfectividad = item.efectividad * 100;
    const scoreRecableado = puntajeNegativo(item.recableado, maxRecableado);
    const scoreVtrGar = puntajeNegativo(item.vtrgar, maxVtrGar);
    const scoreObservaciones = puntajeNegativo(item.montoAfectadoObservaciones, maxObservaciones);

    item.puntajeFinal =
      (scoreProduccion * 0.35) +
      (scoreEfectividad * 0.30) +
      (scoreVtrGar * 0.125) +
      (scoreRecableado * 0.125) +
      (scoreObservaciones * 0.10);
  });

  asignarPuestos(lista, "puntajeFinal", "puestoRegion", null);
  asignarPuestos(lista, "puntajeFinal", "puestoSede", "sede");
  asignarPuestos(lista, "puntajeFinal", "puestoPlataforma", "plataforma");

  lista.sort((a, b) => a.puestoRegion - b.puestoRegion);

  const salida = [[
    "ID",
    "Cuadrilla",
    "ACTUALIZACION",
    "Usuario",
    "Sede",
    "Plataforma",
    "Producción",
    "Efectividad",
    "% Recableado",
    "% VTR/GAR",
    "Observaciones",
    "Monto Total Obs",
    "Monto Afectado Obs",
    "Puntaje Final",
    "Puesto SEDE",
    "Mi Puesto REGION",
    "Mi Puesto por plataforma",
    "Medalla Región",
    "Medalla Sede",
    "Medalla Plataforma"
  ]];

  lista.forEach((item, i) => {
    salida.push([
      i + 1,
      item.cuadrilla,
      item.actualizacion,
      item.usuario,
      item.sede,
      item.plataforma,
      item.produccion,
      item.efectividad,
      item.recableado,
      item.vtrgar,
      item.observaciones,
      item.montoTotalObservaciones,
      item.montoAfectadoObservaciones,
      item.puntajeFinal,
      item.puestoSede,
      item.puestoRegion,
      item.puestoPlataforma,
      obtenerMedalla(item.puestoRegion),
      obtenerMedalla(item.puestoSede),
      obtenerMedalla(item.puestoPlataforma)
    ]);
  });

  hojaRanking.clearContents();
  hojaRanking.getRange(1, 1, salida.length, salida[0].length).setValues(salida);

  if (salida.length > 1) {
    hojaRanking.getRange(2, 8, salida.length - 1, 1).setNumberFormat("0.00%");
    hojaRanking.getRange(2, 9, salida.length - 1, 1).setNumberFormat("0.00%");
    hojaRanking.getRange(2, 10, salida.length - 1, 1).setNumberFormat("0.00%");
    hojaRanking.getRange(2, 12, salida.length - 1, 2).setNumberFormat('"S/ "0.00');
    hojaRanking.getRange(2, 14, salida.length - 1, 1).setNumberFormat("0.00");
  }

  return {
    ok: true,
    modulo: "RANKING",
    registros: lista.length,
    periodo: periodoRanking,
    actualizadoAl: actualizadoAlRanking,
    primeroRegion: lista[0] ? lista[0].cuadrilla : ""
  };
}



/* =========================
   ACTIVIDAD EN CAMPO
========================= */

function encabezadoActividadCampo() {
  return [[
    "ID",
    "FECHA",
    "HORA",
    "SEDE",
    "SUPERVISOR",
    "CUADRILLA",
    "TIPO_ACTIVIDAD",
    "CLIENTE_PRESENTE",
    "DNI_VALIDADO",
    "ESTADO_INSTALACION",
    "DROP_METRAJE",
    "TEMPLADORES",
    "RESERVA_CABLE",
    "POTENCIA_CONFORME",
    "VELOCIDAD_CONFORME",
    "LIMPIEZA_TRABAJO",
    "CLIENTE_CONFORME",
    "OBSERVACIONES",
    "FOTO_1",
    "FOTO_2",
    "FOTO ACTA"
  ]];
}

function asegurarHojaActividadCampo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ACTIVIDAD_CAMPO);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ACTIVIDAD_CAMPO);
  }

  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, 21).setValues(encabezadoActividadCampo());
  } else {
    const encabezados = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 21)).getValues()[0];
    const primero = (encabezados[0] || "").toString().trim();
    if (!primero) {
      hoja.getRange(1, 1, 1, 21).setValues(encabezadoActividadCampo());
    }
  }

  return hoja;
}

function generarIdActividadCampo() {
  return "ACT-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
}

function normalizarNombreCarpetaActividad(txt) {
  return (txt || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 80);
}

function obtenerOCrearSubcarpetaActividad(carpetaPadre, nombreSubcarpeta) {
  const carpetas = carpetaPadre.getFoldersByName(nombreSubcarpeta);
  if (carpetas.hasNext()) return carpetas.next();
  return carpetaPadre.createFolder(nombreSubcarpeta);
}

function guardarArchivoActividadCampo(carpeta, cuadrilla, fechaArchivo, tipoArchivo, evidencia) {
  if (!evidencia || !evidencia.base64) return "";

  const nombreOriginal = evidencia.nombre || (tipoArchivo + ".jpg");
  const extension = nombreOriginal.indexOf(".") >= 0
    ? nombreOriginal.split(".").pop().toLowerCase()
    : "jpg";

  const nombreArchivo = normalizarNombreCarpetaActividad(cuadrilla) + "_" +
    fechaArchivo + "_" + tipoArchivo + "." + extension;

  const bytes = Utilities.base64Decode(evidencia.base64);
  const blob = Utilities.newBlob(bytes, evidencia.mime || "image/jpeg", nombreArchivo);
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}

function guardarEvidenciasActividadCampo(data, cuadrilla, idRegistro) {
  const carpetaPadre = DriveApp.getFolderById(CARPETA_ACTIVIDAD_CAMPO);
  const ahora = new Date();
  const fechaArchivo = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyyMMdd");
  const fechaCarpeta = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const nombreSubcarpeta = fechaCarpeta + "_" + normalizarNombreCarpetaActividad(cuadrilla) + "_" + idRegistro;
  const carpetaRegistro = obtenerOCrearSubcarpetaActividad(carpetaPadre, nombreSubcarpeta);

  const foto1 = data.foto1 || data.FOTO_1 || null;
  const foto2 = data.foto2 || data.FOTO_2 || null;
  const fotoActa = data.fotoActa || data.foto_acta || data.FOTO_ACTA || data["FOTO ACTA"] || null;

  return {
    foto1: guardarArchivoActividadCampo(carpetaRegistro, cuadrilla, fechaArchivo, "FOTO1", foto1),
    foto2: guardarArchivoActividadCampo(carpetaRegistro, cuadrilla, fechaArchivo, "FOTO2", foto2),
    fotoActa: guardarArchivoActividadCampo(carpetaRegistro, cuadrilla, fechaArchivo, "ACTA", fotoActa),
    carpeta: carpetaRegistro.getUrl()
  };
}

function validarSiNoActividad(valor, campo) {
  const v = normalizarTexto(valor);
  if (!v) return "";
  if (["SI", "NO", "NO APLICA", "NA", "N/A"].includes(v)) return v;
  throw new Error(campo + " no válido. Usa SI, NO o NO APLICA");
}

function registrarActividadCampo(data) {
  const hoja = asegurarHojaActividadCampo();
  const usuarioRegistro = obtenerUsuarioApp(data.usuario);

  if (!(usuarioRegistro.perfil === "SUPERVISOR" || esPerfilJefatura(usuarioRegistro.perfil))) {
    throw new Error("Solo Supervisor o Jefatura pueden registrar actividad en campo");
  }

  const cuadrilla = normalizarCuadrilla(data.cuadrilla);
  if (!cuadrilla) throw new Error("Debe seleccionar una cuadrilla");

  const datosCuadrilla = obtenerDatosCuadrillaApp(cuadrilla);

  if (usuarioRegistro.perfil === "SUPERVISOR" && normalizarTexto(usuarioRegistro.sede) !== normalizarTexto(datosCuadrilla.sede)) {
    throw new Error("Supervisor solo puede registrar actividades de su sede");
  }

  const tipoActividad = normalizarTexto(data.tipoActividad || data.tipo_actividad || data.tipo || "AUDITORIA EN FRIO");
  const tiposPermitidos = [
    "AUDITORIA EN FRIO",
    "SUPERVISION EN CALIENTE",
    "SEGUIMIENTO",
    "VALIDACION DE OBSERVACION",
    "CAPACITACION",
    "CHECKLIST"
  ];

  if (!tiposPermitidos.includes(tipoActividad)) {
    throw new Error("Tipo de actividad no válido");
  }

  const estadoInstalacion = normalizarTexto(data.estadoInstalacion || data.estado_instalacion);
  if (tipoActividad === "AUDITORIA EN FRIO" && !["FINALIZADA", "CANCELADA", "REPROGRAMADA"].includes(estadoInstalacion)) {
    throw new Error("Estado de instalación no válido. Usa FINALIZADA, CANCELADA o REPROGRAMADA");
  }

  const id = generarIdActividadCampo();
  const ahora = new Date();
  const fecha = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const hora = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "HH:mm:ss");

  const evidencias = guardarEvidenciasActividadCampo(data, cuadrilla, id);

  hoja.appendRow([
    id,
    fecha,
    hora,
    datosCuadrilla.sede || usuarioRegistro.sede,
    usuarioRegistro.usuario,
    cuadrilla,
    tipoActividad,
    validarSiNoActividad(data.clientePresente || data.cliente_presente, "Cliente presente"),
    validarSiNoActividad(data.dniValidado || data.dni_validado, "DNI validado"),
    estadoInstalacion,
    data.dropMetraje || data.drop_metraje || "",
    data.templadores || "",
    validarSiNoActividad(data.reservaCable || data.reserva_cable, "Reserva de cable"),
    validarSiNoActividad(data.potenciaConforme || data.potencia_conforme, "Potencia conforme"),
    validarSiNoActividad(data.velocidadConforme || data.velocidad_conforme, "Velocidad conforme"),
    validarSiNoActividad(data.limpiezaTrabajo || data.limpieza_trabajo, "Limpieza del trabajo"),
    validarSiNoActividad(data.clienteConforme || data.cliente_conforme, "Cliente conforme"),
    data.observaciones || "",
    evidencias.foto1,
    evidencias.foto2,
    evidencias.fotoActa
  ]);

  return {
    ok: true,
    modulo: "ACTIVIDAD_CAMPO",
    accion: "REGISTRAR",
    id,
    carpeta: evidencias.carpeta
  };
}

function filaActividadCampoAObjeto(fila) {
  return {
    id: fila[0],
    fecha: fila[1],
    hora: fila[2],
    sede: fila[3],
    supervisor: fila[4],
    cuadrilla: fila[5],
    tipoActividad: fila[6],
    clientePresente: fila[7],
    dniValidado: fila[8],
    estadoInstalacion: fila[9],
    dropMetraje: fila[10],
    templadores: fila[11],
    reservaCable: fila[12],
    potenciaConforme: fila[13],
    velocidadConforme: fila[14],
    limpiezaTrabajo: fila[15],
    clienteConforme: fila[16],
    observaciones: fila[17],
    foto1: fila[18],
    foto2: fila[19],
    fotoActa: fila[20]
  };
}

function fechaActividadComparable(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  if (!valor) return null;

  const texto = valor.toString().trim();
  let partes = texto.split("/");
  if (partes.length === 3) {
    const fecha = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    if (!isNaN(fecha.getTime())) return fecha;
  }

  partes = texto.split("-");
  if (partes.length === 3) {
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    if (!isNaN(fecha.getTime())) return fecha;
  }

  return null;
}

function cumpleRangoFechaActividad(fechaRegistro, desde, hasta) {
  const fecha = fechaActividadComparable(fechaRegistro);
  if (!fecha) return true;

  if (desde) {
    const fDesde = fechaActividadComparable(desde);
    if (fDesde && fecha < fDesde) return false;
  }

  if (hasta) {
    const fHasta = fechaActividadComparable(hasta);
    if (fHasta && fecha > fHasta) return false;
  }

  return true;
}

function listarActividadCampo(data) {
  const hoja = asegurarHojaActividadCampo();
  const datos = hoja.getDataRange().getValues();
  const usuario = obtenerUsuarioApp(data.usuario);
  const lista = [];

  if (!(usuario.perfil === "SUPERVISOR" || esPerfilJefatura(usuario.perfil))) {
    throw new Error("No tienes permiso para ver actividad en campo");
  }

  for (let i = 1; i < datos.length; i++) {
    const item = filaActividadCampoAObjeto(datos[i]);

    let permitir = false;
    if (usuario.perfil === "SUPERVISOR") {
      permitir = normalizarUsuario(item.supervisor) === normalizarUsuario(usuario.usuario);
    }
    if (esPerfilJefatura(usuario.perfil)) permitir = true;
    if (!permitir) continue;

    if (data.sede && normalizarTexto(data.sede) !== normalizarTexto(item.sede)) continue;
    if (data.supervisor && normalizarUsuario(data.supervisor) !== normalizarUsuario(item.supervisor)) continue;
    if (data.cuadrilla && normalizarCuadrilla(data.cuadrilla) !== normalizarCuadrilla(item.cuadrilla)) continue;
    if (data.tipoActividad && normalizarTexto(data.tipoActividad) !== normalizarTexto(item.tipoActividad)) continue;
    if (!cumpleRangoFechaActividad(item.fecha, data.fechaDesde, data.fechaHasta)) continue;

    lista.push(item);
  }

  return {
    ok: true,
    modulo: "ACTIVIDAD_CAMPO",
    accion: "LISTAR",
    perfil: usuario.perfil,
    registros: lista.length,
    actividades: lista
  };
}

function obtenerResumenActividadCampo(data) {
  const listado = listarActividadCampo(data);
  const tipos = [
    "AUDITORIA EN FRIO",
    "SUPERVISION EN CALIENTE",
    "SEGUIMIENTO",
    "VALIDACION DE OBSERVACION",
    "CAPACITACION",
    "CHECKLIST"
  ];

  const resumen = {};
  const totales = {};
  tipos.forEach(t => totales[t] = 0);
  totales.TOTAL = 0;

  listado.actividades.forEach(item => {
    const supervisor = normalizarUsuario(item.supervisor) || "SIN_SUPERVISOR";
    const tipo = normalizarTexto(item.tipoActividad);

    if (!resumen[supervisor]) {
      resumen[supervisor] = { supervisor };
      tipos.forEach(t => resumen[supervisor][t] = 0);
      resumen[supervisor].TOTAL = 0;
    }

    if (resumen[supervisor][tipo] === undefined) resumen[supervisor][tipo] = 0;
    if (totales[tipo] === undefined) totales[tipo] = 0;

    resumen[supervisor][tipo]++;
    resumen[supervisor].TOTAL++;
    totales[tipo]++;
    totales.TOTAL++;
  });

  return {
    ok: true,
    modulo: "ACTIVIDAD_CAMPO",
    accion: "RESUMEN",
    registros: listado.registros,
    totales,
    resumen: Object.keys(resumen).map(k => resumen[k])
  };
}

function listarCuadrillasActividadCampo(data) {
  return listarCuadrillasObservacion(data);
}

function autorizarDriveActividadCampo() {
  const carpeta = DriveApp.getFolderById(CARPETA_ACTIVIDAD_CAMPO);
  const archivoPrueba = carpeta.createFile(
    "PRUEBA_PERMISO_ACTIVIDAD_CAMPO.txt",
    "Permiso Drive autorizado correctamente para Actividad en Campo"
  );
  const url = archivoPrueba.getUrl();
  archivoPrueba.setTrashed(true);

  return {
    ok: true,
    modulo: "ACTIVIDAD_CAMPO",
    carpeta: carpeta.getName(),
    url: carpeta.getUrl(),
    prueba: url
  };
}



/* =========================
   VALIDACIÓN TÉCNICA
========================= */

function encabezadoValidacionTecnica() {
  return [[
    "ID",
    "FECHA_REGISTRO",
    "HORA_REGISTRO",
    "SEDE",
    "TECNICO",
    "CUADRILLA",
    "TIPO_VALIDACION",
    "CODIGO",
    "TIPO_TICKET",
    "NUMERO_TICKET",
    "TICKET_FINAL",
    "DNI_CLIENTE",
    "MOTIVO_TECNICO",
    "ESTADO",
    "RESULTADO_FINAL",
    "VALIDADO_POR",
    "PERFIL_VALIDADOR",
    "FECHA_VALIDACION",
    "HORA_VALIDACION",
    "MOTIVO_VALIDACION",
    "LINK_TELEGRAM",
    "HORA_LIMITE"
  ]];
}

function asegurarHojaValidacionTecnica() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_VALIDACION_TECNICA);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_VALIDACION_TECNICA);
  }

  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, 22).setValues(encabezadoValidacionTecnica());
  } else {
    const primero = hoja.getRange(1, 1).getValue();
    if (!primero) hoja.getRange(1, 1, 1, 22).setValues(encabezadoValidacionTecnica());
  }

  return hoja;
}

function obtenerLinkTelegramValidacion(sede) {
  const s = normalizarTexto(sede);
  if (s === "CHICLAYO") return "https://t.me/+fAxAapb0OKpiNzM5";
  if (s === "PIURA") return "https://t.me/+XZbC8DlbbC9jMmQx";
  if (s === "TRUJILLO") return "https://t.me/+iGfBdqznjoAxMmJh";
  return "";
}

function normalizarTipoValidacionTecnica(tipo) {
  const t = normalizarTexto(tipo);
  if (t === "RECABLEADO") return "RECABLEADO";
  if (t === "GAR") return "GAR";
  if (t === "VTR") return "VTR";
  throw new Error("Tipo de validación no válido. Usa RECABLEADO, GAR o VTR");
}

function normalizarTipoTicketValidacion(tipoTicket) {
  const t = (tipoTicket || "").toString().toUpperCase().trim();
  const limpio = t.replace(/\s+/g, "");
  if (limpio === "NOAPLICA" || limpio === "NO APLICA") return "NO APLICA";
  if (["AT-", "VTEXT-", "GAR-", "VTR-"].includes(limpio)) return limpio;
  throw new Error("Tipo de ticket no válido");
}

function generarIdValidacionTecnica(codigo, tipoValidacion) {
  const cod = limpiarNombreArchivo(codigo);
  const tipo = normalizarTipoValidacionTecnica(tipoValidacion);
  if (!cod) throw new Error("El código es obligatorio");
  return cod + "-" + tipo;
}

function buscarFilaValidacionTecnica(id) {
  const hoja = asegurarHojaValidacionTecnica();
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if ((datos[i][0] || "").toString().trim() === id.toString().trim()) {
      return { hoja, fila: i + 1, datos: datos[i] };
    }
  }

  throw new Error("No se encontró la validación técnica: " + id);
}

function existeValidacionTecnica(id) {
  const hoja = asegurarHojaValidacionTecnica();
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if ((datos[i][0] || "").toString().trim() === id.toString().trim()) return true;
  }

  return false;
}

function convertirFechaHoraValidacion(fechaValor, horaValor) {
  if (fechaValor instanceof Date && !isNaN(fechaValor.getTime())) {
    if (horaValor instanceof Date && !isNaN(horaValor.getTime())) {
      const f = new Date(fechaValor);
      f.setHours(horaValor.getHours(), horaValor.getMinutes(), horaValor.getSeconds(), 0);
      return f;
    }
    return fechaValor;
  }

  if (horaValor instanceof Date && !isNaN(horaValor.getTime())) return horaValor;

  const textoFecha = (fechaValor || "").toString().trim();
  const textoHora = (horaValor || "").toString().trim();
  if (!textoFecha) return null;

  let dia = 0, mes = 0, anio = 0;
  let partes = textoFecha.split("/");
  if (partes.length === 3) {
    dia = Number(partes[0]);
    mes = Number(partes[1]) - 1;
    anio = Number(partes[2]);
  } else {
    partes = textoFecha.split("-");
    if (partes.length === 3) {
      anio = Number(partes[0]);
      mes = Number(partes[1]) - 1;
      dia = Number(partes[2]);
    }
  }

  if (!anio || isNaN(anio)) return null;

  let h = 0, m = 0, s = 0;
  const ph = textoHora.split(":");
  if (ph.length >= 2) {
    h = Number(ph[0]) || 0;
    m = Number(ph[1]) || 0;
    s = Number(ph[2]) || 0;
  }

  const fecha = new Date(anio, mes, dia, h, m, s);
  if (isNaN(fecha.getTime())) return null;
  return fecha;
}

function obtenerHoraLimiteValidacion(row) {
  const horaLimite = row[21];
  if (horaLimite instanceof Date && !isNaN(horaLimite.getTime())) return horaLimite;

  const parsedLimite = convertirFechaHoraValidacion(row[1], horaLimite);
  if (parsedLimite) return parsedLimite;

  const registro = convertirFechaHoraValidacion(row[1], row[2]);
  if (!registro) return null;

  return new Date(registro.getTime() + 20 * 60 * 1000);
}

function procesarValidacionesTecnicasVencidas() {
  const hoja = asegurarHojaValidacionTecnica();
  const datos = hoja.getDataRange().getValues();
  const ahora = new Date();
  let actualizados = 0;

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const tipo = normalizarTexto(fila[6]);
    const estado = normalizarTexto(fila[13]);

    if (tipo !== "RECABLEADO") continue;
    if (estado !== "PENDIENTE") continue;

    const limite = obtenerHoraLimiteValidacion(fila);
    if (!limite) continue;

    if (ahora.getTime() >= limite.getTime()) {
      const filaHoja = i + 1;
      hoja.getRange(filaHoja, 14).setValue("SIN RESPUESTA");
      hoja.getRange(filaHoja, 15).setValue("APROBADO AUTOMÁTICAMENTE");
      hoja.getRange(filaHoja, 16).setValue("SISTEMA");
      hoja.getRange(filaHoja, 17).setValue("AUTOMÁTICO");
      hoja.getRange(filaHoja, 18).setValue(ahora);
      hoja.getRange(filaHoja, 19).setValue(ahora);
      hoja.getRange(filaHoja, 20).setValue("Aprobación automática por no recibir respuesta dentro de los 20 minutos establecidos.");
      hoja.getRange(filaHoja, 18).setNumberFormat("dd/mm/yyyy");
      hoja.getRange(filaHoja, 19).setNumberFormat("hh:mm:ss");
      actualizados++;
    }
  }

  return {
    ok: true,
    modulo: "VALIDACION_TECNICA",
    accion: "PROCESAR_VENCIDAS",
    actualizados
  };
}

function registrarValidacionTecnica(data) {
  const hoja = asegurarHojaValidacionTecnica();
  const usuarioRegistro = obtenerUsuarioApp(data.usuario);

  if (usuarioRegistro.perfil !== "TECNICO") {
    throw new Error("Solo el técnico puede registrar una validación técnica");
  }

  const cuadrilla = normalizarCuadrilla(usuarioRegistro.cuadrilla);
  if (!cuadrilla) throw new Error("El usuario técnico no tiene cuadrilla asignada");

  const datosCuadrilla = obtenerDatosCuadrillaApp(cuadrilla);
  const tipoValidacion = normalizarTipoValidacionTecnica(data.tipoValidacion || data.tipo_validacion);
  const codigo = (data.codigo || "").toString().trim();
  const id = generarIdValidacionTecnica(codigo, tipoValidacion);

  if (existeValidacionTecnica(id)) {
    throw new Error("Ya existe una validación registrada con este código y tipo: " + id);
  }

  const tipoTicket = normalizarTipoTicketValidacion(data.tipoTicket || data.tipo_ticket);
  const numeroTicket = tipoTicket === "NO APLICA" ? "" : (data.numeroTicket || data.numero_ticket || "").toString().trim();

  if (tipoTicket !== "NO APLICA" && !numeroTicket) {
    throw new Error("Debe ingresar el número de ticket");
  }

  const ticketFinal = tipoTicket === "NO APLICA" ? "NO APLICA" : tipoTicket + numeroTicket;
  const dni = (data.dniCliente || data.dni_cliente || "").toString().trim();
  if (!dni) throw new Error("Debe ingresar el DNI del cliente");

  const motivo = (data.motivoTecnico || data.motivo || "").toString().trim();
  if (!motivo) throw new Error("Debe ingresar el motivo");

  const ahora = new Date();
  const fecha = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const hora = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "HH:mm:ss");
  const horaLimite = tipoValidacion === "RECABLEADO"
    ? new Date(ahora.getTime() + 20 * 60 * 1000)
    : "";

  const sede = datosCuadrilla.sede || usuarioRegistro.sede;
  const linkTelegram = obtenerLinkTelegramValidacion(sede);

  hoja.appendRow([
    id,
    fecha,
    hora,
    sede,
    usuarioRegistro.usuario,
    cuadrilla,
    tipoValidacion,
    codigo,
    tipoTicket,
    numeroTicket,
    ticketFinal,
    dni,
    motivo,
    "PENDIENTE",
    "",
    "",
    "",
    "",
    "",
    "",
    linkTelegram,
    horaLimite
  ]);

  const fila = hoja.getLastRow();
  if (tipoValidacion === "RECABLEADO") {
    hoja.getRange(fila, 22).setNumberFormat("dd/mm/yyyy hh:mm:ss");
  }

  return {
    ok: true,
    modulo: "VALIDACION_TECNICA",
    accion: "REGISTRAR",
    id,
    fecha,
    hora,
    sede,
    tecnico: usuarioRegistro.usuario,
    cuadrilla,
    tipoValidacion,
    codigo,
    tipoTicket,
    numeroTicket,
    ticketFinal,
    dniCliente: dni,
    motivoTecnico: motivo,
    estado: "PENDIENTE",
    resultadoFinal: "",
    linkTelegram,
    horaLimite: tipoValidacion === "RECABLEADO" ? Utilities.formatDate(horaLimite, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss") : ""
  };
}

function filaValidacionTecnicaAObjeto(fila) {
  let estadoVisibleTecnico = fila[13];
  let resultadoVisibleTecnico = fila[14];

  if (normalizarTexto(fila[13]) === "SIN RESPUESTA" && normalizarTexto(fila[14]) === "APROBADO AUTOMATICAMENTE") {
    estadoVisibleTecnico = "APROBADO";
    resultadoVisibleTecnico = "VALIDACIÓN AUTOMÁTICA";
  }

  return {
    id: fila[0],
    fechaRegistro: fila[1],
    horaRegistro: fila[2],
    sede: fila[3],
    tecnico: fila[4],
    cuadrilla: fila[5],
    tipoValidacion: fila[6],
    codigo: fila[7],
    tipoTicket: fila[8],
    numeroTicket: fila[9],
    ticketFinal: fila[10],
    dniCliente: fila[11],
    motivoTecnico: fila[12],
    estado: fila[13],
    resultadoFinal: fila[14],
    validadoPor: fila[15],
    perfilValidador: fila[16],
    fechaValidacion: fila[17],
    horaValidacion: fila[18],
    motivoValidacion: fila[19],
    linkTelegram: fila[20],
    horaLimite: fila[21],
    estadoVisibleTecnico,
    resultadoVisibleTecnico
  };
}

function listarValidacionTecnica(data) {
  procesarValidacionesTecnicasVencidas();

  const hoja = asegurarHojaValidacionTecnica();
  const datos = hoja.getDataRange().getValues();
  const usuario = obtenerUsuarioApp(data.usuario);
  const lista = [];

  for (let i = 1; i < datos.length; i++) {
    const item = filaValidacionTecnicaAObjeto(datos[i]);

    let permitir = false;

    if (usuario.perfil === "TECNICO") {
      permitir = normalizarCuadrilla(usuario.cuadrilla) === normalizarCuadrilla(item.cuadrilla);
    } else if (usuario.perfil === "SUPERVISOR") {
      permitir = normalizarTexto(usuario.sede) === normalizarTexto(item.sede);
    } else if (esPerfilJefatura(usuario.perfil)) {
      permitir = true;
    }

    if (!permitir) continue;
    if (data.estado && normalizarTexto(data.estado) !== normalizarTexto(item.estado)) continue;
    if (data.tipoValidacion && normalizarTexto(data.tipoValidacion) !== normalizarTexto(item.tipoValidacion)) continue;
    if (data.sede && normalizarTexto(data.sede) !== normalizarTexto(item.sede)) continue;

    lista.push(item);
  }

  lista.sort((a, b) => {
    const fa = convertirFechaHoraValidacion(a.fechaRegistro, a.horaRegistro);
    const fb = convertirFechaHoraValidacion(b.fechaRegistro, b.horaRegistro);
    return (fb ? fb.getTime() : 0) - (fa ? fa.getTime() : 0);
  });

  return {
    ok: true,
    modulo: "VALIDACION_TECNICA",
    accion: "LISTAR",
    perfil: usuario.perfil,
    registros: lista.length,
    validaciones: lista
  };
}

function validarValidacionTecnica(data) {
  procesarValidacionesTecnicasVencidas();

  const id = (data.id || "").toString().trim();
  const motivo = (data.motivoValidacion || data.motivo || "").toString().trim();
  if (!id) throw new Error("ID obligatorio");
  if (!motivo) throw new Error("Debe ingresar el motivo de validación");

  const encontrado = buscarFilaValidacionTecnica(id);
  const hoja = encontrado.hoja;
  const fila = encontrado.fila;
  const datos = encontrado.datos;
  const usuario = obtenerUsuarioApp(data.usuario);
  const tipo = normalizarTexto(datos[6]);
  const sedeCaso = normalizarTexto(datos[3]);
  const estadoActual = normalizarTexto(datos[13]);

  if (estadoActual !== "PENDIENTE") {
    throw new Error("Esta validación ya no está pendiente");
  }

  const resultado = normalizarTexto(data.resultado);

  if (tipo === "RECABLEADO") {
    if (!(usuario.perfil === "SUPERVISOR" || esPerfilJefatura(usuario.perfil))) {
      throw new Error("Solo Supervisor o Jefatura pueden validar recableados");
    }

    if (usuario.perfil === "SUPERVISOR" && normalizarTexto(usuario.sede) !== sedeCaso) {
      throw new Error("Supervisor solo puede validar solicitudes de su sede");
    }

    if (!["APROBADO", "RECHAZADO", "OBSERVADO"].includes(resultado)) {
      throw new Error("Resultado no válido para Recableado");
    }
  } else if (tipo === "GAR" || tipo === "VTR") {
    if (!esPerfilJefatura(usuario.perfil)) {
      throw new Error("GAR y VTR solo pueden ser validados por Jefatura");
    }

    if (!["BONO", "NO BONO"].includes(resultado)) {
      throw new Error("Resultado no válido para GAR/VTR");
    }
  } else {
    throw new Error("Tipo de validación no reconocido");
  }

  const ahora = new Date();

  hoja.getRange(fila, 14).setValue(resultado);
  hoja.getRange(fila, 15).setValue(resultado);
  hoja.getRange(fila, 16).setValue(usuario.usuario);
  hoja.getRange(fila, 17).setValue(usuario.perfil);
  hoja.getRange(fila, 18).setValue(ahora);
  hoja.getRange(fila, 19).setValue(ahora);
  hoja.getRange(fila, 20).setValue(motivo);
  hoja.getRange(fila, 18).setNumberFormat("dd/mm/yyyy");
  hoja.getRange(fila, 19).setNumberFormat("hh:mm:ss");

  return {
    ok: true,
    modulo: "VALIDACION_TECNICA",
    accion: "VALIDAR",
    id,
    resultado,
    validadoPor: usuario.usuario,
    perfilValidador: usuario.perfil
  };
}

function crearTriggerValidacionTecnica() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === "procesarValidacionesTecnicasVencidas") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("procesarValidacionesTecnicasVencidas")
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    ok: true,
    modulo: "VALIDACION_TECNICA",
    accion: "CREAR_TRIGGER",
    mensaje: "Trigger creado para revisar recableados pendientes cada 5 minutos"
  };
}




/* =========================
   GESTIÓN DE ACTAS
========================= */

function esPerfilAlmacen(perfil) {
  return normalizarTexto(perfil) === "ALMACEN";
}

function esPerfilJefaturaAlmacen(perfil) {
  return normalizarTexto(perfil) === "JEFATURA ALMACEN";
}

function esTipoInstalacionActa(tipoPartida) {
  const t = normalizarTexto(tipoPartida);
  return t === "INSTALACION Y ACTIVACION DE ABONADOS EN CONDOMINIOS" ||
         t === "INSTALACIÓN Y ACTIVACIÓN DE ABONADOS EN CONDOMINIOS" ||
         t === "INSTALACION Y ACTIVACION DE ABONADOS EN RESIDENCIALES" ||
         t === "INSTALACIÓN Y ACTIVACIÓN DE ABONADOS EN RESIDENCIALES";
}

function normalizarTipoEjecucionActa(tipoEjecucion, tipoPartida) {
  let t = normalizarTexto(tipoEjecucion || "");
  if (!t && tipoPartida) {
    t = esTipoInstalacionActa(tipoPartida) ? "INSTALACION" : "VISITA TECNICA";
  }

  if (["INSTALACION", "INSTALACIÓN", "INSTALACIONES"].includes(t)) return "INSTALACION";
  if (["VISITA TECNICA", "VISITA TÉCNICA", "VISITA TECNICA/POSVENTA", "VISITA TÉCNICA/POSVENTA", "POSTVENTA", "POSVENTA"].includes(t)) {
    return "VISITA TECNICA";
  }

  throw new Error("Tipo de ejecución no válido. Usa INSTALACION o VISITA TECNICA");
}

function encabezadoActasEscaneadas() {
  return [[
    "ID",
    "FECHA_REGISTRO",
    "HORA_REGISTRO",
    "SEDE",
    "CUADRILLA",
    "SUPERVISOR",
    "TECNICO",
    "FECHA_GESTION",
    "TIPO_EJECUCION",
    "TIPO_PARTIDA",
    "CODIGO_ORDEN",
    "CODIGO_PEDIDO",
    "DNI",
    "CLIENTE",
    "NOMBRE_ARCHIVO",
    "LINK_ACTA",
    "ESTADO",
    "RESULTADO_ALMACEN",
    "MOTIVO_ALMACEN",
    "VALIDADO_ALMACEN_POR",
    "FECHA_VALIDACION_ALMACEN",
    "HORA_VALIDACION_ALMACEN",
    "RESULTADO_JEFATURA",
    "MOTIVO_JEFATURA",
    "VALIDADO_JEFATURA_POR",
    "FECHA_VALIDACION_JEFATURA",
    "HORA_VALIDACION_JEFATURA",
    "VERSION"
  ]];
}

function asegurarHojaActasEscaneadas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ACTAS_ESCANEADAS);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ACTAS_ESCANEADAS);
  }

  if (hoja.getLastRow() === 0 || !hoja.getRange(1, 1).getValue()) {
    hoja.getRange(1, 1, 1, 28).setValues(encabezadoActasEscaneadas());
  }

  return hoja;
}

function nombreCarpetaActa(txt) {
  return (txt || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|#%{}~&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 120);
}

function obtenerOCrearCarpetaActa(padre, nombre) {
  const n = nombreCarpetaActa(nombre || "SIN_DATO");
  const it = padre.getFoldersByName(n);
  if (it.hasNext()) return it.next();
  return padre.createFolder(n);
}

function fechaGestionActaTexto(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  const t = (valor || "").toString().trim();
  if (!t) throw new Error("Debe ingresar la fecha de gestión");
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const p = t.split("/");
  if (p.length === 3) {
    return p[2] + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
  }

  return t;
}

function generarIdActa(codigoPedido) {
  const pedido = limpiarNombreArchivo(codigoPedido);
  if (!pedido) throw new Error("El código de pedido es obligatorio");
  return "ACTA-" + pedido;
}

function obtenerTiposPartidaActas(data) {
  const hoja = obtenerHoja(HOJA_CATALOGO_ORDENES);
  const datos = hoja.getDataRange().getValues();
  const tipoEjecucionFiltro = data ? normalizarTexto(data.tipoEjecucion || data.tipo_ejecucion || "") : "";
  const vistos = {};
  const instalaciones = [];
  const visitaTecnica = [];

  for (let i = 1; i < datos.length; i++) {
    const tipo = normalizarTexto(datos[i][1]);
    if (!tipo || vistos[tipo]) continue;

    vistos[tipo] = true;

    if (esTipoInstalacionActa(tipo)) {
      instalaciones.push(tipo);
    } else {
      visitaTecnica.push(tipo);
    }
  }

  instalaciones.sort();
  visitaTecnica.sort();

  let tipos = instalaciones.concat(visitaTecnica);

  if (["INSTALACION", "INSTALACIÓN", "INSTALACIONES"].includes(tipoEjecucionFiltro)) {
    tipos = instalaciones;
  }

  if (["VISITA TECNICA", "VISITA TÉCNICA", "VISITA TECNICA/POSVENTA", "VISITA TÉCNICA/POSVENTA", "POSTVENTA", "POSVENTA"].includes(tipoEjecucionFiltro)) {
    tipos = visitaTecnica;
  }

  return {
    ok: true,
    modulo: "ACTAS",
    accion: "TIPOS_PARTIDA",
    tipos,
    instalaciones,
    visitaTecnica
  };
}

function buscarFilaActaPorPedido(codigoPedido) {
  const hoja = asegurarHojaActasEscaneadas();
  const datos = hoja.getDataRange().getValues();
  const pedido = limpiarNombreArchivo(codigoPedido);

  for (let i = 1; i < datos.length; i++) {
    if (limpiarNombreArchivo(datos[i][11]) === pedido) {
      return { hoja, fila: i + 1, datos: datos[i] };
    }

    // Compatibilidad con estructura anterior de 22 columnas, donde CODIGO_PEDIDO estaba en columna 11.
    if (limpiarNombreArchivo(datos[i][10]) === pedido && datos[i].length < 28) {
      return { hoja, fila: i + 1, datos: datos[i] };
    }
  }

  return null;
}

function extraerIdArchivoDrive(url) {
  const texto = (url || "").toString();
  if (!texto) return "";

  let m = texto.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  m = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  return "";
}

function enviarArchivoAnteriorActaPapelera(linkActa) {
  const idArchivo = extraerIdArchivoDrive(linkActa);
  if (!idArchivo) return false;

  try {
    DriveApp.getFileById(idArchivo).setTrashed(true);
    return true;
  } catch (e) {
    return false;
  }
}

function guardarPdfActaDrive(data, sede, cuadrilla, tipoEjecucion, fechaGestion, nombreArchivo) {
  if (!data.archivoBase64) throw new Error("Debe adjuntar el acta en PDF");

  const mime = (data.archivoMimeType || data.mime || "").toString().toLowerCase();
  const nombreOriginal = (data.archivoNombre || data.nombreArchivo || "").toString().toLowerCase();

  if (mime !== "application/pdf" && !nombreOriginal.endsWith(".pdf")) {
    throw new Error("Solo se permite subir archivos PDF");
  }

  const raiz = DriveApp.getFolderById(CARPETA_ACTAS_ESCANEADAS);
  const carpetaSede = obtenerOCrearCarpetaActa(raiz, sede);
  const carpetaCuadrilla = obtenerOCrearCarpetaActa(carpetaSede, cuadrilla);
  const carpetaEjecucion = obtenerOCrearCarpetaActa(carpetaCuadrilla, tipoEjecucion);
  const carpetaFecha = obtenerOCrearCarpetaActa(carpetaEjecucion, fechaGestion);

  // Limpieza de cualquier duplicado con el mismo nombre dentro de la carpeta final.
  const duplicados = carpetaFecha.getFilesByName(nombreArchivo);
  while (duplicados.hasNext()) {
    duplicados.next().setTrashed(true);
  }

  const bytes = Utilities.base64Decode(data.archivoBase64);
  const blob = Utilities.newBlob(bytes, "application/pdf", nombreArchivo);
  const archivo = carpetaFecha.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return archivo.getUrl();
}

function obtenerValorActaCompat(fila, nombreCampo) {
  // Estructura nueva de 28 columnas.
  const nueva = {
    id: 0,
    fechaRegistro: 1,
    horaRegistro: 2,
    sede: 3,
    cuadrilla: 4,
    supervisor: 5,
    tecnico: 6,
    fechaGestion: 7,
    tipoEjecucion: 8,
    tipoPartida: 9,
    codigoOrden: 10,
    codigoPedido: 11,
    dni: 12,
    cliente: 13,
    nombreArchivo: 14,
    linkActa: 15,
    estado: 16,
    resultadoAlmacen: 17,
    motivoAlmacen: 18,
    validadoAlmacenPor: 19,
    fechaValidacionAlmacen: 20,
    horaValidacionAlmacen: 21,
    resultadoJefatura: 22,
    motivoJefatura: 23,
    validadoJefaturaPor: 24,
    fechaValidacionJefatura: 25,
    horaValidacionJefatura: 26,
    version: 27
  };

  // Estructura antigua de 22 columnas.
  const antigua = {
    id: 0,
    fechaRegistro: 1,
    horaRegistro: 2,
    sede: 3,
    cuadrilla: 4,
    supervisor: 5,
    tecnico: 6,
    fechaGestion: 7,
    tipoPartida: 8,
    codigoOrden: 9,
    codigoPedido: 10,
    dni: 11,
    cliente: 12,
    nombreArchivo: 13,
    linkActa: 14,
    estado: 15,
    resultadoJefatura: 16,
    motivoJefatura: 17,
    validadoJefaturaPor: 18,
    fechaValidacionJefatura: 19,
    horaValidacionJefatura: 20,
    version: 21
  };

  const mapa = fila.length >= 28 ? nueva : antigua;
  const idx = mapa[nombreCampo];
  return idx === undefined ? "" : fila[idx];
}

function registrarActaEscaneada(data) {
  const hoja = asegurarHojaActasEscaneadas();
  const usuarioRegistro = obtenerUsuarioApp(data.usuario);

  if (usuarioRegistro.perfil !== "TECNICO") {
    throw new Error("Solo el técnico puede registrar actas");
  }

  const cuadrilla = normalizarCuadrilla(usuarioRegistro.cuadrilla);
  if (!cuadrilla) throw new Error("El técnico no tiene cuadrilla asignada");

  const datosCuadrilla = obtenerDatosCuadrillaApp(cuadrilla);
  const sede = datosCuadrilla.sede || usuarioRegistro.sede;
  const supervisor = datosCuadrilla.usuarioSupervisor || usuarioRegistro.usuarioSupervisor || "";
  const fechaGestion = fechaGestionActaTexto(data.fechaGestion || data.fecha_gestion);

  const tipoPartida = normalizarTexto(data.tipoPartida || data.tipo_partida);
  if (!tipoPartida) throw new Error("Debe seleccionar el tipo de partida");

  const tipoEjecucion = normalizarTipoEjecucionActa(data.tipoEjecucion || data.tipo_ejecucion, tipoPartida);

  if (tipoEjecucion === "INSTALACION" && !esTipoInstalacionActa(tipoPartida)) {
    throw new Error("Para INSTALACION solo corresponde seleccionar partidas de instalación y activación");
  }

  if (tipoEjecucion === "VISITA TECNICA" && esTipoInstalacionActa(tipoPartida)) {
    throw new Error("Para VISITA TECNICA/POSVENTA no corresponde seleccionar partidas de instalación");
  }

  const codigoOrden = (data.codigoOrden || data.codigo_orden || "").toString().trim();
  const codigoPedido = (data.codigoPedido || data.codigo_pedido || "").toString().trim();
  const dni = (data.dni || "").toString().trim();
  const cliente = (data.cliente || "").toString().trim().toUpperCase();

  if (!codigoOrden) throw new Error("Debe ingresar el código de orden");
  if (!codigoPedido) throw new Error("Debe ingresar el código de pedido");
  if (!dni) throw new Error("Debe ingresar el DNI");
  if (!cliente) throw new Error("Debe ingresar el cliente");

  const existente = buscarFilaActaPorPedido(codigoPedido);

  if (existente) {
    const estadoActual = normalizarTexto(obtenerValorActaCompat(existente.datos, "estado"));
    const resultadoAlmacen = normalizarTexto(obtenerValorActaCompat(existente.datos, "resultadoAlmacen"));
    const resultadoJefatura = normalizarTexto(obtenerValorActaCompat(existente.datos, "resultadoJefatura"));

    if (estadoActual === "FINALIZADO" || resultadoJefatura === "CORRECTO") {
      throw new Error("Esta acta ya está FINALIZADA. No se puede volver a subir.");
    }

    if (!(resultadoAlmacen === "OBSERVADO" || resultadoJefatura === "OBSERVADO")) {
      throw new Error("Ya existe un acta pendiente para este Código de Pedido. Solo se puede reemplazar cuando esté OBSERVADA.");
    }

    // Reemplazo: se elimina el PDF anterior antes de subir el nuevo.
    enviarArchivoAnteriorActaPapelera(obtenerValorActaCompat(existente.datos, "linkActa"));
  }

  const versionAnterior = existente ? Number(obtenerValorActaCompat(existente.datos, "version")) || 1 : 0;
  const version = versionAnterior + 1;
  const nombreArchivo = limpiarNombreArchivo(codigoPedido) + ".pdf";
  const link = guardarPdfActaDrive(data, sede, cuadrilla, tipoEjecucion, fechaGestion, nombreArchivo);
  const ahora = new Date();
  const fechaRegistro = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const horaRegistro = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "HH:mm:ss");
  const id = generarIdActa(codigoPedido);

  const filaValores = [
    id,
    fechaRegistro,
    horaRegistro,
    sede,
    cuadrilla,
    supervisor,
    usuarioRegistro.usuario,
    fechaGestion,
    tipoEjecucion,
    tipoPartida,
    codigoOrden,
    codigoPedido,
    dni,
    cliente,
    nombreArchivo,
    link,
    "PENDIENTE",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    version
  ];

  if (existente) {
    hoja.getRange(existente.fila, 1, 1, 28).setValues([filaValores]);
  } else {
    hoja.appendRow(filaValores);
  }

  return {
    ok: true,
    modulo: "ACTAS",
    accion: existente ? "REEMPLAZAR" : "REGISTRAR",
    id,
    estado: "PENDIENTE",
    tipoEjecucion,
    tipoPartida,
    version,
    linkActa: link,
    nombreArchivo
  };
}

function filaActaAObjeto(fila) {
  const tipoPartida = obtenerValorActaCompat(fila, "tipoPartida");
  const tipoEjecucion = obtenerValorActaCompat(fila, "tipoEjecucion") || normalizarTipoEjecucionActa("", tipoPartida);
  const resultadoAlmacen = obtenerValorActaCompat(fila, "resultadoAlmacen");
  const resultadoJefatura = obtenerValorActaCompat(fila, "resultadoJefatura");
  const estado = obtenerValorActaCompat(fila, "estado");

  let estadoVisibleTecnico = estado;
  if (normalizarTexto(resultadoJefatura) === "CORRECTO") {
    estadoVisibleTecnico = "CORRECTO";
  } else if (normalizarTexto(resultadoJefatura) === "OBSERVADO" || normalizarTexto(resultadoAlmacen) === "OBSERVADO") {
    estadoVisibleTecnico = "OBSERVADO";
  } else {
    estadoVisibleTecnico = "PENDIENTE";
  }

  return {
    id: obtenerValorActaCompat(fila, "id"),
    fechaRegistro: obtenerValorActaCompat(fila, "fechaRegistro"),
    horaRegistro: obtenerValorActaCompat(fila, "horaRegistro"),
    sede: obtenerValorActaCompat(fila, "sede"),
    cuadrilla: obtenerValorActaCompat(fila, "cuadrilla"),
    supervisor: obtenerValorActaCompat(fila, "supervisor"),
    tecnico: obtenerValorActaCompat(fila, "tecnico"),
    fechaGestion: obtenerValorActaCompat(fila, "fechaGestion"),
    tipoEjecucion,
    tipoPartida,
    codigoOrden: obtenerValorActaCompat(fila, "codigoOrden"),
    codigoPedido: obtenerValorActaCompat(fila, "codigoPedido"),
    dni: obtenerValorActaCompat(fila, "dni"),
    cliente: obtenerValorActaCompat(fila, "cliente"),
    nombreArchivo: obtenerValorActaCompat(fila, "nombreArchivo"),
    linkActa: obtenerValorActaCompat(fila, "linkActa"),
    estado,
    estadoVisibleTecnico,
    resultadoAlmacen,
    motivoAlmacen: obtenerValorActaCompat(fila, "motivoAlmacen"),
    validadoAlmacenPor: obtenerValorActaCompat(fila, "validadoAlmacenPor"),
    fechaValidacionAlmacen: obtenerValorActaCompat(fila, "fechaValidacionAlmacen"),
    horaValidacionAlmacen: obtenerValorActaCompat(fila, "horaValidacionAlmacen"),
    resultadoJefatura,
    motivoJefatura: obtenerValorActaCompat(fila, "motivoJefatura"),
    validadoJefaturaPor: obtenerValorActaCompat(fila, "validadoJefaturaPor"),
    fechaValidacionJefatura: obtenerValorActaCompat(fila, "fechaValidacionJefatura"),
    horaValidacionJefatura: obtenerValorActaCompat(fila, "horaValidacionJefatura"),
    version: obtenerValorActaCompat(fila, "version"),

    // Compatibilidad con frontend anterior.
    resultadoValidacion: resultadoJefatura || resultadoAlmacen,
    motivoObservacion: obtenerValorActaCompat(fila, "motivoJefatura") || obtenerValorActaCompat(fila, "motivoAlmacen"),
    validadoPor: obtenerValorActaCompat(fila, "validadoJefaturaPor") || obtenerValorActaCompat(fila, "validadoAlmacenPor")
  };
}

function listarActasEscaneadas(data) {
  const hoja = asegurarHojaActasEscaneadas();
  const datos = hoja.getDataRange().getValues();
  const usuario = obtenerUsuarioApp(data.usuario);
  const lista = [];

  for (let i = 1; i < datos.length; i++) {
    const item = filaActaAObjeto(datos[i]);
    let permitir = false;

    if (usuario.perfil === "TECNICO") {
      permitir = normalizarCuadrilla(usuario.cuadrilla) === normalizarCuadrilla(item.cuadrilla);
    }

    if (usuario.perfil === "SUPERVISOR") {
      permitir = normalizarTexto(usuario.sede) === normalizarTexto(item.sede);
    }

    if (esPerfilAlmacen(usuario.perfil)) {
      permitir = normalizarTexto(usuario.sede) === normalizarTexto(item.sede);
    }

    if (esPerfilJefatura(usuario.perfil) || esPerfilJefaturaAlmacen(usuario.perfil)) {
      permitir = true;
    }

    if (!permitir) continue;
    if (data.sede && normalizarTexto(data.sede) !== normalizarTexto(item.sede)) continue;
    if (data.cuadrilla && normalizarCuadrilla(data.cuadrilla) !== normalizarCuadrilla(item.cuadrilla)) continue;
    if (data.estado && normalizarTexto(data.estado) !== normalizarTexto(item.estado)) continue;
    if (data.tipoEjecucion && normalizarTexto(data.tipoEjecucion) !== normalizarTexto(item.tipoEjecucion)) continue;

    lista.push(item);
  }

  lista.reverse();

  return {
    ok: true,
    modulo: "ACTAS",
    accion: "LISTAR",
    perfil: usuario.perfil,
    registros: lista.length,
    actas: lista
  };
}

function validarActaEscaneada(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  const id = (data.id || "").toString().trim();
  const resultado = normalizarTexto(data.resultado);
  const motivo = (data.motivoObservacion || data.motivo || "").toString().trim();

  if (!id) throw new Error("ID obligatorio");
  if (!["CORRECTO", "OBSERVADO"].includes(resultado)) throw new Error("Resultado no válido");
  if (resultado === "OBSERVADO" && !motivo) throw new Error("Debe ingresar el motivo de observación");

  if (!(esPerfilAlmacen(usuario.perfil) || esPerfilJefaturaAlmacen(usuario.perfil))) {
    throw new Error("Solo Almacén o Jefatura Almacén pueden validar actas");
  }

  const hoja = asegurarHojaActasEscaneadas();
  const datos = hoja.getDataRange().getValues();
  let fila = -1;
  let item = null;

  for (let i = 1; i < datos.length; i++) {
    const obj = filaActaAObjeto(datos[i]);
    if ((obj.id || "").toString().trim() === id) {
      fila = i + 1;
      item = obj;
      break;
    }
  }

  if (fila < 0) throw new Error("No se encontró el acta: " + id);

  if (esPerfilAlmacen(usuario.perfil) && normalizarTexto(usuario.sede) !== normalizarTexto(item.sede)) {
    throw new Error("Almacén solo puede validar actas de su sede");
  }

  const ahora = new Date();

  if (esPerfilAlmacen(usuario.perfil)) {
    // Primera validación. No finaliza el acta aunque marque CORRECTO.
    hoja.getRange(fila, 18).setValue(resultado);
    hoja.getRange(fila, 19).setValue(resultado === "OBSERVADO" ? motivo : "");
    hoja.getRange(fila, 20).setValue(usuario.usuario);
    hoja.getRange(fila, 21).setValue(ahora);
    hoja.getRange(fila, 22).setValue(ahora);
    hoja.getRange(fila, 21).setNumberFormat("dd/mm/yyyy");
    hoja.getRange(fila, 22).setNumberFormat("hh:mm:ss");
    hoja.getRange(fila, 17).setValue("PENDIENTE");

    return {
      ok: true,
      modulo: "ACTAS",
      accion: "VALIDAR_ALMACEN",
      id,
      resultado,
      estado: "PENDIENTE"
    };
  }

  if (esPerfilJefaturaAlmacen(usuario.perfil)) {
    // Validación final. Si Jefatura marca CORRECTO, finaliza aunque Almacén no haya validado.
    hoja.getRange(fila, 23).setValue(resultado);
    hoja.getRange(fila, 24).setValue(resultado === "OBSERVADO" ? motivo : "");
    hoja.getRange(fila, 25).setValue(usuario.usuario);
    hoja.getRange(fila, 26).setValue(ahora);
    hoja.getRange(fila, 27).setValue(ahora);
    hoja.getRange(fila, 26).setNumberFormat("dd/mm/yyyy");
    hoja.getRange(fila, 27).setNumberFormat("hh:mm:ss");
    hoja.getRange(fila, 17).setValue(resultado === "CORRECTO" ? "FINALIZADO" : "PENDIENTE");

    return {
      ok: true,
      modulo: "ACTAS",
      accion: "VALIDAR_JEFATURA",
      id,
      resultado,
      estado: resultado === "CORRECTO" ? "FINALIZADO" : "PENDIENTE"
    };
  }
}

function resumenActasEscaneadas(data) {
  const listado = listarActasEscaneadas(data);
  const general = {
    escaneadas: 0,
    finalizadas: 0,
    observadas: 0,
    pendientes: 0,
    correctasAlmacen: 0,
    observadasAlmacen: 0,
    correctasJefatura: 0,
    observadasJefatura: 0
  };
  const sedes = {};
  const cuadrillas = {};

  listado.actas.forEach(a => {
    const sede = normalizarTexto(a.sede) || "SIN SEDE";
    const cuad = normalizarCuadrilla(a.cuadrilla) || "SIN CUADRILLA";
    const estado = normalizarTexto(a.estado);
    const resultadoAlmacen = normalizarTexto(a.resultadoAlmacen);
    const resultadoJefatura = normalizarTexto(a.resultadoJefatura);
    const observado = resultadoAlmacen === "OBSERVADO" || resultadoJefatura === "OBSERVADO";

    function sumar(obj) {
      obj.escaneadas++;
      if (estado === "FINALIZADO" || resultadoJefatura === "CORRECTO") obj.finalizadas++;
      if (observado) obj.observadas++;
      if (estado === "PENDIENTE") obj.pendientes++;
      if (resultadoAlmacen === "CORRECTO") obj.correctasAlmacen++;
      if (resultadoAlmacen === "OBSERVADO") obj.observadasAlmacen++;
      if (resultadoJefatura === "CORRECTO") obj.correctasJefatura++;
      if (resultadoJefatura === "OBSERVADO") obj.observadasJefatura++;
    }

    sumar(general);

    if (!sedes[sede]) {
      sedes[sede] = {
        sede,
        escaneadas: 0,
        finalizadas: 0,
        observadas: 0,
        pendientes: 0,
        correctasAlmacen: 0,
        observadasAlmacen: 0,
        correctasJefatura: 0,
        observadasJefatura: 0
      };
    }

    if (!cuadrillas[cuad]) {
      cuadrillas[cuad] = {
        sede,
        cuadrilla: cuad,
        escaneadas: 0,
        finalizadas: 0,
        observadas: 0,
        pendientes: 0,
        correctasAlmacen: 0,
        observadasAlmacen: 0,
        correctasJefatura: 0,
        observadasJefatura: 0
      };
    }

    sumar(sedes[sede]);
    sumar(cuadrillas[cuad]);
  });

  return {
    ok: true,
    modulo: "ACTAS",
    accion: "RESUMEN",
    general,
    sedes: Object.keys(sedes).sort().map(k => sedes[k]),
    cuadrillas: Object.keys(cuadrillas).sort().map(k => cuadrillas[k])
  };
}




/* =========================
   ANÁLISIS ECONÓMICO
   Solo Jefatura / Admin
========================= */

const META_DIARIA_CUADRILLA = 500;
const DIAS_META_MENSUAL = 26;

function esPerfilAnalisisEconomico(perfil) {
  return esPerfilJefatura(perfil);
}

function convertirFechaAnalisisEconomico(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }

  const texto = (valor || "").toString().trim();
  if (!texto) return null;

  let partes = texto.split("/");
  if (partes.length === 3) {
    const fecha = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  partes = texto.split("-");
  if (partes.length === 3) {
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(texto);
  return isNaN(fecha.getTime()) ? null : new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function resolverPeriodoAnalisisEconomico(data) {
  const ahora = new Date();
  let anio = Number(data.anio) || ahora.getFullYear();
  let mes = Number(data.mes) || (ahora.getMonth() + 1);

  const periodo = (data.periodo || "").toString().trim();

  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const partes = periodo.split("-");
    anio = Number(partes[0]);
    mes = Number(partes[1]);
  } else if (/^\d{2}\/\d{4}$/.test(periodo)) {
    const partes = periodo.split("/");
    mes = Number(partes[0]);
    anio = Number(partes[1]);
  }

  if (mes < 1 || mes > 12) throw new Error("Mes no válido");
  if (anio < 2000 || anio > 2100) throw new Error("Año no válido");

  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  return {
    anio,
    mes,
    clave: anio + "-" + String(mes).padStart(2, "0"),
    nombre: meses[mes - 1] + " " + anio,
    inicio: new Date(anio, mes - 1, 1),
    fin: new Date(anio, mes, 0)
  };
}

function obtenerCatalogoEconomico() {
  const hoja = obtenerHoja(HOJA_CATALOGO_ORDENES);
  const datos = hoja.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < datos.length; i++) {
    const codigo = (datos[i][0] || "").toString().trim();
    if (!codigo) continue;

    const tipoOrden = normalizarTexto(datos[i][1]);
    const plataforma = normalizarTexto(datos[i][2]);
    const grupo = normalizarTexto(datos[i][4]);
    const monto = numeroProduccion(datos[i][5]);
    const estadoTarifa = normalizarTexto(datos[i][6] || "ACTIVO");

    mapa[codigo] = {
      codigo,
      tipoOrden,
      plataforma,
      grupo,
      monto,
      estadoTarifa
    };

    mapa[normalizarTexto(codigo)] = mapa[codigo];
  }

  return mapa;
}

function obtenerCatalogoEconomicoPorCodigo(codigo, catalogo) {
  const original = (codigo || "").toString().trim();
  return catalogo[original] || catalogo[normalizarTexto(original)] || null;
}

function obtenerCuadrillasActivasEconomico() {
  const mapaUsuarios = obtenerMapaUsuarios();
  const lista = [];
  const vistos = {};

  Object.keys(mapaUsuarios).forEach(cuadrilla => {
    const item = mapaUsuarios[cuadrilla] || {};
    const cuadrillaNormalizada = normalizarCuadrilla(cuadrilla);
    const perfil = normalizarTexto(item.perfil || "");
    const sede = normalizarTexto(item.sede || "");

    // Solo cuentan como meta las cuadrillas técnicas activas reales.
    // Esto excluye filas generales como TODAS, JEFATURA, ADMIN o SUPERVISOR.
    if (normalizarTexto(item.estado || "ACTIVO") !== "ACTIVO") return;
    if (perfil !== "TECNICO") return;
    if (!/^P\d+/i.test(cuadrillaNormalizada)) return;
    if (!sede || sede === "TODAS" || sede === "ZONA NORTE") return;
    if (vistos[cuadrillaNormalizada]) return;

    lista.push({
      cuadrilla: cuadrillaNormalizada,
      sede,
      plataforma: normalizarTexto(item.plataforma)
    });

    vistos[cuadrillaNormalizada] = true;
  });

  return lista;
}

function crearAcumuladorEconomico(clave, extras) {
  return Object.assign({
    clave,
    cantidad: 0,
    monto: 0,
    meta: 0,
    cumplimiento: 0,
    ticketPromedio: 0
  }, extras || {});
}

function sumarEconomico(mapa, clave, cantidad, monto, extras) {
  if (!mapa[clave]) mapa[clave] = crearAcumuladorEconomico(clave, extras);
  mapa[clave].cantidad += cantidad;
  mapa[clave].monto += monto;
  return mapa[clave];
}

function finalizarAcumuladoresEconomicos(mapa) {
  return Object.keys(mapa).map(k => {
    const item = mapa[k];
    item.ticketPromedio = item.cantidad > 0 ? item.monto / item.cantidad : 0;
    item.cumplimiento = item.meta > 0 ? item.monto / item.meta : 0;
    return item;
  });
}

function asegurarHojaAnalisisEconomico() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ANALISIS_ECONOMICO);

  if (!hoja) hoja = ss.insertSheet(HOJA_ANALISIS_ECONOMICO);

  const encabezado = [[
    "PERIODO",
    "FECHA_ACTUALIZACION",
    "FECHA_GESTION",
    "SEDE",
    "CUADRILLA",
    "PLATAFORMA",
    "TIPO_ORDEN",
    "CODIGO",
    "CANTIDAD",
    "MONTO_UNITARIO",
    "MONTO_TOTAL"
  ]];

  if (hoja.getLastRow() === 0 || !hoja.getRange(1, 1).getValue()) {
    hoja.getRange(1, 1, 1, 11).setValues(encabezado);
  }

  return hoja;
}

function actualizarHojaAnalisisEconomico(periodo, detalle) {
  const hoja = asegurarHojaAnalisisEconomico();
  const ahora = new Date();
  const salida = [[
    "PERIODO",
    "FECHA_ACTUALIZACION",
    "FECHA_GESTION",
    "SEDE",
    "CUADRILLA",
    "PLATAFORMA",
    "TIPO_ORDEN",
    "CODIGO",
    "CANTIDAD",
    "MONTO_UNITARIO",
    "MONTO_TOTAL"
  ]];

  detalle.forEach(item => {
    salida.push([
      periodo.nombre,
      ahora,
      item.fecha,
      item.sede,
      item.cuadrilla,
      item.plataforma,
      item.tipoOrden,
      item.codigo,
      item.cantidad,
      item.montoUnitario,
      item.montoTotal
    ]);
  });

  hoja.clearContents();
  hoja.getRange(1, 1, salida.length, salida[0].length).setValues(salida);

  if (salida.length > 1) {
    hoja.getRange(2, 2, salida.length - 1, 1).setNumberFormat("dd/mm/yyyy hh:mm");
    hoja.getRange(2, 3, salida.length - 1, 1).setNumberFormat("dd/mm/yyyy");
    hoja.getRange(2, 10, salida.length - 1, 2).setNumberFormat('"S/ "0.00');
  }
}

function obtenerAnalisisEconomico(data) {
  const usuario = obtenerUsuarioApp(data.usuario);

  if (!esPerfilAnalisisEconomico(usuario.perfil)) {
    throw new Error("El módulo Análisis Económico es exclusivo para Jefatura");
  }

  const periodo = resolverPeriodoAnalisisEconomico(data);
  const hojaProduccion = obtenerHoja(HOJA_PRODUCCION);
  const produccion = hojaProduccion.getDataRange().getValues();
  const catalogo = obtenerCatalogoEconomico();
  const usuarios = obtenerMapaUsuarios();
  const cuadrillasActivas = obtenerCuadrillasActivasEconomico();

  const porSede = {};
  const porCuadrilla = {};
  const porPlataforma = {};
  const porTipoPartida = {};
  const porDia = {};
  const detalle = [];
  const codigosSinTarifa = {};
  const codigosSinTarifaDetalles = [];
  const diasConProduccion = {};

  let montoTotal = 0;
  let ordenesEjecutadas = 0;

  for (let i = 1; i < produccion.length; i++) {
    const fila = produccion[i];
    const cuadrilla = normalizarCuadrilla(fila[1]);
    const fecha = convertirFechaAnalisisEconomico(fila[2]);
    const codigo = (fila[3] || "").toString().trim();
    const cantidad = numeroProduccion(fila[4]);

    if (!cuadrilla || !fecha || !codigo || cantidad <= 0) continue;
    if (fecha.getFullYear() !== periodo.anio || (fecha.getMonth() + 1) !== periodo.mes) continue;

    const cat = obtenerCatalogoEconomicoPorCodigo(codigo, catalogo);
    if (!cat || cat.estadoTarifa !== "ACTIVO" || cat.monto <= 0) {
      codigosSinTarifa[codigo] = true;
      const datosUsuarioSinTarifa = usuarios[cuadrilla] || {};
      codigosSinTarifaDetalles.push({
        codigo,
        fecha: Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy"),
        cuadrilla,
        sede: normalizarTexto(datosUsuarioSinTarifa.sede || "SIN SEDE"),
        cantidad
      });
      continue;
    }

    const datosUsuario = usuarios[cuadrilla] || {};
    const sede = normalizarTexto(datosUsuario.sede || "SIN SEDE");
    const plataformaCatalogo = normalizarTexto(cat.plataforma || "");
    const plataforma = plataformaCatalogo && plataformaCatalogo !== "TODAS"
      ? plataformaCatalogo
      : normalizarTexto(datosUsuario.plataforma || "SIN PLATAFORMA");
    const tipoOrden = normalizarTexto(cat.tipoOrden || codigo);
    const montoUnitario = cat.monto;
    const montoLinea = cantidad * montoUnitario;
    const fechaClave = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    const fechaVisible = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy");

    montoTotal += montoLinea;
    ordenesEjecutadas += cantidad;
    diasConProduccion[fechaClave] = true;

    sumarEconomico(porSede, sede, cantidad, montoLinea, { sede });
    sumarEconomico(porCuadrilla, cuadrilla, cantidad, montoLinea, { cuadrilla, sede, plataforma });
    sumarEconomico(porPlataforma, plataforma, cantidad, montoLinea, { plataforma });
    sumarEconomico(porTipoPartida, tipoOrden, cantidad, montoLinea, { tipoOrden, plataforma });
    sumarEconomico(porDia, fechaClave, cantidad, montoLinea, { fecha: fechaVisible, fechaClave });

    detalle.push({
      fecha,
      sede,
      cuadrilla,
      plataforma,
      tipoOrden,
      codigo,
      cantidad,
      montoUnitario,
      montoTotal: montoLinea
    });
  }

  const metaPorCuadrilla = META_DIARIA_CUADRILLA * DIAS_META_MENSUAL;
  const metaTotal = cuadrillasActivas.length * metaPorCuadrilla;

  cuadrillasActivas.forEach(c => {
    if (!porCuadrilla[c.cuadrilla]) {
      porCuadrilla[c.cuadrilla] = crearAcumuladorEconomico(c.cuadrilla, {
        cuadrilla: c.cuadrilla,
        sede: c.sede,
        plataforma: c.plataforma
      });
    }

    porCuadrilla[c.cuadrilla].meta = metaPorCuadrilla;

    if (!porSede[c.sede]) porSede[c.sede] = crearAcumuladorEconomico(c.sede, { sede: c.sede });
    porSede[c.sede].meta += metaPorCuadrilla;
  });

  const diasTrabajados = Object.keys(diasConProduccion).length;
  const proyeccionCierre = diasTrabajados > 0
    ? (montoTotal / diasTrabajados) * DIAS_META_MENSUAL
    : 0;

  const listaCuadrillas = finalizarAcumuladoresEconomicos(porCuadrilla)
    .sort((a, b) => b.monto - a.monto);

  const listaSedes = finalizarAcumuladoresEconomicos(porSede)
    .sort((a, b) => b.monto - a.monto);

  const listaPlataformas = finalizarAcumuladoresEconomicos(porPlataforma)
    .sort((a, b) => b.monto - a.monto);

  const listaTipos = finalizarAcumuladoresEconomicos(porTipoPartida)
    .sort((a, b) => b.monto - a.monto);

  const listaDias = finalizarAcumuladoresEconomicos(porDia)
    .sort((a, b) => a.fechaClave.localeCompare(b.fechaClave));

  actualizarHojaAnalisisEconomico(periodo, detalle);

  return {
    ok: true,
    modulo: "ANALISIS_ECONOMICO",
    accion: "CONSULTAR",
    periodo: periodo.nombre,
    periodoClave: periodo.clave,
    fechaActualizacion: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"),
    parametrosMeta: {
      metaDiariaCuadrilla: META_DIARIA_CUADRILLA,
      diasMetaMensual: DIAS_META_MENSUAL,
      metaMensualCuadrilla: metaPorCuadrilla,
      cuadrillasActivas: cuadrillasActivas.length
    },
    resumen: {
      montoTotal,
      metaTotal,
      cumplimiento: metaTotal > 0 ? montoTotal / metaTotal : 0,
      ordenesEjecutadas,
      ticketPromedio: ordenesEjecutadas > 0 ? montoTotal / ordenesEjecutadas : 0,
      diasConProduccion: diasTrabajados,
      proyeccionCierre,
      diferenciaMeta: montoTotal - metaTotal,
      mejorCuadrilla: listaCuadrillas.length ? listaCuadrillas[0] : null,
      menorCuadrilla: listaCuadrillas.length ? listaCuadrillas[listaCuadrillas.length - 1] : null
    },
    porSede: listaSedes,
    porCuadrilla: listaCuadrillas,
    porPlataforma: listaPlataformas,
    porTipoPartida: listaTipos,
    porDia: listaDias,
    codigosSinTarifa: Object.keys(codigosSinTarifa).sort(),
    codigosSinTarifaDetalles
  };
}


/* =========================
   API PRINCIPAL
========================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);


    if (data.accion === "obtenerAnalisisEconomico") {
      return ContentService
        .createTextOutput(JSON.stringify(obtenerAnalisisEconomico(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }


    if (data.accion === "registrarActaEscaneada") {
      return ContentService.createTextOutput(JSON.stringify(registrarActaEscaneada(data))).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarActasEscaneadas") {
      return ContentService.createTextOutput(JSON.stringify(listarActasEscaneadas(data))).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "validarActaEscaneada") {
      return ContentService.createTextOutput(JSON.stringify(validarActaEscaneada(data))).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "resumenActasEscaneadas") {
      return ContentService.createTextOutput(JSON.stringify(resumenActasEscaneadas(data))).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarTiposPartidaActas") {
      return ContentService.createTextOutput(JSON.stringify(obtenerTiposPartidaActas(data))).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "registrarValidacionTecnica") {
      return ContentService
        .createTextOutput(JSON.stringify(registrarValidacionTecnica(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarValidacionTecnica") {
      return ContentService
        .createTextOutput(JSON.stringify(listarValidacionTecnica(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "validarValidacionTecnica") {
      return ContentService
        .createTextOutput(JSON.stringify(validarValidacionTecnica(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "procesarValidacionesTecnicasVencidas") {
      return ContentService
        .createTextOutput(JSON.stringify(procesarValidacionesTecnicasVencidas()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "crearTriggerValidacionTecnica") {
      return ContentService
        .createTextOutput(JSON.stringify(crearTriggerValidacionTecnica()))
        .setMimeType(ContentService.MimeType.JSON);
    }


    if (data.accion === "registrarActividadCampo") {
      return ContentService
        .createTextOutput(JSON.stringify(registrarActividadCampo(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarActividadCampo") {
      return ContentService
        .createTextOutput(JSON.stringify(listarActividadCampo(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "obtenerResumenActividadCampo") {
      return ContentService
        .createTextOutput(JSON.stringify(obtenerResumenActividadCampo(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarCuadrillasActividadCampo") {
      return ContentService
        .createTextOutput(JSON.stringify(listarCuadrillasActividadCampo(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "autorizarDriveActividadCampo") {
      return ContentService
        .createTextOutput(JSON.stringify(autorizarDriveActividadCampo()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "registrarObservacion") {
      return ContentService
        .createTextOutput(JSON.stringify(registrarObservacion(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarObservaciones") {
      return ContentService
        .createTextOutput(JSON.stringify(listarObservaciones(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "registrarDescargo") {
      return ContentService
        .createTextOutput(JSON.stringify(registrarDescargo(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "actualizarEstadoObservacion") {
      return ContentService
        .createTextOutput(JSON.stringify(actualizarEstadoObservacion(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "procesarEfectividad") {
      return ContentService
        .createTextOutput(JSON.stringify(procesarEfectividad(data.registros, data.periodo, data.actualizadoAl)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "procesarRecableado") {
      return ContentService
        .createTextOutput(JSON.stringify(procesarRecableado(data.registros, data.periodo, data.actualizadoAl)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (
      data.accion === "procesarVtrGar" ||
      data.accion === "procesarVTRGAR" ||
      data.accion === "procesarVtrgar"
    ) {
      return ContentService
        .createTextOutput(JSON.stringify(procesarVtrGar(data.registros, data.periodo, data.actualizadoAl)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "procesarUsuarios") {
      return ContentService
        .createTextOutput(JSON.stringify(procesarUsuarios(data.registros)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarCuadrillasObservacion") {
      return ContentService
        .createTextOutput(JSON.stringify(listarCuadrillasObservacion(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarUsuarios") {
      return ContentService
        .createTextOutput(JSON.stringify(listarUsuarios()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "editarUsuario") {
      return ContentService
        .createTextOutput(JSON.stringify(editarUsuario(data.usuario, data.cambios || {})))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "cambiarClave") {
      return ContentService
        .createTextOutput(JSON.stringify(cambiarClave(data.usuario, data.nuevaClave)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "cambiarEstadoUsuario") {
      return ContentService
        .createTextOutput(JSON.stringify(cambiarEstadoUsuario(data.usuario, data.estado)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "cambiarPermisoUsuario") {
      return ContentService
        .createTextOutput(JSON.stringify(cambiarPermisoUsuario(data.usuario, data.perfil, data.nivelAcceso)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "actualizarResumenObservaciones") {
      return ContentService
        .createTextOutput(JSON.stringify(actualizarResumenObservaciones()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "actualizarRanking") {
      return ContentService
        .createTextOutput(JSON.stringify(actualizarRanking(data.periodo, data.actualizadoAl)))
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

function autorizarDriveObservaciones() {

  const carpeta = DriveApp.getFolderById("1W23rJjyUgmYGTlG2NzrpvasIWbwKBV6h");

  const archivoPrueba = carpeta.createFile(
    "PRUEBA_PERMISO_MI_VISUAL.txt",
    "Permiso Drive autorizado correctamente para MI VISUAL"
  );

  Logger.log("Archivo creado: " + archivoPrueba.getUrl());

  archivoPrueba.setTrashed(true);

  Logger.log("Permiso completo Drive OK");
}

function autorizarDriveActasEscaneadas() {
  const carpeta = DriveApp.getFolderById("1EZALuMsXo_ZRO93FjKyuDgRmvAe2C69L");

  const archivoPrueba = carpeta.createFile(
    "PRUEBA_PERMISO_ACTAS_MI_VISUAL.txt",
    "Permiso Drive autorizado correctamente para Gestión de Actas - MI VISUAL"
  );

  const url = archivoPrueba.getUrl();
  archivoPrueba.setTrashed(true);

  Logger.log("Permiso Drive Actas OK: " + url);

  return {
    ok: true,
    modulo: "ACTAS_ESCANEADAS",
    carpeta: carpeta.getName(),
    url: carpeta.getUrl(),
    prueba: url
  };
}