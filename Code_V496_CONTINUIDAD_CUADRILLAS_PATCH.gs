/* ============================================================
   MI VISUAL V496 - CONTINUIDAD / CAMBIO DE CUADRILLA
   Fecha: 26/08/2026

   REGLA:
   - El historico original NO se reescribe.
   - La nueva identidad visual consolida la cuadrilla anterior + la nueva.
   - La regla aplica desde el MES de la fecha efectiva.
   - Los meses cerrados anteriores conservan la identidad historica.
   - Al registrar una continuidad se actualiza SOLO el catalogo vigente
     USUARIOS (columna Cuadrilla). Los logins no cambian.
   - La gestion solo la puede ejecutar JEFATURA / JEFATURA GENERAL y,
     ademas, requiere el permiso dinamico CONTINUIDAD CUADRILLAS /
     ADMINISTRAR.
   - Dashboard y Ranking reciben la identidad consolidada.
   - No modifica las fuentes historicas de Produccion, Efectividad,
     Recableado, VTR/GAR, Observaciones ni SLA.
============================================================ */

var MV496_VERSION_ = "V496-CONTINUIDAD-CUADRILLAS-20260826";
var MV496_HOJA_ = "CONTINUIDAD_CUADRILLAS";
var MV496_MODULO_PERMISO_ = "CONTINUIDAD CUADRILLAS";

function mv496Norm_(v) { return normalizarTexto(v || ""); }
function mv496Cuadrilla_(v) { return normalizarCuadrilla(v || "").toUpperCase(); }
function mv496Fecha_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var t = String(v || "").trim(); if (!t) return null;
  var m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) { var iso = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(iso.getTime()) ? null : iso; }
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { var lat = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); return isNaN(lat.getTime()) ? null : lat; }
  var d = new Date(t); return isNaN(d.getTime()) ? null : d;
}
function mv496FechaVisible_(v) { var d = mv496Fecha_(v); return d ? Utilities.formatDate(d, "America/Lima", "dd/MM/yyyy") : ""; }
function mv496Periodo_(v) {
  var d = mv496Fecha_(v); if (d) return Utilities.formatDate(d, "America/Lima", "yyyy-MM");
  var t = String(v || "").trim(), m = t.match(/^(\d{4})-(\d{2})/); return m ? m[1] + "-" + m[2] : "";
}
function mv496Numero_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
function mv496Clonar_(v) { if (v === null || v === undefined) return v; try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; } }

function mv496AsegurarHoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName(MV496_HOJA_);
  if (!h) {
    h = ss.insertSheet(MV496_HOJA_);
    h.getRange(1, 1, 1, 8).setValues([["ID","CUADRILLA_ANTERIOR","CUADRILLA_NUEVA","FECHA_EFECTIVA","MOTIVO","ESTADO","CREADO_POR","FECHA_REGISTRO"]]);
    h.setFrozenRows(1);
  }
  return h;
}
function mv496LeerContinuidades_() {
  var h = mv496AsegurarHoja_(), lr = h.getLastRow(); if (lr <= 1) return [];
  return h.getRange(2, 1, lr - 1, 8).getValues().map(function(fila, i) {
    return {fila:i+2,id:String(fila[0]||""),cuadrillaAnterior:mv496Cuadrilla_(fila[1]),cuadrillaNueva:mv496Cuadrilla_(fila[2]),fechaEfectiva:mv496FechaVisible_(fila[3]),motivo:String(fila[4]||""),estado:mv496Norm_(fila[5]||"ACTIVO"),creadoPor:String(fila[6]||""),fechaRegistro:mv496FechaVisible_(fila[7])};
  }).filter(function(x){ return x.cuadrillaAnterior && x.cuadrillaNueva; });
}
function mv496ReglasAplicables_(periodo) {
  var p = mv496Periodo_(periodo) || Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM");
  return mv496LeerContinuidades_().filter(function(r){ var pe=mv496Periodo_(r.fechaEfectiva); return r.estado==="ACTIVO" && (!pe || pe<=p); });
}
function mv496Canon_(nombre, reglas) {
  var actual=mv496Cuadrilla_(nombre), vistos={};
  while(actual && !vistos[actual]) { vistos[actual]=true; var sig=""; for(var i=0;i<reglas.length;i++){ if(mv496Cuadrilla_(reglas[i].cuadrillaAnterior)===actual){sig=mv496Cuadrilla_(reglas[i].cuadrillaNueva);break;} } if(!sig)break; actual=sig; }
  return actual;
}

