// MI VISUAL - Módulo Actividad en Campo v52 ajustes operativos

const API_ACTIVIDAD_CAMPO = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

const TIPOS_ACTIVIDAD_CAMPO = [
    "AUDITORIA EN FRIO",
    "SUPERVISION EN CALIENTE",
    "SEGUIMIENTO",
    "VALIDACION DE OBSERVACION",
    "CAPACITACION",
    "CHECKLIST"
];

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
    return p === "JEFATURA" || p === "ADMIN" || p === "ADMINISTRADOR" || p === "OPERACIONES LIMA";
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
        overlay.className = "act-loading-overlay";
        overlay.innerHTML = `<div class="act-loading-box"><div class="act-spinner"></div><b id="actLoadingTexto">Procesando...</b></div>`;
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
    return `<style id="styleActividadCampo">
        .act-wrap{width:100%;max-width:760px;margin:0 auto;padding:14px 14px 96px;color:#fff;box-sizing:border-box;overflow-x:hidden;text-align:left;}
        .act-head{background:linear-gradient(135deg,#172946,#203a63);border-radius:20px;padding:18px;margin-bottom:14px;box-shadow:0 12px 28px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.08);text-align:left;}
        .act-head h2{margin:0 0 7px;font-size:24px;line-height:1.15;}
        .act-sub{margin:0;color:#c9d7ef;font-size:13px;line-height:1.35;}
        .act-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;}
        .act-btn{border:none;border-radius:12px;padding:12px 15px;color:#fff;background:#0d6efd;font-weight:900;cursor:pointer;min-height:44px;box-shadow:0 5px 12px rgba(0,0,0,.18);}
        .act-btn:disabled{opacity:.65;cursor:not-allowed;}
        .act-btn.sec{background:#243855;}
        .act-btn.ok{background:#16a34a;}
        .act-btn.warn{background:#0ea5e9;}
        .act-btn.danger{background:#dc3545;}
        .act-card{background:#20314e;border-radius:18px;padding:16px;margin:12px 0;border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 22px rgba(0,0,0,.18);}
        .act-card h3{margin:0 0 12px;font-size:18px;}
        .act-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:end;width:100%;}
        .act-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:end;width:100%;}
        .act-field{display:flex;flex-direction:column;gap:7px;min-width:0;}
        .act-field label{font-size:12px;font-weight:900;color:#d9e7ff;line-height:1.25;text-transform:uppercase;letter-spacing:.2px;}
        .act-field input,.act-field select,.act-field textarea{width:100%!important;box-sizing:border-box;border:1px solid #3c5d81;background:#0c1d34;color:#fff;border-radius:12px;padding:12px;font-size:15px;outline:none;min-height:44px;margin:0!important;}
        .act-field input:focus,.act-field select:focus,.act-field textarea:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.18);}
        .act-field input[disabled]{opacity:.8;background:#13243f;}
        .act-field textarea{min-height:96px;resize:vertical;line-height:1.35;}
        .act-wide{grid-column:1/-1;}
        .act-section-title{display:flex;align-items:center;gap:8px;margin:4px 0 12px;font-size:18px;font-weight:900;}
        .act-note{background:#0f2d4f;border:1px solid rgba(56,189,248,.32);padding:12px;border-radius:14px;color:#d8ecff;font-size:13px;line-height:1.35;margin:10px 0;}
        .act-msg{margin-top:10px;font-weight:900;line-height:1.35;}
        .act-vacio{background:#20314e;padding:18px;border-radius:14px;text-align:center;color:#c9d7ef;}
        .act-error{background:#7f1d1d;padding:14px;border-radius:14px;line-height:1.35;}
        .act-ok-msg{background:#14532d;padding:14px;border-radius:14px;line-height:1.35;}
        .act-filter{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:10px 0;}
        .act-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0;}
        .act-kpi{background:#13243f;border-radius:16px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,.07);}
        .act-kpi span{display:block;font-size:12px;color:#c9d7ef;line-height:1.2;}
        .act-kpi b{font-size:26px;}
        .act-table-wrap{overflow:auto;margin-top:10px;border-radius:14px;border:1px solid rgba(255,255,255,.08);}
        .act-table{width:100%;border-collapse:collapse;font-size:12px;min-width:820px;}
        .act-table th,.act-table td{border-bottom:1px solid rgba(255,255,255,.1);padding:10px;text-align:left;vertical-align:top;}
        .act-table th{color:#9ec5ff;background:#172946;position:sticky;top:0;}
        .act-links a{display:inline-block;margin:3px 5px 3px 0;color:#fff;background:#0d6efd;border-radius:10px;padding:8px 10px;font-weight:900;text-decoration:none;}
        .act-links a:hover{filter:brightness(1.12);}
        .act-note strong{color:#fff;}
        .act-detail{display:none;background:#0c1d34;border-radius:14px;padding:14px;margin-top:8px;white-space:pre-wrap;line-height:1.38;}
        .act-mobile-card{display:none;background:#13243f;border-radius:16px;padding:14px;margin:10px 0;border:1px solid rgba(255,255,255,.08);}
        .act-mobile-card b{color:#fff;}
        .act-mobile-card small{color:#c9d7ef;}
        .act-file input{padding:10px;background:#0c1d34;color:#dbeafe;}
        /* V142: contraste del Checklist ejecutado en campo */
        .act-card .ck-field label{color:#f8fafc!important;font-size:12px!important;font-weight:900!important;line-height:1.25!important;margin-bottom:7px!important;text-transform:uppercase;letter-spacing:.2px;}
        .act-card .ck-sec,.act-card #ckFormularioTipo h3,.act-card #ckFormularioTipo h4{color:#ffffff!important;font-weight:900!important;}
        .act-card .ck-sec{margin:12px 0 10px!important;}
        .act-card .ck-grid{gap:14px!important;}
        .act-card .ck-field input,.act-card .ck-field select,.act-card .ck-field textarea{border-color:#55779d!important;}
        .act-card .ck-field input:focus,.act-card .ck-field select:focus,.act-card .ck-field textarea:focus{border-color:#38bdf8!important;box-shadow:0 0 0 3px rgba(56,189,248,.18)!important;}
        .act-loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;z-index:9999;}
        .act-loading-box{background:#10213b;color:white;padding:20px;border-radius:16px;text-align:center;box-shadow:0 15px 35px rgba(0,0,0,.35);}
        .act-spinner{width:34px;height:34px;border:4px solid rgba(255,255,255,.25);border-top-color:white;border-radius:50%;animation:actSpin 1s linear infinite;margin:0 auto 10px;}
        @keyframes actSpin{to{transform:rotate(360deg)}}
        @media(max-width:760px){
            .act-wrap{width:100vw;max-width:100vw;padding:10px 12px 100px;margin:0;overflow-x:hidden;}
            #pantalla{width:100%;overflow-x:hidden;}
            .act-head{padding:16px;border-radius:18px;}
            .act-head h2{font-size:20px;}
            .act-sub{font-size:12px;}
            .act-card{padding:14px;border-radius:16px;margin:10px 0;width:100%;box-sizing:border-box;}
            .act-grid,.act-grid-3,.act-filter,.act-kpis{grid-template-columns:1fr;gap:12px;}
            .act-actions{display:grid;grid-template-columns:1fr;gap:10px;}
            .act-btn{width:100%;font-size:14px;}
            .act-field input,.act-field select,.act-field textarea{font-size:16px;min-height:46px;width:100%!important;max-width:100%;}
            .act-table-wrap{display:none;}
            .act-mobile-card{display:block;}
            .act-kpi b{font-size:23px;}
        }
    </style>`;
}

