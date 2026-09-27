/* ============================================================
   MI VISUAL V576 - RECUPERACION / PANEL EN GESTION
   - Supervisor/Jefatura/Admin: ver todas las órdenes actualmente EN GESTION.
   - Técnico: ver MIS GESTIONES.
   - No depende de fecha para el panel EN GESTION.
   - Revalida MAPA_ORDENES: si ya no está Cancelada, no se muestra.
============================================================ */

function listarRecuperacionEnGestionV576(data) {
  const usuario = obtenerUsuarioApp(data.usuario);

  if (!mv568PerfilPuedeGestionar_(usuario.perfil)) {
    throw new Error("No tienes acceso a Recuperación de Órdenes");
  }

  const perfilTxt = normalizarTexto(usuario.perfil || "");
  const esTecnico = perfilTxt === "TECNICO";
  const esJefatura = mv568EsJefatura_(usuario.perfil);

  let sedeFiltro = normalizarTexto(data.sede || "");

  if (!esJefatura) {
    sedeFiltro = normalizarTexto(usuario.sede || "");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaGestion = ss.getSheetByName("RECUPERACION_ORDENES");

  if (!hojaGestion || hojaGestion.getLastRow() <= 1) {
    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"EN_GESTION",
      sede:sedeFiltro,
      registros:0,
      ordenes:[]
    };
  }

  const eventos = hojaGestion
    .getRange(2,1,hojaGestion.getLastRow()-1,11)
    .getDisplayValues();

  const ultimos = {};

  for (let i=0;i<eventos.length;i++) {
    const r = eventos[i];
    const ordenId = String(r[3] || "").trim();
    if (!ordenId) continue;

    ultimos[ordenId] = {
      ordenId:ordenId,
      sede:normalizarTexto(r[4] || ""),
      estadoGestion:normalizarTexto(r[5] || ""),
      usuarioGestion:String(r[6] || "").trim(),
      nombreGestion:String(r[7] || "").trim(),
      perfilGestion:String(r[8] || "").trim(),
      fechaGestion:String(r[1] || "").trim(),
      horaGestion:String(r[2] || "").trim()
    };
  }

  const activos = Object.keys(ultimos)
    .map(function(k){ return ultimos[k]; })
    .filter(function(x){
      if (x.estadoGestion !== "EN GESTION") return false;

      if (esTecnico) {
        return normalizarUsuario(x.usuarioGestion) === normalizarUsuario(usuario.usuario);
      }

      if (sedeFiltro && x.sede && x.sede !== sedeFiltro) return false;

      return true;
    });

  if (!activos.length) {
    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"EN_GESTION",
      sede:sedeFiltro,
      registros:0,
      ordenes:[]
    };
  }

  const hojaMapa = ss.getSheetByName(HOJA_MAPA_OPERATIVO);

  if (!hojaMapa || hojaMapa.getLastRow() <= 1) {
    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"EN_GESTION",
      sede:sedeFiltro,
      registros:0,
      ordenes:[]
    };
  }

  // Índice liviano: solo columna A (ORDEN_ID).
  const idsMapa = hojaMapa
    .getRange(2,1,hojaMapa.getLastRow()-1,1)
    .getDisplayValues();

  const filaPorOrden = {};

  for (let i=0;i<idsMapa.length;i++) {
    const id = String(idsMapa[i][0] || "").trim();
    if (id) filaPorOrden[id] = i + 2;
  }

  const filas = activos
    .map(function(x){ return filaPorOrden[x.ordenId] || 0; })
    .filter(function(n){ return n > 0; })
    .sort(function(a,b){ return a-b; });

  if (!filas.length) {
    return {
      ok:true,
      modulo:"RECUPERACION_ORDENES",
      accion:"EN_GESTION",
      sede:sedeFiltro,
      registros:0,
      ordenes:[]
    };
  }

  const grupos = mv575AgruparFilas_(filas);
  const activoPorOrden = {};

  activos.forEach(function(x){
    activoPorOrden[x.ordenId] = x;
  });

  const lista = [];

  for (let g=0;g<grupos.length;g++) {
    const grupo = grupos[g];
    const numFilas = grupo.fin - grupo.inicio + 1;

    const bloque = hojaMapa
      .getRange(grupo.inicio,1,numFilas,21)
      .getDisplayValues();

    for (let j=0;j<bloque.length;j++) {
      const r = bloque[j];

      const ordenId = textoMapa(r[0]);
      const gest = activoPorOrden[ordenId];

      if (!gest) continue;

      // Ya no se considera recuperable si el estado actual cambió.
      if (normalizarTexto(textoMapa(r[8])) !== "CANCELADA") continue;

      const sedeFila = sedeMapaOperativo(textoMapa(r[13]));
      if (!sedeFila) continue;

      if (sedeFiltro && normalizarTexto(sedeFila) !== sedeFiltro) continue;

      const motivo = textoMapa(r[20]);
      const clasificacion = mv567ClasificarMotivo_(motivo);
      if (!clasificacion) continue;

      const tipoOrden = mv567TipoOrden_(textoMapa(r[1]));

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
        estadoGestion:"EN GESTION",
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
        puedeTomar:false,
        puedeLiberar:
          mv568PerfilPuedeLiberar_(usuario.perfil)
      });
    }
  }

  lista.sort(function(a,b){
    const fa = String(a.fechaGestion || "") + " " + String(a.horaGestion || "");
    const fb = String(b.fechaGestion || "") + " " + String(b.horaGestion || "");
    return fb.localeCompare(fa);
  });

  return {
    ok:true,
    modulo:"RECUPERACION_ORDENES",
    accion:"EN_GESTION",
    sede:sedeFiltro,
    perfil:usuario.perfil,
    registros:lista.length,
    ordenes:lista
  };
}
