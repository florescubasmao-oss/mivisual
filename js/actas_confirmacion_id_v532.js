/* ============================================================
   MI VISUAL V532 - CONFIRMACION PUNTUAL DE VALIDACION DE ACTAS

   Objetivo:
   - Si una validacion CORRECTO se guarda en Apps Script pero la respuesta
     de red se pierde, verifica SOLO esa acta por ID.
   - No vuelve a cargar todas las actas.
   - No repite automaticamente una escritura incierta.
   - No modifica permisos, estados, Drive ni reglas de validacion.
============================================================ */
(function(){
"use strict";
if(window.MV532_ACTAS_CONFIRMACION_ID_CARGADA)return;
window.MV532_ACTAS_CONFIRMACION_ID_CARGADA=true;

function txt(v){return String(v==null?"":v).trim();}
function norm(v){
  return txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}
function esErrorIncierto(error){
  const m=norm(error&&error.message||error||"");
  return /NO RESPONDIO EN LA VERIFICACION|NO SE RECIBIO CONFIRMACION|TARDO DEMASIADO|RESPUESTA INVALIDA|PAGINA EXTERNA|HTTP 404|HTTP 429|HTTP 502|HTTP 503|HTTP 504|FAILED TO FETCH|NO ESTA DISPONIBLE TEMPORALMENTE/.test(m);
}
async function consultarActaPorId(s){
  const payload={
    accion:"obtenerActaPorIdV532",
    usuario:s.usuario,
    id:s.id,
    _v532:Date.now()+"-"+Math.random().toString(36).slice(2)
  };
  if(typeof window.mv336ApiGet==="function"){
    return await window.mv336ApiGet(window.API_ACTAS||window.MI_VISUAL_API_URL,payload,{intentos:1,tiempoMs:15000});
  }
  const base=window.API_ACTAS||window.MI_VISUAL_API_URL;
  const url=new URL(base);
  Object.keys(payload).forEach(k=>url.searchParams.set(k,String(payload[k])));
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(()=>c.abort(),15000):null;
  try{
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"},signal:c?c.signal:undefined});
    if(!r.ok)throw new Error("HTTP "+r.status);
    const t=(await r.text()).trim();
    const j=JSON.parse(t);
    if(!j||j.ok===false)throw new Error((j&&j.error)||"Consulta no disponible");
    return j;
  }finally{if(timer)clearTimeout(timer);}
}
function confirmada(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const a=r.acta;
  const perfil=norm(r.perfil||localStorage.getItem("perfil"));
  if(perfil==="ALMACEN"){
    return norm(a.resultadoAlmacen)==="CORRECTO" && !!txt(a.validadoAlmacenPor);
  }
  if(perfil==="JEFATURA ALMACEN"){
    return norm(a.resultadoJefatura)==="CORRECTO" && norm(a.estado)==="FINALIZADO" && !!txt(a.validadoJefaturaPor);
  }
  return false;
}
function instalar(){
  if(window.MV532_ACTAS_CONFIRMACION_ID_OK)return true;
  if(typeof window.apiActas!=="function")return false;
  if(!window.MV524_ACTAS_SNAPSHOT_OK && !window.MV392_ACTAS_REINTENTO_404_OK)return false;

  const original=window.apiActas;
  async function apiV532(payload){
    const s=Object.assign({},payload||{});
    try{
      return await original(s);
    }catch(error){
      const aplica=s.accion==="validarActaEscaneada" && norm(s.resultado)==="CORRECTO" && txt(s.id) && esErrorIncierto(error);
      if(!aplica)throw error;
      try{
        const r=await consultarActaPorId(s);
        if(confirmada(s,r)){
          try{if(typeof window.limpiarCacheActas==="function")window.limpiarCacheActas();}catch(_){}
          try{if(typeof window.mv524LimpiarSnapshotActas==="function")window.mv524LimpiarSnapshotActas();}catch(_){}
          return {
            ok:true,
            modulo:"ACTAS",
            accion:"VALIDACION_CONFIRMADA_V532",
            id:s.id,
            resultado:"CORRECTO",
            estado:r.acta.estado||"",
            estadoVerificado:true,
            verificacionPorId:true
          };
        }
      }catch(_){ }
      throw error;
    }
  }
  apiV532.__mv532=true;
  apiV532.__original=original;
  window.apiActas=apiV532;
  try{apiActas=apiV532;}catch(_){}
  window.MV532_ACTAS_CONFIRMACION_ID_OK=true;
  console.log("MI VISUAL V532: confirmacion puntual de Actas por ID habilitada.");
  return true;
}

if(!instalar()){
  const timer=setInterval(function(){
    if(instalar())clearInterval(timer);
  },1000);
}
})();
