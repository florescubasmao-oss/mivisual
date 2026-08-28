/* ============================================================
   MI VISUAL V517C - PUENTE DE COMPATIBILIDAD DESDE V517B

   Este archivo se conserva porque index.html de versiones previas ya lo carga.
   V517B deja de ejecutar su UX anterior para evitar conflicto con V517C.
   La unica responsabilidad de este puente es cargar GAR/VTR unificado V517C.

   NO modifica datos, backend, Ranking, Dashboard ni Produccion.
============================================================ */
(function(){
  "use strict";

  /* Marca V517B como atendido para impedir que otra copia antigua se reinicialice. */
  window.MV517B_VTRGAR_UX_OK = true;

  if(window.MV517C_GARVTR_UNIFICADO_OK) return;

  const SRC = "./js/vtr_gar_unificado_v517c.js?v=V517C-UNIFICADO-20260828-1";

  const existente = Array.from(document.scripts).find(function(s){
    return String(s.src || "").includes("vtr_gar_unificado_v517c.js");
  });
  if(existente) return;

  const s = document.createElement("script");
  s.src = SRC;
  s.async = false;
  s.onload = function(){
    console.log("MI VISUAL V517C: GAR/VTR unificado cargado desde puente V517B.");
  };
  s.onerror = function(){
    console.error("MI VISUAL V517C: no se pudo cargar el frontend unificado.");
  };
  document.head.appendChild(s);
})();
