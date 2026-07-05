console.log("INDICADORES.JS CARGADO");

async function mostrarEfectividad(){

document.getElementById("menuPrincipal").style.display = "none";

const cuadrilla = localStorage.getItem("cuadrilla");

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1731471693&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

const encabezado = filas[0];
const datosFilas = filas.slice(1).reverse();

filas.length = 0;
filas.push(encabezado, ...datosFilas);

let totalFinalizadas = 0;
let totalGeneral = 0;

let resultado = `

<h3>🎯 EFECTIVIDAD</h3>
`;

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

if(datos[2] && datos[2].trim() === cuadrilla.trim()){

let finalizadas = Number(datos[4]) || 0;
let canceladas = Number(datos[5]) || 0;
let regestion = Number(datos[6]) || 0;
let reprogramado = Number(datos[7]) || 0;
let total = Number(datos[8]) || 0;

let efectividad = 0;

if(total > 0){
efectividad = (finalizadas / total) * 100;
}

totalFinalizadas += finalizadas;
totalGeneral += total;

let semaforo = "🔴";

if(efectividad >= 75){
semaforo = "🟢";
}
else if(efectividad >= 65){
semaforo = "🟡";
}

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
">

<h4>📅 ${datos[3]}</h4>

<div style="font-size:20px;font-weight:bold;">
${semaforo} ${efectividad.toFixed(2)}%
</div>

<hr>

✅ Finalizadas: ${finalizadas}<br>
❌ Canceladas: ${canceladas}<br>
🔄 Regestión: ${regestion}<br>
📆 Reprogramado: ${reprogramado}

</div>
`;
}
}

let efectividadMes = 0;

if(totalGeneral > 0){
efectividadMes = (totalFinalizadas / totalGeneral) * 100;
}

let colorMes = "🔴";

if(efectividadMes >= 75){
colorMes = "🟢";
}
else if(efectividadMes >= 65){
colorMes = "🟡";
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

🎯 RESUMEN DEL MES

<br><br>

${colorMes} Efectividad: ${efectividadMes.toFixed(2)}%

</div>
`
+ resultado;

mostrarPantalla(resultado);

}

async function mostrarRecableado(){

document.getElementById("menuPrincipal").style.display = "none";

const cuadrilla = localStorage.getItem("cuadrilla");

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=317412212&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

const encabezado = filas[0];
const datosFilas = filas.slice(1).reverse();

filas.length = 0;
filas.push(encabezado, ...datosFilas);

let totalLosRojos = 0;
let totalRecableados = 0;

let resultado = "<h3>🔧 % RECABLEADO</h3>";

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

if(datos[2] && datos[2].trim() === cuadrilla.trim()){

let fecha = datos[3];
let losRojos = Number(datos[4]) || 0;
let recableados = Number(datos[5]) || 0;
let porcentaje = Number(datos[6]) || 0;

totalLosRojos += losRojos;
totalRecableados += recableados;

let semaforo = "🟢";

if(porcentaje >= 55){
semaforo = "🔴";
}
else if(porcentaje >= 42){
semaforo = "🟠";
}
else if(porcentaje >= 22){
semaforo = "🟡";
}

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
">

<h4>📅 Actualizado al ${fecha}</h4>

<hr>

🔴 LOS Rojos: ${losRojos}<br>
🔧 Recableados: ${recableados}

</div>
`;
}
}

let porcentajeMes = 0;

if(totalLosRojos > 0){
porcentajeMes = (totalRecableados / totalLosRojos) * 100;
}

let colorMes = "🟢";

if(porcentajeMes >= 55){
colorMes = "🔴";
}
else if(porcentajeMes >= 42){
colorMes = "🟠";
}
else if(porcentajeMes >= 22){
colorMes = "🟡";
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

🔧 RESUMEN DEL MES

<br><br>

${colorMes} Recableado: ${porcentajeMes.toFixed(2)}%<br><br>

</div>
`
+ resultado;

mostrarPantalla(resultado);

}

async function mostrarVTRGAR() {

document.getElementById("menuPrincipal").style.display = "none";

const cuadrilla = localStorage.getItem("cuadrilla");

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1778246699&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

const encabezado = filas[0];
const datosFilas = filas.slice(1).reverse();

filas.length = 0;
filas.push(encabezado, ...datosFilas);

let totalGAR = 0;
let totalVTR = 0;
let totalOrdenes = 0;

let resultado = "<h3>📈 % VTR / GAR</h3>";

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

if(datos[2] && datos[2].trim() === cuadrilla.trim()){

let fecha = datos[3];
let ordenes = Number(datos[4]) || 0;
let gar = Number(datos[5]) || 0;
let vtr = Number(datos[6]) || 0;
let totalGarVtr = Number(datos[7]) || 0;
let porcentaje = Number(datos[8]) || 0;

porcentaje = porcentaje * 100;

totalGAR += gar;
totalVTR += vtr;
totalOrdenes += ordenes;

let semaforo = "🟢";

if(porcentaje >= 7){
semaforo = "🔴";
}
else if(porcentaje >= 4){
semaforo = "🟠";
}
else if(porcentaje >= 1){
semaforo = "🟡";
}

resultado += `
<div style="
background:#1f2d48;
padding:15px;
margin:10px 0;
border-radius:10px;
">

<h4>📅 Actualizado al ${fecha}</h4>

<hr>


</div>
`;
}
}

let porcentajeMes = 0;

if(totalOrdenes > 0){
porcentajeMes = ((totalGAR + totalVTR) / totalOrdenes) * 100;
}

let colorMes = "🟢";

if(porcentajeMes >= 7){
colorMes = "🔴";
}
else if(porcentajeMes >= 4){
colorMes = "🟠";
}
else if(porcentajeMes >= 1){
colorMes = "🟡";
}

resultado =
`
<div style="
background:#1f2d48;
padding:15px;
margin-bottom:15px;
border-radius:10px;
color:white;
font-weight:bold;
">

📈 RESUMEN DEL MES

<br><br>

${colorMes} VTR / GAR: ${porcentajeMes.toFixed(2)}%<br><br>

🛡️ GAR: ${totalGAR}<br>
📺 VTR: ${totalVTR}<br>
✅ Finalizadas: ${totalOrdenes}

</div>
`
+ resultado;

mostrarPantalla(resultado);

}
