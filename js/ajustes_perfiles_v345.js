/* ============================================================
   MI VISUAL V345 / V534
   1. Supervisor puede ver "Ingresar datos" en Mapa Operativo.
   2. Técnico recupera el indicador EN CAMPO / DESCANSO y su
      acceso a programación y solicitud de cambio.
   3. V534: Programación de Descansos muestra la última vista útil
      de inmediato y refresca en segundo plano; ante 404 transitorio
      conserva la vista disponible y usa POST seguro como respaldo.
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

  /* ============================================================
     V534 - DESCANSOS RESILIENTE / STALE-WHILE-REVALIDATE
     ------------------------------------------------------------
     Objetivo:
     - Si ya existe una carga útil, mostrarla inmediatamente.
     - Actualizar en segundo plano sin dejar la pantalla en Cargando.
     - Si GET recibe 404/timeout transitorio, probar una lectura POST segura.
     - Nunca repetir automáticamente escrituras.
     - No modifica reglas, permisos, descansos ni Apps Script.
  ============================================================ */
  const MV534_CACHE_PREFIX = "MV534_DESCANSOS|";
  const MV534_CACHE_FRESCO_MS = 12 * 60 * 60 * 1000;
  const MV534_CACHE_RESPALDO_MS = 48 * 60 * 60 * 1000;
  const MV534_EN_CURSO = new Map();

  function mv534Txt(v){ return String(v == null ? "" : v).trim(); }

  function mv534Usuario(){
    try{
      if(typeof window.pdUser === "function") return window.pdUser();
    }catch(_){}
    return {
      usuario: localStorage.getItem("usuario") || "",
      perfil: mv345Norm(localStorage.getItem("perfil")),
      sede: mv345Norm(localStorage.getItem("sede")),
      cuadrilla: localStorage.getItem("cuadrilla") || ""
    };
  }

  function mv534Clave(per, periodos){
    const u = mv534Usuario();
    return MV534_CACHE_PREFIX + [
      mv345Norm(u.usuario),
      mv345Norm(u.perfil),
      mv345Norm(u.sede),
      mv345Norm(u.cuadrilla),
      mv534Txt(per),
      (periodos || []).join("_")
    ].join("|");
  }

  function mv534ClaveSesion(per, periodos){
    const u = mv534Usuario();
    return `MI_VISUAL_PD_${mv345Norm(u.usuario)}_${(periodos || []).join("_")}`;
  }

  function mv534LeerJson(storage, clave){
    try{
      const raw = storage.getItem(clave);
      if(!raw) return null;
      const item = JSON.parse(raw);
      if(!item || !item.data) return null;
      const guardadoEn = Number(item.guardadoEn || item.fecha || 0);
      if(!guardadoEn) return null;
      return {data:item.data, guardadoEn:guardadoEn, edad:Date.now()-guardadoEn};
    }catch(_){ return null; }
  }

  function mv534Guardar(per, periodos, data){
    if(!data || data.ok === false) return;
    const limpio = Object.assign({}, data);
    delete limpio.__mv534Cache;
    delete limpio.__mv534Error;
    delete limpio.__mv534GuardadoEn;
    const item = {version:"V534", guardadoEn:Date.now(), data:limpio};
    try{ localStorage.setItem(mv534Clave(per,periodos), JSON.stringify(item)); }catch(_){}
    try{ sessionStorage.setItem(mv534ClaveSesion(per,periodos), JSON.stringify(item)); }catch(_){}
  }

  function mv534LeerCache(per, periodos, maxEdad){
    const persistente = mv534LeerJson(localStorage, mv534Clave(per,periodos));
    if(persistente && persistente.edad >= 0 && persistente.edad <= maxEdad) return persistente;

    // Migra automáticamente la caché de sesión que ya tenía V449.
    const sesion = mv534LeerJson(sessionStorage, mv534ClaveSesion(per,periodos));
    if(sesion && sesion.edad >= 0 && sesion.edad <= maxEdad){
      try{
        localStorage.setItem(mv534Clave(per,periodos), JSON.stringify({
          version:"V534-MIGRADA", guardadoEn:sesion.guardadoEn, data:sesion.data
        }));
      }catch(_){}
      return sesion;
    }
    return null;
  }

  function mv534Aplicar(data, per, desdeCache, errorTexto, guardadoEn){
    try{
      PD_DATA = Object.assign({}, data || {}, {
        periodo: per,
        programacion: Array.isArray(data && data.programacion) ? data.programacion : [],
        cuadrillas: Array.isArray(data && data.cuadrillas) ? data.cuadrillas : [],
        __mv534Cache: !!desdeCache,
        __mv534Error: errorTexto || "",
        __mv534GuardadoEn: Number(guardadoEn || Date.now())
      });
      PD_CAMBIOS = {};
      PD_MOTIVO_CAMBIO = "";
      return true;
    }catch(error){
      console.warn("V534: no se pudo aplicar snapshot de Descansos", error);
      return false;
    }
  }

  async function mv534PostLectura(payload){
    const controlador = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controlador ? setTimeout(function(){ controlador.abort(); }, 35000) : null;
    try{
      const respuesta = await fetch(window.API_DESCANSOS || window.MI_VISUAL_API_URL, {
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=UTF-8","Accept":"application/json"},
        body:JSON.stringify(payload || {}),
        cache:"no-store",
        redirect:"follow",
        signal:controlador ? controlador.signal : undefined
      });
      const texto = (await respuesta.text()).trim();
      if(!respuesta.ok) throw new Error(`Programación de Descansos respondió HTTP ${respuesta.status}.`);
      if(!texto || /<!doctype|<html/i.test(texto)) throw new Error("Programación de Descansos no devolvió JSON válido.");
      const data = JSON.parse(texto);
      if(!data || data.ok === false) throw new Error((data && data.error) || "No se pudo leer Programación de Descansos.");
      return data;
    }finally{
      if(timer) clearTimeout(timer);
    }
  }

  function mv534EsTransitorio(error){
    const m = String(error && error.message || error || "");
    return /404|429|500|502|503|504|tard|timeout|fetch|conectar|network|servidor/i.test(m);
  }

  async function mv534LeerRed(payload){
    try{
      return await window.pdApi(payload);
    }catch(error){
      if(!mv534EsTransitorio(error)) throw error;
      await new Promise(r=>setTimeout(r,700));
      return await mv534PostLectura(payload);
    }
  }

  function mv534PeriodoVisible(per){
    const selector = document.getElementById("pdPeriodo");
    if(selector && selector.value) return String(selector.value) === String(per);
    try{ return !PD_DATA || !PD_DATA.periodo || String(PD_DATA.periodo) === String(per); }
    catch(_){ return true; }
  }

  function mv534PintarEstado(){
    const cont = document.getElementById("pdContenido");
    if(!cont) return;
    let aviso = document.getElementById("mv534DescansosEstado");
    let cache = false, error = "", fecha = 0;
    try{
      cache = !!PD_DATA.__mv534Cache;
      error = String(PD_DATA.__mv534Error || "");
      fecha = Number(PD_DATA.__mv534GuardadoEn || 0);
    }catch(_){}

    if(!cache && !error){
      if(aviso) aviso.remove();
      return;
    }

    if(!aviso){
      aviso = document.createElement("div");
      aviso.id = "mv534DescansosEstado";
      aviso.style.cssText = "margin:0 0 10px;padding:9px 11px;border-radius:10px;font-size:11px;font-weight:800;border:1px solid #93c5fd;background:#eff6ff;color:#1e3a8a";
      cont.insertBefore(aviso, cont.firstChild || null);
    }

    const hora = fecha ? new Date(fecha).toLocaleString("es-PE",{hour12:true}) : "";
    if(error){
      aviso.style.background = "#fff7ed";
      aviso.style.borderColor = "#fdba74";
      aviso.style.color = "#9a3412";
      aviso.textContent = `Mostrando la última programación disponible${hora ? " ("+hora+")" : ""}. La actualización del servidor se reintentará al volver a abrir.`;
    }else{
      aviso.style.background = "#eff6ff";
      aviso.style.borderColor = "#93c5fd";
      aviso.style.color = "#1e3a8a";
      aviso.textContent = `Mostrando la última programación disponible${hora ? " ("+hora+")" : ""}. Actualizando en segundo plano…`;
    }
  }

  function mv534InstalarDescansosResiliente(){
    if(typeof window.pdCargar !== "function" || typeof window.pdApi !== "function") return false;
    if(window.pdCargar.__mv534) return true;

    const cargarBase = window.pdCargar;
    const renderBase = typeof window.pdRender === "function" ? window.pdRender : null;

    if(renderBase && !renderBase.__mv534){
      const renderNuevo = function(){
        const r = renderBase.apply(this, arguments);
        setTimeout(mv534PintarEstado, 0);
        return r;
      };
      renderNuevo.__mv534 = true;
      renderNuevo.__mv534Base = renderBase;
      window.pdRender = renderNuevo;
      try{ pdRender = renderNuevo; }catch(_){}
    }

    async function refrescar(per, periodos, key, renderizar){
      if(MV534_EN_CURSO.has(key)) return MV534_EN_CURSO.get(key);
      const u = mv534Usuario();
      const payload = {
        accion:"listarProgramacionDescansos",
        usuario:u.usuario,
        periodo:per,
        periodos:periodos
      };

      const tarea = (async function(){
        const data = await mv534LeerRed(payload);
        mv534Guardar(per, periodos, data);
        if(mv534PeriodoVisible(per)){
          mv534Aplicar(data, per, false, "", Date.now());
          if(renderizar && typeof window.pdRender === "function") window.pdRender();
        }
        return data;
      })().finally(function(){
        if(MV534_EN_CURSO.get(key) === tarea) MV534_EN_CURSO.delete(key);
      });

      MV534_EN_CURSO.set(key, tarea);
      return tarea;
    }

    const cargarNuevo = async function(periodo, forzar){
      const per = periodo || document.getElementById("pdPeriodo")?.value ||
        (typeof window.pdPeriodoActual === "function" ? window.pdPeriodoActual() : "");
      const periodos = typeof window.pdPeriodosVista === "function" ? window.pdPeriodosVista(per) : [per];
      const key = mv534Clave(per, periodos);

      if(!forzar){
        const cache = mv534LeerCache(per, periodos, MV534_CACHE_FRESCO_MS);
        if(cache){
          mv534Aplicar(cache.data, per, true, "", cache.guardadoEn);
          setTimeout(function(){
            refrescar(per, periodos, key, true).catch(function(error){
              console.warn("V534: Descansos sigue usando snapshot por falla transitoria", error);
              if(mv534PeriodoVisible(per)){
                try{ PD_DATA.__mv534Cache = true; PD_DATA.__mv534Error = String(error && error.message || error || ""); }catch(_){}
                mv534PintarEstado();
              }
            });
          }, 0);
          return;
        }
      }

      try{
        const data = await refrescar(per, periodos, key, false);
        mv534Aplicar(data, per, false, "", Date.now());
        return;
      }catch(error){
        const respaldo = mv534LeerCache(per, periodos, MV534_CACHE_RESPALDO_MS);
        if(respaldo){
          mv534Aplicar(respaldo.data, per, true, String(error && error.message || error || ""), respaldo.guardadoEn);
          return;
        }
        // Sin ninguna vista previa, conserva el comportamiento original para
        // que el usuario reciba el error real del módulo.
        return await cargarBase.apply(this, arguments);
      }
    };

    cargarNuevo.__mv534 = true;
    cargarNuevo.__mv534Base = cargarBase;
    window.pdCargar = cargarNuevo;
    try{ pdCargar = cargarNuevo; }catch(_){}

    window.MV534_DESCANSOS_RESILIENTE = true;
    console.log("MI VISUAL V534: Programación de Descansos resiliente habilitada.");
    return true;
  }

  // Este gancho se ejecuta DESPUÉS de cargar programacion_descansos.js y
  // ANTES de abrir la pantalla. La instalación es síncrona y reversible.
  const antesDescansosAnterior = window.mv339Antes_mostrarProgramacionDescansos;
  window.mv339Antes_mostrarProgramacionDescansos = function(){
    if(typeof antesDescansosAnterior === "function"){
      try{ antesDescansosAnterior(); }catch(_){}
    }
    mv534InstalarDescansosResiliente();
  };

  // Respaldo para el caso en que Descansos fue precargado antes del clic.
  function mv534IntentarInstalar(){
    if(window.MV534_DESCANSOS_RESILIENTE) return;
    mv534InstalarDescansosResiliente();
  }
  setTimeout(mv534IntentarInstalar, 2500);
  setTimeout(mv534IntentarInstalar, 6000);

  // Respaldo para sesiones ya iniciadas o restauradas por el navegador.
  window.addEventListener("load", function(){
    const perfil = mv345Norm(localStorage.getItem("perfil"));
    if(perfil === "TECNICO"){
      setTimeout(function(){
        mv345CargarEstadoDescansoTecnico(perfil);
      }, 1100);
    }
    setTimeout(mv534IntentarInstalar, 1800);
  });

  window.MV345_AJUSTES_PERFILES_OK = true;
  window.MV534_DESCANSOS_FRONTEND_OK = true;
  console.log("MI VISUAL V345/V534: Supervisor Mapa + Descansos resiliente habilitados.");
})();