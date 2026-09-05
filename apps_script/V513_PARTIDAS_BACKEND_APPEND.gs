/* =====================================================================
   MI VISUAL V513 - PARTIDAS WIN / REGLAS / BUSCADOR / CUADRILLA EFECTIVA
   Fecha: 05/09/2026

   PRINCIPIOS
   - WIN/MAPA_ORDENES conserva OrdenId, estado, fecha y registro original.
   - Partner es evidencia auxiliar; nunca se escribe sobre WIN.
   - AJUSTES_PARTIDA_WIN conserva historial append-only; el último VALIDADO manda.
   - AJUSTES_ORDEN_WIN conserva historial de cuadrilla efectiva.
   - REGLAS_PARTIDA_WIN se usa para proponer/explicar, no para auto-publicar.
   - Partida efectiva consulta CATALOGO_ORDENES y SLA sigue PARAMETROS_SLA_WIN.
   - Desde agosto, SLA usa la misma Partida efectiva V513 que Producción.
   - Cuadrilla efectiva puede afectar Producción/Efectividad/Recableado/SLA,
     pero NO reasigna automáticamente la responsabilidad/origen VTR/GAR.
   - Julio 2026 y anteriores permanecen congelados.
===================================================================== */
var MV513_VERSION_ = "V513-SLA-SYNC-20260905";
var MV513_HOJA_REGLAS_ = "REGLAS_PARTIDA_WIN";
var MV513_HOJA_SIM_ = "SIM_PARTIDAS_V513";
var MV513_HOJA_AJUSTE_CUADRILLA_ = "AJUSTES_ORDEN_WIN";
var MV513_PERIODO_MINIMO_ = "2026-08";
var MV513_SLA_SYNC_VERSION_ = "V513-SLA-SYNC-20260905-1";
var MV513_WRAPPERS_OK_ = false;

function mv513Norm_(v){ return mv487pNorm_(v); }
function mv513Txt_(v){ return mv487pTexto_(v); }
function mv513Id_(v){ return mv487pId_(v); }
function mv513Periodo_(v){ return mv487pPeriodoIso_(v); }
function mv513FechaVisible_(v){
  var d=mv487pFecha_(v);
  return d?Utilities.formatDate(d,"America/Lima","dd/MM/yyyy"):mv513Txt_(v);
}
function mv513ExigirPeriodoEditable_(p){
  p=mv487pValidarPeriodo_(p);
  if(p<MV513_PERIODO_MINIMO_) throw new Error("V513: julio 2026 y periodos anteriores estan congelados.");
  return p;
}
function mv513UsuarioJefatura_(usuarioTexto){
  var u=mv502EsJefaturaAjustes_(usuarioTexto||"");
  var perfil=normalizarTexto(u&&u.perfil||"");
  if(!(esPerfilJefatura(perfil)||perfil==="ADMINISTRADOR"||perfil==="ADMIN")) throw new Error("V513: solo Jefatura/Administracion autorizada puede gestionar Partidas.");
  return u;
}
function mv513Idx_(cab,nombres){
  for(var i=0;i<nombres.length;i++){
    var k=mv487pClaveCabecera_(nombres[i]);
    if(cab[k]!==undefined) return cab[k];
  }
  return -1;
}
function mv513Valor_(fila,idx){ return idx>=0?fila[idx]:""; }

function mv513LeerWinCompleto_(){
  var h=SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MAPA_ORDENES");
  if(!h||h.getLastRow()<=1) return [];
  var d=h.getDataRange().getValues(), cab={};
  (d[0]||[]).forEach(function(x,i){cab[mv487pClaveCabecera_(x)]=i;});
  var I={
    orden:mv513Idx_(cab,["ORDEN_ID","ORDER_ID"]),tipoTrabajo:mv513Idx_(cab,["TIPO_TRABAJO"]),fechaSolicitud:mv513Idx_(cab,["FECHA_SOLICITUD"]),cliente:mv513Idx_(cab,["CLIENTE"]),tipo:mv513Idx_(cab,["TIPO"]),productoOrigen:mv513Idx_(cab,["PRODUCTO_ORIGEN"]),cuadrilla:mv513Idx_(cab,["CUADRILLA"]),estado:mv513Idx_(cab,["ESTADO"]),direccion:mv513Idx_(cab,["DIRECCION"]),direccionAdicional:mv513Idx_(cab,["DIRECCION_ADICIONAL"]),fechaUltimo:mv513Idx_(cab,["FECHA_ULTIMO_ESTADO"]),productoServicio:mv513Idx_(cab,["PRODUCTO_SERVICIO"]),region:mv513Idx_(cab,["REGION","SEDE"]),codigoCliente:mv513Idx_(cab,["CODIGO_CLIENTE","CODIGO_PEDIDO"]),dni:mv513Idx_(cab,["NUMERO_DOCUMENTO","DNI"]),fechaFin:mv513Idx_(cab,["FECHA_FIN_VISITA"]),fechaInicio:mv513Idx_(cab,["FECHA_INICIO_VISITA"]),motivoFinalizacion:mv513Idx_(cab,["MOTIVO_FINALIZACION"]),detalle:mv513Idx_(cab,["DETALLE"]),codigoSeguimiento:mv513Idx_(cab,["CODIGO_SEGUIMIENTO"]),fechaImportacion:mv513Idx_(cab,["FECHA_IMPORTACION"])
  };
  var porOrden={};
  for(var r=1;r<d.length;r++){
    var f=d[r], id=mv513Id_(mv513Valor_(f,I.orden)); if(!id) continue;
    var fs=mv487pFecha_(mv513Valor_(f,I.fechaSolicitud)), fu=mv487pFecha_(mv513Valor_(f,I.fechaUltimo)), ff=mv487pFecha_(mv513Valor_(f,I.fechaFin));
    var fecha=ff||fu||fs, imp=mv487pFecha_(mv513Valor_(f,I.fechaImportacion));
    var item={
      ordenId:id,fecha:fecha,fechaISO:fecha?Utilities.formatDate(fecha,"America/Lima","yyyy-MM-dd"):"",periodo:mv513Periodo_(fecha),
      tipoTrabajo:mv513Txt_(mv513Valor_(f,I.tipoTrabajo)),cliente:mv513Txt_(mv513Valor_(f,I.cliente)),tipo:mv513Txt_(mv513Valor_(f,I.tipo)),productoOrigen:mv513Txt_(mv513Valor_(f,I.productoOrigen)),productoServicio:mv513Txt_(mv513Valor_(f,I.productoServicio)),
      cuadrilla:normalizarCuadrilla(mv513Valor_(f,I.cuadrilla)),estado:normalizarTexto(mv513Valor_(f,I.estado)),region:normalizarTexto(mv513Valor_(f,I.region)),direccion:mv513Txt_(mv513Valor_(f,I.direccion)),direccionAdicional:mv513Txt_(mv513Valor_(f,I.direccionAdicional)),
      codigoPedido:mv513Txt_(mv513Valor_(f,I.codigoCliente)),numeroDocumento:mv513Txt_(mv513Valor_(f,I.dni)),motivoFinalizacion:mv513Txt_(mv513Valor_(f,I.motivoFinalizacion)),detalle:mv513Txt_(mv513Valor_(f,I.detalle)),codigoSeguimiento:mv513Txt_(mv513Valor_(f,I.codigoSeguimiento)),
      fechaImportacionMs:imp?imp.getTime():0,recencia:(imp||fu||ff||fs||new Date(0)).getTime(),fila:r+1
    };
    var ant=porOrden[id]; if(!ant||item.recencia>=ant.recencia) porOrden[id]=item;
  }
  return Object.keys(porOrden).map(function(k){return porOrden[k];});
}

