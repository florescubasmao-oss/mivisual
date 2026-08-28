/* ============================================================
   MI VISUAL V517C.14A - FIX BOTON CORRECCION GAR/VTR
   - Autoriza por usuario exacto JEFZNORTE, igual que backend.
   - No depende del nombre exacto del perfil.
   - Reutiliza backend V517C.13 y snapshots locales.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C14A_FIX_OK)return;
  window.MV517C14A_FIX_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR="JEFZNORTE";
  let timer=null;
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const esValidador=()=>norm(usuario())===VALIDADOR;

  function snapshotData(){
    if(window.MV517C5_DATA&&window.MV517C5_DATA.ok)return window.MV517C5_DATA;
    try{
      let mejor=null;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k||!k.startsWith("MV517C7|LISTA|"))continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");
        if(o&&o.data&&o.data.ok&&(!mejor||Number(o.ts||0)>Number(mejor.ts||0)))mejor=o;
      }
      if(mejor)return mejor.data;
    }catch(_){}
    return null;
  }
  function caso(ticket,d){return (d&&d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;}
  function estadoBono(x){const b=norm(x&&x.bono||x&&x.estadoRegistroTecnico||"");if(b==="NO_BONO"||b==="NO BONO")return "NO BONO";if(b==="BONO")return "BONO";if(b==="OBSERVADO")return "OBSERVADO";return "PENDIENTE";}
  function estadoResp(x){const e=norm(x&&x.estadoResponsabilidad||x&&x.estadoDecision||"");if(e==="CONFIRMADO")return "CUADRILLA EJECUTORA / PROPIA";if(e==="REASIGNADO")return "OTRA CUADRILLA / REASIGNADA";if(e==="NO_ES_GAR_VTR")return "NO CORRESPONDE A GAR/VTR";if(e==="ANULADO")return "ANULADO";return "PENDIENTE";}
  function resuelto(x){if(!x)return false;const e=norm(x.estadoResponsabilidad||x.estadoDecision||""),b=estadoBono(x);return ["CONFIRMADO","REASIGNADO","NO_ES_GAR_VTR","ANULADO"].includes(e)||["BONO","NO BONO","OBSERVADO"].includes(b);}
  function cuadrillas(d){const s=new Set((d&&d.cuadrillas||[]).map(txt).filter(Boolean));(d&&d.incidencias||[]).forEach(x=>{if(txt(x.cuadrillaEjecutora))s.add(txt(x.cuadrillaEjecutora));if(txt(x.cuadrillaResponsable))s.add(txt(x.cuadrillaResponsable));});return Array.from(s).sort((a,b)=>a.localeCompare(b,"es"));}

  function css(){if(document.getElementById("mv517c14a-css"))return;const s=document.createElement("style");s.id="mv517c14a-css";s.textContent=`.mv517c14a-btn{background:#7c3aed!important}.mv517c14a-current{background:#f4efff;border-radius:9px;padding:7px 9px;margin:6px 0;font-size:9px;line-height:1.4;color:#4c1d95}.mv517c14a-sec{border-radius:10px;padding:8px;margin-top:7px;background:#e7f4ec}.mv517c14a-sec.reg{background:#e7f2ff}.mv517c14a-warn{background:#fff3d6;border:1px solid #f0bd4d;color:#713f12;border-radius:9px;padding:7px 9px;font-size:8.5px;line-height:1.35;margin:6px 0}`;document.head.appendChild(s);}

  function capturarFiltros(){return {buscar:txt(document.getElementById("mv517c1Buscar")?.value),tipo:txt(document.getElementById("mv517c1Tipo")?.value),estado:txt(document.getElementById("mv517c1Estado")?.value),registro:txt(document.getElementById("mv517c1Registro")?.value),gestion:txt(document.getElementById("mv517c1Gestion")?.value)};}
  function restaurarFiltros(f){[["mv517c1Buscar","buscar"],["mv517c1Tipo","tipo"],["mv517c1Estado","estado"],["mv517c1Registro","registro"],["mv517c1Gestion","gestion"]].forEach(([id,k])=>{const e=document.getElementById(id);if(e)e.value=f[k]||"";});if(typeof window.mv517c1Render==="function")window.mv517c1Render();}
  function volver(ticket){setTimeout(()=>{const c=Array.from(document.querySelectorAll(".mv517c1-case")).find(z=>norm(z.querySelector(".mv517c1-ticket")?.textContent)===norm(ticket));if(!c)return;const s=c.closest(".mv517c1-sede"),e=c.closest(".mv517c1-estado");if(s)s.open=true;if(e)e.open=true;c.open=true;setTimeout(()=>c.scrollIntoView({behavior:"smooth",block:"center"}),80);},160);}

  function aplicar(d,p){const x=caso(p.ticket,d);if(!x)return;const dr=norm(p.decisionResponsabilidad||"SIN_CAMBIO");if(dr==="CORRESPONDE"){x.estadoResponsabilidad="CONFIRMADO";x.estadoDecision="CONFIRMADO";x.cuadrillaResponsable=x.cuadrillaEjecutora;}else if(dr==="REASIGNAR"){x.estadoResponsabilidad="REASIGNADO";x.estadoDecision="REASIGNADO";x.cuadrillaResponsable=p.cuadrillaResponsable;}else if(dr==="NO_ES_GAR_VTR"){x.estadoResponsabilidad="NO_ES_GAR_VTR";x.estadoDecision="NO_ES_GAR_VTR";x.cuadrillaResponsable="";}else if(dr==="ANULAR"){x.estadoResponsabilidad="ANULADO";x.estadoDecision="ANULADO";x.cuadrillaResponsable="";}if(dr!=="SIN_CAMBIO"){x.responsabilidadDefinida=true;x.requiereClasificacion=false;x.decisionJefaturaValida=true;}const rr=norm(p.resultadoRegistro||"SIN_CAMBIO");if(rr!=="SIN_CAMBIO"){const r=rr==="NO_BONO"?"NO BONO":rr;x.bono=r;x.estadoRegistroTecnico=r;x.requiereBono=false;x.puntajeVtrGar=r==="BONO"?Number(p.puntajeVtrGar)||0:(r==="NO BONO"?0:null);}x.comentarioJefatura=p.sustento;x.validadoPor=p.usuario;}
  function patchSnapshots(p){try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k)continue;if(k.startsWith("MV517C7|LISTA|")){const o=JSON.parse(localStorage.getItem(k)||"null");if(o&&o.data&&(!p.periodo||txt(o.data.periodo)===txt(p.periodo))){aplicar(o.data,p);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));}}else if(k.startsWith("MV517C6|LISTA|")){const o=JSON.parse(localStorage.getItem(k)||"null");if(o&&o.text){const d=JSON.parse(o.text);if(d&&d.ok&&(!p.periodo||txt(d.periodo)===txt(p.periodo))){aplicar(d,p);o.text=JSON.stringify(d);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));}}}}}catch(e){console.warn("V517C14A snapshot",e);}try{Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));}catch(_){}if(window.MV517C5_DATA)aplicar(window.MV517C5_DATA,p);}

  async function post(p){const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(p)});const t=await r.text();let j;try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del backend.");}if(!j||!j.ok)throw new Error(j&&j.error||"No se pudo guardar la corrección.");return j;}

  function abrir(ticket){
    if(!esValidador())return;
    const d=snapshotData(),x=caso(ticket,d);if(!d||!x){alert("No se pudo recuperar el caso para corregir. Vuelva a abrir GAR/VTR e inténtelo nuevamente.");return;}
    css();const tiene=!!txt(x.validacionId),eb=estadoBono(x),er=estadoResp(x),opts=cuadrillas(d).map(c=>`<option value="${esc(c)}" ${norm(c)===norm(x.cuadrillaResponsable)?"selected":""}>${esc(c)}</option>`).join("");
    const bg=document.createElement("div");bg.className="mv517c1-modalbg";bg.innerHTML=`<div class="mv517c1-modal"><h3>✏️ Corregir validación · ${esc(ticket)}</h3><div class="mv517c14a-warn"><b>Corrección controlada:</b> el valor anterior se conserva en el histórico. El sustento es obligatorio.</div><div class="mv517c14a-current"><b>Actual:</b> Responsabilidad: ${esc(er)}${x.cuadrillaResponsable?` · ${esc(x.cuadrillaResponsable)}`:""}<br>Registro: ${tiene?esc(eb):"SIN REGISTRO TÉCNICO"}${x.puntajeVtrGar!=null?` · ${esc(x.puntajeVtrGar)} pts`:""}</div><div class="mv517c14a-sec"><h4>1. Responsabilidad</h4><label>Nueva decisión</label><select id="mv14aResp"><option value="SIN_CAMBIO">Mantener responsabilidad actual</option><option value="CORRESPONDE">Cuadrilla ejecutora / Propia</option><option value="REASIGNAR">Otra cuadrilla / Reasignada</option><option value="NO_ES_GAR_VTR">No corresponde a GAR/VTR</option><option value="ANULAR">Anular caso</option></select><div id="mv14aCuadW" style="display:none"><label>Nueva cuadrilla responsable</label><select id="mv14aCuad"><option value="">Seleccione...</option>${opts}</select></div></div>${tiene?`<div class="mv517c14a-sec reg"><h4>2. Evaluación del registro técnico</h4><label>Nuevo resultado</label><select id="mv14aReg"><option value="SIN_CAMBIO">Mantener ${esc(eb)}</option><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option><option value="OBSERVADO">OBSERVADO</option></select><div id="mv14aPtsW" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv14aPts" type="number" min="0" step="0.1" value="${eb==="BONO"&&x.puntajeVtrGar!=null?esc(x.puntajeVtrGar):""}"></div></div>`:`<div class="mv517c1-note">Sin registro técnico: aquí puede corregir responsabilidad. El bono excepcional se mantiene en Gestionar caso.</div>`}<label>Sustento de la corrección</label><textarea id="mv14aSus" placeholder="Detalle por qué se realiza la corrección"></textarea><div class="mv517c1-footer"><button class="mv517c1-btn mv517c14a-btn" id="mv14aGuardar">Guardar corrección</button><button class="mv517c1-btn dark" id="mv14aCancelar">Cancelar</button></div></div>`;document.body.appendChild(bg);
    const resp=bg.querySelector("#mv14aResp"),reg=bg.querySelector("#mv14aReg");const sync=()=>{bg.querySelector("#mv14aCuadW").style.display=resp.value==="REASIGNAR"?"block":"none";const w=bg.querySelector("#mv14aPtsW");if(w)w.style.display=reg&&reg.value==="BONO"?"block":"none";};resp.onchange=sync;if(reg)reg.onchange=sync;sync();bg.querySelector("#mv14aCancelar").onclick=()=>bg.remove();
    bg.querySelector("#mv14aGuardar").onclick=async()=>{const dr=resp.value,rr=reg?reg.value:"SIN_CAMBIO",cuad=txt(bg.querySelector("#mv14aCuad")?.value),pts=Number(bg.querySelector("#mv14aPts")?.value||0),sus=txt(bg.querySelector("#mv14aSus").value);if(dr==="SIN_CAMBIO"&&rr==="SIN_CAMBIO"){alert("Seleccione al menos una corrección.");return;}if(dr==="REASIGNAR"&&!cuad){alert("Seleccione la nueva cuadrilla responsable.");return;}if(rr==="BONO"&&(!Number.isFinite(pts)||pts<=0)){alert("Ingrese un puntaje mayor a 0 para BONO.");return;}if(!sus){alert("El sustento de la corrección es obligatorio.");return;}const filtros=capturarFiltros(),periodo=txt(d.periodo||document.getElementById("mv517c1Periodo")?.value);const p={accion:"corregirValidacionVtrGarV517C13",usuario:usuario(),periodo,ticket,validacionId:txt(x.validacionId),decisionResponsabilidad:dr,cuadrillaResponsable:cuad,resultadoRegistro:rr,puntajeVtrGar:rr==="BONO"?pts:0,sustento:sus};const b=bg.querySelector("#mv14aGuardar");b.disabled=true;b.textContent="Guardando...";try{await post(p);patchSnapshots(p);bg.remove();if(typeof window.mv517c1CambiarPeriodo==="function"){await Promise.resolve(window.mv517c1CambiarPeriodo(periodo));restaurarFiltros(filtros);volver(ticket);}}catch(e){alert(e.message||String(e));b.disabled=false;b.textContent="Guardar corrección";}};
  }
  window.mv517c14Corregir=abrir;

  function inyectar(){css();if(!esValidador())return;const d=snapshotData();if(!d||d.periodoCerrado)return;document.querySelectorAll(".mv517c1-case").forEach(card=>{const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);if(!/^(GAR|VTR)-\d+/i.test(ticket))return;const x=caso(ticket,d);if(!resuelto(x))return;let a=card.querySelector(":scope > .mv517c12-actions");if(!a){const s=card.querySelector(":scope > summary");if(!s)return;a=document.createElement("div");a.className="mv517c12-actions";s.insertAdjacentElement("afterend",a);}Array.from(a.querySelectorAll(".mv517c14-btn,.mv517c14a-btn")).forEach(z=>z.remove());const b=document.createElement("button");b.type="button";b.className="mv517c1-btn mv517c14a-btn";b.textContent="✏️ Corregir validación";b.onclick=e=>{e.preventDefault();e.stopPropagation();abrir(ticket);};const g=Array.from(a.querySelectorAll("button")).find(z=>norm(z.textContent).includes("GESTIONAR CASO"));if(g)a.insertBefore(b,g);else a.appendChild(b);});}
  function schedule(){clearTimeout(timer);timer=setTimeout(inyectar,60);}const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open","class"]});setTimeout(inyectar,250);setTimeout(inyectar,1000);
})();
