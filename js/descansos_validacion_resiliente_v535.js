/* ============================================================
   MI VISUAL V536 - VALIDACION DE DESCANSOS RESILIENTE
   15/09/2026

   Objetivo:
   - Evitar que un HTTP 404 transitorio deje al usuario sin saber si
     Aprobar / Observar / Rechazar sí fue registrado.
   - NO repetir automáticamente ninguna escritura.
   - Ante una respuesta incierta, verificar por lectura el estado real.
   - Si el servidor confirma la operación, reflejar el cambio de inmediato
     en pantalla antes de refrescar desde red.
   - Limpiar snapshots de Descansos para no volver a pintar PENDIENTE
     después de una aprobación correcta.

   No modifica reglas ni permisos.
============================================================ */
(function(){
  "use strict";
  if(window.MV536_DESCANSOS_VALIDACION_OK) return;
  window.MV536_DESCANSOS_VALIDACION_OK = true;

  const ACCIONES_VALIDACION = new Set([
    "aprobarProgramacionDescansos",
    "observarProgramacionDescansos",
    "rechazarProgramacionDescansos",
    "validarCambioDescansoSupervisor",
    "validarCambioDescansoJefatura"
  ]);

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/_/g," ")
      .replace(/\s+/g," ")
      .trim();
  }
  function dormir(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function esTransitorio(error){
    const m = String(error && error.message || error || "");
    return /404|429|500|502|503|504|tard|timeout|fetch|conectar|network|servidor|respuesta valida|respuesta válida/i.test(m);
  }

  function idsPayload(p){
    if(Array.isArray(p && p.ids)) return p.ids.map(txt).filter(Boolean);
    const id = txt(p && p.id);
    return id ? [id] : [];
  }

  function estadoEsperado(p){
    const a = txt(p && p.accion);
    if(a === "aprobarProgramacionDescansos") return "APROBADO";
    if(a === "observarProgramacionDescansos") return "OBSERVADO";
    if(a === "rechazarProgramacionDescansos") return "RECHAZADO";
    if(a === "validarCambioDescansoSupervisor"){
      return norm(p && p.resultado) === "APROBADO" ? "PENDIENTE JEFATURA" : "RECHAZADO";
    }
    if(a === "validarCambioDescansoJefatura") return norm(p && p.resultado);
    return "";
  }

  function limpiarCachesDescansos(){
    const prefijos = ["MI_VISUAL_PD_","MV534_DESCANSOS|"];
    [sessionStorage,localStorage].forEach(function(storage){
      try{
        for(let i=storage.length-1;i>=0;i--){
          const k=storage.key(i) || "";
          if(prefijos.some(p=>k.startsWith(p))) storage.removeItem(k);
        }
      }catch(_){}
    });
  }

  function aplicarResultadoLocal(payload,respuesta){
    const ids = idsPayload(payload);
    const esperado = estadoEsperado(payload);
    if(!ids.length || !esperado) return false;

    const actualizados = Number(respuesta && respuesta.actualizados || 0);
    const confirmado = !!(respuesta && (respuesta.recuperadoV535 || respuesta.verificadoDespuesDeError || respuesta.estado));
    if(actualizados <= 0 && !confirmado) return false;

    let tocados = 0;

    function aplicarLista(lista){
      if(!Array.isArray(lista)) return;
      lista.forEach(function(item){
        if(!item || !ids.includes(txt(item.id))) return;
        item.estadoValidacion = esperado;
        item.estadoProgramacion = esperado;
        item.resultadoJefatura = esperado;
        item.motivoJefatura = txt(payload && payload.motivo);
        item.comentarioJefatura = txt(payload && payload.motivo);
        item.validadoJefaturaPor = txt(payload && payload.usuario);

        if(esperado === "APROBADO" && norm(item.tipoRegistro) !== "SOLICITUD TECNICO"){
          item.estadoDia = norm(item.estadoNuevo || item.solicitudCambio || item.estadoDia || "EN CAMPO");
          item.solicitudCambio = "";
        }
        tocados++;
      });
    }

    try{
      aplicarLista(PD_DATA && PD_DATA.programacion);
      aplicarLista(PD_DATA && PD_DATA.historial);
    }catch(_){}

    try{
      if(typeof PD_PENDIENTES_SELECCIONADOS !== "undefined" && PD_PENDIENTES_SELECCIONADOS){
        ids.forEach(id=>PD_PENDIENTES_SELECCIONADOS.delete(id));
      }
    }catch(_){}

    limpiarCachesDescansos();

    if(tocados && typeof window.pdRenderGestion === "function"){
      try{ window.pdRenderGestion(); }catch(_){}
    }

    return tocados > 0;
  }

  function periodoVisible(){
    const sel = document.getElementById("pdPeriodo");
    if(sel && /^\d{4}-\d{2}$/.test(txt(sel.value))) return txt(sel.value);
    try{
      if(typeof PD_DATA !== "undefined" && PD_DATA && /^\d{4}-\d{2}$/.test(txt(PD_DATA.periodo))) return txt(PD_DATA.periodo);
    }catch(_){}
    try{
      if(typeof window.pdPeriodoActual === "function") return window.pdPeriodoActual();
    }catch(_){}
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function periodosConsulta(per){
    try{
      if(typeof window.pdPeriodosVista === "function") return window.pdPeriodosVista(per);
    }catch(_){}
    return [per];
  }

  async function lecturaPostSegura(payload){
    const api = window.API_DESCANSOS || window.MI_VISUAL_API_URL;
    const c = typeof AbortController === "function" ? new AbortController() : null;
    const timer = c ? setTimeout(()=>c.abort(),30000) : null;
    try{
      const r = await fetch(api,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=UTF-8","Accept":"application/json"},
        body:JSON.stringify(payload || {}),
        cache:"no-store",
        redirect:"follow",
        signal:c ? c.signal : undefined
      });
      const t = (await r.text()).trim();
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      if(!t || /<!doctype|<html/i.test(t)) throw new Error("Respuesta no válida");
      const d = JSON.parse(t);
      if(!d || d.ok === false) throw new Error((d && d.error) || "No se pudo verificar la programación");
      return d;
    }finally{
      if(timer) clearTimeout(timer);
    }
  }

  function buscarPorId(data,id){
    const listas = [];
    if(data && Array.isArray(data.programacion)) listas.push(data.programacion);
    if(data && Array.isArray(data.historial)) listas.push(data.historial);
    for(const lista of listas){
      const x = lista.find(item=>txt(item && item.id) === txt(id));
      if(x) return x;
    }
    return null;
  }

  function estadoItem(item){
    if(!item) return "";
    return norm(item.estadoValidacion || item.estadoProgramacion || item.resultadoJefatura || "");
  }

  async function verificar(baseApi,payload){
    const ids = idsPayload(payload);
    const esperado = estadoEsperado(payload);
    if(!ids.length || !esperado) return null;

    const per = periodoVisible();
    const lectura = {
      accion:"listarProgramacionDescansos",
      usuario:payload.usuario,
      periodo:per,
      periodos:periodosConsulta(per),
      _v536:Date.now()+"-"+Math.random().toString(36).slice(2)
    };

    let data = null;
    try{
      data = await baseApi(lectura);
    }catch(error){
      if(!esTransitorio(error)) return null;
      try{ data = await lecturaPostSegura(lectura); }
      catch(_){ return null; }
    }

    const estados = ids.map(id=>({id,item:buscarPorId(data,id)}));
    const confirmado = estados.every(x=>x.item && estadoItem(x.item) === esperado);
    if(!confirmado) return null;

    return {
      ok:true,
      modulo:"PROGRAMACION_DESCANSOS",
      accion:payload.accion,
      actualizados:ids.length,
      estado:esperado,
      recuperadoV535:true,
      verificadoDespuesDeError:true
    };
  }

  function instalar(){
    if(typeof window.pdApi !== "function") return false;
    if(window.pdApi.__mv536) return true;

    const baseApi = window.pdApi;

    const apiV536 = async function(payload){
      const p = Object.assign({},payload || {});
      if(!ACCIONES_VALIDACION.has(p.accion)){
        return await baseApi(p);
      }

      try{
        const r = await baseApi(p);
        aplicarResultadoLocal(p,r);
        return r;
      }catch(error){
        if(!esTransitorio(error)) throw error;

        // IMPORTANTE: no se repite la escritura. Solo se consulta el estado real.
        for(let intento=0; intento<2; intento++){
          await dormir(intento === 0 ? 900 : 1700);
          const verificado = await verificar(baseApi,p);
          if(verificado){
            aplicarResultadoLocal(p,verificado);
            console.warn("V536: validación recuperada después de respuesta transitoria",p.accion,idsPayload(p));
            return verificado;
          }
        }

        throw new Error(
          "No se pudo confirmar la validación por una falla temporal del servidor. No vuelva a pulsar Aprobar, Observar o Rechazar. Actualice la vista; si el estado ya cambió, la operación quedó registrada."
        );
      }
    };

    apiV536.__mv536 = true;
    apiV536.__base = baseApi;
    window.pdApi = apiV536;
    try{ pdApi = apiV536; }catch(_){}

    console.log("MI VISUAL V536: validación de Descansos + actualización inmediata de UI habilitadas.");
    return true;
  }

  const previo = window.mv339Antes_mostrarProgramacionDescansos;
  window.mv339Antes_mostrarProgramacionDescansos = function(){
    if(typeof previo === "function"){
      try{ previo(); }catch(_){}
    }
    instalar();
  };

  setTimeout(instalar,2500);
  setTimeout(instalar,6000);
  window.addEventListener("load",function(){ setTimeout(instalar,1800); });
})();