// MI VISUAL V268 - Equipos Averiados: indicadores visibles y encabezado por fecha/cuadrilla.
const API_EQUIPOS_AVERIADOS = "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";

const EA_STATE = {catalogos:null, solicitudes:[], cargos:[], resumen:{}, formularioId:""};

function eaNorm(v){return (v||"").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function eaEsc(v){return (v===null||v===undefined?"":v.toString()).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function eaUsuario(){return {usuario:localStorage.getItem("usuario")||"",perfil:eaNorm(localStorage.getItem("perfil")),sede:eaNorm(localStorage.getItem("sede")),cuadrilla:localStorage.getItem("cuadrilla")||"",plataforma:localStorage.getItem("plataforma")||"",nombres:localStorage.getItem("nombresApellidos")||localStorage.getItem("usuario")||""};}
function eaEsTecnico(p){return eaNorm(p)==="TECNICO";}
function eaEsAlmacen(p){return ["ALMACEN","RESPONSABLE ALMACEN","RESPONSABLE DE ALMACEN"].includes(eaNorm(p));}
function eaEsJefAlmacen(p){return eaNorm(p)==="JEFATURA ALMACEN";}
function eaEsJefGeneral(p){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(eaNorm(p));}
function eaPuedeGestionar(p){return eaEsAlmacen(p)||eaEsJefAlmacen(p);}

async function eaApi(payload){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),45000);
  try{
    const r=await fetch(API_EQUIPOS_AVERIADOS,{method:"POST",body:JSON.stringify(payload),signal:ctrl.signal});
    const d=await r.json();
    if(!d.ok)throw new Error(d.error||"Error en Equipos Averiados");
    return d;
  }catch(e){
    if(e.name==="AbortError")throw new Error("El servidor tardó demasiado. Vuelva a intentar.");
    throw e;
  }finally{clearTimeout(timer);}
}

