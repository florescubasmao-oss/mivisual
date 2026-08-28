/* ============================================================
   MI VISUAL V517C.15 - CORRECCION GAR/VTR BASADA EN DOM
   - No modifica la vista compacta actual.
   - El boton se inyecta leyendo la tarjeta visible, sin depender de snapshots.
   - Solo JEFZNORTE.
   - El caso se consulta bajo demanda solo al pulsar Corregir validacion.
   - Usa backend V517C.13 para conservar trazabilidad.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C15_CORRECCION_DOM_OK) return;
  window.MV517C15_CORRECCION_DOM_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR="JEFZNORTE";
  let timer=null;
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const esValidador=()=>norm(usuario())===VALIDADOR;

  function css(){
    if(document.getElementById("mv517c15-css"))return;
    const s=document.createElement("style");
    s.id="mv517c15-css";
    s.textContent=`
      .mv517c15-btn{background:#7c3aed!important;color:#fff!important}
      .mv517c15-current{background:#f4efff;border-radius:9px;padding:7px 9px;margin:6px 0;font-size:9px;line-height:1.4;color:#4c1d95}
      .mv517c15-sec{border-radius:10px;padding:8px;margin-top:7px;background:#e7f4ec}
      .mv517c15-sec.reg{background:#e7f2ff}
      .mv517c15-warn{background:#fff3d6;border:1px solid #f0bd4d;color:#713f12;border-radius:9px;padding:7px 9px;font-size:8.5px;line-height:1.35;margin:6px 0}
      .mv517c15-toast{position:fixed;right:16px;bottom:54px;z-index:22000;max-width:390px;padding:10px 12px;border-radius:10px;background:#dcfce7;color:#166534;font:800 10px Arial;box-shadow:0 8px 24px rgba(0,0,0,.22)}
    `;
    document.head.appendChild(s);
  }

  function tarjetaResuelta(card){
    const n=norm(card&&card.textContent);
    const bonoCerrado=(n.includes("NO BONO")||n.includes("OBSERVADO")||(n.includes("BONO")&&!n.includes("BONO PENDIENTE")&&!n.includes("BONO POR VALIDAR")));
    const respCerrada=n.includes("RESPONSABLE CONFIRMADO")||n.includes("RESPONSABLE REASIGNADO")||n.includes("RESP. CONFIRMADA")||n.includes("RESP. REASIGNADA")||n.includes("NO ES GAR/VTR")||n.includes("NO CORRESPONDE A GAR/VTR")||n.includes("ANULADO");
    return bonoCerrado||respCerrada;
  }

  function periodoActual(){
    return txt(document.getElementById("mv517c1Periodo")?.value||"");
  }

  function caso(ticket,d){
    return (d&&d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;
  }

  function snapshot(){
    if(window.MV517C5_DATA&&window.MV517C5_DATA.ok)return window.MV517C5_DATA;
    try{
      let best=null;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k||!k.startsWith("MV517C7|LISTA|"))continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");
        if(o&&o.data&&o.data.ok&&(!best||Number(o.ts||0)>Number(best.ts||0)))best=o;
      }
      return best&&best.data||null;
    }catch(_){return null;}
  }

  async function apiPost(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload||{})});
    const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del backend.");}
    if(!j||!j.ok)throw new Error(j&&j.error||"No se pudo completar la operación.");
    return j;
  }

  async function obtenerCaso(ticket){
    let d=snapshot(),x=caso(ticket,d);
    const p=periodoActual()||txt(d&&d.periodo);
    if(x&&d&&(!p||txt(d.periodo)===p))return {d,x};
    d=await apiPost({accion:"listarVtrGarV517A",usuario:usuario(),periodo:p});
    x=caso(ticket,d);
    if(!x)throw new Error("No se encontró el ticket en la consolidación GAR/VTR.");
    return {d,x};
  }

  function estadoBono(x){
    const b=norm(x&&x.bono||x&&x.estadoRegistroTecnico||"");
    if(b==="NO_BONO"||b==="NO BONO")return "NO BONO";
    if(b==="BONO")return "BONO";
    if(b==="OBSERVADO")return "OBSERVADO";
    return "PENDIENTE";
  }
  function estadoResp(x){
    const e=norm(x&&x.estadoResponsabilidad||x&&x.estadoDecision||"");
    if(e==="CONFIRMADO")return "CUADRILLA EJECUTORA / PROPIA";
    if(e==="REASIGNADO")return "OTRA CUADRILLA / REASIGNADA";
    if(e==="NO_ES_GAR_VTR")return "NO CORRESPONDE A GAR/VTR";
    if(e==="ANULADO")return "ANULADO";
    return "PENDIENTE";
  }
  function cuadrillas(d){
    const s=new Set((d&&d.cuadrillas||[]).map(txt).filter(Boolean));
    (d&&d.incidencias||[]).forEach(x=>{if(txt(x.cuadrillaEjecutora))s.add(txt(x.cuadrillaEjecutora));if(txt(x.cuadrillaResponsable))s.add(txt(x.cuadrillaResponsable));});
    return Array.from(s).sort((a,b)=>a.localeCompare(b,"es"));
  }

  function toast(m){
    let e=document.getElementById("mv517c15-toast");
    if(!e){e=document.createElement("div");e.id="mv517c15-toast";e.className="mv517c15-toast";document.body.appendChild(e);}
    e.textContent=m;e.style.display="block";setTimeout(()=>{if(e)e.style.display="none";},3500);
  }

  function aplicarSnapshot(p){
    function patch(d){
      const x=caso(p.ticket,d);if(!x)return;
      const dr=norm(p.decisionResponsabilidad||"SIN_CAMBIO");
      if(dr==="CORRESPONDE"){x.estadoResponsabilidad="CONFIRMADO";x.estadoDecision="CONFIRMADO";x.cuadrillaResponsable=x.cuadrillaEjecutora;}
      else if(dr==="REASIGNAR"){x.estadoResponsabilidad="REASIGNADO";x.estadoDecision="REASIGNADO";x.cuadrillaResponsable=p.cuadrillaResponsable;}
      else if(dr==="NO_ES_GAR_VTR"){x.estadoResponsabilidad="NO_ES_GAR_VTR";x.estadoDecision="NO_ES_GAR_VTR";x.cuadrillaResponsable="";}
      else if(dr==="ANULAR"){x.estadoResponsabilidad="ANULADO";x.estadoDecision="ANULADO";x.cuadrillaResponsable="";}
      if(dr!=="SIN_CAMBIO"){x.responsabilidadDefinida=true;x.requiereClasificacion=false;x.decisionJefaturaValida=true;}
      const rr=norm(p.resultadoRegistro||"SIN_CAMBIO");
      if(rr!=="SIN_CAMBIO"){
        const r=rr==="NO_BONO"?"NO BONO":rr;x.bono=r;x.estadoRegistroTecnico=r;x.requiereBono=false;
        x.puntajeVtrGar=r==="BONO"?Number(p.puntajeVtrGar)||0:(r==="NO BONO"?0:null);
      }
      x.comentarioJefatura=p.sustento;x.validadoPor=p.usuario;
    }
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k||!k.startsWith("MV517C7|LISTA|"))continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");
        if(o&&o.data&&(!p.periodo||txt(o.data.periodo)===txt(p.periodo))){patch(o.data);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));}
      }
    }catch(_){}
    if(window.MV517C5_DATA)patch(window.MV517C5_DATA);
    try{Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));}catch(_){}
  }

  function actualizarTarjeta(ticket,p){
    const card=Array.from(document.querySelectorAll(".mv517c1-case")).find(c=>norm(c.querySelector(".mv517c1-ticket")?.textContent)===norm(ticket));
    if(!card)return;
    const rr=norm(p.resultadoRegistro||"SIN_CAMBIO"),dr=norm(p.decisionResponsabilidad||"SIN_CAMBIO");
    if(rr!=="SIN_CAMBIO"){
      const visible=rr==="NO_BONO"?"NO BONO":rr;
      Array.from(card.querySelectorAll(".mv517c1-field")).forEach(f=>{if(norm(f.querySelector("small")?.textContent)==="BONO"){const b=f.querySelector("b");if(b)b.textContent=visible;}});
      const badges=card.querySelector(".mv517c1-badges");
      if(badges){
        Array.from(badges.querySelectorAll(".mv517c1-badge")).forEach(b=>{const n=norm(b.textContent);if(n==="BONO"||n==="NO BONO"||n.includes("OBSERVADO")){b.textContent=(visible==="BONO"?"● BONO":visible==="NO BONO"?"● NO BONO":"● OBSERVADO");}});
      }
      const reg=Array.from(card.querySelectorAll(".mv517c1-regbox,.mv517c1-box")).find(e=>norm(e.textContent).includes("REGISTRO TÉCNICO"));
      if(reg){const first=reg.querySelector("b");if(first)first.textContent="📝 Registro técnico · "+visible;}
    }
    if(dr!=="SIN_CAMBIO"){
      let resp="";
      if(dr==="CORRESPONDE")resp=txt(card.querySelector(".mv517c1-cuad")?.textContent)||"CUADRILLA EJECUTORA";
      else if(dr==="REASIGNAR")resp=p.cuadrillaResponsable;
      else if(dr==="NO_ES_GAR_VTR")resp="NO CORRESPONDE A GAR/VTR";
      else if(dr==="ANULAR")resp="ANULADO";
      Array.from(card.querySelectorAll(".mv517c1-field")).forEach(f=>{if(norm(f.querySelector("small")?.textContent)==="RESPONSABLE"){const b=f.querySelector("b");if(b)b.textContent=resp;}});
      const badges=card.querySelector(".mv517c1-badges");
      if(badges){Array.from(badges.querySelectorAll(".mv517c1-badge")).forEach(b=>{if(norm(b.textContent).includes("RESPONSABLE")||norm(b.textContent).includes("RESP.")){b.textContent=dr==="CORRESPONDE"?"RESPONSABLE CONFIRMADO":dr==="REASIGNAR"?"RESPONSABLE REASIGNADO":dr==="NO_ES_GAR_VTR"?"NO ES GAR/VTR":"ANULADO";}});}
    }
    let hist=Array.from(card.querySelectorAll(".mv517c1-detail div")).find(e=>norm(e.textContent).startsWith("HISTÓRICO / COMENTARIO DE JEFATURA"));
    if(hist)hist.textContent="Histórico / comentario de Jefatura: corrección guardada · "+p.sustento;
  }

  async function abrir(ticket){
    if(!esValidador())return;
    css();
    const loading=document.createElement("div");loading.className="mv517c1-modalbg";loading.innerHTML='<div class="mv517c1-modal"><h3>✏️ Corregir validación</h3><div class="mv517c1-note">Cargando datos del caso...</div></div>';document.body.appendChild(loading);
    try{
      const {d,x}=await obtenerCaso(ticket);loading.remove();
      if(d.periodoCerrado)throw new Error("Este período está cerrado y no admite correcciones.");
      const tiene=!!txt(x.validacionId),eb=estadoBono(x),er=estadoResp(x),opts=cuadrillas(d).map(c=>`<option value="${esc(c)}" ${norm(c)===norm(x.cuadrillaResponsable)?"selected":""}>${esc(c)}</option>`).join("");
      const bg=document.createElement("div");bg.className="mv517c1-modalbg";
      bg.innerHTML=`<div class="mv517c1-modal"><h3>✏️ Corregir validación · ${esc(ticket)}</h3><div class="mv517c15-warn"><b>Corrección controlada:</b> no se elimina la validación anterior. El sustento queda guardado en el histórico.</div><div class="mv517c15-current"><b>Actual:</b> Responsabilidad: ${esc(er)}${x.cuadrillaResponsable?` · ${esc(x.cuadrillaResponsable)}`:""}<br>Registro: ${tiene?esc(eb):"SIN REGISTRO TÉCNICO"}${x.puntajeVtrGar!=null?` · ${esc(x.puntajeVtrGar)} pts`:""}</div><div class="mv517c15-sec"><h4>1. Corregir responsabilidad</h4><label>Nueva decisión</label><select id="mv15Resp"><option value="SIN_CAMBIO">Mantener responsabilidad actual</option><option value="CORRESPONDE">Cuadrilla ejecutora / Propia</option><option value="REASIGNAR">Otra cuadrilla / Reasignada</option><option value="NO_ES_GAR_VTR">No corresponde a GAR/VTR</option><option value="ANULAR">Anular caso</option></select><div id="mv15CuadW" style="display:none"><label>Nueva cuadrilla responsable</label><select id="mv15Cuad"><option value="">Seleccione...</option>${opts}</select></div></div>${tiene?`<div class="mv517c15-sec reg"><h4>2. Corregir evaluación del registro técnico</h4><label>Nuevo resultado</label><select id="mv15Reg"><option value="SIN_CAMBIO">Mantener ${esc(eb)}</option><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option><option value="OBSERVADO">OBSERVADO · falta evidencia/corrección</option></select><div id="mv15PtsW" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv15Pts" type="number" min="0" step="0.1" value="${eb==="BONO"&&x.puntajeVtrGar!=null?esc(x.puntajeVtrGar):""}"></div></div>`:`<div class="mv517c1-note"><b>Sin registro técnico:</b> aquí puede corregir responsabilidad. El bono excepcional continúa en Gestionar caso.</div>`}<label>Sustento de la corrección</label><textarea id="mv15Sus" placeholder="Ej.: Se marcó NO BONO por error; corresponde BONO según evidencia validada."></textarea><div class="mv517c1-footer"><button class="mv517c1-btn mv517c15-btn" id="mv15Guardar">Guardar corrección</button><button class="mv517c1-btn dark" id="mv15Cancelar">Cancelar</button></div></div>`;
      document.body.appendChild(bg);
      const resp=bg.querySelector("#mv15Resp"),reg=bg.querySelector("#mv15Reg"),btn=bg.querySelector("#mv15Guardar");
      const sync=()=>{bg.querySelector("#mv15CuadW").style.display=resp.value==="REASIGNAR"?"block":"none";const w=bg.querySelector("#mv15PtsW");if(w)w.style.display=reg&&reg.value==="BONO"?"block":"none";};
      resp.onchange=sync;if(reg)reg.onchange=sync;sync();bg.querySelector("#mv15Cancelar").onclick=()=>bg.remove();
      btn.onclick=async()=>{
        const dr=resp.value,rr=reg?reg.value:"SIN_CAMBIO",cuad=txt(bg.querySelector("#mv15Cuad")?.value),pts=Number(bg.querySelector("#mv15Pts")?.value||0),sus=txt(bg.querySelector("#mv15Sus").value);
        if(dr==="SIN_CAMBIO"&&rr==="SIN_CAMBIO"){alert("Seleccione al menos una corrección.");return;}
        if(dr==="REASIGNAR"&&!cuad){alert("Seleccione la nueva cuadrilla responsable.");return;}
        if(rr==="BONO"&&(!Number.isFinite(pts)||pts<=0)){alert("Ingrese un puntaje mayor a 0 para BONO.");return;}
        if(!sus){alert("El sustento de la corrección es obligatorio.");return;}
        const p={accion:"corregirValidacionVtrGarV517C13",usuario:usuario(),periodo:txt(d.periodo||periodoActual()),ticket,validacionId:txt(x.validacionId),decisionResponsabilidad:dr,cuadrillaResponsable:cuad,resultadoRegistro:rr,puntajeVtrGar:rr==="BONO"?pts:0,sustento:sus};
        btn.disabled=true;btn.textContent="Guardando...";
        try{await apiPost(p);aplicarSnapshot(p);actualizarTarjeta(ticket,p);bg.remove();toast("✅ Corrección guardada. El histórico anterior se conserva.");}
        catch(e){alert(e.message||String(e));btn.disabled=false;btn.textContent="Guardar corrección";}
      };
    }catch(e){loading.remove();alert(e.message||String(e));}
  }
  window.mv517c15Corregir=abrir;

  function inyectar(){
    css();if(!esValidador())return;
    document.querySelectorAll(".mv517c1-case").forEach(card=>{
      const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);if(!/^(GAR|VTR)-\d+/i.test(ticket)||!tarjetaResuelta(card))return;
      let a=card.querySelector(":scope > .mv517c12-actions");
      if(!a){const s=card.querySelector(":scope > summary");if(!s)return;a=document.createElement("div");a.className="mv517c12-actions";s.insertAdjacentElement("afterend",a);}
      Array.from(a.querySelectorAll(".mv517c14-btn,.mv517c14a-btn,.mv517c15-btn")).forEach(z=>z.remove());
      const b=document.createElement("button");b.type="button";b.className="mv517c1-btn mv517c15-btn";b.textContent="✏️ Corregir validación";b.onclick=e=>{e.preventDefault();e.stopPropagation();abrir(ticket);};
      const g=Array.from(a.querySelectorAll("button")).find(z=>norm(z.textContent).includes("GESTIONAR CASO"));if(g)a.insertBefore(b,g);else a.appendChild(b);
    });
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(inyectar,70);}
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open","class"]});
  setTimeout(inyectar,300);setTimeout(inyectar,1200);
})();
