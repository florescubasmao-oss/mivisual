/* ============================================================
   MI VISUAL V425 - Trabajos asignados dentro de Actividad en Campo
   CAPA INCREMENTAL:
   - Entrada principal desde Actividad en Campo; Mapa solo como apoyo.
   - Jefatura asigna casos por código.
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

  function n(v){return String(v ?? "").trim();}
  function nt(v){return n(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");}
  function esc(v){return n(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function perfil(){return nt(localStorage.getItem("perfil")||"");}
  function usuario(){return localStorage.getItem("usuario")||"";}
  function esSupervisor(){return perfil()==="SUPERVISOR";}
  function puedeAsignar(){
    return ["JEFATURA","ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES","JEFATURA DE OPERACIONES","OPERACIONES"].includes(perfil());
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
      @media(max-width:700px){.mv424-filter,.mv424-grid,.mv424-kpis{grid-template-columns:1fr}.mv424-wrap{padding:10px 8px 80px}.mv424-item-top{flex-direction:column}}
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

  async function nuevaAsignacion(){
    if(!puedeAsignar())return;
    fichaPreparada=null;
    instalarEstilos();
    if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap">
      <div class="mv424-head"><h2>➕ Asignar trabajo de campo</h2><p>Primero busque la orden. MI VISUAL completará cliente, cuadrilla, sede y ubicación desde la información ya existente.</p><div class="mv424-actions"><button class="mv424-btn sec" onclick="mv424MostrarTrabajos()">← Volver</button></div></div>
      <div class="mv424-card">
        <div class="mv424-field"><label>Código de orden / pedido / cliente / DNI</label><input id="mv424Codigo" placeholder="Ingrese cualquiera de estos datos"></div>
        <button class="mv424-btn" style="margin-top:9px" onclick="mv424PrepararCodigo()">🔎 Buscar</button>
        <div id="mv424ResultadoCodigo" style="margin-top:10px"></div>
      </div>
      <div id="mv424FormularioAsignacion"></div>
    </div>`);
  }

  async function prepararCodigo(){
    const codigo=n(document.getElementById("mv424Codigo")?.value);
    const r=document.getElementById("mv424ResultadoCodigo");
    const f=document.getElementById("mv424FormularioAsignacion");
    if(!codigo){if(r)r.innerHTML=`<div class="mv424-note mv424-warn">Ingrese un código para buscar.</div>`;return;}
    if(r)r.innerHTML=`<div class="mv424-note">Consultando orden...</div>`;if(f)f.innerHTML="";
    try{
      const d=await apiGet("prepararAsignacionCampoV424",{codigo});
      fichaPreparada=d;
      const o=d.orden||{};
      if(r)r.innerHTML=`<div class="mv424-note mv424-ok">✓ Orden encontrada: <b>${esc(o.ordenId||"")}</b> · ${esc(o.cliente||"")}</div>`;
      if(f)f.innerHTML=`<div class="mv424-card"><h3>Datos encontrados</h3><div class="mv424-grid">
        ${dato("Código de orden",o.ordenId)}${dato("Código cliente / pedido",o.codigoPedido||o.codigoCliente)}${dato("Cliente",o.cliente)}${dato("DNI",o.numeroDocumento)}
        ${dato("Sede",o.region)}${dato("Cuadrilla",o.cuadrilla)}${dato("Fecha",o.fechaSolicitud)}${dato("Dirección",o.direccion)}
      </div></div>
      <div class="mv424-card"><h3>Asignación</h3><div class="mv424-filter">
        <div class="mv424-field"><label>Supervisor</label><select id="mv424Supervisor"><option value="">Seleccione</option>${(d.supervisores||[]).map(s=>`<option value="${esc(s.usuario)}">${esc(s.nombresApellidos||s.usuario)} · ${esc(s.usuario)}</option>`).join("")}</select></div>
        <div class="mv424-field"><label>Tipo de actividad</label><select id="mv424Tipo">${TIPOS.map(x=>`<option>${x}</option>`).join("")}</select></div>
        <div class="mv424-field"><label>Prioridad</label><select id="mv424Prioridad"><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></div>
        <div class="mv424-field"><label>Fecha límite</label><input type="date" id="mv424FechaLimite"></div>
        <div class="mv424-field mv424-wide"><label>Motivo de la actividad</label><textarea id="mv424Motivo" placeholder="Ejemplo: Validar consumo elevado de materiales y contraste con acta."></textarea></div>
        <div class="mv424-field mv424-wide"><label>Observación adicional de Jefatura</label><textarea id="mv424Observacion" placeholder="Opcional"></textarea></div>
      </div>
      <button class="mv424-btn ok" style="margin-top:10px" onclick="mv424CrearAsignacion(this)">✅ Asignar al Supervisor</button><div id="mv424MsgCrear" style="margin-top:9px"></div></div>`;
    }catch(e){
      fichaPreparada=null;if(r)r.innerHTML=`<div class="mv424-note mv424-warn">❌ ${esc(e.message)}</div>`;
    }
  }

  async function crearAsignacion(btn){
    if(!fichaPreparada?.orden)return;
    const supervisor=n(document.getElementById("mv424Supervisor")?.value);
    const tipo=n(document.getElementById("mv424Tipo")?.value);
    const prioridad=n(document.getElementById("mv424Prioridad")?.value);
    const fechaLimite=n(document.getElementById("mv424FechaLimite")?.value);
    const motivo=n(document.getElementById("mv424Motivo")?.value);
    const observacion=n(document.getElementById("mv424Observacion")?.value);
    const msg=document.getElementById("mv424MsgCrear");
    if(!supervisor||!motivo){if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">Seleccione Supervisor e ingrese el motivo.</div>`;return;}
    if(btn){btn.disabled=true;btn.textContent="Asignando...";}
    try{
      const d=await apiPost({accion:"crearAsignacionCampoV424",codigo:fichaPreparada.codigoConsultado||fichaPreparada.orden.ordenId,supervisor,tipoActividad:tipo,motivo,prioridad,fechaLimite,observacionJefatura:observacion});
      if(msg)msg.innerHTML=`<div class="mv424-note mv424-ok">✅ Trabajo asignado correctamente. ID: ${esc(d.id)}</div>`;
      setTimeout(mostrarTrabajos,900);
    }catch(e){if(msg)msg.innerHTML=`<div class="mv424-note mv424-warn">❌ ${esc(e.message)}</div>`;}
    finally{if(btn){btn.disabled=false;btn.textContent="✅ Asignar al Supervisor";}}
  }

  async function abrirAsignacion(id){
    const a=cachePorId[id];
    if(!a){alert("No se encontró la asignación.");return;}
    instalarEstilos();
    if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap"><div class="mv424-head"><h2>📋 Caso ${esc(a.codigoOrden||"")}</h2><p>Cargando datos del cliente, acta y ubicación...</p></div></div>`);
    try{
      const f=await apiGet("obtenerFichaAuditoriaMapaV421",{ordenId:a.codigoOrden});
      renderDetalle(a,f);
    }catch(e){
      if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv424-wrap"><div class="mv424-card"><h3>❌ No se pudo abrir</h3><div class="mv424-note mv424-warn">${esc(e.message)}</div><button class="mv424-btn sec" style="margin-top:9px" onclick="mv424MostrarTrabajos()">← Volver</button></div></div>`);
    }
  }

  function renderDetalle(a,f){
    const o=f.orden||{},acta=f.acta||null;
    const lat=Number(o.latitud),lng=Number(o.longitud);
    const maps=Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+","+lng)}`:"";
    const estado=nt(a.estado);
    const puedeIniciar=esSupervisor()&&(estado==="PENDIENTE"||estado==="EN PROCESO");
    const puedeAnular=puedeAsignar()&&(estado==="PENDIENTE"||estado==="EN PROCESO");
    const servicio=[o.tipoTrabajo,o.tipo,o.productoServicio||o.productoOrigen].filter(Boolean).join(" · ");
    const html=`<div class="mv424-wrap">
      <div class="mv424-head">
        <h2>📋 ${esc(a.tipoActividad)} · ${esc(a.codigoOrden)}</h2>
        <p>${esc(a.sede)} · ${esc(a.cuadrilla)} · Supervisor ${esc(a.supervisor)}</p>
        <div class="mv424-actions"><button class="mv424-btn sec" onclick="mv424MostrarTrabajos()">← Volver</button><button class="mv424-btn" onclick="mv424VerEnMapa('${esc(a.id)}')">🗺️ Ver en mapa</button>${maps?`<a class="mv424-btn sec" href="${maps}" target="_blank" rel="noopener noreferrer">📍 Ir al cliente</a>`:""}</div>
      </div>
      <div class="mv424-card"><h3>Asignación de Jefatura</h3>
        <div class="mv424-badges"><span class="mv424-badge ${estadoClase(a.estado)}">${esc(a.estado)}</span><span class="mv424-badge ${prioClase(a.prioridad)}">${esc(a.prioridad)}</span>${a.fechaLimite?`<span class="mv424-badge">Límite ${esc(a.fechaLimite)}</span>`:""}</div>
        <div class="mv424-note" style="margin-top:10px"><b>Motivo:</b> ${esc(a.motivo)}</div>
        ${a.observacionJefatura?`<div class="mv424-note" style="margin-top:7px"><b>Indicaciones adicionales:</b> ${esc(a.observacionJefatura)}</div>`:""}
      </div>
      <div class="mv424-card"><h3>Cliente y orden</h3><div class="mv424-grid">
        ${dato("Fecha",o.fechaSolicitud)}${dato("Tramo",o.horaSolicitud)}${dato("Código de orden",o.ordenId)}${dato("Código cliente / pedido",o.codigoPedido||o.codigoCliente)}
        ${dato("Cliente",o.cliente)}${dato("DNI",o.numeroDocumento)}${dato("Teléfono",o.telefonoMovil)}${dato("Dirección",o.direccion)}${dato("Cuadrilla",o.cuadrilla)}${dato("Estado",o.estado)}${dato("Servicio",servicio)}${dato("Coordenadas",Number.isFinite(lat)&&Number.isFinite(lng)?`${lat},${lng}`:"")}
      </div></div>
      <div class="mv424-card"><h3>📄 Acta</h3>${acta?.linkActa?`<div class="mv424-note mv424-ok">Acta disponible · ${esc(acta.estadoVisibleTecnico||acta.estado||"")}<br><a class="mv424-btn ok" style="margin-top:8px" href="${esc(acta.linkActa)}" target="_blank" rel="noopener noreferrer">📄 Ver acta</a></div>`:`<div class="mv424-note mv424-warn">Acta aún no cargada para esta orden.</div>`}</div>
      <div class="mv424-card"><h3>Ejecutar trabajo</h3>
        ${puedeIniciar?`<div class="mv424-note mv424-ok">Al iniciar se abrirá <b>Actividad en Campo</b> con la cuadrilla, tipo de actividad y datos de esta orden preparados.</div><button class="mv424-btn ok" style="margin-top:9px" onclick="mv424IniciarAsignacion('${esc(a.id)}',this)">▶ ${estado==="EN PROCESO"?"Continuar":"Iniciar"} actividad</button>`:""}
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
        tipo.value=a.tipoActividad||"AUDITORIA EN FRIO";
        if(typeof window.renderFormularioTipoActividad==="function")window.renderFormularioTipoActividad();
      }

      const wrap=document.querySelector(".act-wrap");
      const head=wrap?.querySelector(".act-head");
      if(head&&!document.getElementById("mv424NotaAsignacion")){
        const d=document.createElement("div");d.id="mv424NotaAsignacion";d.className="act-note";
        d.innerHTML=`📋 <b>Trabajo asignado por Jefatura</b><br>Orden: ${esc(a.codigoOrden)} · Cliente: ${esc(a.cliente||"")}<br><b>Motivo:</b> ${esc(a.motivo||"")}${a.observacionJefatura?`<br><b>Indicación:</b> ${esc(a.observacionJefatura)}`:""}`;
        head.insertAdjacentElement("afterend",d);
      }

      if(["AUDITORIA EN FRIO","AUDITORIA EN CALIENTE"].includes(nt(a.tipoActividad))){
        const c=document.getElementById("audCodigoPedido");
        if(c){c.value=a.codigoOrden||a.codigoPedido||"";const l=c.closest(".act-field")?.querySelector("label");if(l)l.textContent="Código de orden";}
        if(typeof window.buscarDatosAuditoriaCampo==="function")await window.buscarDatosAuditoriaCampo();
      }

      if(nt(a.tipoActividad)==="VALIDACION DE OBSERVACION"){
        const c=document.getElementById("valCodigo");if(c)c.value=a.codigoOrden||a.codigoPedido||"";
        const t=document.getElementById("valTipo");if(t)t.value=a.motivo||"";
      }

      if(nt(a.tipoActividad)==="SEGUIMIENTO"){
        const s=document.getElementById("segMotivo");
        if(s){
          const motivo=nt(a.motivo);
          const opciones=Array.from(s.options).map(o=>o.value);
          const encontrada=opciones.find(x=>motivo.includes(nt(x)));
          s.value=encontrada||"OTRO";
        }
        const f=document.getElementById("segFechaSeguimiento");if(f&&!f.value)f.value=hoyISO();
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
      if(typeof window.mv339CargarModulo==="function"){
        await window.mv339CargarModulo("mapa");
      }
      if(typeof window.mostrarMapaOperativo!=="function"){
        throw new Error("Mapa Operativo no está disponible.");
      }

      await window.mostrarMapaOperativo();

      setTimeout(async function(){
        const codigo=document.getElementById("moBuscarCodigo");
        const fecha=document.getElementById("moFiltroFecha");
        const periodo=document.getElementById("moFiltroPeriodo");

        if(codigo) codigo.value=a.codigoOrden||"";

        const fechaOrden=a._ficha?.orden?.fechaSolicitud||"";
        const m=n(fechaOrden).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if(m&&periodo){
          periodo.value=`${m[3]}-${String(m[2]).padStart(2,"0")}`;
        }

        if(fecha) fecha.value="";
        try{if(typeof moActualizarRangoFecha==="function")moActualizarRangoFecha();}catch(_){}
        try{if(typeof moConsultarMapa==="function")await moConsultarMapa();}catch(e){console.warn("V425 mapa caso",e);}
      },80);
    }catch(e){
      alert("No se pudo abrir el caso en el mapa: "+(e?.message||e));
    }
  }

  function volverActividad(){
    window.MV424_ASIGNACION_CAMPO_ACTIVA=null;
    if(typeof window.mostrarActividadCampo==="function") return window.mostrarActividadCampo();
    if(typeof mostrarActividadCampo==="function") return mostrarActividadCampo();
  }

  window.mv424MostrarTrabajos=mostrarTrabajos;
  window.mv424Recargar=mostrarTrabajos;
  window.mv424AplicarFiltro=aplicarFiltro;
  window.mv424NuevaAsignacion=nuevaAsignacion;
  window.mv424PrepararCodigo=prepararCodigo;
  window.mv424CrearAsignacion=crearAsignacion;
  window.mv424AbrirAsignacion=abrirAsignacion;
  window.mv424IniciarAsignacion=iniciarAsignacion;
  window.mv424AnularAsignacion=anularAsignacion;
  window.mv424VerEnMapa=verEnMapa;
  window.mv424VolverActividad=volverActividad;
  window.MV424_ASIGNACIONES_CAMPO_OK=true;
})();