/* ============================================================
   MI VISUAL V569 - RECUPERACION DE ORDENES / CONSULTA DIARIA RAPIDA
   - TECNICO: solo el dia actual, obligatorio desde backend.
   - Otros perfiles: rango permitido, por defecto hoy.
   - Optimiza leyendo primero solo FECHA y luego un bloque acotado.
============================================================ */

const MV569_CACHE_TTL_ = 60;
const MV569_MAX_RESPUESTA_ = 250;

function mv569EsTecnico_(perfil) {
  return normalizarTexto(perfil || "") === "TECNICO";
}

function mv569HoyIso_() {
  return Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
}

function listarRecuperacionOrdenesV569(data) {
  const usuario = obtenerUsuarioApp(data.usuario);

  if (!mv568PerfilPuedeGestionar_(usuario.perfil)) {
    throw new Error("No tienes acceso a Recuperación de Órdenes");
  }

  const esTecnico = mv569EsTecnico_(usuario.perfil);
  const esJefatura = mv568EsJefatura_(usuario.perfil);

  let sedeFiltro = normalizarTexto(data.sede || "");
  if (!esJefatura) {
    sedeFiltro = normalizarTexto(usuario.sede || "");
  }

  if (!sedeFiltro && !esJefatura) {
    throw new Error("El usuario no tiene sede asignada");
  }

  const hoy = mv569HoyIso_();

  // Protección de rendimiento:
  // el perfil TECNICO siempre consulta únicamente el día actual.
  let desde = esTecnico ? hoy : (fechaMapaISO(data.desde || "") || hoy);
  let hasta = esTecnico ? hoy : (fechaMapaISO(data.hasta || "") || hoy);

  if (desde > hasta) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }

  const tipoFiltro = normalizarTexto(data.tipo || "");
  const claseFiltro = normalizarTexto(
    data.estadoRecuperacion || data.clasificacion || ""
  );
  const gestionFiltro = normalizarTexto(data.gestion || "");

  const limite = Math.min(
    Math.max(Number(data.limite) || MV569_MAX_RESPUESTA_, 1),
    MV569_MAX_RESPUESTA_
  );

  const hojaGestion = mv568HojaGestion_(false);
  const versionGestion = hojaGestion ? hojaGestion.getLastRow() : 0;

  const cache = CacheService.getScriptCache();
  const claveCache = [
    "MV569",
    normalizarUsuario(usuario.usuario),
    sedeFiltro,
    tipoFiltro,
    claseFiltro,
    gestionFiltro,
    desde,
    hasta,
    limite,
    mv395VersionCacheMapa_(),
    versionGestion
  ].join("|").substring(0,240);

  try {
    const raw = cache.get(claveCache);
    if (raw) {
      const d = JSON.parse(raw);
      d.cacheV569 = true;
      return d;
    }
  } catch (_) {}

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAPA_OPERATIVO);

  if (!hoja || hoja.getLastRow() <= 1) {
    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"LISTAR",
      sede:sedeFiltro,
      desde:desde,
      hasta:hasta,
      registros:0,
      totalCoincidencias:0,
      ordenes:[],
      optimizadoV569:true,
      consultaDiariaTecnico:esTecnico
    };
  }

  const cantidad = hoja.getLastRow() - 1;

  // PASO 1: leer solamente FECHA (columna C) de MAPA_ORDENES.
  // Esto evita leer todas las columnas de miles de filas.
  const fechas = hoja.getRange(2,3,cantidad,1).getDisplayValues();

  const indices = [];
  for (let i=0; i<cantidad; i++) {
    const iso = fechaMapaISO(fechas[i][0]);
    if (!iso) continue;
    if (iso < desde || iso > hasta) continue;
    indices.push(i);
  }

  if (!indices.length) {
    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"LISTAR",
      sede:sedeFiltro,
      desde:desde,
      hasta:hasta,
      registros:0,
      totalCoincidencias:0,
      ordenes:[],
      optimizadoV569:true,
      consultaDiariaTecnico:esTecnico,
      filasMapa:cantidad,
      filasPeriodo:0
    };
  }

  // PASO 2: leer una sola vez A:U únicamente entre la primera
  // y la última fila perteneciente al periodo solicitado.
  const primerIndice = indices[0];
  const ultimoIndice = indices[indices.length - 1];
  const filaInicio = primerIndice + 2;
  const filasBloque = ultimoIndice - primerIndice + 1;

  const bloque = hoja
    .getRange(filaInicio,1,filasBloque,21)
    .getDisplayValues();

  const estadosGestion = mv568EstadosGestion_();
  const lista = [];
  let totalCoincidencias = 0;

  for (let pos=0; pos<indices.length; pos++) {
    const indiceOriginal = indices[pos];
    const local = indiceOriginal - primerIndice;
    const r = bloque[local];

    if (!r) continue;

    const ordenId = textoMapa(r[0]);       // A
    const tipoTrabajo = textoMapa(r[1]);   // B
    const fechaSolicitud = textoMapa(r[2]);// C
    const horaSolicitud = textoMapa(r[3]); // D
    const cliente = textoMapa(r[4]);       // E
    const estado = textoMapa(r[8]);        // I
    const direccion = textoMapa(r[9]);     // J
    const region = textoMapa(r[13]);       // N
    const movil = textoMapa(r[16]);        // Q
    const fijo = textoMapa(r[17]);         // R
    const motivo = textoMapa(r[20]);       // U

    if (!ordenId) continue;

    // Regla principal: si WIN/MAPA ya la pasó a FINALIZADA,
    // deja de aparecer automáticamente.
    if (normalizarTexto(estado) !== "CANCELADA") continue;

    const sedeFila = sedeMapaOperativo(region);
    if (!sedeFila) continue;

    if (
      sedeFiltro &&
      normalizarTexto(sedeFila) !== sedeFiltro
    ) continue;

    const clasificacion = mv567ClasificarMotivo_(motivo);
    if (!clasificacion) continue;

    const tipoOrden = mv567TipoOrden_(tipoTrabajo);

    if (
      tipoFiltro &&
      normalizarTexto(tipoOrden) !== tipoFiltro
    ) continue;

    if (
      claseFiltro &&
      normalizarTexto(clasificacion) !== claseFiltro
    ) continue;

    const g = estadosGestion[ordenId] || {
      estadoGestion:"LIBRE",
      usuarioGestion:"",
      nombreGestion:"",
      perfilGestion:"",
      fechaGestion:"",
      horaGestion:""
    };

    if (
      gestionFiltro &&
      normalizarTexto(g.estadoGestion) !== gestionFiltro
    ) continue;

    totalCoincidencias++;

    if (lista.length >= limite) continue;

    const telefono =
      movil && movil !== "0"
        ? movil
        : (fijo && fijo !== "0" ? fijo : "");

    lista.push({
      ordenId:ordenId,
      tipoOrden:tipoOrden,
      clasificacion:clasificacion,
      cliente:cliente,
      telefono:telefono,
      direccion:direccion,
      motivo:motivo,
      fechaSolicitud:fechaSolicitud,
      horaSolicitud:horaSolicitud,
      sede:sedeFila,
      estadoGestion:g.estadoGestion || "LIBRE",
      gestionPropia:
        normalizarUsuario(g.usuarioGestion) ===
        normalizarUsuario(usuario.usuario),
      usuarioGestion:g.usuarioGestion || "",
      nombreGestion:
        mv568PerfilPuedeLiberar_(usuario.perfil)
          ? (g.nombreGestion || "")
          : "",
      fechaGestion:g.fechaGestion || "",
      horaGestion:g.horaGestion || "",
      puedeTomar:
        (g.estadoGestion || "LIBRE") !== "EN GESTION",
      puedeLiberar:
        mv568PerfilPuedeLiberar_(usuario.perfil) &&
        (g.estadoGestion || "") === "EN GESTION"
    });
  }

  lista.sort(function(a,b) {
    if (a.gestionPropia !== b.gestionPropia) {
      return a.gestionPropia ? -1 : 1;
    }

    if (a.estadoGestion !== b.estadoGestion) {
      return a.estadoGestion === "LIBRE" ? -1 : 1;
    }

    return String(b.horaSolicitud || "")
      .localeCompare(String(a.horaSolicitud || ""));
  });

  const salida = {
    ok:true,
    modulo:"RECUPERACION_ORDENES",
    accion:"LISTAR",
    sede:sedeFiltro,
    perfil:usuario.perfil,
    desde:desde,
    hasta:hasta,
    registros:lista.length,
    totalCoincidencias:totalCoincidencias,
    truncado:totalCoincidencias > lista.length,
    ordenes:lista,
    optimizadoV569:true,
    consultaDiariaTecnico:esTecnico,
    filasMapa:cantidad,
    filasPeriodo:indices.length,
    filasBloqueLeidas:filasBloque
  };

  try {
    const raw = JSON.stringify(salida);
    if (raw.length < 90000) {
      cache.put(claveCache, raw, MV569_CACHE_TTL_);
    }
  } catch (_) {}

  return salida;
}
