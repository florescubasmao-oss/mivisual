/* ============================================================
   MI VISUAL V361 - Resumen consolidado para Dashboard y Ranking
   - Una sola consulta JSON por período.
   - Reutiliza la hoja técnica RESUMEN_DASHBOARD_RANKING.
   - Conserva el flujo CSV anterior como respaldo automático.
============================================================ */
(function(){
  "use strict";
  if(window.MV361_RESUMEN_CONSOLIDADO_OK) return;

  const CACHE = new Map();
  const obtenerRankingAnterior = window.mv4ObtenerRanking;

  function normalizarPeriodos(periodos){
    const lista = Array.isArray(periodos) ? periodos : [];
    return lista.map(item=>{
      if(typeof item === "string") return {clave:item,etiqueta:mv276EtiquetaPeriodo(item),corte:""};
      return {
        clave:item?.clave || item?.periodo || "",
        etiqueta:item?.etiqueta || mv276EtiquetaPeriodo(item?.clave || item?.periodo || ""),
        corte:item?.corte || ""
      };
    }).filter(x=>/^\d{4}-\d{2}$/.test(x.clave));
  }

  async function consultar(periodo,forzar){
    const solicitado = String(periodo || "");
    const clave = solicitado || "AUTO";
    const guardado = CACHE.get(clave);
    if(!forzar && guardado && Date.now()-guardado.fecha<120000) return guardado.data;

    const base = window.MI_VISUAL_API_URL || (typeof MV58_API!=="undefined" ? MV58_API : "");
    if(!base) throw new Error("No se encontró la URL de MI VISUAL.");

    const url = new URL(base);
    url.searchParams.set("accion","obtenerResumenDashboardRanking");
    url.searchParams.set("usuario",localStorage.getItem("usuario") || "");
    if(solicitado) url.searchParams.set("periodo",solicitado);
    url.searchParams.set("forzarActualizacion",forzar ? "SI" : "NO");
    url.searchParams.set("_mv361",Date.now().toString());

    const controlador = typeof AbortController==="function" ? new AbortController() : null;
    const temporizador = controlador ? setTimeout(()=>controlador.abort(),90000) : null;
    try{
      const respuesta = await fetch(url.toString(),{
        method:"GET",cache:"no-store",redirect:"follow",
        headers:{"Accept":"application/json"},
        signal:controlador ? controlador.signal : undefined
      });
      const texto = (await respuesta.text()).trim();
      if(!respuesta.ok) throw new Error(`No se pudo consultar el resumen (${respuesta.status}).`);
      if(!texto || /^MI VISUAL API OK$/i.test(texto) || /^<!doctype|^<html/i.test(texto)){
        throw new Error("Apps Script todavía no tiene publicada la V363.");
      }
      const data = JSON.parse(texto);
      if(!data?.ok) throw new Error(data?.error || "No se pudo obtener el resumen operativo.");
      CACHE.set(clave,{fecha:Date.now(),data});
      if(data.periodo) CACHE.set(data.periodo,{fecha:Date.now(),data});
      return data;
    }catch(error){
      if(error?.name==="AbortError") throw new Error("El primer armado del resumen tardó demasiado.");
      throw error;
    }finally{
      if(temporizador) clearTimeout(temporizador);
    }
  }

  async function obtenerConsolidado(periodoSeleccionado){
    try{
      const data = await consultar(periodoSeleccionado,false);
      MV276_DASH_PERIODOS = normalizarPeriodos(data.periodos);
      MV276_DASH_PERIODO = data.periodo || mv276PeriodoPredeterminado(MV276_DASH_PERIODOS,periodoSeleccionado);
      const lista = Array.isArray(data.lista) ? data.lista : [];
      lista.forEach(item=>{
        item.sede = mv4Norm(item.sede);
        item.plataforma = mv4Norm(item.plataforma);
      });
      return lista;
    }catch(error){
      console.warn("V361 resumen no disponible; se usa el proceso anterior",error);
      if(typeof obtenerRankingAnterior === "function"){
        return await obtenerRankingAnterior(periodoSeleccionado);
      }
      throw error;
    }
  }

  window.mv361ConsultarResumenDashboardRanking = consultar;
  window.mv4ObtenerRanking = obtenerConsolidado;
  try{ mv4ObtenerRanking = obtenerConsolidado; }catch(_){ }
  window.MV361_RESUMEN_CONSOLIDADO_OK = true;
  console.log("MI VISUAL V363: resumen consolidado con SLA habilitado.");
})();