function mv513Catalogo_(){
  var c=catalogoPartidasBaseOperativa(), mapa={};
  (c.lista||[]).forEach(function(x){var k=mv513Txt_(x.codigo);if(k)mapa[k]=x;});
  return {base:c,mapa:mapa,lista:(c.lista||[]).map(function(x){return {codigo:mv513Txt_(x.codigo),tipoOrden:mv513Txt_(x.tipoOrden||x.tipoPartida||x.descripcion),descripcion:mv513Txt_(x.descripcion||""),puntaje:Number(x.puntaje||0),plataforma:mv513Txt_(x.plataforma||"")};})};
}

function mv513LeerReglas_(){
  var h=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MV513_HOJA_REGLAS_); if(!h||h.getLastRow()<=1)return [];
  var d=h.getDataRange().getValues(),cab={};(d[0]||[]).forEach(function(x,i){cab[mv487pClaveCabecera_(x)]=i;});
  function i(n){return cab[mv487pClaveCabecera_(n)]===undefined?-1:cab[mv487pClaveCabecera_(n)];}
  var I={id:i("ID_REGLA"),nivel:i("NIVEL"),tt:i("TIPO_TRABA_WIN"),mf:i("MOTIVO_FINALIZACION_WIN"),ts:i("TIPO_SERVICIO_WIN"),po:i("PRODUCTO_ORIGEN_WIN"),ps:i("PRODUCTO_SERVICIO_WIN"),codigo:i("CODIGO_PARTIDA"),soporte:i("SOPORTE_HISTORICO"),pureza:i("PUREZA"),origen:i("ORIGEN_APRENDIZAJE"),periodo:i("PERIODO_ENTRENAMIENTO"),estado:i("ESTADO"),desde:i("VIGENCIA_DESDE"),hasta:i("VIGENCIA_HASTA"),aplica:i("APLICA_PRODUCCION"),revision:i("REQUIERE_REVISION"),obs:i("OBSERVACION"),tipoDir:i("TIPO_COINCIDENCIA_DIRECCION"),patDir:i("PATRON_DIRECCION"),patRef:i("PATRON_REFERENCIA"),claseUb:i("CLASIFICACION_UBICACION"),prio:i("PRIORIDAD_REGLA")};
  return d.slice(1).map(function(f){return {idRegla:mv513Txt_(mv513Valor_(f,I.id)),nivel:mv513Txt_(mv513Valor_(f,I.nivel)),tipoTrabaWin:mv513Txt_(mv513Valor_(f,I.tt)),motivoFinalizacionWin:mv513Txt_(mv513Valor_(f,I.mf)),tipoServicioWin:mv513Txt_(mv513Valor_(f,I.ts)),productoOrigenWin:mv513Txt_(mv513Valor_(f,I.po)),productoServicioWin:mv513Txt_(mv513Valor_(f,I.ps)),codigoPartida:mv513Txt_(mv513Valor_(f,I.codigo)),soporteHistorico:Number(mv513Valor_(f,I.soporte)||0),pureza:Number(mv513Valor_(f,I.pureza)||0),origenAprendizaje:mv513Txt_(mv513Valor_(f,I.origen)),periodoEntrenamiento:mv513Txt_(mv513Valor_(f,I.periodo)),estado:normalizarTexto(mv513Valor_(f,I.estado)),vigenciaDesde:mv513Valor_(f,I.desde),vigenciaHasta:mv513Valor_(f,I.hasta),aplicaProduccion:normalizarTexto(mv513Valor_(f,I.aplica)),requiereRevision:normalizarTexto(mv513Valor_(f,I.revision)),observacion:mv513Txt_(mv513Valor_(f,I.obs)),tipoCoincidenciaDireccion:mv513Txt_(mv513Valor_(f,I.tipoDir)),patronDireccion:mv513Txt_(mv513Valor_(f,I.patDir)),patronReferencia:mv513Txt_(mv513Valor_(f,I.patRef)),clasificacionUbicacion:mv513Txt_(mv513Valor_(f,I.claseUb)),prioridadRegla:Number(mv513Valor_(f,I.prio)||0)};}).filter(function(x){return x.idRegla||x.codigoPartida;});
}

