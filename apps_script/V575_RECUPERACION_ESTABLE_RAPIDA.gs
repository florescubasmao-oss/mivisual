/* ============================================================
   MI VISUAL V575 - RECUPERACION ESTABLE Y RAPIDA
   - Técnico: una fecha exacta.
   - Busca filas del día con TextFinder sobre FECHA_SOLICITUD.
   - Incluye CODIGO_CLIENTE.
   - Gestión con verificación posterior si el POST tarda.
============================================================ */

const MV575_CACHE_TTL_ = 90;
const MV575_MAX_RESPUESTA_ = 120;

function mv575FechaIso_(valor) {
  return mv574FechaIsoReal_(valor);
}

function mv575FechaTexto_(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + "/" + m[2] + "/" + m[1]) : "";
}

function mv575FilasFecha_(hoja, iso) {
  const texto = mv575FechaTexto_(iso);
  if (!texto || !hoja || hoja.getLastRow() <= 1) return [];

  const rango = hoja.getRange(2,3,hoja.getLastRow()-1,1);
  const encontrados = rango
    .createTextFinder(texto)
    .matchEntireCell(true)
    .findAll();

  return (encontrados || [])
    .map(function(c){ return c.getRow(); })
    .sort(function(a,b){ return a-b; });
}

function mv575AgruparFilas_(filas) {
  const grupos = [];
  if (!filas || !filas.length) return grupos;

  let inicio = filas[0];
  let fin = filas[0];

  for (let i=1;i<filas.length;i++) {
    if (filas[i] === fin + 1) {
      fin = filas[i];
      continue;
    }
    grupos.push({inicio:inicio,fin:fin});
    inicio = filas[i];
    fin = filas[i];
  }

  grupos.push({inicio:inicio,fin:fin});
  return grupos;
}

function listarRecuperacionOrdenesV575(data) {
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
    const fecha = mv575FechaIso_(data.fecha || "");
    if (!fecha) throw new Error("Seleccione una fecha válida");
    desde = fecha;
    hasta = fecha;
  } else {
    desde = mv575FechaIso_(data.desde || "") || hoy;
    hasta = mv575FechaIso_(data.hasta || "") || hoy;
    if (desde > hasta) {
      const tmp = desde;
      desde = hasta;
      hasta = tmp;
    }
  }

  // Si Supervisor/Jefatura usa rango de varios días,
  // conserva la ruta V574 ya validada.
  if (!esTecnico && desde !== hasta) {
    const copia = Object.assign({}, data, {desde:desde,hasta:hasta,sede:sedeFiltro});
    const salidaRango = listarRecuperacionOrdenesV574(copia);
    salidaRango.optimizadoV575 = true;
    salidaRango.modoV575 = "RANGO_V574";
    return salidaRango;
  }

  const tipoFiltro = normalizarTexto(data.tipo || "");
  const claseFiltro = normalizarTexto(data.estadoRecuperacion || data.clasificacion || "");
  const gestionFiltro = normalizarTexto(data.gestion || "");

  const limite = Math.min(
    Math.max(Number(data.limite) || MV575_MAX_RESPUESTA_,1),
    MV575_MAX_RESPUESTA_
  );

  const hojaGestion = mv568HojaGestion_(false);
  const versionGestion = hojaGestion ? hojaGestion.getLastRow() : 0;

  const cache = CacheService.getScriptCache();
  const claveCache = [
    "MV575",normalizarUsuario(usuario.usuario),sedeFiltro,
    tipoFiltro,claseFiltro,gestionFiltro,desde,limite,
    mv395VersionCacheMapa_(),versionGestion
  ].join("|").substring(0,240);

  try {
    const raw = cache.get(claveCache);
    if (raw) {
      const d = JSON.parse(raw);
      d.cacheV575 = true;
      return d;
    }
  } catch (_) {}

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAPA_OPERATIVO);

  if (!hoja || hoja.getLastRow() <= 1) {
    return {
      ok:true,modulo:"RECUPERACION_ORDENES",accion:"LISTAR",
      sede:sedeFiltro,desde:desde,hasta:hasta,
      registros:0,totalCoincidencias:0,ordenes:[],
      optimizadoV575:true,fechaUnicaTecnico:esTecnico
    };
  }

  const filas = mv575FilasFecha_(hoja,desde);

  if (!filas.length) {
    return {
      ok:true,modulo:"RECUPERACION_ORDENES",accion:"LISTAR",
      sede:sedeFiltro,desde:desde,hasta:hasta,
      registros:0,totalCoincidencias:0,ordenes:[],
      optimizadoV575:true,fechaUnicaTecnico:esTecnico,
      filasPeriodo:0,gruposLeidos:0
    };
  }

  const grupos = mv575AgruparFilas_(filas);
  const estadosGestion = mv568EstadosGestion_();

  const lista = [];
  let totalCoincidencias = 0;
  let filasLeidas = 0;

  for (let g=0;g<grupos.length;g++) {
    const grupo = grupos[g];
    const numFilas = grupo.fin - grupo.inicio + 1;

    const bloque = hoja
      .getRange(grupo.inicio,1,numFilas,21)
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
        codigoCliente:textoMapa(r[14]),
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
    optimizadoV575:true,
    fechaUnicaTecnico:esTecnico,
    filasPeriodo:filas.length,
    gruposLeidos:grupos.length,
    filasLeidasPeriodo:filasLeidas
  };

  try {
    const raw = JSON.stringify(salida);
    if (raw.length < 90000) {
      cache.put(claveCache,raw,MV575_CACHE_TTL_);
    }
  } catch (_) {}

  return salida;
}

function estadoRecuperacionOrdenV575(data) {
  const usuario = obtenerUsuarioApp(data.usuario);
  const ordenId = String(data.ordenId || "").trim();

  if (!ordenId) throw new Error("Orden no válida");

  const ultimo = mv568UltimoEvento_(ordenId);

  if (!ultimo) {
    return {
      ok:true,
      ordenId:ordenId,
      estadoGestion:"LIBRE",
      gestionPropia:false
    };
  }

  return {
    ok:true,
    ordenId:ordenId,
    estadoGestion:ultimo.estadoGestion || "LIBRE",
    gestionPropia:
      normalizarUsuario(ultimo.usuario) ===
      normalizarUsuario(usuario.usuario),
    nombreGestion:
      mv568PerfilPuedeLiberar_(usuario.perfil)
        ? (ultimo.nombre || "")
        : ""
  };
}
