/* ================================================================
   MI VISUAL V545 - WATCHDOG ESTADO MAPA -> INDICADORES

   OBJETIVO
   - Evitar que el bloque "Sincronización de indicadores" quede demasiado
     tiempo en "Verificando estado..." cuando Apps Script está ocupado.
   - No publica por sí solo.
   - Si la verificación tarda más de 7 s, habilita el botón existente para
     que Jefatura/Admin pueda ejecutar la sincronización oficial una sola vez.
   - No modifica MAPA_ORDENES ni datos históricos.
================================================================ */
(function(){
  "use strict";
  if(window.MV545_MAPA_WATCHDOG_OK)return;
  window.MV545_MAPA_WATCHDOG_OK=true;

  const ID="mv544EstadoIndicadores";
  let timer=null;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function puede(){
    const p=norm(localStorage.getItem("perfil"));
    return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(p);
  }

  function armarWatchdog(){
    if(!puede())return;
    const caja=document.getElementById(ID);
    if(!caja)return;
    const texto=caja.querySelector("[data-mv544-texto]");
    const btn=caja.querySelector("[data-mv544-btn]");
    if(!texto||!btn)return;

    if(timer)return;
    const actual=norm(texto.textContent);
    if(!actual.includes("VERIFICANDO ESTADO"))return;
    timer=setTimeout(()=>{
      timer=null;
      const actualFinal=norm(texto.textContent);
      if(!actualFinal.includes("VERIFICANDO ESTADO"))return;

      caja.style.background="#fff7ed";
      caja.style.borderColor="#fdba74";
      texto.innerHTML="La verificación está demorando más de lo normal. <b>No vuelva a cargar el Excel.</b> Puede ejecutar ahora la sincronización oficial de septiembre.";
      btn.style.display="inline-block";
      btn.disabled=false;
      btn.textContent="Sincronizar indicadores";
    },7000);
  }

  const obs=new MutationObserver(()=>armarWatchdog());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("click",()=>setTimeout(armarWatchdog,100),true);
  setTimeout(armarWatchdog,400);
})();
