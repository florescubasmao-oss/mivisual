/* MI VISUAL V384 - lectura robusta de evidencias */
(function(){
"use strict";
if(window.MV384_ACTIVIDAD_IMAGEN_ROBUSTA_OK)return;

const cache=new WeakMap();

const esImagen=file=>{
  if(!file)return false;
  const t=String(file.type||"").toLowerCase();
  const n=String(file.name||"").toLowerCase();
  return t.startsWith("image/")||/\.(jpg|jpeg|png|webp|heic|heif|bmp)$/i.test(n);
};

function comprimir(img,file){
  const max=1280;
  let w=Number(img.width||img.naturalWidth||0),h=Number(img.height||img.naturalHeight||0);
  if(!w||!h)throw new Error("La imagen no tiene dimensiones válidas");
  if(w>h&&w>max){h=Math.round(h*(max/w));w=max;}
  else if(h>=w&&h>max){w=Math.round(w*(max/h));h=max;}
  const c=document.createElement("canvas");
  c.width=w;c.height=h;
  const x=c.getContext("2d",{alpha:false});
  if(!x)throw new Error("No se pudo preparar la imagen");
  x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
  const d=c.toDataURL("image/jpeg",0.72);
  return {
    base64:d.split(",")[1]||"",
    nombre:(String(file.name||"evidencia").replace(/\.[^.]+$/,"")||"evidencia")+".jpg",
    mime:"image/jpeg"
  };
}

async function conBitmap(file){
  if(typeof createImageBitmap!=="function")throw new Error("NO_BITMAP");
  const b=await createImageBitmap(file,{imageOrientation:"from-image"});
  try{return comprimir(b,file);}finally{try{b.close()}catch(_){}}
}

function conObjectUrl(file){
  return new Promise((resolve,reject)=>{
    let url;
    try{url=URL.createObjectURL(file)}catch(e){reject(e);return}
    const img=new Image();
    img.onload=()=>{
      try{resolve(comprimir(img,file))}catch(e){reject(e)}
      finally{try{URL.revokeObjectURL(url)}catch(_){}}
    };
    img.onerror=()=>{
      try{URL.revokeObjectURL(url)}catch(_){}
      reject(new Error("No se pudo abrir la imagen"));
    };
    img.src=url;
  });
}

function conFileReader(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{try{resolve(comprimir(img,file))}catch(err){reject(err)}};
      img.onerror=()=>reject(new Error("No se pudo procesar la imagen"));
      img.src=e.target.result;
    };
    r.onerror=()=>reject(r.error||new Error("No se pudo leer el archivo"));
    try{r.readAsDataURL(file)}catch(e){reject(e)}
  });
}

async function reintentar(fn,file){
  let ultimo;
  for(const ms of [0,120,350]){
    if(ms)await new Promise(r=>setTimeout(r,ms));
    try{return await fn(file)}catch(e){ultimo=e}
  }
  throw ultimo;
}

async function leerRobusto(file){
  if(!file)return null;
  if(!esImagen(file))throw new Error("Solo se permiten imágenes como evidencia");
  for(const fn of [conBitmap,conObjectUrl,conFileReader]){
    try{return await reintentar(fn,file)}catch(_){}
  }
  throw new Error("No se pudo leer esta foto. Vuelva a seleccionarla desde Galería o Cámara.");
}

function preparar(file){
  if(!file)return Promise.resolve(null);
  let p=cache.get(file);
  if(!p){p=leerRobusto(file);cache.set(file,p);p.catch(()=>{});}
  return p;
}

function cambio(e){
  const i=e.target;
  if(!i||i.type!=="file")return;
  if(!/^actFoto/i.test(i.id||"")&&!i.closest?.(".act-file"))return;
  const f=i.files?.[0];
  if(f)preparar(f);
}

function instalar(){
  const original=window.leerArchivoActividad;
  if(typeof original!=="function")return false;
  if(original.__mv384)return true;
  const robusta=async file=>file?await preparar(file):null;
  robusta.__mv384=true;
  robusta.__original=original;
  window.leerArchivoActividad=robusta;
  try{leerArchivoActividad=robusta}catch(_){}
  return true;
}

function aplicar(){
  instalar();
  document.querySelectorAll('.act-wrap input[type="file"],#actEvidenciasGenerales input[type="file"],.act-file input[type="file"]').forEach(i=>{
    if(i.dataset.mv384==="si")return;
    i.dataset.mv384="si";
    i.addEventListener("change",cambio,{passive:true});
  });
}

aplicar();
new MutationObserver(()=>requestAnimationFrame(aplicar))
  .observe(document.documentElement,{childList:true,subtree:true});

let n=0;
const t=setInterval(()=>{
  n++;aplicar();
  if(window.leerArchivoActividad?.__mv384||n>50)clearInterval(t);
},150);

window.MV384_ACTIVIDAD_IMAGEN_ROBUSTA_OK=true;
console.log("MI VISUAL V384: lectura robusta de evidencias habilitada.");
})();