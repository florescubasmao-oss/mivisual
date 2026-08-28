/* ============================================================
   MI VISUAL V516B - VTR/GAR UI PREEMPTIVA

   Alcance estricto de interfaz:
   - Mantiene una sola barra Registro / Validacion.
   - Abre/cierra Periodo, Sede y Caso desde pointerdown en window capture.
   - Muestra/oculta el cuerpo por style inline con !important.
   - No depende de <details open>, clases previas ni listeners click antiguos.
   - No modifica API, datos, Ranking, Dashboard, Produccion ni backend V515.
============================================================ */
(function(){
  "use strict";
  if(window.MV516B_VTRGAR_UI_OK) return;
  window.MV516B_VTRGAR_UI_OK = true;

  let timer = null;

  function cuerpo(det){
    if(!det) return null;
    if(det.classList.contains("mv489-month")) return det.querySelector(":scope > .mv489-month-body");
    if(det.classList.contains("mv501-sede")) return det.querySelector(":scope > .mv501-sede-body");
    if(det.classList.contains("mv489-case")) return det.querySelector(":scope > .mv489-detail");
    return null;
  }

  function displayAbierto(det){
    if(det.classList.contains("mv489-case")) return "block";
    return "grid";
  }

  function unaSolaBarra(){
    const wrap=document.querySelector(".mv489-wrap");
    if(!wrap) return;
    const barras=Array.from(wrap.querySelectorAll(".mv489-tabs"));
    if(barras.length>1){
      const conservar=wrap.querySelector("#mv489Tabs")||barras[0];
      barras.forEach(b=>{ if(b!==conservar) b.remove(); });
      if(conservar) conservar.id="mv489Tabs";
    }
    document.querySelectorAll("#mv501VtrGarNav,.mv501-vtrgar-nav").forEach(n=>{
      n.style.setProperty("display","none","important");
      n.setAttribute("aria-hidden","true");
    });
  }

  function preparar(det){
    const body=cuerpo(det);
    if(!body) return;
    det.open=true;
    if(det.dataset.mv516bInit!=="1"){
      det.dataset.mv516bInit="1";
      det.dataset.mv516bOpen="0";
      body.style.setProperty("display","none","important");
    }else if(det.dataset.mv516bOpen==="1"){
      body.style.setProperty("display",displayAbierto(det),"important");
    }else{
      body.style.setProperty("display","none","important");
    }
  }

  function aplicar(){
    unaSolaBarra();
    if(window.MV488_VT_MODO!=="VTRGAR") return;
    document.querySelectorAll("details.mv489-month,details.mv501-sede,details.mv489-case").forEach(preparar);
  }

  function programar(){
    clearTimeout(timer);
    timer=setTimeout(aplicar,15);
  }

  function toggleDesdeEvento(ev){
    const target=ev.target;
    const summary=target && target.closest ? target.closest("summary") : null;
    if(!summary) return;
    const det=summary.parentElement;
    if(!det || !det.matches("details.mv489-month,details.mv501-sede,details.mv489-case")) return;
    if(window.MV488_VT_MODO!=="VTRGAR" || !document.querySelector(".mv489-wrap")) return;

    const body=cuerpo(det);
    if(!body) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    det.open=true;
    const abrir=det.dataset.mv516bOpen!=="1";
    det.dataset.mv516bOpen=abrir?"1":"0";
    body.style.setProperty("display",abrir?displayAbierto(det):"none","important");
  }

  window.addEventListener("pointerdown",toggleDesdeEvento,true);
  window.addEventListener("mousedown",function(ev){
    if(typeof PointerEvent!=="undefined") return;
    toggleDesdeEvento(ev);
  },true);

  if(document.body){
    const obs=new MutationObserver(function(muts){
      if(window.MV488_VT_MODO!=="VTRGAR") return;
      for(const m of muts){
        if(m.addedNodes && m.addedNodes.length){ programar(); return; }
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  setInterval(aplicar,1200);
  setTimeout(aplicar,50);
  setTimeout(aplicar,250);
  setTimeout(aplicar,800);
  console.log("MI VISUAL V516B: desplegables VTR/GAR preemptivos habilitados.");
})();
