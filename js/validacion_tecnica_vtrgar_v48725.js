/* ==========================================================
   MI VISUAL V487.25 - GESTION VTR/GAR EN VALIDACION TECNICA
   - Submodulo exclusivo Supervisor / Jefatura con permiso VALIDAR.
   - Recableados no se modifican.
   - Fuente principal para propuesta de responsabilidad: WIN.
   - Partner queda solo como respaldo/manual; no reasigna automaticamente.
   - BONO / NO BONO se conserva separado de la responsabilidad del indicador.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V48725_VTRGAR_VT_ACTIVO) return;
  window.MI_VISUAL_V48725_VTRGAR_VT_ACTIVO = true;

  const API = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const ESTADO = {
    incidencias: [],
    cuadrillas: [],
    resumen: {},
    perfil: "",
    sede: ""
  };

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function usuario(){
    return {
      usuario: localStorage.getItem("usuario") || localStorage.getItem("correo") || "",
      perfil: norm(localStorage.getItem("perfil") || ""),
      sede: norm(localStorage.getItem("sede") || "")
    };
  }
  function esJefatura(p){
    const x = norm(p);
    return x === "JEFATURA" || x === "ADMIN" || x === "ADMINISTRADOR";
  }
  function puedeGestionar(){
    const u = usuario();
    const perfilOk = u.perfil === "SUPERVISOR" || esJefatura(u.perfil);
    const permisoOk = typeof window.pmPuede === "function"
      ? !!window.pmPuede("VALIDACION TECNICA","VALIDAR")
      : perfilOk;
    return perfilOk && permisoOk;
  }
  async function api(payload){
    const controlador = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controlador ? setTimeout(() => controlador.abort(), 25000) : null;
    try{
      const r = await fetch(API,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(payload || {}),
        signal:controlador ? controlador.signal : undefined
      });
      const t = await r.text();
      if(!r.ok) throw new Error("La API no está disponible temporalmente.");
      let j;
      try{ j = JSON.parse(t); }
      catch(_){ throw new Error("La API devolvió una respuesta no válida."); }
      if(!j || !j.ok) throw new Error((j && j.error) || "No se pudo completar la operación.");
      return j;
    }catch(e){
      if(e && e.name === "AbortError") throw new Error("La consulta VTR/GAR tardó demasiado. Vuelva a intentar.");
      throw e;
    }finally{
      if(timer) clearTimeout(timer);
    }
  }

  function css(){
    return `<style id="mv48725-vg-css">
      .mv48725-entry{border:2px solid #93c5fd;background:linear-gradient(135deg,#eff6ff,#f8fafc)}
      .mv48725-entry-grid{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}
      .mv48725-entry p{margin:5px 0;color:#475569;font-size:12px;line-height:1.45}
      .mv48725-source{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:10px;font-weight:900}
      .mv48725-wrap{max-width:1080px;margin:0 auto;padding:12px;color:#0f172a}
      .mv48725-head{background:linear-gradient(135deg,#1e3a8a,#0f766e);color:#fff;border-radius:20px;padding:16px;margin-bottom:12px}
      .mv48725-head h2{margin:0;font-size:21px}.mv48725-head p{margin:6px 0 0;font-size:12px;opacity:.94;line-height:1.45}
      .mv48725-toolbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
      .mv48725-toolbar input,.mv48725-toolbar select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;color:#0f172a}
      .mv48725-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:12px 0}
      .mv48725-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:9px;text-align:center}
      .mv48725-kpi b{display:block;font-size:19px}.mv48725-kpi span{font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase}
      .mv48725-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:13px;padding:10px;color:#1e3a8a;font-size:12px;line-height:1.45;margin:10px 0}
      .mv48725-warning{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      .mv48725-list{display:grid;gap:10px}
      .mv48725-card{background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:13px;box-shadow:0 5px 15px rgba(15,23,42,.06)}
      .mv48725-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .mv48725-title{font-weight:900;font-size:14px}.mv48725-sub{font-size:11px;color:#64748b;margin-top:3px}
      .mv48725-badges{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .mv48725-badge{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;background:#e2e8f0;color:#334155}
      .mv48725-badge.pending{background:#fef3c7;color:#92400e}.mv48725-badge.ok{background:#dcfce7;color:#166534}
      .mv48725-badge.info{background:#dbeafe;color:#1d4ed8}.mv48725-badge.bad{background:#fee2e2;color:#991b1b}
      .mv48725-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px 12px;margin-top:10px;font-size:11px}
      .mv48725-grid span{color:#64748b}.mv48725-grid b{display:block;color:#0f172a;margin-top:2px;overflow-wrap:anywhere}
      .mv48725-win{margin-top:10px;padding:10px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0}
      .mv48725-win.manual{background:#fff7ed;border-color:#fed7aa}
      .mv48725-win-head{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px;font-weight:900}
      .mv48725-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      .mv48725-btn{border:0;border-radius:10px;padding:9px 11px;font-size:11px;font-weight:900;color:#fff;background:#2563eb;cursor:pointer}
      .mv48725-btn.ok{background:#15803d}.mv48725-btn.warn{background:#b45309}.mv48725-btn.bad{background:#b91c1c}.mv48725-btn.alt{background:#64748b}.mv48725-btn.money{background:#0f766e}
      .mv48725-btn:disabled{opacity:.5;cursor:not-allowed}
      .mv48725-group{border:1px solid #cbd5e1;border-radius:15px;overflow:hidden;background:#f8fafc}
      .mv48725-group>summary{cursor:pointer;padding:11px 13px;background:#eaf2fb;font-weight:900;display:flex;justify-content:space-between}
      .mv48725-group-body{padding:10px;display:grid;gap:10px}
      .mv48725-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:12px;z-index:10060}
      .mv48725-modal{width:min(520px,100%);background:#fff;border-radius:18px;padding:15px;box-shadow:0 20px 50px rgba(15,23,42,.3)}
      .mv48725-modal h3{margin:0 0 10px}.mv48725-modal label{display:block;font-size:11px;font-weight:900;margin:9px 0 4px}
      .mv48725-modal select,.mv48725-modal textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff;color:#0f172a}
      .mv48725-modal textarea{min-height:80px;resize:vertical}
      @media(max-width:760px){
        .mv48725-entry-grid{grid-template-columns:1fr}.mv48725-entry-grid .vt-btn{width:100%}
        .mv48725-toolbar{grid-template-columns:1fr 1fr}.mv48725-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
        .mv48725-grid{grid-template-columns:1fr 1fr}.mv48725-top{flex-direction:column}.mv48725-badges{justify-content:flex-start}
      }
      @media(max-width:480px){.mv48725-toolbar,.mv48725-grid{grid-template-columns:1fr}.mv48725-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.mv48725-actions .mv48725-btn{width:100%}}
    </style>`;
  }

  function inyectarTarjeta(){
    if(!puedeGestionar()) return;
    const wrap = document.querySelector(".vt-wrap");
    if(!wrap || document.getElementById("mv48725EntradaVtrGar")) return;
    const header = wrap.querySelector(".vt-header");
    if(!header) return;

    const html = `${css()}<div id="mv48725EntradaVtrGar" class="vt-card mv48725-entry">
      <div class="mv48725-entry-grid">
        <div>
          <h3 style="margin:0">📡 Gestión VTR / GAR</h3>
          <p>Submódulo de Supervisor/Jefatura. Cruza la incidencia con la data WIN, muestra si existe registro de Validación Técnica y separa <b>Bono/No Bono</b> de la <b>cuadrilla responsable</b>.</p>
          <span class="mv48725-source">FUENTE PRINCIPAL: WIN</span>
        </div>
        <button type="button" class="vt-btn" onclick="mv48725MostrarGestionVtrGar()">Abrir gestión</button>
      </div>
    </div>`;
    header.insertAdjacentHTML("afterend", html);
  }

  function separarPendientes(){
    if(!puedeGestionar()) return;
    const el = document.getElementById("vtPendientes");
    if(!el || !Array.isArray(window.vtValidacionesActuales) || typeof window.renderListaValidaciones !== "function") return;
    const pendientes = window.vtValidacionesActuales.filter(x => {
      const estado = norm(x && x.estado);
      const tipo = norm(x && x.tipoValidacion);
      return estado === "PENDIENTE" && tipo !== "VTR" && tipo !== "GAR";
    });
    el.innerHTML = pendientes.length
      ? window.renderListaValidaciones(pendientes,true)
      : `<div class="vt-sub">No hay validaciones de Recableado/Otro pendientes.</div>`;
  }

  function instalarHookCarga(){
    const base = window.cargarValidacionesTecnicas;
    if(typeof base !== "function" || base.__mv48725VtrGar) return;
    const envuelta = async function(){
      const r = await base.apply(this,arguments);
      try{ separarPendientes(); }catch(_){}
      return r;
    };
    envuelta.__mv48725VtrGar = true;
    envuelta.__mv48725Base = base;
    window.cargarValidacionesTecnicas = envuelta;
    try{ cargarValidacionesTecnicas = envuelta; }catch(_){}
  }

  function montar(){
    if(!puedeGestionar()) return;
    instalarHookCarga();
    setTimeout(function(){
      inyectarTarjeta();
      separarPendientes();
    },50);
    setTimeout(function(){
      inyectarTarjeta();
      separarPendientes();
    },450);
  }

  function estadoBadge(e){
    const x = norm(e);
    if(x === "PENDIENTE") return "pending";
    if(x === "CONFIRMADO" || x === "REASIGNADO") return "ok";
    if(x === "ANULADO") return "bad";
    return "";
  }
  function bonoBadge(item){
    const e = norm(item && item.estadoBono);
    if(e === "VALIDADA_BONO") return ["BONO","ok"];
    if(e === "VALIDADA_NO_BONO") return ["NO BONO","info"];
    if(e === "PENDIENTE") return ["BONO PENDIENTE","pending"];
    return ["SIN REGISTRO","bad"];
  }
  function periodoItem(item){
    const p = txt(item && item.periodo);
    if(p) return p;
    const f = txt(item && (item.fechaISO || item.fecha));
    return f.length >= 7 ? f.substring(0,7) : "SIN PERIODO";
  }

  function filtros(){
    const q = norm(document.getElementById("mv48725Buscar")?.value || "");
    const tipo = norm(document.getElementById("mv48725Tipo")?.value || "");
    const est = norm(document.getElementById("mv48725Estado")?.value || "");
    const periodo = txt(document.getElementById("mv48725Periodo")?.value || "");
    return ESTADO.incidencias.filter(x => {
      if(tipo && norm(x.tipo) !== tipo) return false;
      if(est && norm(x.estadoCalificacion) !== est) return false;
      if(periodo && periodoItem(x) !== periodo) return false;
      if(q){
        const bolsa = norm([x.ticket,x.numeroDocumento,x.codigoPedido,x.cliente,x.cuadrillaEjecutora,x.cuadrillaResponsable].join(" "));
        if(!bolsa.includes(q)) return false;
      }
      return true;
    });
  }

  function renderKpis(){
    const r = ESTADO.resumen || {};
    const sinReg = ESTADO.incidencias.filter(x => norm(x.estadoBono) === "SIN_REGISTRO").length;
    const bonoPend = ESTADO.incidencias.filter(x => norm(x.estadoBono) === "PENDIENTE").length;
    return `<div class="mv48725-kpis">
      <div class="mv48725-kpi"><b>${Number(r.total || ESTADO.incidencias.length)}</b><span>Total</span></div>
      <div class="mv48725-kpi"><b>${Number(r.pendientes || 0)}</b><span>Pendientes</span></div>
      <div class="mv48725-kpi"><b>${Number(r.confirmados || 0)}</b><span>Confirmados</span></div>
      <div class="mv48725-kpi"><b>${Number(r.reasignados || 0)}</b><span>Reasignados</span></div>
      <div class="mv48725-kpi"><b>${sinReg}</b><span>Sin registro VT</span></div>
      <div class="mv48725-kpi"><b>${bonoPend}</b><span>Bono pendiente</span></div>
    </div>`;
  }

  function renderWin(item){
    const d = item.deteccionWin || {};
    const segura = !!d.segura;
    const propuesta = norm(d.propuesta || d.resultado || "REVISION MANUAL");
    return `<div class="mv48725-win ${segura ? "" : "manual"}">
      <div class="mv48725-win-head">
        <span>🔎 ANÁLISIS DE RESPONSABILIDAD</span>
        <span class="mv48725-source">WIN</span>
      </div>
      <div class="mv48725-grid" style="margin-top:8px">
        <div><span>Propuesta</span><b>${esc(propuesta)}</b></div>
        <div><span>Cuadrilla antecedente</span><b>${esc(d.cuadrillaOrigen || "-")}</b></div>
        <div><span>Días transcurridos</span><b>${d.diasTranscurridos == null ? "-" : esc(d.diasTranscurridos)}</b></div>
        <div><span>Orden WIN anterior</span><b>${esc(d.ordenIdOrigen || d.codigoPedidoOrigen || "-")}</b></div>
        <div><span>Fecha/hora anterior</span><b>${esc(d.fechaHoraOrigen || d.fechaOrigen || "-")}</b></div>
        <div><span>Trabajo anterior</span><b>${esc(d.tipoTrabajoOrigen || "-")}</b></div>
      </div>
      <div style="font-size:10px;margin-top:7px;color:${segura ? "#166534" : "#9a3412"}">${esc(d.motivo || "Sin coincidencia WIN segura. Revisión manual.")}</div>
      ${!segura ? `<div style="font-size:10px;margin-top:4px;color:#9a3412"><b>Partner:</b> solo puede usarse como respaldo para revisar; no cambia la responsabilidad automáticamente.</div>` : ""}
    </div>`;
  }

  function renderBono(item){
    const [label, cls] = bonoBadge(item);
    const v = item.validacionBono || null;
    let html = `<div class="mv48725-win ${v ? "" : "manual"}">
      <div class="mv48725-win-head"><span>💰 VALIDACIÓN BONO</span><span class="mv48725-badge ${cls}">${esc(label)}</span></div>`;
    if(v){
      html += `<div class="mv48725-grid" style="margin-top:8px">
        <div><span>Registro Validación Técnica</span><b>SÍ · ${esc(v.id || "-")}</b></div>
        <div><span>Cuadrilla que registró</span><b>${esc(v.cuadrilla || "-")}</b></div>
        <div><span>Resultado</span><b>${esc(v.resultado || v.estado || "PENDIENTE")}</b></div>
        <div><span>Coincidencia</span><b>${esc(item.coincidenciaBono || "-")}</b></div>
        <div><span>Validado por</span><b>${esc(v.validadoPor || "-")}</b></div>
        <div><span>Fecha validación</span><b>${esc(v.fechaValidacion || "-")}</b></div>
      </div>`;
      if(norm(item.estadoBono) === "PENDIENTE"){
        html += `<div class="mv48725-actions">
          <button class="mv48725-btn money" onclick="mv48725ValidarBono('${esc(item.clave)}','BONO')">BONO</button>
          <button class="mv48725-btn bad" onclick="mv48725ValidarBono('${esc(item.clave)}','NO BONO')">NO BONO</button>
        </div>`;
      }
    }else{
      html += `<div style="font-size:11px;margin-top:8px;color:#9a3412"><b>Registro Validación Técnica: NO.</b> No se crea ningún registro automático. El caso queda visible para revisión.</div>`;
    }
    return html + `</div>`;
  }

  function renderCard(item){
    const e = norm(item.estadoCalificacion || "PENDIENTE");
    const responsable = txt(item.cuadrillaResponsable) || (e === "PENDIENTE" ? "POR VALIDAR" : "-");
    return `<div class="mv48725-card">
      <div class="mv48725-top">
        <div>
          <div class="mv48725-title">${esc(item.tipo)} · ${esc(item.ticket || "SIN TICKET")}</div>
          <div class="mv48725-sub">${esc(item.fecha || item.fechaISO || "")} · ${esc(item.cliente || "")}</div>
        </div>
        <div class="mv48725-badges">
          <span class="mv48725-badge ${estadoBadge(e)}">${esc(e)}</span>
          <span class="mv48725-badge info">${esc(item.sedeEjecutora || "-")}</span>
        </div>
      </div>
      <div class="mv48725-grid">
        <div><span>DNI</span><b>${esc(item.numeroDocumento || "-")}</b></div>
        <div><span>Código / pedido</span><b>${esc(item.codigoPedido || "-")}</b></div>
        <div><span>Tipo WIN incidencia</span><b>${esc(item.tipoPartida || "-")}</b></div>
        <div><span>Cuadrilla ejecutora</span><b>${esc(item.cuadrillaEjecutora || "-")}</b></div>
        <div><span>Cuadrilla responsable</span><b>${esc(responsable)}</b></div>
        <div><span>Calificado por</span><b>${esc(item.calificadoPor || "-")}</b></div>
      </div>
      ${renderWin(item)}
      ${renderBono(item)}
      <div class="mv48725-actions">
        <button class="mv48725-btn ok" onclick="mv48725Responsabilidad('${esc(item.clave)}','CORRESPONDE')">Confirmar ejecutora</button>
        <button class="mv48725-btn warn" onclick="mv48725AbrirReasignar('${esc(item.clave)}')">Reasignar</button>
        <button class="mv48725-btn bad" onclick="mv48725Responsabilidad('${esc(item.clave)}','ANULAR')">Anular</button>
      </div>
      ${item.observacion ? `<div style="font-size:10px;color:#64748b;margin-top:8px"><b>Observación:</b> ${esc(item.observacion)}</div>` : ""}
    </div>`;
  }

  function renderLista(){
    const cont = document.getElementById("mv48725Contenido");
    if(!cont) return;
    const lista = filtros();
    document.getElementById("mv48725Kpis").innerHTML = renderKpis();
    if(!lista.length){
      cont.innerHTML = `<div class="mv48725-note">No hay registros para los filtros seleccionados.</div>`;
      return;
    }
    const grupos = {};
    lista.forEach(x => {
      const p = periodoItem(x);
      if(!grupos[p]) grupos[p] = [];
      grupos[p].push(x);
    });
    cont.innerHTML = Object.keys(grupos).sort().reverse().map(p => {
      const items = grupos[p].sort((a,b) => txt(b.fechaISO || b.fecha).localeCompare(txt(a.fechaISO || a.fecha)));
      return `<details class="mv48725-group" ${Object.keys(grupos).length === 1 ? "open" : ""}>
        <summary><span>${esc(p)}</span><span>${items.length} casos</span></summary>
        <div class="mv48725-group-body">${items.map(renderCard).join("")}</div>
      </details>`;
    }).join("");
  }

  async function cargarGestion(){
    const cont = document.getElementById("mv48725Contenido");
    if(cont) cont.innerHTML = `<div class="mv48725-note">Cargando incidencias VTR/GAR desde la gestión consolidada...</div>`;
    try{
      const u = usuario();
      const r = await api({accion:"listarGestionVtrGar",usuario:u.usuario});
      ESTADO.incidencias = Array.isArray(r.incidencias) ? r.incidencias : [];
      ESTADO.cuadrillas = Array.isArray(r.cuadrillas) ? r.cuadrillas : [];
      ESTADO.resumen = Object.assign({total:ESTADO.incidencias.length},r.resumen || {});
      ESTADO.perfil = u.perfil;
      ESTADO.sede = u.sede;

      const periodos = [...new Set(ESTADO.incidencias.map(periodoItem).filter(Boolean))].sort().reverse();
      const sel = document.getElementById("mv48725Periodo");
      if(sel){
        sel.innerHTML = `<option value="">Todos los periodos</option>` + periodos.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
      }
      renderLista();
    }catch(e){
      if(cont) cont.innerHTML = `<div class="mv48725-note mv48725-warning"><b>No se pudo abrir Gestión VTR/GAR.</b><br>${esc(e.message)}<br><br>Esta rama requiere también el parche V487.25 del Apps Script antes de la prueba funcional.</div>`;
    }
  }

  function pantallaGestion(){
    const u = usuario();
    return `${typeof window.estiloValidacionTecnica === "function" ? window.estiloValidacionTecnica() : ""}${css()}
      <div class="mv48725-wrap">
        <div class="mv48725-head">
          <h2>📡 GESTIÓN VTR / GAR</h2>
          <p><b>WIN es la fuente principal.</b> El sistema propone la cuadrilla responsable usando antecedentes WIN, pero Supervisor/Jefatura toman la decisión final. Bono/No Bono se valida únicamente si existe un registro en Validación Técnica.</p>
        </div>
        <div class="mv48725-actions" style="margin-bottom:10px">
          <button class="mv48725-btn alt" onclick="mostrarValidacionTecnica()">⬅ Volver a Validación Técnica</button>
          <button class="mv48725-btn" onclick="mv48725CargarGestionVtrGar()">Actualizar</button>
        </div>
        <div class="mv48725-note">
          <b>Alcance:</b> ${u.perfil === "SUPERVISOR" ? `solo ${esc(u.sede || "su sede")}` : "Zona Norte"}.
          La responsabilidad del indicador es independiente del Bono/No Bono.
        </div>
        <div class="mv48725-toolbar">
          <input id="mv48725Buscar" type="search" placeholder="Buscar ticket, DNI, código o cuadrilla" oninput="mv48725RenderGestionVtrGar()">
          <select id="mv48725Tipo" onchange="mv48725RenderGestionVtrGar()"><option value="">VTR y GAR</option><option value="VTR">VTR</option><option value="GAR">GAR</option></select>
          <select id="mv48725Estado" onchange="mv48725RenderGestionVtrGar()"><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="CONFIRMADO">Confirmado</option><option value="REASIGNADO">Reasignado</option><option value="ANULADO">Anulado</option></select>
          <select id="mv48725Periodo" onchange="mv48725RenderGestionVtrGar()"><option value="">Todos los periodos</option></select>
        </div>
        <div id="mv48725Kpis"></div>
        <div id="mv48725Contenido" class="mv48725-list"></div>
      </div>`;
  }

  window.mv48725MostrarGestionVtrGar = function(){
    if(!puedeGestionar()){
      alert("No tienes permiso para gestionar VTR/GAR.");
      return;
    }
    if(typeof window.mostrarPantalla !== "function") return;
    window.mostrarPantalla(pantallaGestion());
    cargarGestion();
  };
  window.mv48725CargarGestionVtrGar = cargarGestion;
  window.mv48725RenderGestionVtrGar = renderLista;

  function buscar(clave){ return ESTADO.incidencias.find(x => txt(x.clave) === txt(clave)); }

  window.mv48725Responsabilidad = async function(clave,decision){
    const item = buscar(clave);
    if(!item) return;
    const d = norm(decision);
    let mensaje = "";
    if(d === "CORRESPONDE") mensaje = `¿Confirmar que ${item.cuadrillaEjecutora} es la cuadrilla responsable de esta ${item.tipo}?`;
    else if(d === "ANULAR") mensaje = "¿Anular esta incidencia? Permanecerá en el historial pero no contabilizará en VTR/GAR.";
    if(mensaje && !confirm(mensaje)) return;
    let obs = "";
    if(d === "ANULAR"){
      obs = prompt("Motivo de anulación (obligatorio):","") || "";
      if(!txt(obs)){ alert("Ingrese el motivo de anulación."); return; }
    }
    try{
      await api({accion:"calificarIncidenciaVtrGar",usuario:usuario().usuario,clave:item.clave,decision:d,observacion:obs});
      alert("Responsabilidad guardada. El indicador VTR/GAR y Ranking fueron recalculados.");
      await cargarGestion();
    }catch(e){ alert(e.message); }
  };

  window.mv48725AbrirReasignar = function(clave){
    const item = buscar(clave);
    if(!item) return;
    const sugerida = txt(item.deteccionWin && item.deteccionWin.cuadrillaOrigen);
    const opciones = ESTADO.cuadrillas.map(c => {
      const valor = txt(c.cuadrilla || c.nombre || c);
      const sede = txt(c.sede || "");
      return `<option value="${esc(valor)}" ${valor === sugerida ? "selected" : ""}>${esc(valor)}${sede ? " · "+esc(sede) : ""}</option>`;
    }).join("");
    document.body.insertAdjacentHTML("beforeend",`<div id="mv48725Modal" class="mv48725-modal-bg">
      <div class="mv48725-modal">
        <h3>Reasignar responsabilidad</h3>
        <div class="mv48725-note"><b>Incidencia:</b> ${esc(item.tipo)} ${esc(item.ticket)}<br><b>Ejecutora:</b> ${esc(item.cuadrillaEjecutora)}<br><b>Propuesta WIN:</b> ${esc((item.deteccionWin && item.deteccionWin.propuesta) || "REVISIÓN MANUAL")}</div>
        <label>Cuadrilla responsable</label>
        <select id="mv48725ReasignarCuadrilla"><option value="">Seleccione...</option>${opciones}</select>
        <label>Observación / sustento</label>
        <textarea id="mv48725ReasignarObs" placeholder="Indique por qué se reasigna la responsabilidad"></textarea>
        <div class="mv48725-actions">
          <button class="mv48725-btn ok" onclick="mv48725GuardarReasignacion('${esc(item.clave)}')">Guardar reasignación</button>
          <button class="mv48725-btn alt" onclick="document.getElementById('mv48725Modal').remove()">Cancelar</button>
        </div>
      </div>
    </div>`);
  };

  window.mv48725GuardarReasignacion = async function(clave){
    const item = buscar(clave);
    if(!item) return;
    const cuadrilla = txt(document.getElementById("mv48725ReasignarCuadrilla")?.value || "");
    const obs = txt(document.getElementById("mv48725ReasignarObs")?.value || "");
    if(!cuadrilla){ alert("Seleccione la cuadrilla responsable."); return; }
    if(!obs){ alert("Ingrese el sustento de la reasignación."); return; }
    try{
      await api({accion:"calificarIncidenciaVtrGar",usuario:usuario().usuario,clave:item.clave,decision:"REASIGNAR",cuadrillaResponsable:cuadrilla,observacion:obs});
      document.getElementById("mv48725Modal")?.remove();
      alert("Responsabilidad reasignada. El indicador VTR/GAR y Ranking fueron recalculados.");
      await cargarGestion();
    }catch(e){ alert(e.message); }
  };

  window.mv48725ValidarBono = async function(clave,resultado){
    const item = buscar(clave);
    const v = item && item.validacionBono;
    if(!v || !v.id){ alert("Este caso no tiene un registro de Validación Técnica asociado."); return; }
    if(norm(item.estadoBono) !== "PENDIENTE"){ alert("Este registro de Bono/No Bono ya fue validado."); return; }
    const motivo = prompt(`Motivo para marcar ${resultado}:`,"") || "";
    if(!txt(motivo)){ alert("El motivo es obligatorio."); return; }
    if(!confirm(`¿Confirmar resultado ${resultado} para ${item.ticket}?`)) return;
    try{
      await api({accion:"validarValidacionTecnica",usuario:usuario().usuario,id:v.id,resultado:resultado,motivoValidacion:motivo});
      alert("Validación Bono/No Bono guardada.");
      await cargarGestion();
    }catch(e){ alert(e.message); }
  };

  window.mv48725MontarVtrGarValidacion = montar;

  instalarHookCarga();
  montar();

  console.log("MI VISUAL V487.25: submódulo VTR/GAR en Validación Técnica preparado.");
})();