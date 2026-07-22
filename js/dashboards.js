// MI VISUAL - archivo modularizado

function leerCSVLineaMiVisual(linea){
    const resultado = [];
    let actual = "";
    let entreComillas = false;

    for(let i = 0; i < linea.length; i++){
        const caracter = linea[i];
        const siguiente = linea[i + 1];

        if(caracter === '"' && entreComillas && siguiente === '"'){
            actual += '"';
            i++;
        } else if(caracter === '"'){
            entreComillas = !entreComillas;
        } else if(caracter === ',' && !entreComillas){
            resultado.push(actual);
            actual = "";
        } else {
            actual += caracter;
        }
    }

    resultado.push(actual);
    return resultado.map(x => (x || "").toString().trim());
}

function numeroMiVisual(valor){
    if(typeof valor === "number") return valor;
    return Number((valor || "").toString().replace(",", ".")) || 0;
}

async function mostrarProduccion() {

const cuadrilla = localStorage.getItem("cuadrilla");
const perfil = localStorage.getItem("perfil");
const sede = localStorage.getItem("sede");

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=463676034&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");
const encabezado = filas[0];
const datosFilas = filas.slice(1).reverse();

filas.length = 0;
filas.push(encabezado, ...datosFilas);
  
const encabezados = filas[0].split(",");

let resultado = `

<h3>📊 PRODUCCIÓN</h3>
`;
  
let totalProduccion = 0;

let totalUltimaMilla = 0;
let totalInstalaciones = 0;
let totalRecableadoVT = 0;
let totalRecableadoPost = 0;
let totalTraslados = 0;

let totalPuntos = 0;
  
for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

if(datos[2] && datos[2].trim() === cuadrilla.trim()){

  let puntosDia = 0;
  
  for(let j=5; j<=28; j++){
        totalProduccion += Number(datos[j]) || 0;
    }

// Última Milla
totalUltimaMilla += Number(datos[5]) || 0;

// Instalaciones
totalInstalaciones += (Number(datos[15]) || 0);
totalInstalaciones += (Number(datos[16]) || 0);

// Recableado Postventa
totalRecableadoPost += (Number(datos[6]) || 0);
totalRecableadoPost += (Number(datos[7]) || 0);
totalRecableadoPost += (Number(datos[8]) || 0);
totalRecableadoPost += (Number(datos[9]) || 0);
totalRecableadoPost += (Number(datos[20]) || 0);
totalRecableadoPost += (Number(datos[21]) || 0);
totalRecableadoPost += (Number(datos[22]) || 0);
totalRecableadoPost += (Number(datos[23]) || 0);

// Recableado Visita Técnica
totalRecableadoVT += Number(datos[24]) || 0;

// Traslados
totalTraslados += (Number(datos[27]) || 0);
totalTraslados += (Number(datos[28]) || 0);

let detalle = "";

const puntos = {
5: 1,      // Atención de Averías Última Milla
6: 1,      // Cableado UTP Cat 5
7: 1,      // Cableado UTP Cat 5 + 1 Mesh
8: 1,      // Cableado UTP Cat 5 + 2 Mesh
9: 1,      // Cableado UTP Cat 6 + 2 Mesh
10: 1,     // Cambio de Equipo Mesh
11: 1,     // Cambio de Equipo ONT
12: 1,     // Cambio de Fono WIN
13: 1,     // Cambio de TV BOX
14: 1,     // Cambio de TV BOX Adicional
15: 1.5,   // Instalación y Activación en Condominios
16: 2,     // Instalación y Activación en Residenciales
17: 1,     // Prueba de Servicio
18: 1,     // Pruebas de Servicio
19: 1,     // Reubicación con Reserva
20: 2,     // Reubicación sin Reserva
21: 2,     // Recableado Postventa
22: 2,     // Recableado Postventa + 1 ONT
23: 2.5,   // Recableado Postventa + UTP + 1 ONT
24: 2,     // Recableado Visita Técnica
25: 1,     // Entrega y Configuración de Mesh
26: 1,     // Entrega y Configuración de TV BOX
27: 1.5,   // Traslado por Mudanza en Condominio
28: 2      // Traslado por Mudanza en Residenciales
};
  
for(let j = 5; j < datos.length; j++){

   let valor = Number(datos[j]);
  console.log(j, encabezados[j], valor);

 puntosDia += valor * (puntos[j] || 0);

   if(valor > 0){

      detalle += `
      <div style="margin:5px 0;">
      ${encabezados[j]}: <b>${valor}</b>
      </div>
      `;
   }
}

  totalPuntos += puntosDia;

  let semaforo = "🔴 SIN BONO";

if(puntosDia >= 4.5){
   semaforo = "🟢 BONO GANADO";
}
else if(puntosDia == 4){
   semaforo = "🟡 CERCA AL BONO";
}

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
">

<h4>📅 ${datos[4]}</h4>

<div style="
font-size:18px;
font-weight:bold;
margin:10px 0;
">
${semaforo}
</div>

⭐ Puntos: <b>${puntosDia.toFixed(1)}</b>

<br><br>

🏠 <b>${datos[2]}</b>

<hr>

${detalle}

</div>
`;
}
}
resultado =
`
<div style="
background:#16a34a;
padding:15px;
margin-bottom:15px;
border-radius:10px;
color:white;
font-weight:bold;
">

📊 RESUMEN DEL MES

<br><br>

📦 Producción Total: ${totalProduccion}<br>
🔧 Última Milla: ${totalUltimaMilla}<br>
🏠 Instalaciones: ${totalInstalaciones}<br>
📡 Recableado VT: ${totalRecableadoVT}<br>
🔄 Recableado Postventa: ${totalRecableadoPost}<br>
🚚 Traslados: ${totalTraslados}<br>
⭐ Puntos Acumulados: ${totalPuntos.toFixed(1)}

</div>
`
+ resultado;
  
mostrarPantalla(resultado);
  
}

const urlProduccion =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1814992325&single=true&output=csv";

const urlCatalogo =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=2013842388&single=true&output=csv";

async function mostrarProduccionV2(){

    document.getElementById("menuPrincipal").style.display = "none";

    const cuadrilla = localStorage.getItem("cuadrilla");

    let totalProduccion = 0;

let totalUltimaMilla = 0;
let totalInstalaciones = 0;
let totalRecableadoVT = 0;
let totalRecableadoPost = 0;
let totalTraslados = 0;

let totalPuntos = 0;

    const respuestaProduccion = await fetch(urlProduccion);
    const textoProduccion = await respuestaProduccion.text();

    const respuestaCatalogo = await fetch(urlCatalogo);
    const textoCatalogo = await respuestaCatalogo.text();

    const filasProduccion = textoProduccion.trim().split("\n");
    const filasCatalogo = textoCatalogo.trim().split("\n");

    console.log("Registros Producción:", filasProduccion.length-1);
    console.log("Registros Catálogo:", filasCatalogo.length-1);

    //--------------------------------------------------
    // CATALOGO
    //--------------------------------------------------

    const catalogo = {};

    
    for(let i=1;i<filasCatalogo.length;i++){

        const d = leerCSVLineaMiVisual(filasCatalogo[i]);

        catalogo[d[0].trim()] = {

            tipo: d[1].trim(),
            plataforma: d[2].trim(),
            puntaje: numeroMiVisual(d[3]),
            grupo: d[4].trim()

        };

    }

    console.log(catalogo);

    //--------------------------------------------------
    // PRODUCCION DEL USUARIO
    //--------------------------------------------------

    const registros = [];

    for(let i=1;i<filasProduccion.length;i++){

        const d = leerCSVLineaMiVisual(filasProduccion[i]);


console.log(
    "Cuadrilla hoja:", d[1],
    "| Cuadrilla login:", cuadrilla
);

const hoja = d[1].replace("...", "").trim();

const login = cuadrilla.trim();

if(!login.startsWith(hoja)){
    console.log("NO COINCIDE");
    continue;
}

console.log("COINCIDE");

        registros.push({

            usuario:d[0],
            cuadrilla:d[1],
            fecha:d[2],
            codigo:d[3],
            cantidad:numeroMiVisual(d[4]),

            tipo:catalogo[d[3]]?.tipo || "",
            grupo:catalogo[d[3]]?.grupo || "",
            puntaje:catalogo[d[3]]?.puntaje || 0

        });

    }

   console.table(registros);

registros.forEach(r=>{

    totalProduccion += numeroMiVisual(r.cantidad);

    totalPuntos += numeroMiVisual(r.cantidad) * numeroMiVisual(r.puntaje);

    switch(r.grupo){

        case "ULTIMA_MILLA":
            totalUltimaMilla += numeroMiVisual(r.cantidad);
            break;

        case "INSTALACION":
            totalInstalaciones += numeroMiVisual(r.cantidad);
            break;

        case "RECABLEADO_VT":
            totalRecableadoVT += numeroMiVisual(r.cantidad);
            break;

        case "RECABLEADO_POST":
            totalRecableadoPost += numeroMiVisual(r.cantidad);
            break;

        case "TRASLADO":
            totalTraslados += numeroMiVisual(r.cantidad);
            break;

    }

});

console.log({

    totalProduccion,
    totalUltimaMilla,
    totalInstalaciones,
    totalRecableadoVT,
    totalRecableadoPost,
    totalTraslados,
    totalPuntos

});

const dashboard = {
    resumen:{
        totalProduccion,
        totalUltimaMilla,
        totalInstalaciones,
        totalRecableadoVT,
        totalRecableadoPost,
        totalTraslados,
        totalPuntos
    },
    detalle: registros
};

renderDashboardProduccion(dashboard);

}

function renderDashboardProduccion(data){

    const totalPuntos = Number(data.resumen.totalPuntos || 0);
    const mostrarBotonBonos = !(typeof mb242EsCuadrillaPDG === "function" && mb242EsCuadrillaPDG(localStorage.getItem("cuadrilla")));
    let estadoBono = "🔴 SIN BONO";
    let estadoColor = "#991b1b";

    if(totalPuntos >= 4.5){
        estadoBono = "🟢 BONO GANADO";
        estadoColor = "#15803d";
    }else if(totalPuntos >= 4){
        estadoBono = "🟡 CERCA AL BONO";
        estadoColor = "#b45309";
    }

    let html = `
    <div style="padding:16px;max-width:920px;margin:auto;">

        <div class="mb242-produccion-head">
            <h2>📊 MI PRODUCCIÓN</h2>
            ${mostrarBotonBonos ? `<button type="button" class="mb242-btn-produccion" onclick="mostrarBonos()">🎁 BONOS</button>` : ""}
        </div>

        <div style="
            background:linear-gradient(135deg,#123c69,#0f766e);
            color:white;
            border-radius:20px;
            padding:22px;
            margin-bottom:16px;
            box-shadow:0 8px 18px rgba(0,0,0,.25);
        ">
            <div style="font-size:13px;opacity:.85;letter-spacing:.5px;">PUNTOS ACUMULADOS</div>
            <div style="font-size:42px;font-weight:900;line-height:1;margin:8px 0;">${totalPuntos.toFixed(1)}</div>
            <div style="display:inline-block;background:${estadoColor};padding:8px 12px;border-radius:999px;font-weight:bold;font-size:13px;">
                ${estadoBono}
            </div>
        </div>

        <div style="
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:10px;
            margin-bottom:18px;
        ">
            ${kpiProduccionTecnico("📦", "Total", data.resumen.totalProduccion)}
            ${kpiProduccionTecnico("🏠", "Instalaciones", data.resumen.totalInstalaciones)}
            ${kpiProduccionTecnico("🔧", "Última Milla", data.resumen.totalUltimaMilla)}
            ${kpiProduccionTecnico("📡", "Recableado VT", data.resumen.totalRecableadoVT)}
            ${kpiProduccionTecnico("🔄", "Recableado Post", data.resumen.totalRecableadoPost)}
            ${kpiProduccionTecnico("🚚", "Traslados", data.resumen.totalTraslados)}
        </div>

        <div style="text-align:center;margin:18px 0;">
            <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>

        <h2 style="margin-top:20px;">📅 Historial de Producción</h2>
    `;

    if(!data.detalle || data.detalle.length === 0){
        html += `
            <div style="background:#1f2d48;color:white;border-radius:14px;padding:16px;margin-top:12px;">
                No hay producción registrada para tu cuadrilla.
            </div>
        `;
        html += `</div>`;
        mostrarPantalla(html);
        return;
    }

    let fechaActual = "";

    data.detalle.sort((a, b) => {
        const fa = (a.fecha || "").split("/").reverse().join("");
        const fb = (b.fecha || "").split("/").reverse().join("");
        return fb.localeCompare(fa);
    });

    data.detalle.forEach(r => {
        if (r.fecha !== fechaActual) {
            fechaActual = r.fecha;
            html += `
                <div style="
                    margin-top:18px;
                    margin-bottom:8px;
                    padding:10px 14px;
                    border-radius:12px;
                    background:#1e3a8a;
                    color:white;
                    font-weight:bold;
                ">
                    📅 ${fechaActual}
                </div>
            `;
        }

        const puntos = (Number(r.puntaje) || 0) * (Number(r.cantidad) || 0);

        html += `
            <div style="
                background:#1f2d48;
                border-left:5px solid #16a34a;
                border-radius:16px;
                padding:15px;
                margin:10px 0;
                color:white;
                box-shadow:0 4px 12px rgba(0,0,0,.18);
            ">
                <div style="font-size:16px;font-weight:800;line-height:1.35;margin-bottom:10px;">
                    ${r.tipo || "Trabajo registrado"}
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="background:#0f172a;border-radius:12px;padding:10px;">
                        <div style="font-size:11px;color:#9fb7d8;">CANTIDAD</div>
                        <div style="font-size:22px;font-weight:900;">${r.cantidad}</div>
                    </div>
                    <div style="background:#0f172a;border-radius:12px;padding:10px;">
                        <div style="font-size:11px;color:#9fb7d8;">PUNTOS</div>
                        <div style="font-size:22px;font-weight:900;color:#facc15;">${puntos.toFixed(1)}</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    mostrarPantalla(html);
}

function kpiProduccionTecnico(icono, titulo, valor){
    return `
        <div style="
            background:#1f2d48;
            color:white;
            border-radius:16px;
            padding:14px;
            min-height:78px;
            box-shadow:0 4px 12px rgba(0,0,0,.18);
        ">
            <div style="font-size:12px;color:#9fb7d8;line-height:1.2;">${icono} ${titulo}</div>
            <div style="font-size:26px;font-weight:900;margin-top:6px;">${valor || 0}</div>
        </div>
    `;
}

function mostrarDashboardSupervisor(){

mostrarPantalla(`

<div class="dashboard">

<h2>📊 DASHBOARD SUPERVISOR</h2>

<div class="filtros">

<div id="filtroFechas" style="display:none;">
<label>Desde</label><br>
<input type="date" id="fechaInicio">

<br><br>

<label>Hasta</label><br>
<input type="date" id="fechaFin">

<br><br>

<button onclick="consultarDashboard()">
CONSULTAR
</button>

  </div>

</div>

<hr>

<div id="resumenGeneral"
style="
margin-top:15px;
padding:15px;
background:#162842;
border-radius:10px;
color:white;
text-align:center;
line-height:28px;
">

<h3>📊 RESUMEN GENERAL</h3>

<div id="periodoResumen"
style="
font-size:15px;
color:#BFD7EA;
margin-top:-8px;
margin-bottom:15px;
font-weight:600;
">
Periodo: Cargando...
</div>

<div id="textoResumen">

    Cargando...

</div>

</div>

<hr>

<div id="tablaDashboard">

Aquí aparecerán las cuadrillas.

</div>

</div>

`);

setTimeout(() => {
    consultarDashboard();
}, 900);
}

let periodoActual = "";

async function consultarDashboard(){

console.log("Perfil:", localStorage.getItem("perfil"));
console.log("Sede:", localStorage.getItem("sede"));
console.log("Usuario:", localStorage.getItem("usuario"));

const url="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=463676034&single=true&output=csv";

const respuesta=await fetch(url);

const texto=await respuesta.text();

const filas=texto.split("\n");
const primeraFila = filas[1];

if (primeraFila) {

    const columnas = primeraFila.split(",");

    const fechaActualizacion = columnas[3].trim();

    const partes = fechaActualizacion.split("/");

    const meses = [
        "Enero","Febrero","Marzo","Abril",
        "Mayo","Junio","Julio","Agosto",
        "Septiembre","Octubre","Noviembre","Diciembre"
    ];

    periodoActual =
        meses[parseInt(partes[1]) - 1] + " " + partes[2];
}


//=========================
// EFECTIVIDAD
//=========================

const urlEfectividad =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1731471693&single=true&output=csv";

const respuestaEfectividad = await fetch(urlEfectividad);

const textoEfectividad = await respuestaEfectividad.text();

const filasEfectividad = textoEfectividad.split("\n");

const efectividadCuadrillas = {};

const urlUsuarios = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=0&single=true&output=csv";

const respuestaUsuarios = await fetch(urlUsuarios);

const textoUsuarios = await respuestaUsuarios.text();

const filasUsuarios = textoUsuarios.split("\n");

const sedeSupervisor = localStorage.getItem("sede");
const sedeSupervisorTxt = (sedeSupervisor || "").trim().toUpperCase();

const cuadrillasPermitidas = [];

console.log("Sede Supervisor:", sedeSupervisorTxt);

for(let i=1; i<filasUsuarios.length; i++){

    const datos = filasUsuarios[i].split(",");

    const cuadrilla = (datos[3] || "").replace(/"/g,"").trim().toUpperCase();
    const sede = (datos[4] || "").replace(/"/g,"").trim().toUpperCase();
    const perfil = (datos[6] || "").replace(/"/g,"").trim().toUpperCase();

    console.log(
    "Cuadrilla:", cuadrilla,
    "| Sede:", sede,
    "| Perfil:", perfil
);

    if(sede == sedeSupervisorTxt && perfil == "TECNICO"){

        cuadrillasPermitidas.push(cuadrilla);

    }

    }

    //=========================
// CARGAR EFECTIVIDAD
//=========================

for(let i=1; i<filasEfectividad.length; i++){

    const datos = filasEfectividad[i].split(",");

    const cuadrilla = (datos[2] || "")
        .replace(/"/g,"")
        .trim()
        .toUpperCase();

    const efectividad = parseFloat(
        (datos[9] || "0")
        .replace("%","")
    ) || 0;

    efectividadCuadrillas[cuadrilla] = efectividad;

}

//=========================
// RECABLEADO
//=========================

const urlRecableado =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=317412212&single=true&output=csv";

const respuestaRec = await fetch(urlRecableado);

const textoRec = await respuestaRec.text();

const filasRec = textoRec.split("\n");

const recableadoCuadrillas = {};

//=========================
// VTR / GAR
//=========================

const urlVtrGar =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1778246699&single=true&output=csv";

const respuestaVtr = await fetch(urlVtrGar);

const textoVtr = await respuestaVtr.text();

const filasVtr = textoVtr.split("\n");

const vtrCuadrillas = {};

const PUNTAJES = {

ultimaMilla:1,

instRes:2,
instCondo:1.5,

trasladoRes:2,
trasladoCondo:1.5,

ont:1,
mesh:1,

utp5:1,
utp5Mesh1:1,
utp5Mesh2:1,
utp6Mesh2:1,

recPV:2,
recPVUtpOnt:2.5,
recVT:2

};

//=========================
// CARGAR VTR/GAR
//=========================

for(let i=1; i<filasVtr.length; i++){

    const datos = filasVtr[i].split(",");

    const cuadrilla = (datos[2] || "")
        .replace(/"/g,"")
        .trim()
        .toUpperCase();

    const porcentaje = parseFloat(
        (datos[8] || "0")
        .replace("%","")
    ) || 0;

    vtrCuadrillas[cuadrilla] = porcentaje;

}

//=========================
// CARGAR RECABLEADO
//=========================

for(let i=1; i<filasRec.length; i++){

    const datos = filasRec[i].split(",");

    const cuadrilla = (datos[2] || "")
        .replace(/"/g,"")
        .trim()
        .toUpperCase();

    const porcentaje = parseFloat(
        (datos[6] || "0")
        .replace("%","")
    ) || 0;

    recableadoCuadrillas[cuadrilla] = porcentaje;

}


console.log(cuadrillasPermitidas);

console.log("Usuarios:", filasUsuarios.length);

console.log("Supervisor:", sedeSupervisor);

let resultado = "";

const dashboard = {};

const listaCuadrillas = [];

for(let i=1; i<filas.length; i++){

    const datos = filas[i].split(",");

    const fecha = (datos[4] || "").trim();
    const cuadrilla = (datos[2] || "").replace(/"/g,"").trim().toUpperCase();

    if(!cuadrillasPermitidas.includes(cuadrilla)){
        continue;
    }

    const ultimaMilla = Number(datos[5] || 0);

    const utp5 = Number(datos[6] || 0);
    const utp5Mesh1 = Number(datos[7] || 0);
    const utp5Mesh2 = Number(datos[8] || 0);
    const utp6Mesh2 = Number(datos[9] || 0);

    const mesh = Number(datos[10] || 0);
    const ont = Number(datos[11] || 0);

    const instCondo = Number(datos[15] || 0);
    const instRes = Number(datos[16] || 0);

    const trasladoCondo = Number(datos[27] || 0);
    const trasladoRes = Number(datos[28] || 0);

    const instalaciones = instCondo + instRes;

    const traslados = trasladoCondo + trasladoRes;

    const postventa =
        utp5 +
        utp5Mesh1 +
        utp5Mesh2 +
        utp6Mesh2 +
        mesh +
        ont;

if(!dashboard[cuadrilla]){

dashboard[cuadrilla] = {

    ultimaMilla:0,

    utp5:0,
    utp5Mesh1:0,
    utp5Mesh2:0,
    utp6Mesh2:0,
    mesh:0,
    ont:0,

    instRes:0,
    instCondo:0,

    trasladoRes:0,
    trasladoCondo:0,

    dias:{}

};

}

dashboard[cuadrilla].ultimaMilla += ultimaMilla;

dashboard[cuadrilla].utp5 += utp5;
dashboard[cuadrilla].utp5Mesh1 += utp5Mesh1;
dashboard[cuadrilla].utp5Mesh2 += utp5Mesh2;
dashboard[cuadrilla].utp6Mesh2 += utp6Mesh2;
dashboard[cuadrilla].mesh += mesh;
dashboard[cuadrilla].ont += ont;

dashboard[cuadrilla].instRes += instRes;
dashboard[cuadrilla].instCondo += instCondo;

dashboard[cuadrilla].trasladoRes += trasladoRes;
dashboard[cuadrilla].trasladoCondo += trasladoCondo;

if(!dashboard[cuadrilla].dias[fecha]){

  dashboard[cuadrilla].dias[fecha]={

    ultimaMilla:0,

    utp5:0,
    utp5Mesh1:0,
    utp5Mesh2:0,
    utp6Mesh2:0,
    mesh:0,
    ont:0,

    instRes:0,
    instCondo:0,

    trasladoRes:0,
    trasladoCondo:0

};

}

dashboard[cuadrilla].dias[fecha].ultimaMilla += ultimaMilla;
dashboard[cuadrilla].dias[fecha].utp5 += utp5;
dashboard[cuadrilla].dias[fecha].utp5Mesh1 += utp5Mesh1;
dashboard[cuadrilla].dias[fecha].utp5Mesh2 += utp5Mesh2;
dashboard[cuadrilla].dias[fecha].utp6Mesh2 += utp6Mesh2;

dashboard[cuadrilla].dias[fecha].mesh += mesh;
dashboard[cuadrilla].dias[fecha].ont += ont;

dashboard[cuadrilla].dias[fecha].instRes += instRes;
dashboard[cuadrilla].dias[fecha].instCondo += instCondo;

dashboard[cuadrilla].dias[fecha].trasladoRes += trasladoRes;
dashboard[cuadrilla].dias[fecha].trasladoCondo += trasladoCondo;

}

let sumaEfectividad = 0;
let sumaRecableado = 0;
let sumaVtr = 0;

let totalCuadrillas = 0;

let totalProduccionGeneral = 0;
let totalPuntosGeneral = 0;

Object.values(dashboard).forEach(info=>{

 totalProduccionGeneral +=
    info.ultimaMilla +
    info.instRes +
    info.instCondo +
    info.trasladoRes +
    info.trasladoCondo +
    info.utp5 +
    info.utp5Mesh1 +
    info.utp5Mesh2 +
    info.utp6Mesh2 +
    info.mesh +
    info.ont;

});

const ranking = Object.keys(dashboard).map(cuadrilla => {

    const info = dashboard[cuadrilla];

    const total =
        info.ultimaMilla +
        info.instRes +
        info.instCondo +
        info.trasladoRes +
        info.trasladoCondo +
        info.utp5 +
        info.utp5Mesh1 +
        info.utp5Mesh2 +
        info.utp6Mesh2 +
        info.mesh +
        info.ont;

        const puntos =

info.ultimaMilla * PUNTAJES.ultimaMilla +

info.instRes * PUNTAJES.instRes +

info.instCondo * PUNTAJES.instCondo +

info.trasladoRes * PUNTAJES.trasladoRes +

info.trasladoCondo * PUNTAJES.trasladoCondo +

info.utp5 * PUNTAJES.utp5 +

info.utp5Mesh1 * PUNTAJES.utp5Mesh1 +

info.utp5Mesh2 * PUNTAJES.utp5Mesh2 +

info.utp6Mesh2 * PUNTAJES.utp6Mesh2 +

info.mesh * PUNTAJES.mesh +

info.ont * PUNTAJES.ont;

return {

cuadrilla,

info,

total,

puntos

};

});

ranking.sort((a,b)=> b.total - a.total);

const maxProduccion = ranking.length > 0 ? ranking[0].total : 1;

ranking.forEach((item, indice)=>{

    const cuadrilla = item.cuadrilla;
    const info = item.info;
    const total = item.total;
    const puntos = item.puntos;
    totalPuntosGeneral += puntos;

    let colorPuntos = "#e74c3c";
let estadoPuntos = "🔴 Debajo de la meta";

if (puntos >= 130) {
    colorPuntos = "#2ecc71";
    estadoPuntos = "🟢 Meta cumplida";
}
else if (puntos >= 110) {
    colorPuntos = "#f1c40f";
    estadoPuntos = "🟡 Cerca de la meta";
}

 const ef = efectividadCuadrillas[cuadrilla] || 0;
const rec = recableadoCuadrillas[cuadrilla] || 0;
const vtr = vtrCuadrillas[cuadrilla] || 0;

sumaEfectividad += ef;
sumaRecableado += rec;
sumaVtr += vtr;
totalCuadrillas++;

    let detalleDias = "";

    let detallePuntos = `
<div style="
margin-top:10px;
padding:10px;
background:#182945;
border-radius:8px;
display:none;
"
id="puntos_${cuadrilla.replace(/\s+/g,'_')}">

<b>⭐ DETALLE DE PUNTOS</b>

<hr>

Última Milla:
${info.ultimaMilla} × ${PUNTAJES.ultimaMilla}
= ${(info.ultimaMilla*PUNTAJES.ultimaMilla).toFixed(1)}

<br><br>

Inst. Residencial:
${info.instRes} × ${PUNTAJES.instRes}
= ${(info.instRes*PUNTAJES.instRes).toFixed(1)}

<br><br>

Inst. Condominio:
${info.instCondo} × ${PUNTAJES.instCondo}
= ${(info.instCondo*PUNTAJES.instCondo).toFixed(1)}

<br><br>

Traslado Residencial:
${info.trasladoRes} × ${PUNTAJES.trasladoRes}
= ${(info.trasladoRes*PUNTAJES.trasladoRes).toFixed(1)}

<br><br>

Traslado Condominio:
${info.trasladoCondo} × ${PUNTAJES.trasladoCondo}
= ${(info.trasladoCondo*PUNTAJES.trasladoCondo).toFixed(1)}

<hr>

<b>TOTAL :</b>

⭐ ${puntos.toFixed(1)} puntos

</div>
`;

Object.keys(info.dias).forEach(fecha=>{

    const d = info.dias[fecha];

const totalDia =
    d.ultimaMilla +
    d.instRes +
    d.instCondo +
    d.trasladoRes +
    d.trasladoCondo +
    d.utp5 +
    d.utp5Mesh1 +
    d.utp5Mesh2 +
    d.utp6Mesh2 +
    d.mesh +
    d.ont;

    detalleDias += `
        <div style="
            margin-top:8px;
            padding:6px;
            background:#10233b;
            border-radius:6px;
            font-size:12px;
        ">
            <b>${fecha}</b><br>

${d.ultimaMilla > 0 ? `UM: ${d.ultimaMilla}<br>` : ""}

${(d.instRes > 0 || d.instCondo > 0) ? `
<b>INSTALACIONES</b><br>
${d.instRes > 0 ? `Residencial: ${d.instRes}<br>` : ""}
${d.instCondo > 0 ? `Condominio: ${d.instCondo}<br>` : ""}
<br>
` : ""}

${(d.trasladoRes > 0 || d.trasladoCondo > 0) ? `
<b>TRASLADOS</b><br>
${d.trasladoRes > 0 ? `Residencial: ${d.trasladoRes}<br>` : ""}
${d.trasladoCondo > 0 ? `Condominio: ${d.trasladoCondo}<br>` : ""}
<br>
` : ""}

${(
d.utp5>0 ||
d.utp5Mesh1>0 ||
d.utp5Mesh2>0 ||
d.utp6Mesh2>0 ||
d.mesh>0 ||
d.ont>0
) ? `
<b>POSTVENTA</b><br>

${d.utp5>0 ? `UTP5: ${d.utp5}<br>` : ""}
${d.utp5Mesh1>0 ? `UTP5 + Mesh1: ${d.utp5Mesh1}<br>` : ""}
${d.utp5Mesh2>0 ? `UTP5 + Mesh2: ${d.utp5Mesh2}<br>` : ""}
${d.utp6Mesh2>0 ? `UTP6 + Mesh2: ${d.utp6Mesh2}<br>` : ""}
${d.mesh>0 ? `Mesh: ${d.mesh}<br>` : ""}
${d.ont>0 ? `ONT: ${d.ont}<br>` : ""}

<br>
` : ""}

            <br>

            <b>Total Día: ${totalDia}</b>

        </div>
    `;

});

    resultado += `
    <div style="
        padding:10px;
        margin:6px;
        background:#1b2a41;
        border-radius:8px;
        color:white;
    ">

        <h3 style="margin:0;color:#FFD700;">
🏆 ${indice + 1}°
</h3>

<b>${cuadrilla}</b><br><br>

${info.ultimaMilla > 0 ? `
<b>ÚLTIMA MILLA</b><br>
${info.ultimaMilla}<br><br>
` : ""}

${(info.instRes > 0 || info.instCondo > 0) ? `
<b>INSTALACIONES</b><br>
${info.instRes > 0 ? `Residencial: ${info.instRes}<br>` : ""}
${info.instCondo > 0 ? `Condominio: ${info.instCondo}<br>` : ""}
<br>
` : ""}

${(info.trasladoRes > 0 || info.trasladoCondo > 0) ? `
<b>TRASLADOS</b><br>
${info.trasladoRes > 0 ? `Residencial: ${info.trasladoRes}<br>` : ""}
${info.trasladoCondo > 0 ? `Condominio: ${info.trasladoCondo}<br>` : ""}
<br>
` : ""}

${(
info.utp5>0 ||
info.utp5Mesh1>0 ||
info.utp5Mesh2>0 ||
info.utp6Mesh2>0 ||
info.mesh>0 ||
info.ont>0
) ? `
<b>POSTVENTA</b><br>

${info.utp5>0 ? `UTP5: ${info.utp5}<br>` : ""}
${info.utp5Mesh1>0 ? `UTP5 + Mesh1: ${info.utp5Mesh1}<br>` : ""}
${info.utp5Mesh2>0 ? `UTP5 + Mesh2: ${info.utp5Mesh2}<br>` : ""}
${info.utp6Mesh2>0 ? `UTP6 + Mesh2: ${info.utp6Mesh2}<br>` : ""}
${info.mesh>0 ? `Mesh: ${info.mesh}<br>` : ""}
${info.ont>0 ? `ONT: ${info.ont}<br>` : ""}

` : ""}

<hr>

<b>Producción: ${total}</b>

<br>

⭐ <b>Puntos:</b>

<span style="color:${colorPuntos};font-weight:bold;">
${puntos.toFixed(1)} / 130
</span>

<br>

<span style="color:${colorPuntos};font-size:13px;font-weight:bold;">
${estadoPuntos}
</span>

<br><br>

<button
onclick="toggleDetalle('puntos_${cuadrilla.replace(/\s+/g,'_')}', this)"
style="
width:100%;
padding:6px;
margin-top:8px;
background:#27496d;
color:white;
border:none;
border-radius:6px;
cursor:pointer;
font-weight:bold;
">

⭐ Ver detalle de puntos

</button>

${detallePuntos}

<div style="
width:100%;
height:12px;
background:#3b4c63;
border-radius:10px;
overflow:hidden;
">

<div style="
width:${(total/maxProduccion)*100}%;
height:100%;
background:linear-gradient(90deg,#2ecc71,#00d2ff);
border-radius:10px;
transition:0.8s;
">
</div>

</div>

        <br><br>

${(() => {

    const ef = efectividadCuadrillas[cuadrilla] || 0;

    let color = "#e74c3c"; // Rojo

    if(ef >= 70){
        color = "#2ecc71"; // Verde
    }
    else if(ef >= 50){
        color = "#f1c40f"; // Amarillo
    }

return `
    <b>Efectividad:</b>
    <span style="color:${color};font-weight:bold;">
        ${ef.toFixed(2)}%
    </span>

    <br><br>
`;

})()}

${(() => {

    const rec = recableadoCuadrillas[cuadrilla] || 0;

    let color = "#2ecc71"; // Verde

    if(rec >= 60){
        color = "#e74c3c"; // Rojo
    }
    else if(rec >= 50){
        color = "#e67e22"; // Naranja
    }
    else if(rec >= 40){
        color = "#f1c40f"; // Amarillo
    }

    return `
        <b>Recableado:</b>
        <span style="color:${color};font-weight:bold;">
            ${rec.toFixed(2)}%
        </span>
    `;

})()}

<br><br>

${(() => {

    const vtr = vtrCuadrillas[cuadrilla] || 0;

    let color = "#2ecc71"; // Verde

    if(vtr >= 5){
        color = "#e74c3c"; // Rojo
    }
    else if(vtr > 2){
        color = "#e67e22"; // Naranja
    }
    else if(vtr > 0){
        color = "#f1c40f"; // Amarillo
    }

    return `
        <b>VTR/GAR:</b>
        <span style="color:${color};font-weight:bold;">
            ${vtr.toFixed(2)}%
        </span>
    `;

})()}

<div style="
width:100%;
height:14px;
background:#3b4c63;
border-radius:10px;
margin-top:8px;
overflow:hidden;
">

<div style="
width:${(total/maxProduccion)*100}%;
height:100%;
background:#27ae60;
">
</div>

</div>

<hr>

<button
id="btn_${cuadrilla.replace(/\s+/g,'_')}"
onclick="toggleDetalle('detalle_${cuadrilla.replace(/\s+/g,'_')}', this)"
style="
width:100%;
padding:8px;
background:#1f3b5c;
color:white;
border:none;
border-radius:6px;
cursor:pointer;
font-weight:bold;
margin-top:8px;
">
▼ Ver detalle
</button>

<div
id="detalle_${cuadrilla.replace(/\s+/g,'_')}"
style="display:none;margin-top:10px;">

${detalleDias}

</div>

</div>
`;

});

document.getElementById("tablaDashboard").innerHTML = resultado;

console.log("TOTAL GENERAL:", totalProduccionGeneral);


const promedioProduccion = totalCuadrillas > 0
    ? (totalProduccionGeneral / totalCuadrillas).toFixed(1)
    : "0";

const metaPuntos = totalCuadrillas * 130;

const porcentajePuntos =
metaPuntos > 0
? ((totalPuntosGeneral / metaPuntos) * 100).toFixed(0)
: 0;

document.getElementById("periodoResumen").textContent =
    "Periodo: " + periodoActual;

let colorPuntaje = "#e74c3c"; // Rojo

if (porcentajePuntos >= 90) {
    colorPuntaje = "#2ecc71"; // Verde
}
else if (porcentajePuntos >= 75) {
    colorPuntaje = "#f1c40f"; // Amarillo
}

// RECABLEADO
let colorRecableado = "#e74c3c";

const recableadoGeneral =
(sumaRecableado / totalCuadrillas);

if (recableadoGeneral <= 40) {
    colorRecableado = "#2ecc71";
}
else if (recableadoGeneral <= 55) {
    colorRecableado = "#f1c40f";
}

// EFECTIVIDAD
let colorEfectividad = "#e74c3c";

const efectividadGeneral =
(sumaEfectividad / totalCuadrillas);

if (efectividadGeneral >= 80) {
    colorEfectividad = "#2ecc71";
}
else if (efectividadGeneral >= 70) {
    colorEfectividad = "#f1c40f";
}

// VTR / GAR
let colorVTR = "#e74c3c";

const vtrGeneral =
(sumaVtr / totalCuadrillas);

if (vtrGeneral <= 5) {
    colorVTR = "#2ecc71";
}
else if (vtrGeneral <= 7) {
    colorVTR = "#f1c40f";
}

document.getElementById("textoResumen").innerHTML = `


<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
gap:12px;
margin-top:15px;
">

<div style="background:#223354;padding:15px;border-radius:10px;">
<div style="font-size:13px;color:#9fb7d8;">Producción</div>
<div style="font-size:28px;font-weight:bold;">${totalProduccionGeneral}</div>
</div>

<div style="background:#223354;padding:15px;border-radius:10px;">
<div style="font-size:13px;color:#9fb7d8;">Cuadrillas</div>
<div style="font-size:28px;font-weight:bold;">${totalCuadrillas}</div>
</div>

<div style="background:#223354;padding:15px;border-radius:10px;">
    <div style="font-size:13px;color:#9fb7d8;">⭐ Puntaje</div>
    <div style="font-size:24px;font-weight:bold;">
        ${totalPuntosGeneral.toFixed(0)} / ${metaPuntos}
    </div>

    <div style="
        font-size:15px;
        color:${colorPuntaje};
        margin-top:5px;
    ">
        ${porcentajePuntos}%
    </div>

    <div style="
        width:100%;
        height:10px;
        background:#1b2d4a;
        border-radius:10px;
        overflow:hidden;
        margin-top:8px;
    ">
        <div style="
            width:${porcentajePuntos}%;
            height:100%;
            background:${colorPuntaje};
        "></div>
    </div>
</div>

<div style="background:#223354;padding:15px;border-radius:10px;">
    <div style="font-size:13px;color:#9fb7d8;">📈 Efectividad</div>
    <div style="font-size:28px;font-weight:bold;color:${colorEfectividad};">
        ${(sumaEfectividad/totalCuadrillas).toFixed(2)}%
    </div>
</div>

<div style="background:#223354;padding:15px;border-radius:10px;">
    <div style="font-size:13px;color:#9fb7d8;">🔁 Recableado</div>
    <div style="font-size:28px;font-weight:bold;color:${colorRecableado};">
        ${(sumaRecableado/totalCuadrillas).toFixed(2)}%
    </div>
</div>

<div style="background:#223354;padding:15px;border-radius:10px;">
    <div style="font-size:13px;color:#9fb7d8;">📡 VTR / GAR</div>
    <div style="font-size:28px;font-weight:bold;color:${colorVTR};">
        ${(sumaVtr/totalCuadrillas).toFixed(2)}%
    </div>
</div>

</div>
`;

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

<div class="card" onclick="mostrarImportarEfectividad()" style="cursor:pointer;">
📊 ACTUALIZAR EFECTIVIDAD
<br><small>Importar efectividad desde base pegada</small>
</div>

        <br>

        <div class="card" onclick="mostrarImportarRecableado()" style="cursor:pointer;">
        🔁 ACTUALIZAR % RECABLEADO
        <br><small>Importar recableado desde base pegada</small>
        </div>

        <br>

        <div class="card" onclick="mostrarImportarVtrGar()" style="cursor:pointer;">
        🛡️ ACTUALIZAR VTR/GAR
        <br><small>Importar VTR/GAR desde base pegada</small>
        </div>

        <br>

        <div class="card" onclick="mostrarImportarUsuarios()" style="cursor:pointer;">
        👥 ACTUALIZAR USUARIOS
        <br><small>Importar, editar, suspender y cambiar permisos</small>
        </div>

        <br>

        <div class="card" onclick="mostrarImportarRanking()" style="cursor:pointer;">
        🏆 ACTUALIZAR RANKING
        <br><small>Generar ranking desde Producción, Efectividad, Recableado y VTR/GAR</small>
        </div>

        <br><br>

        <button
        class="button_1"
        onclick="volverInicio()">

        ⬅️ Volver al menú

        </button>

    </div>

    `;

    mostrarPantalla(html);

}

/* =====================================================
   MI VISUAL v4.0 - DASHBOARDS METAS Y PRODUCCIÓN TELCO
   Overrides finales para diseño móvil corporativo
===================================================== */

const META_PRODUCCION_CUADRILLA = 130;
const META_EFECTIVIDAD = 70;
const META_RECABLEADO = 42;
const META_VTRGAR = 3;
const META_OBSERVACIONES = 200;
const URL_RANKING_MI_VISUAL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1269910675&single=true&output=csv";

function mv4Num(valor){
    const n = Number((valor || "").toString().replace("%", "").replace("S/", "").replace(/,/g, ".").replace(/\s/g, ""));
    return isNaN(n) ? 0 : n;
}
function mv4Pct(valor){
    const n = mv4Num(valor);
    return n <= 1 ? n * 100 : n;
}
function mv4Money(n){ return "S/ " + (Number(n) || 0).toFixed(2); }
function mv4Per(n){ return (Number(n) || 0).toFixed(2) + "%"; }
function mv4Norm(txt){
    return (txt || "").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function mv4CSV(texto){
    if(typeof parseCSVRanking === "function") return parseCSVRanking(texto);
    return texto.trim().split(/\r?\n/).map(l => l.split(",").map(x => x.replace(/^"|"$/g, "").trim()));
}
function mv4FilaRanking(datos){
    if(typeof filaRanking === "function") return filaRanking(datos);
    return {
        id: datos[0] || "",
        cuadrilla: datos[1] || "",
        actualizacion: datos[2] || "",
        usuario: datos[3] || "",
        sede: mv4Norm(datos[4] || ""),
        plataforma: mv4Norm(datos[5] || ""),
        produccion: mv4Num(datos[6]),
        efectividad: mv4Pct(datos[7]),
        recableado: mv4Pct(datos[8]),
        vtrgar: mv4Pct(datos[9]),
        observaciones: mv4Num(datos[10]),
        montoTotalObs: mv4Num(datos[11]),
        montoAfectadoObs: mv4Num(datos[12]),
        puntaje: mv4Num(datos[13]),
        puestoSede: Number(datos[14]) || 0,
        puestoRegion: Number(datos[15]) || 0,
        puestoPlataforma: Number(datos[16]) || 0
    };
}

/* =====================================================
   MI VISUAL v58 - Detalle analítico por cuadrilla
   Supervisor/Jefatura: acordeón por KPI con detalle operativo
===================================================== */
const MV58_URL_PRODUCCION = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1814992325&single=true&output=csv";
const MV58_URL_CATALOGO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=2013842388&single=true&output=csv";
const MV58_URL_EFECTIVIDAD = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1731471693&single=true&output=csv";
const MV58_URL_RECABLEADO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=317412212&single=true&output=csv";
const MV58_URL_VTRGAR = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1778246699&single=true&output=csv";
const MV58_API = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

function mv58Key(txt){ return mv4Norm(txt).replace(/^P\s+(\d+)/, "P$1"); }
function mv58IdSeguro(txt){ return mv58Key(txt).replace(/[^A-Z0-9]+/g, "_"); }
function mv58Filas(texto){ return mv4CSV(texto || "").filter(r => r.some(c => (c || "").toString().trim() !== "")); }
async function mv58GetCSV(url){
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
    return mv58Filas(await r.text());
}
function mv58Valor(n){ return Number(n || 0).toFixed(1).replace(".0", ""); }
function mv58KpiMini(titulo, valor){
    return `<div style="background:#0f1f35;border-radius:12px;padding:10px;min-height:58px;"><div style="font-size:11px;color:#9fb7d8;font-weight:800;text-transform:uppercase;">${titulo}</div><div style="font-size:20px;font-weight:900;margin-top:4px;">${valor}</div></div>`;
}
function mv58EstadoProduccion(v){
    const p = Number(v) || 0;
    if(p >= META_PRODUCCION_CUADRILLA) return {txt:"🟢 Meta cumplida", color:"#22c55e"};
    if(p >= META_PRODUCCION_CUADRILLA * 0.8) return {txt:"🟡 En avance", color:"#facc15"};
    return {txt:"🔴 Bajo meta", color:"#ef4444"};
}
function mv58EstadoMayor(v, meta){
    const n = Number(v) || 0;
    if(n >= meta) return {txt:"🟢 Conforme", color:"#22c55e"};
    if(n >= meta * 0.9) return {txt:"🟡 Cerca", color:"#facc15"};
    return {txt:"🔴 Bajo", color:"#ef4444"};
}
function mv58EstadoMenor(v, meta){
    const n = Number(v) || 0;
    if(n <= meta) return {txt:"🟢 Conforme", color:"#22c55e"};
    if(n <= meta * 1.25) return {txt:"🟡 Atento", color:"#facc15"};
    return {txt:"🔴 Crítico", color:"#ef4444"};
}
async function mv58EnriquecerRanking(lista){
    try{
        const [prod, cat, ef, rec, vtr] = await Promise.all([
            mv58GetCSV(MV58_URL_PRODUCCION),
            mv58GetCSV(MV58_URL_CATALOGO),
            mv58GetCSV(MV58_URL_EFECTIVIDAD),
            mv58GetCSV(MV58_URL_RECABLEADO),
            mv58GetCSV(MV58_URL_VTRGAR)
        ]);

        const catalogo = {};
        cat.slice(1).forEach(r => {
            const codigo = (r[0] || "").toString().trim();
            if(!codigo) return;
            catalogo[codigo] = { tipo:r[1] || codigo, plataforma:r[2] || "", puntaje:mv4Num(r[3]), grupo:r[4] || "OTROS" };
        });

        const prodMap = {};
        prod.slice(1).forEach(r => {
            const cuadrilla = mv58Key(r[1]);
            if(!cuadrilla) return;
            const codigo = (r[3] || "").toString().trim();
            const cantidad = mv4Num(r[4]);
            const c = catalogo[codigo] || { tipo: codigo || "Trabajo registrado", puntaje: 1, grupo:"OTROS" };
            const puntos = cantidad * (Number(c.puntaje) || 0);
            if(!prodMap[cuadrilla]) prodMap[cuadrilla] = { totalOrdenes:0, totalPuntos:0, grupos:{}, tipos:{}, fechas:{} };
            const m = prodMap[cuadrilla];
            m.totalOrdenes += cantidad;
            m.totalPuntos += puntos;
            const grupo = c.grupo || "OTROS";
            if(!m.grupos[grupo]) m.grupos[grupo] = { cantidad:0, puntos:0 };
            m.grupos[grupo].cantidad += cantidad; m.grupos[grupo].puntos += puntos;
            const tipo = c.tipo || codigo || "Trabajo registrado";
            if(!m.tipos[tipo]) m.tipos[tipo] = { cantidad:0, puntos:0, puntaje:c.puntaje || 0 };
            m.tipos[tipo].cantidad += cantidad; m.tipos[tipo].puntos += puntos;
            const fecha = r[2] || "SIN FECHA";
            if(!m.fechas[fecha]) m.fechas[fecha] = { cantidad:0, puntos:0 };
            m.fechas[fecha].cantidad += cantidad; m.fechas[fecha].puntos += puntos;
        });

        const efMap = {};
        ef.slice(1).forEach(r => {
            const cuadrilla = mv58Key(r[2]); if(!cuadrilla) return;
            efMap[cuadrilla] = {
                finalizadas:mv4Num(r[4]), canceladas:mv4Num(r[5]), regestion:mv4Num(r[6]), reprogramadas:mv4Num(r[7]), total:mv4Num(r[8]), efectividad:mv4Pct(r[9])
            };
        });

        const recMap = {};
        rec.slice(1).forEach(r => {
            const cuadrilla = mv58Key(r[2]); if(!cuadrilla) return;
            recMap[cuadrilla] = { los:mv4Num(r[4]), recableados:mv4Num(r[5]), porcentaje:mv4Pct(r[6]) };
        });

        const vtrMap = {};
        vtr.slice(1).forEach(r => {
            const cuadrilla = mv58Key(r[2]); if(!cuadrilla) return;
            vtrMap[cuadrilla] = { finalizadas:mv4Num(r[4]), gar:mv4Num(r[5]), vtr:mv4Num(r[6]), total:mv4Num(r[7]), porcentaje:mv4Pct(r[8]) };
        });

        const obsMap = await mv58ObtenerObservacionesMap();

        lista.forEach(x => {
            const k = mv58Key(x.cuadrilla);
            x.detProduccion = prodMap[k] || { totalOrdenes:0, totalPuntos:Number(x.produccion)||0, grupos:{}, tipos:{}, fechas:{} };
            x.detEfectividad = efMap[k] || { finalizadas:0, canceladas:0, regestion:0, reprogramadas:0, total:0, efectividad:Number(x.efectividad)||0 };
            x.detRecableado = recMap[k] || { los:0, recableados:0, porcentaje:Number(x.recableado)||0 };
            x.detVtrGar = vtrMap[k] || { finalizadas:0, gar:0, vtr:0, total:0, porcentaje:Number(x.vtrgar)||0 };
            x.detObservaciones = obsMap[k] || { total: Number(x.observaciones)||0, pendientes:0, montoTotal:Number(x.montoTotalObs)||0, montoPendiente:Number(x.montoAfectadoObs)||0, estados:{} };
        });
    }catch(e){
        console.warn("v58 detalle no disponible", e);
    }
    return lista;
}
async function mv58ObtenerObservacionesMap(){
    const mapa = {};
    try{
        const usuario = localStorage.getItem("usuario") || "";
        const res = await fetch(MV58_API, { method:"POST", body:JSON.stringify({accion:"listarObservaciones", usuario}) });
        const data = await res.json();
        const lista = data.observaciones || [];
        const pendientes = ["DERIVADO", "EN PROCESO", "PENALIZADO", "APELADO"];
        lista.forEach(o => {
            const k = mv58Key(o.cuadrilla); if(!k) return;
            if(!mapa[k]) mapa[k] = { total:0, pendientes:0, montoTotal:0, montoPendiente:0, estados:{} };
            const estado = mv4Norm(o.estado || "SIN ESTADO");
            const monto = Number(o.monto) || 0;
            mapa[k].total++;
            mapa[k].montoTotal += monto;
            mapa[k].estados[estado] = (mapa[k].estados[estado] || 0) + 1;
            if(pendientes.includes(estado)){ mapa[k].pendientes++; mapa[k].montoPendiente += monto; }
        });
    }catch(e){ console.warn("No se pudo obtener observaciones v58", e); }
    return mapa;
}
function mv58CuadrillaAnalitica(x, tipo, puesto){
    const id = `v58_${tipo}_${puesto}_${mv58IdSeguro(x.cuadrilla)}`;
    const cab = mv58CabeceraCuadrilla(x, tipo, puesto);
    const detalle = mv58DetalleCuadrilla(x, tipo);
    return `
    <div class="mv58-cuadrilla-card" style="background:#142844;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;margin:10px 0;color:white;">
        ${cab}
        <button class="mv4-link-btn" onclick="toggleDetalle('${id}', this)">▼ Ver detalle</button>
        <div id="${id}" style="display:none;margin-top:10px;">${detalle}</div>
    </div>`;
}
function mv58CabeceraCuadrilla(x, tipo, puesto){
    let valor = ""; let estado = {txt:"", color:"#9fb7d8"};
    if(tipo === "produccion"){ valor = `${mv58Valor(x.produccion)} / ${META_PRODUCCION_CUADRILLA} pts`; estado = mv58EstadoProduccion(x.produccion); }
    if(tipo === "efectividad"){ valor = mv4Per(x.efectividad); estado = mv58EstadoMayor(x.efectividad, META_EFECTIVIDAD); }
    if(tipo === "recableado"){ valor = mv4Per(x.recableado); estado = mv58EstadoMenor(x.recableado, META_RECABLEADO); }
    if(tipo === "vtrgar"){ valor = mv4Per(x.vtrgar); estado = mv58EstadoMenor(x.vtrgar, META_VTRGAR); }
    if(tipo === "obs"){ valor = mv4Money(x.montoAfectadoObs); estado = mv58EstadoMenor(x.montoAfectadoObs, META_OBSERVACIONES); }
    return `
        <div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;">
            <div style="min-width:0;">
                <div style="font-size:12px;color:#facc15;font-weight:900;">${puesto}°</div>
                <div style="font-size:14px;font-weight:900;line-height:1.25;">${x.cuadrilla}</div>
                <div style="font-size:18px;font-weight:900;margin-top:6px;">${valor}</div>
            </div>
            <div style="white-space:nowrap;color:${estado.color};font-weight:900;font-size:12px;">${estado.txt}</div>
        </div>`;
}
function mv58DetalleCuadrilla(x, tipo){
    if(tipo === "produccion") return mv58DetalleProduccion(x.detProduccion || {});
    if(tipo === "efectividad") return mv58DetalleEfectividad(x.detEfectividad || {});
    if(tipo === "recableado") return mv58DetalleRecableado(x.detRecableado || {});
    if(tipo === "vtrgar") return mv58DetalleVtrGar(x.detVtrGar || {});
    if(tipo === "obs") return mv58DetalleObs(x.detObservaciones || {});
    return "";
}
function mv58DetalleProduccion(d){
    const grupos = d.grupos || {}; const tipos = d.tipos || {};
    const grupoNombre = {ULTIMA_MILLA:"Última Milla", INSTALACION:"Instalaciones", RECABLEADO_VT:"Recableado VT", RECABLEADO_POST:"Recableado Post", TRASLADO:"Traslados", OTROS:"Otros"};
    let html = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">${mv58KpiMini("Órdenes", mv58Valor(d.totalOrdenes))}${mv58KpiMini("Puntos", mv58Valor(d.totalPuntos))}</div>`;
    html += `<div style="margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">`;
    Object.keys(grupos).sort().forEach(g => html += mv58KpiMini(grupoNombre[g] || g, `${mv58Valor(grupos[g].cantidad)} / ${mv58Valor(grupos[g].puntos)} pts`));
    html += `</div><div style="margin-top:12px;font-weight:900;color:#9fb7d8;">Detalle</div>`;
    Object.keys(tipos).sort((a,b)=>tipos[b].puntos-tipos[a].puntos).forEach(t => {
        const it = tipos[t];
        html += `<div style="background:#0f1f35;border-radius:10px;padding:9px;margin-top:7px;"><div style="font-size:12px;font-weight:800;">${t}</div><div style="font-size:12px;color:#9fb7d8;">${mv58Valor(it.cantidad)} órdenes × ${mv58Valor(it.puntaje)} = <b>${mv58Valor(it.puntos)} pts</b></div></div>`;
    });
    return html;
}
function mv58DetalleEfectividad(d){
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${mv58KpiMini("Finalizadas", mv58Valor(d.finalizadas))}${mv58KpiMini("Canceladas", mv58Valor(d.canceladas))}
        ${mv58KpiMini("Reprogramadas", mv58Valor(d.reprogramadas))}${mv58KpiMini("Regestión", mv58Valor(d.regestion))}
        ${mv58KpiMini("Total", mv58Valor(d.total))}${mv58KpiMini("Efectividad", mv4Per(d.efectividad || 0))}
    </div>`;
}
function mv58DetalleRecableado(d){
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${mv58KpiMini("LOS rojo", mv58Valor(d.los))}${mv58KpiMini("Recableados", mv58Valor(d.recableados))}
        ${mv58KpiMini("% Recableado", mv4Per(d.porcentaje || 0))}${mv58KpiMini("Semáforo", mv58EstadoMenor(d.porcentaje || 0, META_RECABLEADO).txt)}
    </div>`;
}
function mv58DetalleVtrGar(d){
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${mv58KpiMini("Finalizadas", mv58Valor(d.finalizadas))}${mv58KpiMini("GAR", mv58Valor(d.gar))}
        ${mv58KpiMini("VTR", mv58Valor(d.vtr))}${mv58KpiMini("Total", mv58Valor(d.total))}
        ${mv58KpiMini("% VTR/GAR", mv4Per(d.porcentaje || 0))}${mv58KpiMini("Semáforo", mv58EstadoMenor(d.porcentaje || 0, META_VTRGAR).txt)}
    </div>`;
}
function mv58DetalleObs(d){
    const e = d.estados || {};
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${mv58KpiMini("Pendientes", mv58Valor(d.pendientes))}${mv58KpiMini("Monto pendiente", mv4Money(d.montoPendiente || 0))}
        ${mv58KpiMini("Derivadas", mv58Valor(e.DERIVADO))}${mv58KpiMini("En proceso", mv58Valor(e["EN PROCESO"]))}
        ${mv58KpiMini("Penalizadas", mv58Valor(e.PENALIZADO))}${mv58KpiMini("Apeladas", mv58Valor(e.APELADO))}
        ${mv58KpiMini("Subsanadas", mv58Valor(e.SUBSANADO))}${mv58KpiMini("Anuladas", mv58Valor(e.ANULADO))}
        ${mv58KpiMini("Total obs.", mv58Valor(d.total))}${mv58KpiMini("Monto total", mv4Money(d.montoTotal || 0))}
    </div>`;
}

async function mv4ObtenerRanking(){
    const res = await fetch(URL_RANKING_MI_VISUAL + "&t=" + Date.now());
    const texto = await res.text();
    const lista = mv4CSV(texto).slice(1).map(mv4FilaRanking).filter(x => x.cuadrilla);
    return await mv58EnriquecerRanking(lista);
}
function mv4Estado(tipo, valor, meta){
    const v = Number(valor) || 0;
    if(tipo === "mayor") return v >= meta ? "🟢" : "🔴";
    if(tipo === "menor") return v <= meta ? "🟢" : "🔴";
    return "🔴";
}
function mv4Prom(lista, campo){
    if(!lista.length) return 0;
    return lista.reduce((s,x)=>s+(Number(x[campo])||0),0) / lista.length;
}
function mv4Resumen(lista){
    const cuadrillas = lista.length;
    const produccion = lista.reduce((s,x)=>s+(Number(x.produccion)||0),0);
    const metaProduccion = cuadrillas * META_PRODUCCION_CUADRILLA;
    const efectividad = mv4Prom(lista, "efectividad");
    const recableado = mv4Prom(lista, "recableado");
    const vtrgar = mv4Prom(lista, "vtrgar");
    const obs = lista.reduce((s,x)=>s+(Number(x.montoAfectadoObs)||0),0);
    const ok = [
        produccion >= metaProduccion,
        efectividad >= META_EFECTIVIDAD,
        recableado <= META_RECABLEADO,
        vtrgar <= META_VTRGAR,
        obs <= META_OBSERVACIONES
    ].filter(Boolean).length;
    return { cuadrillas, produccion, metaProduccion, efectividad, recableado, vtrgar, obs, ok, cumplimiento: ok * 20 };
}
function mv4KpiCard({icono,titulo,valor,meta,estado,detalle}){
    const id = "kpi_" + Math.random().toString(36).slice(2);
    return `
    <div class="mv4-kpi-card">
        <div class="mv4-kpi-head">
            <div><span>${icono}</span> <b>${titulo}</b></div>
            <div class="mv4-kpi-status">${estado}</div>
        </div>
        <div class="mv4-kpi-value">${valor}</div>
        <div class="mv4-kpi-meta">Meta: ${meta}</div>
        <button class="mv4-link-btn" onclick="toggleDetalle('${id}', this)">▼ Ver cuadrillas</button>
        <div id="${id}" class="mv4-kpi-detail" style="display:none;">${detalle}</div>
    </div>`;
}
function mv4LineaCuadrilla(nombre, valor, meta, estado){
    return `
    <div class="mv4-linea-cuadrilla">
        <div class="mv4-linea-nombre">${nombre}</div>
        <div class="mv4-linea-valores">
            <span>${valor}</span>
            <small>${meta}</small>
            <b>${estado}</b>
        </div>
    </div>`;
}
function mv4DetalleKpi(lista, tipo){
    const ordenada = lista.slice().sort((a,b)=>{
        if(tipo === "produccion") return (Number(b.produccion)||0) - (Number(a.produccion)||0);
        if(tipo === "efectividad") return (Number(b.efectividad)||0) - (Number(a.efectividad)||0);
        if(tipo === "recableado") return (Number(a.recableado)||0) - (Number(b.recableado)||0);
        if(tipo === "vtrgar") return (Number(a.vtrgar)||0) - (Number(b.vtrgar)||0);
        if(tipo === "obs") return (Number(b.montoAfectadoObs)||0) - (Number(a.montoAfectadoObs)||0);
        return (a.cuadrilla || "").localeCompare(b.cuadrilla || "");
    });

    return ordenada.map((x, i) => mv58CuadrillaAnalitica(x, tipo, i + 1)).join("");
}
function mv4DashboardKpis(lista){
    const r = mv4Resumen(lista);
    const produccionPct = r.metaProduccion > 0 ? (r.produccion / r.metaProduccion * 100) : 0;
    return `
        <div class="mv4-general-card">
            <div class="mv4-general-title">📋 CUMPLIMIENTO GENERAL</div>
            <div class="mv4-general-value">${r.cumplimiento}%</div>
            <div class="mv4-progress"><span style="width:${r.cumplimiento}%"></span></div>
            <div class="mv4-general-sub">${r.ok} de 5 metas cumplidas</div>
        </div>
        ${mv4KpiCard({icono:"📈",titulo:"Producción",valor:`${r.produccion.toFixed(1)} / ${r.metaProduccion} pts`,meta:`${META_PRODUCCION_CUADRILLA} pts x ${r.cuadrillas} cuadrillas`,estado:mv4Estado("mayor", r.produccion, r.metaProduccion),detalle:mv4DetalleKpi(lista,"produccion")})}
        ${mv4KpiCard({icono:"🎯",titulo:"Efectividad",valor:mv4Per(r.efectividad),meta:`≥ ${META_EFECTIVIDAD}%`,estado:mv4Estado("mayor", r.efectividad, META_EFECTIVIDAD),detalle:mv4DetalleKpi(lista,"efectividad")})}
        ${mv4KpiCard({icono:"🔧",titulo:"Recableado",valor:mv4Per(r.recableado),meta:`≤ ${META_RECABLEADO}%`,estado:mv4Estado("menor", r.recableado, META_RECABLEADO),detalle:mv4DetalleKpi(lista,"recableado")})}
        ${mv4KpiCard({icono:"📡",titulo:"VTR / GAR",valor:mv4Per(r.vtrgar),meta:`≤ ${META_VTRGAR}%`,estado:mv4Estado("menor", r.vtrgar, META_VTRGAR),detalle:mv4DetalleKpi(lista,"vtrgar")})}
        ${mv4KpiCard({icono:"🚨",titulo:"Observaciones",valor:mv4Money(r.obs),meta:`≤ S/ ${META_OBSERVACIONES}`,estado:mv4Estado("menor", r.obs, META_OBSERVACIONES),detalle:mv4DetalleKpi(lista,"obs")})}
    `;
}

function mv59PeriodoProduccion(detalle){
    const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    let fechaMax = null;
    (detalle || []).forEach(r => {
        const texto = (r.fecha || "").toString().trim();
        const p = texto.split("/");
        if(p.length === 3){
            const f = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
            if(!isNaN(f.getTime()) && (!fechaMax || f > fechaMax)) fechaMax = f;
        }
    });
    if(!fechaMax) return "PERÍODO ACTUAL";
    return `${meses[fechaMax.getMonth()]} ${fechaMax.getFullYear()}`;
}

function mv59GrupoProduccion(data, grupo){
    const lista = (data.detalle || []).filter(r => (r.grupo || "").toString().trim().toUpperCase() === grupo);
    const ordenes = lista.reduce((s, r) => s + numeroMiVisual(r.cantidad), 0);
    const puntos = lista.reduce((s, r) => s + (numeroMiVisual(r.cantidad) * numeroMiVisual(r.puntaje)), 0);
    return { ordenes, puntos };
}

function mv59PluralOrdenes(n){
    return Number(n) === 1 ? "orden" : "órdenes";
}

function mv59LineaResumen(icono, titulo, ordenes, puntos){
    return `
        <div class="mv59-prod-line">
            <div class="mv59-prod-name">${icono} ${titulo}</div>
            <div class="mv59-prod-value">${mv58Valor(ordenes)} ${mv59PluralOrdenes(ordenes)} • ${mv58Valor(puntos)} pts</div>
        </div>`;
}

function renderDashboardProduccion(data){
    const totalPuntos = Number(data.resumen.totalPuntos || 0);
    const totalOrdenes = Number(data.resumen.totalProduccion || 0);
    const mostrarBotonBonos = !(typeof mb242EsCuadrillaPDG === "function" && mb242EsCuadrillaPDG(localStorage.getItem("cuadrilla")));
    const meta = META_PRODUCCION_CUADRILLA;
    const periodo = mv59PeriodoProduccion(data.detalle || []);
    const avance = meta > 0 ? Math.min(100, Math.round((totalPuntos / meta) * 100)) : 0;
    const grupos = {
        instalaciones: mv59GrupoProduccion(data, "INSTALACION"),
        ultimaMilla: mv59GrupoProduccion(data, "ULTIMA_MILLA"),
        recableadoVT: mv59GrupoProduccion(data, "RECABLEADO_VT"),
        recableadoPost: mv59GrupoProduccion(data, "RECABLEADO_POST"),
        traslados: mv59GrupoProduccion(data, "TRASLADO"),
        cambioEquipo: mv59GrupoProduccion(data, "CAMBIO_EQUIPO"),
        entregaEquipo: mv59GrupoProduccion(data, "ENTREGA_EQUIPO"),
        pruebaServicio: mv59GrupoProduccion(data, "PRUEBA_SERVICIO"),
        otros: mv59GrupoProduccion(data, "OTROS")
    };

    let html = `
    <div class="mv4-page mv59-produccion-page">
        <div class="mv243-produccion-head">
            <h2 class="mv4-title">📊 MI PRODUCCIÓN</h2>
            ${mostrarBotonBonos ? `<button type="button" class="mb242-btn-produccion mv243-btn-bonos" onclick="mostrarBonos()">🎁 BONOS</button>` : ""}
        </div>
        <div class="mv4-hero-card mv59-prod-hero">
            <div class="mv4-hero-label">MI PUNTAJE DEL PERÍODO</div>
            <div class="mv4-hero-value">${totalPuntos.toFixed(1)}</div>
            <div class="mv4-hero-meta">📅 ${periodo}</div>
            <div class="mv4-hero-meta">🎯 Meta: ${meta} pts</div>
            <div class="mv4-hero-meta">📦 Total órdenes: ${mv58Valor(totalOrdenes)}</div>
            <div class="mv4-progress mv59-prod-progress"><span style="width:${avance}%"></span></div>
            <div class="mv59-prod-percent">${avance}% de avance</div>
        </div>

        <div class="mv59-prod-summary">
            ${mv59LineaResumen("🏠", "Instalaciones", grupos.instalaciones.ordenes, grupos.instalaciones.puntos)}
            ${mv59LineaResumen("🔧", "Última Milla", grupos.ultimaMilla.ordenes, grupos.ultimaMilla.puntos)}
            ${mv59LineaResumen("📡", "Recableado VT", grupos.recableadoVT.ordenes, grupos.recableadoVT.puntos)}
            ${mv59LineaResumen("🔄", "Recableado Post", grupos.recableadoPost.ordenes, grupos.recableadoPost.puntos)}
            ${mv59LineaResumen("🚚", "Traslados", grupos.traslados.ordenes, grupos.traslados.puntos)}
            ${grupos.cambioEquipo.ordenes > 0 ? mv59LineaResumen("🧰", "Cambio de equipo", grupos.cambioEquipo.ordenes, grupos.cambioEquipo.puntos) : ""}
            ${grupos.entregaEquipo.ordenes > 0 ? mv59LineaResumen("📦", "Entrega de equipo", grupos.entregaEquipo.ordenes, grupos.entregaEquipo.puntos) : ""}
            ${grupos.pruebaServicio.ordenes > 0 ? mv59LineaResumen("🔎", "Prueba de servicio", grupos.pruebaServicio.ordenes, grupos.pruebaServicio.puntos) : ""}
            ${grupos.otros.ordenes > 0 ? mv59LineaResumen("📌", "Otros", grupos.otros.ordenes, grupos.otros.puntos) : ""}
        </div>`;

    if(!data.detalle || !data.detalle.length){
        html += `<div class="mv4-empty">No hay producción registrada para tu cuadrilla.</div><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
        mostrarPantalla(html); return;
    }

    html += `
        <button class="mv4-link-btn mv59-detail-btn" onclick="toggleDetalle('mv59_detalle_diario', this)">▼ Ver detalle</button>
        <div id="mv59_detalle_diario" class="mv4-kpi-detail" style="display:none;">`;

    const porDia = {};
    data.detalle.forEach(r => {
        const f = r.fecha || "SIN FECHA";
        if(!porDia[f]) porDia[f] = { puntos:0, ordenes:0, items:[] };
        const pts = numeroMiVisual(r.puntaje) * numeroMiVisual(r.cantidad);
        porDia[f].puntos += pts;
        porDia[f].ordenes += numeroMiVisual(r.cantidad);
        porDia[f].items.push(r);
    });

    Object.keys(porDia).sort((a,b)=>b.split('/').reverse().join('').localeCompare(a.split('/').reverse().join(''))).forEach(fecha => {
        const d = porDia[fecha];
        const sem = d.puntos > 4.5 ? "🟢" : (d.puntos >= 4 ? "🟡" : "🔴");
        html += `<div class="mv4-day-card"><div class="mv4-day-head"><b>📅 ${fecha}</b><span>${sem} ${d.puntos.toFixed(1)} pts</span></div>`;
        d.items.forEach(r => {
            const cantidad = numeroMiVisual(r.cantidad);
            const pts = cantidad * numeroMiVisual(r.puntaje);
            html += `<div class="mv4-day-row"><span>${r.tipo || "Trabajo registrado"}</span><b>${mv58Valor(cantidad)} ${mv59PluralOrdenes(cantidad)} • ${mv58Valor(pts)} pts</b></div>`;
        });
        html += `</div>`;
    });
    html += `</div><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}

let MV198_DASH_SUPERVISOR_LISTA = [];
let MV198_DASH_JEFATURA_LISTA = [];

function mv198Escapar(valor){
    return (valor ?? "").toString()
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function mv198OpcionesCuadrilla(lista, seleccionada){
    const ordenada = (lista || []).slice().sort((a,b)=>(a.cuadrilla||"").localeCompare(b.cuadrilla||"", undefined, {numeric:true}));
    return `<option value="TODAS">TODAS LAS CUADRILLAS</option>` + ordenada.map(x => {
        const valor = mv198Escapar(x.cuadrilla || "");
        return `<option value="${valor}" ${x.cuadrilla===seleccionada?'selected':''}>${valor}</option>`;
    }).join("");
}

function mv198FiltroCuadrilla(lista, seleccionada, funcionCambio, etiqueta){
    return `<div class="mv198-filtro-cuadrilla">
        <label for="mv198FiltroCuadrilla"><b>🔎 ${etiqueta || 'Filtrar por cuadrilla'}</b></label>
        <select id="mv198FiltroCuadrilla" onchange="${funcionCambio}(this.value)">
            ${mv198OpcionesCuadrilla(lista, seleccionada)}
        </select>
    </div>`;
}

function mv198DetalleRanking(x){
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${mv58KpiMini("Puesto Zona Norte", x.puestoRegion ? `#${x.puestoRegion}` : "-")}
        ${mv58KpiMini("Puesto sede", x.puestoSede ? `#${x.puestoSede}` : "-")}
        ${mv58KpiMini("Puesto plataforma", x.puestoPlataforma ? `#${x.puestoPlataforma}` : "-")}
        ${mv58KpiMini("Puntaje ranking", Number(x.puntaje || 0).toFixed(2))}
    </div>`;
}

function mv198ResumenCuadrilla(x){
    if(!x) return `<div class="mv4-empty">No se encontró información de la cuadrilla seleccionada.</div>`;
    const r = mv4Resumen([x]);
    const id = "mv198_detalle_" + mv58IdSeguro(x.cuadrilla) + "_" + Math.random().toString(36).slice(2);
    const prodPct = META_PRODUCCION_CUADRILLA > 0 ? Math.round((Number(x.produccion||0)/META_PRODUCCION_CUADRILLA)*100) : 0;
    return `<div class="mv198-cuadrilla-seleccionada">
        <div class="mv4-top-card mv198-top-cuadrilla">
            <div class="mv4-top-role">📌 CUADRILLA SELECCIONADA</div>
            <div class="mv4-top-sede">${mv198Escapar(x.cuadrilla)}</div>
            <div class="mv4-top-sub">${mv198Escapar(x.sede)} · ${mv198Escapar(x.plataforma)} · Actualizado: ${mv198Escapar(x.actualizacion || '-')}</div>
        </div>
        <div class="mv4-general-card">
            <div class="mv4-general-title">📊 RESUMEN DE LA CUADRILLA</div>
            <div class="mv198-resumen-grid">
                ${mv591MiniResumenCard("📈","Producción",`${Number(x.produccion||0).toFixed(1)} pts`,`${prodPct}% de meta`,mv4Estado("mayor",x.produccion,META_PRODUCCION_CUADRILLA))}
                ${mv591MiniResumenCard("🎯","Efectividad",mv4Per(x.efectividad),`Meta ≥ ${META_EFECTIVIDAD}%`,mv4Estado("mayor",x.efectividad,META_EFECTIVIDAD))}
                ${mv591MiniResumenCard("🔧","Recableado",mv4Per(x.recableado),`Meta ≤ ${META_RECABLEADO}%`,mv4Estado("menor",x.recableado,META_RECABLEADO))}
                ${mv591MiniResumenCard("📡","VTR/GAR",mv4Per(x.vtrgar),`Meta ≤ ${META_VTRGAR}%`,mv4Estado("menor",x.vtrgar,META_VTRGAR))}
                ${mv591MiniResumenCard("🚨","Observaciones",mv4Money(x.montoAfectadoObs||0),`${Number(x.observaciones||0)} observaciones`,mv4Estado("menor",x.montoAfectadoObs,META_OBSERVACIONES))}
                ${mv591MiniResumenCard("🏆","Metas",`${r.ok} / 5`,`${r.cumplimiento}% cumplimiento`,r.cumplimiento>=80?"🟢":(r.cumplimiento>=60?"🟡":"🔴"))}
            </div>
            <button class="mv4-link-btn mv198-detalle-btn" onclick="toggleDetalle('${id}', this)">▼ Ver detalle completo</button>
            <div id="${id}" class="mv198-detalle-completo" style="display:none;">
                <div class="mv198-detalle-bloque"><h4>📈 Producción</h4>${mv58DetalleProduccion(x.detProduccion||{})}</div>
                <div class="mv198-detalle-bloque"><h4>🎯 Efectividad</h4>${mv58DetalleEfectividad(x.detEfectividad||{})}</div>
                <div class="mv198-detalle-bloque"><h4>🔧 Recableado</h4>${mv58DetalleRecableado(x.detRecableado||{})}</div>
                <div class="mv198-detalle-bloque"><h4>📡 VTR / GAR</h4>${mv58DetalleVtrGar(x.detVtrGar||{})}</div>
                <div class="mv198-detalle-bloque"><h4>🚨 Observaciones</h4>${mv58DetalleObs(x.detObservaciones||{})}</div>
                <div class="mv198-detalle-bloque"><h4>🏆 Ranking y posición</h4>${mv198DetalleRanking(x)}</div>
            </div>
        </div>
    </div>`;
}

/* =========================
   V239 - FILTRO POR INDICADOR EN DASHBOARD SUPERVISOR
========================= */

let MV239_DASH_SUPERVISOR_FILTROS = {
    indicador: "RESUMEN",
    cuadrilla: "TODAS"
};

function mv239FiltrosSupervisor(lista, filtros){
    return `<div class="mv199-filtros-jefatura mv239-filtros-supervisor">
        <div class="mv199-campo-filtro">
            <label for="mv239FiltroIndicadorSupervisor">📊 Indicador</label>
            <select id="mv239FiltroIndicadorSupervisor" onchange="mv239CambiarFiltroSupervisor('indicador',this.value)">
                ${mv199OpcionesIndicador(filtros.indicador)}
            </select>
        </div>
        <div class="mv199-campo-filtro">
            <label for="mv239FiltroCuadrillaSupervisor">🔎 Cuadrilla</label>
            <select id="mv239FiltroCuadrillaSupervisor" onchange="mv239CambiarFiltroSupervisor('cuadrilla',this.value)">
                ${mv198OpcionesCuadrilla(lista, filtros.cuadrilla)}
            </select>
        </div>
    </div>`;
}

function mv239CambiarFiltroSupervisor(campo, valor){
    if(!["indicador","cuadrilla"].includes(campo)) return;
    MV239_DASH_SUPERVISOR_FILTROS[campo] = valor || (campo === "indicador" ? "RESUMEN" : "TODAS");

    if(campo === "indicador" && valor !== "RESUMEN"){
        MV239_DASH_SUPERVISOR_FILTROS.cuadrilla = "TODAS";
    }

    if(campo === "cuadrilla" && valor !== "TODAS"){
        MV239_DASH_SUPERVISOR_FILTROS.indicador = "RESUMEN";
    }

    mv198RenderSupervisor();
}

function mv239AbrirCuadrillaSupervisor(cuadrilla){
    MV239_DASH_SUPERVISOR_FILTROS.cuadrilla = cuadrilla || "TODAS";
    MV239_DASH_SUPERVISOR_FILTROS.indicador = "RESUMEN";
    mv198RenderSupervisor();
}

function mv198RenderSupervisor(seleccionada){
    const lista = MV198_DASH_SUPERVISOR_LISTA || [];
    const sede = mv4Norm(localStorage.getItem("sede"));
    const actualizacion = lista[0]?.actualizacion || "-";

    if(seleccionada !== undefined){
        MV239_DASH_SUPERVISOR_FILTROS.cuadrilla = seleccionada || "TODAS";
        if(MV239_DASH_SUPERVISOR_FILTROS.cuadrilla !== "TODAS"){
            MV239_DASH_SUPERVISOR_FILTROS.indicador = "RESUMEN";
        }
    }

    const filtros = MV239_DASH_SUPERVISOR_FILTROS;
    const seleccion = filtros.cuadrilla !== "TODAS"
        ? lista.find(x=>x.cuadrilla===filtros.cuadrilla)
        : null;

    let contenido = "";
    if(seleccion){
        contenido = mv198ResumenCuadrilla(seleccion);
    }else if(filtros.indicador !== "RESUMEN"){
        contenido = mv199ListadoIndicador(lista, filtros.indicador, sede, "mv239AbrirCuadrillaSupervisor");
    }else{
        contenido = mv4DashboardKpis(lista);
    }

    mostrarPantalla(`<div class="mv4-page">
        <div class="mv4-top-card"><div class="mv4-top-role">👷 SUPERVISOR</div><div class="mv4-top-sede">${sede || "SEDE"}</div><div class="mv4-top-sub">Actualizado: ${actualizacion}</div></div>
        ${mv239FiltrosSupervisor(lista, filtros)}
        ${contenido}
        <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
    </div>`);
}

function mv198CambiarCuadrillaSupervisor(valor){
    mv239CambiarFiltroSupervisor("cuadrilla", valor);
}

async function mostrarDashboardSupervisor(){
    const sede = mv4Norm(localStorage.getItem("sede"));
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">👷 SUPERVISOR</h2><div class="mv4-loading">Cargando dashboard...</div></div>`);
    try{
        MV198_DASH_SUPERVISOR_LISTA = (await mv4ObtenerRanking()).filter(x => mv4Norm(x.sede) === sede);
        MV239_DASH_SUPERVISOR_FILTROS = {indicador:"RESUMEN", cuadrilla:"TODAS"};
        mv198RenderSupervisor();
    }catch(e){ mostrarPantalla(`<div class="mv4-page"><h2>👷 Supervisor</h2><div class="mv4-error">${e.message}</div></div>`); }
}

const MV591_SEDES_OFICIALES = ["CHICLAYO", "PIURA", "TRUJILLO"];

function mv591ListaZonaNorte(lista){
    return (lista || []).filter(x => MV591_SEDES_OFICIALES.includes(mv4Norm(x.sede)));
}

function mv4AgruparPorSede(lista){
    const grupos = {};
    MV591_SEDES_OFICIALES.forEach(s => grupos[s] = []);

    (lista || []).forEach(x => {
        const s = mv4Norm(x.sede || "");
        if(!MV591_SEDES_OFICIALES.includes(s)) return;
        grupos[s].push(x);
    });

    return grupos;
}

function mv591MiniResumenCard(icono, titulo, valor, sub, estado){
    return `
    <div style="background:#0f1f35;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;min-height:78px;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#9fb7d8;font-weight:900;text-transform:uppercase;letter-spacing:.5px;">
            <span>${icono}</span><span>${titulo}</span>
        </div>
        <div style="font-size:22px;font-weight:900;margin-top:8px;color:#fff;">${valor}</div>
        <div style="font-size:11px;color:#9fb7d8;margin-top:4px;font-weight:700;">${sub || ""} ${estado || ""}</div>
    </div>`;
}

function mv591ResumenEjecutivoZona(lista){
    const r = mv4Resumen(lista);
    const prodPct = r.metaProduccion > 0 ? Math.round((r.produccion / r.metaProduccion) * 100) : 0;
    return `
    <div class="mv4-general-card" style="margin-top:14px;">
        <div class="mv4-general-title">📊 RESUMEN EJECUTIVO ZONA NORTE</div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px;">
            ${mv591MiniResumenCard("📈", "Producción", `${r.produccion.toFixed(1)} pts`, `${prodPct}% de meta`, mv4Estado("mayor", r.produccion, r.metaProduccion))}
            ${mv591MiniResumenCard("🎯", "Efectividad", mv4Per(r.efectividad), `Meta ≥ ${META_EFECTIVIDAD}%`, mv4Estado("mayor", r.efectividad, META_EFECTIVIDAD))}
            ${mv591MiniResumenCard("🔧", "Recableado", mv4Per(r.recableado), `Meta ≤ ${META_RECABLEADO}%`, mv4Estado("menor", r.recableado, META_RECABLEADO))}
            ${mv591MiniResumenCard("📡", "VTR/GAR", mv4Per(r.vtrgar), `Meta ≤ ${META_VTRGAR}%`, mv4Estado("menor", r.vtrgar, META_VTRGAR))}
            ${mv591MiniResumenCard("🚨", "Observaciones", mv4Money(r.obs), `Monto afectado`, mv4Estado("menor", r.obs, META_OBSERVACIONES))}
            ${mv591MiniResumenCard("🏆", "Metas", `${r.ok} / 5`, `${r.cumplimiento}% cumplimiento`, r.cumplimiento >= 80 ? "🟢" : (r.cumplimiento >= 60 ? "🟡" : "🔴"))}
        </div>
    </div>`;
}

function mv4SedeCard(sede, lista){
    const r = mv4Resumen(lista);
    const id = "sede_" + sede.replace(/\W/g, "_") + "_" + Math.random().toString(36).slice(2);
    return `
    <div class="mv4-sede-card">
        <div class="mv4-kpi-head"><div><b>🏢 ${sede}</b></div><div class="mv4-kpi-status">${r.cumplimiento >= 80 ? "🟢" : (r.cumplimiento >= 60 ? "🟡" : "🔴")}</div></div>
        <div class="mv4-sede-grid">
            <span>Prod: <b>${r.produccion.toFixed(1)} / ${r.metaProduccion}</b></span>
            <span>Efect: <b>${mv4Per(r.efectividad)}</b></span>
            <span>Rec: <b>${mv4Per(r.recableado)}</b></span>
            <span>VTR/GAR: <b>${mv4Per(r.vtrgar)}</b></span>
            <span>Obs: <b>${mv4Money(r.obs)}</b></span>
            <span>Metas: <b>${r.ok}/5</b></span>
        </div>
        <button class="mv4-link-btn" onclick="toggleDetalle('${id}', this)">▼ Ver indicadores y cuadrillas</button>
        <div id="${id}" style="display:none;">${mv4DashboardKpis(lista)}</div>
    </div>`;
}

const MV199_INDICADORES_JEFATURA = [
    {valor:"RESUMEN", etiqueta:"RESUMEN GENERAL"},
    {valor:"PRODUCCION", etiqueta:"PRODUCCIÓN"},
    {valor:"EFECTIVIDAD", etiqueta:"EFECTIVIDAD"},
    {valor:"RECABLEADO", etiqueta:"% RECABLEADO"},
    {valor:"VTRGAR", etiqueta:"% VTR/GAR"},
    {valor:"OBSERVACIONES", etiqueta:"OBSERVACIONES"},
    {valor:"METAS", etiqueta:"METAS Y CUMPLIMIENTO"},
    {valor:"RANKING", etiqueta:"RANKING / POSICIÓN"}
];

let MV199_DASH_JEFATURA_FILTROS = {
    sede: "TODAS",
    indicador: "RESUMEN",
    cuadrilla: "TODAS"
};

function mv199OpcionesSede(seleccionada){
    return `<option value="TODAS">TODAS LAS SEDES</option>` + MV591_SEDES_OFICIALES.map(s =>
        `<option value="${s}" ${s===seleccionada?'selected':''}>${s}</option>`
    ).join("");
}

function mv199OpcionesIndicador(seleccionado){
    return MV199_INDICADORES_JEFATURA.map(x =>
        `<option value="${x.valor}" ${x.valor===seleccionado?'selected':''}>${x.etiqueta}</option>`
    ).join("");
}

function mv199FiltrosJefatura(lista, filtros){
    const listaSede = filtros.sede === "TODAS"
        ? lista
        : lista.filter(x => mv4Norm(x.sede) === filtros.sede);
    return `<div class="mv199-filtros-jefatura">
        <div class="mv199-campo-filtro">
            <label for="mv199FiltroSede">🏢 Sede</label>
            <select id="mv199FiltroSede" onchange="mv199CambiarFiltroJefatura('sede',this.value)">${mv199OpcionesSede(filtros.sede)}</select>
        </div>
        <div class="mv199-campo-filtro">
            <label for="mv199FiltroIndicador">📊 Indicador</label>
            <select id="mv199FiltroIndicador" onchange="mv199CambiarFiltroJefatura('indicador',this.value)">${mv199OpcionesIndicador(filtros.indicador)}</select>
        </div>
        <div class="mv199-campo-filtro mv199-campo-cuadrilla">
            <label for="mv199FiltroCuadrilla">🔎 Cuadrilla</label>
            <select id="mv199FiltroCuadrilla" onchange="mv199CambiarFiltroJefatura('cuadrilla',this.value)">${mv198OpcionesCuadrilla(listaSede, filtros.cuadrilla)}</select>
        </div>
    </div>`;
}

function mv199MetasCuadrilla(x){
    return mv4Resumen([x]);
}

function mv199ConfigIndicador(indicador){
    const configs = {
        PRODUCCION:{titulo:"Producción", icono:"📈", campo:"produccion", orden:"DESC", valor:x=>`${Number(x.produccion||0).toFixed(1)} pts`, detalle:x=>`${Math.round((Number(x.produccion||0)/META_PRODUCCION_CUADRILLA)*100)}% de meta`},
        EFECTIVIDAD:{titulo:"Efectividad", icono:"🎯", campo:"efectividad", orden:"DESC", valor:x=>mv4Per(x.efectividad), detalle:x=>`Meta ≥ ${META_EFECTIVIDAD}%`},
        RECABLEADO:{titulo:"% Recableado", icono:"🔧", campo:"recableado", orden:"ASC", valor:x=>mv4Per(x.recableado), detalle:x=>`${Number(x.detRecableado?.recableados||0)} recableados / ${Number(x.detRecableado?.rojoAsignadas||0)} órdenes VT`},
        VTRGAR:{titulo:"% VTR/GAR", icono:"📡", campo:"vtrgar", orden:"ASC", valor:x=>mv4Per(x.vtrgar), detalle:x=>`${Number(x.detVtrGar?.totalGarVtr||0)} incidencias`},
        OBSERVACIONES:{titulo:"Observaciones", icono:"🚨", campo:"montoAfectadoObs", orden:"ASC", valor:x=>mv4Money(x.montoAfectadoObs||0), detalle:x=>`${Number(x.observaciones||0)} observaciones`},
        METAS:{titulo:"Metas y cumplimiento", icono:"🏆", campo:"cumplimiento", orden:"DESC", valor:x=>`${mv199MetasCuadrilla(x).cumplimiento}%`, detalle:x=>`${mv199MetasCuadrilla(x).ok} de 5 metas cumplidas`},
        RANKING:{titulo:"Ranking / posición", icono:"🥇", campo:"puestoRegion", orden:"ASC", valor:x=>x.puestoRegion?`#${x.puestoRegion}`:"-", detalle:x=>`Sede #${x.puestoSede||'-'} · Plataforma #${x.puestoPlataforma||'-'}`}
    };
    return configs[indicador] || null;
}

function mv199ValorOrden(x, config){
    if(config.campo === "cumplimiento") return Number(mv199MetasCuadrilla(x).cumplimiento||0);
    const n = Number(x[config.campo]);
    if(config.orden === "ASC" && (!Number.isFinite(n) || n <= 0) && config.campo === "puestoRegion") return 999999;
    return Number.isFinite(n) ? n : 0;
}

function mv199ListadoIndicador(lista, indicador, sede, funcionAbrir){
    const config = mv199ConfigIndicador(indicador);
    if(!config) return "";
    const abrirCuadrilla = funcionAbrir || "mv199AbrirCuadrilla";
    const ordenada = (lista || []).slice().sort((a,b)=>{
        const va = mv199ValorOrden(a,config), vb = mv199ValorOrden(b,config);
        if(va === vb) return (a.cuadrilla||"").localeCompare(b.cuadrilla||"",undefined,{numeric:true});
        return config.orden === "ASC" ? va-vb : vb-va;
    });
    const alcance = sede === "TODAS" ? "ZONA NORTE" : sede;
    if(!ordenada.length) return `<div class="mv4-empty">No existen cuadrillas para los filtros seleccionados.</div>`;
    return `<div class="mv199-listado-indicador">
        <div class="mv199-listado-cabecera">
            <div><b>${config.icono} ${config.titulo}</b><small>${alcance} · ${ordenada.length} cuadrillas</small></div>
            <span>${config.orden === "ASC" ? "Menor a mayor" : "Mayor a menor"}</span>
        </div>
        <div class="mv199-tabla-wrap"><table class="mv199-tabla-indicador">
            <thead><tr><th>#</th><th>Cuadrilla</th><th>Sede</th><th>${config.titulo}</th><th>Referencia</th></tr></thead>
            <tbody>${ordenada.map((x,i)=>`<tr onclick="${abrirCuadrilla}('${mv198Escapar(x.cuadrilla)}')" title="Ver resumen completo de la cuadrilla">
                <td><b>${i+1}</b></td>
                <td><b>${mv198Escapar(x.cuadrilla)}</b><small>${mv198Escapar(x.plataforma||"")}</small></td>
                <td>${mv198Escapar(x.sede||"")}</td>
                <td class="mv199-valor-indicador">${config.valor(x)}</td>
                <td>${config.detalle(x)}</td>
            </tr>`).join("")}</tbody>
        </table></div>
        <div class="mv199-ayuda">Selecciona una fila para abrir el resumen y el detalle completo de la cuadrilla.</div>
    </div>`;
}

function mv199CambiarFiltroJefatura(campo, valor){
    if(!["sede","indicador","cuadrilla"].includes(campo)) return;
    MV199_DASH_JEFATURA_FILTROS[campo] = valor || (campo === "indicador" ? "RESUMEN" : "TODAS");
    if(campo === "sede"){
        const encontrada = (MV198_DASH_JEFATURA_LISTA||[]).find(x => x.cuadrilla === MV199_DASH_JEFATURA_FILTROS.cuadrilla);
        if(!encontrada || (valor !== "TODAS" && mv4Norm(encontrada.sede) !== valor)) MV199_DASH_JEFATURA_FILTROS.cuadrilla = "TODAS";
    }
    if(campo === "indicador" && valor !== "RESUMEN") MV199_DASH_JEFATURA_FILTROS.cuadrilla = "TODAS";
    mv199RenderJefatura();
}

function mv199AbrirCuadrilla(cuadrilla){
    MV199_DASH_JEFATURA_FILTROS.cuadrilla = cuadrilla;
    MV199_DASH_JEFATURA_FILTROS.indicador = "RESUMEN";
    const encontrada = (MV198_DASH_JEFATURA_LISTA||[]).find(x=>x.cuadrilla===cuadrilla);
    if(encontrada) MV199_DASH_JEFATURA_FILTROS.sede = mv4Norm(encontrada.sede);
    mv199RenderJefatura();
}

function mv240PerfilEjecutivoActual(){
    return mv4Norm(localStorage.getItem("perfil") || "");
}

function mv240EsGerenciaLima(){
    return mv240PerfilEjecutivoActual() === "GERENCIA LIMA";
}

function mv240RotuloVistaEjecutiva(){
    return mv240EsGerenciaLima()
        ? {icono:"🏢", titulo:"GERENCIA LIMA"}
        : {icono:"👔", titulo:"JEFATURA"};
}

function mv199RenderJefatura(){
    const listaCompleta = MV198_DASH_JEFATURA_LISTA || [];
    const f = MV199_DASH_JEFATURA_FILTROS;
    const rotuloVista = mv240RotuloVistaEjecutiva();
    const listaSede = f.sede === "TODAS" ? listaCompleta : listaCompleta.filter(x=>mv4Norm(x.sede)===f.sede);
    const seleccion = f.cuadrilla !== "TODAS" ? listaSede.find(x=>x.cuadrilla===f.cuadrilla) : null;
    const grupos = mv4AgruparPorSede(listaSede);
    const general = mv4Resumen(listaSede);
    const tituloZona = f.sede === "TODAS" ? "ZONA NORTE" : f.sede;
    let html = `<div class="mv4-page">
        <div class="mv4-top-card">
            <div class="mv4-top-role">${rotuloVista.icono} ${rotuloVista.titulo}</div>
            <div class="mv4-top-sede">${tituloZona}</div>
            <div class="mv4-top-sub">${listaSede.length} cuadrillas</div>
        </div>
        ${mv199FiltrosJefatura(listaCompleta, f)}`;

    if(seleccion){
        html += mv198ResumenCuadrilla(seleccion);
    }else if(f.indicador !== "RESUMEN"){
        html += mv199ListadoIndicador(listaSede, f.indicador, f.sede);
    }else{
        const tituloResumen = f.sede === "TODAS" ? "ZONA NORTE" : f.sede;
        html += `${f.sede === "TODAS" ? mv591ResumenEjecutivoZona(listaSede) : `<div class="mv199-resumen-sede-seleccionada"><div class="mv4-general-title">📊 RESUMEN EJECUTIVO ${tituloResumen}</div>${mv4DashboardKpis(listaSede)}</div>`}
            <div class="mv4-general-card">
                <div class="mv4-general-title">📋 CUMPLIMIENTO ${tituloResumen}</div>
                <div class="mv4-general-value">${general.cumplimiento}%</div>
                <div class="mv4-progress"><span style="width:${general.cumplimiento}%"></span></div>
                <div class="mv4-general-sub">${general.ok} de 5 metas cumplidas</div>
            </div>`;
        if(f.sede === "TODAS") MV591_SEDES_OFICIALES.forEach(s => html += mv4SedeCard(s, grupos[s] || []));
    }
    html += `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}

function mv198RenderJefatura(seleccionada){
    MV199_DASH_JEFATURA_FILTROS.cuadrilla = seleccionada || "TODAS";
    mv199RenderJefatura();
}
function mv198CambiarCuadrillaJefatura(valor){ mv199CambiarFiltroJefatura("cuadrilla",valor); }

async function mostrarDashboardJefatura(){
    const rotuloVista = mv240RotuloVistaEjecutiva();
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">${rotuloVista.icono} ${rotuloVista.titulo}</h2><div class="mv4-loading">Cargando Zona Norte...</div></div>`);
    try{
        const listaCompleta = await mv4ObtenerRanking();
        MV198_DASH_JEFATURA_LISTA = mv591ListaZonaNorte(listaCompleta);
        MV199_DASH_JEFATURA_FILTROS = {sede:"TODAS", indicador:"RESUMEN", cuadrilla:"TODAS"};
        mv199RenderJefatura();
    }catch(e){
        const rotuloError = mv240RotuloVistaEjecutiva();
        mostrarPantalla(`<div class="mv4-page"><h2>${rotuloError.icono} ${rotuloError.titulo}</h2><div class="mv4-error">${e.message}</div></div>`);
    }
}
