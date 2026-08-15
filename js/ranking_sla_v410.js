/* ============================================================
   MI VISUAL V410 - Ranking: incorpora SLA ya existente en RANKING U:Z
   No recalcula puntajes. Solo muestra los campos que ya entrega la hoja.
============================================================ */
(function(){
  "use strict";
  if(window.MV410_RANKING_SLA_OK) return;

  function instalar(){
    if(typeof window.filaRanking !== "function" ||
       typeof window.indicadorMiniRanking !== "function" ||
       typeof window.medallaRanking !== "function" ||
       typeof window.formatoPorcentajeRanking !== "function") return false;

    if(!window.filaRanking.__mv410Sla){
      const baseFila = window.filaRanking;
      const nuevaFila = function(datos){
        const r = baseFila(datos);
        r.slaDisponible = [20,21,22,23,24,25].some(i=>String(datos?.[i]??"").trim()!=="");
        r.slaBruto = typeof numeroRanking === "function" ? numeroRanking(datos?.[20]) : Number(datos?.[20]) || 0;
        r.slaAjustado = typeof numeroRanking === "function" ? numeroRanking(datos?.[21]) : Number(datos?.[21]) || 0;
        r.slaEvaluables = typeof numeroRanking === "function" ? numeroRanking(datos?.[22]) : Number(datos?.[22]) || 0;
        r.slaFuera = typeof numeroRanking === "function" ? numeroRanking(datos?.[23]) : Number(datos?.[23]) || 0;
        r.slaExcepcionesAprobadas = typeof numeroRanking === "function" ? numeroRanking(datos?.[24]) : Number(datos?.[24]) || 0;
        r.aporteSla = typeof numeroRanking === "function" ? numeroRanking(datos?.[25]) : Number(datos?.[25]) || 0;
        return r;
      };
      nuevaFila.__mv410Sla = true;
      window.filaRanking = nuevaFila;
      try{ filaRanking = nuevaFila; }catch(_){}
    }

    const semaforoSla = function(valor){
      const n = typeof numeroRanking === "function" ? numeroRanking(valor) : Number(valor) || 0;
      if(n >= 90) return "🟢";
      if(n >= 80) return "🟡";
      return "🔴";
    };

    const nuevaTarjeta = function(r, tipoPuesto){
      let puesto = r.puestoRegion;
      let medalla = medallaRanking(r.puestoRegion);

      if(tipoPuesto === "sede"){
        puesto = r.puestoSede;
        medalla = medallaRanking(r.puestoSede);
      }
      if(tipoPuesto === "plataforma"){
        puesto = r.puestoPlataforma;
        medalla = medallaRanking(r.puestoPlataforma);
      }

      const sla = formatoPorcentajeRanking(r.slaAjustado || 0);
      const slaBruto = formatoPorcentajeRanking(r.slaBruto || 0);
      const slaSem = semaforoSla(r.slaAjustado || 0);
      const slaCards = r.slaDisponible ? `
        ${indicadorMiniRanking("SLA ajustado", sla, `${slaSem} · Bruto ${slaBruto}`)}
        ${indicadorMiniRanking("Detalle SLA", r.slaEvaluables || 0, `Evaluables · Fuera ${r.slaFuera || 0} · Aprobadas ${r.slaExcepcionesAprobadas || 0}<br>Aporte ranking: ${(Number(r.aporteSla)||0).toFixed(2)}`)}
      ` : "";

      return `
        <div style="background:#1f2d48;border-radius:18px;padding:15px;margin:12px 0;color:white;box-shadow:0 6px 16px rgba(0,0,0,.18);">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="background:#16a34a;color:white;border-radius:14px;min-width:54px;height:54px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;">
              ${medalla || ("#" + puesto)}
            </div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:800;line-height:1.25;">${r.cuadrilla}</div>
              <div style="font-size:12px;opacity:.78;margin-top:4px;">${r.sede || "-"} · ${r.plataforma || "-"}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;">
            ${indicadorMiniRanking("Producción", r.produccion, "")}
            ${indicadorMiniRanking("Efectividad", formatoPorcentajeRanking(r.efectividad), colorSemaforoRanking("efectividad", r.efectividad))}
            ${indicadorMiniRanking("% Recableado", formatoPorcentajeRanking(r.recableado), colorSemaforoRanking("recableado", r.recableado))}
            ${indicadorMiniRanking("% VTR/GAR", formatoPorcentajeRanking(r.vtrgar), colorSemaforoRanking("vtrgar", r.vtrgar))}
            ${indicadorMiniRanking("Observaciones", r.observaciones || 0, "")}
            ${indicadorMiniRanking("Monto Afectado", formatoSolesRanking(r.montoAfectadoObs), "")}
            ${slaCards}
          </div>
        </div>`;
    };
    nuevaTarjeta.__mv410Sla = true;
    window.tarjetaCuadrillaRanking = nuevaTarjeta;
    try{ tarjetaCuadrillaRanking = nuevaTarjeta; }catch(_){}

    window.MV410_RANKING_SLA_OK = true;
    console.log("MI VISUAL V410: SLA visible en Ranking.");
    return true;
  }

  if(!instalar()){
    let intentos=0;
    const timer=setInterval(function(){
      intentos++;
      if(instalar() || intentos>100) clearInterval(timer);
    },50);
  }
})();