function mv513Vigente_(r,periodo){
  var inicio=mv513Periodo_(r.vigenciaDesde)||"",fin=mv513Periodo_(r.vigenciaHasta)||"";
  if(inicio&&periodo<inicio)return false;if(fin&&periodo>fin)return false;return true;
}
function mv513Contiene_(texto,patron){var p=mv513Norm_(patron);return !p||mv513Norm_(texto).indexOf(p)>=0;}
function mv513ReglaDireccion_(o,reglas){
  var texto=[o.direccion,o.direccionAdicional,o.detalle].join(" | "),tipoNorm=mv513Norm_(o.tipo),clase=mv487ClaseServicio_(o.tipo),tt=mv513Norm_(o.tipoTrabajo),candidatas=[];
  (reglas||[]).forEach(function(r){
    if(!r.patronDireccion||!mv513Vigente_(r,o.periodo))return;
    var est=normalizarTexto(r.estado);if(["CANDIDATA","OBSERVACION","AMBIGUA","ACTIVO","REVISAR"].indexOf(est)<0)return;
    if(r.tipoTrabaWin&&tt.indexOf(mv513Norm_(r.tipoTrabaWin))<0)return;
    if(r.tipoServicioWin){var rs=mv513Norm_(r.tipoServicioWin);if(tipoNorm.indexOf(rs)<0&&rs.indexOf(tipoNorm)<0&&clase!==rs&&!(rs.indexOf("CONDOMINIO")>=0&&clase==="CONDOMINIO"))return;}
    if(!mv513Contiene_(texto,r.patronDireccion))return;
    var refs=String(r.patronReferencia||"").split("|").map(function(x){return x.trim();}).filter(Boolean);
    if(refs.length&&!refs.some(function(x){return mv513Contiene_(texto,x);}))return;
    candidatas.push(r);
  });
  candidatas.sort(function(a,b){return (b.prioridadRegla-a.prioridadRegla)||(b.soporteHistorico-a.soporteHistorico);});
  return candidatas[0]||null;
}
function mv513ReglaTecnica_(o,reglas){
  var tt=mv513Norm_(o.tipoTrabajo),mf=mv513Norm_(o.motivoFinalizacion),tipo=mv513Norm_(o.tipo),clase=mv487ClaseServicio_(o.tipo),po=mv513Norm_(o.productoOrigen),ps=mv513Norm_(o.productoServicio),cand=[];
  (reglas||[]).forEach(function(r){
    if(r.patronDireccion||!mv513Vigente_(r,o.periodo)||normalizarTexto(r.estado)!=="ACTIVO")return;
    if(r.tipoTrabaWin&&tt!==mv513Norm_(r.tipoTrabaWin))return;
    if(r.motivoFinalizacionWin&&mf!==mv513Norm_(r.motivoFinalizacionWin))return;
    if(r.tipoServicioWin){var rs=mv513Norm_(r.tipoServicioWin);if(tipo!==rs&&clase!==rs&&tipo.indexOf(rs)<0)return;}
    if(r.productoOrigenWin&&po!==mv513Norm_(r.productoOrigenWin))return;
    if(r.productoServicioWin&&ps!==mv513Norm_(r.productoServicioWin))return;
    cand.push(r);
  });
  cand.sort(function(a,b){return (b.soporteHistorico-a.soporteHistorico)||(b.prioridadRegla-a.prioridadRegla);});return cand[0]||null;
}

function mv513LeerSimulacion_(){
  var h=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MV513_HOJA_SIM_);if(!h||h.getLastRow()<16)return {};
  var d=h.getRange(15,1,h.getLastRow()-14,Math.min(h.getLastColumn(),24)).getValues(),cab={};(d[0]||[]).forEach(function(x,i){cab[mv487pClaveCabecera_(x)]=i;});
  function i(n){return cab[mv487pClaveCabecera_(n)]===undefined?-1:cab[mv487pClaveCabecera_(n)];}
  var I={orden:i("ORDEN_ID"),fecha:i("FECHA"),predio:i("PREDIO_PATRON"),direccion:i("DIRECCION"),pwin:i("PARTIDA_WIN"),ptswin:i("PTS_WIN"),ppar:i("PARTIDA_PARTNER"),ptspar:i("PTS_PARTNER"),prop:i("PROPUESTA_V513"),ptsprop:i("PTS_PROPUESTA"),soporte:i("SOPORTE_HISTORICO"),pureza:i("PUREZA"),estado:i("ESTADO_DRY_RUN"),obs:i("OBSERVACION")};
  var out={};d.slice(1).forEach(function(f){var id=mv513Id_(mv513Valor_(f,I.orden));if(!id)return;out[id]={ordenId:id,fecha:mv513Valor_(f,I.fecha),predioPatron:mv513Txt_(mv513Valor_(f,I.predio)),direccion:mv513Txt_(mv513Valor_(f,I.direccion)),partidaWin:mv513Txt_(mv513Valor_(f,I.pwin)),puntosWin:Number(mv513Valor_(f,I.ptswin)||0),partidaPartner:mv513Txt_(mv513Valor_(f,I.ppar)),puntosPartner:Number(mv513Valor_(f,I.ptspar)||0),partidaPropuesta:mv513Txt_(mv513Valor_(f,I.prop)),puntosPropuesta:Number(mv513Valor_(f,I.ptsprop)||0),soporteHistorico:Number(mv513Valor_(f,I.soporte)||0),pureza:Number(mv513Valor_(f,I.pureza)||0),estadoDryRun:normalizarTexto(mv513Valor_(f,I.estado)),observacion:mv513Txt_(mv513Valor_(f,I.obs))};});return out;
}

function mv513AsegurarAjustesCuadrilla_(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),h=ss.getSheetByName(MV513_HOJA_AJUSTE_CUADRILLA_);
  var cab=["ID","ORDEN_ID","PERIODO","FECHA_ORDEN","CUADRILLA_WIN","CUADRILLA_EFECTIVA","SEDE_WIN","ORIGEN","MOTIVO","ESTADO","VALIDADO_POR","FECHA_VALIDACION","OBSERVACION"];
  if(!h){h=ss.insertSheet(MV513_HOJA_AJUSTE_CUADRILLA_);h.getRange(1,1,1,cab.length).setValues([cab]);h.setFrozenRows(1);}
  else if(h.getLastRow()===0)h.getRange(1,1,1,cab.length).setValues([cab]);
  return h;
}
function mv513LeerAjustesCuadrilla_(periodo){
  var h=mv513AsegurarAjustesCuadrilla_(),out={validados:{},todos:[]};if(h.getLastRow()<=1)return out;
  var d=h.getDataRange().getValues(),cab={};(d[0]||[]).forEach(function(x,i){cab[mv487pClaveCabecera_(x)]=i;});function i(n){return cab[mv487pClaveCabecera_(n)]===undefined?-1:cab[mv487pClaveCabecera_(n)];}
  var I={id:i("ID"),orden:i("ORDEN_ID"),periodo:i("PERIODO"),fecha:i("FECHA_ORDEN"),win:i("CUADRILLA_WIN"),ef:i("CUADRILLA_EFECTIVA"),sede:i("SEDE_WIN"),origen:i("ORIGEN"),motivo:i("MOTIVO"),estado:i("ESTADO"),val:i("VALIDADO_POR"),fval:i("FECHA_VALIDACION"),obs:i("OBSERVACION")};
  d.slice(1).forEach(function(f,ix){var p=mv513Periodo_(mv513Valor_(f,I.periodo))||mv513Periodo_(mv513Valor_(f,I.fecha));if(periodo&&p!==periodo)return;var x={fila:ix+2,id:mv513Txt_(mv513Valor_(f,I.id)),ordenId:mv513Id_(mv513Valor_(f,I.orden)),periodo:p,fechaOrden:mv513Valor_(f,I.fecha),cuadrillaWin:normalizarCuadrilla(mv513Valor_(f,I.win)),cuadrillaEfectiva:normalizarCuadrilla(mv513Valor_(f,I.ef)),sede:normalizarTexto(mv513Valor_(f,I.sede)),origen:mv513Txt_(mv513Valor_(f,I.origen)),motivo:mv513Txt_(mv513Valor_(f,I.motivo)),estado:normalizarTexto(mv513Valor_(f,I.estado)),validadoPor:mv513Txt_(mv513Valor_(f,I.val)),fechaValidacion:mv513Valor_(f,I.fval),observacion:mv513Txt_(mv513Valor_(f,I.obs))};if(!x.ordenId)return;out.todos.push(x);if(x.estado==="VALIDADO"||x.estado==="APROBADO")out.validados[x.ordenId]=x;});return out;
}
function mv513GuardarAjusteCuadrillaFila_(x){
  var h=mv513AsegurarAjustesCuadrilla_(),id="AC-"+Utilities.formatDate(new Date(),"America/Lima","yyyyMMdd-HHmmss-SSS");
  h.appendRow([id,x.ordenId||"",x.periodo||"",x.fechaOrden||"",x.cuadrillaWin||"",x.cuadrillaEfectiva||"",x.sede||"",x.origen||"MANUAL V513",x.motivo||"",x.estado||"VALIDADO",x.validadoPor||"",x.fechaValidacion||new Date(),x.observacion||""]);return id;
}

