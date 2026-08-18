/* ============================================================
   MI VISUAL V435 - SEGURIDAD ATS / PETAR DIGITAL
   Ajuste incremental sobre V433.
   - carga rápida con caché de sesión
   - logo corporativo
   - fecha/hora Perú
   - herramientas buscables y agrupadas
   - una tarea inicial + agregar tareas
   - medidas/riesgos sugeridos por tarea
   - reinicio de firma para pruebas de Jefatura
============================================================ */
(function(){
'use strict';

const API=window.MI_VISUAL_API_URL;
const LOGO_EMPRESA='./img/logo-visual-connections.png?v=V435';
const CACHE_TTL=45000;
let SEG={ctx:null,ats:null,petar:null,catalogo:null};

const DANOS=[
  'ELECTROCUCION','CAIDA DE OBJETOS','CAIDA A DESNIVEL','CAIDA A NIVEL','GOLPES','CORTES',
  'ATRAPAMIENTO','LESIONES EN MANOS','CONTACTO CON SUSTANCIAS PELIGROSAS','PROYECCION DE PARTICULAS','OTROS'
];

function n(v){return String(v??'').trim()}
function N(v){return n(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function e(v){return n(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function user(){return localStorage.getItem('usuario')||''}
function perfil(){return N(localStorage.getItem('perfil'))}
function esJefaturaPruebas(){return ['JEFATURA','JEFATURA GENERAL','ADMIN','ADMINISTRADOR'].includes(perfil())}
function cacheKey(){return 'MI_VISUAL_SEG435_CTX_'+N(user())}
function cacheLeer(){
  try{
    const x=JSON.parse(sessionStorage.getItem(cacheKey())||'null');
    if(x&&x.data&&Date.now()-Number(x.t||0)<CACHE_TTL)return x.data;
  }catch(_){}
  return null;
}
function cacheGuardar(d){try{sessionStorage.setItem(cacheKey(),JSON.stringify({t:Date.now(),data:d}))}catch(_){}}
function cacheBorrar(){try{sessionStorage.removeItem(cacheKey())}catch(_){}}

let SEG_PROCESANDO=false;
function procesoAbrir(texto){
  if(SEG_PROCESANDO)return false;
  SEG_PROCESANDO=true;
  let ov=document.getElementById('segProcesoOverlay');
  if(!ov){
    ov=document.createElement('div');ov.id='segProcesoOverlay';ov.className='seg-process-overlay';
    ov.innerHTML='<div class="seg-process-box"><div class="seg-process-spinner"></div><b id="segProcesoTexto">Procesando...</b><small>No cierre esta pantalla.</small></div>';
    document.body.appendChild(ov);
  }
  const t=ov.querySelector('#segProcesoTexto');if(t)t.textContent=texto||'Procesando...';
  ov.style.display='flex';return true;
}
function procesoTexto(texto){const t=document.getElementById('segProcesoTexto');if(t)t.textContent=texto||'Procesando...'}
function procesoCerrar(){const ov=document.getElementById('segProcesoOverlay');if(ov)ov.style.display='none';SEG_PROCESANDO=false}
async function conProceso(texto,fn){
  if(!procesoAbrir(texto))return null;
  try{return await fn()}finally{procesoCerrar()}
}

function fmtFecha(v){
  const s=n(v); if(!s)return '';
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s))return s;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const p=s.split('-');return `${p[2]}/${p[1]}/${p[0]}`}
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d=new Date(s);
    if(!isNaN(d))return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  }
  return s;
}
function fmtHora(v){
  const s=n(v); if(!s)return '';
  const hm=s.match(/^(\d{1,2}):(\d{2})/); if(hm)return `${hm[1].padStart(2,'0')}:${hm[2]}`;
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d=new Date(s);
    if(!isNaN(d))return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  }
  return s;
}

function eppTiene(lista,nombre){const k=N(nombre);return (lista||[]).some(x=>N(x)===k||(k==='OTROS'&&N(x).startsWith('OTROS')))}
function eppOtroTexto(lista){const x=(lista||[]).find(v=>N(v).startsWith('OTROS'));return x&&String(x).includes(':')?String(x).split(':').slice(1).join(':').trim():''}

async function api(payload,get){
  const p=Object.assign({usuario:user()},payload||{});
  if(get&&typeof mv336ApiGet==='function')return mv336ApiGet(API,p,{intentos:2,tiempoMs:20000});
  if(get){
    const u=new URL(API);Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,String(v)));
    const r=await fetch(u,{cache:'no-store'}),t=await r.text();let d;
    try{d=JSON.parse(t)}catch(_){throw Error('Respuesta inválida de Seguridad')}
    if(!d.ok)throw Error(d.error||'Error de Seguridad');return d;
  }
  const ctrl=typeof AbortController==='function'?new AbortController():null;
  const timer=ctrl?setTimeout(()=>ctrl.abort(),30000):null;
  try{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(p),cache:'no-store',signal:ctrl?.signal});
    const t=await r.text();let d;try{d=JSON.parse(t)}catch(_){throw Error('Respuesta inválida de Seguridad')}
    if(!d.ok)throw Error(d.error||'Error de Seguridad');return d;
  }catch(err){
    if(err?.name==='AbortError')throw Error('La operación tardó demasiado. Revise el estado antes de repetirla.');
    throw err;
  }finally{if(timer)clearTimeout(timer)}
}

