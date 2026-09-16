/* ============================================================
   MI VISUAL V543 - ACTAS TECNICO / DATOS AUTOMATICOS RESILIENTES
   16/09/2026

   Objetivo:
   - Si la consulta de datos automaticos de un acta demora o falla de forma
     transitoria, reintenta SOLO LECTURA en segundo plano.
   - No repite Guardar Acta ni ninguna escritura.
   - Conserva los datos ya visibles mientras intenta completar los faltantes.
   - Maximo 2 reintentos por Orden/Pedido para evitar sobrecarga.
============================================================ */
(function(){
  "use strict";
  if(window.MV543_ACTAS_TECNICO_RESILIENTE_OK)return;
  window.MV543_ACTAS_TECNICO_RESILIENTE_OK=true;

  const intentosPorClave=new Map();
  const timers=new Map();

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esTecnico(){return norm(localStorage.getItem("perfil"))==="TECNICO";}
  function claveActual(){
    const o=txt(document.getElementById("actaCodigoOrden")?.value);
    const p=txt(document.getElementById("actaCodigoPedido")?.value);
    return o+"|"+p;
  }
  function faltanDatos(){
    const ids=["actaAutoTipoEjecucion","actaAutoTipoPartida","actaAutoDni","actaAutoCliente"];
    return ids.some(id=>{
      const t=norm(document.getElementById(id)?.textContent);
      return !t || t==="PENDIENTE DE ACTUALIZACION";
    });
  }
  function errorTransitorioVisible(){
    const t=norm(document.getElementById("actaAutoEstado")?.textContent);
    return /NO SE PUDO CONSULTAR AHORA|TARDO DEMASIADO|TEMPORAL|NO RESPONDIO|INTENTE NUEVAMENTE|CONEXION|HTTP 404|HTTP 429|HTTP 5/.test(t);
  }
  function mostrarReintento(n){
    const el=document.getElementById("actaAutoEstado");
    if(!el)return;
    el.className="actas-auto-status warn";
    el.textContent=`La consulta está demorando. Reintentando automáticamente (${n}/2)...`;
  }
  function cancelarClave(k){
    const t=timers.get(k);
    if(t)clearTimeout(t);
    timers.delete(k);
  }
  function programarReintento(base,k){
    if(!esTecnico()||!k||k==="|")return;
    if(!faltanDatos()||!errorTransitorioVisible())return;
    const usados=Number(intentosPorClave.get(k)||0);
    if(usados>=2)return;
    if(timers.has(k))return;

    const siguiente=usados+1;
    mostrarReintento(siguiente);
    const demora=siguiente===1?2500:6000;
    const timer=setTimeout(async function(){
      timers.delete(k);
      if(claveActual()!==k)return;
      intentosPorClave.set(k,siguiente);
      try{await base();}catch(_){}
      if(claveActual()!==k)return;
      if(faltanDatos()&&errorTransitorioVisible())programarReintento(base,k);
      else cancelarClave(k);
    },demora);
    timers.set(k,timer);
  }

  function instalar(){
    if(!esTecnico())return false;
    if(typeof window.consultarDatosAutomaticosFormularioActa!=="function")return false;
    if(window.consultarDatosAutomaticosFormularioActa.__mv543)return true;

    const base=window.consultarDatosAutomaticosFormularioActa;
    const wrap=async function(){
      const k=claveActual();
      const r=await base.apply(this,arguments);
      if(k&&claveActual()===k){
        if(!faltanDatos()){
          intentosPorClave.delete(k);
          cancelarClave(k);
        }else{
          programarReintento(()=>base.apply(window,[]),k);
        }
      }
      return r;
    };
    wrap.__mv543=true;
    wrap.__base=base;
    window.consultarDatosAutomaticosFormularioActa=wrap;
    try{consultarDatosAutomaticosFormularioActa=wrap;}catch(_){}
    console.log("MI VISUAL V543: datos automaticos de Actas Tecnico en modo resiliente.");
    return true;
  }

  const previo=window.mv339Antes_mostrarGestionActas;
  window.mv339Antes_mostrarGestionActas=function(){
    if(typeof previo==="function"){
      try{previo.apply(this,arguments);}catch(_){}
    }
    instalar();
  };

  document.addEventListener("input",function(e){
    if(!e||!e.target)return;
    if(e.target.id!=="actaCodigoOrden"&&e.target.id!=="actaCodigoPedido")return;
    for(const k of timers.keys())cancelarClave(k);
  },true);

  setTimeout(instalar,2500);
})();
