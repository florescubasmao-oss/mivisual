/* ============================================================
   MI VISUAL V568 - RECUPERACION DE ORDENES / FASE 2
   Gestion segura y auditable.
   - MAPA_ORDENES sigue siendo fuente de verdad.
   - RECUPERACION_ORDENES es historial append-only de gestion.
   - No modifica tramos, cuadrillas, Produccion ni Mapa.
============================================================ */

const HOJA_RECUPERACION_ORDENES_V568 = "RECUPERACION_ORDENES";
const MV568_MAX_RESPUESTA_ = 250;
const MV568_CACHE_TTL_ = 30;

function mv568Encabezados_() {
  return [
    "ID_EVENTO","FECHA","HORA","ORDEN_ID","SEDE","ESTADO_GESTION",
    "USUARIO","NOMBRE","PERFIL","ACCION","OBSERVACION"
  ];
}

function mv568HojaGestion_(crear) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_RECUPERACION_ORDENES_V568);

  if (!hoja && crear) {
    hoja = ss.insertSheet(HOJA_RECUPERACION_ORDENES_V568);
    hoja.getRange(1,1,1,mv568Encabezados_().length).setValues([mv568Encabezados_()]);
    hoja.setFrozenRows(1);
  }

  if (hoja && hoja.getLastRow() === 0) {
    hoja.getRange(1,1,1,mv568Encabezados_().length).setValues([mv568Encabezados_()]);
    hoja.setFrozenRows(1);
  }

  return hoja;
}

function mv568PerfilPuedeGestionar_(perfil) {
  const p = normalizarTexto(perfil || "");
  return [
    "TECNICO","SUPERVISOR","JEFATURA","JEFATURA GENERAL",
    "ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES",
    "JEFATURA DE OPERACIONES","OPERACIONES"
  ].indexOf(p) >= 0;
}

function mv568PerfilPuedeLiberar_(perfil) {
  const p = normalizarTexto(perfil || "");
  return [
    "SUPERVISOR","JEFATURA","JEFATURA GENERAL",
    "ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES",
    "JEFATURA DE OPERACIONES","OPERACIONES"
  ].indexOf(p) >= 0;
}

function mv568EsJefatura_(perfil) {
  return esPerfilJefatura(perfil) ||
    esPerfilJefaturaOperaciones(perfil) ||
    normalizarTexto(perfil || "") === "JEFATURA GENERAL";
}

function mv568UltimoEvento_(ordenId) {
  const hoja = mv568HojaGestion_(false);
  if (!hoja || hoja.getLastRow() <= 1) return null;

  const clave = String(ordenId || "").trim();
  if (!clave) return null;

  const encontrados = hoja.getRange(2,4,hoja.getLastRow()-1,1)
    .createTextFinder(clave)
    .matchEntireCell(true)
    .findAll();

  if (!encontrados || !encontrados.length) return null;

  let fila = 0;
  encontrados.forEach(function(c){
    if (c.getRow() > fila) fila = c.getRow();
  });
  if (!fila) return null;

  const r = hoja.getRange(fila,1,1,11).getDisplayValues()[0];
  return {
    fila:fila,
    idEvento:r[0],
    fecha:r[1],
    hora:r[2],
    ordenId:r[3],
    sede:r[4],
    estadoGestion:normalizarTexto(r[5]),
    usuario:normalizarUsuario(r[6]),
    nombre:r[7],
    perfil:normalizarTexto(r[8]),
    accion:r[9],
    observacion:r[10]
  };
}

function mv568EstadosGestion_() {
  const hoja = mv568HojaGestion_(false);
  const mapa = {};
  if (!hoja || hoja.getLastRow() <= 1) return mapa;

  const datos = hoja.getRange(2,1,hoja.getLastRow()-1,11).getDisplayValues();
  for (let i=datos.length-1;i>=0;i--) {
    const orden = (datos[i][3] || "").toString().trim();
    if (!orden || mapa[orden]) continue;
    mapa[orden] = {
      estadoGestion:normalizarTexto(datos[i][5]) || "LIBRE",
      usuarioGestion:normalizarUsuario(datos[i][6]),
      nombreGestion:(datos[i][7] || "").toString().trim(),
      perfilGestion:normalizarTexto(datos[i][8]),
      fechaGestion:(datos[i][1] || "").toString().trim(),
      horaGestion:(datos[i][2] || "").toString().trim()
    };
  }
  return mapa;
}

