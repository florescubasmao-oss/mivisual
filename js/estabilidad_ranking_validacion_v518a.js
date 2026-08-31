/* ============================================================
   MI VISUAL V518B - ESTABILIDAD RANKING / DASHBOARD / VT
   31/08/2026

   CORRECCION INCREMENTAL SOBRE V518A
   - NO escribe Google Sheets.
   - NO recalcula fuentes ni modifica Ranking/Produccion/Indicadores.
   - Corrige la representacion VTR/GAR cuando el porcentaje es < 1%.
   - Usa el detalle visible incidencias/finalizadas como respaldo exacto.
   - El sello superior del Ranking usa la misma fecha del periodo mostrado.
   - Conserva refresco silencioso V361 y proteccion VT existente.
============================================================ */
(function(){
  "use strict";
  if(window.MV518B_ESTABILIDAD_RANKING_VT_OK) return;
  window.MV518B_ESTABILIDAD_RANKING_VT_OK=true;
  window.MV518A_ESTABILIDAD_RANKING_VT_OK=true;

  const ESTADO={
    vtEnCurso:null,
    vtParcheado:false,
    timer:null,
    observador:null,
    ultimaFechaRanking:""
  };

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function num(v){
    if(typeof v==="number") return Number.isFinite(v)?v:0;
    const s=txt(v).replace("%","").replace("S/","").replace(/\s/g,"").replace(",",".");
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  }
  function esperar(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  function esRankingVisible(){
    const p=document.getElementById("pantalla");
    if(!p) return false;
    const h=Array.from(p.querySelectorAll("h1,h2,h3"))
      .slice(0,10).map(x=>norm(x.textContent)).join(" | ");
    return h.includes("RANKING");
  }

  function semaforoVtrGar(p){
    const n=num(p);
    if(n<=2) return "🟢";
    if(n<=4) return "🟡";
    return "🔴";
  }

  function obtenerCajaIndicador(etiqueta){
    if(!etiqueta) return null;
    let n=etiqueta.parentElement;
    for(let i=0;i<4 && n;i++,n=n.parentElement){
      const t=norm(n.textContent||"");
      if(t.includes("VTR/GAR") && t.includes("FINALIZADAS")) return n;
    }
    return etiqueta.parentElement||null;
  }

  function corregirVtrGarVisible(){
    if(!esRankingVisible()) return 0;
    const p=document.getElementById("pantalla");
    if(!p) return 0;
    let cambios=0;

    const etiquetas=Array.from(p.querySelectorAll("div"))
      .filter(el=>norm(el.textContent)==="% VTR/GAR");

    etiquetas.forEach(etiqueta=>{
      const caja=obtenerCajaIndicador(etiqueta);
      if(!caja) return;
      const texto=norm(caja.textContent||"");
      const m=texto.match(/(\d+(?:[.,]\d+)?)\s+INCIDENCIAS?\s*\/\s*(\d+(?:[.,]\d+)?)\s+FINALIZADAS?/i);
      if(!m) return;

      const incidencias=num(m[1]);
      const finalizadas=num(m[2]);
      const porcentaje=finalizadas>0 ? (incidencias/finalizadas)*100 : 0;
      const valorCorrecto=porcentaje.toFixed(2)+"%";

      const filaValor=etiqueta.nextElementSibling;
      if(!filaValor) return;
      const valorEl=filaValor.children&&filaValor.children[0];
      const semEl=filaValor.children&&filaValor.children[1];

      if(valorEl && txt(valorEl.textContent)!==valorCorrecto){
        valorEl.textContent=valorCorrecto;
        cambios++;
      }
      if(semEl){
        const sem=semaforoVtrGar(porcentaje);
        if(txt(semEl.textContent)!==sem) semEl.textContent=sem;
      }
    });

    return cambios;
  }

  function fechaRankingDesdeDatos(){
    let lista=null;
    try{
      if(typeof MV239_RANKING_JEFATURA_LISTA!=="undefined" && Array.isArray(MV239_RANKING_JEFATURA_LISTA)){
        lista=MV239_RANKING_JEFATURA_LISTA;
      }
    }catch(_){}
    if(!lista){
      try{
        if(Array.isArray(window.MV239_RANKING_JEFATURA_LISTA)) lista=window.MV239_RANKING_JEFATURA_LISTA;
      }catch(_){}
    }
    const f=txt(lista&&lista[0]&&lista[0].actualizacion);
    if(f) return f;

    const p=document.getElementById("pantalla");
    if(!p) return "";
    const candidatos=Array.from(p.querySelectorAll("div"));
    for(const el of candidatos){
      if(el.closest&&el.closest("#mv507ActualizacionWin")) continue;
      const t=norm(el.textContent||"");
      if(!t.startsWith("ACTUALIZADO AL:")) continue;
      const b=el.querySelector("b");
      const valor=txt(b&&b.textContent);
      if(valor) return valor;
    }
    return "";
  }

  function corregirSelloRanking(){
    if(!esRankingVisible()) return false;
    const fecha=fechaRankingDesdeDatos();
    if(!fecha) return false;
    ESTADO.ultimaFechaRanking=fecha;

    const badge=document.getElementById("mv507ActualizacionWin");
    if(!badge) return false;
    const b=badge.querySelector("b");
    if(!b) return false;
    if(txt(b.textContent)===fecha) return false;

    // No se modifica dataset.firma. V512A reconoce el badge como ya pintado
    // y no vuelve a imponer una fecha de publicacion antigua sobre Ranking.
    b.textContent=fecha;
    return true;
  }

  function corregirRanking(){
    if(!esRankingVisible()) return;
    corregirVtrGarVisible();
    corregirSelloRanking();
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

  function refrescarDashboardDesdeResumen(data){
    const tipo=tipoDashboardVisible();
    if(!tipo || !data || !Array.isArray(data.lista)) return;
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
      console.warn("V518B: no se pudo repintar Dashboard con resumen fresco",e);
    }
  }

  function esBloqueoRegistro(respuesta){
    const m=norm(respuesta&&respuesta.error||"");
    return m.includes("EL SISTEMA ESTA REGISTRANDO OTRA SOLICITUD");
  }

  function parchearValidacion(){
    if(ESTADO.vtParcheado) return true;
    if(!window.MV517D_F4AF_VALIDACION_REGISTRO_RESILIENTE_OK) return false;
    if(typeof window.apiValidacionTecnica!=="function") return false;
    if(window.apiValidacionTecnica.__mv518b || window.apiValidacionTecnica.__mv518a){
      ESTADO.vtParcheado=true;
      return true;
    }

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
        return base(solicitud);
      })();

      ESTADO.vtEnCurso=tarea;
      try{return await tarea;}
      finally{ESTADO.vtEnCurso=null;}
    };
    fn.__mv518a=true;
    fn.__mv518b=true;
    fn.__mv518bBase=base;
    window.apiValidacionTecnica=fn;
    try{apiValidacionTecnica=fn;}catch(_){}
    ESTADO.vtParcheado=true;
    return true;
  }

  function programar(){
    if(ESTADO.timer) clearTimeout(ESTADO.timer);
    ESTADO.timer=setTimeout(function(){
      ESTADO.timer=null;
      corregirRanking();
      parchearValidacion();
    },45);
  }

  function instalarObservador(){
    const p=document.getElementById("pantalla");
    if(!p || ESTADO.observador) return;
    ESTADO.observador=new MutationObserver(programar);
    ESTADO.observador.observe(p,{childList:true,subtree:true,characterData:true});
  }

  window.addEventListener("mv366ResumenActualizado",function(ev){
    const data=ev&&ev.detail&&ev.detail.data?ev.detail.data:null;
    if(data) refrescarDashboardDesdeResumen(data);
    setTimeout(corregirRanking,20);
    setTimeout(corregirRanking,180);
  });
  window.addEventListener("mv487IndicadoresPublicados",()=>setTimeout(corregirRanking,80));
  window.addEventListener("mv505CachesIndicadoresInvalidadas",()=>setTimeout(corregirRanking,80));

  document.addEventListener("click",()=>setTimeout(programar,30),true);

  let intentos=0;
  const instalador=setInterval(function(){
    intentos++;
    instalarObservador();
    parchearValidacion();
    corregirRanking();
    if(intentos>=160) clearInterval(instalador);
  },250);

  window.MV518B_DIAGNOSTICO=function(){
    return {
      ok:true,
      version:"V518B-RANKING-FECHA-VTRGAR-20260831",
      rankingVisible:esRankingVisible(),
      fechaRanking:fechaRankingDesdeDatos(),
      fechaAplicada:ESTADO.ultimaFechaRanking,
      validacionParcheada:ESTADO.vtParcheado,
      registroVtEnCurso:!!ESTADO.vtEnCurso,
      seguridad:{
        escribeSheets:false,
        recalculaFuentes:false,
        modificaJulio:false,
        eliminaScriptLock:false
      }
    };
  };

  instalarObservador();
  setTimeout(corregirRanking,0);
  setTimeout(corregirRanking,150);
  setTimeout(parchearValidacion,500);
  console.log("MI VISUAL V518B: VTR/GAR sub-1% y fecha Ranking corregidos.");
})();