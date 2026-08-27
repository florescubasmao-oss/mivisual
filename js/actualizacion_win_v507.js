/* ============================================================
   MI VISUAL V507 - FECHA/HORA UNICA DE ACTUALIZACION WIN

   Alcance estricto:
   - Muestra en Dashboard, Ranking y Mi Desempeno la misma fecha/hora
     de ultima carga que usa Mapa Operativo.
   - Fuente unica: catalogosMapaOperativo -> ultimaActualizacionTexto.
   - Hora visible en zona America/Lima.
   - Se refresca al abrir/cambiar de pantalla y despues de una
     publicacion automatica WIN -> indicadores.
   - No modifica calculos, Produccion, Ranking, SLA ni Partner.
============================================================ */
(function(){
  "use strict";
  if(window.MV507_ACTUALIZACION_WIN_OK) return;
  window.MV507_ACTUALIZACION_WIN_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const TTL=15000;
  let cache={valor:"",fecha:0};
  let enCurso=null;
  let timer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}

  function formatearPeru(valor){
    const original=txt(valor);
    if(!original) return "";

    try{
      if(typeof window.formatearFechaHoraTextoPeruApp==="function"){
        const r=txt(window.formatearFechaHoraTextoPeruApp(original,false));
        if(r) return r;
      }
    }catch(_){}

    const local=original.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(local){
      const f=`${String(local[1]).padStart(2,"0")}/${String(local[2]).padStart(2,"0")}/${local[3]}`;
      if(local[4]!==undefined) return `${f} ${String(local[4]).padStart(2,"0")}:${local[5]}${local[6]?":"+local[6]:""}`;
      return f;
    }

    if(/[TZ]|[+-]\d{2}:?\d{2}$/.test(original)){
      const d=new Date(original);
      if(!Number.isNaN(d.getTime())){
        return new Intl.DateTimeFormat("es-PE",{
          timeZone:"America/Lima",day:"2-digit",month:"2-digit",year:"numeric",
          hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false
        }).format(d).replace(",","");
      }
    }
    return original;
  }

  async function consultar(force){
    if(!API) return "";
    const ahora=Date.now();
    if(!force && cache.valor && ahora-cache.fecha<TTL) return cache.valor;
    if(enCurso) return enCurso;

    enCurso=(async()=>{
      const url=new URL(API);
      url.searchParams.set("accion","catalogosMapaOperativo");
      url.searchParams.set("usuario",usuario());
      url.searchParams.set("_mv507",String(Date.now()));
      const r=await fetch(url.toString(),{
        method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}
      });
      const t=txt(await r.text());
      let j;
      try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida al consultar actualizacion WIN.");}
      if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo consultar la actualizacion WIN.");
      const valor=formatearPeru(j.ultimaActualizacionTexto||"");
      if(valor) cache={valor,fecha:Date.now()};
      return valor;
    })();

    try{return await enCurso;}
    finally{enCurso=null;}
  }

  function pantallaActual(){return document.getElementById("pantalla");}
  function tipoPantalla(){
    const p=pantallaActual();
    if(!p) return "";
    const titulos=Array.from(p.querySelectorAll("h1,h2,h3"))
      .slice(0,8).map(x=>norm(x.textContent||"")).join(" | ");
    if(/MI DESEMPENO/.test(titulos)) return "MI DESEMPEÑO";
    if(/RANKING/.test(titulos)) return "RANKING";
    if(/DASHBOARD/.test(titulos)) return "DASHBOARD";
    return "";
  }

  function estilos(){
    if(document.getElementById("mv507ActualizacionWinCss")) return;
    const s=document.createElement("style");
    s.id="mv507ActualizacionWinCss";
    s.textContent=`
      .mv507-actualizacion-win{max-width:980px;margin:6px auto 12px;padding:9px 12px;border-radius:12px;
        background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;display:flex;align-items:center;
        justify-content:center;gap:7px;flex-wrap:wrap;font-size:12px;font-weight:750;line-height:1.3;box-sizing:border-box}
      .mv507-actualizacion-win b{font-weight:950;color:#0f172a}
      .mv507-actualizacion-win small{font-size:10px;color:#64748b;font-weight:700}
    `;
    document.head.appendChild(s);
  }

  function pintar(valor){
    const p=pantallaActual();
    const tipo=tipoPantalla();
    let badge=document.getElementById("mv507ActualizacionWin");
    if(!p||!tipo){if(badge) badge.remove();return;}
    if(!valor) return;
    estilos();
    if(!badge){
      badge=document.createElement("div");
      badge.id="mv507ActualizacionWin";
      badge.className="mv507-actualizacion-win";
      const titulo=p.querySelector("h1,h2,h3");
      if(titulo&&titulo.parentNode) titulo.insertAdjacentElement("afterend",badge);
      else p.prepend(badge);
    }
    const firma=`${tipo}|${valor}`;
    if(badge.dataset.firma===firma) return;
    badge.dataset.firma=firma;
    badge.innerHTML=`<span>🕒 Última actualización WIN:</span><b>${valor}</b><small>hora Perú · misma fuente de Mapa Operativo</small>`;
  }

  async function refrescar(force){
    if(!tipoPantalla()){pintar("");return "";}
    try{
      const valor=await consultar(!!force);
      pintar(valor);
      return valor;
    }catch(e){
      console.warn("V507 actualizacion WIN",e);
      if(cache.valor) pintar(cache.valor);
      return cache.valor||"";
    }
  }

  function programar(force){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;refrescar(!!force);},120);
  }

  function invalidarYRefrescar(){
    cache={valor:"",fecha:0};
    programar(true);
  }

  function iniciar(){
    estilos();
    const p=pantallaActual();
    if(p){
      const obs=new MutationObserver(()=>programar(false));
      obs.observe(p,{childList:true,subtree:true});
    }
    document.addEventListener("click",()=>programar(false),true);
    window.addEventListener("mv487IndicadoresPublicados",invalidarYRefrescar);
    window.addEventListener("mv505CachesIndicadoresInvalidadas",invalidarYRefrescar);
    programar(true);
  }

  window.mv507RefrescarActualizacionWin=()=>refrescar(true);
  window.mv507UltimaActualizacionWin=()=>cache.valor;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  console.log("MI VISUAL V507: fecha/hora WIN unificada con Mapa Operativo.");
})();