function mv568BuscarOrdenMapa_(ordenId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAPA_OPERATIVO);
  if (!hoja || hoja.getLastRow() <= 1) return null;

  const clave = String(ordenId || "").trim();
  if (!clave) return null;

  const celda = hoja.getRange(2,1,hoja.getLastRow()-1,1)
    .createTextFinder(clave)
    .matchEntireCell(true)
    .findNext();

  if (!celda) return null;

  const fila = hoja.getRange(celda.getRow(),1,1,COLUMNAS_MAPA_OPERATIVO).getValues()[0];
  const item = filaMapaOperativoAObjeto(fila);
  if (!item || !item.ordenId) return null;

  item.sede = sedeMapaOperativo(item.region);
  item.clasificacionRecuperacion = mv567ClasificarMotivo_(item.motivoCancelacion);
  return item;
}

function mv568ValidarAccesoOrden_(usuario, item) {
  if (!item) throw new Error("La orden ya no existe en Mapa Operativo");

  const sedeOrden = normalizarTexto(item.sede || "");
  if (!sedeOrden) throw new Error("La orden no tiene sede válida");

  if (!mv568EsJefatura_(usuario.perfil)) {
    if (normalizarTexto(usuario.sede || "") !== sedeOrden) {
      throw new Error("Solo puedes gestionar órdenes de tu sede");
    }
  }
}

function mv568ValidarRecuperableActual_(item) {
  if (normalizarTexto(item.estado) !== "CANCELADA") {
    throw new Error("La orden ya no está cancelada. Actualice la lista.");
  }
  if (!item.clasificacionRecuperacion) {
    throw new Error("La orden ya no cumple los criterios de recuperación");
  }
}

function mv568AppendEvento_(item, usuario, estado, accion, observacion) {
  const hoja = mv568HojaGestion_(true);
  const ahora = new Date();
  const tz = "America/Lima";
  const id = "REC-" + Utilities.formatDate(ahora,tz,"yyyyMMddHHmmssSSS") + "-" + Utilities.getUuid().slice(0,6).toUpperCase();

  hoja.appendRow([
    id,
    Utilities.formatDate(ahora,tz,"dd/MM/yyyy"),
    Utilities.formatDate(ahora,tz,"HH:mm:ss"),
    item.ordenId,
    item.sede,
    estado,
    usuario.usuario,
    usuario.nombresApellidos || usuario.usuario,
    usuario.perfil,
    accion,
    (observacion || "").toString().trim()
  ]);

  return id;
}

