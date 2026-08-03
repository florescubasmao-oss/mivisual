/* =====================================================
   V332 - ACTAS SIN PENDIENTES: VALIDACIÓN MANUAL SÍ/NO
   ===================================================== */
let MV321_BONO_SUPERVISORES = {
    cargando:false,
    error:"",
    periodo:"",
    periodos:[],
    bonos:[],
    parametrosSla:[],
    puedeEditar:false,
    puedeEditarSla:false,
    puedeEditarConfiguracion:false,
    configuracion:{montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}
};

function mv321Esc(valor){
    if(typeof mv198Escapar === "function") return mv198Escapar(valor);
    return (valor ?? "").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function mv321Money(valor){
    return `S/ ${Number(valor || 0).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function mv321Pct(valor){
    return valor === null || valor === undefined ? "No evaluado" : `${Number(valor || 0).toFixed(1)}%`;
}

function mv321Id(valor){
    return (valor || "").toString().replace(/[^A-Za-z0-9_-]/g,"_");
}

async function mv321Post(accion, extra){
    const res = await fetch(MV58_API, {
        method:"POST",
        body:JSON.stringify(Object.assign({
            accion,
            usuario:localStorage.getItem("usuario") || ""
        }, extra || {}))
    });
    const texto = await res.text();
    const limpio = texto.trim();
    if(!limpio || /^\s*</.test(limpio)) throw new Error("La API no devolvió una respuesta válida. Revisa la nueva implementación de Apps Script.");
    let data;
    try{ data = JSON.parse(limpio); }
    catch(e){ throw new Error("La respuesta de Apps Script no es JSON válido."); }
    if(!data.ok) throw new Error((data.error || data.mensaje || "No se pudo completar la operación").replace(/^Error:\s*/,""));
    return data;
}

function mv321PrepararCarga(periodo){
    MV321_BONO_SUPERVISORES = {cargando:true,error:"",periodo:periodo || "",periodos:periodo?[periodo]:[],bonos:[],parametrosSla:[],puedeEditar:false,puedeEditarSla:false,puedeEditarConfiguracion:false,configuracion:{montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}};
}

async function mv321CargarBonos(periodo){
    mv321PrepararCarga(periodo);
    try{
        const data = await mv321Post("obtenerBonosSupervisores",{periodo});
        MV321_BONO_SUPERVISORES = {
            cargando:false,
            error:"",
            periodo:data.periodo || periodo || "",
            periodos:Array.isArray(data.periodosDisponibles) ? data.periodosDisponibles : [data.periodo || periodo].filter(Boolean),
            bonos:Array.isArray(data.bonos) ? data.bonos : [],
            parametrosSla:Array.isArray(data.parametrosSlaConfiguracion) ? data.parametrosSlaConfiguracion : (Array.isArray(data.parametrosSla) ? data.parametrosSla : []),
            puedeEditar:!!data.puedeEditar,
            puedeEditarSla:!!data.puedeEditarSla,
            puedeEditarConfiguracion:!!data.puedeEditarConfiguracion,
            configuracion:data.configuracion || {montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}
        };
    }catch(e){
        MV321_BONO_SUPERVISORES = {cargando:false,error:e.message || "No se pudo calcular el bono.",periodo:periodo || "",periodos:periodo?[periodo]:[],bonos:[],parametrosSla:[],puedeEditar:false,puedeEditarSla:false,puedeEditarConfiguracion:false,configuracion:{montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}};
    }
}

function mv321EstadoClase(estado){
    const e = (estado || "").toString().toUpperCase();
    if(e.includes("PENDIENTE") || e.includes("SIN DATOS")) return "pendiente";
    if(e.includes("NO PAGABLE") || e.includes("OBSERVADO") || e.includes("NO ACTIVA")) return "riesgo";
    return "provisional";
}

function mv321ComponenteIcono(clave){
    return {PRODUCTIVIDAD:"📈",CALIDAD:"✅",SLA:"⏱️",SATISFACCION:"📞",SEGURIDAD:"🦺"}[clave] || "📌";
}

function mv321Linea(etiqueta, valor, referencia){
    return `<div class="mv321-linea"><span>${mv321Esc(etiqueta)}</span><div><b>${mv321Esc(valor)}</b>${referencia ? `<small>${mv321Esc(referencia)}</small>` : ""}</div></div>`;
}

function mv321DetalleComponente(c, bono){
    const m = c.metricas || {};
    const activador = Number.isFinite(Number(c.activador)) ? Number(c.activador) : 0;
    const referenciaActivador = c.evaluable && Number(c.cumplimiento||0)>activador ? "Bono activo y prorrateado" : "No suma al bono";
    let html = "";
    if(c.clave === "PRODUCTIVIDAD"){
        html += mv321Linea("Puntaje de cuadrillas · peso 60%",mv321Pct(m.productividadPct),`Meta: 130 puntos por cuadrilla · ${Number(m.puntos||0).toFixed(1)} / ${Number(m.metaPuntos||0)} pts`);
        html += mv321Linea("Efectividad · peso 40%",mv321Pct(m.efectividadPct),`Meta ≥ 70% · ${Number(m.finalizadas||0)} finalizadas`);
        html += mv321Linea("Activador del componente",`> ${activador}%`,referenciaActivador);
    }else if(c.clave === "CALIDAD"){
        html += mv321Linea("Observaciones WIN · peso 30%",mv321Pct(m.puntajeObservaciones),`${Number(m.observacionesWin||0)} registros WIN`);
        html += mv321Linea("Cantidad WIN · 10% del indicador",String(Number(m.observacionesWin||0)),Number(m.observacionesWin||0)===0?"Cumplimiento total":"Registros WIN detectados");
        html += mv321Linea("Penalizadas WIN · 90% del indicador",mv321Money(m.montoPenalizadoWin),`Meta ≤ S/ 300 · ${Number(m.observacionesWinPenalizadas||0)} penalizadas`);
        html += mv321Linea("Recableado · peso 40%",mv321Pct(m.recableadoPct),`Meta ≤ 42% · ${Number(m.recableados||0)} de ${Number(m.rojoAsignadas||0)} órdenes VT`);
        html += mv321Linea("VTR/GAR · peso 30%",mv321Pct(m.vtrGarPct),`Meta ≤ 3% · ${Number(m.incidenciasVtrGar||0)} incidencias`);
        html += mv321Linea("Activador del componente",`> ${activador}%`,referenciaActivador);
    }else if(c.clave === "SLA"){
        html += mv321Linea("Órdenes evaluables",String(Number(m.evaluables||0)),`${Number(m.cumplen||0)} cumplen · ${Number(m.vencidas||0)} fuera de SLA`);
        html += mv321Linea("Instalaciones dentro del SLA",mv321Pct(m.instalacionesPct),`${Number(m.instalacionesTotal||0)} órdenes · meta > 80%`);
        html += mv321Linea("Averías y demás partidas",mv321Pct(m.averiasPct),`${Number(m.averiasTotal||0)} órdenes · meta > 80%`);
        html += mv321Linea("Activador del componente",`> ${activador}%`,referenciaActivador);
        html += mv321Linea("Sin partida o parámetro",String(Number(m.sinPartida||0)+Number(m.sinParametro||0)),"Solo órdenes con hora de inicio y fin");
        if((c.detalleIncumplimientos||[]).length){
            const id = `mv321_sla_${mv321Id(bono.usuario)}_${Math.random().toString(36).slice(2)}`;
            html += `<button class="mv321-link" onclick="toggleDetalle('${id}',this)">▼ Ver órdenes fuera de SLA</button><div id="${id}" class="mv321-incumplimientos" style="display:none;">${c.detalleIncumplimientos.map(x=>`<div><b>${mv321Esc(x.ordenId)}</b><span>${mv321Esc(x.cuadrilla)}</span><small>${mv321Esc(x.tipoPartida)} · ${Number(x.minutos||0)} min / ${Number(x.slaMinutos||0)} min · exceso ${Number(x.exceso||0)} min</small></div>`).join("")}</div>`;
        }
    }else if(c.clave === "SATISFACCION"){
        html += mv321Linea("Clientes llamados",String(Number(m.clientesLlamados||0)),"Registro manual de Jefatura");
        html += mv321Linea("Respondieron",String(Number(m.respondieron||0)),`${Number(m.noRespondieron||0)} sin respuesta`);
        html += mv321Linea("Clientes conformes",String(Number(m.conformes||0)),mv321Pct(c.cumplimiento));
        html += mv321Linea("Clientes no conformes",String(Number(m.noConformes||0)),"Las llamadas sin respuesta no afectan el porcentaje");
        html += mv321Linea("Activador del componente",`> ${activador}%`,referenciaActivador);
        if(bono.puedeEditar) html += `<button class="mv321-accion" onclick="mv324AbrirSatisfaccion('${mv321Esc(bono.usuario)}')">📞 Registrar satisfacción</button>`;
    }else if(c.clave === "SEGURIDAD"){
        const actasEvaluadas = m.actasEvaluadas === true;
        const respuestaActas = actasEvaluadas ? (m.actasSinPendientes ? "Sí" : "No") : "No evaluado";
        const referenciaActas = actasEvaluadas
            ? `${mv321Pct(m.actasPct)} · ${mv321Money(m.montoActas||0)} / ${mv321Money(m.maximoIndicador||0)}`
            : "Registro manual pendiente";
        html += mv321Linea("Actas sin pendientes · peso 25%",respuestaActas,referenciaActas);
        html += mv321Linea("Checklist por quincena · peso 25%",mv321Pct(m.checklistCumplimientoPct),`${Number(m.slotsCumplidos||0)} de ${Number(m.slotsMeta||0)} quincenas · ${mv321Money(m.montoChecklistCumplimiento||0)} / ${mv321Money(m.maximoIndicador||0)}`);
        html += mv321Linea("Actividad en campo · peso 25%",mv321Pct(m.actividadPct),`${Number(m.actividadesCampo||0)} de ${Number(m.metaActividadesCampo||15)} registros · ${mv321Money(m.montoActividad||0)} / ${mv321Money(m.maximoIndicador||0)}`);
        html += mv321Linea("Evaluación de Jefatura · peso 25%",`${Number(m.puntajeEvaluacion||0)} / 60 pts`,`${mv321Money(m.montoEvaluacion||0)} / ${mv321Money(m.maximoIndicador||0)}`);
        html += mv321Linea("Activador del componente",`> ${activador}%`,referenciaActivador);
        if(bono.puedeEditar) html += `<button class="mv321-accion" onclick="mv332AbrirActas('${mv321Esc(bono.usuario)}')">📄 Validar actas</button>`;
        if(bono.puedeEditar) html += `<button class="mv321-accion" onclick="mv321AbrirEvaluacion('${mv321Esc(bono.usuario)}')">📝 Evaluar liderazgo</button>`;
    }
    if(c.nota) html += `<div class="mv321-nota">${mv321Esc(c.nota)}</div>`;
    return html;
}

function mv321TarjetaComponente(c, bono){
    const id = `mv321_comp_${mv321Id(bono.usuario)}_${mv321Id(c.clave)}_${Math.random().toString(36).slice(2)}`;
    const cumplimiento = c.cumplimiento === null || c.cumplimiento === undefined ? "No evaluado" : `${Number(c.cumplimiento||0).toFixed(1)}%`;
    return `<div class="mv321-componente ${mv321EstadoClase(c.estado)}">
        <div class="mv321-comp-head"><div><span>${mv321ComponenteIcono(c.clave)}</span><b>${mv321Esc(c.nombre)}</b></div><em>${mv321Esc(c.estado)}</em></div>
        <div class="mv321-comp-monto">${mv321Money(c.monto)} <small>de ${mv321Money(c.maximo)}</small></div>
        <div class="mv321-comp-progreso"><span style="width:${Math.max(0,Math.min(100,Number(c.cumplimiento)||0))}%"></span></div>
        <div class="mv321-comp-cumplimiento">${cumplimiento}</div>
        <button class="mv321-link" onclick="toggleDetalle('${id}',this)">▼ Ver cálculo</button>
        <div id="${id}" class="mv321-comp-detalle" style="display:none;">${mv321DetalleComponente(c,bono)}</div>
    </div>`;
}

function mv321TarjetaBono(bono, compacta){
    const id = `mv321_bono_${mv321Id(bono.usuario)}_${Math.random().toString(36).slice(2)}`;
    const porcentaje = Math.max(0,Math.min(100,Number(bono.porcentajeEvaluado)||0));
    const componentes = (bono.componentes || []).map(c=>mv321TarjetaComponente(c,bono)).join("");
    const pendientes = (bono.pendientes || []).map(x=>`<li>${mv321Esc(x)}</li>`).join("");
    return `<section class="mv321-bono-card ${compacta ? "compacta" : ""}">
        <div class="mv321-bono-head">
            <div><small>${mv321Esc(bono.sede)} · ${mv321Esc(bono.periodo)}</small><h3>🎁 ${mv321Esc(bono.nombre || bono.usuario)}</h3><span>${Number(bono.totalCuadrillas||0)} cuadrillas asignadas · ${mv321Esc(bono.estado)}</span></div>
            <div class="mv321-bono-total"><b>${mv321Money(bono.montoProvisional)}</b><small>provisional de ${mv321Money(bono.bonoMaximo)}</small></div>
        </div>
        <div class="mv321-total-bar"><span style="width:${porcentaje}%"></span></div>
        <div class="mv321-total-meta"><b>${Number(bono.porcentajeEvaluado||0).toFixed(1)}% del bono total</b><span>Componentes: 25% · 25% · 20% · 15% · 15%</span></div>
        <button class="mv321-ver" onclick="toggleDetalle('${id}',this)">▼ Ver bono y cálculo completo</button>
        <div id="${id}" class="mv321-bono-detalle" style="display:${compacta ? "none" : "block"};">
            <div class="mv321-componentes">${componentes}</div>
            ${pendientes ? `<div class="mv321-alertas"><b>Información pendiente</b><ul>${pendientes}</ul></div>` : ""}
            <div class="mv321-cuadrillas"><b>Cuadrillas consideradas:</b> ${mv321Esc((bono.cuadrillas||[]).join(" · "))}</div>
        </div>
    </section>`;
}

function mv321RenderEstadoBase(){
    if(!MV321_BONO_SUPERVISORES.periodo) return `<section class="mv321-panel"><div class="mv321-vacio"><b>Seleccione un período</b><span>El cálculo comenzará únicamente después de elegir el mes.</span></div></section>`;
    if(MV321_BONO_SUPERVISORES.cargando) return `<section class="mv321-panel"><div class="mv321-cargando">Calculando bono de supervisores...</div></section>`;
    if(MV321_BONO_SUPERVISORES.error) return `<section class="mv321-panel"><div class="mv321-error"><b>No se pudo calcular el bono</b><span>${mv321Esc(MV321_BONO_SUPERVISORES.error)}</span></div></section>`;
    if(!MV321_BONO_SUPERVISORES.bonos.length) return `<section class="mv321-panel"><div class="mv321-vacio">No existe una asignación de supervisor para este período.</div></section>`;
    return "";
}

function mv321RenderSupervisor(){
    const base = mv321RenderEstadoBase();
    if(base) return base;
    return `<div class="mv321-panel"><div class="mv321-panel-title"><div><b>🎁 BONO DEL SUPERVISOR</b><span>Metas: 130 pts/cuadrilla · Efectividad 70% · Recableado 42% · VTR/GAR 3% · Penalizadas WIN S/300</span></div></div>${mv321TarjetaBono(MV321_BONO_SUPERVISORES.bonos[0],false)}</div>`;
}

function mv325PerfilActual(){
    return (localStorage.getItem("perfil") || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}

function mv325EsSupervisor(){ return mv325PerfilActual() === "SUPERVISOR"; }

function mv325PeriodoActual(){
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}`;
}

function mv325EtiquetaPeriodo(periodo){
    const m = String(periodo||"").match(/^(\d{4})-(\d{2})$/);
    if(!m) return periodo || "Período";
    const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    return `${meses[Number(m[2])-1]} ${m[1]}`;
}

function mv329PeriodosSeleccionables(){
    const periodos = new Set(MV321_BONO_SUPERVISORES.periodos || []);
    const inicio = new Date(2026,6,1);
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(),hoy.getMonth(),1);
    for(let fecha = new Date(inicio); fecha <= fin; fecha.setMonth(fecha.getMonth()+1)){
        periodos.add(`${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}`);
    }
    return Array.from(periodos).filter(Boolean).sort().reverse();
}

