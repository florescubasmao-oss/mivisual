/* ============================================================
   MI VISUAL V365 - Consolidación real de Dashboard
   - Jefatura/Gerencia: suma Zona Norte, todas las sedes y cuadrillas.
   - Porcentajes calculados desde numeradores y denominadores consolidados.
   - SLA ajustado incorporado como sexta meta.
============================================================ */
(function(){
  "use strict";
  if(window.MV365_DASH_CONSOLIDADO_OK) return;

  function n(v){
    const x=Number(v);
    return Number.isFinite(x)?x:0;
  }

  function pct(v){
    return `${n(v).toFixed(2)}%`;
  }

  function resumen(lista){
    const items=Array.isArray(lista)?lista:[];
    const cuadrillas=items.length;
    const produccion=items.reduce((s,x)=>s+n(x.produccion),0);
    const metaProduccion=cuadrillas*(Number(window.META_PRODUCCION_CUADRILLA)||130);

    let efFinalizadas=0,efTotal=0;
    let recableados=0,ordenesVt=0;
    let incidencias=0,finalizadasVtr=0;
    let montoObs=0,observaciones=0;
    let slaEvaluables=0,slaCumplenBruto=0,slaCumplenAjustado=0;

    items.forEach(x=>{
      const e=x.detEfectividad||{};
      efFinalizadas+=n(e.finalizadas);
      efTotal+=n(e.total);

      const r=x.detRecableado||{};
      recableados+=n(r.recableados);
      ordenesVt+=n(r.los ?? r.rojoAsignadas);

      const v=x.detVtrGar||{};
      incidencias+=n(v.total ?? v.totalGarVtr);
      finalizadasVtr+=n(v.finalizadas);

      const o=x.detObservaciones||{};
      observaciones+=n(o.total ?? x.observaciones);
      montoObs+=n(o.montoPendiente ?? o.montoAfectado ?? x.montoAfectadoObs);

      const s=x.detSla||{};
      slaEvaluables+=n(s.evaluables);
      slaCumplenBruto+=n(s.cumplenBruto);
      slaCumplenAjustado+=n(s.cumplenAjustado);
    });

    const promedio=campo=>cuadrillas
      ? items.reduce((s,x)=>s+n(x[campo]),0)/cuadrillas
      : 0;

    const efectividad=efTotal>0 ? efFinalizadas/efTotal*100 : promedio("efectividad");
    const recableado=ordenesVt>0 ? recableados/ordenesVt*100 : promedio("recableado");
    const vtrgar=finalizadasVtr>0 ? incidencias/finalizadasVtr*100 : promedio("vtrgar");
    const slaBruto=slaEvaluables>0 ? slaCumplenBruto/slaEvaluables*100 : 0;
    const sla=slaEvaluables>0 ? slaCumplenAjustado/slaEvaluables*100 : 0;

    const metaProd=Number(window.META_PRODUCCION_CUADRILLA)||130;
    const metaEfe=Number(window.META_EFECTIVIDAD)||70;
    const metaRec=Number(window.META_RECABLEADO)||42;
    const metaVtr=Number(window.META_VTRGAR)||3;
    const metaObs=Number(window.META_OBSERVACIONES)||200;

    const ok=[
      produccion>=cuadrillas*metaProd,
      efectividad>=metaEfe,
      recableado<=metaRec,
      vtrgar<=metaVtr,
      montoObs<=metaObs,
      slaEvaluables>0 && sla>=90
    ].filter(Boolean).length;

    return {
      cuadrillas,produccion,metaProduccion,
      efectividad,efFinalizadas,efTotal,
      recableado,recableados,ordenesVt,
      vtrgar,incidencias,finalizadasVtr,
      obs:montoObs,observaciones,
      sla,slaBruto,slaEvaluables,slaCumplenAjustado,slaCumplenBruto,
      ok,cumplimiento:Math.round(ok/6*100)
    };
  }

  function sedes(lista){
    return Array.from(new Set(
      (lista||[]).map(x=>mv4Norm(x.sede)).filter(Boolean)
    ));
  }

  window.mv4Resumen=resumen;

  window.mv4DashboardKpis=function(lista){
    const r=resumen(lista);
    const prodPct=r.metaProduccion>0?r.produccion/r.metaProduccion*100:0;
    const slaEstado=typeof mv363SemaforoSla==="function"
      ? mv363SemaforoSla(r.sla)
      : {icono:r.sla>=90?"🟢":"🔴"};

    return `
      <div class="mv4-general-card">
        <div class="mv4-general-title">📋 CUMPLIMIENTO GENERAL</div>
        <div class="mv4-general-value">${r.cumplimiento}%</div>
        <div class="mv4-progress"><span style="width:${r.cumplimiento}%"></span></div>
        <div class="mv4-general-sub">${r.ok} de 6 metas cumplidas · ${r.cuadrillas} cuadrillas</div>
      </div>

      ${typeof mv353TarjetaConsolidada==="function"
        ? mv353TarjetaConsolidada(lista,"Cumplimiento productivo al día")
        : ""}

      ${mv4KpiCard({
        icono:"📈",titulo:"Producción",
        valor:`${r.produccion.toFixed(1)} / ${r.metaProduccion.toFixed(1)} pts`,
        meta:`${(Number(window.META_PRODUCCION_CUADRILLA)||130)} pts × ${r.cuadrillas} cuadrillas`,
        estado:mv4Estado("mayor",r.produccion,r.metaProduccion),
        detalle:mv4DetalleKpi(lista,"produccion")
      })}

      ${mv4KpiCard({
        icono:"🎯",titulo:"Efectividad",
        valor:pct(r.efectividad),
        meta:`≥ ${Number(window.META_EFECTIVIDAD)||70}% · ${r.efFinalizadas} finalizadas / ${r.efTotal} órdenes`,
        estado:mv4Estado("mayor",r.efectividad,Number(window.META_EFECTIVIDAD)||70),
        detalle:mv4DetalleKpi(lista,"efectividad")
      })}

      ${mv4KpiCard({
        icono:"🔧",titulo:"Recableado",
        valor:pct(r.recableado),
        meta:`≤ ${Number(window.META_RECABLEADO)||42}% · ${r.recableados} / ${r.ordenesVt} órdenes VT`,
        estado:mv4Estado("menor",r.recableado,Number(window.META_RECABLEADO)||42),
        detalle:mv4DetalleKpi(lista,"recableado")
      })}

      ${mv4KpiCard({
        icono:"📡",titulo:"VTR / GAR",
        valor:pct(r.vtrgar),
        meta:`≤ ${Number(window.META_VTRGAR)||3}% · ${r.incidencias} incidencias / ${r.finalizadasVtr} finalizadas`,
        estado:mv4Estado("menor",r.vtrgar,Number(window.META_VTRGAR)||3),
        detalle:mv4DetalleKpi(lista,"vtrgar")
      })}

      ${mv4KpiCard({
        icono:"🚨",titulo:"Observaciones",
        valor:mv4Money(r.obs),
        meta:`${r.observaciones} registros · referencia ≤ S/ ${Number(window.META_OBSERVACIONES)||200}`,
        estado:mv4Estado("menor",r.obs,Number(window.META_OBSERVACIONES)||200),
        detalle:mv4DetalleKpi(lista,"obs")
      })}

      ${mv4KpiCard({
        icono:"⏱️",titulo:"Tiempo de Gestión - SLA",
        valor:`${r.sla.toFixed(1)}%`,
        meta:`≥ 90% · ${r.slaCumplenAjustado} de ${r.slaEvaluables} códigos`,
        estado:slaEstado.icono,
        detalle:mv4DetalleKpi(lista,"sla")
      })}
    `;
  };

  window.mv591ResumenEjecutivoZona=function(lista){
    const r=resumen(lista);
    const prodPct=r.metaProduccion>0?r.produccion/r.metaProduccion*100:0;
    const d=typeof mv353ResumenLista==="function"
      ? mv353ResumenLista(lista)
      : {porcentaje:null,puntos:0,meta:0};
    const slaEstado=typeof mv363SemaforoSla==="function"
      ? mv363SemaforoSla(r.sla)
      : {icono:r.sla>=90?"🟢":"🔴"};

    return `
      <div class="mv4-general-card" style="margin-top:14px;">
        <div class="mv4-general-title">
          📊 RESUMEN EJECUTIVO ZONA NORTE · ${sedes(lista).length} sedes · ${r.cuadrillas} cuadrillas
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px;">
          ${mv591MiniResumenCard("📈","Producción",`${r.produccion.toFixed(1)} pts`,`${prodPct.toFixed(1)}% de ${r.metaProduccion.toFixed(1)} pts`,mv4Estado("mayor",r.produccion,r.metaProduccion))}
          ${mv591MiniResumenCard("📅","Cumplimiento al día",d.porcentaje===null?"No evaluado":`${d.porcentaje.toFixed(1)}%`,`${n(d.puntos).toFixed(1)} / ${n(d.meta).toFixed(1)} pts`,d.porcentaje!==null&&d.porcentaje>=100?"🟢":(d.porcentaje!==null&&d.porcentaje>=85?"🟡":"🔴"))}
          ${mv591MiniResumenCard("🎯","Efectividad",pct(r.efectividad),`${r.efFinalizadas} finalizadas / ${r.efTotal} órdenes`,mv4Estado("mayor",r.efectividad,Number(window.META_EFECTIVIDAD)||70))}
          ${mv591MiniResumenCard("🔧","Recableado",pct(r.recableado),`${r.recableados} / ${r.ordenesVt} órdenes VT`,mv4Estado("menor",r.recableado,Number(window.META_RECABLEADO)||42))}
          ${mv591MiniResumenCard("📡","VTR/GAR",pct(r.vtrgar),`${r.incidencias} / ${r.finalizadasVtr} finalizadas`,mv4Estado("menor",r.vtrgar,Number(window.META_VTRGAR)||3))}
          ${mv591MiniResumenCard("🚨","Observaciones",mv4Money(r.obs),`${r.observaciones} registros`,mv4Estado("menor",r.obs,Number(window.META_OBSERVACIONES)||200))}
          ${mv591MiniResumenCard("⏱️","Tiempo de Gestión - SLA",`${r.sla.toFixed(1)}%`,`Bruto ${r.slaBruto.toFixed(1)}% · ${r.slaCumplenAjustado}/${r.slaEvaluables} códigos`,slaEstado.icono)}
          ${mv591MiniResumenCard("🏆","Metas",`${r.ok} / 6`,`${r.cumplimiento}% cumplimiento`,r.cumplimiento>=80?"🟢":(r.cumplimiento>=60?"🟡":"🔴"))}
        </div>
      </div>`;
  };

  window.mv4SedeCard=function(sede,lista){
    const r=resumen(lista);
    const id="sede_"+String(sede).replace(/\W/g,"_")+"_"+Math.random().toString(36).slice(2);
    return `
      <div class="mv4-sede-card">
        <div class="mv4-kpi-head">
          <div><b>🏢 ${sede}</b><small style="display:block;color:#9fb7d8;margin-top:3px">${r.cuadrillas} cuadrillas</small></div>
          <div class="mv4-kpi-status">${r.cumplimiento>=80?"🟢":(r.cumplimiento>=60?"🟡":"🔴")}</div>
        </div>
        <div class="mv4-sede-grid">
          <span>Prod: <b>${r.produccion.toFixed(1)} / ${r.metaProduccion.toFixed(1)}</b></span>
          <span>Efect: <b>${pct(r.efectividad)}</b></span>
          <span>Rec: <b>${pct(r.recableado)}</b></span>
          <span>VTR/GAR: <b>${pct(r.vtrgar)}</b></span>
          <span>Obs: <b>${mv4Money(r.obs)}</b></span>
          <span>SLA: <b>${r.sla.toFixed(1)}%</b></span>
          <span>Metas: <b>${r.ok}/6</b></span>
        </div>
        <button class="mv4-link-btn" onclick="toggleDetalle('${id}', this)">▼ Ver indicadores y cuadrillas</button>
        <div id="${id}" style="display:none;">${mv4DashboardKpis(lista)}</div>
      </div>`;
  };

  const resumenCuadrillaAnterior=window.mv198ResumenCuadrilla;
  if(typeof resumenCuadrillaAnterior==="function"){
    window.mv198ResumenCuadrilla=function(x){
      let html=resumenCuadrillaAnterior(x);
      html=html
        .replace(/(\d+)\s*\/\s*5/g,"$1 / 6")
        .replace(/de 5 metas/g,"de 6 metas");
      return html;
    };
  }

  const opcionesAnterior=window.mv199OpcionesIndicador;
  window.mv199OpcionesIndicador=function(seleccionado){
    const opciones=[
      ["RESUMEN","RESUMEN GENERAL"],
      ["TRABAJOS_DIARIOS","TRABAJOS DIARIOS"],
      ["PRODUCCION","PRODUCCIÓN"],
      ["EFECTIVIDAD","EFECTIVIDAD"],
      ["RECABLEADO","% RECABLEADO"],
      ["VTRGAR","% VTR/GAR"],
      ["SLA","TIEMPO DE GESTIÓN - SLA"],
      ["OBSERVACIONES","OBSERVACIONES"],
      ["METAS","METAS Y CUMPLIMIENTO"],
      ["RANKING","RANKING / POSICIÓN"]
    ];
    return opciones.map(([valor,etiqueta])=>
      `<option value="${valor}" ${valor===seleccionado?"selected":""}>${etiqueta}</option>`
    ).join("");
  };

  const configAnterior=window.mv199ConfigIndicador;
  window.mv199ConfigIndicador=function(indicador){
    if(indicador==="SLA"){
      return {
        titulo:"Tiempo de Gestión - SLA",
        icono:"⏱️",
        campo:"slaAjustado",
        orden:"DESC",
        valor:x=>`${n(x.slaAjustado).toFixed(1)}%`,
        detalle:x=>`Bruto ${n(x.slaBruto).toFixed(1)}% · ${n(x.detSla?.cumplenAjustado)}/${n(x.detSla?.evaluables)} códigos`
      };
    }
    const cfg=typeof configAnterior==="function"?configAnterior(indicador):null;
    if(cfg && indicador==="METAS"){
      cfg.valor=x=>`${resumen([x]).cumplimiento}%`;
      cfg.detalle=x=>`${resumen([x]).ok} de 6 metas cumplidas`;
    }
    return cfg;
  };

  window.MV365_DASH_CONSOLIDADO_OK=true;
  console.log("MI VISUAL V365: Dashboard consolidado Zona Norte habilitado.");
})();