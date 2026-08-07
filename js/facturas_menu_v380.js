/* MI VISUAL V380 - Tarjeta Facturas de Combustible */
(function(){
  "use strict";
  if(window.MV380_FACTURAS_MENU_OK)return;
  const API=()=>window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const norm=v=>String(v||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const perfil=()=>norm(localStorage.getItem("perfil"));
  const permitido=()=>["TECNICO","SUPERVISOR","JEFATURA","JEFATURA GENERAL","GERENCIA GENERAL","GERENCIAL GENERAL"].includes(perfil());
  function crearCard(){
    let card=document.getElementById("cardFacturas"); if(card)return card;
    const grid=document.getElementById("mv55MainModules")||document.getElementById("menuPrincipal"); if(!grid)return null;
    card=document.createElement("div");card.id="cardFacturas";card.className="card mv380-card-facturas mv55-main-card";card.style.display="none";card.innerHTML='<span>⛽</span><b>FACTURAS</b>';card.onclick=()=>window.mostrarFacturas();grid.appendChild(card);return card;
  }
  async function evaluar(){
    const card=crearCard(); if(!card||!permitido()){if(card)card.style.setProperty("display","none","important");return;}
    if(perfil()!=="TECNICO"){card.style.setProperty("display","flex","important");return;}
    const usuario=localStorage.getItem("usuario")||"";if(!usuario){card.style.setProperty("display","none","important");return;}
    const cacheKey="MV380_FACT_MENU|"+usuario;try{const c=JSON.parse(sessionStorage.getItem(cacheKey)||"null");if(c&&Date.now()-c.t<300000){card.style.setProperty("display",c.v?"flex":"none","important");return;}}catch(_){ }
    try{const u=new URL(API());u.searchParams.set("accion","obtenerContextoFacturas");u.searchParams.set("usuario",usuario);u.searchParams.set("soloMenu","SI");u.searchParams.set("_",Date.now());const r=await fetch(u.toString(),{cache:"no-store"});const j=await r.json();const v=!!(j&&j.ok&&j.visibleMenu);sessionStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),v:v}));card.style.setProperty("display",v?"flex":"none","important");}catch(_){card.style.setProperty("display","none","important");}
  }
  function enganchar(nombre){const f=window[nombre];if(typeof f!=="function"||f.__mv380Facturas)return;const w=async function(){const r=await f.apply(this,arguments);setTimeout(evaluar,20);return r;};w.__mv380Facturas=true;window[nombre]=w;try{eval(nombre+"=w");}catch(_){}}
  enganchar("configurarMenu");enganchar("aplicarPermisosMenuActualizados");document.addEventListener("DOMContentLoaded",()=>setTimeout(evaluar,250));window.addEventListener("storage",()=>setTimeout(evaluar,80));setTimeout(evaluar,400);window.MV380_FACTURAS_MENU_OK=true;
})();