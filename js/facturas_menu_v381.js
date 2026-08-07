/* ============================================================
   MI VISUAL V381 - Acceso visual a Facturas de Combustible
   - Técnico con unidad: botón ⛽ junto a Cerrar sesión.
   - Supervisor / Jefatura / Gerencia General: tarjeta normal.
   - Reutiliza obtenerContextoFacturas; no cambia backend.
============================================================ */
(function(){
  "use strict";
  if(window.MV381_FACTURAS_MENU_OK) return;

  const API=()=>window.MI_VISUAL_API_URL||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";

  const norm=v=>String(v||"").toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim();

  const perfil=()=>norm(localStorage.getItem("perfil"));
  const usuario=()=>localStorage.getItem("usuario")||"";

  function esTecnico(){ return perfil()==="TECNICO"; }
  function esPerfilTarjeta(){
    return [
      "SUPERVISOR",
      "JEFATURA",
      "JEFATURA GENERAL",
      "GERENCIA GENERAL",
      "GERENCIAL GENERAL"
    ].includes(perfil());
  }

  function quitarAccesos(){
    const card=document.getElementById("cardFacturas");
    if(card) card.style.setProperty("display","none","important");
    const btn=document.getElementById("btnFacturasTecnico");
    if(btn) btn.style.setProperty("display","none","important");
  }

  function crearBotonTecnico(){
    let btn=document.getElementById("btnFacturasTecnico");
    if(btn) return btn;

    const topbar=document.querySelector(".mv55-topbar");
    const nav=document.getElementById("btnInicio");
    if(!topbar||!nav) return null;

    btn=document.createElement("button");
    btn.id="btnFacturasTecnico";
    btn.type="button";
    btn.className="mv381-facturas-top-btn";
    btn.title="Facturas de combustible";
    btn.setAttribute("aria-label","Facturas de combustible");
    btn.innerHTML='<span aria-hidden="true">⛽</span>';
    btn.style.display="none";
    btn.addEventListener("click",function(){
      if(typeof window.mostrarFacturas==="function") window.mostrarFacturas();
    });

    topbar.insertBefore(btn,nav);
    return btn;
  }

  function crearCard(){
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

  function buscarGridVisible(panelId,preferencia){
    const panel=document.getElementById(panelId);
    if(!panel) return null;

    const secciones=[...panel.querySelectorAll(".mv213-section")];
    const deseada=secciones.find(sec=>{
      const titulo=norm(sec.querySelector(".mv213-section-title")?.textContent);
      return preferencia.some(x=>titulo.includes(x));
    });
    if(deseada) return deseada.querySelector(".mv213-grid");

    return panel.querySelector(".mv213-grid");
  }

  function ubicarCardSegunPerfil(card){
    if(!card) return;
    const p=perfil();

    // Menús agrupados de Supervisor y Jefatura.
    if(p==="SUPERVISOR"){
      const grid=buscarGridVisible("mv218SupervisorSections",["OPERACION","CONTROL OPERATIVO","GESTION"]);
      if(grid){
        card.classList.remove("mv55-main-card","mv213-card");
        card.classList.add("mv218-supervisor-card");
        grid.appendChild(card);
        return;
      }
    }

    if(["JEFATURA","JEFATURA GENERAL"].includes(p)){
      const grid=buscarGridVisible("mv213JefaturaSections",["OPERACION","CONTROL OPERATIVO","GESTION"]);
      if(grid){
        card.classList.remove("mv55-main-card","mv218-supervisor-card");
        card.classList.add("mv213-card");
        grid.appendChild(card);
        return;
      }
    }

    // Gerencia General conserva su menú de tarjetas (3 por fila).
    const main=document.getElementById("mv55MainModules");
    if(main && card.parentElement!==main){
      card.classList.remove("mv213-card","mv218-supervisor-card");
      card.classList.add("mv55-main-card");
      main.appendChild(card);
    }
  }

  function botonTecnicoDebeVerse(visibleMenu){
    const btnInicio=document.getElementById("btnInicio");
    const enMenu=!btnInicio || (btnInicio.dataset.modo||"menu")==="menu";
    return esTecnico() && visibleMenu && enMenu;
  }

  async function obtenerVisibleTecnico(){
    const u=usuario();
    if(!u) return false;

    const key="MV381_FACT_MENU|"+u;
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

  async function evaluar(){
    const p=perfil();
    const card=crearCard();
    const btn=crearBotonTecnico();

    if(!p){
      quitarAccesos();
      return;
    }

    if(esTecnico()){
      if(card) card.style.setProperty("display","none","important");

      let visible=false;
      try{ visible=await obtenerVisibleTecnico(); }
      catch(error){
        console.warn("V381 Facturas: no se pudo validar vehículo",error);
      }

      if(btn){
        btn.style.setProperty(
          "display",
          botonTecnicoDebeVerse(visible) ? "inline-flex" : "none",
          "important"
        );
      }
      return;
    }

    if(btn) btn.style.setProperty("display","none","important");

    if(esPerfilTarjeta()){
      ubicarCardSegunPerfil(card);
      if(card) card.style.setProperty("display","flex","important");
      return;
    }

    if(card) card.style.setProperty("display","none","important");
  }

  function engancharAsync(nombre){
    const f=window[nombre];
    if(typeof f!=="function" || f.__mv381Facturas) return;

    const w=async function(){
      const r=await f.apply(this,arguments);
      setTimeout(evaluar,30);
      return r;
    };
    w.__mv381Facturas=true;
    window[nombre]=w;
    try{ eval(nombre+"=w"); }catch(_){}
  }

  function engancharSync(nombre){
    const f=window[nombre];
    if(typeof f!=="function" || f.__mv381Facturas) return;

    const w=function(){
      const r=f.apply(this,arguments);
      setTimeout(evaluar,20);
      return r;
    };
    w.__mv381Facturas=true;
    window[nombre]=w;
    try{ eval(nombre+"=w"); }catch(_){}
  }

  // Si el usuario abre un módulo, el botón del Técnico se oculta;
  // al regresar al menú vuelve a aparecer automáticamente.
  engancharSync("setBotonNavegacion");
  engancharAsync("configurarMenu");
  engancharSync("aplicarPermisosMenuActualizados");

  document.addEventListener("DOMContentLoaded",()=>setTimeout(evaluar,220));
  window.addEventListener("storage",()=>setTimeout(evaluar,80));
  setTimeout(evaluar,420);

  window.mv381ActualizarAccesoFacturas=evaluar;
  window.MV381_FACTURAS_MENU_OK=true;
})();
