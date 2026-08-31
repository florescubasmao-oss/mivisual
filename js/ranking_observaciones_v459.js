/* ============================================================
   MI VISUAL V459 - Ranking: Observaciones 60/40 + WIN/VISUAL separados

   - Se activa solo cuando RANKING trae las columnas V459 agregadas al final.
   - Si backend V459 aún no está desplegado, usa exactamente la vista anterior.
   - No recalcula el ranking en el navegador; solo presenta el cálculo oficial
     generado por Apps Script.
============================================================ */
(function(){
  "use strict";
  if(window.MV459_RANKING_OBS_OK) return;
  window.MV459_RANKING_OBS_OK=true;

  function n(v){
    const x=Number(v);
    return Number.isFinite(x)?x:0;
  }

  function instalar(){
    if(window.MV459_RANKING_OBS_INSTALADO) return true;
    if(typeof window.filaRanking!=="function" ||
       typeof window.tarjetaCuadrillaRanking!=="function" ||
       typeof window.indicadorMiniRanking!=="function") return false;

    const filaBase=window.filaRanking;
    const tarjetaBase=window.tarjetaCuadrillaRanking;

    window.filaRanking=function(datos){
      const r=filaBase(datos);
      const tieneV459=Array.isArray(datos) && datos.length>=36 && String(datos[35]||"").includes("V459");
      r.mv459=tieneV459;
      if(tieneV459){
        r.obsWinV459=n(datos[27]);
        r.montoPenalizadoWinV459=n(datos[28]);
        r.obsVisualV459=n(datos[29]);
        r.montoPenalizadoVisualV459=n(datos[30]);
        r.scoreCantidadObsV459=n(datos[31]);
        r.scoreMontoObsV459=n(datos[32]);
        r.scoreObservacionesV459=n(datos[33]);
        r.aporteObservacionesV459=n(datos[34]);
        r.reglaObservacionesV459=datos[35]||"";
        r.obsTotalV459=r.obsWinV459+r.obsVisualV459;
        r.montoPenalizadoTotalV459=r.montoPenalizadoWinV459+r.montoPenalizadoVisualV459;
      }
      return r;
    };

    window.tarjetaCuadrillaRanking=function(r,tipoPuesto){
      if(!r || !r.mv459) return tarjetaBase(r,tipoPuesto);

      let puesto=r.puestoRegion;
      let medalla=typeof medallaRanking==="function" ? medallaRanking(r.puestoRegion) : "";
      if(tipoPuesto==="sede"){
        puesto=r.puestoSede;
        medalla=typeof medallaRanking==="function" ? medallaRanking(r.puestoSede) : "";
      }
      if(tipoPuesto==="plataforma"){
        puesto=r.puestoPlataforma;
        medalla=typeof medallaRanking==="function" ? medallaRanking(r.puestoPlataforma) : "";
      }

      const soles=typeof formatoSolesRanking==="function"
        ? formatoSolesRanking
        : v=>`S/ ${n(v).toFixed(2)}`;
      const porcentaje=typeof formatoPorcentajeRanking==="function"
        ? formatoPorcentajeRanking
        : v=>`${n(v).toFixed(2)}%`;
      const semaforo=typeof colorSemaforoRanking==="function"
        ? colorSemaforoRanking
        : ()=>"";

      return `
        <div style="background:#1f2d48;border-radius:18px;padding:15px;margin:12px 0;color:white;box-shadow:0 6px 16px rgba(0,0,0,.18);">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="background:#16a34a;color:white;border-radius:14px;min-width:54px;height:54px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;">
              ${medalla || ("#"+puesto)}
            </div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:800;line-height:1.25;">${r.cuadrilla}</div>
              <div style="font-size:12px;opacity:.78;margin-top:4px;">${r.sede||"-"} · ${r.plataforma||"-"}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;">
            ${indicadorMiniRanking("Producción",r.produccion,"")}
            ${indicadorMiniRanking("Efectividad",porcentaje(r.efectividad),semaforo("efectividad",r.efectividad))}
            ${indicadorMiniRanking("% Recableado",porcentaje(r.recableado),semaforo("recableado",r.recableado))}
            ${indicadorMiniRanking("% VTR/GAR",porcentaje(r.vtrgar),semaforo("vtrgar",r.vtrgar))}
            ${indicadorMiniRanking("Observaciones",r.obsTotalV459,`60% cantidad · Score ${r.scoreCantidadObsV459.toFixed(1)}%`)}
            ${indicadorMiniRanking("Monto penalizado",soles(r.montoPenalizadoTotalV459),`40% monto · Score ${r.scoreMontoObsV459.toFixed(1)}%`)}
            ${indicadorMiniRanking("WIN",`${r.obsWinV459} obs`,`Penalizado ${soles(r.montoPenalizadoWinV459)}`)}
            ${indicadorMiniRanking("VISUAL",`${r.obsVisualV459} obs`,`Penalizado ${soles(r.montoPenalizadoVisualV459)}`)}
          </div>

          <div style="margin-top:10px;padding:9px 11px;border-radius:12px;background:rgba(15,23,42,.65);font-size:11px;line-height:1.4;color:#dbeafe;">
            🚨 Puntaje Observaciones: <b>${r.scoreObservacionesV459.toFixed(1)}%</b> ·
            aporte al ranking: <b>${r.aporteObservacionesV459.toFixed(2)} pts</b>.
            Subsanado mantiene la incidencia en cantidad; Anulado no cuenta.
          </div>
        </div>
      `;
    };

    window.MV459_RANKING_OBS_INSTALADO=true;
    return true;
  }

  const reloj=setInterval(()=>{
    if(instalar()) clearInterval(reloj);
  },400);
  instalar();
})();

