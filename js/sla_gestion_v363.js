/* ============================================================
   MI VISUAL V367 - Tiempo de Gestión SLA ordenado y ligero
   Dashboard, Mi Desempeño, excepciones y configuración Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV363_SLA_GESTION_OK) return;
  const CACHE = new Map();

  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function norm(v){return String(v||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function semaforo(p){const x=n(p);if(x<60)return{icono:"🔴",texto:"CRÍTICO",color:"#ef4444"};if(x<80)return{icono:"🟠",texto:"BAJO",color:"#f97316"};if(x<90)return{icono:"🟡",texto:"EN SEGUIMIENTO",color:"#eab308"};return{icono:"🟢",texto:"CONFORME",color:"#22c55e"};}
  function fecha(v){if(!v)return"-";try{return new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));}catch(_){return String(v);}}
  function api(){return window.MI_VISUAL_API_URL || (typeof MV58_API!=="undefined"?MV58_API:"");}

  async function get(accion,params={}){
    const url=new URL(api());url.searchParams.set("accion",accion);url.searchParams.set("usuario",localStorage.getItem("usuario")||"");
    Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v));});
    url.searchParams.set("_v363",Date.now());
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",headers:{Accept:"application/json"}});const t=(await r.text()).trim();
    if(!r.ok||!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t))throw new Error("Apps Script todavía no tiene publicada la V363.");
    const d=JSON.parse(t);if(!d.ok)throw new Error(d.error||"No se pudo consultar SLA.");return d;
  }
  async function post(accion,payload={}){
    const r=await fetch(api(),{method:"POST",body:JSON.stringify({accion,usuario:localStorage.getItem("usuario")||"",...payload})});const t=(await r.text()).trim();
    if(!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t))throw new Error("Apps Script todavía no tiene publicada la V363.");
    const d=JSON.parse(t);if(!d.ok)throw new Error(d.error||"No se pudo completar la operación.");return d;
  }
  async function consultar(periodo,modo="TODOS",forzar=false){
    const vista=norm(modo||"TODOS")||"TODOS";
    const key=(periodo||"AUTO")+"|"+vista;
    const c=CACHE.get(key);
    if(!forzar&&c&&Date.now()-c.fecha<120000)return c.data;
    const limite=vista==="TODOS"?80:160;
    const d=await get("obtenerSlaGestion",{periodo,modo:vista,limite});
    CACHE.set(key,{fecha:Date.now(),data:d});
    return d;
  }

  function limpiarCachePeriodo(periodo){
    const prefijo=(periodo||"AUTO")+"|";
    Array.from(CACHE.keys()).forEach(k=>{
      if(k===periodo||k.startsWith(prefijo))CACHE.delete(k);
    });
  }

  function resumenSlaLista(lista){
    const r={evaluables:0,cumplenBruto:0,cumplenAjustado:0,fueraAjustado:0,excepcionesPendientes:0,excepcionesAprobadas:0,instalacionesTotal:0,instalacionesCumplenBruto:0,instalacionesCumplenAjustado:0,visitasTecnicasTotal:0,visitasTecnicasCumplenBruto:0,visitasTecnicasCumplenAjustado:0,noEvaluables:0};
    (lista||[]).forEach(x=>{const d=x.detSla||{};Object.keys(r).forEach(k=>r[k]+=n(d[k]));});
    r.slaBruto=r.evaluables?r.cumplenBruto/r.evaluables*100:0;r.slaAjustado=r.evaluables?r.cumplenAjustado/r.evaluables*100:0;
    r.instalacionesBruto=r.instalacionesTotal?r.instalacionesCumplenBruto/r.instalacionesTotal*100:0;r.instalacionesAjustado=r.instalacionesTotal?r.instalacionesCumplenAjustado/r.instalacionesTotal*100:0;
    r.visitasTecnicasBruto=r.visitasTecnicasTotal?r.visitasTecnicasCumplenBruto/r.visitasTecnicasTotal*100:0;r.visitasTecnicasAjustado=r.visitasTecnicasTotal?r.visitasTecnicasCumplenAjustado/r.visitasTecnicasTotal*100:0;
    return r;
  }

  function detalleSla(d={}){const s=semaforo(d.slaAjustado);return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
    ${mv58KpiMini("SLA ajustado",`${n(d.slaAjustado).toFixed(1)}% ${s.icono}`)}${mv58KpiMini("SLA bruto",`${n(d.slaBruto).toFixed(1)}%`)}
    ${mv58KpiMini("Evaluables",n(d.evaluables))}${mv58KpiMini("Fuera del SLA",n(d.fueraAjustado))}
    ${mv58KpiMini("Instalaciones",`${n(d.instalacionesAjustado).toFixed(1)}%`)}${mv58KpiMini("Visitas técnicas",`${n(d.visitasTecnicasAjustado).toFixed(1)}%`)}
    ${mv58KpiMini("Excepciones aprobadas",n(d.excepcionesAprobadas))}${mv58KpiMini("Excepciones pendientes",n(d.excepcionesPendientes))}
    </div><button type="button" class="mv4-link-btn" style="margin-top:10px" onclick="mostrarTiempoGestionSla(MV276_DASH_PERIODO)">⏱️ Ver códigos y excepciones</button>`;}

  // Parches del Dashboard: incorporan SLA sin cambiar las funciones base.
  const baseResumen=window.mv4Resumen;
  if(typeof baseResumen==="function") window.mv4Resumen=function(lista){const r=baseResumen(lista);const s=resumenSlaLista(lista);r.sla=s.slaAjustado;r.slaBruto=s.slaBruto;r.detSla=s;r.ok=(r.ok||0)+(s.evaluables>0&&s.slaAjustado>=90?1:0);r.cumplimiento=Math.round(r.ok/6*100);return r;};
  const baseDetalleKpi=window.mv4DetalleKpi;
  if(typeof baseDetalleKpi==="function") window.mv4DetalleKpi=function(lista,tipo){if(tipo!=="sla")return baseDetalleKpi(lista,tipo);return (lista||[]).slice().sort((a,b)=>n(b.slaAjustado)-n(a.slaAjustado)).map((x,i)=>mv58CuadrillaAnalitica(x,"sla",i+1)).join("");};
  const baseCab=window.mv58CabeceraCuadrilla;
  if(typeof baseCab==="function") window.mv58CabeceraCuadrilla=function(x,tipo,puesto){if(tipo!=="sla")return baseCab(x,tipo,puesto);const s=semaforo(x.slaAjustado);return `<div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font-size:12px;color:#facc15;font-weight:900">${puesto}°</div><div style="font-size:14px;font-weight:900">${esc(x.cuadrilla)}</div><div style="font-size:18px;font-weight:900;margin-top:6px">${n(x.slaAjustado).toFixed(1)}%</div></div><div style="color:${s.color};font-weight:900">${s.icono} ${s.texto}</div></div>`;};
  const baseDet=window.mv58DetalleCuadrilla;
  if(typeof baseDet==="function") window.mv58DetalleCuadrilla=function(x,tipo){if(tipo!=="sla")return baseDet(x,tipo);return detalleSla(x.detSla||{});};
  const baseKpis=window.mv4DashboardKpis;
  if(typeof baseKpis==="function") window.mv4DashboardKpis=function(lista){const r=mv4Resumen(lista),s=semaforo(r.sla);let html=baseKpis(lista);html=html.replace(/\d+ de 5 metas cumplidas/,`${r.ok} de 6 metas cumplidas`);return html+mv4KpiCard({icono:"⏱️",titulo:"Tiempo de Gestión - SLA",valor:`${n(r.sla).toFixed(1)}%`,meta:"≥ 90% (SLA ajustado)",estado:s.icono,detalle:mv4DetalleKpi(lista,"sla")});};

  const baseResumenCuadrilla=window.mv198ResumenCuadrilla;
  if(typeof baseResumenCuadrilla==="function") window.mv198ResumenCuadrilla=function(x){let html=baseResumenCuadrilla(x);if(!x)return html;const s=semaforo(x.slaAjustado);const card=mv591MiniResumenCard("⏱️","Tiempo de Gestión - SLA",`${n(x.slaAjustado).toFixed(1)}%`,`Bruto ${n(x.slaBruto).toFixed(1)}% · ${n(x.detSla?.evaluables)} códigos`,s.icono);html=html.replace(/(<div class="mv198-resumen-grid">)/,`$1${card}`);html=html.replace(/(<div class="mv198-detalle-bloque"><h4>🏆 Ranking)/,`<div class="mv198-detalle-bloque"><h4>⏱️ Tiempo de Gestión - SLA</h4>${detalleSla(x.detSla||{})}</div>$1`);return html;};
  const baseZona=window.mv591ResumenEjecutivoZona;
  if(typeof baseZona==="function") window.mv591ResumenEjecutivoZona=function(lista){let html=baseZona(lista);const d=resumenSlaLista(lista),s=semaforo(d.slaAjustado);const card=mv591MiniResumenCard("⏱️","Tiempo de Gestión - SLA",`${d.slaAjustado.toFixed(1)}%`,`Bruto ${d.slaBruto.toFixed(1)}% · ${d.evaluables} códigos`,s.icono);return html.replace(/(<\/div>\s*<\/div>\s*$)/,`${card}$1`);};
  const baseSede=window.mv4SedeCard;
  if(typeof baseSede==="function") window.mv4SedeCard=function(sede,lista){let html=baseSede(sede,lista);const d=resumenSlaLista(lista);return html.replace(/(<span>Metas:)/,`<span>SLA: <b>${d.slaAjustado.toFixed(1)}%</b></span>$1`);};

  function selectorPeriodos(data,actual,modo){return `<select onchange="mostrarTiempoGestionSla(this.value,'${esc(modo||"TODOS")}')" style="width:100%;padding:11px;border-radius:10px">${(data.periodos||[]).map(p=>`<option value="${esc(p.clave||p)}" ${(p.clave||p)===actual?"selected":""}>${esc(p.etiqueta||p)}</option>`).join("")}</select>`;}
  function tarjeta(titulo,valor,sub,icono){return `<div style="padding:13px;border-radius:14px;background:#102844;border:1px solid rgba(255,255,255,.1)"><div style="font-size:11px;color:#9fb7d8;font-weight:900">${icono} ${esc(titulo)}</div><div style="font-size:24px;font-weight:900;margin-top:6px">${valor}</div><div style="font-size:11px;color:#9fb7d8;margin-top:4px">${esc(sub||"")}</div></div>`;}
  function claseEstadoExcepcion(estado){
    const e=norm(estado);
    if(e==="APROBADA")return{texto:"APROBADA",fondo:"#064e3b",color:"#bbf7d0"};
    if(e==="PENDIENTE")return{texto:"PENDIENTE",fondo:"#78350f",color:"#fde68a"};
    if(e==="RECHAZADA")return{texto:"RECHAZADA",fondo:"#7f1d1d",color:"#fecaca"};
    return{texto:"SIN SOLICITUD",fondo:"#243650",color:"#cbd5e1"};
  }

  function filaOrden(o,puedeSolicitar,puedeResolver,periodo){
    const fuera=o.evaluable&&!o.cumpleAjustado;
    const excepcion=claseEstadoExcepcion(o.excepcionEstado);
    const color=o.cumpleAjustado?"#22c55e":(o.evaluable?"#ef4444":"#64748b");
    const acciones=[];

    if(fuera&&puedeSolicitar&&!["PENDIENTE","APROBADA"].includes(norm(o.excepcionEstado))){
      acciones.push(`<button type="button" class="mv367-sla-action principal" onclick="mv363AbrirSolicitud('${esc(periodo)}','${esc(o.codigo)}')">📝 Solicitar excepción</button>`);
    }

    if(norm(o.excepcionEstado)==="PENDIENTE"&&puedeResolver){
      acciones.push(`<button type="button" class="mv367-sla-action aprobar" onclick="mv363Resolver('${esc(periodo)}','${esc(o.codigo)}','APROBADA')">✅ Aprobar</button>`);
      acciones.push(`<button type="button" class="mv367-sla-action rechazar" onclick="mv363Resolver('${esc(periodo)}','${esc(o.codigo)}','RECHAZADA')">❌ Rechazar</button>`);
    }

    return `<article class="mv367-sla-order" style="--mv367-color:${color}">
      <div class="mv367-sla-order-head">
        <div>
          <div class="mv367-sla-code">Código ${esc(o.codigo)}</div>
          <div class="mv367-sla-order-sub">${esc(o.tipoGeneral)} · ${esc(o.partida||o.tipoTrabajo||o.resultado)}</div>
        </div>
        <div class="mv367-sla-result">${esc(o.resultado)}</div>
      </div>

      <div class="mv367-sla-metrics">
        <div><span>Tiempo</span><b>${n(o.minutosGestion)} min</b></div>
        <div><span>Parámetro</span><b>${n(o.slaMinutos)} min</b></div>
        <div><span>Exceso</span><b>${n(o.excesoMinutos)} min</b></div>
      </div>

      <div class="mv367-sla-exception">
        <span style="background:${excepcion.fondo};color:${excepcion.color}">${excepcion.texto}</span>
      </div>

      ${acciones.length?`<div class="mv367-sla-actions">${acciones.join("")}</div>`:""}
    </article>`;
  }

  function agruparOrdenes(ordenes){
    const sedes={};

    (ordenes||[]).forEach(o=>{
      const sede=norm(o.sede)||"SIN SEDE";
      const cuadrilla=o.cuadrilla||"SIN CUADRILLA";
      if(!sedes[sede])sedes[sede]={};
      if(!sedes[sede][cuadrilla])sedes[sede][cuadrilla]=[];
      sedes[sede][cuadrilla].push(o);
    });

    return sedes;
  }

  function renderOrdenesAgrupadas(ordenes,puedeSolicitar,puedeResolver,periodo){
    if(!ordenes?.length){
      return `<div class="mv367-sla-empty">
        <div style="font-size:30px">✅</div>
        <b>No existen códigos para este filtro.</b>
      </div>`;
    }

    const grupos=agruparOrdenes(ordenes);

    return Object.keys(grupos).sort().map(sede=>{
      const cuadrillas=grupos[sede];
      const totalSede=Object.values(cuadrillas).reduce((s,x)=>s+x.length,0);

      return `<section class="mv367-sla-sede">
        <div class="mv367-sla-sede-title">🏢 ${esc(sede)} <span>${totalSede} códigos</span></div>
        ${Object.keys(cuadrillas).sort().map(cuadrilla=>{
          const lista=cuadrillas[cuadrilla];
          return `<details class="mv367-sla-cuadrilla" ${lista.length<=6?"open":""}>
            <summary>
              <span>${esc(cuadrilla)}</span>
              <b>${lista.length}</b>
            </summary>
            <div class="mv367-sla-orders">
              ${lista.map(o=>filaOrden(o,puedeSolicitar,puedeResolver,periodo)).join("")}
            </div>
          </details>`;
        }).join("")}
      </section>`;
    }).join("");
  }

  function estilosSlaV367(){
    return `<style>
      .mv367-sla-page{padding:16px;max-width:1120px;margin:auto;color:#fff}
      .mv367-sla-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
      .mv367-sla-title{margin:0;font-size:24px}
      .mv367-sla-sub{font-size:11px;color:#9fb7d8;margin-top:4px}
      .mv367-sla-period{background:#102844;border:1px solid rgba(255,255,255,.1);border-radius:15px;padding:12px;margin-bottom:10px}
      .mv367-sla-period select{width:100%;min-height:43px;border:1px solid #60a5fa;border-radius:10px;padding:0 10px;background:#fff;color:#0f172a;font-weight:900}
      .mv367-sla-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0}
      .mv367-sla-tab{border:1px solid #315577;border-radius:11px;padding:10px 6px;background:#102844;color:#dbeafe;font-size:11px;font-weight:900;cursor:pointer}
      .mv367-sla-tab.activo{background:linear-gradient(135deg,#2563eb,#7c3aed);border-color:#93c5fd;color:#fff}
      .mv367-sla-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}
      .mv367-sla-kpi{padding:12px;border-radius:14px;background:#102844;border:1px solid rgba(255,255,255,.1)}
      .mv367-sla-kpi small{display:block;color:#9fb7d8;font-weight:900;font-size:10px}
      .mv367-sla-kpi strong{display:block;font-size:23px;margin-top:5px}
      .mv367-sla-kpi span{display:block;color:#9fb7d8;font-size:10px;margin-top:4px}
      .mv367-sla-tools{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}
      .mv367-sla-tool{border:1px solid #315577;border-radius:10px;padding:9px 11px;background:#172a43;color:#dbeafe;font-size:11px;font-weight:900;cursor:pointer}
      .mv367-sla-section-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:18px 0 8px}
      .mv367-sla-section-head h3{margin:0;font-size:17px}
      .mv367-sla-count{padding:5px 8px;border-radius:999px;background:#172a43;color:#cbd5e1;font-size:10px;font-weight:900}
      .mv367-sla-sede{margin:12px 0}
      .mv367-sla-sede-title{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;background:#172a43;font-weight:950}
      .mv367-sla-sede-title span{font-size:10px;color:#9fb7d8}
      .mv367-sla-cuadrilla{margin:8px 0;border:1px solid #274566;border-radius:13px;overflow:hidden;background:#0d2037}
      .mv367-sla-cuadrilla summary{display:flex;justify-content:space-between;gap:10px;padding:11px 12px;cursor:pointer;font-size:11px;font-weight:900;background:#102844}
      .mv367-sla-cuadrilla summary b{min-width:25px;text-align:center;padding:3px 6px;border-radius:999px;background:#1d4ed8}
      .mv367-sla-orders{padding:8px}
      .mv367-sla-order{border-left:4px solid var(--mv367-color);border-radius:11px;background:#132845;padding:11px;margin:8px 0}
      .mv367-sla-order-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .mv367-sla-code{font-size:14px;font-weight:950}
      .mv367-sla-order-sub{font-size:10px;color:#9fb7d8;margin-top:3px;line-height:1.3}
      .mv367-sla-result{font-size:9px;font-weight:950;text-align:right;max-width:145px}
      .mv367-sla-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}
      .mv367-sla-metrics div{background:#0d2037;border-radius:9px;padding:7px}
      .mv367-sla-metrics span{display:block;color:#9fb7d8;font-size:9px}
      .mv367-sla-metrics b{display:block;font-size:12px;margin-top:2px}
      .mv367-sla-exception{margin-top:7px}
      .mv367-sla-exception span{display:inline-block;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:950}
      .mv367-sla-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .mv367-sla-action{border:0;border-radius:9px;padding:8px 10px;color:#fff;font-size:10px;font-weight:950;cursor:pointer}
      .mv367-sla-action.principal{background:#2563eb}.mv367-sla-action.aprobar{background:#15803d}.mv367-sla-action.rechazar{background:#b91c1c}
      .mv367-sla-empty{text-align:center;padding:25px;border:1px dashed #315577;border-radius:14px;color:#cbd5e1}
      @media(max-width:700px){
        .mv367-sla-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}
        .mv367-sla-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
        .mv367-sla-order-head{flex-direction:column}
        .mv367-sla-result{text-align:left;max-width:none}
      }
    </style>`;
  }

  async function mostrar(periodo,modo){
    const filtro=norm(modo||window.MV366_SLA_MODO||"TODOS")||"TODOS";
    window.MV366_SLA_MODO=filtro;

    const titulos={
      TODOS:"Tiempo de Gestión - SLA",
      FUERA:"Códigos fuera del SLA",
      EXCEPCIONES:"Excepciones SLA",
      PENDIENTES:"Validar excepciones SLA"
    };
    const titulo=titulos[filtro]||titulos.TODOS;

    mostrarPantalla(`
      ${estilosSlaV367()}
      <div class="mv367-sla-page">
        <div class="mv367-sla-top">
          <div>
            <h2 class="mv367-sla-title">⏱️ ${titulo}</h2>
            <div class="mv367-sla-sub">Cargando el resumen y solo los códigos necesarios...</div>
          </div>
        </div>
        <div class="mv367-sla-empty">Preparando información consolidada...</div>
      </div>
    `);

    try{
      const d=await consultar(periodo,filtro,false);
      const r=d.resumen||{};
      const s=semaforo(r.slaAjustado);
      const ordenes=Array.isArray(d.ordenes)?d.ordenes:[];
      const puedeResolver=Boolean(d.puedeResolver);

      const tabs=[
        ["TODOS","📋 Todos"],
        ["FUERA","🚨 Fuera del SLA"],
        ["EXCEPCIONES","🗂️ Excepciones"]
      ];
      if(puedeResolver)tabs.push(["PENDIENTES","✅ Pendientes"]);

      const botonVolver=typeof window.mv366VolverDesdeSla==="function"&&window.MV366_ORIGEN_SLA
        ? `<button class="button_1" onclick="mv366VolverDesdeSla()">⬅️ Volver al Dashboard</button>`
        : `<button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>`;

      const avisoTruncado=d.truncado
        ? `<div class="mv367-sla-sub">Se muestran ${ordenes.length} de ${n(d.totalOrdenes)} códigos. Use los filtros para reducir la lista.</div>`
        : `<div class="mv367-sla-sub">${n(d.totalOrdenes)} códigos en este filtro.</div>`;

      mostrarPantalla(`
        ${estilosSlaV367()}
        <div class="mv367-sla-page">
          <div class="mv367-sla-top">
            <div>
              <h2 class="mv367-sla-title">⏱️ ${titulo}</h2>
              <div class="mv367-sla-sub">Actualizado: ${esc(d.calculadoEn||"-")}</div>
            </div>
          </div>

          <div class="mv367-sla-period">
            ${selectorPeriodos(d,d.periodo,filtro)}
          </div>

          <div class="mv367-sla-tabs">
            ${tabs.map(([valor,etiqueta])=>`
              <button type="button" class="mv367-sla-tab ${valor===filtro?"activo":""}" onclick="mostrarTiempoGestionSla('${esc(d.periodo)}','${valor}')">
                ${etiqueta}
              </button>
            `).join("")}
          </div>

          <div class="mv367-sla-kpis">
            <div class="mv367-sla-kpi"><small>SLA ajustado</small><strong>${n(r.slaAjustado).toFixed(1)}% ${s.icono}</strong><span>${s.texto}</span></div>
            <div class="mv367-sla-kpi"><small>SLA bruto</small><strong>${n(r.slaBruto).toFixed(1)}%</strong><span>Sin excepciones</span></div>
            <div class="mv367-sla-kpi"><small>Instalaciones</small><strong>${n(r.instalacionesAjustado).toFixed(1)}%</strong><span>${n(r.instalacionesTotal)} códigos</span></div>
            <div class="mv367-sla-kpi"><small>Visitas técnicas</small><strong>${n(r.visitasTecnicasAjustado).toFixed(1)}%</strong><span>${n(r.visitasTecnicasTotal)} códigos</span></div>
            <div class="mv367-sla-kpi"><small>Fuera del SLA</small><strong>${n(r.fueraAjustado)}</strong><span>${n(r.excepcionesPendientes)} pendientes</span></div>
            <div class="mv367-sla-kpi"><small>Excepciones aprobadas</small><strong>${n(r.excepcionesAprobadas)}</strong><span>Incluidas en el ajustado</span></div>
          </div>

          ${d.puedeConfigurarRanking?`
            <div class="mv367-sla-tools">
              <button type="button" class="mv367-sla-tool" onclick="mv363AbrirConfigRanking('${esc(d.periodo)}')">⚙️ Pesos Ranking</button>
              <button type="button" class="mv367-sla-tool" onclick="mv363Reconstruir('${esc(d.periodo)}')">🔄 Reconstruir SLA</button>
            </div>
          `:""}

          <div class="mv367-sla-section-head">
            <h3>${titulo}</h3>
            <span class="mv367-sla-count">${n(d.totalOrdenes)} códigos</span>
          </div>
          ${avisoTruncado}

          ${renderOrdenesAgrupadas(
            ordenes,
            d.puedeSolicitar,
            d.puedeResolver,
            d.periodo
          )}

          <br>
          ${botonVolver}
        </div>
      `);
    }catch(e){
      mostrarPantalla(`
        ${estilosSlaV367()}
        <div class="mv367-sla-page">
          <h2>⏱️ ${titulo}</h2>
          <div class="mv367-sla-empty">❌ ${esc(e.message)}</div>
          <br>
          ${typeof window.mv366VolverDesdeSla==="function"&&window.MV366_ORIGEN_SLA
            ? '<button class="button_1" onclick="mv366VolverDesdeSla()">⬅️ Volver al Dashboard</button>'
            : '<button class="button_1" onclick="volverInicio()">⬅️ Volver</button>'}
        </div>
      `);
    }
  }

  function modal(html){document.getElementById('mv363Modal')?.remove();const x=document.createElement('div');x.id='mv363Modal';x.innerHTML=`<div style="width:min(650px,94vw);max-height:90vh;overflow:auto;background:#0d2037;color:#fff;border-radius:18px;padding:18px;border:1px solid #315577">${html}</div>`;Object.assign(x.style,{position:'fixed',inset:'0',zIndex:11000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(2,8,23,.78)',padding:'16px'});document.body.appendChild(x);}
  function cerrar(){document.getElementById('mv363Modal')?.remove();}
  function abrirSolicitud(periodo,codigo){modal(`<h3>Solicitar excepción SLA</h3><p>Código <b>${esc(codigo)}</b></p><label>Motivo<select id="mv363Motivo" style="width:100%;padding:10px;margin:5px 0 10px"><option>METRAJE ELEVADO</option><option>DEMORA SOPORTE WIN</option><option>CAIDA DE SISTEMA O APLICATIVO</option><option>PROBLEMA DE RED O PLATAFORMA</option><option>ACCESO RESTRINGIDO</option><option>OTRA CAUSA</option></select></label><label>Comentario<textarea id="mv363Comentario" style="width:100%;min-height:100px;padding:10px;margin-top:5px"></textarea></label><label>Evidencia / enlace<input id="mv363Evidencia" style="width:100%;padding:10px;margin-top:5px"></label><div style="display:flex;gap:8px;margin-top:12px"><button class="button_1" onclick="mv363EnviarSolicitud('${esc(periodo)}','${esc(codigo)}')">Enviar</button><button class="button_1" onclick="mv363CerrarModal()">Cancelar</button></div><div id="mv363Msg"></div>`);}
  async function enviarSolicitud(periodo,codigo){const msg=document.getElementById('mv363Msg');try{if(msg)msg.textContent='Guardando...';await post('solicitarExcepcionSla',{periodo,codigo,motivo:document.getElementById('mv363Motivo').value,comentario:document.getElementById('mv363Comentario').value,evidencia:document.getElementById('mv363Evidencia').value});limpiarCachePeriodo(periodo);if(typeof window.mv366InvalidarResumenDashboard==="function")window.mv366InvalidarResumenDashboard(periodo);cerrar();await mostrar(periodo,window.MV366_SLA_MODO||"FUERA");}catch(e){if(msg)msg.textContent='❌ '+e.message;}}
  async function resolver(periodo,codigo,resultado){const comentario=prompt(`Comentario de Jefatura para ${resultado.toLowerCase()}:`)||'';try{await post('resolverExcepcionSla',{periodo,codigo,resultado,comentarioJefatura:comentario});limpiarCachePeriodo(periodo);if(typeof window.mv366InvalidarResumenDashboard==="function")window.mv366InvalidarResumenDashboard(periodo);await mostrar(periodo,window.MV366_SLA_MODO||"PENDIENTES");}catch(e){alert(e.message);}}
  async function reconstruir(periodo){if(!confirm('¿Reconstruir el resumen SLA del período?'))return;try{await post('reconstruirSlaPeriodo',{periodo});CACHE.clear();if(typeof window.mv366InvalidarResumenDashboard==="function")window.mv366InvalidarResumenDashboard(periodo);await mostrar(periodo,window.MV366_SLA_MODO||"TODOS");}catch(e){alert(e.message);}}
  async function abrirConfig(periodo){try{const d=await get('obtenerConfiguracionRanking',{periodo});const c=d.configuracion,p=c.pesos;modal(`<h3>Pesos del Ranking - ${esc(periodo)}</h3>${['PRODUCCION','EFECTIVIDAD','SLA','OBSERVACIONES','RECABLEADO','VTRGAR'].map(k=>`<label style="display:grid;grid-template-columns:1fr 130px;gap:10px;margin-top:9px"><span>${esc(k)}</span><input id="mv363Peso_${k}" type="number" min="0" max="100" step="0.5" value="${n(p[k])}" style="padding:9px"></label>`).join('')}<div style="margin-top:12px;color:#9fb7d8">La suma debe ser 100%. Julio 2026 permanece cerrado.</div><div style="display:flex;gap:8px;margin-top:12px"><button class="button_1" onclick="mv363GuardarConfig('${esc(periodo)}')">Guardar</button><button class="button_1" onclick="mv363CerrarModal()">Cancelar</button></div><div id="mv363Msg"></div>`);}catch(e){alert(e.message);}}
  async function guardarConfig(periodo){const pesos={};['PRODUCCION','EFECTIVIDAD','SLA','OBSERVACIONES','RECABLEADO','VTRGAR'].forEach(k=>pesos[k]=n(document.getElementById('mv363Peso_'+k).value));const msg=document.getElementById('mv363Msg');try{if(msg)msg.textContent='Guardando...';await post('guardarConfiguracionRanking',{periodo,pesos,estado:periodo==='2026-07'?'CERRADO':'ACTIVO'});cerrar();alert('Configuración guardada. Actualice el Ranking del período para aplicar los nuevos pesos.');}catch(e){if(msg)msg.textContent='❌ '+e.message;}}

  window.mv363ResumenSlaLista=resumenSlaLista;window.mv363DetalleSla=detalleSla;window.mv363SemaforoSla=semaforo;
  window.mostrarTiempoGestionSla=mostrar;window.mostrarExcepcionesSla=function(periodo){return mostrar(periodo,'PENDIENTES');};window.mv363AbrirSolicitud=abrirSolicitud;window.mv363EnviarSolicitud=enviarSolicitud;window.mv363Resolver=resolver;window.mv363Reconstruir=reconstruir;window.mv363AbrirConfigRanking=abrirConfig;window.mv363GuardarConfig=guardarConfig;window.mv363CerrarModal=cerrar;
  window.MV363_SLA_GESTION_OK=true;window.MV366_SLA_DIRECTO_OK=true;console.log('MI VISUAL V367: Tiempo de Gestión SLA ordenado y ligero habilitado.');
})();
