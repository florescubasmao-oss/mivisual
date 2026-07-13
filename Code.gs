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
const HOJA_CHECKLIST_ALMACEN = "CHECKLIST_ALMACEN";
const CARPETA_CHECKLIST_ALMACEN = "1nL5if5dRs3y1_OpKfzu7N9BNjiSvXVgp";
const HOJA_CONFIG_MODULOS = "CONFIG_MODULOS";

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
        usuarioSupervisor: normalizarUsuario(datos[i][9]),
        nombresApellidos: (datos[i][10] || datos[i][0] || "").toString().trim()
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
  if (t === "OTRO") return "OTRO";
  throw new Error("Tipo de validación no válido. Usa RECABLEADO, GAR, VTR u OTRO");
}

function normalizarTipoTicketValidacion(tipoTicket) {
  const t = (tipoTicket || "").toString().toUpperCase().trim();
  const limpio = t.replace(/\s+/g, "");
  if (limpio === "NOAPLICA" || limpio === "NO APLICA") return "NO APLICA";
  if (["AT-", "VTEXT-", "GAR-", "VTR-"].includes(limpio)) return limpio;
  throw new Error("Tipo de ticket no válido");
}


function obtenerTipoValidacionPorTicket(tipoTicket) {
  const ticket = normalizarTipoTicketValidacion(tipoTicket);
  if (ticket === "AT-" || ticket === "VTEXT-") return "RECABLEADO";
  if (ticket === "GAR-") return "GAR";
  if (ticket === "VTR-") return "VTR";
  if (ticket === "NO APLICA") return "OTRO";
  throw new Error("No se pudo determinar el tipo de validación");
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

  return new Date(registro.getTime() + 12 * 60 * 1000);
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
      hoja.getRange(filaHoja, 20).setValue("Aprobación automática por no recibir respuesta dentro de los 12 minutos establecidos.");
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
  const tipoTicket = normalizarTipoTicketValidacion(data.tipoTicket || data.tipo_ticket);
  const tipoValidacion = obtenerTipoValidacionPorTicket(tipoTicket);
  const codigo = (data.codigo || "").toString().trim();
  const id = generarIdValidacionTecnica(codigo, tipoValidacion);

  if (existeValidacionTecnica(id)) {
    throw new Error("Ya existe una validación registrada con este código y tipo: " + id);
  }
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
    ? new Date(ahora.getTime() + 12 * 60 * 1000)
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

  if (tipo === "RECABLEADO" || tipo === "OTRO") {
    if (!(usuario.perfil === "SUPERVISOR" || esPerfilJefatura(usuario.perfil))) {
      throw new Error("Solo Supervisor o Jefatura pueden validar Recableado u Otro");
    }

    if (usuario.perfil === "SUPERVISOR" && normalizarTexto(usuario.sede) !== sedeCaso) {
      throw new Error("Supervisor solo puede validar solicitudes de su sede");
    }

    if (!["APROBADO", "RECHAZADO", "OBSERVADO"].includes(resultado)) {
      throw new Error("Resultado no válido para Recableado/Otro");
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
  if (!t && tipoPartida) t = esTipoInstalacionActa(tipoPartida) ? "INSTALACION" : "VISITA TECNICA";
  if (["INSTALACION", "INSTALACIÓN", "INSTALACIONES"].includes(t)) return "INSTALACION";
  if (["VISITA TECNICA", "VISITA TÉCNICA", "VISITA TECNICA/POSVENTA", "VISITA TÉCNICA/POSVENTA", "POSTVENTA", "POSVENTA"].includes(t)) return "VISITA TECNICA";
  throw new Error("Tipo de ejecución no válido. Usa INSTALACION o VISITA TECNICA");
}

function encabezadoActasEscaneadas() {
  return [[
    "ID","FECHA_REGISTRO","HORA_REGISTRO","SEDE","CUADRILLA","SUPERVISOR","TECNICO",
    "FECHA_GESTION","TIPO_EJECUCION","TIPO_PARTIDA","CODIGO_ORDEN","CODIGO_PEDIDO","NUMERO_ACTA",
    "DNI","CLIENTE","NOMBRE_ARCHIVO","LINK_ACTA","ESTADO","RESULTADO_ALMACEN","MOTIVO_ALMACEN",
    "VALIDADO_ALMACEN_POR","FECHA_VALIDACION_ALMACEN","HORA_VALIDACION_ALMACEN","RESULTADO_JEFATURA",
    "MOTIVO_JEFATURA","VALIDADO_JEFATURA_POR","FECHA_VALIDACION_JEFATURA","HORA_VALIDACION_JEFATURA",
    "VERSION","ESTADO_ENTREGA_FISICA","CONFIRMADO_FISICO_POR","PERFIL_CONFIRMACION_FISICA",
    "FECHA_CONFIRMACION_FISICA","HORA_CONFIRMACION_FISICA","MOTIVO_REVERSION_FISICA",
    "ORIGEN_REGISTRO","MOTIVO_ACTA_FALTANTE","REGISTRADO_FALTANTE_POR","FECHA_REGISTRO_FALTANTE","HORA_REGISTRO_FALTANTE"
  ]];
}

function asegurarHojaActasEscaneadas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ACTAS_ESCANEADAS);
  if (!hoja) hoja = ss.insertSheet(HOJA_ACTAS_ESCANEADAS);
  if (hoja.getLastRow() === 0 || !hoja.getRange(1, 1).getValue()) {
    hoja.getRange(1, 1, 1, 40).setValues(encabezadoActasEscaneadas());
  } else if (hoja.getLastColumn() >= 35) {
    hoja.getRange(1, 1, 1, 40).setValues(encabezadoActasEscaneadas());
  }
  return hoja;
}

function nombreCarpetaActa(txt) {
  return (txt || "").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|#%{}~&]+/g, " ").replace(/\s+/g, " ").trim().substring(0, 120);
}

function obtenerOCrearCarpetaActa(padre, nombre) {
  const n = nombreCarpetaActa(nombre || "SIN_DATO");
  const it = padre.getFoldersByName(n);
  return it.hasNext() ? it.next() : padre.createFolder(n);
}

function fechaGestionActaTexto(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const t = (valor || "").toString().trim();
  if (!t) throw new Error("Debe ingresar la fecha de gestión");
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const p = t.split("/");
  if (p.length === 3) return p[2] + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
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
  const filtro = data ? normalizarTexto(data.tipoEjecucion || data.tipo_ejecucion || "") : "";
  const vistos = {}, instalaciones = [], visitaTecnica = [];
  for (let i = 1; i < datos.length; i++) {
    const tipo = normalizarTexto(datos[i][1]);
    if (!tipo || vistos[tipo]) continue;
    vistos[tipo] = true;
    (esTipoInstalacionActa(tipo) ? instalaciones : visitaTecnica).push(tipo);
  }
  instalaciones.sort(); visitaTecnica.sort();
  let tipos = instalaciones.concat(visitaTecnica);
  if (["INSTALACION", "INSTALACIÓN", "INSTALACIONES"].includes(filtro)) tipos = instalaciones;
  if (["VISITA TECNICA", "VISITA TÉCNICA", "VISITA TECNICA/POSVENTA", "VISITA TÉCNICA/POSVENTA", "POSTVENTA", "POSVENTA"].includes(filtro)) tipos = visitaTecnica;
  return {ok:true, modulo:"ACTAS", accion:"TIPOS_PARTIDA", tipos, instalaciones, visitaTecnica};
}

function buscarFilaActaPorPedido(codigoPedido) {
  const hoja = asegurarHojaActasEscaneadas();
  const datos = hoja.getDataRange().getValues();
  const pedido = limpiarNombreArchivo(codigoPedido);
  for (let i = 1; i < datos.length; i++) {
    const obj = filaActaAObjeto(datos[i]);
    if (limpiarNombreArchivo(obj.codigoPedido) === pedido) return {hoja, fila:i+1, datos:datos[i], objeto:obj};
  }
  return null;
}

function extraerIdArchivoDrive(url) {
  const texto = (url || "").toString();
  let m = texto.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  m = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m && m[1] ? m[1] : "";
}

function enviarArchivoAnteriorActaPapelera(linkActa) {
  const idArchivo = extraerIdArchivoDrive(linkActa);
  if (!idArchivo) return false;
  try { DriveApp.getFileById(idArchivo).setTrashed(true); return true; } catch (e) { return false; }
}

function guardarPdfActaDrive(data, sede, cuadrilla, tipoEjecucion, fechaGestion, nombreArchivo) {
  if (!data.archivoBase64) throw new Error("Debe adjuntar el acta en PDF");
  const mime = (data.archivoMimeType || data.mime || "").toString().toLowerCase();
  const original = (data.archivoNombre || data.nombreArchivo || "").toString().toLowerCase();
  if (mime !== "application/pdf" && !original.endsWith(".pdf")) throw new Error("Solo se permite subir archivos PDF");
  const raiz = DriveApp.getFolderById(CARPETA_ACTAS_ESCANEADAS);
  const carpetaFecha = obtenerOCrearCarpetaActa(obtenerOCrearCarpetaActa(obtenerOCrearCarpetaActa(obtenerOCrearCarpetaActa(raiz, sede), cuadrilla), tipoEjecucion), fechaGestion);
  const duplicados = carpetaFecha.getFilesByName(nombreArchivo);
  while (duplicados.hasNext()) duplicados.next().setTrashed(true);
  const blob = Utilities.newBlob(Utilities.base64Decode(data.archivoBase64), "application/pdf", nombreArchivo);
  const archivo = carpetaFecha.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}

