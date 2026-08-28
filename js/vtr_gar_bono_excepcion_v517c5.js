/* ============================================================
   MI VISUAL V517C.5 - MOTIVO WIN + BONO EXCEPCIONAL SIN REGISTRO
   FRONTEND ADITIVO
============================================================ */
(function(){
  "use strict";
  if(window.MV517C5_BONO_EXCEPCION_OK) return;
  window.MV517C5_BONO_EXCEPCION_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  let DATA=null, timer=null, gestionParcheada=false;
  const FETCH_BASE=window.fetch.bind(window);

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}

  window.fetch=function(input,init){
    const p=FETCH_BASE(input,init);
    try{
      if(norm(init&&init.method||"GET")==="POST"&&typeof init?.body==="string"){
        const b=JSON.parse(init.body);
        if(b&&b.accion==="listarVtrGarV517A"){
          p.then(async r=>{
            try{
              const j=JSON.parse(await r.clone().text());
              if(j&&j.ok){DATA=j;window.MV517C5_DATA=j;programar();}
            }catch(_){}
          }).catch(()=>{});
        }
      }
    }catch(_){}
    return p;
  };

  function casoTicket(ticket){
    const d=DATA||window.MV517C5_DATA||{};
    return (d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;
  }

  function motivoOrden(o){
    const e=norm(o&&o.estado);
    if(e==="FINALIZADA") return txt(o.motivoFinalizacion);
    if(e==="REPROGRAMADA"||e==="CANCELADA") return txt(o.motivoCancelacion)||txt(o.motivoFinalizacion);
    if(e==="ANULADA") return txt(o.motivoAnulacion)||txt(o.motivoCancelacion);
    return txt(o.motivoFinalizacion)||txt(o.motivoCancelacion)||txt(o.motivoAnulacion);
  }

  function enriquecerOrdenes(card,x){
    if(!card.open||!x||!Array.isArray(x.ordenesWin))return;
    const boxes=Array.from(card.querySelectorAll(".mv517c1-box"));
    const box=boxes.find(b=>norm(b.querySelector("b")?.textContent).includes("ORDENES WIN ASOCIADAS"));
    if(!box)return;
    x.ordenesWin.forEach(o=>{
      const orden=txt(o.ordenId);if(!orden)return;
      const fila=Array.from(box.querySelectorAll("div")).find(d=>norm(d.textContent).startsWith("ORDEN "+norm(orden)));
      if(!fila||fila.querySelector(".mv517c5-motivo"))return;
      const m=motivoOrden(o);
      if(!m)return;
      const div=document.createElement("div");
      div.className="mv517c5-motivo";
      div.style.cssText="margin-top:3px;padding:4px 6px;border-radius:6px;background:#e8f1fb;color:#1e3a5f;font-size:8px;line-height:1.3";
      div.innerHTML="<b>Motivo WIN:</b> "+esc(m);
      fila.appendChild(div);
    });
  }

  function enriquecerBonoExcepcion(card,x){
    if(!x||!x.bonoExcepcional)return;
    const resultado=norm(x.bono||x.estadoRegistroTecnico||"");
    const esBono=resultado==="BONO";
    const badges=card.querySelector(".mv517c1-badges");
    if(badges){
      Array.from(badges.querySelectorAll(".mv517c1-badge")).forEach(b=>{
        const n=norm(b.textContent);
        if(!n.includes("BONO")||n.includes("PENDIENTE"))return;
        b.textContent=esBono?"🟣 BONO · EXCEPCIÓN":"🔵 NO BONO";
        b.classList.add("info");
      });
    }
    Array.from(card.querySelectorAll(".mv517c1-field")).forEach(f=>{
      if(norm(f.querySelector("small")?.textContent)==="BONO"){
        const b=f.querySelector("b");
        if(b)b.textContent=esBono?"BONO · EXCEPCIÓN JEFATURA":"NO BONO";
      }
    });
    const reg=Array.from(card.querySelectorAll(".mv517c1-regbox"))[0];
    const nota=reg&&reg.querySelector(".mv517c5-ex-note");
    if(esBono){
      if(reg&&!nota){
        const d=document.createElement("div");d.className="mv517c5-ex-note";
        d.style.cssText="width:100%;margin-top:4px;font-size:8px;color:#5b21b6;font-weight:800";
        d.textContent="BONO autorizado por Jefatura como excepción, sin convertir el caso en registro técnico.";
        reg.appendChild(d);
      }
    }else if(nota){
      nota.remove();
    }
  }

  function enriquecer(){
    document.querySelectorAll(".mv517c1-case").forEach(card=>{
      const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);
      if(!/^(VTR|GAR)-\d+/i.test(ticket))return;
      const x=casoTicket(ticket);if(!x)return;
      enriquecerOrdenes(card,x);enriquecerBonoExcepcion(card,x);
    });
  }
  function programar(){clearTimeout(timer);timer=setTimeout(enriquecer,40);}

  function limpiarCache(){
    try{Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));}catch(_){}
  }

  async function guardarExcepcion(ticket,modal){
    const res=modal.querySelector("#mv517c5Resultado")?.value||"";
    const comentario=txt(modal.querySelector("#mv517c5Comentario")?.value);
    let puntos=0;
    if(!res){alert("Seleccione BONO o NO BONO.");return;}
    if(!comentario){alert("Ingrese el sustento de la evaluación.");return;}
    if(res==="BONO"){
      puntos=Number(modal.querySelector("#mv517c5Puntos")?.value);
      if(!isFinite(puntos)||puntos<=0){alert("Ingrese un puntaje mayor a 0.");return;}
    }
    const btn=modal.querySelector("#mv517c5Guardar");
    if(btn){btn.disabled=true;btn.textContent="Guardando evaluación...";}
    try{
      const r=await FETCH_BASE(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({
        accion:"validarBonoExcepcionalVtrGarV517C5",usuario:usuario(),periodo:(DATA||{}).periodo,
        ticket:ticket,resultado:res,puntajeVtrGar:puntos,motivo:comentario
      })});
      const j=JSON.parse(await r.text());if(!j||!j.ok)throw new Error(j&&j.error||"No se pudo guardar la evaluación.");
      limpiarCache();
      modal.closest(".mv517c1-modalbg")?.remove();
      if(typeof window.mv517c1CambiarPeriodo==="function") window.mv517c1CambiarPeriodo((DATA||{}).periodo||"");
    }catch(e){alert(e.message||String(e));if(btn){btn.disabled=false;btn.textContent="Guardar evaluación";}}
  }

  function inyectarExcepcion(kind,id,validacionId,noEstandar){
    if(kind!=="TICKET"||noEstandar||txt(validacionId))return;
    const x=casoTicket(id);if(!x||norm(x.estadoWin)!==="FINALIZADA")return;
    const er=norm(x.estadoResponsabilidad||x.estadoDecision||"");
    if(er==="NO_ES_GAR_VTR"||er==="ANULADO")return;
    const bg=Array.from(document.querySelectorAll(".mv517c1-modalbg")).pop();
    const modal=bg&&bg.querySelector(".mv517c1-modal");if(!modal||modal.querySelector("#mv517c5Excepcion"))return;
    const footer=modal.querySelector(".mv517c1-footer");
    const nota=Array.from(modal.querySelectorAll(".mv517c1-note")).find(n=>norm(n.textContent).includes("NO TIENE REGISTRO TECNICO"));
    if(nota) nota.innerHTML="<b>Sin registro técnico.</b> Jefatura puede registrar NO BONO o, de forma excepcional, autorizar BONO sin crear un registro técnico ficticio.";
    const actual=norm(x.bonoExcepcional?x.bono:"");
    const puntos=x.bonoExcepcional&&x.puntajeVtrGar!=null?Number(x.puntajeVtrGar):"";
    const sec=document.createElement("div");sec.id="mv517c5Excepcion";sec.className="mv517c1-section";sec.style.background="#eee8ff";
    sec.innerHTML=`<h4>2. Evaluación de Jefatura · sin registro técnico</h4>
      <div class="mv517c1-note"><b>NO BONO</b> se registra como evaluación normal por ausencia de registro. <b>BONO</b> sí se considera una excepción autorizada por Jefatura. Ninguna opción convierte el caso en CON REGISTRO.</div>
      ${x.bonoExcepcional?`<div class="mv517c1-box hist"><b>Evaluación actual:</b> ${esc(actual)}${actual==="BONO"&&puntos!==""?` · ${esc(puntos)} pts`:""}<br><b>Sustento:</b> ${esc(x.comentarioJefatura||"")}</div>`:""}
      <label>Resultado</label><select id="mv517c5Resultado"><option value="">Seleccione...</option><option value="BONO" ${actual==="BONO"?"selected":""}>BONO excepcional</option><option value="NO BONO" ${actual==="NO BONO"?"selected":""}>NO BONO</option></select>
      <div id="mv517c5PuntosWrap" style="display:${actual==="BONO"?"block":"none"}"><label>Puntaje VTR/GAR</label><input id="mv517c5Puntos" type="number" min="0" step="0.1" value="${esc(puntos)}"></div>
      <label>Comentario / sustento de Jefatura</label><textarea id="mv517c5Comentario" placeholder="Indique el sustento de la evaluación">${esc(x.bonoExcepcional?x.comentarioJefatura||"":"")}</textarea>
      <div class="mv517c1-actions"><button type="button" class="mv517c1-btn" id="mv517c5Guardar">Guardar evaluación</button></div>`;
    (footer||modal).insertAdjacentElement(footer?"beforebegin":"beforeend",sec);
    sec.querySelector("#mv517c5Resultado").addEventListener("change",e=>{sec.querySelector("#mv517c5PuntosWrap").style.display=e.target.value==="BONO"?"block":"none";});
    sec.querySelector("#mv517c5Guardar").addEventListener("click",()=>guardarExcepcion(id,modal));
  }

  function parchearGestion(){
    if(gestionParcheada||typeof window.mv517c1Gestionar!=="function")return false;
    const base=window.mv517c1Gestionar;
    window.mv517c1Gestionar=function(kind,id,validacionId,noEstandar){
      const r=base.apply(this,arguments);setTimeout(()=>inyectarExcepcion(kind,id,validacionId,noEstandar),25);return r;
    };
    gestionParcheada=true;return true;
  }

  const obs=new MutationObserver(programar);
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open"]});
  const it=setInterval(()=>{if(parchearGestion())clearInterval(it);},100);
  setTimeout(()=>clearInterval(it),15000);
})();
