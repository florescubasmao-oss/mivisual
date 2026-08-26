/* ==========================================================
   MI VISUAL V487.25 - VTR/GAR DENTRO DE VALIDACION TECNICA
   PEGAR AL FINAL DEL Code.gs VIGENTE

   OBJETIVO
   1) Mantener RECABLEADOS exactamente con su flujo actual.
   2) Permitir a SUPERVISOR (solo su sede) y JEFATURA gestionar VTR/GAR
      usando el permiso dinamico VALIDACION TECNICA / VALIDAR.
   3) Usar MAPA_ORDENES (data WIN) como fuente PRINCIPAL para proponer
      la cuadrilla responsable.
   4) La propuesta WIN es SOLO INFORMATIVA. Nunca CONFIRMA ni REASIGNA sola.
   5) BONO / NO BONO sigue siendo una decision distinta de la
      responsabilidad del indicador.
   6) Partner queda solo como respaldo/manual cuando WIN no resuelve
      con seguridad. Este parche NO lee Partner ni pisa datos WIN.

   REGLA DE ESTADO WIN POR ORDEN_ID
   - Gana FECHA_ULTIMO_ESTADO mas reciente.
   - Si no existe, se usa la fecha/hora operativa mas reciente.
   - Empate: FECHA_IMPORTACION mas reciente.
========================================================== */

var MV48725_VERSION_ = "V487.25-VTRGAR-VT-WIN-20260826";
var MV48725_HOJA_MAPA_WIN_ = "MAPA_ORDENES";
var MV48725_DIAS_MAXIMOS_ = 30;

function mv48725NormDocumento_(valor) {
  return String(valor == null ? "" : valor)
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase()
    .trim();
}

function mv48725FechaHora_(valor, horaOpcional) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    var d = new Date(valor.getTime());
    if (horaOpcional !== undefined && horaOpcional !== null && String(horaOpcional).trim() !== "") {
      var hh = mv48725PartesHora_(horaOpcional);
      if (hh) d.setHours(hh.h, hh.m, hh.s, 0);
    }
    return d;
  }

  var t = String(valor == null ? "" : valor).trim();
  if (!t) return null;

  var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var f = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0), 0);
    if (horaOpcional !== undefined && horaOpcional !== null && String(horaOpcional).trim() !== "") {
      var ph = mv48725PartesHora_(horaOpcional);
      if (ph) f.setHours(ph.h, ph.m, ph.s, 0);
    }
    return isNaN(f.getTime()) ? null : f;
  }

  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var fi = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0), 0);
    if (horaOpcional !== undefined && horaOpcional !== null && String(horaOpcional).trim() !== "") {
      var pi = mv48725PartesHora_(horaOpcional);
      if (pi) fi.setHours(pi.h, pi.m, pi.s, 0);
    }
    return isNaN(fi.getTime()) ? null : fi;
  }

  var gen = new Date(t);
  if (!isNaN(gen.getTime())) {
    if (horaOpcional !== undefined && horaOpcional !== null && String(horaOpcional).trim() !== "") {
      var pg = mv48725PartesHora_(horaOpcional);
      if (pg) gen.setHours(pg.h, pg.m, pg.s, 0);
    }
    return gen;
  }
  return null;
}

function mv48725PartesHora_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return {h:valor.getHours(),m:valor.getMinutes(),s:valor.getSeconds()};
  }
  var t = String(valor == null ? "" : valor).trim();
  var m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return {h:Number(m[1]) || 0,m:Number(m[2]) || 0,s:Number(m[3]) || 0};
}

function mv48725MaxFecha_() {
  var mejor = null;
  for (var i = 0; i < arguments.length; i++) {
    var f = arguments[i] instanceof Date ? arguments[i] : mv48725FechaHora_(arguments[i]);
    if (f && (!mejor || f.getTime() > mejor.getTime())) mejor = f;
  }
  return mejor;
}

