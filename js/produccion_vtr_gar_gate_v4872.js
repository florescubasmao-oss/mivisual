/* ================================================================
   MI VISUAL V487.2 - Regla VTR/GAR para Producción WIN paralela

   SOLO LECTURA
   - La orden FINALIZADA de WIN siempre permanece visible en el historial.
   - REITERADA = VTR y GARANTIA = GAR.
   - Para sumar puntos debe existir reporte en VALIDACION_TECNICA y
     RESULTADO_FINAL = BONO.
   - Sin reporte: NO CONSIDERADA - SIN REPORTE, 0 puntos.
   - Reportada pero pendiente/NO BONO: permanece visible, 0 puntos.
   - No escribe ninguna hoja ni modifica V486.
================================================================ */
(function(){
  "use strict";
  if(window.MV4872_PRODUCCION_VTR_GAR_GATE) return;
  window.MV4872_PRODUCCION_VTR_GAR_GATE = true;

  const API = window.MI_VISUAL_API_URL || "";
  const MS_DIA = 86400000;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function id(v){ return txt(v).replace(/\.0+$/,""); }
  function fecha(v){
    if(v instanceof Date && !isNaN(v.getTime())) return v;
    const t=txt(v); if(!t) return null;
    let m=t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    m=t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m) return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    const d=new Date(t); return isNaN(d.getTime())?null:d;
  }
  function val(o){
    for(let i=1;i<arguments.length;i++){
      const k=arguments[i];
      if(o && o[k] !== undefined && o[k] !== null && txt(o[k]) !== "") return o[k];
    }
    return "";
  }
  function usuario(){ return localStorage.getItem("usuario") || localStorage.getItem("correo") || ""; }

  async function apiGet(payload){
    if(!API) throw new Error("No se encontró la URL de MI VISUAL.");
    const url=new URL(API);
    Object.keys(payload||{}).forEach(function(k){
      const v=payload[k];
      if(v!==undefined && v!==null && v!=="") url.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));
    });
    url.searchParams.set("_v4872",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});
    const t=await r.text(); let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvió datos válidos para validar VTR/GAR.");}
    if(!j || j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo validar VTR/GAR.");
    return j;
  }

  function listaMapa(r){
    if(Array.isArray(r&&r.ordenes)) return r.ordenes;
    if(Array.isArray(r&&r.registros)) return r.registros;
    return [];
  }

  function tipoIncidencia(o){
    const t=norm(val(o,"tipoTrabajo","TIPO_TRABAJO"));
    const p=norm(val(o,"productoOrigen","PRODUCTO_ORIGEN"));
    if(t==="REITERADA" || p==="REITERADA") return "VTR";
    if(t==="GARANTIA" || p==="GARANTIA") return "GAR";
    return "";
  }

  function fechaOrden(o){
    return fecha(val(o,"fechaFinVisita","FECHA_FIN_VISITA","fechaUltimoEstado","FECHA_ULTIMO_ESTADO","fechaSolicitud","FECHA_SOLICITUD"));
  }

  function normalizarMapa(raw){
    return {
      ordenId:id(val(raw,"ordenId","ORDEN_ID")),
      tipo:tipoIncidencia(raw),
      codigo:id(val(raw,"codigoCliente","CODIGO_CLIENTE")),
      dni:id(val(raw,"numeroDocumento","NUMERO_DOCUMENTO")),
      estado:norm(val(raw,"estado","ESTADO")),
      fecha:fechaOrden(raw),
      raw:raw
    };
  }

  function normalizarValidacion(v){
    return {
      id:txt(val(v,"id","ID")),
      tipo:norm(val(v,"tipoValidacion","TIPO_VALIDACION")),
      codigo:id(val(v,"codigo","CODIGO")),
      dni:id(val(v,"dniCliente","DNI_CLIENTE","numeroDocumento","NUMERO_DOCUMENTO")),
      ticket:txt(val(v,"ticketFinal","TICKET_FINAL")),
      estado:norm(val(v,"resultadoFinal","RESULTADO_FINAL","estado","ESTADO")),
      fecha:fecha(val(v,"fechaRegistro","FECHA_REGISTRO")),
      cuadrilla:txt(val(v,"cuadrilla","CUADRILLA")),
      raw:v
    };
  }

  function construirIndices(validaciones){
    const porCodigo={}, porDni={};
    validaciones.forEach(function(v){
      if(v.tipo!=="VTR" && v.tipo!=="GAR") return;
      if(v.codigo){
        const k=v.tipo+"|"+v.codigo;
        if(!porCodigo[k]) porCodigo[k]=[];
        porCodigo[k].push(v);
      }
      if(v.dni){
        const k=v.tipo+"|"+v.dni;
        if(!porDni[k]) porDni[k]=[];
        porDni[k].push(v);
      }
    });
    return {porCodigo:porCodigo,porDni:porDni};
  }

  function distanciaDias(a,b){
    if(!a||!b)return 9999;
    return Math.abs(a.getTime()-b.getTime())/MS_DIA;
  }

  function elegirReporte(inc,indices){
    let candidatos=[];
    if(inc.codigo) candidatos=(indices.porCodigo[inc.tipo+"|"+inc.codigo]||[]).slice();
    if(!candidatos.length && inc.dni) candidatos=(indices.porDni[inc.tipo+"|"+inc.dni]||[]).slice();
    if(!candidatos.length) return null;

    const cercanos=candidatos.filter(function(v){
      if(!inc.fecha || !v.fecha) return true;
      return distanciaDias(inc.fecha,v.fecha)<=3;
    });
    if(!cercanos.length) return null;

    cercanos.sort(function(a,b){
      const da=distanciaDias(inc.fecha,a.fecha), db=distanciaDias(inc.fecha,b.fecha);
      if(da!==db) return da-db;
      return (b.fecha?b.fecha.getTime():0)-(a.fecha?a.fecha.getTime():0);
    });
    return cercanos[0];
  }

  function reglaReporte(reporte){
    if(!reporte){
      return {estado:"NO CONSIDERADA",detalle:"SIN REPORTE",motivo:"Trabajo FINALIZADO en WIN, pero el técnico no lo reportó en Validación Técnica.",habilita:false};
    }
    if(reporte.estado==="BONO"){
      return {estado:"CONSIDERADA",detalle:"BONO VALIDADO",motivo:"Reportada en Validación Técnica y validada como BONO.",habilita:true};
    }
    if(reporte.estado==="NO BONO" || reporte.estado==="RECHAZADO" || reporte.estado==="OBSERVADO"){
      return {estado:"NO CONSIDERADA",detalle:reporte.estado,motivo:"La VTR/GAR fue reportada, pero no fue validada para bono.",habilita:false};
    }
    return {estado:"NO CONSIDERADA",detalle:"PENDIENTE VALIDACIÓN",motivo:"La VTR/GAR fue reportada, pero aún no tiene resultado final BONO.",habilita:false};
  }

  function recomputarComparacion(resultado){
    const nuevos={};
    (resultado.detalle||[]).forEach(function(x){
      const clave=[x.sede||"SIN SEDE",x.cuadrillaWin||x.cuadrillaEjecutora||"",x.fecha||""].join("|");
      nuevos[clave]=(nuevos[clave]||0)+Number(x.puntos||0);
    });

    const actuales={};
    (resultado.comparacionDiaria||[]).forEach(function(x){
      actuales[[x.sede||"SIN SEDE",x.cuadrilla||"",x.fecha||""].join("|")]=Number(x.puntosActuales||0);
    });

    const claves={};
    Object.keys(actuales).forEach(function(k){claves[k]=true;});
    Object.keys(nuevos).forEach(function(k){claves[k]=true;});
    resultado.comparacionDiaria=Object.keys(claves).sort().map(function(k){
      const p=k.split("|"), a=Number(actuales[k]||0), n=Number(nuevos[k]||0);
      return {sede:p[0],cuadrilla:p[1],fecha:p[2],puntosActuales:a,puntosNuevos:n,diferencia:n-a};
    });
  }

  async function aplicar(resultado,periodo){
    if(!resultado || !Array.isArray(resultado.detalle)) return resultado;
    const respuestas=await Promise.all([
      apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:periodo}),
      apiGet({accion:"listarValidacionTecnica",usuario:usuario()})
    ]);

    const mapa={};
    listaMapa(respuestas[0]).forEach(function(raw){
      const o=normalizarMapa(raw);
      if(o.ordenId) mapa[o.ordenId]=o;
    });
    const validaciones=(Array.isArray(respuestas[1].validaciones)?respuestas[1].validaciones:[]).map(normalizarValidacion);
    const indices=construirIndices(validaciones);

    let detectadas=0, reportadas=0, sinReporte=0, habilitadas=0, noConsideradas=0, pendientes=0;
    (resultado.detalle||[]).forEach(function(x){
      const inc=mapa[id(x.ordenId)];
      if(!inc || !inc.tipo || inc.estado.indexOf("FINALIZ")<0){
        x.esVtrGar=false;
        x.estadoConsideracion="CONSIDERADA";
        x.detalleConsideracion="REGLA NORMAL";
        return;
      }

      detectadas++;
      const reporte=elegirReporte(inc,indices);
      const regla=reglaReporte(reporte);
      const puntosBase=Number(x.puntos||0);
      x.esVtrGar=true;
      x.tipoVtrGar=inc.tipo;
      x.puntosBaseVtrGar=puntosBase;
      x.reportadaVtrGar=!!reporte;
      x.idReporteVtrGar=reporte?reporte.id:"";
      x.ticketReporteVtrGar=reporte?reporte.ticket:"";
      x.resultadoReporteVtrGar=reporte?reporte.estado:"SIN REPORTE";
      x.estadoConsideracion=regla.estado;
      x.detalleConsideracion=regla.detalle;
      x.motivoConsideracion=regla.motivo;
      x.puntos=regla.habilita?puntosBase:0;
      x.requiereIntervencion=x.requiereIntervencion || !regla.habilita;

      if(reporte) reportadas++; else sinReporte++;
      if(regla.habilita) habilitadas++;
      else {
        noConsideradas++;
        if(reporte && regla.detalle==="PENDIENTE VALIDACIÓN") pendientes++;
      }
    });

    const puntosNuevos=(resultado.detalle||[]).reduce(function(s,x){return s+Number(x.puntos||0);},0);
    resultado.resumen=resultado.resumen||{};
    resultado.resumen.puntosNuevos=puntosNuevos;
    resultado.resumen.diferenciaPuntos=puntosNuevos-Number(resultado.resumen.puntosActuales||0);
    resultado.resumen.vtrGarDetectadas=detectadas;
    resultado.resumen.vtrGarReportadas=reportadas;
    resultado.resumen.vtrGarSinReporte=sinReporte;
    resultado.resumen.vtrGarHabilitadas=habilitadas;
    resultado.resumen.vtrGarNoConsideradas=noConsideradas;
    resultado.resumen.vtrGarPendientes=pendientes;
    resultado.reglaVtrGar={
      version:"V487.2",
      soloLectura:true,
      visibleSinReporte:true,
      sumaSoloConBono:true,
      fuenteIncidencia:"WIN / MAPA_ORDENES",
      fuenteReporte:"VALIDACION_TECNICA"
    };
    recomputarComparacion(resultado);
    return resultado;
  }

  window.mv4872AplicarReglaVtrGar=aplicar;
})();
