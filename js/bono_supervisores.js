/* =====================================================
   V334 - CÁLCULO OPTIMIZADO Y ACTUALIZACIÓN MANUAL
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
    desdeCache:false,
    calculadoEn:"",
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
    if(!limpio || /^\s*</.test(limpio)) throw new Error("La consulta tardó demasiado o Apps Script no respondió correctamente. Pulsa Reintentar.");
    let data;
    try{ data = JSON.parse(limpio); }
    catch(e){ throw new Error("La respuesta de Apps Script no es JSON válido."); }
    if(!data.ok) throw new Error((data.error || data.mensaje || "No se pudo completar la operación").replace(/^Error:\s*/,""));
    return data;
}

function mv321PrepararCarga(periodo){
    MV321_BONO_SUPERVISORES = {cargando:true,error:"",periodo:periodo || "",periodos:periodo?[periodo]:[],bonos:[],parametrosSla:[],puedeEditar:false,puedeEditarSla:false,puedeEditarConfiguracion:false,desdeCache:false,calculadoEn:"",configuracion:{montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}};
}

async function mv321CargarBonos(periodo, forzarActualizacion){
    mv321PrepararCarga(periodo);
    try{
        const data = await mv321Post("obtenerBonosSupervisores",{periodo,forzarActualizacion:!!forzarActualizacion});
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
            desdeCache:!!data.desdeCache,
            calculadoEn:data.calculadoEn || "",
            configuracion:data.configuracion || {montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}
        };
    }catch(e){
        MV321_BONO_SUPERVISORES = {cargando:false,error:e.message || "No se pudo calcular el bono.",periodo:periodo || "",periodos:periodo?[periodo]:[],bonos:[],parametrosSla:[],puedeEditar:false,puedeEditarSla:false,puedeEditarConfiguracion:false,desdeCache:false,calculadoEn:"",configuracion:{montoTotal:1000,pesos:{PRODUCTIVIDAD:25,CALIDAD:25,SLA:20,SATISFACCION:15,SEGURIDAD:15},activadores:{PRODUCTIVIDAD:80,CALIDAD:80,SLA:75,SATISFACCION:80,SEGURIDAD:0}}};
    }
}

function mv321EstadoClase(estado){
    const e = (estado || "").toString().toUpperCase();
    if(e.includes("PENDIENTE") || e.includes("SIN DATOS")) return "pendiente";
    if(e.includes("NO PAGABLE") || e.includes("OBSERVADO") || e.includes("NO ACTIVA")) return "riesgo";
    return "provisional";
}

function mv321ComponenteIcono(clave){
    return {
        PRODUCTIVIDAD:"📈",
        CALIDAD:"✅",
        SLA:"⏱️",
        SATISFACCION:"📞",
        SEGURIDAD:"👥"
    }[clave] || "📌";
}

function mv321Linea(etiqueta, valor, referencia){
    return `<div class="mv321-linea"><span>${mv321Esc(etiqueta)}</span><div><b>${mv321Esc(valor)}</b>${referencia ? `<small>${mv321Esc(referencia)}</small>` : ""}</div></div>`;
}


function mv348EscalasPredeterminadas(){
    return {
        PRODUCTIVIDAD:[
            {desde:85,monto:150},
            {desde:90,monto:200},
            {desde:100,monto:250}
        ],
        CALIDAD:[
            {desde:85,monto:150},
            {desde:90,monto:200},
            {desde:100,monto:250}
        ],
        SLA:[
            {desde:95,monto:100},
            {desde:98,monto:150},
            {desde:100,monto:200}
        ],
        SATISFACCION:[
            {desde:85,monto:100},
            {desde:100,monto:150}
        ],
        SEGURIDAD:[
            {desde:85,monto:100},
            {desde:100,monto:150}
        ]
    };
}

