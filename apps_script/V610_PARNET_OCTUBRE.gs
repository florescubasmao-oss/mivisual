/* ============================================================
   MI VISUAL V610 - CONCILIACION PARNET OCTUBRE 2026
   INSTALACION: PEGAR ESTE BLOQUE AL FINAL ABSOLUTO DEL Code.gs VIGENTE.

   ALCANCE ESTRICTO:
   - SOLO periodo 2026-10.
   - PARNET manda SOLO sobre ordenes FINALIZADAS.
   - PRODUCCION_APP: reemplaza octubre segun partida PARNET.
   - EFECTIVIDAD: solo reemplaza FINALIZADAS; conserva CANCELADA,
     REGESTION y REPROGRAMADO existentes de WIN.
   - PORCENTAJE REC: solo reemplaza RECABLEADOS finalizados PARNET;
     conserva LOS ROJO ASIGNADAS existente.
   - POR VTR/GAR: solo reemplaza denominador FINALIZADAS;
     conserva GAR y VTR existentes.
   - NO modifica MAPA_ORDENES, BASE_OPERATIVA_HISTORICA, Actas,
     Validacion Tecnica, Descansos, PEXT ni meses <= 2026-09.
   - PREVISUALIZAR no escribe.
   - APLICAR exige confirmacion explicita, snapshot y rollback.
============================================================ */

var MV610_VERSION_ = "V610-PARNET-OCTUBRE-FINALIZADAS-20261011";
var MV610_PERIODO_ = "2026-10";
var MV610_CONFIRMACION_ = "APLICAR_PARNET_OCTUBRE_V610";

function mv610Texto_(v){ return String(v == null ? "" : v).trim(); }
function mv610PeriodoFecha_(v){
  var f = fechaBaseOperativa(v);
  if (!f) return "";
  return Utilities.formatDate(f, "America/Lima", "yyyy-MM");
}
function mv610FechaIso_(v){
  var f = fechaBaseOperativa(v);
  if (!f) return "";
  return Utilities.formatDate(f, "America/Lima", "yyyy-MM-dd");
}
function mv610FechaVisible_(v){
  var f = fechaBaseOperativa(v);
  if (!f) return "";
  return Utilities.formatDate(f, "America/Lima", "dd/MM/yyyy");
}
function mv610EsFinalizada_(v){ return normalizarTexto(v || "") === "FINALIZADA"; }

function mv610ValidarUsuario_(usuario){
  var u = validarAdministracionBaseOperativa(usuario);
  if (!u || !esPerfilJefatura(u.perfil)) {
    throw new Error("V610: solo Jefatura/Administracion puede conciliar PARNET.");
  }
  return u;
}

function mv610LeerPeriodo_(hoja, indiceFecha, columnas){
  var out = [];
  var last = hoja.getLastRow();
  if (last <= 1) return out;
  var vals = hoja.getRange(2,1,last-1,Math.min(columnas,hoja.getLastColumn())).getValues();
  vals.forEach(function(f){
    if (mv610PeriodoFecha_(f[indiceFecha]) === MV610_PERIODO_) out.push(f);
  });
  return out;
}

function mv610MapaActualPorCuadrilla_(filas, tipo){
  var m = {};
  filas.forEach(function(f){
    var c = normalizarCuadrilla(f[2] || "");
    if (!c) return;
    if (tipo === "EF") {
      m[c] = {
        usuario:f[1] || "JEFZNORTE",
        cancelada:Number(f[5])||0,
        regestion:Number(f[6])||0,
        reprogramado:Number(f[7])||0
      };
    } else if (tipo === "REC") {
      m[c] = {
        usuario:f[1] || "JEFZNORTE",
        rojoAsignadas:Number(f[4])||0
      };
    } else if (tipo === "VG") {
      m[c] = {
        usuario:f[1] || "JEFZNORTE",
        gar:Number(f[5])||0,
        vtr:Number(f[6])||0
      };
    }
  });
  return m;
}

