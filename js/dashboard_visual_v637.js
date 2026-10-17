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
      const v=regla.extra?regla.extra(x):Number(x?.[regla.campo]);
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
