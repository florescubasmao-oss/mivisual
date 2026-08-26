/* MI VISUAL V487.9 - Vista paralela de Produccion WIN. No realiza escrituras. */
(function(){
  "use strict";
  if(window.MV487_PRODUCCION_WIN_PARALELA) return;
  window.MV487_PRODUCCION_WIN_PARALELA = true;
  let MV487_ULTIMO = null;
  let MV487_GATE_PROMESA = null;

  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
  function n(v){return Number(v||0);}
  function puntos(v){return n(v).toLocaleString("es-PE",{minimumFractionDigits:1,maximumFractionDigits:1});}
  function api(payload){
    if(typeof window.boApi==="function")return window.boApi(payload);
    const url=window.MI_VISUAL_API_URL;
    return fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)}).then(function(r){return r.json();}).then(function(j){if(!j.ok)throw new Error(j.error||"No se pudo consultar");return j;});
  }
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}

  function cargarScript(src,validar,mensaje){
    return new Promise(function(resolve,reject){
      if(validar())return resolve();
      const s=document.createElement("script");s.src=src;s.async=true;
      s.onload=function(){validar()?resolve():reject(new Error(mensaje));};
      s.onerror=function(){reject(new Error(mensaje));};document.head.appendChild(s);
    });
  }
  function cargarReglasVtrGar(){
    if(typeof window.mv4872AplicarReglaVtrGar==="function"&&typeof window.mv4873AplicarOrigenVtrGar==="function")return Promise.resolve();
    if(MV487_GATE_PROMESA)return MV487_GATE_PROMESA;
    MV487_GATE_PROMESA=cargarScript("./js/produccion_vtr_gar_gate_v4872.js?v=V4879-CERO-PRODUCCION",function(){return typeof window.mv4872AplicarReglaVtrGar==="function";},"No se pudo activar la regla VTR/GAR V487.9.")
      .then(function(){return cargarScript("./js/produccion_vtr_gar_origen_v4873.js?v=V4879-ORIGEN-CONTROL",function(){return typeof window.mv4873AplicarOrigenVtrGar==="function";},"No se pudo activar la clasificación PROPIA/ASIGNADA V487.9.");})
      .catch(function(e){MV487_GATE_PROMESA=null;throw e;});
    return MV487_GATE_PROMESA;
  }

  function css(){return `<style>
    .pw487{max-width:1240px;margin:auto;padding:18px;color:#e2e8f0}.pw487 h2{margin:0 0 5px}.pw487 p{margin:4px 0;color:#cbd5e1}
    .pw487-card{background:#172033;border:1px solid #475569;border-radius:16px;padding:15px;margin:12px 0}.pw487-alert{background:#064e3b;border:1px solid #10b981;border-radius:12px;padding:11px;color:#d1fae5;line-height:1.5}.pw487-rule{background:#1e3a8a;border:1px solid #60a5fa;border-radius:12px;padding:10px 11px;color:#dbeafe;margin-top:9px;font-size:12px;line-height:1.5}
    .pw487-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px}.pw487-kpi{background:#0f172a;border-radius:11px;padding:11px;border:1px solid #334155}.pw487-kpi b{display:block;font-size:20px}.pw487-kpi span{font-size:10px;color:#cbd5e1}
    .pw487-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.pw487-btn{border:0;border-radius:10px;padding:10px 14px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer}.pw487-btn.alt{background:#475569}.pw487-btn:disabled{opacity:.55}.pw487-select{padding:10px;border-radius:9px;background:#fff;color:#111827;border:1px solid #94a3b8}
    .pw487-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.pw487-tab{border:0;border-radius:999px;padding:8px 11px;background:#334155;color:#fff;font-weight:800;cursor:pointer}.pw487-tab.act{background:#0ea5e9}.pw487-wrap{overflow:auto;max-height:590px;border-radius:11px}
    .pw487-table{width:100%;border-collapse:collapse;background:#fff;color:#111827;font-size:11px}.pw487-table th{position:sticky;top:0;background:#1e3a5f;color:#fff;padding:8px;text-align:left;white-space:nowrap}.pw487-table td{padding:7px;border-bottom:1px solid #e2e8f0;white-space:nowrap}.pw487-table tr:nth-child(even){background:#f8fafc}.pw487-duda{background:#fef3c7!important}.pw487-no-considerada{background:#fee2e2!important}.pw487-diff{color:#b91c1c;font-weight:900}.pw487-ok{color:#166534;font-weight:900}.pw487-no{color:#991b1b;font-weight:900}.pw487-propia{color:#166534;font-weight:900}.pw487-asignada{color:#1d4ed8;font-weight:900}.pw487-manual{color:#92400e;font-weight:900}
    @media(max-width:850px){.pw487-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  </style>`;}
  function kpi(label,value){return `<div class="pw487-kpi"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;}

  function renderDetalle(filtro){
    const r=MV487_ULTIMO;if(!r)return;
    document.querySelectorAll(".pw487-tab").forEach(function(b){b.classList.toggle("act",b.dataset.filtro===filtro);});
    if(filtro==="COMPARACION"){
      const comparacion=r.comparacionDiaria||[];
      document.getElementById("pw487Detalle").innerHTML=`<div style="margin:7px 0;font-size:12px"><b>${comparacion.length}</b> combinaciones sede · cuadrilla · día. <b>Toda VTR/GAR aporta 0 puntos de Producción</b>; su reporte y origen solo afectan el control VTR/GAR.</div><div class="pw487-wrap"><table class="pw487-table"><thead><tr><th>Sede</th><th>Cuadrilla</th><th>Fecha</th><th>Puntos actuales</th><th>Puntos nuevos</th><th>Diferencia</th></tr></thead><tbody>${comparacion.map(function(x){return `<tr><td>${esc(x.sede)}</td><td>${esc(x.cuadrilla)}</td><td>${esc(x.fecha)}</td><td>${puntos(x.puntosActuales)}</td><td>${puntos(x.puntosNuevos)}</td><td class="${n(x.diferencia)!==0?"pw487-diff":""}">${puntos(x.diferencia)}</td></tr>`;}).join("")}</tbody></table></div>`;
      return;
    }
    const filas=(r.detalle||[]).filter(function(x){
      if(filtro==="AUTOMATICA")return x.clasificacion==="AUTOMATICA";
      if(filtro==="PARTNER")return x.clasificacion==="USANDO PARTNER";
      if(filtro==="DUDOSA")return x.clasificacion==="DUDOSA";
      if(filtro==="CUADRILLA")return x.cuadrillaDiferente;
      if(filtro==="INTERVENCION")return x.requiereIntervencion;
      if(filtro==="SIN_REPORTE")return x.esVtrGar&&!x.reporteDetectadoVtrGar;
      if(filtro==="REVISAR_CORRESPONDENCIA")return x.esVtrGar&&x.reporteDetectadoVtrGar&&!x.reporteSeguroVtrGar;
      if(filtro==="NO_CONSIDERADA")return x.esVtrGar&&!x.habilitadaVtrGar;
      if(filtro==="PROPIA")return x.esVtrGar&&x.origenVtrGar==="PROPIA";
      if(filtro==="ASIGNADA")return x.esVtrGar&&x.origenVtrGar==="ASIGNADA";
      if(filtro==="ORIGEN_MANUAL")return x.esVtrGar&&x.origenVtrGar==="MANUAL";
      return true;
    });
    document.getElementById("pw487Detalle").innerHTML=`<div style="margin:7px 0;font-size:12px"><b>${filas.length}</b> orden(es). <b>VTR/GAR nunca desaparece:</b> permanece visible con origen PROPIA, ASIGNADA o MANUAL, estado de reporte y <b>0 pts Producción</b>.</div><div class="pw487-wrap"><table class="pw487-table"><thead><tr><th>Sede</th><th>Cuadrilla WIN</th><th>Fecha</th><th>OrdenId</th><th>Código pedido</th><th>DNI</th><th>TipoTraba</th><th>Motivo finalización</th><th>VTR/GAR</th><th>Origen</th><th>Cuadrilla origen / indicador</th><th>Reporte / validación</th><th>Estado Producción</th><th>Clasificación</th><th>Regla</th><th>Tipo de Partida</th><th>Puntos Producción</th><th>Partida Partner</th><th>Cuadrilla Partner</th><th>Observación</th></tr></thead><tbody>${filas.map(function(x){
      const noConsiderada=x.esVtrGar&&!x.habilitadaVtrGar;
      const clase=noConsiderada?"pw487-no-considerada":(x.requiereIntervencion?"pw487-duda":"");
      const vtr=x.esVtrGar?x.tipoVtrGar:"-";
      const origen=x.esVtrGar?(x.origenVtrGar||"MANUAL"):"-";
      const origenClase=origen==="PROPIA"?"pw487-propia":(origen==="ASIGNADA"?"pw487-asignada":(origen==="MANUAL"?"pw487-manual":""));
      let reporte="-";
      if(x.esVtrGar){
        if(!x.reporteDetectadoVtrGar)reporte="SIN REPORTE";
        else if(!x.reporteSeguroVtrGar)reporte=`REVISAR CORRESPONDENCIA${x.ticketReporteVtrGar?" · "+x.ticketReporteVtrGar:""}`;
        else reporte=`${x.resultadoReporteVtrGar||"PENDIENTE"}${x.ticketReporteVtrGar?" · "+x.ticketReporteVtrGar:""}`;
      }
      const estado=x.esVtrGar?`0 PTS PRODUCCIÓN · ${x.detalleConsideracion||x.estadoConsideracion||"CONTROL VTR/GAR"}`:"CONSIDERADA · REGLA NORMAL";
      const reporteAlerta=x.esVtrGar&&(!x.reporteDetectadoVtrGar||!x.reporteSeguroVtrGar);
      return `<tr class="${clase}"><td>${esc(x.sede)}</td><td>${esc(x.cuadrillaWin)}</td><td>${esc(x.fecha)}</td><td><b>${esc(x.ordenId)}</b></td><td>${esc(x.codigoPedido)}</td><td>${esc(x.dni)}</td><td>${esc(x.tipoTrabajoWin)}</td><td>${esc(x.motivoFinalizacionWin)}</td><td>${esc(vtr)}</td><td class="${origenClase}">${esc(origen)}</td><td>${esc(x.cuadrillaOrigenVtrGar||"PENDIENTE MANUAL")}</td><td class="${reporteAlerta?"pw487-no":""}">${esc(reporte)}</td><td class="${x.esVtrGar?"pw487-no":"pw487-ok"}">${esc(estado)}</td><td>${esc(x.clasificacion)}</td><td>${esc(x.regla)}</td><td>${esc(x.tipoPartida||"PENDIENTE")}</td><td>${puntos(x.puntos)}</td><td>${esc(x.tipoPartidaPartner||"-")}</td><td>${esc(x.cuadrillaPartner||"-")}</td><td>${esc(x.motivoConsideracion||x.motivoOrigenVtrGar||x.motivoIntervencion||"NO")}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function render(r){
    MV487_ULTIMO=r;const x=r.resumen||{};
    x.intervencion=(r.detalle||[]).filter(function(d){return d.requiereIntervencion;}).length;
    const selector=document.getElementById("pw487Periodo");
    selector.innerHTML=(r.periodosDisponibles||[]).map(function(p){return `<option value="${esc(p)}" ${p===r.periodo?"selected":""}>${esc(p)}</option>`;}).join("");
    document.getElementById("pw487Estado").innerHTML=`<div class="pw487-alert"><b>V487.9 · implementación controlada</b><br>Calculado ${esc(r.calculadoAl)}. Esta pantalla todavía no escribe las hojas oficiales.</div><div class="pw487-rule"><b>Regla VTR/GAR definitiva:</b> toda VTR/GAR FINALIZADA permanece visible pero aporta <b>0 puntos de Producción</b>. No entra a meta diaria, meta mensual ni Ranking-Producción, para cuadrilla ni supervisor. PROPIA / ASIGNADA / MANUAL y BONO / NO BONO se usan exclusivamente para el control e indicador VTR/GAR, atribuido a la cuadrilla de origen.</div>`;
    document.getElementById("pw487Kpis").innerHTML=[
      kpi("FINALIZADAS WIN",x.ordenesFinalizadas),kpi("AUTOMÁTICAS",x.automaticas),kpi("USANDO PARTNER",x.usandoPartner),
      kpi("DUDOSAS",x.dudosas),kpi("INTERVENCIÓN",x.intervencion),kpi("CUADRILLA DIFERENTE",x.cuadrillaDiferente),
      kpi("VTR/GAR WIN",x.vtrGarDetectadas||0),kpi("PROPIAS",x.vtrGarPropias||0),kpi("ASIGNADAS",x.vtrGarAsignadas||0),kpi("ORIGEN MANUAL",x.vtrGarOrigenManual||0),
      kpi("VTR/GAR SIN REPORTE",x.vtrGarSinReporte||0),kpi("REVISAR CORRESP.",x.vtrGarRevisarCorrespondencia||0),kpi("VALIDADAS CONTROL",x.vtrGarHabilitadas||x.vtrGarValidadasControl||0),
      kpi("PUNTOS ACTUALES",puntos(x.puntosActuales)),kpi("PUNTOS NUEVOS",puntos(x.puntosNuevos)),kpi("DIFERENCIA PUNTOS",puntos(x.diferenciaPuntos)),
      kpi("ÓRDENES ACTUALES",x.ordenesActuales),kpi("DIFERENCIA ÓRDENES",x.diferenciaOrdenes),kpi("REGLAS EXACTAS",(r.reglas||{}).exactas||0)
    ].join("");
    document.getElementById("pw487Meta").textContent=`Entrenamiento: ${r.periodoEntrenamiento} · ${(r.reglas||{}).filasEntrenamiento||0} coincidencias válidas · Catálogo vigente sin cambios · Reglas VTR/GAR V487.9 aplicadas en lectura.`;
    renderDetalle("TODAS");
  }

  async function consultar(){
    const btn=document.getElementById("pw487Consultar"),estado=document.getElementById("pw487Estado"),periodo=document.getElementById("pw487Periodo").value;
    try{
      btn.disabled=true;estado.innerHTML="Calculando Producción WIN, VTR/GAR y origen PROPIA/ASIGNADA...";
      const base=await api({accion:"previsualizarProduccionWinParalelaV487",usuario:usuario(),periodo:periodo});
      await cargarReglasVtrGar();
      let ajustado=await window.mv4872AplicarReglaVtrGar(base,base.periodo);
      ajustado=await window.mv4873AplicarOrigenVtrGar(ajustado,base.periodo);
      render(ajustado);
    }catch(e){estado.innerHTML=`<div style="background:#7f1d1d;padding:11px;border-radius:10px"><b>No se mostró una simulación incompleta.</b><br>${esc(e.message)}</div>`;}
    finally{btn.disabled=false;}
  }

  window.mostrarProduccionWinParalelaV487=function(){
    const baseCss=typeof window.boCss==="function"?window.boCss():"";
    mostrarPantalla(baseCss+css()+`<div class="pw487"><h2>🧪 Indicadores WIN · Producción V487.9</h2><p>WIN define el estado operativo. Partner queda como apoyo opcional de clasificación. VTR/GAR siempre aporta 0 Producción; Validación Técnica controla reporte, origen y atribución del indicador VTR/GAR. Esta pantalla todavía no guarda cambios oficiales.</p><div class="pw487-card"><div class="pw487-actions"><label><b>Período</b><br><select id="pw487Periodo" class="pw487-select"><option value="">Último disponible</option></select></label><button id="pw487Consultar" class="pw487-btn" onclick="mv487Consultar()">Calcular simulación</button><button class="pw487-btn alt" onclick="mostrarAdministracion()">⬅️ Volver</button></div><div id="pw487Estado" style="margin-top:12px">Listo para consultar MAPA_ORDENES, Validación Técnica y comparar con la Producción actual.</div></div><div id="pw487Kpis" class="pw487-grid"></div><div id="pw487Meta" style="font-size:11px;color:#cbd5e1;margin:10px 0"></div><div class="pw487-tabs">${[["TODAS","Todas"],["PROPIA","Propias"],["ASIGNADA","Asignadas"],["ORIGEN_MANUAL","Origen manual"],["SIN_REPORTE","VTR/GAR sin reporte"],["REVISAR_CORRESPONDENCIA","Revisar correspondencia"],["NO_CONSIDERADA","Pendientes/revisión"],["AUTOMATICA","Automáticas"],["PARTNER","Usando Partner"],["DUDOSA","Dudosas"],["CUADRILLA","Cuadrilla diferente"],["INTERVENCION","Intervención"],["COMPARACION","Diferencia diaria"]].map(function(t){return `<button class="pw487-tab ${t[0]==="TODAS"?"act":""}" data-filtro="${t[0]}" onclick="mv487Filtrar('${t[0]}')">${t[1]}</button>`;}).join("")}</div><div id="pw487Detalle" class="pw487-card">Ejecute la simulación para ver el detalle por sede, cuadrilla, día y orden.</div></div>`);
  };
  window.mv487Consultar=consultar;
  window.mv487Filtrar=renderDetalle;
})();
