/* ============================================================
   MI VISUAL V517D F4T.2 - GAR/VTR RAPIDO DENTRO DEL DIA
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Consulta GAR/VTR en paralelo apenas se pinta Produccion.
   - No espera al bloque intermedio F4G.
   - Inserta GAR/VTR dentro del dia correspondiente.
   - BONO suma al total visible del dia; NO BONO suma 0.
   - Usa la misma accion backend aprobada: listarPuntajeVtrGarActivoV517D.
   - No escribe PRODUCCION_APP ni modifica formulas/backend/Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4T2_GARVTR_RAPIDO_OK) return;
  window.MV517D_F4T2_GARVTR_RAPIDO_OK=true;

  const API=window.MI_VISUAL_API_URL || "";
  const CACHE_MS=60*1000;
  const cache=new Map();
  const pendientes=new Map();
  let timer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esTecnico(){return norm(localStorage.getItem("perfil")||"")==="TECNICO";}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function cuadrilla(){return txt(localStorage.getItem("cuadrilla")||"");}
  function numero(v){const n=Number(String(v==null?"":v).replace(",",".").replace(/[^0-9.\-]/g,""));return Number.isFinite(n)?n:0;}

  function periodoActual(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function periodoProduccion(){
    const s=document.getElementById("mv276ProduccionPeriodo");
    return s&&/^\d{4}-\d{2}$/.test(s.value)?s.value:periodoActual();
  }
  function fechaVisible(v){
    const s=txt(v);
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m?`${m[1]}/${m[2]}/${m[3]}`:s;
  }
  function fechaMs(fecha){
    const m=txt(fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0;
  }

  async function leerJson(res){
    const t=(await res.text()).trim();
    if(!t||/^MI VISUAL API OK$/i.test(t)||/^<!doctype|^<html/i.test(t)) throw new Error("Respuesta GAR/VTR no disponible");
    const j=JSON.parse(t);
    if(!j||!j.ok) throw new Error(j&&j.error||"No se pudo consultar GAR/VTR");
    return j;
  }

  async function obtener(periodo){
    const key=[usuario(),periodo,cuadrilla()].join("|");
    const c=cache.get(key);
    if(c&&Date.now()-c.ts<CACHE_MS) return c.data;
    if(pendientes.has(key)) return pendientes.get(key);
    if(!API||!usuario()) return null;

    const prom=(async()=>{
      const u=new URL(API);
      u.searchParams.set("accion","listarPuntajeVtrGarActivoV517D");
      u.searchParams.set("usuario",usuario());
      u.searchParams.set("periodo",periodo);
      if(cuadrilla()) u.searchParams.set("cuadrilla",cuadrilla());
      u.searchParams.set("_f4t2",String(Date.now()));
      const r=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}});
      const data=await leerJson(r);
      cache.set(key,{ts:Date.now(),data});
      return data;
    })().finally(()=>pendientes.delete(key));
    pendientes.set(key,prom);
    return prom;
  }

  function fechaDeCard(card){
    const t=txt(card&&card.querySelector(".mv4-day-head b")?.textContent);
    const m=t.match(/(\d{2}\/\d{2}\/\d{4})/);
    return m?m[1]:"";
  }
  function buscarCard(detalle,fecha){
    return Array.from(detalle.querySelectorAll(":scope > .mv4-day-card")).find(c=>fechaDeCard(c)===fecha)||null;
  }
  function crearCard(detalle,fecha){
    const card=document.createElement("div");
    card.className="mv4-day-card mv517d-f4t-creada";
    card.innerHTML=`<div class="mv4-day-head"><b>📅 ${fecha}</b><span>0.0 pts</span></div>`;
    const ms=fechaMs(fecha);
    const existentes=Array.from(detalle.querySelectorAll(":scope > .mv4-day-card"));
    const antes=existentes.find(c=>{const f=fechaDeCard(c);return f&&fechaMs(f)<ms;});
    if(antes) detalle.insertBefore(card,antes); else detalle.appendChild(card);
    return card;
  }
  function totalEl(card){
    const h=card&&card.querySelector(".mv4-day-head");
    return h?(h.querySelector("span:last-child")||h.lastElementChild):null;
  }
  function asegurarBase(card){
    const el=totalEl(card); if(!el) return 0;
    if(el.dataset.mv517dF4TBasePts===undefined){
      const m=txt(el.textContent).match(/(-?\d+(?:[.,]\d+)?)\s*pts/i);
      el.dataset.mv517dF4TBasePts=String(m?numero(m[1]):0);
      el.dataset.mv517dF4TTextoBase=txt(el.textContent);
    }
    return numero(el.dataset.mv517dF4TBasePts);
  }
  function fijarTotal(card,extra){
    const el=totalEl(card); if(!el) return;
    const base=asegurarBase(card);
    const original=el.dataset.mv517dF4TTextoBase||txt(el.textContent);
    const total=base+numero(extra);
    el.textContent=/-?\d+(?:[.,]\d+)?\s*pts/i.test(original)
      ? original.replace(/-?\d+(?:[.,]\d+)?\s*pts/i,`${total.toFixed(1)} pts`)
      : `${total.toFixed(1)} pts`;
  }
  function restaurarTotales(detalle){
    Array.from(detalle.querySelectorAll(":scope > .mv4-day-card")).forEach(card=>{
      const el=totalEl(card); if(!el||el.dataset.mv517dF4TBasePts===undefined) return;
      fijarTotal(card,0);
    });
  }

  function integrar(data,periodo){
    if(!esTecnico()||periodo!==periodoProduccion()) return;
    const detalle=document.querySelector("#mv59_detalle_diario");
    if(!detalle) return;

    const regs=(data&&Array.isArray(data.registros)?data.registros:[])
      .filter(r=>["BONO","NO BONO"].includes(norm(r.resultado)))
      .map(r=>({
        fecha:fechaVisible(r.fecha),
        ticket:txt(r.ticket).toUpperCase(),
        tipo:txt(r.tipo)||(/^GAR-/i.test(txt(r.ticket))?"GAR":"VTR"),
        resultado:norm(r.resultado),
        puntos:numero(r.puntajeVtrGar)
      }))
      .filter(r=>r.fecha&&/^(GAR|VTR)-/i.test(r.ticket));

    restaurarTotales(detalle);
    detalle.querySelectorAll(".mv517d-f4t-garvtr").forEach(x=>x.remove());

    const extra={};
    regs.forEach(r=>{
      let card=buscarCard(detalle,r.fecha);
      if(!card) card=crearCard(detalle,r.fecha);
      if(!card) return;
      const fila=document.createElement("div");
      fila.className="mv4-day-row mv517d-f4t-garvtr";
      fila.dataset.ticket=r.ticket;
      fila.style.cssText="border-left:3px solid #7c3aed;padding-left:9px;";
      fila.innerHTML=`<span><b style="color:#c4b5fd">${txt(r.tipo).toUpperCase()}</b> · ${r.ticket} · ${r.resultado}</span><b>${r.puntos.toFixed(1)} pts</b>`;
      const head=card.querySelector(".mv4-day-head");
      const ultima=card.querySelector(".mv517d-f4t-garvtr:last-of-type");
      if(ultima) ultima.insertAdjacentElement("afterend",fila);
      else if(head) head.insertAdjacentElement("afterend",fila);
      else card.prepend(fila);
      if(r.resultado==="BONO") extra[r.fecha]=(extra[r.fecha]||0)+r.puntos;
    });
    Object.keys(extra).forEach(f=>{const card=buscarCard(detalle,f);if(card) fijarTotal(card,extra[f]);});

    const separado=detalle.querySelector("#mv517d-f4g-detalle");
    if(separado) separado.style.display="none";
    detalle.dataset.mv517dF4T2="1";
  }

  async function cargar(){
    if(!esTecnico()) return;
    if(!document.querySelector(".mv59-produccion-page")||!document.querySelector("#mv59_detalle_diario")) return;
    const p=periodoProduccion();
    try{
      const data=await obtener(p);
      if(data) integrar(data,p);
    }catch(e){
      console.warn("F4T.2: GAR/VTR rapido no disponible; F4G queda como respaldo",e);
    }
  }

  function programar(ms){clearTimeout(timer);timer=setTimeout(cargar,ms||20);}

  if(document.body){
    const obs=new MutationObserver(function(){
      if(!esTecnico()) return;
      if(document.querySelector(".mv59-produccion-page")) programar(20);
      const sep=document.querySelector("#mv59_detalle_diario #mv517d-f4g-detalle");
      if(sep) sep.style.display="none";
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("change",function(ev){
    if(esTecnico()&&ev.target&&ev.target.id==="mv276ProduccionPeriodo") programar(10);
  },true);
  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;
    if(ev.target&&ev.target.closest&&ev.target.closest(".mv59-detail-btn")) programar(0);
  },true);

  [150,400,900].forEach(ms=>setTimeout(()=>{if(esTecnico()) programar(0);},ms));
  window.mv517dF4T2CargarGarVtr=cargar;
  console.log("MI VISUAL V517D F4T.2: GAR/VTR del Tecnico se consulta en paralelo con Produccion.");
})();
