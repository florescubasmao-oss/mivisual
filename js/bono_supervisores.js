/* =====================================================
   V322 - BONO DE SUPERVISORES DENTRO DEL DASHBOARD
   ===================================================== */
let MV321_BONO_SUPERVISORES = {
    cargando:false,
    error:"",
    periodo:"",
    bonos:[],
    parametrosSla:[],
    puedeEditar:false,
    puedeEditarSla:false
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
    MV321_BONO_SUPERVISORES = {cargando:true,error:"",periodo:periodo || "",bonos:[],parametrosSla:[],puedeEditar:false,puedeEditarSla:false};
}

async function mv321CargarBonos(periodo){
    mv321PrepararCarga(periodo);
    try{
        const data = await mv321Post("obtenerBonosSupervisores",{periodo});
        MV321_BONO_SUPERVISORES = {
            cargando:false,
            error:"",
            periodo:data.periodo || periodo || "",
            bonos:Array.isArray(data.bonos) ? data.bonos : [],
            parametrosSla:Array.isArray(data.parametrosSlaConfiguracion) ? data.parametrosSlaConfiguracion : (Array.isArray(data.parametrosSla) ? data.parametrosSla : []),
            puedeEditar:!!data.puedeEditar,
            puedeEditarSla:!!data.puedeEditarSla
        };
    }catch(e){
        MV321_BONO_SUPERVISORES = {cargando:false,error:e.message || "No se pudo calcular el bono.",periodo:periodo || "",bonos:[],parametrosSla:[],puedeEditar:false,puedeEditarSla:false};
    }
}

