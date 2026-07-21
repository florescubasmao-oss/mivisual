// MI VISUAL - RANKING

function normalizarTextoRanking(txt){
    return (txt || "")
        .toString()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarCuadrillaRanking(nombre){
    return (nombre || "")
        .toString()
        .replace(/^P\s+(\d+)/i, "P$1")
        .replace(/\s+/g, " ")
        .trim();
}

function parseCSVRanking(texto){
    const filas = [];
    let fila = [];
    let celda = "";
    let dentroComillas = false;

    for(let i = 0; i < texto.length; i++){
        const char = texto[i];
        const sig = texto[i + 1];

        if(char === '"'){
            if(dentroComillas && sig === '"'){
                celda += '"';
                i++;
            }else{
                dentroComillas = !dentroComillas;
            }
        }else if(char === ',' && !dentroComillas){
            fila.push(celda.trim());
            celda = "";
        }else if((char === '\n' || char === '\r') && !dentroComillas){
            if(char === '\r' && sig === '\n') i++;
            fila.push(celda.trim());
            if(fila.some(x => x !== "")) filas.push(fila);
            fila = [];
            celda = "";
        }else{
            celda += char;
        }
    }

    if(celda || fila.length){
        fila.push(celda.trim());
        if(fila.some(x => x !== "")) filas.push(fila);
    }

    return filas;
}

function numeroRanking(valor){
    const n = Number((valor || "").toString()
        .replace("%", "")
        .replace("S/", "")
        .replace(/,/g, ".")
        .replace(/\s/g, "")
    );
    return isNaN(n) ? 0 : n;
}

function formatoSolesRanking(valor){
    const n = numeroRanking(valor);
    return "S/ " + n.toFixed(2);
}

function formatoPorcentajeRanking(valor){
    const n = numeroRanking(valor);
    if(n <= 1){
        return (n * 100).toFixed(2) + "%";
    }
    return n.toFixed(2) + "%";
}

function medallaRanking(puesto){
    if(Number(puesto) === 1) return "🥇";
    if(Number(puesto) === 2) return "🥈";
    if(Number(puesto) === 3) return "🥉";
    return "";
}

function colorSemaforoRanking(tipo, valor){
    const n = numeroRanking(valor);

    if(tipo === "efectividad"){
        if(n >= 0.75) return "🟢";
        if(n >= 0.65) return "🟡";
        return "🔴";
    }

    if(tipo === "recableado"){
        if(n <= 0.45) return "🟢";
        if(n <= 0.55) return "🟡";
        return "🔴";
    }

    if(tipo === "vtrgar"){
        if(n <= 0.02) return "🟢";
        if(n <= 0.04) return "🟡";
        return "🔴";
    }

    return "";
}

function filaRanking(datos){
    return {
        id: datos[0] || "",
        cuadrilla: normalizarCuadrillaRanking(datos[1] || ""),
        actualizacion: datos[2] || "",
        usuario: datos[3] || "",
        sede: normalizarTextoRanking(datos[4] || ""),
        plataforma: normalizarTextoRanking(datos[5] || ""),
        produccion: numeroRanking(datos[6]),
        efectividad: numeroRanking(datos[7]),
        recableado: numeroRanking(datos[8]),
        vtrgar: numeroRanking(datos[9]),
        observaciones: numeroRanking(datos[10]),
        montoTotalObs: numeroRanking(datos[11]),
        montoAfectadoObs: numeroRanking(datos[12]),
        puntaje: numeroRanking(datos[13]),
        puestoSede: Number(datos[14]) || 0,
        puestoRegion: Number(datos[15]) || 0,
        puestoPlataforma: Number(datos[16]) || 0,
        medallaRegion: datos[17] || "",
        medallaSede: datos[18] || "",
        medallaPlataforma: datos[19] || ""
    };
}

function nombreMesRanking(fechaTexto){
    const meses = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];

    if(!fechaTexto) return "";

    const partes = fechaTexto.toString().split("/");
    if(partes.length === 3){
        const mes = Number(partes[1]) - 1;
        return meses[mes] || "";
    }

    return "";
}

