// MI VISUAL - Gestión de Actas v93: actas faltantes registradas por Almacén

const API_ACTAS = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

function usuarioActualActas(){
    return {
        usuario: localStorage.getItem("usuario") || "",
        perfil: normalizarActas(localStorage.getItem("perfil")),
        sede: normalizarActas(localStorage.getItem("sede")),
        cuadrilla: localStorage.getItem("cuadrilla") || ""
    };
}

function normalizarActas(txt){
    return (txt || "").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function esJefaturaActas(perfil){
    const p = normalizarActas(perfil);
    return p === "JEFATURA" || p === "ADMIN" || p === "ADMINISTRADOR";
}

function esAlmacenActas(perfil){
    return normalizarActas(perfil) === "ALMACEN";
}

function esJefaturaAlmacenActas(perfil){
    return normalizarActas(perfil) === "JEFATURA ALMACEN";
}

function limpiarHtmlActas(txt){
    return (txt || "").toString()
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}


const TIPOS_INSTALACION_ACTAS = [
    "INSTALACION Y ACTIVACION DE ABONADOS EN CONDOMINIOS",
    "INSTALACION Y ACTIVACION DE ABONADOS EN RESIDENCIALES"
];

function esPartidaInstalacionActas(tipo){
    const t = normalizarActas(tipo);
    return TIPOS_INSTALACION_ACTAS.includes(t);
}

function inferirTipoEjecucionActas(){
    const u = usuarioActualActas();
    const cuad = normalizarActas(u.cuadrilla);
    if(cuad.includes("SGA") || cuad.includes("VISITA TECNICA") || cuad.includes("VISITA TÉCNICA")) return "VISITA TECNICA";
    return "INSTALACION";
}

function etiquetaValidacionActas(valor, tipo){
    const v = normalizarActas(valor);
    if(v === "CORRECTO") return `<span class="actas-badge actas-fin">CORRECTO</span>`;
    if(v === "OBSERVADO") return `<span class="actas-badge actas-obs">OBSERVADO</span>`;
    return `<span class="actas-badge actas-pend">PENDIENTE</span>`;
}

function etiquetaEntregaFisicaActas(valor){
    const v = normalizarActas(valor || "PENDIENTE");
    if(v === "ENTREGADA") return `<span class="actas-badge actas-fin">ENTREGADA</span>`;
    return `<span class="actas-badge actas-pend">PENDIENTE</span>`;
}

function fechaVisibleActas(valor){
    if(!valor) return "-";
    const txt = valor.toString().trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(txt)){
        const p = txt.split("-");
        return `${p[2]}/${p[1]}/${p[0]}`;
    }
    if(txt.includes("T")){
        const d = new Date(txt);
        if(!isNaN(d.getTime())) return new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
    }
    return txt;
}

function estadoGeneralActas(a){
    if(estaFinalizadaActa(a)) return `<span class="actas-badge actas-fin">FINALIZADO</span>`;
    if(estaObservadaActa(a)) return `<span class="actas-badge actas-obs">OBSERVADO</span>`;
    return `<span class="actas-badge actas-pend">PENDIENTE</span>`;
}

async function apiActas(payload){
    const res = await fetch(API_ACTAS, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "Error en Gestión de Actas");
    return data;
}

