/* ================================================================
   MI VISUAL V487.12 - PUBLICADOR WIN ACTIVO DESDE AGOSTO 2026

   REGLAS DE SEGURIDAD
   - JULIO 2026 y periodos anteriores quedan congelados.
   - OrdenId es la llave unica y manda el ultimo estado por fecha/hora.
   - Partner es auxiliar: no reemplaza WIN, salvo control puntual de RESERVA.
   - VTR/GAR nunca aporta Produccion.
   - VTR/GAR ya gestionado se conserva; WIN solo agrega casos nuevos PENDIENTE.
   - Cada publicacion reconstruye SOLO el periodo solicitado.
   - Si algo falla, se restauran las hojas mediante snapshots.
================================================================ */

const MV487_PUBLICADOR_VERSION_ = "V487.12";
const MV487_PUBLICADOR_PERIODO_MINIMO_ = "2026-08";
const MV487_PUBLICADOR_ESCRITURA_COMPILADA_ = true;
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

function mv487pPeriodoIso_(valor) {
  const t = mv487pTexto_(valor);
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(t)) return t;
  const f = mv487pFecha_(valor);
  return f ? Utilities.formatDate(f, "America/Lima", "yyyy-MM") : "";
}

function mv487pFechaIso_(valor) {
  const f = mv487pFecha_(valor);
  return f ? Utilities.formatDate(f, "America/Lima", "yyyy-MM-dd") : "";
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
  if (typeof mv487ValidarLectura_ === "function") return mv487ValidarLectura_(usuario);
  throw new Error("V487: no se encontro el validador de administracion.");
}

function mv487pNombreMes_(periodo) {
  const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SETIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  const m = mv487pPeriodoIso_(periodo).match(/^(\d{4})-(\d{2})$/);
  return m ? meses[Number(m[2])-1] : "";
}

function mv487pIdentidadCuadrilla_(nombre) {
  return mv487pNorm_(nombre).replace(/^P\s*\d+\s+/, "").trim();
}

function mv487pMapaHomologacion_() {
  const exactos = {};
  const porIdentidad = {};
  try {
    const usuarios = cuadrillasTecnicasBaseOperativa();
    Object.keys(usuarios || {}).forEach(function(c) {
      const cuad = normalizarCuadrilla(c);
      exactos[mv487pNorm_(cuad)] = cuad;
      const identidad = mv487pIdentidadCuadrilla_(cuad);
      if (!identidad) return;
      if (!porIdentidad[identidad]) porIdentidad[identidad] = [];
      if (porIdentidad[identidad].indexOf(cuad) < 0) porIdentidad[identidad].push(cuad);
    });
  } catch (_) {}
  return {exactos:exactos,porIdentidad:porIdentidad};
}

function mv487pResolverCuadrilla_(nombre, homologacion) {
  const original = typeof normalizarCuadrilla === "function" ? normalizarCuadrilla(nombre) : mv487pTexto_(nombre);
  const exacta = homologacion.exactos[mv487pNorm_(original)];
  if (exacta) return {original:original,cuadrilla:exacta,tipo:"SIN_CAMBIO"};
  const identidad = mv487pIdentidadCuadrilla_(original);
  const candidatos = homologacion.porIdentidad[identidad] || [];
  if (identidad && candidatos.length === 1) {
    return {
      original:original,
      cuadrilla:candidatos[0],
      tipo:"CAMBIO_NUMERO_NOMBRE",
      observacion:"Homologacion automatica por misma identidad: " + original + " -> " + candidatos[0]
    };
  }
  return {original:original,cuadrilla:original,tipo:"HISTORICA_SIN_HOMOLOGAR"};
}

function mv487pReservasPartner_(periodo) {
  const p = mv487pValidarPeriodo_(periodo);
  const reservas = {};
  try {
    const base = leerBaseOperativaHistorica();
    (base.registros || []).forEach(function(r) {
      if (mv487pPeriodoIso_(r.fecha) !== p) return;
      const estado = mv487pNorm_(r.estado);
      if (estado !== "RESERVA" && estado !== "RESERVADO") return;
      const id = mv487pId_(r.codigoLiquidacion);
      if (id) reservas[id] = true;
    });
  } catch (_) {}
  return reservas;
}

