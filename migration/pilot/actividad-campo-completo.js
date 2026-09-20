
const MV_EVID_API=URL+"/functions/v1/evidencias-pilot";
const MV_AUD_MAX={"CALIDAD TECNICA":40,"SEGURIDAD":20,"ATENCION AL CLIENTE":20,"ORDEN Y LIMPIEZA":20};
const MV_AUD_CRIT=[
{id:"instalacion_estandar",cat:"CALIDAD TECNICA",text:"Instalación según estándar WIN",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"cableado_fijado",cat:"CALIDAD TECNICA",text:"Cableado correctamente fijado",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"grapas_correctas",cat:"CALIDAD TECNICA",text:"Grapas instaladas correctamente",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"curvatura_adecuada",cat:"CALIDAD TECNICA",text:"Curvatura del cable adecuada",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"cable_sin_empalmes",cat:"CALIDAD TECNICA",text:"Cable sin empalmes",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"conectores_correctos",cat:"CALIDAD TECNICA",text:"Conectores correctamente instalados",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"roseta_correcta",cat:"CALIDAD TECNICA",text:"Roseta correctamente instalada",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"equipo_correcto",cat:"CALIDAD TECNICA",text:"Equipo instalado correctamente",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"etiquetado_correcto",cat:"CALIDAD TECNICA",text:"Etiquetado correcto",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"servicio_operativo",cat:"CALIDAD TECNICA",text:"Servicio operativo",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"navegacion_correcta",cat:"CALIDAD TECNICA",text:"Navegación correcta",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"velocidad_plan",cat:"CALIDAD TECNICA",text:"Velocidad acorde al plan",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"wifi_adecuado",cat:"CALIDAD TECNICA",text:"Señal WiFi adecuada",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"uso_epp",cat:"SEGURIDAD",text:"Uso correcto de EPP",types:["ALTA","VT","GARANTIA","PEXT","VTR"],critical:true},
{id:"trabajo_seguro",cat:"SEGURIDAD",text:"Trabajo seguro",types:["ALTA","VT","GARANTIA","PEXT","VTR"],critical:true},
{id:"herramientas_estado",cat:"SEGURIDAD",text:"Herramientas en buen estado",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"escalera_estado",cat:"SEGURIDAD",text:"Escalera en buen estado (si aplica)",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"cliente_equipo",cat:"ATENCION AL CLIENTE",text:"Cliente conoce funcionamiento del equipo",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"trato_cordial",cat:"ATENCION AL CLIENTE",text:"Trato cordial",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"explico_trabajo",cat:"ATENCION AL CLIENTE",text:"Explicó el trabajo realizado",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"cliente_conforme",cat:"ATENCION AL CLIENTE",text:"Cliente conforme",types:["ALTA","VT","GARANTIA","VTR"]},
{id:"orden_limpieza",cat:"ORDEN Y LIMPIEZA",text:"Orden y limpieza",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"sin_sobrantes",cat:"ORDEN Y LIMPIEZA",text:"No quedaron materiales sobrantes",types:["ALTA","VT","GARANTIA","PEXT","VTR"]},
{id:"reserva_adecuada",cat:"ORDEN Y LIMPIEZA",text:"Reserva de cable adecuada",types:["ALTA","VT","GARANTIA","PEXT","VTR"]}
];
let MV_AUD_DRAFT=null;