function estiloActas(){
    return `<style id="styleActas">
        .actas-wrap{max-width:1100px;margin:0 auto;padding:14px;}
        .actas-head{background:linear-gradient(135deg,#0f172a,#1d4ed8);color:white;border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 10px 24px rgba(15,23,42,.20);}
        .actas-head h2{margin:0 0 6px;font-size:22px;}
        .actas-head p{margin:0;opacity:.92;font-size:13px;line-height:1.4;}
        .actas-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;}
        .actas-btn{border:0;border-radius:12px;padding:10px 13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.12);text-decoration:none;display:inline-block;font-size:13px;}
        .actas-btn.ok{background:#16a34a;color:white;}
        .actas-btn.warn{background:#f59e0b;color:#111827;}
        .actas-btn.sec{background:#e5e7eb;color:#111827;}
        .actas-btn.danger{background:#dc2626;color:white;}
        .actas-btn.blue{background:#1d4ed8;color:white;}
        .actas-btn:disabled{opacity:.55;cursor:not-allowed;}
        .actas-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
        .actas-field label{display:block;font-size:13px;font-weight:900;color:#ffffff;margin-bottom:5px;text-shadow:0 1px 2px rgba(0,0,0,.25);}
        .actas-field input,.actas-field select,.actas-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font-size:14px;background:#ffffff;color:#111827;font-weight:700;}
        .actas-field input:disabled{background:#f8fafc;color:#0f172a;opacity:1;}
        .actas-field select option{color:#111827;background:#ffffff;}
        .actas-card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 6px 16px rgba(15,23,42,.08);color:#111827;}
        .actas-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px;}
        .actas-kpi{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:12px;text-align:center;}
        .actas-kpi b{display:block;font-size:22px;color:#0f172a;}
        .actas-kpi span{font-size:12px;color:#64748b;font-weight:900;}
        .actas-table{width:100%;border-collapse:collapse;font-size:13px;background:white;border-radius:14px;overflow:hidden;}
        .actas-table th{background:#0f172a;color:#ffffff;text-align:left;padding:10px 9px;font-size:13px;font-weight:900;}
        .actas-table td{border-bottom:1px solid #e5e7eb;padding:10px 9px;vertical-align:top;color:#111827;background:#ffffff;}
        .actas-table a{color:#1d4ed8;font-weight:900;}
        .actas-empty{text-align:center;color:#64748b;font-weight:900;padding:16px;background:#f8fafc;}
        .actas-badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900;margin:1px;}
        .actas-pend{background:#fef3c7;color:#92400e;}
        .actas-fin{background:#dcfce7;color:#166534;}
        .actas-obs{background:#fee2e2;color:#991b1b;}
        .actas-okalm{background:#dbeafe;color:#1e40af;}
        .actas-msg{padding:10px;border-radius:12px;margin:10px 0;font-weight:800;line-height:1.35;}
        .actas-msg.ok{background:#dcfce7;color:#166534;}
        .actas-msg.err{background:#fee2e2;color:#991b1b;}
        .actas-msg.info{background:#e0f2fe;color:#075985;}
        .actas-small{font-size:12px;color:#64748b;font-weight:700;line-height:1.35;}
        .actas-dual{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;}
        .actas-statebox{border:1px solid #e5e7eb;border-radius:12px;padding:9px;background:#f8fafc;}
        .actas-statebox b{display:block;font-size:11px;color:#64748b;margin-bottom:5px;text-transform:uppercase;letter-spacing:.3px;}
        .actas-sede{border:1px solid #cbd5e1;border-radius:16px;background:#fff;margin:0 0 12px;overflow:hidden;box-shadow:0 6px 16px rgba(15,23,42,.07);}
        .actas-sede>summary{cursor:pointer;list-style:none;padding:14px 16px;background:#0f172a;color:#fff;font-weight:900;display:flex;justify-content:space-between;align-items:center;gap:10px;}
        .actas-sede>summary::-webkit-details-marker,.actas-proceso>summary::-webkit-details-marker{display:none;}
        .actas-sede>summary:after,.actas-proceso>summary:after{content:'▾';font-size:14px;}
        .actas-sede:not([open])>summary:after,.actas-proceso:not([open])>summary:after{content:'▸';}
        .actas-sede-body{padding:12px;}
        .actas-proceso{border:1px solid #e5e7eb;border-radius:14px;background:#f8fafc;margin-bottom:10px;overflow:hidden;}
        .actas-proceso>summary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:900;color:#0f172a;display:flex;justify-content:space-between;align-items:center;gap:10px;background:#e2e8f0;}
        .actas-proceso-body{padding:10px;}
        .actas-count{background:#dbeafe;color:#1e40af;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:900;}
        .actas-process-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px;margin-bottom:7px;}
        .actas-process-head{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;}
        .actas-process-meta{font-size:10px;color:#64748b;line-height:1.25;}
        .actas-card-title{font-size:12px;font-weight:900;color:#0f172a;}
        .actas-unified-states{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0;}
        .actas-unified-state{background:#f8fafc;border:1px solid #e5e7eb;border-radius:9px;padding:6px 7px;min-height:42px;}
        .actas-unified-state b{display:block;font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:3px;}
        .actas-action-label{font-size:9px;font-weight:900;color:#475569;text-transform:uppercase;margin:0 0 4px;}
        .actas-compact-actions{display:flex;gap:4px;flex-wrap:wrap;align-items:center;}
        .actas-compact-actions .actas-btn{padding:6px 8px;border-radius:8px;font-size:10px;line-height:1.05;}
        .actas-validation-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;align-items:start;}
        .actas-validation-col{border:1px dashed #cbd5e1;border-radius:9px;padding:6px;background:#fff;min-height:52px;}
        .actas-primary-actions{margin-top:5px;}
        .actas-faltante{border:2px solid #f59e0b!important;background:#fff7ed!important;box-shadow:0 6px 16px rgba(245,158,11,.18)!important;}
        .actas-faltante .actas-unified-state,.actas-faltante .actas-statebox{background:#fffbeb;border-color:#fdba74;}
        .actas-faltante-tag{display:inline-block;background:#f97316;color:#fff;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;margin-bottom:5px;}
        .actas-btn.orange{background:#f97316;color:#fff;}

        @media(max-width:520px){.actas-validation-grid{grid-template-columns:1fr}.actas-unified-states{grid-template-columns:1fr 1fr}.actas-compact-actions .actas-btn{font-size:9px;padding:6px 7px;}}
        .actas-readonly{background:#f1f5f9;color:#475569;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800;margin-top:8px;}
        .actas-mobile{display:none;}
        @media(max-width:760px){.actas-grid,.actas-kpis{grid-template-columns:1fr 1fr}.actas-table{display:none}.actas-mobile{display:block}.actas-card{font-size:13px}.actas-head h2{font-size:20px}}
        @media(max-width:480px){.actas-grid,.actas-kpis{grid-template-columns:1fr}}
    </style>`;
}

function mostrarGestionActas(){
    const u = usuarioActualActas();
    let subtitulo = "Registro y control documental de actas escaneadas.";
    if(u.perfil === "TECNICO") subtitulo = "Sube tus actas en PDF. Si son observadas, podrás reemplazar el archivo corregido.";
    if(u.perfil === "ALMACEN") subtitulo = "Primera validación documental de actas de tu sede.";
    if(u.perfil === "SUPERVISOR") subtitulo = "Consulta de actas de tu sede: escaneo y entrega física. Solo lectura.";
    if(esJefaturaActas(u.perfil)) subtitulo = "Consulta general de actas: escaneo y entrega física. Solo lectura.";
    if(esJefaturaAlmacenActas(u.perfil)) subtitulo = "Gestión por sede: escaneo y entrega física en una sola tarjeta por acta.";

    mostrarPantalla(`
        ${estiloActas()}
        <div class="actas-wrap">
            <div class="actas-head">
                <h2>📄 Gestión de Actas</h2>
                <p>${subtitulo}</p>
            </div>
            <div class="actas-actions">
                ${u.perfil === "TECNICO" ? `<button class="actas-btn ok" onclick="mostrarFormularioActa()">+ Subir Acta PDF</button>` : ""}
                ${(esAlmacenActas(u.perfil) || esJefaturaAlmacenActas(u.perfil)) ? `<button class="actas-btn orange" onclick="mostrarFormularioActaFaltante()">⚠ Registrar acta faltante</button>` : ""}
                <button class="actas-btn sec" onclick="cargarActas()">🔄 Actualizar</button>
            </div>
            <div id="actasResumen"></div>
            <div id="actasLista">Cargando...</div>
        </div>
    `);
    cargarActas();
}