function mv325OpcionesPeriodo(){
    const seleccion = MV321_BONO_SUPERVISORES.periodo || "";
    const periodos = mv329PeriodosSeleccionables();
    return `<option value="" ${seleccion?"":"selected"} disabled>Seleccione un período</option>${periodos.map(p=>`<option value="${mv321Esc(p)}" ${p===seleccion?"selected":""}>${mv321Esc(mv325EtiquetaPeriodo(p))}</option>`).join("")}`;
}

function mv325BotonesConfiguracion(){
    const botones = [];
    const montoPeriodo = Number((MV321_BONO_SUPERVISORES.configuracion||{}).montoTotal||1000);
    if(MV321_BONO_SUPERVISORES.puedeEditarConfiguracion) botones.push(`<button class="mv321-config" onclick="mv324AbrirConfiguracionBono()">⚙️ Monto y activadores: ${mv321Money(montoPeriodo)}</button>`);
    if(MV321_BONO_SUPERVISORES.puedeEditarSla) botones.push(`<button class="mv321-config" onclick="mv321AbrirParametrosSla()">⚙️ Parámetros SLA WIN</button>`);
    return botones.join("");
}

function mv326RenderBotonBonosDashboard(periodo){
    return `<div class="mv326-acceso-bonos" style="display:flex;justify-content:flex-end;margin:14px 0;">
        <button type="button" class="mv321-config" style="width:min(100%,280px);" onclick="mostrarBonosSupervisores()">🎁 Bonos Supervisores</button>
    </div>`;
}