function css(){return `<style>
.seg-wrap{max-width:1180px;margin:auto;padding:10px 10px 70px;color:#0f172a}
.seg-head{background:linear-gradient(120deg,#0f766e,#2563eb);color:#fff;border-radius:18px;padding:16px;margin-bottom:10px}
.seg-head h2{margin:0 0 3px}.seg-head p{margin:0;font-size:12px}
.seg-card{background:#fff;border:1px solid #d9e2ec;border-radius:15px;padding:12px;margin-bottom:10px;box-shadow:0 5px 15px rgba(15,23,42,.08)}
.seg-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer;background:#2563eb;color:#fff;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.seg-btn.gray{background:#64748b}.seg-btn.green{background:#16a34a}.seg-btn.red{background:#dc2626}.seg-btn.orange{background:#ea580c}
.seg-btn:disabled{opacity:.55;cursor:not-allowed}.seg-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.seg-note{padding:9px;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:11px}.seg-warn{background:#fff7ed;color:#9a3412}.seg-ok{background:#ecfdf5;color:#166534}
.seg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.seg-field label{display:block;font-size:10px;font-weight:900;color:#475569;margin-bottom:3px}
.seg-field input,.seg-field select,.seg-field textarea{width:100%;box-sizing:border-box;border:1px solid #b8c5d3;border-radius:8px;padding:8px;background:#fff}
.seg-field textarea{min-height:70px}.seg-paper{background:#fff;border:2px solid #475569;border-radius:3px;padding:8px;overflow:auto}
.seg-doc-head{display:grid;grid-template-columns:170px 1fr 150px;border:1px solid #64748b;min-width:760px}
.seg-doc-head>div{border-right:1px solid #64748b;padding:8px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:900}
.seg-doc-head>div:last-child{border:0}.seg-doc-head img{max-width:145px;max-height:70px;object-fit:contain}
.seg-doc-title{font-size:16px}.seg-nro{color:#dc2626;font-size:15px}.seg-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0;min-width:760px}
.seg-table{width:100%;border-collapse:collapse;min-width:980px;font-size:8.6px;line-height:1.12}.seg-table th,.seg-table td{border:1px solid #64748b;padding:4px;vertical-align:middle}
.seg-table th{background:#f1f5f9}.seg-table input,.seg-table select,.seg-table textarea{width:100%;box-sizing:border-box;background:#fff;font:inherit}.seg-table textarea{font-size:8px;line-height:1.12;min-height:46px;resize:vertical}
.seg-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.seg-check{border:1px solid #cbd5e1;border-radius:8px;padding:6px;font-size:10px;display:flex;gap:5px;align-items:center}
.seg-firma-canvas{width:100%;height:180px;border:2px dashed #94a3b8;border-radius:10px;background:#fff;touch-action:none}
.seg-pend{display:grid;gap:7px}.seg-item{border:1px solid #cbd5e1;border-radius:11px;padding:9px;background:#f8fafc}
.seg-pill{display:inline-block;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;background:#e2e8f0}
.seg-pill.pend{background:#fef3c7;color:#92400e}.seg-pill.ok{background:#dcfce7;color:#166534}.seg-pill.bad{background:#fee2e2;color:#991b1b}
.seg-danger{padding:10px;border:2px solid #dc2626;border-radius:10px;background:#fef2f2;color:#991b1b;font-weight:900;text-align:center}
.seg-task-select{min-width:185px;font-size:8.4px!important;padding:3px!important}.seg-danos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 8px;align-items:start}
.seg-danos label{font-size:7.4px;display:grid;grid-template-columns:15px minmax(0,1fr);gap:3px;align-items:start;line-height:1.08;text-align:left}.seg-danos label input{width:13px!important;height:13px!important;margin:0!important}.seg-danos-otro{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;gap:5px;align-items:center;margin-top:2px}.seg-danos-otro input[type="text"]{font-size:7.6px!important;padding:4px!important;border:1px solid #cbd5e1!important;border-radius:5px!important}.seg-sign{max-height:50px;max-width:140px}
.seg-coll{border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;margin-top:8px}.seg-coll summary{cursor:pointer;padding:10px;font-weight:900;background:#f8fafc}.seg-coll-body{padding:10px}
.seg-task-actions{display:flex;gap:5px;align-items:center;margin-top:5px}.seg-task-remove{border:0;border-radius:7px;padding:5px 7px;background:#fee2e2;color:#991b1b;font-weight:900;cursor:pointer}
.seg-tools-box{min-width:300px;font-size:8px}.seg-tools-search{border:1px solid #94a3b8!important;border-radius:8px!important;padding:7px!important;margin-bottom:6px}
.seg-tools-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:8px;font-weight:800;color:#475569;margin-bottom:5px}
.seg-tool-groups{max-height:235px;overflow:auto;border:1px solid #cbd5e1;border-radius:8px;padding:5px;background:#fff}
.seg-tool-group{margin-bottom:5px;border:1px solid #dbe3ee;border-radius:7px;background:#fff;overflow:hidden}.seg-tool-group:last-child{margin-bottom:0}
.seg-tool-group summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:6px;background:#e2e8f0;padding:5px 7px;cursor:pointer;font-size:8.4px;font-weight:950;color:#334155}.seg-tool-group summary::-webkit-details-marker{display:none}
.seg-tool-group-title{display:flex;align-items:center;gap:5px;min-width:0}.seg-tool-group-title input{width:14px!important;height:14px!important;margin:0!important}.seg-tool-group-count{font-size:7.4px;color:#64748b;white-space:nowrap}
.seg-tool-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;padding:4px}
.seg-tool-item{display:grid;grid-template-columns:15px minmax(0,1fr);gap:3px;align-items:start;border:1px solid #edf2f7;border-radius:5px;padding:3px;font-size:7.5px;line-height:1.08;background:#f8fafc}.seg-tool-item input{width:13px!important;height:13px!important;margin:0!important}
.seg-tools-read{display:flex;flex-wrap:wrap;gap:4px}.seg-tools-read span{padding:3px 5px;border-radius:6px;background:#e2e8f0;font-size:8.5px;font-weight:800}
.seg-test{border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;border-radius:10px;padding:9px;margin-top:8px;font-size:10px}
.seg-saving{font-size:10px;font-weight:800;color:#1d4ed8;margin-top:6px}
.seg-process-overlay{display:none;position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.42);align-items:center;justify-content:center;padding:18px}.seg-process-box{min-width:220px;max-width:330px;background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 18px 50px rgba(15,23,42,.35);display:grid;justify-items:center;gap:7px;color:#0f172a;text-align:center}.seg-process-box small{color:#64748b;font-size:10px}.seg-process-spinner{width:28px;height:28px;border:4px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:seg435spin .8s linear infinite}@keyframes seg435spin{to{transform:rotate(360deg)}}
@media(max-width:700px){
 .seg-grid{grid-template-columns:1fr}.seg-wrap{padding:6px 6px 70px}.seg-doc-head,.seg-meta{min-width:690px}.seg-paper{padding:5px}.seg-doc-title{font-size:13px}
 .seg-tool-items{grid-template-columns:1fr}
}
</style>`}

function btnVolver(){return `<button class="seg-btn gray" onclick="volverInicio()">← Volver</button>`}
function firmaHtml(f){return f&&f.url?`<img class="seg-sign" src="${e(f.url)}" alt="Firma">`:'<span class="seg-pill bad">SIN FIRMA</span>'}

