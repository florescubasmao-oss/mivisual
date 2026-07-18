// MI VISUAL V156 - Permisos dinámicos por perfil
const API_PERMISOS = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";
let PM_PERMISOS = null;
let PM_PERMISOS_CARGADOS = false;
let PM_CONFIG_MENU = null;
function pmNorm(v){return (v||"").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
async function pmApi(payload){const r=await fetch(API_PERMISOS,{method:'POST',body:JSON.stringify(payload)});const d=await r.json();if(!d.ok)throw new Error(d.error||'Error de permisos');return d;}
const PM_CACHE_TTL_MS = 5 * 60 * 1000;
let PM_ACTUALIZACION_EN_CURSO = false;

function pmCacheKey(usuario){ return 'permisosModulos:' + pmNorm(usuario); }
function pmCacheFechaKey(usuario){ return 'permisosModulosFecha:' + pmNorm(usuario); }
function pmLeerCache(usuario){
  try {
    const permisos = JSON.parse(localStorage.getItem(pmCacheKey(usuario)) || 'null');
    const fecha = Number(localStorage.getItem(pmCacheFechaKey(usuario)) || 0);
    return { permisos: Array.isArray(permisos) ? permisos : null, fecha };
  } catch (_) {
    return { permisos: null, fecha: 0 };
  }
}
function pmGuardarCache(usuario, permisos){
  localStorage.setItem(pmCacheKey(usuario), JSON.stringify(permisos || []));
  localStorage.setItem(pmCacheFechaKey(usuario), String(Date.now()));
  localStorage.removeItem('permisosModulos');
}
async function pmConsultarPermisosServidor(usuario){
  try { return await pmApi({accion:'obtenerContextoMenu',usuario}); }
  catch (_) { return await pmApi({accion:'obtenerPermisosUsuario',usuario}); }
}
async function pmActualizarPermisosSegundoPlano(usuario){
  if (PM_ACTUALIZACION_EN_CURSO) return;
  PM_ACTUALIZACION_EN_CURSO = true;
  try {
    const d = await pmConsultarPermisosServidor(usuario);
    const nuevos = Array.isArray(d.permisos) ? d.permisos : [];
    const anterior = JSON.stringify(PM_PERMISOS || []);
    PM_PERMISOS = nuevos;
    PM_CONFIG_MENU = d.configuracion || null;
    PM_PERMISOS_CARGADOS = true;
    pmGuardarCache(usuario, nuevos);
    if (JSON.stringify(nuevos) !== anterior && typeof window.aplicarPermisosMenuActualizados === 'function') {
      window.aplicarPermisosMenuActualizados();
    }
  } catch (e) {
    console.warn('Permisos: no se pudo actualizar en segundo plano', e);
  } finally {
    PM_ACTUALIZACION_EN_CURSO = false;
  }
}
async function pmCargarPermisosActuales(forzar){
  const usuario=(localStorage.getItem('usuario')||'').trim();
  if(!usuario){PM_PERMISOS=[];PM_PERMISOS_CARGADOS=true;return [];}
  if(PM_PERMISOS_CARGADOS&&!forzar)return PM_PERMISOS||[];

  const cache = pmLeerCache(usuario);
  if (!forzar && Array.isArray(cache.permisos)) {
    PM_PERMISOS = cache.permisos;
    PM_PERMISOS_CARGADOS = true;
    // El menú se muestra de inmediato; la verificación real se ejecuta sin bloquear la pantalla.
    if ((Date.now() - cache.fecha) > PM_CACHE_TTL_MS) {
      Promise.resolve(pmActualizarPermisosSegundoPlano(usuario));
    } else {
      setTimeout(() => pmActualizarPermisosSegundoPlano(usuario), 50);
    }
    return PM_PERMISOS;
  }

  try{
    const d = await pmConsultarPermisosServidor(usuario);
    PM_PERMISOS=Array.isArray(d.permisos)?d.permisos:[];
    PM_CONFIG_MENU=d.configuracion||null;
    PM_PERMISOS_CARGADOS=true;
    pmGuardarCache(usuario, PM_PERMISOS);
    return PM_PERMISOS;
  }catch(e){
    console.warn('Permisos: no se pudo consultar la configuración actual',e);
    PM_PERMISOS=Array.isArray(cache.permisos)?cache.permisos:[];
    PM_PERMISOS_CARGADOS=true;
    return PM_PERMISOS;
  }
}
function pmFila(modulo){const m=pmNorm(modulo);return (PM_PERMISOS||[]).find(x=>pmNorm(x.modulo)===m&&pmNorm(x.activo||'SI')==='SI');}
function pmPermiso(modulo){return pmFila(modulo)||null;}
function pmPuedeVer(modulo){const f=pmPermiso(modulo);return !!f&&pmNorm(f.mostrarModulo||'NO')==='SI'&&pmNorm(f.ver||'NO')==='SI'&&pmNorm(f.alcanceDatos||'SIN ACCESO')!=='SIN ACCESO';}
function pmAlcance(modulo){const f=pmPermiso(modulo);return f?pmNorm(f.alcanceDatos||'SIN ACCESO'):'SIN ACCESO';}
function pmSoloLectura(modulo){return pmPuedeVer(modulo)&&!pmPuede(modulo,'REGISTRAR')&&!pmPuede(modulo,'EDITAR')&&!pmPuede(modulo,'OBSERVAR')&&!pmPuede(modulo,'APROBAR')&&!pmPuede(modulo,'VALIDAR')&&!pmPuede(modulo,'ADMINISTRAR');}

function pmPuede(modulo,accion){
  if(!PM_PERMISOS_CARGADOS)return false;
  const f=pmFila(modulo);
  if(!f)return false;
  const clave=pmNorm(accion).toLowerCase();
  return pmNorm(f[clave]||f[accion]||'NO')==='SI';
}
function pmModulosMenu(){
  if(!PM_PERMISOS_CARGADOS)return null;
  return (PM_PERMISOS||[])
    .filter(x=>pmNorm(x.activo||'SI')==='SI')
    .filter(x=>pmNorm(x.mostrarModulo||'NO')==='SI')
    .filter(x=>pmNorm(x.ver||'NO')==='SI')
    .filter(x=>pmNorm(x.alcanceDatos||'SIN ACCESO')!=='SIN ACCESO')
    .sort((a,b)=>(Number(a.ordenMenu)||999)-(Number(b.ordenMenu)||999));
}
const PM_CARD_MAP={'PRODUCCION':'cardProduccion','EFECTIVIDAD':'cardEfectividad','PORCENTAJE RECABLEADO':'cardRecableado','VTR GAR':'cardVTRGAR','RANKING':'cardRanking','OBSERVACIONES':'cardObservaciones','ACCESOS':'cardAccesos','BIBLIOTECA':'cardBiblioteca','CAPACITACION':'cardCapacitacion','DASHBOARD SUPERVISOR':'cardDashboardSupervisor','DASHBOARD JEFATURA':'cardDashboardJefatura','ANALISIS ECONOMICO':'cardAnalisisEconomico','ACTIVIDAD CAMPO':'cardActividadCampo','VALIDACION TECNICA':'cardValidacionTecnica','ACTAS ESCANEADAS':'cardActas','CHECKLIST ALMACEN':'cardChecklistAlmacen','PROGRAMACION DESCANSOS':'cardProgramacionDescansos','PEXT':'cardTrabajosConjunta','ADMINISTRACION':'cardAdministracion','CONSULTAS Y RECLAMOS':'cardConsultasReclamos','MESA DE AYUDA':'cardConsultasReclamos','MAPA OPERATIVO':'cardMapaOperativo'};
function pmPanelAdmin(){return `<div class="adm104-config"><div class="pm-admin"><h3>🔐 Permisos por perfil</h3><p>Selecciona un perfil y un módulo. Los permisos existentes se cargarán automáticamente.</p><div class="pm-grid"><label>Perfil<select id="pmPerfil"><option value="">Cargando perfiles...</option></select></label><label>Módulo<select id="pmModulo"><option value="">Cargando módulos...</option></select></label><label>Activo<select id="pmActivo"><option>SI</option><option>NO</option></select></label><label>Orden menú<input id="pmOrden" type="number" min="1"></label><label>Mostrar módulo<select id="pmMostrar"><option>SI</option><option>NO</option></select></label><label>Alcance<select id="pmAlcance"><option>SIN ACCESO</option><option>CUADRILLA</option><option>SEDE</option><option>SEDE / PROPIOS</option><option>ZONA NORTE</option><option>PERSONAL</option><option>SEGUN DESTINO</option></select></label></div><div id="pmChecks" class="pm-checks"></div><label class="pm-obs">Observación<textarea id="pmObs"></textarea></label><div class="pm-actions"><button class="button_1" onclick="pmGuardarAdmin()">Guardar cambios</button></div><div id="pmMsg"></div></div></div>`;}

function pmLimpiarFormularioAdmin(){
  const activo=document.getElementById('pmActivo');
  const orden=document.getElementById('pmOrden');
  const mostrar=document.getElementById('pmMostrar');
  const alcance=document.getElementById('pmAlcance');
  const obs=document.getElementById('pmObs');
  if(activo) activo.value='SI';
  if(orden) orden.value='';
  if(mostrar) mostrar.value='NO';
  if(alcance) alcance.value='SIN ACCESO';
  if(obs) obs.value='';
  document.querySelectorAll('[data-pm]').forEach(c=>c.checked=false);
}

function pmCargarFilaAdmin(){
  const perfilEl=document.getElementById('pmPerfil');
  const moduloEl=document.getElementById('pmModulo');
  if(!perfilEl||!moduloEl)return;
  const p=pmNorm(perfilEl.value),m=pmNorm(moduloEl.value);
  if(!p||!m){pmLimpiarFormularioAdmin();return;}
  const f=(window.PM_ADMIN||[]).find(x=>pmNorm(x.perfil)===p&&pmNorm(x.modulo)===m);
  if(!f){pmLimpiarFormularioAdmin();return;}
  const activo=document.getElementById('pmActivo');
  const orden=document.getElementById('pmOrden');
  const mostrar=document.getElementById('pmMostrar');
  const alcance=document.getElementById('pmAlcance');
  const obs=document.getElementById('pmObs');
  if(activo) activo.value=f.activo||'SI';
  if(orden) orden.value=f.ordenMenu||'';
  if(mostrar) mostrar.value=f.mostrarModulo||'NO';
  if(alcance) alcance.value=f.alcanceDatos||'SIN ACCESO';
  if(obs) obs.value=f.observacion||'';
  document.querySelectorAll('[data-pm]').forEach(c=>c.checked=pmNorm(f[c.dataset.pm.toLowerCase()]||'NO')==='SI');
  const msg=document.getElementById('pmMsg');
  if(msg)msg.textContent='';
}

async function pmInitAdmin(){
  const msg=document.getElementById('pmMsg');
  try{
    const d=await pmApi({accion:'listarPermisosAdministracion',usuario:localStorage.getItem('usuario')});
    window.PM_ADMIN=Array.isArray(d.permisos)?d.permisos:[];
    const perfiles=[...new Set(PM_ADMIN.map(x=>pmNorm(x.perfil)).filter(Boolean))].sort();
    const modulos=[...new Set(PM_ADMIN.map(x=>pmNorm(x.modulo)).filter(Boolean))].sort();
    const perfilEl=document.getElementById('pmPerfil');
    const moduloEl=document.getElementById('pmModulo');
    if(!perfilEl||!moduloEl){
      if(msg) msg.textContent='No se encontró el formulario de permisos. Vuelva a abrir Administración.';
      return;
    }
    const perfilAnterior=pmNorm(perfilEl.value);
    const moduloAnterior=pmNorm(moduloEl.value);
    perfilEl.innerHTML='<option value="">Seleccione perfil</option>'+perfiles.map(x=>`<option value="${x}">${x}</option>`).join('');
    moduloEl.innerHTML='<option value="">Seleccione módulo</option>'+modulos.map(x=>`<option value="${x}">${x}</option>`).join('');
    if(perfiles.includes(perfilAnterior))perfilEl.value=perfilAnterior;
    if(modulos.includes(moduloAnterior))moduloEl.value=moduloAnterior;
    const checks=document.getElementById('pmChecks');
    if(checks) checks.innerHTML=['VER','REGISTRAR','EDITAR','OBSERVAR','APROBAR','VALIDAR','DESCARGAR','ADMINISTRAR'].map(x=>`<label><input type="checkbox" data-pm="${x}"> ${x}</label>`).join('');
    perfilEl.onchange=pmCargarFilaAdmin;
    moduloEl.onchange=pmCargarFilaAdmin;
    pmCargarFilaAdmin();
  }catch(e){
    if(msg)msg.textContent=e.message;
  }
}

async function pmGuardarAdmin(){
  const perfilEl=document.getElementById('pmPerfil');
  const moduloEl=document.getElementById('pmModulo');
  const msg=document.getElementById('pmMsg');
  if(!perfilEl||!moduloEl){
    if(msg) msg.textContent='No se encontró el formulario de permisos.';
    return;
  }
  const perfil=perfilEl.value;
  const modulo=moduloEl.value;
  if(!perfil||!modulo){
    if(msg)msg.innerHTML='<b style="color:#dc2626">Seleccione perfil y módulo.</b>';
    return;
  }
  const valor=id=>{const el=document.getElementById(id);return el?el.value:'';};
  const payload={accion:'guardarPermisoModulo',usuario:localStorage.getItem('usuario'),perfil,modulo,activo:valor('pmActivo')||'SI',ordenMenu:valor('pmOrden'),mostrarModulo:valor('pmMostrar')||'NO',alcanceDatos:valor('pmAlcance')||'SIN ACCESO',observacion:valor('pmObs')};
  document.querySelectorAll('[data-pm]').forEach(c=>payload[c.dataset.pm.toLowerCase()]=c.checked?'SI':'NO');
  try{
    if(msg)msg.textContent='Guardando...';
    await pmApi(payload);
    localStorage.removeItem('permisosModulos:'+pmNorm(payload.perfil));
    if(pmNorm(payload.perfil)===pmNorm(localStorage.getItem('perfil'))){PM_PERMISOS_CARGADOS=false;PM_PERMISOS=null;PM_CONFIG_MENU=null;}
    await pmInitAdmin();
    const perfilNuevo=document.getElementById('pmPerfil');
    const moduloNuevo=document.getElementById('pmModulo');
    if(perfilNuevo) perfilNuevo.value=pmNorm(payload.perfil);
    if(moduloNuevo) moduloNuevo.value=pmNorm(payload.modulo);
    pmCargarFilaAdmin();
    if(msg)msg.innerHTML='<b style="color:#16a34a">Cambios guardados correctamente.</b>';
  }catch(e){
    if(msg)msg.textContent=e.message;
  }
}

function pmLimpiarSesion(){PM_PERMISOS=null;PM_PERMISOS_CARGADOS=false;PM_CONFIG_MENU=null;}
