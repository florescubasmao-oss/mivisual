/* ============================================================
   MI VISUAL V517D F4T.3 - GAR/VTR PRECARGADO CON MI DESEMPENO
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Precarga GAR/VTR desde que termina el login del Tecnico.
   - Conserva una copia local hasta 24 h para pintar de inmediato.
   - Refresca la fuente oficial en segundo plano.
   - Al abrir Produccion integra GAR/VTR dentro del dia sin esperar F4G.
   - BONO suma al total visible del dia; NO BONO suma 0.
   - No escribe PRODUCCION_APP ni cambia formulas/backend/Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4T3_GARVTR_PRELOAD_OK) return;
  window.MV517D_F4T3_GARVTR_PRELOAD_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const MEM_MS=2*60*1000;
  const LOCAL_MS=24*60*60*1000;
  const PREFIJO="mv517dF4T3GarVtr:";
  const cache=new Map();
  const pendientes=new Map();
  let timer=null;
  let ultimoPrefetch=0;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esTecnico(){return norm(localStorage.getItem("perfil")||"")==="TECNICO";}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function cuadrilla(){return txt(localStorage.getItem("cuadrilla")||"");}
  function numero(v){const n=Number(String(v==null?"":v).replace(",",".").replace(/[^0-9.\-]/g,""));return Number.isFinite(n)?n:0;}
  function periodoActual(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
  function periodoProduccion(){const s=document.getElementById("mv276ProduccionPeriodo");return s&&/^\d{4}-\d{2}$/.test(s.value)?s.value:periodoActual();}
  function clave(periodo){return [usuario(),periodo,cuadrilla()].join("|");}
  function claveLocal(periodo){return PREFIJO+encodeURIComponent(clave(periodo));}

  function guardarLocal(periodo,data){try{localStorage.setItem(claveLocal(periodo),JSON.stringify({ts:Date.now(),data:data}));}catch(_){}}
  function leerLocal(periodo){
    try{
      const x=JSON.parse(localStorage.getItem(claveLocal(periodo))||"null");
      if(!x||!x.data||!x.ts) return null;
      const edad=Date.now()-Number(x.ts||0);
      if(edad<0||edad>LOCAL_MS) return null;
      return {ts:Number(x.ts),edad:edad,data:x.data};
    }catch(_){return null;}
  }
  async function leerJson(res){
    const t=(await res.text()).trim();
    if(!t||/^MI VISUAL API OK$/i.test(t)||/^<!doctype|^<html/i.test(t)) throw new Error("Respuesta GAR/VTR no disponible");
    const j=JSON.parse(t);
    if(!j||!j.ok) throw new Error(j&&j.error||"No se pudo consultar GAR/VTR");
    return j;
  }

  async function consultarRed(periodo){
    const k=clave(periodo);
    if(pendientes.has(k)) return pendientes.get(k);
    if(!API||!usuario()) return null;
    const prom=(async()=>{
      const u=new URL(API);
      u.searchParams.set("accion","listarPuntajeVtrGarActivoV517D");
      u.searchParams.set("usuario",usuario());
      u.searchParams.set("periodo",periodo);
      if(cuadrilla()) u.searchParams.set("cuadrilla",cuadrilla());
      u.searchParams.set("_f4t3",String(Date.now()));
      const r=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}});
      const data=await leerJson(r);
      cache.set(k,{ts:Date.now(),data:data});
      guardarLocal(periodo,data);
      return data;
    })().finally(()=>pendientes.delete(k));
    pendientes.set(k,prom);
    return prom;
  }

  function obtenerInmediato(periodo){
    const k=clave(periodo),m=cache.get(k);
    if(m&&Date.now()-m.ts<MEM_MS) return m.data;
    const l=leerLocal(periodo);
    if(l){cache.set(k,{ts:l.ts,data:l.data});return l.data;}
    return null;
  }

  function prefetch(periodo,forzar){
    if(!esTecnico()||!usuario()) return Promise.resolve(null);
    const p=/^\d{4}-\d{2}$/.test(txt(periodo))?txt(periodo):periodoActual();
    const k=clave(p),m=cache.get(k);
    if(!forzar&&m&&Date.now()-m.ts<MEM_MS) return Promise.resolve(m.data);
    return consultarRed(p).then(function(data){
      if(data&&document.querySelector(".mv59-produccion-page")&&p===periodoProduccion()) integrar(data,p);
      return data;
    }).catch(function(e){console.warn("F4T.3: refresco GAR/VTR",e);return null;});
  }

  function fechaVisible(v){
    const s=txt(v);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[1]}/${m[2]}/${m[3]}`:s;
  }
  function fechaMs(fecha){const m=txt(fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0;}
  function fechaDeCard(card){const t=txt(card&&card.querySelector(".mv4-day-head b")?.textContent);const m=t.match(/(\d{2}\/\d{2}\/\d{4})/);return m?m[1]:"";}
  function buscarCard(detalle,fecha){return Array.from(detalle.querySelectorAll(":scope > .mv4-day-card")).find(c=>fechaDeCard(c)===fecha)||null;}
  function crearCard(detalle,fecha){
    const card=document.createElement("div");card.className="mv4-day-card mv517d-f4t-creada";
    card.innerHTML=`<div class="mv4-day-head"><b>📅 ${fecha}</b><span>0.0 pts</span></div>`;
    const ms=fechaMs(fecha),existentes=Array.from(detalle.querySelectorAll(":scope > .mv4-day-card"));
    const antes=existentes.find(c=>{const f=fechaDeCard(c);return f&&fechaMs(f)<ms;});
    if(antes) detalle.insertBefore(card,antes); else detalle.appendChild(card);return card;
  }
  function totalEl(card){const h=card&&card.querySelector(".mv4-day-head");return h?(h.querySelector("span:last-child")||h.lastElementChild):null;}
  function asegurarBase(card){
    const el=totalEl(card);if(!el)return 0;
    if(el.dataset.mv517dF4TBasePts===undefined){const m=txt(el.textContent).match(/(-?\d+(?:[.,]\d+)?)\s*pts/i);el.dataset.mv517dF4TBasePts=String(m?numero(m[1]):0);el.dataset.mv517dF4TTextoBase=txt(el.textContent);}
    return numero(el.dataset.mv517dF4TBasePts);
  }
  function fijarTotal(card,extra){
    const el=totalEl(card);if(!el)return;const base=asegurarBase(card),original=el.dataset.mv517dF4TTextoBase||txt(el.textContent),total=base+numero(extra);
    el.textContent=/-?\d+(?:[.,]\d+)?\s*pts/i.test(original)?original.replace(/-?\d+(?:[.,]\d+)?\s*pts/i,`${total.toFixed(1)} pts`):`${total.toFixed(1)} pts`;
  }
  function restaurarTotales(detalle){Array.from(detalle.querySelectorAll(":scope > .mv4-day-card")).forEach(card=>{const el=totalEl(card);if(el&&el.dataset.mv517dF4TBasePts!==undefined)fijarTotal(card,0);});}

  function integrar(data,periodo){
    if(!esTecnico()||periodo!==periodoProduccion())return;
    const detalle=document.querySelector("#mv59_detalle_diario");if(!detalle)return;
    const regs=(data&&Array.isArray(data.registros)?data.registros:[]).filter(r=>["BONO","NO BONO"].includes(norm(r.resultado))).map(r=>({
      fecha:fechaVisible(r.fecha),ticket:txt(r.ticket).toUpperCase(),tipo:txt(r.tipo)||(/^GAR-/i.test(txt(r.ticket))?"GAR":"VTR"),resultado:norm(r.resultado),puntos:numero(r.puntajeVtrGar)
    })).filter(r=>r.fecha&&/^(GAR|VTR)-/i.test(r.ticket));

    restaurarTotales(detalle);
    detalle.querySelectorAll(".mv517d-f4t-garvtr").forEach(x=>x.remove());
    const extra={};
    regs.forEach(r=>{
      let card=buscarCard(detalle,r.fecha);if(!card)card=crearCard(detalle,r.fecha);if(!card)return;
      const fila=document.createElement("div");fila.className="mv4-day-row mv517d-f4t-garvtr";fila.dataset.ticket=r.ticket;fila.style.cssText="border-left:3px solid #7c3aed;padding-left:9px;";
      fila.innerHTML=`<span><b style="color:#c4b5fd">${txt(r.tipo).toUpperCase()}</b> · ${r.ticket} · ${r.resultado}</span><b>${r.puntos.toFixed(1)} pts</b>`;
      const head=card.querySelector(".mv4-day-head"),ultima=card.querySelector(".mv517d-f4t-garvtr:last-of-type");
      if(ultima)ultima.insertAdjacentElement("afterend",fila);else if(head)head.insertAdjacentElement("afterend",fila);else card.prepend(fila);
      if(r.resultado==="BONO")extra[r.fecha]=(extra[r.fecha]||0)+r.puntos;
    });
    Object.keys(extra).forEach(f=>{const card=buscarCard(detalle,f);if(card)fijarTotal(card,extra[f]);});
    const separado=detalle.querySelector("#mv517d-f4g-detalle");if(separado)separado.style.display="none";
    detalle.dataset.mv517dF4T3="1";
  }

  function cargarProduccion(){
    if(!esTecnico()||!document.querySelector(".mv59-produccion-page")||!document.querySelector("#mv59_detalle_diario"))return;
    const p=periodoProduccion(),inmediato=obtenerInmediato(p);
    if(inmediato) integrar(inmediato,p);
    prefetch(p,false);
  }
  function programar(ms){clearTimeout(timer);timer=setTimeout(cargarProduccion,ms||0);}

  let intentos=0;
  const espera=setInterval(function(){
    intentos++;
    if(esTecnico()&&usuario()){
      clearInterval(espera);ultimoPrefetch=Date.now();prefetch(periodoActual(),false);
    }else if(intentos>120){clearInterval(espera);}
  },250);

  if(document.body){
    const obs=new MutationObserver(function(){
      if(!esTecnico())return;
      if(document.querySelector(".mv59-produccion-page"))programar(0);
      const sep=document.querySelector("#mv59_detalle_diario #mv517d-f4g-detalle");if(sep)sep.style.display="none";
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(ev){
    if(!esTecnico())return;
    const mi=ev.target&&ev.target.closest?ev.target.closest("#cardMiDesempeno"):null;
    if(mi&&Date.now()-ultimoPrefetch>15000){ultimoPrefetch=Date.now();prefetch(periodoActual(),false);}
    const prod=ev.target&&ev.target.closest?ev.target.closest("button[onclick*='mostrarProduccionV2']"):null;
    if(prod)prefetch(periodoActual(),false);
    const det=ev.target&&ev.target.closest?ev.target.closest(".mv59-detail-btn"):null;
    if(det)programar(0);
  },true);
  document.addEventListener("change",function(ev){if(esTecnico()&&ev.target&&ev.target.id==="mv276ProduccionPeriodo"){const p=ev.target.value;prefetch(p,false);programar(0);}},true);

  [300,900,1800].forEach(ms=>setTimeout(()=>{if(esTecnico()&&usuario())prefetch(periodoActual(),false);},ms));
  window.mv517dF4T3PrecargarGarVtr=prefetch;
  window.mv517dF4T3CargarGarVtr=cargarProduccion;
  console.log("MI VISUAL V517D F4T.3: GAR/VTR se precarga desde login y se pinta junto con Produccion.");
})();
