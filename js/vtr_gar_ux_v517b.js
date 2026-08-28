/* ============================================================
   MI VISUAL V517C.1 - PUENTE DE COMPATIBILIDAD DESDE V517B

   Este archivo se conserva porque index.html ya lo carga.
   V517B y V517C anteriores dejan de ejecutar su UX para evitar conflictos.
   La única responsabilidad de este puente es cargar V517C.1.

   NO modifica datos, backend, Ranking, Dashboard, Producción ni Recableado.
============================================================ */
(function(){
  "use strict";
  window.MV517B_VTRGAR_UX_OK = true;

  if(window.MV517C1_GARVTR_GESTION_OK) return;

  const SRC = "./js/vtr_gar_gestion_v517c1.js?v=V517C1-GESTION-LIMPIA-20260828-1";
  const existente = Array.from(document.scripts).find(function(s){
    return String(s.src || "").includes("vtr_gar_gestion_v517c1.js");
  });
  if(existente) return;

  const s = document.createElement("script");
  s.src = SRC;
  s.async = false;
  s.onload = function(){
    console.log("MI VISUAL V517C.1: gestión GAR/VTR limpia cargada.");
  };
  s.onerror = function(){
    console.error("MI VISUAL V517C.1: no se pudo cargar la gestión GAR/VTR limpia.");
  };
  document.head.appendChild(s);
})();