function encabezadoPeriodoRanking(item){
    const periodo = nombreMesRanking(item?.actualizacion || "");
    const actualizado = item?.actualizacion || "";

    return `
        <div style="
            background:linear-gradient(135deg,#0f172a,#1e3a8a);
            border-radius:18px;
            padding:16px;
            margin:12px 0 18px 0;
            color:white;
            box-shadow:0 8px 20px rgba(0,0,0,.20);
        ">
            <div style="font-size:13px;opacity:.85;">📅 PERÍODO</div>
            <div style="font-size:22px;font-weight:800;margin-top:4px;">
                ${periodo || "SIN PERÍODO"}
            </div>
            <div style="font-size:14px;margin-top:8px;opacity:.95;">
                Actualizado al: <b>${actualizado || "-"}</b>
            </div>
        </div>
    `;
}

function tarjetaPuestoRanking(titulo, puesto, medalla, icono){
    return `
        <div style="
            background:#1f2d48;
            border-radius:18px;
            padding:16px;
            color:white;
            text-align:center;
            box-shadow:0 6px 16px rgba(0,0,0,.18);
            flex:1;
            min-width:145px;
        ">
            <div style="font-size:14px;opacity:.85;">${icono} ${titulo}</div>
            <div style="font-size:36px;font-weight:900;margin-top:8px;">
                #${puesto || 0} ${medalla || ""}
            </div>
        </div>
    `;
}

function indicadorMiniRanking(titulo, valor, extra){
    return `
        <div style="
            background:#0f172a;
            border:1px solid rgba(255,255,255,.10);
            border-radius:14px;
            padding:12px;
            color:white;
        ">
            <div style="font-size:12px;opacity:.80;">${titulo}</div>
            <div style="font-size:18px;font-weight:800;margin-top:4px;">${valor}</div>
            ${extra ? `<div style="font-size:13px;margin-top:4px;">${extra}</div>` : ""}
        </div>
    `;
}

function tarjetaCuadrillaRanking(r, tipoPuesto){
    let puesto = r.puestoRegion;
    let medalla = medallaRanking(r.puestoRegion);

    if(tipoPuesto === "sede"){
        puesto = r.puestoSede;
        medalla = medallaRanking(r.puestoSede);
    }

    if(tipoPuesto === "plataforma"){
        puesto = r.puestoPlataforma;
        medalla = medallaRanking(r.puestoPlataforma);
    }

    return `
        <div style="
            background:#1f2d48;
            border-radius:18px;
            padding:15px;
            margin:12px 0;
            color:white;
            box-shadow:0 6px 16px rgba(0,0,0,.18);
        ">
            <div style="display:flex;gap:12px;align-items:center;">
                <div style="
                    background:#16a34a;
                    color:white;
                    border-radius:14px;
                    min-width:54px;
                    height:54px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:22px;
                    font-weight:900;
                ">
                    ${medalla || ("#" + puesto)}
                </div>

                <div style="flex:1;">
                    <div style="font-size:15px;font-weight:800;line-height:1.25;">
                        ${r.cuadrilla}
                    </div>
                    <div style="font-size:12px;opacity:.78;margin-top:4px;">
                        ${r.sede || "-"} · ${r.plataforma || "-"}
                    </div>
                </div>
            </div>

            <div style="
                display:grid;
                grid-template-columns:repeat(2,minmax(0,1fr));
                gap:10px;
                margin-top:14px;
            ">
                ${indicadorMiniRanking("Producción", r.produccion, "")}
                ${indicadorMiniRanking("Efectividad", formatoPorcentajeRanking(r.efectividad), colorSemaforoRanking("efectividad", r.efectividad))}
                ${indicadorMiniRanking("% Recableado", formatoPorcentajeRanking(r.recableado), colorSemaforoRanking("recableado", r.recableado))}
                ${indicadorMiniRanking("% VTR/GAR", formatoPorcentajeRanking(r.vtrgar), colorSemaforoRanking("vtrgar", r.vtrgar))}
                ${indicadorMiniRanking("Observaciones", r.observaciones || 0, "")}
                ${indicadorMiniRanking("Monto Afectado", formatoSolesRanking(r.montoAfectadoObs), "")}
            </div>
        </div>
    `;
}

