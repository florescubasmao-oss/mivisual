/* ============================================================
   MI VISUAL V512 - SELLO REAL DE ACTUALIZACION DE INDICADORES

   Alcance estricto:
   - Dashboard, Ranking y Mi Desempeno muestran un sello compacto.
   - Fuente preferente: obtenerActualizacionIndicadoresWinV512.
   - Compatibilidad temporal: si el complemento Apps Script V512 aun no
     esta publicado, usa catalogosMapaOperativo como respaldo visual.
   - El boton 🔄 publica manualmente el periodo para Jefatura/Admin.
     Para otros perfiles solo refresca el sello visible.
   - No modifica calculos, Produccion, Ranking, SLA ni Partner.
============================================================ */
(function(){
  "use strict";
  if(window.MV507_ACTUALIZACION_WIN_OK) return;
  window.MV507_ACTUALIZACION_WIN_OK=true;
  window.MV512_ACTUALIZACION_INDICADORES_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const TTL=15000;
  let cache={valor:"",fecha:0,fuente:""};
  let enCurso=null;
  let timer=null;
  let actualizandoManual=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function puedePublicar(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfil());}

  function periodoActual(){
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const y=partes.find(x=>x.type==="year")?.value||"";
    const m=partes.find(x=>x.type==="month")?.value||"";
    return y&&m?`${y}-${m}`:"";
  }

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
          hour:"2-digit",minute:"2-digit",hour12:false
        }).format(d).replace(",","");
      }
    }
    return original;
  }

  async function getJson(accion,extras){
    if(!API) throw new Error("No se encontro la URL de MI VISUAL.");
    const url=new URL(API);
    url.searchParams.set("accion",accion);
    url.searchParams.set("usuario",usuario());
    Object.entries(extras||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&txt(v)!=="") url.searchParams.set(k,txt(v));
    });
    url.searchParams.set("_mv512",String(Date.now()));
    const r=await fetch(url.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}
    });
    const t=txt(await r.text());
    let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida para el sello de indicadores.");}
    if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo consultar el sello de indicadores.");
    return j;
  }

  async function consultarSelloPublicacion(){
    const j=await getJson("obtenerActualizacionIndicadoresWinV512",{periodo:periodoActual()});
    const valor=formatearPeru(j.fechaPublicacionTexto||j.fechaActualizacionTexto||j.fechaPublicacion||j.fechaActualizacion||"");
    if(!valor) throw new Error("El backend V512 no devolvio fecha de publicacion.");
    return {valor,fuente:j.fuente||"PUBLICACION_INDICADORES"};
  }

  async function consultarSelloMapaRespaldo(){
    const j=await getJson("catalogosMapaOperativo",{});
    const valor=formatearPeru(j.ultimaActualizacionTexto||"");
    return {valor,fuente:"MAPA_RESPALDO"};
  }

  async function consultar(force){
    if(!API) return {valor:"",fuente:""};
    const ahora=Date.now();
    if(!force && cache.valor && ahora-cache.fecha<TTL) return {valor:cache.valor,fuente:cache.fuente};
    if(enCurso) return enCurso;

    enCurso=(async()=>{
      let dato;
      try{
        dato=await consultarSelloPublicacion();
      }catch(e){
        // El respaldo permite desplegar V512 frontend antes de publicar el
        // pequeno complemento Apps Script. No cambia ningun indicador.
        dato=await consultarSelloMapaRespaldo();
      }
      if(dato&&dato.valor) cache={valor:dato.valor,fecha:Date.now(),fuente:dato.fuente||""};
      return dato||{valor:"",fuente:""};
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
      .mv507-actualizacion-win{width:max-content;max-width:calc(100% - 20px);margin:4px auto 8px;padding:5px 9px;border-radius:999px;
        background:#f8fafc;border:1px solid #cbd5e1;color:#475569;display:flex;align-items:center;
        justify-content:center;gap:5px;flex-wrap:nowrap;font-size:11px;font-weight:750;line-height:1.2;box-sizing:border-box}
      .mv507-actualizacion-win b{font-weight:900;color:#0f172a;white-space:nowrap}
      .mv512-refresh{border:0;background:transparent;padding:1px 3px;margin:0;cursor:pointer;font-size:14px;line-height:1;color:#2563eb;border-radius:6px}
      .mv512-refresh:hover{background:#e2e8f0}.mv512-refresh:disabled{opacity:.45;cursor:wait}
      @media(max-width:520px){.mv507-actualizacion-win{font-size:10.5px;max-width:calc(100% - 12px)}}
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
    const firma=`${tipo}|${valor}|${actualizandoManual}`;
    if(badge.dataset.firma===firma) return;
    badge.dataset.firma=firma;
    badge.innerHTML=`<span>Actualizado:</span><b>${valor}</b><button id="mv512ActualizarIndicadores" class="mv512-refresh" type="button" ${actualizandoManual?"disabled":""} title="${puedePublicar()?"Actualizar indicadores ahora":"Refrescar fecha de actualizacion"}" aria-label="Actualizar">🔄</button>`;
  }

  async function refrescar(force){
    if(!tipoPantalla()){pintar("");return "";}
    try{
      const dato=await consultar(!!force);
      pintar(dato.valor||"");
      return dato.valor||"";
    }catch(e){
      console.warn("V512 actualizacion indicadores",e);
      if(cache.valor) pintar(cache.valor);
      return cache.valor||"";
    }
  }

  function programar(force){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;refrescar(!!force);},120);
  }

  function invalidarYRefrescar(){
    cache={valor:"",fecha:0,fuente:""};
    programar(true);
  }

  async function actualizarManual(){
    if(actualizandoManual) return;
    actualizandoManual=true;
    pintar(cache.valor||"");
    try{
      if(puedePublicar() && typeof window.mv4879PublicarIndicadoresWin==="function"){
        await window.mv4879PublicarIndicadoresWin(periodoActual());
        cache={valor:"",fecha:0,fuente:""};
      }
      await refrescar(true);
    }catch(e){
      console.warn("V512 actualizacion manual",e);
      alert("No se pudo actualizar los indicadores: "+(e&&e.message?e.message:String(e)));
    }finally{
      actualizandoManual=false;
      pintar(cache.valor||"");
    }
  }

  function iniciar(){
    estilos();
    const p=pantallaActual();
    if(p){
      const obs=new MutationObserver(()=>programar(false));
      obs.observe(p,{childList:true,subtree:true});
    }
    document.addEventListener("click",e=>{
      const btn=e.target&&e.target.closest?e.target.closest("#mv512ActualizarIndicadores"):null;
      if(btn){e.preventDefault();e.stopPropagation();actualizarManual();return;}
      programar(false);
    },true);
    window.addEventListener("mv487IndicadoresPublicados",invalidarYRefrescar);
    window.addEventListener("mv505CachesIndicadoresInvalidadas",invalidarYRefrescar);
    programar(true);
  }

  window.mv507RefrescarActualizacionWin=()=>refrescar(true);
  window.mv507UltimaActualizacionWin=()=>cache.valor;
  window.mv512RefrescarActualizacionIndicadores=()=>refrescar(true);
  window.mv512ActualizarIndicadoresManual=actualizarManual;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  console.log("MI VISUAL V512: sello real de indicadores habilitado.");
})();