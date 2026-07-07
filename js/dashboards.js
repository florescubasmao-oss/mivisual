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

  let semaforo = "🔴";

if(puntosDia >= 4.5){
   semaforo = "🟢";
}
else if(puntosDia == 4){
   semaforo = "🟡";
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

    const gruposPorFecha = {};

    (data.detalle || []).forEach(r => {
        const fecha = (r.fecha || "SIN FECHA").trim();
        const cantidad = Number(r.cantidad) || 0;
        const puntaje = Number(r.puntaje) || 0;
        const puntos = cantidad * puntaje;
        const tipo = (r.tipo || "Trabajo registrado").trim();

        if(!gruposPorFecha[fecha]){
            gruposPorFecha[fecha] = {
                fecha,
                puntos: 0,
                trabajos: {}
            };
        }

        gruposPorFecha[fecha].puntos += puntos;

        if(!gruposPorFecha[fecha].trabajos[tipo]){
            gruposPorFecha[fecha].trabajos[tipo] = {
                tipo,
                cantidad: 0,
                puntos: 0
            };
        }

        gruposPorFecha[fecha].trabajos[tipo].cantidad += cantidad;
        gruposPorFecha[fecha].trabajos[tipo].puntos += puntos;
    });

    const fechasOrdenadas = Object.values(gruposPorFecha).sort((a, b) => {
        const fa = (a.fecha || "").split("/").reverse().join("");
        const fb = (b.fecha || "").split("/").reverse().join("");
        return fb.localeCompare(fa);
    });

    let html = `
    <div class="prod-telco">

        <div class="prod-topbar">
            <div class="prod-eyebrow">APP OPERACIONES TELECOM</div>
            <h2>📊 MI PRODUCCIÓN</h2>
        </div>

        <div class="prod-hero-card">
            <div class="prod-hero-label">PUNTOS ACUMULADOS DEL MES</div>
            <div class="prod-hero-value">${totalPuntos.toFixed(1)}</div>
        </div>

        <div class="prod-kpi-grid">
            ${kpiProduccionTecnico("📦", "Total", data.resumen.totalProduccion)}
            ${kpiProduccionTecnico("🏠", "Instalaciones", data.resumen.totalInstalaciones)}
            ${kpiProduccionTecnico("🛠", "Última Milla", data.resumen.totalUltimaMilla)}
            ${kpiProduccionTecnico("🔧", "Recableado VT", data.resumen.totalRecableadoVT)}
            ${kpiProduccionTecnico("🧰", "Recableado Post", data.resumen.totalRecableadoPost)}
            ${kpiProduccionTecnico("🚚", "Traslados", data.resumen.totalTraslados)}
        </div>

        <div class="prod-section-title">📅 HISTORIAL DIARIO</div>
    `;

    if(!data.detalle || data.detalle.length === 0){
        html += `
            <div class="prod-empty-card">
                No hay producción registrada para tu cuadrilla.
            </div>
        `;
        html += `
            <div class="prod-actions">
                <button class="button_1" onclick="volverInicio()">🏠 Volver al Menú</button>
            </div>
        </div>`;
        mostrarPantalla(html);
        return;
    }

    fechasOrdenadas.forEach(dia => {
        const puntosDia = Number(dia.puntos || 0);
        const semaforo = semaforoProduccionDia(puntosDia);
        const trabajos = Object.values(dia.trabajos).sort((a,b) => a.tipo.localeCompare(b.tipo));

        html += `
            <div class="prod-day-card ${semaforo.clase}">
                <div class="prod-day-head">
                    <div class="prod-day-date">📅 ${dia.fecha}</div>
                    <div class="prod-day-score">${semaforo.icono} ${puntosDia.toFixed(1)} pts</div>
                </div>

                <div class="prod-day-list">
        `;

        trabajos.forEach(t => {
            html += `
                <div class="prod-day-row">
                    <div class="prod-day-work">${t.tipo}</div>
                    <div class="prod-day-qty">${t.cantidad}</div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
        <div class="prod-actions">
            <button class="button_1" onclick="volverInicio()">🏠 Volver al Menú</button>
        </div>
    </div>`;

    mostrarPantalla(html);
}

function semaforoProduccionDia(puntos){
    const p = Number(puntos) || 0;

    if(p > 4.5){
        return { icono: "🟢", clase: "prod-green" };
    }

    if(p >= 4){
        return { icono: "🟡", clase: "prod-yellow" };
    }

    return { icono: "🔴", clase: "prod-red" };
}

function kpiProduccionTecnico(icono, titulo, valor){
    return `
        <div class="prod-kpi-card">
            <div class="prod-kpi-label">${icono} ${titulo}</div>
            <div class="prod-kpi-value">${valor || 0}</div>
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

        🏠 VOLVER

        </button>

    </div>

    `;

    mostrarPantalla(html);

}


/* =========================================================
   MI VISUAL v3.2 - DASHBOARD SUPERVISOR / JEFATURA METAS
   Diseño móvil tipo telecomunicaciones
========================================================= */

const URL_RANKING_DASHBOARD = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1269910675&single=true&output=csv";

const METAS_DASHBOARD = {
    produccionPorCuadrilla: 120,
    efectividad: 70,
    recableado: 42,
    vtrgar: 3,
    observacionesMonto: 200
};

function mvParseCSV(texto){
    const filas = [];
    let fila = [];
    let celda = "";
    let comillas = false;

    for(let i = 0; i < texto.length; i++){
        const ch = texto[i];
        const next = texto[i + 1];

        if(ch === '"'){
            if(comillas && next === '"'){
                celda += '"';
                i++;
            }else{
                comillas = !comillas;
            }
        }else if(ch === ',' && !comillas){
            fila.push(celda.trim());
            celda = "";
        }else if((ch === '\n' || ch === '\r') && !comillas){
            if(ch === '\r' && next === '\n') i++;
            fila.push(celda.trim());
            if(fila.some(x => x !== "")) filas.push(fila);
            fila = [];
            celda = "";
        }else{
            celda += ch;
        }
    }

    if(celda || fila.length){
        fila.push(celda.trim());
        if(fila.some(x => x !== "")) filas.push(fila);
    }

    return filas;
}

function mvNormalizar(txt){
    return (txt || "")
        .toString()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function mvNumero(valor){
    const n = Number((valor || "")
        .toString()
        .replace("%", "")
        .replace("S/", "")
        .replace(/,/g, ".")
        .replace(/\s/g, "")
    );
    return isNaN(n) ? 0 : n;
}

function mvPct(valor){
    const n = mvNumero(valor);
    return n <= 1 ? n * 100 : n;
}

function mvSoles(valor){
    return "S/ " + (Number(valor) || 0).toFixed(2);
}

function mvSemaforoPositivo(valor, meta){
    if(valor >= meta) return "🟢";
    if(valor >= meta * 0.90) return "🟡";
    return "🔴";
}

function mvSemaforoMayorIgual(valor, meta, margen){
    if(valor >= meta) return "🟢";
    if(valor >= (meta - (margen || 5))) return "🟡";
    return "🔴";
}

function mvSemaforoMenorIgual(valor, meta, margen){
    if(valor <= meta) return "🟢";
    if(valor <= (meta + (margen || 5))) return "🟡";
    return "🔴";
}

function mvColorSemaforo(semaforo){
    if(semaforo === "🟢") return "#16a34a";
    if(semaforo === "🟡") return "#facc15";
    return "#ef4444";
}

function mvFilaRankingDashboard(f){
    return {
        id: f[0] || "",
        cuadrilla: (f[1] || "").replace(/^P\s+(\d+)/i, "P$1").replace(/\s+/g, " ").trim(),
        actualizacion: f[2] || "",
        usuario: f[3] || "",
        sede: mvNormalizar(f[4] || ""),
        plataforma: mvNormalizar(f[5] || ""),
        produccion: mvNumero(f[6]),
        efectividad: mvPct(f[7]),
        recableado: mvPct(f[8]),
        vtrgar: mvPct(f[9]),
        observaciones: mvNumero(f[10]),
        montoTotalObs: mvNumero(f[11]),
        montoAfectadoObs: mvNumero(f[12]),
        puntaje: mvNumero(f[13]),
        puestoSede: Number(f[14]) || 0,
        puestoRegion: Number(f[15]) || 0,
        puestoPlataforma: Number(f[16]) || 0,
        medallaRegion: f[17] || "",
        medallaSede: f[18] || "",
        medallaPlataforma: f[19] || ""
    };
}

async function mvCargarRankingDashboard(){
    const resp = await fetch(URL_RANKING_DASHBOARD + "&t=" + Date.now());
    const texto = await resp.text();
    const filas = mvParseCSV(texto);
    return filas.slice(1).map(mvFilaRankingDashboard).filter(x => x.cuadrilla);
}

function mvResumenLista(lista){
    const totalCuadrillas = lista.length;
    const produccion = lista.reduce((a, x) => a + (Number(x.produccion) || 0), 0);
    const metaProduccion = totalCuadrillas * METAS_DASHBOARD.produccionPorCuadrilla;
    const efectividad = totalCuadrillas ? lista.reduce((a, x) => a + x.efectividad, 0) / totalCuadrillas : 0;
    const recableado = totalCuadrillas ? lista.reduce((a, x) => a + x.recableado, 0) / totalCuadrillas : 0;
    const vtrgar = totalCuadrillas ? lista.reduce((a, x) => a + x.vtrgar, 0) / totalCuadrillas : 0;
    const montoObs = lista.reduce((a, x) => a + (Number(x.montoAfectadoObs) || 0), 0);

    const cumple = {
        produccion: produccion >= metaProduccion,
        efectividad: efectividad >= METAS_DASHBOARD.efectividad,
        recableado: recableado <= METAS_DASHBOARD.recableado,
        vtrgar: vtrgar <= METAS_DASHBOARD.vtrgar,
        observaciones: montoObs <= METAS_DASHBOARD.observacionesMonto
    };

    const metasCumplidas = Object.values(cumple).filter(Boolean).length;

    return {
        totalCuadrillas,
        produccion,
        metaProduccion,
        efectividad,
        recableado,
        vtrgar,
        montoObs,
        cumple,
        metasCumplidas,
        cumplimientoGeneral: metasCumplidas * 20,
        actualizacion: lista[0]?.actualizacion || ""
    };
}

function mvBarra(valor, maximo, semaforo){
    const pct = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0;
    const color = mvColorSemaforo(semaforo);
    return `
        <div style="width:100%;height:10px;background:#17233a;border-radius:20px;overflow:hidden;margin-top:10px;">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:20px;"></div>
        </div>
    `;
}

function mvHeaderDashboard(titulo, subtitulo, actualizacion){
    return `
        <div style="
            background:linear-gradient(135deg,#0f172a,#123c69,#0f766e);
            color:white;
            border-radius:22px;
            padding:20px;
            margin-bottom:14px;
            box-shadow:0 12px 28px rgba(0,0,0,.26);
        ">
            <div style="font-size:12px;letter-spacing:1.4px;opacity:.78;">MI VISUAL · TELECOM</div>
            <div style="font-size:28px;font-weight:900;margin-top:8px;line-height:1.05;">${titulo}</div>
            ${subtitulo ? `<div style="font-size:16px;font-weight:800;margin-top:8px;color:#bfdbfe;">${subtitulo}</div>` : ""}
            <div style="font-size:12px;opacity:.82;margin-top:10px;">Actualizado: <b>${actualizacion || "-"}</b></div>
        </div>
    `;
}

function mvTarjetaGlobal(resumen, etiqueta){
    const sem = resumen.cumplimientoGeneral >= 80 ? "🟢" : (resumen.cumplimientoGeneral >= 60 ? "🟡" : "🔴");
    return `
        <div style="
            background:#1f2d48;
            color:white;
            border-radius:20px;
            padding:16px;
            margin:12px 0;
            box-shadow:0 8px 18px rgba(0,0,0,.20);
        ">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div>
                    <div style="font-size:13px;color:#9fb7d8;">📋 CUMPLIMIENTO ${etiqueta || "GENERAL"}</div>
                    <div style="font-size:38px;font-weight:900;margin-top:4px;">${resumen.cumplimientoGeneral}%</div>
                    <div style="font-size:14px;color:#bfdbfe;">${resumen.metasCumplidas} de 5 metas cumplidas</div>
                </div>
                <div style="font-size:42px;">${sem}</div>
            </div>
            ${mvBarra(resumen.cumplimientoGeneral, 100, sem)}
        </div>
    `;
}

function mvFilaCuadrillaResumen(r, tipo){
    const sp = mvSemaforoPositivo(r.produccion, METAS_DASHBOARD.produccionPorCuadrilla);
    const se = mvSemaforoMayorIgual(r.efectividad, METAS_DASHBOARD.efectividad, 5);
    const sr = mvSemaforoMenorIgual(r.recableado, METAS_DASHBOARD.recableado, 8);
    const sv = mvSemaforoMenorIgual(r.vtrgar, METAS_DASHBOARD.vtrgar, 1);
    const so = mvSemaforoMenorIgual(r.montoAfectadoObs, METAS_DASHBOARD.observacionesMonto, 100);

    let valorPrincipal = "";
    if(tipo === "produccion") valorPrincipal = `${r.produccion.toFixed(1)} / ${METAS_DASHBOARD.produccionPorCuadrilla} pts ${sp}`;
    if(tipo === "efectividad") valorPrincipal = `${r.efectividad.toFixed(2)}% / Meta ≥ ${METAS_DASHBOARD.efectividad}% ${se}`;
    if(tipo === "recableado") valorPrincipal = `${r.recableado.toFixed(2)}% / Meta ≤ ${METAS_DASHBOARD.recableado}% ${sr}`;
    if(tipo === "vtrgar") valorPrincipal = `${r.vtrgar.toFixed(2)}% / Meta ≤ ${METAS_DASHBOARD.vtrgar}% ${sv}`;
    if(tipo === "observaciones") valorPrincipal = `${mvSoles(r.montoAfectadoObs)} / Meta ≤ ${mvSoles(METAS_DASHBOARD.observacionesMonto)} ${so}`;

    return `
        <div style="
            background:#0f172a;
            border:1px solid rgba(255,255,255,.08);
            border-radius:16px;
            padding:12px;
            margin-top:10px;
        ">
            <div style="font-size:13px;font-weight:900;line-height:1.25;color:white;">${r.cuadrilla}</div>
            <div style="font-size:13px;font-weight:800;color:#facc15;margin-top:6px;">${valorPrincipal}</div>
            <div style="font-size:11px;color:#9fb7d8;margin-top:7px;line-height:1.45;">
                Prod: ${r.produccion.toFixed(1)} ${sp} · Efec: ${r.efectividad.toFixed(1)}% ${se}<br>
                Rec: ${r.recableado.toFixed(1)}% ${sr} · VTR/GAR: ${r.vtrgar.toFixed(1)}% ${sv}<br>
                Obs: ${mvSoles(r.montoAfectadoObs)} ${so}
            </div>
        </div>
    `;
}

function mvKpiAccordion(id, icono, titulo, actual, metaTexto, semaforo, barraValor, barraMeta, lista, tipo){
    const color = mvColorSemaforo(semaforo);
    return `
        <div style="
            background:#1f2d48;
            color:white;
            border-radius:20px;
            padding:16px;
            margin:12px 0;
            box-shadow:0 8px 18px rgba(0,0,0,.20);
            border-top:4px solid ${color};
        ">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="flex:1;">
                    <div style="font-size:13px;color:#9fb7d8;font-weight:800;">${icono} ${titulo}</div>
                    <div style="font-size:25px;font-weight:900;margin-top:5px;line-height:1.15;">${actual}</div>
                    <div style="font-size:12px;color:#bfdbfe;margin-top:5px;">Meta: <b>${metaTexto}</b></div>
                </div>
                <div style="font-size:32px;line-height:1;">${semaforo}</div>
            </div>

            ${mvBarra(barraValor, barraMeta, semaforo)}

            <button onclick="mvToggleDash('${id}', this)" style="
                width:100%;
                margin-top:12px;
                padding:11px;
                background:#123c69;
                color:white;
                border:none;
                border-radius:14px;
                font-weight:900;
                letter-spacing:.2px;
            ">▼ Ver cuadrillas</button>

            <div id="${id}" style="display:none;margin-top:12px;">
                ${lista.map(r => mvFilaCuadrillaResumen(r, tipo)).join("") || `<div style="font-size:13px;color:#bfdbfe;">Sin cuadrillas.</div>`}
            </div>
        </div>
    `;
}

function mvToggleDash(id, btn){
    const el = document.getElementById(id);
    if(!el) return;
    const abierto = el.style.display !== "none";
    el.style.display = abierto ? "none" : "block";
    if(btn) btn.textContent = abierto ? "▼ Ver cuadrillas" : "▲ Ocultar cuadrillas";
}

function mvDashboardSupervisorHTML(lista, sede){
    const resumen = mvResumenLista(lista);
    const semProd = mvSemaforoPositivo(resumen.produccion, resumen.metaProduccion);
    const semEf = mvSemaforoMayorIgual(resumen.efectividad, METAS_DASHBOARD.efectividad, 5);
    const semRec = mvSemaforoMenorIgual(resumen.recableado, METAS_DASHBOARD.recableado, 8);
    const semVtr = mvSemaforoMenorIgual(resumen.vtrgar, METAS_DASHBOARD.vtrgar, 1);
    const semObs = mvSemaforoMenorIgual(resumen.montoObs, METAS_DASHBOARD.observacionesMonto, 100);

    return `
        <div style="padding:16px;max-width:980px;margin:auto;">
            ${mvHeaderDashboard("SUPERVISOR", sede || "SEDE", resumen.actualizacion)}
            ${mvTarjetaGlobal(resumen, "SUPERVISOR")}

            ${mvKpiAccordion("sup_prod", "📈", "PRODUCCIÓN", `${resumen.produccion.toFixed(1)} / ${resumen.metaProduccion} pts`, `120 pts x ${resumen.totalCuadrillas} cuadrillas`, semProd, resumen.produccion, resumen.metaProduccion, lista, "produccion")}
            ${mvKpiAccordion("sup_efec", "📊", "EFECTIVIDAD", `${resumen.efectividad.toFixed(2)}%`, `≥ ${METAS_DASHBOARD.efectividad}%`, semEf, resumen.efectividad, 100, lista, "efectividad")}
            ${mvKpiAccordion("sup_rec", "🔧", "RECABLEADO", `${resumen.recableado.toFixed(2)}%`, `≤ ${METAS_DASHBOARD.recableado}%`, semRec, METAS_DASHBOARD.recableado, Math.max(resumen.recableado, METAS_DASHBOARD.recableado), lista, "recableado")}
            ${mvKpiAccordion("sup_vtr", "⚠️", "VTR / GAR", `${resumen.vtrgar.toFixed(2)}%`, `≤ ${METAS_DASHBOARD.vtrgar}%`, semVtr, METAS_DASHBOARD.vtrgar, Math.max(resumen.vtrgar, METAS_DASHBOARD.vtrgar), lista, "vtrgar")}
            ${mvKpiAccordion("sup_obs", "🚨", "OBSERVACIONES", `${mvSoles(resumen.montoObs)}`, `≤ ${mvSoles(METAS_DASHBOARD.observacionesMonto)}`, semObs, METAS_DASHBOARD.observacionesMonto, Math.max(resumen.montoObs, METAS_DASHBOARD.observacionesMonto), lista, "observaciones")}

            <br>
            <button class="button_1" onclick="volverInicio()">🏠 VOLVER</button>
        </div>
    `;
}

function mvSedeCard(sede, lista, index){
    const resumen = mvResumenLista(lista);
    const semProd = mvSemaforoPositivo(resumen.produccion, resumen.metaProduccion);
    const semEf = mvSemaforoMayorIgual(resumen.efectividad, METAS_DASHBOARD.efectividad, 5);
    const semRec = mvSemaforoMenorIgual(resumen.recableado, METAS_DASHBOARD.recableado, 8);
    const semVtr = mvSemaforoMenorIgual(resumen.vtrgar, METAS_DASHBOARD.vtrgar, 1);
    const semObs = mvSemaforoMenorIgual(resumen.montoObs, METAS_DASHBOARD.observacionesMonto, 100);
    const semGlobal = resumen.cumplimientoGeneral >= 80 ? "🟢" : (resumen.cumplimientoGeneral >= 60 ? "🟡" : "🔴");

    return `
        <div style="
            background:#1f2d48;
            color:white;
            border-radius:22px;
            padding:16px;
            margin:14px 0;
            box-shadow:0 10px 22px rgba(0,0,0,.24);
            border-top:4px solid ${mvColorSemaforo(semGlobal)};
        ">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
                <div>
                    <div style="font-size:22px;font-weight:900;">🏢 ${sede}</div>
                    <div style="font-size:12px;color:#9fb7d8;margin-top:4px;">${resumen.totalCuadrillas} cuadrillas · ${resumen.metasCumplidas}/5 metas</div>
                </div>
                <div style="font-size:34px;">${semGlobal}</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr;gap:9px;margin-top:14px;">
                <div>📈 Producción: <b>${resumen.produccion.toFixed(1)} / ${resumen.metaProduccion} pts</b> <span style="float:right;">${semProd}</span><br><small style="color:#bfdbfe;">Meta: 120 pts x cuadrilla</small></div>
                <div>📊 Efectividad: <b>${resumen.efectividad.toFixed(2)}%</b> <span style="float:right;">${semEf}</span><br><small style="color:#bfdbfe;">Meta ≥ ${METAS_DASHBOARD.efectividad}%</small></div>
                <div>🔧 Recableado: <b>${resumen.recableado.toFixed(2)}%</b> <span style="float:right;">${semRec}</span><br><small style="color:#bfdbfe;">Meta ≤ ${METAS_DASHBOARD.recableado}%</small></div>
                <div>⚠️ VTR/GAR: <b>${resumen.vtrgar.toFixed(2)}%</b> <span style="float:right;">${semVtr}</span><br><small style="color:#bfdbfe;">Meta ≤ ${METAS_DASHBOARD.vtrgar}%</small></div>
                <div>🚨 Observaciones: <b>${mvSoles(resumen.montoObs)}</b> <span style="float:right;">${semObs}</span><br><small style="color:#bfdbfe;">Meta ≤ ${mvSoles(METAS_DASHBOARD.observacionesMonto)}</small></div>
            </div>

            <button onclick="mvToggleDash('sede_${index}', this)" style="
                width:100%;
                margin-top:14px;
                padding:11px;
                background:#123c69;
                color:white;
                border:none;
                border-radius:14px;
                font-weight:900;
            ">▼ Ver cuadrillas</button>

            <div id="sede_${index}" style="display:none;margin-top:12px;">
                ${lista.map(r => mvFilaCuadrillaResumen(r, "produccion")).join("")}
            </div>
        </div>
    `;
}

function mvDashboardJefaturaHTML(lista){
    const resumen = mvResumenLista(lista);
    const sedes = {};
    lista.forEach(r => {
        const sede = r.sede || "SIN SEDE";
        if(!sedes[sede]) sedes[sede] = [];
        sedes[sede].push(r);
    });

    const ordenSedes = ["CHICLAYO", "PIURA", "TRUJILLO"];
    const sedesOrdenadas = Object.keys(sedes).sort((a,b) => {
        const ia = ordenSedes.indexOf(a);
        const ib = ordenSedes.indexOf(b);
        if(ia >= 0 && ib >= 0) return ia - ib;
        if(ia >= 0) return -1;
        if(ib >= 0) return 1;
        return a.localeCompare(b);
    });

    return `
        <div style="padding:16px;max-width:980px;margin:auto;">
            ${mvHeaderDashboard("JEFATURA", "ZONA NORTE", resumen.actualizacion)}
            ${mvTarjetaGlobal(resumen, "ZONA NORTE")}

            ${sedesOrdenadas.map((sede, i) => mvSedeCard(sede, sedes[sede], i)).join("")}

            <br>
            <button class="button_1" onclick="volverInicio()">🏠 VOLVER</button>
        </div>
    `;
}

async function mostrarDashboardSupervisor(){
    const sede = mvNormalizar(localStorage.getItem("sede"));
    mostrarPantalla(`<div style="padding:20px;max-width:900px;margin:auto;"><h2>📊 SUPERVISOR</h2>Cargando indicadores...</div>`);

    try{
        const lista = (await mvCargarRankingDashboard())
            .filter(x => x.sede === sede)
            .sort((a, b) => b.produccion - a.produccion);

        if(lista.length === 0){
            mostrarPantalla(`<div style="padding:20px;"><h2>📊 SUPERVISOR</h2>No hay cuadrillas para la sede ${sede}.<br><br><button class="button_1" onclick="volverInicio()">🏠 VOLVER</button></div>`);
            return;
        }

        mostrarPantalla(mvDashboardSupervisorHTML(lista, sede));
    }catch(err){
        console.error(err);
        mostrarPantalla(`<div style="padding:20px;"><h2>📊 SUPERVISOR</h2>❌ Error al cargar dashboard.<br><br><button class="button_1" onclick="volverInicio()">🏠 VOLVER</button></div>`);
    }
}

async function mostrarDashboardJefatura(){
    mostrarPantalla(`<div style="padding:20px;max-width:900px;margin:auto;"><h2>🌎 JEFATURA</h2>Cargando indicadores...</div>`);

    try{
        const lista = (await mvCargarRankingDashboard())
            .sort((a, b) => a.sede.localeCompare(b.sede) || b.produccion - a.produccion);

        if(lista.length === 0){
            mostrarPantalla(`<div style="padding:20px;"><h2>🌎 JEFATURA</h2>No hay información disponible.<br><br><button class="button_1" onclick="volverInicio()">🏠 VOLVER</button></div>`);
            return;
        }

        mostrarPantalla(mvDashboardJefaturaHTML(lista));
    }catch(err){
        console.error(err);
        mostrarPantalla(`<div style="padding:20px;"><h2>🌎 JEFATURA</h2>❌ Error al cargar dashboard.<br><br><button class="button_1" onclick="volverInicio()">🏠 VOLVER</button></div>`);
    }
}

/* =========================================================
   MI VISUAL v3.2 - PRODUCCIÓN TÉCNICO LIMPIA
   Quita BONO y agrupa historial por día con semáforo de puntos
========================================================= */

function mvSemaforoProduccionDia(puntos){
    if(puntos > 4.5) return "🟢";
    if(puntos >= 4) return "🟡";
    return "🔴";
}

function renderDashboardProduccion(data){
    const totalPuntos = Number(data.resumen.totalPuntos || 0);

    const dias = {};
    (data.detalle || []).forEach(r => {
        const fecha = r.fecha || "SIN FECHA";
        if(!dias[fecha]) dias[fecha] = { fecha, puntos:0, items:[] };
        const puntos = (Number(r.puntaje) || 0) * (Number(r.cantidad) || 0);
        dias[fecha].puntos += puntos;
        dias[fecha].items.push({
            tipo: r.tipo || "Trabajo registrado",
            cantidad: Number(r.cantidad) || 0,
            puntos
        });
    });

    const listaDias = Object.values(dias).sort((a, b) => {
        const fa = (a.fecha || "").split("/").reverse().join("");
        const fb = (b.fecha || "").split("/").reverse().join("");
        return fb.localeCompare(fa);
    });

    let html = `
    <div style="padding:16px;max-width:920px;margin:auto;">

        <div style="
            background:linear-gradient(135deg,#0f172a,#123c69,#0f766e);
            color:white;
            border-radius:22px;
            padding:20px;
            margin-bottom:16px;
            box-shadow:0 12px 28px rgba(0,0,0,.26);
            text-align:center;
        ">
            <div style="font-size:12px;letter-spacing:1.5px;opacity:.78;">MI VISUAL · TELECOM</div>
            <div style="font-size:24px;font-weight:900;margin-top:8px;">📊 MI PRODUCCIÓN</div>
            <div style="font-size:12px;opacity:.85;margin-top:16px;letter-spacing:.6px;">PUNTOS ACUMULADOS DEL MES</div>
            <div style="font-size:48px;font-weight:900;line-height:1;margin-top:8px;">${totalPuntos.toFixed(1)}</div>
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

        <h2 style="margin-top:18px;">📅 Historial diario</h2>
    `;

    if(listaDias.length === 0){
        html += `
            <div style="background:#1f2d48;color:white;border-radius:16px;padding:16px;margin-top:12px;">
                No hay producción registrada para tu cuadrilla.
            </div>
        `;
    }else{
        listaDias.forEach(dia => {
            const sem = mvSemaforoProduccionDia(dia.puntos);
            html += `
                <div style="
                    background:#1f2d48;
                    color:white;
                    border-radius:18px;
                    padding:15px;
                    margin:12px 0;
                    box-shadow:0 6px 16px rgba(0,0,0,.18);
                    border-left:5px solid ${mvColorSemaforo(sem)};
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <div style="font-size:16px;font-weight:900;">📅 ${dia.fecha}</div>
                        <div style="font-size:16px;font-weight:900;color:#facc15;">${sem} ${dia.puntos.toFixed(1)} pts</div>
                    </div>
                    <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,.10);padding-top:8px;">
                        ${dia.items.map(item => `
                            <div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06);">
                                <div style="font-size:13px;line-height:1.25;color:#e5f0ff;">${item.tipo}</div>
                                <div style="font-size:13px;font-weight:900;white-space:nowrap;">${item.cantidad}</div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        });
    }

    html += `
        <div style="text-align:center;margin:20px 0;">
            <button class="button_1" onclick="volverInicio()">🏠 Volver al Menú</button>
        </div>
    </div>`;

    mostrarPantalla(html);
}