/* ============================================================
   MI VISUAL V517D F4AE - ESTABILIDAD RANKING
   - Corrige porcentajes menores a 1% sin multiplicarlos indebidamente.
   - Recupera SLA directamente de las columnas oficiales del Ranking.
   - Evita reutilizar un Dashboard viejo al abrir Ranking.
   - No modifica hojas, Apps Script, Produccion, Efectividad, Recableado ni GAR/VTR.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4AE_RANKING_ESTABILIDAD_OK) return;
  window.MV517D_F4AE_RANKING_ESTABILIDAD_OK=true;

  function numeroFlexible(valor){
    if(typeof valor==="number") return Number.isFinite(valor)?valor:0;
    const s=String(valor??"")
      .replace(/S\//gi,"")
      .replace(/%/g,"")
      .replace(/\s+/g,"")
      .replace(/,/g,".");
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  }

  function porcentajeFraccion(valor){
    const texto=String(valor??"").trim();
    const n=numeroFlexible(valor);
    if(texto.includes("%")) return n/100;
    return Math.abs(n)>1 ? n/100 : n;
  }

  function instalarFilaF4AE(){
    if(window.MV517D_F4AE_FILA_OK) return true;
    if(!window.MV459_RANKING_OBS_INSTALADO || typeof window.filaRanking!=="function") return false;

    const baseFila=window.filaRanking;
    window.filaRanking=function(datos){
      const r=baseFila(datos);
      if(!Array.isArray(datos)) return r;

      // Columnas porcentuales oficiales del Ranking se normalizan a fraccion.
      // Así 0.96% => 0.0096 y se visualiza como 0.96%, no como 96%.
      r.efectividad=porcentajeFraccion(datos[7]);
      r.recableado=porcentajeFraccion(datos[8]);
      r.vtrgar=porcentajeFraccion(datos[9]);

      // Columnas U:Z del Ranking: SLA Bruto, Ajustado, Evaluables, Fuera,
      // Excepciones aprobadas y Aporte SLA.
      if(datos.length>=26){
        r.slaBruto=numeroFlexible(datos[20]);
        r.slaAjustado=numeroFlexible(datos[21]);
        r.slaEvaluables=numeroFlexible(datos[22]);
        r.slaFuera=numeroFlexible(datos[23]);
        r.slaExcepcionesAprobadas=numeroFlexible(datos[24]);
        r.aporteSla=numeroFlexible(datos[25]);
        r.detSla={
          slaBruto:r.slaBruto,
          slaAjustado:r.slaAjustado,
          evaluables:r.slaEvaluables,
          fueraBruto:r.slaFuera,
          fueraAjustado:r.slaFuera,
          excepcionesAprobadas:r.slaExcepcionesAprobadas,
          excepcionesPendientes:0
        };
      }
      return r;
    };

    window.MV517D_F4AE_FILA_OK=true;
    return true;
  }

  function instalarRankingFrescoF4AE(){
    if(window.MV517D_F4AE_FRESCO_OK) return true;
    if(!window.MV358_RANKING_DETALLADO_OK || typeof window.mostrarRanking!=="function") return false;

    const baseMostrar=window.mostrarRanking;
    window.mostrarRanking=async function(){
      // V415 reutilizaba datos del Dashboard aunque fueran de un corte anterior.
      // Invalidamos solo esa reutilizacion; mv4ObtenerRanking vuelve a fijar
      // inmediatamente el periodo correcto con el CSV oficial y cache-busting.
      try{
        if(typeof MV276_DASH_PERIODO!=="undefined"){
          MV276_DASH_PERIODO="__F4AE_RANKING_FRESCO__";
        }
      }catch(_){}
      return baseMostrar.apply(window,arguments);
    };

    window.MV517D_F4AE_FRESCO_OK=true;
    return true;
  }

  const reloj=setInterval(()=>{
    const filaOk=instalarFilaF4AE();
    const frescoOk=instalarRankingFrescoF4AE();
    if(filaOk && frescoOk) clearInterval(reloj);
  },150);

  instalarFilaF4AE();
  instalarRankingFrescoF4AE();
  console.log("MI VISUAL V517D F4AE: Ranking fresco, VTR/GAR y SLA estabilizados.");
})();
