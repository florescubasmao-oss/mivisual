/* ================================================================
   MI VISUAL V486 - Loader lazy de fuente completa por periodo
   - No carga nada adicional en el inicio.
   - Espera a que base_operativa.js se cargue en Administracion.
   - Luego activa una sola vez base_operativa_fuente_periodo_v486.js.
================================================================ */
(function(){
  "use strict";
  if(window.MV486_FUENTE_PERIODO_LOADER) return;
  window.MV486_FUENTE_PERIODO_LOADER = true;

  const RUTA_BASE = "js/base_operativa.js";
  const RUTA_V486 = "./js/base_operativa_fuente_periodo_v486.js?v=V486-FUENTE-PERIODO";
  let cargando = false;
  let listo = false;

  function baseLista(){ return typeof window.mostrarActualizarBaseOperativa === "function"; }

  function cargarV486(){
    if(listo || cargando || !baseLista()) return;
    if(Array.from(document.scripts).some(s => (s.src || "").includes("base_operativa_fuente_periodo_v486.js"))){ listo = true; return; }
    cargando = true;
    const s = document.createElement("script");
    s.src = RUTA_V486;
    s.async = true;
    s.onload = function(){ listo = true; cargando = false; };
    s.onerror = function(){ cargando = false; console.warn("V486: no se pudo cargar fuente por periodo"); };
    document.head.appendChild(s);
  }

  function revisarScript(script){
    if(!script || script.tagName !== "SCRIPT") return;
    const src = script.getAttribute("src") || "";
    if(!src.includes(RUTA_BASE)) return;
    if(baseLista()) cargarV486();
    else script.addEventListener("load",function(){setTimeout(cargarV486,0);},{once:true});
  }

  Array.from(document.scripts).forEach(revisarScript);
  const obs = new MutationObserver(function(muts){
    muts.forEach(function(m){m.addedNodes.forEach(function(n){if(n&&n.tagName==="SCRIPT")revisarScript(n);});});
    if(listo){try{obs.disconnect();}catch(_){}}
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(function(){if(baseLista())cargarV486();},0);
})();
