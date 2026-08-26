/* ==========================================================
   MI VISUAL V487.25 - DIAGNOSTICO WIN 100% SOLO LECTURA

   PROPOSITO
   - Validar la propuesta de responsabilidad VTR/GAR usando MAPA_ORDENES.
   - NO redefine funciones actuales de MI VISUAL.
   - NO escribe, NO recalcula, NO modifica hojas ni indicadores.
   - Puede eliminarse del Apps Script luego de la prueba.
========================================================== */

function V48725_DIAG_norm_(v) {
  return String(v == null ? "" : v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function V48725_DIAG_doc_(v) {
  return String(v == null ? "" : v).replace(/[^0-9A-Za-z]/g, "").toUpperCase().trim();
}

function V48725_DIAG_cuad_(v) {
  return String(v == null ? "" : v).replace(/^P\s+(\d+)/i, "P$1").replace(/\s+/g, " ").trim();
}

function V48725_DIAG_hora_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return {h:v.getHours(),m:v.getMinutes(),s:v.getSeconds()};
  var t = String(v == null ? "" : v).trim();
  var m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m ? {h:Number(m[1])||0,m:Number(m[2])||0,s:Number(m[3])||0} : null;
}

function V48725_DIAG_fecha_(v, hora) {
  var d = null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    d = new Date(v.getTime());
  } else {
    var t = String(v == null ? "" : v).trim();
    var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) d = new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
    if (!d) {
      m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (m) d = new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
    }
    if (!d && t) {
      var gen = new Date(t);
      if (!isNaN(gen.getTime())) d = gen;
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  var h = V48725_DIAG_hora_(hora);
  if (h) d.setHours(h.h,h.m,h.s,0);
  return d;
}

function V48725_DIAG_maxFecha_() {
  var best = null;
  for (var i=0;i<arguments.length;i++) {
    var d = arguments[i] instanceof Date ? arguments[i] : V48725_DIAG_fecha_(arguments[i]);
    if (d && (!best || d.getTime() > best.getTime())) best = d;
  }
  return best;
}

function V48725_DIAG_dias_(a,b) {
  a = V48725_DIAG_fecha_(a); b = V48725_DIAG_fecha_(b);
  if (!a || !b) return null;
  var da = new Date(a.getFullYear(),a.getMonth(),a.getDate());
  var db = new Date(b.getFullYear(),b.getMonth(),b.getDate());
  return Math.round((db.getTime()-da.getTime())/86400000);
}

function V48725_DIAG_visible_(d) {
  d = d instanceof Date ? d : V48725_DIAG_fecha_(d);
  return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm") : "";
}

function V48725_DIAG_iso_(d) {
  d = d instanceof Date ? d : V48725_DIAG_fecha_(d);
  return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd") : "";
}

function V48725_DIAG_momentoTrabajo_(x) {
  return x.fechaFin || x.fechaUltimo || x.fechaInicio || x.fechaSolicitud || x.fechaImportacion || null;
}

function V48725_DIAG_esIncidencia_(x) {
  var t = V48725_DIAG_norm_(x.tipoTrabajo);
  var s = V48725_DIAG_norm_(x.codigoSeguimiento).replace(/[^A-Z0-9]/g, "");
  return t === "GARANTIA" || t === "REITERADA" || s.indexOf("GAR") === 0 || s.indexOf("VTR") === 0;
}

function V48725_DIAG_clase_(x) {
  if (!x || x.estado !== "FINALIZADA" || V48725_DIAG_esIncidencia_(x)) return "";
  var t = V48725_DIAG_norm_([x.tipoTrabajo,x.productoOrigen,x.motivoFinalizacion].join(" "));
  if (!t) return "";
  if (t.indexOf("INSTALACION") >= 0) return "INSTALACION";
  return "SERVICIO";
}

function V48725_DIAG_leerWin_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MAPA_ORDENES");
  if (!h) throw new Error("No existe la hoja MAPA_ORDENES");
  if (h.getLastRow() <= 1) return {lista:[],porDni:{},ordenesUnicas:0};
  var cols = Math.max(37,h.getLastColumn());
  var data = h.getRange(2,1,h.getLastRow()-1,cols).getValues();
  var porOrden = {};

  data.forEach(function(f){
    var id = String(f[0] == null ? "" : f[0]).trim();
    if (!id) return;
    var fechaSolicitud = V48725_DIAG_fecha_(f[2],f[3]);
    var fechaUltimo = V48725_DIAG_fecha_(f[11]);
    var fechaFin = V48725_DIAG_fecha_(f[18]);
    var fechaInicio = V48725_DIAG_fecha_(f[19]);
    var fechaImportacion = V48725_DIAG_fecha_(f[26]);
    var fechaOperativa = V48725_DIAG_maxFecha_(fechaFin,fechaInicio,fechaSolicitud);
    var x = {
      ordenId:id,
      tipoTrabajo:String(f[1] == null ? "" : f[1]).trim(),
      fechaSolicitud:fechaSolicitud,
      cliente:String(f[4] == null ? "" : f[4]).trim(),
      productoOrigen:String(f[6] == null ? "" : f[6]).trim(),
      cuadrilla:V48725_DIAG_cuad_(f[7]),
      estado:V48725_DIAG_norm_(f[8]),
      fechaUltimo:fechaUltimo,
      region:V48725_DIAG_norm_(f[13]),
      codigoCliente:String(f[14] == null ? "" : f[14]).trim(),
      numeroDocumento:V48725_DIAG_doc_(f[15]),
      fechaFin:fechaFin,
      fechaInicio:fechaInicio,
      motivoFinalizacion:String(f[21] == null ? "" : f[21]).trim(),
      fechaImportacion:fechaImportacion,
      codigoSeguimiento:String(f[36] == null ? "" : f[36]).trim(),
      _operativa:fechaOperativa
    };

    var a = porOrden[id];
    if (!a) { porOrden[id]=x; return; }
    var xTieneUltimo = !!x.fechaUltimo;
    var aTieneUltimo = !!a.fechaUltimo;
    if (xTieneUltimo !== aTieneUltimo) {
      if (xTieneUltimo) porOrden[id]=x;
      return;
    }
    var xm = (xTieneUltimo ? x.fechaUltimo : (x._operativa || x.fechaImportacion));
    var am = (aTieneUltimo ? a.fechaUltimo : (a._operativa || a.fechaImportacion));
    var xt = xm ? xm.getTime() : 0;
    var at = am ? am.getTime() : 0;
    if (xt > at) { porOrden[id]=x; return; }
    if (xt === at) {
      var xi=x.fechaImportacion ? x.fechaImportacion.getTime() : 0;
      var ai=a.fechaImportacion ? a.fechaImportacion.getTime() : 0;
      if (xi >= ai) porOrden[id]=x;
    }
  });

  var lista = Object.keys(porOrden).map(function(k){return porOrden[k];});
  var porDni={};
  lista.forEach(function(x){
    if (x.estado !== "FINALIZADA" || !x.numeroDocumento) return;
    if (!porDni[x.numeroDocumento]) porDni[x.numeroDocumento]=[];
    porDni[x.numeroDocumento].push(x);
  });
  return {lista:lista,porDni:porDni,ordenesUnicas:lista.length};
}

