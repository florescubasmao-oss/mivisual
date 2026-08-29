/* ============================================================
   MI VISUAL V517D F4I - MOTIVO + PARTIDA VISIBLES EN GAR/VTR
   29/08/2026

   Ajuste SOLO FRONTEND:
   - Toma la ORDEN WIN visible de la tarjeta GAR/VTR.
   - Consulta la ruta V517C9 ya existente.
   - Muestra motivo de finalizacion de la orden actual.
   - Muestra partida + puntos cuando existe una partida segura.
   - No modifica backend, Produccion, Bono, Ranking ni indicadores.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4I_MOTIVO_PARTIDA_OK) return;
  window.MV517D_F4I_MOTIVO_PARTIDA_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const CACHE=new Map();
  let timer=null;

  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const fmt=v=>{const n=Number(v);return Number.isFinite(n)?(Number.isInteger(n)?String(n):n.toFixed(1)):"-";};

  function css(){
    if(document.getElementById("mv517d-f4i-css"))return;
    const s=document.createElement("style");
    s.id="mv517d-f4i-css";
    s.textContent=`
      .mv517d-f4i-actual{display:grid;gap:5px;margin:6px 0 0}
      .mv517d-f4i-motivo{padding:6px 8px;border-radius:8px;background:#e8f1fb;color:#1e3a5f;font-size:8px;line-height:1.4}
      .mv517d-f4i-partida{padding:7px 9px;border-radius:8px;background:#e8f5ee;border-left:3px solid #16a34a;color:#14532d;font-size:8px;line-height:1.4}
      .mv517d-f4i-partida.warn{background:#fff3d6;border-left-color:#f59e0b;color:#7c5200}
    `;
    document.head.appendChild(s);
  }

  function ordenVisible(card){
    const campos=Array.from(card.querySelectorAll(".mv517c1-field"));
    const f=campos.find(x=>norm(x.querySelector("small")?.textContent)==="ORDEN WIN");
    const directo=txt(f?.querySelector("b")?.textContent);
    if(/^\d+$/.test(directo))return directo;
    const m=txt(card.querySelector(".mv517c1-detail")?.textContent).match(/ORDEN\s+WIN\s*(\d+)/i);
    return m?m[1]:"";
  }

  async function consultar(ordenId){
    if(CACHE.has(ordenId))return CACHE.get(ordenId);
    const key="MV517D_F4I|"+ordenId;
    try{
      const c=JSON.parse(sessionStorage.getItem(key)||"null");
      if(c&&c.data&&Date.now()-Number(c.ts||0)<300000){CACHE.set(ordenId,c.data);return c.data;}
    }catch(_){}
    const u=new URL(API);
    u.searchParams.set("accion","partidaActualVtrGarV517C9");
    u.searchParams.set("usuario",usuario());
    u.searchParams.set("ordenId",ordenId);
    u.searchParams.set("_f4i",String(Date.now()));
    const r=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow"});
    const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("No se pudo consultar la orden actual.");}
    if(!j||!j.ok)throw new Error(j&&j.error||"No se pudo consultar la orden actual.");
    CACHE.set(ordenId,j);
    try{sessionStorage.setItem(key,JSON.stringify({ts:Date.now(),data:j}));}catch(_){}
    return j;
  }

  function render(card,data){
    const detail=card.querySelector(".mv517c1-detail");
    const grid=detail?.querySelector(":scope > .mv517c1-grid")||detail?.querySelector(".mv517c1-grid");
    if(!detail||!grid)return;
    let wrap=detail.querySelector(":scope > .mv517d-f4i-actual");
    if(!wrap){
      wrap=document.createElement("div");
      wrap.className="mv517d-f4i-actual";
      const extra=detail.querySelector(":scope > .mv517c12-actual-extra");
      (extra||grid).insertAdjacentElement("afterend",wrap);
    }
    wrap.innerHTML="";

    const motivo=txt(data.motivoFinalizacionWin);
    if(motivo){
      const m=document.createElement("div");
      m.className="mv517d-f4i-motivo";
      m.innerHTML=`<b>Motivo de finalización de esta GAR/VTR:</b> ${esc(motivo)}`;
      wrap.appendChild(m);
    }

    const p=document.createElement("div");
    p.className="mv517d-f4i-partida";
    if(data.partidaSegura){
      p.innerHTML=`<b>Partida de esta GAR/VTR:</b> ${esc(data.partidaCodigo)} · ${esc(data.partidaNombre)} · <b>${esc(fmt(data.puntosPartida))} pt${Number(data.puntosPartida)===1?"":"s"}</b>`;
      wrap.appendChild(p);
    }else if(txt(data.mensaje)){
      p.classList.add("warn");
      p.innerHTML=`<b>Partida de esta GAR/VTR:</b> POR REVISAR`;
      wrap.appendChild(p);
    }

    wrap.style.display=wrap.children.length?"grid":"none";
    card.dataset.mv517dF4IOrden=txt(data.ordenId);
  }

  async function enriquecer(card){
    if(!card.open||card.dataset.mv517dF4IBusy==="1")return;
    const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);
    if(!/^(GAR|VTR)-\d+/i.test(ticket))return;
    const ordenId=ordenVisible(card);
    if(!ordenId)return;
    if(card.dataset.mv517dF4IOrden===ordenId&&card.querySelector(".mv517d-f4i-actual"))return;
    card.dataset.mv517dF4IBusy="1";
    try{render(card,await consultar(ordenId));}
    catch(e){console.warn("MI VISUAL F4I motivo/partida:",e&&e.message?e.message:e);}
    finally{card.dataset.mv517dF4IBusy="0";}
  }

  function run(){css();document.querySelectorAll(".mv517c1-case[open]").forEach(enriquecer);}
  function schedule(ms){clearTimeout(timer);timer=setTimeout(run,ms==null?50:ms);}

  const obs=new MutationObserver(()=>schedule(50));
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open"]});
  document.addEventListener("click",e=>{if(e.target.closest(".mv517c1-case>summary,.mv517c1-case button")){schedule(20);setTimeout(run,180);}},true);
  setTimeout(run,120);setTimeout(run,600);

  console.log("MI VISUAL V517D F4I: motivo y partida de la orden GAR/VTR actual visibles.");
})();
