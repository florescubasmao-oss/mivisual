/* ================================================================
   MI VISUAL V487.6 - Origen PROPIA / ASIGNADA para VTR/GAR

   SOLO LECTURA
   - Complementa la compuerta V487.5 sin modificar V486 ni hojas.
   - Busca la atencion FINALIZADA inmediatamente anterior del mismo cliente
     dentro de los 30 dias previos.
   - Misma cuadrilla = PROPIA. Cuadrilla distinta = ASIGNADA.
   - Sin antecedente confiable = MANUAL.
   - La validacion BONO / NO BONO se conserva exclusivamente para VTR/GAR.
   - VTR y GAR SIEMPRE aportan 0 puntos a Produccion, meta diaria,
     meta mensual y Ranking-Produccion, para cuadrillas y supervisores.
   - El indicador VTR/GAR se atribuye a la cuadrilla de la atencion anterior.
================================================================ */
(function(){
  "use strict";
  if(window.MV4873_ORIGEN_VTR_GAR) return;
  window.MV4873_ORIGEN_VTR_GAR = true;

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
  function claveCuadrilla(v){
    const n=norm(v),p=n.match(/(?:^|\s)P\s*(\d+)(?:\s|$)/);let plataforma="";
    if(n.includes("TRASLADO"))plataforma="TRASLADO";else if(n.includes("SGA"))plataforma="SGA";else if(n.includes("SGI"))plataforma="SGI";
    return p?`P${Number(p[1])}|${plataforma}`:n;
  }
  function periodoAnterior(periodo){
    const m=String(periodo||"").match(/^(\d{4})-(\d{2})$/);if(!m)return "";
    const d=new Date(+m[1],+m[2]-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  async function apiGet(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const url=new URL(API);Object.keys(payload||{}).forEach(k=>{const v=payload[k];if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));});
    url.searchParams.set("_v4876",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio datos validos para determinar origen VTR/GAR.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo determinar origen VTR/GAR.");return j;
  }
  function listaMapa(r){if(Array.isArray(r&&r.ordenes))return r.ordenes;if(Array.isArray(r&&r.registros))return r.registros;return [];}
  function normalizarMapa(raw){return {
    ordenId:id(val(raw,"ordenId","ORDEN_ID")),codigo:id(val(raw,"codigoCliente","CODIGO_CLIENTE")),dni:id(val(raw,"numeroDocumento","NUMERO_DOCUMENTO")),
    cuadrilla:txt(val(raw,"cuadrilla","CUADRILLA")),estado:norm(val(raw,"estado","ESTADO")),fecha:fechaOrden(raw),
    tipoTrabajo:txt(val(raw,"tipoTrabajo","TIPO_TRABAJO")),motivo:txt(val(raw,"motivoFinalizacion","MOTIVO_FINALIZACION"))
  };}
  function mismaPersona(a,b){if(a.codigo&&b.codigo)return a.codigo===b.codigo;return !!(a.dni&&b.dni&&a.dni===b.dni);}
  function buscarOrigen(inc,ordenes){
    if(!inc||!inc.fecha)return {origen:"MANUAL",motivo:"Incidencia sin fecha valida."};
    const fin=inc.fecha.getTime(),inicio=fin-30*MS_DIA;
    const candidatos=ordenes.filter(o=>o.ordenId&&o.ordenId!==inc.ordenId&&o.estado.includes("FINALIZ")&&o.fecha&&o.fecha.getTime()<fin&&o.fecha.getTime()>=inicio&&mismaPersona(inc,o)).sort((a,b)=>b.fecha.getTime()-a.fecha.getTime());
    if(!candidatos.length)return {origen:"MANUAL",motivo:"Sin atencion FINALIZADA anterior confiable dentro de 30 dias."};
    const ant=candidatos[0],propia=claveCuadrilla(ant.cuadrilla)===claveCuadrilla(inc.cuadrilla);
    return {origen:propia?"PROPIA":"ASIGNADA",anterior:ant,dias:Math.max(0,Math.floor((fin-ant.fecha.getTime())/MS_DIA)),motivo:"Atencion FINALIZADA inmediatamente anterior del mismo cliente dentro de 30 dias."};
  }
  function aplicarReglaOrigen(x,origen){
    const estadoReporte=norm(x.resultadoReporteVtrGar||"");
    x.excluidaProduccion=true;
    x.excluidaMetaDiaria=true;
    x.excluidaMetaMensual=true;
    x.excluidaRankingProduccion=true;
    x.puntosProduccionVtrGar=0;
    x.puntos=0;

    if(!x.reportadaVtrGar){
      x.habilitadaVtrGar=false;x.estadoConsideracion="NO CONSIDERADA";x.detalleConsideracion="SIN REPORTE";x.motivoConsideracion="VTR/GAR FINALIZADA en WIN, visible en historial, pero sin reporte del tecnico. No suma Produccion.";return;
    }
    if(origen==="MANUAL"){
      x.habilitadaVtrGar=false;x.estadoConsideracion="NO CONSIDERADA";x.detalleConsideracion="PENDIENTE ORIGEN MANUAL";x.motivoConsideracion="Fue reportada, pero no se pudo confirmar si es PROPIA o ASIGNADA. No suma Produccion.";return;
    }
    if(origen==="ASIGNADA"){
      if(estadoReporte==="RECHAZADO"||estadoReporte==="OBSERVADO"){
        x.habilitadaVtrGar=false;x.estadoConsideracion="NO CONSIDERADA";x.detalleConsideracion=estadoReporte;x.motivoConsideracion="ASIGNADA reportada, pero el registro esta "+estadoReporte+". No suma Produccion.";return;
      }
      if(estadoReporte==="NO BONO"){
        x.habilitadaVtrGar=false;x.estadoConsideracion="NO CONSIDERADA";x.detalleConsideracion="REVISAR NO BONO LEGACY";x.motivoConsideracion="ASIGNADA reportada con NO BONO previo; requiere revision dentro de VTR/GAR. No suma Produccion.";return;
      }
      x.habilitadaVtrGar=true;x.estadoConsideracion="VALIDADA VTR/GAR";x.detalleConsideracion="ASIGNADA REPORTADA";x.motivoConsideracion="ASIGNADA confirmada y reportada. Valida solo para control VTR/GAR; 0 puntos de Produccion.";return;
    }
    if(estadoReporte==="BONO"){
      x.habilitadaVtrGar=true;x.estadoConsideracion="VALIDADA VTR/GAR";x.detalleConsideracion="PROPIA · BONO VALIDADO";x.motivoConsideracion="PROPIA reportada y validada como BONO. Valida solo para control VTR/GAR; 0 puntos de Produccion.";return;
    }
    if(estadoReporte==="NO BONO"||estadoReporte==="RECHAZADO"||estadoReporte==="OBSERVADO"){
      x.habilitadaVtrGar=false;x.estadoConsideracion="NO CONSIDERADA";x.detalleConsideracion="PROPIA · "+estadoReporte;x.motivoConsideracion="PROPIA reportada pero no habilitada para bono. 0 puntos de Produccion.";return;
    }
    x.habilitadaVtrGar=false;x.estadoConsideracion="NO CONSIDERADA";x.detalleConsideracion="PROPIA · PENDIENTE VALIDACION";x.motivoConsideracion="PROPIA reportada; requiere validacion BONO / NO BONO. 0 puntos de Produccion.";
  }
  function recomputar(resultado){
    const nuevos={};(resultado.detalle||[]).forEach(x=>{const k=[x.sede||"SIN SEDE",x.cuadrillaWin||x.cuadrillaEjecutora||"",x.fecha||""].join("|");nuevos[k]=(nuevos[k]||0)+Number(x.puntos||0);});
    const actuales={};(resultado.comparacionDiaria||[]).forEach(x=>{actuales[[x.sede||"SIN SEDE",x.cuadrilla||"",x.fecha||""].join("|")]=Number(x.puntosActuales||0);});
    const claves={};Object.keys(actuales).forEach(k=>claves[k]=true);Object.keys(nuevos).forEach(k=>claves[k]=true);
    resultado.comparacionDiaria=Object.keys(claves).sort().map(k=>{const p=k.split("|"),a=Number(actuales[k]||0),n=Number(nuevos[k]||0);return {sede:p[0],cuadrilla:p[1],fecha:p[2],puntosActuales:a,puntosNuevos:n,diferencia:n-a};});
    const puntosNuevos=(resultado.detalle||[]).reduce((s,x)=>s+Number(x.puntos||0),0);resultado.resumen=resultado.resumen||{};resultado.resumen.puntosNuevos=puntosNuevos;resultado.resumen.diferenciaPuntos=puntosNuevos-Number(resultado.resumen.puntosActuales||0);
  }

  async function aplicar(resultado,periodo){
    if(!resultado||!Array.isArray(resultado.detalle))return resultado;
    const prev=periodoAnterior(periodo);const respuestas=await Promise.all([apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:periodo}),prev?apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:prev}):Promise.resolve({ok:true,ordenes:[]})]);
    const mapa={},ordenes=[];respuestas.forEach(r=>listaMapa(r).forEach(raw=>{const o=normalizarMapa(raw);if(!o.ordenId)return;mapa[o.ordenId]=o;}));Object.keys(mapa).forEach(k=>ordenes.push(mapa[k]));
    let propias=0,asignadas=0,manuales=0,habilitadas=0,noConsideradas=0;
    (resultado.detalle||[]).forEach(x=>{
      if(!x.esVtrGar)return;
      const inc=mapa[id(x.ordenId)]||{ordenId:id(x.ordenId),codigo:id(x.codigoPedido),dni:id(x.dni),cuadrilla:txt(x.cuadrillaWin),estado:"FINALIZADA",fecha:fecha(x.fecha)};
      const o=buscarOrigen(inc,ordenes);x.origenVtrGar=o.origen;x.cuadrillaOrigenVtrGar=o.anterior?o.anterior.cuadrilla:"";x.ordenOrigenVtrGar=o.anterior?o.anterior.ordenId:"";x.fechaOrigenVtrGar=o.anterior&&o.anterior.fecha?o.anterior.fecha.toLocaleDateString("es-PE"):"";x.diasOrigenVtrGar=o.dias;x.motivoOrigenVtrGar=o.motivo;x.afectaIndicadorVtrGar=o.origen!=="MANUAL"&&!!x.cuadrillaOrigenVtrGar;
      aplicarReglaOrigen(x,o.origen);x.requiereIntervencion=x.requiereIntervencion||o.origen==="MANUAL"||!x.habilitadaVtrGar;
      if(o.origen==="PROPIA")propias++;else if(o.origen==="ASIGNADA")asignadas++;else manuales++;
      if(x.habilitadaVtrGar)habilitadas++;else noConsideradas++;
    });
    resultado.resumen=resultado.resumen||{};resultado.resumen.vtrGarPropias=propias;resultado.resumen.vtrGarAsignadas=asignadas;resultado.resumen.vtrGarOrigenManual=manuales;resultado.resumen.vtrGarHabilitadas=habilitadas;resultado.resumen.vtrGarNoConsideradas=noConsideradas;resultado.resumen.vtrGarPuntosProduccion=0;
    resultado.reglaVtrGar=Object.assign({},resultado.reglaVtrGar||{},{version:"V487.6",clasificaOrigen30Dias:true,asignadaReportadaAutomatica:true,propiaRequiereBono:true,indicadorCuadrillaOrigen:true,excluidaProduccion:true,excluidaMetaDiaria:true,excluidaMetaMensual:true,excluidaRankingProduccion:true,aplicaCuadrilla:true,aplicaSupervisor:true});recomputar(resultado);return resultado;
  }

  window.mv4873AplicarOrigenVtrGar=aplicar;
})();
