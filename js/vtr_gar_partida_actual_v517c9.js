/* ============================================================
   MI VISUAL V517C.9 - PARTIDA DE LA ORDEN GAR/VTR ACTUAL
   FRONTEND ADITIVO · CONSULTA BAJO DEMANDA

   - No usa la partida del antecedente.
   - Consulta solo al abrir un ticket.
   - Muestra motivo de finalización + partida + puntos de la orden actual.
   - Si no existe regla unívoca: POR REVISAR.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C9_PARTIDA_ACTUAL_OK) return;
  window.MV517C9_PARTIDA_ACTUAL_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const CACHE=new Map();
  let timer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function fmt(n){const x=Number(n);return Number.isFinite(x)?(Number.isInteger(x)?String(x):x.toFixed(1)):"-";}

  async function getPartida(ordenId){
    const id=txt(ordenId);
    if(!id)throw new Error("Orden sin ID");
    if(CACHE.has(id))return CACHE.get(id);
    const ssKey="MV517C9|PARTIDA|"+id;
    try{
      const s=JSON.parse(sessionStorage.getItem(ssKey)||"null");
      if(s&&s.data&&Date.now()-Number(s.ts||0)<5*60*1000){CACHE.set(id,s.data);return s.data;}
    }catch(_){}
    const u=new URL(API);
    u.searchParams.set("accion","partidaActualVtrGarV517C9");
    u.searchParams.set("usuario",usuario());
    u.searchParams.set("ordenId",id);
    const r=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow"});
    const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("No se pudo consultar la partida actual.");}
    if(!j||!j.ok)throw new Error((j&&j.error)||"No se pudo consultar la partida actual.");
    CACHE.set(id,j);
    try{sessionStorage.setItem(ssKey,JSON.stringify({ts:Date.now(),data:j}));}catch(_){}
    return j;
  }

  function casoData(ticket){const d=window.MV517C5_DATA||{};return (d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;}
  function boxOrdenes(card){return Array.from(card.querySelectorAll(".mv517c1-box")).find(b=>norm(b.querySelector("b")?.textContent).includes("ORDENES WIN ASOCIADAS"))||null;}

  function marcarAntecedente(card){
    const boxes=Array.from(card.querySelectorAll(".mv517c1-box"));
    const b=boxes.find(x=>norm(x.querySelector("b")?.textContent).includes("ANTECEDENTES DETECTADOS"));
    if(!b||b.querySelector(".mv517c9-ant-note"))return;
    const title=b.querySelector("b");
    if(title) title.textContent="🔎 Servicio anterior / antecedentes detectados";
    const n=document.createElement("div");n.className="mv517c9-ant-note";
    n.style.cssText="margin:5px 0 2px;padding:5px 7px;border-radius:7px;background:#fff4d8;color:#7c5200;font-size:8px;font-weight:800;line-height:1.3";
    n.textContent="El antecedente sirve para evaluar responsabilidad. No define la partida del GAR/VTR actual.";
    if(title&&title.parentElement===b)b.insertBefore(n,title.nextSibling);else b.prepend(n);
  }

  function filaOrden(box,ordenId){
    return Array.from(box.querySelectorAll("div")).find(d=>{const n=norm(d.textContent);return n.startsWith("ORDEN "+norm(ordenId))&&!d.classList.contains("mv517c9-partida");})||null;
  }

  function renderPartida(row,data){
    let d=row.querySelector(".mv517c9-partida");if(!d){d=document.createElement("div");d.className="mv517c9-partida";row.appendChild(d);}
    d.style.cssText="margin-top:5px;padding:6px 8px;border-radius:8px;background:#e8f5ee;border-left:3px solid #16a34a;color:#14532d;font-size:8px;line-height:1.4";
    if(data.partidaSegura){
      const pts=fmt(data.puntosPartida);
      d.innerHTML=`<div><b>Partida de esta GAR/VTR:</b> ${esc(data.partidaCodigo)} · ${esc(data.partidaNombre)} · <b>${esc(pts)} pt${Number(data.puntosPartida)===1?"":"s"}</b></div><div style="margin-top:2px;color:#475569"><b>Fuente:</b> ${esc(data.origenPartida||"ORDEN WIN ACTUAL")} · No usa el antecedente.</div>`;
    }else{
      d.style.background="#fff3d6";d.style.borderLeftColor="#f59e0b";d.style.color="#7c5200";
      d.innerHTML=`<div><b>Partida de esta GAR/VTR:</b> POR REVISAR</div><div style="margin-top:2px">${esc(data.mensaje||"No existe una regla unívoca para esta orden. No se usa la partida del antecedente.")}</div>`;
    }
  }

  function normalizarMotivo(row,o){
    let m=row.querySelector(".mv517c5-motivo");if(!m&&txt(o.motivoFinalizacion)){m=document.createElement("div");m.className="mv517c5-motivo";row.appendChild(m);}
    if(m){m.style.cssText="margin-top:3px;padding:4px 6px;border-radius:6px;background:#e8f1fb;color:#1e3a5f;font-size:8px;line-height:1.3";m.innerHTML="<b>Motivo de finalización de esta GAR/VTR:</b> "+esc(o.motivoFinalizacion||"-");}
  }

  async function enriquecerCard(card){
    if(!card.open||card.dataset.mv517c9Busy==="1")return;
    const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);if(!/^(VTR|GAR)-\d+/i.test(ticket))return;
    const x=casoData(ticket);if(!x)return;const box=boxOrdenes(card);if(!box)return;
    marcarAntecedente(card);card.dataset.mv517c9Busy="1";
    try{
      for(const o of (x.ordenesWin||[])){
        const row=filaOrden(box,o.ordenId);if(!row)continue;normalizarMotivo(row,o);if(norm(o.estado)!=="FINALIZADA")continue;
        let target=row.querySelector(".mv517c9-partida");if(!target){target=document.createElement("div");target.className="mv517c9-partida";target.style.cssText="margin-top:5px;padding:6px 8px;border-radius:8px;background:#eef2f7;color:#475569;font-size:8px;font-weight:800";target.textContent="Consultando partida de la orden GAR/VTR actual...";row.appendChild(target);}
        try{renderPartida(row,await getPartida(o.ordenId));}catch(e){target.style.background="#fff3d6";target.style.color="#7c5200";target.textContent="Partida actual: no disponible ("+(e.message||e)+"). No se usará la partida del antecedente.";}
      }
    }finally{card.dataset.mv517c9Busy="0";}
  }

  function run(){document.querySelectorAll(".mv517c1-case[open]").forEach(c=>enriquecerCard(c));}
  function schedule(){clearTimeout(timer);timer=setTimeout(run,50);}
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open"]});
  setTimeout(run,500);
})();