function obtenerValorActaCompat(fila, nombreCampo) {
  const actual = {id:0,fechaRegistro:1,horaRegistro:2,sede:3,cuadrilla:4,supervisor:5,tecnico:6,fechaGestion:7,tipoEjecucion:8,tipoPartida:9,codigoOrden:10,codigoPedido:11,numeroActa:12,dni:13,cliente:14,nombreArchivo:15,linkActa:16,estado:17,resultadoAlmacen:18,motivoAlmacen:19,validadoAlmacenPor:20,fechaValidacionAlmacen:21,horaValidacionAlmacen:22,resultadoJefatura:23,motivoJefatura:24,validadoJefaturaPor:25,fechaValidacionJefatura:26,horaValidacionJefatura:27,version:28,estadoEntregaFisica:29,confirmadoFisicoPor:30,perfilConfirmacionFisica:31,fechaConfirmacionFisica:32,horaConfirmacionFisica:33,motivoReversionFisica:34,origenRegistro:35,motivoActaFaltante:36,registradoFaltantePor:37,fechaRegistroFaltante:38,horaRegistroFaltante:39};
  const anterior28 = {id:0,fechaRegistro:1,horaRegistro:2,sede:3,cuadrilla:4,supervisor:5,tecnico:6,fechaGestion:7,tipoEjecucion:8,tipoPartida:9,codigoOrden:10,codigoPedido:11,dni:12,cliente:13,nombreArchivo:14,linkActa:15,estado:16,resultadoAlmacen:17,motivoAlmacen:18,validadoAlmacenPor:19,fechaValidacionAlmacen:20,horaValidacionAlmacen:21,resultadoJefatura:22,motivoJefatura:23,validadoJefaturaPor:24,fechaValidacionJefatura:25,horaValidacionJefatura:26,version:27};
  const antigua22 = {id:0,fechaRegistro:1,horaRegistro:2,sede:3,cuadrilla:4,supervisor:5,tecnico:6,fechaGestion:7,tipoPartida:8,codigoOrden:9,codigoPedido:10,dni:11,cliente:12,nombreArchivo:13,linkActa:14,estado:15,resultadoJefatura:16,motivoJefatura:17,validadoJefaturaPor:18,fechaValidacionJefatura:19,horaValidacionJefatura:20,version:21};
  const mapa = fila.length >= 40 ? actual : (fila.length >= 28 ? anterior28 : antigua22);
  const idx = mapa[nombreCampo];
  return idx === undefined ? "" : fila[idx];
}

function registrarActaEscaneada(data) {
  const hoja = asegurarHojaActasEscaneadas();
  const usuario = obtenerUsuarioApp(data.usuario);
  if (usuario.perfil !== "TECNICO") throw new Error("Solo el técnico puede registrar actas");
  const cuadrilla = normalizarCuadrilla(usuario.cuadrilla);
  if (!cuadrilla) throw new Error("El técnico no tiene cuadrilla asignada");
  const dc = obtenerDatosCuadrillaApp(cuadrilla);
  const sede = dc.sede || usuario.sede;
  const supervisor = dc.usuarioSupervisor || usuario.usuarioSupervisor || "";
  const fechaGestion = fechaGestionActaTexto(data.fechaGestion || data.fecha_gestion);
  const tipoPartida = normalizarTexto(data.tipoPartida || data.tipo_partida);
  if (!tipoPartida) throw new Error("Debe seleccionar el tipo de partida");
  const tipoEjecucion = normalizarTipoEjecucionActa(data.tipoEjecucion || data.tipo_ejecucion, tipoPartida);
  if (tipoEjecucion === "INSTALACION" && !esTipoInstalacionActa(tipoPartida)) throw new Error("Para INSTALACION solo corresponde seleccionar partidas de instalación y activación");
  if (tipoEjecucion === "VISITA TECNICA" && esTipoInstalacionActa(tipoPartida)) throw new Error("Para VISITA TECNICA/POSVENTA no corresponde seleccionar partidas de instalación");
  const codigoOrden = (data.codigoOrden || data.codigo_orden || "").toString().trim();
  const codigoPedido = (data.codigoPedido || data.codigo_pedido || "").toString().trim();
  const numeroActa = (data.numeroActa || data.numero_acta || "").toString().trim();
  const dni = (data.dni || "").toString().trim();
  const cliente = (data.cliente || "").toString().trim().toUpperCase();
  if (!codigoOrden) throw new Error("Debe ingresar el código de orden");
  if (!codigoPedido) throw new Error("Debe ingresar el código de pedido");
  if (!numeroActa) throw new Error("Debe ingresar el número de acta");
  if (!dni) throw new Error("Debe ingresar el DNI");
  if (!cliente) throw new Error("Debe ingresar el cliente");
  const existente = buscarFilaActaPorPedido(codigoPedido);
  if (existente) {
    const obj = existente.objeto || filaActaAObjeto(existente.datos);
    const esFaltantePendiente = normalizarTexto(obj.origenRegistro) === "ALMACEN" && !obj.linkActa;
    if (normalizarTexto(obj.estado) === "FINALIZADO" || normalizarTexto(obj.resultadoJefatura) === "CORRECTO") throw new Error("Esta acta ya está FINALIZADA. No se puede volver a subir.");
    if (!esFaltantePendiente && !(normalizarTexto(obj.resultadoAlmacen) === "OBSERVADO" || normalizarTexto(obj.resultadoJefatura) === "OBSERVADO")) throw new Error("Ya existe una acta pendiente para este Código de Pedido. Solo se puede completar si fue registrada como faltante o reemplazar cuando esté OBSERVADA.");
    if (obj.linkActa) enviarArchivoAnteriorActaPapelera(obj.linkActa);
  }
  const anterior = existente ? (existente.objeto || filaActaAObjeto(existente.datos)) : {};
  const version = (Number(anterior.version) || 0) + 1;
  const nombreArchivo = limpiarNombreArchivo(codigoPedido) + ".pdf";
  const link = guardarPdfActaDrive(data, sede, cuadrilla, tipoEjecucion, fechaGestion, nombreArchivo);
  const ahora = new Date();
  const filaValores = [
    generarIdActa(codigoPedido), Utilities.formatDate(ahora, Session.getScriptTimeZone(), "dd/MM/yyyy"), Utilities.formatDate(ahora, Session.getScriptTimeZone(), "HH:mm:ss"),
    sede, cuadrilla, supervisor, usuario.usuario, fechaGestion, tipoEjecucion, tipoPartida, codigoOrden, codigoPedido, numeroActa,
    dni, cliente, nombreArchivo, link, "PENDIENTE", "", "", "", "", "", "", "", "", "", "", version,
    anterior.estadoEntregaFisica || "PENDIENTE", anterior.confirmadoFisicoPor || "", anterior.perfilConfirmacionFisica || "",
    anterior.fechaConfirmacionFisica || "", anterior.horaConfirmacionFisica || "", anterior.motivoReversionFisica || "",
    anterior.origenRegistro || "TECNICO", anterior.motivoActaFaltante || "", anterior.registradoFaltantePor || "",
    anterior.fechaRegistroFaltante || "", anterior.horaRegistroFaltante || ""
  ];
  if (existente) hoja.getRange(existente.fila, 1, 1, 40).setValues([filaValores]); else hoja.appendRow(filaValores);
  return {ok:true, modulo:"ACTAS", accion:existente?"REEMPLAZAR":"REGISTRAR", id:filaValores[0], estado:"PENDIENTE", estadoEntregaFisica:filaValores[29], numeroActa, tipoEjecucion, tipoPartida, version, linkActa:link, nombreArchivo};
}

function filaActaAObjeto(fila) {
  const g = n => obtenerValorActaCompat(fila,n);
  const tipoPartida = g("tipoPartida");
  const tipoEjecucion = g("tipoEjecucion") || normalizarTipoEjecucionActa("", tipoPartida);
  const resultadoAlmacen = g("resultadoAlmacen"), resultadoJefatura = g("resultadoJefatura"), estado = g("estado");
  let estadoVisibleTecnico = "PENDIENTE";
  if (normalizarTexto(resultadoJefatura) === "CORRECTO" || normalizarTexto(estado) === "FINALIZADO") estadoVisibleTecnico = "FINALIZADO";
  else if (normalizarTexto(resultadoJefatura) === "OBSERVADO" || normalizarTexto(resultadoAlmacen) === "OBSERVADO") estadoVisibleTecnico = "OBSERVADO";
  return {
    id:g("id"),fechaRegistro:g("fechaRegistro"),horaRegistro:g("horaRegistro"),sede:g("sede"),cuadrilla:g("cuadrilla"),supervisor:g("supervisor"),tecnico:g("tecnico"),fechaGestion:g("fechaGestion"),tipoEjecucion,tipoPartida,codigoOrden:g("codigoOrden"),codigoPedido:g("codigoPedido"),numeroActa:g("numeroActa"),dni:g("dni"),cliente:g("cliente"),nombreArchivo:g("nombreArchivo"),linkActa:g("linkActa"),estado,estadoVisibleTecnico,resultadoAlmacen,motivoAlmacen:g("motivoAlmacen"),validadoAlmacenPor:g("validadoAlmacenPor"),fechaValidacionAlmacen:g("fechaValidacionAlmacen"),horaValidacionAlmacen:g("horaValidacionAlmacen"),resultadoJefatura,motivoJefatura:g("motivoJefatura"),validadoJefaturaPor:g("validadoJefaturaPor"),fechaValidacionJefatura:g("fechaValidacionJefatura"),horaValidacionJefatura:g("horaValidacionJefatura"),version:g("version"),estadoEntregaFisica:g("estadoEntregaFisica")||"PENDIENTE",confirmadoFisicoPor:g("confirmadoFisicoPor"),perfilConfirmacionFisica:g("perfilConfirmacionFisica"),fechaConfirmacionFisica:g("fechaConfirmacionFisica"),horaConfirmacionFisica:g("horaConfirmacionFisica"),motivoReversionFisica:g("motivoReversionFisica"),origenRegistro:g("origenRegistro")||"TECNICO",motivoActaFaltante:g("motivoActaFaltante"),registradoFaltantePor:g("registradoFaltantePor"),fechaRegistroFaltante:g("fechaRegistroFaltante"),horaRegistroFaltante:g("horaRegistroFaltante"),esActaFaltante:normalizarTexto(g("origenRegistro"))==="ALMACEN"&&!g("linkActa"),resultadoValidacion:resultadoJefatura||resultadoAlmacen,motivoObservacion:g("motivoJefatura")||g("motivoAlmacen"),validadoPor:g("validadoJefaturaPor")||g("validadoAlmacenPor")
  };
}

function listarActasEscaneadas(data) {
  const hoja = asegurarHojaActasEscaneadas(), datos = hoja.getDataRange().getValues(), usuario = obtenerUsuarioApp(data.usuario), lista=[];
  for (let i=1;i<datos.length;i++) {
    const item=filaActaAObjeto(datos[i]); let permitir=false;
    if(usuario.perfil==="TECNICO") permitir=normalizarCuadrilla(usuario.cuadrilla)===normalizarCuadrilla(item.cuadrilla);
    if(usuario.perfil==="SUPERVISOR") permitir=normalizarTexto(usuario.sede)===normalizarTexto(item.sede);
    if(esPerfilAlmacen(usuario.perfil)) permitir=normalizarTexto(usuario.sede)===normalizarTexto(item.sede);
    if(esPerfilJefatura(usuario.perfil)||esPerfilJefaturaAlmacen(usuario.perfil)) permitir=true;
    if(!permitir) continue;
    if(data.sede&&normalizarTexto(data.sede)!==normalizarTexto(item.sede)) continue;
    if(data.cuadrilla&&normalizarCuadrilla(data.cuadrilla)!==normalizarCuadrilla(item.cuadrilla)) continue;
    if(data.estado&&normalizarTexto(data.estado)!==normalizarTexto(item.estado)) continue;
    if(data.tipoEjecucion&&normalizarTexto(data.tipoEjecucion)!==normalizarTexto(item.tipoEjecucion)) continue;
    lista.push(item);
  }
  lista.reverse();
  return {ok:true,modulo:"ACTAS",accion:"LISTAR",perfil:usuario.perfil,registros:lista.length,actas:lista};
}

