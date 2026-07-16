// MI VISUAL - Accesos v53 fix Jefatura

function normalizarDestinoAcceso(valor){
  return (valor || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function leerFilaCSV(linea){
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
  return resultado.map(x => x.trim());
}

function esPerfilJefaturaAcceso(perfil, usuario){
  const p = normalizarDestinoAcceso(perfil);
  const u = normalizarDestinoAcceso(usuario);
  return p.includes("JEFATURA") ||
         p.includes("ADMIN") ||
         p.includes("ADMINISTRADOR") ||
         u.startsWith("JEF");
}

function accesoVisiblePorDestino(destino, sede, cuadrilla, perfilUsuario, usuarioApp){
  const destinoNormalizado = normalizarDestinoAcceso(destino);
  const sedeNormalizada = normalizarDestinoAcceso(sede);
  const cuadrillaNormalizada = normalizarDestinoAcceso(cuadrilla);

  if(!destinoNormalizado) return false;

  // Jefatura/Admin tiene alcance Zona Norte.
  // No debe bloquearse por sede "TODAS" frente a destinos CHICLAYO,PIURA,TRUJILLO.
  if(esPerfilJefaturaAcceso(perfilUsuario, usuarioApp)){
    return true;
  }

  if(destinoNormalizado === "TODOS") return true;

  const destinosPermitidos = destinoNormalizado
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  return destinosPermitidos.includes(sedeNormalizada) ||
         destinosPermitidos.includes(cuadrillaNormalizada);
}

function accesoVisiblePorPerfil(perfilDestino, perfilUsuario, usuarioApp){
  const perfilDestinoNormalizado = normalizarDestinoAcceso(perfilDestino);
  const perfilUsuarioNormalizado = normalizarDestinoAcceso(perfilUsuario);

  if(!perfilDestinoNormalizado) return false;
  if(perfilDestinoNormalizado === "TODOS") return true;

  const perfilesPermitidos = perfilDestinoNormalizado
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  // Regla especial: usuario Jefatura/Admin.
  // Debe ver accesos con perfil JEFATURA/ADMIN y también los que indiquen SUPERVISOR,JEFATURA.
  if(esPerfilJefaturaAcceso(perfilUsuarioNormalizado, usuarioApp)){
    return perfilesPermitidos.includes("JEFATURA") ||
           perfilesPermitidos.includes("ADMIN") ||
           perfilesPermitidos.includes("ADMINISTRADOR") ||
           perfilDestinoNormalizado.includes("JEFATURA");
  }

  return perfilesPermitidos.includes(perfilUsuarioNormalizado);
}


function iconoRecursoPorNombre(nombre, tipo){
  const n = normalizarDestinoAcceso(nombre);
  const t = normalizarDestinoAcceso(tipo);
  if(n.includes("ASISTENCIA")) return "🗓️";
  if(n.includes("CHECK")) return "✅";
  if(n.includes("REUNION")) return "🎥";
  if(n.includes("BOT")) return "🤖";
  if(n.includes("GRUPO")) return "💬";
  if(n.includes("LIQUID")) return "💰";
  if(n.includes("EXAMEN")) return "📝";
  if(n.includes("RESULT")) return "📊";
  if(n.includes("CERTIFIC")) return "🏆";
  if(t.includes("VIDEO")) return "🎥";
  if(t.includes("PDF")) return "📄";
  if(t.includes("PPT")) return "📊";
  return "🔗";
}

function categoriaAcceso(nombre){
  const n = normalizarDestinoAcceso(nombre);
  if(n.includes("REUNION")) return "📅 Reuniones";
  if(n.includes("BOT")) return "🤖 Bots Operativos";
  if(n.includes("GRUPO")) return "💬 Grupos de Trabajo";
  if(n.includes("ASISTENCIA") || n.includes("CHECK") || n.includes("LIQUID") || n.includes("VALIDACION") || n.includes("EXAMEN") || n.includes("RESULT")) return "📋 Herramientas";
  return "🔗 Otros accesos";
}

function categoriaBiblioteca(nombre){
  const n = normalizarDestinoAcceso(nombre);
  if(n.includes("MANUAL") || n.includes("PROCED")) return "📖 Manuales y Procedimientos";
  if(n.includes("VIDEO") || n.includes("TUTORIAL")) return "🎥 Videos y Tutoriales";
  if(n.includes("SEGUR") || n.includes("EPP") || n.includes("ATS")) return "🛡️ Seguridad";
  return "📚 Documentos";
}

function categoriaCapacitacion(nombre, tipo){
  const n = normalizarDestinoAcceso(nombre);
  const t = normalizarDestinoAcceso(tipo);
  if(n.includes("EVALU") || n.includes("EXAMEN")) return "📝 Evaluaciones";
  if(n.includes("CERTIFIC") || n.includes("RESULT")) return "🏆 Certificaciones";
  if(t.includes("VIDEO")) return "🎥 Videos";
  if(t.includes("PDF") || t.includes("PPT")) return "📚 Cursos y Materiales";
  return "🎓 Capacitaciones";
}

function renderCentroRecursos(titulo, subtitulo, recursos){
  const idBusqueda = "buscarRecursos_" + Date.now();
  const grupos = {};
  recursos.forEach(r => {
    if(!grupos[r.categoria]) grupos[r.categoria] = [];
    grupos[r.categoria].push(r);
  });

  let html = `
  <div class="mv55-resource-page">
    <div class="mv55-resource-head">
      <h2>${titulo}</h2>
      <p>${subtitulo}</p>
      <input id="${idBusqueda}" class="mv55-resource-search" type="text" placeholder="🔍 Buscar recurso..." oninput="filtrarRecursosVisual('${idBusqueda}')">
    </div>
  `;

  Object.keys(grupos).forEach(cat => {
    html += `<section class="mv55-resource-group" data-resource-group>
      <h3>${cat}</h3>
      <div class="mv55-resource-grid">`;
    grupos[cat].forEach(r => {
      const dataSearch = `${r.nombre} ${r.categoria}`.replace(/"/g, "");
      html += `
        <a class="mv55-resource-item" data-resource-item data-search="${dataSearch.toUpperCase()}" href="${r.link}" target="_blank" rel="noopener">
          <span>${r.icono}</span>
          <b>${r.nombre}</b>
          <small>Abrir enlace</small>
        </a>`;
    });
    html += `</div></section>`;
  });

  if(recursos.length === 0){
    html += `<div class="mv55-resource-empty">No hay recursos disponibles para tu perfil.</div>`;
  }

  html += `</div>`;
  mostrarPantalla(html);
}

function filtrarRecursosVisual(inputId){
  const input = document.getElementById(inputId);
  const texto = normalizarDestinoAcceso(input ? input.value : "");
  const items = document.querySelectorAll('[data-resource-item]');
  items.forEach(item => {
    const search = normalizarDestinoAcceso(item.getAttribute('data-search') || '');
    item.style.display = (!texto || search.includes(texto)) ? 'flex' : 'none';
  });
  document.querySelectorAll('[data-resource-group]').forEach(group => {
    const visibles = Array.from(group.querySelectorAll('[data-resource-item]')).some(x => x.style.display !== 'none');
    group.style.display = visibles ? 'block' : 'none';
  });
}

async function mostrarAccesos(){
  const cuadrilla = localStorage.getItem("cuadrilla");
  const sede = localStorage.getItem("sede");
  const perfilUsuario = localStorage.getItem("perfil");
  const usuarioApp = localStorage.getItem("usuario");

  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=177192408&single=true&output=csv";
  const respuesta = await fetch(url + "&v=" + Date.now());
  const texto = await respuesta.text();
  const filas = texto.split("\n");
  const recursos = [];

  for(let i=1; i<filas.length; i++){
    const datos = leerFilaCSV(filas[i]);
    const destino = datos[1]?.trim();
    const perfilDestino = datos[2]?.trim();
    const nombre = datos[3]?.trim();
    const link = datos[4]?.trim();
    if(!nombre || !link) continue;

    if(accesoVisiblePorDestino(destino, sede, cuadrilla, perfilUsuario, usuarioApp) && accesoVisiblePorPerfil(perfilDestino, perfilUsuario, usuarioApp)){
      recursos.push({
        nombre,
        link,
        icono: iconoRecursoPorNombre(nombre),
        categoria: categoriaAcceso(nombre)
      });
    }
  }

  renderCentroRecursos("🚀 Accesos", "Encuentra rápidamente reuniones, bots, grupos, formatos y herramientas.", recursos);
}

async function mostrarBiblioteca(){
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1577462287&single=true&output=csv";
  const respuesta = await fetch(url + "&v=" + Date.now());
  const texto = await respuesta.text();
  const filas = texto.split("\n");
  const recursos = [];

  for(let i=1; i<filas.length; i++){
    const datos = leerFilaCSV(filas[i]);
    const nombre = datos[1]?.replace(/"/g,"").trim();
    const link = datos[2]?.replace(/"/g,"").trim();
    if(!nombre || !link) continue;
    recursos.push({
      nombre,
      link,
      icono: iconoRecursoPorNombre(nombre),
      categoria: categoriaBiblioteca(nombre)
    });
  }

  renderCentroRecursos("📚 Biblioteca", "Materiales, manuales, procedimientos y documentos de consulta.", recursos);
}

async function mostrarCapacitacion(){
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=459416480&single=true&output=csv";
  const respuesta = await fetch(url + "&v=" + Date.now());
  const texto = await respuesta.text();
  const filas = texto.split("\n");
  const recursos = [];

  for(let i=1; i<filas.length; i++){
    const datos = leerFilaCSV(filas[i]);
    const nombre = datos[1]?.replace(/"/g,"").trim();
    const tipo = datos[2]?.replace(/"/g,"").trim();
    const link = datos[3]?.replace(/"/g,"").trim();
    if(!nombre || !link) continue;
    recursos.push({
      nombre,
      link,
      icono: iconoRecursoPorNombre(nombre, tipo),
      categoria: categoriaCapacitacion(nombre, tipo)
    });
  }

  renderCentroRecursos("🎓 Capacitación", "Cursos, evaluaciones, certificaciones y material de aprendizaje.", recursos);
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
⬅️ Volver al menú
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

const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

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
                    ⬅️ Volver al menú
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

    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

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
                    ⬅️ Volver al menú
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

    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

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
                    ⬅️ Volver al menú
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

    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

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


/* =========================
   USUARIOS
========================= */

function mostrarImportarUsuarios(){

    mostrarPantalla(`
        <div style="padding:16px;max-width:1050px;margin:auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
                <div>
                    <h2 style="margin:0;">👥 ADMINISTRACIÓN DE USUARIOS</h2>
                    <p style="margin:6px 0 0;color:#cbd5e1;">Crea usuarios, perfiles y gestiona datos sin alterar la lógica actual.</p>
                </div>
                <button class="button_1" onclick="mostrarAdministracion()">⬅️ Volver a Administración</button>
            </div>

            <details class="card" open style="margin-bottom:16px;">
                <summary style="cursor:pointer;font-weight:800;font-size:17px;padding:4px 0;">👤 1. Crear nuevo usuario</summary>
                <div style="padding-top:16px;">
                    <p style="margin-top:0;">Completa los datos del usuario. Los campos marcados con * son obligatorios.</p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px;">
                        <label>Usuario *<input id="nuevoUsuario" class="usuario-admin-input" placeholder="Ej. GERENCIALIMA"></label>
                        <label>Nombres y apellidos *<input id="nuevoNombres" class="usuario-admin-input" placeholder="Nombres completos"></label>
                        <label>Correo<input id="nuevoCorreo" type="email" class="usuario-admin-input" placeholder="correo@empresa.com"></label>
                        <label>Clave *<input id="nuevoClave" type="password" class="usuario-admin-input" placeholder="Clave inicial"></label>

                        <label>Cuadrilla
                            <input id="nuevoCuadrilla" class="usuario-admin-input" list="listaCuadrillasAdmin" placeholder="Seleccione o escriba">
                        </label>
                        <label>Sede
                            <select id="nuevoSede" class="usuario-admin-input"><option value="">SIN SEDE</option></select>
                        </label>
                        <label>Plataforma
                            <select id="nuevoPlataforma" class="usuario-admin-input"><option value="">SIN PLATAFORMA</option></select>
                        </label>
                        <label>Perfil *
                            <select id="nuevoPerfil" class="usuario-admin-input" onchange="ajustarNivelNuevoUsuario()"><option value="">Cargando perfiles...</option></select>
                        </label>
                        <label>Nivel de acceso *
                            <select id="nuevoNivel" class="usuario-admin-input">
                                <option value="CUADRILLA">CUADRILLA</option>
                                <option value="SEDE">SEDE</option>
                                <option value="ZONA NORTE">ZONA NORTE</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </label>
                        <label>Supervisor
                            <select id="nuevoSupervisor" class="usuario-admin-input"><option value="">SIN SUPERVISOR</option></select>
                        </label>
                        <label>Estado
                            <select id="nuevoEstado" class="usuario-admin-input">
                                <option value="ACTIVO">ACTIVO</option>
                                <option value="SUSPENDIDO">SUSPENDIDO</option>
                                <option value="BAJA">BAJA</option>
                            </select>
                        </label>
                    </div>
                    <datalist id="listaCuadrillasAdmin"></datalist>
                    <div id="mensajeNuevoUsuario" style="margin-top:12px;font-weight:700;"></div>
                    <div style="text-align:center;margin-top:16px;">
                        <button class="button_1" onclick="crearUsuarioIndividualApp()">💾 Crear usuario</button>
                    </div>
                </div>
            </details>

            <details class="card" style="margin-bottom:16px;">
                <summary style="cursor:pointer;font-weight:800;font-size:17px;padding:4px 0;">🪪 2. Crear nuevo perfil</summary>
                <div style="padding-top:16px;">
                    <p style="margin-top:0;">El perfil se creará con todos los módulos deshabilitados. Después configúralo desde “Permisos por perfil”.</p>
                    <div style="display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:12px;align-items:end;">
                        <label>Nombre del perfil *<input id="nombrePerfilNuevo" class="usuario-admin-input" placeholder="Ej. GERENCIA GENERAL"></label>
                        <button class="button_1" onclick="crearPerfilDinamicoApp()">➕ Crear perfil</button>
                    </div>
                    <div id="mensajeNuevoPerfil" style="margin-top:12px;font-weight:700;"></div>
                </div>
            </details>

            <details class="card" style="margin-bottom:16px;">
                <summary style="cursor:pointer;font-weight:800;font-size:17px;padding:4px 0;">📥 3. Importación masiva y consulta</summary>
                <div style="padding-top:16px;">
                    <p>La importación masiva existente se conserva para actualizaciones amplias.</p>
                    <textarea id="textoUsuarios" style="width:100%;height:180px;border-radius:10px;padding:12px;box-sizing:border-box;" placeholder="Usuario    Correo    Clave    Cuadrilla    Sede    Plataforma    Perfil    Nivel de Acceso    Estado    UsuarioSupervisor"></textarea>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px;">
                        <button class="button_1" onclick="procesarUsuarios()">📥 Procesar usuarios</button>
                        <button class="button_1" onclick="listarUsuariosApp()">📋 Ver usuarios</button>
                    </div>
                    <div id="vistaPreviaUsuarios" style="margin-top:16px;"></div>
                </div>
            </details>

            <div class="card" style="margin-bottom:16px;">
                <h3 style="margin-top:0;">🔎 4. Gestionar usuario existente</h3>
                <p style="margin-top:4px;">Selecciona un usuario y luego elige la acción que deseas realizar.</p>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:end;">
                    <label>Usuario
                        <select id="usuarioGestion" class="usuario-admin-input" onchange="seleccionarUsuarioGestionApp()">
                            <option value="">Cargando usuarios...</option>
                        </select>
                    </label>
                    <label>¿Qué deseas hacer?
                        <select id="accionUsuarioGestion" class="usuario-admin-input" onchange="mostrarAccionUsuarioGestionApp()" disabled>
                            <option value="">Seleccione una acción</option>
                            <option value="CLAVE">Cambiar clave</option>
                            <option value="ESTADO">Activar / suspender / dar de baja</option>
                            <option value="PERFIL">Cambiar perfil y nivel de acceso</option>
                            <option value="DATOS">Editar datos básicos</option>
                        </select>
                    </label>
                </div>
                <div id="resumenUsuarioGestion" style="display:none;margin-top:14px;padding:12px;border-radius:10px;background:#0f2f52;color:#e2e8f0;"></div>
                <div id="mensajeGestionUsuario" style="margin-top:10px;font-weight:700;"></div>
            </div>

            <div id="panelAccionClave" class="panel-accion-usuario" style="display:none;">
                <div class="card">
                    <h3 style="margin-top:0;">🔐 Cambiar clave</h3>
                    <label style="display:block;font-weight:700;margin-bottom:6px;">Nueva clave</label>
                    <input id="claveGestion" type="password" class="usuario-admin-input" placeholder="Nueva clave">
                    <button class="button_1" style="width:100%;margin-top:12px;" onclick="cambiarClaveUsuarioApp()">🔑 Cambiar clave</button>
                </div>
            </div>

            <div id="panelAccionEstado" class="panel-accion-usuario" style="display:none;">
                <div class="card">
                    <h3 style="margin-top:0;">🛡️ Estado de la cuenta</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
                        <button class="button_1" onclick="cambiarEstadoUsuarioApp('ACTIVO')">✅ Activar</button>
                        <button class="button_1" onclick="cambiarEstadoUsuarioApp('SUSPENDIDO')">⛔ Suspender</button>
                        <button class="button_1" onclick="cambiarEstadoUsuarioApp('BAJA')">🗑️ Baja</button>
                    </div>
                </div>
            </div>

            <div id="panelAccionPerfil" class="panel-accion-usuario" style="display:none;">
                <div class="card">
                    <h3 style="margin-top:0;">🪪 Perfil y nivel de acceso</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
                        <label>Perfil
                            <select id="perfilGestion" class="usuario-admin-input" onchange="ajustarNivelAccesoPerfilUsuario()"></select>
                        </label>
                        <label>Nivel de acceso
                            <select id="nivelGestion" class="usuario-admin-input">
                                <option value="CUADRILLA">CUADRILLA</option><option value="SEDE">SEDE</option><option value="ZONA NORTE">ZONA NORTE</option><option value="ADMIN">ADMIN</option>
                            </select>
                        </label>
                    </div>
                    <button class="button_1" style="width:100%;margin-top:14px;" onclick="guardarPerfilUsuarioSeleccionado()">💾 Guardar perfil</button>
                    <p style="font-size:12px;margin:12px 0 0;color:#cbd5e1;">Los permisos específicos se configuran desde “Permisos por perfil”.</p>
                </div>
            </div>

            <div id="panelAccionDatos" class="panel-accion-usuario" style="display:none;">
                <div class="card">
                    <h3 style="margin-top:0;">✏️ Editar datos básicos</h3>
                    <p>Los datos actuales se cargan automáticamente. Modifica solo lo necesario.</p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
                        <label>Correo<input id="editCorreo" class="usuario-admin-input" placeholder="Correo"></label>
                        <label>Cuadrilla<input id="editCuadrilla" class="usuario-admin-input" list="listaCuadrillasAdmin" placeholder="Cuadrilla"></label>
                        <label>Sede<select id="editSede" class="usuario-admin-input"><option value="">SIN SEDE</option></select></label>
                        <label>Plataforma<select id="editPlataforma" class="usuario-admin-input"><option value="">SIN PLATAFORMA</option></select></label>
                        <label>Usuario Supervisor<select id="editUsuarioSupervisor" class="usuario-admin-input"><option value="">SIN SUPERVISOR</option></select></label>
                    </div>
                    <div style="text-align:center;margin-top:16px;"><button class="button_1" onclick="editarUsuarioApp()">💾 Guardar cambios básicos</button></div>
                </div>
            </div>
        </div>
        <style>
          .usuario-admin-input{width:100%;padding:11px;border-radius:8px;box-sizing:border-box;margin-top:5px;min-height:43px;}
          @media(max-width:650px){.usuario-admin-input{font-size:16px;}}
        </style>
    `);

    cargarCatalogosUsuariosAdministracion();
}

function apiUsuariosAdmin(payload){
    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";
    return fetch(url,{method:"POST",body:JSON.stringify(payload)}).then(r=>r.json());
}

function escaparOptionUsuario(txt){
    return (txt||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function cargarCatalogosUsuariosAdministracion(){
    try{
        const res=await apiUsuariosAdmin({accion:"obtenerCatalogosUsuariosAdministracion",usuarioSesion:localStorage.getItem("usuario")||""});
        if(!res.ok) throw new Error(res.error||"No se pudieron cargar los catálogos");
        const perfiles=res.perfiles||[], sedes=res.sedes||[], plataformas=res.plataformas||[], cuadrillas=res.cuadrillas||[], supervisores=res.supervisores||[];
        catalogoUsuariosAdministracionActual = Array.isArray(res.usuarios) ? res.usuarios : [];
        const perfilNuevo=document.getElementById("nuevoPerfil"), perfilGestion=document.getElementById("perfilGestion");
        const opcionesPerfil=perfiles.map(p=>`<option value="${escaparOptionUsuario(p)}">${escaparOptionUsuario(p)}</option>`).join("");
        if(perfilNuevo) perfilNuevo.innerHTML='<option value="">Seleccione perfil</option>'+opcionesPerfil;
        if(perfilGestion) perfilGestion.innerHTML=opcionesPerfil;
        const sede=document.getElementById("nuevoSede"); if(sede) sede.innerHTML='<option value="">SIN SEDE</option>'+sedes.map(x=>`<option>${escaparOptionUsuario(x)}</option>`).join("");
        const plataforma=document.getElementById("nuevoPlataforma"); if(plataforma) plataforma.innerHTML='<option value="">SIN PLATAFORMA</option>'+plataformas.map(x=>`<option>${escaparOptionUsuario(x)}</option>`).join("");
        const dl=document.getElementById("listaCuadrillasAdmin"); if(dl) dl.innerHTML=cuadrillas.map(x=>`<option value="${escaparOptionUsuario(x)}"></option>`).join("");
        const opcionesSup='<option value="">SIN SUPERVISOR</option>'+supervisores.map(x=>`<option value="${escaparOptionUsuario(x.usuario)}">${escaparOptionUsuario((x.nombresApellidos||x.usuario)+(x.sede?' · '+x.sede:''))}</option>`).join("");
        const sup=document.getElementById("nuevoSupervisor"); if(sup) sup.innerHTML=opcionesSup;
        const editSup=document.getElementById("editUsuarioSupervisor"); if(editSup) editSup.innerHTML=opcionesSup;
        const editSede=document.getElementById("editSede"); if(editSede) editSede.innerHTML='<option value="">SIN SEDE</option>'+sedes.map(x=>`<option value="${escaparOptionUsuario(x)}">${escaparOptionUsuario(x)}</option>`).join("");
        const editPlataforma=document.getElementById("editPlataforma"); if(editPlataforma) editPlataforma.innerHTML='<option value="">SIN PLATAFORMA</option>'+plataformas.map(x=>`<option value="${escaparOptionUsuario(x)}">${escaparOptionUsuario(x)}</option>`).join("");
        const usuarioGestion=document.getElementById("usuarioGestion");
        if(usuarioGestion){
            usuarioGestion.innerHTML='<option value="">Seleccione usuario</option>'+catalogoUsuariosAdministracionActual.map(x=>`<option value="${escaparOptionUsuario(x.usuario)}">${escaparOptionUsuario((x.nombresApellidos||x.usuario)+' · '+x.usuario)}</option>`).join("");
        }
        ajustarNivelNuevoUsuario(); ajustarNivelAccesoPerfilUsuario();
    }catch(err){
        const m=document.getElementById("mensajeNuevoUsuario"); if(m){m.style.color="#fecaca";m.textContent="No se pudieron cargar los catálogos: "+err.message;}
    }
}

let catalogoUsuariosAdministracionActual = [];

function obtenerUsuarioGestionSeleccionado(){
    const sel=document.getElementById("usuarioGestion");
    const codigo=sel ? (sel.value||"").trim() : "";
    return catalogoUsuariosAdministracionActual.find(x => normalizarUsuarioTexto(x.usuario).replace(/\s+/g,"") === normalizarUsuarioTexto(codigo).replace(/\s+/g,"")) || null;
}

function seleccionarUsuarioGestionApp(){
    const usuario=obtenerUsuarioGestionSeleccionado();
    const accion=document.getElementById("accionUsuarioGestion");
    const resumen=document.getElementById("resumenUsuarioGestion");
    if(accion){accion.disabled=!usuario;accion.value="";}
    document.querySelectorAll(".panel-accion-usuario").forEach(x=>x.style.display="none");
    if(!usuario){if(resumen)resumen.style.display="none";return;}
    if(resumen){
        resumen.style.display="block";
        resumen.innerHTML=`<strong>${escaparOptionUsuario(usuario.nombresApellidos||usuario.usuario)}</strong><br>
        Usuario: ${escaparOptionUsuario(usuario.usuario)} · Perfil: ${escaparOptionUsuario(usuario.perfil||"SIN PERFIL")} · Estado: ${escaparOptionUsuario(usuario.estado||"")}<br>
        Sede: ${escaparOptionUsuario(usuario.sede||"SIN SEDE")} · Cuadrilla: ${escaparOptionUsuario(usuario.cuadrilla||"SIN CUADRILLA")} · Plataforma: ${escaparOptionUsuario(usuario.plataforma||"SIN PLATAFORMA")}`;
    }
    const perfil=document.getElementById("perfilGestion"); if(perfil) perfil.value=usuario.perfil||"";
    const nivel=document.getElementById("nivelGestion"); if(nivel) nivel.value=usuario.nivelAcceso||nivelAccesoSugeridoPerfilUsuario(usuario.perfil);
    const correo=document.getElementById("editCorreo"); if(correo) correo.value=usuario.correo||"";
    const cuadrilla=document.getElementById("editCuadrilla"); if(cuadrilla) cuadrilla.value=usuario.cuadrilla||"";
    establecerValorSelectUsuario("editSede",usuario.sede||"");
    establecerValorSelectUsuario("editPlataforma",usuario.plataforma||"");
    establecerValorSelectUsuario("editUsuarioSupervisor",usuario.usuarioSupervisor||"");
}

function establecerValorSelectUsuario(id,valor){
    const sel=document.getElementById(id); if(!sel)return;
    const v=(valor||"").toString();
    if(v && !Array.from(sel.options).some(o=>o.value===v)) sel.add(new Option(v,v));
    sel.value=v;
}

function mostrarAccionUsuarioGestionApp(){
    document.querySelectorAll(".panel-accion-usuario").forEach(x=>x.style.display="none");
    const accion=document.getElementById("accionUsuarioGestion");
    if(!accion||!accion.value)return;
    const mapa={CLAVE:"panelAccionClave",ESTADO:"panelAccionEstado",PERFIL:"panelAccionPerfil",DATOS:"panelAccionDatos"};
    const panel=document.getElementById(mapa[accion.value]); if(panel)panel.style.display="block";
}

function ajustarNivelNuevoUsuario(){
    const perfil=document.getElementById("nuevoPerfil"), nivel=document.getElementById("nuevoNivel");
    if(perfil&&nivel) nivel.value=nivelAccesoSugeridoPerfilUsuario(perfil.value);
}

async function crearUsuarioIndividualApp(){
    const mensaje=document.getElementById("mensajeNuevoUsuario");
    const valor=id=>{const e=document.getElementById(id);return e?(e.value||"").trim():"";};
    const payload={accion:"registrarUsuarioIndividual",usuarioSesion:localStorage.getItem("usuario")||"",nuevoUsuario:normalizarUsuarioTexto(valor("nuevoUsuario")).replace(/\s+/g,""),nombresApellidos:valor("nuevoNombres"),correo:valor("nuevoCorreo"),clave:valor("nuevoClave"),cuadrilla:valor("nuevoCuadrilla"),sede:valor("nuevoSede"),plataforma:valor("nuevoPlataforma"),perfil:valor("nuevoPerfil"),nivelAcceso:valor("nuevoNivel"),usuarioSupervisor:valor("nuevoSupervisor"),estado:valor("nuevoEstado")||"ACTIVO"};
    if(!payload.nuevoUsuario||!payload.nombresApellidos||!payload.clave||!payload.perfil){alert("Completa Usuario, Nombres y apellidos, Clave y Perfil.");return;}
    if(mensaje){mensaje.style.color="#bfdbfe";mensaje.textContent="Guardando usuario...";}
    try{
        const res=await apiUsuariosAdmin(payload); if(!res.ok) throw new Error(res.error||"No se pudo crear el usuario");
        if(mensaje){mensaje.style.color="#22c55e";mensaje.textContent="Usuario creado correctamente: "+res.usuario;}
        ["nuevoUsuario","nuevoNombres","nuevoCorreo","nuevoClave","nuevoCuadrilla"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
    }catch(err){if(mensaje){mensaje.style.color="#ef4444";mensaje.textContent="Error: "+err.message;}else alert(err.message);}
}

async function crearPerfilDinamicoApp(){
    const input=document.getElementById("nombrePerfilNuevo"), mensaje=document.getElementById("mensajeNuevoPerfil");
    const nombre=normalizarUsuarioTexto(input?input.value:"");
    if(!nombre){alert("Ingresa el nombre del perfil.");return;}
    if(mensaje){mensaje.style.color="#bfdbfe";mensaje.textContent="Creando perfil...";}
    try{
        const res=await apiUsuariosAdmin({accion:"crearPerfilDinamico",usuarioSesion:localStorage.getItem("usuario")||"",nombrePerfil:nombre});
        if(!res.ok) throw new Error(res.error||"No se pudo crear el perfil");
        if(mensaje){mensaje.style.color="#22c55e";mensaje.textContent=`Perfil ${res.perfil} creado con ${res.modulosCreados} módulos deshabilitados.`;}
        if(input) input.value="";
        await cargarCatalogosUsuariosAdministracion();
    }catch(err){if(mensaje){mensaje.style.color="#ef4444";mensaje.textContent="Error: "+err.message;}else alert(err.message);}
}

function nivelAccesoSugeridoPerfilUsuario(perfil){
    const p = normalizarUsuarioTexto(perfil);
    if(p === "TECNICO") return "CUADRILLA";
    if(p === "SUPERVISOR" || p === "ALMACEN") return "SEDE";
    if(p === "JEFATURA" || p === "JEFATURA ALMACEN" || p === "OPERACIONES LIMA") return "ZONA NORTE";
    if(p === "ADMIN" || p === "ADMINISTRADOR") return "ADMIN";
    return "CUADRILLA";
}

function ajustarNivelAccesoPerfilUsuario(){
    const perfil = document.getElementById("perfilGestion");
    const nivel = document.getElementById("nivelGestion");
    if(!perfil || !nivel) return;
    nivel.value = nivelAccesoSugeridoPerfilUsuario(perfil.value);
}

function guardarPerfilUsuarioSeleccionado(){
    const perfil = document.getElementById("perfilGestion");
    const nivel = document.getElementById("nivelGestion");
    if(!perfil || !nivel) return;
    cambiarPermisoUsuarioApp(perfil.value, nivel.value);
}

function limpiarUsuarioCampo(txt){
    return (txt || "").toString().replace(/"/g, "").trim();
}

function normalizarUsuarioTexto(txt){
    return limpiarUsuarioCampo(txt)
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarUsuarioCuadrilla(txt){
    return limpiarUsuarioCampo(txt)
        .replace(/^P\s+(\d+)/i, "P$1")
        .replace(/\s+/g, " ")
        .trim();
}

function separarFilaUsuarios(linea){
    if(linea.includes("\t")) return linea.split("\t").map(limpiarUsuarioCampo);
    if(linea.includes(";")) return linea.split(";").map(limpiarUsuarioCampo);
    return linea.split(",").map(limpiarUsuarioCampo);
}

function indiceColumnaUsuarios(encabezados, opciones){
    return encabezados.findIndex(h => opciones.some(op => h.includes(op)));
}

function parsearUsuariosPegados(texto){
    const lineas = texto
        .replace(/\u00A0/g, " ")
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x.length > 0);

    if(lineas.length < 2){
        throw new Error("La base de usuarios no tiene suficientes filas.");
    }

    const encabezados = separarFilaUsuarios(lineas[0]).map(normalizarUsuarioTexto);

    const idxUsuario = indiceColumnaUsuarios(encabezados, ["USUARIO"]);
    const idxCorreo = indiceColumnaUsuarios(encabezados, ["CORREO", "EMAIL"]);
    const idxClave = indiceColumnaUsuarios(encabezados, ["CLAVE", "PASSWORD"]);
    const idxCuadrilla = indiceColumnaUsuarios(encabezados, ["CUADRILLA"]);
    const idxSede = indiceColumnaUsuarios(encabezados, ["SEDE"]);
    const idxPlataforma = indiceColumnaUsuarios(encabezados, ["PLATAFORMA"]);
    const idxPerfil = indiceColumnaUsuarios(encabezados, ["PERFIL"]);
    const idxNivel = indiceColumnaUsuarios(encabezados, ["NIVEL"]);
    const idxEstado = indiceColumnaUsuarios(encabezados, ["ESTADO"]);
    const idxSupervisor = indiceColumnaUsuarios(encabezados, ["USUARIOSUPERVISOR", "SUPERVISOR"]);

    if(idxUsuario === -1 || idxClave === -1 || idxCuadrilla === -1){
        throw new Error("La base debe tener como mínimo: Usuario, Clave y Cuadrilla.");
    }

    const registros = [];

    for(let i = 1; i < lineas.length; i++){
        const c = separarFilaUsuarios(lineas[i]);
        const usuario = normalizarUsuarioTexto(c[idxUsuario]).replace(/\s+/g, "");

        if(!usuario) continue;

        registros.push({
            usuario: usuario,
            correo: idxCorreo >= 0 ? limpiarUsuarioCampo(c[idxCorreo]) : "",
            clave: idxClave >= 0 ? limpiarUsuarioCampo(c[idxClave]) : "",
            cuadrilla: idxCuadrilla >= 0 ? normalizarUsuarioCuadrilla(c[idxCuadrilla]) : "",
            sede: idxSede >= 0 ? normalizarUsuarioTexto(c[idxSede]) : "",
            plataforma: idxPlataforma >= 0 ? normalizarUsuarioTexto(c[idxPlataforma]) : "",
            perfil: idxPerfil >= 0 ? normalizarUsuarioTexto(c[idxPerfil]) : "TECNICO",
            nivelAcceso: idxNivel >= 0 ? normalizarUsuarioTexto(c[idxNivel]) : "CUADRILLA",
            estado: idxEstado >= 0 ? normalizarUsuarioTexto(c[idxEstado]) : "ACTIVO",
            usuarioSupervisor: idxSupervisor >= 0 ? normalizarUsuarioTexto(c[idxSupervisor]) : ""
        });
    }

    return registros;
}

async function procesarUsuarios(){
    const texto = document.getElementById("textoUsuarios").value;

    try{
        const registros = parsearUsuariosPegados(texto);

        if(registros.length === 0){
            alert("No se encontraron usuarios válidos.");
            return;
        }

        let html = `
            <h3>✅ Vista previa (${registros.length} usuarios)</h3>
            <table style="width:100%;border-collapse:collapse;background:white;color:black;font-size:12px;">
                <tr style="background:#1f4e79;color:white;">
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Cuadrilla</th>
                    <th>Sede</th>
                    <th>Plataforma</th>
                    <th>Perfil</th>
                    <th>Nivel</th>
                    <th>Estado</th>
                </tr>
        `;

        registros.slice(0, 50).forEach(r => {
            html += `
                <tr>
                    <td>${r.usuario}</td>
                    <td>${r.correo}</td>
                    <td>${r.cuadrilla}</td>
                    <td>${r.sede}</td>
                    <td>${r.plataforma}</td>
                    <td>${r.perfil}</td>
                    <td>${r.nivelAcceso}</td>
                    <td>${r.estado}</td>
                </tr>
            `;
        });

        html += `</table>`;
        document.getElementById("vistaPreviaUsuarios").innerHTML = html;

        const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                accion: "procesarUsuarios",
                registros: registros
            })
        });

        const res = JSON.parse(await respuesta.text());

        if(res.ok){
            alert("✅ USUARIOS ACTUALIZADOS\n\nRegistros: " + res.registros);
        }else{
            alert("❌ Error: " + res.error);
        }

    }catch(err){
        console.error(err);
        alert("❌ " + err.message);
    }
}

async function enviarAccionUsuario(payload, mensajeOk){
    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

    try{
        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const res = JSON.parse(await respuesta.text());

        if(res.ok){
            alert("✅ " + mensajeOk);
        }else{
            alert("❌ Error: " + res.error);
        }
    }catch(err){
        console.error(err);
        alert("❌ Error al conectar con la API de usuarios.");
    }
}

function obtenerUsuarioGestion(){
    const usuario = normalizarUsuarioTexto(document.getElementById("usuarioGestion").value).replace(/\s+/g, "");
    if(!usuario){
        alert("Ingresa el usuario a gestionar.");
        return "";
    }
    return usuario;
}

function cambiarClaveUsuarioApp(){
    const usuario = obtenerUsuarioGestion();
    if(!usuario) return;

    const nuevaClave = limpiarUsuarioCampo(document.getElementById("claveGestion").value);
    if(!nuevaClave){
        alert("Ingresa la nueva clave.");
        return;
    }

    enviarAccionUsuario({
        accion: "cambiarClave",
        usuario: usuario,
        nuevaClave: nuevaClave
    }, "Clave actualizada para " + usuario);
}

function cambiarEstadoUsuarioApp(estado){
    const usuario = obtenerUsuarioGestion();
    if(!usuario) return;

    enviarAccionUsuario({
        accion: "cambiarEstadoUsuario",
        usuario: usuario,
        estado: estado
    }, "Usuario " + usuario + " actualizado a estado " + estado);
}

function cambiarPermisoUsuarioApp(perfil, nivelAcceso){
    const usuario = obtenerUsuarioGestion();
    if(!usuario) return;

    enviarAccionUsuario({
        accion: "cambiarPermisoUsuario",
        usuario: usuario,
        perfil: perfil,
        nivelAcceso: nivelAcceso
    }, "Permiso actualizado para " + usuario + ": " + perfil + " / " + nivelAcceso);
}

function editarUsuarioApp(){
    const usuario = obtenerUsuarioGestion();
    if(!usuario) return;

    const cambios = {};

    const correo = limpiarUsuarioCampo(document.getElementById("editCorreo").value);
    const cuadrilla = limpiarUsuarioCampo(document.getElementById("editCuadrilla").value);
    const sede = limpiarUsuarioCampo(document.getElementById("editSede").value);
    const plataforma = limpiarUsuarioCampo(document.getElementById("editPlataforma").value);
    const usuarioSupervisor = limpiarUsuarioCampo(document.getElementById("editUsuarioSupervisor").value);

    if(correo) cambios.correo = correo;
    if(cuadrilla) cambios.cuadrilla = normalizarUsuarioCuadrilla(cuadrilla);
    if(sede) cambios.sede = sede;
    if(plataforma) cambios.plataforma = plataforma;
    if(usuarioSupervisor) cambios.usuarioSupervisor = usuarioSupervisor;

    if(Object.keys(cambios).length === 0){
        alert("Llena al menos un dato para editar.");
        return;
    }

    enviarAccionUsuario({
        accion: "editarUsuario",
        usuario: usuario,
        cambios: cambios
    }, "Datos actualizados para " + usuario);
}

async function listarUsuariosApp(){
    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

    try{
        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify({ accion: "listarUsuarios" })
        });

        const res = JSON.parse(await respuesta.text());

        if(!res.ok){
            alert("❌ Error: " + res.error);
            return;
        }

        const usuarios = res.usuarios || [];

        let html = `
            <h3>📋 Usuarios registrados (${usuarios.length})</h3>
            <table style="width:100%;border-collapse:collapse;background:white;color:black;font-size:12px;">
                <tr style="background:#1f4e79;color:white;">
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Cuadrilla</th>
                    <th>Sede</th>
                    <th>Perfil</th>
                    <th>Nivel</th>
                    <th>Estado</th>
                </tr>
        `;

        usuarios.forEach(u => {
            html += `
                <tr>
                    <td>${u.usuario}</td>
                    <td>${u.correo}</td>
                    <td>${u.cuadrilla}</td>
                    <td>${u.sede}</td>
                    <td>${u.perfil}</td>
                    <td>${u.nivelAcceso}</td>
                    <td>${u.estado}</td>
                </tr>
            `;
        });

        html += `</table>`;
        document.getElementById("vistaPreviaUsuarios").innerHTML = html;

    }catch(err){
        console.error(err);
        alert("❌ Error al listar usuarios.");
    }
}

/* =========================
   RANKING
========================= */

function fechaHoyRanking(){
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function mostrarImportarRanking(){

    mostrarPantalla(`
        <div style="padding:20px;max-width:900px;margin:auto;">
            <h2 style="text-align:center;">🏆 ACTUALIZAR RANKING</h2>
            <br>

            <div class="card">
                Este proceso genera el ranking usando las bases ya actualizadas:
                <br><br>
                ✅ Producción<br>
                ✅ Efectividad<br>
                ✅ % Recableado<br>
                ✅ VTR/GAR
                <br><br>

                <div style="
                    background:#12395c;
                    padding:14px;
                    border-radius:10px;
                    line-height:1.4;
                ">
                    📅 El período y la fecha de actualización se tomarán automáticamente
                    desde las fechas registradas en Producción y Efectividad.
                </div>

                <br>

                <button class="button_1" onclick="procesarRanking()">
                    🏆 GENERAR RANKING
                </button>

                &nbsp;

                <button class="button_1" onclick="mostrarAdministracion()">
                    ⬅️ Volver al menú
                </button>

                <br><br>

                <div id="resultadoRankingAdmin"></div>
            </div>
        </div>
    `);
}

async function procesarRanking(){

    const url = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

    try{
        const contenedor = document.getElementById("resultadoRankingAdmin");
        contenedor.innerHTML = "⏳ Generando ranking...";

        const respuesta = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                accion: "actualizarRanking"
            })
        });

        const textoRespuesta = await respuesta.text();
        const res = JSON.parse(textoRespuesta);

        if(res.ok){
            contenedor.innerHTML = `
                <div style="padding:15px;border-radius:10px;background:#12395c;margin-top:10px;">
                    ✅ <b>RANKING ACTUALIZADO</b><br><br>
                    Registros: ${res.registros}<br>
                    Período: ${res.periodo}<br>
                    Actualizado al: ${res.actualizadoAl}<br>
                    Primero Región: ${res.primeroRegion || ""}
                </div>
            `;

            alert(
                "✅ RANKING ACTUALIZADO" +
                "\n\nRegistros: " + res.registros +
                "\n\nPeríodo: " + res.periodo +
                "\n\nActualizado al: " + res.actualizadoAl +
                "\n\nPrimero Región: " + (res.primeroRegion || "")
            );
        }else{
            contenedor.innerHTML = "❌ Error: " + res.error;
            alert("❌ Error: " + res.error);
        }

    }catch(err){
        console.error(err);
        alert("❌ Error al conectar con la API de ranking.");
    }
}