function mv348EscalasConfiguradas(){
    const configuracion = MV321_BONO_SUPERVISORES.configuracion || {};
    const origen = configuracion.escalas || mv348EscalasPredeterminadas();
    const salida = {};

    Object.keys(mv348EscalasPredeterminadas()).forEach(clave=>{
        const lista = Array.isArray(origen[clave])
            ? origen[clave]
            : mv348EscalasPredeterminadas()[clave];

        salida[clave] = lista.map(item=>({
            desde:Number(item.desde)||0,
            monto:Number(item.monto)||0
        }));
    });

    return salida;
}

function mv348NombreComponente(clave){
    return {
        PRODUCTIVIDAD:"Productividad operativa",
        CALIDAD:"Calidad de instalaciones y averías",
        SLA:"Cumplimiento de SLA WIN",
        SATISFACCION:"Satisfacción del cliente",
        SEGURIDAD:"Liderazgo"
    }[clave] || clave;
}

function mv348EtiquetaRango(lista, indice){
    const actual = lista[indice];
    const siguiente = lista[indice + 1];

    if(!siguiente) return `${Number(actual.desde).toFixed(0)}% o más`;

    const hasta = Math.max(Number(actual.desde),Number(siguiente.desde) - 0.01);
    return `${Number(actual.desde).toFixed(0)}% a ${hasta.toFixed(2).replace(".00","")}%`;
}

function mv348DetalleEscalasComponente(c){
    const escalas = mv348EscalasConfiguradas();
    const lista = escalas[c.clave] || [];
    const cumplimiento = Number(c.cumplimiento);
    const evaluado = c.cumplimiento !== null && c.cumplimiento !== undefined;
    let nivelAlcanzado = -1;

    lista.forEach((nivel,indice)=>{
        if(evaluado && cumplimiento >= Number(nivel.desde)) nivelAlcanzado = indice;
    });

    return `<div style="margin-top:10px;padding:10px;border:1px solid #274566;border-radius:12px;background:#0d2037;">
        <b style="display:block;margin-bottom:7px;color:#dbeafe;">Escala de pago</b>
        ${lista.map((nivel,indice)=>{
            const activo = indice === nivelAlcanzado;
            return `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 8px;margin-top:5px;border-radius:9px;background:${activo?"#14532d":"#132a45"};border:1px solid ${activo?"#22c55e":"#274566"};">
                <span>${mv321Esc(mv348EtiquetaRango(lista,indice))}</span>
                <b>${mv321Money(nivel.monto)}${activo?" · ALCANZADO":""}</b>
            </div>`;
        }).join("")}
        <small style="display:block;margin-top:7px;color:#9fc1e4;">Por debajo del primer nivel corresponde S/ 0.00.</small>
    </div>`;
}

function mv348TarjetaEscalaConfiguracion(clave, lista){
    return `<div style="margin-top:12px;padding:12px;border:1px solid #274566;border-radius:14px;background:#102844;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;">
            <b>${mv321Esc(mv348NombreComponente(clave))}</b>
            <span style="font-size:10px;color:#9fc1e4;">${lista.length} niveles</span>
        </div>

        ${lista.map((nivel,indice)=>`
            <div class="mv348-fila-escala" data-clave="${clave}" data-indice="${indice}" style="display:grid;grid-template-columns:minmax(120px,1fr) minmax(120px,1fr);gap:9px;margin-top:8px;">
                <label>Desde (%)
                    <input class="mv348-desde" type="number" min="0" max="100" step="0.01" value="${Number(nivel.desde)}" oninput="mv350PorcentajeEscalaCambiado()">
                </label>

                <label>Monto (S/)
                    <input class="mv348-monto" type="number" min="0" max="100000" step="0.01" value="${Number(nivel.monto)}" oninput="mv350MontoEscalaCambiado()">
                </label>
            </div>`).join("")}
    </div>`;
}

function mv348LeerEscalasFormulario(){
    const escalas = {};

    document.querySelectorAll(".mv348-fila-escala").forEach(fila=>{
        const clave = fila.dataset.clave;
        const indice = Number(fila.dataset.indice);

        if(!escalas[clave]) escalas[clave] = [];

        escalas[clave][indice] = {
            desde:Number(fila.querySelector(".mv348-desde").value),
            monto:Number(fila.querySelector(".mv348-monto").value)
        };
    });

    return escalas;
}

