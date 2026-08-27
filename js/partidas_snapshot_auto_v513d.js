/* ============================================================
   MI VISUAL V513D - SNAPSHOT AUTOMATICO PARTIDAS
   - No altera el sincronizador V512.
   - Después de una carga WIN confirmada reconstruye SIM_PARTIDAS_V513.
   - El botón ↻ de Partidas fuerza reconstrucción bajo demanda.
   - La apertura normal de Partidas sigue usando snapshot rápido.
============================================================ */
(function(){
  "use strict";
  if(window.MV513D_SNAPSHOT_AUTO_OK)return;
  window.MV513D_SNAPSHOT_AUTO_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  let hookMapa=null;
  let recargarBase=null;
  let refrescando=null;

  function txt(v){return String(v==null?"":v).trim();}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function periodoActual(){
    try{
      const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
      const y=p.find(x=>x.type==="year")?.value||"",m=p.find(x=>x.type==="month")?.value||"";
      return y&&m?`${y}-${m}`:"";
    }catch(_){return "";}
  }
  function periodoUI(){
    const a=txt(document.querySelector("[data-mv513-periodo]")?.value||"");
    if(/^\d{4}-\d{2}$/.test(a))return a;
    const b=txt(document.getElementById("moFiltroPeriodo")?.value||"");
    return /^\d{4}-\d{2}$/.test(b)?b:periodoActual();
  }
  async function apiPost(payload){
    if(!API)throw new Error("No se encontró la URL de MI VISUAL.");
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},body:JSON.stringify(payload),cache:"no-store",redirect:"follow"});
    const t=(await r.text()).trim();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvió JSON para refrescar Partidas.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo refrescar Partidas.");
    return j;
  }
  function refrescar(periodo){
    const p=/^\d{4}-\d{2}$/.test(txt(periodo))?txt(periodo):periodoUI();
    if(!p||p<"2026-08")return Promise.resolve({ok:true,omitido:true,periodo:p});
    if(refrescando)return refrescando;
    refrescando=apiPost({accion:"refrescarSimPartidasV513",usuario:usuario(),periodo:p})
      .then(r=>{try{window.dispatchEvent(new CustomEvent("mv513SnapshotActualizado",{detail:r}));}catch(_){}return r;})
      .finally(()=>{refrescando=null;});
    return refrescando;
  }
  window.mv513dRefrescarSnapshot=refrescar;

  function instalarRecargar(){
    if(typeof window.mv513Recargar!=="function")return;
    if(window.mv513Recargar.__mv513dSnapshot)return;
    recargarBase=window.mv513Recargar;
    const f=async function(){
      const btn=document.querySelector('#mv505PartidasModal button[onclick="mv513Recargar()"]');
      const viejo=btn?btn.textContent:"";
      if(btn){btn.disabled=true;btn.textContent="⏳";}
      try{
        await refrescar(periodoUI());
        return await recargarBase();
      }catch(e){
        alert("No se pudo reconstruir Partidas: "+(e?.message||String(e)));
        return recargarBase();
      }finally{
        if(btn){btn.disabled=false;btn.textContent=viejo||"↻";}
      }
    };
    f.__mv513dSnapshot=true;
    f.__base=recargarBase;
    window.mv513Recargar=f;
    window.mv505RecargarPartidas=f;
  }

  function instalarHookMapa(){
    const actual=window.moRegistrarImportacion;
    if(typeof actual!=="function")return;
    if(actual.__mv513dSnapshot)return;
    const f=async function(){
      const r=await actual.apply(this,arguments);
      try{await refrescar(periodoUI());}
      catch(e){console.warn("V513D: snapshot Partidas pendiente",e);}
      return r;
    };
    f.__mv513dSnapshot=true;
    f.__base=actual;
    window.moRegistrarImportacion=f;
    try{moRegistrarImportacion=f;}catch(_){}
    hookMapa=f;
  }

  document.addEventListener("click",()=>setTimeout(()=>{instalarRecargar();instalarHookMapa();},80),true);
  const obs=new MutationObserver(()=>{instalarRecargar();instalarHookMapa();});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{instalarRecargar();instalarHookMapa();},1200);
  setTimeout(()=>{instalarRecargar();instalarHookMapa();},250);
})();