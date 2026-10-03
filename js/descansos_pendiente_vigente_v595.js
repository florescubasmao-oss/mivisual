/* ============================================================
   MI VISUAL V595 - DESCANSOS / PENDIENTE VIGENTE REAL
   03/10/2026

   Problema:
   - PROGRAMACION_DESCANSOS contiene duplicados históricos.
   - Al aprobar una copia más reciente, una copia pendiente más antigua
     puede volver a aparecer porque el backend prioriza "algún pendiente"
     aunque exista una aprobación posterior para la misma cuadrilla/fecha.

   Solución frontend segura:
   - SOLO lectura/visualización.
   - Después de cargar Descansos, compara PROGRAMACION vs HISTORIAL.
   - Para cada cuadrilla+fecha conserva como referencia el registro
     histórico más reciente.
   - Si el último registro real ya está APROBADO/APLICADO/RECHAZADO,
     oculta pendientes antiguos de esa misma cuadrilla+fecha.
   - No modifica hojas, backend, historial, aprobados ni permisos.
============================================================ */
(function(){
  "use strict";
  if(window.MV595_DESCANSOS_PENDIENTE_VIGENTE_OK)return;
  window.MV595_DESCANSOS_PENDIENTE_VIGENTE_OK=true;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/_/g," ")
      .replace(/\s+/g," ")
      .trim();
  }
  function keyItem(x){
    const origen=norm(x&&x.idOrigen);
    if(origen)return origen;
    return norm(x&&x.cuadrilla)+"|"+txt(x&&x.fecha);
  }
  function estado(x){
    return norm(x&&(x.estadoValidacion||x.estadoProgramacion||x.resultadoJefatura||""));
  }
  function esPendiente(e){
    return ["PENDIENTE JEFATURA","PENDIENTE SUPERVISOR","OBSERVADO"].includes(norm(e));
  }
  function esResuelto(e){
    return ["APROBADO","APLICADO","RECHAZADO"].includes(norm(e));
  }

  function ultimoRealPorClave(historial){
    const mapa=new Map();
    (Array.isArray(historial)?historial:[]).forEach(function(x){
      const k=keyItem(x);
      if(!k||mapa.has(k))return;
      mapa.set(k,x);
    });
    return mapa;
  }

  function depurarData(data){
    if(!data||!Array.isArray(data.programacion))return data;
    const hist=Array.isArray(data.historial)?data.historial:[];
    if(!hist.length)return data;

    const ultimo=ultimoRealPorClave(hist);
    const antes=data.programacion.length;

    data.programacion=data.programacion.filter(function(x){
      const e=estado(x);
      if(!esPendiente(e))return true;
      const u=ultimo.get(keyItem(x));
      if(!u)return true;
      const eu=estado(u);
      if(esResuelto(eu))return false;
      return true;
    });

    const quitados=antes-data.programacion.length;
    if(quitados>0){
      console.warn("V595: pendientes históricos ya resueltos ocultados",quitados);
    }
    return data;
  }

  function contarPendientesVigentes(){
    const d=window.PD_DATA;
    const lista=d&&Array.isArray(d.programacion)?d.programacion:[];
    return lista.filter(function(x){return esPendiente(estado(x));}).length;
  }

  function refrescarContadorDesdeData(){
    const total=contarPendientesVigentes();
    if(typeof window.pdAplicarNotificacionDescansosMenu==="function"){
      try{window.pdAplicarNotificacionDescansosMenu(total);}catch(_){}
    }
    return total;
  }

  function instalarCarga(){
    if(typeof window.pdCargar!=="function")return false;
    if(window.pdCargar.__mv595)return true;
    const base=window.pdCargar;
    const nuevo=async function(){
      const r=await base.apply(this,arguments);
      try{
        if(window.PD_DATA){
          depurarData(window.PD_DATA);
          try{PD_DATA=window.PD_DATA;}catch(_){}
        }else if(typeof PD_DATA!=="undefined"){
          depurarData(PD_DATA);
          try{window.PD_DATA=PD_DATA;}catch(_){}
        }
        refrescarContadorDesdeData();
      }catch(e){
        console.warn("V595: no se pudo depurar pendientes históricos",e);
      }
      return r;
    };
    nuevo.__mv595=true;
    nuevo.__base=base;
    window.pdCargar=nuevo;
    try{pdCargar=nuevo;}catch(_){}
    return true;
  }

  function instalarRender(){
    if(typeof window.pdRenderGestion!=="function")return false;
    if(window.pdRenderGestion.__mv595)return true;
    const base=window.pdRenderGestion;
    const nuevo=function(){
      try{
        if(window.PD_DATA)depurarData(window.PD_DATA);
        else if(typeof PD_DATA!=="undefined")depurarData(PD_DATA);
      }catch(_){}
      const r=base.apply(this,arguments);
      refrescarContadorDesdeData();
      return r;
    };
    nuevo.__mv595=true;
    nuevo.__base=base;
    window.pdRenderGestion=nuevo;
    try{pdRenderGestion=nuevo;}catch(_){}
    return true;
  }

  function instalar(){
    const a=instalarCarga();
    const b=instalarRender();
    return a||b;
  }

  if(!instalar()){
    const t=setInterval(function(){if(instalar())clearInterval(t);},300);
    setTimeout(function(){try{clearInterval(t);}catch(_){}},12000);
  }
})();