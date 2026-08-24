/* ==========================================================
   MI VISUAL V477B - Compatibilidad con variables lazy de base_operativa.js
   El archivo base usa variables globales declaradas con let. Estas no se
   publican automaticamente como propiedades de window. V477B crea puentes
   solamente despues de cargar base_operativa.js, sin cambiar su contenido.
========================================================== */
(function(){
  "use strict";
  if(window.MI_VISUAL_V477B_FRONT_ACTIVO)return;
  window.MI_VISUAL_V477B_FRONT_ACTIVO=true;

  function instalarPuentes(){
    try{
      if(typeof BO_INCIDENCIAS==="undefined" || typeof BO_CUADRILLAS==="undefined" || typeof BO_PREVISTA==="undefined" || typeof BO_FILTRO_ORIGEN_VG==="undefined")return false;
      const defs={
        BO_INCIDENCIAS:{get:()=>BO_INCIDENCIAS,set:v=>{BO_INCIDENCIAS=Array.isArray(v)?v:[];}},
        BO_CUADRILLAS:{get:()=>BO_CUADRILLAS,set:v=>{BO_CUADRILLAS=Array.isArray(v)?v:[];}},
        BO_PREVISTA:{get:()=>BO_PREVISTA,set:v=>{BO_PREVISTA=v||{};}},
        BO_FILTRO_ORIGEN_VG:{get:()=>BO_FILTRO_ORIGEN_VG,set:v=>{BO_FILTRO_ORIGEN_VG=v||"";}}
      };
      Object.keys(defs).forEach(k=>{
        const d=Object.getOwnPropertyDescriptor(window,k);
        if(d&&d.configurable===false)return;
        Object.defineProperty(window,k,{configurable:true,enumerable:false,get:defs[k].get,set:defs[k].set});
      });
      window.MI_VISUAL_V477B_PUENTES_OK=true;
      return true;
    }catch(e){return false;}
  }

  if(instalarPuentes())return;

  const observar=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of Array.from(m.addedNodes||[])){
        if(n&&n.tagName==="SCRIPT"&&String(n.src||"").includes("base_operativa.js")){
          n.addEventListener("load",function(){
            // Sincrono respecto al evento load: queda listo antes de los setTimeout
            // de instalacion de la capa visual V477.
            instalarPuentes();
          },{once:true});
        }
      }
    }
  });
  observar.observe(document.documentElement,{childList:true,subtree:true});
})();
