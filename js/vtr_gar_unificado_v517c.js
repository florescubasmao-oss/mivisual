/* ============================================================
   MI VISUAL V517C - GAR/VTR UNIFICADO
   Frontend integrado y aditivo.

   TECNICO
   - Mantiene el formulario y VALIDACION_TECNICA.
   - GAR/VTR ya no muestra ni solicita PROPIA / ASIGNADA.
   - Conserva ticket, código, DNI, motivo, confirmación e historial.

   JEFATURA / GESTION
   - Al entrar a GAR/VTR abre directamente la vista consolidada.
   - Elimina la navegación Registro | Validación para gestión.
   - Cada caso registrado ofrece "Ver registro técnico".
   - "Gestionar caso" integra clasificación + Bono/No Bono.
   - El detalle técnico se carga solo al abrirlo.

   NO MODIFICA Ranking, Dashboard, Producción ni backend de Recableado.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C_GARVTR_UNIFICADO_OK) return;
  window.MV517C_GARVTR_UNIFICADO_OK = true;

  const API = window.MI_VISUAL_API_URL ||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR = "JEFZNORTE";
  const TTL = 2*60*1000;
  const CACHE = new Map();
  const BASE_FETCH = window.fetch.bind(window);
  let ultimaVista = null;
  let timer = null;
  let guardarTecnicoInstalado = false;
  let confirmacionTecnicoInstalada = false;

  function txt(v){ return String(v==null?"":v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function usuario(){ return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||""); }
  function perfil(){ return norm(localStorage.getItem("perfil")||""); }
  function esTecnico(){ return perfil()==="TECNICO"; }
  function esJefaturaUnica(){ return norm(usuario())===VALIDADOR && perfil()==="JEFATURA"; }
  function esGestion(){ return !esTecnico(); }

  function css(){
    if(document.getElementById("mv517c-css")) return;
    const s=document.createElement("style");
    s.id="mv517c-css";
    s.textContent=`
      .mv517c-hide{display:none!important}
      .mv517a .mv517a-tabs{display:none!important}
      .mv517a-case{border:2px solid #b5c4d6!important;box-shadow:0 2px 8px rgba(15,23,42,.08)!important;margin-bottom:10px!important}
      .mv517a-case[open]{border-color:#7898ba!important;box-shadow:0 5px 14px rgba(15,23,42,.11)!important}
      .mv517a-detail{border-top:2px solid #d4deea!important}
      .mv517c-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;width:100%}
      .mv517c-btn{border:0;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:900;cursor:pointer;color:#fff;background:#0f766e}
      .mv517c-btn.detail{background:#2563eb}
      .mv517c-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.60);z-index:13000;display:flex;align-items:center;justify-content:center;padding:12px}
      .mv517c-modal{width:min(580px,100%);max-height:92vh;overflow:auto;background:#fff;color:#0f172a;border-radius:18px;padding:15px;box-shadow:0 22px 60px rgba(15,23,42,.28)}
      .mv517c-modal h3{margin:0 0 8px;font-size:18px}
      .mv517c-section{background:#f8fafc;border:1px solid #dbe3ee;border-radius:12px;padding:10px;margin-top:10px}
      .mv517c-section h4{margin:0 0 8px;font-size:12px}
      .mv517c-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .mv517c-field{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:8px;min-width:0}
      .mv517c-field small{display:block;font-size:8px;color:#64748b;font-weight:900;text-transform:uppercase;margin-bottom:2px}
      .mv517c-field b{font-size:10px;overflow-wrap:anywhere}
      .mv517c-text{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:9px;white-space:pre-wrap;font-size:11px;line-height:1.45}
      .mv517c-modal label{display:block;font-size:10px;font-weight:900;margin:9px 0 4px}
      .mv517c-modal select,.mv517c-modal textarea,.mv517c-modal input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:9px;background:#fff}
      .mv517c-modal textarea{min-height:72px;resize:vertical}
      .mv517c-note{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:10px;padding:8px;font-size:10px;line-height:1.4;margin-top:8px}
      .mv517c-warn{border:1px solid #fbbf24;background:#fffbeb;color:#78350f;border-radius:10px;padding:8px;font-size:10px;line-height:1.4;margin-top:8px}
      .mv517c-footer{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
      .mv517c-save,.mv517c-cancel{border:0;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:900;color:#fff;cursor:pointer}
      .mv517c-save{background:#15803d}.mv517c-cancel{background:#475569}
      body.mv517c-tecnico #vtOrigenOrdenWrap,
      body.mv517c-tecnico .vt-origin-badge,
      body.mv517c-tecnico .vt-origin-summary,
      body.mv517c-tecnico #vtFiltroOrigen{display:none!important}
      @media(max-width:520px){
        .mv517c-grid{grid-template-columns:1fr}
        .mv517c-actions{justify-content:stretch}
        .mv517c-btn{flex:1}
        .mv517c-footer button{flex:1}
      }
    `;
    document.head.appendChild(s);
  }

  function cacheKey(input,init){
    try{
      const method=norm(init&&init.method||"GET");
      const url=String(typeof input==="string"?input:(input&&input.url)||"");
      if(method==="GET"&&url.includes("accion=notificacionVtrGarV517A")) return "GET|"+url;
      if(method==="POST"&&typeof init?.body==="string"){
        const b=JSON.parse(init.body);
        if(b&&b.accion==="listarVtrGarV517A"){
          return "POST|V517A|"+norm(b.usuario)+"|"+txt(b.periodo||"AUTO");
        }
      }
    }catch(_){}
    return "";
  }

  window.fetch=function(input,init){
    const key=cacheKey(input,init);
    if(!key) return BASE_FETCH(input,init);
    const hit=CACHE.get(key);
    if(hit && Date.now()-hit.ts<TTL){
      try{
        const j=JSON.parse(hit.text);
        if(j&&j.incidencias) ultimaVista=j;
      }catch(_){}
      return Promise.resolve(new Response(hit.text,{status:200,headers:{"Content-Type":"application/json"}}));
    }
    return BASE_FETCH(input,init).then(async r=>{
      try{
        if(r.ok){
          const t=await r.clone().text();
          CACHE.set(key,{ts:Date.now(),text:t});
          const j=JSON.parse(t);
          if(j&&j.incidencias) ultimaVista=j;
        }
      }catch(_){}
      return r;
    });
  };

  function limpiarCache(){ CACHE.clear(); ultimaVista=null; }

  function limpiarOrigenTecnico(){
    if(!esTecnico() || window.MV488_VT_MODO!=="VTRGAR") return;
    document.body.classList.add("mv517c-tecnico");

    const wrap=document.getElementById("vtOrigenOrdenWrap");
    if(wrap) wrap.remove();
    const sel=document.getElementById("vtOrigenOrden");
    if(sel){ sel.required=false; sel.value=""; }

    document.querySelectorAll(".vt-origin-badge,.vt-origin-summary,#vtFiltroOrigen").forEach(x=>x.remove());

    document.querySelectorAll(".vt-resumen-row").forEach(row=>{
      const t=norm(row.querySelector("span")?.textContent);
      if(t.includes("ORIGEN DE LA ORDEN")) row.remove();
    });

    const rep=document.getElementById("vtTextoReporte");
    if(rep){
      rep.textContent=rep.textContent.split(/\r?\n/)
        .filter(line=>!norm(line).startsWith("ORIGEN:"))
        .join("\n");
    }
  }

  function instalarActualizadorTipo(){
    const base=window.actualizarTipoValidacionPorTicket;
    if(typeof base!=="function" || base.mv517c) return;
    const fn=function(){
      const r=base.apply(this,arguments);
      setTimeout(limpiarOrigenTecnico,0);
      return r;
    };
    fn.mv517c=true;
    window.actualizarTipoValidacionPorTicket=fn;
    try{ actualizarTipoValidacionPorTicket=fn; }catch(_){}
  }

  function instalarConfirmacionTecnico(){
    if(confirmacionTecnicoInstalada) return;
    const base=window.mostrarConfirmacionValidacionTecnica;
    if(typeof base!=="function") return;
    confirmacionTecnicoInstalada=true;
    const fn=function(r){
      const z=base.apply(this,arguments);
      setTimeout(limpiarOrigenTecnico,0);
      setTimeout(limpiarOrigenTecnico,120);
      return z;
    };
    window.mostrarConfirmacionValidacionTecnica=fn;
    try{ mostrarConfirmacionValidacionTecnica=fn; }catch(_){}
  }

  function instalarGuardarTecnico(){
    if(guardarTecnicoInstalado || typeof window.guardarValidacionTecnica!=="function") return;
    guardarTecnicoInstalado=true;

    window.guardarValidacionTecnica=async function(btn){
      const u = typeof usuarioActualValidacion==="function"
        ? usuarioActualValidacion()
        : {usuario:usuario()};
      const tipoValidacion = txt(document.getElementById("vtTipoValidacion")?.value);
      const codigo = txt(document.getElementById("vtCodigo")?.value);
      const tipoTicket = txt(document.getElementById("vtTipoTicket")?.value);
      const numeroTicket = txt(document.getElementById("vtNumeroTicket")?.value);
      const dniCliente = txt(document.getElementById("vtDniCliente")?.value);
      const motivo = txt(document.getElementById("vtMotivo")?.value);

      if(!codigo || !tipoValidacion || !tipoTicket || !dniCliente || !motivo){
        alert("Completa todos los campos obligatorios.");
        return;
      }
      if(tipoTicket!=="NO APLICA" && !numeroTicket){
        alert("Ingresa el número de ticket o selecciona NO APLICA.");
        return;
      }

      try{
        if(btn){ btn.disabled=true; btn.innerHTML="Guardando..."; }
        if(typeof mostrarCargandoValidacion==="function") mostrarCargandoValidacion("Registrando solicitud...");
        const r=await apiValidacionTecnica({
          accion:"registrarValidacionTecnica",
          usuario:u.usuario,
          tipoValidacion:tipoValidacion,
          codigo:codigo,
          tipoTicket:tipoTicket,
          numeroTicket:numeroTicket,
          origenOrden:"",
          dniCliente:dniCliente,
          motivoTecnico:motivo
        });
        if(!r||!r.ok) throw new Error((r&&r.error)||"No se pudo registrar");
        limpiarCache();
        mostrarConfirmacionValidacionTecnica(r);
      }catch(e){
        alert("❌ "+(e&&e.message?e.message:String(e)));
      }finally{
        if(typeof ocultarCargandoValidacion==="function") ocultarCargandoValidacion();
        if(btn){ btn.disabled=false; btn.innerHTML="Guardar solicitud"; }
      }
    };
    try{ guardarValidacionTecnica=window.guardarValidacionTecnica; }catch(_){}
  }

  function instalarEntradaDirecta(){
    const actual=window.mv488AbrirVtrGar;
    if(typeof actual!=="function" || actual.mv517cDirecto) return;
    const base=actual;
    const fn=function(){
      if(esGestion() && typeof window.mv489AbrirValidacionVtrGar==="function"){
        window.MV488_VT_MODO="VTRGAR";
        return window.mv489AbrirValidacionVtrGar();
      }
      const r=base.apply(this,arguments);
      setTimeout(limpiarOrigenTecnico,80);
      setTimeout(limpiarOrigenTecnico,300);
      return r;
    };
    fn.mv517cDirecto=true;
    fn.mv517cBase=base;
    window.mv488AbrirVtrGar=fn;
  }

  function ocultarTabsGestion(){
    if(!esGestion()) return;
    if(!document.querySelector(".mv517a")) return;
    document.querySelectorAll(".mv517a-tabs,.mv489-tabs,.mv516c-tabs,#mv516cTabs").forEach(x=>{
      if(x.closest(".mv517a") || document.querySelector(".mv517a")) x.style.setProperty("display","none","important");
    });
  }

  function metaAcciones(box){
    const botones=Array.from(box.querySelectorAll("button"));
    let kind="",id="",validacionId="";
    botones.forEach(b=>{
      const oc=txt(b.getAttribute("onclick"));
      let m=oc.match(/mv517aDecision\('([^']+)','([^']+)','([^']+)'\)/);
      if(m&&!id){ kind=m[1]; id=m[2]; }
      m=oc.match(/mv517aBono\('([^']+)','BONO'\)/);
      if(m) validacionId=m[1];
    });
    return {kind,id,validacionId};
  }

  function transformarAcciones(){
    if(!esGestion()) return;
    document.querySelectorAll(".mv517a-detail > .mv517a-actions").forEach(box=>{
      if(box.dataset.mv517c==="1") return;
      const meta=metaAcciones(box);
      if(!meta.id) return;
      box.dataset.mv517c="1";

      box.innerHTML=`<div class="mv517c-actions">
        ${meta.validacionId?`<button type="button" class="mv517c-btn detail">📋 Ver registro técnico</button>`:""}
        ${esJefaturaUnica()?`<button type="button" class="mv517c-btn">⚙ Gestionar caso</button>`:""}
      </div>`;

      const btnDet=box.querySelector(".mv517c-btn.detail");
      if(btnDet) btnDet.onclick=()=>verRegistroTecnico(meta.validacionId);

      const btnGes=Array.from(box.querySelectorAll(".mv517c-btn"))
        .find(b=>norm(b.textContent).includes("GESTIONAR"));
      if(btnGes) btnGes.onclick=()=>abrirGestion(meta,box.closest(".mv517a-case"));
    });
  }

  async function listarRegistroTecnico(id){
    const q=new URLSearchParams({
      accion:"listarValidacionTecnica",
      usuario:usuario(),
      id:id
    });
    const r=await BASE_FETCH(API+"?"+q.toString(),{cache:"no-store"});
    const t=await r.text();
    let j; try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida al consultar el registro técnico.");}
    if(!j||!j.ok) throw new Error((j&&j.error)||"No se pudo consultar el registro técnico.");
    const lista=Array.isArray(j.validaciones)?j.validaciones:[];
    if(!lista.length) throw new Error("El registro técnico ya no está disponible.");
    return lista[0];
  }

  function fila(label,valor){
    return `<div class="mv517c-field"><small>${esc(label)}</small><b>${esc(valor||"-")}</b></div>`;
  }

  async function verRegistroTecnico(id){
    if(!id) return;
    abrirModalCarga("Cargando registro técnico...");
    try{
      const x=await listarRegistroTecnico(id);
      cerrarModal();
      const bg=document.createElement("div");
      bg.id="mv517cModal";
      bg.className="mv517c-modal-bg";
      bg.innerHTML=`<div class="mv517c-modal">
        <h3>📋 Registro técnico</h3>
        <div class="mv517c-note">Información declarada por el técnico y trazabilidad de validación. La responsabilidad GAR/VTR se determina por WIN y Jefatura; no por una declaración manual del técnico.</div>

        <div class="mv517c-section">
          <h4>Datos del registro</h4>
          <div class="mv517c-grid">
            ${fila("ID",x.id)}
            ${fila("Fecha / hora",(txt(x.fechaRegistro)+" "+txt(x.horaRegistro)).trim())}
            ${fila("Técnico",x.tecnico)}
            ${fila("Cuadrilla",x.cuadrilla)}
            ${fila("Sede",x.sede)}
            ${fila("Tipo",x.tipoValidacion)}
            ${fila("Código",x.codigo)}
            ${fila("Ticket",x.ticketFinal)}
            ${fila("DNI cliente",x.dniCliente)}
            ${fila("Estado",x.estadoVisibleTecnico||x.estado)}
          </div>
        </div>

        <div class="mv517c-section">
          <h4>Motivo técnico</h4>
          <div class="mv517c-text">${esc(x.motivoTecnico||"-")}</div>
        </div>

        <div class="mv517c-section">
          <h4>Validación de Jefatura</h4>
          <div class="mv517c-grid">
            ${fila("Resultado",x.resultadoVisibleTecnico||x.resultadoFinal||"-")}
            ${fila("Validado por",x.validadoPor||"-")}
            ${fila("Fecha validación",(txt(x.fechaValidacion)+" "+txt(x.horaValidacion)).trim()||"-")}
          </div>
          <label>Comentario</label>
          <div class="mv517c-text">${esc(x.motivoValidacion||"-")}</div>
        </div>

        <div class="mv517c-footer">
          <button class="mv517c-cancel" type="button">Cerrar</button>
        </div>
      </div>`;
      document.body.appendChild(bg);
      bg.querySelector(".mv517c-cancel").onclick=()=>bg.remove();
      bg.onclick=e=>{if(e.target===bg)bg.remove();};
    }catch(e){
      cerrarModal();
      alert(e&&e.message?e.message:String(e));
    }
  }

  function abrirModalCarga(texto){
    cerrarModal();
    const bg=document.createElement("div");
    bg.id="mv517cModal";
    bg.className="mv517c-modal-bg";
    bg.innerHTML=`<div class="mv517c-modal"><div class="mv517c-note">⏳ ${esc(texto||"Cargando...")}</div></div>`;
    document.body.appendChild(bg);
  }
  function cerrarModal(){ document.getElementById("mv517cModal")?.remove(); }

  function periodoActual(){
    return txt(document.getElementById("mv517aPeriodo")?.value || ultimaVista?.periodo || "2026-08");
  }

  async function obtenerCuadrillas(){
    if(Array.isArray(ultimaVista?.cuadrillas)&&ultimaVista.cuadrillas.length) return ultimaVista.cuadrillas;
    const p={accion:"listarVtrGarV517A",usuario:usuario(),periodo:periodoActual()};
    const r=await window.fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(p)
    }).then(x=>x.json());
    if(!r||!r.ok) throw new Error(r?.error||"No se pudieron cargar las cuadrillas.");
    ultimaVista=r;
    return Array.isArray(r.cuadrillas)?r.cuadrillas:[];
  }

  async function abrirGestion(meta,card){
    if(!esJefaturaUnica()) return;
    const titulo=txt(card?.querySelector(".mv517a-ticket")?.textContent||meta.id);
    const estadoActual=txt(card?.querySelector(".mv517a-badges")?.textContent||"");
    let cuadrillas=[];
    try{ cuadrillas=await obtenerCuadrillas(); }catch(_){ cuadrillas=[]; }

    const bg=document.createElement("div");
    bg.id="mv517cModal";
    bg.className="mv517c-modal-bg";
    bg.innerHTML=`<div class="mv517c-modal">
      <h3>⚙ Gestionar ${esc(titulo)}</h3>
      <div class="mv517c-note"><b>Estado actual:</b> ${esc(estadoActual||"-")}<br>Solo se modificarán las secciones que selecciones. “Sin cambios” conserva la información vigente.</div>

      <div class="mv517c-section">
        <h4>1. Clasificación GAR/VTR</h4>
        <label>Decisión</label>
        <select id="mv517cClas">
          <option value="SIN_CAMBIO">Sin cambios</option>
          <option value="CORRESPONDE">Confirmar GAR/VTR</option>
          <option value="REASIGNAR">Reasignar responsable</option>
          <option value="NO_ES_GAR_VTR">NO ES GAR/VTR</option>
          <option value="ANULAR">Anular clasificación</option>
        </select>
        <div id="mv517cCuadWrap" style="display:none">
          <label>Cuadrilla responsable</label>
          <select id="mv517cCuad">
            <option value="">Seleccione...</option>
            ${cuadrillas.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}
          </select>
        </div>
        <label>Comentario / sustento</label>
        <textarea id="mv517cComClas" placeholder="Sustento de la clasificación"></textarea>
        <div id="mv517cNoGar" class="mv517c-warn" style="display:none">Si la orden está FINALIZADA y eliges <b>NO ES GAR/VTR</b>, quedará identificada para la recuperación de Producción en una etapa posterior. Esta versión todavía no modifica PRODUCCION_APP.</div>
      </div>

      ${meta.validacionId?`<div class="mv517c-section">
        <h4>2. Validación del registro técnico</h4>
        <label>Resultado</label>
        <select id="mv517cBono">
          <option value="SIN_CAMBIO">Sin cambios</option>
          <option value="BONO">BONO</option>
          <option value="NO BONO">NO BONO</option>
        </select>
        <div id="mv517cPuntWrap" style="display:none">
          <label>Puntaje VTR/GAR</label>
          <input id="mv517cPunt" type="number" min="0" step="0.1">
        </div>
        <label>Comentario de Jefatura</label>
        <textarea id="mv517cComBono" placeholder="Motivo de Bono / No Bono"></textarea>
      </div>`:`<div class="mv517c-note">Este caso no tiene registro técnico asociado. Bono / No Bono no se habilita.</div>`}

      <div class="mv517c-footer">
        <button id="mv517cGuardar" class="mv517c-save" type="button">Guardar cambios</button>
        <button id="mv517cCancelar" class="mv517c-cancel" type="button">Cancelar</button>
      </div>
    </div>`;
    document.body.appendChild(bg);

    const clas=bg.querySelector("#mv517cClas");
    const bono=bg.querySelector("#mv517cBono");
    function sync(){
      bg.querySelector("#mv517cCuadWrap").style.display=clas.value==="REASIGNAR"?"block":"none";
      bg.querySelector("#mv517cNoGar").style.display=clas.value==="NO_ES_GAR_VTR"?"block":"none";
      if(bono) bg.querySelector("#mv517cPuntWrap").style.display=bono.value==="BONO"?"block":"none";
    }
    clas.onchange=sync; if(bono)bono.onchange=sync; sync();
    bg.querySelector("#mv517cCancelar").onclick=()=>bg.remove();

    bg.querySelector("#mv517cGuardar").onclick=async function(){
      const decision=clas.value;
      const resultado=bono?bono.value:"SIN_CAMBIO";
      if(decision==="SIN_CAMBIO"&&resultado==="SIN_CAMBIO"){
        alert("No has seleccionado cambios."); return;
      }

      const comClas=txt(bg.querySelector("#mv517cComClas")?.value);
      const cuad=txt(bg.querySelector("#mv517cCuad")?.value);
      if(decision==="REASIGNAR"&&!cuad){ alert("Seleccione la cuadrilla responsable."); return; }
      if((decision==="ANULAR"||decision==="NO_ES_GAR_VTR")&&!comClas){
        alert("Ingrese el motivo de la clasificación."); return;
      }

      const comBono=txt(bg.querySelector("#mv517cComBono")?.value);
      let puntaje=0;
      if(resultado!=="SIN_CAMBIO"){
        if(!comBono){ alert("Ingrese el comentario de Bono / No Bono."); return; }
        if(resultado==="BONO"){
          puntaje=Number(bg.querySelector("#mv517cPunt")?.value);
          if(!isFinite(puntaje)||puntaje<=0){ alert("Ingrese un puntaje mayor a 0."); return; }
        }
      }

      const btn=bg.querySelector("#mv517cGuardar");
      btn.disabled=true; btn.textContent="Guardando...";
      try{
        if(decision!=="SIN_CAMBIO"){
          const p={
            accion:"clasificarVtrGarV517A",
            usuario:usuario(),
            periodo:periodoActual(),
            decision:decision,
            observacion:comClas
          };
          if(meta.kind==="TICKET") p.ticket=meta.id; else p.clave=meta.id;
          if(cuad) p.cuadrillaResponsable=cuad;
          const r=await BASE_FETCH(API,{
            method:"POST",
            headers:{"Content-Type":"text/plain;charset=utf-8"},
            body:JSON.stringify(p)
          }).then(x=>x.json());
          if(!r||!r.ok) throw new Error(r?.error||"No se pudo guardar la clasificación.");
        }

        if(resultado!=="SIN_CAMBIO"){
          const p={
            accion:"validarBonoVtrGarV515",
            usuario:usuario(),
            id:meta.validacionId,
            resultado:resultado,
            puntajeVtrGar:puntaje,
            motivo:comBono
          };
          const r=await BASE_FETCH(API,{
            method:"POST",
            headers:{"Content-Type":"text/plain;charset=utf-8"},
            body:JSON.stringify(p)
          }).then(x=>x.json());
          if(!r||!r.ok) throw new Error(r?.error||"No se pudo guardar Bono / No Bono.");
        }

        limpiarCache();
        bg.remove();
        if(typeof window.mv489AbrirValidacionVtrGar==="function"){
          await window.mv489AbrirValidacionVtrGar();
        }
      }catch(e){
        btn.disabled=false; btn.textContent="Guardar cambios";
        alert(e&&e.message?e.message:String(e));
      }
    };
  }

  function instalar(){
    css();
    if(esTecnico()) document.body.classList.add("mv517c-tecnico");
    else document.body.classList.remove("mv517c-tecnico");

    instalarActualizadorTipo();
    instalarConfirmacionTecnico();
    instalarGuardarTecnico();
    instalarEntradaDirecta();
    limpiarOrigenTecnico();
    ocultarTabsGestion();
    transformarAcciones();
  }

  if(document.body){
    const obs=new MutationObserver(function(muts){
      for(const m of muts){
        if(m.addedNodes&&m.addedNodes.length){
          clearTimeout(timer);
          timer=setTimeout(instalar,30);
          break;
        }
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",()=>setTimeout(instalar,60),true);
  setInterval(instalar,1200);
  setTimeout(instalar,80);
  setTimeout(instalar,350);
  setTimeout(instalar,900);
  console.log("MI VISUAL V517C: GAR/VTR unificado preparado.");
})();
