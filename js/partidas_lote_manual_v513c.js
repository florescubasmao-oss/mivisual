/* ============================================================
   MI VISUAL V513C2 - LOTE MANUAL + GUARDADO SEGURO DEL EDITOR
   - Todas las propuestas IR/IC pueden marcarse manualmente.
   - Seleccionar todas solo toma CANDIDATA ALTA.
   - Ambigua / Partner / Observacion requieren seleccion expresa.
   - Una sola publicacion al finalizar el lote.
   - Guardar Partida/Cuadrilla muestra estado de proceso y bloquea doble clic.
   - Tras un guardado confirmado NO ejecuta una lectura adicional obligatoria.
   - Si Apps Script pierde la respuesta de un guardado, verifica por lectura;
     nunca repite automaticamente la escritura.
============================================================ */
(function(){
  "use strict";
  if(window.MV513C_LOTE_MANUAL_OK) return;
  window.MV513C_LOTE_MANUAL_OK=true;

  const seleccion=new Map();
  let observador=null;
  let timer=null;
  let procesando=false;
  let guardandoEditor=false;
  let guardadoEditorInstalado=false;

  const norm=v=>String(v==null?"":v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const usuario=()=>localStorage.getItem("usuario")||localStorage.getItem("correo")||"";
  const apiBase=()=>window.MI_VISUAL_API_URL||(typeof window.MV58_API!=="undefined"?window.MV58_API:"");

  function modal(){ return document.getElementById("mv505PartidasModal"); }
  function periodo(){ return modal()?.querySelector("[data-mv513-periodo]")?.value||""; }

  async function apiPost(payload){
    const base=apiBase();
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(base,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},body:JSON.stringify(payload),cache:"no-store",redirect:"follow"});
    const t=(await r.text()).trim(); let j;
    try{ j=JSON.parse(t); }
    catch(_){ throw new Error("La API no devolvio una respuesta valida."); }
    if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo completar el lote.");
    return j;
  }

  /* ============================================================
     V526 - ESTADO VISIBLE Y CONFIRMACION SEGURA DEL EDITOR
     No cambia backend ni reglas V513. Solo controla la experiencia del
     guardado manual y evita que una lectura posterior haga parecer fallido
     un ajuste que el servidor ya confirmo.
  ============================================================ */
  function botonesEditor(){
    const m=modal();
    return {
      partida:m?.querySelector('button[onclick="mv513GuardarPartida()"]')||null,
      cuadrilla:m?.querySelector('button[onclick="mv513GuardarCuadrilla()"]')||null
    };
  }

  function cajaEstadoEditor(){
    const m=modal(); if(!m) return null;
    let box=m.querySelector("[data-mv513c-estado-editor]");
    if(box) return box;
    const b=botonesEditor();
    const fila=b.partida?.parentElement||b.cuadrilla?.parentElement;
    if(!fila) return null;
    box=document.createElement("div");
    box.setAttribute("data-mv513c-estado-editor","");
    box.style.cssText="display:none;margin-top:8px;padding:9px 10px;border-radius:9px;font-size:10px;font-weight:900;line-height:1.4";
    fila.insertAdjacentElement("afterend",box);
    return box;
  }

  function bloquearEditor(tipo,activo){
    const bs=botonesEditor();
    [bs.partida,bs.cuadrilla].forEach(b=>{
      if(!b) return;
      if(activo){
        if(!b.dataset.mv513cTexto) b.dataset.mv513cTexto=b.textContent||"";
        if(!b.dataset.mv513cDisabled) b.dataset.mv513cDisabled=b.disabled?"1":"0";
        b.disabled=true;
        b.style.opacity=".62";
        b.style.cursor="wait";
      }else{
        b.disabled=b.dataset.mv513cDisabled==="1";
        if(b.dataset.mv513cTexto) b.textContent=b.dataset.mv513cTexto;
        b.style.opacity=b.disabled?".5":"1";
        b.style.cursor=b.disabled?"not-allowed":"pointer";
        delete b.dataset.mv513cTexto;
        delete b.dataset.mv513cDisabled;
      }
    });
    if(activo){
      const objetivo=tipo==="cuadrilla"?bs.cuadrilla:bs.partida;
      if(objetivo) objetivo.textContent=tipo==="cuadrilla"?"⏳ Guardando Cuadrilla...":"⏳ Guardando Partida...";
    }
  }

  function mostrarEstadoEditor(tipo,mensaje){
    const box=cajaEstadoEditor(); if(!box) return;
    const estilos={
      cargando:["#eff6ff","#1d4ed8","#93c5fd"],
      verificando:["#fff7ed","#9a3412","#fdba74"],
      ok:["#f0fdf4","#166534","#86efac"],
      aviso:["#fffbeb","#92400e","#fcd34d"],
      error:["#fef2f2","#991b1b","#fca5a5"]
    }[tipo]||["#f8fafc","#475569","#cbd5e1"];
    box.style.display="block";
    box.style.background=estilos[0];
    box.style.color=estilos[1];
    box.style.border=`1px solid ${estilos[2]}`;
    box.textContent=mensaje;
  }

  function respuestaIncierta(msg){
    const t=norm(msg);
    return t.includes("RESPUESTA VALIDA") || t.includes("NO DEVOLVIO") ||
      t.includes("FAILED TO FETCH") || t.includes("NETWORK") ||
      t.includes("LOAD FAILED") || t.includes("HTML");
  }

  function valorAjusteResultado(x,tipo){
    if(!x) return "";
    if(tipo==="cuadrilla") return x.ajusteCuadrilla?.cuadrillaEfectiva||x.cuadrillaEfectiva||x.cuadrillaWin||"";
    return x.ajustePartida?.partidaPropuesta||x.partidaEfectiva||x.partidaWin||"";
  }

  async function verificarGuardado(tipo,ordenId,esperado){
    const r=await apiPost({accion:"buscarOrdenPartidasV513",usuario:usuario(),periodo:periodo(),busqueda:String(ordenId)});
    const lista=Array.isArray(r?.resultados)?r.resultados:[];
    const x=lista.find(v=>String(v.ordenId)===String(ordenId))||lista[0]||null;
    return norm(valorAjusteResultado(x,tipo))===norm(esperado);
  }

  function envolverGuardado(base,tipo){
    if(typeof base!=="function") return base;
    if(base.__mv513cGuardadoSeguro) return base;
    const f=async function(){
      if(guardandoEditor) return;

      const esperado=tipo==="cuadrilla"
        ? (document.querySelector("[data-mv513-cuadrilla]")?.value||"")
        : (document.querySelector("[data-mv513-partida]")?.value||"");
      let ordenId="";
      let aceptado=false;
      let exito="";
      let errorGuardado="";

      const alertBase=window.alert;
      const confirmBase=window.confirm;
      const buscarBase=window.mv513BuscarOrden;

      window.confirm=function(msg){
        const texto=String(msg||"");
        const m=texto.match(/Orden\s+([^\s\n]+)/i);
        if(m) ordenId=String(m[1]||"").trim();
        const ok=confirmBase.call(window,msg);
        if(ok){
          aceptado=true;
          guardandoEditor=true;
          bloquearEditor(tipo,true);
          mostrarEstadoEditor("cargando",tipo==="cuadrilla"?"⏳ Guardando cuadrilla efectiva. No cierre esta ventana...":"⏳ Guardando partida efectiva y actualizando los indicadores relacionados. No cierre esta ventana...");
        }
        return ok;
      };

      window.alert=function(msg){
        const texto=String(msg||"");
        if(tipo==="partida" && texto.startsWith("✅ Partida guardada")){exito=texto;return;}
        if(tipo==="cuadrilla" && texto.startsWith("✅ Cuadrilla efectiva guardada")){exito=texto;return;}
        if(tipo==="partida" && texto.startsWith("No se pudo guardar Partida:")){errorGuardado=texto;return;}
        if(tipo==="cuadrilla" && texto.startsWith("No se pudo guardar Cuadrilla:")){errorGuardado=texto;return;}
        return alertBase.call(window,msg);
      };

      // El guardado base ya fue confirmado por el backend. Evitamos que su
      // lectura inmediata posterior convierta un guardado exitoso en un falso error.
      if(typeof buscarBase==="function") window.mv513BuscarOrden=async function(){ return null; };

      try{
        await base.apply(this,arguments);
      }finally{
        window.alert=alertBase;
        window.confirm=confirmBase;
        if(typeof buscarBase==="function") window.mv513BuscarOrden=buscarBase;
      }

      if(!aceptado){
        guardandoEditor=false;
        bloquearEditor(tipo,false);
        return;
      }

      if(exito){
        guardandoEditor=false;
        bloquearEditor(tipo,false);
        const detalle=tipo==="cuadrilla"?"Cuadrilla efectiva guardada correctamente.":"Partida efectiva guardada correctamente.";
        mostrarEstadoEditor("ok",`✅ ${detalle} Orden ${ordenId||"confirmada"}. El historial quedó registrado.`);
        alertBase.call(window,exito+"\n\n✅ Registro confirmado.");
        return;
      }

      if(errorGuardado && respuestaIncierta(errorGuardado) && ordenId && esperado){
        mostrarEstadoEditor("verificando","🔎 Google no confirmó la respuesta. MI VISUAL está verificando si el ajuste quedó registrado; no se repetirá el guardado.");
        try{
          const confirmado=await verificarGuardado(tipo,ordenId,esperado);
          guardandoEditor=false;
          bloquearEditor(tipo,false);
          if(confirmado){
            mostrarEstadoEditor("ok",`✅ Ajuste verificado. Orden ${ordenId}: ${tipo==="cuadrilla"?"cuadrilla":"partida"} guardada correctamente.`);
            alertBase.call(window,`✅ ${tipo==="cuadrilla"?"Cuadrilla":"Partida"} guardada y verificada\n\nOrden ${ordenId}\nEl ajuste ya está registrado. No vuelva a guardarlo.`);
          }else{
            mostrarEstadoEditor("aviso","⚠️ No se pudo confirmar automáticamente el ajuste. MI VISUAL no volvió a enviar el guardado para evitar duplicados. Pulse Buscar y verifique la orden antes de intentar nuevamente.");
            alertBase.call(window,"⚠️ No se pudo confirmar si el ajuste quedó registrado.\n\nNo se repitió el guardado. Busque nuevamente la orden y verifique antes de volver a guardar.");
          }
          return;
        }catch(_){
          guardandoEditor=false;
          bloquearEditor(tipo,false);
          mostrarEstadoEditor("aviso","⚠️ No se pudo verificar el resultado del guardado por una falla temporal de Google. No se repitió la escritura. Busque nuevamente la orden antes de guardar otra vez.");
          alertBase.call(window,"⚠️ Google no permitió verificar el guardado.\n\nNo se repitió la escritura. Busque nuevamente la orden antes de volver a guardar.");
          return;
        }
      }

      guardandoEditor=false;
      bloquearEditor(tipo,false);
      if(errorGuardado){
        mostrarEstadoEditor("error",errorGuardado);
        alertBase.call(window,errorGuardado);
      }
    };
    f.__mv513cGuardadoSeguro=true;
    f.__base=base;
    return f;
  }

  function instalarGuardadoEditor(){
    if(guardadoEditorInstalado) return;
    if(typeof window.mv513GuardarPartida!=="function" || typeof window.mv513GuardarCuadrilla!=="function") return;
    window.mv513GuardarPartida=envolverGuardado(window.mv513GuardarPartida,"partida");
    window.mv513GuardarCuadrilla=envolverGuardado(window.mv513GuardarCuadrilla,"cuadrilla");
    guardadoEditorInstalado=true;
  }

  function categoria(card){
    const t=norm(card?.innerText||"");
    if(t.includes("CANDIDATA ALTA")) return "CANDIDATA_ALTA";
    if(t.includes("AMBIGUA")) return "AMBIGUA";
    if(t.includes("REVISAR CON PARTNER")) return "REVISAR_CON_PARTNER";
    if(t.includes("OBSERVACION")) return "OBSERVACION";
    return "OTRA";
  }

  function datosCard(btn){
    const raw=String(btn?.getAttribute("onclick")||"");
    const m=raw.match(/mv513ValidarIndividual\('([^']+)'\s*,\s*'([^']+)'\)/);
    if(!m) return null;
    const card=btn.closest("article");
    if(!card) return null;
    return {ordenId:String(m[1]),partidaPropuesta:String(m[2]),categoria:categoria(card),card};
  }

  function cards(){
    const m=modal();
    if(!m) return [];
    return Array.from(m.querySelectorAll('button[onclick*="mv513ValidarIndividual"]')).map(datosCard).filter(Boolean);
  }

  function ocultarLoteNativo(){
    const m=modal(); if(!m) return;
    m.querySelectorAll("input[data-mv513-select]").forEach(inp=>{
      const lab=inp.closest("label"); if(lab) lab.style.display="none";
    });
    const todos=m.querySelector("input[data-mv513-todos]");
    if(todos){
      const bar=todos.closest("div");
      if(bar) bar.style.display="none";
    }
  }

  function estiloCat(cat){
    if(cat==="CANDIDATA_ALTA") return ["#f0fdf4","#166534","#bbf7d0","Alta confianza"];
    if(cat==="AMBIGUA") return ["#fff1f2","#9f1239","#fecdd3","Ambigua · selección manual"];
    if(cat==="REVISAR_CON_PARTNER") return ["#eff6ff","#1e40af","#bfdbfe","Partner · selección manual"];
    if(cat==="OBSERVACION") return ["#fffbeb","#92400e","#fde68a","Observación · selección manual"];
    return ["#f8fafc","#475569","#cbd5e1","Selección manual"];
  }

  function insertarChecks(){
    cards().forEach(x=>{
      let lab=x.card.querySelector(`[data-mv513c-check="${CSS.escape(x.ordenId)}"]`);
      if(!lab){
        const s=estiloCat(x.categoria);
        lab=document.createElement("label");
        lab.setAttribute("data-mv513c-check",x.ordenId);
        lab.style.cssText=`display:flex;align-items:center;gap:7px;margin:9px 0 0;padding:7px 9px;border-radius:9px;background:${s[0]};border:1px solid ${s[2]};color:${s[1]};font-size:10px;font-weight:900;cursor:pointer`;
        lab.innerHTML=`<input type="checkbox" data-mv513c-select="${esc(x.ordenId)}" style="width:18px;height:18px;cursor:pointer"> Seleccionar para lote · ${esc(s[3])}`;
        const primer=x.card.firstElementChild;
        if(primer?.nextSibling) x.card.insertBefore(lab,primer.nextSibling); else x.card.appendChild(lab);
      }
      const cb=lab.querySelector("input[data-mv513c-select]");
      if(cb) cb.checked=seleccion.has(x.ordenId);
    });
  }

  function insertarToolbar(){
    const m=modal(); if(!m) return;
    let bar=m.querySelector("[data-mv513c-toolbar]");
    if(!bar){
      const input=m.querySelector("input[data-mv513-filtro]");
      if(!input) return;
      bar=document.createElement("div");
      bar.setAttribute("data-mv513c-toolbar","");
      bar.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;padding:10px;background:#fff;border:2px solid #93c5fd;border-radius:11px;position:sticky;top:105px;z-index:4";
      bar.innerHTML=`
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#166534;cursor:pointer"><input type="checkbox" data-mv513c-altas style="width:18px;height:18px"> Seleccionar candidatas altas visibles</label>
        <button type="button" data-mv513c-limpiar style="border:0;border-radius:8px;padding:8px 10px;background:#64748b;color:#fff;font-weight:900;cursor:pointer">Limpiar</button>
        <button type="button" data-mv513c-validar style="border:0;border-radius:8px;padding:8px 12px;background:#16a34a;color:#fff;font-weight:900;cursor:pointer">✅ Validar lote (0)</button>
        <span style="margin-left:auto;font-size:10px;color:#475569"><b data-mv513c-total>0</b> seleccionadas · Ambigua/Partner solo manual</span>`;
      input.parentNode.insertBefore(bar,input.nextSibling);
    }
  }

  function actualizar(){
    const m=modal(); if(!m) return;
    const total=m.querySelector("[data-mv513c-total]"); if(total) total.textContent=String(seleccion.size);
    const b=m.querySelector("[data-mv513c-validar]");
    if(b){b.disabled=procesando||seleccion.size===0;b.style.opacity=b.disabled?".5":"1";b.textContent=procesando?"⏳ Procesando...":`✅ Validar lote (${seleccion.size})`;}
    const altas=cards().filter(x=>x.categoria==="CANDIDATA_ALTA");
    const cb=m.querySelector("[data-mv513c-altas]");
    if(cb) cb.checked=altas.length>0&&altas.every(x=>seleccion.has(x.ordenId));
    m.querySelectorAll("input[data-mv513c-select]").forEach(c=>c.checked=seleccion.has(String(c.getAttribute("data-mv513c-select")||"")));
  }

  function instalar(){
    instalarGuardadoEditor();
    if(!modal()){ seleccion.clear(); return; }
    ocultarLoteNativo();
    insertarToolbar();
    insertarChecks();
    actualizar();
  }

  document.addEventListener("change",e=>{
    const cb=e.target.closest?.("input[data-mv513c-select]");
    if(cb){
      const id=String(cb.getAttribute("data-mv513c-select")||"");
      const x=cards().find(v=>v.ordenId===id);
      if(cb.checked&&x) seleccion.set(id,{ordenId:id,partidaPropuesta:x.partidaPropuesta,categoria:x.categoria});
      else seleccion.delete(id);
      actualizar();
      return;
    }
    const altas=e.target.closest?.("input[data-mv513c-altas]");
    if(altas){
      cards().filter(x=>x.categoria==="CANDIDATA_ALTA").forEach(x=>{
        if(altas.checked) seleccion.set(x.ordenId,{ordenId:x.ordenId,partidaPropuesta:x.partidaPropuesta,categoria:x.categoria});
        else seleccion.delete(x.ordenId);
      });
      actualizar();
    }
  },true);

  document.addEventListener("click",async e=>{
    if(e.target.closest?.("[data-mv513c-limpiar]")){
      seleccion.clear(); actualizar(); return;
    }
    if(!e.target.closest?.("[data-mv513c-validar]")||procesando) return;
    const items=Array.from(seleccion.values());
    if(!items.length){alert("Selecciona al menos una orden.");return;}

    const conteo={CANDIDATA_ALTA:0,OBSERVACION:0,AMBIGUA:0,REVISAR_CON_PARTNER:0,OTRA:0};
    items.forEach(x=>{conteo[x.categoria]=(conteo[x.categoria]||0)+1;});
    const manual=(conteo.AMBIGUA||0)+(conteo.REVISAR_CON_PARTNER||0)+(conteo.OBSERVACION||0)+(conteo.OTRA||0);
    const motivo=prompt(
      `Lote: ${items.length} orden(es)\nAlta confianza: ${conteo.CANDIDATA_ALTA||0}\nObservación: ${conteo.OBSERVACION||0}\nAmbigua: ${conteo.AMBIGUA||0}\nPartner: ${conteo.REVISAR_CON_PARTNER||0}\n\nIndique sustento común:`,
      manual?"Validación manual de Jefatura con revisión de WIN, dirección y referencia Partner":"Regla V513 de alta confianza validada por Jefatura"
    );
    if(motivo===null) return;
    if(!String(motivo).trim()){alert("El sustento es obligatorio.");return;}

    let aviso=`Validar ${items.length} orden(es) en un solo lote?\n\nSe hará UNA sola publicación al finalizar.`;
    if(manual) aviso+=`\n\n⚠️ Incluye ${manual} caso(s) que NO son de alta confianza. Fueron seleccionados manualmente y quedarán bajo responsabilidad de la validación de Jefatura.`;
    if(!confirm(aviso)) return;

    procesando=true; actualizar();
    try{
      const r=await apiPost({accion:"validarLotePartidasV513",usuario:usuario(),periodo:periodo(),items:items.map(x=>({ordenId:x.ordenId,partidaPropuesta:x.partidaPropuesta})),motivo:String(motivo).trim(),origen:"PARTIDAS V513C / LOTE MANUAL"});
      alert(`✅ Lote terminado\n\nAplicadas: ${r.aplicadas||0}\nOmitidas: ${r.omitidas||0}${r.publicacion?.produccion?.puntos!==undefined?`\nProducción publicada: ${r.publicacion.produccion.puntos} pts`:""}`);
      seleccion.clear();
      if(typeof window.mv513Recargar==="function") await window.mv513Recargar();
    }catch(err){
      alert("No se pudo completar el lote: "+(err?.message||String(err)));
    }finally{
      procesando=false;
      setTimeout(instalar,80);
    }
  },true);

  function iniciar(){
    if(observador) return;
    instalarGuardadoEditor();
    observador=new MutationObserver(()=>{
      clearTimeout(timer);timer=setTimeout(instalar,80);
    });
    observador.observe(document.body,{childList:true,subtree:true});
    setInterval(instalar,900);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();
})();