function mv325RenderPaginaBonos(){
    const contenido = mv325EsSupervisor() ? mv321RenderSupervisor() : mv321RenderJefatura();
    const tituloPeriodo = MV321_BONO_SUPERVISORES.periodo ? mv325EtiquetaPeriodo(MV321_BONO_SUPERVISORES.periodo) : "SELECCIONE UN PERÍODO";
    mostrarPantalla(`<div id="mv325BonosPage" class="mv4-page">
        <div class="mv4-top-card"><div class="mv4-top-role">🎁 BONOS SUPERVISORES</div><div class="mv4-top-sede">${mv321Esc(tituloPeriodo)}</div><div class="mv4-top-sub">Cálculo mensual por supervisor y sus cuadrillas</div></div>
        <div class="mv199-filtros-jefatura" style="margin-bottom:14px;">
            <label>Período<select onchange="mv325CambiarPeriodo(this.value)">${mv325OpcionesPeriodo()}</select></label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">${mv325BotonesConfiguracion()}</div>
        </div>
        ${contenido}
        <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
    </div>`);
}

function mv329PrepararSeleccionInicial(){
    const periodos = mv329PeriodosSeleccionables();
    MV321_BONO_SUPERVISORES = {
        cargando:false,
        error:"",
        periodo:"",
        periodos,
        bonos:[],
        parametrosSla:[],
        puedeEditar:false,
        puedeEditarSla:false,
        puedeEditarConfiguracion:false,
        configuracion:{montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}
    };
}

