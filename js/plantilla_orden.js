/* =====================================================
   MI VISUAL V404 - Consulta de plantilla + CTO cercanas
   - Busca por Código de cliente, DNI, Código de orden o Código de pedido.
   - Presentación dinámica por secciones, sin alterar la fuente MAPA_ORDENES.
   - CTO cercanas: GPS, coordenadas manuales o punto seleccionado en mapa.
   ===================================================== */
const API_PLANTILLA_ORDEN = (window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec");

let poOrdenActual = null;
let poMapaSelector = null;
let poMarcadorSelector = null;

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

function poTexto(valor){
  return String(valor == null ? "" : valor).trim();
}

function poTiene(valor){
  const t = poTexto(valor);
  return !!t && t !== "0";
}

function poCoordenadaCto(valor){
  const numeros=String(valor==null?"":valor).match(/-?\d+(?:\.\d+)?/g)||[];
  if(numeros.length<2)return null;
  const latitud=Number(numeros[0]),longitud=Number(numeros[1]);
  return Number.isFinite(latitud)&&Number.isFinite(longitud)?{latitud,longitud}:null;
}

function poDatosCto(orden){
  const items=[];
  const vistos=new Set();
  [1,2,3].forEach(numero=>{
    const rotulo=String(orden[`cto${numero}`]||"").trim();
    const coordenada=poCoordenadaCto(orden[`coordenadaCto${numero}`]);
    const clave=rotulo.toUpperCase();
    if((rotulo||coordenada) && (!clave || !vistos.has(clave))){
      if(clave) vistos.add(clave);
      items.push({titulo:`CTO ${numero}`,rotulo:rotulo||"Sin rótulo",coordenada});
    }
  });
  const cto=String(orden.cto||"").trim(),puerto=String(orden.puerto||"").trim();
  if(cto||puerto){
    const clave=cto.toUpperCase();
    if(!clave || !vistos.has(clave)) items.push({titulo:"CTO",rotulo:cto||"Sin rótulo",puerto,coordenada:null});
    else if(puerto){
      const existente=items.find(x=>String(x.rotulo||"").toUpperCase()===clave);
      if(existente) existente.puerto=puerto;
    }
  }
  return items;
}

function poFilaHtml(etiqueta, valor, clase){
  const texto=poTexto(valor);
  if(!texto) return "";
  return `<div class="po-field ${clase||""}"><span>${poEsc(etiqueta)}</span><b>${poEsc(texto)}</b></div>`;
}

function poSeccionHtml(titulo, icono, contenido, clase){
  if(!contenido || !String(contenido).trim()) return "";
  return `<section class="po-section ${clase||""}">
    <div class="po-section-title"><span>${icono||""}</span><h3>${poEsc(titulo)}</h3></div>
    <div class="po-section-body">${contenido}</div>
  </section>`;
}

function poProductoServicioHtml(valor){
  const partes=poTexto(valor).split("|").map(x=>x.trim()).filter(Boolean);
  if(!partes.length) return "";
  return partes.map(texto=>{
    const i=texto.indexOf(":");
    if(i>0) return poFilaHtml(texto.slice(0,i).trim(),texto.slice(i+1).trim());
    return poFilaHtml("Detalle",texto);
  }).join("");
}

function poPanelCtoAsociadasHtml(orden){
  const items=poDatosCto(orden);
  if(!items.length && !poTexto(orden.puerto)) return "";
  const contenido=items.map(item=>{
    const coordenada=item.coordenada;
    const valor=coordenada?`${coordenada.latitud},${coordenada.longitud}`:"";
    return `<div class="po-network-item">
      <div><small>${poEsc(item.titulo)}</small><b>${poEsc(item.rotulo)}</b>${item.puerto?`<span>Puerto: ${poEsc(item.puerto)}</span>`:""}${coordenada?`<span>${poEsc(valor)}</span>`:""}</div>
      ${coordenada?`<button type="button" onclick="verUbicacionPlantilla(${coordenada.latitud},${coordenada.longitud})">Ver mapa</button>`:""}
    </div>`;
  }).join("");
  return contenido || poFilaHtml("Puerto",orden.puerto);
}

async function poApi(payload){
  const parametros = new URLSearchParams();
  Object.entries(payload || {}).forEach(([clave, valor]) => {
    if(valor !== undefined && valor !== null){
      parametros.set(clave, typeof valor === "object" ? JSON.stringify(valor) : String(valor));
    }
  });
  parametros.set("_ts", String(Date.now()));

  const separador = API_PLANTILLA_ORDEN.includes("?") ? "&" : "?";
  const respuesta = await fetch(API_PLANTILLA_ORDEN + separador + parametros.toString(), {
    method:"GET",
    cache:"no-store"
  });
  const texto = await respuesta.text();
  let data;
  try{
    data = JSON.parse(texto);
  }catch(error){
    const mensaje = String(texto || "").trim();
    if(mensaje === "MI VISUAL API OK"){
      throw new Error("La API no reconoció la consulta. Actualice la implementación de Apps Script.");
    }
    throw new Error(mensaje || "La API devolvió una respuesta inválida.");
  }
  if(!data.ok) throw new Error(data.error || "No se pudo realizar la consulta");
  return data;
}

function mostrarPlantillaOrden(){
  poOrdenActual=null;
  const html = `
    <section class="po-page">
      <div class="po-head">
        <div>
          <h2>Consulta de plantilla</h2>
          <p>Ingrese cualquiera de estos datos para realizar la consulta: Código de cliente · DNI · Código de orden · Código de pedido. Se mostrará la orden más reciente permitida para su perfil.</p>
        </div>
      </div>
      <div class="po-search-card">
        <label for="poConsulta">Ingrese cualquiera de estos datos</label>
        <div class="po-search-row">
          <input id="poConsulta" inputmode="numeric" autocomplete="off" placeholder="Ej.: 3102588 / 70716854 / 3358455" onkeydown="if(event.key==='Enter'){consultarPlantillaOrden();}">
          <button type="button" onclick="consultarPlantillaOrden()">Buscar</button>
        </div>
        <div id="poEstado" class="po-status">Ingrese un dato para consultar.</div>
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
  const input = document.getElementById("poConsulta");
  if(input) input.focus();
  window.scrollTo({top:0,behavior:"smooth"});
}

async function consultarPlantillaOrden(){
  const input = document.getElementById("poConsulta");
  const estado = document.getElementById("poEstado");
  const resultado = document.getElementById("poResultado");
  const consulta = String(input?.value || "").replace(/\s+/g,"").trim();
  if(!consulta){
    if(estado) estado.textContent = "Ingrese cualquiera de los datos indicados para consultar.";
    if(input) input.focus();
    return;
  }
  if(estado){ estado.className="po-status loading"; estado.textContent="Buscando coincidencias..."; }
  if(resultado) resultado.innerHTML = "";
  try{
    const data = await poApi({accion:"consultarPlantillaOrden",usuario:poUsuario(),consulta,codigoCliente:consulta});
    const coincidencias = Number(data.coincidencias || 1);
    const criterio = poTexto(data.criterioBusqueda || "");
    if(estado){
      estado.className="po-status ok";
      estado.textContent = coincidencias > 1
        ? `Se encontraron ${coincidencias} órdenes permitidas${criterio?` por ${criterio}`:""}. Se muestra la más reciente.`
        : `Orden encontrada${criterio?` por ${criterio}`:""}.`;
    }
    renderPlantillaOrden(data.orden || {}, data.plantilla || "");
  }catch(error){
    if(estado){ estado.className="po-status error"; estado.textContent=error.message; }
  }
}

function renderPlantillaOrden(orden, plantilla){
  const resultado = document.getElementById("poResultado");
  if(!resultado) return;
  poOrdenActual=orden||{};

  const latitud = Number(orden.latitud);
  const longitud = Number(orden.longitud);
  const tieneUbicacion = Number.isFinite(latitud) && Number.isFinite(longitud) && latitud>=-90 && latitud<=90 && longitud>=-180 && longitud<=180;
  const tipoTrabajo=poTexto(orden.tipoTrabajo)||"ORDEN";
  const estado=poTexto(orden.estado)||"Sin estado";

  const resumen = [
    poFilaHtml("Fecha",orden.fechaSolicitud),
    poFilaHtml("Tramo",orden.horaSolicitud),
    poFilaHtml("Código de orden",orden.ordenId),
    poFilaHtml("Código de pedido",orden.codigoPedido),
    poFilaHtml("Código de cliente",orden.codigoCliente),
    poFilaHtml("Código de seguimiento",orden.codigoSeguimiento),
    poFilaHtml("Estado",estado),
    poFilaHtml("Cuadrilla",orden.cuadrilla,"po-wide")
  ].join("");

  const cliente = [
    poFilaHtml("Cliente",orden.cliente,"po-wide"),
    poFilaHtml("Documento de identidad / DNI",orden.numeroDocumento),
    poFilaHtml("Teléfono móvil",orden.telefonoMovil),
    poFilaHtml("Teléfono fijo",orden.telefonoFijo),
    poFilaHtml("Dirección",orden.direccion,"po-wide"),
    poFilaHtml("Referencia",orden.direccionAdicional,"po-wide"),
    poFilaHtml("Región",orden.region),
    tieneUbicacion ? `<div class="po-field po-wide"><span>Coordenadas</span><div class="po-inline-value"><b>${poEsc(`${latitud},${longitud}`)}</b><button type="button" onclick="verUbicacionPlantilla(${latitud},${longitud})">Ver ubicación</button></div></div>` : ""
  ].join("");

  const servicio = [
    poFilaHtml("Servicio / origen",orden.productoOrigen,"po-wide"),
    poFilaHtml("Tipo de trabajo",orden.tipoTrabajo),
    poFilaHtml("Tipo de predio / cliente",orden.tipo),
    poProductoServicioHtml(orden.productoServicio)
  ].join("");

  const red = poPanelCtoAsociadasHtml(orden);

  const gestion = [
    poFilaHtml("Inicio de visita",orden.fechaInicioVisita),
    poFilaHtml("Fin de visita",orden.fechaFinVisita),
    poFilaHtml("Motivo de cancelación",orden.motivoCancelacion,"po-wide"),
    poFilaHtml("Motivo de finalización",orden.motivoFinalizacion,"po-wide"),
    poFilaHtml("Motivo de anulación",orden.motivoAnulacion,"po-wide"),
    poFilaHtml("Detalle",orden.detalle,"po-wide")
  ].join("");

  resultado.innerHTML = `
    <section class="po-result-card">
      <div class="po-result-top po-result-top-v404">
        <div>
          <b>${poEsc(tipoTrabajo)}</b>
          <small>${poEsc(orden.cliente || "Plantilla encontrada")}</small>
        </div>
        <div class="po-badges"><span class="po-badge-state">${poEsc(estado)}</span>${orden.codigoCliente?`<span class="po-badge-code">${poEsc(orden.codigoCliente)}</span>`:""}</div>
      </div>
      <div class="po-actions">
        <button class="po-primary" type="button" onclick="nuevaBusquedaPlantilla()">Nueva búsqueda</button>
        <button type="button" onclick="copiarPlantillaCompleta()">Copiar plantilla completa</button>
      </div>

      ${poSeccionHtml("Datos de la orden","📋",`<div class="po-fields">${resumen}</div>`,"po-order-section")}
      ${poSeccionHtml("Datos del cliente","👤",`<div class="po-fields">${cliente}</div>`)}
      ${poSeccionHtml("Datos del servicio / trabajo","🌐",`<div class="po-fields">${servicio}</div>`)}
      ${poSeccionHtml("Datos de red","🔌",`<div class="po-network-list">${red}</div>`)}
      ${poSeccionHtml("Gestión / resultado","🧰",`<div class="po-fields">${gestion}</div>`)}

      <details class="po-copy-details">
        <summary>Ver texto para copiar o seleccionar</summary>
        <textarea id="poTextoPlantilla" class="po-text" readonly spellcheck="false">${poEsc(plantilla)}</textarea>
      </details>

      ${poPanelCtoCercanasHtml(orden,tieneUbicacion)}
    </section>`;
}

function poPanelCtoCercanasHtml(orden,tieneUbicacion){
  const lat=tieneUbicacion?Number(orden.latitud):"";
  const lng=tieneUbicacion?Number(orden.longitud):"";
  return `<section class="po-nearby-card">
    <div class="po-nearby-head">
      <div><h3>📡 CTO cercanas</h3><p>Busca CTO registradas hasta 400 metros del punto indicado. Es una referencia geográfica; no confirma puerto disponible.</p></div>
      <span>Radio 400 m</span>
    </div>
    <div class="po-location-actions">
      <button type="button" onclick="usarMiUbicacionCto()">📍 Usar mi ubicación</button>
      ${tieneUbicacion?`<button type="button" onclick="usarUbicacionClienteCto()">👤 Ubicación del cliente</button>`:""}
      <button type="button" onclick="alternarMapaPuntoCto()">🗺️ Marcar punto en mapa</button>
    </div>
    <div class="po-coord-grid">
      <label>Latitud<input id="poCtoLat" inputmode="decimal" value="${poEsc(lat)}" placeholder="-5.186294"></label>
      <label>Longitud<input id="poCtoLng" inputmode="decimal" value="${poEsc(lng)}" placeholder="-80.664856"></label>
      <button class="po-primary" type="button" onclick="buscarCtosCercanasPlantilla()">Buscar CTO cercanas</button>
    </div>
    <div id="poMapaPuntoWrap" class="po-map-wrap" hidden><div id="poMapaPunto" class="po-map-point"></div><small>Toque el mapa para fijar el punto de búsqueda.</small></div>
    <div id="poCtoEstado" class="po-status">Puede usar GPS, las coordenadas del cliente o ingresar coordenadas manualmente.</div>
    <div id="poCtoResultados"></div>
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

function poAbrirTextoCopiable(){
  const campo=document.getElementById("poTextoPlantilla");
  if(!campo)return null;
  const details=campo.closest("details");
  if(details)details.open=true;
  return campo;
}

async function copiarPlantillaCompleta(){
  const campo=poAbrirTextoCopiable();
  if(!campo) return;
  try{ await poCopiarTexto(campo.value); alert("Plantilla copiada."); }
  catch(e){ alert("No se pudo copiar automáticamente. Mantenga presionado sobre el texto y seleccione Copiar."); }
}

async function copiarSeleccionPlantilla(){
  const campo=poAbrirTextoCopiable();
  if(!campo) return;
  campo.focus();
  const inicio=campo.selectionStart;
  const fin=campo.selectionEnd;
  if(fin <= inicio){
    alert("Seleccione primero la parte de la plantilla que desea copiar.");
    return;
  }
  try{ await poCopiarTexto(campo.value.slice(inicio,fin)); alert("Selección copiada."); }
  catch(e){ alert("No se pudo copiar automáticamente."); }
}

function nuevaBusquedaPlantilla(){
  poOrdenActual=null;
  if(poMapaSelector){ try{ poMapaSelector.remove(); }catch(e){} poMapaSelector=null; poMarcadorSelector=null; }
  const input=document.getElementById("poConsulta");
  const estado=document.getElementById("poEstado");
  const resultado=document.getElementById("poResultado");
  if(input){ input.value=""; input.focus(); }
  if(estado){ estado.className="po-status"; estado.textContent="Ingrese un dato para consultar."; }
  if(resultado) resultado.innerHTML="";
  window.scrollTo({top:0,behavior:"smooth"});
}

function verUbicacionPlantilla(latitud,longitud){
  if(latitud === "" || longitud === "") return;
  window.open(`https://www.google.com/maps?q=${encodeURIComponent(latitud)},${encodeURIComponent(longitud)}`,"_blank","noopener");
}

function poSetCoordenadasCto(lat,lng){
  const a=document.getElementById("poCtoLat"),b=document.getElementById("poCtoLng");
  if(a)a.value=Number(lat).toFixed(6);
  if(b)b.value=Number(lng).toFixed(6);
  if(poMapaSelector && window.L){
    const punto=[Number(lat),Number(lng)];
    if(poMarcadorSelector) poMarcadorSelector.setLatLng(punto);
    else poMarcadorSelector=L.marker(punto).addTo(poMapaSelector);
    poMapaSelector.setView(punto,17);
  }
}

function usarUbicacionClienteCto(){
  const lat=Number(poOrdenActual?.latitud),lng=Number(poOrdenActual?.longitud);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) return alert("La orden no tiene coordenadas válidas.");
  poSetCoordenadasCto(lat,lng);
  const estado=document.getElementById("poCtoEstado");
  if(estado){estado.className="po-status ok";estado.textContent="Se cargaron las coordenadas del cliente.";}
}

function usarMiUbicacionCto(){
  const estado=document.getElementById("poCtoEstado");
  if(!navigator.geolocation){
    if(estado){estado.className="po-status error";estado.textContent="Este navegador no permite obtener la ubicación.";}
    return;
  }
  if(estado){estado.className="po-status loading";estado.textContent="Obteniendo ubicación del equipo...";}
  navigator.geolocation.getCurrentPosition(pos=>{
    poSetCoordenadasCto(pos.coords.latitude,pos.coords.longitude);
    if(estado){estado.className="po-status ok";estado.textContent=`Ubicación obtenida (precisión aproximada: ${Math.round(pos.coords.accuracy||0)} m).`;}
  },err=>{
    if(estado){estado.className="po-status error";estado.textContent=err.code===1?"Permiso de ubicación denegado.":"No se pudo obtener la ubicación. Puede ingresar las coordenadas manualmente.";}
  },{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
}

function poCargarRecurso(url,tipo){
  return new Promise((resolve,reject)=>{
    if(tipo==="js" && window.L) return resolve();
    if(tipo==="css" && [...document.styleSheets].some(x=>x.href&&x.href.includes("leaflet"))) return resolve();
    const el=tipo==="css"?document.createElement("link"):document.createElement("script");
    if(tipo==="css"){el.rel="stylesheet";el.href=url;}else{el.src=url;el.async=true;}
    el.onload=()=>resolve();el.onerror=()=>reject(new Error("No se pudo cargar el mapa."));
    document.head.appendChild(el);
  });
}

async function poAsegurarLeaflet(){
  if(window.L)return;
  await poCargarRecurso("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","css");
  await poCargarRecurso("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","js");
}

async function alternarMapaPuntoCto(){
  const wrap=document.getElementById("poMapaPuntoWrap");
  const estado=document.getElementById("poCtoEstado");
  if(!wrap)return;
  wrap.hidden=!wrap.hidden;
  if(wrap.hidden)return;
  try{
    await poAsegurarLeaflet();
    if(!poMapaSelector){
      const lat=Number(document.getElementById("poCtoLat")?.value),lng=Number(document.getElementById("poCtoLng")?.value);
      const valido=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;
      const centro=valido?[lat,lng]:[-9.19,-75.02];
      poMapaSelector=L.map("poMapaPunto",{zoomControl:true}).setView(centro,valido?17:5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(poMapaSelector);
      if(valido)poMarcadorSelector=L.marker(centro).addTo(poMapaSelector);
      poMapaSelector.on("click",e=>{
        poSetCoordenadasCto(e.latlng.lat,e.latlng.lng);
        if(estado){estado.className="po-status ok";estado.textContent="Punto seleccionado. Presione Buscar CTO cercanas.";}
      });
    }
    setTimeout(()=>poMapaSelector&&poMapaSelector.invalidateSize(),100);
  }catch(error){
    wrap.hidden=true;
    if(estado){estado.className="po-status error";estado.textContent=error.message||"No se pudo abrir el mapa.";}
  }
}

async function buscarCtosCercanasPlantilla(){
  const lat=Number(String(document.getElementById("poCtoLat")?.value||"").replace(",","."));
  const lng=Number(String(document.getElementById("poCtoLng")?.value||"").replace(",","."));
  const estado=document.getElementById("poCtoEstado");
  const cont=document.getElementById("poCtoResultados");
  if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180){
    if(estado){estado.className="po-status error";estado.textContent="Ingrese una latitud y longitud válidas.";}
    return;
  }
  if(estado){estado.className="po-status loading";estado.textContent="Buscando CTO hasta 400 metros...";}
  if(cont)cont.innerHTML="";
  try{
    const data=await poApi({accion:"buscarCtosCercanasPlantillaOrden",usuario:poUsuario(),latitud:lat,longitud:lng,radio:400,limite:20});
    const ctos=Array.isArray(data.ctos)?data.ctos:[];
    if(estado){
      estado.className=ctos.length?"po-status ok":"po-status";
      estado.textContent=ctos.length?`${ctos.length} CTO encontrada(s) dentro de ${Number(data.radioMetros||400)} m.`:"No se encontraron CTO con coordenadas dentro de 400 m.";
    }
    if(cont)cont.innerHTML=ctos.length?`<div class="po-nearby-results">${ctos.map((cto,i)=>`<div class="po-nearby-item">
      <div class="po-distance"><b>${Math.round(Number(cto.distanciaMetros)||0)} m</b><small>#${i+1}</small></div>
      <div class="po-nearby-data"><b>${poEsc(cto.codigo)}</b><span>${poEsc(cto.sede||"")}${cto.puerto?` · Puerto ref.: ${poEsc(cto.puerto)}`:""}</span>${cto.tipoTrabajo?`<small>Referencia: ${poEsc(cto.tipoTrabajo)}</small>`:""}</div>
      <button type="button" onclick="verUbicacionPlantilla(${Number(cto.latitud)},${Number(cto.longitud)})">Mapa</button>
    </div>`).join("")}</div>`:"";
  }catch(error){
    if(estado){estado.className="po-status error";estado.textContent=error.message;}
  }
}

window.mostrarPlantillaOrden=mostrarPlantillaOrden;
window.consultarPlantillaOrden=consultarPlantillaOrden;
window.copiarPlantillaCompleta=copiarPlantillaCompleta;
window.copiarSeleccionPlantilla=copiarSeleccionPlantilla;
window.nuevaBusquedaPlantilla=nuevaBusquedaPlantilla;
window.verUbicacionPlantilla=verUbicacionPlantilla;
window.usarMiUbicacionCto=usarMiUbicacionCto;
window.usarUbicacionClienteCto=usarUbicacionClienteCto;
window.alternarMapaPuntoCto=alternarMapaPuntoCto;
window.buscarCtosCercanasPlantilla=buscarCtosCercanasPlantilla;
