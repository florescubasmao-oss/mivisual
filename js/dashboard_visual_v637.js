/* V637 Dashboard Visual: capa presentacional exclusivamente.
   Conserva tabla y datos originales. No realiza fetch, no muta lista/filtros/cache.
   La lista y el indicador los proporciona el renderer existente. */
(function(){
  "use strict";
  if(window.MV637_DASHBOARD_VISUAL_OK)return;
  if(typeof window.mv199ListadoIndicador!=="function" || typeof window.mv199ConfigIndicador!=="function")return;

  const base=window.mv199ListadoIndicador;
  const indicadores={
    PRODUCCION:{campo:"produccion",unidad:"pts",decimales:1},
    CUMPLIMIENTO_DIA:{extra:x=>{const m=Number(x?.mv353CumplimientoDia?.metaAcumulada)||0;return m>0?(Number(x.produccion)||0)/m*100:null;},unidad:"%",decimales:1},
    EFECTIVIDAD:{campo:"efectividad",unidad:"%",decimales:1},
    RECABLEADO:{campo:"recableado",unidad:"%",decimales:1},
    VTRGAR:{campo:"vtrgar",unidad:"%",decimales:1},
    OBSERVACIONES:{campo:"montoAfectadoObs",unidad:"S/",decimales:2},
    METAS:{extra:x=>{const v=window.mv199MetasCuadrilla?.(x);return Number(v?.cumplimiento);},unidad:"%",decimales:1},
    RANKING:{campo:"puestoRegion",unidad:"puesto",decimales:0}
  };
  function h(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
  function grafica(lista,indicador){
    const regla=indicadores[indicador];
    if(!regla||!Array.isArray(lista)||!lista.length)return "";
    const items=lista.map(x=>{
      let v=regla.extra?regla.extra(x):Number(x?.[regla.campo]);
      if(v===null || v===undefined || (!regla.extra && (x?.[regla.campo]===null || x?.[regla.campo]===undefined || x?.[regla.campo]===""))) v=NaN;
      if(regla.unidad==="%" && Number.isFinite(v) && Math.abs(v)<=1 && ["EFECTIVIDAD","RECABLEADO","VTRGAR"].includes(indicador)) v*=100;
      return {nombre:String(x?.cuadrilla||""),v};
    }).filter(x=>Number.isFinite(x.v)&&(indicador!=="RANKING"||x.v>0));
    if(!items.length)return "";
    const menorMejor=["RECABLEADO","VTRGAR","OBSERVACIONES","RANKING"].includes(indicador);
    items.sort((a,b)=>menorMejor?a.v-b.v:b.v-a.v);
    const max=Math.max(...items.map(x=>x.v),1);
    return '<details class="mv637-grafica" style="margin:12px 0;background:#102844;border:1px solid #315577;border-radius:16px;padding:14px;color:#fff">'+
      '<summary style="cursor:pointer;font-weight:850">📊 Ver barras comparativas · '+items.length+' cuadrillas (sin ocultar tabla)</summary>'+
      '<p style="font-size:11px;color:#aac4df">Valores del filtro actual; '+(menorMejor?'orden ascendente':'orden descendente')+'. La tabla original permanece debajo.</p>'+
      '<div style="display:grid;gap:10px;max-height:390px;overflow:auto">'+items.map(x=>{
        const width=Math.max(0,Math.min(100,(x.v/max)*100));
        const txt=x.v.toLocaleString("es-PE",{maximumFractionDigits:regla.decimales,minimumFractionDigits:regla.decimales});
        return '<div><div style="display:flex;gap:12px;justify-content:space-between;font-size:11px"><span style="overflow-wrap:anywhere">'+h(x.nombre)+'</span><strong>'+h(regla.unidad==="S/"?"S/ "+txt:txt+" "+regla.unidad)+'</strong></div>'+
          '<div style="margin-top:4px;height:11px;background:#1d3555;border-radius:9px;overflow:hidden"><div style="height:100%;width:'+width.toFixed(2)+'%;background:#3b82f6;border-radius:9px"></div></div></div>';
      }).join("")+'</div></details>';
  }
  window.mv199ListadoIndicador=function(lista,indicador,sede,abrir){
    const original=base.apply(this,arguments);
    try{return grafica(lista,indicador)+original;}catch(error){console.warn("V637 gráfico omitido; tabla original intacta",error);return original;}
  };
  window.MV637_DASHBOARD_VISUAL_OK=true;
})();

/* V637.2: resúmenes, ficha de cuadrilla y estados diarios: solo presentación. */
(function(){
  "use strict";
  if(window.MV637_COMPLEMENTOS_OK)return;
  function num(v){return v===null||v===undefined||v===""?null:(Number.isFinite(Number(v))?Number(v):null);}
  function pct(v){const n=num(v);return n===null?null:Math.abs(n)<=1?n*100:n;}
  function safe(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
  function barra(nombre,v,max,unidad,color){
    if(v===null)return "";
    const pct=Math.max(0,Math.min(100,max>0?v/max*100:0));
    return '<div style="margin:9px 0"><div style="display:flex;justify-content:space-between;gap:12px;font-size:12px"><span>'+safe(nombre)+'</span><b>'+safe(v.toLocaleString("es-PE",{maximumFractionDigits:1}))+' '+safe(unidad)+'</b></div><div style="height:10px;background:#223b5c;border-radius:8px;overflow:hidden;margin-top:5px"><span style="display:block;height:100%;width:'+pct.toFixed(2)+'%;background:'+color+';border-radius:8px"></span></div></div>';
  }
  function panel(titulo,cuerpo){
    return cuerpo?'<details class="mv637-vista" style="margin:12px 0;padding:14px;border-radius:16px;background:#102844;border:1px solid #315577;color:#fff"><summary style="font-weight:850;cursor:pointer">'+safe(titulo)+'</summary><div style="padding-top:9px">'+cuerpo+'</div></details>':"";
  }
  // Siempre se añade a la salida del generador original, sin interferir con los KPI existentes.
  if(typeof window.mv4DashboardKpis==="function"){
    const original=window.mv4DashboardKpis;
    window.mv4DashboardKpis=function(lista){
      const html=original.apply(this,arguments);
      try{
        if(!Array.isArray(lista)||!lista.length||typeof window.mv4Resumen!=="function")return html;
        const r=window.mv4Resumen(lista),produccion=num(r.produccion),meta=num(r.metaProduccion);
        const actual=produccion===null||meta===null?null:produccion;
        const cuerpo=barra("Producción",actual,Math.max(1,meta||0),"pts","#3b82f6")+
          barra("Meta mensual",meta,Math.max(1,meta||0),"pts","#22c55e");
        return html+panel("📊 Avance de producción · gráfico complementario",cuerpo);
      }catch(e){console.warn("V637 gráfico resumen omitido",e);return html;}
    };
  }
  if(typeof window.mv198ResumenCuadrilla==="function"){
    const original=window.mv198ResumenCuadrilla;
    window.mv198ResumenCuadrilla=function(x){
      const html=original.apply(this,arguments);
      try{
        if(!x)return html;
        const meta=Number(window.META_PRODUCCION_CUADRILLA)||130;
        const cifras=[["Producción",num(x.produccion),meta,"pts"],["Efectividad",pct(x.efectividad),100,"%"],["Recableado",pct(x.recableado),100,"%"],["GAR/VTR",pct(x.vtrgar),100,"%"],["SLA",num(x.slaAjustado??x.sla),100,"%"]];
        return html+panel("📊 Indicadores de cuadrilla · barras de referencia",cifras.map(([n,v,m,u])=>barra(n,v,m,u,"#60a5fa")).join(""));
      }catch(e){console.warn("V637 gráfico cuadrilla omitido",e);return html;}
    };
  }
  if(typeof window.mv282RenderResultado==="function"){
    const original=window.mv282RenderResultado;
    window.mv282RenderResultado=function(data){
      const html=original.apply(this,arguments);
      try{
        if(!data?.resumen)return html;
        const r=data.resumen,campos=[["Finalizadas",r.finalizadas,"#22c55e"],["Canceladas",r.canceladas,"#ef4444"],["Reprogramadas",r.reprogramadas,"#f59e0b"],["Regestiones",r.regestiones,"#60a5fa"],["Otros estados",r.otrosEstados,"#94a3b8"]];
        const total=num(r.total)||0;
        const cuerpo=campos.map(([n,v,c])=>barra(n,num(v),Math.max(1,total),"órdenes",c)).join("");
        return panel("📊 Trabajos diarios · distribución por estado",cuerpo)+html;
      }catch(e){console.warn("V637 gráfico diario omitido",e);return html;}
    };
  }
  window.MV637_COMPLEMENTOS_OK=true;
})();