function mostrarBonosSupervisores(){
    mv329PrepararSeleccionInicial();
    mv325RenderPaginaBonos();
}

async function mv325CambiarPeriodo(periodo){
    if(!periodo){
        mv329PrepararSeleccionInicial();
        mv325RenderPaginaBonos();
        return;
    }
    mv321PrepararCarga(periodo);
    mv325RenderPaginaBonos();
    await mv321CargarBonos(periodo);
    mv325RenderPaginaBonos();
}

function mv325RefrescarVistaActual(){
    mv321CerrarModal();
    if(document.getElementById("mv325BonosPage")) mv325RenderPaginaBonos();
    else if(mv325EsSupervisor() && typeof mv198RenderSupervisor === "function") mv198RenderSupervisor();
    else if(typeof mv199RenderJefatura === "function") mv199RenderJefatura();
}

function mv321RenderJefatura(){
    const base = mv321RenderEstadoBase();
    if(base) return base;
    const bonos = MV321_BONO_SUPERVISORES.bonos || [];
    const total = bonos.reduce((s,x)=>s+(Number(x.montoProvisional)||0),0);
    const maxEvaluado = bonos.reduce((s,x)=>s+(Number(x.bonoMaximo)||0),0);
    return `<div class="mv321-panel">
        <div class="mv321-panel-title"><div><b>🎁 BONO DE SUPERVISORES</b><span>Comparativo por sede y supervisor · Bono individual ${mv321Money((MV321_BONO_SUPERVISORES.configuracion||{}).montoTotal||1000)}</span></div></div>
        <div class="mv321-resumen-jefatura"><div><span>Total provisional</span><b>${mv321Money(total)}</b></div><div><span>Supervisores</span><b>${bonos.length}</b></div><div><span>Avance del bono</span><b>${maxEvaluado?((total/maxEvaluado)*100).toFixed(1):"0.0"}%</b></div></div>
        ${bonos.map(x=>mv321TarjetaBono(x,true)).join("")}
    </div>`;
}

