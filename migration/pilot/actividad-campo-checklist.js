
const MV_CK_TYPES=["MATERIALES","HERRAMIENTAS","UNIDAD VEHICULAR","DOCUMENTACION","EPP"];
const MV_CK_EQUIP={
 ontZte:{label:"ONT ZTE",max:10},ontHuawei:{label:"ONT Huawei",max:10},
 meshZte:{label:"Mesh/Repetidor ZTE",max:10},meshHuawei:{label:"Mesh/Repetidor Huawei",max:10},
 winbox:{label:"WINBOX",max:5},fonowin:{label:"FONOWIN",max:5}
};
const MV_CK_TOOLS_FALLBACK=[
 {herramienta:"FUSIONADORA",categoria:"",requiereSerie:"NO"},
 {herramienta:"POWER METER",categoria:"",requiereSerie:"NO"},
 {herramienta:"VFL",categoria:"",requiereSerie:"NO"},
 {herramienta:"CLEAVER / CORTADORA",categoria:"",requiereSerie:"NO"},
 {herramienta:"PELADORA DE FIBRA",categoria:"",requiereSerie:"NO"},
 {herramienta:"TALADRO",categoria:"",requiereSerie:"NO"},
 {herramienta:"ESCALERA",categoria:"",requiereSerie:"NO"},
 {herramienta:"ALICATE",categoria:"",requiereSerie:"NO"},
 {herramienta:"DESTORNILLADORES",categoria:"",requiereSerie:"NO"},
 {herramienta:"WINCHA",categoria:"",requiereSerie:"NO"}
];
let MV_CK_DRAFT=null,MV_CK_TOOLS=null;

