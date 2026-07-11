// MI VISUAL - Módulo Validación Técnica v60.3

const API_VALIDACION_TECNICA = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

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
    .vt-confirm-title{text-align:center;font-size:20px;font-weight:900;color:#0f172a;margin-bottom:6px}
    .vt-confirm-id{text-align:center;font-size:24px;font-weight:900;color:#2563eb;margin-bottom:14px}
    .vt-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:14px;padding:12px;font-size:13px;margin:12px 0}
    .vt-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
    .vt-kpi{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:10px;text-align:center}
    .vt-kpi b{display:block;font-size:18px;color:#0f172a}
    .vt-kpi span{font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase}
    .vt-history-tools{display:grid;grid-template-columns:minmax(180px,1fr) auto auto auto;gap:8px;align-items:center;margin-bottom:10px}
    .vt-search{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:11px;font-size:14px;background:#fff;outline:none}
    .vt-group{border:1px solid #dbe3ee;border-radius:14px;background:#f8fafc;margin-top:10px;overflow:hidden}
    .vt-group summary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:900;color:#0f172a;display:flex;justify-content:space-between;align-items:center;background:#eef4fb}
    .vt-group summary::-webkit-details-marker{display:none}
    .vt-group summary::after{content:"▼";font-size:11px;color:#64748b;transition:transform .2s ease}
    .vt-group[open] summary::after{transform:rotate(180deg)}
    .vt-group-body{padding:10px}
    .vt-header-row{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .vt-report-btn{background:#fff;color:#1d4ed8;box-shadow:none;border:1px solid rgba(255,255,255,.75);white-space:nowrap}
    .vt-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:10020;display:flex;align-items:center;justify-content:center;padding:14px}
    .vt-modal{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:16px;box-shadow:0 22px 60px rgba(15,23,42,.28)}
    .vt-modal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
    .vt-modal-head h3{margin:0;font-size:18px;color:#0f172a}
    .vt-modal-close{border:0;background:#e2e8f0;color:#334155;width:34px;height:34px;border-radius:10px;font-size:18px;font-weight:900;cursor:pointer}
    .vt-report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .vt-report-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:12px;padding:10px;font-size:12px;line-height:1.45;margin-top:10px}
    @media(max-width:640px){
        .vt-grid{grid-template-columns:1fr}
        .vt-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
        .vt-history-tools{grid-template-columns:1fr 1fr}
        .vt-history-tools .vt-search{grid-column:1/-1}
        .vt-header{border-radius:18px;padding:15px}
        .vt-header-row{align-items:flex-start;flex-direction:column}
        .vt-report-btn{width:100%}
        .vt-report-grid{grid-template-columns:1fr}
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

function obtenerTipoValidacionPorTicket(tipoTicket){
    const tipo = (tipoTicket || "").toUpperCase().trim();
    if(tipo === "AT-" || tipo === "VTEXT-") return "RECABLEADO";
    if(tipo === "GAR-") return "GAR";
    if(tipo === "VTR-") return "VTR";
    if(tipo === "NO APLICA") return "OTRO";
    return "";
}

function actualizarTipoValidacionPorTicket(){
    const tipoTicket = document.getElementById("vtTipoTicket")?.value || "";
    const tipoValidacion = document.getElementById("vtTipoValidacion");
    const numeroWrap = document.getElementById("vtNumeroTicketWrap");
    const numeroInput = document.getElementById("vtNumeroTicket");
    const motivoLabel = document.getElementById("vtMotivoLabel");
    const motivo = document.getElementById("vtMotivo");

    if(tipoValidacion){
        tipoValidacion.value = obtenerTipoValidacionPorTicket(tipoTicket);
    }

    const esOtro = tipoTicket === "NO APLICA";

    if(numeroWrap){
        numeroWrap.style.display = esOtro ? "none" : "block";
    }

    if(esOtro && numeroInput){
        numeroInput.value = "";
    }

    if(motivoLabel){
        motivoLabel.textContent = esOtro ? "Descripción del caso" : "Motivo";
    }

    if(motivo){
        motivo.placeholder = esOtro
            ? "Describe obligatoriamente el caso especial..."
            : "Describe el motivo técnico de la solicitud...";
    }
}

function toggleNumeroTicketValidacion(){
    actualizarTipoValidacionPorTicket();
}

function mostrarValidacionTecnica(){
    const u = usuarioActualValidacion();
    const puedeValidar = u.perfil === "SUPERVISOR" || esJefaturaValidacion(u.perfil);
    let html = `
    ${estiloValidacionTecnica()}
    <div class="vt-wrap">
        <div class="vt-header">
            <div class="vt-header-row">
                <div>
                    <h2>📋 VALIDACIÓN TÉCNICA</h2>
                    <p>Registro y control de recableados, GAR y VTR con trazabilidad operativa.</p>
                </div>
                ${esJefaturaValidacion(u.perfil) ? `<button class="vt-btn vt-report-btn" onclick="abrirInformeValidacionTecnica()">📥 Descargar informe</button>` : ""}
            </div>
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
        <div class="vt-history-tools">
            <input id="vtBuscarCodigo" class="vt-search" type="search" placeholder="🔍 Buscar por código" oninput="renderHistorialValidacionLocal()">
            <select id="vtFiltroTipo" onchange="renderHistorialValidacionLocal()">
                <option value="">Todos los tipos</option>
                <option value="RECABLEADO">Recableado</option>
                <option value="GAR">GAR</option>
                <option value="VTR">VTR</option>
                <option value="OTRO">Otro</option>
            </select>
            <select id="vtFiltroEstado" onchange="renderHistorialValidacionLocal()">
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
    setTimeout(() => {
        actualizarTipoValidacionPorTicket();
        cargarValidacionesTecnicas();
    }, 200);
}

function renderFormularioValidacionTecnica(){
    return `<div class="vt-card">
        <h3>➕ Nueva solicitud</h3>
        <div class="vt-grid">
            <div class="vt-field">
                <label>Tipo de ticket</label>
                <select id="vtTipoTicket" onchange="actualizarTipoValidacionPorTicket()">
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
                <label>Tipo de validación</label>
                <input id="vtTipoValidacion" type="text" value="RECABLEADO" readonly aria-readonly="true">
            </div>
            <div class="vt-field">
                <label>Código</label>
                <input id="vtCodigo" type="text" placeholder="Ejemplo: 3030002">
            </div>
            <div class="vt-field">
                <label>DNI Cliente</label>
                <input id="vtDniCliente" type="text" inputmode="numeric" placeholder="DNI del cliente">
            </div>
        </div>
        <div class="vt-field">
            <label id="vtMotivoLabel">Motivo</label>
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

async function copiarTextoReporteValidacion(){
    const bloque = document.getElementById("vtTextoReporte");
    if(!bloque) return;

    const texto = bloque.innerText.trim();

    try{
        if(navigator.clipboard && window.isSecureContext){
            await navigator.clipboard.writeText(texto);
        }else{
            const temporal = document.createElement("textarea");
            temporal.value = texto;
            temporal.style.position = "fixed";
            temporal.style.opacity = "0";
            document.body.appendChild(temporal);
            temporal.focus();
            temporal.select();
            document.execCommand("copy");
            temporal.remove();
        }
        alert("✅ Texto copiado correctamente.");
    }catch(e){
        alert("No se pudo copiar automáticamente. Mantenga presionado el texto y seleccione Copiar.");
    }
}

function mostrarConfirmacionValidacionTecnica(r){
    const linkTelegram = r.linkTelegram || "";
    const sede = (r.sede || "").toString().toUpperCase();
    const html = `
    ${estiloValidacionTecnica()}
    <style>
        .vt-confirm{max-width:480px;margin:0 auto;color:#0f172a;padding:12px;border-radius:18px}
        .vt-confirm-title{font-size:17px;margin-bottom:3px}
        .vt-confirm-id{font-size:19px;margin-bottom:5px}
        .vt-resumen{background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:7px 9px;margin-top:6px}
        .vt-resumen-row{display:grid;grid-template-columns:145px 1fr;gap:8px;padding:4px 0;border-bottom:1px solid #e2e8f0;font-size:12px}
        .vt-resumen-row:last-child{border-bottom:0}
        .vt-resumen-row span{font-weight:900;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.03em}
        .vt-resumen-row b{color:#0f172a;word-break:break-word;line-height:1.35}
        .vt-motivo-box{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:7px;margin-top:4px;color:#0f172a;line-height:1.35;white-space:pre-wrap;font-size:13px}
        .vt-estado-final{background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:7px;margin:7px 0;font-weight:900;font-size:12px}
        .vt-reporte-box{background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:8px;margin:7px 0}
        .vt-reporte-title{font-size:12px;font-weight:900;color:#334155;text-transform:uppercase;margin-bottom:8px}
        .vt-reporte-texto{background:#fff;border:1px dashed #94a3b8;border-radius:9px;padding:8px;white-space:pre-line;font-size:13px;font-weight:800;line-height:1.55;color:#0f172a}
        .vt-reporte-ayuda{font-size:12px;color:#475569;line-height:1.45;margin-top:6px}
        .vt-telegram-box{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:10px;padding:7px;font-size:11px;margin:7px 0;line-height:1.4}
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

            <div style="margin-top:8px;font-weight:900;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.03em">Motivo técnico</div>
            <div class="vt-motivo-box">${safeValidacion(r.motivoTecnico)}</div>

            <div class="vt-estado-final">Estado: 🟡 PENDIENTE</div>

            <div class="vt-reporte-box">
                <div class="vt-reporte-title">📋 Texto para reportar</div>
                <div id="vtTextoReporte" class="vt-reporte-texto">Código: ${safeValidacion(r.codigo)}
Ticket: ${safeValidacion(r.ticketFinal)}
Tipo de validación: ${safeValidacion(r.tipoValidacion)}</div>
                <button class="vt-btn primary" style="margin-top:7px;width:100%;padding:9px 12px" onclick="copiarTextoReporteValidacion()">📋 Copiar texto</button>
                <div class="vt-reporte-ayuda"><b>Indicación:</b> Copie el texto, tome una captura de esta pantalla y reporte ambos junto con sus evidencias en el grupo de Telegram de su sede.</div>
            </div>

            <div class="vt-telegram-box">
                📲 Use el botón inferior para acceder al grupo oficial de Telegram de ${safeValidacion(sede)}.
            </div>

            <div class="vt-actions">
                ${linkTelegram ? `<button class="vt-btn money" onclick="window.open('${linkTelegram}','_blank')">📲 Ir al grupo de Telegram</button>` : ""}
                <button class="vt-btn secondary" onclick="mostrarValidacionTecnica()">Finalizar</button>
            </div>
        </div>
    </div>`;
    mostrarPantalla(html);
}

async function cargarValidacionesTecnicas(){
    const u = usuarioActualValidacion();

    try{
        mostrarCargandoValidacion("Cargando validaciones...");
        const r = await apiValidacionTecnica({
            accion:"listarValidacionTecnica",
            usuario:u.usuario
        });
        if(!r.ok) throw new Error(r.error || "No se pudo listar");

        window.vtValidacionesActuales = r.validaciones || [];

        const pendientes = window.vtValidacionesActuales.filter(x => (x.estado || "").toUpperCase() === "PENDIENTE");
        const pendientesEl = document.getElementById("vtPendientes");
        if(pendientesEl){
            pendientesEl.innerHTML = pendientes.length
                ? renderListaValidaciones(pendientes, true)
                : `<div class="vt-sub">No hay validaciones pendientes.</div>`;
        }

        renderHistorialValidacionLocal();
    }catch(e){
        const histEl = document.getElementById("vtHistorial");
        if(histEl) histEl.innerHTML = `<div class="vt-sub">❌ ${e.message}</div>`;
    }finally{
        ocultarCargandoValidacion();
    }
}

function renderHistorialValidacionLocal(){
    const histEl = document.getElementById("vtHistorial");
    if(!histEl) return;

    const u = usuarioActualValidacion();
    const todas = Array.isArray(window.vtValidacionesActuales) ? window.vtValidacionesActuales : [];
    const filtroTipo = (document.getElementById("vtFiltroTipo")?.value || "").toUpperCase();
    const filtroEstado = (document.getElementById("vtFiltroEstado")?.value || "").toUpperCase();
    const buscarCodigo = (document.getElementById("vtBuscarCodigo")?.value || "").trim().toUpperCase();
    const esGestion = u.perfil === "SUPERVISOR" || esJefaturaValidacion(u.perfil);

    let lista = esGestion
        ? todas.filter(x => (x.estado || "").toUpperCase() !== "PENDIENTE")
        : todas.slice();

    if(filtroTipo){
        lista = lista.filter(x => (x.tipoValidacion || "").toUpperCase() === filtroTipo);
    }
    if(filtroEstado){
        lista = lista.filter(x => (x.estado || "").toUpperCase() === filtroEstado);
    }
    if(buscarCodigo){
        lista = lista.filter(x => String(x.codigo || "").toUpperCase().includes(buscarCodigo));
    }

    if(!todas.length){
        histEl.innerHTML = `<div class="vt-sub">Sin registros.</div>`;
        return;
    }

    const resumen = renderResumenValidaciones(todas);
    const contenido = esGestion
        ? renderHistorialAgrupadoValidacion(lista)
        : (lista.length ? renderListaValidaciones(lista, false) : `<div class="vt-sub">No hay registros para mostrar.</div>`);

    histEl.innerHTML = resumen + contenido;
}

function renderHistorialAgrupadoValidacion(lista){
    const orden = ["RECABLEADO", "VTR", "GAR", "OTRO"];
    const etiquetas = {RECABLEADO:"RECABLEADO", VTR:"VTR", GAR:"GAR", OTRO:"OTRO"};
    const grupos = {};
    orden.forEach(t => grupos[t] = []);

    lista.forEach(item => {
        const tipo = (item.tipoValidacion || "OTRO").toUpperCase();
        if(!grupos[tipo]) grupos[tipo] = [];
        grupos[tipo].push(item);
    });

    return orden
        .filter(tipo => tipo !== "OTRO" || grupos[tipo].length > 0)
        .map(tipo => {
            const items = grupos[tipo] || [];
            return `<details class="vt-group">
                <summary><span>${etiquetas[tipo]} (${items.length})</span></summary>
                <div class="vt-group-body">
                    ${items.length ? renderListaValidaciones(items, false) : `<div class="vt-sub">Sin registros.</div>`}
                </div>
            </details>`;
        }).join("");
}

function renderResumenValidaciones(lista){
    const u = usuarioActualValidacion();
    const c = {PENDIENTE:0, APROBADO:0, RECHAZADO:0, OBSERVADO:0, BONO:0, "NO BONO":0, "SIN RESPUESTA":0};
    lista.forEach(x => {
        const e = (x.estado || "").toUpperCase();
        if(c[e] !== undefined) c[e]++;
    });

    const totalAprobados = c.APROBADO + c["SIN RESPUESTA"];
    const esGestion = u.perfil === "SUPERVISOR" || esJefaturaValidacion(u.perfil);

    if(esGestion){
        return `<div class="vt-kpis">
            <div class="vt-kpi"><b>${lista.length}</b><span>Total</span></div>
            <div class="vt-kpi"><b>${c.PENDIENTE}</b><span>Pendientes</span></div>
            <div class="vt-kpi"><b>${totalAprobados}</b><span>Aprobados</span></div>
            <div class="vt-kpi"><b>${c.OBSERVADO}</b><span>Observados</span></div>
            <div class="vt-kpi"><b>${c.RECHAZADO}</b><span>Rechazados</span></div>
            <div class="vt-kpi"><b>${c["SIN RESPUESTA"]}</b><span>Automáticos</span></div>
            <div class="vt-kpi"><b>${c.BONO}</b><span>Bono</span></div>
            <div class="vt-kpi"><b>${c["NO BONO"]}</b><span>No bono</span></div>
        </div>`;
    }

    return `<div class="vt-kpis">
        <div class="vt-kpi"><b>${lista.length}</b><span>Total</span></div>
        <div class="vt-kpi"><b>${c.PENDIENTE}</b><span>Pendientes</span></div>
        <div class="vt-kpi"><b>${totalAprobados}</b><span>Aprobados</span></div>
        <div class="vt-kpi"><b>${c.OBSERVADO}</b><span>Observados</span></div>
        <div class="vt-kpi"><b>${c.RECHAZADO}</b><span>Rechazados</span></div>
        <div class="vt-kpi"><b>${c["SIN RESPUESTA"]}</b><span>Automáticos</span></div>
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
    const puedeValidar = soloPendientes && puedeValidarItemValidacion(item, u) && pendiente;

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
    if(tipo === "OTRO") return u.perfil === "SUPERVISOR" || esJefaturaValidacion(u.perfil);
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
    if(tipo === "OTRO"){
        return `<button class="vt-btn ok" onclick="abrirValidarTecnica('${item.id}','APROBADO')">Aprobar</button>
                <button class="vt-btn warn" onclick="abrirValidarTecnica('${item.id}','OBSERVADO')">Observar</button>
                <button class="vt-btn bad" onclick="abrirValidarTecnica('${item.id}','RECHAZADO')">Rechazar</button>`;
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


/* =========================
   INFORME EXCEL - SOLO JEFATURA
========================= */

function abrirInformeValidacionTecnica(){
    const u = usuarioActualValidacion();
    if(!esJefaturaValidacion(u.perfil)){
        alert("Esta opción es exclusiva para Jefatura.");
        return;
    }

    if(!Array.isArray(window.vtValidacionesActuales) || !window.vtValidacionesActuales.length){
        alert("No hay registros cargados para generar el informe. Pulse Actualizar e inténtelo nuevamente.");
        return;
    }

    cerrarInformeValidacionTecnica();
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    const modal = document.createElement("div");
    modal.id = "vtInformeModal";
    modal.className = "vt-modal-backdrop";
    modal.innerHTML = `
        <div class="vt-modal" role="dialog" aria-modal="true" aria-labelledby="vtInformeTitulo">
            <div class="vt-modal-head">
                <h3 id="vtInformeTitulo">📥 Informe de Validación Técnica</h3>
                <button class="vt-modal-close" onclick="cerrarInformeValidacionTecnica()" aria-label="Cerrar">×</button>
            </div>

            <div class="vt-report-grid">
                <div class="vt-field">
                    <label>Periodo</label>
                    <select id="vtInformePeriodo" onchange="actualizarCamposPeriodoInformeVT()">
                        <option value="TODO">Todo</option>
                        <option value="HOY">Hoy</option>
                        <option value="SEMANA">Últimos 7 días</option>
                        <option value="MES" selected>Mes actual</option>
                        <option value="RANGO">Rango de fechas</option>
                    </select>
                </div>
                <div class="vt-field">
                    <label>Sede</label>
                    <select id="vtInformeSede">
                        <option value="">Todas</option>
                        <option value="CHICLAYO">Chiclayo</option>
                        <option value="PIURA">Piura</option>
                        <option value="TRUJILLO">Trujillo</option>
                    </select>
                </div>
                <div class="vt-field">
                    <label>Tipo de validación</label>
                    <select id="vtInformeTipo">
                        <option value="">Todos</option>
                        <option value="RECABLEADO">Recableado</option>
                        <option value="GAR">GAR</option>
                        <option value="VTR">VTR</option>
                        <option value="OTRO">Otro</option>
                    </select>
                </div>
                <div class="vt-field">
                    <label>Estado / resultado</label>
                    <select id="vtInformeEstado">
                        <option value="">Todos</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="APROBADO">Aprobado</option>
                        <option value="OBSERVADO">Observado</option>
                        <option value="RECHAZADO">Rechazado</option>
                        <option value="AUTOMATICO">Automático</option>
                        <option value="BONO">Bono</option>
                        <option value="NO BONO">No bono</option>
                    </select>
                </div>
                <div class="vt-field vt-rango-fecha" style="display:none">
                    <label>Desde</label>
                    <input id="vtInformeDesde" type="date" value="${fmt(primerDia)}">
                </div>
                <div class="vt-field vt-rango-fecha" style="display:none">
                    <label>Hasta</label>
                    <input id="vtInformeHasta" type="date" value="${fmt(hoy)}">
                </div>
            </div>

            <div class="vt-report-note">
                El archivo incluirá: Detalle, Resumen Ejecutivo, Resumen por Sede y Resumen por Tipo.
            </div>

            <div class="vt-actions" style="justify-content:flex-end">
                <button class="vt-btn secondary" onclick="cerrarInformeValidacionTecnica()">Cancelar</button>
                <button class="vt-btn ok" onclick="generarInformeValidacionTecnicaExcel(this)">Generar Excel</button>
            </div>
        </div>`;

    modal.addEventListener("click", e => {
        if(e.target === modal) cerrarInformeValidacionTecnica();
    });
    document.body.appendChild(modal);
}

function cerrarInformeValidacionTecnica(){
    const modal = document.getElementById("vtInformeModal");
    if(modal) modal.remove();
}

function actualizarCamposPeriodoInformeVT(){
    const mostrar = (document.getElementById("vtInformePeriodo")?.value || "") === "RANGO";
    document.querySelectorAll(".vt-rango-fecha").forEach(el => el.style.display = mostrar ? "block" : "none");
}

function convertirFechaInformeVT(valor){
    if(valor instanceof Date && !isNaN(valor.getTime())){
        return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    }
    const texto = (valor || "").toString().trim();
    if(!texto) return null;
    let p = texto.split("/");
    if(p.length === 3){
        const f = new Date(Number(p[2]), Number(p[1])-1, Number(p[0]));
        return isNaN(f.getTime()) ? null : f;
    }
    p = texto.split("-");
    if(p.length === 3){
        const f = new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
        return isNaN(f.getTime()) ? null : f;
    }
    const f = new Date(texto);
    return isNaN(f.getTime()) ? null : new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

function estadoNormalizadoInformeVT(item){
    const estado = (item.estado || "").toString().toUpperCase().trim();
    const resultado = (item.resultadoFinal || "").toString().toUpperCase().trim();
    if(estado === "SIN RESPUESTA" || resultado.includes("AUTOM")) return "AUTOMATICO";
    return resultado || estado;
}

function filtrarInformeValidacionTecnica(){
    const periodo = document.getElementById("vtInformePeriodo")?.value || "TODO";
    const sede = (document.getElementById("vtInformeSede")?.value || "").toUpperCase();
    const tipo = (document.getElementById("vtInformeTipo")?.value || "").toUpperCase();
    const estadoFiltro = (document.getElementById("vtInformeEstado")?.value || "").toUpperCase();
    const desdeTxt = document.getElementById("vtInformeDesde")?.value || "";
    const hastaTxt = document.getElementById("vtInformeHasta")?.value || "";
    const hoy = new Date();
    const hoyCero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    let desde = null;
    let hasta = null;

    if(periodo === "HOY"){
        desde = hoyCero;
        hasta = hoyCero;
    }else if(periodo === "SEMANA"){
        desde = new Date(hoyCero);
        desde.setDate(desde.getDate()-6);
        hasta = hoyCero;
    }else if(periodo === "MES"){
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        hasta = hoyCero;
    }else if(periodo === "RANGO"){
        desde = convertirFechaInformeVT(desdeTxt);
        hasta = convertirFechaInformeVT(hastaTxt);
        if(!desde || !hasta) throw new Error("Seleccione correctamente el rango de fechas.");
        if(desde > hasta) throw new Error("La fecha Desde no puede ser mayor que la fecha Hasta.");
    }

    return (window.vtValidacionesActuales || []).filter(item => {
        if(sede && (item.sede || "").toString().toUpperCase() !== sede) return false;
        if(tipo && (item.tipoValidacion || "").toString().toUpperCase() !== tipo) return false;

        if(estadoFiltro){
            const estado = (item.estado || "").toString().toUpperCase();
            const resultado = (item.resultadoFinal || "").toString().toUpperCase();
            const normalizado = estadoNormalizadoInformeVT(item);
            if(estadoFiltro === "AUTOMATICO"){
                if(normalizado !== "AUTOMATICO") return false;
            }else if(estadoFiltro === "APROBADO"){
                if(!(estado === "APROBADO" || resultado === "APROBADO")) return false;
            }else if(!(estado === estadoFiltro || resultado === estadoFiltro || normalizado === estadoFiltro)){
                return false;
            }
        }

        if(desde || hasta){
            const fecha = convertirFechaInformeVT(item.fechaRegistro);
            if(!fecha) return false;
            if(desde && fecha < desde) return false;
            if(hasta && fecha > hasta) return false;
        }
        return true;
    });
}

function cargarLibreriaExcelVT(){
    if(window.XLSX) return Promise.resolve(window.XLSX);
    if(window.vtPromesaXlsx) return window.vtPromesaXlsx;

    window.vtPromesaXlsx = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        script.async = true;
        script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error("No se pudo iniciar el generador de Excel."));
        script.onerror = () => reject(new Error("No se pudo cargar el generador de Excel. Verifique su conexión a internet."));
        document.head.appendChild(script);
    });
    return window.vtPromesaXlsx;
}

function valorInformeVT(v){
    return v === undefined || v === null ? "" : v;
}

function crearConteoInformeVT(lista){
    const c = {total:lista.length, pendientes:0, aprobados:0, observados:0, rechazados:0, automaticos:0, bono:0, noBono:0};
    lista.forEach(item => {
        const estado = (item.estado || "").toString().toUpperCase();
        const resultado = (item.resultadoFinal || "").toString().toUpperCase();
        if(estado === "PENDIENTE") c.pendientes++;
        if(estado === "APROBADO" || resultado === "APROBADO") c.aprobados++;
        if(estado === "OBSERVADO" || resultado === "OBSERVADO") c.observados++;
        if(estado === "RECHAZADO" || resultado === "RECHAZADO") c.rechazados++;
        if(estado === "SIN RESPUESTA" || resultado.includes("AUTOM")) c.automaticos++;
        if(resultado === "BONO" || estado === "BONO") c.bono++;
        if(resultado === "NO BONO" || estado === "NO BONO") c.noBono++;
    });
    return c;
}

function prepararHojaExcelVT(XLSX, filas, anchos, autofiltro){
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = anchos.map(w => ({wch:w}));
    if(autofiltro && filas.length > 1){
        ws["!autofilter"] = {ref:`A1:${XLSX.utils.encode_col(filas[0].length-1)}${filas.length}`};
    }
    return ws;
}

async function generarInformeValidacionTecnicaExcel(btn){
    const u = usuarioActualValidacion();
    if(!esJefaturaValidacion(u.perfil)){
        alert("Esta opción es exclusiva para Jefatura.");
        return;
    }

    try{
        if(btn){ btn.disabled = true; btn.textContent = "Generando..."; }
        mostrarCargandoValidacion("Generando informe Excel...");
        const lista = filtrarInformeValidacionTecnica();
        if(!lista.length) throw new Error("No existen registros con los filtros seleccionados.");
        const XLSX = await cargarLibreriaExcelVT();
        const wb = XLSX.utils.book_new();

        const detalle = [[
            "FECHA", "HORA", "SEDE", "CUADRILLA", "TECNICO", "CODIGO",
            "TIPO VALIDACION", "TIPO TICKET", "N° TICKET", "TICKET FINAL",
            "DNI", "ESTADO", "RESULTADO", "VALIDADO POR", "PERFIL VALIDADOR",
            "FECHA VALIDACION", "HORA VALIDACION", "MOTIVO TECNICO", "MOTIVO VALIDACION"
        ]];
        lista.forEach(x => detalle.push([
            valorInformeVT(x.fechaRegistro), valorInformeVT(x.horaRegistro), valorInformeVT(x.sede),
            valorInformeVT(x.cuadrilla), valorInformeVT(x.tecnico), valorInformeVT(x.codigo),
            valorInformeVT(x.tipoValidacion), valorInformeVT(x.tipoTicket), valorInformeVT(x.numeroTicket),
            valorInformeVT(x.ticketFinal), valorInformeVT(x.dniCliente), valorInformeVT(x.estado),
            valorInformeVT(x.resultadoFinal), valorInformeVT(x.validadoPor), valorInformeVT(x.perfilValidador),
            valorInformeVT(x.fechaValidacion), valorInformeVT(x.horaValidacion), valorInformeVT(x.motivoTecnico),
            valorInformeVT(x.motivoValidacion)
        ]));
        XLSX.utils.book_append_sheet(wb, prepararHojaExcelVT(XLSX, detalle,
            [12,11,13,36,20,14,18,14,14,20,13,15,20,20,18,17,17,42,42], true), "DETALLE VALIDACIONES");

        const conteo = crearConteoInformeVT(lista);
        const periodoTexto = document.getElementById("vtInformePeriodo")?.selectedOptions[0]?.textContent || "Todo";
        const sedeTexto = document.getElementById("vtInformeSede")?.selectedOptions[0]?.textContent || "Todas";
        const tipoTexto = document.getElementById("vtInformeTipo")?.selectedOptions[0]?.textContent || "Todos";
        const estadoTexto = document.getElementById("vtInformeEstado")?.selectedOptions[0]?.textContent || "Todos";
        const ahora = new Date();
        const generado = ahora.toLocaleString("es-PE");
        const resumen = [
            ["VISUAL CONNECTIONS SAC - ZONA NORTE"],
            ["INFORME DE VALIDACION TECNICA"],
            ["Generado", generado],
            ["Periodo", periodoTexto],
            ["Sede", sedeTexto],
            ["Tipo", tipoTexto],
            ["Estado", estadoTexto],
            [],
            ["INDICADOR", "CANTIDAD"],
            ["Total", conteo.total],
            ["Pendientes", conteo.pendientes],
            ["Aprobados", conteo.aprobados],
            ["Observados", conteo.observados],
            ["Rechazados", conteo.rechazados],
            ["Automaticos", conteo.automaticos],
            ["Bono", conteo.bono],
            ["No Bono", conteo.noBono]
        ];
        XLSX.utils.book_append_sheet(wb, prepararHojaExcelVT(XLSX, resumen,[34,18],false), "RESUMEN EJECUTIVO");

        const sedes = {};
        lista.forEach(x => {
            const k = (x.sede || "SIN SEDE").toString().toUpperCase();
            if(!sedes[k]) sedes[k] = [];
            sedes[k].push(x);
        });
        const resumenSede = [["SEDE","TOTAL","PENDIENTES","APROBADOS","OBSERVADOS","RECHAZADOS","AUTOMATICOS","BONO","NO BONO"]];
        Object.keys(sedes).sort().forEach(k => {
            const c = crearConteoInformeVT(sedes[k]);
            resumenSede.push([k,c.total,c.pendientes,c.aprobados,c.observados,c.rechazados,c.automaticos,c.bono,c.noBono]);
        });
        XLSX.utils.book_append_sheet(wb, prepararHojaExcelVT(XLSX,resumenSede,[15,10,13,13,13,13,13,10,10],true), "RESUMEN POR SEDE");

        const tipos = {};
        lista.forEach(x => {
            const k = (x.tipoValidacion || "OTRO").toString().toUpperCase();
            if(!tipos[k]) tipos[k] = [];
            tipos[k].push(x);
        });
        const resumenTipo = [["TIPO VALIDACION","TOTAL","PORCENTAJE","PENDIENTES","APROBADOS","OBSERVADOS","RECHAZADOS","AUTOMATICOS","BONO","NO BONO"]];
        ["RECABLEADO","GAR","VTR","OTRO"].forEach(k => {
            if(!tipos[k]) return;
            const c = crearConteoInformeVT(tipos[k]);
            resumenTipo.push([k,c.total,c.total/lista.length,c.pendientes,c.aprobados,c.observados,c.rechazados,c.automaticos,c.bono,c.noBono]);
        });
        const wsTipo = prepararHojaExcelVT(XLSX,resumenTipo,[20,10,13,13,13,13,13,13,10,10],true);
        for(let i=2;i<=resumenTipo.length;i++){
            const celda=wsTipo[`C${i}`];
            if(celda) celda.z="0.00%";
        }
        XLSX.utils.book_append_sheet(wb, wsTipo, "RESUMEN POR TIPO");

        const periodoNombre = (periodoTexto || "TODO").toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ]+/g,"_").replace(/^_|_$/g,"");
        const fechaArchivo = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,"0")}-${String(ahora.getDate()).padStart(2,"0")}`;
        XLSX.writeFile(wb, `VALIDACION_TECNICA_${periodoNombre}_${fechaArchivo}.xlsx`);
        cerrarInformeValidacionTecnica();
    }catch(e){
        alert("❌ " + e.message);
    }finally{
        ocultarCargandoValidacion();
        if(btn){ btn.disabled = false; btn.textContent = "Generar Excel"; }
    }
}
