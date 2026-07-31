
// V274 - Lectura al corte y proyección diaria por jornadas programadas
async function aeApiMateriales(payload){
  const base=window.MI_VISUAL_API_URL||API_ANALISIS_ECONOMICO;
  const esConsulta=payload?.accion==="obtenerResumenMateriales";
  const url=new URL(base);
  url.searchParams.set("mv299",Date.now().toString());

  let opciones;
  if(esConsulta){
    Object.entries(payload||{}).forEach(([clave,valor])=>{
      if(valor!==undefined&&valor!==null)url.searchParams.set(clave,String(valor));
    });
    opciones={method:"GET",cache:"no-store"};
  }else{
    opciones={
      method:"POST",
      cache:"no-store",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload)
    };
  }

  const respuesta=await fetch(url.toString(),opciones);
  const texto=await respuesta.text();
  let data;
  try{
    data=JSON.parse(texto);
  }catch(_){
    if(texto.trim()==="MI VISUAL API OK"){
      throw new Error("La implementación activa de Apps Script no atendió la consulta. Actualice Code.gs y la implementación.");
    }
    throw new Error("La API de materiales devolvió una respuesta no válida.");
  }
  if(!respuesta.ok||!data.ok)throw new Error(data.error||"Error en materiales");
  return data;
}
function aeEscape(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function aePerfilActual(){return (localStorage.getItem("perfil")||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function aeEsJefaturaAlmacen(){return aePerfilActual()==="JEFATURA ALMACEN"}
function aeEsGerenciaLima(){return aePerfilActual()==="GERENCIA LIMA"}
function aePerfilMateriales(){return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA","JEFATURA ALMACEN","ADMIN","ADMINISTRADOR"].includes(aePerfilActual())}
function aePerfilImportarMateriales(){return ["JEFATURA","JEFATURA GENERAL","JEFATURA ALMACEN","ADMIN","ADMINISTRADOR"].includes(aePerfilActual())}
function aePerfilProduccionValorizada(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(aePerfilActual())}
function aePeriodoMesesMateriales(){return aeOpcionesPeriodo()}
function aePermisoUtilidadCuadrilla(){return typeof pmPermiso==="function"?pmPermiso("UTILIDAD CUADRILLA"):null}
function aePuedeUtilidadCuadrilla(){
  const permiso=aePermisoUtilidadCuadrilla();
  return !!permiso&&typeof pmPuede==="function"&&pmPuede("UTILIDAD CUADRILLA","VER")&&pmNorm(permiso.alcanceDatos||"SIN ACCESO")!=="SIN ACCESO";
}
function aePuedeCargarUtilidad(){return aePuedeUtilidadCuadrilla()&&typeof pmPuede==="function"&&pmPuede("UTILIDAD CUADRILLA","REGISTRAR")}
function aePuedeDescargarUtilidad(){return aePuedeUtilidadCuadrilla()&&typeof pmPuede==="function"&&pmPuede("UTILIDAD CUADRILLA","DESCARGAR")}

function mostrarAnalisisEconomico(){
  if(!aePerfilPermitido()){alert("No tienes acceso a Análisis Económico.");return}
  if(typeof limpiarPantalla==="function")limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");if(menu)menu.style.display="none";
  if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");
  if(!pantalla)return;
  pantalla.innerHTML=`
  <style>
    .ae184-home{max-width:1000px;margin:auto;padding:18px;color:#fff}
    .ae184-head{background:linear-gradient(110deg,#2563eb,#0f766e);padding:20px;border-radius:20px;margin-bottom:16px}
    .ae184-head h2{margin:0 0 4px}.ae184-head p{margin:0;opacity:.92}
    .ae184-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
    .ae184-option{background:#fff;color:#0f172a;border:2px solid #bfdbfe;border-radius:18px;padding:22px;cursor:pointer;box-shadow:0 10px 22px rgba(2,6,23,.18);min-height:145px;text-align:left}
    .ae184-option:hover{border-color:#2563eb;transform:translateY(-2px)}
    .ae184-option .ico{font-size:38px;display:block;margin-bottom:8px}.ae184-option b{font-size:20px}.ae184-option p{font-size:13px;color:#475569}
    @media(max-width:700px){.ae184-grid{grid-template-columns:1fr}}
  </style>
  <section class="ae184-home">
    <div class="ae184-head"><h2>📊 Análisis Económico</h2><p>Producción valorizada, materiales y utilidad mensual por cuadrilla.</p></div>
    <div class="ae184-grid">
      ${aePerfilProduccionValorizada()?`<button class="ae184-option" onclick="mostrarProduccionValorizada()"><span class="ico">💰</span><b>Producción valorizada</b><p>Valorización mensual, metas, sedes, cuadrillas y tipos de partida.</p></button>`:""}
      <button class="ae184-option" onclick="mostrarCostoMateriales()"><span class="ico">📦</span><b>Costo y consumo de materiales</b><p>Importación, consolidación por cuadrilla, tipo de trabajo, sede y costo total.</p></button>
      ${aePuedeUtilidadCuadrilla()?`<button class="ae184-option" onclick="mostrarUtilidadCuadrillas()"><span class="ico">📈</span><b>Utilidad por cuadrilla</b><p>Producción menos costos, bonos y penalidades WIN del mes.</p></button>`:""}
    </div>
  </section>`;
  window.scrollTo({top:0,behavior:"smooth"});
}

function mostrarCostoMateriales(){
  if(!aePerfilMateriales()){alert("No tienes permiso para consumo de materiales.");return}
  if(typeof limpiarPantalla==="function")limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");if(menu)menu.style.display="none";
  if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");if(!pantalla)return;
  pantalla.innerHTML=`
  <style>
    .mat184{max-width:1120px;margin:auto;padding:16px;color:#fff}.mat184-head{background:linear-gradient(110deg,#ea580c,#b45309);padding:18px;border-radius:18px}
    .mat184-head h2{margin:0}.mat184-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.mat184-tabs button,.mat184-btn{border:0;border-radius:10px;padding:11px 15px;font-weight:800;cursor:pointer;background:#0ea5e9;color:#fff}
    .mat184-tabs button{background:#334155}.mat184-tabs button.activo{background:#0ea5e9}
    .mat184-panel{background:#fff;color:#0f172a;border-radius:18px;padding:16px;box-shadow:0 10px 24px rgba(2,6,23,.25)}
    .mat184-grid{display:grid;grid-template-columns:200px 1fr;gap:12px;align-items:end}.mat184-grid label{font-weight:800;font-size:12px}.mat184-grid input,.mat184-grid select,.mat184-grid textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #94a3b8;border-radius:9px}
    .mat184-grid textarea{height:300px;font-family:monospace;white-space:pre}.mat184-status{margin-top:12px;padding:12px;border-radius:10px;background:#eff6ff}.mat184-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}.mat184-kpi{background:#e0f2fe;border-radius:12px;padding:14px}.mat184-kpi b{font-size:23px;display:block}
    .mat184-table{width:100%;border-collapse:collapse}.mat184-table th,.mat184-table td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}.mat184-table th{background:#f1f5f9}
    .mat184-tabs{align-items:center}.mat184-tabs .mat184-import-mini{margin-left:auto;background:#0ea5e9!important;padding:8px 11px;font-size:12px}.mat184-detalle-btn{border:0;border-radius:7px;padding:6px 9px;font-size:12px;font-weight:800;background:#334155;color:#fff;cursor:pointer}.mat184-detalle-fila{display:none;background:#f8fafc}.mat184-detalle-fila.visible{display:table-row}.mat184-detalle-wrap{padding:10px 6px}.mat184-subtabla{width:100%;border-collapse:collapse}.mat184-subtabla th,.mat184-subtabla td{padding:7px;border-bottom:1px solid #dbeafe;font-size:12px}.mat184-subtabla th{background:#e0f2fe}.mat184-filtros-resumen{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:end}.mat184-modal-fondo{position:fixed;inset:0;background:rgba(2,6,23,.78);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999}.mat184-modal{background:#fff;color:#0f172a;width:min(980px,96vw);max-height:90vh;overflow:auto;border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.45)}.mat184-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.mat184-cerrar{border:0;background:#475569;color:#fff;border-radius:9px;padding:8px 11px;font-weight:800;cursor:pointer}.mat184-cuadrilla-selector{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;margin:14px 0}.mat184-cuadrilla-selector select{width:100%;padding:10px;border:1px solid #94a3b8;border-radius:9px}.mat197-sede{margin:14px 0;border:1px solid #bfdbfe;border-radius:14px;overflow:hidden;background:#fff}.mat197-sede summary{list-style:none;cursor:pointer;padding:14px 16px;background:#e0f2fe;display:grid;grid-template-columns:minmax(180px,1.4fr) repeat(4,minmax(120px,1fr));gap:12px;align-items:center}.mat197-sede summary::-webkit-details-marker{display:none}.mat197-sede summary:before{content:"▶";font-size:12px;margin-right:8px}.mat197-sede[open] summary:before{content:"▼"}.mat197-sede-titulo{font-weight:900;font-size:16px}.mat197-sede-metrica span{display:block;font-size:11px;color:#475569}.mat197-sede-metrica b{font-size:15px}.mat197-participacion{font-weight:900}.mat197-barra{height:7px;background:#dbeafe;border-radius:999px;overflow:hidden;margin-top:4px}.mat197-barra i{display:block;height:100%;background:#0ea5e9}.mat197-tabla-wrap{overflow:auto;padding:10px 12px 14px}.mat197-tabla-wrap .mat184-table{min-width:850px}.mat261-actualizacion{margin-left:auto;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:7px 11px;min-width:190px;box-shadow:0 4px 12px rgba(2,6,23,.12);line-height:1.15}.mat261-actualizacion span{display:block;font-size:10px;font-weight:900;letter-spacing:.04em;color:#475569}.mat261-actualizacion b{display:block;margin-top:3px;font-size:12px}.mat261-ranking{margin-top:16px;border:1px solid #f59e0b;border-radius:14px;overflow:hidden;background:#fff}.mat261-ranking summary{cursor:pointer;list-style:none;padding:14px 16px;background:#fff7ed;font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:12px}.mat261-ranking summary::-webkit-details-marker{display:none}.mat261-ranking summary:after{content:"Mostrar ranking";font-size:12px;color:#fff;background:#b45309;border-radius:8px;padding:7px 10px}.mat261-ranking[open] summary:after{content:"Ocultar ranking"}.mat261-ranking-cuerpo{padding:12px;overflow:auto}.mat261-ranking-tabla{min-width:980px}.mat261-clasificacion{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;white-space:nowrap}.mat261-critico{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}.mat261-alto{background:#ffedd5;color:#9a3412;border:1px solid #fdba74}.mat261-atencion{background:#fef9c3;color:#854d0e;border:1px solid #fde047}.mat261-normal{background:#dcfce7;color:#166534;border:1px solid #86efac}.mat261-muestra{background:#f1f5f9;color:#475569;border:1px solid #cbd5e1}.mat261-variacion-positiva{color:#b91c1c;font-weight:900}.mat261-variacion-normal{color:#166534;font-weight:900}
    @media(max-width:700px){.mat184-grid{grid-template-columns:1fr}.mat184-kpis{grid-template-columns:1fr}.mat184-panel{padding:12px}.mat184-filtros-resumen{grid-template-columns:1fr 1fr}.mat184-tabs .mat184-import-mini{margin-left:0}.mat184-table{min-width:720px}.mat197-sede summary{grid-template-columns:1fr 1fr;padding:12px}.mat197-sede-titulo{grid-column:1/-1}.mat197-sede-metrica b{font-size:14px}.mat261-actualizacion{margin-left:0;min-width:0;width:100%;box-sizing:border-box}.mat261-ranking summary{padding:12px}.mat261-ranking summary:after{font-size:10px}}
  </style>
  <section class="mat184">
    <div class="mat184-head"><h2>📦 Costo y consumo de materiales</h2></div>
    <div class="mat184-tabs">
      <button id="matTabResumen" class="activo" onclick="mat184CambiarVista('resumen')">Resumen de consumo</button>
      <button id="matTabPromedio" onclick="mat184CambiarVista('promedio')">Promedio por cuadrilla</button>
      <button onclick="mostrarAnalisisEconomico()">Volver</button>
      <div id="mat261UltimaActualizacion" class="mat261-actualizacion"><span>ÚLTIMA ACTUALIZACIÓN</span><b>Consultando...</b></div>
      ${aePerfilImportarMateriales()?`<button id="matTabImportar" class="mat184-import-mini" onclick="mat184CambiarVista('importar')">Subir datos</button>`:""}
    </div>
    <div id="mat184Contenido"></div>
  </section>`;
  mat184CambiarVista("resumen");
}

function mat261ActualizarSelloMateriales(valor){
  const sello=document.getElementById("mat261UltimaActualizacion");
  if(!sello)return;
  const original=(valor||"Sin actualización registrada").toString();
  const texto=typeof formatearFechaHoraTextoPeruApp==="function"?formatearFechaHoraTextoPeruApp(original,false):original;
  sello.innerHTML=`<span>ÚLTIMA ACTUALIZACIÓN</span><b>${aeEscape(texto)}</b>`;
}

function mat261ClasificarPromedio(ordenes,promedio,promedioGeneral){
  const n=Number(ordenes)||0;
  const p=Number(promedio)||0;
  const g=Number(promedioGeneral)||0;
  const variacion=g>0?((p-g)/g)*100:0;
  if(n<10)return {clave:"muestra",texto:"⚪ Muestra insuficiente",variacion};
  if(variacion>=30)return {clave:"critico",texto:"🔴 Crítico",variacion};
  if(variacion>=15)return {clave:"alto",texto:"🟠 Alto",variacion};
  if(variacion>0)return {clave:"atencion",texto:"🟡 Atención",variacion};
  return {clave:"normal",texto:"🟢 Normal",variacion};
}

function mat261RenderRankingMateriales(datos){
  const general=Number(datos?.promedioGeneralOrden)||0;
  const cuadrillas=(datos?.porCuadrilla||[]).slice().sort((a,b)=>{
    const pa=Number(a.costoPromedioOrden)||0;
    const pb=Number(b.costoPromedioOrden)||0;
    return pb-pa || (Number(b.costo)||0)-(Number(a.costo)||0) || String(a.cuadrilla||"").localeCompare(String(b.cuadrilla||""),undefined,{numeric:true});
  });
  const filas=cuadrillas.map((x,i)=>{
    const clas=mat261ClasificarPromedio(x.ordenesFinalizadas,x.costoPromedioOrden,general);
    const variacion=general>0?`${clas.variacion>=0?"+":""}${clas.variacion.toFixed(1)}%`:"—";
    const claseVar=clas.variacion>0?"mat261-variacion-positiva":"mat261-variacion-normal";
    const promedio=Number(x.ordenesFinalizadas)>0?aeMoneda(x.costoPromedioOrden):"Sin órdenes";
    return `<tr>
      <td><b>${i+1}</b></td>
      <td>${aeEscape(x.sede||"SIN SEDE")}</td>
      <td>${aeEscape(x.cuadrilla||"SIN CUADRILLA")}</td>
      <td>${aeMoneda(x.costo)}</td>
      <td>${aeNumero(x.ordenesFinalizadas)}</td>
      <td><b>${promedio}</b></td>
      <td class="${claseVar}">${variacion}</td>
      <td><span class="mat261-clasificacion mat261-${clas.clave}">${clas.texto}</span></td>
    </tr>`;
  }).join("");
  return `<details class="mat261-ranking">
    <summary><span>📊 Ranking de gasto promedio por cuadrilla</span></summary>
    <div class="mat261-ranking-cuerpo">
      <div class="mat184-status" style="margin:0 0 10px">Ordenado de mayor a menor costo promedio por orden. La clasificación compara cada cuadrilla con el promedio general filtrado (${general>0?aeMoneda(general):"sin promedio disponible"}). Las cuadrillas con menos de 10 órdenes se identifican como muestra insuficiente.</div>
      <table class="mat184-table mat261-ranking-tabla"><thead><tr><th>Puesto</th><th>Sede</th><th>Cuadrilla</th><th>Costo total</th><th>Órdenes finalizadas</th><th>Promedio por orden</th><th>Variación</th><th>Clasificación</th></tr></thead><tbody>${filas||'<tr><td colspan="8">Sin información</td></tr>'}</tbody></table>
    </div>
  </details>`;
}

function mat184CambiarVista(vista){
  if(vista==="importar"&&!aePerfilImportarMateriales()){
    alert("Este perfil tiene acceso de consulta, pero no puede subir datos de materiales.");
    vista="resumen";
  }
  document.getElementById("matTabImportar")?.classList.toggle("activo",vista==="importar");
  document.getElementById("matTabResumen")?.classList.toggle("activo",vista==="resumen");
  document.getElementById("matTabPromedio")?.classList.toggle("activo",vista==="promedio");
  if(vista==="importar")mat184RenderImportar();
  else if(vista==="promedio")mat184RenderPromedio();
  else mat184RenderResumen();
}

function mat184RenderImportar(){
  const hoy=new Date().toISOString().slice(0,10);
  document.getElementById("mat184Contenido").innerHTML=`
    <div class="mat184-panel">
      <div class="mat184-grid">
        <label>Fecha de referencia<input id="mat184Fecha" type="date" value="${hoy}"></label>
        <div><b>Base original</b><small style="display:block;color:#64748b">Debe incluir las columnas Técnico, Comentario y materiales.</small></div>
      </div>
      <textarea id="mat184Texto" style="width:100%;height:330px;margin-top:12px;box-sizing:border-box;border:1px solid #94a3b8;border-radius:10px;padding:10px;font-family:monospace" placeholder="Pegue aquí la base desde Excel o Google Sheets..."></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="mat184-btn" onclick="mat184Procesar()">Procesar materiales</button>
        <button class="mat184-btn" style="background:#475569" onclick="mat184CrearHojas()">Crear/verificar hojas</button>
      </div>
      <div id="mat184Estado" class="mat184-status">Listo para recibir información.</div>
    </div>`;
}

async function mat184CrearHojas(){
  const est=document.getElementById("mat184Estado");if(est)est.textContent="Verificando hojas...";
  try{
    const r=await aeApiMateriales({accion:"asegurarHojasMateriales",usuario:localStorage.getItem("usuario")});
    if(est)est.innerHTML=`✅ Hojas listas: <b>${r.hojas.map(aeEscape).join(", ")}</b>`;
  }catch(e){if(est)est.textContent="❌ "+e.message}
}

async function mat184Procesar(){
  const texto=document.getElementById("mat184Texto")?.value||"";
  const fechaReferencia=document.getElementById("mat184Fecha")?.value||"";
  const est=document.getElementById("mat184Estado");
  if(!texto.trim()){alert("Pegue primero la base de materiales.");return}
  if(est)est.textContent="Procesando y consolidando por cuadrilla...";
  try{
    const r=await aeApiMateriales({accion:"procesarImportacionMateriales",usuario:localStorage.getItem("usuario"),fechaReferencia,texto});
    const noEncontrados=(r.tecnicosNoEncontrados||[]);
    const ambiguos=(r.tecnicosAmbiguos||[]);
    const invalidos=(r.valoresInvalidos||[]);
    if(est)est.innerHTML=`
      <b>✅ Importación procesada</b><br>
      Filas origen: ${r.filasOrigen}<br>
      Registros consolidados: ${r.filasConsolidadas}<br>
      Técnicos no encontrados: ${noEncontrados.length}${noEncontrados.length?`<br><small>${noEncontrados.map(aeEscape).join(" · ")}</small>`:""}<br>
      Técnicos ambiguos: ${ambiguos.length}${ambiguos.length?`<br><small>${ambiguos.map(aeEscape).join(" · ")}</small>`:""}<br>
      Valores no numéricos ignorados: ${r.totalInvalidos||0}${invalidos.length?`<br><small>${invalidos.map(x=>`Fila ${x.fila}: ${aeEscape(x.tecnico)} / ${aeEscape(x.material)} = ${aeEscape(x.valor)}`).join("<br>")}</small>`:""}`;
    document.getElementById("mat184Texto").value="";
    mat261ActualizarSelloMateriales(r.ultimaActualizacionTexto);
  }catch(e){if(est)est.textContent="❌ "+e.message}
}

function mat184RenderResumen(){
  document.getElementById("mat184Contenido").innerHTML=`
    <div class="mat184-panel">
      <div class="mat184-filtros-resumen">
        <label>Periodo<select id="mat184Periodo">${aePeriodoMesesMateriales()}</select></label>
        <label>Sede<select id="mat184Sede"><option>TODAS</option><option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option></select></label>
        <label>Tipo<select id="mat184Tipo"><option>TODOS</option><option>INSTALACION</option><option>VISITA TECNICA</option></select></label>
        <label>Insumo<select id="mat184Insumo"><option value="TODOS">TODOS</option></select></label>
        <button class="mat184-btn" onclick="mat184ConsultarResumen()">Consultar</button>
        <button class="mat184-btn" style="background:#475569" onclick="mat184AbrirConsultaCuadrilla()">Consultar cuadrilla</button>
      </div>
      <div id="mat184Resumen"><div class="mat184-status">Seleccione filtros y consulte.</div></div>
    </div>`;
  document.getElementById("mat184Periodo").value=aePeriodoActual();
  mat184ConsultarResumen();
}

function mat184ToggleDetalle(btn,id){
  const fila=document.getElementById(id);if(!fila)return;
  const abierto=fila.classList.toggle("visible");
  btn.textContent=abierto?"Ocultar":"Detalle";
}

function mat184RenderPromedio(){
  document.getElementById("mat184Contenido").innerHTML=`
    <div class="mat184-panel">
      <div class="mat184-filtros-resumen">
        <label>Periodo<select id="mat184Periodo">${aePeriodoMesesMateriales()}</select></label>
        <label>Sede<select id="mat184Sede"><option>TODAS</option><option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option></select></label>
        <label>Tipo<select id="mat184Tipo"><option>TODOS</option><option>INSTALACION</option><option>VISITA TECNICA</option></select></label>
        <label>Insumo<select id="mat184Insumo"><option value="TODOS">TODOS</option></select></label>
        <button class="mat184-btn" onclick="mat184ConsultarPromedio()">Consultar</button>
      </div>
      <div id="mat184Promedio" class="mat184-status">Consultando costo promedio por orden finalizada...</div>
    </div>`;
  mat184ConsultarPromedio();
}

async function mat184ConsultarPromedio(){
  const c=document.getElementById("mat184Promedio");
  if(c)c.innerHTML='<div class="mat184-status">Cruzando consumo con órdenes finalizadas...</div>';
  try{
    const r=await aeApiMateriales({
      accion:"obtenerResumenMateriales",
      usuario:localStorage.getItem("usuario"),
      periodo:document.getElementById("mat184Periodo")?.value||"",
      sede:document.getElementById("mat184Sede")?.value||"TODAS",
      tipoTrabajo:document.getElementById("mat184Tipo")?.value||"TODOS",
      material:document.getElementById("mat184Insumo")?.value||"TODOS"
    });
    mat184UltimoResumen=r;
    mat261ActualizarSelloMateriales(r.ultimaActualizacionTexto);
    const sel=document.getElementById("mat184Insumo");
    if(sel){
      const valor=sel.value||"TODOS";
      sel.innerHTML='<option value="TODOS">TODOS</option>'+(r.materiales||[]).map(m=>`<option value="${aeEscape(m)}">${aeEscape(m)}</option>`).join("");
      if([...sel.options].some(o=>o.value===valor))sel.value=valor;
    }
    const grupos={};
    (r.porCuadrilla||[]).forEach(x=>{
      const sede=(x.sede||"SIN SEDE").toString();
      if(!grupos[sede])grupos[sede]={sede,costo:0,ordenes:0,cuadrillas:[]};
      grupos[sede].costo+=Number(x.costo)||0;
      grupos[sede].ordenes+=Number(x.ordenesFinalizadas)||0;
      grupos[sede].cuadrillas.push(x);
    });
    const sedes=Object.values(grupos).sort((a,b)=>b.costo-a.costo);
    const bloques=sedes.map((g,indice)=>{
      const promedioSede=g.ordenes>0?g.costo/g.ordenes:0;
      const participacionGeneral=Number(r.costoTotal)>0?(g.costo/Number(r.costoTotal))*100:0;
      const filas=g.cuadrillas.sort((a,b)=>b.costo-a.costo).map(x=>{
        const participacionSede=g.costo>0?(Number(x.costo)/g.costo)*100:0;
        return `<tr>
          <td>${aeEscape(x.cuadrilla)}</td>
          <td>${aeMoneda(x.costo)}</td>
          <td>${aeNumero(x.ordenesFinalizadas)}</td>
          <td><b>${x.ordenesFinalizadas>0?aeMoneda(x.costoPromedioOrden):'Sin órdenes finalizadas'}</b></td>
          <td class="mat197-participacion">${participacionSede.toFixed(2)}%<div class="mat197-barra"><i style="width:${Math.min(participacionSede,100).toFixed(2)}%"></i></div></td>
        </tr>`;
      }).join("");
      return `<details class="mat197-sede" ${indice===0?'open':''}>
        <summary>
          <div class="mat197-sede-titulo">${aeEscape(g.sede)} · ${g.cuadrillas.length} cuadrilla${g.cuadrillas.length===1?'':'s'}</div>
          <div class="mat197-sede-metrica"><span>Costo total sede</span><b>${aeMoneda(g.costo)}</b></div>
          <div class="mat197-sede-metrica"><span>Órdenes finalizadas</span><b>${aeNumero(g.ordenes)}</b></div>
          <div class="mat197-sede-metrica"><span>Promedio por orden</span><b>${g.ordenes>0?aeMoneda(promedioSede):'Sin órdenes'}</b></div>
          <div class="mat197-sede-metrica"><span>% del costo general</span><b>${participacionGeneral.toFixed(2)}%</b></div>
        </summary>
        <div class="mat197-tabla-wrap"><table class="mat184-table"><thead><tr><th>Cuadrilla</th><th>Costo total</th><th>Órdenes finalizadas</th><th>Costo promedio por orden</th><th>% del costo de la sede</th></tr></thead><tbody>${filas||'<tr><td colspan="5">Sin información</td></tr>'}</tbody></table></div>
      </details>`;
    }).join("");
    c.innerHTML=`
      <div class="mat184-kpis">
        <div class="mat184-kpi"><span>Costo total filtrado</span><b>${aeMoneda(r.costoTotal)}</b></div>
        <div class="mat184-kpi"><span>Órdenes finalizadas</span><b>${aeNumero(r.totalOrdenesFinalizadas)}</b></div>
        <div class="mat184-kpi"><span>Promedio general por orden</span><b>${r.totalOrdenesFinalizadas>0?aeMoneda(r.promedioGeneralOrden):'Sin órdenes finalizadas'}</b></div>
      </div>
      <h3>Promedio por sede y cuadrilla</h3>
      <div class="mat184-status" style="margin-bottom:10px">Cada sede consolida el costo y las órdenes de todas sus cuadrillas. Abra una sede para comparar cuánto representa cada cuadrilla dentro del costo total de esa sede.</div>
      ${bloques||'<div class="mat184-status">Sin información</div>'}
      ${mat261RenderRankingMateriales(r)}`;
  }catch(e){if(c)c.innerHTML='<div class="mat184-status">❌ '+aeEscape(e.message)+'</div>'}
}

let mat184UltimoResumen=null;

function mat184AbrirConsultaCuadrilla(){
  const datos=mat184UltimoResumen;
  if(!datos||!(datos.porCuadrilla||[]).length){
    alert("Primero pulse Consultar para cargar la información del periodo seleccionado.");
    return;
  }
  const opciones=(datos.porCuadrilla||[]).map((x,i)=>`<option value="${i}">${aeEscape(x.cuadrilla)} · ${aeEscape(x.sede)}</option>`).join("");
  const fondo=document.createElement("div");
  fondo.id="mat184ModalCuadrilla";
  fondo.className="mat184-modal-fondo";
  fondo.innerHTML=`<div class="mat184-modal" onclick="event.stopPropagation()">
    <div class="mat184-modal-head"><div><h3 style="margin:0">Consulta por cuadrilla</h3><small>Detalle completo del periodo y filtros seleccionados</small></div><button class="mat184-cerrar" onclick="mat184CerrarConsultaCuadrilla()">Cerrar</button></div>
    <div class="mat184-cuadrilla-selector"><label><b>Cuadrilla</b><select id="mat184CuadrillaSeleccionada">${opciones}</select></label><button class="mat184-btn" onclick="mat184MostrarCuadrillaSeleccionada()">Ver detalle</button></div>
    <div id="mat184DetalleCuadrilla"></div>
  </div>`;
  fondo.onclick=mat184CerrarConsultaCuadrilla;
  document.body.appendChild(fondo);
  mat184MostrarCuadrillaSeleccionada();
}

function mat184CerrarConsultaCuadrilla(){
  document.getElementById("mat184ModalCuadrilla")?.remove();
}

function mat184MostrarCuadrillaSeleccionada(){
  const datos=mat184UltimoResumen;
  const indice=Number(document.getElementById("mat184CuadrillaSeleccionada")?.value||0);
  const x=(datos?.porCuadrilla||[])[indice];
  const cont=document.getElementById("mat184DetalleCuadrilla");
  if(!x||!cont)return;
  const detalle=(x.detalle||[]).map(d=>`<tr><td>${aeEscape(d.material)}</td><td>${aeNumero(d.cantidad)}</td><td>${aeMoneda(d.precioUnitario)}</td><td>${aeMoneda(d.costo)}</td></tr>`).join("");
  cont.innerHTML=`
    <div class="mat184-kpis">
      <div class="mat184-kpi"><span>Costo total</span><b>${aeMoneda(x.costo)}</b></div>
      <div class="mat184-kpi"><span>Órdenes finalizadas</span><b>${aeNumero(x.ordenesFinalizadas)}</b></div>
      <div class="mat184-kpi"><span>Costo promedio por orden</span><b>${x.ordenesFinalizadas>0?aeMoneda(x.costoPromedioOrden):"Sin órdenes finalizadas"}</b></div>
    </div>
    <div class="mat184-kpis">
      <div class="mat184-kpi"><span>Cuadrilla</span><b style="font-size:16px">${aeEscape(x.cuadrilla)}</b></div>
      <div class="mat184-kpi"><span>Sede</span><b style="font-size:18px">${aeEscape(x.sede)}</b></div>
      <div class="mat184-kpi"><span>Cantidad total</span><b>${aeNumero(x.cantidad)}</b></div>
    </div>
    <h3>Detalle completo de insumos</h3>
    <div style="overflow:auto"><table class="mat184-table"><thead><tr><th>Insumo</th><th>Cantidad</th><th>Costo unitario</th><th>Costo total</th></tr></thead><tbody>${detalle||'<tr><td colspan="4">Sin detalle</td></tr>'}</tbody></table></div>`;
}

async function mat184ConsultarResumen(){
  const c=document.getElementById("mat184Resumen");if(c)c.innerHTML='<div class="mat184-status">Calculando consumo...</div>';
  try{
    const r=await aeApiMateriales({
      accion:"obtenerResumenMateriales",
      usuario:localStorage.getItem("usuario"),
      periodo:document.getElementById("mat184Periodo")?.value||"",
      sede:document.getElementById("mat184Sede")?.value||"TODAS",
      tipoTrabajo:document.getElementById("mat184Tipo")?.value||"TODOS",
      material:document.getElementById("mat184Insumo")?.value||"TODOS"
    });
    mat184UltimoResumen=r;
    mat261ActualizarSelloMateriales(r.ultimaActualizacionTexto);
    const sel=document.getElementById("mat184Insumo");
    if(sel){
      const valor=sel.value||"TODOS";
      sel.innerHTML='<option value="TODOS">TODOS</option>'+(r.materiales||[]).map(m=>`<option value="${aeEscape(m)}">${aeEscape(m)}</option>`).join("");
      if([...sel.options].some(o=>o.value===valor))sel.value=valor;
    }
    const filas=(r.porCuadrilla||[]).map((x,i)=>{
      const id=`matDet${i}`;
      const detalle=(x.detalle||[]).map(d=>`<tr><td>${aeEscape(d.material)}</td><td>${aeNumero(d.cantidad)}</td><td>${aeMoneda(d.precioUnitario)}</td><td>${aeMoneda(d.costo)}</td></tr>`).join("");
      return `<tr><td>${aeEscape(x.cuadrilla)}</td><td>${aeEscape(x.sede)}</td><td>${aeNumero(x.cantidad)}</td><td>${aeMoneda(x.costo)}</td><td><button class="mat184-detalle-btn" onclick="mat184ToggleDetalle(this,'${id}')">Detalle</button></td></tr><tr id="${id}" class="mat184-detalle-fila"><td colspan="5"><div class="mat184-detalle-wrap"><table class="mat184-subtabla"><thead><tr><th>Insumo</th><th>Cantidad</th><th>Costo unitario</th><th>Costo total</th></tr></thead><tbody>${detalle||'<tr><td colspan="4">Sin detalle</td></tr>'}</tbody></table></div></td></tr>`;
    }).join("");
    c.innerHTML=`
      <div class="mat184-kpis">
        <div class="mat184-kpi"><span>Costo total</span><b>${aeMoneda(r.costoTotal)}</b></div>
        <div class="mat184-kpi"><span>Registros</span><b>${aeNumero(r.registros)}</b></div>
        <div class="mat184-kpi"><span>Cuadrillas</span><b>${aeNumero((r.porCuadrilla||[]).length)}</b></div>
      </div>
      <h3>Consumo por cuadrilla</h3>
      <div style="overflow:auto"><table class="mat184-table"><thead><tr><th>Cuadrilla</th><th>Sede</th><th>Cantidad</th><th>Costo</th><th></th></tr></thead><tbody>${filas||'<tr><td colspan="5">Sin información</td></tr>'}</tbody></table></div>`;
  }catch(e){if(c)c.innerHTML='<div class="mat184-status">❌ '+aeEscape(e.message)+'</div>'}
}

// MI VISUAL v70 - Módulo Análisis Económico
const API_ANALISIS_ECONOMICO = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

function aePerfilPermitido(){
  return aePerfilMateriales();
}
function aeMoneda(v){return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",minimumFractionDigits:2}).format(Number(v)||0)}
function aeNumero(v){return new Intl.NumberFormat("es-PE",{maximumFractionDigits:2}).format(Number(v)||0)}
function aePorcentaje(v){return `${((Number(v)||0)*100).toFixed(1)}%`}
function aeClaseCumplimiento(v){const p=(Number(v)||0)*100;if(p>=100)return"ae-ok";if(p>=90)return"ae-alerta";return"ae-bajo"}
function aePeriodoActual(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function aeOpcionesPeriodo(){const o=[],b=new Date();for(let i=0;i<18;i++){const d=new Date(b.getFullYear(),b.getMonth()-i,1),v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,l=d.toLocaleDateString("es-PE",{month:"long",year:"numeric"}).toUpperCase();o.push(`<option value="${v}">${l}</option>`)}return o.join("")}

function mostrarProduccionValorizada(){
  if(!aePerfilProduccionValorizada()){alert("La producción valorizada es exclusiva para Jefatura general.");return}
  if(typeof limpiarPantalla==="function")limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");if(menu)menu.style.display="none";
  if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");
  pantalla.innerHTML=`<section class="ae-modulo"><div class="ae-encabezado"><div><div class="ae-etiqueta">JEFATURA · ZONA NORTE</div><h2>💰 Análisis Económico</h2><p>Valorización mensual de los trabajos ejecutados.</p></div></div><div class="ae-filtros"><label>Periodo mensual<select id="aePeriodo">${aeOpcionesPeriodo()}</select></label><button id="aeConsultar" onclick="consultarAnalisisEconomico()">Consultar</button></div><div id="aeResultado"><div class="ae-cargando">Seleccione el periodo y pulse Consultar.</div></div></section>`;
  document.getElementById("aePeriodo").value=aePeriodoActual();consultarAnalisisEconomico();window.scrollTo({top:0,behavior:"smooth"});
}

async function consultarAnalisisEconomico(){
  const periodo=document.getElementById("aePeriodo")?.value||aePeriodoActual(),resultado=document.getElementById("aeResultado"),boton=document.getElementById("aeConsultar");
  resultado.innerHTML='<div class="ae-cargando">Calculando valorización mensual...</div>';if(boton){boton.disabled=true;boton.textContent="Consultando..."}
  try{const r=await fetch(API_ANALISIS_ECONOMICO,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({accion:"obtenerAnalisisEconomico",usuario:localStorage.getItem("usuario"),periodo})});const data=await r.json();if(!data.ok)throw new Error(data.error||"No se pudo obtener el análisis económico");renderAnalisisEconomico(data)}catch(err){resultado.innerHTML=`<div class="ae-error"><b>No se pudo cargar el análisis económico.</b><br>${String(err.message||err)}</div>`}finally{if(boton){boton.disabled=false;boton.textContent="Consultar"}}
}

function aeTarjeta(titulo,valor,subtexto,clase=""){return`<article class="ae-kpi ${clase}"><span>${titulo}</span><strong>${valor}</strong><small>${subtexto||""}</small></article>`}
function aeNombreFila(x,tipo){if(tipo==="sede")return x.sede||"SIN SEDE";if(tipo==="cuadrilla")return x.cuadrilla||"SIN CUADRILLA";if(tipo==="plataforma")return x.plataforma||"SIN PLATAFORMA";if(tipo==="tipo")return x.tipoOrden||"SIN PARTIDA";if(tipo==="dia")return x.fecha||x.fechaClave||"SIN FECHA";return x.clave||"SIN DATO"}
function aeDetalleFila(x,tipo){
  const partes=[`<div><span>Órdenes</span><b>${aeNumero(x.cantidad)}</b></div>`,`<div><span>Ticket promedio</span><b>${aeMoneda(x.ticketPromedio)}</b></div>`];
  if(x.meta>0){partes.push(`<div><span>Meta</span><b>${aeMoneda(x.meta)}</b></div>`,`<div><span>Cumplimiento</span><b>${aePorcentaje(x.cumplimiento)}</b></div>`)}
  if(tipo==="cuadrilla"){partes.push(`<div><span>Plataforma</span><b>${x.plataforma||"-"}</b></div>`,`<div><span>Sede</span><b>${x.sede||"-"}</b></div>`)}
  if(tipo==="tipo"&&x.plataforma)partes.push(`<div><span>Plataforma</span><b>${x.plataforma}</b></div>`);
  if(tipo==="dia")partes.push(`<div><span>Fecha</span><b>${x.fecha||"-"}</b></div>`);
  return partes.join("");
}
function aeFilas(lista,tipo){
  if(!Array.isArray(lista)||!lista.length)return'<div class="ae-vacio">Sin información para este periodo.</div>';
  return lista.map((x,i)=>{const nombre=aeNombreFila(x,tipo),meta=x.meta>0?`<small>Meta ${aeMoneda(x.meta)} · ${aePorcentaje(x.cumplimiento)}</small>`:"";return`<div class="ae-fila ae-fila-${tipo} ${x.meta>0?aeClaseCumplimiento(x.cumplimiento):""}"><div class="ae-fila-pos">${i+1}</div><div class="ae-fila-info"><b class="ae-fila-titulo">${nombre}</b><span>${aeNumero(x.cantidad)} órdenes</span>${meta}</div><div class="ae-fila-monto">${aeMoneda(x.monto)}</div><button class="ae-detalle-btn" onclick="aeToggleDetalle(this)">Ver detalle</button><div class="ae-detalle">${aeDetalleFila(x,tipo)}</div></div>`}).join("")
}
function aeToggleDetalle(btn){const detalle=btn.nextElementSibling,abierto=detalle.classList.toggle("visible");btn.textContent=abierto?"Ocultar detalle":"Ver detalle";btn.closest(".ae-fila")?.classList.toggle("detalle-abierto",abierto)}
function aeToggleSeccion(btn){const cuerpo=btn.closest(".ae-seccion")?.querySelector(".ae-seccion-cuerpo"),abierto=cuerpo?.classList.toggle("visible");btn.textContent=abierto?"Ocultar":"Mostrar";btn.closest(".ae-seccion")?.classList.toggle("seccion-abierta",!!abierto)}
function aeSeccion(titulo,contenido,abierta=true){return`<div class="ae-seccion ${abierta?"seccion-abierta":""}"><div class="ae-seccion-cabecera"><h3>${titulo}</h3><button onclick="aeToggleSeccion(this)">${abierta?"Ocultar":"Mostrar"}</button></div><div class="ae-seccion-cuerpo ${abierta?"visible":""}">${contenido}</div></div>`}

function aeNormalizarSedeDiaria(v){
  return String(v||"SIN SEDE").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()||"SIN SEDE";
}
function aeOrdenSedesDiarias(a,b){
  const orden={"CHICLAYO":1,"PIURA":2,"TRUJILLO":3,"SIN SEDE":99};
  return (orden[aeNormalizarSedeDiaria(a)]||50)-(orden[aeNormalizarSedeDiaria(b)]||50)||String(a).localeCompare(String(b));
}
function aeDetalleDiarioLista(data){
  const nuevo=Array.isArray(data?.detalleDiarioProgramacion)?data.detalleDiarioProgramacion:[];
  if(nuevo.length)return nuevo;
  const anterior=Array.isArray(data?.porDiaSede)?data.porDiaSede:[];
  return anterior.map(x=>{
    const sede=aeNormalizarSedeDiaria(x.sede),total=aeTotalCuadrillasDiarias(data,sede),monto=Number(x.monto)||0;
    return {...x,sede,totalCuadrillas:total,cuadrillasProgramadas:total,cuadrillasConProduccion:monto>0?total:0,cuadrillasConDescanso:0,cuadrillasProgramadasSinProduccion:monto>0?0:total,metaDiaria:total*500,cumplimientoDiario:total?monto/(total*500):0,promedioCuadrillaProduccion:total?monto/total:0};
  });
}
function aeListaSedesDiarias(lista){
  return [...new Set((Array.isArray(lista)?lista:[]).map(x=>aeNormalizarSedeDiaria(x.sede)))].sort(aeOrdenSedesDiarias);
}
function aeCuadrillasActivasDiarias(data){
  const lista=Array.isArray(data?.porCuadrilla)?data.porCuadrilla:[];
  return lista.filter(x=>/^P\d+\b/i.test(String(x.cuadrilla||"")));
}
function aeTotalCuadrillasDiarias(data,sede="TODAS"){
  const cuadrillas=aeCuadrillasActivasDiarias(data);
  if(sede==="TODAS")return cuadrillas.length;
  return cuadrillas.filter(x=>aeNormalizarSedeDiaria(x.sede)===aeNormalizarSedeDiaria(sede)).length;
}
function aeResumenSedeDiaria(lista,sede,data){
  const registros=(Array.isArray(lista)?lista:[]).filter(x=>aeNormalizarSedeDiaria(x.sede)===aeNormalizarSedeDiaria(sede));
  const monto=registros.reduce((t,x)=>t+(Number(x.monto)||0),0);
  const cuadrillas=registros.length?Math.max(...registros.map(x=>Number(x.totalCuadrillas)||0)):aeTotalCuadrillasDiarias(data,sede);
  const jornadasProgramadas=registros.reduce((t,x)=>t+(Number(x.cuadrillasProgramadas)||0),0);
  const jornadasProduccion=registros.reduce((t,x)=>t+(Number(x.cuadrillasConProduccion)||0),0);
  const jornadasDescanso=registros.reduce((t,x)=>t+(Number(x.cuadrillasConDescanso)||0),0);
  const metaMensual=cuadrillas*(Number(data?.parametrosMeta?.metaMensualCuadrilla)||13000);
  const mejor=registros.reduce((m,x)=>!m||Number(x.monto)>Number(m.monto)?x:m,null);
  return {
    sede:aeNormalizarSedeDiaria(sede),monto,cuadrillas,jornadasProgramadas,jornadasProduccion,jornadasDescanso,metaMensual,
    cumplimiento:metaMensual?monto/metaMensual:0,
    promedioProduccion:jornadasProduccion?monto/jornadasProduccion:0,
    mejor
  };
}
function aeTarjetasResumenDiario(lista,sedes,data){
  if(!sedes.length)return '<div class="ae-vacio">Sin información diaria por sede para este periodo.</div>';
  return `<div class="ae-diario-resumen">${sedes.map(s=>{
    const r=aeResumenSedeDiaria(lista,s,data);
    const mejor=r.mejor?`${aeEscape(r.mejor.fecha||r.mejor.fechaClave||"-")} · ${aeMoneda(r.mejor.monto)}`:"Sin producción";
    return `<article class="ae-diario-kpi"><span>${aeEscape(r.sede)}</span><strong>${aeMoneda(r.monto)}</strong><small>Meta mensual: <b>${aeMoneda(r.metaMensual)}</b></small><small>Cumplimiento: <b>${aePorcentaje(r.cumplimiento)}</b></small><small>Cuadrillas: <b>${aeNumero(r.cuadrillas)}</b></small><small>Jornadas programadas: <b>${aeNumero(r.jornadasProgramadas)}</b></small><small>Jornadas con producción: <b>${aeNumero(r.jornadasProduccion)}</b></small><small>Jornadas de descanso: <b>${aeNumero(r.jornadasDescanso)}</b></small><small>Promedio por cuadrilla con producción: <b>${aeMoneda(r.promedioProduccion)}</b></small><em>Mejor día: ${mejor}</em></article>`;
  }).join("")}</div>`;
}
function aeTablaDiariaTodas(lista,sedes,data){
  const fechas=[...new Set(lista.map(x=>String(x.fechaClave||"")))].filter(Boolean).sort();
  if(!fechas.length)return '<div class="ae-vacio">Sin información diaria por sede para este periodo.</div>';
  const mapa={};
  lista.forEach(x=>{
    const f=String(x.fechaClave||""),s=aeNormalizarSedeDiaria(x.sede);
    if(!mapa[f])mapa[f]={fecha:x.fecha||f,sedes:{},cuadrillasProgramadas:0,cuadrillasConProduccion:0,cuadrillasConDescanso:0,cuadrillasProgramadasSinProduccion:0,metaDiaria:0};
    mapa[f].sedes[s]=(mapa[f].sedes[s]||0)+(Number(x.monto)||0);
    mapa[f].cuadrillasProgramadas+=Number(x.cuadrillasProgramadas)||0;
    mapa[f].cuadrillasConProduccion+=Number(x.cuadrillasConProduccion)||0;
    mapa[f].cuadrillasConDescanso+=Number(x.cuadrillasConDescanso)||0;
    mapa[f].cuadrillasProgramadasSinProduccion+=Number(x.cuadrillasProgramadasSinProduccion)||0;
    mapa[f].metaDiaria+=Number(x.metaDiaria)||0;
  });
  const cab=sedes.map(s=>`<th>${aeEscape(s)}</th>`).join("");
  const filas=fechas.map(f=>{
    const r=mapa[f]||{},total=sedes.reduce((t,s)=>t+(Number(r.sedes?.[s])||0),0),meta=Number(r.metaDiaria)||0;
    const cumplimiento=meta?total/meta:0,promedio=(Number(r.cuadrillasConProduccion)||0)?total/Number(r.cuadrillasConProduccion):0;
    return `<tr><td>${aeEscape(r.fecha||f)}</td>${sedes.map(s=>`<td>${aeMoneda(r.sedes?.[s]||0)}</td>`).join("")}<td><b>${aeMoneda(total)}</b></td><td>${aeNumero(r.cuadrillasProgramadas)}</td><td><b>${aeNumero(r.cuadrillasConProduccion)}</b></td><td>${aeNumero(r.cuadrillasConDescanso)}</td><td>${aeNumero(r.cuadrillasProgramadasSinProduccion)}</td><td>${aeMoneda(meta)}</td><td><b>${aePorcentaje(cumplimiento)}</b></td><td><b>${aeMoneda(promedio)}</b></td></tr>`;
  }).join("");
  return `<div class="ae-diario-tabla-wrap"><table class="ae-diario-tabla"><thead><tr><th>Fecha</th>${cab}<th>Total diario</th><th>Cuadrillas programadas</th><th>Con producción</th><th>Con descanso</th><th>Programadas sin producción</th><th>Meta diaria</th><th>Cumplimiento</th><th>Promedio por cuadrilla con producción</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}
function aeTablaDiariaSede(lista,sede,data){
  const registros=lista.filter(x=>aeNormalizarSedeDiaria(x.sede)===aeNormalizarSedeDiaria(sede)).sort((a,b)=>String(a.fechaClave||"").localeCompare(String(b.fechaClave||"")));
  if(!registros.length)return '<div class="ae-vacio">Sin información para la sede seleccionada.</div>';
  let acumulado=0;
  const filas=registros.map(x=>{
    const monto=Number(x.monto)||0,meta=Number(x.metaDiaria)||0,conProduccion=Number(x.cuadrillasConProduccion)||0;
    acumulado+=monto;
    return `<tr><td>${aeEscape(x.fecha||x.fechaClave||"-")}</td><td>${aeMoneda(monto)}</td><td>${aeNumero(x.cantidad)} órdenes</td><td>${aeNumero(x.cuadrillasProgramadas)}</td><td><b>${aeNumero(conProduccion)}</b></td><td>${aeNumero(x.cuadrillasConDescanso)}</td><td>${aeNumero(x.cuadrillasProgramadasSinProduccion)}</td><td>${aeMoneda(meta)}</td><td><b>${aePorcentaje(meta?monto/meta:0)}</b></td><td><b>${aeMoneda(conProduccion?monto/conProduccion:0)}</b></td><td>${aeMoneda(acumulado)}</td></tr>`;
  }).join("");
  return `<div class="ae-diario-tabla-wrap"><table class="ae-diario-tabla"><thead><tr><th>Fecha</th><th>Monto diario</th><th>Órdenes</th><th>Cuadrillas programadas</th><th>Con producción</th><th>Con descanso</th><th>Programadas sin producción</th><th>Meta diaria</th><th>Cumplimiento</th><th>Promedio por cuadrilla con producción</th><th>Acumulado</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}
function aeVistaMontoDiarioSede(data,sede="TODAS"){
  const lista=aeDetalleDiarioLista(data);
  const sedes=aeListaSedesDiarias(lista);
  if(!lista.length)return '<div class="ae-vacio">No se recibió el detalle diario vinculado con Programación de Descansos. Actualice también Code.gs y realice un nuevo despliegue de Apps Script.</div>';
  if(sede==="TODAS")return `${aeTarjetasResumenDiario(lista,sedes,data)}${aeTablaDiariaTodas(lista,sedes,data)}`;
  return `${aeTarjetasResumenDiario(lista,[sede],data)}${aeTablaDiariaSede(lista,sede,data)}`;
}
function aeModuloMontoDiarioSede(data){
  const lista=aeDetalleDiarioLista(data);
  const sedes=aeListaSedesDiarias(lista);
  return `<div class="ae-diario-filtro"><label>Filtrar por sede<select id="aeFiltroSedeDiaria" onchange="aeActualizarVistaDiariaSede()"><option value="TODAS">TODAS LAS SEDES</option>${sedes.map(s=>`<option value="${aeEscape(s)}">${aeEscape(s)}</option>`).join("")}</select></label></div><div id="aeDiarioSedeContenido">${aeVistaMontoDiarioSede(data,"TODAS")}</div>`;
}
function aeActualizarVistaDiariaSede(){
  const sede=document.getElementById("aeFiltroSedeDiaria")?.value||"TODAS";
  const cont=document.getElementById("aeDiarioSedeContenido");
  if(cont)cont.innerHTML=aeVistaMontoDiarioSede(window.aeDatosAnalisisActual||{},sede);
}

function aeTablaProyeccionDiaria(data){
  const lista=Array.isArray(data?.proyeccionDiariaCierre)?data.proyeccionDiariaCierre:[];
  const rp=data?.resumenProgramacion||{};
  if(rp.periodoCerrado)return '<div class="ae-vacio">El periodo está cerrado. La producción mostrada corresponde al resultado final.</div>';
  if(!lista.length)return '<div class="ae-vacio">No existen días ni jornadas programadas pendientes para este periodo.</div>';
  const filas=lista.map(x=>{
    const meta=Number(x.metaDiaria)||0,estimado=Number(x.estimadoDia)||0;
    return `<tr><td>${aeEscape(x.fecha||x.fechaClave||"-")}</td><td><b>${aeNumero(x.cuadrillasProgramadas)}</b></td><td>${aeNumero(x.cuadrillasConDescanso)}</td><td>${aeMoneda(meta)}</td><td><b>${aeMoneda(estimado)}</b></td><td><b>${aeMoneda(x.acumuladoProyectado)}</b></td></tr>`;
  }).join("");
  return `<div class="ae-proyeccion-tabla-wrap"><table class="ae-proyeccion-tabla"><thead><tr><th>Fecha</th><th>Cuadrillas programadas</th><th>Con descanso</th><th>Meta del día</th><th>Estimado del día</th><th>Acumulado proyectado</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}

function aeLecturaAlCorte(data){
  const r=data?.resumen||{},rp=data?.resumenProgramacion||{};
  const dias=Number(rp.diasCalendarioPendientes)||0;
  const jornadas=Number(rp.jornadasPendientes)||0;
  const rendimiento=Number(rp.rendimientoJornadaProgramada)||0;
  const estimadoPendiente=Number(rp.produccionEstimadaPendiente)||0;
  const necesario=Number(rp.promedioNecesarioJornada)||0;
  const diferencia=Number(rp.diferenciaProyectadaMeta)||0;
  const cerrado=!!rp.periodoCerrado;
  const favorable=cerrado?(Number(r.montoTotal)||0)>=(Number(r.metaTotal)||0):(Number(r.proyeccionCierre)||0)>=(Number(r.metaTotal)||0);
  const estado=cerrado?(favorable?"Meta mensual alcanzada":"Periodo cerrado por debajo de la meta"):(favorable?"Proyección favorable":"Se requiere elevar el promedio por jornada");
  const clase=favorable?"ae-corte-favorable":"ae-corte-atencion";
  const textoDias=cerrado?"Periodo cerrado":`${aeNumero(dias)} días calendario`;
  const textoJornadas=cerrado?"Sin jornadas pendientes":`${aeNumero(jornadas)} jornadas programadas`;
  return `<div class="ae-corte-bloque">
    <div class="ae-corte-titulo"><div><span>LECTURA AL CORTE</span><h3>Producción y estimación hasta el cierre</h3></div><small>${rp.fechaCorte?`Datos hasta el ${aeEscape(rp.fechaCorte)}`:"Sin fecha de producción registrada"}</small></div>
    <div class="ae-corte-grid">
      <article class="ae-corte-kpi"><span>Producción al corte</span><strong>${aeMoneda(r.montoTotal)}</strong><small>${rp.fechaCorte?`Acumulado hasta el ${aeEscape(rp.fechaCorte)}`:"Sin fecha de corte"}</small></article>
      <article class="ae-corte-kpi"><span>Días para el cierre</span><strong>${textoDias}</strong><small>${cerrado?"Resultado mensual final":"Días posteriores a la última producción cargada"}</small></article>
      <article class="ae-corte-kpi"><span>Jornadas pendientes</span><strong>${textoJornadas}</strong><small>Según descansos programados</small></article>
      <article class="ae-corte-kpi"><span>Producción pendiente estimada</span><strong>${aeMoneda(estimadoPendiente)}</strong><small>Promedio actual ${aeMoneda(rendimiento)} por jornada</small></article>
    </div>
    <div class="ae-corte-lectura ${clase}"><div><span>Promedio actual por jornada</span><b>${aeMoneda(rendimiento)}</b></div><div><span>Promedio necesario para la meta</span><b>${aeMoneda(necesario)}</b></div><div><span>${estado}</span><b>${diferencia>=0?"+":"-"}${aeMoneda(Math.abs(diferencia))} frente a la meta</b></div></div>
  </div>`;
}

function aeAlertaSinTarifa(data){
  const detalles=Array.isArray(data.codigosSinTarifaDetalles)?data.codigosSinTarifaDetalles:[],codigos=Array.isArray(data.codigosSinTarifa)?data.codigosSinTarifa:[];
  if(!detalles.length&&!codigos.length)return"";
  const filas=detalles.length?detalles.map(d=>`<div class="ae-sin-tarifa-item"><b>Código: ${d.codigo||"-"}</b><span>Fecha: ${d.fecha||"-"}</span><span>Cuadrilla: ${d.cuadrilla||"-"}</span><span>Sede: ${d.sede||"-"}</span><span>Cantidad: ${aeNumero(d.cantidad)}</span></div>`).join(""):codigos.map(c=>`<div class="ae-sin-tarifa-item"><b>Código: ${c}</b></div>`).join("");
  const total=detalles.length||codigos.length;
  return`<div class="ae-alerta-compacta"><button type="button" class="ae-alerta-toggle" onclick="aeToggleAlerta(this)">⚠ Alerta <span>${total}</span></button><div class="ae-alerta-detalle"><p>No se pudo valorizar ${total} registro(s) porque el código no tiene tarifa activa.</p><div class="ae-aviso-codigos">${filas}</div></div></div>`
}
function aeToggleAlerta(btn){
  const detalle=btn.nextElementSibling;
  const abierto=detalle.classList.toggle("visible");
  btn.classList.toggle("abierta",abierto);
}
function renderAnalisisEconomico(data){
  const r=data.resumen||{},pm=data.parametrosMeta||{},rp=data.resumenProgramacion||{};
  const faltante=Math.max(0,(Number(r.metaTotal)||0)-(Number(r.montoTotal)||0));
  const metaCorte=Number(rp.metaAcumuladaCorte||r.metaAcumuladaCorte)||0;
  const cumplimientoCorte=Number(rp.cumplimientoCorte||r.cumplimientoCorte)||0;
  const faltanteCorte=Math.max(0,metaCorte-(Number(r.montoTotal)||0));
  const textoCorte=rp.fechaCorte?` al ${rp.fechaCorte}`:"";
  const diasPendientes=Number(rp.diasCalendarioPendientes)||0;
  const jornadasPendientes=Number(rp.jornadasPendientes)||0;
  const estimadoPendiente=Number(rp.produccionEstimadaPendiente)||0;
  const textoProyeccion=rp.periodoCerrado?"Periodo cerrado · monto real final":`${aeMoneda(estimadoPendiente)} estimados en ${aeNumero(diasPendientes)} días y ${aeNumero(jornadasPendientes)} jornadas pendientes`;
  window.aeDatosAnalisisActual=data;
  document.getElementById("aeResultado").innerHTML=`<div class="ae-periodo"><b>${data.periodo}</b><span>Actualizado: ${data.fechaActualizacion}</span></div><div class="ae-kpis">${aeTarjeta("Monto generado",aeMoneda(r.montoTotal),`Meta mensual ${aeMoneda(r.metaTotal)}`,aeClaseCumplimiento(r.cumplimiento))}${aeTarjeta("Cumplimiento mensual",aePorcentaje(r.cumplimiento),faltante>0?`Faltan ${aeMoneda(faltante)}`:"Meta mensual alcanzada",aeClaseCumplimiento(r.cumplimiento))}${aeTarjeta("Meta acumulada al corte",aeMoneda(metaCorte),`${aeNumero(rp.jornadasProgramadasAlCorte||0)} jornadas programadas${textoCorte}`)}${aeTarjeta("Cumplimiento al corte",aePorcentaje(cumplimientoCorte),faltanteCorte>0?`Faltan ${aeMoneda(faltanteCorte)} frente a la programación`:"Meta acumulada alcanzada",aeClaseCumplimiento(cumplimientoCorte))}${aeTarjeta("Proyección de cierre",aeMoneda(r.proyeccionCierre),textoProyeccion,aeClaseCumplimiento((r.proyeccionCierre||0)/(r.metaTotal||1)))}${aeTarjeta("Órdenes ejecutadas",aeNumero(r.ordenesEjecutadas),"Finalizadas registradas en Producción")}${aeTarjeta("Ticket promedio",aeMoneda(r.ticketPromedio),"Monto promedio por orden")}${aeTarjeta("Cuadrillas activas",aeNumero(pm.cuadrillasActivas),`${aeMoneda(pm.metaMensualCuadrilla)} por cuadrilla`)}</div>${aeLecturaAlCorte(data)}${aeSeccion("📆 Proyección diaria hasta el cierre",aeTablaProyeccionDiaria(data),true)}${aeSeccion("🏢 Monto generado por sede",aeFilas((data.porSede||[]).filter(x=>String(x.sede||"").toUpperCase()!=="TODAS"),"sede"),false)}${aeSeccion("👷 Monto generado por cuadrilla",aeFilas((data.porCuadrilla||[]).filter(x=>/^P\d+\b/i.test(String(x.cuadrilla||""))),"cuadrilla"),false)}${aeSeccion("🧭 Monto generado por plataforma",aeFilas(data.porPlataforma,"plataforma"),false)}${aeSeccion("📦 Monto generado por tipo de partida",aeFilas(data.porTipoPartida,"tipo"),false)}${aeSeccion("📅 Monto diario por sede y promedio",aeModuloMontoDiarioSede(data),false)}${aeAlertaSinTarifa(data)}`;
}

/* =====================================================
   V292 - UTILIDAD POR CUADRILLA
===================================================== */
let UTIL292_DATOS=null;
let UTIL292_FILTROS={sede:"TODAS",cuadrilla:"TODAS"};

async function util292Api(payload,intento=0){
  const url=(window.MI_VISUAL_API_URL||API_ANALISIS_ECONOMICO)+(intento?`${API_ANALISIS_ECONOMICO.includes("?")?"&":"?"}v292=${Date.now()}`:"");
  const respuesta=await fetch(url,{
    method:"POST",cache:"no-store",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload)
  });
  const texto=await respuesta.text();
  if(texto.trim()==="MI VISUAL API OK"&&intento===0)return util292Api(payload,1);
  let data;
  try{data=JSON.parse(texto)}catch(_){throw new Error("La respuesta de Utilidad no es válida")}
  if(!respuesta.ok||!data.ok)throw new Error(data.error||"No se pudo procesar Utilidad por cuadrilla");
  return data;
}

function util292Estilos(){
  return `<style>
  .util292{max-width:1160px;margin:auto;padding:16px;color:#0f172a}
  .util292-head{background:linear-gradient(120deg,#065f46,#0f766e);color:#fff;border-radius:20px;padding:20px;display:flex;justify-content:space-between;gap:14px;align-items:center;box-shadow:0 12px 28px rgba(2,6,23,.25)}
  .util292-head h2{margin:0 0 5px}.util292-head p{margin:0;opacity:.9}.util292-head button,.util292-btn{border:0;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer;background:#0ea5e9;color:#fff}
  .util292-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.util292-tabs button{border:0;border-radius:10px;padding:10px 14px;font-weight:900;background:#334155;color:#fff;cursor:pointer}.util292-tabs button.activo{background:#0f766e}
  .util292-panel{background:#fff;border:1px solid #cbd5e1;border-radius:18px;padding:16px;box-shadow:0 10px 25px rgba(2,6,23,.16)}
  .util292-filtros{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;align-items:end}.util292-filtros label,.util292-import label{font-size:12px;font-weight:900}.util292-filtros select,.util292-import select,.util292-import textarea{width:100%;box-sizing:border-box;border:1px solid #94a3b8;border-radius:9px;padding:10px;background:#fff}
  .util292-sello{background:#ecfeff;border:1px solid #67e8f9;border-radius:11px;padding:9px 11px;font-size:11px;color:#155e75}.util292-sello b{display:block;font-size:12px;color:#0f172a;margin-top:2px}
  .util292-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.util292-kpi{border-radius:14px;padding:14px;background:#f1f5f9;border:1px solid #cbd5e1}.util292-kpi span{display:block;font-size:11px;font-weight:900;color:#475569}.util292-kpi strong{display:block;font-size:23px;margin:5px 0}.util292-kpi small{color:#64748b}.util292-kpi.ok{background:#dcfce7;border-color:#86efac}.util292-kpi.bajo{background:#fee2e2;border-color:#fca5a5}
  .util292-costos{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-bottom:14px}.util292-costo{padding:10px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa}.util292-costo span{display:block;font-size:10px;color:#7c2d12;font-weight:900}.util292-costo b{display:block;margin-top:4px;font-size:13px}
  .util292-alerta{background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:12px;margin:12px 0;color:#78350f}.util292-alerta.ok{background:#dcfce7;border-color:#22c55e;color:#166534}
  .util292-sede{margin-top:15px;border:1px solid #a7f3d0;border-radius:15px;overflow:hidden}.util292-sede>h3{margin:0;padding:13px 15px;background:#d1fae5;display:flex;justify-content:space-between;gap:12px}.util292-lista{padding:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .util292-card{border:1px solid #cbd5e1;border-radius:13px;padding:13px;background:#fff}.util292-card.positiva{border-left:6px solid #16a34a}.util292-card.negativa{border-left:6px solid #dc2626}.util292-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.util292-card-head h4{margin:0;font-size:15px}.util292-card-head small{color:#64748b}.util292-estado{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;background:#dcfce7;color:#166534}.util292-estado.falta{background:#fef3c7;color:#92400e}
  .util292-card-metricas{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:11px 0}.util292-card-metricas div{background:#f8fafc;border-radius:9px;padding:8px}.util292-card-metricas span{display:block;font-size:9px;color:#64748b;font-weight:900}.util292-card-metricas b{display:block;margin-top:3px;font-size:13px}.util292-card details{border-top:1px solid #e2e8f0;padding-top:9px}.util292-card summary{cursor:pointer;font-size:12px;font-weight:900;color:#0369a1}.util292-detalle{width:100%;border-collapse:collapse;margin-top:8px}.util292-detalle td{padding:6px;border-bottom:1px solid #e2e8f0;font-size:12px}.util292-detalle td:last-child{text-align:right;font-weight:900}
  .util292-import{display:grid;grid-template-columns:220px 220px 1fr;gap:12px;align-items:end}.util292-import textarea{grid-column:1/-1;height:290px;font-family:monospace;white-space:pre}.util292-nota{background:#eff6ff;border:1px solid #93c5fd;border-radius:11px;padding:11px;color:#1e3a8a;font-size:12px}.util292-estado-import{margin-top:12px;padding:12px;border-radius:11px;background:#f1f5f9;line-height:1.55}.util292-vacio{padding:20px;text-align:center;color:#64748b}
  .util293-config-head{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:13px}.util293-config-head label{font-size:12px;font-weight:900}.util293-config-head select{display:block;min-width:210px;border:1px solid #94a3b8;border-radius:9px;padding:10px;background:#fff}
  .util293-config-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(310px,.85fr);gap:14px;align-items:start}.util293-bloque{border:1px solid #cbd5e1;border-radius:15px;overflow:hidden;background:#fff}.util293-bloque>header{padding:13px 14px;background:#e0f2fe;border-bottom:1px solid #bae6fd}.util293-bloque>header h3{margin:0 0 3px;font-size:16px}.util293-bloque>header p{margin:0;color:#475569;font-size:11px}.util293-tabla-wrap{overflow:auto;max-height:620px}.util293-tabla{width:100%;border-collapse:collapse;min-width:820px}.util293-tabla th,.util293-tabla td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:left}.util293-tabla th{position:sticky;top:0;background:#f8fafc;z-index:1}.util293-tabla input{width:105px;box-sizing:border-box;padding:8px;border:1px solid #94a3b8;border-radius:7px}.util293-tabla tr.guardado{background:#f0fdf4}.util293-celda-costo{min-width:105px}.util293-dato-guardado{display:block;min-width:105px;box-sizing:border-box;padding:8px;border:1px solid #86efac;border-radius:7px;background:#fff;text-align:center;font-weight:900;color:#166534}.util293-valor-visible{display:none}.util293-fila-costo.guardado .util293-input-costo{display:none}.util293-fila-costo.guardado.visualizando .util293-valor-mascara{display:none}.util293-fila-costo.guardado.visualizando .util293-valor-visible{display:inline}.util293-fila-costo.guardado.editando .util293-dato-guardado{display:none}.util293-fila-costo.guardado.editando .util293-input-costo{display:block;background:#fff7ed;border-color:#f59e0b}.util293-fila-costo.editando{background:#fffbeb}.util293-fila-acciones{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.util293-mini-btn{border:0;border-radius:7px;padding:6px 8px;background:#0369a1;color:#fff;font-size:10px;font-weight:900;cursor:pointer}.util293-mini-btn.editar{background:#f59e0b;color:#78350f}.util293-acciones{display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:#f8fafc}.util293-acciones .actualizar{background:#f59e0b}.util293-pdg-lista{padding:12px;display:grid;gap:10px}.util293-pdg-card{border:1px solid #fdba74;border-radius:12px;padding:12px;background:#fff7ed}.util293-pdg-card h4{margin:0 0 8px;font-size:13px}.util293-pdg-metricas{display:grid;grid-template-columns:1fr 1fr;gap:7px}.util293-pdg-metricas div{background:#fff;border-radius:8px;padding:8px}.util293-pdg-metricas span{display:block;font-size:9px;font-weight:900;color:#7c2d12}.util293-pdg-metricas b{display:block;margin-top:3px}.util293-pdg-detalle{width:100%;border-collapse:collapse;margin-top:8px}.util293-pdg-detalle td{padding:5px;border-bottom:1px solid #fed7aa;font-size:10px}.util293-pdg-detalle td:last-child{text-align:right}.util293-sin-tarifa{margin-top:8px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:8px;color:#991b1b;font-size:10px}.util293-tarifario{margin:0 12px 12px;border:1px solid #cbd5e1;border-radius:10px;padding:9px}.util293-tarifario summary{cursor:pointer;font-weight:900;font-size:11px}.util293-tarifario table{width:100%;border-collapse:collapse;margin-top:8px}.util293-tarifario th,.util293-tarifario td{padding:5px;border-bottom:1px solid #e2e8f0;font-size:9px}.util293-estado{margin-top:12px;padding:11px;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:12px}
  @media(max-width:980px){.util293-config-grid{grid-template-columns:1fr}}
  @media(max-width:850px){.util292-filtros{grid-template-columns:1fr 1fr}.util292-kpis{grid-template-columns:1fr 1fr}.util292-costos{grid-template-columns:1fr 1fr}.util292-lista{grid-template-columns:1fr}.util292-import{grid-template-columns:1fr 1fr}.util292-import .util292-nota{grid-column:1/-1}}
  @media(max-width:520px){.util292-head{display:block}.util292-head button{margin-top:10px}.util292-filtros,.util292-kpis,.util292-import{grid-template-columns:1fr}.util292-card-metricas{grid-template-columns:1fr}.util292-import textarea,.util292-import .util292-nota{grid-column:1}}
  </style>`;
}

function mostrarUtilidadCuadrillas(){
  if(!aePuedeUtilidadCuadrilla()){alert("No tienes permiso para ver Utilidad por cuadrilla.");return}
  if(typeof limpiarPantalla==="function")limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");if(menu)menu.style.display="none";
  if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");if(!pantalla)return;
  pantalla.innerHTML=`${util292Estilos()}<section class="util292">
    <div class="util292-head"><div><h2>📈 Utilidad por cuadrilla</h2><p>Resultado mensual después de todos los costos operativos.</p></div><button onclick="mostrarAnalisisEconomico()">Volver a Análisis Económico</button></div>
    <div class="util292-tabs"><button id="util292TabResumen" class="activo" onclick="util292CambiarVista('resumen')">Resumen y ranking</button>${aePuedeCargarUtilidad()?`<button id="util292TabCostos" onclick="util292CambiarVista('costos')">Costos operativos por cuadrilla</button>`:""}</div>
    <div id="util292Contenido"></div>
  </section>`;
  UTIL292_DATOS=null;
  UTIL292_FILTROS={sede:"TODAS",cuadrilla:"TODAS"};
  util292CambiarVista("resumen");
}

function util292CambiarVista(vista){
  if(vista==="costos"&&!aePuedeCargarUtilidad()){alert("No tienes permiso para registrar costos operativos.");vista="resumen"}
  document.getElementById("util292TabResumen")?.classList.toggle("activo",vista==="resumen");
  document.getElementById("util292TabCostos")?.classList.toggle("activo",vista==="costos");
  if(vista==="costos")util293RenderCostosOperativos();
  else util292RenderResumenBase();
}

function util292RenderResumenBase(){
  const cont=document.getElementById("util292Contenido");if(!cont)return;
  cont.innerHTML=`<div class="util292-panel">
    <div class="util292-filtros">
      <label>Periodo<select id="util292Periodo">${aeOpcionesPeriodo()}</select></label>
      <label>Sede<select id="util292Sede" onchange="util292CambiarSede()"><option value="TODAS">TODAS LAS SEDES</option></select></label>
      <label>Cuadrilla<select id="util292Cuadrilla" onchange="util292AplicarFiltros()"><option value="TODAS">TODAS LAS CUADRILLAS</option></select></label>
      <button class="util292-btn" id="util292Consultar" onclick="util292Consultar()">Consultar</button>
      ${aePuedeDescargarUtilidad()?`<button class="util292-btn" style="background:#ea580c" id="util296Descargar" onclick="util296DescargarInformeMensual()">⬇ Informe mensual</button>`:""}
    </div>
    <div id="util292Resultado"><div class="util292-vacio">Consultando información económica...</div></div>
  </div>`;
  document.getElementById("util292Periodo").value=aePeriodoActual();
  util292Consultar();
}

async function util292Consultar(){
  const periodo=document.getElementById("util292Periodo")?.value||aePeriodoActual();
  const boton=document.getElementById("util292Consultar"),resultado=document.getElementById("util292Resultado");
  if(boton){boton.disabled=true;boton.textContent="Calculando..."}
  if(resultado)resultado.innerHTML='<div class="util292-vacio">Cruzando Producción, Materiales, Bonos, Observaciones y gastos...</div>';
  try{
    UTIL292_DATOS=await util292Api({accion:"obtenerUtilidadCuadrillas",usuario:localStorage.getItem("usuario"),periodo});
    UTIL292_FILTROS={sede:"TODAS",cuadrilla:"TODAS"};
    util292CargarSelectores();
    util292AplicarFiltros();
  }catch(e){
    if(resultado)resultado.innerHTML=`<div class="util292-alerta"><b>No se pudo calcular la utilidad.</b><br>${aeEscape(e.message||e)}</div>`;
  }finally{
    if(boton){boton.disabled=false;boton.textContent="Consultar"}
  }
}

function util292CargarSelectores(){
  const sedeEl=document.getElementById("util292Sede");if(!sedeEl)return;
  const sedes=[...new Set((UTIL292_DATOS?.cuadrillas||[]).map(x=>String(x.sede||"SIN SEDE")))].sort(aeOrdenSedesDiarias);
  sedeEl.innerHTML='<option value="TODAS">TODAS LAS SEDES</option>'+sedes.map(s=>`<option value="${aeEscape(s)}">${aeEscape(s)}</option>`).join("");
  util292ActualizarCuadrillas();
}

function util292ActualizarCuadrillas(){
  const sede=document.getElementById("util292Sede")?.value||"TODAS";
  const cuadrillaEl=document.getElementById("util292Cuadrilla");if(!cuadrillaEl)return;
  const lista=(UTIL292_DATOS?.cuadrillas||[]).filter(x=>sede==="TODAS"||String(x.sede)===sede).map(x=>x.cuadrilla).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  cuadrillaEl.innerHTML='<option value="TODAS">TODAS LAS CUADRILLAS</option>'+lista.map(c=>`<option value="${aeEscape(c)}">${aeEscape(c)}</option>`).join("");
}

function util292CambiarSede(){
  UTIL292_FILTROS.sede=document.getElementById("util292Sede")?.value||"TODAS";
  UTIL292_FILTROS.cuadrilla="TODAS";
  util292ActualizarCuadrillas();
  util292AplicarFiltros();
}

function util292ResumenLista(lista){
  const r=lista.reduce((t,x)=>{
    ["produccion","materiales","sueldos","combustible","alquilerUnidad","pagoPdg","bonos","penalidadesWin","costos","utilidad"].forEach(k=>t[k]+=Number(x[k])||0);
    if(!x.gastosCompletos)t.incompletas++;
    return t;
  },{produccion:0,materiales:0,sueldos:0,combustible:0,alquilerUnidad:0,pagoPdg:0,bonos:0,penalidadesWin:0,costos:0,utilidad:0,incompletas:0});
  r.margen=r.produccion?r.utilidad/r.produccion:0;
  return r;
}

function util292CardCuadrilla(x,puesto){
  const positiva=Number(x.utilidad)>=0,clase=positiva?"positiva":"negativa";
  const estado=x.esPdg
    ? (x.gastosCompletos?`<span class="util292-estado">PDG · ${aeEscape(x.tramoPdg||"SIN TRABAJOS")}</span>`:`<span class="util292-estado falta">PDG · PARTIDA SIN TARIFA</span>`)
    : (x.gastosCompletos?'<span class="util292-estado">COSTOS COMPLETOS</span>':`<span class="util292-estado falta">FALTA: ${aeEscape((x.gastosFaltantes||[]).join(", "))}</span>`);
  const detallePdg=(x.detallePdg||[]).map(d=>`<tr><td>${aeEscape(d.partida||d.codigo)} · ${aeNumero(d.cantidad)} × ${d.conTarifa?aeMoneda(d.tarifa):"SIN TARIFA"}</td><td>${aeMoneda(d.subtotal)}</td></tr>`).join("");
  const filasCostos=x.esPdg
    ? `<tr><td>− Pago PDG por ${aeNumero(x.totalTrabajosPdg)} partidas</td><td>${aeMoneda(x.pagoPdg)}</td></tr>
       ${detallePdg}`
    : `<tr><td>− Sueldo Técnico 1</td><td>${aeMoneda(x.sueldoTecnico1)}</td></tr>
       <tr><td>− Sueldo Técnico 2</td><td>${aeMoneda(x.sueldoTecnico2)}</td></tr>
       ${Number(x.sueldosLegacy)>0?`<tr><td>− Sueldo total anterior</td><td>${aeMoneda(x.sueldosLegacy)}</td></tr>`:""}
       <tr><td>− Combustible</td><td>${aeMoneda(x.combustible)}</td></tr>
       <tr><td>− Alquiler de unidad</td><td>${aeMoneda(x.alquilerUnidad)}</td></tr>
       <tr><td>− Bonos del mes</td><td>${aeMoneda(x.bonos)}</td></tr>`;
  return `<article class="util292-card ${clase}">
    <div class="util292-card-head"><div><small>Puesto ${puesto} · ${aeEscape(x.sede||"SIN SEDE")}</small><h4>${aeEscape(x.cuadrilla)}</h4></div>${estado}</div>
    <div class="util292-card-metricas"><div><span>PRODUCCIÓN</span><b>${aeMoneda(x.produccion)}</b></div><div><span>COSTOS</span><b>${aeMoneda(x.costos)}</b></div><div><span>UTILIDAD · MARGEN</span><b>${aeMoneda(x.utilidad)} · ${aePorcentaje(x.margen)}</b></div></div>
    <details><summary>Ver detalle del cálculo</summary><table class="util292-detalle"><tbody>
      <tr><td>Producción valorizada</td><td>${aeMoneda(x.produccion)}</td></tr>
      <tr><td>− Materiales</td><td>${aeMoneda(x.materiales)}</td></tr>
      ${filasCostos}
      <tr><td>− Penalidades WIN</td><td>${aeMoneda(x.penalidadesWin)}</td></tr>
      <tr><td><b>UTILIDAD NETA</b></td><td>${aeMoneda(x.utilidad)}</td></tr>
    </tbody></table></details>
  </article>`;
}

function util292AplicarFiltros(){
  if(!UTIL292_DATOS)return;
  const sede=document.getElementById("util292Sede")?.value||"TODAS";
  const cuadrilla=document.getElementById("util292Cuadrilla")?.value||"TODAS";
  UTIL292_FILTROS={sede,cuadrilla};
  let lista=(UTIL292_DATOS.cuadrillas||[]).slice();
  if(sede!=="TODAS")lista=lista.filter(x=>String(x.sede)===sede);
  if(cuadrilla!=="TODAS")lista=lista.filter(x=>String(x.cuadrilla)===cuadrilla);
  lista.sort((a,b)=>Number(b.utilidad)-Number(a.utilidad)||String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true}));
  const r=util292ResumenLista(lista);
  const grupos={};
  lista.forEach((x,i)=>{const s=x.sede||"SIN SEDE";if(!grupos[s])grupos[s]=[];grupos[s].push({x,puesto:i+1})});
  const sedes=Object.keys(grupos).sort(aeOrdenSedesDiarias);
  const alerta=r.incompletas
    ? `<div class="util292-alerta"><b>⚠ Resultado provisional:</b> ${r.incompletas} cuadrilla(s) tienen costos operativos incompletos o partidas PDG sin tarifa.</div>`
    : `<div class="util292-alerta ok"><b>✅ Costos completos:</b> las cuadrillas regulares y PDG están correctamente valorizadas.</div>`;
  const contenido=sedes.map(s=>{
    const total=grupos[s].reduce((t,y)=>t+Number(y.x.utilidad||0),0);
    return `<section class="util292-sede"><h3><span>🏢 ${aeEscape(s)}</span><b>${aeMoneda(total)}</b></h3><div class="util292-lista">${grupos[s].map(y=>util292CardCuadrilla(y.x,y.puesto)).join("")}</div></section>`;
  }).join("");
  const resultado=document.getElementById("util292Resultado");if(!resultado)return;
  resultado.innerHTML=`<div class="util292-sello">PERIODO <b>${aeEscape(UTIL292_DATOS.periodo||"")}</b>Última carga de gastos: ${aeEscape(UTIL292_DATOS.ultimaCargaGastos||"Sin cargas")}</div>
    <div class="util292-kpis">
      <article class="util292-kpi"><span>PRODUCCIÓN VALORIZADA</span><strong>${aeMoneda(r.produccion)}</strong><small>${lista.length} cuadrilla(s)</small></article>
      <article class="util292-kpi"><span>TOTAL DE COSTOS</span><strong>${aeMoneda(r.costos)}</strong><small>Todos los conceptos</small></article>
      <article class="util292-kpi ${r.utilidad>=0?"ok":"bajo"}"><span>UTILIDAD NETA</span><strong>${aeMoneda(r.utilidad)}</strong><small>Producción menos costos</small></article>
      <article class="util292-kpi ${r.margen>=0?"ok":"bajo"}"><span>MARGEN</span><strong>${aePorcentaje(r.margen)}</strong><small>Utilidad / Producción</small></article>
    </div>
    <div class="util292-costos">
      <div class="util292-costo"><span>MATERIALES</span><b>${aeMoneda(r.materiales)}</b></div>
      <div class="util292-costo"><span>SUELDOS</span><b>${aeMoneda(r.sueldos)}</b></div>
      <div class="util292-costo"><span>COMBUSTIBLE</span><b>${aeMoneda(r.combustible)}</b></div>
      <div class="util292-costo"><span>ALQUILER UNIDAD</span><b>${aeMoneda(r.alquilerUnidad)}</b></div>
      <div class="util292-costo"><span>PAGO PDG</span><b>${aeMoneda(r.pagoPdg)}</b></div>
      <div class="util292-costo"><span>BONOS</span><b>${aeMoneda(r.bonos)}</b></div>
      <div class="util292-costo"><span>PENALIDADES WIN</span><b>${aeMoneda(r.penalidadesWin)}</b></div>
      <div class="util292-costo"><span>TOTAL COSTOS</span><b>${aeMoneda(r.costos)}</b></div>
    </div>${alerta}${contenido||'<div class="util292-vacio">Sin cuadrillas para los filtros seleccionados.</div>'}`;
}

function util293RenderCostosOperativos(){
  const cont=document.getElementById("util292Contenido");if(!cont)return;
  cont.innerHTML=`<div class="util292-panel">
    <div class="util293-config-head">
      <label>Periodo<select id="util293Periodo">${aeOpcionesPeriodo()}</select></label>
      <button class="util292-btn" id="util293Consultar" onclick="util293CargarCostos()">Consultar costos</button>
      <div class="util292-nota"><b>Cuadrillas regulares:</b> los montos quedan guardados por mes. Use Actualizar cuando cambie algún valor.</div>
    </div>
    <div id="util293Contenido"><div class="util292-vacio">Consultando costos operativos y pagos PDG...</div></div>
    <div id="util293Estado" class="util293-estado">Seleccione el periodo para registrar o actualizar los costos.</div>
  </div>`;
  document.getElementById("util293Periodo").value=aePeriodoActual();
  util293CargarCostos();
}

function util293ValorInput(x,campo){
  const valor=Number(x[campo])||0;
  return x.costosRegistrados||valor>0?valor.toFixed(2):"";
}

function util293TieneDatosGuardados(x){
  return !!x.costosRegistrados||Number(x.sueldosLegacy)>0;
}

function util293CeldaCosto(x,campo,clase){
  const guardado=util293TieneDatosGuardados(x);
  const legado=Number(x.sueldosLegacy)>0&&!x.costosRegistrados;
  const pendienteDesglose=legado&&(campo==="sueldoTecnico1"||campo==="sueldoTecnico2");
  const valorInput=pendienteDesglose?"":util293ValorInput(x,campo);
  const valorVisible=pendienteDesglose?"POR COMPLETAR":aeMoneda(Number(x[campo])||0);
  return `<td class="util293-celda-costo">
    ${guardado?`<span class="util293-dato-guardado"><span class="util293-valor-mascara">GUARDADO</span><span class="util293-valor-visible">${aeEscape(valorVisible)}</span></span>`:""}
    <input class="util293-input-costo ${clase}" type="number" min="0" step="0.01" value="${aeEscape(valorInput)}" data-original="${aeEscape(valorInput)}" placeholder="0.00">
  </td>`;
}

function util293FilaCosto(x,i){
  const guardado=util293TieneDatosGuardados(x);
  const legado=Number(x.sueldosLegacy)>0&&!x.costosRegistrados;
  const estado=legado
    ? '<span class="util292-estado falta">DESGLOSAR SUELDOS</span>'
    : (guardado?'<span class="util292-estado">REGISTRADO</span>':'<span class="util292-estado falta">PENDIENTE</span>');
  const acciones=guardado?`<div class="util293-fila-acciones">
    <button type="button" class="util293-mini-btn util293-ver" onclick="util293AlternarVisualizacion(this)">Visualizar</button>
    <button type="button" class="util293-mini-btn editar util293-editar" onclick="util293AlternarEdicion(this)">${legado?"Completar":"Editar"}</button>
  </div>`:"";
  return `<tr class="util293-fila-costo ${guardado?"guardado":""}" data-cuadrilla="${aeEscape(x.cuadrilla)}" data-sede="${aeEscape(x.sede||"")}" data-registrado="${guardado?"1":"0"}">
    <td><b>${aeEscape(x.cuadrilla)}</b><small style="display:block;color:#64748b">${aeEscape(x.sede||"SIN SEDE")}</small></td>
    ${util293CeldaCosto(x,"sueldoTecnico1","costo-t1")}
    ${util293CeldaCosto(x,"sueldoTecnico2","costo-t2")}
    ${util293CeldaCosto(x,"alquilerUnidad","costo-alquiler")}
    ${util293CeldaCosto(x,"combustible","costo-combustible")}
    <td>${estado}${legado?`<small style="display:block;margin-top:4px">Total anterior: ${aeMoneda(x.sueldosLegacy)}</small>`:""}${acciones}</td>
  </tr>`;
}

function util293AlternarVisualizacion(boton){
  const fila=boton?.closest(".util293-fila-costo");if(!fila||fila.classList.contains("editando"))return;
  const visible=fila.classList.toggle("visualizando");
  boton.textContent=visible?"Ocultar":"Visualizar";
}

function util293AlternarEdicion(boton){
  const fila=boton?.closest(".util293-fila-costo");if(!fila)return;
  const editar=!fila.classList.contains("editando");
  fila.classList.toggle("editando",editar);
  fila.classList.remove("visualizando");
  const ver=fila.querySelector(".util293-ver");
  if(ver){ver.textContent="Visualizar";ver.disabled=editar}
  boton.textContent=editar?"Cancelar":(fila.querySelector(".util292-estado.falta")?"Completar":"Editar");
  if(!editar){
    fila.querySelectorAll(".util293-input-costo").forEach(input=>{input.value=input.dataset.original||""});
  }
}

function util293DetallePdg(x){
  const detalle=(x.detallePdg||[]).map(d=>`<tr><td>${aeEscape(d.partida||d.codigo)}<small style="display:block;color:#64748b">${aeEscape(d.codigo||"")}</small></td><td>${aeNumero(d.cantidad)} × ${d.conTarifa?aeMoneda(d.tarifa):"SIN TARIFA"}</td><td>${aeMoneda(d.subtotal)}</td></tr>`).join("");
  const sin=(x.partidasPdgSinTarifa||[]);
  return `<article class="util293-pdg-card">
    <h4>${aeEscape(x.cuadrilla)}<small style="display:block;color:#7c2d12">${aeEscape(x.sede||"SIN SEDE")}</small></h4>
    <div class="util293-pdg-metricas">
      <div><span>TRABAJOS DEL MES</span><b>${aeNumero(x.totalTrabajosPdg)}</b></div>
      <div><span>TRAMO APLICADO</span><b>${aeEscape(x.tramoPdg||"SIN TRABAJOS")}</b></div>
      <div><span>PAGO PDG</span><b>${aeMoneda(x.pagoPdg)}</b></div>
      <div><span>PRODUCCIÓN</span><b>${aeMoneda(x.produccion)}</b></div>
    </div>
    <details><summary style="cursor:pointer;margin-top:9px;font-size:11px;font-weight:900">Ver partidas valorizadas</summary>
      <table class="util293-pdg-detalle"><tbody>${detalle||'<tr><td colspan="3">Sin trabajos en el periodo</td></tr>'}</tbody></table>
    </details>
    ${sin.length?`<div class="util293-sin-tarifa"><b>Partidas sin tarifa:</b><br>${sin.map(aeEscape).join("<br>")}</div>`:""}
  </article>`;
}

function util293Tarifario(datos){
  const filas=(datos.tarifarioPdg||[]).map(x=>`<tr><td>${aeEscape(x.nombre)}</td><td>${aeMoneda(x.tarifaHasta60)}</td><td>${aeMoneda(x.tarifa61Mas)}</td></tr>`).join("");
  return `<details class="util293-tarifario"><summary>Ver tarifario PDG aplicado</summary><div style="overflow:auto;max-height:330px"><table><thead><tr><th>Partida</th><th>1 a 60</th><th>61 a más</th></tr></thead><tbody>${filas}</tbody></table></div></details>`;
}

async function util293CargarCostos(){
  const periodo=document.getElementById("util293Periodo")?.value||aePeriodoActual();
  const boton=document.getElementById("util293Consultar"),cont=document.getElementById("util293Contenido");
  if(boton){boton.disabled=true;boton.textContent="Consultando..."}
  if(cont)cont.innerHTML='<div class="util292-vacio">Cargando cuadrillas y calculando pagos PDG...</div>';
  try{
    const datos=await util292Api({accion:"obtenerUtilidadCuadrillas",usuario:localStorage.getItem("usuario"),periodo});
    UTIL292_DATOS=datos;
    const regulares=(datos.cuadrillas||[]).filter(x=>!x.esPdg).sort((a,b)=>String(a.sede).localeCompare(String(b.sede))||String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true}));
    const pdg=(datos.cuadrillas||[]).filter(x=>x.esPdg).sort((a,b)=>String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true}));
    if(cont)cont.innerHTML=`<div class="util293-config-grid">
      <section class="util293-bloque">
        <header><h3>Costos operativos por cuadrilla</h3><p>Sueldo Técnico 1, Sueldo Técnico 2, alquiler de unidad y combustible.</p></header>
        <div class="util293-tabla-wrap"><table class="util293-tabla"><thead><tr><th>Cuadrilla</th><th>Sueldo T1</th><th>Sueldo T2</th><th>Alquiler</th><th>Combustible</th><th>Estado</th></tr></thead><tbody>${regulares.map(util293FilaCosto).join("")}</tbody></table></div>
        <div class="util293-acciones"><button class="util292-btn" onclick="util293GuardarCostos('GUARDAR')">Guardar nuevos</button><button class="util292-btn actualizar" onclick="util293GuardarCostos('ACTUALIZAR')">Actualizar valores</button></div>
      </section>
      <aside class="util293-bloque">
        <header><h3>Pago PDG por partidas</h3><p>Automático: tarifa hasta 60 trabajos y tarifa 61+ al superar el límite.</p></header>
        <div class="util293-pdg-lista">${pdg.map(util293DetallePdg).join("")||'<div class="util292-vacio">No se encontraron cuadrillas PDG activas.</div>'}</div>
        ${util293Tarifario(datos)}
      </aside>
    </div>`;
  }catch(e){
    if(cont)cont.innerHTML=`<div class="util292-alerta"><b>No se pudieron cargar los costos.</b><br>${aeEscape(e.message||e)}</div>`;
  }finally{
    if(boton){boton.disabled=false;boton.textContent="Consultar costos"}
  }
}

function util293RecolectarCostos(modo){
  const filas=[];
  document.querySelectorAll(".util293-fila-costo").forEach(tr=>{
    const registrado=tr.dataset.registrado==="1";
    if(modo==="GUARDAR"&&registrado)return;
    if(modo==="ACTUALIZAR"&&(!registrado||!tr.classList.contains("editando")))return;
    const entradas={
      sueldoTecnico1:tr.querySelector(".costo-t1")?.value??"",
      sueldoTecnico2:tr.querySelector(".costo-t2")?.value??"",
      alquilerUnidad:tr.querySelector(".costo-alquiler")?.value??"",
      combustible:tr.querySelector(".costo-combustible")?.value??""
    };
    const valores=Object.values(entradas);
    if(valores.every(v=>String(v).trim()===""))return;
    if(valores.some(v=>String(v).trim()===""))throw new Error(`Complete los cuatro montos para ${tr.dataset.cuadrilla}`);
    if(valores.some(v=>!Number.isFinite(Number(v))||Number(v)<0))throw new Error(`Revise los montos de ${tr.dataset.cuadrilla}`);
    filas.push({cuadrilla:tr.dataset.cuadrilla,sede:tr.dataset.sede,...entradas});
  });
  if(!filas.length)throw new Error(modo==="ACTUALIZAR"
    ?"Use Editar en la cuadrilla que desea actualizar"
    :"Complete los costos de al menos una cuadrilla pendiente");
  return filas;
}

async function util293GuardarCostos(modo){
  const estado=document.getElementById("util293Estado");
  try{
    const filas=util293RecolectarCostos(modo);
    const periodo=document.getElementById("util293Periodo")?.value||aePeriodoActual();
    if(estado)estado.textContent=modo==="GUARDAR"?"Guardando nuevos costos...":"Actualizando costos...";
    const r=await util292Api({accion:"guardarCostosOperativosCuadrillas",usuario:localStorage.getItem("usuario"),periodo,modo,filas});
    const omitidas=r.cuadrillasOmitidas||[];
    if(estado)estado.innerHTML=`<b>✅ ${aeEscape(r.mensaje)}</b><br>Cuadrillas procesadas: ${(r.cuadrillasGuardadas||[]).length}${omitidas.length?`<br>No modificadas porque ya tenían datos: ${omitidas.map(aeEscape).join(" · ")}. Use Actualizar valores.`:""}`;
    UTIL292_DATOS=null;
    await util293CargarCostos();
  }catch(e){
    if(estado)estado.innerHTML=`<b>❌ No se guardaron los costos.</b><br>${aeEscape(e.message||e)}`;
  }
}

/* =====================================================
   V296 - INFORME MENSUAL EJECUTIVO POWERPOINT
===================================================== */
const IM296_COLOR={
  azul:"0B2A4A",azul2:"135C9E",celeste:"DDEFFC",naranja:"F36C21",
  verde:"16845B",verdeClaro:"DDF4EA",rojo:"C62828",amarillo:"F3B61F",
  gris:"64748B",grisClaro:"EEF2F6",blanco:"FFFFFF",texto:"172033"
};

function im296Moneda(v){
  return "S/ "+(Number(v)||0).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function im296Numero(v){
  return (Number(v)||0).toLocaleString("es-PE",{maximumFractionDigits:1});
}
function im296Porcentaje(v){
  return `${((Number(v)||0)*100).toFixed(1)}%`;
}
function im296Recortar(v,max=34){
  const t=String(v||"");
  return t.length>max?t.slice(0,max-1)+"…":t;
}
function im296ColorSede(sede){
  const s=String(sede||"").toUpperCase();
  if(s.includes("CHICLAYO"))return "F36C21";
  if(s.includes("PIURA"))return "1D5FA7";
  if(s.includes("TRUJILLO"))return "16845B";
  return IM296_COLOR.azul2;
}
function im296ColorResultado(valor){
  return Number(valor)>=0?IM296_COLOR.verde:IM296_COLOR.rojo;
}
function im296Shape(pptx,slide,x,y,w,h,color,line=color,radio=false){
  slide.addShape(radio?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{
    x,y,w,h,rectRadius:radio?0.08:0,
    fill:{color},line:{color:line,pt:0.6}
  });
}
function im296Texto(slide,texto,x,y,w,h,opciones={}){
  slide.addText(String(texto==null?"":texto),{
    x,y,w,h,fontFace:"Aptos",fontSize:opciones.fontSize||12,
    bold:!!opciones.bold,color:opciones.color||IM296_COLOR.texto,
    align:opciones.align||"left",valign:opciones.valign||"mid",
    margin:opciones.margin===undefined?0.05:opciones.margin,
    breakLine: false,fit:"shrink",
    isTextBox:true
  });
}
function im296Encabezado(pptx,slide,titulo,subtitulo,pagina,periodo,color=IM296_COLOR.naranja){
  slide.background={color:"F8FAFC"};
  im296Shape(pptx,slide,0,0,13.333,0.13,color,color);
  im296Texto(slide,titulo,0.45,0.25,8.8,0.42,{fontSize:22,bold:true,color:IM296_COLOR.azul});
  im296Texto(slide,subtitulo,0.47,0.7,8.8,0.25,{fontSize:9.5,color:IM296_COLOR.gris});
  im296Texto(slide,"MI VISUAL",10.35,0.25,1.45,0.34,{fontSize:16,bold:true,color:IM296_COLOR.azul,align:"right"});
  im296Texto(slide,"VISUAL CONNECTIONS",11.85,0.28,1.03,0.28,{fontSize:7.5,bold:true,color:color,align:"right"});
  im296Shape(pptx,slide,0.45,7.12,12.43,0.02,"D8E0E9","D8E0E9");
  im296Texto(slide,periodo,0.47,7.18,3.8,0.18,{fontSize:7.5,color:IM296_COLOR.gris});
  im296Texto(slide,`Página ${pagina}`,11.5,7.18,1.35,0.18,{fontSize:7.5,color:IM296_COLOR.gris,align:"right"});
}
function im296Kpi(pptx,slide,x,y,w,h,titulo,valor,detalle,color){
  im296Shape(pptx,slide,x,y,w,h,"FFFFFF",color,true);
  im296Shape(pptx,slide,x,y,0.08,h,color,color);
  im296Texto(slide,titulo,x+0.2,y+0.14,w-0.35,0.24,{fontSize:9,bold:true,color:IM296_COLOR.gris});
  im296Texto(slide,valor,x+0.2,y+0.43,w-0.35,0.48,{fontSize:22,bold:true,color});
  im296Texto(slide,detalle,x+0.2,y+h-0.34,w-0.35,0.2,{fontSize:8,color:IM296_COLOR.gris});
}
function im296CabeceraTabla(titulos,color){
  return titulos.map(t=>({text:t,options:{bold:true,color:"FFFFFF",fill:{color},align:"center",valign:"middle"}}));
}
function im296AgregarTabla(slide,filas,x,y,w,h,colW,fontSize=9.5){
  slide.addTable(filas,{
    x,y,w,h,colW,rowH:0.39,fontFace:"Aptos",fontSize,
    color:IM296_COLOR.texto,fill:"FFFFFF",margin:0.045,
    valign:"middle",border:{type:"solid",pt:0.45,color:"CBD5E1"},
    autoFit:false,autoPage:false
  });
}
function im296TituloBloque(pptx,slide,texto,x,y,w,color){
  im296Shape(pptx,slide,x,y,w,0.36,color,color,true);
  im296Texto(slide,texto,x+0.12,y+0.03,w-0.24,0.27,{fontSize:11,bold:true,color:"FFFFFF"});
}
function im296FilaEconomica(x){
  const operativo=x.esPdg
    ? Number(x.pagoPdg)||0
    :(Number(x.sueldos)||0)+(Number(x.combustible)||0)+(Number(x.alquilerUnidad)||0);
  return [
    im296Recortar(x.cuadrilla,30),
    im296Moneda(x.produccion),
    im296Moneda(x.materiales),
    im296Moneda(operativo),
    im296Moneda(x.bonos),
    im296Moneda(x.penalidadesWin),
    im296Moneda(x.utilidad),
    im296Porcentaje(x.margen)
  ];
}
function im296AgregarPortada(pptx,datos){
  const slide=pptx.addSlide();
  slide.background={color:IM296_COLOR.azul};
  im296Shape(pptx,slide,0,0,0.28,7.5,IM296_COLOR.naranja,IM296_COLOR.naranja);
  im296Shape(pptx,slide,0.75,0.85,1.0,0.08,IM296_COLOR.naranja,IM296_COLOR.naranja);
  im296Texto(slide,"MI VISUAL",0.75,1.08,3.1,0.6,{fontSize:28,bold:true,color:"FFFFFF"});
  im296Texto(slide,"INFORME EJECUTIVO",0.75,2.0,8.9,0.72,{fontSize:38,bold:true,color:"FFFFFF"});
  im296Texto(slide,"MENSUAL",0.75,2.75,5.2,0.72,{fontSize:38,bold:true,color:IM296_COLOR.naranja});
  im296Texto(slide,datos.periodo,0.78,3.75,5.2,0.5,{fontSize:25,bold:true,color:"FFFFFF"});
  im296Texto(slide,"GESTIÓN OPERATIVA · CALIDAD · RESULTADO ECONÓMICO",0.78,4.42,7.8,0.35,{fontSize:12,bold:true,color:"C7D7E8"});
  im296Shape(pptx,slide,9.25,1.15,3.0,3.0,"12395E","2A5A82",true);
  im296Texto(slide,"ZONA\nNORTE",9.62,1.72,2.25,1.12,{fontSize:34,bold:true,color:"FFFFFF",align:"center"});
  im296Texto(slide,"Chiclayo · Piura · Trujillo",9.5,3.25,2.5,0.38,{fontSize:11,bold:true,color:IM296_COLOR.naranja,align:"center"});
  im296Texto(slide,datos.provisional?"RESULTADO PROVISIONAL":"PERIODO CONSOLIDADO",0.8,5.55,3.2,0.34,{fontSize:11,bold:true,color:datos.provisional?"FDE68A":"9FE3C3"});
  im296Texto(slide,`Generado: ${datos.generado}`,0.8,6.25,4.2,0.25,{fontSize:8.5,color:"B8C8D9"});
  im296Texto(slide,"Visual Connections SAC",9.0,6.25,3.1,0.25,{fontSize:10,bold:true,color:"FFFFFF",align:"right"});
}
function im296AgregarResumen(pptx,datos,pagina){
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,"Resumen ejecutivo Zona Norte","Desempeño mensual consolidado",pagina,datos.periodo);
  const r=datos.resumen||{};
  const kpis=[
    ["CUADRILLAS",im296Numero(r.cuadrillas),`${im296Numero(r.ordenes)} trabajos`,IM296_COLOR.azul2],
    ["PRODUCCIÓN VALORIZADA",im296Moneda(r.produccion),`${im296Numero(r.puntos)} puntos`,IM296_COLOR.naranja],
    ["EFECTIVIDAD",im296Porcentaje(r.efectividad),`${im296Numero(r.finalizadas)} de ${im296Numero(r.totalGestionado)}`,IM296_COLOR.azul2],
    ["TOTAL COSTOS",im296Moneda(r.costos),"Incluye costos regulares y PDG",IM296_COLOR.rojo],
    ["UTILIDAD NETA",im296Moneda(r.utilidad),"Producción menos costos",im296ColorResultado(r.utilidad)],
    ["MARGEN",im296Porcentaje(r.margen),"Utilidad / Producción",im296ColorResultado(r.margen)]
  ];
  kpis.forEach((k,i)=>{
    const col=i%3,row=Math.floor(i/3);
    im296Kpi(pptx,slide,0.55+col*4.18,1.2+row*1.65,3.82,1.35,...k);
  });
  const estado=datos.provisional
    ? `⚠ INFORME PROVISIONAL · ${(datos.alertas||[]).join(" · ")}`
    :"✓ INFORMACIÓN COMPLETA · costos operativos, PDG y producción valorizados";
  im296Shape(pptx,slide,0.55,4.65,12.16,0.58,datos.provisional?"FFF7D6":"E5F7EE",datos.provisional?IM296_COLOR.amarillo:IM296_COLOR.verde,true);
  im296Texto(slide,estado,0.75,4.79,11.75,0.27,{fontSize:10.5,bold:true,color:datos.provisional?"7A4D00":IM296_COLOR.verde});
  const mejores=(datos.rankingGestion||[]).slice(0,3);
  im296TituloBloque(pptx,slide,"Liderazgo operativo del periodo",0.55,5.55,5.9,IM296_COLOR.azul);
  mejores.forEach((x,i)=>{
    im296Texto(slide,`${i+1}. ${im296Recortar(x.cuadrilla,38)}`,0.72,6.0+i*0.28,4.2,0.22,{fontSize:9.5,bold:i===0,color:IM296_COLOR.texto});
    im296Texto(slide,`${Number(x.puntajeGestion||0).toFixed(1)} pts`,5.1,6.0+i*0.28,1.1,0.22,{fontSize:9.5,bold:true,color:IM296_COLOR.azul2,align:"right"});
  });
  im296TituloBloque(pptx,slide,"Mayor utilidad por cuadrilla",6.8,5.55,5.9,IM296_COLOR.verde);
  (datos.rankingUtilidad||[]).slice(0,3).forEach((x,i)=>{
    im296Texto(slide,`${i+1}. ${im296Recortar(x.cuadrilla,38)}`,6.97,6.0+i*0.28,3.8,0.22,{fontSize:9.5,bold:i===0,color:IM296_COLOR.texto});
    im296Texto(slide,im296Moneda(x.utilidad),10.9,6.0+i*0.28,1.55,0.22,{fontSize:9.5,bold:true,color:im296ColorResultado(x.utilidad),align:"right"});
  });
}
function im296AgregarProduccion(pptx,datos,pagina){
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,"Composición de la producción","Trabajos ejecutados y contribución económica",pagina,datos.periodo,IM296_COLOR.naranja);
  const tipos=(datos.tiposTrabajo||[]).slice(0,8);
  const max=Math.max(...tipos.map(x=>Number(x.cantidad)||0),1);
  im296TituloBloque(pptx,slide,"Principales tipos de trabajo",0.55,1.13,6.25,IM296_COLOR.naranja);
  tipos.forEach((x,i)=>{
    const y=1.66+i*0.58;
    im296Texto(slide,im296Recortar(x.tipo,32),0.65,y,2.38,0.22,{fontSize:8.6,bold:true});
    im296Shape(pptx,slide,3.05,y+0.03,2.55,0.15,"E7EDF3","E7EDF3",true);
    im296Shape(pptx,slide,3.05,y+0.03,Math.max(0.08,2.55*(Number(x.cantidad||0)/max)),0.15,IM296_COLOR.naranja,IM296_COLOR.naranja,true);
    im296Texto(slide,`${im296Numero(x.cantidad)} · ${im296Moneda(x.monto)}`,5.62,y,1.05,0.22,{fontSize:8.2,bold:true,color:IM296_COLOR.azul,align:"right"});
  });
  im296TituloBloque(pptx,slide,"Resultado por sede",7.05,1.13,5.73,IM296_COLOR.azul);
  const filas=[im296CabeceraTabla(["SEDE","TRABAJOS","PRODUCCIÓN","UTILIDAD","MARGEN"],IM296_COLOR.azul)];
  (datos.porSede||[]).forEach(s=>filas.push([
    s.sede,im296Numero(s.ordenes),im296Moneda(s.produccion),im296Moneda(s.utilidad),im296Porcentaje(s.margen)
  ]));
  im296AgregarTabla(slide,filas,7.05,1.62,5.73,2.15,[1.2,0.85,1.35,1.35,0.85],8.6);
  im296Shape(pptx,slide,7.05,4.18,5.73,1.22,"EAF4FB","B6D6EC",true);
  im296Texto(slide,"Lectura ejecutiva",7.27,4.34,2.2,0.27,{fontSize:11,bold:true,color:IM296_COLOR.azul});
  const mejor=(datos.porSede||[]).slice().sort((a,b)=>b.produccion-a.produccion)[0];
  const mensaje=mejor
    ? `${mejor.sede} registró la mayor producción valorizada del periodo con ${im296Moneda(mejor.produccion)}.`
    :"Sin producción valorizada para el periodo seleccionado.";
  im296Texto(slide,mensaje,7.27,4.7,5.2,0.48,{fontSize:10,color:IM296_COLOR.texto});
  im296Texto(slide,"El informe usa las partidas y tarifas registradas en MI VISUAL para el mes seleccionado.",7.27,5.42,5.15,0.46,{fontSize:9,color:IM296_COLOR.gris});
}
function im296AgregarCalidad(pptx,datos,pagina){
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,"Calidad y efectividad por sede","Indicadores que afectan el desempeño operativo",pagina,datos.periodo,IM296_COLOR.azul2);
  const filas=[im296CabeceraTabla(["SEDE","CUADRILLAS","EFECTIVIDAD","RE cableado","VTR / GAR","OBS.","MONTO OBS.","PENALIDAD WIN"],IM296_COLOR.azul)];
  (datos.porSede||[]).forEach(s=>filas.push([
    s.sede,im296Numero(s.cuadrillas),im296Porcentaje(s.efectividad),im296Porcentaje(s.recableado),
    im296Porcentaje(s.vtrgar),im296Numero(s.observaciones),im296Moneda(s.montoObservaciones),im296Moneda(s.penalidadesWin)
  ]));
  im296AgregarTabla(slide,filas,0.55,1.25,12.2,2.05,[1.3,1.05,1.3,1.25,1.25,0.7,1.6,1.7],10);
  const r=datos.resumen||{};
  const bloques=[
    ["EFECTIVIDAD GENERAL",im296Porcentaje(r.efectividad),`${im296Numero(r.finalizadas)} finalizadas`,IM296_COLOR.azul2],
    ["RE CABLEADO",im296Porcentaje(r.recableado),`${im296Numero(r.recableados)} de ${im296Numero(r.rojos)}`,IM296_COLOR.naranja],
    ["VTR / GAR",im296Porcentaje(r.vtrgar),`${im296Numero(r.incidenciasVtrGar)} incidencias`,IM296_COLOR.rojo],
    ["OBSERVACIONES",im296Numero(r.observaciones),im296Moneda(r.montoObservaciones),IM296_COLOR.amarillo]
  ];
  bloques.forEach((k,i)=>im296Kpi(pptx,slide,0.55+i*3.12,3.85,2.82,1.42,...k));
  im296Shape(pptx,slide,0.55,5.68,12.2,0.82,"FFFFFF","CBD5E1",true);
  im296Texto(slide,"Lectura: menor recableado, menor VTR/GAR y menor impacto de observaciones representan mejor calidad operativa.",0.82,5.91,11.65,0.32,{fontSize:10.5,bold:true,color:IM296_COLOR.azul});
}
function im296AgregarOperacionSede(pptx,datos,sede,pagina){
  const color=im296ColorSede(sede);
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,`Gestión operativa · ${sede}`,"Indicadores y ranking por cuadrilla",pagina,datos.periodo,color);
  const lista=(datos.cuadrillas||[]).filter(x=>String(x.sede)===String(sede)).sort((a,b)=>b.puntajeGestion-a.puntajeGestion);
  const filas=[im296CabeceraTabla(["#","CUADRILLA","PUNTOS","FINALIZADAS","EFECT.","RE CABLEADO","VTR/GAR","OBS.","GESTIÓN"],color)];
  lista.forEach((x,i)=>filas.push([
    String(i+1),im296Recortar(x.cuadrilla,35),im296Numero(x.puntos),
    `${im296Numero(x.finalizadas)} / ${im296Numero(x.totalGestionado)}`,
    im296Porcentaje(x.efectividad),im296Porcentaje(x.recableado),im296Porcentaje(x.vtrgar),
    im296Numero(x.observaciones),Number(x.puntajeGestion||0).toFixed(1)
  ]));
  im296AgregarTabla(slide,filas,0.45,1.22,12.45,5.35,[0.35,3.15,0.85,1.25,0.95,1.15,1.0,0.55,0.9],9.2);
  const mejor=lista[0];
  if(mejor)im296Texto(slide,`Líder de sede: ${mejor.cuadrilla} · ${Number(mejor.puntajeGestion||0).toFixed(1)} puntos de gestión`,0.58,6.67,8.6,0.25,{fontSize:9.5,bold:true,color});
  im296Texto(slide,datos.reglas?.ranking||"",9.1,6.67,3.6,0.25,{fontSize:6.8,color:IM296_COLOR.gris,align:"right"});
}
function im296AgregarEconomicoGeneral(pptx,datos,pagina){
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,"Análisis económico consolidado","Ingresos, costos y rentabilidad Zona Norte",pagina,datos.periodo,IM296_COLOR.verde);
  const r=datos.resumen||{};
  im296Kpi(pptx,slide,0.55,1.2,2.82,1.35,"PRODUCCIÓN",im296Moneda(r.produccion),`${im296Numero(r.ordenes)} trabajos`,IM296_COLOR.azul2);
  im296Kpi(pptx,slide,3.67,1.2,2.82,1.35,"TOTAL COSTOS",im296Moneda(r.costos),"Todos los conceptos",IM296_COLOR.rojo);
  im296Kpi(pptx,slide,6.79,1.2,2.82,1.35,"UTILIDAD",im296Moneda(r.utilidad),"Resultado neto",im296ColorResultado(r.utilidad));
  im296Kpi(pptx,slide,9.91,1.2,2.82,1.35,"RENTABILIDAD",im296Porcentaje(r.margen),"Utilidad / Producción",im296ColorResultado(r.margen));
  im296TituloBloque(pptx,slide,"Composición de costos",0.55,2.95,7.1,IM296_COLOR.rojo);
  const costos=[
    ["Materiales",r.materiales],["Sueldos",r.sueldos],["Combustible",r.combustible],
    ["Alquiler de unidad",r.alquilerUnidad],["Pago PDG",r.pagoPdg],
    ["Bonos",r.bonos],["Penalidades WIN",r.penalidadesWin]
  ];
  const max=Math.max(...costos.map(x=>Number(x[1])||0),1);
  costos.forEach((x,i)=>{
    const y=3.48+i*0.43;
    im296Texto(slide,x[0],0.72,y,1.55,0.22,{fontSize:8.6,bold:true});
    im296Shape(pptx,slide,2.3,y+0.04,3.7,0.13,"E7EDF3","E7EDF3",true);
    im296Shape(pptx,slide,2.3,y+0.04,Math.max(0.07,3.7*(Number(x[1]||0)/max)),0.13,IM296_COLOR.rojo,IM296_COLOR.rojo,true);
    im296Texto(slide,im296Moneda(x[1]),6.08,y,1.3,0.22,{fontSize:8.6,bold:true,align:"right"});
  });
  im296TituloBloque(pptx,slide,"Resultado por sede",7.95,2.95,4.78,IM296_COLOR.verde);
  const filas=[im296CabeceraTabla(["SEDE","PRODUCCIÓN","COSTOS","UTILIDAD","MARGEN"],IM296_COLOR.verde)];
  (datos.porSede||[]).forEach(s=>filas.push([
    s.sede,im296Moneda(s.produccion),im296Moneda(s.costos),im296Moneda(s.utilidad),im296Porcentaje(s.margen)
  ]));
  im296AgregarTabla(slide,filas,7.95,3.45,4.78,2.05,[0.95,1.15,1.05,1.05,0.75],8.2);
  im296Shape(pptx,slide,7.95,5.82,4.78,0.62,datos.provisional?"FFF7D6":"E5F7EE",datos.provisional?IM296_COLOR.amarillo:IM296_COLOR.verde,true);
  im296Texto(slide,datos.provisional?"Resultado provisional: revise las alertas de costos.":"Resultado consolidado con costos completos.",8.15,5.99,4.35,0.27,{fontSize:9,bold:true,color:datos.provisional?"7A4D00":IM296_COLOR.verde});
}
function im296AgregarEconomicoSede(pptx,datos,sede,pagina){
  const color=im296ColorSede(sede);
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,`Resultado económico · ${sede}`,"Producción, costos, utilidad y margen por cuadrilla",pagina,datos.periodo,color);
  const lista=(datos.cuadrillas||[]).filter(x=>String(x.sede)===String(sede)).sort((a,b)=>b.utilidad-a.utilidad);
  const filas=[im296CabeceraTabla(["CUADRILLA","PRODUCCIÓN","MATERIALES","OPERATIVO / PDG","BONOS","PENALIDAD","UTILIDAD","MARGEN"],color)];
  lista.forEach(x=>filas.push(im296FilaEconomica(x)));
  im296AgregarTabla(slide,filas,0.42,1.22,12.5,5.18,[3.05,1.45,1.25,1.45,1.0,1.05,1.4,0.85],8.45);
  const resumen=(datos.porSede||[]).find(x=>String(x.sede)===String(sede))||{};
  im296Shape(pptx,slide,0.55,6.56,12.2,0.44,"FFFFFF",color,true);
  im296Texto(slide,`Producción ${im296Moneda(resumen.produccion)}  ·  Costos ${im296Moneda(resumen.costos)}  ·  Utilidad ${im296Moneda(resumen.utilidad)}  ·  Margen ${im296Porcentaje(resumen.margen)}`,0.78,6.64,11.7,0.25,{fontSize:10,bold:true,color});
}
function im296AgregarRankings(pptx,datos,pagina){
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,"Rankings ejecutivos","Gestión operativa y utilidad mensual",pagina,datos.periodo,IM296_COLOR.amarillo);
  im296TituloBloque(pptx,slide,"Ranking de gestión",0.55,1.15,5.95,IM296_COLOR.azul);
  const rg=[im296CabeceraTabla(["#","SEDE","CUADRILLA","PUNTAJE"],IM296_COLOR.azul)];
  (datos.rankingGestion||[]).slice(0,10).forEach(x=>rg.push([
    String(x.puesto),x.sede,im296Recortar(x.cuadrilla,30),Number(x.puntajeGestion||0).toFixed(1)
  ]));
  im296AgregarTabla(slide,rg,0.55,1.63,5.95,4.85,[0.38,0.95,3.7,0.75],8.7);
  im296TituloBloque(pptx,slide,"Ranking de utilidad",6.82,1.15,5.95,IM296_COLOR.verde);
  const ru=[im296CabeceraTabla(["#","SEDE","CUADRILLA","UTILIDAD","MARGEN"],IM296_COLOR.verde)];
  (datos.rankingUtilidad||[]).slice(0,10).forEach(x=>ru.push([
    String(x.puesto),x.sede,im296Recortar(x.cuadrilla,28),im296Moneda(x.utilidad),im296Porcentaje(x.margen)
  ]));
  im296AgregarTabla(slide,ru,6.82,1.63,5.95,4.85,[0.35,0.85,2.7,1.35,0.7],8.2);
  im296Texto(slide,datos.reglas?.ranking||"",0.62,6.66,6.2,0.23,{fontSize:7.2,color:IM296_COLOR.gris});
  im296Texto(slide,"PDG: la utilidad descuenta pago por partidas, materiales y penalidades WIN.",7.0,6.66,5.55,0.23,{fontSize:7.2,color:IM296_COLOR.gris,align:"right"});
}
function im296AgregarConclusiones(pptx,datos,pagina){
  const slide=pptx.addSlide();
  im296Encabezado(pptx,slide,"Conclusiones y foco de gestión","Lectura automática del periodo seleccionado",pagina,datos.periodo,IM296_COLOR.naranja);
  const conclusiones=datos.conclusiones||[];
  const colores={
    resultado:IM296_COLOR.azul2,sede:IM296_COLOR.naranja,gestion:IM296_COLOR.azul,
    economico:IM296_COLOR.verde,alerta:IM296_COLOR.rojo,calidad:IM296_COLOR.amarillo,control:IM296_COLOR.verde
  };
  conclusiones.slice(0,7).forEach((x,i)=>{
    const y=1.18+i*0.74;
    const color=colores[x.tipo]||IM296_COLOR.azul2;
    im296Shape(pptx,slide,0.65,y,12.0,0.57,"FFFFFF",color,true);
    im296Shape(pptx,slide,0.65,y,0.08,0.57,color,color);
    im296Texto(slide,x.texto,0.92,y+0.1,11.45,0.34,{fontSize:10.5,bold:i<2,color:IM296_COLOR.texto});
  });
  im296Shape(pptx,slide,0.65,6.55,12.0,0.38,IM296_COLOR.azul,IM296_COLOR.azul,true);
  im296Texto(slide,"Prioridad: sostener productividad, corregir indicadores de calidad y controlar costos por cuadrilla.",0.9,6.62,11.5,0.22,{fontSize:10,bold:true,color:"FFFFFF",align:"center"});
}

async function im298LeerXml(zip,ruta){
  const archivo=zip.file(ruta);
  return archivo?archivo.async("string"):"";
}
function im298GuardarXml(zip,ruta,contenido){
  if(contenido)zip.file(ruta,contenido);
}
function im298RepararFondosYFormas(xml){
  if(!xml)return xml;
  return xml
    .replace(/prst="oval"/g,'prst="ellipse"')
    .replace(/prst="roundedRectangle"/g,'prst="roundRect"')
    .replace(/anchor="mid"/g,'anchor="ctr"')
    .replace(/<p:bgPr>([\s\S]*?)<\/p:bgPr>/g,(bloque,contenido)=>{
      return /<a:effectLst\b/.test(contenido)
        ?bloque
        :`<p:bgPr>${contenido}<a:effectLst/></p:bgPr>`;
    });
}
async function im298CrearPowerPointCompatible(pptx){
  if(typeof window.JSZip!=="function"){
    throw new Error("No se pudo iniciar la validación del PowerPoint. Actualice la aplicación e inténtelo nuevamente.");
  }

  const original=await pptx.write({outputType:"arraybuffer",compression:true});
  const zip=await window.JSZip.loadAsync(original);

  zip.remove("ppt/notesMasters/");
  zip.remove("ppt/notesSlides/");

  const tieneGraficos=Object.keys(zip.files).some(ruta=>/^ppt\/charts\/chart\d+\.xml$/i.test(ruta));
  const tieneAdjuntos=Object.keys(zip.files).some(ruta=>/^ppt\/embeddings\/[^/]+$/i.test(ruta));
  if(!tieneGraficos)zip.remove("ppt/charts/");
  if(!tieneAdjuntos)zip.remove("ppt/embeddings/");

  let presentacion=await im298LeerXml(zip,"ppt/presentation.xml");
  presentacion=presentacion.replace(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/g,"");
  im298GuardarXml(zip,"ppt/presentation.xml",presentacion);

  let relaciones=await im298LeerXml(zip,"ppt/_rels/presentation.xml.rels");
  relaciones=relaciones.replace(/<Relationship\b[^>]*notesMaster[^>]*\/>/g,"");
  im298GuardarXml(zip,"ppt/_rels/presentation.xml.rels",relaciones);

  const rutas=Object.keys(zip.files);
  for(const ruta of rutas.filter(x=>/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(x))){
    let xml=await im298LeerXml(zip,ruta);
    xml=xml.replace(/<Relationship\b[^>]*notesSlide[^>]*\/>/g,"");
    im298GuardarXml(zip,ruta,xml);
  }

  const patronesReales=new Set(
    Object.keys(zip.files)
      .filter(x=>/^ppt\/slideMasters\/slideMaster\d+\.xml$/i.test(x))
      .map(x=>x.split("/").pop())
  );
  let tipos=await im298LeerXml(zip,"[Content_Types].xml");
  tipos=tipos
    .replace(/<Override\b[^>]*PartName="\/ppt\/slideMasters\/([^"]+)"[^>]*\/>/g,(bloque,archivo)=>{
      return patronesReales.has(archivo)?bloque:"";
    })
    .replace(/<Override\b[^>]*PartName="\/ppt\/notes(?:Masters|Slides)\/[^"]+"[^>]*\/>/g,"");

  const extensionesUsadas=new Set(
    Object.keys(zip.files)
      .filter(x=>!zip.files[x].dir&&x.includes("."))
      .map(x=>x.split(".").pop().toLowerCase())
  );
  tipos=tipos.replace(/<Default\b[^>]*Extension="([^"]+)"[^>]*\/>/g,(bloque,extension)=>{
    return extensionesUsadas.has(String(extension).toLowerCase())?bloque:"";
  });
  im298GuardarXml(zip,"[Content_Types].xml",tipos);

  for(const ruta of Object.keys(zip.files).filter(x=>/^ppt\/(?:slides|slideMasters|slideLayouts)\/[^/]+\.xml$/i.test(x))){
    const xml=im298RepararFondosYFormas(await im298LeerXml(zip,ruta));
    im298GuardarXml(zip,ruta,xml);
  }

  return zip.generateAsync({
    type:"uint8array",
    compression:"DEFLATE",
    compressionOptions:{level:6},
    mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation"
  });
}
function im298DescargarPowerPoint(contenido,nombre){
  const blob=new Blob([contenido],{
    type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"
  });
  const url=URL.createObjectURL(blob);
  const enlace=document.createElement("a");
  enlace.href=url;
  enlace.download=nombre;
  enlace.style.display="none";
  document.body.appendChild(enlace);
  enlace.click();
  setTimeout(()=>{
    URL.revokeObjectURL(url);
    enlace.remove();
  },1500);
}
async function im296GenerarPowerPoint(datos){
  if(typeof window.PptxGenJS!=="function")throw new Error("No se pudo iniciar el generador de PowerPoint. Actualice la aplicación e inténtelo nuevamente.");
  const pptx=new window.PptxGenJS();
  pptx.layout="LAYOUT_WIDE";
  pptx.author="MI VISUAL · Visual Connections SAC";
  pptx.company="Visual Connections SAC";
  pptx.subject=`Informe ejecutivo mensual ${datos.periodo}`;
  pptx.title=`MI VISUAL · Informe ${datos.periodo}`;
  pptx.lang="es-PE";
  pptx.theme={
    headFontFace:"Aptos Display",bodyFontFace:"Aptos",lang:"es-PE"
  };
  im296AgregarPortada(pptx,datos);
  let pagina=2;
  im296AgregarResumen(pptx,datos,pagina++);
  im296AgregarProduccion(pptx,datos,pagina++);
  im296AgregarCalidad(pptx,datos,pagina++);
  (datos.porSede||[]).forEach(s=>im296AgregarOperacionSede(pptx,datos,s.sede,pagina++));
  im296AgregarEconomicoGeneral(pptx,datos,pagina++);
  (datos.porSede||[]).forEach(s=>im296AgregarEconomicoSede(pptx,datos,s.sede,pagina++));
  im296AgregarRankings(pptx,datos,pagina++);
  im296AgregarConclusiones(pptx,datos,pagina++);
  const nombre=`MI_VISUAL_INFORME_${String(datos.periodoClave||"PERIODO").replace("-","_")}.pptx`;
  const contenido=await im298CrearPowerPointCompatible(pptx);
  im298DescargarPowerPoint(contenido,nombre);
  return nombre;
}
async function util296DescargarInformeMensual(){
  if(!aePuedeDescargarUtilidad()){alert("No tienes permiso para descargar el informe mensual.");return}
  const periodo=document.getElementById("util292Periodo")?.value||aePeriodoActual();
  const boton=document.getElementById("util296Descargar");
  const textoOriginal=boton?.innerHTML||"⬇ Informe mensual";
  try{
    if(boton){boton.disabled=true;boton.textContent="Preparando datos..."}
    const datos=await util292Api({
      accion:"obtenerInformeMensualEjecutivo",
      usuario:localStorage.getItem("usuario"),
      periodo
    });
    if(boton)boton.textContent="Creando PowerPoint...";
    await im296GenerarPowerPoint(datos);
  }catch(e){
    alert("No se pudo generar el informe mensual.\n\n"+(e.message||e));
  }finally{
    if(boton){boton.disabled=false;boton.innerHTML=textoOriginal}
  }
}

window.mostrarUtilidadCuadrillas=mostrarUtilidadCuadrillas;
window.util292CambiarVista=util292CambiarVista;
window.util292Consultar=util292Consultar;
window.util292CambiarSede=util292CambiarSede;
window.util292AplicarFiltros=util292AplicarFiltros;
window.util293CargarCostos=util293CargarCostos;
window.util293GuardarCostos=util293GuardarCostos;
window.util293AlternarVisualizacion=util293AlternarVisualizacion;
window.util293AlternarEdicion=util293AlternarEdicion;
window.util296DescargarInformeMensual=util296DescargarInformeMensual;
