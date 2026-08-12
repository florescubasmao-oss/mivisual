/* ============================================================
   MI VISUAL V395 - MAPA OPERATIVO RÁPIDO
   FRONTEND

   - Leaflet carga al entrar al mapa.
   - XLSX NO carga al entrar: solo cuando se abre/lee una importación.
   - Caché corta en sesión para catálogos y última consulta.
   - Importar una nueva base limpia inmediatamente esa caché.
   - Marcadores numerosos se renderizan por bloques para no congelar UI.
============================================================ */
(function(){
  "use strict";
  if(window.MV395_MAPA_RAPIDO_OK) return;

  const dependenciasBase = window.moDependencias;
  const leerArchivoBase = window.moLeerArchivo;
  const apiLecturaBase = window.moApiLectura;
  const registrarBase = window.moRegistrarImportacion;
  const mostrarImportacionBase = window.moMostrarImportacion;
  const renderBase = window.moRenderMarcadores;

  const XLSX_URL =
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

  const CACHE_CAT = "MV395_MAPA_CAT";
  const CACHE_LIST = "MV395_MAPA_LIST";
  const TTL_CAT = 60000;
  const TTL_LIST = 45000;

  function cargarXlsxV395(){
    if(window.XLSX) return Promise.resolve(window.XLSX);
    if(typeof moCargarScript!=="function"){
      return Promise.reject(new Error("No se encontró el cargador de Excel."));
    }
    return moCargarScript(XLSX_URL,"XLSX");
  }

  // Entrada al Mapa: Leaflet sí, XLSX no.
  async function dependenciasV395(){
    if(typeof moCargarCss==="function"){
      moCargarCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    }

    if(!window.L){
      await moCargarScript(
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
        "L"
      );
    }

    return true;
  }

  function leerSesion(clave,ttl,keyEsperada){
    try{
      const raw=sessionStorage.getItem(clave);
      if(!raw) return null;

      const obj=JSON.parse(raw);
      if(!obj || !obj.ts || (Date.now()-obj.ts)>ttl) return null;
      if(keyEsperada!==undefined && obj.key!==keyEsperada) return null;

      return obj.data||null;
    }catch(_){
      return null;
    }
  }

  function guardarSesion(clave,key,data){
    try{
      sessionStorage.setItem(
        clave,
        JSON.stringify({ts:Date.now(),key:key,data:data})
      );
    }catch(_){}
  }

  function limpiarCacheV395(){
    try{
      sessionStorage.removeItem(CACHE_CAT);
      sessionStorage.removeItem(CACHE_LIST);
    }catch(_){}
  }

  function clavePayload(payload){
    const p=payload||{};
    return JSON.stringify({
      accion:p.accion||"",
      usuario:p.usuario||"",
      periodo:p.periodo||"",
      sede:p.sede||"",
      fecha:p.fecha||"",
      grupoTrabajo:p.grupoTrabajo||"",
      estado:p.estado||"",
      cuadrilla:p.cuadrilla||"",
      codigo:p.codigo||""
    });
  }

  async function apiLecturaV395(payload){
    const accion=payload?.accion||"";

    if(accion==="catalogosMapaOperativo"){
      const key=clavePayload(payload);
      const cache=leerSesion(CACHE_CAT,TTL_CAT,key);
      if(cache) return cache;

      const data=await apiLecturaBase(payload);
      guardarSesion(CACHE_CAT,key,data);
      return data;
    }

    if(accion==="listarMapaOperativo"){
      const key=clavePayload(payload);
      const cache=leerSesion(CACHE_LIST,TTL_LIST,key);
      if(cache) return cache;

      const data=await apiLecturaBase(payload);
      guardarSesion(CACHE_LIST,key,data);
      return data;
    }

    return await apiLecturaBase(payload);
  }

  async function leerArchivoV395(){
    const msg=document.getElementById("moImportMsg");

    try{
      if(!window.XLSX){
        if(msg){
          msg.className="mo-msg";
          msg.textContent="Preparando lector Excel...";
        }
        await cargarXlsxV395();
      }

      return await leerArchivoBase.apply(this,arguments);

    }catch(error){
      if(msg){
        msg.className="mo-msg mo-error";
        msg.textContent=error?.message||"No se pudo preparar el lector Excel.";
      }
      throw error;
    }
  }

  function mostrarImportacionV395(){
    const resultado=mostrarImportacionBase.apply(this,arguments);

    // Precarga en segundo plano porque el usuario ya mostró intención de importar.
    setTimeout(()=>{
      cargarXlsxV395().catch(()=>{});
    },80);

    return resultado;
  }

  async function registrarV395(){
    const resultado=await registrarBase.apply(this,arguments);

    // El wrapper V393 no retorna el JSON, pero al terminar correctamente
    // moImportacion queda vacío. Limpiamos caché siempre: es barato y seguro.
    limpiarCacheV395();
    return resultado;
  }

  // Render progresivo para consultas amplias.
  function renderMarcadoresV395(lista){
    if(
      !Array.isArray(lista) ||
      lista.length < 90 ||
      !window.L ||
      !window.moMapa ||
      !window.moCapa
    ){
      return renderBase.apply(this,arguments);
    }

    const sec=(window.MV395_MAPA_RENDER_SEQ||0)+1;
    window.MV395_MAPA_RENDER_SEQ=sec;

    moOcultarCtos();
    if(moCapaCatalogoCto) moCapaCatalogoCto.clearLayers();
    moCatalogoCtoVisible=false;
    moCapa.clearLayers();
    moMarcadores={};

    const bounds=[];
    let validos=0;
    let indice=0;
    const lote=45;

    moConstruirEstilosCuadrillas(
      (lista||[]).map(x=>x.cuadrilla)
    );

    const contador=document.getElementById("moContador");
    if(contador){
      contador.textContent=`Preparando ${lista.length} órdenes...`;
    }

    function finalizar(){
      if(window.MV395_MAPA_RENDER_SEQ!==sec) return;

      if(bounds.length){
        moMapa.fitBounds(bounds,{padding:[25,25],maxZoom:16});
      }

      setTimeout(moAplicarModoZoomEtiquetas,0);

      if(contador){
        contador.innerHTML=
          `${validos} puntos visibles de ${lista.length} órdenes filtradas.`+
          `<div class="mo-leyenda">`+
          `<span><i style="--c:#16a34a"></i>Finalizada</span>`+
          `<span><i style="--c:#dc2626"></i>Cancelada</span>`+
          `<span><i style="--c:#eab308"></i>Reprogramada</span>`+
          `<span><i style="--c:#f97316"></i>Regestión</span>`+
          `<span><i style="--c:#64748b"></i>Anulada</span>`+
          `<span><i style="--c:#2563eb"></i>Pendiente/Agendada</span>`+
          `<span><i style="--c:#7c3aed"></i>En proceso</span>`+
          `</div>${moLeyendaCuadrillas(lista)}`;
      }
    }

    function siguiente(){
      if(window.MV395_MAPA_RENDER_SEQ!==sec) return;

      const fin=Math.min(indice+lote,lista.length);

      for(;indice<fin;indice++){
        const x=lista[indice];
        const lat=Number(x.latitud);
        const lng=Number(x.longitud);

        if(!Number.isFinite(lat)||!Number.isFinite(lng)) continue;

        const ordenId=moNorm(x.ordenId);
        const m=L.marker(
          [lat,lng],
          {
            icon:moIconoEstado(x.estado,x.cuadrilla),
            riseOnHover:true
          }
        ).bindPopup(
          moPopup(x),
          {autoClose:true,closeOnClick:true,maxWidth:310}
        );

        m._moOrdenId=ordenId;
        m._moRegistro=x;

        m.on("click",()=>{
          if(moOrdenCtoVisible && moOrdenCtoVisible!==ordenId){
            moOcultarCtos();
          }
          moMapa.panTo([lat,lng]);
        });

        m.on("popupclose",()=>{
          if(moOrdenCtoVisible===ordenId) moOcultarCtos();
        });

        m.addTo(moCapa);
        moMarcadores[ordenId]=m;
        bounds.push([lat,lng]);
        validos++;
      }

      if(contador){
        contador.textContent=
          `Mostrando mapa... ${Math.min(indice,lista.length)} de ${lista.length} órdenes`;
      }

      if(indice<lista.length){
        requestAnimationFrame(siguiente);
      }else{
        finalizar();
      }
    }

    requestAnimationFrame(siguiente);
  }

  if(typeof dependenciasBase==="function"){
    window.moDependencias=dependenciasV395;
    try{moDependencias=dependenciasV395}catch(_){}
  }

  if(typeof apiLecturaBase==="function"){
    window.moApiLectura=apiLecturaV395;
    try{moApiLectura=apiLecturaV395}catch(_){}
  }

  if(typeof leerArchivoBase==="function"){
    window.moLeerArchivo=leerArchivoV395;
    try{moLeerArchivo=leerArchivoV395}catch(_){}
  }

  if(typeof mostrarImportacionBase==="function"){
    window.moMostrarImportacion=mostrarImportacionV395;
    try{moMostrarImportacion=mostrarImportacionV395}catch(_){}
  }

  if(typeof registrarBase==="function"){
    window.moRegistrarImportacion=registrarV395;
    try{moRegistrarImportacion=registrarV395}catch(_){}
  }

  if(typeof renderBase==="function"){
    window.moRenderMarcadores=renderMarcadoresV395;
    try{moRenderMarcadores=renderMarcadoresV395}catch(_){}
  }

  window.MV395_MAPA_RAPIDO_OK=true;
  console.log("MI VISUAL V395: Mapa Operativo rápido habilitado.");
})();