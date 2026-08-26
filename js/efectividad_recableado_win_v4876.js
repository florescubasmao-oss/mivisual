/* ================================================================
   MI VISUAL V487.10 - Efectividad + % Recableado desde WIN

   MOTOR DE CALCULO / SIN ESCRITURAS DIRECTAS
   - Fuente: WIN / MAPA_ORDENES.
   - OrdenId = llave unica.
   - Si llegan varias versiones de una orden, usa FECHA_ULTIMO_ESTADO mas
     reciente; si empata, FECHA_IMPORTACION mas reciente.
   - Efectividad conserva el contrato oficial vigente:
       FINALIZADAS / TOTAL ORDENES CERRADAS ELEGIBLES.
   - Toda FINALIZADA entra en Efectividad, incluido VTR/GAR.
   - AGENDADA, EN CAMINO, INICIADA, REVISION y demas estados abiertos fuera.
   - RESERVA / ORDEN RESERVADA = PENDIENTE hasta un estado posterior.
   - CANCELADA, REPROGRAMADA, REGESTION y ANULADA entran al denominador;
     ANULADA/ANULADO se agrupa dentro de CANCELADA como en la regla vigente.
   - % Recableado: FINALIZADA + TIPO_TRABAJO contiene "LOS ROJO".
   - Numerador: subconjunto exacto anterior cuyo MOTIVO_FINALIZACION contiene
     "RECABLEADO". Asi numerador y denominador siempre comparten poblacion.
================================================================ */
(function(){
  "use strict";
  if(window.MV4876_EFECTIVIDAD_RECABLEADO_WIN) return;
  window.MV4876_EFECTIVIDAD_RECABLEADO_WIN = true;

  const API=window.MI_VISUAL_API_URL||"";

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function id(v){return txt(v).replace(/\.0+$/,"");}
  function val(o){for(let i=1;i<arguments.length;i++){const k=arguments[i];if(o&&o[k]!==undefined&&o[k]!==null&&txt(o[k])!=="")return o[k];}return "";}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}

  function fechaMs(v){
    if(v instanceof Date&&!isNaN(v.getTime()))return v.getTime();
    const s=txt(v);if(!s)return 0;
    let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m)return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();
    m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m)return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();
    const d=new Date(s);return isNaN(d.getTime())?0:d.getTime();
  }

  function normalizar(raw){
    const motor=window.MV4877_WIN_ESTADO_HISTORICO;
    return {
      ordenId:id(val(raw,"ordenId","ORDEN_ID","OrdenId")),
      tipoTrabajo:norm(val(raw,"tipoTrabajo","TIPO_TRABAJO","TipoTraba")),
      cuadrilla:txt(val(raw,"cuadrilla","CUADRILLA","Cuadrilla")),
      estado:norm(val(raw,"estado","ESTADO","Estado")),
      motivoCancelacion:norm(val(raw,"motivoCancelacion","MOTIVO_CANCELACION","Motivo Cancelacion","Motivo Cancelación")),
      motivoFinalizacion:norm(val(raw,"motivoFinalizacion","MOTIVO_FINALIZACION","Motivo Finalizacion","Motivo Finalización")),
      motivoAnulacion:norm(val(raw,"motivoAnulacion","MOTIVO_ANULACION","Motivo Anulacion","Motivo Anulación")),
      detalle:norm(val(raw,"detalle","DETALLE","motivoRegestion","MOTIVO_REGESTION")),
      codigoSeguimiento:norm(val(raw,"codigoSeguimiento","CODIGO_SEGUIMIENTO")),
      fechaEstado:motor&&typeof motor.fechaEstadoMs==="function"
        ? motor.fechaEstadoMs(raw)
        : (fechaMs(val(raw,"fechaUltimoEstado","FECHA_ULTIMO_ESTADO","FechaUltiEsta"))||fechaMs(val(raw,"fechaFinVisita","FECHA_FIN_VISITA","FechaFinVisi"))||fechaMs(val(raw,"fechaInicioVisita","FECHA_INICIO_VISITA","FechaIniVisi"))||fechaMs(val(raw,"fechaSolicitud","FECHA_SOLICITUD","F.Soli"))),
      fechaImportacion:fechaMs(val(raw,"fechaImportacion","FECHA_IMPORTACION","Fecha Importacion","Fecha Importación")),
      raw:raw
    };
  }

  function canonicalizar(ordenes){
    const porId=new Map();
    let duplicados=0;
    (ordenes||[]).forEach((raw,indice)=>{
      const o=normalizar(raw),k=o.ordenId||`__SIN_ID_${indice}`;
      const previo=porId.get(k);
      if(!previo){porId.set(k,o);return;}
      duplicados++;
      if(o.fechaEstado>previo.fechaEstado || (o.fechaEstado===previo.fechaEstado&&o.fechaImportacion>=previo.fechaImportacion)) porId.set(k,o);
    });
    return {ordenes:Array.from(porId.values()),duplicados};
  }

  function esReservaPendiente(o){
    if(o.estado!=="CANCELADA"&&o.estado!=="CANCELADO")return false;
    return /RESERVA|RESERVAD/.test([o.motivoCancelacion,o.motivoAnulacion,o.detalle].join(" "));
  }

  function grupoCerrado(o){
    const e=o.estado;
    if(esReservaPendiente(o))return "";
    if(e==="FINALIZADA"||e==="FINALIZADO")return "FINALIZADA";
    if(e.startsWith("REGEST"))return "REGESTION";
    if(e==="ANULADA"||e==="ANULADO")return "CANCELADA";
    if(e==="REPROGRAMADA"||e==="REPROGRAMADO")return "REPROGRAMADA";
    if(e==="CANCELADA"||e==="CANCELADO"){
      const razon=[o.motivoCancelacion,o.motivoAnulacion,o.detalle].join(" ");
      if(/REPROGRAM|POSTERGA/.test(razon))return "REPROGRAMADA";
      return "CANCELADA";
    }
    return "";
  }

  function acumular(mapa,cuadrilla){
    const k=norm(cuadrilla)||"SIN CUADRILLA";
    if(!mapa[k])mapa[k]={cuadrilla:cuadrilla||"SIN CUADRILLA",finalizadas:0,canceladas:0,regestiones:0,reprogramadas:0,total:0,efectividad:0,losRojo:0,recableados:0,porcentajeRecableado:0,reservasPendientes:0,abiertas:0};
    return mapa[k];
  }

  function calcular(ordenes){
    const canon=canonicalizar(ordenes),unicas=canon.ordenes,porCuadrilla={};
    const control={ordenesUnicas:unicas.length,duplicadosResueltos:canon.duplicados,abiertasExcluidas:0,reservasPendientes:0,cerradasEfectividad:0,finalizadasEfectividad:0,losRojoFinalizadas:0,recableadosLosRojo:0,recableadosFueraPoblacion:0};

    unicas.forEach(o=>{
      const fila=acumular(porCuadrilla,o.cuadrilla);

      if((o.estado==="FINALIZADA"||o.estado==="FINALIZADO")&&o.tipoTrabajo.includes("LOS ROJO")){
        fila.losRojo++;control.losRojoFinalizadas++;
        if(o.motivoFinalizacion.includes("RECABLEADO")){fila.recableados++;control.recableadosLosRojo++;}
      }else if((o.estado==="FINALIZADA"||o.estado==="FINALIZADO")&&o.motivoFinalizacion.includes("RECABLEADO")){
        control.recableadosFueraPoblacion++;
      }

      if(esReservaPendiente(o)){
        fila.reservasPendientes++;control.reservasPendientes++;control.abiertasExcluidas++;return;
      }
      const grupo=grupoCerrado(o);
      if(!grupo){fila.abiertas++;control.abiertasExcluidas++;return;}

      fila.total++;control.cerradasEfectividad++;
      if(grupo==="FINALIZADA"){fila.finalizadas++;control.finalizadasEfectividad++;}
      else if(grupo==="REGESTION")fila.regestiones++;
      else if(grupo==="REPROGRAMADA")fila.reprogramadas++;
      else fila.canceladas++;
    });

    const detalle=Object.keys(porCuadrilla).map(k=>{
      const x=porCuadrilla[k];
      x.efectividad=x.total?x.finalizadas/x.total:0;
      x.porcentajeRecableado=x.losRojo?x.recableados/x.losRojo:0;
      return x;
    }).sort((a,b)=>norm(a.cuadrilla).localeCompare(norm(b.cuadrilla)));

    control.efectividadGeneral=control.cerradasEfectividad?control.finalizadasEfectividad/control.cerradasEfectividad:0;
    control.porcentajeRecableadoGeneral=control.losRojoFinalizadas?control.recableadosLosRojo/control.losRojoFinalizadas:0;

    return {ok:true,version:"V487.10",soloLectura:true,reglas:{efectividad:"FINALIZADAS / TOTAL ORDENES CERRADAS ELEGIBLES",vtrGarIncluidoEfectividad:true,anuladaComoCancelada:true,abiertosFuera:true,reservaPendiente:true,ultimoEstadoPorFechaHora:true,deduplicaOrdenId:true,recableado:"FINALIZADA + TIPO_TRABAJO contiene LOS ROJO; numerador = subconjunto cuyo MOTIVO_FINALIZACION contiene RECABLEADO",numeradorRecableadoSubconjuntoDenominador:true},control,detalle,ordenesCanonicas:unicas};
  }

  async function apiGet(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const url=new URL(API);Object.keys(payload||{}).forEach(k=>{const v=payload[k];if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));});
    url.searchParams.set("_v48710",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio datos validos para V487.10.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo consultar WIN.");return j;
  }
  function listaMapa(r){if(Array.isArray(r&&r.ordenes))return r.ordenes;if(Array.isArray(r&&r.registros))return r.registros;return [];}
  async function consultar(periodo){
    const r=await apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:periodo||""});
    const out=calcular(listaMapa(r));out.periodo=periodo||r.periodo||"";out.actualizadoAl=r.actualizadoAl||r.ultimaActualizacion||"";return out;
  }

  window.mv4876CalcularEfectividadRecableado=calcular;
  window.mv4876ConsultarEfectividadRecableado=consultar;
  window.mv4878CanonicalizarOrdenesWin=canonicalizar;
})();
