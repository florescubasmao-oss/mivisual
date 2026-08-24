/* ==========================================================
   MI VISUAL V477A - GAR/VTR DIAGNOSTICO SEGURO
   - Solo lectura.
   - NO clasifica, NO escribe, NO recalcula indicadores.
   - Consulta por GET para evitar la ruta POST de la pantalla anterior.
   - Si el backend V477A aun no esta desplegado, vuelve al flujo anterior.
========================================================== */
(function(){
  "use strict";

  if (window.MI_VISUAL_V477A_FRONT_ACTIVO) return;
  window.MI_VISUAL_V477A_FRONT_ACTIVO = true;

  const VERSION = "V477A-DIAGNOSTICO-GAR-VTR-READONLY";
  let instalado = false;

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
      @media(max-width:760px){.mv477a-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
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
      <span style="color:#93c5fd">No se modificó VTR/GAR, Ranking, Dashboard ni Bonos.</span>${perf.ms!=null?` · Consulta ${Number(perf.ms)||0} ms`:""}`;
    host.insertBefore(div,host.firstChild);
  }

  function instalar(){
    if(instalado)return true;
    if(typeof mostrarAsignacionesVtrGar!=="function" ||
       typeof boRenderGestionVtrGar!=="function" ||
       typeof boDetalleVg!=="function" ||
       typeof mostrarPantalla!=="function" ||
       typeof boCss!=="function") return false;

    instalado=true;
    css();

    const mostrarBase=mostrarAsignacionesVtrGar;
    const detalleBase=boDetalleVg;

    boDetalleVg=function(x){
      return detalleBase.apply(this,arguments)+bloqueDeteccion(x);
    };

    mostrarAsignacionesVtrGar=async function(){
      BO_FILTRO_ORIGEN_VG="";
      mostrarPantalla(boCss()+`<div class="bo-wrap">
        <div class="bo-head"><h2>📡 Calificación VTR/GAR</h2><p>MI VISUAL revisa el histórico de los 30 días anteriores por DNI. En esta etapa solo propone PROPIA, ASIGNADA o REVISIÓN MANUAL; no modifica ningún indicador.</p></div>
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
      }catch(e){
        if(e && e.codigo==="BACKEND_SIN_V477A"){
          return mostrarBase.apply(this,arguments);
        }
        const host=document.getElementById("boAsigContenido");
        if(host){
          host.innerHTML=`<div class="bo-msg bo-error"><b>No se pudo consultar GAR/VTR.</b><br>${esc(e&&e.message||e)}<br><br>Esta consulta V477A es de solo lectura; no se modificó ningún dato.</div>
            <div class="bo-actions"><button class="bo-btn" onclick="mostrarAsignacionesVtrGar()">Reintentar</button></div>`;
        }
      }
    };

    window.MI_VISUAL_V477A={version:VERSION,modo:"SOLO_LECTURA"};
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
