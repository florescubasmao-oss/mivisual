/* ============================================================
   MI VISUAL V454 - GAR/VTR: OBSERVAR Y REENVIAR
   CAPA INCREMENTAL:
   - Conserva validacion_tecnica_v173.js.
   - Conserva optimización V341 (caché 60 s + solicitud única).
   - Conserva datos V430 y su búsqueda bajo demanda.
   - Jefatura puede OBSERVAR GAR/VTR.
   - Solo el técnico propietario puede corregir el motivo y REENVIAR.
============================================================ */
(function(){
  "use strict";

  if(window.MV454_VT_OBSERVAR_REENVIAR_OK) return;
  window.MV454_VT_OBSERVAR_REENVIAR_OK = true;

  const botonesBase = window.botonesValidacion;
  const cargarBase = window.cargarValidacionesTecnicas;
  const historialBase = window.renderHistorialValidacionLocal;

  function txt(v){ return String(v ?? "").trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  }
  function js(v){ return txt(v).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\r?\n/g,"\\n"); }
  function usuarioActual(){
    return {
      usuario: localStorage.getItem("usuario") || "",
      perfil: norm(localStorage.getItem("perfil") || "")
    };
  }
  function buscarItem(id){
    return (window.vtValidacionesActuales || []).find(x=>txt(x?.id)===txt(id)) || null;
  }

  // Mantiene todos los botones históricos y agrega OBSERVAR solo a GAR/VTR.
  if(typeof botonesBase === "function"){
    window.botonesValidacion = function(item){
      const tipo = norm(item?.tipoValidacion);
      if(tipo === "GAR" || tipo === "VTR"){
        const id = js(item?.id || "");
        return `<button class="vt-btn money" onclick="abrirValidarTecnica('${id}','BONO')">Bono</button>
                <button class="vt-btn warn" onclick="abrirValidarTecnica('${id}','OBSERVADO')">Observar</button>
                <button class="vt-btn bad" onclick="abrirValidarTecnica('${id}','NO BONO')">No Bono</button>`;
      }
      return botonesBase.apply(this,arguments);
    };
    try{ botonesValidacion = window.botonesValidacion; }catch(_){}
  }

  function cerrarModal(){
    document.getElementById("vt454Modal")?.remove();
  }

  window.vt454CerrarReenvio = cerrarModal;

  window.vt454AbrirReenvio = function(id){
    const u = usuarioActual();
    const item = buscarItem(id);
    if(!item) return alert("No se encontró la validación. Pulse Actualizar.");
    if(u.perfil !== "TECNICO") return alert("Solo el técnico puede reenviar una validación observada.");
    if(norm(item.estado) !== "OBSERVADO") return alert("Esta validación ya no está observada.");
    if(!["GAR","VTR"].includes(norm(item.tipoValidacion))) return alert("El reenvío aplica solo a GAR/VTR.");
    if(norm(item.tecnico) !== norm(u.usuario)) return alert("Esta validación pertenece a otro técnico.");

    cerrarModal();
    const m = document.createElement("div");
    m.id = "vt454Modal";
    m.className = "vt-modal-backdrop";
    m.innerHTML = `
      <div class="vt-modal" role="dialog" aria-modal="true">
        <div class="vt-modal-head">
          <h3>↩️ Corregir y reenviar GAR/VTR</h3>
          <button class="vt-modal-close" type="button" onclick="vt454CerrarReenvio()">×</button>
        </div>

        <div class="vt-report-note" style="margin:0 0 10px;background:#fff7ed;border-color:#fdba74;color:#9a3412;">
          <b>Observación de Jefatura</b><br>${esc(item.motivoValidacion || "Sin detalle")}
        </div>

        <div class="vt-grid">
          <div class="vt-field"><label>Código</label><input value="${esc(item.codigo||"")}" disabled></div>
          <div class="vt-field"><label>Ticket</label><input value="${esc(item.ticketFinal||"")}" disabled></div>
          <div class="vt-field"><label>Tipo</label><input value="${esc(item.tipoValidacion||"")}" disabled></div>
          <div class="vt-field"><label>Origen</label><input value="${esc(item.origenOrden||"SIN REGISTRO")}" disabled></div>
        </div>

        <div class="vt-field">
          <label>Corrección / motivo técnico actualizado</label>
          <textarea id="vt454MotivoTecnico" placeholder="Explique la corrección antes de reenviar...">${esc(item.motivoTecnico||"")}</textarea>
        </div>

        <div id="vt454Estado" class="vt-report-note" style="display:none"></div>
        <div class="vt-actions" style="justify-content:flex-end">
          <button class="vt-btn secondary" type="button" onclick="vt454CerrarReenvio()">Cancelar</button>
          <button id="vt454Guardar" class="vt-btn ok" type="button" onclick="vt454GuardarReenvio('${js(item.id)}')">↩️ Reenviar a Jefatura</button>
        </div>
      </div>`;
    m.addEventListener("click",e=>{ if(e.target===m) cerrarModal(); });
    document.body.appendChild(m);
  };

  window.vt454GuardarReenvio = async function(id){
    const motivo = txt(document.getElementById("vt454MotivoTecnico")?.value);
    const estado = document.getElementById("vt454Estado");
    const btn = document.getElementById("vt454Guardar");
    if(!motivo){
      if(estado){ estado.style.display="block"; estado.textContent="Ingrese la corrección antes de reenviar."; }
      return;
    }

    try{
      if(btn){ btn.disabled=true; btn.textContent="Reenviando..."; }
      if(estado){ estado.style.display="block"; estado.textContent="Guardando corrección..."; }
      const r = await window.apiValidacionTecnica({
        accion:"reenviarValidacionTecnicaV454",
        usuario:localStorage.getItem("usuario") || "",
        id,
        motivoTecnico:motivo
      });
      if(!r || r.ok===false) throw new Error(r?.error || "No se pudo reenviar.");
      if(estado){ estado.textContent="✅ Reenviado a Jefatura. Vuelve a estado PENDIENTE."; }
      if(typeof window.vtLimpiarCacheValidacionTecnica === "function") window.vtLimpiarCacheValidacionTecnica();
      setTimeout(async function(){
        cerrarModal();
        try{
          if(typeof window.cargarValidacionesTecnicas === "function") await window.cargarValidacionesTecnicas(true);
        }catch(_){ }
      },500);
    }catch(e){
      if(estado){ estado.style.display="block"; estado.textContent="❌ "+(e?.message||"No se pudo reenviar."); }
      if(btn){ btn.disabled=false; btn.textContent="↩️ Reenviar a Jefatura"; }
    }
  };

  function instalarBotonesReenvio(){
    const u = usuarioActual();
    if(u.perfil !== "TECNICO") return;

    document.querySelectorAll(".vt-item").forEach(card=>{
      if(card.querySelector(".vt454-reenviar")) return;
      const id = txt(card.querySelector(".vt-id")?.textContent);
      const item = buscarItem(id);
      if(!item) return;
      if(norm(item.estado) !== "OBSERVADO") return;
      if(!["GAR","VTR"].includes(norm(item.tipoValidacion))) return;
      if(norm(item.tecnico) !== norm(u.usuario)) return;

      const acciones = card.querySelector(".vt-actions");
      if(!acciones) return;
      acciones.insertAdjacentHTML("beforeend",
        `<button class="vt-btn warn vt454-reenviar" type="button" onclick="vt454AbrirReenvio('${js(item.id)}')">↩️ Corregir y reenviar</button>`
      );
    });
  }

  // Los filtros del historial vuelven a renderizar tarjetas; reinstala el botón
  // sin nuevas consultas ni llamadas a Apps Script.
  if(typeof historialBase === "function"){
    window.renderHistorialValidacionLocal = function(){
      const r = historialBase.apply(this,arguments);
      setTimeout(instalarBotonesReenvio,0);
      return r;
    };
    try{ renderHistorialValidacionLocal = window.renderHistorialValidacionLocal; }catch(_){}
  }

  if(typeof cargarBase === "function"){
    window.cargarValidacionesTecnicas = async function(){
      const r = await cargarBase.apply(this,arguments);
      instalarBotonesReenvio();
      return r;
    };
    try{ cargarValidacionesTecnicas = window.cargarValidacionesTecnicas; }catch(_){}
  }

  setTimeout(instalarBotonesReenvio,0);
})();
