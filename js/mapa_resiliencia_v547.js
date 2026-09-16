/* ================================================================
   MI VISUAL V547 - MAPA OPERATIVO / LECTURAS RESILIENTES

   OBJETIVO
   - Evitar que un HTTP 404 temporal de Apps Script destruya el mapa.
   - Nunca mostrar HTML crudo de Google dentro de MI VISUAL.
   - Reintentar SOLO lecturas del Mapa Operativo.
   - Usar POST como respaldo SOLO para acciones de lectura ya soportadas
     por el backend; nunca reintenta importaciones ni escrituras.
   - Mantener Leaflet visible aunque falle temporalmente el catálogo.
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
    url.searchParams.set("_v547",Date.now()+"-"+Math.random().toString(36).slice(2));
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
      throw new Error("V547: acción no autorizada para reintento de lectura.");
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

    /*
      Respaldo seguro: estas tres acciones son exclusivamente de lectura.
      No se usa para registrar Excel, validar, editar ni publicar.
    */
    try{
      return await lecturaPost(payload);
    }catch(e){
      ultimoError=e;
    }

    console.warn("V547 Mapa: lectura temporalmente no disponible",accion,ultimoError);
    throw new Error(mensajeAmigable());
  }

  function instalar(){
    if(window.MV547_MAPA_FUNCIONES_PARCHEADAS)return true;
    if(typeof window.moApiLectura!=="function"||typeof window.moCargarCatalogos!=="function"||typeof window.moConsultarMapa!=="function")return false;

    const catalogosOriginal=window.moCargarCatalogos;
    const consultarOriginal=window.moConsultarMapa;

    window.moApiLectura=lecturaResiliente;

    window.moCargarCatalogos=async function(){
      try{
        return await catalogosOriginal.apply(this,arguments);
      }catch(e){
        console.warn("V547 Mapa: catálogo temporalmente no disponible",e);
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
        console.warn("V547 Mapa: consulta temporalmente no disponible",e);
        if(contador)contador.textContent=mensajeAmigable();
        return null;
      }
    };

    window.MV547_MAPA_FUNCIONES_PARCHEADAS=true;
    console.log("MI VISUAL V547: Mapa Operativo resiliente activo");
    return true;
  }

  /*
    mapa_operativo.js es lazy-load: V547 puede cargarse antes.
    Se mantiene una vigilancia muy liviana hasta que el módulo exista.
  */
  const timer=setInterval(()=>{
    if(instalar())clearInterval(timer);
  },1200);

  document.addEventListener("click",()=>{
    setTimeout(instalar,80);
    setTimeout(instalar,500);
    setTimeout(instalar,1400);
  },true);

  setTimeout(instalar,200);
})();
