/* MI VISUAL V341 - Validación Técnica rápida, caché breve y solicitud única */
(function(){
  "use strict";

  const CACHE_MS = 60 * 1000;
  const cacheLecturas = new Map();
  const peticionesEnCurso = new Map();
  const apiOriginal = window.apiValidacionTecnica;

  function escaparV341(valor){
    return String(valor == null ? "" : valor)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function claveLectura(payload){
    const limpio = Object.assign({}, payload || {});
    delete limpio.__forzar;
    return JSON.stringify(Object.keys(limpio).sort().reduce((salida, clave) => {
      salida[clave] = limpio[clave];
      return salida;
    }, {}));
  }

  function limpiarCacheValidacionTecnicaV341(){
    cacheLecturas.clear();
  }

  async function leerValidacionTecnicaV341(payload){
    const solicitud = Object.assign({}, payload || {});
    const forzar = !!solicitud.__forzar;
    delete solicitud.__forzar;

    const clave = claveLectura(solicitud);
    const ahora = Date.now();
    const cacheado = cacheLecturas.get(clave);

    if(!forzar && cacheado && ahora - cacheado.fecha < CACHE_MS){
      return cacheado.data;
    }

    if(peticionesEnCurso.has(clave)){
      return peticionesEnCurso.get(clave);
    }

    const promesa = (async function(){
      try{
        let data;

        if(typeof window.mv336ApiGet === "function"){
          data = await window.mv336ApiGet(
            window.API_VALIDACION_TECNICA || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec",
            solicitud,
            {intentos:2, tiempoMs:30000}
          );
        }else{
          const parametros = new URLSearchParams();
          Object.entries(solicitud).forEach(([claveParametro, valor]) => {
            if(valor !== undefined && valor !== null && valor !== ""){
              parametros.set(
                claveParametro,
                typeof valor === "object" ? JSON.stringify(valor) : String(valor)
              );
            }
          });

          const api = window.API_VALIDACION_TECNICA || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
          const url = api + (api.includes("?") ? "&" : "?") + parametros.toString();
          let ultimoError = null;

          for(let intento = 0; intento < 2; intento++){
            const controlador = typeof AbortController === "function" ? new AbortController() : null;
            const temporizador = controlador ? setTimeout(() => controlador.abort(), 30000) : null;
            try{
              const respuesta = await fetch(url, {
                method:"GET",
                cache:"no-store",
                redirect:"follow",
                headers:{"Accept":"application/json"},
                signal:controlador ? controlador.signal : undefined
              });
              const texto = (await respuesta.text()).trim();
              if(!respuesta.ok) throw new Error(`No se pudo conectar con Validación Técnica (${respuesta.status}).`);
              if(/^MI VISUAL API OK$/i.test(texto)) throw new Error("La implementación publicada aún no reconoce Validación Técnica.");
              if(/<!doctype|<html|google drive|accounts\.google/i.test(texto)){
                throw new Error("Google devolvió una página externa en lugar de los datos.");
              }
              try{
                data = JSON.parse(texto);
              }catch(_){
                throw new Error("Validación Técnica devolvió una respuesta inválida.");
              }
              ultimoError = null;
              break;
            }catch(error){
              ultimoError = error && error.name === "AbortError"
                ? new Error("La consulta de Validación Técnica tardó demasiado.")
                : error;
              if(intento === 0) await new Promise(resolve => setTimeout(resolve, 450));
            }finally{
              if(temporizador) clearTimeout(temporizador);
            }
          }

          if(ultimoError) throw ultimoError;
        }

        if(!data || data.ok === false){
          throw new Error((data && data.error) || "No se pudo cargar Validación Técnica.");
        }

        cacheLecturas.set(clave, {fecha:Date.now(), data});
        return data;
      }catch(error){
        if(cacheado && cacheado.data){
          return Object.assign({}, cacheado.data, {__cacheVencida:true});
        }
        throw error;
      }finally{
        peticionesEnCurso.delete(clave);
      }
    })();

    peticionesEnCurso.set(clave, promesa);
    return promesa;
  }

  window.apiValidacionTecnica = async function(payload){
    const solicitud = Object.assign({}, payload || {});
    if(solicitud.accion === "listarValidacionTecnica"){
      return leerValidacionTecnicaV341(solicitud);
    }

    if(typeof apiOriginal !== "function"){
      throw new Error("La función principal de Validación Técnica no está disponible.");
    }

    const respuesta = await apiOriginal(solicitud);
    if(respuesta && respuesta.ok) limpiarCacheValidacionTecnicaV341();
    return respuesta;
  };

  window.cargarValidacionesTecnicas = async function(forzar){
    const usuario = typeof window.usuarioActualValidacion === "function"
      ? window.usuarioActualValidacion()
      : {usuario:localStorage.getItem("usuario") || ""};

    const eventoClick = window.event && window.event.type === "click";
    const forzarLectura = !!forzar || !!eventoClick;
    const pendientesEl = document.getElementById("vtPendientes");
    const historialEl = document.getElementById("vtHistorial");

    try{
      if(typeof window.mostrarCargandoValidacion === "function"){
        window.mostrarCargandoValidacion("Cargando validaciones...");
      }

      const respuesta = await window.apiValidacionTecnica({
        accion:"listarValidacionTecnica",
        usuario:usuario.usuario,
        __forzar:forzarLectura
      });

      if(!respuesta.ok) throw new Error(respuesta.error || "No se pudo listar");

      window.vtValidacionesActuales = Array.isArray(respuesta.validaciones)
        ? respuesta.validaciones
        : [];

      if(typeof window.actualizarOpcionesFiltroCuadrillaVT === "function"){
        window.actualizarOpcionesFiltroCuadrillaVT();
      }

      const pendientes = window.vtValidacionesActuales.filter(item =>
        String(item.estado || "").toUpperCase() === "PENDIENTE"
      );

      if(pendientesEl){
        pendientesEl.innerHTML = pendientes.length && typeof window.renderListaValidaciones === "function"
          ? window.renderListaValidaciones(pendientes, true)
          : `<div class="vt-sub">No hay validaciones pendientes.</div>`;
      }

      if(typeof window.renderHistorialValidacionLocal === "function"){
        window.renderHistorialValidacionLocal();
      }

      if(respuesta.__cacheVencida && historialEl){
        historialEl.insertAdjacentHTML(
          "afterbegin",
          `<div class="vt-sub" style="margin:0 0 8px;color:#92400e">⚠️ Se muestran los últimos datos disponibles. Pulse Actualizar para consultar nuevamente.</div>`
        );
      }
    }catch(error){
      const mensaje = escaparV341(error && error.message ? error.message : "No se pudo actualizar Validación Técnica.");

      if(pendientesEl && !window.vtValidacionesActuales){
        pendientesEl.innerHTML = `<div class="vt-sub">No se pudo actualizar la lista en este momento.</div>`;
      }
      if(historialEl){
        historialEl.innerHTML = `<div class="vt-sub" style="color:#b91c1c">❌ ${mensaje} Pulse Actualizar para volver a intentar.</div>`;
      }
    }finally{
      if(typeof window.ocultarCargandoValidacion === "function"){
        window.ocultarCargandoValidacion();
      }
    }
  };

  window.vtLimpiarCacheValidacionTecnica = limpiarCacheValidacionTecnicaV341;
})();