function home(){
  const c=SEG.ctx||{},p=perfil(),tec=p==='TECNICO';
  let html=css()+`<div class="seg-wrap"><div class="seg-head"><h2>🦺 Seguridad · ATS / PETAR</h2><p>Documentos preventivos digitales con trazabilidad, firmas y validación.</p><div class="seg-actions">${btnVolver()}</div></div>`;
  const firmaEstado=c.firma?.activa?`<span class="seg-pill ok">REGISTRADA · V${e(c.firma.version)}</span>`:`<span class="seg-pill bad">PENDIENTE</span>`;
  const firmaBoton=c.firma?.activa?`<button class="seg-btn gray" onclick="seg433SolicitarCambioFirma()">Solicitar cambio de firma</button>`:`<button class="seg-btn" onclick="seg433Firma()">✍️ Registrar firma</button>`;
  html+=`<div class="seg-card"><b>Firma digital</b><div style="margin-top:7px">${firmaEstado}</div><div class="seg-actions">${firmaBoton}</div>`;
  if(esJefaturaPruebas()){
    html+=`<div class="seg-test"><b>Modo de pruebas</b><div>Jefatura puede reiniciar una firma para volver a registrarla desde V1.</div><div class="seg-actions"><button class="seg-btn orange" onclick="seg433ReiniciarFirmaPruebas()">Reiniciar firma</button></div></div>`;
  }
  html+=`</div>`;

  if(tec){
    const hay=!!c.hoy?.ats;
    html+=`<div class="seg-card"><b>ATS / PETAR del día</b><div class="seg-note" style="margin-top:7px">${hay?`ATS N° ${e(c.hoy.ats.numero)} · ${e(c.hoy.ats.estado)}${c.hoy.ats.total?` · Aceptación ${e(c.hoy.ats.aceptados)}/${e(c.hoy.ats.total)}`:''}`:'Aún no se ha generado el ATS de hoy para la cuadrilla.'}</div><div class="seg-actions">${hay?`<button class="seg-btn green" onclick="seg433AbrirAts('${e(c.hoy.ats.id)}')">Abrir ATS/PETAR</button>`:`<button class="seg-btn green" onclick="seg433GenerarDia(this)">Generar ATS/PETAR del día</button>`}</div></div>`;
  }else{
    const pend=c.pendientes||[];
    const tituloPend=perfil()==='SUPERVISOR'?'Pendientes de autorización':'Pendientes de validación';
    const pendHtml=pend.length?pend.map(x=>`<div class="seg-item"><b>${x.petarId?'ATS / PETAR':'ATS'} N° ${e(x.numero)} · ${e(x.cuadrilla)}</b><small style="display:block">${e(fmtFecha(x.fecha))} · ${e(x.sede)} · ${e(x.estado)}${x.total?` · Aceptación ${e(x.aceptados)}/${e(x.total)}`:''}</small><button class="seg-btn" style="margin-top:6px" onclick="seg433AbrirAts('${e(x.id)}')">Revisar</button></div>`).join(''):'<div class="seg-note seg-ok">Sin pendientes.</div>';
    html+=`<div class="seg-card"><b>${tituloPend}</b><div class="seg-pend" style="margin-top:8px">${pendHtml}</div></div>`;
    const seg=c.seguimiento||[];
    const segHtml=seg.length?seg.map(x=>`<div class="seg-item"><b>${x.petarId?'ATS / PETAR':'ATS'} N° ${e(x.numero)} · ${e(x.cuadrilla)}</b><small style="display:block">${e(fmtFecha(x.fecha))} · ${e(x.sede)} · ${e(x.estado)}${x.total?` · Aceptación ${e(x.aceptados)}/${e(x.total)}`:''}</small><button class="seg-btn gray" style="margin-top:6px" onclick="seg433AbrirAts('${e(x.id)}')">Ver documento</button></div>`).join(''):'<div class="seg-note">Sin documentos en seguimiento hoy.</div>';
    html+=`<div class="seg-card"><b>Seguimiento ATS / PETAR de hoy</b><div class="seg-note" style="margin:7px 0">Permite ver documentos en preparación o pendientes de aceptación. La autorización solo se habilita cuando T1 y T2 hayan aceptado.</div><div class="seg-pend">${segHtml}</div></div>`;
    const sols=c.solicitudesFirma||[];
    if(sols.length){
      html+=`<div class="seg-card"><b>Solicitudes de cambio de firma</b><div class="seg-pend" style="margin-top:8px">${sols.map(x=>`<div class="seg-item"><b>${e(x.nombre)}</b><small style="display:block">${e(x.usuario)} · ${e(x.motivo)}</small><div class="seg-actions"><button class="seg-btn green" onclick="seg433ResolverFirma('${e(x.id)}','APROBADO')">Autorizar</button><button class="seg-btn red" onclick="seg433ResolverFirma('${e(x.id)}','RECHAZADO')">Rechazar</button></div></div>`).join('')}</div></div>`;
    }
  }
  html+='</div>';
  mostrarPantalla(html);
}

