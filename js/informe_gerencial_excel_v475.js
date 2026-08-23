/* ============================================================
   MI VISUAL V475 - Excel gerencial del Dashboard
   Alcance estricto:
   - SOLO reemplaza la generación de Excel del Informe Gerencial.
   - PDF V355 permanece intacto.
   - Reutiliza los datos ya cargados en el Dashboard.
   - NO recalcula ni consulta nuevamente indicadores del Dashboard.
   - Período + Sede definen el alcance del Excel.
   - Indicador + Cuadrilla NO recortan el Excel.
   - Observaciones del Dashboard: SOLO WIN, alineado con V459.
   - XLSX continúa cargándose únicamente al generar el archivo.
============================================================ */
(function(){
  "use strict";

  if(window.MV475_INFORME_EXCEL_OK) return;

  const XLSX_URLS = [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];
  let promesaXlsx = null;

  function n(v){
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  function red(v,d=1){
    const f=Math.pow(10,d);
    return Math.round((n(v)+Number.EPSILON)*f)/f;
  }

  function norm(v){
    return String(v || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function periodoNombre(periodo){
    const m=String(periodo||"").match(/^(\d{4})-(\d{2})$/);
    if(!m) return String(periodo||"PERIODO");
    const meses=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    return `${meses[Number(m[2])-1]||m[2]} ${m[1]}`;
  }

  function fechaVisible(v){
    if(!v) return "";
    const s=String(v);
    const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s;
  }

  function periodoDeFecha(v){
    if(typeof window.mv276ClavePeriodo === "function"){
      try{return window.mv276ClavePeriodo(v)||"";}catch(_){}
    }
    const s=String(v||"");
    let m=s.match(/^(\d{4})-(\d{2})/);
    if(m) return `${m[1]}-${m[2]}`;
    m=s.match(/\d{1,2}\/(\d{1,2})\/(\d{4})/);
    return m ? `${m[2]}-${String(Number(m[1])).padStart(2,"0")}` : "";
  }

  function datosDashboard(){
    if(typeof window.mv356ObtenerDatosDashboardGerencial === "function"){
      const d=window.mv356ObtenerDatosDashboardGerencial()||{};
      return {
        lista:Array.isArray(d.lista)?d.lista:[],
        periodo:d.periodo||""
      };
    }
    return {lista:[],periodo:""};
  }

  function sedeSeleccionada(){
    const dom=norm(document.getElementById("mv199FiltroSede")?.value || "");
    if(dom) return dom;
    try{
      if(typeof MV199_DASH_JEFATURA_FILTROS !== "undefined"){
        return norm(MV199_DASH_JEFATURA_FILTROS?.sede || "TODAS") || "TODAS";
      }
    }catch(_){}
    return "TODAS";
  }

  function alcance(){
    const base=datosDashboard();
    const sede=sedeSeleccionada();
    const lista=base.lista
      .filter(x=>x && x.cuadrilla)
      .filter(x=>sede==="TODAS" || norm(x.sede)===sede);
    return {lista,periodo:base.periodo,sede};
  }

  function supervisor(x){
    return x?.mv353CumplimientoDia?.supervisor || x?.supervisor || "NO REGISTRADO";
  }

  function dias(x){
    const d=x?.mv353CumplimientoDia||{};
    return {
      campo:n(d.diasCampo),
      descanso:n(d.diasDescanso),
      vacaciones:n(d.diasVacaciones),
      bolsa:n(d.diasBolsa),
      meta:n(d.metaAcumulada),
      fechaCorte:d.fechaCorte||""
    };
  }

  function winObs(x){
    const nuevo=x?.mv459Observaciones?.win;
    if(nuevo){
      return {
        cantidad:n(nuevo.cantidad),
        observado:n(nuevo.observado),
        gestion:n(nuevo.gestion),
        penalizadas:n(nuevo.penalizadas),
        penalizado:n(nuevo.penalizado),
        subsanadas:n(nuevo.subsanadas),
        subsanado:n(nuevo.subsanado)
      };
    }
    const viejo=x?.mv361ObservacionesWin||{};
    return {
      cantidad:n(viejo.total),
      observado:n(viejo.observado ?? viejo.montoTotal ?? viejo.montoPenalizado),
      gestion:n(viejo.gestion),
      penalizadas:n(viejo.penalizadas),
      penalizado:n(viejo.montoPenalizado),
      subsanadas:n(viejo.subsanadas),
      subsanado:n(viejo.montoSubsanado)
    };
  }

  function sla(x){
    const s=x?.detSla||{};
    const evaluables=n(s.evaluables);
    const cumplenBruto=n(s.cumplenBruto);
    const cumplenAjustado=n(s.cumplenAjustado);
    const bruto=Number.isFinite(Number(x?.slaBruto)) ? n(x.slaBruto) : (evaluables>0?cumplenBruto/evaluables*100:0);
    const ajustado=Number.isFinite(Number(x?.slaAjustado)) ? n(x.slaAjustado) : (evaluables>0?cumplenAjustado/evaluables*100:0);
    return {
      evaluables,
      cumplenBruto,
      cumplenAjustado,
      fueraAjustado:Math.max(0,evaluables-cumplenAjustado),
      excepcionesAplicadas:Math.max(0,cumplenAjustado-cumplenBruto),
      bruto,
      ajustado
    };
  }

  function fila(x,periodo){
    const d=dias(x);
    const e=x?.detEfectividad||{};
    const r=x?.detRecableado||{};
    const v=x?.detVtrGar||{};
    const s=sla(x);
    const w=winObs(x);
    const prod=n(x.produccion);
    const metaMensual=130;
    const cumplimiento=d.meta>0?prod/d.meta*100:0;
    return {
      periodo,
      fechaCorte:d.fechaCorte,
      sede:norm(x.sede),
      plataforma:norm(x.plataforma),
      supervisor:supervisor(x),
      cuadrilla:x.cuadrilla||"",
      produccion:red(prod,1),
      ordenes:red(x?.detProduccion?.totalOrdenes,0),
      diasCampo:d.campo,
      diasDescanso:d.descanso,
      vacaciones:d.vacaciones,
      bolsa:d.bolsa,
      metaDia:red(d.meta,1),
      cumplimientoDia:red(cumplimiento,1),
      brechaDia:red(prod-d.meta,1),
      metaMensual,
      avanceMensual:red(metaMensual>0?prod/metaMensual*100:0,1),
      efTotal:red(e.total,0),
      finalizadas:red(e.finalizadas,0),
      canceladas:red(e.canceladas,0),
      reprogramadas:red(e.reprogramadas,0),
      regestion:red(e.regestion,0),
      efectividad:red(x.efectividad,1),
      los:red(r.los ?? r.rojoAsignadas,0),
      recableados:red(r.recableados,0),
      recableado:red(x.recableado,1),
      vtrFinalizadas:red(v.finalizadas,0),
      gar:red(v.gar,0),
      vtr:red(v.vtr,0),
      incidencias:red(v.total ?? v.totalGarVtr,0),
      vtrgar:red(x.vtrgar,1),
      slaEvaluables:s.evaluables,
      slaCumplenBruto:s.cumplenBruto,
      slaBruto:red(s.bruto,1),
      slaCumplenAjustado:s.cumplenAjustado,
      slaFuera:s.fueraAjustado,
      slaExcepciones:s.excepcionesAplicadas,
      slaAjustado:red(s.ajustado,1),
      obsWin:w.cantidad,
      obsWinObservado:red(w.observado,2),
      obsWinGestion:red(w.gestion,2),
      obsWinPenalizadas:w.penalizadas,
      obsWinPenalizado:red(w.penalizado,2),
      obsWinSubsanadas:w.subsanadas,
      obsWinSubsanado:red(w.subsanado,2),
      puestoSede:n(x.puestoSede)||"",
      puestoZN:n(x.puestoRegion)||"",
      puestoPlataforma:n(x.puestoPlataforma)||"",
      puntajeRanking:red(x.puntaje,2)
    };
  }

  function consolidar(lista,periodo,sede){
    const fs=lista.map(x=>fila(x,periodo));
    const suma=campo=>fs.reduce((a,x)=>a+n(x[campo]),0);
    const cuadrillas=fs.length;
    const produccion=suma("produccion");
    const metaDia=suma("metaDia");
    const efTotal=suma("efTotal");
    const finalizadas=suma("finalizadas");
    const los=suma("los");
    const recableados=suma("recableados");
    const vtrFinalizadas=suma("vtrFinalizadas");
    const incidencias=suma("incidencias");
    const slaEvaluables=suma("slaEvaluables");
    const slaCumplenBruto=suma("slaCumplenBruto");
    const slaCumplenAjustado=suma("slaCumplenAjustado");
    const metaMensual=cuadrillas*130;
    return {
      periodo,
      sede,
      cuadrillas,
      produccion:red(produccion,1),
      metaDia:red(metaDia,1),
      cumplimientoDia:red(metaDia>0?produccion/metaDia*100:0,1),
      brechaDia:red(produccion-metaDia,1),
      metaMensual,
      avanceMensual:red(metaMensual>0?produccion/metaMensual*100:0,1),
      efTotal,
      finalizadas,
      efectividad:red(efTotal>0?finalizadas/efTotal*100:0,1),
      los,
      recableados,
      recableado:red(los>0?recableados/los*100:0,1),
      vtrFinalizadas,
      incidencias,
      vtrgar:red(vtrFinalizadas>0?incidencias/vtrFinalizadas*100:0,1),
      slaEvaluables,
      slaCumplenBruto,
      slaBruto:red(slaEvaluables>0?slaCumplenBruto/slaEvaluables*100:0,1),
      slaCumplenAjustado,
      slaFuera:Math.max(0,slaEvaluables-slaCumplenAjustado),
      slaExcepciones:Math.max(0,slaCumplenAjustado-slaCumplenBruto),
      slaAjustado:red(slaEvaluables>0?slaCumplenAjustado/slaEvaluables*100:0,1),
      obsWin:suma("obsWin"),
      obsWinObservado:red(suma("obsWinObservado"),2),
      obsWinGestion:red(suma("obsWinGestion"),2),
      obsWinPenalizadas:suma("obsWinPenalizadas"),
      obsWinPenalizado:red(suma("obsWinPenalizado"),2),
      obsWinSubsanadas:suma("obsWinSubsanadas"),
      obsWinSubsanado:red(suma("obsWinSubsanado"),2)
    };
  }

  function cargarScript(url){
    return new Promise((resolve,reject)=>{
      const existente=Array.from(document.scripts).find(s=>s.src===url);
      if(existente){
        if(window.XLSX?.utils) return resolve();
        existente.addEventListener("load",resolve,{once:true});
        existente.addEventListener("error",()=>reject(new Error("No se pudo cargar Excel.")),{once:true});
        return;
      }
      const s=document.createElement("script");
      s.src=url;
      s.async=true;
      s.crossOrigin="anonymous";
      s.onload=resolve;
      s.onerror=()=>{s.remove();reject(new Error("No se pudo cargar el generador Excel."));};
      document.head.appendChild(s);
    });
  }

  async function asegurarXlsx(){
    if(window.XLSX?.utils) return;
    if(promesaXlsx) return promesaXlsx;
    promesaXlsx=(async()=>{
      let ultimo=null;
      for(const url of XLSX_URLS){
        try{
          await cargarScript(url);
          if(window.XLSX?.utils) return;
        }catch(e){ultimo=e;}
      }
      throw ultimo||new Error("No se pudo cargar el generador Excel.");
    })().catch(e=>{promesaXlsx=null;throw e;});
    return promesaXlsx;
  }

  function overlay(texto){
    let o=document.getElementById("mv355Overlay");
    if(!o){
      o=document.createElement("div");
      o.id="mv355Overlay";
      Object.assign(o.style,{position:"fixed",inset:"0",zIndex:"10050",display:"none",alignItems:"center",justifyContent:"center",background:"rgba(2,8,23,.72)"});
      o.innerHTML='<div style="width:min(360px,88vw);background:#10213b;color:#fff;padding:22px;border-radius:18px;text-align:center;box-shadow:0 18px 45px rgba(0,0,0,.45);"><b id="mv355OverlayTexto">Preparando Excel...</b></div>';
      document.body.appendChild(o);
    }
    const t=document.getElementById("mv355OverlayTexto");
    if(t) t.textContent=texto||"Preparando Excel...";
    o.style.display="flex";
  }

  function cerrarOverlay(){
    const o=document.getElementById("mv355Overlay");
    if(o) o.style.display="none";
  }

  function mensaje(texto,error=false){
    const el=document.getElementById("mv355Mensaje");
    if(!el) return;
    el.textContent=texto||"";
    el.style.color=error?"#fecaca":"#bbf7d0";
  }

  function sheet(filas,anchos,formatos){
    const XLSX=window.XLSX;
    const ws=XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"]=anchos.map(w=>({wch:w}));
    if(filas.length && filas[0]?.length){
      ws["!autofilter"]={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:filas.length-1,c:filas[0].length-1}})};
    }
    if(formatos){
      for(let r=1;r<filas.length;r++){
        Object.entries(formatos).forEach(([c,z])=>{
          const a=XLSX.utils.encode_cell({r,c:Number(c)});
          if(ws[a]) ws[a].z=z;
        });
      }
    }
    return ws;
  }

  async function cargarObservaciones(periodo,sede){
    const incluir=!!document.getElementById("mv355IncluirObservaciones")?.checked;
    if(!incluir) return [];
    const base=window.MI_VISUAL_API_URL || "";
    if(!base) return [];
    try{
      const res=await fetch(base,{
        method:"POST",
        body:JSON.stringify({accion:"listarObservaciones",usuario:localStorage.getItem("usuario")||""})
      });
      const data=await res.json();
      return (data.observaciones||[]).filter(o=>{
        if(periodo && periodoDeFecha(o.fechaRegistro)!==periodo) return false;
        if(sede!=="TODAS" && norm(o.sede)!==sede) return false;
        return true;
      });
    }catch(e){
      console.warn("V475: detalle de observaciones no disponible",e);
      return [];
    }
  }

  function detalleRows(lista,periodo){
    const h=[
      "PERÍODO","FECHA CORTE","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA",
      "PRODUCCIÓN PTS","ÓRDENES PRODUCCIÓN","DÍAS EN CAMPO","DÍAS DESCANSO","VACACIONES","CAMPO BOLSA",
      "META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA PTS","META MENSUAL","AVANCE MENSUAL %",
      "TOTAL ÓRDENES EFECTIVIDAD","FINALIZADAS","CANCELADAS","REPROGRAMADAS","REGESTIÓN","EFECTIVIDAD %",
      "LOS / ÓRDENES VT","RECABLEADOS","RECABLEADO %",
      "FINALIZADAS VTR/GAR","GAR","VTR","INCIDENCIAS VTR/GAR","VTR/GAR %",
      "SLA EVALUABLES","SLA CUMPLEN BRUTO","SLA BRUTO %","SLA CUMPLEN AJUSTADO","FUERA SLA AJUSTADO","EXCEPCIONES APLICADAS","SLA AJUSTADO %",
      "OBS WIN CANTIDAD","WIN OBSERVADO ACUMULADO","WIN EN GESTIÓN","OBS WIN PENALIZADAS","WIN PENALIZADO","OBS WIN SUBSANADAS","WIN SUBSANADO",
      "PUESTO SEDE","PUESTO ZONA NORTE","PUESTO PLATAFORMA","PUNTAJE RANKING"
    ];
    const rows=[h];
    lista.slice().sort((a,b)=>norm(a.sede).localeCompare(norm(b.sede))||String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true})).forEach(x=>{
      const f=fila(x,periodo);
      rows.push([
        f.periodo,fechaVisible(f.fechaCorte),f.sede,f.plataforma,f.supervisor,f.cuadrilla,
        f.produccion,f.ordenes,f.diasCampo,f.diasDescanso,f.vacaciones,f.bolsa,
        f.metaDia,f.cumplimientoDia,f.brechaDia,f.metaMensual,f.avanceMensual,
        f.efTotal,f.finalizadas,f.canceladas,f.reprogramadas,f.regestion,f.efectividad,
        f.los,f.recableados,f.recableado,
        f.vtrFinalizadas,f.gar,f.vtr,f.incidencias,f.vtrgar,
        f.slaEvaluables,f.slaCumplenBruto,f.slaBruto,f.slaCumplenAjustado,f.slaFuera,f.slaExcepciones,f.slaAjustado,
        f.obsWin,f.obsWinObservado,f.obsWinGestion,f.obsWinPenalizadas,f.obsWinPenalizado,f.obsWinSubsanadas,f.obsWinSubsanado,
        f.puestoSede,f.puestoZN,f.puestoPlataforma,f.puntajeRanking
      ]);
    });
    return rows;
  }

  function resumenRows(lista,periodo){
    const sedes=Array.from(new Set(lista.map(x=>norm(x.sede)).filter(Boolean))).sort((a,b)=>{
      const ord={CHICLAYO:1,PIURA:2,TRUJILLO:3};
      return (ord[a]||99)-(ord[b]||99)||a.localeCompare(b);
    });
    const rows=[[
      "PERÍODO","SEDE","CUADRILLAS","PRODUCCIÓN PTS","META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA PTS","META MENSUAL","AVANCE MENSUAL %",
      "TOTAL ÓRDENES","FINALIZADAS","EFECTIVIDAD %","LOS / ÓRDENES VT","RECABLEADOS","RECABLEADO %","FINALIZADAS VTR/GAR","INCIDENCIAS VTR/GAR","VTR/GAR %",
      "SLA EVALUABLES","SLA CUMPLEN BRUTO","SLA BRUTO %","SLA CUMPLEN AJUSTADO","FUERA SLA AJUSTADO","EXCEPCIONES APLICADAS","SLA AJUSTADO %",
      "OBS WIN CANTIDAD","WIN OBSERVADO ACUMULADO","WIN EN GESTIÓN","OBS WIN PENALIZADAS","WIN PENALIZADO","OBS WIN SUBSANADAS","WIN SUBSANADO"
    ]];
    sedes.forEach(s=>{
      const r=consolidar(lista.filter(x=>norm(x.sede)===s),periodo,s);
      rows.push([
        r.periodo,r.sede,r.cuadrillas,r.produccion,r.metaDia,r.cumplimientoDia,r.brechaDia,r.metaMensual,r.avanceMensual,
        r.efTotal,r.finalizadas,r.efectividad,r.los,r.recableados,r.recableado,r.vtrFinalizadas,r.incidencias,r.vtrgar,
        r.slaEvaluables,r.slaCumplenBruto,r.slaBruto,r.slaCumplenAjustado,r.slaFuera,r.slaExcepciones,r.slaAjustado,
        r.obsWin,r.obsWinObservado,r.obsWinGestion,r.obsWinPenalizadas,r.obsWinPenalizado,r.obsWinSubsanadas,r.obsWinSubsanado
      ]);
    });
    if(sedes.length>1){
      const r=consolidar(lista,periodo,"ZONA NORTE");
      rows.push([
        r.periodo,r.sede,r.cuadrillas,r.produccion,r.metaDia,r.cumplimientoDia,r.brechaDia,r.metaMensual,r.avanceMensual,
        r.efTotal,r.finalizadas,r.efectividad,r.los,r.recableados,r.recableado,r.vtrFinalizadas,r.incidencias,r.vtrgar,
        r.slaEvaluables,r.slaCumplenBruto,r.slaBruto,r.slaCumplenAjustado,r.slaFuera,r.slaExcepciones,r.slaAjustado,
        r.obsWin,r.obsWinObservado,r.obsWinGestion,r.obsWinPenalizadas,r.obsWinPenalizado,r.obsWinSubsanadas,r.obsWinSubsanado
      ]);
    }
    return rows;
  }

  function rankingRows(lista,periodo){
    const rows=[["PERÍODO","SEDE","PLATAFORMA","CUADRILLA","PUESTO ZONA NORTE","PUESTO SEDE","PUESTO PLATAFORMA","PUNTAJE RANKING","OBS WIN CANTIDAD","WIN PENALIZADO"]];
    lista.slice().sort((a,b)=>(n(a.puestoRegion)||999)-(n(b.puestoRegion)||999)).forEach(x=>{
      const f=fila(x,periodo);
      rows.push([f.periodo,f.sede,f.plataforma,f.cuadrilla,f.puestoZN,f.puestoSede,f.puestoPlataforma,f.puntajeRanking,f.obsWin,f.obsWinPenalizado]);
    });
    return rows;
  }

  function produccionRows(lista){
    const rows=[["SEDE","CUADRILLA","PLATAFORMA","TIPO DE TRABAJO","CANTIDAD","PUNTAJE UNITARIO","PUNTOS"]];
    lista.forEach(x=>{
      const tipos=x?.detProduccion?.tipos||{};
      Object.keys(tipos).sort().forEach(tipo=>{
        const t=tipos[tipo]||{};
        rows.push([norm(x.sede),x.cuadrilla||"",norm(x.plataforma),tipo,red(t.cantidad,0),red(t.puntaje,1),red(t.puntos,1)]);
      });
    });
    return rows;
  }

  function observacionesRows(lista,periodo){
    const rows=[["FECHA","PERÍODO","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA","FUENTE","CÓDIGO","TIPO","DESCRIPCIÓN","ESTADO","MONTO","PLAZO"]];
    lista.forEach(o=>rows.push([
      fechaVisible(o.fechaRegistro),periodo,norm(o.sede),norm(o.plataforma),o.supervisor||"",o.cuadrilla||"",o.fuente||"",o.codigo||"",o.tipoObservacion||"",o.descripcion||"",o.estado||"",n(o.monto),o.plazo||""
    ]));
    return rows;
  }

  async function generar(){
    const a=alcance();
    if(!a.lista.length){
      throw new Error(a.sede==="TODAS" ? "No hay cuadrillas disponibles en el período seleccionado." : `No hay cuadrillas de ${a.sede} en el período seleccionado.`);
    }

    overlay("Preparando Excel con los datos visibles del período...");
    mensaje("");
    try{
      const incluirObs=!!document.getElementById("mv355IncluirObservaciones")?.checked;
      const incluirProd=!!document.getElementById("mv355IncluirProduccion")?.checked;
      const observacionesPromise=cargarObservaciones(a.periodo,a.sede);

      await asegurarXlsx();
      const obs=await observacionesPromise;
      const XLSX=window.XLSX;
      const wb=XLSX.utils.book_new();
      wb.Props={
        Title:`Dashboard MI VISUAL - ${periodoNombre(a.periodo)} - ${a.sede==="TODAS"?"ZONA NORTE":a.sede}`,
        Subject:"Indicadores operativos por cuadrilla",
        Author:localStorage.getItem("nombresApellidos")||localStorage.getItem("usuario")||"MI VISUAL",
        Company:"Visual Connections SAC",
        CreatedDate:new Date()
      };

      const resumen=resumenRows(a.lista,a.periodo);
      XLSX.utils.book_append_sheet(wb,sheet(resumen,[13,16,12,16,15,20,13,15,18,15,13,15,16,13,15,18,18,14,15,18,14,20,18,20,15,16,20,17,20,17,20,17],{3:'0.0',4:'0.0',5:'0.0"%"',6:'0.0',7:'0.0',8:'0.0"%"',11:'0.0"%"',14:'0.0"%"',17:'0.0"%"',20:'0.0"%"',24:'0.0"%"',26:'"S/ "0.00',27:'"S/ "0.00',29:'"S/ "0.00',31:'"S/ "0.00'}),"RESUMEN_SEDES");

      const detalle=detalleRows(a.lista,a.periodo);
      XLSX.utils.book_append_sheet(wb,sheet(detalle,[12,13,14,18,26,42,15,16,13,14,12,13,14,20,13,14,18,19,13,13,15,12,15,16,13,15,18,9,9,18,14,15,18,14,20,18,20,15,16,21,18,20,17,20,17,13,17,18,16],{6:'0.0',12:'0.0',13:'0.0"%"',14:'0.0',15:'0.0',16:'0.0"%"',22:'0.0"%"',25:'0.0"%"',30:'0.0"%"',33:'0.0"%"',37:'0.0"%"',39:'"S/ "0.00',40:'"S/ "0.00',42:'"S/ "0.00',44:'"S/ "0.00',48:'0.00'}),"DETALLE_CUADRILLAS");

      const ranking=rankingRows(a.lista,a.periodo);
      XLSX.utils.book_append_sheet(wb,sheet(ranking,[12,14,18,42,19,13,18,16,16,17],{7:'0.00',9:'"S/ "0.00'}),"RANKING");

      if(incluirProd){
        const prod=produccionRows(a.lista);
        XLSX.utils.book_append_sheet(wb,sheet(prod,[14,42,18,56,12,18,12],{5:'0.0',6:'0.0'}),"PRODUCCION_DETALLE");
      }

      if(incluirObs){
        const obsRows=observacionesRows(obs,a.periodo);
        XLSX.utils.book_append_sheet(wb,sheet(obsRows,[14,12,14,18,26,42,14,17,30,60,16,14,18],{11:'"S/ "0.00'}),"OBSERVACIONES");
      }

      const metodologia=[
        ["INDICADOR","CRITERIO DEL EXCEL"],
        ["Alcance",`Período ${periodoNombre(a.periodo)} · ${a.sede==="TODAS"?"Todas las sedes":a.sede}`],
        ["Filtro de sede","El Excel respeta la sede seleccionada en el Dashboard."],
        ["Filtro Indicador / Cuadrilla","No recortan el Excel. DETALLE_CUADRILLAS siempre contiene todas las cuadrillas de la sede seleccionada."],
        ["Producción","Datos ya cargados en el Dashboard. Meta mensual: 130 puntos por cuadrilla."],
        ["Cumplimiento al día","Producción acumulada / meta acumulada de días en campo."],
        ["Efectividad","Finalizadas / total de órdenes."],
        ["Recableado","Recableados / LOS u órdenes VT."],
        ["VTR/GAR","Incidencias GAR+VTR / finalizadas."],
        ["SLA","Se muestran bruto y ajustado, usando los contadores ya cargados en el Dashboard."],
        ["Observaciones Dashboard","Solo WIN: cantidad, observado acumulado, en gestión, penalizado y subsanado. VISUAL no se mezcla en este Excel."],
        ["Ranking","Puntaje y posiciones ya calculados por MI VISUAL; el Excel no los recalcula."],
        ["Optimización","No se vuelven a consultar Producción, Efectividad, Recableado, VTR/GAR, SLA ni Ranking al generar el Excel."],
        ["Detalle de observaciones","Solo se consulta si la casilla correspondiente está activada."]
      ];
      XLSX.utils.book_append_sheet(wb,sheet(metodologia,[34,105]),"METODOLOGIA");

      const alcanceNombre=a.sede==="TODAS"?"ZONA_NORTE":a.sede.replace(/\s+/g,"_");
      const nombre=`Dashboard_MI_VISUAL_${a.periodo.replace("-","_")}_${alcanceNombre}.xlsx`;
      XLSX.writeFile(wb,nombre,{compression:true,bookType:"xlsx"});
      mensaje(`Excel generado: ${periodoNombre(a.periodo)} · ${a.sede==="TODAS"?"Todas las sedes":a.sede}.`);
    }finally{
      cerrarOverlay();
    }
  }

  const abrirBase=window.mv355AbrirInformeGerencial;
  if(typeof abrirBase==="function"){
    window.mv355AbrirInformeGerencial=function(){
      const r=abrirBase.apply(this,arguments);
      setTimeout(()=>{
        const a=alcance();
        const caja=document.querySelector("#mv355Modal .mv355-resumen");
        if(caja){
          caja.innerHTML=`<b>Excel por período y sede</b><span>Excel: ${periodoNombre(a.periodo)} · ${a.sede==="TODAS"?"Todas las sedes":a.sede}. Incluye todas las cuadrillas e indicadores de ese alcance. El PDF conserva su funcionamiento actual.</span>`;
        }
      },0);
      return r;
    };
  }

  window.mv355GenerarInformeExcel=async function(){
    try{
      await generar();
    }catch(e){
      console.error("V475 Excel Dashboard",e);
      cerrarOverlay();
      mensaje(e.message||"No se pudo generar el Excel.",true);
    }
  };

  window.MV475_INFORME_EXCEL_OK=true;
  console.log("MI VISUAL V475: Excel del Dashboard por período y sede habilitado.");
})();