// MI VISUAL V253 - Origen PROPIA / ASIGNADA en Calificación VTR/GAR
const API_BASE_OPERATIVA = (window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec");
let BO_REGISTROS = [];
let BO_ARCHIVO = "";
let BO_INCIDENCIAS = [];
let BO_ASIGNACIONES = [];
let BO_CUADRILLAS = [];
let BO_PREVISTA = null;
let BO_CATALOGO_OPCIONES = {plataformas:[],grupos:[],estados:[]};
let BO_CONTROL_LECTURA = {registrosValidos:0,finalizadasPeriodo:0,finalizadasLeidas:0,duplicadosExactos:0};
let BO_REGISTROS_ORIGINALES = [];
let BO_DUPLICADOS_REVISION = [];
let BO_DUPLICADOS_REVISADOS = true;
let BO_FILAS_OMITIDAS = 0;
let BO_FILTRO_ORIGEN_VG = "";

function boNorm(v){
  return (v == null ? "" : String(v)).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function boEsc(v){
  return (v == null ? "" : String(v)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function boUsuario(){
  return localStorage.getItem("usuario") || localStorage.getItem("correo") || "";
}
function boApi(payload){
  return fetch(API_BASE_OPERATIVA, {
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload)
  }).then(async r => {
    const t = await r.text();
    let j;
    try { j = JSON.parse(t); } catch(e) { throw new Error("Respuesta inválida del servidor"); }
    if(!j.ok) throw new Error(j.error || "No se pudo completar la operación");
    return j;
  });
}
function boCargarXlsx(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error("No se pudo cargar el lector de Excel"));
    s.onerror=()=>reject(new Error("No se pudo cargar el lector de Excel"));
    document.head.appendChild(s);
  });
}
function boFechaISO(v){
  if(v instanceof Date && !isNaN(v.getTime())){
    return [v.getFullYear(),String(v.getMonth()+1).padStart(2,"0"),String(v.getDate()).padStart(2,"0")].join("-");
  }
  if(typeof v === "number" && window.XLSX){
    const d=XLSX.SSF.parse_date_code(v);
    if(d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const t=(v==null?"":String(v)).trim();
  let m=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m=t.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if(m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  return "";
}
function boFechaVisible(iso){
  const p=(iso||"").split("-");
  return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(iso||"");
}
function boCss(){
  return `<style>
  .bo-wrap{max-width:1120px;margin:auto;padding:18px;color:#f8fafc}.bo-head{margin-bottom:14px}.bo-head h2{margin:0 0 5px}.bo-head p{margin:0;color:#cbd5e1}
  .bo-card{background:linear-gradient(145deg,#172033,#22304a);border:1px solid rgba(148,163,184,.28);border-radius:18px;padding:17px;margin-bottom:14px;box-shadow:0 10px 25px rgba(2,6,23,.25)}
  .bo-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end}.bo-file,.bo-input,.bo-select,.bo-text{width:100%;box-sizing:border-box;padding:11px;border:1px solid #64748b;border-radius:10px;background:#fff;color:#0f172a}
  .bo-btn{border:0;border-radius:11px;padding:11px 16px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer}.bo-btn.alt{background:#475569}.bo-btn.warn{background:#b45309}.bo-btn:disabled{opacity:.55;cursor:not-allowed}
  .bo-msg{padding:11px;border-radius:10px;margin-top:12px;background:#0f172a;color:#dbeafe;white-space:pre-line}.bo-ok{background:#064e3b}.bo-error{background:#7f1d1d}.bo-warn{background:#78350f}
  .bo-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.bo-kpi{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:12px}.bo-kpi b{font-size:21px;display:block}.bo-kpi span{font-size:11px;color:#cbd5e1}
  .bo-table-wrap{overflow:auto;max-height:520px;border-radius:12px}.bo-table{width:100%;border-collapse:collapse;font-size:12px;background:#fff;color:#111827}.bo-table th{position:sticky;top:0;background:#1e3a5f;color:#fff;text-align:left;padding:9px;z-index:1}.bo-table td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top}.bo-table tr:nth-child(even){background:#f8fafc}
  .bo-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bo-form label{font-size:12px;font-weight:800;color:#dbeafe;display:flex;flex-direction:column;gap:5px}.bo-wide{grid-column:1/-1}.bo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.bo-note{font-size:12px;color:#fcd34d;line-height:1.5}.bo-badge{display:inline-block;padding:4px 7px;border-radius:999px;background:#dbeafe;color:#1e3a8a;font-size:10px;font-weight:800}.bo-missing{border:1px solid #f59e0b;background:#111827;border-radius:13px;padding:13px;margin-top:10px}.bo-missing h4{margin:0 0 7px;color:#fde68a}.bo-match{font-size:11px;color:#cbd5e1;margin:5px 0}.bo-new-form{margin-top:12px;padding-top:12px;border-top:1px dashed #64748b}.bo-hidden{display:none!important}.bo-dup{border:1px solid #f59e0b;background:#111827;border-radius:13px;padding:13px;margin-top:10px}.bo-dup h4{margin:0 0 7px;color:#fde68a}.bo-dup-grid{display:grid;grid-template-columns:1fr 250px;gap:12px;align-items:center}.bo-dup small{color:#cbd5e1;line-height:1.45}.bo-dup select{width:100%}
  .bo-vg-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px}.bo-vg-kpi{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px}.bo-vg-kpi b{display:block;font-size:21px}.bo-vg-kpi span{font-size:10px;color:#cbd5e1}
  .bo-sede{border:1px solid #425979;border-radius:14px;margin:12px 0;overflow:hidden}.bo-sede>summary{cursor:pointer;padding:12px 14px;background:#10213b;font-weight:900}.bo-sede-cuerpo{padding:10px}
  .bo-inc-card{position:relative;background:#f8fafc;color:#0f172a;border-left:5px solid #f59e0b;border-radius:12px;padding:12px;margin:9px 0}.bo-inc-card.hist{border-left-color:#0f766e}.bo-inc-card.hist .bo-inc-head{padding-right:24px}.bo-inc-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}.bo-inc-type{font-weight:900}.bo-inc-statuses{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.bo-origin-vg{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#e5e7eb;color:#475569;border:1px solid #cbd5e1}.bo-origin-vg.propia{background:#dcfce7;color:#166534;border-color:#86efac}.bo-origin-vg.asignada{background:#dbeafe;color:#1d4ed8;border-color:#93c5fd}.bo-vg-filter{display:flex;align-items:end;gap:10px;flex-wrap:wrap;padding:10px;border-radius:11px;background:#0f172a;border:1px solid #334155;margin:10px 0}.bo-vg-filter label{font-size:11px;font-weight:900;color:#dbeafe;display:flex;flex-direction:column;gap:5px;min-width:210px}.bo-bono-ind{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:900;color:#334155}.bo-bono-dot{width:13px;height:13px;border-radius:50%;display:inline-block;border:2px solid rgba(255,255,255,.95);box-shadow:0 0 0 1px rgba(15,23,42,.35)}.bo-bono-dot.verde{background:#22c55e}.bo-bono-dot.amarillo{background:#facc15}.bo-bono-dot.naranja{background:#f97316}.bo-bono-dot.plomo{background:#94a3b8}.bo-bono-legend{display:flex;gap:10px;flex-wrap:wrap;padding:10px;border-radius:11px;background:#e2e8f0;color:#0f172a;margin:10px 0 14px}.bo-bono-legend span{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800}.bo-inc-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;font-size:12px}.bo-inc-data span{color:#475569}.bo-inc-data b{display:block;color:#111827}.bo-inc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.bo-mini-btn{border:0;border-radius:9px;padding:8px 10px;font-weight:800;cursor:pointer;color:#fff;background:#047857}.bo-mini-btn.alt{background:#1d4ed8}.bo-mini-btn.warn{background:#b45309}.bo-mini-btn.danger{background:#991b1b}.bo-edit-dot{position:absolute;right:8px;top:8px;width:20px;height:20px;border-radius:50%;border:2px solid #fff;background:#ef4444;color:#ef4444;box-shadow:0 0 0 1px #7f1d1d;cursor:pointer;padding:0;font-size:0}.bo-state{display:inline-block;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900;background:#dbeafe;color:#1e3a8a}.bo-state.anulado{background:#fee2e2;color:#991b1b}.bo-state.reasignado{background:#fef3c7;color:#92400e}.bo-editor{border:2px solid #ef4444;background:#111827;border-radius:14px;padding:14px;margin:12px 0}
  @media(max-width:760px){.bo-vg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.bo-inc-data{grid-template-columns:1fr}}
  @media(max-width:760px){.bo-grid,.bo-form{grid-template-columns:1fr}.bo-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.bo-wide{grid-column:auto}}
  </style>`;
}

function mostrarActualizarBaseOperativa(){
  BO_REGISTROS=[]; BO_REGISTROS_ORIGINALES=[]; BO_DUPLICADOS_REVISION=[]; BO_DUPLICADOS_REVISADOS=true; BO_FILAS_OMITIDAS=0; BO_ARCHIVO=""; BO_CONTROL_LECTURA={registrosValidos:0,finalizadasPeriodo:0,finalizadasLeidas:0,duplicadosExactos:0};
  mostrarPantalla(boCss()+`<div class="bo-wrap">
    <div class="bo-head"><h2>📤 Actualizar base operativa</h2><p>Una sola carga reemplaza completamente Producción, Efectividad, % Recableado y VTR/GAR del periodo detectado.</p></div>
    <div class="bo-card">
      <div class="bo-grid"><div><label><b>Archivo base madre</b></label><input id="boArchivo" class="bo-file" type="file" accept=".xlsx,.xls,.csv,.htm,.html"></div><button id="boLeer" class="bo-btn" onclick="boLeerArchivo()">Leer archivo</button></div>
      <p class="bo-note">La fecha oficial será el último día con órdenes en estado FINALIZADA. Las órdenes posteriores a ese corte no se mezclarán. Antes de escribir, el sistema valida toda la carga y conserva un respaldo para restaurar si ocurre un error.</p>
      <details id="boCompatibilidad" style="margin:12px 0"><summary style="cursor:pointer;font-weight:800">El archivo .xls no abre o viene acompañado de una carpeta</summary>
        <p class="bo-note"><b>Opción recomendada para este reporte:</b> seleccione la carpeta cuyo nombre termina en <b>_archivos</b>. El sistema buscará y leerá automáticamente <b>sheet001.htm</b>, que contiene la base real.</p>
        <div class="bo-grid"><div><label><b>Carpeta complementaria del reporte</b></label><input id="boCarpetaReporte" class="bo-file" type="file" webkitdirectory directory multiple></div><button id="boLeerCarpeta" class="bo-btn" onclick="boLeerCarpetaReporte()">Leer carpeta</button></div>
        <p class="bo-note" style="margin-top:14px">Alternativamente, abra el reporte en Excel y guárdelo como <b>.xlsx</b>, o copie toda la tabla, incluidos los encabezados, y péguela debajo.</p>
        <textarea id="boTextoBase" class="bo-text" rows="7" placeholder="Pegue aquí toda la base madre..."></textarea><div class="bo-actions"><button class="bo-btn" onclick="boLeerTextoPegado()">Leer texto pegado</button></div>
      </details>
      <div id="boMensaje" class="bo-msg">Seleccione el archivo descargado del sistema central o pegue toda la tabla.</div>
      <div id="boResumen"></div>
      <div class="bo-actions"><button id="boProcesar" class="bo-btn warn" onclick="boProcesarBase()" disabled>Reemplazar información actual</button><button class="bo-btn alt" onclick="mostrarAdministracion()">⬅️ Volver</button></div>
    </div>
  </div>`);
}

function boWorksheetAMatrizCompleta(ws){
  if(!ws || !ws["!ref"]) return [];
  const rango=XLSX.utils.decode_range(ws["!ref"]);
  const filas=[];
  for(let r=rango.s.r;r<=rango.e.r;r++){
    const fila=[];
    for(let c=rango.s.c;c<=rango.e.c;c++){
      const celda=ws[XLSX.utils.encode_cell({r,c})];
      if(!celda){fila.push("");continue;}
      let valor=celda.v;
      if(valor==null && celda.w!=null)valor=celda.w;
      fila.push(valor==null?"":valor);
    }
    filas.push(fila);
  }
  return filas;
}

function boBuscarHojaValida(wb){
  const requeridos=["CUADRILLA","FECHA","ESTADO","TIPO DE PARTIDA"];
  let mejor=null;
  wb.SheetNames.forEach(nombre=>{
    const ws=wb.Sheets[nombre];
    const rows=boWorksheetAMatrizCompleta(ws);
    if(!rows.length) return;
    const max=Math.min(rows.length,25);
    for(let i=0;i<max;i++){
      const heads=(rows[i]||[]).map(boNorm);
      const score=requeridos.filter(h=>heads.includes(h)).length;
      if(!mejor || score>mejor.score || (score===mejor.score && rows.length>(mejor.rows||[]).length)){
        mejor={nombre,rows,filaEnc:i,heads,score};
      }
    }
  });
  if(!mejor || mejor.score<4) throw new Error("No se encontraron los encabezados Cuadrilla, Fecha, Estado y Tipo de Partida");
  return mejor;
}

function boIndiceEncabezados(heads){
  const alias={
    tipoTrabajo:["TIPO DE TRABAJO"],cuadrilla:["CUADRILLA"],fecha:["FECHA"],estado:["ESTADO"],
    numeroDocumento:["NUMERO DE DOCUMENTO"],cliente:["CLIENTE"],sede:["SEDE"],
    codigoPedido:["CODIGO DE PEDIDO"],ticket:["TICKET"],codigoLiquidacion:["CODIGO DE LIQUIDACION"],
    tipoAtencion:["TIPO DE ATENCION / PAQUETE DE SERVICIO","TIPO DE ATENCION/PAQUETE DE SERVICIO"],tipoPartida:["TIPO DE PARTIDA"],tipoPartidaAlterna:["OBSERVACION ADICIONAL O DE LA CANCELACION"]
  };
  const out={};
  Object.keys(alias).forEach(k=>{
    out[k]=-1;
    alias[k].some(a=>{const n=heads.indexOf(a);if(n>=0){out[k]=n;return true;}return false;});
  });
  return out;
}
function boEsIndiceExcelHtml(texto){
  const t=(texto||"").slice(0,50000);
  return /Excel Workbook Frameset/i.test(t) && /sheet\d+\.html?/i.test(t);
}

function boTablaHtmlAMatriz(texto){
  const doc=new DOMParser().parseFromString(texto||"","text/html");
  const tablas=Array.from(doc.querySelectorAll("table"));
  if(!tablas.length) throw new Error("El archivo HTML no contiene tablas.");

  let mejor=null;
  tablas.forEach(tabla=>{
    const filas=Array.from(tabla.querySelectorAll("tr"));
    const matriz=[];
    const pendientes={};

    filas.forEach(tr=>{
      const salida=[];
      let columna=0;

      function aplicarPendientes(){
        while(pendientes[columna]&&pendientes[columna].filas>0){
          const p=pendientes[columna];
          salida[columna]=p.valor;
          p.filas--;
          if(p.filas<=0) delete pendientes[columna];
          columna++;
        }
      }

      aplicarPendientes();
      Array.from(tr.children).filter(c=>/^(TD|TH)$/i.test(c.tagName)).forEach(celda=>{
        aplicarPendientes();
        const valor=(celda.textContent||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
        const colspan=Math.max(Number(celda.getAttribute("colspan"))||1,1);
        const rowspan=Math.max(Number(celda.getAttribute("rowspan"))||1,1);

        for(let c=0;c<colspan;c++){
          salida[columna+c]=c===0?valor:"";
          if(rowspan>1){
            pendientes[columna+c]={valor:c===0?valor:"",filas:rowspan-1};
          }
        }
        columna+=colspan;
      });
      aplicarPendientes();
      matriz.push(salida);
    });

    const max=Math.min(matriz.length,20);
    for(let i=0;i<max;i++){
      const heads=(matriz[i]||[]).map(boNorm);
      const score=["CUADRILLA","FECHA","ESTADO","TIPO DE PARTIDA"].filter(h=>heads.includes(h)).length;
      if(!mejor||score>mejor.score) mejor={rows:matriz,filaEnc:i,heads,score};
    }
  });

  if(!mejor||mejor.score<4){
    throw new Error("No se encontró una tabla HTML con los encabezados requeridos.");
  }
  return mejor;
}

function boResultadoHtmlDirecto(texto){
  const sel=boTablaHtmlAMatriz(texto);
  return boExtraerRegistros(sel.rows,sel.filaEnc,sel.heads);
}

function boResultadoWorkbookLocal(wb){
  const sel=boBuscarHojaValida(wb);
  return {resultado:boExtraerRegistros(sel.rows,sel.filaEnc,sel.heads),nombre:sel.nombre};
}

function boPuntajeResultadoLectura(resultado){
  const c=(resultado&&resultado.control)||{};
  return (Number(c.finalizadasPeriodo)||0)*1000000+(Number(resultado&&resultado.registros&&resultado.registros.length)||0);
}

function boLeerHtmlCompleto(texto,archivo,detalleOrigen){
  let directo=null,alterno=null,errorDirecto=null,errorAlterno=null;
  try{directo=boResultadoHtmlDirecto(texto);}catch(e){errorDirecto=e;}
  try{
    const wb=XLSX.read(texto,{type:"string",cellDates:true});
    alterno=boResultadoWorkbookLocal(wb);
  }catch(e){errorAlterno=e;}

  if(!directo && !alterno){
    throw errorDirecto||errorAlterno||new Error("No se pudo leer la tabla HTML.");
  }

  let elegido,detalle;
  if(directo && alterno){
    if(boPuntajeResultadoLectura(alterno.resultado)>boPuntajeResultadoLectura(directo)){
      elegido=alterno.resultado;
      detalle=`Lectura Excel HTML completa · Hoja: ${alterno.nombre}`;
    }else{
      elegido=directo;
      detalle="Lectura directa de tabla HTML";
    }
  }else if(directo){
    elegido=directo;detalle="Lectura directa de tabla HTML";
  }else{
    elegido=alterno.resultado;detalle=`Lectura Excel HTML completa · Hoja: ${alterno.nombre}`;
  }

  boAplicarLecturaLocal(elegido,archivo,(detalleOrigen||"")+`${detalleOrigen?"\n":""}${detalle}`);
  return elegido;
}

function boClaveExactaLocal(r){
  return [
    r.fecha||"",boNorm(r.cuadrilla),boNorm(r.estado),boNorm(r.tipoTrabajo),
    boNorm(r.numeroDocumento),boNorm(r.cliente),boNorm(r.sede),
    boNorm(r.codigoPedido),boNorm(r.ticket),boNorm(r.codigoLiquidacion),
    boNorm(r.tipoAtencion),boNorm(r.tipoPartida),boNorm(r.tipoPartidaAlterna)
  ].join("|");
}

function boDetectarDuplicadosLocal(registros){
  const grupos={};
  registros.forEach((r,i)=>{
    const clave=boClaveExactaLocal(r);
    if(!grupos[clave])grupos[clave]={clave,indices:[],muestra:r};
    grupos[clave].indices.push(i);
  });
  return Object.values(grupos).filter(g=>g.indices.length>1).map((g,i)=>({
    id:`DUP-${i+1}`,
    clave:g.clave,
    indices:g.indices,
    cantidad:g.indices.length,
    fecha:g.muestra.fecha||"",
    cuadrilla:g.muestra.cuadrilla||"",
    estado:g.muestra.estado||"",
    codigoPedido:g.muestra.codigoPedido||"",
    ticket:g.muestra.ticket||"",
    codigoLiquidacion:g.muestra.codigoLiquidacion||"",
    tipoAtencion:g.muestra.tipoAtencion||"",
    tipoPartida:g.muestra.tipoPartida||""
  }));
}

function boCalcularControlLectura(registros,finalizadasLeidas,corte){
  const p=(corte||"").split("-");
  const anio=p.length===3?Number(p[0]):0;
  const mes=p.length===3?Number(p[1]):0;
  let finalizadasPeriodo=0;
  registros.forEach(r=>{
    if(boNorm(r.estado)==="FINALIZADA"){
      const fp=(r.fecha||"").split("-");
      if(fp.length===3 && Number(fp[0])===anio && Number(fp[1])===mes && r.fecha<=corte)finalizadasPeriodo++;
    }
  });
  const duplicadosDetalle=boDetectarDuplicadosLocal(registros);
  const duplicadosExactos=duplicadosDetalle.reduce((s,g)=>s+(g.cantidad-1),0);
  return {
    registrosValidos:registros.length,
    finalizadasPeriodo,
    finalizadasLeidas:Number(finalizadasLeidas)||0,
    duplicadosExactos,
    duplicadosDetectados:duplicadosExactos,
    duplicadosConservados:duplicadosExactos,
    duplicadosOmitidos:0,
    duplicadosRevisados:duplicadosExactos===0,
    duplicadosDetalle
  };
}

function boExtraerRegistros(rows,filaEnc,heads){
  const idx=boIndiceEncabezados(heads);
  const faltan=["cuadrilla","fecha","estado","tipoPartida"].filter(k=>idx[k]<0);
  if(faltan.length) throw new Error("Faltan columnas obligatorias: "+faltan.join(", "));
  const registros=[];let omitidas=0,finalizadasLeidas=0,finalizadasOmitidas=0;
  for(let i=filaEnc+1;i<rows.length;i++){
    const f=rows[i]||[];
    const estadoRaw=(f[idx.estado]||"").toString().trim();
    const esFinalizada=boNorm(estadoRaw)==="FINALIZADA";
    if(esFinalizada)finalizadasLeidas++;
    const fecha=boFechaISO(f[idx.fecha]);
    const cuadrilla=(f[idx.cuadrilla]||"").toString().trim();
    if(!fecha||!cuadrilla||!estadoRaw){
      omitidas++;
      if(esFinalizada)finalizadasOmitidas++;
      continue;
    }
    registros.push({
      tipoTrabajo:idx.tipoTrabajo>=0?f[idx.tipoTrabajo]:"",cuadrilla,fecha,estado:estadoRaw,
      numeroDocumento:idx.numeroDocumento>=0?f[idx.numeroDocumento]:"",cliente:idx.cliente>=0?f[idx.cliente]:"",
      sede:idx.sede>=0?f[idx.sede]:"",
      codigoPedido:idx.codigoPedido>=0?f[idx.codigoPedido]:"",ticket:idx.ticket>=0?f[idx.ticket]:"",
      codigoLiquidacion:idx.codigoLiquidacion>=0?f[idx.codigoLiquidacion]:"",
      tipoAtencion:idx.tipoAtencion>=0?f[idx.tipoAtencion]:"",tipoPartida:f[idx.tipoPartida],
      tipoPartidaAlterna:idx.tipoPartidaAlterna>=0?f[idx.tipoPartidaAlterna]:""
    });
  }
  if(!registros.length) throw new Error("No se encontraron filas válidas.");
  const finalizadas=registros.filter(r=>boNorm(r.estado)==="FINALIZADA"&&r.fecha).map(r=>r.fecha).sort();
  if(!finalizadas.length) throw new Error("La base no contiene órdenes FINALIZADAS; no se puede definir la fecha de corte.");
  const corte=finalizadas[finalizadas.length-1];
  const control=boCalcularControlLectura(registros,finalizadasLeidas,corte);
  if(finalizadasOmitidas>0){
    throw new Error(`La lectura quedó incompleta: ${finalizadasOmitidas} orden(es) FINALIZADAS no tienen Fecha o Cuadrilla válida. No se modificó ninguna hoja.`);
  }
  return {registros,omitidas,corte,control};
}

function boRenderResumenLectura(registros,omitidas,corte,control){
  const revisados=control.duplicadosRevisados===true;
  const detectados=Number(control.duplicadosDetectados||control.duplicadosExactos||0);
  return `<div class="bo-kpis">
    <div class="bo-kpi"><b>${registros.length}</b><span>Filas válidas a procesar</span></div>
    <div class="bo-kpi"><b>${control.finalizadasPeriodo}</b><span>Finalizadas del periodo</span></div>
    <div class="bo-kpi"><b>${boFechaVisible(corte)}</b><span>Último día finalizado</span></div>
    <div class="bo-kpi"><b>${new Set(registros.map(r=>boNorm(r.cuadrilla))).size}</b><span>Cuadrillas detectadas</span></div>
    <div class="bo-kpi"><b>${omitidas}</b><span>Filas omitidas por datos inválidos</span></div>
    <div class="bo-kpi"><b>${detectados}</b><span>Copias exactas detectadas${detectados?revisados?" · revisadas":" · pendientes":""}</span></div>
  </div>`;
}

function boRenderRevisionDuplicados(){
  if(!BO_DUPLICADOS_REVISION.length)return "";
  return `<div id="boRevisionDuplicados" class="bo-card" style="margin-top:12px;border-color:#f59e0b">
    <h3 style="margin-top:0;color:#fde68a">Revisión obligatoria de posibles duplicados</h3>
    <p class="bo-note"><b>Las atenciones del mismo cliente en fechas diferentes nunca se consideran duplicadas y siempre se contabilizan por separado.</b> Aquí solo aparecen filas completamente iguales del mismo día. Debe indicar si ambas atenciones son válidas o si una es una copia del archivo.</p>
    <div class="bo-actions"><button class="bo-btn" onclick="boMarcarTodosDuplicados('CONSERVAR')">Contar todos</button><button class="bo-btn warn" onclick="boMarcarTodosDuplicados('OMITIR')">Excluir todas las copias exactas</button></div>
    ${BO_DUPLICADOS_REVISION.map((g,i)=>`<div class="bo-dup"><div class="bo-dup-grid"><div><h4>${boEsc(g.cuadrilla)} · ${boFechaVisible(g.fecha)}</h4><small><b>${boEsc(g.estado)}</b> · Pedido: ${boEsc(g.codigoPedido||"-")} · Ticket: ${boEsc(g.ticket||"-")} · Liquidación: ${boEsc(g.codigoLiquidacion||"-")}<br>${boEsc(g.tipoPartida||g.tipoAtencion||"SIN PARTIDA")}<br><b>${g.cantidad} filas completamente iguales</b></small></div><select id="boDupDecision_${i}" class="bo-select"><option value="">Seleccione una decisión...</option><option value="CONSERVAR">Contar las ${g.cantidad} filas</option><option value="OMITIR">Contar 1 y excluir ${g.cantidad-1} copia(s)</option></select></div></div>`).join("")}
    <div class="bo-actions"><button class="bo-btn" onclick="boConfirmarDuplicados()">Confirmar decisiones y continuar</button></div>
  </div>`;
}

function boMarcarTodosDuplicados(valor){
  BO_DUPLICADOS_REVISION.forEach((_,i)=>{const el=document.getElementById(`boDupDecision_${i}`);if(el)el.value=valor;});
}

function boConfirmarDuplicados(){
  const decisiones=[];
  for(let i=0;i<BO_DUPLICADOS_REVISION.length;i++){
    const el=document.getElementById(`boDupDecision_${i}`);
    const valor=el&&el.value;
    if(!valor){alert("Debe decidir qué hacer con cada grupo de filas iguales.");return;}
    decisiones.push(valor);
  }
  const excluir=new Set();
  let conservados=0;
  BO_DUPLICADOS_REVISION.forEach((g,i)=>{
    if(decisiones[i]==="OMITIR")g.indices.slice(1).forEach(n=>excluir.add(n));
    else conservados+=g.cantidad-1;
  });
  BO_REGISTROS=BO_REGISTROS_ORIGINALES.filter((_,i)=>!excluir.has(i));
  const finalizadas=BO_REGISTROS.filter(r=>boNorm(r.estado)==="FINALIZADA"&&r.fecha).map(r=>r.fecha).sort();
  const corte=finalizadas[finalizadas.length-1]||"";
  const control=boCalcularControlLectura(BO_REGISTROS,BO_CONTROL_LECTURA.finalizadasLeidas,corte);
  control.duplicadosDetectados=BO_DUPLICADOS_REVISION.reduce((s,g)=>s+(g.cantidad-1),0);
  control.duplicadosConservados=conservados;
  control.duplicadosOmitidos=excluir.size;
  control.duplicadosRevisados=true;
  control.decisionesDuplicados=BO_DUPLICADOS_REVISION.map((g,i)=>({clave:g.clave,decision:decisiones[i],cantidad:g.cantidad}));
  BO_CONTROL_LECTURA=control;
  BO_DUPLICADOS_REVISADOS=true;
  document.getElementById("boResumen").innerHTML=boRenderResumenLectura(BO_REGISTROS,BO_FILAS_OMITIDAS,corte,control)+`<div class="bo-msg bo-ok">Duplicados revisados: ${control.duplicadosDetectados}. Conservados: ${control.duplicadosConservados}. Copias excluidas: ${control.duplicadosOmitidos}.<br>Las visitas realizadas en fechas diferentes continúan contabilizándose por separado.</div>`;
  const msg=document.getElementById("boMensaje");msg.className="bo-msg bo-ok";msg.textContent=`Revisión de duplicados completada. Finalizadas del periodo: ${control.finalizadasPeriodo}. Ya puede continuar con la previsualización.`;
  document.getElementById("boProcesar").disabled=false;
}

function boAplicarLecturaLocal(resultado,archivo,detalleOrigen){
  const {registros,omitidas,corte,control}=resultado;
  BO_FILAS_OMITIDAS=Number(omitidas)||0;
  BO_REGISTROS_ORIGINALES=registros.map(r=>Object.assign({},r));
  BO_REGISTROS=BO_REGISTROS_ORIGINALES.map(r=>Object.assign({},r));
  BO_ARCHIVO=archivo||"BASE_OPERATIVA";
  BO_CONTROL_LECTURA=control||boCalcularControlLectura(registros,0,corte);
  BO_DUPLICADOS_REVISION=BO_CONTROL_LECTURA.duplicadosDetalle||[];
  BO_DUPLICADOS_REVISADOS=BO_DUPLICADOS_REVISION.length===0;
  document.getElementById("boResumen").innerHTML=boRenderResumenLectura(BO_REGISTROS,omitidas,corte,BO_CONTROL_LECTURA)+boRenderRevisionDuplicados();
  const msg=document.getElementById("boMensaje");
  if(BO_DUPLICADOS_REVISADOS){
    msg.className="bo-msg bo-ok";
    msg.textContent=`Base lista: ${archivo||"BASE OPERATIVA"}${detalleOrigen?`\n${detalleOrigen}`:""}\nFinalizadas del periodo leídas: ${BO_CONTROL_LECTURA.finalizadasPeriodo}.\nLa información actual será reemplazada completamente al confirmar.`;
  }else{
    msg.className="bo-msg bo-warn";
    msg.textContent=`Base leída correctamente. Se detectaron ${BO_CONTROL_LECTURA.duplicadosExactos} copia(s) exacta(s). Revise cada caso antes de continuar. Las visitas del mismo cliente en días diferentes no aparecen como duplicadas y se contabilizan ambas.`;
  }
  document.getElementById("boProcesar").disabled=!BO_DUPLICADOS_REVISADOS;
}

function boLeerWorkbookLocal(wb,archivo,detalleOrigen){
  const local=boResultadoWorkbookLocal(wb);
  boAplicarLecturaLocal(local.resultado,archivo,(detalleOrigen||"")+`${detalleOrigen?"\n":""}Hoja detectada: ${local.nombre} · lectura completa por rango`);
  return local.resultado;
}
async function boLeerArchivo(){
  const msg=document.getElementById("boMensaje"),file=document.getElementById("boArchivo").files[0];
  if(!file){msg.className="bo-msg bo-error";msg.textContent="Seleccione un archivo.";return;}
  try{
    document.getElementById("boLeer").disabled=true;msg.className="bo-msg";msg.textContent="Leyendo y validando archivo...";
    await boCargarXlsx();
    const buffer=await file.arrayBuffer();
    const muestra=new TextDecoder("utf-8").decode(buffer.slice(0,Math.min(buffer.byteLength,50000)));
    if(boEsIndiceExcelHtml(muestra)){
      BO_REGISTROS=[];document.getElementById("boProcesar").disabled=true;
      const detalles=document.getElementById("boCompatibilidad");if(detalles)detalles.open=true;
      msg.className="bo-msg bo-warn";
      msg.textContent=`El archivo ${file.name} es solo el índice del reporte y no contiene las filas.\nSeleccione debajo la carpeta complementaria que termina en _archivos. El sistema leerá automáticamente sheet001.htm.`;
      return;
    }
    if(/\.html?$/i.test(file.name) || /^\s*<html/i.test(muestra)){
      const texto=new TextDecoder("utf-8").decode(buffer);
      boLeerHtmlCompleto(texto,file.name,"");
    }else{
      const wb=XLSX.read(buffer,{type:"array",cellDates:true});
      boLeerWorkbookLocal(wb,file.name,"");
    }
  }catch(e){
    BO_REGISTROS=[];document.getElementById("boProcesar").disabled=true;msg.className="bo-msg bo-error";
    msg.textContent=e.message+" Si el reporte viene con una carpeta _archivos, selecciónela en la opción abierta debajo.";
  }finally{document.getElementById("boLeer").disabled=false;}
}

async function boLeerCarpetaReporte(){
  const msg=document.getElementById("boMensaje"),input=document.getElementById("boCarpetaReporte");
  const archivos=Array.from((input&&input.files)||[]);
  if(!archivos.length){msg.className="bo-msg bo-error";msg.textContent="Seleccione la carpeta complementaria del reporte, la que termina en _archivos.";return;}
  const boton=document.getElementById("boLeerCarpeta");
  try{
    boton.disabled=true;msg.className="bo-msg";msg.textContent="Buscando la hoja con la base dentro de la carpeta...";
    await boCargarXlsx();
    const candidatos=archivos.filter(f=>/sheet\d+\.html?$/i.test(f.name)).concat(archivos.filter(f=>/\.html?$/i.test(f.name)&&!/sheet\d+\.html?$/i.test(f.name)));
    if(!candidatos.length)throw new Error("La carpeta seleccionada no contiene sheet001.htm ni otra hoja HTML del reporte.");
    let ultimoError=null;
    for(const archivo of candidatos){
      try{
        const texto=await archivo.text();
        if(boEsIndiceExcelHtml(texto))continue;
        const detalle=`Carpeta: ${archivo.webkitRelativePath||"carpeta seleccionada"}`;
        boLeerHtmlCompleto(texto,archivo.name,detalle);
        return;
      }catch(e){ultimoError=e;}
    }
    throw ultimoError||new Error("No se encontró dentro de la carpeta una hoja con los encabezados requeridos.");
  }catch(e){
    BO_REGISTROS=[];document.getElementById("boProcesar").disabled=true;msg.className="bo-msg bo-error";
    msg.textContent="No se pudo leer la carpeta. "+e.message;
  }finally{boton.disabled=false;}
}

function boLeerTextoPegado(){
  const msg=document.getElementById("boMensaje"),texto=(document.getElementById("boTextoBase").value||"").trim();
  if(!texto){msg.className="bo-msg bo-error";msg.textContent="Pegue la base completa, incluidos los encabezados.";return;}
  try{
    const rows=texto.split(/\r?\n/).filter(x=>x.trim()).map(x=>x.split("\t"));
    if(rows.length<2||rows[0].length<4)throw new Error("El texto no conserva las columnas. Copie directamente desde Excel usando Ctrl+C.");
    let mejor=null;
    for(let i=0;i<Math.min(rows.length,20);i++){
      const heads=(rows[i]||[]).map(boNorm);
      const score=["CUADRILLA","FECHA","ESTADO","TIPO DE PARTIDA"].filter(h=>heads.includes(h)).length;
      if(!mejor||score>mejor.score)mejor={filaEnc:i,heads,score};
    }
    if(!mejor||mejor.score<4)throw new Error("No se encontraron los encabezados obligatorios.");
    const resultado=boExtraerRegistros(rows,mejor.filaEnc,mejor.heads);
    boAplicarLecturaLocal(resultado,"BASE_PEGADA","Lectura completa desde tabla pegada");
  }catch(e){
    BO_REGISTROS=[];BO_CONTROL_LECTURA={registrosValidos:0,finalizadasPeriodo:0,finalizadasLeidas:0,duplicadosExactos:0};
    document.getElementById("boProcesar").disabled=true;msg.className="bo-msg bo-error";msg.textContent=e.message;
  }
}

function boOpcionesDatalist(id, valores){
  return `<datalist id="${id}">${(valores||[]).map(v=>`<option value="${boEsc(v)}"></option>`).join("")}</datalist>`;
}

function boRenderResolucionPartidas(vista){
  const faltantes=(vista.sugerenciasNoClasificadas||[]);
  if(!faltantes.length)return "";
  const plataformas=(vista.catalogoOpciones&&vista.catalogoOpciones.plataformas)||[];
  const grupos=(vista.catalogoOpciones&&vista.catalogoOpciones.grupos)||[];
  const estados=(vista.catalogoOpciones&&vista.catalogoOpciones.estados)||["ACTIVO"];
  return `<div class="bo-card bo-preview-generated" id="boResolverPartidas"><h3>Resolver partidas sin catálogo</h3>
    <p class="bo-note">Revise cada sugerencia. Nada se asigna automáticamente. Puede copiar los datos de una coincidencia confirmada o registrar únicamente la nueva partida con sus datos correctos.</p>
    ${boOpcionesDatalist("boListaPlataformas",plataformas)}${boOpcionesDatalist("boListaGrupos",grupos)}
    ${faltantes.map((f,i)=>{
      const sugerencias=f.sugerencias||[];
      return `<div class="bo-missing">
        <h4>${boEsc(f.tipoPartida||"SIN PARTIDA")}</h4>
        <div class="bo-match"><b>${Number(f.cantidad)||0}</b> orden(es) · Cuadrillas: ${boEsc((f.cuadrillas||[]).join(", ")||"-")}</div>
        ${sugerencias.length?`<label style="display:block;margin-top:9px"><b>Coincidencias sugeridas</b><select id="boSug_${i}" class="bo-select" style="margin-top:5px">${sugerencias.map((x,j)=>`<option value="${j}">${x.similitud}% · ${boEsc(x.codigo)} · ${boEsc(x.tipoOrden)} · ${boEsc(x.plataforma)} · ${boEsc(x.puntaje)} pt · S/ ${Number(x.monto||0).toFixed(2)}</option>`).join("")}</select></label>
          <div class="bo-actions"><button class="bo-btn" onclick="boUsarCoincidenciaPartida(${i})">Usar coincidencia seleccionada</button><button class="bo-btn alt" onclick="boMostrarNuevaPartida(${i})">No coincide: registrar nueva</button></div>`:
          `<div class="bo-msg bo-warn">No se encontró una coincidencia suficientemente cercana.</div><div class="bo-actions"><button class="bo-btn" onclick="boMostrarNuevaPartida(${i})">Registrar nueva partida</button></div>`}
        <div id="boNueva_${i}" class="bo-new-form bo-hidden">
          <div class="bo-form">
            <label class="bo-wide">Tipo de partida detectado<input class="bo-input" value="${boEsc(f.tipoPartida||"")}" readonly></label>
            <label>Código<input id="boNuevoCodigo_${i}" class="bo-input" placeholder="Ej.: SRPVUTP5"></label>
            <label>Plataforma<input id="boNuevaPlataforma_${i}" class="bo-input" list="boListaPlataformas" placeholder="Plataforma"></label>
            <label>Puntaje<input id="boNuevoPuntaje_${i}" class="bo-input" type="number" min="0" step="0.01" placeholder="0.00"></label>
            <label>Grupo<input id="boNuevoGrupo_${i}" class="bo-input" list="boListaGrupos" placeholder="Grupo"></label>
            <label>Monto / tarifa<input id="boNuevoMonto_${i}" class="bo-input" type="number" min="0" step="0.01" placeholder="0.00"></label>
            <label>Estado<select id="boNuevoEstado_${i}" class="bo-select">${(estados.length?estados:["ACTIVO"]).map(e=>`<option value="${boEsc(e)}" ${boNorm(e)==="ACTIVO"?"selected":""}>${boEsc(e)}</option>`).join("")}</select></label>
          </div>
          <div class="bo-actions"><button class="bo-btn" onclick="boGuardarNuevaPartida(${i})">Guardar partida y volver a validar</button><button class="bo-btn alt" onclick="boMostrarNuevaPartida(${i},true)">Cancelar</button></div>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function boMostrarNuevaPartida(i,cerrar){
  const el=document.getElementById(`boNueva_${i}`);if(!el)return;
  if(cerrar)el.classList.add("bo-hidden");else el.classList.toggle("bo-hidden");
}

async function boUsarCoincidenciaPartida(i){
  const faltantes=(BO_PREVISTA&&BO_PREVISTA.sugerenciasNoClasificadas)||[];
  const f=faltantes[i];if(!f)return;
  const select=document.getElementById(`boSug_${i}`);
  const sugerencia=(f.sugerencias||[])[Number(select&&select.value)||0];
  if(!sugerencia){alert("Seleccione una coincidencia válida.");return;}
  const detalle=`Partida nueva:\n${f.tipoPartida}\n\nSe copiarán los datos de:\n${sugerencia.tipoOrden}\nCódigo: ${sugerencia.codigo}\nPlataforma: ${sugerencia.plataforma}\nPuntaje: ${sugerencia.puntaje}\nGrupo: ${sugerencia.grupo}\nMonto: S/ ${Number(sugerencia.monto||0).toFixed(2)}\n\nLa partida nueva se agregará al catálogo. ¿Confirmar?`;
  if(!confirm(detalle))return;
  try{
    await boApi({accion:"registrarPartidaCatalogoOperativa",usuario:boUsuario(),tipoPartida:f.tipoPartida,tipoPartidaReferencia:sugerencia.tipoOrden});
    const msg=document.getElementById("boMensaje");msg.className="bo-msg bo-ok";msg.textContent="Partida agregada al catálogo. Volviendo a validar la base cargada...";
    await boProcesarBase();
  }catch(e){alert(e.message);}
}

async function boGuardarNuevaPartida(i){
  const faltantes=(BO_PREVISTA&&BO_PREVISTA.sugerenciasNoClasificadas)||[];
  const f=faltantes[i];if(!f)return;
  const payload={
    accion:"registrarPartidaCatalogoOperativa",usuario:boUsuario(),tipoPartida:f.tipoPartida,
    codigo:(document.getElementById(`boNuevoCodigo_${i}`)||{}).value||"",
    plataforma:(document.getElementById(`boNuevaPlataforma_${i}`)||{}).value||"",
    puntaje:(document.getElementById(`boNuevoPuntaje_${i}`)||{}).value||"",
    grupo:(document.getElementById(`boNuevoGrupo_${i}`)||{}).value||"",
    monto:(document.getElementById(`boNuevoMonto_${i}`)||{}).value||"",
    estado:(document.getElementById(`boNuevoEstado_${i}`)||{}).value||"ACTIVO"
  };
  if(!payload.codigo||!payload.plataforma||payload.puntaje===""||!payload.grupo||payload.monto===""){
    alert("Complete Código, Plataforma, Puntaje, Grupo y Monto.");return;
  }
  if(!confirm(`Se agregará únicamente esta partida a CATALOGO_ORDENES:\n\n${f.tipoPartida}\nCódigo: ${payload.codigo}\nPlataforma: ${payload.plataforma}\nPuntaje: ${payload.puntaje}\nGrupo: ${payload.grupo}\nMonto: S/ ${Number(payload.monto||0).toFixed(2)}\n\n¿Confirmar?`))return;
  try{
    await boApi(payload);
    const msg=document.getElementById("boMensaje");msg.className="bo-msg bo-ok";msg.textContent="Nueva partida guardada. Volviendo a validar la base cargada...";
    await boProcesarBase();
  }catch(e){alert(e.message);}
}

async function boProcesarBase(){
  if(!BO_REGISTROS.length){alert("Primero lea un archivo válido.");return;}
  if(BO_DUPLICADOS_REVISION.length && !BO_DUPLICADOS_REVISADOS){alert("Revise y confirme los posibles duplicados antes de continuar.");const el=document.getElementById("boRevisionDuplicados");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return;}
  const btn=document.getElementById("boProcesar"),msg=document.getElementById("boMensaje"),resumen=document.getElementById("boResumen");
  try{
    btn.disabled=true;msg.className="bo-msg";msg.textContent="Validando resultados antes de reemplazar las hojas...";
    document.querySelectorAll(".bo-preview-generated").forEach(el=>el.remove());
    const vista=await boApi({accion:"previsualizarBaseOperativa",usuario:boUsuario(),archivo:BO_ARCHIVO,registros:BO_REGISTROS,controlLectura:BO_CONTROL_LECTURA});
    BO_PREVISTA=vista;BO_CATALOGO_OPCIONES=vista.catalogoOpciones||{plataformas:[],grupos:[],estados:[]};
    const a=vista.actual||{},n=vista.nuevo||{},partidas=vista.partidasNoEncontradas||[],cuadrillas=vista.cuadrillasNoEncontradas||[];
    const noClasificadas=vista.detalleNoClasificadas||[];
    const totalFinalizadas=Number(vista.totalFinalizadasBase||n.finalizadas||0);
    const totalClasificadas=Number(vista.totalProduccionClasificada||n.produccionOrdenes||0);
    const totalSinCatalogo=Number(vista.finalizadasSinCatalogo||Math.max(totalFinalizadas-totalClasificadas,0));
    const advertencias=[];
    if(partidas.length)advertencias.push(`Partidas sin catálogo: ${partidas.length}`);
    if(cuadrillas.length)advertencias.push(`Cuadrillas no encontradas en USUARIOS: ${cuadrillas.length}`);
    resumen.insertAdjacentHTML("beforeend",`<div class="bo-card bo-preview-generated" style="margin-top:12px"><h3>Previsualización antes de reemplazar</h3><div class="bo-table-wrap"><table class="bo-table"><thead><tr><th>Indicador</th><th>Actual</th><th>Nuevo</th></tr></thead><tbody>
      <tr><td>Órdenes clasificadas en Producción</td><td>${a.produccionOrdenes||0}</td><td>${totalClasificadas}</td></tr>
      <tr><td>Finalizadas detectadas</td><td>${a.finalizadas||0}</td><td>${totalFinalizadas}</td></tr>
      <tr><td>Finalizadas sin partida de catálogo</td><td>-</td><td><b>${totalSinCatalogo}</b></td></tr>
      <tr><td>Canceladas</td><td>${a.canceladas||0}</td><td>${n.canceladas||0}</td></tr>
      <tr><td>Regestiones</td><td>${a.regestiones||0}</td><td>${n.regestiones||0}</td></tr>
      <tr><td>Reprogramadas</td><td>${a.reprogramadas||0}</td><td>${n.reprogramadas||0}</td></tr>
      <tr><td>Los Rojos finalizados</td><td>${a.losRojos||0}</td><td>${n.losRojos||0}</td></tr>
      <tr><td>Recableados VT</td><td>${a.recableados||0}</td><td>${n.recableados||0}</td></tr>
      <tr><td>GAR</td><td>${a.gar||0}</td><td>${n.gar||0}</td></tr>
      <tr><td>VTR</td><td>${a.vtr||0}</td><td>${n.vtr||0}</td></tr>
    </tbody></table></div>${advertencias.length||totalSinCatalogo?`<div class="bo-msg bo-warn"><b>Validaciones:</b><br>${advertencias.map(boEsc).join("<br>")}${partidas.length?`<br><br><b>Partidas pendientes:</b><br>${partidas.slice(0,30).map(boEsc).join("<br>")}`:""}${noClasificadas.length?`<br><br><b>Finalizadas no clasificadas:</b><br>${noClasificadas.slice(0,40).map(x=>`${boEsc(x.tipoPartida||"SIN PARTIDA")} · ${Number(x.cantidad)||0} orden(es)`).join("<br>")}`:""}${cuadrillas.length?`<br><br><b>Cuadrillas:</b><br>${cuadrillas.map(boEsc).join("<br>")}`:""}</div>`:""}</div>`);
    const detalle=`Corte: ${vista.actualizadoAl}\nFinalizadas detectadas: ${totalFinalizadas}\nClasificadas en Producción: ${totalClasificadas}\nSin catálogo: ${totalSinCatalogo}\nLos Rojos: ${n.losRojos||0}\nRecableados VT: ${n.recableados||0}\nGAR: ${n.gar||0}\nVTR: ${n.vtr||0}\nDuplicados revisados: ${BO_CONTROL_LECTURA.duplicadosDetectados||0} · conservados: ${BO_CONTROL_LECTURA.duplicadosConservados||0} · omitidos: ${BO_CONTROL_LECTURA.duplicadosOmitidos||0}`;
    if(totalSinCatalogo>0){
      resumen.insertAdjacentHTML("beforeend",boRenderResolucionPartidas(vista));
      msg.className="bo-msg bo-warn";
      msg.textContent=`NO SE MODIFICÓ NINGUNA HOJA.\nHay ${totalSinCatalogo} órdenes FINALIZADAS pendientes de catálogo. Revise las coincidencias sugeridas o registre la partida nueva en esta misma pantalla.`;
      const resolver=document.getElementById("boResolverPartidas");if(resolver)resolver.scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }
    if(totalClasificadas!==totalFinalizadas){
      msg.className="bo-msg bo-error";
      msg.textContent=`NO SE MODIFICÓ NINGUNA HOJA.\nLa validación no coincide: ${totalFinalizadas} finalizadas y ${totalClasificadas} clasificadas en Producción.`;
      return;
    }
    if(!confirm(`PREVISUALIZACIÓN DE LA NUEVA BASE\n\n${detalle}\n\nEsta operación reemplazará completamente las cuatro hojas actuales y actualizará el Ranking. ¿Confirmar?`)){
      msg.className="bo-msg bo-warn";msg.textContent="Validación realizada. No se modificó ninguna hoja.";return;
    }
    msg.className="bo-msg";msg.textContent="Procesando base y actualizando hojas. No cierre esta pantalla...";
    const r=await boApi({accion:"procesarBaseOperativa",usuario:boUsuario(),archivo:BO_ARCHIVO,registros:BO_REGISTROS,controlLectura:BO_CONTROL_LECTURA});
    const desconocidas=(r.partidasNoEncontradas||[]),cuadNo=(r.cuadrillasNoEncontradas||[]);
    msg.className="bo-msg bo-ok";
    msg.textContent=`BASE OPERATIVA ACTUALIZADA\nCorte: ${r.actualizadoAl}\nFinalizadas cargadas: ${r.finalizadas||0}\nÓrdenes registradas en Producción: ${r.produccionOrdenes||0}\nProducción: ${r.produccion} filas agrupadas\nEfectividad: ${r.efectividad} cuadrillas\nRecableados: ${r.recableado} cuadrillas\nVTR/GAR: ${r.vtrgar} cuadrillas\nDuplicados revisados: ${r.duplicadosDetectados||0}
Copias conservadas: ${r.duplicadosConservados||0}
Copias omitidas: ${r.duplicadosOmitidos||0}\nConciliación posterior: ${r.conciliacion&&r.conciliacion.ok?"OK":"No confirmada"}\nRanking actualizado: ${r.ranking?"Sí":"No"}`;
    if(desconocidas.length||cuadNo.length)resumen.insertAdjacentHTML("beforeend",`<div class="bo-msg bo-warn bo-preview-generated">${desconocidas.length?`<b>Partidas no encontradas (${desconocidas.length}):</b><br>${desconocidas.slice(0,30).map(boEsc).join("<br>")}`:""}${cuadNo.length?`<br><br><b>Cuadrillas no encontradas en USUARIOS:</b><br>${cuadNo.map(boEsc).join("<br>")}`:""}</div>`);
  }catch(e){msg.className="bo-msg bo-error";msg.textContent="No se modificó la información. "+e.message;}
  finally{btn.disabled=false;}
}

async function mostrarAsignacionesVtrGar(){
  BO_FILTRO_ORIGEN_VG = "";
  mostrarPantalla(boCss()+`<div class="bo-wrap">
    <div class="bo-head"><h2>📡 Calificación VTR/GAR</h2><p>Todos los registros deben ser calificados. Solo los confirmados o reasignados ingresan al porcentaje VTR/GAR.</p></div>
    <div id="boAsigContenido" class="bo-card"><div class="bo-msg">Cargando incidencias...</div></div>
    <div class="bo-actions"><button class="bo-btn alt" onclick="mostrarAdministracion()">⬅️ Volver</button></div>
  </div>`);
  try{
    const r=await boApi({accion:"listarGestionVtrGar",usuario:boUsuario()});
    BO_INCIDENCIAS=r.incidencias||[];BO_CUADRILLAS=r.cuadrillas||[];BO_PREVISTA=r.resumen||{};
    boRenderGestionVtrGar();
  }catch(e){document.getElementById("boAsigContenido").innerHTML=`<div class="bo-msg bo-error">${boEsc(e.message)}</div>`;}
}
function boOpcionesCuadrilla(valor){
  const grupos={};
  BO_CUADRILLAS.forEach(c=>{const sede=c.sede||"SIN SEDE";(grupos[sede]||(grupos[sede]=[])).push(c);});
  return `<option value="">Seleccione...</option>`+Object.keys(grupos).sort().map(sede=>`<optgroup label="${boEsc(sede)}">${grupos[sede].map(c=>`<option value="${boEsc(c.cuadrilla)}" ${boNorm(c.cuadrilla)===boNorm(valor)?"selected":""}>${boEsc(c.cuadrilla)}</option>`).join("")}</optgroup>`).join("");
}
function boEstadoVg(estado){
  const e=boNorm(estado||"PENDIENTE");
  const cls=e==="ANULADO"?"anulado":e==="REASIGNADO"?"reasignado":"";
  return `<span class="bo-state ${cls}">${boEsc(e)}</span>`;
}
function boEstadoBonoVg(x){
  const color=boNorm(x&&x.colorBono||"NARANJA").toLowerCase();
  const etiqueta=x&&x.etiquetaBono?x.etiquetaBono:"Sin registro";
  const detalle=x&&x.coincidenciaBono==="TICKET"&&Number(x.similitudTicketBono)>0
    ?` · ticket ${Number(x.similitudTicketBono).toFixed(0)}%`
    :(x&&x.coincidenciaBono==="DATOS_RESPALDO"?" · coincidencia por datos":"");
  return `<span class="bo-bono-ind" title="${boEsc(etiqueta+detalle)}"><i class="bo-bono-dot ${boEsc(color)}"></i>${boEsc(etiqueta)}</span>`;
}
function boOrigenVg(x){
  const origen=boNorm(x&&x.origenOrden||x&&x.validacionBono&&x.validacionBono.origenOrden||"SIN REGISTRO");
  const valido=origen==="PROPIA"||origen==="ASIGNADA"?origen:"SIN REGISTRO";
  const cls=valido==="PROPIA"?"propia":valido==="ASIGNADA"?"asignada":"";
  const icono=valido==="PROPIA"?"🏠":valido==="ASIGNADA"?"📥":"⚪";
  return `<span class="bo-origin-vg ${cls}">${icono} ${boEsc(valido)}</span>`;
}
function boDetalleVg(x){
  return `<div class="bo-inc-data">
    <div><span>Fecha</span><b>${boEsc(x.fecha||"-")}</b></div><div><span>Ticket</span><b>${boEsc(x.ticket||"-")}</b></div>
    <div><span>DNI</span><b>${boEsc(x.numeroDocumento||"-")}</b></div><div><span>Cliente</span><b>${boEsc(x.cliente||"-")}</b></div>
    <div><span>Código de pedido</span><b>${boEsc(x.codigoPedido||"-")}</b></div><div><span>Tipo de partida</span><b>${boEsc(x.tipoPartida||"-")}</b></div>
    <div><span>Cuadrilla que atendió</span><b>${boEsc(x.cuadrillaEjecutora||"-")}</b></div><div><span>Origen de la orden</span><b>${boEsc(boNorm(x.origenOrden||x.validacionBono&&x.validacionBono.origenOrden||"SIN REGISTRO")||"SIN REGISTRO")}</b></div>
    <div><span>Responsable</span><b>${boEsc(x.cuadrillaResponsable||"PENDIENTE")}</b></div>
  </div>`;
}
function boTarjetaVg(i,historial){
  const x=BO_INCIDENCIAS[i];
  return `<div class="bo-inc-card ${historial?"hist":""}">
    ${historial?`<button class="bo-edit-dot" title="Editar asignación" onclick="boAbrirEditorVtrGar(${i})">Editar</button>`:""}
    <div class="bo-inc-head"><span class="bo-inc-type">${boEsc(x.tipo)} · ${boEsc(x.sedeEjecutora||"SIN SEDE")}</span><span class="bo-inc-statuses">${boOrigenVg(x)}${boEstadoBonoVg(x)}${boEstadoVg(x.estadoCalificacion)}</span></div>
    ${boDetalleVg(x)}
    ${x.observacion?`<div class="bo-match"><b>Observación:</b> ${boEsc(x.observacion)}</div>`:""}
    ${!historial?`<div class="bo-inc-actions"><button class="bo-mini-btn" onclick="boCalificarVtrGar(${i},'CORRESPONDE')">Sí corresponde</button><button class="bo-mini-btn alt" onclick="boAbrirEditorVtrGar(${i})">Asignar a otra cuadrilla</button><button class="bo-mini-btn danger" onclick="boCalificarVtrGar(${i},'ANULAR')">Anular</button></div>`:""}
  </div>`;
}
function boAgruparIndicesVg(indices,historial){
  const grupos={};
  indices.forEach(i=>{const x=BO_INCIDENCIAS[i];const sede=(historial?(x.sedeResponsable||x.sedeEjecutora):x.sedeEjecutora)||"SIN SEDE";(grupos[sede]||(grupos[sede]=[])).push(i);});
  return Object.keys(grupos).sort().map(sede=>`<details class="bo-sede" open><summary>${boEsc(sede)} · ${grupos[sede].length} registro(s)</summary><div class="bo-sede-cuerpo">${grupos[sede].map(i=>boTarjetaVg(i,historial)).join("")}</div></details>`).join("")||`<div class="bo-msg">No hay registros.</div>`;
}
function boRenderGestionVtrGar(){
  const pendiente=[],historial=[];
  BO_INCIDENCIAS.forEach((x,i)=>{
    const origen=boNorm(x.origenOrden||x.validacionBono&&x.validacionBono.origenOrden||"SIN REGISTRO")||"SIN REGISTRO";
    if(BO_FILTRO_ORIGEN_VG&&origen!==BO_FILTRO_ORIGEN_VG)return;
    boNorm(x.estadoCalificacion)==="PENDIENTE"?pendiente.push(i):historial.push(i);
  });
  historial.sort((a,b)=>(BO_INCIDENCIAS[b].fechaISO||"").localeCompare(BO_INCIDENCIAS[a].fechaISO||""));
  const r=BO_PREVISTA||{};
  document.getElementById("boAsigContenido").innerHTML=`
    <div class="bo-vg-kpis"><div class="bo-vg-kpi"><b>${r.pendientes||0}</b><span>Pendientes</span></div><div class="bo-vg-kpi"><b>${r.confirmados||0}</b><span>Confirmados</span></div><div class="bo-vg-kpi"><b>${r.reasignados||0}</b><span>Reasignados</span></div><div class="bo-vg-kpi"><b>${r.anulados||0}</b><span>Anulados</span></div></div>
    <div class="bo-bono-legend"><span><i class="bo-bono-dot verde"></i>Bono validado</span><span><i class="bo-bono-dot amarillo"></i>Validada sin bono</span><span><i class="bo-bono-dot naranja"></i>Sin registro</span><span><i class="bo-bono-dot plomo"></i>Registrada pendiente</span></div>
    <div class="bo-vg-filter"><label>Origen de la orden<select class="bo-select" onchange="BO_FILTRO_ORIGEN_VG=this.value;boRenderGestionVtrGar()"><option value="" ${!BO_FILTRO_ORIGEN_VG?"selected":""}>Propias y asignadas</option><option value="PROPIA" ${BO_FILTRO_ORIGEN_VG==="PROPIA"?"selected":""}>PROPIAS</option><option value="ASIGNADA" ${BO_FILTRO_ORIGEN_VG==="ASIGNADA"?"selected":""}>ASIGNADAS</option><option value="SIN REGISTRO" ${BO_FILTRO_ORIGEN_VG==="SIN REGISTRO"?"selected":""}>SIN REGISTRO</option></select></label></div>
    <div id="boEditorVtrGar"></div>
    <h3>🔴 Pendientes de calificar (${pendiente.length})</h3>${boAgruparIndicesVg(pendiente,false)}
    <h3 style="margin-top:20px">📚 Historial calificado (${historial.length})</h3><p class="bo-note">El punto rojo permite editar, reasignar, reactivar o anular nuevamente.</p>${boAgruparIndicesVg(historial,true)}`;
}

function boAbrirEditorVtrGar(i){
  const x=BO_INCIDENCIAS[i];if(!x)return;
  const decision=boNorm(x.estadoCalificacion)==="ANULADO"?"CORRESPONDE":(x.cuadrillaResponsable&&boNorm(x.cuadrillaResponsable)!==boNorm(x.cuadrillaEjecutora)?"REASIGNAR":"CORRESPONDE");
  const div=document.getElementById("boEditorVtrGar");
  div.innerHTML=`<div class="bo-editor"><h3 style="margin-top:0">✏️ Editar VTR/GAR</h3>${boDetalleVg(x)}<div class="bo-form" style="margin-top:12px">
    <label>Decisión<select id="boVgDecision" class="bo-select" onchange="boCambiarDecisionVg()"><option value="CORRESPONDE" ${decision==="CORRESPONDE"?"selected":""}>Sí corresponde a la cuadrilla que atendió</option><option value="REASIGNAR" ${decision==="REASIGNAR"?"selected":""}>No corresponde / asignar otra cuadrilla</option><option value="ANULAR">Anular registro</option></select></label>
    <label id="boVgResponsableLabel">Cuadrilla responsable<select id="boVgResponsable" class="bo-select">${boOpcionesCuadrilla(x.cuadrillaResponsable||"")}</select></label>
    <label class="bo-wide">Observación<textarea id="boVgObs" class="bo-text" rows="3">${boEsc(x.observacion||"")}</textarea></label>
  </div><div class="bo-actions"><button class="bo-btn" onclick="boGuardarCalificacionVg(${i})">Guardar y recalcular</button><button class="bo-btn alt" onclick="document.getElementById('boEditorVtrGar').innerHTML=''">Cancelar</button></div></div>`;
  boCambiarDecisionVg();div.scrollIntoView({behavior:"smooth",block:"start"});
}
function boCambiarDecisionVg(){const d=document.getElementById("boVgDecision");const l=document.getElementById("boVgResponsableLabel");if(l)l.style.display=d&&d.value==="REASIGNAR"?"flex":"none";}
async function boCalificarVtrGar(i,decision){
  const x=BO_INCIDENCIAS[i];if(!x)return;
  if(decision==="ANULAR"&&!confirm("¿Anular esta incidencia? Dejará de contabilizarse, pero permanecerá en el historial."))return;
  if(decision==="CORRESPONDE"&&!confirm(`¿Confirmar que ${x.cuadrillaEjecutora} es responsable de esta ${x.tipo}?`))return;
  try{await boApi({accion:"calificarIncidenciaVtrGar",usuario:boUsuario(),clave:x.clave,decision,observacion:""});mostrarAsignacionesVtrGar();}catch(e){alert(e.message);}
}
async function boGuardarCalificacionVg(i){
  const x=BO_INCIDENCIAS[i];if(!x)return;
  const decision=document.getElementById("boVgDecision").value;
  const responsable=document.getElementById("boVgResponsable").value;
  if(decision==="REASIGNAR"&&!responsable){alert("Seleccione la cuadrilla responsable.");return;}
  try{
    await boApi({accion:"calificarIncidenciaVtrGar",usuario:boUsuario(),clave:x.clave,decision,cuadrillaResponsable:responsable,observacion:document.getElementById("boVgObs").value});
    alert("Calificación guardada. VTR/GAR y Ranking fueron recalculados.");mostrarAsignacionesVtrGar();
  }catch(e){alert(e.message);}
}

async function mostrarCatalogoPartidasOperativas(){
  mostrarPantalla(boCss()+`<div class="bo-wrap"><div class="bo-head"><h2>📚 Catálogo de partidas</h2><p>La producción se clasifica directamente con CATALOGO_ORDENES; las visualizaciones no cambian.</p></div><div id="boCat" class="bo-card"><div class="bo-msg">Cargando catálogo...</div></div><div class="bo-actions"><button class="bo-btn alt" onclick="mostrarAdministracion()">⬅️ Volver</button></div></div>`);
  try{
    const r=await boApi({accion:"listarCatalogoPartidasOperativas",usuario:boUsuario()});
    document.getElementById("boCat").innerHTML=`<div class="bo-table-wrap"><table class="bo-table"><thead><tr><th>Código</th><th>Tipo de orden / partida</th><th>Plataforma</th><th>Puntaje</th><th>Grupo</th><th>Estado</th></tr></thead><tbody>${(r.catalogo||[]).map(x=>`<tr><td><b>${boEsc(x.codigo)}</b></td><td>${boEsc(x.tipoOrden)}</td><td>${boEsc(x.plataforma)}</td><td>${boEsc(x.puntaje)}</td><td>${boEsc(x.grupo)}</td><td>${boEsc(x.estado)}</td></tr>`).join("")}</tbody></table></div><div class="bo-msg">Para agregar o corregir una partida, mantenga la misma estructura de la hoja CATALOGO_ORDENES. La siguiente carga utilizará el catálogo actualizado.</div>`;
  }catch(e){document.getElementById("boCat").innerHTML=`<div class="bo-msg bo-error">${boEsc(e.message)}</div>`;}
}
