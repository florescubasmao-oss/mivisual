/* ============================================================
   MI VISUAL V517D F4AB - PLANTILLAS / PRIVACIDAD TECNICO
   31/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO.

   - No modifica plantilla_orden.js ni su comportamiento base.
   - Supervisor / Jefatura / Gerencia conservan la vista completa.
   - Tecnico NO visualiza datos de orden, cliente, servicio, red ni gestion.
   - Tecnico NO dispone de Copiar plantilla completa ni del texto copiable.
   - Tecnico NO puede cargar la ubicacion del cliente desde este modulo.
   - CTO cercanas sigue disponible con GPS propio, coordenadas manuales
     o punto marcado en mapa.
   - No modifica Apps Script, MAPA_ORDENES, permisos, Produccion,
     Mi Desempeno, GAR/VTR, Actas ni optimizaciones.
============================================================ */
(function(){
  "use strict";

  if(window.MV517D_F4AB_PLANTILLA_TECNICO_OK) return;
  window.MV517D_F4AB_PLANTILLA_TECNICO_OK = true;

  let instalado = false;
  let originalRender = null;
  let originalCopiar = null;
  let originalCopiarSeleccion = null;
  let observador = null;
  let temporizador = null;

  function texto(v){
    return String(v == null ? "" : v).trim();
  }

  function perfilNormalizado(){
    return texto(localStorage.getItem("perfil") || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function esTecnico(){
    return perfilNormalizado() === "TECNICO";
  }

  function escapar(v){
    return texto(v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function renderTecnico(orden){
    const resultado = document.getElementById("poResultado");
    if(!resultado) return;

    /* Se conserva la orden internamente solo para que las funciones base
       del modulo sigan operativas. No se imprime ningun dato de la orden. */
    try { poOrdenActual = orden || {}; } catch(_) {}

    let panelCto = "";
    try {
      if(typeof poPanelCtoCercanasHtml === "function"){
        /* false impide precargar/mostrar coordenadas y elimina el boton
           Ubicacion del cliente. */
        panelCto = poPanelCtoCercanasHtml(orden || {}, false) || "";
      }
    } catch(_) {}

    resultado.innerHTML = `
      <section class="po-result-card mv517d-f4ab-tecnico">
        <div class="po-result-top po-result-top-v404">
          <div>
            <b>Plantilla disponible</b>
            <small>Vista habilitada para perfil Técnico</small>
          </div>
        </div>
        <div class="po-actions">
          <button class="po-primary" type="button" onclick="nuevaBusquedaPlantilla()">Nueva búsqueda</button>
        </div>
        <div style="margin:12px 0;padding:13px 15px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;line-height:1.45">
          La información detallada de la orden y la opción de copiar plantilla no se muestran para el perfil Técnico.
        </div>
        ${panelCto}
      </section>`;

    const estadoCto = document.getElementById("poCtoEstado");
    if(estadoCto){
      estadoCto.textContent = "Puede usar GPS, ingresar coordenadas manualmente o marcar un punto en el mapa.";
    }

    /* Defensa visual adicional: nunca dejar campos prellenados con la
       ubicacion del cliente en el perfil Tecnico. */
    const lat = document.getElementById("poCtoLat");
    const lng = document.getElementById("poCtoLng");
    if(lat) lat.value = "";
    if(lng) lng.value = "";
  }

  function instalar(){
    if(instalado) return true;
    if(typeof window.renderPlantillaOrden !== "function") return false;

    originalRender = window.renderPlantillaOrden;
    originalCopiar = window.copiarPlantillaCompleta;
    originalCopiarSeleccion = window.copiarSeleccionPlantilla;

    const renderProtegido = function(orden, plantilla){
      if(!esTecnico()){
        return originalRender.apply(this, arguments);
      }
      return renderTecnico(orden || {});
    };

    const copiarProtegido = function(){
      if(esTecnico()){
        alert("La opción de copiar plantilla no está disponible para el perfil Técnico.");
        return;
      }
      if(typeof originalCopiar === "function"){
        return originalCopiar.apply(this, arguments);
      }
    };

    const copiarSeleccionProtegido = function(){
      if(esTecnico()){
        alert("La opción de copiar plantilla no está disponible para el perfil Técnico.");
        return;
      }
      if(typeof originalCopiarSeleccion === "function"){
        return originalCopiarSeleccion.apply(this, arguments);
      }
    };

    window.renderPlantillaOrden = renderProtegido;
    window.copiarPlantillaCompleta = copiarProtegido;
    window.copiarSeleccionPlantilla = copiarSeleccionProtegido;

    /* Las llamadas internas de plantilla_orden.js usan los identificadores
       globales. Reasignarlos garantiza que consultarPlantillaOrden use la
       misma proteccion y no solo los onclick del DOM. */
    try { renderPlantillaOrden = renderProtegido; } catch(_) {}
    try { copiarPlantillaCompleta = copiarProtegido; } catch(_) {}
    try { copiarSeleccionPlantilla = copiarSeleccionProtegido; } catch(_) {}

    instalado = true;
    if(observador){ observador.disconnect(); observador = null; }
    if(temporizador){ clearInterval(temporizador); temporizador = null; }

    console.log("MI VISUAL V517D F4AB: privacidad de Plantillas activa solo para Tecnico.");
    return true;
  }

  /* plantilla_orden.js se carga de forma lazy. Se observa su insercion para
     envolverlo antes de que el usuario haga la primera consulta. */
  observador = new MutationObserver(function(cambios){
    cambios.forEach(function(cambio){
      Array.from(cambio.addedNodes || []).forEach(function(nodo){
        if(!nodo || nodo.tagName !== "SCRIPT") return;
        const src = String(nodo.src || "");
        if(!src.includes("/js/plantilla_orden.js")) return;
        nodo.addEventListener("load", function(){
          instalar();
          if(typeof queueMicrotask === "function") queueMicrotask(instalar);
          else setTimeout(instalar,0);
        }, {once:true});
      });
    });
  });

  try {
    observador.observe(document.documentElement, {childList:true, subtree:true});
  } catch(_) {}

  /* Respaldo para sesiones donde el modulo ya estuviera cargado. */
  instalar();
  let intentos = 0;
  temporizador = setInterval(function(){
    intentos++;
    if(instalar() || intentos >= 240){
      clearInterval(temporizador);
      temporizador = null;
    }
  }, 250);
})();