function eaStyles(){return `<style id="eaStyles">
.ea-wrap{max-width:1120px;margin:auto;padding:12px}.ea-head{background:linear-gradient(135deg,#7c2d12,#ea580c);color:#fff;border-radius:18px;padding:18px;margin-bottom:12px;box-shadow:0 10px 24px rgba(15,23,42,.2)}.ea-head h2{margin:0 0 5px;font-size:23px}.ea-head p{margin:0;font-size:12px;opacity:.94}.ea-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.ea-btn{border:0;border-radius:11px;padding:9px 12px;font-weight:900;cursor:pointer;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:5px}.ea-btn.blue{background:#2563eb;color:#fff}.ea-btn.green{background:#16a34a;color:#fff}.ea-btn.orange{background:#f59e0b;color:#111827}.ea-btn.red{background:#dc2626;color:#fff}.ea-btn.gray{background:#64748b;color:#fff}.ea-btn.light{background:#e2e8f0;color:#0f172a}.ea-btn:disabled{opacity:.5;cursor:not-allowed}.ea-card{background:#fff;color:#0f172a;border:1px solid #dbe3ee;border-radius:15px;padding:12px;margin-bottom:10px;box-shadow:0 5px 14px rgba(15,23,42,.08)}.ea-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:10px 0}.ea-kpi{background:#f8fafc;border:2px solid #cbd5e1;border-radius:13px;padding:10px;text-align:center}.ea-kpi b{display:block;font-size:21px;color:#0f172a!important;text-shadow:none!important}.ea-kpi span{font-size:10px;font-weight:900;color:#334155}.ea-kpi.solicitudes{background:#eff6ff;border-color:#93c5fd}.ea-kpi.equipos{background:#ecfeff;border-color:#67e8f9}.ea-kpi.pendientes{background:#fef3c7;border-color:#f59e0b}.ea-kpi.pendientes b,.ea-kpi.pendientes span{color:#78350f!important}.ea-kpi.parcial{background:#e0f2fe;border-color:#38bdf8}.ea-kpi.recibidos{background:#dcfce7;border-color:#4ade80}.ea-kpi.recibidos b,.ea-kpi.recibidos span{color:#14532d!important}.ea-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ea-field label{display:block;font-size:10px;font-weight:900;color:#334155;margin-bottom:4px}.ea-field input,.ea-field select,.ea-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:9px;background:#fff;color:#0f172a}.ea-filter{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;align-items:end}.ea-request{border-left:6px solid #94a3b8}.ea-request.pending{border-left-color:#f59e0b}.ea-request.received{border-left-color:#16a34a}.ea-request.observed{border-left-color:#dc2626}.ea-request.partial{border-left-color:#0ea5e9}.ea-request-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.ea-request-head h3{margin:0;font-size:16px;color:#0f172a;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ea-request-date{color:#1e3a8a}.ea-request-cuadrilla{display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;border-radius:999px;background:#dbeafe;border:1px solid #60a5fa;color:#1e3a8a;font-weight:950}.ea-request-full{font-size:11px;font-weight:900;color:#334155;margin-top:3px}.ea-meta{font-size:11px;color:#475569;line-height:1.45;margin-top:4px}.ea-badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:9px;font-weight:900}.ea-badge.yellow{background:#fef3c7;color:#92400e}.ea-badge.green{background:#dcfce7;color:#166534}.ea-badge.red{background:#fee2e2;color:#991b1b}.ea-badge.blue{background:#dbeafe;color:#1e40af}.ea-badge.gray{background:#e2e8f0;color:#334155}.ea-table-wrap{overflow:auto;margin-top:9px}.ea-table{width:100%;border-collapse:collapse;min-width:660px;font-size:11px}.ea-table th,.ea-table td{border:1px solid #cbd5e1;padding:7px;text-align:left}.ea-table th{background:#eaf2fb;font-size:10px}.ea-equipo-form{border:1px solid #cbd5e1;border-radius:11px;padding:9px;margin:7px 0;background:#f8fafc;position:relative}.ea-equipo-grid{display:grid;grid-template-columns:1.15fr 1fr 1fr auto;gap:7px;align-items:end}.ea-remove{width:32px;height:34px;border:0;border-radius:8px;background:#fee2e2;color:#991b1b;font-weight:900;cursor:pointer}.ea-alert{border-radius:12px;padding:10px;font-size:12px;font-weight:800;margin:9px 0}.ea-alert.warn{background:#fff7ed;border:1px solid #fb923c;color:#9a3412}.ea-alert.ok{background:#f0fdf4;border:1px solid #86efac;color:#166534}.ea-empty{text-align:center;color:#64748b;padding:28px}.ea-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px}.ea-modal{width:min(850px,97vw);max-height:92vh;overflow:auto;background:#fff;color:#0f172a;border-radius:17px;padding:15px;box-shadow:0 20px 50px rgba(0,0,0,.35)}.ea-modal h3{margin:0 0 12px}.ea-modal-close{float:right;border:0;background:#e2e8f0;width:32px;height:32px;border-radius:8px;font-weight:900;cursor:pointer}.ea-cargo-list{display:grid;gap:7px}.ea-cargo{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.ea-auto{background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:10px;font-size:11px;line-height:1.5}.ea-confirmacion{margin-top:6px;padding:7px 9px;border-radius:9px;background:#ecfdf5;border:1px solid #86efac;color:#166534;font-size:10px;font-weight:800;line-height:1.4}.ea-history{font-size:10px;color:#475569;line-height:1.5}.ea-history div{padding:4px 0;border-bottom:1px dashed #cbd5e1}
@media(max-width:760px){.ea-kpis{grid-template-columns:repeat(2,1fr)}.ea-grid,.ea-filter{grid-template-columns:1fr 1fr}.ea-equipo-grid{grid-template-columns:1fr}.ea-remove{width:100%}.ea-request-head{flex-direction:column}.ea-cargo{align-items:flex-start;flex-direction:column}}
@media(max-width:430px){.ea-wrap{padding:7px}.ea-grid,.ea-filter{grid-template-columns:1fr}.ea-head h2{font-size:20px}}
</style>`;}