function mv610ProduccionActual_(){
  var hoja = obtenerHoja(HOJA_PRODUCCION);
  var filas = mv610LeerPeriodo_(hoja,2,7);
  var catalogo = obtenerCatalogoPuntajesProduccion();
  var puntos=0, ordenes=0, porCuadrilla={};
  filas.forEach(function(f){
    var c=normalizarCuadrilla(f[1]||"");
    var cod=mv610Texto_(f[3]);
    var cant=Number(f[4])||0;
    var pt=obtenerPuntajeProduccion(cod,catalogo);
    ordenes+=cant; puntos+=cant*pt;
    if(!porCuadrilla[c]) porCuadrilla[c]={ordenes:0,puntos:0};
    porCuadrilla[c].ordenes+=cant; porCuadrilla[c].puntos+=cant*pt;
  });
  return {filas:filas.length,ordenes:ordenes,puntos:Math.round(puntos*100)/100,porCuadrilla:porCuadrilla};
}

function mv610ResolverCatalogo_(r,catalogo){
  var tipo = normalizarTexto(r.tipoPartida || "");
  var alt = normalizarTexto(r.tipoPartidaAlterna || "");
  var cat = catalogo.porTipo[tipo] || null;
  if (!cat && alt && (catalogo.porTipo[alt] || ["","AVERIA","INSTALACION"].indexOf(tipo)>=0)) {
    tipo=alt; cat=catalogo.porTipo[tipo] || null;
  }
  return {tipo:tipo,cat:cat};
}