function mvCkField(id,label,unit=""){
 return '<div class="mv-full-field"><label>'+H(label)+'</label><div class="row"><input id="'+id+'" type="number" min="0" step="1" value="0">'+(unit?'<span class="muted">'+H(unit)+'</span>':'')+'</div></div>';
}
function mvCkFile(id,label,accept="image/*"){
 return '<div class="mv-full-field"><label>'+H(label)+'</label><input id="'+id+'" type="file" accept="'+accept+'"></div>';
}
function mvCkMaterials(){
 return '<h3>Equipos y evidencias</h3><div class="mv-full-grid">'+Object.entries(MV_CK_EQUIP).map(([k,v])=>
  '<div class="mv-evidence-box"><div class="row" style="justify-content:space-between"><b>'+H(v.label)+'</b><span id="mvCkCount_'+k+'" class="badge">0/'+v.max+'</span></div><div id="mvCkEquip_'+k+'"></div><button class="sec" type="button" onclick="mvCkAddEquipo(\''+k+'\')">+ Agregar</button></div>'
 ).join("")+'</div><h3 style="margin-top:12px">Materiales</h3><div class="mv-full-grid">'+
 mvCkField("mvCkCable","Cable Drop/Bobina","m")+mvCkField("mvCkPre50","Preconectorizado 50 m","cant.")+mvCkField("mvCkPre100","Preconectorizado 100 m","cant.")+
 mvCkField("mvCkPre150","Preconectorizado 150 m","cant.")+mvCkField("mvCkPre200","Preconectorizado 200 m","cant.")+mvCkField("mvCkAnclaje","Anclaje P","cant.")+
 mvCkField("mvCkBand","Cinta Band-It","m")+mvCkField("mvCkHebilla","Hebilla 3/4","und.")+mvCkField("mvCkAcoplador","Acoplador","und.")+
 mvCkField("mvCkRoseta","Roseta","und.")+mvCkField("mvCkConectores","Conectores ópticos","und.")+mvCkField("mvCkTempladores","Templadores","und.")+
 mvCkField("mvCkSplitter","Splitter","und.")+mvCkField("mvCkClevis","Clevis","und.")+mvCkField("mvCkCat5","Cable UTP CAT5","und.")+
 mvCkField("mvCkCat6","Cable UTP CAT6","und.")+mvCkField("mvCkApc","Patchcord APC-APC","und.")+mvCkField("mvCkUpc","Patchcord UPC-APC","und.")+
 mvCkField("mvCkRj45","Conector RJ45","und.")+'</div>';
}
function mvCkUnit(){
 return '<h3>Unidad Vehicular</h3><div class="mv-full-grid">'+
 mvCkFile("mvCkUnidadFrente","Foto frontal")+mvCkFile("mvCkUnidadPosterior","Foto posterior")+mvCkFile("mvCkUnidadIzq","Foto lado izquierdo")+
 mvCkFile("mvCkUnidadDer","Foto lado derecho")+mvCkFile("mvCkExtintor","Foto del extintor")+mvCkFile("mvCkBotiquin","Foto del botiquín")+
 mvCkFile("mvCkReja","Foto de reja separadora")+mvCkFile("mvCkParrilla1","Parrilla homologada - foto 1")+mvCkFile("mvCkParrilla2","Parrilla homologada - foto 2")+
 mvArea("mvCkObsUnidad","Observación")+'</div>';
}
function mvCkDoc(){
 return '<h3>Documentación</h3><div class="mv-full-grid">'+
 mvInput("mvCkLicVence","Vencimiento licencia","","date")+mvCkFile("mvCkLicFrente","Licencia - frente")+mvCkFile("mvCkLicReverso","Licencia - reverso")+
 mvInput("mvCkSoatVence","Vencimiento SOAT","","date")+mvCkFile("mvCkSoat","SOAT - PDF o foto","image/*,application/pdf")+
 mvInput("mvCkRevVence","Vencimiento revisión técnica","","date")+mvCkFile("mvCkRev","Revisión técnica - PDF o foto","image/*,application/pdf")+
 mvArea("mvCkObsDoc","Observación")+'</div>';
}
function mvCkEpp(){
 return '<h3>EPP</h3><div class="mv-full-grid">'+mvCkFile("mvCkPersonal","Foto completa del personal")+mvCkFile("mvCkBotas","Foto de botas")+mvCkFile("mvCkFotocheck","Foto de fotocheck")+mvArea("mvCkObsEpp","Observación")+'</div>';
}
async function mvCkLoadTools(){
 if(MV_CK_TOOLS)return MV_CK_TOOLS;
 try{
  const t=await tok(),u=new URL(URL+"/functions/v1/checklist-almacen-pilot");u.searchParams.set("accion","contextoChecklist");
  const r=await fetch(u,{headers:{Authorization:"Bearer "+t,apikey:KEY}}),x=await r.json();
  if(r.ok&&x.ok&&Array.isArray(x.catalogoHerramientas)&&x.catalogoHerramientas.length){
   MV_CK_TOOLS=x.catalogoHerramientas.map(z=>({herramienta:String(z.herramienta||"").trim(),categoria:String(z.categoria||"").trim(),requiereSerie:String(z.requiereSerie||"NO").toUpperCase()})).filter(z=>z.herramienta);
  }
 }catch(_){}
 if(!MV_CK_TOOLS?.length)MV_CK_TOOLS=MV_CK_TOOLS_FALLBACK;
 return MV_CK_TOOLS;
}
async function mvCkToolsHtml(){
 const list=await mvCkLoadTools();
 return '<h3>Herramientas</h3><div class="notice">BUENO: cantidad obligatoria. REGULAR: cantidad + motivo. MALO: cantidad + motivo + foto.</div><div id="mvCkToolsList">'+list.map((x,i)=>
 '<div class="mv-evidence-box" data-mv-tool="'+i+'" style="margin-top:8px"><b>'+H(x.herramienta)+'</b>'+(x.categoria?'<div class="muted">'+H(x.categoria)+'</div>':'')+
 '<div class="mv-full-grid" style="margin-top:7px"><div class="mv-full-field"><label>Cantidad *</label><input data-qty type="number" min="1"></div>'+
 (x.requiereSerie==="SI"?'<div class="mv-full-field"><label>Código / Serie *</label><input data-serie></div>':'')+
 '<div class="mv-full-field"><label>Estado</label><select data-state onchange="mvCkToolState(this)"><option>BUENO</option><option>REGULAR</option><option>MALO</option></select></div>'+
 '<div class="mv-full-field hidden" data-reason-wrap><label>Motivo *</label><textarea data-reason></textarea></div><div class="mv-full-field hidden" data-photo-wrap><label>Foto *</label><input data-photo type="file" accept="image/*"></div></div></div>'
 ).join("")+'</div>';
}
function mvCkToolState(sel){
 const box=sel.closest("[data-mv-tool]"),state=sel.value;
 box.querySelector("[data-reason-wrap]")?.classList.toggle("hidden",state==="BUENO");
 box.querySelector("[data-photo-wrap]")?.classList.toggle("hidden",state!=="MALO");
}
function mvCkAddEquipo(key){
 const cfg=MV_CK_EQUIP[key],box=E("mvCkEquip_"+key);if(!cfg||!box)return;
 const n=box.querySelectorAll(".mv-ck-equip-row").length;if(n>=cfg.max)return alert("Máximo "+cfg.max+" para "+cfg.label);
 const row=document.createElement("div");row.className="mv-ck-equip-row mv-full-grid";row.style.margin="8px 0";
 row.innerHTML='<div class="mv-full-field"><label>Serie / código</label><input data-serie placeholder="'+H(cfg.label)+'"></div><div class="mv-full-field"><label>Fotografía</label><input data-photo type="file" accept="image/*"></div><div class="mv-full-field"><label>&nbsp;</label><button type="button" class="danger" onclick="this.closest(\'.mv-ck-equip-row\').remove();mvCkCountEquip(\''+key+'\')">Quitar</button></div>';
 box.appendChild(row);mvCkCountEquip(key);
}
function mvCkCountEquip(key){const b=E("mvCkEquip_"+key),el=E("mvCkCount_"+key);if(b&&el)el.textContent=b.querySelectorAll(".mv-ck-equip-row").length+"/"+MV_CK_EQUIP[key].max}
async function mvCkRenderBody(){
 const tipo=E("mvCkTipo").value,body=E("mvCkBody");body.innerHTML='<div class="muted">Cargando...</div>';
 if(tipo==="MATERIALES"){body.innerHTML=mvCkMaterials();Object.keys(MV_CK_EQUIP).forEach(k=>mvCkAddEquipo(k));return}
 if(tipo==="HERRAMIENTAS"){body.innerHTML=await mvCkToolsHtml();return}
 if(tipo==="UNIDAD VEHICULAR"){body.innerHTML=mvCkUnit();return}
 if(tipo==="DOCUMENTACION"){body.innerHTML=mvCkDoc();return}
 body.innerHTML=mvCkEpp();
}
function mvCompNuevaChecklist(asg=null){
 if(!CTX?.permiso?.registrar){alert("Sin permiso para registrar.");return}
 MV_CK_DRAFT={id:"CK-DRAFT-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),asignacion:asg||null};
 const q=(CTX.cuadrillas||[]).map(x=>'<option value="'+H(x.cuadrilla)+'">'+H(x.cuadrilla)+' · '+H(x.sede||"")+'</option>').join("");
 E("checkFullCard").innerHTML='<div class="row" style="justify-content:space-between"><h3 style="margin:0">Checklist completo en campo</h3><button class="sec" onclick="mvCkCerrar()">Cerrar</button></div>'+
 (asg?'<div class="notice" style="margin-top:8px"><b>Asignación '+H(asg.id)+':</b> '+H(asg.motivo||"")+'</div>':'')+
 '<div class="mv-full-grid" style="margin-top:10px"><div class="mv-full-field"><label>Cuadrilla</label><select id="mvCkCuadrilla">'+q+'</select></div><div class="mv-full-field"><label>Tipo de checklist</label><select id="mvCkTipo" onchange="mvCkRenderBody()">'+MV_CK_TYPES.map(x=>'<option>'+x+'</option>').join("")+'</select></div>'+
 mvInput("mvCkFecha","Fecha de gestión","","date")+'</div><div id="mvCkBody" style="margin-top:12px"></div>'+mvArea("mvCkComment","Comentario final","Detalle, hallazgos y acciones indicadas.")+
 '<div class="row" style="margin-top:10px"><button id="mvCkSave" class="good" onclick="mvCkGuardar()">Guardar Checklist</button><button class="sec" onclick="mvCkCerrar()">Cancelar</button></div><div id="mvCkMsg"></div>';
 E("checkFullCard").classList.remove("hidden");E("mvCkFecha").value=new Date().toISOString().slice(0,10);
 if(asg?.cuadrilla)E("mvCkCuadrilla").value=asg.cuadrilla;
 mvCkRenderBody();E("checkFullCard").scrollIntoView({behavior:"smooth",block:"start"});
}
function mvCkCerrar(){E("checkFullCard").classList.add("hidden");MV_CK_DRAFT=null}
async function mvCkFileData(file,allowPdf=false){
 if(!file)return null;
 if(String(file.type||"").startsWith("image/"))return mvCompressImage(file);
 if(allowPdf&&file.type==="application/pdf"){
  const base64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result||"").split(",")[1]||"");fr.onerror=()=>rej(Error("No se pudo leer PDF."));fr.readAsDataURL(file)});
  return {nombre:file.name||"archivo.pdf",mime:"application/pdf",base64};
 }
 throw Error("Tipo de archivo no permitido.");
}
async function mvCkUpload(file,category,cuadrilla,refs,allowPdf=false){
 if(!file)throw Error("Falta evidencia: "+category);
 const archivo=await mvCkFileData(file,allowPdf);
 const d=await mvEvidenceApi({accion:"SUBIR_EVIDENCIA",modulo:"CHECKLIST ALMACEN",cuadrilla,registroId:MV_CK_DRAFT.id,categoria:category,archivo});
 refs.push(d.storageRef);return d.storageRef;
}
const mvNum=id=>Number(E(id)?.value||0)||0;
async function mvCkBuildMaterials(cuadrilla,refs){
 const p={tipoChecklist:"MATERIALES",
  cableDrop:mvNum("mvCkCable"),pre50:mvNum("mvCkPre50"),pre100:mvNum("mvCkPre100"),pre150:mvNum("mvCkPre150"),pre200:mvNum("mvCkPre200"),
  anclajeP:mvNum("mvCkAnclaje"),cintaBandIt:mvNum("mvCkBand"),hebilla:mvNum("mvCkHebilla"),acoplador:mvNum("mvCkAcoplador"),roseta:mvNum("mvCkRoseta"),
  conectoresOpticos:mvNum("mvCkConectores"),templadores:mvNum("mvCkTempladores"),splitter:mvNum("mvCkSplitter"),clevis:mvNum("mvCkClevis"),
  utpCat5:mvNum("mvCkCat5"),utpCat6:mvNum("mvCkCat6"),patchApcApc:mvNum("mvCkApc"),patchUpcApc:mvNum("mvCkUpc"),rj45:mvNum("mvCkRj45")
 };
 for(const [key,cfg] of Object.entries(MV_CK_EQUIP)){
  const out=[],rows=[...E("mvCkEquip_"+key).querySelectorAll(".mv-ck-equip-row")];
  for(const row of rows){
   const serie=row.querySelector("[data-serie]").value.trim(),file=row.querySelector("[data-photo]").files?.[0];
   if(!serie&&!file)continue;if(!serie)throw Error("Ingrese serie/código de "+cfg.label);if(!file)throw Error("Suba foto de "+cfg.label+" - "+serie);
   const ref=await mvCkUpload(file,key+"-"+(out.length+1),cuadrilla,refs);
   out.push({serie,fotoUrl:ref});
  }
  p[key+"Equipos"]=out;
 }
 p.equipos={ontZte:p.ontZteEquipos,ontHuawei:p.ontHuaweiEquipos,meshZte:p.meshZteEquipos,meshHuawei:p.meshHuaweiEquipos,winbox:p.winboxEquipos,fonowin:p.fonowinEquipos};
 return p;
}
async function mvCkBuildTools(cuadrilla,refs){
 const tools=await mvCkLoadTools(),boxes=[...document.querySelectorAll("#mvCkToolsList [data-mv-tool]")],out=[];
 for(const box of boxes){
  const cfg=tools[Number(box.dataset.mvTool)],qty=Number(box.querySelector("[data-qty]").value||0);
  const serie=box.querySelector("[data-serie]")?.value.trim()||"",state=box.querySelector("[data-state]").value,reason=box.querySelector("[data-reason]")?.value.trim()||"",file=box.querySelector("[data-photo]")?.files?.[0];
  if(!Number.isFinite(qty)||qty<=0)throw Error("Ingrese cantidad mayor a cero para "+cfg.herramienta);
  if(cfg.requiereSerie==="SI"&&!serie)throw Error("Ingrese serie de "+cfg.herramienta);
  if(["REGULAR","MALO"].includes(state)&&!reason)throw Error("Ingrese motivo de "+cfg.herramienta);
  let ref="";if(state==="MALO")ref=await mvCkUpload(file,"HERRAMIENTA-"+cfg.herramienta,cuadrilla,refs);
  out.push({herramienta:cfg.herramienta,cantidad:qty,codigoSerie:serie,estado:state,motivo:reason,fotoUrl:ref});
 }
 return {tipoChecklist:"HERRAMIENTAS",herramientas:out};
}
async function mvCkBuildUnit(cuadrilla,refs){
 const pairs=[["fotoUnidadFrenteUrl","mvCkUnidadFrente","UNIDAD-FRENTE"],["fotoUnidadPosteriorUrl","mvCkUnidadPosterior","UNIDAD-POSTERIOR"],["fotoUnidadLadoIzquierdoUrl","mvCkUnidadIzq","UNIDAD-IZQ"],["fotoUnidadLadoDerechoUrl","mvCkUnidadDer","UNIDAD-DER"],["fotoExtintorUrl","mvCkExtintor","EXTINTOR"],["fotoBotiquinUrl","mvCkBotiquin","BOTIQUIN"],["fotoRejaSeparadoraUrl","mvCkReja","REJA"],["fotoParrilla1Url","mvCkParrilla1","PARRILLA-1"],["fotoParrilla2Url","mvCkParrilla2","PARRILLA-2"]];
 const p={tipoChecklist:"UNIDAD VEHICULAR",observacionUnidad:E("mvCkObsUnidad").value.trim()};
 for(const [field,id,cat] of pairs)p[field]=await mvCkUpload(E(id).files?.[0],cat,cuadrilla,refs);
 return p;
}
async function mvCkBuildDoc(cuadrilla,refs){
 const p={tipoChecklist:"DOCUMENTACION",licenciaFechaVencimiento:E("mvCkLicVence").value,soatFechaVencimiento:E("mvCkSoatVence").value,revisionTecnicaFechaVencimiento:E("mvCkRevVence").value,observacionDocumentacion:E("mvCkObsDoc").value.trim()};
 if(!p.licenciaFechaVencimiento||!p.soatFechaVencimiento||!p.revisionTecnicaFechaVencimiento)throw Error("Complete todas las fechas de vencimiento.");
 p.licenciaFotoFrenteUrl=await mvCkUpload(E("mvCkLicFrente").files?.[0],"LICENCIA-FRENTE",cuadrilla,refs);
 p.licenciaFotoReversoUrl=await mvCkUpload(E("mvCkLicReverso").files?.[0],"LICENCIA-REVERSO",cuadrilla,refs);
 p.soatArchivoUrl=await mvCkUpload(E("mvCkSoat").files?.[0],"SOAT",cuadrilla,refs,true);
 p.revisionTecnicaArchivoUrl=await mvCkUpload(E("mvCkRev").files?.[0],"REVISION-TECNICA",cuadrilla,refs,true);
 return p;
}
async function mvCkBuildEpp(cuadrilla,refs){
 return {tipoChecklist:"EPP",
  fotoPersonalCompletoUrl:await mvCkUpload(E("mvCkPersonal").files?.[0],"EPP-PERSONAL",cuadrilla,refs),
  fotoBotasUrl:await mvCkUpload(E("mvCkBotas").files?.[0],"EPP-BOTAS",cuadrilla,refs),
  fotoFotocheckUrl:await mvCkUpload(E("mvCkFotocheck").files?.[0],"EPP-FOTOCHECK",cuadrilla,refs),
  observacionEpp:E("mvCkObsEpp").value.trim()
 };
}
async function mvCkGuardar(){
 const refs=[],btn=E("mvCkSave");
 try{
  btn.disabled=true;E("mvCkMsg").className="muted";E("mvCkMsg").textContent="Validando y subiendo evidencias...";
  const cuadrilla=E("mvCkCuadrilla").value,tipo=E("mvCkTipo").value,fecha=E("mvCkFecha").value,comment=E("mvCkComment").value.trim();
  if(!cuadrilla)throw Error("Seleccione cuadrilla.");if(!fecha)throw Error("Ingrese fecha de gestión.");if(!comment)throw Error("Ingrese comentario final.");
  let p;if(tipo==="MATERIALES")p=await mvCkBuildMaterials(cuadrilla,refs);else if(tipo==="HERRAMIENTAS")p=await mvCkBuildTools(cuadrilla,refs);else if(tipo==="UNIDAD VEHICULAR")p=await mvCkBuildUnit(cuadrilla,refs);else if(tipo==="DOCUMENTACION")p=await mvCkBuildDoc(cuadrilla,refs);else p=await mvCkBuildEpp(cuadrilla,refs);
  p.fechaGestion=fecha;p.cuadrilla=cuadrilla;p.origenRegistro="ACTIVIDAD_CAMPO";p.comentarioFinal=comment;
  const d=await api({accion:"registrarActividadCampo",cuadrilla,tipoActividad:"CHECKLIST",asignacionCampoId:MV_CK_DRAFT?.asignacion?.id||"",estadoInstalacion:"CHECKLIST ALMACEN",observaciones:"TIPO DE ACTIVIDAD: CHECKLIST\nTIPO CHECKLIST: "+tipo+"\nCOMENTARIO FINAL: "+comment,checklist:p,comentarioFinal:comment,clientePresente:"",dniValidado:"",reservaCable:"",potenciaConforme:"",velocidadConforme:"",limpiezaTrabajo:"",clienteConforme:""},"POST");
  E("mvCkMsg").className="ok";E("mvCkMsg").textContent="Checklist registrado: "+d.checklistId+" · Actividad: "+d.id+(d.asignacionCompletada?" · asignación completada":"");
  MV_CK_DRAFT=null;setTimeout(async()=>{mvCkCerrar();await Promise.all([cargar(),cargarAsignaciones()])},700);
 }catch(e){
  if(refs.length)await mvCleanupRefs(refs);
  E("mvCkMsg").className="err";E("mvCkMsg").textContent=e.message;
 }finally{btn.disabled=false}
}