function mv513PartnerInfo_(partnerPorOrden,ordenId,periodo){
  var p=mv487PartidaPartner_(partnerPorOrden[ordenId],periodo),r=p.representante||{};return {codigo:p.codigos.length===1?p.codigos[0]:"",codigos:p.codigos,cuadrilla:r.cuadrilla||"",sede:r.sede||"",estado:r.estado||""};
}
function mv513EnriquecerOrden_(o,ctx){
  var directa=mv502ClasificacionWinDirecta_(o,ctx.catalogo.mapa),codigoWin=directa&&directa.regla?mv513Txt_(directa.regla.codigo):"",catWin=ctx.catalogo.mapa[codigoWin]||{};
  var par=mv513PartnerInfo_(ctx.partner,o.ordenId,o.periodo),catPar=ctx.catalogo.mapa[par.codigo]||{};
  var ajuste=ctx.ajustesPartida.validados[o.ordenId]||null,ajCuad=ctx.ajustesCuadrilla.validados[o.ordenId]||null;
  var rd=mv513ReglaDireccion_(o,ctx.reglas),rt=mv513ReglaTecnica_(o,ctx.reglas);
  return {ordenId:o.ordenId,fecha:o.fechaISO||mv513FechaVisible_(o.fecha),periodo:o.periodo,sede:o.region,cuadrillaWin:o.cuadrilla,codigoCliente:o.codigoPedido,dni:o.numeroDocumento,cliente:o.cliente,estado:o.estado,tipoWin:o.tipo,tipoTrabajo:o.tipoTrabajo,motivoFinalizacion:o.motivoFinalizacion,productoOrigen:o.productoOrigen,productoServicio:o.productoServicio,direccion:o.direccion,direccionAdicional:o.direccionAdicional,partidaWin:codigoWin,puntosWin:Number(catWin.puntaje||0),partidaPartner:par.codigo,puntosPartner:Number(catPar.puntaje||0),cuadrillaPartner:par.cuadrilla,ajustePartida:ajuste,ajusteCuadrilla:ajCuad,reglaDireccion:rd,reglaTecnica:rt};
}

function mv513Contexto_(periodo){
  var cat=mv513Catalogo_(),win=mv513LeerWinCompleto_(),reglas=mv513LeerReglas_(),partner=mv487PartnerPorOrden_(cat.base),ajP=mv502LeerAjustesPartida_(periodo),ajC=mv513LeerAjustesCuadrilla_(periodo);
  return {catalogo:cat,win:win,reglas:reglas,partner:partner,ajustesPartida:ajP,ajustesCuadrilla:ajC};
}
function mv513Cuadrillas_(){
  var mapa=obtenerMapaUsuarios()||{},lista=[];Object.keys(mapa).forEach(function(c){var n=normalizarCuadrilla(c);if(n&&lista.indexOf(n)<0)lista.push(n);});return lista.sort(function(a,b){return a.localeCompare(b,"es");});
}

