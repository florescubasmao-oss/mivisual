// MI VISUAL - archivo modularizado

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

/* =====================================================
   MI VISUAL v4.0 - INDICADORES TÉCNICO TELCO
===================================================== */

function indParsePct(valor){
    const n = Number((valor || "").toString().replace("%", "").replace(/,/g, "."));
    if(isNaN(n)) return 0;
    return n <= 1 ? n * 100 : n;
}
function indSemaforo(tipo, valor){
    const v = Number(valor) || 0;
    if(tipo === "efectividad") return v >= 70 ? "🟢" : "🔴";
    if(tipo === "recableado") return v <= 42 ? "🟢" : "🔴";
    if(tipo === "vtrgar") return v <= 3 ? "🟢" : "🔴";
    return "🔴";
}
function indHero(icono, titulo, valor, meta, tipo){
    return `
    <div class="mv4-page">
        <h2 class="mv4-title">${icono} ${titulo}</h2>
        <div class="mv4-hero-card">
            <div class="mv4-hero-label">RESULTADO DEL MES</div>
            <div class="mv4-hero-value">${valor}</div>
            <div class="mv4-hero-meta">🎯 Meta: ${meta} <span class="mv4-status-inline">${tipo}</span></div>
        </div>`;
}
function indMini(icono, titulo, valor){
    return `<div class="mv4-mini-kpi"><div>${icono}</div><span>${titulo}</span><b>${valor}</b></div>`;
}
function indHist(fecha, valor, sem, filas){
    return `<div class="mv4-day-card"><div class="mv4-day-head"><b>📅 ${fecha}</b><span>${sem} ${valor}</span></div>${filas}</div>`;
}