function listarRecuperacionOrdenesV568(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!mv568PerfilPuedeGestionar_(usuario.perfil)) {
    throw new Error("No tienes acceso a Recuperación de Órdenes");
  }

  const esJefatura = mv568EsJefatura_(usuario.perfil);
  let sedeFiltro = normalizarTexto(data.sede || "");
  if (!esJefatura) sedeFiltro = normalizarTexto(usuario.sede || "");

  const tipoFiltro = normalizarTexto(data.tipo || "");
  const claseFiltro = normalizarTexto(data.estadoRecuperacion || data.clasificacion || "");
  const gestionFiltro = normalizarTexto(data.gestion || "");
  const desde = fechaMapaISO(data.desde || "");
  const hasta = fechaMapaISO(data.hasta || "");
  const limite = Math.min(Math.max(Number(data.limite) || MV568_MAX_RESPUESTA_,1),MV568_MAX_RESPUESTA_);

  const hojaGestion = mv568HojaGestion_(false);
  const versionGestion = hojaGestion ? hojaGestion.getLastRow() : 0;
  const cache = CacheService.getScriptCache();
  const claveCache = [
    "MV568",normalizarUsuario(usuario.usuario),sedeFiltro,tipoFiltro,
    claseFiltro,gestionFiltro,desde,hasta,limite,
    mv395VersionCacheMapa_(),versionGestion
  ].join("|").substring(0,240);

  try {
    const raw = cache.get(claveCache);
    if (raw) {
      const d = JSON.parse(raw);
      d.cacheV568 = true;
      return d;
    }
  } catch (_) {}

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAPA_OPERATIVO);
  if (!hoja || hoja.getLastRow() <= 1) {
    return {ok:true,modulo:"RECUPERACION_ORDENES",accion:"LISTAR",ordenes:[],registros:0,totalCoincidencias:0,optimizadoV568:true};
  }

  const cantidad = hoja.getLastRow()-1;

  // Lectura liviana: solo columnas necesarias para la vista.
  const ab = hoja.getRange(2,1,cantidad,2).getDisplayValues();
  const ce = hoja.getRange(2,3,cantidad,3).getDisplayValues();
  const ij = hoja.getRange(2,9,cantidad,2).getDisplayValues();
  const n = hoja.getRange(2,14,cantidad,1).getDisplayValues();
  const qr = hoja.getRange(2,17,cantidad,2).getDisplayValues();
  const u = hoja.getRange(2,21,cantidad,1).getDisplayValues();

  const estadosGestion = mv568EstadosGestion_();
  const lista = [];
  let totalCoincidencias = 0;

  for (let i=0;i<cantidad;i++) {
    const ordenId = textoMapa(ab[i][0]);
    if (!ordenId) continue;

    // Si WIN la entrega nuevamente y pasa a FINALIZADA, desaparece automáticamente.
    if (normalizarTexto(ij[i][0]) !== "CANCELADA") continue;

    const sedeFila = sedeMapaOperativo(n[i][0]);
    if (!sedeFila) continue;
    if (sedeFiltro && normalizarTexto(sedeFila) !== sedeFiltro) continue;

    const clasificacion = mv567ClasificarMotivo_(u[i][0]);
    if (!clasificacion) continue;

    const tipoOrden = mv567TipoOrden_(ab[i][1]);
    if (tipoFiltro && normalizarTexto(tipoOrden) !== tipoFiltro) continue;
    if (claseFiltro && normalizarTexto(clasificacion) !== claseFiltro) continue;

    const fechaIso = fechaMapaISO(ce[i][0]);
    if (desde && fechaIso && fechaIso < desde) continue;
    if (hasta && fechaIso && fechaIso > hasta) continue;

    const g = estadosGestion[ordenId] || {
      estadoGestion:"LIBRE",usuarioGestion:"",nombreGestion:"",perfilGestion:"",fechaGestion:"",horaGestion:""
    };

    if (gestionFiltro && normalizarTexto(g.estadoGestion) !== gestionFiltro) continue;

    totalCoincidencias++;
    if (lista.length >= limite) continue;

    const movil = textoMapa(qr[i][0]);
    const fijo = textoMapa(qr[i][1]);
    const telefono = movil && movil !== "0" ? movil : (fijo && fijo !== "0" ? fijo : "");

    lista.push({
      ordenId:ordenId,
      tipoOrden:tipoOrden,
      clasificacion:clasificacion,
      cliente:textoMapa(ce[i][2]),
      telefono:telefono,
      direccion:textoMapa(ij[i][1]),
      motivo:textoMapa(u[i][0]),
      fechaSolicitud:textoMapa(ce[i][0]),
      horaSolicitud:textoMapa(ce[i][1]),
      sede:sedeFila,
      estadoGestion:g.estadoGestion || "LIBRE",
      gestionPropia:normalizarUsuario(g.usuarioGestion) === normalizarUsuario(usuario.usuario),
      usuarioGestion:g.usuarioGestion || "",
      nombreGestion:mv568PerfilPuedeLiberar_(usuario.perfil) ? (g.nombreGestion || "") : "",
      fechaGestion:g.fechaGestion || "",
      horaGestion:g.horaGestion || "",
      puedeTomar:(g.estadoGestion || "LIBRE") !== "EN GESTION",
      puedeLiberar:mv568PerfilPuedeLiberar_(usuario.perfil) && (g.estadoGestion || "") === "EN GESTION"
    });
  }

  lista.sort(function(a,b){
    if (a.gestionPropia !== b.gestionPropia) return a.gestionPropia ? -1 : 1;
    if (a.estadoGestion !== b.estadoGestion) return a.estadoGestion === "LIBRE" ? -1 : 1;
    const fa = fechaMapaISO(a.fechaSolicitud);
    const fb = fechaMapaISO(b.fechaSolicitud);
    return fb.localeCompare(fa) || String(b.horaSolicitud).localeCompare(String(a.horaSolicitud));
  });

  const salida = {
    ok:true,
    modulo:"RECUPERACION_ORDENES",
    accion:"LISTAR",
    sede:sedeFiltro,
    perfil:usuario.perfil,
    registros:lista.length,
    totalCoincidencias:totalCoincidencias,
    truncado:totalCoincidencias > lista.length,
    ordenes:lista,
    optimizadoV568:true,
    filasEvaluadas:cantidad
  };

  try {
    const raw = JSON.stringify(salida);
    if (raw.length < 90000) cache.put(claveCache,raw,MV568_CACHE_TTL_);
  } catch (_) {}

  return salida;
}

