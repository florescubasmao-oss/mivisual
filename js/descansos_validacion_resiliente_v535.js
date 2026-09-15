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

/* ============================================================
   MI VISUAL V538 - EQUIPOS AVERIADOS / TECNICO RESILIENTE
   15/09/2026

   Objetivo:
   - La pantalla del Técnico no debe bloquearse porque Catálogo o Cargos
     demoren. Esas dos consultas pasan a segundo plano.
   - El listado principal usa lectura POST directa sobre Apps Script para
     evitar la ruta GET que estaba agotando el timeout del navegador.
   - Conserva una última lectura útil por usuario como respaldo.
   - NUNCA reintenta automáticamente escrituras.
============================================================ */
(function(){
  "use strict";
  if(window.MV538_EQUIPOS_TECNICO_OK) return;
  window.MV538_EQUIPOS_TECNICO_OK = true;

  const CACHE_PREF = "MV538_EQUIPOS|";
  const TTL_LISTA = 24 * 60 * 60 * 1000;
  const TTL_CATALOGO = 7 * 24 * 60 * 60 * 1000;
  const TTL_CARGOS = 24 * 60 * 60 * 1000;
  const EN_CURSO = new Map();

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }
  function usuario(){ return txt(localStorage.getItem("usuario")); }
  function esTecnico(){ return norm(localStorage.getItem("perfil")) === "TECNICO"; }
  function clave(accion){ return CACHE_PREF + norm(usuario()) + "|" + accion; }

  function guardar(accion,data){
    try{
      if(!data || data.ok === false) return;
      localStorage.setItem(clave(accion),JSON.stringify({t:Date.now(),data:data}));
    }catch(_){}
  }

  function leer(accion,ttl){
    try{
      const x=JSON.parse(localStorage.getItem(clave(accion))||"null");
      if(!x || !x.t || !x.data) return null;
      if(Date.now()-Number(x.t)>ttl) return null;
      return x.data;
    }catch(_){ return null; }
  }

  async function postLectura(payload,tiempoMs){
    const api = window.MI_VISUAL_API_URL;
    const c = typeof AbortController === "function" ? new AbortController() : null;
    const timer = c ? setTimeout(()=>c.abort(),tiempoMs || 22000) : null;
    try{
      const r = await fetch(api,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=UTF-8","Accept":"application/json"},
        body:JSON.stringify(payload||{}),
        cache:"no-store",
        redirect:"follow",
        signal:c ? c.signal : undefined
      });
      const t=(await r.text()).trim();
      if(!r.ok) throw new Error(`Equipos Averiados respondió HTTP ${r.status}.`);
      if(!t || /<!doctype|<html/i.test(t)) throw new Error("Equipos Averiados no devolvió JSON válido.");
      const d=JSON.parse(t);
      if(!d || d.ok===false) throw new Error((d&&d.error)||"No se pudo leer Equipos Averiados.");
      return d;
    }finally{
      if(timer) clearTimeout(timer);
    }
  }

  function actualizarFondo(accion,payload){
    const k=accion+"|"+norm(usuario());
    if(EN_CURSO.has(k)) return;
    const tarea=(async function(){
      try{
        const d=await postLectura(payload,22000);
        guardar(accion,d);
        try{
          if(typeof EA_STATE !== "undefined" && EA_STATE){
            if(accion==="catalogosEquiposAveriados") EA_STATE.catalogos=d;
            if(accion==="listarCargosEquiposAveriados") EA_STATE.cargos=Array.isArray(d.cargos)?d.cargos:[];
          }
          if(typeof window.eaRender === "function" && document.getElementById("eaLista")) window.eaRender();
        }catch(_){}
      }catch(error){
        console.warn("V538: lectura secundaria de Equipos Averiados sigue pendiente",accion,error);
      }
    })().finally(()=>EN_CURSO.delete(k));
    EN_CURSO.set(k,tarea);
  }

  function instalar(){
    if(typeof window.eaApi !== "function") return false;
    if(window.eaApi.__mv538) return true;

    const baseApi=window.eaApi;

    const apiV538=async function(payload){
      const p=Object.assign({},payload||{});
      const accion=txt(p.accion);

      if(!esTecnico()) return await baseApi(p);

      if(accion==="catalogosEquiposAveriados"){
        const cache=leer(accion,TTL_CATALOGO);
        actualizarFondo(accion,p);
        return cache || {ok:true,modulo:"EQUIPOS_AVERIADOS",accion:"CATALOGOS",tipos:[]};
      }

      if(accion==="listarCargosEquiposAveriados"){
        const cache=leer(accion,TTL_CARGOS);
        actualizarFondo(accion,p);
        return cache || {ok:true,modulo:"EQUIPOS_AVERIADOS",accion:"LISTAR_CARGOS",cargos:[],registros:0};
      }

      if(accion==="listarEquiposAveriados"){
        try{
          const d=await postLectura(p,22000);
          guardar(accion,d);
          return d;
        }catch(error){
          const cache=leer(accion,TTL_LISTA);
          if(cache){
            cache.__mv538Cache=true;
            cache.__mv538Error=String(error&&error.message||error||"");
            return cache;
          }
          throw new Error("Equipos Averiados sigue demorando en el servidor. Vuelva al menú y reintente en unos segundos.");
        }
      }

      return await baseApi(p);
    };

    apiV538.__mv538=true;
    apiV538.__base=baseApi;
    window.eaApi=apiV538;
    try{ eaApi=apiV538; }catch(_){}

    if(typeof window.eaAbrirFormularioTecnico === "function" && !window.eaAbrirFormularioTecnico.__mv538){
      const abrirBase=window.eaAbrirFormularioTecnico;
      const abrirV538=async function(id){
        try{
          let tieneTipos=false;
          try{ tieneTipos=!!(EA_STATE && EA_STATE.catalogos && Array.isArray(EA_STATE.catalogos.tipos) && EA_STATE.catalogos.tipos.length); }catch(_){}
          if(!tieneTipos){
            const p={accion:"catalogosEquiposAveriados",usuario:usuario()};
            const cat=await postLectura(p,18000);
            guardar("catalogosEquiposAveriados",cat);
            try{ EA_STATE.catalogos=cat; }catch(_){}
          }
        }catch(error){
          alert("No se pudo cargar el catálogo de equipos. Intente nuevamente en unos segundos.");
          return;
        }
        return abrirBase.apply(this,arguments);
      };
      abrirV538.__mv538=true;
      abrirV538.__base=abrirBase;
      window.eaAbrirFormularioTecnico=abrirV538;
      try{ eaAbrirFormularioTecnico=abrirV538; }catch(_){}
    }

    console.log("MI VISUAL V538: Equipos Averiados del Técnico en modo resiliente.");
    return true;
  }

  const previo=window.mv339Antes_mostrarEquiposAveriados;
  window.mv339Antes_mostrarEquiposAveriados=function(){
    if(typeof previo==="function"){
      try{ previo(); }catch(_){}
    }
    instalar();
  };

  setTimeout(instalar,3000);
  setTimeout(instalar,7000);
  window.addEventListener("load",function(){ setTimeout(instalar,2000); });
})();