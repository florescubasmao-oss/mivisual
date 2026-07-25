/* =====================================================
   MI VISUAL V271 - Consulta de plantilla de orden
   Consulta de solo lectura desde MAPA_ORDENES.
   ===================================================== */
const API_PLANTILLA_ORDEN = (window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec");

function poEsc(valor){
  return String(valor == null ? "" : valor)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function poUsuario(){
  return localStorage.getItem("usuario") || localStorage.getItem("correo") || "";
}

async function poApi(payload){
  const respuesta = await fetch(API_PLANTILLA_ORDEN, {
    method:"POST",
    body:JSON.stringify(payload)
  });
  const data = await respuesta.json();
  if(!data.ok) throw new Error(data.error || "No se pudo consultar la plantilla");
  return data;
}

function mostrarPlantillaOrden(){
  const html = `
    <section class="po-page">
      <div class="po-head">
        <div>
          <h2>Consulta de plantilla</h2>
          <p>Ingrese el código de cliente. Se mostrará la orden más reciente permitida para su perfil.</p>
        </div>
      </div>
      <div class="po-search-card">
        <label for="poCodigoCliente">Código de cliente</label>
        <div class="po-search-row">
          <input id="poCodigoCliente" inputmode="numeric" autocomplete="off" placeholder="Ej.: 3066939" onkeydown="if(event.key==='Enter'){consultarPlantillaOrden();}">
          <button type="button" onclick="consultarPlantillaOrden()">Buscar</button>
        </div>
        <div id="poEstado" class="po-status">Ingrese un código para consultar.</div>
      </div>
      <div id="poResultado"></div>
    </section>`;
  if(typeof mostrarPantalla === "function") mostrarPantalla(html);
  else {
    const pantalla = document.getElementById("pantalla");
    const menu = document.getElementById("menuPrincipal");
    if(menu) menu.style.display = "none";
    if(pantalla) pantalla.innerHTML = html;
    if(typeof setBotonNavegacion === "function") setBotonNavegacion("modulo");
  }
  const input = document.getElementById("poCodigoCliente");
  if(input) input.focus();
  window.scrollTo({top:0,behavior:"smooth"});
}

async function consultarPlantillaOrden(){
  const input = document.getElementById("poCodigoCliente");
  const estado = document.getElementById("poEstado");
  const resultado = document.getElementById("poResultado");
  const codigo = String(input?.value || "").replace(/\s+/g,"").trim();
  if(!codigo){
    if(estado) estado.textContent = "Ingrese el código de cliente.";
    if(input) input.focus();
    return;
  }
  if(estado){ estado.className="po-status loading"; estado.textContent="Buscando la orden más reciente..."; }
  if(resultado) resultado.innerHTML = "";
  try{
    const data = await poApi({accion:"consultarPlantillaOrden",usuario:poUsuario(),codigoCliente:codigo});
    const coincidencias = Number(data.coincidencias || 1);
    if(estado){
      estado.className="po-status ok";
      estado.textContent = coincidencias > 1
        ? `Se encontraron ${coincidencias} órdenes permitidas. Se muestra la más reciente.`
        : "Orden encontrada.";
    }
    renderPlantillaOrden(data.orden || {}, data.plantilla || "");
  }catch(error){
    if(estado){ estado.className="po-status error"; estado.textContent=error.message; }
  }
}

function renderPlantillaOrden(orden, plantilla){
  const resultado = document.getElementById("poResultado");
  if(!resultado) return;
  const latitud = Number(orden.latitud);
  const longitud = Number(orden.longitud);
  const tieneUbicacion = Number.isFinite(latitud) && Number.isFinite(longitud);
  resultado.innerHTML = `
    <section class="po-result-card">
      <div class="po-result-top">
        <div>
          <b>Plantilla encontrada</b>
          <small>${poEsc(orden.fechaSolicitud || "")} ${poEsc(orden.horaSolicitud || "")} · ${poEsc(orden.estado || "")}</small>
        </div>
        <span>${poEsc(orden.codigoCliente || "")}</span>
      </div>
      <textarea id="poTextoPlantilla" class="po-text" readonly spellcheck="false">${poEsc(plantilla)}</textarea>
      <div class="po-actions">
        <button class="po-primary" type="button" onclick="copiarPlantillaCompleta()">Copiar plantilla completa</button>
        <button type="button" onclick="copiarSeleccionPlantilla()">Copiar selección</button>
        <button type="button" onclick="nuevaBusquedaPlantilla()">Nueva búsqueda</button>
        <button type="button" ${tieneUbicacion ? "" : "disabled"} onclick="verUbicacionPlantilla(${latitud},${longitud})">Ver ubicación</button>
      </div>
    </section>`;
}

async function poCopiarTexto(texto){
  if(navigator.clipboard && window.isSecureContext){
    await navigator.clipboard.writeText(texto);
    return;
  }
  const temporal=document.createElement("textarea");
  temporal.value=texto;
  temporal.style.position="fixed";
  temporal.style.opacity="0";
  document.body.appendChild(temporal);
  temporal.select();
  document.execCommand("copy");
  temporal.remove();
}

async function copiarPlantillaCompleta(){
  const campo=document.getElementById("poTextoPlantilla");
  if(!campo) return;
  try{ await poCopiarTexto(campo.value); alert("Plantilla copiada."); }
  catch(e){ alert("No se pudo copiar automáticamente. Mantenga presionado sobre el texto y seleccione Copiar."); }
}

async function copiarSeleccionPlantilla(){
  const campo=document.getElementById("poTextoPlantilla");
  if(!campo) return;
  const inicio=campo.selectionStart;
  const fin=campo.selectionEnd;
  if(fin <= inicio){
    campo.focus();
    alert("Seleccione primero la parte de la plantilla que desea copiar.");
    return;
  }
  try{ await poCopiarTexto(campo.value.slice(inicio,fin)); alert("Selección copiada."); }
  catch(e){ alert("No se pudo copiar automáticamente."); }
}

function nuevaBusquedaPlantilla(){
  const input=document.getElementById("poCodigoCliente");
  const estado=document.getElementById("poEstado");
  const resultado=document.getElementById("poResultado");
  if(input){ input.value=""; input.focus(); }
  if(estado){ estado.className="po-status"; estado.textContent="Ingrese un código para consultar."; }
  if(resultado) resultado.innerHTML="";
  window.scrollTo({top:0,behavior:"smooth"});
}

function verUbicacionPlantilla(latitud,longitud){
  if(latitud === "" || longitud === "") return;
  window.open(`https://www.google.com/maps?q=${encodeURIComponent(latitud)},${encodeURIComponent(longitud)}`,"_blank","noopener");
}

window.mostrarPlantillaOrden=mostrarPlantillaOrden;
window.consultarPlantillaOrden=consultarPlantillaOrden;
window.copiarPlantillaCompleta=copiarPlantillaCompleta;
window.copiarSeleccionPlantilla=copiarSeleccionPlantilla;
window.nuevaBusquedaPlantilla=nuevaBusquedaPlantilla;
window.verUbicacionPlantilla=verUbicacionPlantilla;