function tomarRecuperacionOrdenV568(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!mv568PerfilPuedeGestionar_(usuario.perfil)) {
    throw new Error("No tienes permiso para gestionar esta orden");
  }

  const ordenId = (data.ordenId || "").toString().trim();
  if (!ordenId) throw new Error("Orden no válida");

  const lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    const item = mv568BuscarOrdenMapa_(ordenId);
    mv568ValidarAccesoOrden_(usuario,item);
    mv568ValidarRecuperableActual_(item);

    const ultimo = mv568UltimoEvento_(ordenId);
    if (ultimo && ultimo.estadoGestion === "EN GESTION") {
      if (ultimo.usuario === normalizarUsuario(usuario.usuario)) {
        return {
          ok:true,modulo:"RECUPERACION_ORDENES",accion:"TOMAR",
          ordenId:ordenId,estadoGestion:"EN GESTION",yaEraPropia:true
        };
      }
      throw new Error("La orden ya está en gestión por otro usuario");
    }

    const idEvento = mv568AppendEvento_(item,usuario,"EN GESTION","TOMAR","");
    SpreadsheetApp.flush();

    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"TOMAR",
      ordenId:ordenId,
      estadoGestion:"EN GESTION",
      idEvento:idEvento
    };
  } finally {
    lock.releaseLock();
  }
}

function liberarRecuperacionOrdenV568(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!mv568PerfilPuedeLiberar_(usuario.perfil)) {
    throw new Error("Solo Supervisor o Jefatura pueden liberar una gestión");
  }

  const ordenId = (data.ordenId || "").toString().trim();
  if (!ordenId) throw new Error("Orden no válida");

  const lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    const item = mv568BuscarOrdenMapa_(ordenId);
    if (!item) throw new Error("La orden ya no existe en Mapa Operativo");
    mv568ValidarAccesoOrden_(usuario,item);

    const ultimo = mv568UltimoEvento_(ordenId);
    if (!ultimo || ultimo.estadoGestion !== "EN GESTION") {
      return {
        ok:true,modulo:"RECUPERACION_ORDENES",accion:"LIBERAR",
        ordenId:ordenId,estadoGestion:"LIBRE",yaEstabaLibre:true
      };
    }

    const idEvento = mv568AppendEvento_(
      item,
      usuario,
      "LIBRE",
      "LIBERAR",
      (data.observacion || "").toString().trim()
    );
    SpreadsheetApp.flush();

    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"LIBERAR",
      ordenId:ordenId,
      estadoGestion:"LIBRE",
      idEvento:idEvento
    };
  } finally {
    lock.releaseLock();
  }
}
