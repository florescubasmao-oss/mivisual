/* ================================================================
   MI VISUAL V487.11 - PUBLICADOR PROTEGIDO DE INDICADORES WIN

   OBJETIVO
   - Preparar la sustitucion controlada de las fuentes actuales por WIN.
   - Mantener JULIO 2026 y periodos anteriores completamente congelados.
   - Permitir migracion de AGOSTO 2026 en adelante sin borrar historial.
   - Conservar las validaciones ya realizadas de VTR/GAR.

   SEGURIDAD
   - ESTE ARCHIVO NO PUBLICA NADA EN SU ESTADO ACTUAL.
   - MV487_PUBLICADOR_ESCRITURA_COMPILADA_ = false es un bloqueo duro.
   - La futura escritura requiere ademas confirmacion explicita y periodo >= 2026-08.
   - Nunca elimina ni reescribe JULIO 2026 o meses anteriores.
================================================================ */

const MV487_PUBLICADOR_VERSION_ = "V487.11";
const MV487_PUBLICADOR_PERIODO_MINIMO_ = "2026-08";
const MV487_PUBLICADOR_ESCRITURA_COMPILADA_ = false;
const MV487_PUBLICADOR_CONFIRMACION_ = "PUBLICAR_V487_CONFIRMADO";

function mv487pTexto_(valor) {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

function mv487pNorm_(valor) {
  return mv487pTexto_(valor)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mv487pId_(valor) {
  return mv487pTexto_(valor).replace(/\.0+$/, "");
}

function mv487pPeriodoIso_(valor) {
  const t = mv487pTexto_(valor);
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(t)) return t;
  const f = mv487pFecha_(valor);
  if (!f) return "";
  return Utilities.formatDate(f, "America/Lima", "yyyy-MM");
}

function mv487pFecha_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  const t = mv487pTexto_(valor);
  if (!t) return null;
  let m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0), +(m[6]||0));
  m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0));
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

function mv487pClaveCabecera_(valor) {
  return mv487pNorm_(valor).replace(/[^A-Z0-9]/g, "");
}

function mv487pValidarPeriodo_(periodo) {
  const p = mv487pPeriodoIso_(periodo);
  if (!p) throw new Error("V487: periodo no valido. Use YYYY-MM.");
  if (p < MV487_PUBLICADOR_PERIODO_MINIMO_) {
    throw new Error("V487: JULIO 2026 y periodos anteriores estan congelados y no pueden modificarse.");
  }
  return p;
}

function mv487pValidarUsuario_(usuario) {
  if (typeof validarAdministracionBaseOperativa === "function") {
    return validarAdministracionBaseOperativa(usuario);
  }
  if (typeof mv487ValidarLectura_ === "function") {
    return mv487ValidarLectura_(usuario);
  }
  throw new Error("V487: no se encontro el validador de administracion.");
}

function mv487pNombreMes_(periodo) {
  const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SETIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  const m = mv487pPeriodoIso_(periodo).match(/^(\d{4})-(\d{2})$/);
  return m ? meses[Number(m[2])-1] : "";
}

