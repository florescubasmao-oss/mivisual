/* ============================================================
   MI VISUAL V593 - ACTAS TECNICO / INICIO RAPIDO SIN BLOQUEO
   03/10/2026

   Alcance:
   - SOLO perfil TECNICO.
   - Evita consultar automáticamente todo el historial al abrir Gestión de Actas.
   - El técnico puede subir PDF de inmediato.
   - "Actualizar vista" conserva la consulta vigente y fuerza historial.
   - Si ya existe historial cargado en memoria reciente, lo reutiliza.
   - NO modifica backend, Drive, guardado, validaciones, estados ni permisos.
============================================================ */
(function(){
  "use strict";
  if(window.MV593_ACTAS_TECNICO_INICIO_RAPIDO_OK)return;
  window.MV593_ACTAS_TECNICO_INICIO_RAPIDO_OK=true;

  const CACHE_MS=2*60*1000;
  let instalado=false;
  let ultimaCargaOk=0;

  function norm(v){
    return String(v==null?"":v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil"))==="TECNICO";
  }

  function pintarInicioRapido(){
    const lista=document.getElementById("actasLista");
    const resumen=document.getElementById("actasResumen");
    if(resumen)resumen.innerHTML="";
    if(!lista)return;
    lista.innerHTML=`
      <div class="actas-card" style="background:#eff6ff;border:1px solid #93c5fd;color:#1e3a8a;line-height:1.45">
        <b>✅ Gestión de Actas lista para usar.</b><br>
        <span style="font-size:12px">Para acelerar el ingreso, el historial no se carga automáticamente. Puedes subir tu acta PDF de inmediato.</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="actas-btn ok" type="button" onclick="mostrarFormularioActa()">+ Subir Acta PDF</button>
          <button class="actas-btn sec" type="button" onclick="cargarActas({forzar:true})">Ver historial</button>
        </div>
      </div>`;
  }

  function reutilizarHistorial(){
    const actas=Array.isArray(window._actasTodas)?window._actasTodas:null;
    if(!actas||!actas.length||!ultimaCargaOk||Date.now()-ultimaCargaOk>CACHE_MS)return false;
    try{
      if(typeof window.construirFiltrosActas==="function")window.construirFiltrosActas(actas);
      if(typeof window.aplicarFiltrosActas==="function")window.aplicarFiltrosActas({});
      return true;
    }catch(_){
      return false;
    }
  }

  function instalar(){
    if(instalado||!esTecnico()||typeof window.cargarActas!=="function")return false;
    const base=window.cargarActas;
    if(base.__mv593)return true;

    const nuevo=async function(opciones){
      const opts=opciones||{};
      if(!esTecnico())return await base.apply(this,arguments);

      if(!opts.forzar){
        if(reutilizarHistorial())return;
        pintarInicioRapido();
        return {ok:true,omitidoInicio:true,version:"V593-ACTAS-TECNICO-INICIO-RAPIDO"};
      }

      const antes=Array.isArray(window._actasTodas)?window._actasTodas.length:-1;
      const resultado=await base.apply(this,arguments);
      const despues=Array.isArray(window._actasTodas)?window._actasTodas.length:-1;

      // Si la consulta logró actualizar/renderizar datos, conserva una marca
      // breve en memoria para evitar otra lectura al volver al módulo.
      if(despues>=0 && (despues!==antes || despues>0))ultimaCargaOk=Date.now();
      return resultado;
    };

    nuevo.__mv593=true;
    nuevo.__base=base;
    window.cargarActas=nuevo;
    try{cargarActas=nuevo;}catch(_){}
    instalado=true;
    console.log("MI VISUAL V593: inicio rápido de Actas Técnico activo.");
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
    const timer=setInterval(function(){if(instalar())clearInterval(timer);},300);
    setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
  }
})();