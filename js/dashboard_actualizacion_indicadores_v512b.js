/* ============================================================
   MI VISUAL V512E - ACTUALIZACION DE INDICADORES EN DASHBOARD

   - Dashboard Jefatura/Supervisor.
   - Actualizacion WIN automatica sigue siendo la via principal.
   - Boton 🔄 queda como respaldo manual.
   - Sello visible abajo a la izquierda, igual al Ranking.
   - Prioridad de fecha: publicacion V512; respaldo: ultima carga WIN.
   - No cambia formulas, SLA, Partner, Produccion ni Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV512B_DASHBOARD_INDICADORES_OK) return;
  window.MV512B_DASHBOARD_INDICADORES_OK=true;
  window.MV512E_DASHBOARD_INDICADORES_OK=true;

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
    const texto=norm((p.textContent||"").slice(0,3000));
    if(!texto) return false;
    const jefatura=texto.includes("JEFATURA") && texto.includes("ZONA NORTE") && texto.includes("PERIODO") && texto.includes("INDICADOR");
    const supervisor=texto.includes("SUPERVISOR") && texto.includes("PERIODO") && texto.includes("INDICADOR");
    return jefatura||supervisor;
  }

  function formatoRanking(valor){
    let r=txt(valor);
    if(!r) return "";
    try{
      if(typeof window.formatearFechaHoraTextoPeruApp==="function"){
        r=txt(window.formatearFechaHoraTextoPeruApp(r,false))||r;
      }
    }catch(_){}
    if(r && !/HORA\s+PER[UÚ]/i.test(r)) r += " — Hora Perú";
    return r;
  }

  async function getJson(accion,extras){
    if(!API) throw new Error("No se encontro la URL de MI VISUAL.");
    const url=new URL(API);
    url.searchParams.set("accion",accion);
    url.searchParams.set("usuario",usuario());
    Object.entries(extras||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&txt(v)!=="") url.searchParams.set(k,txt(v));
    });
    url.searchParams.set("_mv512e",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{Accept:"application/json"}});
    const raw=txt(await r.text());
    let j;
    try{j=JSON.parse(raw);}catch(_){throw new Error("La API no devolvio JSON.");}
    if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo consultar la actualizacion.");
    return j;
  }

  async function getSello(){
    if(!API||!usuario()) return {texto:"",fuente:""};

    // 1) Prioridad: fecha real de publicacion de indicadores V512.
    try{
      const j=await getJson("obtenerActualizacionIndicadoresWinV512",{periodo:periodoActual()});
      const valor=txt(j.fechaPublicacionTexto||j.fechaActualizacionTexto||j.fechaPublicacion||j.fechaActualizacion||"");
      if(valor) return {texto:formatoRanking(valor),fuente:txt(j.fuente||"PUBLICACION_INDICADORES")};
    }catch(e){
      console.warn("V512E: sello de publicacion no disponible; se usa respaldo WIN",e);
    }

    // 2) Respaldo visual, igual que Ranking: ultima carga WIN del Mapa.
    try{
      const j=await getJson("catalogosMapaOperativo",{});
      const valor=txt(j.ultimaActualizacionTexto||j.fechaActualizacionTexto||"");
      if(valor) return {texto:formatoRanking(valor),fuente:"MAPA_RESPALDO"};
    }catch(e){
      console.warn("V512E: respaldo de ultima carga WIN no disponible",e);
    }

    // 3) Si Ranking ya obtuvo el dato en esta sesion, reutilizarlo.
    try{
      if(typeof window.mv507UltimaActualizacionWin==="function"){
        const valor=txt(window.mv507UltimaActualizacionWin());
        if(valor) return {texto:formatoRanking(valor),fuente:"RANKING_RESPALDO"};
      }
    }catch(_){}

    return {texto:"",fuente:""};
  }

  function estilos(){
    if(document.getElementById("mv512bCss")) document.getElementById("mv512bCss").remove();
    const s=document.createElement("style");
    s.id="mv512bCss";
    s.textContent=`
      #mv512bIndicadores{width:max-content;max-width:calc(100% - 20px);margin:12px auto 8px 0;padding:6px 10px;
        border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;color:#475569;display:flex;align-items:center;
        gap:5px;font-size:11px;font-weight:750;line-height:1.2;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.12)}
      #mv512bIndicadores b{color:#0f172a;font-weight:900;white-space:nowrap}
      #mv512bIndicadores .mv512b-pendiente{color:#92400e}
      #mv512bRefresh{border:0;background:transparent;color:#2563eb;padding:1px 3px;margin:0;cursor:pointer;font-size:14px;line-height:1;border-radius:6px}
      #mv512bRefresh:hover{background:#e2e8f0}
      #mv512bRefresh:disabled{opacity:.45;cursor:wait}
      @media(max-width:520px){#mv512bIndicadores{font-size:10px;max-width:calc(100% - 8px);margin-left:0}}
    `;
    document.head.appendChild(s);
  }

  function hijoDirecto(el,parent){
    let n=el;
    while(n && n.parentElement && n.parentElement!==parent) n=n.parentElement;
    return n && n.parentElement===parent ? n : null;
  }

  function ubicar(){
    if(!esDashboard()) return null;
    const pantalla=document.getElementById("pantalla");
    const page=document.querySelector("#pantalla .mv4-page")||pantalla;
    if(!page) return null;

    // En Dashboard no debe coexistir el sello compatible superior V507.
    const anterior=document.getElementById("mv507ActualizacionWin");
    if(anterior) anterior.remove();

    let badge=document.getElementById("mv512bIndicadores");
    if(!badge){
      estilos();
      badge=document.createElement("div");
      badge.id="mv512bIndicadores";
    }

    // Inferior izquierda: antes de la barra Herramientas final.
    const herramientas=document.getElementById("mv496Herramienta");
    if(herramientas && herramientas.closest(".mv4-page")===page){
      if(badge.nextElementSibling!==herramientas) page.insertBefore(badge,herramientas);
      return badge;
    }

    // Si Herramientas aun no termino de renderizar, ubicar antes de Volver al menu.
    const volver=Array.from(page.querySelectorAll("button,a")).find(el=>norm(el.textContent||"").includes("VOLVER AL MENU"));
    if(volver){
      const bloque=hijoDirecto(volver,page)||volver;
      if(badge.nextElementSibling!==bloque) page.insertBefore(badge,bloque);
    }else if(page.lastElementChild!==badge){
      page.appendChild(badge);
    }
    return badge;
  }

  function pintar(){
    const badge=ubicar();
    if(!badge) return;
    const valor=txt(ultimo.texto);
    const contenido=valor
      ? `<span>Actualizado:</span><b>${valor}</b>`
      : `<span>Actualizado:</span><b class="mv512b-pendiente">pendiente</b>`;
    badge.innerHTML=contenido+`<button id="mv512bRefresh" type="button" ${publicando?"disabled":""} title="${puedePublicar()?"Actualizar indicadores ahora":"Refrescar estado"}" aria-label="Actualizar indicadores">🔄</button>`;
  }

  async function refrescar(){
    if(!esDashboard()||consultando) return;
    consultando=true;
    try{
      ultimo=await getSello();
      pintar();
    }catch(e){
      console.warn("V512E sello Dashboard",e);
      pintar();
    }finally{consultando=false;}
  }

  async function postPublicar(){
    const p=periodoActual();
    if(p<PERIODO_MINIMO) throw new Error("Julio 2026 y periodos anteriores permanecen cerrados.");
    if(typeof window.mv4879PublicarIndicadoresWin==="function") return window.mv4879PublicarIndicadoresWin(p);
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
      console.warn("V512E actualizar indicadores",e);
      alert("No se pudo actualizar los indicadores: "+(e&&e.message?e.message:String(e)));
    }finally{
      publicando=false;
      pintar();
    }
  }

  function programar(){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>{
      timer=null;
      if(esDashboard()){
        ubicar();
        refrescar();
      }
    },180);
  }

  document.addEventListener("click",function(e){
    const b=e.target&&e.target.closest?e.target.closest("#mv512bRefresh"):null;
    if(b){e.preventDefault();e.stopPropagation();actualizar();return;}
    programar();
  },true);

  const pantalla=document.getElementById("pantalla");
  if(pantalla){
    const obs=new MutationObserver(programar);
    obs.observe(pantalla,{childList:true,subtree:true});
  }
  window.addEventListener("mv487IndicadoresPublicados",()=>setTimeout(refrescar,100));
  window.addEventListener("mv505CachesIndicadoresInvalidadas",()=>setTimeout(refrescar,120));
  window.mv512bRefrescarDashboardIndicadores=refrescar;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",programar,{once:true});
  else programar();

  setTimeout(programar,400);
  setTimeout(programar,1000);
  console.log("MI VISUAL V512E: sello Dashboard inferior izquierdo habilitado.");
})();

/* ============================================================
   V518A - CARGA INCREMENTAL DE ESTABILIDAD
   Archivo separado para no reemplazar Ranking, Dashboard ni VT.
============================================================ */
(function(){
  "use strict";
  if(window.MV518A_LOADER_OK) return;
  window.MV518A_LOADER_OK=true;
  const ruta="./js/estabilidad_ranking_validacion_v518a.js?v=V518A-20260831-1";
  const existente=Array.from(document.scripts).find(s=>String(s.src||"").includes("estabilidad_ranking_validacion_v518a.js"));
  if(existente) return;
  const s=document.createElement("script");
  s.src=ruta;
  s.async=true;
  s.onload=function(){console.log("MI VISUAL V518A: parche incremental cargado.");};
  s.onerror=function(){console.warn("MI VISUAL V518A: no se pudo cargar el parche incremental.");};
  document.head.appendChild(s);
})();