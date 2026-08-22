/* ============================================================
   MI VISUAL V459 - OBSERVACIONES EN RANKING + DASHBOARD SUPERVISOR

   INSTALACION:
   - PEGAR ESTE BLOQUE AL FINAL DEL Code.gs VIGENTE.
   - NO reemplaza ni elimina funciones anteriores.
   - Luego guardar y crear NUEVA VERSION / implementar Web App.

   REGLA DEFINIDA:
   RANKING CUADRILLAS (peso OBSERVACIONES ya configurado, p.ej. 15% Agosto):
   - 60% del indicador Observaciones = CANTIDAD de observaciones no anuladas.
     Incluye DERIVADO / EN PROCESO / PENALIZADO / APELADO / SUBSANADO.
     SUBSANADO cuenta porque la incidencia sí ocurrió.
     ANULADO no cuenta.
   - 40% = MONTO finalmente PENALIZADO.
   - WIN + VISUAL afectan Ranking; se guardan y muestran separados.
   - El peso total de Observaciones NO cambia.

   DASHBOARD / BONO SUPERVISOR:
   - Solo usa observaciones WIN.
   - VISUAL nunca castiga al supervisor que genera el control interno.
   - Cantidad WIN pesa 60% del subindicador Observaciones.
   - Monto penalizado WIN pesa 40%.
   - Para cantidad se normaliza por cuadrilla asignada: 5 observaciones
     no anuladas en una cuadrilla = nivel de alerta máximo para esa cuadrilla.
   - Se conserva la regla económica existente de S/ 300 para el monto
     penalizado del Supervisor; no se altera ese parámetro de negocio.

   OPTIMIZACION / SEGURIDAD:
   - Reutiliza el resumen técnico y la lectura de OBSERVACIONES de la misma
     ejecución cuando ya está disponible.
   - No cambia hojas OBSERVACIONES ni RESUMEN_OBSERVACIONES.
   - No elimina montoAfectado/montoTotal legacy: otros módulos siguen intactos.
   - RANKING conserva sus 27 columnas existentes y agrega columnas nuevas al final.
============================================================ */

var MV459_OBS_CACHE_PERIODO_ = {};
var MV459_BACKEND_ACTIVO_ = true;
var MV459_REGLA_OBS_RANKING_ = "V459-CANTIDAD60-MONTO_PENALIZADO40";
var MV459_ALERTA_OBS_POR_CUADRILLA_ = 5;

function mv459Numero_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function mv459Redondear_(v, dec) {
  var p = Math.pow(10, dec == null ? 2 : dec);
  return Math.round((mv459Numero_(v) + Number.EPSILON) * p) / p;
}

function mv459CeroFuenteObs_() {
  return {cantidad:0,observado:0,gestion:0,penalizadas:0,penalizado:0,subsanadas:0,subsanado:0,anuladas:0,estados:{}};
}

function mv459CeroDetalleObs_() {
  return {cantidadRanking:0,montoPenalizadoRanking:0,win:mv459CeroFuenteObs_(),visual:mv459CeroFuenteObs_(),regla:MV459_REGLA_OBS_RANKING_};
}

function mv459FuenteObs_(valor) {
  var f = normalizarTexto(valor || "");
  if (f.indexOf("WIN") >= 0) return "win";
  if (f.indexOf("VISUAL") >= 0) return "visual";
  return "";
}

function mv459DetalleObservacionesDesdeDatos_(datos, periodo) {
  var mapa = {};
  (datos || []).slice(1).forEach(function(fila) {
    if (periodoDeValorBonoSupervisores_(fila[2] || fila[1]) !== periodo) return;
    var cuadrilla = normalizarCuadrilla(fila[8]);
    if (!cuadrilla) return;
    var fuente = mv459FuenteObs_(fila[9]);
    if (!fuente) return;
    var estado = normalizarTexto(fila[13] || "SIN ESTADO");
    var monto = mv459Numero_(fila[14]);
    if (!mapa[cuadrilla]) mapa[cuadrilla] = mv459CeroDetalleObs_();
    var item = mapa[cuadrilla];
    var src = item[fuente];
    src.estados[estado] = (src.estados[estado] || 0) + 1;
    if (estado === "ANULADO") { src.anuladas++; return; }
    item.cantidadRanking++;
    src.cantidad++;
    src.observado += monto;
    if (estado === "DERIVADO" || estado === "EN PROCESO" || estado === "APELADO") src.gestion += monto;
    if (estado === "PENALIZADO") {
      src.penalizadas++;
      src.penalizado += monto;
      item.montoPenalizadoRanking += monto;
    }
    if (estado === "SUBSANADO") {
      src.subsanadas++;
      src.subsanado += monto;
    }
  });
  Object.keys(mapa).forEach(function(c) {
    var x = mapa[c];
    [x.win,x.visual].forEach(function(s) {
      s.observado=mv459Redondear_(s.observado,2);
      s.gestion=mv459Redondear_(s.gestion,2);
      s.penalizado=mv459Redondear_(s.penalizado,2);
      s.subsanado=mv459Redondear_(s.subsanado,2);
    });
    x.montoPenalizadoRanking=mv459Redondear_(x.montoPenalizadoRanking,2);
  });
  MV459_OBS_CACHE_PERIODO_[periodo]=mapa;
  return mapa;
}

