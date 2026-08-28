/* ============================================================
   MI VISUAL V517C.16B - EVALUACION JEFATURA SIN REGISTRO
   - Restaura BONO / NO BONO para FINALIZADAS sin registro tecnico.
   - NO BONO es resultado normal, no excepcion.
   - Solo BONO sin registro se identifica como excepcion.
   - Sin MutationObserver; se integra antes del guardado unico V517C.8.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C16B_SIN_REGISTRO_OK) return;
  window.MV517C16B_SIN_REGISTRO_OK=true;

  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function caso(ticket){
    const d=window.MV517C5_DATA||{};
    return (d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;
  }
  function card(ticket){
    return Array.from(document.querySelectorAll(".mv517c1-case")).find(c=>norm(c.querySelector(".mv517c1-ticket")?.textContent)===norm(ticket))||null;
  }
  function campoCard(c,label){
    if(!c)return "";
    const f=Array.from(c.querySelectorAll(".mv517c1-field")).find(x=>norm(x.querySelector("small")?.textContent)===norm(label));
    return txt(f&&f.querySelector("b")?.textContent);
  }
  function estadoFinalizada(ticket,x){
    if(x)return norm(x.estadoWin)==="FINALIZADA";
    return norm(campoCard(card(ticket),"ESTADO WIN"))==="FINALIZADA";
  }
  function bloqueado(ticket,x){
    const e=norm(x&&(x.estadoResponsabilidad||x.estadoDecision)||campoCard(card(ticket),"RESPONSABLE"));
    return e==="NO_ES_GAR_VTR"||e==="ANULADO"||e.includes("NO ES GAR/VTR")||e.includes("ANULADO");
  }
  function actual(ticket,x){
    let r="";
    if(x&&x.bonoExcepcional) r=norm(x.bono||x.estadoRegistroTecnico||"");
    if(!r){
      const c=card(ticket);const b=norm(campoCard(c,"BONO"));
      if(b==="BONO"||b.includes("BONO · EXCEPC"))r="BONO";
      else if(b==="NO BONO"||b.includes("NO BONO"))r="NO BONO";
    }
    return r==="BONO"||r==="NO BONO"?r:"";
  }

  function inyectar(kind,id,validacionId,noEstandar){
    if(kind!=="TICKET"||noEstandar||txt(validacionId))return;
    const x=caso(id);
    if(!estadoFinalizada(id,x)||bloqueado(id,x))return;

    const bg=Array.from(document.querySelectorAll(".mv517c1-modalbg")).pop();
    const modal=bg&&bg.querySelector(".mv517c1-modal");
    if(!modal||modal.querySelector("#mv517c5Excepcion"))return;

    const estadoActual=actual(id,x);
    const nota=Array.from(modal.querySelectorAll(".mv517c1-note")).find(n=>{
      const t=norm(n.textContent);
      return t.includes("NO TIENE REGISTRO TECNICO")||t.includes("NO ESTA HABILITADA")||t.includes("SIN REGISTRO TECNICO");
    });
    if(nota){
      nota.innerHTML="<b>Sin registro técnico.</b> Jefatura puede definir <b>NO BONO</b> o autorizar <b>BONO como excepción</b>. Dar NO BONO no se considera una excepción.";
    }

    const footer=modal.querySelector(".mv517c1-footer");
    const sec=document.createElement("div");
    sec.id="mv517c5Excepcion";
    sec.className="mv517c1-section";
    sec.style.background="#eee8ff";
    const opcionActual=estadoActual?`<option value="" selected>Mantener ${esc(estadoActual)}</option>`:`<option value="" selected>Seleccione...</option>`;
    sec.innerHTML=`
      <h4>2. Evaluación de Jefatura · sin registro técnico</h4>
      <div class="mv517c1-note"><b>Regla:</b> NO BONO es la evaluación normal cuando no existe registro. Solo BONO sin registro se considera <b>BONO · EXCEPCIÓN</b>.</div>
      ${estadoActual?`<div class="mv517c1-box hist"><b>Evaluación actual:</b> ${esc(estadoActual)}${x&&txt(x.comentarioJefatura)?`<br><b>Último sustento:</b> ${esc(x.comentarioJefatura)}`:""}</div>`:""}
      <label>Resultado de Jefatura</label>
      <select id="mv517c5Resultado">${opcionActual}<option value="NO BONO">NO BONO</option><option value="BONO">BONO · EXCEPCIÓN</option></select>
      <div id="mv517c5PuntosWrap" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv517c5Puntos" type="number" min="0" step="0.1"></div>
      <label>Comentario / sustento de Jefatura</label>
      <textarea id="mv517c5Comentario" placeholder="Indique el motivo de la evaluación"></textarea>`;
    (footer||modal).insertAdjacentElement(footer?"beforebegin":"beforeend",sec);
    const sel=sec.querySelector("#mv517c5Resultado");
    sel.addEventListener("change",()=>{
      sec.querySelector("#mv517c5PuntosWrap").style.display=sel.value==="BONO"?"block":"none";
    });
  }

  function instalar(){
    if(typeof window.mv517c1Gestionar!=="function")return false;
    if(window.mv517c1Gestionar._mv517c16b)return true;
    const base=window.mv517c1Gestionar;
    const wrapped=function(kind,id,validacionId,noEstandar){
      const r=base.apply(this,arguments);
      setTimeout(()=>inyectar(kind,id,validacionId,noEstandar),20);
      setTimeout(()=>inyectar(kind,id,validacionId,noEstandar),55);
      return r;
    };
    wrapped._mv517c16b=true;
    window.mv517c1Gestionar=wrapped;
    return true;
  }

  const it=setInterval(()=>{if(instalar())clearInterval(it);},80);
  setTimeout(()=>clearInterval(it),12000);
})();