function eaBadge(estado){
  const e=eaNorm(estado);let c="gray";
  if(e.includes("PENDIENTE"))c="yellow";
  if(e.includes("RECIBIDO"))c="green";
  if(e.includes("OBSERVADO")||e.includes("RECHAZADO"))c="red";
  if(e.includes("PARCIAL"))c="blue";
  return `<span class="ea-badge ${c}">${eaEsc(estado||"PENDIENTE")}</span>`;
}
function eaClaseSolicitud(estado){const e=eaNorm(estado);if(e.includes("PARCIAL"))return"partial";if(e.includes("RECIBIDO"))return"received";if(e.includes("OBSERVADO")||e.includes("RECHAZADO"))return"observed";return"pending";}
function eaCodigoCuadrillaCorto(cuadrilla){
  const txt=eaNorm(cuadrilla);
  const m=txt.match(/\bP\s*0*(\d{1,3})\b/);
  return m?`P${Number(m[1])}`:(cuadrilla||"CUADRILLA");
}
function eaFechaCortaSolicitud(item){
  const v=(item?.fechaRegistroVisible||item?.fechaRegistro||"").toString().trim();
  let m=v.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if(m)return `${m[1].padStart(2,"0")}/${m[2].padStart(2,"0")}/${m[3]}`;
  m=v.match(/(\d{4})-(\d{2})-(\d{2})/);
  if(m)return `${m[3]}/${m[2]}/${m[1]}`;
  return v||"SIN FECHA";
}

async function mostrarEquiposAveriados(){
  const p=document.getElementById("pantalla");
  if(!p)return;
  const carga=eaStyles()+`<div class="ea-wrap"><div class="ea-head"><h2>🔧 Equipos Averiados</h2><p>Registro técnico, recepción física de almacén y cargos.</p></div><div class="ea-card">⏳ Cargando información...</div></div>`;
  if(typeof mostrarPantalla==="function") mostrarPantalla(carga);
  else {
    const menu=document.getElementById("menuPrincipal");
    if(menu)menu.style.display="none";
    p.innerHTML=carga;
    if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
  }
  try{
    const u=eaUsuario();
    const [cat,lis,cargos]=await Promise.all([
      eaApi({accion:"catalogosEquiposAveriados",usuario:u.usuario}),
      eaApi({accion:"listarEquiposAveriados",usuario:u.usuario}),
      eaApi({accion:"listarCargosEquiposAveriados",usuario:u.usuario})
    ]);
    EA_STATE.catalogos=cat;EA_STATE.solicitudes=lis.solicitudes||[];EA_STATE.resumen=lis.resumen||{};EA_STATE.cargos=cargos.cargos||[];
    eaRender();
  }catch(e){p.innerHTML=eaStyles()+`<div class="ea-wrap"><div class="ea-head"><h2>🔧 Equipos Averiados</h2></div><div class="ea-alert warn">❌ ${eaEsc(e.message)}</div></div>`;}
}

