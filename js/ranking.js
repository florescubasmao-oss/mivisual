// MI VISUAL - archivo modularizado

async function mostrarRanking(){

const cuadrilla = localStorage.getItem("cuadrilla");

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1269910675&single=true&output=csv";

const respuesta = await fetch(url);
const texto = await respuesta.text();

const filas = texto.split("\n");

let resultado = "<h3>🏆 RANKING</h3>";

for(let i=1; i<filas.length; i++){

const datos = filas[i].split(",");

if(datos[1] && datos[1].trim() === cuadrilla.trim()){

let fecha = datos[2];
let puestoSede = datos[4];
let puestoRegion = datos[5];
let puestoPlataforma = datos[6];
let totalSede = 9;
let totalRegion = 24;
let totalPlataforma = 12;
let barraSede = ((totalSede - puestoSede + 1) / totalSede) * 100;
let barraRegion = ((totalRegion - puestoRegion + 1) / totalRegion) * 100;
let barraPlataforma = ((totalPlataforma - puestoPlataforma + 1) / totalPlataforma) * 100;
  
let iconoSede = "🏅";
if(puestoSede == 1) iconoSede = "🥇";
else if(puestoSede == 2) iconoSede = "🥈";
else if(puestoSede == 3) iconoSede = "🥉";

let iconoRegion = "🏅";
if(puestoRegion == 1) iconoRegion = "🥇";
else if(puestoRegion == 2) iconoRegion = "🥈";
else if(puestoRegion == 3) iconoRegion = "🥉";

let iconoPlataforma = "🏅";
if(puestoPlataforma == 1) iconoPlataforma = "🥇";
else if(puestoPlataforma == 2) iconoPlataforma = "🥈";
else if(puestoPlataforma == 3) iconoPlataforma = "🥉";

resultado += `
<div style="
background:#1f2d48;
padding:20px;
margin:10px 0;
border-radius:10px;
text-align:center;
">

<h4>📅 Actualizado al ${fecha}</h4>

<hr>

${iconoSede} Mi Puesto Sede

<h2>#${puestoSede}</h2>

<div style="
width:100%;
background:#334155;
height:12px;
border-radius:10px;
margin-top:10px;
">

<div style="
width:${barraSede}%;
background:#22c55e;
height:12px;
border-radius:10px;
">
</div>

</div>


<hr>

${iconoRegion} Mi Puesto Región

<h2>#${puestoRegion}</h2>

<div style="
width:100%;
background:#334155;
height:12px;
border-radius:10px;
margin-top:10px;
">

<div style="
width:${barraSede}%;
background:#22c55e;
height:12px;
border-radius:10px;
">
</div>

</div>


<hr>

${iconoPlataforma} Mi Puesto Plataforma

<h2>#${puestoPlataforma}</h2>


<div style="
width:100%;
background:#334155;
height:12px;
border-radius:10px;
margin-top:10px;
">

<div style="
width:${barraSede}%;
background:#22c55e;
height:12px;
border-radius:10px;
">
</div>

</div>


</div>
`;

break;
}

}

mostrarPantalla(resultado);

}
