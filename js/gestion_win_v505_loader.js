/* ============================================================
   MI VISUAL V516A - LOADER COMPLEMENTOS INCREMENTALES

   Carga incremental:
   - Sincronizador WIN -> indicadores automatico optimizado.
   - Snapshot Partidas se actualiza tras carga WIN, sin ralentizar apertura.
   - Sello Dashboard inferior izquierdo, igual al Ranking.
   - Mantiene sello compatible en Ranking/Mi Desempeno.
   - Checklist rapido: precarga/cache + render por sede bajo demanda.
   - Gestion de Actas V508/V511 intacta.
   - Continuidad al abrir dashboards.
   - Partidas V505/V506 conservadas + interfaz V513 + lote manual V513C.
   - Partidas + herramientas solo para Jefatura/Administrador.
   - VTR/GAR conserva una sola barra Registro / Validacion.
   - V515 agrega puntaje/bono Jefatura y detalle VTR/GAR en Mi Desempeno.
   - V516A controla desplegables con clase propia, independiente de <details open>.
   - Dashboard no se modifica.
============================================================ */
(function(){
  "use strict";
  if(window.MV505_GESTION_WIN_LOADER_OK) return;
  window.MV505_GESTION_WIN_LOADER_OK=true;
  window.MV512_GESTION_WIN_LOADER_OK=true;
  window.MV512A_GESTION_WIN_LOADER_OK=true;
  window.MV512B_GESTION_WIN_LOADER_OK=true;
  window.MV512D_GESTION_WIN_LOADER_OK=true;
  window.MV512E_GESTION_WIN_LOADER_OK=true;
  window.MV513_GESTION_WIN_LOADER_OK=true;
  window.MV513C_GESTION_WIN_LOADER_OK=true;
  window.MV513D_GESTION_WIN_LOADER_OK=true;
  window.MV514_GESTION_WIN_LOADER_OK=true;
  window.MV514A_GESTION_WIN_LOADER_OK=true;
  window.MV515_GESTION_WIN_LOADER_OK=true;
  window.MV516_GESTION_WIN_LOADER_OK=true;
  window.MV516A_GESTION_WIN_LOADER_OK=true;

  const cargados=new Set();
  const promesas=new Map();
  let dashboardPreparado=false;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esJefatura(){
    const p=norm(localStorage.getItem("perfil"));
    return p==="JEFATURA"||p==="JEFATURA GENERAL"||p==="ADMINISTRADOR"||p==="ADMIN";
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
        await cargar("./js/partidas_win_v513.js?v=V513-PARTIDAS-20260827");
        await cargar("./js/partidas_lote_manual_v513c.js?v=V513C-LOTE-MANUAL-20260827");
        await cargar("./js/dashboard_herramientas_v497.js?v=V505-HERRAMIENTAS");
        await cargar("./js/dashboard_herramientas_final_v512d.js?v=V512D-HERRAMIENTAS-FINAL");
      }
    }catch(e){
      dashboardPreparado=false;
      console.warn("V516A Complementos: complemento Dashboard pendiente",e);
    }
  }

  cargar("./js/vtr_gar_validacion_restaurar_v514.js?v=V514A-TABS-UNICA-20260828")
    .then(()=>cargar("./js/vtr_gar_v515.js?v=V515-VTRGAR-BONO-DESEMPENO-20260828"))
    .then(()=>cargar("./js/vtr_gar_ui_fix_v516.js?v=V516-TABS-DESPLEGABLES-20260828"))
    .then(()=>cargar("./js/vtr_gar_ui_fix_v516a.js?v=V516A-CLASE-PROPIA-20260828"))
    .catch(e=>console.warn("V516A Complementos: VTR/GAR pendiente",e));

  cargar("./js/dashboard_actualizacion_indicadores_v512b.js?v=V512E-DASHBOARD-PIE-20260827").catch(e=>
    console.warn("V516A Complementos: sello Dashboard pendiente",e)
  );

  cargar("./js/actualizacion_win_v507.js?v=V512A-SELLO-DASHBOARD").catch(e=>
    console.warn("V516A Complementos: sello compatible pendiente",e)
  );

  cargar("./js/indicadores_win_sync_v4879.js?v=V512-SYNC-UNICA-PUBLICACION").then(()=>
    cargar("./js/partidas_snapshot_auto_v513d.js?v=V513D-SNAPSHOT-AUTO-20260827")
  ).catch(e=>
    console.warn("V516A Complementos: sincronizador WIN / snapshot Partidas pendiente",e)
  );

  cargar("./js/checklist_rapido_v508.js?v=V508-CHECKLIST-RAPIDO").catch(e=>
    console.warn("V516A Complementos: optimizacion Checklist pendiente",e)
  );

  cargar("./js/actas_tecnico_sin_descarga_v508.js?v=V508-ACTAS-TECNICO").catch(e=>
    console.warn("V516A Complementos: restriccion descarga Actas pendiente",e)
  );

  cargar("./js/actas_guardar_sync_v510.js?v=V511-GUARDAR-ACTA").catch(e=>
    console.warn("V516A Complementos: sincronizacion Guardar Acta pendiente",e)
  );

  cargar("./js/actas_multiples_trabajos_v511.js?v=V511-MULTIPLES-TRABAJOS").catch(e=>
    console.warn("V516A Complementos: multiples trabajos por pedido pendiente",e)
  );

  const objetivo=document.getElementById("pantalla")||document.body;
  if(objetivo){
    const obs=new MutationObserver(()=>prepararDashboard());
    obs.observe(objetivo,{childList:true,subtree:true});
  }
  document.addEventListener("click",()=>setTimeout(prepararDashboard,60),true);
  setTimeout(prepararDashboard,250);
})();
