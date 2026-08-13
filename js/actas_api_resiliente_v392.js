/* ============================================================
   MI VISUAL V392 - Gestión de Actas: tolerancia a HTTP 404
   - Conserva la cola de escrituras V388.
   - Trata 404 como transitorio SOLO para operaciones idempotentes.
   - Antes del único reintento por 404 verifica que /exec siga activo.
   - NO reintenta subir/reemplazar PDF ni generar cargos.
============================================================ */
(function(){
"use strict";
if(window.MV392_ACTAS_REINTENTO_404_OK)return;

const original=window.apiActas;
if(typeof original!=="function")return;

try{
  if(typeof ACTAS_LECTURAS_GET!=="undefined" && ACTAS_LECTURAS_GET instanceof Set){
    ACTAS_LECTURAS_GET.add("validarRecepcionMasivaActas");
  }
}catch(_){}

const REINTENTABLES=new Set([
  "validarActaEscaneada",
  "actualizarEntregaFisicaActa",
  "actualizarDatosAutomaticosActas",
  "procesarFechasPendientesActas"
]);

const HTTP_TRANSITORIOS=new Set([404,429,502,503,504]);

let cola=Promise.resolve();
const dormir=ms=>new Promise(r=>setTimeout(r,ms));

function esLectura(p){
  try{
    return typeof ACTAS_LECTURAS_GET!=="undefined" &&
      ACTAS_LECTURAS_GET instanceof Set &&
      ACTAS_LECTURAS_GET.has(p?.accion);
  }catch(_){return false;}
}

async function comprobarExecV392(){
  try{
    const url=new URL(API_ACTAS);
    url.searchParams.set("accion","versionMiVisual");
    url.searchParams.set("_",Date.now());

    const c=typeof AbortController==="function"?new AbortController():null;
    const timer=c?setTimeout(()=>c.abort(),12000):null;

    try{
      const r=await fetch(url.toString(),{
        method:"GET",
        cache:"no-store",
        redirect:"follow",
        signal:c?c.signal:undefined
      });
      if(!r.ok)return false;

      const t=(await r.text()).trim();
      if(!t)return false;

      if(/^MI VISUAL API OK$/i.test(t))return true;

      try{
        const j=JSON.parse(t);
        return !!(j && j.ok!==false);
      }catch(_){
        return !/<!doctype|<html/i.test(t);
      }
    }finally{
      if(timer)clearTimeout(timer);
    }
  }catch(_){
    return false;
  }
}

async function postUnaVez(s){
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(()=>c.abort(),105000):null;

  try{
    const res=await fetch(API_ACTAS,{
      method:"POST",
      headers:{
        "Content-Type":"text/plain;charset=UTF-8",
        "Accept":"application/json"
      },
      body:JSON.stringify(s),
      cache:"no-store",
      redirect:"follow",
      signal:c?c.signal:undefined
    });

    const texto=(await res.text()).trim();

    if(!res.ok){
      const e=new Error(`Google Apps Script respondió temporalmente con HTTP ${res.status}.`);
      e.transitorio=HTTP_TRANSITORIOS.has(res.status);
      e.httpStatus=res.status;
      throw e;
    }

    if(/^MI VISUAL API OK$/i.test(texto)){
      const e=new Error(
        "No se recibió confirmación de la operación. Actualice la vista antes de repetirla."
      );
      e.transitorio=false;
      throw e;
    }

    if(/<!doctype|<html|google drive|accounts\.google/i.test(texto)){
      const e=new Error(
        "Google devolvió una página externa. Actualice la vista antes de repetir la operación."
      );
      e.transitorio=false;
      throw e;
    }

    let data;
    try{
      data=JSON.parse(texto);
    }catch(_){
      const e=new Error(
        "La API devolvió una respuesta inválida. Actualice la vista antes de repetir."
      );
      e.transitorio=false;
      throw e;
    }

    if(!data || data.ok===false){
      throw new Error((data&&data.error)||"Error en Gestión de Actas");
    }

    try{
      if(typeof limpiarCacheActas==="function")limpiarCacheActas();
    }catch(_){}

    return data;

  }catch(error){
    if(error?.name==="AbortError"){
      const e=new Error(
        "La operación tardó demasiado. Actualice la vista antes de repetirla."
      );
      e.transitorio=true;
      e.httpStatus=0;
      throw e;
    }

    if(error instanceof TypeError){
      error.transitorio=true;
      error.httpStatus=0;
    }

    throw error;

  }finally{
    if(timer)clearTimeout(timer);
  }
}

async function escribirV392(s){
  let intento=0;

  while(true){
    try{
      return await postUnaVez(s);

    }catch(error){
      const accion=s?.accion||"";
      const segura=REINTENTABLES.has(accion);
      const transitorio=!!error.transitorio;
      const puedeReintentar=intento===0 && segura && transitorio;

      if(!puedeReintentar){
        if(transitorio && !segura){
          throw new Error(
            `${error.message} La operación podría haberse registrado. `+
            `Pulse Actualizar vista antes de volver a ejecutarla.`
          );
        }
        throw error;
      }

      intento++;

      // Caso reportado: HTTP 404 intermitente en POST.
      // Antes de repetir la operación segura comprobamos que /exec siga activo.
      if(error.httpStatus===404){
        await dormir(900);
        const apiActiva=await comprobarExecV392();

        if(!apiActiva){
          throw new Error(
            "La API de Gestión de Actas no respondió en la verificación. "+
            "Actualice la vista e intente nuevamente en unos segundos."
          );
        }

        await dormir(900);
      }else{
        await dormir(1200);
      }
    }
  }
}

async function apiV392(payload){
  const s=Object.assign({},payload||{});

  // Lecturas: conserva la ruta GET/caché original.
  if(esLectura(s)){
    return await original(s);
  }

  // Escrituras: una por vez dentro de la pestaña.
  const ejecutar=()=>escribirV392(s);
  const p=cola.then(ejecutar,ejecutar);
  cola=p.catch(()=>{});
  return await p;
}

apiV392.__mv392=true;
apiV392.__original=original;

window.apiActas=apiV392;
try{apiActas=apiV392;}catch(_){}

window.MV392_ACTAS_REINTENTO_404_OK=true;
console.log("MI VISUAL V392: tolerancia a HTTP 404 habilitada.");
})();