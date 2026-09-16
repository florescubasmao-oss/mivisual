/* ================================================================
   MI VISUAL V549 - MAPA OPERATIVO / LECTURAS RESILIENTES SIN ROMPER CACHÉ

   OBJETIVO
   - Mantener intacta la optimización V395 (caché corta de catálogo/listado).
   - Usar V547 como respaldo SOLO si la lectura optimizada falla o demora.
   - Evitar que un HTTP 404 temporal destruya el mapa.
   - Nunca mostrar HTML crudo de Google dentro de MI VISUAL.
   - Reintentar SOLO lecturas del Mapa Operativo.
   - Nunca reintentar importaciones ni escrituras.
================================================================ */
(function(){
  "use strict";
  if(window.MV547_MAPA_RESILIENCIA_OK)return;
  window.MV547_MAPA_RESILIENCIA_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const ACCIONES_LECTURA=new Set([
    "catalogosMapaOperativo",
    "listarMapaOperativo",
    "listarCtosCercanasMapaOperativo"
  ]);

  const dormir=ms=>new Promise(r=>setTimeout(r,ms));
  const texto=v=>String(v==null?"":v).trim();

  function mensajeAmigable(){
    return "No se pudo consultar el Mapa Operativo en este momento. Espere unos segundos y vuelva a presionar Ver mapa.";
  }

  function esHtml(s){
    const t=texto(s).toLowerCase();
    return t.includes("<!doctype")||t.includes("<html")||t.includes("google apps script")||t.includes("accounts.google");
  }

  async function convertirRespuesta(res){
    const bruto=texto(await res.text());
    if(!res.ok)throw new Error("HTTP "+res.status);
    if(!bruto||esHtml(bruto))throw new Error("RESPUESTA_TEMPORAL_NO_JSON");
    let json;
    try{json=JSON.parse(bruto);}catch(_){throw new Error("RESPUESTA_TEMPORAL_NO_JSON");}
    if(!json||json.ok===false)throw new Error(texto(json&&json.error)||"Consulta temporalmente no disponible");
    return json;
  }

  async function fetchConTimeout(url,opciones,timeout){
    const ctrl=typeof AbortController==="function"?new AbortController():null;
    const timer=ctrl?setTimeout(()=>ctrl.abort(),timeout):null;
    try{
      return await fetch(url,Object.assign({},opciones||{},ctrl?{signal:ctrl.signal}:{}));
    }finally{
      if(timer)clearTimeout(timer);
    }
  }

  async function lecturaGet(payload){
    const url=new URL(API);
    Object.entries(payload||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v).trim());
    });
    url.searchParams.set("_v549",Date.now()+"-"+Math.random().toString(36).slice(2));
    const res=await fetchConTimeout(url.toString(),{
      method:"GET",
      cache:"no-store",
      redirect:"follow",
      headers:{Accept:"application/json"}
    },22000);
    return convertirRespuesta(res);
  }

  async function lecturaPost(payload){
    const res=await fetchConTimeout(API,{
      method:"POST",
      cache:"no-store",
      redirect:"follow",
      headers:{Accept:"application/json"},
      body:JSON.stringify(payload||{})
    },26000);
    return convertirRespuesta(res);
  }

  async function lecturaResiliente(payload){
    const accion=texto(payload&&payload.accion);
    if(!ACCIONES_LECTURA.has(accion)){
      throw new Error("V549: acción no autorizada para reintento de lectura.");
    }

    let ultimoError=null;
    for(let intento=0;intento<2;intento++){
      try{
        return await lecturaGet(payload);
      }catch(e){
        ultimoError=e;
        if(intento===0)await dormir(650);
      }
    }

    /* Respaldo seguro: estas acciones son exclusivamente de lectura. */
    try{
      return await lecturaPost(payload);
    }catch(e){
      ultimoError=e;
    }

    console.warn("V549 Mapa: lectura temporalmente no disponible",accion,ultimoError);
    throw new Error(mensajeAmigable());
  }

  function conLimite(promesa,ms){
    let timer=null;
    return Promise.race([
      Promise.resolve(promesa),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("LECTURA_BASE_DEMORADA")),ms);})
    ]).finally(()=>{if(timer)clearTimeout(timer);});
  }

  function instalar(){
    if(window.MV547_MAPA_FUNCIONES_PARCHEADAS)return true;
    if(typeof window.moApiLectura!=="function"||typeof window.moCargarCatalogos!=="function"||typeof window.moConsultarMapa!=="function")return false;

    const lecturaOriginal=window.moApiLectura;
    const catalogosOriginal=window.moCargarCatalogos;
    const consultarOriginal=window.moConsultarMapa;

    /*
      V549: NO sustituye de frente la lectura V395. Primero usa la cadena ya
      optimizada (incluida su caché de sesión). Solo si falla o supera 12 s
      activa la ruta resiliente V547. Así la validación previa de una carga
      puede reutilizar el listado reciente en vez de volver a consultar todo.
    */
    const lecturaV549=async function(payload){
      const accion=texto(payload&&payload.accion);
      if(!ACCIONES_LECTURA.has(accion))return await lecturaOriginal.apply(this,arguments);
      try{
        return await conLimite(lecturaOriginal.apply(this,arguments),12000);
      }catch(error){
        console.warn("V549 Mapa: lectura optimizada no respondió; usando respaldo resiliente",accion,error);
        return await lecturaResiliente(payload);
      }
    };
    lecturaV549.__mv549Resiliente=true;
    lecturaV549.__original=lecturaOriginal;
    window.moApiLectura=lecturaV549;
    try{moApiLectura=lecturaV549;}catch(_){}

    window.moCargarCatalogos=async function(){
      try{
        return await catalogosOriginal.apply(this,arguments);
      }catch(e){
        console.warn("V549 Mapa: catálogo temporalmente no disponible",e);
        try{
          if(typeof window.moCargarPeriodos==="function")window.moCargarPeriodos([]);
        }catch(_){}
        const contador=document.getElementById("moContador");
        if(contador)contador.textContent="El catálogo está demorando. El mapa permanece disponible; puede intentar Ver mapa nuevamente en unos segundos.";
        return null;
      }
    };

    window.moConsultarMapa=async function(){
      const contador=document.getElementById("moContador");
      try{
        return await consultarOriginal.apply(this,arguments);
      }catch(e){
        console.warn("V549 Mapa: consulta temporalmente no disponible",e);
        if(contador)contador.textContent=mensajeAmigable();
        return null;
      }
    };

    window.MV547_MAPA_FUNCIONES_PARCHEADAS=true;
    window.MV549_MAPA_RESILIENCIA_OK=true;
    console.log("MI VISUAL V549: caché V395 preservada + respaldo resiliente activo");
    return true;
  }

  /* mapa_operativo.js es lazy-load: se espera hasta que el módulo exista. */
  const timer=setInterval(()=>{
    if(instalar())clearInterval(timer);
  },700);

  document.addEventListener("click",()=>{
    setTimeout(instalar,60);
    setTimeout(instalar,350);
    setTimeout(instalar,900);
  },true);

  setTimeout(instalar,150);
})();
