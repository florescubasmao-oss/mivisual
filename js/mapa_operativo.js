const API_MAPA_OPERATIVO = (window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec");
let moMapa=null, moCapa=null, moCapaCto=null, moCapaCatalogoCto=null, moRegistros=[], moImportacion=[], moMarcadores={}, moArchivoSeleccionado=null;
let moOrdenCtoVisible='';
let moModoCtoEstado=null;
let moCatalogoCtoVisible=false;
let moEstilosCuadrilla={};
const MO_ETIQUETAS_CUADRILLA_KEY='miVisualMapaEtiquetasCuadrillaV254';
const MO_ESTILOS_CUADRILLA_KEY='miVisualMapaEstilosCuadrillaV254';
const MO_TOTAL_COLORES_CUADRILLA=72;
const MO_TOTAL_PATRONES_CUADRILLA=7;
const MO_TOTAL_ESTILOS_CUADRILLA=MO_TOTAL_COLORES_CUADRILLA*MO_TOTAL_PATRONES_CUADRILLA;

async function moApi(payload){
  const r=await fetch(API_MAPA_OPERATIVO,{method:'POST',body:JSON.stringify(payload)});
  const t=await r.text(); let d; try{d=JSON.parse(t)}catch(e){
    if(moNorm(t)==='MI VISUAL API OK')throw new Error('No se recibió la confirmación del registro. Espere unos segundos y revise la última actualización antes de volver a intentarlo.');
    throw new Error(t||'Respuesta no válida');
  }
  if(!d.ok) throw new Error(d.error||'Error en Mapa Operativo'); return d;
}
async function moApiLectura(payload){
  const url=new URL(API_MAPA_OPERATIVO);
  Object.keys(payload||{}).forEach(k=>url.searchParams.set(k,moNorm(payload[k])));
  const r=await fetch(url.toString(),{method:'GET',cache:'no-store'});
  const t=await r.text();let d;
  try{d=JSON.parse(t)}catch(e){
    if(moNorm(t)==='MI VISUAL API OK')throw new Error('Actualice Code.gs y cree una nueva versión de Apps Script.');
    throw new Error(t||'Respuesta no válida');
  }
  if(!d.ok)throw new Error(d.error||'Error al consultar Mapa Operativo');
  return d;
}
function moNorm(v){return (v??'').toString().trim()}
function moNormCab(v){return moNorm(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'')}
function moEscape(v){return moNorm(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function moUsuario(){return localStorage.getItem('usuario')||''}
function moPerfil(){return moNormCab(localStorage.getItem('perfil'))}
function moPuedeImportar(){
  if(typeof pmPuede==="function"&&typeof PM_PERMISOS_CARGADOS!=="undefined"&&PM_PERMISOS_CARGADOS){
    if(pmPuede("MAPA OPERATIVO","REGISTRAR"))return true;
  }
  return ['SUPERVISOR','JEFATURA','ADMIN','ADMINISTRADOR','JEFATURAOPERACIONES','JEFATURADEOPERACIONES','OPERACIONES'].includes(moPerfil());
}
function moPeriodoActual(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function moPeriodoValido(valor){const t=moNorm(valor);return /^\d{4}-(0[1-9]|1[0-2])$/.test(t)?t:''}
function moEtiquetaPeriodo(valor){
  const p=moPeriodoValido(valor);if(!p)return '';
  const meses=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const partes=p.split('-'),etiqueta=`${meses[Number(partes[1])-1]} ${partes[0]}`;
  return `${etiqueta} — ${p===moPeriodoActual()?'EN CURSO':'HISTÓRICO'}`;
}
function moCargarPeriodos(periodos){
  const select=document.getElementById('moFiltroPeriodo');if(!select)return;
  const actual=moPeriodoActual(),lista=[...new Set([actual,...(periodos||[]).map(moPeriodoValido).filter(Boolean)])].sort().reverse();
  select.innerHTML=lista.map(p=>`<option value="${p}">${moEscape(moEtiquetaPeriodo(p))}</option>`).join('');
  select.value=actual;moActualizarRangoFecha();
}
function moActualizarRangoFecha(){
  const periodo=moPeriodoValido(document.getElementById('moFiltroPeriodo')?.value),fecha=document.getElementById('moFiltroFecha');
  if(!fecha)return;
  if(!periodo){fecha.min='';fecha.max='';fecha.value='';return;}
  const [anio,mes]=periodo.split('-').map(Number),ultimo=new Date(anio,mes,0).getDate();
  fecha.min=`${periodo}-01`;fecha.max=`${periodo}-${String(ultimo).padStart(2,'0')}`;
  if(fecha.value&&!fecha.value.startsWith(periodo+'-'))fecha.value='';
}
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
  const original=(texto||'').toString().trim();
  const valor=(original&&typeof formatearFechaHoraTextoPeruApp==='function'?formatearFechaHoraTextoPeruApp(original,false):original)||'Sin actualización registrada';
  e.innerHTML=`<span class="mo-update-icon" aria-hidden="true">🕒</span><span class="mo-update-copy"><small>Última actualización</small><strong>${moEscape(valor)}</strong></span>`;
}

/* V418 - selección múltiple sin alterar la carga optimizada del Mapa */
const MO_MULTI_FILTROS_V418={grupoTrabajo:[],estado:[],cuadrilla:[]};

function moMultiCfgV418(tipo){
  const cfg={
    grupoTrabajo:{menu:'moMultiMenuGrupo',label:'moMultiLabelGrupo',todos:'Todos'},
    estado:{menu:'moMultiMenuEstado',label:'moMultiLabelEstado',todos:'Todos'},
    cuadrilla:{menu:'moMultiMenuCuadrilla',label:'moMultiLabelCuadrilla',todos:'Todas'}
  };
  return cfg[tipo]||null;
}
function moMultiValoresV418(tipo){
  return Array.isArray(MO_MULTI_FILTROS_V418[tipo])?MO_MULTI_FILTROS_V418[tipo].slice():[];
}
function moMultiResetV418(){
  MO_MULTI_FILTROS_V418.grupoTrabajo=[];
  MO_MULTI_FILTROS_V418.estado=[];
  MO_MULTI_FILTROS_V418.cuadrilla=[];
}
function moMultiEtiquetaV418(tipo){
  const cfg=moMultiCfgV418(tipo),lista=moMultiValoresV418(tipo);
  if(!cfg)return '';
  if(!lista.length)return cfg.todos;
  if(lista.length===1)return lista[0];
  return `${lista.length} seleccionados`;
}
function moMultiCerrarTodosV418(excepto){
  ['grupoTrabajo','estado','cuadrilla'].forEach(tipo=>{
    if(tipo===excepto)return;
    const cfg=moMultiCfgV418(tipo),menu=cfg&&document.getElementById(cfg.menu);
    if(menu)menu.hidden=true;
  });
}
function moMultiToggleV418(tipo){
  const cfg=moMultiCfgV418(tipo);if(!cfg)return;
  const menu=document.getElementById(cfg.menu);if(!menu)return;
  const abrir=menu.hidden;
  moMultiCerrarTodosV418(tipo);
  menu.hidden=!abrir;
}
function moMultiSeleccionV418(tipo,valor,marcado){
  const actual=new Set(moMultiValoresV418(tipo));
  if(valor==='__TODOS__'){
    actual.clear();
  }else if(marcado){
    actual.add(valor);
  }else{
    actual.delete(valor);
  }
  MO_MULTI_FILTROS_V418[tipo]=Array.from(actual);
  moMultiRefrescarV418(tipo);
}
function moMultiRefrescarV418(tipo){
  const cfg=moMultiCfgV418(tipo);if(!cfg)return;
  const label=document.getElementById(cfg.label);
  if(label)label.textContent=moMultiEtiquetaV418(tipo);
  const menu=document.getElementById(cfg.menu);
  if(!menu)return;
  const seleccion=new Set(moMultiValoresV418(tipo));
  menu.querySelectorAll('input[data-mo-multi]').forEach(ch=>{
    const valor=ch.getAttribute('data-mo-multi')||'';
    ch.checked=valor==='__TODOS__'?!seleccion.size:seleccion.has(valor);
  });
}
function moMultiCargarOpcionesV418(tipo,lista){
  const cfg=moMultiCfgV418(tipo);if(!cfg)return;
  const menu=document.getElementById(cfg.menu);if(!menu)return;
  const opciones=(lista||[]).filter(Boolean);
  menu.innerHTML=[
    `<label class="mo-multi-item mo-multi-todos"><input type="checkbox" data-mo-multi="__TODOS__" onchange="moMultiSeleccionV418('${tipo}','__TODOS__',this.checked)"><span>${cfg.todos}</span></label>`,
    ...opciones.map(x=>`<label class="mo-multi-item"><input type="checkbox" data-mo-multi="${moEscape(x)}" onchange="moMultiSeleccionV418('${tipo}',this.getAttribute('data-mo-multi'),this.checked)"><span>${moEscape(x)}</span></label>`)
  ].join('');
  moMultiRefrescarV418(tipo);
}
function moMultiInstalarCierreV418(){
  if(window.MO_MULTI_CIERRE_V418)return;
  window.MO_MULTI_CIERRE_V418=true;
  document.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('.mo-multi-v418'))return;
    moMultiCerrarTodosV418('');
  });
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
  moMultiResetV418();
  moMultiInstalarCierreV418();
  p.innerHTML=`<style>
  .mo-multi-v418{position:relative;min-width:0}
  .mo-multi-btn-v418{width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#0f172a;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;font:inherit;text-align:left;cursor:pointer}
  .mo-multi-btn-v418 b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mo-multi-menu-v418{position:absolute;z-index:2500;left:0;right:0;top:calc(100% + 5px);max-height:285px;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:11px;box-shadow:0 12px 28px rgba(15,23,42,.22);padding:6px}
  .mo-multi-menu-v418[hidden]{display:none!important}
  .mo-multi-item{display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;font-size:12px;line-height:1.25;cursor:pointer;color:#0f172a}
  .mo-multi-item:hover{background:#eff6ff}
  .mo-multi-item input{margin-top:1px;accent-color:#2563eb;flex:0 0 auto}
  .mo-multi-todos{border-bottom:1px solid #e2e8f0;margin-bottom:4px;font-weight:800}
  </style><div class="mo-wrap"><div class="mo-head"><h2 class="mo-title">🗺️ MAPA OPERATIVO</h2><div class="mo-actions"><div id="moUltimaActualizacion" class="mo-update-status" aria-live="polite"><span class="mo-update-icon" aria-hidden="true">🕒</span><span class="mo-update-copy"><small>Última actualización</small><strong>Consultando...</strong></span></div>${moPuedeImportar()?'<button class="mo-btn mo-btn-sec" onclick="moMostrarImportacion()">Ingresar datos</button>':''}</div></div>
  <div id="moVistaFiltros" class="mo-panel">
    <b>Seleccione la información que desea visualizar</b>
    <div class="mo-filtros mo-filtros-amplios" style="margin-top:9px">
      <div><label class="mo-label">Período</label><select id="moFiltroPeriodo" class="mo-select" onchange="moActualizarRangoFecha()"><option value="">Cargando...</option></select></div>
      <div><label class="mo-label">Sede</label><select id="moFiltroSede" class="mo-select"><option value="">Todas</option></select></div>
      <div><label class="mo-label">Fecha (opcional)</label><input id="moFiltroFecha" class="mo-input" type="date"></div>
      <div><label class="mo-label">Grupo de trabajo</label><div class="mo-multi-v418"><button type="button" class="mo-multi-btn-v418" onclick="event.stopPropagation();moMultiToggleV418('grupoTrabajo')"><b id="moMultiLabelGrupo">Todos</b><span>▾</span></button><div id="moMultiMenuGrupo" class="mo-multi-menu-v418" hidden onclick="event.stopPropagation()"></div></div></div>
      <div><label class="mo-label">Estado</label><div class="mo-multi-v418"><button type="button" class="mo-multi-btn-v418" onclick="event.stopPropagation();moMultiToggleV418('estado')"><b id="moMultiLabelEstado">Todos</b><span>▾</span></button><div id="moMultiMenuEstado" class="mo-multi-menu-v418" hidden onclick="event.stopPropagation()"></div></div></div>
      <div><label class="mo-label">Cuadrilla</label><div class="mo-multi-v418"><button type="button" class="mo-multi-btn-v418" onclick="event.stopPropagation();moMultiToggleV418('cuadrilla')"><b id="moMultiLabelCuadrilla">Todas</b><span>▾</span></button><div id="moMultiMenuCuadrilla" class="mo-multi-menu-v418" hidden onclick="event.stopPropagation()"></div></div></div>
      <div><label class="mo-label">Código de orden</label><input id="moBuscarCodigo" class="mo-input" placeholder="Ej. 1234567"></div>
      <button class="mo-btn" onclick="moConsultarMapa()">Ver mapa</button>
      <button class="mo-btn mo-btn-sec" onclick="moLimpiarFiltros()">Limpiar</button>
    </div>
    <div class="mo-identificacion-control"><div class="mo-controles-visibilidad"><label><input id="moMostrarCuadrillas" type="checkbox" ${moEtiquetasCuadrillaActivas()?'checked':''} onchange="moActualizarEtiquetasCuadrilla()"><span>Mostrar identificación de cuadrillas</span></label><label class="mo-cto-cercanas-opcion"><input id="moMostrarCtosCercanas" type="checkbox" onchange="moAlternarCtosCercanas(this)"><span>Mostrar CTO cercanas</span><em id="moCtoCercanasEstado">Ocultas</em></label></div><small>Las CTO del catálogo permanecen ocultas y solo aparecen dentro del área visible al activar la opción.</small></div>
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
function moLimpiarFiltros(){['moFiltroSede','moFiltroFecha','moBuscarCodigo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});moMultiResetV418();['grupoTrabajo','estado','cuadrilla'].forEach(moMultiRefrescarV418);moMultiCerrarTodosV418('');const periodo=document.getElementById('moFiltroPeriodo');if(periodo)periodo.value=moPeriodoActual();moActualizarRangoFecha();const cto=document.getElementById('moMostrarCtosCercanas');if(cto)cto.checked=false;moOcultarCatalogoCto();moRegistros=[];moRenderMarcadores([]);document.getElementById('moContador').textContent='Seleccione filtros y presione Ver mapa.'}
async function moCargarCatalogos(){
  const d=await moApiLectura({accion:'catalogosMapaOperativo',usuario:moUsuario()});
  const llenar=(id,lista,todos)=>{const e=document.getElementById(id);if(e)e.innerHTML=`<option value="">${todos}</option>`+(lista||[]).map(x=>`<option>${moEscape(x)}</option>`).join('')};
  moCargarPeriodos(d.periodos||[]);
  llenar('moFiltroSede',d.sedes,'Todas');
  moMultiCargarOpcionesV418('grupoTrabajo',d.gruposTrabajo||[]);
  moMultiCargarOpcionesV418('estado',d.estados||[]);
  moMultiCargarOpcionesV418('cuadrilla',d.cuadrillas||[]);
  moConstruirEstilosCuadrillas(d.cuadrillas||[]);
  moPintarUltimaActualizacion(d.ultimaActualizacionTexto);
}
async function moConsultarMapa(){
  const grupos=moMultiValoresV418('grupoTrabajo'),estados=moMultiValoresV418('estado'),cuadrillas=moMultiValoresV418('cuadrilla');
  const filtros={
    periodo:moPeriodoValido(document.getElementById('moFiltroPeriodo')?.value),
    sede:moNorm(document.getElementById('moFiltroSede')?.value),
    fecha:moNorm(document.getElementById('moFiltroFecha')?.value),
    gruposTrabajo:JSON.stringify(grupos),
    estados:JSON.stringify(estados),
    cuadrillas:JSON.stringify(cuadrillas),
    codigo:moNorm(document.getElementById('moBuscarCodigo')?.value)
  };
  if(!filtros.periodo){document.getElementById('moContador').textContent='Debe seleccionar el período que desea consultar.';return}
  if(filtros.fecha&&!filtros.fecha.startsWith(filtros.periodo+'-')){document.getElementById('moContador').textContent='La fecha debe pertenecer al período seleccionado.';return}
  const hayFiltro=!!(filtros.periodo||filtros.sede||filtros.fecha||grupos.length||estados.length||cuadrillas.length||filtros.codigo);
  if(!hayFiltro){document.getElementById('moContador').textContent='Debe seleccionar al menos un filtro para evitar cargar toda la base.';return}
  document.getElementById('moContador').textContent='Consultando órdenes...';
  const d=await moApiLectura(Object.assign({accion:'listarMapaOperativo',usuario:moUsuario()},filtros));moRegistros=d.ordenes||[];moPintarUltimaActualizacion(d.ultimaActualizacionTexto);moRenderMarcadores(moRegistros);if(document.getElementById('moMostrarCtosCercanas')?.checked)await moCargarCtosCercanas();
}
function moInicializarMapa(){
  if(moMapa){moMapa.remove();moMapa=null}
  moMapa=L.map('moMapa',{zoomControl:true}).setView([-7.5,-79.0],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(moMapa);
  moCapa=L.layerGroup().addTo(moMapa);
  moCapaCto=L.layerGroup().addTo(moMapa);
  moCapaCatalogoCto=L.layerGroup().addTo(moMapa);
  moOrdenCtoVisible='';
  moModoCtoEstado=null;
  moCatalogoCtoVisible=false;
  moCrearControlModoCto();
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
function moCoordCto(v){
  const numeros=moNorm(v).match(/-?\d+(?:\.\d+)?/g)||[];
  if(numeros.length<2)return '';
  const lat=Number(numeros[0]),lng=Number(numeros[1]);
  return Number.isFinite(lat)&&Number.isFinite(lng)?`${lat},${lng}`:'';
}
function moExtraerDatosCto(texto){
  const campos={};
  moNorm(texto).split(';').forEach(segmento=>{
    const partes=segmento.split('/');
    if(partes.length<3)return;
    const clave=moNormCab(partes.shift());
    partes.shift();
    const valor=moNorm(partes.join('/'));
    if(clave&&valor&&!campos[clave])campos[clave]=valor;
  });
  return {
    cto1:moNorm(campos.CTO1),
    coordenadaCto1:moCoordCto(campos.COORDENADACTO1),
    cto2:moNorm(campos.CTO2),
    coordenadaCto2:moCoordCto(campos.COORDENADACTO2),
    cto3:moNorm(campos.CTO3),
    coordenadaCto3:moCoordCto(campos.COORDENADACTO3),
    cto:moNorm(campos.CTO),
    puerto:moNorm(campos.PUERTO)
  };
}
function moDatosComplementariosFila(row,map){
  const indiceGeo=map.GEOREFERENCIA;
  if(indiceGeo!==undefined&&row[indiceGeo+1]!==undefined)return moNorm(row[indiceGeo+1]);
  return moNorm(moValor(row,map,'Datos CTO','Información CTO','Informacion CTO','Detalle CTO'));
}
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
    rows.slice(headerIndex+1).forEach(r=>{
      const orden=moValor(r,map,'OrdenId','ORDEN_ID');if(!moNorm(orden))return;
      const fs=moFechaExcel(moValor(r,map,'F.Soli','FSOLI','FECHA SOLICITUD'));
      let dir=moNorm(moValor(r,map,'Direccion')),dir2=moNorm(moValor(r,map,'Direccion1'));
      if(dir&&dir2&&moNormCab(dir)===moNormCab(dir2))dir2='';
      if(!dir&&dir2){dir=dir2;dir2=''}
      const [lat,lng]=moCoord(moValor(r,map,'Georeferencia','GEOREFERENCIA'));
      const datosCto=moExtraerDatosCto(moDatosComplementariosFila(r,map));
      out.push(Object.assign({
        ordenId:moNorm(orden),tipoTrabajo:moNorm(moValor(r,map,'TipoTraba','TIPO_TRABAJO')),fechaSolicitud:moFmtFecha(fs),horaSolicitud:moFmtHora(fs),
        cliente:moNorm(moValor(r,map,'Cliente')),tipo:moNorm(moValor(r,map,'Tipo')),productoOrigen:moNorm(moValor(r,map,'Producto')),
        cuadrilla:moNorm(moValor(r,map,'Cuadrilla')),estado:moNorm(moValor(r,map,'Estado')),direccion:dir,direccionAdicional:dir2,
        fechaUltimoEstado:moFmtFechaHoraValor(moValor(r,map,'FechaUltimoEstado','Fecha Ultimo Estado')),productoServicio:moNorm(moValor(r,map,'IdenServi')),
        region:moNorm(moValor(r,map,'Region')),codigoCliente:moNorm(moValor(r,map,'CodiSeguiClien')),
        codigoSeguimiento:moNorm(moValor(r,map,'CodiSegui')),
        numeroDocumento:moNorm(moValor(r,map,'Número Documento','Numero Documento')),telefonoMovil:moNorm(moValor(r,map,'TeleMovilNume')),
        telefonoFijo:moNorm(moValor(r,map,'TeleFijoNume')),fechaInicioVisita:moFmtFechaHoraValor(moValor(r,map,'FechaIniVisi')),
        fechaFinVisita:moFmtFechaHoraValor(moValor(r,map,'FechaFinVisi')),motivoCancelacion:moNorm(moValor(r,map,'Motivo Cancelación','Motivo Cancelacion')),
        motivoFinalizacion:moNorm(moValor(r,map,'Motivo Finalización','Motivo Finalizacion')),
        motivoAnulacion:moNorm(moValor(r,map,'Motivo Anulación','Motivo Anulacion')),latitud:lat,longitud:lng,
        detalle:moNorm(moValor(r,map,'Detalle','Motivo Regestión','Motivo Regestion'))
      },datosCto));
    });
    if(!out.length)throw new Error('No se encontraron filas con OrdenId.');moImportacion=out;btn.disabled=false;const conGeo=out.filter(x=>Number.isFinite(x.latitud)&&Number.isFinite(x.longitud)).length;const conCto=out.filter(x=>x.cto||x.puerto||x.cto1||x.cto2||x.cto3).length;msg.className='mo-msg mo-ok';msg.textContent=`Archivo leído: ${out.length} órdenes; ${conGeo} con georreferencia válida y ${conCto} con datos CTO. El historial existente se conservará y las coincidencias del mismo día se actualizarán.`;
  }catch(e){moImportacion=[];btn.disabled=true;msg.className='mo-msg mo-error';msg.textContent=e.message}
}
async function moRegistrarImportacion(){
  if(!moImportacion.length)return;const btn=document.getElementById('moBtnImportar'),msg=document.getElementById('moImportMsg');btn.disabled=true;msg.className='mo-msg';msg.textContent='Registrando información...';
  try{
    const d=await moApi({accion:'importarMapaOperativo',usuario:moUsuario(),registros:moImportacion});
    const c=d.catalogoCto||{};
    const confirmacion=`Registro confirmado: ${d.nuevos} nuevos, ${d.actualizados} actualizados, ${d.repetidosCarga||0} repetidos consolidados y ${d.omitidos||0} omitidos.${d.consolidadosExistentes?` Se depuraron ${d.consolidadosExistentes} duplicados anteriores.`:''} Catálogo CTO: ${c.nuevos||0} nuevos, ${c.actualizados||0} actualizados, ${c.total||0} únicos.`;
    msg.className='mo-msg mo-ok';msg.textContent=confirmacion;
    moPintarUltimaActualizacion(d.ultimaActualizacionTexto);moImportacion=[];
    try{await moCargarCatalogos()}catch(errorCatalogos){
      msg.className='mo-msg mo-ok';
      msg.textContent=confirmacion+' Los filtros se actualizarán al volver al mapa.';
    }
  }catch(e){msg.className='mo-msg mo-error';msg.textContent=e.message;btn.disabled=false}
}
function moMotivo(x){return x.motivoCancelacion||x.motivoFinalizacion||x.motivoAnulacion||''}
function moEsInstalacionCto(tipoTrabajo){return ['INSTALACION','INSTALACIONPOSIBLEFRAUDE'].includes(moNormCab(tipoTrabajo))}
function moHtmlCoordenadaCto(coordenada,ordenId){
  const [lat,lng]=moCoord(coordenada);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return '';
  const valor=`${lat},${lng}`;
  return `<span class="mo-cto-coord">${moEscape(valor)}</span><button type="button" class="mo-cto-link mo-cto-map-action" data-orden="${moEscape(ordenId)}" onclick="moMostrarCtosOrdenPorBoton(this)">Ver CTO</button>`;
}
function moCtosConCoordenadas(x){
  if(!x||!moEsInstalacionCto(x.tipoTrabajo))return [];
  return [1,2,3].map(n=>{
    const [lat,lng]=moCoord(x[`coordenadaCto${n}`]);
    return {numero:n,codigo:moNorm(x[`cto${n}`]),lat,lng};
  }).filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng));
}
function moIconoCto(cto){
  const codigo=cto.codigo||`CTO ${cto.numero}`;
  return L.divIcon({
    className:'mo-cto-marker-wrap',
    html:`<span class="mo-cto-marker-stack"><span class="mo-cto-map-marker"></span><span class="mo-cto-map-label"><b>CTO ${cto.numero}</b>${moEscape(codigo)}</span></span>`,
    iconSize:[235,45],
    iconAnchor:[14,42]
  });
}
function moIconoCatalogoCto(cto){
  return L.divIcon({
    className:'mo-catalogo-cto-marker-wrap',
    html:`<span class="mo-catalogo-cto-marker-stack"><span class="mo-catalogo-cto-marker"></span><span class="mo-catalogo-cto-label"><b>CTO</b>${moEscape(cto.codigo)}</span></span>`,
    iconSize:[235,45],
    iconAnchor:[15,42]
  });
}
function moEstadoCtosCercanas(texto,error){
  const e=document.getElementById('moCtoCercanasEstado');
  if(!e)return;
  e.textContent=texto||'Ocultas';
  e.classList.toggle('is-error',!!error);
}
function moOcultarCatalogoCto(){
  if(moCapaCatalogoCto)moCapaCatalogoCto.clearLayers();
  moCatalogoCtoVisible=false;
  moEstadoCtosCercanas('Ocultas',false);
}
function moPopupCatalogoCto(cto){
  const datos=[['Código CTO',cto.codigo],['Coordenada',cto.coordenada],['Sede',cto.sede],['Última actualización',cto.ultimaActualizacion],['Orden de referencia',cto.ordenReferencia],['Puerto de referencia',cto.puerto]].filter(x=>moNorm(x[1]));
  return `<div class="mo-popup mo-popup-catalogo-cto"><div class="mo-main-row"><b>Registro</b><span>Catálogo CTO</span></div>${datos.map(x=>`<div class="mo-main-row"><b>${moEscape(x[0])}</b><span>${moEscape(x[1])}</span></div>`).join('')}</div>`;
}
async function moCargarCtosCercanas(){
  const check=document.getElementById('moMostrarCtosCercanas');
  if(!check?.checked)return moOcultarCatalogoCto();
  if(!moMapa||!moCapaCatalogoCto||!moRegistros.length){
    check.checked=false;
    moOcultarCatalogoCto();
    moEstadoCtosCercanas('Primero consulte el mapa',true);
    return;
  }
  check.disabled=true;
  moEstadoCtosCercanas('Consultando...',false);
  try{
    const b=moMapa.getBounds().pad(.18);
    const d=await moApiLectura({
      accion:'listarCtosCercanasMapaOperativo',
      usuario:moUsuario(),
      sur:b.getSouth(),norte:b.getNorth(),oeste:b.getWest(),este:b.getEast(),
      sede:moNorm(document.getElementById('moFiltroSede')?.value),
      limite:600
    });
    if(!check.checked)return moOcultarCatalogoCto();
    moCapaCatalogoCto.clearLayers();
    (d.ctos||[]).forEach(cto=>{
      const lat=Number(cto.latitud),lng=Number(cto.longitud);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
      L.marker([lat,lng],{icon:moIconoCatalogoCto(cto),riseOnHover:true,zIndexOffset:700})
        .bindPopup(moPopupCatalogoCto(cto),{maxWidth:290})
        .addTo(moCapaCatalogoCto);
    });
    if(moMapa&&!moMapa.hasLayer(moCapaCatalogoCto))moCapaCatalogoCto.addTo(moMapa);
    moCatalogoCtoVisible=true;
    moEstadoCtosCercanas(`${d.mostradas||0} visibles${d.truncado?' · límite 600':''}`,false);
  }catch(e){
    check.checked=false;
    moOcultarCatalogoCto();
    moEstadoCtosCercanas(e.message||'No se pudieron cargar',true);
  }finally{check.disabled=false}
}
function moAlternarCtosCercanas(check){
  if(!check?.checked){moOcultarCatalogoCto();return;}
  moCargarCtosCercanas();
}
function moIconoClienteCto(orden){
  const codigo=moNorm(orden&&orden.codigoCliente)||moNorm(orden&&orden.ordenId)||'Ubicación';
  return L.divIcon({
    className:'mo-cliente-cto-marker-wrap',
    html:`<span class="mo-cliente-cto-marker-stack"><span class="mo-cliente-cto-map-marker"></span><span class="mo-cliente-cto-map-label"><b>CLIENTE</b>${moEscape(codigo)}</span></span>`,
    iconSize:[235,45],
    iconAnchor:[14,42]
  });
}
function moCrearControlModoCto(){
  if(!moMapa||!window.L)return;
  const control=L.control({position:'topright'});
  control.onAdd=()=>{
    const div=L.DomUtil.create('div','mo-cto-mode-control');
    div.id='moModoCtoBar';
    div.style.display='none';
    div.innerHTML='<span><b>Vista CTO</b><small id="moModoCtoTexto">Cliente y CTO visibles</small></span><button type="button" onclick="moSalirModoCto()">← Volver al mapa</button>';
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };
  control.addTo(moMapa);
}
function moMostrarControlModoCto(orden,cantidad){
  const barra=document.getElementById('moModoCtoBar');
  const texto=document.getElementById('moModoCtoTexto');
  if(texto)texto.textContent=`Cliente ${moNorm(orden&&orden.ordenId)||''} · ${cantidad} CTO`;
  if(barra)barra.style.display='flex';
}
function moOcultarControlModoCto(){
  const barra=document.getElementById('moModoCtoBar');
  if(barra)barra.style.display='none';
}
function moActualizarBotonesCto(ordenId,visible){
  const clave=moNorm(ordenId);
  document.querySelectorAll('.mo-cto-map-action').forEach(b=>{
    if(moNorm(b.dataset.orden)!==clave)return;
    b.textContent=visible?'Vista CTO':'Ver CTO';
    b.classList.toggle('is-active',!!visible);
  });
}
function moOcultarCtos(){
  const anterior=moOrdenCtoVisible;
  if(moCapaCto)moCapaCto.clearLayers();
  const estado=moModoCtoEstado;
  if(estado){
    if(estado.marcadorCliente){
      if(estado.iconoCliente)estado.marcadorCliente.setIcon(estado.iconoCliente);
      if(typeof estado.marcadorCliente.setZIndexOffset==='function')estado.marcadorCliente.setZIndexOffset(estado.zIndexCliente||0);
      if(estado.popupCliente)estado.marcadorCliente.bindPopup(estado.popupCliente);
    }
    (estado.capasOcultas||[]).forEach(capa=>{
      if(moCapa&&(!moCapa.hasLayer||!moCapa.hasLayer(capa)))moCapa.addLayer(capa);
    });
    if(estado.catalogoCtoVisible&&document.getElementById('moMostrarCtosCercanas')?.checked&&moCapaCatalogoCto&&moMapa&&!moMapa.hasLayer(moCapaCatalogoCto))moCapaCatalogoCto.addTo(moMapa);
    if(moMapa&&estado.centro&&Number.isFinite(estado.zoom))moMapa.setView(estado.centro,estado.zoom,{animate:false});
  }
  moModoCtoEstado=null;
  moOrdenCtoVisible='';
  moOcultarControlModoCto();
  if(anterior)moActualizarBotonesCto(anterior,false);
  setTimeout(moAplicarModoZoomEtiquetas,0);
}
function moSalirModoCto(){moOcultarCtos()}
function moMostrarCtosOrdenPorBoton(boton){
  const ordenId=moNorm(boton&&boton.dataset&&boton.dataset.orden);
  if(!ordenId||!moMapa||!moCapaCto)return;
  if(moOrdenCtoVisible===ordenId){moOcultarCtos();return;}
  moOcultarCtos();
  const orden=moRegistros.find(x=>moNorm(x.ordenId)===ordenId);
  const ctos=moCtosConCoordenadas(orden);
  if(!ctos.length)return;
  const centroActual=moMapa.getCenter();
  const estado={
    centro:[centroActual.lat,centroActual.lng],
    zoom:moMapa.getZoom(),
    capasOcultas:[],
    marcadorCliente:null,
    iconoCliente:null,
    zIndexCliente:0,
    popupCliente:null,
    catalogoCtoVisible:moCatalogoCtoVisible
  };
  const capas=[];
  if(moCapa&&typeof moCapa.eachLayer==='function')moCapa.eachLayer(capa=>capas.push(capa));
  estado.marcadorCliente=capas.find(capa=>capa&&capa._moRegistro===orden)||capas.find(capa=>moNorm(capa&&capa._moOrdenId)===ordenId)||null;
  estado.capasOcultas=capas.filter(capa=>capa!==estado.marcadorCliente);
  if(moMapa&&typeof moMapa.closePopup==='function')moMapa.closePopup();
  if(estado.catalogoCtoVisible&&moCapaCatalogoCto&&moMapa.hasLayer(moCapaCatalogoCto))moMapa.removeLayer(moCapaCatalogoCto);
  estado.capasOcultas.forEach(capa=>moCapa.removeLayer(capa));
  if(estado.marcadorCliente){
    estado.iconoCliente=estado.marcadorCliente.options&&estado.marcadorCliente.options.icon;
    estado.zIndexCliente=Number(estado.marcadorCliente.options&&estado.marcadorCliente.options.zIndexOffset)||0;
    estado.popupCliente=typeof estado.marcadorCliente.getPopup==='function'?estado.marcadorCliente.getPopup():null;
    if(typeof estado.marcadorCliente.unbindPopup==='function')estado.marcadorCliente.unbindPopup();
    estado.marcadorCliente.setIcon(moIconoClienteCto(orden));
    if(typeof estado.marcadorCliente.setZIndexOffset==='function')estado.marcadorCliente.setZIndexOffset(1000);
  }
  moModoCtoEstado=estado;
  const puntos=[];
  ctos.forEach(cto=>{
    L.marker([cto.lat,cto.lng],{icon:moIconoCto(cto),riseOnHover:true,zIndexOffset:900})
      .addTo(moCapaCto);
    puntos.push([cto.lat,cto.lng]);
  });
  const latCliente=Number(orden.latitud),lngCliente=Number(orden.longitud);
  if(Number.isFinite(latCliente)&&Number.isFinite(lngCliente))puntos.push([latCliente,lngCliente]);
  moOrdenCtoVisible=ordenId;
  moActualizarBotonesCto(ordenId,true);
  moMostrarControlModoCto(orden,ctos.length);
  moMapa.fitBounds(puntos,{padding:[38,38],maxZoom:18});
}
function moAlternarDetalleCto(detalle){
  const ordenId=moNorm(detalle&&detalle.dataset&&detalle.dataset.orden);
  if(!detalle.open&&ordenId&&ordenId===moOrdenCtoVisible)moOcultarCtos();
}
function moCtoDetalleHtml(x){
  const instalacion=moEsInstalacionCto(x.tipoTrabajo),filas=[];
  if(instalacion){
    [1,2,3].forEach(n=>{
      const rotulo=moNorm(x[`cto${n}`]),coordenada=moNorm(x[`coordenadaCto${n}`]);
      if(!rotulo&&!coordenada)return;
      filas.push(`<div class="mo-cto-item"><b>CTO ${n}</b><span>${moEscape(rotulo||'Sin rótulo')}</span>${moHtmlCoordenadaCto(coordenada,x.ordenId)}</div>`);
    });
    if(!filas.length&&moNorm(x.cto))filas.push(`<div class="mo-cto-item"><b>CTO</b><span>${moEscape(x.cto)}</span>${moNorm(x.puerto)?`<small>Puerto ${moEscape(x.puerto)}</small>`:''}</div>`);
  }else if(moNorm(x.cto)||moNorm(x.puerto)){
    filas.push(`<div class="mo-cto-item"><b>CTO</b><span>${moEscape(x.cto||'Sin rótulo')}</span>${moNorm(x.puerto)?`<small>Puerto ${moEscape(x.puerto)}</small>`:''}</div>`);
  }
  return filas.length?`<details class="mo-cto-detalle" data-orden="${moEscape(x.ordenId)}" ontoggle="moAlternarDetalleCto(this)"><summary>Ver CTO del cliente</summary><div class="mo-cto-list">${filas.join('')}</div></details>`:'';
}
function moPopup(x){const fields=[['Fecha',x.fechaSolicitud],['Hora',typeof formatearHoraPeruApp==='function'?formatearHoraPeruApp(x.horaSolicitud,false):x.horaSolicitud],['Cliente',x.cliente],['Tipo',x.tipo],['Producto',x.productoServicio||x.productoOrigen],['Dirección',x.direccion],['Dirección adicional',x.direccionAdicional],['Región',x.region],['Código de cliente',x.codigoCliente],['Documento',x.numeroDocumento],['Teléfono móvil',x.telefonoMovil],['Teléfono fijo',x.telefonoFijo],['Inicio de visita',typeof formatearFechaHoraTextoPeruApp==='function'?formatearFechaHoraTextoPeruApp(x.fechaInicioVisita,false):x.fechaInicioVisita],['Fin de visita',typeof formatearFechaHoraTextoPeruApp==='function'?formatearFechaHoraTextoPeruApp(x.fechaFinVisita,false):x.fechaFinVisita],['Motivo',moMotivo(x)],['Detalle',x.detalle]].filter(y=>moNorm(y[1]));const lat=Number(x.latitud),lng=Number(x.longitud);const ruta=Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}`:'';return `<div class="mo-popup"><div class="mo-main-row"><b>Tipo de trabajo</b><span>${moEscape(x.tipoTrabajo)}</span></div><div class="mo-main-row"><b>Cuadrilla</b><span>${moEscape(x.cuadrilla)}</span></div><div class="mo-main-row"><b>Estado</b><span>${moEscape(x.estado)}</span></div><div class="mo-main-row"><b>Código</b><span>${moEscape(x.ordenId)}</span></div><details class="mo-detalle"><summary>Detalle</summary><div class="mo-detalle-grid">${fields.map(y=>`<b>${moEscape(y[0])}</b><span>${moEscape(y[1])}</span>`).join('')}</div>${moCtoDetalleHtml(x)}</details>${ruta?`<a class="mo-como-llegar" href="${ruta}" target="_blank" rel="noopener noreferrer">📍 Cómo llegar en Google Maps</a>`:''}</div>`}
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
function moRenderMarcadores(lista){if(!moMapa||!moCapa)return;moOcultarCtos();if(moCapaCatalogoCto)moCapaCatalogoCto.clearLayers();moCatalogoCtoVisible=false;moCapa.clearLayers();moMarcadores={};const bounds=[];let validos=0;moConstruirEstilosCuadrillas((lista||[]).map(x=>x.cuadrilla));lista.forEach(x=>{const lat=Number(x.latitud),lng=Number(x.longitud);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const ordenId=moNorm(x.ordenId);const m=L.marker([lat,lng],{icon:moIconoEstado(x.estado,x.cuadrilla),riseOnHover:true}).bindPopup(moPopup(x),{autoClose:true,closeOnClick:true,maxWidth:310});m._moOrdenId=ordenId;m._moRegistro=x;m.on('click',()=>{if(moOrdenCtoVisible&&moOrdenCtoVisible!==ordenId)moOcultarCtos();moMapa.panTo([lat,lng]);});m.on('popupclose',()=>{if(moOrdenCtoVisible===ordenId)moOcultarCtos();});m.addTo(moCapa);moMarcadores[ordenId]=m;bounds.push([lat,lng]);validos++});if(bounds.length)moMapa.fitBounds(bounds,{padding:[25,25],maxZoom:16});setTimeout(moAplicarModoZoomEtiquetas,0);document.getElementById('moContador').innerHTML=`${validos} puntos visibles de ${lista.length} órdenes filtradas.<div class="mo-leyenda"><span><i style="--c:#16a34a"></i>Finalizada</span><span><i style="--c:#dc2626"></i>Cancelada</span><span><i style="--c:#eab308"></i>Reprogramada</span><span><i style="--c:#f97316"></i>Regestión</span><span><i style="--c:#64748b"></i>Anulada</span><span><i style="--c:#2563eb"></i>Pendiente/Agendada</span><span><i style="--c:#7c3aed"></i>En proceso</span></div>${moLeyendaCuadrillas(lista)}`}
function moBuscarCodigo(){moConsultarMapa()}
