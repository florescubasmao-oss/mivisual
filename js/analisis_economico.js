
// V184 - Menú económico con Producción valorizada y Costo de materiales
function aeApiMateriales(payload){
  return fetch(API_ANALISIS_ECONOMICO,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload)
  }).then(async r=>{
    const data=await r.json();
    if(!data.ok)throw new Error(data.error||"Error en materiales");
    return data;
  });
}
function aeEscape(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function aePerfilActual(){return (localStorage.getItem("perfil")||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function aeEsJefaturaAlmacen(){return aePerfilActual()==="JEFATURA ALMACEN"}
function aeEsGerenciaLima(){return aePerfilActual()==="GERENCIA LIMA"}
function aePerfilMateriales(){return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA","JEFATURA ALMACEN","ADMIN","ADMINISTRADOR"].includes(aePerfilActual())}
function aePerfilImportarMateriales(){return ["JEFATURA","JEFATURA GENERAL","JEFATURA ALMACEN","ADMIN","ADMINISTRADOR"].includes(aePerfilActual())}
function aePerfilProduccionValorizada(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(aePerfilActual())}
function aePeriodoMesesMateriales(){return aeOpcionesPeriodo()}

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
    .ae184-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
    .ae184-option{background:#fff;color:#0f172a;border:2px solid #bfdbfe;border-radius:18px;padding:22px;cursor:pointer;box-shadow:0 10px 22px rgba(2,6,23,.18);min-height:145px;text-align:left}
    .ae184-option:hover{border-color:#2563eb;transform:translateY(-2px)}
    .ae184-option .ico{font-size:38px;display:block;margin-bottom:8px}.ae184-option b{font-size:20px}.ae184-option p{font-size:13px;color:#475569}
    @media(max-width:700px){.ae184-grid{grid-template-columns:1fr}}
  </style>
  <section class="ae184-home">
    <div class="ae184-head"><h2>📊 Análisis Económico</h2><p>Producción valorizada y control económico del consumo de materiales.</p></div>
    <div class="ae184-grid">
      ${aePerfilProduccionValorizada()?`<button class="ae184-option" onclick="mostrarProduccionValorizada()"><span class="ico">💰</span><b>Producción valorizada</b><p>Valorización mensual, metas, sedes, cuadrillas y tipos de partida.</p></button>`:""}
      <button class="ae184-option" onclick="mostrarCostoMateriales()"><span class="ico">📦</span><b>Costo y consumo de materiales</b><p>Importación, consolidación por cuadrilla, tipo de trabajo, sede y costo total.</p></button>
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
  const texto=(valor||"Sin actualización registrada").toString();
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
  const registros=(Array.isArray(lista)?lista:[]).filter(x=>aeNormalizarSedeDiaria(x.sede)===aeNormalizarSedeDiaria(sede)&&Number(x.monto)>0);
  const monto=registros.reduce((t,x)=>t+(Number(x.monto)||0),0);
  const dias=registros.length;
  const cuadrillas=aeTotalCuadrillasDiarias(data,sede);
  const mejor=registros.reduce((m,x)=>!m||Number(x.monto)>Number(m.monto)?x:m,null);
  return {
    sede:aeNormalizarSedeDiaria(sede),
    monto,
    dias,
    cuadrillas,
    promedio:dias?monto/dias:0,
    promedioDiarioCuadrilla:dias&&cuadrillas?monto/(dias*cuadrillas):0,
    mejor
  };
}
function aeTarjetasResumenDiario(lista,sedes,data){
  if(!sedes.length)return '<div class="ae-vacio">Sin información diaria por sede para este periodo.</div>';
  return `<div class="ae-diario-resumen">${sedes.map(s=>{
    const r=aeResumenSedeDiaria(lista,s,data);
    const mejor=r.mejor?`${aeEscape(r.mejor.fecha||r.mejor.fechaClave||"-")} · ${aeMoneda(r.mejor.monto)}`:"Sin producción";
    return `<article class="ae-diario-kpi"><span>${aeEscape(r.sede)}</span><strong>${aeMoneda(r.monto)}</strong><small>Promedio diario: <b>${aeMoneda(r.promedio)}</b></small><small>Cuadrillas: <b>${aeNumero(r.cuadrillas)}</b></small><small>Promedio diario por cuadrilla: <b>${aeMoneda(r.promedioDiarioCuadrilla)}</b></small><small>${r.dias} día${r.dias===1?"":"s"} con producción</small><em>Mejor día: ${mejor}</em></article>`;
  }).join("")}</div>`;
}
function aeTablaDiariaTodas(lista,sedes,data){
  const fechas=[...new Set(lista.map(x=>String(x.fechaClave||"")))].filter(Boolean).sort();
  if(!fechas.length)return '<div class="ae-vacio">Sin información diaria por sede para este periodo.</div>';
  const mapa={};
  lista.forEach(x=>{const f=String(x.fechaClave||"");const s=aeNormalizarSedeDiaria(x.sede);if(!mapa[f])mapa[f]={fecha:x.fecha||f};mapa[f][s]=(mapa[f][s]||0)+(Number(x.monto)||0)});
  const totalCuadrillas=aeTotalCuadrillasDiarias(data,"TODAS");
  const cab=sedes.map(s=>`<th>${aeEscape(s)}</th>`).join("");
  const filas=fechas.map(f=>{
    const r=mapa[f]||{};
    const total=sedes.reduce((t,s)=>t+(Number(r[s])||0),0);
    const promedioCuadrilla=totalCuadrillas?total/totalCuadrillas:0;
    return `<tr><td>${aeEscape(r.fecha||f)}</td>${sedes.map(s=>`<td>${aeMoneda(r[s]||0)}</td>`).join("")}<td><b>${aeMoneda(total)}</b></td><td>${aeNumero(totalCuadrillas)}</td><td><b>${aeMoneda(promedioCuadrilla)}</b></td></tr>`;
  }).join("");
  return `<div class="ae-diario-tabla-wrap"><table class="ae-diario-tabla"><thead><tr><th>Fecha</th>${cab}<th>Total diario</th><th>Total cuadrillas</th><th>Promedio por cuadrilla</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}
function aeTablaDiariaSede(lista,sede,data){
  const registros=lista.filter(x=>aeNormalizarSedeDiaria(x.sede)===aeNormalizarSedeDiaria(sede)).sort((a,b)=>String(a.fechaClave||"").localeCompare(String(b.fechaClave||"")));
  if(!registros.length)return '<div class="ae-vacio">Sin información para la sede seleccionada.</div>';
  const totalCuadrillas=aeTotalCuadrillasDiarias(data,sede);
  let acumulado=0,dias=0;
  const filas=registros.map(x=>{
    const monto=Number(x.monto)||0;
    acumulado+=monto;
    if(monto>0)dias++;
    const promedio=dias?acumulado/dias:0;
    const promedioCuadrilla=totalCuadrillas?monto/totalCuadrillas:0;
    return `<tr><td>${aeEscape(x.fecha||x.fechaClave||"-")}</td><td>${aeMoneda(monto)}</td><td>${aeNumero(x.cantidad)} órdenes</td><td>${aeNumero(totalCuadrillas)}</td><td><b>${aeMoneda(promedioCuadrilla)}</b></td><td>${aeMoneda(acumulado)}</td><td>${aeMoneda(promedio)}</td></tr>`;
  }).join("");
  return `<div class="ae-diario-tabla-wrap"><table class="ae-diario-tabla"><thead><tr><th>Fecha</th><th>Monto diario</th><th>Órdenes</th><th>Total cuadrillas</th><th>Promedio por cuadrilla</th><th>Acumulado</th><th>Promedio diario</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}
function aeVistaMontoDiarioSede(data,sede="TODAS"){
  const lista=Array.isArray(data?.porDiaSede)?data.porDiaSede:[];
  const sedes=aeListaSedesDiarias(lista);
  if(!lista.length)return '<div class="ae-vacio">No se recibió el detalle diario por sede. Actualice también Code.gs y realice un nuevo despliegue de Apps Script.</div>';
  if(sede==="TODAS")return `${aeTarjetasResumenDiario(lista,sedes,data)}${aeTablaDiariaTodas(lista,sedes,data)}`;
  return `${aeTarjetasResumenDiario(lista,[sede],data)}${aeTablaDiariaSede(lista,sede,data)}`;
}
function aeModuloMontoDiarioSede(data){
  const lista=Array.isArray(data?.porDiaSede)?data.porDiaSede:[];
  const sedes=aeListaSedesDiarias(lista);
  return `<div class="ae-diario-filtro"><label>Filtrar por sede<select id="aeFiltroSedeDiaria" onchange="aeActualizarVistaDiariaSede()"><option value="TODAS">TODAS LAS SEDES</option>${sedes.map(s=>`<option value="${aeEscape(s)}">${aeEscape(s)}</option>`).join("")}</select></label></div><div id="aeDiarioSedeContenido">${aeVistaMontoDiarioSede(data,"TODAS")}</div>`;
}
function aeActualizarVistaDiariaSede(){
  const sede=document.getElementById("aeFiltroSedeDiaria")?.value||"TODAS";
  const cont=document.getElementById("aeDiarioSedeContenido");
  if(cont)cont.innerHTML=aeVistaMontoDiarioSede(window.aeDatosAnalisisActual||{},sede);
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
  const r=data.resumen||{},pm=data.parametrosMeta||{},faltante=Math.max(0,(Number(r.metaTotal)||0)-(Number(r.montoTotal)||0));
  window.aeDatosAnalisisActual=data;
  document.getElementById("aeResultado").innerHTML=`<div class="ae-periodo"><b>${data.periodo}</b><span>Actualizado: ${data.fechaActualizacion}</span></div><div class="ae-kpis">${aeTarjeta("Monto generado",aeMoneda(r.montoTotal),`Meta ${aeMoneda(r.metaTotal)}`,aeClaseCumplimiento(r.cumplimiento))}${aeTarjeta("Cumplimiento",aePorcentaje(r.cumplimiento),faltante>0?`Faltan ${aeMoneda(faltante)}`:"Meta alcanzada",aeClaseCumplimiento(r.cumplimiento))}${aeTarjeta("Proyección de cierre",aeMoneda(r.proyeccionCierre),`${r.diasConProduccion||0} días con producción`,aeClaseCumplimiento((r.proyeccionCierre||0)/(r.metaTotal||1)))}${aeTarjeta("Órdenes ejecutadas",aeNumero(r.ordenesEjecutadas),"Finalizadas registradas en Producción")}${aeTarjeta("Ticket promedio",aeMoneda(r.ticketPromedio),"Monto promedio por orden")}${aeTarjeta("Cuadrillas activas",aeNumero(pm.cuadrillasActivas),`${aeMoneda(pm.metaMensualCuadrilla)} por cuadrilla`)}</div>${aeSeccion("🏢 Monto generado por sede",aeFilas((data.porSede||[]).filter(x=>String(x.sede||"").toUpperCase()!=="TODAS"),"sede"),false)}${aeSeccion("👷 Monto generado por cuadrilla",aeFilas((data.porCuadrilla||[]).filter(x=>/^P\d+\b/i.test(String(x.cuadrilla||""))),"cuadrilla"),false)}${aeSeccion("🧭 Monto generado por plataforma",aeFilas(data.porPlataforma,"plataforma"),false)}${aeSeccion("📦 Monto generado por tipo de partida",aeFilas(data.porTipoPartida,"tipo"),false)}${aeSeccion("📅 Monto diario por sede y promedio",aeModuloMontoDiarioSede(data),false)}${aeAlertaSinTarifa(data)}`;
}