function listarPartidasV513(data){
  data=data||{};mv513InstalarWrappers_();var u=mv513UsuarioJefatura_(data.usuario),periodo=mv513ExigirPeriodoEditable_(data.periodo||Utilities.formatDate(new Date(),"America/Lima","yyyy-MM")),ctx=mv513Contexto_(periodo),sim=mv513LeerSimulacion_(),pend=[],vistos={};
  var porOrden={};ctx.win.forEach(function(o){if(o.periodo===periodo)porOrden[o.ordenId]=o;});

  Object.keys(sim).forEach(function(id){
    var s=sim[id],o=porOrden[id];if(!o||o.estado!=="FINALIZADA"||ctx.ajustesPartida.validados[id])return;var e=mv513EnriquecerOrden_(o,ctx);vistos[id]=true;
    e.predioPatron=s.predioPatron;e.direccion=s.direccion||e.direccion;e.partidaWin=s.partidaWin||e.partidaWin;e.puntosWin=s.puntosWin||e.puntosWin;e.partidaPartner=s.partidaPartner||e.partidaPartner;e.puntosPartner=s.puntosPartner||e.puntosPartner;e.partidaPropuesta=s.partidaPropuesta||e.partidaPartner;e.puntosPropuesta=s.puntosPropuesta||e.puntosPartner;e.soporteHistorico=s.soporteHistorico;e.pureza=s.pureza;e.estadoDryRun=s.estadoDryRun;e.observacion=s.observacion;
    if(e.estadoDryRun!=="VALIDADO_EXISTENTE")pend.push(e);
  });

  ctx.win.forEach(function(o){
    if(o.periodo!==periodo||o.estado!=="FINALIZADA"||vistos[o.ordenId]||ctx.ajustesPartida.validados[o.ordenId])return;var e=mv513EnriquecerOrden_(o,ctx),rd=e.reglaDireccion,prop="",estado="",soporte=0,pureza=0,obs="";
    if(rd&&rd.codigoPartida&&rd.codigoPartida!==e.partidaWin){prop=rd.codigoPartida;soporte=rd.soporteHistorico;pureza=rd.pureza;obs=rd.observacion;var re=normalizarTexto(rd.estado);estado=re==="CANDIDATA"&&soporte>=3&&pureza>=1?"CANDIDATA_ALTA":re==="AMBIGUA"?"AMBIGUA":"OBSERVACION";}
    else if(e.partidaPartner&&e.partidaWin&&e.partidaPartner!==e.partidaWin){prop=e.partidaPartner;estado="REVISAR_CON_PARTNER";obs="Partner propone una partida distinta; no existe todavía una regla de dirección suficientemente confiable.";}
    else if(!e.partidaWin&&e.reglaTecnica&&e.reglaTecnica.codigoPartida){prop=e.reglaTecnica.codigoPartida;soporte=e.reglaTecnica.soporteHistorico;pureza=e.reglaTecnica.pureza;estado=soporte>=3&&pureza>=1?"CANDIDATA_ALTA":"OBSERVACION";obs=e.reglaTecnica.observacion||"Coincidencia técnica histórica.";}
    else return;
    var cp=ctx.catalogo.mapa[prop]||{};e.partidaPropuesta=prop;e.puntosPropuesta=Number(cp.puntaje||0);e.estadoDryRun=estado;e.soporteHistorico=soporte;e.pureza=pureza;e.predioPatron=rd?rd.patronDireccion:"";e.observacion=obs;pend.push(e);
  });

  pend.sort(function(a,b){var pr={CANDIDATA_ALTA:1,OBSERVACION:2,AMBIGUA:3,REVISAR_CON_PARTNER:4};return (pr[a.estadoDryRun]||9)-(pr[b.estadoDryRun]||9)||String(a.fecha).localeCompare(String(b.fecha))||String(a.ordenId).localeCompare(String(b.ordenId));});
  var resumen={pendientes:pend.length,candidatasAltas:0,observacion:0,ambiguas:0,revisarPartner:0,validadas:Object.keys(ctx.ajustesPartida.validados).length};
  pend.forEach(function(x){if(x.estadoDryRun==="CANDIDATA_ALTA")resumen.candidatasAltas++;else if(x.estadoDryRun==="OBSERVACION")resumen.observacion++;else if(x.estadoDryRun==="AMBIGUA")resumen.ambiguas++;else if(x.estadoDryRun==="REVISAR_CON_PARTNER")resumen.revisarPartner++;});
  return {ok:true,version:MV513_VERSION_,periodo:periodo,perfil:u.perfil,resumen:resumen,pendientes:pend,validados:Object.keys(ctx.ajustesPartida.validados).map(function(k){return ctx.ajustesPartida.validados[k];}),reglas:ctx.reglas,catalogo:ctx.catalogo.lista,cuadrillas:mv513Cuadrillas_(),regla:"Ajuste validado > regla/cotejo WIN > revisión humana. Partner es evidencia auxiliar."};
}

function buscarOrdenPartidasV513(data){
  data=data||{};mv513InstalarWrappers_();mv513UsuarioJefatura_(data.usuario);var periodo=data.periodo?mv513ExigirPeriodoEditable_(data.periodo):"",q=mv513Norm_(data.busqueda);if(!q)throw new Error("V513: indique OrderId, codigo cliente/pedido o DNI.");var ctx=mv513Contexto_(periodo||Utilities.formatDate(new Date(),"America/Lima","yyyy-MM"));
  var candidatos=ctx.win.filter(function(o){if(o.periodo<MV513_PERIODO_MINIMO_)return false;var texto=mv513Norm_([o.ordenId,o.codigoPedido,o.numeroDocumento,o.cliente].join(" | "));return texto.indexOf(q)>=0;});
  var mismo=candidatos.filter(function(o){return !periodo||o.periodo===periodo;});if(mismo.length)candidatos=mismo;
  candidatos.sort(function(a,b){return String(b.fechaISO).localeCompare(String(a.fechaISO))||String(b.ordenId).localeCompare(String(a.ordenId));});
  var resultados=candidatos.slice(0,30).map(function(o){var local=ctx;if(o.periodo!==periodo){local=mv513Contexto_(o.periodo);}return mv513EnriquecerOrden_(o,local);});
  return {ok:true,version:MV513_VERSION_,busqueda:data.busqueda,periodo:periodo,resultados:resultados,catalogo:ctx.catalogo.lista,cuadrillas:mv513Cuadrillas_()};
}

function mv513BuscarOrdenExacta_(ordenId){var id=mv513Id_(ordenId),lista=mv513LeerWinCompleto_().filter(function(o){return o.ordenId===id;});if(!lista.length)throw new Error("V513: OrdenId no encontrada en MAPA_ORDENES.");return lista[0];}
function mv513PartidaActual_(o,ctx){var a=ctx.ajustesPartida.validados[o.ordenId];if(a&&a.partidaPropuesta)return a.partidaPropuesta;var d=mv502ClasificacionWinDirecta_(o,ctx.catalogo.mapa);return d&&d.regla?mv513Txt_(d.regla.codigo):"";}
function mv513Publicar_(usuario,periodo){return publicarIndicadoresWinV487({usuario:usuario,periodo:periodo,confirmacion:MV487_PUBLICADOR_CONFIRMACION_});}

