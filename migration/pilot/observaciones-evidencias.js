const OBS_EVID_API=URL+"/functions/v1/evidencias-pilot";

async function obsEvidApi(data){
  const t=await tok();if(!t)throw Error("Inicie sesión.");
  const r=await fetch(OBS_EVID_API,{
    method:"POST",
    headers:{Authorization:"Bearer "+t,apikey:KEY,"Content-Type":"application/json"},
    body:JSON.stringify(data)
  });
  const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error||"Error de evidencia.");return x;
}
function obsEvidenceHtml(){
  const ev=SEL?.evidencias||[];
  if(!ev.length)return '<span class="muted">Sin evidencias.</span>';
  return ev.map((x,i)=>{
    const b=x.storage_backend||((x.storage_ref||x.url||"").startsWith("storage://")?"SUPABASE_STORAGE":"GOOGLE_DRIVE");
    return '<button class="sec" onclick="abrirObsEvidencia('+i+')">Evidencia '+(i+1)+'</button> <span class="badge">'+H(b)+'</span>';
  }).join(" ");
}
async function abrirObsEvidencia(i){
  const x=(SEL?.evidencias||[])[Number(i)];if(!x)return;
  const ref=x.storage_ref||x.url||"";
  try{
    if(String(ref).startsWith("storage://")){
      const d=await obsEvidApi({accion:"FIRMAR_EVIDENCIA",modulo:"OBSERVACIONES",storageRef:ref,expiresIn:900});
      window.open(d.signedUrl,"_blank","noopener");
    }else if(ref){
      window.open(ref,"_blank","noopener");
    }
  }catch(e){alert("No se pudo abrir la evidencia: "+e.message)}
}
async function obsCompress(file){
  if(!file)throw Error("Archivo vacío.");
  if(!String(file.type||"").startsWith("image/"))throw Error("Solo se permiten imágenes como evidencia.");
  const src=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(Error("No se pudo leer la imagen."));fr.readAsDataURL(file)});
  const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error("No se pudo procesar la imagen."));im.src=src});
  let w=img.width,h=img.height,max=1280;if(w>h&&w>max){h=Math.round(h*max/w);w=max}else if(h>=w&&h>max){w=Math.round(w*max/h);h=max}
  const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
  const url=cv.toDataURL("image/jpeg",0.72);
  return {nombre:(file.name||"evidencia").replace(/\.[^.]+$/,"")+".jpg",mime:"image/jpeg",base64:url.split(",")[1]||""};
}
async function guardarDescargoConEvidencias(){
  const uploaded=[];
  try{
    if(!SEL)throw Error("Seleccione una observación.");
    const text=E("descargo").value.trim();
    const files=[...(E("descargoFiles")?.files||[])];
    const existing=SEL.evidencias||[];
    if(existing.length+files.length>5)throw Error("El total de evidencias no puede superar 5.");
    E("amsg").className="muted";E("amsg").textContent=files.length?"Subiendo evidencias...":"Guardando descargo...";

    for(let i=0;i<files.length;i++){
      const archivo=await obsCompress(files[i]);
      const d=await obsEvidApi({
        accion:"SUBIR_EVIDENCIA",
        modulo:"OBSERVACIONES",
        registroId:SEL.id,
        categoria:"DESCARGO-"+(existing.length+i+1),
        archivo
      });
      uploaded.push(d.storageRef);
    }

    let evidencias=[];
    if(uploaded.length){
      evidencias=[
        ...existing.map(x=>({url:x.storage_ref||x.url})).filter(x=>x.url),
        ...uploaded.map(url=>({url}))
      ];
    }

    const id=SEL.id;
    await api({accion:"registrarDescargoObservacion",id,descargo:text,evidencias},"POST");
    E("amsg").className="ok";E("amsg").textContent="Descargo guardado"+(uploaded.length?" con "+uploaded.length+" evidencia(s) nueva(s).":".");
    await listar();
    const ix=ROWS.findIndex(x=>x.id===id);if(ix>=0)select(ix);
  }catch(e){
    for(const ref of uploaded){
      try{await obsEvidApi({accion:"ELIMINAR_EVIDENCIA",modulo:"OBSERVACIONES",storageRef:ref})}catch(_){}
    }
    E("amsg").className="err";E("amsg").textContent=e.message;
  }
}
