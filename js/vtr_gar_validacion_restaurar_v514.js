/* ============================================================
   MI VISUAL V514 - RESTAURA PESTAÑA VALIDACIÓN VTR/GAR

   Alcance estricto:
   - Corrige únicamente el montaje tardío de V489 en VTR/GAR.
   - Si Registro ya estaba abierto antes de cargar V489, vuelve a montar
     la vista una sola vez para que aparezcan Registro / Validación.
   - No cambia datos, permisos, API, cálculos, Ranking ni SLA.
   - No activa el flujo legado Partner.
============================================================ */
(function(){
  "use strict";

  if(window.MV514_VTRGAR_VALIDACION_RESTAURADA_OK) return;
  window.MV514_VTRGAR_VALIDACION_RESTAURADA_OK = true;

  let promesaV489 = null;
  let remontando = false;
  let timer = null;

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
        // Puede existir por la carga lazy anterior. Damos un margen breve
        // para que termine de ejecutar antes de crear una segunda descarga.
        let intentos = 0;
        const espera = setInterval(function(){
          intentos++;
          if(window.MV489_VT_UNIFICADA_OK){
            clearInterval(espera);
            resolve();
          }else if(intentos >= 20){
            clearInterval(espera);
            reject(new Error("V489 no terminó de inicializar."));
          }
        },100);
        return;
      }

      const s = document.createElement("script");
      s.src = "./js/validacion_tecnica_unificada_v489.js?v=V514-RESTAURA-VALIDACION-20260827";
      s.async = true;
      s.onload = resolve;
      s.onerror = function(){
        promesaV489 = null;
        reject(new Error("No se pudo cargar la vista Validación VTR/GAR."));
      };
      document.head.appendChild(s);
    });

    return promesaV489;
  }

  function asegurar(){
    clearTimeout(timer);
    timer = setTimeout(function(){
      if(!corresponde()) return;
      if(document.getElementById("mv489Tabs")) return;
      if(typeof window.mv488AbrirVtrGar !== "function") return;

      cargarV489().then(function(){
        if(!corresponde() || document.getElementById("mv489Tabs") || remontando) return;
        if(typeof window.mv489AbrirRegistroVtrGar !== "function") return;

        remontando = true;
        try{
          window.mv489AbrirRegistroVtrGar();
        }finally{
          setTimeout(function(){ remontando = false; },900);
        }
      }).catch(function(e){
        console.warn("MI VISUAL V514 VTR/GAR:", e && e.message ? e.message : e);
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
