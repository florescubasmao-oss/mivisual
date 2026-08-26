/* ============================================================
   MI VISUAL V491/V492 - RETIRO LEGADO + PENDIENTES VTR/GAR

   - Retira el acceso independiente CALIFICAR VTR/GAR (flujo Partner).
   - Redirige llamadas residuales al flujo vigente Validacion Tecnica > VTR/GAR.
   - En REGISTRO VTR/GAR vuelve a mostrar solicitudes PENDIENTES.
   - Los pendientes se muestran SIN botones de validacion para no duplicar acciones.
   - La validacion/decision permanece en la pestaña VALIDACION.
   - No agrega llamadas API ni toca cache V341.
============================================================ */
(function(){
  "use strict";

  if(window.MV492_VTRGAR_COMPAT_OK) return;
  window.MV492_VTRGAR_COMPAT_OK = true;

  let timerPendientes = null;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esAccesoLegado(el){
    if(!el || el.nodeType !== 1) return false;
    const texto = norm(el.textContent || "");
    const onclick = norm(el.getAttribute && el.getAttribute("onclick") || "");
    return texto.includes("CALIFICAR VTR/GAR") ||
           texto.includes("CALIFICACION VTR/GAR") ||
           onclick.includes("MOSTRARASIGNACIONESVTRGAR");
  }

  function retirarTarjetas(){
    document.querySelectorAll('[onclick],button,a,.card,.adm-card,.adm104-card,.adm104-option,.adm-option').forEach(function(el){
      if(!esAccesoLegado(el)) return;
      const objetivo = el.closest('.adm104-card,.adm-card,.adm104-option,.adm-option,.card,[onclick],button,a') || el;
      if(objetivo && objetivo.id !== "cardVTRGAR") objetivo.remove();
    });
  }

  function abrirVigente(){
    if(typeof window.mostrarValidacionTecnica === "function"){
      window.mostrarValidacionTecnica();
      setTimeout(function(){
        if(typeof window.mv489AbrirRegistroVtrGar === "function"){
          window.mv489AbrirRegistroVtrGar();
        }else if(typeof window.mv488AbrirVtrGar === "function"){
          window.mv488AbrirVtrGar();
        }
      },500);
      return;
    }
    if(typeof window.volverInicio === "function") window.volverInicio();
  }

  function neutralizarFuncionLegada(){
    const actual = window.mostrarAsignacionesVtrGar;
    if(typeof actual !== "function" || actual.__mv491Retirada) return false;

    const reemplazo = function(){
      abrirVigente();
      return Promise.resolve({ok:true,retirado:true,version:"V492",destino:"VALIDACION_TECNICA_VTRGAR"});
    };
    reemplazo.__mv491Retirada = true;
    reemplazo.__mv491Base = actual;
    window.mostrarAsignacionesVtrGar = reemplazo;
    try{ mostrarAsignacionesVtrGar = reemplazo; }catch(_){}
    return true;
  }

  function pendientesVtrGar(){
    const todas = Array.isArray(window.vtValidacionesActuales) ? window.vtValidacionesActuales : [];
    return todas.filter(function(x){
      const tipo = norm(x && (x.tipoValidacion || x.tipo));
      const estado = norm(x && x.estado);
      return (tipo === "VTR" || tipo === "GAR") && estado === "PENDIENTE";
    });
  }

  function restaurarPendientesRegistro(){
    if(window.MV488_VT_MODO !== "VTRGAR") return false;
    if(document.querySelector(".mv489-wrap")) return false;

    const el = document.getElementById("vtPendientes");
    const render = window.renderListaValidaciones;
    if(!el || typeof render !== "function") return false;

    const card = el.closest(".vt-card");
    if(card){
      card.style.display = "";
      const titulo = card.querySelector("h3");
      if(titulo) titulo.textContent = "📌 Registros pendientes";
    }

    const lista = pendientesVtrGar();
    el.innerHTML = lista.length
      ? render(lista,false)
      : '<div class="vt-sub">No hay registros VTR/GAR pendientes.</div>';
    return true;
  }

  function aplicar(){
    retirarTarjetas();
    neutralizarFuncionLegada();
    clearTimeout(timerPendientes);
    timerPendientes = setTimeout(restaurarPendientesRegistro,0);
  }

  aplicar();
  setTimeout(aplicar,250);
  setTimeout(aplicar,900);
  setTimeout(aplicar,1800);

  if(document.documentElement){
    const obs = new MutationObserver(function(){ aplicar(); });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
})();

/* ============================================================
   MI VISUAL V495 - LOADER LAZY DE SEGMENTACION VTR/GAR

   - Carga el ajuste visual unicamente cuando el usuario entra a VTR/GAR.
   - No agrega peso al inicio general de MI VISUAL.
   - No realiza llamadas a Apps Script.
============================================================ */
(function(){
  "use strict";

  if(window.MV494_LOADER_OK) return;
  window.MV494_LOADER_OK = true;

  let promesa = null;

  function correspondeCargar(){
    return window.MV488_VT_MODO === "VTRGAR" &&
      !!(document.getElementById("mv489Tabs") || document.getElementById("mv489Contenido") || document.querySelector(".vt-wrap"));
  }

  function cargar(){
    if(window.MV494_VTRGAR_SEGMENTACION_OK) return Promise.resolve();
    if(promesa) return promesa;

    promesa = new Promise(function(resolve,reject){
      const s = document.createElement("script");
      s.src = "./js/validacion_tecnica_segmentacion_v494.js?v=V495-20260826B";
      s.async = true;
      s.onload = resolve;
      s.onerror = function(){
        promesa = null;
        reject(new Error("No se pudo cargar V495."));
      };
      document.head.appendChild(s);
    });

    return promesa;
  }

  function revisar(){
    if(!correspondeCargar()) return;
    cargar().catch(function(e){
      console.warn("MI VISUAL V495:",e && e.message ? e.message : e);
    });
  }

  setTimeout(revisar,250);
  setTimeout(revisar,900);

  if(document.body){
    const obs = new MutationObserver(function(){ revisar(); });
    obs.observe(document.body,{childList:true,subtree:true});
  }
})();

/* ============================================================
   MI VISUAL V496 - LOADER LAZY CONTINUIDAD DE CUADRILLAS
   Carga la herramienta solo cuando el nucleo del Dashboard ya existe.
============================================================ */
(function(){
  "use strict";
  if(window.MV496_CONTINUIDAD_LOADER_OK) return;
  window.MV496_CONTINUIDAD_LOADER_OK = true;

  let promesa = null;

  function listo(){
    return typeof window.mv4ObtenerRanking === "function" &&
           typeof window.mv199RenderJefatura === "function";
  }

  function cargar(){
    if(window.MV496_CONTINUIDAD_CUADRILLAS_OK) return Promise.resolve();
    if(promesa) return promesa;
    promesa = new Promise(function(resolve,reject){
      const s=document.createElement("script");
      s.src="./js/dashboard_continuidad_cuadrillas_v496.js?v=V496-20260826A";
      s.async=true;
      s.onload=resolve;
      s.onerror=function(){promesa=null;reject(new Error("No se pudo cargar V496 Continuidad."));};
      document.head.appendChild(s);
    });
    return promesa;
  }

  function revisar(){
    if(!listo()) return;
    cargar().catch(function(e){console.warn("MI VISUAL V496:",e && e.message ? e.message : e);});
  }

  setTimeout(revisar,300);
  setTimeout(revisar,1100);
  setTimeout(revisar,2500);
  if(document.body){
    const obs=new MutationObserver(revisar);
    obs.observe(document.body,{childList:true,subtree:true});
  }
})();
