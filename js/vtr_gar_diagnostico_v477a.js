/* ==========================================================
   MI VISUAL V477A2 - GAR/VTR DIAGNOSTICO + CONTROL DE GUARDADO
   - Diagnostico por GET, sin escritura.
   - Al guardar/calificar bloquea la pantalla hasta terminar.
   - Evita doble clic y solicitudes simultaneas VTR/GAR.
   - Historial muestra boton visible VALIDAR NUEVAMENTE.
   - NO cambia formulas ni estructura de datos.
========================================================== */
(function(){
  "use strict";

  if (window.MI_VISUAL_V477A_FRONT_ACTIVO) return;
  window.MI_VISUAL_V477A_FRONT_ACTIVO = true;

  const VERSION = "V477A2-DIAGNOSTICO-CONTROL-GUARDADO";
  let instalado = false;
  let operacionEnCurso = false;

  function norm(v){
    return (v == null ? "" : String(v)).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function esc(v){
    return (v == null ? "" : String(v)).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function css(){
    if(document.getElementById("mv477a-vtrgar-css")) return;
    const s=document.createElement("style");
    s.id="mv477a-vtrgar-css";
    s.textContent=`
      .mv477a-box{margin:9px 0 2px;padding:10px 11px;border-radius:11px;border:1px solid #86efac;background:#f0fdf4;color:#14532d;font-size:11px;line-height:1.5}
      .mv477a-box.asignada{border-color:#93c5fd;background:#eff6ff;color:#1e3a8a}
      .mv477a-box.manual{border-color:#fdba74;background:#fff7ed;color:#9a3412}
      .mv477a-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px;margin-top:6px}
      .mv477a-banner{padding:10px 12px;border-radius:11px;margin-bottom:12px;background:#0f172a;border:1px solid #334155;color:#dbeafe;font-size:12px;line-height:1.5}
      .mv477a-banner b{font-weight:900}
      .mv477a-revalidar{background:#7c3aed!important}
      .mv477a-busy{position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,.78);display:flex;align-items:center;justify-content:center;padding:20px}
      .mv477a-busy-card{width:min(430px,92vw);background:#fff;color:#0f172a;border-radius:16px;padding:22px;text-align:center;box-shadow:0 22px 60px rgba(0,0,0,.4)}
      .mv477a-spinner{width:38px;height:38px;border:4px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;margin:0 auto 13px;animation:mv477spin .8s linear infinite}
      .mv477a-busy-card b{display:block;font-size:17px;margin-bottom:6px}.mv477a-busy-card span{font-size:12px;color:#475569;line-height:1.45}
      .mv477a-op-error{margin:10px 0;padding:11px 12px;border-radius:11px;background:#7f1d1d;color:#fff;font-size:12px;line-height:1.5}
      @keyframes mv477spin{to{transform:rotate(360deg)}}
      @media(max-width:760px){.mv477a-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ponerBusy(texto){
    operacionEnCurso=true;
    let el=document.getElementById("mv477aBusy");
    if(!el){
      el=document.createElement("div");
      el.id="mv477aBusy";
      el.className="mv477a-busy";
      document.body.appendChild(el);
    }
    el.innerHTML=`<div class="mv477a-busy-card"><div class="mv477a-spinner"></div><b>${esc(texto||"Procesando...")}</b><span>Espere a que termine. Los botones quedan bloqueados para evitar solicitudes duplicadas o saturar Apps Script.</span></div>`;
    el.style.display="flex";
  }

  function quitarBusy(){
    operacionEnCurso=false;
    const el=document.getElementById("mv477aBusy");
    if(el)el.style.display="none";
  }

  function mostrarErrorOperacion(error){
    quitarBusy();
    const mensaje=String(error&&error.message||error||"No se pudo completar la operacion");
    const candado=/CANDADO|LOCK|LOCKED|TIEMPO DE ESPERA/i.test(mensaje);
    const host=document.getElementById("boAsigContenido");
    if(host){
      const div=document.createElement("div");
      div.className="mv477a-op-error";
      div.innerHTML=candado
        ? `<b>La operacion no termino porque Apps Script estaba ocupado.</b><br>No haga otra validacion al mismo tiempo. Espere unos segundos y use <b>Reintentar</b>. No se enviara una segunda solicitud automaticamente.<div class="bo-actions"><button class="bo-mini-btn" onclick="mostrarAsignacionesVtrGar()">Reintentar</button></div>`
        : `<b>No se pudo completar la validacion.</b><br>${esc(mensaje)}<div class="bo-actions"><button class="bo-mini-btn" onclick="mostrarAsignacionesVtrGar()">Actualizar pantalla</button></div>`;
      host.insertBefore(div,host.firstChild);
      div.scrollIntoView({behavior:"smooth",block:"start"});
    }
  }

  async function apiGetDiagnostico(){
    const base=(typeof API_BASE_OPERATIVA!=="undefined" && API_BASE_OPERATIVA)
      ? API_BASE_OPERATIVA
      : (window.MI_VISUAL_API_URL||"");
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");

    const url=new URL(base);
    url.searchParams.set("accion","analizarGestionVtrGarV477A");
    url.searchParams.set("usuario",typeof boUsuario==="function"?boUsuario():"");
    url.searchParams.set("_",String(Date.now()));

    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});
    const t=await r.text();
    let j=null;
    try{j=JSON.parse(t);}catch(_){
      const e=new Error("BACKEND_SIN_V477A");
      e.codigo="BACKEND_SIN_V477A";
      throw e;
    }
    if(!j || j.accion!=="DIAGNOSTICO_V477A"){
      if(j && j.ok===false) throw new Error(j.error||"No se pudo consultar GAR/VTR.");
      const e=new Error("BACKEND_SIN_V477A");
      e.codigo="BACKEND_SIN_V477A";
      throw e;
    }
    if(!j.ok) throw new Error(j.error||"No se pudo consultar GAR/VTR.");
    return j;
  }

  function bloqueDeteccion(x){
    const d=x&&x.deteccionV477A;
    const pendiente=norm(x&&x.estadoCalificacion||"PENDIENTE")==="PENDIENTE";
    if(!pendiente || !d) return "";

    if(d.segura){
      const asignada=norm(d.propuesta)==="ASIGNADA";
      return `<div class="mv477a-box ${asignada?"asignada":""}">
        🔎 <b>Propuesta automática: ${esc(d.propuesta||"-")}</b> <span style="font-weight:700">(solo diagnóstico, aún no aplicada)</span>
        <div class="mv477a-grid">
          <div>Trabajo anterior: <b>${esc(d.tipoTrabajoOrigen||"-")}</b></div>
          <div>Fecha anterior: <b>${esc(d.fechaOrigen||"-")}</b></div>
          <div>Cuadrilla origen: <b>${esc(d.cuadrillaOrigen||"-")}</b></div>
          <div>Atendió ${esc(x.tipo||"GAR/VTR")}: <b>${esc(x.cuadrillaEjecutora||"-")}</b></div>
          <div>Días transcurridos: <b>${esc(d.diasTranscurridos==null?"-":d.diasTranscurridos)}</b></div>
          <div>DNI: <b>${esc(x.numeroDocumento||"-")}</b></div>
        </div>
      </div>`;
    }

    return `<div class="mv477a-box manual">🟠 <b>Revisión manual</b> · ${esc(d.motivo||"No se encontro evidencia suficiente para asignar automaticamente.")}</div>`;
  }

  function banner(r){
    const host=document.getElementById("boAsigContenido");
    if(!host)return;
    const q=r&&r.resumen||{};
    const perf=r&&r.rendimiento||{};
    const div=document.createElement("div");
    div.className="mv477a-banner";
    div.innerHTML=`<b>V477A · Diagnóstico GAR/VTR sin escritura</b><br>
      Propuestas seguras: <b>${Number(q.propuestasSeguras||0)}</b> · Propias: <b>${Number(q.propuestasPropias||0)}</b> · Asignadas: <b>${Number(q.propuestasAsignadas||0)}</b> · Revisión manual: <b>${Number(q.revisionManual||0)}</b>.<br>
      <span style="color:#93c5fd">La propuesta automática no cambia indicadores hasta que usted confirme.</span>${perf.ms!=null?` · Consulta ${Number(perf.ms)||0} ms`:""}`;
    host.insertBefore(div,host.firstChild);
  }

  function instalar(){
    if(instalado)return true;
    if(typeof mostrarAsignacionesVtrGar!=="function" ||
       typeof boRenderGestionVtrGar!=="function" ||
       typeof boDetalleVg!=="function" ||
       typeof boTarjetaVg!=="function" ||
       typeof boCalificarVtrGar!=="function" ||
       typeof boGuardarCalificacionVg!=="function" ||
       typeof mostrarPantalla!=="function" ||
       typeof boCss!=="function") return false;

    instalado=true;
    css();

    const mostrarBase=mostrarAsignacionesVtrGar;
    const detalleBase=boDetalleVg;

    boDetalleVg=function(x){
      return detalleBase.apply(this,arguments)+bloqueDeteccion(x);
    };

    // Tarjeta VTR/GAR: mantiene las acciones actuales y hace visible la opcion
    // de corregir cualquier calificacion ya guardada.
    boTarjetaVg=function(i,historial){
      const x=BO_INCIDENCIAS[i];
      return `<div class="bo-inc-card ${historial?"hist":""}">
        <div class="bo-inc-head"><span class="bo-inc-type">${esc(x.tipo)} · ${esc(x.sedeEjecutora||"SIN SEDE")}</span><span class="bo-inc-statuses">${boOrigenVg(x)}${boEstadoBonoVg(x)}${boEstadoVg(x.estadoCalificacion)}</span></div>
        ${boDetalleVg(x)}
        ${x.observacion?`<div class="bo-match"><b>Observación:</b> ${esc(x.observacion)}</div>`:""}
        ${historial
          ? `<div class="bo-inc-actions"><button class="bo-mini-btn mv477a-revalidar" onclick="boAbrirEditorVtrGar(${i})">🔄 Validar nuevamente</button></div>`
          : `<div class="bo-inc-actions"><button class="bo-mini-btn" onclick="boCalificarVtrGar(${i},'CORRESPONDE')">Sí corresponde</button><button class="bo-mini-btn alt" onclick="boAbrirEditorVtrGar(${i})">Asignar a otra cuadrilla</button><button class="bo-mini-btn danger" onclick="boCalificarVtrGar(${i},'ANULAR')">Anular</button></div>`}
      </div>`;
    };

    // Guarda una decision rapida con bloqueo visual. No permite una segunda
    // solicitud hasta que Apps Script termine la primera.
    boCalificarVtrGar=async function(i,decision){
      if(operacionEnCurso)return;
      const x=BO_INCIDENCIAS[i];if(!x)return;
      if(decision==="ANULAR"&&!confirm("¿Anular esta incidencia? Dejará de contabilizarse, pero permanecerá en el historial."))return;
      if(decision==="CORRESPONDE"&&!confirm(`¿Confirmar que ${x.cuadrillaEjecutora} es responsable de esta ${x.tipo}?`))return;
      ponerBusy(decision==="ANULAR"?"Anulando incidencia...":"Guardando validación y recalculando VTR/GAR...");
      try{
        await boApi({accion:"calificarIncidenciaVtrGar",usuario:boUsuario(),clave:x.clave,decision,observacion:""});
        await mostrarAsignacionesVtrGar();
        quitarBusy();
      }catch(e){mostrarErrorOperacion(e);}
    };

    boGuardarCalificacionVg=async function(i){
      if(operacionEnCurso)return;
      const x=BO_INCIDENCIAS[i];if(!x)return;
      const decision=document.getElementById("boVgDecision").value;
      const responsable=document.getElementById("boVgResponsable").value;
      if(decision==="REASIGNAR"&&!responsable){alert("Seleccione la cuadrilla responsable.");return;}
      ponerBusy("Guardando corrección y recalculando VTR/GAR...");
      try{
        await boApi({accion:"calificarIncidenciaVtrGar",usuario:boUsuario(),clave:x.clave,decision,cuadrillaResponsable:responsable,observacion:document.getElementById("boVgObs").value});
        await mostrarAsignacionesVtrGar();
        quitarBusy();
      }catch(e){mostrarErrorOperacion(e);}
    };

    mostrarAsignacionesVtrGar=async function(){
      BO_FILTRO_ORIGEN_VG="";
      mostrarPantalla(boCss()+`<div class="bo-wrap">
        <div class="bo-head"><h2>📡 Calificación VTR/GAR</h2><p>MI VISUAL revisa el histórico de los 30 días anteriores por DNI. La propuesta automática es informativa hasta que usted confirme la validación.</p></div>
        <div id="boAsigContenido" class="bo-card"><div class="bo-msg">Cargando incidencias y cruzando histórico...</div></div>
        <div class="bo-actions"><button class="bo-btn alt" onclick="mostrarAdministracion()">⬅️ Volver</button></div>
      </div>`);

      try{
        const r=await apiGetDiagnostico();
        BO_INCIDENCIAS=r.incidencias||[];
        BO_CUADRILLAS=r.cuadrillas||[];
        BO_PREVISTA=r.resumen||{};
        boRenderGestionVtrGar();
        banner(r);
        return r;
      }catch(e){
        if(e && e.codigo==="BACKEND_SIN_V477A"){
          return mostrarBase.apply(this,arguments);
        }
        const host=document.getElementById("boAsigContenido");
        if(host){
          host.innerHTML=`<div class="bo-msg bo-error"><b>No se pudo consultar GAR/VTR.</b><br>${esc(e&&e.message||e)}<br><br>La consulta de diagnóstico no modificó ningún dato.</div>
            <div class="bo-actions"><button class="bo-btn" onclick="mostrarAsignacionesVtrGar()">Reintentar</button></div>`;
        }
        throw e;
      }
    };

    window.MI_VISUAL_V477A={version:VERSION,modo:"DIAGNOSTICO_CON_CONTROL_DE_GUARDADO"};
    return true;
  }

  if(instalar())return;

  const obs=new MutationObserver(function(muts){
    for(const m of muts){
      for(const n of Array.from(m.addedNodes||[])){
        if(n&&n.tagName==="SCRIPT"&&String(n.src||"").includes("base_operativa.js")){
          n.addEventListener("load",function(){
            setTimeout(function(){ if(instalar())obs.disconnect(); },0);
          },{once:true});
        }
      }
    }
    if(instalar())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