function mv321BonoPorUsuario(usuario){
    return (MV321_BONO_SUPERVISORES.bonos||[]).find(x=>(x.usuario||"").toString().toUpperCase()===(usuario||"").toString().toUpperCase());
}

function mv321CerrarModal(){
    const modal = document.getElementById("mv321Modal");
    if(modal) modal.remove();
}

function mv321MostrarModal(titulo,contenido){
    mv321CerrarModal();
    document.body.insertAdjacentHTML("beforeend",`<div id="mv321Modal" class="mv321-modal"><div class="mv321-modal-card"><div class="mv321-modal-head"><h3>${titulo}</h3><button onclick="mv321CerrarModal()">✕</button></div><div class="mv321-modal-body">${contenido}</div></div></div>`);
}

function mv332AbrirActas(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    if(!bono) return;
    const seguridad = (bono.componentes||[]).find(x=>x.clave==="SEGURIDAD") || {};
    const registro = seguridad.actasManual || {};
    const respuesta = registro.evaluada === true ? String(registro.respuesta||"").toUpperCase() : "";
    const contenido = `<div class="mv321-eval-intro"><b>${mv321Esc(bono.nombre)}</b><span>${mv321Esc(bono.sede)} · ${mv321Esc(bono.periodo)} · registro manual</span></div>
        <div class="mv321-pregunta"><b>¿El supervisor tiene actas sin pendientes en el período?</b>
        <label>Resultado<select id="mv332ActasRespuesta"><option value="" ${respuesta?"":"selected"}>Seleccione Sí o No</option><option value="SI" ${respuesta==="SI"?"selected":""}>Sí — cumple</option><option value="NO" ${respuesta==="NO"?"selected":""}>No — no cumple</option></select></label></div>
        <div id="mv332ActasMensaje" class="mv321-form-msg"></div>
        <button class="mv321-guardar" onclick="mv332GuardarActas('${mv321Esc(bono.usuario)}')">💾 Guardar validación</button>`;
    mv321MostrarModal("Actas sin pendientes",contenido);
}