function mv459DetalleObservacionesPeriodo_(periodo) {
  if (MV459_OBS_CACHE_PERIODO_[periodo]) return MV459_OBS_CACHE_PERIODO_[periodo];
  return mv459DetalleObservacionesDesdeDatos_(datosHojaBonoSupervisores_(HOJA_OBSERVACIONES),periodo);
}

function mv459DetalleCuadrilla_(mapa, cuadrilla) {
  return (mapa && mapa[normalizarCuadrilla(cuadrilla)]) || mv459CeroDetalleObs_();
}

function mv459ScoreNegativoRelativo_(valor, maximo) {
  var v=mv459Numero_(valor),m=mv459Numero_(maximo);
  if (m <= 0) return 100;
  return Math.max(0,Math.min(100,100-((v/m)*100)));
}

var MV459_observacionesDetalleBase_ = observacionesDetalleResumenDashboardRankingV361_;
observacionesDetalleResumenDashboardRankingV361_ = function(datos, periodo) {
  var legacy=MV459_observacionesDetalleBase_(datos,periodo)||{};
  var nuevo=mv459DetalleObservacionesDesdeDatos_(datos,periodo);
  Object.keys(nuevo).forEach(function(cuadrilla) {
    if (!legacy[cuadrilla]) legacy[cuadrilla]={total:0,pendientes:0,montoTotal:0,montoPendiente:0,montoAfectado:0,estados:{},winTotal:0,winPenalizadas:0,winMontoPenalizado:0};
    legacy[cuadrilla].winTotal=nuevo[cuadrilla].win.cantidad;
    legacy[cuadrilla].winPenalizadas=nuevo[cuadrilla].win.penalizadas;
    legacy[cuadrilla].winMontoPenalizado=nuevo[cuadrilla].win.penalizado;
    legacy[cuadrilla].mv459Observaciones=nuevo[cuadrilla];
  });
  return legacy;
};

var MV459_aplicarRankingResumenBase_ = aplicarRankingResumenV365_;
aplicarRankingResumenV365_ = function(lista, periodo) {
  lista=MV459_aplicarRankingResumenBase_(lista,periodo)||lista||[];
  if (!Array.isArray(lista) || !lista.length) return lista;
  var mapa=MV459_OBS_CACHE_PERIODO_[periodo]||null;
  if (!mapa) return lista;
  var maxCantidad=0,maxMontoPenalizado=0;
  lista.forEach(function(item) {
    var d=mv459DetalleCuadrilla_(mapa,item.cuadrilla);
    maxCantidad=Math.max(maxCantidad,mv459Numero_(d.cantidadRanking));
    maxMontoPenalizado=Math.max(maxMontoPenalizado,mv459Numero_(d.montoPenalizadoRanking));
  });
  var pesos=configuracionRankingV363_(periodo).pesos;
  lista.forEach(function(item) {
    var d=mv459DetalleCuadrilla_(mapa,item.cuadrilla);
    var scoreCantidad=mv459ScoreNegativoRelativo_(d.cantidadRanking,maxCantidad);
    var scoreMonto=mv459ScoreNegativoRelativo_(d.montoPenalizadoRanking,maxMontoPenalizado);
    var scoreObservaciones=mv459Redondear_((scoreCantidad*0.60)+(scoreMonto*0.40),4);
    var aporteAnterior=mv459Numero_(item.aporteObservaciones);
    var aporteNuevo=mv459Redondear_(scoreObservaciones*mv459Numero_(pesos.OBSERVACIONES)/100,4);
    item.aporteObservaciones=aporteNuevo;
    item.puntaje=mv459Redondear_(mv459Numero_(item.puntaje)-aporteAnterior+aporteNuevo,4);
    item.puntajeFinal=item.puntaje;
    item.scoreObservacionesCantidad=mv459Redondear_(scoreCantidad,2);
    item.scoreObservacionesMonto=mv459Redondear_(scoreMonto,2);
    item.scoreObservaciones=mv459Redondear_(scoreObservaciones,2);
    item.mv459Observaciones=d;
    item.mv361ObservacionesWin=Object.assign({},item.mv361ObservacionesWin||{}, {
      total:d.win.cantidad,penalizadas:d.win.penalizadas,montoPenalizado:d.win.penalizado,
      observado:d.win.observado,gestion:d.win.gestion,subsanadas:d.win.subsanadas,montoSubsanado:d.win.subsanado
    });
  });
  asignarPuestos(lista,"puntaje","puestoRegion",null);
  asignarPuestos(lista,"puntaje","puestoSede","sede");
  asignarPuestos(lista,"puntaje","puestoPlataforma","plataforma");
  return lista;
};