async function mostrarEfectividad(){
    document.getElementById("menuPrincipal").style.display = "none";
    const cuadrilla = localStorage.getItem("cuadrilla");
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1731471693&single=true&output=csv";
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">🎯 EFECTIVIDAD</h2><div class="mv4-loading">Cargando información...</div></div>`);
    const respuesta = await fetch(url + "&t=" + Date.now());
    const filas = (await respuesta.text()).split("\n");
    const registros = [];
    let totalFinalizadas = 0, totalGeneral = 0, totalCanceladas = 0, totalRegestion = 0, totalReprogramado = 0;
    for(let i=1;i<filas.length;i++){
        const d = filas[i].split(",");
        if(d[2] && d[2].trim() === cuadrilla.trim()){
            const finalizadas = Number(d[4])||0, canceladas=Number(d[5])||0, regestion=Number(d[6])||0, reprogramado=Number(d[7])||0, total=Number(d[8])||0;
            const ef = total > 0 ? (finalizadas/total)*100 : 0;
            registros.push({fecha:d[3], finalizadas, canceladas, regestion, reprogramado, total, ef});
            totalFinalizadas += finalizadas; totalGeneral += total; totalCanceladas += canceladas; totalRegestion += regestion; totalReprogramado += reprogramado;
        }
    }
    const efMes = totalGeneral > 0 ? (totalFinalizadas/totalGeneral)*100 : 0;
    let html = indHero("🎯", "EFECTIVIDAD", `${indSemaforo("efectividad", efMes)} ${efMes.toFixed(2)}%`, "≥ 70%", "") + `
        <div class="mv4-kpi-grid">
            ${indMini("✅","Finalizadas",totalFinalizadas)}
            ${indMini("❌","Canceladas",totalCanceladas)}
            ${indMini("🔄","Regestión",totalRegestion)}
            ${indMini("📅","Reprogramadas",totalReprogramado)}
        </div>
        <h2 class="mv4-section-title">📅 Historial</h2>`;
    registros.reverse().forEach(r => {
        html += indHist(r.fecha, r.ef.toFixed(2)+"%", indSemaforo("efectividad", r.ef), `
            <div class="mv4-day-row"><span>Finalizadas</span><b>${r.finalizadas}</b></div>
            <div class="mv4-day-row"><span>Total general</span><b>${r.total}</b></div>`);
    });
    html += `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}

async function mostrarRecableado(){
    document.getElementById("menuPrincipal").style.display = "none";
    const cuadrilla = localStorage.getItem("cuadrilla");
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=317412212&single=true&output=csv";
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">🔧 RECABLEADO</h2><div class="mv4-loading">Cargando información...</div></div>`);
    const respuesta = await fetch(url + "&t=" + Date.now());
    const filas = (await respuesta.text()).split("\n");
    const registros=[]; let totalRojos=0,totalRec=0;
    for(let i=1;i<filas.length;i++){
        const d=filas[i].split(",");
        if(d[2] && d[2].trim() === cuadrilla.trim()){
            const fecha=d[3], rojos=Number(d[4])||0, rec=Number(d[5])||0, pct=indParsePct(d[6]);
            registros.push({fecha,rojos,rec,pct}); totalRojos+=rojos; totalRec+=rec;
        }
    }
    const pctMes = totalRojos>0 ? (totalRec/totalRojos)*100 : 0;
    let html = indHero("🔧", "RECABLEADO", `${indSemaforo("recableado", pctMes)} ${pctMes.toFixed(2)}%`, "≤ 42%", "") + `
        <div class="mv4-kpi-grid">
            ${indMini("🔴","Los Rojos",totalRojos)}
            ${indMini("🔧","Recableados",totalRec)}
        </div>
        <h2 class="mv4-section-title">📅 Historial</h2>`;
    registros.reverse().forEach(r=>{
        html += indHist(r.fecha, r.pct.toFixed(2)+"%", indSemaforo("recableado", r.pct), `
            <div class="mv4-day-row"><span>Los Rojos</span><b>${r.rojos}</b></div>
            <div class="mv4-day-row"><span>Recableados</span><b>${r.rec}</b></div>`);
    });
    html += `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}

async function mostrarVTRGAR(){
    document.getElementById("menuPrincipal").style.display = "none";
    const cuadrilla = localStorage.getItem("cuadrilla");
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1778246699&single=true&output=csv";
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">📡 VTR / GAR</h2><div class="mv4-loading">Cargando información...</div></div>`);
    const respuesta = await fetch(url + "&t=" + Date.now());
    const filas = (await respuesta.text()).split("\n");
    const registros=[]; let totalGar=0,totalVtr=0,totalOrd=0;
    for(let i=1;i<filas.length;i++){
        const d=filas[i].split(",");
        if(d[2] && d[2].trim() === cuadrilla.trim()){
            const fecha=d[3], ordenes=Number(d[4])||0, gar=Number(d[5])||0, vtr=Number(d[6])||0, pct=indParsePct(d[8]);
            registros.push({fecha,ordenes,gar,vtr,pct}); totalGar+=gar; totalVtr+=vtr; totalOrd+=ordenes;
        }
    }
    const pctMes = totalOrd>0 ? ((totalGar+totalVtr)/totalOrd)*100 : 0;
    let html = indHero("📡", "VTR / GAR", `${indSemaforo("vtrgar", pctMes)} ${pctMes.toFixed(2)}%`, "≤ 3%", "") + `
        <div class="mv4-kpi-grid">
            ${indMini("🛡️","GAR",totalGar)}
            ${indMini("📺","VTR",totalVtr)}
            ${indMini("✅","Finalizadas",totalOrd)}
        </div>
        <h2 class="mv4-section-title">📅 Historial</h2>`;
    registros.reverse().forEach(r=>{
        html += indHist(r.fecha, r.pct.toFixed(2)+"%", indSemaforo("vtrgar", r.pct), `
            <div class="mv4-day-row"><span>GAR</span><b>${r.gar}</b></div>
            <div class="mv4-day-row"><span>VTR</span><b>${r.vtr}</b></div>
            <div class="mv4-day-row"><span>Finalizadas</span><b>${r.ordenes}</b></div>`);
    });
    html += `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}
