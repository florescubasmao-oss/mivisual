/* ============================================================
   MI VISUAL V508 - ACTAS SIN DESCARGA PARA TECNICO
   - Solo oculta/elimina el panel de descarga por periodo para TECNICO.
   - No modifica carga, subida, validacion ni consulta de actas.
============================================================ */
(function(){
  "use strict";
  if(window.MV508_ACTAS_TECNICO_SIN_DESCARGA_OK) return;
  window.MV508_ACTAS_TECNICO_SIN_DESCARGA_OK = true;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esTecnico(){ return norm(localStorage.getItem("perfil")) === "TECNICO"; }

  function aplicar(){
    const estiloId = "mv508ActasSinDescargaTecnicoCss";
    let estilo = document.getElementById(estiloId);
    if(esTecnico()){
      if(!estilo){
        estilo = document.createElement("style");
        estilo.id = estiloId;
        estilo.textContent = "#mv480DescargaActas{display:none!important}";
        document.head.appendChild(estilo);
      }
      const panel = document.getElementById("mv480DescargaActas");
      if(panel) panel.remove();
    }else if(estilo){
      estilo.remove();
    }
  }

  const obs = new MutationObserver(aplicar);
  function iniciar(){
    aplicar();
    obs.observe(document.body,{childList:true,subtree:true});
    document.addEventListener("click",()=>setTimeout(aplicar,0),true);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  window.mv508AplicarActasSinDescargaTecnico = aplicar;
  console.log("MI VISUAL V508: descarga de Actas oculta para Técnico.");
})();