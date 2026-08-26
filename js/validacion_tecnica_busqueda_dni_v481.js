/* ============================================================
   MI VISUAL V481 - VALIDACIÓN TÉCNICA / BÚSQUEDA CÓDIGO + DNI

   Alcance estricto:
   - Reutiliza el mismo cuadro de búsqueda del Historial.
   - Busca por Código o DNI sobre window.vtValidacionesActuales ya cargado.
   - Conserva exactamente los demás filtros del módulo.
   - No realiza llamadas adicionales a Apps Script, Sheets ni Drive.
   - No modifica la carga, caché, guardado, aprobación ni VTR/GAR.
============================================================ */
(function(){
  "use strict";

  if(window.MV481_VT_BUSQUEDA_DNI_OK) return;
  window.MV481_VT_BUSQUEDA_DNI_OK = true;

  const hookAnterior = window.mv339Antes_mostrarValidacionTecnica;

  function texto(v){
    return String(v == null ? "" : v).trim();
  }

  function instalarFiltro(){
    const base = window.aplicarFiltrosHistorialVT;
    if(typeof base !== "function") return false;
    if(base.__mv481CodigoDni) return true;

    function aplicarFiltrosHistorialV481(lista){
      const input = document.getElementById("vtBuscarCodigo");
      const original = input ? input.value : "";
      const consulta = texto(original).toUpperCase();

      if(!consulta){
        return base.apply(this, arguments);
      }

      // El filtro original conserva tipo, sede, estado, cuadrilla, origen y período.
      // Solo anulamos temporalmente SU búsqueda por código para ampliarla a Código + DNI.
      let filtradas;
      if(input) input.value = "";
      try{
        filtradas = base.apply(this, arguments);
      }finally{
        if(input) input.value = original;
      }

      const consultaDigitos = consulta.replace(/\D/g, "");

      return (Array.isArray(filtradas) ? filtradas : []).filter(function(x){
        const codigo = texto(x && x.codigo).toUpperCase();
        const dniOriginal = texto(
          x && (x.dniCliente != null ? x.dniCliente :
          (x.dni != null ? x.dni : x.numeroDocumento))
        );
        const dniTexto = dniOriginal.toUpperCase();
        const dniDigitos = dniOriginal.replace(/\D/g, "");

        if(codigo.includes(consulta)) return true;
        if(dniTexto.includes(consulta)) return true;
        if(consultaDigitos && dniDigitos.includes(consultaDigitos)) return true;
        return false;
      });
    }

    aplicarFiltrosHistorialV481.__mv481CodigoDni = true;
    aplicarFiltrosHistorialV481.__mv481Base = base;
    window.aplicarFiltrosHistorialVT = aplicarFiltrosHistorialV481;
    try{ aplicarFiltrosHistorialVT = aplicarFiltrosHistorialV481; }catch(_){}
    return true;
  }

  function ajustarBuscador(){
    const input = document.getElementById("vtBuscarCodigo");
    if(!input) return;
    input.placeholder = "🔍 Buscar por código o DNI";
    input.setAttribute("aria-label", "Buscar por código o DNI");
  }

  window.mv339Antes_mostrarValidacionTecnica = function(){
    if(typeof hookAnterior === "function"){
      try{ hookAnterior.apply(this, arguments); }catch(_){}
    }

    instalarFiltro();

    // mostrarValidacionTecnica dibuja el Historial de forma síncrona.
    // Se ajusta el placeholder al siguiente ciclo sin bloquear la apertura.
    setTimeout(function(){
      instalarFiltro();
      ajustarBuscador();
    }, 0);
  };

  // Compatibilidad si Validación Técnica ya hubiera sido precargada.
  instalarFiltro();
})();

/* ============================================================
   MI VISUAL V487.25 - CARGA PEREZOSA DEL SUBMODULO VTR/GAR
   - Mantiene intacto V481.
   - El archivo VTR/GAR solo se descarga cuando se abre Validacion Tecnica.
   - No agrega carga al inicio general de MI VISUAL.
============================================================ */
(function(){
  "use strict";

  if(window.MV48725_LOADER_VTRGAR_VT_OK) return;
  window.MV48725_LOADER_VTRGAR_VT_OK = true;

  const hookAnterior = window.mv339Antes_mostrarValidacionTecnica;
  let promesa = null;

  function cargarSubmodulo(){
    if(window.MI_VISUAL_V48725_VTRGAR_VT_ACTIVO){
      if(typeof window.mv48725MontarVtrGarValidacion === "function"){
        window.mv48725MontarVtrGarValidacion();
      }
      return Promise.resolve();
    }
    if(promesa) return promesa;

    promesa = new Promise(function(resolve,reject){
      const s = document.createElement("script");
      s.src = "./js/validacion_tecnica_vtrgar_v48725.js?v=V487.25-WIN";
      s.async = true;
      s.onload = function(){
        if(typeof window.mv48725MontarVtrGarValidacion === "function"){
          window.mv48725MontarVtrGarValidacion();
        }
        resolve();
      };
      s.onerror = function(){
        promesa = null;
        reject(new Error("No se pudo cargar el submódulo VTR/GAR."));
      };
      document.head.appendChild(s);
    });

    return promesa;
  }

  window.mv339Antes_mostrarValidacionTecnica = function(){
    if(typeof hookAnterior === "function"){
      try{ hookAnterior.apply(this,arguments); }catch(_){}
    }

    // El hook se ejecuta justo antes de pintar Validación Técnica.
    // Se espera un instante para montar el submódulo sobre la pantalla ya dibujada.
    setTimeout(function(){
      cargarSubmodulo().catch(function(error){
        console.warn("MI VISUAL V487.25:",error && error.message ? error.message : error);
      });
    },250);
  };
})();

