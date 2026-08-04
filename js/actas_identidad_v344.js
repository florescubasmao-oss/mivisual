/* ==========================================================
   MI VISUAL V344 - Identidad correcta de las actas
   Código de Pedido: puede repetirse (identifica al cliente).
   Código de Orden y Número de Acta: únicos.
========================================================== */
(function(){
  "use strict";

  function escV344(valor){
    return typeof window.limpiarHtmlActas === "function"
      ? window.limpiarHtmlActas(valor)
      : String(valor ?? "").replace(/[&<>"']/g, function(c){
          return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
        });
  }

  function botonesLecturaActaV344(a){
    const u = window.usuarioActualActas();
    const id = String(a.id || "").replace(/'/g,"\\'");
    let html = `${window.botonDetalleActa(a)} ${window.botonPdfActa(a)}`;

    if(u.perfil === "TECNICO" && window.esActaFaltantePendiente(a)){
      html += ` <button class="actas-btn orange" onclick="mostrarFormularioActa('${id}')">Completar acta faltante</button>`;
    }else if(u.perfil === "TECNICO" && window.estaObservadaActa(a) && !window.estaFinalizadaActa(a)){
      html += ` <button class="actas-btn danger" onclick="mostrarFormularioActa('${id}')">Reemplazar PDF</button>`;
    }
    return html;
  }

  async function mostrarFormularioActaV344(idActaPrefill){
    const u = window.usuarioActualActas();
    let actaPrefill = null;

    if(idActaPrefill){
      try{
        const data = await window.apiActas({accion:"listarActasEscaneadas", usuario:u.usuario});
        const lista = data.actas || [];
        actaPrefill = lista.find(function(a){ return String(a.id || "") === String(idActaPrefill); }) || null;

        // Compatibilidad con botones anteriores: solo usa Código de Pedido si
        // existe una única coincidencia; evita abrir el acta equivocada.
        if(!actaPrefill){
          const coincidencias = lista.filter(function(a){
            return String(a.codigoPedido || "") === String(idActaPrefill);
          });
          if(coincidencias.length === 1) actaPrefill = coincidencias[0];
          if(coincidencias.length > 1){
            alert("Existen varias actas para este Código de Pedido. Abra nuevamente el registro específico.");
            return;
          }
        }
      }catch(e){}
    }

    const esFaltante = !!(actaPrefill && window.esActaFaltantePendiente(actaPrefill));
    if(u.perfil !== "TECNICO"){
      window.mostrarPantalla(`${window.estiloActas()}<div class="actas-wrap"><div class="actas-msg err">Solo el técnico puede subir actas.</div></div>`);
      return;
    }

    const fechaAutomatica = actaPrefill?.fechaGestion || window.fechaHoyLimaActas();
    window._actaAutomaticosBase = {
      sede:u.sede,
      cuadrilla:u.cuadrilla,
      fechaGestion:fechaAutomatica,
      tipoEjecucion:actaPrefill?.tipoEjecucion || "",
      tipoPartida:actaPrefill?.tipoPartida || "",
      dni:actaPrefill?.dni || "",
      cliente:actaPrefill?.cliente || "",
      codigoPedidoOriginal:String(actaPrefill?.codigoPedido || ""),
      codigoOrdenOriginal:String(actaPrefill?.codigoOrden || "")
    };
    window._actaAutomaticosActuales = Object.assign({}, window._actaAutomaticosBase);

    window.mostrarPantalla(`
      ${window.estiloActas()}
      <div class="actas-wrap">
        <div class="actas-head">
          <h2>📄 ${esFaltante ? "Completar Acta Faltante" : (actaPrefill ? "Reemplazar Acta Observada" : "Subir Acta Escaneada")}</h2>
          <p>Ingresa los códigos, el número de acta y adjunta el PDF. Los demás datos se completan automáticamente.</p>
        </div>
        <form id="formActa" onsubmit="event.preventDefault(); guardarActa(this.querySelector('[data-guardar]'))">
          <details id="guiaCodigosActa" class="actas-code-guide actas-code-guide-top">
            <summary>¿Dónde encuentro los códigos?</summary>
            <div class="actas-code-guide-body">
              <img src="./img/guia_codigos_acta.png?v=V268" alt="Guía para ubicar el código de orden y el código de pedido">
              <p><b>Código de orden:</b> identifica la solicitud o atención.<br><b>Código de pedido:</b> identifica al cliente y puede repetirse en diferentes órdenes.</p>
            </div>
          </details>
          <div class="actas-upload-layout">
            <div class="actas-upload-main">
              <div class="actas-grid">
                <div class="actas-field">
                  <label>Código de orden</label>
                  <input id="actaCodigoOrden" value="${escV344(actaPrefill?.codigoOrden || "")}" ${actaPrefill ? "readonly" : ""} required
                    oninput="programarConsultaDatosAutomaticosActa()" onblur="consultarDatosAutomaticosFormularioActa()">
                </div>
                <div class="actas-field">
                  <label>Código de pedido</label>
                  <input id="actaCodigoPedido" value="${escV344(actaPrefill?.codigoPedido || "")}" ${actaPrefill ? "readonly" : ""} required
                    oninput="programarConsultaDatosAutomaticosActa()" onblur="consultarDatosAutomaticosFormularioActa()">
                </div>
                <div class="actas-field" style="grid-column:1/-1">
                  <label>Número de acta</label>
                  <input id="actaNumeroActa" value="${escV344(actaPrefill?.numeroActa || "")}" placeholder="Ej.: 00015487" required>
                  <small style="display:block;margin-top:7px;color:#475569;font-weight:700;line-height:1.35">
                    El Código de Pedido puede repetirse para el mismo cliente. El Código de Orden y el Número de Acta no pueden repetirse.
                  </small>
                </div>
                <div class="actas-auto-card">
                  <div class="actas-auto-title">Datos automáticos</div>
                  <div class="actas-auto-grid">
                    <div class="actas-auto-item"><span>Sede</span><b id="actaAutoSede"></b></div>
                    <div class="actas-auto-item"><span>Cuadrilla</span><b id="actaAutoCuadrilla"></b></div>
                    <div class="actas-auto-item"><span>Fecha de gestión</span><b id="actaAutoFecha"></b></div>
                    <div class="actas-auto-item"><span>Tipo de ejecución</span><b id="actaAutoTipoEjecucion"></b></div>
                    <div class="actas-auto-item"><span>Tipo de partida</span><b id="actaAutoTipoPartida"></b></div>
                    <div class="actas-auto-item"><span>DNI</span><b id="actaAutoDni"></b></div>
                    <div class="actas-auto-item"><span>Cliente</span><b id="actaAutoCliente"></b></div>
                  </div>
                  <div id="actaAutoEstado" class="actas-auto-status"></div>
                </div>
                <div class="actas-field" style="grid-column:1/-1">
                  <label>Acta escaneada PDF</label>
                  <input type="file" id="actaPdf" accept="application/pdf,.pdf" required>
                </div>
              </div>
              <div id="actaMsg"></div>
              <div class="actas-actions">
                <button class="actas-btn ok" data-guardar type="submit">${esFaltante ? "Completar acta" : (actaPrefill ? "Reemplazar PDF" : "Guardar Acta")}</button>
                <button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Cancelar</button>
              </div>
            </div>
          </div>
        </form>
      </div>`);

    window.pintarDatosAutomaticosActa(window._actaAutomaticosBase, "Los datos se completarán automáticamente al validar los códigos.", "");
    if(document.getElementById("actaCodigoOrden")?.value || document.getElementById("actaCodigoPedido")?.value){
      window.consultarDatosAutomaticosFormularioActa();
    }
  }

  function aplicarV344(){
    if(typeof window.apiActas !== "function" || typeof window.estiloActas !== "function" || typeof window.usuarioActualActas !== "function") return false;
    window.botonesLecturaActa = botonesLecturaActaV344;
    window.mostrarFormularioActa = mostrarFormularioActaV344;
    window.MV344_IDENTIDAD_ACTAS_OK = true;
    console.log("MI VISUAL V344: identidad única de actas habilitada.");
    return true;
  }

  window.mv344AplicarIdentidadActas = aplicarV344;
  if(aplicarV344()) return;

  const observador = new MutationObserver(function(cambios){
    cambios.forEach(function(cambio){
      Array.from(cambio.addedNodes || []).forEach(function(nodo){
        if(nodo && nodo.tagName === "SCRIPT" && String(nodo.src || "").includes("actas.js")){
          nodo.addEventListener("load", function(){
            if(aplicarV344()) observador.disconnect();
          }, {once:true});
        }
      });
    });
  });
  observador.observe(document.documentElement,{childList:true,subtree:true});

  const verificador = setInterval(function(){
    if(aplicarV344()){
      clearInterval(verificador);
      observador.disconnect();
    }
  },350);
})();
