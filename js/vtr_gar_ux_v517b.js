/* ============================================================
   MI VISUAL V517C.2A - PUENTE DE COMPATIBILIDAD DESDE V517B

   Orden de carga controlado:
   1) compatibilidad histórica de VALIDACION_TECNICA (solo lectura)
   2) gestión V517C.2 con OBSERVADO + ficha histórica + interfaz compacta

   NO modifica datos, backend, Ranking, Dashboard, Producción ni Recableado.
============================================================ */
(function(){
  "use strict";
  window.MV517B_VTRGAR_UX_OK = true;
  window.MV517C1_GARVTR_GESTION_OK = true;

  function cargar(src,id){
    return new Promise(function(resolve,reject){
      if(window[id]){resolve();return;}
      const existe=Array.from(document.scripts).find(function(s){return String(s.src||"").includes(src.split("?")[0]);});
      if(existe){
        if(window[id]){resolve();return;}
        existe.addEventListener("load",resolve,{once:true});
        existe.addEventListener("error",reject,{once:true});
        setTimeout(function(){if(window[id])resolve();},50);
        return;
      }
      const s=document.createElement("script");
      s.src=src;s.async=false;
      s.onload=resolve;s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  cargar("./js/vtr_gar_legacy_assoc_v517c2a.js?v=V517C2A-LEGACY-20260828-1","MV517C2A_LEGACY_ASSOC_OK")
    .then(function(){
      return cargar("./js/vtr_gar_gestion_v517c2.js?v=V517C2-HISTORICO-OBSERVADO-20260828-1","MV517C2_GARVTR_GESTION_OK");
    })
    .then(function(){console.log("MI VISUAL V517C.2A: GAR/VTR histórico cargado.");})
    .catch(function(e){console.error("MI VISUAL V517C.2A: error de carga",e);});
})();