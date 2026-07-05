console.log("ACCESOS.JS CARGADO");

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

function mostrarDashboardJefatura(){

    alert("Dashboard Jefatura - En construcción");

}

function mostrarAdministracion(){

    let html = `
    <div style="padding:20px;max-width:900px;margin:auto;">

        <h2>⚙️ ADMINISTRACIÓN</h2>

        </h2>

        <br>

        <div class="card"
        onclick="mostrarImportarProduccion()">

        📥 ACTUALIZAR PRODUCCIÓN

        <br><br>

        <small>
        Importar producción desde la hoja
        IMPORTAR_PRODUCCION
        </small>

        </div>

        <br>

        <div class="card">
        📊 ACTUALIZAR EFECTIVIDAD
        <br><small>Próximamente</small>
        </div>

        <br>

        <div class="card">
        🔁 ACTUALIZAR % RECABLEADO
        <br><small>Próximamente</small>
        </div>

        <br>

        <div class="card">
        🛡️ ACTUALIZAR VTR/GAR
        <br><small>Próximamente</small>
        </div>

        <br>

        <div class="card">
        👥 ACTUALIZAR USUARIOS
        <br><small>Próximamente</small>
        </div>

        <br><br>

        <button
        class="button_1"
        onclick="volverInicio()">

        🏠 VOLVER

        </button>

    </div>

    `;

    mostrarPantalla(html);

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

const url = "https://script.google.com/macros/s/AKfycbx-b8eZEKlbENRT3ZZ9va9hFNiZLayjBpBFX6uop-5qfLbjIYUMTS_hfc7G0a71BIhW/exec";

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