function buscarActaPorId(id) {
  const hoja=asegurarHojaActasEscaneadas(), datos=hoja.getDataRange().getValues();
  for(let i=1;i<datos.length;i++){const obj=filaActaAObjeto(datos[i]);if((obj.id||"").toString().trim()===id.toString().trim())return {hoja,fila:i+1,item:obj};}
  throw new Error("No se encontró el acta: "+id);
}

function validarActaEscaneada(data) {
  const usuario=obtenerUsuarioApp(data.usuario), id=(data.id||"").toString().trim(), resultado=normalizarTexto(data.resultado), motivo=(data.motivoObservacion||data.motivo||"").toString().trim();
  if(!id) throw new Error("ID obligatorio");
  if(!["CORRECTO","OBSERVADO"].includes(resultado)) throw new Error("Resultado no válido");
  if(resultado==="OBSERVADO"&&!motivo) throw new Error("Debe ingresar el motivo de observación");
  if(!(esPerfilAlmacen(usuario.perfil)||esPerfilJefaturaAlmacen(usuario.perfil))) throw new Error("Solo Almacén o Jefatura Almacén pueden validar actas");
  const e=buscarActaPorId(id), hoja=e.hoja, fila=e.fila, item=e.item, ahora=new Date();
  if (!item.linkActa) throw new Error("El técnico aún no ha subido el PDF del acta faltante");
  if(esPerfilAlmacen(usuario.perfil)&&normalizarTexto(usuario.sede)!==normalizarTexto(item.sede)) throw new Error("Almacén solo puede validar actas de su sede");
  if(esPerfilAlmacen(usuario.perfil)) {
    hoja.getRange(fila,19).setValue(resultado); hoja.getRange(fila,20).setValue(resultado==="OBSERVADO"?motivo:""); hoja.getRange(fila,21).setValue(usuario.usuario); hoja.getRange(fila,22).setValue(ahora); hoja.getRange(fila,23).setValue(ahora); hoja.getRange(fila,22).setNumberFormat("dd/mm/yyyy"); hoja.getRange(fila,23).setNumberFormat("hh:mm:ss"); hoja.getRange(fila,18).setValue("PENDIENTE");
    return {ok:true,modulo:"ACTAS",accion:"VALIDAR_ALMACEN",id,resultado,estado:"PENDIENTE"};
  }
  hoja.getRange(fila,24).setValue(resultado); hoja.getRange(fila,25).setValue(resultado==="OBSERVADO"?motivo:""); hoja.getRange(fila,26).setValue(usuario.usuario); hoja.getRange(fila,27).setValue(ahora); hoja.getRange(fila,28).setValue(ahora); hoja.getRange(fila,27).setNumberFormat("dd/mm/yyyy"); hoja.getRange(fila,28).setNumberFormat("hh:mm:ss"); hoja.getRange(fila,18).setValue(resultado==="CORRECTO"?"FINALIZADO":"PENDIENTE");
  return {ok:true,modulo:"ACTAS",accion:"VALIDAR_JEFATURA",id,resultado,estado:resultado==="CORRECTO"?"FINALIZADO":"PENDIENTE"};
}

function actualizarEntregaFisicaActa(data) {
  const usuario=obtenerUsuarioApp(data.usuario), id=(data.id||"").toString().trim(), estado=normalizarTexto(data.estado), motivo=(data.motivoReversion||data.motivo||"").toString().trim();
  if(!id) throw new Error("ID obligatorio");
  if(!["PENDIENTE","ENTREGADA"].includes(estado)) throw new Error("Estado de entrega física no válido");
  if(!(esPerfilAlmacen(usuario.perfil)||esPerfilJefaturaAlmacen(usuario.perfil))) throw new Error("Solo Almacén o Jefatura Almacén pueden gestionar la entrega física");
  const e=buscarActaPorId(id), hoja=e.hoja, fila=e.fila, item=e.item;
  if (!item.linkActa) throw new Error("El técnico aún no ha completado el acta faltante");
  if(esPerfilAlmacen(usuario.perfil)&&normalizarTexto(usuario.sede)!==normalizarTexto(item.sede)) throw new Error("Almacén solo puede gestionar actas de su sede");
  if(estado==="PENDIENTE"&&!esPerfilJefaturaAlmacen(usuario.perfil)) throw new Error("Solo Jefatura de Almacén puede regresar una entrega a pendiente");
  if(estado==="PENDIENTE"&&!motivo) throw new Error("Debe ingresar el motivo de reversión");
  if(esPerfilAlmacen(usuario.perfil)&&normalizarTexto(item.estadoEntregaFisica)==="ENTREGADA") throw new Error("La entrega ya fue confirmada. Solo Jefatura de Almacén puede revertirla");
  const ahora=new Date();
  hoja.getRange(fila,30).setValue(estado);
  hoja.getRange(fila,31).setValue(usuario.usuario);
  hoja.getRange(fila,32).setValue(usuario.perfil);
  hoja.getRange(fila,33).setValue(ahora);
  hoja.getRange(fila,34).setValue(ahora);
  hoja.getRange(fila,35).setValue(estado==="PENDIENTE"?motivo:"");
  hoja.getRange(fila,33).setNumberFormat("dd/mm/yyyy"); hoja.getRange(fila,34).setNumberFormat("hh:mm:ss");
  return {ok:true,modulo:"ACTAS",accion:"ENTREGA_FISICA",id,estado,confirmadoPor:usuario.usuario,perfil:usuario.perfil};
}


function listarCuadrillasActasFaltantes(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!(esPerfilAlmacen(usuario.perfil) || esPerfilJefaturaAlmacen(usuario.perfil))) {
    throw new Error("Solo Almacén o Jefatura Almacén pueden consultar cuadrillas");
  }
  const mapa = obtenerMapaUsuarios();
  const lista = [];
  Object.keys(mapa).forEach(c => {
    const item = mapa[c] || {};
    const cuad = normalizarCuadrilla(c);
    const sede = normalizarTexto(item.sede || "");
    if (!cuad || normalizarTexto(item.perfil) !== "TECNICO") return;
    if (normalizarTexto(item.estado || "ACTIVO") !== "ACTIVO") return;
    if (esPerfilAlmacen(usuario.perfil) && sede !== normalizarTexto(usuario.sede)) return;
    lista.push({cuadrilla:cuad,sede,supervisor:item.usuarioSupervisor||"",tecnico:item.usuario||""});
  });
  lista.sort((a,b)=>a.sede.localeCompare(b.sede)||a.cuadrilla.localeCompare(b.cuadrilla));
  return {ok:true,modulo:"ACTAS",accion:"LISTAR_CUADRILLAS_FALTANTES",cuadrillas:lista};
}

function registrarActaFaltante(data) {
  const hoja = asegurarHojaActasEscaneadas();
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!(esPerfilAlmacen(usuario.perfil) || esPerfilJefaturaAlmacen(usuario.perfil))) {
    throw new Error("Solo Almacén o Jefatura Almacén pueden registrar actas faltantes");
  }
  const cuadrilla = normalizarCuadrilla(data.cuadrilla);
  if (!cuadrilla) throw new Error("Debe seleccionar una cuadrilla");
  const dc = obtenerDatosCuadrillaApp(cuadrilla);
  const sede = normalizarTexto(dc.sede || "");
  if (esPerfilAlmacen(usuario.perfil) && sede !== normalizarTexto(usuario.sede)) {
    throw new Error("Almacén solo puede registrar faltantes de su sede");
  }
  const fechaGestion = fechaGestionActaTexto(data.fechaGestion || data.fecha_gestion);
  const tipoPartida = normalizarTexto(data.tipoPartida || data.tipo_partida);
  if (!tipoPartida) throw new Error("Debe seleccionar el tipo de partida");
  const tipoEjecucion = normalizarTipoEjecucionActa(data.tipoEjecucion || data.tipo_ejecucion, tipoPartida);
  const codigoOrden = (data.codigoOrden || data.codigo_orden || "").toString().trim();
  const codigoPedido = (data.codigoPedido || data.codigo_pedido || "").toString().trim();
  const numeroActa = (data.numeroActa || data.numero_acta || "").toString().trim();
  const motivo = (data.motivoActaFaltante || data.motivo || "").toString().trim();
  if (!codigoOrden) throw new Error("Debe ingresar el código de orden");
  if (!codigoPedido) throw new Error("Debe ingresar el código de pedido");
  if (!motivo) throw new Error("Debe ingresar el motivo del acta faltante");
  if (buscarFilaActaPorPedido(codigoPedido)) throw new Error("Ya existe un registro para este Código de Pedido");
  const ahora = new Date();
  const fila = [
    generarIdActa(codigoPedido),Utilities.formatDate(ahora,Session.getScriptTimeZone(),"dd/MM/yyyy"),Utilities.formatDate(ahora,Session.getScriptTimeZone(),"HH:mm:ss"),
    sede,cuadrilla,dc.usuarioSupervisor||"",dc.usuario||"",fechaGestion,tipoEjecucion,tipoPartida,codigoOrden,codigoPedido,numeroActa,
    "","","","","PENDIENTE","","","","","","","","","","",0,
    "PENDIENTE","","","","","","ALMACEN",motivo,usuario.usuario,ahora,ahora
  ];
  hoja.appendRow(fila);
  const n = hoja.getLastRow();
  hoja.getRange(n,39).setNumberFormat("dd/mm/yyyy");
  hoja.getRange(n,40).setNumberFormat("hh:mm:ss");
  return {ok:true,modulo:"ACTAS",accion:"REGISTRAR_FALTANTE",id:fila[0],codigoPedido,cuadrilla,sede};
}

