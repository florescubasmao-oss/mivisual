// MI VISUAL - Gestión de Actas V264: guía visual y filtros por perfil

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

function esPerfilJefaturaFiltroActas(perfil){
    const p = normalizarActas(perfil);
    return p.includes("JEFATURA") || p.includes("GERENCIA") || p === "ADMIN" || p === "ADMINISTRADOR";
}

function fechaIsoFiltroActas(valor){
    if(!valor) return "";
    const txt = valor.toString().trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(txt)){
        const [d,m,y] = txt.split("/");
        return `${y}-${m}-${d}`;
    }
    const d = new Date(txt);
    if(isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}

function estadoFiltroActas(a){
    if(esActaFaltantePendiente(a)) return "FALTANTE";
    if(estaFinalizadaActa(a)) return "FINALIZADA";
    if(estaObservadaActa(a)) return "OBSERVADA";
    return "PENDIENTE";
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
        .actas-status-green{border:2px solid #22c55e!important;background:#f0fdf4!important;box-shadow:0 6px 16px rgba(34,197,94,.13)!important;}
        .actas-status-yellow{border:2px solid #f59e0b!important;background:#fffbeb!important;box-shadow:0 6px 16px rgba(245,158,11,.13)!important;}
        .actas-status-red{border:2px solid #ef4444!important;background:#fef2f2!important;box-shadow:0 6px 16px rgba(239,68,68,.13)!important;}
        .actas-status-orange{border:2px solid #f97316!important;background:#fff7ed!important;box-shadow:0 6px 16px rgba(249,115,22,.16)!important;}
        .actas-read-card{border-radius:12px;padding:10px 12px;margin-bottom:8px;}
        .actas-read-main{display:grid;grid-template-columns:minmax(120px,1.1fr) minmax(110px,1fr) minmax(90px,.8fr);gap:8px;align-items:center;}
        .actas-read-main b{font-size:12px;color:#0f172a;}
        .actas-read-main span{font-size:11px;color:#475569;}
        .actas-read-states{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;}
        .actas-read-state{border:1px solid rgba(148,163,184,.35);border-radius:9px;padding:6px 8px;background:rgba(255,255,255,.72);}
        .actas-read-state small{display:block;font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:2px;}

        @media(max-width:520px){.actas-validation-grid{grid-template-columns:1fr}.actas-unified-states{grid-template-columns:1fr 1fr}.actas-compact-actions .actas-btn{font-size:9px;padding:6px 7px;}}
        .actas-readonly{background:#f1f5f9;color:#475569;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800;margin-top:8px;}
        .actas-auto-card{grid-column:1/-1;background:linear-gradient(135deg,#0f172a,#1e3a5f);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:12px;color:#fff;}
        .actas-auto-title{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.35px;margin-bottom:9px;color:#bae6fd;}
        .actas-auto-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
        .actas-auto-item{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);border-radius:11px;padding:8px 9px;min-height:48px;}
        .actas-auto-item span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;color:#cbd5e1;margin-bottom:3px;}
        .actas-auto-item b{display:block;font-size:12px;line-height:1.2;color:#fff;word-break:break-word;}
        .actas-auto-status{margin-top:8px;font-size:11px;font-weight:800;color:#dbeafe;}
        .actas-auto-status.ok{color:#bbf7d0;}
        .actas-auto-status.warn{color:#fde68a;}
        .actas-filters{background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;padding:12px;margin:0 0 12px;box-shadow:0 6px 16px rgba(15,23,42,.07);color:#111827;}
        .actas-filters-title{font-size:13px;font-weight:900;color:#0f172a;margin:0 0 9px;display:flex;align-items:center;gap:6px;}
        .actas-filters-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;align-items:end;}
        .actas-filters-grid.tech{grid-template-columns:repeat(3,minmax(0,1fr));}
        .actas-filter-field label{display:block;font-size:10px;font-weight:900;color:#475569;text-transform:uppercase;letter-spacing:.25px;margin-bottom:4px;}
        .actas-filter-field input,.actas-filter-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;background:#fff;color:#0f172a;font-size:12px;font-weight:800;}
        .actas-filter-actions{display:flex;align-items:end;}
        .actas-filter-actions .actas-btn{width:100%;padding:9px 10px;}
        .actas-filter-result{margin-top:8px;font-size:11px;color:#475569;font-weight:800;}
        .actas-upload-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start;}
        .actas-upload-main{min-width:0;}
        .actas-code-guide{background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:0;overflow:hidden;box-shadow:0 6px 16px rgba(15,23,42,.08);color:#111827;position:sticky;top:12px;}
        .actas-code-guide>summary{cursor:pointer;list-style:none;padding:11px 12px;background:#e0f2fe;color:#075985;font-size:12px;font-weight:900;display:flex;justify-content:space-between;align-items:center;gap:8px;}
        .actas-code-guide>summary::-webkit-details-marker{display:none;}
        .actas-code-guide>summary:after{content:'▾';font-size:13px;}
        .actas-code-guide:not([open])>summary:after{content:'▸';}
        .actas-code-guide-body{padding:10px;}
        .actas-code-guide img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid #e2e8f0;background:#fff;}
        .actas-code-guide p{margin:8px 0 0;font-size:11px;line-height:1.35;color:#475569;font-weight:700;}
        .actas-mobile{display:none;}
        @media(max-width:900px){.actas-filters-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.actas-upload-layout{grid-template-columns:1fr}.actas-code-guide{position:static;}}
        @media(max-width:760px){.actas-grid,.actas-kpis{grid-template-columns:1fr 1fr}.actas-table{display:none}.actas-mobile{display:block}.actas-card{font-size:13px}.actas-head h2{font-size:20px}.actas-filters-grid,.actas-filters-grid.tech{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.actas-auto-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:480px){.actas-grid,.actas-kpis,.actas-auto-grid,.actas-filters-grid,.actas-filters-grid.tech{grid-template-columns:1fr}}
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
                ${(esAlmacenActas(u.perfil) || esJefaturaAlmacenActas(u.perfil) || esJefaturaActas(u.perfil)) ? `<button class="actas-btn blue" onclick="actualizarDatosAutomaticosActasFrontend(this)">🧩 Actualizar datos automáticos</button>` : ""}
                <button class="actas-btn sec" onclick="cargarActas()">🔄 Actualizar vista</button>
            </div>
            <div id="actasResumen"></div>
            <div id="actasFiltros"></div>
            <div id="actasLista">Cargando...</div>
        </div>
    `);
    cargarActas();
}

async function actualizarDatosAutomaticosActasFrontend(btn){
    const u = usuarioActualActas();
    const estadoVista = obtenerEstadoVistaActas();
    try{
        if(btn){ btn.disabled = true; btn.textContent = "Actualizando..."; }
        const data = await apiActas({accion:"actualizarDatosAutomaticosActas", usuario:u.usuario});
        alert(`✅ Actualización terminada\n\nActas actualizadas: ${data.actasActualizadas || 0}\nCampos completados: ${data.camposActualizados || 0}\nActas aún pendientes de datos: ${data.pendientes || 0}`);
        await cargarActas(estadoVista);
    }catch(err){
        alert("❌ " + err.message);
    }finally{
        if(btn){ btn.disabled = false; btn.textContent = "🧩 Actualizar datos automáticos"; }
    }
}

function construirFiltrosActas(actas){
    const cont = document.getElementById("actasFiltros");
    if(!cont) return;
    const u = usuarioActualActas();
    const prev = {
        codigoPedido:document.getElementById("filtroActaCodigoPedido")?.value || "",
        numeroActa:document.getElementById("filtroActaNumero")?.value || "",
        fecha:document.getElementById("filtroActaFecha")?.value || "",
        cuadrilla:document.getElementById("filtroActaCuadrilla")?.value || "",
        sede:document.getElementById("filtroActaSede")?.value || "",
        estado:document.getElementById("filtroActaEstado")?.value || ""
    };
    if(u.perfil === "TECNICO"){
        cont.innerHTML = `<div class="actas-filters">
            <div class="actas-filters-title">🔎 Filtros de mis actas</div>
            <div class="actas-filters-grid tech">
                <div class="actas-filter-field"><label>Código de pedido</label><input id="filtroActaCodigoPedido" value="${limpiarHtmlActas(prev.codigoPedido)}" placeholder="Buscar código" oninput="aplicarFiltrosActas()"></div>
                <div class="actas-filter-field"><label>Número de acta</label><input id="filtroActaNumero" value="${limpiarHtmlActas(prev.numeroActa)}" placeholder="Buscar número" oninput="aplicarFiltrosActas()"></div>
                <div class="actas-filter-actions"><button class="actas-btn sec" type="button" onclick="limpiarFiltrosActas()">Limpiar filtros</button></div>
            </div>
            <div id="actasFiltroResultado" class="actas-filter-result"></div>
        </div>`;
        return;
    }
    const cuadrillas = [...new Set((actas||[]).map(a => (a.cuadrilla || "").toString().trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    const sedes = [...new Set((actas||[]).map(a => (a.sede || "").toString().trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    const mostrarSede = esPerfilJefaturaFiltroActas(u.perfil);
    cont.innerHTML = `<div class="actas-filters">
        <div class="actas-filters-title">🔎 Filtros de Gestión de Actas</div>
        <div class="actas-filters-grid">
            <div class="actas-filter-field"><label>Número de acta</label><input id="filtroActaNumero" value="${limpiarHtmlActas(prev.numeroActa)}" placeholder="Buscar número" oninput="aplicarFiltrosActas()"></div>
            <div class="actas-filter-field"><label>Fecha</label><input type="date" id="filtroActaFecha" value="${limpiarHtmlActas(prev.fecha)}" onchange="aplicarFiltrosActas()"></div>
            ${mostrarSede ? `<div class="actas-filter-field"><label>Sede</label><select id="filtroActaSede" onchange="actualizarCuadrillasFiltroActas();aplicarFiltrosActas()"><option value="">Todas</option>${sedes.map(x=>`<option value="${limpiarHtmlActas(x)}" ${normalizarActas(prev.sede)===normalizarActas(x)?"selected":""}>${limpiarHtmlActas(x)}</option>`).join("")}</select></div>` : ""}
            <div class="actas-filter-field"><label>Cuadrilla</label><select id="filtroActaCuadrilla" onchange="aplicarFiltrosActas()"><option value="">Todas</option>${cuadrillas.map(x=>`<option value="${limpiarHtmlActas(x)}" ${normalizarActas(prev.cuadrilla)===normalizarActas(x)?"selected":""}>${limpiarHtmlActas(x)}</option>`).join("")}</select></div>
            <div class="actas-filter-field"><label>Estado del acta</label><select id="filtroActaEstado" onchange="aplicarFiltrosActas()"><option value="">Todos</option>${["PENDIENTE","OBSERVADA","FINALIZADA","FALTANTE"].map(x=>`<option value="${x}" ${prev.estado===x?"selected":""}>${x}</option>`).join("")}</select></div>
            <div class="actas-filter-actions"><button class="actas-btn sec" type="button" onclick="limpiarFiltrosActas()">Limpiar filtros</button></div>
        </div>
        <div id="actasFiltroResultado" class="actas-filter-result"></div>
    </div>`;
    actualizarCuadrillasFiltroActas(true);
}

function actualizarCuadrillasFiltroActas(conservarSeleccion){
    const sel = document.getElementById("filtroActaCuadrilla");
    if(!sel) return;
    const actual = conservarSeleccion ? sel.value : "";
    const sede = normalizarActas(document.getElementById("filtroActaSede")?.value || "");
    const cuadrillas = [...new Set((window._actasTodas || [])
        .filter(a => !sede || normalizarActas(a.sede) === sede)
        .map(a => (a.cuadrilla || "").toString().trim()).filter(Boolean))]
        .sort((a,b)=>a.localeCompare(b,"es"));
    sel.innerHTML = `<option value="">Todas</option>` + cuadrillas.map(x=>`<option value="${limpiarHtmlActas(x)}">${limpiarHtmlActas(x)}</option>`).join("");
    if(cuadrillas.some(x => normalizarActas(x) === normalizarActas(actual))) sel.value = actual;
}

function limpiarFiltrosActas(){
    ["filtroActaCodigoPedido","filtroActaNumero","filtroActaFecha","filtroActaCuadrilla","filtroActaSede","filtroActaEstado"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
    actualizarCuadrillasFiltroActas();
    aplicarFiltrosActas();
}

function aplicarFiltrosActas(opciones){
    const todas = window._actasTodas || [];
    const codigoPedido = normalizarActas(document.getElementById("filtroActaCodigoPedido")?.value || "");
    const numeroActa = normalizarActas(document.getElementById("filtroActaNumero")?.value || "");
    const fecha = document.getElementById("filtroActaFecha")?.value || "";
    const cuadrilla = normalizarActas(document.getElementById("filtroActaCuadrilla")?.value || "");
    const sede = normalizarActas(document.getElementById("filtroActaSede")?.value || "");
    const estado = normalizarActas(document.getElementById("filtroActaEstado")?.value || "");
    const filtradas = todas.filter(a => {
        if(codigoPedido && !normalizarActas(a.codigoPedido).includes(codigoPedido)) return false;
        if(numeroActa && !normalizarActas(a.numeroActa).includes(numeroActa)) return false;
        if(fecha && fechaIsoFiltroActas(a.fechaGestion || a.fechaRegistro) !== fecha) return false;
        if(cuadrilla && normalizarActas(a.cuadrilla) !== cuadrilla) return false;
        if(sede && normalizarActas(a.sede) !== sede) return false;
        if(estado && estadoFiltroActas(a) !== estado) return false;
        return true;
    });
    const resultado = document.getElementById("actasFiltroResultado");
    if(resultado) resultado.textContent = `${filtradas.length} de ${todas.length} actas visibles.`;
    renderActasFiltradas(filtradas, opciones || {});
}

function renderActasFiltradas(actas, opciones){
    const u = usuarioActualActas();
    const lista = document.getElementById("actasLista");
    if(!lista) return;
    if(actas.length === 0){
        lista.innerHTML = `<div class="actas-card actas-empty">No hay actas que coincidan con los filtros.</div>`;
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
    if(u.perfil === "TECNICO"){
        lista.innerHTML = `
            <table class="actas-table">
                <thead><tr><th>Fecha</th><th>N.º Acta</th><th>Código pedido</th><th>Cuadrilla / Sede</th><th>Ejecución</th><th>Escaneo</th><th>Entrega física</th><th>PDF</th><th>Detalle</th></tr></thead>
                <tbody>${actas.map(a => filaActaLecturaHtml(a)).join("")}</tbody>
            </table>
            <div class="actas-mobile">${actas.map(a => cardActaLecturaHtml(a)).join("")}</div>
        `;
    }else{
        lista.innerHTML = `<div>${actas.map(a => cardActaSoloEstadoHtml(a)).join("")}</div>`;
    }
    restaurarEstadoVistaActas(opciones);
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
        window._actasTodas = actas;
        construirFiltrosActas(actas);
        if(actas.length === 0){
            lista.innerHTML = `<div class="actas-card actas-empty">No hay actas registradas.</div>`;
            const resultado = document.getElementById("actasFiltroResultado");
            if(resultado) resultado.textContent = "0 actas visibles.";
            return;
        }
        aplicarFiltrosActas(opciones);
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

function claseEstadoMarcoActa(a){
    if(esActaFaltantePendiente(a)) return "actas-status-orange";
    const observado = estaObservadaActa(a) || !!(a.motivoReversionFisica || "").toString().trim();
    if(observado) return "actas-status-red";
    const escaneoOk = estaFinalizadaActa(a);
    const entregaOk = normalizarActas(a.estadoEntregaFisica) === "ENTREGADA";
    if(escaneoOk && entregaOk) return "actas-status-green";
    return "actas-status-yellow";
}

function cardActaSoloEstadoHtml(a){
    return `<div class="actas-read-card ${claseEstadoMarcoActa(a)}">
        <div class="actas-read-main">
            <div><span>N.º de acta</span><br><b>${limpiarHtmlActas(a.numeroActa || "-")}</b></div>
            <div><span>Código</span><br><b>${limpiarHtmlActas(a.codigoPedido || "-")}</b></div>
            <div><span>Fecha</span><br><b>${fechaVisibleActas(a.fechaGestion || a.fechaRegistro)}</b></div>
        </div>
        <div class="actas-read-states">
            <div class="actas-read-state"><small>Escaneo</small>${badgeActa(a)}</div>
            <div class="actas-read-state"><small>Entrega física</small>${etiquetaEntregaFisicaActas(a.estadoEntregaFisica)}</div>
        </div>
    </div>`;
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
    return `<div class="actas-card ${claseEstadoMarcoActa(a)}">
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
    return `<div class="actas-process-card ${claseEstadoMarcoActa(a)}" data-acta-id="${limpiarHtmlActas(a.id || "")}">
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
    return sedes.map((sede, i) => bloqueSedeActas(sede, actas.filter(a => normalizarActas(a.sede) === sede), i === 0)).join("");
}

function vistaResponsableAlmacenPorProcesos(actas, sedeUsuario){
    const sede = normalizarActas(sedeUsuario || "SIN SEDE");
    const propias = actas.filter(a => normalizarActas(a.sede) === sede);
    return bloqueSedeActas(sede, propias, true);
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

function fechaHoyLimaActas(){
    const partes = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Lima", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date());
    const mapa = {};
    partes.forEach(p => mapa[p.type] = p.value);
    return `${mapa.year}-${mapa.month}-${mapa.day}`;
}

function valorAutomaticoVisibleActa(valor){
    return valor ? limpiarHtmlActas(valor) : "Pendiente de actualización";
}

function pintarDatosAutomaticosActa(datos, estadoTexto, clase){
    const ids = {
        sede:"actaAutoSede", cuadrilla:"actaAutoCuadrilla", fechaGestion:"actaAutoFecha",
        tipoEjecucion:"actaAutoTipoEjecucion", tipoPartida:"actaAutoTipoPartida",
        dni:"actaAutoDni", cliente:"actaAutoCliente"
    };
    Object.keys(ids).forEach(k => {
        const el = document.getElementById(ids[k]);
        if(!el) return;
        const valor = k === "fechaGestion" ? fechaVisibleActas(datos[k]) : datos[k];
        el.innerHTML = valorAutomaticoVisibleActa(valor);
    });
    const estado = document.getElementById("actaAutoEstado");
    if(estado){
        estado.className = `actas-auto-status ${clase || ""}`;
        estado.textContent = estadoTexto || "Los datos se completarán automáticamente al ingresar los códigos.";
    }
}

let temporizadorDatosAutomaticosActa = null;
let secuenciaDatosAutomaticosActa = 0;

function programarConsultaDatosAutomaticosActa(){
    clearTimeout(temporizadorDatosAutomaticosActa);
    temporizadorDatosAutomaticosActa = setTimeout(consultarDatosAutomaticosFormularioActa, 450);
}

async function consultarDatosAutomaticosFormularioActa(){
    const codigoOrden = document.getElementById("actaCodigoOrden")?.value.trim() || "";
    const codigoPedido = document.getElementById("actaCodigoPedido")?.value.trim() || "";
    const base = window._actaAutomaticosBase || {};
    if(!codigoOrden && !codigoPedido){
        pintarDatosAutomaticosActa(base, "Ingrese el código de orden o el código de pedido para consultar los datos automáticos.", "warn");
        return;
    }
    const numeroConsulta = ++secuenciaDatosAutomaticosActa;
    pintarDatosAutomaticosActa(Object.assign({}, base, {tipoEjecucion:"",tipoPartida:"",dni:"",cliente:""}), "Buscando información en Mapa Operativo y Producción...", "");
    try{
        const u = usuarioActualActas();
        const respuesta = await apiActas({
            accion:"consultarDatosAutomaticosActa",
            usuario:u.usuario,
            codigoOrden:codigoOrden,
            codigoPedido:codigoPedido
        });
        if(numeroConsulta !== secuenciaDatosAutomaticosActa) return;
        const encontrados = respuesta.automaticos || {};
        const esRegistroOriginal = codigoPedido === (base.codigoPedidoOriginal || "") && codigoOrden === (base.codigoOrdenOriginal || "");
        const datos = Object.assign({}, base, encontrados);
        if(esRegistroOriginal){
            ["tipoEjecucion","tipoPartida","dni","cliente"].forEach(k => {
                if(!datos[k] && base[k]) datos[k] = base[k];
            });
        }
        window._actaAutomaticosActuales = datos;
        let mensaje = "";
        let clase = "ok";
        if(encontrados.encontradoMapa && encontrados.encontradoProduccion){
            mensaje = "Datos encontrados en Mapa Operativo y Producción.";
        }else if(encontrados.encontradoMapa){
            mensaje = "Mapa Operativo encontrado. El tipo de partida queda pendiente hasta que Producción tenga una coincidencia válida.";
            clase = "warn";
        }else{
            mensaje = "No se encontró coincidencia todavía. El acta podrá guardarse y los datos podrán completarse posteriormente desde Gestión de Actas.";
            clase = "warn";
        }
        pintarDatosAutomaticosActa(datos, mensaje, clase);
    }catch(err){
        if(numeroConsulta !== secuenciaDatosAutomaticosActa) return;
        pintarDatosAutomaticosActa(base, "No se pudo consultar ahora: " + err.message, "warn");
    }
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
    const fechaAutomatica = actaPrefill?.fechaGestion || fechaHoyLimaActas();
    window._actaAutomaticosBase = {
        sede:u.sede,
        cuadrilla:u.cuadrilla,
        fechaGestion:fechaAutomatica,
        tipoEjecucion:actaPrefill?.tipoEjecucion || "",
        tipoPartida:actaPrefill?.tipoPartida || "",
        dni:actaPrefill?.dni || "",
        cliente:actaPrefill?.cliente || "",
        codigoPedidoOriginal:(actaPrefill?.codigoPedido || codigoPedidoPrefill || "").toString(),
        codigoOrdenOriginal:(actaPrefill?.codigoOrden || "").toString()
    };
    window._actaAutomaticosActuales = Object.assign({}, window._actaAutomaticosBase);
    mostrarPantalla(`
        ${estiloActas()}
        <div class="actas-wrap">
            <div class="actas-head"><h2>📄 ${esFaltante ? "Completar Acta Faltante" : (codigoPedidoPrefill ? "Reemplazar Acta Observada" : "Subir Acta Escaneada")}</h2><p>Ingresa los códigos, el número de acta y adjunta el PDF. Los demás datos se completan automáticamente.</p></div>
            <form id="formActa" onsubmit="event.preventDefault(); guardarActa(this.querySelector('[data-guardar]'))">
                <div class="actas-upload-layout">
                    <div class="actas-upload-main">
                        <div class="actas-grid">
                            <div class="actas-field"><label>Código de orden</label><input id="actaCodigoOrden" value="${limpiarHtmlActas(actaPrefill?.codigoOrden || "")}" required oninput="programarConsultaDatosAutomaticosActa()" onblur="consultarDatosAutomaticosFormularioActa()"></div>
                            <div class="actas-field"><label>Código de pedido</label><input id="actaCodigoPedido" value="${limpiarHtmlActas(codigoPedidoPrefill || actaPrefill?.codigoPedido || "")}" ${codigoPedidoPrefill ? "readonly" : ""} required oninput="programarConsultaDatosAutomaticosActa()" onblur="consultarDatosAutomaticosFormularioActa()"></div>
                            <div class="actas-field" style="grid-column:1/-1"><label>Número de acta</label><input id="actaNumeroActa" value="${limpiarHtmlActas(actaPrefill?.numeroActa || "")}" placeholder="Ej.: 00015487" required></div>
                            <div class="actas-auto-card">
                                <div class="actas-auto-title">Datos automáticos</div>
                                <div class="actas-auto-grid">
                                    <div class="actas-auto-item"><span>Sede</span><b id="actaAutoSede"></b></div>
                                    <div class="actas-auto-item"><span>Cuadrilla</span><b id="actaAutoCuadrilla"></b></div>
                                    <div class="actas-auto-item"><span>Fecha de gestión</span><b id="actaAutoFecha"></b></div>
                                    <div class="actas-auto-item"><span>Tipo de ejecución</span><b id="actaAutoTipoEjecucion"></b></div>
                                    <div class="actas-auto-item"><span>Tipo de partida</span><b id="actaAutoTipoPartida"></b></div>
                                    <div class="actas-auto-item"><span>DNI</span><b id="actaAutoDni"></b></div>
                                    <div class="actas-auto-item"><span>Cliente</span><b id="actaAutoCliente"></b></div>
                                </div>
                                <div id="actaAutoEstado" class="actas-auto-status"></div>
                            </div>
                            <div class="actas-field" style="grid-column:1/-1"><label>Acta escaneada PDF</label><input type="file" id="actaPdf" accept="application/pdf,.pdf" required></div>
                        </div>
                        <div id="actaMsg"></div>
                        <div class="actas-actions">
                            <button class="actas-btn ok" data-guardar type="submit">${esFaltante ? "Completar acta" : (codigoPedidoPrefill ? "Reemplazar PDF" : "Guardar Acta")}</button>
                            <button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Cancelar</button>
                        </div>
                    </div>
                    <details id="guiaCodigosActa" class="actas-code-guide" open>
                        <summary>¿Dónde encuentro los códigos?</summary>
                        <div class="actas-code-guide-body">
                            <img src="./img/guia_codigos_acta.png?v=V264" alt="Guía para ubicar el código de orden y el código de pedido">
                            <p><b>Código de orden:</b> aparece junto a “Orden N.°”.<br><b>Código de pedido:</b> aparece junto a “Seguimiento Cliente”.</p>
                        </div>
                    </details>
                </div>
            </form>
        </div>
    `);
    const guiaCodigos = document.getElementById("guiaCodigosActa");
    if(guiaCodigos && window.matchMedia && window.matchMedia("(max-width: 900px)").matches) guiaCodigos.open = false;
    pintarDatosAutomaticosActa(window._actaAutomaticosBase, "Los datos se completarán automáticamente al validar los códigos.", "");
    if(document.getElementById("actaCodigoOrden")?.value || document.getElementById("actaCodigoPedido")?.value){
        consultarDatosAutomaticosFormularioActa();
    }
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
            codigoOrden:document.getElementById("actaCodigoOrden").value,
            codigoPedido:document.getElementById("actaCodigoPedido").value,
            numeroActa:document.getElementById("actaNumeroActa").value,
            archivoBase64:pdf.base64,
            archivoNombre:pdf.nombre,
            archivoMimeType:pdf.mime
        };
        const data = await apiActas(payload);
        const pendientes = [];
        if(!data.tipoPartida) pendientes.push("tipo de partida");
        if(!data.dni) pendientes.push("DNI");
        if(!data.cliente) pendientes.push("cliente");
        const nota = pendientes.length ? `<br><small>Datos pendientes de actualización automática: ${limpiarHtmlActas(pendientes.join(", "))}.</small>` : "";
        if(msg) msg.innerHTML = `<div class="actas-msg ok">✅ Acta registrada correctamente.<br>Archivo: ${limpiarHtmlActas(data.nombreArchivo)}<br>Estado: PENDIENTE<br>Versión: ${data.version || 1}${nota}</div>`;
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
