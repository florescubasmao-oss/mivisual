// MI VISUAL - Programación de Descansos V138
const API_DESCANSOS = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";
let PD_DATA={programacion:[],cuadrillas:[]};
let PD_CAMBIOS={};
let PD_MOTIVO_CAMBIO="";
let PD_PENDIENTES_SELECCIONADOS=new Set();
let PD_VISTA_PERSONAL=false;

function pdNorm(v){return (v||"").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function pdUser(){return {usuario:localStorage.getItem("usuario")||"",perfil:pdNorm(localStorage.getItem("perfil")),sede:pdNorm(localStorage.getItem("sede")),cuadrilla:localStorage.getItem("cuadrilla")||""};}
function pdSoloLectura(){const u=pdUser();return u.perfil==="OPERACIONES LIMA"||(typeof pmPuede==="function"&&!pmPuede("PROGRAMACION DESCANSOS","EDITAR"));}
function pdEsc(v){return (v??"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
async function pdApi(payload){const r=await fetch(API_DESCANSOS,{method:"POST",body:JSON.stringify(payload)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Error en Programación de Descansos");return d;}
function pdHoy(){const d=new Date(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${d.getFullYear()}-${m}-${day}`;}
function pdPeriodoActual(){return pdHoy().slice(0,7);}
function pdDiasMes(periodo){const [y,m]=periodo.split("-").map(Number);return new Date(y,m,0).getDate();}
function pdFecha(periodo,dia){return `${periodo}-${String(dia).padStart(2,"0")}`;}
function pdNombreMes(periodo){const [y,m]=periodo.split("-").map(Number);return new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric"}).format(new Date(y,m-1,1)).toUpperCase();}
function pdDiaCorto(fecha){return ["D","L","M","M","J","V","S"][new Date(fecha+"T12:00:00").getDay()];}
function pdNormalizarEstado(v){const e=pdNorm(v||"EN CAMPO");if(["C","CAMPO","EN CAMPO"].includes(e))return "EN CAMPO";if(["CB","C B","Cᴮ","CAMPO BOLSA","EN CAMPO BOLSA","BOLSA"].includes(e))return "EN CAMPO BOLSA";if(["D","DESCANSO"].includes(e))return "DESCANSO";if(["V","VACACIONES"].includes(e))return "VACACIONES";return e||"EN CAMPO";}
function pdEstadoVisible(item){if(!item)return "EN CAMPO";return pdNorm(item.estadoProgramacion)==="APROBADO"?pdNormalizarEstado(item.estadoDia||"EN CAMPO"):"EN CAMPO";}
function pdEsBolsa(estado){return ["EN CAMPO BOLSA","CAMPO BOLSA","BOLSA"].includes(pdNorm(estado));}
function pdEstadoTecnico(estado){return pdEsBolsa(estado)?"DESCANSO":pdNorm(estado||"EN CAMPO");}
function pdEtiquetaEstado(estado){const e=pdNorm(estado);if(e==="DESCANSO")return "D";if(e==="VACACIONES")return "V";if(pdEsBolsa(e))return 'C<span class="pd-bolsa-mark">B</span>';return "C";}
function pdBuscar(cuadrilla,fecha){return PD_DATA.programacion.find(x=>pdNorm(x.cuadrilla)===pdNorm(cuadrilla)&&x.fecha===fecha);}
function pdEstadoPropuesto(item){return item&&item.solicitudCambio?pdNorm(item.solicitudCambio):pdNorm(item?.estadoDia||"EN CAMPO");}
function pdHayCambios(){return Object.keys(PD_CAMBIOS).length>0;}
function pdEsPendiente(item){if(!item)return false;const e=pdNorm(item.estadoValidacion||item.estadoProgramacion).replace(/_/g," ");return ["PENDIENTE JEFATURA","PENDIENTE SUPERVISOR","OBSERVADO"].includes(e);}
function pdActualizarBotonCambios(){const b=document.getElementById("pdBtnGuardarCambios");if(!b)return;b.style.display=pdHayCambios()?"inline-block":"none";const u=pdUser();b.textContent=u.perfil==="SUPERVISOR"?"Guardar cambios y enviar a validación":"Guardar cambios";}
function pdTogglePanel(id){const el=document.getElementById(id);if(!el)return;el.classList.toggle('abierto');const btn=document.querySelector(`[data-pd-toggle=\"${id}\"]`);if(btn)btn.textContent=el.classList.contains('abierto')?'▲ Ocultar':'▼ Ver';}
function pdSeleccionarTodosPendientes(marcado){PD_PENDIENTES_SELECCIONADOS.clear();if(marcado)(PD_DATA.programacion||[]).filter(pdEsPendiente).forEach(x=>{if(x&&x.id)PD_PENDIENTES_SELECCIONADOS.add(x.id);});document.querySelectorAll('.pd-check-pendiente').forEach(ch=>ch.checked=marcado);}

function pdStyle(){return `<style>
.pd-wrap{max-width:1200px;margin:auto;padding:10px;color:#0f172a}.pd-head{background:linear-gradient(135deg,#1d4ed8,#0f766e);color:#fff;border-radius:18px;padding:16px;margin-bottom:11px}.pd-head h2{margin:0 0 4px;font-size:22px}.pd-head p{margin:0;font-size:12px;opacity:.9}.pd-card{background:#fff;border:1px solid #dbe4ef;border-radius:15px;padding:12px;margin-bottom:10px;box-shadow:0 5px 14px rgba(15,23,42,.08)}.pd-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.pd-field label{display:block;font-size:11px;font-weight:900;color:#334155;margin-bottom:4px}.pd-field input,.pd-field select,.pd-field textarea{border:1px solid #cbd5e1;border-radius:9px;padding:8px;background:#fff;color:#0f172a}.pd-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}.pd-blue{background:#2563eb;color:#fff}.pd-green{background:#16a34a;color:#fff}.pd-orange{background:#f59e0b;color:#111827}.pd-red{background:#dc2626;color:#fff}.pd-gray{background:#64748b;color:#fff}.pd-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pd-kpi{border:2px solid #cbd5e1;border-radius:13px;padding:10px;background:#f8fafc}.pd-kpi b{display:block;font-size:20px}.pd-kpi small{font-size:10px;font-weight:900}.pd-kpi.verde{background:#ecfdf5;border-color:#22c55e;color:#166534}.pd-kpi.amarillo{background:#fffbeb;border-color:#f59e0b;color:#92400e}.pd-kpi.rojo{background:#fef2f2;border-color:#ef4444;color:#991b1b}.pd-cal-scroll{overflow:auto;border:2px solid #94a3b8;border-radius:12px}.pd-cal{border-collapse:separate;border-spacing:0;min-width:1000px;width:100%;font-size:10px}.pd-cal th,.pd-cal td{border-right:1px solid #94a3b8;border-bottom:1px solid #94a3b8;text-align:center;padding:4px}.pd-cal th:first-child,.pd-cal td:first-child{border-left:1px solid #94a3b8}.pd-cal thead th{border-top:1px solid #94a3b8}.pd-cal th{position:sticky;top:0;background:#eff6ff;color:#1e3a8a;z-index:2}.pd-cal .pd-sticky{position:sticky;left:0;background:#fff;z-index:3;text-align:left;min-width:220px;font-weight:900}.pd-cuadrilla-nombre{font-weight:900;line-height:1.15}.pd-integrantes{display:grid;gap:1px;margin-top:4px;font-size:8px;font-weight:700;line-height:1.2;opacity:.82}.pd-integrantes span{display:block}.pd-day{width:28px;height:28px;border:0;border-radius:7px;font-size:10px;font-weight:900;cursor:pointer}.pd-campo{background:#dcfce7;color:#166534}.pd-bolsa{background:#dcfce7;color:#166534;position:relative}.pd-bolsa-mark{display:block;font-size:7px;line-height:7px;margin-top:-1px;font-weight:900}.pd-descanso{background:#2563eb;color:#fff}.pd-vacaciones{background:#7c3aed;color:#fff}.pd-pendiente{outline:3px solid #dc2626;position:relative}.pd-pendiente::after{content:"!";position:absolute;right:-4px;top:-7px;background:#dc2626;color:#fff;border-radius:50%;width:13px;height:13px;line-height:13px;font-size:9px}.pd-hoy{box-shadow:inset 0 0 0 3px #dc2626!important}.pd-current-day{background:#fef2f2!important;border-left:3px solid #dc2626!important;border-right:3px solid #dc2626!important}.pd-cal th.pd-current-day{background:#dc2626!important;color:#fff!important;font-weight:900}.pd-cal td.pd-current-day{background:#fff1f2!important}.pd-group{background:#dbeafe!important;color:#1e3a8a!important;font-weight:900;text-align:left!important}.pd-status{font-size:10px;padding:4px 7px;border-radius:999px;font-weight:900}.pd-status.campo{background:#dcfce7;color:#166534}.pd-status.descanso{background:#e5e7eb;color:#374151}.pd-status.vacaciones{background:#ede9fe;color:#6d28d9}.pd-status.pendiente{background:#fef3c7;color:#92400e}.pd-tech-state{padding:20px;border-radius:18px;text-align:center}.pd-tech-state.campo{background:#dcfce7;border:3px solid #22c55e;color:#166534}.pd-tech-state.descanso{background:#f1f5f9;border:3px solid #94a3b8;color:#334155}.pd-tech-state h2{font-size:28px;margin:5px 0}.pd-request{border:2px solid #f59e0b;background:#fff7ed;border-radius:13px;padding:11px;margin-top:10px}.pd-list{display:grid;gap:8px}.pd-item{border:1px solid #dbe4ef;border-radius:12px;padding:10px;background:#fff}.pd-item strong{display:block;margin-bottom:4px}.pd-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.pd-note{font-size:11px;color:#64748b;line-height:1.4}.pd-alert{background:#fff7ed;border:2px solid #fb923c;color:#9a3412;border-radius:12px;padding:10px;font-size:12px;font-weight:800}.pd-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.pd-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pd-summary .pd-kpi{min-height:72px}.pd-query-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pd-query-box{border:1px solid #cbd5e1;border-radius:12px;padding:10px;background:#f8fafc}.pd-query-box h4{margin:0 0 6px}.pd-alert-row{border:2px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:12px;padding:10px;margin-top:8px}.pd-collapse-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;cursor:pointer}.pd-collapse-title{font-weight:900}.pd-collapse-body{display:none;margin-top:8px}.pd-collapse-body.abierto{display:block}.pd-collapse-btn{border:0;background:#e2e8f0;color:#0f172a;border-radius:999px;padding:6px 10px;font-weight:900;cursor:pointer}.pd-select-all{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:900;color:#334155}.pd-alert-compact{border:2px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:12px;padding:10px}.pd-alert-detail{display:none;margin-top:8px}.pd-alert-detail.abierto{display:block}.pd-month-label{background:#dbeafe!important;color:#1e3a8a!important;font-weight:900}.pd-row-instalaciones td{background:#eff6ff}.pd-row-visita td{background:#ecfdf5}.pd-row-traslados td{background:#ecfeff}.pd-row-instalaciones .pd-sticky{background:#bfdbfe!important;color:#1e3a8a}.pd-row-visita .pd-sticky{background:#bbf7d0!important;color:#166534}.pd-row-traslados .pd-sticky{background:#a5f3fc!important;color:#155e75}.pd-row-personal td{background:#f8fafc}.pd-row-personal .pd-sticky{background:#e2e8f0!important;color:#334155}.pd-personal-badge{display:inline-block;margin-top:3px;padding:2px 6px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:8px;font-weight:900}.pd-sunday{border-left:3px solid #f59e0b!important;border-right:3px solid #f59e0b!important;background:#fff7ed!important}.pd-cal th.pd-sunday{background:#ffedd5!important;color:#9a3412!important;font-weight:900}.pd-cal td.pd-sunday{background:#fff7ed!important}.pd-report-action{margin-left:auto}.pd-disabled{opacity:.55;cursor:not-allowed}@media(max-width:700px){.pd-wrap{padding:6px}.pd-kpis{grid-template-columns:1fr}.pd-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.pd-query-list{grid-template-columns:1fr}.pd-grid2{grid-template-columns:1fr}.pd-head h2{font-size:19px}.pd-cal .pd-sticky{min-width:170px}}
</style>`;}


async function actualizarIndicadorDescansoMenu(){
  const u=pdUser();
  const welcome=document.getElementById("mv55Welcome");
  if(!welcome) return;

  let indicador=document.getElementById("pdEstadoMenu");
  if(!["TECNICO","SUPERVISOR","ALMACEN"].includes(u.perfil)){
    if(indicador) indicador.remove();
    return;
  }

  if(!indicador){
    indicador=document.createElement("button");
    indicador.id="pdEstadoMenu";
    indicador.type="button";
    indicador.className="pd-menu-status cargando";
    indicador.onclick=mostrarMiProgramacionPersonal;
    welcome.appendChild(indicador);
  }

  indicador.className="pd-menu-status cargando";
  indicador.innerHTML='<span class="pd-menu-dot"></span><strong>CONSULTANDO ESTADO...</strong>';

  try{
    const data=await pdApi({accion:"listarProgramacionDescansos",usuario:u.usuario,periodo:pdPeriodoActual()});
    let clave=u.cuadrilla;
    if(u.perfil==="SUPERVISOR"||u.perfil==="ALMACEN"){
      const personal=(data.cuadrillas||[]).find(c=>pdNorm(c.tipoPersonal)!=="CUADRILLA"&&pdNorm(c.usuario)===pdNorm(u.usuario));
      clave=personal?.cuadrilla||"";
    }
    const item=(data.programacion||[]).find(x=>pdNorm(x.cuadrilla)===pdNorm(clave)&&x.fecha===pdHoy());
    const estado=pdEstadoTecnico(pdEstadoVisible(item));
    const descanso=estado==="DESCANSO";
    const vacaciones=estado==="VACACIONES";
    indicador.className="pd-menu-status "+(descanso?"descanso":"campo");
    indicador.innerHTML=`<span class="pd-menu-dot"></span><strong>${vacaciones?'VACACIONES':(descanso?'DESCANSO':'EN CAMPO')}</strong><small>Ver programación</small>`;
  }catch(e){
    indicador.className="pd-menu-status campo";
    indicador.innerHTML='<span class="pd-menu-dot"></span><strong>EN CAMPO</strong><small>Ver programación</small>';
  }
}

async function pdAbrirModuloDescansos(vistaPersonal){
  const u=pdUser();
  if(u.perfil==="JEFATURA ALMACEN") return alert("Esta opción no está habilitada para Jefatura de Almacén.");
  PD_VISTA_PERSONAL=!!vistaPersonal;
  limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");
  if(menu) menu.style.setProperty("display","none","important");
  setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");
  pantalla.innerHTML=pdStyle()+`<div class="pd-wrap"><div class="pd-head"><h2>📅 Programación de Descansos</h2><p>Planificación por cuadrilla. No corresponde a control de asistencia.</p></div><div id="pdContenido"><div class="pd-card">Cargando...</div></div></div>`;
  try{await pdCargar();pdRender();}catch(e){const c=document.getElementById("pdContenido")||document.getElementById("pantalla");if(c)c.innerHTML=`<div class="pd-wrap"><div class="pd-alert">${pdEsc(e.message)}</div></div>`;else alert(e.message);}
}

// Acceso desde la tarjeta del menú: el Supervisor administra sus cuadrillas.
async function mostrarProgramacionDescansos(){
  const u=pdUser();
  return pdAbrirModuloDescansos(u.perfil==="ALMACEN");
}

// Acceso desde el indicador personal de la bienvenida.
async function mostrarMiProgramacionPersonal(){
  return pdAbrirModuloDescansos(true);
}

async function pdCargar(periodo){
  const u=pdUser();const per=periodo||document.getElementById("pdPeriodo")?.value||pdPeriodoActual();
  const [y,m]=per.split("-").map(Number);
  const periodos=[new Date(y,m-2,1),new Date(y,m-1,1),new Date(y,m,1)].map(d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  const respuestas=await Promise.all(periodos.map(x=>pdApi({accion:"listarProgramacionDescansos",usuario:u.usuario,periodo:x})));
  const centro=respuestas[1];
  PD_DATA={...centro,periodo:per,programacion:respuestas.flatMap(x=>x.programacion||[]),cuadrillas:centro.cuadrillas||[]};
  PD_CAMBIOS={};PD_MOTIVO_CAMBIO="";
}

function pdRender(){
  const u=pdUser();
  if(u.perfil==="TECNICO") return pdRenderTecnico();
  if(PD_VISTA_PERSONAL && (u.perfil==="SUPERVISOR"||u.perfil==="ALMACEN")) return pdRenderPersonalSimple();
  if(u.perfil==="ALMACEN") return pdRenderPersonalSimple();
  return pdRenderGestion();
}


function pdEntidadPersonalActual(){
  const u=pdUser();
  return (PD_DATA.cuadrillas||[]).find(c=>pdNorm(c.tipoPersonal)!=="CUADRILLA"&&pdNorm(c.usuario)===pdNorm(u.usuario));
}
function pdEstadoPersonalHtml(entidad){
  if(!entidad)return '<div class="pd-note">No se encontró programación personal.</div>';
  const hoy=pdHoy(),item=pdBuscar(entidad.cuadrilla,hoy),estado=pdEstadoTecnico(pdEstadoVisible(item));
  const clase=estado==='DESCANSO'?'descanso':'campo';
  const titulo=estado==='DESCANSO'?'😴 DESCANSO':(estado==='VACACIONES'?'🏖️ VACACIONES':'🟢 EN CAMPO');
  return `<div class="pd-tech-state ${clase}"><div>ESTADO PERSONAL DE HOY</div><h2>${titulo}</h2><div>${pdEsc(new Date(hoy+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long'}))}</div></div>`;
}
function pdCalendarioPersonalHtml(entidad){
  if(!entidad)return '';
  const per=PD_DATA.periodo||pdPeriodoActual(),dias=pdDiasMes(per);
  let h='<div class="pd-card"><b>Mi programación mensual</b><div class="pd-cal-scroll" style="margin-top:8px"><table class="pd-cal"><thead><tr><th class="pd-sticky">Personal</th>';
  for(let d=1;d<=dias;d++){const f=pdFecha(per,d),domingo=pdDiaCorto(f)==='D',hoy=f===pdHoy();h+=`<th class="${domingo?'pd-sunday ':''}${hoy?'pd-current-day':''}">${pdDiaCorto(f)}<br>${d}</th>`;}
  h+='</tr></thead><tbody><tr class="pd-row-personal"><td class="pd-sticky"><div class="pd-cuadrilla-nombre">'+pdEsc(entidad.nombrePersonal||entidad.cuadrilla)+'</div><span class="pd-personal-badge">'+pdEsc(entidad.tipoPersonal||'PERSONAL')+'</span></td>';
  for(let d=1;d<=dias;d++){const f=pdFecha(per,d),est=pdEstadoTecnico(pdEstadoVisible(pdBuscar(entidad.cuadrilla,f))),cl=est==='DESCANSO'?'pd-descanso':(est==='VACACIONES'?'pd-vacaciones':'pd-campo'),domingo=pdDiaCorto(f)==='D',hoy=f===pdHoy();h+=`<td class="${domingo?'pd-sunday ':''}${hoy?'pd-current-day':''}"><button class="pd-day ${cl} ${hoy?'pd-hoy':''}" disabled>${pdEtiquetaEstado(est)}</button></td>`;}
  return h+'</tr></tbody></table></div></div>';
}
function pdRenderPersonal(){
  const ent=pdEntidadPersonalActual();
  document.getElementById('pdContenido').innerHTML=pdEstadoPersonalHtml(ent)+pdCalendarioPersonalHtml(ent);
}


function pdRenderPersonalSimple(){
  const ent=pdEntidadPersonalActual();
  const hoy=pdHoy();
  if(!ent){
    document.getElementById('pdContenido').innerHTML='<div class="pd-card"><b>Sin programación personal</b><div class="pd-note">Jefatura todavía no ha registrado su programación.</div></div>';
    return;
  }
  const itemHoy=pdBuscar(ent.cuadrilla,hoy);
  const estado=pdEstadoTecnico(pdEstadoVisible(itemHoy));
  const clase=estado==='DESCANSO'?'descanso':'campo';
  const titulo=estado==='DESCANSO'?'😴 DESCANSO':(estado==='VACACIONES'?'🏖️ VACACIONES':'🟢 EN CAMPO');
  const proximos=(PD_DATA.programacion||[])
    .filter(x=>pdNorm(x.cuadrilla)===pdNorm(ent.cuadrilla)&&x.fecha>=hoy&&pdNorm(x.estadoProgramacion)==='APROBADO')
    .filter(x=>['DESCANSO','EN CAMPO BOLSA','CAMPO BOLSA','BOLSA'].includes(pdNorm(x.estadoDia)))
    .sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const proximo=proximos[0]?.fecha||'Sin descanso programado';
  document.getElementById('pdContenido').innerHTML=`
    <div class="pd-tech-state ${clase}">
      <div>ESTADO DE HOY</div>
      <h2>${titulo}</h2>
      <div>${pdEsc(new Date(hoy+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long'}))}</div>
    </div>
    <div class="pd-card"><b>Próximo descanso:</b> ${pdEsc(proximo)}<br><span class="pd-note">La programación personal solo puede ser modificada por Jefatura.</span></div>`;
}

function pdRenderTecnico(){
  const u=pdUser(),hoy=pdHoy(),item=pdBuscar(u.cuadrilla,hoy),estadoReal=pdEstadoVisible(item),estado=pdEstadoTecnico(estadoReal),descansos=PD_DATA.programacion.filter(x=>pdNorm(x.cuadrilla)===pdNorm(u.cuadrilla)&&["DESCANSO","EN CAMPO BOLSA","CAMPO BOLSA","BOLSA"].includes(pdNorm(x.estadoDia))&&pdNorm(x.estadoProgramacion)==="APROBADO"&&x.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const proximo=descansos[0]?.fecha||"Sin descanso programado";
  const solicitudes=PD_DATA.programacion.filter(x=>pdNorm(x.cuadrilla)===pdNorm(u.cuadrilla)&&pdNorm(x.estadoProgramacion).includes("PENDIENTE"));
  document.getElementById("pdContenido").innerHTML=`
  <div class="pd-tech-state ${estado==="DESCANSO"?'descanso':'campo'}"><div>ESTADO DE HOY</div><h2>${estado==="DESCANSO"?'😴 DESCANSO':'🟢 EN CAMPO'}</h2><div>${pdEsc(new Date(hoy+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long'}))}</div></div>
  <div class="pd-card"><b>Próximo descanso:</b> ${pdEsc(proximo)}<br><span class="pd-note">La programación aplica a toda la cuadrilla.</span></div>
  ${descansos.length?`<div class="pd-request"><b>Solicitar cambio de descanso</b><div class="pd-grid2" style="margin-top:8px"><div class="pd-field"><label>Descanso actual</label><select id="pdDescansoActual">${descansos.map(x=>`<option value="${x.fecha}">${x.fecha}</option>`).join('')}</select></div><div class="pd-field"><label>Nueva fecha solicitada</label><input type="date" id="pdNuevaFecha"></div></div><div class="pd-field" style="margin-top:8px"><label>Motivo</label><textarea id="pdMotivoSolicitud" rows="2"></textarea></div><button class="pd-btn pd-orange" style="margin-top:8px" onclick="pdSolicitarCambio()">Enviar solicitud</button></div>`:''}
  ${solicitudes.length?`<div class="pd-card"><b>Solicitudes en proceso</b><div class="pd-list" style="margin-top:8px">${solicitudes.map(x=>`<div class="pd-item"><strong>${x.fecha} → ${pdEsc(x.solicitudCambio)}</strong><span class="pd-status pendiente">${pdEsc(x.estadoProgramacion)}</span><div class="pd-note">${pdEsc(x.motivoSolicitud)}</div></div>`).join('')}</div></div>`:''}`;
}

async function pdSolicitarCambio(){try{const u=pdUser();const fechaDescansoActual=document.getElementById('pdDescansoActual').value,nuevaFecha=document.getElementById('pdNuevaFecha').value,motivo=document.getElementById('pdMotivoSolicitud').value.trim();await pdApi({accion:'solicitarCambioDescanso',usuario:u.usuario,fechaDescansoActual,nuevaFecha,motivo});alert('Solicitud enviada al Supervisor.');await pdCargar();pdRenderTecnico();}catch(e){alert(e.message);}}

function pdRenderGestion(){
  const u=pdUser(),per=PD_DATA.periodo||pdPeriodoActual();
  const estadoVista=window.PD_FILTROS||{};
  const esSupervisor=u.perfil==='SUPERVISOR';const soloLectura=pdSoloLectura();
  const esJefatura=!esSupervisor&&!soloLectura;
  const sedes=esSupervisor?[u.sede]:['TODAS','CHICLAYO','PIURA','TRUJILLO'];
  const sedeSel=sedes.includes(estadoVista.sede)?estadoVista.sede:(esSupervisor?u.sede:'TODAS');
  const plataformaSel=['TODAS','INSTALACIONES','VISITA TECNICA','TRASLADOS'].includes(estadoVista.plataforma)?estadoVista.plataforma:'TODAS';
  const tipoPersonalSel=['TODAS','CUADRILLA','PERSONAL','SUPERVISOR','ALMACEN'].includes(estadoVista.tipoPersonal)?estadoVista.tipoPersonal:'TODAS';
  const estadoInformeSel=['TODOS','EN CAMPO','EN CAMPO BOLSA','DESCANSO','VACACIONES'].includes(estadoVista.estadoInforme)?estadoVista.estadoInforme:'TODOS';
  const supervisorSel=estadoVista.supervisor||'TODOS';
  const modo=['MES','RANGO','DIA'].includes(estadoVista.modo)?estadoVista.modo:'MES';
  const rango=pdRangoVisualMes(per);
  let desde=estadoVista.desde||rango.desde,hasta=estadoVista.hasta||rango.hasta;
  if(modo==='DIA'){desde=estadoVista.desde||pdHoy();hasta=desde;}
  const pendientes=soloLectura?[]:PD_DATA.programacion.filter(x=>pdNorm(x.estadoProgramacion)===(esSupervisor?'PENDIENTE SUPERVISOR':'PENDIENTE JEFATURA')||(!esSupervisor&&pdNorm(x.estadoProgramacion)==='OBSERVADO'));
  const baseHistorial=(PD_DATA.historial&&PD_DATA.historial.length?PD_DATA.historial:PD_DATA.programacion||[]);
  const historial=baseHistorial.filter(x=>esSupervisor?pdNorm(x.sede)===u.sede:true).slice(0,120);
  const alertasJefatura=esSupervisor?historial.filter(x=>pdNorm(x.origen)==='JEFATURA'&&pdNorm(x.accion)==='CAMBIO APLICADO'):[];
  const supervisores=[...new Set((PD_DATA.cuadrillas||[]).filter(c=>pdNorm(c.tipoPersonal)==='CUADRILLA').map(c=>c.supervisor).filter(Boolean))].sort();
  window.PD_FILTROS={sede:sedeSel,plataforma:plataformaSel,tipoPersonal:tipoPersonalSel,supervisor:supervisorSel,modo,desde,hasta,cuadrilla:estadoVista.cuadrilla||'TODAS',estadoInforme:estadoInformeSel};
  // El estado personal del Supervisor se muestra únicamente en el menú de inicio.
  // Dentro del módulo se conserva solo la gestión de sus cuadrillas.
  document.getElementById('pdContenido').innerHTML=`
  <div class="pd-card"><div class="pd-toolbar">
    <div class="pd-field"><label>Periodo principal</label><input type="month" id="pdPeriodo" value="${per}"></div>
    <div class="pd-field"><label>Consulta</label><select id="pdModo" onchange="pdAjustarModoFechas()"><option value="MES" ${modo==='MES'?'selected':''}>Mes visual completo</option><option value="RANGO" ${modo==='RANGO'?'selected':''}>De fecha a fecha</option><option value="DIA" ${modo==='DIA'?'selected':''}>Un día</option></select></div>
    <div class="pd-field"><label>Desde</label><input type="date" id="pdDesde" value="${desde}" ${modo==='MES'?'disabled':''}></div>
    <div class="pd-field"><label>Hasta</label><input type="date" id="pdHasta" value="${hasta}" ${modo!=='RANGO'?'disabled':''}></div>
    ${esSupervisor?'':`<div class="pd-field"><label>Sede</label><select id="pdSede">${sedes.map(x=>`<option ${x===sedeSel?'selected':''}>${x}</option>`).join('')}</select></div>`}
    ${esJefatura?`<div class="pd-field"><label>Tipo de personal</label><select id="pdTipoPersonal"><option value="TODAS" ${tipoPersonalSel==='TODAS'?'selected':''}>Todos</option><option value="CUADRILLA" ${tipoPersonalSel==='CUADRILLA'?'selected':''}>Cuadrillas</option><option value="PERSONAL" ${tipoPersonalSel==='PERSONAL'?'selected':''}>Supervisores y almacén</option><option value="SUPERVISOR" ${tipoPersonalSel==='SUPERVISOR'?'selected':''}>Supervisores</option><option value="ALMACEN" ${tipoPersonalSel==='ALMACEN'?'selected':''}>Responsables de almacén</option></select></div>`:''}
    ${esJefatura?`<div class="pd-field"><label>Supervisor</label><select id="pdSupervisor"><option value="TODOS">Todos</option>${supervisores.map(s=>`<option value="${pdEsc(s)}" ${supervisorSel===s?'selected':''}>${pdEsc(s)}</option>`).join('')}</select></div>`:''}
    <div class="pd-field"><label>Plataforma</label><select id="pdPlataforma"><option value="TODAS" ${plataformaSel==='TODAS'?'selected':''}>Todas</option><option value="INSTALACIONES" ${plataformaSel==='INSTALACIONES'?'selected':''}>Instalaciones</option><option value="VISITA TECNICA" ${plataformaSel==='VISITA TECNICA'?'selected':''}>Visita Técnica</option><option value="TRASLADOS" ${plataformaSel==='TRASLADOS'?'selected':''}>Traslados</option></select></div>
    <div class="pd-field"><label>${esJefatura?'Cuadrilla / Personal':'Cuadrilla'}</label><select id="pdCuadrilla"><option value="TODAS">Todas</option>${PD_DATA.cuadrillas.filter(c=>esSupervisor||sedeSel==='TODAS'||pdNorm(c.sede)===pdNorm(sedeSel)).map(c=>`<option value="${pdEsc(c.cuadrilla)}" ${estadoVista.cuadrilla===c.cuadrilla?'selected':''}>${pdEsc(c.nombrePersonal||c.cuadrilla)}</option>`).join('')}</select></div>
    <div class="pd-field"><label>Estado informe</label><select id="pdEstadoInforme"><option value="TODOS" ${estadoInformeSel==='TODOS'?'selected':''}>Todos</option><option value="EN CAMPO" ${estadoInformeSel==='EN CAMPO'?'selected':''}>En campo</option><option value="EN CAMPO BOLSA" ${estadoInformeSel==='EN CAMPO BOLSA'?'selected':''}>En campo bolsa</option><option value="DESCANSO" ${estadoInformeSel==='DESCANSO'?'selected':''}>Descanso</option><option value="VACACIONES" ${estadoInformeSel==='VACACIONES'?'selected':''}>Vacaciones</option></select></div>
    <button class="pd-btn pd-blue" onclick="pdCambiarVista()">Consultar</button>
    <button id="pdBtnDescargarExcel" class="pd-btn pd-green pd-report-action" onclick="pdGenerarExcelDescansos()">Descargar Excel</button>
  </div></div>
  <div id="pdAlertasOperativas" class="pd-card" style="display:none"></div>
  <div class="pd-card">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
      <div class="pd-note">Vista operativa: <b>C = En campo</b>, <b>Cᴮ = En campo bolsa</b>, <b>D = Descanso</b>, <b>V = Vacaciones</b>. Supervisores y responsables de almacén no participan en la capacidad operativa.</div>
      <button id="pdBtnGuardarCambios" class="pd-btn ${esSupervisor?'pd-orange':'pd-green'}" style="display:none" onclick="pdGuardarCambios()" ${soloLectura?'disabled':''}>${esSupervisor?'Guardar cambios y enviar a validación':'Guardar cambios'}</button>
    </div>
    <div id="pdCalendario" style="margin-top:8px"></div>
  </div>
  <div id="pdCobertura" class="pd-card">Calculando capacidad operativa...</div>
  <div id="pdConsultaDia" class="pd-card"></div>
  <div id="pdDetallePendiente" class="pd-card" style="display:none"></div>
  <div class="pd-card"><div class="pd-collapse-head"><div><span class="pd-collapse-title">${esSupervisor?'Solicitudes de técnicos pendientes de Supervisor':'Cambios pendientes de Jefatura'}</span><div class="pd-note">${pendientes.length?pendientes.length+' solicitud(es) pendiente(s).':'No hay solicitudes pendientes.'}</div></div><button type="button" class="pd-collapse-btn" data-pd-toggle="pdPendientesBody" onclick="pdTogglePanel('pdPendientesBody')">▼ Ver</button></div><div id="pdPendientesBody" class="pd-collapse-body">${(!esSupervisor&&pendientes.length)?`<div class="pd-actions" style="margin-bottom:8px"><label class="pd-select-all"><input type="checkbox" onchange="pdSeleccionarTodosPendientes(this.checked)"> Seleccionar todas</label><button class="pd-btn pd-green" onclick="pdResolverSeleccionados('APROBADO')">Aprobar seleccionados</button><button class="pd-btn pd-orange" onclick="pdResolverSeleccionados('OBSERVADO')">Observar seleccionados</button><button class="pd-btn pd-red" onclick="pdResolverSeleccionados('RECHAZADO')">Rechazar seleccionados</button></div>`:''}<div class="pd-list">${pendientes.length?pendientes.map(pdSolicitudCard).join(''):'<div class="pd-note">No hay solicitudes pendientes.</div>'}</div></div></div>
  ${esSupervisor?`<div class="pd-card"><div class="pd-collapse-head"><div><span class="pd-collapse-title">Historial de cambios aplicados por Jefatura</span><div class="pd-note">${alertasJefatura.length?alertasJefatura.length+' cambio(s) reciente(s).':'No hay cambios recientes realizados por Jefatura.'}</div></div><button type="button" class="pd-collapse-btn" data-pd-toggle="pdHistorialJefaturaBody" onclick="pdTogglePanel('pdHistorialJefaturaBody')">▼ Ver</button></div><div id="pdHistorialJefaturaBody" class="pd-collapse-body"><div class="pd-list">${alertasJefatura.length?alertasJefatura.map(pdHistorialCard).join(''):'<div class="pd-note">No hay cambios recientes realizados por Jefatura.</div>'}</div></div></div>`:''}
  <div class="pd-card"><div class="pd-collapse-head"><div><span class="pd-collapse-title">Historial de programación y cambios</span><div class="pd-note">${historial.length?historial.length+' registro(s) en el historial visible.':'Aún no hay historial registrado.'}</div></div><button type="button" class="pd-collapse-btn" data-pd-toggle="pdHistorialBody" onclick="pdTogglePanel('pdHistorialBody')">▼ Ver</button></div><div id="pdHistorialBody" class="pd-collapse-body"><div class="pd-list">${historial.length?historial.map(pdHistorialCard).join(''):'<div class="pd-note">Aún no hay historial registrado.</div>'}</div></div></div>
  `;
  pdRenderCalendario();pdCargarCobertura();pdRenderConsultaOperativa();pdActualizarBotonCambios();
}
function pdRangoVisualMes(periodo){
  const [y,m]=periodo.split("-").map(Number),inicio=new Date(y,m-1,1),fin=new Date(y,m,0),h=new Date(pdHoy()+"T12:00:00");
  let desde=new Date(inicio),hasta=new Date(fin);
  if(h.getFullYear()===y&&h.getMonth()===m-1&&h.getDate()<=10) desde=new Date(y,m-1-1,new Date(y,m-1,0).getDate()-9);
  if(h.getFullYear()===y&&h.getMonth()===m-1&&h.getDate()>fin.getDate()-7) hasta=new Date(y,m,7);
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return {desde:iso(desde),hasta:iso(hasta)};
}

function pdAjustarModoFechas(){
  const modo=document.getElementById('pdModo').value,per=document.getElementById('pdPeriodo').value,ultimo=String(pdDiasMes(per)).padStart(2,'0'),desde=document.getElementById('pdDesde'),hasta=document.getElementById('pdHasta');
  if(modo==='MES'){const r=pdRangoVisualMes(per);desde.value=r.desde;hasta.value=r.hasta;desde.disabled=true;hasta.disabled=true;}
  else if(modo==='DIA'){desde.disabled=false;hasta.disabled=true;if(!desde.value.startsWith(per))desde.value=per===pdPeriodoActual()?pdHoy():`${per}-01`;hasta.value=desde.value;}
  else{desde.disabled=false;hasta.disabled=false;if(!desde.value.startsWith(per))desde.value=`${per}-01`;if(!hasta.value.startsWith(per))hasta.value=`${per}-${ultimo}`;}
}

function pdCapturarFiltros(){
  const modo=document.getElementById('pdModo')?.value||'MES',per=document.getElementById('pdPeriodo')?.value||pdPeriodoActual();
  let desde=document.getElementById('pdDesde')?.value||`${per}-01`,hasta=document.getElementById('pdHasta')?.value||`${per}-${String(pdDiasMes(per)).padStart(2,'0')}`;
  if(modo==='MES'){const r=pdRangoVisualMes(per);desde=r.desde;hasta=r.hasta;}
  if(modo==='DIA')hasta=desde;
  if(desde>hasta){const t=desde;desde=hasta;hasta=t;}
  window.PD_FILTROS={modo,desde,hasta,sede:document.getElementById('pdSede')?.value||pdUser().sede,plataforma:document.getElementById('pdPlataforma')?.value||'TODAS',tipoPersonal:document.getElementById('pdTipoPersonal')?.value||'TODAS',supervisor:document.getElementById('pdSupervisor')?.value||'TODOS',cuadrilla:document.getElementById('pdCuadrilla')?.value||'TODAS',estadoInforme:document.getElementById('pdEstadoInforme')?.value||'TODOS'};
  return window.PD_FILTROS;
}

async function pdCambiarVista(){
  const per=document.getElementById('pdPeriodo').value;
  pdCapturarFiltros();
  await pdCargar(per);pdRenderGestion();
}

function pdCuadrillasFiltradas(){
  const f=pdCapturarFiltros();
  return PD_DATA.cuadrillas.filter(x=>{
    const tipo=pdNorm(x.tipoPersonal||'CUADRILLA');
    if(f.sede!=='TODAS'&&pdNorm(x.sede)!==pdNorm(f.sede))return false;
    if(f.tipoPersonal==='PERSONAL'&&!['SUPERVISOR','ALMACEN'].includes(tipo))return false;
    if(!['TODAS','PERSONAL'].includes(f.tipoPersonal)&&tipo!==pdNorm(f.tipoPersonal))return false;
    if(f.supervisor!=='TODOS'&&tipo==='CUADRILLA'&&pdNorm(x.supervisor)!==pdNorm(f.supervisor))return false;
    if(f.plataforma!=='TODAS'&&(tipo!=='CUADRILLA'||pdNorm(x.plataforma)!==pdNorm(f.plataforma)))return false;
    if(f.cuadrilla!=='TODAS'&&pdNorm(x.cuadrilla)!==pdNorm(f.cuadrilla))return false;
    return true;
  });
}

function pdFechasVista(){
  const f=pdCapturarFiltros(),fechas=[];
  let d=new Date(f.desde+'T12:00:00'),fin=new Date(f.hasta+'T12:00:00');
  while(d<=fin){fechas.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);d.setDate(d.getDate()+1);}
  return fechas;
}

function pdRenderCalendario(){
  const fechas=pdFechasVista(),cuadrillas=pdCuadrillasFiltradas(),f=pdCapturarFiltros(),u=pdUser();
  if(!cuadrillas.length){document.getElementById('pdCalendario').innerHTML='<div class="pd-alert">No existen registros para los filtros seleccionados.</div>';return;}
  const ordenadas=[...cuadrillas].sort((a,b)=>{
    const tipoA=pdNorm(a.tipoPersonal||'CUADRILLA'),tipoB=pdNorm(b.tipoPersonal||'CUADRILLA');
    if(tipoA!==tipoB)return tipoA.localeCompare(tipoB);
    const sedeA=pdNorm(a.sede),sedeB=pdNorm(b.sede);if(sedeA!==sedeB)return sedeA.localeCompare(sedeB);
    return pdNorm(a.nombrePersonal||a.cuadrilla).localeCompare(pdNorm(b.nombrePersonal||b.cuadrilla),undefined,{numeric:true});
  });
  let html=`<div class="pd-cal-scroll"><table class="pd-cal"><thead><tr><th class="pd-sticky">Cuadrilla / Personal</th>`;
  let mesAnt='';fechas.forEach(fecha=>{const mes=fecha.slice(0,7),cambio=mes!==mesAnt,domingo=pdDiaCorto(fecha)==='D',hoy=fecha===pdHoy();html+=`<th class="${cambio?'pd-month-label ':''}${domingo?'pd-sunday ':''}${hoy?'pd-current-day':''}">${cambio?pdNombreMes(mes).split(' ')[0]+'<br>':''}${pdDiaCorto(fecha)}<br>${Number(fecha.slice(8,10))}</th>`;mesAnt=mes;});html+='</tr></thead><tbody>';
  ordenadas.forEach(c=>{
    const tipo=pdNorm(c.tipoPersonal||'CUADRILLA'),plataforma=pdNorm(c.plataforma);
    const claseFila=tipo!=='CUADRILLA'?'pd-row-personal':(plataforma==='VISITA TECNICA'?'pd-row-visita':(plataforma==='TRASLADOS'?'pd-row-traslados':'pd-row-instalaciones'));
    const integrantes=Array.isArray(c.tecnicos)?c.tecnicos.filter(Boolean):[];
    const integrantesHtml=tipo==='CUADRILLA'&&integrantes.length?`<div class="pd-integrantes">${integrantes.map(n=>`<span>${pdEsc(n)}</span>`).join('')}</div>`:'';
    const nombre=c.nombrePersonal||c.cuadrilla;
    const badge=tipo!=='CUADRILLA'?`<span class="pd-personal-badge">${pdEsc(tipo==='ALMACEN'?'RESPONSABLE DE ALMACÉN':tipo)}</span>`:'';
    html+=`<tr class="${claseFila}"><td class="pd-sticky"><div class="pd-cuadrilla-nombre">${pdEsc(nombre)}</div>${badge}${integrantesHtml}</td>`;
    fechas.forEach(fecha=>{const key=c.cuadrilla+'|'+fecha,item=pdBuscar(c.cuadrilla,fecha),pend=pdEsPendiente(item),estado=PD_CAMBIOS[key]||(pend?pdEstadoPropuesto(item):pdEstadoVisible(item)),cl=estado==='DESCANSO'?'pd-descanso':(estado==='VACACIONES'?'pd-vacaciones':(pdEsBolsa(estado)?'pd-bolsa':'pd-campo')),domingo=pdDiaCorto(fecha)==='D',hoy=fecha===pdHoy(),detalle=pend?`${item.estadoProgramacion} · ${item.motivoSolicitud||'Sin comentario'} · ${item.solicitadoPor||''}`:(item?.estadoProgramacion||'APROBADO'),editable=!pdSoloLectura()&&(tipo==='CUADRILLA'||u.perfil!=='SUPERVISOR'),click=pend?`pdMostrarDetallePendiente('${pdEsc(item.id)}')`:(editable?`pdToggleDia('${pdEsc(c.cuadrilla)}','${fecha}',this)`:'');html+=`<td class="${domingo?'pd-sunday ':''}${hoy?'pd-current-day':''}"><button class="pd-day ${cl} ${pend?'pd-pendiente':''} ${hoy?'pd-hoy':''} ${editable?'':'pd-disabled'}" ${click?`onclick="${click}"`:'disabled'} title="${pdEsc(detalle)}">${pdEtiquetaEstado(estado)}</button></td>`;});
    html+='</tr>';
  });
  html+='</tbody></table></div>';document.getElementById('pdCalendario').innerHTML=html;
}
function pdRenderConsultaOperativa(){
  const cont=document.getElementById('pdConsultaDia');if(!cont)return;
  const f=pdCapturarFiltros(),fechas=pdFechasVista(),cuadrillas=pdCuadrillasFiltradas();
  if(fechas.length===1){
    const fecha=fechas[0],campo=[],descanso=[];
    cuadrillas.forEach(c=>{const estado=PD_CAMBIOS[c.cuadrilla+'|'+fecha]||pdEstadoVisible(pdBuscar(c.cuadrilla,fecha));(estado==='DESCANSO'?descanso:campo).push(c);});
    const lista=a=>a.length?a.map(c=>`<div>• ${pdEsc(c.cuadrilla)} <small>(${pdEsc(c.sede)} · ${pdEsc(c.plataforma)})</small></div>`).join(''):'<div class="pd-note">Ninguna cuadrilla.</div>';
    cont.innerHTML=`<b>Consulta operativa del ${pdEsc(fecha)}</b><div class="pd-summary" style="margin-top:8px"><div class="pd-kpi verde"><small>EN CAMPO</small><b>${campo.length}</b></div><div class="pd-kpi"><small>DESCANSO</small><b>${descanso.length}</b></div></div><div class="pd-query-list" style="margin-top:8px"><div class="pd-query-box"><h4>🟢 Cuadrillas en campo</h4>${lista(campo)}</div><div class="pd-query-box"><h4>😴 Cuadrillas en descanso</h4>${lista(descanso)}</div></div>`;
  }else if(f.cuadrilla!=='TODAS'){
    const descansos=fechas.filter(fecha=>(PD_CAMBIOS[f.cuadrilla+'|'+fecha]||pdEstadoVisible(pdBuscar(f.cuadrilla,fecha)))==='DESCANSO');
    cont.innerHTML=`<b>Descansos de ${pdEsc(f.cuadrilla)}</b><div class="pd-query-box" style="margin-top:8px">${descansos.length?descansos.map(x=>`<span class="pd-status descanso" style="display:inline-block;margin:3px">${pdEsc(x)}</span>`).join(''):'<span class="pd-note">No registra descansos en el periodo consultado.</span>'}</div>`;
  }else cont.innerHTML='<b>Consulta rápida</b><div class="pd-note" style="margin-top:5px">Seleccione <b>Un día</b> para ver quiénes están en campo o descanso, o seleccione una <b>cuadrilla</b> para ver sus fechas de descanso.</div>';
}

function pdToggleDia(cuadrilla,fecha,btn){const key=cuadrilla+'|'+fecha,current=PD_CAMBIOS[key]||pdEstadoVisible(pdBuscar(cuadrilla,fecha)),next=current==='EN CAMPO'?'EN CAMPO BOLSA':(pdEsBolsa(current)?'DESCANSO':(current==='DESCANSO'?'VACACIONES':'EN CAMPO')),base=pdEstadoVisible(pdBuscar(cuadrilla,fecha));if(next===base)delete PD_CAMBIOS[key];else PD_CAMBIOS[key]=next;btn.innerHTML=pdEtiquetaEstado(next);btn.classList.toggle('pd-descanso',next==='DESCANSO');btn.classList.toggle('pd-vacaciones',next==='VACACIONES');btn.classList.toggle('pd-bolsa',pdEsBolsa(next));btn.classList.toggle('pd-campo',next==='EN CAMPO');btn.classList.remove('pd-pendiente');pdActualizarBotonCambios();pdCargarCobertura();pdRenderConsultaOperativa();}

function pdReglaCobertura(plataforma,fecha){const dia=new Date(fecha+'T12:00:00').getDay(),p=pdNorm(plataforma);if(p==='INSTALACIONES'){if(dia===0)return{objetivo:.60,minimo:.60};if(dia===6)return{objetivo:.80,minimo:.80};return{objetivo:.85,minimo:.85};}if(dia===0)return{objetivo:.70,minimo:.70};if(dia===6)return{objetivo:.85,minimo:.85};return{objetivo:.90,minimo:.90};}
function pdRedondeo(v){return Math.floor(Number(v)+.5);}

function pdFechaCoberturaDiaria(){
  const fechas=pdFechasVista(),f=pdCapturarFiltros();
  if(f.modo==='DIA')return fechas[0];
  const hoy=pdHoy();
  if(fechas.includes(hoy))return hoy;
  const dentroPeriodo=fechas.find(x=>x.slice(0,7)===(document.getElementById('pdPeriodo')?.value||PD_DATA.periodo));
  return dentroPeriodo||fechas[0];
}

async function pdCargarCobertura(){
  try{
    const fechas=pdFechasVista(),fecha=pdFechaCoberturaDiaria(),cuadrillas=pdCuadrillasFiltradas().filter(c=>pdNorm(c.tipoPersonal||'CUADRILLA')==='CUADRILLA'),f=pdCapturarFiltros(),u=pdUser();
    const esSupervisor=pdNorm(u.perfil)==='SUPERVISOR';
    const plataformas=f.plataforma==='TODAS'?['INSTALACIONES','VISITA TECNICA','TRASLADOS']:[f.plataforma];

    function evaluar(plataforma,dia){
      const qs=cuadrillas.filter(c=>pdNorm(c.plataforma)===plataforma);
      const vacaciones=qs.filter(c=>(PD_CAMBIOS[c.cuadrilla+'|'+dia]||pdEstadoVisible(pdBuscar(c.cuadrilla,dia)))==='VACACIONES').length;
      const total=qs.length-vacaciones;
      if(!qs.length)return null;
      if(!total)return{plataforma,total:0,totalRegistradas:qs.length,vacaciones,campo:0,porcentaje:1,estado:'verde',aplica:false,tipo:'VACACIONES',objetivoPct:0,alerta:false};
      const campo=qs.filter(c=>(PD_CAMBIOS[c.cuadrilla+'|'+dia]||pdEstadoVisible(pdBuscar(c.cuadrilla,dia)))==='EN CAMPO').length;
      const porcentaje=campo/total,regla=pdReglaCobertura(plataforma,dia);

      if(esSupervisor&&total===1){
        return{plataforma,total,vacaciones,campo,porcentaje,estado:'verde',aplica:false,tipo:'UNA',objetivoPct:Math.round(regla.objetivo*100),alerta:false};
      }
      if(esSupervisor&&total===2){
        const alerta=campo===0;
        return{plataforma,total,vacaciones,campo,porcentaje,estado:alerta?'rojo':'verde',aplica:false,tipo:'DOS',objetivo:1,objetivoPct:Math.round(regla.objetivo*100),alerta};
      }
      if(esSupervisor&&total===3){
        const alerta=campo<2;
        const estado=alerta?'rojo':'verde';
        return{plataforma,total,vacaciones,campo,porcentaje,estado,aplica:false,tipo:'TRES',objetivo:3,minimo:2,objetivoPct:Math.round(regla.objetivo*100),alerta};
      }
      if(esSupervisor&&total===4){
        const alerta=campo<3;
        const estado=alerta?'rojo':'verde';
        return{plataforma,total,vacaciones,campo,porcentaje,estado,aplica:false,tipo:'CUATRO',objetivo:4,minimo:3,objetivoPct:Math.round(regla.objetivo*100),alerta};
      }

      const requerido=pdRedondeo(total*regla.objetivo);
      const estado=campo>=requerido?'verde':(campo===requerido-1?'amarillo':'rojo');
      return{plataforma,total,vacaciones,campo,porcentaje,estado,aplica:true,tipo:'PORCENTAJE',objetivo:requerido,objetivoPct:Math.round(regla.objetivo*100),alerta:estado!=='verde'};
    }

    const items=plataformas.map(p=>evaluar(p,fecha)).filter(Boolean);
    const alertas=[];
    plataformas.forEach(plataforma=>{
      fechas.forEach(dia=>{
        const ev=evaluar(plataforma,dia);
        if(!ev||!ev.alerta)return;
        alertas.push(Object.assign({fecha:dia},ev));
      });
    });

    const tarjetas=items.length?items.map(x=>{
      let detalle='';
      if(x.tipo==='VACACIONES')detalle='Todas las cuadrillas registradas están de vacaciones; no se genera alerta.';
      else if(!x.aplica&&x.tipo==='UNA')detalle='No aplica alerta: existe 1 sola cuadrilla operativa en esta plataforma.';
      else if(!x.aplica&&x.tipo==='DOS')detalle=x.alerta?'ALERTA: las 2 cuadrillas descansan el mismo día.':'Regla especial: las 2 cuadrillas no pueden descansar el mismo día.';
      else if(!x.aplica&&x.tipo==='TRES')detalle=x.alerta?'ALERTA: menos de 2 de 3 cuadrillas en campo.':'Cumple mínimo operativo: al menos 2 de 3 en campo.';
      else if(!x.aplica&&x.tipo==='CUATRO')detalle=x.alerta?'ALERTA: menos de 3 de 4 cuadrillas en campo.':'Cumple mínimo operativo: al menos 3 de 4 en campo.';
      else detalle=x.estado==='verde'?`Meta diaria ${x.objetivoPct}% · requerido ${x.objetivo}/${x.total}`:(x.estado==='amarillo'?`Alerta preventiva: falta 1 cuadrilla para la meta de ${x.objetivo}/${x.total}`:`ALERTA: capacidad por debajo de la meta ${x.objetivo}/${x.total}`);
      return `<div class="pd-kpi ${x.estado}"><small>${pdEsc(x.plataforma)}</small><b>${x.aplica?Math.round(x.porcentaje*100)+'%':(x.tipo==='UNA'||x.tipo==='DOS'||x.tipo==='VACACIONES'?'NO APLICA':Math.round(x.porcentaje*100)+'%')}</b><div>${x.campo}/${x.total} cuadrillas operativas en campo${x.vacaciones?' · '+x.vacaciones+' vacaciones':''}</div><small>${pdEsc(detalle)}</small></div>`;
    }).join(''):'<div class="pd-note">No hay datos para los filtros seleccionados.</div>';

    const detalleAlertas=alertas.length?`<div class="pd-alert-compact"><div class="pd-collapse-head"><div><b>⚠️ ${alertas.length} alerta(s) operativa(s) en el periodo visible</b><div class="pd-note" style="color:inherit;margin-top:3px">Incluye alertas preventivas y críticas. La alerta no bloquea el envío; Jefatura decide si procede.</div></div><button type="button" class="pd-collapse-btn" data-pd-toggle="pdAlertasDetalle" onclick="pdTogglePanel('pdAlertasDetalle')">▼ Ver</button></div><div id="pdAlertasDetalle" class="pd-alert-detail">${alertas.slice(0,30).map(a=>{if(a.tipo==='DOS')return `<div>${a.fecha} · ${pdEsc(a.plataforma)}: las 2 cuadrillas están en descanso.</div>`;if(a.tipo==='TRES')return `<div>${a.fecha} · ${pdEsc(a.plataforma)}: ${a.campo}/3 en campo. Mínimo operativo: 2.</div>`;if(a.tipo==='CUATRO')return `<div>${a.fecha} · ${pdEsc(a.plataforma)}: ${a.campo}/4 en campo. Mínimo operativo: 3.</div>`;return `<div>${a.fecha} · ${pdEsc(a.plataforma)}: ${a.campo}/${a.total} en campo (${Math.round(a.porcentaje*100)}%, meta ${a.objetivoPct}%).</div>`;}).join('')}</div></div>`:'';

    const alertasBox=document.getElementById('pdAlertasOperativas');
    if(alertasBox){
      alertasBox.innerHTML=detalleAlertas;
      alertasBox.style.display=detalleAlertas?'block':'none';
    }
    if(!cuadrillas.length){document.getElementById('pdCobertura').innerHTML='<b>Capacidad operativa diaria</b><div class="pd-note" style="margin-top:5px">No aplica para Supervisores ni Responsables de Almacén.</div>';return;}
    document.getElementById('pdCobertura').innerHTML=`<b>Capacidad operativa diaria: ${pdEsc(fecha)}${f.sede!=='TODAS'?' — '+pdEsc(f.sede):' — TODAS LAS SEDES'}</b><div class="pd-note" style="margin-top:3px">Instalaciones: L-V 85%, sábado 80%, domingo 60%. Visita Técnica y Traslados: L-V 90%, sábado 85%, domingo 70%.</div><div class="pd-kpis" style="margin-top:8px">${tarjetas}</div>`;
  }catch(e){
    const alertasBox=document.getElementById('pdAlertasOperativas');
    if(alertasBox){alertasBox.innerHTML='';alertasBox.style.display='none';}
    document.getElementById('pdCobertura').innerHTML=`<div class="pd-alert">${pdEsc(e.message)}</div>`;
  }
}

async function pdGuardarCambios(){try{const u=pdUser(),registros=Object.entries(PD_CAMBIOS).map(([k,estadoDia])=>{const i=k.lastIndexOf('|');return {cuadrilla:k.slice(0,i),fecha:k.slice(i+1),estadoDia};});if(!registros.length)return;const motivo=(prompt(u.perfil==='SUPERVISOR'?'Motivo de los cambios que se enviarán a Jefatura:':'Motivo del cambio realizado por Jefatura:')||'').trim();if(!motivo)return alert('Debe ingresar el motivo.');const r=await pdApi({accion:'guardarProgramacionDescansos',usuario:u.usuario,registros,motivo});alert(u.perfil==='SUPERVISOR'?`${r.guardados} cambio(s) enviados a validación de Jefatura.`:`${r.guardados} cambio(s) aplicados y registrados en el historial del Supervisor.`);PD_CAMBIOS={};const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}
async function pdAprobarProgramacion(){try{const u=pdUser();if(!confirm('¿Validar y aprobar las programaciones/cambios pendientes? Las alertas de capacidad quedarán aceptadas por Jefatura.'))return;const r=await pdApi({accion:'aprobarProgramacionDescansos',usuario:u.usuario,ids:[]});alert(`${r.actualizados} registros aprobados.`);const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}
function pdSolicitudCard(x){
  const u=pdUser(),solicitud=!!x.solicitudCambio,esJefatura=u.perfil!=='SUPERVISOR',checked=PD_PENDIENTES_SELECCIONADOS.has(x.id);
  return `<div class="pd-item"><div style="display:flex;gap:8px;align-items:flex-start">${esJefatura?`<input type="checkbox" class="pd-check-pendiente" ${checked?'checked':''} onchange="pdSeleccionarPendiente('${pdEsc(x.id)}',this.checked)" aria-label="Seleccionar pendiente">`:''}<div style="flex:1"><strong>${pdEsc(x.cuadrilla)} · ${pdEsc(x.sede)} · ${pdEsc(x.plataforma)}</strong><div>${solicitud?`Cambio: ${x.fecha} → ${pdEsc(x.solicitudCambio)}`:`Programación: ${x.fecha} · ${pdEsc(x.estadoNuevo||x.estadoDia)}`}</div><span class="pd-status pendiente">${pdEsc(x.estadoValidacion||x.estadoProgramacion)}</span>${x.motivoSolicitud?`<div class="pd-note">${pdEsc(x.motivoSolicitud)}</div>`:''}<div class="pd-actions"><button class="pd-btn pd-blue" onclick="pdMostrarDetallePendiente('${pdEsc(x.id)}')">Ver detalle</button>${solicitud?`<button class="pd-btn pd-green" onclick="pdValidarSolicitud('${pdEsc(x.id)}','APROBADO')">Aprobar</button><button class="pd-btn pd-red" onclick="pdValidarSolicitud('${pdEsc(x.id)}','RECHAZADO')">Rechazar</button>`:(esJefatura?`<button class="pd-btn pd-green" onclick="pdResolverProgramacion('${pdEsc(x.id)}','APROBADO')">Aprobar</button><button class="pd-btn pd-orange" onclick="pdResolverProgramacion('${pdEsc(x.id)}','OBSERVADO')">Observar</button><button class="pd-btn pd-red" onclick="pdResolverProgramacion('${pdEsc(x.id)}','RECHAZADO')">Rechazar</button>`:'')}</div></div></div></div>`;
}
function pdSeleccionarPendiente(id,marcado){if(marcado)PD_PENDIENTES_SELECCIONADOS.add(id);else PD_PENDIENTES_SELECCIONADOS.delete(id);}
async function pdResolverSeleccionados(resultado){
  const ids=[...PD_PENDIENTES_SELECCIONADOS];
  if(!ids.length)return alert('Seleccione al menos un cambio pendiente.');
  const motivo=(prompt('Comentario de Jefatura para los registros seleccionados:')||'').trim();
  if(!motivo)return alert('Debe ingresar un comentario.');
  try{
    const u=pdUser();
    const accion=resultado==='APROBADO'?'aprobarProgramacionDescansos':(resultado==='OBSERVADO'?'observarProgramacionDescansos':'rechazarProgramacionDescansos');
    const r=await pdApi({accion,usuario:u.usuario,ids,motivo});
    alert(`${r.actualizados||0} registro(s) procesado(s).`);
    PD_PENDIENTES_SELECCIONADOS.clear();
    const per=document.getElementById('pdPeriodo')?.value||PD_DATA.periodo;
    await pdCargar(per);pdRenderGestion();
  }catch(e){alert(e.message);}
}
function pdMostrarDetallePendiente(id){const x=PD_DATA.programacion.find(i=>i.id===id);const cont=document.getElementById('pdDetallePendiente');if(!x||!cont)return;const u=pdUser(),anterior=pdNorm(x.estadoAnterior||x.estadoDia||'EN CAMPO'),propuesto=pdNorm(x.estadoNuevo||x.solicitudCambio||pdEstadoPropuesto(x));cont.style.display='block';cont.innerHTML=`<b>Detalle del cambio pendiente</b><div class="pd-item" style="margin-top:8px"><strong>${pdEsc(x.cuadrilla)} · ${pdEsc(x.fecha)}</strong><div>Estado vigente: <b>${pdEsc(anterior)}</b></div><div>Estado solicitado: <b>${pdEsc(propuesto)}</b></div><div>Motivo: ${pdEsc(x.comentarioSupervisor||x.motivoSolicitud||'Sin comentario')}</div><div>Solicitado por: ${pdEsc(x.solicitadoPor||x.validadoSupervisorPor||'')}</div><div>Estado: <span class="pd-status pendiente">${pdEsc(x.estadoValidacion||x.estadoProgramacion)}</span></div>${u.perfil!=='SUPERVISOR'&&!pdSoloLectura()?`<div class="pd-actions"><button class="pd-btn pd-green" onclick="pdResolverProgramacion('${pdEsc(x.id)}','APROBADO')">Aprobar</button><button class="pd-btn pd-orange" onclick="pdResolverProgramacion('${pdEsc(x.id)}','OBSERVADO')">Observar</button><button class="pd-btn pd-red" onclick="pdResolverProgramacion('${pdEsc(x.id)}','RECHAZADO')">Rechazar</button></div>`:''}</div>`;cont.scrollIntoView({behavior:'smooth',block:'center'});}
function pdHistorialCard(x){return `<div class="pd-item"><strong>${pdEsc(x.cuadrilla||'')} · ${pdEsc(x.fechaAfectada||x.fecha||'')}</strong><div>${pdEsc(x.accion||'CAMBIO')} · ${pdEsc(x.estadoAnterior||'')} → ${pdEsc(x.estadoNuevo||'')}</div><div class="pd-note">${pdEsc(x.motivo||'Sin comentario')}</div><div class="pd-note">${pdEsc(x.usuario||'')} · ${pdEsc(x.fechaRegistro||'')} ${pdEsc(x.horaRegistro||'')}</div></div>`;}

async function pdValidarSolicitud(id,resultado){try{const u=pdUser(),motivo=prompt('Motivo / comentario:')||'';const accion=u.perfil==='SUPERVISOR'?'validarCambioDescansoSupervisor':'validarCambioDescansoJefatura';await pdApi({accion,usuario:u.usuario,id,resultado,motivo});alert('Solicitud actualizada.');const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}

async function pdResolverProgramacion(id,resultado){try{const u=pdUser(),motivo=(prompt('Comentario de Jefatura (obligatorio):')||'').trim();if(!motivo)return alert('Debe ingresar un comentario.');const accion=resultado==='APROBADO'?'aprobarProgramacionDescansos':(resultado==='OBSERVADO'?'observarProgramacionDescansos':'rechazarProgramacionDescansos');const payload={accion,usuario:u.usuario,ids:[id],motivo};const r=await pdApi(payload);alert(`${r.actualizados||0} registro(s) ${resultado==='APROBADO'?'aprobado(s)':'rechazado(s)'}.`);const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}


/* =========================
   INFORMES DE PROGRAMACIÓN DE DESCANSOS V139
   Excel: Resumen, Calendario y Detalle
========================= */
function pdReporteHtml(){
  const u=pdUser(),esSupervisor=u.perfil==='SUPERVISOR';
  const f=window.PD_FILTROS||{};
  const desde=f.desde||`${pdPeriodoActual()}-01`;
  const hasta=f.hasta||`${pdPeriodoActual()}-${String(pdDiasMes(pdPeriodoActual())).padStart(2,'0')}`;
  const sedes=['TODAS','CHICLAYO','PIURA','TRUJILLO'];
  const sedeControl=esSupervisor
    ? `<input id="pdRepSede" type="hidden" value="${pdEsc(u.sede)}"><div class="pd-field"><label>Sede</label><input value="${pdEsc(u.sede)}" disabled></div>`
    : `<div class="pd-field"><label>Sede</label><select id="pdRepSede">${sedes.map(x=>`<option value="${x}" ${(f.sede||'TODAS')===x?'selected':''}>${x==='TODAS'?'Todas':x}</option>`).join('')}</select></div>`;
  return `<div class="pd-card" id="pdInformes">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
      <div><b>Informes de Programación de Descansos</b><div class="pd-note">Genera un Excel por día, semana, mes o rango personalizado.</div></div>
      <button class="pd-btn pd-green" onclick="pdGenerarExcelDescansos()">Descargar Excel</button>
    </div>
    <div class="pd-toolbar" style="margin-top:10px">
      <div class="pd-field"><label>Desde</label><input id="pdRepDesde" type="date" value="${pdEsc(desde)}"></div>
      <div class="pd-field"><label>Hasta</label><input id="pdRepHasta" type="date" value="${pdEsc(hasta)}"></div>
      ${sedeControl}
      <div class="pd-field"><label>Plataforma</label><select id="pdRepPlataforma"><option value="TODAS">Todas</option><option value="INSTALACIONES">Instalaciones</option><option value="VISITA TECNICA">Visita Técnica</option><option value="TRASLADOS">Traslados</option></select></div>
      <div class="pd-field"><label>Tipo de personal</label><select id="pdRepTipo"><option value="TODAS">Todos</option><option value="CUADRILLA">Cuadrillas técnicas</option><option value="SUPERVISOR">Supervisores</option><option value="ALMACEN">Encargados de almacén</option></select></div>
      <div class="pd-field"><label>Estado</label><select id="pdRepEstado"><option value="TODOS">Todos</option><option value="EN CAMPO">En campo</option><option value="EN CAMPO BOLSA">En campo bolsa</option><option value="DESCANSO">Descanso</option><option value="VACACIONES">Vacaciones</option></select></div>
    </div>
    <div class="pd-note" style="margin-top:8px">El calendario del Excel mostrará el mes arriba y cada fecha como <b>LUN<br>5</b>. La cuadrilla aparecerá con su nombre completo y sus técnicos debajo.</div>
  </div>`;
}

function pdCargarXlsx(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    script.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('No se pudo iniciar el generador de Excel.'));
    script.onerror=()=>reject(new Error('No se pudo cargar la librería de Excel. Revise su conexión.'));
    document.head.appendChild(script);
  });
}

function pdMesesEntre(desde,hasta){
  const a=new Date(desde+'T12:00:00'),b=new Date(hasta+'T12:00:00'),out=[];
  let y=a.getFullYear(),m=a.getMonth();
  while(y<b.getFullYear()||(y===b.getFullYear()&&m<=b.getMonth())){
    out.push(`${y}-${String(m+1).padStart(2,'0')}`);
    m++;if(m>11){m=0;y++;}
  }
  return out;
}

async function pdDatosRangoReporte(desde,hasta){
  const u=pdUser(),meses=pdMesesEntre(desde,hasta),respuestas=[];
  for(const periodo of meses){
    respuestas.push(await pdApi({accion:'listarProgramacionDescansos',usuario:u.usuario,periodo}));
  }
  const entidadesMap=new Map(),programacionMap=new Map();
  respuestas.forEach(r=>{
    (r.cuadrillas||[]).forEach(c=>{
      const key=pdNorm(c.cuadrilla);
      if(key&&!entidadesMap.has(key)) entidadesMap.set(key,c);
    });
    (r.programacion||[]).forEach(x=>{
      if(x.fecha>=desde&&x.fecha<=hasta) programacionMap.set(pdNorm(x.cuadrilla)+'|'+x.fecha,x);
    });
  });
  return {entidades:[...entidadesMap.values()],programacion:[...programacionMap.values()]};
}

function pdFechasEntre(desde,hasta){
  const out=[],d=new Date(desde+'T12:00:00'),fin=new Date(hasta+'T12:00:00');
  while(d<=fin){
    out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    d.setDate(d.getDate()+1);
  }
  return out;
}

function pdEstadoReporte(entidad,fecha,programacion){
  const item=programacion.find(x=>pdNorm(x.cuadrilla)===pdNorm(entidad.cuadrilla)&&x.fecha===fecha);
  return pdNorm(item?.estadoDia||'EN CAMPO');
}
function pdSiglaReporte(estado){
  const e=pdNorm(estado);if(e==='DESCANSO')return 'D';if(e==='VACACIONES')return 'V';if(pdEsBolsa(e))return 'Cᴮ';return 'C';
}
function pdNombreDiaReporte(fecha){return ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(fecha+'T12:00:00').getDay()];}
function pdFechaVisibleReporte(fecha){const [y,m,d]=fecha.split('-');return `${d}/${m}/${y}`;}
function pdNombresTecnicosReporte(c){
  if(Array.isArray(c.tecnicos)&&c.tecnicos.length)return c.tecnicos.filter(Boolean).join(' / ');
  return (c.tecnicosAfectados||'').toString().split('|').map(x=>x.trim()).filter(Boolean).join(' / ');
}
function pdTituloMesReporte(desde,hasta){
  const meses=pdMesesEntre(desde,hasta).map(pdNombreMes);
  return meses.length===1?meses[0]:`${meses[0]} - ${meses[meses.length-1]}`;
}
function pdAplicarAnchos(ws,anchos){ws['!cols']=anchos.map(w=>({wch:w}));}
function pdTipoEntidadReporte(c){
  const explicito=pdNorm(c?.tipoPersonal||'');
  if(['CUADRILLA','SUPERVISOR','ALMACEN'].includes(explicito)) return explicito;
  const clave=pdNorm(c?.cuadrilla||'');
  if(!clave.startsWith('PERSONAL|')) return 'CUADRILLA';
  const perfil=pdNorm(c?.perfilPersonal||c?.perfil||c?.rol||'');
  return perfil.includes('ALMACEN')?'ALMACEN':'SUPERVISOR';
}
function pdEtiquetaEntidadReporte(c){
  return pdTipoEntidadReporte(c)==='CUADRILLA'?(c.cuadrilla||''):(c.nombrePersonal||c.cuadrilla||'');
}
function pdBordeExcel(){return {top:{style:'thin',color:{rgb:'000000'}},bottom:{style:'thin',color:{rgb:'000000'}},left:{style:'thin',color:{rgb:'000000'}},right:{style:'thin',color:{rgb:'000000'}}};}
function pdEstiloRangoExcel(ws,r1,c1,r2,c2,estilo){
  for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++){
    const ref=window.XLSX.utils.encode_cell({r,c});
    if(!ws[ref]) ws[ref]={t:'s',v:''};
    ws[ref].s=Object.assign({},ws[ref].s||{},estilo);
  }
}
function pdEstilizarCalendarioExcel(ws,fechas,entidades){
  const XLSX=window.XLSX,totalCols=1+fechas.length+4,ultimaFila=3+entidades.length,borde=pdBordeExcel();
  pdEstiloRangoExcel(ws,0,0,0,totalCols-1,{font:{bold:true,color:{rgb:'FFFFFF'},sz:16},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'left',vertical:'center'}});
  pdEstiloRangoExcel(ws,1,0,1,totalCols-1,{font:{bold:true,color:{rgb:'FFFFFF'},sz:12},fill:{fgColor:{rgb:'0F766E'}},alignment:{horizontal:'left',vertical:'center'}});
  pdEstiloRangoExcel(ws,3,0,3,totalCols-1,{font:{bold:true,color:{rgb:'000000'}},fill:{fgColor:{rgb:'B7DEE8'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:borde});
  for(let r=4;r<=ultimaFila;r++){
    pdEstiloRangoExcel(ws,r,0,r,0,{font:{bold:true,color:{rgb:'000000'}},alignment:{horizontal:'left',vertical:'center',wrapText:true},border:borde});
    for(let c=1;c<=fechas.length;c++){
      const ref=XLSX.utils.encode_cell({r,c}),v=(ws[ref]?.v||'').toString();
      let color='DCFCE7',font='166534';
      if(v==='D'){color='2563EB';font='FFFFFF';}
      else if(v==='V'){color='7C3AED';font='FFFFFF';}
      else if(v==='Cᴮ'){color='A5F3FC';font='155E75';}
      ws[ref].s={font:{bold:true,color:{rgb:font}},fill:{fgColor:{rgb:color}},alignment:{horizontal:'center',vertical:'center'},border:borde};
    }
    pdEstiloRangoExcel(ws,r,1+fechas.length,r,totalCols-1,{font:{bold:true},alignment:{horizontal:'center',vertical:'center'},border:borde});
  }
  ws['!autofilter']={ref:`A4:${XLSX.utils.encode_col(totalCols-1)}${ultimaFila+1}`};
  ws['!pageSetup']={orientation:'landscape',fitToWidth:1,fitToHeight:0,paperSize:9};
  ws['!margins']={left:0.25,right:0.25,top:0.5,bottom:0.5,header:0.2,footer:0.2};
}
function pdEstilizarResumenExcel(ws,filas){
  const borde=pdBordeExcel();
  pdEstiloRangoExcel(ws,0,0,0,1,{font:{bold:true,color:{rgb:'FFFFFF'},sz:16},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'left'}});
  pdEstiloRangoExcel(ws,1,0,1,1,{font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'0F766E'}}});
  pdEstiloRangoExcel(ws,11,0,11,1,{font:{bold:true},fill:{fgColor:{rgb:'B7DEE8'}},alignment:{horizontal:'center'},border:borde});
  for(let r=3;r<filas;r++) pdEstiloRangoExcel(ws,r,0,r,1,{border:borde,alignment:{vertical:'center',wrapText:true}});
}
function pdEstilizarDetalleExcel(ws,filas){
  const borde=pdBordeExcel();
  pdEstiloRangoExcel(ws,0,0,0,8,{font:{bold:true},fill:{fgColor:{rgb:'B7DEE8'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:borde});
  for(let r=1;r<filas;r++) pdEstiloRangoExcel(ws,r,0,r,8,{border:borde,alignment:{vertical:'center',wrapText:true}});
  ws['!freeze']={xSplit:0,ySplit:1};
}

async function pdGenerarExcelDescansos(){
  const boton=document.getElementById('pdBtnDescargarExcel');
  try{
    const f=pdCapturarFiltros();
    const desde=f.desde||'',hasta=f.hasta||'';
    if(!desde||!hasta) throw new Error('Seleccione las fechas Desde y Hasta.');
    if(desde>hasta) throw new Error('La fecha Desde no puede ser posterior a Hasta.');
    if(boton){boton.disabled=true;boton.textContent='Generando...';}
    const sede=pdNorm(f.sede||'TODAS'),plataforma=pdNorm(f.plataforma||'TODAS');
    const tipo=pdNorm(f.tipoPersonal||'TODAS'),estadoFiltro=pdNorm(f.estadoInforme||'TODOS');
    const supervisor=pdNorm(f.supervisor||'TODOS'),cuadrilla=pdNorm(f.cuadrilla||'TODAS');
    const u=pdUser(),datos=await pdDatosRangoReporte(desde,hasta),fechas=pdFechasEntre(desde,hasta);
    let entidades=datos.entidades.filter(c=>{
      const t=pdTipoEntidadReporte(c);
      if(sede!=='TODAS'&&pdNorm(c.sede)!==sede)return false;
      if(tipo==='PERSONAL'&&!['SUPERVISOR','ALMACEN'].includes(t))return false;
      if(!['TODAS','PERSONAL'].includes(tipo)&&t!==tipo)return false;
      if(plataforma!=='TODAS'&&(t!=='CUADRILLA'||pdNorm(c.plataforma)!==plataforma))return false;
      if(supervisor!=='TODOS'&&t==='CUADRILLA'&&pdNorm(c.supervisor)!==supervisor)return false;
      if(cuadrilla!=='TODAS'&&pdNorm(c.cuadrilla)!==cuadrilla)return false;
      return true;
    });
    if(estadoFiltro!=='TODOS') entidades=entidades.filter(c=>fechas.some(fecha=>pdEstadoReporte(c,fecha,datos.programacion)===estadoFiltro));
    if(!entidades.length) throw new Error('No existen registros para los filtros seleccionados.');
    entidades.sort((a,b)=>pdNorm(a.sede).localeCompare(pdNorm(b.sede))||pdTipoEntidadReporte(a).localeCompare(pdTipoEntidadReporte(b))||pdNorm(a.plataforma).localeCompare(pdNorm(b.plataforma))||pdNorm(pdEtiquetaEntidadReporte(a)).localeCompare(pdNorm(pdEtiquetaEntidadReporte(b)),undefined,{numeric:true}));

    const conteo={campo:0,bolsa:0,descanso:0,vacaciones:0};
    const detalle=[['FECHA','DÍA','SEDE','PLATAFORMA','CUADRILLA / PERSONAL','TÉCNICOS','ESTADO','SUPERVISOR','TIPO DE PERSONAL']];
    entidades.forEach(c=>fechas.forEach(fecha=>{
      const e=pdEstadoReporte(c,fecha,datos.programacion);
      if(estadoFiltro!=='TODOS'&&e!==estadoFiltro)return;
      if(e==='DESCANSO')conteo.descanso++;else if(e==='VACACIONES')conteo.vacaciones++;else if(pdEsBolsa(e))conteo.bolsa++;else conteo.campo++;
      detalle.push([pdFechaVisibleReporte(fecha),pdNombreDiaReporte(fecha),c.sede||'',pdTipoEntidadReporte(c)==='CUADRILLA'?(c.plataforma||''):'',pdEtiquetaEntidadReporte(c),pdTipoEntidadReporte(c)==='CUADRILLA'?pdNombresTecnicosReporte(c):'',e,c.supervisor||'',pdTipoEntidadReporte(c)]);
    }));

    const tituloMes=pdTituloMesReporte(desde,hasta);
    const resumen=[
      ['PROGRAMACIÓN DE DESCANSOS'],[`MES: ${tituloMes}`],[],
      ['Período',`${pdFechaVisibleReporte(desde)} - ${pdFechaVisibleReporte(hasta)}`],
      ['Sede',sede==='TODAS'?'TODAS':sede],['Plataforma',plataforma==='TODAS'?'TODAS':plataforma],
      ['Tipo de personal',tipo==='TODAS'?'TODOS':tipo],['Estado',estadoFiltro==='TODOS'?'TODOS':estadoFiltro],
      ['Generado por',localStorage.getItem('nombresApellidos')||u.usuario],['Fecha y hora',new Date().toLocaleString('es-PE')],[],
      ['INDICADOR','TOTAL'],['En campo',conteo.campo],['En campo bolsa',conteo.bolsa],['Descanso',conteo.descanso],['Vacaciones',conteo.vacaciones],['Registros incluidos',detalle.length-1]
    ];

    const calendario=[['PROGRAMACIÓN DE DESCANSOS'],[`MES: ${tituloMes}`],[],['CUADRILLA / PERSONAL',...fechas.map(fecha=>`${pdNombreDiaReporte(fecha)}\n${Number(fecha.slice(8,10))}`),'CAMPO','CAMPO BOLSA','DESCANSO','VACACIONES']];
    entidades.forEach(c=>{
      let ca=0,bo=0,de=0,va=0;
      const estados=fechas.map(fecha=>{const e=pdEstadoReporte(c,fecha,datos.programacion);if(e==='DESCANSO')de++;else if(e==='VACACIONES')va++;else if(pdEsBolsa(e))bo++;else ca++;return pdSiglaReporte(e);});
      const tecnicos=pdTipoEntidadReporte(c)==='CUADRILLA'?pdNombresTecnicosReporte(c):'';
      const nombre=pdEtiquetaEntidadReporte(c);
      calendario.push([`${nombre}${tecnicos?'\n'+tecnicos:''}`,...estados,ca,bo,de,va]);
    });

    const XLSX=await pdCargarXlsx(),wb=XLSX.utils.book_new();
    const wsResumen=XLSX.utils.aoa_to_sheet(resumen);
    wsResumen['!merges']=[XLSX.utils.decode_range('A1:B1'),XLSX.utils.decode_range('A2:B2')];
    pdAplicarAnchos(wsResumen,[28,48]);pdEstilizarResumenExcel(wsResumen,resumen.length);
    XLSX.utils.book_append_sheet(wb,wsResumen,'RESUMEN');

    const wsCalendario=XLSX.utils.aoa_to_sheet(calendario),totalCols=1+fechas.length+4;
    wsCalendario['!merges']=[{s:{r:0,c:0},e:{r:0,c:totalCols-1}},{s:{r:1,c:0},e:{r:1,c:totalCols-1}}];
    wsCalendario['!cols']=[{wch:58},...fechas.map(()=>({wch:7})),{wch:11},{wch:14},{wch:11},{wch:12}];
    wsCalendario['!rows']=[{hpt:28},{hpt:24},{hpt:8},{hpt:38},...entidades.map(()=>({hpt:42}))];
    wsCalendario['!freeze']={xSplit:1,ySplit:4};pdEstilizarCalendarioExcel(wsCalendario,fechas,entidades);
    XLSX.utils.book_append_sheet(wb,wsCalendario,'CALENDARIO');

    const wsDetalle=XLSX.utils.aoa_to_sheet(detalle);
    wsDetalle['!autofilter']={ref:`A1:I${detalle.length}`};pdAplicarAnchos(wsDetalle,[13,8,13,20,48,42,20,20,20]);pdEstilizarDetalleExcel(wsDetalle,detalle.length);
    XLSX.utils.book_append_sheet(wb,wsDetalle,'DETALLE');

    XLSX.writeFile(wb,`PROGRAMACION_DESCANSOS_${desde.replaceAll('-','')}_${hasta.replaceAll('-','')}.xlsx`);
  }catch(e){alert(e.message||e);}
  finally{if(boton){boton.disabled=false;boton.textContent='Descargar Excel';}}
}

