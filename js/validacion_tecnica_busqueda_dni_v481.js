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

    setTimeout(function(){
      instalarFiltro();
      ajustarBuscador();
    }, 0);
  };

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

    setTimeout(function(){
      cargarSubmodulo().catch(function(error){
        console.warn("MI VISUAL V487.25:",error && error.message ? error.message : error);
      });
    },250);
  };
})();

/* ============================================================
   MI VISUAL V487.27 - PENDIENTES SOLO RECABLEADO / OTRO

   REGLA DEFINITIVA:
   - VTR y GAR NO se muestran en "Validaciones pendientes" del flujo Recableado.
   - VTR/GAR se gestionan en su submódulo independiente.
   - Recableado y Otro conservan la vista, botones y lógica existentes.
   - No agrega llamadas a Apps Script ni modifica caché/optimización.
   - V488: cuando el usuario abre el flujo VTR/GAR de registro/historial,
     este filtro no interviene.
============================================================ */
(function(){
  "use strict";

  if(window.MV48727_VT_PENDIENTES_SOLO_RECABLEADO_OK) return;
  window.MV48727_VT_PENDIENTES_SOLO_RECABLEADO_OK = true;

  let observerPendientes = null;
  let elementoObservado = null;
  let timerRender = null;
  let observerPantalla = null;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function obtenerRender(){
    if(typeof window.renderListaValidaciones === "function") return window.renderListaValidaciones;
    try{
      if(typeof renderListaValidaciones === "function") return renderListaValidaciones;
    }catch(_){}
    return null;
  }

  function listaPendientePermitida(){
    const todas = Array.isArray(window.vtValidacionesActuales)
      ? window.vtValidacionesActuales
      : [];

    return todas.filter(function(x){
      const estado = norm(x && x.estado);
      const tipo = norm(x && (x.tipoValidacion || x.tipo));
      return estado === "PENDIENTE" && tipo !== "VTR" && tipo !== "GAR";
    });
  }

  function renderSoloRecableado(){
    if(window.MV488_VT_MODO === "VTRGAR") return true;

    const el = document.getElementById("vtPendientes");
    const render = obtenerRender();
    if(!el || !render) return false;

    if(el.querySelector('[data-mv48727="1"]')) return true;

    const lista = listaPendientePermitida();
    el.innerHTML = `<div data-mv48727="1">${
      lista.length
        ? render(lista,true)
        : `<div class="vt-sub">No hay validaciones de Recableado/Otro pendientes.</div>`
    }</div>`;
    return true;
  }

  function observarPendientes(){
    const el = document.getElementById("vtPendientes");
    if(!el) return false;

    if(elementoObservado !== el){
      if(observerPendientes) observerPendientes.disconnect();
      elementoObservado = el;

      observerPendientes = new MutationObserver(function(){
        clearTimeout(timerRender);
        timerRender = setTimeout(function(){
          try{ renderSoloRecableado(); }catch(_){}
        },0);
      });

      observerPendientes.observe(el,{
        childList:true,
        subtree:true
      });
    }

    renderSoloRecableado();
    return true;
  }

  function instalarObservacionPantalla(){
    if(observerPantalla || !document.body) return;
    observerPantalla = new MutationObserver(function(){
      if(document.getElementById("vtPendientes")){
        observarPendientes();
      }
    });
    observerPantalla.observe(document.body,{
      childList:true,
      subtree:true
    });
  }

  const hookAnterior = window.mv339Antes_mostrarValidacionTecnica;
  window.mv339Antes_mostrarValidacionTecnica = function(){
    if(typeof hookAnterior === "function"){
      try{ hookAnterior.apply(this,arguments); }catch(_){}
    }

    setTimeout(observarPendientes,250);
    setTimeout(observarPendientes,900);
    setTimeout(observarPendientes,1800);
  };

  instalarObservacionPantalla();
  setTimeout(observarPendientes,300);
})();

/* ============================================================
   MI VISUAL V489 - CARGA LAZY VISTA UNIFICADA VTR/GAR
   - Se descarga solo junto con Validacion Tecnica.
   - No agrega carga al inicio general.
============================================================ */
(function(){
  "use strict";

  if(window.MV489_LOADER_OK) return;
  window.MV489_LOADER_OK = true;

  const hookAnterior = window.mv339Antes_mostrarValidacionTecnica;
  let promesa = null;

  function cargar(){
    if(window.MV489_VT_UNIFICADA_OK) return Promise.resolve();
    if(promesa) return promesa;

    promesa = new Promise(function(resolve,reject){
      const s=document.createElement("script");
      s.src="./js/validacion_tecnica_unificada_v489.js?v=V489-20260826";
      s.async=true;
      s.onload=resolve;
      s.onerror=function(){ promesa=null; reject(new Error("No se pudo cargar V489.")); };
      document.head.appendChild(s);
    });
    return promesa;
  }

  window.mv339Antes_mostrarValidacionTecnica = function(){
    if(typeof hookAnterior === "function"){
      try{ hookAnterior.apply(this,arguments); }catch(_){}
    }
    setTimeout(function(){ cargar().catch(function(e){ console.warn("MI VISUAL V489:",e && e.message ? e.message : e); }); },320);
  };

  setTimeout(function(){
    if(window.MV488_VT_PORTAL_ACTIVO) cargar().catch(function(){});
  },0);
})();
