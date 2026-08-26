/* MI VISUAL V487.25 - PREVIEW FUNCIONAL AISLADO / SOLO LECTURA */
function ABRIR_PRUEBA_V48725_SUBMODULO() {
  var win = V48725_DIAG_leerWin_();
  var pendientes = V48725_DIAG_leerPendientes_();
  var indiceTickets = V48725_DIAG_V2_indiceTicketsWin_(win);

  var mapaGestion = {};
  try {
    var g = (typeof mv477LeerGestionSoloLectura_ === "function") ? mv477LeerGestionSoloLectura_() : null;
    var l = g && Array.isArray(g.lista) ? g.lista : [];
    if (typeof mv477AgregarEstadoBonoSoloLectura_ === "function") {
      l = mv477AgregarEstadoBonoSoloLectura_(l);
    }
    l.forEach(function(x){
      var k = String(x.clave || "").trim();
      if (k) mapaGestion[k] = x;
    });
  } catch (e) {}

  var datos = pendientes.map(function(x){
    var tipo = V48725_DIAG_V2_resolverTipo_(x, indiceTickets);
    var corregido = Object.assign({}, x, { tipo: tipo.tipoUsado });
    var det = V48725_DIAG_detectar_(corregido, win);
    var extra = mapaGestion[String(x.clave || "").trim()] || {};
    var vb = extra.validacionBono || null;
    var estadoBono = String(extra.estadoBono || (vb ? "PENDIENTE" : "SIN_REGISTRO")).trim();

    return {
      clave: String(x.clave || ""),
      ticket: String(x.ticket || ""),
      tipoHistorico: tipo.tipoHistorico || "",
      tipoWin: tipo.tipoWin || "",
      tipo: tipo.tipoUsado || "",
      discrepanciaTipo: !!tipo.discrepancia,
      dni: String(x.numeroDocumento || ""),
      cliente: String(x.cliente || ""),
      codigo: String(x.codigoPedido || ""),
      ejecutora: String(x.cuadrillaEjecutora || ""),
      sede: String(x.sedeEjecutora || ""),
      propuesta: String(det.propuesta || "REVISION MANUAL"),
      cuadrillaOrigen: String(det.cuadrillaOrigen || ""),
      ordenOrigen: String(det.ordenIdOrigen || ""),
      fechaOrigen: String(det.fechaHoraOrigen || ""),
      tipoTrabajoOrigen: String(det.tipoTrabajoOrigen || ""),
      dias: det.diasTranscurridos == null ? "" : String(det.diasTranscurridos),
      motivo: String(det.motivo || ""),
      registradoVT: !!vb,
      estadoBono: estadoBono,
      validacionId: vb ? String(vb.id || "") : "",
      resultadoBono: vb ? String(vb.resultado || vb.estado || "") : ""
    };
  });

  var payload = JSON.stringify({
    version: "V487.25-PREVIEW-SOLO-LECTURA",
    total: datos.length,
    win: win.ordenesUnicas,
    datos: datos
  }).replace(/</g, "\\u003c");

  var html = `<!doctype html>
<html><head><base target="_top"><meta charset="utf-8">
<style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}.wrap{padding:14px}.head{background:linear-gradient(135deg,#1e3a8a,#0f766e);color:white;padding:16px;border-radius:16px}.head h2{margin:0 0 6px;font-size:21px}.head p{margin:0;font-size:12px;line-height:1.45}.safe{margin:10px 0;padding:10px;background:#dcfce7;border:1px solid #86efac;color:#166534;border-radius:12px;font-size:12px;font-weight:700}.tools{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin:10px 0}.tools input,.tools select{padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:white}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:10px 0}.k{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:9px;text-align:center}.k b{font-size:20px;display:block}.k span{font-size:9px;color:#64748b;font-weight:bold}.list{display:grid;gap:10px}.card{background:white;border:1px solid #dbe3ee;border-radius:14px;padding:12px}.top{display:flex;justify-content:space-between;gap:8px}.title{font-weight:900}.sub{font-size:11px;color:#64748b;margin-top:3px}.badges{display:flex;gap:5px;flex-wrap:wrap}.b{padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;background:#e2e8f0}.b.ok{background:#dcfce7;color:#166534}.b.warn{background:#fef3c7;color:#92400e}.b.bad{background:#fee2e2;color:#991b1b}.b.info{background:#dbeafe;color:#1d4ed8}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px 12px;margin-top:10px;font-size:11px}.grid span{color:#64748b}.grid b{display:block;margin-top:2px}.box{margin-top:10px;padding:10px;border-radius:11px;background:#f0fdf4;border:1px solid #bbf7d0}.box.manual{background:#fff7ed;border-color:#fed7aa}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.btn{border:0;border-radius:9px;padding:8px 10px;color:white;background:#2563eb;font-size:11px;font-weight:900;cursor:pointer}.btn.ok{background:#15803d}.btn.warn{background:#b45309}.btn.bad{background:#b91c1c}.btn.money{background:#0f766e}.btn:disabled{opacity:.4;cursor:not-allowed}.sim{margin-top:8px;padding:8px;border-radius:9px;background:#eff6ff;color:#1e40af;font-size:11px}.disc{color:#b91c1c;font-weight:900}.empty{padding:20px;text-align:center;color:#64748b}.foot{margin:14px 0 4px;font-size:10px;color:#64748b;text-align:center}@media(max-width:760px){.tools{grid-template-columns:1fr 1fr}.kpis{grid-template-columns:repeat(3,1fr)}.grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.tools,.grid{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}.actions .btn{width:100%}}
</style></head><body><div class="wrap">
<div class="head"><h2>📡 Gestión VTR / GAR — PRUEBA</h2><p>Fuente principal: WIN. Esta ventana simula el submódulo de Validación Técnica. Ningún botón escribe datos ni recalcula indicadores.</p></div>
<div class="safe">🔒 MODO SEGURO: SOLO LECTURA + SIMULACIÓN LOCAL. Recableados, Producción, Efectividad, Ranking y VTR/GAR oficial permanecen intactos.</div>
<div class="tools"><input id="q" placeholder="Buscar ticket, DNI, código o cuadrilla" oninput="render()"><select id="tipo" onchange="render()"><option value="">VTR y GAR</option><option>VTR</option><option>GAR</option></select><select id="prop" onchange="render()"><option value="">Todas las propuestas</option><option>PROPIA</option><option>ASIGNADA</option><option>REVISION MANUAL</option></select><select id="bono" onchange="render()"><option value="">Todos Bono/VT</option><option value="REGISTRADO">Registrado VT</option><option value="SIN_REGISTRO">Sin registro VT</option><option value="PENDIENTE">Bono pendiente</option></select></div>
<div id="kpis" class="kpis"></div><div id="lista" class="list"></div><div class="foot">MI VISUAL V487.25 · Preview funcional aislado</div></div>
<script>
var DATA=${payload};
var SIM={};
function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});}
function norm(v){return String(v==null?'':v).toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();}
function filtered(){var q=norm(document.getElementById('q').value),t=document.getElementById('tipo').value,p=document.getElementById('prop').value,b=document.getElementById('bono').value;return DATA.datos.filter(function(x){if(t&&x.tipo!==t)return false;if(p&&x.propuesta!==p)return false;if(b==='REGISTRADO'&&!x.registradoVT)return false;if(b==='SIN_REGISTRO'&&x.registradoVT)return false;if(b==='PENDIENTE'&&norm(x.estadoBono)!=='PENDIENTE')return false;if(q&&norm([x.ticket,x.dni,x.codigo,x.ejecutora,x.cuadrillaOrigen,x.cliente].join(' ')).indexOf(q)<0)return false;return true;});}
function badgeBono(x){var e=norm(x.estadoBono);if(e==='VALIDADA_BONO'||e==='BONO')return '<span class="b ok">BONO</span>';if(e==='VALIDADA_NO_BONO'||e==='NO BONO'||e==='NO_BONO')return '<span class="b info">NO BONO</span>';if(e==='PENDIENTE')return '<span class="b warn">BONO PENDIENTE</span>';return '<span class="b bad">SIN REGISTRO VT</span>';}
function sim(k,a){var x=DATA.datos.filter(function(z){return z.clave===k;})[0];if(!x)return;var extra='';if(a==='REASIGNAR'){extra=prompt('Cuadrilla responsable simulada:','')||'';if(!extra)return;}SIM[k]={a:a,extra:extra};render();}
function simBono(k,a){SIM[k+'_BONO']={a:a};render();}
function render(){var L=filtered(),propia=0,asig=0,man=0,disc=0,sin=0;L.forEach(function(x){if(x.propuesta==='PROPIA')propia++;else if(x.propuesta==='ASIGNADA')asig++;else man++;if(x.discrepanciaTipo)disc++;if(!x.registradoVT)sin++;});document.getElementById('kpis').innerHTML='<div class="k"><b>'+L.length+'</b><span>CASOS VISIBLES</span></div><div class="k"><b>'+propia+'</b><span>PROPIA</span></div><div class="k"><b>'+asig+'</b><span>ASIGNADA</span></div><div class="k"><b>'+man+'</b><span>REVISIÓN MANUAL</span></div><div class="k"><b>'+sin+'</b><span>SIN REGISTRO VT</span></div><div class="k"><b>'+disc+'</b><span>DISCREPANCIA TIPO</span></div>';
if(!L.length){document.getElementById('lista').innerHTML='<div class="empty">No hay casos para los filtros.</div>';return;}document.getElementById('lista').innerHTML=L.map(function(x){var s=SIM[x.clave],sb=SIM[x.clave+'_BONO'];var d=x.propuesta==='REVISION MANUAL';return '<div class="card"><div class="top"><div><div class="title">'+esc(x.tipo)+' · '+esc(x.ticket)+'</div><div class="sub">'+esc(x.cliente)+' · '+esc(x.sede)+'</div></div><div class="badges"><span class="b '+(d?'warn':'ok')+'">'+esc(x.propuesta)+'</span>'+badgeBono(x)+(x.discrepanciaTipo?'<span class="b bad">TIPO HISTÓRICO '+esc(x.tipoHistorico)+' → WIN '+esc(x.tipoWin)+'</span>':'')+'</div></div><div class="grid"><div><span>DNI</span><b>'+esc(x.dni)+'</b></div><div><span>Código</span><b>'+esc(x.codigo)+'</b></div><div><span>Cuadrilla ejecutora</span><b>'+esc(x.ejecutora)+'</b></div><div><span>Registro Validación Técnica</span><b>'+(x.registradoVT?'SÍ':'NO')+'</b></div><div><span>Estado Bono/No Bono</span><b>'+esc(x.estadoBono)+'</b></div><div><span>ID Validación</span><b>'+esc(x.validacionId||'-')+'</b></div></div><div class="box '+(d?'manual':'')+'"><b>🔎 ANÁLISIS WIN</b><div class="grid"><div><span>Cuadrilla antecedente</span><b>'+esc(x.cuadrillaOrigen||'-')+'</b></div><div><span>Orden WIN anterior</span><b>'+esc(x.ordenOrigen||'-')+'</b></div><div><span>Días</span><b>'+esc(x.dias||'-')+'</b></div><div><span>Fecha anterior</span><b>'+esc(x.fechaOrigen||'-')+'</b></div><div><span>Trabajo anterior</span><b>'+esc(x.tipoTrabajoOrigen||'-')+'</b></div><div><span>Motivo</span><b>'+esc(x.motivo||'-')+'</b></div></div></div><div class="actions"><button class="btn ok" onclick="sim(\''+esc(x.clave)+'\',\'CONFIRMAR\')">Simular confirmar</button><button class="btn warn" onclick="sim(\''+esc(x.clave)+'\',\'REASIGNAR\')">Simular reasignar</button><button class="btn bad" onclick="sim(\''+esc(x.clave)+'\',\'ANULAR\')">Simular anular</button><button class="btn money" '+(!x.registradoVT||norm(x.estadoBono)!=='PENDIENTE'?'disabled':'')+' onclick="simBono(\''+esc(x.clave)+'\',\'BONO\')">Simular BONO</button><button class="btn bad" '+(!x.registradoVT||norm(x.estadoBono)!=='PENDIENTE'?'disabled':'')+' onclick="simBono(\''+esc(x.clave)+'\',\'NO BONO\')">Simular NO BONO</button></div>'+(s?'<div class="sim"><b>SIMULACIÓN RESPONSABILIDAD:</b> '+esc(s.a)+(s.extra?' → '+esc(s.extra):'')+' · NO GUARDADO</div>':'')+(sb?'<div class="sim"><b>SIMULACIÓN BONO:</b> '+esc(sb.a)+' · NO GUARDADO</div>':'')+'</div>';}).join('');}
render();
</script></body></html>`;

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1200).setHeight(760),
    "MI VISUAL V487.25 — PRUEBA VTR/GAR"
  );
}