function mv610Preparar_(data){
  data=data||{};
  var usuario=mv610ValidarUsuario_(data.usuario);
  var preparado=prepararRegistrosBaseOperativa(data.registros || []);
  var catalogo=catalogoPartidasBaseOperativa();
  var usuarios=cuadrillasTecnicasBaseOperativa();

  var fueraOctubre=[];
  var finalizadas=[];
  preparado.registros.forEach(function(r){
    var p=mv610PeriodoFecha_(r.fecha);
    if (p !== MV610_PERIODO_) {
      fueraOctubre.push({fecha:mv610FechaVisible_(r.fecha),estado:r.estado,codigoLiquidacion:r.codigoLiquidacion||""});
      return;
    }
    if (mv610EsFinalizada_(r.estado)) finalizadas.push(r);
  });
  if (!finalizadas.length) throw new Error("V610: el archivo no contiene FINALIZADAS de octubre 2026.");

  var porLiq={}, duplicadosLiq=[], sinLiquidacion=[];
  finalizadas.forEach(function(r){
    var liq=normalizarTexto(r.codigoLiquidacion||"");
    if(!liq){sinLiquidacion.push(r);return;}
    if(porLiq[liq]) duplicadosLiq.push(liq);
    else porLiq[liq]=r;
  });

  var produccionMap={}, finalPorCuadrilla={}, recPorCuadrilla={};
  var noCatalogadas={}, cuadrillasNoEncontradas={}, excluidasVtrGar=0;
  var corte=null, puntos=0, ordenesProduccion=0;
  var detalleFinalizadas=[];

  Object.keys(porLiq).forEach(function(liq){
    var r=porLiq[liq];
    var c=normalizarCuadrilla(r.cuadrilla||"");
    if(!usuarios[c]) cuadrillasNoEncontradas[c]=true;
    finalPorCuadrilla[c]=(finalPorCuadrilla[c]||0)+1;
    if(!corte || r.fecha>corte) corte=r.fecha;

    var incidencia="";
    try { incidencia=tipoIncidenciaBaseOperativa(r); } catch(_){}
    if(incidencia==="VTR" || incidencia==="GAR"){
      excluidasVtrGar++;
      detalleFinalizadas.push({codigoLiquidacion:liq,fecha:mv610FechaVisible_(r.fecha),cuadrilla:c,tipoPartida:r.tipoPartida||"",codigo:"",origen:"PARNET",produccion:false,motivo:incidencia});
      return;
    }

    var res=mv610ResolverCatalogo_(r,catalogo);
    if(!res.cat){
      var n=res.tipo||"SIN PARTIDA";
      if(!noCatalogadas[n]) noCatalogadas[n]={tipoPartida:n,cantidad:0,cuadrillas:{}};
      noCatalogadas[n].cantidad++;
      noCatalogadas[n].cuadrillas[c]=true;
      detalleFinalizadas.push({codigoLiquidacion:liq,fecha:mv610FechaVisible_(r.fecha),cuadrilla:c,tipoPartida:n,codigo:"",origen:"PARNET",produccion:false,motivo:"SIN CATALOGO"});
      return;
    }

    var clave=[c,mv610FechaIso_(r.fecha),res.cat.codigo].join("|");
    if(!produccionMap[clave]) produccionMap[clave]={usuario:usuario.usuario||"JEFZNORTE",cuadrilla:c,fecha:r.fecha,codigo:res.cat.codigo,cantidad:0};
    produccionMap[clave].cantidad++;
    ordenesProduccion++;
    puntos+=(Number(res.cat.puntaje)||0);

    if(res.cat.grupo==="RECABLEADO_VT"){
      recPorCuadrilla[c]=(recPorCuadrilla[c]||0)+1;
    }
    detalleFinalizadas.push({codigoLiquidacion:liq,fecha:mv610FechaVisible_(r.fecha),cuadrilla:c,tipoPartida:res.tipo,codigo:res.cat.codigo,origen:"PARNET",produccion:true,motivo:""});
  });

  var produccionRegistros=Object.keys(produccionMap).map(function(k){return produccionMap[k];})
    .sort(function(a,b){
      return a.cuadrilla.localeCompare(b.cuadrilla) || a.fecha-b.fecha || a.codigo.localeCompare(b.codigo);
    });

  var efActual=mv610MapaActualPorCuadrilla_(mv610LeerPeriodo_(obtenerHoja(HOJA_EFECTIVIDAD),3,10),"EF");
  var recActual=mv610MapaActualPorCuadrilla_(mv610LeerPeriodo_(obtenerHoja(HOJA_RECABLEADO),3,7),"REC");
  var vgActual=mv610MapaActualPorCuadrilla_(mv610LeerPeriodo_(obtenerHojaVtrGarFlexible(),3,9),"VG");

  var todas={};
  Object.keys(efActual).forEach(function(c){todas[c]=true;});
  Object.keys(recActual).forEach(function(c){todas[c]=true;});
  Object.keys(vgActual).forEach(function(c){todas[c]=true;});
  Object.keys(finalPorCuadrilla).forEach(function(c){todas[c]=true;});

  var actualizadoAl=corte||new Date(2026,9,1);
  var fechaAct=actualizadoAl;
  var listaCuadrillas=Object.keys(todas).sort();

  var ef=[["ID","Usuario","Cuadrilla","ACTUALIZACION","Finalizada","Cancelada","Regestión","Reprogramado","Total General","Efectividad"]];
  var rec=[["ID","Usuario","Cuadrilla","ACTUALIZACION","los rojo asignadas","Recableados","PORCENTAJE"]];
  var vg=[["ID","Usuario","Cuadrilla","ACTUALIZACION","Total Ordenes FINALIZADAS","GAR","VTR","TOTAL GAR/VTR","% VTR/GAR"]];

  listaCuadrillas.forEach(function(c,i){
    var ea=efActual[c]||{}, ra=recActual[c]||{}, va=vgActual[c]||{};
    var fin=Number(finalPorCuadrilla[c])||0;
    var can=Number(ea.cancelada)||0, reg=Number(ea.regestion)||0, rep=Number(ea.reprogramado)||0;
    var tot=fin+can+reg+rep;
    ef.push([c+"|"+MV610_PERIODO_+"|"+(i+1),ea.usuario||usuario.usuario||"JEFZNORTE",c,fechaAct,fin,can,reg,rep,tot,tot>0?fin/tot:0]);

    var rojo=Number(ra.rojoAsignadas)||0, recab=Number(recPorCuadrilla[c])||0;
    rec.push([c+"|"+MV610_PERIODO_+"|"+(i+1),ra.usuario||usuario.usuario||"JEFZNORTE",c,fechaAct,rojo,recab,rojo>0?recab/rojo:0]);

    var gar=Number(va.gar)||0, vtr=Number(va.vtr)||0, tv=gar+vtr;
    vg.push([c+"|"+MV610_PERIODO_+"|"+(i+1),va.usuario||usuario.usuario||"JEFZNORTE",c,fechaAct,fin,gar,vtr,tv,fin>0?tv/fin:0]);
  });

  var noCatLista=Object.keys(noCatalogadas).sort().map(function(k){
    return {tipoPartida:k,cantidad:noCatalogadas[k].cantidad,cuadrillas:Object.keys(noCatalogadas[k].cuadrillas).sort()};
  });
  var prodActual=mv610ProduccionActual_();
  var comparacionCuadrillas=[];
  var nuevoPC={};
  produccionRegistros.forEach(function(r){
    var c=r.cuadrilla, cant=Number(r.cantidad)||0, pt=obtenerPuntajeProduccion(r.codigo,obtenerCatalogoPuntajesProduccion());
    if(!nuevoPC[c]) nuevoPC[c]={ordenes:0,puntos:0};
    nuevoPC[c].ordenes+=cant; nuevoPC[c].puntos+=cant*pt;
  });
  var cc={}; Object.keys(prodActual.porCuadrilla).forEach(function(c){cc[c]=true;}); Object.keys(nuevoPC).forEach(function(c){cc[c]=true;});
  Object.keys(cc).sort().forEach(function(c){
    var a=prodActual.porCuadrilla[c]||{ordenes:0,puntos:0}, n=nuevoPC[c]||{ordenes:0,puntos:0};
    if(a.ordenes!==n.ordenes || Math.abs(a.puntos-n.puntos)>0.0001){
      comparacionCuadrillas.push({cuadrilla:c,ordenesActual:a.ordenes,ordenesParnet:n.ordenes,diferenciaOrdenes:n.ordenes-a.ordenes,puntosActual:Math.round(a.puntos*100)/100,puntosParnet:Math.round(n.puntos*100)/100,diferenciaPuntos:Math.round((n.puntos-a.puntos)*100)/100});
    }
  });

  return {
    usuario:usuario,
    archivo:mv610Texto_(data.archivo||"BASE PARNET"),
    periodo:MV610_PERIODO_,
    corte:corte,
    actualizadoAl:mv610FechaVisible_(corte),
    recibidos:preparado.recibidos,
    validos:preparado.validos,
    fueraOctubre:fueraOctubre,
    finalizadasUnicas:Object.keys(porLiq).length,
    sinLiquidacion:sinLiquidacion.length,
    duplicadosLiquidacion:Array.from(new Set(duplicadosLiq)).sort(),
    finalPorCuadrilla:finalPorCuadrilla,
    recPorCuadrilla:recPorCuadrilla,
    noCatalogadas:noCatLista,
    cuadrillasNoEncontradas:Object.keys(cuadrillasNoEncontradas).filter(Boolean).sort(),
    excluidasVtrGar:excluidasVtrGar,
    produccion:{
      registros:produccionRegistros,
      ordenes:ordenesProduccion,
      puntos:Math.round(puntos*100)/100,
      excluidasVtrGar:excluidasVtrGar
    },
    matrices:{efectividad:ef,recableado:rec,vtrgar:vg},
    actual:prodActual,
    comparacionCuadrillas:comparacionCuadrillas,
    detalleFinalizadas:detalleFinalizadas
  };
}