async function mv332GuardarActas(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    const mensaje = document.getElementById("mv332ActasMensaje");
    const campo = document.getElementById("mv332ActasRespuesta");
    if(!bono || !mensaje || !campo) return;
    const respuesta = campo.value;
    if(!respuesta){
        mensaje.className="mv321-form-msg error";
        mensaje.textContent="Seleccione Sí o No.";
        return;
    }
    mensaje.className="mv321-form-msg";
    mensaje.textContent="Guardando validación...";
    try{
        await mv321Post("guardarActasSinPendientesBonoSupervisor",{periodo:bono.periodo,supervisor:bono.usuario,respuesta});
        mensaje.className="mv321-form-msg ok";
        mensaje.textContent="Validación de actas guardada correctamente.";
        await mv321CargarBonos(bono.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){ mensaje.className="mv321-form-msg error";mensaje.textContent=e.message; }
}

function mv321AbrirEvaluacion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    if(!bono) return;
    const seguridad = (bono.componentes||[]).find(x=>x.clave==="SEGURIDAD") || {};
    const evaluacion = seguridad.evaluacion || {};
    const respuestas = evaluacion.respuestas || [];
    const preguntas = seguridad.preguntas || [];
    const contenido = `<div class="mv321-eval-intro"><b>${mv321Esc(bono.nombre)}</b><span>${mv321Esc(bono.sede)} · ${mv321Esc(bono.periodo)} · 20 preguntas · máximo 60 puntos</span></div>
        <div id="mv321EvaluacionPreguntas">${preguntas.map((p,i)=>{
            const r = respuestas[i] || {};
            const respondida = evaluacion.completa === true && [0,1.5,3].includes(Number(r.puntaje));
            const puntaje = respondida ? Number(r.puntaje) : null;
            return `<div class="mv321-pregunta" data-indice="${i}"><b>${i+1}. ${mv321Esc(p)}</b><label>Resultado<select class="mv321-eval-puntaje"><option value="" ${puntaje===null?"selected":""}>Seleccione una opción</option><option value="3" ${puntaje===3?"selected":""}>Cumplió — 3 puntos</option><option value="1.5" ${puntaje===1.5?"selected":""}>Cumplió parcialmente — 1.5 puntos</option><option value="0" ${puntaje===0?"selected":""}>No cumplió — 0 puntos</option></select></label></div>`;
        }).join("")}</div>
        <div id="mv321EvalMensaje" class="mv321-form-msg"></div>
        <button class="mv321-guardar" onclick="mv321GuardarEvaluacion('${mv321Esc(bono.usuario)}')">💾 Guardar evaluación</button>`;
    mv321MostrarModal("Evaluación de Seguridad y Liderazgo",contenido);
}

async function mv321GuardarEvaluacion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    const mensaje = document.getElementById("mv321EvalMensaje");
    if(!bono || !mensaje) return;
    const respuestas = Array.from(document.querySelectorAll("#mv321EvaluacionPreguntas .mv321-pregunta")).map(x=>{
        const valor = x.querySelector(".mv321-eval-puntaje").value;
        return {puntaje:valor === "" ? null : Number(valor)};
    });
    mensaje.className="mv321-form-msg";
    mensaje.textContent="Guardando evaluación...";
    try{
        await mv321Post("guardarEvaluacionBonoSupervisor",{periodo:bono.periodo,supervisor:bono.usuario,respuestas});
        mensaje.className="mv321-form-msg ok";
        mensaje.textContent="Evaluación guardada correctamente.";
        await mv321CargarBonos(bono.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){ mensaje.className="mv321-form-msg error";mensaje.textContent=e.message; }
}