function mv348ValidarEscalasFormulario(escalas){
    const cantidades = {
        PRODUCTIVIDAD:3,
        CALIDAD:3,
        SLA:3,
        SATISFACCION:2,
        SEGURIDAD:2
    };

    for(const clave of Object.keys(cantidades)){
        const lista = escalas[clave];

        if(!Array.isArray(lista) || lista.length !== cantidades[clave]){
            return `${mv348NombreComponente(clave)} no tiene todos sus niveles.`;
        }

        let desdeAnterior = -1;
        let montoAnterior = -1;

        for(let i=0;i<lista.length;i++){
            const nivel = lista[i];

            if(!Number.isFinite(nivel.desde) || nivel.desde < 0 || nivel.desde > 100){
                return `Revise el porcentaje del nivel ${i+1} de ${mv348NombreComponente(clave)}.`;
            }

            if(!Number.isFinite(nivel.monto) || nivel.monto < 0){
                return `Revise el monto del nivel ${i+1} de ${mv348NombreComponente(clave)}.`;
            }

            if(nivel.desde <= desdeAnterior){
                return `Los porcentajes de ${mv348NombreComponente(clave)} deben aumentar en cada nivel.`;
            }

            if(nivel.monto < montoAnterior){
                return `Los montos de ${mv348NombreComponente(clave)} no pueden disminuir en un nivel superior.`;
            }

            desdeAnterior = nivel.desde;
            montoAnterior = nivel.monto;
        }
    }

    return "";
}

let MV350_BASE_DISTRIBUCION_BONO = null;

function mv350RedondearMoneda(valor){
    return Math.round((Number(valor)||0)*100)/100;
}

function mv350ClonarEscalas(escalas){
    const salida = {};
    Object.keys(escalas||{}).forEach(clave=>{
        salida[clave] = (escalas[clave]||[]).map(nivel=>({
            desde:Number(nivel.desde)||0,
            monto:Number(nivel.monto)||0
        }));
    });
    return salida;
}

function mv350TotalEscalas(escalas){
    return mv350RedondearMoneda(
        Object.values(escalas||{}).reduce((suma,lista)=>{
            const maximo = (lista||[]).reduce(
                (mayor,nivel)=>Math.max(mayor,Number(nivel.monto)||0),
                0
            );
            return suma + maximo;
        },0)
    );
}

function mv350GuardarBaseDistribucion(total, escalas){
    MV350_BASE_DISTRIBUCION_BONO = {
        total:Math.max(0.01,Number(total)||0.01),
        escalas:mv350ClonarEscalas(escalas)
    };
}

function mv350EscribirEscalasFormulario(escalas){
    document.querySelectorAll(".mv348-fila-escala").forEach(fila=>{
        const clave = fila.dataset.clave;
        const indice = Number(fila.dataset.indice);
        const nivel = escalas?.[clave]?.[indice];
        const campo = fila.querySelector(".mv348-monto");

        if(campo && nivel){
            campo.value = mv350RedondearMoneda(nivel.monto).toFixed(2);
        }
    });
}

function mv350InicializarMontoTotal(){
    const escalas = mv348LeerEscalasFormulario();
    const configuracion = MV321_BONO_SUPERVISORES.configuracion || {};
    const totalConfigurado = Number(configuracion.montoTotal);
    const total = Number.isFinite(totalConfigurado) && totalConfigurado > 0
        ? totalConfigurado
        : mv350TotalEscalas(escalas);

    const campoTotal = document.getElementById("mv350MontoTotal");
    if(campoTotal) campoTotal.value = mv350RedondearMoneda(total).toFixed(2);

    mv350GuardarBaseDistribucion(total,escalas);
}