function previsualizarParnetOctubreV610(data){
  var p=mv610Preparar_(data);
  return {
    ok:true,
    version:MV610_VERSION_,
    modulo:"PARNET_OCTUBRE",
    accion:"PREVISUALIZAR",
    soloLectura:true,
    periodo:p.periodo,
    corte:p.actualizadoAl,
    archivo:p.archivo,
    resumen:{
      filasRecibidas:p.recibidos,
      finalizadasParnet:p.finalizadasUnicas,
      finalizadasSinLiquidacion:p.sinLiquidacion,
      duplicadosCodigoLiquidacion:p.duplicadosLiquidacion.length,
      fueraOctubre:p.fueraOctubre.length,
      produccionActualOrdenes:p.actual.ordenes,
      produccionParnetOrdenes:p.produccion.ordenes,
      diferenciaOrdenes:p.produccion.ordenes-p.actual.ordenes,
      puntosActuales:p.actual.puntos,
      puntosParnet:p.produccion.puntos,
      diferenciaPuntos:Math.round((p.produccion.puntos-p.actual.puntos)*100)/100,
      partidasNoCatalogadas:p.noCatalogadas.reduce(function(s,x){return s+x.cantidad;},0),
      cuadrillasNoEncontradas:p.cuadrillasNoEncontradas.length,
      vtrGarFinalizadasExcluidasProduccion:p.excluidasVtrGar
    },
    bloqueos:{
      sinLiquidacion:p.sinLiquidacion>0,
      duplicadosLiquidacion:p.duplicadosLiquidacion.length>0,
      partidasNoCatalogadas:p.noCatalogadas.length>0,
      cuadrillasNoEncontradas:p.cuadrillasNoEncontradas.length>0
    },
    detalle:{
      duplicadosLiquidacion:p.duplicadosLiquidacion.slice(0,100),
      partidasNoCatalogadas:p.noCatalogadas,
      cuadrillasNoEncontradas:p.cuadrillasNoEncontradas,
      cambiosPorCuadrilla:p.comparacionCuadrillas,
      finalizadas:p.detalleFinalizadas.slice(0,500)
    },
    reglas:{
      parnetMandaFinalizadas:true,
      produccionPartidaParnet:true,
      efectividadSoloFinalizadas:true,
      recableadoSoloFinalizadosParnet:true,
      vtrGarSoloDenominador:true,
      conservaEstadosWinNoFinalizados:true,
      noModificaMapa:true,
      noModificaBaseHistorica:true,
      septiembreYAnterioresProtegidos:true,
      periodoPermitido:"2026-10"
    }
  };
}

