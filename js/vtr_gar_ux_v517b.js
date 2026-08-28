/* ============================================================
   MI VISUAL V517C.17 - PUENTE UNICO GAR/VTR + CACHE SINCRONIZADA
   Orden de carga controlado:
   1) UX/rendimiento V517C.3
   2) compatibilidad historica VALIDACION_TECNICA
   3) gestion V517C.2 con historico + OBSERVADO
   4) dias entre antecedente y GAR/VTR
   5) motivo WIN + evaluacion Jefatura sin registro
   6) usabilidad + ficha por GET
   7) estabilidad V517C.17 + snapshot sincronizado
   8) restaurador FINALIZADA + SIN REGISTRO
   9) guardado unico
   10) partida de la orden actual bajo demanda
   11) manejador unico de correccion V517C.16
   12) vista compacta V517C.12 como unica capa de acciones

   Regla vigente:
   - SIN REGISTRO + NO BONO = NO BONO.
   - SIN REGISTRO + BONO = BONO · EXCEPCION.

   NO modifica Ranking, Dashboard, Produccion ni Recableado.
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
        setTimeout(function(){if(window[id])resolve();},80);
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
    .then(()=>cargar("./js/vtr_gar_bono_excepcion_v517c5.js?v=V517C16-1-EVAL-SIN-REGISTRO-20260828-1","MV517C5_BONO_EXCEPCION_OK"))
    .then(()=>cargar("./js/vtr_gar_usabilidad_v517c6.js?v=V517C6-USABILIDAD-20260828-1","MV517C6_USABILIDAD_OK"))
    .then(()=>cargar("./js/vtr_gar_estabilidad_v517c7.js?v=V517C17-SYNC-CACHE-20260828-1","MV517C7_ESTABILIDAD_OK"))
    .then(()=>cargar("./js/vtr_gar_sin_registro_v517c16b.js?v=V517C16B-SIN-REGISTRO-20260828-1","MV517C16B_SIN_REGISTRO_OK"))
    .then(()=>cargar("./js/vtr_gar_guardado_unico_v517c8.js?v=V517C16-1-GUARDADO-REGLA-20260828-1","MV517C8_GUARDADO_UNICO_OK"))
    .then(()=>cargar("./js/vtr_gar_partida_actual_v517c9.js?v=V517C9-PARTIDA-ORDEN-ACTUAL-20260828-2","MV517C9_PARTIDA_ACTUAL_OK"))
    .then(()=>cargar("./js/vtr_gar_correccion_handler_v517c16.js?v=V517C16-CORRECCION-HANDLER-20260828-1","MV517C16_CORRECCION_HANDLER_OK"))
    .then(()=>cargar("./js/vtr_gar_compacto_v517c12.js?v=V517C16-COMPACTO-ACCIONES-20260828-1","MV517C12_COMPACTO_OK"))
    .then(()=>{
      if(typeof window.mv517c12Ejecutar==="function")window.mv517c12Ejecutar();
      console.log("MI VISUAL V517C.17: GAR/VTR cache sincronizada.");
    })
    .catch(e=>console.error("MI VISUAL V517C.17: error de carga",e));
})();