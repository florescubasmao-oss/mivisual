const CONTROL_API=URL+"/functions/v1/administracion-control-pilot";
let CONTROL_CTX=null,ADMIN_CAT=null,CAT_ROWS=[],PERM_ROWS=[],PERM_SEL=null,RANK_ROWS=[],RANK_SEL=null,USER_OP_SEL=null;

async function capi(d){
  const t=await tok();if(!t)throw Error("Inicie sesión.");
  const r=await fetch(CONTROL_API,{method:"POST",headers:{Authorization:"Bearer "+t,apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(d)});
  const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error||"Error de Administración.");return x;
}
function b(v){return !!v}
function boolBox(id,label,val){return '<label class="admin-check"><input id="'+id+'" type="checkbox" '+(val?'checked':'')+'> '+H(label)+'</label>'}
async function initControl(){
  try{
    const d=await capi({accion:"contextoAdministracion"});
    CONTROL_CTX=d.contexto;ADMIN_CAT=d.catalogos||{};
    const p=ADMIN_CAT.perfiles||[],m=ADMIN_CAT.modulos||[];
    E("permPerfil").innerHTML='<option value="">Todos los perfiles</option>'+p.map(x=>'<option>'+H(x)+'</option>').join("");
    E("permModulo").innerHTML='<option value="">Todos los módulos</option>'+m.map(x=>'<option>'+H(x)+'</option>').join("");
    await Promise.all([cargarCatalogoPartidas(),cargarRankingConfig(),cargarPermisos(),cargarEventosAdmin()]);
  }catch(e){E("controlMsg").className="err";E("controlMsg").textContent=e.message}
}
async function cargarCatalogoPartidas(){
  try{
    const d=await capi({accion:"listarCatalogoPartidas",buscar:E("catQ").value,plataforma:E("catPlat").value,grupo:E("catGrupo").value});
    CAT_ROWS=d.lista||[];
    const plats=[...new Set(CAT_ROWS.map(x=>x.plataforma_orden).filter(Boolean))].sort();
    const grupos=[...new Set(CAT_ROWS.map(x=>x.grupo).filter(Boolean))].sort();
    const pv=E("catPlat").value,gv=E("catGrupo").value;
    E("catPlat").innerHTML='<option value="">Todas las plataformas</option>'+plats.map(x=>'<option>'+H(x)+'</option>').join("");
    E("catGrupo").innerHTML='<option value="">Todos los grupos</option>'+grupos.map(x=>'<option>'+H(x)+'</option>').join("");
    if(plats.includes(pv))E("catPlat").value=pv;if(grupos.includes(gv))E("catGrupo").value=gv;
    E("catTabla").innerHTML='<tr><th>Código</th><th>Tipo orden</th><th>Plataforma</th><th>Puntaje</th><th>Grupo</th><th>Monto</th><th>Tarifa</th></tr>'+
      CAT_ROWS.map(x=>'<tr><td><b>'+H(x.codigo)+'</b></td><td>'+H(x.tipo_orden)+'</td><td>'+H(x.plataforma_orden)+'</td><td>'+Number(x.puntaje||0).toFixed(2)+'</td><td>'+H(x.grupo)+'</td><td>S/ '+Number(x.monto||0).toFixed(2)+'</td><td>'+H(x.estado_tarifa||"")+'</td></tr>').join("");
    E("catMsg").className="ok";E("catMsg").textContent=CAT_ROWS.length+" partidas.";
  }catch(e){E("catMsg").className="err";E("catMsg").textContent=e.message}
}
async function cargarRankingConfig(){
  try{
    const d=await capi({accion:"listarRankingConfig"});RANK_ROWS=d.lista||[];
    E("rankTabla").innerHTML='<tr><th>Periodo</th><th>Producción</th><th>Efectividad</th><th>SLA</th><th>Obs.</th><th>Recab.</th><th>VTR/GAR</th><th>Total</th><th>Fuente</th><th></th></tr>'+
      RANK_ROWS.map((x,i)=>'<tr><td><b>'+H(x.periodo)+'</b></td><td>'+Number(x.produccion_pct||0)+'</td><td>'+Number(x.efectividad_pct||0)+'</td><td>'+Number(x.sla_pct||0)+'</td><td>'+Number(x.observaciones_pct||0)+'</td><td>'+Number(x.recableado_pct||0)+'</td><td>'+Number(x.vtrgar_pct||0)+'</td><td>'+Number(x.total_pct||0)+'</td><td>'+H(x.fuente)+'</td><td>'+(x.editable?'<button class="sec" onclick="editarRanking('+i+')">Editar</button>':'<span class="pill">Protegido</span>')+'</td></tr>').join("");
    E("rankMsg").className="ok";E("rankMsg").textContent=RANK_ROWS.length+" períodos.";
  }catch(e){E("rankMsg").className="err";E("rankMsg").textContent=e.message}
}
function editarRanking(i){
  RANK_SEL=RANK_ROWS[i];if(!RANK_SEL||!RANK_SEL.editable)return;
  E("rankEdit").classList.remove("hidden");E("rankPeriod").value=RANK_SEL.periodo;
  E("rp").value=RANK_SEL.produccion_pct;E("re").value=RANK_SEL.efectividad_pct;E("rs").value=RANK_SEL.sla_pct;
  E("ro").value=RANK_SEL.observaciones_pct;E("rr").value=RANK_SEL.recableado_pct;E("rv").value=RANK_SEL.vtrgar_pct;
  calcularTotalRanking();E("rankEdit").scrollIntoView({behavior:"smooth",block:"start"});
}
function calcularTotalRanking(){
  const total=["rp","re","rs","ro","rr","rv"].reduce((s,id)=>s+Number(E(id)?.value||0),0);
  E("rankTotal").textContent=total.toFixed(2)+"%";E("rankTotal").className=Math.abs(total-100)<0.0001?"ok":"err";return total;
}
async function guardarRanking(){
  try{
    const total=calcularTotalRanking();if(Math.abs(total-100)>0.0001)throw Error("Los pesos deben sumar exactamente 100.");
    if(!confirm("Se actualizarán los pesos de "+E("rankPeriod").value+" y se refrescará el Ranking/Dashboard. ¿Continuar?"))return;
    const d=await capi({accion:"guardarRankingConfig",periodo:E("rankPeriod").value,produccion:E("rp").value,efectividad:E("re").value,sla:E("rs").value,observaciones:E("ro").value,recableado:E("rr").value,vtrgar:E("rv").value});
    E("rankEditMsg").className="ok";E("rankEditMsg").textContent="Pesos guardados. Cache: "+Number(d.cacheRegistros||0)+" cuadrillas.";
    await cargarRankingConfig();
  }catch(e){E("rankEditMsg").className="err";E("rankEditMsg").textContent=e.message}
}
async function cargarPermisos(){
  try{
    const d=await capi({accion:"listarPermisos",perfil:E("permPerfil").value,modulo:E("permModulo").value});
    PERM_ROWS=d.lista||[];
    E("permTabla").innerHTML='<tr><th>Perfil</th><th>Módulo</th><th>Visible</th><th>Ver</th><th>Reg.</th><th>Edit.</th><th>Valid.</th><th>Admin.</th><th>Alcance</th><th></th></tr>'+
      PERM_ROWS.map((x,i)=>'<tr><td>'+H(x.perfil)+'</td><td><b>'+H(x.modulo)+'</b></td><td>'+yes(x.mostrar_modulo)+'</td><td>'+yes(x.ver)+'</td><td>'+yes(x.registrar)+'</td><td>'+yes(x.editar)+'</td><td>'+yes(x.validar)+'</td><td>'+yes(x.administrar)+'</td><td>'+H(x.alcance_datos)+'</td><td><button class="sec" onclick="editarPermiso('+i+')">Editar</button></td></tr>').join("");
    E("permMsg").className="ok";E("permMsg").textContent=PERM_ROWS.length+" permisos.";
  }catch(e){E("permMsg").className="err";E("permMsg").textContent=e.message}
}
const yes=v=>v?'<span class="pill ok">SI</span>':'<span class="pill">NO</span>';
function editarPermiso(i){
  PERM_SEL=PERM_ROWS[i];if(!PERM_SEL)return;
  E("permEdit").classList.remove("hidden");
  E("permTarget").innerHTML='<b>'+H(PERM_SEL.perfil)+'</b> · '+H(PERM_SEL.modulo);
  E("permChecks").innerHTML=
    boolBox("pa","Activo",b(PERM_SEL.activo))+boolBox("pm","Mostrar módulo",b(PERM_SEL.mostrar_modulo))+boolBox("pv","Ver",b(PERM_SEL.ver))+
    boolBox("pr","Registrar",b(PERM_SEL.registrar))+boolBox("pe","Editar",b(PERM_SEL.editar))+boolBox("po","Observar",b(PERM_SEL.observar))+
    boolBox("pp","Aprobar",b(PERM_SEL.aprobar))+boolBox("pval","Validar",b(PERM_SEL.validar))+boolBox("pd","Descargar",b(PERM_SEL.descargar))+boolBox("pad","Administrar",b(PERM_SEL.administrar));
  E("permAlcance").innerHTML=(ADMIN_CAT.alcances||[]).map(x=>'<option>'+H(x)+'</option>').join("");E("permAlcance").value=PERM_SEL.alcance_datos||"SIN ACCESO";
  E("permVista").innerHTML='<option value="">Sin vista específica</option>'+(ADMIN_CAT.vistas||[]).map(x=>'<option>'+H(x)+'</option>').join("");E("permVista").value=PERM_SEL.vista_perfil||"";
  E("permOrden").value=PERM_SEL.orden_menu||0;E("permObs").value=PERM_SEL.observacion||"";
  E("permEdit").scrollIntoView({behavior:"smooth",block:"start"});
}
async function guardarPermiso(){
  try{
    if(!PERM_SEL)throw Error("Seleccione un permiso.");
    if(!confirm("Se actualizará el permiso "+PERM_SEL.perfil+" / "+PERM_SEL.modulo+". ¿Continuar?"))return;
    const data={activo:E("pa").checked,mostrarModulo:E("pm").checked,ver:E("pv").checked,registrar:E("pr").checked,editar:E("pe").checked,observar:E("po").checked,aprobar:E("pp").checked,validar:E("pval").checked,descargar:E("pd").checked,administrar:E("pad").checked,alcanceDatos:E("permAlcance").value,vistaPerfil:E("permVista").value,ordenMenu:Number(E("permOrden").value||0),observacion:E("permObs").value};
    await capi({accion:"actualizarPermiso",id:PERM_SEL.id,data});
    E("permEditMsg").className="ok";E("permEditMsg").textContent="Permiso actualizado.";
    await cargarPermisos();
  }catch(e){E("permEditMsg").className="err";E("permEditMsg").textContent=e.message}
}
async function editarUsuarioDesdeAuth(usuario){
  try{
    const d=await capi({accion:"listarUsuariosOperativos",buscar:usuario});
    const x=(d.lista||[]).find(z=>String(z.usuario).toUpperCase()===String(usuario).toUpperCase());
    if(!x)throw Error("Usuario operativo no encontrado.");
    USER_OP_SEL=x;renderUsuarioOperativo();
  }catch(e){E("msg").className="err";E("msg").textContent=e.message}
}
function renderUsuarioOperativo(){
  const x=USER_OP_SEL;E("userEdit").classList.remove("hidden");
  E("userTarget").innerHTML='<b>'+H(x.usuario)+'</b>'+(x.authVinculado?' <span class="pill ok">AUTH VINCULADO</span>':'');
  const set=(id,v)=>E(id).value=v??"";
  set("un",x.nombres_apellidos);set("uc",x.correo);E("uc").disabled=!!x.authVinculado;
  E("up").innerHTML=(ADMIN_CAT.perfiles||[]).map(z=>'<option>'+H(z)+'</option>').join("");set("up",x.perfil);
  set("us",x.sede);set("uq",x.cuadrilla);set("upl",x.plataforma);set("una",x.nivel_acceso);set("uest",x.estado);
  set("usup",x.usuario_supervisor);set("utu",x.tiene_unidad);set("upla",x.placa_unidad);set("ufc",x.frecuencia_combustible);set("ufa",x.facturas_activo);
  E("userEdit").scrollIntoView({behavior:"smooth",block:"start"});
}
async function guardarUsuarioOperativo(){
  try{
    if(!USER_OP_SEL)throw Error("Seleccione un usuario.");
    if(!confirm("Se actualizarán los datos operativos de "+USER_OP_SEL.usuario+". ¿Continuar?"))return;
    const data={nombresApellidos:E("un").value,correo:E("uc").value,perfil:E("up").value,sede:E("us").value,cuadrilla:E("uq").value,plataforma:E("upl").value,nivelAcceso:E("una").value,estado:E("uest").value,usuarioSupervisor:E("usup").value,tieneUnidad:E("utu").value,placaUnidad:E("upla").value,frecuenciaCombustible:E("ufc").value,facturasActivo:E("ufa").value};
    await capi({accion:"actualizarUsuarioOperativo",id:USER_OP_SEL.id,data});
    E("userEditMsg").className="ok";E("userEditMsg").textContent="Usuario operativo actualizado.";
    E("userEdit").classList.add("hidden");USER_OP_SEL=null;await init();
  }catch(e){E("userEditMsg").className="err";E("userEditMsg").textContent=e.message}
}
async function cargarEventosAdmin(){
  try{
    const d=await capi({accion:"listarEventosAdministracion"});
    const rows=d.lista||[];
    E("auditTabla").innerHTML='<tr><th>Fecha</th><th>Actor</th><th>Evento</th><th>Entidad</th><th>ID</th></tr>'+
      rows.map(x=>'<tr><td>'+H(new Date(x.creado_at).toLocaleString("es-PE"))+'</td><td>'+H(x.actor_usuario)+' · '+H(x.actor_perfil)+'</td><td>'+H(x.evento)+'</td><td>'+H(x.entidad)+'</td><td>'+H(x.entidad_id||"")+'</td></tr>').join("");
    E("auditMsg").textContent=rows.length+" eventos recientes.";
  }catch(e){E("auditMsg").className="err";E("auditMsg").textContent=e.message}
}
