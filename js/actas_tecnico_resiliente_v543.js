/* ============================================================
   MI VISUAL V544 - ACTAS TECNICO / CONSULTA AUTOMATICA RAPIDA
   16/09/2026

   Alcance estricto:
   - SOLO perfil TECNICO y SOLO la lectura consultarDatosAutomaticosActa.
   - Mantiene el mismo endpoint, payload y respuesta vigente.
   - Evita esperas acumuladas de varios intentos largos del GET general.
   - Una misma Orden/Pedido comparte la consulta en curso y caché breve.
   - Evita consultas repetidas por input + blur cuando ya hay datos completos.
   - Hace como máximo un reintento visual adicional si Google falla.
   - NUNCA repite Guardar Acta ni ninguna escritura.
   - No modifica permisos, Drive, estados, periodos ni reglas de Actas.
============================================================ */
(function(){
  "use strict";
  if(window.MV544_ACTAS_TECNICO_RESILIENTE_OK)return;
  window.MV544_ACTAS_TECNICO_RESILIENTE_OK=true;
  window.MV543_ACTAS_TECNICO_RESILIENTE_OK=true;

  const CACHE_AUTO_MS=90*1000;
  const COOLDOWN_ERROR_MS=7000;
  const cacheAuto=new Map();
  const enCursoAuto=new Map();
  const ultimoError=new Map();
  const reintentosVisuales=new Map();
  const timers=new Map();

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esTecnico(){return norm(localStorage.getItem("perfil"))==="TECNICO";}
  function claveCodigos(orden,pedido){return norm(orden)+"|"+norm(pedido);}
  function clavePayload(p){return [txt(p&&p.usuario),claveCodigos(p&&p.codigoOrden,p&&p.codigoPedido)].join("|");}
  function claveActual(){
    return claveCodigos(
      document.getElementById("actaCodigoOrden")?.value,
      document.getElementById("actaCodigoPedido")?.value
    );
  }
  function datosCompletos(){
    const ids=["actaAutoTipoEjecucion","actaAutoTipoPartida","actaAutoDni","actaAutoCliente"];
    return ids.every(id=>{
      const t=norm(document.getElementById(id)?.textContent);
      return !!t && t!=="PENDIENTE DE ACTUALIZACION" && t!=="-";
    });
  }
  function resueltaCoincide(){
    try{
      const r=window._mv455ActaResuelta;
      if(!r)return false;
      return claveActual()===claveCodigos(r.codigoOrden,r.codigoPedido);
    }catch(_){return false;}
  }
  function errorTransitorioVisible(){
    const t=norm(document.getElementById("actaAutoEstado")?.textContent);
    return /NO SE PUDO CONSULTAR AHORA|TARDO DEMASIADO|TEMPORAL|NO RESPONDIO|INTENTE NUEVAMENTE|CONEXION|HTTP 404|HTTP 408|HTTP 429|HTTP 5|RESPUESTA INVALIDA/.test(t);
  }
  function cancelarTimer(k){
    const t=timers.get(k);
    if(t)clearTimeout(t);
    timers.delete(k);
  }
  function pintarReintento(){
    const el=document.getElementById("actaAutoEstado");
    if(!el)return;
    el.className="actas-auto-status warn";
    el.textContent="La consulta está demorando. MI VISUAL hará una verificación automática sin repetir el guardado.";
  }
  function dormir(ms){return new Promise(r=>setTimeout(r,ms));}

  async function getDirecto(payload,tiempoMs){
    const base=window.API_ACTAS||window.MI_VISUAL_API_URL;
    if(!base)throw new Error("API de Gestión de Actas no disponible");
    const p=Object.assign({},payload||{});
    delete p.__forzar;
    p._v544=Date.now()+"-"+Math.random().toString(36).slice(2);

    if(typeof window.mv336ApiGet==="function"){
      return await window.mv336ApiGet(base,p,{intentos:1,tiempoMs:tiempoMs});
    }

    const u=new URL(base);
    Object.entries(p).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));
    });
    const c=typeof AbortController==="function"?new AbortController():null;
    const timer=c?setTimeout(()=>c.abort(),tiempoMs):null;
    try{
      const r=await fetch(u.toString(),{
        method:"GET",cache:"no-store",redirect:"follow",
        headers:{"Accept":"application/json"},signal:c?c.signal:undefined
      });
      const raw=(await r.text()).trim();
      if(!r.ok)throw new Error("HTTP "+r.status);
      if(!raw||/<!doctype|<html|accounts\.google|google drive/i.test(raw))throw new Error("Respuesta inválida");
      const d=JSON.parse(raw);
      if(!d||d.ok===false)throw new Error((d&&d.error)||"No se pudo consultar los datos automáticos");
      return d;
    }finally{if(timer)clearTimeout(timer);}
  }

  async function consultarAutoRapido(payload){
    const k=clavePayload(payload);
    const ahora=Date.now();
    const guardado=cacheAuto.get(k);
    if(guardado&&ahora-guardado.t<CACHE_AUTO_MS)return guardado.data;
    if(enCursoAuto.has(k))return enCursoAuto.get(k);

    const tarea=(async function(){
      let ultimo=null;
      const tiempos=[9500,7500];
      for(let i=0;i<tiempos.length;i++){
        if(i)await dormir(700);
        try{
          const d=await getDirecto(payload,tiempos[i]);
          cacheAuto.set(k,{t:Date.now(),data:d});
          ultimoError.delete(k);
          return d;
        }catch(e){ultimo=e;}
      }
      ultimoError.set(k,Date.now());
      throw ultimo||new Error("La consulta automática no respondió.");
    })().finally(function(){
      if(enCursoAuto.get(k)===tarea)enCursoAuto.delete(k);
    });

    enCursoAuto.set(k,tarea);
    return tarea;
  }

  function instalarApi(){
    if(!esTecnico())return false;
    if(typeof window.apiActas!=="function")return false;
    if(window.apiActas.__mv544Auto)return true;

    const original=window.apiActas;
    const apiV544=async function(payload){
      const p=Object.assign({},payload||{});
      if(esTecnico()&&p.accion==="consultarDatosAutomaticosActa"){
        return await consultarAutoRapido(p);
      }
      return await original(p);
    };
    apiV544.__mv544Auto=true;
    apiV544.__base=original;
    window.apiActas=apiV544;
    try{apiActas=apiV544;}catch(_){}
    return true;
  }

  function programarReintento(base,k){
    if(!k||k==="|"||!esTecnico()||!errorTransitorioVisible()||datosCompletos())return;
    if(Number(reintentosVisuales.get(k)||0)>=1||timers.has(k))return;
    reintentosVisuales.set(k,1);
    pintarReintento();
    const timer=setTimeout(async function(){
      timers.delete(k);
      if(claveActual()!==k)return;
      try{await base.apply(window,[]);}catch(_){}
      if(claveActual()===k&&datosCompletos())ultimoError.delete(k);
    },2500);
    timers.set(k,timer);
  }

  function instalarUi(){
    if(!esTecnico())return false;
    if(typeof window.consultarDatosAutomaticosFormularioActa!=="function")return false;
    if(window.consultarDatosAutomaticosFormularioActa.__mv544)return true;

    const base=window.consultarDatosAutomaticosFormularioActa;
    const wrap=async function(){
      const k=claveActual();
      if(!k||k==="|")return await base.apply(this,arguments);

      if(datosCompletos()&&resueltaCoincide()){
        cancelarTimer(k);
        return;
      }

      const tError=Number(ultimoError.get([txt(localStorage.getItem("usuario")),k].join("|"))||0);
      if(tError&&Date.now()-tError<COOLDOWN_ERROR_MS&&errorTransitorioVisible()){
        programarReintento(base,k);
        return;
      }

      const r=await base.apply(this,arguments);
      if(claveActual()!==k)return r;
      if(datosCompletos()){
        cancelarTimer(k);
        reintentosVisuales.delete(k);
      }else if(errorTransitorioVisible()){
        programarReintento(base,k);
      }
      return r;
    };
    wrap.__mv544=true;
    wrap.__mv543=true;
    wrap.__base=base;
    window.consultarDatosAutomaticosFormularioActa=wrap;
    try{consultarDatosAutomaticosFormularioActa=wrap;}catch(_){}
    return true;
  }

  function instalar(){
    const a=instalarApi();
    const b=instalarUi();
    if(a&&b){
      console.log("MI VISUAL V544: consulta automática de Actas Técnico optimizada y sin escrituras duplicadas.");
      return true;
    }
    return false;
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
    for(const k of Array.from(timers.keys()))cancelarTimer(k);
  },true);

  if(!instalar()){
    const timer=setInterval(function(){if(instalar())clearInterval(timer);},700);
    setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
  }
})();
