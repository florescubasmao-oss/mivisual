/* ============================================================
   MI VISUAL V517D F4T - MI DESEMPENO TECNICO RAPIDO + GAR/VTR POR DIA
   29/08/2026

   ALCANCE ESTRICTO / SOLO FRONTEND / SOLO PERFIL TECNICO
   1) MI DESEMPEÑO
      - Precarga el modulo y el resumen operativo apenas termina el login.
      - Si existe un ultimo resumen local de hasta 24 h, lo usa de inmediato
        mientras actualiza en segundo plano.
      - No cambia formulas, metas, Produccion, Ranking ni indicadores.
   2) PRODUCCION DENTRO DE MI DESEMPEÑO
      - El bloque GAR/VTR validado de F4G deja de mostrarse separado.
      - Cada GAR/VTR se coloca dentro del DIA correspondiente.
      - La linea empieza con GAR o VTR, luego ticket y resultado.
      - BONO suma al total visible de ese dia; NO BONO suma 0.
      - No escribe PRODUCCION_APP ni modifica el backend.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4T_MI_DESEMPENO_OK) return;
  window.MV517D_F4T_MI_DESEMPENO_OK = true;

  const TTL_LOCAL_INMEDIATO = 24 * 60 * 60 * 1000;
  const TTL_LOCAL_FRESCO = 30 * 60 * 1000;
  const PREFIJO_RESUMEN = "mv367ResumenDashboard:";
  let resumenEnvuelto = false;
  let precargaIniciada = false;
  let ultimoRefrescoVisible = 0;
  let timerMerge = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esTecnico(){ return norm(localStorage.getItem("perfil") || "") === "TECNICO"; }
  function usuario(){ return txt(localStorage.getItem("usuario") || ""); }
  function sede(){ return norm(localStorage.getItem("sede") || ""); }

  function periodoActual(){
    try{
      const p = new Intl.DateTimeFormat("en-CA",{
        timeZone:"America/Lima",year:"numeric",month:"2-digit"
      }).formatToParts(new Date());
      return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}`;
    }catch(_){
      const d=new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }
  }

  function periodoVisible(){
    const s=document.getElementById("mv364PeriodoDesempeno");
    return s && /^\d{4}-\d{2}$/.test(s.value) ? s.value : periodoActual();
  }

  function identidadResumen(periodo){
    return [usuario() || "SIN_USUARIO","TECNICO",sede()].join("|") + "|" + periodo;
  }
  function claveLocal(periodo){
    return PREFIJO_RESUMEN + encodeURIComponent(identidadResumen(periodo));
  }
  function leerLocal(periodo){
    try{
      const r=JSON.parse(localStorage.getItem(claveLocal(periodo)) || "null");
      if(!r || !r.data || !r.fecha) return null;
      const edad=Date.now()-Number(r.fecha || 0);
      if(edad<0 || edad>TTL_LOCAL_INMEDIATO) return null;
      return {edad,fecha:Number(r.fecha),data:r.data};
    }catch(_){ return null; }
  }

  function miDesempenoVisible(){
    const p=document.getElementById("pantalla");
    const h=p && p.querySelector("h2");
    return !!(h && /MI\s+DESEMPEÑO/i.test(h.textContent || ""));
  }

  function instalarResumenRapido(){
    if(!esTecnico()) return false;
    const actual=window.mv361ConsultarResumenDashboardRanking;
    if(typeof actual!=="function") return false;
    if(actual.__mv517dF4T){ resumenEnvuelto=true; return true; }

    const base=actual;
    const fn=async function(periodo,forzar){
      const p=/^\d{4}-\d{2}$/.test(txt(periodo)) ? txt(periodo) : periodoActual();
      if(!esTecnico() || forzar) return base.apply(this,arguments);

      const local=leerLocal(p);
      if(local && local.edad>TTL_LOCAL_FRESCO){
        /* Vista inmediata con el ultimo dato conocido. La fuente oficial se
           actualiza en paralelo mediante la funcion base V367. */
        Promise.resolve(base.call(this,p,false)).catch(function(e){
          console.warn("F4T: actualizacion silenciosa Mi Desempeno",e);
        });
        return Object.assign({},local.data,{
          _mv517dF4TDesdeCache:true,
          _mv517dF4TEdadMs:local.edad
        });
      }
      return base.apply(this,arguments);
    };
    fn.__mv517dF4T=true;
    fn.__mv517dF4TBase=base;
    window.mv361ConsultarResumenDashboardRanking=fn;
    try{ mv361ConsultarResumenDashboardRanking=fn; }catch(_){}
    resumenEnvuelto=true;
    return true;
  }

  async function precargarMiDesempeno(){
    if(precargaIniciada || !esTecnico() || !usuario()) return;
    if(typeof window.mv339CargarModulo!=="function") return;
    precargaIniciada=true;
    const inicio=performance.now();
    try{
      await window.mv339CargarModulo("mi_desempeno");
      instalarResumenRapido();
      if(typeof window.mv361ConsultarResumenDashboardRanking==="function"){
        Promise.resolve(
          window.mv361ConsultarResumenDashboardRanking(periodoActual(),false)
        ).catch(function(e){
          console.warn("F4T: precarga de resumen no disponible",e);
        });
      }
      window.MV517D_F4T_PRELOAD_MS=Math.round(performance.now()-inicio);
    }catch(e){
      precargaIniciada=false;
      console.warn("F4T: no se pudo precargar Mi Desempeno",e);
    }
  }

  /* Cuando llega un resumen nuevo y el tecnico sigue en Mi Desempeno,
     se vuelve a pintar desde memoria. No lanza una segunda consulta pesada. */
  window.addEventListener("mv366ResumenActualizado",function(ev){
    if(!esTecnico() || !miDesempenoVisible()) return;
    const p=periodoVisible();
    const actualizado=txt(ev && ev.detail && ev.detail.periodo);
    if(actualizado && actualizado!==p) return;
    if(Date.now()-ultimoRefrescoVisible<2500) return;
    ultimoRefrescoVisible=Date.now();
    setTimeout(function(){
      if(!miDesempenoVisible()) return;
      if(typeof window.mostrarMiDesempeno==="function"){
        try{ window.mostrarMiDesempeno(p); }catch(_){}
      }
    },80);
  });

  /* ==========================================================
     GAR/VTR DENTRO DEL DIA DE PRODUCCION
  ========================================================== */
  function numero(v){
    const n=Number(String(v==null?"":v).replace(",",".").replace(/[^0-9.\-]/g,""));
    return Number.isFinite(n)?n:0;
  }
  function fechaMs(fecha){
    const m=txt(fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? new Date(+m[3],+m[2]-1,+m[1]).getTime() : 0;
  }
  function fechaDeCard(card){
    const t=txt(card && card.querySelector(".mv4-day-head b")?.textContent);
    const m=t.match(/(\d{2}\/\d{2}\/\d{4})/);
    return m ? m[1] : "";
  }
  function cardsDia(detalle){
    return Array.from(detalle.querySelectorAll(".mv4-day-card")).filter(function(c){
      return !c.closest("#mv517d-f4g-detalle") && !c.classList.contains("mv517d-f4t-creada");
    });
  }
  function buscarCard(detalle,fecha){
    return cardsDia(detalle).find(c=>fechaDeCard(c)===fecha) ||
      Array.from(detalle.querySelectorAll(".mv4-day-card.mv517d-f4t-creada")).find(c=>fechaDeCard(c)===fecha) || null;
  }
  function crearCard(detalle,fecha){
    const card=document.createElement("div");
    card.className="mv4-day-card mv517d-f4t-creada";
    card.innerHTML=`<div class="mv4-day-head"><b>📅 ${fecha}</b><span>0.0 pts</span></div>`;
    const ms=fechaMs(fecha);
    const existentes=Array.from(detalle.querySelectorAll(":scope > .mv4-day-card"));
    const antes=existentes.find(c=>{
      const f=fechaDeCard(c); return f && fechaMs(f)<ms;
    });
    if(antes) detalle.insertBefore(card,antes); else detalle.appendChild(card);
    return card;
  }
  function elementoTotal(card){
    const h=card && card.querySelector(".mv4-day-head");
    if(!h) return null;
    return h.querySelector("span:last-child") || h.lastElementChild;
  }
  function baseDia(card){
    const el=elementoTotal(card);
    if(!el) return 0;
    if(el.dataset.mv517dF4TBasePts===undefined){
      const m=txt(el.textContent).match(/(-?\d+(?:[.,]\d+)?)\s*pts/i);
      el.dataset.mv517dF4TBasePts=String(m?numero(m[1]):0);
      el.dataset.mv517dF4TTextoBase=txt(el.textContent);
    }
    return numero(el.dataset.mv517dF4TBasePts);
  }
  function fijarTotalDia(card,extra){
    const el=elementoTotal(card);
    if(!el) return;
    const base=baseDia(card);
    const total=base+numero(extra);
    const original=el.dataset.mv517dF4TTextoBase || txt(el.textContent);
    if(/-?\d+(?:[.,]\d+)?\s*pts/i.test(original)){
      el.textContent=original.replace(/-?\d+(?:[.,]\d+)?\s*pts/i,`${total.toFixed(1)} pts`);
    }else{
      el.textContent=`${total.toFixed(1)} pts`;
    }
  }

  function integrarGarVtrPorDia(){
    if(!esTecnico()) return;
    const detalle=document.querySelector("#mv59_detalle_diario");
    const separado=detalle && detalle.querySelector("#mv517d-f4g-detalle");
    if(!detalle || !separado) return;

    const datos=[];
    separado.querySelectorAll(".mv4-day-row").forEach(function(row){
      const izq=txt(row.querySelector("span")?.textContent || row.textContent);
      const der=txt(row.querySelector("b")?.textContent || "0");
      const m=izq.match(/(\d{2}\/\d{2}\/\d{4})\s*·\s*((?:GAR|VTR)-\d+)\s*·\s*(BONO|NO BONO)/i);
      if(!m) return;
      datos.push({
        fecha:m[1],ticket:m[2].toUpperCase(),tipo:m[2].toUpperCase().startsWith("GAR-")?"GAR":"VTR",
        resultado:m[3].toUpperCase(),puntos:numero(der)
      });
    });
    if(!datos.length) return;

    /* Limpia una integracion anterior si F4G volvio a pintar la pantalla. */
    detalle.querySelectorAll(".mv517d-f4t-garvtr").forEach(x=>x.remove());
    const extraPorFecha={};
    let integrados=0;

    datos.forEach(function(r){
      let card=buscarCard(detalle,r.fecha);
      if(!card) card=crearCard(detalle,r.fecha);
      if(!card) return;

      const fila=document.createElement("div");
      fila.className="mv4-day-row mv517d-f4t-garvtr";
      fila.dataset.ticket=r.ticket;
      fila.style.cssText="border-left:3px solid #7c3aed;padding-left:9px;";
      fila.innerHTML=`<span><b style="color:#c4b5fd">${r.tipo}</b> · ${r.ticket} · ${r.resultado}</span><b>${r.puntos.toFixed(1)} pts</b>`;

      const head=card.querySelector(".mv4-day-head");
      const ultima=card.querySelector(".mv517d-f4t-garvtr:last-of-type");
      if(ultima) ultima.insertAdjacentElement("afterend",fila);
      else if(head) head.insertAdjacentElement("afterend",fila);
      else card.prepend(fila);

      if(r.resultado==="BONO") extraPorFecha[r.fecha]=(extraPorFecha[r.fecha]||0)+r.puntos;
      integrados++;
    });

    Object.keys(extraPorFecha).forEach(function(fecha){
      const card=buscarCard(detalle,fecha);
      if(card) fijarTotalDia(card,extraPorFecha[fecha]);
    });

    if(integrados===datos.length){
      separado.remove();
      detalle.dataset.mv517dF4TGarVtr="1";
    }
  }

  function programarMerge(){
    clearTimeout(timerMerge);
    timerMerge=setTimeout(integrarGarVtrPorDia,30);
  }

  if(document.body){
    const obs=new MutationObserver(function(){
      if(!esTecnico()) return;
      if(document.querySelector("#mv517d-f4g-detalle")) programarMerge();
      if(!precargaIniciada && usuario()) setTimeout(precargarMiDesempeno,60);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;
    const card=ev.target && ev.target.closest ? ev.target.closest("#cardMiDesempeno") : null;
    if(card) precargarMiDesempeno();
    setTimeout(programarMerge,120);
  },true);

  /* Espera el login sin afectar el tiempo de autenticacion. */
  let intentos=0;
  const espera=setInterval(function(){
    intentos++;
    if(esTecnico() && usuario()){
      clearInterval(espera);
      setTimeout(precargarMiDesempeno,80);
    }else if(intentos>60){
      clearInterval(espera);
    }
  },250);

  [200,600,1200,2500].forEach(ms=>setTimeout(function(){
    if(esTecnico()){
      instalarResumenRapido();
      programarMerge();
    }
  },ms));

  window.mv517dF4TIntegrarGarVtrPorDia=integrarGarVtrPorDia;
  window.mv517dF4TPrecargarMiDesempeno=precargarMiDesempeno;
  console.log("MI VISUAL V517D F4T: Mi Desempeno tecnico precargado y GAR/VTR integrado por dia.");
})();
