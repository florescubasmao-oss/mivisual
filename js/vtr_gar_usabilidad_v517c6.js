/* ============================================================
   MI VISUAL V517C.6 - USABILIDAD + FICHA GET + CACHE PERSISTENTE
   Solo frontend. No modifica backend ni datos.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C6_USABILIDAD_OK) return;
  window.MV517C6_USABILIDAD_OK=true;

  const API=window.MI_VISUAL_API_URL||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const FETCH_PREV=window.fetch.bind(window);
  const TTL=5*60*1000;
  let decorTimer=null, filtrosParchados=false, fichaParchada=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function perfil(){return norm(localStorage.getItem("perfil")||"");}
  function keyLista(b){return "MV517C6|LISTA|"+norm(b.usuario||usuario())+"|"+txt(b.periodo||"AUTO");}
  function cacheGet(k){try{const j=JSON.parse(localStorage.getItem(k)||"null");return j&&j.text&&Date.now()-Number(j.ts||0)<TTL?j:null;}catch(_){return null;}}
  function cacheSet(k,text){try{localStorage.setItem(k,JSON.stringify({ts:Date.now(),text:String(text||"")}));}catch(_){}}
  function cacheClear(){
    try{Object.keys(localStorage).filter(k=>k.startsWith("MV517C6|LISTA|")).forEach(k=>localStorage.removeItem(k));}catch(_){}
    try{Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));}catch(_){}
  }

  window.fetch=function(input,init){
    try{
      if(norm(init&&init.method||"GET")==="POST" && typeof (init&&init.body)==="string"){
        const b=JSON.parse(init.body);
        if(b&&b.accion==="listarVtrGarV517A"){
          const k=keyLista(b),hit=cacheGet(k);
          if(hit){
            setTimeout(()=>{FETCH_PREV(input,init).then(async r=>{try{if(r&&r.ok){const t=await r.clone().text(),j=JSON.parse(t);if(j&&j.ok)cacheSet(k,t);}}catch(_){}}).catch(()=>{});},0);
            return Promise.resolve(new Response(hit.text,{status:200,headers:{"Content-Type":"application/json"}}));
          }
          return FETCH_PREV(input,init).then(async r=>{try{if(r&&r.ok){const t=await r.clone().text(),j=JSON.parse(t);if(j&&j.ok)cacheSet(k,t);}}catch(_){}return r;});
        }
        if(b&&["clasificarVtrGarV517A","validarBonoVtrGarV515","validarValidacionTecnica","validarBonoExcepcionalVtrGarV517C5"].includes(b.accion)) cacheClear();
      }
    }catch(_){}
    return FETCH_PREV(input,init);
  };

  function css(){
    if(document.getElementById("mv517c6-css")) return;
    const s=document.createElement("style");s.id="mv517c6-css";
    s.textContent=`
      .mv517c6-guide{background:#dceafa;border-radius:10px;padding:7px 10px;margin:6px 0;font-size:9px;color:#173b68;font-weight:800}
      .mv517c6-guide b{color:#0f2e55}.mv517c6-quick-title{font-size:9px;font-weight:950;color:#dbeafe;margin:8px 0 4px}
      .mv517c6-all{background:#dbeafe!important;color:#1e3a8a!important}.mv517c6-searchrow{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:6px;margin:7px 0}
      .mv517c6-searchrow input{width:100%;box-sizing:border-box;border:1px solid #b9c7d8;border-radius:8px;padding:8px;background:#f8fbff;color:#0f172a;font-size:10px}
      .mv517c6-reset{border:0;border-radius:8px;padding:8px 11px;background:#2563eb;color:#fff;font-size:9px;font-weight:950;cursor:pointer;white-space:nowrap}
      .mv517c6-adv{background:#dce6f1;border-radius:9px;margin:5px 0 7px;overflow:hidden}.mv517c6-adv>summary{cursor:pointer;list-style:none;padding:7px 9px;font-size:9px;font-weight:950;color:#24405e}
      .mv517c6-adv>summary::-webkit-details-marker{display:none}.mv517c6-adv .mv517c1-tools{margin:0;padding:6px;display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.mv517c6-adv .mv517c1-tools input{display:none}
      .mv517c6-role{background:#e6f3ec;border-radius:9px;padding:7px 9px;margin:5px 0;font-size:9px;color:#14532d}.mv517c6-role.read{background:#e7eef7;color:#334155}
      .mv517c6-ficha-loading{padding:9px;background:#e7f2ff;border-radius:8px;color:#1e3a8a;font-size:9px}
      @media(max-width:700px){.mv517c6-searchrow{grid-template-columns:1fr}.mv517c6-adv .mv517c1-tools{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){.mv517c6-adv .mv517c1-tools{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function limpiarFiltros(){
    ["mv517c1Buscar","mv517c1Tipo","mv517c1Estado","mv517c1Registro","mv517c1Gestion"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    if(typeof window.mv517c1Render==="function") window.mv517c1Render();
  }
  window.mv517c6MostrarTodos=limpiarFiltros;

  function parchearFiltros(){
    if(filtrosParchados||typeof window.mv517c1FiltroRegistro!=="function"||typeof window.mv517c1FiltroGestion!=="function") return false;
    window.mv517c1FiltroRegistro=function(v){const s=document.getElementById("mv517c1Registro"),g=document.getElementById("mv517c1Gestion");if(!s)return;s.value=norm(s.value)===norm(v)?"":v;if(g)g.value="";if(typeof window.mv517c1Render==="function")window.mv517c1Render();};
    window.mv517c1FiltroGestion=function(v){const g=document.getElementById("mv517c1Gestion"),s=document.getElementById("mv517c1Registro");if(!g)return;g.value=norm(g.value)===norm(v)?"":v;if(s)s.value="";if(typeof window.mv517c1Render==="function")window.mv517c1Render();};
    filtrosParchados=true;return true;
  }

  function campo(l,v){return `<div class="mv517c1-field"><small>${esc(l)}</small><b>${esc(v||"-")}</b></div>`;}
  function abrirFichaGET(id,ticket){
    const bg=document.createElement("div");bg.className="mv517c1-modalbg";
    bg.innerHTML=`<div class="mv517c1-modal"><h3>📋 Ficha del registro técnico</h3><div class="mv517c6-ficha-loading">Consultando únicamente este registro...</div></div>`;document.body.appendChild(bg);
    const u=new URL(API);u.searchParams.set("accion","listarValidacionTecnica");u.searchParams.set("usuario",usuario());if(txt(id))u.searchParams.set("id",txt(id));u.searchParams.set("_t",String(Date.now()));
    FETCH_PREV(u.toString(),{method:"GET",cache:"no-store"}).then(r=>r.text()).then(t=>{
      let j;try{j=JSON.parse(t);}catch(_){throw new Error("La ficha no devolvió información válida.");}
      if(!j||!j.ok)throw new Error((j&&j.error)||"No se pudo consultar la ficha.");
      const item=(Array.isArray(j.validaciones)?j.validaciones:[])[0];if(!item)throw new Error("No se encontró el registro técnico solicitado.");
      const res=norm(item.resultadoFinal||item.estado||"PENDIENTE"),esObs=res==="OBSERVADO"||norm(item.estado)==="OBSERVADO",link=txt(item.linkTelegram);
      bg.querySelector(".mv517c1-modal").innerHTML=`<h3>📋 Ficha del registro · ${esc(ticket||item.ticketFinal||id)}</h3>
        <div class="mv517c1-section registro"><h4>1. Lo registrado por el técnico</h4><div class="mv517c1-grid">${campo("Fecha",item.fechaRegistro)}${campo("Hora",item.horaRegistro)}${campo("Técnico",item.tecnico)}${campo("Cuadrilla",item.cuadrilla)}${campo("Código",item.codigo)}${campo("DNI cliente",item.dniCliente)}</div><div class="mv517c1-box"><b>Motivo / sustento técnico</b><br>${esc(item.motivoTecnico||"-")}</div></div>
        <div class="mv517c1-section ${esObs?"observacion":"gestion"}"><h4>2. Respuesta de Jefatura</h4>${esObs?`<div class="mv517c1-alert"><b>🟠 OBSERVADO.</b> Falta evidencia o corrección antes de cerrar la evaluación.</div>`:""}<div class="mv517c1-grid">${campo("Estado",item.estado||"PENDIENTE")}${campo("Resultado",item.resultadoFinal||"PENDIENTE")}${campo("Validado por",item.validadoPor)}${campo("Fecha validación",item.fechaValidacion)}${campo("Hora validación",item.horaValidacion)}${campo("Puntaje VTR/GAR",item.puntajeVtrGar)}</div><div class="mv517c1-box hist"><b>Comentario / trazabilidad</b><br>${esc(item.motivoValidacion||"Sin comentario registrado")}</div></div>
        <div class="mv517c1-footer">${link?`<button class="mv517c1-btn detail" id="mv517c6Telegram">📨 Telegram</button>`:""}<button class="mv517c1-btn dark" id="mv517c6Cerrar">Cerrar</button></div>`;
      bg.querySelector("#mv517c6Cerrar").onclick=()=>bg.remove();if(link)bg.querySelector("#mv517c6Telegram").onclick=()=>window.open(link,"_blank");
    }).catch(e=>{bg.querySelector(".mv517c1-modal").innerHTML=`<h3>📋 Ficha del registro técnico</h3><div class="mv517c1-alert">${esc(e.message)}</div><div class="mv517c1-footer"><button class="mv517c1-btn dark" id="mv517c6Cerrar">Cerrar</button></div>`;bg.querySelector("#mv517c6Cerrar").onclick=()=>bg.remove();});
  }
  function parchearFicha(){if(fichaParchada||typeof window.mv517c1VerRegistro!=="function")return false;window.mv517c1VerRegistro=abrirFichaGET;fichaParchada=true;return true;}

  function renombrarBadges(){
    document.querySelectorAll(".mv517c1-badge").forEach(b=>{const n=norm(b.textContent);if(n.includes("CON REGISTRO"))b.textContent="📝 TÉCNICO REGISTRÓ";else if(n.includes("SIN REGISTRO"))b.textContent="⚪ SIN REGISTRO TÉCNICO";else if(n.includes("RESP. PENDIENTE"))b.textContent="RESPONSABLE POR DEFINIR";else if(n.includes("RESP. CONFIRMADA"))b.textContent="RESPONSABLE CONFIRMADO";else if(n.includes("RESP. REASIGNADA"))b.textContent="RESPONSABLE REASIGNADO";else if(n.includes("BONO PENDIENTE"))b.textContent="🟡 BONO POR VALIDAR";});
  }

  function simplificar(){
    css();const root=document.querySelector(".mv517c1");if(!root)return;
    const head=root.querySelector(".mv517c1-head p");if(head)head.textContent="Revise el ticket, el antecedente y lo registrado por el técnico. Jefatura define responsable y Bono/No Bono; Gerencia y Supervisores consultan la trazabilidad.";
    if(!root.querySelector(".mv517c6-guide")){const h=root.querySelector(".mv517c1-head");if(h)h.insertAdjacentHTML("afterend",`<div class="mv517c6-guide"><b>Cómo usar:</b> 1) abra una sede · 2) abra un ticket · 3) revise antecedente, órdenes WIN y registro técnico · 4) Jefatura usa <b>Gestionar caso</b>.</div>`);}
    if(!root.querySelector(".mv517c6-role")){const g=root.querySelector(".mv517c6-guide"),read=perfil()!=="JEFATURA";if(g)g.insertAdjacentHTML("afterend",`<div class="mv517c6-role ${read?"read":""}">${read?`👁 <b>Modo consulta:</b> puede revisar estados, antecedentes y fichas. La decisión final corresponde a Jefatura.`:`✅ <b>Modo Jefatura:</b> los casos pendientes se resuelven desde “Gestionar caso”.`}</div>`);}
    const quick=root.querySelector(".mv517c1-quick");
    if(quick&&!quick.dataset.mv517c6){quick.dataset.mv517c6="1";quick.insertAdjacentHTML("beforebegin",`<div class="mv517c6-quick-title">VISTA RÁPIDA · pulse nuevamente el mismo filtro para volver a Todos</div>`);const all=document.createElement("button");all.className="mv517c1-q mv517c6-all";all.id="mv517c6Todos";all.innerHTML=`<span>📋 Todos</span><b>${txt(root.querySelector(".mv517c1-kpi b")?.textContent)||"60"}</b>`;all.onclick=limpiarFiltros;quick.insertBefore(all,quick.firstChild);[["mv517c1QCon","📝 Técnico registró"],["mv517c1QSin","⚪ Técnico no registró"],["mv517c1QBono","🟡 Bono por validar"],["mv517c1QObs","🟠 Observados"],["mv517c1QValidar","🔔 Registro por validar"]].forEach(([id,label])=>{const el=document.getElementById(id),sp=el&&el.querySelector("span");if(sp)sp.textContent=label;});quick.style.gridTemplateColumns="repeat(3,minmax(0,1fr))";}
    const tools=root.querySelector(".mv517c1-tools");
    if(tools&&!tools.closest(".mv517c6-adv")){const search=tools.querySelector("#mv517c1Buscar");if(search){const sr=document.createElement("div");sr.className="mv517c6-searchrow";tools.parentNode.insertBefore(sr,tools);sr.appendChild(search);const reset=document.createElement("button");reset.className="mv517c6-reset";reset.textContent="↺ Mostrar todos";reset.onclick=limpiarFiltros;sr.appendChild(reset);}const adv=document.createElement("details");adv.className="mv517c6-adv";const sum=document.createElement("summary");sum.textContent="⚙ Filtros avanzados (opcional)";tools.parentNode.insertBefore(adv,tools);adv.appendChild(sum);adv.appendChild(tools);}
    renombrarBadges();
  }

  function tick(){parchearFiltros();parchearFicha();simplificar();}
  const obs=new MutationObserver(()=>{clearTimeout(decorTimer);decorTimer=setTimeout(tick,35);});obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open","class"]});
  const it=setInterval(tick,120);setTimeout(()=>clearInterval(it),15000);tick();
})();
