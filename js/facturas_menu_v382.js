/* ============================================================
   MI VISUAL V382 - FACTURAS en cabecera
   - Técnico con unidad: icono grifo en tarjeta Bienvenido.
   - Supervisor: icono grifo en tarjeta Bienvenido.
   - Jefatura / Jefatura General: icono grifo en tarjeta Bienvenido.
   - Gerencia General: conserva FACTURAS como tarjeta del menú.
   - Sin cambios de backend.
============================================================ */
(function(){
  "use strict";
  if(window.MV382_FACTURAS_CABECERA_OK) return;

  const API=()=>window.MI_VISUAL_API_URL||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";

  const norm=v=>String(v||"").toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim();

  const perfil=()=>norm(localStorage.getItem("perfil"));
  const usuario=()=>localStorage.getItem("usuario")||"";

  function esTecnico(){ return perfil()==="TECNICO"; }

  function usaIconoCabecera(){
    return [
      "TECNICO",
      "SUPERVISOR",
      "JEFATURA",
      "JEFATURA GENERAL"
    ].includes(perfil());
  }

  function usaTarjetaGerencia(){
    return ["GERENCIA GENERAL","GERENCIAL GENERAL"].includes(perfil());
  }

  function svgGrifo(){
    return `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="13" y="8" width="27" height="45" rx="5" fill="#ffffff" stroke="#0b4f78" stroke-width="3"/>
        <rect x="18" y="14" width="17" height="12" rx="2" fill="#8ed8ff" stroke="#0b4f78" stroke-width="2"/>
        <path d="M40 20h7l5 6v18c0 4 5 4 5 0V31" fill="none" stroke="#0b4f78" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M48 20l6 5" fill="none" stroke="#0b4f78" stroke-width="3" stroke-linecap="round"/>
        <rect x="17" y="37" width="20" height="4" rx="2" fill="#16a34a"/>
        <circle cx="27" cy="48" r="3" fill="#f59e0b"/>
      </svg>`;
  }

  function crearIconoCabecera(){
    let btn=document.getElementById("btnFacturasCabecera");
    if(btn) return btn;

    const welcome=document.getElementById("mv55Welcome");
    if(!welcome) return null;

    btn=document.createElement("button");
    btn.id="btnFacturasCabecera";
    btn.type="button";
    btn.className="mv382-facturas-welcome-btn";
    btn.title="Facturas de combustible";
    btn.setAttribute("aria-label","Abrir Facturas de combustible");
    btn.innerHTML=svgGrifo();
    btn.style.display="none";
    btn.addEventListener("click",function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(typeof window.mostrarFacturas==="function"){
        window.mostrarFacturas();
      }
    });

    const plantilla=document.getElementById("btnPlantillaOrden");
    if(plantilla && plantilla.parentElement===welcome){
      welcome.insertBefore(btn,plantilla);
    }else{
      welcome.appendChild(btn);
    }
    return btn;
  }

  function crearCardGerencia(){
    let card=document.getElementById("cardFacturas");
    if(card) return card;

    card=document.createElement("div");
    card.id="cardFacturas";
    card.className="card mv380-card-facturas mv55-main-card";
    card.style.display="none";
    card.innerHTML='<span>⛽</span><b>FACTURAS</b>';
    card.onclick=()=>window.mostrarFacturas();

    const main=document.getElementById("mv55MainModules")||
               document.getElementById("menuPrincipal");
    if(main) main.appendChild(card);
    return card;
  }

  async function tecnicoTieneUnidad(){
    const u=usuario();
    if(!u) return false;

    const key="MV382_FACT_MENU|"+u;
    try{
      const c=JSON.parse(sessionStorage.getItem(key)||"null");
      if(c && Date.now()-c.t<180000) return !!c.v;
    }catch(_){}

    const url=new URL(API());
    url.searchParams.set("accion","obtenerContextoFacturas");
    url.searchParams.set("usuario",u);
    url.searchParams.set("soloMenu","SI");
    url.searchParams.set("_",Date.now());

    const r=await fetch(url.toString(),{cache:"no-store"});
    const j=await r.json();
    const visible=!!(j&&j.ok&&j.visibleMenu);

    try{
      sessionStorage.setItem(key,JSON.stringify({t:Date.now(),v:visible}));
    }catch(_){}
    return visible;
  }

  function limpiarBotonV381(){
    const anterior=document.getElementById("btnFacturasTecnico");
    if(anterior) anterior.remove();
  }

  async function evaluar(){
    limpiarBotonV381();

    const p=perfil();
    const btn=crearIconoCabecera();
    const card=crearCardGerencia();

    if(!p){
      if(btn) btn.style.setProperty("display","none","important");
      if(card) card.style.setProperty("display","none","important");
      return;
    }

    // Gerencia General conserva FACTURAS como tarjeta.
    if(usaTarjetaGerencia()){
      if(btn) btn.style.setProperty("display","none","important");
      const main=document.getElementById("mv55MainModules");
      if(card && main && card.parentElement!==main){
        card.classList.remove("mv213-card","mv218-supervisor-card");
        card.classList.add("mv55-main-card");
        main.appendChild(card);
      }
      if(card) card.style.setProperty("display","flex","important");
      return;
    }

    // Técnico, Supervisor y Jefatura ya no usan tarjeta.
    if(card) card.style.setProperty("display","none","important");

    if(!usaIconoCabecera()){
      if(btn) btn.style.setProperty("display","none","important");
      return;
    }

    let visible=true;
    if(esTecnico()){
      try{
        visible=await tecnicoTieneUnidad();
      }catch(error){
        console.warn("V382 Facturas: no se pudo validar unidad del Técnico",error);
        visible=false;
      }
    }

    if(btn){
      btn.style.setProperty(
        "display",
        visible ? "inline-flex" : "none",
        "important"
      );
    }
  }

  function enganchar(nombre,asyncFn){
    const f=window[nombre];
    if(typeof f!=="function" || f.__mv382Facturas) return;

    const w=asyncFn
      ? async function(){
          const r=await f.apply(this,arguments);
          setTimeout(evaluar,30);
          return r;
        }
      : function(){
          const r=f.apply(this,arguments);
          setTimeout(evaluar,30);
          return r;
        };

    w.__mv382Facturas=true;
    window[nombre]=w;
    try{ eval(nombre+"=w"); }catch(_){}
  }

  enganchar("configurarMenu",true);
  enganchar("aplicarPermisosMenuActualizados",false);
  enganchar("prepararMenuVisual",false);

  document.addEventListener("DOMContentLoaded",()=>setTimeout(evaluar,180));
  window.addEventListener("storage",()=>setTimeout(evaluar,80));
  setTimeout(evaluar,350);

  window.mv382ActualizarAccesoFacturas=evaluar;
  window.MV382_FACTURAS_CABECERA_OK=true;
})();