function mv496UsuarioPuedeAdministrar_(usuarioTexto) {
  var u=obtenerUsuarioApp(usuarioTexto), perfil=mv496Norm_(u.perfil);
  if(perfil!=="JEFATURA" && perfil!=="JEFATURA GENERAL") throw new Error("Solo Jefatura puede administrar la continuidad de cuadrillas.");
  var h=obtenerHoja("PERMISOS_MODULOS"), datos=h.getDataRange().getValues(), cab=datos[0].map(function(x){return mv496Norm_(x);});
  function col(n){return cab.indexOf(mv496Norm_(n));}
  var cp=col("PERFIL"), cm=col("MODULO"), ca=col("ACTIVO"), cad=col("ADMINISTRAR");
  if(cp<0||cm<0||ca<0||cad<0) throw new Error("PERMISOS_MODULOS no tiene la estructura necesaria para Continuidad.");
  for(var i=1;i<datos.length;i++) if(mv496Norm_(datos[i][cp])===perfil && mv496Norm_(datos[i][cm])===MV496_MODULO_PERMISO_) {
    if(mv496Norm_(datos[i][ca])!=="SI" || mv496Norm_(datos[i][cad])!=="SI") throw new Error("Jefatura no tiene habilitado ADMINISTRAR en Continuidad Cuadrillas.");
    return u;
  }
  throw new Error("No existe permiso CONTINUIDAD CUADRILLAS para este perfil.");
}

function mv496ActualizarUsuarios_(anterior,nueva){
  var h=obtenerHoja(HOJA_USUARIOS), datos=h.getDataRange().getValues(); if(!datos.length)return 0;
  var cab=datos[0].map(function(x){return mv496Norm_(x);}), c=cab.indexOf("CUADRILLA"); if(c<0)throw new Error("USUARIOS no tiene la columna Cuadrilla.");
  var cambios=0; for(var i=1;i<datos.length;i++) if(mv496Cuadrilla_(datos[i][c])===anterior){h.getRange(i+1,c+1).setValue(nueva);cambios++;} return cambios;
}

function listarContinuidadCuadrillas(data){ obtenerUsuarioApp((data&&data.usuario)||""); return {ok:true,modulo:"CONTINUIDAD_CUADRILLAS",version:MV496_VERSION_,lista:mv496LeerContinuidades_()}; }
function mv496ValidaSinCiclo_(anterior,nueva,reglas){
  var actual=nueva,vistos={}; vistos[anterior]=true;
  for(var n=0;n<50;n++){ if(!actual)return true; if(vistos[actual])throw new Error("La continuidad generaria un ciclo entre cuadrillas."); vistos[actual]=true; var sig=""; for(var i=0;i<reglas.length;i++) if(reglas[i].estado==="ACTIVO"&&mv496Cuadrilla_(reglas[i].cuadrillaAnterior)===actual){sig=mv496Cuadrilla_(reglas[i].cuadrillaNueva);break;} if(!sig)return true; actual=sig; }
  throw new Error("La cadena de continuidad es demasiado extensa.");
}
function guardarContinuidadCuadrilla(data){
  data=data||{}; var usuario=mv496UsuarioPuedeAdministrar_(data.usuario||""), anterior=mv496Cuadrilla_(data.cuadrillaAnterior), nueva=mv496Cuadrilla_(data.cuadrillaNueva), fecha=mv496Fecha_(data.fechaEfectiva), motivo=String(data.motivo||"CAMBIO DE NOMENCLATURA / CONTINUIDAD").trim();
  if(!anterior||!nueva)throw new Error("Debe indicar cuadrilla anterior y cuadrilla nueva."); if(anterior===nueva)throw new Error("La cuadrilla anterior y la nueva no pueden ser iguales."); if(!fecha)throw new Error("La fecha efectiva no es valida.");
  var existentes=mv496LeerContinuidades_();
  for(var i=0;i<existentes.length;i++){var r=existentes[i];if(r.estado==="ACTIVO"&&mv496Cuadrilla_(r.cuadrillaAnterior)===anterior&&mv496Cuadrilla_(r.cuadrillaNueva)===nueva&&mv496FechaVisible_(r.fechaEfectiva)===mv496FechaVisible_(fecha)){var ue=mv496ActualizarUsuarios_(anterior,nueva);SpreadsheetApp.flush();return {ok:true,modulo:"CONTINUIDAD_CUADRILLAS",version:MV496_VERSION_,yaExistia:true,id:r.id,usuariosActualizados:ue};}}
  mv496ValidaSinCiclo_(anterior,nueva,existentes); var ahora=new Date(), id="CONT-"+Utilities.formatDate(ahora,"America/Lima","yyyyMMdd-HHmmss");
  mv496AsegurarHoja_().appendRow([id,anterior,nueva,fecha,motivo,"ACTIVO",usuario.usuario||data.usuario||"JEFATURA",ahora]); var ua=mv496ActualizarUsuarios_(anterior,nueva); SpreadsheetApp.flush();
  return {ok:true,modulo:"CONTINUIDAD_CUADRILLAS",version:MV496_VERSION_,id:id,cuadrillaAnterior:anterior,cuadrillaNueva:nueva,fechaEfectiva:mv496FechaVisible_(fecha),usuariosActualizados:ua};
}

