/* ============================================================
   MI VISUAL V371 - Actividad en Campo: Cámara o Galería
   - Quita capture="environment" de todas las evidencias.
   - Mantiene accept="image/*".
   - Aplica a Auditoría en Frío, Auditoría en Caliente,
     Seguimiento, Validación de Observación, Capacitación
     y cualquier evidencia fotográfica del módulo.
   - No cambia compresión, validaciones ni envío al backend.
============================================================ */
(function(){
  "use strict";

  if(window.MV371_ACTIVIDAD_GALERIA_OK) return;

  function prepararInputArchivo(input){
    if(!input || input.type !== "file") return;

    // Si es una evidencia fotográfica, mantener filtro de imágenes.
    const accept = String(input.getAttribute("accept") || "").toLowerCase();
    const esImagen =
      accept.includes("image") ||
      /^actfoto/i.test(input.id || "") ||
      input.closest?.(".act-file");

    if(esImagen){
      input.setAttribute("accept","image/*");

      // Clave del cambio V371:
      // sin "capture", Android/iPhone permiten escoger galería/archivos
      // y, según el navegador, también ofrecen Cámara.
      input.removeAttribute("capture");
    }
  }

  function aplicarEnContenedor(raiz){
    const root = raiz && raiz.querySelectorAll ? raiz : document;

    root.querySelectorAll(
      '.act-wrap input[type="file"], ' +
      '#actEvidenciasGenerales input[type="file"], ' +
      '.act-file input[type="file"]'
    ).forEach(prepararInputArchivo);
  }

  function envolverRenderEvidencias(){
    const original = window.renderEvidenciasActividadCampo;

    if(typeof original !== "function") return false;
    if(original.__mv371Galeria) return true;

    const ajustada = function(){
      const resultado = original.apply(this,arguments);

      // El HTML se acaba de crear. Ajustar después de insertarlo.
      requestAnimationFrame(()=>{
        aplicarEnContenedor(
          document.getElementById("actEvidenciasGenerales") || document
        );
      });

      return resultado;
    };

    ajustada.__mv371Galeria = true;
    ajustada.__mv371Original = original;
    window.renderEvidenciasActividadCampo = ajustada;

    try{
      renderEvidenciasActividadCampo = ajustada;
    }catch(_){}

    return true;
  }

  function aplicar(){
    envolverRenderEvidencias();
    aplicarEnContenedor(document);
  }

  // Aplica inmediatamente si Actividad en Campo ya está cargado.
  aplicar();

  // Y también para campos que se creen al cambiar el tipo de actividad.
  const observer = new MutationObserver(cambios=>{
    let revisar = false;

    for(const cambio of cambios){
      if(cambio.addedNodes && cambio.addedNodes.length){
        revisar = true;
        break;
      }
    }

    if(revisar){
      requestAnimationFrame(aplicar);
    }
  });

  observer.observe(document.documentElement,{
    childList:true,
    subtree:true
  });

  // Respaldo por carga dinámica del módulo.
  let intentos = 0;
  const verificador = setInterval(()=>{
    intentos++;
    aplicar();

    if(
      (typeof window.renderEvidenciasActividadCampo === "function" &&
       window.renderEvidenciasActividadCampo.__mv371Galeria) ||
      intentos > 60
    ){
      clearInterval(verificador);
    }
  },250);

  window.MV371_ACTIVIDAD_GALERIA_OK = true;
  window.mv371AplicarGaleriaActividadCampo = aplicar;

  console.log(
    "MI VISUAL V371: evidencias de Actividad en Campo permiten Cámara o Galería."
  );
})();