function mv350DistribuirMontoTotal(){
    const campoTotal = document.getElementById("mv350MontoTotal");
    if(!campoTotal) return;

    const objetivo = Number(campoTotal.value);
    if(!Number.isFinite(objetivo) || objetivo <= 0) return;

    if(!MV350_BASE_DISTRIBUCION_BONO){
        mv350InicializarMontoTotal();
    }

    const base = MV350_BASE_DISTRIBUCION_BONO;
    const factor = objetivo / Math.max(0.01,Number(base.total)||0.01);
    const ajustadas = mv350ClonarEscalas(base.escalas);

    Object.keys(ajustadas).forEach(clave=>{
        ajustadas[clave].forEach(nivel=>{
            nivel.monto = mv350RedondearMoneda(Number(nivel.monto||0)*factor);
        });
    });

    // Ajustar centavos para que la suma de máximos coincida con el total.
    const totalAjustado = mv350TotalEscalas(ajustadas);
    const diferencia = mv350RedondearMoneda(objetivo-totalAjustado);

    if(Math.abs(diferencia) >= 0.01){
        const claves = Object.keys(ajustadas);
        const ultimaClave = claves[claves.length-1];
        const lista = ajustadas[ultimaClave];
        const ultimo = lista.length-1;
        lista[ultimo].monto = mv350RedondearMoneda(
            Math.max(0,Number(lista[ultimo].monto||0)+diferencia)
        );
    }

    mv350EscribirEscalasFormulario(ajustadas);
}

function mv350MontoEscalaCambiado(){
    const escalas = mv348LeerEscalasFormulario();
    const total = mv350TotalEscalas(escalas);
    const campoTotal = document.getElementById("mv350MontoTotal");

    if(campoTotal) campoTotal.value = total.toFixed(2);

    // Después de una edición manual, esa distribución pasa a ser la nueva base.
    mv350GuardarBaseDistribucion(total,escalas);
}

function mv350PorcentajeEscalaCambiado(){
    // Los porcentajes no alteran el monto máximo ni la distribución monetaria.
}