var MV496_doGetBase_=doGet;
doGet=function(e){var p={};try{p=parametrosGetMiVisual_(e);}catch(_){p=Object.assign({},e&&e.parameter?e.parameter:{});}if(p&&p.accion==="listarContinuidadCuadrillas"){try{return respuestaJson(listarContinuidadCuadrillas(p));}catch(error){return respuestaJson({ok:false,modulo:"CONTINUIDAD_CUADRILLAS",error:error&&error.message?error.message:String(error)});}}return MV496_doGetBase_(e);};
function mv496PostData_(e){var data=Object.assign({},e&&e.parameter?e.parameter:{});if(e&&e.postData&&e.postData.contents){try{var body=JSON.parse(e.postData.contents);Object.keys(body||{}).forEach(function(k){data[k]=body[k];});}catch(_){}}return data;}
var MV496_doPostBase_=doPost;
doPost=function(e){var data=mv496PostData_(e);if(data&&data.accion==="guardarContinuidadCuadrilla"){try{return respuestaJson(guardarContinuidadCuadrilla(data));}catch(error){return respuestaJson({ok:false,modulo:"CONTINUIDAD_CUADRILLAS",error:error&&error.message?error.message:String(error)});}}return MV496_doPostBase_(e);};

function mv496SumarObjeto_(a,b){var out=mv496Clonar_(a||{})||{},src=b||{};Object.keys(src).forEach(function(k){var vb=src[k],va=out[k];if(typeof vb==="number"&&isFinite(vb)){out[k]=mv496Numero_(va)+vb;return;}if(vb&&typeof vb==="object"&&!Array.isArray(vb)&&!(vb instanceof Date)){out[k]=mv496SumarObjeto_(va&&typeof va==="object"?va:{},vb);return;}if(va===undefined||va===null||va==="")out[k]=vb;});return out;}
function mv496SumarProduccion_(a,b,nombre){a=a||{};b=b||{};return {usuario:b.usuario||a.usuario||"ADMIN",produccion:mv496Numero_(a.produccion)+mv496Numero_(b.produccion),ordenes:mv496Numero_(a.ordenes)+mv496Numero_(b.ordenes),detalle:mv496SumarObjeto_(a.detalle||{},b.detalle||{})};}
function mv496SumarEfectividad_(a,b,nombre){a=a||{};b=b||{};var o={usuario:b.usuario||a.usuario||"ADMIN",fecha:b.fecha||a.fecha||"",finalizadas:mv496Numero_(a.finalizadas)+mv496Numero_(b.finalizadas),canceladas:mv496Numero_(a.canceladas)+mv496Numero_(b.canceladas),regestion:mv496Numero_(a.regestion)+mv496Numero_(b.regestion),reprogramadas:mv496Numero_(a.reprogramadas)+mv496Numero_(b.reprogramadas),total:mv496Numero_(a.total)+mv496Numero_(b.total)};o.efectividad=o.total>0?o.finalizadas/o.total:0;return o;}
function mv496SumarRecableado_(a,b,nombre){a=a||{};b=b||{};var los=mv496Numero_(a.los!==undefined?a.los:a.rojoAsignadas)+mv496Numero_(b.los!==undefined?b.los:b.rojoAsignadas),rec=mv496Numero_(a.recableados)+mv496Numero_(b.recableados);return {los:los,rojoAsignadas:los,recableados:rec,porcentaje:los>0?rec/los:0,porcentajeRecableado:los>0?rec/los:0};}
function mv496SumarVtrGar_(a,b,nombre){a=a||{};b=b||{};var f=mv496Numero_(a.finalizadas)+mv496Numero_(b.finalizadas),g=mv496Numero_(a.gar)+mv496Numero_(b.gar),v=mv496Numero_(a.vtr)+mv496Numero_(b.vtr),t=mv496Numero_(a.totalGarVtr!==undefined?a.totalGarVtr:a.total)+mv496Numero_(b.totalGarVtr!==undefined?b.totalGarVtr:b.total);return {finalizadas:f,gar:g,vtr:v,total:t,totalGarVtr:t,porcentaje:f>0?t/f:0,porcentajeVtrGar:f>0?t/f:0};}
function mv496SumarObservaciones_(a,b,nombre){a=a||{};b=b||{};var o=mv496SumarObjeto_(a,b);o.observaciones=mv496Numero_(a.observaciones!==undefined?a.observaciones:a.total)+mv496Numero_(b.observaciones!==undefined?b.observaciones:b.total);o.total=mv496Numero_(a.total!==undefined?a.total:a.observaciones)+mv496Numero_(b.total!==undefined?b.total:b.observaciones);o.montoTotal=mv496Numero_(a.montoTotal)+mv496Numero_(b.montoTotal);o.montoPendiente=mv496Numero_(a.montoPendiente)+mv496Numero_(b.montoPendiente);o.montoAfectado=mv496Numero_(a.montoAfectado)+mv496Numero_(b.montoAfectado);return o;}
function mv496ConsolidarMapa_(mapa,corte,sumar){var reglas=mv496ReglasAplicables_(corte);if(!reglas.length)return mapa||{};var salida={};Object.keys(mapa||{}).forEach(function(nombre){var c=mv496Canon_(nombre,reglas)||mv496Cuadrilla_(nombre),v=mapa[nombre];salida[c]=salida[c]?sumar(salida[c],v,c):mv496Clonar_(v);});return salida;}
function mv496SumarSla_(a,b,nombre){var o=nuevoResumenSlaCuadrillaV363_(nombre);o=mv496SumarObjeto_(o,a||{});o=mv496SumarObjeto_(o,b||{});o.cuadrilla=nombre;return finalizarResumenSlaCuadrillaV363_(o);}

