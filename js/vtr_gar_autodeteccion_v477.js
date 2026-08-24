/* ==========================================================
   MI VISUAL V477 - Frontend Calificación GAR/VTR
   - No modifica el cargador dinámico.
   - Se activa únicamente cuando base_operativa.js es cargado por Administración.
   - Reintenta de forma silenciosa los errores temporales de candado.
   - Muestra evidencia de la detección automática y completa casos fuertes.
========================================================== */
(function(){
  "use strict";

  if (window.MI_VISUAL_V477_FRONT_ACTIVO) return;
  window.MI_VISUAL_V477_FRONT_ACTIVO = true;

  const VERSION = "V477-AUTODETECCION-GAR-VTR";
  let instalado = false;
  let ejecutandoAuto = false;
  let ultimoResultadoAuto = null;

  function dormir(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function errorCandado(error){
    const t = String(error && error.message || error || "").toLowerCase();
    return t.includes("candado") || t.includes("lock") || t.includes("demasiado tiempo") || t.includes("timed out");
  }

  async function apiReintento(payload, intentos){
    let ultimo;
    for(let i=0;i<intentos;i++){
      try{
        return await boApi(payload);
      }catch(e){
        ultimo=e;
        if(!errorCandado(e) || i===intentos-1) throw e;
        await dormir(650*(i+1));
      }
    }
    throw ultimo || new Error("No se pudo completar la consulta");
  }

  function origenDetectado(x){
    const d=x&&x.deteccionAutomatica;
    if(d&&d.auto&&(d.origenOrden==="PROPIA"||d.origenOrden==="ASIGNADA"))return d.origenOrden;
    return "";
  }

  function escape(v){
    if(typeof boEsc==="function")return boEsc(v);
    return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function bloqueDeteccion(x){
    const d=x&&x.deteccionAutomatica;
    if(!d)return "";
    const estado=String(x.estadoCalificacion||"PENDIENTE").toUpperCase();
    if(d.auto){
      return `<div style="margin-top:10px;padding:10px 11px;border-radius:10px;background:#ecfdf5;border:1px solid #86efac;color:#14532d;font-size:11px;line-height:1.55">
        <b>🤖 Detección automática de origen</b><br>
        <b>${escape(d.origenOrden)}</b> · antecedente confiable por DNI exacto<br>
        Trabajo anterior: <b>${escape(d.tipoTrabajoOrigen||"-")}</b><br>
        Fecha anterior: <b>${escape(d.fechaOrigen||"-")}</b> · ${escape(d.diasTranscurridos==null?"-":d.diasTranscurridos)} día(s)<br>
        Cuadrilla origen: <b>${escape(d.cuadrillaOrigen||"-")}</b> · Cuadrilla que atendió ${escape(x.tipo||"GAR/VTR")}: <b>${escape(x.cuadrillaEjecutora||"-")}</b><br>
        Criterio: DNI exacto + FINALIZADA + máximo 30 días + tipo compatible.
      </div>`;
    }
    if(estado==="PENDIENTE"){
      return `<div style="margin-top:10px;padding:10px 11px;border-radius:10px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:11px;line-height:1.5">
        <b>🟠 Revisión manual</b><br>${escape(d.motivo||"No se encontró evidencia suficiente para asignar automáticamente.")}
      </div>`;
    }
    return "";
  }

  function instalarDetalle(){
    if(typeof window.boDetalleVg!=="function" || window.boDetalleVg.__mv477)return;
    const base=window.boDetalleVg;
    const nueva=function(x){ return base(x)+bloqueDeteccion(x); };
    nueva.__mv477=true;
    window.boDetalleVg=nueva;
  }

  function ponerOrigenVisible(){
    (window.BO_INCIDENCIAS||[]).forEach(x=>{
      const auto=origenDetectado(x);
      const actual=typeof boNorm==="function"?boNorm(x.origenOrden||x.validacionBono&&x.validacionBono.origenOrden||""):String(x.origenOrden||"").toUpperCase();
      if(auto && (!actual || actual==="SIN REGISTRO")) x.origenOrden=auto;
    });
  }

  function insertarResumenDeteccion(){
    const host=document.getElementById("boAsigContenido");
    if(!host)return;
    const r=window.BO_PREVISTA||{};
    const auto=Number(r.autoDetectables||0);
    const manual=Number(r.manualesPendientes||0);
    const ya=host.querySelector("#mv477ResumenAuto");
    if(ya)ya.remove();
    const div=document.createElement("div");
    div.id="mv477ResumenAuto";
    div.style.cssText="margin:0 0 12px;padding:10px 12px;border-radius:11px;background:#0f172a;border:1px solid #475569;color:#e2e8f0;font-size:11px;line-height:1.45";
    div.innerHTML=`<b>🤖 Detección histórica GAR/VTR</b> · ${auto} caso(s) con evidencia automática · ${manual} pendiente(s) para revisión manual. <span style="color:#93c5fd">Regla: DNI exacto + FINALIZADA + máximo 30 días.</span>`;
    host.insertBefore(div,host.firstChild);
  }

  function mostrarAvisoAuto(resultado){
    if(!resultado)return;
    const host=document.getElementById("boAsigContenido");
    if(!host)return;
    const anterior=host.querySelector("#mv477ResultadoAuto");if(anterior)anterior.remove();
    const div=document.createElement("div");div.id="mv477ResultadoAuto";
    if(resultado.omitidoConcurrencia){
      div.style.cssText="margin:0 0 12px;padding:10px 12px;border-radius:11px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:11px";
      div.innerHTML="<b>⏳ Detección automática en espera.</b> Hay otra actualización usando el sistema. Los casos continúan visibles y no se modificó ninguna calificación; se reintentará al volver a abrir esta pantalla.";
    }else if(Number(resultado.aplicados||0)>0){
      div.style.cssText="margin:0 0 12px;padding:10px 12px;border-radius:11px;background:#ecfdf5;border:1px solid #86efac;color:#14532d;font-size:11px";
      div.innerHTML=`<b>✅ ${Number(resultado.aplicados||0)} GAR/VTR clasificada(s) automáticamente.</b> El porcentaje VTR/GAR y Ranking fueron recalculados una sola vez.`;
    }else return;
    host.insertBefore(div,host.firstChild);
  }

  async function cargarGestion(){
    return await apiReintento({accion:"listarGestionVtrGar",usuario:boUsuario()},3);
  }

  async function ejecutarAutomaticosSiCorresponde(r){
    if(ejecutandoAuto)return null;
    const cantidad=Number(r&&r.resumen&&r.resumen.autoDetectables||0);
    if(cantidad<=0)return null;
    ejecutandoAuto=true;
    try{
      const auto=await apiReintento({accion:"calificarIncidenciaVtrGar",usuario:boUsuario(),autoLote:true},2);
      ultimoResultadoAuto=auto;
      return auto;
    }catch(e){
      if(errorCandado(e)){
        ultimoResultadoAuto={ok:true,aplicados:0,omitidoConcurrencia:true};
        return ultimoResultadoAuto;
      }
      throw e;
    }finally{
      ejecutandoAuto=false;
    }
  }

  async function mostrarV477(){
    window.BO_FILTRO_ORIGEN_VG="";
    mostrarPantalla(boCss()+`<div class="bo-wrap">
      <div class="bo-head"><h2>📡 Calificación VTR/GAR</h2><p>MI VISUAL cruza el DNI contra trabajos FINALIZADOS de los 30 días anteriores. Los casos seguros se completan automáticamente; los dudosos permanecen para validación manual.</p></div>
      <div id="boAsigContenido" class="bo-card"><div class="bo-msg">Cargando incidencias y revisando antecedentes...</div></div>
      <div class="bo-actions"><button class="bo-btn alt" onclick="mostrarAdministracion()">⬅️ Volver</button></div>
    </div>`);
    try{
      let r=await cargarGestion();
      window.BO_INCIDENCIAS=r.incidencias||[];
      window.BO_CUADRILLAS=r.cuadrillas||[];
      window.BO_PREVISTA=r.resumen||{};
      instalarDetalle();
      ponerOrigenVisible();

      const auto=await ejecutarAutomaticosSiCorresponde(r);
      if(auto&&Number(auto.aplicados||0)>0){
        r=await cargarGestion();
        window.BO_INCIDENCIAS=r.incidencias||[];
        window.BO_CUADRILLAS=r.cuadrillas||[];
        window.BO_PREVISTA=r.resumen||{};
        ponerOrigenVisible();
      }
      boRenderGestionVtrGar();
      insertarResumenDeteccion();
      mostrarAvisoAuto(auto||ultimoResultadoAuto);
    }catch(e){
      const host=document.getElementById("boAsigContenido");
      if(host){
        host.innerHTML=`<div class="bo-msg bo-error"><b>No se pudo consultar VTR/GAR.</b><br>${escape(e.message||e)}<br><br><button class="bo-btn" onclick="mostrarAsignacionesVtrGar()">Reintentar</button></div>`;
      }
    }
  }

  function instalar(){
    if(instalado)return true;
    if(typeof window.boApi!=="function" || typeof window.boRenderGestionVtrGar!=="function" || typeof window.mostrarAsignacionesVtrGar!=="function")return false;
    instalado=true;
    instalarDetalle();
    window.mostrarAsignacionesVtrGar=mostrarV477;
    window.MI_VISUAL_V477_INSTALADO=true;
    return true;
  }

  if(instalar())return;

  // Administración es lazy-loaded. Observamos únicamente la inserción del script
  // correspondiente para no crear temporizadores permanentes en el navegador.
  const observador=new MutationObserver(function(muts){
    let candidato=false;
    muts.forEach(m=>Array.from(m.addedNodes||[]).forEach(n=>{
      if(n&&n.tagName==="SCRIPT"&&String(n.src||"").includes("base_operativa.js"))candidato=true;
    }));
    if(!candidato)return;
    const intento=()=>{
      if(instalar())observador.disconnect();
      else setTimeout(intento,80);
    };
    setTimeout(intento,0);
  });
  observador.observe(document.documentElement,{childList:true,subtree:true});
})();
