/* ================================================================
   MI VISUAL V580 - ESTADO INTEGRAL MAPA -> INDICADORES

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
  if(window.MV580_MAPA_ESTADO_SYNC_OK)return;
  window.MV580_MAPA_ESTADO_SYNC_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const ID="mv580EstadoIndicadores";
  let secuencia=0;
  let revisando=false;
  let publicando=false;
  let conservarResultadoHasta=0;

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
    url.searchParams.set("_v580",Date.now()+"-"+Math.random().toString(36).slice(2));
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

  async function post(payload,timeout=18000){
    if(!API)throw new Error("No se encontró la API de MI VISUAL.");
    const ctrl=typeof AbortController==="function"?new AbortController():null;
    const t=ctrl?setTimeout(()=>ctrl.abort(),timeout):null;
    try{
      const r=await fetch(API,{
        method:"POST",
        redirect:"follow",
        headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},
        body:JSON.stringify(payload||{}),
        signal:ctrl?ctrl.signal:undefined
      });
      const s=(await r.text()).trim();
      if(!r.ok)throw new Error("HTTP "+r.status);
      const j=JSON.parse(s);
      if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"Operación no disponible");
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
    caja.innerHTML=`<div style="min-width:220px;flex:1"><b>Sincronización integral</b><div data-mv580-texto style="margin-top:3px;color:#475569">Verificando Mapa e indicadores...</div><div data-mv580-capas style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"></div></div><button type="button" data-mv580-btn style="display:none;border:0;border-radius:9px;padding:9px 12px;background:#d97706;color:#fff;font-weight:900;cursor:pointer">Sincronizar pendientes</button>`;

    const contador=document.getElementById("moContador");
    if(contador&&contador.parentNode===vista)vista.insertBefore(caja,contador);
    else vista.appendChild(caja);

    caja.querySelector("[data-mv580-btn]")?.addEventListener("click",sincronizarAhora);
    return caja;
  }

  function chip(nombre,info){
    const ok=info&&info.alDia;
    const fecha=txt(info&&info.dia||info&&info.fecha||"");
    return '<span style="padding:4px 7px;border-radius:999px;font-weight:900;background:'+
      (ok?'#dcfce7':'#ffedd5')+';color:'+(ok?'#166534':'#9a3412')+'">'+
      esc(nombre)+' '+(ok?'✓':'⚠')+(fecha?' · '+esc(fecha):'')+'</span>';
  }

  function pintar(estado){
    const caja=asegurarCaja();
    if(!caja)return;
    const texto=caja.querySelector("[data-mv580-texto]");
    const capasEl=caja.querySelector("[data-mv580-capas]");
    const btn=caja.querySelector("[data-mv580-btn]");
    if(!texto||!btn)return;

    if(capasEl){
      const capas=estado&&estado.capas||{};
      capasEl.innerHTML=[
        chip("Producción",capas.produccion),
        chip("Efectividad",capas.efectividad),
        chip("Recableado",capas.recableado),
        chip("VTR/GAR",capas.vtrGar),
        chip("Ranking",capas.ranking),
        chip("Dashboard",capas.dashboard),
        chip("SLA",capas.sla)
      ].join("");
    }

    if(estado.tipo==="pendiente"){
      caja.style.background="#fff7ed";caja.style.borderColor="#fdba74";
      texto.innerHTML='Mapa <b>'+esc(estado.mapa||"actualizado")+'</b> · <strong style="color:#9a3412">hay capas pendientes.</strong>'+
        (estado.cola?' Cola: <b>'+esc(estado.cola)+'</b>.':'');
      btn.style.display="inline-block";btn.disabled=false;btn.textContent="Sincronizar pendientes";
      return;
    }

    if(estado.tipo==="procesando"){
      caja.style.background="#eff6ff";caja.style.borderColor="#93c5fd";
      texto.innerHTML='Sincronización integral en curso para <b>'+esc(estado.periodo||periodo())+'</b>. No vuelva a cargar el Excel.';
      btn.style.display="inline-block";btn.disabled=true;btn.textContent="Sincronizando...";
      return;
    }

    if(estado.tipo==="ok"){
      caja.style.background="#ecfdf5";caja.style.borderColor="#86efac";
      texto.innerHTML='Mapa e indicadores al día para <b>'+esc(estado.periodo||periodo())+'</b>'+
        (estado.fecha?' · '+esc(estado.fecha):'')+'.';
      btn.style.display="none";
      return;
    }

    caja.style.background="#fff7ed";caja.style.borderColor="#fdba74";
    texto.textContent=estado.mensaje||"No se pudo comprobar el estado de sincronización.";
    btn.style.display="inline-block";btn.disabled=false;btn.textContent="Revisar / sincronizar";
  }

  async function revisarEstado(forzar){
    if(!puede()||!document.getElementById("moVistaFiltros")||revisando||publicando)return;
    if(Date.now()<conservarResultadoHasta&&!forzar)return;
    const miSec=++secuencia;
    revisando=true;
    try{
      const p=periodo();
      if(!/^\d{4}-\d{2}$/.test(p))return;
      const d=await get({
        accion:"estadoSincronizacionIntegralV580",
        usuario:usuario(),
        periodo:p
      },22000);
      if(miSec!==secuencia)return;

      const cola=d.cola||{};
      const colaEstado=txt(cola.estado||"");
      const capas=d.capas||{};

      if(d.sincronizado){
        pintar({
          tipo:"ok",
          periodo:p,
          fecha:txt(d.mapa&&d.mapa.texto||""),
          capas:capas
        });
        return;
      }

      if(["PROCESANDO","SISTEMA_OCUPADO"].includes(colaEstado)){
        pintar({
          tipo:"procesando",
          periodo:p,
          capas:capas
        });
        return;
      }

      pintar({
        tipo:"pendiente",
        mapa:txt(d.mapa&&d.mapa.texto||""),
        cola:colaEstado,
        capas:capas
      });
    }catch(e){
      pintar({
        tipo:"error",
        mensaje:"No se pudo verificar toda la cadena. No vuelva a cargar el Excel; use Sincronizar pendientes."
      });
    }finally{revisando=false;}
  }

  async function sincronizarAhora(){
    if(publicando||!puede())return;
    const p=periodo();
    if(!/^\d{4}-\d{2}$/.test(p))return;

    publicando=true;
    conservarResultadoHasta=0;
    pintar({tipo:"procesando",periodo:p,capas:{}});

    try{
      await post({
        accion:"reintentarSincronizacionIntegralV580",
        usuario:usuario(),
        periodo:p
      },18000);

      const limite=Date.now()+7*60*1000;
      while(Date.now()<limite){
        await new Promise(r=>setTimeout(r,10000));
        const d=await get({
          accion:"estadoSincronizacionIntegralV580",
          usuario:usuario(),
          periodo:p
        },22000);

        if(d.sincronizado){
          conservarResultadoHasta=Date.now()+45000;
          pintar({
            tipo:"ok",
            periodo:p,
            fecha:txt(d.mapa&&d.mapa.texto||""),
            capas:d.capas||{}
          });
          try{
            sessionStorage.removeItem("MV395_MAPA_CAT");
            sessionStorage.removeItem("MV395_MAPA_LIST");
            if(typeof window.mv366InvalidarResumenDashboard==="function")window.mv366InvalidarResumenDashboard(p);
          }catch(_){}
          return;
        }

        const est=txt(d.cola&&d.cola.estado||"");
        if(est==="ERROR"){
          pintar({
            tipo:"pendiente",
            mapa:txt(d.mapa&&d.mapa.texto||""),
            cola:"ERROR",
            capas:d.capas||{}
          });
          return;
        }

        pintar({tipo:"procesando",periodo:p,capas:d.capas||{}});
      }

      pintar({
        tipo:"error",
        mensaje:"La sincronización sigue ejecutándose. No vuelva a cargar el Excel; vuelva a revisar en unos minutos."
      });
    }catch(e){
      pintar({
        tipo:"error",
        mensaje:"No se pudo programar la sincronización: "+(e&&e.message?e.message:String(e))
      });
    }finally{
      publicando=false;
    }
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

  const obs=new MutationObserver(()=>{
    // V545: evitar ciclo de mutaciones causado por los propios cambios del panel.
    // Solo activar cuando aparece la vista del Mapa y el panel aún no existe.
    if(!document.getElementById("moVistaFiltros"))return;
    if(document.getElementById(ID))return;
    activarSiMapa();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(activarSiMapa,300);

  window.mv580RevisarEstadoIndicadores=()=>revisarEstado(true);
  window.mv580SincronizarIndicadores=sincronizarAhora;
})();