async function cargarActas(opciones){
    const u = usuarioActualActas();
    opciones = opciones || {};
    const lista = document.getElementById("actasLista");
    if(lista) lista.innerHTML = "Cargando actas...";
    try{
        await cargarResumenActas();
        const data = await apiActas({accion:"listarActasEscaneadas", usuario:u.usuario});
        const actas = data.actas || [];
        if(actas.length === 0){
            lista.innerHTML = `<div class="actas-card actas-empty">No hay actas registradas.</div>`;
            return;
        }

        if(esJefaturaAlmacenActas(u.perfil)){
            lista.innerHTML = vistaJefaturaAlmacenPorSedes(actas);
            restaurarEstadoVistaActas(opciones);
            return;
        }

        if(esAlmacenActas(u.perfil)){
            lista.innerHTML = vistaResponsableAlmacenPorProcesos(actas, u.sede);
            restaurarEstadoVistaActas(opciones);
            return;
        }

        // Técnico, Supervisor y Jefatura operativa: consulta y estados, sin botones de validación.
        lista.innerHTML = `
            <table class="actas-table">
                <thead><tr><th>Fecha</th><th>N.º Acta</th><th>Código pedido</th><th>Cuadrilla / Sede</th><th>Ejecución</th><th>Escaneo</th><th>Entrega física</th><th>PDF</th><th>Detalle</th></tr></thead>
                <tbody>${actas.map(a => filaActaLecturaHtml(a)).join("")}</tbody>
            </table>
            <div class="actas-mobile">${actas.map(a => cardActaLecturaHtml(a)).join("")}</div>
        `;
        restaurarEstadoVistaActas(opciones);
    }catch(err){
        lista.innerHTML = `<div class="actas-msg err">❌ ${err.message}</div>`;
    }
}
function obtenerEstadoVistaActas(){
    const sedesAbiertas = Array.from(document.querySelectorAll("details.actas-sede[open]"))
        .map(x => normalizarActas(x.dataset.sede || ""))
        .filter(Boolean);
    return { sedesAbiertas, scrollY: window.scrollY || 0 };
}

function restaurarEstadoVistaActas(opciones){
    const abiertas = (opciones && opciones.sedesAbiertas) || [];
    if(abiertas.length){
        document.querySelectorAll("details.actas-sede").forEach(d => {
            d.open = abiertas.includes(normalizarActas(d.dataset.sede || ""));
        });
    }
    if(opciones && Number.isFinite(opciones.scrollY)){
        requestAnimationFrame(() => window.scrollTo({top: opciones.scrollY, behavior:"auto"}));
    }
}

function badgeActa(a){
    const estado = normalizarActas(a.estado);
    const estadoVisible = normalizarActas(a.estadoVisibleTecnico || "");
    const resAlm = normalizarActas(a.resultadoAlmacen);
    const resJef = normalizarActas(a.resultadoJefatura);

    if(estado === "FINALIZADO" || resJef === "CORRECTO" || estadoVisible === "CORRECTO") return `<span class="actas-badge actas-fin">FINALIZADO</span>`;
    if(resJef === "OBSERVADO") return `<span class="actas-badge actas-obs">OBSERVADO JEFATURA</span>`;
    if(resAlm === "OBSERVADO") return `<span class="actas-badge actas-obs">OBSERVADO ALMACÉN</span>`;
    if(resAlm === "CORRECTO") return `<span class="actas-badge actas-okalm">OK ALMACÉN</span><br><span class="actas-badge actas-pend">PENDIENTE JEFATURA</span>`;
    return `<span class="actas-badge actas-pend">PENDIENTE</span>`;
}

function motivoVisibleActa(a){
    return a.motivoJefatura || a.motivoAlmacen || a.motivoObservacion || "";
}

function estaObservadaActa(a){
    return normalizarActas(a.resultadoJefatura) === "OBSERVADO" || normalizarActas(a.resultadoAlmacen) === "OBSERVADO" || normalizarActas(a.estadoVisibleTecnico) === "OBSERVADO";
}

function estaFinalizadaActa(a){
    return normalizarActas(a.estado) === "FINALIZADO" || normalizarActas(a.resultadoJefatura) === "CORRECTO" || normalizarActas(a.estadoVisibleTecnico) === "CORRECTO";
}

