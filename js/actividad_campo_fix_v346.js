/* ============================================================
   MI VISUAL V452 - Actividad en Campo · puente Checklist vigente
   Corrige la carga de formularios por tipo de actividad sin
   retirar la optimización dinámica V339.
============================================================ */
(function(){
  "use strict";

  let aplicado = false;
  let cargandoChecklist = false;

  function actV346Esc(valor){
    return String(valor ?? "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
    });
  }

  function dependenciasChecklistDisponibles(){
    // V452: el Checklist actual ya no usa CK_TIPOS_V140/ckFormularioPorTipo.
    // Actividad en Campo solo necesita los constructores vigentes del formulario.
    return (
      typeof window.ckEquipoBlock === "function" &&
      typeof window.ckField === "function"
    );
  }

  async function cargarChecklistSoloCuandoCorresponda(){
    if(dependenciasChecklistDisponibles()) return true;
    if(cargandoChecklist) return false;

    cargandoChecklist = true;
    try{
      if(typeof window.mv339CargarModulo !== "function"){
        throw new Error("El cargador dinámico no está disponible.");
      }

      await window.mv339CargarModulo("checklist");
      return dependenciasChecklistDisponibles();
    }finally{
      cargandoChecklist = false;
    }
  }

  async function renderFormularioTipoActividadV346(){
    const select = document.getElementById("actTipoActividad");
    const cont = document.getElementById("camposTipoActividad");
    if(!select || !cont) return;

    const tipo = typeof window.nombreTipoActividadCampo === "function"
      ? window.nombreTipoActividadCampo(select.value || "AUDITORIA EN FRIO")
      : String(select.value || "AUDITORIA EN FRIO").trim().toUpperCase();

    try{
      let html = "";

      // V346: se construye únicamente el formulario seleccionado.
      // Antes se ejecutaban todos los formularios al mismo tiempo y el
      // Checklist fallaba cuando su módulo todavía no había sido cargado.
      switch(tipo){
        case "AUDITORIA EN FRIO":
          html = window.formularioAuditoriaFrio();
          break;

        case "AUDITORIA EN CALIENTE":
          html = window.formularioSupervisionCaliente();
          break;

        case "SEGUIMIENTO":
          html = window.formularioSeguimiento();
          break;

        case "VALIDACION DE OBSERVACION":
          html = window.formularioValidacionObservacion();
          break;

        case "CAPACITACION":
          html = window.formularioCapacitacion();
          break;

        case "CHECKLIST":
          if(!dependenciasChecklistDisponibles()){
            cont.innerHTML = `
              <div class="act-card">
                <div class="act-note">⏳ Cargando formulario de Checklist Almacén...</div>
              </div>`;

            try{
              const listo = await cargarChecklistSoloCuandoCorresponda();
              if(!listo) throw new Error("No se pudieron cargar los componentes del Checklist.");
            }catch(error){
              cont.innerHTML = `
                <div class="act-card">
                  <div class="act-error">
                    No se pudo cargar el formulario de Checklist.<br>
                    <small>${actV346Esc(error.message || error)}</small>
                  </div>
                  <div class="act-actions">
                    <button type="button" class="act-btn sec" onclick="renderFormularioTipoActividad()">
                      Reintentar
                    </button>
                  </div>
                </div>`;
              return;
            }
          }

          html = window.formularioChecklist();
          break;

        default:
          html = window.formularioAuditoriaFrio();
      }

      cont.innerHTML = html || "";

      if(typeof window.renderCierreActividad === "function"){
        window.renderCierreActividad(tipo);
      }

      if(typeof window.renderEvidenciasActividadCampo === "function"){
        window.renderEvidenciasActividadCampo(tipo);
      }

      if(
        typeof window.esTipoAuditoriaCampo === "function" &&
        window.esTipoAuditoriaCampo(tipo) &&
        typeof window.renderChecklistAuditoriaCampo === "function"
      ){
        window.renderChecklistAuditoriaCampo();
      }

      if(
        tipo === "CHECKLIST" &&
        typeof window.inicializarChecklistActividadCampo === "function"
      ){
        window.inicializarChecklistActividadCampo();
      }
    }catch(error){
      console.error("V346: error al construir Actividad en Campo", error);
      cont.innerHTML = `
        <div class="act-card">
          <div class="act-error">
            No se pudieron mostrar las opciones de ${actV346Esc(tipo)}.<br>
            <small>${actV346Esc(error.message || error)}</small>
          </div>
          <div class="act-actions">
            <button type="button" class="act-btn sec" onclick="renderFormularioTipoActividad()">
              Reintentar
            </button>
          </div>
        </div>`;
    }
  }

  function aplicarV346(){
    if(typeof window.renderFormularioTipoActividad !== "function") return false;
    if(window.renderFormularioTipoActividad.__mv346Actividad) return true;

    renderFormularioTipoActividadV346.__mv346Actividad = true;
    window.renderFormularioTipoActividad = renderFormularioTipoActividadV346;
    window.MV346_ACTIVIDAD_CAMPO_OK = true;
    aplicado = true;

    console.log("MI VISUAL V452: enlace Actividad en Campo → Checklist vigente.");
    return true;
  }

  window.mv346AplicarActividadCampo = aplicarV346;

  if(aplicarV346()) return;

  const observador = new MutationObserver(function(cambios){
    cambios.forEach(function(cambio){
      Array.from(cambio.addedNodes || []).forEach(function(nodo){
        if(
          nodo &&
          nodo.tagName === "SCRIPT" &&
          String(nodo.src || "").includes("actividad_campo.js")
        ){
          nodo.addEventListener("load", function(){
            if(aplicarV346()) observador.disconnect();
          }, {once:true});
        }
      });
    });
  });

  observador.observe(document.documentElement, {childList:true, subtree:true});

  const verificador = setInterval(function(){
    if(aplicado || aplicarV346()){
      clearInterval(verificador);
      observador.disconnect();
    }
  }, 300);
})();