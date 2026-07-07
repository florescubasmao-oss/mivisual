// MI VISUAL - Módulo Actividad en Campo v45

const API_ACTIVIDAD_CAMPO = "https://script.google.com/macros/s/AKfycbz3HDtjgZvWv0UzLH1fwzt8GGFtKktfU-vAcUgtu85bAjUYyxq4cOPxCHw49jBB4Azl/exec";

function usuarioActualActividad(){
    return {
        usuario: localStorage.getItem("usuario") || "",
        perfil: (localStorage.getItem("perfil") || "").toUpperCase(),
        cuadrilla: localStorage.getItem("cuadrilla") || "",
        sede: localStorage.getItem("sede") || "",
        plataforma: localStorage.getItem("plataforma") || ""
    };
}

function esJefaturaActividad(perfil){
    const p = (perfil || "").toUpperCase();
    return p === "JEFATURA" || p === "ADMIN" || p === "ADMINISTRADOR";
}

async function apiActividadCampo(payload){
    const res = await fetch(API_ACTIVIDAD_CAMPO, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch(e){ throw new Error(txt); }
}

function mostrarCargandoActividad(texto){
    let overlay = document.getElementById("actLoadingOverlay");
    if(!overlay){
        overlay = document.createElement("div");
        overlay.id = "actLoadingOverlay";
        overlay.className = "obs-loading-overlay";
        overlay.innerHTML = `<div class="obs-loading-box"><div class="obs-spinner"></div><b id="actLoadingTexto">Procesando...</b></div>`;
        document.body.appendChild(overlay);
    }
    const t = document.getElementById("actLoadingTexto");
    if(t) t.textContent = texto || "Procesando...";
    overlay.style.display = "flex";
}

function ocultarCargandoActividad(){
    const overlay = document.getElementById("actLoadingOverlay");
    if(overlay) overlay.style.display = "none";
}

function estiloActividadCampo(){
    if(document.getElementById("styleActividadCampo")) return "";
    return `<style id="styleActividadCampo">
        .act-wrap{max-width:1100px;margin:0 auto;padding:12px;color:#fff;}
        .act-head{background:#172946;border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 12px 25px rgba(0,0,0,.25);}
        .act-head h2{margin:0 0 6px;font-size:22px;}
        .act-sub{margin:0;color:#c9d7ef;font-size:13px;}
        .act-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;}
        .act-btn{border:none;border-radius:10px;padding:11px 14px;color:#fff;background:#0d6efd;font-weight:800;cursor:pointer;}
        .act-btn.sec{background:#243855;}
        .act-btn.ok{background:#16a34a;}
        .act-btn.warn{background:#0ea5e9;}
        .act-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
        .act-field{display:flex;flex-direction:column;gap:6px;}
        .act-field label{font-size:12px;font-weight:800;color:#d9e7ff;}
        .act-field input,.act-field select,.act-field textarea{width:100%;box-sizing:border-box;border:1px solid #34506f;background:#0c1d34;color:#fff;border-radius:10px;padding:11px;font-size:14px;}
        .act-field textarea{min-height:90px;resize:vertical;}
        .act-card{background:#20314e;border-radius:14px;padding:14px;margin:10px 0;border:1px solid rgba(255,255,255,.08);}
        .act-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0;}
        .act-kpi{background:#13243f;border-radius:14px;padding:14px;text-align:center;}
        .act-kpi span{display:block;font-size:12px;color:#c9d7ef;}
        .act-kpi b{font-size:26px;}
        .act-table{width:100%;border-collapse:collapse;font-size:12px;}
        .act-table th,.act-table td{border-bottom:1px solid rgba(255,255,255,.1);padding:9px;text-align:left;vertical-align:top;}
        .act-table th{color:#9ec5ff;background:#172946;}
        .act-links a{display:inline-block;margin:3px 5px 3px 0;color:#9ec5ff;font-weight:800;}
        .act-msg{margin-top:10px;font-weight:800;}
        .act-vacio{background:#20314e;padding:18px;border-radius:14px;text-align:center;color:#c9d7ef;}
        .act-error{background:#7f1d1d;padding:14px;border-radius:14px;}
        .act-detail{display:none;background:#0c1d34;border-radius:12px;padding:12px;margin-top:8px;}
        .act-filter{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0;}
        @media(max-width:720px){.act-grid,.act-kpis,.act-filter{grid-template-columns:1fr}.act-table{font-size:11px}.act-wrap{padding:8px}}
    </style>`;
}

function mostrarActividadCampo(){
    const u = usuarioActualActividad();
    if(!(u.perfil === "SUPERVISOR" || esJefaturaActividad(u.perfil))){
        mostrarPantalla(`<div class="act-wrap"><div class="act-error">No tienes permiso para acceder a Actividad en Campo.</div></div>`);
        return;
    }

    mostrarPantalla(`
        ${estiloActividadCampo()}
        <div class="act-wrap">
            <div class="act-head">
                <h2>📍 Registro de Actividad en Campo</h2>
                <p class="act-sub">Registro de auditorías, supervisiones y seguimiento operativo.</p>
            </div>
            <div class="act-actions">
                <button class="act-btn ok" onclick="mostrarFormularioActividadCampo()">+ Nueva actividad</button>
                <button class="act-btn sec" onclick="cargarActividadCampo()">🔄 Actualizar lista</button>
            </div>
            ${esJefaturaActividad(u.perfil) ? `<div id="resumenActividadCampo"></div>` : ""}
            <div id="filtrosActividadCampo"></div>
            <div id="listaActividadCampo">Cargando...</div>
        </div>
    `);

    prepararFiltrosActividadCampo();
    cargarActividadCampo();
}

function prepararFiltrosActividadCampo(){
    const u = usuarioActualActividad();
    const cont = document.getElementById("filtrosActividadCampo");
    if(!cont) return;

    cont.innerHTML = `
        <div class="act-card">
            <b>Filtros</b>
            <div class="act-filter">
                <div class="act-field"><label>Desde</label><input type="date" id="actFechaDesde"></div>
                <div class="act-field"><label>Hasta</label><input type="date" id="actFechaHasta"></div>
                <div class="act-field"><label>Tipo</label>
                    <select id="actFiltroTipo">
                        <option value="">Todos</option>
                        <option>AUDITORIA EN FRIO</option>
                        <option>SUPERVISION EN CALIENTE</option>
                        <option>SEGUIMIENTO</option>
                        <option>VALIDACION DE OBSERVACION</option>
                        <option>CAPACITACION</option>
                        <option>CHECKLIST</option>
                    </select>
                </div>
                ${esJefaturaActividad(u.perfil) ? `
                    <div class="act-field"><label>Sede</label>
                        <select id="actFiltroSede">
                            <option value="">Todas</option>
                            <option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option>
                        </select>
                    </div>
                    <div class="act-field"><label>Supervisor</label><input id="actFiltroSupervisor" placeholder="Usuario supervisor"></div>
                ` : ""}
                <div class="act-field"><label>Cuadrilla</label><input id="actFiltroCuadrilla" placeholder="Nombre de cuadrilla"></div>
            </div>
            <button class="act-btn warn" onclick="cargarActividadCampo()">Aplicar filtros</button>
        </div>
    `;
}

async function cargarActividadCampo(){
    const u = usuarioActualActividad();
    const cont = document.getElementById("listaActividadCampo");
    if(!cont) return;
    cont.innerHTML = "Cargando actividades...";

    try{
        const filtros = {
            accion: "listarActividadCampo",
            usuario: u.usuario,
            fechaDesde: document.getElementById("actFechaDesde")?.value || "",
            fechaHasta: document.getElementById("actFechaHasta")?.value || "",
            tipoActividad: document.getElementById("actFiltroTipo")?.value || "",
            sede: document.getElementById("actFiltroSede")?.value || "",
            supervisor: document.getElementById("actFiltroSupervisor")?.value || "",
            cuadrilla: document.getElementById("actFiltroCuadrilla")?.value || ""
        };

        if(esJefaturaActividad(u.perfil)) await cargarResumenActividadCampo(filtros);

        const data = await apiActividadCampo(filtros);
        if(!data.ok) throw new Error(data.error || "Error al listar actividades");

        if(!data.actividades || data.actividades.length === 0){
            cont.innerHTML = `<div class="act-vacio">No hay actividades registradas.</div>`;
            return;
        }

        cont.innerHTML = `
            <div class="act-card">
                <b>Registros encontrados: ${data.actividades.length}</b>
                <div style="overflow:auto;margin-top:10px;">
                    <table class="act-table">
                        <thead><tr>
                            <th>Fecha</th><th>Supervisor</th><th>Sede</th><th>Cuadrilla</th><th>Tipo</th><th>Estado</th><th>Evidencias</th><th>Detalle</th>
                        </tr></thead>
                        <tbody>${data.actividades.map((a,i)=>filaActividadCampo(a,i)).join("")}</tbody>
                    </table>
                </div>
            </div>
        `;
    }catch(err){
        cont.innerHTML = `<div class="act-error">❌ ${err.message}</div>`;
    }
}

async function cargarResumenActividadCampo(filtros){
    const cont = document.getElementById("resumenActividadCampo");
    if(!cont) return;

    const data = await apiActividadCampo(Object.assign({}, filtros, { accion: "obtenerResumenActividadCampo" }));
    if(!data.ok) throw new Error(data.error || "Error al obtener resumen");

    const t = data.totales || {};
    cont.innerHTML = `
        <div class="act-kpis">
            <div class="act-kpi"><span>Auditoría en Frío</span><b>${t["AUDITORIA EN FRIO"] || 0}</b></div>
            <div class="act-kpi"><span>Supervisión</span><b>${t["SUPERVISION EN CALIENTE"] || 0}</b></div>
            <div class="act-kpi"><span>Seguimiento</span><b>${t["SEGUIMIENTO"] || 0}</b></div>
            <div class="act-kpi"><span>Total</span><b>${t.TOTAL || 0}</b></div>
        </div>
        <div class="act-card">
            <b>Resumen por supervisor</b>
            <div style="overflow:auto;margin-top:10px;">
                <table class="act-table">
                    <thead><tr><th>Supervisor</th><th>Auditoría</th><th>Supervisión</th><th>Seguimiento</th><th>Validación</th><th>Capacitación</th><th>Checklist</th><th>Total</th></tr></thead>
                    <tbody>${(data.resumen || []).map(r => `
                        <tr>
                            <td>${r.supervisor || "-"}</td>
                            <td>${r["AUDITORIA EN FRIO"] || 0}</td>
                            <td>${r["SUPERVISION EN CALIENTE"] || 0}</td>
                            <td>${r["SEGUIMIENTO"] || 0}</td>
                            <td>${r["VALIDACION DE OBSERVACION"] || 0}</td>
                            <td>${r["CAPACITACION"] || 0}</td>
                            <td>${r["CHECKLIST"] || 0}</td>
                            <td><b>${r.TOTAL || 0}</b></td>
                        </tr>
                    `).join("")}</tbody>
                </table>
            </div>
        </div>
    `;
}

function filaActividadCampo(a, i){
    const idDetalle = `actDetalle_${i}`;
    const evidencias = [
        a.foto1 ? `<a href="${a.foto1}" target="_blank">Foto 1</a>` : "",
        a.foto2 ? `<a href="${a.foto2}" target="_blank">Foto 2</a>` : "",
        a.fotoActa ? `<a href="${a.fotoActa}" target="_blank">Acta</a>` : ""
    ].filter(Boolean).join(" ") || "-";

    return `
        <tr>
            <td>${a.fecha || "-"}<br><small>${a.hora || ""}</small></td>
            <td>${a.supervisor || "-"}</td>
            <td>${a.sede || "-"}</td>
            <td>${a.cuadrilla || "-"}</td>
            <td>${a.tipoActividad || "-"}</td>
            <td>${a.estadoInstalacion || "-"}</td>
            <td class="act-links">${evidencias}</td>
            <td><button class="act-btn sec" onclick="toggleActividadDetalle('${idDetalle}')">Ver</button></td>
        </tr>
        <tr><td colspan="8">
            <div id="${idDetalle}" class="act-detail">
                <b>Detalle registrado</b><br><br>
                Cliente presente: <b>${a.clientePresente || "-"}</b><br>
                DNI validado: <b>${a.dniValidado || "-"}</b><br>
                DROP metraje: <b>${a.dropMetraje || "-"}</b><br>
                Templadores: <b>${a.templadores || "-"}</b><br>
                Reserva cable: <b>${a.reservaCable || "-"}</b><br>
                Potencia conforme: <b>${a.potenciaConforme || "-"}</b><br>
                Velocidad conforme: <b>${a.velocidadConforme || "-"}</b><br>
                Limpieza trabajo: <b>${a.limpiezaTrabajo || "-"}</b><br>
                Cliente conforme: <b>${a.clienteConforme || "-"}</b><br><br>
                <b>Observaciones:</b><br>${a.observaciones || "-"}
            </div>
        </td></tr>
    `;
}

function toggleActividadDetalle(id){
    const el = document.getElementById(id);
    if(!el) return;
    el.style.display = el.style.display === "block" ? "none" : "block";
}

async function mostrarFormularioActividadCampo(){
    const u = usuarioActualActividad();
    mostrarPantalla(`
        ${estiloActividadCampo()}
        <div class="act-wrap">
            <div class="act-head">
                <h2>📍 Nueva Actividad en Campo</h2>
                <p class="act-sub">Primera etapa: Auditoría en Frío.</p>
            </div>
            <div class="act-card">
                <div class="act-grid">
                    <div class="act-field"><label>Supervisor</label><input value="${u.usuario}" disabled></div>
                    <div class="act-field"><label>Sede</label><input value="${u.sede}" disabled></div>
                    <div class="act-field"><label>Cuadrilla visitada</label><select id="actCuadrilla"><option value="">Cargando cuadrillas...</option></select></div>
                    <div class="act-field"><label>Tipo de actividad</label>
                        <select id="actTipoActividad" onchange="validarTipoActividadCampo()">
                            <option>AUDITORIA EN FRIO</option>
                            <option>SUPERVISION EN CALIENTE</option>
                            <option>SEGUIMIENTO</option>
                            <option>VALIDACION DE OBSERVACION</option>
                            <option>CAPACITACION</option>
                            <option>CHECKLIST</option>
                        </select>
                    </div>
                </div>
                <div id="msgTipoActividad" class="act-msg"></div>
            </div>
            <div class="act-card">
                <h3>Auditoría en Frío</h3>
                <div class="act-grid">
                    ${selectSiNo("actClientePresente","Cliente presente")}
                    ${selectSiNo("actDniValidado","DNI validado")}
                    <div class="act-field"><label>Estado de instalación</label><select id="actEstadoInstalacion"><option>FINALIZADA</option><option>CANCELADA</option><option>REPROGRAMADA</option></select></div>
                    <div class="act-field"><label>DROP / Fibra - metraje</label><input type="number" id="actDropMetraje" placeholder="Ejemplo: 120"></div>
                    <div class="act-field"><label>Templadores</label><input type="number" id="actTempladores" placeholder="Ejemplo: 4"></div>
                    ${selectSiNo("actReservaCable","Reserva de cable")}
                    ${selectSiNo("actPotenciaConforme","Potencia conforme")}
                    ${selectSiNo("actVelocidadConforme","Velocidad conforme")}
                    ${selectSiNo("actLimpiezaTrabajo","Limpieza del trabajo")}
                    ${selectSiNo("actClienteConforme","Cliente conforme")}
                    <div class="act-field" style="grid-column:1/-1"><label>Observaciones</label><textarea id="actObservaciones" placeholder="Detalle de hallazgos, compromisos o comentarios."></textarea></div>
                    <div class="act-field"><label>Foto 1</label><input type="file" id="actFoto1" accept="image/*" capture="environment"></div>
                    <div class="act-field"><label>Foto 2</label><input type="file" id="actFoto2" accept="image/*" capture="environment"></div>
                    <div class="act-field"><label>Foto Acta</label><input type="file" id="actFotoActa" accept="image/*" capture="environment"></div>
                </div>
                <div class="act-actions">
                    <button class="act-btn ok" onclick="guardarActividadCampo(this)">💾 Guardar actividad</button>
                    <button class="act-btn sec" onclick="mostrarActividadCampo()">Cancelar</button>
                </div>
                <div id="actMsgGuardar" class="act-msg"></div>
            </div>
        </div>
    `);
    await cargarCuadrillasActividadCampo();
}

function selectSiNo(id, label){
    return `<div class="act-field"><label>${label}</label><select id="${id}"><option>SI</option><option>NO</option><option>NO APLICA</option></select></div>`;
}

function validarTipoActividadCampo(){
    const tipo = document.getElementById("actTipoActividad")?.value || "";
    const msg = document.getElementById("msgTipoActividad");
    if(!msg) return;
    if(tipo !== "AUDITORIA EN FRIO"){
        msg.innerHTML = "⚠️ En v45 solo está habilitado el formulario de AUDITORIA EN FRIO. Los demás tipos quedarán para la siguiente versión.";
    }else{
        msg.innerHTML = "";
    }
}

async function cargarCuadrillasActividadCampo(){
    const u = usuarioActualActividad();
    const select = document.getElementById("actCuadrilla");
    if(!select) return;
    try{
        const data = await apiActividadCampo({ accion:"listarCuadrillasActividadCampo", usuario:u.usuario });
        if(!data.ok) throw new Error(data.error || "Error al listar cuadrillas");
        const lista = data.cuadrillas || [];
        select.innerHTML = `<option value="">Seleccione cuadrilla</option>` + lista.map(x => `<option value="${x.cuadrilla}">${x.cuadrilla} - ${x.sede || ""}</option>`).join("");
    }catch(err){
        select.innerHTML = `<option value="">Error cargando cuadrillas</option>`;
        const msg = document.getElementById("actMsgGuardar");
        if(msg) msg.innerHTML = `❌ ${err.message}`;
    }
}

function leerArchivoActividad(file){
    return new Promise((resolve, reject) => {
        if(!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = e => {
            const result = e.target.result || "";
            resolve({
                base64: result.toString().split(",")[1] || "",
                nombre: file.name || "evidencia.jpg",
                mime: file.type || "image/jpeg"
            });
        };
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
        reader.readAsDataURL(file);
    });
}

async function guardarActividadCampo(btn){
    const u = usuarioActualActividad();
    const msg = document.getElementById("actMsgGuardar");
    if(msg) msg.innerHTML = "";

    const tipo = document.getElementById("actTipoActividad")?.value || "AUDITORIA EN FRIO";
    if(tipo !== "AUDITORIA EN FRIO"){
        if(msg) msg.innerHTML = "❌ Por ahora solo se puede registrar AUDITORIA EN FRIO.";
        return;
    }

    const cuadrilla = document.getElementById("actCuadrilla")?.value || "";
    if(!cuadrilla){
        if(msg) msg.innerHTML = "❌ Selecciona una cuadrilla.";
        return;
    }

    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = "Guardando...";
    mostrarCargandoActividad("Subiendo evidencias y guardando registro...");

    try{
        const foto1 = await leerArchivoActividad(document.getElementById("actFoto1")?.files[0]);
        const foto2 = await leerArchivoActividad(document.getElementById("actFoto2")?.files[0]);
        const fotoActa = await leerArchivoActividad(document.getElementById("actFotoActa")?.files[0]);

        const data = await apiActividadCampo({
            accion: "registrarActividadCampo",
            usuario: u.usuario,
            cuadrilla,
            tipoActividad: tipo,
            clientePresente: document.getElementById("actClientePresente")?.value || "",
            dniValidado: document.getElementById("actDniValidado")?.value || "",
            estadoInstalacion: document.getElementById("actEstadoInstalacion")?.value || "",
            dropMetraje: document.getElementById("actDropMetraje")?.value || "",
            templadores: document.getElementById("actTempladores")?.value || "",
            reservaCable: document.getElementById("actReservaCable")?.value || "",
            potenciaConforme: document.getElementById("actPotenciaConforme")?.value || "",
            velocidadConforme: document.getElementById("actVelocidadConforme")?.value || "",
            limpiezaTrabajo: document.getElementById("actLimpiezaTrabajo")?.value || "",
            clienteConforme: document.getElementById("actClienteConforme")?.value || "",
            observaciones: document.getElementById("actObservaciones")?.value || "",
            foto1,
            foto2,
            fotoActa
        });

        if(!data.ok) throw new Error(data.error || "Error al guardar actividad");
        if(msg) msg.innerHTML = `✅ Actividad registrada correctamente. ID: ${data.id}`;
        setTimeout(mostrarActividadCampo, 900);
    }catch(err){
        if(msg) msg.innerHTML = `❌ ${err.message}`;
    }finally{
        ocultarCargandoActividad();
        btn.disabled = false;
        btn.innerHTML = original;
    }
}
