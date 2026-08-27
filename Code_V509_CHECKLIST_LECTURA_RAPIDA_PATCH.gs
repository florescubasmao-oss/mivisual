/* ============================================================
   MI VISUAL V509 - CHECKLIST ALMACEN / LECTURA RAPIDA BACKEND

   ALCANCE ESTRICTO
   - Reemplaza SOLO listarChecklistAlmacen(data).
   - No modifica registro, validaciones, evidencias, permisos ni Drive.
   - No toca Produccion, Ranking, SLA, WIN ni Partner.

   PROBLEMAS CORREGIDOS
   1) La lectura anterior llamaba asegurarHojaChecklistAlmacen(), cuya
      version final reescribe 83 encabezados en cada consulta.
   2) Dentro del bucle se llamaba obtenerDatosCuadrillaApp() por cada fila;
      esa funcion vuelve a leer USUARIOS mediante obtenerMapaUsuarios().
   3) HERRAMIENTAS_DETALLE se cargaba siempre, aunque no hubiera registros
      de tipo HERRAMIENTAS en la lista visible.

   V509
   - CHECKLIST_ALMACEN: una sola lectura de datos.
   - USUARIOS: un solo mapa por consulta.
   - HERRAMIENTAS_DETALLE: solo si realmente se necesita.
============================================================ */

function listarChecklistAlmacen(data) {
  data = data || {};
  const inicio = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Lectura pura: NO usar asegurarHojaChecklistAlmacen() aquí porque la
  // implementación vigente escribe encabezados cada vez que se invoca.
  let hoja = ss.getSheetByName(HOJA_CHECKLIST_ALMACEN);
  if (!hoja) hoja = asegurarHojaChecklistAlmacen();

  const usuario = obtenerUsuarioApp(data.usuario);
  const perfil = normalizarTexto(usuario.perfil || "");
  const sedeUsuario = normalizarTexto(usuario.sede || "");
  const cuadrillaUsuario = normalizarCuadrilla(usuario.cuadrilla || "");

  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) {
    return {
      ok: true,
      modulo: "CHECKLIST_ALMACEN",
      accion: "LISTAR",
      perfil: usuario.perfil,
      registros: 0,
      checklist: [],
      versionLectura: "V509",
      tiempoMs: Date.now() - inicio
    };
  }

  // La estructura vigente llega hasta la columna 83.
  const columnas = Math.min(83, Math.max(1, hoja.getLastColumn()));
  const datos = hoja.getRange(2, 1, ultimaFila - 1, columnas).getValues();

  // Una sola lectura de USUARIOS para toda la consulta.
  const mapaUsuarios = obtenerMapaUsuarios();
  const lista = [];
  let requiereHerramientas = false;

  for (let i = 0; i < datos.length; i++) {
    const item = filaChecklistAObjeto(datos[i]);
    const tipo = normalizarTexto(item.tipoChecklist || "MATERIALES");
    let permitir = false;

    if (perfil === "TECNICO") {
      permitir = cuadrillaUsuario === normalizarCuadrilla(item.cuadrilla);
    } else if (perfil === "ALMACEN" || perfil === "SUPERVISOR") {
      permitir = sedeUsuario === normalizarTexto(item.sede);
    } else if (esPerfilJefaturaAlmacen(perfil) || esPerfilJefatura(perfil)) {
      permitir = true;
    }

    if (!permitir) continue;
    if (perfil === "ALMACEN" && !["MATERIALES", "HERRAMIENTAS"].includes(tipo)) continue;

    if (data.sede && normalizarTexto(data.sede) !== normalizarTexto(item.sede)) continue;
    if (data.cuadrilla && normalizarCuadrilla(data.cuadrilla) !== normalizarCuadrilla(item.cuadrilla)) continue;
    if (data.estado && normalizarTexto(data.estado) !== normalizarTexto(item.estadoGeneral)) continue;
    if (data.tipoChecklist && normalizarTexto(data.tipoChecklist) !== tipo) continue;

    item.tipoChecklist = tipo;

    // Antes se llamaba obtenerDatosCuadrillaApp() aquí por cada registro.
    // V509 reutiliza el mapa de USUARIOS ya cargado una sola vez.
    const claveCuadrilla = normalizarCuadrilla(item.cuadrilla || "");
    const datosCuadrilla = mapaUsuarios[claveCuadrilla] || null;
    item.supervisor = datosCuadrilla ? (datosCuadrilla.usuarioSupervisor || "") : "";

    const vencimientos = [
      item.licenciaFechaVencimiento,
      item.soatFechaVencimiento,
      item.revisionTecnicaFechaVencimiento
    ].map(diasParaVencimientoChecklistV141).filter(function(v){ return v !== null; });

    item.diasVencimientoMinimo = vencimientos.length ? Math.min.apply(null, vencimientos) : null;
    item.estadoVencimiento = item.diasVencimientoMinimo === null
      ? "NO APLICA"
      : (item.diasVencimientoMinimo < 0
          ? "VENCIDO"
          : (item.diasVencimientoMinimo <= 30 ? "PROXIMO A VENCER" : "VIGENTE"));

    if (tipo === "HERRAMIENTAS") requiereHerramientas = true;
    lista.push(item);
  }

  // Solo consultar la hoja secundaria si la respuesta realmente contiene
  // registros de Herramientas.
  let herramientasMapa = {};
  if (requiereHerramientas) {
    herramientasMapa = obtenerHerramientasDetallePorChecklistV141();
  }

  for (let i = 0; i < lista.length; i++) {
    lista[i].herramientasDetalle = herramientasMapa[lista[i].id] || [];
  }

  lista.reverse();

  return {
    ok: true,
    modulo: "CHECKLIST_ALMACEN",
    accion: "LISTAR",
    perfil: usuario.perfil,
    registros: lista.length,
    checklist: lista,
    versionLectura: "V509",
    tiempoMs: Date.now() - inicio
  };
}