function eaRender(){
  const p=document.getElementById("pantalla"),u=eaUsuario();if(!p)return;
  const r=EA_STATE.resumen||{};
  const pendientesTecnico=(EA_STATE.solicitudes||[]).filter(x=>eaNorm(x.estado)==="PENDIENTE DE REGISTRO POR TECNICO");
  let acciones="";
  if(eaEsTecnico(u.perfil)) acciones=`<button class="ea-btn blue" onclick="eaAbrirFormularioTecnico('')">➕ Registrar equipos</button>`;
  if(eaPuedeGestionar(u.perfil)) acciones=`<button class="ea-btn orange" onclick="eaAbrirSolicitudAlmacen()">📣 Solicitar registro a técnico</button><button class="ea-btn blue" onclick="eaDescargarInforme()">⬇ Descargar informe</button>`;
  if(eaEsJefGeneral(u.perfil)) acciones=`<button class="ea-btn blue" onclick="eaDescargarInforme()">⬇ Descargar informe</button>`;
  const alerta=eaEsTecnico(u.perfil)&&pendientesTecnico.length?`<div class="ea-alert warn">📣 Almacén solicita registrar equipos averiados pendientes de entrega. Tiene ${pendientesTecnico.length} solicitud(es) por completar.</div>`:"";
  p.innerHTML=eaStyles()+`<div class="ea-wrap">
    <div class="ea-head"><h2>🔧 Equipos Averiados</h2><p>${eaEsTecnico(u.perfil)?"Registre únicamente tipo de equipo, serie (SN del equipo) y MAC del equipo. Máximo 8 equipos por solicitud.":"Control de recepción física de almacén y generación de cargos."}</p></div>
    ${alerta}<div class="ea-actions">${acciones}</div>
    <div class="ea-kpis">
      <div class="ea-kpi solicitudes"><b>${Number(r.total||0)}</b><span>SOLICITUDES</span></div>
      <div class="ea-kpi equipos"><b>${Number(r.totalEquipos||0)}</b><span>EQUIPOS REGISTRADOS</span></div>
      <div class="ea-kpi pendientes"><b>${Number(r.pendienteRegistro||0)+Number(r.pendienteEntrega||0)}</b><span>PENDIENTES</span></div>
      <div class="ea-kpi parcial"><b>${Number(r.parcial||0)}</b><span>RECEPCIÓN PARCIAL</span></div>
      <div class="ea-kpi recibidos"><b>${Number(r.recibido||0)}</b><span>RECIBIDOS</span></div>
    </div>
    ${!eaEsTecnico(u.perfil)?eaFiltrosHtml():""}
    <div id="eaLista">${eaListaHtml()}</div>
    ${eaCargosHtml()}
  </div>`;
}

function eaFiltrosHtml(){
  const sedes=[...new Set(EA_STATE.solicitudes.map(x=>x.sede).filter(Boolean))].sort();
  const cuad=[...new Set(EA_STATE.solicitudes.map(x=>x.cuadrilla).filter(Boolean))].sort();
  const estados=[...new Set(EA_STATE.solicitudes.map(x=>x.estado).filter(Boolean))].sort();
  return `<div class="ea-card"><b>🔎 Filtros</b><div class="ea-filter" style="margin-top:8px">
    <div class="ea-field"><label>SEDE</label><select id="eaFSede"><option value="">TODAS</option>${sedes.map(x=>`<option>${eaEsc(x)}</option>`).join("")}</select></div>
    <div class="ea-field"><label>CUADRILLA</label><select id="eaFCuadrilla"><option value="">TODAS</option>${cuad.map(x=>`<option>${eaEsc(x)}</option>`).join("")}</select></div>
    <div class="ea-field"><label>ESTADO</label><select id="eaFEstado"><option value="">TODOS</option>${estados.map(x=>`<option>${eaEsc(x)}</option>`).join("")}</select></div>
    <div class="ea-field"><label>SERIE (SN DEL EQUIPO)</label><input id="eaFSerie" placeholder="Buscar SN del equipo"></div>
    <button class="ea-btn blue" onclick="eaAplicarFiltros()">Consultar</button>
  </div></div>`;
}

async function eaAplicarFiltros(){
  const u=eaUsuario();
  try{
    const d=await eaApi({accion:"listarEquiposAveriados",usuario:u.usuario,sede:document.getElementById("eaFSede")?.value||"",cuadrilla:document.getElementById("eaFCuadrilla")?.value||"",estado:document.getElementById("eaFEstado")?.value||"",serie:document.getElementById("eaFSerie")?.value||""});
    EA_STATE.solicitudes=d.solicitudes||[];EA_STATE.resumen=d.resumen||{};eaRender();
  }catch(e){alert(e.message);}
}

