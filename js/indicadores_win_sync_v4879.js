/* ================================================================
   MI VISUAL V487.9 - Orquestador WIN de los 4 indicadores

   FASE DE IMPLEMENTACION CONTROLADA
   - Consolida Produccion, Efectividad, % Recableado y VTR/GAR desde WIN.
   - Reutiliza las reglas V487 ya validadas y no duplica logica visual.
   - No escribe hojas oficiales por si solo. Produce un resultado unico para
     comparar antes de activar la publicacion backend definitiva.
   - Se puede ejecutar despues de cada importacion WIN; usa debounce para no
     repetir calculos pesados si llegan varias notificaciones seguidas.
================================================================ */
(function(){
  "use strict";
  if(window.MV4879_INDICADORES_WIN_SYNC_OK)return;
  window.MV4879_INDICADORES_WIN_SYNC_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const MS_DIA=86400000;
  const PROMESAS={};
  let timer=null;
  let pendientes=new Set();
  let ultima=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function id(v){return txt(v).replace(/\.0+$/,"");}
  function val(o){for(let i=1;i<arguments.length;i++){const k=arguments[i];if(o&&o[k]!==undefined&&o[k]!==null&&txt(o[k])!=="")return o[k];}return "";}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function claveCuadrilla(v){return norm(v);}

  function periodoActual(){
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}`;
  }
  function periodoAnterior(periodo){
    const m=txt(periodo).match(/^(\d{4})-(\d{2})$/);if(!m)return "";
    const d=new Date(+m[1],+m[2]-2,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function fecha(v){
    if(v instanceof Date&&!isNaN(v.getTime()))return v;
    const s=txt(v);if(!s)return null;
    let m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m)return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(m)return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));
    const d=new Date(s);return isNaN(d.getTime())?null:d;
  }
  function fechaOrden(o){
    const motor=window.MV4877_WIN_ESTADO_HISTORICO;
    if(motor&&typeof motor.fechaEstadoMs==="function"){
      const ms=motor.fechaEstadoMs(o);if(ms)return new Date(ms);
    }
    return fecha(val(o,"fechaUltimoEstado","FECHA_ULTIMO_ESTADO","FechaUltiEsta"))||fecha(val(o,"fechaFinVisita","FECHA_FIN_VISITA","FechaFinVisi"))||fecha(val(o,"fechaInicioVisita","FECHA_INICIO_VISITA","FechaIniVisi"))||fecha(val(o,"fechaSolicitud","FECHA_SOLICITUD","F.Soli"));
  }

  function cargarScript(src,globalName){
    if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
    if(PROMESAS[src])return PROMESAS[src];
    PROMESAS[src]=new Promise((resolve,reject)=>{
      const existe=Array.from(document.scripts).find(s=>s.src&&s.src.includes(src.split("?")[0].replace(/^\.\//,"")));
      if(existe){
        const limite=Date.now()+8000,t=setInterval(()=>{if(!globalName||window[globalName]){clearInterval(t);resolve(globalName?window[globalName]:true);}else if(Date.now()>limite){clearInterval(t);reject(new Error(`No se habilito ${globalName||src}`));}},50);return;
      }
      const s=document.createElement("script");s.src=src;s.async=true;
      s.onload=()=>!globalName||window[globalName]?resolve(globalName?window[globalName]:true):reject(new Error(`No se habilito ${globalName||src}`));
      s.onerror=()=>reject(new Error(`No se pudo cargar ${src}`));document.head.appendChild(s);
    }).catch(e=>{delete PROMESAS[src];throw e;});
    return PROMESAS[src];
  }

  async function dependencias(){
    await cargarScript("./js/win_estado_historico_v4877.js?v=V4879","MV4877_WIN_ESTADO_HISTORICO");
    await cargarScript("./js/efectividad_recableado_win_v4876.js?v=V4879","MV4876_EFECTIVIDAD_RECABLEADO_WIN");
    await cargarScript("./js/produccion_vtr_gar_gate_v4872.js?v=V4879-CERO-PRODUCCION","MV4872_PRODUCCION_VTR_GAR_GATE");
    await cargarScript("./js/produccion_vtr_gar_origen_v4873.js?v=V4879-CERO-PRODUCCION","MV4873_ORIGEN_VTR_GAR");
  }

  async function apiGet(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const url=new URL(API);Object.keys(payload||{}).forEach(k=>{const v=payload[k];if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));});url.searchParams.set("_v4879",Date.now());
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio JSON en V487.9.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo consultar WIN.");return j;
  }
  async function apiPost(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio JSON para Produccion V487.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo calcular Produccion V487.");return j;
  }
  function listaMapa(r){if(Array.isArray(r&&r.ordenes))return r.ordenes;if(Array.isArray(r&&r.registros))return r.registros;return [];}

  async function produccionPeriodo(periodo){
    const base=await apiPost({accion:"previsualizarProduccionWinParalelaV487",usuario:usuario(),periodo});
    let r=await window.mv4872AplicarReglaVtrGar(base,base.periodo||periodo);
    r=await window.mv4873AplicarOrigenVtrGar(r,base.periodo||periodo);
    const detalle=Array.isArray(r.detalle)?r.detalle:[];
    const normales=detalle.filter(x=>!x.esVtrGar);
    const puntos=detalle.reduce((s,x)=>s+Number(x.puntos||0),0);
    const porCuadrilla={};
    normales.forEach(x=>{
      const k=claveCuadrilla(x.cuadrillaWin||x.cuadrillaEjecutora||x.cuadrilla||"");
      if(!k)return;if(!porCuadrilla[k])porCuadrilla[k]={cuadrilla:x.cuadrillaWin||x.cuadrillaEjecutora||x.cuadrilla,ordenes:0,puntos:0};
      porCuadrilla[k].ordenes++;
    });
    detalle.forEach(x=>{
      if(x.esVtrGar)return;
      const k=claveCuadrilla(x.cuadrillaWin||x.cuadrillaEjecutora||x.cuadrilla||"");
      if(k&&porCuadrilla[k])porCuadrilla[k].puntos+=Number(x.puntos||0);
    });
    r.resumen=r.resumen||{};
    r.resumen.ordenesProduccionValidas=normales.length;
    r.resumen.puntosProduccionValidos=puntos;
    r.resumen.vtrGarExcluidasProduccion=detalle.filter(x=>x.esVtrGar).length;
    r.produccionPorCuadrilla=Object.values(porCuadrilla);
    return r;
  }

  function esFinalizada(o){return /^FINALIZAD[AO]$/.test(norm(val(o,"estado","ESTADO","Estado")));}
  function esVtrGarTipoEfectividad(o){const t=norm(val(o,"tipoTrabajo","TIPO_TRABAJO","TipoTraba"));return t==="REITERADA"||t==="GARANTIA";}

  function cutoff(ordenes,periodo){
    let max=0;(ordenes||[]).forEach(o=>{const f=fechaOrden(o);if(f&&f.getTime()>max)max=f.getTime();});
    if(max)return new Date(max);
    const m=txt(periodo).match(/^(\d{4})-(\d{2})$/);return m?new Date(+m[1],+m[2],0,23,59,59):new Date();
  }

  function vtrGarRolling(periodo,mapaActual,mapaAnterior,prodActual,prodAnterior){
    const canon=window.mv4878CanonicalizarOrdenesWin;
    const combinadas=(mapaAnterior||[]).concat(mapaActual||[]);
    const ordenes=typeof canon==="function"?canon(combinadas).ordenes.map(x=>x.raw||x):combinadas;
    const corte=cutoff(mapaActual,periodo),inicio=new Date(corte.getTime()-29*MS_DIA);inicio.setHours(0,0,0,0);const fin=new Date(corte);fin.setHours(23,59,59,999);
    const por={};
    function fila(nombre){const k=claveCuadrilla(nombre)||"SIN CUADRILLA";if(!por[k])por[k]={cuadrilla:nombre||"SIN CUADRILLA",finalizadas:0,gar:0,vtr:0,total:0,porcentaje:0,incidencias:[]};return por[k];}

    ordenes.forEach(o=>{
      const f=fechaOrden(o);if(!f||f<inicio||f>fin||!esFinalizada(o)||esVtrGarTipoEfectividad(o))return;
      fila(val(o,"cuadrilla","CUADRILLA","Cuadrilla")).finalizadas++;
    });

    const incidencias=[];
    [prodAnterior,prodActual].forEach(p=>(p&&Array.isArray(p.detalle)?p.detalle:[]).forEach(x=>{
      if(!x.esVtrGar||!x.afectaIndicadorVtrGar||!x.cuadrillaOrigenVtrGar)return;
      const f=fecha(x.fecha);if(!f||f<inicio||f>fin)return;
      incidencias.push(x);
      const a=fila(x.cuadrillaOrigenVtrGar),tipo=norm(x.tipoVtrGar);
      if(tipo==="GAR")a.gar++;else if(tipo==="VTR")a.vtr++;
      a.total++;a.incidencias.push({ordenId:id(x.ordenId),tipo:x.tipoVtrGar,fecha:x.fecha,origen:x.origenVtrGar,ejecutor:x.cuadrillaWin||x.cuadrillaEjecutora||"",reporte:x.correspondenciaReporteVtrGar||"",estado:x.detalleConsideracion||""});
    }));

    Object.values(por).forEach(x=>x.porcentaje=x.finalizadas?x.total/x.finalizadas:0);
    return {version:"V487.9",desde:inicio, hasta:fin,corte:corte,detalle:Object.values(por).sort((a,b)=>claveCuadrilla(a.cuadrilla).localeCompare(claveCuadrilla(b.cuadrilla))),incidencias,control:{incidenciasAtribuidas:incidencias.length,manualesSinAtribuir:[prodAnterior,prodActual].reduce((s,p)=>s+(p&&Array.isArray(p.detalle)?p.detalle.filter(x=>x.esVtrGar&&x.origenVtrGar==="MANUAL").length:0),0)}};
  }

  async function calcularPeriodo(periodo){
    await dependencias();
    const p=periodo||periodoActual(),prev=periodoAnterior(p);
    const [mapaR,mapaPrevR,produccion,produccionPrev]=await Promise.all([
      apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:p}),
      prev?apiGet({accion:"listarMapaOperativo",usuario:usuario(),periodo:prev}):Promise.resolve({ok:true,ordenes:[]}),
      produccionPeriodo(p),
      prev?produccionPeriodo(prev):Promise.resolve({detalle:[],resumen:{}})
    ]);
    const mapa=listaMapa(mapaR),mapaPrev=listaMapa(mapaPrevR);
    const er=window.mv4876CalcularEfectividadRecableado(mapa);
    const vg=vtrGarRolling(p,mapa,mapaPrev,produccion,produccionPrev);
    const salida={ok:true,version:"V487.9",periodo:p,calculadoEn:new Date().toISOString(),soloPrevisualizacion:true,fuente:"WIN / MAPA_ORDENES + historico propio",produccion,efectividadRecableado:er,vtrGar:vg,controles:{escribeProduccion:false,escribeEfectividad:false,escribeRecableado:false,escribeVtrGar:false,escribeRanking:false}};
    ultima=salida;
    try{window.dispatchEvent(new CustomEvent("mv487IndicadoresCalculados",{detail:salida}));}catch(_){}
    return salida;
  }

  async function sincronizar(periodos){
    (Array.isArray(periodos)?periodos:[periodos]).filter(Boolean).forEach(p=>pendientes.add(p));
    if(!pendientes.size)pendientes.add(periodoActual());
    if(timer)clearTimeout(timer);
    return new Promise((resolve,reject)=>{
      timer=setTimeout(async()=>{
        try{
          const lista=Array.from(pendientes);pendientes=new Set();
          const resultados=[];for(const p of lista)resultados.push(await calcularPeriodo(p));
          resolve(resultados.length===1?resultados[0]:resultados);
        }catch(e){reject(e);}
      },700);
    });
  }

  window.mv4879CalcularIndicadoresWin=calcularPeriodo;
  window.mv4879SincronizarIndicadoresWin=sincronizar;
  window.mv4879UltimoResultado=()=>ultima;
})();
