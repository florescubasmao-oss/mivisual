// MI VISUAL - archivo modularizado

async function mostrarAccesos(){

const cuadrilla = localStorage.getItem("cuadrilla");
const sede = localStorage.getItem("sede");

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=177192408&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

let resultado = "<h3>🚀 ACCESOS</h3>";

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

let destino = datos[1]?.trim();
let nombre = datos[2]?.trim();
let link = datos[3]?.trim();
let icono = "🔗";

if(nombre.includes("Asistencia")) icono = "📅";

else if(nombre.includes("Reunión")) icono = "🎥";

else if(nombre.includes("Liquidación")) icono = "💰";

else if(nombre.includes("VALIDACION")) icono = "📋";

else if(nombre.includes("BOT")) icono = "🤖";

else if(nombre.includes("Grupo")) icono = "📢";
  
if(
destino == "TODOS" ||
destino == sede ||
destino == cuadrilla
){

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
text-align:center;
">

<a href="${link}"
target="_blank"
style="
color:white;
font-size:18px;
font-weight:bold;
text-decoration:none;
display:block;
">

${icono} ${nombre}

</a>

</div>
`;
}

}

mostrarPantalla(resultado);

}

async function mostrarBiblioteca(){

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1577462287&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

let resultado = "<h3>📚 BIBLIOTECA</h3>";

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

let nombre = datos[1]?.trim();
let link = datos[2]?.trim();

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
text-align:center;
">

<a href="${link}"
target="_blank"
style="
color:white;
font-size:18px;
font-weight:bold;
text-decoration:none;
display:block;
">

📄 ${nombre}

</a>

</div>
`;
}

mostrarPantalla(resultado);

}

