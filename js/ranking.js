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
    const n = Number((valor || "").toString().replace("%", "").replace(",", "."));
    return isNaN(n) ? 0 : n;
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
        if(n >= 0.65) return "🟢";
        if(n >= 0.55) return "🟡";
        return "🔴";
    }

    if(tipo === "recableado"){
        if(n <= 0.05) return "🟢";
        if(n <= 0.08) return "🟡";
        return "🔴";
    }

    if(tipo === "vtrgar"){
        if(n <= 0.03) return "🟢";
        if(n <= 0.05) return "🟡";
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
        puntaje: numeroRanking(datos[10]),
        puestoSede: Number(datos[11]) || 0,
        puestoRegion: Number(datos[12]) || 0,
        puestoPlataforma: Number(datos[13]) || 0,
        medallaRegion: datos[14] || "",
        medallaSede: datos[15] || "",
        medallaPlataforma: datos[16] || ""
    };
}

function tablaRanking(lista){
    let html = `
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;background:white;color:black;font-size:13px;">
            <tr style="background:#1f4e79;color:white;">
                <th>Puesto</th>
                <th>Cuadrilla</th>
                <th>Sede</th>
                <th>Plataforma</th>
                <th>Producción</th>
                <th>Efectividad</th>
                <th>% Rec.</th>
                <th>% VTR/GAR</th>
            </tr>
    `;

    lista.forEach(r => {
        html += `
            <tr>
                <td style="text-align:center;font-weight:bold;">${medallaRanking(r.puestoRegion)}</td>
                <td>${r.cuadrilla}</td>
                <td style="text-align:center;">${r.sede}</td>
                <td style="text-align:center;">${r.plataforma}</td>
                <td style="text-align:center;">${r.produccion}</td>
                <td style="text-align:center;">${formatoPorcentajeRanking(r.efectividad)} ${colorSemaforoRanking("efectividad", r.efectividad)}</td>
                <td style="text-align:center;">${formatoPorcentajeRanking(r.recableado)} ${colorSemaforoRanking("recableado", r.recableado)}</td>
                <td style="text-align:center;">${formatoPorcentajeRanking(r.vtrgar)} ${colorSemaforoRanking("vtrgar", r.vtrgar)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;
    return html;
}

function vistaTecnicoRanking(item){
    return `
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2 style="text-align:center;">🏆 MI RANKING</h2>

            <div class="card" style="text-align:center;">
                <h3>${item.cuadrilla}</h3>
                <p>Actualizado al: <b>${item.actualizacion}</b></p>
                <hr>
<h2>Puesto Región: ${item.puestoRegion} ${medallaRanking(item.puestoRegion)}</h2>

<h2>Puesto Sede: ${item.puestoSede} ${medallaRanking(item.puestoSede)}</h2>

<h2>Puesto Plataforma: ${item.puestoPlataforma} ${medallaRanking(item.puestoPlataforma)}</h2>

            </div>

            <br>

            ${tablaRanking([item])}

            <br>
            <button class="button_1" onclick="volverInicio()">🏠 VOLVER</button>
        </div>
    `;
}

async function mostrarRanking(){

    const perfil = normalizarTextoRanking(localStorage.getItem("perfil"));
    const cuadrillaUsuario = normalizarCuadrillaRanking(localStorage.getItem("cuadrilla"));
    const sedeUsuario = normalizarTextoRanking(localStorage.getItem("sede"));
    const plataformaUsuario = normalizarTextoRanking(localStorage.getItem("plataforma"));

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
                mostrarPantalla(`<div style="padding:20px;"><h2>🏆 MI RANKING</h2>No se encontró ranking para tu cuadrilla.<br><br><button class="button_1" onclick="volverInicio()">🏠 VOLVER</button></div>`);
                return;
            }

            mostrarPantalla(vistaTecnicoRanking(item));
            return;
        }

        let listaFiltrada = lista;
        let titulo = "🌎 RANKING ZONA NORTE";

        if(perfil === "SUPERVISOR"){
            listaFiltrada = lista.filter(x => x.sede === sedeUsuario);
            titulo = "👨‍💼 RANKING SEDE " + sedeUsuario;
        }

        let html = `
            <div style="padding:20px;max-width:1100px;margin:auto;">
                <h2>${titulo}</h2>
                <p>Indicadores por cuadrilla. El puntaje interno no se muestra.</p>
                ${tablaRanking(listaFiltrada)}
                <br>
                <button class="button_1" onclick="volverInicio()">🏠 VOLVER</button>
            </div>
        `;

        mostrarPantalla(html);

    }catch(err){
        console.error(err);
        mostrarPantalla(`<div style="padding:20px;"><h2>🏆 RANKING</h2>❌ Error al cargar ranking.<br><br><button class="button_1" onclick="volverInicio()">🏠 VOLVER</button></div>`);
    }
}