function mv610GuardarRespaldo_(snapshots){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  (snapshots||[]).forEach(function(s){
    var nombre=("BKP_V610_"+s.hoja.getName()).replace(/[^A-Z0-9_\/ ]/gi,"_").substring(0,95);
    var h=ss.getSheetByName(nombre);
    if(!h) h=ss.insertSheet(nombre);
    prepararHojaParaReemplazoBaseOperativa(h);
    var filas=s.valores.length, cols=s.valores[0].length;
    if(h.getMaxRows()<filas) h.insertRowsAfter(h.getMaxRows(),filas-h.getMaxRows());
    if(h.getMaxColumns()<cols) h.insertColumnsAfter(h.getMaxColumns(),cols-h.getMaxColumns());
    h.clearContents();
    var rg=h.getRange(1,1,filas,cols);
    rg.setValues(s.valores);
    if(s.formatosNumero && s.formatosNumero.length===filas) rg.setNumberFormats(s.formatosNumero);
    try{h.hideSheet();}catch(_){}
  });
}

function aplicarParnetOctubreV610(data){
  data=data||{};
  if(mv610Texto_(data.confirmacion)!==MV610_CONFIRMACION_) {
    throw new Error("V610: falta confirmacion explicita. Primero previsualice.");
  }
  var p=mv610Preparar_(data);
  if(p.sinLiquidacion>0) throw new Error("V610 bloqueado: hay FINALIZADAS sin Codigo de Liquidacion.");
  if(p.duplicadosLiquidacion.length) throw new Error("V610 bloqueado: existen Codigos de Liquidacion duplicados.");
  if(p.noCatalogadas.length) throw new Error("V610 bloqueado: existen partidas PARNET no configuradas en CATALOGO_ORDENES.");
  if(p.cuadrillasNoEncontradas.length) throw new Error("V610 bloqueado: existen cuadrillas PARNET no reconocidas en USUARIOS.");
  if(!p.corte || mv610PeriodoFecha_(p.corte)!==MV610_PERIODO_) throw new Error("V610: corte fuera de octubre 2026.");

  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000)) throw new Error("V610: sistema ocupado. Intente nuevamente en unos minutos.");

  var hojas=[
    obtenerHoja(HOJA_PRODUCCION),
    obtenerHoja(HOJA_EFECTIVIDAD),
    obtenerHoja(HOJA_RECABLEADO),
    obtenerHojaVtrGarFlexible(),
    obtenerHoja(HOJA_RANKING)
  ];
  var snapshots=[];
  try{
    snapshots=hojas.map(snapshotHojaBaseOperativa);
    mv610GuardarRespaldo_(snapshots.slice(0,4));

    var rp=mv520BReemplazarProduccionPeriodo_(MV610_PERIODO_,p.produccion);

    var corte=p.corte;
    var efHist=combinarMatrizPeriodoBaseOperativa(obtenerHoja(HOJA_EFECTIVIDAD),p.matrices.efectividad,3,corte);
    reemplazarHojaBaseOperativa(obtenerHoja(HOJA_EFECTIVIDAD),efHist);
    obtenerHoja(HOJA_EFECTIVIDAD).getRange(2,4,Math.max(efHist.length-1,1),1).setNumberFormat("dd/mm/yyyy");
    if(efHist.length>1) obtenerHoja(HOJA_EFECTIVIDAD).getRange(2,10,efHist.length-1,1).setNumberFormat("0.00%");

    var recHist=combinarMatrizPeriodoBaseOperativa(obtenerHoja(HOJA_RECABLEADO),p.matrices.recableado,3,corte);
    reemplazarHojaBaseOperativa(obtenerHoja(HOJA_RECABLEADO),recHist);
    if(recHist.length>1){obtenerHoja(HOJA_RECABLEADO).getRange(2,4,recHist.length-1,1).setNumberFormat("dd/mm/yyyy");obtenerHoja(HOJA_RECABLEADO).getRange(2,7,recHist.length-1,1).setNumberFormat("0.00%");}

    var vgHoja=obtenerHojaVtrGarFlexible();
    var vgHist=combinarMatrizPeriodoBaseOperativa(vgHoja,p.matrices.vtrgar,3,corte);
    reemplazarHojaBaseOperativa(vgHoja,vgHist);
    if(vgHist.length>1){vgHoja.getRange(2,4,vgHist.length-1,1).setNumberFormat("dd/mm/yyyy");vgHoja.getRange(2,9,vgHist.length-1,1).setNumberFormat("0.00%");}

    SpreadsheetApp.flush();

    var ranking=actualizarRanking("OCTUBRE",p.actualizadoAl);

    try{invalidarCacheBonosSupervisores_();}catch(_){}
    try{invalidarCumplimientoProduccionDiaria_();}catch(_){}
    try{invalidarResumenDashboardRankingV361_();}catch(_){}
    SpreadsheetApp.flush();

    return {
      ok:true,version:MV610_VERSION_,modulo:"PARNET_OCTUBRE",accion:"APLICAR",
      periodo:MV610_PERIODO_,corte:p.actualizadoAl,archivo:p.archivo,
      finalizadasParnet:p.finalizadasUnicas,
      produccion:{ordenes:p.produccion.ordenes,puntos:p.produccion.puntos,resultado:rp},
      efectividadFilas:p.matrices.efectividad.length-1,
      recableadoFilas:p.matrices.recableado.length-1,
      vtrGarFilas:p.matrices.vtrgar.length-1,
      ranking:ranking,
      respaldoPersistente:true,
      historicoProtegido:true,
      mapaModificado:false
    };
  }catch(error){
    var rollback=[];
    snapshots.forEach(function(s){
      try{restaurarSnapshotBaseOperativa(s);}catch(e){rollback.push(s.hoja.getName()+": "+(e.message||e));}
    });
    try{SpreadsheetApp.flush();}catch(_){}
    throw new Error("V610 no aplico cambios. Se ejecuto rollback. "+(error&&error.message?error.message:error)+(rollback.length?" | Rollback: "+rollback.join(" | "):""));
  }finally{
    try{lock.releaseLock();}catch(_){}
  }
}