function mvYN(id,label){
 return '<div class="mv-full-field"><label>'+H(label)+'</label><select id="'+id+'"><option>SI</option><option>NO</option><option>NO APLICA</option></select></div>';
}
function mvInput(id,label,ph="",type="text"){
 return '<div class="mv-full-field"><label>'+H(label)+'</label><input id="'+id+'" type="'+type+'" placeholder="'+H(ph)+'"></div>';
}
function mvArea(id,label,ph=""){
 return '<div class="mv-full-field mv-full-wide"><label>'+H(label)+'</label><textarea id="'+id+'" placeholder="'+H(ph)+'"></textarea></div>';
}
function mvAudTipoOrden(){
 return document.querySelector('input[name="mvAudTipoOrden"]:checked')?.value||"ALTA";
}
function mvAudAplicables(){const t=mvAudTipoOrden();return MV_AUD_CRIT.filter(x=>x.types.includes(t))}
function mvAudRenderCriterios(){
 const cont=E("mvAudCriterios");if(!cont)return;
 const list=mvAudAplicables();
 cont.innerHTML=Object.keys(MV_AUD_MAX).map(cat=>{
   const xs=list.filter(x=>x.cat===cat);if(!xs.length)return "";
   return '<div class="mv-audit-group"><h4>'+H(cat)+' · máximo '+MV_AUD_MAX[cat]+'</h4><table class="mv-audit-table"><tr><th>Criterio</th><th>Cumple</th><th>No cumple</th><th>N/A</th><th>Observación</th></tr>'+
     xs.map(x=>'<tr><td>'+H(x.text)+(x.critical?' <span class="mv-critical">CRÍTICO</span>':'')+'</td>'+
       ["CUMPLE","NO CUMPLE","N/A"].map(v=>'<td class="choice"><input type="radio" name="mvAud_'+x.id+'" value="'+v+'" onchange="mvAudCalcular(false)"></td>').join("")+
       '<td><input id="mvAudObs_'+x.id+'" placeholder="Observación"></td></tr>').join("")+
     '</table></div>';
 }).join("");
 mvAudCalcular(false);
}
function mvAudCalcular(validate){
 const list=mvAudAplicables(),acc={};Object.keys(MV_AUD_MAX).forEach(k=>acc[k]={ok:0,n:0});
 let critical=false,answered=0;const criterios=[];
 for(const x of list){
   const resp=document.querySelector('input[name="mvAud_'+x.id+'"]:checked')?.value||"";
   const obs=E("mvAudObs_"+x.id)?.value.trim()||"";
   if(validate&&!resp)throw Error("Complete el criterio: "+x.text);
   if(validate&&resp==="NO CUMPLE"&&!obs)throw Error("Ingrese observación en: "+x.text);
   criterios.push({id:x.id,categoria:x.cat,criterio:x.text,respuesta:resp,observacion:obs});
   if(resp){answered++;if(resp!=="N/A"){acc[x.cat].n++;if(resp==="CUMPLE")acc[x.cat].ok++}}
   if(x.critical&&resp==="NO CUMPLE")critical=true;
 }
 const scores={};
 for(const cat of Object.keys(MV_AUD_MAX)){
   const x=acc[cat],group=list.filter(z=>z.cat===cat);
   scores[cat]=x.n?Math.round((MV_AUD_MAX[cat]*x.ok/x.n)*100)/100:(group.length&&group.every(z=>document.querySelector('input[name="mvAud_'+z.id+'"]:checked'))?MV_AUD_MAX[cat]:0);
 }
 const total=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)*100)/100;
 let clas=total>=90?"EXCELENTE":total>=80?"CONFORME":total>=70?"OBSERVADO":"CRITICO";
 if(critical)clas="CRITICO";
 const map=[["mvScoreCal","CALIDAD TECNICA"],["mvScoreSeg","SEGURIDAD"],["mvScoreCli","ATENCION AL CLIENTE"],["mvScoreOrd","ORDEN Y LIMPIEZA"]];
 map.forEach(([id,k])=>{if(E(id))E(id).textContent=scores[k].toFixed(2)});
 if(E("mvScoreTotal"))E("mvScoreTotal").textContent=total.toFixed(2);
 if(E("mvScoreClass")){E("mvScoreClass").textContent=answered===list.length?clas:"PENDIENTE";E("mvScoreClass").className="mv-class "+(answered===list.length?clas:"")}
 return {criterios,scores,total,clasificacion:clas,seguridadCritica:critical,answered,totalCriterios:list.length};
}
function mvAudTechnical(tipo){
 if(tipo==="AUDITORIA EN FRIO"){
   return {clientePresente:E("mvClientePresente").value,dniValidado:E("mvDniValidado").value,estadoInstalacion:E("mvEstadoInstalacion").value,
    dropMetraje:E("mvDrop").value,templadores:E("mvTempladores").value,reservaCable:E("mvReserva").value,potenciaConforme:E("mvPotencia").value,
    velocidadConforme:E("mvVelocidad").value,limpiezaTrabajo:E("mvLimpieza").value,clienteConforme:E("mvClienteConforme").value};
 }
 return {tecnicoLlegoHora:E("mvLlegada").value,usoEpp:E("mvEpp").value,uniformeCompleto:E("mvUniforme").value,
  identificacionVisible:E("mvIdentificacion").value,explicoTrabajo:E("mvExplico").value,procedimientoCorrecto:E("mvProcedimiento").value,
  usoMateriales:E("mvMateriales").value,pruebasRealizadas:E("mvPruebas").value,clienteConforme:E("mvHotCliente").value};
}
function mvAudBuild(){
 const tipo=E("mvAudTipo").value,calc=mvAudCalcular(true),requiere=E("mvAudSeguimiento").value;
 if(requiere==="SI"&&!E("mvAudFechaComp").value)throw Error("Ingrese la fecha de compromiso.");
 const tech=mvAudTechnical(tipo);
 return {
  version:1,tipoAuditoria:tipo,tipoOrden:mvAudTipoOrden(),codigoPedido:E("mvAudCodigo").value.trim(),ticket:E("mvAudTicket").value.trim(),
  dniCliente:E("mvAudDni").value.trim(),cliente:E("mvAudCliente").value.trim(),direccion:E("mvAudDireccion").value.trim(),
  datosTecnicos:tech,criterios:calc.criterios,
  puntajes:{calidad:calc.scores["CALIDAD TECNICA"],seguridad:calc.scores["SEGURIDAD"],cliente:calc.scores["ATENCION AL CLIENTE"],ordenLimpieza:calc.scores["ORDEN Y LIMPIEZA"],total:calc.total},
  clasificacion:calc.clasificacion,seguridadCritica:calc.seguridadCritica,observacionesGenerales:E("mvAudObsGeneral").value.trim(),
  accionesCorrectivas:E("mvAudAcciones").value.trim(),requiereSeguimiento:requiere,fechaCompromiso:E("mvAudFechaComp").value,
  responsableSubsanar:E("mvAudResponsable").value.trim()
 };
}
function mvAudTechHtml(tipo){
 if(tipo==="AUDITORIA EN FRIO")return '<div class="mv-full-grid">'+mvYN("mvClientePresente","Cliente presente")+mvYN("mvDniValidado","DNI validado")+
 '<div class="mv-full-field"><label>Estado de instalación</label><select id="mvEstadoInstalacion"><option>FINALIZADA</option><option>CANCELADA</option><option>REPROGRAMADA</option></select></div>'+
 mvInput("mvDrop","DROP / Fibra - metraje","Ej. 120","number")+mvInput("mvTempladores","Templadores","Ej. 4","number")+mvYN("mvReserva","Reserva de cable")+mvYN("mvPotencia","Potencia conforme")+mvYN("mvVelocidad","Velocidad conforme")+mvYN("mvLimpieza","Limpieza del trabajo")+mvYN("mvClienteConforme","Cliente conforme")+'</div>';
 return '<div class="mv-full-grid">'+mvYN("mvLlegada","Técnico llegó a la hora")+mvYN("mvEpp","Uso de EPP")+mvYN("mvUniforme","Uniforme completo")+mvYN("mvIdentificacion","Identificación visible")+mvYN("mvExplico","Explicó el trabajo al cliente")+mvYN("mvProcedimiento","Procedimiento correcto")+mvYN("mvMateriales","Uso correcto de materiales")+mvYN("mvPruebas","Pruebas realizadas")+mvYN("mvHotCliente","Cliente conforme")+'</div>';
}
function mvAudRenderTechnical(){if(E("mvAudTech"))E("mvAudTech").innerHTML=mvAudTechHtml(E("mvAudTipo").value)}
function mvAudForm(tipo,cuadrilla,asg){
 const q=(CTX?.cuadrillas||[]).map(x=>'<option value="'+H(x.cuadrilla)+'">'+H(x.cuadrilla)+' · '+H(x.sede||"")+'</option>').join("");
 return '<div class="row" style="justify-content:space-between"><h3 style="margin:0">Auditoría completa</h3><button class="sec" onclick="mvAudCerrar()">Cerrar</button></div>'+
 (asg?'<div class="notice" style="margin-top:8px"><b>Asignación '+H(asg.id)+':</b> '+H(asg.motivo||"")+'</div>':"")+
 '<div class="mv-full-grid" style="margin-top:10px"><div class="mv-full-field"><label>Cuadrilla</label><select id="mvAudCuadrilla">'+q+'</select></div>'+
 '<div class="mv-full-field"><label>Tipo de auditoría</label><select id="mvAudTipo" onchange="mvAudRenderTechnical()"><option>AUDITORIA EN FRIO</option><option>AUDITORIA EN CALIENTE</option></select></div></div>'+
 '<hr><h3>1. Información general</h3><div class="mv-full-field"><label>Tipo de orden</label><div class="mv-audit-types">'+["ALTA","VT","GARANTIA","PEXT","VTR"].map((x,i)=>'<label><input type="radio" name="mvAudTipoOrden" value="'+x+'" '+(i===0?'checked':'')+' onchange="mvAudRenderCriterios()"> '+x+'</label>').join("")+'</div></div>'+
 '<div class="row" style="margin-top:8px"><input id="mvAudCodigo" placeholder="Código orden / pedido" style="flex:1;min-width:210px"><button class="sec" onclick="mvAudBuscar()">Buscar datos</button></div>'+
 '<div id="mvAudRef" class="muted" style="margin:7px 0"></div><div class="mv-full-grid">'+mvInput("mvAudTicket","Ticket")+mvInput("mvAudDni","DNI cliente")+mvInput("mvAudCliente","Cliente")+mvInput("mvAudDireccion","Dirección")+'</div>'+
 '<hr><h3>2. Información técnica</h3><div id="mvAudTech"></div><hr><h3>3. Lista de verificación</h3><div id="mvAudCriterios"></div>'+
 '<div class="mv-score"><div><span>Calidad /40</span><b id="mvScoreCal">0.00</b></div><div><span>Seguridad /20</span><b id="mvScoreSeg">0.00</b></div><div><span>Cliente /20</span><b id="mvScoreCli">0.00</b></div><div><span>Orden /20</span><b id="mvScoreOrd">0.00</b></div><div><span>Total /100</span><b id="mvScoreTotal">0.00</b></div><div><span>Clasificación</span><b id="mvScoreClass" class="mv-class">PENDIENTE</b></div></div>'+
 '<hr><h3>4. Cierre y seguimiento</h3><div class="mv-full-grid">'+mvArea("mvAudObsGeneral","Observaciones generales")+mvArea("mvAudAcciones","Acciones correctivas")+
 '<div class="mv-full-field"><label>Requiere seguimiento</label><select id="mvAudSeguimiento" onchange="E(\'mvAudFechaComp\').disabled=this.value!==\'SI\'"><option>NO</option><option>SI</option></select></div>'+
 mvInput("mvAudFechaComp","Fecha de compromiso","","date")+mvInput("mvAudResponsable","Responsable de subsanar")+'</div>'+
 '<hr><h3>5. Evidencias fotográficas</h3><div class="mv-evidence-grid">'+[1,2,3,4].map(i=>'<div class="mv-evidence-box"><label><b>Evidencia '+i+'</b></label><input id="mvAudFoto'+i+'" type="file" accept="image/*"><input id="mvAudDesc'+i+'" placeholder="Título / descripción" style="margin-top:7px"></div>').join("")+'</div>'+
 '<div class="row" style="margin-top:12px"><button id="mvAudSave" class="good" onclick="mvAudGuardar()">Guardar auditoría</button><button class="sec" onclick="mvAudCerrar()">Cancelar</button></div><div id="mvAudMsg"></div>';
}
function mvCompNuevaAuditoria(tipo="AUDITORIA EN FRIO",asg=null){
 if(!CTX?.permiso?.registrar){alert("Sin permiso para registrar.");return}
 MV_AUD_DRAFT={id:"AUD-DRAFT-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),asignacion:asg||null};
 E("auditFullCard").innerHTML=mvAudForm(tipo,asg?.cuadrilla||"",asg);
 E("auditFullCard").classList.remove("hidden");
 E("mvAudTipo").value=tipo;
 if(asg?.cuadrilla)E("mvAudCuadrilla").value=asg.cuadrilla;
 if(asg?.codigoOrden)E("mvAudCodigo").value=asg.codigoOrden;
 mvAudRenderTechnical();mvAudRenderCriterios();
 E("mvAudFechaComp").disabled=true;
 E("auditFullCard").scrollIntoView({behavior:"smooth",block:"start"});
 if(asg?.codigoOrden)mvAudBuscar();
}
function mvAudCerrar(){E("auditFullCard").classList.add("hidden");MV_AUD_DRAFT=null}
async function mvAudBuscar(){
 try{
  const codigo=E("mvAudCodigo").value.trim();if(!codigo)throw Error("Ingrese código.");
  const d=await api({accion:"buscarDatosAuditoriaCampo",codigoPedido:codigo,cuadrilla:E("mvAudCuadrilla").value},"POST");
  if(!d.encontrado)throw Error("Sin coincidencia. Puede completar los datos manualmente.");
  if(d.ticket)E("mvAudTicket").value=d.ticket;if(d.dniCliente)E("mvAudDni").value=d.dniCliente;if(d.cliente)E("mvAudCliente").value=d.cliente;if(d.direccion)E("mvAudDireccion").value=d.direccion;
  if(d.tipoOrden){const r=document.querySelector('input[name="mvAudTipoOrden"][value="'+d.tipoOrden+'"]');if(r){r.checked=true;mvAudRenderCriterios()}}
  E("mvAudRef").className="mv-ref-ok";E("mvAudRef").textContent="Datos encontrados en "+(d.fuente||"PostgreSQL")+".";
 }catch(e){E("mvAudRef").className="err";E("mvAudRef").textContent=e.message}
}
async function mvEvidenceApi(data){
 const t=await tok();if(!t)throw Error("Inicie sesión.");
 const r=await fetch(MV_EVID_API,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(data)});
 const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error||"Error de evidencia.");return x;
}
async function mvCompressImage(file){
 if(!file)return null;if(!String(file.type||"").startsWith("image/"))throw Error("Solo se permiten imágenes.");
 const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(Error("No se pudo leer imagen."));fr.readAsDataURL(file)});
 const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error("No se pudo procesar imagen."));im.src=data});
 let w=img.width,h=img.height,max=1280;if(w>h&&w>max){h=Math.round(h*max/w);w=max}else if(h>=w&&h>max){w=Math.round(w*max/h);h=max}
 const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
 const url=cv.toDataURL("image/jpeg",0.72);
 return {nombre:(file.name||"evidencia").replace(/\.[^.]+$/,"")+".jpg",mime:"image/jpeg",base64:url.split(",")[1]||""};
}
async function mvUploadAuditEvidence(i,cuadrilla){
 const file=E("mvAudFoto"+i)?.files?.[0];if(!file)return "";
 const archivo=await mvCompressImage(file);
 const d=await mvEvidenceApi({accion:"SUBIR_EVIDENCIA",modulo:"ACTIVIDAD CAMPO",cuadrilla,registroId:MV_AUD_DRAFT.id,categoria:"AUDITORIA-"+i,archivo});
 return d.storageRef;
}
async function mvCleanupRefs(refs){for(const r of refs.filter(Boolean)){try{await mvEvidenceApi({accion:"ELIMINAR_EVIDENCIA",modulo:"ACTIVIDAD CAMPO",storageRef:r})}catch(_){}}}
function mvAuditObservaciones(tipo,aud){
 const t=mvAudTechnical(tipo),lines=["TIPO DE ACTIVIDAD: "+tipo,"TIPO DE ORDEN: "+aud.tipoOrden,"CODIGO DE PEDIDO: "+aud.codigoPedido,"TICKET: "+aud.ticket,"DNI CLIENTE: "+aud.dniCliente,"CLIENTE: "+aud.cliente,"DIRECCION: "+aud.direccion];
 Object.entries(t).forEach(([k,v])=>lines.push(k.replace(/([A-Z])/g," $1").toUpperCase()+": "+v));
 lines.push("OBSERVACIONES GENERALES: "+aud.observacionesGenerales,"ACCIONES CORRECTIVAS: "+aud.accionesCorrectivas,"REQUIERE SEGUIMIENTO: "+aud.requiereSeguimiento,"FECHA COMPROMISO: "+aud.fechaCompromiso,"RESPONSABLE: "+aud.responsableSubsanar);
 return lines.join("\n");
}
async function mvAudGuardar(){
 const refs=[];const btn=E("mvAudSave");
 try{
  btn.disabled=true;E("mvAudMsg").className="muted";E("mvAudMsg").textContent="Validando y subiendo evidencias...";
  const cuadrilla=E("mvAudCuadrilla").value;if(!cuadrilla)throw Error("Seleccione cuadrilla.");
  const aud=mvAudBuild(),tipo=E("mvAudTipo").value,tech=mvAudTechnical(tipo);
  for(let i=1;i<=4;i++){const r=await mvUploadAuditEvidence(i,cuadrilla);refs[i-1]=r||""}
  const payload={accion:"registrarActividadCampo",cuadrilla,tipoActividad:tipo,asignacionCampoId:MV_AUD_DRAFT?.asignacion?.id||"",
   clientePresente:tipo==="AUDITORIA EN FRIO"?tech.clientePresente:"",dniValidado:tipo==="AUDITORIA EN FRIO"?tech.dniValidado:"",
   estadoInstalacion:tipo==="AUDITORIA EN FRIO"?tech.estadoInstalacion:"REGISTRADO",dropMetraje:tipo==="AUDITORIA EN FRIO"?tech.dropMetraje:"",
   templadores:tipo==="AUDITORIA EN FRIO"?tech.templadores:"",reservaCable:tipo==="AUDITORIA EN FRIO"?tech.reservaCable:"",
   potenciaConforme:tipo==="AUDITORIA EN FRIO"?tech.potenciaConforme:"",velocidadConforme:tipo==="AUDITORIA EN FRIO"?tech.velocidadConforme:"",
   limpiezaTrabajo:tipo==="AUDITORIA EN FRIO"?tech.limpiezaTrabajo:"",clienteConforme:tipo==="AUDITORIA EN FRIO"?tech.clienteConforme:tech.clienteConforme,
   observaciones:mvAuditObservaciones(tipo,aud),auditoria:aud,
   foto1Url:refs[0]||"",foto2Url:refs[1]||"",foto3Url:refs[2]||"",foto4Url:refs[3]||"",
   descFoto1:E("mvAudDesc1").value.trim(),descFoto2:E("mvAudDesc2").value.trim(),descFoto3:E("mvAudDesc3").value.trim(),descFoto4:E("mvAudDesc4").value.trim()
  };
  const d=await api(payload,"POST");
  E("mvAudMsg").className="ok";E("mvAudMsg").textContent="Auditoría registrada: "+d.id+(d.asignacionCompletada?" · asignación completada":"");
  MV_AUD_DRAFT=null;setTimeout(async()=>{mvAudCerrar();await Promise.all([cargar(),cargarAsignaciones()])},700);
 }catch(e){
  if(refs.length)await mvCleanupRefs(refs);
  E("mvAudMsg").className="err";E("mvAudMsg").textContent=e.message;
 }finally{btn.disabled=false}
}
async function mvAbrirEvidencia(ref){
 try{
  if(!ref)return;
  if(!String(ref).startsWith("storage://")){window.open(ref,"_blank","noopener");return}
  const d=await mvEvidenceApi({accion:"FIRMAR_EVIDENCIA",modulo:"ACTIVIDAD CAMPO",storageRef:ref,expiresIn:900});
  window.open(d.signedUrl,"_blank","noopener");
 }catch(e){alert("No se pudo abrir evidencia: "+e.message)}
}
async function iniciarAsignacionCompleta(i){
 try{
  const a=ASG_ROWS[i];if(!a)throw Error("Asignación no encontrada.");
  await api({accion:"iniciarAsignacionCampo",id:a.id},"POST");ACTIVE_ASG=a;
  if(["AUDITORIA EN FRIO","AUDITORIA EN CALIENTE"].includes(a.tipoActividad))mvCompNuevaAuditoria(a.tipoActividad,a);
  else alert("Este formulario completo se integrará en el siguiente bloque.");
  await cargarAsignaciones();
 }catch(e){E("asgMsg").className="err";E("asgMsg").textContent=e.message}
}