function V48725_DIAG_leerPendientes_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BASE_VTR_GAR_DETECTADA");
  if (!h) throw new Error("No existe la hoja BASE_VTR_GAR_DETECTADA");
  if (h.getLastRow() <= 1) return [];
  var data=h.getRange(2,1,h.getLastRow()-1,Math.max(20,h.getLastColumn())).getValues();
  var out=[];
  data.forEach(function(f){
    if (!f[0] || V48725_DIAG_norm_(f[11]) !== "PENDIENTE") return;
    out.push({
      clave:String(f[0]), fecha:f[1], tipo:V48725_DIAG_norm_(f[2]), ticket:String(f[3]||""),
      numeroDocumento:V48725_DIAG_doc_(f[4]), cliente:String(f[5]||""), codigoPedido:String(f[6]||""),
      codigoLiquidacion:String(f[7]||""), tipoPartida:String(f[8]||""), cuadrillaEjecutora:V48725_DIAG_cuad_(f[9]),
      sedeEjecutora:V48725_DIAG_norm_(f[10])
    });
  });
  return out;
}

function V48725_DIAG_detectar_(inc,win) {
  if (inc.tipo !== "GAR" && inc.tipo !== "VTR") return {fuente:"WIN",segura:false,propuesta:"REVISION MANUAL",motivo:"Tipo no reconocido"};
  if (!inc.numeroDocumento) return {fuente:"WIN",segura:false,propuesta:"REVISION MANUAL",motivo:"Sin DNI"};
  var fechaInc=V48725_DIAG_fecha_(inc.fecha);
  var lista=win.porDni[inc.numeroDocumento]||[];
  var candidatos=[];
  lista.forEach(function(x){
    var momento=V48725_DIAG_momentoTrabajo_(x);
    var dias=V48725_DIAG_dias_(momento,fechaInc);
    if (dias == null || dias < 1 || dias > 30) return;
    var clase=V48725_DIAG_clase_(x);
    if (inc.tipo === "GAR" && clase !== "INSTALACION") return;
    if (inc.tipo === "VTR" && clase !== "SERVICIO") return;
    candidatos.push({x:x,momento:momento,dias:dias});
  });
  if (!candidatos.length) return {fuente:"WIN",segura:false,propuesta:"REVISION MANUAL",motivo:"Sin antecedente WIN FINALIZADO compatible entre 1 y 30 dias"};
  candidatos.sort(function(a,b){return b.momento.getTime()-a.momento.getTime();});
  var max=candidatos[0].momento.getTime();
  var mejores=candidatos.filter(function(c){return c.momento.getTime()===max;});
  var cuadrillas={};
  mejores.forEach(function(c){if(c.x.cuadrilla)cuadrillas[c.x.cuadrilla]=true;});
  var cs=Object.keys(cuadrillas);
  if (cs.length !== 1) return {fuente:"WIN",segura:false,propuesta:"REVISION MANUAL",motivo:"Empate de cuadrillas en el antecedente WIN mas reciente"};
  var e=mejores.filter(function(c){return c.x.cuadrilla===cs[0];})[0]||candidatos[0];
  var propia=V48725_DIAG_cuad_(inc.cuadrillaEjecutora)===V48725_DIAG_cuad_(e.x.cuadrilla);
  return {
    fuente:"WIN", segura:true, propuesta:propia?"PROPIA":"ASIGNADA", cuadrillaOrigen:e.x.cuadrilla,
    ordenIdOrigen:e.x.ordenId, codigoClienteOrigen:e.x.codigoCliente, fechaHoraOrigen:V48725_DIAG_visible_(e.momento),
    fechaOrigenISO:V48725_DIAG_iso_(e.momento), tipoTrabajoOrigen:e.x.tipoTrabajo,
    motivoFinalizacionOrigen:e.x.motivoFinalizacion, diasTranscurridos:e.dias,
    decisionSugerida:propia?"CORRESPONDE":"REASIGNAR"
  };
}

