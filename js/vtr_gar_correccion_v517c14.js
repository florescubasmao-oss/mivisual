/* ============================================================
   MI VISUAL V517C.14 - CORRECCION CONTROLADA GAR/VTR
   FRONTEND ADITIVO

   - Solo JEFZNORTE.
   - Agrega "Corregir validacion" en casos ya resueltos.
   - Corrige responsabilidad y/o BONO / NO BONO / OBSERVADO.
   - Sustento obligatorio.
   - Conserva trazabilidad en backend V517C.13.
   - Actualiza snapshot local para no recargar toda la base.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C14_CORRECCION_OK) return;
  window.MV517C14_CORRECCION_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR="JEFZNORTE";
  let timer=null;

  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const perfil=()=>norm(localStorage.getItem("perfil")||"");
  const esValidador=()=>norm(usuario())===VALIDADOR&&perfil()==="JEFATURA";

  function data(){return window.MV517C5_DATA||null;}
  function caso(ticket,d){d=d||data();return (d&&d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;}
  function estadoBono(x){
    const b=norm(x&&x.bono||x&&x.estadoRegistroTecnico||"");
    if(b==="NO_BONO"||b==="NO BONO")return "NO BONO";
    if(b==="BONO")return "BONO";
    if(b==="OBSERVADO")return "OBSERVADO";
    return "PENDIENTE";
  }
  function estadoResponsabilidad(x){
    const e=norm(x&&x.estadoResponsabilidad||x&&x.estadoDecision||"PENDIENTE");
    if(e==="CONFIRMADO")return "CUADRILLA EJECUTORA / PROPIA";
    if(e==="REASIGNADO")return "OTRA CUADRILLA / REASIGNADA";
    if(e==="NO_ES_GAR_VTR")return "NO CORRESPONDE A GAR/VTR";
    if(e==="ANULADO")return "ANULADO";
    return "PENDIENTE";
  }
  function yaResuelto(x){
    if(!x)return false;
    const er=norm(x.estadoResponsabilidad||x.estadoDecision||"");
    const eb=estadoBono(x);
    return ["CONFIRMADO","REASIGNADO","NO_ES_GAR_VTR","ANULADO"].includes(er)||["BONO","NO BONO","OBSERVADO"].includes(eb);
  }

  function css(){
    if(document.getElementById("mv517c14-css"))return;
    const s=document.createElement("style");s.id="mv517c14-css";
    s.textContent=`
      .mv517c14-btn{background:#7c3aed!important}
      .mv517c14-current{background:#f4efff;border-radius:9px;padding:7px 9px;margin:6px 0;font-size:9px;line-height:1.4;color:#4c1d95}
      .mv517c14-current b{color:#3b0764}
      .mv517c14-warning{background:#fff3d6;border:1px solid #f0bd4d;color:#713f12;border-radius:9px;padding:7px 9px;font-size:8.5px;line-height:1.35;margin:6px 0}
      .mv517c14-section{background:#e8edf4;border-radius:10px;padding:8px;margin-top:7px}
      .mv517c14-section.reg{background:#e7f2ff}.mv517c14-section.resp{background:#e7f4ec}
      .mv517c14-toast{position:fixed;right:16px;bottom:54px;z-index:22000;max-width:390px;padding:10px 12px;border-radius:10px;background:#dcfce7;color:#166534;font:800 10px Arial;box-shadow:0 8px 24px rgba(0,0,0,.22)}
    `;document.head.appendChild(s);
  }

  function cuadrillas(d){
    const set=new Set((d&&d.cuadrillas||[]).map(txt).filter(Boolean));
    (d&&d.incidencias||[]).forEach(x=>{if(txt(x.cuadrillaEjecutora))set.add(txt(x.cuadrillaEjecutora));if(txt(x.cuadrillaResponsable))set.add(txt(x.cuadrillaResponsable));});
    return Array.from(set).sort((a,b)=>a.localeCompare(b,"es"));
  }

  function mostrarToast(msg){
    let el=document.getElementById("mv517c14-toast");
    if(!el){el=document.createElement("div");el.id="mv517c14-toast";el.className="mv517c14-toast";document.body.appendChild(el);}
    el.textContent=msg;el.style.display="block";setTimeout(()=>{if(el)el.style.display="none";},3500);
  }

  function capturarFiltros(){
    return {
      buscar:txt(document.getElementById("mv517c1Buscar")?.value),
      tipo:txt(document.getElementById("mv517c1Tipo")?.value),
      estado:txt(document.getElementById("mv517c1Estado")?.value),
      registro:txt(document.getElementById("mv517c1Registro")?.value),
      gestion:txt(document.getElementById("mv517c1Gestion")?.value)
    };
  }
  function restaurarFiltros(f){
    [["mv517c1Buscar","buscar"],["mv517c1Tipo","tipo"],["mv517c1Estado","estado"],["mv517c1Registro","registro"],["mv517c1Gestion","gestion"]].forEach(([id,k])=>{const e=document.getElementById(id);if(e)e.value=f[k]||"";});
    if(typeof window.mv517c1Render==="function")window.mv517c1Render();
  }
  function volverAlTicket(ticket){
    setTimeout(()=>{
      const card=Array.from(document.querySelectorAll(".mv517c1-case")).find(c=>norm(c.querySelector(".mv517c1-ticket")?.textContent)===norm(ticket));
      if(!card)return;
      const est=card.closest(".mv517c1-estado"),sede=card.closest(".mv517c1-sede");
      if(sede)sede.open=true;if(est)est.open=true;card.open=true;
      setTimeout(()=>card.scrollIntoView({behavior:"smooth",block:"center"}),100);
    },180);
  }

  function aplicarCorreccion(d,p){
    if(!d||!d.ok)return d;
    const x=caso(p.ticket,d);if(!x)return d;
    const dr=norm(p.decisionResponsabilidad||"SIN_CAMBIO");
    if(dr!=="SIN_CAMBIO"){
      if(dr==="CORRESPONDE"){
        x.estadoResponsabilidad="CONFIRMADO";x.estadoDecision="CONFIRMADO";x.responsabilidadDefinida=true;x.cuadrillaResponsable=x.cuadrillaEjecutora||x.cuadrillaResponsable;
      }else if(dr==="REASIGNAR"){
        x.estadoResponsabilidad="REASIGNADO";x.estadoDecision="REASIGNADO";x.responsabilidadDefinida=true;x.cuadrillaResponsable=txt(p.cuadrillaResponsable||x.cuadrillaResponsable);
      }else if(dr==="NO_ES_GAR_VTR"){
        x.estadoResponsabilidad="NO_ES_GAR_VTR";x.estadoDecision="NO_ES_GAR_VTR";x.responsabilidadDefinida=true;x.cuadrillaResponsable="";
      }else if(dr==="ANULAR"){
        x.estadoResponsabilidad="ANULADO";x.estadoDecision="ANULADO";x.responsabilidadDefinida=true;x.cuadrillaResponsable="";
      }
      x.requiereClasificacion=false;x.decisionJefaturaValida=true;
    }
    const rr=norm(p.resultadoRegistro||"SIN_CAMBIO");
    if(rr!=="SIN_CAMBIO"){
      const r=rr==="NO_BONO"?"NO BONO":rr;
      x.bono=r;x.estadoRegistroTecnico=r;x.requiereBono=false;
      if(r==="BONO")x.puntajeVtrGar=Number(p.puntajeVtrGar)||0;
      else if(r==="NO BONO")x.puntajeVtrGar=0;
      else if(r==="OBSERVADO")x.puntajeVtrGar=null;
    }
    x.comentarioJefatura=txt(p.sustento||x.comentarioJefatura);
    x.validadoPor=txt(p.usuario||x.validadoPor);
    return d;
  }

  function parchearSnapshots(p){
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k)continue;
        if(k.startsWith("MV517C7|LISTA|")){
          const o=JSON.parse(localStorage.getItem(k)||"null");
          if(o&&o.data&&(!p.periodo||txt(o.data.periodo)===txt(p.periodo))){aplicarCorreccion(o.data,p);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));}
        }else if(k.startsWith("MV517C6|LISTA|")){
          const o=JSON.parse(localStorage.getItem(k)||"null");
          if(o&&o.text){const d=JSON.parse(o.text);if(d&&d.ok&&(!p.periodo||txt(d.periodo)===txt(p.periodo))){aplicarCorreccion(d,p);o.text=JSON.stringify(d);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));}}
        }
      }
    }catch(e){console.warn("V517C14 snapshot",e);}
    try{Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));}catch(_){}
    if(window.MV517C5_DATA)aplicarCorreccion(window.MV517C5_DATA,p);
  }

  async function apiPost(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
    const t=await r.text();let j;try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida del backend.");}
    if(!j||!j.ok)throw new Error(j&&j.error||"No se pudo guardar la correccion.");
    return j;
  }

  function abrir(ticket){
    const d=data(),x=caso(ticket,d);if(!d||!x||!esValidador())return;
    css();
    const qs=cuadrillas(d).map(c=>`<option value="${esc(c)}" ${norm(c)===norm(x.cuadrillaResponsable)?"selected":""}>${esc(c)}</option>`).join("");
    const tieneRegistro=!!txt(x.validacionId);
    const eb=estadoBono(x),er=estadoResponsabilidad(x);
    const bg=document.createElement("div");bg.className="mv517c1-modalbg";
    bg.innerHTML=`<div class="mv517c1-modal"><h3>✏️ Corregir validación · ${esc(ticket)}</h3>
      <div class="mv517c14-warning"><b>Corrección controlada:</b> no elimina la validación anterior. El backend conservará quién corrigió, fecha, valor anterior, valor nuevo y sustento.</div>
      <div class="mv517c14-current"><b>Actual:</b> Responsabilidad: ${esc(er)}${x.cuadrillaResponsable?` · ${esc(x.cuadrillaResponsable)}`:""}<br>Registro técnico: ${tieneRegistro?esc(eb):"SIN REGISTRO TÉCNICO"}${x.puntajeVtrGar!=null?` · ${esc(x.puntajeVtrGar)} pts`:""}</div>
      <div class="mv517c14-section resp"><h4>1. Corregir responsabilidad</h4><label>Nueva decisión</label><select id="mv517c14Resp"><option value="SIN_CAMBIO">Mantener responsabilidad actual</option><option value="CORRESPONDE">Cuadrilla ejecutora / Propia</option><option value="REASIGNAR">Otra cuadrilla / Reasignada</option><option value="NO_ES_GAR_VTR">No corresponde a GAR/VTR</option><option value="ANULAR">Anular caso</option></select><div id="mv517c14CuadWrap" style="display:none"><label>Nueva cuadrilla responsable</label><select id="mv517c14Cuad"><option value="">Seleccione...</option>${qs}</select></div></div>
      ${tieneRegistro?`<div class="mv517c14-section reg"><h4>2. Corregir evaluación del registro técnico</h4><label>Nuevo resultado</label><select id="mv517c14Reg"><option value="SIN_CAMBIO">Mantener ${esc(eb)}</option><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option><option value="OBSERVADO">OBSERVADO · falta evidencia/corrección</option></select><div id="mv517c14PuntWrap" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv517c14Punt" type="number" min="0" step="0.1" value="${eb==="BONO"&&x.puntajeVtrGar!=null?esc(x.puntajeVtrGar):""}"></div></div>`:`<div class="mv517c1-note"><b>Sin registro técnico:</b> aquí solo puede corregir responsabilidad. Los bonos excepcionales sin registro continúan gestionándose desde “Gestionar caso”.</div>`}
      <label>Sustento de la corrección</label><textarea id="mv517c14Sustento" placeholder="Ej.: Se marcó NO BONO por error; corresponde BONO según evidencia validada."></textarea>
      <div class="mv517c1-footer"><button class="mv517c1-btn mv517c14-btn" id="mv517c14Guardar">Guardar corrección</button><button class="mv517c1-btn dark" id="mv517c14Cancelar">Cancelar</button></div></div>`;
    document.body.appendChild(bg);
    const resp=bg.querySelector("#mv517c14Resp"),reg=bg.querySelector("#mv517c14Reg"),btn=bg.querySelector("#mv517c14Guardar");
    const sync=()=>{
      bg.querySelector("#mv517c14CuadWrap").style.display=resp.value==="REASIGNAR"?"block":"none";
      const pw=bg.querySelector("#mv517c14PuntWrap");if(pw)pw.style.display=reg&&reg.value==="BONO"?"block":"none";
    };
    resp.onchange=sync;if(reg)reg.onchange=sync;sync();
    bg.querySelector("#mv517c14Cancelar").onclick=()=>bg.remove();
    btn.onclick=async()=>{
      const dr=resp.value,rr=reg?reg.value:"SIN_CAMBIO",sustento=txt(bg.querySelector("#mv517c14Sustento").value),cuad=txt(bg.querySelector("#mv517c14Cuad")?.value),punt=Number(bg.querySelector("#mv517c14Punt")?.value||0);
      if(dr==="SIN_CAMBIO"&&rr==="SIN_CAMBIO"){alert("Seleccione al menos una corrección.");return;}
      if(dr==="REASIGNAR"&&!cuad){alert("Seleccione la nueva cuadrilla responsable.");return;}
      if(rr==="BONO"&&(!Number.isFinite(punt)||punt<=0)){alert("Ingrese un puntaje mayor a 0 para BONO.");return;}
      if(!sustento){alert("El sustento de la corrección es obligatorio.");return;}
      const filtros=capturarFiltros();
      const p={accion:"corregirValidacionVtrGarV517C13",usuario:usuario(),periodo:txt(d.periodo),ticket:ticket,validacionId:txt(x.validacionId),decisionResponsabilidad:dr,cuadrillaResponsable:cuad,resultadoRegistro:rr,puntajeVtrGar:rr==="BONO"?punt:0,sustento:sustento};
      btn.disabled=true;btn.textContent="Guardando corrección...";
      try{
        await apiPost(p);parchearSnapshots(p);bg.remove();mostrarToast("✅ Corrección guardada. Se mantiene el histórico anterior.");
        if(typeof window.mv517c1CambiarPeriodo==="function"){
          await Promise.resolve(window.mv517c1CambiarPeriodo(d.periodo));
          restaurarFiltros(filtros);volverAlTicket(ticket);
        }
      }catch(e){alert(e.message||String(e));btn.disabled=false;btn.textContent="Guardar corrección";}
    };
  }
  window.mv517c14Corregir=abrir;

  function inyectar(){
    css();if(!esValidador())return;
    const d=data();if(!d||d.periodoCerrado)return;
    document.querySelectorAll(".mv517c1-case").forEach(card=>{
      const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);if(!/^(GAR|VTR)-\d+/i.test(ticket))return;
      const x=caso(ticket,d);if(!yaResuelto(x))return;
      let actions=card.querySelector(":scope > .mv517c12-actions");
      if(!actions){const summary=card.querySelector(":scope > summary");if(!summary)return;actions=document.createElement("div");actions.className="mv517c12-actions";summary.insertAdjacentElement("afterend",actions);}
      if(actions.querySelector(".mv517c14-btn"))return;
      const b=document.createElement("button");b.type="button";b.className="mv517c1-btn mv517c14-btn";b.textContent="✏️ Corregir validación";b.onclick=e=>{e.preventDefault();e.stopPropagation();abrir(ticket);};
      const gestionar=Array.from(actions.querySelectorAll("button")).find(z=>norm(z.textContent).includes("GESTIONAR CASO"));
      if(gestionar)actions.insertBefore(b,gestionar);else actions.appendChild(b);
    });
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(inyectar,80);}
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open","class"]});
  setTimeout(inyectar,400);
})();
