/* ============================================================
   MI VISUAL V388 - Gestión de Actas: API estable
============================================================ */
(function(){
"use strict";
if(window.MV388_ACTAS_API_ESTABLE_OK)return;

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

let cola=Promise.resolve();
const dormir=ms=>new Promise(r=>setTimeout(r,ms));

function esLectura(p){
  try{
    return typeof ACTAS_LECTURAS_GET!=="undefined" &&
      ACTAS_LECTURAS_GET instanceof Set &&
      ACTAS_LECTURAS_GET.has(p?.accion);
  }catch(_){return false;}
}

async function postUnaVez(s){
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(()=>c.abort(),75000):null;
  try{
    const res=await fetch(API_ACTAS,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=UTF-8","Accept":"application/json"},
      body:JSON.stringify(s),
      cache:"no-store",
      redirect:"follow",
      signal:c?c.signal:undefined
    });

    const texto=(await res.text()).trim();

    if(!res.ok){
      const e=new Error(`Google Apps Script respondió temporalmente con HTTP ${res.status}.`);
      e.transitorio=[429,502,503,504].includes(res.status);
      e.httpStatus=res.status;
      throw e;
    }

    if(/^MI VISUAL API OK$/i.test(texto)){
      throw new Error("No se recibió confirmación. Actualice la vista antes de repetir la operación.");
    }

    if(/<!doctype|<html|google drive|accounts\.google/i.test(texto)){
      throw new Error("Google devolvió una página externa. Actualice la vista antes de repetir la operación.");
    }

    let data;
    try{data=JSON.parse(texto);}
    catch(_){throw new Error("La API devolvió una respuesta inválida. Actualice la vista antes de repetir.");}

    if(!data || data.ok===false) throw new Error((data&&data.error)||"Error en Gestión de Actas");

    try{if(typeof limpiarCacheActas==="function")limpiarCacheActas();}catch(_){}
    return data;

  }catch(error){
    if(error?.name==="AbortError"){
      const e=new Error("La operación tardó demasiado. Actualice la vista antes de repetirla.");
      e.transitorio=true;
      throw e;
    }
    if(error instanceof TypeError) error.transitorio=true;
    throw error;
  }finally{
    if(timer)clearTimeout(timer);
  }
}

async function escribir(s){
  let intento=0;
  while(true){
    try{
      return await postUnaVez(s);
    }catch(error){
      const retry=intento===0 && REINTENTABLES.has(s?.accion) && !!error.transitorio;
      if(!retry){
        if(error.transitorio && !REINTENTABLES.has(s?.accion)){
          throw new Error(
            `${error.message} La operación podría haberse registrado. `+
            `Pulse Actualizar vista antes de volver a ejecutarla.`
          );
        }
        throw error;
      }
      intento++;
      await dormir(1200);
    }
  }
}

async function apiV388(payload){
  const s=Object.assign({},payload||{});
  if(esLectura(s)) return await original(s);

  const ejecutar=()=>escribir(s);
  const p=cola.then(ejecutar,ejecutar);
  cola=p.catch(()=>{});
  return await p;
}

apiV388.__mv388=true;
apiV388.__original=original;
window.apiActas=apiV388;
try{apiActas=apiV388;}catch(_){}

window.MV388_ACTAS_API_ESTABLE_OK=true;
console.log("MI VISUAL V388: API de Actas estabilizada.");
})();