/* ================================================================
   MI VISUAL V544 - ESTADO Y RECUPERACION INTEGRAL MAPA -> INDICADORES

   - SOLO Jefatura/Admin.
   - No ejecuta publicaciones pesadas al abrir el mapa.
   - Compara el sello de MAPA_ORDENES con el sello de publicación V512.
   - Si existe desfase, muestra un botón explícito "Sincronizar indicadores".
   - Una sola publicación oficial actualiza Producción, Efectividad,
     Recableado, VTR/GAR, Ranking y Resumen Dashboard mediante el publicador
     vigente V517D/V487 del backend.
   - Reinstala el hook de importación cuando el módulo Mapa se carga tarde,
     evitando que una sesión larga pierda la sincronización automática.
   - Nunca reintenta la importación del Excel.
================================================================ */
(function(){
  "use strict";
  if(window.MV544_MAPA_ESTADO_SYNC_OK)return;
  window.MV544_MAPA_ESTADO_SYNC_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const ID="mv544EstadoIndicadores";
  let secuencia=0;
  let revisando=false;
  let publicando=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function puede(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfil());}
  function periodo(){
    const p=txt(document.getElementById("moFiltroPeriodo")?.value);
    if(/^\d{4}-\d{2}$/.test(p))return p;
    const d=new Date();
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(d);
    return `${partes.find(x=>x.type==="year")?.value||""}-${partes.find(x=>x.type==="month")?.value||""}`;
  }
  function ms(v){
    const n=Date.parse(txt(v));
    return Number.isFinite(n)?n:0;
  }
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

  async function get(payload,timeout=18000){
    if(!API)throw new Error("No se encontró la API de MI VISUAL.");
    const url=new URL(API);
    Object.entries(payload||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v));
    });
    url.searchParams.set("_v544",Date.now()+"-"+Math.random().toString(36).slice(2));
    const c=typeof AbortController==="function"?new AbortController():null;
    const t=c?setTimeout(()=>c.abort(),timeout):null;
    try{
      const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{Accept:"application/json"},signal:c?c.signal:undefined});
      const s=(await r.text()).trim();
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=JSON.parse(s);
      if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"Consulta no disponible");
      return j;
    }finally{if(t)clearTimeout(t);}
  }

  function asegurarCaja(){
    if(!puede())return null;
    const vista=document.getElementById("moVistaFiltros");
    if(!vista)return null;
    let caja=document.getElementById(ID);
    if(caja)return caja;

    caja=document.createElement("div");
    caja.id=ID;
    caja.style.cssText="margin:10px 0 12px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#0f172a;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px";
    caja.innerHTML=`<div style="min-width:220px;flex:1"><b>Sincronización de indicadores</b><div data-mv544-texto style="margin-top:3px;color:#475569">Verificando estado...</div></div><button type="button" data-mv544-btn style="display:none;border:0;border-radius:9px;padding:9px 12px;background:#d97706;color:#fff;font-weight:900;cursor:pointer">Sincronizar indicadores</button>`;

    const contador=document.getElementById("moContador");
    if(contador&&contador.parentNode===vista)vista.insertBefore(caja,contador);
    else vista.appendChild(caja);

    caja.querySelector("[data-mv544-btn]")?.addEventListener("click",sincronizarAhora);
    return caja;
  }

  function pintar(estado){
    const caja=asegurarCaja();
    if(!caja)return;
    const texto=caja.querySelector("[data-mv544-texto]");
    const btn=caja.querySelector("[data-mv544-btn]");
    if(!texto||!btn)return;

    if(estado.tipo==="pendiente"){
      caja.style.background="#fff7ed";caja.style.borderColor="#fdba74";
      texto.innerHTML=`Mapa: <b>${esc(estado.mapa||"actualizado")}</b> · Indicadores: <b>${esc(estado.indicadores||"sin publicación reciente")}</b>. <strong style="color:#9a3412">Pendiente de sincronizar.</strong>`;
      btn.style.display="inline-block";btn.disabled=false;btn.textContent="Sincronizar indicadores";
      return;
    }
    if(estado.tipo==="procesando"){
      caja.style.background="#eff6ff";caja.style.borderColor="#93c5fd";
      texto.innerHTML=`Sincronizando <b>${esc(estado.periodo||periodo())}</b>: Producción, Efectividad, Recableado, VTR/GAR, Ranking y Dashboard...`;
      btn.style.display="inline-block";btn.disabled=true;btn.textContent="Sincronizando...";
      return;
    }
    if(estado.tipo==="ok"){
      caja.style.background="#ecfdf5";caja.style.borderColor="#86efac";
      texto.innerHTML=`Indicadores al día para <b>${esc(estado.periodo||periodo())}</b>${estado.fecha?` · ${esc(estado.fecha)}`:""}.`;
      btn.style.display="none";
      return;
    }
    caja.style.background="#fff7ed";caja.style.borderColor="#fdba74";
    texto.textContent=estado.mensaje||"No se pudo comprobar el estado de sincronización.";
    btn.style.display="inline-block";btn.disabled=false;btn.textContent="Revisar / sincronizar";
  }

  async function revisarEstado(forzar){
    if(!puede()||!document.getElementById("moVistaFiltros")||revisando||publicando)return;
    const miSec=++secuencia;
    revisando=true;
    try{
      try{if(typeof window.mv505InstalarHookWin==="function")window.mv505InstalarHookWin();}catch(_){}
      const p=periodo();
      if(!/^\d{4}-\d{2}$/.test(p))return;
      const [m,i]=await Promise.all([
        get({accion:"obtenerUltimaActualizacionMapaOperativo",usuario:usuario()}),
        get({accion:"obtenerActualizacionIndicadoresWinV512",usuario:usuario(),periodo:p})
      ]);
      if(miSec!==secuencia)return;
      const mapaIso=txt(m.ultimaActualizacionIso||m.ultimaActualizacion||"");
      const indIso=txt(i.fechaPublicacion||"");
      const mapaMs=ms(mapaIso),indMs=ms(indIso);
      const mapaVisible=txt(m.ultimaActualizacionVisible||m.ultimaActualizacionTexto||mapaIso);
      const indVisible=txt(i.fechaPublicacionTexto||indIso);

      if(mapaMs && (!indMs || indMs<mapaMs)){
        pintar({tipo:"pendiente",mapa:mapaVisible,indicadores:indVisible});
      }else{
        pintar({tipo:"ok",periodo:p,fecha:indVisible||mapaVisible});
      }
    }catch(e){
      if(forzar)pintar({tipo:"error",mensaje:"No se pudo verificar el estado ahora. Puede reintentar sin volver a cargar el Excel."});
    }finally{revisando=false;}
  }

  async function sincronizarAhora(){
    if(publicando||!puede())return;
    const p=periodo();
    if(!/^\d{4}-\d{2}$/.test(p))return;
    if(typeof window.mv4879PublicarIndicadoresWin!=="function"){
      pintar({tipo:"error",mensaje:"El sincronizador todavía está cargando. Espere unos segundos y vuelva a pulsar."});
      try{if(typeof window.mv505InstalarHookWin==="function")window.mv505InstalarHookWin();}catch(_){}
      return;
    }

    publicando=true;
    pintar({tipo:"procesando",periodo:p});
    try{
      const r=await window.mv4879PublicarIndicadoresWin(p,"RECUPERACION_MANUAL_V544");
      const fecha=txt(r&&r.fechaPublicacionTexto||"");
      pintar({tipo:"ok",periodo:p,fecha});
      try{sessionStorage.removeItem("MV395_MAPA_CAT");sessionStorage.removeItem("MV395_MAPA_LIST");}catch(_){}
      setTimeout(()=>revisarEstado(true),1200);
    }catch(e){
      pintar({tipo:"error",mensaje:"La sincronización no pudo confirmarse: "+(e&&e.message?e.message:String(e))+". No vuelva a cargar el Excel; primero reintente este botón."});
    }finally{publicando=false;}
  }

  function activarSiMapa(){
    if(!puede()||!document.getElementById("moVistaFiltros"))return;
    asegurarCaja();
    try{if(typeof window.mv505InstalarHookWin==="function")window.mv505InstalarHookWin();}catch(_){}
    setTimeout(()=>revisarEstado(false),250);
  }

  document.addEventListener("click",()=>setTimeout(activarSiMapa,120),true);
  document.addEventListener("change",e=>{
    if(e&&e.target&&e.target.id==="moFiltroPeriodo")setTimeout(()=>revisarEstado(true),120);
  },true);
  window.addEventListener("mv487IndicadoresPublicados",()=>setTimeout(()=>revisarEstado(true),500));

  const obs=new MutationObserver(()=>activarSiMapa());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(activarSiMapa,300);

  window.mv544RevisarEstadoIndicadores=()=>revisarEstado(true);
  window.mv544SincronizarIndicadores=sincronizarAhora;
})();