function guardarAjustePartidaV513(data){
  data=data||{};mv513InstalarWrappers_();var u=mv513UsuarioJefatura_(data.usuario),o=mv513BuscarOrdenExacta_(data.ordenId);if(o.estado!=="FINALIZADA")throw new Error("V513: por seguridad solo se edita Partida de ordenes WIN FINALIZADAS.");var periodo=mv513ExigirPeriodoEditable_(o.periodo),motivo=mv513Txt_(data.motivo);if(!motivo)throw new Error("V513: el motivo/sustento es obligatorio.");var ctx=mv513Contexto_(periodo),nuevo=mv513Txt_(data.partidaPropuesta),catNuevo=ctx.catalogo.mapa[nuevo];if(!nuevo||!catNuevo)throw new Error("V513: la partida propuesta no existe en CATALOGO_ORDENES.");var anterior=mv513PartidaActual_(o,ctx);if(anterior===nuevo)return {ok:true,version:MV513_VERSION_,ordenId:o.ordenId,partidaAnterior:anterior,partidaNueva:nuevo,omitida:true,mensaje:"La orden ya tiene esta Partida efectiva."};
  var directa=mv502ClasificacionWinDirecta_(o,ctx.catalogo.mapa),win=directa&&directa.regla?mv513Txt_(directa.regla.codigo):"",catWin=ctx.catalogo.mapa[win]||{},par=mv513PartnerInfo_(ctx.partner,o.ordenId,periodo),catPar=ctx.catalogo.mapa[par.codigo]||{},ahora=new Date();
  mv502GuardarFilaAjuste_({ordenId:o.ordenId,periodo:periodo,fechaOrden:o.fecha,cuadrilla:o.cuadrilla,sede:o.region,partidaWin:win,puntosWin:Number(catWin.puntaje||0),partidaPartner:par.codigo,puntosPartner:Number(catPar.puntaje||0),partidaPropuesta:nuevo,puntosPropuesta:Number(catNuevo.puntaje||0),origen:mv513Txt_(data.origen)||"MANUAL JEFATURA V513",motivo:motivo,estado:"VALIDADO",solicitadoPor:u.usuario||data.usuario,fechaSolicitud:ahora,validadoPor:u.usuario||data.usuario,fechaValidacion:ahora,observacion:"WIN original conservado. V513 reemplaza solo la Partida efectiva; historial append-only."});SpreadsheetApp.flush();
  var pub=mv513Publicar_(u.usuario||data.usuario,periodo);return {ok:true,version:MV513_VERSION_,ordenId:o.ordenId,periodo:periodo,partidaAnterior:anterior,partidaNueva:nuevo,publicacion:pub};
}

function validarLotePartidasV513(data){
  data=data||{};mv513InstalarWrappers_();var u=mv513UsuarioJefatura_(data.usuario),periodo=mv513ExigirPeriodoEditable_(data.periodo),items=Array.isArray(data.items)?data.items:[],motivo=mv513Txt_(data.motivo);if(!items.length)throw new Error("V513: lote vacio.");if(!motivo)throw new Error("V513: el motivo/sustento del lote es obligatorio.");if(items.length>100)throw new Error("V513: maximo 100 ordenes por lote.");var ctx=mv513Contexto_(periodo),porOrden={};ctx.win.forEach(function(o){if(o.periodo===periodo)porOrden[o.ordenId]=o;});var aplicadas=0,omitidas=0,detalle=[],ahora=new Date();
  items.forEach(function(it){var id=mv513Id_(it.ordenId),o=porOrden[id],nuevo=mv513Txt_(it.partidaPropuesta);if(!o||o.estado!=="FINALIZADA"){omitidas++;detalle.push({ordenId:id,estado:"OMITIDA",motivo:"No FINALIZADA o no encontrada en el periodo"});return;}var catNuevo=ctx.catalogo.mapa[nuevo];if(!catNuevo){omitidas++;detalle.push({ordenId:id,estado:"OMITIDA",motivo:"Partida no existe"});return;}var anterior=mv513PartidaActual_(o,ctx);if(anterior===nuevo){omitidas++;detalle.push({ordenId:id,estado:"OMITIDA",motivo:"Ya tiene la Partida"});return;}var directa=mv502ClasificacionWinDirecta_(o,ctx.catalogo.mapa),win=directa&&directa.regla?mv513Txt_(directa.regla.codigo):"",catWin=ctx.catalogo.mapa[win]||{},par=mv513PartnerInfo_(ctx.partner,id,periodo),catPar=ctx.catalogo.mapa[par.codigo]||{};mv502GuardarFilaAjuste_({ordenId:id,periodo:periodo,fechaOrden:o.fecha,cuadrilla:o.cuadrilla,sede:o.region,partidaWin:win,puntosWin:Number(catWin.puntaje||0),partidaPartner:par.codigo,puntosPartner:Number(catPar.puntaje||0),partidaPropuesta:nuevo,puntosPropuesta:Number(catNuevo.puntaje||0),origen:mv513Txt_(data.origen)||"LOTE V513",motivo:motivo,estado:"VALIDADO",solicitadoPor:u.usuario||data.usuario,fechaSolicitud:ahora,validadoPor:u.usuario||data.usuario,fechaValidacion:ahora,observacion:"Validacion por lote V513. Una sola publicacion al finalizar."});aplicadas++;detalle.push({ordenId:id,estado:"VALIDADA",anterior:anterior,nueva:nuevo});ctx.ajustesPartida.validados[id]={ordenId:id,partidaPropuesta:nuevo};});
  SpreadsheetApp.flush();var pub=aplicadas?mv513Publicar_(u.usuario||data.usuario,periodo):null;return {ok:true,version:MV513_VERSION_,periodo:periodo,aplicadas:aplicadas,omitidas:omitidas,detalle:detalle,publicacion:pub};
}

function mv513ResolverCuadrilla_(valor){var busc=normalizarCuadrilla(valor),mapa=obtenerMapaUsuarios()||{},salida="";Object.keys(mapa).some(function(k){if(mv502ClaveCuadrilla_(k)===mv502ClaveCuadrilla_(busc)){salida=normalizarCuadrilla(k);return true;}return false;});if(!salida)throw new Error("V513: la cuadrilla efectiva no existe en USUARIOS/cuadrillas activas.");return salida;}
function guardarAjusteCuadrillaV513(data){
  data=data||{};mv513InstalarWrappers_();var u=mv513UsuarioJefatura_(data.usuario),o=mv513BuscarOrdenExacta_(data.ordenId);if(o.estado!=="FINALIZADA")throw new Error("V513: por seguridad solo se corrige cuadrilla de ordenes WIN FINALIZADAS.");var periodo=mv513ExigirPeriodoEditable_(o.periodo),motivo=mv513Txt_(data.motivo);if(!motivo)throw new Error("V513: el motivo/sustento es obligatorio.");var nueva=mv513ResolverCuadrilla_(data.cuadrillaEfectiva),aj=mv513LeerAjustesCuadrilla_(periodo).validados[o.ordenId],anterior=aj&&aj.cuadrillaEfectiva?aj.cuadrillaEfectiva:o.cuadrilla;if(mv502ClaveCuadrilla_(anterior)===mv502ClaveCuadrilla_(nueva))return {ok:true,version:MV513_VERSION_,ordenId:o.ordenId,cuadrillaAnterior:anterior,cuadrillaNueva:nueva,omitida:true,mensaje:"La orden ya tiene esta cuadrilla efectiva."};var ahora=new Date();
  mv513GuardarAjusteCuadrillaFila_({ordenId:o.ordenId,periodo:periodo,fechaOrden:o.fecha,cuadrillaWin:o.cuadrilla,cuadrillaEfectiva:nueva,sede:o.region,origen:mv513Txt_(data.origen)||"MANUAL JEFATURA V513",motivo:motivo,estado:"VALIDADO",validadoPor:u.usuario||data.usuario,fechaValidacion:ahora,observacion:"WIN original conservado. No reasigna automaticamente responsabilidad VTR/GAR."});SpreadsheetApp.flush();var pub=mv513Publicar_(u.usuario||data.usuario,periodo);mv513SincronizarCuadrillaSlaHoja_(o.ordenId,nueva);return {ok:true,version:MV513_VERSION_,ordenId:o.ordenId,periodo:periodo,cuadrillaAnterior:anterior,cuadrillaNueva:nueva,vtrGarResponsabilidadModificada:false,publicacion:pub};
}

