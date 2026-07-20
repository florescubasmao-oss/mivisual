const API_MAPA_OPERATIVO = (window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec");
let moMapa=null, moCapa=null, moRegistros=[], moImportacion=[], moMarcadores={};

async function moApi(payload){
  const r=await fetch(API_MAPA_OPERATIVO,{method:'POST',body:JSON.stringify(payload)});
  const t=await r.text(); let d; try{d=JSON.parse(t)}catch(e){throw new Error(t||'Respuesta no válida')}
  if(!d.ok) throw new Error(d.error||'Error en Mapa Operativo'); return d;
}
function moNorm(v){return (v??'').toString().trim()}
function moNormCab(v){return moNorm(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'')}
function moEscape(v){return moNorm(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function moUsuario(){return localStorage.getItem('usuario')||''}
function moPerfil(){return moNormCab(localStorage.getItem('perfil'))}
function moPuedeImportar(){return ['JEFATURA','ADMIN','ADMINISTRADOR','JEFATURAOPERACIONES','JEFATURADEOPERACIONES','OPERACIONES'].includes(moPerfil())}

function moCargarScript(src,globalName){return new Promise((resolve,reject)=>{if(globalName&&window[globalName])return resolve(window[globalName]);const s=document.createElement('script');s.src=src;s.onload=()=>resolve(globalName?window[globalName]:true);s.onerror=()=>reject(new Error('No se pudo cargar un componente del mapa'));document.head.appendChild(s)})}
function moCargarCss(href){if([...document.styleSheets].some(x=>x.href&&x.href.includes('leaflet')))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
async function moDependencias(){
  moCargarCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  await moCargarScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','L');
  if(!window.XLSX) await moCargarScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','XLSX');
}

async function mostrarMapaOperativo(){
  limpiarPantalla(); setBotonNavegacion('modulo');
  const menu=document.getElementById('menuPrincipal');
  if(menu) menu.style.setProperty('display','none','important');
  const p=document.getElementById('pantalla');
  p.innerHTML=`<div class="mo-wrap"><div class="mo-head"><h2 class="mo-title">🗺️ MAPA OPERATIVO</h2><div class="mo-actions">${moPuedeImportar()?'<button class="mo-btn mo-btn-sec" onclick="moMostrarImportacion()">Ingresar datos</button>':''}</div></div>
  <div id="moVistaFiltros" class="mo-panel">
    <b>Seleccione la información que desea visualizar</b>
    <div class="mo-filtros mo-filtros-amplios" style="margin-top:9px">
      <div><label class="mo-label">Sede</label><select id="moFiltroSede" class="mo-select"><option value="">Todas</option></select></div>
      <div><label class="mo-label">Fecha</label><input id="moFiltroFecha" class="mo-input" type="date"></div>
      <div><label class="mo-label">Grupo de trabajo</label><select id="moFiltroGrupo" class="mo-select"><option value="">Todos</option></select></div>
      <div><label class="mo-label">Estado</label><select id="moFiltroEstado" class="mo-select"><option value="">Todos</option></select></div>
      <div><label class="mo-label">Cuadrilla</label><select id="moFiltroCuadrilla" class="mo-select"><option value="">Todas</option></select></div>
      <div><label class="mo-label">Código de orden</label><input id="moBuscarCodigo" class="mo-input" placeholder="Ej. 1234567"></div>
      <button class="mo-btn" onclick="moConsultarMapa()">Ver mapa</button>
      <button class="mo-btn mo-btn-sec" onclick="moLimpiarFiltros()">Limpiar</button>
    </div>
    <div id="moContador" class="mo-counter">Seleccione por lo menos un filtro y presione Ver mapa.</div>
  </div>
  <div id="moVistaImportacion" class="mo-panel" style="display:none">
    <div class="mo-head"><b>Ingresar información operativa</b><button class="mo-btn mo-btn-sec" onclick="moVolverFiltros()">Volver al mapa</button></div>
    <div class="mo-upload-grid"><div><label class="mo-label">Archivo Excel</label><input id="moArchivo" class="mo-input" type="file" accept=".xlsx,.xls,.csv"></div><button id="moBtnLeer" class="mo-btn" onclick="moLeerArchivo()">Leer archivo</button><button id="moBtnImportar" class="mo-btn" onclick="moRegistrarImportacion()" disabled>Registrar información</button></div>
    <div id="moImportMsg" class="mo-msg">Seleccione el archivo, léalo y luego registre la información.</div>
  </div>
  <div id="moMapa" class="mo-map"><div class="mo-empty">Aplique filtros para visualizar únicamente las órdenes necesarias.</div></div></div>`;
  try{await moDependencias();moInicializarMapa();await moCargarCatalogos()}catch(e){document.getElementById('moMapa').innerHTML=`<div class="mo-empty mo-error">${moEscape(e.message)}</div>`}
}
function moMostrarImportacion(){document.getElementById('moVistaFiltros').style.display='none';document.getElementById('moMapa').style.display='none';document.getElementById('moVistaImportacion').style.display='block'}
function moVolverFiltros(){document.getElementById('moVistaImportacion').style.display='none';document.getElementById('moVistaFiltros').style.display='block';document.getElementById('moMapa').style.display='block';setTimeout(()=>moMapa&&moMapa.invalidateSize(),50)}
function moLimpiarFiltros(){['moFiltroSede','moFiltroFecha','moFiltroGrupo','moFiltroEstado','moFiltroCuadrilla','moBuscarCodigo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});moRegistros=[];moRenderMarcadores([]);document.getElementById('moContador').textContent='Seleccione por lo menos un filtro y presione Ver mapa.'}
async function moCargarCatalogos(){
  const d=await moApi({accion:'catalogosMapaOperativo',usuario:moUsuario()});
  const llenar=(id,lista,todos)=>{const e=document.getElementById(id);if(e)e.innerHTML=`<option value="">${todos}</option>`+(lista||[]).map(x=>`<option>${moEscape(x)}</option>`).join('')};
  llenar('moFiltroSede',d.sedes,'Todas');llenar('moFiltroGrupo',d.gruposTrabajo,'Todos');llenar('moFiltroEstado',d.estados,'Todos');llenar('moFiltroCuadrilla',d.cuadrillas,'Todas');
}
async function moConsultarMapa(){
  const filtros={sede:moNorm(document.getElementById('moFiltroSede')?.value),fecha:moNorm(document.getElementById('moFiltroFecha')?.value),grupoTrabajo:moNorm(document.getElementById('moFiltroGrupo')?.value),estado:moNorm(document.getElementById('moFiltroEstado')?.value),cuadrilla:moNorm(document.getElementById('moFiltroCuadrilla')?.value),codigo:moNorm(document.getElementById('moBuscarCodigo')?.value)};
  if(!Object.values(filtros).some(Boolean)){document.getElementById('moContador').textContent='Debe seleccionar al menos un filtro para evitar cargar toda la base.';return}
  document.getElementById('moContador').textContent='Consultando órdenes...';
  const d=await moApi(Object.assign({accion:'listarMapaOperativo',usuario:moUsuario()},filtros));moRegistros=d.ordenes||[];moRenderMarcadores(moRegistros);
}
function moInicializarMapa(){
  if(moMapa){moMapa.remove();moMapa=null}
  moMapa=L.map('moMapa',{zoomControl:true}).setView([-7.5,-79.0],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(moMapa);
  moCapa=L.layerGroup().addTo(moMapa);
}
function moFechaExcel(v){
  if(v instanceof Date&&!isNaN(v))return v;
  if(typeof v==='number'&&window.XLSX){const d=XLSX.SSF.parse_date_code(v);if(d)return new Date(d.y,d.m-1,d.d,d.H||0,d.M||0,d.S||0)}
  const t=moNorm(v); if(!t)return null; const m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);if(m)return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));const d=new Date(t);return isNaN(d)?null:d;
}
function moFmtFecha(d){return d?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`:''}
function moFmtHora(d){return d?`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:''}
function moCoord(v){const t=moNorm(v).replace(/[()]/g,'').replace(/;/g,',');const m=t.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);return m?[Number(m[1]),Number(m[2])]:[null,null]}
function moValor(row,map,...names){for(const n of names){const i=map[moNormCab(n)];if(i!==undefined&&row[i]!==undefined&&row[i]!==null)return row[i]}return ''}
async function moLeerArchivo(){
  const f=document.getElementById('moArchivo')?.files?.[0],msg=document.getElementById('moImportMsg'),btn=document.getElementById('moBtnImportar');
  if(!f){msg.className='mo-msg mo-error';msg.textContent='Seleccione un archivo Excel.';return}
  try{msg.className='mo-msg';msg.textContent='Leyendo archivo...';const buf=await f.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});if(rows.length<2)throw new Error('El archivo no contiene registros.');
    let headerIndex=-1;
    for(let i=0;i<Math.min(rows.length,30);i++){
      const filaCab=(rows[i]||[]).map(moNormCab);
      if(filaCab.includes('ORDENID')){headerIndex=i;break}
    }
    if(headerIndex<0)throw new Error('No se encontró la fila de encabezados con OrdenId.');
    const headers=(rows[headerIndex]||[]).map(moNormCab),map={};headers.forEach((h,i)=>{if(h)map[h]=i});const out=[];
    rows.slice(headerIndex+1).forEach(r=>{const orden=moValor(r,map,'OrdenId','ORDEN_ID');if(!moNorm(orden))return;const fs=moFechaExcel(moValor(r,map,'F.Soli','FSOLI','FECHA SOLICITUD'));let dir=moNorm(moValor(r,map,'Direccion'));let dir2=moNorm(moValor(r,map,'Direccion1'));if(dir&&dir2&&moNormCab(dir)===moNormCab(dir2))dir2='';if(!dir&&dir2){dir=dir2;dir2=''}const [lat,lng]=moCoord(moValor(r,map,'Georeferencia','GEOREFERENCIA'));
      out.push({ordenId:moNorm(orden),tipoTrabajo:moNorm(moValor(r,map,'TipoTraba','TIPO_TRABAJO')),fechaSolicitud:moFmtFecha(fs),horaSolicitud:moFmtHora(fs),cliente:moNorm(moValor(r,map,'Cliente')),tipo:moNorm(moValor(r,map,'Tipo')),productoOrigen:moNorm(moValor(r,map,'Producto')),cuadrilla:moNorm(moValor(r,map,'Cuadrilla')),estado:moNorm(moValor(r,map,'Estado')),direccion:dir,direccionAdicional:dir2,fechaUltimoEstado:moNorm(moValor(r,map,'FechaUltimoEstado','Fecha Ultimo Estado')),productoServicio:moNorm(moValor(r,map,'IdenServi')),region:moNorm(moValor(r,map,'Region')),codigoCliente:moNorm(moValor(r,map,'CodiSeguiClien')),numeroDocumento:moNorm(moValor(r,map,'Número Documento','Numero Documento')),telefonoMovil:moNorm(moValor(r,map,'TeleMovilNume')),telefonoFijo:moNorm(moValor(r,map,'TeleFijoNume')),fechaInicioVisita:moNorm(moValor(r,map,'FechaIniVisi')),fechaFinVisita:moNorm(moValor(r,map,'FechaFinVisi')),motivoCancelacion:moNorm(moValor(r,map,'Motivo Cancelación','Motivo Cancelacion')),motivoFinalizacion:moNorm(moValor(r,map,'Motivo Finalización','Motivo Finalizacion')),motivoAnulacion:moNorm(moValor(r,map,'Motivo Anulación','Motivo Anulacion')),latitud:lat,longitud:lng,detalle:moNorm(moValor(r,map,'Detalle','UNNAMED','Motivo Regestión','Motivo Regestion'))});});
    if(!out.length)throw new Error('No se encontraron filas con OrdenId.');moImportacion=out;btn.disabled=false;const conGeo=out.filter(x=>Number.isFinite(x.latitud)&&Number.isFinite(x.longitud)).length;msg.className='mo-msg mo-ok';msg.textContent=`Archivo leído: ${out.length} órdenes; ${conGeo} con georreferencia válida. Presione Registrar información.`;
  }catch(e){moImportacion=[];btn.disabled=true;msg.className='mo-msg mo-error';msg.textContent=e.message}
}
async function moRegistrarImportacion(){
  if(!moImportacion.length)return;const btn=document.getElementById('moBtnImportar'),msg=document.getElementById('moImportMsg');btn.disabled=true;msg.className='mo-msg';msg.textContent='Registrando información...';
  try{const d=await moApi({accion:'importarMapaOperativo',usuario:moUsuario(),registros:moImportacion});msg.className='mo-msg mo-ok';msg.textContent=`Registro terminado: ${d.nuevos} nuevos, ${d.actualizados} actualizados, ${d.omitidos||0} omitidos.`;moImportacion=[];await moCargarCatalogos()}catch(e){msg.className='mo-msg mo-error';msg.textContent=e.message;btn.disabled=false}
}
function moMotivo(x){return x.motivoCancelacion||x.motivoFinalizacion||x.motivoAnulacion||''}
function moPopup(x){const fields=[['Fecha',x.fechaSolicitud],['Hora',x.horaSolicitud],['Cliente',x.cliente],['Tipo',x.tipo],['Producto',x.productoServicio||x.productoOrigen],['Dirección',x.direccion],['Dirección adicional',x.direccionAdicional],['Región',x.region],['Código de cliente',x.codigoCliente],['Documento',x.numeroDocumento],['Teléfono móvil',x.telefonoMovil],['Teléfono fijo',x.telefonoFijo],['Inicio de visita',x.fechaInicioVisita],['Fin de visita',x.fechaFinVisita],['Motivo',moMotivo(x)],['Detalle',x.detalle]].filter(y=>moNorm(y[1]));const lat=Number(x.latitud),lng=Number(x.longitud);const ruta=Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}`:'';return `<div class="mo-popup"><div class="mo-main-row"><b>Tipo de trabajo</b><span>${moEscape(x.tipoTrabajo)}</span></div><div class="mo-main-row"><b>Cuadrilla</b><span>${moEscape(x.cuadrilla)}</span></div><div class="mo-main-row"><b>Estado</b><span>${moEscape(x.estado)}</span></div><div class="mo-main-row"><b>Código</b><span>${moEscape(x.ordenId)}</span></div><details class="mo-detalle"><summary>Detalle</summary><div class="mo-detalle-grid">${fields.map(y=>`<b>${moEscape(y[0])}</b><span>${moEscape(y[1])}</span>`).join('')}</div></details>${ruta?`<a class="mo-como-llegar" href="${ruta}" target="_blank" rel="noopener noreferrer">📍 Cómo llegar en Google Maps</a>`:''}</div>`}
function moColorEstado(estado){
  const e=moNormCab(estado);
  if(e.includes('FINALIZ'))return '#16a34a';
  if(e.includes('CANCEL'))return '#dc2626';
  if(e.includes('REPROGRAM'))return '#eab308';
  if(e.includes('REGEST'))return '#f97316';
  if(e.includes('ANUL'))return '#64748b';
  if(e.includes('PROCESO')||e.includes('ATENCION'))return '#7c3aed';
  if(e.includes('AGEND')||e.includes('ASIGN')||e.includes('PENDIENT'))return '#2563eb';
  return '#0891b2';
}
function moIconoEstado(estado){
  const color=moColorEstado(estado);
  return L.divIcon({className:'mo-marker-wrap',html:`<span class="mo-marker" style="--mo-color:${color}"></span>`,iconSize:[22,30],iconAnchor:[11,29],popupAnchor:[0,-27]});
}
function moRenderMarcadores(lista){if(!moMapa||!moCapa)return;moCapa.clearLayers();moMarcadores={};const bounds=[];let validos=0;lista.forEach(x=>{const lat=Number(x.latitud),lng=Number(x.longitud);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const m=L.marker([lat,lng],{icon:moIconoEstado(x.estado)}).bindPopup(moPopup(x),{autoClose:true,closeOnClick:true,maxWidth:310});m.on('click',()=>{moMapa.panTo([lat,lng]);});m.addTo(moCapa);moMarcadores[moNorm(x.ordenId)]=m;bounds.push([lat,lng]);validos++});if(bounds.length)moMapa.fitBounds(bounds,{padding:[25,25],maxZoom:16});document.getElementById('moContador').innerHTML=`${validos} puntos visibles de ${lista.length} órdenes filtradas.<div class="mo-leyenda"><span><i style="--c:#16a34a"></i>Finalizada</span><span><i style="--c:#dc2626"></i>Cancelada</span><span><i style="--c:#eab308"></i>Reprogramada</span><span><i style="--c:#f97316"></i>Regestión</span><span><i style="--c:#64748b"></i>Anulada</span><span><i style="--c:#2563eb"></i>Pendiente/Agendada</span><span><i style="--c:#7c3aed"></i>En proceso</span></div>`}
function moBuscarCodigo(){moConsultarMapa()}
