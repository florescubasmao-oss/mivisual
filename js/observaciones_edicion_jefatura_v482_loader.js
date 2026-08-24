/* ============================================================
   MI VISUAL V482 - BOOTSTRAP EDICION OBSERVACIONES
   - Carga la capa de edición solo al abrir Observaciones.
   - Solo para JEFATURA / JEFATURA GENERAL.
   - Mantiene intacta la carga lazy y las optimizaciones V447/V458/V459.
============================================================ */
(function(){
  "use strict";

  if(window.MV482_OBSERVACIONES_LOADER_OK) return;
  window.MV482_OBSERVACIONES_LOADER_OK = true;

  const URL = "./js/observaciones_edicion_jefatura_v482.js?v=V482-EDICION-CONTROLADA";
  let promesa = null;

  function normal(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function perfilPermitido(){
    const p = normal(localStorage.getItem("perfil") || "");
    return p === "JEFATURA" || p === "JEFATURA GENERAL";
  }

  function cargar(){
    if(!perfilPermitido()) return Promise.resolve(false);
    if(window.MV482_OBSERVACIONES_EDICION_OK) return Promise.resolve(true);
    if(promesa) return promesa;

    promesa = new Promise(function(resolve,reject){
      const existente = Array.from(document.scripts).find(function(s){
        return s.src && s.src.includes("observaciones_edicion_jefatura_v482.js");
      });
      if(existente){
        if(window.MV482_OBSERVACIONES_EDICION_OK) return resolve(true);
        existente.addEventListener("load",function(){ resolve(true); },{once:true});
        existente.addEventListener("error",function(){ reject(new Error("No se pudo cargar edición de Observaciones.")); },{once:true});
        return;
      }

      const script = document.createElement("script");
      script.src = URL;
      script.async = true;
      script.onload = function(){ resolve(true); };
      script.onerror = function(){
        promesa = null;
        reject(new Error("No se pudo cargar edición de Observaciones."));
      };
      document.head.appendChild(script);
    });

    return promesa;
  }

  const anterior = window.mv339Antes_mostrarObservaciones;
  window.mv339Antes_mostrarObservaciones = function(){
    if(typeof anterior === "function"){
      try{ anterior.apply(this,arguments); }catch(_){}
    }
    cargar().catch(function(e){ console.warn("V482:",e); });
  };

  // Si el módulo ya está abierto al actualizar la web, intenta activarlo sin recargar datos.
  if(document.getElementById("listaObservaciones")){
    cargar().catch(function(e){ console.warn("V482:",e); });
  }
})();
