/* ============================================================
   MI VISUAL V572 - RECUPERACION / FECHA MANUAL ESTABLE
   - Técnico elige una fecha y consulta un solo día.
   - NO consulta automáticamente al abrir.
   - Supervisor/Jefatura conservan rango.
   - Reutiliza lectura optimizada por grupos de V570.
============================================================ */

function listarRecuperacionOrdenesV572(data) {
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
    const fechaElegida = fechaMapaISO(data.fecha || "");
    if (!fechaElegida) throw new Error("Seleccione una fecha");
    desde = fechaElegida;
    hasta = fechaElegida;
  } else {
    desde = fechaMapaISO(data.desde || "") || hoy;
    hasta = fechaMapaISO(data.hasta || "") || hoy;
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
    Math.max(Number(data.limite) || MV570_MAX_RESPUESTA_,1),
    MV570_MAX_RESPUESTA_
  );

  const hojaGestion = mv568HojaGestion_(false);
  const versionGestion = hojaGestion ? hojaGestion.getLastRow() : 0;

  const cache = CacheService.getScriptCache();
  const claveCache = [
    "MV572",
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
      d.cacheV572 = true;
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
      optimizadoV572:true,
      fechaUnicaTecnico:esTecnico
    };
  }

  const cantidad = hoja.getLastRow()-1;

  // PASO 1: únicamente columna Fecha.
  const fechas = hoja.getRange(2,3,cantidad,1).getDisplayValues();
  const indices = [];

  for (let i=0;i<cantidad;i++) {
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
      optimizadoV572:true,
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

  for (let g=0; g<grupos.length; g++) {
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
    optimizadoV572:true,
    fechaUnicaTecnico:esTecnico,
    filasMapa:cantidad,
    filasPeriodo:indices.length,
    gruposLeidos:grupos.length,
    filasLeidasPeriodo:filasLeidas
  };

  try {
    const raw = JSON.stringify(salida);
    if (raw.length < 90000) cache.put(claveCache,raw,MV570_CACHE_TTL_);
  } catch (_) {}

  return salida;
}