var MV459_ultimaActualizacionResumenObs_ = 0;
var MV459_actualizarResumenObservacionesBase_ = actualizarResumenObservaciones;
actualizarResumenObservaciones = function() {
  var respuesta=MV459_actualizarResumenObservacionesBase_.apply(this,arguments);
  MV459_ultimaActualizacionResumenObs_=Date.now();
  return respuesta;
};

function mv459RecalcularRankingPublicado_(periodo) {
  if (!periodo) return {ok:false,motivo:"SIN_PERIODO"};
  var hoja=obtenerHoja(HOJA_RANKING);
  if (!hoja || hoja.getLastRow()<=1) return {ok:false,motivo:"SIN_RANKING"};
  if (hoja.getMaxColumns()<36) hoja.insertColumnsAfter(hoja.getMaxColumns(),36-hoja.getMaxColumns());
  var ultimaColumna=Math.max(27,hoja.getLastColumn());
  var datos=hoja.getRange(1,1,hoja.getLastRow(),ultimaColumna).getValues();
  var mapaObs=mv459DetalleObservacionesPeriodo_(periodo);
  var filasPeriodo=[];
  for (var i=1;i<datos.length;i++) {
    if (periodoTecnicoV367_(datos[i][0])!==periodo) continue;
    filasPeriodo.push({indice:i,fila:i+1,datos:datos[i]});
  }
  if (!filasPeriodo.length) return {ok:false,motivo:"PERIODO_SIN_FILAS"};
  var maxProduccion=Math.max.apply(null,filasPeriodo.map(function(x){return mv459Numero_(x.datos[6]);}));
  var maxRecableado=Math.max.apply(null,filasPeriodo.map(function(x){return mv459Numero_(x.datos[8]);}));
  var maxVtrGar=Math.max.apply(null,filasPeriodo.map(function(x){return mv459Numero_(x.datos[9]);}));
  var maxCantidad=0,maxMontoPenalizado=0;
  filasPeriodo.forEach(function(x) {
    var d=mv459DetalleCuadrilla_(mapaObs,x.datos[1]);
    maxCantidad=Math.max(maxCantidad,d.cantidadRanking);
    maxMontoPenalizado=Math.max(maxMontoPenalizado,d.montoPenalizadoRanking);
  });
  var pesos=configuracionRankingV363_(periodo).pesos;
  var items=[];
  filasPeriodo.forEach(function(x) {
    var f=x.datos,cuadrilla=normalizarCuadrilla(f[1]),d=mv459DetalleCuadrilla_(mapaObs,cuadrilla);
    var scoreProduccion=puntajePositivo(mv459Numero_(f[6]),maxProduccion);
    var scoreEfectividad=porcentajeDatoDashboardBono_(f[7]);
    var scoreRecableado=puntajeNegativo(mv459Numero_(f[8]),maxRecableado);
    var scoreVtrGar=puntajeNegativo(mv459Numero_(f[9]),maxVtrGar);
    var scoreCantidad=mv459ScoreNegativoRelativo_(d.cantidadRanking,maxCantidad);
    var scoreMonto=mv459ScoreNegativoRelativo_(d.montoPenalizadoRanking,maxMontoPenalizado);
    var scoreObservaciones=(scoreCantidad*0.60)+(scoreMonto*0.40);
    var scoreSla=mv459Numero_(f[21]);
    var aporteProduccion=scoreProduccion*mv459Numero_(pesos.PRODUCCION)/100;
    var aporteEfectividad=scoreEfectividad*mv459Numero_(pesos.EFECTIVIDAD)/100;
    var aporteSla=scoreSla*mv459Numero_(pesos.SLA)/100;
    var aporteObservaciones=scoreObservaciones*mv459Numero_(pesos.OBSERVACIONES)/100;
    var aporteRecableado=scoreRecableado*mv459Numero_(pesos.RECABLEADO)/100;
    var aporteVtrGar=scoreVtrGar*mv459Numero_(pesos.VTRGAR)/100;
    items.push({ref:x,cuadrilla:cuadrilla,sede:normalizarTexto(f[4]),plataforma:normalizarTexto(f[5]),
      puntajeFinal:mv459Redondear_(aporteProduccion+aporteEfectividad+aporteSla+aporteObservaciones+aporteRecableado+aporteVtrGar,4),
      detalle:d,scoreCantidad:mv459Redondear_(scoreCantidad,2),scoreMonto:mv459Redondear_(scoreMonto,2),
      scoreObservaciones:mv459Redondear_(scoreObservaciones,2),aporteObservaciones:mv459Redondear_(aporteObservaciones,4)});
  });
  asignarPuestos(items,"puntajeFinal","puestoRegion",null);
  asignarPuestos(items,"puntajeFinal","puestoSede","sede");
  asignarPuestos(items,"puntajeFinal","puestoPlataforma","plataforma");
  var headers=["OBS WIN V459","MONTO PENALIZADO WIN V459","OBS VISUAL V459","MONTO PENALIZADO VISUAL V459","SCORE CANTIDAD OBS V459","SCORE MONTO OBS V459","SCORE OBSERVACIONES V459","APORTE OBSERVACIONES V459","REGLA OBSERVACIONES V459"];
  hoja.getRange(1,28,1,headers.length).setValues([headers]);
  var filasNumeros=items.map(function(x){return x.ref.fila;}).sort(function(a,b){return a-b;});
  var contiguas=filasNumeros.every(function(f,n){return n===0||f===filasNumeros[n-1]+1;});
  function core(item){return [item.puntajeFinal,item.puestoSede,item.puestoRegion,item.puestoPlataforma,obtenerMedalla(item.puestoRegion),obtenerMedalla(item.puestoSede),obtenerMedalla(item.puestoPlataforma)];}
  function extra(item){return [item.detalle.win.cantidad,item.detalle.win.penalizado,item.detalle.visual.cantidad,item.detalle.visual.penalizado,item.scoreCantidad,item.scoreMonto,item.scoreObservaciones,item.aporteObservaciones,MV459_REGLA_OBS_RANKING_];}
  if (contiguas&&items.length) {
    items.sort(function(a,b){return a.ref.fila-b.ref.fila;});
    var inicio=items[0].ref.fila;
    hoja.getRange(inicio,14,items.length,7).setValues(items.map(core));
    hoja.getRange(inicio,28,items.length,9).setValues(items.map(extra));
  } else {
    items.forEach(function(item){hoja.getRange(item.ref.fila,14,1,7).setValues([core(item)]);hoja.getRange(item.ref.fila,28,1,9).setValues([extra(item)]);});
  }
  var filasFormato=Math.max(1,hoja.getLastRow()-1);
  hoja.getRange(2,29,filasFormato,1).setNumberFormat('"S/ "0.00');
  hoja.getRange(2,31,filasFormato,1).setNumberFormat('"S/ "0.00');
  hoja.getRange(2,32,filasFormato,3).setNumberFormat("0.00");
  hoja.getRange(2,35,filasFormato,1).setNumberFormat("0.0000");
  return {ok:true,periodo:periodo,registros:items.length};
}

