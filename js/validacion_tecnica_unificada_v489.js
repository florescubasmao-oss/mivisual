/* ============================================================
   MI VISUAL V489 - VALIDACION TECNICA UNIFICADA

   OBJETIVO
   - RECABLEADO: no mostrar referencias VTR/GAR.
   - VTR/GAR: una sola experiencia con dos vistas:
       REGISTRO (flujo actual, abre primero)
       VALIDACION (casos WIN + responsabilidad + Bono/No Bono)
   - JEFATURA: valida.
   - SUPERVISOR / GERENCIA / ADMIN: solo lectura.
   - TECNICO: conserva integro el flujo actual de registro, alertas,
     observaciones, reenvio e historial. No se altera backend de registro.
   - No agrega consultas al abrir RECABLEADO ni al mostrar REGISTRO.
   - VALIDACION consulta solo al abrir esa pestaña.
============================================================ */
(function(){
  "use strict";

  if(window.MV489_VT_UNIFICADA_OK) return;
  window.MV489_VT_UNIFICADA_OK = true;

  const API = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const ESTADO = { incidencias:[], cuadrillas:[], resumen:{}, cargado:false };
  let instalado = false;
  let observerRegistro = null;
  let timerRegistro = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function perfil(){ return norm(localStorage.getItem("perfil") || ""); }
  function usuario(){ return txt(localStorage.getItem("usuario") || localStorage.getItem("correo") || ""); }
  function sede(){ return txt(localStorage.getItem("sede") || ""); }
  function esTecnico(){ return perfil() === "TECNICO"; }
  function esJefatura(){ return perfil().indexOf("JEFATURA") === 0; }
  function puedeVerValidacion(){
    const p = perfil();
    return esJefatura() || p === "SUPERVISOR" || p.indexOf("GERENCIA") === 0 || p === "ADMIN" || p === "ADMINISTRADOR";
  }

  function css(){
    return `<style id="mv489-css">
      .mv489-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
      .mv489-tab{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer;min-width:135px}
      .mv489-tab.active{background:#2563eb;color:#fff;border-color:#2563eb;box-shadow:0 7px 18px rgba(37,99,235,.2)}
      .mv489-readonly{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:12px;padding:10px 12px;font-size:12px;margin:0 0 10px}
      .mv489-wrap{max-width:1080px;margin:0 auto;padding:12px;color:#0f172a}
      .mv489-head{background:linear-gradient(135deg,#1e3a8a,#0f766e);color:#fff;border-radius:18px;padding:16px;margin-bottom:12px}
      .mv489-head h2{margin:0;font-size:21px}.mv489-head p{margin:6px 0 0;font-size:12px;line-height:1.45;opacity:.95}
      .mv489-tools{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin:10px 0}
      .mv489-tools input,.mv489-tools select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff}
      .mv489-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:10px 0}
      .mv489-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px;text-align:center}
      .mv489-kpi b{display:block;font-size:19px}.mv489-kpi span{font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase}
      .mv489-month{border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#f8fafc;margin:10px 0}
      .mv489-month>summary{cursor:pointer;padding:11px 13px;background:#eaf2fb;font-weight:900;display:flex;justify-content:space-between;gap:8px}
      .mv489-month-body{padding:9px;display:grid;gap:8px}
      .mv489-case{border:1px solid #dbe3ee;border-radius:13px;background:#fff;overflow:hidden}
      .mv489-case>summary{cursor:pointer;list-style:none;padding:11px 12px;display:grid;grid-template-columns:1.1fr 2fr 1fr auto;gap:10px;align-items:center}
      .mv489-case>summary::-webkit-details-marker{display:none}
      .mv489-ticket{font-weight:900;color:#0f172a}.mv489-label{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:800;display:block;margin-bottom:2px}
      .mv489-value{font-size:11px;font-weight:800;overflow-wrap:anywhere}.mv489-more{font-size:11px;color:#2563eb;font-weight:900;white-space:nowrap}
      .mv489-detail{border-top:1px solid #e2e8f0;padding:11px;background:#f8fafc}
      .mv489-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px 12px}
      .mv489-box{margin-top:10px;border:1px solid #cbd5e1;border-radius:11px;padding:10px;background:#fff}
      .mv489-box.win{background:#f0fdf4;border-color:#bbf7d0}.mv489-box.warn{background:#fff7ed;border-color:#fed7aa}
      .mv489-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      .mv489-btn{border:0;border-radius:9px;padding:8px 11px;font-size:11px;font-weight:900;color:#fff;background:#2563eb;cursor:pointer}
      .mv489-btn.ok{background:#15803d}.mv489-btn.warn{background:#b45309}.mv489-btn.bad{background:#b91c1c}.mv489-btn.money{background:#0f766e}.mv489-btn.alt{background:#64748b}
      .mv489-badge{display:inline-flex;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;background:#e2e8f0;color:#334155;margin-left:4px}
      .mv489-badge.ok{background:#dcfce7;color:#166534}.mv489-badge.warn{background:#fef3c7;color:#92400e}.mv489-badge.bad{background:#fee2e2;color:#991b1b}.mv489-badge.info{background:#dbeafe;color:#1d4ed8}
      .mv489-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:12px;z-index:10080}
      .mv489-modal{width:min(520px,100%);background:#fff;border-radius:18px;padding:15px}.mv489-modal label{display:block;font-size:11px;font-weight:900;margin:9px 0 4px}.mv489-modal select,.mv489-modal textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:9px}.mv489-modal textarea{min-height:80px}
      @media(max-width:760px){.mv489-tools{grid-template-columns:1fr 1fr}.mv489-kpis{grid-template-columns:repeat(3,1fr)}.mv489-case>summary{grid-template-columns:1fr 1fr}.mv489-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){.mv489-tools,.mv489-grid,.mv489-case>summary{grid-template-columns:1fr}.mv489-kpis{grid-template-columns:repeat(2,1fr)}.mv489-tab{flex:1}.mv489-more{text-align:left}}
    </style>`;
  }

  function api(payload){
    return fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload || {})
    }).then(function(r){ return r.text(); }).then(function(t){
      let j;
      try{ j = JSON.parse(t); }catch(_){ throw new Error("La API devolvio una respuesta no valida."); }
      if(!j || !j.ok) throw new Error((j && j.error) || "No se pudo completar la consulta.");
      return j;
    });
  }

  function limpiarReferenciasCruzadas(){
    if(window.MV488_VT_MODO !== "RECABLEADO") return;
    const hist = document.getElementById("vtHistorial");
    if(!hist) return;

    hist.querySelectorAll(".vt-group").forEach(function(g){
      const s = norm(g.querySelector("summary") && g.querySelector("summary").textContent);
      if(s.indexOf("VTR (") === 0 || s.indexOf("GAR (") === 0) g.remove();
    });

    hist.querySelectorAll(".vt-summary-card,.vt-origin-card,.vt-kpi,.vt-stat").forEach(function(c){
      const t = norm(c.textContent);
      if(t === "BONO 0" || t === "NO BONO 0" || t.indexOf("BONO") >= 0 || t.indexOf("NO BONO") >= 0){
        if(t.indexOf("RECABLEADO") < 0) c.style.display = "none";
      }
    });

    hist.querySelectorAll(".vt-origin-summary").forEach(function(x){ x.remove(); });
  }

  function tabsHTML(activa){
    const verValidacion = puedeVerValidacion() && !esTecnico();
    return `${css()}<div class="mv489-tabs" id="mv489Tabs">
      <button class="mv489-tab ${activa === "REGISTRO" ? "active" : ""}" onclick="mv489AbrirRegistroVtrGar()">📝 Registro</button>
      ${verValidacion ? `<button class="mv489-tab ${activa === "VALIDACION" ? "active" : ""}" onclick="mv489AbrirValidacionVtrGar()">✅ Validación</button>` : ""}
    </div>`;
  }

  function decorarRegistro(){
    if(window.MV488_VT_MODO !== "VTRGAR") return;
    const wrap = document.querySelector(".vt-wrap");
    if(!wrap) return;

    const cardGestion = document.getElementById("mv48725EntradaVtrGar");
    if(cardGestion) cardGestion.remove();

    let tabs = document.getElementById("mv489Tabs");
    if(!tabs){
      const sub = wrap.querySelector(".mv488-subnav");
      if(sub) sub.insertAdjacentHTML("afterend",tabsHTML("REGISTRO"));
      else wrap.insertAdjacentHTML("afterbegin",tabsHTML("REGISTRO"));
      tabs = document.getElementById("mv489Tabs");
    }
    if(tabs){
      tabs.querySelectorAll(".mv489-tab").forEach(function(b){ b.classList.remove("active"); });
      const primero = tabs.querySelector(".mv489-tab");
      if(primero) primero.classList.add("active");
    }

    const h2 = wrap.querySelector(".vt-header h2");
    if(h2) h2.textContent = "📡 VTR / GAR";

    if(observerRegistro) observerRegistro.disconnect();
    observerRegistro = new MutationObserver(function(){
      clearTimeout(timerRegistro);
      timerRegistro = setTimeout(function(){
        const c = document.getElementById("mv48725EntradaVtrGar");
        if(c) c.remove();
      },0);
    });
    observerRegistro.observe(wrap,{childList:true,subtree:true});
  }

  const abrirVtrBase = window.mv488AbrirVtrGar;
  const abrirRecBase = window.mv488AbrirRecableado;

  window.mv489AbrirRegistroVtrGar = function(){
    if(typeof abrirVtrBase === "function") abrirVtrBase();
    setTimeout(decorarRegistro,180);
    setTimeout(decorarRegistro,600);
  };

  if(typeof abrirVtrBase === "function"){
    window.mv488AbrirVtrGar = function(){
      abrirVtrBase();
      setTimeout(decorarRegistro,180);
      setTimeout(decorarRegistro,600);
    };
  }

  if(typeof abrirRecBase === "function"){
    window.mv488AbrirRecableado = function(){
      abrirRecBase();
      setTimeout(limpiarReferenciasCruzadas,250);
      setTimeout(limpiarReferenciasCruzadas,800);
    };
  }

  const tiposBase = window.renderTiposHistorialValidacion;
  if(typeof tiposBase === "function"){
    window.renderTiposHistorialValidacion = function(lista){
      const modo = window.MV488_VT_MODO;
      const l = Array.isArray(lista) ? lista : [];
      if(modo === "RECABLEADO"){
        return tiposBase(l.filter(function(x){ const t=norm(x && x.tipoValidacion); return t !== "VTR" && t !== "GAR"; }));
      }
      if(modo === "VTRGAR"){
        const filtrada = l.filter(function(x){ const t=norm(x && x.tipoValidacion); return t === "VTR" || t === "GAR"; });
        const html = tiposBase(filtrada);
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        tmp.querySelectorAll(".vt-group").forEach(function(g){
          const s = norm(g.querySelector("summary") && g.querySelector("summary").textContent);
          if(s.indexOf("RECABLEADO (") === 0 || s.indexOf("OTRO (") === 0) g.remove();
        });
        return tmp.innerHTML;
      }
      return tiposBase.apply(this,arguments);
    };
    try{ renderTiposHistorialValidacion = window.renderTiposHistorialValidacion; }catch(_){}
  }

  function periodoItem(x){
    const p = txt(x && x.periodo);
    if(p) return p;
    const f = txt(x && (x.fechaISO || x.fecha));
    return f.length >= 7 ? f.substring(0,7) : "SIN PERIODO";
  }
  function propuesta(x){ return norm(x && x.deteccionWin && x.deteccionWin.propuesta) || "REVISION MANUAL"; }
  function estadoBono(x){ return norm(x && x.estadoBono) || "SIN_REGISTRO"; }
  function badge(texto,clase){ return `<span class="mv489-badge ${clase || ""}">${esc(texto)}</span>`; }
  function badgeEstado(x){
    const e = norm(x && x.estadoCalificacion || "PENDIENTE");
    return badge(e,e === "PENDIENTE" ? "warn" : (e === "ANULADO" ? "bad" : "ok"));
  }
  function badgeBono(x){
    const e = estadoBono(x);
    if(e === "VALIDADA_BONO") return badge("BONO","ok");
    if(e === "VALIDADA_NO_BONO") return badge("NO BONO","info");
    if(e === "PENDIENTE") return badge("BONO PENDIENTE","warn");
    return badge("SIN REGISTRO VT","bad");
  }

  function filtros(){
    const q = norm(document.getElementById("mv489Buscar") && document.getElementById("mv489Buscar").value);
    const tipo = norm(document.getElementById("mv489Tipo") && document.getElementById("mv489Tipo").value);
    const estado = norm(document.getElementById("mv489Estado") && document.getElementById("mv489Estado").value);
    const periodo = txt(document.getElementById("mv489Periodo") && document.getElementById("mv489Periodo").value);
    return ESTADO.incidencias.filter(function(x){
      if(tipo && norm(x.tipo) !== tipo) return false;
      if(estado && norm(x.estadoCalificacion) !== estado) return false;
      if(periodo && periodoItem(x) !== periodo) return false;
      if(q){
        const bolsa = norm([x.ticket,x.numeroDocumento,x.codigoPedido,x.cliente,x.cuadrillaEjecutora,x.cuadrillaResponsable,x.sedeEjecutora].join(" "));
        if(bolsa.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderKpis(lista){
    const total = lista.length;
    const pend = lista.filter(function(x){ return norm(x.estadoCalificacion) === "PENDIENTE"; }).length;
    const conf = lista.filter(function(x){ return norm(x.estadoCalificacion) === "CONFIRMADO"; }).length;
    const reas = lista.filter(function(x){ return norm(x.estadoCalificacion) === "REASIGNADO"; }).length;
    const sinreg = lista.filter(function(x){ return estadoBono(x) === "SIN_REGISTRO"; }).length;
    const bonop = lista.filter(function(x){ return estadoBono(x) === "PENDIENTE"; }).length;
    return `<div class="mv489-kpis">
      <div class="mv489-kpi"><b>${total}</b><span>Total</span></div>
      <div class="mv489-kpi"><b>${pend}</b><span>Pendientes</span></div>
      <div class="mv489-kpi"><b>${conf}</b><span>Confirmados</span></div>
      <div class="mv489-kpi"><b>${reas}</b><span>Reasignados</span></div>
      <div class="mv489-kpi"><b>${sinreg}</b><span>Sin registro VT</span></div>
      <div class="mv489-kpi"><b>${bonop}</b><span>Bono pendiente</span></div>
    </div>`;
  }

  function detalleCaso(x){
    const d = x.deteccionWin || {};
    const v = x.validacionBono || null;
    const readonly = !esJefatura();
    return `<div class="mv489-detail">
      <div class="mv489-grid">
        <div><span class="mv489-label">Cliente</span><span class="mv489-value">${esc(x.cliente || "-")}</span></div>
        <div><span class="mv489-label">DNI</span><span class="mv489-value">${esc(x.numeroDocumento || "-")}</span></div>
        <div><span class="mv489-label">Código / pedido</span><span class="mv489-value">${esc(x.codigoPedido || "-")}</span></div>
        <div><span class="mv489-label">Fecha</span><span class="mv489-value">${esc(x.fecha || x.fechaISO || "-")}</span></div>
        <div><span class="mv489-label">Cuadrilla ejecutora</span><span class="mv489-value">${esc(x.cuadrillaEjecutora || "-")}</span></div>
        <div><span class="mv489-label">Cuadrilla responsable</span><span class="mv489-value">${esc(x.cuadrillaResponsable || "POR VALIDAR")}</span></div>
      </div>

      <div class="mv489-box ${d.segura ? "win" : "warn"}">
        <b>🔎 Análisis WIN</b>
        <div class="mv489-grid" style="margin-top:8px">
          <div><span class="mv489-label">Propuesta</span><span class="mv489-value">${esc(d.propuesta || "REVISIÓN MANUAL")}</span></div>
          <div><span class="mv489-label">Cuadrilla antecedente</span><span class="mv489-value">${esc(d.cuadrillaOrigen || "-")}</span></div>
          <div><span class="mv489-label">Orden anterior</span><span class="mv489-value">${esc(d.ordenIdOrigen || "-")}</span></div>
          <div><span class="mv489-label">Fecha anterior</span><span class="mv489-value">${esc(d.fechaHoraOrigen || "-")}</span></div>
          <div><span class="mv489-label">Trabajo anterior</span><span class="mv489-value">${esc(d.tipoTrabajoOrigen || "-")}</span></div>
          <div><span class="mv489-label">Días</span><span class="mv489-value">${esc(d.diasTranscurridos == null ? "-" : d.diasTranscurridos)}</span></div>
        </div>
        ${d.motivo ? `<div style="font-size:10px;color:#64748b;margin-top:7px"><b>Criterio:</b> ${esc(d.motivo)}</div>` : ""}
      </div>

      <div class="mv489-box">
        <b>🧾 Registro / Bono</b>
        ${v ? `<div class="mv489-grid" style="margin-top:8px">
          <div><span class="mv489-label">ID validación</span><span class="mv489-value">${esc(v.id || "-")}</span></div>
          <div><span class="mv489-label">Cuadrilla registró</span><span class="mv489-value">${esc(v.cuadrilla || "-")}</span></div>
          <div><span class="mv489-label">Estado / resultado</span><span class="mv489-value">${esc(v.resultado || v.estado || "PENDIENTE")}</span></div>
        </div>` : `<div style="font-size:11px;color:#9a3412;margin-top:7px">Sin registro asociado en Validación Técnica.</div>`}
      </div>

      ${readonly ? `<div class="mv489-readonly" style="margin-top:10px"><b>Solo lectura.</b> La validación y decisión final corresponde a Jefatura.</div>` : accionesJefatura(x)}
    </div>`;
  }

  function accionesJefatura(x){
    const bonoPend = estadoBono(x) === "PENDIENTE" && x.validacionBono && x.validacionBono.id;
    return `<div class="mv489-actions">
      <button class="mv489-btn ok" onclick="mv489Responsabilidad('${esc(x.clave)}','CORRESPONDE')">Confirmar ejecutora</button>
      <button class="mv489-btn warn" onclick="mv489AbrirReasignar('${esc(x.clave)}')">Reasignar</button>
      <button class="mv489-btn bad" onclick="mv489Responsabilidad('${esc(x.clave)}','ANULAR')">Anular</button>
      ${bonoPend ? `<button class="mv489-btn money" onclick="mv489ValidarBono('${esc(x.clave)}','BONO')">BONO</button><button class="mv489-btn bad" onclick="mv489ValidarBono('${esc(x.clave)}','NO BONO')">NO BONO</button>` : ""}
    </div>`;
  }

  function casoHTML(x){
    return `<details class="mv489-case">
      <summary>
        <div><span class="mv489-label">Ticket</span><span class="mv489-ticket">${esc(x.tipo || "")} · ${esc(x.ticket || "SIN TICKET")}</span></div>
        <div><span class="mv489-label">Cuadrilla</span><span class="mv489-value">${esc(x.cuadrillaEjecutora || "-")}</span></div>
        <div><span class="mv489-label">Sede</span><span class="mv489-value">${esc(x.sedeEjecutora || "-")}</span></div>
        <div class="mv489-more">${badgeEstado(x)}${badgeBono(x)} ▾ Detalle</div>
      </summary>
      ${detalleCaso(x)}
    </details>`;
  }

  function renderValidacion(){
    const cont = document.getElementById("mv489Contenido");
    const kpis = document.getElementById("mv489Kpis");
    if(!cont || !kpis) return;
    const lista = filtros();
    kpis.innerHTML = renderKpis(lista);
    if(!lista.length){ cont.innerHTML = `<div class="mv489-readonly">No hay casos para los filtros seleccionados.</div>`; return; }
    const grupos = {};
    lista.forEach(function(x){ const p=periodoItem(x); if(!grupos[p]) grupos[p]=[]; grupos[p].push(x); });
    cont.innerHTML = Object.keys(grupos).sort().reverse().map(function(p){
      const items = grupos[p].sort(function(a,b){ return txt(b.fechaISO || b.fecha).localeCompare(txt(a.fechaISO || a.fecha)); });
      return `<details class="mv489-month" open><summary><span>${esc(p)}</span><span>${items.length} casos</span></summary><div class="mv489-month-body">${items.map(casoHTML).join("")}</div></details>`;
    }).join("");
  }

  function pantallaValidacion(){
    const alcance = perfil() === "SUPERVISOR" ? (sede() || "su sede") : "Zona Norte";
    return `${typeof window.estiloValidacionTecnica === "function" ? window.estiloValidacionTecnica() : ""}${css()}
      <div class="mv489-wrap">
        <div style="margin-bottom:10px"><button class="mv489-btn alt" onclick="mostrarValidacionTecnica()">⬅ Volver a Validación Técnica</button></div>
        <div class="mv489-head"><h2>📡 VTR / GAR</h2><p>Registro y Validación en un solo submódulo. WIN es la fuente principal para la propuesta de responsabilidad.</p></div>
        ${tabsHTML("VALIDACION")}
        <div class="mv489-readonly"><b>Alcance:</b> ${esc(alcance)}. ${esJefatura() ? "Jefatura puede validar y tomar la decisión final." : "Vista de solo lectura. La decisión final corresponde a Jefatura."}</div>
        <div class="mv489-tools">
          <input id="mv489Buscar" type="search" placeholder="Buscar ticket, DNI, código o cuadrilla" oninput="mv489RenderValidacion()">
          <select id="mv489Tipo" onchange="mv489RenderValidacion()"><option value="">VTR y GAR</option><option value="VTR">VTR</option><option value="GAR">GAR</option></select>
          <select id="mv489Estado" onchange="mv489RenderValidacion()"><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="CONFIRMADO">Confirmado</option><option value="REASIGNADO">Reasignado</option><option value="ANULADO">Anulado</option></select>
          <select id="mv489Periodo" onchange="mv489RenderValidacion()"><option value="">Todos los periodos</option></select>
        </div>
        <div id="mv489Kpis"></div>
        <div id="mv489Contenido"><div class="mv489-readonly">Cargando casos VTR/GAR...</div></div>
      </div>`;
  }

  function cargarValidacion(){
    return api({accion:"listarGestionVtrGar",usuario:usuario()}).then(function(r){
      ESTADO.incidencias = Array.isArray(r.incidencias) ? r.incidencias : [];
      ESTADO.cuadrillas = Array.isArray(r.cuadrillas) ? r.cuadrillas : [];
      ESTADO.resumen = r.resumen || {};
      ESTADO.cargado = true;
      const sel = document.getElementById("mv489Periodo");
      if(sel){
        const ps = Array.from(new Set(ESTADO.incidencias.map(periodoItem).filter(Boolean))).sort().reverse();
        sel.innerHTML = `<option value="">Todos los periodos</option>` + ps.map(function(p){ return `<option value="${esc(p)}">${esc(p)}</option>`; }).join("");
      }
      renderValidacion();
    }).catch(function(e){
      const c=document.getElementById("mv489Contenido");
      if(c) c.innerHTML=`<div class="mv489-readonly"><b>No se pudo cargar Validación VTR/GAR.</b><br>${esc(e.message)}</div>`;
    });
  }

  window.mv489AbrirValidacionVtrGar = function(){
    if(!puedeVerValidacion() || esTecnico()) return;
    if(typeof window.mostrarPantalla !== "function") return;
    window.MV488_VT_MODO = "VTRGAR";
    window.mostrarPantalla(pantallaValidacion());
    cargarValidacion();
  };
  window.mv489RenderValidacion = renderValidacion;

  function buscar(clave){ return ESTADO.incidencias.find(function(x){ return txt(x.clave) === txt(clave); }); }
  function exigirJefatura(){ if(!esJefatura()){ alert("Solo Jefatura puede validar VTR/GAR."); return false; } return true; }

  window.mv489Responsabilidad = function(clave,decision){
    if(!exigirJefatura()) return;
    const x=buscar(clave); if(!x) return;
    const d=norm(decision);
    let obs="";
    if(d === "ANULAR"){
      obs=prompt("Motivo de anulación (obligatorio):","") || "";
      if(!txt(obs)) return alert("Ingrese el motivo de anulación.");
    }else if(!confirm(`¿Confirmar que ${x.cuadrillaEjecutora} es la cuadrilla responsable?`)) return;
    api({accion:"calificarIncidenciaVtrGar",usuario:usuario(),clave:x.clave,decision:d,observacion:obs}).then(cargarValidacion).catch(function(e){alert(e.message);});
  };

  window.mv489AbrirReasignar = function(clave){
    if(!exigirJefatura()) return;
    const x=buscar(clave); if(!x) return;
    const sugerida=txt(x.deteccionWin && x.deteccionWin.cuadrillaOrigen);
    const opciones=ESTADO.cuadrillas.map(function(c){ const v=txt(c.cuadrilla || c.nombre || c); return `<option value="${esc(v)}" ${v===sugerida?"selected":""}>${esc(v)}${c.sede?" · "+esc(c.sede):""}</option>`; }).join("");
    document.body.insertAdjacentHTML("beforeend",`<div id="mv489Modal" class="mv489-modal-bg"><div class="mv489-modal"><h3>Reasignar responsabilidad</h3><label>Cuadrilla responsable</label><select id="mv489Cuadrilla"><option value="">Seleccione...</option>${opciones}</select><label>Sustento</label><textarea id="mv489Obs"></textarea><div class="mv489-actions"><button class="mv489-btn ok" onclick="mv489GuardarReasignacion('${esc(clave)}')">Guardar</button><button class="mv489-btn alt" onclick="document.getElementById('mv489Modal').remove()">Cancelar</button></div></div></div>`);
  };

  window.mv489GuardarReasignacion = function(clave){
    if(!exigirJefatura()) return;
    const x=buscar(clave); if(!x) return;
    const cuadrilla=txt(document.getElementById("mv489Cuadrilla") && document.getElementById("mv489Cuadrilla").value);
    const obs=txt(document.getElementById("mv489Obs") && document.getElementById("mv489Obs").value);
    if(!cuadrilla) return alert("Seleccione la cuadrilla responsable.");
    if(!obs) return alert("Ingrese el sustento.");
    api({accion:"calificarIncidenciaVtrGar",usuario:usuario(),clave:x.clave,decision:"REASIGNAR",cuadrillaResponsable:cuadrilla,observacion:obs}).then(function(){ document.getElementById("mv489Modal")?.remove(); return cargarValidacion(); }).catch(function(e){alert(e.message);});
  };

  window.mv489ValidarBono = function(clave,resultado){
    if(!exigirJefatura()) return;
    const x=buscar(clave); const v=x && x.validacionBono;
    if(!v || !v.id) return alert("Este caso no tiene un registro de Validación Técnica asociado.");
    if(estadoBono(x) !== "PENDIENTE") return alert("Este registro ya fue validado.");
    const motivo=prompt(`Motivo para marcar ${resultado}:`,"") || "";
    if(!txt(motivo)) return alert("El motivo es obligatorio.");
    if(!confirm(`¿Confirmar ${resultado} para ${x.ticket}?`)) return;
    api({accion:"validarValidacionTecnica",usuario:usuario(),id:v.id,resultado:resultado,motivoValidacion:motivo}).then(cargarValidacion).catch(function(e){alert(e.message);});
  };

  function instalar(){
    if(instalado) return true;
    if(!window.MV488_VT_PORTAL_ACTIVO || typeof window.mv488AbrirVtrGar !== "function" || typeof window.mv488AbrirRecableado !== "function") return false;
    instalado = true;
    return true;
  }

  let intentos=0;
  const espera=setInterval(function(){
    intentos++;
    if(instalar() || intentos>100) clearInterval(espera);
  },100);
  instalar();
})();
