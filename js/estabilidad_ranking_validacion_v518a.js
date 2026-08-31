/* ============================================================
   MI VISUAL V518A - ESTABILIDAD RANKING / DASHBOARD / VT
   31/08/2026

   ALCANCE ESTRICTO FRONTEND
   - NO escribe Google Sheets.
   - NO recalcula Produccion, Efectividad, Recableado, VTR/GAR ni SLA.
   - Conserva RESUMEN_DASHBOARD_RANKING + cache V361/V367.
   - Ranking usa porcentajes en puntos porcentuales (0.96 = 0.96%).
   - Completa SLA en el parser CSV de respaldo.
   - Cuando V361 termina su actualizacion silenciosa, repinta la vista activa.
   - Validacion Tecnica conserva ScriptLock backend y evita doble envio;
     agrega un ultimo ciclo controlado solo ante el bloqueo temporal conocido.
============================================================ */
(function(){
  "use strict";
  if(window.MV518A_ESTABILIDAD_RANKING_VT_OK) return;
  window.MV518A_ESTABILIDAD_RANKING_VT_OK=true;

  const ESTADO={
    listaResumen:[],
    periodo:"",
    refrescandoRanking:false,
    refrescandoDashboard:false,
    vtEnCurso:null,
    rankingParcheado:false,
    vtParcheado:false
  };

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function num(v){
    if(typeof window.numeroRanking==="function"){
      try{return Number(window.numeroRanking(v))||0;}catch(_){}
    }
    const n=Number(txt(v).replace("%","").replace("S/","").replace(/\s/g,"").replace(",","."));
    return Number.isFinite(n)?n:0;
  }
  function pct(v){return num(v).toFixed(2)+"%";}
  function esperar(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  function periodoActual(){
    const partes=new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Lima",year:"numeric",month:"2-digit"
    }).formatToParts(new Date());
    const y=partes.find(x=>x.type==="year")?.value||"";
    const m=partes.find(x=>x.type==="month")?.value||"";
    return y&&m?`${y}-${m}`:"";
  }

  function esRankingVisible(){
    const p=document.getElementById("pantalla");
    if(!p) return false;
    const h=Array.from(p.querySelectorAll("h1,h2,h3")).map(x=>norm(x.textContent)).join(" | ");
    return h.includes("RANKING");
  }

  function tipoDashboardVisible(){
    const p=document.getElementById("pantalla");
    if(!p) return "";
    const t=norm((p.textContent||"").slice(0,3500));
    if(!t.includes("PERIODO") || !t.includes("INDICADOR")) return "";
    if(t.includes("SUPERVISOR")) return "SUPERVISOR";
    if(t.includes("JEFATURA") && t.includes("ZONA NORTE")) return "JEFATURA";
    return "";
  }

  function semaforoRanking(tipo,valor){
    const n=num(valor);
    const t=norm(tipo);
    if(t==="EFECTIVIDAD"){
      if(n>=75) return "🟢";
      if(n>=65) return "🟡";
      return "🔴";
    }
    if(t==="RECABLEADO"){
      if(n<=45) return "🟢";
      if(n<=55) return "🟡";
      return "🔴";
    }
    if(t==="VTRGAR" || t==="VTR/GAR"){
      if(n<=2) return "🟢";
      if(n<=4) return "🟡";
      return "🔴";
    }
    return "";
  }

  function enriquecerSlaDesdeCsv(r,datos){
    if(!r || !Array.isArray(datos)) return r;
    if(datos.length>20) r.slaBruto=num(datos[20]);
    if(datos.length>21) r.slaAjustado=num(datos[21]);
    if(datos.length>21) r.sla=r.slaAjustado;
    if(datos.length>22) r.slaEvaluables=num(datos[22]);
    if(datos.length>23) r.slaFuera=num(datos[23]);
    if(datos.length>24) r.slaExcepcionesAprobadas=num(datos[24]);
    if(datos.length>25) r.aporteSla=num(datos[25]);
    if(datos.length>26) r.pesosRankingJson=datos[26]||"";
    if(!r.detSla && (r.slaEvaluables || r.slaFuera || r.slaAjustado)){
      r.detSla={
        evaluables:r.slaEvaluables||0,
        fueraAjustado:r.slaFuera||0,
        fueraBruto:r.slaFuera||0,
        excepcionesAprobadas:r.slaExcepcionesAprobadas||0,
        slaBruto:r.slaBruto||0,
        slaAjustado:r.slaAjustado||0
      };
    }
    return r;
  }

  function parchearRanking(){
    let cambios=0;

    if(typeof window.formatoPorcentajeRanking==="function" && !window.formatoPorcentajeRanking.__mv518a){
      const fn=function(valor){return pct(valor);};
      fn.__mv518a=true;
      window.formatoPorcentajeRanking=fn;
      try{formatoPorcentajeRanking=fn;}catch(_){}
      cambios++;
    }

    if(typeof window.colorSemaforoRanking==="function" && !window.colorSemaforoRanking.__mv518a){
      const fn=function(tipo,valor){return semaforoRanking(tipo,valor);};
      fn.__mv518a=true;
      window.colorSemaforoRanking=fn;
      try{colorSemaforoRanking=fn;}catch(_){}
      cambios++;
    }

    if(typeof window.filaRanking==="function" && !window.filaRanking.__mv518a){
      const base=window.filaRanking;
      const fn=function(datos){
        return enriquecerSlaDesdeCsv(base.apply(this,arguments),datos);
      };
      fn.__mv518a=true;
      fn.__mv518aBase=base;
      window.filaRanking=fn;
      try{filaRanking=fn;}catch(_){}
      cambios++;
    }

    if(typeof window.mv4FilaRanking==="function" && !window.mv4FilaRanking.__mv518a){
      const base=window.mv4FilaRanking;
      const fn=function(datos){
        return enriquecerSlaDesdeCsv(base.apply(this,arguments),datos);
      };
      fn.__mv518a=true;
      fn.__mv518aBase=base;
      window.mv4FilaRanking=fn;
      try{mv4FilaRanking=fn;}catch(_){}
      cambios++;
    }

    if(cambios) ESTADO.rankingParcheado=true;
    return cambios;
  }

  function hallarCardPorCuadrilla(root,cuadrilla){
    const objetivo=norm(cuadrilla);
    if(!objetivo) return null;
    const candidatos=Array.from(root.querySelectorAll("div"));
    const nombre=candidatos.find(el=>{
      if(norm(el.textContent)!==objetivo) return false;
      return el.children.length===0 || el.childElementCount<=1;
    });
    if(!nombre) return null;
    let n=nombre;
    for(let i=0;i<8 && n;i++,n=n.parentElement){
      const t=norm(n.textContent||"");
      if(t.includes("PRODUCCION") && t.includes("VTR/GAR")) return n;
    }
    return null;
  }

  function corregirIndicadorCard(card,titulo,valor,semaforo){
    if(!card) return;
    const objetivo=norm(titulo);
    const etiqueta=Array.from(card.querySelectorAll("div")).find(el=>norm(el.textContent)===objetivo);
    if(!etiqueta || !etiqueta.parentElement) return;
    const box=etiqueta.parentElement;
    const fila=box.children && box.children[1];
    if(!fila) return;
    const valorEl=fila.children && fila.children[0];
    const semEl=fila.children && fila.children[1];
    if(valorEl) valorEl.textContent=valor;
    if(semEl && semaforo) semEl.textContent=semaforo;
  }

  function corregirDomRanking(lista){
    if(!esRankingVisible()) return;
    const root=document.getElementById("pantalla");
    const datos=Array.isArray(lista)&&lista.length?lista:ESTADO.listaResumen;
    if(!root || !Array.isArray(datos) || !datos.length) return;

    datos.forEach(r=>{
      const card=hallarCardPorCuadrilla(root,r&&r.cuadrilla);
      if(!card) return;
      corregirIndicadorCard(card,"% VTR/GAR",pct(r.vtrgar),semaforoRanking("VTRGAR",r.vtrgar));
      const sla=r.slaAjustado ?? r.sla ?? r.detSla?.slaAjustado;
      if(sla!==undefined && sla!==null && txt(sla)!==""){
        const n=num(sla);
        const sem=n<60?"🔴":n<80?"🟠":n<90?"🟡":"🟢";
        corregirIndicadorCard(card,"Tiempo de Gestión - SLA",pct(n),sem);
      }
    });
  }

  function refrescarDashboardDesdeResumen(data){
    const tipo=tipoDashboardVisible();
    if(!tipo || !data || !Array.isArray(data.lista) || ESTADO.refrescandoDashboard) return;
    ESTADO.refrescandoDashboard=true;
    try{
      const lista=data.lista.slice();
      if(tipo==="SUPERVISOR"){
        const sede=norm(localStorage.getItem("sede")||"");
        window.MV198_DASH_SUPERVISOR_LISTA=lista.filter(x=>norm(x&&x.sede)===sede);
        try{MV198_DASH_SUPERVISOR_LISTA=window.MV198_DASH_SUPERVISOR_LISTA;}catch(_){}
        if(typeof window.mv198RenderSupervisor==="function") window.mv198RenderSupervisor();
      }else{
        const zona=typeof window.mv591ListaZonaNorte==="function"
          ? window.mv591ListaZonaNorte(lista)
          : lista;
        window.MV198_DASH_JEFATURA_LISTA=zona;
        try{MV198_DASH_JEFATURA_LISTA=zona;}catch(_){}
        if(typeof window.mv199RenderJefatura==="function") window.mv199RenderJefatura();
      }
    }catch(e){
      console.warn("V518A: no se pudo repintar Dashboard con resumen fresco",e);
    }finally{
      ESTADO.refrescandoDashboard=false;
    }
  }

  function refrescarRankingDesdeResumen(data){
    if(!esRankingVisible() || !data || !Array.isArray(data.lista) || ESTADO.refrescandoRanking) return;
    ESTADO.refrescandoRanking=true;
    const periodo=data.periodo||ESTADO.periodo||periodoActual();
    try{
      if(typeof window.mostrarRanking==="function"){
        Promise.resolve(window.mostrarRanking(periodo))
          .catch(e=>console.warn("V518A: no se pudo repintar Ranking",e))
          .finally(()=>{
            ESTADO.refrescandoRanking=false;
            setTimeout(()=>{parchearRanking();corregirDomRanking(data.lista);},80);
            setTimeout(()=>corregirDomRanking(data.lista),350);
          });
        return;
      }
    }catch(e){
      console.warn("V518A: repintado Ranking",e);
    }
    ESTADO.refrescandoRanking=false;
    setTimeout(()=>corregirDomRanking(data.lista),80);
  }

  function recibirResumen(ev){
    const data=ev&&ev.detail&&ev.detail.data?ev.detail.data:null;
    if(!data || !Array.isArray(data.lista)) return;
    ESTADO.listaResumen=data.lista.slice();
    ESTADO.periodo=data.periodo||ESTADO.periodo||"";
    parchearRanking();
    refrescarDashboardDesdeResumen(data);
    refrescarRankingDesdeResumen(data);
    setTimeout(()=>corregirDomRanking(data.lista),120);
  }

  function esBloqueoRegistro(respuesta){
    const m=norm(respuesta&&respuesta.error||"");
    return m.includes("EL SISTEMA ESTA REGISTRANDO OTRA SOLICITUD");
  }

  function parchearValidacion(){
    if(ESTADO.vtParcheado) return true;
    if(!window.MV517D_F4AF_VALIDACION_REGISTRO_RESILIENTE_OK) return false;
    if(typeof window.apiValidacionTecnica!=="function") return false;
    if(window.apiValidacionTecnica.__mv518a) {ESTADO.vtParcheado=true;return true;}

    const base=window.apiValidacionTecnica;
    const fn=async function(payload){
      const solicitud=Object.assign({},payload||{});
      if(solicitud.accion!=="registrarValidacionTecnica"){
        return base.apply(this,arguments);
      }

      if(ESTADO.vtEnCurso) return ESTADO.vtEnCurso;

      const tarea=(async()=>{
        let respuesta=await base(solicitud);
        if(!esBloqueoRegistro(respuesta)) return respuesta;

        if(typeof window.mostrarCargandoValidacion==="function"){
          window.mostrarCargandoValidacion("El sistema está cerrando otra gestión. Conservando tu solicitud...");
        }
        await esperar(6000);

        // Solo se repite si el backend confirmó que NO obtuvo el lock.
        // No se reintenta un timeout/red: evita duplicados ambiguos.
        respuesta=await base(solicitud);
        return respuesta;
      })();

      ESTADO.vtEnCurso=tarea;
      try{return await tarea;}
      finally{ESTADO.vtEnCurso=null;}
    };
    fn.__mv518a=true;
    fn.__mv518aBase=base;
    window.apiValidacionTecnica=fn;
    try{apiValidacionTecnica=fn;}catch(_){}
    ESTADO.vtParcheado=true;
    return true;
  }

  function forzarResumenActivo(){
    if(!esRankingVisible() && !tipoDashboardVisible()) return;
    if(typeof window.mv361ConsultarResumenDashboardRanking!=="function") return;
    const periodo=window.MV276_DASH_PERIODO||window.MV276_RANKING_PERIODO||periodoActual();
    Promise.resolve(window.mv361ConsultarResumenDashboardRanking(periodo,true))
      .catch(e=>console.warn("V518A: refresco de resumen activo",e));
  }

  window.addEventListener("mv366ResumenActualizado",recibirResumen);
  window.addEventListener("mv505CachesIndicadoresInvalidadas",()=>setTimeout(forzarResumenActivo,100));
  window.addEventListener("mv487IndicadoresPublicados",()=>setTimeout(forzarResumenActivo,140));

  let intentos=0;
  const instalador=setInterval(function(){
    intentos++;
    parchearRanking();
    parchearValidacion();
    if(esRankingVisible()) corregirDomRanking();
    if(intentos>=160 || (ESTADO.rankingParcheado && ESTADO.vtParcheado)) clearInterval(instalador);
  },250);

  document.addEventListener("click",function(){
    setTimeout(()=>{parchearRanking();parchearValidacion();corregirDomRanking();},80);
  },true);

  window.MV518A_DIAGNOSTICO=function(){
    return {
      ok:true,
      version:"V518A-ESTABILIDAD-RANKING-VT-20260831",
      rankingParcheado:ESTADO.rankingParcheado,
      validacionParcheada:ESTADO.vtParcheado,
      periodoResumen:ESTADO.periodo,
      filasResumen:ESTADO.listaResumen.length,
      registroVtEnCurso:!!ESTADO.vtEnCurso,
      seguridad:{
        escribeSheets:false,
        recalculaIndicadores:false,
        modificaJulio:false,
        eliminaScriptLock:false,
        reintentaSoloBloqueoConfirmado:true
      }
    };
  };

  setTimeout(parchearRanking,0);
  setTimeout(parchearValidacion,500);
  console.log("MI VISUAL V518A: estabilidad Ranking/Dashboard/VT habilitada.");
})();