function eaEquiposTabla(item){
  const equipos=Array.isArray(item.equipos)?item.equipos:[];
  if(!equipos.length)return `<div class="ea-alert warn">El técnico aún no ha registrado el detalle de los equipos.</div>`;
  return `<div class="ea-table-wrap"><table class="ea-table"><thead><tr><th>#</th><th>Tipo</th><th>Serie (SN del equipo)</th><th>MAC del equipo</th><th>Recepción de almacén</th></tr></thead><tbody>${equipos.map((e,i)=>`<tr><td>${i+1}</td><td>${eaEsc(e.tipo)}</td><td><b>${eaEsc(e.serie)}</b></td><td>${eaEsc(e.codigoCliente)}</td><td>${eaBadge(e.estadoRecepcion||"PENDIENTE")}${e.observacionAlmacen?`<br><small>${eaEsc(e.observacionAlmacen)}</small>`:""}</td></tr>`).join("")}</tbody></table></div>`;
}

function eaLinkDescargaCargo(url){
  const txt=(url||"").toString();
  const m=txt.match(/\/d\/([a-zA-Z0-9_-]+)/)||txt.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?`https://drive.google.com/uc?export=download&id=${m[1]}`:txt;
}

function eaAccionesSolicitud(item){
  const u=eaUsuario(),e=eaNorm(item.estado);let h="";
  if(eaEsTecnico(u.perfil)&&["PENDIENTE DE REGISTRO POR TECNICO","OBSERVADO","RECIBIDO PARCIALMENTE"].includes(e))h+=`<button class="ea-btn orange" onclick="eaAbrirFormularioTecnico('${eaEsc(item.id)}')">✍ Completar solicitud</button>`;
  if(eaPuedeGestionar(u.perfil)&&Array.isArray(item.equipos)&&item.equipos.length&&!["RECIBIDO POR ALMACEN","RECHAZADO"].includes(e))h+=`<button class="ea-btn green" onclick="eaAbrirRecepcion('${eaEsc(item.id)}')">📦 Recibir / validar</button>`;
  if(eaEsJefAlmacen(u.perfil)&&["RECIBIDO POR ALMACEN","RECIBIDO PARCIALMENTE"].includes(e))h+=`<button class="ea-btn orange" onclick="eaVolverPendiente('${eaEsc(item.id)}')">↩ Volver a pendiente</button>`;
  if(item.linkCargo)h+=`<a class="ea-btn blue" href="${eaEsc(eaLinkDescargaCargo(item.linkCargo))}" target="_blank" rel="noopener">⬇ Descargar cargo</a>`;
  return h?`<div class="ea-actions">${h}</div>`:"";
}

function eaListaHtml(){
  if(!EA_STATE.solicitudes.length)return `<div class="ea-card ea-empty">No existen solicitudes registradas.</div>`;
  return EA_STATE.solicitudes.map(item=>`<article class="ea-card ea-request ${eaClaseSolicitud(item.estado)}">
    <div class="ea-request-head"><div><h3><span class="ea-request-date">${eaEsc(eaFechaCortaSolicitud(item))}</span><span>·</span><span class="ea-request-cuadrilla">${eaEsc(eaCodigoCuadrillaCorto(item.cuadrilla))}</span></h3><div class="ea-request-full">${eaEsc(item.cuadrilla)}</div><div class="ea-meta">${eaEsc(item.sede)} · ${eaEsc(item.plataforma)}<br>Técnico: <b>${eaEsc(item.tecnico)}</b><br>Solicitud: ${eaEsc(item.id)} · Hora: ${eaEsc(formatearHoraPeruApp(item.horaRegistroVisible||item.horaRegistro||"",false))} · Origen: ${eaEsc(item.origenRegistro)}</div>${item.validadoPor?`<div class="ea-confirmacion">✅ Conformidad de recepción: ${eaEsc(item.validadoPor)} · ${eaEsc(item.perfilValidacion||"")}<br>${eaEsc(formatearFechaHoraPeruApp(item.fechaValidacionVisible||item.fechaValidacion||"",item.horaValidacionVisible||item.horaValidacion||"",false))}</div>`:""}</div><div>${eaBadge(item.estado)}</div></div>
    ${eaEquiposTabla(item)}${eaAccionesSolicitud(item)}
    ${item.historial&&item.historial.length?`<details><summary>Historial</summary><div class="ea-history">${item.historial.slice().reverse().map(x=>`<div><b>${eaEsc(formatearFechaHoraPeruApp(x.fecha||"",x.hora||"",false))}</b> · ${eaEsc(x.accion)} · ${eaEsc(x.usuario)}<br>${eaEsc(x.detalle||"")}</div>`).join("")}</div></details>`:""}
  </article>`).join("");
}

