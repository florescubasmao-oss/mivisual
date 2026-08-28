/* ============================================================
   MI VISUAL V517C.2 - PUENTE DE COMPATIBILIDAD DESDE V517B

   Este archivo se conserva porque index.html ya lo carga.
   Las UX V517B/V517C/V517C.1 quedan desplazadas por V517C.2.
   V517C.2 recupera histórico, OBSERVADO y presentación compacta.

   NO modifica datos, backend, Ranking, Dashboard, Producción ni Recableado.
============================================================ */
(function(){
  "use strict";
  window.MV517B_VTRGAR_UX_OK = true;
  window.MV517C1_GARVTR_GESTION_OK = true;

  if(window.MV517C2_GARVTR_GESTION_OK) return;

  const SRC = "./js/vtr_gar_gestion_v517c2.js?v=V517C2-HISTORICO-OBSERVADO-20260828-1";
  const existente = Array.from(document.scripts).find(function(s){
    return String(s.src || "").includes("vtr_gar_gestion_v517c2.js");
  });
  if(existente) return;

  const s = document.createElement("script");
  s.src = SRC;
  s.async = false;
  s.onload = function(){
    console.log("MI VISUAL V517C.2: histórico + OBSERVADO cargado.");
  };
  s.onerror = function(){
    console.error("MI VISUAL V517C.2: no se pudo cargar la gestión GAR/VTR.");
  };
  document.head.appendChild(s);
})();