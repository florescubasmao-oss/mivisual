/* ================================================================
   MI VISUAL V484 - Loader lazy Estado Reciente Mapa Operativo
   - No carga V484 en el inicio.
   - Espera a que mapa_operativo.js se descargue al abrir el modulo.
   - Luego carga una sola vez mapa_estado_reciente_v484.js.
================================================================ */
(function(){
  "use strict";
  if(window.MV484_MAPA_ESTADO_LOADER) return;
  window.MV484_MAPA_ESTADO_LOADER = true;

  const RUTA_BASE = "js/mapa_operativo.js";
  const RUTA_V484 = "./js/mapa_estado_reciente_v484.js?v=V484-FECHA-ULTIMA-ESTADO";
  let cargando=false;
  let listo=false;

  function baseLista(){
    return typeof window.moLeerArchivo === "function" &&
           typeof window.moRegistrarImportacion === "function";
  }

  function cargarV484(){
    if(listo || cargando || !baseLista()) return;
    if(Array.from(document.scripts).some(s => (s.src || "").includes("mapa_estado_reciente_v484.js"))){
      listo=true;
      return;
    }
    cargando=true;
    const s=document.createElement("script");
    s.src=RUTA_V484;
    s.async=true;
    s.onload=function(){listo=true;cargando=false;};
    s.onerror=function(){cargando=false;console.warn("V484: no se pudo cargar proteccion de estado reciente");};
    document.head.appendChild(s);
  }

  function revisarScript(script){
    if(!script || script.tagName!=="SCRIPT") return;
    const src=script.getAttribute("src") || "";
    if(!src.includes(RUTA_BASE)) return;
    if(baseLista()) cargarV484();
    else script.addEventListener("load",function(){setTimeout(cargarV484,0);},{once:true});
  }

  Array.from(document.scripts).forEach(revisarScript);

  const obs=new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n && n.tagName==="SCRIPT") revisarScript(n);
      });
    });
    if(listo){try{obs.disconnect();}catch(_){}}
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(function(){if(baseLista()) cargarV484();},0);
})();