function eaCargosHtml(){
  if(!EA_STATE.cargos.length)return "";
  return `<details class="ea-card"><summary><b>📄 Historial de cargos (${EA_STATE.cargos.length})</b></summary><div class="ea-cargo-list" style="margin-top:9px">${EA_STATE.cargos.map(c=>`<div class="ea-cargo"><div><b>${eaEsc(c.idCargo)}</b><div class="ea-meta">${eaEsc(formatearFechaHoraPeruApp(c.fechaCargoVisible||c.fechaCargo||"",c.horaCargoVisible||c.horaCargo||"",false))} · ${eaEsc(c.cuadrilla)} · ${c.totalEquipos} equipo(s)</div></div><a class="ea-btn blue" href="${eaEsc(eaLinkDescargaCargo(c.linkPdf))}" target="_blank" rel="noopener">⬇ Descargar cargo</a></div>`).join("")}</div></details>`;
}

function eaModal(html){document.getElementById("eaModal")?.remove();const d=document.createElement("div");d.id="eaModal";d.className="ea-modal-bg";d.innerHTML=`<div class="ea-modal"><button class="ea-modal-close" onclick="eaCerrarModal()">×</button>${html}</div>`;document.body.appendChild(d);}
function eaCerrarModal(){document.getElementById("eaModal")?.remove();}

function eaFilaFormulario(e={}){
  const tipos=(EA_STATE.catalogos?.tipos||[]).map(t=>`<option ${eaNorm(e.tipo)===eaNorm(t)?"selected":""}>${eaEsc(t)}</option>`).join("");
  return `<div class="ea-equipo-form"><div class="ea-equipo-grid"><div class="ea-field"><label>TIPO DE EQUIPO</label><select class="ea-tipo"><option value="">Seleccione</option>${tipos}</select></div><div class="ea-field"><label>SERIE (SN DEL EQUIPO)</label><input class="ea-serie" value="${eaEsc(e.serie||"")}" placeholder="SN del equipo"></div><div class="ea-field"><label>MAC DEL EQUIPO</label><input class="ea-codigo" value="${eaEsc(e.codigoCliente||"")}" placeholder="MAC del equipo"></div><button class="ea-remove" onclick="this.closest('.ea-equipo-form').remove()">×</button></div></div>`;
}
function eaAgregarFila(){const c=document.getElementById("eaFilasEquipos");if(!c)return;if(c.children.length>=8){alert("Máximo 8 equipos por solicitud");return;}c.insertAdjacentHTML("beforeend",eaFilaFormulario());}
function eaRecolectarEquipos(){return [...document.querySelectorAll("#eaFilasEquipos .ea-equipo-form")].map(x=>({tipo:x.querySelector(".ea-tipo").value,serie:x.querySelector(".ea-serie").value,codigoCliente:x.querySelector(".ea-codigo").value}));}

