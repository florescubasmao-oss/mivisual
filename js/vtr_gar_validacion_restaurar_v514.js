/* ============================================================
   MI VISUAL V514A - RESTAURA VALIDACION VTR/GAR + TABS UNICAS

   Alcance estricto:
   - Mantiene la restauracion tardia de V489.
   - Deja una sola barra Registro / Validacion.
   - En la vista unificada conserva la barra interna de V489.
   - No cambia datos, permisos, API, calculos, Ranking ni SLA.
   - No activa ni consulta flujo Partner.
============================================================ */
(function(){
  "use strict";

  if(window.MV514A_VTRGAR_TABS_UNICA_OK) return;
  window.MV514A_VTRGAR_TABS_UNICA_OK = true;
  window.MV514_VTRGAR_VALIDACION_RESTAURADA_OK = true;

  let promesaV489 = null;
  let remontando = false;
  let timer = null;
  let timerTabs = null;

  function normalizarTabs(){
    clearTimeout(timerTabs);
    timerTabs = setTimeout(function(){
      const barras = Array.from(document.querySelectorAll(".mv489-tabs"));
      if(!barras.length) return;

      const wrap = document.querySelector(".mv489-wrap");
      let conservar = wrap ? wrap.querySelector(".mv489-tabs") : null;
      if(!conservar){
        conservar = document.getElementById("mv489Tabs") || barras[0];
      }

      barras.forEach(function(barra){
        if(barra !== conservar) barra.remove();
      });

      if(conservar){
        document.querySelectorAll("#mv489Tabs").forEach(function(el){
          if(el !== conservar) el.removeAttribute("id");
        });
        conservar.id = "mv489Tabs";
      }
    },0);
  }

  function corresponde(){
    return window.MV488_VT_MODO === "VTRGAR" &&
      !!document.querySelector(".vt-wrap") &&
      !document.querySelector(".mv489-wrap");
  }

  function cargarV489(){
    if(window.MV489_VT_UNIFICADA_OK) return Promise.resolve();
    if(promesaV489) return promesaV489;

    promesaV489 = new Promise(function(resolve,reject){
      const existente = Array.from(document.scripts).find(function(s){
        return String(s.src || "").includes("validacion_tecnica_unificada_v489.js");
      });

      if(existente){
        let intentos = 0;
        const espera = setInterval(function(){
          intentos++;
          if(window.MV489_VT_UNIFICADA_OK){
            clearInterval(espera);
            resolve();
          }else if(intentos >= 20){
            clearInterval(espera);
            reject(new Error("V489 no termino de inicializar."));
          }
        },100);
        return;
      }

      const s = document.createElement("script");
      s.src = "./js/validacion_tecnica_unificada_v489.js?v=V514A-TABS-UNICA-20260828";
      s.async = true;
      s.onload = resolve;
      s.onerror = function(){
        promesaV489 = null;
        reject(new Error("No se pudo cargar la vista Validacion VTR/GAR."));
      };
      document.head.appendChild(s);
    });

    return promesaV489;
  }

  function asegurar(){
    normalizarTabs();
    clearTimeout(timer);
    timer = setTimeout(function(){
      normalizarTabs();
      if(!corresponde()) return;
      if(document.getElementById("mv489Tabs")) return;
      if(typeof window.mv488AbrirVtrGar !== "function") return;

      cargarV489().then(function(){
        normalizarTabs();
        if(!corresponde() || document.getElementById("mv489Tabs") || remontando) return;
        if(typeof window.mv489AbrirRegistroVtrGar !== "function") return;

        remontando = true;
        try{
          window.mv489AbrirRegistroVtrGar();
          setTimeout(normalizarTabs,80);
          setTimeout(normalizarTabs,350);
        }finally{
          setTimeout(function(){ remontando = false; },900);
        }
      }).catch(function(e){
        console.warn("MI VISUAL V514A VTR/GAR:", e && e.message ? e.message : e);
      });
    },60);
  }

  if(document.body){
    const obs = new MutationObserver(function(){ asegurar(); });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){ setTimeout(asegurar,80); },true);
  setTimeout(asegurar,250);
  setTimeout(asegurar,700);
  setTimeout(asegurar,1400);
})();
