/* ============================================================
   MI VISUAL V567 - RECUPERACION DE ORDENES / FASE 1
   SOLO LECTURA. NO CREA NI MODIFICA HOJAS.
   Fuente unica: MAPA_ORDENES.
============================================================ */

const MV567_CACHE_TTL_ = 45;
const MV567_MAX_RESPUESTA_ = 250;

function mv567Normalizar_(v) {
  return normalizarTexto(v || "");
}

function mv567EsMotivoBloqueado_(motivo) {
  const m = mv567Normalizar_(motivo);
  if (!m) return true;
  const bloqueos = [
    "SIN COBERTURA",
    "POLITICA DE RIESGO",
    "FLIPPING",
    "SOLICITUD DE BAJA",
    "NO HAY POSTE",
    "CLIENTE CON SERVICIO",
    "POTENCIA OPTIMA",
    "POTENCIA ÓPTIMA"
  ];
  return bloqueos.some(function(x){ return m.indexOf(mv567Normalizar_(x)) >= 0; });
}

function mv567ClasificarMotivo_(motivo) {
  const m = mv567Normalizar_(motivo);
  if (!m || mv567EsMotivoBloqueado_(m)) return "";

  if (m.indexOf("REPROGRAM") >= 0 || m.indexOf("RESERVA CLIENTE") >= 0 || m.indexOf("ORDEN RESERVADA") >= 0) {
    return "REPROGRAMADO";
  }

  const recuperables = [
    "CLIENTE AUSENTE",
    "NO CONTESTA",
    "NO RESPONDE",
    "MOTIVOS PERSONALES",
    "DIRECCION ERRADA",
    "DIRECCIÓN ERRADA",
    "CLIENTE NO DESEA ATENCION",
    "CLIENTE NO DESEA ATENCIÓN",
    "CAMBIO DE PLAN",
    "DESEA SVA"
  ];

  return recuperables.some(function(x){ return m.indexOf(mv567Normalizar_(x)) >= 0; })
    ? "CANCELADO"
    : "";
}

function mv567TipoOrden_(tipoTrabajo) {
  const grupo = grupoTrabajoMapaOperativo(tipoTrabajo || "");
  return grupo === "INSTALACIONES" ? "INSTALACION" : "VISITA TECNICA";
}

function mv567FechaIso_(valor) {
  return fechaMapaISO(valor || "");
}

function mv567UsuarioPuedeVer_(usuario) {
  const p = normalizarTexto(usuario && usuario.perfil || "");
  return [
    "TECNICO","SUPERVISOR","JEFATURA","JEFATURA GENERAL",
    "ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES",
    "JEFATURA DE OPERACIONES","OPERACIONES"
  ].indexOf(p) >= 0;
}

function listarRecuperacionOrdenesV567(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  if (!mv567UsuarioPuedeVer_(usuario)) {
    throw new Error("No tienes acceso a Recuperación de Órdenes");
  }

  const sedeUsuario = normalizarTexto(usuario.sede || "");
  const esJefatura = esPerfilJefatura(usuario.perfil) ||
    esPerfilJefaturaOperaciones(usuario.perfil) ||
    normalizarTexto(usuario.perfil) === "JEFATURA GENERAL";

  let sede = normalizarTexto(data.sede || "");
  if (!esJefatura) sede = sedeUsuario;
  if (!sede) throw new Error("El usuario no tiene sede asignada");

  const tipoFiltro = normalizarTexto(data.tipo || "");
  const estadoFiltro = normalizarTexto(data.estadoRecuperacion || data.clasificacion || "");
  const desde = mv567FechaIso_(data.desde || "");
  const hasta = mv567FechaIso_(data.hasta || "");
  const limite = Math.min(Math.max(Number(data.limite) || MV567_MAX_RESPUESTA_, 1), MV567_MAX_RESPUESTA_);

  const cache = CacheService.getScriptCache();
  const claveCache = [
    "MV567",
    normalizarUsuario(usuario.usuario),
    sede,tipoFiltro,estadoFiltro,desde,hasta,limite,
    mv395VersionCacheMapa_()
  ].join("|").substring(0,240);

  try {
    const guardado = cache.get(claveCache);
    if (guardado) {
      const salidaCache = JSON.parse(guardado);
      salidaCache.cacheV567 = true;
      return salidaCache;
    }
  } catch (_) {}

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAPA_OPERATIVO);
  if (!hoja || hoja.getLastRow() <= 1) {
    return {ok:true,modulo:"RECUPERACION_ORDENES",accion:"LISTAR",sede:sede,registros:0,totalCoincidencias:0,ordenes:[],soloLectura:true};
  }

  const cantidad = hoja.getLastRow() - 1;

  // Lectura liviana: 12 columnas utiles en 7 rangos; nunca 37 columnas de toda la hoja.
  const ab = hoja.getRange(2,1,cantidad,2).getDisplayValues();       // A Orden, B Tipo
  const ce = hoja.getRange(2,3,cantidad,3).getDisplayValues();       // C Fecha, D Hora, E Cliente
  const ij = hoja.getRange(2,9,cantidad,2).getDisplayValues();       // I Estado, J Direccion
  const n = hoja.getRange(2,14,cantidad,1).getDisplayValues();       // N Region
  const qr = hoja.getRange(2,17,cantidad,2).getDisplayValues();      // Q/R Telefonos
  const u = hoja.getRange(2,21,cantidad,1).getDisplayValues();       // U Motivo cancelacion

  const lista = [];
  let totalCoincidencias = 0;

  for (let i=0;i<cantidad;i++) {
    const ordenId = textoMapa(ab[i][0]);
    if (!ordenId) continue;

    if (normalizarTexto(ij[i][0]) !== "CANCELADA") continue;

    const sedeFila = sedeMapaOperativo(n[i][0]);
    if (!sedeFila || normalizarTexto(sedeFila) !== sede) continue;

    const clasificacion = mv567ClasificarMotivo_(u[i][0]);
    if (!clasificacion) continue;

    const tipoOrden = mv567TipoOrden_(ab[i][1]);
    if (tipoFiltro && normalizarTexto(tipoOrden) !== tipoFiltro) continue;
    if (estadoFiltro && normalizarTexto(clasificacion) !== estadoFiltro) continue;

    const fechaIso = mv567FechaIso_(ce[i][0]);
    if (desde && fechaIso && fechaIso < desde) continue;
    if (hasta && fechaIso && fechaIso > hasta) continue;

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
      sede:sedeFila
    });
  }

  lista.sort(function(a,b){
    const fa = mv567FechaIso_(a.fechaSolicitud);
    const fb = mv567FechaIso_(b.fechaSolicitud);
    return fb.localeCompare(fa) || String(b.horaSolicitud).localeCompare(String(a.horaSolicitud));
  });

  const salida = {
    ok:true,
    modulo:"RECUPERACION_ORDENES",
    accion:"LISTAR",
    sede:sede,
    perfil:usuario.perfil,
    registros:lista.length,
    totalCoincidencias:totalCoincidencias,
    truncado:totalCoincidencias > lista.length,
    ordenes:lista,
    soloLectura:true,
    optimizadoV567:true,
    filasEvaluadas:cantidad
  };

  try {
    const raw = JSON.stringify(salida);
    if (raw.length < 90000) cache.put(claveCache, raw, MV567_CACHE_TTL_);
  } catch (_) {}

  return salida;
}
