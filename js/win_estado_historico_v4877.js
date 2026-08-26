/* ================================================================
   MI VISUAL V487.9 - Motor WIN: estado vigente + historico

   IMPLEMENTACION CONTROLADA
   - OrdenId = llave unica.
   - El estado vigente se decide por FECHA_ULTIMO_ESTADO / FechaUltiEsta.
   - Si empatan, gana FECHA_IMPORTACION mas reciente.
   - Una orden que no viene en una carga nueva NO se borra del historico.
   - RESERVA / ORDEN RESERVADA = PENDIENTE hasta recibir un estado posterior.
   - Partner es apoyo opcional: propone correcciones/observaciones, no pisa WIN.
   - La cuadrilla ejecutora original se conserva aunque exista homologacion.
   - Despues de una importacion WIN valida carga V487.9 y solicita el
     recalculo controlado de Produccion, Efectividad, Recableado y VTR/GAR.
================================================================ */
(function(root){
  "use strict";

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){ return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim(); }
  function id(v){ return txt(v).replace(/\.0+$/,""); }
  function val(o){ for(let i=1;i<arguments.length;i++){ const k=arguments[i]; if(o && o[k] !== undefined && o[k] !== null && txt(o[k]) !== "") return o[k]; } return ""; }

  function fechaMs(v){
    if(v instanceof Date && !isNaN(v.getTime())) return v.getTime();
    const s=txt(v); if(!s) return 0;
    let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?)?/);
    if(m) return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0),+(String(m[7]||"").padEnd(3,"0")||0)).getTime();
    m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?)?/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0),+(String(m[7]||"").padEnd(3,"0")||0)).getTime();
    const d=new Date(s); return isNaN(d.getTime())?0:d.getTime();
  }

  function ordenId(o){ return id(val(o,"ORDEN_ID","OrdenId","ordenId","CODIGO_LIQUIDACION","Código de Liquidación")); }
  function estado(o){ return norm(val(o,"ESTADO","Estado","estado")); }
  function tipoTrabajo(o){ return norm(val(o,"TIPO_TRABAJO","TipoTraba","tipoTrabajo","Tipo de Atención / Paquete de Servicio")); }
  function cuadrilla(o){ return txt(val(o,"CUADRILLA","Cuadrilla","cuadrilla")); }
  function fechaEstadoMs(o){
    return fechaMs(val(o,"FECHA_ULTIMO_ESTADO","FechaUltiEsta","fechaUltimoEstado")) ||
      fechaMs(val(o,"FECHA_FIN_VISITA","FechaFinVisi","fechaFinVisita")) ||
      fechaMs(val(o,"FECHA_INICIO_VISITA","FechaIniVisi","fechaInicioVisita")) ||
      fechaMs(val(o,"FECHA_SOLICITUD","F.Soli","fechaSolicitud","Fecha"));
  }
  function fechaImportacionMs(o){ return fechaMs(val(o,"FECHA_IMPORTACION","fechaImportacion","Fecha Importación")); }

  function compararVersion(a,b){
    const fa=fechaEstadoMs(a), fb=fechaEstadoMs(b);
    if(fa!==fb) return fa>fb?1:-1;
    const ia=fechaImportacionMs(a), ib=fechaImportacionMs(b);
    if(ia!==ib) return ia>ib?1:-1;
    return 0;
  }

  function fusionarHistorico(historico,nuevaCarga){
    const mapa={};
    (historico||[]).forEach(function(raw){
      const k=ordenId(raw); if(!k) return;
      const previo=mapa[k];
      if(!previo || compararVersion(raw,previo)>=0) mapa[k]=Object.assign({},raw,{_presenteUltimaCarga:false,_fuenteVigente:raw._fuenteVigente||"HISTORICO"});
    });
    (nuevaCarga||[]).forEach(function(raw){
      const k=ordenId(raw); if(!k) return;
      const previo=mapa[k];
      if(!previo || compararVersion(raw,previo)>=0){
        const ejecutorOriginal=previo && previo._cuadrillaEjecutoraOriginal ? previo._cuadrillaEjecutoraOriginal : cuadrilla(raw);
        mapa[k]=Object.assign({},previo||{},raw,{_presenteUltimaCarga:true,_fuenteVigente:"WIN",_cuadrillaEjecutoraOriginal:ejecutorOriginal||cuadrilla(raw)});
      }else{
        previo._presenteUltimaCarga=true;
      }
    });
    return Object.keys(mapa).map(function(k){return mapa[k];});
  }

  function motivoReserva(o){
    return norm([
      val(o,"MOTIVO_CANCELACION","Motivo Cancelación","motivoCancelacion"),
      val(o,"MOTIVO_ANULACION","Motivo Anulación","motivoAnulacion"),
      val(o,"DETALLE","Motivo Regestión","motivoRegestion")
    ].join(" "));
  }
  function esReservaPendiente(o){ return (estado(o)==="CANCELADA"||estado(o)==="CANCELADO") && /RESERVA|RESERVAD/.test(motivoReserva(o)); }

  function clasificarEfectividad(o){
    const e=estado(o), t=tipoTrabajo(o);
    if(esReservaPendiente(o)) return "PENDIENTE_RESERVA";
    if((e==="FINALIZADA"||e==="FINALIZADO") && (t==="REITERADA" || t==="GARANTIA")) return "FUERA_VTR_GAR";
    if(e==="FINALIZADA"||e==="FINALIZADO") return "FINALIZADA";
    if(e.indexOf("REGEST")===0) return "REGESTION";
    if(e==="ANULADA"||e==="ANULADO") return "ANULADA";
    if(e==="REPROGRAMADA"||e==="REPROGRAMADO") return "REPROGRAMADA";
    if(e==="CANCELADA"||e==="CANCELADO"){
      const m=norm([val(o,"MOTIVO_CANCELACION","Motivo Cancelación","motivoCancelacion"),val(o,"DETALLE","Motivo Regestión","motivoRegestion")].join(" "));
      return /REPROGRAM|POSTERGA/.test(m)?"REPROGRAMADA":"CANCELADA";
    }
    return "PENDIENTE";
  }

  function clasificarRecableado(o){
    const e=estado(o);
    const aplica=(e==="FINALIZADA"||e==="FINALIZADO") && tipoTrabajo(o).includes("LOS ROJO");
    const rec=aplica && norm(val(o,"MOTIVO_FINALIZACION","Motivo Finalización","motivoFinalizacion","Tipo de Trabajo")).includes("RECABLEADO");
    return {aplica:aplica,recableado:rec};
  }

  function partnerOpcional(ordenes,partner){
    const win={}; (ordenes||[]).forEach(function(o){const k=ordenId(o);if(k)win[k]=o;});
    const observaciones=[];
    (partner||[]).forEach(function(p){
      const k=ordenId(p); if(!k) return;
      const w=win[k];
      if(!w){ observaciones.push({ordenId:k,tipo:"SOLO_PARTNER",accion:"REVISAR",partner:p}); return; }
      const cw=norm(cuadrilla(w)), cp=norm(cuadrilla(p));
      if(cw && cp && cw!==cp) observaciones.push({ordenId:k,tipo:"CUADRILLA_DIFERENTE",accion:"NO_SOBRESCRIBIR_WIN",cuadrillaWin:cuadrilla(w),cuadrillaPartner:cuadrilla(p)});
    });
    return observaciones;
  }

  function homologarCuadrilla(nombre,reglas){
    const n=norm(nombre);
    const r=(reglas||[]).find(function(x){return norm(x.desde)===n;});
    if(!r) return {visible:nombre,ejecutorOriginal:nombre,tipo:"SIN_CAMBIO"};
    if(norm(r.tipo)==="RENOMBRE" || norm(r.tipo)==="CAMBIO NUMERO" || norm(r.tipo)==="HOMOLOGACION"){
      return {visible:r.hasta,ejecutorOriginal:nombre,tipo:norm(r.tipo),unificaIndicadores:true};
    }
    return {visible:r.hasta||nombre,ejecutorOriginal:nombre,tipo:norm(r.tipo)||"REEMPLAZO",unificaIndicadores:false};
  }

  function cargarSincronizador(periodos){
    if(typeof window==="undefined") return;
    const ejecutar=function(){
      if(typeof window.mv4879SincronizarIndicadoresWin==="function"){
        window.mv4879SincronizarIndicadoresWin(periodos||[]).catch(function(error){console.warn("V487.9: no se pudo recalcular indicadores despues de la carga WIN",error);});
      }
    };
    if(typeof window.mv4879SincronizarIndicadoresWin==="function"){ejecutar();return;}
    const existente=Array.from(document.scripts).find(function(s){return s.src&&s.src.includes("indicadores_win_sync_v4879.js");});
    if(existente){existente.addEventListener("load",ejecutar,{once:true});return;}
    const s=document.createElement("script");s.src="./js/indicadores_win_sync_v4879.js?v=V4879-4-INDICADORES";s.async=true;s.onload=ejecutar;s.onerror=function(){console.warn("V487.9: no se pudo cargar el sincronizador de indicadores.");};document.head.appendChild(s);
  }

  const api={fechaMs,ordenId,estado,tipoTrabajo,cuadrilla,fechaEstadoMs,compararVersion,fusionarHistorico,esReservaPendiente,clasificarEfectividad,clasificarRecableado,partnerOpcional,homologarCuadrilla};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MV4877_WIN_ESTADO_HISTORICO=api;

  if(typeof window!=="undefined"&&!window.MV4879_WIN_IMPORT_HOOK_OK){
    window.MV4879_WIN_IMPORT_HOOK_OK=true;
    window.addEventListener("mv487WinImportado",function(e){
      const periodos=e&&e.detail&&Array.isArray(e.detail.periodos)?e.detail.periodos:[];
      cargarSincronizador(periodos);
    });
  }
})(typeof window!=="undefined"?window:globalThis);
