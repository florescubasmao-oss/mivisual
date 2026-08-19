/* ============================================================
   MI VISUAL V450 - SUPERVISORES HABILITADOS PARA BONO
   Capa incremental sobre bono_supervisores.js.
   - No modifica escalas ni cálculos existentes.
   - Jefatura configura SI/NO por supervisor y período.
   - Los supervisores SIN BONO no aparecen en el cálculo normal.
============================================================ */
(function(){
  "use strict";
  if(window.MV450_BONO_HABILITACION_OK) return;
  window.MV450_BONO_HABILITACION_OK = true;

  let ultimaInfo = null;

  function esc(v){
    if(typeof window.mv321Esc === "function") return window.mv321Esc(v);
    return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function estadoBono(){
    try{return typeof MV321_BONO_SUPERVISORES!=="undefined"?MV321_BONO_SUPERVISORES:null;}catch(_){return null;}
  }

  function apiBase(){
    return window.MI_VISUAL_API_URL || window.MV58_API || "";
  }

  async function getConfig(periodo){
    const base=apiBase();
    if(!base) throw new Error("No se encontró la URL de MI VISUAL.");
    const url=new URL(base);
    url.searchParams.set("accion","obtenerHabilitacionBonosSupervisores");
    url.searchParams.set("usuario",localStorage.getItem("usuario")||"");
    url.searchParams.set("periodo",periodo||"");
    url.searchParams.set("_mv450",Date.now().toString());
    const c=typeof AbortController==="function"?new AbortController():null;
    const t=c?setTimeout(()=>c.abort(),30000):null;
    try{
      const r=await fetch(url.toString(),{method:"GET",cache:"no-store",headers:{"Accept":"application/json"},signal:c?c.signal:undefined});
      const texto=(await r.text()).trim();
      if(!r.ok) throw new Error(`No se pudo consultar la habilitación (${r.status}).`);
      if(!texto || /^MI VISUAL API OK$/i.test(texto) || /^<!doctype|^<html/i.test(texto)) throw new Error("Apps Script no devolvió la configuración vigente.");
      const data=JSON.parse(texto);
      if(!data?.ok) throw new Error(data?.error||"No se pudo consultar la habilitación del bono.");
      return data;
    }catch(e){
      if(e?.name==="AbortError") throw new Error("La consulta tardó demasiado. Intente nuevamente.");
      throw e;
    }finally{if(t)clearTimeout(t);}
  }

  function resumenHtml(r){
    return `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 14px;">
      <div style="padding:10px;border-radius:12px;background:#0d2037;border:1px solid #274566;text-align:center;"><small>SUPERVISORES</small><b style="display:block;font-size:22px;">${Number(r?.total||0)}</b></div>
      <div style="padding:10px;border-radius:12px;background:#052e16;border:1px solid #22c55e;text-align:center;"><small>CON BONO</small><b style="display:block;font-size:22px;color:#86efac;">${Number(r?.habilitados||0)}</b></div>
      <div style="padding:10px;border-radius:12px;background:#3f1616;border:1px solid #ef4444;text-align:center;"><small>SIN BONO</small><b style="display:block;font-size:22px;color:#fca5a5;">${Number(r?.sinBono||0)}</b></div>
    </div>`;
  }

  function renderConfig(data){
    const lista=Array.isArray(data?.supervisores)?data.supervisores:[];
    const sedes=[...new Set(lista.map(x=>x.sede||"SIN SEDE"))];
    return `<div class="mv321-param-intro">
      Configuración exclusiva de <b>${esc(data.periodo||"")}</b>. Todos los supervisores se consideran <b>habilitados por defecto</b> hasta que Jefatura indique lo contrario. El monto máximo y las escalas siguen siendo los mismos para todos los habilitados.
    </div>
    ${resumenHtml(data.resumen)}
    <div id="mv450SupervisorLista">
      ${sedes.map(sede=>{
        const items=lista.filter(x=>(x.sede||"SIN SEDE")===sede);
        return `<div style="margin-top:12px;border:1px solid #274566;border-radius:14px;overflow:hidden;background:#0d2037;">
          <div style="padding:10px 12px;background:#102844;font-weight:900;">📍 ${esc(sede)} · ${items.length} supervisor${items.length===1?'':'es'}</div>
          ${items.map(x=>`<label style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border-top:1px solid #274566;cursor:pointer;">
            <input class="mv450-bono-check" data-usuario="${esc(x.usuario)}" type="checkbox" ${x.habilitado?'checked':''} style="width:20px;height:20px;">
            <span style="min-width:0;"><b style="display:block;overflow-wrap:anywhere;">${esc(x.nombre||x.usuario)}</b><small style="color:#9fc1e4;">${esc(x.usuario)} · ${Number(x.totalCuadrillas||0)} cuadrillas${x.configurado?'':' · predeterminado'}</small></span>
            <span style="font-size:10px;font-weight:900;white-space:nowrap;">${x.habilitado?'✅ CON BONO':'❌ SIN BONO'}</span>
          </label>`).join('')}
        </div>`;
      }).join('')}
    </div>
    <div id="mv450BonoMensaje" class="mv321-form-msg"></div>
    <button class="mv321-guardar" onclick="mv450GuardarHabilitacionBonos()">💾 Guardar quién participa del bono</button>`;
  }

  window.mv450AbrirHabilitacionBonos=async function(){
    const periodo=estadoBono()?.periodo||"";
    if(!periodo){alert("Seleccione primero un período.");return;}
    if(typeof window.mv321MostrarModal!=="function") return;
    window.mv321MostrarModal("Supervisores habilitados para bono",`<div class="mv321-cargando">Cargando supervisores del período...</div>`);
    try{
      const data=await getConfig(periodo);
      ultimaInfo=data;
      window.mv321MostrarModal("Supervisores habilitados para bono",renderConfig(data));
      document.querySelectorAll('.mv450-bono-check').forEach(ch=>{
        ch.addEventListener('change',function(){
          const etiqueta=this.closest('label')?.querySelector('span:last-child');
          if(etiqueta) etiqueta.textContent=this.checked?'✅ CON BONO':'❌ SIN BONO';
        });
      });
    }catch(e){
      window.mv321MostrarModal("Supervisores habilitados para bono",`<div class="mv321-error"><b>No se pudo cargar</b><span>${esc(e.message)}</span></div>`);
    }
  };

  window.mv450GuardarHabilitacionBonos=async function(){
    const periodo=estadoBono()?.periodo||ultimaInfo?.periodo||"";
    const mensaje=document.getElementById('mv450BonoMensaje');
    const supervisores=Array.from(document.querySelectorAll('.mv450-bono-check')).map(ch=>({usuario:ch.dataset.usuario||"",habilitado:!!ch.checked}));
    if(!periodo||!supervisores.length||!mensaje)return;
    mensaje.className='mv321-form-msg';
    mensaje.textContent='Guardando habilitación...';
    try{
      let data;
      if(typeof window.mv321Post==='function'){
        data=await window.mv321Post('guardarHabilitacionBonosSupervisores',{periodo,supervisores});
      }else{
        throw new Error('No está disponible el servicio de Bonos Supervisores.');
      }
      ultimaInfo=data;
      mensaje.className='mv321-form-msg ok';
      mensaje.textContent=`Guardado: ${Number(data?.resumen?.habilitados||0)} con bono y ${Number(data?.resumen?.sinBono||0)} sin bono.`;
      setTimeout(async function(){
        try{
          if(typeof window.mv321CerrarModal==='function') window.mv321CerrarModal();
          if(typeof window.mv334ActualizarCalculo==='function') await window.mv334ActualizarCalculo();
        }catch(e){console.warn('V450: la configuración quedó guardada; no se pudo refrescar el cálculo automáticamente.',e);}
      },650);
    }catch(e){
      mensaje.className='mv321-form-msg error';
      mensaje.textContent=e.message||'No se pudo guardar.';
    }
  };

  // Captura el indicador devuelto por el backend sin tocar el cálculo original.
  if(typeof window.mv351GetBonos==='function'){
    const originalGet=window.mv351GetBonos;
    window.mv351GetBonos=async function(){
      const data=await originalGet.apply(this,arguments);
      window.MV450_BONO_INFO={
        resumen:data?.resumenHabilitacion||null,
        habilitacionUsuario:data?.habilitacionUsuario
      };
      return data;
    };
    try{mv351GetBonos=window.mv351GetBonos;}catch(_){}
  }

  if(typeof window.mv325BotonesConfiguracion==='function'){
    const originalBotones=window.mv325BotonesConfiguracion;
    window.mv325BotonesConfiguracion=function(){
      let html=originalBotones.apply(this,arguments)||'';
      const estado=estadoBono()||{};
      if(estado.periodo&&estado.puedeEditarConfiguracion){
        html+=`<button class="mv321-config" onclick="mv450AbrirHabilitacionBonos()">👥 Supervisores con bono</button>`;
      }
      return html;
    };
    try{mv325BotonesConfiguracion=window.mv325BotonesConfiguracion;}catch(_){}
  }

  if(typeof window.mv321RenderEstadoBase==='function'){
    const originalEstado=window.mv321RenderEstadoBase;
    window.mv321RenderEstadoBase=function(){
      const estado=estadoBono()||{};
      const info=window.MV450_BONO_INFO||{};
      if(estado.periodo&&!estado.cargando&&!estado.error&&Array.isArray(estado.bonos)&&!estado.bonos.length){
        if(info.habilitacionUsuario===false){
          return `<section class="mv321-panel"><div class="mv321-vacio"><b>Sin bono en este período</b><span>Este supervisor no está habilitado para participar del bono de ${esc(estado.periodo)}.</span></div></section>`;
        }
        if(info.resumen&&Number(info.resumen.total||0)>0&&Number(info.resumen.habilitados||0)===0){
          return `<section class="mv321-panel"><div class="mv321-vacio"><b>No hay supervisores habilitados</b><span>Jefatura dejó a todos los supervisores fuera del bono para este período.</span></div></section>`;
        }
      }
      return originalEstado.apply(this,arguments);
    };
    try{mv321RenderEstadoBase=window.mv321RenderEstadoBase;}catch(_){}
  }
})();