function listaTarjetasRanking(lista, tipoPuesto){
    if(!lista || lista.length === 0){
        return `<div class="card">No hay datos para mostrar.</div>`;
    }

    return lista.map(r => tarjetaCuadrillaRanking(r, tipoPuesto)).join("");
}


/* =========================
   V239 - FILTRO DE SEDE EN RANKING JEFATURA
========================= */

let MV239_RANKING_JEFATURA_LISTA = [];
let MV239_RANKING_JEFATURA_SEDE = "TODAS";

function mv239EsVistaJefaturaRanking(perfil){
    const p = normalizarTextoRanking(perfil);
    return p !== "TECNICO" && p !== "SUPERVISOR";
}

function mv239SedesRanking(lista){
    const ordenOficial = ["CHICLAYO", "PIURA", "TRUJILLO"];
    const presentes = {};
    (lista || []).forEach(x => {
        const sede = normalizarTextoRanking(x.sede || "");
        if(sede) presentes[sede] = true;
    });

    const oficiales = ordenOficial.filter(s => presentes[s]);
    const adicionales = Object.keys(presentes)
        .filter(s => !ordenOficial.includes(s))
        .sort((a,b)=>a.localeCompare(b));

    return oficiales.concat(adicionales);
}

function mv239OpcionesSedeRanking(lista, seleccionada){
    return `<option value="TODAS" ${seleccionada === "TODAS" ? "selected" : ""}>TODAS LAS SEDES</option>` +
        mv239SedesRanking(lista).map(sede =>
            `<option value="${sede}" ${sede === seleccionada ? "selected" : ""}>${sede}</option>`
        ).join("");
}

function mv239FiltroSedeRanking(lista, seleccionada){
    return `
        <div class="mv239-filtro-sede-ranking">
            <label for="mv239FiltroSedeRanking">🏢 Filtrar por sede</label>
            <select id="mv239FiltroSedeRanking" onchange="mv239CambiarSedeRanking(this.value)">${mv239OpcionesSedeRanking(lista, seleccionada)}</select>
        </div>
    `;
}

function mv239OrdenarRanking(lista, tipoPuesto){
    const campo = tipoPuesto === "sede" ? "puestoSede" : "puestoRegion";
    return (lista || []).slice().sort((a,b) => {
        const pa = Number(a[campo]) || 999999;
        const pb = Number(b[campo]) || 999999;
        if(pa !== pb) return pa - pb;
        return (a.cuadrilla || "").localeCompare(b.cuadrilla || "", undefined, {numeric:true});
    });
}

function mv239RenderRankingJefatura(){
    const listaCompleta = MV239_RANKING_JEFATURA_LISTA || [];
    const sede = MV239_RANKING_JEFATURA_SEDE || "TODAS";
    const listaFiltrada = sede === "TODAS"
        ? listaCompleta
        : listaCompleta.filter(x => normalizarTextoRanking(x.sede) === sede);

    const tipoPuesto = sede === "TODAS" ? "region" : "sede";
    const ordenada = mv239OrdenarRanking(listaFiltrada, tipoPuesto);
    const referencia = ordenada[0] || listaCompleta[0];
    const titulo = sede === "TODAS" ? "🌎 RANKING ZONA NORTE" : `🏢 RANKING SEDE ${sede}`;

    let html = `
        <div style="padding:18px;max-width:980px;margin:auto;">
            <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>
            ${encabezadoPeriodoRanking(referencia)}
            ${mv239FiltroSedeRanking(listaCompleta, sede)}
            ${listaTarjetasRanking(ordenada, tipoPuesto)}
            <br>
            <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>
    `;

    mostrarPantalla(html);
}

