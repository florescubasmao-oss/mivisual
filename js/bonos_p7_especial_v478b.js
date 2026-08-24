/* ==========================================================
   MI VISUAL V478B - BONOS / P7 SGI BONO ESPECIAL

   Alcance estricto:
   - P7 VISUAL SGI usa la tarifa especial vigente del módulo Bonos.
   - V478 conserva el control PDG por fecha: P7 es PDG hasta 31/07/2026
     y participa en Bonos desde 01/08/2026.
   - P8 VISUAL SGI continúa PDG.
   - No modifica bonos.js, Apps Script, PEXT, puntos ni históricos.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V478B_P7_ESPECIAL_CARGADO) return;
  window.MI_VISUAL_V478B_P7_ESPECIAL_CARGADO = true;

  let timer = null;

  function normalizar(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esP7VisualSgi(cuadrilla){
    const nombre = (typeof window.mb242Cuadrilla === "function")
      ? window.mb242Cuadrilla(cuadrilla)
      : normalizar(cuadrilla).replace(/^P\s+(\d+)/, "P$1");
    const codigo = (nombre.match(/^P\d+/) || [""])[0];
    if(codigo !== "P7") return false;
    if(!nombre.includes("SGI")) return false;
    return ["PACHERRES","RUIZ","VICTOR"].some(function(t){ return nombre.includes(t); });
  }

  function instalar(){
    if(typeof window.mb242EsTarifaEspecial !== "function") return false;
    if(window.mb242EsTarifaEspecial.__mv478bP7Especial) return true;

    const base = window.mb242EsTarifaEspecial;

    function esTarifaEspecialV478B(cuadrilla){
      if(esP7VisualSgi(cuadrilla)) return true;
      return base.apply(this, arguments);
    }
    esTarifaEspecialV478B.__mv478bP7Especial = true;

    window.mb242EsTarifaEspecial = esTarifaEspecialV478B;
    try{ mb242EsTarifaEspecial = esTarifaEspecialV478B; }catch(_){}

    window.MI_VISUAL_V478B_P7_ESPECIAL = {
      version:"V478B-P7-BONO-ESPECIAL-20260824",
      cuadrilla:"P7 VISUAL SGI",
      desde:"2026-08-01"
    };

    console.log("MI VISUAL V478B: P7 VISUAL SGI con bono especial habilitado.");
    return true;
  }

  function intentar(n){
    if(instalar()){
      if(timer){ clearInterval(timer); timer = null; }
      return;
    }
    if(n >= 60 && timer){ clearInterval(timer); timer = null; }
  }

  if(!instalar()){
    let n = 0;
    timer = setInterval(function(){ n++; intentar(n); }, 100);
  }

  const obs = new MutationObserver(function(muts){
    muts.forEach(function(m){
      Array.from(m.addedNodes || []).forEach(function(n){
        if(n && n.tagName === "SCRIPT" && String(n.src || "").includes("/js/bonos.js")){
          n.addEventListener("load", function(){ setTimeout(function(){ instalar(); }, 0); }, {once:true});
        }
      });
    });
  });

  function iniciar(){
    if(document.documentElement) obs.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();
})();
