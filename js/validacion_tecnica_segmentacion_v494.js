/* ============================================================
   MI VISUAL V501 - VALIDACION VTR/GAR ESTABLE
   - Mantiene navegacion superior Registro / Validacion.
   - En Validacion muestra Registro como accion y Validacion como estado activo.
   - Elimina filtro manual de periodo.
   - Periodos y sedes se inicializan cerrados UNA sola vez.
   - Nunca vuelve a cerrar un <details> que el usuario ya abrio.
   - Segmenta por sede sin llamadas API ni cambios de datos.
============================================================ */
(function(){
  "use strict";
  if(window.MV501_VTRGAR_UI_OK) return;
  window.MV501_VTRGAR_UI_OK = true;

  const MESES=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  let timer=null;
  let observer=null;

  function norm(v){
    return String(v==null?"":v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function perfil(){ return norm(localStorage.getItem("perfil")||""); }
  function puedeValidarVista(){
    const p=perfil();
    return p==="SUPERVISOR" || p==="ADMIN" || p==="ADMINISTRADOR" ||
      p.indexOf("JEFATURA")===0 || p.indexOf("GERENCIA")===0;
  }
  function instalarCss(){
    if(document.getElementById("mv501-vtrgar-css")) return;
    const s=document.createElement("style");
    s.id="mv501-vtrgar-css";
    s.textContent=`
      .mv489-tools.mv501-tools{grid-template-columns:2fr 1fr 1fr!important}
      .mv501-vtrgar-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 12px}
      .mv501-vtrgar-btn,.mv501-vtrgar-active{border-radius:12px;padding:10px 15px;font-weight:900;font-size:13px}
      .mv501-vtrgar-btn{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;cursor:pointer}
      .mv501-vtrgar-active{border:1px solid #2563eb;background:#2563eb;color:#fff;box-shadow:0 7px 18px rgba(37,99,235,.18)}
      .mv501-sede{border:1px solid #d7e2ef;border-radius:12px;overflow:hidden;background:#fff;margin:7px 0}
      .mv501-sede>summary{cursor:pointer;list-style:none;padding:10px 12px;background:#f8fafc;font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#0f172a}
      .mv501-sede>summary::-webkit-details-marker{display:none}
      .mv501-sede-body{padding:8px;display:grid;gap:8px;background:#f1f5f9}
      .mv501-sede-cant{font-size:11px;color:#475569;font-weight:800}
      .mv489-month>summary .mv501-periodo{font-weight:900}
      @media(max-width:760px){.mv489-tools.mv501-tools{grid-template-columns:1fr!important}.mv501-vtrgar-btn,.mv501-vtrgar-active{flex:1;text-align:center}}
    `;
    document.head.appendChild(s);
  }
  function asegurarNav(){
    if(window.MV488_VT_MODO!=="VTRGAR" || !puedeValidarVista()) return;
    const wrap=document.querySelector(".mv489-wrap");
    if(!wrap) return;
    let nav=document.getElementById("mv501VtrGarNav");
    if(nav) return;
    nav=document.createElement("div");
    nav.id="mv501VtrGarNav";
    nav.className="mv501-vtrgar-nav";
    nav.innerHTML=`<button type="button" class="mv501-vtrgar-btn" onclick="if(window.mv489AbrirRegistroVtrGar)window.mv489AbrirRegistroVtrGar()">📝 Registro</button><span class="mv501-vtrgar-active">✅ Validación</span>`;
    const head=wrap.querySelector(".mv489-head");
    if(head) head.insertAdjacentElement("afterend",nav);
    else wrap.insertBefore(nav,wrap.firstChild);
  }
  function eliminarFiltroPeriodo(){
    const sel=document.getElementById("mv489Periodo");
    if(sel) sel.remove();
    const tools=document.querySelector(".mv489-tools");
    if(tools) tools.classList.add("mv501-tools");
  }
  function parseFecha(v){
    const t=String(v==null?"":v).trim(); if(!t) return 0;
    let m=t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3]).getTime();
    m=t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if(m) return new Date(+m[3],+m[2]-1,+m[1]).getTime();
    const d=new Date(t); return Number.isNaN(d.getTime())?0:d.getTime();
  }
  function fechaCaso(caso){
    const bloques=Array.from(caso.querySelectorAll(".mv489-detail .mv489-grid > div"));
    for(const b of bloques){
      if(norm(b.querySelector(".mv489-label")?.textContent)==="FECHA"){
        const ts=parseFecha(b.querySelector(".mv489-value")?.textContent); if(ts) return ts;
      }
    }
    return 0;
  }
  function sedeCaso(caso){
    const sum=caso.querySelector(":scope > summary")||caso.querySelector("summary");
    if(!sum) return "SIN SEDE";
    for(const b of Array.from(sum.children||[])){
      if(norm(b.querySelector?.(".mv489-label")?.textContent)==="SEDE") return norm(b.querySelector(".mv489-value")?.textContent)||"SIN SEDE";
    }
    const vals=sum.querySelectorAll(".mv489-value");
    return norm(vals[1]?.textContent)||"SIN SEDE";
  }
  function nombrePeriodo(ts,original){
    if(ts){ const d=new Date(ts); return `${MESES[d.getMonth()]} ${d.getFullYear()}`; }
    const t=String(original||"").trim();
    const m=t.match(/^(\d{4})[-\/]?(\d{2})$/);
    return m?`${MESES[Number(m[2])-1]||m[2]} ${m[1]}`:(t||"SIN PERIODO");
  }
  function ordenSedes(a,b){
    const o={CHICLAYO:1,PIURA:2,TRUJILLO:3,"SIN SEDE":99};
    return (o[a]||50)-(o[b]||50)||a.localeCompare(b);
  }
  function segmentarMes(mes){
    if(!mes || mes.dataset.mv501Segmentado==="1") return;
    const body=mes.querySelector(":scope > .mv489-month-body"); if(!body) return;
    const casos=Array.from(body.children).filter(x=>x.classList?.contains("mv489-case"));
    if(!casos.length){ mes.dataset.mv501Segmentado="1"; return; }
    let ultima=0; const grupos={};
    casos.forEach(c=>{
      ultima=Math.max(ultima,fechaCaso(c));
      const s=sedeCaso(c); (grupos[s]||(grupos[s]=[])).push(c);
      if(!c.dataset.mv501Inicializado){ c.open=false; c.dataset.mv501Inicializado="1"; }
    });
    const frag=document.createDocumentFragment();
    Object.keys(grupos).sort(ordenSedes).forEach(sede=>{
      const det=document.createElement("details"); det.className="mv501-sede"; det.open=false; det.dataset.mv501Inicializado="1";
      const sum=document.createElement("summary");
      sum.innerHTML=`<span>🏢 ${sede}</span><span class="mv501-sede-cant">${grupos[sede].length} caso${grupos[sede].length===1?"":"s"}</span>`;
      const inner=document.createElement("div"); inner.className="mv501-sede-body";
      grupos[sede].forEach(c=>inner.appendChild(c)); det.append(sum,inner); frag.appendChild(det);
    });
    body.replaceChildren(frag);
    mes.dataset.mv501Fecha=String(ultima||0);
    mes.dataset.mv501Segmentado="1";
    if(!mes.dataset.mv501Inicializado){ mes.open=false; mes.dataset.mv501Inicializado="1"; }
    const sp=mes.querySelector(":scope > summary span");
    if(sp){ sp.textContent=nombrePeriodo(ultima,sp.textContent); sp.classList.add("mv501-periodo"); }
  }
  function ordenar(cont){
    const meses=Array.from(cont.querySelectorAll(":scope > .mv489-month"));
    meses.sort((a,b)=>(+b.dataset.mv501Fecha||0)-(+a.dataset.mv501Fecha||0));
    meses.forEach(m=>cont.appendChild(m));
  }
  function aplicar(){
    if(window.MV488_VT_MODO!=="VTRGAR") return;
    instalarCss(); asegurarNav(); eliminarFiltroPeriodo();
    const cont=document.getElementById("mv489Contenido"); if(!cont) return;
    Array.from(cont.querySelectorAll(":scope > .mv489-month")).forEach(segmentarMes);
    ordenar(cont);
  }
  function programar(){ clearTimeout(timer); timer=setTimeout(aplicar,25); }
  const baseRender=window.mv489RenderValidacion;
  if(typeof baseRender==="function" && !baseRender.__mv501){
    const fn=function(){ const r=baseRender.apply(this,arguments); setTimeout(aplicar,0); return r; };
    fn.__mv501=true; fn.__mv501Base=baseRender; window.mv489RenderValidacion=fn;
    try{mv489RenderValidacion=fn;}catch(_){}
  }
  if(document.body){
    observer=new MutationObserver(function(muts){
      if(window.MV488_VT_MODO!=="VTRGAR") return;
      for(const m of muts){
        for(const n of m.addedNodes||[]){
          if(n.nodeType===1 && (n.id==="mv489Contenido" || n.classList?.contains("mv489-month") || n.querySelector?.(".mv489-month"))){ programar(); return; }
        }
      }
      if(!document.getElementById("mv501VtrGarNav") && document.querySelector(".mv489-wrap")) programar();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  aplicar(); setTimeout(aplicar,300); setTimeout(aplicar,900);
})();