function botonDetalleActa(a){
    const id = (a.id || "").replace(/'/g,"\\'");
    return `<button class="actas-btn sec" onclick="verDetalleActa('${id}')">Ver detalle</button>`;
}

function botonPdfActa(a){
    return a.linkActa ? `<a class="actas-btn blue" href="${a.linkActa}" target="_blank" rel="noopener">Ver PDF</a>` : "";
}

function botonesEscaneoActa(a){
    const u = usuarioActualActas();
    const id = (a.id || "").replace(/'/g,"\\'");
    let html = `${botonDetalleActa(a)} ${botonPdfActa(a)}`;
    if(esAlmacenActas(u.perfil) && !estaFinalizadaActa(a)){
        html += ` <button class="actas-btn ok" onclick="validarActa('${id}','CORRECTO')">Correcto</button>`;
        html += ` <button class="actas-btn warn" onclick="validarActa('${id}','OBSERVADO')">Observado</button>`;
    }
    if(esJefaturaAlmacenActas(u.perfil) && !estaFinalizadaActa(a)){
        html += ` <button class="actas-btn ok" onclick="validarActa('${id}','CORRECTO')">Finalizar correcto</button>`;
        html += ` <button class="actas-btn warn" onclick="validarActa('${id}','OBSERVADO')">Observado</button>`;
    }
    return html;
}

function botonesEntregaActa(a){
    const u = usuarioActualActas();
    const id = (a.id || "").replace(/'/g,"\\'");
    const entrega = normalizarActas(a.estadoEntregaFisica || "PENDIENTE");
    let html = `${botonDetalleActa(a)} ${botonPdfActa(a)}`;
    if((esAlmacenActas(u.perfil) || esJefaturaAlmacenActas(u.perfil)) && entrega !== "ENTREGADA"){
        html += ` <button class="actas-btn blue" onclick="cambiarEntregaFisicaActa('${id}','ENTREGADA')">Confirmar entrega física</button>`;
    }
    if(esJefaturaAlmacenActas(u.perfil) && entrega === "ENTREGADA"){
        html += ` <button class="actas-btn danger" onclick="cambiarEntregaFisicaActa('${id}','PENDIENTE')">Regresar a pendiente</button>`;
    }
    return html;
}

function botonesLecturaActa(a){
    const u = usuarioActualActas();
    let html = `${botonDetalleActa(a)} ${botonPdfActa(a)}`;
    if(u.perfil === "TECNICO" && esActaFaltantePendiente(a)){
        html += ` <button class="actas-btn orange" onclick="mostrarFormularioActa('${limpiarHtmlActas(a.codigoPedido || "")}')">Completar acta faltante</button>`;
    }else if(u.perfil === "TECNICO" && estaObservadaActa(a) && !estaFinalizadaActa(a)){
        html += ` <button class="actas-btn danger" onclick="mostrarFormularioActa('${limpiarHtmlActas(a.codigoPedido || "")}')">Reemplazar PDF</button>`;
    }
    return html;
}
function esActaFaltantePendiente(a){
    return normalizarActas(a.origenRegistro) === "ALMACEN" && !a.linkActa;
}

function filaActaLecturaHtml(a){
    return `<tr ${esActaFaltantePendiente(a) ? `style="background:#fff7ed"` : ""}>
        <td>${fechaVisibleActas(a.fechaGestion || a.fechaRegistro)}</td>
        <td><b>${limpiarHtmlActas(a.numeroActa || "-")}</b></td>
        <td><b>${limpiarHtmlActas(a.codigoPedido || "-")}</b><br><small>Orden: ${limpiarHtmlActas(a.codigoOrden || "-")}</small></td>
        <td>${limpiarHtmlActas(a.cuadrilla || "-")}<br><small>${limpiarHtmlActas(a.sede || "-")}</small></td>
        <td>${limpiarHtmlActas(a.tipoEjecucion || "-")}</td>
        <td>${badgeActa(a)}</td>
        <td>${etiquetaEntregaFisicaActas(a.estadoEntregaFisica)}</td>
        <td>${a.linkActa ? `<a href="${a.linkActa}" target="_blank" rel="noopener">Ver PDF</a>` : "-"}</td>
        <td>${botonesLecturaActa(a)}</td>
    </tr>`;
}

function cardActaLecturaHtml(a){
    const motivo = motivoVisibleActa(a);
    return `<div class="actas-card ${esActaFaltantePendiente(a) ? "actas-faltante" : ""}">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
            <div>${esActaFaltantePendiente(a) ? `<span class="actas-faltante-tag">ACTA FALTANTE</span><br>` : ""}<b>ACTA N.º ${limpiarHtmlActas(a.numeroActa || "-")}</b><br><small>${fechaVisibleActas(a.fechaGestion || a.fechaRegistro)}</small></div>
            <small>${limpiarHtmlActas(a.sede || "-")}</small>
        </div>
        <div class="actas-small" style="margin-top:7px;"><b>Código:</b> ${limpiarHtmlActas(a.codigoPedido || "-")} · <b>Cuadrilla:</b> ${limpiarHtmlActas(a.cuadrilla || "-")}</div>
        <div class="actas-small"><b>Tipo:</b> ${limpiarHtmlActas(a.tipoEjecucion || "-")}</div>
        <div class="actas-dual">
            <div class="actas-statebox"><b>Validación de escaneo</b>${badgeActa(a)}</div>
            <div class="actas-statebox"><b>Entrega física</b>${etiquetaEntregaFisicaActas(a.estadoEntregaFisica)}</div>
        </div>
        ${motivo ? `<div class="actas-msg err">${limpiarHtmlActas(motivo)}</div>` : ""}
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">${botonesLecturaActa(a)}</div>
    </div>`;
}

function accionesEscaneoCompactas(a){
    if(esActaFaltantePendiente(a)) return "";
    const u = usuarioActualActas();
    const id = (a.id || "").replace(/'/g,"\\'");
    let html = "";
    if(esAlmacenActas(u.perfil) && !estaFinalizadaActa(a)){
        html += `<button class="actas-btn ok" onclick="validarActa('${id}','CORRECTO')">Correcto</button>`;
        html += `<button class="actas-btn warn" onclick="validarActa('${id}','OBSERVADO')">Observado</button>`;
    }
    if(esJefaturaAlmacenActas(u.perfil) && !estaFinalizadaActa(a)){
        html += `<button class="actas-btn ok" onclick="validarActa('${id}','CORRECTO')">Finalizar correcto</button>`;
        html += `<button class="actas-btn warn" onclick="validarActa('${id}','OBSERVADO')">Observado</button>`;
    }
    return html;
}

function accionesEntregaCompactas(a){
    if(esActaFaltantePendiente(a)) return "";
    const u = usuarioActualActas();
    const id = (a.id || "").replace(/'/g,"\\'");
    const entrega = normalizarActas(a.estadoEntregaFisica || "PENDIENTE");
    let html = "";
    if((esAlmacenActas(u.perfil) || esJefaturaAlmacenActas(u.perfil)) && entrega !== "ENTREGADA"){
        html += `<button class="actas-btn blue" onclick="cambiarEntregaFisicaActa('${id}','ENTREGADA')">Confirmar entrega</button>`;
    }
    if(esJefaturaAlmacenActas(u.perfil) && entrega === "ENTREGADA"){
        html += `<button class="actas-btn danger" onclick="cambiarEntregaFisicaActa('${id}','PENDIENTE')">Regresar a pendiente</button>`;
    }
    return html;
}

function tarjetaActaGestionUnificada(a){
    const escaneoBtns = accionesEscaneoCompactas(a);
    const entregaBtns = accionesEntregaCompactas(a);
    return `<div class="actas-process-card ${esActaFaltantePendiente(a) ? "actas-faltante" : ""}" data-acta-id="${limpiarHtmlActas(a.id || "")}">
        <div class="actas-process-head">
            <div>
                ${esActaFaltantePendiente(a) ? `<span class="actas-faltante-tag">ACTA FALTANTE · PENDIENTE DEL TÉCNICO</span>` : ""}
                <div class="actas-card-title">Acta N.º ${limpiarHtmlActas(a.numeroActa || "-")}</div>
                <div class="actas-process-meta">
                    Pedido: ${limpiarHtmlActas(a.codigoPedido || "-")} · ${limpiarHtmlActas(a.tipoEjecucion || "-")}<br>
                    ${limpiarHtmlActas(a.cuadrilla || "-")} · ${fechaVisibleActas(a.fechaGestion || a.fechaRegistro)}
                </div>
            </div>
        </div>
        <div class="actas-unified-states">
            <div class="actas-unified-state"><b>Escaneo</b>${badgeActa(a)}</div>
            <div class="actas-unified-state"><b>Entrega física</b>${etiquetaEntregaFisicaActas(a.estadoEntregaFisica)}</div>
        </div>
        <div class="actas-compact-actions actas-primary-actions">${botonDetalleActa(a)} ${botonPdfActa(a)}</div>
        ${(escaneoBtns || entregaBtns) ? `<div class="actas-validation-grid">
            <div class="actas-validation-col">
                <div class="actas-action-label">Validar escaneo</div>
                <div class="actas-compact-actions">${escaneoBtns || `<span class="actas-small">Sin acciones pendientes</span>`}</div>
            </div>
            <div class="actas-validation-col">
                <div class="actas-action-label">Entrega física</div>
                <div class="actas-compact-actions">${entregaBtns || `<span class="actas-small">Sin acciones pendientes</span>`}</div>
            </div>
        </div>` : ""}
    </div>`;
}

function bloqueSedeActas(sede, actas, abierto){
    const nombre = normalizarActas(sede);
    return `<details class="actas-sede" data-sede="${limpiarHtmlActas(nombre)}" ${abierto ? "open" : ""}>
        <summary><span>📍 ${limpiarHtmlActas(nombre)}</span><span class="actas-count">${actas.length} actas</span></summary>
        <div class="actas-sede-body">
            ${actas.length ? actas.map(a => tarjetaActaGestionUnificada(a)).join("") : `<div class="actas-empty">No hay actas registradas en esta sede.</div>`}
        </div>
    </details>`;
}

function vistaJefaturaAlmacenPorSedes(actas){
    const sedes = ["CHICLAYO","PIURA","TRUJILLO"];
    return `<div class="actas-msg info">Cada acta aparece una sola vez con sus dos controles: escaneo y entrega física.</div>` +
        sedes.map((sede, i) => bloqueSedeActas(sede, actas.filter(a => normalizarActas(a.sede) === sede), i === 0)).join("");
}

function vistaResponsableAlmacenPorProcesos(actas, sedeUsuario){
    const sede = normalizarActas(sedeUsuario || "SIN SEDE");
    const propias = actas.filter(a => normalizarActas(a.sede) === sede);
    return `<div class="actas-msg info">Responsable de Almacén · ${limpiarHtmlActas(sede)}. Cada acta se gestiona desde una sola tarjeta.</div>` + bloqueSedeActas(sede, propias, true);
}

async function cargarResumenActas(){
    const u = usuarioActualActas();
    const cont = document.getElementById("actasResumen");
    if(!cont) return;
    try{
        const data = await apiActas({accion:"resumenActasEscaneadas", usuario:u.usuario});
        const g = data.general || {};
        cont.innerHTML = `<div class="actas-kpis">
            <div class="actas-kpi"><b>${g.escaneadas || 0}</b><span>Escaneadas</span></div>
            <div class="actas-kpi"><b>${g.finalizadas || 0}</b><span>Finalizadas</span></div>
            <div class="actas-kpi"><b>${g.observadas || 0}</b><span>Observadas</span></div>
            <div class="actas-kpi"><b>${g.pendientes || 0}</b><span>Pendientes escaneo</span></div>
            <div class="actas-kpi"><b>${g.entregadasFisicas || 0}</b><span>Entregadas físicas</span></div>
            <div class="actas-kpi"><b>${g.pendientesEntregaFisica || 0}</b><span>Pendientes de entrega</span></div>
        </div>
        ${(esJefaturaActas(u.perfil) || esJefaturaAlmacenActas(u.perfil)) ? resumenTablasActas(data) : ""}`;
    }catch(err){
        cont.innerHTML = `<div class="actas-msg err">No se pudo cargar resumen: ${err.message}</div>`;
    }
}

function resumenTablasActas(data){
    const sedes = (data.sedes || []).map(x => `<tr><td>${limpiarHtmlActas(x.sede)}</td><td>${x.escaneadas}</td><td>${x.finalizadas}</td><td>${x.observadas}</td><td>${x.pendientes}</td></tr>`).join("") || `<tr><td colspan="5" class="actas-empty">No existen actas registradas por sede.</td></tr>`;
    const cuadrillas = (data.cuadrillas || []).map(x => `<tr><td>${limpiarHtmlActas(x.sede)}</td><td>${limpiarHtmlActas(x.cuadrilla)}</td><td>${x.escaneadas}</td><td>${x.finalizadas}</td><td>${x.observadas}</td><td>${x.pendientes}</td></tr>`).join("") || `<tr><td colspan="6" class="actas-empty">No existen actas registradas por cuadrilla.</td></tr>`;
    return `<div class="actas-card"><b>Resumen por sede</b><table class="actas-table" style="display:table;margin-top:8px;"><thead><tr><th>Sede</th><th>Escaneadas</th><th>Finalizadas</th><th>Observadas</th><th>Pendientes</th></tr></thead><tbody>${sedes}</tbody></table></div>
    <div class="actas-card"><b>Resumen por cuadrilla</b><table class="actas-table" style="display:table;margin-top:8px;"><thead><tr><th>Sede</th><th>Cuadrilla</th><th>Escaneadas</th><th>Finalizadas</th><th>Observadas</th><th>Pendientes</th></tr></thead><tbody>${cuadrillas}</tbody></table></div>`;
}

async function mostrarFormularioActa(codigoPedidoPrefill){
    const u = usuarioActualActas();
    let actaPrefill = null;
    if(codigoPedidoPrefill){
        try{
            const data = await apiActas({accion:"listarActasEscaneadas", usuario:u.usuario});
            actaPrefill = (data.actas || []).find(a => (a.codigoPedido || "").toString() === codigoPedidoPrefill.toString()) || null;
        }catch(e){}
    }
    const esFaltante = !!(actaPrefill && esActaFaltantePendiente(actaPrefill));
    if(u.perfil !== "TECNICO"){
        mostrarPantalla(`${estiloActas()}<div class="actas-wrap"><div class="actas-msg err">Solo el técnico puede subir actas.</div></div>`);
        return;
    }
    mostrarPantalla(`
        ${estiloActas()}
        <div class="actas-wrap">
            <div class="actas-head"><h2>📄 ${esFaltante ? "Completar Acta Faltante" : (codigoPedidoPrefill ? "Reemplazar Acta Observada" : "Subir Acta Escaneada")}</h2><p>Solo se permite archivo PDF. Si el acta fue registrada como faltante, completa los datos y adjunta el PDF. Si fue observada, el nuevo PDF reemplazará al anterior.</p></div>
            <form id="formActa" onsubmit="event.preventDefault(); guardarActa(this.querySelector('[data-guardar]'))">
                <div class="actas-grid">
                    <div class="actas-field"><label>Sede</label><input value="${limpiarHtmlActas(u.sede)}" disabled></div>
                    <div class="actas-field"><label>Cuadrilla</label><input value="${limpiarHtmlActas(u.cuadrilla)}" disabled></div>
                    <div class="actas-field"><label>Fecha de gestión</label><input type="date" id="actaFechaGestion" value="${limpiarHtmlActas(actaPrefill?.fechaGestion || "")}" required></div>
                    <div class="actas-field"><label>Tipo de ejecución</label><select id="actaTipoEjecucion" required onchange="cargarTiposPartidaActas()"><option value="INSTALACION">INSTALACIÓN</option><option value="VISITA TECNICA">VISITA TÉCNICA / POSTVENTA</option></select></div>
                    <div class="actas-field" style="grid-column:1/-1"><label>Tipo de partida</label><select id="actaTipoPartida" required><option value="">Cargando...</option></select></div>
                    <div class="actas-field"><label>Código de orden</label><input id="actaCodigoOrden" value="${limpiarHtmlActas(actaPrefill?.codigoOrden || "")}" required></div>
                    <div class="actas-field"><label>Código de pedido</label><input id="actaCodigoPedido" value="${limpiarHtmlActas(codigoPedidoPrefill || "")}" ${codigoPedidoPrefill ? "readonly" : ""} required></div>
                    <div class="actas-field"><label>Número de acta</label><input id="actaNumeroActa" value="${limpiarHtmlActas(actaPrefill?.numeroActa || "")}" placeholder="Ej.: 00015487" required></div>
                    <div class="actas-field"><label>DNI</label><input id="actaDni" required></div>
                    <div class="actas-field"><label>Cliente</label><input id="actaCliente" required></div>
                    <div class="actas-field" style="grid-column:1/-1"><label>Acta escaneada PDF</label><input type="file" id="actaPdf" accept="application/pdf,.pdf" required></div>
                </div>
                <div id="actaMsg"></div>
                <div class="actas-actions">
                    <button class="actas-btn ok" data-guardar type="submit">${esFaltante ? "Completar acta" : (codigoPedidoPrefill ? "Reemplazar PDF" : "Guardar Acta")}</button>
                    <button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Cancelar</button>
                </div>
            </form>
        </div>
    `);
    if(!document.getElementById("actaFechaGestion").value) document.getElementById("actaFechaGestion").value = new Date().toISOString().slice(0,10);
    const tipoDefecto = actaPrefill?.tipoEjecucion || inferirTipoEjecucionActas();
    const selTipo = document.getElementById("actaTipoEjecucion");
    if(selTipo) selTipo.value = tipoDefecto;
    await cargarTiposPartidaActas();
    if(actaPrefill?.tipoPartida){ const sp=document.getElementById("actaTipoPartida"); if(sp) sp.value=actaPrefill.tipoPartida; }
}


async function mostrarFormularioActaFaltante(){
    const u = usuarioActualActas();
    if(!(esAlmacenActas(u.perfil) || esJefaturaAlmacenActas(u.perfil))) return alert("No tiene permiso para registrar actas faltantes.");
    let cuadrillas = [];
    try{ cuadrillas = (await apiActas({accion:"listarCuadrillasActasFaltantes",usuario:u.usuario})).cuadrillas || []; }
    catch(err){ return alert("❌ "+err.message); }
    const sedes = [...new Set(cuadrillas.map(x=>x.sede).filter(Boolean))].sort();
    mostrarPantalla(`
        ${estiloActas()}
        <div class="actas-wrap">
            <div class="actas-head" style="background:linear-gradient(135deg,#c2410c,#f97316)"><h2>⚠ Registrar Acta Faltante</h2><p>La alerta aparecerá en color anaranjado al técnico de la cuadrilla para que complete el PDF y entregue el acta física.</p></div>
            <form onsubmit="event.preventDefault();guardarActaFaltante(this.querySelector('[data-guardar-faltante]'))">
                <div class="actas-grid">
                    <div class="actas-field"><label>Sede</label><select id="faltanteSede" required onchange="actualizarCuadrillasFaltantes()">${sedes.map(x=>`<option value="${limpiarHtmlActas(x)}">${limpiarHtmlActas(x)}</option>`).join("")}</select></div>
                    <div class="actas-field"><label>Cuadrilla</label><select id="faltanteCuadrilla" required></select></div>
                    <div class="actas-field"><label>Fecha de gestión</label><input type="date" id="faltanteFecha" required></div>
                    <div class="actas-field"><label>Tipo de ejecución</label><select id="faltanteTipoEjecucion" required onchange="cargarTiposPartidaFaltante()"><option value="INSTALACION">INSTALACIÓN</option><option value="VISITA TECNICA">VISITA TÉCNICA / POSTVENTA</option></select></div>
                    <div class="actas-field" style="grid-column:1/-1"><label>Tipo de partida</label><select id="faltanteTipoPartida" required></select></div>
                    <div class="actas-field"><label>Código de orden</label><input id="faltanteCodigoOrden" required></div>
                    <div class="actas-field"><label>Código de pedido</label><input id="faltanteCodigoPedido" required></div>
                    <div class="actas-field"><label>Número de acta (si se conoce)</label><input id="faltanteNumeroActa"></div>
                    <div class="actas-field" style="grid-column:1/-1"><label>Motivo del faltante</label><textarea id="faltanteMotivo" rows="3" required placeholder="Ej.: Acta física no entregada al almacén"></textarea></div>
                </div>
                <div id="faltanteMsg"></div>
                <div class="actas-actions"><button class="actas-btn orange" data-guardar-faltante type="submit">Registrar faltante</button><button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Cancelar</button></div>
            </form>
        </div>`);
    window._cuadrillasFaltantesActas = cuadrillas;
    const sedeSel=document.getElementById("faltanteSede");
    if(esAlmacenActas(u.perfil) && sedeSel){ sedeSel.value=u.sede; sedeSel.disabled=true; }
    document.getElementById("faltanteFecha").value=new Date().toISOString().slice(0,10);
    actualizarCuadrillasFaltantes();
    cargarTiposPartidaFaltante();
}

function actualizarCuadrillasFaltantes(){
    const sede=normalizarActas(document.getElementById("faltanteSede")?.value||"");
    const sel=document.getElementById("faltanteCuadrilla");
    const lista=(window._cuadrillasFaltantesActas||[]).filter(x=>normalizarActas(x.sede)===sede);
    if(sel) sel.innerHTML=`<option value="">Seleccione...</option>`+lista.map(x=>`<option value="${limpiarHtmlActas(x.cuadrilla)}">${limpiarHtmlActas(x.cuadrilla)}</option>`).join("");
}

async function cargarTiposPartidaFaltante(){
    const tipo=document.getElementById("faltanteTipoEjecucion")?.value||"INSTALACION";
    const sel=document.getElementById("faltanteTipoPartida");
    if(!sel) return;
    try{
        const data=await apiActas({accion:"listarTiposPartidaActas",tipoEjecucion:tipo});
        sel.innerHTML=`<option value="">Seleccione...</option>`+(data.tipos||[]).map(t=>`<option value="${limpiarHtmlActas(t)}">${limpiarHtmlActas(t)}</option>`).join("");
    }catch(e){sel.innerHTML=`<option value="">Error</option>`;}
}

async function guardarActaFaltante(btn){
    const u=usuarioActualActas(), msg=document.getElementById("faltanteMsg");
    try{
        if(btn){btn.disabled=true;btn.textContent="Guardando...";}
        await apiActas({accion:"registrarActaFaltante",usuario:u.usuario,cuadrilla:document.getElementById("faltanteCuadrilla").value,fechaGestion:document.getElementById("faltanteFecha").value,tipoEjecucion:document.getElementById("faltanteTipoEjecucion").value,tipoPartida:document.getElementById("faltanteTipoPartida").value,codigoOrden:document.getElementById("faltanteCodigoOrden").value,codigoPedido:document.getElementById("faltanteCodigoPedido").value,numeroActa:document.getElementById("faltanteNumeroActa").value,motivoActaFaltante:document.getElementById("faltanteMotivo").value});
        if(msg) msg.innerHTML=`<div class="actas-msg ok">✅ Acta faltante registrada. El técnico ya puede visualizarla.</div>`;
        setTimeout(mostrarGestionActas,900);
    }catch(err){if(msg)msg.innerHTML=`<div class="actas-msg err">❌ ${err.message}</div>`;}
    finally{if(btn){btn.disabled=false;btn.textContent="Registrar faltante";}}
}

async function cargarTiposPartidaActas(){
    const sel = document.getElementById("actaTipoPartida");
    const tipo = document.getElementById("actaTipoEjecucion")?.value || "INSTALACION";
    if(!sel) return;
    try{
        const data = await apiActas({accion:"listarTiposPartidaActas", tipoEjecucion:tipo});
        let tipos = data.tipos || [];

        // Seguridad adicional en frontend: si el Apps Script devuelve todo el catálogo,
        // aquí se vuelve a filtrar para que el técnico no elija una partida incorrecta.
        if(normalizarActas(tipo) === "INSTALACION"){
            tipos = (data.instalaciones && data.instalaciones.length ? data.instalaciones : tipos.filter(esPartidaInstalacionActas));
        }else{
            tipos = (data.visitaTecnica && data.visitaTecnica.length ? data.visitaTecnica : tipos.filter(t => !esPartidaInstalacionActas(t)));
        }

        sel.innerHTML = `<option value="">Seleccione...</option>` + tipos.map(t => `<option value="${limpiarHtmlActas(t)}">${limpiarHtmlActas(t)}</option>`).join("");
    }catch(err){
        sel.innerHTML = `<option value="">Error al cargar catálogo</option>`;
    }
}

function leerPdfActa(file){
    return new Promise((resolve,reject)=>{
        if(!file) return reject(new Error("Debe seleccionar un PDF"));
        if(file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return reject(new Error("Solo se permite PDF"));
        const reader = new FileReader();
        reader.onload = () => resolve({
            base64: reader.result.split(",")[1],
            nombre: file.name,
            mime: file.type || "application/pdf"
        });
        reader.onerror = () => reject(new Error("No se pudo leer el PDF"));
        reader.readAsDataURL(file);
    });
}

async function guardarActa(btn){
    const u = usuarioActualActas();
    const msg = document.getElementById("actaMsg");
    try{
        if(btn){btn.disabled = true; btn.innerHTML = "Guardando...";}
        const pdf = await leerPdfActa(document.getElementById("actaPdf")?.files[0]);
        const payload = {
            accion:"registrarActaEscaneada",
            usuario:u.usuario,
            fechaGestion:document.getElementById("actaFechaGestion").value,
            tipoEjecucion:document.getElementById("actaTipoEjecucion").value,
            tipoPartida:document.getElementById("actaTipoPartida").value,
            codigoOrden:document.getElementById("actaCodigoOrden").value,
            codigoPedido:document.getElementById("actaCodigoPedido").value,
            numeroActa:document.getElementById("actaNumeroActa").value,
            dni:document.getElementById("actaDni").value,
            cliente:document.getElementById("actaCliente").value,
            archivoBase64:pdf.base64,
            archivoNombre:pdf.nombre,
            archivoMimeType:pdf.mime
        };
        const data = await apiActas(payload);
        if(msg) msg.innerHTML = `<div class="actas-msg ok">✅ Acta registrada correctamente.<br>Archivo: ${limpiarHtmlActas(data.nombreArchivo)}<br>Estado: PENDIENTE<br>Versión: ${data.version || 1}</div>`;
        setTimeout(mostrarGestionActas, 1200);
    }catch(err){
        if(msg) msg.innerHTML = `<div class="actas-msg err">❌ ${err.message}</div>`;
    }finally{
        if(btn){btn.disabled = false; btn.innerHTML = "Guardar Acta";}
    }
}

async function verDetalleActa(id){
    try{
        const u = usuarioActualActas();
        const data = await apiActas({accion:"listarActasEscaneadas", usuario:u.usuario});
        const a = (data.actas || []).find(x => x.id === id);
        if(!a) throw new Error("No se encontró el acta");
        alert(`DETALLE DE ACTA

Fecha registro: ${fechaVisibleActas(a.fechaRegistro)} ${a.horaRegistro || ""}
Fecha gestión: ${fechaVisibleActas(a.fechaGestion)}
Número de acta: ${a.numeroActa || "-"}
Código de pedido: ${a.codigoPedido || "-"}
Código de orden: ${a.codigoOrden || "-"}
Tipo de ejecución: ${a.tipoEjecucion || "-"}
Tipo de partida: ${a.tipoPartida || "-"}
DNI: ${a.dni || "-"}
Cliente: ${a.cliente || "-"}
Sede: ${a.sede || "-"}
Cuadrilla: ${a.cuadrilla || "-"}
Supervisor: ${a.supervisor || "-"}
Técnico: ${a.tecnico || "-"}

VALIDACIÓN DE ESCANEO
Estado: ${a.estadoVisibleTecnico || a.estado || "PENDIENTE"}
Resultado Almacén: ${a.resultadoAlmacen || "PENDIENTE"}
Motivo Almacén: ${a.motivoAlmacen || "-"}
Resultado Jefatura: ${a.resultadoJefatura || "PENDIENTE"}
Motivo Jefatura: ${a.motivoJefatura || "-"}

ENTREGA FÍSICA
Estado: ${a.estadoEntregaFisica || "PENDIENTE"}
Confirmado por: ${a.confirmadoFisicoPor || "-"}
Perfil: ${a.perfilConfirmacionFisica || "-"}
Fecha: ${fechaVisibleActas(a.fechaConfirmacionFisica)}
Hora: ${a.horaConfirmacionFisica || "-"}
Motivo reversión: ${a.motivoReversionFisica || "-"}

ACTA FALTANTE
Origen registro: ${a.origenRegistro || "TECNICO"}
Motivo faltante: ${a.motivoActaFaltante || "-"}
Registrado por: ${a.registradoFaltantePor || "-"}
Fecha registro faltante: ${fechaVisibleActas(a.fechaRegistroFaltante)}
Hora registro faltante: ${a.horaRegistroFaltante || "-"}

Versión PDF: ${a.version || 1}`);
    }catch(err){
        alert("❌ " + err.message);
    }
}

async function cambiarEntregaFisicaActa(id, estado){
    const u = usuarioActualActas();
    let motivo = "";
    if(estado === "PENDIENTE"){
        motivo = prompt("Ingrese el motivo para regresar la entrega física a pendiente:") || "";
        if(!motivo.trim()) return alert("Debe ingresar el motivo de reversión.");
    }else if(!confirm("¿Confirmar que el acta fue entregada físicamente al almacén?")){
        return;
    }
    try{
        await apiActas({accion:"actualizarEntregaFisicaActa", usuario:u.usuario, id, estado, motivoReversion:motivo});
        alert(estado === "ENTREGADA" ? "✅ Entrega física confirmada." : "✅ Entrega física regresada a pendiente.");
        const vista = obtenerEstadoVistaActas();
        await cargarActas(vista);
    }catch(err){
        alert("❌ " + err.message);
    }
}

async function validarActa(id, resultado){
    const u = usuarioActualActas();
    let motivo = "";
    if(resultado === "OBSERVADO"){
        motivo = prompt("Ingrese motivo de observación:") || "";
        if(!motivo.trim()) return alert("Debe ingresar el motivo.");
    }else{
        const texto = esJefaturaAlmacenActas(u.perfil) ? "¿Confirmar acta correcta y finalizar?" : "¿Confirmar primera validación correcta?";
        if(!confirm(texto)) return;
    }
    try{
        await apiActas({accion:"validarActaEscaneada", usuario:u.usuario, id, resultado, motivoObservacion:motivo});
        alert("✅ Validación registrada.");
        const vista = obtenerEstadoVistaActas();
        await cargarActas(vista);
    }catch(err){
        alert("❌ " + err.message);
    }
}