function resumenActasEscaneadas(data) {
  const listado=listarActasEscaneadas(data);
  const base=()=>({escaneadas:0,finalizadas:0,observadas:0,pendientes:0,correctasAlmacen:0,observadasAlmacen:0,correctasJefatura:0,observadasJefatura:0,entregadasFisicas:0,pendientesEntregaFisica:0});
  const general=base(), sedes={}, cuadrillas={};
  listado.actas.forEach(a=>{
    const sede=normalizarTexto(a.sede)||"SIN SEDE", cuad=normalizarCuadrilla(a.cuadrilla)||"SIN CUADRILLA", estado=normalizarTexto(a.estado), ra=normalizarTexto(a.resultadoAlmacen), rj=normalizarTexto(a.resultadoJefatura), ef=normalizarTexto(a.estadoEntregaFisica||"PENDIENTE"), observado=ra==="OBSERVADO"||rj==="OBSERVADO";
    function sumar(o){o.escaneadas++;if(estado==="FINALIZADO"||rj==="CORRECTO")o.finalizadas++;if(observado)o.observadas++;if(estado==="PENDIENTE")o.pendientes++;if(ra==="CORRECTO")o.correctasAlmacen++;if(ra==="OBSERVADO")o.observadasAlmacen++;if(rj==="CORRECTO")o.correctasJefatura++;if(rj==="OBSERVADO")o.observadasJefatura++;if(ef==="ENTREGADA")o.entregadasFisicas++;else o.pendientesEntregaFisica++;}
    sumar(general);
    if(!sedes[sede]) sedes[sede]=Object.assign({sede},base());
    if(!cuadrillas[cuad]) cuadrillas[cuad]=Object.assign({sede,cuadrilla:cuad},base());
    sumar(sedes[sede]); sumar(cuadrillas[cuad]);
  });
  return {ok:true,modulo:"ACTAS",accion:"RESUMEN",general,sedes:Object.keys(sedes).sort().map(k=>sedes[k]),cuadrillas:Object.keys(cuadrillas).sort().map(k=>cuadrillas[k])};
}




/* =========================
   CHECKLIST ALMACÉN
========================= */

function encabezadoChecklistAlmacen() {
  return [[
    "ID","FECHA_REGISTRO","HORA_REGISTRO","USUARIO","NOMBRES_APELLIDOS","SEDE","CUADRILLA","FECHA_GESTION","ESTADO_GENERAL",
    "ONT ZTE","FOTOS SERIES ONT ZTE","ONT HUAWEI","FOTOS SERIES ONT HUAWEI",
    "MESH/REPETIDOR ZTE","FOTO MESH/REPETIDOR ZTE","MESH/REPETIDOR HUAWEI","FOTO MESH/REPETIDOR HUAWEI",
    "WINBOX","FOTO WINBOX","FONOWIN","FOTO FONOWIN","CABLE DROP/BOBINA","PRECONECTORIZADO 50m","PRECONECTORIZADO 100m",
    "PRECONECTORIZADO 150m","PRECONECTORIZADO 200m","ANCLAJE P","CINTA BAND-IT","HEBILLA 3/4","ACOPLADOR","ROSETA",
    "CONECTORES OPTICOS","TEMPLADORES","SPLITTER","CLEVIS","CABLE UTP CAT5","CABLE UTP CAT6","PATCHCORD APC-APC",
    "PATCHCORD UPC-APC","CONECTOR RJ45","RESULTADO_ALMACEN","MOTIVO_ALMACEN","VALIDADO_ALMACEN_POR","FECHA_VALIDACION_ALMACEN",
    "HORA_VALIDACION_ALMACEN","RESULTADO_JEFATURA","MOTIVO_JEFATURA","VALIDADO_JEFATURA_POR","FECHA_VALIDACION_JEFATURA",
    "HORA_VALIDACION_JEFATURA","VERSION"
  ]];
}

function asegurarHojaChecklistAlmacen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_CHECKLIST_ALMACEN);
  if (!hoja) hoja = ss.insertSheet(HOJA_CHECKLIST_ALMACEN);
  if (hoja.getLastRow() === 0 || !hoja.getRange(1, 1).getValue()) {
    hoja.getRange(1, 1, 1, 51).setValues(encabezadoChecklistAlmacen());
  }
  return hoja;
}

function idChecklistAlmacen() {
  return "CHK-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "-" + Math.floor(Math.random()*900+100);
}

function numeroChecklist(valor) {
  const n = Number(valor);
  return isFinite(n) && n >= 0 ? n : 0;
}

function carpetaChecklistSegura(txt) {
  return (txt || "SIN_DATO").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|#%{}~&]+/g, " ").replace(/\s+/g, " ").trim().substring(0, 120);
}

function obtenerOCrearCarpetaChecklist(padre, nombre) {
  const n = carpetaChecklistSegura(nombre);
  const it = padre.getFoldersByName(n);
  return it.hasNext() ? it.next() : padre.createFolder(n);
}

function limpiarSerieChecklist(txt) {
  return (txt || "").toString().trim().replace(/\s+/g, " ");
}

function guardarEquiposChecklist(carpetaFecha, categoria, id, equipos, maximo) {
  if (!Array.isArray(equipos) || equipos.length === 0) return { series: "", links: "" };
  if (equipos.length > maximo) throw new Error("Máximo " + maximo + " equipos para " + categoria);
  const carpeta = obtenerOCrearCarpetaChecklist(carpetaFecha, categoria);
  const series = [];
  const links = [];
  equipos.forEach((equipo, i) => {
    const serie = limpiarSerieChecklist(equipo && equipo.serie);
    const foto = equipo && equipo.foto;
    if (!serie && (!foto || !foto.base64)) return;
    if (!serie) throw new Error("Debe ingresar la serie o código de " + categoria);
    if (!foto || !foto.base64) throw new Error("Debe subir la foto de " + categoria + " - " + serie);
    const original = (foto.nombre || "foto.jpg").toString();
    const ext = original.includes(".") ? original.split(".").pop().toLowerCase() : "jpg";
    const serieArchivo = limpiarNombreArchivo(serie).substring(0, 45) || String(i + 1).padStart(2, "0");
    const nombre = id + "_" + categoria + "_" + String(i + 1).padStart(2, "0") + "_" + serieArchivo + "." + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(foto.base64), foto.mime || "image/jpeg", nombre);
    const archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    series.push(serie);
    links.push(archivo.getUrl());
  });
  return { series: series.join(" | "), links: links.join("|") };
}


function obtenerEquiposChecklistEntrada(data, clave) {
  const directo = data ? data[clave + "Equipos"] : null;
  if (Array.isArray(directo)) return directo;
  if (data && data.equipos && Array.isArray(data.equipos[clave])) return data.equipos[clave];
  return [];
}



/* =========================
   CONFIGURACIÓN DE MÓDULOS
   Primera implementación: CHECKLIST_ALMACEN
========================= */

function asegurarHojaConfigModulos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_CONFIG_MODULOS);
  if (!hoja) hoja = ss.insertSheet(HOJA_CONFIG_MODULOS);
  const encabezado = [["MODULO","ESTADO","FECHA_INICIO","FECHA_FIN","ACTUALIZADO_POR","FECHA_ACTUALIZACION","HORA_ACTUALIZACION"]];
  if (hoja.getLastRow() === 0 || !hoja.getRange(1,1).getValue()) hoja.getRange(1,1,1,7).setValues(encabezado);
  return hoja;
}

function fechaConfigTexto(valor) {
  if (!valor) return "";
  if (valor instanceof Date && !isNaN(valor.getTime())) return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const t = valor.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const p = t.split("/");
  if (p.length === 3) return p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
  return "";
}

function obtenerFilaConfigModulo(modulo) {
  const hoja = asegurarHojaConfigModulos();
  const datos = hoja.getDataRange().getValues();
  const buscado = normalizarTexto(modulo);
  for (let i=1;i<datos.length;i++) {
    if (normalizarTexto(datos[i][0]) === buscado) return {hoja, fila:i+1, datos:datos[i]};
  }
  return null;
}

function evaluarConfigModulo(estado, fechaInicio, fechaFin) {
  const e = normalizarTexto(estado || "HABILITADO");
  const inicio = fechaConfigTexto(fechaInicio);
  const fin = fechaConfigTexto(fechaFin);
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  let activo = e === "HABILITADO";
  if (activo && inicio && hoy < inicio) activo = false;
  if (activo && fin && hoy > fin) activo = false;
  return {estado:e, fechaInicio:inicio, fechaFin:fin, hoy, activo};
}

function obtenerConfiguracionChecklistAlmacen(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  let encontrado = obtenerFilaConfigModulo("CHECKLIST_ALMACEN");
  if (!encontrado) {
    const hoja = asegurarHojaConfigModulos();
    hoja.appendRow(["CHECKLIST_ALMACEN","HABILITADO","","","SISTEMA",new Date(),new Date()]);
    const fila = hoja.getLastRow();
    hoja.getRange(fila,6).setNumberFormat("dd/mm/yyyy");
    hoja.getRange(fila,7).setNumberFormat("hh:mm:ss");
    encontrado = obtenerFilaConfigModulo("CHECKLIST_ALMACEN");
  }
  const d = encontrado.datos;
  const cfg = evaluarConfigModulo(d[1], d[2], d[3]);
  return {ok:true,modulo:"CHECKLIST_ALMACEN",accion:"OBTENER_CONFIGURACION",perfil:usuario.perfil,configuracion:cfg};
}

function guardarConfiguracionChecklistAlmacen(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!esPerfilJefatura(usuario.perfil)) throw new Error("Solo Jefatura puede habilitar o deshabilitar el Checklist Almacén");
  const estado = normalizarTexto(data.estado || "HABILITADO");
  if (!["HABILITADO","DESHABILITADO"].includes(estado)) throw new Error("Estado no válido");
  const inicio = fechaConfigTexto(data.fechaInicio);
  const fin = fechaConfigTexto(data.fechaFin);
  if (inicio && fin && inicio > fin) throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin");
  const hoja = asegurarHojaConfigModulos();
  const encontrado = obtenerFilaConfigModulo("CHECKLIST_ALMACEN");
  const ahora = new Date();
  const valores = [["CHECKLIST_ALMACEN",estado,inicio,fin,usuario.usuario,ahora,ahora]];
  let fila;
  if (encontrado) {fila=encontrado.fila;hoja.getRange(fila,1,1,7).setValues(valores);} else {hoja.appendRow(valores[0]);fila=hoja.getLastRow();}
  hoja.getRange(fila,6).setNumberFormat("dd/mm/yyyy");
  hoja.getRange(fila,7).setNumberFormat("hh:mm:ss");
  return {ok:true,modulo:"CHECKLIST_ALMACEN",accion:"GUARDAR_CONFIGURACION",configuracion:evaluarConfigModulo(estado,inicio,fin)};
}

function checklistAlmacenActivo() {
  let encontrado = obtenerFilaConfigModulo("CHECKLIST_ALMACEN");
  if (!encontrado) return true;
  return evaluarConfigModulo(encontrado.datos[1], encontrado.datos[2], encontrado.datos[3]).activo;
}

