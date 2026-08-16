/* ============================================================
   MI VISUAL V427 - Asignación flexible por cuadrilla u orden/cliente
   CAPA INCREMENTAL:
   - Entrada principal desde Actividad en Campo; Mapa solo como apoyo.
   - Jefatura/Gerencia asignan por cuadrilla o por Código/DNI.
   - Supervisor ejecuta usando Actividad en Campo existente.
   - Plantilla / Acta / ubicación se consultan desde fuentes existentes.
============================================================ */
(function(){
  "use strict";
  if(window.MV424_ASIGNACIONES_CAMPO_OK) return;

  const API = window.MI_VISUAL_API_URL || "";
  const TIPOS = [
    "AUDITORIA EN FRIO",
    "AUDITORIA EN CALIENTE",
    "SEGUIMIENTO",
    "VALIDACION DE OBSERVACION",
    "CAPACITACION",
    "CHECKLIST"
  ];

  let cacheLista = [];
  let cachePorId = Object.create(null);
  let fichaPreparada = null;
  let integracionActividad = false;
  let mostrarActividadAnterior = null;
  let construirAuditoriaAnterior = null;
  let motivoSugeridoV426 = "";
  let prefillAsignacionV426 = null;
  let alertasCuadrillasV426 = [];
  let alertasPeriodoV426 = "";
  let catalogoAsignacionV427 = {sedes:[],cuadrillas:[],supervisores:[]};

  function n(v){return String(v ?? "").trim();}
  function nt(v){return n(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");}
  function esc(v){return n(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function perfil(){return nt(localStorage.getItem("perfil")||"");}
  function usuario(){return localStorage.getItem("usuario")||"";}
  function esSupervisor(){return perfil()==="SUPERVISOR";}
  function puedeAsignar(){
    return [
      "JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR",
      "JEFATURA OPERACIONES","JEFATURA DE OPERACIONES","OPERACIONES",
      "GERENCIA GENERAL","GERENCIAL GENERAL","GERENCIA LIMA"
    ].includes(perfil());
  }
  function esGestion(){
    return puedeAsignar() || ["GERENCIA GENERAL","GERENCIAL GENERAL","GERENCIA LIMA"].includes(perfil());
  }

  function instalarEstilos(){
    if(document.getElementById("mv424Style")) return;
    const s=document.createElement("style");
    s.id="mv424Style";
    s.textContent=`
      .mv424-map-btn{border:0;border-radius:10px;padding:9px 12px;background:#7c3aed;color:#fff;font-weight:900;cursor:pointer;white-space:nowrap}
      .mv424-map-btn b{background:#fff;color:#6d28d9;border-radius:999px;padding:2px 6px;margin-left:5px;font-size:10px}
      .mv424-wrap{max-width:980px;margin:0 auto;padding:14px 14px 90px;color:#fff}
      .mv424-head{background:linear-gradient(135deg,#172946,#263e68);border-radius:18px;padding:16px;border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(0,0,0,.24)}
      .mv424-head h2{margin:0 0 6px;font-size:23px}.mv424-head p{margin:0;color:#cbd5e1;font-size:12px;line-height:1.4}
      .mv424-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .mv424-btn{border:0;border-radius:10px;padding:10px 13px;background:#0d6efd;color:#fff;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
      .mv424-btn.sec{background:#53657e}.mv424-btn.ok{background:#16a34a}.mv424-btn.warn{background:#d97706}.mv424-btn.danger{background:#dc2626}.mv424-btn:disabled{opacity:.6;cursor:not-allowed}
      .mv424-card{background:#f8fafc;color:#0f172a;border-radius:16px;padding:14px;margin:12px 0;border:1px solid #dbe5f0;box-shadow:0 7px 18px rgba(0,0,0,.16)}
      .mv424-card h3{margin:0 0 10px;font-size:17px}
      .mv424-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
      .mv424-kpi{background:#fff;color:#0f172a;border-radius:13px;padding:10px;text-align:center;border:1px solid #dbe5f0}.mv424-kpi b{font-size:20px;display:block}.mv424-kpi small{color:#64748b}
      .mv424-filter{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .mv424-field{display:flex;flex-direction:column;gap:5px;min-width:0}.mv424-field label{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase}
      .mv424-field input,.mv424-field select,.mv424-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff;color:#0f172a;font:inherit}
      .mv424-field textarea{min-height:82px;resize:vertical}.mv424-wide{grid-column:1/-1}
      .mv424-item{border:1px solid #dbe5f0;border-radius:13px;padding:12px;margin:9px 0;background:#fff}
      .mv424-item-top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}.mv424-item strong{font-size:14px}.mv424-item small{color:#64748b;line-height:1.35}
      .mv424-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.mv424-badge{border-radius:999px;padding:4px 7px;font-size:10px;font-weight:900;background:#e2e8f0;color:#334155}
      .mv424-prio-URGENTE{background:#fee2e2;color:#b91c1c}.mv424-prio-ALTA{background:#ffedd5;color:#c2410c}.mv424-prio-NORMAL{background:#dbeafe;color:#1d4ed8}
      .mv424-est-PENDIENTE{background:#fef3c7;color:#92400e}.mv424-est-EN-PROCESO{background:#dbeafe;color:#1d4ed8}.mv424-est-COMPLETADO{background:#dcfce7;color:#166534}.mv424-est-ANULADO{background:#e5e7eb;color:#475569}
      .mv424-note{padding:10px;border-radius:10px;background:#eff6ff;color:#1e40af;font-size:12px;line-height:1.4}.mv424-ok{background:#dcfce7;color:#166534}.mv424-warn{background:#fff7ed;color:#9a3412}
      .mv424-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}.mv424-dato{border-bottom:1px dashed #d7e0eb;padding:6px 0}.mv424-dato b{display:block;font-size:10px;color:#64748b;text-transform:uppercase}.mv424-dato span{font-weight:800;display:block;margin-top:3px;overflow-wrap:anywhere}
      .mv426-alert-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .mv426-alert-card{border:1px solid #fed7aa;border-left:5px solid #f59e0b;background:#fffaf3;border-radius:12px;padding:11px}
      .mv426-alert-card strong{display:block;font-size:13px}.mv426-alert-card small{color:#64748b}
      .mv426-alert-chips{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.mv426-alert-chip{font-size:10px;font-weight:900;padding:4px 7px;border-radius:999px;background:#fee2e2;color:#b91c1c}
      .mv426-reco{font-size:11px;line-height:1.4;color:#475569;background:#f8fafc;border-radius:9px;padding:8px}
      .mv426-selected{margin-top:9px;padding:9px;border-radius:10px;background:#ede9fe;color:#5b21b6;font-size:11px}
      .mv427-guia{margin-top:8px;padding:9px 10px;border-radius:10px;background:#eef6ff;color:#1e3a8a;font-size:11px;line-height:1.4;border-left:4px solid #3b82f6}
      .mv427-ref{background:#f8fafc;border:1px dashed #94a3b8;border-radius:12px;padding:11px;margin-top:9px}
      .mv427-ref-ok{background:#ecfdf5;border-color:#86efac}
      .mv427-inline{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      @media(max-width:700px){.mv424-filter,.mv424-grid,.mv424-kpis,.mv426-alert-grid,.mv427-inline{grid-template-columns:1fr}.mv424-wrap{padding:10px 8px 80px}.mv424-item-top{flex-direction:column}}
    `;
    document.head.appendChild(s);
  }

  async function apiGet(accion,params){
    if(!API) throw new Error("API no configurada.");
    const u=new URL(API);
    const p=Object.assign({accion,usuario:usuario()},params||{});
    Object.keys(p).forEach(k=>{const v=p[k];if(v!==undefined&&v!==null&&String(v)!=="")u.searchParams.set(k,String(v));});
    const c=typeof AbortController==="function"?new AbortController():null;
    const t=c?setTimeout(()=>c.abort(),20000):null;
    try{
      const r=await fetch(u.toString(),{method:"GET",cache:"no-store",signal:c?c.signal:undefined});
      const txt=await r.text();let d;try{d=JSON.parse(txt);}catch(_){throw new Error("Respuesta inválida de la API.");}
      if(!d.ok)throw new Error(d.error||"No se pudo completar la consulta.");
      return d;
    }catch(e){if(e?.name==="AbortError")throw new Error("La consulta tardó demasiado.");throw e;}
    finally{if(t)clearTimeout(t);}
  }

  async function apiPost(payload){
    const c=typeof AbortController==="function"?new AbortController():null;
    const t=c?setTimeout(()=>c.abort(),30000):null;
    try{
      const r=await fetch(API,{method:"POST",body:JSON.stringify(Object.assign({usuario:usuario()},payload||{})),signal:c?c.signal:undefined});
      const txt=await r.text();let d;try{d=JSON.parse(txt);}catch(_){throw new Error("Respuesta inválida de la API.");}
      if(!d.ok)throw new Error(d.error||"No se pudo completar la operación.");
      return d;
    }catch(e){if(e?.name==="AbortError")throw new Error("La operación tardó demasiado.");throw e;}
    finally{if(t)clearTimeout(t);}
  }

  function dato(l,v){
    if(!n(v))return "";
    return `<div class="mv424-dato"><b>${esc(l)}</b><span>${esc(v)}</span></div>`;
  }

  function estadoClase(v){return "mv424-est-"+nt(v).replace(/\s+/g,"-");}
  function prioClase(v){return "mv424-prio-"+nt(v).replace(/\s+/g,"-");}

  function kpisHtml(t){
    t=t||{};
    return `<div class="mv424-kpis">
      <div class="mv424-kpi"><b>${Number(t.PENDIENTE)||0}</b><small>Pendientes</small></div>
      <div class="mv424-kpi"><b>${Number(t["EN PROCESO"])||0}</b><small>En proceso</small></div>
      <div class="mv424-kpi"><b>${Number(t.COMPLETADO)||0}</b><small>Completados</small></div>
      <div class="mv424-kpi"><b>${Number(t.TOTAL)||0}</b><small>Total</small></div>
    </div>`;
  }

  function tarjeta(a){
    const limite=a.fechaLimite?` · Límite ${esc(a.fechaLimite)}`:"";
    return `<div class="mv424-item">
      <div class="mv424-item-top">
        <div>
          <strong>${esc(a.codigoOrden||a.codigoIngresado||"SIN CÓDIGO")} · ${esc(a.cliente||"Cliente")}</strong><br>
          <small>${esc(a.sede||"")} · ${esc(a.cuadrilla||"")} · ${esc(a.supervisor||"")}${limite}</small>
          <div class="mv424-badges">
            <span class="mv424-badge ${estadoClase(a.estado)}">${esc(a.estado||"")}</span>
            <span class="mv424-badge ${prioClase(a.prioridad)}">${esc(a.prioridad||"NORMAL")}</span>
            <span class="mv424-badge">${esc(a.tipoActividad||"")}</span>
          </div>
        </div>
        <button class="mv424-btn" onclick="mv424AbrirAsignacion('${esc(a.id)}')">Ver caso</button>
      </div>
      <div class="mv424-note" style="margin-top:9px"><b>Motivo:</b> ${esc(a.motivo||"-")}</div>
    </div>`;
  }

  async function mostrarTrabajos(){
    instalarEstilos();
    if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
    if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap"><div class="mv424-head"><h2>📋 Trabajos de campo</h2><p>Cargando asignaciones...</p></div></div>`);
    try{
      const d=await apiGet("listarAsignacionesCampoV424",{estado:"TODOS"});
      cacheLista=d.asignaciones||[];cachePorId=Object.create(null);cacheLista.forEach(x=>cachePorId[x.id]=x);
      renderLista(d);
    }catch(e){
      if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap"><div class="mv424-card"><h3>❌ No se pudo cargar</h3><div class="mv424-note mv424-warn">${esc(e.message)}</div><button class="mv424-btn sec" style="margin-top:10px" onclick="mv424VolverActividad()">← Volver a Actividad en Campo</button></div></div>`);
    }
  }

  function renderLista(d){
    const gestion=esGestion();
    const sedes=[...new Set(cacheLista.map(x=>x.sede).filter(Boolean))].sort();
    const supervisores=[...new Set(cacheLista.map(x=>x.supervisor).filter(Boolean))].sort();
    const html=`<div class="mv424-wrap">
      <div class="mv424-head">
        <h2>📋 Trabajos de campo</h2>
        <p>${esSupervisor()?"Casos asignados por Jefatura para ejecución en campo.":"Planificación y seguimiento de trabajos asignados a Supervisores."}</p>
        <div class="mv424-actions">
          <button class="mv424-btn sec" onclick="mv424VolverActividad()">← Volver a Actividad en Campo</button>
          ${puedeAsignar()?`<button class="mv424-btn ok" onclick="mv424NuevaAsignacion()">+ Asignar trabajo</button>`:""}
          <button class="mv424-btn" onclick="mv424Recargar()">🔄 Actualizar</button>
        </div>
      </div>
      ${kpisHtml(d.totales)}
      <div class="mv424-card">
        <h3>Filtros</h3>
        <div class="mv424-filter">
          <div class="mv424-field"><label>Estado</label><select id="mv424FiltroEstado"><option value="">Todos</option><option>PENDIENTE</option><option>EN PROCESO</option><option>COMPLETADO</option><option>ANULADO</option></select></div>
          ${gestion?`<div class="mv424-field"><label>Sede</label><select id="mv424FiltroSede"><option value="">Todas</option>${sedes.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div><div class="mv424-field"><label>Supervisor</label><select id="mv424FiltroSupervisor"><option value="">Todos</option>${supervisores.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>`:""}
        </div>
        <button class="mv424-btn" style="margin-top:9px" onclick="mv424AplicarFiltro()">Aplicar filtros</button>
      </div>
      <div class="mv424-card"><h3>Casos</h3><div id="mv424ListaCasos">${cacheLista.length?cacheLista.map(tarjeta).join(""):`<div class="mv424-note">No hay trabajos asignados.</div>`}</div></div>
    </div>`;
    if(typeof mostrarPantalla==="function")mostrarPantalla(html);
  }

  function aplicarFiltro(){
    const est=nt(document.getElementById("mv424FiltroEstado")?.value);
    const sede=nt(document.getElementById("mv424FiltroSede")?.value);
    const sup=nt(document.getElementById("mv424FiltroSupervisor")?.value);
    const lista=cacheLista.filter(x=>(!est||nt(x.estado)===est)&&(!sede||nt(x.sede)===sede)&&(!sup||nt(x.supervisor)===sup));
    const c=document.getElementById("mv424ListaCasos");if(c)c.innerHTML=lista.length?lista.map(tarjeta).join(""):`<div class="mv424-note">No hay coincidencias.</div>`;
  }

  function tipoRequiereOrdenV427(tipo){
    const t=nt(tipo);
    return t==="AUDITORIA EN FRIO" || t==="AUDITORIA EN CALIENTE";
  }

  function guiaTipoV427(tipo){
    const t=nt(tipo);
    const guias={
      "AUDITORIA EN FRIO":"Requiere vincular una orden mediante Código o DNI. El Supervisor abrirá directamente Auditoría en Frío con los datos del cliente precargados.",
      "AUDITORIA EN CALIENTE":"Requiere vincular una orden mediante Código o DNI. El Supervisor abrirá directamente Auditoría en Caliente con los datos del cliente precargados.",
      "SEGUIMIENTO":"Puede asignarse solo a una cuadrilla. No necesita cliente ni código. El Supervisor abrirá directamente Seguimiento.",
      "VALIDACION DE OBSERVACION":"Puede asignarse por cuadrilla. El Código/DNI es opcional; si ingresa una referencia quedará asociada al caso.",
      "CAPACITACION":"Se asigna directamente a una cuadrilla. No requiere orden ni cliente. El Supervisor abrirá directamente Capacitación.",
      "CHECKLIST":"Se asigna directamente a una cuadrilla. No requiere orden ni cliente. El Supervisor abrirá el Checklist existente de Actividad en Campo."
    };
    return guias[t]||"Seleccione cuadrilla, Supervisor y detalle del trabajo.";
  }

  function tipoRecomendadoV427(alertas){
    const motivos=(alertas||[]).map(a=>nt(a.motivo));
    if(motivos.some(x=>x.includes("RECABLEADO")||x.includes("VTR")||x.includes("OBSERVACIONES")))return "AUDITORIA EN FRIO";
    return "SEGUIMIENTO";
  }

  async function cargarCatalogoAsignacionV427(){
    const d=await apiGet("catalogoAsignacionCampoV427",{});
    catalogoAsignacionV427={
      sedes:Array.isArray(d.sedes)?d.sedes:[],
      cuadrillas:Array.isArray(d.cuadrillas)?d.cuadrillas:[],
      supervisores:Array.isArray(d.supervisores)?d.supervisores:[]
    };
    refrescarSedesAsignacionV427();
    refrescarCuadrillasAsignacionV427();
    refrescarSupervisoresAsignacionV427();
  }

  function refrescarSedesAsignacionV427(valor){
    const s=document.getElementById("mv427Sede");if(!s)return;
    const actual=valor||s.value||"";
    s.innerHTML=`<option value="">Seleccione sede</option>${catalogoAsignacionV427.sedes.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}`;
    if(actual)s.value=actual;
  }

  function refrescarCuadrillasAsignacionV427(valor){
    const s=document.getElementById("mv427Sede")?.value||"";
    const q=document.getElementById("mv427Cuadrilla");if(!q)return;
    const actual=valor||q.value||"";
    const lista=catalogoAsignacionV427.cuadrillas.filter(x=>!s||nt(x.sede)===nt(s));
    q.innerHTML=`<option value="">Seleccione cuadrilla</option>${lista.map(x=>`<option value="${esc(x.cuadrilla)}">${esc(x.cuadrilla)}${x.plataforma?` · ${esc(x.plataforma)}`:""}</option>`).join("")}`;
    if(actual&&lista.some(x=>x.cuadrilla===actual))q.value=actual;
  }

  function refrescarSupervisoresAsignacionV427(valor){
    const s=document.getElementById("mv427Sede")?.value||"";
    const sup=document.getElementById("mv424Supervisor");if(!sup)return;
    const actual=valor||sup.value||"";
    const lista=catalogoAsignacionV427.supervisores.filter(x=>!s||nt(x.sede)===nt(s));
    sup.innerHTML=`<option value="">Seleccione Supervisor</option>${lista.map(x=>`<option value="${esc(x.usuario)}">${esc(x.nombresApellidos||x.usuario)} · ${esc(x.usuario)}</option>`).join("")}`;
    if(actual&&lista.some(x=>x.usuario===actual))sup.value=actual;
    else if(lista.length===1)sup.value=lista[0].usuario;
  }

  function cambioSedeAsignacionV427(){
    refrescarCuadrillasAsignacionV427();
    refrescarSupervisoresAsignacionV427();
  }

  function cambioTipoAsignacionV427(){
    const tipo=document.getElementById("mv424Tipo")?.value||"";
    const g=document.getElementById("mv427GuiaTipo");
    if(g)g.textContent=guiaTipoV427(tipo);
    const nota=document.getElementById("mv427NotaReferencia");
    if(nota)nota.innerHTML=tipoRequiereOrdenV427(tipo)
      ? `<b>Orden requerida:</b> ingrese Código o DNI y pulse Buscar antes de asignar.`
      : `<b>Orden opcional:</b> puede asignar directamente a la cuadrilla sin Código/DNI.`;
  }

  function actualizarFiltroCuadrillaAlertasV427(){
    const sede=nt(document.getElementById("mv426FiltroSedeAlertas")?.value);
    const sel=document.getElementById("mv427FiltroCuadrillaAlertas");
    if(!sel)return;
    const lista=[...new Set(alertasCuadrillasV426
      .filter(x=>!sede||nt(x.item.sede)===sede)
      .map(x=>x.item.cuadrilla).filter(Boolean))].sort();
    const actual=sel.value||"";
    sel.innerHTML=`<option value="">Todas las cuadrillas</option>${lista.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}`;
    if(actual&&lista.includes(actual))sel.value=actual;
  }

  function periodoActualV426(){
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}`;
  }

  function pctV426(v){
    const x=Number(v)||0;
    return x<=1?x*100:x;
  }

  function alertasItemV426(x){
    const a=[];
    const diario=x.mv353CumplimientoDia||{};
    const meta=Number(diario.metaAcumulada)||0;
    const prod=Number(x.produccion)||0;
    if(meta>0&&prod<meta)a.push({corto:`Producción ${prod.toFixed(1)}/${meta.toFixed(1)} pts`,motivo:"PRODUCCION POR DEBAJO DE META"});

    const ef=pctV426(x.efectividad);
    if(Number(x.detEfectividad?.total)>0&&ef<70)a.push({corto:`Efectividad ${ef.toFixed(1)}%`,motivo:"EFECTIVIDAD POR DEBAJO DE META"});

    const rec=pctV426(x.recableado);
    if(Number(x.detRecableado?.los)>0&&rec>42)a.push({corto:`Recableado ${rec.toFixed(1)}%`,motivo:"RECABLEADO / CALIDAD TECNICA"});

    const vg=pctV426(x.vtrgar);
    if(Number(x.detVtrGar?.finalizadas)>0&&vg>3)a.push({corto:`VTR/GAR ${vg.toFixed(1)}%`,motivo:"VTR / GAR"});

    const sla=pctV426(x.slaAjustado??x.sla);
    if(Number(x.detSla?.evaluables)>0&&sla<95)a.push({corto:`SLA ${sla.toFixed(1)}%`,motivo:"TIEMPO DE GESTION SLA"});

    const obs=Number(x.observaciones)||0;
    if(obs>0)a.push({corto:`Observaciones ${obs}`,motivo:"OBSERVACIONES / REINCIDENCIA"});

    return a;
  }

  function recomendacionV426(item,alertas){
    const motivos=[...new Set((alertas||[]).map(a=>a.motivo))];
    if(!motivos.length)return "";
    return `Revisar ${item.cuadrilla}: ${motivos.join(" · ")}. Validar orden, acta y condiciones encontradas en campo.`;
  }

  function renderAlertasCuadrillasV426(){
    const cont=document.getElementById("mv426AlertasCuadrillas");
    if(!cont)return;
    const sede=nt(document.getElementById("mv426FiltroSedeAlertas")?.value);
    const cuadrilla=nt(document.getElementById("mv427FiltroCuadrillaAlertas")?.value);
    const lista=alertasCuadrillasV426
      .filter(x=>(!sede||nt(x.item.sede)===sede)&&(!cuadrilla||nt(x.item.cuadrilla)===cuadrilla))
      .slice(0,18);

    if(!lista.length){
      cont.innerHTML=`<div class="mv424-note mv424-ok">No se detectan cuadrillas fuera de los indicadores evaluados para el filtro seleccionado.</div>`;
      return;
    }

    cont.innerHTML=`<div class="mv426-alert-grid">${lista.map(x=>{
      const q=x.item;
      const reco=recomendacionV426(q,x.alertas);
      const tipo=tipoRecomendadoV427(x.alertas);
      return `<div class="mv426-alert-card">
        <strong>${esc(q.cuadrilla||"")}</strong>
        <small>${esc(q.sede||"")} · ${esc(q.plataforma||"")}</small>
        <div class="mv426-alert-chips">${x.alertas.map(a=>`<span class="mv426-alert-chip">${esc(a.corto)}</span>`).join("")}</div>
        <div class="mv426-reco"><b>Recomendación:</b> ${esc(reco)}<br><b>Actividad sugerida:</b> ${esc(tipo)}</div>
        <div class="mv424-actions">
          <button class="mv424-btn sec" onclick="mv426IrMapaCuadrilla('${esc(q.cuadrilla||"")}','${esc(q.sede||"")}')">🗺️ Ver órdenes en mapa</button>
          <button class="mv424-btn" onclick="mv427UsarRecomendacion('${encodeURIComponent(reco)}','${esc(q.cuadrilla||"")}','${esc(q.sede||"")}','${esc(tipo)}')">✍️ Usar recomendación</button>
        </div>
      </div>`;
    }).join("")}</div>`;
  }

  async function cargarAlertasCuadrillasV426(){
    const cont=document.getElementById("mv426AlertasCuadrillas");
    if(!cont)return;
    cont.innerHTML=`<div class="mv424-note">Consultando indicadores del período actual...</div>`;
    try{
      alertasPeriodoV426=periodoActualV426();
      const d=await apiGet("obtenerResumenDashboardRanking",{periodo:alertasPeriodoV426});
      alertasCuadrillasV426=(d.lista||[])
        .map(item=>({item,alertas:alertasItemV426(item)}))
        .filter(x=>x.alertas.length)
        .sort((a,b)=>b.alertas.length-a.alertas.length);

      const sedes=[...new Set(alertasCuadrillasV426.map(x=>nt(x.item.sede)).filter(Boolean))].sort();
      const sel=document.getElementById("mv426FiltroSedeAlertas");
      if(sel){
        sel.innerHTML=`<option value="">Todas las sedes</option>${sedes.map(s=>`<option>${esc(s)}</option>`).join("")}`;
      }
      actualizarFiltroCuadrillaAlertasV427();
      renderAlertasCuadrillasV426();
    }catch(e){
      cont.innerHTML=`<div class="mv424-note mv424-warn">Alertas de cuadrillas no disponibles temporalmente: ${esc(e.message)}</div>`;
    }
  }

  function usarRecomendacionV427(valorCodificado,cuadrilla,sede,tipoActividad){
    let txt="";
    try{txt=decodeURIComponent(valorCodificado||"");}catch(_){txt=valorCodificado||"";}
    motivoSugeridoV426=txt;

    const sed=document.getElementById("mv427Sede");
    if(sed&&sede){sed.value=sede;cambioSedeAsignacionV427();}
    const cuad=document.getElementById("mv427Cuadrilla");
    if(cuad&&cuadrilla)cuad.value=cuadrilla;
    const tipo=document.getElementById("mv424Tipo");
    if(tipo&&tipoActividad){tipo.value=tipoActividad;cambioTipoAsignacionV427();}
    const campo=document.getElementById("mv424Motivo");
    if(campo)campo.value=txt;

    const aviso=document.getElementById("mv426MotivoSeleccionado");
    if(aviso){
      aviso.style.display="";
      aviso.innerHTML=`<b>Recomendación aplicada:</b> ${esc(cuadrilla||"")} · ${esc(tipoActividad||"")}<br>${esc(txt)}`;
    }

    document.getElementById("mv427Trabajo")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function irMapaCuadrillaV426(cuadrilla,sede){
    try{
      if(typeof window.mv339CargarModulo==="function")await window.mv339CargarModulo("mapa");
      if(typeof window.mostrarMapaOperativo!=="function")throw new Error("Mapa Operativo no disponible.");
      await window.mostrarMapaOperativo();
      setTimeout(async()=>{
        try{
          const periodo=document.getElementById("moFiltroPeriodo");
          if(periodo)periodo.value=periodoActualV426();
          const sedeSel=document.getElementById("moFiltroSede");
          if(sedeSel&&sede)sedeSel.value=sede;
          if(typeof MO_MULTI_FILTROS_V418!=="undefined"){
            MO_MULTI_FILTROS_V418.cuadrilla=[cuadrilla];
            if(typeof moMultiRefrescarV418==="function")moMultiRefrescarV418("cuadrilla");
          }
          if(typeof moActualizarRangoFecha==="function")moActualizarRangoFecha();
          if(typeof moConsultarMapa==="function")await moConsultarMapa();
        }catch(e){console.warn("V426 filtro mapa",e);}
      },100);
    }catch(e){
      alert("No se pudo abrir el mapa: "+(e?.message||e));
    }
  }

  async function irMapaGeneralV426(){
    try{
      if(typeof window.mv339CargarModulo==="function")await window.mv339CargarModulo("mapa");
      if(typeof window.mostrarMapaOperativo==="function")return window.mostrarMapaOperativo();
      throw new Error("Mapa Operativo no disponible.");
    }catch(e){alert("No se pudo abrir el mapa: "+(e?.message||e));}
  }

  async function nuevaAsignacion(prefill){
    if(!puedeAsignar())return;
    fichaPreparada=null;
    prefillAsignacionV426=prefill&&typeof prefill==="object"?prefill:null;
    motivoSugeridoV426=prefillAsignacionV426?.motivo||"";
    catalogoAsignacionV427={sedes:[],cuadrillas:[],supervisores:[]};
    instalarEstilos();

    if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap">
      <div class="mv424-head"><h2>➕ Asignar trabajo de campo</h2><p>Puede asignar una actividad directamente a una cuadrilla o vincularla a una orden/cliente mediante Código o DNI.</p><div class="mv424-actions"><button class="mv424-btn sec" onclick="mv424MostrarTrabajos()">← Volver</button><button class="mv424-btn" onclick="mv426IrMapaGeneral()">🗺️ Ir al mapa operativo</button></div></div>

      <div class="mv424-card">
        <h3>⚠️ Alertas de cuadrillas para orientar el trabajo</h3>
        <div class="mv424-note">Se muestran desviaciones del período actual en Producción, Efectividad, Recableado, VTR/GAR, SLA y Observaciones. Puede filtrar por sede y cuadrilla.</div>
        <div class="mv427-inline" style="margin-top:9px">
          <div class="mv424-field"><label>Sede</label><select id="mv426FiltroSedeAlertas" onchange="actualizarFiltroCuadrillaAlertasV427();mv426RenderAlertas()"><option value="">Todas las sedes</option></select></div>
          <div class="mv424-field"><label>Cuadrilla</label><select id="mv427FiltroCuadrillaAlertas" onchange="mv426RenderAlertas()"><option value="">Todas las cuadrillas</option></select></div>
        </div>
        <div id="mv426AlertasCuadrillas" style="margin-top:10px"><div class="mv424-note">Cargando alertas...</div></div>
      </div>

      <div class="mv424-card" id="mv427Trabajo">
        <h3>📋 Definir trabajo para el Supervisor</h3>
        <div class="mv424-filter">
          <div class="mv424-field"><label>Sede</label><select id="mv427Sede" onchange="cambioSedeAsignacionV427()"><option value="">Cargando...</option></select></div>
          <div class="mv424-field"><label>Cuadrilla</label><select id="mv427Cuadrilla"><option value="">Cargando...</option></select></div>
          <div class="mv424-field"><label>Supervisor</label><select id="mv424Supervisor"><option value="">Seleccione Supervisor</option></select></div>
          <div class="mv424-field"><label>Tipo de actividad</label><select id="mv424Tipo" onchange="cambioTipoAsignacionV427()">${TIPOS.map(x=>`<option>${x}</option>`).join("")}</select></div>
          <div class="mv424-field"><label>Prioridad</label><select id="mv424Prioridad"><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></div>
          <div class="mv424-field"><label>Fecha límite</label><input type="date" id="mv424FechaLimite"></div>
          <div class="mv424-field mv424-wide"><label>Motivo / indicación para el Supervisor</label><textarea id="mv424Motivo" placeholder="Ejemplo: Realizar seguimiento hoy a la cuadrilla por baja efectividad.">${esc(motivoSugeridoV426)}</textarea></div>
          <div class="mv424-field mv424-wide"><label>Observación adicional de Jefatura / Gerencia</label><textarea id="mv424Observacion" placeholder="Opcional"></textarea></div>
        </div>
        <div id="mv427GuiaTipo" class="mv427-guia">${esc(guiaTipoV427(prefillAsignacionV426?.tipoActividad||"AUDITORIA EN FRIO"))}</div>
        <div id="mv426MotivoSeleccionado" class="mv426-selected" style="${motivoSugeridoV426?'':'display:none'}">${motivoSugeridoV426?`<b>Motivo precargado:</b> ${esc(motivoSugeridoV426)}`:""}</div>
      </div>

      <div class="mv424-card">
        <h3>🔎 Vincular orden / cliente <small style="font-weight:500;color:#64748b">(cuando aplique)</small></h3>
        <div id="mv427NotaReferencia" class="mv424-note"><b>Orden requerida:</b> ingrese Código o DNI y pulse Buscar antes de asignar.</div>
        <div class="mv424-field" style="margin-top:9px"><label>Código o DNI</label><input id="mv424Codigo" placeholder="Código de orden/pedido o DNI del cliente"></div>
        <div class="mv424-actions">
          <button class="mv424-btn" onclick="mv424PrepararCodigo()">🔎 Buscar cliente / orden</button>
          <button class="mv424-btn sec" onclick="mv427LimpiarReferencia()">Sin orden / solo cuadrilla</button>
        </div>
        <div id="mv424ResultadoCodigo" style="margin-top:10px"><div class="mv427-ref">Si la actividad es Seguimiento, Capacitación, Checklist o una gestión solo de cuadrilla, puede dejar este campo vacío.</div></div>
      </div>

      <div class="mv424-card">
        <button class="mv424-btn ok" onclick="mv424CrearAsignacion(this)">✅ Asignar trabajo al Supervisor</button>
        <div id="mv424MsgCrear" style="margin-top:9px"></div>
      </div>
    </div>`);

    try{
      await cargarCatalogoAsignacionV427();
      cambioTipoAsignacionV427();
      cargarAlertasCuadrillasV426();

      if(prefillAsignacionV426?.tipoActividad){
        const t=document.getElementById("mv424Tipo");if(t){t.value=prefillAsignacionV426.tipoActividad;cambioTipoAsignacionV427();}
      }

      if(prefillAsignacionV426?.codigo){
        const c=document.getElementById("mv424Codigo");
        if(c)c.value=prefillAsignacionV426.codigo;
        await prepararCodigo(prefillAsignacionV426);
      }
    }catch(e){
      const msg=document.getElementById("mv424MsgCrear");
      if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">No se pudo cargar el catálogo de asignación: ${esc(e.message)}</div>`;
    }
  }

  async function prepararCodigo(prefill){
    const codigo=n(document.getElementById("mv424Codigo")?.value);
    const r=document.getElementById("mv424ResultadoCodigo");
    if(!codigo){if(r)r.innerHTML=`<div class="mv424-note mv424-warn">Ingrese Código o DNI para buscar.</div>`;return;}
    if(r)r.innerHTML=`<div class="mv424-note">Consultando cliente / orden...</div>`;
    try{
      const d=await apiGet("prepararAsignacionCampoV424",{codigo});
      fichaPreparada=d;
      const o=d.orden||{};

      const sede=nt(o.region||"");
      const cuadrilla=n(o.cuadrilla||"");
      const sedeSel=document.getElementById("mv427Sede");
      if(sedeSel&&sede){sedeSel.value=sede;cambioSedeAsignacionV427();}
      const cuadSel=document.getElementById("mv427Cuadrilla");
      if(cuadSel&&cuadrilla)cuadSel.value=cuadrilla;

      if(r)r.innerHTML=`<div class="mv427-ref mv427-ref-ok"><b>✓ Orden / cliente encontrado</b><div class="mv424-grid" style="margin-top:8px">
        ${dato("Código de orden",o.ordenId)}${dato("Código cliente / pedido",o.codigoPedido||o.codigoCliente)}${dato("Cliente",o.cliente)}${dato("DNI",o.numeroDocumento)}
        ${dato("Sede",o.region)}${dato("Cuadrilla",o.cuadrilla)}${dato("Fecha",o.fechaSolicitud)}${dato("Dirección",o.direccion)}
      </div></div>`;

      const usar=prefill&&typeof prefill==="object"?prefill:prefillAsignacionV426;
      const motivo=document.getElementById("mv424Motivo");
      if(motivo&&!motivo.value&&(usar?.motivo||motivoSugeridoV426))motivo.value=usar?.motivo||motivoSugeridoV426;
    }catch(e){
      fichaPreparada=null;
      if(r)r.innerHTML=`<div class="mv424-note mv424-warn">❌ ${esc(e.message)}<br>Para Seguimiento, Capacitación, Checklist o gestión directa de cuadrilla puede continuar sin vincular una orden.</div>`;
    }
  }

  async function crearAsignacion(btn){
    const codigo=n(document.getElementById("mv424Codigo")?.value);
    const sede=n(document.getElementById("mv427Sede")?.value);
    const cuadrilla=n(document.getElementById("mv427Cuadrilla")?.value);
    const supervisor=n(document.getElementById("mv424Supervisor")?.value);
    const tipo=n(document.getElementById("mv424Tipo")?.value);
    const prioridad=n(document.getElementById("mv424Prioridad")?.value);
    const fechaLimite=n(document.getElementById("mv424FechaLimite")?.value);
    const motivo=n(document.getElementById("mv424Motivo")?.value);
    const observacion=n(document.getElementById("mv424Observacion")?.value);
    const msg=document.getElementById("mv424MsgCrear");

    if(!sede||!cuadrilla){if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">Seleccione Sede y Cuadrilla.</div>`;return;}
    if(!supervisor){if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">Seleccione el Supervisor responsable.</div>`;return;}
    if(!motivo){if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">Ingrese el motivo o indicación del trabajo.</div>`;return;}
    if(tipoRequiereOrdenV427(tipo)&&!fichaPreparada?.orden?.ordenId){
      if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">Para ${esc(tipo)} debe vincular una orden mediante Código o DNI y pulsar Buscar.</div>`;
      return;
    }

    if(btn){btn.disabled=true;btn.textContent="Asignando...";}
    try{
      const d=await apiPost({
        accion:"crearAsignacionCampoV424",
        codigo,
        sede,
        cuadrilla,
        supervisor,
        tipoActividad:tipo,
        motivo,
        prioridad,
        fechaLimite,
        observacionJefatura:observacion
      });
      if(msg)msg.innerHTML=`<div class="mv424-note mv424-ok">✅ Trabajo asignado correctamente. ID: ${esc(d.id)}<br>${d.codigoOrden?`Orden vinculada: ${esc(d.codigoOrden)}`:`Asignación directa a ${esc(cuadrilla)}`}</div>`;
      setTimeout(mostrarTrabajos,900);
    }catch(e){
      if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">❌ ${esc(e.message)}</div>`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="✅ Asignar trabajo al Supervisor";}
    }
  }

  async function abrirAsignacion(id){
    const a=cachePorId[id];
    if(!a){alert("No se encontró la asignación.");return;}
    instalarEstilos();
    if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap"><div class="mv424-head"><h2>📋 ${esc(a.tipoActividad||"Trabajo de campo")}</h2><p>Cargando detalle...</p></div></div>`);
    try{
      if(a.codigoOrden){
        const f=await apiGet("obtenerFichaAuditoriaMapaV421",{ordenId:a.codigoOrden});
        return renderDetalle(a,f);
      }
      return renderDetalle(a,{orden:{region:a.sede,cuadrilla:a.cuadrilla},acta:null});
    }catch(e){
      if(a.codigoOrden){
        return renderDetalle(a,{orden:{region:a.sede,cuadrilla:a.cuadrilla,ordenId:a.codigoOrden},acta:null,errorFicha:e.message});
      }
      if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap"><div class="mv424-card"><h3>❌ No se pudo abrir</h3><div class="mv424-note mv424-warn">${esc(e.message)}</div><button class="mv424-btn sec" style="margin-top:9px" onclick="mv424MostrarTrabajos()">← Volver</button></div></div>`);
    }
  }

  function renderDetalle(a,f){
    const o=f?.orden||{},acta=f?.acta||null;
    const tieneOrden=!!n(a.codigoOrden||o.ordenId);
    const lat=Number(o.latitud),lng=Number(o.longitud);
    const maps=tieneOrden&&Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+","+lng)}`:"";
    const estado=nt(a.estado);
    const puedeIniciar=esSupervisor()&&(estado==="PENDIENTE"||estado==="EN PROCESO");
    const puedeAnular=puedeAsignar()&&(estado==="PENDIENTE"||estado==="EN PROCESO");
    const servicio=[o.tipoTrabajo,o.tipo,o.productoServicio||o.productoOrigen].filter(Boolean).join(" · ");
    const tituloRef=tieneOrden?(a.codigoOrden||o.ordenId):a.cuadrilla;

    const html=`<div class="mv424-wrap">
      <div class="mv424-head">
        <h2>📋 ${esc(a.tipoActividad)} · ${esc(tituloRef||"Trabajo de campo")}</h2>
        <p>${esc(a.sede)} · ${esc(a.cuadrilla)} · Supervisor ${esc(a.supervisor)}</p>
        <div class="mv424-actions">
          <button class="mv424-btn sec" onclick="mv424MostrarTrabajos()">← Volver</button>
          <button class="mv424-btn" onclick="mv424VerEnMapa('${esc(a.id)}')">${tieneOrden?"🗺️ Ver orden en mapa":"🗺️ Ver órdenes de cuadrilla"}</button>
          ${maps?`<a class="mv424-btn sec" href="${maps}" target="_blank" rel="noopener noreferrer">📍 Ir al cliente</a>`:""}
        </div>
      </div>

      <div class="mv424-card"><h3>Asignación de Jefatura / Gerencia</h3>
        <div class="mv424-badges"><span class="mv424-badge ${estadoClase(a.estado)}">${esc(a.estado)}</span><span class="mv424-badge ${prioClase(a.prioridad)}">${esc(a.prioridad)}</span>${a.fechaLimite?`<span class="mv424-badge">Límite ${esc(a.fechaLimite)}</span>`:""}</div>
        <div class="mv424-note" style="margin-top:10px"><b>Qué debe realizar:</b> ${esc(a.motivo)}</div>
        <div class="mv427-guia">${esc(guiaTipoV427(a.tipoActividad))}</div>
        ${a.observacionJefatura?`<div class="mv424-note" style="margin-top:7px"><b>Indicación adicional:</b> ${esc(a.observacionJefatura)}</div>`:""}
      </div>

      ${tieneOrden?`<div class="mv424-card"><h3>Cliente y orden vinculada</h3><div class="mv424-grid">
        ${dato("Fecha",o.fechaSolicitud)}${dato("Tramo",o.horaSolicitud)}${dato("Código de orden",o.ordenId||a.codigoOrden)}${dato("Código cliente / pedido",o.codigoPedido||o.codigoCliente||a.codigoPedido)}
        ${dato("Cliente",o.cliente||a.cliente)}${dato("DNI",o.numeroDocumento||a.dni)}${dato("Teléfono",o.telefonoMovil)}${dato("Dirección",o.direccion)}${dato("Cuadrilla",o.cuadrilla||a.cuadrilla)}${dato("Estado",o.estado)}${dato("Servicio",servicio)}
      </div>${f?.errorFicha?`<div class="mv424-note mv424-warn" style="margin-top:9px">Parte del detalle de la orden no estuvo disponible: ${esc(f.errorFicha)}</div>`:""}</div>
      <div class="mv424-card"><h3>📄 Acta</h3>${acta?.linkActa?`<div class="mv424-note mv424-ok">Acta disponible · ${esc(acta.estadoVisibleTecnico||acta.estado||"")}<br><a class="mv424-btn ok" style="margin-top:8px" href="${esc(acta.linkActa)}" target="_blank" rel="noopener noreferrer">📄 Ver acta</a></div>`:`<div class="mv424-note mv424-warn">Acta aún no cargada o no disponible para esta orden.</div>`}</div>`
      :`<div class="mv424-card"><h3>Trabajo directo a cuadrilla</h3><div class="mv424-note mv424-ok">Este trabajo no necesita una orden ni datos de cliente. El Supervisor ingresará directamente a <b>${esc(a.tipoActividad)}</b> de Actividad en Campo para registrar el resultado.</div></div>`}

      <div class="mv424-card"><h3>Ejecutar y registrar</h3>
        ${puedeIniciar?`<div class="mv424-note mv424-ok">Al iniciar se abrirá directamente <b>Actividad en Campo → ${esc(a.tipoActividad)}</b>${tieneOrden?" con la orden y cuadrilla preparadas":" con la cuadrilla preparada"}.</div><button class="mv424-btn ok" style="margin-top:9px" onclick="mv424IniciarAsignacion('${esc(a.id)}',this)">▶ ${estado==="EN PROCESO"?"Continuar":"Iniciar"} y registrar actividad</button>`:""}
        ${estado==="COMPLETADO"?`<div class="mv424-note mv424-ok">✅ Trabajo completado${a.idActividadCampo?` · Actividad ${esc(a.idActividadCampo)}`:""}.</div>`:""}
        ${estado==="ANULADO"?`<div class="mv424-note">Asignación anulada.</div>`:""}
        ${puedeAnular?`<button class="mv424-btn danger" style="margin-top:9px" onclick="mv424AnularAsignacion('${esc(a.id)}')">Anular asignación</button>`:""}
      </div>
    </div>`;
    if(typeof mostrarPantalla==="function")mostrarPantalla(html);
    a._ficha=f;
  }

  function instalarIntegracionActividad(){
    if(integracionActividad)return;
    if(typeof window.mostrarFormularioActividadCampo!=="function")throw new Error("Actividad en Campo no terminó de cargar.");

    if(typeof window.construirAuditoriaCampo==="function"){
      construirAuditoriaAnterior=window.construirAuditoriaCampo;
      window.construirAuditoriaCampo=function(tipo){
        const r=construirAuditoriaAnterior.apply(this,arguments);
        const a=window.MV424_ASIGNACION_CAMPO_ACTIVA;
        if(a){
          r.codigoOrden=a.codigoOrden||"";
          r.codigoCliente=a.codigoPedido||"";
          r.codigoPedido=a.codigoPedido||r.codigoPedido||"";
          r.motivoSeleccion=[a.motivo||"ASIGNACION JEFATURA"];
          r.origenAuditoria="ASIGNACION_JEFATURA";
          r.asignacionCampoId=a.id||"";
        }
        return r;
      };
      try{construirAuditoriaCampo=window.construirAuditoriaCampo;}catch(_){}
    }

    mostrarActividadAnterior=window.mostrarActividadCampo;
    window.mostrarActividadCampo=function(){
      const a=window.MV424_ASIGNACION_CAMPO_ACTIVA;
      if(a&&a.retornoAsignaciones){
        window.MV424_ASIGNACION_CAMPO_ACTIVA=null;
        return mostrarTrabajos();
      }
      return mostrarActividadAnterior.apply(this,arguments);
    };
    try{mostrarActividadCampo=window.mostrarActividadCampo;}catch(_){}
    integracionActividad=true;
  }

  function hoyISO(){
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}-${p.find(x=>x.type==="day")?.value}`;
  }

  async function iniciarAsignacion(id,btn){
    const a=cachePorId[id];if(!a)return;
    if(!esSupervisor()){alert("La ejecución está habilitada para Supervisores.");return;}
    if(btn){btn.disabled=true;btn.textContent="Preparando...";}
    try{
      await apiPost({accion:"iniciarAsignacionCampoV424",id});
      if(typeof window.mv339CargarModulo==="function")await window.mv339CargarModulo("actividad");
      instalarIntegracionActividad();

      window.MV424_ASIGNACION_CAMPO_ACTIVA=Object.assign({},a,{retornoAsignaciones:true});
      await window.mostrarFormularioActividadCampo();

      const sel=document.getElementById("actCuadrilla");
      if(sel){sel.value=a.cuadrilla||"";sel.dispatchEvent(new Event("change"));}

      const tipo=document.getElementById("actTipoActividad");
      if(tipo){
        tipo.value=a.tipoActividad||"SEGUIMIENTO";
        if(typeof window.renderFormularioTipoActividad==="function")window.renderFormularioTipoActividad();
      }

      const wrap=document.querySelector(".act-wrap");
      const head=wrap?.querySelector(".act-head");
      if(head&&!document.getElementById("mv424NotaAsignacion")){
        const d=document.createElement("div");d.id="mv424NotaAsignacion";d.className="act-note";
        const ref=a.codigoOrden?`<br><b>Orden:</b> ${esc(a.codigoOrden)}${a.cliente?` · ${esc(a.cliente)}`:""}`:"";
        d.innerHTML=`📋 <b>Trabajo asignado por Jefatura / Gerencia</b>${ref}<br><b>Cuadrilla:</b> ${esc(a.cuadrilla||"")}<br><b>Qué debe realizar:</b> ${esc(a.motivo||"")}${a.observacionJefatura?`<br><b>Indicación adicional:</b> ${esc(a.observacionJefatura)}`:""}`;
        head.insertAdjacentElement("afterend",d);
      }

      const t=nt(a.tipoActividad);

      if(t==="AUDITORIA EN FRIO"||t==="AUDITORIA EN CALIENTE"){
        const c=document.getElementById("audCodigoPedido");
        if(c){c.value=a.codigoOrden||a.codigoPedido||a.codigoIngresado||"";const l=c.closest(".act-field")?.querySelector("label");if(l)l.textContent="Código de orden";}
        if(typeof window.buscarDatosAuditoriaCampo==="function")await window.buscarDatosAuditoriaCampo();
      }

      if(t==="VALIDACION DE OBSERVACION"){
        const c=document.getElementById("valCodigo");if(c)c.value=a.codigoIngresado||a.codigoOrden||a.codigoPedido||"";
        const txt=document.getElementById("valTipo");if(txt)txt.value=a.motivo||"";
      }

      if(t==="SEGUIMIENTO"){
        const s=document.getElementById("segMotivo");
        if(s){
          const motivo=nt(a.motivo);
          const opciones=Array.from(s.options).map(o=>o.value);
          let encontrada=opciones.find(x=>motivo.includes(nt(x)));
          if(!encontrada){
            if(motivo.includes("PRODUCCION"))encontrada="BAJA PRODUCCION";
            else if(motivo.includes("EFECTIVIDAD"))encontrada="BAJA EFECTIVIDAD";
            else if(motivo.includes("RECABLEADO"))encontrada="ALTO RECABLEADO";
            else if(motivo.includes("VTR")||motivo.includes("GAR"))encontrada="ALTO VTR/GAR";
            else if(motivo.includes("OBSERV"))encontrada="OBSERVACIONES RECURRENTES";
          }
          s.value=encontrada||"OTRO";
        }
        const f=document.getElementById("segFechaSeguimiento");if(f&&!f.value)f.value=hoyISO();
      }

      if(t==="CAPACITACION"){
        const c=document.getElementById("actConclusion");
        if(c&&!c.value)c.value=`Actividad asignada: ${a.motivo||""}`;
      }

      if(t==="CHECKLIST"){
        const c=document.getElementById("actConclusion");
        if(c&&!c.value)c.value=`Checklist asignado: ${a.motivo||""}`;
      }
    }catch(e){
      alert("No se pudo iniciar la actividad: "+(e?.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent="▶ Iniciar / continuar actividad";}
    }
  }

  async function anularAsignacion(id){
    if(!puedeAsignar())return;
    if(!confirm("¿Anular esta asignación?"))return;
    try{await apiPost({accion:"anularAsignacionCampoV424",id});await mostrarTrabajos();}
    catch(e){alert(e.message);}
  }

  async function verEnMapa(id){
    const a=cachePorId[id];if(!a)return;
    try{
      if(typeof window.mv339CargarModulo==="function")await window.mv339CargarModulo("mapa");
      if(typeof window.mostrarMapaOperativo!=="function")throw new Error("Mapa Operativo no está disponible.");
      await window.mostrarMapaOperativo();

      setTimeout(async function(){
        try{
          const periodo=document.getElementById("moFiltroPeriodo");
          if(periodo)periodo.value=periodoActualV426();

          if(a.codigoOrden){
            const codigo=document.getElementById("moBuscarCodigo");
            if(codigo)codigo.value=a.codigoOrden;
          }else if(typeof MO_MULTI_FILTROS_V418!=="undefined"){
            MO_MULTI_FILTROS_V418.cuadrilla=[a.cuadrilla||""].filter(Boolean);
            if(typeof moMultiRefrescarV418==="function")moMultiRefrescarV418("cuadrilla");
          }

          if(typeof moActualizarRangoFecha==="function")moActualizarRangoFecha();
          if(typeof moConsultarMapa==="function")await moConsultarMapa();
        }catch(e){console.warn("V427 mapa caso",e);}
      },100);
    }catch(e){
      alert("No se pudo abrir el caso en el mapa: "+(e?.message||e));
    }
  }

  function volverActividad(){
    window.MV424_ASIGNACION_CAMPO_ACTIVA=null;
    if(typeof window.mostrarActividadCampo==="function") return window.mostrarActividadCampo();
    if(typeof mostrarActividadCampo==="function") return mostrarActividadCampo();
  }

  function limpiarReferenciaV427(){
    fichaPreparada=null;
    const c=document.getElementById("mv424Codigo");if(c)c.value="";
    const r=document.getElementById("mv424ResultadoCodigo");
    if(r)r.innerHTML=`<div class="mv427-ref">Asignación configurada sin orden. Se utilizará la Sede y Cuadrilla seleccionadas.</div>`;
  }

  function nuevaAsignacionDesdeOrdenV426(codigo,motivo,tipoActividad){
    return nuevaAsignacion({
      codigo:n(codigo),
      motivo:n(motivo)||"AUDITORIA SOLICITADA DESDE MAPA OPERATIVO",
      tipoActividad:n(tipoActividad)||"AUDITORIA EN FRIO"
    });
  }

  window.mv424MostrarTrabajos=mostrarTrabajos;
  window.mv424Recargar=mostrarTrabajos;
  window.mv424AplicarFiltro=aplicarFiltro;
  window.mv424NuevaAsignacion=nuevaAsignacion;
  window.mv424NuevaAsignacionDesdeOrden=nuevaAsignacionDesdeOrdenV426;
  window.mv424PuedeAsignar=puedeAsignar;
  window.mv426RenderAlertas=renderAlertasCuadrillasV426;
  window.mv427UsarRecomendacion=usarRecomendacionV427;
  window.mv426IrMapaCuadrilla=irMapaCuadrillaV426;
  window.mv426IrMapaGeneral=irMapaGeneralV426;
  window.actualizarFiltroCuadrillaAlertasV427=actualizarFiltroCuadrillaAlertasV427;
  window.cambioSedeAsignacionV427=cambioSedeAsignacionV427;
  window.cambioTipoAsignacionV427=cambioTipoAsignacionV427;
  window.mv427LimpiarReferencia=limpiarReferenciaV427;
  window.mv424PrepararCodigo=prepararCodigo;
  window.mv424CrearAsignacion=crearAsignacion;
  window.mv424AbrirAsignacion=abrirAsignacion;
  window.mv424IniciarAsignacion=iniciarAsignacion;
  window.mv424AnularAsignacion=anularAsignacion;
  window.mv424VerEnMapa=verEnMapa;
  window.mv424VolverActividad=volverActividad;
  window.MV424_ASIGNACIONES_CAMPO_OK=true;
})();