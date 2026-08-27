/* ============================================================
   MI VISUAL V504 - DETALLE WIN EN TRABAJOS DIARIOS

   Objetivo:
   - Mantener intactos Produccion, Ranking, SLA, Efectividad y Recableado.
   - Cuando el Dashboard solo conserve PRODUCCION_AGRUPADA, recuperar
     detalle desde MAPA_ORDENES (fuente WIN ya disponible en MI VISUAL).
   - Mostrar Orden WIN, codigo de cliente, DNI, cliente y ticket/seguimiento.
   - NO cargar ni depender de Base Partner para esta consulta.
============================================================ */
(function(){
  "use strict";

  if(window.MV504_DETALLE_WIN_DASHBOARD_OK) return;
  window.MV504_DETALLE_WIN_DASHBOARD_OK = true;

  const VERSION = "V504-DETALLE-WIN-20260827";
  let instalado = false;
  let intentos = 0;
  const MAX_INTENTOS = 180;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^A-Z0-9]+/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function apiBase(){
    return window.MI_VISUAL_API_URL ||
      (typeof MV58_API !== "undefined" ? MV58_API : "");
  }

  function fechaIso(v){
    const t = String(v || "").trim();
    if(!t) return "";
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m) return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[3])).padStart(2,"0")}`;
    m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if(m) return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[1])).padStart(2,"0")}`;
    const d = new Date(t);
    if(!Number.isNaN(d.getTime())){
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
    return "";
  }

  function esFinalizada(v){
    const n = norm(v);
    return n === "FINALIZADA" || n === "FINALIZADO" || n.includes("FINALIZ");
  }

  function fechaOperacionMapa(x){
    if(esFinalizada(x?.estado)){
      return fechaIso(x?.fechaFinVisita) ||
        fechaIso(x?.fechaInicioVisita) ||
        fechaIso(x?.fechaUltimoEstado) ||
        fechaIso(x?.fechaSolicitud);
    }
    return fechaIso(x?.fechaUltimoEstado) ||
      fechaIso(x?.fechaInicioVisita) ||
      fechaIso(x?.fechaSolicitud);
  }

  async function consultarMapaWin(cuadrilla){
    const base = apiBase();
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");

    const url = new URL(base);
    url.searchParams.set("accion","listarMapaOperativo");
    url.searchParams.set("usuario",localStorage.getItem("usuario") || "");
    // Se consulta por cuadrilla y se filtra la fecha de ejecucion en cliente.
    // Asi no se pierde una orden solicitada en otro dia y finalizada en la fecha consultada.
    url.searchParams.set("cuadrilla",cuadrilla || "");
    url.searchParams.set("_mv504",Date.now().toString());

    const r = await fetch(url.toString(),{
      method:"GET",
      cache:"no-store",
      redirect:"follow",
      headers:{"Accept":"application/json"}
    });
    const txt = (await r.text()).trim();
    let data;
    try{ data = JSON.parse(txt); }
    catch(_){ throw new Error("WIN no devolvio detalle valido para esta consulta."); }
    if(!data?.ok) throw new Error(data?.error || "No se pudo consultar MAPA_ORDENES.");
    return Array.isArray(data.ordenes) ? data.ordenes : [];
  }

  function gruposResumen(trabajos){
    return (Array.isArray(trabajos) ? trabajos : []).map((x,idx)=>{
      const cantidad = Math.max(1,Number(x?.cantidad)||1);
      const puntos = Number(x?.puntos)||0;
      const titulo = x?.tipoPartida || x?.tipoAtencion || x?.tipoTrabajo || "";
      return {
        idx,
        key:norm(titulo),
        titulo,
        codigo:x?.codigoProduccion || "",
        cantidad,
        usados:0,
        unitario:cantidad > 0 ? puntos/cantidad : 0,
        original:x
      };
    });
  }

  function buscarGrupo(tipoTrabajo,grupos){
    const k = norm(tipoTrabajo);
    if(!k) return null;

    let g = grupos.find(x=>x.usados < x.cantidad && x.key === k);
    if(g) return g;

    g = grupos.find(x=>
      x.usados < x.cantidad &&
      x.key &&
      (x.key.includes(k) || k.includes(x.key))
    );
    return g || null;
  }

  function detalleDesdeMapa(data,ordenesMapa,fecha){
    const originales = Array.isArray(data?.trabajos) ? data.trabajos : [];
    const grupos = gruposResumen(originales);
    const objetivo = Math.max(
      0,
      Number(data?.resumen?.finalizadas || 0),
      Number(data?.resumen?.total || 0)
    );

    const finalizadasEsperadas = Number(data?.resumen?.finalizadas || 0);
    const candidatas = (ordenesMapa || [])
      .filter(x=>fechaOperacionMapa(x) === fecha)
      .filter(x=>!finalizadasEsperadas || esFinalizada(x?.estado))
      .sort((a,b)=>{
        const af = esFinalizada(a?.estado) ? 0 : 1;
        const bf = esFinalizada(b?.estado) ? 0 : 1;
        return af-bf;
      });

    const seleccion = [];
    const usadas = new Set();

    // Primero tomamos las ordenes que pueden asociarse a una partida del resumen.
    candidatas.forEach((x,idx)=>{
      if(objetivo && seleccion.length >= objetivo) return;
      const g = buscarGrupo(x?.tipoTrabajo,grupos);
      if(!g) return;
      g.usados++;
      usadas.add(idx);
      seleccion.push({x,g});
    });

    // Si aun faltan ordenes, completamos con otras ordenes WIN de la misma fecha.
    candidatas.forEach((x,idx)=>{
      if(objetivo && seleccion.length >= objetivo) return;
      if(usadas.has(idx)) return;
      const g = grupos.find(it=>it.usados < it.cantidad) || null;
      if(g) g.usados++;
      seleccion.push({x,g});
      usadas.add(idx);
    });

    const trabajos = seleccion.map(({x,g})=>{
      const puntos = g && esFinalizada(x?.estado) ? Number(g.unitario||0) : 0;
      return {
        cuadrilla:x?.cuadrilla || data?.cuadrilla || "",
        sede:x?.region || data?.sede || "",
        estado:x?.estado || "",
        tipoTrabajo:x?.tipoTrabajo || "",
        tipoAtencion:x?.tipo || "",
        tipoPartida:(g?.titulo || x?.productoServicio || x?.tipoTrabajo || ""),
        codigoProduccion:g?.codigo || "",
        // Compatibilidad con el renderer actual del Dashboard:
        // CODIGO_CLIENTE -> codigoPedido; ORDEN_ID -> codigoLiquidacion.
        codigoPedido:x?.codigoCliente || "",
        codigoLiquidacion:x?.ordenId || "",
        ticket:x?.codigoSeguimiento || "",
        numeroDocumento:x?.numeroDocumento || "",
        cliente:x?.cliente || "",
        cantidad:1,
        puntajeUnitario:puntos,
        puntos:Math.round(puntos*100)/100,
        detalleDisponible:true,
        ordenWin:x?.ordenId || "",
        codigoCliente:x?.codigoCliente || "",
        origenDetalle:"MAPA_ORDENES_WIN_V504"
      };
    });

    // Si WIN no trae todas las ordenes, conservamos el remanente del resumen
    // para no alterar cantidades ni puntos ya calculados.
    grupos.forEach(g=>{
      const faltantes = Math.max(0,g.cantidad-g.usados);
      if(!faltantes) return;
      trabajos.push(Object.assign({},g.original,{
        cantidad:faltantes,
        puntos:Math.round((g.unitario*faltantes)*100)/100,
        detalleDisponible:false,
        origenDetalle:"RESUMEN_SIN_DETALLE"
      }));
    });

    const detalleWin = trabajos.filter(x=>x.detalleDisponible).length;
    if(!detalleWin) return null;

    return Object.assign({},data,{
      trabajos,
      origen:"MAPA_ORDENES_WIN_V504",
      detalleFuente:"MAPA_ORDENES",
      detalleWin,
      versionDetalle:VERSION
    });
  }

  async function enriquecerResultado(origen){
    if(typeof MV282_TRABAJOS_DIARIOS === "undefined") return false;
    const actual = MV282_TRABAJOS_DIARIOS?.resultado;
    if(!actual || actual.origen !== "PRODUCCION_AGRUPADA") return false;

    const filtros = origen === "SUPERVISOR"
      ? (typeof MV239_DASH_SUPERVISOR_FILTROS !== "undefined" ? MV239_DASH_SUPERVISOR_FILTROS : null)
      : (typeof MV199_DASH_JEFATURA_FILTROS !== "undefined" ? MV199_DASH_JEFATURA_FILTROS : null);

    const cuadrilla = filtros?.cuadrilla || actual.cuadrilla || "";
    const fecha = fechaIso(MV282_TRABAJOS_DIARIOS.fecha || actual.fecha);
    if(!cuadrilla || cuadrilla === "TODAS" || !fecha) return false;

    try{
      const ordenes = await consultarMapaWin(cuadrilla);
      const enriquecido = detalleDesdeMapa(actual,ordenes,fecha);
      if(!enriquecido) return false;

      MV282_TRABAJOS_DIARIOS.resultado = enriquecido;
      if(typeof mv282RenderDashboard === "function") mv282RenderDashboard(origen);
      return true;
    }catch(e){
      // Fallback silencioso: se conserva exactamente el resultado anterior.
      console.warn("V504: detalle WIN no disponible; se conserva resumen existente.",e);
      return false;
    }
  }

  function instalar(){
    if(instalado) return true;
    const original = window.mv282ConsultarTrabajosDiarios;
    if(typeof original !== "function") return false;
    if(original.__mv504) { instalado = true; return true; }

    const ajustada = async function(origen){
      const r = await original.apply(this,arguments);
      await enriquecerResultado(origen);
      return r;
    };
    ajustada.__mv504 = true;
    ajustada.__original = original;

    window.mv282ConsultarTrabajosDiarios = ajustada;
    try{ mv282ConsultarTrabajosDiarios = ajustada; }catch(_){}
    instalado = true;
    console.log("MI VISUAL V504: detalle WIN de trabajos diarios habilitado.");
    return true;
  }

  function vigilar(){
    if(instalar()) return;
    intentos++;
    if(intentos < MAX_INTENTOS) setTimeout(vigilar,500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",()=>setTimeout(vigilar,0),{once:true});
  }else{
    setTimeout(vigilar,0);
  }
})();
