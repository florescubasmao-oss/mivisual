// MI VISUAL - Checklist Almacén V115 - prevención de doble registro
let CK_GUARDANDO_CHECKLIST = false;

const API_CHECKLIST_ALMACEN = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

function ckNorm(v){return (v||"").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function ckUser(){return {usuario:localStorage.getItem("usuario")||"",perfil:ckNorm(localStorage.getItem("perfil")),sede:ckNorm(localStorage.getItem("sede")),cuadrilla:localStorage.getItem("cuadrilla")||"",nombres:localStorage.getItem("nombresApellidos")||localStorage.getItem("usuario")||""};}
function ckEsc(v){return (v||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
async function ckApi(payload){const r=await fetch(API_CHECKLIST_ALMACEN,{method:"POST",body:JSON.stringify(payload)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Error en Checklist");return d;}
function ckEstado(e){const n=ckNorm(e);let c="pend";if(n==="CONFORME")c="ok";else if(n.includes("OBSERVADO"))c="obs";else if(n.includes("VISTO BUENO"))c="vb";return `<span class="ck-badge ${c}">${ckEsc(e||"PENDIENTE")}</span>`;}
function ckStyle(){return `<style>
.ck-wrap{max-width:1100px;margin:auto;padding:12px}.ck-head{background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;padding:17px;border-radius:18px;margin-bottom:12px}.ck-head h2{margin:0 0 4px;font-size:22px}.ck-card{background:#fff;border:1px solid #dbe3ee;border-radius:15px;padding:12px;margin-bottom:10px;box-shadow:0 5px 14px rgba(15,23,42,.08);color:#111827}.ck-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ck-field label{display:block;font-size:11px;font-weight:900;color:#334155;margin-bottom:4px}.ck-field input,.ck-field textarea,.ck-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:9px;background:#fff;color:#111827}.ck-unit{display:grid;grid-template-columns:1fr auto;align-items:center;gap:7px}.ck-unit span{font-size:11px;font-weight:900;color:#64748b}.ck-sec{font-size:15px;margin:12px 0 7px;color:#0f172a}.ck-photo-box{border:1px dashed #94a3b8;padding:8px;border-radius:11px;background:#f8fafc;margin-bottom:7px}.ck-photo-row{display:flex;gap:7px;align-items:center;margin:5px 0;font-size:11px}.ck-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}.ck-btn.blue{background:#2563eb;color:#fff}.ck-btn.green{background:#16a34a;color:#fff}.ck-btn.orange{background:#f59e0b;color:#111827}.ck-btn.red{background:#dc2626;color:#fff}.ck-btn.gray{background:#64748b;color:#fff}.ck-actions{display:flex;gap:7px;flex-wrap:wrap}.ck-badge{padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900}.ck-badge.pend{background:#fef3c7;color:#92400e}.ck-badge.vb{background:#dbeafe;color:#1e40af}.ck-badge.ok{background:#dcfce7;color:#166534}.ck-badge.obs{background:#fee2e2;color:#991b1b}.ck-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.ck-kpi{background:#f8fafc;border:2px solid #cbd5e1;border-radius:12px;padding:10px;text-align:center;color:#0f172a;box-shadow:0 4px 10px rgba(15,23,42,.08)}.ck-kpi b{font-size:20px;display:block;line-height:1.05;margin-bottom:3px;color:#0f172a}.ck-kpi span{font-size:11px;font-weight:900;color:#334155}.ck-kpi.total{background:#eff6ff;border-color:#60a5fa}.ck-kpi.total b{color:#1d4ed8}.ck-kpi.pendiente{background:#fffbeb;border-color:#fbbf24}.ck-kpi.pendiente b{color:#b45309}.ck-kpi.visto{background:#ecfeff;border-color:#22d3ee}.ck-kpi.visto b{color:#0e7490}.ck-kpi.conforme{background:#f0fdf4;border-color:#4ade80}.ck-kpi.conforme b{color:#15803d}.ck-meta{font-size:11px;color:#64748b;line-height:1.4}.ck-details{margin-top:7px}.ck-details summary{cursor:pointer;font-weight:900;color:#1d4ed8}.ck-evidencias a{display:inline-block;margin:3px;padding:5px 7px;background:#e0f2fe;border-radius:7px;font-size:10px;font-weight:900;color:#075985;text-decoration:none}.ck-equipos-grid{align-items:start}.ck-new-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:12px 14px;margin-bottom:10px;font-size:15px;font-weight:900;color:#0f172a;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.07)}.ck-new-toggle:hover{background:#f8fafc}.ck-new-arrow{transition:transform .2s ease}.ck-new-toggle.open .ck-new-arrow{transform:rotate(180deg)}.ck-form-panel{display:none}.ck-form-panel.open{display:block}.ck-equipo-box{margin:0 0 12px;border:3px solid #2563eb;background:#f8fbff;border-radius:13px;box-shadow:inset 0 0 0 1px rgba(37,99,235,.10),0 6px 16px rgba(15,23,42,.12)}.ck-equipo-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:-8px -8px 10px;padding:11px 12px;background:#dbeafe;border-bottom:2px solid #60a5fa;border-radius:10px 10px 0 0}.ck-equipo-head b{font-size:14px;color:#0b3b79;letter-spacing:.01em}.ck-equipo-head small{font-weight:900;color:#1d4ed8}.ck-equipo-row{position:relative;border-top:1px solid #dbeafe;padding:8px 28px 8px 0}.ck-equipo-row:first-child{border-top:0}.ck-equipo-num{font-size:11px;font-weight:900;color:#0f172a;margin-bottom:5px}.ck-equipo-inputs{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ck-equipo-inputs input{width:100%;box-sizing:border-box}.ck-photo-input{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none}.ck-photo-label{display:flex;align-items:center;justify-content:center;min-height:34px;box-sizing:border-box;border:1px solid #94a3b8;border-radius:8px;background:#f8fafc;color:#0f172a;font-size:11px;font-weight:900;cursor:pointer;padding:7px 10px}.ck-photo-label:hover{background:#eef2f7}.ck-equipo-remove{position:absolute;right:0;top:9px;border:0;background:#fee2e2;color:#991b1b;border-radius:7px;width:24px;height:24px;font-weight:900;cursor:pointer}.ck-detail-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px}.ck-series-list{margin-top:5px;display:grid;gap:4px}.ck-serie-item{font-size:11px;line-height:1.35}.ck-serie-item a{display:inline-block;margin-left:5px;padding:3px 6px;background:#dbeafe;color:#1d4ed8;text-decoration:none;border-radius:6px;font-weight:900}.ck-serie-item em{font-style:normal;color:#94a3b8;margin-left:5px}.ck-toolbar{display:flex;justify-content:flex-end;margin:0 0 10px}.ck-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px}.ck-modal{width:min(720px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);color:#111827}.ck-modal h3{margin:0 0 12px}.ck-modal-close{float:right;border:0;background:#e2e8f0;border-radius:8px;width:32px;height:32px;font-weight:900;cursor:pointer}.ck-alerta-obs{margin-top:8px;padding:9px 10px;border:1px solid #fdba74;background:#fff7ed;color:#9a3412;border-radius:10px;font-size:12px;line-height:1.4}.ck-alerta-ok{margin-top:8px;padding:9px 10px;border:1px solid #86efac;background:#f0fdf4;color:#166534;border-radius:10px;font-size:12px;line-height:1.4}.ck-report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ck-report-note{font-size:11px;color:#64748b;margin:8px 0 12px}.ck-progress-yellow{background:#fff9df!important;border-color:#f59e0b!important;box-shadow:inset 0 0 0 1px rgba(245,158,11,.20),0 6px 16px rgba(180,83,9,.12)}.ck-progress-green{background:#ecfdf3!important;border-color:#16a34a!important;box-shadow:inset 0 0 0 1px rgba(22,163,74,.20),0 6px 16px rgba(21,128,61,.12)}.ck-equipo-row.ck-progress-yellow{border:2px solid #f59e0b;border-radius:10px;padding:9px 30px 9px 9px;margin-top:8px}.ck-equipo-row.ck-progress-green{border:2px solid #16a34a;border-radius:10px;padding:9px 30px 9px 9px;margin-top:8px}.ck-field.ck-material-progress{border:2px solid #f59e0b;background:#fffbea;border-radius:11px;padding:8px;transition:.18s ease}.ck-field.ck-material-progress.ck-progress-green{border-color:#22c55e;background:#f0fdf4}.ck-field.ck-material-progress label{margin-bottom:5px}.ck-progress-note{font-size:10px;font-weight:900;margin-top:5px;color:#92400e}.ck-progress-green .ck-progress-note{color:#166534}
.ck-config{background:#eff6ff;border:2px solid #60a5fa;border-radius:14px;padding:12px;margin-bottom:10px;color:#0f172a}.ck-config-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:9px}.ck-config-head b{font-size:14px}.ck-config-status{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px}.ck-config-status.on{background:#dcfce7;color:#166534}.ck-config-status.off{background:#fee2e2;color:#991b1b}.ck-config-note{font-size:11px;color:#475569;margin-top:7px;line-height:1.4}.ck-disabled{background:#fff7ed;border:2px solid #fb923c;color:#9a3412;border-radius:13px;padding:12px;margin-bottom:10px;font-size:12px;font-weight:800}

.ck-filter-panel{background:#fff;border:1px solid #dbe3ee;border-radius:14px;padding:10px;margin:0 0 10px;box-shadow:0 4px 12px rgba(15,23,42,.07)}.ck-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:end}.ck-sede-group{background:#fff;border:1px solid #dbe3ee;border-radius:15px;margin-bottom:12px;overflow:hidden;box-shadow:0 5px 14px rgba(15,23,42,.08)}.ck-sede-summary{list-style:none;cursor:pointer;padding:12px 13px;background:linear-gradient(90deg,#eff6ff,#ecfeff);display:flex;align-items:center;justify-content:space-between;gap:10px;color:#0f172a}.ck-sede-summary::-webkit-details-marker{display:none}.ck-sede-title{font-size:15px;font-weight:900}.ck-sede-arrow{font-size:12px;font-weight:900;color:#1d4ed8;display:inline-flex;align-items:center;gap:5px}.ck-sede-caret{display:inline-block;transition:transform .2s ease}.ck-sede-group[open] .ck-sede-caret{transform:rotate(180deg)}.ck-sede-body{padding:10px}.ck-sede-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 9px}.ck-sede-kpi{border:2px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;background:#f8fafc;box-shadow:0 2px 6px rgba(15,23,42,.08)}.ck-sede-kpi b{display:block;font-size:17px;line-height:1.05}.ck-sede-kpi span{font-size:10px;font-weight:900;color:#334155}.ck-sede-kpi.total{background:#dbeafe;border-color:#3b82f6}.ck-sede-kpi.total b{color:#1d4ed8}.ck-sede-kpi.pendiente{background:#fef3c7;border-color:#f59e0b}.ck-sede-kpi.pendiente b{color:#b45309}.ck-sede-kpi.visto{background:#cffafe;border-color:#06b6d4}.ck-sede-kpi.visto b{color:#0e7490}.ck-sede-kpi.conforme{background:#dcfce7;border-color:#22c55e}.ck-sede-kpi.conforme b{color:#15803d}.ck-no-results{background:#fff;border:1px dashed #94a3b8;border-radius:12px;padding:14px;text-align:center;color:#64748b;font-weight:800}
@media(max-width:650px){.ck-grid{grid-template-columns:1fr}.ck-filter-grid{grid-template-columns:1fr 1fr}.ck-sede-kpis{grid-template-columns:repeat(2,1fr)}.ck-equipo-inputs{grid-template-columns:1fr}.ck-kpis{grid-template-columns:repeat(2,1fr)}.ck-wrap{padding:7px}.ck-card{padding:9px}}
</style>`;}

const CK_EQUIPOS={
  ontZte:{label:'ONT ZTE',max:10,serie:'Serie ONT ZTE'},
  ontHuawei:{label:'ONT Huawei',max:10,serie:'Serie ONT Huawei'},
  meshZte:{label:'Mesh/Repetidor ZTE',max:10,serie:'Serie / código Mesh ZTE'},
  meshHuawei:{label:'Mesh/Repetidor Huawei',max:10,serie:'Serie / código Mesh Huawei'},
  winbox:{label:'WINBOX',max:5,serie:'Serie WINBOX'},
  fonowin:{label:'FONOWIN',max:5,serie:'Serie FONOWIN'}
};

let CK_LISTA_ACTUAL=[];
function ckCerrarModal(){document.getElementById('ckModalGlobal')?.remove();}
function ckMostrarModal(html){ckCerrarModal();const bg=document.createElement('div');bg.id='ckModalGlobal';bg.className='ck-modal-bg';bg.innerHTML=`<div class="ck-modal">${html}</div>`;bg.addEventListener('click',e=>{if(e.target===bg)ckCerrarModal();});document.body.appendChild(bg);}

function ckEquipoBlock(key){
  const cfg=CK_EQUIPOS[key];
  return `<div class="ck-photo-box ck-equipo-box ck-progress-yellow"><div class="ck-equipo-head"><b>${cfg.label}</b><small id="ckCount_${key}">0/${cfg.max}</small></div><div id="ckEquipos_${key}"></div><button type="button" class="ck-btn gray" onclick="ckAddEquipo('${key}')">+ Agregar ${cfg.label}</button></div>`;
}

function ckAddEquipo(key){
  const cfg=CK_EQUIPOS[key],box=document.getElementById('ckEquipos_'+key);if(!box)return;
  const count=box.querySelectorAll('.ck-equipo-row').length;
  if(count>=cfg.max)return alert('Máximo '+cfg.max+' equipos para '+cfg.label);
  const row=document.createElement('div');row.className='ck-equipo-row';row.dataset.key=key;
  row.innerHTML=`<div class="ck-equipo-num">${cfg.label} ${count+1}</div><div class="ck-equipo-inputs"><input type="text" placeholder="${cfg.serie}" data-ck-serie="${key}" oninput="ckAutoEquipo('${key}',this);ckActualizarEstadoEquipoFila(this)"><label class="ck-photo-label">📷 Tomar foto<input class="ck-photo-input" type="file" accept="image/*" capture="environment" data-ck-foto="${key}" onchange="ckAutoEquipo('${key}',this);ckActualizarEstadoEquipoFila(this)"></label></div><div class="ck-progress-note">Pendiente: registre serie y fotografía</div>${count?`<button type="button" class="ck-equipo-remove" onclick="ckRemoveEquipo(this,'${key}')">×</button>`:''}`;
  row.classList.add('ck-progress-yellow');
  box.appendChild(row);ckActualizarConteoEquipo(key);ckActualizarEstadoCategoriaEquipo(key);
}
function ckAutoEquipo(key,el){
  const row=el.closest('.ck-equipo-row'),box=document.getElementById('ckEquipos_'+key);if(!row||!box)return;
  const rows=[...box.querySelectorAll('.ck-equipo-row')];
  if(row===rows[rows.length-1] && ckFilaEquipoTieneDato(row) && rows.length<CK_EQUIPOS[key].max) ckAddEquipo(key);
}
function ckFilaEquipoTieneDato(row){
  const serie=(row.querySelector('[data-ck-serie]')?.value||'').trim();
  const foto=row.querySelector('[data-ck-foto]')?.files?.[0];
  return !!(serie||foto);
}
function ckFilaEquipoCompleta(row){
  const serie=(row.querySelector('[data-ck-serie]')?.value||'').trim();
  const foto=row.querySelector('[data-ck-foto]')?.files?.[0];
  return !!(serie&&foto);
}
function ckActualizarEstadoEquipoFila(el){
  const row=el?.closest?.('.ck-equipo-row');if(!row)return;
  const ok=ckFilaEquipoCompleta(row);
  row.classList.toggle('ck-progress-green',ok);
  row.classList.toggle('ck-progress-yellow',!ok);
  const nota=row.querySelector('.ck-progress-note');
  if(nota)nota.textContent=ok?'Completo: serie y fotografía cargadas':'Pendiente: registre serie y fotografía';
  const key=row.dataset.key;if(key)ckActualizarEstadoCategoriaEquipo(key);
}
function ckActualizarEstadoCategoriaEquipo(key){
  const box=document.getElementById('ckEquipos_'+key)?.closest('.ck-equipo-box');if(!box)return;
  const rows=[...box.querySelectorAll('.ck-equipo-row')];
  const conDatos=rows.filter(ckFilaEquipoTieneDato);
  const ok=conDatos.length>0&&conDatos.every(ckFilaEquipoCompleta);
  box.classList.toggle('ck-progress-green',ok);
  box.classList.toggle('ck-progress-yellow',!ok);
}
function ckActualizarMaterial(input){
  const box=input?.closest?.('.ck-material-progress');if(!box)return;
  const ok=(input.value??'').toString().trim()!=='';
  box.classList.toggle('ck-progress-green',ok);
  box.classList.toggle('ck-progress-yellow',!ok);
  const nota=box.querySelector('.ck-progress-note');if(nota)nota.textContent=ok?'Completo':'Pendiente de llenar';
}
function ckRemoveEquipo(btn,key){btn.closest('.ck-equipo-row')?.remove();ckRenumerarEquipos(key);}
function ckRenumerarEquipos(key){
  const cfg=CK_EQUIPOS[key],rows=[...document.querySelectorAll(`#ckEquipos_${key} .ck-equipo-row`)];
  rows.forEach((r,i)=>{const n=r.querySelector('.ck-equipo-num');if(n)n.textContent=`${cfg.label} ${i+1}`;});
  if(!rows.length)ckAddEquipo(key);else{ckActualizarConteoEquipo(key);ckActualizarEstadoCategoriaEquipo(key);}
}
function ckActualizarConteoEquipo(key){
  const rows=[...document.querySelectorAll(`#ckEquipos_${key} .ck-equipo-row`)].filter(ckFilaEquipoTieneDato);
  const el=document.getElementById('ckCount_'+key);if(el)el.textContent=rows.length+'/'+CK_EQUIPOS[key].max;
}
async function ckFileData(file){if(!file)return null;const img=await createImageBitmap(file);const max=1280,scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.72));const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(blob)});return {nombre:(file.name||'foto').replace(/\.[^.]+$/,'.jpg'),mime:'image/jpeg',base64:data.split(',')[1]};}
async function ckCollectEquipos(key){
  const rows=[...document.querySelectorAll(`#ckEquipos_${key} .ck-equipo-row`)];const equipos=[];
  for(const row of rows){
    const serie=(row.querySelector('[data-ck-serie]')?.value||'').trim();const file=row.querySelector('[data-ck-foto]')?.files?.[0];
    if(!serie&&!file)continue;
    if(!serie)throw new Error('Debe ingresar la serie o código de '+CK_EQUIPOS[key].label);
    if(!file)throw new Error('Debe subir la foto de '+CK_EQUIPOS[key].label+' - '+serie);
    equipos.push({serie,foto:await ckFileData(file)});
  }
  return equipos;
}
function ckNum(id){return Number(document.getElementById(id)?.value||0)||0;}
function ckField(id,label,unit){return `<div class="ck-field ck-material-progress ck-progress-yellow"><label>${label}</label><div class="ck-unit"><input id="${id}" type="number" min="0" step="1" placeholder="0" oninput="ckActualizarMaterial(this)"><span>${unit}</span></div><div class="ck-progress-note">Pendiente de llenar</div></div>`;}


let CK_CONFIG_ACTUAL=null;
function ckEsJefaturaConfig(perfil){const p=ckNorm(perfil);return ['JEFATURA','ADMIN','ADMINISTRADOR'].includes(p);}
async function ckObtenerConfiguracion(){
  const u=ckUser();
  if(!u.usuario)return {estado:'HABILITADO',activo:true,fechaInicio:'',fechaFin:''};
  try{const d=await ckApi({accion:'obtenerConfiguracionChecklistAlmacen',usuario:u.usuario});CK_CONFIG_ACTUAL=d.configuracion||d;return CK_CONFIG_ACTUAL;}
  catch(e){console.warn('No se pudo leer configuración Checklist:',e);return {estado:'HABILITADO',activo:true,fechaInicio:'',fechaFin:''};}
}
function ckConfigPanel(cfg){
  const activo=!!cfg.activo;
  return `<div class="ck-config"><div class="ck-config-head"><b>⚙️ Disponibilidad del Checklist</b><span class="ck-config-status ${activo?'on':'off'}">${activo?'ACTIVO':'INACTIVO'}</span></div><div class="ck-grid"><div class="ck-field"><label>Estado</label><select id="ckCfgEstado"><option value="HABILITADO" ${ckNorm(cfg.estado)==='HABILITADO'?'selected':''}>HABILITADO</option><option value="DESHABILITADO" ${ckNorm(cfg.estado)==='DESHABILITADO'?'selected':''}>DESHABILITADO</option></select></div><div class="ck-field"><label>Fecha de inicio (opcional)</label><input id="ckCfgInicio" type="date" value="${ckEsc(cfg.fechaInicio||'')}"></div><div class="ck-field"><label>Fecha de fin (opcional)</label><input id="ckCfgFin" type="date" value="${ckEsc(cfg.fechaFin||'')}"></div><div class="ck-field" style="display:flex;align-items:end"><button class="ck-btn blue" style="width:100%" onclick="ckGuardarConfiguracion()">Guardar disponibilidad</button></div></div><div class="ck-config-note">Cuando esté inactivo, el Técnico no verá la opción ni podrá registrar nuevos checklist. Los demás perfiles conservarán acceso al historial y validaciones.</div></div>`;
}
async function ckGuardarConfiguracion(){
  const estado=document.getElementById('ckCfgEstado')?.value||'HABILITADO';
  const fechaInicio=document.getElementById('ckCfgInicio')?.value||'';
  const fechaFin=document.getElementById('ckCfgFin')?.value||'';
  if(fechaInicio&&fechaFin&&fechaInicio>fechaFin)return alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
  try{await ckApi({accion:'guardarConfiguracionChecklistAlmacen',usuario:ckUser().usuario,estado,fechaInicio,fechaFin});alert('Disponibilidad actualizada correctamente');await ckAplicarVisibilidadChecklist();if(typeof mostrarAdministracion==='function')mostrarAdministracion();}catch(e){alert(e.message)}
}
async function ckAplicarVisibilidadChecklist(){
  const card=document.getElementById('cardChecklistAlmacen');if(!card)return;
  const u=ckUser();
  if(u.perfil!=='TECNICO'){card.style.display='';return;}
  const cfg=await ckObtenerConfiguracion();card.style.display=cfg.activo?'':'none';
}

async function mostrarChecklistAlmacen(){
  const u=ckUser();
  const cfg=await ckObtenerConfiguracion();
  mostrarPantalla(ckStyle()+`<div class="ck-wrap"><div class="ck-head"><h2>✅ CHECKLIST ALMACÉN</h2><p>Control de equipos, materiales y evidencias por cuadrilla.</p></div><div id="ckContenido"><div class="ck-card">Cargando...</div></div></div>`);
  if(u.perfil==='TECNICO'){
    const c=document.getElementById('ckContenido');
    if(cfg.activo){
      c.innerHTML=`<button id="ckNuevoToggle" type="button" class="ck-new-toggle" onclick="ckToggleNuevoChecklist()"><span>➕ Nuevo checklist</span><span class="ck-new-arrow">▼</span></button><div id="ckFormPanel" class="ck-form-panel"></div><div id="ckLista"></div>`;
    }else{
      c.innerHTML=`<div class="ck-disabled">Checklist no disponible para nuevos registros en este periodo.</div><div id="ckLista"></div>`;
    }
    await ckCargarHistorialTecnico();
  }else{
    await ckCargarLista();
  }
}
function ckToggleNuevoChecklist(forzar){
  const panel=document.getElementById('ckFormPanel');
  const boton=document.getElementById('ckNuevoToggle');
  if(!panel||!boton)return;
  const abrir=typeof forzar==='boolean'?forzar:!panel.classList.contains('open');
  if(abrir){
    ckRenderForm();
    panel.classList.add('open');
    boton.classList.add('open');
    boton.querySelector('span:first-child').textContent='✖ Cerrar nuevo checklist';
    setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }else{
    panel.classList.remove('open');
    boton.classList.remove('open');
    boton.querySelector('span:first-child').textContent='➕ Nuevo checklist';
    panel.innerHTML='';
  }
}

function ckRenderForm(){
  const u=ckUser(),c=document.getElementById('ckFormPanel');
  if(!c)return;
  c.innerHTML=`<div class="ck-card"><h3 style="margin-top:0">Nuevo checklist</h3><div class="ck-grid"><div class="ck-field"><label>Nombres y apellidos</label><input id="ckNombres" value="${ckEsc(u.nombres)}"></div><div class="ck-field"><label>Fecha de gestión</label><input id="ckFecha" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="ck-field"><label>Sede</label><input value="${ckEsc(u.sede)}" disabled></div><div class="ck-field"><label>Cuadrilla</label><input value="${ckEsc(u.cuadrilla)}" disabled></div></div>
<h3 class="ck-sec">Equipos y evidencias</h3><div class="ck-grid ck-equipos-grid">${Object.keys(CK_EQUIPOS).map(ckEquipoBlock).join('')}</div>
<h3 class="ck-sec">Materiales</h3><div class="ck-grid">${ckField('ckCableDrop','Cable Drop/Bobina','metros')}${ckField('ckPre50','Preconectorizado 50 m','cantidad')}${ckField('ckPre100','Preconectorizado 100 m','cantidad')}${ckField('ckPre150','Preconectorizado 150 m','cantidad')}${ckField('ckPre200','Preconectorizado 200 m','cantidad')}${ckField('ckAnclaje','Anclaje P','cantidad')}${ckField('ckBand','Cinta Band-It','metros')}${ckField('ckHebilla','Hebilla 3/4','unidades')}${ckField('ckAcoplador','Acoplador','unidades')}${ckField('ckRoseta','Roseta','unidades')}${ckField('ckConectores','Conectores ópticos','unidades')}${ckField('ckTempladores','Templadores','unidades')}${ckField('ckSplitter','Splitter','unidades')}${ckField('ckClevis','Clevis','unidades')}${ckField('ckCat5','Cable UTP CAT5','unidades')}${ckField('ckCat6','Cable UTP CAT6','unidades')}${ckField('ckApc','Patchcord APC-APC','unidades')}${ckField('ckUpc','Patchcord UPC-APC','unidades')}${ckField('ckRj45','Conector RJ45','unidades')}</div><div class="ck-actions" style="margin-top:12px"><button class="ck-btn blue" onclick="ckGuardar(event)">Guardar checklist</button><button type="button" class="ck-btn gray" onclick="ckToggleNuevoChecklist(false)">Cancelar</button></div></div>`;
  Object.keys(CK_EQUIPOS).forEach(ckAddEquipo);
}

async function ckGuardar(ev){
  const u=ckUser();
  const btn=ev?.currentTarget||ev?.target;
  if(CK_GUARDANDO_CHECKLIST) return;
  CK_GUARDANDO_CHECKLIST=true;
  if(btn){btn.disabled=true;btn.textContent='Guardando, espere...'}
  try{
    const cfg=await ckObtenerConfiguracion();
    if(!cfg.activo){throw new Error('El Checklist Almacén no está habilitado para nuevos registros en este periodo.');}
    const payload={accion:'registrarChecklistAlmacen',usuario:u.usuario,nombresApellidos:document.getElementById('ckNombres').value,fechaGestion:document.getElementById('ckFecha').value,cableDrop:ckNum('ckCableDrop'),pre50:ckNum('ckPre50'),pre100:ckNum('ckPre100'),pre150:ckNum('ckPre150'),pre200:ckNum('ckPre200'),anclajeP:ckNum('ckAnclaje'),cintaBandIt:ckNum('ckBand'),hebilla:ckNum('ckHebilla'),acoplador:ckNum('ckAcoplador'),roseta:ckNum('ckRoseta'),conectoresOpticos:ckNum('ckConectores'),templadores:ckNum('ckTempladores'),splitter:ckNum('ckSplitter'),clevis:ckNum('ckClevis'),utpCat5:ckNum('ckCat5'),utpCat6:ckNum('ckCat6'),patchApcApc:ckNum('ckApc'),patchUpcApc:ckNum('ckUpc'),rj45:ckNum('ckRj45')};
    payload.ontZteEquipos=await ckCollectEquipos('ontZte');
    payload.ontHuaweiEquipos=await ckCollectEquipos('ontHuawei');
    payload.meshZteEquipos=await ckCollectEquipos('meshZte');
    payload.meshHuaweiEquipos=await ckCollectEquipos('meshHuawei');
    payload.winboxEquipos=await ckCollectEquipos('winbox');
    payload.fonowinEquipos=await ckCollectEquipos('fonowin');
    payload.equipos={ontZte:payload.ontZteEquipos,ontHuawei:payload.ontHuaweiEquipos,meshZte:payload.meshZteEquipos,meshHuawei:payload.meshHuaweiEquipos,winbox:payload.winboxEquipos,fonowin:payload.fonowinEquipos};
    await ckApi(payload);
    alert('Checklist registrado correctamente');
    ckToggleNuevoChecklist(false);
    await ckCargarHistorialTecnico();
    const lista=document.getElementById('ckLista');
    if(lista)setTimeout(()=>lista.scrollIntoView({behavior:'smooth',block:'start'}),60);
  }catch(e){alert(e.message)}finally{
    CK_GUARDANDO_CHECKLIST=false;
    if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent='Guardar checklist'}
  }
}
function ckPartes(v){return (v||'').toString().split('|').map(x=>x.trim()).filter(Boolean);}
function ckUrlDescargaEvidencia(url){
  const texto=(url||'').toString().trim();
  if(!texto)return '';
  const match=texto.match(/\/d\/([a-zA-Z0-9_-]+)/)||texto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match&&match[1]?('https://drive.google.com/uc?export=download&id='+match[1]):texto;
}
function ckSeriesConLinks(series,links){
  const ss=ckPartes(series);const ls=ckPartes(links);
  if(!ss.length&&!ls.length)return '<span class="ck-meta">Sin series registradas</span>';
  const max=Math.max(ss.length,ls.length);
  let html='<div class="ck-series-list">';
  for(let i=0;i<max;i++){
    const serie=ss[i]||('Equipo '+(i+1));const link=ls[i]||'';
    const descarga=link?ckUrlDescargaEvidencia(link):'';
    html+=`<div class="ck-serie-item"><span>• ${ckEsc(serie)}</span>${link?` <a href="${ckEsc(link)}" target="_blank" rel="noopener noreferrer">Ver evidencia</a> <a href="${ckEsc(descarga)}" target="_blank" rel="noopener noreferrer">Descargar evidencia</a>`:' <em>Sin evidencia</em>'}</div>`;
  }
  return html+'</div>';
}
function ckDetalle(x){const equipos=[['ONT ZTE',x.ontZte,x.fotosOntZte],['ONT Huawei',x.ontHuawei,x.fotosOntHuawei],['Mesh ZTE',x.meshZte,x.fotosMeshZte],['Mesh Huawei',x.meshHuawei,x.fotosMeshHuawei],['WINBOX',x.winbox,x.fotosWinbox],['FONOWIN',x.fonowin,x.fotosFonowin]];const mats=[['Cable Drop',x.cableDrop,'m'],['Pre 50',x.pre50,'cant.'],['Pre 100',x.pre100,'cant.'],['Pre 150',x.pre150,'cant.'],['Pre 200',x.pre200,'cant.'],['Anclaje P',x.anclajeP,'cant.'],['Band-It',x.cintaBandIt,'m'],['Hebilla',x.hebilla,'und.'],['Acoplador',x.acoplador,'und.'],['Roseta',x.roseta,'und.'],['Conectores',x.conectoresOpticos,'und.'],['Templadores',x.templadores,'und.'],['Splitter',x.splitter,'und.'],['Clevis',x.clevis,'und.'],['UTP CAT5',x.utpCat5,'und.'],['UTP CAT6',x.utpCat6,'und.'],['Patch APC',x.patchApcApc,'und.'],['Patch UPC',x.patchUpcApc,'und.'],['RJ45',x.rj45,'und.']];return `<details class="ck-details"><summary>Ver detalle, series y evidencias</summary><div class="ck-grid" style="margin-top:7px">${equipos.map(e=>`<div class="ck-detail-box"><b>${e[0]}</b>${ckSeriesConLinks(e[1],e[2])}</div>`).join('')}${mats.map(m=>`<div><b>${m[0]}:</b> ${m[1]||0} ${m[2]}</div>`).join('')}</div></details>`;}
function ckCard(x,u){
  const acciones=u.perfil==='ALMACEN'
    ?`<button class="ck-btn green" onclick="ckValidar('${x.id}','VISTO BUENO')">Visto bueno</button><button class="ck-btn orange" onclick="ckValidar('${x.id}','OBSERVADO')">Observado</button>`
    :u.perfil==='JEFATURA ALMACEN'
      ?`<button class="ck-btn green" onclick="ckValidar('${x.id}','CONFORME')">Conforme</button><button class="ck-btn orange" onclick="ckValidar('${x.id}','OBSERVADO')">Observado</button>`:'';
  const estado=ckNorm(x.estadoGeneral);
  const observado=estado.includes('OBSERVADO');
  const conforme=estado==='CONFORME';
  const motivo=x.motivoJefatura||x.motivoAlmacen||'';
  const quien=x.validadoJefaturaPor||x.validadoAlmacenPor||'';
  const fechaObs=x.fechaValidacionJefatura||x.fechaValidacionAlmacen||'';
  const horaObs=x.horaValidacionJefatura||x.horaValidacionAlmacen||'';
  const alerta=observado
    ?`<div class="ck-alerta-obs"><b>Motivo de observación:</b> ${ckEsc(motivo||'Sin motivo registrado')}${quien?`<br><b>Observado por:</b> ${ckEsc(quien)}`:''}${fechaObs?` · ${ckEsc(fechaObs)} ${ckEsc(horaObs)}`:''}</div>`
    :conforme
      ?`<div class="ck-alerta-ok"><b>Detalle de conformidad:</b> ${ckEsc(motivo||'Sin detalle registrado')}${quien?`<br><b>Conforme por:</b> ${ckEsc(quien)}`:''}${fechaObs?` · ${ckEsc(fechaObs)} ${ckEsc(horaObs)}`:''}</div>`
      :'';
  const esCampo=ckNorm(x.origenRegistro)==='ACTIVIDAD_CAMPO';
  const origen=esCampo?`<div class="ck-alerta-ok" style="margin-top:8px"><b>Ejecutado en campo por Supervisor:</b> ${ckEsc(x.registradoPor||'Supervisor')}${x.comentarioFinal?`<br><b>Comentario final:</b> ${ckEsc(x.comentarioFinal)}`:''}</div>`:'';
  return `<div class="ck-card"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${ckEsc(x.cuadrilla)}</b><div class="ck-meta">${ckEsc(x.nombresApellidos)} · ${ckEsc(x.sede)}<br>${ckEsc(x.fechaGestion||x.fechaRegistro)}</div></div>${ckEstado(x.estadoGeneral)}</div>${origen}${alerta}${ckDetalle(x)}${acciones?`<div class="ck-actions" style="margin-top:8px">${acciones}</div>`:''}</div>`;
}
async function ckCargarHistorialTecnico(){const box=document.getElementById('ckLista');if(!box)return;try{const d=await ckApi({accion:'listarChecklistAlmacen',usuario:ckUser().usuario});box.innerHTML='<h3 class="ck-sec">Historial</h3>'+d.checklist.map(x=>ckCard(x,ckUser())).join('');}catch(e){box.innerHTML=`<div class="ck-card">${ckEsc(e.message)}</div>`}}
function ckEsJefaturaVisualChecklist(perfil){
  const p=ckNorm(perfil);
  return ['JEFATURA','ADMIN','ADMINISTRADOR','JEFATURA ALMACEN','JEFATURA DE ALMACEN'].includes(p);
}
function ckConteosLista(arr){
  return {
    total:arr.length,
    pend:arr.filter(x=>ckNorm(x.estadoGeneral).startsWith('PENDIENTE')).length,
    vb:arr.filter(x=>ckNorm(x.estadoGeneral).includes('VISTO BUENO')).length,
    ok:arr.filter(x=>ckNorm(x.estadoGeneral)==='CONFORME').length
  };
}
function ckKpisHtml(counts,compacto){
  const cls=compacto?'ck-sede-kpis':'ck-kpis';
  const item=compacto?'ck-sede-kpi':'ck-kpi';
  return `<div class="${cls}"><div class="${item} total"><b>${counts.total}</b><span>Total</span></div><div class="${item} pendiente"><b>${counts.pend}</b><span>Pendientes</span></div><div class="${item} visto"><b>${counts.vb}</b><span>Visto bueno</span></div><div class="${item} conforme"><b>${counts.ok}</b><span>Conformes</span></div></div>`;
}
function ckTodasSeriesChecklist(x){
  return ['ontZte','ontHuawei','meshZte','meshHuawei','winbox','fonowin']
    .flatMap(k=>ckPartes(x[k])).map(ckNorm);
}
function ckRenderFiltrosJefatura(arr){
  const sedes=[...new Set(arr.map(x=>ckNorm(x.sede)).filter(Boolean))].sort();
  const cuadrillas=[...new Set(arr.map(x=>(x.cuadrilla||'').toString().trim()).filter(Boolean))].sort();
  const estados=[...new Set(arr.map(x=>(x.estadoGeneral||'').toString().trim()).filter(Boolean))].sort();
  return `<div class="ck-filter-panel"><div class="ck-filter-grid">
    <div class="ck-field"><label>Sede</label><select id="ckFiltroSede" onchange="ckAplicarFiltrosVisuales()"><option value="">Todas</option>${sedes.map(v=>`<option value="${ckEsc(v)}">${ckEsc(v)}</option>`).join('')}</select></div>
    <div class="ck-field"><label>Cuadrilla</label><select id="ckFiltroCuadrilla" onchange="ckAplicarFiltrosVisuales()"><option value="">Todas</option>${cuadrillas.map(v=>`<option value="${ckEsc(v)}">${ckEsc(v)}</option>`).join('')}</select></div>
    <div class="ck-field"><label>Serie de equipo</label><input id="ckFiltroSerie" placeholder="Serie completa o parcial" oninput="ckAplicarFiltrosVisuales()"></div>
    <div class="ck-field"><label>Estado</label><select id="ckFiltroEstado" onchange="ckAplicarFiltrosVisuales()"><option value="">Todos</option>${estados.map(v=>`<option value="${ckEsc(v)}">${ckEsc(v)}</option>`).join('')}</select></div>
  </div><div class="ck-actions" style="margin-top:9px"><button class="ck-btn blue" onclick="ckAplicarFiltrosVisuales()">Aplicar filtros</button><button class="ck-btn gray" onclick="ckLimpiarFiltrosVisuales()">Limpiar filtros</button></div></div>`;
}
function ckFiltrarVisualChecklist(arr){
  const sede=ckNorm(document.getElementById('ckFiltroSede')?.value);
  const cuadrilla=(document.getElementById('ckFiltroCuadrilla')?.value||'').trim();
  const serie=ckNorm(document.getElementById('ckFiltroSerie')?.value);
  const estado=ckNorm(document.getElementById('ckFiltroEstado')?.value);
  return arr.filter(x=>{
    if(sede&&ckNorm(x.sede)!==sede)return false;
    if(cuadrilla&&(x.cuadrilla||'').toString().trim()!==cuadrilla)return false;
    if(estado&&ckNorm(x.estadoGeneral)!==estado)return false;
    if(serie&&!ckTodasSeriesChecklist(x).some(v=>v.includes(serie)))return false;
    return true;
  });
}
function ckRenderAgrupadoPorSede(arr){
  if(!arr.length)return '<div class="ck-no-results">No hay registros que coincidan con los filtros.</div>';
  const mapa={};
  arr.forEach(x=>{const sede=ckNorm(x.sede)||'SIN SEDE';if(!mapa[sede])mapa[sede]=[];mapa[sede].push(x);});
  const orden=['CHICLAYO','PIURA','TRUJILLO'];
  return Object.keys(mapa).sort((a,b)=>{
    const ia=orden.indexOf(a),ib=orden.indexOf(b);
    if(ia>=0||ib>=0)return (ia<0?99:ia)-(ib<0?99:ib);
    return a.localeCompare(b);
  }).map(sede=>{
    const registros=mapa[sede];
    const counts=ckConteosLista(registros);
    return `<details class="ck-sede-group"><summary class="ck-sede-summary"><span class="ck-sede-title">📍 ${ckEsc(sede)}</span><span class="ck-sede-arrow"><span class="ck-sede-caret">▼</span><span class="ck-sede-label">Ver ${registros.length} registro(s)</span></span></summary><div class="ck-sede-body">${ckKpisHtml(counts,true)}${registros.map(x=>ckCard(x,ckUser())).join('')}</div></details>`;
  }).join('');
}
function ckActivarDesplegablesSede(){
  document.querySelectorAll('.ck-sede-group').forEach(det=>{
    const label=det.querySelector('.ck-sede-label');
    if(!label)return;
    const cantidad=(label.textContent.match(/\d+/)||['0'])[0];
    const actualizar=()=>{label.textContent=(det.open?'Ocultar ':'Ver ')+cantidad+' registro(s)';};
    det.addEventListener('toggle',actualizar);
    actualizar();
  });
}
function ckAplicarFiltrosVisuales(){
  const box=document.getElementById('ckResultadosJefatura');
  const kpis=document.getElementById('ckResumenGeneralJefatura');
  if(!box||!kpis)return;
  const filtrados=ckFiltrarVisualChecklist(CK_LISTA_ACTUAL||[]);
  kpis.innerHTML=ckKpisHtml(ckConteosLista(filtrados),false);
  box.innerHTML=ckRenderAgrupadoPorSede(filtrados);
  ckActivarDesplegablesSede();
}
function ckLimpiarFiltrosVisuales(){
  ['ckFiltroSede','ckFiltroCuadrilla','ckFiltroSerie','ckFiltroEstado'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ckAplicarFiltrosVisuales();
}
async function ckCargarLista(){
  const c=document.getElementById('ckContenido')||document.getElementById('ckLista');if(!c)return;
  try{
    const d=await ckApi({accion:'listarChecklistAlmacen',usuario:ckUser().usuario});
    const arr=d.checklist||[];CK_LISTA_ACTUAL=arr;
    const u=ckUser();
    const toolbar=u.perfil!=='TECNICO'?`<div class="ck-toolbar"><button class="ck-btn blue" onclick="ckAbrirInformeChecklist()">📥 Descargar informe de checklist</button></div>`:'';
    if(ckEsJefaturaVisualChecklist(u.perfil)){
      c.innerHTML=toolbar+ckRenderFiltrosJefatura(arr)+`<div id="ckResumenGeneralJefatura">${ckKpisHtml(ckConteosLista(arr),false)}</div><div id="ckResultadosJefatura">${ckRenderAgrupadoPorSede(arr)}</div>`;
      ckActivarDesplegablesSede();
    }else{
      const counts=ckConteosLista(arr);
      c.innerHTML=toolbar+ckKpisHtml(counts,false)+(arr.map(x=>ckCard(x,u)).join('')||'<div class="ck-card">No hay registros.</div>');
    }
  }catch(e){c.innerHTML=`<div class="ck-card">${ckEsc(e.message)}</div>`}
}

function ckAbrirInformeChecklist(){
  const arr=CK_LISTA_ACTUAL||[];
  const sedes=[...new Set(arr.map(x=>ckNorm(x.sede)).filter(Boolean))].sort();
  const cuad=[...new Set(arr.map(x=>(x.cuadrilla||'').toString().trim()).filter(Boolean))].sort();
  const estados=[...new Set(arr.map(x=>(x.estadoGeneral||'').toString().trim()).filter(Boolean))].sort();
  ckMostrarModal(`<button class="ck-modal-close" onclick="ckCerrarModal()">×</button><h3>📥 Descargar informe de checklist</h3><div class="ck-report-grid">
  <div class="ck-field"><label>Sede</label><select id="ckRepSede"><option value="">Todas</option>${sedes.map(v=>`<option>${ckEsc(v)}</option>`).join('')}</select></div>
  <div class="ck-field"><label>Cuadrilla</label><select id="ckRepCuad"><option value="">Todas</option>${cuad.map(v=>`<option>${ckEsc(v)}</option>`).join('')}</select></div>
  <div class="ck-field"><label>Fecha desde</label><input id="ckRepDesde" type="date"></div>
  <div class="ck-field"><label>Fecha hasta</label><input id="ckRepHasta" type="date"></div>
  <div class="ck-field"><label>Equipo</label><select id="ckRepEquipo"><option value="">Todos</option><option value="ontZte">ONT ZTE</option><option value="ontHuawei">ONT Huawei</option><option value="meshZte">Mesh/Repetidor ZTE</option><option value="meshHuawei">Mesh/Repetidor Huawei</option><option value="winbox">WINBOX</option><option value="fonowin">FONOWIN</option></select></div>
  <div class="ck-field"><label>Estado</label><select id="ckRepEstado"><option value="">Todos</option>${estados.map(v=>`<option>${ckEsc(v)}</option>`).join('')}</select></div>
  <div class="ck-field" style="grid-column:1/-1"><label>Buscar serie</label><input id="ckRepSerie" placeholder="Ingrese serie completa o parcial"></div></div>
  <div class="ck-report-note">El informe incluirá los datos del checklist, materiales, estados, validadores y el detalle de series con enlaces de evidencias.</div>
  <div class="ck-actions"><button class="ck-btn green" onclick="ckDescargarInformeChecklist()">Generar Excel</button><button class="ck-btn gray" onclick="ckCerrarModal()">Cancelar</button></div>`);
}

function ckFechaISO(valor){
  const t=(valor||'').toString().trim();if(!t)return '';
  if(/^\d{4}-\d{2}-\d{2}/.test(t))return t.slice(0,10);
  const p=t.split('/');if(p.length===3)return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  return '';
}
function ckFiltrarInforme(arr){
  const sede=ckNorm(document.getElementById('ckRepSede')?.value),cuad=(document.getElementById('ckRepCuad')?.value||'').trim(),desde=document.getElementById('ckRepDesde')?.value||'',hasta=document.getElementById('ckRepHasta')?.value||'',equipo=document.getElementById('ckRepEquipo')?.value||'',estado=ckNorm(document.getElementById('ckRepEstado')?.value),serie=ckNorm(document.getElementById('ckRepSerie')?.value);
  const mapaEq={ontZte:'ontZte',ontHuawei:'ontHuawei',meshZte:'meshZte',meshHuawei:'meshHuawei',winbox:'winbox',fonowin:'fonowin'};
  return arr.filter(x=>{
    if(sede&&ckNorm(x.sede)!==sede)return false;
    if(cuad&&(x.cuadrilla||'').toString().trim()!==cuad)return false;
    const f=ckFechaISO(x.fechaGestion||x.fechaRegistro);if(desde&&f&&f<desde)return false;if(hasta&&f&&f>hasta)return false;
    if(estado&&ckNorm(x.estadoGeneral)!==estado)return false;
    if(equipo&&!ckPartes(x[mapaEq[equipo]]).length)return false;
    if(serie){const todas=['ontZte','ontHuawei','meshZte','meshHuawei','winbox','fonowin'].flatMap(k=>ckPartes(x[k])).map(ckNorm);if(!todas.some(v=>v.includes(serie)))return false;}
    return true;
  });
}
function ckHtmlExcelCell(v){return ckEsc(v===undefined||v===null?'':v);}
function ckDescargarInformeChecklist(){
  const arr=ckFiltrarInforme(CK_LISTA_ACTUAL||[]);if(!arr.length)return alert('No existen registros con los filtros seleccionados.');
  const head=['ID','FECHA REGISTRO','HORA REGISTRO','SEDE','CUADRILLA','NOMBRES Y APELLIDOS','FECHA GESTIÓN','ESTADO','ONT ZTE','ONT HUAWEI','MESH ZTE','MESH HUAWEI','WINBOX','FONOWIN','CABLE DROP','PRE 50','PRE 100','PRE 150','PRE 200','ANCLAJE P','CINTA BAND-IT','HEBILLA','ACOPLADOR','ROSETA','CONECTORES','TEMPLADORES','SPLITTER','CLEVIS','UTP CAT5','UTP CAT6','PATCH APC','PATCH UPC','RJ45','RESULTADO ALMACÉN','MOTIVO ALMACÉN','VALIDADO ALMACÉN POR','RESULTADO JEFATURA','MOTIVO JEFATURA','VALIDADO JEFATURA POR'];
  const rows=arr.map(x=>[x.id,x.fechaRegistro,x.horaRegistro,x.sede,x.cuadrilla,x.nombresApellidos,x.fechaGestion,x.estadoGeneral,x.ontZte,x.ontHuawei,x.meshZte,x.meshHuawei,x.winbox,x.fonowin,x.cableDrop,x.pre50,x.pre100,x.pre150,x.pre200,x.anclajeP,x.cintaBandIt,x.hebilla,x.acoplador,x.roseta,x.conectoresOpticos,x.templadores,x.splitter,x.clevis,x.utpCat5,x.utpCat6,x.patchApcApc,x.patchUpcApc,x.rj45,x.resultadoAlmacen,x.motivoAlmacen,x.validadoAlmacenPor,x.resultadoJefatura,x.motivoJefatura,x.validadoJefaturaPor]);
  const eq=[];const defs=[['ONT ZTE','ontZte','fotosOntZte'],['ONT Huawei','ontHuawei','fotosOntHuawei'],['Mesh/Repetidor ZTE','meshZte','fotosMeshZte'],['Mesh/Repetidor Huawei','meshHuawei','fotosMeshHuawei'],['WINBOX','winbox','fotosWinbox'],['FONOWIN','fonowin','fotosFonowin']];
  arr.forEach(x=>defs.forEach(d=>{const ss=ckPartes(x[d[1]]),ls=ckPartes(x[d[2]]);for(let i=0;i<Math.max(ss.length,ls.length);i++)eq.push([x.sede,x.cuadrilla,x.fechaGestion,d[0],ss[i]||'',ls[i]||'']);}));
  const table=(h,r)=>`<table border="1"><tr>${h.map(v=>`<th style="background:#1f4e78;color:white">${ckHtmlExcelCell(v)}</th>`).join('')}</tr>${r.map(a=>`<tr>${a.map(v=>`<td>${ckHtmlExcelCell(v)}</td>`).join('')}</tr>`).join('')}</table>`;
  const html=`<html><head><meta charset="UTF-8"></head><body><h2>INFORME DE CHECKLIST ALMACÉN</h2><p>Generado: ${new Date().toLocaleString('es-PE')}</p>${table(head,rows)}<br><h2>EQUIPOS Y SERIES</h2>${table(['SEDE','CUADRILLA','FECHA','EQUIPO','SERIE','EVIDENCIA'],eq)}</body></html>`;
  const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`INFORME_CHECKLIST_${new Date().toISOString().slice(0,10)}.xls`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);ckCerrarModal();
}

async function ckValidar(id,resultado){
  if(resultado==='CONFORME'){
    ckMostrarModal(`<button class="ck-modal-close" onclick="ckCerrarModal()">×</button><h3>Confirmar conformidad</h3><p>Detalle el motivo o comentario de la conformidad final.</p><div class="ck-field"><label>Motivo de conformidad *</label><textarea id="ckMotivoConforme" rows="4" placeholder="Ejemplo: Equipos, series, materiales y evidencias revisados correctamente."></textarea></div><p class="ck-meta">Este detalle se registrará y será visible para el técnico junto al estado <b>CONFORME</b>.</p><div class="ck-actions"><button class="ck-btn green" onclick="ckConfirmarConforme('${ckEsc(id)}')">Confirmar y finalizar</button><button class="ck-btn gray" onclick="ckCerrarModal()">Cancelar</button></div>`);return;
  }
  let motivo='';if(resultado==='OBSERVADO'){motivo=prompt('Ingrese el motivo de observación:')||'';if(!motivo.trim())return;}
  await ckEnviarValidacion(id,resultado,motivo.trim());
}
async function ckConfirmarConforme(id){
  const motivo=(document.getElementById('ckMotivoConforme')?.value||'').trim();
  if(!motivo)return alert('Debe ingresar el motivo o comentario de conformidad.');
  ckCerrarModal();
  await ckEnviarValidacion(id,'CONFORME',motivo);
}
async function ckEnviarValidacion(id,resultado,motivo){try{await ckApi({accion:'validarChecklistAlmacen',usuario:ckUser().usuario,id,resultado,motivo});await ckCargarLista();}catch(e){alert(e.message)}}


// Aplicar visibilidad del módulo al cargar el menú principal.
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>setTimeout(ckAplicarVisibilidadChecklist,300));}else{setTimeout(ckAplicarVisibilidadChecklist,300);}


