/* ============================================================
   MI VISUAL V510 - SINCRONIZACION GUARDAR ACTA

   Corrige una carrera entre:
   - actas.js: resuelve datos desde Mapa Operativo + Produccion.
   - actas_ingreso_rapido_v455.js: mantiene su propio estado de orden resuelta.

   SEGURIDAD
   - NO salta validaciones del backend.
   - NO habilita si V455 detecto un bloqueo explicito: acta observada,
     faltante, ya subida/finalizada, codigos invertidos o varias ordenes.
   - Solo sincroniza cuando el flujo base confirma datos y existen ambos
     codigos necesarios para guardar.
============================================================ */
(function(){
  "use strict";
  if(window.MV510_ACTAS_GUARDAR_SYNC_OK) return;
  window.MV510_ACTAS_GUARDAR_SYNC_OK = true;

  let formularioActual = null;
  let observadorPantalla = null;
  let observadorEstado = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil")) === "TECNICO";
  }

  function boton(){
    return document.querySelector("#formActa [data-guardar]");
  }

  function bloqueoExplicitoV455(){
    const e = document.getElementById("mv455EstadoBusqueda");
    if(!e) return false;
    const t = norm(e.textContent || "");
    if(!t) return false;

    const bloqueos = [
      "OBSERVADA",
      "ACTA FALTANTE",
      "CODIGOS INVERTIDOS",
      "CODIGOS_INVERTIDOS",
      "YA FUE SUBIDA",
      "SUBIDA / ESTA EN REVISION",
      "YA ESTA FINALIZADA",
      "YA ESTA FINALIZADO",
      "VARIAS ORDENES",
      "SELECCIONA LA ATENCION CORRECTA"
    ];
    return bloqueos.some(x => t.indexOf(x) >= 0);
  }

  function baseConfirmada(){
    const estado = document.getElementById("actaAutoEstado");
    if(!estado) return false;
    const t = norm(estado.textContent || "");
    const esOk = estado.classList.contains("ok") || /DATOS ENCONTRADOS/.test(t);
    return esOk && /MAPA OPERATIVO/.test(t) && /PRODUCCION/.test(t);
  }

  function sincronizar(){
    if(!esTecnico()) return false;
    const form = document.getElementById("formActa");
    if(!form || form.dataset.mv510Guardando === "1") return false;

    // V455 solo transforma el alta nueva de Tecnico. En reemplazo/faltante
    // no interferimos con el flujo vigente.
    if(bloqueoExplicitoV455()) return false;
    if(!baseConfirmada()) return false;

    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    const b = boton();
    if(!orden || !pedido || !b) return false;

    const codigoOrden = txt(orden.value);
    const codigoPedido = txt(pedido.value);
    if(!codigoOrden || !codigoPedido) return false;

    // Sincroniza el estado que V455 espera sin modificar los datos oficiales.
    if(!window._mv455ActaResuelta ||
       txt(window._mv455ActaResuelta.codigoOrden) !== codigoOrden ||
       txt(window._mv455ActaResuelta.codigoPedido) !== codigoPedido){
      window._mv455ActaResuelta = {
        codigoOrden: codigoOrden,
        codigoPedido: codigoPedido,
        origen: "SINCRONIZACION_BASE_V510"
      };
    }

    b.disabled = false;
    b.removeAttribute("aria-disabled");

    // Conserva la prevalidacion rapida existente; el backend vuelve a validar
    // registrarActaEscaneada al guardar.
    try{
      if(typeof window.apiActas === "function" && typeof window.usuarioActualActas === "function"){
        const u = window.usuarioActualActas();
        Promise.resolve(window.apiActas({
          accion:"validarCodigosActaV396",
          usuario:u.usuario,
          codigoOrden:codigoOrden,
          codigoPedido:codigoPedido
        })).catch(function(){});
      }
    }catch(_){ }
    return true;
  }

  function conectarFormulario(){
    const form = document.getElementById("formActa");
    if(!form || form === formularioActual) return;
    formularioActual = form;

    form.addEventListener("submit", function(){
      form.dataset.mv510Guardando = "1";
    }, true);

    const pdf = document.getElementById("actaPdf");
    if(pdf) pdf.addEventListener("change", function(){ setTimeout(sincronizar, 0); });

    ["actaCodigoOrden","actaCodigoPedido"].forEach(function(id){
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("input", function(){ setTimeout(sincronizar,0); });
      el.addEventListener("change", function(){ setTimeout(sincronizar,0); });
    });

    const estado = document.getElementById("actaAutoEstado");
    if(observadorEstado){ try{ observadorEstado.disconnect(); }catch(_){ } }
    if(estado){
      observadorEstado = new MutationObserver(function(){ setTimeout(sincronizar,0); });
      observadorEstado.observe(estado,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["class"]});
    }

    setTimeout(sincronizar, 40);
    setTimeout(sincronizar, 250);
  }

  function iniciar(){
    const objetivo = document.getElementById("pantalla") || document.body;
    if(!objetivo) return;
    conectarFormulario();
    observadorPantalla = new MutationObserver(function(){ conectarFormulario(); });
    observadorPantalla.observe(objetivo,{childList:true,subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  console.log("MI VISUAL V510: sincronizacion Guardar Acta activa.");
})();