function mv487pLeerMapaCanonico_(periodo) {
  const p = mv487pValidarPeriodo_(periodo);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("MAPA_ORDENES");
  if (!hoja || hoja.getLastRow() <= 1) throw new Error("V487: MAPA_ORDENES no contiene informacion.");

  const datos = hoja.getDataRange().getValues();
  const cab = {};
  (datos[0] || []).forEach(function(h, i){ cab[mv487pClaveCabecera_(h)] = i; });
  const homologacion = mv487pMapaHomologacion_();

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
  const homologaciones = {};

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

    const cuad = mv487pResolverCuadrilla_(valor(fila,["CUADRILLA","Cuadrilla"]), homologacion);
    if (cuad.tipo === "CAMBIO_NUMERO_NOMBRE") homologaciones[cuad.original + "|" + cuad.cuadrilla] = cuad.observacion;

    const item = {
      ordenId:ordenId,
      fechaSolicitud:fechaSolicitud,
      fechaUltimoEstado:fechaUltimo,
      fechaImportacion:fechaImportacion,
      fechaEstadoMs:fechaUltimo ? fechaUltimo.getTime() : 0,
      fechaImportacionMs:fechaImportacion ? fechaImportacion.getTime() : 0,
      tipoTrabajo:mv487pNorm_(valor(fila,["TIPO_TRABAJO","TipoTraba"])),
      tipo:mv487pNorm_(valor(fila,["TIPO","Tipo"])),
      cuadrillaOriginal:cuad.original,
      cuadrilla:cuad.cuadrilla,
      homologacion:cuad.tipo,
      estado:mv487pNorm_(valor(fila,["ESTADO","Estado"])),
      motivoCancelacion:mv487pNorm_(valor(fila,["MOTIVO_CANCELACION","Motivo Cancelacion","Motivo Cancelación"])),
      motivoFinalizacion:mv487pNorm_(valor(fila,["MOTIVO_FINALIZACION","Motivo Finalizacion","Motivo Finalización"])),
      motivoAnulacion:mv487pNorm_(valor(fila,["MOTIVO_ANULACION","Motivo Anulacion","Motivo Anulación"])),
      detalle:mv487pNorm_(valor(fila,["DETALLE","MOTIVO_REGESTION","Motivo Regestión"])),
      codigoPedido:mv487pId_(valor(fila,["CODIGO_CLIENTE","CODIGO_PEDIDO","CodiSeguiClien"])),
      numeroDocumento:mv487pId_(valor(fila,["NUMERO_DOCUMENTO","Número Documento"])),
      cliente:mv487pTexto_(valor(fila,["CLIENTE","Cliente"])),
      region:mv487pNorm_(valor(fila,["REGION","Region"])),
      codigoSeguimiento:mv487pTexto_(valor(fila,["CODIGO_SEGUIMIENTO","CodiSegui"]))
    };

    const previo = porOrden[ordenId];
    if (!previo) porOrden[ordenId] = item;
    else {
      duplicados++;
      if (item.fechaEstadoMs > previo.fechaEstadoMs || (item.fechaEstadoMs === previo.fechaEstadoMs && item.fechaImportacionMs >= previo.fechaImportacionMs)) {
        porOrden[ordenId] = item;
      }
    }
  }

  const ordenes = Object.keys(porOrden).map(function(k){ return porOrden[k]; });
  let corte = null;
  ordenes.forEach(function(o){
    const f = o.fechaUltimoEstado || o.fechaSolicitud;
    if (f && (!corte || f.getTime() > corte.getTime())) corte = f;
  });

  return {
    periodo:p,
    ordenes:ordenes,
    filasPeriodo:filasPeriodo,
    duplicados:duplicados,
    corte:corte,
    homologaciones:Object.keys(homologaciones).map(function(k){return homologaciones[k];})
  };
}

