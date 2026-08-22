/* ============================================================
   MI VISUAL V459 - Dashboard: Observaciones SOLO WIN
   - No recalcula indicadores operativos.
   - No toca Producción, Efectividad, Recableado, VTR/GAR ni SLA.
   - Solo adapta la lectura visual del indicador Observaciones cuando el
     backend V459 entrega mv459Observaciones.
   - Antes de desplegar backend V459 hace fallback exacto a V365.
============================================================ */
(function(){
  "use strict";
  if(window.MV459_DASH_OBS_WIN_OK) return;
  window.MV459_DASH_OBS_WIN_OK = true;

  function n(v){
    const x=Number(v);
    return Number.isFinite(x)?x:0;
  }

  function money(v){
    return "S/ "+n(v).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function tieneV459(lista){
    return Array.isArray(lista) && lista.some(x=>x && x.mv459Observaciones && x.mv459Observaciones.win);
  }

  function winDe(x){
    const d=x?.mv459Observaciones?.win || null;
    if(d) return d;
    const viejo=x?.mv361ObservacionesWin || {};
    return {
      cantidad:n(viejo.total),
      observado:n(viejo.observado ?? viejo.montoPenalizado),
      gestion:n(viejo.gestion),
      penalizadas:n(viejo.penalizadas),
      penalizado:n(viejo.montoPenalizado),
      subsanadas:n(viejo.subsanadas),
      subsanado:n(viejo.montoSubsanado),
      estados:{}
    };
  }

  function transformar(lista){
    if(!tieneV459(lista)) return lista;
    return (lista||[]).map(x=>{
      const w=winDe(x);
      return Object.assign({},x,{
        observaciones:n(w.cantidad),
        montoAfectadoObs:n(w.penalizado),
        detObservaciones:{
          total:n(w.cantidad),
          pendientes:0,
          montoTotal:n(w.observado),
          montoPendiente:n(w.penalizado),
          montoAfectado:n(w.penalizado),
          estados:w.estados||{}
        }
      });
    });
  }

  function resumenWin(lista){
    const r={cantidad:0,observado:0,gestion:0,penalizado:0,subsanado:0};
    (lista||[]).forEach(x=>{
      const w=winDe(x);
      r.cantidad+=n(w.cantidad);
      r.observado+=n(w.observado);
      r.gestion+=n(w.gestion);
      r.penalizado+=n(w.penalizado);
      r.subsanado+=n(w.subsanado);
    });
    return r;
  }

  function rotular(html,lista){
    if(!tieneV459(lista) || typeof html!=="string") return html;
    const w=resumenWin(lista);
    let out=html
      .replace(/>Observaciones</g,">Observaciones WIN<")
      .replace(/>Obs:\s*</g,">Obs WIN: <");

    const patron=new RegExp(`${w.cantidad} registros · referencia ≤ S/ \\d+(?:\\.\\d+)?`);
    out=out.replace(
      patron,
      `${w.cantidad} obs WIN · Penalizado ${money(w.penalizado)} · En gestión ${money(w.gestion)} · Subsanado ${money(w.subsanado)}`
    );
    return out;
  }

  function instalar(){
    if(window.MV459_DASH_OBS_WIN_INSTALADO) return true;
    if(typeof window.mv4DashboardKpis!=="function" ||
       typeof window.mv591ResumenEjecutivoZona!=="function" ||
       typeof window.mv4SedeCard!=="function") return false;

    const baseResumen=typeof window.mv4Resumen==="function" ? window.mv4Resumen : null;
    const baseKpis=window.mv4DashboardKpis;
    const baseZona=window.mv591ResumenEjecutivoZona;
    const baseSede=window.mv4SedeCard;

    if(baseResumen){
      window.mv4Resumen=function(lista){
        return baseResumen(transformar(lista));
      };
    }

    window.mv4DashboardKpis=function(lista){
      return rotular(baseKpis(transformar(lista)),lista);
    };

    window.mv591ResumenEjecutivoZona=function(lista){
      return rotular(baseZona(transformar(lista)),lista);
    };

    window.mv4SedeCard=function(sede,lista){
      return rotular(baseSede(sede,transformar(lista)),lista);
    };

    window.MV459_DASH_OBS_WIN_INSTALADO=true;
    return true;
  }

  const reloj=setInterval(()=>{
    if(instalar()) clearInterval(reloj);
  },400);
  instalar();
})();
