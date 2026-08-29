/* ============================================================
   MI VISUAL V517D F4M - RENDIMIENTO GAR/VTR
   29/08/2026

   SOLO RENDIMIENTO / UX:
   - Vista GAR/VTR inmediata desde ultimo snapshot valido (30 min).
   - Refresco backend en segundo plano.
   - Clasificacion + Bono/No Bono en una sola llamada cuando backend F4M esta activo.
   - Fallback automatico a rutas historicas si backend F4M aun no fue desplegado.
   - Evita reconstruccion completa despues de guardar.
   - No cambia reglas, puntajes, responsables, Produccion ni Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4M_RENDIMIENTO_OK) return;
  window.MV517D_F4M_RENDIMIENTO_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const PREV_FETCH=window.fetch.bind(window);
  const PREF="MV517D4M|LISTA|";
  const TTL=30*60*1000;
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const periodo=()=>txt(document.getElementById("mv517c1Periodo")?.value||ultimoSnapshot()?.periodo||new Date().toISOString().slice(0,7));

  function response(data){return Promise.resolve(new Response(JSON.stringify(data),{status:200,headers:{"Content-Type":"application/json;charset=utf-8"}}));}
  function key(user,p){return PREF+norm(user||usuario())+"|"+txt(p||"AUTO");}
  function get(k,maxAge=TTL){try{const o=JSON.parse(localStorage.getItem(k)||"null");return o&&o.data&&Date.now()-Number(o.ts||0)<=maxAge?o:null;}catch(_){return null;}}
  function set(k,data){if(!data||!data.ok)return;try{localStorage.setItem(k,JSON.stringify({ts:Date.now(),data}));}catch(_){}}
  function keysUser(user){const u=norm(user||usuario()),a=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(PREF+u+"|"))a.push(k);}}catch(_){}return a;}
  function ultimoSnapshot(){
    let best=null;
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k)continue;
        if(k.startsWith(PREF)||k.startsWith("MV517C7|LISTA|")){
          const o=JSON.parse(localStorage.getItem(k)||"null");
          if(o&&o.data&&o.data.ok&&(!best||Number(o.ts||0)>Number(best.ts||0)))best=o;
        }
      }
    }catch(_){}
    return best&&best.data||null;
  }
  function importarC7(){
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k||!k.startsWith("MV517C7|LISTA|"))continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");if(!o||!o.data||!o.data.ok)continue;
        const p=txt(o.data.periodo||k.split("|").pop()||"AUTO");
        const fk=key(usuario(),p);if(!get(fk,24*60*60*1000))set(fk,o.data);
      }
    }catch(_){}
  }
  importarC7();

  async function leerJson(r){try{const t=await r.clone().text(),j=JSON.parse(t);return j;}catch(_){return null;}}
  function guardarListado(b,j){if(!j||!j.ok)return;set(key(b.usuario,b.periodo||"AUTO"),j);if(j.periodo)set(key(b.usuario,j.periodo),j);}
  function refrescar(input,init,b){setTimeout(async()=>{try{const r=await PREV_FETCH(input,init);const j=await leerJson(r);guardarListado(b,j);}catch(_){}},80);}

  function patchData(d,p){
    if(!d||!d.ok||!p)return;
    const arr=Array.isArray(d.incidencias)?d.incidencias:[];
    const x=arr.find(z=>norm(z.ticket)===norm(p.ticket));if(!x)return;
    const dr=norm(p.decisionResponsabilidad||"SIN_CAMBIO");
    if(dr==="CORRESPONDE"){x.estadoResponsabilidad="CONFIRMADO";x.estadoDecision="CONFIRMADO";x.cuadrillaResponsable=x.cuadrillaEjecutora;x.responsabilidadDefinida=true;x.requiereClasificacion=false;x.decisionJefaturaValida=true;}
    else if(dr==="REASIGNAR"){x.estadoResponsabilidad="REASIGNADO";x.estadoDecision="REASIGNADO";x.cuadrillaResponsable=txt(p.cuadrillaResponsable);x.responsabilidadDefinida=true;x.requiereClasificacion=false;x.decisionJefaturaValida=true;}
    else if(dr==="NO_ES_GAR_VTR"){x.estadoResponsabilidad="NO_ES_GAR_VTR";x.estadoDecision="NO_ES_GAR_VTR";x.cuadrillaResponsable="";x.requiereClasificacion=false;x.decisionJefaturaValida=true;x.bonoHabilitado=false;x.puntajeVtrGarActivo=0;}
    else if(dr==="ANULAR"){x.estadoResponsabilidad="ANULADO";x.estadoDecision="ANULADO";x.cuadrillaResponsable="";x.requiereClasificacion=false;x.decisionJefaturaValida=true;x.bonoHabilitado=false;x.puntajeVtrGarActivo=0;}
    const rr=norm(p.resultadoRegistro||"SIN_CAMBIO");
    if(rr!=="SIN_CAMBIO"){
      const vis=rr==="NO_BONO"?"NO BONO":rr;
      x.bono=vis;x.estadoRegistroTecnico=vis;x.requiereBono=false;
      x.puntajeVtrGar=vis==="BONO"?Number(p.puntajeVtrGar)||0:(vis==="NO BONO"?0:x.puntajeVtrGar);
      const esGar=["CONFIRMADO","REASIGNADO"].includes(norm(x.estadoResponsabilidad||x.estadoDecision));
      x.puntajeVtrGarActivo=esGar&&vis==="BONO"?(Number(p.puntajeVtrGar)||0):0;
      x.comentarioJefatura=txt(p.sustentoResultado||x.comentarioJefatura);
      x.validadoPor=txt(p.usuario||x.validadoPor);
    }
  }
  function patchCaches(p){
    try{
      keysUser(p.usuario).forEach(k=>{const o=get(k,24*60*60*1000);if(!o)return;patchData(o.data,p);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));});
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);if(!k||!k.startsWith("MV517C7|LISTA|"))continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");if(o&&o.data&&o.data.ok){patchData(o.data,p);o.ts=Date.now();localStorage.setItem(k,JSON.stringify(o));}
      }
      Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));
    }catch(_){}
  }
  function borrarCachesListado(){
    try{keysUser(usuario()).forEach(k=>localStorage.removeItem(k));}catch(_){}
  }
  function calentarListado(p){
    setTimeout(()=>{
      const b={accion:"listarVtrGarV517A",usuario:usuario(),periodo:p||periodo()};
      PREV_FETCH(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(b)})
        .then(async r=>guardarListado(b,await leerJson(r))).catch(()=>{});
    },250);
  }

  window.fetch=function(input,init){
    let b=null;
    try{if(norm(init&&init.method||"GET")==="POST"&&typeof init?.body==="string")b=JSON.parse(init.body);}catch(_){}
    if(b&&b.accion==="listarVtrGarV517A"){
      const hit=get(key(b.usuario,b.periodo||"AUTO")) || (!b.periodo?get(key(b.usuario,periodo())):null);
      if(hit){refrescar(input,init,b);return response(hit.data);}
      return PREV_FETCH(input,init).then(async r=>{guardarListado(b,await leerJson(r));return r;});
    }
    const escritura=b&&["guardarGestionVtrGarV517D4M","corregirValidacionVtrGarV517C13","clasificarVtrGarV517A","validarBonoVtrGarV515","validarValidacionTecnica","validarBonoExcepcionalVtrGarV517C5"].includes(b.accion);
    if(escritura){
      return PREV_FETCH(input,init).then(async r=>{
        const j=await leerJson(r);
        if(j&&j.ok){
          if(b.accion==="guardarGestionVtrGarV517D4M")patchCaches(b);
          else if(b.ticket&&b.accion==="corregirValidacionVtrGarV517C13")patchCaches({usuario:b.usuario,periodo:b.periodo,ticket:b.ticket,decisionResponsabilidad:b.decisionResponsabilidad,cuadrillaResponsable:b.cuadrillaResponsable,resultadoRegistro:b.resultadoRegistro,puntajeVtrGar:b.puntajeVtrGar,sustentoResultado:b.sustento});
          calentarListado(b.periodo||periodo());
        }
        return r;
      });
    }
    if(b&&b.accion==="validarCandidatoNormalGarVtrV517D4L"){
      return PREV_FETCH(input,init).then(async r=>{const j=await leerJson(r);if(j&&j.ok){borrarCachesListado();calentarListado(b.periodo||periodo());}return r;});
    }
    return PREV_FETCH(input,init);
  };

  async function post(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload||{})});
    const t=await r.text();let j;try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida del backend.");}
    if(!j||!j.ok)throw new Error(j&&j.error||"No se pudo guardar GAR/VTR.");
    return j;
  }
  function caso(ticket){const d=ultimoSnapshot()||{};return (d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;}
  function validacionId(ticket){
    const x=caso(ticket);if(txt(x&&x.validacionId))return txt(x.validacionId);
    const card=Array.from(document.querySelectorAll(".mv517c1-case")).find(c=>norm(c.querySelector(".mv517c1-ticket")?.textContent).startsWith(norm(ticket)));
    const s=txt(card?.querySelector("button[onclick*='mv517c1Gestionar']")?.getAttribute("onclick"));
    const m=s.match(/mv517c1Gestionar\('TICKET','[^']*','([^']*)'/i);return txt(m&&m[1]);
  }
  function ticketModal(modal){const m=txt(modal?.querySelector("h3")?.textContent).match(/(?:GAR|VTR)-\d+/i);return m?m[0].toUpperCase():"";}
  function estadoPorDecision(v,ticket){
    const d=norm(v);if(d==="CORRESPONDE")return"CONFIRMADO";if(d==="REASIGNAR")return"REASIGNADO";if(d==="NO_ES_GAR_VTR")return"NO_ES_GAR_VTR";if(d==="ANULAR")return"ANULADO";
    const x=caso(ticket);return norm(x&&x.estadoResponsabilidad||x&&x.estadoDecision||"PENDIENTE");
  }
  function esSi(v){return ["CONFIRMADO","REASIGNADO"].includes(norm(v));}
  function toast(msg){let e=document.getElementById("mv517d-f4m-toast");if(!e){e=document.createElement("div");e.id="mv517d-f4m-toast";e.style.cssText="position:fixed;right:16px;bottom:20px;z-index:26000;background:#dcfce7;color:#166534;border-radius:10px;padding:10px 12px;font:800 10px Arial;box-shadow:0 8px 24px rgba(0,0,0,.2)";document.body.appendChild(e);}e.textContent=msg;e.style.display="block";setTimeout(()=>{if(e)e.style.display="none";},3500);}
  function actualizarTarjeta(ticket,p){
    const card=Array.from(document.querySelectorAll(".mv517c1-case")).find(c=>norm(c.querySelector(".mv517c1-ticket")?.textContent).startsWith(norm(ticket)));if(!card)return;
    const bs=card.querySelector(".mv517c1-badges"),dr=norm(p.decisionResponsabilidad||"SIN_CAMBIO"),rr=norm(p.resultadoRegistro||"SIN_CAMBIO");
    if(bs&&dr!=="SIN_CAMBIO"){
      Array.from(bs.querySelectorAll(".mv517c1-badge")).filter(b=>norm(b.textContent).includes("RESP")||["NO ES GAR/VTR","ANULADO"].includes(norm(b.textContent))).forEach(b=>b.remove());
      const b=document.createElement("span");b.className="mv517c1-badge ";if(dr==="CORRESPONDE"){b.className+="ok";b.textContent="RESP. CONFIRMADA";}else if(dr==="REASIGNAR"){b.className+="info";b.textContent="RESP. REASIGNADA";}else if(dr==="NO_ES_GAR_VTR"){b.className+="dark";b.textContent="NO ES GAR/VTR";}else{b.className+="bad";b.textContent="ANULADO";}bs.appendChild(b);
    }
    if(bs&&rr!=="SIN_CAMBIO"){
      Array.from(bs.querySelectorAll(".mv517c1-badge")).filter(b=>norm(b.textContent).includes("BONO")||norm(b.textContent).includes("OBSERV")).forEach(b=>b.remove());
      const b=document.createElement("span");b.className="mv517c1-badge ";if(rr==="BONO"){b.className+="ok";b.textContent="● BONO";}else if(rr==="NO BONO"){b.className+="info";b.textContent="● NO BONO";}else{b.className+="obs";b.textContent="● OBSERVADO";}bs.appendChild(b);
    }
  }

  async function guardarUnificado(payload){
    try{return await post(Object.assign({accion:"guardarGestionVtrGarV517D4M"},payload));}
    catch(e){
      if(payload.decisionResponsabilidad&&payload.decisionResponsabilidad!=="SIN_CAMBIO"){
        await post({accion:"clasificarVtrGarV517A",usuario:payload.usuario,periodo:payload.periodo,ticket:payload.ticket,decision:payload.decisionResponsabilidad,cuadrillaResponsable:payload.cuadrillaResponsable,observacion:payload.sustentoClasificacion});
      }
      if(payload.resultadoRegistro&&payload.resultadoRegistro!=="SIN_CAMBIO"){
        if(payload.validacionId){
          if(payload.resultadoRegistro==="OBSERVADO")await post({accion:"validarValidacionTecnica",usuario:payload.usuario,id:payload.validacionId,resultado:"OBSERVADO",motivoValidacion:payload.sustentoResultado});
          else await post({accion:"validarBonoVtrGarV515",usuario:payload.usuario,id:payload.validacionId,resultado:payload.resultadoRegistro,puntajeVtrGar:payload.puntajeVtrGar,motivo:payload.sustentoResultado});
        }else{
          await post({accion:"validarBonoExcepcionalVtrGarV517C5",usuario:payload.usuario,periodo:payload.periodo,ticket:payload.ticket,resultado:payload.resultadoRegistro,puntajeVtrGar:payload.puntajeVtrGar,motivo:payload.sustentoResultado});
        }
      }
      return {ok:true,fallbackHistorico:true};
    }
  }

  async function guardarGestion(modal,btn,ev,correccionSinRegistro){
    const ticket=ticketModal(modal);if(!ticket)return false;
    const dec=modal.querySelector(correccionSinRegistro?"#mv16Resp":"#mv517c1Decision");if(!dec)return false;
    const sec=modal.querySelector("#mv517dF4HSinRegistro");
    const esF4H=!!sec&&sec.style.display!=="none";
    const regSel=esF4H?sec.querySelector("#mv517dF4HResultado"):modal.querySelector("#mv517c1Bono");
    const decision=txt(dec.value||"SIN_CAMBIO");
    const resultado=txt(regSel?.value||"SIN_CAMBIO");
    const cuad=txt(modal.querySelector(correccionSinRegistro?"#mv16Cuad":"#mv517c1Cuad")?.value);
    const sustClas=txt(modal.querySelector(correccionSinRegistro?"#mv16Sus":"#mv517c1ComClas")?.value)||(esF4H?txt(sec.querySelector("#mv517dF4HComentario")?.value):"");
    const sustRes=esF4H?txt(sec.querySelector("#mv517dF4HComentario")?.value):txt(modal.querySelector("#mv517c1ComBono")?.value);
    const vid=correccionSinRegistro?"":validacionId(ticket);
    let pts=0;

    if(decision==="SIN_CAMBIO"&&(resultado==="SIN_CAMBIO"||!resultado)){alert("No has seleccionado cambios.");return true;}
    if(decision==="REASIGNAR"&&!cuad){alert("Seleccione la cuadrilla responsable.");return true;}
    if((decision==="NO_ES_GAR_VTR"||decision==="ANULAR")&&!sustClas){alert("Ingrese el motivo de la clasificacion.");return true;}
    if(esF4H&&esSi(estadoPorDecision(decision,ticket))&&!resultado){alert("Si el caso SI ES GAR/VTR, seleccione BONO o NO BONO.");return true;}
    if(resultado&&resultado!=="SIN_CAMBIO"){
      if(!sustRes){alert(resultado==="OBSERVADO"?"Ingrese el motivo de la observacion.":"Ingrese el sustento de BONO / NO BONO.");return true;}
      if(resultado==="BONO"){
        pts=Number(esF4H?sec.querySelector("#mv517dF4HPuntos")?.value:modal.querySelector("#mv517c1Punt")?.value);
        if(!Number.isFinite(pts)||pts<=0){alert("Ingrese un puntaje VTR/GAR mayor a 0 para BONO.");return true;}
      }
    }

    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    const old=btn.textContent;btn.disabled=true;btn.textContent="Guardando...";
    const payload={usuario:usuario(),periodo:periodo(),ticket,validacionId:vid,decisionResponsabilidad:decision,cuadrillaResponsable:cuad,resultadoRegistro:resultado||"SIN_CAMBIO",puntajeVtrGar:pts,sustentoClasificacion:sustClas,sustentoResultado:sustRes};
    try{
      await guardarUnificado(payload);
      patchCaches(payload);actualizarTarjeta(ticket,payload);
      modal.closest(".mv517c1-modalbg")?.remove();
      toast("✅ Guardado. La vista se actualiza en segundo plano.");
      calentarListado(payload.periodo);
    }catch(e){btn.disabled=false;btn.textContent=old;alert(e.message||e);}
    return true;
  }

  async function guardarF4L(btn,ev){
    const card=btn.closest(".mv517d-f4l-card");if(!card)return false;
    const orden=txt(card.querySelector(".mv517d-f4l-order")?.textContent).match(/\d+/)?.[0]||"";
    const tipo=txt(card.querySelector("select[id*='f4l-tipo']")?.value);
    const decision=txt(card.querySelector("select[id*='f4l-dec']")?.value);
    const resp=txt(card.querySelector("select[id*='f4l-resp']")?.value);
    const sus=txt(card.querySelector("textarea[id*='f4l-sus']")?.value);
    if(!orden||!tipo||!decision||!sus)return false;
    if(decision==="SI_ES_GAR_VTR"&&!resp){alert("Seleccione la cuadrilla responsable.");return true;}
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    const old=btn.textContent;btn.disabled=true;btn.textContent="Guardando...";
    try{
      await post({accion:"validarCandidatoNormalGarVtrV517D4L",usuario:usuario(),periodo:periodo(),ordenId:orden,tipo,decision,cuadrillaResponsable:resp,observacion:sus});
      card.remove();
      const count=document.getElementById("mv517d-f4l-count");if(count){const n=Math.max(0,(parseInt(count.textContent)||1)-1);count.textContent=n+" caso(s) para revision";}
      toast(decision==="SI_ES_GAR_VTR"?"✅ Caso trasladado a GAR/VTR. Bono queda pendiente de validacion.":"✅ Validado NO ES GAR/VTR. Permanece en Produccion.");
      borrarCachesListado();calentarListado(periodo());
    }catch(e){btn.disabled=false;btn.textContent=old;alert(e.message||e);}
    return true;
  }

  document.addEventListener("click",function(ev){
    const f4l=ev.target?.closest?.("[data-f4l-save]");if(f4l){guardarF4L(f4l,ev);return;}
    const btn=ev.target?.closest?.("#mv517c1Guardar,#mv16Guardar");if(!btn)return;
    const modal=btn.closest(".mv517c1-modal");if(!modal)return;
    if(btn.id==="mv16Guardar"){
      const sec=modal.querySelector("#mv517dF4HSinRegistro");
      if(!sec||sec.style.display==="none")return;
      guardarGestion(modal,btn,ev,true);return;
    }
    guardarGestion(modal,btn,ev,false);
  },true);

  console.log("MI VISUAL V517D F4M: rendimiento GAR/VTR activo; cache local + guardado unificado.");
})();