var MV496_actualizarRankingBase_=actualizarRanking;
actualizarRanking=function(periodoManual,actualizadoAlManual,omitirResumenObservaciones){
  var pBase=obtenerProduccionPorCuadrilla,eBase=obtenerEfectividadPorCuadrilla,rBase=obtenerRecableadoPorCuadrilla,oBase=obtenerResumenObservacionesPorCuadrilla,slaBase=typeof asegurarSlaOrdenesResumenV363_==="function"?asegurarSlaOrdenesResumenV363_:null,mv493Base=typeof mv493VtrGarPropiasRankingPorCuadrilla_==="function"?mv493VtrGarPropiasRankingPorCuadrilla_:null,vtrNormalBase=typeof obtenerVtrGarPorCuadrilla==="function"?obtenerVtrGarPorCuadrilla:null;
  try{
    obtenerProduccionPorCuadrilla=function(c){return mv496ConsolidarMapa_(pBase(c),c,mv496SumarProduccion_);};
    obtenerEfectividadPorCuadrilla=function(c){return mv496ConsolidarMapa_(eBase(c),c,mv496SumarEfectividad_);};
    obtenerRecableadoPorCuadrilla=function(c){return mv496ConsolidarMapa_(rBase(c),c,mv496SumarRecableado_);};
    obtenerResumenObservacionesPorCuadrilla=function(c){return mv496ConsolidarMapa_(oBase(c),c,mv496SumarObservaciones_);};
    if(mv493Base){mv493VtrGarPropiasRankingPorCuadrilla_=function(c){return mv496ConsolidarMapa_(mv493Base(c),c,mv496SumarVtrGar_);};}else if(vtrNormalBase){obtenerVtrGarPorCuadrilla=function(c){return mv496ConsolidarMapa_(vtrNormalBase(c),c,mv496SumarVtrGar_);};}
    if(slaBase){asegurarSlaOrdenesResumenV363_=function(periodo,forzar){var info=slaBase(periodo,forzar);if(info&&info.mapaCuadrillas&&typeof info.mapaCuadrillas==="object")info.mapaCuadrillas=mv496ConsolidarMapa_(info.mapaCuadrillas,periodo,mv496SumarSla_);return info;};}
    var resultado=MV496_actualizarRankingBase_(periodoManual,actualizadoAlManual,omitirResumenObservaciones);if(resultado&&typeof resultado==="object"){resultado.versionContinuidad=MV496_VERSION_;resultado.continuidadCuadrillas=true;}return resultado;
  }finally{obtenerProduccionPorCuadrilla=pBase;obtenerEfectividadPorCuadrilla=eBase;obtenerRecableadoPorCuadrilla=rBase;obtenerResumenObservacionesPorCuadrilla=oBase;if(mv493Base)mv493VtrGarPropiasRankingPorCuadrilla_=mv493Base;if(vtrNormalBase)obtenerVtrGarPorCuadrilla=vtrNormalBase;if(slaBase)asegurarSlaOrdenesResumenV363_=slaBase;}
};

