/* ================================================================
   MI VISUAL V505 - Sincronizador automatico WIN -> indicadores

   Base compatible V487.12 / backend V503.
   - Se ejecuta despues de una importacion WIN valida del Mapa Operativo.
   - Publica SOLO desde agosto 2026.
   - Julio 2026 y anteriores permanecen cerrados.
   - Produccion, Efectividad, Recableado y VTR/GAR se publican juntos.
   - Ranking y caches se reconstruyen en backend.
   - No altera la logica SLA.
================================================================ */
(function(){
  "use strict";
  if(window.MV505_INDICADORES_WIN_SYNC_OK)return;
  window.MV505_INDICADORES_WIN_SYNC_OK=true;
  window.MV4879_INDICADORES_WIN_SYNC_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const PERIODO_MINIMO="2026-08";
  const CONFIRMACION="PUBLICAR_V487_CONFIRMADO";
  let timer=null;
  let pendientes=new Set();
  let ultima=null;
  let promesaPendiente=null;
  let resolverPendiente=null;
  let rechazarPendiente=null;
  let hookInstalado=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function puedePublicar(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfil());}
  function periodoValido(p){return /^\d{4}-\d{2}$/.test(txt(p));}

  function periodoActual(){
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const y=partes.find(x=>x.type==="year")?.value||"";
    const m=partes.find(x=>x.type==="month")?.value||"";
    return y&&m?`${y}-${m}`:"";
  }

  function periodoMapa(){
    const p=txt(document.getElementById("moFiltroPeriodo")?.value||"");
    return periodoValido(p)?p:periodoActual();
  }

  async function apiPost(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},
      body:JSON.stringify(payload),
      cache:"no-store",
      redirect:"follow"
    });
    const t=(await r.text()).trim();
    let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio JSON para sincronizar indicadores WIN.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo completar la publicacion WIN.");
    return j;
  }

  function anexarEstado(texto,tipo){
    const msg=document.getElementById("moImportMsg");
    if(!msg)return;
    if(tipo==="ok") msg.className="mo-msg mo-ok";
    else if(tipo==="warn" && !msg.classList.contains("mo-ok")) msg.className="mo-msg";
    const previo=String(msg.textContent||"").trim();
    msg.textContent=(previo?previo+"\n":"")+texto;
  }

  function invalidarCachesCliente(periodo){
    try{
      sessionStorage.removeItem("MV395_MAPA_CAT");
      sessionStorage.removeItem("MV395_MAPA_LIST");
    }catch(_){}
    try{
      if(typeof window.mv366InvalidarResumenDashboard==="function"){
        window.mv366InvalidarResumenDashboard(periodo||"");
      }
    }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent("mv505CachesIndicadoresInvalidadas",{detail:{periodo:periodo||""}}));
    }catch(_){}
  }
  window.mv4879InvalidarCachesCliente=invalidarCachesCliente;

  async function previsualizarPeriodo(periodo){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p)throw new Error("No se pudo determinar el periodo WIN.");
    if(p<PERIODO_MINIMO){
      return {ok:true,version:"V505",periodo:p,omitidoPorCierre:true,julioCongelado:true};
    }
    return apiPost({
      accion:"previsualizarPublicacionIndicadoresWinV487",
      usuario:usuario(),
      periodo:p
    });
  }

  async function publicarPeriodo(periodo){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p)throw new Error("No se pudo determinar el periodo WIN.");
    if(p<PERIODO_MINIMO){
      return {ok:true,version:"V505",periodo:p,omitidoPorCierre:true,julioCongelado:true};
    }

    const preview=await previsualizarPeriodo(p);
    if(preview.produccion&&preview.produccion.ok===false){
      throw new Error(preview.produccion.error||"Produccion tiene casos pendientes de clasificar.");
    }

    const publicado=await apiPost({
      accion:"publicarIndicadoresWinV487",
      usuario:usuario(),
      periodo:p,
      confirmacion:CONFIRMACION
    });
    publicado.previsualizacion=preview;
    ultima=publicado;
    invalidarCachesCliente(p);

    const prod=publicado.produccion||{};
    const ef=publicado.efectividad&&publicado.efectividad.control?publicado.efectividad.control:{};
    anexarEstado(
      `📊 Indicadores actualizados: ${p} · Produccion ${prod.ordenes||0} orden(es) / ${prod.puntos||0} pts · Efectividad ${ef.totalEfectividad||0} orden(es).`,
      "ok"
    );
    try{window.dispatchEvent(new CustomEvent("mv487IndicadoresPublicados",{detail:publicado}));}catch(_){}
    return publicado;
  }

  async function calcularPeriodo(periodo){
    const r=await previsualizarPeriodo(periodo);
    ultima=r;
    try{window.dispatchEvent(new CustomEvent("mv487IndicadoresCalculados",{detail:r}));}catch(_){}
    return r;
  }

  async function ejecutarPendientes(){
    const lista=Array.from(pendientes).filter(periodoValido).sort();
    pendientes=new Set();
    if(!lista.length)lista.push(periodoActual());
    const resultados=[];
    for(const p of lista){
      if(p<PERIODO_MINIMO){
        resultados.push({ok:true,periodo:p,omitidoPorCierre:true,julioCongelado:true});
        continue;
      }
      resultados.push(await publicarPeriodo(p));
    }
    return resultados.length===1?resultados[0]:resultados;
  }

  function sincronizar(periodos){
    (Array.isArray(periodos)?periodos:[periodos]).filter(Boolean).forEach(p=>pendientes.add(txt(p)));
    if(!pendientes.size)pendientes.add(periodoActual());

    if(!promesaPendiente){
      promesaPendiente=new Promise((resolve,reject)=>{
        resolverPendiente=resolve;
        rechazarPendiente=reject;
      });
    }
    const salida=promesaPendiente;
    if(timer)clearTimeout(timer);
    timer=setTimeout(async()=>{
      const resolver=resolverPendiente, rechazar=rechazarPendiente;
      timer=null;
      promesaPendiente=null; resolverPendiente=null; rechazarPendiente=null;
      try{ resolver(await ejecutarPendientes()); }
      catch(e){
        anexarEstado("⚠ La carga WIN se guardo, pero la publicacion de indicadores quedo pendiente: "+(e&&e.message?e.message:String(e)),"warn");
        rechazar(e);
      }
    },900);
    return salida;
  }

  function cargaWinConfirmada(){
    const msg=document.getElementById("moImportMsg");
    if(!msg)return false;
    const texto=norm(msg.textContent||"");
    return msg.classList.contains("mo-ok") || texto.includes("REGISTRO CONFIRMADO");
  }

  function instalarHookMapa(){
    if(hookInstalado) return true;
    const original=window.moRegistrarImportacion;
    if(typeof original!=="function") return false;
    if(original.__mv505WinHook){ hookInstalado=true; return true; }

    const ajustada=async function(){
      const r=await original.apply(this,arguments);
      if(!cargaWinConfirmada()) return r;
      const p=periodoMapa();
      if(!puedePublicar()){
        anexarEstado("ℹ Carga WIN registrada. La publicacion automatica de indicadores requiere perfil Jefatura/Administrador.","warn");
        return r;
      }
      try{
        anexarEstado("⏳ Actualizando Produccion e indicadores desde WIN...","warn");
        await sincronizar(p?[p]:[]);
      }catch(e){
        console.warn("V505 WIN -> indicadores",e);
      }
      return r;
    };
    ajustada.__mv505WinHook=true;
    ajustada.__original=original;
    window.moRegistrarImportacion=ajustada;
    try{moRegistrarImportacion=ajustada;}catch(_){}
    hookInstalado=true;
    console.log("MI VISUAL V505: hook WIN -> indicadores habilitado.");
    return true;
  }

  function observarCargaMapa(){
    if(instalarHookMapa()) return;
    const head=document.head||document.documentElement;
    if(!head)return;
    const obs=new MutationObserver(muts=>{
      muts.forEach(m=>Array.from(m.addedNodes||[]).forEach(n=>{
        if(!n||n.tagName!=="SCRIPT")return;
        const src=String(n.src||"");
        if(src.includes("mapa_rapido_v395.js")){
          n.addEventListener("load",()=>setTimeout(()=>{
            if(instalarHookMapa()) obs.disconnect();
          },30),{once:true});
        }
      }));
    });
    obs.observe(head,{childList:true,subtree:true});
    const rapido=Array.from(document.scripts).find(s=>String(s.src||"").includes("mapa_rapido_v395.js"));
    if(rapido) setTimeout(()=>{ if(instalarHookMapa()) obs.disconnect(); },120);
  }

  window.mv4879CalcularIndicadoresWin=calcularPeriodo;
  window.mv4879PublicarIndicadoresWin=publicarPeriodo;
  window.mv4879SincronizarIndicadoresWin=sincronizar;
  window.mv4879UltimoResultado=()=>ultima;
  window.mv505InstalarHookWin=instalarHookMapa;

  observarCargaMapa();
})();
