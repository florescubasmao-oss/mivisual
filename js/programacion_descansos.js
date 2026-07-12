// MI VISUAL - Programación de Descansos V107
const API_DESCANSOS = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";
let PD_DATA={programacion:[],cuadrillas:[]};
let PD_CAMBIOS={};

function pdNorm(v){return (v||"").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function pdUser(){return {usuario:localStorage.getItem("usuario")||"",perfil:pdNorm(localStorage.getItem("perfil")),sede:pdNorm(localStorage.getItem("sede")),cuadrilla:localStorage.getItem("cuadrilla")||""};}
function pdEsc(v){return (v??"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
async function pdApi(payload){const r=await fetch(API_DESCANSOS,{method:"POST",body:JSON.stringify(payload)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Error en Programación de Descansos");return d;}
function pdHoy(){const d=new Date(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${d.getFullYear()}-${m}-${day}`;}
function pdPeriodoActual(){return pdHoy().slice(0,7);}
function pdDiasMes(periodo){const [y,m]=periodo.split("-").map(Number);return new Date(y,m,0).getDate();}
function pdFecha(periodo,dia){return `${periodo}-${String(dia).padStart(2,"0")}`;}
function pdNombreMes(periodo){const [y,m]=periodo.split("-").map(Number);return new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric"}).format(new Date(y,m-1,1)).toUpperCase();}
function pdDiaCorto(fecha){return ["D","L","M","M","J","V","S"][new Date(fecha+"T12:00:00").getDay()];}
function pdEstadoVisible(item){if(!item)return "EN CAMPO";return pdNorm(item.estadoProgramacion)==="APROBADO"?pdNorm(item.estadoDia||"EN CAMPO"):"EN CAMPO";}
function pdBuscar(cuadrilla,fecha){return PD_DATA.programacion.find(x=>pdNorm(x.cuadrilla)===pdNorm(cuadrilla)&&x.fecha===fecha);}
function pdStyle(){return `<style>
.pd-wrap{max-width:1200px;margin:auto;padding:10px;color:#0f172a}.pd-head{background:linear-gradient(135deg,#1d4ed8,#0f766e);color:#fff;border-radius:18px;padding:16px;margin-bottom:11px}.pd-head h2{margin:0 0 4px;font-size:22px}.pd-head p{margin:0;font-size:12px;opacity:.9}.pd-card{background:#fff;border:1px solid #dbe4ef;border-radius:15px;padding:12px;margin-bottom:10px;box-shadow:0 5px 14px rgba(15,23,42,.08)}.pd-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.pd-field label{display:block;font-size:11px;font-weight:900;color:#334155;margin-bottom:4px}.pd-field input,.pd-field select,.pd-field textarea{border:1px solid #cbd5e1;border-radius:9px;padding:8px;background:#fff;color:#0f172a}.pd-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}.pd-blue{background:#2563eb;color:#fff}.pd-green{background:#16a34a;color:#fff}.pd-orange{background:#f59e0b;color:#111827}.pd-red{background:#dc2626;color:#fff}.pd-gray{background:#64748b;color:#fff}.pd-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pd-kpi{border:2px solid #cbd5e1;border-radius:13px;padding:10px;background:#f8fafc}.pd-kpi b{display:block;font-size:20px}.pd-kpi small{font-size:10px;font-weight:900}.pd-kpi.verde{background:#ecfdf5;border-color:#22c55e;color:#166534}.pd-kpi.amarillo{background:#fffbeb;border-color:#f59e0b;color:#92400e}.pd-kpi.rojo{background:#fef2f2;border-color:#ef4444;color:#991b1b}.pd-cal-scroll{overflow:auto;border:1px solid #dbe4ef;border-radius:12px}.pd-cal{border-collapse:separate;border-spacing:0;min-width:1000px;width:100%;font-size:10px}.pd-cal th,.pd-cal td{border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;text-align:center;padding:4px}.pd-cal th{position:sticky;top:0;background:#eff6ff;color:#1e3a8a;z-index:2}.pd-cal .pd-sticky{position:sticky;left:0;background:#fff;z-index:3;text-align:left;min-width:220px;font-weight:900}.pd-day{width:28px;height:28px;border:0;border-radius:7px;font-size:10px;font-weight:900;cursor:pointer}.pd-campo{background:#dcfce7;color:#166534}.pd-descanso{background:#e5e7eb;color:#374151}.pd-pendiente{outline:2px solid #f59e0b}.pd-hoy{box-shadow:inset 0 0 0 2px #2563eb}.pd-group{background:#dbeafe!important;color:#1e3a8a!important;font-weight:900;text-align:left!important}.pd-status{font-size:10px;padding:4px 7px;border-radius:999px;font-weight:900}.pd-status.campo{background:#dcfce7;color:#166534}.pd-status.descanso{background:#e5e7eb;color:#374151}.pd-status.pendiente{background:#fef3c7;color:#92400e}.pd-tech-state{padding:20px;border-radius:18px;text-align:center}.pd-tech-state.campo{background:#dcfce7;border:3px solid #22c55e;color:#166534}.pd-tech-state.descanso{background:#f1f5f9;border:3px solid #94a3b8;color:#334155}.pd-tech-state h2{font-size:28px;margin:5px 0}.pd-request{border:2px solid #f59e0b;background:#fff7ed;border-radius:13px;padding:11px;margin-top:10px}.pd-list{display:grid;gap:8px}.pd-item{border:1px solid #dbe4ef;border-radius:12px;padding:10px;background:#fff}.pd-item strong{display:block;margin-bottom:4px}.pd-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.pd-note{font-size:11px;color:#64748b;line-height:1.4}.pd-alert{background:#fff7ed;border:2px solid #fb923c;color:#9a3412;border-radius:12px;padding:10px;font-size:12px;font-weight:800}.pd-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}@media(max-width:700px){.pd-wrap{padding:6px}.pd-kpis{grid-template-columns:1fr}.pd-grid2{grid-template-columns:1fr}.pd-head h2{font-size:19px}.pd-cal .pd-sticky{min-width:170px}}
</style>`;}


async function actualizarIndicadorDescansoMenu(){
  const u=pdUser();
  const welcome=document.getElementById("mv55Welcome");
  if(!welcome) return;

  let indicador=document.getElementById("pdEstadoMenu");
  if(u.perfil!=="TECNICO"){
    if(indicador) indicador.remove();
    return;
  }

  if(!indicador){
    indicador=document.createElement("button");
    indicador.id="pdEstadoMenu";
    indicador.type="button";
    indicador.className="pd-menu-status cargando";
    indicador.onclick=mostrarProgramacionDescansos;
    welcome.appendChild(indicador);
  }

  indicador.className="pd-menu-status cargando";
  indicador.innerHTML='<span class="pd-menu-dot"></span><strong>CONSULTANDO ESTADO...</strong>';

  try{
    const data=await pdApi({accion:"listarProgramacionDescansos",usuario:u.usuario,periodo:pdPeriodoActual()});
    const item=(data.programacion||[]).find(x=>pdNorm(x.cuadrilla)===pdNorm(u.cuadrilla)&&x.fecha===pdHoy());
    const estado=pdEstadoVisible(item);
    const descanso=estado==="DESCANSO";
    indicador.className="pd-menu-status "+(descanso?"descanso":"campo");
    indicador.innerHTML=`<span class="pd-menu-dot"></span><strong>${descanso?'DESCANSO':'EN CAMPO'}</strong><small>Ver programación</small>`;
  }catch(e){
    indicador.className="pd-menu-status campo";
    indicador.innerHTML='<span class="pd-menu-dot"></span><strong>EN CAMPO</strong><small>Ver programación</small>';
  }
}

async function mostrarProgramacionDescansos(){
  const u=pdUser();
  if(["ALMACEN","JEFATURA ALMACEN"].includes(u.perfil)) return alert("Esta opción no está habilitada para perfiles de Almacén.");
  limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");
  if(menu) menu.style.setProperty("display","none","important");
  setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");
  pantalla.innerHTML=pdStyle()+`<div class="pd-wrap"><div class="pd-head"><h2>📅 Programación de Descansos</h2><p>Planificación por cuadrilla. No corresponde a control de asistencia.</p></div><div id="pdContenido"><div class="pd-card">Cargando...</div></div></div>`;
  try{await pdCargar();pdRender();}catch(e){document.getElementById("pdContenido").innerHTML=`<div class="pd-alert">${pdEsc(e.message)}</div>`;}
}

async function pdCargar(periodo){
  const u=pdUser();const per=periodo||document.getElementById("pdPeriodo")?.value||pdPeriodoActual();
  PD_DATA=await pdApi({accion:"listarProgramacionDescansos",usuario:u.usuario,periodo:per});
  PD_CAMBIOS={};
}

function pdRender(){const u=pdUser();if(u.perfil==="TECNICO")pdRenderTecnico();else pdRenderGestion();}

function pdRenderTecnico(){
  const u=pdUser(),hoy=pdHoy(),item=pdBuscar(u.cuadrilla,hoy),estado=pdEstadoVisible(item),descansos=PD_DATA.programacion.filter(x=>pdNorm(x.cuadrilla)===pdNorm(u.cuadrilla)&&pdNorm(x.estadoDia)==="DESCANSO"&&pdNorm(x.estadoProgramacion)==="APROBADO"&&x.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
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
  const esSupervisor=u.perfil==='SUPERVISOR';
  const sedes=esSupervisor?[u.sede]:['TODAS','CHICLAYO','PIURA','TRUJILLO'];
  const sedeSel=sedes.includes(estadoVista.sede)?estadoVista.sede:(esSupervisor?u.sede:'TODAS');
  const plataformaSel=['TODAS','INSTALACIONES','VISITA TECNICA','TRASLADOS'].includes(estadoVista.plataforma)?estadoVista.plataforma:'TODAS';
  const modo=['MES','RANGO','DIA'].includes(estadoVista.modo)?estadoVista.modo:'MES';
  const ultimo=String(pdDiasMes(per)).padStart(2,'0');
  let desde=estadoVista.desde&&estadoVista.desde.startsWith(per)?estadoVista.desde:`${per}-01`;
  let hasta=estadoVista.hasta&&estadoVista.hasta.startsWith(per)?estadoVista.hasta:`${per}-${ultimo}`;
  if(modo==='DIA'){desde=estadoVista.desde&&estadoVista.desde.startsWith(per)?estadoVista.desde:(per===pdPeriodoActual()?pdHoy():`${per}-01`);hasta=desde;}
  const pendientes=PD_DATA.programacion.filter(x=>pdNorm(x.estadoProgramacion)===(esSupervisor?'PENDIENTE SUPERVISOR':'PENDIENTE JEFATURA'));
  window.PD_FILTROS={sede:sedeSel,plataforma:plataformaSel,modo,desde,hasta};
  document.getElementById('pdContenido').innerHTML=`
  <div class="pd-card"><div class="pd-toolbar">
    <div class="pd-field"><label>Periodo</label><input type="month" id="pdPeriodo" value="${per}"></div>
    <div class="pd-field"><label>Vista</label><select id="pdModo" onchange="pdAjustarModoFechas()"><option value="MES" ${modo==='MES'?'selected':''}>Mes completo</option><option value="RANGO" ${modo==='RANGO'?'selected':''}>De fecha a fecha</option><option value="DIA" ${modo==='DIA'?'selected':''}>Un día</option></select></div>
    <div class="pd-field"><label>Desde</label><input type="date" id="pdDesde" value="${desde}" ${modo==='MES'?'disabled':''}></div>
    <div class="pd-field"><label>Hasta</label><input type="date" id="pdHasta" value="${hasta}" ${modo!=='RANGO'?'disabled':''}></div>
    ${esSupervisor?`<div class="pd-field"><label>Sede</label><select id="pdSede" disabled><option>${pdEsc(u.sede)}</option></select></div>`:`<div class="pd-field"><label>Sede</label><select id="pdSede">${sedes.map(s=>`<option ${s===sedeSel?'selected':''}>${s}</option>`).join('')}</select></div>`}
    <div class="pd-field"><label>Plataforma</label><select id="pdPlataforma"><option value="TODAS" ${plataformaSel==='TODAS'?'selected':''}>Todas</option><option value="INSTALACIONES" ${plataformaSel==='INSTALACIONES'?'selected':''}>Instalaciones</option><option value="VISITA TECNICA" ${plataformaSel==='VISITA TECNICA'?'selected':''}>Visita Técnica</option><option value="TRASLADOS" ${plataformaSel==='TRASLADOS'?'selected':''}>Traslados</option></select></div>
    <button class="pd-btn pd-blue" onclick="pdCambiarVista()">Actualizar</button>
    ${esSupervisor?'<button class="pd-btn pd-orange" onclick="pdGuardarCambios()">Enviar programación a Jefatura</button>':'<button class="pd-btn pd-green" onclick="pdGuardarCambios()">Guardar programación</button><button class="pd-btn pd-blue" onclick="pdAprobarProgramacion()">Aprobar pendientes</button>'}
  </div></div>
  <div id="pdCobertura" class="pd-card">Calculando cobertura...</div>
  <div class="pd-card"><div class="pd-note">Haz clic en cada día para cambiar entre <b>En campo</b> y <b>Descanso</b>. Los filtros solo cambian la visualización; no eliminan información.</div><div id="pdCalendario" style="margin-top:8px"></div></div>
  <div class="pd-card"><b>${esSupervisor?'Solicitudes pendientes de Supervisor':'Solicitudes y programaciones pendientes de Jefatura'}</b><div class="pd-list" style="margin-top:8px">${pendientes.length?pendientes.map(pdSolicitudCard).join(''):'<div class="pd-note">No hay solicitudes pendientes.</div>'}</div></div>`;
  pdRenderCalendario();pdCargarCobertura();
}

function pdAjustarModoFechas(){
  const modo=document.getElementById('pdModo').value,per=document.getElementById('pdPeriodo').value,ultimo=String(pdDiasMes(per)).padStart(2,'0'),desde=document.getElementById('pdDesde'),hasta=document.getElementById('pdHasta');
  if(modo==='MES'){desde.value=`${per}-01`;hasta.value=`${per}-${ultimo}`;desde.disabled=true;hasta.disabled=true;}
  else if(modo==='DIA'){desde.disabled=false;hasta.disabled=true;if(!desde.value.startsWith(per))desde.value=per===pdPeriodoActual()?pdHoy():`${per}-01`;hasta.value=desde.value;}
  else{desde.disabled=false;hasta.disabled=false;if(!desde.value.startsWith(per))desde.value=`${per}-01`;if(!hasta.value.startsWith(per))hasta.value=`${per}-${ultimo}`;}
}

function pdCapturarFiltros(){
  const modo=document.getElementById('pdModo')?.value||'MES',per=document.getElementById('pdPeriodo')?.value||pdPeriodoActual();
  let desde=document.getElementById('pdDesde')?.value||`${per}-01`,hasta=document.getElementById('pdHasta')?.value||`${per}-${String(pdDiasMes(per)).padStart(2,'0')}`;
  if(modo==='MES'){desde=`${per}-01`;hasta=`${per}-${String(pdDiasMes(per)).padStart(2,'0')}`;}
  if(modo==='DIA')hasta=desde;
  if(desde>hasta){const t=desde;desde=hasta;hasta=t;}
  window.PD_FILTROS={modo,desde,hasta,sede:document.getElementById('pdSede')?.value||pdUser().sede,plataforma:document.getElementById('pdPlataforma')?.value||'TODAS'};
  return window.PD_FILTROS;
}

async function pdCambiarVista(){
  const per=document.getElementById('pdPeriodo').value;
  pdCapturarFiltros();
  if(!window.PD_FILTROS.desde.startsWith(per)||!window.PD_FILTROS.hasta.startsWith(per)){
    window.PD_FILTROS.desde=`${per}-01`;window.PD_FILTROS.hasta=`${per}-${String(pdDiasMes(per)).padStart(2,'0')}`;
  }
  await pdCargar(per);pdRenderGestion();
}

function pdCuadrillasFiltradas(){
  const f=pdCapturarFiltros();
  return PD_DATA.cuadrillas.filter(x=>(f.sede==='TODAS'||pdNorm(x.sede)===pdNorm(f.sede))&&(f.plataforma==='TODAS'||pdNorm(x.plataforma)===pdNorm(f.plataforma)));
}

function pdFechasVista(){
  const f=pdCapturarFiltros(),fechas=[];
  let d=new Date(f.desde+'T12:00:00'),fin=new Date(f.hasta+'T12:00:00');
  while(d<=fin){fechas.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);d.setDate(d.getDate()+1);}
  return fechas;
}

function pdRenderCalendario(){
  const fechas=pdFechasVista(),cuadrillas=pdCuadrillasFiltradas(),f=pdCapturarFiltros();
  if(!cuadrillas.length){document.getElementById('pdCalendario').innerHTML='<div class="pd-alert">No existen cuadrillas para los filtros seleccionados.</div>';return;}
  let html=`<div class="pd-cal-scroll"><table class="pd-cal"><thead><tr><th class="pd-sticky">Cuadrilla / Plataforma</th>`;
  fechas.forEach(fecha=>{html+=`<th>${pdDiaCorto(fecha)}<br>${Number(fecha.slice(8,10))}</th>`;});html+='</tr></thead><tbody>';
  const sedes=f.sede==='TODAS'?['CHICLAYO','PIURA','TRUJILLO']:[f.sede];
  sedes.forEach(sede=>['INSTALACIONES','VISITA TECNICA','TRASLADOS'].forEach(p=>{
    if(f.plataforma!=='TODAS'&&p!==f.plataforma)return;
    const grupo=cuadrillas.filter(x=>pdNorm(x.sede)===pdNorm(sede)&&pdNorm(x.plataforma)===p);if(!grupo.length)return;
    html+=`<tr><td class="pd-group" colspan="${fechas.length+1}">${f.sede==='TODAS'?pdEsc(sede)+' — ':''}${p}</td></tr>`;
    grupo.forEach(c=>{html+=`<tr><td class="pd-sticky">${pdEsc(c.cuadrilla)}<br><small>${pdEsc(c.tecnico||'')}</small></td>`;fechas.forEach(fecha=>{const key=c.cuadrilla+'|'+fecha,item=pdBuscar(c.cuadrilla,fecha),estado=PD_CAMBIOS[key]||pdEstadoVisible(item),pend=item&&pdNorm(item.estadoProgramacion)!=='APROBADO',cl=estado==='DESCANSO'?'pd-descanso':'pd-campo';html+=`<td><button class="pd-day ${cl} ${pend?'pd-pendiente':''} ${fecha===pdHoy()?'pd-hoy':''}" onclick="pdToggleDia('${pdEsc(c.cuadrilla)}','${fecha}',this)" title="${pdEsc(item?.estadoProgramacion||'APROBADO')}">${estado==='DESCANSO'?'D':'C'}</button></td>`;});html+='</tr>';});
  }));
  html+='</tbody></table></div>';document.getElementById('pdCalendario').innerHTML=html;
}

function pdToggleDia(cuadrilla,fecha,btn){const key=cuadrilla+'|'+fecha,current=PD_CAMBIOS[key]||pdEstadoVisible(pdBuscar(cuadrilla,fecha)),next=current==='DESCANSO'?'EN CAMPO':'DESCANSO';PD_CAMBIOS[key]=next;btn.textContent=next==='DESCANSO'?'D':'C';btn.classList.toggle('pd-descanso',next==='DESCANSO');btn.classList.toggle('pd-campo',next!=='DESCANSO');btn.classList.remove('pd-pendiente');pdCargarCobertura();}

function pdReglaCobertura(plataforma,fecha){const domingo=new Date(fecha+'T12:00:00').getDay()===0,p=pdNorm(plataforma);if(domingo&&p==='INSTALACIONES')return{objetivo:.60,minimo:.60};if(domingo)return{objetivo:.70,minimo:.60};return{objetivo:.90,minimo:.80};}
function pdRedondeo(v){return Math.floor(Number(v)+.5);}

async function pdCargarCobertura(){
  try{
    const fechas=pdFechasVista(),cuadrillas=pdCuadrillasFiltradas(),f=pdCapturarFiltros();
    const plataformas=f.plataforma==='TODAS'?['INSTALACIONES','VISITA TECNICA','TRASLADOS']:[f.plataforma];
    const items=plataformas.map(plataforma=>{
      const qs=cuadrillas.filter(c=>pdNorm(c.plataforma)===plataforma);let totalJornadas=0,campoJornadas=0,objJornadas=0,minJornadas=0,diasCumple=0,diasConCuadrillas=0;
      fechas.forEach(fecha=>{const total=qs.length;if(!total)return;diasConCuadrillas++;let campo=0;qs.forEach(c=>{const key=c.cuadrilla+'|'+fecha,estado=PD_CAMBIOS[key]||pdEstadoVisible(pdBuscar(c.cuadrilla,fecha));if(estado!=='DESCANSO')campo++;});const regla=pdReglaCobertura(plataforma,fecha),obj=pdRedondeo(total*regla.objetivo),min=pdRedondeo(total*regla.minimo);totalJornadas+=total;campoJornadas+=campo;objJornadas+=obj;minJornadas+=min;if(campo>=obj)diasCumple++;});
      const porcentaje=totalJornadas?campoJornadas/totalJornadas:0;let estado='rojo';if(campoJornadas>=objJornadas)estado='verde';else if(campoJornadas>=minJornadas)estado='amarillo';return{plataforma,totalJornadas,campoJornadas,porcentaje,estado,diasCumple,diasConCuadrillas};
    }).filter(x=>x.totalJornadas>0);
    const etiqueta=fechas.length===1?fechas[0]:`${fechas[0]} al ${fechas[fechas.length-1]}`;
    document.getElementById('pdCobertura').innerHTML=`<b>Cobertura: ${pdEsc(etiqueta)}${f.sede!=='TODAS'?' — '+pdEsc(f.sede):' — TODAS LAS SEDES'}</b><div class="pd-kpis" style="margin-top:8px">${items.length?items.map(x=>`<div class="pd-kpi ${x.estado}"><small>${pdEsc(x.plataforma)}</small><b>${Math.round(x.porcentaje*100)}%</b><div>${x.campoJornadas}/${x.totalJornadas} cuadrillas-día en campo</div><small>Días que cumplen objetivo: ${x.diasCumple}/${x.diasConCuadrillas}</small></div>`).join(''):'<div class="pd-note">No hay datos para los filtros seleccionados.</div>'}</div>`;
  }catch(e){document.getElementById('pdCobertura').innerHTML=`<div class="pd-alert">${pdEsc(e.message)}</div>`;}
}

async function pdGuardarCambios(){try{const u=pdUser(),registros=Object.entries(PD_CAMBIOS).map(([k,estadoDia])=>{const i=k.lastIndexOf('|');return {cuadrilla:k.slice(0,i),fecha:k.slice(i+1),estadoDia};});if(!registros.length)return alert('No hay cambios para guardar.');const r=await pdApi({accion:'guardarProgramacionDescansos',usuario:u.usuario,registros});alert(`${r.guardados} registros guardados. Estado: ${r.estado}`);const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}
async function pdAprobarProgramacion(){try{const u=pdUser();if(!confirm('¿Aprobar todas las programaciones pendientes de Jefatura?'))return;const r=await pdApi({accion:'aprobarProgramacionDescansos',usuario:u.usuario,ids:[]});alert(`${r.actualizados} registros aprobados.`);const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}
function pdSolicitudCard(x){const u=pdUser(),solicitud=!!x.solicitudCambio;return `<div class="pd-item"><strong>${pdEsc(x.cuadrilla)} · ${pdEsc(x.sede)} · ${pdEsc(x.plataforma)}</strong><div>${solicitud?`Cambio: ${x.fecha} → ${pdEsc(x.solicitudCambio)}`:`Programación: ${x.fecha} · ${pdEsc(x.estadoDia)}`}</div><span class="pd-status pendiente">${pdEsc(x.estadoProgramacion)}</span>${x.motivoSolicitud?`<div class="pd-note">${pdEsc(x.motivoSolicitud)}</div>`:''}${solicitud?`<div class="pd-actions"><button class="pd-btn pd-green" onclick="pdValidarSolicitud('${pdEsc(x.id)}','APROBADO')">Aprobar</button><button class="pd-btn pd-red" onclick="pdValidarSolicitud('${pdEsc(x.id)}','RECHAZADO')">Rechazar</button></div>`:''}</div>`;}
async function pdValidarSolicitud(id,resultado){try{const u=pdUser(),motivo=prompt('Motivo / comentario:')||'';const accion=u.perfil==='SUPERVISOR'?'validarCambioDescansoSupervisor':'validarCambioDescansoJefatura';await pdApi({accion,usuario:u.usuario,id,resultado,motivo});alert('Solicitud actualizada.');const per=document.getElementById('pdPeriodo').value;pdCapturarFiltros();await pdCargar(per);pdRenderGestion();}catch(e){alert(e.message);}}