function mv321DetalleComponente(c, bono){
    const m = c.metricas || {};
    const activador = Number.isFinite(Number(c.activador)) ? Number(c.activador) : 0;
    const referenciaActivador = c.evaluable && Number(c.cumplimiento||0)>activador
        ? "Bono activo y prorrateado"
        : "No suma al bono";

    let html = "";

    if(c.clave === "PRODUCTIVIDAD"){
        html += mv321Linea("Puntaje de cuadrillas · peso 60%",mv321Pct(m.productividadPct),`Meta: 130 puntos por cuadrilla · ${Number(m.puntos||0).toFixed(1)} / ${Number(m.metaPuntos||0)} pts`);
        html += mv321Linea("Efectividad · peso 40%",mv321Pct(m.efectividadPct),`Meta ≥ 70% · ${Number(m.finalizadas||0)} finalizadas`);

    }else if(c.clave === "CALIDAD"){
        html += mv321Linea("Observaciones WIN · peso 30%",mv321Pct(m.puntajeObservaciones),`${Number(m.observacionesWin||0)} registros WIN`);
        html += mv321Linea("Cantidad WIN · 10% del indicador",String(Number(m.observacionesWin||0)),Number(m.observacionesWin||0)===0?"Cumplimiento total":"Registros WIN detectados");
        html += mv321Linea("Penalizadas WIN · 90% del indicador",mv321Money(m.montoPenalizadoWin),`Meta ≤ S/ 300 · ${Number(m.observacionesWinPenalizadas||0)} penalizadas`);
        html += mv321Linea("Recableado · peso 40%",mv321Pct(m.recableadoPct),`Meta ≤ 42% · ${Number(m.recableados||0)} de ${Number(m.rojoAsignadas||0)} órdenes VT`);
        html += mv321Linea("VTR/GAR · peso 30%",mv321Pct(m.vtrGarPct),`Meta ≤ 3% · ${Number(m.incidenciasVtrGar||0)} incidencias`);

    }else if(c.clave === "SLA"){
        html += mv321Linea("Órdenes FINALIZADAS evaluables",String(Number(m.evaluables||0)),`${Number(m.cumplen||0)} cumplen · ${Number(m.vencidas||0)} fuera de SLA`);
        html += mv321Linea("Instalaciones dentro del SLA",mv321Pct(m.instalacionesPct),`${Number(m.instalacionesTotal||0)} órdenes · Instalación / Instalación Posible Fraude con motivo vacío o INSTALADO`);
        html += mv321Linea("Visitas técnicas dentro del SLA",mv321Pct(m.visitasTecnicasPct ?? m.averiasPct),`${Number(m.visitasTecnicasTotal ?? m.averiasTotal ?? 0)} órdenes · demás casos FINALIZADOS`);
        html += mv321Linea("Finalizadas detectadas",String(Number(m.finalizadasDetectadas||0)),`${Number(m.sinTiempos||0)} sin Inicio/Fin válido`);
        html += mv321Linea("Excluidas por estado",String(Number(m.excluidasNoFinalizadas||0)),"Canceladas, reprogramadas y otros estados no participan");
        html += mv321Linea("Sin partida o parámetro",String(Number(m.sinPartida||0)+Number(m.sinParametro||0)),"No participan hasta contar con parámetro SLA");

        if((c.detalleIncumplimientos||[]).length){
            const id = `mv321_sla_${mv321Id(bono.usuario)}_${Math.random().toString(36).slice(2)}`;
            html += `<button class="mv321-link" onclick="toggleDetalle('${id}',this)">▼ Ver órdenes fuera de SLA</button>
                <div id="${id}" class="mv321-incumplimientos" style="display:none;">
                    ${c.detalleIncumplimientos.map(x=>`<div><b>${mv321Esc(x.ordenId)}</b><span>${mv321Esc(x.cuadrilla)}</span><small>${mv321Esc(x.grupo||"")} · ${mv321Esc(x.tipoPartida)} · ${Number(x.minutos||0)} min / ${Number(x.slaMinutos||0)} min · exceso ${Number(x.exceso||0)} min</small></div>`).join("")}
                </div>`;
        }

    }else if(c.clave === "SATISFACCION"){
        html += mv321Linea(
            "Atención al cliente · peso 60%",
            mv321Pct(m.atencionCombinadaPct),
            `${Number(m.auditoriasEvaluadas||0)} auditorías · ${Number(m.muestrasAtencion||0)} muestras totales`
        );

        html += mv321Linea(
            "Resultado de auditorías",
            mv321Pct(m.atencionAuditoriasPct),
            "Auditoría en Frío y Auditoría en Caliente"
        );

        html += mv321Linea(
            "Llamadas opcionales",
            m.llamadasIncluidas ? mv321Pct(m.llamadasPct) : "No consideradas",
            m.llamadasIncluidas
                ? `${Number(m.respondieron||0)} respondieron · ${Number(m.noRespondieron||0)} sin respuesta`
                : "No registrar llamadas no afecta el porcentaje"
        );

        if(m.llamadasIncluidas){
            html += mv321Linea(
                "Clientes conformes / no conformes",
                `${Number(m.conformes||0)} / ${Number(m.noConformes||0)}`,
                `${Number(m.clientesLlamados||0)} llamadas registradas`
            );
        }

        html += mv321Linea(
            "Orden y limpieza · peso 40%",
            mv321Pct(m.ordenLimpiezaPct),
            `${Number(m.auditoriasEvaluadas||0)} auditorías evaluadas`
        );

        if(bono.puedeEditar){
            html += `<button class="mv321-accion" onclick="mv324AbrirSatisfaccion('${mv321Esc(bono.usuario)}')">📞 Llamadas opcionales</button>`;
        }

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

        if(bono.puedeEditar){
            html += `<button class="mv321-accion" onclick="mv332AbrirActas('${mv321Esc(bono.usuario)}')">📄 Validar actas</button>`;
            html += `<button class="mv321-accion" onclick="mv321AbrirEvaluacion('${mv321Esc(bono.usuario)}')">📝 Evaluar liderazgo</button>`;
        }
    }

    html += mv348DetalleEscalasComponente(c);
    if(c.nota) html += `<div class="mv321-nota">${mv321Esc(c.nota)}</div>`;
    return html;
}