function mv239CambiarSedeRanking(valor){
    MV239_RANKING_JEFATURA_SEDE = normalizarTextoRanking(valor || "TODAS") || "TODAS";
    mv239RenderRankingJefatura();
}

function vistaTecnicoRanking(item){
    return `
        <div style="padding:18px;max-width:720px;margin:auto;">
            <h2 style="text-align:center;margin-bottom:6px;">🏆 MI RANKING</h2>

            ${encabezadoPeriodoRanking(item)}

            <div style="
                background:#1f2d48;
                border-radius:18px;
                padding:16px;
                color:white;
                box-shadow:0 8px 20px rgba(0,0,0,.20);
            ">
                <div style="font-size:13px;opacity:.80;">CUADRILLA</div>
                <div style="font-size:18px;font-weight:800;margin-top:5px;line-height:1.25;">
                    ${item.cuadrilla}
                </div>
            </div>

            <div style="
                display:grid;
                grid-template-columns:1fr;
                gap:12px;
                margin-top:16px;
            ">
                ${tarjetaPuestoRanking("REGIÓN", item.puestoRegion, medallaRanking(item.puestoRegion), "🌎")}
                ${tarjetaPuestoRanking("SEDE", item.puestoSede, medallaRanking(item.puestoSede), "🏢")}
                ${tarjetaPuestoRanking("PLATAFORMA", item.puestoPlataforma, medallaRanking(item.puestoPlataforma), "🛠️")}
            </div>

            <br>
            <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>
    `;
}

async function mostrarRanking(){

    const perfil = normalizarTextoRanking(localStorage.getItem("perfil"));
    const cuadrillaUsuario = normalizarCuadrillaRanking(localStorage.getItem("cuadrilla"));
    const sedeUsuario = normalizarTextoRanking(localStorage.getItem("sede"));

    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1269910675&single=true&output=csv";

    mostrarPantalla(`
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2>🏆 RANKING</h2>
            Cargando ranking...
        </div>
    `);

    try{
        const respuesta = await fetch(url);
        const texto = await respuesta.text();
        const filas = parseCSVRanking(texto);

        const lista = filas
            .slice(1)
            .map(filaRanking)
            .filter(x => x.cuadrilla);

        if(lista.length === 0){
            mostrarPantalla(`<div style="padding:20px;"><h2>🏆 RANKING</h2>No hay datos de ranking.</div>`);
            return;
        }

        if(perfil === "TECNICO"){
            const item = lista.find(x => normalizarCuadrillaRanking(x.cuadrilla) === cuadrillaUsuario);

            if(!item){
                mostrarPantalla(`<div style="padding:20px;"><h2>🏆 MI RANKING</h2>No se encontró ranking para tu cuadrilla.<br><br><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`);
                return;
            }

            mostrarPantalla(vistaTecnicoRanking(item));
            return;
        }

        if(mv239EsVistaJefaturaRanking(perfil)){
            MV239_RANKING_JEFATURA_LISTA = lista.slice();
            MV239_RANKING_JEFATURA_SEDE = "TODAS";
            mv239RenderRankingJefatura();
            return;
        }

        let listaFiltrada = lista;
        let titulo = "🌎 RANKING ZONA NORTE";
        let tipoPuesto = "region";

        if(perfil === "SUPERVISOR"){
            listaFiltrada = lista.filter(x => x.sede === sedeUsuario);
            titulo = "👨‍💼 RANKING SEDE " + sedeUsuario;
            tipoPuesto = "sede";
        }

        const referencia = listaFiltrada[0] || lista[0];

        let html = `
            <div style="padding:18px;max-width:980px;margin:auto;">
                <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>

                ${encabezadoPeriodoRanking(referencia)}

                ${listaTarjetasRanking(listaFiltrada, tipoPuesto)}

                <br>
                <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
            </div>
        `;

        mostrarPantalla(html);

    }catch(err){
        console.error(err);
        mostrarPantalla(`<div style="padding:20px;"><h2>🏆 RANKING</h2>❌ Error al cargar ranking.<br><br><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`);
    }
}
