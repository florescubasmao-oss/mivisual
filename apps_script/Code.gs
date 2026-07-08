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

  if (!["TECNICO", "SUPERVISOR", "ADMIN"].includes(perfil)) {
    throw new Error("Perfil no válido. Usa TECNICO, SUPERVISOR o ADMIN");
  }

  if (!["CUADRILLA", "SEDE", "ZONA", "ADMIN"].includes(nivel)) {
    throw new Error("Nivel de acceso no válido. Usa CUADRILLA, SEDE, ZONA o ADMIN");
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
   API PRINCIPAL
========================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

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