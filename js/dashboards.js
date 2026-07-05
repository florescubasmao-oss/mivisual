// MI VISUAL - archivo modularizado

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

        const d = filasCatalogo[i].split(",");

        catalogo[d[0].trim()] = {

            tipo: d[1].trim(),
            plataforma: d[2].trim(),
            puntaje: Number(d[3]),
            grupo: d[4].trim()

        };

    }

    console.log(catalogo);

    //--------------------------------------------------
    // PRODUCCION DEL USUARIO
    //--------------------------------------------------

    const registros = [];

    for(let i=1;i<filasProduccion.length;i++){

        const d = filasProduccion[i].split(",");


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
            cantidad:Number(d[4]),

            tipo:catalogo[d[3]]?.tipo || "",
            grupo:catalogo[d[3]]?.grupo || "",
            puntaje:catalogo[d[3]]?.puntaje || 0

        });

    }

   console.table(registros);

registros.forEach(r=>{

    totalProduccion += r.cantidad;

    totalPuntos += r.cantidad * r.puntaje;

    switch(r.grupo){

        case "ULTIMA_MILLA":
            totalUltimaMilla += r.cantidad;
            break;

        case "INSTALACION":
            totalInstalaciones += r.cantidad;
            break;

        case "RECABLEADO_VT":
            totalRecableadoVT += r.cantidad;
            break;

        case "RECABLEADO_POST":
            totalRecableadoPost += r.cantidad;
            break;

        case "TRASLADO":
            totalTraslados += r.cantidad;
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

    let html = `

    <div class="card">

        <h2>📊 Producción</h2>

        <div style="margin-top:15px">

            <p><b>Producción Total:</b> ${data.resumen.totalProduccion}</p>

            <p><b>Última Milla:</b> ${data.resumen.totalUltimaMilla}</p>

            <p><b>Instalaciones:</b> ${data.resumen.totalInstalaciones}</p>

            <p><b>Recableado VT:</b> ${data.resumen.totalRecableadoVT}</p>

            <p><b>Recableado Postventa:</b> ${data.resumen.totalRecableadoPost}</p>

            <p><b>Traslados:</b> ${data.resumen.totalTraslados}</p>

            <hr>

            <h3>⭐ Puntos: ${data.resumen.totalPuntos}</h3>

        </div>

    </div>

    `;

html += `
<div style="text-align:center;margin:25px 0;">
    <button
        onclick="volverInicio()"
        style="
            background:#16a34a;
            color:white;
            border:none;
            padding:12px 30px;
            border-radius:10px;
            font-size:16px;
            font-weight:bold;
            cursor:pointer;
        ">
        🏠 Volver al Menú
    </button>
</div>
`;

    html += `<hr style="margin:25px 0;">`;

html += `<h2>📅 Historial de Producción</h2>`;

let fechaActual = "";

data.detalle.sort((a, b) => {

    const fa = a.fecha.split("/").reverse().join("");
    const fb = b.fecha.split("/").reverse().join("");

    return fb.localeCompare(fa);

});

data.detalle.forEach(r => {

    if (r.fecha !== fechaActual) {

    fechaActual = r.fecha;

    html += `
        <h3 style="margin-top:25px;">
            📅 ${fechaActual}
        </h3>
    `;

}

    html += `

    <div class="card" style="margin-top:15px; padding:15px;">

        <h3 style="
    margin:10px 0;
    color:#ffffff;
    font-size:18px;
    line-height:1.4;
">
    ${r.tipo}
</h3>

        <p style="font-size:17px;">
    📦 <b>Cantidad:</b> ${r.cantidad}
</p>

       <p style="font-size:17px;color:#FFD700;">
    ⭐ <b>Puntos:</b> ${r.puntaje * r.cantidad}
</p>

    </div>

    `;

});


    mostrarPantalla(html);

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
▼ Ver detalle diario
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

<div class="card" onclick="actualizarEfectividad()" style="cursor:pointer;">
📊 ACTUALIZAR EFECTIVIDAD
<br><small>Actualizar desde hoja EFECTIVIDAD</small>
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

async function actualizarEfectividad() {

  const url = "https://script.google.com/macros/s/AKfycbyrqtbvW1-uYv-KvQ7pratKHLDUQLnI9uD9W5QIN0G4fwb-uU5Naogzjhj7qtb1sRaM/exec";

  try {

    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        accion: "actualizarEfectividad"
      })
    });

    const texto = await resp.text();
    const res = JSON.parse(texto);

    if (res.ok) {

      alert(
        "✅ EFECTIVIDAD ACTUALIZADA" +
        "\nRegistros: " + res.registros +
        "\nMes: " + res.mes +
        "\nPromedio: " + (res.promedio * 100).toFixed(2) + "%"
      );

    } else {

      alert("❌ Error: " + res.error);

    }

  } catch (err) {

    alert("❌ Error al actualizar efectividad: " + err.message);

  }

}