function eaAbrirFormularioTecnico(id){
  const item=id?EA_STATE.solicitudes.find(x=>x.id===id):null;
  const cantidad=item?(item.equipos?.length||item.cantidadReferencial||1):1;
  const existentes=item?.equipos?.length?item.equipos:Array.from({length:cantidad},()=>({}));
  EA_STATE.formularioId=id||"";
  const u=eaUsuario();
  eaModal(`<h3>${id?"Completar solicitud":"Registrar equipos averiados"}</h3><div class="ea-auto"><b>Datos automáticos</b><br>Técnico: ${eaEsc(u.nombres)}<br>Cuadrilla: ${eaEsc(u.cuadrilla)} · Sede: ${eaEsc(u.sede)} · Plataforma: ${eaEsc(u.plataforma)}<br>La fecha y hora se registran automáticamente en horario de Perú.</div><div id="eaFilasEquipos" style="margin-top:10px">${existentes.map(eaFilaFormulario).join("")}</div><div class="ea-actions"><button class="ea-btn light" onclick="eaAgregarFila()">➕ Agregar equipo</button><button class="ea-btn blue" onclick="eaGuardarTecnico()">Guardar solicitud</button></div>`);
}

async function eaGuardarTecnico(){
  const equipos=eaRecolectarEquipos(),u=eaUsuario(),id=EA_STATE.formularioId;
  try{
    const b=document.querySelector("#eaModal .ea-btn.blue");if(b){b.disabled=true;b.textContent="Guardando...";}
    await eaApi({accion:id?"completarSolicitudEquiposAveriadosTecnico":"registrarEquiposAveriadosTecnico",usuario:u.usuario,id,equipos});
    eaCerrarModal();await mostrarEquiposAveriados();
  }catch(e){alert(e.message);const b=document.querySelector("#eaModal .ea-btn.blue");if(b){b.disabled=false;b.textContent="Guardar solicitud";}}
}

function eaAbrirSolicitudAlmacen(){
  const tecnicos=EA_STATE.catalogos?.tecnicos||[];
  eaModal(`<h3>📣 Solicitar registro a técnico</h3><div class="ea-grid"><div class="ea-field"><label>TÉCNICO / CUADRILLA</label><select id="eaSolTecnico"><option value="">Seleccione</option>${tecnicos.map(t=>`<option value="${eaEsc(t.usuario)}">${eaEsc(t.sede)} · ${eaEsc(t.cuadrilla)} · ${eaEsc(t.tecnico)}</option>`).join("")}</select></div><div class="ea-field"><label>CANTIDAD REFERENCIAL</label><select id="eaSolCantidad">${[1,2,3,4,5,6,7,8].map(n=>`<option>${n}</option>`).join("")}</select></div></div><div class="ea-field" style="margin-top:8px"><label>OBSERVACIÓN OPCIONAL</label><textarea id="eaSolObs" rows="3" placeholder="Indicación para el técnico"></textarea></div><div class="ea-actions"><button class="ea-btn orange" onclick="eaCrearSolicitudAlmacen()">Crear solicitud pendiente</button></div>`);
}
async function eaCrearSolicitudAlmacen(){
  try{await eaApi({accion:"crearSolicitudEquiposAveriadosAlmacen",usuario:eaUsuario().usuario,usuarioTecnico:document.getElementById("eaSolTecnico").value,cantidadReferencial:document.getElementById("eaSolCantidad").value,observacion:document.getElementById("eaSolObs").value});eaCerrarModal();await mostrarEquiposAveriados();}catch(e){alert(e.message);}
}