function mv487pLeerMapaCanonico_(periodo) {
  const p = mv487pValidarPeriodo_(periodo);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("MAPA_ORDENES");
  if (!hoja || hoja.getLastRow() <= 1) {
    throw new Error("V487: MAPA_ORDENES no contiene informacion.");
  }

  const datos = hoja.getDataRange().getValues();
  const cab = {};
  (datos[0] || []).forEach(function(h, i){ cab[mv487pClaveCabecera_(h)] = i; });

  function valor(fila, nombres) {
    for (let i=0; i<nombres.length; i++) {
      const idx = cab[mv487pClaveCabecera_(nombres[i])];
      if (idx !== undefined && fila[idx] !== "" && fila[idx] !== null && fila[idx] !== undefined) return fila[idx];
    }
    return "";
  }

  const porOrden = {};
  let filasPeriodo = 0;
  let duplicados = 0;

  for (let i=1; i<datos.length; i++) {
    const fila = datos[i];
    const ordenId = mv487pId_(valor(fila,["ORDEN_ID","OrdenId"]));
    if (!ordenId) continue;

    const fechaSolicitud = mv487pFecha_(valor(fila,["FECHA_SOLICITUD","F.Soli"]));
    const fechaUltimo = mv487pFecha_(valor(fila,["FECHA_ULTIMO_ESTADO","FechaUltiEsta"])) || fechaSolicitud;
    const fechaImportacion = mv487pFecha_(valor(fila,["FECHA_IMPORTACION"]));
    const fechaPeriodo = fechaSolicitud || fechaUltimo;
    if (!fechaPeriodo || mv487pPeriodoIso_(fechaPeriodo) !== p) continue;
    filasPeriodo++;

    const item = {
      ordenId: ordenId,
      fechaSolicitud: fechaSolicitud,
      fechaUltimoEstado: fechaUltimo,
      fechaImportacion: fechaImportacion,
      fechaEstadoMs: fechaUltimo ? fechaUltimo.getTime() : 0,
      fechaImportacionMs: fechaImportacion ? fechaImportacion.getTime() : 0,
      tipoTrabajo: mv487pNorm_(valor(fila,["TIPO_TRABAJO","TipoTraba"])),
      tipo: mv487pNorm_(valor(fila,["TIPO","Tipo"])),
      cuadrilla: mv487pTexto_(valor(fila,["CUADRILLA","Cuadrilla"])),
      estado: mv487pNorm_(valor(fila,["ESTADO","Estado"])),
      motivoCancelacion: mv487pNorm_(valor(fila,["MOTIVO_CANCELACION","Motivo Cancelacion","Motivo Cancelación"])),
      motivoFinalizacion: mv487pNorm_(valor(fila,["MOTIVO_FINALIZACION","Motivo Finalizacion","Motivo Finalización"])),
      motivoAnulacion: mv487pNorm_(valor(fila,["MOTIVO_ANULACION","Motivo Anulacion","Motivo Anulación"])),
      detalle: mv487pNorm_(valor(fila,["DETALLE","MOTIVO_REGESTION","Motivo Regestión"])),
      codigoPedido: mv487pId_(valor(fila,["CODIGO_CLIENTE","CODIGO_PEDIDO","CodiSeguiClien"])),
      numeroDocumento: mv487pId_(valor(fila,["NUMERO_DOCUMENTO","Número Documento"])),
      cliente: mv487pTexto_(valor(fila,["CLIENTE","Cliente"])),
      region: mv487pNorm_(valor(fila,["REGION","Region"])),
      codigoSeguimiento: mv487pTexto_(valor(fila,["CODIGO_SEGUIMIENTO","CodiSegui"]))
    };

    const previo = porOrden[ordenId];
    if (!previo) {
      porOrden[ordenId] = item;
    } else {
      duplicados++;
      if (
        item.fechaEstadoMs > previo.fechaEstadoMs ||
        (item.fechaEstadoMs === previo.fechaEstadoMs && item.fechaImportacionMs >= previo.fechaImportacionMs)
      ) porOrden[ordenId] = item;
    }
  }

  const ordenes = Object.keys(porOrden).map(function(k){ return porOrden[k]; });
  let corte = null;
  ordenes.forEach(function(o){
    const f = o.fechaUltimoEstado || o.fechaSolicitud;
    if (f && (!corte || f.getTime() > corte.getTime())) corte = f;
  });

  return { periodo:p, ordenes:ordenes, filasPeriodo:filasPeriodo, duplicados:duplicados, corte:corte };
}

function mv487pGrupoEfectividad_(o) {
  const e = mv487pNorm_(o.estado);
  const motivo = [o.motivoCancelacion,o.motivoAnulacion,o.detalle].join(" ");

  if ((e === "CANCELADA" || e === "CANCELADO") && /RESERVA|RESERVAD/.test(motivo)) return "";
  if (e === "FINALIZADA" || e === "FINALIZADO") return "FINALIZADA";
  if (e.indexOf("REGEST") === 0) return "REGESTION";
  if (e === "ANULADA" || e === "ANULADO") return "CANCELADA";
  if (e === "REPROGRAMADA" || e === "REPROGRAMADO") return "REPROGRAMADA";
  if (e === "CANCELADA" || e === "CANCELADO") {
    return /REPROGRAM|POSTERGA/.test(motivo) ? "REPROGRAMADA" : "CANCELADA";
  }
  return "";
}

