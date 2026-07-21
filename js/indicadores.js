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
    const cuadrilla = localStorage.getItem("cuadrilla") || "";
    const usuario = localStorage.getItem("usuario") || localStorage.getItem("correo") || "";
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1731471693&single=true&output=csv";
    const api = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";
    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">🎯 EFECTIVIDAD</h2><div class="mv4-loading">Cargando información...</div></div>`);

    let filas=[];let detalleVtr=[];
    try{
        const resultados=await Promise.allSettled([
            fetch(url + "&t=" + Date.now()).then(r=>r.text()),
            fetch(api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({accion:"listarDetalleVtrGarTecnico",usuario})}).then(r=>r.json())
        ]);
        if(resultados[0].status==="fulfilled")filas=resultados[0].value.split("\n");
        if(resultados[1].status==="fulfilled"&&resultados[1].value&&resultados[1].value.ok)detalleVtr=resultados[1].value.incidencias||[];
    }catch(e){}

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
        <style>.ind-vg-list{display:grid;gap:10px}.ind-vg-card{background:#fff;color:#0f172a;border-left:5px solid #ef4444;border-radius:13px;padding:12px;box-shadow:0 7px 18px rgba(2,6,23,.18)}.ind-vg-head{display:flex;justify-content:space-between;gap:8px;font-weight:900;margin-bottom:8px}.ind-vg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px;font-size:12px}.ind-vg-grid span{color:#64748b;display:block}.ind-vg-grid b{color:#111827;word-break:break-word}@media(max-width:650px){.ind-vg-grid{grid-template-columns:1fr}}</style>
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
    html += `<h2 class="mv4-section-title">📡 Detalle de VTR/GAR asignado</h2><div class="ind-vg-list">`;
    if(detalleVtr.length){
        detalleVtr.forEach(x=>{
            const esc=v=>(v==null?"":String(v)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
            html+=`<div class="ind-vg-card"><div class="ind-vg-head"><span>${esc(x.tipo)}</span><span>${esc(x.fecha)}</span></div><div class="ind-vg-grid">
              <div><span>Número de documento (DNI)</span><b>${esc(x.numeroDocumento||"-")}</b></div><div><span>Cliente</span><b>${esc(x.cliente||"-")}</b></div>
              <div><span>Código de pedido / cliente</span><b>${esc(x.codigoPedido||"-")}</b></div><div><span>Ticket</span><b>${esc(x.ticket||"-")}</b></div>
              <div style="grid-column:1/-1"><span>Tipo de partida</span><b>${esc(x.tipoPartida||"-")}</b></div>
            </div></div>`;
        });
    }else html+=`<div class="mv4-day-card"><div class="mv4-day-row"><span>No tienes VTR/GAR confirmados asignados.</span></div></div>`;
    html += `</div><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
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
    const cuadrilla = localStorage.getItem("cuadrilla") || "";
    const usuario = localStorage.getItem("usuario") || localStorage.getItem("correo") || "";
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1778246699&single=true&output=csv";
    const api = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

    mostrarPantalla(`<div class="mv4-page"><h2 class="mv4-title">📡 VTR / GAR</h2><div class="mv4-loading">Cargando información...</div></div>`);

    let filas = [];
    let detalleVtrGar = [];
    let errorDetalle = false;

    try{
        const resultados = await Promise.allSettled([
            fetch(url + "&t=" + Date.now()).then(r => r.text()),
            fetch(api, {
                method: "POST",
                headers: {"Content-Type":"text/plain;charset=utf-8"},
                body: JSON.stringify({accion:"listarDetalleVtrGarTecnico", usuario})
            }).then(r => r.json())
        ]);

        if(resultados[0].status === "fulfilled"){
            filas = resultados[0].value.split("\n");
        }

        if(resultados[1].status === "fulfilled" && resultados[1].value && resultados[1].value.ok){
            detalleVtrGar = resultados[1].value.incidencias || [];
        }else{
            errorDetalle = true;
        }
    }catch(e){
        errorDetalle = true;
    }

    const registros=[];
    let totalGar=0,totalVtr=0,totalOrd=0;

    for(let i=1;i<filas.length;i++){
        const d=filas[i].split(",");
        if(d[2] && d[2].trim() === cuadrilla.trim()){
            const fecha=d[3], ordenes=Number(d[4])||0, gar=Number(d[5])||0, vtr=Number(d[6])||0, pct=indParsePct(d[8]);
            registros.push({fecha,ordenes,gar,vtr,pct});
            totalGar+=gar;
            totalVtr+=vtr;
            totalOrd+=ordenes;
        }
    }

    const pctMes = totalOrd>0 ? ((totalGar+totalVtr)/totalOrd)*100 : 0;
    const esc = v => (v == null ? "" : String(v)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

    let html = indHero("📡", "VTR / GAR", `${indSemaforo("vtrgar", pctMes)} ${pctMes.toFixed(2)}%`, "≤ 3%", "") + `
        <style>
            .ind-vg-list{display:grid;gap:10px}
            .ind-vg-card{background:#fff;color:#0f172a;border-left:5px solid #ef4444;border-radius:13px;padding:12px;box-shadow:0 7px 18px rgba(2,6,23,.18)}
            .ind-vg-head{display:flex;justify-content:space-between;gap:8px;font-weight:900;margin-bottom:8px;align-items:center;flex-wrap:wrap}
            .ind-vg-type{display:inline-flex;align-items:center;gap:6px}
            .ind-vg-bono{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#334155}
            .ind-vg-dot{width:14px;height:14px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.3)}
            .ind-vg-dot.verde{background:#22c55e}.ind-vg-dot.amarillo{background:#facc15}.ind-vg-dot.naranja{background:#f97316}.ind-vg-dot.plomo{background:#94a3b8}
            .ind-vg-legend{display:flex;gap:9px;flex-wrap:wrap;background:#e2e8f0;color:#0f172a;border-radius:12px;padding:9px 10px;margin:10px 0 14px}
            .ind-vg-legend span{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800}
            .ind-vg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;font-size:12px}
            .ind-vg-grid span{color:#64748b;display:block;margin-bottom:2px}
            .ind-vg-grid b{color:#111827;word-break:break-word}
            @media(max-width:650px){.ind-vg-grid{grid-template-columns:1fr}}
        </style>
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

    html += `<h2 class="mv4-section-title">👤 Clientes asociados a tus VTR/GAR</h2>
        <div class="ind-vg-legend"><span><i class="ind-vg-dot verde"></i>Bono validado</span><span><i class="ind-vg-dot amarillo"></i>Validada sin bono</span><span><i class="ind-vg-dot naranja"></i>Sin registro</span><span><i class="ind-vg-dot plomo"></i>Registrada pendiente</span></div>
        <div class="ind-vg-list">`;

    if(detalleVtrGar.length){
        detalleVtrGar.forEach(x=>{
            const icono = String(x.tipo || "").toUpperCase() === "GAR" ? "🛡️" : "📺";
            const colorBono = String(x.colorBono || "NARANJA").toLowerCase();
            const etiquetaBono = x.etiquetaBono || "Sin registro";
            const detalleCoincidencia = x.coincidenciaBono === "TICKET" && Number(x.similitudTicketBono) > 0
                ? ` · ticket ${Number(x.similitudTicketBono).toFixed(0)}%`
                : (x.coincidenciaBono === "DATOS_RESPALDO" ? " · coincidencia por datos" : "");
            html += `<div class="ind-vg-card">
                <div class="ind-vg-head">
                    <span class="ind-vg-type">${icono} ${esc(x.tipo || "VTR/GAR")}</span>
                    <span class="ind-vg-bono" title="${esc(etiquetaBono + detalleCoincidencia)}"><i class="ind-vg-dot ${esc(colorBono)}"></i>${esc(etiquetaBono)}</span>
                    <span>📅 ${esc(x.fecha || "-")}</span>
                </div>
                <div class="ind-vg-grid">
                    <div><span>Número de documento (DNI)</span><b>${esc(x.numeroDocumento || "-")}</b></div>
                    <div><span>Cliente</span><b>${esc(x.cliente || "-")}</b></div>
                    <div><span>Código de pedido / cliente</span><b>${esc(x.codigoPedido || "-")}</b></div>
                    <div><span>Ticket</span><b>${esc(x.ticket || "-")}</b></div>
                    <div style="grid-column:1/-1"><span>Tipo de partida</span><b>${esc(x.tipoPartida || "-")}</b></div>
                </div>
            </div>`;
        });
    }else if(errorDetalle){
        html += `<div class="mv4-day-card"><div class="mv4-day-row"><span>No se pudo cargar el detalle de clientes. Vuelve a ingresar a esta opción.</span></div></div>`;
    }else{
        html += `<div class="mv4-day-card"><div class="mv4-day-row"><span>No tienes VTR/GAR confirmados o reasignados a tu cuadrilla.</span></div></div>`;
    }

    html += `</div><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`;
    mostrarPantalla(html);
}