function listarReglasPartidaV513(data){data=data||{};mv513UsuarioJefatura_(data.usuario);return {ok:true,version:MV513_VERSION_,reglas:mv513LeerReglas_()};}

/* ===== Aplicación controlada de cuadrilla efectiva al publicador ===== */
function mv513AplicarCuadrillasBase_(base){
  if(!base||!base.periodo||base.periodo<MV513_PERIODO_MINIMO_)return base;var aj=mv513LeerAjustesCuadrilla_(base.periodo).validados;if(!Object.keys(aj).length)return base;var copia=Object.assign({},base);copia.ordenes=(base.ordenes||[]).map(function(o){var a=aj[mv513Id_(o.ordenId)];if(!a||!a.cuadrillaEfectiva)return o;var n=Object.assign({},o);n.cuadrillaOriginalV513=o.cuadrilla;n.cuadrilla=a.cuadrillaEfectiva;return n;});return copia;
}
function mv513AjustarMatrizVtrDenominador_(matriz,efOriginal,vtrgar,periodo,usuarioCarga,corte){
  if(!matriz||!matriz.vtrgar)return matriz;var cuad={};Object.keys(efOriginal.mapa||{}).forEach(function(c){cuad[c]=true;});Object.keys(vtrgar.porCuadrilla||{}).forEach(function(c){cuad[c]=true;});var lista=Object.keys(cuad).filter(Boolean).sort(function(a,b){return a.localeCompare(b,"es");}),m=[["ID","Usuario","Cuadrilla","ACTUALIZACION","Total Ordenes FINALIZADAS","GAR","VTR","TOTAL GAR/VTR","% VTR/GAR"]];lista.forEach(function(c,i){var e=efOriginal.mapa[c]||{finalizadas:0},vg=vtrgar.porCuadrilla[c]||{gar:0,vtr:0},tv=Number(vg.gar||0)+Number(vg.vtr||0);m.push([c+"|"+periodo+"|"+(i+1),usuarioCarga||"ADMIN",c,corte,e.finalizadas,vg.gar||0,vg.vtr||0,tv,e.finalizadas?tv/e.finalizadas:0]);});matriz.vtrgar=m;return matriz;
}

function mv513PartidasSlaEfectivas_(datosBase,periodo,baseTipos){
  var mapa=(typeof baseTipos==="function"?baseTipos(datosBase,periodo):{})||{};
  periodo=String(periodo||"");
  if(periodo<MV513_PERIODO_MINIMO_)return mapa;

  var cat=mv513Catalogo_().mapa;
  var ajustes=(mv502LeerAjustesPartida_(periodo).validados)||{};
  mv513LeerWinCompleto_().forEach(function(o){
    if(!o||o.periodo!==periodo||o.estado!=="FINALIZADA")return;
    var id=mv513Id_(o.ordenId);if(!id)return;
    var codigo="",aj=ajustes[id];
    if(aj&&aj.partidaPropuesta)codigo=mv513Txt_(aj.partidaPropuesta);
    if(!codigo){
      var directa=mv502ClasificacionWinDirecta_(o,cat);
      codigo=directa&&directa.regla?mv513Txt_(directa.regla.codigo):"";
    }
    var c=cat[codigo]||{},tipo=c&&(c.tipoOrden||c.tipoPartida||c.descripcion);
    if(tipo)mapa[id]=normalizarTexto(tipo);
  });
  return mapa;
}

function mv513ClaveSlaSync_(periodo,version){
  return [MV513_SLA_SYNC_VERSION_,String(periodo||""),String(version||"")].join("|");
}
function mv513MarcarSlaSync_(periodo,version){
  try{PropertiesService.getScriptProperties().setProperty(mv513ClaveSlaSync_(periodo,version),"OK");}catch(_){}
}
function mv513SlaSyncOk_(periodo,version){
  try{return PropertiesService.getScriptProperties().getProperty(mv513ClaveSlaSync_(periodo,version))==="OK";}catch(_){return false;}
}
function mv513MarcarResumenSla_(r,periodo,version){
  if(!r||String(periodo||"")<MV513_PERIODO_MINIMO_)return r;
  Object.keys(r.mapaCuadrillas||{}).forEach(function(c){
    if(r.mapaCuadrillas[c])r.mapaCuadrillas[c].mv513PartidasEfectivas=true;
  });
  r.mv513PartidasEfectivas=true;
  mv513MarcarSlaSync_(periodo,version);
  return r;
}