/* ============================================================
   MI VISUAL V487.26 - PESTAÑAS DE PENDIENTES
   - Separa visualmente VALIDACIONES PENDIENTES en dos etiquetas:
     RECABLEADO y VTR/GAR.
   - Reutiliza renderListaValidaciones existente: no cambia acciones ni lógica.
   - RECABLEADO conserva también OTRO para no ocultar casos especiales.
============================================================ */
(function(){
  "use strict";

  if(window.MV48726_VT_TABS_PENDIENTES_OK) return;
  window.MV48726_VT_TABS_PENDIENTES_OK = true;

  let tabActiva = "RECABLEADO";
  let intentosWrapper = 0;

  function normalizar(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function renderBase(){
    if(typeof window.renderListaValidaciones === "function") return window.renderListaValidaciones;
    try{
      if(typeof renderListaValidaciones === "function") return renderListaValidaciones;
    }catch(_){}
    return null;
  }

  function pendientesPorTipo(){
    const todas = Array.isArray(window.vtValidacionesActuales) ? window.vtValidacionesActuales : [];
    const pendientes = todas.filter(function(x){
      return normalizar(x && x.estado) === "PENDIENTE";
    });

    const vtrgar = pendientes.filter(function(x){
      const tipo = normalizar(x && (x.tipoValidacion || x.tipo));
      return tipo === "VTR" || tipo === "GAR";
    });

    const recableado = pendientes.filter(function(x){
      const tipo = normalizar(x && (x.tipoValidacion || x.tipo));
      return tipo !== "VTR" && tipo !== "GAR";
    });

    return {recableado:recableado,vtrgar:vtrgar};
  }

  function botonTab(tipo,label,cantidad){
    const activa = tabActiva === tipo;
    const fondo = activa ? "#2563eb" : "#eff6ff";
    const color = activa ? "#ffffff" : "#1d4ed8";
    const borde = activa ? "#2563eb" : "#93c5fd";
    return `<button type="button" onclick="mv48726CambiarTabPendienteVT('${tipo}')" style="border:1px solid ${borde};background:${fondo};color:${color};border-radius:999px;padding:9px 14px;font-weight:900;font-size:12px;cursor:pointer;box-shadow:${activa ? "0 5px 12px rgba(37,99,235,.22)" : "none"}">${label} (${cantidad})</button>`;
  }

  function renderTabs(){
    const el = document.getElementById("vtPendientes");
    const render = renderBase();
    if(!el || !render) return false;

    const grupos = pendientesPorTipo();
    const lista = tabActiva === "VTRGAR" ? grupos.vtrgar : grupos.recableado;
    const vacio = tabActiva === "VTRGAR"
      ? "No hay VTR/GAR pendientes."
      : "No hay recableados pendientes.";

    el.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
        ${botonTab("RECABLEADO","🔧 RECABLEADO",grupos.recableado.length)}
        ${botonTab("VTRGAR","📡 VTR/GAR",grupos.vtrgar.length)}
      </div>
      <div id="mv48726PendientesContenido">
        ${lista.length ? render(lista,true) : `<div class="vt-sub">${vacio}</div>`}
      </div>`;

    return true;
  }

  window.mv48726CambiarTabPendienteVT = function(tipo){
    tabActiva = tipo === "VTRGAR" ? "VTRGAR" : "RECABLEADO";
    renderTabs();
  };

  function envolverCargaDespuesVtrGar(){
    const base = window.cargarValidacionesTecnicas;
    if(typeof base !== "function") return false;
    if(base.__mv48726TabsPendientes) return true;

    // Espera a que V487.25 termine de envolver primero la carga.
    if(!base.__mv48725VtrGar && intentosWrapper < 12){
      intentosWrapper++;
      setTimeout(envolverCargaDespuesVtrGar,250);
      return false;
    }

    const envuelta = async function(){
      const r = await base.apply(this,arguments);
      try{ renderTabs(); }catch(_){}
      return r;
    };

    envuelta.__mv48726TabsPendientes = true;
    envuelta.__mv48726Base = base;
    window.cargarValidacionesTecnicas = envuelta;
    try{ cargarValidacionesTecnicas = envuelta; }catch(_){}
    return true;
  }

  const hookAnterior = window.mv339Antes_mostrarValidacionTecnica;
  window.mv339Antes_mostrarValidacionTecnica = function(){
    if(typeof hookAnterior === "function"){
      try{ hookAnterior.apply(this,arguments); }catch(_){}
    }

    intentosWrapper = 0;
    setTimeout(envolverCargaDespuesVtrGar,650);
    setTimeout(renderTabs,950);
    setTimeout(renderTabs,1800);
  };

  // Compatibilidad si la pantalla ya estaba abierta al actualizar el archivo.
  setTimeout(envolverCargaDespuesVtrGar,500);
  setTimeout(renderTabs,1200);
})();