function eaAbrirRecepcion(id){
  const item=EA_STATE.solicitudes.find(x=>x.id===id);if(!item)return;
  eaModal(`<h3>📦 Recepción de equipos · ${eaEsc(id)}</h3><p class="ea-meta">Marque el resultado físico de cada equipo. Los ya recibidos quedan bloqueados.</p><div class="ea-table-wrap"><table class="ea-table"><thead><tr><th>Tipo</th><th>Serie (SN del equipo)</th><th>MAC del equipo</th><th>Resultado</th><th>Observación</th></tr></thead><tbody>${item.equipos.map(e=>{const recibido=eaNorm(e.estadoRecepcion)==="RECIBIDO";return `<tr data-serie="${eaEsc(e.serie)}"><td>${eaEsc(e.tipo)}</td><td><b>${eaEsc(e.serie)}</b></td><td>${eaEsc(e.codigoCliente)}</td><td><select class="ea-rec-estado" ${recibido?"disabled":""}><option>PENDIENTE</option><option ${eaNorm(e.estadoRecepcion)==="RECIBIDO"?"selected":""}>RECIBIDO</option><option ${eaNorm(e.estadoRecepcion)==="OBSERVADO"?"selected":""}>OBSERVADO</option><option ${eaNorm(e.estadoRecepcion)==="RECHAZADO"?"selected":""}>RECHAZADO</option></select></td><td><input class="ea-rec-obs" value="${eaEsc(e.observacionAlmacen||"")}" ${recibido?"disabled":""}></td></tr>`;}).join("")}</tbody></table></div><div class="ea-field" style="margin-top:8px"><label>OBSERVACIÓN GENERAL</label><textarea id="eaRecObsGeneral" rows="2"></textarea></div><div class="ea-actions"><button class="ea-btn green" onclick="eaConfirmarRecepcion('${eaEsc(id)}')">Confirmar recepción</button></div>`);
}
async function eaConfirmarRecepcion(id){
  const equipos=[...document.querySelectorAll("#eaModal tbody tr")].map(tr=>({serie:tr.dataset.serie,estado:tr.querySelector(".ea-rec-estado").value,observacion:tr.querySelector(".ea-rec-obs").value}));
  try{const d=await eaApi({accion:"validarRecepcionEquiposAveriados",usuario:eaUsuario().usuario,id,equipos,observacionGeneral:document.getElementById("eaRecObsGeneral").value});if(d.cargo?.pdfBase64)eaDescargarBase64(d.cargo.pdfBase64,d.cargo.nombrePdf||`${d.cargo.idCargo}.pdf`,`application/pdf`);eaCerrarModal();await mostrarEquiposAveriados();}catch(e){alert(e.message);}
}

async function eaVolverPendiente(id){
  if(!confirm("La solicitud volverá a pendiente. El cargo anterior permanecerá en el historial. ¿Continuar?"))return;
  try{
    await eaApi({accion:"volverPendienteEquiposAveriados",usuario:eaUsuario().usuario,id});
    await mostrarEquiposAveriados();
  }catch(e){alert(e.message);}
}

function eaDescargarBase64(base64,nombre,mime){const a=document.createElement("a");a.href=`data:${mime};base64,${base64}`;a.download=nombre;document.body.appendChild(a);a.click();a.remove();}

function eaDescargarInforme(){
  const filas=[["Solicitud","Fecha","Sede","Plataforma","Cuadrilla","Técnico","Estado solicitud","Tipo equipo","Serie (SN del equipo)","MAC del equipo","Estado recepción","Confirmado por","Fecha conformidad","Cargo"]];
  EA_STATE.solicitudes.forEach(s=>(s.equipos||[]).forEach(e=>filas.push([s.id,formatearFechaPeruApp(s.fechaRegistroVisible||s.fechaRegistro||""),s.sede,s.plataforma,s.cuadrilla,s.tecnico,s.estado,e.tipo,e.serie,e.codigoCliente,e.estadoRecepcion||"PENDIENTE",s.validadoPor||"",formatearFechaHoraPeruApp(s.fechaValidacionVisible||s.fechaValidacion||"",s.horaValidacionVisible||s.horaValidacion||"",false),e.cargoId||s.idCargo||""])));
  const csv="\uFEFF"+filas.map(f=>f.map(v=>`"${(v??"").toString().replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`INFORME_EQUIPOS_AVERIADOS_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();
}

window.mostrarEquiposAveriados=mostrarEquiposAveriados;
