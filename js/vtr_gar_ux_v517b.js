/* ============================================================
   MI VISUAL V517D - PUENTE GAR/VTR + ETIQUETAS CLARAS
   Base intacta: V517C.19.
   Ajuste visual únicamente:
   - NO cambia valores internos ni acciones GAR/VTR.
   - NO modifica backend, Produccion, Ranking, Dashboard ni Recableado.
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

  function claveEtiqueta_(valor){
    return String(valor==null?"":valor).trim().toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ");
  }

  function aplicarEtiquetasClarasGarVtr_(){
    const cambios={
      "MANTENER RESPONSABILIDAD ACTUAL":"Sin cambios",
      "SIN CAMBIAR RESPONSABILIDAD":"Sin cambios",
      "CUADRILLA EJECUTORA / PROPIA":"SÍ ES GAR/VTR — Responsable: cuadrilla ejecutora",
      "CONFIRMAR RESPONSABILIDAD EN LA CUADRILLA EJECUTORA":"SÍ ES GAR/VTR — Responsable: cuadrilla ejecutora",
      "OTRA CUADRILLA / REASIGNADA":"SÍ ES GAR/VTR — Responsable: otra cuadrilla",
      "ASIGNAR RESPONSABILIDAD A OTRA CUADRILLA":"SÍ ES GAR/VTR — Responsable: otra cuadrilla",
      "NO CORRESPONDE A GAR/VTR":"NO ES GAR/VTR — Contar como producción normal"
    };
    document.querySelectorAll("select option").forEach(function(op){
      const nuevo=cambios[claveEtiqueta_(op.textContent)];
      if(nuevo) op.textContent=nuevo;
    });
  }

  function programarEtiquetasClaras_(){
    setTimeout(aplicarEtiquetasClarasGarVtr_,0);
    setTimeout(aplicarEtiquetasClarasGarVtr_,80);
    setTimeout(aplicarEtiquetasClarasGarVtr_,220);
  }

  if(!window.MV517D_ETIQUETAS_GARVTR_OK){
    window.MV517D_ETIQUETAS_GARVTR_OK=true;
    document.addEventListener("click",function(ev){
      const boton=ev.target&&ev.target.closest?ev.target.closest("button"):null;
      if(!boton) return;
      const texto=claveEtiqueta_(boton.textContent);
      if(texto.indexOf("CORREGIR VALIDACION")>=0 || texto.indexOf("GESTIONAR CASO")>=0){
        programarEtiquetasClaras_();
      }
    },false);
  }

  cargar("./js/vtr_gar_ux_v517c3.js?v=V517C3-UX-RAPIDA-20260828-1","MV517C3_UX_RAPIDA_OK")
    .then(()=>cargar("./js/vtr_gar_legacy_assoc_v517c2a.js?v=V517C2A-LEGACY-20260828-1","MV517C2A_LEGACY_ASSOC_OK"))
    .then(()=>cargar("./js/vtr_gar_gestion_v517c2.js?v=V517C2-HISTORICO-OBSERVADO-20260828-1","MV517C2_GARVTR_GESTION_OK"))
    .then(()=>cargar("./js/vtr_gar_antecedente_dias_v517c4.js?v=V517C4-ANTECEDENTE-DIAS-20260828-1","MV517C4_ANTECEDENTE_DIAS_OK"))
    .then(()=>cargar("./js/vtr_gar_bono_excepcion_v517c5.js?v=V517C18-NO-BONO-SIN-REGISTRO-20260828-1","MV517C5_BONO_EXCEPCION_OK"))
    .then(()=>cargar("./js/vtr_gar_usabilidad_v517c6.js?v=V517C6-USABILIDAD-20260828-1","MV517C6_USABILIDAD_OK"))
    .then(()=>cargar("./js/vtr_gar_estabilidad_v517c7.js?v=V517C17-SYNC-CACHE-20260828-1","MV517C7_ESTABILIDAD_OK"))
    .then(()=>cargar("./js/vtr_gar_sin_registro_v517c16b.js?v=V517C18-NO-BONO-ACTUAL-20260828-1","MV517C16B_SIN_REGISTRO_OK"))
    .then(()=>cargar("./js/vtr_gar_guardado_unico_v517c8.js?v=V517C16-1-GUARDADO-REGLA-20260828-1","MV517C8_GUARDADO_UNICO_OK"))
    .then(()=>cargar("./js/vtr_gar_partida_actual_v517c9.js?v=V517C9-PARTIDA-ORDEN-ACTUAL-20260828-2","MV517C9_PARTIDA_ACTUAL_OK"))
    .then(()=>cargar("./js/vtr_gar_correccion_handler_v517c16.js?v=V517C16-CORRECCION-HANDLER-20260828-1","MV517C16_CORRECCION_HANDLER_OK"))
    .then(()=>cargar("./js/vtr_gar_compacto_v517c12.js?v=V517C19-COMPACTO-ACCIONES-20260828-1","MV517C19_COMPACTO_OK"))
    .then(()=>cargar("./js/vtr_gar_regla_puntos_v517d.js?v=V517D-F4G-FRONT-20260829-1","MV517D_F4G_FRONT_OK"))
    .then(()=>{
      if(typeof window.mv517c12Ejecutar==="function")window.mv517c12Ejecutar();
      programarEtiquetasClaras_();
      console.log("MI VISUAL V517D F4G: GAR/VTR + Bono/Puntos condicionados activos; lógica V517C.19 conservada.");
    })
    .catch(e=>console.error("MI VISUAL V517D F4G: error de carga",e));
})();