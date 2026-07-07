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

    const totalPuntos = Number(data.resumen.totalPuntos || 0);
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

        <h2 style="text-align:center;margin-bottom:14px;">📊 MI PRODUCCIÓN</h2>

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

const META_PRODUCCION_CUADRILLA = 120;
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
async function mv4ObtenerRanking(){
    const res = await fetch(URL_RANKING_MI_VISUAL + "&t=" + Date.now());
    const texto = await res.text();
    return mv4CSV(texto).slice(1).map(mv4FilaRanking).filter(x => x.cuadrilla);
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
    return lista.slice().sort((a,b)=>a.cuadrilla.localeCompare(b.cuadrilla)).map(x => {
        if(tipo === "produccion") return mv4LineaCuadrilla(x.cuadrilla, `${(x.produccion||0).toFixed(1)} / ${META_PRODUCCION_CUADRILLA} pts`, `Meta ${META_PRODUCCION_CUADRILLA}`, mv4Estado("mayor", x.produccion, META_PRODUCCION_CUADRILLA));
        if(tipo === "efectividad") return mv4LineaCuadrilla(x.cuadrilla, mv4Per(x.efectividad), `Meta ≥ ${META_EFECTIVIDAD}%`, mv4Estado("mayor", x.efectividad, META_EFECTIVIDAD));
        if(tipo === "recableado") return mv4LineaCuadrilla(x.cuadrilla, mv4Per(x.recableado), `Meta ≤ ${META_RECABLEADO}%`, mv4Estado("menor", x.recableado, META_RECABLEADO));
        if(tipo === "vtrgar") return mv4LineaCuadrilla(x.cuadrilla, mv4Per(x.vtrgar), `Meta ≤ ${META_VTRGAR}%`, mv4Estado("menor", x.vtrgar, META_VTRGAR));
        if(tipo === "obs") return mv4LineaCuadrilla(x.cuadrilla, mv4Money(x.montoAfectadoObs), `Meta ≤ S/ ${META_OBSERVACIONES}`, mv4Estado("menor", x.montoAfectadoObs, META_OBSERVACIONES));
        return "";
    }).join("");
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

function renderDashboardProduccion(data){
    const totalPuntos = Number(data.resumen.totalPuntos || 0);
    const meta = META_PRODUCCION_CUADRILLA;
    let html = `
    <div class="mv4-page">
        <h2 class="mv4-title">📊 MI PRODUCCIÓN</h2>
        <div class="mv4-hero-card">
            <div class="mv4-hero-label">PUNTOS ACUMULADOS DEL MES</div>
            <div class="mv4-hero-value">${totalPuntos.toFixed(1)}</div>
            <div class="mv4-hero-meta">🎯 Meta: ${meta} pts</div>
        </div>
        <div class="mv4-kpi-grid">
            ${kpiProduccionTecnico("📦", "Total", data.resumen.totalProduccion)}
            ${kpiProduccionTecnico("🏠", "Instalaciones", data.resumen.totalInstalaciones)}
            ${kpiProduccionTecnico("🔧", "Última Milla", data.resumen.totalUltimaMilla)}
            ${kpiProduccionTecnico("📡", "Recableado VT", data.resumen.totalRecableadoVT)}
            ${kpiProduccionTecnico("🔄", "Recableado Post", data.resumen.totalRecableadoPost)}
            ${kpiProduccionTecnico("🚚", "Traslados", data.resumen.totalTraslados)}
        </div>
        <h2 class="mv4-section-title">📅 Historial Diario</h2>`;

    if(!data.detalle || !data.detalle.length){
        html += `<div class="mv4-empty">No hay producción registrada para tu cuadrilla.</div><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
        mostrarPantalla(html); return;
    }
    const porDia = {};
    data.detalle.forEach(r => {
        const f = r.fecha || "SIN FECHA";
        if(!porDia[f]) porDia[f] = { puntos:0, items:[] };
        const pts = (Number(r.puntaje)||0) * (Number(r.cantidad)||0);
        porDia[f].puntos += pts;
        porDia[f].items.push(r);
    });
    Object.keys(porDia).sort((a,b)=>b.split('/').reverse().join('').localeCompare(a.split('/').reverse().join(''))).forEach(fecha => {
        const d = porDia[fecha];
        const sem = d.puntos > 4.5 ? "🟢" : (d.puntos >= 4 ? "🟡" : "🔴");
        html += `<div class="mv4-day-card"><div class="mv4-day-head"><b>📅 ${fecha}</b><span>${sem} ${d.puntos.toFixed(1)} pts</span></div>`;
        d.items.forEach(r => {
            html += `<div class="mv4-day-row"><span>${r.tipo || "Trabajo registrado"}</span><b>${r.cantidad || 0}</b></div>`;
        });
        html += `</div>`;
    });
    html += `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}

async function mostrarDashboardSupervisor(){
    const sede = mv4Norm(localStorage.getItem("sede"));
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">👷 SUPERVISOR</h2><div class="mv4-loading">Cargando dashboard...</div></div>`);
    try{
        const lista = (await mv4ObtenerRanking()).filter(x => mv4Norm(x.sede) === sede);
        const actualizacion = lista[0]?.actualizacion || "-";
        mostrarPantalla(`
            <div class="mv4-page">
                <div class="mv4-top-card"><div class="mv4-top-role">👷 SUPERVISOR</div><div class="mv4-top-sede">${sede || "SEDE"}</div><div class="mv4-top-sub">Actualizado: ${actualizacion}</div></div>
                ${mv4DashboardKpis(lista)}
                <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
            </div>`);
    }catch(e){ mostrarPantalla(`<div class="mv4-page"><h2>👷 Supervisor</h2><div class="mv4-error">${e.message}</div></div>`); }
}

function mv4AgruparPorSede(lista){
    const grupos = {};
    lista.forEach(x => { const s = mv4Norm(x.sede || "SIN SEDE"); if(!grupos[s]) grupos[s]=[]; grupos[s].push(x); });
    return grupos;
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
async function mostrarDashboardJefatura(){
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">👔 JEFATURA</h2><div class="mv4-loading">Cargando Zona Norte...</div></div>`);
    try{
        const lista = await mv4ObtenerRanking();
        const grupos = mv4AgruparPorSede(lista);
        const general = mv4Resumen(lista);
        let html = `<div class="mv4-page"><div class="mv4-top-card"><div class="mv4-top-role">👔 JEFATURA</div><div class="mv4-top-sede">ZONA NORTE</div><div class="mv4-top-sub">${lista.length} cuadrillas</div></div><div class="mv4-general-card"><div class="mv4-general-title">📋 CUMPLIMIENTO ZONA NORTE</div><div class="mv4-general-value">${general.cumplimiento}%</div><div class="mv4-progress"><span style="width:${general.cumplimiento}%"></span></div><div class="mv4-general-sub">${general.ok} de 5 metas cumplidas</div></div>`;
        Object.keys(grupos).sort().forEach(s => html += mv4SedeCard(s, grupos[s]));
        html += `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
        mostrarPantalla(html);
    }catch(e){ mostrarPantalla(`<div class="mv4-page"><h2>👔 Jefatura</h2><div class="mv4-error">${e.message}</div></div>`); }
}
