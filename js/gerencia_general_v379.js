/* ============================================================
   MI VISUAL V379 - Gerencia General
   - 3 tarjetas por fila en escritorio.
   - BONO abre Bono Técnicos + Bono Supervisores.
   - No altera otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV379_GERENCIA_GENERAL_MENU_OK) return;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esGG(){
    return ["GERENCIA GENERAL","GERENCIAL GENERAL"].includes(norm(localStorage.getItem("perfil")));
  }

  function preparar(){
    const menu=document.getElementById("menuPrincipal");
    if(!menu) return;
    menu.classList.toggle("mv379-gerencia-general-menu",esGG());
    if(!esGG()) return;

    const card=document.getElementById("cardBonos");
    if(card){
      card.style.setProperty("display","flex","important");
      card.classList.add("mv379-card-bono");
      const b=card.querySelector("b");
      if(b) b.textContent="BONO";
      const s=card.querySelector("span");
      if(s) s.textContent="🎁";
      card.onclick=window.mostrarBonosGerenciaGeneral;
    }
  }

  window.mostrarBonosGerenciaGeneral=function(){
    if(!esGG()){
      if(typeof window.mostrarBonos==="function") return window.mostrarBonos();
      return;
    }
    if(typeof window.limpiarPantalla==="function") window.limpiarPantalla();
    const menu=document.getElementById("menuPrincipal");
    if(menu) menu.style.setProperty("display","none","important");
    if(typeof window.setBotonNavegacion==="function") window.setBotonNavegacion("modulo");
    const p=document.getElementById("pantalla");
    if(!p) return;
    p.innerHTML=`
      <div class="mv379-bono-page">
        <div class="mv379-bono-head">
          <span>🎁</span>
          <div><h2>BONO</h2><p>Consulta de incentivos de Técnicos y Supervisores.</p></div>
        </div>
        <div class="mv379-bono-grid">
          <button type="button" class="mv379-bono-opcion tecnicos" onclick="mostrarBonos()">
            <span>👷</span><b>BONO TÉCNICOS</b><small>Producción y PEXT por cuadrilla</small>
          </button>
          <button type="button" class="mv379-bono-opcion supervisores" onclick="mostrarBonosSupervisores()">
            <span>👔</span><b>BONO SUPERVISORES</b><small>Avance mensual y componentes del bono</small>
          </button>
        </div>
      </div>`;
    window.scrollTo({top:0,behavior:"smooth"});
  };

  // Enganchar la construcción del menú sin cambiar la lógica de otros perfiles.
  const originalConfig=window.configurarMenu;
  if(typeof originalConfig==="function" && !originalConfig.__mv379){
    const envuelta=async function(){
      const r=await originalConfig.apply(this,arguments);
      requestAnimationFrame(preparar);
      return r;
    };
    envuelta.__mv379=true;
    window.configurarMenu=envuelta;
    try{configurarMenu=envuelta;}catch(_){ }
  }

  const originalPermisos=window.aplicarPermisosMenuActualizados;
  if(typeof originalPermisos==="function" && !originalPermisos.__mv379){
    const envueltaPermisos=function(){
      const r=originalPermisos.apply(this,arguments);
      requestAnimationFrame(preparar);
      return r;
    };
    envueltaPermisos.__mv379=true;
    window.aplicarPermisosMenuActualizados=envueltaPermisos;
    try{aplicarPermisosMenuActualizados=envueltaPermisos;}catch(_){ }
  }

  document.addEventListener("DOMContentLoaded",()=>setTimeout(preparar,100));
  window.addEventListener("storage",()=>setTimeout(preparar,50));
  setTimeout(preparar,250);
  window.MV379_GERENCIA_GENERAL_MENU_OK=true;
})();