function mv487pCalcularEfRec_(base) {
  const mapa = {};
  const control = {
    ordenesUnicas: base.ordenes.length,
    abiertasExcluidas:0,
    finalizadas:0,
    canceladas:0,
    regestiones:0,
    reprogramadas:0,
    totalEfectividad:0,
    losRojoFinalizadas:0,
    recableadosLosRojo:0,
    recableadosFueraPoblacion:0
  };

  function fila(cuadrilla) {
    const k = typeof normalizarCuadrilla === "function" ? normalizarCuadrilla(cuadrilla) : mv487pTexto_(cuadrilla);
    if (!mapa[k]) mapa[k] = {cuadrilla:k,finalizadas:0,canceladas:0,regestiones:0,reprogramadas:0,total:0,losRojo:0,recableados:0};
    return mapa[k];
  }

  base.ordenes.forEach(function(o){
    const f = fila(o.cuadrilla);

    if ((o.estado === "FINALIZADA" || o.estado === "FINALIZADO") && o.tipoTrabajo.indexOf("LOS ROJO") >= 0) {
      f.losRojo++;
      control.losRojoFinalizadas++;
      if (o.motivoFinalizacion.indexOf("RECABLEADO") >= 0) {
        f.recableados++;
        control.recableadosLosRojo++;
      }
    } else if ((o.estado === "FINALIZADA" || o.estado === "FINALIZADO") && o.motivoFinalizacion.indexOf("RECABLEADO") >= 0) {
      control.recableadosFueraPoblacion++;
    }

    const g = mv487pGrupoEfectividad_(o);
    if (!g) {
      control.abiertasExcluidas++;
      return;
    }

    f.total++;
    control.totalEfectividad++;
    if (g === "FINALIZADA") { f.finalizadas++; control.finalizadas++; }
    else if (g === "CANCELADA") { f.canceladas++; control.canceladas++; }
    else if (g === "REGESTION") { f.regestiones++; control.regestiones++; }
    else if (g === "REPROGRAMADA") { f.reprogramadas++; control.reprogramadas++; }
  });

  control.efectividad = control.totalEfectividad ? control.finalizadas / control.totalEfectividad : 0;
  control.porcentajeRecableado = control.losRojoFinalizadas ? control.recableadosLosRojo / control.losRojoFinalizadas : 0;

  return { mapa:mapa, control:control };
}

function mv487pGestionVtrGarPeriodo_(periodo) {
  const p = mv487pValidarPeriodo_(periodo);
  const info = typeof obtenerGestionVtrGarExistente === "function"
    ? obtenerGestionVtrGarExistente()
    : {lista:[]};

  const lista = (info.lista || []).filter(function(x){
    const f = mv487pFecha_(x.fechaIncidencia || x.fechaISO || x.fecha);
    if (f) return mv487pPeriodoIso_(f) === p;
    return mv487pNorm_(x.periodo) === mv487pNombreMes_(p);
  });

  const estados = {PENDIENTE:0,CONFIRMADO:0,REASIGNADO:0,ANULADO:0,OTROS:0};
  const ordenesGestionadas = {};
  lista.forEach(function(x){
    const e = mv487pNorm_(x.estadoCalificacion);
    if (Object.prototype.hasOwnProperty.call(estados,e)) estados[e]++; else estados.OTROS++;
    const id = mv487pId_(x.codigoLiquidacion || x.ordenId);
    if (id) ordenesGestionadas[id] = true;
  });

  return {lista:lista,estados:estados,ordenesGestionadas:ordenesGestionadas};
}

