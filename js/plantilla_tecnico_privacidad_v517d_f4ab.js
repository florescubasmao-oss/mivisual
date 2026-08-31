/* ============================================================
   MI VISUAL V517D F4AB2 - PLANTILLAS
   31/08/2026

   - Todos los perfiles conservan la ficha completa y Copiar plantilla.
   - Solo TECNICO: oculta CUADRILLA en ficha y texto copiable.
   - Si la API entrega varias opciones, muestra selector para todos.
   - No modifica permisos, datos, Produccion, Mi Desempeno ni GAR/VTR.
============================================================ */
(function(){
  "use strict";

  if(window.MV517D_F4AB2_PLANTILLAS_OK) return;
  window.MV517D_F4AB2_PLANTILLAS_OK = true;

  let instalado = false;
  let observador = null;
  let temporizador = null;
  let originalRender = null;
  let originalConsultar = null;
  let originalNuevaBusqueda = null;
  let opcionesActuales = [];
  let indiceActual = 0;

  function txt(v){
    return String(v == null ? "" : v).trim();
  }

  function normalizar(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function esc(v){
    return txt(v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function esTecnico(){
    return normalizar(localStorage.getItem("perfil") || "") === "TECNICO";
  }

  function sanitizarPlantillaTecnico(valor){
    return String(valor == null ? "" : valor)
      .split(/\r?\n/)
      .filter(function(linea){
        return !/^\s*(?:\*\*)?CUADRILLA(?:\*\*)?\s*:/i.test(linea);
      })
      .join("\n")
      .replace(/\n{3,}/g,"\n\n")
      .trim();
  }

  function protegerDomTecnico(){
    if(!esTecnico()) return;

    document.querySelectorAll("#poResultado .po-field").forEach(function(campo){
      const etiqueta = campo.querySelector("span");
      if(etiqueta && normalizar(etiqueta.textContent) === "CUADRILLA") campo.remove();
    });

    const area = document.getElementById("poTextoPlantilla");
    if(area) area.value = sanitizarPlantillaTecnico(area.value);
  }

  function renderProtegido(orden, plantilla){
    if(typeof originalRender !== "function") return;

    if(!esTecnico()){
      return originalRender.call(this, orden || {}, plantilla || "");
    }

    const ordenTecnico = Object.assign({}, orden || {}, {cuadrilla:""});
    const salida = originalRender.call(this, ordenTecnico, sanitizarPlantillaTecnico(plantilla));
    protegerDomTecnico();
    return salida;
  }

  function obtenerContenedorSelector(){
    const resultado = document.getElementById("poResultado");
    if(!resultado || !resultado.parentNode) return null;

    let contenedor = document.getElementById("poSelectorOrdenesF4AB");
    if(!contenedor){
      contenedor = document.createElement("div");
      contenedor.id = "poSelectorOrdenesF4AB";
      resultado.parentNode.insertBefore(contenedor, resultado);
    }
    return contenedor;
  }

  function limpiarSelector(){
    opcionesActuales = [];
    indiceActual = 0;
    const contenedor = document.getElementById("poSelectorOrdenesF4AB");
    if(contenedor) contenedor.remove();
  }

  function pintarSelector(){
    const contenedor = obtenerContenedorSelector();
    if(!contenedor) return;

    if(opcionesActuales.length <= 1){
      contenedor.innerHTML = "";
      contenedor.style.display = "none";
      return;
    }

    contenedor.style.display = "";
    contenedor.innerHTML = `
      <section class="mv517d-f4ab-selector" style="margin:14px 0;background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:14px">
        <div style="font-weight:900;color:#0f172a;margin-bottom:10px">Seleccione la orden</div>
        <div style="display:grid;gap:8px">
          ${opcionesActuales.map(function(opcion, i){
            const orden = opcion.orden || {};
            const activo = i === indiceActual;
            const meta = [txt(orden.fechaSolicitud), txt(orden.horaSolicitud), txt(orden.estado)].filter(Boolean).join(" · ");
            const tipo = txt(orden.tipoTrabajo || orden.productoOrigen || "");
            return `<button type="button" onclick="seleccionarPlantillaOrdenF4AB(${i})" style="text-align:left;width:100%;border:${activo?"2px solid #0ea5e9":"1px solid #cbd5e1"};background:${activo?"#eff6ff":"#fff"};border-radius:12px;padding:11px 13px;cursor:pointer">
              <b style="display:block;color:#0f172a">Orden ${esc(orden.ordenId || "Sin código")}</b>
              ${meta?`<span style="display:block;margin-top:3px;color:#475569;font-size:12px">${esc(meta)}</span>`:""}
              ${tipo?`<small style="display:block;margin-top:3px;color:#64748b">${esc(tipo)}</small>`:""}
            </button>`;
          }).join("")}
        </div>
      </section>`;
  }

  function seleccionarPlantilla(indice){
    const i = Number(indice);
    if(!Number.isInteger(i) || i < 0 || i >= opcionesActuales.length) return;

    indiceActual = i;
    const opcion = opcionesActuales[i] || {};
    renderProtegido(opcion.orden || {}, opcion.plantilla || "");
    pintarSelector();
  }

  async function consultarProtegido(){
    const input = document.getElementById("poConsulta");
    const estado = document.getElementById("poEstado");
    const resultado = document.getElementById("poResultado");
    const consulta = String(input?.value || "").replace(/\s+/g,"").trim();

    if(!consulta){
      if(estado) estado.textContent = "Ingrese cualquiera de los datos indicados para consultar.";
      if(input) input.focus();
      return;
    }

    limpiarSelector();
    if(estado){
      estado.className = "po-status loading";
      estado.textContent = "Buscando coincidencias...";
    }
    if(resultado) resultado.innerHTML = "";

    try{
      const api = (typeof poApi === "function") ? poApi : null;
      const usuario = (typeof poUsuario === "function") ? poUsuario() : (localStorage.getItem("usuario") || localStorage.getItem("correo") || "");

      if(!api && typeof originalConsultar === "function"){
        return originalConsultar.apply(this, arguments);
      }

      const data = await api({accion:"consultarPlantillaOrden",usuario,consulta,codigoCliente:consulta});
      const criterio = txt(data.criterioBusqueda || "");
      const recibidas = Array.isArray(data.opciones) ? data.opciones.filter(function(x){ return x && x.orden; }) : [];

      opcionesActuales = recibidas.length
        ? recibidas
        : [{orden:data.orden || {}, plantilla:data.plantilla || "", criterioBusqueda:criterio}];
      indiceActual = 0;

      if(estado){
        estado.className = "po-status ok";
        if(opcionesActuales.length > 1){
          estado.textContent = `Se encontraron ${Number(data.coincidencias || opcionesActuales.length)} órdenes permitidas${criterio?` por ${criterio}`:""}. Seleccione una orden.`;
        }else{
          estado.textContent = `Orden encontrada${criterio?` por ${criterio}`:""}.`;
        }
      }

      const opcion = opcionesActuales[0] || {};
      renderProtegido(opcion.orden || {}, opcion.plantilla || "");
      pintarSelector();
    }catch(error){
      if(estado){
        estado.className = "po-status error";
        estado.textContent = error?.message || String(error || "No se pudo realizar la consulta");
      }
    }
  }

  function nuevaBusquedaProtegida(){
    limpiarSelector();
    if(typeof originalNuevaBusqueda === "function"){
      return originalNuevaBusqueda.apply(this, arguments);
    }
  }

  function instalar(){
    if(instalado) return true;
    if(typeof window.renderPlantillaOrden !== "function" || typeof window.consultarPlantillaOrden !== "function") return false;

    originalRender = window.renderPlantillaOrden;
    originalConsultar = window.consultarPlantillaOrden;
    originalNuevaBusqueda = window.nuevaBusquedaPlantilla;

    window.renderPlantillaOrden = renderProtegido;
    window.consultarPlantillaOrden = consultarProtegido;
    window.seleccionarPlantillaOrdenF4AB = seleccionarPlantilla;
    if(typeof originalNuevaBusqueda === "function") window.nuevaBusquedaPlantilla = nuevaBusquedaProtegida;

    try { renderPlantillaOrden = renderProtegido; } catch(_) {}
    try { consultarPlantillaOrden = consultarProtegido; } catch(_) {}
    try { if(typeof originalNuevaBusqueda === "function") nuevaBusquedaPlantilla = nuevaBusquedaProtegida; } catch(_) {}

    instalado = true;
    if(observador){ observador.disconnect(); observador = null; }
    if(temporizador){ clearInterval(temporizador); temporizador = null; }

    console.log("MI VISUAL V517D F4AB2: selector multiple y Tecnico sin Cuadrilla.");
    return true;
  }

  observador = new MutationObserver(function(cambios){
    cambios.forEach(function(cambio){
      Array.from(cambio.addedNodes || []).forEach(function(nodo){
        if(!nodo || nodo.tagName !== "SCRIPT") return;
        if(!String(nodo.src || "").includes("/js/plantilla_orden.js")) return;
        nodo.addEventListener("load", function(){ setTimeout(instalar,0); }, {once:true});
      });
    });
  });

  try { observador.observe(document.documentElement,{childList:true,subtree:true}); } catch(_) {}

  instalar();
  let intentos = 0;
  temporizador = setInterval(function(){
    intentos++;
    if(instalar() || intentos >= 240){
      clearInterval(temporizador);
      temporizador = null;
    }
  },250);
})();
