/* ============================================================
   MI VISUAL V490 - PUENTE COMPATIBILIDAD V487.25

   La antigua pantalla separada "Gestion VTR/GAR" se retira.
   V489 integra Registro + Validacion en un solo submodulo.

   Se conservan estas banderas/funciones para que V481/V488 no fallen.
   No realiza llamadas API ni modifica datos.
============================================================ */
(function(){
  "use strict";

  window.MI_VISUAL_V48725_VTRGAR_VT_ACTIVO = true;

  window.mv48725MontarVtrGarValidacion = function(){
    // Compatibilidad: V489 controla la experiencia unificada.
    return true;
  };

  // La limpieza V490 se carga solo cuando entra Validacion Tecnica.
  if(window.MV490_VT_LIMPIEZA_OK) return;
  if(document.querySelector('script[data-mv490="1"]')) return;

  const s = document.createElement("script");
  s.src = "./js/validacion_tecnica_limpieza_v490.js?v=V490-20260826";
  s.async = true;
  s.dataset.mv490 = "1";
  s.onerror = function(){
    console.warn("MI VISUAL V490: no se pudo cargar la limpieza visual.");
  };
  document.head.appendChild(s);
})();
