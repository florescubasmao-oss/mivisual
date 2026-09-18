/* ============================================================
   MI VISUAL V557 - ACTAS TECNICO / APERTURA RAPIDA
   18/09/2026

   Alcance estricto:
   - SOLO perfil TECNICO y SOLO la carga visual del historial de Actas.
   - El boton "+ Subir Acta PDF" queda operativo de inmediato.
   - Usa listarActasEscaneadas (lectura) en lugar de cargarGestionActas
     para evitar que un resumen pesado bloquee la apertura del modulo.
   - Si Google demora, muestra un aviso no bloqueante: la subida sigue disponible.
   - NO modifica guardar/reemplazar PDF, validaciones, Drive, permisos,
     estados, periodos, backend ni otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV557_ACTAS_TECNICO_APERTURA_OK)return;
  window.MV557_ACTAS_TECNICO_APERTURA_OK=true;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esTecnico(){return norm(localStorage.getItem("perfil"))==="TECNICO";}
  function apiBase(){return window.API_ACTAS||window.MI_VISUAL_API_URL||"";}
  function htmlSeguro(v){
    if(typeof window.limpiarHtmlActas==="function"){
      try{return window.limpiarHtmlActas(v);}catch(_){}
    }
    return txt(v).replace(/[&<>"']/g,function(c){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
    });
  }

  async function listarTecnicoRapido(usuario,forzar){
    const payload={
      accion:"listarActasEscaneadas",
      usuario:usuario,
      _v557:Date.now()+"-"+Math.random().toString(36).slice(2)
    };
    const base=apiBase();
    if(!base)throw new Error("API de Gestión de Actas no disponible");

    if(typeof window.mv336ApiGet==="function"){
      return await window.mv336ApiGet(base,payload,{
        intentos:1,
        tiempoMs:forzar?10000:7000
      });
    }

    if(typeof window.apiActas==="function"){
      return await window.apiActas(payload);
    }

    throw new Error("Gestión de Actas no está disponible temporalmente");
  }

  function mensajeNoBloqueante(lista,error){
    if(!lista)return;
    const detalle=htmlSeguro(error&&error.message?error.message:"La consulta no respondió a tiempo.");
    lista.innerHTML=`
      <div class="actas-msg" style="background:#fffbeb;color:#92400e;border:1px solid #f59e0b;line-height:1.45">
        ⚠️ No se pudo cargar el historial de actas en este momento.<br>
        <b>Esto no impide subir tu acta PDF.</b><br>
        <span style="font-size:11px;opacity:.85">${detalle}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="actas-btn ok" type="button" onclick="mostrarFormularioActa()">+ Subir Acta PDF</button>
          <button class="actas-btn sec" type="button" onclick="cargarActas({forzar:true})">Reintentar historial</button>
        </div>
      </div>`;
  }

  function instalar(){
    if(!esTecnico())return false;
    if(typeof window.cargarActas!=="function")return false;
    if(window.cargarActas.__mv557)return true;

    const base=window.cargarActas;
    const nuevo=async function(opciones){
      if(!esTecnico())return await base.apply(this,arguments);

      const opts=opciones||{};
      const lista=document.getElementById("actasLista");
      const resumen=document.getElementById("actasResumen");
      if(lista){
        lista.innerHTML=`<div class="actas-card actas-empty">⏳ Cargando tu historial...<br><span style="font-size:11px;font-weight:700;color:#64748b">Puedes pulsar <b>+ Subir Acta PDF</b> sin esperar esta consulta.</span></div>`;
      }
      if(resumen)resumen.innerHTML="";

      try{
        const usuario=txt(localStorage.getItem("usuario"));
        const data=await listarTecnicoRapido(usuario,!!opts.forzar);
        if(!data||data.ok===false)throw new Error((data&&data.error)||"No se pudo consultar el historial de actas");

        const actas=Array.isArray(data.actas)?data.actas:[];
        window._actasTodas=actas;

        if(typeof window.construirFiltrosActas==="function"){
          window.construirFiltrosActas(actas);
        }

        if(actas.length===0){
          if(lista)lista.innerHTML=`<div class="actas-card actas-empty">No hay actas registradas en tu historial. Puedes subir una nueva acta con el botón superior.</div>`;
          const r=document.getElementById("actasFiltroResultado");
          if(r)r.textContent="0 actas visibles.";
          return;
        }

        if(typeof window.aplicarFiltrosActas==="function"){
          window.aplicarFiltrosActas(opts);
        }else if(lista){
          lista.innerHTML=`<div class="actas-card actas-empty">${actas.length} acta${actas.length===1?"":"s"} encontrada${actas.length===1?"":"s"}. Pulse Actualizar vista para volver a mostrarlas.</div>`;
        }
      }catch(error){
        mensajeNoBloqueante(lista,error);
      }
    };

    nuevo.__mv557=true;
    nuevo.__base=base;
    window.cargarActas=nuevo;
    try{cargarActas=nuevo;}catch(_){}
    console.log("MI VISUAL V557: apertura rápida de Actas Técnico habilitada.");
    return true;
  }

  const previo=window.mv339Antes_mostrarGestionActas;
  window.mv339Antes_mostrarGestionActas=function(){
    if(typeof previo==="function"){
      try{previo.apply(this,arguments);}catch(_){}
    }
    instalar();
  };

  if(!instalar()){
    const timer=setInterval(function(){if(instalar())clearInterval(timer);},700);
    setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
  }
})();
