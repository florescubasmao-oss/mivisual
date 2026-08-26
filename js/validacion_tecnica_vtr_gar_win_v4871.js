/* ================================================================
   MI VISUAL V487.1 - Control VTR/GAR WIN dentro de Validación Técnica

   FASE DE PRUEBA / SOLO LECTURA
   - Fuente de incidencias: WIN / MAPA_ORDENES.
   - El técnico debe haber reportado la VTR/GAR en VALIDACION_TECNICA.
   - Sin reporte: no habilita puntos de Producción.
   - Origen PROPIA / ASIGNADA: se propone con la atención FINALIZADA
     inmediatamente anterior del mismo cliente dentro de 30 días.
   - Si no hay evidencia suficiente o existe inconsistencia, queda MANUAL.
   - El indicador se atribuye a la cuadrilla de la atención anterior.
   - NO modifica Recableados, Producción, VTR/GAR, Ranking ni ninguna hoja.
================================================================ */
(function(){
  "use strict";

  if(window.MV4871_VTR_GAR_WIN_OK) return;
  window.MV4871_VTR_GAR_WIN_OK = true;

  const API = window.MI_VISUAL_API_URL || "";
  const MS_DIA = 86400000;
  const ESTADOS_NO_BONO = new Set(["NO BONO","RECHAZADO","OBSERVADO"]);
  let ultimoControl = null;
  let filtroActual = "TODOS";

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});
  }
  function val(o){
    for(let i=1;i<arguments.length;i++){
      const k=arguments[i];
      if(o && o[k] !== undefined && o[k] !== null && txt(o[k]) !== "") return o[k];
    }
    return "";
  }
  function id(v){ return txt(v).replace(/\.0+$/,""); }
  function claveCuadrilla(v){
    const n=norm(v), p=n.match(/(?:^|\s)P\s*(\d+)(?:\s|$)/);
    let plataforma="";
    if(n.includes("TRASLADO")) plataforma="TRASLADO";
    else if(n.includes("SGA")) plataforma="SGA";
    else if(n.includes("SGI")) plataforma="SGI";
    return p ? `P${Number(p[1])}|${plataforma}` : n;
  }
  function fecha(v){
    if(v instanceof Date && !isNaN(v.getTime())) return v;
    const t=txt(v); if(!t) return null;
    let m=t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    m=t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m) return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    const d=new Date(t); return isNaN(d.getTime()) ? null : d;
  }
  function fechaOrden(o){
    return fecha(val(o,"fechaFinVisita","FECHA_FIN_VISITA","fechaUltimoEstado","FECHA_ULTIMO_ESTADO","fechaSolicitud","FECHA_SOLICITUD"));
  }
  function fechaIso(d){
    if(!d) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function fechaPe(d){
    if(!d) return "-";
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  function mesIso(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
  function usuario(){ return localStorage.getItem("usuario") || ""; }
  function perfil(){ return norm(localStorage.getItem("perfil") || ""); }
  function puedeGestionar(){ return ["SUPERVISOR","JEFATURA","ADMIN","ADMINISTRADOR"].includes(perfil()); }

  function normalizarTicket(v){
    let t=norm(v).replace(/\s+/g,"");
    t=t.replace(/^GAR-GAR-/,"GAR-").replace(/^VTR-VTR-/,"VTR-");
    return t;
  }

  async function apiGet(payload){
    if(!API) throw new Error("No se encontró la URL de MI VISUAL.");
    const url=new URL(API);
    Object.keys(payload||{}).forEach(function(k){
      const v=payload[k];
      if(v!==undefined && v!==null && v!=="") url.searchParams.set(k, typeof v==="object"?JSON.stringify(v):String(v));
    });
    url.searchParams.set("_v4871",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});
    const t=await r.text(); let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvió datos válidos para el control VTR/GAR.");}
    if(!j || j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo consultar la información.");
    return j;
  }

  function listaMapa(r){
    const candidatos=[r&&r.registros,r&&r.ordenes,r&&r.lista,r&&r.datos,r&&r.items];
    for(const x of candidatos) if(Array.isArray(x)) return x;
    return [];
  }

  function ordenarMapa(o){
    return {
      ordenId:id(val(o,"ordenId","ORDEN_ID")),
      tipoTrabajo:txt(val(o,"tipoTrabajo","TIPO_TRABAJO")),
      productoOrigen:txt(val(o,"productoOrigen","PRODUCTO_ORIGEN")),
      estado:txt(val(o,"estado","ESTADO")),
      codigoCliente:id(val(o,"codigoCliente","CODIGO_CLIENTE","codigoSeguimientoCliente","CODIGO_SEGUIMIENTO_CLIENTE")),
      numeroDocumento:id(val(o,"numeroDocumento","NUMERO_DOCUMENTO","dni","DNI")),
      codigoSeguimiento:txt(val(o,"codigoSeguimiento","CODIGO_SEGUIMIENTO")),
      cuadrilla:txt(val(o,"cuadrilla","CUADRILLA")),
      region:txt(val(o,"region","REGION","sede","SEDE")),
      cliente:txt(val(o,"cliente","CLIENTE")),
      motivoFinalizacion:txt(val(o,"motivoFinalizacion","MOTIVO_FINALIZACION")),
      fechaImportacion:fecha(val(o,"fechaImportacion","FECHA_IMPORTACION")),
      fechaEvento:fechaOrden(o),
      bruto:o
    };
  }

  function tipoIncidencia(o){
    const ticket=normalizarTicket(o.codigoSeguimiento);
    if(ticket.startsWith("VTR-")) return "VTR";
    if(ticket.startsWith("GAR-")) return "GAR";
    const t=norm(o.tipoTrabajo), p=norm(o.productoOrigen);
    if(t==="REITERADA" || p==="REITERADA") return "VTR";
    if(t==="GARANTIA" || p==="GARANTIA") return "GAR";
    return "";
  }

  function esFinalizada(o){ return norm(o.estado).includes("FINALIZ"); }

  function periodosNecesarios(){
    const hoy=new Date(), desde=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()-60);
    const meses=[]; let d=new Date(desde.getFullYear(),desde.getMonth(),1);
    const fin=new Date(hoy.getFullYear(),hoy.getMonth(),1);
    while(d<=fin){ meses.push(mesIso(d)); d=new Date(d.getFullYear(),d.getMonth()+1,1); }
    return meses;
  }

  async function cargarMapa60Dias(){
    const respuestas=await Promise.all(periodosNecesarios().map(function(periodo){
      return apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:periodo});
    }));
    const porId={};
    respuestas.forEach(function(r){
      listaMapa(r).forEach(function(raw){
        const o=ordenarMapa(raw); if(!o.ordenId) return;
        const anterior=porId[o.ordenId];
        const f=o.fechaImportacion?o.fechaImportacion.getTime():0;
        const fa=anterior&&anterior.fechaImportacion?anterior.fechaImportacion.getTime():0;
        if(!anterior || f>=fa) porId[o.ordenId]=o;
      });
    });
    return Object.values(porId);
  }

  function normalizarValidacion(v){
    return {
      id:txt(val(v,"id","ID")),
      tipo:norm(val(v,"tipoValidacion","TIPO_VALIDACION")),
      codigo:id(val(v,"codigo","CODIGO")),
      ticket:normalizarTicket(val(v,"ticketFinal","TICKET_FINAL")),
      dni:id(val(v,"dniCliente","DNI_CLIENTE","numeroDocumento","NUMERO_DOCUMENTO")),
      cuadrilla:txt(val(v,"cuadrilla","CUADRILLA")),
      estado:norm(val(v,"resultadoFinal","RESULTADO_FINAL","estado","ESTADO")),
      estadoRegistro:norm(val(v,"estado","ESTADO")),
      motivo:txt(val(v,"motivoValidacion","MOTIVO_VALIDACION")),
      fechaRegistro:fecha(val(v,"fechaRegistro","FECHA_REGISTRO")),
      bruto:v
    };
  }

  async function cargarValidaciones(){
    const r=await apiGet({accion:"listarValidacionTecnica",usuario:usuario()});
    return (Array.isArray(r.validaciones)?r.validaciones:[]).map(normalizarValidacion).filter(function(v){return v.tipo==="VTR"||v.tipo==="GAR";});
  }

  function indiceReportes(validaciones){
    const porTicket={}, porCodigo={};
    validaciones.forEach(function(v){
      if(v.ticket){ if(!porTicket[v.ticket]) porTicket[v.ticket]=[]; porTicket[v.ticket].push(v); }
      if(v.codigo){ const k=`${v.tipo}|${v.codigo}`; if(!porCodigo[k]) porCodigo[k]=[]; porCodigo[k].push(v); }
    });
    return {porTicket,porCodigo};
  }

  function buscarReporte(inc,indices){
    const ticket=normalizarTicket(inc.codigoSeguimiento);
    const exactos=ticket?(indices.porTicket[ticket]||[]):[];
    if(exactos.length){
      const v=exactos.slice().sort(function(a,b){return (b.fechaRegistro?b.fechaRegistro.getTime():0)-(a.fechaRegistro?a.fechaRegistro.getTime():0);})[0];
      return {tipo:"EXACTO",validacion:v,codigoCoincide:!v.codigo||!inc.codigoCliente||v.codigo===inc.codigoCliente};
    }
    const tipo=tipoIncidencia(inc), candidatos=indices.porCodigo[`${tipo}|${inc.codigoCliente}`]||[];
    if(candidatos.length){
      const d0=inc.fechaEvento?inc.fechaEvento.getTime():0;
      const cercanos=candidatos.filter(function(v){
        if(!d0||!v.fechaRegistro)return true;
        return Math.abs(v.fechaRegistro.getTime()-d0)<=3*MS_DIA;
      }).sort(function(a,b){
        return Math.abs((a.fechaRegistro?a.fechaRegistro.getTime():0)-d0)-Math.abs((b.fechaRegistro?b.fechaRegistro.getTime():0)-d0);
      });
      if(cercanos.length) return {tipo:"POSIBLE",validacion:cercanos[0],codigoCoincide:true};
    }
    return {tipo:"SIN REPORTE",validacion:null,codigoCoincide:false};
  }

  function mismaPersona(a,b){
    if(a.codigoCliente && b.codigoCliente) return a.codigoCliente===b.codigoCliente;
    return !!(a.numeroDocumento && b.numeroDocumento && a.numeroDocumento===b.numeroDocumento);
  }

  function buscarOrigen(inc,ordenes){
    if(!inc.fechaEvento) return {origen:"MANUAL",motivo:"La incidencia no tiene fecha válida."};
    const t=inc.fechaEvento.getTime(), min=t-30*MS_DIA;
    const candidatos=ordenes.filter(function(o){
      if(!o.ordenId || o.ordenId===inc.ordenId || !esFinalizada(o) || !o.fechaEvento) return false;
      const f=o.fechaEvento.getTime();
      return f<t && f>=min && mismaPersona(inc,o);
    }).sort(function(a,b){return b.fechaEvento.getTime()-a.fechaEvento.getTime();});
    if(!candidatos.length) return {origen:"MANUAL",motivo:"No se encontró atención FINALIZADA anterior del cliente dentro de 30 días."};
    const primero=candidatos[0], f0=primero.fechaEvento.getTime();
    const empate=candidatos.filter(function(x){return Math.abs(x.fechaEvento.getTime()-f0)<60000;});
    const cuadrillas=new Set(empate.map(function(x){return claveCuadrilla(x.cuadrilla);}).filter(Boolean));
    if(cuadrillas.size>1){
      return {origen:"MANUAL",motivo:"Hay más de una atención anterior en el mismo momento con cuadrillas diferentes.",candidato:primero};
    }
    const propia=claveCuadrilla(primero.cuadrilla)===claveCuadrilla(inc.cuadrilla);
    return {
      origen:propia?"PROPIA":"ASIGNADA",
      candidato:primero,
      dias:Math.max(0,Math.floor((t-f0)/MS_DIA)),
      motivo:"Atención FINALIZADA inmediatamente anterior del mismo cliente dentro de 30 días."
    };
  }

  function decidirProduccion(tipoOrigen,reporte){
    if(!reporte || reporte.tipo==="SIN REPORTE") return {estado:"NO SUMA",motivo:"Sin reporte del técnico en Validación Técnica."};
    if(reporte.tipo!=="EXACTO") return {estado:"PENDIENTE",motivo:"Existe un posible reporte, pero el ticket WIN no coincide exactamente."};
    if(!reporte.codigoCoincide) return {estado:"PENDIENTE",motivo:"El ticket coincide, pero el código reportado no coincide con WIN."};
    if(tipoOrigen==="MANUAL") return {estado:"PENDIENTE",motivo:"Debe definirse manualmente si la VTR/GAR es PROPIA o ASIGNADA."};
    const est=reporte.validacion?reporte.validacion.estado:"";
    if(ESTADOS_NO_BONO.has(est)) return {estado:"NO SUMA",motivo:est==="NO BONO"?"Validada NO BONO.":`Validación ${est}.`};
    if(est==="BONO") return {estado:"SUMA",motivo:tipoOrigen==="ASIGNADA"?"ASIGNADA confirmada, reportada y validada.":"PROPIA reportada y validada BONO."};
    return {estado:"PENDIENTE",motivo:"La VTR/GAR fue reportada, pero aún no tiene validación final BONO/NO BONO."};
  }

  function construirControl(ordenes,validaciones){
    const hoy=new Date(), inicio=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()-29);
    const tIni=inicio.getTime(), tFin=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()+1).getTime();
    const indices=indiceReportes(validaciones);
    const incidencias=ordenes.filter(function(o){
      const tipo=tipoIncidencia(o), f=o.fechaEvento&&o.fechaEvento.getTime();
      return tipo && esFinalizada(o) && f>=tIni && f<tFin;
    }).sort(function(a,b){return b.fechaEvento.getTime()-a.fechaEvento.getTime();}).map(function(inc){
      const origen=buscarOrigen(inc,ordenes), reporte=buscarReporte(inc,indices), prod=decidirProduccion(origen.origen,reporte);
      const ant=origen.candidato||null;
      return {
        tipo:tipoIncidencia(inc),ordenId:inc.ordenId,ticket:normalizarTicket(inc.codigoSeguimiento),codigo:inc.codigoCliente,
        fecha:inc.fechaEvento,cliente:inc.cliente,cuadrillaEjecutora:inc.cuadrilla,sede:inc.region,
        tipoTrabajo:inc.motivoFinalizacion||inc.tipoTrabajo,origen:origen.origen,diasOrigen:origen.dias,
        cuadrillaOrigen:ant?ant.cuadrilla:"",ordenOrigen:ant?ant.ordenId:"",fechaOrigen:ant?ant.fechaEvento:null,tipoTrabajoOrigen:ant?(ant.motivoFinalizacion||ant.tipoTrabajo):"",
        motivoOrigen:origen.motivo,reporteTipo:reporte.tipo,reportada:reporte.tipo==="EXACTO",codigoCoincide:!!reporte.codigoCoincide,
        validacion:reporte.validacion,estadoProduccion:prod.estado,motivoProduccion:prod.motivo,
        afectaIndicador:origen.origen!=="MANUAL"&&!!(ant&&ant.cuadrilla),requiereManual:origen.origen==="MANUAL"||reporte.tipo==="POSIBLE"||(reporte.tipo==="EXACTO"&&!reporte.codigoCoincide)
      };
    });
    const r={total:incidencias.length,propias:0,asignadas:0,manuales:0,reportadas:0,sinReporte:0,suma:0,noSuma:0,pendientes:0};
    incidencias.forEach(function(x){
      if(x.origen==="PROPIA")r.propias++;else if(x.origen==="ASIGNADA")r.asignadas++;else r.manuales++;
      if(x.reportada)r.reportadas++;else r.sinReporte++;
      if(x.estadoProduccion==="SUMA")r.suma++;else if(x.estadoProduccion==="NO SUMA")r.noSuma++;else r.pendientes++;
    });
    return {incidencias,resumen:r,desde:inicio,hasta:hoy};
  }

  function css(){return `<style>
    .vgw-wrap{max-width:1260px;margin:auto;padding:14px;color:#0f172a}.vgw-head{background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;padding:16px;border-radius:18px;margin-bottom:12px}.vgw-head h2{margin:0 0 5px}.vgw-head p{margin:0;font-size:12px;line-height:1.5;opacity:.95}
    .vgw-alert{background:#ecfdf5;border:1px solid #86efac;color:#14532d;border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.45;margin-bottom:10px}.vgw-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:10px}.vgw-kpi{background:#fff;border:1px solid #dbe3ee;border-radius:13px;padding:10px;box-shadow:0 5px 14px rgba(15,23,42,.06)}.vgw-kpi b{display:block;font-size:20px}.vgw-kpi span{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase}
    .vgw-tools{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.vgw-tab{border:0;border-radius:999px;padding:8px 11px;background:#e2e8f0;color:#334155;font-weight:900;cursor:pointer}.vgw-tab.on{background:#2563eb;color:#fff}.vgw-list{display:grid;gap:9px}.vgw-card{background:#fff;border:1px solid #dbe3ee;border-radius:15px;padding:12px;box-shadow:0 6px 16px rgba(15,23,42,.07)}.vgw-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.vgw-title{font-weight:900}.vgw-sub{font-size:11px;color:#64748b;margin-top:3px}.vgw-badges{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.vgw-badge{font-size:10px;font-weight:900;border-radius:999px;padding:5px 8px;background:#e2e8f0}.vgw-badge.PROPIA{background:#dcfce7;color:#166534}.vgw-badge.ASIGNADA{background:#dbeafe;color:#1d4ed8}.vgw-badge.MANUAL,.vgw-badge.PENDIENTE{background:#fef3c7;color:#92400e}.vgw-badge.SUMA{background:#dcfce7;color:#166534}.vgw-badge.NO-SUMA{background:#fee2e2;color:#991b1b}.vgw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px;margin-top:9px;font-size:11px}.vgw-grid b{color:#334155}.vgw-detail{margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:11px;color:#475569;line-height:1.5}.vgw-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.vgw-btn{border:0;border-radius:10px;padding:10px 13px;background:#2563eb;color:#fff;font-weight:900;cursor:pointer}.vgw-btn.alt{background:#64748b}
    .mv4871-entry{margin:0 0 12px;background:linear-gradient(135deg,#eff6ff,#ecfeff);border:1px solid #93c5fd;border-radius:16px;padding:13px;color:#0f172a}.mv4871-entry h3{margin:0 0 5px;font-size:16px}.mv4871-entry p{margin:0 0 9px;color:#475569;font-size:12px;line-height:1.45}.mv4871-entry button{border:0;border-radius:11px;padding:9px 12px;background:#0f766e;color:#fff;font-weight:900;cursor:pointer}
    @media(max-width:820px){.vgw-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.vgw-grid{grid-template-columns:1fr}.vgw-top{flex-direction:column}.vgw-badges{justify-content:flex-start}}
  </style>`;}

  function kpi(n,t){return `<div class="vgw-kpi"><b>${esc(n)}</b><span>${esc(t)}</span></div>`;}
  function claseEstado(s){return norm(s).replace(/\s+/g,"-");}

  function filtrar(x){
    if(filtroActual==="TODOS")return true;
    if(filtroActual==="SIN_REPORTE")return !x.reportada;
    if(filtroActual==="PROPIA")return x.origen==="PROPIA";
    if(filtroActual==="ASIGNADA")return x.origen==="ASIGNADA";
    if(filtroActual==="MANUAL")return x.requiereManual;
    if(filtroActual==="SUMA")return x.estadoProduccion==="SUMA";
    if(filtroActual==="NO_SUMA")return x.estadoProduccion==="NO SUMA";
    if(filtroActual==="PENDIENTE")return x.estadoProduccion==="PENDIENTE";
    return true;
  }

  function renderLista(){
    if(!ultimoControl)return;
    document.querySelectorAll(".vgw-tab").forEach(function(b){b.classList.toggle("on",b.dataset.f===filtroActual);});
    const host=document.getElementById("vgwLista");if(!host)return;
    const lista=ultimoControl.incidencias.filter(filtrar);
    host.innerHTML=lista.length?lista.map(function(x){
      const estadoVal=x.validacion?(x.validacion.estado||x.validacion.estadoRegistro||"PENDIENTE"):"SIN REPORTE";
      const rep=x.reportada?"REPORTADA":(x.reporteTipo==="POSIBLE"?"REVISAR REPORTE":"SIN REPORTE");
      return `<div class="vgw-card">
        <div class="vgw-top"><div><div class="vgw-title">${esc(x.tipo)} · ${esc(x.ticket||x.ordenId)}</div><div class="vgw-sub">${fechaPe(x.fecha)} · Código ${esc(x.codigo||"-")} · Orden WIN ${esc(x.ordenId)}</div></div><div class="vgw-badges"><span class="vgw-badge ${esc(x.origen)}">${esc(x.origen)}</span><span class="vgw-badge">${esc(rep)}</span><span class="vgw-badge ${esc(claseEstado(x.estadoProduccion))}">${esc(x.estadoProduccion)}</span></div></div>
        <div class="vgw-grid"><div><b>Ejecutora:</b> ${esc(x.cuadrillaEjecutora||"-")}</div><div><b>Validación:</b> ${esc(estadoVal)}</div><div><b>Atención anterior:</b> ${x.ordenOrigen?`${esc(x.ordenOrigen)} · ${fechaPe(x.fechaOrigen)}`:"No identificada"}</div><div><b>Cuadrilla origen / indicador:</b> ${esc(x.cuadrillaOrigen||"PENDIENTE MANUAL")}</div><div><b>Trabajo VTR/GAR:</b> ${esc(x.tipoTrabajo||"-")}</div><div><b>Trabajo anterior:</b> ${esc(x.tipoTrabajoOrigen||"-")}</div></div>
        <div class="vgw-detail"><b>Producción:</b> ${esc(x.motivoProduccion)}<br><b>Origen:</b> ${esc(x.motivoOrigen)}${x.diasOrigen!=null?` · ${esc(x.diasOrigen)} día(s)`:""}${x.reportada&&!x.codigoCoincide?`<br><b>⚠ Código reportado:</b> ${esc(x.validacion&&x.validacion.codigo||"-")} · WIN: ${esc(x.codigo||"-")}`:""}</div>
      </div>`;
    }).join(""):`<div class="vgw-card">No hay casos para este filtro.</div>`;
  }

  window.mv4871FiltrarVtrGar=function(f){filtroActual=f||"TODOS";renderLista();};

  async function cargarControl(){
    const estado=document.getElementById("vgwEstado");
    if(estado)estado.innerHTML="⏳ Consultando WIN y Validación Técnica...";
    const resultados=await Promise.all([cargarMapa60Dias(),cargarValidaciones()]);
    ultimoControl=construirControl(resultados[0],resultados[1]);
    const r=ultimoControl.resumen;
    document.getElementById("vgwKpis").innerHTML=[kpi(r.total,"VTR/GAR WIN 30 días"),kpi(r.reportadas,"Reportadas"),kpi(r.sinReporte,"Sin reporte"),kpi(r.propias,"Propias"),kpi(r.asignadas,"Asignadas"),kpi(r.manuales,"Manual"),kpi(r.suma,"Habilitadas"),kpi(r.noSuma,"No suman"),kpi(r.pendientes,"Pendientes")].join("");
    if(estado)estado.innerHTML=`<div class="vgw-alert"><b>V487.1 · Solo lectura.</b> Ventana ${fechaPe(ultimoControl.desde)} al ${fechaPe(ultimoControl.hasta)}. WIN identifica la incidencia y la atención anterior; VALIDACION_TECNICA confirma que el técnico la reportó y su resultado. <b>Sin reporte = 0 puntos.</b></div>`;
    renderLista();
  }

  window.mostrarControlVtrGarWinV4871=async function(){
    if(!puedeGestionar()){
      alert("Este control está disponible para Supervisor y Jefatura.");return;
    }
    mostrarPantalla(css()+`<div class="vgw-wrap"><div class="vgw-head"><h2>📡 VTR / GAR · Control WIN</h2><p>Centralización dentro de Validación Técnica. Origen automático por los 30 días anteriores, reporte obligatorio del técnico y separación entre cuadrilla ejecutora y cuadrilla responsable del indicador.</p></div><div id="vgwEstado" class="vgw-alert">Preparando consulta...</div><div id="vgwKpis" class="vgw-kpis"></div><div class="vgw-tools">${[["TODOS","Todos"],["SIN_REPORTE","Sin reporte"],["PROPIA","Propias"],["ASIGNADA","Asignadas"],["MANUAL","Revisión manual"],["SUMA","Habilitadas"],["NO_SUMA","No suman"],["PENDIENTE","Pendientes"]].map(function(t){return `<button class="vgw-tab ${t[0]==="TODOS"?"on":""}" data-f="${t[0]}" onclick="mv4871FiltrarVtrGar('${t[0]}')">${t[1]}</button>`;}).join("")}</div><div id="vgwLista" class="vgw-list"></div><div class="vgw-actions"><button class="vgw-btn" onclick="mostrarControlVtrGarWinV4871()">🔄 Actualizar</button><button class="vgw-btn alt" onclick="mostrarValidacionTecnica()">⬅️ Volver a Validación Técnica</button></div></div>`);
    try{await cargarControl();}catch(e){const h=document.getElementById("vgwEstado");if(h)h.innerHTML=`<div style="background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:11px;padding:10px"><b>No se pudo cargar el control.</b><br>${esc(e&&e.message||e)}</div>`;}
  };

  function insertarAcceso(){
    if(!puedeGestionar())return false;
    if(document.getElementById("mv4871VtrGarEntry"))return true;
    const wrap=document.querySelector(".vt-wrap"); if(!wrap)return false;
    const header=wrap.querySelector(".vt-header"); if(!header)return false;
    const div=document.createElement("div"); div.id="mv4871VtrGarEntry"; div.className="mv4871-entry";
    div.innerHTML=`<h3>📡 VTR / GAR · Control WIN</h3><p>Revisa en un solo lugar las VTR/GAR FINALIZADAS de WIN, si fueron reportadas por el técnico, si son PROPIAS o ASIGNADAS y a qué cuadrilla afecta el indicador. Recableados se mantiene sin cambios.</p><button type="button" onclick="mostrarControlVtrGarWinV4871()">Abrir control VTR/GAR</button>`;
    header.insertAdjacentElement("afterend",div); return true;
  }

  window.mv4871InstalarAccesoValidacion=function(){
    let n=0; const intentar=function(){if(insertarAcceso()||n++>25)return;setTimeout(intentar,120);};intentar();
  };

  // Si el módulo ya está abierto al terminar la carga lazy, inserta el acceso.
  setTimeout(window.mv4871InstalarAccesoValidacion,0);
})();
