/* ================================================================
   MI VISUAL V487.9 - Compuerta estricta VTR/GAR para Produccion WIN

   IMPLEMENTACION CONTROLADA / SIN ESCRITURAS
   - Detecta VTR/GAR por TIPO_TRABAJO / PRODUCTO_ORIGEN y tambien por
     CODIGO_SEGUIMIENTO VTR-/GAR- cuando WIN no tipifica REITERADA/GARANTIA.
   - La orden FINALIZADA siempre permanece visible en el historial.
   - El reporte se considera confiable solo si coincide tipo + numero de
     ticket y el codigo del cliente es coherente con WIN.
   - Coincidencias debiles quedan como REVISAR CORRESPONDENCIA.
   - VTR/GAR SIEMPRE = 0 puntos de Produccion, sin importar BONO/NO BONO,
     PROPIA/ASIGNADA/MANUAL o estado del reporte.
   - VTR/GAR queda fuera de meta diaria, meta mensual y Ranking-Produccion,
     para cuadrillas y supervisores.
================================================================ */
(function(){
  "use strict";
  if(window.MV4872_PRODUCCION_VTR_GAR_GATE) return;
  window.MV4872_PRODUCCION_VTR_GAR_GATE = true;

  const API=window.MI_VISUAL_API_URL||"";
  const MS_DIA=86400000;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function id(v){return txt(v).replace(/\.0+$/,"");}
  function val(o){for(let i=1;i<arguments.length;i++){const k=arguments[i];if(o&&o[k]!==undefined&&o[k]!==null&&txt(o[k])!=="")return o[k];}return "";}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function fecha(v){
    if(v instanceof Date&&!isNaN(v.getTime()))return v;
    const t=txt(v);if(!t)return null;
    let m=t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m)return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    m=t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m)return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    const d=new Date(t);return isNaN(d.getTime())?null:d;
  }
  function fechaOrden(o){return fecha(val(o,"fechaFinVisita","FECHA_FIN_VISITA","fechaUltimoEstado","FECHA_ULTIMO_ESTADO","fechaSolicitud","FECHA_SOLICITUD"));}
  function distanciaDias(a,b){if(!a||!b)return 9999;return Math.abs(a.getTime()-b.getTime())/MS_DIA;}
  function numerosTicket(v){
    const encontrados=txt(v).match(/\d{6,}/g)||[];
    return Array.from(new Set(encontrados.map(function(x){return x.replace(/^0+/,"")||"0";})));
  }

  async function apiGet(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const url=new URL(API);
    Object.keys(payload||{}).forEach(function(k){const v=payload[k];if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));});
    url.searchParams.set("_v4879",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});
    const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio datos validos para validar VTR/GAR.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo validar VTR/GAR.");
    return j;
  }
  function listaMapa(r){if(Array.isArray(r&&r.ordenes))return r.ordenes;if(Array.isArray(r&&r.registros))return r.registros;return [];}

  function tipoIncidencia(o){
    const t=norm(val(o,"tipoTrabajo","TIPO_TRABAJO"));
    const p=norm(val(o,"productoOrigen","PRODUCTO_ORIGEN"));
    const ticket=norm(val(o,"codigoSeguimiento","CODIGO_SEGUIMIENTO"));
    if(t==="GARANTIA"||p==="GARANTIA")return "GAR";
    if(t==="REITERADA"||p==="REITERADA")return "VTR";
    if(/(?:^|[^A-Z])GAR-/.test(ticket))return "GAR";
    if(/(?:^|[^A-Z])VTR-/.test(ticket))return "VTR";
    return "";
  }

  function normalizarMapa(raw){
    const ticket=txt(val(raw,"codigoSeguimiento","CODIGO_SEGUIMIENTO"));
    return {
      ordenId:id(val(raw,"ordenId","ORDEN_ID")),tipo:tipoIncidencia(raw),
      codigo:id(val(raw,"codigoCliente","CODIGO_CLIENTE")),dni:id(val(raw,"numeroDocumento","NUMERO_DOCUMENTO")),
      estado:norm(val(raw,"estado","ESTADO")),fecha:fechaOrden(raw),ticket:ticket,tickets:numerosTicket(ticket),raw:raw
    };
  }
  function normalizarValidacion(v){
    const ticket=txt(val(v,"ticketFinal","TICKET_FINAL"));
    return {
      id:txt(val(v,"id","ID")),tipo:norm(val(v,"tipoValidacion","TIPO_VALIDACION")),codigo:id(val(v,"codigo","CODIGO")),
      dni:id(val(v,"dniCliente","DNI_CLIENTE","numeroDocumento","NUMERO_DOCUMENTO")),ticket:ticket,tickets:numerosTicket(ticket),
      estado:norm(val(v,"resultadoFinal","RESULTADO_FINAL","estado","ESTADO")),fecha:fecha(val(v,"fechaRegistro","FECHA_REGISTRO")),
      cuadrilla:txt(val(v,"cuadrilla","CUADRILLA")),raw:v
    };
  }

  function construirIndices(validaciones){
    const porTicket={},porCodigo={};
    validaciones.forEach(function(v){
      if(v.tipo!=="VTR"&&v.tipo!=="GAR")return;
      v.tickets.forEach(function(n){const k=v.tipo+"|"+n;if(!porTicket[k])porTicket[k]=[];porTicket[k].push(v);});
      if(v.codigo){const k=v.tipo+"|"+v.codigo;if(!porCodigo[k])porCodigo[k]=[];porCodigo[k].push(v);}
    });
    return {porTicket:porTicket,porCodigo:porCodigo};
  }
  function ordenarCercania(lista,inc){
    return lista.slice().sort(function(a,b){
      const da=distanciaDias(inc.fecha,a.fecha),db=distanciaDias(inc.fecha,b.fecha);
      if(da!==db)return da-db;
      return (b.fecha?b.fecha.getTime():0)-(a.fecha?a.fecha.getTime():0);
    });
  }
  function elegirReporte(inc,indices){
    let exactos=[];
    inc.tickets.forEach(function(n){exactos=exactos.concat(indices.porTicket[inc.tipo+"|"+n]||[]);});
    exactos=Array.from(new Map(exactos.map(function(v){return [v.id||v.ticket,v];})).values());
    if(exactos.length){
      const compatibles=exactos.filter(function(v){return !inc.codigo||!v.codigo||inc.codigo===v.codigo;});
      if(compatibles.length){
        const v=ordenarCercania(compatibles,inc)[0];
        return {validacion:v,seguro:true,tipo:"TICKET + CODIGO"};
      }
      return {validacion:ordenarCercania(exactos,inc)[0],seguro:false,tipo:"TICKET COINCIDE / CODIGO NO COINCIDE"};
    }
    const porCodigo=(indices.porCodigo[inc.tipo+"|"+inc.codigo]||[]).filter(function(v){return !inc.fecha||!v.fecha||distanciaDias(inc.fecha,v.fecha)<=3;});
    if(porCodigo.length)return {validacion:ordenarCercania(porCodigo,inc)[0],seguro:false,tipo:"CODIGO COINCIDE / TICKET NO COINCIDE"};
    return {validacion:null,seguro:false,tipo:"SIN REPORTE"};
  }

  function excluirProduccion(x,puntosBase){
    x.puntosBaseVtrGar=puntosBase;
    x.excluidaProduccion=true;
    x.excluidaMetaDiaria=true;
    x.excluidaMetaMensual=true;
    x.excluidaRankingProduccion=true;
    x.puntosProduccionVtrGar=0;
    x.puntos=0;
  }

  function recomputarComparacion(resultado){
    const nuevos={};(resultado.detalle||[]).forEach(function(x){const k=[x.sede||"SIN SEDE",x.cuadrillaWin||x.cuadrillaEjecutora||"",x.fecha||""].join("|");nuevos[k]=(nuevos[k]||0)+Number(x.puntos||0);});
    const actuales={};(resultado.comparacionDiaria||[]).forEach(function(x){actuales[[x.sede||"SIN SEDE",x.cuadrilla||"",x.fecha||""].join("|")]=Number(x.puntosActuales||0);});
    const claves={};Object.keys(actuales).forEach(function(k){claves[k]=true;});Object.keys(nuevos).forEach(function(k){claves[k]=true;});
    resultado.comparacionDiaria=Object.keys(claves).sort().map(function(k){const p=k.split("|"),a=Number(actuales[k]||0),n=Number(nuevos[k]||0);return {sede:p[0],cuadrilla:p[1],fecha:p[2],puntosActuales:a,puntosNuevos:n,diferencia:n-a};});
  }

  async function aplicar(resultado,periodo){
    if(!resultado||!Array.isArray(resultado.detalle))return resultado;
    const respuestas=await Promise.all([
      apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:periodo}),
      apiGet({accion:"listarValidacionTecnica",usuario:usuario()})
    ]);
    const mapa={};listaMapa(respuestas[0]).forEach(function(raw){const o=normalizarMapa(raw);if(o.ordenId)mapa[o.ordenId]=o;});
    const validaciones=(Array.isArray(respuestas[1].validaciones)?respuestas[1].validaciones:[]).map(normalizarValidacion);
    const indices=construirIndices(validaciones);
    let detectadas=0,reportadasSeguras=0,sinReporte=0,revisar=0,bono=0,noBonoOPendiente=0;

    (resultado.detalle||[]).forEach(function(x){
      const inc=mapa[id(x.ordenId)];
      if(!inc||!inc.tipo||inc.estado.indexOf("FINALIZ")<0){
        x.esVtrGar=false;x.estadoConsideracion="CONSIDERADA";x.detalleConsideracion="REGLA NORMAL";return;
      }

      detectadas++;
      const match=elegirReporte(inc,indices),reporte=match.validacion,puntosBase=Number(x.puntos||0);
      x.esVtrGar=true;
      x.tipoVtrGar=inc.tipo;
      x.ticketWinVtrGar=inc.ticket;
      x.reporteDetectadoVtrGar=!!reporte;
      x.reporteSeguroVtrGar=!!(reporte&&match.seguro);
      x.correspondenciaReporteVtrGar=match.tipo;
      x.reportadaVtrGar=!!(reporte&&match.seguro);
      x.idReporteVtrGar=reporte?reporte.id:"";
      x.ticketReporteVtrGar=reporte?reporte.ticket:"";
      x.resultadoReporteVtrGar=reporte?reporte.estado:"SIN REPORTE";
      excluirProduccion(x,puntosBase);

      if(!reporte){
        sinReporte++;
        x.validadaControlVtrGar=false;
        x.estadoConsideracion="NO PRODUCCION";
        x.detalleConsideracion="SIN REPORTE · 0 PTS PRODUCCION";
        x.motivoConsideracion="VTR/GAR FINALIZADA en WIN sin reporte del tecnico. Permanece visible y aporta 0 puntos de Produccion.";
        x.requiereIntervencion=true;
      }else if(!match.seguro){
        revisar++;
        x.validadaControlVtrGar=false;
        x.estadoConsideracion="NO PRODUCCION";
        x.detalleConsideracion="REVISAR CORRESPONDENCIA · 0 PTS PRODUCCION";
        x.motivoConsideracion=match.tipo+". Requiere revision VTR/GAR y aporta 0 puntos de Produccion.";
        x.requiereIntervencion=true;
      }else{
        reportadasSeguras++;
        x.validadaControlVtrGar=true;
        x.estadoConsideracion="NO PRODUCCION";
        if(reporte.estado==="BONO"){
          bono++;
          x.detalleConsideracion="BONO VALIDADO · 0 PTS PRODUCCION";
          x.motivoConsideracion="Reporte VTR/GAR confirmado por ticket y codigo. BONO solo aplica al control VTR/GAR; Produccion permanece en 0.";
        }else{
          noBonoOPendiente++;
          x.detalleConsideracion=(reporte.estado||"PENDIENTE VALIDACION")+" · 0 PTS PRODUCCION";
          x.motivoConsideracion="Reporte VTR/GAR confirmado. Su estado solo afecta el control VTR/GAR; Produccion permanece en 0.";
          x.requiereIntervencion=true;
        }
      }
    });

    const puntosNuevos=(resultado.detalle||[]).reduce(function(s,x){return s+Number(x.puntos||0);},0);
    resultado.resumen=resultado.resumen||{};
    resultado.resumen.puntosNuevos=puntosNuevos;
    resultado.resumen.diferenciaPuntos=puntosNuevos-Number(resultado.resumen.puntosActuales||0);
    resultado.resumen.vtrGarDetectadas=detectadas;
    resultado.resumen.vtrGarReportadas=reportadasSeguras;
    resultado.resumen.vtrGarSinReporte=sinReporte;
    resultado.resumen.vtrGarRevisarCorrespondencia=revisar;
    resultado.resumen.vtrGarBonosControl=bono;
    resultado.resumen.vtrGarNoBonoOPendiente=noBonoOPendiente;
    resultado.resumen.vtrGarValidadasControl=reportadasSeguras;
    resultado.resumen.vtrGarPuntosProduccion=0;

    resultado.reglaVtrGar={
      version:"V487.9",
      soloLectura:true,
      visibleSinReporte:true,
      detectaPorTipoOTicketWin:true,
      exigeTicketYCodigo:true,
      fuenteIncidencia:"WIN / MAPA_ORDENES",
      fuenteReporte:"VALIDACION_TECNICA",
      siempreCeroProduccion:true,
      excluidaMetaDiaria:true,
      excluidaMetaMensual:true,
      excluidaRankingProduccion:true,
      aplicaCuadrilla:true,
      aplicaSupervisor:true
    };
    recomputarComparacion(resultado);
    return resultado;
  }

  window.mv4872AplicarReglaVtrGar=aplicar;
})();
