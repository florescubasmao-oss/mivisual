/* ==========================================================
   MI VISUAL V478 - BONOS / PDG POR PERIODO
   Regla solicitada:
   - P7 VISUAL SGI conserva su condición PDG hasta 31/07/2026.
   - Desde 01/08/2026 P7 participa en Bonos como cuadrilla normal.
   - P8 VISUAL SGI continúa como PDG.
   - No modifica tarifas, puntos, PEXT, históricos ni Apps Script.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V478_PDG_BONOS_CARGADO) return;
  window.MI_VISUAL_V478_PDG_BONOS_CARGADO = true;

  const CORTE_P7 = new Date(2026, 7, 1, 12, 0, 0, 0); // 01/08/2026
  let fechaContexto = null;

  function instalar(){
    if(typeof window.mb242EsCuadrillaPDG !== "function" ||
       typeof window.mb242ParseFecha !== "function" ||
       typeof window.mb242CargarDatos !== "function") return false;

    if(window.mb242EsCuadrillaPDG.__mv478PdgAgosto) return true;

    const esPdgBase = window.mb242EsCuadrillaPDG;
    const parseFechaBase = window.mb242ParseFecha;
    const cargarDatosBase = window.mb242CargarDatos;

    function parseFechaV478(valor){
      const fecha = parseFechaBase.apply(this, arguments);
      fechaContexto = (fecha instanceof Date && !isNaN(fecha.getTime())) ? fecha : null;
      return fecha;
    }
    parseFechaV478.__mv478PdgAgosto = true;

    function esPdgV478(cuadrilla, fechaReferencia){
      const esPdgHistorico = esPdgBase.call(this, cuadrilla);
      const nombre = (typeof window.mb242Cuadrilla === "function")
        ? window.mb242Cuadrilla(cuadrilla)
        : String(cuadrilla || "").toUpperCase().trim();
      const codigo = (nombre.match(/^P\d+/) || [""])[0];

      let fecha = null;
      if(fechaReferencia instanceof Date && !isNaN(fechaReferencia.getTime())) fecha = fechaReferencia;
      else if(fechaContexto instanceof Date && !isNaN(fechaContexto.getTime())) fecha = fechaContexto;

      // Cada fecha capturada corresponde a la fila que inmediatamente consulta PDG.
      fechaContexto = null;

      // Solo se modifica la regla histórica de P7. Las demás PDG conservan exactamente su lógica anterior.
      if(esPdgHistorico && codigo === "P7"){
        const referencia = fecha || new Date();
        return referencia < CORTE_P7;
      }

      return esPdgHistorico;
    }
    esPdgV478.__mv478PdgAgosto = true;

    async function cargarDatosV478(){
      try{
        return await cargarDatosBase.apply(this, arguments);
      }finally{
        // Evita que una fecha de una fila quede como contexto al abrir Bonos como Técnico.
        fechaContexto = null;
      }
    }
    cargarDatosV478.__mv478PdgAgosto = true;

    window.mb242ParseFecha = parseFechaV478;
    window.mb242EsCuadrillaPDG = esPdgV478;
    window.mb242CargarDatos = cargarDatosV478;

    window.MI_VISUAL_V478_PDG_BONOS = {
      version:"V478-PDG-AGOSTO-20260824",
      p7NormalDesde:"2026-08-01",
      p8ContinuaPdg:true
    };
    return true;
  }

  function intentar(n){
    if(instalar()) return;
    if(n >= 60) return;
    setTimeout(function(){ intentar(n + 1); }, 100);
  }

  intentar(0);

  const obs = new MutationObserver(function(muts){
    muts.forEach(function(m){
      Array.from(m.addedNodes || []).forEach(function(n){
        if(n && n.tagName === "SCRIPT" && String(n.src || "").includes("/js/bonos.js")){
          n.addEventListener("load", function(){ setTimeout(function(){ intentar(0); }, 0); }, {once:true});
        }
      });
    });
  });
  obs.observe(document.documentElement, {childList:true, subtree:true});
})();