var MV459_actualizarRankingBase_ = actualizarRanking;
actualizarRanking = function(periodoManual, actualizadoAlManual, omitirResumenObservaciones) {
  var resumenReciente=MV459_ultimaActualizacionResumenObs_>0 && (Date.now()-MV459_ultimaActualizacionResumenObs_)<5000;
  var omitirResumen=omitirResumenObservaciones===true||resumenReciente;
  var respuesta=MV459_actualizarRankingBase_(periodoManual,actualizadoAlManual,omitirResumen);
  var periodo=(respuesta&&respuesta.periodoClave)||periodoSlaV363_(periodoManual);
  if (!periodo) {
    var corte=convertirFechaRanking(actualizadoAlManual||"");
    periodo=corte?clavePeriodoBaseOperativa(corte):"";
  }
  var v459=mv459RecalcularRankingPublicado_(periodo);
  invalidarResumenDashboardRankingV361_();
  if (respuesta&&typeof respuesta==="object") {respuesta.v459=v459;respuesta.reglaObservaciones=MV459_REGLA_OBS_RANKING_;}
  return respuesta;
};

var MV459_versionResumenBase_ = versionResumenDashboardRankingV361_;
versionResumenDashboardRankingV361_ = function() {
  return String(MV459_versionResumenBase_())+"|V459-OBS-60-40";
};

