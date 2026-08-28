/* ============================================================
   MI VISUAL V517C.10 - DETALLE OPERATIVO GAR/VTR
   FRONTEND ADITIVO

   Orden visual al abrir un ticket:
   1) GAR/VTR actual: datos consolidados del caso.
   2) Ultima FINALIZADA del mismo ticket: detalle + motivo + partida/puntos.
   3) Movimientos del mismo ticket: reprogramadas/canceladas/anuladas con motivo.
   4) Antecedente del servicio: solo para responsabilidad.

   No modifica backend, Sheets, Ranking, Dashboard ni Produccion.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C10_DETALLE_OPERATIVO_OK) return;
  window.MV517C10_DETALLE_OPERATIVO_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const CACHE_PARTIDA=new Map();
  let timer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function fmtPts(v){const n=Number(v);return Number.isFinite(n)?(Number.isInteger(n)?String(n):n.toFixed(1)):"-";}

  function parseFecha(v){
    const s=txt(v);if(!s)return null;
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);
    const d=new Date(s);return isNaN(d)?null:d;
  }
  function fmtFecha(v){const d=parseFecha(v);return d?String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear():txt(v)||"-";}
  function diasEntre(a,b){const da=parseFecha(a),db=parseFecha(b);if(!da||!db)return null;return Math.max(0,Math.round((db-da)/86400000));}

  function datos(){return window.MV517C5_DATA||{};}
  function caso(ticket){return (datos().incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;}

  function momento(o){
    const n=Number(o&&o.momento);if(Number.isFinite(n)&&n>0)return n;
    const d=parseFecha(o&&o.fechaSolicitud);return d?d.getTime():0;
  }
  function motivoOrden(o){
    const e=norm(o&&o.estado);
    if(e==="FINALIZADA") return txt(o.motivoFinalizacion)||"Sin motivo de finalizacion informado por WIN";
    if(e==="REPROGRAMADA"||e==="CANCELADA") return txt(o.motivoCancelacion)||txt(o.motivoFinalizacion)||"Sin motivo informado por WIN";
    if(e==="ANULADA") return txt(o.motivoAnulacion)||txt(o.motivoCancelacion)||"Sin motivo informado por WIN";
    return txt(o.motivoFinalizacion)||txt(o.motivoCancelacion)||txt(o.motivoAnulacion)||"Sin motivo informado por WIN";
  }

  async function partida(ordenId){
    const id=txt(ordenId);if(!id)throw new Error("Orden sin ID");
    if(CACHE_PARTIDA.has(id))return CACHE_PARTIDA.get(id);
    const key="MV517C10|PARTIDA|"+id;
    try{const c=JSON.parse(sessionStorage.getItem(key)||"null");if(c&&c.data&&Date.now()-Number(c.ts||0)<300000){CACHE_PARTIDA.set(id,c.data);return c.data;}}catch(_){}
    const u=new URL(API);u.searchParams.set("accion","partidaActualVtrGarV517C9");u.searchParams.set("usuario",usuario());u.searchParams.set("ordenId",id);
    const r=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow"});
    const t=await r.text();let j;try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta de partida no valida");}
    if(!j||!j.ok)throw new Error((j&&j.error)||"No se pudo consultar la partida");
    CACHE_PARTIDA.set(id,j);try{sessionStorage.setItem(key,JSON.stringify({ts:Date.now(),data:j}));}catch(_){}
    return j;
  }

  function chip(texto,tipo){return `<span class="mv517c10-chip ${tipo||""}">${esc(texto)}</span>`;}
  function estadoChip(e){
    e=norm(e);
    if(e==="FINALIZADA")return chip("FINALIZADA","ok");
    if(e==="REPROGRAMADA")return chip("REPROGRAMADA","warn");
    if(e==="CANCELADA")return chip("CANCELADA","bad");
    if(e==="ANULADA")return chip("ANULADA","dark");
    return chip(e||"POR REVISAR","info");
  }

  function css(){
    if(document.getElementById("mv517c10-css"))return;
    const s=document.createElement("style");s.id="mv517c10-css";s.textContent=`
      .mv517c10{display:grid;gap:6px;margin-top:6px}
      .mv517c10-sec{border-radius:9px;padding:8px;background:#f7fafc}
      .mv517c10-sec.actual{background:#e8f1fb}.mv517c10-sec.final{background:#e6f5eb}.mv517c10-sec.mov{background:#f4f6f8}.mv517c10-sec.ant{background:#fff4d8}
      .mv517c10-title{font-size:10px;font-weight:950;margin-bottom:6px;display:flex;justify-content:space-between;gap:6px;align-items:center;flex-wrap:wrap}
      .mv517c10-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
      .mv517c10-cell{background:rgba(255,255,255,.67);border-radius:7px;padding:5px;min-width:0}.mv517c10-cell small{display:block;font-size:6.8px;color:#64748b;font-weight:900;text-transform:uppercase}.mv517c10-cell b{display:block;font-size:8.5px;margin-top:1px;overflow-wrap:anywhere}
      .mv517c10-order{border-radius:8px;background:rgba(255,255,255,.72);padding:7px;margin-top:5px}.mv517c10-order.latest{border-left:3px solid #16a34a}
      .mv517c10-line{display:flex;gap:5px;align-items:center;flex-wrap:wrap;font-size:8.5px}.mv517c10-meta{font-size:8px;color:#475569;margin-top:3px;line-height:1.35}
      .mv517c10-ob{margin-top:4px;padding:5px 7px;border-radius:7px;background:#fff;font-size:8px;line-height:1.35}.mv517c10-ob b{color:#334155}
      .mv517c10-part{margin-top:4px;padding:5px 7px;border-radius:7px;background:#dff3e7;color:#14532d;font-size:8px;line-height:1.35}.mv517c10-part.warn{background:#fff0c9;color:#7c5200}
      .mv517c10-chip{display:inline-flex;padding:2px 5px;border-radius:999px;font-size:7px;font-weight:950;background:#dfe6ee;color:#334155}.mv517c10-chip.ok{background:#d3f1df;color:#166534}.mv517c10-chip.warn{background:#ffefbb;color:#854d0e}.mv517c10-chip.bad{background:#f9d8d8;color:#991b1b}.mv517c10-chip.dark{background:#dfe2e8;color:#0f172a}.mv517c10-chip.info{background:#d9e9fb;color:#1d4ed8}
      .mv517c10-note{font-size:7.5px;color:#64748b;line-height:1.35;margin-top:4px}
      @media(max-width:760px){.mv517c10-grid{grid-template-columns:1fr 1fr}}@media(max-width:460px){.mv517c10-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function actualHTML(x,ordenes){
    const ult=ordenes.length?ordenes[ordenes.length-1]:null;
    const reg=norm(x.registroTecnico)==="REGISTRADA"?"TECNICO REGISTRO":"SIN REGISTRO TECNICO";
    const bono=txt(x.bono||x.estadoRegistroTecnico||"PENDIENTE").replace(/_/g," ");
    return `<section class="mv517c10-sec actual"><div class="mv517c10-title"><span>1. GAR/VTR ACTUAL</span>${estadoChip(x.estadoWin)}</div>
      <div class="mv517c10-grid">
        <div class="mv517c10-cell"><small>Ticket</small><b>${esc(x.ticket||"-")}</b></div>
        <div class="mv517c10-cell"><small>Tipo</small><b>${esc(x.tipo||"-")}</b></div>
        <div class="mv517c10-cell"><small>Fecha GAR/VTR</small><b>${esc(fmtFecha(x.fechaIncidencia))}</b></div>
        <div class="mv517c10-cell"><small>Orden WIN actual</small><b>${esc(ult?.ordenId||"-")} · ${esc(ult?.estado||x.estadoWin||"-")}</b></div>
        <div class="mv517c10-cell"><small>Codigo / pedido</small><b>${esc(x.codigoPedido||"-")}</b></div>
        <div class="mv517c10-cell"><small>DNI</small><b>${esc(x.dni||"-")}</b></div>
        <div class="mv517c10-cell"><small>Cuadrilla ejecutora</small><b>${esc(x.cuadrillaEjecutora||"-")}</b></div>
        <div class="mv517c10-cell"><small>Responsable</small><b>${esc(x.cuadrillaResponsable||"POR VALIDAR")}</b></div>
        <div class="mv517c10-cell"><small>Registro tecnico</small><b>${esc(reg)}</b></div>
        <div class="mv517c10-cell"><small>Bono / evaluacion</small><b>${esc(bono||"PENDIENTE")}${x.puntajeVtrGar!=null?` · ${esc(x.puntajeVtrGar)} pts`:""}</b></div>
        <div class="mv517c10-cell"><small>Ordenes del ticket</small><b>${ordenes.length}</b></div>
        <div class="mv517c10-cell"><small>Sede</small><b>${esc(x.sedeEjecutora||"-")}</b></div>
      </div></section>`;
  }

  function finalHTML(o){
    if(!o)return `<section class="mv517c10-sec final"><div class="mv517c10-title">2. ULTIMA ORDEN FINALIZADA</div><div class="mv517c10-note">Este ticket aun no tiene una orden WIN FINALIZADA asociada.</div></section>`;
    return `<section class="mv517c10-sec final"><div class="mv517c10-title"><span>2. ULTIMA ORDEN FINALIZADA DEL MISMO TICKET</span>${estadoChip("FINALIZADA")}</div>
      <div class="mv517c10-order latest" data-mv517c10-final="${esc(o.ordenId)}">
        <div class="mv517c10-grid">
          <div class="mv517c10-cell"><small>Orden WIN</small><b>${esc(o.ordenId||"-")}</b></div>
          <div class="mv517c10-cell"><small>Fecha</small><b>${esc(fmtFecha(o.fechaSolicitud))}</b></div>
          <div class="mv517c10-cell"><small>Cuadrilla</small><b>${esc(o.cuadrilla||"-")}</b></div>
          <div class="mv517c10-cell"><small>Seguimiento</small><b>${esc(o.codigoSeguimiento||"-")}</b></div>
        </div>
        <div class="mv517c10-ob"><b>Motivo de finalizacion WIN:</b> ${esc(motivoOrden(o))}</div>
        <div class="mv517c10-part" data-mv517c10-partida>Consultando partida y puntos de esta orden FINALIZADA...</div>
      </div></section>`;
  }

  function movimientosHTML(ordenes,ultimaFinal){
    const mov=ordenes.filter(o=>norm(o.estado)!=="FINALIZADA");
    if(!mov.length)return `<section class="mv517c10-sec mov"><div class="mv517c10-title">3. MOVIMIENTOS DEL MISMO TICKET</div><div class="mv517c10-note">No registra cancelaciones, reprogramaciones ni anulaciones asociadas.</div></section>`;
    let anterior=null;
    return `<section class="mv517c10-sec mov"><div class="mv517c10-title"><span>3. MOVIMIENTOS DEL MISMO TICKET</span>${chip(String(mov.length)+" movimiento(s)","info")}</div>${mov.map(o=>{
      const dias=anterior?diasEntre(anterior.fechaSolicitud,o.fechaSolicitud):0;anterior=o;
      return `<div class="mv517c10-order"><div class="mv517c10-line"><b>Orden ${esc(o.ordenId||"-")}</b>${estadoChip(o.estado)}<span>${esc(fmtFecha(o.fechaSolicitud))}</span>${dias!=null?chip((dias?"+":"")+dias+" dia"+(dias===1?"":"s"),"info"):""}</div><div class="mv517c10-meta"><b>Cuadrilla:</b> ${esc(o.cuadrilla||"-")} ${o.codigoSeguimiento?`· <b>Seguimiento:</b> ${esc(o.codigoSeguimiento)}`:""}</div><div class="mv517c10-ob"><b>Motivo / observacion WIN:</b> ${esc(motivoOrden(o))}</div></div>`;
    }).join("")}</section>`;
  }

  function antecedenteHTML(x){
    const a=x.antecedente||{},lista=Array.isArray(a.antecedentes)?a.antecedentes:[];
    if(!lista.length)return `<section class="mv517c10-sec ant"><div class="mv517c10-title">4. ANTECEDENTE DEL SERVICIO</div><div class="mv517c10-note">No se detecto antecedente previo. Esta señal no determina automaticamente que el caso no sea GAR/VTR.</div></section>`;
    const l=lista.slice().sort((p,q)=>String(q.fecha||"").localeCompare(String(p.fecha||"")));
    return `<section class="mv517c10-sec ant"><div class="mv517c10-title"><span>4. ANTECEDENTE DEL SERVICIO · SOLO RESPONSABILIDAD</span>${chip(a.estado||"DETECTADO","warn")}</div><div class="mv517c10-note">Este bloque sirve para decidir quien asume la incidencia. <b>No define la partida ni los puntos del GAR/VTR actual.</b></div>${l.map(z=>`<div class="mv517c10-order"><div class="mv517c10-line"><b>Orden ${esc(z.ordenId||"-")}</b>${estadoChip(z.estado)}<span>${esc(fmtFecha(z.fecha))}</span>${z.diasAntes!=null?chip(esc(z.diasAntes)+" dias antes","warn"):""}</div><div class="mv517c10-meta"><b>Trabajo anterior:</b> ${esc(z.tipoTrabajo||"-")} · <b>Cuadrilla:</b> ${esc(z.cuadrilla||"-")}${z.ticket?` · <b>Ticket:</b> ${esc(z.ticket)}`:""}</div></div>`).join("")}</section>`;
  }

  function esconderViejos(card){
    Array.from(card.querySelectorAll(".mv517c1-box")).forEach(b=>{
      const h=norm(b.querySelector("b")?.textContent);
      if(h.includes("ANTECEDENTES DETECTADOS")||h.includes("SERVICIO ANTERIOR / ANTECEDENTES")||h.includes("ORDENES WIN ASOCIADAS")) b.style.display="none";
    });
    const grid=card.querySelector(".mv517c1-grid");if(grid)grid.style.display="none";
  }

  async function completarPartida(sec,o){
    const box=sec&&sec.querySelector("[data-mv517c10-partida]");if(!box||!o)return;
    try{
      const p=await partida(o.ordenId);
      if(p.partidaSegura){box.classList.remove("warn");box.innerHTML=`<b>Partida de esta GAR/VTR:</b> ${esc(p.partidaCodigo||"-")} · ${esc(p.partidaNombre||"-")} · <b>${esc(fmtPts(p.puntosPartida))} pt${Number(p.puntosPartida)===1?"":"s"}</b><br><span style="color:#475569"><b>Fuente:</b> ${esc(p.origenPartida||"ORDEN WIN ACTUAL")} · No usa antecedente.</span>`;}
      else{box.classList.add("warn");box.innerHTML=`<b>Partida de esta GAR/VTR:</b> POR REVISAR<br>${esc(p.mensaje||"No existe una regla univoca. No se usara la partida del antecedente.")}`;}
    }catch(e){box.classList.add("warn");box.innerHTML=`<b>Partida de esta GAR/VTR:</b> no disponible por el momento.<br>${esc(e.message||e)} · No se usara la partida del antecedente.`;}
  }

  function aplicar(card){
    if(!card.open)return;
    const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);if(!/^(VTR|GAR)-\d+/i.test(ticket))return;
    const x=caso(ticket);if(!x)return;
    const detail=card.querySelector(".mv517c1-detail");if(!detail)return;
    css();
    esconderViejos(card);
    let sec=detail.querySelector(".mv517c10");if(sec)sec.remove();
    const ordenes=(x.ordenesWin||[]).slice().sort((a,b)=>momento(a)-momento(b));
    const finals=ordenes.filter(o=>norm(o.estado)==="FINALIZADA");
    const ultimaFinal=finals.length?finals[finals.length-1]:null;
    sec=document.createElement("div");sec.className="mv517c10";
    sec.innerHTML=actualHTML(x,ordenes)+finalHTML(ultimaFinal)+movimientosHTML(ordenes,ultimaFinal)+antecedenteHTML(x);
    const reg=detail.querySelector(".mv517c1-regbox");
    if(reg)detail.insertBefore(sec,reg);else detail.prepend(sec);
    completarPartida(sec,ultimaFinal);
  }

  function run(){document.querySelectorAll(".mv517c1-case[open]").forEach(aplicar);}
  function schedule(){clearTimeout(timer);timer=setTimeout(run,70);}
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open"]});
  setTimeout(run,600);
})();
