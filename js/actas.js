// MI VISUAL - Gestión de Actas v63 doble validación

const API_ACTAS = "https://script.google.com/macros/s/AKfycby8MgSBvDQcFZ9YBi-UDfYYHmRD4-x1m66mfO5xb0rYXjtbplyyzFhiPc4nCti8MyXK/exec";

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
    if(u.perfil === "SUPERVISOR") subtitulo = "Consulta de actas de tu sede. Solo lectura.";
    if(esJefaturaActas(u.perfil)) subtitulo = "Vista de resumen. Solo lectura.";
    if(esJefaturaAlmacenActas(u.perfil)) subtitulo = "Validación final de actas. Si marcas correcto, el acta queda finalizada.";

    mostrarPantalla(`
        ${estiloActas()}
        <div class="actas-wrap">
            <div class="actas-head">
                <h2>📄 Gestión de Actas</h2>
                <p>${subtitulo}</p>
            </div>
            <div class="actas-actions">
                ${u.perfil === "TECNICO" ? `<button class="actas-btn ok" onclick="mostrarFormularioActa()">+ Subir Acta PDF</button>` : ""}
                <button class="actas-btn sec" onclick="cargarActas()">🔄 Actualizar</button>
            </div>
            <div id="actasResumen"></div>
            <div id="actasLista">Cargando...</div>
        </div>
    `);
    cargarActas();
}