function DIAGNOSTICO_V610_PARNET_OCTUBRE(){
  var deps=[
    "prepararRegistrosBaseOperativa","catalogoPartidasBaseOperativa","cuadrillasTecnicasBaseOperativa",
    "mv520BReemplazarProduccionPeriodo_","combinarMatrizPeriodoBaseOperativa",
    "reemplazarHojaBaseOperativa","snapshotHojaBaseOperativa","restaurarSnapshotBaseOperativa"
  ];
  var faltan=deps.filter(function(n){try{return typeof this[n]!=="function";}catch(_){return true;}},this);
  var r={ok:faltan.length===0,version:MV610_VERSION_,fase:"SOLO_LECTURA",periodoPermitido:MV610_PERIODO_,faltan:faltan,protecciones:{septiembreYAnteriores:true,mapaNoSeToca:true,baseHistoricaNoSeToca:true,previsualizacionSinEscritura:true,rollback:true}};
  Logger.log(JSON.stringify(r,null,2));
  return r;
}

/* RUTEO ADITIVO.
   IMPORTANTE: este bloque debe quedar al FINAL del Code.gs vigente para
   capturar el doPost ya existente y no borrar ninguna ruta anterior. */
var MV610_DOPOST_BASE_ = doPost;
doPost = function(e){
  var data={};
  try{data=JSON.parse(e&&e.postData&&e.postData.contents?e.postData.contents:"{}");}catch(_){data={};}
  if(data.accion==="previsualizarParnetOctubreV610"){
    try{return respuestaJson(previsualizarParnetOctubreV610(data));}
    catch(err){return respuestaJson({ok:false,version:MV610_VERSION_,error:err&&err.message?err.message:String(err)});}
  }
  if(data.accion==="aplicarParnetOctubreV610"){
    try{return respuestaJson(aplicarParnetOctubreV610(data));}
    catch(err){return respuestaJson({ok:false,version:MV610_VERSION_,error:err&&err.message?err.message:String(err)});}
  }
  return MV610_DOPOST_BASE_.apply(this,arguments);
};

/* FIN V610 */
