/* ============================================================
   MI VISUAL V482 - EDICIÓN CONTROLADA DE OBSERVACIONES
   - Solo JEFATURA / JEFATURA GENERAL.
   - Código/Ticket, Tipo, Monto y Descripción.
   - Motivo de corrección obligatorio.
   - Periodos históricos exigen confirmación adicional.
   - No agrega lecturas; trabaja sobre observacionesCache ya cargado.
============================================================ */
(function(){
  "use strict";

  if(window.MV482_OBSERVACIONES_EDICION_OK) return;
  window.MV482_OBSERVACIONES_EDICION_OK = true;

  const mapaObservaciones = new Map();

  function texto(v){ return String(v == null ? "" : v).trim(); }
  function normal(v){
    return texto(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return texto(v).replace(/[&<>"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c];});
  }
  function perfilActual(){ return normal(localStorage.getItem("perfil") || ""); }
  function esJefaturaGeneral(){
    const p=perfilActual();
    return p === "JEFATURA" || p === "JEFATURA GENERAL";
  }
  function idSeguro(id){ return texto(id).replace(/[^A-Za-z0-9_-]/g,"_"); }
  function listaActual(){
    try{
      if(typeof observacionesCache !== "undefined" && Array.isArray(observacionesCache)) return observacionesCache;
    }catch(_){}
    return [];
  }
  function periodoActual(){
    try{ if(typeof obsPeriodoActual === "function") return obsPeriodoActual(); }catch(_){}
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function clavePeriodo(o){
    try{ if(typeof obsClavePeriodo === "function") return obsClavePeriodo(o); }catch(_){}
    return "";
  }
  function tipoCanonico(v){
    const t=normal(v);
    if(t === "IMPLEMENTACION") return "IMPLEMENTACION";
    if(t === "GESTION TECNICA") return "GESTION TECNICA";
    return "SEGURIDAD";
  }

  function inyectarBotones(){
    if(!esJefaturaGeneral()) return;
    const lista=listaActual();
    lista.forEach(function(o){
      if(!o || !o.id) return;
      mapaObservaciones.set(String(o.id),o);
      const card=document.getElementById("obsCard_"+idSeguro(o.id));
      if(!card) return;
      const acciones=card.querySelector(".obs-acciones");
      if(!acciones || acciones.querySelector("[data-mv482-editar]")) return;
      const btn=document.createElement("button");
      btn.type="button";
      btn.setAttribute("data-mv482-editar","1");
      btn.textContent="✏️ Editar observación";
      btn.addEventListener("click",function(){ abrirEditar(String(o.id)); });
      acciones.appendChild(btn);
    });
  }

  function encontrar(id){
    if(mapaObservaciones.has(String(id))) return mapaObservaciones.get(String(id));
    const item=listaActual().find(function(x){ return String(x && x.id || "") === String(id); });
    if(item) mapaObservaciones.set(String(id),item);
    return item || null;
  }

  function abrirEditar(id){
    if(!esJefaturaGeneral()){
      alert("Solo Jefatura General puede editar observaciones.");
      return;
    }
    const o=encontrar(id);
    if(!o){
      alert("No se encontró la observación en la lista actual. Actualice el módulo e intente nuevamente.");
      return;
    }

    const historico=clavePeriodo(o) && clavePeriodo(o)!==periodoActual();
    const tipo=tipoCanonico(o.tipoObservacion);
    const monto=Number(o.monto || 0);

    if(typeof mostrarPantalla !== "function") return;
    mostrarPantalla(`
      <div class="obs-contenedor" style="max-width:760px;margin:0 auto">
        <h2>✏️ Editar observación</h2>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px;margin-bottom:12px;font-size:12px;color:#1e3a8a">
          <b>${esc(o.id)}</b> · ${esc(o.cuadrilla || "-")} · ${esc(o.periodo || "-")}<br>
          Solo se corregirán Código/Ticket, Tipo, Monto y Observación. Estado, fuente, sede, cuadrilla y período permanecen intactos.
        </div>

        <label>Código / Ticket</label>
        <input id="mv482Codigo" value="${esc(o.codigo || "")}" maxlength="120" placeholder="Código o ticket">

        <label>Tipo de observación</label>
        <select id="mv482Tipo">
          <option value="SEGURIDAD" ${tipo==="SEGURIDAD"?"selected":""}>SEGURIDAD</option>
          <option value="IMPLEMENTACION" ${tipo==="IMPLEMENTACION"?"selected":""}>IMPLEMENTACIÓN</option>
          <option value="GESTION TECNICA" ${tipo==="GESTION TECNICA"?"selected":""}>GESTIÓN TÉCNICA</option>
        </select>

        <label>Monto</label>
        <input id="mv482Monto" type="number" min="0" step="0.01" value="${Number.isFinite(monto)?monto:0}">

        <label>Observación / Descripción</label>
        <textarea id="mv482Descripcion" rows="6" maxlength="4000" placeholder="Descripción de la observación...">${esc(o.descripcion || "")}</textarea>

        <label>Motivo de la corrección <span style="color:#b91c1c">*</span></label>
        <textarea id="mv482Motivo" rows="3" maxlength="500" placeholder="Ej.: Código digitado incorrectamente al registrar."></textarea>

        ${historico ? `
        <label style="display:flex;gap:9px;align-items:flex-start;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:10px;margin-top:10px;color:#9a3412;font-size:12px;font-weight:700">
          <input id="mv482ConfirmarHistorico" type="checkbox" style="width:auto;margin-top:2px">
          <span>Confirmo que deseo corregir un registro de un período histórico (${esc(o.periodo || "")}). El cambio quedará trazado en el historial.</span>
        </label>` : ""}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <button id="mv482GuardarBtn" class="btnObsPrincipal" onclick="mv482GuardarEdicionObservacion('${esc(String(o.id))}')">Guardar corrección</button>
          <button onclick="mostrarObservaciones()">Cancelar</button>
        </div>
        <div id="mv482Mensaje" style="margin-top:10px"></div>
      </div>
    `);
  }

  async function guardar(id){
    if(!esJefaturaGeneral()){
      alert("Solo Jefatura General puede editar observaciones.");
      return;
    }
    const o=encontrar(id);
    if(!o) return;

    const btn=document.getElementById("mv482GuardarBtn");
    const msg=document.getElementById("mv482Mensaje");
    const motivo=texto(document.getElementById("mv482Motivo")?.value);
    const descripcion=texto(document.getElementById("mv482Descripcion")?.value);
    const codigo=texto(document.getElementById("mv482Codigo")?.value);
    const tipo=document.getElementById("mv482Tipo")?.value || "";
    const monto=document.getElementById("mv482Monto")?.value || "0";
    const historico=clavePeriodo(o) && clavePeriodo(o)!==periodoActual();
    const confirmarHistorico=!!document.getElementById("mv482ConfirmarHistorico")?.checked;

    if(!descripcion){ if(msg)msg.innerHTML="❌ La observación/descripción es obligatoria."; return; }
    if(motivo.length<5){ if(msg)msg.innerHTML="❌ Ingrese el motivo de la corrección."; return; }
    if(historico && !confirmarHistorico){ if(msg)msg.innerHTML="❌ Confirme expresamente la corrección del período histórico."; return; }

    if(!confirm("¿Guardar esta corrección? El valor anterior quedará registrado en el historial de ediciones.")) return;

    try{
      if(typeof bloquearBotonObs === "function") bloquearBotonObs(btn,"Guardando...");
      if(typeof mostrarCargandoObs === "function") mostrarCargandoObs("Guardando corrección...");
      if(msg) msg.textContent="Guardando corrección...";

      const u=typeof usuarioActualObs === "function" ? usuarioActualObs() : {usuario:localStorage.getItem("usuario")||""};
      const data=await apiObservaciones({
        accion:"editarDatosObservacionJefaturaV482",
        usuario:u.usuario,
        id:String(id),
        codigo:codigo,
        tipoObservacion:tipo,
        monto:monto,
        descripcion:descripcion,
        motivoCorreccion:motivo,
        confirmarHistorico:confirmarHistorico
      });
      if(!data || data.ok===false) throw new Error(data?.error || "No se pudo guardar la corrección.");

      if(data.sinCambios){
        if(msg) msg.innerHTML="ℹ️ No se detectaron cambios para guardar.";
        return;
      }

      if(msg) msg.innerHTML=`✅ Corrección guardada. ${Number(data.cambios||0)} campo(s) actualizado(s).`;
      if(typeof actualizarIndicadoresObservacionesEnSegundoPlano === "function"){
        actualizarIndicadoresObservacionesEnSegundoPlano(u.usuario);
      }
      setTimeout(function(){ if(typeof mostrarObservaciones === "function") mostrarObservaciones(); },500);
    }catch(err){
      if(msg) msg.innerHTML=`❌ ${esc(err && err.message ? err.message : err)}`;
    }finally{
      if(typeof ocultarCargandoObs === "function") ocultarCargandoObs();
      if(typeof liberarBotonObs === "function") liberarBotonObs(btn);
    }
  }

  window.mv482AbrirEditarObservacion=abrirEditar;
  window.mv482GuardarEdicionObservacion=guardar;

  const aplicarOriginal=window.aplicarFiltrosObservaciones;
  if(typeof aplicarOriginal === "function" && !aplicarOriginal.__mv482Edicion){
    const envoltura=function(){
      const r=aplicarOriginal.apply(this,arguments);
      setTimeout(inyectarBotones,0);
      return r;
    };
    envoltura.__mv482Edicion=true;
    window.aplicarFiltrosObservaciones=envoltura;
    try{ aplicarFiltrosObservaciones=envoltura; }catch(_){}
  }

  setTimeout(inyectarBotones,0);
})();