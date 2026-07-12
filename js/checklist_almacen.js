// MI VISUAL - Checklist Almacén V98
const API_CHECKLIST_ALMACEN = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

function ckNorm(v){return (v||"").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function ckUser(){return {usuario:localStorage.getItem("usuario")||"",perfil:ckNorm(localStorage.getItem("perfil")),sede:ckNorm(localStorage.getItem("sede")),cuadrilla:localStorage.getItem("cuadrilla")||"",nombres:localStorage.getItem("nombresApellidos")||localStorage.getItem("usuario")||""};}
function ckEsc(v){return (v||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
async function ckApi(payload){const r=await fetch(API_CHECKLIST_ALMACEN,{method:"POST",body:JSON.stringify(payload)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Error en Checklist");return d;}
function ckEstado(e){const n=ckNorm(e);let c="pend";if(n==="CONFORME")c="ok";else if(n.includes("OBSERVADO"))c="obs";else if(n.includes("VISTO BUENO"))c="vb";return `<span class="ck-badge ${c}">${ckEsc(e||"PENDIENTE")}</span>`;}
function ckStyle(){return `<style>
.ck-wrap{max-width:1100px;margin:auto;padding:12px}.ck-head{background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;padding:17px;border-radius:18px;margin-bottom:12px}.ck-head h2{margin:0 0 4px;font-size:22px}.ck-card{background:#fff;border:1px solid #dbe3ee;border-radius:15px;padding:12px;margin-bottom:10px;box-shadow:0 5px 14px rgba(15,23,42,.08);color:#111827}.ck-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ck-field label{display:block;font-size:11px;font-weight:900;color:#334155;margin-bottom:4px}.ck-field input,.ck-field textarea,.ck-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:9px;background:#fff;color:#111827}.ck-unit{display:grid;grid-template-columns:1fr auto;align-items:center;gap:7px}.ck-unit span{font-size:11px;font-weight:900;color:#64748b}.ck-sec{font-size:15px;margin:12px 0 7px;color:#0f172a}.ck-photo-box{border:1px dashed #94a3b8;padding:8px;border-radius:11px;background:#f8fafc;margin-bottom:7px}.ck-photo-row{display:flex;gap:7px;align-items:center;margin:5px 0;font-size:11px}.ck-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}.ck-btn.blue{background:#2563eb;color:#fff}.ck-btn.green{background:#16a34a;color:#fff}.ck-btn.orange{background:#f59e0b;color:#111827}.ck-btn.red{background:#dc2626;color:#fff}.ck-btn.gray{background:#64748b;color:#fff}.ck-actions{display:flex;gap:7px;flex-wrap:wrap}.ck-badge{padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900}.ck-badge.pend{background:#fef3c7;color:#92400e}.ck-badge.vb{background:#dbeafe;color:#1e40af}.ck-badge.ok{background:#dcfce7;color:#166534}.ck-badge.obs{background:#fee2e2;color:#991b1b}.ck-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.ck-kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:9px;text-align:center}.ck-kpi b{font-size:18px;display:block}.ck-meta{font-size:11px;color:#64748b;line-height:1.4}.ck-details{margin-top:7px}.ck-details summary{cursor:pointer;font-weight:900;color:#1d4ed8}.ck-evidencias a{display:inline-block;margin:3px;padding:5px 7px;background:#e0f2fe;border-radius:7px;font-size:10px;font-weight:900;color:#075985;text-decoration:none}.ck-equipos-grid{align-items:start}.ck-new-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:12px 14px;margin-bottom:10px;font-size:15px;font-weight:900;color:#0f172a;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.07)}.ck-new-toggle:hover{background:#f8fafc}.ck-new-arrow{transition:transform .2s ease}.ck-new-toggle.open .ck-new-arrow{transform:rotate(180deg)}.ck-form-panel{display:none}.ck-form-panel.open{display:block}.ck-equipo-box{margin:0;border:2px solid #93c5fd;background:#f8fbff;box-shadow:inset 0 0 0 1px rgba(37,99,235,.05),0 4px 10px rgba(15,23,42,.05)}.ck-equipo-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:-8px -8px 8px;padding:9px 10px;background:#eaf2ff;border-bottom:1px solid #bfdbfe;border-radius:9px 9px 0 0}.ck-equipo-head b{font-size:13px;color:#0f3d78}.ck-equipo-head small{font-weight:900;color:#1d4ed8}.ck-equipo-row{position:relative;border-top:1px solid #dbeafe;padding:8px 28px 8px 0}.ck-equipo-row:first-child{border-top:0}.ck-equipo-num{font-size:11px;font-weight:900;color:#0f172a;margin-bottom:5px}.ck-equipo-inputs{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ck-equipo-inputs input{width:100%;box-sizing:border-box}.ck-equipo-remove{position:absolute;right:0;top:9px;border:0;background:#fee2e2;color:#991b1b;border-radius:7px;width:24px;height:24px;font-weight:900;cursor:pointer}.ck-detail-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px}.ck-series-list{margin-top:5px;display:grid;gap:4px}.ck-serie-item{font-size:11px;line-height:1.35}.ck-serie-item a{display:inline-block;margin-left:5px;padding:3px 6px;background:#dbeafe;color:#1d4ed8;text-decoration:none;border-radius:6px;font-weight:900}.ck-serie-item em{font-style:normal;color:#94a3b8;margin-left:5px}@media(max-width:650px){.ck-grid{grid-template-columns:1fr}.ck-equipo-inputs{grid-template-columns:1fr}.ck-kpis{grid-template-columns:repeat(2,1fr)}.ck-wrap{padding:7px}.ck-card{padding:9px}}
</style>`;}

const CK_EQUIPOS={
  ontZte:{label:'ONT ZTE',max:10,serie:'Serie ONT ZTE'},
  ontHuawei:{label:'ONT Huawei',max:10,serie:'Serie ONT Huawei'},
  meshZte:{label:'Mesh/Repetidor ZTE',max:10,serie:'Serie / código Mesh ZTE'},
  meshHuawei:{label:'Mesh/Repetidor Huawei',max:10,serie:'Serie / código Mesh Huawei'},
  winbox:{label:'WINBOX',max:5,serie:'Serie WINBOX'},
  fonowin:{label:'FONOWIN',max:5,serie:'Serie FONOWIN'}
};

function ckEquipoBlock(key){
  const cfg=CK_EQUIPOS[key];
  return `<div class="ck-photo-box ck-equipo-box"><div class="ck-equipo-head"><b>${cfg.label}</b><small id="ckCount_${key}">0/${cfg.max}</small></div><div id="ckEquipos_${key}"></div><button type="button" class="ck-btn gray" onclick="ckAddEquipo('${key}')">+ Agregar ${cfg.label}</button></div>`;
}

function ckAddEquipo(key){
  const cfg=CK_EQUIPOS[key],box=document.getElementById('ckEquipos_'+key);if(!box)return;
  const count=box.querySelectorAll('.ck-equipo-row').length;
  if(count>=cfg.max)return alert('Máximo '+cfg.max+' equipos para '+cfg.label);
  const row=document.createElement('div');row.className='ck-equipo-row';row.dataset.key=key;
  row.innerHTML=`<div class="ck-equipo-num">${cfg.label} ${count+1}</div><div class="ck-equipo-inputs"><input type="text" placeholder="${cfg.serie}" data-ck-serie="${key}" oninput="ckAutoEquipo('${key}',this)"><input type="file" accept="image/*" capture="environment" data-ck-foto="${key}" onchange="ckAutoEquipo('${key}',this)"></div>${count?`<button type="button" class="ck-equipo-remove" onclick="ckRemoveEquipo(this,'${key}')">×</button>`:''}`;
  box.appendChild(row);ckActualizarConteoEquipo(key);
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
function ckRemoveEquipo(btn,key){btn.closest('.ck-equipo-row')?.remove();ckRenumerarEquipos(key);}
function ckRenumerarEquipos(key){
  const cfg=CK_EQUIPOS[key],rows=[...document.querySelectorAll(`#ckEquipos_${key} .ck-equipo-row`)];
  rows.forEach((r,i)=>{const n=r.querySelector('.ck-equipo-num');if(n)n.textContent=`${cfg.label} ${i+1}`;});
  if(!rows.length)ckAddEquipo(key);else ckActualizarConteoEquipo(key);
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
function ckField(id,label,unit){return `<div class="ck-field"><label>${label}</label><div class="ck-unit"><input id="${id}" type="number" min="0" step="1" value="0"><span>${unit}</span></div></div>`;}

async function mostrarChecklistAlmacen(){
  const u=ckUser();
  mostrarPantalla(ckStyle()+`<div class="ck-wrap"><div class="ck-head"><h2>✅ CHECKLIST ALMACÉN</h2><p>Control de equipos, materiales y evidencias por cuadrilla.</p></div><div id="ckContenido"><div class="ck-card">Cargando...</div></div></div>`);
  if(u.perfil==='TECNICO'){
    const c=document.getElementById('ckContenido');
    c.innerHTML=`<button id="ckNuevoToggle" type="button" class="ck-new-toggle" onclick="ckToggleNuevoChecklist()"><span>➕ Nuevo checklist</span><span class="ck-new-arrow">▼</span></button><div id="ckFormPanel" class="ck-form-panel"></div><div id="ckLista"></div>`;
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
  const u=ckUser();const btn=ev?.target;
  try{
    if(btn){btn.disabled=true;btn.textContent='Guardando...'}
    const payload={accion:'registrarChecklistAlmacen',usuario:u.usuario,nombresApellidos:document.getElementById('ckNombres').value,fechaGestion:document.getElementById('ckFecha').value,cableDrop:ckNum('ckCableDrop'),pre50:ckNum('ckPre50'),pre100:ckNum('ckPre100'),pre150:ckNum('ckPre150'),pre200:ckNum('ckPre200'),anclajeP:ckNum('ckAnclaje'),cintaBandIt:ckNum('ckBand'),hebilla:ckNum('ckHebilla'),acoplador:ckNum('ckAcoplador'),roseta:ckNum('ckRoseta'),conectoresOpticos:ckNum('ckConectores'),templadores:ckNum('ckTempladores'),splitter:ckNum('ckSplitter'),clevis:ckNum('ckClevis'),utpCat5:ckNum('ckCat5'),utpCat6:ckNum('ckCat6'),patchApcApc:ckNum('ckApc'),patchUpcApc:ckNum('ckUpc'),rj45:ckNum('ckRj45')};
    for(const k of Object.keys(CK_EQUIPOS))payload[k+'Equipos']=await ckCollectEquipos(k);
    await ckApi(payload);
    alert('Checklist registrado correctamente');
    ckToggleNuevoChecklist(false);
    await ckCargarHistorialTecnico();
    const lista=document.getElementById('ckLista');
    if(lista)setTimeout(()=>lista.scrollIntoView({behavior:'smooth',block:'start'}),60);
  }catch(e){alert(e.message)}finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent='Guardar checklist'}}
}
function ckPartes(v){return (v||'').toString().split('|').map(x=>x.trim()).filter(Boolean);}
function ckSeriesConLinks(series,links){
  const ss=ckPartes(series);const ls=ckPartes(links);
  if(!ss.length&&!ls.length)return '<span class="ck-meta">Sin series registradas</span>';
  const max=Math.max(ss.length,ls.length);
  let html='<div class="ck-series-list">';
  for(let i=0;i<max;i++){
    const serie=ss[i]||('Equipo '+(i+1));const link=ls[i]||'';
    html+=`<div class="ck-serie-item"><span>• ${ckEsc(serie)}</span>${link?` <a href="${ckEsc(link)}" target="_blank" rel="noopener noreferrer">Ver evidencia</a>`:' <em>Sin evidencia</em>'}</div>`;
  }
  return html+'</div>';
}
function ckDetalle(x){const equipos=[['ONT ZTE',x.ontZte,x.fotosOntZte],['ONT Huawei',x.ontHuawei,x.fotosOntHuawei],['Mesh ZTE',x.meshZte,x.fotosMeshZte],['Mesh Huawei',x.meshHuawei,x.fotosMeshHuawei],['WINBOX',x.winbox,x.fotosWinbox],['FONOWIN',x.fonowin,x.fotosFonowin]];const mats=[['Cable Drop',x.cableDrop,'m'],['Pre 50',x.pre50,'cant.'],['Pre 100',x.pre100,'cant.'],['Pre 150',x.pre150,'cant.'],['Pre 200',x.pre200,'cant.'],['Anclaje P',x.anclajeP,'cant.'],['Band-It',x.cintaBandIt,'m'],['Hebilla',x.hebilla,'und.'],['Acoplador',x.acoplador,'und.'],['Roseta',x.roseta,'und.'],['Conectores',x.conectoresOpticos,'und.'],['Templadores',x.templadores,'und.'],['Splitter',x.splitter,'und.'],['Clevis',x.clevis,'und.'],['UTP CAT5',x.utpCat5,'und.'],['UTP CAT6',x.utpCat6,'und.'],['Patch APC',x.patchApcApc,'und.'],['Patch UPC',x.patchUpcApc,'und.'],['RJ45',x.rj45,'und.']];return `<details class="ck-details"><summary>Ver detalle, series y evidencias</summary><div class="ck-grid" style="margin-top:7px">${equipos.map(e=>`<div class="ck-detail-box"><b>${e[0]}</b>${ckSeriesConLinks(e[1],e[2])}</div>`).join('')}${mats.map(m=>`<div><b>${m[0]}:</b> ${m[1]||0} ${m[2]}</div>`).join('')}</div></details>`;}
function ckCard(x,u){const acciones=u.perfil==='ALMACEN'?`<button class="ck-btn green" onclick="ckValidar('${x.id}','VISTO BUENO')">Visto bueno</button><button class="ck-btn orange" onclick="ckValidar('${x.id}','OBSERVADO')">Observado</button>`:u.perfil==='JEFATURA ALMACEN'?`<button class="ck-btn green" onclick="ckValidar('${x.id}','CONFORME')">Conforme</button><button class="ck-btn orange" onclick="ckValidar('${x.id}','OBSERVADO')">Observado</button>`:'';return `<div class="ck-card"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${ckEsc(x.cuadrilla)}</b><div class="ck-meta">${ckEsc(x.nombresApellidos)} · ${ckEsc(x.sede)}<br>${ckEsc(x.fechaGestion||x.fechaRegistro)}</div></div>${ckEstado(x.estadoGeneral)}</div>${ckDetalle(x)}${acciones?`<div class="ck-actions" style="margin-top:8px">${acciones}</div>`:''}</div>`;}
async function ckCargarHistorialTecnico(){const box=document.getElementById('ckLista');if(!box)return;try{const d=await ckApi({accion:'listarChecklistAlmacen',usuario:ckUser().usuario});box.innerHTML='<h3 class="ck-sec">Historial</h3>'+d.checklist.map(x=>ckCard(x,ckUser())).join('');}catch(e){box.innerHTML=`<div class="ck-card">${ckEsc(e.message)}</div>`}}
async function ckCargarLista(){const c=document.getElementById('ckContenido')||document.getElementById('ckLista');if(!c)return;try{const d=await ckApi({accion:'listarChecklistAlmacen',usuario:ckUser().usuario});const arr=d.checklist||[];const counts={total:arr.length,pend:arr.filter(x=>ckNorm(x.estadoGeneral).startsWith('PENDIENTE')).length,vb:arr.filter(x=>ckNorm(x.estadoGeneral).includes('VISTO BUENO')).length,ok:arr.filter(x=>ckNorm(x.estadoGeneral)==='CONFORME').length};c.innerHTML=`<div class="ck-kpis"><div class="ck-kpi"><b>${counts.total}</b>Total</div><div class="ck-kpi"><b>${counts.pend}</b>Pendientes</div><div class="ck-kpi"><b>${counts.vb}</b>Visto bueno</div><div class="ck-kpi"><b>${counts.ok}</b>Conformes</div></div>${arr.map(x=>ckCard(x,ckUser())).join('')||'<div class="ck-card">No hay registros.</div>'}`;}catch(e){c.innerHTML=`<div class="ck-card">${ckEsc(e.message)}</div>`}}
async function ckValidar(id,resultado){let motivo='';if(resultado==='OBSERVADO'){motivo=prompt('Ingrese el motivo de observación:')||'';if(!motivo)return;}try{await ckApi({accion:'validarChecklistAlmacen',usuario:ckUser().usuario,id,resultado,motivo});await ckCargarLista();}catch(e){alert(e.message)}}
