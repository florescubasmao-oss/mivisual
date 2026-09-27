/* ============================================================
   MI VISUAL V571 - RECUPERACION / FECHA UNICA PARA TECNICO
   - Técnico puede elegir una fecha puntual.
   - Backend fuerza desde = hasta para Técnico.
   - Supervisor/Jefatura mantienen rango.
   - Conserva optimización V570 por grupos.
============================================================ */

function listarRecuperacionOrdenesV571(data) {
  const usuario = obtenerUsuarioApp(data.usuario);

  if (!mv568PerfilPuedeGestionar_(usuario.perfil)) {
    throw new Error("No tienes acceso a Recuperación de Órdenes");
  }

  const esTecnico = mv570EsTecnico_(usuario.perfil);
  const esJefatura = mv568EsJefatura_(usuario.perfil);
  let sedeFiltro = normalizarTexto(data.sede || "");

  if (!esJefatura) {
    sedeFiltro = normalizarTexto(usuario.sede || "");
  }

  if (!sedeFiltro && !esJefatura) {
    throw new Error("El usuario no tiene sede asignada");
  }

  const hoy = mv570HoyIso_();
  const fechaElegida = fechaMapaISO(data.fecha || data.desde || "") || hoy;

  let desde = esTecnico
    ? fechaElegida
    : (fechaMapaISO(data.desde || "") || hoy);

  let hasta = esTecnico
    ? fechaElegida
    : (fechaMapaISO(data.hasta || "") || hoy);

  if (desde > hasta) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }

  const copia = Object.assign({}, data, {
    sede: sedeFiltro,
    desde: desde,
    hasta: hasta
  });

  // Reutiliza exactamente la optimización V570.
  // Para Técnico, desde y hasta serán siempre la misma fecha.
  const salida = listarRecuperacionOrdenesV570(copia);

  salida.optimizadoV571 = true;
  salida.fechaUnicaTecnico = esTecnico;
  salida.fechaConsulta = esTecnico ? fechaElegida : "";
  return salida;
}