async function cargarActas(){
    const u = usuarioActualActas();
    const lista = document.getElementById("actasLista");
    if(lista) lista.innerHTML = "Cargando actas...";
    try{
        await cargarResumenActas();
        if(esJefaturaActas(u.perfil) && !esJefaturaAlmacenActas(u.perfil)){
            lista.innerHTML = `<div class="actas-card">Vista Jefatura: solo resumen de actas por sede y cuadrilla.</div>`;
            return;
        }
        const data = await apiActas({accion:"listarActasEscaneadas", usuario:u.usuario});
        if(!data.actas || data.actas.length === 0){
            lista.innerHTML = `<div class="actas-card actas-empty">No hay actas registradas.</div>`;
            return;
        }
        lista.innerHTML = `
            <table class="actas-table">
                <thead><tr><th>Pedido</th><th>Cuadrilla</th><th>Sede</th><th>Ejecución</th><th>Partida</th><th>Estado</th><th>PDF</th><th>Acción</th></tr></thead>
                <tbody>${data.actas.map(a => filaActaHtml(a)).join("")}</tbody>
            </table>
            <div class="actas-mobile">${data.actas.map(a => cardActaHtml(a)).join("")}</div>
        `;
    }catch(err){
        lista.innerHTML = `<div class="actas-msg err">❌ ${err.message}</div>`;
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

function botonesActa(a){
    const u = usuarioActualActas();
    const id = (a.id || "").replace(/'/g,"\\'");
    let html = `<button class="actas-btn sec" onclick="verDetalleActa('${id}')">Ver detalle</button>`;
    if(esAlmacenActas(u.perfil) && !estaFinalizadaActa(a)){
        html += ` <button class="actas-btn ok" onclick="validarActa('${id}','CORRECTO')">Correcto</button>`;
        html += ` <button class="actas-btn warn" onclick="validarActa('${id}','OBSERVADO')">Observado</button>`;
    }
    if(esJefaturaAlmacenActas(u.perfil) && !estaFinalizadaActa(a)){
        html += ` <button class="actas-btn ok" onclick="validarActa('${id}','CORRECTO')">Finalizar correcto</button>`;
        html += ` <button class="actas-btn warn" onclick="validarActa('${id}','OBSERVADO')">Observado</button>`;
    }
    if(u.perfil === "TECNICO" && estaObservadaActa(a) && !estaFinalizadaActa(a)){
        html += ` <button class="actas-btn danger" onclick="mostrarFormularioActa('${limpiarHtmlActas(a.codigoPedido || "")}')">Reemplazar PDF</button>`;
    }
    return html;
}

function filaActaHtml(a){
    const motivo = motivoVisibleActa(a);
    return `<tr>
        <td><b>${limpiarHtmlActas(a.codigoPedido || "-")}</b><br><small>${limpiarHtmlActas(a.codigoOrden || "")}</small></td>
        <td>${limpiarHtmlActas(a.cuadrilla || "-")}</td>
        <td>${limpiarHtmlActas(a.sede || "-")}</td>
        <td>${limpiarHtmlActas(a.tipoEjecucion || "-")}</td>
        <td>${limpiarHtmlActas(a.tipoPartida || "-")}</td>
        <td>${badgeActa(a)}${motivo ? `<br><small>${limpiarHtmlActas(motivo)}</small>` : ""}</td>
        <td>${a.linkActa ? `<a href="${a.linkActa}" target="_blank">Abrir PDF</a>` : "-"}</td>
        <td>${botonesActa(a)}</td>
    </tr>`;
}

function cardActaHtml(a){
    const motivo = motivoVisibleActa(a);
    return `<div class="actas-card">
        <b>${limpiarHtmlActas(a.codigoPedido || "Acta")}</b> ${badgeActa(a)}<br>
        <small>${limpiarHtmlActas(a.sede || "")} • ${limpiarHtmlActas(a.cuadrilla || "")} • ${limpiarHtmlActas(a.tipoEjecucion || "")} • ${limpiarHtmlActas(a.tipoPartida || "")}</small><br>
        ${motivo ? `<div class="actas-msg err">${limpiarHtmlActas(motivo)}</div>` : ""}
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
            ${a.linkActa ? `<a class="actas-btn blue" href="${a.linkActa}" target="_blank">Abrir PDF</a>` : ""}
            ${botonesActa(a)}
        </div>
    </div>`;
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
            <div class="actas-kpi"><b>${g.pendientes || 0}</b><span>Pendientes</span></div>
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
    if(u.perfil !== "TECNICO"){
        mostrarPantalla(`${estiloActas()}<div class="actas-wrap"><div class="actas-msg err">Solo el técnico puede subir actas.</div></div>`);
        return;
    }
    mostrarPantalla(`
        ${estiloActas()}
        <div class="actas-wrap">
            <div class="actas-head"><h2>📄 ${codigoPedidoPrefill ? "Reemplazar Acta Observada" : "Subir Acta Escaneada"}</h2><p>Solo se permite archivo PDF. Si el acta fue observada, el nuevo PDF reemplazará al anterior.</p></div>
            <form id="formActa" onsubmit="event.preventDefault(); guardarActa(this.querySelector('[data-guardar]'))">
                <div class="actas-grid">
                    <div class="actas-field"><label>Sede</label><input value="${limpiarHtmlActas(u.sede)}" disabled></div>
                    <div class="actas-field"><label>Cuadrilla</label><input value="${limpiarHtmlActas(u.cuadrilla)}" disabled></div>
                    <div class="actas-field"><label>Fecha de gestión</label><input type="date" id="actaFechaGestion" required></div>
                    <div class="actas-field"><label>Tipo de ejecución</label><select id="actaTipoEjecucion" required onchange="cargarTiposPartidaActas()"><option value="INSTALACION">INSTALACIÓN</option><option value="VISITA TECNICA">VISITA TÉCNICA / POSTVENTA</option></select></div>
                    <div class="actas-field" style="grid-column:1/-1"><label>Tipo de partida</label><select id="actaTipoPartida" required><option value="">Cargando...</option></select></div>
                    <div class="actas-field"><label>Código de orden</label><input id="actaCodigoOrden" required></div>
                    <div class="actas-field"><label>Código de pedido</label><input id="actaCodigoPedido" value="${limpiarHtmlActas(codigoPedidoPrefill || "")}" ${codigoPedidoPrefill ? "readonly" : ""} required></div>
                    <div class="actas-field"><label>DNI</label><input id="actaDni" required></div>
                    <div class="actas-field"><label>Cliente</label><input id="actaCliente" required></div>
                    <div class="actas-field" style="grid-column:1/-1"><label>Acta escaneada PDF</label><input type="file" id="actaPdf" accept="application/pdf,.pdf" required></div>
                </div>
                <div id="actaMsg"></div>
                <div class="actas-actions">
                    <button class="actas-btn ok" data-guardar type="submit">${codigoPedidoPrefill ? "Reemplazar PDF" : "Guardar Acta"}</button>
                    <button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Cancelar</button>
                </div>
            </form>
        </div>
    `);
    document.getElementById("actaFechaGestion").value = new Date().toISOString().slice(0,10);
    await cargarTiposPartidaActas();
}

async function cargarTiposPartidaActas(){
    const sel = document.getElementById("actaTipoPartida");
    const tipo = document.getElementById("actaTipoEjecucion")?.value || "INSTALACION";
    if(!sel) return;
    try{
        const data = await apiActas({accion:"listarTiposPartidaActas", tipoEjecucion:tipo});
        sel.innerHTML = `<option value="">Seleccione...</option>` + (data.tipos || []).map(t => `<option value="${limpiarHtmlActas(t)}">${limpiarHtmlActas(t)}</option>`).join("");
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
        alert(`Detalle de Acta\n\nPedido: ${a.codigoPedido}\nOrden: ${a.codigoOrden}\nDNI: ${a.dni}\nCliente: ${a.cliente}\nSede: ${a.sede}\nCuadrilla: ${a.cuadrilla}\nTipo Ejecución: ${a.tipoEjecucion || "-"}\nTipo Partida: ${a.tipoPartida}\nEstado: ${a.estado}\nAlmacén: ${a.resultadoAlmacen || "-"}\nMotivo Almacén: ${a.motivoAlmacen || "-"}\nJefatura: ${a.resultadoJefatura || "-"}\nMotivo Jefatura: ${a.motivoJefatura || "-"}\nVersión: ${a.version || 1}`);
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
        cargarActas();
    }catch(err){
        alert("❌ " + err.message);
    }
}
