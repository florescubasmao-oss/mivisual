// MI VISUAL - Módulo Validación Técnica v60

const API_VALIDACION_TECNICA = "https://script.google.com/macros/s/AKfycbymVVBtL_UtjoGZKUcJNNy24MC96GMAPZ_Imlbw13rZdhSBew3WozxDZnkqqLSFVnFJ/exec";

function usuarioActualValidacion(){
    return {
        usuario: localStorage.getItem("usuario") || "",
        perfil: (localStorage.getItem("perfil") || "").toUpperCase(),
        cuadrilla: localStorage.getItem("cuadrilla") || "",
        sede: localStorage.getItem("sede") || "",
        plataforma: localStorage.getItem("plataforma") || ""
    };
}

function esJefaturaValidacion(perfil){
    const p = (perfil || "").toUpperCase();
    return p === "JEFATURA" || p === "ADMIN" || p === "ADMINISTRADOR";
}

async function apiValidacionTecnica(payload){
    const res = await fetch(API_VALIDACION_TECNICA, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch(e){ throw new Error(txt); }
}

function estiloValidacionTecnica(){
    return `<style id="styleValidacionTecnica">
    .vt-wrap{max-width:980px;margin:0 auto;padding:12px}
    .vt-header{background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;border-radius:22px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.18);margin-bottom:14px}
    .vt-header h2{margin:0;font-size:22px}
    .vt-header p{margin:6px 0 0;font-size:13px;opacity:.92}
    .vt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .vt-card{background:#fff;border-radius:18px;padding:14px;box-shadow:0 8px 20px rgba(15,23,42,.10);border:1px solid #e5e7eb;margin-bottom:12px}
    .vt-card h3{margin:0 0 12px;font-size:17px;color:#0f172a}
    .vt-field{margin-bottom:11px}
    .vt-field label{display:block;font-size:12px;font-weight:800;color:#334155;margin-bottom:5px;text-transform:uppercase;letter-spacing:.03em}
    .vt-field input,.vt-field select,.vt-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:11px;font-size:14px;background:#fff;outline:none}
    .vt-field textarea{min-height:95px;resize:vertical}
    .vt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .vt-btn{border:0;border-radius:13px;padding:11px 14px;font-weight:800;cursor:pointer;font-size:14px;background:#2563eb;color:white;box-shadow:0 7px 14px rgba(37,99,235,.20)}
    .vt-btn.secondary{background:#64748b}
    .vt-btn.ok{background:#16a34a}
    .vt-btn.warn{background:#f59e0b;color:#111827}
    .vt-btn.bad{background:#dc2626}
    .vt-btn.money{background:#0d9488}
    .vt-list{display:grid;gap:10px}
    .vt-item{background:#fff;border:1px solid #e5e7eb;border-radius:17px;padding:13px;box-shadow:0 7px 18px rgba(15,23,42,.08)}
    .vt-item-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
    .vt-id{font-weight:900;color:#0f172a;font-size:14px}
    .vt-sub{font-size:12px;color:#64748b;margin-top:3px;line-height:1.35}
    .vt-badge{font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px;white-space:nowrap;background:#e2e8f0;color:#334155}
    .vt-badge.PENDIENTE{background:#fef3c7;color:#92400e}
    .vt-badge.APROBADO{background:#dcfce7;color:#166534}
    .vt-badge.RECHAZADO{background:#fee2e2;color:#991b1b}
    .vt-badge.OBSERVADO{background:#ffedd5;color:#9a3412}
    .vt-badge.BONO{background:#dbeafe;color:#1d4ed8}
    .vt-badge.NO_BONO{background:#e5e7eb;color:#111827}
    .vt-badge.SIN_RESPUESTA{background:#f1f5f9;color:#475569}
    .vt-detail{display:none;margin-top:10px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:13px;color:#334155;line-height:1.55}
    .vt-detail b{color:#0f172a}
    .vt-confirm{background:#fff;border-radius:22px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.14);border:2px dashed #2563eb;text-align:left}
    .vt-confirm-title{text-align:center;font-size:20px;font-weight:900;color:#0f172a;margin-bottom:8px}
    .vt-confirm-id{text-align:center;font-size:24px;font-weight:900;color:#2563eb;margin-bottom:14px}
    .vt-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:14px;padding:12px;font-size:13px;margin:12px 0}
    .vt-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
    .vt-kpi{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:10px;text-align:center}
    .vt-kpi b{display:block;font-size:18px;color:#0f172a}
    .vt-kpi span{font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase}
    @media(max-width:640px){
        .vt-grid{grid-template-columns:1fr}
        .vt-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
        .vt-header{border-radius:18px;padding:15px}
        .vt-wrap{padding:8px}
        .vt-btn{width:100%}
    }
    </style>`;
}

function mostrarCargandoValidacion(texto){
    let overlay = document.getElementById("vtLoadingOverlay");
    if(!overlay){
        overlay = document.createElement("div");
        overlay.id = "vtLoadingOverlay";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:none;align-items:center;justify-content:center;";
        overlay.innerHTML = `<div style="background:white;border-radius:18px;padding:18px;min-width:210px;text-align:center;font-weight:800;color:#0f172a;">⏳ <span id="vtLoadingTexto">Procesando...</span></div>`;
        document.body.appendChild(overlay);
    }
    const t = document.getElementById("vtLoadingTexto");
    if(t) t.textContent = texto || "Procesando...";
    overlay.style.display = "flex";
}

function ocultarCargandoValidacion(){
    const overlay = document.getElementById("vtLoadingOverlay");
    if(overlay) overlay.style.display = "none";
}

function badgeValidacion(estado, estadoVisible){
    const txt = (estadoVisible || estado || "PENDIENTE").toString().toUpperCase();
    const cls = txt.replace(/\s+/g,"_");
    return `<span class="vt-badge ${cls}">${txt}</span>`;
}

function toggleNumeroTicketValidacion(){
    const tipo = document.getElementById("vtTipoTicket")?.value || "";
    const div = document.getElementById("vtNumeroTicketWrap");
    const input = document.getElementById("vtNumeroTicket");
    if(!div) return;
    if(tipo === "NO APLICA"){
        div.style.display = "none";
        if(input) input.value = "";
    }else{
        div.style.display = "block";
    }
}

function mostrarValidacionTecnica(){
    const u = usuarioActualValidacion();
    const puedeValidar = u.perfil === "SUPERVISOR" || esJefaturaValidacion(u.perfil);
    let html = `
    ${estiloValidacionTecnica()}
    <div class="vt-wrap">
        <div class="vt-header">
            <h2>📋 VALIDACIÓN TÉCNICA</h2>
            <p>Registro y control de recableados, GAR y VTR con trazabilidad operativa.</p>
        </div>`;

    if(u.perfil === "TECNICO"){
        html += renderFormularioValidacionTecnica();
    }

    if(puedeValidar){
        html += `<div class="vt-card">
            <h3>📌 Validaciones pendientes</h3>
            <div id="vtPendientes"></div>
        </div>`;
    }

    html += `<div class="vt-card">
        <h3>📚 Historial</h3>
        <div class="vt-actions" style="margin-bottom:10px">
            <select id="vtFiltroTipo" onchange="cargarValidacionesTecnicas()">
                <option value="">Todos los tipos</option>
                <option value="RECABLEADO">Recableado</option>
                <option value="GAR">GAR</option>
                <option value="VTR">VTR</option>
            </select>
            <select id="vtFiltroEstado" onchange="cargarValidacionesTecnicas()">
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="OBSERVADO">Observado</option>
                <option value="SIN RESPUESTA">Sin respuesta</option>
                <option value="BONO">Bono</option>
                <option value="NO BONO">No bono</option>
            </select>
            <button class="vt-btn secondary" onclick="cargarValidacionesTecnicas()">Actualizar</button>
        </div>
        <div id="vtHistorial"></div>
    </div></div>`;

    mostrarPantalla(html);
    setTimeout(cargarValidacionesTecnicas, 200);
}

function renderFormularioValidacionTecnica(){
    return `<div class="vt-card">
        <h3>➕ Nueva solicitud</h3>
        <div class="vt-grid">
            <div class="vt-field">
                <label>Tipo de validación</label>
                <select id="vtTipoValidacion">
                    <option value="RECABLEADO">RECABLEADO</option>
                    <option value="GAR">GAR</option>
                    <option value="VTR">VTR</option>
                </select>
            </div>
            <div class="vt-field">
                <label>Código</label>
                <input id="vtCodigo" type="text" placeholder="Ejemplo: 3030002">
            </div>
            <div class="vt-field">
                <label>Tipo de ticket</label>
                <select id="vtTipoTicket" onchange="toggleNumeroTicketValidacion()">
                    <option value="AT-">AT-</option>
                    <option value="VTEXT-">VTEXT-</option>
                    <option value="GAR-">GAR-</option>
                    <option value="VTR-">VTR-</option>
                    <option value="NO APLICA">NO APLICA</option>
                </select>
            </div>
            <div class="vt-field" id="vtNumeroTicketWrap">
                <label>Número de ticket</label>
                <input id="vtNumeroTicket" type="text" inputmode="numeric" placeholder="Ejemplo: 458796">
            </div>
            <div class="vt-field">
                <label>DNI Cliente</label>
                <input id="vtDniCliente" type="text" inputmode="numeric" placeholder="DNI del cliente">
            </div>
        </div>
        <div class="vt-field">
            <label>Motivo</label>
            <textarea id="vtMotivo" placeholder="Describe el motivo técnico de la solicitud..."></textarea>
        </div>
        <div class="vt-actions">
            <button class="vt-btn" onclick="guardarValidacionTecnica(this)">Guardar solicitud</button>
        </div>
    </div>`;
}

async function guardarValidacionTecnica(btn){
    const u = usuarioActualValidacion();
    const tipoValidacion = document.getElementById("vtTipoValidacion")?.value || "";
    const codigo = document.getElementById("vtCodigo")?.value.trim() || "";
    const tipoTicket = document.getElementById("vtTipoTicket")?.value || "";
    const numeroTicket = document.getElementById("vtNumeroTicket")?.value.trim() || "";
    const dniCliente = document.getElementById("vtDniCliente")?.value.trim() || "";
    const motivo = document.getElementById("vtMotivo")?.value.trim() || "";

    if(!codigo || !tipoValidacion || !tipoTicket || !dniCliente || !motivo){
        alert("Completa todos los campos obligatorios.");
        return;
    }
    if(tipoTicket !== "NO APLICA" && !numeroTicket){
        alert("Ingresa el número de ticket o selecciona NO APLICA.");
        return;
    }

    try{
        if(btn){ btn.disabled = true; btn.innerHTML = "Guardando..."; }
        mostrarCargandoValidacion("Registrando solicitud...");
        const r = await apiValidacionTecnica({
            accion:"registrarValidacionTecnica",
            usuario:u.usuario,
            tipoValidacion,
            codigo,
            tipoTicket,
            numeroTicket,
            dniCliente,
            motivoTecnico: motivo
        });
        if(!r.ok) throw new Error(r.error || "No se pudo registrar");
        mostrarConfirmacionValidacionTecnica(r);
    }catch(e){
        alert("❌ " + e.message);
    }finally{
        ocultarCargandoValidacion();
        if(btn){ btn.disabled = false; btn.innerHTML = "Guardar solicitud"; }
    }
}

function safeValidacion(v){
    return (v === undefined || v === null || v === "") ? "-" : String(v)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function filaResumenValidacion(label, valor){
    return `<div class="vt-resumen-row"><span>${label}</span><b>${safeValidacion(valor)}</b></div>`;
}

function mostrarConfirmacionValidacionTecnica(r){
    const linkTelegram = r.linkTelegram || "";
    const sede = (r.sede || "").toString().toUpperCase();
    const html = `
    ${estiloValidacionTecnica()}
    <style>
        .vt-confirm{max-width:760px;margin:0 auto;color:#0f172a}
        .vt-confirm-title{font-size:22px}
        .vt-confirm-id{font-size:24px;margin-bottom:10px}
        .vt-resumen{background:#f8fafc;border:1px solid #dbeafe;border-radius:16px;padding:12px;margin-top:12px}
        .vt-resumen-row{display:grid;grid-template-columns:165px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
        .vt-resumen-row:last-child{border-bottom:0}
        .vt-resumen-row span{font-weight:900;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.03em}
        .vt-resumen-row b{color:#0f172a;word-break:break-word;line-height:1.35}
        .vt-motivo-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-top:10px;color:#0f172a;line-height:1.45;white-space:pre-wrap}
        .vt-estado-final{background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:14px;padding:12px;margin:12px 0;font-weight:900}
        .vt-telegram-box{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:14px;padding:12px;font-size:13px;margin:12px 0;line-height:1.45}
        .vt-telegram-link{display:block;margin-top:8px;font-weight:900;color:#1d4ed8;word-break:break-all}
        @media(max-width:640px){.vt-resumen-row{grid-template-columns:1fr;gap:3px}}
    </style>
    <div class="vt-wrap">
        <div class="vt-confirm">
            <div class="vt-confirm-title">VALIDACIÓN TÉCNICA</div>
            <div class="vt-confirm-id">${safeValidacion(r.id)}</div>

            <div class="vt-resumen">
                ${filaResumenValidacion("Fecha registro", r.fecha)}
                ${filaResumenValidacion("Hora registro", r.hora)}
                ${filaResumenValidacion("Técnico", r.tecnico)}
                ${filaResumenValidacion("Sede", r.sede)}
                ${filaResumenValidacion("Cuadrilla", r.cuadrilla)}
                ${filaResumenValidacion("Tipo validación", r.tipoValidacion)}
                ${filaResumenValidacion("Código", r.codigo)}
                ${filaResumenValidacion("Ticket", r.ticketFinal)}
                ${filaResumenValidacion("DNI cliente", r.dniCliente)}
            </div>

            <div style="margin-top:12px;font-weight:900;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.03em">Motivo técnico</div>
            <div class="vt-motivo-box">${safeValidacion(r.motivoTecnico)}</div>

            <div class="vt-estado-final">Estado: 🟡 PENDIENTE</div>

            <div class="vt-telegram-box">
                📲 Tome un pantallazo de este registro y envíelo junto con el video al grupo oficial de Telegram de ${safeValidacion(sede)}.
                ${linkTelegram ? `<span class="vt-telegram-link">${safeValidacion(linkTelegram)}</span>` : ""}
            </div>

            <div class="vt-actions">
                ${linkTelegram ? `<button class="vt-btn money" onclick="window.open('${linkTelegram}','_blank')">📨 Abrir Grupo Telegram</button>` : ""}
                <button class="vt-btn secondary" onclick="mostrarValidacionTecnica()">Finalizar</button>
            </div>
        </div>
    </div>`;
    mostrarPantalla(html);
}

async function cargarValidacionesTecnicas(){
    const u = usuarioActualValidacion();
    const filtroTipo = document.getElementById("vtFiltroTipo")?.value || "";
    const filtroEstado = document.getElementById("vtFiltroEstado")?.value || "";

    try{
        mostrarCargandoValidacion("Cargando validaciones...");
        const r = await apiValidacionTecnica({
            accion:"listarValidacionTecnica",
            usuario:u.usuario,
            tipoValidacion:filtroTipo,
            estado:filtroEstado
        });
        if(!r.ok) throw new Error(r.error || "No se pudo listar");

        const pendientes = (r.validaciones || []).filter(x => (x.estado || "").toUpperCase() === "PENDIENTE");
        const pendientesEl = document.getElementById("vtPendientes");
        if(pendientesEl){
            pendientesEl.innerHTML = pendientes.length ? renderListaValidaciones(pendientes, true) : `<div class="vt-sub">No hay validaciones pendientes.</div>`;
        }

        const histEl = document.getElementById("vtHistorial");
        if(histEl){
            histEl.innerHTML = (r.validaciones || []).length ? renderResumenValidaciones(r.validaciones) + renderListaValidaciones(r.validaciones, false) : `<div class="vt-sub">Sin registros.</div>`;
        }
    }catch(e){
        const histEl = document.getElementById("vtHistorial");
        if(histEl) histEl.innerHTML = `<div class="vt-sub">❌ ${e.message}</div>`;
    }finally{
        ocultarCargandoValidacion();
    }
}

function renderResumenValidaciones(lista){
    const c = {PENDIENTE:0, APROBADO:0, RECHAZADO:0, OBSERVADO:0, BONO:0, "NO BONO":0, "SIN RESPUESTA":0};
    lista.forEach(x => {
        const e = (x.estado || "").toUpperCase();
        if(c[e] !== undefined) c[e]++;
    });
    return `<div class="vt-kpis">
        <div class="vt-kpi"><b>${lista.length}</b><span>Total</span></div>
        <div class="vt-kpi"><b>${c.PENDIENTE}</b><span>Pendientes</span></div>
        <div class="vt-kpi"><b>${c.APROBADO + c["SIN RESPUESTA"]}</b><span>Aprobados</span></div>
        <div class="vt-kpi"><b>${c.BONO}</b><span>Bono</span></div>
        <div class="vt-kpi"><b>${c["NO BONO"]}</b><span>No bono</span></div>
        <div class="vt-kpi"><b>${c.OBSERVADO}</b><span>Observados</span></div>
    </div>`;
}

function renderListaValidaciones(lista, soloPendientes){
    const u = usuarioActualValidacion();
    return `<div class="vt-list">` + lista.map((item, idx) => renderItemValidacion(item, idx, u, soloPendientes)).join("") + `</div>`;
}

function renderItemValidacion(item, idx, u, soloPendientes){
    const esTecnico = u.perfil === "TECNICO";
    const estadoMostrar = esTecnico ? (item.estadoVisibleTecnico || item.estado) : item.estado;
    const resMostrar = esTecnico ? (item.resultadoVisibleTecnico || item.resultadoFinal) : item.resultadoFinal;
    const detalleId = "vtDet_" + (item.id || idx).replace(/[^A-Za-z0-9]/g,"_") + "_" + idx;
    const pendiente = (item.estado || "").toUpperCase() === "PENDIENTE";
    const puedeValidar = puedeValidarItemValidacion(item, u) && pendiente;

    return `<div class="vt-item">
        <div class="vt-item-top">
            <div>
                <div class="vt-id">${item.id}</div>
                <div class="vt-sub">${item.tipoValidacion} · ${item.cuadrilla}<br>${item.fechaRegistro || ""} ${item.horaRegistro || ""}</div>
            </div>
            ${badgeValidacion(item.estado, estadoMostrar)}
        </div>
        <div class="vt-actions">
            <button class="vt-btn secondary" onclick="document.getElementById('${detalleId}').style.display = document.getElementById('${detalleId}').style.display === 'block' ? 'none' : 'block'">Ver detalle</button>
            ${puedeValidar ? botonesValidacion(item) : ""}
        </div>
        <div id="${detalleId}" class="vt-detail">
            <b>Código:</b> ${item.codigo || "-"}<br>
            <b>Ticket:</b> ${item.ticketFinal || "-"}<br>
            <b>DNI:</b> ${item.dniCliente || "-"}<br>
            <b>Motivo técnico:</b> ${item.motivoTecnico || "-"}<br>
            <b>Resultado:</b> ${resMostrar || "-"}<br>
            <b>Validado por:</b> ${item.validadoPor || "-"}<br>
            <b>Motivo validación:</b> ${item.motivoValidacion || "-"}<br>
            ${item.horaLimite ? `<b>Hora límite:</b> ${item.horaLimite}<br>` : ""}
            ${item.linkTelegram ? `<button class="vt-btn money" style="margin-top:8px" onclick="window.open('${item.linkTelegram}','_blank')">📨 Abrir Telegram</button>` : ""}
        </div>
    </div>`;
}

function puedeValidarItemValidacion(item, u){
    const tipo = (item.tipoValidacion || "").toUpperCase();
    if(tipo === "RECABLEADO") return u.perfil === "SUPERVISOR" || esJefaturaValidacion(u.perfil);
    if(tipo === "GAR" || tipo === "VTR") return esJefaturaValidacion(u.perfil);
    return false;
}

function botonesValidacion(item){
    const tipo = (item.tipoValidacion || "").toUpperCase();
    if(tipo === "RECABLEADO"){
        return `<button class="vt-btn ok" onclick="abrirValidarTecnica('${item.id}','APROBADO')">Aprobar</button>
                <button class="vt-btn warn" onclick="abrirValidarTecnica('${item.id}','OBSERVADO')">Observar</button>
                <button class="vt-btn bad" onclick="abrirValidarTecnica('${item.id}','RECHAZADO')">Rechazar</button>`;
    }
    if(tipo === "GAR" || tipo === "VTR"){
        return `<button class="vt-btn money" onclick="abrirValidarTecnica('${item.id}','BONO')">Bono</button>
                <button class="vt-btn bad" onclick="abrirValidarTecnica('${item.id}','NO BONO')">No Bono</button>`;
    }
    return "";
}

async function abrirValidarTecnica(id, resultado){
    const motivo = prompt("Ingrese el motivo para: " + resultado);
    if(!motivo || !motivo.trim()){
        alert("El motivo es obligatorio.");
        return;
    }

    const u = usuarioActualValidacion();

    try{
        mostrarCargandoValidacion("Guardando validación...");
        const r = await apiValidacionTecnica({
            accion:"validarValidacionTecnica",
            usuario:u.usuario,
            id,
            resultado,
            motivoValidacion: motivo.trim()
        });
        if(!r.ok) throw new Error(r.error || "No se pudo validar");
        alert("✅ Validación actualizada");
        cargarValidacionesTecnicas();
    }catch(e){
        alert("❌ " + e.message);
    }finally{
        ocultarCargandoValidacion();
    }
}
