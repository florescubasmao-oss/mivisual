/* ============================================================
   MI VISUAL V574 - RECUPERACION / CODIGO CLIENTE Y FEEDBACK
   - Técnico: una fecha exacta por consulta.
   - Usa valores Date reales de la columna C para evitar errores de formato.
   - Lee únicamente grupos contiguos de esa fecha.
   - Mantiene gestión V568 y reglas de sede.
============================================================ */

const MV574_CACHE_TTL_ = 90;
const MV574_MAX_RESPUESTA_ = 150;

function mv574FechaIsoReal_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, "America/Lima", "yyyy-MM-dd");
  }

  const t = String(valor == null ? "" : valor).trim();
  if (!t) return "";

  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return m[1] + "-" + ("0"+m[2]).slice(-2) + "-" + ("0"+m[3]).slice(-2);
  }

  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    // Si el segundo bloque > 12, interpretamos formato mm/dd/yyyy.
    // En caso contrario, conservamos dd/mm/yyyy usado por MI VISUAL.
    if (b > 12) {
      return m[3] + "-" + ("0"+a).slice(-2) + "-" + ("0"+b).slice(-2);
    }
    return m[3] + "-" + ("0"+b).slice(-2) + "-" + ("0"+a).slice(-2);
  }

  return fechaMapaISO(t);
}