function EJECUTAR_DIAGNOSTICO_V48725_SOLO_LECTURA() {
  var win=V48725_DIAG_leerWin_();
  var pendientes=V48725_DIAG_leerPendientes_();
  var ejemplos=pendientes.map(function(x){
    return {ticket:x.ticket,tipo:x.tipo,dni:x.numeroDocumento,ejecutora:x.cuadrillaEjecutora,deteccionWin:V48725_DIAG_detectar_(x,win)};
  });
  var conteo={PROPIA:0,ASIGNADA:0,"REVISION MANUAL":0};
  ejemplos.forEach(function(x){var p=x.deteccionWin.propuesta||"REVISION MANUAL";conteo[p]=(conteo[p]||0)+1;});
  var esperados=[
    {ticket:"VTR-46128271",propuesta:"PROPIA",cuadrilla:"P1 VISUAL SGI ELVI RONALD ATARAMA HERNANDEZ"},
    {ticket:"GAR-46249523",propuesta:"ASIGNADA",cuadrilla:"P4 VISUAL SGI CESAR AUGUSTO INGOL RODRIGUEZ"},
    {ticket:"VTR-46866989",propuesta:"REVISION MANUAL",cuadrilla:""}
  ];
  var controles=esperados.map(function(e){
    var r=ejemplos.filter(function(x){return V48725_DIAG_norm_(x.ticket)===V48725_DIAG_norm_(e.ticket);})[0];
    var ok=!!r && r.deteccionWin.propuesta===e.propuesta && (!e.cuadrilla || V48725_DIAG_cuad_(r.deteccionWin.cuadrillaOrigen)===V48725_DIAG_cuad_(e.cuadrilla));
    return {ticket:e.ticket,esperado:e.propuesta,obtenido:r?r.deteccionWin.propuesta:"NO ENCONTRADO",cuadrillaObtenida:r?(r.deteccionWin.cuadrillaOrigen||""):"",ok:ok};
  });
  var salida={
    ok:true, version:"V487.25-DIAGNOSTICO-WIN-SOLO-LECTURA", modo:"SOLO_LECTURA",
    hojasLeidas:["MAPA_ORDENES","BASE_VTR_GAR_DETECTADA"], ordenesWinUnicas:win.ordenesUnicas,
    pendientesVtrGar:pendientes.length, propuestas:conteo, controles:controles,
    primeros25:ejemplos.slice(0,25),
    seguridad:{escribeHojas:false,recalculaIndicadores:false,modificaRecableados:false,redefineFuncionesVigentes:false,partnerUsado:false}
  };
  var texto=JSON.stringify(salida,null,2);
  console.log(texto);
  Logger.log(texto);
  return salida;
}
