/* ============================================================
   MI VISUAL V455 - ORDEN DE CAMPOS EN INGRESO RÁPIDO DE ACTAS

   Alcance estricto:
   - Solo cambia el orden visual del formulario rápido del Técnico.
   - Número de acta aparece antes de Código cliente o DNI.
   - No modifica búsqueda, guardado, Drive, reemplazo de observadas,
     validaciones, estados, permisos ni Apps Script.
============================================================ */
(function(){
  "use strict";

  if(window.MV455_ORDEN_CAMPOS_ACTAS_OK) return;
  window.MV455_ORDEN_CAMPOS_ACTAS_OK = true;

  function ajustarOrden(){
    const bloqueBusqueda = document.getElementById("mv455BusquedaRapida");
    const numero = document.getElementById("actaNumeroActa");
    if(!bloqueBusqueda || !numero) return;

    const campoNumero = numero.closest(".actas-field");
    const padre = bloqueBusqueda.parentElement;
    if(!campoNumero || !padre || campoNumero.parentElement !== padre) return;

    // Número de acta debe ser el primer dato que ingresa el técnico.
    if(campoNumero.nextElementSibling !== bloqueBusqueda){
      padre.insertBefore(campoNumero, bloqueBusqueda);
    }

    campoNumero.dataset.mv455NumeroPrimero = "si";
  }

  const observador = new MutationObserver(function(){
    ajustarOrden();
  });

  function iniciar(){
    if(!document.body) return;
    observador.observe(document.body,{childList:true,subtree:true});
    ajustarOrden();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", iniciar, {once:true});
  }else{
    iniciar();
  }

  window.mv455AjustarOrdenCamposActa = ajustarOrden;
})();