function buscarChecklistDuplicado(cuadrilla, fechaGestion) {
  const hoja = asegurarHojaChecklistAlmacen();
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return null;

  const datos = hoja.getRange(2, 1, ultimaFila - 1, 9).getValues();
  const cuadrillaBuscada = normalizarCuadrilla(cuadrilla);
  const fechaBuscada = fechaGestionActaTexto(fechaGestion);

  for (let i = 0; i < datos.length; i++) {
    const cuadrillaFila = normalizarCuadrilla(datos[i][6]);
    const fechaFila = fechaGestionActaTexto(datos[i][7]);
    if (cuadrillaFila === cuadrillaBuscada && fechaFila === fechaBuscada) {
      return {
        fila: i + 2,
        id: datos[i][0],
        estado: datos[i][8] || ""
      };
    }
  }
  return null;
}

function registrarChecklistAlmacen(data) {
  if (!checklistAlmacenActivo()) throw new Error("El Checklist Almacén no está habilitado para nuevos registros en este periodo");
  const hoja = asegurarHojaChecklistAlmacen();
  const usuario = obtenerUsuarioApp(data.usuario);
  if (usuario.perfil !== "TECNICO") throw new Error("Solo el técnico puede registrar el checklist");
  const cuadrilla = normalizarCuadrilla(usuario.cuadrilla);
  if (!cuadrilla) throw new Error("El técnico no tiene cuadrilla asignada");
  const dc = obtenerDatosCuadrillaApp(cuadrilla);
  const sede = normalizarTexto(dc.sede || usuario.sede);
  const fechaGestion = fechaGestionActaTexto(data.fechaGestion || data.fecha_gestion);
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  try {
    const duplicado = buscarChecklistDuplicado(cuadrilla, fechaGestion);
    if (duplicado) {
      throw new Error("Ya existe un checklist registrado para esta cuadrilla y fecha de gestión. No vuelva a presionar Guardar.");
    }
  const id = idChecklistAlmacen();
  const raiz = DriveApp.getFolderById(CARPETA_CHECKLIST_ALMACEN);
  const carpetaFecha = obtenerOCrearCarpetaChecklist(
    obtenerOCrearCarpetaChecklist(obtenerOCrearCarpetaChecklist(raiz, sede), cuadrilla),
    fechaGestion
  );

  const ontZte = guardarEquiposChecklist(carpetaFecha, "ONT_ZTE", id, obtenerEquiposChecklistEntrada(data, "ontZte"), 10);
  const ontHuawei = guardarEquiposChecklist(carpetaFecha, "ONT_HUAWEI", id, obtenerEquiposChecklistEntrada(data, "ontHuawei"), 10);
  const meshZte = guardarEquiposChecklist(carpetaFecha, "MESH_ZTE", id, obtenerEquiposChecklistEntrada(data, "meshZte"), 10);
  const meshHuawei = guardarEquiposChecklist(carpetaFecha, "MESH_HUAWEI", id, obtenerEquiposChecklistEntrada(data, "meshHuawei"), 10);
  const winbox = guardarEquiposChecklist(carpetaFecha, "WINBOX", id, obtenerEquiposChecklistEntrada(data, "winbox"), 5);
  const fonowin = guardarEquiposChecklist(carpetaFecha, "FONOWIN", id, obtenerEquiposChecklistEntrada(data, "fonowin"), 5);

  const ahora = new Date();
  const nombres = (data.nombresApellidos || usuario.nombresApellidos || usuario.usuario || "").toString().trim();
  const estadoInicialChecklist = "PENDIENTE DE VALIDACION POR AREA DE ALMACEN";
  const fila = [
    id, Utilities.formatDate(ahora, Session.getScriptTimeZone(), "dd/MM/yyyy"), Utilities.formatDate(ahora, Session.getScriptTimeZone(), "HH:mm:ss"),
    usuario.usuario, nombres, sede, cuadrilla, fechaGestion, estadoInicialChecklist,
    ontZte.series, ontZte.links, ontHuawei.series, ontHuawei.links,
    meshZte.series, meshZte.links, meshHuawei.series, meshHuawei.links,
    winbox.series, winbox.links, fonowin.series, fonowin.links,
    numeroChecklist(data.cableDrop), numeroChecklist(data.pre50), numeroChecklist(data.pre100), numeroChecklist(data.pre150), numeroChecklist(data.pre200),
    numeroChecklist(data.anclajeP), numeroChecklist(data.cintaBandIt), numeroChecklist(data.hebilla), numeroChecklist(data.acoplador), numeroChecklist(data.roseta),
    numeroChecklist(data.conectoresOpticos), numeroChecklist(data.templadores), numeroChecklist(data.splitter), numeroChecklist(data.clevis),
    numeroChecklist(data.utpCat5), numeroChecklist(data.utpCat6), numeroChecklist(data.patchApcApc), numeroChecklist(data.patchUpcApc), numeroChecklist(data.rj45),
    "","","","","","","","","","",1
  ];
  hoja.appendRow(fila);
  return {
    ok:true, modulo:"CHECKLIST_ALMACEN", accion:"REGISTRAR", id, estadoGeneral:estadoInicialChecklist, sede, cuadrilla,
    seriesGuardadas:{
      ontZte:ontZte.series, ontHuawei:ontHuawei.series, meshZte:meshZte.series, meshHuawei:meshHuawei.series,
      winbox:winbox.series, fonowin:fonowin.series
    }
  };
  } finally {
    bloqueo.releaseLock();
  }
}
function filaChecklistAObjeto(f) {
  return {
    id:f[0],fechaRegistro:f[1],horaRegistro:f[2],usuario:f[3],nombresApellidos:f[4],sede:f[5],cuadrilla:f[6],fechaGestion:f[7],estadoGeneral:f[8],
    ontZte:f[9],fotosOntZte:f[10],ontHuawei:f[11],fotosOntHuawei:f[12],meshZte:f[13],fotosMeshZte:f[14],meshHuawei:f[15],fotosMeshHuawei:f[16],
    winbox:f[17],fotosWinbox:f[18],fonowin:f[19],fotosFonowin:f[20],cableDrop:f[21],pre50:f[22],pre100:f[23],pre150:f[24],pre200:f[25],
    anclajeP:f[26],cintaBandIt:f[27],hebilla:f[28],acoplador:f[29],roseta:f[30],conectoresOpticos:f[31],templadores:f[32],splitter:f[33],
    clevis:f[34],utpCat5:f[35],utpCat6:f[36],patchApcApc:f[37],patchUpcApc:f[38],rj45:f[39],resultadoAlmacen:f[40],motivoAlmacen:f[41],
    validadoAlmacenPor:f[42],fechaValidacionAlmacen:f[43],horaValidacionAlmacen:f[44],resultadoJefatura:f[45],motivoJefatura:f[46],
    validadoJefaturaPor:f[47],fechaValidacionJefatura:f[48],horaValidacionJefatura:f[49],version:f[50]
  };
}

function listarChecklistAlmacen(data) {
  const hoja = asegurarHojaChecklistAlmacen();
  const datos = hoja.getDataRange().getValues();
  const usuario = obtenerUsuarioApp(data.usuario);
  const lista = [];
  for (let i=1;i<datos.length;i++) {
    const item = filaChecklistAObjeto(datos[i]);
    let permitir=false;
    if (usuario.perfil === "TECNICO") permitir = normalizarCuadrilla(usuario.cuadrilla) === normalizarCuadrilla(item.cuadrilla);
    else if (usuario.perfil === "ALMACEN" || usuario.perfil === "SUPERVISOR") permitir = normalizarTexto(usuario.sede) === normalizarTexto(item.sede);
    else if (esPerfilJefaturaAlmacen(usuario.perfil) || esPerfilJefatura(usuario.perfil)) permitir = true;
    if (!permitir) continue;
    if (data.sede && normalizarTexto(data.sede)!==normalizarTexto(item.sede)) continue;
    if (data.cuadrilla && normalizarCuadrilla(data.cuadrilla)!==normalizarCuadrilla(item.cuadrilla)) continue;
    if (data.estado && normalizarTexto(data.estado)!==normalizarTexto(item.estadoGeneral)) continue;
    lista.push(item);
  }
  lista.reverse();
  return {ok:true, modulo:"CHECKLIST_ALMACEN", accion:"LISTAR", perfil:usuario.perfil, registros:lista.length, checklist:lista};
}

function buscarChecklistAlmacen(id) {
  const hoja=asegurarHojaChecklistAlmacen();
  const datos=hoja.getDataRange().getValues();
  for(let i=1;i<datos.length;i++) if((datos[i][0]||"").toString()===id.toString()) return {hoja,fila:i+1,item:filaChecklistAObjeto(datos[i])};
  throw new Error("No se encontró el checklist: "+id);
}

function validarChecklistAlmacen(data) {
  const usuario=obtenerUsuarioApp(data.usuario);
  const id=(data.id||"").toString().trim();
  const resultado=normalizarTexto(data.resultado);
  const motivo=(data.motivo||"").toString().trim();
  if(!id) throw new Error("ID obligatorio");
  const e=buscarChecklistAlmacen(id), hoja=e.hoja, fila=e.fila, item=e.item, ahora=new Date();
  if(usuario.perfil === "ALMACEN") {
    if(normalizarTexto(usuario.sede)!==normalizarTexto(item.sede)) throw new Error("Almacén solo puede validar checklist de su sede");
    if(!["VISTO BUENO","OBSERVADO"].includes(resultado)) throw new Error("Resultado no válido para Almacén");
    if(resultado==="OBSERVADO"&&!motivo) throw new Error("Debe ingresar el motivo");
    hoja.getRange(fila,41).setValue(resultado); hoja.getRange(fila,42).setValue(resultado==="OBSERVADO"?motivo:""); hoja.getRange(fila,43).setValue(usuario.usuario);
    hoja.getRange(fila,44).setValue(ahora).setNumberFormat("dd/mm/yyyy"); hoja.getRange(fila,45).setValue(ahora).setNumberFormat("hh:mm:ss");
    hoja.getRange(fila,9).setValue(resultado==="VISTO BUENO"?"VISTO BUENO ALMACEN":"OBSERVADO ALMACEN");
  } else if(esPerfilJefaturaAlmacen(usuario.perfil)) {
    if(!["CONFORME","OBSERVADO"].includes(resultado)) throw new Error("Resultado no válido para Jefatura de Almacén");
    // Jefatura de Almacén puede dar conformidad final directamente, aunque no exista visto bueno previo de Almacén.
    if(resultado==="OBSERVADO"&&!motivo) throw new Error("Debe ingresar el motivo");
    hoja.getRange(fila,46).setValue(resultado); hoja.getRange(fila,47).setValue(resultado==="OBSERVADO"?motivo:""); hoja.getRange(fila,48).setValue(usuario.usuario);
    hoja.getRange(fila,49).setValue(ahora).setNumberFormat("dd/mm/yyyy"); hoja.getRange(fila,50).setValue(ahora).setNumberFormat("hh:mm:ss");
    hoja.getRange(fila,9).setValue(resultado==="CONFORME"?"CONFORME":"OBSERVADO JEFATURA");
  } else throw new Error("Solo Almacén o Jefatura de Almacén pueden validar checklist");
  return {ok:true, modulo:"CHECKLIST_ALMACEN", accion:"VALIDAR", id, resultado};
}