function mv487pGrupoEfectividad_(o, reservasPartner) {
  const e = mv487pNorm_(o.estado);
  const motivo = [o.motivoCancelacion,o.motivoAnulacion,o.detalle].join(" ");

  if (e === "RESERVA" || e === "RESERVADO") return "";
  if ((e === "CANCELADA" || e === "CANCELADO") && reservasPartner[o.ordenId]) return "";
  if (e === "FINALIZADA" || e === "FINALIZADO") return "FINALIZADA";
  if (e.indexOf("REGEST") === 0) return "REGESTION";
  if (e === "ANULADA" || e === "ANULADO") return "CANCELADA";
  if (e === "REPROGRAMADA" || e === "REPROGRAMADO") return "REPROGRAMADA";
  if (e === "CANCELADA" || e === "CANCELADO") return /REPROGRAM|POSTERGA/.test(motivo) ? "REPROGRAMADA" : "CANCELADA";
  return "";
}

function mv487pCalcularEfRec_(base) {
  const mapa = {};
  const reservasPartner = mv487pReservasPartner_(base.periodo);
  const control = {
    ordenesUnicas:base.ordenes.length,
    abiertasExcluidas:0,
    reservasPendientes:Object.keys(reservasPartner).length,
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

    const g = mv487pGrupoEfectividad_(o, reservasPartner);
    if (!g) { control.abiertasExcluidas++; return; }
    f.total++;
    control.totalEfectividad++;
    if (g === "FINALIZADA") { f.finalizadas++; control.finalizadas++; }
    else if (g === "CANCELADA") { f.canceladas++; control.canceladas++; }
    else if (g === "REGESTION") { f.regestiones++; control.regestiones++; }
    else if (g === "REPROGRAMADA") { f.reprogramadas++; control.reprogramadas++; }
  });

  control.efectividad = control.totalEfectividad ? control.finalizadas / control.totalEfectividad : 0;
  control.porcentajeRecableado = control.losRojoFinalizadas ? control.recableadosLosRojo / control.losRojoFinalizadas : 0;
  return {mapa:mapa,control:control,reservasPartner:reservasPartner};
}

function mv487pTipoVtrGarOrden_(o) {
  const tipo = mv487pNorm_(o && o.tipoTrabajo);
  const ticket = mv487pNorm_(o && o.codigoSeguimiento).replace(/\s+/g, "");
  if (tipo === "REITERADA") return "VTR";
  if (tipo === "GARANTIA") return "GAR";
  if (ticket.indexOf("VTR-") === 0) return "VTR";
  if (ticket.indexOf("GAR-") === 0) return "GAR";
  return "";
}

function mv487pGestionVtrGarPeriodo_(periodo) {
  const p = mv487pValidarPeriodo_(periodo);
  const info = typeof obtenerGestionVtrGarExistente === "function" ? obtenerGestionVtrGarExistente() : {lista:[]};
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
  return {lista:lista,estados:estados,ordenesGestionadas:ordenesGestionadas,hoja:info.hoja || null};
}

function mv487pNuevosVtrGarWin_(base, gestion) {
  return base.ordenes.filter(function(o){
    return !!mv487pTipoVtrGarOrden_(o) && !gestion.ordenesGestionadas[o.ordenId];
  }).map(function(o){
    return {
      clave:"WIN|" + o.ordenId,
      ordenId:o.ordenId,
      fecha:o.fechaSolicitud || o.fechaUltimoEstado,
      tipo:mv487pTipoVtrGarOrden_(o),
      ticket:o.codigoSeguimiento,
      codigoPedido:o.codigoPedido,
      dni:o.numeroDocumento,
      cliente:o.cliente,
      tipoPartida:o.motivoFinalizacion || o.tipoTrabajo,
      cuadrillaEjecutora:o.cuadrilla,
      cuadrillaEjecutoraOriginal:o.cuadrillaOriginal,
      sedeEjecutora:o.region,
      estadoCalificacion:"PENDIENTE",
      origen:"WIN"
    };
  });
}

