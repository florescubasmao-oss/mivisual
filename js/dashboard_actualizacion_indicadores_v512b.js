/* ============================================================
   MI VISUAL V512B - ACTUALIZACION DE INDICADORES EN DASHBOARD

   Complemento independiente y seguro:
   - Se muestra SOLO en Dashboard Jefatura/Supervisor.
   - No depende del guard de actualizacion_win_v507.js.
   - Lee el sello real V512 del backend.
   - Si aun no existe una publicacion V512, muestra "pendiente".
   - Jefatura/Admin puede publicar manualmente con el boton 🔄.
   - No cambia formulas, SLA, Partner, Produccion ni Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV512B_DASHBOARD_INDICADORES_OK) return;
  window.MV512B_DASHBOARD_INDICADORES_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const CONFIRMACION="PUBLICAR_V487_CONFIRMADO";
  const PERIODO_MINIMO="2026-08";
  let timer=null;
  let consultando=false;
  let publicando=false;
  let ultimo={texto:"",fuente:""};

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function puedePublicar(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfil());}

  function periodoActual(){
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const y=partes.find(x=>x.type==="year")?.value||"";
    const m=partes.find(x=>x.type==="month")?.value||"";
    return y&&m?`${y}-${m}`:"";
  }

  function esDashboard(){
    const p=document.getElementById("pantalla");
    if(!p) return false;
    const texto=norm((p.textContent||"").slice(0,2200));
    if(!texto) return false;
    const jefatura=texto.includes("JEFATURA") && texto.includes("ZONA NORTE") && texto.includes("PERIODO") && texto.includes("INDICADOR");
    const supervisor=texto.includes("SUPERVISOR") && texto.includes("PERIODO") && texto.includes("INDICADOR");
    return jefatura||supervisor;
  }

  function estilos(){
    if(document.getElementById("mv512bCss")) return;
    const s=document.createElement("style");
    s.id="mv512bCss";
    s.textContent=`
      #mv512bIndicadores{width:max-content;max-width:calc(100% - 20px);margin:8px 0 8px auto;padding:5px 9px;
        border:1px solid #334155;border-radius:999px;background:#0f2747;color:#dbeafe;display:flex;align-items:center;
        gap:5px;font-size:11px;font-weight:700;line-height:1.15;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.16)}
      #mv512bIndicadores b{color:#fff;font-weight:900;white-space:nowrap}
      #mv512bIndicadores .mv512b-pendiente{color:#fde68a}
      #mv512bRefresh{border:0;background:transparent;color:#60a5fa;padding:0 2px;margin:0;cursor:pointer;font-size:15px;line-height:1;border-radius:5px}
      #mv512bRefresh:hover{background:rgba(255,255,255,.1)}
      #mv512bRefresh:disabled{opacity:.45;cursor:wait}
      @media(max-width:520px){#mv512bIndicadores{font-size:10px;margin-right:2px;max-width:calc(100% - 8px)}}
    `;
    document.head.appendChild(s);
  }

  function ubicar(){
    if(!esDashboard()) return null;
    const p=document.getElementById("pantalla");
    let badge=document.getElementById("mv512bIndicadores");
    if(badge) return badge;
    estilos();
    badge=document.createElement("div");
    badge.id="mv512bIndicadores";

    // Colocar debajo de la barra Herramientas cuando exista.
    const hijos=Array.from(p.children||[]);
    const herramientas=hijos.find(el=>norm(el.textContent||"").includes("HERRAMIENTAS"));
    if(herramientas && herramientas.parentNode===p) herramientas.insertAdjacentElement("afterend",badge);
    else p.prepend(badge);
    return badge;
  }

  function pintar(){
    const badge=ubicar();
    if(!badge) return;
    const valor=txt(ultimo.texto);
    const contenido=valor
      ? `<span>Actualizado:</span><b>${valor}</b>`
      : `<span>Indicadores:</span><b class="mv512b-pendiente">pendiente de publicación V512</b>`;
    badge.innerHTML=contenido+`<button id="mv512bRefresh" type="button" ${publicando?"disabled":""} title="${puedePublicar()?"Actualizar indicadores ahora":"Refrescar estado"}" aria-label="Actualizar indicadores">🔄</button>`;
  }

  async function getSello(){
    if(!API||!usuario()) return {texto:"",fuente:""};
    const url=new URL(API);
    url.searchParams.set("accion","obtenerActualizacionIndicadoresWinV512");
    url.searchParams.set("usuario",usuario());
    url.searchParams.set("periodo",periodoActual());
    url.searchParams.set("_v512b",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{Accept:"application/json"}});
    const raw=txt(await r.text());
    let j;
    try{j=JSON.parse(raw);}catch(_){throw new Error("La API no devolvio JSON para el sello V512.");}
    if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo consultar la actualizacion de indicadores.");
    return {texto:txt(j.fechaPublicacionTexto||j.fechaActualizacionTexto||""),fuente:txt(j.fuente||"")};
  }

  async function refrescar(){
    if(!esDashboard()||consultando) return;
    consultando=true;
    try{
      ultimo=await getSello();
      pintar();
    }catch(e){
      console.warn("V512B sello Dashboard",e);
      pintar();
    }finally{consultando=false;}
  }

  async function postPublicar(){
    const p=periodoActual();
    if(p<PERIODO_MINIMO) throw new Error("Julio 2026 y periodos anteriores permanecen cerrados.");
    if(typeof window.mv4879PublicarIndicadoresWin==="function"){
      return window.mv4879PublicarIndicadoresWin(p);
    }
    if(!API) throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(API,{
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},cache:"no-store",redirect:"follow",
      body:JSON.stringify({accion:"publicarIndicadoresWinV487",usuario:usuario(),periodo:p,confirmacion:CONFIRMACION})
    });
    const raw=txt(await r.text());
    let j;
    try{j=JSON.parse(raw);}catch(_){throw new Error("La API no devolvio JSON al actualizar indicadores.");}
    if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo publicar indicadores WIN.");
    return j;
  }

  async function actualizar(){
    if(publicando) return;
    if(!puedePublicar()){await refrescar();return;}
    publicando=true;
    pintar();
    try{
      await postPublicar();
      await refrescar();
    }catch(e){
      console.warn("V512B actualizar indicadores",e);
      alert("No se pudo actualizar los indicadores: "+(e&&e.message?e.message:String(e)));
    }finally{
      publicando=false;
      pintar();
    }
  }

  function programar(){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;if(esDashboard()){ubicar();refrescar();}},180);
  }

  document.addEventListener("click",function(e){
    const b=e.target&&e.target.closest?e.target.closest("#mv512bRefresh"):null;
    if(b){e.preventDefault();e.stopPropagation();actualizar();return;}
    programar();
  },true);

  const p=document.getElementById("pantalla");
  if(p){
    const obs=new MutationObserver(programar);
    obs.observe(p,{childList:true,subtree:true});
  }
  window.addEventListener("mv487IndicadoresPublicados",()=>setTimeout(refrescar,100));
  window.mv512bRefrescarDashboardIndicadores=refrescar;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",programar,{once:true});
  else programar();

  console.log("MI VISUAL V512B: sello independiente Dashboard habilitado.");
})();