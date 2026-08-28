/* ============================================================
   MI VISUAL V517C.8 - PUENTE GAR/VTR
   Orden de carga controlado:
   1) UX/rendimiento V517C.3
   2) compatibilidad histórica VALIDACION_TECNICA
   3) gestión V517C.2 con histórico + OBSERVADO
   4) días entre último antecedente FINALIZADO y GAR/VTR actual
   5) motivo WIN + bono excepcional sin registro técnico
   6) usabilidad simple + ficha por GET + filtros reversibles
   7) estabilidad post-guardado + snapshot local + reintento backend
   8) guardado único: responsabilidad + bono/observación/excepción

   NO modifica Ranking, Dashboard, Producción ni Recableado.
============================================================ */
(function(){
  "use strict";
  window.MV517B_VTRGAR_UX_OK=true;
  window.MV517C1_GARVTR_GESTION_OK=true;

  function cargar(src,id){
    return new Promise(function(resolve,reject){
      if(window[id]){resolve();return;}
      const base=src.split("?")[0];
      const existe=Array.from(document.scripts).find(s=>String(s.src||"").includes(base));
      if(existe){
        if(window[id]){resolve();return;}
        existe.addEventListener("load",resolve,{once:true});
        existe.addEventListener("error",reject,{once:true});
        setTimeout(function(){if(window[id])resolve();},60);
        return;
      }
      const s=document.createElement("script");
      s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  cargar("./js/vtr_gar_ux_v517c3.js?v=V517C3-UX-RAPIDA-20260828-1","MV517C3_UX_RAPIDA_OK")
    .then(()=>cargar("./js/vtr_gar_legacy_assoc_v517c2a.js?v=V517C2A-LEGACY-20260828-1","MV517C2A_LEGACY_ASSOC_OK"))
    .then(()=>cargar("./js/vtr_gar_gestion_v517c2.js?v=V517C2-HISTORICO-OBSERVADO-20260828-1","MV517C2_GARVTR_GESTION_OK"))
    .then(()=>cargar("./js/vtr_gar_antecedente_dias_v517c4.js?v=V517C4-ANTECEDENTE-DIAS-20260828-1","MV517C4_ANTECEDENTE_DIAS_OK"))
    .then(()=>cargar("./js/vtr_gar_bono_excepcion_v517c5.js?v=V517C5-MOTIVO-BONO-EXCEPCION-20260828-1","MV517C5_BONO_EXCEPCION_OK"))
    .then(()=>cargar("./js/vtr_gar_usabilidad_v517c6.js?v=V517C6-USABILIDAD-20260828-1","MV517C6_USABILIDAD_OK"))
    .then(()=>cargar("./js/vtr_gar_estabilidad_v517c7.js?v=V517C7-ESTABILIDAD-20260828-1","MV517C7_ESTABILIDAD_OK"))
    .then(()=>cargar("./js/vtr_gar_guardado_unico_v517c8.js?v=V517C8-GUARDADO-UNICO-20260828-1","MV517C8_GUARDADO_UNICO_OK"))
    .then(()=>console.log("MI VISUAL V517C.8: GAR/VTR cargado."))
    .catch(e=>console.error("MI VISUAL V517C.8: error de carga",e));
})();