function mv321TarjetaComponente(c, bono){
    const id = `mv321_comp_${mv321Id(bono.usuario)}_${mv321Id(c.clave)}_${Math.random().toString(36).slice(2)}`;
    const cumplimiento = c.cumplimiento === null || c.cumplimiento === undefined
        ? "No evaluado"
        : `${Number(c.cumplimiento||0).toFixed(1)}%`;

    const pesos = (MV321_BONO_SUPERVISORES.configuracion || {}).pesos || {};
    const pesoComponente = Number(pesos[c.clave] || 0);

    return `<div class="mv321-componente ${mv321EstadoClase(c.estado)}">
        <div class="mv321-comp-head">
            <div>
                <span>${mv321ComponenteIcono(c.clave)}</span>
                <b>${mv321Esc(c.nombre)}</b>
                <small style="display:inline-flex;margin-left:7px;padding:3px 7px;border-radius:999px;background:#1e3a5f;color:#bfdbfe;font-size:9px;font-weight:900;white-space:nowrap;">${pesoComponente}%</small>
            </div>
            <em>${mv321Esc(c.estado)}</em>
        </div>
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
    if(MV321_BONO_SUPERVISORES.cargando) return `<section class="mv321-panel"><div class="mv321-cargando">Leyendo y calculando la información del período...</div></section>`;
    if(MV321_BONO_SUPERVISORES.error) return `<section class="mv321-panel"><div class="mv321-error"><b>No se pudo calcular el bono</b><span>${mv321Esc(MV321_BONO_SUPERVISORES.error)}</span><button class="mv321-accion" onclick="mv334ActualizarCalculo()">↻ Reintentar</button></div></section>`;
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
    if(MV321_BONO_SUPERVISORES.periodo) botones.push(`<button class="mv321-config" onclick="mv334ActualizarCalculo()" ${MV321_BONO_SUPERVISORES.cargando?"disabled":""}>↻ Actualizar cálculo</button>`);
    if(MV321_BONO_SUPERVISORES.puedeEditarConfiguracion) botones.push(`<button class="mv321-config" onclick="mv324AbrirConfiguracionBono()">⚙️ Escalas del bono: ${mv321Money(montoPeriodo)}</button>`);
    if(MV321_BONO_SUPERVISORES.puedeEditarSla) botones.push(`<button class="mv321-config" onclick="mv321AbrirParametrosSla()">⚙️ Parámetros SLA WIN</button>`);
    return botones.join("");
}

function mv334EstadoActualizacion(){
    if(!MV321_BONO_SUPERVISORES.periodo || MV321_BONO_SUPERVISORES.cargando || !MV321_BONO_SUPERVISORES.calculadoEn) return "";
    const origen = MV321_BONO_SUPERVISORES.desdeCache ? "Respuesta rápida guardada" : "Datos leídos nuevamente";
    return `<small style="display:block;margin-top:7px;opacity:.8;">${mv321Esc(origen)} · ${mv321Esc(MV321_BONO_SUPERVISORES.calculadoEn)}</small>`;
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
            ${mv334EstadoActualizacion()}
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
        desdeCache:false,
        calculadoEn:"",
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

async function mv334ActualizarCalculo(){
    const periodo = MV321_BONO_SUPERVISORES.periodo;
    if(!periodo || MV321_BONO_SUPERVISORES.cargando) return;
    mv321PrepararCarga(periodo);
    mv325RenderPaginaBonos();
    await mv321CargarBonos(periodo,true);
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


function mv347CambiarUsoLlamadas(){
    const usar = !!document.getElementById("mv347UsarLlamadas")?.checked;
    ["mv324SatLlamados","mv324SatConformes","mv324SatNoConformes"].forEach(function(id){
        const campo = document.getElementById(id);
        if(!campo) return;
        campo.disabled = !usar;
        if(!usar) campo.value = "0";
    });
}


function mv324AbrirSatisfaccion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    if(!bono) return;

    const componente = (bono.componentes||[]).find(x=>x.clave==="SATISFACCION") || {};
    const registro = componente.registro || {};
    const activador = Number.isFinite(Number(componente.activador))
        ? Number(componente.activador)
        : 80;

    const incluir = Number(registro.clientesLlamados||0) > 0;

    const contenido = `
        <div class="mv321-eval-intro">
            <b>${mv321Esc(bono.nombre)}</b>
            <span>${mv321Esc(bono.sede)} · ${mv321Esc(bono.periodo)} · activador mayor a ${activador}%</span>
        </div>

        <div class="mv321-param-intro">
            <b>Medición principal automática</b><br>
            Atención al cliente representa 60% y Orden y limpieza 40%, tomando las Auditorías en Frío y en Caliente.
            Las llamadas son opcionales y solo complementan Atención al cliente. Si no se incluyen, no generan penalidad.
        </div>

        <div class="mv321-pregunta">
            <label style="display:flex;align-items:center;gap:9px;">
                <input id="mv347UsarLlamadas" type="checkbox" ${incluir ? "checked" : ""} onchange="mv347CambiarUsoLlamadas()" style="width:20px;height:20px;">
                Incluir llamadas en este período
            </label>

            <label>Clientes llamados
                <input id="mv324SatLlamados" type="number" min="0" step="1" value="${Number(registro.clientesLlamados||0)}">
            </label>

            <label>Clientes conformes
                <input id="mv324SatConformes" type="number" min="0" step="1" value="${Number(registro.conformes||0)}">
            </label>

            <label>Clientes no conformes
                <input id="mv324SatNoConformes" type="number" min="0" step="1" value="${Number(registro.noConformes||0)}">
            </label>

            <label>Observación
                <textarea id="mv324SatObservacion" placeholder="Comentario opcional de Jefatura">${mv321Esc(registro.observacion||"")}</textarea>
            </label>
        </div>

        <div id="mv324SatMensaje" class="mv321-form-msg"></div>
        <button class="mv321-guardar" onclick="mv324GuardarSatisfaccion('${mv321Esc(bono.usuario)}')">💾 Guardar llamadas</button>`;

    mv321MostrarModal("Llamadas opcionales de atención al cliente",contenido);
    setTimeout(mv347CambiarUsoLlamadas,0);
}

async function mv324GuardarSatisfaccion(usuario){
    const bono = mv321BonoPorUsuario(usuario);
    const mensaje = document.getElementById("mv324SatMensaje");
    if(!bono || !mensaje) return;

    const usar = !!document.getElementById("mv347UsarLlamadas")?.checked;
    const clientesLlamados = usar ? Number(document.getElementById("mv324SatLlamados").value) : 0;
    const conformes = usar ? Number(document.getElementById("mv324SatConformes").value) : 0;
    const noConformes = usar ? Number(document.getElementById("mv324SatNoConformes").value) : 0;
    const observacion = document.getElementById("mv324SatObservacion").value.trim();

    mensaje.className="mv321-form-msg";
    mensaje.textContent=usar ? "Guardando llamadas..." : "Desactivando llamadas para el período...";

    try{
        await mv321Post("guardarSatisfaccionBonoSupervisor",{
            periodo:bono.periodo,
            supervisor:bono.usuario,
            clientesLlamados,
            conformes,
            noConformes,
            observacion
        });

        mensaje.className="mv321-form-msg ok";
        mensaje.textContent=usar
            ? "Llamadas guardadas correctamente."
            : "Las llamadas no serán consideradas en este período.";

        await mv321CargarBonos(bono.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){
        mensaje.className="mv321-form-msg error";
        mensaje.textContent=e.message;
    }
}

function mv324AbrirConfiguracionBono(){
    const escalas = mv348EscalasConfiguradas();
    const configuracion = MV321_BONO_SUPERVISORES.configuracion || {};
    const totalEscalas = mv350TotalEscalas(escalas);
    const totalConfigurado = Number(configuracion.montoTotal);
    const total = Number.isFinite(totalConfigurado) && totalConfigurado > 0
        ? totalConfigurado
        : totalEscalas;

    const contenido = `
        <div class="mv321-param-intro">
            La configuración rige solo para ${mv321Esc(MV321_BONO_SUPERVISORES.periodo)}.
            Los porcentajes, los montos por nivel y el bono máximo son editables.
            Al cambiar el bono máximo, todos los montos se acondicionan automáticamente
            conservando la misma proporción.
        </div>

        <div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,260px);gap:12px;align-items:end;margin-top:12px;padding:12px;border-radius:13px;background:#0d2037;border:1px solid #274566;">
            <div>
                <b style="display:block;font-size:18px;">Bono máximo del período</b>
                <small style="color:#9fc1e4;">Al modificarlo se redistribuyen automáticamente los montos.</small>
            </div>

            <label style="font-weight:900;">Monto total (S/)
                <input
                    id="mv350MontoTotal"
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    value="${mv350RedondearMoneda(total).toFixed(2)}"
                    oninput="mv350DistribuirMontoTotal()"
                    style="width:100%;box-sizing:border-box;margin-top:5px;font-size:18px;font-weight:900;"
                >
            </label>
        </div>

        ${mv348TarjetaEscalaConfiguracion("PRODUCTIVIDAD",escalas.PRODUCTIVIDAD)}
        ${mv348TarjetaEscalaConfiguracion("CALIDAD",escalas.CALIDAD)}
        ${mv348TarjetaEscalaConfiguracion("SLA",escalas.SLA)}
        ${mv348TarjetaEscalaConfiguracion("SATISFACCION",escalas.SATISFACCION)}
        ${mv348TarjetaEscalaConfiguracion("SEGURIDAD",escalas.SEGURIDAD)}

        <div class="mv321-param-intro" style="margin-top:14px;">
            También puede modificar manualmente cualquier monto. En ese caso,
            el bono máximo se recalcula con la suma de los montos máximos de cada indicador.
            Por debajo del primer porcentaje corresponde S/ 0.00.
        </div>

        <div id="mv324ConfigMensaje" class="mv321-form-msg"></div>
        <button class="mv321-guardar" onclick="mv324GuardarConfiguracionBono()">💾 Guardar escalas</button>`;

    mv321MostrarModal("Configuración de escalas del bono",contenido);
    setTimeout(mv350InicializarMontoTotal,0);
}

async function mv324GuardarConfiguracionBono(){
    const mensaje = document.getElementById("mv324ConfigMensaje");
    if(!mensaje) return;

    const montoTotal = Number(document.getElementById("mv350MontoTotal")?.value);
    const escalas = mv348LeerEscalasFormulario();
    const error = mv348ValidarEscalasFormulario(escalas);

    if(!Number.isFinite(montoTotal) || montoTotal <= 0 || montoTotal > 100000){
        mensaje.className = "mv321-form-msg error";
        mensaje.textContent = "El bono máximo debe ser mayor a cero y no superar S/ 100,000.";
        return;
    }

    if(error){
        mensaje.className = "mv321-form-msg error";
        mensaje.textContent = error;
        return;
    }

    mensaje.className = "mv321-form-msg";
    mensaje.textContent = "Guardando monto total y escalas...";

    try{
        await mv321Post("guardarConfiguracionBonoSupervisores",{
            periodo:MV321_BONO_SUPERVISORES.periodo,
            montoTotal,
            escalas
        });

        mensaje.className = "mv321-form-msg ok";
        mensaje.textContent = "Monto total y escalas actualizados correctamente.";

        await mv321CargarBonos(MV321_BONO_SUPERVISORES.periodo);
        setTimeout(mv325RefrescarVistaActual,500);
    }catch(e){
        mensaje.className = "mv321-form-msg error";
        mensaje.textContent = e.message;
    }
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
