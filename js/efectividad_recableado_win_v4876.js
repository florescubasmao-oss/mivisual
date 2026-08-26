/* ================================================================
   MI VISUAL V487.6 - Efectividad + % Recableado desde WIN

   SOLO LECTURA / PRUEBA
   - Fuente: WIN / MAPA_ORDENES.
   - OrdenId es la llave unica.
   - Efectividad conserva la relacion vigente: FINALIZADAS / TOTAL CERRADAS.
   - Estados abiertos (AGENDADA, EN CAMINO, INICIADA, REVISION y otros no
     cerrados) no entran al indicador.
   - Para Efectividad, VTR/GAR se reconoce por TIPO_TRABAJO WIN
     REITERADA/GARANTIA. Un ticket VTR-/GAR- no convierte por si solo un
     LOS ROJO u otro TipoTraba en VTR/GAR para este indicador.
   - Cancelada/Reprogramada forman parte del denominador; el desglose es
     informativo. Motivos de RESERVA se marcan para control porque WIN los
     entrega como Cancelada y la base anterior no permite derivar su estado
     historico de forma univoca solo con el motivo.
   - % Recableado: solo FINALIZADAS cuyo TIPO_TRABAJO contiene "LOS ROJO".
   - Numerador: de esas mismas LOS ROJO, MOTIVO_FINALIZACION contiene
     "RECABLEADO". El numerador siempre es subconjunto del denominador.
   - No escribe EFECTIVIDAD, PORCENTAJE REC, RANKING ni ninguna otra hoja.
================================================================ */
(function(){
  "use strict";
  if(window.MV4876_EFECTIVIDAD_RECABLEADO_WIN) return;
  window.MV4876_EFECTIVIDAD_RECABLEADO_WIN = true;

  const API = window.MI_VISUAL_API_URL || "";

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function id(v){ return txt(v).replace(/\.0+$/,""); }
  function val(o){
    for(let i=1;i<arguments.length;i++){
      const k=arguments[i];
      if(o && o[k] !== undefined && o[k] !== null && txt(o[k]) !== "") return o[k];
    }
    return "";
  }
  function usuario(){ return localStorage.getItem("usuario") || localStorage.getItem("correo") || ""; }

  async function apiGet(payload){
    if(!API) throw new Error("No se encontro la URL de MI VISUAL.");
    const url = new URL(API);
    Object.keys(payload||{}).forEach(function(k){
      const v=payload[k];
      if(v!==undefined && v!==null && v!=="") url.searchParams.set(k, typeof v==="object" ? JSON.stringify(v) : String(v));
    });
    url.searchParams.set("_v4876", String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});
    const t=await r.text(); let j;
    try{ j=JSON.parse(t); }catch(_){ throw new Error("La API no devolvio datos validos para V487.6."); }
    if(!j || j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo consultar WIN.");
    return j;
  }

  function listaMapa(r){
    if(Array.isArray(r&&r.ordenes)) return r.ordenes;
    if(Array.isArray(r&&r.registros)) return r.registros;
    return [];
  }

  function normalizar(raw){
    return {
      ordenId:id(val(raw,"ordenId","ORDEN_ID")),
      tipoTrabajo:norm(val(raw,"tipoTrabajo","TIPO_TRABAJO")),
      cuadrilla:txt(val(raw,"cuadrilla","CUADRILLA")),
      estado:norm(val(raw,"estado","ESTADO")),
      motivoCancelacion:norm(val(raw,"motivoCancelacion","MOTIVO_CANCELACION")),
      motivoFinalizacion:norm(val(raw,"motivoFinalizacion","MOTIVO_FINALIZACION")),
      motivoAnulacion:norm(val(raw,"motivoAnulacion","MOTIVO_ANULACION")),
      motivoRegestion:norm(val(raw,"detalle","DETALLE","motivoRegestion","MOTIVO_REGESTION")),
      codigoSeguimiento:norm(val(raw,"codigoSeguimiento","CODIGO_SEGUIMIENTO"))
    };
  }

  function esVtrGarEfectividad(o){
    return o.tipoTrabajo==="REITERADA" || o.tipoTrabajo==="GARANTIA";
  }

  function esReservaCandidata(o){
    if(o.estado!=="CANCELADA") return false;
    const r=o.motivoCancelacion;
    return r.includes("RESERVA CLIENTE") || r.includes("ORDEN RESERVADA");
  }

  function grupoCerrado(o){
    if(o.estado==="FINALIZADA") return "FINALIZADA";
    if(o.estado==="REGESTION") return "REGESTION";
    if(o.estado==="ANULADA") return "CANCELADA";
    if(o.estado==="CANCELADA"){
      const razon=[o.motivoCancelacion,o.motivoAnulacion,o.motivoRegestion].join(" ");
      if(/REPROGRAM|POSTERGA/.test(razon)) return "REPROGRAMADA";
      return "CANCELADA";
    }
    return "";
  }

  function acumular(mapa,cuadrilla){
    const k=norm(cuadrilla)||"SIN CUADRILLA";
    if(!mapa[k]) mapa[k]={cuadrilla:cuadrilla||"SIN CUADRILLA",finalizadas:0,canceladas:0,regestiones:0,reprogramadas:0,total:0,efectividad:0,losRojo:0,recableados:0,porcentajeRecableado:0,reservasCandidatas:0};
    return mapa[k];
  }

  function calcular(ordenes){
    const porId={};
    (ordenes||[]).forEach(function(raw){
      const o=normalizar(raw);
      if(o.ordenId) porId[o.ordenId]=o;
    });
    const unicas=Object.keys(porId).map(function(k){return porId[k];});
    const porCuadrilla={};
    const control={
      ordenesUnicas:unicas.length,
      abiertasExcluidas:0,
      vtrGarExcluidasEfectividad:0,
      reservasCandidatas:0,
      cerradasEfectividad:0,
      finalizadasEfectividad:0,
      losRojoFinalizadas:0,
      recableadosLosRojo:0
    };

    unicas.forEach(function(o){
      const fila=acumular(porCuadrilla,o.cuadrilla);

      // Recableado: TipoTraba manda. El prefijo del ticket no lo saca del universo LOS ROJO.
      if(o.estado==="FINALIZADA" && o.tipoTrabajo.includes("LOS ROJO")){
        fila.losRojo++;
        control.losRojoFinalizadas++;
        if(o.motivoFinalizacion.includes("RECABLEADO")){
          fila.recableados++;
          control.recableadosLosRojo++;
        }
      }

      // Efectividad.
      const grupo=grupoCerrado(o);
      if(!grupo){ control.abiertasExcluidas++; return; }
      if(o.estado==="FINALIZADA" && esVtrGarEfectividad(o)){
        control.vtrGarExcluidasEfectividad++;
        return;
      }
      if(esReservaCandidata(o)){
        fila.reservasCandidatas++;
        control.reservasCandidatas++;
      }

      fila.total++;
      control.cerradasEfectividad++;
      if(grupo==="FINALIZADA"){ fila.finalizadas++; control.finalizadasEfectividad++; }
      else if(grupo==="REGESTION") fila.regestiones++;
      else if(grupo==="REPROGRAMADA") fila.reprogramadas++;
      else fila.canceladas++;
    });

    const detalle=Object.keys(porCuadrilla).map(function(k){
      const x=porCuadrilla[k];
      x.efectividad=x.total?x.finalizadas/x.total:0;
      x.porcentajeRecableado=x.losRojo?x.recableados/x.losRojo:0;
      return x;
    }).sort(function(a,b){return norm(a.cuadrilla).localeCompare(norm(b.cuadrilla));});

    control.efectividadGeneral=control.cerradasEfectividad?control.finalizadasEfectividad/control.cerradasEfectividad:0;
    control.porcentajeRecableadoGeneral=control.losRojoFinalizadas?control.recableadosLosRojo/control.losRojoFinalizadas:0;

    return {
      ok:true,
      version:"V487.6",
      soloLectura:true,
      reglas:{
        efectividad:"FINALIZADAS / TOTAL ORDENES CERRADAS ELEGIBLES",
        abiertosFuera:true,
        deduplicaOrdenId:true,
        vtrGarEfectividadPorTipoTraba:true,
        reservasMarcadasParaControl:true,
        recableado:"FINALIZADA + TIPO_TRABAJO contiene LOS ROJO; numerador = MOTIVO_FINALIZACION contiene RECABLEADO"
      },
      control:control,
      detalle:detalle
    };
  }

  async function consultar(periodo){
    const r=await apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:periodo||""});
    const out=calcular(listaMapa(r));
    out.periodo=periodo||r.periodo||"";
    return out;
  }

  window.mv4876CalcularEfectividadRecableado=calcular;
  window.mv4876ConsultarEfectividadRecableado=consultar;
})();
