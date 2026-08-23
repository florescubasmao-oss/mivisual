/* ============================================================
   MI VISUAL V476 - Excel Dashboard: todos los indicadores visibles
   - Primera hoja compacta con todos los KPI por cuadrilla.
   - Respeta Período + Sede del Dashboard.
   - Indicador + Cuadrilla NO recortan la exportación.
   - Reutiliza el resumen ya cargado; no recalcula Dashboard.
   - PDF sin cambios.
============================================================ */
(function(){
  "use strict";
  if(window.MV476_INFORME_EXCEL_TODOS_OK) return;

  const XLSX_URLS=[
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];
  let promesaXlsx=null;

  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  const red=(v,d=1)=>{const f=Math.pow(10,d);return Math.round((n(v)+Number.EPSILON)*f)/f;};
  const norm=v=>String(v||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();

  function periodoNombre(p){
    const m=String(p||"").match(/^(\d{4})-(\d{2})$/);
    if(!m) return String(p||"PERIODO");
    const meses=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    return `${meses[Number(m[2])-1]||m[2]} ${m[1]}`;
  }

  function fechaVisible(v){
    if(!v) return "";
    const s=String(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:s;
  }

  function periodoDeFecha(v){
    if(typeof window.mv276ClavePeriodo==="function"){
      try{return window.mv276ClavePeriodo(v)||"";}catch(_){}
    }
    const s=String(v||"");
    let m=s.match(/^(\d{4})-(\d{2})/);
    if(m) return `${m[1]}-${m[2]}`;
    m=s.match(/\d{1,2}\/(\d{1,2})\/(\d{4})/);
    return m?`${m[2]}-${String(Number(m[1])).padStart(2,"0")}`:"";
  }

  function datosDashboard(){
    const d=typeof window.mv356ObtenerDatosDashboardGerencial==="function"
      ? (window.mv356ObtenerDatosDashboardGerencial()||{})
      : {};
    return {lista:Array.isArray(d.lista)?d.lista:[],periodo:d.periodo||""};
  }

  function sedeSeleccionada(){
    const dom=norm(document.getElementById("mv199FiltroSede")?.value||"");
    if(dom) return dom;
    try{
      if(typeof MV199_DASH_JEFATURA_FILTROS!=="undefined") return norm(MV199_DASH_JEFATURA_FILTROS?.sede||"TODAS")||"TODAS";
    }catch(_){}
    return "TODAS";
  }

  function alcance(){
    const d=datosDashboard(),sede=sedeSeleccionada();
    return {
      periodo:d.periodo,
      sede,
      lista:d.lista.filter(x=>x&&x.cuadrilla).filter(x=>sede==="TODAS"||norm(x.sede)===sede)
    };
  }

  function supervisor(x){return x?.mv353CumplimientoDia?.supervisor||x?.supervisor||"NO REGISTRADO";}

  function winObs(x){
    const v=x?.mv459Observaciones?.win;
    if(v) return {
      cantidad:n(v.cantidad),observado:n(v.observado),gestion:n(v.gestion),
      penalizadas:n(v.penalizadas),penalizado:n(v.penalizado),
      subsanadas:n(v.subsanadas),subsanado:n(v.subsanado)
    };
    const a=x?.mv361ObservacionesWin||{};
    return {
      cantidad:n(a.total),observado:n(a.observado??a.montoTotal??a.montoPenalizado),gestion:n(a.gestion),
      penalizadas:n(a.penalizadas),penalizado:n(a.montoPenalizado),
      subsanadas:n(a.subsanadas),subsanado:n(a.montoSubsanado)
    };
  }

  function sla(x){
    const d=x?.detSla||{};
    const evaluables=n(d.evaluables??x?.slaEvaluables);
    const cumplenBruto=n(d.cumplenBruto);
    const cumplenAjustado=n(d.cumplenAjustado);
    const bruto=Number.isFinite(Number(d.slaBruto))?n(d.slaBruto):Number.isFinite(Number(x?.slaBruto))?n(x.slaBruto):(evaluables?cumplenBruto/evaluables*100:0);
    const ajustado=Number.isFinite(Number(d.slaAjustado))?n(d.slaAjustado):Number.isFinite(Number(x?.slaAjustado))?n(x.slaAjustado):(evaluables?cumplenAjustado/evaluables*100:0);
    return {
      evaluables,cumplenBruto,cumplenAjustado,
      fueraBruto:n(d.fueraBruto)||Math.max(0,evaluables-cumplenBruto),
      fueraAjustado:n(d.fueraAjustado)||Math.max(0,evaluables-cumplenAjustado),
      excepcionesPendientes:n(d.excepcionesPendientes),
      excepcionesAprobadas:n(d.excepcionesAprobadas),
      excepcionesRechazadas:n(d.excepcionesRechazadas),
      bruto:red(bruto,1),ajustado:red(ajustado,1)
    };
  }

  function metasDashboard(x){
    try{
      if(typeof window.mv4Resumen==="function"){
        const r=window.mv4Resumen([x])||{};
        return {cumplidas:n(r.ok),cumplimiento:n(r.cumplimiento)};
      }
    }catch(_){}
    return {cumplidas:"",cumplimiento:""};
  }

  function fila(x,periodo){
    const d=x?.mv353CumplimientoDia||{},e=x?.detEfectividad||{},r=x?.detRecableado||{},v=x?.detVtrGar||{};
    const s=sla(x),w=winObs(x),m=metasDashboard(x);
    const prod=n(x.produccion),metaDia=n(d.metaAcumulada),metaMensual=130;
    return {
      periodo,fechaCorte:d.fechaCorte||"",sede:norm(x.sede),plataforma:norm(x.plataforma),supervisor:supervisor(x),cuadrilla:x.cuadrilla||"",
      produccion:red(prod,1),ordenes:red(x?.detProduccion?.totalOrdenes,0),diasCampo:n(d.diasCampo),diasDescanso:n(d.diasDescanso),vacaciones:n(d.diasVacaciones),bolsa:n(d.diasBolsa),
      metaDia:red(metaDia,1),cumplimientoDia:red(metaDia?prod/metaDia*100:0,1),brechaDia:red(prod-metaDia,1),metaMensual,avanceMensual:red(prod/metaMensual*100,1),
      efTotal:red(e.total,0),finalizadas:red(e.finalizadas,0),canceladas:red(e.canceladas,0),reprogramadas:red(e.reprogramadas,0),regestion:red(e.regestion,0),efectividad:red(x.efectividad,1),
      los:red(r.los??r.rojoAsignadas,0),recableados:red(r.recableados,0),recableado:red(x.recableado,1),
      vtrFinalizadas:red(v.finalizadas,0),gar:red(v.gar,0),vtr:red(v.vtr,0),incidencias:red(v.total??v.totalGarVtr,0),vtrgar:red(x.vtrgar,1),
      ...s,
      obsWin:w.cantidad,obsWinObservado:red(w.observado,2),obsWinGestion:red(w.gestion,2),obsWinPenalizadas:w.penalizadas,obsWinPenalizado:red(w.penalizado,2),obsWinSubsanadas:w.subsanadas,obsWinSubsanado:red(w.subsanado,2),
      metasCumplidas:m.cumplidas,cumplimientoGeneral:m.cumplimiento,
      puestoSede:n(x.puestoSede)||"",puestoZN:n(x.puestoRegion)||"",puestoPlataforma:n(x.puestoPlataforma)||"",puntaje:red(x.puntaje,2)
    };
  }

  function sheet(filas,anchos,formatos){
    const XLSX=window.XLSX,ws=XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"]=anchos.map(w=>({wch:w}));
    if(filas.length&&filas[0]?.length) ws["!autofilter"]={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:filas.length-1,c:filas[0].length-1}})};
    for(let r=1;r<filas.length;r++) Object.entries(formatos||{}).forEach(([c,z])=>{const a=XLSX.utils.encode_cell({r,c:Number(c)});if(ws[a]) ws[a].z=z;});
    return ws;
  }

  function indicadoresRows(lista,periodo){
    const rows=[["PERÍODO","FECHA CORTE","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA","PRODUCCIÓN PTS","META AL DÍA PTS","CUMPLIMIENTO AL DÍA %","BRECHA AL DÍA PTS","META MENSUAL PTS","AVANCE MENSUAL %","EFECTIVIDAD %","RECABLEADO %","VTR/GAR %","SLA BRUTO %","SLA AJUSTADO %","OBS WIN CANTIDAD","WIN OBSERVADO ACUMULADO","WIN EN GESTIÓN","WIN PENALIZADO","WIN SUBSANADO","METAS CUMPLIDAS","CUMPLIMIENTO GENERAL %","PUESTO SEDE","PUESTO ZONA NORTE","PUESTO PLATAFORMA","PUNTAJE RANKING"]];
    lista.slice().sort((a,b)=>norm(a.sede).localeCompare(norm(b.sede))||String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true})).forEach(x=>{
      const f=fila(x,periodo);
      rows.push([f.periodo,fechaVisible(f.fechaCorte),f.sede,f.plataforma,f.supervisor,f.cuadrilla,f.produccion,f.metaDia,f.cumplimientoDia,f.brechaDia,f.metaMensual,f.avanceMensual,f.efectividad,f.recableado,f.vtrgar,f.bruto,f.ajustado,f.obsWin,f.obsWinObservado,f.obsWinGestion,f.obsWinPenalizado,f.obsWinSubsanado,f.metasCumplidas,f.cumplimientoGeneral,f.puestoSede,f.puestoZN,f.puestoPlataforma,f.puntaje]);
    });
    return rows;
  }

  function consolidar(lista,periodo,sede){
    const fs=lista.map(x=>fila(x,periodo)),sum=c=>fs.reduce((a,x)=>a+n(x[c]),0),cuadrillas=fs.length;
    const prod=sum("produccion"),metaDia=sum("metaDia"),efTotal=sum("efTotal"),finalizadas=sum("finalizadas"),los=sum("los"),rec=sum("recableados"),vfin=sum("vtrFinalizadas"),inc=sum("incidencias"),se=sum("evaluables"),sb=sum("cumplenBruto"),sa=sum("cumplenAjustado");
    let metas="",cumpl="";
    try{if(typeof window.mv4Resumen==="function"){const r=window.mv4Resumen(lista)||{};metas=n(r.ok);cumpl=n(r.cumplimiento);}}catch(_){}
    return {periodo,sede,cuadrillas,produccion:red(prod,1),metaDia:red(metaDia,1),cumplimientoDia:red(metaDia?prod/metaDia*100:0,1),brecha:red(prod-metaDia,1),metaMensual:cuadrillas*130,avanceMensual:red(cuadrillas?prod/(cuadrillas*130)*100:0,1),efectividad:red(efTotal?finalizadas/efTotal*100:0,1),recableado:red(los?rec/los*100:0,1),vtrgar:red(vfin?inc/vfin*100:0,1),slaBruto:red(se?sb/se*100:0,1),slaAjustado:red(se?sa/se*100:0,1),obsWin:sum("obsWin"),observado:red(sum("obsWinObservado"),2),gestion:red(sum("obsWinGestion"),2),penalizado:red(sum("obsWinPenalizado"),2),subsanado:red(sum("obsWinSubsanado"),2),metas,cumpl};
  }

  function resumenRows(lista,periodo){
    const sedes=Array.from(new Set(lista.map(x=>norm(x.sede)).filter(Boolean))).sort();
    const rows=[["PERÍODO","SEDE","CUADRILLAS","PRODUCCIÓN PTS","META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA PTS","META MENSUAL","AVANCE MENSUAL %","EFECTIVIDAD %","RECABLEADO %","VTR/GAR %","SLA BRUTO %","SLA AJUSTADO %","OBS WIN CANTIDAD","WIN OBSERVADO","WIN EN GESTIÓN","WIN PENALIZADO","WIN SUBSANADO","METAS CUMPLIDAS","CUMPLIMIENTO GENERAL %"]];
    sedes.forEach(s=>{const r=consolidar(lista.filter(x=>norm(x.sede)===s),periodo,s);rows.push([r.periodo,r.sede,r.cuadrillas,r.produccion,r.metaDia,r.cumplimientoDia,r.brecha,r.metaMensual,r.avanceMensual,r.efectividad,r.recableado,r.vtrgar,r.slaBruto,r.slaAjustado,r.obsWin,r.observado,r.gestion,r.penalizado,r.subsanado,r.metas,r.cumpl]);});
    if(sedes.length>1){const r=consolidar(lista,periodo,"ZONA NORTE");rows.push([r.periodo,r.sede,r.cuadrillas,r.produccion,r.metaDia,r.cumplimientoDia,r.brecha,r.metaMensual,r.avanceMensual,r.efectividad,r.recableado,r.vtrgar,r.slaBruto,r.slaAjustado,r.obsWin,r.observado,r.gestion,r.penalizado,r.subsanado,r.metas,r.cumpl]);}
    return rows;
  }

  function detalleRows(lista,periodo){
    const rows=[["PERÍODO","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA","ÓRDENES PRODUCCIÓN","PRODUCCIÓN PTS","DÍAS EN CAMPO","DÍAS DESCANSO","VACACIONES","CAMPO BOLSA","META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA PTS","TOTAL ÓRDENES EFECTIVIDAD","FINALIZADAS","CANCELADAS","REPROGRAMADAS","REGESTIÓN","EFECTIVIDAD %","LOS / ÓRDENES VT","RECABLEADOS","RECABLEADO %","FINALIZADAS VTR/GAR","GAR","VTR","INCIDENCIAS VTR/GAR","VTR/GAR %","SLA EVALUABLES","SLA CUMPLEN BRUTO","FUERA SLA BRUTO","SLA BRUTO %","SLA CUMPLEN AJUSTADO","FUERA SLA AJUSTADO","EXCEP. PENDIENTES","EXCEP. APROBADAS","EXCEP. RECHAZADAS","SLA AJUSTADO %","OBS WIN CANTIDAD","WIN OBSERVADO","WIN EN GESTIÓN","OBS WIN PENALIZADAS","WIN PENALIZADO","OBS WIN SUBSANADAS","WIN SUBSANADO","PUNTAJE RANKING"]];
    lista.forEach(x=>{const f=fila(x,periodo);rows.push([f.periodo,f.sede,f.plataforma,f.supervisor,f.cuadrilla,f.ordenes,f.produccion,f.diasCampo,f.diasDescanso,f.vacaciones,f.bolsa,f.metaDia,f.cumplimientoDia,f.brechaDia,f.efTotal,f.finalizadas,f.canceladas,f.reprogramadas,f.regestion,f.efectividad,f.los,f.recableados,f.recableado,f.vtrFinalizadas,f.gar,f.vtr,f.incidencias,f.vtrgar,f.evaluables,f.cumplenBruto,f.fueraBruto,f.bruto,f.cumplenAjustado,f.fueraAjustado,f.excepcionesPendientes,f.excepcionesAprobadas,f.excepcionesRechazadas,f.ajustado,f.obsWin,f.obsWinObservado,f.obsWinGestion,f.obsWinPenalizadas,f.obsWinPenalizado,f.obsWinSubsanadas,f.obsWinSubsanado,f.puntaje]);});
    return rows;
  }

  function produccionRows(lista){
    const rows=[["SEDE","CUADRILLA","PLATAFORMA","TIPO DE TRABAJO","CANTIDAD","PUNTAJE UNITARIO","PUNTOS"]];
    lista.forEach(x=>Object.entries(x?.detProduccion?.tipos||{}).forEach(([tipo,t])=>rows.push([norm(x.sede),x.cuadrilla||"",norm(x.plataforma),tipo,red(t?.cantidad,0),red(t?.puntaje,1),red(t?.puntos,1)])));
    return rows;
  }

  async function observaciones(periodo,sede){
    if(!document.getElementById("mv355IncluirObservaciones")?.checked) return [];
    const base=window.MI_VISUAL_API_URL||""; if(!base) return [];
    try{
      const r=await fetch(base,{method:"POST",body:JSON.stringify({accion:"listarObservaciones",usuario:localStorage.getItem("usuario")||""})}),d=await r.json();
      return (d.observaciones||[]).filter(o=>(!periodo||periodoDeFecha(o.fechaRegistro)===periodo)&&(sede==="TODAS"||norm(o.sede)===sede));
    }catch(e){console.warn("V476 observaciones",e);return [];}
  }

  function observacionesRows(lista,periodo){
    const rows=[["FECHA","PERÍODO","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA","FUENTE","CÓDIGO","TIPO","DESCRIPCIÓN","ESTADO","MONTO","PLAZO"]];
    lista.forEach(o=>rows.push([fechaVisible(o.fechaRegistro),periodo,norm(o.sede),norm(o.plataforma),o.supervisor||"",o.cuadrilla||"",o.fuente||"",o.codigo||"",o.tipoObservacion||"",o.descripcion||"",o.estado||"",n(o.monto),o.plazo||""]));
    return rows;
  }

  function cargarScript(url){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=url;s.async=true;s.crossOrigin="anonymous";s.onload=res;s.onerror=()=>{s.remove();rej(new Error("No se pudo cargar Excel."));};document.head.appendChild(s);});}
  async function asegurarXlsx(){
    if(window.XLSX?.utils) return;
    if(promesaXlsx) return promesaXlsx;
    promesaXlsx=(async()=>{let e;for(const u of XLSX_URLS){try{await cargarScript(u);if(window.XLSX?.utils)return;}catch(x){e=x;}}throw e||new Error("No se pudo cargar el generador Excel.");})().catch(e=>{promesaXlsx=null;throw e;});
    return promesaXlsx;
  }

  function overlay(t){let o=document.getElementById("mv355Overlay");if(!o){o=document.createElement("div");o.id="mv355Overlay";Object.assign(o.style,{position:"fixed",inset:"0",zIndex:"10050",display:"none",alignItems:"center",justifyContent:"center",background:"rgba(2,8,23,.72)"});o.innerHTML='<div style="background:#10213b;color:#fff;padding:22px;border-radius:18px"><b id="mv355OverlayTexto"></b></div>';document.body.appendChild(o);}const x=document.getElementById("mv355OverlayTexto");if(x)x.textContent=t;o.style.display="flex";}
  function cerrar(){const o=document.getElementById("mv355Overlay");if(o)o.style.display="none";}
  function mensaje(t,e=false){const x=document.getElementById("mv355Mensaje");if(x){x.textContent=t||"";x.style.color=e?"#fecaca":"#bbf7d0";}}

  async function generar(){
    const a=alcance();
    if(!a.lista.length) throw new Error(`No hay cuadrillas disponibles para ${a.sede==="TODAS"?"el período seleccionado":a.sede}.`);
    overlay("Preparando Excel con todos los indicadores del Dashboard...");mensaje("");
    try{
      const obsPromise=observaciones(a.periodo,a.sede);
      await asegurarXlsx();
      const obs=await obsPromise,XLSX=window.XLSX,wb=XLSX.utils.book_new();
      wb.Props={Title:`Dashboard MI VISUAL - ${periodoNombre(a.periodo)}`,Subject:"Todos los indicadores del Dashboard",Author:localStorage.getItem("nombresApellidos")||localStorage.getItem("usuario")||"MI VISUAL",Company:"Visual Connections SAC",CreatedDate:new Date()};

      const ind=indicadoresRows(a.lista,a.periodo);
      XLSX.utils.book_append_sheet(wb,sheet(ind,[12,13,14,18,25,42,15,16,20,18,17,18,15,15,14,14,16,16,20,18,17,17,16,21,13,18,18,16],{6:'0.0',7:'0.0',8:'0.0"%"',9:'0.0',10:'0.0',11:'0.0"%"',12:'0.0"%"',13:'0.0"%"',14:'0.0"%"',15:'0.0"%"',16:'0.0"%"',18:'"S/ "0.00',19:'"S/ "0.00',20:'"S/ "0.00',21:'"S/ "0.00',23:'0.0"%"',27:'0.00'}),"INDICADORES_CUADRILLAS");

      const res=resumenRows(a.lista,a.periodo);
      XLSX.utils.book_append_sheet(wb,sheet(res,[12,16,12,15,15,20,15,16,18,15,15,14,14,16,16,18,18,17,17,16,21],{3:'0.0',4:'0.0',5:'0.0"%"',6:'0.0',7:'0.0',8:'0.0"%"',9:'0.0"%"',10:'0.0"%"',11:'0.0"%"',12:'0.0"%"',13:'0.0"%"',15:'"S/ "0.00',16:'"S/ "0.00',17:'"S/ "0.00',18:'"S/ "0.00',20:'0.0"%"'}),"RESUMEN_SEDES");

      const det=detalleRows(a.lista,a.periodo);
      XLSX.utils.book_append_sheet(wb,sheet(det,new Array(det[0].length).fill(16),{6:'0.0',11:'0.0',12:'0.0"%"',13:'0.0',19:'0.0"%"',22:'0.0"%"',27:'0.0"%"',31:'0.0"%"',37:'0.0"%"',39:'"S/ "0.00',40:'"S/ "0.00',42:'"S/ "0.00',44:'"S/ "0.00',45:'0.00'}),"DETALLE_INDICADORES");

      if(document.getElementById("mv355IncluirProduccion")?.checked){const p=produccionRows(a.lista);XLSX.utils.book_append_sheet(wb,sheet(p,[14,42,18,56,12,18,12],{5:'0.0',6:'0.0'}),"PRODUCCION_DETALLE");}
      if(document.getElementById("mv355IncluirObservaciones")?.checked){const o=observacionesRows(obs,a.periodo);XLSX.utils.book_append_sheet(wb,sheet(o,[14,12,14,18,26,42,14,17,30,60,16,14,18],{11:'"S/ "0.00'}),"OBSERVACIONES");}

      const met=[["INDICADOR DEL DASHBOARD","INCLUIDO EN EXCEL"],["Producción","Sí"],["Cumplimiento / avance al día","Sí"],["Avance mensual","Sí"],["Efectividad","Sí"],["Recableado","Sí"],["VTR/GAR","Sí"],["Tiempo de Gestión - SLA bruto","Sí"],["Tiempo de Gestión - SLA ajustado","Sí"],["Observaciones WIN","Sí"],["Metas y cumplimiento general","Sí"],["Ranking / posición","Sí"],["Alcance",`Período ${periodoNombre(a.periodo)} · ${a.sede==="TODAS"?"Todas las sedes":a.sede}`],["Optimización","Se reutilizan los datos ya cargados en el Dashboard; no se relanzan los cálculos operativos."]];
      XLSX.utils.book_append_sheet(wb,sheet(met,[36,105]),"METODOLOGIA");

      const nombre=`Dashboard_MI_VISUAL_${a.periodo.replace("-","_")}_${a.sede==="TODAS"?"ZONA_NORTE":a.sede.replace(/\s+/g,"_")}_TODOS_INDICADORES.xlsx`;
      XLSX.writeFile(wb,nombre,{compression:true,bookType:"xlsx"});
      mensaje(`Excel generado con todos los indicadores: ${a.sede==="TODAS"?"Todas las sedes":a.sede}.`);
    }finally{cerrar();}
  }

  window.mv355GenerarInformeExcel=async function(){try{await generar();}catch(e){console.error("V476 Excel Dashboard",e);cerrar();mensaje(e.message||"No se pudo generar el Excel.",true);}};
  window.MV476_INFORME_EXCEL_TODOS_OK=true;
  console.log("MI VISUAL V476: Excel con todos los indicadores habilitado.");
})();