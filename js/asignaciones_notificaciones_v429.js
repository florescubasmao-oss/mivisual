/* ============================================================
   MI VISUAL V429 - Notificaciones de Trabajos Asignados
   - Solo Supervisor.
   - Badge rojo en Actividad en Campo.
   - Toast cuando aparece una asignación nueva.
   - Consulta ligera cada 2 minutos y al volver a la aplicación.
   - No carga el módulo completo de Actividad en Campo.
============================================================ */
(function iniciarNotificacionesAsignacionesV429(){
  "use strict";
  if(window.__mv429NotificacionesAsignaciones) return;
  window.__mv429NotificacionesAsignaciones = true;

  const API = window.MI_VISUAL_API_URL ||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const INTERVALO_MS = 120000;
  let consultaEnCurso = false;

  function norm(v){
    return String(v ?? "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function esSupervisor(){
    return norm(localStorage.getItem("perfil"))==="SUPERVISOR";
  }

  function usuario(){
    return String(localStorage.getItem("usuario")||"").trim();
  }

  function claveVistos(){
    return `mv429_asignaciones_vistas_${norm(usuario()).replace(/\s+/g,"")}`;
  }

  function asegurarEstilos(){
    if(document.getElementById("mv429NotifStyles"))return;
    const s=document.createElement("style");
    s.id="mv429NotifStyles";
    s.textContent=`
      #cardActividadCampo{position:relative!important}
      .mv429-badge{
        position:absolute;top:8px;right:10px;min-width:22px;height:22px;
        padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;
        display:flex;align-items:center;justify-content:center;font-size:11px;
        font-weight:900;box-shadow:0 4px 10px rgba(220,38,38,.35);
        border:2px solid rgba(255,255,255,.9);z-index:5
      }
      .mv429-toast-wrap{
        position:fixed;top:14px;right:14px;z-index:12020;
        width:min(370px,calc(100vw - 28px));display:grid;gap:9px;
        pointer-events:none
      }
      .mv429-toast{
        background:#fff;border:1px solid #dbe3ee;border-left:5px solid #7c3aed;
        border-radius:14px;padding:12px 14px;box-shadow:0 18px 45px rgba(15,23,42,.25);
        color:#0f172a;pointer-events:auto;animation:mv429In .22s ease-out
      }
      .mv429-toast-title{font-weight:900;font-size:14px;margin-bottom:4px}
      .mv429-toast-text{font-size:12px;line-height:1.45;color:#475569}
      .mv429-toast-close{
        float:right;border:0;background:transparent;color:#64748b;
        font-size:18px;cursor:pointer;margin:-5px -5px 0 8px
      }
      @keyframes mv429In{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      @media(max-width:640px){
        .mv429-toast-wrap{top:8px;right:8px;width:calc(100vw - 16px)}
      }
    `;
    document.head.appendChild(s);
  }

  function actualizarBadge(cantidad){
    const card=document.getElementById("cardActividadCampo");
    if(!card)return;
    asegurarEstilos();
    let badge=card.querySelector(".mv429-badge");
    const total=Number(cantidad)||0;
    if(total<=0){
      if(badge)badge.remove();
      return;
    }
    if(!badge){
      badge=document.createElement("span");
      badge.className="mv429-badge";
      card.appendChild(badge);
    }
    badge.textContent=total>99?"99+":String(total);
    badge.title=`${total} trabajo${total===1?"":"s"} de campo activo${total===1?"":"s"}`;
  }

  function contenedorToast(){
    asegurarEstilos();
    let w=document.getElementById("mv429ToastWrap");
    if(!w){
      w=document.createElement("div");
      w.id="mv429ToastWrap";
      w.className="mv429-toast-wrap";
      document.body.appendChild(w);
    }
    return w;
  }

  function mostrarToast(titulo,texto){
    const w=contenedorToast();
    const t=document.createElement("div");
    t.className="mv429-toast";
    t.innerHTML=`
      <button class="mv429-toast-close" aria-label="Cerrar">×</button>
      <div class="mv429-toast-title">${esc(titulo)}</div>
      <div class="mv429-toast-text">${esc(texto)}</div>
    `;
    t.querySelector("button").onclick=()=>t.remove();
    w.prepend(t);
    setTimeout(()=>t.remove(),10000);
  }

  async function consultarAPI(){
    const u=new URL(API);
    u.searchParams.set("accion","listarAsignacionesCampoV424");
    u.searchParams.set("usuario",usuario());
    u.searchParams.set("estado","ACTIVAS");

    const controller=typeof AbortController==="function"?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),15000):null;
    try{
      const r=await fetch(u.toString(),{
        method:"GET",
        cache:"no-store",
        signal:controller?controller.signal:undefined
      });
      const txt=await r.text();
      let d;
      try{d=JSON.parse(txt);}catch(_){throw new Error("Respuesta inválida");}
      if(!d||d.ok===false)throw new Error(d?.error||"No disponible");
      return Array.isArray(d.asignaciones)?d.asignaciones:[];
    }finally{
      if(timer)clearTimeout(timer);
    }
  }

  function procesar(lista){
    const activos=(lista||[]).filter(x=>
      ["PENDIENTE","EN PROCESO"].includes(norm(x.estado))
    );

    actualizarBadge(activos.length);

    const key=claveVistos();
    const actuales=activos.map(x=>String(x.id||"")).filter(Boolean);
    let anteriores=[];
    try{anteriores=JSON.parse(localStorage.getItem(key)||"[]");}
    catch(_){anteriores=[];}

    if(!localStorage.getItem(key)){
      localStorage.setItem(key,JSON.stringify(actuales));
      if(activos.length){
        mostrarToast(
          "🔔 Trabajos de campo pendientes",
          `Tienes ${activos.length} trabajo${activos.length===1?"":"s"} asignado${activos.length===1?"":"s"} pendiente${activos.length===1?"":"s"} de atención.`
        );
      }
      return;
    }

    const nuevos=activos.filter(x=>!anteriores.includes(String(x.id||"")));
    localStorage.setItem(key,JSON.stringify(actuales));

    if(nuevos.length){
      const x=nuevos[0];
      const extra=nuevos.length>1?` y ${nuevos.length-1} más`:"";
      const destino=x.codigoOrden
        ? `Orden ${x.codigoOrden}`
        : (x.cuadrilla||"Cuadrilla");
      mostrarToast(
        "🔔 Nuevo trabajo de campo asignado",
        `${x.tipoActividad||"ACTIVIDAD"} · ${destino} · ${x.prioridad||"NORMAL"}${extra}`
      );
    }
  }

  async function actualizar(forzar){
    if(!esSupervisor()||!usuario()){
      actualizarBadge(0);
      return;
    }
    if(document.visibilityState==="hidden"&&!forzar)return;
    if(consultaEnCurso)return;
    consultaEnCurso=true;
    try{
      const lista=await consultarAPI();
      procesar(lista);
    }catch(e){
      console.warn("V429 Notificaciones Trabajos Asignados:",e);
    }finally{
      consultaEnCurso=false;
    }
  }

  function instalarGanchoMenu(){
    if(typeof window.configurarMenu==="function"&&!window.configurarMenu.__mv429Asignaciones){
      const original=window.configurarMenu;
      const envuelta=function(){
        const r=original.apply(this,arguments);
        setTimeout(()=>actualizar(true),450);
        return r;
      };
      envuelta.__mv429Asignaciones=true;
      window.configurarMenu=envuelta;
      try{configurarMenu=envuelta;}catch(_){}
    }
  }

  window.mv429ActualizarNotificacionesAsignaciones=actualizar;

  function iniciar(){
    asegurarEstilos();
    instalarGanchoMenu();
    setTimeout(()=>actualizar(true),800);
  }

  if(document.readyState==="loading"){
    window.addEventListener("load",iniciar,{once:true});
  }else{
    iniciar();
  }

  setInterval(function(){
    instalarGanchoMenu();
    actualizar(false);
  },INTERVALO_MS);

  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="visible"){
      instalarGanchoMenu();
      setTimeout(()=>actualizar(true),600);
    }
  });
})();