function mv496SumarDashboardGrupo_(grupo,canon){
  var primaria=null;for(var i=0;i<grupo.length;i++)if(mv496Cuadrilla_(grupo[i].cuadrilla)===canon){primaria=grupo[i];break;}if(!primaria)primaria=grupo[0]||{};var out=mv496Clonar_(primaria)||{};out.cuadrilla=canon;
  out.produccion=grupo.reduce(function(s,x){return s+mv496Numero_(x.produccion);},0);
  var e={finalizadas:0,canceladas:0,regestion:0,reprogramadas:0,total:0,efectividad:0};grupo.forEach(function(x){var d=x.detEfectividad||{};e.finalizadas+=mv496Numero_(d.finalizadas);e.canceladas+=mv496Numero_(d.canceladas);e.regestion+=mv496Numero_(d.regestion);e.reprogramadas+=mv496Numero_(d.reprogramadas);e.total+=mv496Numero_(d.total);});e.efectividad=e.total>0?e.finalizadas/e.total*100:0;out.detEfectividad=e;out.efectividad=e.efectividad;
  var r={los:0,rojoAsignadas:0,recableados:0,porcentaje:0,porcentajeRecableado:0};grupo.forEach(function(x){var d=x.detRecableado||{};r.los+=mv496Numero_(d.los!==undefined?d.los:d.rojoAsignadas);r.recableados+=mv496Numero_(d.recableados);});r.rojoAsignadas=r.los;r.porcentaje=r.los>0?r.recableados/r.los*100:0;r.porcentajeRecableado=r.porcentaje;out.detRecableado=r;out.recableado=r.porcentaje;
  var v={finalizadas:0,gar:0,vtr:0,total:0,totalGarVtr:0,porcentaje:0,porcentajeVtrGar:0};grupo.forEach(function(x){var d=x.detVtrGar||{};v.finalizadas+=mv496Numero_(d.finalizadas);v.gar+=mv496Numero_(d.gar);v.vtr+=mv496Numero_(d.vtr);v.total+=mv496Numero_(d.total!==undefined?d.total:d.totalGarVtr);});v.totalGarVtr=v.total;v.porcentaje=v.finalizadas>0?v.total/v.finalizadas*100:0;v.porcentajeVtrGar=v.porcentaje;out.detVtrGar=v;out.vtrgar=v.porcentaje;
  var o={total:0,pendientes:0,montoTotal:0,montoPendiente:0,montoAfectado:0,estados:{}};grupo.forEach(function(x){var d=x.detObservaciones||{};o.total+=mv496Numero_(d.total!==undefined?d.total:x.observaciones);o.pendientes+=mv496Numero_(d.pendientes);o.montoTotal+=mv496Numero_(d.montoTotal!==undefined?d.montoTotal:(x.montoTotalObs!==undefined?x.montoTotalObs:x.montoTotalObservaciones));o.montoPendiente+=mv496Numero_(d.montoPendiente!==undefined?d.montoPendiente:(x.montoAfectadoObs!==undefined?x.montoAfectadoObs:x.montoAfectadoObservaciones));o.montoAfectado+=mv496Numero_(d.montoAfectado!==undefined?d.montoAfectado:(d.montoPendiente!==undefined?d.montoPendiente:(x.montoAfectadoObs!==undefined?x.montoAfectadoObs:x.montoAfectadoObservaciones)));o.estados=mv496SumarObjeto_(o.estados,d.estados||{});});out.detObservaciones=o;out.observaciones=o.total;out.montoTotalObs=o.montoTotal;out.montoTotalObservaciones=o.montoTotal;out.montoAfectadoObs=o.montoAfectado;out.montoAfectadoObservaciones=o.montoAfectado;
  var obsWin={total:0,penalizadas:0,montoPenalizado:0};grupo.forEach(function(x){var w=x.mv361ObservacionesWin||{};obsWin.total+=mv496Numero_(w.total);obsWin.penalizadas+=mv496Numero_(w.penalizadas);obsWin.montoPenalizado+=mv496Numero_(w.montoPenalizado);});out.mv361ObservacionesWin=obsWin;
  var diarios=grupo.map(function(x){return x.mv353CumplimientoDia;}).filter(Boolean);if(diarios.length){var dt={};diarios.forEach(function(d){dt=mv496SumarObjeto_(dt,d);});out.mv353CumplimientoDia=dt;}
  var ds=grupo.map(function(x){return x.detSla;}).filter(Boolean);if(ds.length){var sla=nuevoResumenSlaCuadrillaV363_(canon);ds.forEach(function(s){sla=mv496SumarObjeto_(sla,s);});sla.cuadrilla=canon;sla=finalizarResumenSlaCuadrillaV363_(sla);out.detSla=sla;out.slaBruto=mv496Numero_(sla.slaBruto);out.slaAjustado=mv496Numero_(sla.slaAjustado);out.slaEvaluables=mv496Numero_(sla.evaluables);}
  if(!mv496Numero_(out.puntaje)){for(var j=0;j<grupo.length;j++)if(mv496Numero_(grupo[j].puntaje)){out.puntaje=mv496Numero_(grupo[j].puntaje);out.puestoSede=mv496Numero_(grupo[j].puestoSede);out.puestoRegion=mv496Numero_(grupo[j].puestoRegion);out.puestoPlataforma=mv496Numero_(grupo[j].puestoPlataforma);break;}}
  out.mv496Continuidad={vigente:true,cuadrillaVisible:canon,origenes:grupo.map(function(x){return x.cuadrilla;})};return out;
}
function mv496ConsolidarListaDashboard_(lista,periodo){var reglas=mv496ReglasAplicables_(periodo);if(!reglas.length)return lista||[];var grupos={};(lista||[]).forEach(function(item){var c=mv496Canon_(item.cuadrilla,reglas)||mv496Cuadrilla_(item.cuadrilla);if(!grupos[c])grupos[c]=[];grupos[c].push(item);});return Object.keys(grupos).sort().map(function(c){return mv496SumarDashboardGrupo_(grupos[c],c);});}
var MV496_resumenDashboardBase_=obtenerResumenDashboardRankingV361;
obtenerResumenDashboardRankingV361=function(data){var resultado=MV496_resumenDashboardBase_(data);if(resultado&&resultado.ok===true&&Array.isArray(resultado.lista)){var periodo=resultado.periodo||(data&&data.periodo)||resultado.actualizadoAl||new Date();resultado.lista=mv496ConsolidarListaDashboard_(resultado.lista,periodo);resultado.cuadrillasEsperadas=resultado.lista.length;resultado.continuidadCuadrillas=true;resultado.versionContinuidad=MV496_VERSION_;}return resultado;};

function DIAGNOSTICO_V496_CONTINUIDAD_CUADRILLAS(){var reglas=mv496LeerContinuidades_();return {ok:true,version:MV496_VERSION_,soloLectura:true,reglas:reglas,usuariosP13:obtenerHoja(HOJA_USUARIOS).getDataRange().getValues().filter(function(f,i){return i>0&&mv496Cuadrilla_(f[3])==="P13 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA";}).length};}
