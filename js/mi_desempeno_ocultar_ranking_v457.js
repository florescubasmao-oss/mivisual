/* ============================================================
   MI VISUAL V457 - Ocultar "Ver Ranking completo" en Mi Desempeño del Técnico
   Alcance:
   - Solo en la vista Mi Desempeño del perfil Técnico.
   - No modifica datos, cálculos ni el módulo Ranking.
   - Mantiene las tarjetas de Región / Sede / Plataforma.
============================================================ */
(function(){
  "use strict";

  if(window.MV457_OCULTAR_RANKING_TEC_OK) return;
  window.MV457_OCULTAR_RANKING_TEC_OK = true;

  function esTecnico(){
    const perfil = String(localStorage.getItem("perfil") || "").trim().toUpperCase();
    return perfil === "TECNICO" || perfil === "TÉCNICO";
  }

  function ocultarBotonRankingTecnico(){
    if(!esTecnico()) return;
    const pantalla = document.getElementById("pantalla");
    if(!pantalla) return;

    const titulo = pantalla.querySelector("h2");
    if(!titulo || !/MI\s+DESEMPEÑO/i.test((titulo.textContent || "").trim())) return;

    Array.from(pantalla.querySelectorAll("button")).forEach(btn => {
      const texto = (btn.textContent || "").replace(/\s+/g," ").trim().toUpperCase();
      if(texto === "VER RANKING COMPLETO") btn.style.display = "none";
    });
  }

  const mostrarPantallaBase = window.mostrarPantalla;
  if(typeof mostrarPantallaBase === "function"){
    window.mostrarPantalla = function(){
      const r = mostrarPantallaBase.apply(this, arguments);
      setTimeout(ocultarBotonRankingTecnico, 0);
      setTimeout(ocultarBotonRankingTecnico, 120);
      return r;
    };
  }

  if(typeof MutationObserver === "function"){
    const objetivo = document.getElementById("pantalla") || document.body;
    const obs = new MutationObserver(ocultarBotonRankingTecnico);
    obs.observe(objetivo, {childList:true, subtree:true});
  }

  setTimeout(ocultarBotonRankingTecnico, 0);
})();

/* V517D F4V: carga segura de la optimizacion de Mi Desempeno Tecnico.
   Si el backend F4V aun no esta publicado, el archivo usa fallback automatico
   al flujo existente y no rompe la aplicacion. */
(function(){
  "use strict";
  if(window.MV517D_F4V_LOADER_OK) return;
  window.MV517D_F4V_LOADER_OK=true;
  if(document.querySelector('script[data-mv517d-f4v="1"]')) return;
  const s=document.createElement("script");
  s.src="./js/mi_desempeno_tecnico_v517d_f4v.js?v=V517D-F4V-DESEMPENO-RAPIDO-20260829-1";
  s.async=true;
  s.dataset.mv517dF4v="1";
  document.head.appendChild(s);
})();

/* V517D F4W: solo presentacion para Tecnico.
   - Reevalua el semaforo del dia usando el total ya visible con BONO GAR/VTR.
   - Oculta el bloque V515 duplicado porque el detalle ya esta dentro del dia.
   - No modifica ningun dato ni calculo. */
(function(){
  "use strict";
  if(window.MV517D_F4W_LOADER_OK) return;
  window.MV517D_F4W_LOADER_OK=true;
  if(document.querySelector('script[data-mv517d-f4w="1"]')) return;
  const s=document.createElement("script");
  s.src="./js/mi_desempeno_tecnico_v517d_f4w.js?v=V517D-F4W-SEMAFORO-BONO-20260829-1";
  s.async=true;
  s.dataset.mv517dF4w="1";
  document.head.appendChild(s);
})();
