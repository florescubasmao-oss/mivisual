/* ============================================================
   MI VISUAL V517D F4G - REGLA VISUAL GAR/VTR + PUNTAJE ACTIVO
   29/08/2026

   Regla visible:
   - NO ES GAR/VTR -> Produccion normal (partida/puntos WIN).
   - SI ES GAR/VTR -> no entra como Produccion normal.
   - SI ES GAR/VTR + BONO -> suma puntaje VTR/GAR validado.
   - SI ES GAR/VTR + NO BONO -> 0 puntos.

   Implementacion incremental:
   - No modifica PRODUCCION_APP.
   - No modifica Ranking/Efectividad/Recableado.
   - No reemplaza los modulos historicos: los envuelve al cargarse.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4G_FRONT_OK) return;
  window.MV517D_F4G_FRONT_OK = true;

  const VERSION = "V517D-F4G-FRONT-GARVTR-PUNTOS-20260829";
  const API = window.MI_VISUAL_API_URL ||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const CACHE_MS = 60000;
  const cachePuntos = new Map();
  let tokenProduccion = 0;

  const txt = v => String(v == null ? "" : v).trim();
  const norm = v => txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc = v => txt(v).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const usuario = () => txt(localStorage.getItem("usuario") || localStorage.getItem("correo") || "");
  const cuadrilla = () => txt(localStorage.getItem("cuadrilla") || "");

  function periodoActual(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function periodoValido(v){
    const p=txt(v);
    return /^\d{4}-\d{2}$/.test(p) ? p : periodoActual();
  }
  function fechaVisible(v){
    const s=txt(v);
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  }
  function numero(v){
    const n=Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function red1(v){ return numero(v).toFixed(1); }

  async function leerJson(res){
    const t=(await res.text()).trim();
    if(!t || /^MI VISUAL API OK$/i.test(t) || /^<!doctype|^<html/i.test(t)){
      throw new Error("Backend F4G todavía no disponible");
    }
    let j;
    try{ j=JSON.parse(t); }catch(_){ throw new Error("Respuesta F4G no válida"); }
    if(!j || !j.ok) throw new Error(j&&j.error || "No se pudo consultar puntaje GAR/VTR");
    return j;
  }

  async function obtenerPuntos(periodos, cuad, forzar){
    const lista=(Array.isArray(periodos)?periodos:[periodos])
      .map(periodoValido).filter((p,i,a)=>a.indexOf(p)===i).slice(0,3);
    const key=[usuario(),lista.join(","),txt(cuad)].join("|");
    const c=cachePuntos.get(key);
    if(!forzar && c && Date.now()-c.ts<CACHE_MS) return c.data;

    const u=new URL(API);
    u.searchParams.set("accion","listarPuntajeVtrGarActivoV517D");
    u.searchParams.set("usuario",usuario());
    if(lista.length===1) u.searchParams.set("periodo",lista[0]);
    else u.searchParams.set("periodos",lista.join(","));
    if(txt(cuad)) u.searchParams.set("cuadrilla",txt(cuad));
    u.searchParams.set("_f4g",String(Date.now()));

    const r=await fetch(u.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}
    });
    const data=await leerJson(r);
    cachePuntos.set(key,{ts:Date.now(),data});
    return data;
  }

  /* ==========================================================
     1) GAR/VTR: etiquetas claras + BONO condicionado a SI ES
  ========================================================== */
  function ticketModal(modal){
    const m=txt(modal&&modal.querySelector("h3")?.textContent).match(/(?:VTR|GAR)-\d+/i);
    return m ? m[0].toUpperCase() : "";
  }
  function casoActual(ticket){
    const d=window.MV517C5_DATA || {};
    return (d.incidencias || []).find(x=>norm(x.ticket)===norm(ticket)) || null;
  }
  function estadoCaso(ticket,modal){
    const x=casoActual(ticket);
    if(x) return norm(x.estadoResponsabilidad || x.estadoDecision || "PENDIENTE");
    const t=norm(modal?.querySelector(".mv517c16-current")?.textContent || "");
    if(t.includes("NO CORRESPONDE") || t.includes("NO ES GAR/VTR")) return "NO_ES_GAR_VTR";
    if(t.includes("OTRA CUADRILLA") || t.includes("REASIGNADA")) return "REASIGNADO";
    if(t.includes("CUADRILLA EJECUTORA") || t.includes("PROPIA")) return "CONFIRMADO";
    return "PENDIENTE";
  }
  function esSiGar(estado){
    const e=norm(estado);
    return e==="CONFIRMADO" || e==="REASIGNADO";
  }
  function estadoPorDecision(valor,actual){
    const d=norm(valor);
    if(d==="CORRESPONDE") return "CONFIRMADO";
    if(d==="REASIGNAR") return "REASIGNADO";
    if(d==="NO_ES_GAR_VTR") return "NO_ES_GAR_VTR";
    if(d==="ANULAR") return "ANULADO";
    return actual || "PENDIENTE";
  }
  function etiquetarDecision(select){
    if(!select) return;
    const nombres={
      SIN_CAMBIO:"Sin cambios",
      CORRESPONDE:"SÍ ES GAR/VTR — Responsable: cuadrilla ejecutora",
      REASIGNAR:"SÍ ES GAR/VTR — Responsable: otra cuadrilla",
      NO_ES_GAR_VTR:"NO ES GAR/VTR — Contar en Producción normal",
      ANULAR:"Anular caso"
    };
    Array.from(select.options||[]).forEach(op=>{
      if(nombres[op.value]) op.textContent=nombres[op.value];
    });
  }
  function etiquetarBono(select){
    if(!select) return;
    Array.from(select.options||[]).forEach(op=>{
      const v=norm(op.value);
      if(v==="BONO") op.textContent="BONO — Sí suma puntos VTR/GAR";
      if(v==="NO BONO" || v==="NO_BONO") op.textContent="NO BONO — 0 puntos";
      if(v==="OBSERVADO") op.textContent="OBSERVADO — pendiente de corrección";
    });
  }
  function ponerNota(modal,estado,ancla){
    let n=modal.querySelector("#mv517d-f4g-regla");
    if(!n){
      n=document.createElement("div");
      n.id="mv517d-f4g-regla";
      n.style.cssText="margin:7px 0;padding:8px 10px;border-radius:9px;background:#e8f1fb;color:#173b67;font-size:9px;line-height:1.4;font-weight:700";
      if(ancla) ancla.insertAdjacentElement("afterend",n); else modal.insertBefore(n,modal.firstChild?.nextSibling||null);
    }
    const e=norm(estado);
    if(esSiGar(e)){
      n.innerHTML="<b>SÍ ES GAR/VTR:</b> no entra como Producción normal. Se habilita <b>BONO / NO BONO</b>. BONO suma el puntaje VTR/GAR validado; NO BONO suma 0.";
    }else if(e==="NO_ES_GAR_VTR"){
      n.innerHTML="<b>NO ES GAR/VTR:</b> se contabiliza como Producción normal con la partida y puntos WIN. <b>BONO / NO BONO no aplica.</b>";
    }else if(e==="ANULADO"){
      n.innerHTML="<b>ANULADO:</b> BONO / NO BONO no aplica.";
    }else{
      n.innerHTML="Primero define si <b>SÍ ES GAR/VTR</b> o <b>NO ES GAR/VTR</b>. El filtro BONO / NO BONO solo se habilita cuando SÍ corresponde a GAR/VTR.";
    }
  }
  function visible(el,si){
    if(!el) return;
    if(si){
      if(el.dataset.mv517dDisplay!==undefined){
        el.style.display=el.dataset.mv517dDisplay;
        delete el.dataset.mv517dDisplay;
      }else if(el.style.display==="none") el.style.display="";
    }else{
      if(el.dataset.mv517dDisplay===undefined) el.dataset.mv517dDisplay=el.style.display||"";
      el.style.display="none";
    }
  }
  function syncGestion(modal){
    const dec=modal.querySelector("#mv517c1Decision");
    if(!dec) return false;
    etiquetarDecision(dec);
    const ticket=ticketModal(modal);
    const actual=estadoCaso(ticket,modal);
    const efectivo=estadoPorDecision(dec.value,actual);
    const habilitado=esSiGar(efectivo);

    const bono=modal.querySelector("#mv517c1Bono");
    etiquetarBono(bono);
    const secBono=bono?.closest(".mv517c1-section");
    if(!habilitado && bono) bono.value="SIN_CAMBIO";
    visible(secBono,habilitado);

    const ex=modal.querySelector("#mv517c5Excepcion");
    const exSel=ex?.querySelector("#mv517c5Resultado");
    etiquetarBono(exSel);
    if(!habilitado && exSel) exSel.value="";
    visible(ex,habilitado);

    const cuad=modal.querySelector("#mv517c1CuadW");
    if(cuad) cuad.style.display=dec.value==="REASIGNAR"?"block":"none";

    const noGar=modal.querySelector("#mv517c1NoGar");
    if(noGar) noGar.textContent="NO ES GAR/VTR: el trabajo vuelve a Producción normal con sus puntos WIN.";
    ponerNota(modal,efectivo,dec.closest(".mv517c1-section"));
    return true;
  }
  function syncCorreccion(modal){
    const dec=modal.querySelector("#mv16Resp");
    if(!dec) return false;
    etiquetarDecision(dec);
    const ticket=ticketModal(modal);
    const actual=estadoCaso(ticket,modal);
    const efectivo=estadoPorDecision(dec.value,actual);
    const habilitado=esSiGar(efectivo);

    const reg=modal.querySelector("#mv16Reg");
    etiquetarBono(reg);
    const sec=reg?.closest(".mv517c16-section");
    if(!habilitado && reg) reg.value="SIN_CAMBIO";
    visible(sec,habilitado);

    const cuad=modal.querySelector("#mv16CuadW");
    if(cuad) cuad.style.display=dec.value==="REASIGNAR"?"block":"none";
    const pts=modal.querySelector("#mv16PtsW");
    if(pts) pts.style.display=habilitado && reg?.value==="BONO"?"block":"none";

    ponerNota(modal,efectivo,dec.closest(".mv517c16-section"));
    return true;
  }
  function aplicarModales(){
    Array.from(document.querySelectorAll(".mv517c1-modal")).forEach(modal=>{
      syncGestion(modal);
      syncCorreccion(modal);
    });
  }
  function programarModales(){
    [0,30,90,220].forEach(ms=>setTimeout(aplicarModales,ms));
  }

  document.addEventListener("click",ev=>{
    const b=ev.target?.closest?.("button");
    if(!b) return;
    const t=norm(b.textContent);
    if(t.includes("GESTIONAR CASO") || t.includes("CORREGIR VALIDACION")) programarModales();
    if(t.includes("BONOS")) setTimeout(decorarBonosPantalla,900);
  },false);

  document.addEventListener("change",ev=>{
    const id=ev.target?.id || "";
    if(["mv517c1Decision","mv517c1Bono","mv517c5Resultado","mv16Resp","mv16Reg"].includes(id)){
      const modal=ev.target.closest(".mv517c1-modal");
      if(modal){ syncGestion(modal); syncCorreccion(modal); }
    }
    if(id && id.toLowerCase().includes("periodo")) setTimeout(decorarBonosPantalla,80);
  },false);

  /* ==========================================================
     2) PRODUCCION: total normal + puntaje BONO GAR/VTR activo
  ========================================================== */
  function decorarDetalleV515(api){
    const sec=document.getElementById("mv515VtrGarDesempeno");
    if(!sec) return false;
    const activos={};
    (api.registros||[]).forEach(r=>{activos[norm(r.ticket)] = r;});

    const p=sec.querySelector(".mv515-vtr-head p");
    if(p) p.textContent="Histórico VTR/GAR. Solo SÍ ES GAR/VTR + BONO suma al puntaje total. NO BONO suma 0. Si se corrige a NO ES GAR/VTR, el bono histórico queda inactivo y el trabajo cuenta por Producción normal.";
    const tot=sec.querySelector(".mv515-vtr-total");
    if(tot) tot.textContent=`Puntaje VTR/GAR ACTIVO: ${red1(api.totalPuntosVtrGar)} pts`;

    sec.querySelectorAll(".mv515-vtr-item").forEach(item=>{
      const m=txt(item.textContent).match(/(?:VTR|GAR)-\d+/i);
      if(!m) return;
      const ticket=norm(m[0]);
      const r=activos[ticket];
      const badge=item.querySelector(".mv515-vtr-badge");
      const score=item.querySelector(".mv515-vtr-score");
      item.querySelector(".mv517d-inactivo")?.remove();
      if(r){
        item.style.opacity="";
        if(score) score.textContent=norm(r.resultado)==="BONO"?red1(r.puntajeVtrGar):"0";
      }else if(badge && ["BONO","NO BONO"].includes(norm(badge.textContent))){
        item.style.opacity=".72";
        if(score){
          if(!score.dataset.mv517dHistorico) score.dataset.mv517dHistorico=txt(score.textContent);
          score.textContent=`0 activo · histórico ${score.dataset.mv517dHistorico}`;
        }
        const s=document.createElement("span");
        s.className="mv515-vtr-badge mv517d-inactivo";
        s.style.cssText="background:#e2e8f0;color:#475569;margin-left:6px";
        s.textContent="INACTIVO POR CLASIFICACIÓN";
        badge.insertAdjacentElement("afterend",s);
      }
    });
    return true;
  }

  function decorarProduccion(data,api,token){
    if(token!==tokenProduccion) return;
    const page=document.querySelector(".mv59-produccion-page");
    if(!page) return;

    const normal=numero(data?.resumen?.totalPuntos);
    const vtr=numero(api?.totalPuntosVtrGar);
    const total=normal+vtr;
    const hero=page.querySelector(".mv59-prod-hero");
    if(hero){
      const value=hero.querySelector(".mv4-hero-value");
      if(value) value.textContent=red1(total);
      let meta=hero.querySelector("#mv517d-f4g-puntos-meta");
      if(!meta){
        meta=document.createElement("div");
        meta.id="mv517d-f4g-puntos-meta";
        meta.className="mv4-hero-meta";
        const prog=hero.querySelector(".mv59-prod-progress");
        if(prog) prog.insertAdjacentElement("beforebegin",meta); else hero.appendChild(meta);
      }
      meta.innerHTML=`📡 Producción normal: <b>${red1(normal)}</b> pts · BONO GAR/VTR: <b>+${red1(vtr)}</b> pts`;
      const avance=Math.min(100,Math.max(0,Math.round(total/130*100)));
      const barra=hero.querySelector(".mv59-prod-progress span");
      if(barra) barra.style.width=`${avance}%`;
      const pct=hero.querySelector(".mv59-prod-percent");
      if(pct) pct.textContent=`${avance}% de avance`;

      const cumplimiento=hero.nextElementSibling;
      if(cumplimiento && typeof window.mv353TarjetaTecnico==="function"){
        const box=document.createElement("div");
        box.innerHTML=window.mv353TarjetaTecnico(data?.cumplimientoDia,total);
        const nuevo=box.firstElementChild;
        if(nuevo) cumplimiento.replaceWith(nuevo);
      }
    }

    const detalle=page.querySelector("#mv59_detalle_diario");
    if(detalle){
      detalle.querySelector("#mv517d-f4g-detalle")?.remove();
      const regs=(api.registros||[]).filter(r=>norm(r.resultado)==="BONO" || norm(r.resultado)==="NO BONO");
      if(regs.length){
        const bloque=document.createElement("div");
        bloque.id="mv517d-f4g-detalle";
        bloque.innerHTML=`<div class="mv4-day-card" style="border-left:4px solid #7c3aed;">
          <div class="mv4-day-head"><b>📡 BONO GAR/VTR validado</b><span>+${red1(vtr)} pts activos</span></div>
          ${regs.map(r=>`<div class="mv4-day-row"><span>${esc(fechaVisible(r.fecha))} · ${esc(r.ticket)} · ${esc(r.resultado)}</span><b>${red1(r.puntajeVtrGar)} pts</b></div>`).join("")}
        </div>`;
        detalle.insertAdjacentElement("afterbegin",bloque);
      }
    }

    [120,500,1200,2200].forEach(ms=>setTimeout(()=>decorarDetalleV515(api),ms));
  }

  function instalarRenderProduccion(){
    const actual=window.renderDashboardProduccion;
    if(typeof actual!=="function") return false;
    if(actual.__mv517dF4G) return true;
    const base=actual;
    const envuelta=function(data){
      const token=++tokenProduccion;
      const r=base.apply(this,arguments);
      const periodo=periodoValido(data?.periodo || document.getElementById("mv276ProduccionPeriodo")?.value);
      obtenerPuntos([periodo],cuadrilla(),false)
        .then(api=>decorarProduccion(data,api,token))
        .catch(e=>console.warn("V517D F4G Producción:",e.message||e));
      return r;
    };
    envuelta.__mv517dF4G=true;
    envuelta.__mv517dF4GBase=base;
    window.renderDashboardProduccion=envuelta;
    try{ renderDashboardProduccion=envuelta; }catch(_){}
    return true;
  }

  /* ==========================================================
     3) BONOS: sumar puntaje GAR/VTR activo al dia, sin crear ordenes
  ========================================================== */
  function mesesBonos(datos){
    const s=new Set([periodoActual()]);
    try{
      (datos?.listaPeriodos||[]).forEach(p=>{
        Object.values(p.cuadrillas||{}).forEach(item=>{
          Object.values(item.dias||{}).forEach(dia=>{
            const f=dia.fecha instanceof Date ? dia.fecha : (typeof mb242ParseFecha==="function"?mb242ParseFecha(dia.fecha):null);
            if(f instanceof Date && !isNaN(f)) s.add(`${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}`);
          });
        });
      });
    }catch(_){}
    return Array.from(s).sort().reverse().slice(0,3);
  }

  async function integrarBonos(datos){
    if(!datos || datos.__mv517dF4GIntegrado) return datos;
    try{
      if(typeof mb242ParseFecha!=="function" || typeof mb242InicioSemana!=="function" ||
         typeof mb242ClaveFecha!=="function" || typeof mb242AsegurarCuadrilla!=="function" ||
         typeof mb283AsegurarDia!=="function" || typeof mb242CerrarResumenCuadrilla!=="function" ||
         typeof mb242CrearPeriodo!=="function") return datos;

      const api=await obtenerPuntos(mesesBonos(datos),"",true);
      const afectados=new Set();
      (api.registros||[]).forEach(r=>{
        const puntos=norm(r.resultado)==="BONO" ? numero(r.puntajeVtrGar) : 0;
        if(puntos<=0) return;
        const fecha=mb242ParseFecha(r.fecha);
        const cuad=typeof mb242Cuadrilla==="function"?mb242Cuadrilla(r.cuadrillaPuntaje):norm(r.cuadrillaPuntaje);
        if(!fecha || !cuad) return;
        if(typeof mb242EsCuadrillaPDG==="function" && mb242EsCuadrillaPDG(cuad)) return;

        const inicio=mb242InicioSemana(fecha);
        const clave=mb242ClaveFecha(inicio);
        if(!datos.periodos[clave]) datos.periodos[clave]=mb242CrearPeriodo(inicio);
        const meta=datos.metaCuadrillas?.[cuad] || {sede:r.sedePuntaje||"SIN SEDE",plataforma:""};
        const item=mb242AsegurarCuadrilla(datos.periodos[clave],cuad,meta);
        const dia=mb283AsegurarDia(item,fecha);
        dia.puntosVtrGar=numero(dia.puntosVtrGar)+puntos;
        dia.puntos=numero(dia.puntos)+puntos;
        dia.vtrGar=Array.isArray(dia.vtrGar)?dia.vtrGar:[];
        dia.vtrGar.push({ticket:r.ticket,resultado:r.resultado,puntos,fuente:r.fuente});
        afectados.add(clave+"|"+cuad);
      });

      afectados.forEach(k=>{
        const pos=k.indexOf("|");
        const clave=k.slice(0,pos),cuad=k.slice(pos+1);
        const p=datos.periodos[clave],item=p?.cuadrillas?.[cuad];
        if(item) mb242CerrarResumenCuadrilla(item);
        if(p && typeof mb242EstadoPeriodo==="function") p.estado=mb242EstadoPeriodo(p,new Date());
      });
      datos.listaPeriodos=Object.values(datos.periodos||{}).sort((a,b)=>b.inicio-a.inicio);
      datos.puntosVtrGarActivos=numero(api.totalPuntosVtrGar);
      datos.versionV517D4G=VERSION;
      datos.__mv517dF4GIntegrado=true;
    }catch(e){
      console.warn("V517D F4G Bonos:",e.message||e);
      datos.__mv517dF4GError=txt(e.message||e);
    }
    return datos;
  }

  function instalarCargarBonos(){
    const actual=window.mb242CargarDatos;
    if(typeof actual!=="function") return false;
    if(actual.__mv517dF4G) return true;
    const base=actual;
    const envuelta=async function(){
      const datos=await base.apply(this,arguments);
      return await integrarBonos(datos);
    };
    envuelta.__mv517dF4G=true;
    envuelta.__mv517dF4GBase=base;
    window.mb242CargarDatos=envuelta;
    try{ mb242CargarDatos=envuelta; }catch(_){}
    return true;
  }

  function decorarBonosPantalla(){
    const pagina=document.querySelector(".mb242-pagina");
    if(!pagina) return;
    let nota=pagina.querySelector("#mv517d-f4g-bonos-nota");
    if(!nota){
      nota=document.createElement("div");
      nota.id="mv517d-f4g-bonos-nota";
      nota.className="mb242-nota";
      nota.style.marginTop="8px";
      pagina.appendChild(nota);
    }
    nota.innerHTML="<b>Regla GAR/VTR:</b> SÍ ES GAR/VTR + BONO suma sus puntos validados al cálculo diario del bono. NO BONO suma 0. NO ES GAR/VTR no suma por esta vía porque se contabiliza como Producción normal.";
  }

  function instalar(){
    instalarRenderProduccion();
    instalarCargarBonos();
    aplicarModales();
  }

  document.addEventListener("click",()=>setTimeout(instalar,60),true);
  setInterval(instalar,1200);
  setTimeout(instalar,100);
  setTimeout(instalar,600);
  console.log("MI VISUAL "+VERSION+" activo.");
})();