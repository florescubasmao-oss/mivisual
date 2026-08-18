/* ============================================================
   MI VISUAL V443 - SEGURIDAD ATS / PETAR DIGITAL - GUIA SIN PREMARCADO
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
const LOGO_EMPRESA='./img/logo-visual-connections.png?v=V443';
const CACHE_TTL=45000;
let SEG={ctx:null,ats:null,petar:null,catalogo:null};

const DANOS=[
  'ELECTROCUCION','CAIDA DE OBJETOS','CAIDA A DESNIVEL','CAIDA A NIVEL','GOLPES','CORTES',
  'ATRAPAMIENTO','LESIONES EN MANOS','CONTACTO CON SUSTANCIAS PELIGROSAS','PROYECCION DE PARTICULAS','OTROS'
];

const GUIA_DANOS={
  'ELECTROCUCION':'Contacto directo o indirecto con redes, equipos o instalaciones energizadas.',
  'CAIDA DE OBJETOS':'Herramientas, materiales o componentes pueden caer y golpear a técnicos, clientes o terceros.',
  'CAIDA A DESNIVEL':'Existe riesgo de caída desde escalera, poste, fachada, desnivel o punto elevado.',
  'CAIDA A NIVEL':'Objetos, cables, desniveles menores o superficies inseguras pueden provocar tropiezos o resbalones.',
  'GOLPES':'Puede existir impacto contra herramientas, vehículo, estructuras, mobiliario o elementos del entorno.',
  'CORTES':'Fibra, cable, herramientas, herrajes o bordes pueden producir cortes.',
  'ATRAPAMIENTO':'Manos o extremidades pueden quedar atrapadas al mover escalera, bobina, herramientas o materiales.',
  'LESIONES EN MANOS':'La manipulación de herramientas, cable, fibra, conectores o herrajes puede lesionar las manos.',
  'CONTACTO CON SUSTANCIAS PELIGROSAS':'Puede existir contacto con alcohol isopropílico, polvo u otra sustancia utilizada durante el trabajo.',
  'PROYECCION DE PARTICULAS':'Perforación, corte, limpieza o manipulación de fibra puede proyectar partículas hacia ojos o rostro.',
  'OTROS':'Identifique cualquier daño adicional propio del lugar o de la tarea que realizará.'
};
let SEG_GUIA={paso:0,tarea:0,petar:0,confirmadas:{},visitadas:{}};
let SEG_GUIA_ERROR='';

function n(v){return String(v??'').trim()}
function N(v){return n(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function e(v){return n(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function user(){return localStorage.getItem('usuario')||''}
function perfil(){return N(localStorage.getItem('perfil'))}
function esJefaturaPruebas(){return ['JEFATURA','JEFATURA GENERAL','ADMIN','ADMINISTRADOR'].includes(perfil())}
function cacheKey(){return 'MI_VISUAL_SEG443_CTX_'+N(user())}
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
function seg436PintarProceso(){
  return new Promise(resolve=>{
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(resolve));
    else setTimeout(resolve,40);
  });
}
async function conProceso(texto,fn){
  if(!procesoAbrir(texto))return null;
  // V436: dar tiempo al navegador para pintar el aviso antes de iniciar fetch/GPS.
  await seg436PintarProceso();
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
function hora24(v,defecto=''){
  const s=n(v).toUpperCase(); if(!s)return defecto;
  let m=s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if(m){
    let h=Number(m[1])%12;if(m[3]==='PM')h+=12;
    return `${String(h).padStart(2,'0')}:${m[2]}`;
  }
  m=s.match(/^(\d{1,2}):(\d{2})/);
  if(m)return `${String(Math.max(0,Math.min(23,Number(m[1])))).padStart(2,'0')}:${m[2]}`;
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d=new Date(s);
    if(!isNaN(d))return new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  }
  return defecto;
}
function fmtHora(v){
  const h24=hora24(v,'');if(!h24)return '';
  const [hh,mm]=h24.split(':').map(Number),mer=hh>=12?'PM':'AM',h=(hh%12)||12;
  return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${mer}`;
}
function horaCambio(id){
  const el=document.getElementById(id),tag=document.getElementById(id+'Mer');if(!tag)return;
  tag.textContent=el&&el.value?fmtHora(el.value).split(' ')[1]:'—';
}

function eppTiene(lista,nombre){const k=N(nombre);return (lista||[]).some(x=>N(x)===k||(k==='OTROS'&&N(x).startsWith('OTROS')))}
function eppOtroTexto(lista){const x=(lista||[]).find(v=>N(v).startsWith('OTROS'));return x&&String(x).includes(':')?String(x).split(':').slice(1).join(':').trim():''}
function pdfDescargaUrl(id,url){const fid=n(id)||((n(url).match(/[-\w]{25,}/)||[])[0]||'');return fid?`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fid)}`:n(url)}

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
.seg-field textarea{min-height:70px}.seg-paper{background:#fff;border:2px solid #475569;border-radius:3px;padding:8px;overflow:auto;-webkit-overflow-scrolling:touch}
.seg-doc-head{display:grid;grid-template-columns:145px minmax(0,1fr) 180px;border:1px solid #64748b;min-width:700px}
.seg-doc-head>div{border-right:1px solid #64748b;padding:7px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:900;min-width:0;overflow:hidden}
.seg-doc-head>div:last-child{border:0}.seg-doc-head img{max-width:145px;max-height:70px;object-fit:contain}
.seg-doc-title{font-size:14px;line-height:1.15}.seg-nro{color:#dc2626;font-size:14px}.seg-doc-head small{font-size:8px;line-height:1.15;display:block;white-space:normal}.seg-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0;min-width:760px}
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
.seg-saving{font-size:10px;font-weight:800;color:#1d4ed8;margin-top:6px}.seg-auto-firma{display:block;margin-top:3px;font-size:7.5px;line-height:1.15;font-weight:900;color:#92400e}
.seg-process-overlay{display:none;position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.42);align-items:center;justify-content:center;padding:18px}.seg-process-box{min-width:220px;max-width:330px;background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 18px 50px rgba(15,23,42,.35);display:grid;justify-items:center;gap:7px;color:#0f172a;text-align:center}.seg-process-box small{color:#64748b;font-size:10px}.seg-time-wrap{display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:5px;align-items:center}.seg-time-mer{border:1px solid #b8c5d3;border-radius:8px;padding:8px 4px;background:#f8fafc;text-align:center;font-size:10px;font-weight:900;color:#334155}
.seg-process-spinner{width:28px;height:28px;border:4px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:seg435spin .8s linear infinite}@keyframes seg435spin{to{transform:rotate(360deg)}}

.seg-guide{max-width:720px;margin:10px auto}.seg-guide-progress{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:10px 0}.seg-guide-dot{height:6px;border-radius:999px;background:#dbe4ee}.seg-guide-dot.on{background:#2563eb}.seg-guide-card{background:#fff;border:1px solid #d7e0ea;border-radius:18px;padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.10)}.seg-guide-title{font-size:18px;font-weight:950;margin:0 0 5px}.seg-guide-sub{font-size:12px;color:#475569;line-height:1.4;margin-bottom:12px}.seg-guide-q{border:1px solid #dbe4ee;border-radius:12px;padding:11px;margin-bottom:8px;background:#f8fafc}.seg-guide-q b{font-size:12px}.seg-guide-required{color:#dc2626;font-size:10px;font-weight:900}.seg-guide-options{display:grid;gap:7px}.seg-guide-option{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;border:1px solid #dbe4ee;border-radius:11px;padding:10px;background:#fff;font-size:12px;line-height:1.3}.seg-guide-option input{width:18px;height:18px;margin:0}.seg-guide-help{font-size:10px;color:#64748b;margin-top:2px;line-height:1.3}.seg-guide-control{border-left:4px solid #16a34a;background:#f0fdf4}.seg-guide-risk{border-left:4px solid #f59e0b}.seg-guide-task{display:flex;gap:8px;align-items:flex-start;border:1px solid #cbd5e1;border-radius:11px;padding:10px;margin-bottom:7px;background:#fff}.seg-guide-task input{width:18px;height:18px;margin-top:1px}.seg-guide-nav{display:flex;justify-content:space-between;gap:8px;margin-top:14px}.seg-guide-nav .seg-btn{min-width:105px}.seg-guide-counter{font-size:10px;font-weight:900;color:#475569;margin-bottom:7px}.seg-guide-petar-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.seg-guide-answer{border:2px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:10px;padding:10px 5px;font-weight:900;cursor:pointer}.seg-guide-answer.sel{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.seg-guide-answer.bad.sel{border-color:#dc2626;background:#fef2f2;color:#991b1b}.seg-guide-answer.na.sel{border-color:#64748b;background:#f1f5f9;color:#334155}.seg-guide-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.seg-guide-summary>div{padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0}.seg-guide-read{background:#eff6ff;border-radius:10px;padding:9px;font-size:10.5px;color:#1e3a8a;line-height:1.4;margin-bottom:10px}.seg-guide-task-focus{background:linear-gradient(135deg,#dbeafe,#eff6ff);border:2px solid #2563eb;border-radius:14px;padding:13px 14px;margin:8px 0 12px;color:#0f172a}.seg-guide-task-focus small{display:block;font-size:9px;font-weight:900;color:#2563eb;text-transform:uppercase;margin-bottom:4px}.seg-guide-task-focus b{display:block;font-size:18px;line-height:1.18;color:#0f172a}.seg-guide-task-focus p{margin:5px 0 0;font-size:10.5px;color:#334155;line-height:1.35}.seg-guide-warning{background:#fff7ed;color:#9a3412}.seg-guide-ok{background:#ecfdf5;color:#166534}.seg-guide-group{border:1px solid #dbe4ee;border-radius:11px;margin-bottom:7px;overflow:hidden}.seg-guide-group summary{padding:9px 10px;background:#f1f5f9;font-weight:900;cursor:pointer}.seg-guide-group-body{padding:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.seg-guide-group-body label{font-size:11px;display:flex;gap:6px;align-items:flex-start}.seg-guide-group-body input{width:17px;height:17px}.seg-guide-time{display:grid;grid-template-columns:1fr 1fr;gap:8px}.seg-guide-confirm{display:flex;gap:7px;align-items:flex-start;border:1px solid #86efac;background:#f0fdf4;border-radius:10px;padding:9px;margin-top:10px;font-size:11px;font-weight:800}.seg-guide-confirm input{width:18px;height:18px;margin:0}.seg-guide-other{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:8px;padding:8px}.seg-guide-mini{font-size:9px;color:#64748b}.seg-guide-controls-list{display:grid;gap:6px;margin-top:7px}
@media(max-width:700px){
 .seg-guide{margin:4px auto}.seg-guide-card{padding:12px;border-radius:14px}.seg-guide-title{font-size:16px}.seg-guide-group-body{grid-template-columns:1fr}.seg-guide-summary{grid-template-columns:1fr}.seg-guide-time{grid-template-columns:1fr 1fr}.seg-guide-option{font-size:11.5px;padding:9px}.seg-guide-sub{font-size:11.5px}.seg-guide-task-focus b{font-size:17px}.seg-guide-task-focus{padding:12px}
 .seg-grid{grid-template-columns:1fr}.seg-wrap{padding:6px 6px 70px}.seg-doc-head,.seg-meta{min-width:690px}.seg-paper{padding:5px}.seg-doc-title{font-size:13px}
 .seg-tool-items{grid-template-columns:1fr}.seg-doc-head,.seg-meta{min-width:680px}.seg-table{min-width:760px;font-size:8px}.seg-doc-title{font-size:12px}.seg-doc-head{grid-template-columns:125px minmax(380px,1fr) 170px}
}
</style>`}

function btnVolver(){return `<button class="seg-btn gray" onclick="volverInicio()">← Volver</button>`}
function firmaHtml(f){return f&&f.url?`<img class="seg-sign" src="${e(f.url)}" alt="Firma">`:'<span class="seg-pill bad">SIN FIRMA</span>'}
function firmaAceptacionHtml(ac){
  if(!ac)return '<span class="seg-pill pend">PENDIENTE</span>';
  const auto=N(ac.autocompletada)==='SI';
  const nota=auto?`<small class="seg-auto-firma">AUTOCOMPLETADA / AUTORIZADA POR ${e(ac.autorizadaPerfil||'RESPONSABLE')} · ${e(ac.autorizadaNombre||ac.autorizadaPor||'')}</small>`:'';
  return firmaHtml(ac.firma)+nota;
}

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
    html+=`<div class="seg-card"><b>Seguimiento ATS / PETAR de hoy</b><div class="seg-note" style="margin:7px 0">Permite ver documentos en preparación o pendientes de aceptación. Con al menos una aceptación técnica, el Supervisor puede autorizar; la firma faltante se completa con trazabilidad.</div><div class="seg-pend">${segHtml}</div></div>`;
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
  SEG.ctx=d;SEG.catalogo=d.catalogo||SEG.catalogo||{};cacheGuardar(d);return d;
}
async function cargar(forzar){
  if(!forzar){
    const c=cacheLeer();
    if(c){SEG.ctx=c;SEG.catalogo=c.catalogo||SEG.catalogo||{};home();return c}
  }
  const d=await refrescarContexto();home();return d;
}
async function mostrarSeguridad(){
  limpiarPantalla();
  document.getElementById('menuPrincipal')?.style.setProperty('display','none','important');
  setBotonNavegacion('modulo');
  const c=cacheLeer();
  if(c){
    SEG.ctx=c;SEG.catalogo=c.catalogo||SEG.catalogo||{};home();
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
  if(perfil()==='TECNICO'&&['BORRADOR','OBSERVADO'].includes(N(SEG.ats?.estado))){SEG_GUIA={paso:0,tarea:0,petar:0,confirmadas:{},visitadas:{}}}
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


function guiaCatalogoTarea(nombre){return (SEG.catalogo?.tareas||[]).find(x=>N(x.tarea)===N(nombre))||null}
function guiaControles(t){
  const actuales=n(t?.controles).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(actuales.length)return actuales;
  const c=guiaCatalogoTarea(t?.tarea);return c?(c.controles||[]):[];
}
function guiaNormalizarTarea(t){
  // V441: conservar únicamente lo que el técnico realmente seleccionó.
  // El catálogo sigue sirviendo para RECOMENDAR riesgos/controles, pero ya no los marca automáticamente.
  return {tarea:n(t?.tarea),danos:Array.isArray(t?.danos)?[...t.danos]:[],otrosDano:n(t?.otrosDano),controles:n(t?.controles)};
}
function guiaProgreso(){
  const total=6,actual=Math.max(0,Math.min(total-1,SEG_GUIA.paso));
  return `<div class="seg-guide-progress">${Array.from({length:total},(_,i)=>`<div class="seg-guide-dot ${i<=actual?'on':''}"></div>`).join('')}</div>`;
}
function guiaShell(titulo,sub,cuerpo,nav=''){
  return css()+`<div class="seg-wrap"><div class="seg-actions">${btnVolver()}<button class="seg-btn gray" onclick="seg433CargarHome()">Inicio Seguridad</button></div><div class="seg-guide">${guiaProgreso()}<div class="seg-guide-card"><h3 class="seg-guide-title">${titulo}</h3><div class="seg-guide-sub">${sub}</div>${cuerpo}${nav}</div></div></div>`;
}
function guiaNav(anterior=true,siguiente=true,txt='Siguiente'){
  return `<div class="seg-guide-nav">${anterior?`<button class="seg-btn gray" onclick="seg440Anterior()">← Anterior</button>`:'<span></span>'}${siguiente?`<button class="seg-btn" onclick="seg440Siguiente()">${txt} →</button>`:''}</div>`;
}
function guiaCapturarDatos(){
  const tr=document.getElementById('segGuiaTrabajo'),lu=document.getElementById('segGuiaLugar'),hi=document.getElementById('segGuiaHoraInicio'),hf=document.getElementById('segGuiaHoraFinal');
  if(tr)SEG.ats.trabajo=n(tr.value);if(lu)SEG.ats.lugarTrabajo=n(lu.value);if(hi)SEG.ats.horaInicio=fmtHora(hi.value||'07:45');if(hf)SEG.ats.horaFinal=hf.value?fmtHora(hf.value):'';
}
function guiaCapturarEpp(){
  const els=[...document.querySelectorAll('[data-guia-epp]:checked')];if(!els.length)return false;
  SEG.ats.epp=els.map(x=>N(x.dataset.guiaEpp)==='OTROS'?(n(document.getElementById('segGuiaEppOtro')?.value)?`OTROS: ${n(document.getElementById('segGuiaEppOtro')?.value)}`:'OTROS'):x.dataset.guiaEpp);return true;
}
function guiaCapturarHerramientas(){
  SEG.ats.herramientas=[...document.querySelectorAll('[data-guia-tool]:checked')].map(x=>x.dataset.guiaTool);return true;
}
function guiaCapturarTareas(){
  const nombres=[...document.querySelectorAll('[data-guia-tarea]:checked')].map(x=>x.dataset.guiaTarea);
  const otroChk=!!document.getElementById('segGuiaTareaOtraChk')?.checked,otroTxt=n(document.getElementById('segGuiaTareaOtra')?.value);
  if(otroChk&&!otroTxt){alert('Describa la otra tarea.');return false}
  if(otroChk&&otroTxt)nombres.push(otroTxt);
  if(!nombres.length)return false;
  const prev=new Map((SEG.ats.tareas||[]).map(x=>[N(x.tarea),x]));
  SEG.ats.tareas=nombres.map(nombre=>{
    const viejo=prev.get(N(nombre));
    // V441: solo conservar selecciones de una tarea ya confirmada en esta sesión.
    // Una tarea nueva (o todavía no revisada) empieza SIN daños ni medidas marcadas.
    if(viejo&&SEG_GUIA.confirmadas[N(nombre)])return guiaNormalizarTarea(viejo);
    return {tarea:nombre,danos:[],otrosDano:'',controles:''};
  });
  // V443: cada vez que el técnico confirma la lista de tareas, la revisión de
  // riesgos/controles empieza desde cero. Nunca heredamos marcas de un ATS previo.
  SEG_GUIA.confirmadas={};
  SEG_GUIA.visitadas={};
  SEG_GUIA.tarea=Math.min(SEG_GUIA.tarea,Math.max(0,SEG.ats.tareas.length-1));return true;
}
function guiaCapturarRiesgosControles(){
  SEG_GUIA_ERROR='';
  const t=SEG.ats.tareas?.[SEG_GUIA.tarea];if(!t){SEG_GUIA_ERROR='No se encontró la tarea actual.';return false}
  t.danos=[...document.querySelectorAll('[data-guia-dano]:checked')].map(x=>x.dataset.guiaDano);
  t.otrosDano=n(document.getElementById('segGuiaOtroDano')?.value);
  let controles=[...document.querySelectorAll('[data-guia-control]:checked')].map(x=>x.dataset.guiaControl);
  const manualCtrl=n(document.getElementById('segGuiaControlManual')?.value);if(manualCtrl)controles=[manualCtrl];
  t.controles=controles.join('\n');
  const conf=!!document.getElementById('segGuiaConfirmo')?.checked;
  const tieneOtros=t.danos.some(x=>N(x)==='OTROS');
  if(!t.danos.length)SEG_GUIA_ERROR='Marque al menos un posible daño para esta tarea.';
  else if(tieneOtros&&!t.otrosDano)SEG_GUIA_ERROR='Marcó OTROS. Describa cuál es el posible daño adicional.';
  else if(!controles.length)SEG_GUIA_ERROR='Marque al menos una medida de control que aplicará.';
  else if(!conf)SEG_GUIA_ERROR='Confirme que ha leído los riesgos y que aplicará las medidas seleccionadas.';
  if(!SEG_GUIA_ERROR){SEG_GUIA.confirmadas[N(t.tarea)]=true;return true}
  delete SEG_GUIA.confirmadas[N(t.tarea)];return false;
}
function guiaCapturarPetar(){
  const p=SEG.petar,idx=SEG_GUIA.petar,x=p?.checklist?.[idx];if(!x)return false;
  const sel=document.querySelector('[data-guia-petar].sel');if(!sel)return false;
  x.estado=sel.dataset.guiaPetar;x.observacion=n(document.getElementById('segGuiaPetarObs')?.value);return true;
}
function guiaValidarTodo(){
  if(!n(SEG.ats.trabajo)||!n(SEG.ats.lugarTrabajo))return 'Complete trabajo y lugar de trabajo.';
  if(!(SEG.ats.epp||[]).length)return 'Seleccione el EPP que utilizará.';
  if(!(SEG.ats.tareas||[]).length)return 'Seleccione al menos una tarea.';
  for(const t of SEG.ats.tareas||[]){if(!(t.danos||[]).length)return `Falta confirmar los posibles daños de: ${t.tarea}`;if(!n(t.controles))return `Falta confirmar las medidas de control de: ${t.tarea}`;if(!SEG_GUIA.confirmadas[N(t.tarea)])return `Debe leer y confirmar riesgos y medidas de: ${t.tarea}`}
  if(SEG.petar){for(const x of SEG.petar.checklist||[]){if(!N(x.estado))return 'Complete toda la lista de verificación del PETAR.';if(x.critico&&N(x.estado)==='NO CUMPLE')return 'Existe un NO CUMPLE crítico. El trabajo no puede autorizarse hasta corregir la condición.'}}
  return '';
}
function guiaPasoDatos(){
  const a=SEG.ats;const body=`<div class="seg-guide-read"><b>Antes de iniciar:</b> confirme los datos de la jornada. MI VISUAL ya completó la información conocida de su cuadrilla.</div><div class="seg-guide-q"><b>Trabajo a realizar <span class="seg-guide-required">* obligatorio</span></b><input id="segGuiaTrabajo" class="seg-guide-other" value="${e(a.trabajo||'')}"></div><div class="seg-guide-q"><b>Lugar de trabajo <span class="seg-guide-required">* obligatorio</span></b><input id="segGuiaLugar" class="seg-guide-other" value="${e(a.lugarTrabajo||'')}"></div><div class="seg-guide-time"><div class="seg-guide-q"><b>Hora de inicio</b><input id="segGuiaHoraInicio" class="seg-guide-other" type="time" value="${e(hora24(a.horaInicio,'07:45'))}"><div class="seg-guide-mini">Por defecto 07:45 AM; puede editarla.</div></div><div class="seg-guide-q"><b>Hora final</b><input id="segGuiaHoraFinal" class="seg-guide-other" type="time" value="${e(hora24(a.horaFinal,''))}"><div class="seg-guide-mini">Puede dejarla pendiente y completarla antes de firmar.</div></div></div>`;
  mostrarPantalla(guiaShell('1. Datos de la jornada','Lea y confirme antes de continuar.',body,guiaNav(false,true)));
}
function guiaPasoEpp(){
  const sel=new Set((SEG.ats.epp||[]).filter(x=>N(x)!=='OTROS'||String(x).includes(':')).map(x=>N(String(x).split(':')[0]))),otro=eppOtroTexto(SEG.ats.epp||[]);
  const body=`<div class="seg-guide-read"><b>¿Qué EPP utilizará hoy?</b> Marque únicamente lo que llevará y verificará antes de iniciar.</div><div class="seg-guide-options">${(SEG.catalogo?.epp||[]).map(x=>N(x)==='OTROS'?`<label class="seg-guide-option"><input type="checkbox" data-guia-epp="OTROS" ${sel.has('OTROS')?'checked':''}><div><b>OTROS</b><input id="segGuiaEppOtro" class="seg-guide-other" value="${e(otro)}" placeholder="Describa el EPP adicional"></div></label>`:`<label class="seg-guide-option"><input type="checkbox" data-guia-epp="${e(x)}" ${sel.has(N(x))?'checked':''}><div><b>${e(x)}</b></div></label>`).join('')}</div>`;
  mostrarPantalla(guiaShell('2. Equipos de protección personal','Esta selección quedará registrada en el ATS.',body,guiaNav()));
}
function guiaPasoHerramientas(){
  const sel=new Set((SEG.ats.herramientas||[]).map(N)),cat=SEG.catalogo?.herramientas||[],grupos={};cat.forEach(x=>{const g=n(x.categoria)||'GENERAL';(grupos[g]||(grupos[g]=[])).push(x)});
  const body=`<div class="seg-guide-read"><b>¿Qué herramientas y equipos utilizará?</b> Puede marcar todo un grupo o elegir elementos individuales.</div>${Object.keys(grupos).sort().map(g=>`<details class="seg-guide-group" open><summary><label onclick="event.stopPropagation()"><input type="checkbox" data-guia-tool-group="${e(N(g))}" onchange="seg440GrupoHerramientas(this,'${e(N(g))}')"> ${e(g)} - marcar grupo</label></summary><div class="seg-guide-group-body">${grupos[g].map(x=>`<label><input type="checkbox" data-guia-tool="${e(x.herramienta)}" data-guia-tool-cat="${e(N(g))}" ${sel.has(N(x.herramienta))?'checked':''}>${e(x.herramienta)}</label>`).join('')}</div></details>`).join('')}`;
  mostrarPantalla(guiaShell('3. Herramientas y equipos','Seleccione lo que realmente utilizará durante la jornada.',body,guiaNav()));
}
function seg440GrupoHerramientas(ch,cat){
  document.querySelectorAll(`[data-guia-tool-cat="${CSS.escape(N(cat))}"]`).forEach(x=>x.checked=!!ch.checked);
}
function guiaPasoTareas(){
  const sel=new Set((SEG.ats.tareas||[]).map(x=>N(x.tarea))),cat=SEG.catalogo?.tareas||[];
  const manual=(SEG.ats.tareas||[]).find(x=>!guiaCatalogoTarea(x.tarea));const body=`<div class="seg-guide-read"><b>¿Qué acciones realizará hoy?</b> Seleccione todas las tareas previstas. Después MI VISUAL le mostrará los riesgos y las medidas de control de cada una.</div>${cat.map(x=>`<label class="seg-guide-task"><input type="checkbox" data-guia-tarea="${e(x.tarea)}" ${sel.has(N(x.tarea))?'checked':''}><div><b>${e(x.tarea)}</b><div class="seg-guide-help">Riesgos sugeridos: ${(x.danos||[]).map(e).join(', ')}</div></div></label>`).join('')}<label class="seg-guide-task"><input type="checkbox" id="segGuiaTareaOtraChk" ${manual?'checked':''}><div><b>OTRA TAREA</b><div class="seg-guide-help">Úsela cuando la actividad no esté contemplada en la lista.</div><input id="segGuiaTareaOtra" class="seg-guide-other" value="${e(manual?.tarea||'')}" placeholder="Describa la tarea"></div></label>`;
  mostrarPantalla(guiaShell('4. Tareas de la jornada','Esta parte define qué riesgos debe revisar.',body,guiaNav()));
}
function guiaPasoRiesgos(){
  const t=SEG.ats.tareas?.[SEG_GUIA.tarea];if(!t){SEG_GUIA.paso=5;return renderTecnicoGuiado()}
  const clave=N(t.tarea);
  // V443: la primera vez que se abre cada tarea en esta sesión SIEMPRE empieza
  // sin daños, sin controles y sin confirmación marcados. Si el técnico vuelve
  // hacia atrás dentro de la misma sesión, sí conservamos lo que él marcó.
  SEG_GUIA.visitadas=SEG_GUIA.visitadas||{};
  if(!SEG_GUIA.visitadas[clave]){
    t.danos=[];
    t.otrosDano='';
    t.controles='';
    delete SEG_GUIA.confirmadas[clave];
    SEG_GUIA.visitadas[clave]=true;
  }
  const controles=guiaControles(t),seleccionados=new Set(n(t.controles).split(/\n+/).map(N).filter(Boolean));
  const riesgos=DANOS.map(d=>`<label class="seg-guide-option seg-guide-risk"><input type="checkbox" data-guia-dano="${e(d)}" ${(t.danos||[]).some(x=>N(x)===N(d))?'checked':''}><div><b>${e(d)}</b><div class="seg-guide-help">${e(GUIA_DANOS[d]||'')}</div>${N(d)==='OTROS'?`<input id="segGuiaOtroDano" class="seg-guide-other" value="${e(t.otrosDano||'')}" placeholder="Describa el daño adicional">`:''}</div></label>`).join('');
  // V441: las medidas se RECOMIENDAN, pero nunca aparecen marcadas por defecto.
  const ctrl=controles.length?controles.map(c=>`<label class="seg-guide-option seg-guide-control"><input type="checkbox" data-guia-control="${e(c)}" ${seleccionados.has(N(c))?'checked':''}><div><b>${e(c)}</b></div></label>`).join(''):`<div class="seg-guide-read seg-guide-warning">Esta tarea no está en el catálogo. Escriba una medida de control adecuada y confirme que la aplicará.</div><input id="segGuiaControlManual" class="seg-guide-other" placeholder="Ejemplo: Delimitar el área, usar EPP y mantener orden durante la tarea." value="${e(t.controles||'')}">`;
  const body=`<div class="seg-guide-counter">Tarea ${SEG_GUIA.tarea+1} de ${(SEG.ats.tareas||[]).length}</div><div class="seg-guide-task-focus"><small>TAREA A REALIZAR</small><b>${e(t.tarea)}</b><p>Lea los posibles daños y marque únicamente los que reconoce para esta actividad. Después seleccione las medidas que realmente aplicará.</p></div><h4>Posibles daños</h4><div class="seg-guide-options">${riesgos}</div><h4 style="margin-top:12px">Medidas de control recomendadas</h4><div class="seg-guide-controls-list">${ctrl}</div><label class="seg-guide-confirm"><input id="segGuiaConfirmo" type="checkbox" ${SEG_GUIA.confirmadas[N(t.tarea)]?'checked':''}><span>He leído los riesgos y confirmo que aplicaré las medidas de control seleccionadas para esta tarea.</span></label>`;
  mostrarPantalla(guiaShell('5. Comprenda el riesgo y cómo controlarlo','No es solo marcar: lea qué puede pasar y cómo debe prevenirlo.',body,`<div class="seg-guide-nav"><button class="seg-btn gray" onclick="seg440TareaAnterior()">← ${SEG_GUIA.tarea?'Tarea anterior':'Volver'}</button><button class="seg-btn" onclick="seg440TareaSiguiente()">${SEG_GUIA.tarea<(SEG.ats.tareas||[]).length-1?'Siguiente tarea':'Continuar al PETAR'} →</button></div>`));
}
function guiaCapturarPetarEpp(){
  if(!SEG.petar)return true;
  const els=[...document.querySelectorAll('[data-guia-pepp]:checked')];if(!els.length)return false;
  SEG.petar.epp=els.map(x=>N(x.dataset.guiaPepp)==='OTROS'?(n(document.getElementById('segGuiaPetarEppOtro')?.value)?`OTROS: ${n(document.getElementById('segGuiaPetarEppOtro')?.value)}`:'OTROS'):x.dataset.guiaPepp);return true;
}
function guiaPasoPetarEpp(){
  const lista=SEG.catalogo?.eppPetar||[],sel=new Set((SEG.petar?.epp||[]).filter(x=>N(x)!=='OTROS'||String(x).includes(':')).map(x=>N(String(x).split(':')[0]))),otro=eppOtroTexto(SEG.petar?.epp||[]);
  const body=`<div class="seg-guide-read"><b>Equipo de protección requerido para trabajo en altura.</b> Confirme únicamente el EPP que realmente se encuentra disponible y en condiciones de uso.</div><div class="seg-guide-options">${lista.map(x=>N(x)==='OTROS'?`<label class="seg-guide-option"><input type="checkbox" data-guia-pepp="OTROS" ${sel.has('OTROS')?'checked':''}><div><b>OTROS</b><input id="segGuiaPetarEppOtro" class="seg-guide-other" value="${e(otro)}" placeholder="Indique"></div></label>`:`<label class="seg-guide-option"><input type="checkbox" data-guia-pepp="${e(x)}" ${sel.has(N(x))?'checked':''}><div><b>${e(x)}</b></div></label>`).join('')}</div>`;
  mostrarPantalla(guiaShell('6. PETAR - EPP para altura','Última verificación antes del resumen.',body,`<div class="seg-guide-nav"><button class="seg-btn gray" onclick="seg440PetarEppAnterior()">← Lista de verificación</button><button class="seg-btn" onclick="seg440PetarEppSiguiente()">Ver resumen →</button></div>`));
}
function guiaPasoPetar(){
  const p=SEG.petar,items=p?.checklist||[];if(!items.length){SEG_GUIA.paso=6;return renderTecnicoGuiado()}
  if(SEG_GUIA.petar>=items.length)return guiaPasoPetarEpp();
  const i=SEG_GUIA.petar,x=items[i],est=N(x.estado);
  const body=`<div class="seg-guide-counter">Verificación ${i+1} de ${items.length}</div><div class="seg-guide-read ${x.critico?'seg-guide-warning':''}">${x.critico?'<b>Control crítico.</b> ':''}Lea la condición y responda según lo que realmente encuentra antes de iniciar.</div><div class="seg-guide-q"><h3 style="margin:0 0 10px;font-size:15px">${e(x.texto)}</h3><div class="seg-guide-petar-btns"><button class="seg-guide-answer ${est==='CUMPLE'?'sel':''}" data-guia-petar="CUMPLE" onclick="seg440PetarElegir(this)">✓ CUMPLE</button><button class="seg-guide-answer bad ${est==='NO CUMPLE'?'sel':''}" data-guia-petar="NO CUMPLE" onclick="seg440PetarElegir(this)">✕ NO CUMPLE</button><button class="seg-guide-answer na ${est==='NO APLICA'?'sel':''}" data-guia-petar="NO APLICA" onclick="seg440PetarElegir(this)">N/A</button></div><textarea id="segGuiaPetarObs" class="seg-guide-other" placeholder="Observación, cuando corresponda">${e(x.observacion||'')}</textarea>${x.critico?'<div class="seg-guide-help">Si responde NO CUMPLE, el trabajo quedará NO AUTORIZADO hasta corregir la condición.</div>':''}</div>`;
  mostrarPantalla(guiaShell('6. PETAR - lista de verificación','Confirme una condición por vez. Las preguntas críticas protegen el trabajo en altura.',body,`<div class="seg-guide-nav"><button class="seg-btn gray" onclick="seg440PetarAnterior()">← ${i?'Anterior':'Volver a riesgos'}</button><button class="seg-btn" onclick="seg440PetarSiguiente()">${i<items.length-1?'Siguiente':'Ver resumen'} →</button></div>`));
}
function guiaPasoResumen(){
  const err=guiaValidarTodo(),riesgos=(SEG.ats.tareas||[]).reduce((s,x)=>s+(x.danos||[]).length,0),controles=(SEG.ats.tareas||[]).reduce((s,x)=>s+n(x.controles).split(/\n+/).filter(Boolean).length,0),noCumple=(SEG.petar?.checklist||[]).filter(x=>N(x.estado)==='NO CUMPLE').length;
  const body=`<div class="seg-guide-read ${err?'seg-guide-warning':'seg-guide-ok'}">${err?`<b>Falta completar:</b> ${e(err)}`:'<b>Revisión completa.</b> Puede guardar o aceptar y firmar el ATS/PETAR.'}</div><div class="seg-guide-summary"><div><b>${(SEG.ats.tareas||[]).length}</b><br>Tareas identificadas</div><div><b>${riesgos}</b><br>Riesgos revisados</div><div><b>${controles}</b><br>Medidas confirmadas</div><div><b>${noCumple}</b><br>NO CUMPLE en PETAR</div></div><div class="seg-guide-q" style="margin-top:10px"><b>Hora final</b><input id="segGuiaHoraFinalResumen" class="seg-guide-other" type="time" value="${e(hora24(SEG.ats.horaFinal,''))}"><div class="seg-guide-mini">Complétela si la jornada/documento ya está listo para firma.</div></div><div class="seg-actions"><button class="seg-btn" onclick="seg440GuardarGuia()">Guardar borrador</button><button class="seg-btn green" ${err?'disabled':''} onclick="seg440AceptarGuia()">Aceptar y firmar</button></div>`;
  mostrarPantalla(guiaShell('Resumen antes de firmar','Revise que el ATS/PETAR refleje el trabajo real que realizará.',body,`<div class="seg-guide-nav"><button class="seg-btn gray" onclick="seg440ResumenAnterior()">← Revisar PETAR</button><span></span></div>`));
}
function renderTecnicoGuiado(){
  SEG_GUIA.paso=Math.max(0,Math.min(6,SEG_GUIA.paso||0));
  if(SEG_GUIA.paso===0)return guiaPasoDatos();if(SEG_GUIA.paso===1)return guiaPasoEpp();if(SEG_GUIA.paso===2)return guiaPasoHerramientas();if(SEG_GUIA.paso===3)return guiaPasoTareas();if(SEG_GUIA.paso===4)return guiaPasoRiesgos();if(SEG_GUIA.paso===5)return guiaPasoPetar();return guiaPasoResumen();
}
function seg440Siguiente(){
  if(SEG_GUIA.paso===0){guiaCapturarDatos();if(!n(SEG.ats.trabajo)||!n(SEG.ats.lugarTrabajo))return alert('Trabajo y lugar de trabajo son obligatorios.');SEG_GUIA.paso=1}
  else if(SEG_GUIA.paso===1){if(!guiaCapturarEpp())return alert('Seleccione al menos un EPP.');SEG_GUIA.paso=2}
  else if(SEG_GUIA.paso===2){guiaCapturarHerramientas();SEG_GUIA.paso=3}
  else if(SEG_GUIA.paso===3){if(!guiaCapturarTareas())return alert('Seleccione al menos una tarea.');SEG_GUIA.tarea=0;SEG_GUIA.paso=4}
  renderTecnicoGuiado();
}
function seg440Anterior(){if(SEG_GUIA.paso>0)SEG_GUIA.paso--;renderTecnicoGuiado()}
function seg440TareaSiguiente(){if(!guiaCapturarRiesgosControles())return alert(SEG_GUIA_ERROR||'Complete los riesgos y medidas de esta tarea.');if(SEG_GUIA.tarea<(SEG.ats.tareas||[]).length-1)SEG_GUIA.tarea++;else{SEG_GUIA.paso=5;SEG_GUIA.petar=0}renderTecnicoGuiado()}
function seg440TareaAnterior(){guiaCapturarRiesgosControles();if(SEG_GUIA.tarea>0)SEG_GUIA.tarea--;else SEG_GUIA.paso=3;renderTecnicoGuiado()}
function seg440PetarElegir(btn){document.querySelectorAll('[data-guia-petar]').forEach(x=>x.classList.remove('sel'));btn.classList.add('sel')}
function seg440PetarSiguiente(){if(!guiaCapturarPetar())return alert('Seleccione CUMPLE, NO CUMPLE o NO APLICA.');const items=SEG.petar?.checklist||[];if(SEG_GUIA.petar<items.length-1)SEG_GUIA.petar++;else SEG_GUIA.petar=items.length;renderTecnicoGuiado()}
function seg440PetarEppAnterior(){SEG_GUIA.petar=Math.max(0,(SEG.petar?.checklist||[]).length-1);renderTecnicoGuiado()}
function seg440PetarEppSiguiente(){if(!guiaCapturarPetarEpp())return alert('Seleccione al menos un EPP requerido para el PETAR.');SEG_GUIA.paso=6;renderTecnicoGuiado()}
function seg440PetarAnterior(){guiaCapturarPetar();if(SEG_GUIA.petar>0)SEG_GUIA.petar--;else{SEG_GUIA.paso=4;SEG_GUIA.tarea=Math.max(0,(SEG.ats.tareas||[]).length-1)}renderTecnicoGuiado()}
function seg440ResumenAnterior(){const h=document.getElementById('segGuiaHoraFinalResumen');if(h&&h.value)SEG.ats.horaFinal=fmtHora(h.value);SEG_GUIA.paso=5;SEG_GUIA.petar=(SEG.petar?.checklist||[]).length;renderTecnicoGuiado()}
async function seg440GuardarGuia(){const h=document.getElementById('segGuiaHoraFinalResumen');if(h)SEG.ats.horaFinal=h.value?fmtHora(h.value):SEG.ats.horaFinal;await guardar(true)}
async function seg440AceptarGuia(){const h=document.getElementById('segGuiaHoraFinalResumen');if(h)SEG.ats.horaFinal=h.value?fmtHora(h.value):SEG.ats.horaFinal;const err=guiaValidarTodo();if(err)return alert(err);await aceptar()}

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
  if(editable)return renderTecnicoGuiado();
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
        <div class="seg-field"><label>HORA DE INICIO</label>${editable?`<div class="seg-time-wrap"><input id="segHoraInicio" type="time" value="${e(hora24(a.horaInicio,'07:45'))}" oninput="seg438HoraCambio('segHoraInicio')"><span id="segHoraInicioMer" class="seg-time-mer">${e(fmtHora(a.horaInicio||'07:45').split(' ')[1]||'AM')}</span></div>`:`<input value="${e(fmtHora(a.horaInicio||'07:45 AM'))}" readonly>`}</div>
      </div>
      <div class="seg-grid">
        <div class="seg-field"><label>PERMISO PETAR N°</label><input value="${e(SEG.petar?.numero||'')}" readonly></div>
        <div class="seg-field"><label>LUGAR DE TRABAJO</label><input id="segLugar" value="${e(a.lugarTrabajo)}" ${editable?'':'readonly'}></div>
        <div class="seg-field"><label>HORA FINAL</label>${editable?`<div class="seg-time-wrap"><input id="segHoraFinal" type="time" value="${e(hora24(a.horaFinal||'',''))}" oninput="seg438HoraCambio('segHoraFinal')"><span id="segHoraFinalMer" class="seg-time-mer">${e(a.horaFinal?fmtHora(a.horaFinal).split(' ')[1]:'—')}</span></div>`:`<input value="${e(fmtHora(a.horaFinal||''))}" readonly>`}</div>
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
      ${(a.integrantes||[]).map(x=>{const ac=acept.find(y=>N(y.usuario)===N(x.usuario));return `<tr><td>${e(x.nombre)}</td><td>${e(x.cargo)}</td><td>${firmaAceptacionHtml(ac)}</td></tr>`}).join('')}
      <tr><td colspan="2">Supervisor / Responsable</td><td>${a.supervisorFirma?firmaHtml(a.supervisorFirma.firma||a.supervisorFirma):'<span class="seg-pill pend">PENDIENTE</span>'}</td></tr>
    </table>
  </div>`;

  if(SEG.petar)h+=`<details class="seg-coll" open><summary>PETAR - ALTURA N° ${e(SEG.petar.numero)}</summary><div class="seg-coll-body" id="segPetarArea"></div></details>`;

  const perfilesFinal=['JEFATURA','JEFATURA GENERAL','JEFATURA OPERACIONES','JEFATURA DE OPERACIONES','GERENCIA LIMA','GERENCIA GENERAL','GERENCIAL GENERAL','ADMIN','ADMINISTRADOR'];
  h+=`<div class="seg-card"><b>Estado: ${e(a.estado)}</b>
    ${editable?`<div class="seg-actions"><button class="seg-btn" onclick="seg433Guardar()">Guardar borrador</button><button class="seg-btn green" onclick="seg433Aceptar()">Aceptar y firmar</button></div>`:''}
    ${!editable&&perfil()==='TECNICO'&&!acept.some(x=>N(x.usuario)===N(user()))&&['PENDIENTE ACEPTACION','BORRADOR'].includes(N(a.estado))?`<div class="seg-actions"><button class="seg-btn green" onclick="seg433Aceptar()">Aceptar y firmar</button></div>`:''}
    ${perfil()==='SUPERVISOR'&&['PENDIENTE SUPERVISOR','PENDIENTE ACEPTACION'].includes(N(a.estado))&&acept.length>=1?`<div class="seg-note seg-warn" style="margin-top:8px">Aceptación técnica: ${acept.length}/${(a.integrantes||[]).length}. Al autorizar, el documento quedará FINALIZADO y MI VISUAL completará cualquier firma faltante con trazabilidad.</div><div class="seg-actions"><button class="seg-btn green" onclick="seg433Revisar('AUTORIZAR')">Autorizar y finalizar</button><button class="seg-btn orange" onclick="seg433Revisar('OBSERVAR')">Observar</button><button class="seg-btn red" onclick="seg433Revisar('RECHAZAR')">Rechazar</button></div>`:''}
    ${perfilesFinal.includes(perfil())&&['PENDIENTE VALIDACION','PENDIENTE SUPERVISOR','PENDIENTE ACEPTACION'].includes(N(a.estado))&&acept.length>=1?`<div class="seg-note seg-warn" style="margin-top:8px">Jefatura/Gerencia puede validar directamente. Al validar, el documento quedará FINALIZADO.</div><div class="seg-actions"><button class="seg-btn green" onclick="seg433ValidarFinal('VALIDAR')">Validar y finalizar</button><button class="seg-btn orange" onclick="seg433ValidarFinal('OBSERVAR')">Observar</button><button class="seg-btn red" onclick="seg433ValidarFinal('RECHAZAR')">Rechazar</button></div>`:''}
    ${['FINALIZADO','CERRADO'].includes(N(a.estado))&&a.pdfUrl?`<div class="seg-note seg-ok" style="margin-top:8px">Documento FINALIZADO. Los PDF son los archivos finales y no se vuelven a generar.</div><div class="seg-actions"><a class="seg-btn green" href="${e(pdfDescargaUrl(a.pdfId,a.pdfUrl))}">⬇ Descargar ATS</a>${SEG.petar?.pdfUrl?`<a class="seg-btn green" href="${e(pdfDescargaUrl(SEG.petar.pdfId,SEG.petar.pdfUrl))}">⬇ Descargar PETAR</a>`:''}</div>`:''}
    ${['FINALIZADO','CERRADO'].includes(N(a.estado))&&!a.pdfUrl&&perfil()==='SUPERVISOR'?`<div class="seg-note seg-warn" style="margin-top:8px">El documento quedó FINALIZADO pero falta generar el PDF final. Esto corresponde a una prueba anterior.</div><div class="seg-actions"><button class="seg-btn green" onclick="seg433Revisar('AUTORIZAR')">Generar PDF final</button></div>`:''}
    ${['FINALIZADO','CERRADO'].includes(N(a.estado))&&!a.pdfUrl&&perfilesFinal.includes(perfil())?`<div class="seg-note seg-warn" style="margin-top:8px">El documento quedó FINALIZADO pero falta generar el PDF final.</div><div class="seg-actions"><button class="seg-btn green" onclick="seg433ValidarFinal('VALIDAR')">Generar PDF final</button></div>`:''}
  </div></div>`;
  mostrarPantalla(h);
  actualizarGruposHerramientas();
  horaCambio('segHoraInicio');horaCambio('segHoraFinal');
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
    <table class="seg-table" style="margin-top:8px"><tr><th colspan="3">PERSONAS ENCARGADAS DE LA EJECUCIÓN DEL TRABAJO</th></tr><tr><th>OCUPACIÓN O CARGO</th><th>NOMBRES Y APELLIDOS</th><th>FIRMA</th></tr>${(SEG.ats?.integrantes||[]).map(x=>{const ac=(SEG.ats?.aceptaciones||[]).find(y=>N(y.usuario)===N(x.usuario));return `<tr><td>${e(x.cargo)}</td><td>${e(x.nombre)}</td><td>${firmaAceptacionHtml(ac)}</td></tr>`}).join('')}</table>
    <table class="seg-table" style="margin-top:8px"><tr><th colspan="3">AUTORIZACIÓN Y SUPERVISIÓN</th></tr><tr><th>CARGO</th><th>NOMBRES Y APELLIDOS</th><th>FIRMA</th></tr><tr><td>Supervisor o Responsable del trabajo</td><td>${e(SEG.ats?.supervisorFirma?.nombre||SEG.ats?.supervisorNombre||'')}</td><td>${SEG.ats?.supervisorFirma?firmaHtml(SEG.ats.supervisorFirma.firma||SEG.ats.supervisorFirma):'<span class="seg-pill pend">PENDIENTE</span>'}</td></tr></table>
  </div>`;
}

function datosAts(){
  if(!document.getElementById('segTaskTable')){
    return {trabajo:n(SEG.ats?.trabajo),lugarTrabajo:n(SEG.ats?.lugarTrabajo),horaInicio:n(SEG.ats?.horaInicio)||'07:45 AM',horaFinal:n(SEG.ats?.horaFinal),herramientas:Array.isArray(SEG.ats?.herramientas)?SEG.ats.herramientas:[],epp:Array.isArray(SEG.ats?.epp)?SEG.ats.epp:[],tareas:(SEG.ats?.tareas||[]).map(guiaNormalizarTarea)};
  }
  const tareas=[...document.querySelectorAll('#segTaskTable tbody tr')].map(tr=>{
    const sel=n(tr.querySelector('.seg-task-select')?.value);
    const tarea=sel==='OTRA'?n(tr.querySelector('[data-k="tarea"]')?.value):sel;
    return {tarea,danos:[...tr.querySelectorAll('[data-d]:checked')].map(x=>x.dataset.d),otrosDano:n(tr.querySelector('[data-k="otrosDano"]')?.value),controles:n(tr.querySelector('[data-k="controles"]')?.value)};
  }).filter(x=>x.tarea);
  return {
    trabajo:n(document.getElementById('segTrabajo')?.value),
    lugarTrabajo:n(document.getElementById('segLugar')?.value),
    horaInicio:n(document.getElementById('segHoraInicio')?.value)||hora24(SEG.ats?.horaInicio,'07:45'),
    horaFinal:n(document.getElementById('segHoraFinal')?.value),
    herramientas:[...document.querySelectorAll('[data-tool]:checked')].map(x=>x.dataset.tool),
    epp:[...document.querySelectorAll('[data-epp]:checked')].map(x=>N(x.dataset.epp)==='OTROS'?(n(document.querySelector('[data-epp-otro]')?.value)?`OTROS: ${n(document.querySelector('[data-epp-otro]')?.value)}`:'OTROS'):x.dataset.epp),
    tareas
  };
}
function datosPetar(){
  if(!SEG.petar)return null;
  if(!document.querySelector('[data-petar-i]'))return {checklist:(SEG.petar.checklist||[]).map(x=>Object.assign({},x)),epp:Array.isArray(SEG.petar.epp)?SEG.petar.epp:[]};
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
    await conProceso('Registrando aceptación...',async()=>{
      const est=N(SEG.ats?.estado);
      // Solo el primer técnico puede estar editando. Si ya está PENDIENTE ACEPTACION,
      // el segundo técnico acepta directamente sin intentar guardar un documento bloqueado.
      if(['BORRADOR','OBSERVADO'].includes(est)){
        procesoTexto('Guardando ATS / PETAR...');
        await guardarCore(false);
      }
      procesoTexto('Obteniendo ubicación...');
      const g=await geo();
      procesoTexto('Registrando firma y aceptación...');
      await api({accion:'aceptarAtsSeguridadV432',id:SEG.ats.id,gps:g});
      cacheBorrar();procesoTexto('Actualizando estado...');await abrirAtsCore(SEG.ats.id);
    });
  }catch(err){alert(err.message)}
}
async function revisar(accion){
  const motivo=accion==='AUTORIZAR'?'':prompt('Motivo:')||'';
  if(accion!=='AUTORIZAR'&&!motivo)return;
  const msg=accion==='AUTORIZAR'?(N(SEG.ats?.estado)==='FINALIZADO'?'Generando PDF final...':'Autorizando y generando PDF final...'):accion==='OBSERVAR'?'Registrando observación...':'Rechazando ATS / PETAR...';
  try{
    let finalizado=false;
    await conProceso(msg,async()=>{
      procesoTexto('Obteniendo ubicación...');const g=await geo();procesoTexto(msg);
      const d=await api({accion:'revisarAtsSupervisorV432',id:SEG.ats.id,resultado:accion,motivo,gps:g});
      finalizado=N(d.estado)==='FINALIZADO';cacheBorrar();procesoTexto('Actualizando documento...');await abrirAtsCore(SEG.ats.id)
    });
    if(finalizado)alert('Documento FINALIZADO. PDF disponible para descarga.');
  }catch(err){alert(err.message)}
}
async function validarFinal(resultado){
  const motivo=resultado==='VALIDAR'?'':prompt('Motivo:')||'';
  if(resultado!=='VALIDAR'&&!motivo)return;
  const msg=resultado==='VALIDAR'?(N(SEG.ats?.estado)==='FINALIZADO'?'Generando PDF final...':'Validando y generando PDF final...'):resultado==='OBSERVAR'?'Registrando observación...':'Rechazando ATS / PETAR...';
  try{
    let pdf=false;
    await conProceso(msg,async()=>{
      procesoTexto('Obteniendo ubicación...');const g=await geo();procesoTexto(msg);const d=await api({accion:'validarAtsFinalV432',id:SEG.ats.id,resultado,motivo,gps:g});
      pdf=!!d.pdfUrl;cacheBorrar();procesoTexto('Actualizando documento...');await abrirAtsCore(SEG.ats.id);
    });
    if(pdf)alert('Documento FINALIZADO. PDF disponible para descarga.');
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
  if(btn)btn.disabled=true;if(estado)estado.textContent='Registrando firma...';
  try{
    await conProceso('Registrando firma digital...',async()=>{
      const g=await geo();
      procesoTexto('Registrando firma digital...');
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
window.seg438HoraCambio=horaCambio;
window.seg440GrupoHerramientas=seg440GrupoHerramientas;
window.seg440PetarEppAnterior=seg440PetarEppAnterior;
window.seg440PetarEppSiguiente=seg440PetarEppSiguiente;
window.seg440Siguiente=seg440Siguiente;
window.seg440Anterior=seg440Anterior;
window.seg440TareaSiguiente=seg440TareaSiguiente;
window.seg440TareaAnterior=seg440TareaAnterior;
window.seg440PetarElegir=seg440PetarElegir;
window.seg440PetarSiguiente=seg440PetarSiguiente;
window.seg440PetarAnterior=seg440PetarAnterior;
window.seg440ResumenAnterior=seg440ResumenAnterior;
window.seg440GuardarGuia=seg440GuardarGuia;
window.seg440AceptarGuia=seg440AceptarGuia;


})();