function mostrarActividadCampo(){
    const u = usuarioActualActividad();
    if(!(u.perfil === "SUPERVISOR" || esJefaturaActividad(u.perfil))){
        mostrarPantalla(`${estiloActividadCampo()}<div class="act-wrap"><div class="act-error">No tienes permiso para acceder a Actividad en Campo.</div></div>`);
        return;
    }

    mostrarPantalla(`
        ${estiloActividadCampo()}
        ${typeof ckStyle === "function" ? ckStyle() : ""}
        <div class="act-wrap">
            <div class="act-head">
                <h2>📍 Registro de Actividad en Campo</h2>
                <p class="act-sub">Registro de auditorías, supervisiones, seguimiento, validaciones, capacitaciones y checklist.</p>
            </div>
            <div class="act-actions">
                ${u.perfil === "SUPERVISOR" && (typeof pmPuede!=="function" || pmPuede("ACTIVIDAD CAMPO","REGISTRAR")) ? `<button class="act-btn ok" onclick="mostrarFormularioActividadCampo()">+ Nueva actividad</button>` : ""}
                <button class="act-btn sec" onclick="cargarActividadCampo()">🔄 Actualizar lista</button>
            </div>
            ${esJefaturaActividad(u.perfil) ? `<div class="act-note">Vista Jefatura: consulta y validación visual de registros realizados por supervisores. El registro de nuevas actividades queda habilitado solo para Supervisores.</div>` : ""}
            <div id="resumenActividadCampo"></div>
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
                        ${TIPOS_ACTIVIDAD_CAMPO.map(t => `<option>${t}</option>`).join("")}
                    </select>
                </div>
                ${esJefaturaActividad(u.perfil) ? `
                    <div class="act-field"><label>Sede</label>
                        <select id="actFiltroSede"><option value="">Todas</option><option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option></select>
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

        await cargarResumenActividadCampo(filtros);

        const data = await apiActividadCampo(filtros);
        if(!data.ok) throw new Error(data.error || "Error al listar actividades");

        if(!data.actividades || data.actividades.length === 0){
            cont.innerHTML = `<div class="act-vacio">No hay actividades registradas.</div>`;
            return;
        }

        cont.innerHTML = `
            <div class="act-card">
                <b>Registros encontrados: ${data.actividades.length}</b>
                <div class="act-table-wrap">
                    <table class="act-table">
                        <thead><tr>
                            <th>Fecha</th><th>Supervisor</th><th>Sede</th><th>Cuadrilla</th><th>Tipo</th><th>Estado/Resultado</th><th>Evidencias</th><th>Detalle</th>
                        </tr></thead>
                        <tbody>${data.actividades.map((a,i)=>filaActividadCampo(a,i)).join("")}</tbody>
                    </table>
                </div>
                <div class="act-mobile-list">${data.actividades.map((a,i)=>cardMovilActividadCampo(a,i)).join("")}</div>
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
            <div class="act-kpi"><span>Supervisión en Caliente</span><b>${t["SUPERVISION EN CALIENTE"] || 0}</b></div>
            <div class="act-kpi"><span>Seguimiento</span><b>${t["SEGUIMIENTO"] || 0}</b></div>
            <div class="act-kpi"><span>Total</span><b>${t.TOTAL || 0}</b></div>
        </div>
        <div class="act-card">
            <b>Resumen por supervisor</b>
            <div class="act-table-wrap">
                <table class="act-table">
                    <thead><tr><th>Supervisor</th><th>Aud. Frío</th><th>Sup. Caliente</th><th>Seguimiento</th><th>Val. Obs.</th><th>Capacitación</th><th>Checklist</th><th>Total</th></tr></thead>
                    <tbody>${(data.resumen || data.porSupervisor || []).map(r => `
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

function evidenciasActividadHtml(a){
    return [
        a.foto1 ? `<a href="${a.foto1}" target="_blank">Foto 1</a>` : "",
        a.foto2 ? `<a href="${a.foto2}" target="_blank">Foto 2</a>` : "",
        a.fotoActa ? `<a href="${a.fotoActa}" target="_blank">Acta</a>` : ""
    ].filter(Boolean).join(" ") || "-";
}

function detalleActividadTexto(a){
    return `Tipo: ${a.tipoActividad || "-"}\n\n${a.observaciones || "Sin detalle."}`;
}

function filaActividadCampo(a, i){
    const idDetalle = `actDetalle_${i}`;
    return `
        <tr>
            <td>${a.fecha || "-"}<br><small>${a.hora || ""}</small></td>
            <td>${a.supervisor || "-"}</td>
            <td>${a.sede || "-"}</td>
            <td>${a.cuadrilla || "-"}</td>
            <td>${a.tipoActividad || "-"}</td>
            <td>${a.estadoInstalacion || "-"}</td>
            <td class="act-links">${evidenciasActividadHtml(a)}</td>
            <td><button class="act-btn sec" onclick="toggleActividadDetalle('${idDetalle}')">Ver</button></td>
        </tr>
        <tr><td colspan="8"><div id="${idDetalle}" class="act-detail">${detalleActividadTexto(a)}</div></td></tr>
    `;
}

function cardMovilActividadCampo(a, i){
    const idDetalle = `actDetalleMovil_${i}`;
    return `
        <div class="act-mobile-card">
            <b>${a.tipoActividad || "Actividad"}</b><br>
            <small>${a.fecha || "-"} ${a.hora || ""}</small><br><br>
            <b>Supervisor:</b> ${a.supervisor || "-"}<br>
            <b>Sede:</b> ${a.sede || "-"}<br>
            <b>Cuadrilla:</b> ${a.cuadrilla || "-"}<br>
            <b>Estado/Resultado:</b> ${a.estadoInstalacion || "-"}<br>
            <div class="act-links" style="margin-top:8px;">${evidenciasActividadHtml(a)}</div>
            <button class="act-btn sec" style="margin-top:10px;" onclick="toggleActividadDetalle('${idDetalle}')">Ver detalle</button>
            <div id="${idDetalle}" class="act-detail">${detalleActividadTexto(a)}</div>
        </div>
    `;
}

function toggleActividadDetalle(id){
    const el = document.getElementById(id);
    if(!el) return;
    el.style.display = el.style.display === "block" ? "none" : "block";
}

async function mostrarFormularioActividadCampo(){
    const u = usuarioActualActividad();
    if(u.perfil !== "SUPERVISOR"){
        mostrarPantalla(`${estiloActividadCampo()}<div class="act-wrap"><div class="act-error">El registro de nuevas actividades está habilitado solo para Supervisores. Jefatura puede revisar los registros desde la vista principal.</div><button class="act-btn sec" onclick="mostrarActividadCampo()">Volver</button></div>`);
        return;
    }
    mostrarPantalla(`
        ${estiloActividadCampo()}
        ${typeof ckStyle === "function" ? ckStyle() : ""}
        <div class="act-wrap">
            <div class="act-head">
                <h2>📍 Nueva Actividad en Campo</h2>
                <p class="act-sub">Selecciona el tipo de actividad. El formulario cambiará automáticamente.</p>
            </div>
            <div class="act-card">
                <div class="act-grid">
                    <div class="act-field"><label>Supervisor</label><input value="${u.usuario}" disabled></div>
                    <div class="act-field"><label>Sede</label><input value="${u.sede}" disabled></div>
                    <div class="act-field"><label>Cuadrilla visitada</label><select id="actCuadrilla"><option value="">Cargando cuadrillas...</option></select></div>
                    <div class="act-field"><label>Tipo de actividad</label>
                        <select id="actTipoActividad" onchange="renderFormularioTipoActividad()">
                            ${TIPOS_ACTIVIDAD_CAMPO.map(t => `<option>${t}</option>`).join("")}
                        </select>
                    </div>
                </div>
            </div>
            <form id="formActividadCampo" onsubmit="event.preventDefault(); guardarActividadCampo(this.querySelector('[data-guardar]'));">
                <div id="camposTipoActividad"></div>
                <div class="act-card">
                    <div class="act-section-title">📝 Cierre de actividad</div>
                    <div id="camposCierreActividad" class="act-grid"></div>
                    <div id="actEvidenciasGenerales" class="act-grid" style="margin-top:12px;">
                        <div class="act-field act-file"><label>Foto 1</label><input type="file" id="actFoto1" accept="image/*" capture="environment"></div>
                        <div class="act-field act-file"><label>Foto 2</label><input type="file" id="actFoto2" accept="image/*" capture="environment"></div>
                        <div id="contenedorFotoActa" class="act-field act-file"><label>Foto Acta</label><input type="file" id="actFotoActa" accept="image/*" capture="environment"></div>
                    </div>
                    <div id="actNotaEvidencias" class="act-note">La firma digital queda para la segunda etapa. Por ahora el respaldo será con evidencias fotográficas.</div>
                    <div class="act-actions">
                        <button type="submit" data-guardar class="act-btn ok">💾 Guardar actividad</button>
                        <button type="button" class="act-btn sec" onclick="mostrarActividadCampo()">Cancelar</button>
                    </div>
                    <div id="actMsgGuardar" class="act-msg"></div>
                </div>
            </form>
        </div>
    `);
    await cargarCuadrillasActividadCampo();
    renderFormularioTipoActividad();
}

function selectSiNo(id, label){
    return `<div class="act-field"><label>${label}</label><select id="${id}"><option>SI</option><option>NO</option><option>NO APLICA</option></select></div>`;
}

function campoTexto(id, label, placeholder=""){
    return `<div class="act-field"><label>${label}</label><input id="${id}" placeholder="${placeholder}"></div>`;
}

function campoNumero(id, label, placeholder=""){
    return `<div class="act-field"><label>${label}</label><input type="number" id="${id}" placeholder="${placeholder}"></div>`;
}

function campoFecha(id, label){
    return `<div class="act-field"><label>${label}</label><input type="date" id="${id}"></div>`;
}

function campoArea(id, label, placeholder=""){
    return `<div class="act-field act-wide"><label>${label}</label><textarea id="${id}" placeholder="${placeholder}"></textarea></div>`;
}

function renderCierreActividad(tipo){
    const cont = document.getElementById("camposCierreActividad");
    if(!cont) return;

    if(tipo === "VALIDACION DE OBSERVACION"){
        cont.innerHTML = `<div class="act-note act-wide">Para Validación de Observación se registran únicamente los datos propios de la validación y sus evidencias.</div>`;
        return;
    }

    if(tipo === "CAPACITACION"){
        cont.innerHTML = `${campoArea("actConclusion","Comentario final","Comentario final de la capacitación realizada.")}`;
        return;
    }

    if(tipo === "CHECKLIST"){
        cont.innerHTML = `${campoArea("actConclusion","Comentario final","Detalle del checklist ejecutado en campo, hallazgos y acciones indicadas.")}`;
        return;
    }

    cont.innerHTML = `
        ${campoArea("actObservacionesGenerales","Observaciones generales","Resumen general, hallazgos o comentarios finales.")}
        ${campoArea("actConclusion","Conclusión","Conclusión de la actividad y próximos pasos.")}
    `;
}

function renderFormularioTipoActividad(){
    const tipo = document.getElementById("actTipoActividad")?.value || "AUDITORIA EN FRIO";
    const cont = document.getElementById("camposTipoActividad");
    const fotoActa = document.getElementById("contenedorFotoActa");
    const evidenciasGenerales = document.getElementById("actEvidenciasGenerales");
    const notaEvidencias = document.getElementById("actNotaEvidencias");
    if(fotoActa) fotoActa.style.display = tipo === "AUDITORIA EN FRIO" ? "flex" : "none";
    if(evidenciasGenerales) evidenciasGenerales.style.display = tipo === "CHECKLIST" ? "none" : "grid";
    if(notaEvidencias) notaEvidencias.style.display = tipo === "CHECKLIST" ? "none" : "block";
    if(!cont) return;

    const formularios = {
        "AUDITORIA EN FRIO": formularioAuditoriaFrio(),
        "SUPERVISION EN CALIENTE": formularioSupervisionCaliente(),
        "SEGUIMIENTO": formularioSeguimiento(),
        "VALIDACION DE OBSERVACION": formularioValidacionObservacion(),
        "CAPACITACION": formularioCapacitacion(),
        "CHECKLIST": formularioChecklist()
    };
    cont.innerHTML = formularios[tipo] || formularioAuditoriaFrio();
    renderCierreActividad(tipo);
    if(tipo === "CHECKLIST") inicializarChecklistActividadCampo();
}

function formularioAuditoriaFrio(){
    return `<div class="act-card">
        <div class="act-section-title">🔎 Auditoría en Frío</div>
        <div class="act-grid">
            ${selectSiNo("actClientePresente","Cliente presente")}
            ${selectSiNo("actDniValidado","DNI validado")}
            <div class="act-field"><label>Estado de instalación</label><select id="actEstadoInstalacion"><option>FINALIZADA</option><option>CANCELADA</option><option>REPROGRAMADA</option></select></div>
            ${campoNumero("actDropMetraje","DROP / Fibra - metraje","Ejemplo: 120")}
            ${campoNumero("actTempladores","Templadores","Ejemplo: 4")}
            ${selectSiNo("actReservaCable","Reserva de cable")}
            ${selectSiNo("actPotenciaConforme","Potencia conforme")}
            ${selectSiNo("actVelocidadConforme","Velocidad conforme")}
            ${selectSiNo("actLimpiezaTrabajo","Limpieza del trabajo")}
            ${selectSiNo("actClienteConforme","Cliente conforme")}
        </div>
    </div>`;
}

function formularioSupervisionCaliente(){
    return `<div class="act-card">
        <div class="act-section-title">🔥 Supervisión en Caliente</div>
        <div class="act-grid">
            ${selectSiNo("supLlegadaHora","Técnico llegó a la hora")}
            ${selectSiNo("supUsoEpp","Uso de EPP")}
            ${selectSiNo("supUniforme","Uniforme completo")}
            ${selectSiNo("supIdentificacion","Identificación visible")}
            ${selectSiNo("supExplicoTrabajo","Explicó el trabajo al cliente")}
            ${selectSiNo("supProcedimiento","Procedimiento correcto")}
            ${selectSiNo("supMateriales","Uso correcto de materiales")}
            ${selectSiNo("supPruebas","Pruebas realizadas")}
            ${selectSiNo("supClienteConforme","Cliente conforme")}
        </div>
    </div>`;
}

function formularioSeguimiento(){
    return `<div class="act-card">
        <div class="act-section-title">📌 Seguimiento</div>
        <div class="act-grid">
            <div class="act-field"><label>Motivo del seguimiento</label><select id="segMotivo"><option>BAJA PRODUCCION</option><option>BAJA EFECTIVIDAD</option><option>ALTO RECABLEADO</option><option>ALTO VTR/GAR</option><option>OBSERVACIONES RECURRENTES</option><option>REINCORPORACION</option><option>OTRO</option></select></div>
            ${campoFecha("segFechaSeguimiento","Fecha de seguimiento")}
        </div>
    </div>`;
}

function formularioValidacionObservacion(){
    return `<div class="act-card">
        <div class="act-section-title">✅ Validación de Observación</div>
        <div class="act-grid">
            ${campoTexto("valCodigo","Código de observación","Ejemplo: 3030002")}
            ${campoTexto("valTipo","Tipo de observación","Seguridad, implementación, gestión técnica...")}
            ${selectSiNo("valCorregida","Observación corregida")}
            ${selectSiNo("valEvidencia","Evidencia encontrada")}
            ${selectSiNo("valCumple","Cumple subsanación")}
            ${selectSiNo("valNuevaVisita","Requiere nueva visita")}
            ${campoArea("valComentarios","Comentarios","Detalle de la validación realizada.")}
        </div>
    </div>`;
}

function formularioCapacitacion(){
    return `<div class="act-card">
        <div class="act-section-title">🎓 Capacitación</div>
        <div class="act-grid">
            <div class="act-field"><label>Tema</label><select id="capTema"><option>INSTALACION</option><option>AVERIAS</option><option>RECABLEADO</option><option>ATENCION AL CLIENTE</option><option>SEGURIDAD</option><option>MATERIALES</option><option>PROCEDIMIENTOS WIN</option><option>OTRO</option></select></div>
            ${campoTexto("capTiempo","Tiempo","Ejemplo: 30 minutos")}
            ${campoArea("capParticipantes","Participantes","Nombres o cantidad de participantes.")}
        </div>
    </div>`;
}

function formularioChecklist(){
    if(typeof CK_EQUIPOS === "undefined" || typeof ckEquipoBlock !== "function" || typeof ckField !== "function"){
        return `<div class="act-card"><div class="act-error">No se pudo cargar el formulario de Checklist Almacén.</div></div>`;
    }
    const hoy = new Date().toISOString().slice(0,10);
    return `<div class="act-card">
        <div class="act-section-title">📋 Checklist ejecutado en campo</div>
        <div class="act-note">Este registro ingresará directamente al módulo Checklist Almacén de la cuadrilla seleccionada y conservará el flujo de validación existente.</div>
        <div class="ck-grid">
            <div class="ck-field"><label>Fecha de gestión</label><input id="ckFecha" type="date" value="${hoy}"></div>
            <div class="ck-field"><label>Origen</label><input value="Ejecutado en campo por Supervisor" disabled></div>
        </div>
        <h3 class="ck-sec">Equipos y evidencias</h3>
        <div class="ck-grid ck-equipos-grid">${Object.keys(CK_EQUIPOS).map(ckEquipoBlock).join("")}</div>
        <h3 class="ck-sec">Materiales</h3>
        <div class="ck-grid">
            ${ckField('ckCableDrop','Cable Drop/Bobina','metros')}${ckField('ckPre50','Preconectorizado 50 m','cantidad')}${ckField('ckPre100','Preconectorizado 100 m','cantidad')}${ckField('ckPre150','Preconectorizado 150 m','cantidad')}${ckField('ckPre200','Preconectorizado 200 m','cantidad')}${ckField('ckAnclaje','Anclaje P','cantidad')}${ckField('ckBand','Cinta Band-It','metros')}${ckField('ckHebilla','Hebilla 3/4','unidades')}${ckField('ckAcoplador','Acoplador','unidades')}${ckField('ckRoseta','Roseta','unidades')}${ckField('ckConectores','Conectores ópticos','unidades')}${ckField('ckTempladores','Templadores','unidades')}${ckField('ckSplitter','Splitter','unidades')}${ckField('ckClevis','Clevis','unidades')}${ckField('ckCat5','Cable UTP CAT5','unidades')}${ckField('ckCat6','Cable UTP CAT6','unidades')}${ckField('ckApc','Patchcord APC-APC','unidades')}${ckField('ckUpc','Patchcord UPC-APC','unidades')}${ckField('ckRj45','Conector RJ45','unidades')}
        </div>
    </div>`;
}

function inicializarChecklistActividadCampo(){
    if(typeof CK_EQUIPOS === "undefined" || typeof ckAddEquipo !== "function") return;
    Object.keys(CK_EQUIPOS).forEach(key => ckAddEquipo(key));
}

async function armarChecklistActividadCampo(cuadrilla, comentarioFinal){
    if(typeof ckCollectEquipos !== "function") throw new Error("No se cargaron las funciones del Checklist Almacén");
    const payload={
        fechaGestion:obtenerValor("ckFecha"),
        cuadrilla,
        origenRegistro:"ACTIVIDAD_CAMPO",
        comentarioFinal,
        cableDrop:ckNum('ckCableDrop'),pre50:ckNum('ckPre50'),pre100:ckNum('ckPre100'),pre150:ckNum('ckPre150'),pre200:ckNum('ckPre200'),
        anclajeP:ckNum('ckAnclaje'),cintaBandIt:ckNum('ckBand'),hebilla:ckNum('ckHebilla'),acoplador:ckNum('ckAcoplador'),roseta:ckNum('ckRoseta'),
        conectoresOpticos:ckNum('ckConectores'),templadores:ckNum('ckTempladores'),splitter:ckNum('ckSplitter'),clevis:ckNum('ckClevis'),
        utpCat5:ckNum('ckCat5'),utpCat6:ckNum('ckCat6'),patchApcApc:ckNum('ckApc'),patchUpcApc:ckNum('ckUpc'),rj45:ckNum('ckRj45')
    };
    payload.ontZteEquipos=await ckCollectEquipos('ontZte');
    payload.ontHuaweiEquipos=await ckCollectEquipos('ontHuawei');
    payload.meshZteEquipos=await ckCollectEquipos('meshZte');
    payload.meshHuaweiEquipos=await ckCollectEquipos('meshHuawei');
    payload.winboxEquipos=await ckCollectEquipos('winbox');
    payload.fonowinEquipos=await ckCollectEquipos('fonowin');
    payload.equipos={ontZte:payload.ontZteEquipos,ontHuawei:payload.ontHuaweiEquipos,meshZte:payload.meshZteEquipos,meshHuawei:payload.meshHuaweiEquipos,winbox:payload.winboxEquipos,fonowin:payload.fonowinEquipos};
    return payload;
}

function obtenerValor(id){ return document.getElementById(id)?.value || ""; }

function armarDetalleActividad(tipo){
    const lineas = [];
    lineas.push(`TIPO DE ACTIVIDAD: ${tipo}`);

    if(tipo === "AUDITORIA EN FRIO"){
        lineas.push(`CLIENTE PRESENTE: ${obtenerValor("actClientePresente")}`);
        lineas.push(`DNI VALIDADO: ${obtenerValor("actDniValidado")}`);
        lineas.push(`ESTADO INSTALACION: ${obtenerValor("actEstadoInstalacion")}`);
        lineas.push(`DROP METRAJE: ${obtenerValor("actDropMetraje")}`);
        lineas.push(`TEMPLADORES: ${obtenerValor("actTempladores")}`);
        lineas.push(`RESERVA CABLE: ${obtenerValor("actReservaCable")}`);
        lineas.push(`POTENCIA CONFORME: ${obtenerValor("actPotenciaConforme")}`);
        lineas.push(`VELOCIDAD CONFORME: ${obtenerValor("actVelocidadConforme")}`);
        lineas.push(`LIMPIEZA TRABAJO: ${obtenerValor("actLimpiezaTrabajo")}`);
        lineas.push(`CLIENTE CONFORME: ${obtenerValor("actClienteConforme")}`);
    }
    if(tipo === "SUPERVISION EN CALIENTE"){
        lineas.push(`TECNICO LLEGO A LA HORA: ${obtenerValor("supLlegadaHora")}`);
        lineas.push(`USO DE EPP: ${obtenerValor("supUsoEpp")}`);
        lineas.push(`UNIFORME COMPLETO: ${obtenerValor("supUniforme")}`);
        lineas.push(`IDENTIFICACION VISIBLE: ${obtenerValor("supIdentificacion")}`);
        lineas.push(`EXPLICO EL TRABAJO AL CLIENTE: ${obtenerValor("supExplicoTrabajo")}`);
        lineas.push(`PROCEDIMIENTO CORRECTO: ${obtenerValor("supProcedimiento")}`);
        lineas.push(`USO CORRECTO DE MATERIALES: ${obtenerValor("supMateriales")}`);
        lineas.push(`PRUEBAS REALIZADAS: ${obtenerValor("supPruebas")}`);
        lineas.push(`CLIENTE CONFORME: ${obtenerValor("supClienteConforme")}`);
    }
    if(tipo === "SEGUIMIENTO"){
        lineas.push(`MOTIVO: ${obtenerValor("segMotivo")}`);
        lineas.push(`FECHA DE SEGUIMIENTO: ${obtenerValor("segFechaSeguimiento")}`);
    }
    if(tipo === "VALIDACION DE OBSERVACION"){
        lineas.push(`CODIGO DE OBSERVACION: ${obtenerValor("valCodigo")}`);
        lineas.push(`TIPO DE OBSERVACION: ${obtenerValor("valTipo")}`);
        lineas.push(`OBSERVACION CORREGIDA: ${obtenerValor("valCorregida")}`);
        lineas.push(`EVIDENCIA ENCONTRADA: ${obtenerValor("valEvidencia")}`);
        lineas.push(`CUMPLE SUBSANACION: ${obtenerValor("valCumple")}`);
        lineas.push(`REQUIERE NUEVA VISITA: ${obtenerValor("valNuevaVisita")}`);
        lineas.push(`COMENTARIOS: ${obtenerValor("valComentarios")}`);
    }
    if(tipo === "CAPACITACION"){
        lineas.push(`TEMA: ${obtenerValor("capTema")}`);
        lineas.push(`PARTICIPANTES: ${obtenerValor("capParticipantes")}`);
        lineas.push(`TIEMPO: ${obtenerValor("capTiempo")}`);
    }
    if(tipo === "CHECKLIST"){
        lineas.push(`ORIGEN: EJECUTADO EN CAMPO POR SUPERVISOR`);
        lineas.push(`FECHA DE GESTION: ${obtenerValor("ckFecha")}`);
        lineas.push(`COMENTARIO FINAL: ${obtenerValor("actConclusion")}`);
    }

    if(tipo !== "VALIDACION DE OBSERVACION" && tipo !== "CAPACITACION" && tipo !== "CHECKLIST"){
        lineas.push(`OBSERVACIONES GENERALES: ${obtenerValor("actObservacionesGenerales")}`);
        lineas.push(`CONCLUSION: ${obtenerValor("actConclusion")}`);
    }

    if(tipo === "CAPACITACION"){
        lineas.push(`COMENTARIO FINAL: ${obtenerValor("actConclusion")}`);
    }

    return lineas.join("\n");
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

        if(!file.type || !file.type.startsWith("image/")){
            return reject(new Error("Solo se permiten imágenes como evidencia"));
        }

        const reader = new FileReader();

        reader.onload = e => {
            const img = new Image();

            img.onload = () => {
                const maxLado = 1280;
                let { width, height } = img;

                if(width > height && width > maxLado){
                    height = Math.round(height * (maxLado / width));
                    width = maxLado;
                }else if(height >= width && height > maxLado){
                    width = Math.round(width * (maxLado / height));
                    height = maxLado;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.72);

                resolve({
                    base64: dataUrl.split(",")[1] || "",
                    nombre: (file.name || "evidencia.jpg").replace(/\.[^.]+$/, "") + ".jpg",
                    mime: "image/jpeg"
                });
            };

            img.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada"));
            img.src = e.target.result;
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
    const cuadrilla = document.getElementById("actCuadrilla")?.value || "";
    if(!cuadrilla){
        if(msg) msg.innerHTML = `<div class="act-error">❌ Selecciona una cuadrilla.</div>`;
        return;
    }

    if(btn){ btn.disabled = true; btn.innerHTML = "Guardando..."; }
    mostrarCargandoActividad("Subiendo evidencias y guardando registro...");

    try{
        const comentarioFinal = obtenerValor("actConclusion").trim();
        if(tipo === "CHECKLIST" && !comentarioFinal) throw new Error("Debe ingresar el comentario final");
        const foto1 = tipo === "CHECKLIST" ? null : await leerArchivoActividad(document.getElementById("actFoto1")?.files[0]);
        const foto2 = tipo === "CHECKLIST" ? null : await leerArchivoActividad(document.getElementById("actFoto2")?.files[0]);
        const fotoActa = tipo === "AUDITORIA EN FRIO" ? await leerArchivoActividad(document.getElementById("actFotoActa")?.files[0]) : null;
        const checklist = tipo === "CHECKLIST" ? await armarChecklistActividadCampo(cuadrilla, comentarioFinal) : null;

        const payload = {
            accion: "registrarActividadCampo",
            usuario: u.usuario,
            cuadrilla,
            tipoActividad: tipo,
            clientePresente: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actClientePresente") : "",
            dniValidado: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actDniValidado") : "",
            estadoInstalacion: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actEstadoInstalacion") : obtenerEstadoResumenActividad(tipo),
            dropMetraje: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actDropMetraje") : "",
            templadores: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actTempladores") : "",
            reservaCable: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actReservaCable") : "",
            potenciaConforme: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actPotenciaConforme") : "",
            velocidadConforme: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actVelocidadConforme") : "",
            limpiezaTrabajo: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actLimpiezaTrabajo") : "",
            clienteConforme: tipo === "AUDITORIA EN FRIO" ? obtenerValor("actClienteConforme") : obtenerClienteConformeGenerico(tipo),
            observaciones: armarDetalleActividad(tipo),
            foto1,
            foto2,
            fotoActa,
            checklist
        };

        const data = await apiActividadCampo(payload);
        if(!data.ok) throw new Error(data.error || "Error al guardar actividad");
        if(msg) msg.innerHTML = `<div class="act-ok-msg">✅ Actividad registrada correctamente.<br>ID: ${data.id}</div>`;
        setTimeout(mostrarActividadCampo, 1000);
    }catch(err){
        if(msg) msg.innerHTML = `<div class="act-error">❌ ${err.message}</div>`;
    }finally{
        ocultarCargandoActividad();
        if(btn){ btn.disabled = false; btn.innerHTML = "💾 Guardar actividad"; }
    }
}

function obtenerEstadoResumenActividad(tipo){
    if(tipo === "SEGUIMIENTO") return obtenerValor("segMotivo") || "REGISTRADO";
    if(tipo === "VALIDACION DE OBSERVACION") return obtenerValor("valCumple") === "SI" ? "CUMPLE" : "REVISAR";
    if(tipo === "CAPACITACION") return obtenerValor("capTema") || "REGISTRADO";
    if(tipo === "CHECKLIST") return "CHECKLIST ALMACEN";
    return "REGISTRADO";
}

function obtenerClienteConformeGenerico(tipo){
    if(tipo === "SUPERVISION EN CALIENTE") return obtenerValor("supClienteConforme");
    return "";
}

// El Checklist de Actividad en Campo reutiliza el formulario completo de Checklist Almacén.


/* CHECKLIST POR TIPO EN ACTIVIDAD DE CAMPO V140 */
function formularioChecklist(){const hoy=new Date().toISOString().slice(0,10);return `<div class="act-card"><div class="act-section-title">📋 Checklist ejecutado en campo</div><div class="act-note">Seleccione el tipo. Materiales conserva exactamente el formulario actual.</div><div class="ck-grid"><div class="ck-field"><label>Tipo de checklist</label><select id="ckTipoChecklist" onchange="ckCambioTipoChecklist()">${CK_TIPOS_V140.map(t=>`<option>${t}</option>`).join('')}</select></div><div class="ck-field"><label>Fecha de gestión</label><input id="ckFecha" type="date" value="${hoy}"></div></div><div id="ckFormularioTipo">${ckFormularioPorTipo('MATERIALES')}</div></div>`;}
function inicializarChecklistActividadCampo(){if(typeof CK_EQUIPOS==='undefined'||typeof ckAddEquipo!=='function')return;Object.keys(CK_EQUIPOS).forEach(ckAddEquipo);}
async function armarChecklistActividadCampo(cuadrilla,comentarioFinal){const tipo=document.getElementById('ckTipoChecklist')?.value||'MATERIALES';const payload={fechaGestion:obtenerValor('ckFecha'),cuadrilla,origenRegistro:'ACTIVIDAD_CAMPO',comentarioFinal,tipoChecklist:tipo};Object.assign(payload,await ckConstruirPayloadTipo(tipo));payload.comentarioFinal=comentarioFinal;return payload;}