/* =========================
   CHECKLIST POR TIPO V140
   Materiales se conserva sin cambios.
========================= */
const CK_TIPOS_V140=["MATERIALES","HERRAMIENTAS","UNIDAD VEHICULAR","DOCUMENTACION","EPP"];
const CK_HERRAMIENTAS_V140=["FUSIONADORA","POWER METER","VFL","CLEAVER / CORTADORA","PELADORA DE FIBRA","TALADRO","ESCALERA","ALICATE","DESTORNILLADORES","WINCHA"];
function ckArchivoGeneral(file){
  if(!file)return Promise.resolve(null);
  if((file.type||'').startsWith('image/'))return ckFileData(file);
  return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res({nombre:file.name||'archivo',mime:file.type||'application/octet-stream',base64:(fr.result||'').toString().split(',')[1]||''});fr.onerror=rej;fr.readAsDataURL(file)});
}
function ckInputArchivo(id,label,accept='image/*',multiple=false){return `<div class="ck-field"><label>${label}</label><input id="${id}" type="file" accept="${accept}" ${multiple?'multiple':''}></div>`;}
function ckCambioTipoChecklist(){const t=document.getElementById('ckTipoChecklist')?.value||'MATERIALES';const c=document.getElementById('ckFormularioTipo');if(c)c.innerHTML=ckFormularioPorTipo(t);if(t==='MATERIALES')Object.keys(CK_EQUIPOS).forEach(ckAddEquipo);}
function ckHerramientasHtml(){return `<div class="ck-card"><h3 class="ck-sec">🧰 Herramientas</h3><div class="act-note">Bueno: no pide motivo ni foto. Regular: motivo obligatorio. Malo: motivo y foto obligatorios.</div><div id="ckHerramientasLista">${CK_HERRAMIENTAS_V140.map((h,i)=>`<div class="ck-detail-box" style="margin-bottom:8px"><div class="ck-grid"><div class="ck-field"><label>Herramienta</label><input data-h-nombre value="${ckEsc(h)}"></div><div class="ck-field"><label>Código / Serie</label><input data-h-serie placeholder="Opcional"></div><div class="ck-field"><label>Estado</label><select data-h-estado onchange="ckEstadoHerramienta(this)"><option value="BUENO">BUENO</option><option value="REGULAR">REGULAR</option><option value="MALO">MALO</option></select></div><div class="ck-field" data-h-motivo-wrap style="display:none"><label>Motivo</label><textarea data-h-motivo rows="2"></textarea></div><div class="ck-field" data-h-foto-wrap style="display:none"><label>Foto obligatoria por estado Malo</label><input data-h-foto type="file" accept="image/*" capture="environment"></div></div></div>`).join('')}</div></div>`;}
function ckEstadoHerramienta(sel){const box=sel.closest('.ck-detail-box'),e=sel.value;box.querySelector('[data-h-motivo-wrap]').style.display=e==='REGULAR'||e==='MALO'?'block':'none';box.querySelector('[data-h-foto-wrap]').style.display=e==='MALO'?'block':'none';}
function ckFormularioPorTipo(t){
 if(t==='MATERIALES')return `<h3 class="ck-sec">Equipos y evidencias</h3><div class="ck-grid ck-equipos-grid">${Object.keys(CK_EQUIPOS).map(ckEquipoBlock).join('')}</div><h3 class="ck-sec">Materiales</h3><div class="ck-grid">${ckField('ckCableDrop','Cable Drop/Bobina','metros')}${ckField('ckPre50','Preconectorizado 50 m','cantidad')}${ckField('ckPre100','Preconectorizado 100 m','cantidad')}${ckField('ckPre150','Preconectorizado 150 m','cantidad')}${ckField('ckPre200','Preconectorizado 200 m','cantidad')}${ckField('ckAnclaje','Anclaje P','cantidad')}${ckField('ckBand','Cinta Band-It','metros')}${ckField('ckHebilla','Hebilla 3/4','unidades')}${ckField('ckAcoplador','Acoplador','unidades')}${ckField('ckRoseta','Roseta','unidades')}${ckField('ckConectores','Conectores ópticos','unidades')}${ckField('ckTempladores','Templadores','unidades')}${ckField('ckSplitter','Splitter','unidades')}${ckField('ckClevis','Clevis','unidades')}${ckField('ckCat5','Cable UTP CAT5','unidades')}${ckField('ckCat6','Cable UTP CAT6','unidades')}${ckField('ckApc','Patchcord APC-APC','unidades')}${ckField('ckUpc','Patchcord UPC-APC','unidades')}${ckField('ckRj45','Conector RJ45','unidades')}</div>`;
 if(t==='HERRAMIENTAS')return ckHerramientasHtml();
 if(t==='UNIDAD VEHICULAR')return `<h3 class="ck-sec">🚐 Unidad Vehicular</h3><div class="ck-grid">${ckInputArchivo('ckUnidadFrente','Foto frontal')}${ckInputArchivo('ckUnidadPosterior','Foto posterior')}${ckInputArchivo('ckUnidadIzq','Foto lado izquierdo')}${ckInputArchivo('ckUnidadDer','Foto lado derecho')}${ckInputArchivo('ckExtintor','Foto del extintor')}${ckInputArchivo('ckBotiquin','Foto del botiquín')}${ckInputArchivo('ckReja','Foto de reja separadora')}${ckInputArchivo('ckParrilla1','Parrilla homologada - foto 1')}${ckInputArchivo('ckParrilla2','Parrilla homologada - foto 2')}<div class="ck-field"><label>Observación</label><textarea id="ckObsUnidad"></textarea></div></div>`;
 if(t==='DOCUMENTACION')return `<h3 class="ck-sec">📄 Documentación</h3><h4>Licencia de conducir</h4><div class="ck-grid"><div class="ck-field"><label>Fecha de vencimiento</label><input id="ckLicVence" type="date"></div>${ckInputArchivo('ckLicFrente','Licencia - frente')}${ckInputArchivo('ckLicReverso','Licencia - reverso')}</div><h4>SOAT</h4><div class="ck-grid"><div class="ck-field"><label>Fecha de vencimiento</label><input id="ckSoatVence" type="date"></div>${ckInputArchivo('ckSoatArchivo','SOAT - PDF o foto','image/*,application/pdf')}</div><h4>Revisión técnica</h4><div class="ck-grid"><div class="ck-field"><label>Fecha de vencimiento</label><input id="ckRevVence" type="date"></div>${ckInputArchivo('ckRevArchivo','Revisión técnica - foto o PDF','image/*,application/pdf')}<div class="ck-field"><label>Observación</label><textarea id="ckObsDoc"></textarea></div></div>`;
 return `<h3 class="ck-sec">🦺 EPP</h3><div class="ck-grid">${ckInputArchivo('ckPersonalCompleto','Foto completa del personal')}${ckInputArchivo('ckBotas','Foto de botas')}${ckInputArchivo('ckFotocheck','Foto de fotocheck')}<div class="ck-field"><label>Observación</label><textarea id="ckObsEpp"></textarea></div></div>`;
}
function ckRenderForm(){const u=ckUser(),c=document.getElementById('ckFormPanel');if(!c)return;c.innerHTML=`<div class="ck-card"><h3 style="margin-top:0">Nuevo checklist</h3><div class="ck-grid"><div class="ck-field"><label>Tipo de checklist</label><select id="ckTipoChecklist" onchange="ckCambioTipoChecklist()">${CK_TIPOS_V140.map(t=>`<option>${t}</option>`).join('')}</select></div><div class="ck-field"><label>Nombres y apellidos</label><input id="ckNombres" value="${ckEsc(u.nombres)}"></div><div class="ck-field"><label>Fecha de gestión</label><input id="ckFecha" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="ck-field"><label>Sede / Cuadrilla</label><input value="${ckEsc(u.sede)} - ${ckEsc(u.cuadrilla)}" disabled></div></div><div id="ckFormularioTipo">${ckFormularioPorTipo('MATERIALES')}</div><div class="ck-field" style="margin-top:10px"><label>Comentario final</label><textarea id="ckComentarioFinal" rows="3"></textarea></div><div class="ck-actions" style="margin-top:12px"><button class="ck-btn blue" onclick="ckGuardar(event)">Guardar checklist</button><button type="button" class="ck-btn gray" onclick="ckToggleNuevoChecklist(false)">Cancelar</button></div></div>`;Object.keys(CK_EQUIPOS).forEach(ckAddEquipo);}
async function ckRecolectarHerramientas(){const out=[];for(const box of document.querySelectorAll('#ckHerramientasLista .ck-detail-box')){const nombre=box.querySelector('[data-h-nombre]')?.value.trim(),serie=box.querySelector('[data-h-serie]')?.value.trim(),estado=box.querySelector('[data-h-estado]')?.value||'BUENO',motivo=box.querySelector('[data-h-motivo]')?.value.trim(),file=box.querySelector('[data-h-foto]')?.files?.[0];if(!nombre)continue;if((estado==='REGULAR'||estado==='MALO')&&!motivo)throw new Error('Debe ingresar el motivo de '+nombre);if(estado==='MALO'&&!file)throw new Error('Debe subir la foto de '+nombre+' porque está en estado MALO');out.push({herramienta:nombre,codigoSerie:serie,estado,motivo,foto:file?await ckFileData(file):null});}return out;}
async function ckArchivoObligatorio(id,label,acceptPdf=false){const f=document.getElementById(id)?.files?.[0];if(!f)throw new Error('Debe adjuntar '+label);return acceptPdf?await ckArchivoGeneral(f):await ckFileData(f);}
async function ckConstruirPayloadTipo(tipo){const p={tipoChecklist:tipo,comentarioFinal:(document.getElementById('ckComentarioFinal')?.value||'').trim()};
 if(tipo==='MATERIALES'){Object.assign(p,{cableDrop:ckNum('ckCableDrop'),pre50:ckNum('ckPre50'),pre100:ckNum('ckPre100'),pre150:ckNum('ckPre150'),pre200:ckNum('ckPre200'),anclajeP:ckNum('ckAnclaje'),cintaBandIt:ckNum('ckBand'),hebilla:ckNum('ckHebilla'),acoplador:ckNum('ckAcoplador'),roseta:ckNum('ckRoseta'),conectoresOpticos:ckNum('ckConectores'),templadores:ckNum('ckTempladores'),splitter:ckNum('ckSplitter'),clevis:ckNum('ckClevis'),utpCat5:ckNum('ckCat5'),utpCat6:ckNum('ckCat6'),patchApcApc:ckNum('ckApc'),patchUpcApc:ckNum('ckUpc'),rj45:ckNum('ckRj45')});for(const k of Object.keys(CK_EQUIPOS))p[k+'Equipos']=await ckCollectEquipos(k);p.equipos={ontZte:p.ontZteEquipos,ontHuawei:p.ontHuaweiEquipos,meshZte:p.meshZteEquipos,meshHuawei:p.meshHuaweiEquipos,winbox:p.winboxEquipos,fonowin:p.fonowinEquipos};}
 else if(tipo==='HERRAMIENTAS')p.herramientas=await ckRecolectarHerramientas();
 else if(tipo==='UNIDAD VEHICULAR'){p.fotoUnidadFrente=await ckArchivoObligatorio('ckUnidadFrente','la foto frontal');p.fotoUnidadPosterior=await ckArchivoObligatorio('ckUnidadPosterior','la foto posterior');p.fotoUnidadLadoIzquierdo=await ckArchivoObligatorio('ckUnidadIzq','la foto del lado izquierdo');p.fotoUnidadLadoDerecho=await ckArchivoObligatorio('ckUnidadDer','la foto del lado derecho');p.fotoExtintor=await ckArchivoObligatorio('ckExtintor','la foto del extintor');p.fotoBotiquin=await ckArchivoObligatorio('ckBotiquin','la foto del botiquín');p.fotoRejaSeparadora=await ckArchivoObligatorio('ckReja','la foto de la reja separadora');p.fotoParrilla1=await ckArchivoObligatorio('ckParrilla1','la primera foto de la parrilla');p.fotoParrilla2=await ckArchivoObligatorio('ckParrilla2','la segunda foto de la parrilla');p.observacionUnidad=document.getElementById('ckObsUnidad')?.value||'';}
 else if(tipo==='DOCUMENTACION'){p.licenciaFechaVencimiento=document.getElementById('ckLicVence')?.value||'';p.soatFechaVencimiento=document.getElementById('ckSoatVence')?.value||'';p.revisionTecnicaFechaVencimiento=document.getElementById('ckRevVence')?.value||'';if(!p.licenciaFechaVencimiento||!p.soatFechaVencimiento||!p.revisionTecnicaFechaVencimiento)throw new Error('Debe completar todas las fechas de vencimiento');p.licenciaFotoFrente=await ckArchivoObligatorio('ckLicFrente','la licencia por delante');p.licenciaFotoReverso=await ckArchivoObligatorio('ckLicReverso','la licencia por detrás');p.soatArchivo=await ckArchivoObligatorio('ckSoatArchivo','el SOAT',true);p.revisionTecnicaArchivo=await ckArchivoObligatorio('ckRevArchivo','la revisión técnica',true);p.observacionDocumentacion=document.getElementById('ckObsDoc')?.value||'';}
 else {p.fotoPersonalCompleto=await ckArchivoObligatorio('ckPersonalCompleto','la foto completa del personal');p.fotoBotas=await ckArchivoObligatorio('ckBotas','la foto de botas');p.fotoFotocheck=await ckArchivoObligatorio('ckFotocheck','la foto del fotocheck');p.observacionEpp=document.getElementById('ckObsEpp')?.value||'';}return p;}
async function ckGuardar(ev){const u=ckUser(),btn=ev?.currentTarget||ev?.target;if(CK_GUARDANDO_CHECKLIST)return;CK_GUARDANDO_CHECKLIST=true;if(btn){btn.disabled=true;btn.textContent='Guardando, espere...'}try{const cfg=await ckObtenerConfiguracion();if(!cfg.activo)throw new Error('El Checklist Almacén no está habilitado');const tipo=document.getElementById('ckTipoChecklist')?.value||'MATERIALES';const payload={accion:'registrarChecklistAlmacen',usuario:u.usuario,nombresApellidos:document.getElementById('ckNombres')?.value||'',fechaGestion:document.getElementById('ckFecha')?.value||''};Object.assign(payload,await ckConstruirPayloadTipo(tipo));await ckApi(payload);alert('Checklist de '+tipo+' registrado correctamente');ckToggleNuevoChecklist(false);await ckCargarHistorialTecnico();}catch(e){alert(e.message)}finally{CK_GUARDANDO_CHECKLIST=false;if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent='Guardar checklist'}}}
