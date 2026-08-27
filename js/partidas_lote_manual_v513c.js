/* ============================================================
   MI VISUAL V513C - LOTE MANUAL PARTIDAS
   - Todas las propuestas IR/IC pueden marcarse manualmente.
   - Seleccionar todas solo toma CANDIDATA ALTA.
   - Ambigua / Partner / Observacion requieren seleccion expresa.
   - Una sola publicacion al finalizar el lote.
============================================================ */
(function(){
  "use strict";
  if(window.MV513C_LOTE_MANUAL_OK) return;
  window.MV513C_LOTE_MANUAL_OK=true;

  const seleccion=new Map();
  let observador=null;
  let timer=null;
  let procesando=false;

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
    observador=new MutationObserver(()=>{
      clearTimeout(timer);timer=setTimeout(instalar,80);
    });
    observador.observe(document.body,{childList:true,subtree:true});
    setInterval(instalar,900);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();
})();
