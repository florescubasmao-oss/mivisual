const API_MAPA_OPERATIVO = (window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec");
let moMapa=null, moCapa=null, moRegistros=[], moImportacion=[], moMarcadores={}, moArchivoSeleccionado=null;
let moEstilosCuadrilla={};
const MO_ETIQUETAS_CUADRILLA_KEY='miVisualMapaEtiquetasCuadrillaV254';
const MO_ESTILOS_CUADRILLA_KEY='miVisualMapaEstilosCuadrillaV254';
const MO_TOTAL_COLORES_CUADRILLA=72;
const MO_TOTAL_PATRONES_CUADRILLA=7;
const MO_TOTAL_ESTILOS_CUADRILLA=MO_TOTAL_COLORES_CUADRILLA*MO_TOTAL_PATRONES_CUADRILLA;

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
function moEtiquetasCuadrillaActivas(){
  try{return localStorage.getItem(MO_ETIQUETAS_CUADRILLA_KEY)!=='0'}catch(e){return true}
}
function moHashCuadrilla(valor){
  const t=moNormCab(valor)||'SINCUADRILLA';let h=2166136261;
  for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function moCargarRegistroEstilosCuadrilla(){
  try{const v=JSON.parse(localStorage.getItem(MO_ESTILOS_CUADRILLA_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return {}}
}
function moGuardarRegistroEstilosCuadrilla(registro){
  try{localStorage.setItem(MO_ESTILOS_CUADRILLA_KEY,JSON.stringify(registro))}catch(e){}
}
function moConstruirEstilosCuadrillas(cuadrillas){
  const registro=moCargarRegistroEstilosCuadrilla(),usados=new Set();
  Object.keys(registro).sort().forEach(k=>{const n=Number(registro[k]);if(Number.isInteger(n)&&n>=0&&n<MO_TOTAL_ESTILOS_CUADRILLA&&!usados.has(n)){usados.add(n)}else delete registro[k]});
  const claves=[...new Set((cuadrillas||[]).map(moNormCab).filter(Boolean))].sort();
  claves.forEach(clave=>{
    let idx=Number(registro[clave]);
    if(!Number.isInteger(idx)||idx<0||idx>=MO_TOTAL_ESTILOS_CUADRILLA){
      const hash=moHashCuadrilla(clave);idx=hash%MO_TOTAL_ESTILOS_CUADRILLA;
      let paso=((hash>>>12)%(MO_TOTAL_ESTILOS_CUADRILLA-1))+1;
      while(paso%2===0||paso%3===0||paso%7===0)paso++;
      let intentos=0;while(usados.has(idx)&&intentos<MO_TOTAL_ESTILOS_CUADRILLA){idx=(idx+paso)%MO_TOTAL_ESTILOS_CUADRILLA;intentos++}
      if(intentos>=MO_TOTAL_ESTILOS_CUADRILLA)idx=hash%MO_TOTAL_ESTILOS_CUADRILLA;
      registro[clave]=idx;usados.add(idx);
    }
    const tono=Math.round(((idx%MO_TOTAL_COLORES_CUADRILLA)*137.508)%360);
    const patron=Math.floor(idx/MO_TOTAL_COLORES_CUADRILLA)%MO_TOTAL_PATRONES_CUADRILLA;
    moEstilosCuadrilla[clave]={indice:idx,color:`hsl(${tono} 72% 36%)`,patron};
  });
  moGuardarRegistroEstilosCuadrilla(registro);
  return moEstilosCuadrilla;
}
function moEstiloCuadrilla(cuadrilla){
  const clave=moNormCab(cuadrilla)||'SINCUADRILLA';
  if(!moEstilosCuadrilla[clave])moConstruirEstilosCuadrillas([cuadrilla||'SIN CUADRILLA']);
  return moEstilosCuadrilla[clave]||{indice:0,color:'hsl(205 72% 36%)',patron:0};
}
function moCodigoCortoCuadrilla(cuadrilla){
  const texto=moNorm(cuadrilla),normal=moNormCab(texto);const p=texto.match(/\bP\s*(\d+)\b/i);let plataforma='';
  if(normal.includes('TRASLADO'))plataforma='TR';else if(normal.includes('SGA'))plataforma='SGA';else if(normal.includes('SGI'))plataforma='SGI';
  if(p)return `P${p[1]}${plataforma?'-'+plataforma:''}`;
  const partes=texto.split(/\s+/).filter(Boolean);return (partes.slice(0,2).join('-')||'SIN-CUADRILLA').toUpperCase().slice(0,14);
}
function moActualizarEtiquetasCuadrilla(){
  const e=document.getElementById('moMostrarCuadrillas'),activo=!!e?.checked;
  try{localStorage.setItem(MO_ETIQUETAS_CUADRILLA_KEY,activo?'1':'0')}catch(err){}
  document.querySelectorAll('#moMapa .mo-cuadrilla-label').forEach(x=>x.classList.toggle('is-hidden',!activo));
}
function moAplicarModoZoomEtiquetas(){
  const contenedor=document.getElementById('moMapa');
  if(!contenedor||!moMapa)return;
  contenedor.classList.toggle('mo-zoom-lejano',moMapa.getZoom()<=11);
}
function moCodigoMinimoCuadrilla(cuadrilla){
  const p=moNorm(cuadrilla).match(/\bP\s*(\d+)\b/i);
  return p?`P${p[1]}`:moCodigoCortoCuadrilla(cuadrilla).split('-')[0];
}
function moPintarUltimaActualizacion(texto){
  const e=document.getElementById('moUltimaActualizacion');
  if(!e)return;
  const valor=moNorm(texto)||'Sin actualización registrada';
  e.innerHTML=`<span class="mo-update-icon" aria-hidden="true">🕒</span><span class="mo-update-copy"><small>Última actualización</small><strong>${moEscape(valor)}</strong></span>`;
}

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
  p.innerHTML=`<div class="mo-wrap"><div class="mo-head"><h2 class="mo-title">🗺️ MAPA OPERATIVO</h2><div class="mo-actions"><div id="moUltimaActualizacion" class="mo-update-status" aria-live="polite"><span class="mo-update-icon" aria-hidden="true">🕒</span><span class="mo-update-copy"><small>Última actualización</small><strong>Consultando...</strong></span></div>${moPuedeImportar()?'<button class="mo-btn mo-btn-sec" onclick="moMostrarImportacion()">Ingresar datos</button>':''}</div></div>
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
    <div class="mo-identificacion-control"><label><input id="moMostrarCuadrillas" type="checkbox" ${moEtiquetasCuadrillaActivas()?'checked':''} onchange="moActualizarEtiquetasCuadrilla()"><span>Mostrar identificación de cuadrillas</span></label><small>El color y la trama de la etiqueta identifican la cuadrilla; el color del marcador mantiene el estado de la orden.</small></div>
    <div id="moContador" class="mo-counter">Seleccione por lo menos un filtro y presione Ver mapa.</div>
  </div>
  <div id="moVistaImportacion" class="mo-panel" style="display:none">
    <div class="mo-head"><b>Ingresar información operativa</b><button class="mo-btn mo-btn-sec" onclick="moVolverFiltros()">Volver al mapa</button></div>
    <div id="moDropArchivo" class="mo-drop-zone" aria-label="Zona para arrastrar el archivo Excel">
      <div class="mo-drop-icon">📥</div><b>Arrastre aquí el archivo Excel</b><span>También puede elegirlo desde Documentos o Escritorio.</span>
      <input id="moArchivo" type="file" accept=".xlsx,.xls,.csv" hidden onchange="moSeleccionarArchivoMapa(this.files&&this.files[0])">
      <div id="moNombreArchivo" class="mo-file-name">Ningún archivo seleccionado</div>
    </div>
    <div class="mo-upload-actions"><button class="mo-btn mo-btn-sec" onclick="document.getElementById('moArchivo').click()">Elegir archivo</button><button id="moBtnLeer" class="mo-btn" onclick="moLeerArchivo()">Leer archivo</button><button id="moBtnImportar" class="mo-btn" onclick="moRegistrarImportacion()" disabled>Registrar información</button></div>
    <div id="moImportMsg" class="mo-msg">Puede arrastrar el Excel directamente para evitar el selector de carpetas de Windows.</div>
  </div>
  <div id="moMapa" class="mo-map"><div class="mo-empty">Aplique filtros para visualizar únicamente las órdenes necesarias.</div></div></div>`;
  moPrepararCargaArchivoMapa();
  try{await moDependencias();moInicializarMapa();await moCargarCatalogos()}catch(e){document.getElementById('moMapa').innerHTML=`<div class="mo-empty mo-error">${moEscape(e.message)}</div>`}
}
function moArchivoMapaValido(file){
  if(!file)return false;
  return /\.(xlsx|xls|csv)$/i.test(file.name||"");
}
function moSeleccionarArchivoMapa(file){
  const nombre=document.getElementById('moNombreArchivo'),msg=document.getElementById('moImportMsg'),btn=document.getElementById('moBtnImportar');
  moImportacion=[];if(btn)btn.disabled=true;
  if(!file){moArchivoSeleccionado=null;if(nombre)nombre.textContent='Ningún archivo seleccionado';return;}
  if(!moArchivoMapaValido(file)){
    moArchivoSeleccionado=null;if(nombre)nombre.textContent='Archivo no válido';
    if(msg){msg.className='mo-msg mo-error';msg.textContent='Use un archivo .xlsx, .xls o .csv.';}return;
  }
  moArchivoSeleccionado=file;
  if(nombre)nombre.textContent=`${file.name} · ${Math.max(1,Math.round(file.size/1024))} KB`;
  if(msg){msg.className='mo-msg';msg.textContent='Archivo listo. Presione Leer archivo para validar su contenido.';}
}
function moPrepararCargaArchivoMapa(){
  const zona=document.getElementById('moDropArchivo');if(!zona)return;
  ['dragenter','dragover'].forEach(tipo=>zona.addEventListener(tipo,e=>{e.preventDefault();e.stopPropagation();zona.classList.add('is-dragover');}));
  ['dragleave','drop'].forEach(tipo=>zona.addEventListener(tipo,e=>{e.preventDefault();e.stopPropagation();zona.classList.remove('is-dragover');}));
  zona.addEventListener('drop',e=>{const file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];moSeleccionarArchivoMapa(file);});
}
function moMostrarImportacion(){document.getElementById('moVistaFiltros').style.display='none';document.getElementById('moMapa').style.display='none';document.getElementById('moVistaImportacion').style.display='block'}
function moVolverFiltros(){document.getElementById('moVistaImportacion').style.display='none';document.getElementById('moVistaFiltros').style.display='block';document.getElementById('moMapa').style.display='block';setTimeout(()=>moMapa&&moMapa.invalidateSize(),50)}
function moLimpiarFiltros(){['moFiltroSede','moFiltroFecha','moFiltroGrupo','moFiltroEstado','moFiltroCuadrilla','moBuscarCodigo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});moRegistros=[];moRenderMarcadores([]);document.getElementById('moContador').textContent='Seleccione por lo menos un filtro y presione Ver mapa.'}
async function moCargarCatalogos(){
  const d=await moApi({accion:'catalogosMapaOperativo',usuario:moUsuario()});
  const llenar=(id,lista,todos)=>{const e=document.getElementById(id);if(e)e.innerHTML=`<option value="">${todos}</option>`+(lista||[]).map(x=>`<option>${moEscape(x)}</option>`).join('')};
  llenar('moFiltroSede',d.sedes,'Todas');llenar('moFiltroGrupo',d.gruposTrabajo,'Todos');llenar('moFiltroEstado',d.estados,'Todos');llenar('moFiltroCuadrilla',d.cuadrillas,'Todas');
  moConstruirEstilosCuadrillas(d.cuadrillas||[]);
  moPintarUltimaActualizacion(d.ultimaActualizacionTexto);
}
async function moConsultarMapa(){
  const filtros={sede:moNorm(document.getElementById('moFiltroSede')?.value),fecha:moNorm(document.getElementById('moFiltroFecha')?.value),grupoTrabajo:moNorm(document.getElementById('moFiltroGrupo')?.value),estado:moNorm(document.getElementById('moFiltroEstado')?.value),cuadrilla:moNorm(document.getElementById('moFiltroCuadrilla')?.value),codigo:moNorm(document.getElementById('moBuscarCodigo')?.value)};
  if(!Object.values(filtros).some(Boolean)){document.getElementById('moContador').textContent='Debe seleccionar al menos un filtro para evitar cargar toda la base.';return}
  document.getElementById('moContador').textContent='Consultando órdenes...';
  const d=await moApi(Object.assign({accion:'listarMapaOperativo',usuario:moUsuario()},filtros));moRegistros=d.ordenes||[];moPintarUltimaActualizacion(d.ultimaActualizacionTexto);moRenderMarcadores(moRegistros);
}
function moInicializarMapa(){
  if(moMapa){moMapa.remove();moMapa=null}
  moMapa=L.map('moMapa',{zoomControl:true}).setView([-7.5,-79.0],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(moMapa);
  moCapa=L.layerGroup().addTo(moMapa);
  moMapa.on('zoomend',moAplicarModoZoomEtiquetas);
  moAplicarModoZoomEtiquetas();
}
function moFechaExcel(v){
  if(v instanceof Date&&!isNaN(v))return v;
  if(typeof v==='number'&&window.XLSX){const d=XLSX.SSF.parse_date_code(v);if(d)return new Date(d.y,d.m-1,d.d,d.H||0,d.M||0,d.S||0)}
  const t=moNorm(v); if(!t)return null; const m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);if(m)return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));const d=new Date(t);return isNaN(d)?null:d;
}
function moFmtFecha(d){return d?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`:''}
function moFmtHora(d){return d?`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:''}
function moFmtFechaHoraValor(v){const d=moFechaExcel(v);if(!d)return moNorm(v);const f=moFmtFecha(d),h=moFmtHora(d);return h&&h!=='00:00'?`${f} ${h}`:f}
function moCoord(v){const t=moNorm(v).replace(/[()]/g,'').replace(/;/g,',');const m=t.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);return m?[Number(m[1]),Number(m[2])]:[null,null]}
function moValor(row,map,...names){for(const n of names){const i=map[moNormCab(n)];if(i!==undefined&&row[i]!==undefined&&row[i]!==null)return row[i]}return ''}
async function moLeerArchivo(){
  const f=moArchivoSeleccionado||document.getElementById('moArchivo')?.files?.[0],msg=document.getElementById('moImportMsg'),btn=document.getElementById('moBtnImportar');
  if(!f){msg.className='mo-msg mo-error';msg.textContent='Arrastre o seleccione un archivo Excel.';return}
  try{msg.className='mo-msg';msg.textContent='Leyendo archivo...';const buf=await f.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});if(rows.length<2)throw new Error('El archivo no contiene registros.');
    let headerIndex=-1;
    for(let i=0;i<Math.min(rows.length,30);i++){
      const filaCab=(rows[i]||[]).map(moNormCab);
      if(filaCab.includes('ORDENID')){headerIndex=i;break}
    }
    if(headerIndex<0)throw new Error('No se encontró la fila de encabezados con OrdenId.');
    const headers=(rows[headerIndex]||[]).map(moNormCab),map={};headers.forEach((h,i)=>{if(h)map[h]=i});const out=[];
    rows.slice(headerIndex+1).forEach(r=>{const orden=moValor(r,map,'OrdenId','ORDEN_ID');if(!moNorm(orden))return;const fs=moFechaExcel(moValor(r,map,'F.Soli','FSOLI','FECHA SOLICITUD'));let dir=moNorm(moValor(r,map,'Direccion'));let dir2=moNorm(moValor(r,map,'Direccion1'));if(dir&&dir2&&moNormCab(dir)===moNormCab(dir2))dir2='';if(!dir&&dir2){dir=dir2;dir2=''}const [lat,lng]=moCoord(moValor(r,map,'Georeferencia','GEOREFERENCIA'));
      out.push({ordenId:moNorm(orden),tipoTrabajo:moNorm(moValor(r,map,'TipoTraba','TIPO_TRABAJO')),fechaSolicitud:moFmtFecha(fs),horaSolicitud:moFmtHora(fs),cliente:moNorm(moValor(r,map,'Cliente')),tipo:moNorm(moValor(r,map,'Tipo')),productoOrigen:moNorm(moValor(r,map,'Producto')),cuadrilla:moNorm(moValor(r,map,'Cuadrilla')),estado:moNorm(moValor(r,map,'Estado')),direccion:dir,direccionAdicional:dir2,fechaUltimoEstado:moFmtFechaHoraValor(moValor(r,map,'FechaUltimoEstado','Fecha Ultimo Estado')),productoServicio:moNorm(moValor(r,map,'IdenServi')),region:moNorm(moValor(r,map,'Region')),codigoCliente:moNorm(moValor(r,map,'CodiSeguiClien')),numeroDocumento:moNorm(moValor(r,map,'Número Documento','Numero Documento')),telefonoMovil:moNorm(moValor(r,map,'TeleMovilNume')),telefonoFijo:moNorm(moValor(r,map,'TeleFijoNume')),fechaInicioVisita:moFmtFechaHoraValor(moValor(r,map,'FechaIniVisi')),fechaFinVisita:moFmtFechaHoraValor(moValor(r,map,'FechaFinVisi')),motivoCancelacion:moNorm(moValor(r,map,'Motivo Cancelación','Motivo Cancelacion')),motivoFinalizacion:moNorm(moValor(r,map,'Motivo Finalización','Motivo Finalizacion')),motivoAnulacion:moNorm(moValor(r,map,'Motivo Anulación','Motivo Anulacion')),latitud:lat,longitud:lng,detalle:moNorm(moValor(r,map,'Detalle','UNNAMED','Motivo Regestión','Motivo Regestion'))});});
    if(!out.length)throw new Error('No se encontraron filas con OrdenId.');moImportacion=out;btn.disabled=false;const conGeo=out.filter(x=>Number.isFinite(x.latitud)&&Number.isFinite(x.longitud)).length;msg.className='mo-msg mo-ok';msg.textContent=`Archivo leído: ${out.length} órdenes; ${conGeo} con georreferencia válida. El historial existente se conservará y las coincidencias del mismo día se actualizarán.`;
  }catch(e){moImportacion=[];btn.disabled=true;msg.className='mo-msg mo-error';msg.textContent=e.message}
}
async function moRegistrarImportacion(){
  if(!moImportacion.length)return;const btn=document.getElementById('moBtnImportar'),msg=document.getElementById('moImportMsg');btn.disabled=true;msg.className='mo-msg';msg.textContent='Registrando información...';
  try{const d=await moApi({accion:'importarMapaOperativo',usuario:moUsuario(),registros:moImportacion});msg.className='mo-msg mo-ok';msg.textContent=`Registro terminado: ${d.nuevos} nuevos, ${d.actualizados} actualizados, ${d.repetidosCarga||0} repetidos consolidados y ${d.omitidos||0} omitidos.${d.consolidadosExistentes?` Se depuraron ${d.consolidadosExistentes} duplicados anteriores.`:''}`;moPintarUltimaActualizacion(d.ultimaActualizacionTexto);moImportacion=[];await moCargarCatalogos()}catch(e){msg.className='mo-msg mo-error';msg.textContent=e.message;btn.disabled=false}
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
function moIconoEstado(estado,cuadrilla){
  const color=moColorEstado(estado),estilo=moEstiloCuadrilla(cuadrilla),codigo=moCodigoCortoCuadrilla(cuadrilla),codigoMinimo=moCodigoMinimoCuadrilla(cuadrilla),oculta=moEtiquetasCuadrillaActivas()?'':' is-hidden';
  const etiqueta=`<span class="mo-cuadrilla-label${oculta}" style="--mo-cuadrilla-color:${estilo.color}" title="${moEscape(cuadrilla)}" aria-label="Cuadrilla ${moEscape(cuadrilla)}"><i class="mo-cuadrilla-trama mo-patron-${estilo.patron}" aria-hidden="true"></i><span class="mo-cuadrilla-codigo mo-cuadrilla-codigo-completo">${moEscape(codigo)}</span><span class="mo-cuadrilla-codigo mo-cuadrilla-codigo-minimo">${moEscape(codigoMinimo)}</span></span>`;
  return L.divIcon({className:'mo-marker-wrap',html:`<span class="mo-marker-stack"><span class="mo-marker" style="--mo-color:${color}"></span>${etiqueta}</span>`,iconSize:[145,49],iconAnchor:[25,48],popupAnchor:[0,-43]});
}
function moLeyendaCuadrillas(lista){
  const nombres=[...new Set((lista||[]).map(x=>moNorm(x.cuadrilla)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  if(!nombres.length)return '';
  const chips=nombres.map(nombre=>{const e=moEstiloCuadrilla(nombre);return `<span class="mo-cuadrilla-chip mo-patron-${e.patron}" style="--mo-cuadrilla-color:${e.color}" title="${moEscape(nombre)}">${moEscape(moCodigoCortoCuadrilla(nombre))}</span>`}).join('');
  return `<details class="mo-leyenda-cuadrillas"><summary>Cuadrillas visibles (${nombres.length})</summary><div>${chips}</div></details>`;
}
function moRenderMarcadores(lista){if(!moMapa||!moCapa)return;moCapa.clearLayers();moMarcadores={};const bounds=[];let validos=0;moConstruirEstilosCuadrillas((lista||[]).map(x=>x.cuadrilla));lista.forEach(x=>{const lat=Number(x.latitud),lng=Number(x.longitud);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const m=L.marker([lat,lng],{icon:moIconoEstado(x.estado,x.cuadrilla),riseOnHover:true}).bindPopup(moPopup(x),{autoClose:true,closeOnClick:true,maxWidth:310});m.on('click',()=>{moMapa.panTo([lat,lng]);});m.addTo(moCapa);moMarcadores[moNorm(x.ordenId)]=m;bounds.push([lat,lng]);validos++});if(bounds.length)moMapa.fitBounds(bounds,{padding:[25,25],maxZoom:16});setTimeout(moAplicarModoZoomEtiquetas,0);document.getElementById('moContador').innerHTML=`${validos} puntos visibles de ${lista.length} órdenes filtradas.<div class="mo-leyenda"><span><i style="--c:#16a34a"></i>Finalizada</span><span><i style="--c:#dc2626"></i>Cancelada</span><span><i style="--c:#eab308"></i>Reprogramada</span><span><i style="--c:#f97316"></i>Regestión</span><span><i style="--c:#64748b"></i>Anulada</span><span><i style="--c:#2563eb"></i>Pendiente/Agendada</span><span><i style="--c:#7c3aed"></i>En proceso</span></div>${moLeyendaCuadrillas(lista)}`}
function moBuscarCodigo(){moConsultarMapa()}
