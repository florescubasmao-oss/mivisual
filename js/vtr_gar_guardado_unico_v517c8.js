/* ============================================================
   MI VISUAL V517C.8 - GUARDADO UNICO GAR/VTR
   FRONTEND ADITIVO

   - Un solo boton Guardar cambios para responsabilidad + evaluacion.
   - Elimina el guardado separado de bono excepcional.
   - No reconstruye toda la consolidacion al terminar.
   - Mantiene abierto el mismo ticket y actualiza visualmente el caso.
   - Backend/Sheets/Ranking/Dashboard/Produccion: sin cambios.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C8_GUARDADO_UNICO_OK) return;
  window.MV517C8_GUARDADO_UNICO_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  let instalado=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function periodo(){return txt((window.MV517C5_DATA||{}).periodo||document.getElementById("mv517c1Periodo")?.value||"");}

  async function apiPost(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
    const t=await r.text();let j;try{j=JSON.parse(t);}catch(_){throw new Error("El backend no devolvio una respuesta valida.");}
    if(!j||!j.ok)throw new Error((j&&j.error)||"No se pudo completar el guardado.");
    return j;
  }

  function toast(msg,err){
    let e=document.getElementById("mv517c8-toast");
    if(!e){e=document.createElement("div");e.id="mv517c8-toast";e.style.cssText="position:fixed;right:16px;bottom:54px;z-index:25000;max-width:360px;padding:10px 12px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.22);font:800 11px Arial";document.body.appendChild(e);}
    e.style.background=err?"#fee2e2":"#dcfce7";e.style.color=err?"#991b1b":"#166534";e.textContent=msg;e.style.display="block";
    clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3500);
  }

  function cardTicket(id){
    return Array.from(document.querySelectorAll(".mv517c1-case")).find(c=>norm(c.querySelector(".mv517c1-ticket")?.textContent)===norm(id))||null;
  }
  function setBadge(card,matcher,text,clase){
    if(!card)return;
    let b=Array.from(card.querySelectorAll(".mv517c1-badge")).find(x=>matcher(norm(x.textContent)));
    if(!b){const wrap=card.querySelector(".mv517c1-badges");if(!wrap)return;b=document.createElement("span");wrap.appendChild(b);}
    b.className="mv517c1-badge "+(clase||"");b.textContent=text;
  }
  function setField(card,label,value){
    if(!card)return;
    const f=Array.from(card.querySelectorAll(".mv517c1-field")).find(x=>norm(x.querySelector("small")?.textContent)===norm(label));
    if(f&&f.querySelector("b"))f.querySelector("b").textContent=value;
  }

  function actualizarCard(id,decision,cuad,resultado,esExcepcion){
    const card=cardTicket(id);if(!card)return;
    if(decision&&decision!=="SIN_CAMBIO"){
      if(decision==="CORRESPONDE"){
        setBadge(card,t=>t.includes("RESP." )||t.includes("RESPONSABLE"),"RESPONSABLE CONFIRMADO","ok");
        const ejecutora=Array.from(card.querySelectorAll(".mv517c1-field")).find(x=>norm(x.querySelector("small")?.textContent)==="CUADRILLA EJECUTORA")?.querySelector("b")?.textContent||"";
        setField(card,"RESPONSABLE",ejecutora||"CONFIRMADO");
      }else if(decision==="REASIGNAR"){
        setBadge(card,t=>t.includes("RESP." )||t.includes("RESPONSABLE"),"RESPONSABLE REASIGNADO","info");
        setField(card,"RESPONSABLE",cuad||"REASIGNADO");
      }else if(decision==="NO_ES_GAR_VTR"){
        setBadge(card,t=>t.includes("RESP." )||t.includes("RESPONSABLE")||t.includes("NO ES GAR"),"NO ES GAR/VTR","dark");
        setField(card,"RESPONSABLE","NO APLICA");
      }else if(decision==="ANULAR"){
        setBadge(card,t=>t.includes("RESP." )||t.includes("RESPONSABLE")||t.includes("ANUL"),"ANULADO","bad");
        setField(card,"RESPONSABLE","ANULADO");
      }
    }
    if(resultado&&resultado!=="SIN_CAMBIO"){
      const r=norm(resultado);
      let label=r,clase="ok";
      if(r==="NO BONO"){label="NO BONO";clase="info";}
      if(r==="OBSERVADO"){label="OBSERVADO";clase="obs";}
      if(esExcepcion){label=(r==="BONO"?"BONO":"NO BONO")+" · EXCEPCION";clase="info";}
      setBadge(card,t=>t.includes("BONO")||t.includes("OBSERV"),label,clase);
      setField(card,"BONO",label);
    }
    card.open=true;
    setTimeout(()=>card.scrollIntoView({behavior:"smooth",block:"center"}),50);
  }

  function configurar(kind,id,validacionId,noEstandar){
    const bg=Array.from(document.querySelectorAll(".mv517c1-modalbg")).pop();
    const modal=bg&&bg.querySelector(".mv517c1-modal");if(!modal)return;
    const btnInterno=modal.querySelector("#mv517c5Guardar");
    if(btnInterno){btnInterno.closest(".mv517c1-actions")?.remove();}
    const btn=modal.querySelector("#mv517c1Guardar");if(!btn||btn.dataset.mv517c8)return;
    btn.dataset.mv517c8="1";btn.textContent="Guardar cambios";
    const footer=modal.querySelector(".mv517c1-footer");
    if(footer&&!footer.querySelector(".mv517c8-ayuda")){
      const n=document.createElement("div");n.className="mv517c8-ayuda";n.style.cssText="width:100%;font-size:8px;color:#475569;text-align:right;margin-bottom:2px";n.textContent="Un solo guardado aplica todos los cambios seleccionados en este caso.";footer.prepend(n);
    }

    btn.onclick=async function(){
      const dec=modal.querySelector("#mv517c1Decision");
      const decision=dec?dec.value:"SIN_CAMBIO";
      const cuad=txt(modal.querySelector("#mv517c1Cuad")?.value);
      const comentarioClas=txt(modal.querySelector("#mv517c1ComClas")?.value);
      const bono=modal.querySelector("#mv517c1Bono");
      const resultadoNormal=bono?bono.value:"SIN_CAMBIO";
      const comentarioNormal=txt(modal.querySelector("#mv517c1ComBono")?.value);
      let puntajeNormal=Number(modal.querySelector("#mv517c1Punt")?.value||0);

      const exSel=modal.querySelector("#mv517c5Resultado");
      const resultadoEx=exSel?exSel.value:"";
      const comentarioEx=txt(modal.querySelector("#mv517c5Comentario")?.value);
      let puntajeEx=Number(modal.querySelector("#mv517c5Puntos")?.value||0);

      const hayClas=decision!=="SIN_CAMBIO";
      const hayNormal=!!bono&&resultadoNormal!=="SIN_CAMBIO";
      const hayEx=!!exSel&&!!resultadoEx;
      if(!hayClas&&!hayNormal&&!hayEx){alert("No has seleccionado cambios.");return;}
      if(decision==="REASIGNAR"&&!cuad){alert("Seleccione la cuadrilla responsable.");return;}
      if((decision==="ANULAR"||decision==="NO_ES_GAR_VTR")&&!comentarioClas){alert("Ingrese el motivo de la clasificacion.");return;}
      if((decision==="ANULAR"||decision==="NO_ES_GAR_VTR")&&hayEx){alert("No corresponde otorgar Bono excepcional si el caso se anula o se define como NO ES GAR/VTR.");return;}
      if(hayNormal){
        if(!comentarioNormal){alert(resultadoNormal==="OBSERVADO"?"Ingrese el motivo de la observacion.":"Ingrese el comentario de Bono / No Bono.");return;}
        if(resultadoNormal==="BONO"&&(!isFinite(puntajeNormal)||puntajeNormal<=0)){alert("Ingrese un puntaje mayor a 0.");return;}
      }
      if(hayEx){
        if(!comentarioEx){alert("Ingrese el sustento de la evaluacion excepcional.");return;}
        if(resultadoEx==="BONO"&&(!isFinite(puntajeEx)||puntajeEx<=0)){alert("Ingrese un puntaje mayor a 0.");return;}
      }

      btn.disabled=true;btn.textContent="Guardando todo...";
      const cancelar=modal.querySelector("#mv517c1Cancelar");if(cancelar)cancelar.disabled=true;
      try{
        if(hayClas){
          const p={accion:"clasificarVtrGarV517A",usuario:usuario(),periodo:periodo(),decision:decision,observacion:comentarioClas};
          if(kind==="TICKET")p.ticket=id;else p.clave=id;if(cuad)p.cuadrillaResponsable=cuad;
          await apiPost(p);
        }
        if(hayNormal){
          if(resultadoNormal==="OBSERVADO"){
            await apiPost({accion:"validarValidacionTecnica",usuario:usuario(),id:validacionId,resultado:"OBSERVADO",motivoValidacion:comentarioNormal});
          }else{
            await apiPost({accion:"validarBonoVtrGarV515",usuario:usuario(),id:validacionId,resultado:resultadoNormal,puntajeVtrGar:resultadoNormal==="BONO"?puntajeNormal:0,motivo:comentarioNormal});
          }
        }
        if(hayEx){
          await apiPost({accion:"validarBonoExcepcionalVtrGarV517C5",usuario:usuario(),periodo:periodo(),ticket:id,resultado:resultadoEx,puntajeVtrGar:resultadoEx==="BONO"?puntajeEx:0,motivo:comentarioEx});
        }
        bg.remove();
        actualizarCard(id,decision,cuad,hayNormal?resultadoNormal:(hayEx?resultadoEx:"SIN_CAMBIO"),hayEx);
        toast("Cambios guardados correctamente. El caso queda actualizado en esta misma vista.",false);
      }catch(e){
        btn.disabled=false;btn.textContent="Guardar cambios";if(cancelar)cancelar.disabled=false;
        toast(e.message||String(e),true);alert(e.message||String(e));
      }
    };
  }

  function instalar(){
    if(instalado||typeof window.mv517c1Gestionar!=="function")return false;
    const base=window.mv517c1Gestionar;
    window.mv517c1Gestionar=function(kind,id,validacionId,noEstandar){
      const r=base.apply(this,arguments);
      setTimeout(()=>configurar(kind,id,validacionId,noEstandar),90);
      setTimeout(()=>configurar(kind,id,validacionId,noEstandar),220);
      return r;
    };
    instalado=true;return true;
  }

  const it=setInterval(()=>{if(instalar())clearInterval(it);},100);
  setTimeout(()=>clearInterval(it),15000);
})();
