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