function listarRecuperacionOrdenesV574(data) {
  const usuario = obtenerUsuarioApp(data.usuario);

  if (!mv568PerfilPuedeGestionar_(usuario.perfil)) {
    throw new Error("No tienes acceso a Recuperación de Órdenes");
  }

  const esTecnico = mv570EsTecnico_(usuario.perfil);
  const esJefatura = mv568EsJefatura_(usuario.perfil);

  let sedeFiltro = normalizarTexto(data.sede || "");
  if (!esJefatura) sedeFiltro = normalizarTexto(usuario.sede || "");

  if (!sedeFiltro && !esJefatura) {
    throw new Error("El usuario no tiene sede asignada");
  }

  const hoy = mv570HoyIso_();

  let desde = "";
  let hasta = "";

  if (esTecnico) {
    const fechaElegida = mv574FechaIsoReal_(data.fecha || "");
    if (!fechaElegida) throw new Error("Seleccione una fecha válida");
    desde = fechaElegida;
    hasta = fechaElegida;
  } else {
    desde = mv574FechaIsoReal_(data.desde || "") || hoy;
    hasta = mv574FechaIsoReal_(data.hasta || "") || hoy;

    if (desde > hasta) {
      const tmp = desde;
      desde = hasta;
      hasta = tmp;
    }
  }

  const tipoFiltro = normalizarTexto(data.tipo || "");
  const claseFiltro = normalizarTexto(
    data.estadoRecuperacion || data.clasificacion || ""
  );
  const gestionFiltro = normalizarTexto(data.gestion || "");

  const limite = Math.min(
    Math.max(Number(data.limite) || MV574_MAX_RESPUESTA_,1),
    MV574_MAX_RESPUESTA_
  );

  const hojaGestion = mv568HojaGestion_(false);
  const versionGestion = hojaGestion ? hojaGestion.getLastRow() : 0;

  const cache = CacheService.getScriptCache();
  const claveCache = [
    "MV574",
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
      d.cacheV573 = true;
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
      optimizadoV574:true,
      fechaUnicaTecnico:esTecnico
    };
  }

  const cantidad = hoja.getLastRow() - 1;

  // PASO 1: leer fecha como valor real, no texto formateado.
  const fechas = hoja.getRange(2,3,cantidad,1).getValues();

  const indices = [];
  for (let i=0;i<cantidad;i++) {
    const iso = mv574FechaIsoReal_(fechas[i][0]);
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
      optimizadoV574:true,
      fechaUnicaTecnico:esTecnico,
      filasMapa:cantidad,
      filasPeriodo:0,
      gruposLeidos:0
    };
  }

  const grupos = mv570AgruparIndices_(indices);
  const estadosGestion = mv568EstadosGestion_();

  const lista = [];
  let totalCoincidencias = 0;
  let filasLeidas = 0;

  for (let g=0;g<grupos.length;g++) {
    const grupo = grupos[g];
    const filaInicio = grupo.inicio + 2;
    const numFilas = grupo.fin - grupo.inicio + 1;

    const bloque = hoja
      .getRange(filaInicio,1,numFilas,21)
      .getDisplayValues();

    filasLeidas += numFilas;

    for (let j=0;j<bloque.length;j++) {
      const r = bloque[j];

      const ordenId = textoMapa(r[0]);
      if (!ordenId) continue;

      if (normalizarTexto(textoMapa(r[8])) !== "CANCELADA") continue;

      const sedeFila = sedeMapaOperativo(textoMapa(r[13]));
      if (!sedeFila) continue;

      if (sedeFiltro && normalizarTexto(sedeFila) !== sedeFiltro) continue;

      const motivo = textoMapa(r[20]);
      const clasificacion = mv567ClasificarMotivo_(motivo);
      if (!clasificacion) continue;

      const tipoOrden = mv567TipoOrden_(textoMapa(r[1]));
      if (tipoFiltro && normalizarTexto(tipoOrden) !== tipoFiltro) continue;
      if (claseFiltro && normalizarTexto(clasificacion) !== claseFiltro) continue;

      const gest = estadosGestion[ordenId] || {
        estadoGestion:"LIBRE",
        usuarioGestion:"",
        nombreGestion:"",
        perfilGestion:"",
        fechaGestion:"",
        horaGestion:""
      };

      if (gestionFiltro && normalizarTexto(gest.estadoGestion) !== gestionFiltro) continue;

      totalCoincidencias++;
      if (lista.length >= limite) continue;

      const movil = textoMapa(r[16]);
      const fijo = textoMapa(r[17]);
      const telefono =
        movil && movil !== "0"
          ? movil
          : (fijo && fijo !== "0" ? fijo : "");

      lista.push({
        ordenId:ordenId,
        tipoOrden:tipoOrden,
        clasificacion:clasificacion,
        cliente:textoMapa(r[4]),
        codigoCliente:textoMapa(r[14]),
        telefono:telefono,
        direccion:textoMapa(r[9]),
        motivo:motivo,
        fechaSolicitud:textoMapa(r[2]),
        horaSolicitud:textoMapa(r[3]),
        sede:sedeFila,
        estadoGestion:gest.estadoGestion || "LIBRE",
        gestionPropia:
          normalizarUsuario(gest.usuarioGestion) ===
          normalizarUsuario(usuario.usuario),
        usuarioGestion:gest.usuarioGestion || "",
        nombreGestion:
          mv568PerfilPuedeLiberar_(usuario.perfil)
            ? (gest.nombreGestion || "")
            : "",
        fechaGestion:gest.fechaGestion || "",
        horaGestion:gest.horaGestion || "",
        puedeTomar:(gest.estadoGestion || "LIBRE") !== "EN GESTION",
        puedeLiberar:
          mv568PerfilPuedeLiberar_(usuario.perfil) &&
          (gest.estadoGestion || "") === "EN GESTION"
      });
    }
  }

  lista.sort(function(a,b){
    if (a.gestionPropia !== b.gestionPropia) return a.gestionPropia ? -1 : 1;
    if (a.estadoGestion !== b.estadoGestion) {
      return a.estadoGestion === "LIBRE" ? -1 : 1;
    }
    return String(b.horaSolicitud || "").localeCompare(String(a.horaSolicitud || ""));
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
    optimizadoV574:true,
    fechaUnicaTecnico:esTecnico,
    filasMapa:cantidad,
    filasPeriodo:indices.length,
    gruposLeidos:grupos.length,
    filasLeidasPeriodo:filasLeidas
  };

  try {
    const raw = JSON.stringify(salida);
    if (raw.length < 90000) {
      cache.put(claveCache,raw,MV574_CACHE_TTL_);
    }
  } catch (_) {}

  return salida;
}