function mv459PuntajeCantidadSupervisor_(ctx, asignacion) {
  var cuadrillas=(asignacion&&asignacion.cuadrillas)||[];
  if (!cuadrillas.length) return {puntaje:0,promedio:0,total:0,detalle:[]};
  var detalle=[],suma=0,totalObs=0;
  cuadrillas.forEach(function(cuadrilla) {
    var clave=normalizarCuadrilla(cuadrilla),cantidad=0;
    if (ctx.observacionesWinResumen&&ctx.observacionesWinResumen[clave]) {
      cantidad=mv459Numero_(ctx.observacionesWinResumen[clave].total);
    } else if (ctx.observaciones) {
      (ctx.observaciones||[]).slice(1).forEach(function(fila) {
        if (periodoDeValorBonoSupervisores_(fila[2]||fila[1])!==ctx.periodo) return;
        if (normalizarCuadrilla(fila[8])!==clave) return;
        if (mv459FuenteObs_(fila[9])!=="win") return;
        if (normalizarTexto(fila[13])==="ANULADO") return;
        cantidad++;
      });
    }
    totalObs+=cantidad;
    var puntaje=Math.max(0,100-((Math.min(cantidad,MV459_ALERTA_OBS_POR_CUADRILLA_)/MV459_ALERTA_OBS_POR_CUADRILLA_)*100));
    suma+=puntaje;
    detalle.push({cuadrilla:clave,observacionesWin:cantidad,puntajeCantidad:mv459Redondear_(puntaje,2)});
  });
  return {puntaje:mv459Redondear_(suma/cuadrillas.length,2),promedio:mv459Redondear_(totalObs/cuadrillas.length,2),total:totalObs,detalle:detalle};
}

var MV459_calcularCalidadSupervisorBase_ = calcularCalidadSupervisor_;
calcularCalidadSupervisor_ = function(ctx, asignacion, estados) {
  var resultado=MV459_calcularCalidadSupervisorBase_(ctx,asignacion,estados);
  if (!resultado||!resultado.metricas) return resultado;
  var cantidad=mv459PuntajeCantidadSupervisor_(ctx,asignacion);
  var puntajeMonto=mv459Numero_(resultado.metricas.puntajeMontoPenalizado);
  var puntajeObservaciones=mv459Redondear_((cantidad.puntaje*0.60)+(puntajeMonto*0.40),2);
  var puntajeRecableado=mv459Numero_(resultado.metricas.puntajeRecableado);
  var puntajeVtrGar=mv459Numero_(resultado.metricas.puntajeVtrGar);
  var cumplimiento=resultado.evaluable?mv459Redondear_((puntajeObservaciones*0.30)+(puntajeRecableado*0.40)+(puntajeVtrGar*0.30),2):0;
  resultado.cumplimiento=cumplimiento;
  resultado.monto=resultado.evaluable?montoEscalaBonoSupervisores_(ctx,"CALIDAD",cumplimiento):0;
  resultado.estado=resultado.evaluable?(resultado.monto>0?"BONO ACTIVO":"NO ACTIVA BONO"):"SIN DATOS";
  resultado.metricas.puntajeCantidadObservaciones=cantidad.puntaje;
  resultado.metricas.promedioObservacionesWinPorCuadrilla=cantidad.promedio;
  resultado.metricas.observacionesWin=cantidad.total;
  resultado.metricas.observaciones=cantidad.total;
  resultado.metricas.alertaObservacionesPorCuadrilla=MV459_ALERTA_OBS_POR_CUADRILLA_;
  resultado.metricas.detalleCantidadObservaciones=cantidad.detalle;
  resultado.metricas.puntajeObservaciones=puntajeObservaciones;
  resultado.metricas.pesoCantidadObservaciones=60;
  resultado.metricas.pesoMontoPenalizado=40;
  resultado.metricas.soloFuente="WIN";
  resultado.nota="Observaciones aporta 30% de Calidad. Dentro de Observaciones: cantidad WIN no anulada 60% y monto penalizado WIN 40%. Las observaciones VISUAL no afectan al Supervisor. Subsanado sigue contando como incidencia ocurrida; Anulado no cuenta. Se conserva la referencia económica existente de S/ 300 para monto penalizado.";
  return resultado;
};
