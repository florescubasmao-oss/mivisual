/* ============================================================
   MI VISUAL V516 - VTR/GAR UI: TABS UNICAS + DESPLEGABLES

   Alcance estricto de interfaz:
   - Oculta la navegacion duplicada heredada de V501.
   - Conserva una sola barra Registro / Validacion (V489/V514A).
   - Fuerza apertura/cierre estable de Periodo, Sede y Caso.
   - No modifica API, datos, Ranking, Dashboard, Produccion ni backend V515.
============================================================ */
(function(){
  "use strict";
  if(window.MV516_VTRGAR_UI_OK) return;
  window.MV516_VTRGAR_UI_OK = true;

  let timer = null;

  function instalarCss(){
    if(document.getElementById("mv516-vtrgar-ui-css")) return;
    const s = document.createElement("style");
    s.id = "mv516-vtrgar-ui-css";
    s.textContent = `
      /* V501 crea una segunda barra. Se mantiene en DOM para evitar que
         su observer la vuelva a insertar, pero queda oculta visualmente. */
      #mv501VtrGarNav,.mv501-vtrgar-nav{display:none!important;}
      .mv489-month>summary,.mv501-sede>summary,.mv489-case>summary{cursor:pointer!important;user-select:none;}
    `;
    document.head.appendChild(s);
  }

  function unaSolaBarra(){
    const wrap = document.querySelector(".mv489-wrap");
    if(!wrap) return;

    const barras = Array.from(wrap.querySelectorAll(".mv489-tabs"));
    if(barras.length > 1){
      const conservar = wrap.querySelector("#mv489Tabs") || barras[0];
      barras.forEach(function(b){ if(b !== conservar) b.remove(); });
      if(conservar) conservar.id = "mv489Tabs";
    }

    const navV501 = document.getElementById("mv501VtrGarNav");
    if(navV501) navV501.setAttribute("aria-hidden","true");
  }

  function aplicar(){
    instalarCss();
    unaSolaBarra();
  }

  function programar(){
    clearTimeout(timer);
    timer = setTimeout(aplicar,20);
  }

  /*
     Hay versiones anteriores que interceptan/reconstruyen la vista VTR/GAR.
     En vez de depender del comportamiento nativo de <details>, V516 controla
     explicitamente el toggle de los tres niveles usados por Validacion.
  */
  document.addEventListener("click",function(ev){
    const summary = ev.target && ev.target.closest ? ev.target.closest("summary") : null;
    if(!summary) return;

    const det = summary.parentElement;
    if(!det || !det.matches("details.mv489-month,details.mv501-sede,details.mv489-case")) return;
    if(!document.querySelector(".mv489-wrap") || window.MV488_VT_MODO !== "VTRGAR") return;

    ev.preventDefault();
    ev.stopPropagation();
    det.open = !det.open;
  },true);

  if(document.body){
    const obs = new MutationObserver(function(muts){
      if(window.MV488_VT_MODO !== "VTRGAR") return;
      for(const m of muts){
        if(m.addedNodes && m.addedNodes.length){ programar(); return; }
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){ setTimeout(aplicar,50); },false);
  setTimeout(aplicar,100);
  setTimeout(aplicar,400);
  setTimeout(aplicar,1000);
})();