function mv324AbrirSatisfaccion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    if(!bono) return;
    const componente = (bono.componentes||[]).find(x=>x.clave==="SATISFACCION") || {};
    const registro = componente.registro || {};
    const activador = Number.isFinite(Number(componente.activador)) ? Number(componente.activador) : 80;
    const contenido = `<div class="mv321-eval-intro"><b>${mv321Esc(bono.nombre)}</b><span>${mv321Esc(bono.sede)} · ${mv321Esc(bono.periodo)} · activador mayor a ${activador}%</span></div>
        <div class="mv321-pregunta"><label>Clientes llamados<input id="mv324SatLlamados" type="number" min="1" step="1" value="${Number(registro.clientesLlamados||0) || ""}"></label>
        <label>Clientes conformes<input id="mv324SatConformes" type="number" min="0" step="1" value="${Number(registro.conformes||0)}"></label>
        <label>Clientes no conformes<input id="mv324SatNoConformes" type="number" min="0" step="1" value="${Number(registro.noConformes||0)}"></label>
        <label>Observación<textarea id="mv324SatObservacion" placeholder="Comentario opcional de Jefatura">${mv321Esc(registro.observacion||"")}</textarea></label></div>
        <div id="mv324SatMensaje" class="mv321-form-msg"></div>
        <button class="mv321-guardar" onclick="mv324GuardarSatisfaccion('${mv321Esc(bono.usuario)}')">💾 Guardar satisfacción</button>`;
    mv321MostrarModal("Satisfacción del cliente",contenido);
}

async function mv324GuardarSatisfaccion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    const mensaje = document.getElementById("mv324SatMensaje");
    if(!bono || !mensaje) return;
    const clientesLlamados = Number(document.getElementById("mv324SatLlamados").value);
    const conformes = Number(document.getElementById("mv324SatConformes").value);
    const noConformes = Number(document.getElementById("mv324SatNoConformes").value);
    const observacion = document.getElementById("mv324SatObservacion").value.trim();
    mensaje.className="mv321-form-msg";
    mensaje.textContent="Guardando satisfacción...";
    try{
        await mv321Post("guardarSatisfaccionBonoSupervisor",{periodo:bono.periodo,supervisor:bono.usuario,clientesLlamados,conformes,noConformes,observacion});
        mensaje.className="mv321-form-msg ok";
        mensaje.textContent="Satisfacción guardada correctamente.";
        await mv321CargarBonos(bono.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){ mensaje.className="mv321-form-msg error";mensaje.textContent=e.message; }
}

function mv324AbrirConfiguracionBono(){
    const cfg = MV321_BONO_SUPERVISORES.configuracion || {};
    const pesos = cfg.pesos || {PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15};
    const activadores = Object.assign({PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0},cfg.activadores||{});
    const monto = Number(cfg.montoTotal||1000);
    const fila = (nombre,peso)=>mv321Linea(`${nombre} · ${peso}%`,mv321Money(monto*peso/100),"Se recalcula automáticamente");
    const campoActivador = (id,nombre,valor)=>`<label>${nombre}<input id="${id}" type="number" min="0" max="100" step="0.01" value="${Number(valor)}" required><small>El resultado debe superar este porcentaje.</small></label>`;
    const contenido = `<div class="mv321-param-intro">La configuración rige solo para ${mv321Esc(MV321_BONO_SUPERVISORES.periodo)}. Los pesos permanecen fijos y suman 100%.</div>
        <div class="mv321-pregunta"><label>Monto total del bono por supervisor<input id="mv324MontoBono" type="number" min="1" max="100000" step="0.01" value="${monto}"></label></div>
        <div id="mv324DistribucionBono">${fila("Productividad",pesos.PRODUCTIVIDAD)}${fila("Calidad",pesos.CALIDAD)}${fila("SLA WIN",pesos.SLA)}${fila("Satisfacción",pesos.SATISFACCION)}${fila("Seguridad y liderazgo",pesos.SEGURIDAD)}</div>
        <div class="mv321-param-intro" style="margin-top:14px;"><b>Porcentaje de activación por componente</b><br>Si el componente no supera el valor indicado, aporta S/ 0.</div>
        <div id="mv330ActivadoresBono" class="mv321-pregunta">
            ${campoActivador("mv330ActProductividad","Productividad operativa (%)",activadores.PRODUCTIVIDAD)}
            ${campoActivador("mv330ActCalidad","Calidad (%)",activadores.CALIDAD)}
            ${campoActivador("mv330ActSla","SLA WIN (%)",activadores.SLA)}
            ${campoActivador("mv330ActSatisfaccion","Satisfacción del cliente (%)",activadores.SATISFACCION)}
            ${campoActivador("mv330ActSeguridad","Seguridad y liderazgo (%)",activadores.SEGURIDAD)}
        </div>
        <div id="mv324ConfigMensaje" class="mv321-form-msg"></div>
        <button class="mv321-guardar" onclick="mv324GuardarConfiguracionBono()">💾 Guardar configuración</button>`;
    mv321MostrarModal("Configuración del bono",contenido);
}