function mv487pResumenVtrGar_(base) {
  const gestion = mv487pGestionVtrGarPeriodo_(base.periodo);
  const nuevos = mv487pNuevosVtrGarWin_(base, gestion);
  const porCuadrilla = {};
  gestion.lista.forEach(function(x){
    const e = mv487pNorm_(x.estadoCalificacion);
    if (e !== "CONFIRMADO" && e !== "REASIGNADO") return;
    const cuadrilla = typeof normalizarCuadrilla === "function" ? normalizarCuadrilla(x.cuadrillaResponsable || x.cuadrillaEjecutora) : mv487pTexto_(x.cuadrillaResponsable || x.cuadrillaEjecutora);
    if (!cuadrilla) return;
    if (!porCuadrilla[cuadrilla]) porCuadrilla[cuadrilla] = {gar:0,vtr:0};
    if (mv487pNorm_(x.tipo) === "GAR") porCuadrilla[cuadrilla].gar++;
    if (mv487pNorm_(x.tipo) === "VTR") porCuadrilla[cuadrilla].vtr++;
  });
  return {
    gestion:gestion,
    nuevosPendientes:nuevos,
    porCuadrilla:porCuadrilla,
    regla:"Conservar validaciones existentes; WIN agrega solo incidencias nuevas como PENDIENTE. Solo CONFIRMADO/REASIGNADO afecta indicador."
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

function mv487pPrepararProduccion_(base, usuarioSesion) {
  if (typeof previsualizarProduccionWinParalelaV487 !== "function") throw new Error("V487: no esta disponible el motor de Produccion WIN.");
  const preview = previsualizarProduccionWinParalelaV487({usuario:usuarioSesion,periodo:base.periodo});
  if (!preview || preview.ok === false) throw new Error(preview && preview.error ? preview.error : "V487: no se pudo calcular Produccion.");

  const porOrden = {};
  (base.ordenes || []).forEach(function(o){ porOrden[o.ordenId] = o; });
  const mapa = {};
  const dudosas = [];
  let excluidasVtrGar = 0;
  let ordenes = 0;
  let puntos = 0;

  (preview.detalle || []).forEach(function(x){
    const orden = porOrden[mv487pId_(x.ordenId)] || null;
    if (orden && mv487pTipoVtrGarOrden_(orden)) { excluidasVtrGar++; return; }
    if (!x.codigoPartida || mv487pNorm_(x.clasificacion) === "DUDOSA" || x.partidaDiferente) {
      dudosas.push({ordenId:x.ordenId,cuadrilla:x.cuadrillaWin||x.cuadrillaEjecutora,codigoPartida:x.codigoPartida||"",motivo:x.motivoIntervencion||x.regla||"Sin clasificacion confiable"});
      return;
    }
    const cuad = orden ? orden.cuadrilla : normalizarCuadrilla(x.cuadrillaWin || x.cuadrillaEjecutora || "");
    const fecha = mv487pFecha_(x.fecha);
    if (!cuad || !fecha) {
      dudosas.push({ordenId:x.ordenId,cuadrilla:cuad||"",codigoPartida:x.codigoPartida,motivo:"Cuadrilla o fecha no valida"});
      return;
    }
    const codigo = mv487pTexto_(x.codigoPartida);
    const clave = [cuad,mv487pFechaIso_(fecha),codigo].join("|");
    if (!mapa[clave]) mapa[clave] = {usuario:usuarioSesion||"ADMIN",cuadrilla:cuad,fecha:fecha,codigo:codigo,cantidad:0,puntosUnitarios:Number(x.puntos)||0};
    mapa[clave].cantidad++;
    ordenes++;
    puntos += Number(x.puntos)||0;
  });

  if (dudosas.length) {
    throw new Error("V487: Produccion no se publico. Existen " + dudosas.length + " orden(es) sin clasificacion confiable. Ejemplos: " + dudosas.slice(0,8).map(function(x){return x.ordenId+" ("+x.motivo+")";}).join(", "));
  }

  const registros = Object.keys(mapa).sort().map(function(k){return mapa[k];});
  return {preview:preview,registros:registros,ordenes:ordenes,puntos:puntos,excluidasVtrGar:excluidasVtrGar};
}

function mv487pFilasPeriodo_(hoja, columnaFecha, periodo) {
  if (!hoja || hoja.getLastRow() <= 1) return [];
  const valores = hoja.getRange(2,columnaFecha,hoja.getLastRow()-1,1).getValues();
  const filas = [];
  valores.forEach(function(f,i){ if (mv487pPeriodoIso_(f[0]) === periodo) filas.push(i+2); });
  return filas;
}

function mv487pEliminarFilas_(hoja, filas) {
  if (!filas || !filas.length) return 0;
  const ordenadas = filas.slice().sort(function(a,b){return b-a;});
  let eliminadas = 0;
  let inicio = ordenadas[0];
  let fin = ordenadas[0];
  for (let i=1;i<=ordenadas.length;i++) {
    const actual = i < ordenadas.length ? ordenadas[i] : null;
    if (actual !== null && actual === fin-1) { fin = actual; continue; }
    hoja.deleteRows(fin, inicio-fin+1);
    eliminadas += inicio-fin+1;
    if (actual !== null) { inicio = actual; fin = actual; }
  }
  return eliminadas;
}

function mv487pReemplazarMatrizPeriodo_(hoja, matriz, periodo, columnaFecha, columnaPorcentaje) {
  const filasPeriodo = mv487pFilasPeriodo_(hoja,columnaFecha,periodo);
  const eliminadas = mv487pEliminarFilas_(hoja,filasPeriodo);
  const nuevas = (matriz || []).slice(1);
  if (nuevas.length) {
    const filaInicio = hoja.getLastRow()+1;
    hoja.getRange(filaInicio,1,nuevas.length,matriz[0].length).setValues(nuevas);
    hoja.getRange(filaInicio,columnaFecha,nuevas.length,1).setNumberFormat("dd/mm/yyyy");
    if (columnaPorcentaje) hoja.getRange(filaInicio,columnaPorcentaje,nuevas.length,1).setNumberFormat("0.00%");
  }
  return {eliminadas:eliminadas,nuevas:nuevas.length};
}

function mv487pReemplazarProduccionPeriodo_(periodo, preparacion) {
  const hoja = obtenerHoja(HOJA_PRODUCCION);
  const filasPeriodo = mv487pFilasPeriodo_(hoja,3,periodo);
  const eliminadas = mv487pEliminarFilas_(hoja,filasPeriodo);
  const ahora = new Date();
  const nuevas = (preparacion.registros || []).map(function(r){
    const id = typeof generarID === "function" ? generarID(r.cuadrilla,r.fecha,r.codigo) : [r.cuadrilla,mv487pFechaIso_(r.fecha),r.codigo].join("|");
    return [r.usuario,r.cuadrilla,r.fecha,r.codigo,r.cantidad,id,ahora];
  });
  if (nuevas.length) {
    const inicio = hoja.getLastRow()+1;
    hoja.getRange(inicio,1,nuevas.length,7).setValues(nuevas);
    hoja.getRange(inicio,3,nuevas.length,1).setNumberFormat("dd/mm/yyyy");
    hoja.getRange(inicio,7,nuevas.length,1).setNumberFormat("dd/mm/yyyy hh:mm");
  }
  return {eliminadas:eliminadas,nuevas:nuevas.length,ordenes:preparacion.ordenes,puntos:preparacion.puntos,excluidasVtrGar:preparacion.excluidasVtrGar};
}

function mv487pAgregarPendientesVtrGar_(base, vtrgar, usuarioSesion) {
  const nuevos = vtrgar.nuevosPendientes || [];
  if (!nuevos.length) return {agregados:0,omitidos:0};
  const hoja = asegurarHojaBaseVtrGarDetectada();
  const datos = hoja.getDataRange().getValues();
  const ids = {};
  const claves = {};
  for (let i=1;i<datos.length;i++) {
    const clave = mv487pTexto_(datos[i][0]);
    const id = mv487pId_(datos[i][7]);
    if (clave) claves[clave] = true;
    if (id) ids[id] = true;
  }
  const corte = base.corte || new Date();
  const periodoNombre = mv487pNombreMes_(base.periodo);
  const filas = [];
  let omitidos = 0;
  nuevos.forEach(function(x){
    if (ids[x.ordenId] || claves[x.clave]) { omitidos++; return; }
    filas.push([
      x.clave,
      x.fecha || corte,
      x.tipo,
      x.ticket || "",
      x.dni || "",
      x.cliente || "",
      x.codigoPedido || "",
      x.ordenId,
      x.tipoPartida || "",
      x.cuadrillaEjecutora || "",
      x.sedeEjecutora || "",
      "PENDIENTE",
      "",
      "",
      "",
      "",
      x.cuadrillaEjecutoraOriginal && x.cuadrillaEjecutoraOriginal !== x.cuadrillaEjecutora ? "Ejecutor WIN original: "+x.cuadrillaEjecutoraOriginal : "Detectado automaticamente desde WIN",
      new Date(),
      corte,
      periodoNombre
    ]);
    ids[x.ordenId] = true;
    claves[x.clave] = true;
  });
  if (filas.length) {
    const inicio = hoja.getLastRow()+1;
    hoja.getRange(inicio,1,filas.length,20).setValues(filas);
    hoja.getRange(inicio,2,filas.length,1).setNumberFormat("dd/mm/yyyy");
    hoja.getRange(inicio,16,filas.length,1).setNumberFormat("dd/mm/yyyy hh:mm");
    hoja.getRange(inicio,18,filas.length,2).setNumberFormat("dd/mm/yyyy hh:mm");
  }
  return {agregados:filas.length,omitidos:omitidos};
}

function mv487pSnapshotHojas_() {
  const hojas = [
    obtenerHoja(HOJA_PRODUCCION),
    obtenerHoja(HOJA_EFECTIVIDAD),
    obtenerHoja(HOJA_RECABLEADO),
    obtenerHojaVtrGarFlexible(),
    asegurarHojaBaseVtrGarDetectada(),
    obtenerHoja(HOJA_RANKING)
  ];
  return hojas.map(function(h){return snapshotHojaBaseOperativa(h);});
}

function mv487pRestaurar_(snapshots) {
  const errores = [];
  (snapshots || []).forEach(function(s){
    try { restaurarSnapshotBaseOperativa(s); }
    catch (e) { errores.push(s.hoja.getName()+": "+e.message); }
  });
  try { SpreadsheetApp.flush(); } catch (_) {}
  return errores;
}

function previsualizarPublicacionIndicadoresWinV487(data) {
  data = data || {};
  mv487pValidarUsuario_(data.usuario);
  const periodo = mv487pValidarPeriodo_(data.periodo || MV487_PUBLICADOR_PERIODO_MINIMO_);
  const base = mv487pLeerMapaCanonico_(periodo);
  const efrec = mv487pCalcularEfRec_(base);
  const vtrgar = mv487pResumenVtrGar_(base);
  const matrices = mv487pConstruirMatrices_(base,efrec,vtrgar,data.usuario||"ADMIN");
  let produccion = null;
  try { produccion = mv487pPrepararProduccion_(base,data.usuario); }
  catch (e) { produccion = {ok:false,error:e.message||String(e)}; }
  return {
    ok:true,
    version:MV487_PUBLICADOR_VERSION_,
    periodo:periodo,
    soloPrevisualizacion:true,
    escrituraCompilada:MV487_PUBLICADOR_ESCRITURA_COMPILADA_,
    historico:{julio2026Congelado:true,periodosAnterioresCongelados:true,periodoMinimo:MV487_PUBLICADOR_PERIODO_MINIMO_},
    fuente:"WIN / MAPA_ORDENES + historico propio + Partner auxiliar para RESERVA/clasificacion",
    homologaciones:base.homologaciones,
    produccion:produccion && produccion.ok===false ? produccion : {ordenes:produccion.ordenes,puntos:produccion.puntos,filas:produccion.registros.length,excluidasVtrGar:produccion.excluidasVtrGar},
    efectividad:efrec.control,
    recableado:{losRojoFinalizadas:efrec.control.losRojoFinalizadas,recableados:efrec.control.recableadosLosRojo,porcentaje:efrec.control.porcentajeRecableado,recableadosFueraPoblacion:efrec.control.recableadosFueraPoblacion},
    vtrGar:{estadosExistentes:vtrgar.gestion.estados,nuevosPendientesWin:vtrgar.nuevosPendientes.length,reglaMigracion:vtrgar.regla},
    filasPreparadas:{efectividad:matrices.efectividad.length-1,recableado:matrices.recableado.length-1,vtrgar:matrices.vtrgar.length-1},
    controles:{escribeProduccion:false,escribeEfectividad:false,escribeRecableado:false,escribeVtrGar:false,escribeRanking:false,modificaJulio:false,conservaValidacionesVtrGar:true}
  };
}

function publicarIndicadoresWinV487(data) {
  data = data || {};
  const usuario = mv487pValidarUsuario_(data.usuario);
  const periodo = mv487pValidarPeriodo_(data.periodo);
  if (!MV487_PUBLICADOR_ESCRITURA_COMPILADA_) throw new Error("V487: publicacion bloqueada en compilacion.");
  if (mv487pTexto_(data.confirmacion) !== MV487_PUBLICADOR_CONFIRMACION_) throw new Error("V487: falta confirmacion explicita para publicar.");

  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  let snapshots = [];
  try {
    const base = mv487pLeerMapaCanonico_(periodo);
    const efrec = mv487pCalcularEfRec_(base);
    const vtrgar = mv487pResumenVtrGar_(base);
    const matrices = mv487pConstruirMatrices_(base,efrec,vtrgar,usuario.usuario||data.usuario||"ADMIN");
    const produccion = mv487pPrepararProduccion_(base,usuario.usuario||data.usuario);

    snapshots = mv487pSnapshotHojas_();

    const salidaProduccion = mv487pReemplazarProduccionPeriodo_(periodo,produccion);
    const pendientes = mv487pAgregarPendientesVtrGar_(base,vtrgar,usuario.usuario||data.usuario);
    const salidaEfectividad = mv487pReemplazarMatrizPeriodo_(obtenerHoja(HOJA_EFECTIVIDAD),matrices.efectividad,periodo,4,10);
    const salidaRecableado = mv487pReemplazarMatrizPeriodo_(obtenerHoja(HOJA_RECABLEADO),matrices.recableado,periodo,4,7);
    const salidaVtrGar = mv487pReemplazarMatrizPeriodo_(obtenerHojaVtrGarFlexible(),matrices.vtrgar,periodo,4,9);

    SpreadsheetApp.flush();

    const actualizadoAl = Utilities.formatDate(base.corte||new Date(),"America/Lima","dd/MM/yyyy");
    const ranking = actualizarRanking(mv487pNombreMes_(periodo),actualizadoAl);

    invalidarCacheBonosSupervisores_();
    invalidarCumplimientoProduccionDiaria_();
    invalidarResumenDashboardRankingV361_();

    let resumenActualizado = false;
    let resumenCuadrillas = 0;
    let resumenError = "";
    try {
      const versionResumen = versionResumenDashboardRankingV361_();
      const lista = construirResumenDashboardRankingRapidoBaseV369_(periodo,versionResumen);
      resumenCuadrillas = Array.isArray(lista) ? lista.length : 0;
      resumenActualizado = resumenCuadrillas > 0;
    } catch (eResumen) {
      resumenError = eResumen && eResumen.message ? eResumen.message : String(eResumen);
    }

    return {
      ok:true,
      version:MV487_PUBLICADOR_VERSION_,
      accion:"PUBLICAR",
      periodo:periodo,
      actualizadoAl:actualizadoAl,
      julioCongelado:true,
      fuente:"WIN / MAPA_ORDENES",
      produccion:salidaProduccion,
      efectividad:{filas:salidaEfectividad,control:efrec.control},
      recableado:{filas:salidaRecableado,losRojo:efrec.control.losRojoFinalizadas,recableados:efrec.control.recableadosLosRojo,porcentaje:efrec.control.porcentajeRecableado},
      vtrGar:{filas:salidaVtrGar,pendientesNuevos:pendientes,estadosConservados:vtrgar.gestion.estados},
      homologaciones:base.homologaciones,
      ranking:ranking,
      resumen:{actualizado:resumenActualizado,cuadrillas:resumenCuadrillas,error:resumenError}
    };
  } catch (error) {
    const erroresRestauracion = snapshots.length ? mv487pRestaurar_(snapshots) : [];
    throw new Error((error && error.message ? error.message : String(error)) + (erroresRestauracion.length ? " | Error al restaurar: "+erroresRestauracion.join("; ") : ""));
  } finally {
    lock.releaseLock();
  }
}

function estadoPublicadorIndicadoresWinV487() {
  return {
    ok:true,
    version:MV487_PUBLICADOR_VERSION_,
    escrituraCompilada:MV487_PUBLICADOR_ESCRITURA_COMPILADA_,
    periodoMinimo:MV487_PUBLICADOR_PERIODO_MINIMO_,
    julio2026Congelado:true,
    reconstruyeSoloPeriodo:true,
    rollbackAutomatico:true,
    estrategiaVtrGar:"MIGRAR DESDE AGOSTO; conservar validaciones existentes y agregar solo incidencias WIN nuevas como PENDIENTE"
  };
}