function mv321EstadoClase(estado){
    const e = (estado || "").toString().toUpperCase();
    if(e.includes("PENDIENTE") || e.includes("SIN DATOS")) return "pendiente";
    if(e.includes("NO PAGABLE") || e.includes("OBSERVADO")) return "riesgo";
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
    let html = "";
    if(c.clave === "PRODUCTIVIDAD"){
        html += mv321Linea("Puntaje de cuadrillas",mv321Pct(m.productividadPct),`Meta: 130 puntos por cuadrilla · ${Number(m.puntos||0).toFixed(1)} / ${Number(m.metaPuntos||0)} pts`);
        html += mv321Linea("Efectividad",mv321Pct(m.efectividadPct),`Meta ≥ 70% · ${Number(m.finalizadas||0)} finalizadas`);
        html += mv321Linea("Órdenes reprogramadas",mv321Pct(m.reprogramadasPct),`Meta ≤ 3% · ${Number(m.reprogramadas||0)} de ${Number(m.totalOrdenes||0)}`);
    }else if(c.clave === "CALIDAD"){
        html += mv321Linea("Observaciones",mv321Money(m.montoObservaciones),`Meta ≤ S/ 200 · ${Number(m.observaciones||0)} registros`);
        html += mv321Linea("Recableado",mv321Pct(m.recableadoPct),`Meta ≤ 42% · ${Number(m.recableados||0)} de ${Number(m.rojoAsignadas||0)} órdenes VT`);
        html += mv321Linea("VTR/GAR",mv321Pct(m.vtrGarPct),`Meta ≤ 3% · ${Number(m.incidenciasVtrGar||0)} incidencias`);
        html += mv321Linea("Auditorías aprobadas",mv321Pct(m.auditoriasPct),`Meta ≥ 95% · ${Number(m.auditoriasAprobadas||0)} de ${Number(m.auditorias||0)}`);
    }else if(c.clave === "SLA"){
        html += mv321Linea("Órdenes evaluables",String(Number(m.evaluables||0)),`${Number(m.cumplen||0)} cumplen · ${Number(m.vencidas||0)} fuera de SLA`);
        html += mv321Linea("Instalaciones dentro del SLA",mv321Pct(m.instalacionesPct),`${Number(m.instalacionesTotal||0)} órdenes · meta ≥ 98%`);
        html += mv321Linea("Averías y demás partidas",mv321Pct(m.averiasPct),`${Number(m.averiasTotal||0)} órdenes · meta ≥ 97%`);
        html += mv321Linea("Inasistencias",String(Number(m.inasistencias||0)),"Meta: 0");
        html += mv321Linea("Sin partida o parámetro",String(Number(m.sinPartida||0)+Number(m.sinParametro||0)),"Solo órdenes con hora de inicio y fin");
        if((c.detalleIncumplimientos||[]).length){
            const id = `mv321_sla_${mv321Id(bono.usuario)}_${Math.random().toString(36).slice(2)}`;
            html += `<button class="mv321-link" onclick="toggleDetalle('${id}',this)">▼ Ver órdenes fuera de SLA</button><div id="${id}" class="mv321-incumplimientos" style="display:none;">${c.detalleIncumplimientos.map(x=>`<div><b>${mv321Esc(x.ordenId)}</b><span>${mv321Esc(x.cuadrilla)}</span><small>${mv321Esc(x.tipoPartida)} · ${Number(x.minutos||0)} min / ${Number(x.slaMinutos||0)} min · exceso ${Number(x.exceso||0)} min</small></div>`).join("")}</div>`;
        }
    }else if(c.clave === "SEGURIDAD"){
        html += mv321Linea("Actas sin observaciones",mv321Pct(m.actasPct),`${Number(m.actasSinObservacion||0)} de ${Number(m.actasRevisadas||0)} · ${mv321Money(m.montoActas||0)} / S/ 40`);
        html += mv321Linea("Dos checklist mensuales",mv321Pct(m.checklistCumplimientoPct),`${Number(m.slotsCumplidos||0)} de ${Number(m.slotsMeta||0)} quincenas · ${mv321Money(m.montoChecklistCumplimiento||0)} / S/ 30`);
        html += mv321Linea("Checklist sin observaciones",mv321Pct(m.checklistSinObsPct),`${Number(m.checklistSinObservacion||0)} de ${Number(m.checklistRevisados||0)} · ${mv321Money(m.montoChecklistSinObs||0)} / S/ 20`);
        html += mv321Linea("Evaluación de Jefatura",`${Number(m.montoEvaluacion||0)} pts`,`${mv321Money(m.montoEvaluacion||0)} / S/ 60`);
        html += mv321Linea("Faltas de seguridad penalizadas",String(Number(m.faltasSeguridadPenalizadas||0)),"Si existe una, el componente queda en S/0");
        if(bono.puedeEditar) html += `<button class="mv321-accion" onclick="mv321AbrirEvaluacion('${mv321Esc(bono.usuario)}')">📝 Evaluar liderazgo</button>`;
    }else{
        html += `<div class="mv321-pendiente-win"><b>Pendiente de información WIN</b><span>Se habilitará al cargar la base de llamadas, encuestas y quejas válidas.</span></div>`;
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
            <div class="mv321-bono-total"><b>${mv321Money(bono.montoProvisional)}</b><small>provisional de S/ 1,000</small></div>
        </div>
        <div class="mv321-total-bar"><span style="width:${porcentaje}%"></span></div>
        <div class="mv321-total-meta"><b>${Number(bono.porcentajeEvaluado||0).toFixed(1)}% de los S/850 evaluables</b><span>S/150 de Satisfacción pendiente WIN</span></div>
        <button class="mv321-ver" onclick="toggleDetalle('${id}',this)">▼ Ver bono y cálculo completo</button>
        <div id="${id}" class="mv321-bono-detalle" style="display:${compacta ? "none" : "block"};">
            <div class="mv321-componentes">${componentes}</div>
            ${pendientes ? `<div class="mv321-alertas"><b>Información pendiente</b><ul>${pendientes}</ul></div>` : ""}
            <div class="mv321-cuadrillas"><b>Cuadrillas consideradas:</b> ${mv321Esc((bono.cuadrillas||[]).join(" · "))}</div>
        </div>
    </section>`;
}

function mv321RenderEstadoBase(){
    if(MV321_BONO_SUPERVISORES.cargando) return `<section class="mv321-panel"><div class="mv321-cargando">Calculando bono de supervisores...</div></section>`;
    if(MV321_BONO_SUPERVISORES.error) return `<section class="mv321-panel"><div class="mv321-error"><b>No se pudo calcular el bono</b><span>${mv321Esc(MV321_BONO_SUPERVISORES.error)}</span></div></section>`;
    if(!MV321_BONO_SUPERVISORES.bonos.length) return `<section class="mv321-panel"><div class="mv321-vacio">No existe una asignación de supervisor para este período.</div></section>`;
    return "";
}

function mv321RenderSupervisor(){
    const base = mv321RenderEstadoBase();
    if(base) return base;
    return `<div class="mv321-panel"><div class="mv321-panel-title"><div><b>🎁 BONO DEL SUPERVISOR</b><span>Metas del Dashboard: 130 pts/cuadrilla · Efectividad 70% · Recableado 42% · VTR/GAR 3% · Observaciones S/200</span></div></div>${mv321TarjetaBono(MV321_BONO_SUPERVISORES.bonos[0],false)}</div>`;
}

function mv321RenderJefatura(){
    const base = mv321RenderEstadoBase();
    if(base) return base;
    const bonos = MV321_BONO_SUPERVISORES.bonos || [];
    const total = bonos.reduce((s,x)=>s+(Number(x.montoProvisional)||0),0);
    const maxEvaluado = bonos.length * 850;
    return `<div class="mv321-panel">
        <div class="mv321-panel-title"><div><b>🎁 BONO DE SUPERVISORES</b><span>Comparativo por sede y supervisor</span></div>${MV321_BONO_SUPERVISORES.puedeEditarSla ? `<button class="mv321-config" onclick="mv321AbrirParametrosSla()">⚙️ Parámetros SLA WIN</button>` : ""}</div>
        <div class="mv321-resumen-jefatura"><div><span>Total provisional</span><b>${mv321Money(total)}</b></div><div><span>Supervisores</span><b>${bonos.length}</b></div><div><span>Avance evaluable</span><b>${maxEvaluado?((total/maxEvaluado)*100).toFixed(1):"0.0"}%</b></div></div>
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

function mv321AbrirEvaluacion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    if(!bono) return;
    const seguridad = (bono.componentes||[]).find(x=>x.clave==="SEGURIDAD") || {};
    const evaluacion = seguridad.evaluacion || {};
    const respuestas = evaluacion.respuestas || [];
    const preguntas = seguridad.preguntas || [];
    const contenido = `<div class="mv321-eval-intro"><b>${mv321Esc(bono.nombre)}</b><span>${mv321Esc(bono.sede)} · ${mv321Esc(bono.periodo)} · máximo 60 puntos</span></div>
        <div id="mv321EvaluacionPreguntas">${preguntas.map((p,i)=>{
            const r = respuestas[i] || {};
            const respondida = evaluacion.completa === true && [0,6,12].includes(Number(r.puntaje));
            const puntaje = respondida ? Number(r.puntaje) : null;
            return `<div class="mv321-pregunta" data-indice="${i}"><b>${i+1}. ${mv321Esc(p)}</b><label>Resultado<select class="mv321-eval-puntaje"><option value="" ${puntaje===null?"selected":""}>Seleccione una opción</option><option value="12" ${puntaje===12?"selected":""}>Cumplió — 12 puntos</option><option value="6" ${puntaje===6?"selected":""}>Parcialmente — 6 puntos</option><option value="0" ${puntaje===0?"selected":""}>No cumplió — 0 puntos</option></select></label><label>Comentario<textarea class="mv321-eval-comentario" placeholder="Obligatorio si no cumplió totalmente">${mv321Esc(r.comentario||"")}</textarea></label><label>Evidencia<input class="mv321-eval-evidencia" value="${mv321Esc(r.evidencia||"")}" placeholder="Enlace o referencia de evidencia"></label></div>`;
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
        return {
            puntaje:valor === "" ? null : Number(valor),
            comentario:x.querySelector(".mv321-eval-comentario").value.trim(),
            evidencia:x.querySelector(".mv321-eval-evidencia").value.trim()
        };
    });
    mensaje.className="mv321-form-msg";
    mensaje.textContent="Guardando evaluación...";
    try{
        await mv321Post("guardarEvaluacionBonoSupervisor",{periodo:bono.periodo,supervisor:bono.usuario,respuestas});
        mensaje.className="mv321-form-msg ok";
        mensaje.textContent="Evaluación guardada correctamente.";
        await mv321CargarBonos(bono.periodo);
        setTimeout(()=>{mv321CerrarModal();mv199RenderJefatura();},500);
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
        setTimeout(()=>{mv321CerrarModal();mv199RenderJefatura();},500);
    }catch(e){ mensaje.className="mv321-form-msg error";mensaje.textContent=e.message; }
}