async function refrescarContexto(){
  const d=await api({accion:'obtenerContextoSeguridadV432'},true);
  SEG.ctx=d;SEG.catalogo=d.catalogo||{};cacheGuardar(d);return d;
}
async function cargar(forzar){
  if(!forzar){
    const c=cacheLeer();
    if(c){SEG.ctx=c;SEG.catalogo=c.catalogo||{};home();return c}
  }
  const d=await refrescarContexto();home();return d;
}
async function mostrarSeguridad(){
  limpiarPantalla();
  document.getElementById('menuPrincipal')?.style.setProperty('display','none','important');
  setBotonNavegacion('modulo');
  const c=cacheLeer();
  if(c){
    SEG.ctx=c;SEG.catalogo=c.catalogo||{};home();
    refrescarContexto().then(()=>home()).catch(()=>{});
    return;
  }
  mostrarPantalla(css()+`<div class="seg-wrap"><div class="seg-card">Cargando Seguridad...</div></div>`);
  try{await cargar(true)}catch(err){mostrarPantalla(css()+`<div class="seg-wrap"><div class="seg-card seg-warn">${e(err.message)}</div>${btnVolver()}</div>`)}
}
async function generarDia(btn){
  if(btn)btn.disabled=true;
  try{
    await conProceso('Generando ATS / PETAR del día...',async()=>{
      procesoTexto('Obteniendo ubicación...');
      const g=await geo();
      procesoTexto('Generando ATS / PETAR...');
      const d=await api({accion:'crearAtsDiaSeguridadV432',gps:g});
      cacheBorrar();
      procesoTexto('Abriendo documento...');
      await abrirAtsCore(d.id);
    });
  }catch(err){alert(err.message)}
  finally{if(btn)btn.disabled=false}
}
function geo(){
  return new Promise(r=>{
    if(!navigator.geolocation)return r('');
    navigator.geolocation.getCurrentPosition(
      p=>r(`${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`),
      ()=>r(''),
      {enableHighAccuracy:true,timeout:5000,maximumAge:120000}
    );
  });
}
function esBorradorV432SinUso(a){
  if(N(a?.estado)!=='BORRADOR'||(a?.aceptaciones||[]).length)return false;
  const ts=(a?.tareas||[]).map(x=>N(x.tarea));
  return ts.length===6&&ts[0]==='REVISION DE UNIDAD, HERRAMIENTAS Y MATERIALES'&&ts[1]==='TRASLADO AL PUNTO DE TRABAJO';
}
function aplicarMigracionBorradorVisual(){
  if(!esBorradorV432SinUso(SEG.ats))return;
  const cat=(SEG.catalogo?.tareas||[]).find(x=>N(x.tarea)==='TRASLADO AL PUNTO DE TRABAJO')||(SEG.catalogo?.tareas||[])[0];
  if(cat)SEG.ats.tareas=[{tarea:cat.tarea,danos:[...(cat.danos||[])],controles:(cat.controles||[]).join('\n')}];
}
async function abrirAtsCore(id){
  const d=await api({accion:'obtenerDocumentoSeguridadV432',id},true);
  SEG.ats=d.ats;SEG.petar=d.petar;SEG.catalogo=d.catalogo||SEG.catalogo||{};
  aplicarMigracionBorradorVisual();
  renderAts();
}
async function abrirAts(id){
  try{await conProceso('Cargando ATS / PETAR...',()=>abrirAtsCore(id))}
  catch(err){alert(err.message)}
}

function herramientasActuales(){
  const h=SEG.ats?.herramientas;
  if(Array.isArray(h))return h;
  return n(h).split(/\n|,|;/).map(x=>x.trim()).filter(Boolean);
}
function toolsHtml(editable){
  const sel=new Set(herramientasActuales().map(N)),cat=SEG.catalogo?.herramientas||[];
  if(!editable){
    const vals=herramientasActuales();
    return vals.length?`<div class="seg-tools-read">${vals.map(x=>`<span>${e(x)}</span>`).join('')}</div>`:'<span class="seg-pill pend">SIN SELECCIÓN</span>';
  }
  const grupos={};
  cat.forEach(x=>{const g=n(x.categoria)||'GENERAL';(grupos[g]||(grupos[g]=[])).push(x)});
  const orden=['KIT DE FIBRA','MANUAL','SEGURIDAD','GENERAL'];
  const nombres=Object.keys(grupos).sort((a,b)=>{
    const ia=orden.indexOf(N(a)),ib=orden.indexOf(N(b));
    if(ia>=0||ib>=0)return (ia<0?999:ia)-(ib<0?999:ib);
    return a.localeCompare(b);
  });
  const cuerpo=nombres.map(g=>{
    const items=grupos[g];
    const marcados=items.filter(x=>sel.has(N(x.herramienta))).length;
    return `<details class="seg-tool-group" data-tool-group="${e(N(g))}">
      <summary><label class="seg-tool-group-title" onclick="event.stopPropagation()"><input type="checkbox" data-tool-group-check="${e(N(g))}" onchange="seg434ToggleGrupoHerramientas(this,'${e(N(g))}')"> <span>${e(g)}</span></label><span class="seg-tool-group-count">${items.length} herramienta(s)</span></summary>
      <div class="seg-tool-items">${items.map(x=>`<label class="seg-tool-item" data-tool-item="${e(N(x.herramienta))}"><input type="checkbox" data-tool="${e(x.herramienta)}" data-tool-cat="${e(N(g))}" ${sel.has(N(x.herramienta))?'checked':''} onchange="seg433ToolToggle()"><span>${e(x.herramienta)}</span></label>`).join('')}</div>
    </details>`;
  }).join('');
  return `<div class="seg-tools-box"><input class="seg-tools-search" id="segToolSearch" placeholder="Buscar herramienta..." oninput="seg433FiltrarHerramientas(this.value)"><div class="seg-tools-meta"><span>Marque el grupo completo o herramientas individuales</span><b id="segToolCount">${sel.size} seleccionada(s)</b></div><div class="seg-tool-groups">${cuerpo}</div></div>`;
}
function actualizarGruposHerramientas(){
  document.querySelectorAll('[data-tool-group-check]').forEach(ch=>{
    const cat=N(ch.dataset.toolGroupCheck),items=[...document.querySelectorAll(`[data-tool-cat="${CSS.escape(cat)}"]`)];
    if(!items.length){ch.checked=false;ch.indeterminate=false;return}
    const nSel=items.filter(x=>x.checked).length;
    ch.checked=nSel===items.length; ch.indeterminate=nSel>0&&nSel<items.length;
  });
}
function toggleGrupoHerramientas(ch,cat){
  document.querySelectorAll(`[data-tool-cat="${CSS.escape(N(cat))}"]`).forEach(x=>x.checked=!!ch.checked);
  toolToggle();
}
function toolToggle(){
  const c=document.getElementById('segToolCount');
  if(c)c.textContent=`${document.querySelectorAll('[data-tool]:checked').length} seleccionada(s)`;
  actualizarGruposHerramientas();
}
function filtrarHerramientas(valor){
  const q=N(valor);
  document.querySelectorAll('[data-tool-group]').forEach(g=>{
    const coincideGrupo=!q||N(g.dataset.toolGroup).includes(q);
    let visibles=0;
    g.querySelectorAll('[data-tool-item]').forEach(el=>{
      const ver=coincideGrupo||N(el.dataset.toolItem).includes(q);
      el.style.display=ver?'grid':'none'; if(ver)visibles++;
    });
    g.style.display=visibles?'block':'none';
    if(q&&visibles)g.open=true;
  });
}