function mv487pNuevosVtrGarWin_(base, gestion) {
  return base.ordenes.filter(function(o){
    const esVtrGar = (o.tipoTrabajo === "REITERADA" || o.tipoTrabajo === "GARANTIA");
    if (!esVtrGar) return false;
    return !gestion.ordenesGestionadas[o.ordenId];
  }).map(function(o){
    return {
      clave:"WIN|" + o.ordenId,
      ordenId:o.ordenId,
      fecha:o.fechaUltimoEstado || o.fechaSolicitud,
      tipo:o.tipoTrabajo === "GARANTIA" ? "GAR" : "VTR",
      codigoPedido:o.codigoPedido,
      dni:o.numeroDocumento,
      cliente:o.cliente,
      cuadrillaEjecutora:o.cuadrilla,
      sedeEjecutora:o.region,
      estadoCalificacion:"PENDIENTE",
      origen:"WIN"
    };
  });
}

function mv487pResumenVtrGar_(base, efrec) {
  const gestion = mv487pGestionVtrGarPeriodo_(base.periodo);
  const nuevos = mv487pNuevosVtrGarWin_(base, gestion);
  const porCuadrilla = {};

  gestion.lista.forEach(function(x){
    const e = mv487pNorm_(x.estadoCalificacion);
    if (e !== "CONFIRMADO" && e !== "REASIGNADO") return;
    const cuadrilla = typeof normalizarCuadrilla === "function"
      ? normalizarCuadrilla(x.cuadrillaResponsable || x.cuadrillaEjecutora)
      : mv487pTexto_(x.cuadrillaResponsable || x.cuadrillaEjecutora);
    if (!cuadrilla) return;
    if (!porCuadrilla[cuadrilla]) porCuadrilla[cuadrilla] = {gar:0,vtr:0};
    if (mv487pNorm_(x.tipo) === "GAR") porCuadrilla[cuadrilla].gar++;
    if (mv487pNorm_(x.tipo) === "VTR") porCuadrilla[cuadrilla].vtr++;
  });

  return {
    gestion:gestion,
    nuevosPendientes:nuevos,
    porCuadrilla:porCuadrilla,
    regla:"Conservar validaciones existentes; WIN solo agrega incidencias nuevas como PENDIENTE. Solo CONFIRMADO/REASIGNADO afecta indicador."
  };
}

function mv487pCuadrillas_(efrec, vtrgar) {
  const mapa = {};
  Object.keys(efrec.mapa || {}).forEach(function(c){ mapa[c] = true; });
  Object.keys(vtrgar.porCuadrilla || {}).forEach(function(c){ mapa[c] = true; });
  try {
    const usuarios = cuadrillasTecnicasBaseOperativa();
    Object.keys(usuarios || {}).forEach(function(c){ mapa[c] = true; });
  } catch (_) {}
  return Object.keys(mapa).filter(Boolean).sort(function(a,b){ return a.localeCompare(b,"es"); });
}

function mv487pConstruirMatrices_(base, efrec, vtrgar, usuarioCarga) {
  const corte = base.corte || new Date();
  const p = base.periodo;
  const cuadrillas = mv487pCuadrillas_(efrec, vtrgar);

  const efectividad = [["ID","Usuario","Cuadrilla","ACTUALIZACION","Finalizada","Cancelada","Regestión","Reprogramado","Total General","Efectividad"]];
  const recableado = [["ID","Usuario","Cuadrilla","ACTUALIZACION","los rojo asignadas","Recableados","PORCENTAJE"]];
  const vtr = [["ID","Usuario","Cuadrilla","ACTUALIZACION","Total Ordenes FINALIZADAS","GAR","VTR","TOTAL GAR/VTR","% VTR/GAR"]];

  cuadrillas.forEach(function(c, i){
    const e = efrec.mapa[c] || {finalizadas:0,canceladas:0,regestiones:0,reprogramadas:0,total:0,losRojo:0,recableados:0};
    const vg = vtrgar.porCuadrilla[c] || {gar:0,vtr:0};
    const totalVg = Number(vg.gar||0) + Number(vg.vtr||0);
    efectividad.push([c+"|"+p+"|"+(i+1),usuarioCarga||"ADMIN",c,corte,e.finalizadas,e.canceladas,e.regestiones,e.reprogramadas,e.total,e.total?e.finalizadas/e.total:0]);
    recableado.push([c+"|"+p+"|"+(i+1),usuarioCarga||"ADMIN",c,corte,e.losRojo,e.recableados,e.losRojo?e.recableados/e.losRojo:0]);
    vtr.push([c+"|"+p+"|"+(i+1),usuarioCarga||"ADMIN",c,corte,e.finalizadas,vg.gar||0,vg.vtr||0,totalVg,e.finalizadas?totalVg/e.finalizadas:0]);
  });

  return {efectividad:efectividad,recableado:recableado,vtrgar:vtr,corte:corte,periodo:p};
}

