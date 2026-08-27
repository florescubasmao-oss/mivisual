/* ============================================================
   MI VISUAL V506 - VALIDACION POR LOTE DE PARTIDAS WIN

   - Extiende V505 sin modificar su motor individual.
   - Agrega checkbox por propuesta.
   - Permite seleccionar todas las visibles.
   - Valida seleccionadas en secuencia para evitar choques.
   - Conserva WIN original y no modifica SLA.
============================================================ */
(function(){
  "use strict";

  if(window.MV506_PARTIDAS_LOTE_OK) return;
  window.MV506_PARTIDAS_LOTE_OK = true;

  const seleccionados = new Set();
  let procesando = false;
  let observer = null;

  function esc(v){
    return String(v==null?"":v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function usuario(){
    return localStorage.getItem("usuario") || localStorage.getItem("correo") || "";
  }

  function apiBase(){
    return window.MI_VISUAL_API_URL ||
      (typeof window.MV58_API!=="undefined" ? window.MV58_API : "");
  }

  async function apiPost(payload){
    const base=apiBase();
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(base,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},
      body:JSON.stringify(payload),
      cache:"no-store",
      redirect:"follow"
    });
    const t=(await r.text()).trim();
    let j;
    try{ j=JSON.parse(t); }
    catch(_){ throw new Error("La API no devolvio una respuesta valida."); }
    if(!j || j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo completar la operacion.");
    return j;
  }

  function modal(){
    return document.getElementById("mv505PartidasModal");
  }

  function botones(){
    const m=modal();
    return m ? Array.from(m.querySelectorAll('button[data-mv505-validar]')) : [];
  }

  function clave(btn){
    return String(btn?.getAttribute("data-mv505-validar")||"");
  }

  function propuesta(btn){
    return String(btn?.getAttribute("data-mv505-propuesta")||"");
  }

  function actualizarContador(){
    const m=modal();
    if(!m) return;
    const n=m.querySelector("[data-mv506-seleccionados]");
    if(n) n.textContent=String(seleccionados.size);
    const b=m.querySelector("[data-mv506-validar-lote]");
    if(b){
      b.disabled=procesando || seleccionados.size===0;
      b.style.opacity=b.disabled?".55":"1";
      b.textContent=procesando
        ? "⏳ Procesando..."
        : `✅ Validar seleccionadas (${seleccionados.size})`;
    }
  }

  function estadoProgreso(texto,tipo){
    const m=modal();
    if(!m) return;
    let box=m.querySelector("[data-mv506-progreso]");
    if(!box) return;
    box.textContent=texto||"";
    box.style.display=texto?"block":"none";
    box.style.background=tipo==="error"?"#fee2e2":tipo==="ok"?"#dcfce7":"#eff6ff";
    box.style.borderColor=tipo==="error"?"#fca5a5":tipo==="ok"?"#86efac":"#93c5fd";
    box.style.color=tipo==="error"?"#991b1b":tipo==="ok"?"#166534":"#1e3a8a";
  }

  function instalarCheckboxes(){
    const m=modal();
    if(!m) return;

    botones().forEach(btn=>{
      const id=clave(btn);
      if(!id) return;
      const card=btn.closest("article");
      if(!card || card.querySelector(`[data-mv506-check="${CSS.escape(id)}"]`)) return;

      const fila=document.createElement("label");
      fila.setAttribute("data-mv506-check",id);
      fila.style.cssText="display:flex;align-items:center;gap:7px;margin:-2px 0 8px;padding:7px 9px;border-radius:9px;background:#f8fafc;border:1px solid #cbd5e1;cursor:pointer;font-size:11px;font-weight:900;color:#334155;";
      fila.innerHTML=`<input type="checkbox" data-mv506-orden="${esc(id)}" style="width:18px;height:18px;cursor:pointer" ${seleccionados.has(id)?"checked":""}> Seleccionar esta orden`;
      card.insertBefore(fila,card.firstChild);
    });

    const existente=m.querySelector("[data-mv506-toolbar]");
    if(!existente){
      const search=m.querySelector("input[data-mv505-buscar]");
      if(search){
        const bar=document.createElement("div");
        bar.setAttribute("data-mv506-toolbar","");
        bar.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;padding:10px;background:#fff;border:1px solid #cbd5e1;border-radius:11px;";
        bar.innerHTML=`
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#334155;cursor:pointer">
            <input type="checkbox" data-mv506-todos style="width:18px;height:18px;cursor:pointer">
            Seleccionar todas visibles
          </label>
          <button type="button" data-mv506-limpiar style="border:0;border-radius:8px;padding:8px 10px;background:#64748b;color:white;font-weight:900;cursor:pointer">Limpiar</button>
          <button type="button" data-mv506-validar-lote style="border:0;border-radius:8px;padding:8px 12px;background:#16a34a;color:white;font-weight:900;cursor:pointer">✅ Validar seleccionadas (0)</button>
          <span style="margin-left:auto;font-size:11px;font-weight:900;color:#475569">Seleccionadas: <b data-mv506-seleccionados>0</b></span>
          <div data-mv506-progreso style="display:none;width:100%;padding:8px 10px;border:1px solid #93c5fd;border-radius:8px;font-size:11px;font-weight:800"></div>
        `;
        search.parentNode.insertBefore(bar,search.nextSibling);
      }
    }
    actualizarContador();
  }

  document.addEventListener("change",e=>{
    const cb=e.target.closest?.("input[data-mv506-orden]");
    if(cb){
      const id=String(cb.getAttribute("data-mv506-orden")||"");
      if(cb.checked) seleccionados.add(id);
      else seleccionados.delete(id);
      actualizarContador();
      const all=modal()?.querySelector("input[data-mv506-todos]");
      if(all){
        const visibles=botones().map(clave).filter(Boolean);
        all.checked=visibles.length>0 && visibles.every(x=>seleccionados.has(x));
      }
      return;
    }

    const todos=e.target.closest?.("input[data-mv506-todos]");
    if(todos){
      botones().forEach(btn=>{
        const id=clave(btn);
        if(!id) return;
        if(todos.checked) seleccionados.add(id);
        else seleccionados.delete(id);
      });
      instalarCheckboxes();
      modal()?.querySelectorAll("input[data-mv506-orden]").forEach(x=>{
        x.checked=seleccionados.has(String(x.getAttribute("data-mv506-orden")||""));
      });
      actualizarContador();
    }
  },true);

  document.addEventListener("click",async e=>{
    const limpiar=e.target.closest?.("[data-mv506-limpiar]");
    if(limpiar){
      seleccionados.clear();
      modal()?.querySelectorAll("input[data-mv506-orden],input[data-mv506-todos]").forEach(x=>x.checked=false);
      estadoProgreso("");
      actualizarContador();
      return;
    }

    const validar=e.target.closest?.("[data-mv506-validar-lote]");
    if(!validar || procesando) return;

    const disponibles=new Map(botones().map(btn=>[clave(btn),btn]));
    const lote=Array.from(seleccionados)
      .map(id=>disponibles.get(id))
      .filter(Boolean)
      .map(btn=>({ordenId:clave(btn),partidaPropuesta:propuesta(btn)}))
      .filter(x=>x.ordenId&&x.partidaPropuesta);

    if(!lote.length){
      alert("Selecciona al menos una propuesta.");
      return;
    }

    const ok=confirm(
      `Se validaran ${lote.length} propuesta(s) por lote.\n\n`+
      `El proceso sera secuencial para proteger Produccion y Ranking.\n`+
      `WIN original se conserva y SLA no se modifica.\n\n¿Continuar?`
    );
    if(!ok) return;

    procesando=true;
    actualizarContador();

    let exitos=[];
    let errores=[];
    let ultimoResultado=null;

    try{
      for(let i=0;i<lote.length;i++){
        const item=lote[i];
        estadoProgreso(`Procesando ${i+1} de ${lote.length} · Orden ${item.ordenId}...`);
        try{
          const r=await apiPost({
            accion:"validarAjustePartidaWinV502",
            usuario:usuario(),
            ordenId:item.ordenId,
            partidaPropuesta:item.partidaPropuesta,
            origen:"PARTNER / JEFATURA MI VISUAL / LOTE V506",
            motivo:"Diferencia IR/IC validada por lote desde modulo Partidas",
            solicitadoPor:usuario()
          });
          exitos.push(item.ordenId);
          ultimoResultado=r;
          seleccionados.delete(item.ordenId);
          try{
            window.dispatchEvent(new CustomEvent("mv505PartidaValidada",{detail:r}));
          }catch(_){}
        }catch(err){
          errores.push({
            ordenId:item.ordenId,
            error:err&&err.message?err.message:String(err)
          });
        }
      }

      try{
        if(typeof window.mv4879InvalidarCachesCliente==="function"){
          window.mv4879InvalidarCachesCliente(
            ultimoResultado?.publicacion?.periodo || ""
          );
        }
      }catch(_){}

      if(errores.length){
        estadoProgreso(
          `Lote finalizado: ${exitos.length} aplicada(s) y ${errores.length} con error.`,
          "error"
        );
      }else{
        estadoProgreso(
          `Lote finalizado correctamente: ${exitos.length} propuesta(s) aplicada(s).`,
          "ok"
        );
      }

      if(typeof window.mv505RecargarPartidas==="function"){
        await window.mv505RecargarPartidas();
      }

      let mensaje=`✅ Validacion por lote terminada\n\nAplicadas: ${exitos.length}`;
      if(errores.length){
        mensaje+=`\nCon error: ${errores.length}\n\nOrdenes con error:\n`+
          errores.slice(0,8).map(x=>`• ${x.ordenId}: ${x.error}`).join("\n");
      }
      const prod=ultimoResultado?.publicacion?.produccion;
      if(prod&&prod.puntos!==undefined){
        mensaje+=`\n\nProduccion publicada: ${prod.puntos} pts`;
      }
      mensaje+="\n\nWIN original conservado. SLA no modificado.";
      alert(mensaje);
    }finally{
      procesando=false;
      setTimeout(()=>{
        instalarCheckboxes();
        actualizarContador();
      },60);
    }
  },true);

  function iniciar(){
    if(observer) return;
    observer=new MutationObserver(()=>{
      if(modal()) instalarCheckboxes();
      else seleccionados.clear();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{ if(modal()) instalarCheckboxes(); },700);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  }else{
    iniciar();
  }
})();