async function mostrarCapacitacion(){

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=459416480&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

let resultado = `
<h3 style="text-align:center;">
🎓 CAPACITACIÓN
</h3>
`;

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

let nombre = datos[1]?.replace(/"/g,"").trim();
let tipo = datos[2]?.replace(/"/g,"").trim();
let link = datos[3]?.replace(/"/g,"").trim();

let icono = "📁";

if(tipo == "VIDEO") icono = "🎥";
if(tipo == "PDF") icono = "📄";
if(tipo == "PPT") icono = "📊";

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
">

<h4>${icono} ${nombre}</h4>

<a href="${link}" target="_blank"
style="
display:inline-block;
margin-top:10px;
padding:10px 15px;
background:#16a34a;
color:white;
text-decoration:none;
border-radius:8px;
font-weight:bold;
">
ABRIR
</a>

</div>
`;
}

mostrarPantalla(resultado);

}

function mostrarImportarProduccion(){

    mostrarPantalla(`
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2 style="text-align:center;">📥 ACTUALIZAR PRODUCCIÓN</h2>
            <br>

            <div class="card">
                Pega aquí la base descargada del sistema central.
                <br><br>
                <textarea
id="textoProduccion"
style="width:100%;height:300px;border-radius:8px;padding:10px;">
</textarea>

<br><br>

<button class="button_1" onclick="procesarProduccion()">
🔄 PROCESAR PRODUCCIÓN
</button>

&nbsp;

<button class="button_1" onclick="mostrarAdministracion()">
🏠 VOLVER
</button>

<br><br>

<div id="vistaPrevia"></div>


            </div>
          
        </div>
    `);
}

async function procesarProduccion() {

    let texto = document.getElementById("textoProduccion").value;

// Normalizar texto pegado desde Excel o Google Sheets
texto = texto
    .replace(/\t+/g, " ")      // TAB -> espacio
    .replace(/\u00A0/g, " ")   // espacio no separable
    .replace(/[ ]{2,}/g, " ")  // varios espacios -> uno
    .trim();

    if(texto === ""){
        alert("Primero pega la base del sistema.");
        return;
    }

const lineas = texto
    .split(/\r?\n/)
    .map(x => x.replace(/\t+/g, " ").trim())
    .filter(x => x.length > 0);

const URL_CATALOGO =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=2013842388&single=true&output=csv";

const respuesta = await fetch(URL_CATALOGO);

const csv = await respuesta.text();
const catalogo = csv
    .split(/\r?\n/)
    .slice(1) // omite encabezado
    .map(fila => {

        const c = fila.split(",");

        return {
            codigo: (c[0] || "").trim(),
            texto: (c[1] || "").trim()
        };

    })
    .filter(x => x.codigo && x.texto);

    function esFecha(txt){
        return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(txt);
    }

    function esCantidad(txt){
        return /^\d+$/.test(txt);
    }

    function normalizar(txt){
        return txt
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    let cuadrilla = "";
    let fechaActual = "";
    let ordenActual = "";
    let registros = [];

    lineas.forEach((linea, i) => {

    // Detectar cualquier cuadrilla (P1, P2, P10, P11...)
if (/^P\s*\d+/i.test(linea)) {

cuadrilla = linea
    .replace(/^P\s+(\d+)/i, "P$1")   // P 1 -> P1
    .replace(/\s+\d+$/, "")          // elimina el total final (73, 57, etc.)
    .trim();

    fechaActual = "";
    ordenActual = "";

    return;
}

// Ignorar líneas que solo contienen un total
if (/^\d+$/.test(linea)) {
    return;
}

    // Fecha con posible total al final
    const mFecha = linea.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/);

    if (mFecha) {
        fechaActual = mFecha[1];
        return;
    }

    // Partida + cantidad al final
    const mOrden = linea.match(/^(.*?)(\d+)$/);

    if (mOrden) {

        ordenActual = mOrden[1].trim();
        const cantidad = parseInt(mOrden[2],10);

        // Ignorar líneas que realmente son fechas
        if (esFecha(ordenActual)) return;

        // Ignorar líneas vacías
        if (ordenActual === "") return;

        let codigo = "OT";

        const ordenBuscada = normalizar(ordenActual);

        for (let item of catalogo){

            if (
    ordenBuscada === normalizar(item.texto) ||
    ordenBuscada.includes(normalizar(item.texto)) ||
    normalizar(item.texto).includes(ordenBuscada)
) {
                codigo = item.codigo;
                break;
            }

        }

        registros.push({

            usuario: localStorage.getItem("usuario"),
            cuadrilla,
            fecha: fechaActual,
            orden: ordenActual,
            codigo,
            cantidad

        });

    }

});

console.table(registros);

const sinCatalogo = registros.filter(r => r.codigo === "OT");

console.table(sinCatalogo);

console.log("Sin catálogo:", sinCatalogo.length);

let html = `
<h3>✅ Vista previa (${registros.length} registros)</h3>

<table style="width:100%;border-collapse:collapse;background:white;color:black;">
<tr style="background:#1f4e79;color:white;">
<th>Fecha</th>
<th>Código</th>
<th>Cantidad</th>
</tr>
`;

registros.forEach(r => {

    html += `
    <tr>
        <td>${r.fecha}</td>
        <td>${r.codigo}</td>
        <td style="text-align:center">${r.cantidad}</td>
    </tr>
    `;

});

html += "</table>";

document.getElementById("vistaPrevia").innerHTML = html;

const url = "https://script.google.com/macros/s/AKfycbwHo2Qlp9R6fSb0Z6J0ZBT4FhatzOu-wp_AyxgeZIMHZUIe6xvoyv2SogA8Wd-udX2j/exec";

fetch(url, {
    method: "POST",
    body: JSON.stringify(registros)
})
.then(r => r.text())
.then(txt => {

    const res = JSON.parse(txt);

    console.log("Respuesta API:", res);

    if(res.ok){

alert(
    "✅ Nuevos: " + res.nuevos +
    "\n🔄 Actualizados: " + res.actualizados
);

    }else{

        alert(res.error);

    }

})
.catch(err=>{

    console.error(err);

    alert("Error al conectar con la API.");

});

}

function mostrarImportarEfectividad(){

    mostrarPantalla(`
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2 style="text-align:center;">📊 ACTUALIZAR EFECTIVIDAD</h2>
            <br>

            <div class="card">
                <label style="font-weight:bold;">Período</label>
                <select
                    id="periodoEfectividad"
                    style="width:100%;padding:10px;border-radius:8px;margin-top:6px;"
                >
                    <option value="">Seleccione período</option>
                    <option value="ENERO">ENERO</option>
                    <option value="FEBRERO">FEBRERO</option>
                    <option value="MARZO">MARZO</option>
                    <option value="ABRIL">ABRIL</option>
                    <option value="MAYO">MAYO</option>
                    <option value="JUNIO">JUNIO</option>
                    <option value="JULIO">JULIO</option>
                    <option value="AGOSTO">AGOSTO</option>
                    <option value="SEPTIEMBRE">SEPTIEMBRE</option>
                    <option value="OCTUBRE">OCTUBRE</option>
                    <option value="NOVIEMBRE">NOVIEMBRE</option>
                    <option value="DICIEMBRE">DICIEMBRE</option>
                </select>

                <br><br>

                <label style="font-weight:bold;">Actualizado al</label>
                <input
                    type="date"
                    id="fechaEfectividad"
                    style="width:100%;padding:10px;border-radius:8px;margin-top:6px;"
                >

                <br><br>

                Pega aquí la base descargada del sistema central.
                <br><br>

                <textarea
                    id="textoEfectividad"
                    style="width:100%;height:300px;border-radius:8px;padding:10px;"
                    placeholder="Pega aquí la base de efectividad..."
                ></textarea>

                <br><br>

                <button class="button_1" onclick="procesarEfectividad()">
                    📊 PROCESAR EFECTIVIDAD
                </button>

                &nbsp;

                <button class="button_1" onclick="mostrarAdministracion()">
                    🏠 VOLVER
                </button>

                <br><br>

                <div id="vistaPreviaEfectividad"></div>
            </div>
        </div>
    `);
}


async function procesarEfectividad(){

    const periodo = document.getElementById("periodoEfectividad").value;
    const fechaInput = document.getElementById("fechaEfectividad").value;

    if(!periodo || !fechaInput){
        alert("Selecciona el período y la fecha de actualización.");
        return;
    }

    const partesFecha = fechaInput.split("-");
    const actualizadoAl = partesFecha[2] + "/" + partesFecha[1] + "/" + partesFecha[0];

    let texto = document.getElementById("textoEfectividad").value;

    texto = texto
        .replace(/\u00A0/g, " ")
        .trim();

    if(texto === ""){
        alert("Primero pega la base de efectividad.");
        return;
    }

    const lineas = texto
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x.length > 0);

    if(lineas.length < 2){
        alert("La base pegada no tiene suficientes filas.");
        return;
    }

    function limpiar(txt){
        return (txt || "")
            .toString()
            .replace(/"/g, "")
            .trim();
    }

    function numero(txt){
        txt = limpiar(txt)
            .replace("%", "")
            .replace(",", ".");
        return Number(txt) || 0;
    }

    function normalizar(txt){
        return limpiar(txt)
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function separarFila(linea){
        if(linea.includes("\t")){
            return linea.split("\t").map(limpiar);
        }

        if(linea.includes(";")){
            return linea.split(";").map(limpiar);
        }

        return linea.split(",").map(limpiar);
    }

    const encabezados = separarFila(lineas[0]).map(normalizar);

    const idxCuadrilla = encabezados.findIndex(x =>
        x.includes("CUADRILLA") ||
        x.includes("ETIQUETAS") ||
        x.includes("FILA")
    );

    const idxFecha = encabezados.findIndex(x =>
        x.includes("ACTUALIZACION") ||
        x.includes("ACTUALIZACIÓN") ||
        x.includes("FECHA")
    );

    const idxFinalizada = encabezados.findIndex(x => x.includes("FINALIZADA"));
    const idxCancelada = encabezados.findIndex(x => x.includes("CANCELADA"));
    const idxRegestion = encabezados.findIndex(x => x.includes("REGESTION") || x.includes("REGESTIÓN"));
    const idxReprogramado = encabezados.findIndex(x => x.includes("REPROGRAMADO"));
    const idxTotal = encabezados.findIndex(x => x.includes("TOTAL"));

    if(idxCuadrilla === -1 || idxFinalizada === -1 || idxCancelada === -1 || idxTotal === -1){
        alert(
            "La base no tiene las columnas necesarias.\n\n" +
            "Debe tener como mínimo:\n" +
            "- Cuadrilla o Etiquetas de fila\n" +
            "- Finalizada\n" +
            "- Cancelada\n" +
            "- Total general"
        );
        return;
    }

    const usuario = localStorage.getItem("usuario") || "ADMIN";
    const registros = [];

    for(let i = 1; i < lineas.length; i++){

        const c = separarFila(lineas[i]);

        const cuadrilla = limpiar(c[idxCuadrilla]);

        if(!cuadrilla) continue;
        if(normalizar(cuadrilla).includes("TOTAL GENERAL")) continue;

        const finalizada = numero(c[idxFinalizada]);
        const cancelada = numero(c[idxCancelada]);
        const regestion = idxRegestion >= 0 ? numero(c[idxRegestion]) : 0;
        const reprogramado = idxReprogramado >= 0 ? numero(c[idxReprogramado]) : 0;
        const total = numero(c[idxTotal]);
        const fecha = idxFecha >= 0 ? limpiar(c[idxFecha]) : "";

        if(total === 0) continue;

        registros.push({
            usuario: usuario,
            cuadrilla: cuadrilla,
            fecha: fecha,
            finalizada: finalizada,
            cancelada: cancelada,
            regestion: regestion,
            reprogramado: reprogramado,
            total: total
        });
    }

    if(registros.length === 0){
        alert("No se encontraron registros válidos para procesar.");
        return;
    }

    let html = `
        <h3>✅ Vista previa (${registros.length} registros)</h3>

        <table style="width:100%;border-collapse:collapse;background:white;color:black;">
            <tr style="background:#1f4e79;color:white;">
                <th>Cuadrilla</th>
                <th>Finalizada</th>
                <th>Cancelada</th>
                <th>Regestión</th>
                <th>Reprogramado</th>
                <th>Total</th>
            </tr>
    `;

    registros.forEach(r => {
        html += `
            <tr>
                <td>${r.cuadrilla}</td>
                <td style="text-align:center">${r.finalizada}</td>
                <td style="text-align:center">${r.cancelada}</td>
                <td style="text-align:center">${r.regestion}</td>
                <td style="text-align:center">${r.reprogramado}</td>
                <td style="text-align:center">${r.total}</td>
            </tr>
        `;
    });

    html += `</table>`;

    document.getElementById("vistaPreviaEfectividad").innerHTML = html;

    const url = "https://script.google.com/macros/s/AKfycbwHo2Qlp9R6fSb0Z6J0ZBT4FhatzOu-wp_AyxgeZIMHZUIe6xvoyv2SogA8Wd-udX2j/exec";

    try{

        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                accion: "procesarEfectividad",
                periodo: periodo,
                actualizadoAl: actualizadoAl,
                registros: registros
            })
        });

        const textoRespuesta = await respuesta.text();
        const res = JSON.parse(textoRespuesta);

        if(res.ok){

            alert(
                "✅ EFECTIVIDAD ACTUALIZADA" +
                "\n\nRegistros: " + res.registros +
                "\n\nPeríodo: " + res.periodo +
                "\n\nActualizado al: " + res.actualizadoAl +
                "\n\nPromedio: " + (res.promedio * 100).toFixed(2) + "%"
            );

        }else{
            alert("❌ Error: " + res.error);
        }

    }catch(err){
        console.error(err);
        alert("❌ Error al conectar con la API de efectividad.");
    }
}



function mostrarImportarRecableado(){

    mostrarPantalla(`
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2 style="text-align:center;">🔁 ACTUALIZAR % RECABLEADO</h2>
            <br>

            <div class="card">
                <label style="font-weight:bold;">Período</label>
                <select
                    id="periodoRecableado"
                    style="width:100%;padding:10px;border-radius:8px;margin-top:6px;"
                >
                    <option value="">Seleccione período</option>
                    <option value="ENERO">ENERO</option>
                    <option value="FEBRERO">FEBRERO</option>
                    <option value="MARZO">MARZO</option>
                    <option value="ABRIL">ABRIL</option>
                    <option value="MAYO">MAYO</option>
                    <option value="JUNIO">JUNIO</option>
                    <option value="JULIO">JULIO</option>
                    <option value="AGOSTO">AGOSTO</option>
                    <option value="SEPTIEMBRE">SEPTIEMBRE</option>
                    <option value="OCTUBRE">OCTUBRE</option>
                    <option value="NOVIEMBRE">NOVIEMBRE</option>
                    <option value="DICIEMBRE">DICIEMBRE</option>
                </select>

                <br><br>

                <label style="font-weight:bold;">Actualizado al</label>
                <input
                    type="date"
                    id="fechaRecableado"
                    style="width:100%;padding:10px;border-radius:8px;margin-top:6px;"
                >

                <br><br>

                Pega aquí la base de recableados descargada del sistema central.
                <br><br>

                <textarea
                    id="textoRecableado"
                    style="width:100%;height:300px;border-radius:8px;padding:10px;"
                    placeholder="Pega aquí la base de recableado..."
                ></textarea>

                <br><br>

                <button class="button_1" onclick="procesarRecableado()">
                    🔁 PROCESAR RECABLEADO
                </button>

                &nbsp;

                <button class="button_1" onclick="mostrarAdministracion()">
                    🏠 VOLVER
                </button>

                <br><br>

                <div id="vistaPreviaRecableado"></div>
            </div>
        </div>
    `);
}


async function procesarRecableado(){

    const periodo = document.getElementById("periodoRecableado").value;
    const fechaInput = document.getElementById("fechaRecableado").value;

    if(!periodo || !fechaInput){
        alert("Selecciona el período y la fecha de actualización.");
        return;
    }

    const partesFecha = fechaInput.split("-");
    const actualizadoAl = partesFecha[2] + "/" + partesFecha[1] + "/" + partesFecha[0];

    let texto = document.getElementById("textoRecableado").value;

    texto = texto
        .replace(/\u00A0/g, " ")
        .trim();

    if(texto === ""){
        alert("Primero pega la base de recableado.");
        return;
    }

    const lineas = texto
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x.length > 0);

    if(lineas.length < 2){
        alert("La base pegada no tiene suficientes filas.");
        return;
    }

    function limpiar(txt){
        return (txt || "")
            .toString()
            .replace(/"/g, "")
            .trim();
    }

    function numero(txt){
        return Number(
            limpiar(txt)
                .replace("%", "")
                .replace(",", ".")
        ) || 0;
    }

    function normalizar(txt){
        return limpiar(txt)
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizarCuadrilla(txt){
        return limpiar(txt)
            .replace(/^P\s+(\d+)/i, "P$1")
            .replace(/\s+/g, " ")
            .trim();
    }

    function separarLinea(linea){
        if(linea.includes("\t")){
            const partes = linea.split("\t").map(limpiar);
            return {
                descripcion: partes.slice(0, -1).join(" ").trim() || partes[0],
                cantidad: numero(partes[partes.length - 1])
            };
        }

        const match = linea.match(/^(.*?)(\d+(?:[\.,]\d+)?)$/);
        if(match){
            return {
                descripcion: limpiar(match[1]),
                cantidad: numero(match[2])
            };
        }

        return {
            descripcion: limpiar(linea),
            cantidad: 0
        };
    }

    const usuario = localStorage.getItem("usuario") || "ADMIN";
    const registros = [];
    let actual = null;

    lineas.forEach(linea => {

        const item = separarLinea(linea);
        const descripcionNormalizada = normalizar(item.descripcion);

        if(/^P\s*\d+\b/i.test(item.descripcion)){
            if(actual){
                registros.push(actual);
            }

            actual = {
                usuario: usuario,
                cuadrilla: normalizarCuadrilla(item.descripcion),
                totalRojo: item.cantidad,
                recableados: 0
            };

            return;
        }

        if(!actual) return;

        if(descripcionNormalizada.includes("RECABLEADO")){
            actual.recableados += item.cantidad;
        }

    });

    if(actual){
        registros.push(actual);
    }

    const registrosValidos = registros
        .filter(r => r.cuadrilla && r.totalRojo > 0)
        .map(r => ({
            usuario: r.usuario,
            cuadrilla: r.cuadrilla,
            totalRojo: r.totalRojo,
            recableados: r.recableados,
            porcentaje: r.totalRojo > 0 ? r.recableados / r.totalRojo : 0
        }));

    if(registrosValidos.length === 0){
        alert("No se encontraron registros válidos de recableado.");
        return;
    }

    let html = `
        <h3>✅ Vista previa (${registrosValidos.length} registros)</h3>

        <table style="width:100%;border-collapse:collapse;background:white;color:black;">
            <tr style="background:#1f4e79;color:white;">
                <th>Cuadrilla</th>
                <th>Total Rojo</th>
                <th>Recableados</th>
                <th>Porcentaje</th>
            </tr>
    `;

    registrosValidos.forEach(r => {
        html += `
            <tr>
                <td>${r.cuadrilla}</td>
                <td style="text-align:center">${r.totalRojo}</td>
                <td style="text-align:center">${r.recableados}</td>
                <td style="text-align:center">${(r.porcentaje * 100).toFixed(2)}%</td>
            </tr>
        `;
    });

    html += `</table>`;

    document.getElementById("vistaPreviaRecableado").innerHTML = html;

    const url = "https://script.google.com/macros/s/AKfycbwHo2Qlp9R6fSb0Z6J0ZBT4FhatzOu-wp_AyxgeZIMHZUIe6xvoyv2SogA8Wd-udX2j/exec";

    try{

        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                accion: "procesarRecableado",
                periodo: periodo,
                actualizadoAl: actualizadoAl,
                registros: registrosValidos
            })
        });

        const textoRespuesta = await respuesta.text();
        const res = JSON.parse(textoRespuesta);

        if(res.ok){

            alert(
                "✅ RECABLEADO ACTUALIZADO" +
                "\n\nRegistros: " + res.registros +
                "\n\nPeríodo: " + res.periodo +
                "\n\nActualizado al: " + res.actualizadoAl +
                "\n\nPromedio: " + (res.promedio * 100).toFixed(2) + "%"
            );

        }else{
            alert("❌ Error: " + res.error);
        }

    }catch(err){
        console.error(err);
        alert("❌ Error al conectar con la API de recableado.");
    }
}


function mostrarImportarVtrGar(){

    mostrarPantalla(`
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2 style="text-align:center;">🛡️ ACTUALIZAR VTR/GAR</h2>
            <br>

            <div class="card">
                <label style="font-weight:bold;">Período</label>
                <select
                    id="periodoVtrGar"
                    style="width:100%;padding:10px;border-radius:8px;margin-top:6px;"
                >
                    <option value="">Seleccione período</option>
                    <option value="ENERO">ENERO</option>
                    <option value="FEBRERO">FEBRERO</option>
                    <option value="MARZO">MARZO</option>
                    <option value="ABRIL">ABRIL</option>
                    <option value="MAYO">MAYO</option>
                    <option value="JUNIO">JUNIO</option>
                    <option value="JULIO">JULIO</option>
                    <option value="AGOSTO">AGOSTO</option>
                    <option value="SEPTIEMBRE">SEPTIEMBRE</option>
                    <option value="OCTUBRE">OCTUBRE</option>
                    <option value="NOVIEMBRE">NOVIEMBRE</option>
                    <option value="DICIEMBRE">DICIEMBRE</option>
                </select>

                <br><br>

                <label style="font-weight:bold;">Actualizado al</label>
                <input
                    type="date"
                    id="fechaVtrGar"
                    style="width:100%;padding:10px;border-radius:8px;margin-top:6px;"
                >

                <br><br>

                Pega aquí la base VTR/GAR descargada del sistema central.
                <br><br>

                <textarea
                    id="textoVtrGar"
                    style="width:100%;height:300px;border-radius:8px;padding:10px;"
                    placeholder="Pega aquí la base VTR/GAR..."
                ></textarea>

                <br><br>

                <button class="button_1" onclick="procesarVtrGar()">
                    🛡️ PROCESAR VTR/GAR
                </button>

                &nbsp;

                <button class="button_1" onclick="mostrarAdministracion()">
                    🏠 VOLVER
                </button>

                <br><br>

                <div id="vistaPreviaVtrGar"></div>
            </div>
        </div>
    `);
}


async function procesarVtrGar(){

    const periodo = document.getElementById("periodoVtrGar").value;
    const fechaInput = document.getElementById("fechaVtrGar").value;

    if(!periodo || !fechaInput){
        alert("Selecciona el período y la fecha de actualización.");
        return;
    }

    const partesFecha = fechaInput.split("-");
    const actualizadoAl = partesFecha[2] + "/" + partesFecha[1] + "/" + partesFecha[0];

    let texto = document.getElementById("textoVtrGar").value;

    texto = texto
        .replace(/\u00A0/g, " ")
        .trim();

    if(texto === ""){
        alert("Primero pega la base VTR/GAR.");
        return;
    }

    const lineas = texto
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x.length > 0);

    function limpiar(txt){
        return (txt || "")
            .toString()
            .replace(/"/g, "")
            .trim();
    }

    function numero(txt){
        return Number(
            limpiar(txt)
                .replace("%", "")
                .replace(",", ".")
        ) || 0;
    }

    function normalizarTexto(txt){
        return limpiar(txt)
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizarCuadrilla(txt){
        return limpiar(txt)
            .replace(/^P\s+(\d+)/i, "P$1")
            .replace(/\s+/g, " ")
            .trim();
    }

    function separarLinea(linea){
        if(linea.includes("\t")){
            const partes = linea.split("\t").map(limpiar);
            return {
                nombre: partes.slice(0, -1).join(" ").trim() || partes[0],
                cantidad: numero(partes[partes.length - 1])
            };
        }

        if(linea.includes(";")){
            const partes = linea.split(";").map(limpiar);
            return {
                nombre: partes.slice(0, -1).join(" ").trim() || partes[0],
                cantidad: numero(partes[partes.length - 1])
            };
        }

        const match = linea.match(/^(.*?)(\d+(?:[\.,]\d+)?)$/);
        if(match){
            return {
                nombre: limpiar(match[1]),
                cantidad: numero(match[2])
            };
        }

        return {
            nombre: limpiar(linea),
            cantidad: 0
        };
    }

    const usuario = localStorage.getItem("usuario") || "ADMIN";
    const mapa = {};
    let cuadrillaActual = "";

    lineas.forEach(linea => {
        const item = separarLinea(linea);
        const nombre = limpiar(item.nombre);
        const textoNormal = normalizarTexto(nombre);
        const cantidad = item.cantidad;

        if(/^P\s*\d+\s/i.test(nombre)){
            cuadrillaActual = normalizarCuadrilla(nombre);

            if(!mapa[cuadrillaActual]){
                mapa[cuadrillaActual] = {
                    usuario: usuario,
                    cuadrilla: cuadrillaActual,
                    gar: 0,
                    vtr: 0
                };
            }

            return;
        }

        if(!cuadrillaActual) return;

        if(textoNormal.includes("GARANTIA")){
            mapa[cuadrillaActual].gar += cantidad;
        }

        if(textoNormal.includes("REITERADA")){
            mapa[cuadrillaActual].vtr += cantidad;
        }
    });

    const registros = Object.values(mapa);

    if(registros.length === 0){
        alert("No se encontraron registros válidos de VTR/GAR.");
        return;
    }

    let html = `
        <h3>✅ Vista previa (${registros.length} cuadrillas pegadas)</h3>

        <table style="width:100%;border-collapse:collapse;background:white;color:black;">
            <tr style="background:#1f4e79;color:white;">
                <th>Cuadrilla</th>
                <th>GAR</th>
                <th>VTR</th>
                <th>Total GAR/VTR</th>
            </tr>
    `;

    registros.forEach(r => {
        html += `
            <tr>
                <td>${r.cuadrilla}</td>
                <td style="text-align:center">${r.gar}</td>
                <td style="text-align:center">${r.vtr}</td>
                <td style="text-align:center">${r.gar + r.vtr}</td>
            </tr>
        `;
    });

    html += `</table>`;

    document.getElementById("vistaPreviaVtrGar").innerHTML = html;

    const url = "https://script.google.com/macros/s/AKfycbwHo2Qlp9R6fSb0Z6J0ZBT4FhatzOu-wp_AyxgeZIMHZUIe6xvoyv2SogA8Wd-udX2j/exec";

    try{

        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                accion: "procesarVtrGar",
                periodo: periodo,
                actualizadoAl: actualizadoAl,
                registros: registros
            })
        });

        const textoRespuesta = await respuesta.text();
        const res = JSON.parse(textoRespuesta);

        if(res.ok){

            alert(
                "✅ VTR/GAR ACTUALIZADO" +
                "\n\nRegistros: " + res.registros +
                "\n\nPeríodo: " + res.periodo +
                "\n\nActualizado al: " + res.actualizadoAl +
                "\n\nGAR: " + res.gar +
                "\n\nVTR: " + res.vtr +
                "\n\nTOTAL GAR/VTR: " + res.totalVtrGar +
                "\n\nPromedio: " + (res.promedio * 100).toFixed(2) + "%"
            );

        }else{
            alert("❌ Error: " + res.error);
        }

    }catch(err){
        console.error(err);
        alert("❌ Error al conectar con la API de VTR/GAR.");
    }
}