function autorizarDriveChecklistAlmacen() {
  const carpeta=DriveApp.getFolderById(CARPETA_CHECKLIST_ALMACEN);
  const prueba=carpeta.createFile("PRUEBA_CHECKLIST_MI_VISUAL.txt","Permiso Drive autorizado correctamente");
  const url=prueba.getUrl(); prueba.setTrashed(true);
  return {ok:true,modulo:"CHECKLIST_ALMACEN",carpeta:carpeta.getName(),url:carpeta.getUrl(),prueba:url};
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
    const plataformaOrden = normalizarTexto(datos[i][2]);
    const grupo = normalizarTexto(datos[i][4]);
    const monto = numeroProduccion(datos[i][5]);
    const estadoTarifa = normalizarTexto(datos[i][6] || "ACTIVO");

    mapa[codigo] = {
      codigo,
      tipoOrden,
      plataformaOrden,
      // Alias temporal para mantener compatibilidad con el frontend actual.
      plataforma: plataformaOrden,
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
    if (!/^P\d+\b/i.test(cuadrillaNormalizada)) return;
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
    "PLATAFORMA_ORDEN",
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
    "PLATAFORMA_ORDEN",
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
    // La plataforma económica depende exclusivamente del tipo de orden
    // configurado en CATALOGO_ORDENES (columna PLATAFORMA_ORDEN).
    // No se usa la plataforma asignada al usuario/cuadrilla.
    const plataformaOrden = normalizarTexto(cat.plataformaOrden || cat.plataforma || "SIN PLATAFORMA_ORDEN");
    const plataforma = plataformaOrden;
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
   PROGRAMACIÓN DE DESCANSOS
   Flujo mensual, cambios, validación e historial
   Historial integrado en PROGRAMACION_DESCANSOS
========================= */

const HOJA_PROGRAMACION_DESCANSOS = "PROGRAMACION_DESCANSOS";

function encabezadoProgramacionDescansos() {
  return [[
    "ID","PERIODO","FECHA","DIA_SEMANA","SEDE","CUADRILLA","PLATAFORMA",
    "SUPERVISOR","TECNICOS_AFECTADOS","ESTADO_DIA","ESTADO_PROGRAMACION",
    "SOLICITUD_CAMBIO","MOTIVO_SOLICITUD","SOLICITADO_POR","FECHA_SOLICITUD","HORA_SOLICITUD",
    "RESULTADO_SUPERVISOR","MOTIVO_SUPERVISOR","VALIDADO_SUPERVISOR_POR","FECHA_VALIDACION_SUPERVISOR","HORA_VALIDACION_SUPERVISOR",
    "RESULTADO_JEFATURA","MOTIVO_JEFATURA","VALIDADO_JEFATURA_POR","FECHA_VALIDACION_JEFATURA","HORA_VALIDACION_JEFATURA",
    "COBERTURA_SEDE","ESTADO_COBERTURA","VERSION","ESTADO_VALIDACION","COMENTARIO_SUPERVISOR",
    "COMENTARIO_JEFATURA","FECHA_VALIDACION","VALIDADO_POR","TIPO_REGISTRO","ESTADO_ANTERIOR","ESTADO_NUEVO","ID_ORIGEN"
  ]];
}

function asegurarHojaProgramacionDescansos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_PROGRAMACION_DESCANSOS);
  if (!hoja) hoja = ss.insertSheet(HOJA_PROGRAMACION_DESCANSOS);
  const encabezado = encabezadoProgramacionDescansos()[0];
  if (hoja.getLastRow() === 0 || !hoja.getRange(1,1).getValue()) {
    hoja.getRange(1,1,1,encabezado.length).setValues([encabezado]);
  } else if (hoja.getLastColumn() < encabezado.length) {
    hoja.getRange(1,1,1,encabezado.length).setValues([encabezado]);
  }
  return hoja;
}

function esPerfilDescansos(perfil) {
  return ["TECNICO","SUPERVISOR","JEFATURA","ADMIN","ADMINISTRADOR"].includes(normalizarTexto(perfil));
}

function esJefaturaDescansos(perfil) {
  return ["JEFATURA","ADMIN","ADMINISTRADOR"].includes(normalizarTexto(perfil));
}

function plataformaDescansos(valor) {
  const p = normalizarTexto(valor);
  if (p.includes("TRASL")) return "TRASLADOS";
  if (p.includes("SGA") || p.includes("VISITA")) return "VISITA TECNICA";
  return "INSTALACIONES";
}

function fechaISODescansos(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const t = (valor || "").toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const p = t.split("/");
  if (p.length === 3) return p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
  return t;
}