function taskRow(t,i,editable){
  const catalogo=SEG.catalogo?.tareas||[],enCat=catalogo.some(x=>N(x.tarea)===N(t.tarea));
  const opts=`<option value="">Seleccione tarea...</option>`+catalogo.map(x=>`<option value="${e(x.tarea)}" ${N(x.tarea)===N(t.tarea)?'selected':''}>${e(x.tarea)}</option>`).join('')+`<option value="OTRA" ${t.tarea&&!enCat?'selected':''}>OTRA / MANUAL</option>`;
  const manual=t.tarea&&!enCat,otrosMarcado=(t.danos||[]).some(x=>N(x)==='OTROS');
  const danosHtml=DANOS.map(d=>`<label><input type="checkbox" data-d="${e(d)}" ${(t.danos||[]).some(x=>N(x)===N(d))?'checked':''} ${editable?'':'disabled'} onchange="seg434CambioDanoOtro(${i})"><span>${e(d)}</span></label>`).join('');
  return `<tr data-task="${i}">
    <td>
      <select class="seg-task-select" ${editable?'':'disabled'} onchange="seg433TareaCambio(${i},this.value)">${opts}</select>
      ${manual?`<input data-k="tarea" value="${e(t.tarea==='OTRA'?'':t.tarea)}" placeholder="Describa la tarea" ${editable?'':'readonly'}>`:''}
      ${editable&&i>0?`<div class="seg-task-actions"><button class="seg-task-remove" type="button" onclick="seg433QuitarTarea(${i})">Quitar tarea</button></div>`:''}
    </td>
    <td><div class="seg-danos">${danosHtml}<div class="seg-danos-otro" data-otro-wrap="${i}" style="${otrosMarcado?'':'display:none'}"><b>OTRO:</b><input type="text" data-k="otrosDano" value="${e(t.otrosDano||'')}" placeholder="Describa el posible daño" ${editable?'':'readonly'}></div></div></td>
    <td><textarea data-k="controles" ${editable?'':'readonly'}>${e(t.controles||'')}</textarea></td>
  </tr>`;
}
function cambioDanoOtro(i){
  const tr=document.querySelector(`tr[data-task="${i}"]`);if(!tr)return;
  const ch=[...tr.querySelectorAll('[data-d]')].find(x=>N(x.dataset.d)==='OTROS');
  const w=tr.querySelector(`[data-otro-wrap="${i}"]`);if(w)w.style.display=ch&&ch.checked?'grid':'none';
}

