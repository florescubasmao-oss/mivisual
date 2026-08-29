/* ============================================================
   MI VISUAL V517D F4H - BONO/NO BONO EN CORRECCION GAR/VTR
   29/08/2026

   Objetivo:
   - Si NO ES GAR/VTR: Produccion normal; Bono/No Bono no aplica.
   - Si SI ES GAR/VTR: habilitar Bono/No Bono inmediatamente.
   - Funciona tambien cuando NO existe registro tecnico.
   - Reutiliza backend existente; no modifica PRODUCCION_APP.
   - En una correccion NO_ES -> SI_ES, guarda primero clasificacion
     y luego la evaluacion Bono/No Bono sin crear registro ficticio.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4H_BONO_CORRECCION_OK) return;
  window.MV517D_F4H_BONO_CORRECCION_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");

  async function post(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload||{})});
    const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del backend.");}
    if(!j||!j.ok) throw new Error(j&&j.error||"No se pudo completar la operación.");
    return j;
  }

  function ticketModal(modal){
    const m=txt(modal&&modal.querySelector("h3")?.textContent).match(/(?:VTR|GAR)-\d+/i);
    return m?m[0].toUpperCase():"";
  }

  function snapshot(){
    if(window.MV517C5_DATA&&window.MV517C5_DATA.ok) return window.MV517C5_DATA;
    try{
      let best=null;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(!k||!k.startsWith("MV517C7|LISTA|")) continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");
        if(o&&o.data&&o.data.ok&&(!best||Number(o.ts||0)>Number(best.ts||0))) best=o;
      }
      return best&&best.data||null;
    }catch(_){return null;}
  }

  function caso(ticket){
    const d=snapshot()||{};
    return (d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;
  }

  function periodo(modal){
    const d=snapshot()||{};
    return txt(document.getElementById("mv517c1Periodo")?.value||d.periodo||"");
  }

  function estadoActual(ticket,modal){
    const x=caso(ticket);
    if(x) return norm(x.estadoResponsabilidad||x.estadoDecision||"PENDIENTE");
    const t=norm(modal?.querySelector(".mv517c16-current")?.textContent||"");
    if(t.includes("NO CORRESPONDE")||t.includes("NO ES GAR/VTR")) return "NO_ES_GAR_VTR";
    if(t.includes("OTRA CUADRILLA")||t.includes("REASIGNADA")) return "REASIGNADO";
    if(t.includes("CUADRILLA EJECUTORA")||t.includes("PROPIA")) return "CONFIRMADO";
    return "PENDIENTE";
  }

  function estadoPorDecision(valor,actual){
    const d=norm(valor);
    if(d==="CORRESPONDE") return "CONFIRMADO";
    if(d==="REASIGNAR") return "REASIGNADO";
    if(d==="NO_ES_GAR_VTR") return "NO_ES_GAR_VTR";
    if(d==="ANULAR") return "ANULADO";
    return actual||"PENDIENTE";
  }

  function esSiGar(v){
    const e=norm(v);
    return e==="CONFIRMADO"||e==="REASIGNADO";
  }

  function tieneRegistro(ticket){
    const x=caso(ticket);
    return !!txt(x&&x.validacionId);
  }

  function resultadoActual(ticket){
    const x=caso(ticket);
    if(!x) return "";
    const r=norm(x.bono||x.estadoRegistroTecnico||"");
    if(r==="BONO") return "BONO";
    if(r==="NO BONO"||r==="NO_BONO") return "NO BONO";
    return "";
  }

  function crearSeccion(modal,ticket){
    let sec=modal.querySelector("#mv517dF4HSinRegistro");
    if(sec) return sec;
    sec=document.createElement("div");
    sec.id="mv517dF4HSinRegistro";
    sec.className=modal.querySelector("#mv16Resp")?"mv517c16-section reg":"mv517c1-section";
    sec.style.background="#e7f2ff";
    const actual=resultadoActual(ticket);
    sec.innerHTML=`
      <h4>2. Resultado GAR/VTR · BONO / NO BONO</h4>
      <div class="mv517c1-note"><b>Regla:</b> al quedar <b>SÍ ES GAR/VTR</b>, este trabajo no cuenta como Producción normal. <b>BONO</b> suma el puntaje VTR/GAR definido; <b>NO BONO</b> suma 0 puntos.</div>
      <label>Resultado</label>
      <select id="mv517dF4HResultado">
        <option value="">Seleccione BONO o NO BONO...</option>
        <option value="BONO" ${actual==="BONO"?"selected":""}>BONO — Sí suma puntos VTR/GAR</option>
        <option value="NO BONO" ${actual==="NO BONO"?"selected":""}>NO BONO — 0 puntos</option>
      </select>
      <div id="mv517dF4HPuntosW" style="display:${actual==="BONO"?"block":"none"}">
        <label>Puntaje VTR/GAR</label>
        <input id="mv517dF4HPuntos" type="number" min="0" step="0.1" value="${actual==="BONO"&&caso(ticket)?.puntajeVtrGar!=null?esc(caso(ticket).puntajeVtrGar):""}">
      </div>
      <label>Sustento BONO / NO BONO</label>
      <textarea id="mv517dF4HComentario" placeholder="Indique el motivo de la evaluación"></textarea>`;

    const ancla=modal.querySelector("#mv16Resp")
      ? modal.querySelector("#mv16Resp")?.closest(".mv517c16-section")
      : modal.querySelector("#mv517c1Decision")?.closest(".mv517c1-section");
    if(ancla) ancla.insertAdjacentElement("afterend",sec);
    else modal.querySelector(".mv517c1-footer")?.insertAdjacentElement("beforebegin",sec);

    sec.querySelector("#mv517dF4HResultado")?.addEventListener("change",function(){
      const w=sec.querySelector("#mv517dF4HPuntosW");
      if(w) w.style.display=this.value==="BONO"?"block":"none";
    });
    return sec;
  }

  function sincronizar(modal){
    if(!modal) return;
    const dec=modal.querySelector("#mv16Resp")||modal.querySelector("#mv517c1Decision");
    if(!dec) return;
    const ticket=ticketModal(modal);
    if(!ticket||tieneRegistro(ticket)){
      modal.querySelector("#mv517dF4HSinRegistro")?.remove();
      return;
    }
    const efectivo=estadoPorDecision(dec.value,estadoActual(ticket,modal));
    let sec=modal.querySelector("#mv517dF4HSinRegistro");
    if(esSiGar(efectivo)){
      sec=sec||crearSeccion(modal,ticket);
      if(sec) sec.style.display="block";
    }else if(sec){
      sec.style.display="none";
      const s=sec.querySelector("#mv517dF4HResultado");if(s)s.value="";
      const p=sec.querySelector("#mv517dF4HPuntos");if(p)p.value="";
    }
  }

  function programar(modal){
    [0,30,90,180].forEach(ms=>setTimeout(()=>sincronizar(modal),ms));
  }

  function limpiarCaches(){
    try{Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));}catch(_){}
    try{Object.keys(localStorage).filter(k=>k.startsWith("MV517C7|LISTA|")||k.startsWith("MV517C6|LISTA|")).forEach(k=>localStorage.removeItem(k));}catch(_){}
  }

  async function guardarSinRegistro(modal,btn,ev){
    const ticket=ticketModal(modal);
    if(!ticket||tieneRegistro(ticket)) return false;
    const dec=modal.querySelector("#mv16Resp")||modal.querySelector("#mv517c1Decision");
    if(!dec) return false;
    const efectivo=estadoPorDecision(dec.value,estadoActual(ticket,modal));
    const sec=modal.querySelector("#mv517dF4HSinRegistro");
    if(!sec||sec.style.display==="none"||!esSiGar(efectivo)) return false;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    const decision=dec.value||"SIN_CAMBIO";
    const resultado=txt(sec.querySelector("#mv517dF4HResultado")?.value);
    const comentarioBono=txt(sec.querySelector("#mv517dF4HComentario")?.value);
    const cuad=txt(modal.querySelector("#mv16Cuad")?.value||modal.querySelector("#mv517c1Cuad")?.value);
    const sustentoClas=txt(modal.querySelector("#mv16Sus")?.value||modal.querySelector("#mv517c1ComClas")?.value)||comentarioBono;
    const p=periodo(modal);
    let puntos=0;

    if(decision==="REASIGNAR"&&!cuad){alert("Seleccione la cuadrilla responsable.");return true;}
    if(!resultado){alert("Si el caso SÍ ES GAR/VTR, debe seleccionar BONO o NO BONO.");return true;}
    if(!comentarioBono){alert("Ingrese el sustento de BONO / NO BONO.");return true;}
    if(resultado==="BONO"){
      puntos=Number(sec.querySelector("#mv517dF4HPuntos")?.value);
      if(!Number.isFinite(puntos)||puntos<=0){alert("Ingrese un puntaje VTR/GAR mayor a 0 para BONO.");return true;}
    }
    if(!p){alert("No se pudo identificar el período del caso.");return true;}

    const textoAnterior=btn.textContent;
    btn.disabled=true;btn.textContent="Guardando GAR/VTR...";
    try{
      if(decision!=="SIN_CAMBIO"){
        if(modal.querySelector("#mv16Resp")){
          await post({
            accion:"corregirValidacionVtrGarV517C13",usuario:usuario(),periodo:p,ticket:ticket,
            validacionId:"",decisionResponsabilidad:decision,cuadrillaResponsable:cuad,
            resultadoRegistro:"SIN_CAMBIO",puntajeVtrGar:0,sustento:sustentoClas
          });
        }else{
          const payload={
            accion:"clasificarVtrGarV517A",usuario:usuario(),periodo:p,ticket:ticket,
            decision:decision,observacion:sustentoClas
          };
          if(cuad) payload.cuadrillaResponsable=cuad;
          await post(payload);
        }
      }

      await post({
        accion:"validarBonoExcepcionalVtrGarV517C5",usuario:usuario(),periodo:p,ticket:ticket,
        resultado:resultado,puntajeVtrGar:resultado==="BONO"?puntos:0,motivo:comentarioBono
      });

      limpiarCaches();
      modal.closest(".mv517c1-modalbg")?.remove();
      alert(resultado==="BONO"
        ? `Corrección guardada: SÍ ES GAR/VTR + BONO (${puntos} pts VTR/GAR).`
        : "Corrección guardada: SÍ ES GAR/VTR + NO BONO (0 puntos)."
      );
      if(typeof window.mv517c1CambiarPeriodo==="function"){
        await window.mv517c1CambiarPeriodo(p);
      }
    }catch(e){
      alert(e&&e.message?e.message:String(e));
      btn.disabled=false;btn.textContent=textoAnterior;
    }
    return true;
  }

  document.addEventListener("click",function(ev){
    const abrir=ev.target?.closest?.("button");
    if(abrir){
      const t=norm(abrir.textContent);
      if(t.includes("CORREGIR VALIDACION")||t.includes("GESTIONAR CASO")){
        setTimeout(()=>{
          const modales=Array.from(document.querySelectorAll(".mv517c1-modal"));
          if(modales.length) programar(modales[modales.length-1]);
        },20);
      }
    }
  },false);

  document.addEventListener("change",function(ev){
    if(["mv16Resp","mv517c1Decision"].includes(ev.target?.id||"")){
      const modal=ev.target.closest(".mv517c1-modal");
      if(modal) sincronizar(modal);
    }
  },false);

  document.addEventListener("click",function(ev){
    const btn=ev.target?.closest?.("#mv16Guardar,#mv517c1Guardar");
    if(!btn) return;
    const modal=btn.closest(".mv517c1-modal");
    if(!modal) return;
    guardarSinRegistro(modal,btn,ev).catch(e=>{
      console.error("V517D F4H",e);
      try{btn.disabled=false;}catch(_){}
    });
  },true);

  console.log("MI VISUAL V517D F4H: Bono/No Bono habilitado al corregir a SÍ ES GAR/VTR sin registro técnico.");
})();