function mv48725FechaDia_(valor) {
  var f = valor instanceof Date ? valor : mv48725FechaHora_(valor);
  if (!f) return null;
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

function mv48725DiasCalendario_(anterior, posterior) {
  var a = mv48725FechaDia_(anterior);
  var b = mv48725FechaDia_(posterior);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function mv48725FechaHoraVisible_(valor) {
  var f = valor instanceof Date ? valor : mv48725FechaHora_(valor);
  if (!f) return "";
  return Utilities.formatDate(f, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
}

function mv48725FechaIso_(valor) {
  var f = valor instanceof Date ? valor : mv48725FechaHora_(valor);
  if (!f) return "";
  return Utilities.formatDate(f, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function mv48725EsPerfilGestionVtrGar_(perfil) {
  var p = normalizarTexto(perfil);
  return p === "SUPERVISOR" || esPerfilJefatura(p);
}

function mv48725AccesoGestionVtrGar_(data) {
  var usuario = obtenerUsuarioApp((data || {}).usuario);
  if (!mv48725EsPerfilGestionVtrGar_(usuario.perfil)) {
    throw new Error("Solo Supervisor o Jefatura pueden gestionar VTR/GAR");
  }
  var permiso = exigirPermisoModuloCentral(usuario, "VALIDACION TECNICA", "VALIDAR");
  return {usuario:usuario, permiso:permiso};
}

function mv48725RegistroAlcance_(ctx, item) {
  var dato = Object.assign({}, item || {}, {
    sede:(item && (item.sedeEjecutora || item.sedeResponsable || item.sede)) || "",
    cuadrilla:(item && (item.cuadrillaEjecutora || item.cuadrillaResponsable || item.cuadrilla)) || ""
  });
  return registroCumpleAlcanceCentral(ctx.usuario, ctx.permiso, dato);
}

function mv48725LeerMapaWinUltimoEstado_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(MV48725_HOJA_MAPA_WIN_);
  if (!hoja || hoja.getLastRow() <= 1) {
    return {lista:[],porDni:{},ordenesUnicas:0};
  }

  var columnas = Math.max(37, hoja.getLastColumn());
  var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, columnas).getValues();
  var porOrden = {};

  for (var i = 0; i < datos.length; i++) {
    var f = datos[i];
    var ordenId = String(f[0] == null ? "" : f[0]).trim();
    if (!ordenId) continue;

    var fechaSolicitud = mv48725FechaHora_(f[2], f[3]);
    var fechaUltimoEstado = mv48725FechaHora_(f[11]);
    var fechaFin = mv48725FechaHora_(f[18]);
    var fechaInicio = mv48725FechaHora_(f[19]);
    var fechaImportacion = mv48725FechaHora_(f[26]);

    var fechaOperativa = fechaUltimoEstado ||
      mv48725MaxFecha_(fechaFin, fechaInicio, fechaSolicitud) ||
      fechaImportacion;

    var item = {
      ordenId:ordenId,
      tipoTrabajo:String(f[1] == null ? "" : f[1]).trim(),
      fechaSolicitud:fechaSolicitud,
      cliente:String(f[4] == null ? "" : f[4]).trim(),
      productoOrigen:String(f[6] == null ? "" : f[6]).trim(),
      cuadrilla:normalizarCuadrilla(f[7]),
      estado:normalizarTexto(f[8]),
      fechaUltimoEstado:fechaUltimoEstado,
      region:normalizarTexto(f[13]),
      codigoCliente:String(f[14] == null ? "" : f[14]).trim(),
      numeroDocumento:mv48725NormDocumento_(f[15]),
      fechaFinVisita:fechaFin,
      fechaInicioVisita:fechaInicio,
      motivoFinalizacion:String(f[21] == null ? "" : f[21]).trim(),
      detalle:String(f[25] == null ? "" : f[25]).trim(),
      fechaImportacion:fechaImportacion,
      codigoSeguimiento:String(f[36] == null ? "" : f[36]).trim(),
      _momentoEstado:fechaOperativa,
      _momentoImportacion:fechaImportacion
    };

    var anterior = porOrden[ordenId];
    if (!anterior) {
      porOrden[ordenId] = item;
      continue;
    }

    var ma = anterior._momentoEstado ? anterior._momentoEstado.getTime() : 0;
    var mn = item._momentoEstado ? item._momentoEstado.getTime() : 0;
    var ia = anterior._momentoImportacion ? anterior._momentoImportacion.getTime() : 0;
    var inn = item._momentoImportacion ? item._momentoImportacion.getTime() : 0;

    if (mn > ma || (mn === ma && inn >= ia)) porOrden[ordenId] = item;
  }

  var lista = Object.keys(porOrden).map(function(k){ return porOrden[k]; });
  var porDni = {};

  lista.forEach(function(item){
    if (item.estado !== "FINALIZADA") return;
    if (!item.numeroDocumento) return;
    if (!porDni[item.numeroDocumento]) porDni[item.numeroDocumento] = [];
    porDni[item.numeroDocumento].push(item);
  });

  Object.keys(porDni).forEach(function(dni){
    porDni[dni].sort(function(a,b){
      var fa = mv48725MomentoTrabajo_(a);
      var fb = mv48725MomentoTrabajo_(b);
      return (fa ? fa.getTime() : 0) - (fb ? fb.getTime() : 0);
    });
  });

  return {lista:lista,porDni:porDni,ordenesUnicas:lista.length};
}

function mv48725MomentoTrabajo_(item) {
  if (!item) return null;
  return item.fechaFinVisita ||
    item.fechaUltimoEstado ||
    item.fechaInicioVisita ||
    item.fechaSolicitud ||
    item.fechaImportacion ||
    null;
}

function mv48725EsIncidenciaWin_(item) {
  if (!item) return false;
  var tipo = normalizarTexto(item.tipoTrabajo);
  var seg = normalizarTexto(item.codigoSeguimiento).replace(/[^A-Z0-9]/g,"");
  return tipo === "GARANTIA" || tipo === "REITERADA" ||
    seg.indexOf("GAR") === 0 || seg.indexOf("VTR") === 0;
}

function mv48725ClaseAntecedenteWin_(item) {
  if (!item || item.estado !== "FINALIZADA" || mv48725EsIncidenciaWin_(item)) return "";
  var t = normalizarTexto([
    item.tipoTrabajo || "",
    item.productoOrigen || "",
    item.motivoFinalizacion || ""
  ].join(" "));

  if (!t) return "";
  if (t.indexOf("INSTALACION") >= 0) return "INSTALACION";

  var claves = [
    "LOS ROJO","INTERMITENCIA","VISITA","AVERIA","RECABLEADO","TRASLADO",
    "POSTVENTA","POST VENTA","POSVENTA","MESH","ONT","WINBOX","WIN BOX",
    "UTP","REUBICACION","DESCARTE","ASISTENCIA","PATCHCORD","CONECTOR",
    "MEJORA TECNOLOGICA","DEGRADACION","PROBLEMAS ESTETICOS"
  ];
  for (var i = 0; i < claves.length; i++) {
    if (t.indexOf(claves[i]) >= 0) return "SERVICIO";
  }

  return "SERVICIO";
}

function mv48725ManualWin_(motivo, extra) {
  return Object.assign({
    fuente:"WIN",
    segura:false,
    propuesta:"REVISION MANUAL",
    decisionSugerida:"",
    cuadrillaOrigen:"",
    ordenIdOrigen:"",
    codigoPedidoOrigen:"",
    fechaHoraOrigen:"",
    fechaOrigenISO:"",
    tipoTrabajoOrigen:"",
    diasTranscurridos:null,
    motivo:motivo || "WIN no encontro un antecedente suficientemente seguro",
    criterio:"DNI exacto + FINALIZADA + 1-30 dias + tipo compatible",
    partner:"RESPALDO_MANUAL_NO_APLICADO"
  }, extra || {});
}

function mv48725DetectarOrigenWin_(incidencia, indiceWin) {
  var tipo = normalizarTexto(incidencia && incidencia.tipo);
  if (tipo !== "GAR" && tipo !== "VTR") return mv48725ManualWin_("Tipo de incidencia no reconocido");

  var dni = mv48725NormDocumento_(incidencia && incidencia.numeroDocumento);
  if (!dni) return mv48725ManualWin_("La incidencia WIN no tiene DNI para realizar el cruce");

  var fechaInc = mv48725FechaHora_(incidencia && (incidencia.fechaISO || incidencia.fecha));
  if (!fechaInc) return mv48725ManualWin_("La incidencia no tiene una fecha valida");

  var lista = (indiceWin && indiceWin.porDni && indiceWin.porDni[dni]) || [];
  if (!lista.length) return mv48725ManualWin_("No existe historial WIN FINALIZADO para el mismo DNI");

  var candidatos = [];
  for (var i = 0; i < lista.length; i++) {
    var r = lista[i];
    var momento = mv48725MomentoTrabajo_(r);
    if (!momento) continue;
    var dias = mv48725DiasCalendario_(momento, fechaInc);
    if (dias == null || dias < 1 || dias > MV48725_DIAS_MAXIMOS_) continue;

    var clase = mv48725ClaseAntecedenteWin_(r);
    if (!clase) continue;
    if (tipo === "GAR" && clase !== "INSTALACION") continue;
    if (tipo === "VTR" && clase !== "SERVICIO") continue;

    candidatos.push({registro:r,momento:momento,dias:dias,clase:clase});
  }

  if (!candidatos.length) {
    return mv48725ManualWin_(tipo === "GAR"
      ? "WIN no encontro una INSTALACION FINALIZADA del mismo DNI en los 30 dias anteriores"
      : "WIN no encontro una atencion FINALIZADA compatible del mismo DNI en los 30 dias anteriores");
  }

  candidatos.sort(function(a,b){ return b.momento.getTime() - a.momento.getTime(); });
  var mejorMs = candidatos[0].momento.getTime();
  var mejores = candidatos.filter(function(x){ return x.momento.getTime() === mejorMs; });

  var cuad = {};
  mejores.forEach(function(x){
    var c = normalizarCuadrilla(x.registro.cuadrilla);
    if (c) cuad[c] = true;
  });
  var listaCuad = Object.keys(cuad);

  if (listaCuad.length !== 1) {
    return mv48725ManualWin_("El antecedente WIN mas reciente tiene mas de una cuadrilla posible",{
      fechaHoraOrigen:mv48725FechaHoraVisible_(candidatos[0].momento),
      fechaOrigenISO:mv48725FechaIso_(candidatos[0].momento),
      diasTranscurridos:candidatos[0].dias
    });
  }

  var elegido = mejores.filter(function(x){
    return normalizarCuadrilla(x.registro.cuadrilla) === listaCuad[0];
  })[0] || candidatos[0];

  var origen = normalizarCuadrilla(elegido.registro.cuadrilla);
  var ejecutora = normalizarCuadrilla(incidencia.cuadrillaEjecutora);
  if (!origen || !ejecutora) return mv48725ManualWin_("WIN no permitio determinar una cuadrilla valida");

  var propia = origen === ejecutora;
  return {
    fuente:"WIN",
    segura:true,
    propuesta:propia ? "PROPIA" : "ASIGNADA",
    decisionSugerida:propia ? "CORRESPONDE" : "REASIGNAR",
    cuadrillaOrigen:origen,
    cuadrillaEjecutora:ejecutora,
    ordenIdOrigen:elegido.registro.ordenId || "",
    codigoPedidoOrigen:elegido.registro.ordenId || "",
    fechaHoraOrigen:mv48725FechaHoraVisible_(elegido.momento),
    fechaOrigenISO:mv48725FechaIso_(elegido.momento),
    tipoTrabajoOrigen:elegido.registro.tipoTrabajo || "",
    motivoFinalizacionOrigen:elegido.registro.motivoFinalizacion || "",
    diasTranscurridos:elegido.dias,
    motivo:propia
      ? "WIN encontro el antecedente compatible del mismo DNI en la misma cuadrilla"
      : "WIN encontro el antecedente compatible del mismo DNI en otra cuadrilla",
    criterio:"DNI exacto + FINALIZADA + 1-30 dias + tipo compatible + ultimo antecedente por fecha/hora",
    partner:"NO_NECESARIO"
  };
}

function mv48725LeerGestionVtrGar_() {
  if (typeof mv477LeerGestionSoloLectura_ === "function") {
    return mv477LeerGestionSoloLectura_();
  }
  return obtenerGestionVtrGarExistente();
}

function mv48725AgregarBonoGestion_(lista) {
  if (typeof mv477AgregarEstadoBonoSoloLectura_ === "function") {
    return mv477AgregarEstadoBonoSoloLectura_(lista || []);
  }
  return agregarEstadoBonoGestionVtrGar(lista || []);
}

function mv48725CuadrillasPermitidas_(ctx) {
  var mapa = cuadrillasTecnicasBaseOperativa();
  return Object.keys(mapa).sort().map(function(c){
    var x = mapa[c] || {};
    return {
      cuadrilla:c,
      sede:x.sede || "",
      plataforma:x.plataforma || ""
    };
  }).filter(function(x){
    return registroCumpleAlcanceCentral(ctx.usuario, ctx.permiso, {
      sede:x.sede,
      cuadrilla:x.cuadrilla
    });
  });
}

var MV48725_listarGestionVtrGarBase_ = listarGestionVtrGar;
listarGestionVtrGar = function(data) {
  data = data || {};
  var ctx = mv48725AccesoGestionVtrGar_(data);
  var gestionDirecta = mv48725LeerGestionVtrGar_();
  var gestion = mv48725AgregarBonoGestion_(gestionDirecta.lista || []);

  gestion = gestion.filter(function(item){
    return mv48725RegistroAlcance_(ctx,item);
  });

  var win = mv48725LeerMapaWinUltimoEstado_();
  gestion = gestion.map(function(item){
    var salida = Object.assign({}, item);
    salida.deteccionWin = mv48725DetectarOrigenWin_(salida,win);
    salida.fuentePrincipal = "WIN";
    salida.partner = "RESPALDO_MANUAL";
    return salida;
  });

  var pendientes = gestion.filter(function(x){ return normalizarTexto(x.estadoCalificacion) === "PENDIENTE"; }).length;
  var confirmados = gestion.filter(function(x){ return normalizarTexto(x.estadoCalificacion) === "CONFIRMADO"; }).length;
  var reasignados = gestion.filter(function(x){ return normalizarTexto(x.estadoCalificacion) === "REASIGNADO"; }).length;
  var anulados = gestion.filter(function(x){ return normalizarTexto(x.estadoCalificacion) === "ANULADO"; }).length;

  return {
    ok:true,
    modulo:"GESTION_VTR_GAR",
    version:MV48725_VERSION_,
    fuentePrincipal:"WIN",
    partner:"RESPALDO_MANUAL",
    perfil:ctx.usuario.perfil,
    alcance:ctx.permiso.alcanceDatos || "",
    registros:gestion.length,
    incidencias:gestion,
    cuadrillas:mv48725CuadrillasPermitidas_(ctx),
    resumen:{
      total:gestion.length,
      pendientes:pendientes,
      confirmados:confirmados,
      reasignados:reasignados,
      anulados:anulados
    },
    win:{
      hoja:MV48725_HOJA_MAPA_WIN_,
      ordenesUnicas:win.ordenesUnicas,
      reglaEstado:"FECHA_ULTIMO_ESTADO > FECHA_OPERATIVA > FECHA_IMPORTACION_DESEMPATE"
    }
  };
};

var MV48725_calificarIncidenciaVtrGarBase_ = calificarIncidenciaVtrGar;
calificarIncidenciaVtrGar = function(data) {
  data = data || {};
  var ctx = mv48725AccesoGestionVtrGar_(data);
  var clave = String(data.clave || "").trim();
  var accion = normalizarTexto(data.decision || data.accionCalificacion);
  if (!clave) throw new Error("No se recibio la incidencia a calificar");
  if (["CORRESPONDE","REASIGNAR","ANULAR"].indexOf(accion) < 0) {
    throw new Error("Decision de calificacion no valida");
  }

  var gestion = mv48725LeerGestionVtrGar_();
  var hoja = gestion.hoja;
  if (!hoja) throw new Error("No existe BASE_VTR_GAR_DETECTADA");

  var item = null;
  var fila = 0;
  var lista = gestion.lista || [];
  for (var i = 0; i < lista.length; i++) {
    if (String(lista[i].clave || "") === clave) {
      item = lista[i];
      fila = Number(lista[i]._filaHojaV477 || 0);
      break;
    }
  }

  if (item && !fila) {
    var datos = hoja.getDataRange().getValues();
    for (var j = 1; j < datos.length; j++) {
      if (String(datos[j][0] || "") === clave) {
        fila = j + 1;
        break;
      }
    }
  }

  if (!item || !fila) throw new Error("No se encontro la incidencia VTR/GAR");
  if (!mv48725RegistroAlcance_(ctx,item)) {
    throw new Error("No tienes alcance para validar esta incidencia VTR/GAR");
  }

  var usuarios = cuadrillasTecnicasBaseOperativa();
  var estadoNuevo = "";
  var responsable = "";

  if (accion === "CORRESPONDE") {
    estadoNuevo = "CONFIRMADO";
    responsable = normalizarCuadrilla(item.cuadrillaEjecutora);
  } else if (accion === "REASIGNAR") {
    estadoNuevo = "REASIGNADO";
    responsable = normalizarCuadrilla(data.cuadrillaResponsable);
    if (!responsable) throw new Error("Seleccione la cuadrilla responsable");
  } else {
    estadoNuevo = "ANULADO";
  }

  if (responsable && !usuarios[responsable]) {
    throw new Error("La cuadrilla responsable no existe o no esta activa en USUARIOS");
  }

  if (responsable) {
    var destino = usuarios[responsable] || {};
    if (!registroCumpleAlcanceCentral(ctx.usuario,ctx.permiso,{
      sede:destino.sede || "",
      cuadrilla:responsable
    })) {
      throw new Error("Supervisor solo puede asignar responsabilidad a cuadrillas dentro de su alcance");
    }
  }

  var ahora = new Date();
  var observacion = String(data.observacion || "").trim();
  if (accion === "REASIGNAR" && !observacion) {
    throw new Error("Ingrese el sustento de la reasignacion");
  }
  if (accion === "ANULAR" && !observacion) {
    throw new Error("Ingrese el motivo de anulacion");
  }

  var sedeResponsable = responsable && usuarios[responsable] ? usuarios[responsable].sede : "";
  hoja.getRange(fila,12,1,7).setValues([[
    estadoNuevo,
    responsable,
    sedeResponsable,
    ctx.usuario.usuario,
    ahora,
    observacion,
    ahora
  ]]);
  hoja.getRange(fila,16).setNumberFormat("dd/mm/yyyy hh:mm");
  hoja.getRange(fila,18).setNumberFormat("dd/mm/yyyy hh:mm");
  SpreadsheetApp.flush();

  registrarHistorialGestionVtrGar(
    clave,
    ctx.usuario.usuario,
    accion,
    item.estadoCalificacion,
    estadoNuevo,
    item.cuadrillaResponsable,
    responsable,
    observacion
  );

  var recalculo = recalcularVtrGarDesdeBaseOperativa(
    ctx.usuario.usuario,
    item.fechaISO || item.fecha
  );

  try { invalidarResumenDashboardRankingV361_(); } catch (e) {}
  try { invalidarCacheBonosSupervisores_(); } catch (e) {}

  return {
    ok:true,
    modulo:"GESTION_VTR_GAR",
    version:MV48725_VERSION_,
    accion:accion,
    clave:clave,
    estado:estadoNuevo,
    cuadrillaResponsable:responsable,
    fuentePrincipal:"WIN",
    recalculo:recalculo
  };
};

var MV48725_validarValidacionTecnicaBase_ = validarValidacionTecnica;
validarValidacionTecnica = function(data) {
  data = data || {};
  var id = String(data.id || "").trim();
  if (!id) return MV48725_validarValidacionTecnicaBase_(data);

  var encontrado;
  try {
    encontrado = buscarFilaValidacionTecnica(id);
  } catch (e) {
    return MV48725_validarValidacionTecnicaBase_(data);
  }

  var datos = encontrado.datos;
  var tipo = normalizarTexto(datos[6]);
  if (tipo !== "GAR" && tipo !== "VTR") {
    return MV48725_validarValidacionTecnicaBase_(data);
  }

  var motivo = String(data.motivoValidacion || data.motivo || "").trim();
  if (!motivo) throw new Error("Debe ingresar el motivo de validacion");

  var usuario = obtenerUsuarioApp(data.usuario);
  if (!mv48725EsPerfilGestionVtrGar_(usuario.perfil)) {
    throw new Error("Solo Supervisor o Jefatura pueden validar Bono/No Bono de GAR/VTR");
  }
  var permiso = exigirPermisoModuloCentral(usuario,"VALIDACION TECNICA","VALIDAR");

  var sedeCaso = normalizarTexto(datos[3]);
  if (!registroCumpleAlcanceCentral(usuario,permiso,{
    sede:sedeCaso,
    cuadrilla:normalizarCuadrilla(datos[5])
  })) {
    throw new Error("No tienes alcance para validar este registro GAR/VTR");
  }

  var estadoActual = normalizarTexto(datos[13]);
  if (estadoActual !== "PENDIENTE") {
    throw new Error("Este registro GAR/VTR ya no esta pendiente");
  }

  var resultado = normalizarTexto(data.resultado);
  if (resultado !== "BONO" && resultado !== "NO BONO") {
    throw new Error("Resultado no valido para GAR/VTR");
  }

  var ahora = new Date();
  var hoja = encontrado.hoja;
  var fila = encontrado.fila;

  hoja.getRange(fila,14).setValue(resultado);
  hoja.getRange(fila,15).setValue(resultado);
  hoja.getRange(fila,16).setValue(usuario.usuario);
  hoja.getRange(fila,17).setValue(usuario.perfil);
  hoja.getRange(fila,18).setValue(ahora);
  hoja.getRange(fila,19).setValue(ahora);
  hoja.getRange(fila,20).setValue(motivo);
  hoja.getRange(fila,18).setNumberFormat("dd/mm/yyyy");
  hoja.getRange(fila,19).setNumberFormat("hh:mm:ss");
  SpreadsheetApp.flush();

  return {
    ok:true,
    modulo:"VALIDACION_TECNICA",
    accion:"VALIDAR",
    version:MV48725_VERSION_,
    id:id,
    tipo:tipo,
    resultado:resultado,
    validadoPor:usuario.usuario,
    perfilValidador:usuario.perfil,
    alcance:permiso.alcanceDatos || ""
  };
};

function DIAGNOSTICO_V48725_VTRGAR_WIN() {
  var win = mv48725LeerMapaWinUltimoEstado_();
  var gestion = mv48725LeerGestionVtrGar_();
  var lista = gestion.lista || [];
  var pendientes = lista.filter(function(x){
    return normalizarTexto(x.estadoCalificacion) === "PENDIENTE";
  });

  var ejemplos = pendientes.slice(0,25).map(function(x){
    return {
      clave:x.clave,
      tipo:x.tipo,
      ticket:x.ticket,
      dni:x.numeroDocumento,
      ejecutora:x.cuadrillaEjecutora,
      deteccionWin:mv48725DetectarOrigenWin_(x,win)
    };
  });

  return {
    ok:true,
    version:MV48725_VERSION_,
    modo:"SOLO_LECTURA",
    hojaWin:MV48725_HOJA_MAPA_WIN_,
    ordenesWinUnicas:win.ordenesUnicas,
    incidenciasTotal:lista.length,
    pendientes:pendientes.length,
    ejemplos:ejemplos,
    reglas:{
      winPrincipal:true,
      partnerSoloRespaldoManual:true,
      propuestaNoEscritura:true,
      recableadosSinCambios:true,
      indicadorSoloConfirmadoReasignado:true
    }
  };
}
