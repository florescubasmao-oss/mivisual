// MI VISUAL - Módulo Observaciones

const API_OBSERVACIONES = "https://script.google.com/macros/s/AKfycbz3HDtjgZvWv0UzLH1fwzt8GGFtKktfU-vAcUgtu85bAjUYyxq4cOPxCHw49jBB4Azl/exec";

function usuarioActualObs(){
    return {
        usuario: localStorage.getItem("usuario") || "",
        perfil: (localStorage.getItem("perfil") || "").toUpperCase(),
        cuadrilla: localStorage.getItem("cuadrilla") || "",
        sede: localStorage.getItem("sede") || "",
        plataforma: localStorage.getItem("plataforma") || ""
    };
}

async function apiObservaciones(payload){
    const res = await fetch(API_OBSERVACIONES, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch(e){ throw new Error(txt); }
}

function mostrarCargandoObs(texto){
    let overlay = document.getElementById("obsLoadingOverlay");
    if(!overlay){
        overlay = document.createElement("div");
        overlay.id = "obsLoadingOverlay";
        overlay.className = "obs-loading-overlay";
        overlay.innerHTML = `<div class="obs-loading-box"><div class="obs-spinner"></div><b id="obsLoadingTexto">Cargando...</b></div>`;
        document.body.appendChild(overlay);
    }
    const t = document.getElementById("obsLoadingTexto");
    if(t) t.textContent = texto || "Cargando...";
    overlay.style.display = "flex";
}

function ocultarCargandoObs(){
    const overlay = document.getElementById("obsLoadingOverlay");
    if(overlay) overlay.style.display = "none";
}

function bloquearBotonObs(btn, texto){
    if(!btn) return;
    btn.dataset.textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = texto || "Procesando...";
}

function liberarBotonObs(btn){
    if(!btn) return;
    btn.disabled = false;
    if(btn.dataset.textoOriginal) btn.innerHTML = btn.dataset.textoOriginal;
}

function formatoFechaObs(valor){
    if(!valor) return "-";
    const f = new Date(valor);
    if(!isNaN(f.getTime())){
        return f.toLocaleString("es-PE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
    }
    return valor;
}

function claseEstadoObs(estado){
    const e = (estado || "").toUpperCase();
    if(e === "DERIVADO") return "obs-derivado";
    if(e === "EN PROCESO") return "obs-proceso";
    if(e === "PENALIZADO") return "obs-penalizado";
    if(e === "APELADO") return "obs-apelado";
    if(e === "SUBSANADO") return "obs-subsanado";
    return "";
}

function mostrarObservaciones(){
    const u = usuarioActualObs();
    let acciones = "";

    if(u.perfil === "SUPERVISOR" || u.perfil === "JEFATURA" || u.perfil === "ADMIN" || u.perfil === "ADMINISTRADOR"){
        acciones = `<button class="btnObsPrincipal" onclick="mostrarFormularioObservacion()">+ Nueva Observación</button>`;
    }

    mostrarPantalla(`
        <div class="obs-contenedor">
            <h2>📝 Observaciones</h2>
            <p class="obs-sub">Control de observaciones, descargos y evidencias.</p>
            ${acciones}
            <div id="resumenObservaciones" class="obs-resumen-kpis">
                <div class="obs-kpi obs-total"><b>-</b><span>Total</span></div>
                <div class="obs-kpi obs-der"><b>-</b><span>Derivadas</span></div>
                <div class="obs-kpi obs-pro"><b>-</b><span>En proceso</span></div>
                <div class="obs-kpi obs-pen"><b>-</b><span>Penalizadas</span></div>
                <div class="obs-kpi obs-ape"><b>-</b><span>Apeladas</span></div>
                <div class="obs-kpi obs-subsa"><b>-</b><span>Subsanadas</span></div>
                <div class="obs-kpi obs-money"><b>S/ 0.00</b><span>Impacto</span></div>
            </div>
            <div class="obs-filtros">
                <select id="filtroEstadoObs" onchange="cargarObservaciones()">
                    <option value="">Todos los estados</option>
                    <option>DERIVADO</option>
                    <option>EN PROCESO</option>
                    <option>PENALIZADO</option>
                    <option>APELADO</option>
                    <option>SUBSANADO</option>
                </select>
                <select id="filtroFuenteObs" onchange="cargarObservaciones()">
                    <option value="">Todas las fuentes</option>
                    <option>WIN</option>
                    <option>VISUAL</option>
                </select>
            </div>
            <div id="listaObservaciones">Cargando...</div>
        </div>
    `);

    cargarResumenObservaciones();
    cargarObservaciones();
}

function estadoClaveObs(estado){
    const e = (estado || "").toString().toUpperCase().trim();
    if(e === "DERIVADO") return "derivadas";
    if(e === "EN PROCESO") return "proceso";
    if(e === "PENALIZADO") return "penalizadas";
    if(e === "APELADO") return "apeladas";
    if(e === "SUBSANADO") return "subsanadas";
    if(e === "ANULADO") return "anuladas";
    return "otros";
}

function factorImpactoObs(estado){
    const e = (estado || "").toString().toUpperCase().trim();
    if(e === "SUBSANADO" || e === "ANULADO") return 0.20;
    return 1;
}

function pintarResumenObservaciones(lista){
    const cont = document.getElementById("resumenObservaciones");
    if(!cont) return;

    const r = {
        total: 0,
        derivadas: 0,
        proceso: 0,
        penalizadas: 0,
        apeladas: 0,
        subsanadas: 0,
        impacto: 0
    };

    (lista || []).forEach(o => {
        r.total++;
        const clave = estadoClaveObs(o.estado);
        if(r[clave] !== undefined) r[clave]++;
        r.impacto += (Number(o.monto) || 0) * factorImpactoObs(o.estado);
    });

    cont.innerHTML = `
        <div class="obs-kpi obs-total"><b>${r.total}</b><span>Total</span></div>
        <div class="obs-kpi obs-der"><b>${r.derivadas}</b><span>Derivadas</span></div>
        <div class="obs-kpi obs-pro"><b>${r.proceso}</b><span>En proceso</span></div>
        <div class="obs-kpi obs-pen"><b>${r.penalizadas}</b><span>Penalizadas</span></div>
        <div class="obs-kpi obs-ape"><b>${r.apeladas}</b><span>Apeladas</span></div>
        <div class="obs-kpi obs-subsa"><b>${r.subsanadas}</b><span>Subsanadas</span></div>
        <div class="obs-kpi obs-money"><b>S/ ${r.impacto.toFixed(2)}</b><span>Impacto</span></div>
    `;
}

async function cargarResumenObservaciones(){
    const u = usuarioActualObs();
    try{
        const data = await apiObservaciones({
            accion: "listarObservaciones",
            usuario: u.usuario
        });
        if(!data.ok) throw new Error(data.error || "Error al cargar resumen");
        pintarResumenObservaciones(data.observaciones || []);
    }catch(err){
        const cont = document.getElementById("resumenObservaciones");
        if(cont) cont.innerHTML = `<div class="obs-error obs-resumen-error">No se pudo cargar el resumen.</div>`;
    }
}

async function cargarObservaciones(){
    const u = usuarioActualObs();
    const cont = document.getElementById("listaObservaciones");
    if(!cont) return;

    cont.innerHTML = "Cargando observaciones...";

    try{
        const data = await apiObservaciones({
            accion: "listarObservaciones",
            usuario: u.usuario,
            estado: document.getElementById("filtroEstadoObs")?.value || "",
            fuente: document.getElementById("filtroFuenteObs")?.value || ""
        });

        if(!data.ok) throw new Error(data.error || "Error al listar observaciones");

        if(!data.observaciones || data.observaciones.length === 0){
            cont.innerHTML = `<div class="obs-vacio">No hay observaciones para mostrar.</div>`;
            return;
        }

        cont.innerHTML = data.observaciones.map(o => cardObservacion(o, u)).join("");
    }catch(err){
        cont.innerHTML = `<div class="obs-error">❌ ${err.message}</div>`;
    }
}

function cardObservacion(o, u){
    const puedeDescargar = u.perfil === "TECNICO";
    const puedeCambiar = u.perfil === "SUPERVISOR" || u.perfil === "JEFATURA" || u.perfil === "ADMIN" || u.perfil === "ADMINISTRADOR";
    const evidencia = o.evidenciaTecnico
        ? o.evidenciaTecnico.toString().split("|").filter(x => x.trim()).map((url, i) => `<a href="${url.trim()}" target="_blank">📎 Evidencia ${i + 1}</a>`).join("<br>")
        : "Pendiente";

    return `
    <div class="obs-card ${claseEstadoObs(o.estado)}">
        <div class="obs-card-head">
            <div><b>${o.cuadrilla || "-"}</b><br><small>${o.periodo || ""}</small></div>
            <span class="obs-badge">${o.estado || "-"}</span>
        </div>
        <div class="obs-grid">
            <div><span>Cuadrilla</span><b>${o.cuadrilla || "-"}</b></div>
            <div><span>Fuente</span><b>${o.fuente || "-"}</b></div>
            <div><span>Código/Ticket</span><b>${o.codigo || "-"}</b></div>
            <div><span>Tipo</span><b>${o.tipoObservacion || "-"}</b></div>
            <div><span>Monto</span><b>S/ ${Number(o.monto || 0).toFixed(2)}</b></div>
            <div><span>Registro</span><b>${formatoFechaObs(o.fechaRegistro)}</b></div>
            <div><span>Plazo</span><b>${formatoFechaObs(o.plazo)}</b></div>
        </div>
        <div class="obs-descripcion"><b>Descripción:</b><br>${o.descripcion || "-"}</div>
        <div class="obs-descripcion"><b>Descargo:</b><br>${o.descargoTecnico || "Pendiente"}</div>
        <div class="obs-descripcion"><b>Evidencia:</b><br>${evidencia}</div>
        <div class="obs-acciones">
            ${puedeDescargar ? `<button onclick="mostrarDescargoObservacion('${o.id}')">Enviar Descargo</button>` : ""}
            ${puedeCambiar ? `<button onclick="mostrarCambioEstadoObservacion('${o.id}', '${o.estado}', '${o.monto}')">Cambiar Estado</button>` : ""}
        </div>
    </div>`;
}

function mostrarFormularioObservacion(){
    mostrarPantalla(`
        <div class="obs-contenedor">
            <h2>➕ Nueva Observación</h2>
            <label>Cuadrilla</label>
            <select id="obsCuadrilla"><option value="">Cargando cuadrillas...</option></select>
            <label>Fuente</label>
            <select id="obsFuente"><option>WIN</option><option>VISUAL</option></select>
            <label>Código/Ticket</label>
            <input id="obsCodigo" placeholder="Código o ticket">
            <label>Tipo Observación</label>
            <select id="obsTipo"><option>SEGURIDAD</option><option>IMPLEMENTACIÓN</option><option>GESTIÓN TÉCNICA</option></select>
            <label>Estado</label>
            <select id="obsEstado"><option>DERIVADO</option><option>EN PROCESO</option><option>PENALIZADO</option><option>APELADO</option><option>SUBSANADO</option></select>
            <label>Monto</label>
            <input id="obsMonto" type="number" step="0.01" placeholder="0.00">
            <label>Descripción</label>
            <textarea id="obsDescripcion" rows="5" placeholder="Describe la observación..."></textarea>
            <button class="btnObsPrincipal" onclick="guardarObservacion(this)">Guardar Observación</button>
            <button onclick="mostrarObservaciones()">Volver</button>
            <div id="obsMensaje"></div>
        </div>
    `);
    cargarCuadrillasObservacion();
}

async function cargarCuadrillasObservacion(){
    const u = usuarioActualObs();
    const sel = document.getElementById("obsCuadrilla");
    if(!sel) return;

    sel.innerHTML = `<option value="">Cargando cuadrillas...</option>`;

    try{
        let cuadrillas = [];

        // 1) Intenta cargar desde la nueva función del Apps Script.
        const data = await apiObservaciones({
            accion: "listarCuadrillasObservacion",
            usuario: u.usuario
        });

        if(data.ok && Array.isArray(data.cuadrillas)){
            cuadrillas = data.cuadrillas;
        }

        // 2) Si el Apps Script aún no fue redeployado, usa listarUsuarios como respaldo.
        if(cuadrillas.length === 0){
            const respaldo = await apiObservaciones({ accion: "listarUsuarios" });
            if(!respaldo.ok) throw new Error(respaldo.error || data.error || "No se pudo cargar usuarios");

            const vistos = {};
            (respaldo.usuarios || []).forEach(x => {
                const cuadrilla = (x.cuadrilla || "").trim();
                const sede = (x.sede || "").toUpperCase().trim();
                const estado = (x.estado || "ACTIVO").toUpperCase().trim();
                const perfil = (x.perfil || "").toUpperCase().trim();

                if(!cuadrilla || vistos[cuadrilla]) return;
                if(estado && estado !== "ACTIVO") return;
                if(perfil && perfil !== "TECNICO") return;
                if(u.perfil === "SUPERVISOR" && sede !== (u.sede || "").toUpperCase().trim()) return;

                vistos[cuadrilla] = true;
                cuadrillas.push({
                    cuadrilla,
                    sede,
                    plataforma: x.plataforma || "",
                    supervisor: x.usuarioSupervisor || ""
                });
            });
        }

        cuadrillas.sort((a,b) => (a.cuadrilla || "").localeCompare(b.cuadrilla || ""));

        if(cuadrillas.length === 0){
            sel.innerHTML = `<option value="">No hay cuadrillas disponibles</option>`;
            return;
        }

        sel.innerHTML = '<option value="">Seleccione cuadrilla</option>' +
            cuadrillas.map(c => `<option value="${c.cuadrilla}">${c.cuadrilla}</option>`).join("");

    }catch(err){
        console.error("Error cargando cuadrillas:", err);
        sel.innerHTML = `<option value="">Error al cargar cuadrillas</option>`;
    }
}

async function guardarObservacion(btn){
    const u = usuarioActualObs();
    const msg = document.getElementById("obsMensaje");
    msg.innerHTML = "Guardando observación...";
    bloquearBotonObs(btn, "Guardando...");
    mostrarCargandoObs("Guardando observación...");

    try{
        const data = await apiObservaciones({
            accion: "registrarObservacion",
            usuario: u.usuario,
            cuadrilla: document.getElementById("obsCuadrilla").value,
            fuente: document.getElementById("obsFuente").value,
            codigo: document.getElementById("obsCodigo").value,
            tipoObservacion: document.getElementById("obsTipo").value,
            estado: document.getElementById("obsEstado").value,
            monto: document.getElementById("obsMonto").value,
            descripcion: document.getElementById("obsDescripcion").value
        });
        if(!data.ok) throw new Error(data.error || "Error al guardar");
        msg.innerHTML = "✅ Observación registrada correctamente.";
        setTimeout(mostrarObservaciones, 800);
    }catch(err){
        msg.innerHTML = `❌ ${err.message}`;
    }finally{
        ocultarCargandoObs();
        liberarBotonObs(btn);
    }
}

function mostrarDescargoObservacion(id){
    mostrarPantalla(`
        <div class="obs-contenedor">
            <h2>📤 Enviar Descargo</h2>
            <textarea id="descargoTexto" rows="6" placeholder="Escribe tu descargo..."></textarea>
            <label>Evidencia imagen (máximo 5 fotos)</label>
            <input id="descargoArchivo" type="file" accept="image/*" multiple>
            <button class="btnObsPrincipal" onclick="guardarDescargoObservacion('${id}', this)">Enviar Descargo</button>
            <button onclick="mostrarObservaciones()">Volver</button>
            <div id="descargoMensaje"></div>
        </div>
    `);
}

function leerArchivoBase64(file){
    return new Promise((resolve, reject) => {
        if(!file) return resolve({base64:"", nombre:"", mime:""});
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || "";
            const base64 = result.toString().split(",")[1] || "";
            resolve({ base64, nombre: file.name, mime: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function guardarDescargoObservacion(id, btn){
    const u = usuarioActualObs();
    const msg = document.getElementById("descargoMensaje");
    msg.innerHTML = "Enviando descargo...";
    bloquearBotonObs(btn, "Enviando...");
    mostrarCargandoObs("Subiendo evidencia y enviando descargo...");

    try{
        const files = Array.from(document.getElementById("descargoArchivo").files || []);
        if(files.length > 5){
            throw new Error("Solo puedes subir máximo 5 fotos.");
        }

        const evidencias = [];
        for(const file of files){
            const archivo = await leerArchivoBase64(file);
            evidencias.push({
                base64: archivo.base64,
                nombre: archivo.nombre,
                mime: archivo.mime
            });
        }

        const data = await apiObservaciones({
            accion: "registrarDescargo",
            usuario: u.usuario,
            id,
            descargoTecnico: document.getElementById("descargoTexto").value,
            evidencias
        });
        if(!data.ok) throw new Error(data.error || "Error al enviar descargo");
        msg.innerHTML = "✅ Descargo enviado correctamente.";
        setTimeout(mostrarObservaciones, 800);
    }catch(err){
        msg.innerHTML = `❌ ${err.message}`;
    }finally{
        ocultarCargandoObs();
        liberarBotonObs(btn);
    }
}

function mostrarCambioEstadoObservacion(id, estado, monto){
    mostrarPantalla(`
        <div class="obs-contenedor">
            <h2>🔄 Cambiar Estado</h2>
            <label>Estado</label>
            <select id="nuevoEstadoObs">
                <option ${estado==='DERIVADO'?'selected':''}>DERIVADO</option>
                <option ${estado==='EN PROCESO'?'selected':''}>EN PROCESO</option>
                <option ${estado==='PENALIZADO'?'selected':''}>PENALIZADO</option>
                <option ${estado==='APELADO'?'selected':''}>APELADO</option>
                <option ${estado==='SUBSANADO'?'selected':''}>SUBSANADO</option>
            </select>
            <label>Monto</label>
            <input id="nuevoMontoObs" type="number" step="0.01" value="${monto || 0}">
            <button class="btnObsPrincipal" onclick="guardarCambioEstadoObservacion('${id}', this)">Guardar Cambio</button>
            <button onclick="mostrarObservaciones()">Volver</button>
            <div id="estadoMensaje"></div>
        </div>
    `);
}

async function guardarCambioEstadoObservacion(id, btn){
    const u = usuarioActualObs();
    const msg = document.getElementById("estadoMensaje");
    msg.innerHTML = "Guardando cambio...";
    bloquearBotonObs(btn, "Guardando...");
    mostrarCargandoObs("Actualizando estado...");
    try{
        const data = await apiObservaciones({
            accion: "actualizarEstadoObservacion",
            usuario: u.usuario,
            id,
            estado: document.getElementById("nuevoEstadoObs").value,
            monto: document.getElementById("nuevoMontoObs").value
        });
        if(!data.ok) throw new Error(data.error || "Error al cambiar estado");
        msg.innerHTML = "✅ Estado actualizado.";
        setTimeout(mostrarObservaciones, 800);
    }catch(err){
        msg.innerHTML = `❌ ${err.message}`;
    }finally{
        ocultarCargandoObs();
        liberarBotonObs(btn);
    }
}