function renderAts(){
  const a=SEG.ats,editable=perfil()==='TECNICO'&&['BORRADOR','OBSERVADO'].includes(N(a.estado)),acept=a.aceptaciones||[];
  let h=css()+`<div class="seg-wrap"><div class="seg-actions">${btnVolver()}<button class="seg-btn gray" onclick="seg433CargarHome()">Inicio Seguridad</button></div>
  <div class="seg-paper" style="margin-top:8px">
    <div class="seg-doc-head">
      <div><img src="${LOGO_EMPRESA}" alt="Visual Connections"></div>
      <div class="seg-doc-title">ANÁLISIS DE TRABAJO SEGURO (ATS)</div>
      <div><div>ATS N° <span class="seg-nro">${e(a.numero)}</span><br><small>SGSST_ATS_01<br>Versión: ${e(a.version||1)}<br>Vigencia: 02/10/2023</small></div></div>
    </div>
    <div class="seg-meta">
      <div class="seg-grid">
        <div class="seg-field"><label>TRABAJO A REALIZAR</label><input id="segTrabajo" value="${e(a.trabajo)}" ${editable?'':'readonly'}></div>
        <div class="seg-field"><label>FECHA</label><input value="${e(fmtFecha(a.fecha))}" readonly></div>
        <div class="seg-field"><label>HORA DE INICIO</label><input value="${e(fmtHora(a.horaInicio))}" readonly></div>
      </div>
      <div class="seg-grid">
        <div class="seg-field"><label>PERMISO PETAR N°</label><input value="${e(SEG.petar?.numero||'')}" readonly></div>
        <div class="seg-field"><label>LUGAR DE TRABAJO</label><input id="segLugar" value="${e(a.lugarTrabajo)}" ${editable?'':'readonly'}></div>
        <div class="seg-field"><label>HORA FINAL</label><input id="segHoraFinal" type="${editable?'time':'text'}" value="${e(fmtHora(a.horaFinal||''))}" ${editable?'':'readonly'}></div>
      </div>
    </div>
    <table class="seg-table">
      <tr><th colspan="4">EQUIPOS DE PROTECCIÓN PERSONAL</th><th colspan="2">HERRAMIENTAS Y EQUIPOS</th></tr>
      <tr>
        <td colspan="4"><div class="seg-checks">${(SEG.catalogo?.epp||[]).map(x=>N(x)==='OTROS'?`<label class="seg-check"><input type="checkbox" data-epp="OTROS" ${eppTiene(a.epp,'OTROS')?'checked':''} ${editable?'':'disabled'}><span>OTROS</span><input type="text" data-epp-otro value="${e(eppOtroTexto(a.epp))}" placeholder="Indique" ${editable?'':'readonly'} style="min-width:90px;font-size:8px;padding:3px"></label>`:`<label class="seg-check"><input type="checkbox" data-epp="${e(x)}" ${eppTiene(a.epp,x)?'checked':''} ${editable?'':'disabled'}>${e(x)}</label>`).join('')}</div></td>
        <td colspan="2">${toolsHtml(editable)}</td>
      </tr>
    </table>
    <table class="seg-table" id="segTaskTable">
      <thead><tr><th style="width:22%">LISTA DE TAREAS</th><th style="width:45%">POSIBILIDAD DE DAÑO</th><th>MEDIDAS DE CONTROL</th></tr></thead>
      <tbody>${(a.tareas||[]).map((t,i)=>taskRow(t,i,editable)).join('')}</tbody>
    </table>
    ${editable?`<div class="seg-actions"><button class="seg-btn" onclick="seg433AgregarTarea()">+ Agregar otra tarea</button></div>`:''}
    <table class="seg-table" style="margin-top:8px">
      <tr><th colspan="3">HE LEÍDO Y ENTENDIDO ESTE DOCUMENTO (cada miembro de la cuadrilla debe aceptar)</th></tr>
      ${(a.integrantes||[]).map(x=>{const ac=acept.find(y=>N(y.usuario)===N(x.usuario));return `<tr><td>${e(x.nombre)}</td><td>${e(x.cargo)}</td><td>${ac?firmaHtml(ac.firma):'<span class="seg-pill pend">PENDIENTE</span>'}</td></tr>`}).join('')}
      <tr><td colspan="2">Supervisor / Responsable</td><td>${a.supervisorFirma?firmaHtml(a.supervisorFirma.firma||a.supervisorFirma):'<span class="seg-pill pend">PENDIENTE</span>'}</td></tr>
    </table>
  </div>`;

  if(SEG.petar)h+=`<details class="seg-coll" open><summary>PETAR - ALTURA N° ${e(SEG.petar.numero)}</summary><div class="seg-coll-body" id="segPetarArea"></div></details>`;

  const perfilesFinal=['JEFATURA','JEFATURA GENERAL','JEFATURA OPERACIONES','JEFATURA DE OPERACIONES','GERENCIA LIMA','GERENCIA GENERAL','GERENCIAL GENERAL','ADMIN','ADMINISTRADOR'];
  h+=`<div class="seg-card"><b>Estado: ${e(a.estado)}</b>
    ${editable?`<div class="seg-actions"><button class="seg-btn" onclick="seg433Guardar()">Guardar borrador</button><button class="seg-btn green" onclick="seg433Aceptar()">Aceptar y firmar</button></div>`:''}
    ${!editable&&perfil()==='TECNICO'&&!acept.some(x=>N(x.usuario)===N(user()))&&['PENDIENTE ACEPTACION','BORRADOR'].includes(N(a.estado))?`<div class="seg-actions"><button class="seg-btn green" onclick="seg433Aceptar()">Aceptar y firmar</button></div>`:''}
    ${perfil()==='SUPERVISOR'&&N(a.estado)==='PENDIENTE SUPERVISOR'?`<div class="seg-actions"><button class="seg-btn green" onclick="seg433Revisar('AUTORIZAR')">Autorizar con firma</button><button class="seg-btn orange" onclick="seg433Revisar('OBSERVAR')">Observar</button><button class="seg-btn red" onclick="seg433Revisar('RECHAZAR')">Rechazar</button></div>`:''}
    ${perfilesFinal.includes(perfil())&&N(a.estado)==='PENDIENTE VALIDACION'?`<div class="seg-actions"><button class="seg-btn green" onclick="seg433ValidarFinal('VALIDAR')">Validar y cerrar</button><button class="seg-btn orange" onclick="seg433ValidarFinal('OBSERVAR')">Observar</button><button class="seg-btn red" onclick="seg433ValidarFinal('RECHAZAR')">Rechazar</button></div>`:''}
    ${a.pdfUrl?`<div class="seg-actions"><a class="seg-btn green" target="_blank" href="${e(a.pdfUrl)}">PDF ATS</a>${SEG.petar?.pdfUrl?`<a class="seg-btn green" target="_blank" href="${e(SEG.petar.pdfUrl)}">PDF PETAR</a>`:''}</div>`:''}
  </div></div>`;
  mostrarPantalla(h);
  actualizarGruposHerramientas();
  if(SEG.petar)renderPetar(editable);
}
function renderPetar(editable){
  const p=SEG.petar,el=document.getElementById('segPetarArea');if(!el)return;
  el.innerHTML=`${p.noCumpleCritico?'<div class="seg-danger">🔴 TRABAJO NO AUTORIZADO</div>':''}
  <div class="seg-paper">
    <div class="seg-doc-head"><div><img src="${LOGO_EMPRESA}" alt="Visual Connections"></div><div class="seg-doc-title">PERMISO ESCRITO PARA TRABAJOS DE ALTO RIESGO (PETAR) - ALTURA</div><div>PETAR N° <span class="seg-nro">${e(p.numero)}</span><br><small>SGSST_PTAR_01<br>Versión: ${e(p.version||1)}<br>Vigencia: 02/10/2023</small></div></div>
    <div class="seg-meta"><div>TRABAJO: ${e(p.trabajo)}</div><div>FECHA: ${e(fmtFecha(p.fecha))}<br>HORA INICIO: ${e(fmtHora(p.horaInicio))}<br>HORA FINAL: ${e(fmtHora(p.horaFinal||''))}</div><div>UBICACIÓN: ${e(p.ubicacion)}</div></div>
    <div class="seg-note" style="font-size:8px;line-height:1.25;margin-bottom:6px"><b>INSTRUCCIONES:</b> Completar antes de iniciar el trabajo; el PETAR debe permanecer en el área de trabajo; es válido solo para el turno y fecha indicados; todo NO CUMPLE debe sustentarse en observaciones; si un requisito crítico no se cumple, la autorización NO PROCEDE.</div>
    <div style="font-size:8px;font-weight:900;margin:4px 0">CUMPLE ✓ &nbsp;&nbsp; NO CUMPLE ✕ &nbsp;&nbsp; NO APLICA N/A</div>
    <table class="seg-table"><thead><tr><th>#</th><th>LISTA DE VERIFICACIÓN</th><th>VERIFICACIÓN</th><th>OBSERVACIONES</th></tr></thead><tbody>
      ${(p.checklist||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${e(x.texto)}</td><td><select data-petar-i="${i}" ${editable?'':'disabled'}><option></option>${['CUMPLE','NO CUMPLE','NO APLICA'].map(v=>`<option ${N(x.estado)===v?'selected':''}>${v}</option>`).join('')}</select></td><td><input data-petar-o="${i}" value="${e(x.observacion||'')}" ${editable?'':'readonly'}></td></tr>`).join('')}
    </tbody></table>
    <div style="margin-top:8px"><b>EQUIPO DE PROTECCIÓN REQUERIDO</b><div class="seg-checks">${(SEG.catalogo?.eppPetar||[]).map(x=>N(x)==='OTROS'?`<label class="seg-check"><input type="checkbox" data-pepp="OTROS" ${eppTiene(p.epp,'OTROS')?'checked':''} ${editable?'':'disabled'}><span>OTROS (INDIQUE)</span><input type="text" data-pepp-otro value="${e(eppOtroTexto(p.epp))}" placeholder="Indique" ${editable?'':'readonly'} style="min-width:90px;font-size:8px;padding:3px"></label>`:`<label class="seg-check"><input type="checkbox" data-pepp="${e(x)}" ${eppTiene(p.epp,x)?'checked':''} ${editable?'':'disabled'}>${e(x)}</label>`).join('')}</div></div>
    <table class="seg-table" style="margin-top:8px"><tr><th colspan="3">PERSONAS ENCARGADAS DE LA EJECUCIÓN DEL TRABAJO</th></tr><tr><th>OCUPACIÓN O CARGO</th><th>NOMBRES Y APELLIDOS</th><th>FIRMA</th></tr>${(SEG.ats?.integrantes||[]).map(x=>{const ac=(SEG.ats?.aceptaciones||[]).find(y=>N(y.usuario)===N(x.usuario));return `<tr><td>${e(x.cargo)}</td><td>${e(x.nombre)}</td><td>${ac?firmaHtml(ac.firma):'<span class="seg-pill pend">PENDIENTE</span>'}</td></tr>`}).join('')}</table>
    <table class="seg-table" style="margin-top:8px"><tr><th colspan="3">AUTORIZACIÓN Y SUPERVISIÓN</th></tr><tr><th>CARGO</th><th>NOMBRES Y APELLIDOS</th><th>FIRMA</th></tr><tr><td>Supervisor o Responsable del trabajo</td><td>${e(SEG.ats?.supervisorFirma?.nombre||SEG.ats?.supervisorNombre||'')}</td><td>${SEG.ats?.supervisorFirma?firmaHtml(SEG.ats.supervisorFirma.firma||SEG.ats.supervisorFirma):'<span class="seg-pill pend">PENDIENTE</span>'}</td></tr></table>
  </div>`;
}

function datosAts(){
  const tareas=[...document.querySelectorAll('#segTaskTable tbody tr')].map(tr=>{
    const sel=n(tr.querySelector('.seg-task-select')?.value);
    const tarea=sel==='OTRA'?n(tr.querySelector('[data-k="tarea"]')?.value):sel;
    return {tarea,danos:[...tr.querySelectorAll('[data-d]:checked')].map(x=>x.dataset.d),otrosDano:n(tr.querySelector('[data-k="otrosDano"]')?.value),controles:n(tr.querySelector('[data-k="controles"]')?.value)};
  }).filter(x=>x.tarea);
  return {
    trabajo:n(document.getElementById('segTrabajo')?.value),
    lugarTrabajo:n(document.getElementById('segLugar')?.value),
    horaFinal:n(document.getElementById('segHoraFinal')?.value),
    herramientas:[...document.querySelectorAll('[data-tool]:checked')].map(x=>x.dataset.tool),
    epp:[...document.querySelectorAll('[data-epp]:checked')].map(x=>N(x.dataset.epp)==='OTROS'?(n(document.querySelector('[data-epp-otro]')?.value)?`OTROS: ${n(document.querySelector('[data-epp-otro]')?.value)}`:'OTROS'):x.dataset.epp),
    tareas
  };
}
function datosPetar(){
  if(!SEG.petar)return null;
  return {checklist:(SEG.petar.checklist||[]).map((x,i)=>Object.assign({},x,{estado:n(document.querySelector(`[data-petar-i="${i}"]`)?.value),observacion:n(document.querySelector(`[data-petar-o="${i}"]`)?.value)})),epp:[...document.querySelectorAll('[data-pepp]:checked')].map(x=>N(x.dataset.pepp)==='OTROS'?(n(document.querySelector('[data-pepp-otro]')?.value)?`OTROS: ${n(document.querySelector('[data-pepp-otro]')?.value)}`:'OTROS'):x.dataset.pepp)};
}
function sincronizarEstadoFormulario(){
  if(!document.getElementById('segTaskTable'))return;
  const d=datosAts();Object.assign(SEG.ats,d);
  const p=datosPetar();if(p&&SEG.petar)Object.assign(SEG.petar,p);
}
async function guardarCore(reabrir=true){
  const d=datosAts(),p=datosPetar();Object.assign(SEG.ats,d);if(p&&SEG.petar)Object.assign(SEG.petar,p);
  await api({accion:'guardarAtsSeguridadV432',id:SEG.ats.id,...d,petar:p});
  cacheBorrar();
  if(reabrir){procesoTexto('Actualizando documento...');await abrirAtsCore(SEG.ats.id)}
  return true;
}
async function guardar(reabrir=true){
  try{return await conProceso('Guardando ATS / PETAR...',()=>guardarCore(reabrir))}
  catch(err){alert(err.message);return false}
}
function agregarTarea(){
  sincronizarEstadoFormulario();
  SEG.ats.tareas=SEG.ats.tareas||[];
  SEG.ats.tareas.push({tarea:'',danos:[],controles:''});
  renderAts();
}
function quitarTarea(i){
  sincronizarEstadoFormulario();
  if(i<=0)return;
  SEG.ats.tareas.splice(i,1);renderAts();
}
function tareaCambio(i,val){
  sincronizarEstadoFormulario();
  if(val==='OTRA'){SEG.ats.tareas[i]={tarea:'OTRA',danos:[],controles:''};renderAts();return}
  const cat=(SEG.catalogo?.tareas||[]).find(x=>N(x.tarea)===N(val));
  if(!cat){SEG.ats.tareas[i]={tarea:'',danos:[],controles:''};renderAts();return}
  SEG.ats.tareas[i]={tarea:cat.tarea,danos:[...(cat.danos||[])],controles:(cat.controles||[]).join('\n')};
  renderAts();
}
async function aceptar(){
  try{
    await conProceso('Guardando y registrando aceptación...',async()=>{
      await guardarCore(false);
      procesoTexto('Registrando firma y aceptación...');
      const g=await geo();
      await api({accion:'aceptarAtsSeguridadV432',id:SEG.ats.id,gps:g});
      cacheBorrar();procesoTexto('Actualizando estado...');await abrirAtsCore(SEG.ats.id);
    });
  }catch(err){alert(err.message)}
}
async function revisar(accion){
  const motivo=accion==='AUTORIZAR'?'':prompt('Motivo:')||'';
  if(accion!=='AUTORIZAR'&&!motivo)return;
  const msg=accion==='AUTORIZAR'?'Autorizando ATS / PETAR...':accion==='OBSERVAR'?'Registrando observación...':'Rechazando ATS / PETAR...';
  try{await conProceso(msg,async()=>{await api({accion:'revisarAtsSupervisorV432',id:SEG.ats.id,resultado:accion,motivo});cacheBorrar();procesoTexto('Actualizando documento...');await abrirAtsCore(SEG.ats.id)})}
  catch(err){alert(err.message)}
}
async function validarFinal(resultado){
  const motivo=resultado==='VALIDAR'?'':prompt('Motivo:')||'';
  if(resultado!=='VALIDAR'&&!motivo)return;
  const msg=resultado==='VALIDAR'?'Validando y generando PDF...':resultado==='OBSERVAR'?'Registrando observación...':'Rechazando ATS / PETAR...';
  try{
    let pdf=false;
    await conProceso(msg,async()=>{
      const d=await api({accion:'validarAtsFinalV432',id:SEG.ats.id,resultado,motivo});
      pdf=!!d.pdfUrl;cacheBorrar();procesoTexto('Actualizando documento...');await abrirAtsCore(SEG.ats.id);
    });
    if(pdf)alert('Documento cerrado y PDF generado.');
  }catch(err){alert(err.message)}
}

function firma(){
  mostrarPantalla(css()+`<div class="seg-wrap"><div class="seg-card"><h3>Registrar firma digital</h3>
    <div class="seg-field"><label>DNI</label><input id="segDni" inputmode="numeric" maxlength="12"></div>
    <canvas id="segCanvas" class="seg-firma-canvas" width="900" height="260"></canvas>
    <div class="seg-actions"><button class="seg-btn gray" onclick="seg433LimpiarFirma()">Limpiar</button><button id="segGuardarFirmaBtn" class="seg-btn green" onclick="seg433GuardarFirma()">Guardar firma</button><button class="seg-btn gray" onclick="seg433CargarHome()">Cancelar</button></div>
    <div id="segFirmaEstado" class="seg-saving"></div>
    <div class="seg-note">La firma se registra una sola vez. Para cambiarla posteriormente se requiere autorización.</div>
  </div></div>`);
  setTimeout(initCanvas,0);
}
function initCanvas(){
  const c=document.getElementById('segCanvas');if(!c)return;
  const x=c.getContext('2d');x.lineWidth=4;x.lineCap='round';x.strokeStyle='#0f172a';let d=false;
  const pos=ev=>{const r=c.getBoundingClientRect(),p=ev.touches?ev.touches[0]:ev;return {x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}};
  const start=ev=>{d=true;const p=pos(ev);x.beginPath();x.moveTo(p.x,p.y);ev.preventDefault()};
  const move=ev=>{if(!d)return;const p=pos(ev);x.lineTo(p.x,p.y);x.stroke();ev.preventDefault()};
  const stop=()=>d=false;
  c.addEventListener('pointerdown',start);c.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);
}
function limpiarFirma(){const c=document.getElementById('segCanvas');c?.getContext('2d').clearRect(0,0,c.width,c.height)}
async function guardarFirma(){
  const c=document.getElementById('segCanvas'),dni=n(document.getElementById('segDni')?.value),btn=document.getElementById('segGuardarFirmaBtn'),estado=document.getElementById('segFirmaEstado');
  if(dni.length<8)return alert('Ingrese DNI válido.');
  if(btn)btn.disabled=true;if(estado)estado.textContent='Guardando firma...';
  try{
    await conProceso('Guardando firma digital...',async()=>{
      procesoTexto('Obteniendo ubicación...');const g=await geo();
      procesoTexto('Guardando firma digital...');
      await api({accion:'registrarFirmaSeguridadV432',dni,gps:g,firmaBase64:c.toDataURL('image/png').split(',')[1]});
      cacheBorrar();procesoTexto('Actualizando Seguridad...');await cargar(true);
    });
  }catch(err){
    if(/candado|lock|bloqueo|ocupado/i.test(String(err.message||''))){
      cacheBorrar();
      try{
        const d=await refrescarContexto();
        if(d.firma?.activa){home();return}
      }catch(_){}
      alert('El servidor estaba ocupado. Intente guardar la firma nuevamente.');
    }else alert(err.message);
  }finally{
    if(btn)btn.disabled=false;if(estado)estado.textContent='';
  }
}
async function solicitarCambioFirma(){
  const motivo=prompt('Indique el motivo del cambio de firma:');if(!motivo)return;
  try{await conProceso('Enviando solicitud de cambio de firma...',async()=>{await api({accion:'solicitarCambioFirmaSeguridadV432',motivo});cacheBorrar();await cargar(true)});alert('Solicitud enviada.')}catch(err){alert(err.message)}
}
async function resolverFirma(id,resultado){
  try{await conProceso(resultado==='APROBADO'?'Autorizando cambio de firma...':'Rechazando cambio de firma...',async()=>{await api({accion:'resolverCambioFirmaSeguridadV432',id,resultado});cacheBorrar();await cargar(true)})}catch(err){alert(err.message)}
}
async function reiniciarFirmaPruebas(){
  if(!esJefaturaPruebas())return;
  const objetivo=prompt('Usuario cuya firma desea reiniciar:',user());
  if(!objetivo)return;
  if(!confirm(`Se eliminarán las firmas de prueba de ${objetivo} y el próximo registro volverá a V1. ¿Continuar?`))return;
  try{
    let borradas=0;
    await conProceso('Reiniciando firma de prueba...',async()=>{const d=await api({accion:'reiniciarFirmaSeguridadV433',usuarioObjetivo:objetivo});borradas=d.borradas||0;cacheBorrar();await cargar(true)});
    alert(`Firma reiniciada. Registros eliminados: ${borradas}.`);
  }catch(err){alert(err.message)}
}

window.mostrarSeguridad=mostrarSeguridad;
window.seg433CargarHome=()=>cargar(true);
window.seg433GenerarDia=generarDia;
window.seg433AbrirAts=abrirAts;
window.seg433Guardar=guardar;
window.seg433AgregarTarea=agregarTarea;
window.seg433QuitarTarea=quitarTarea;
window.seg433TareaCambio=tareaCambio;
window.seg433Aceptar=aceptar;
window.seg433Revisar=revisar;
window.seg433ValidarFinal=validarFinal;
window.seg433Firma=firma;
window.seg433LimpiarFirma=limpiarFirma;
window.seg433GuardarFirma=guardarFirma;
window.seg433SolicitarCambioFirma=solicitarCambioFirma;
window.seg433ResolverFirma=resolverFirma;
window.seg433ReiniciarFirmaPruebas=reiniciarFirmaPruebas;
window.seg433FiltrarHerramientas=filtrarHerramientas;
window.seg433ToolToggle=toolToggle;
window.seg434ToggleGrupoHerramientas=toggleGrupoHerramientas;
window.seg434CambioDanoOtro=cambioDanoOtro;

})();