function mv513InstalarWrappers_(){
  if(MV513_WRAPPERS_OK_)return;MV513_WRAPPERS_OK_=true;
  if(typeof mv487pCalcularEfRec_==="function"){
    var baseEf=mv487pCalcularEfRec_;mv487pCalcularEfRec_=function(base){return baseEf(mv513AplicarCuadrillasBase_(base));};
    if(typeof mv487pConstruirMatrices_==="function"){
      var baseMat=mv487pConstruirMatrices_;mv487pConstruirMatrices_=function(base,efrec,vtrgar,usuarioCarga){var r=baseMat(base,efrec,vtrgar,usuarioCarga),aj=base&&base.periodo?mv513LeerAjustesCuadrilla_(base.periodo).validados:{};if(Object.keys(aj).length){var original=baseEf(base);r=mv513AjustarMatrizVtrDenominador_(r,original,vtrgar,base.periodo,usuarioCarga,base.corte||new Date());}return r;};
    }
  }
  if(typeof mv487pPrepararProduccion_==="function"){
    var baseProd=mv487pPrepararProduccion_;mv487pPrepararProduccion_=function(base,usuarioSesion){return baseProd(mv513AplicarCuadrillasBase_(base),usuarioSesion);};
  }
  if(typeof tiposPartidaSlaV363_==="function"){
    var baseTipos=tiposPartidaSlaV363_;
    tiposPartidaSlaV363_=function(datosBase,periodo){return mv513PartidasSlaEfectivas_(datosBase,periodo,baseTipos);};
  }
  if(typeof construirSlaOrdenesResumenV363_==="function"){
    var baseSla=construirSlaOrdenesResumenV363_;
    construirSlaOrdenesResumenV363_=function(periodo,version){
      var r=baseSla(periodo,version);
      if(String(periodo||"")<MV513_PERIODO_MINIMO_||!r||!Array.isArray(r.ordenes))return r;
      var aj=mv513LeerAjustesCuadrilla_(periodo).validados;
      if(Object.keys(aj).length){
        r.ordenes=r.ordenes.map(function(o){
          var a=aj[mv513Id_(o.codigo||o.ordenId)];if(!a||!a.cuadrillaEfectiva)return o;
          var n=Object.assign({},o);n.cuadrilla=a.cuadrillaEfectiva;
          try{var ud=obtenerDatosCuadrillaApp(n.cuadrilla);if(ud){n.sede=normalizarTexto(ud.sede||n.sede);n.supervisor=normalizarUsuario(ud.usuarioSupervisor||n.supervisor);}}catch(_){}
          return n;
        });
        r.mapaCuadrillas=resumenSlaOrdenesV363_(r.ordenes);
      }
      return mv513MarcarResumenSla_(r,periodo,version);
    };
  }
  if(typeof asegurarSlaOrdenesResumenV363_==="function"){
    var baseAsegurarSla=asegurarSlaOrdenesResumenV363_;
    asegurarSlaOrdenesResumenV363_=function(periodo,forzar){
      periodo=String(periodo||"");
      if(periodo<MV513_PERIODO_MINIMO_)return baseAsegurarSla(periodo,forzar);
      var version=versionResumenDashboardRankingV361_();
      if(forzar||!mv513SlaSyncOk_(periodo,version))return construirSlaOrdenesResumenV363_(periodo,version);
      return baseAsegurarSla(periodo,forzar);
    };
  }
  if(typeof jsonSeguroResumenDashboardRankingV361_==="function"){
    var baseJsonResumen=jsonSeguroResumenDashboardRankingV361_;
    jsonSeguroResumenDashboardRankingV361_=function(item){
      if(item&&String(item.periodo||"")>=MV513_PERIODO_MINIMO_)item.mv513SlaSincronizado=true;
      return baseJsonResumen(item);
    };
  }
  if(typeof resumenCompletoV365_==="function"){
    var baseResumenCompleto=resumenCompletoV365_;
    resumenCompletoV365_=function(lista,periodo){
      if(!baseResumenCompleto(lista,periodo))return false;
      if(String(periodo||"")<MV513_PERIODO_MINIMO_)return true;
      return !(lista||[]).some(function(item){
        return !item||item.mv513SlaSincronizado!==true||item.mv369SlaPendienteSincronizacion===true;
      });
    };
  }
  if(typeof construirResumenDashboardRankingRapidoBaseV369_==="function"&&typeof construirResumenDashboardRankingV361_==="function"){
    var baseResumenRapido=construirResumenDashboardRankingRapidoBaseV369_;
    construirResumenDashboardRankingRapidoBaseV369_=function(periodo,version){
      if(String(periodo||"")>=MV513_PERIODO_MINIMO_)return construirResumenDashboardRankingV361_(periodo,version);
      return baseResumenRapido(periodo,version);
    };
  }
}

function mv513SincronizarCuadrillaSlaHoja_(ordenId,cuadrilla){
  try{var h=SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SLA_ORDENES_RESUMEN");if(!h||h.getLastRow()<=1)return;var d=h.getDataRange().getValues(),cab={};(d[0]||[]).forEach(function(x,i){cab[mv487pClaveCabecera_(x)]=i;});var io=cab[mv487pClaveCabecera_("CODIGO")],ic=cab[mv487pClaveCabecera_("CUADRILLA")];if(io===undefined||ic===undefined)return;for(var r=1;r<d.length;r++){if(mv513Id_(d[r][io])===mv513Id_(ordenId)&&normalizarCuadrilla(d[r][ic])!==normalizarCuadrilla(cuadrilla))h.getRange(r+1,ic+1).setValue(cuadrilla);}SpreadsheetApp.flush();}catch(_){}
}

/* Router V513: encadenado sobre el router vigente V503/V512. */
function mv513PostData_(e){var data={};try{data=JSON.parse(e&&e.postData&&e.postData.contents||"{}");}catch(_){data=Object.assign({},e&&e.parameter?e.parameter:{});}return data||{};}
var MV513_doGetBase_=doGet;
doGet=function(e){
  mv513InstalarWrappers_();
  return MV513_doGetBase_(e);
};
var MV513_doPostBase_=doPost;
doPost=function(e){
  mv513InstalarWrappers_();
  var data=mv513PostData_(e),accion=String(data&&data.accion||"");
  try{
    if(accion==="listarPartidasV513")return respuestaJson(listarPartidasV513(data));
    if(accion==="buscarOrdenPartidasV513")return respuestaJson(buscarOrdenPartidasV513(data));
    if(accion==="guardarAjustePartidaV513")return respuestaJson(guardarAjustePartidaV513(data));
    if(accion==="validarLotePartidasV513")return respuestaJson(validarLotePartidasV513(data));
    if(accion==="guardarAjusteCuadrillaV513")return respuestaJson(guardarAjusteCuadrillaV513(data));
    if(accion==="listarReglasPartidaV513")return respuestaJson(listarReglasPartidaV513(data));
  }catch(error){
    if(accion.indexOf("V513")>=0)return respuestaJson({ok:false,version:MV513_VERSION_,modulo:"PARTIDAS_V513",error:error&&error.message?error.message:String(error)});
  }
  return MV513_doPostBase_(e);
};

function V513_DIAGNOSTICO(){
  mv513InstalarWrappers_();var p="2026-08",r=listarPartidasV513({usuario:"JEFZNORTE",periodo:p});var salida={ok:true,version:MV513_VERSION_,periodo:p,pendientes:r.resumen,reglas:r.reglas.length,catalogo:r.catalogo.length,cuadrillas:r.cuadrillas.length,escritura:false,nota:"Diagnostico V513. No valida ni publica."};console.log(JSON.stringify(salida));return salida;
}
