const CKR_EVID_API=URL+"/functions/v1/evidencias-pilot";
const CKR_TYPES=["MATERIALES","HERRAMIENTAS","UNIDAD VEHICULAR","DOCUMENTACION","EPP"];
const CKR_EQUIP={
  ontZte:{label:"ONT ZTE",max:10},ontHuawei:{label:"ONT Huawei",max:10},
  meshZte:{label:"Mesh/Repetidor ZTE",max:10},meshHuawei:{label:"Mesh/Repetidor Huawei",max:10},
  winbox:{label:"WINBOX",max:5},fonowin:{label:"FONOWIN",max:5}
};
let CKR_DRAFT=null;

function checklistRegistroContextReady(){
  if(N(CTX?.usuario?.perfil)==="TECNICO"&&CTX?.permiso?.registrar){
    E("registroLauncher")?.classList.remove("hidden");
  }
}
function ckrField(id,label,unit=""){
  return '<div class="grid-field"><label>'+H(label)+'</label><div class="row"><input id="'+id+'" type="number" min="0" step="1" value="0">'+(unit?'<span class="muted">'+H(unit)+'</span>':'')+'</div></div>';
}
function ckrFile(id,label,accept="image/*"){
  return '<div class="grid-field"><label>'+H(label)+'</label><input id="'+id+'" type="file" accept="'+accept+'"></div>';
}
function ckrText(id,label,type="text"){
  return '<div class="grid-field"><label>'+H(label)+'</label><input id="'+id+'" type="'+type+'"></div>';
}
function ckrArea(id,label){
  return '<div class="grid-field full"><label>'+H(label)+'</label><textarea id="'+id+'"></textarea></div>';
}
function abrirRegistroChecklist(){
  CKR_DRAFT={id:"CK-DRAFT-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)};
  E("registroCard").classList.remove("hidden");
  E("registroCard").innerHTML='<div class="row" style="justify-content:space-between"><h3 style="margin:0">Nuevo Checklist</h3><button class="sec" onclick="cerrarRegistroChecklist()">Cerrar</button></div>'+
    '<div class="grid" style="margin-top:10px"><div class="grid-field"><label>Tipo de Checklist</label><select id="ckrTipo" onchange="ckrRenderBody()">'+CKR_TYPES.map(x=>'<option>'+x+'</option>').join("")+'</select></div>'+
    ckrText("ckrFecha","Fecha de gestión","date")+
    '<div class="grid-field"><label>Cuadrilla</label><input value="'+H(CTX.usuario.cuadrilla||"")+'" disabled></div></div>'+
    '<div id="ckrBody" style="margin-top:12px"></div>'+ckrArea("ckrComentario","Comentario final")+
    '<div class="row" style="margin-top:10px"><button id="ckrSave" class="good" onclick="guardarRegistroChecklist()">Guardar Checklist</button><button class="sec" onclick="cerrarRegistroChecklist()">Cancelar</button></div><div id="ckrMsg"></div>';
  E("ckrFecha").value=new Date().toISOString().slice(0,10);
  ckrRenderBody();
  E("registroCard").scrollIntoView({behavior:"smooth",block:"start"});
}
function cerrarRegistroChecklist(){E("registroCard").classList.add("hidden");E("registroCard").innerHTML="";CKR_DRAFT=null}
function ckrMaterialsHtml(){
 return '<h3>Equipos y evidencias</h3><div class="grid">'+Object.entries(CKR_EQUIP).map(([k,v])=>
  '<div class="evidence-box"><div class="row" style="justify-content:space-between"><b>'+H(v.label)+'</b><span id="ckrCount_'+k+'" class="badge">0/'+v.max+'</span></div><div id="ckrEquip_'+k+'"></div><button type="button" class="sec" onclick="ckrAddEquipo(\''+k+'\')">+ Agregar</button></div>'
 ).join("")+'</div><h3 style="margin-top:12px">Materiales</h3><div class="grid">'+
 ckrField("ckrCable","Cable Drop/Bobina","m")+ckrField("ckrPre50","Preconectorizado 50 m","cant.")+ckrField("ckrPre100","Preconectorizado 100 m","cant.")+
 ckrField("ckrPre150","Preconectorizado 150 m","cant.")+ckrField("ckrPre200","Preconectorizado 200 m","cant.")+ckrField("ckrAnclaje","Anclaje P","cant.")+
 ckrField("ckrBand","Cinta Band-It","m")+ckrField("ckrHebilla","Hebilla 3/4","und.")+ckrField("ckrAcoplador","Acoplador","und.")+
 ckrField("ckrRoseta","Roseta","und.")+ckrField("ckrConectores","Conectores ópticos","und.")+ckrField("ckrTempladores","Templadores","und.")+
 ckrField("ckrSplitter","Splitter","und.")+ckrField("ckrClevis","Clevis","und.")+ckrField("ckrCat5","Cable UTP CAT5","und.")+
 ckrField("ckrCat6","Cable UTP CAT6","und.")+ckrField("ckrApc","Patchcord APC-APC","und.")+ckrField("ckrUpc","Patchcord UPC-APC","und.")+
 ckrField("ckrRj45","Conector RJ45","und.")+'</div>';
}
function ckrUnitHtml(){
 return '<h3>Unidad Vehicular</h3><div class="grid">'+ckrFile("ckrUnidadFrente","Foto frontal")+ckrFile("ckrUnidadPosterior","Foto posterior")+ckrFile("ckrUnidadIzq","Foto lado izquierdo")+ckrFile("ckrUnidadDer","Foto lado derecho")+ckrFile("ckrExtintor","Foto del extintor")+ckrFile("ckrBotiquin","Foto del botiquín")+ckrFile("ckrReja","Foto de reja separadora")+ckrFile("ckrParrilla1","Parrilla homologada - foto 1")+ckrFile("ckrParrilla2","Parrilla homologada - foto 2")+ckrArea("ckrObsUnidad","Observación")+'</div>';
}
function ckrDocHtml(){
 return '<h3>Documentación</h3><div class="grid">'+ckrText("ckrLicVence","Vencimiento licencia","date")+ckrFile("ckrLicFrente","Licencia - frente")+ckrFile("ckrLicReverso","Licencia - reverso")+ckrText("ckrSoatVence","Vencimiento SOAT","date")+ckrFile("ckrSoat","SOAT - PDF o foto","image/*,application/pdf")+ckrText("ckrRevVence","Vencimiento revisión técnica","date")+ckrFile("ckrRev","Revisión técnica - PDF o foto","image/*,application/pdf")+ckrArea("ckrObsDoc","Observación")+'</div>';
}
function ckrEppHtml(){
 return '<h3>EPP</h3><div class="grid">'+ckrFile("ckrPersonal","Foto completa del personal")+ckrFile("ckrBotas","Foto de botas")+ckrFile("ckrFotocheck","Foto de fotocheck")+ckrArea("ckrObsEpp","Observación")+'</div>';
}
function ckrToolsHtml(){
 const list=Array.isArray(CTX.catalogoHerramientas)&&CTX.catalogoHerramientas.length?CTX.catalogoHerramientas:[];
 return '<h3>Herramientas</h3><div class="notice">BUENO: cantidad obligatoria. REGULAR: cantidad + motivo. MALO: cantidad + motivo + foto.</div><div id="ckrToolsList">'+list.map((x,i)=>{
   const h=x.herramienta||"",cat=x.categoria||"",serie=N(x.requiereSerie)==="SI";
   return '<div class="evidence-box" data-ckr-tool="'+i+'" style="margin-top:8px"><b>'+H(h)+'</b>'+(cat?'<div class="muted">'+H(cat)+'</div>':'')+
   '<div class="grid" style="margin-top:7px"><div class="grid-field"><label>Cantidad *</label><input data-qty type="number" min="1"></div>'+
   (serie?'<div class="grid-field"><label>Código / Serie *</label><input data-serie></div>':'')+
   '<div class="grid-field"><label>Estado</label><select data-state onchange="ckrToolState(this)"><option>BUENO</option><option>REGULAR</option><option>MALO</option></select></div>'+
   '<div class="grid-field hidden" data-reason-wrap><label>Motivo *</label><textarea data-reason></textarea></div><div class="grid-field hidden" data-photo-wrap><label>Foto *</label><input data-photo type="file" accept="image/*"></div></div></div>';
 }).join("")+'</div>';
}
function ckrToolState(sel){
 const b=sel.closest("[data-ckr-tool]"),s=sel.value;
 b.querySelector("[data-reason-wrap]")?.classList.toggle("hidden",s==="BUENO");
 b.querySelector("[data-photo-wrap]")?.classList.toggle("hidden",s!=="MALO");
}
function ckrRenderBody(){
 const t=E("ckrTipo").value,b=E("ckrBody");
 if(t==="MATERIALES"){b.innerHTML=ckrMaterialsHtml();Object.keys(CKR_EQUIP).forEach(ckrAddEquipo)}
 else if(t==="HERRAMIENTAS")b.innerHTML=ckrToolsHtml();
 else if(t==="UNIDAD VEHICULAR")b.innerHTML=ckrUnitHtml();
 else if(t==="DOCUMENTACION")b.innerHTML=ckrDocHtml();
 else b.innerHTML=ckrEppHtml();
}
function ckrAddEquipo(key){
 const cfg=CKR_EQUIP[key],box=E("ckrEquip_"+key);if(!cfg||!box)return;
 const n=box.querySelectorAll(".ckr-equip-row").length;if(n>=cfg.max)return alert("Máximo "+cfg.max+" para "+cfg.label);
 const row=document.createElement("div");row.className="ckr-equip-row grid";row.style.margin="8px 0";
 row.innerHTML='<div class="grid-field"><label>Serie / código</label><input data-serie></div><div class="grid-field"><label>Fotografía</label><input data-photo type="file" accept="image/*"></div><div class="grid-field"><label>&nbsp;</label><button type="button" class="danger" onclick="this.closest(\'.ckr-equip-row\').remove();ckrCountEquip(\''+key+'\')">Quitar</button></div>';
 box.appendChild(row);ckrCountEquip(key);
}
function ckrCountEquip(key){const b=E("ckrEquip_"+key),x=E("ckrCount_"+key);if(b&&x)x.textContent=b.querySelectorAll(".ckr-equip-row").length+"/"+CKR_EQUIP[key].max}
async function ckrEvidApi(data){
 const t=await tok();if(!t)throw Error("Inicie sesión.");
 const r=await fetch(CKR_EVID_API,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(data)});
 const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error||"Error de evidencia.");return x;
}
async function ckrCompress(file,allowPdf=false){
 if(!file)throw Error("Falta archivo.");
 if(String(file.type||"").startsWith("image/")){
   const src=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(Error("No se pudo leer imagen."));fr.readAsDataURL(file)});
   const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error("No se pudo procesar imagen."));im.src=src});
   let w=img.width,h=img.height,max=1280;if(w>h&&w>max){h=Math.round(h*max/w);w=max}else if(h>=w&&h>max){w=Math.round(w*max/h);h=max}
   const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
   const u=cv.toDataURL("image/jpeg",0.72);return {nombre:(file.name||"evidencia").replace(/\.[^.]+$/,"")+".jpg",mime:"image/jpeg",base64:u.split(",")[1]||""};
 }
 if(allowPdf&&file.type==="application/pdf"){
   const b=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result||"").split(",")[1]||"");fr.onerror=()=>rej(Error("No se pudo leer PDF."));fr.readAsDataURL(file)});
   return {nombre:file.name||"archivo.pdf",mime:"application/pdf",base64:b};
 }
 throw Error("Tipo de archivo no permitido.");
}
async function ckrUpload(file,cat,refs,allowPdf=false){
 if(!file)throw Error("Falta evidencia: "+cat);
 const archivo=await ckrCompress(file,allowPdf);
 const d=await ckrEvidApi({accion:"SUBIR_EVIDENCIA",modulo:"CHECKLIST ALMACEN",cuadrilla:CTX.usuario.cuadrilla,registroId:CKR_DRAFT.id,categoria:cat,archivo});
 refs.push(d.storageRef);return d.storageRef;
}
async function ckrCleanup(refs){for(const r of refs){try{await ckrEvidApi({accion:"ELIMINAR_EVIDENCIA",modulo:"CHECKLIST ALMACEN",storageRef:r})}catch(_){}}}
const ckrNum=id=>Number(E(id)?.value||0)||0;
async function ckrBuildMaterials(refs){
 const p={tipoChecklist:"MATERIALES",cableDrop:ckrNum("ckrCable"),pre50:ckrNum("ckrPre50"),pre100:ckrNum("ckrPre100"),pre150:ckrNum("ckrPre150"),pre200:ckrNum("ckrPre200"),anclajeP:ckrNum("ckrAnclaje"),cintaBandIt:ckrNum("ckrBand"),hebilla:ckrNum("ckrHebilla"),acoplador:ckrNum("ckrAcoplador"),roseta:ckrNum("ckrRoseta"),conectoresOpticos:ckrNum("ckrConectores"),templadores:ckrNum("ckrTempladores"),splitter:ckrNum("ckrSplitter"),clevis:ckrNum("ckrClevis"),utpCat5:ckrNum("ckrCat5"),utpCat6:ckrNum("ckrCat6"),patchApcApc:ckrNum("ckrApc"),patchUpcApc:ckrNum("ckrUpc"),rj45:ckrNum("ckrRj45")};
 for(const [key,cfg] of Object.entries(CKR_EQUIP)){
   const out=[];for(const row of E("ckrEquip_"+key).querySelectorAll(".ckr-equip-row")){
     const serie=row.querySelector("[data-serie]").value.trim(),file=row.querySelector("[data-photo]").files?.[0];
     if(!serie&&!file)continue;if(!serie)throw Error("Ingrese serie/código de "+cfg.label);if(!file)throw Error("Suba foto de "+cfg.label+" - "+serie);
     out.push({serie,fotoUrl:await ckrUpload(file,key+"-"+(out.length+1),refs)});
   }
   p[key+"Equipos"]=out;
 }
 p.equipos={ontZte:p.ontZteEquipos,ontHuawei:p.ontHuaweiEquipos,meshZte:p.meshZteEquipos,meshHuawei:p.meshHuaweiEquipos,winbox:p.winboxEquipos,fonowin:p.fonowinEquipos};
 return p;
}
async function ckrBuildTools(refs){
 const cat=Array.isArray(CTX.catalogoHerramientas)?CTX.catalogoHerramientas:[],boxes=[...document.querySelectorAll("#ckrToolsList [data-ckr-tool]")],out=[];
 for(const b of boxes){
   const cfg=cat[Number(b.dataset.ckrTool)]||{},qty=Number(b.querySelector("[data-qty]").value||0),serie=b.querySelector("[data-serie]")?.value.trim()||"",state=b.querySelector("[data-state]").value,reason=b.querySelector("[data-reason]")?.value.trim()||"",file=b.querySelector("[data-photo]")?.files?.[0];
   if(!Number.isFinite(qty)||qty<=0)throw Error("Ingrese cantidad mayor a cero para "+(cfg.herramienta||"herramienta"));
   if(N(cfg.requiereSerie)==="SI"&&!serie)throw Error("Ingrese serie de "+cfg.herramienta);
   if(["REGULAR","MALO"].includes(state)&&!reason)throw Error("Ingrese motivo de "+cfg.herramienta);
   let fotoUrl="";if(state==="MALO")fotoUrl=await ckrUpload(file,"HERRAMIENTA-"+cfg.herramienta,refs);
   out.push({herramienta:cfg.herramienta,cantidad:qty,codigoSerie:serie,estado:state,motivo:reason,fotoUrl});
 }
 return {tipoChecklist:"HERRAMIENTAS",herramientas:out};
}
async function ckrBuildUnit(refs){
 const pairs=[["fotoUnidadFrenteUrl","ckrUnidadFrente","UNIDAD-FRENTE"],["fotoUnidadPosteriorUrl","ckrUnidadPosterior","UNIDAD-POSTERIOR"],["fotoUnidadLadoIzquierdoUrl","ckrUnidadIzq","UNIDAD-IZQ"],["fotoUnidadLadoDerechoUrl","ckrUnidadDer","UNIDAD-DER"],["fotoExtintorUrl","ckrExtintor","EXTINTOR"],["fotoBotiquinUrl","ckrBotiquin","BOTIQUIN"],["fotoRejaSeparadoraUrl","ckrReja","REJA"],["fotoParrilla1Url","ckrParrilla1","PARRILLA-1"],["fotoParrilla2Url","ckrParrilla2","PARRILLA-2"]];
 const p={tipoChecklist:"UNIDAD VEHICULAR",observacionUnidad:E("ckrObsUnidad").value.trim()};for(const [field,id,cat] of pairs)p[field]=await ckrUpload(E(id).files?.[0],cat,refs);return p;
}
async function ckrBuildDoc(refs){
 const p={tipoChecklist:"DOCUMENTACION",licenciaFechaVencimiento:E("ckrLicVence").value,soatFechaVencimiento:E("ckrSoatVence").value,revisionTecnicaFechaVencimiento:E("ckrRevVence").value,observacionDocumentacion:E("ckrObsDoc").value.trim()};
 if(!p.licenciaFechaVencimiento||!p.soatFechaVencimiento||!p.revisionTecnicaFechaVencimiento)throw Error("Complete todas las fechas de vencimiento.");
 p.licenciaFotoFrenteUrl=await ckrUpload(E("ckrLicFrente").files?.[0],"LICENCIA-FRENTE",refs);p.licenciaFotoReversoUrl=await ckrUpload(E("ckrLicReverso").files?.[0],"LICENCIA-REVERSO",refs);p.soatArchivoUrl=await ckrUpload(E("ckrSoat").files?.[0],"SOAT",refs,true);p.revisionTecnicaArchivoUrl=await ckrUpload(E("ckrRev").files?.[0],"REVISION-TECNICA",refs,true);return p;
}
async function ckrBuildEpp(refs){
 return {tipoChecklist:"EPP",fotoPersonalCompletoUrl:await ckrUpload(E("ckrPersonal").files?.[0],"EPP-PERSONAL",refs),fotoBotasUrl:await ckrUpload(E("ckrBotas").files?.[0],"EPP-BOTAS",refs),fotoFotocheckUrl:await ckrUpload(E("ckrFotocheck").files?.[0],"EPP-FOTOCHECK",refs),observacionEpp:E("ckrObsEpp").value.trim()};
}
async function guardarRegistroChecklist(){
 const refs=[],btn=E("ckrSave");
 try{
   btn.disabled=true;E("ckrMsg").className="muted";E("ckrMsg").textContent="Validando y subiendo evidencias...";
   const tipo=E("ckrTipo").value,fecha=E("ckrFecha").value;if(!fecha)throw Error("Ingrese fecha de gestión.");
   let p;if(tipo==="MATERIALES")p=await ckrBuildMaterials(refs);else if(tipo==="HERRAMIENTAS")p=await ckrBuildTools(refs);else if(tipo==="UNIDAD VEHICULAR")p=await ckrBuildUnit(refs);else if(tipo==="DOCUMENTACION")p=await ckrBuildDoc(refs);else p=await ckrBuildEpp(refs);
   p.accion="registrarChecklist";p.fechaGestion=fecha;p.comentarioFinal=E("ckrComentario").value.trim();
   const d=await api(p,"POST");
   E("ckrMsg").className="ok";E("ckrMsg").textContent="Checklist "+d.tipoChecklist+" registrado: "+d.id;
   await cargar();setTimeout(cerrarRegistroChecklist,700);
 }catch(e){
   if(refs.length)await ckrCleanup(refs);
   E("ckrMsg").className="err";E("ckrMsg").textContent=e.message;
 }finally{btn.disabled=false}
}
function ckrParts(v){return String(v||"").split("|").map(x=>x.trim()).filter(Boolean)}
function ckrEvidenceRefs(x){
 const out=[],add=(label,ref)=>{if(ref)out.push({label,ref})};
 [["ONT ZTE",x.fotosOntZte],["ONT Huawei",x.fotosOntHuawei],["Mesh ZTE",x.fotosMeshZte],["Mesh Huawei",x.fotosMeshHuawei],["WINBOX",x.fotosWinbox],["FONOWIN",x.fotosFonowin]].forEach(([l,v])=>ckrParts(v).forEach((r,i)=>add(l+" "+(i+1),r)));
 (x.herramientasDetalle||[]).forEach((h,i)=>add((h.herramienta||"Herramienta")+" "+(i+1),h.foto));
 [["Unidad frente",x.fotoUnidadFrente],["Unidad posterior",x.fotoUnidadPosterior],["Unidad izquierda",x.fotoUnidadLadoIzquierdo],["Unidad derecha",x.fotoUnidadLadoDerecho],["Extintor",x.fotoExtintor],["Botiquín",x.fotoBotiquin],["Reja",x.fotoRejaSeparadora],["Parrilla 1",x.fotoParrilla1],["Parrilla 2",x.fotoParrilla2],["Licencia frente",x.licenciaFotoFrente],["Licencia reverso",x.licenciaFotoReverso],["SOAT",x.soatArchivo],["Revisión técnica",x.revisionTecnicaArchivo],["Personal completo",x.fotoPersonalCompleto],["Botas",x.fotoBotas],["Fotocheck",x.fotoFotocheck]].forEach(([l,r])=>add(l,r));
 return out;
}
function ckrEvidenceHtml(x){
 const refs=ckrEvidenceRefs(x);if(!refs.length)return '<span class="muted">Sin evidencias.</span>';
 return refs.map((e,i)=>'<button class="sec" onclick="ckrOpenEvidence('+i+')">'+H(e.label)+'</button>').join(" ");
}
async function ckrOpenEvidence(i){
 const e=ckrEvidenceRefs(SEL)[Number(i)];if(!e)return;
 try{
   if(String(e.ref).startsWith("storage://")){
     const d=await ckrEvidApi({accion:"FIRMAR_EVIDENCIA",modulo:"CHECKLIST ALMACEN",storageRef:e.ref,expiresIn:900});
     window.open(d.signedUrl,"_blank","noopener");
   }else window.open(e.ref,"_blank","noopener");
 }catch(err){alert("No se pudo abrir evidencia: "+err.message)}
}