function fechaDateDescansos(valor) {
  const iso = fechaISODescansos(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const p = iso.split("-");
  return new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
}

function periodoDescansos(fechaIso) {
  return (fechaIso || "").toString().substring(0,7);
}

function diaSemanaDescansos(fechaIso) {
  const f = fechaDateDescansos(fechaIso);
  if (!f) return "";
  return ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"][f.getDay()];
}

function idOrigenDescansos(cuadrilla, fechaIso) {
  return "DESC|" + normalizarCuadrilla(cuadrilla) + "|" + fechaIso;
}

function idMovimientoDescansos(cuadrilla, fechaIso) {
  const ahora = new Date();
  return idOrigenDescansos(cuadrilla, fechaIso) + "|" +
    Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "|" +
    Math.floor(Math.random()*900+100);
}

function listaCuadrillasDescansos(usuario) {
  const mapa = obtenerMapaUsuarios();
  const lista = [];
  Object.keys(mapa).forEach(c => {
    const item = mapa[c] || {};
    if (normalizarTexto(item.estado || "ACTIVO") !== "ACTIVO") return;
    if (normalizarTexto(item.perfil) !== "TECNICO") return;
    const cuadrilla = normalizarCuadrilla(c);
    const sede = normalizarTexto(item.sede);
    if (!/^P\d+\b/i.test(cuadrilla) || !sede || sede === "TODAS") return;
    if (normalizarTexto(usuario.perfil) === "SUPERVISOR" && sede !== normalizarTexto(usuario.sede)) return;
    lista.push({
      cuadrilla,
      sede,
      plataforma: plataformaDescansos(item.plataforma),
      supervisor: item.usuarioSupervisor || "",
      tecnico: item.usuario || ""
    });
  });
  lista.sort((a,b)=>a.sede.localeCompare(b.sede)||a.plataforma.localeCompare(b.plataforma)||a.cuadrilla.localeCompare(b.cuadrilla));
  return lista;
}

function filaProgramacionAObjeto(f) {
  const fecha = fechaISODescansos(f[2]);
  return {
    id:f[0], periodo:periodoDescansos(fecha), fecha, diaSemana:f[3], sede:f[4], cuadrilla:f[5], plataforma:f[6],
    supervisor:f[7], tecnicosAfectados:f[8], estadoDia:f[9]||"EN CAMPO", estadoProgramacion:f[10]||"APROBADO",
    solicitudCambio:f[11], motivoSolicitud:f[12], solicitadoPor:f[13], fechaSolicitud:f[14], horaSolicitud:f[15],
    resultadoSupervisor:f[16], motivoSupervisor:f[17], validadoSupervisorPor:f[18], fechaValidacionSupervisor:f[19], horaValidacionSupervisor:f[20],
    resultadoJefatura:f[21], motivoJefatura:f[22], validadoJefaturaPor:f[23], fechaValidacionJefatura:f[24], horaValidacionJefatura:f[25],
    coberturaSede:Number(f[26])||0, estadoCobertura:f[27]||"", version:Number(f[28])||1,
    estadoValidacion:f[29]||f[10]||"APROBADO", comentarioSupervisor:f[30]||"", comentarioJefatura:f[31]||"",
    fechaValidacion:f[32]||"", validadoPor:f[33]||"", tipoRegistro:f[34]||"PROGRAMACION_INICIAL",
    estadoAnterior:f[35]||"", estadoNuevo:f[36]||f[9]||"EN CAMPO", idOrigen:f[37]||idOrigenDescansos(f[5],fecha),
    accion:f[34]||"PROGRAMACION_INICIAL", origen:(f[34]||"").toString().includes("JEFATURA")?"JEFATURA":"SUPERVISOR",
    usuario:f[33]||f[13]||"", motivo:f[31]||f[30]||f[12]||f[22]||"",
    fechaRegistro:f[32]||f[14]||f[24]||"", horaRegistro:f[15]||f[25]||"", fechaAfectada:fecha
  };
}

function obtenerFilasDescansos() {
  const hoja = asegurarHojaProgramacionDescansos();
  const datos = hoja.getDataRange().getValues();
  const lista = [];
  for (let i=1;i<datos.length;i++) {
    if (!datos[i][0] && !datos[i][2] && !datos[i][5]) continue;
    lista.push({hoja, fila:i+1, datos:datos[i], item:filaProgramacionAObjeto(datos[i])});
  }
  return lista;
}

function buscarMovimientoDescansos(id) {
  const filas = obtenerFilasDescansos();
  for (let i=0;i<filas.length;i++) if ((filas[i].item.id||"").toString() === (id||"").toString()) return filas[i];
  throw new Error("No se encontró el registro de descanso: " + id);
}

function ultimoEstadoAprobadoDescansos(cuadrilla, fechaIso) {
  const filas = obtenerFilasDescansos().filter(x =>
    normalizarCuadrilla(x.item.cuadrilla) === normalizarCuadrilla(cuadrilla) && x.item.fecha === fechaIso &&
    ["APROBADO","APLICADO"].includes(normalizarTexto(x.item.estadoValidacion || x.item.estadoProgramacion))
  );
  if (!filas.length) return "EN CAMPO";
  return normalizarTexto(filas[filas.length-1].item.estadoNuevo || filas[filas.length-1].item.estadoDia || "EN CAMPO");
}

function reglasCoberturaDescansos(plataforma, fechaIso) {
  const f = fechaDateDescansos(fechaIso);
  const domingo = f && f.getDay() === 0;
  const p = plataformaDescansos(plataforma);
  if (domingo && p === "INSTALACIONES") return {objetivo:0.60,minimo:0.60};
  if (domingo) return {objetivo:0.70,minimo:0.60};
  return {objetivo:0.90,minimo:0.80};
}

function redondearCoberturaDescansos(valor) { return Math.floor(Number(valor)+0.5); }

function calcularCoberturaDescansos(fechaIso, sede, plataforma, cambiosTemporales) {
  const cuadrillas = listaCuadrillasDescansos({perfil:"JEFATURA",sede:""}).filter(x =>
    normalizarTexto(x.sede)===normalizarTexto(sede) && plataformaDescansos(x.plataforma)===plataformaDescansos(plataforma)
  );
  let campo = 0;
  cuadrillas.forEach(c => {
    const key = c.cuadrilla + "|" + fechaIso;
    const estado = cambiosTemporales && cambiosTemporales[key]
      ? normalizarTexto(cambiosTemporales[key])
      : ultimoEstadoAprobadoDescansos(c.cuadrilla, fechaIso);
    if (estado !== "DESCANSO") campo++;
  });
  const total = cuadrillas.length;
  const porcentaje = total ? campo/total : 0;
  const regla = reglasCoberturaDescansos(plataforma,fechaIso);
  const objetivoCuadrillas = redondearCoberturaDescansos(total*regla.objetivo);
  const minimoCuadrillas = redondearCoberturaDescansos(total*regla.minimo);
  let estado = "ROJO";
  if (campo >= objetivoCuadrillas) estado = "VERDE";
  else if (campo >= minimoCuadrillas) estado = "AMARILLO";
  return {total,enCampo:campo,enDescanso:Math.max(total-campo,0),porcentaje,estado,objetivo:regla.objetivo,minimo:regla.minimo,objetivoCuadrillas,minimoCuadrillas};
}

function puedeVerDescanso(usuario,item) {
  const perfil = normalizarTexto(usuario.perfil);
  if (perfil === "TECNICO") return normalizarCuadrilla(usuario.cuadrilla) === normalizarCuadrilla(item.cuadrilla);
  if (perfil === "SUPERVISOR") return normalizarTexto(usuario.sede) === normalizarTexto(item.sede);
  return esJefaturaDescansos(perfil);
}

function listarProgramacionDescansos(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!esPerfilDescansos(usuario.perfil)) throw new Error("No tienes acceso a Programación de Descansos");
  const periodo = (data.periodo || Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM")).toString();
  const filas = obtenerFilasDescansos().filter(x => x.item.periodo===periodo && puedeVerDescanso(usuario,x.item));
  const filtroSede = normalizarTexto(data.sede||"");
  const visibles = filas.filter(x => !filtroSede || filtroSede==="TODAS" || normalizarTexto(x.item.sede)===filtroSede);

  const porClave = {};
  visibles.forEach(x => {
    const item = x.item;
    const clave = normalizarCuadrilla(item.cuadrilla)+"|"+item.fecha;
    if (!porClave[clave]) porClave[clave] = {aprobado:null,pendiente:null};
    const estado = normalizarTexto(item.estadoValidacion || item.estadoProgramacion);
    if (["PENDIENTE JEFATURA","PENDIENTE_JEFATURA","OBSERVADO","PENDIENTE SUPERVISOR","PENDIENTE_SUPERVISOR"].includes(estado)) {
      porClave[clave].pendiente = item;
    } else if (["APROBADO","APLICADO"].includes(estado)) {
      porClave[clave].aprobado = item;
    }
  });

  const programacion = Object.keys(porClave).map(k => {
    const grupo = porClave[k];
    if (grupo.pendiente) {
      const p = Object.assign({},grupo.pendiente);
      const vigente = grupo.aprobado ? normalizarTexto(grupo.aprobado.estadoNuevo||grupo.aprobado.estadoDia) : "EN CAMPO";
      p.estadoDia = vigente;
      p.solicitudCambio = normalizarTexto(p.estadoNuevo||p.solicitudCambio||vigente);
      p.estadoProgramacion = normalizarTexto(p.estadoValidacion||p.estadoProgramacion).replace(/_/g," ");
      return p;
    }
    if (grupo.aprobado) {
      const a = Object.assign({},grupo.aprobado);
      a.estadoDia = normalizarTexto(a.estadoNuevo||a.estadoDia||"EN CAMPO");
      a.estadoProgramacion = "APROBADO";
      a.solicitudCambio = "";
      return a;
    }
    return null;
  }).filter(Boolean);

  const historial = visibles.map(x=>x.item).sort((a,b)=>String(b.id).localeCompare(String(a.id))).slice(0,250);
  return {ok:true,modulo:"PROGRAMACION_DESCANSOS",accion:"LISTAR",perfil:usuario.perfil,periodo,cuadrillas:listaCuadrillasDescansos(usuario),programacion,historial};
}

function construirFilaDescansos(datos) {
  return [
    datos.id,datos.periodo,datos.fecha,datos.diaSemana,datos.sede,datos.cuadrilla,datos.plataforma,
    datos.supervisor,datos.tecnicosAfectados,datos.estadoDia,datos.estadoProgramacion,
    datos.solicitudCambio,datos.motivoSolicitud,datos.solicitadoPor,datos.fechaSolicitud,datos.horaSolicitud,
    datos.resultadoSupervisor,datos.motivoSupervisor,datos.validadoSupervisorPor,datos.fechaValidacionSupervisor,datos.horaValidacionSupervisor,
    datos.resultadoJefatura,datos.motivoJefatura,datos.validadoJefaturaPor,datos.fechaValidacionJefatura,datos.horaValidacionJefatura,
    datos.coberturaSede,datos.estadoCobertura,datos.version,datos.estadoValidacion,datos.comentarioSupervisor,
    datos.comentarioJefatura,datos.fechaValidacion,datos.validadoPor,datos.tipoRegistro,datos.estadoAnterior,datos.estadoNuevo,datos.idOrigen
  ];
}

function guardarProgramacionDescansos(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  const esSupervisor = normalizarTexto(usuario.perfil)==="SUPERVISOR";
  const esJefatura = esJefaturaDescansos(usuario.perfil);
  if (!(esSupervisor || esJefatura)) throw new Error("Solo Supervisor o Jefatura pueden programar descansos");
  const registros = Array.isArray(data.registros) ? data.registros : [];
  if (!registros.length) throw new Error("No hay cambios para guardar");
  const motivo = (data.motivo||"").toString().trim();
  if (!motivo) throw new Error("El motivo es obligatorio");
  const hoja = asegurarHojaProgramacionDescansos();
  const cambiosTemporales = {};
  registros.forEach(r=>{const c=normalizarCuadrilla(r.cuadrilla),f=fechaISODescansos(r.fecha);if(c&&f)cambiosTemporales[c+"|"+f]=normalizarTexto(r.estadoDia||"EN CAMPO");});
  let guardados=0,alertas=0;

  registros.forEach(r=>{
    const cuadrilla=normalizarCuadrilla(r.cuadrilla),fecha=fechaISODescansos(r.fecha),nuevo=normalizarTexto(r.estadoDia||"EN CAMPO");
    if(!cuadrilla||!fecha||!["EN CAMPO","DESCANSO"].includes(nuevo))return;
    const dc=obtenerDatosCuadrillaApp(cuadrilla),sede=normalizarTexto(dc.sede),plataforma=plataformaDescansos(dc.plataforma);
    if(esSupervisor&&sede!==normalizarTexto(usuario.sede))throw new Error("Supervisor solo puede programar su sede");
    const anterior=ultimoEstadoAprobadoDescansos(cuadrilla,fecha);
    if(anterior===nuevo)return;
    const cobertura=calcularCoberturaDescansos(fecha,sede,plataforma,cambiosTemporales);if(cobertura.estado==="ROJO")alertas++;
    const ahora=new Date(),periodo=periodoDescansos(fecha),origen=idOrigenDescansos(cuadrilla,fecha);
    const tipoInicial = obtenerFilasDescansos().some(x=>normalizarTexto(x.item.idOrigen)===normalizarTexto(origen));
    const estadoValidacion=esJefatura?"APLICADO":"PENDIENTE_JEFATURA";
    const tipoRegistro=esJefatura?"CAMBIO_JEFATURA":(tipoInicial?"CAMBIO_SUPERVISOR":"PROGRAMACION_INICIAL");
    const fila=construirFilaDescansos({
      id:idMovimientoDescansos(cuadrilla,fecha),periodo,fecha,diaSemana:diaSemanaDescansos(fecha),sede,cuadrilla,plataforma,
      supervisor:dc.usuarioSupervisor||"",tecnicosAfectados:dc.usuario||"",estadoDia:esJefatura?nuevo:anterior,
      estadoProgramacion:esJefatura?"APROBADO":"PENDIENTE JEFATURA",solicitudCambio:esJefatura?"":nuevo,
      motivoSolicitud:motivo,solicitadoPor:usuario.usuario,fechaSolicitud:ahora,horaSolicitud:ahora,
      resultadoSupervisor:esSupervisor?"ENVIADO":"",motivoSupervisor:esSupervisor?motivo:"",validadoSupervisorPor:esSupervisor?usuario.usuario:"",
      fechaValidacionSupervisor:esSupervisor?ahora:"",horaValidacionSupervisor:esSupervisor?ahora:"",
      resultadoJefatura:esJefatura?"APROBADO":"",motivoJefatura:esJefatura?motivo:"",validadoJefaturaPor:esJefatura?usuario.usuario:"",
      fechaValidacionJefatura:esJefatura?ahora:"",horaValidacionJefatura:esJefatura?ahora:"",
      coberturaSede:cobertura.porcentaje,estadoCobertura:cobertura.estado,version:obtenerFilasDescansos().filter(x=>x.item.idOrigen===origen).length+1,
      estadoValidacion,comentarioSupervisor:esSupervisor?motivo:"",comentarioJefatura:esJefatura?motivo:"",
      fechaValidacion:esJefatura?ahora:"",validadoPor:esJefatura?usuario.usuario:"",tipoRegistro,
      estadoAnterior:anterior,estadoNuevo:nuevo,idOrigen:origen
    });
    hoja.appendRow(fila);guardados++;
  });
  return {ok:true,modulo:"PROGRAMACION_DESCANSOS",accion:"GUARDAR",guardados,alertas,estado:esJefatura?"APLICADO":"PENDIENTE JEFATURA"};
}

function resolverProgramacionDescansos(data,resultado) {
  const usuario=obtenerUsuarioApp(data.usuario);
  if(!esJefaturaDescansos(usuario.perfil))throw new Error("Solo Jefatura puede resolver la programación");
  const ids=Array.isArray(data.ids)?data.ids:[];
  const motivo=(data.motivo||"").toString().trim();
  if(!motivo)throw new Error("Debe ingresar el comentario de Jefatura");
  const ahora=new Date();let actualizados=0;
  const filas=obtenerFilasDescansos();
  filas.forEach(reg=>{
    const item=reg.item;
    if(ids.length&&!ids.includes((item.id||"").toString()))return;
    if(!ids.length&&!['PENDIENTE JEFATURA','PENDIENTE_JEFATURA','OBSERVADO'].includes(normalizarTexto(item.estadoValidacion||item.estadoProgramacion)))return;
    reg.hoja.getRange(reg.fila,22).setValue(resultado);
    reg.hoja.getRange(reg.fila,23).setValue(motivo);
    reg.hoja.getRange(reg.fila,24).setValue(usuario.usuario);
    reg.hoja.getRange(reg.fila,25).setValue(ahora);
    reg.hoja.getRange(reg.fila,26).setValue(ahora);
    reg.hoja.getRange(reg.fila,32).setValue(motivo);
    reg.hoja.getRange(reg.fila,33).setValue(ahora);
    reg.hoja.getRange(reg.fila,34).setValue(usuario.usuario);
    if(resultado==="APROBADO"){
      reg.hoja.getRange(reg.fila,10).setValue(normalizarTexto(item.estadoNuevo||item.solicitudCambio||item.estadoDia));
      reg.hoja.getRange(reg.fila,11).setValue("APROBADO");
      reg.hoja.getRange(reg.fila,12).setValue("");
      reg.hoja.getRange(reg.fila,30).setValue("APROBADO");
    }else if(resultado==="OBSERVADO"){
      reg.hoja.getRange(reg.fila,11).setValue("OBSERVADO");
      reg.hoja.getRange(reg.fila,30).setValue("OBSERVADO");
    }else{
      reg.hoja.getRange(reg.fila,11).setValue("RECHAZADO");
      reg.hoja.getRange(reg.fila,30).setValue("RECHAZADO");
    }
    actualizados++;
  });
  return {ok:true,modulo:"PROGRAMACION_DESCANSOS",accion:resultado,actualizados};
}

function aprobarProgramacionDescansos(data){return resolverProgramacionDescansos(data,"APROBADO");}
function observarProgramacionDescansos(data){return resolverProgramacionDescansos(data,"OBSERVADO");}
function rechazarProgramacionDescansos(data){return resolverProgramacionDescansos(data,"RECHAZADO");}

function solicitarCambioDescanso(data) {
  const usuario=obtenerUsuarioApp(data.usuario);
  if(normalizarTexto(usuario.perfil)!=="TECNICO")throw new Error("Solo el técnico puede solicitar cambio de descanso");
  const fechaActual=fechaISODescansos(data.fechaDescansoActual),nuevaFecha=fechaISODescansos(data.nuevaFecha),motivo=(data.motivo||"").toString().trim();
  if(!fechaActual||!nuevaFecha||!motivo)throw new Error("Complete las fechas y el motivo");
  if(ultimoEstadoAprobadoDescansos(usuario.cuadrilla,fechaActual)!=="DESCANSO")throw new Error("La fecha seleccionada no es un descanso aprobado");
  const dc=obtenerDatosCuadrillaApp(usuario.cuadrilla),ahora=new Date(),hoja=asegurarHojaProgramacionDescansos();
  hoja.appendRow(construirFilaDescansos({
    id:idMovimientoDescansos(usuario.cuadrilla,fechaActual),periodo:periodoDescansos(fechaActual),fecha:fechaActual,diaSemana:diaSemanaDescansos(fechaActual),
    sede:dc.sede,cuadrilla:normalizarCuadrilla(usuario.cuadrilla),plataforma:plataformaDescansos(dc.plataforma),supervisor:dc.usuarioSupervisor||"",tecnicosAfectados:usuario.usuario,
    estadoDia:"DESCANSO",estadoProgramacion:"PENDIENTE SUPERVISOR",solicitudCambio:nuevaFecha,motivoSolicitud:motivo,solicitadoPor:usuario.usuario,fechaSolicitud:ahora,horaSolicitud:ahora,
    resultadoSupervisor:"",motivoSupervisor:"",validadoSupervisorPor:"",fechaValidacionSupervisor:"",horaValidacionSupervisor:"",resultadoJefatura:"",motivoJefatura:"",validadoJefaturaPor:"",fechaValidacionJefatura:"",horaValidacionJefatura:"",
    coberturaSede:0,estadoCobertura:"",version:1,estadoValidacion:"PENDIENTE_SUPERVISOR",comentarioSupervisor:"",comentarioJefatura:"",fechaValidacion:"",validadoPor:"",tipoRegistro:"SOLICITUD_TECNICO",estadoAnterior:"DESCANSO",estadoNuevo:"DESCANSO",idOrigen:idOrigenDescansos(usuario.cuadrilla,fechaActual)
  }));
  return {ok:true,modulo:"PROGRAMACION_DESCANSOS",accion:"SOLICITAR_CAMBIO",estado:"PENDIENTE SUPERVISOR"};
}

function validarCambioDescansoSupervisor(data) {
  const usuario=obtenerUsuarioApp(data.usuario);
  if(normalizarTexto(usuario.perfil)!=="SUPERVISOR")throw new Error("Solo Supervisor puede realizar esta validación");
  const resultado=normalizarTexto(data.resultado),motivo=(data.motivo||"").toString().trim();
  if(!["APROBADO","RECHAZADO"].includes(resultado))throw new Error("Resultado no válido");
  const reg=buscarMovimientoDescansos(data.id),item=reg.item;
  if(normalizarTexto(item.sede)!==normalizarTexto(usuario.sede))throw new Error("Supervisor solo valida su sede");
  const ahora=new Date();
  reg.hoja.getRange(reg.fila,17).setValue(resultado);reg.hoja.getRange(reg.fila,18).setValue(motivo);reg.hoja.getRange(reg.fila,19).setValue(usuario.usuario);reg.hoja.getRange(reg.fila,20).setValue(ahora);reg.hoja.getRange(reg.fila,21).setValue(ahora);
  reg.hoja.getRange(reg.fila,30).setValue(resultado==="APROBADO"?"PENDIENTE_JEFATURA":"RECHAZADO");reg.hoja.getRange(reg.fila,31).setValue(motivo);reg.hoja.getRange(reg.fila,11).setValue(resultado==="APROBADO"?"PENDIENTE JEFATURA":"RECHAZADO");
  return {ok:true,modulo:"PROGRAMACION_DESCANSOS",accion:"VALIDAR_SUPERVISOR",estado:resultado==="APROBADO"?"PENDIENTE JEFATURA":"RECHAZADO"};
}

function validarCambioDescansoJefatura(data) {
  return resolverProgramacionDescansos({usuario:data.usuario,ids:[data.id],motivo:data.motivo||""},normalizarTexto(data.resultado));
}

function resumenCoberturaDescansos(data) {
  const usuario=obtenerUsuarioApp(data.usuario);
  if(!esPerfilDescansos(usuario.perfil))throw new Error("Sin acceso");
  const fecha=fechaISODescansos(data.fecha||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd"));
  const sedes=normalizarTexto(usuario.perfil)==="SUPERVISOR"?[normalizarTexto(usuario.sede)]:["CHICLAYO","PIURA","TRUJILLO"];
  const salida=[];
  sedes.forEach(s=>["INSTALACIONES","VISITA TECNICA","TRASLADOS"].forEach(p=>salida.push(Object.assign({fecha,sede:s,plataforma:p},calcularCoberturaDescansos(fecha,s,p)))));
  return {ok:true,modulo:"PROGRAMACION_DESCANSOS",accion:"RESUMEN_COBERTURA",fecha,resumen:salida};
}


/* =========================
   API PRINCIPAL
========================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);


    if (data.accion === "listarProgramacionDescansos") return respuestaJson(listarProgramacionDescansos(data));
    if (data.accion === "guardarProgramacionDescansos") return respuestaJson(guardarProgramacionDescansos(data));
    if (data.accion === "aprobarProgramacionDescansos") return respuestaJson(aprobarProgramacionDescansos(data));
    if (data.accion === "rechazarProgramacionDescansos") return respuestaJson(rechazarProgramacionDescansos(data));
    if (data.accion === "observarProgramacionDescansos") return respuestaJson(observarProgramacionDescansos(data));
    if (data.accion === "solicitarCambioDescanso") return respuestaJson(solicitarCambioDescanso(data));
    if (data.accion === "validarCambioDescansoSupervisor") return respuestaJson(validarCambioDescansoSupervisor(data));
    if (data.accion === "validarCambioDescansoJefatura") return respuestaJson(validarCambioDescansoJefatura(data));
    if (data.accion === "resumenCoberturaDescansos") return respuestaJson(resumenCoberturaDescansos(data));


    if (data.accion === "obtenerConfiguracionChecklistAlmacen") return respuestaJson(obtenerConfiguracionChecklistAlmacen(data));
    if (data.accion === "guardarConfiguracionChecklistAlmacen") return respuestaJson(guardarConfiguracionChecklistAlmacen(data));
    if (data.accion === "registrarChecklistAlmacen") return respuestaJson(registrarChecklistAlmacen(data));
    if (data.accion === "listarChecklistAlmacen") return respuestaJson(listarChecklistAlmacen(data));
    if (data.accion === "validarChecklistAlmacen") return respuestaJson(validarChecklistAlmacen(data));
    if (data.accion === "autorizarDriveChecklistAlmacen") return respuestaJson(autorizarDriveChecklistAlmacen());

    if (data.accion === "obtenerAnalisisEconomico") {
      return ContentService
        .createTextOutput(JSON.stringify(obtenerAnalisisEconomico(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }


    if (data.accion === "registrarActaFaltante") {
      return ContentService.createTextOutput(JSON.stringify(registrarActaFaltante(data))).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "listarCuadrillasActasFaltantes") {
      return ContentService.createTextOutput(JSON.stringify(listarCuadrillasActasFaltantes(data))).setMimeType(ContentService.MimeType.JSON);
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

    if (data.accion === "actualizarEntregaFisicaActa") {
      return ContentService.createTextOutput(JSON.stringify(actualizarEntregaFisicaActa(data))).setMimeType(ContentService.MimeType.JSON);
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
