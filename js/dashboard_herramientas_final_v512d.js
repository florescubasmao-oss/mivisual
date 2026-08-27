/* ============================================================
   MI VISUAL V512D - HERRAMIENTAS AL FINAL DEL DASHBOARD

   Alcance estricto:
   - Solo Jefatura / Jefatura General.
   - Reubica #mv496Herramienta al final del contenido operativo.
   - La deja inmediatamente antes de "Volver al menu" cuando existe.
   - No modifica funciones, permisos, calculos, SLA ni indicadores.
============================================================ */
(function(){
  "use strict";
  if(window.MV512D_HERRAMIENTAS_FINAL_OK) return;
  window.MV512D_HERRAMIENTAS_FINAL_OK=true;

  let timer=null;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function esJefatura(){
    const p=norm(localStorage.getItem("perfil"));
    return p==="JEFATURA" || p==="JEFATURA GENERAL";
  }

  function esDashboardJefatura(page){
    if(!page) return false;
    const t=norm((page.textContent||"").slice(0,2600));
    return t.includes("JEFATURA") && t.includes("ZONA NORTE") && t.includes("PERIODO") && t.includes("INDICADOR");
  }

  function hijoDirecto(el,parent){
    let n=el;
    while(n && n.parentElement && n.parentElement!==parent) n=n.parentElement;
    return n && n.parentElement===parent ? n : null;
  }

  function moverAlFinal(){
    if(!esJefatura()) return false;

    const box=document.getElementById("mv496Herramienta");
    if(!box) return false;

    const page=box.closest(".mv4-page") || document.querySelector("#pantalla .mv4-page");
    if(!page || !esDashboardJefatura(page)) return false;

    const volver=Array.from(page.querySelectorAll("button,a"))
      .find(el=>norm(el.textContent||"").includes("VOLVER AL MENU"));

    if(volver){
      const bloqueVolver=hijoDirecto(volver,page) || volver;
      if(bloqueVolver!==box && box.nextElementSibling!==bloqueVolver){
        page.insertBefore(box,bloqueVolver);
      }
    }else if(page.lastElementChild!==box){
      page.appendChild(box);
    }

    box.style.margin="18px 0 12px";
    box.dataset.mv512dPosicion="final";
    return true;
  }

  function programar(){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>{
      timer=null;
      moverAlFinal();
    },80);
  }

  const pantalla=document.getElementById("pantalla");
  if(pantalla){
    const obs=new MutationObserver(programar);
    obs.observe(pantalla,{childList:true,subtree:true});
  }

  document.addEventListener("click",()=>setTimeout(programar,40),true);
  window.addEventListener("mv487IndicadoresPublicados",()=>setTimeout(programar,100));
  window.mv512dMoverHerramientasDashboard=moverAlFinal;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",programar,{once:true});
  else programar();

  setTimeout(programar,300);
  setTimeout(programar,900);

  console.log("MI VISUAL V512D: herramientas del Dashboard al final.");
})();
