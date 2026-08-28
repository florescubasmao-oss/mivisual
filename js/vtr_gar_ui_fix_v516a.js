/* ============================================================
   MI VISUAL V516A - VTR/GAR UI ROBUSTA

   Alcance estricto de interfaz:
   - Mantiene una sola barra Registro / Validacion.
   - Periodo, Sede y Caso se muestran/ocultan con clase propia.
   - No depende del atributo nativo open de <details>.
   - No modifica API, datos, Ranking, Dashboard, Produccion ni backend V515.
============================================================ */
(function(){
  "use strict";
  if(window.MV516A_VTRGAR_UI_OK) return;
  window.MV516A_VTRGAR_UI_OK = true;

  let timer = null;

  function instalarCss(){
    if(document.getElementById("mv516a-vtrgar-ui-css")) return;
    const s = document.createElement("style");
    s.id = "mv516a-vtrgar-ui-css";
    s.textContent = `
      #mv501VtrGarNav,.mv501-vtrgar-nav{display:none!important;}
      .mv489-month>summary,.mv501-sede>summary,.mv489-case>summary{cursor:pointer!important;user-select:none;}

      details.mv489-month > .mv489-month-body{display:none!important;}
      details.mv489-month.mv516a-open > .mv489-month-body{display:grid!important;}

      details.mv501-sede > .mv501-sede-body{display:none!important;}
      details.mv501-sede.mv516a-open > .mv501-sede-body{display:grid!important;}

      details.mv489-case > .mv489-detail{display:none!important;}
      details.mv489-case.mv516a-open > .mv489-detail{display:block!important;}

      details.mv489-month>summary::-webkit-details-marker,
      details.mv501-sede>summary::-webkit-details-marker,
      details.mv489-case>summary::-webkit-details-marker{display:none!important;}
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

  function prepararDetalle(det){
    if(!det || !det.matches("details.mv489-month,details.mv501-sede,details.mv489-case")) return;

    // Se mantiene open=true solo para neutralizar la regla nativa de <details>.
    // La visibilidad real la controla exclusivamente mv516a-open.
    det.open = true;

    if(det.dataset.mv516aInit !== "1"){
      det.dataset.mv516aInit = "1";
      det.classList.remove("mv516a-open");
    }
  }

  function aplicar(){
    instalarCss();
    unaSolaBarra();
    if(window.MV488_VT_MODO !== "VTRGAR") return;
    document.querySelectorAll("details.mv489-month,details.mv501-sede,details.mv489-case").forEach(prepararDetalle);
  }

  function programar(){
    clearTimeout(timer);
    timer = setTimeout(aplicar,15);
  }

  document.addEventListener("click",function(ev){
    const summary = ev.target && ev.target.closest ? ev.target.closest("summary") : null;
    if(!summary) return;
    const det = summary.parentElement;
    if(!det || !det.matches("details.mv489-month,details.mv501-sede,details.mv489-case")) return;
    if(window.MV488_VT_MODO !== "VTRGAR" || !document.querySelector(".mv489-wrap")) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    det.open = true;
    det.classList.toggle("mv516a-open");
  },true);

  if(document.body){
    const obs = new MutationObserver(function(muts){
      if(window.MV488_VT_MODO !== "VTRGAR") return;
      for(const m of muts){
        if((m.addedNodes && m.addedNodes.length) || m.type === "childList"){
          programar();
          return;
        }
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){ setTimeout(aplicar,40); },false);
  setTimeout(aplicar,80);
  setTimeout(aplicar,300);
  setTimeout(aplicar,900);
})();