function previsualizarPublicacionIndicadoresWinV487(data) {
  data = data || {};
  mv487pValidarUsuario_(data.usuario);
  const periodo = mv487pValidarPeriodo_(data.periodo || MV487_PUBLICADOR_PERIODO_MINIMO_);
  const base = mv487pLeerMapaCanonico_(periodo);
  const efrec = mv487pCalcularEfRec_(base);
  const vtrgar = mv487pResumenVtrGar_(base, efrec);
  const matrices = mv487pConstruirMatrices_(base, efrec, vtrgar, data.usuario || "ADMIN");

  let produccion = null;
  try {
    produccion = typeof previsualizarProduccionWinParalelaV487 === "function"
      ? previsualizarProduccionWinParalelaV487({usuario:data.usuario,periodo:periodo})
      : null;
  } catch (errorProduccion) {
    produccion = {ok:false,error:errorProduccion.message || String(errorProduccion)};
  }

  return {
    ok:true,
    version:MV487_PUBLICADOR_VERSION_,
    periodo:periodo,
    soloPrevisualizacion:true,
    escrituraCompilada:MV487_PUBLICADOR_ESCRITURA_COMPILADA_,
    historico:{julio2026Congelado:true,periodosAnterioresCongelados:true,periodoMinimo:MV487_PUBLICADOR_PERIODO_MINIMO_},
    fuente:"WIN / MAPA_ORDENES + gestion VTR/GAR existente",
    produccion:produccion,
    efectividad:efrec.control,
    recableado:{losRojoFinalizadas:efrec.control.losRojoFinalizadas,recableados:efrec.control.recableadosLosRojo,porcentaje:efrec.control.porcentajeRecableado,recableadosFueraPoblacion:efrec.control.recableadosFueraPoblacion},
    vtrGar:{estadosExistentes:vtrgar.gestion.estados,nuevosPendientesWin:vtrgar.nuevosPendientes.length,reglaMigracion:vtrgar.regla},
    filasPreparadas:{efectividad:matrices.efectividad.length-1,recableado:matrices.recableado.length-1,vtrgar:matrices.vtrgar.length-1},
    controles:{
      escribeProduccion:false,
      escribeEfectividad:false,
      escribeRecableado:false,
      escribeVtrGar:false,
      escribeRanking:false,
      modificaJulio:false,
      conservaValidacionesVtrGar:true
    }
  };
}

function publicarIndicadoresWinV487(data) {
  data = data || {};
  mv487pValidarUsuario_(data.usuario);
  const periodo = mv487pValidarPeriodo_(data.periodo);

  if (!MV487_PUBLICADOR_ESCRITURA_COMPILADA_) {
    throw new Error("V487.11: publicacion BLOQUEADA por seguridad. Solo esta habilitada la previsualizacion.");
  }
  if (mv487pTexto_(data.confirmacion) !== MV487_PUBLICADOR_CONFIRMACION_) {
    throw new Error("V487: falta confirmacion explicita para publicar.");
  }

  // La implementacion de escritura se activara solo despues de cerrar la
  // comparacion real. Este punto existe deliberadamente como segundo seguro.
  throw new Error("V487: escritura aun no activada. Periodo validado: " + periodo);
}

function estadoPublicadorIndicadoresWinV487() {
  return {
    ok:true,
    version:MV487_PUBLICADOR_VERSION_,
    escrituraCompilada:MV487_PUBLICADOR_ESCRITURA_COMPILADA_,
    periodoMinimo:MV487_PUBLICADOR_PERIODO_MINIMO_,
    julio2026Congelado:true,
    estrategiaVtrGar:"MIGRAR DESDE AGOSTO; conservar validaciones existentes y agregar solo incidencias WIN nuevas como PENDIENTE"
  };
}
