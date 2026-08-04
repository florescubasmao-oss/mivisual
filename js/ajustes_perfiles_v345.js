/* ============================================================
   MI VISUAL V345
   1. Supervisor puede ver "Ingresar datos" en Mapa Operativo.
   2. Técnico recupera el indicador EN CAMPO / DESCANSO y su
      acceso a programación y solicitud de cambio.
   Mantiene la carga dinámica V339.
============================================================ */
(function(){
  "use strict";

  function mv345Norm(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function mv345HabilitarCargaMapaSupervisor(){
    if(typeof window.moPuedeImportar !== "function") return false;
    if(window.moPuedeImportar.__mv345Supervisor) return true;

    const anterior = window.moPuedeImportar;
    const ajustada = function(){
      const perfil = typeof window.moPerfil === "function"
        ? window.moPerfil()
        : mv345Norm(localStorage.getItem("perfil")).replace(/[^A-Z0-9]/g, "");

      if(perfil === "SUPERVISOR") return true;
      return anterior.apply(this, arguments);
    };

    ajustada.__mv345Supervisor = true;
    ajustada.__mv345Anterior = anterior;
    window.moPuedeImportar = ajustada;
    return true;
  }

  // El cargador dinámico ejecuta este gancho después de descargar el mapa
  // y antes de abrirlo. Así no se aumenta la carga inicial.
  const antesMapaAnterior = window.mv339Antes_mostrarMapaOperativo;
  window.mv339Antes_mostrarMapaOperativo = function(){
    if(typeof antesMapaAnterior === "function"){
      try{ antesMapaAnterior(); }catch(_){}
    }
    mv345HabilitarCargaMapaSupervisor();
  };

  let descansoTecnicoProgramado = false;

  function mv345CargarEstadoDescansoTecnico(perfil){
    if(mv345Norm(perfil) !== "TECNICO") return;
    if(descansoTecnicoProgramado) return;
    descansoTecnicoProgramado = true;

    const ejecutar = async function(){
      try{
        if(typeof window.mv339CargarModulo !== "function"){
          descansoTecnicoProgramado = false;
          return;
        }

        // Se descarga después de mostrar el menú. No bloquea el inicio.
        await window.mv339CargarModulo("descansos");

        if(typeof window.actualizarIndicadorDescansoMenu === "function"){
          await window.actualizarIndicadorDescansoMenu();
        }
      }catch(error){
        descansoTecnicoProgramado = false;
        console.warn("V345: no se pudo restaurar el estado de descanso del técnico", error);
      }
    };

    setTimeout(function(){
      if(typeof requestIdleCallback === "function"){
        requestIdleCallback(ejecutar, {timeout:2200});
      }else{
        ejecutar();
      }
    }, 850);
  }

  // Se conserva toda la precarga optimizada existente y únicamente se añade
  // Descansos para Técnico después de mostrar el menú.
  if(typeof window.mv339PrepararPerfil === "function" &&
     !window.mv339PrepararPerfil.__mv345DescansosTecnico){
    const prepararAnterior = window.mv339PrepararPerfil;

    const prepararAjustado = function(perfil){
      const respuesta = prepararAnterior.apply(this, arguments);
      mv345CargarEstadoDescansoTecnico(perfil);
      return respuesta;
    };

    prepararAjustado.__mv345DescansosTecnico = true;
    prepararAjustado.__mv345Anterior = prepararAnterior;
    window.mv339PrepararPerfil = prepararAjustado;
  }

  // Respaldo para sesiones ya iniciadas o restauradas por el navegador.
  window.addEventListener("load", function(){
    const perfil = mv345Norm(localStorage.getItem("perfil"));
    if(perfil === "TECNICO"){
      setTimeout(function(){
        mv345CargarEstadoDescansoTecnico(perfil);
      }, 1100);
    }
  });

  window.MV345_AJUSTES_PERFILES_OK = true;
  console.log("MI VISUAL V345: Supervisor Mapa + Descansos Técnico habilitados.");
})();