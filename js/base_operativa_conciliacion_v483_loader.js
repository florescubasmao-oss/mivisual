/* ================================================================
   MI VISUAL V483 - Loader lazy de conciliacion Base Operativa
   - No carga el diagnostico en el inicio.
   - Espera a que base_operativa.js se cargue en Administracion.
   - Luego carga una sola vez base_operativa_conciliacion_v483.js.
================================================================ */
(function(){
  "use strict";
  if(window.MV483_CONCILIACION_LOADER) return;
  window.MV483_CONCILIACION_LOADER = true;

  const RUTA_BASE = "js/base_operativa.js";
  const RUTA_V483 = "./js/base_operativa_conciliacion_v483.js?v=V483-SOLO-DIAGNOSTICO";
  let cargando = false;
  let listo = false;

  function baseLista(){
    return typeof window.mostrarActualizarBaseOperativa === "function";
  }

  function cargarV483(){
    if(listo || cargando || !baseLista()) return;
    if(Array.from(document.scripts).some(s => (s.src || "").includes("base_operativa_conciliacion_v483.js"))){
      listo = true;
      return;
    }
    cargando = true;
    const s = document.createElement("script");
    s.src = RUTA_V483;
    s.async = true;
    s.onload = function(){ listo = true; cargando = false; };
    s.onerror = function(){ cargando = false; console.warn("V483: no se pudo cargar conciliacion"); };
    document.head.appendChild(s);
  }

  function revisarScript(script){
    if(!script || script.tagName !== "SCRIPT") return;
    const src = script.getAttribute("src") || "";
    if(!src.includes(RUTA_BASE)) return;
    if(baseLista()){
      cargarV483();
    }else{
      script.addEventListener("load", function(){ setTimeout(cargarV483,0); }, {once:true});
    }
  }

  Array.from(document.scripts).forEach(revisarScript);

  const obs = new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n && n.tagName === "SCRIPT") revisarScript(n);
      });
    });
    if(listo){ try{ obs.disconnect(); }catch(_){} }
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});

  // Si Administracion ya estaba cargada antes que este loader.
  setTimeout(function(){ if(baseLista()) cargarV483(); },0);
})();