async function mv324GuardarConfiguracionBono(){
    const mensaje = document.getElementById("mv324ConfigMensaje");
    const montoCampo = document.getElementById("mv324MontoBono");
    const camposActivadores = {
        PRODUCTIVIDAD:document.getElementById("mv330ActProductividad"),
        CALIDAD:document.getElementById("mv330ActCalidad"),
        SLA:document.getElementById("mv330ActSla"),
        SATISFACCION:document.getElementById("mv330ActSatisfaccion"),
        SEGURIDAD:document.getElementById("mv330ActSeguridad")
    };
    const montoTotal = Number(montoCampo.value);
    const activadores = {
        PRODUCTIVIDAD:Number(camposActivadores.PRODUCTIVIDAD.value),
        CALIDAD:Number(camposActivadores.CALIDAD.value),
        SLA:Number(camposActivadores.SLA.value),
        SATISFACCION:Number(camposActivadores.SATISFACCION.value),
        SEGURIDAD:Number(camposActivadores.SEGURIDAD.value)
    };
    if(!mensaje) return;
    const activadoresInvalidos = Object.keys(camposActivadores).some(clave=>{
        const texto = camposActivadores[clave].value.trim();
        return texto === "" || !Number.isFinite(activadores[clave]) || activadores[clave] < 0 || activadores[clave] > 100;
    });
    if(!montoCampo.value.trim() || !Number.isFinite(montoTotal) || montoTotal <= 0 || activadoresInvalidos){
        mensaje.className="mv321-form-msg error";
        mensaje.textContent="Complete el monto y todos los activadores con valores válidos entre 0% y 100%.";
        return;
    }
    mensaje.className="mv321-form-msg";
    mensaje.textContent="Guardando configuración...";
    try{
        await mv321Post("guardarConfiguracionBonoSupervisores",{periodo:MV321_BONO_SUPERVISORES.periodo,montoTotal,activadores});
        mensaje.className="mv321-form-msg ok";
        mensaje.textContent="Monto y activadores actualizados correctamente.";
        await mv321CargarBonos(MV321_BONO_SUPERVISORES.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){ mensaje.className="mv321-form-msg error";mensaje.textContent=e.message; }
}

function mv321AbrirParametrosSla(){
    const parametros = MV321_BONO_SUPERVISORES.parametrosSla || [];
    const filas = parametros.map(x=>`<tr data-id="${mv321Esc(x.id)}" data-tipo="${mv321Esc(x.tipoOrden)}"><td><b>${mv321Esc(x.tipoOrden)}</b><small>${mv321Esc(x.clasificacion)}</small></td><td><input class="mv321-sla-min" type="number" min="1" max="600" value="${Number(x.minutos||0)}"><small>${Number(x.minutos||0)===140?"2 h 20 min":(Number(x.minutos||0)===80?"1 h 20 min":"minutos")}</small></td><td><select class="mv321-sla-estado"><option value="ACTIVO" ${x.estado==="ACTIVO"?"selected":""}>ACTIVO</option><option value="INACTIVO" ${x.estado==="INACTIVO"?"selected":""}>INACTIVO</option></select></td></tr>`).join("");
    mv321MostrarModal("Parámetros SLA WIN",`<div class="mv321-param-intro">Los tiempos se guardan en minutos. Los cambios rigen desde ${mv321Esc(MV321_BONO_SUPERVISORES.periodo)} y conservan los parámetros de meses anteriores.</div><div class="mv321-tabla-sla-wrap"><table class="mv321-tabla-sla"><thead><tr><th>Partida</th><th>SLA máximo</th><th>Estado</th></tr></thead><tbody id="mv321SlaFilas">${filas}</tbody></table></div><div id="mv321SlaMensaje" class="mv321-form-msg"></div><button class="mv321-guardar" onclick="mv321GuardarParametrosSla()">💾 Guardar parámetros</button>`);
}

async function mv321GuardarParametrosSla(){
    const mensaje = document.getElementById("mv321SlaMensaje");
    const parametros = Array.from(document.querySelectorAll("#mv321SlaFilas tr")).map(fila=>({
        id:fila.dataset.id,
        tipoOrden:fila.dataset.tipo,
        minutos:Number(fila.querySelector(".mv321-sla-min").value),
        estado:fila.querySelector(".mv321-sla-estado").value
    }));
    if(!mensaje) return;
    mensaje.className="mv321-form-msg";
    mensaje.textContent="Guardando parámetros...";
    try{
        await mv321Post("guardarParametrosSlaWin",{periodo:MV321_BONO_SUPERVISORES.periodo,parametros});
        mensaje.className="mv321-form-msg ok";
        mensaje.textContent="Parámetros SLA actualizados.";
        await mv321CargarBonos(MV321_BONO_SUPERVISORES.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){ mensaje.className="mv321-form-msg error";mensaje.textContent=e.message; }
}
