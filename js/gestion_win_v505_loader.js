/* ============================================================
   MI VISUAL V512D - LOADER COMPLEMENTOS INCREMENTALES

   Carga incremental:
   - Sincronizador WIN -> indicadores optimizado desde el inicio.
   - Sello V512B independiente SOLO en Dashboard.
   - Mantiene sello V512A compatible en Ranking/Mi Desempeno.
   - Checklist rapido: precarga/cache + render por sede bajo demanda.
   - Gestion de Actas: descarga por periodo oculta para Tecnico.
   - Gestion de Actas: sincroniza Guardar cuando Mapa + Produccion resolvieron.
   - Gestion de Actas: selector cuando un mismo pedido tiene varias Ordenes.
   - Continuidad al abrir dashboards.
   - Partidas + validacion por lote + herramientas solo para Jefatura.
   - V512D mueve la barra Herramientas al final del Dashboard.
============================================================ */
(function(){
  "use strict";
  if(window.MV505_GESTION_WIN_LOADER_OK) return;
  window.MV505_GESTION_WIN_LOADER_OK=true;
  window.MV512_GESTION_WIN_LOADER_OK=true;
  window.MV512A_GESTION_WIN_LOADER_OK=true;
  window.MV512B_GESTION_WIN_LOADER_OK=true;
  window.MV512D_GESTION_WIN_LOADER_OK=true;

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
        await cargar("./js/dashboard_herramientas_final_v512d.js?v=V512D-HERRAMIENTAS-FINAL");
      }
    }catch(e){
      dashboardPreparado=false;
      console.warn("V512D Complementos: complemento Dashboard pendiente",e);
    }
  }

  cargar("./js/dashboard_actualizacion_indicadores_v512b.js?v=V512B-DASHBOARD-20260827").catch(e=>
    console.warn("V512D Complementos: sello Dashboard pendiente",e)
  );

  cargar("./js/actualizacion_win_v507.js?v=V512A-SELLO-DASHBOARD").catch(e=>
    console.warn("V512D Complementos: sello compatible pendiente",e)
  );

  cargar("./js/indicadores_win_sync_v4879.js?v=V512-SYNC-UNICA-PUBLICACION").catch(e=>
    console.warn("V512D Complementos: sincronizador WIN pendiente",e)
  );

  cargar("./js/checklist_rapido_v508.js?v=V508-CHECKLIST-RAPIDO").catch(e=>
    console.warn("V512D Complementos: optimizacion Checklist pendiente",e)
  );

  cargar("./js/actas_tecnico_sin_descarga_v508.js?v=V508-ACTAS-TECNICO").catch(e=>
    console.warn("V512D Complementos: restriccion descarga Actas pendiente",e)
  );

  cargar("./js/actas_guardar_sync_v510.js?v=V511-GUARDAR-ACTA").catch(e=>
    console.warn("V512D Complementos: sincronizacion Guardar Acta pendiente",e)
  );

  cargar("./js/actas_multiples_trabajos_v511.js?v=V511-MULTIPLES-TRABAJOS").catch(e=>
    console.warn("V512D Complementos: multiples trabajos por pedido pendiente",e)
  );

  const objetivo=document.getElementById("pantalla")||document.body;
  if(objetivo){
    const obs=new MutationObserver(()=>prepararDashboard());
    obs.observe(objetivo,{childList:true,subtree:true});
  }
  document.addEventListener("click",()=>setTimeout(prepararDashboard,60),true);
  setTimeout(prepararDashboard,250);
})();