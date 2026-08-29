/* ============================================================
   MI VISUAL V517D F4P - MENU VALIDACION TECNICO
   29/08/2026

   Alcance ESTRICTO / SOLO FRONTEND:
   - Perfil TECNICO: conserva la pantalla de seleccion Validacion Tecnica.
   - Mantiene intacta la tarjeta RECABLEADO y su flujo actual.
   - Oculta SOLO la tarjeta separada VTR / GAR.
   - El registro GAR/VTR sigue realizandose desde el flujo actual de Recableado,
     que ya contiene AT-, VTEXT-, GAR-, VTR- y NO APLICA.
   - No modifica formularios, guardado, rutas, API, Sheets, Produccion ni Ranking.
   - Jefatura, Supervisor, Gerencia y Admin no se modifican.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4P_TECNICO_MENU_OK) return;
  window.MV517D_F4P_TECNICO_MENU_OK = true;

  /* Bloquea la capa F4O anterior si un bridge cacheado intenta cargarla luego. */
  window.MV517D_F4O_TECNICO_RESTAURADO_OK = true;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil") || "") === "TECNICO";
  }

  function esCardVtrGar(el){
    if(!el || el.nodeType !== 1) return false;
    const t = norm(el.textContent || "");
    if(t.indexOf("VTR / GAR") < 0 && t.indexOf("VTR/GAR") < 0) return false;
    return t.indexOf("FUENTE PRINCIPAL") >= 0 ||
           t.indexOf("SUPERVISOR Y JEFATURA") >= 0 ||
           String(el.getAttribute("onclick") || "").indexOf("mv488AbrirVtrGar") >= 0;
  }

  function encontrarCard(el,root){
    let n = el;
    let candidato = null;
    for(let i=0; i<7 && n && n !== root && n !== document.body; i++, n=n.parentElement){
      if(esCardVtrGar(n)){
        candidato = n;
        const cls = String(n.className || "");
        const onclick = String(n.getAttribute && n.getAttribute("onclick") || "");
        if(onclick.indexOf("mv488AbrirVtrGar") >= 0 || /card|tarjeta|option|opcion|item|modulo/i.test(cls)){
          return n;
        }
      }
    }
    return candidato;
  }

  function ocultarTarjetaVtrGar(){
    if(!esTecnico()) return;
    const root = document.getElementById("pantalla");
    if(!root) return;

    const pantalla = norm(root.textContent || "");
    if(pantalla.indexOf("VALIDACION TECNICA") < 0 || pantalla.indexOf("RECABLEADO") < 0) return;

    /* Primera via: la tarjeta/boton tiene la ruta VTR/GAR. */
    root.querySelectorAll('[onclick*="mv488AbrirVtrGar"]').forEach(function(el){
      const card = encontrarCard(el,root) || el;
      if(esCardVtrGar(card)){
        card.style.setProperty("display","none","important");
        card.setAttribute("aria-hidden","true");
        card.dataset.mv517dF4pOculta = "1";
      }
    });

    /* Respaldo robusto: localizar por el titulo exacto de la tarjeta. */
    root.querySelectorAll("h1,h2,h3,h4,h5,strong,b,span").forEach(function(el){
      const titulo = norm(el.textContent || "");
      if(titulo !== "VTR / GAR" && titulo !== "VTR/GAR") return;
      const card = encontrarCard(el,root);
      if(card && esCardVtrGar(card)){
        card.style.setProperty("display","none","important");
        card.setAttribute("aria-hidden","true");
        card.dataset.mv517dF4pOculta = "1";
      }
    });
  }

  let timer = null;
  function programar(){
    clearTimeout(timer);
    timer = setTimeout(ocultarTarjetaVtrGar,0);
  }

  if(document.body){
    const obs = new MutationObserver(function(){
      if(esTecnico()) programar();
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){
    if(esTecnico()) setTimeout(ocultarTarjetaVtrGar,35);
  },true);

  [0,80,220,500,1000,1800].forEach(function(ms){
    setTimeout(ocultarTarjetaVtrGar,ms);
  });

  console.log("MI VISUAL V517D F4P: Tecnico mantiene Recableado y oculta tarjeta separada VTR/GAR.");
})();
