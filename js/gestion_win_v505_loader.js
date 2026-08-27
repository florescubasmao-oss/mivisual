/* ============================================================
   MI VISUAL V507 - LOADER GESTION WIN

   Carga incremental:
   - Sincronizador WIN -> indicadores desde el inicio.
   - Fecha/hora unica WIN en Dashboard, Ranking y Mi Desempeno.
   - Continuidad al abrir dashboards.
   - Partidas + validacion por lote + herramientas solo para Jefatura.
============================================================ */
(function(){
  "use strict";
  if(window.MV505_GESTION_WIN_LOADER_OK) return;
  window.MV505_GESTION_WIN_LOADER_OK=true;

  const cargados=new Set();
  const promesas=new Map();
  let dashboardPreparado=false;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esJefatura(){
    const p=norm(localStorage.getItem("perfil"));
    return p==="JEFATURA"||p==="JEFATURA GENERAL";
  }

  function cargar(src){
    const base=src.split("?")[0].replace(/^\.\//,"");
    if(cargados.has(base)) return Promise.resolve();
    const existente=Array.from(document.scripts).find(s=>s.src&&s.src.includes(base));
    if(existente){ cargados.add(base); return Promise.resolve(); }
    if(promesas.has(base)) return promesas.get(base);
    const p=new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src=src; s.async=true;
      s.onload=()=>{cargados.add(base);promesas.delete(base);resolve();};
      s.onerror=()=>{promesas.delete(base);reject(new Error("No se pudo cargar "+base));};
      document.head.appendChild(s);
    });
    promesas.set(base,p);
    return p;
  }

  async function prepararDashboard(){
    if(dashboardPreparado) return;
    if(typeof window.mv199RenderJefatura!=="function" && typeof window.mv198RenderSupervisor!=="function") return;
    dashboardPreparado=true;
    try{
      await cargar("./js/dashboard_continuidad_cuadrillas_v496.js?v=V505-CONTINUIDAD");
      if(esJefatura()){
        await cargar("./js/partidas_win_v505.js?v=V506-PARTIDAS-BASE");
        await cargar("./js/partidas_lote_v506.js?v=V506-LOTE");
        await cargar("./js/dashboard_herramientas_v497.js?v=V505-HERRAMIENTAS");
      }
    }catch(e){
      dashboardPreparado=false;
      console.warn("V507 Gestion WIN: complemento Dashboard pendiente",e);
    }
  }

  cargar("./js/actualizacion_win_v507.js?v=V507-FECHA-HORA-PERU").catch(e=>
    console.warn("V507 Gestion WIN: fecha/hora WIN pendiente",e)
  );

  cargar("./js/indicadores_win_sync_v4879.js?v=V505-HOOK-WIN").catch(e=>
    console.warn("V507 Gestion WIN: sincronizador pendiente",e)
  );

  const objetivo=document.getElementById("pantalla")||document.body;
  if(objetivo){
    const obs=new MutationObserver(()=>prepararDashboard());
    obs.observe(objetivo,{childList:true,subtree:true});
  }
  document.addEventListener("click",()=>setTimeout(prepararDashboard,60),true);
  setTimeout(prepararDashboard,250);
})();