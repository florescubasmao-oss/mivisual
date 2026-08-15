/* ============================================================
   MI VISUAL V412 - RANKING SLA CORRECCION DIRECTA
   Reemplaza el contenido de js/ranking_sla_v411.js

   CAUSA CORREGIDA:
   - ranking_informe_v358.js usa su propio render ejecutivo.
   - V411 reemplazaba mostrarRanking y descartaba detProduccion,
     detEfectividad, detSla y otros detalles.
   - V412 NO reemplaza la carga del Ranking. Conserva V358 y
     únicamente incorpora SLA en el renderer real de Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV412_RANKING_SLA_DIRECTO_OK) return;

  function norm(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function num(valor){
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function pctNumero(valor){
    const n = num(valor);
    return n <= 1 ? n * 100 : n;
  }

  function pct(valor){
    return `${pctNumero(valor).toFixed(2)}%`;
  }

  function money(valor){
    return `S/ ${num(valor).toLocaleString("es-PE",{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    })}`;
  }

  function esc(valor){
    return String(valor ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function semaforoSla(valor){
    const n = pctNumero(valor);
    if(n >= 90) return "🟢";
    if(n >= 80) return "🟡";
    return "🔴";
  }

  function detalleProduccion(r){
    const d = r.detProduccion || {};
    const total = num(d.totalOrdenes);
    const grupos = Object.entries(d.grupos || {})
      .filter(([,v])=>num(v?.cantidad)>0)
      .sort((a,b)=>num(b[1]?.cantidad)-num(a[1]?.cantidad))
      .slice(0,2)
      .map(([k,v])=>`${k}: ${num(v?.cantidad)}`)
      .join(" · ");
    return {
      linea1:`Órdenes ejecutadas: ${total}`,
      linea2:grupos || "Meta mensual: 130 pts"
    };
  }

  function detalleEfectividad(r){
    const d = r.detEfectividad || {};
    return {
      linea1:`${num(d.finalizadas)} finalizadas / ${num(d.total)} total`,
      linea2:`Canc. ${num(d.canceladas)} · Reprog. ${num(d.reprogramadas)} · Reg. ${num(d.regestion)}`
    };
  }

  function detalleRecableado(r){
    const d = r.detRecableado || {};
    return {
      linea1:`${num(d.recableados)} recableados / ${num(d.los)} órdenes VT`,
      linea2:"Meta máxima: 42%"
    };
  }

  function detalleVtrGar(r){
    const d = r.detVtrGar || {};
    return {
      linea1:`${num(d.total)} incidencias / ${num(d.finalizadas)} finalizadas`,
      linea2:`GAR ${num(d.gar)} · VTR ${num(d.vtr)}`
    };
  }

  function detalleObservaciones(r){
    const d = r.detObservaciones || {};
    const e = d.estados || {};
    return {
      linea1:`Pendientes: ${num(d.pendientes)} · Subsanadas: ${num(e.SUBSANADO)}`,
      linea2:`Penalizadas ${num(e.PENALIZADO)} · Derivadas ${num(e.DERIVADO)}`
    };
  }

  function detalleMonto(r){
    const d = r.detObservaciones || {};
    return {
      linea1:`Afectado: ${money(d.montoPendiente ?? r.montoAfectadoObs)}`,
      linea2:`Monto total: ${money(d.montoTotal ?? r.montoTotalObs)}`
    };
  }

  function detalleSla(r){
    const d = r.detSla || {};
    const ajustado = r.slaAjustado ?? r.sla ?? d.slaAjustado ?? 0;
    const bruto = r.slaBruto ?? d.slaBruto ?? 0;
    return {
      ajustado,
      bruto,
      linea1:`Bruto ${pct(bruto)} · ${num(d.evaluables)} evaluables`,
      linea2:`Fuera ${num(d.fueraAjustado)} · Aprobadas ${num(d.excepcionesAprobadas)} · Pendientes ${num(d.excepcionesPendientes)}`
    };
  }

  function indicador(titulo,valor,semaforo,detalle){
    return `
      <div style="background:#0f172a;border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;color:white;min-width:0;">
        <div style="font-size:12px;opacity:.80;">${esc(titulo)}</div>
        <div style="display:flex;align-items:center;gap:7px;margin-top:4px;">
          <div style="font-size:18px;font-weight:900;min-width:0;overflow-wrap:anywhere;">${valor}</div>
          ${semaforo ? `<span style="font-size:15px;">${semaforo}</span>` : ""}
        </div>
        <div style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.09);font-size:10px;line-height:1.35;color:#c8d8ed;">
          <div>${esc(detalle?.linea1 || "Sin detalle disponible")}</div>
          <div style="margin-top:3px;color:#8fb0d4;">${esc(detalle?.linea2 || "")}</div>
        </div>
      </div>`;
  }

  function tarjetaDetalladaConSla(r,tipoPuesto){
    let puesto = r.puestoRegion;
    if(tipoPuesto === "sede") puesto = r.puestoSede;
    if(tipoPuesto === "plataforma") puesto = r.puestoPlataforma;

    const medalla = typeof window.medallaRanking === "function"
      ? window.medallaRanking(puesto)
      : "";

    const prod = detalleProduccion(r);
    const ef = detalleEfectividad(r);
    const rec = detalleRecableado(r);
    const vg = detalleVtrGar(r);
    const obs = detalleObservaciones(r);
    const monto = detalleMonto(r);
    const sla = detalleSla(r);

    const semEf = typeof window.colorSemaforoRanking === "function"
      ? window.colorSemaforoRanking("efectividad",r.efectividad) : "";
    const semRec = typeof window.colorSemaforoRanking === "function"
      ? window.colorSemaforoRanking("recableado",r.recableado) : "";
    const semVg = typeof window.colorSemaforoRanking === "function"
      ? window.colorSemaforoRanking("vtrgar",r.vtrgar) : "";

    return `
      <div style="background:#1f2d48;border-radius:18px;padding:15px;margin:12px 0;color:white;box-shadow:0 6px 16px rgba(0,0,0,.18);">
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="background:#16a34a;color:white;border-radius:14px;min-width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:900;">
            ${medalla || `#${puesto || 0}`}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:16px;font-weight:900;line-height:1.25;overflow-wrap:anywhere;">${esc(r.cuadrilla)}</div>
            <div style="font-size:12px;opacity:.78;margin-top:4px;">${esc(r.sede || "-")} · ${esc(r.plataforma || "-")}</div>
            <div style="font-size:11px;color:#9fc1e4;margin-top:5px;">Ranking ZN #${num(r.puestoRegion)} · Sede #${num(r.puestoSede)} · Plataforma #${num(r.puestoPlataforma)}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;">
          ${indicador("Producción",num(r.produccion).toFixed(1),"",prod)}
          ${indicador("Efectividad",pct(r.efectividad),semEf,ef)}
          ${indicador("% Recableado",pct(r.recableado),semRec,rec)}
          ${indicador("% VTR/GAR",pct(r.vtrgar),semVg,vg)}
          ${indicador("Observaciones",num(r.observaciones).toFixed(0),"",obs)}
          ${indicador("Monto afectado",money(r.montoAfectadoObs),"",monto)}
          ${indicador("SLA",pct(sla.ajustado),semaforoSla(sla.ajustado),sla)}
        </div>
      </div>`;
  }

  function listaTarjetasConSla(lista,tipoPuesto){
    if(!lista?.length) return '<div class="card">No hay datos para mostrar.</div>';
    const ordenada = typeof window.ordenarRankingPorPuesto === "function"
      ? window.ordenarRankingPorPuesto(lista,tipoPuesto)
      : lista.slice();
    return ordenada.map(r=>tarjetaDetalladaConSla(r,tipoPuesto)).join("");
  }

  function renderEjecutivoConSla(){
    const listaCompleta = window.MV239_RANKING_JEFATURA_LISTA || [];
    const sedeFiltro = window.MV239_RANKING_JEFATURA_SEDE || "TODAS";
    const listaFiltrada = sedeFiltro === "TODAS"
      ? listaCompleta
      : listaCompleta.filter(x=>norm(x.sede)===norm(sedeFiltro));

    const tipoPuesto = sedeFiltro === "TODAS" ? "region" : "sede";
    const ordenada = typeof window.ordenarRankingPorPuesto === "function"
      ? window.ordenarRankingPorPuesto(listaFiltrada,tipoPuesto)
      : listaFiltrada.slice();
    const referencia = ordenada[0] || listaCompleta[0];
    const titulo = sedeFiltro === "TODAS"
      ? "🌎 RANKING ZONA NORTE"
      : `🏢 RANKING SEDE ${esc(sedeFiltro)}`;
    const rotulo = typeof window.mv240RotuloRankingEjecutivo === "function"
      ? window.mv240RotuloRankingEjecutivo()
      : "JEFATURA";

    const periodoHtml = typeof window.encabezadoPeriodoRanking === "function"
      ? window.encabezadoPeriodoRanking(referencia) : "";
    const filtroHtml = typeof window.mv239FiltroSedeRanking === "function"
      ? window.mv239FiltroSedeRanking(listaCompleta,sedeFiltro) : "";
    const excelHtml = typeof window.mv358AbrirInformeRanking === "function"
      ? `<button type="button" onclick="mv358AbrirInformeRanking()" style="width:100%;margin:12px 0 4px;padding:12px 16px;border:0;border-radius:13px;background:linear-gradient(135deg,#15803d,#059669);color:#fff;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.22);">📊 Descargar informe Excel</button>`
      : "";

    window.mostrarPantalla(`
      <div style="padding:18px;max-width:980px;margin:auto;">
        <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>
        <div style="text-align:center;font-size:12px;font-weight:800;opacity:.72;margin-bottom:8px;">VISTA ${esc(rotulo)}</div>
        ${periodoHtml}
        ${filtroHtml}
        ${excelHtml}
        ${listaTarjetasConSla(ordenada,tipoPuesto)}
        <br>
        <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
      </div>`);
  }

  // IMPORTANTE V412:
  // No se reemplaza mostrarRanking. Se conserva mostrarRankingDetallado de V358,
  // que ya utiliza el consolidado completo con todos sus detalles.
  window.tarjetaCuadrillaRanking = tarjetaDetalladaConSla;
  window.mv239RenderRankingJefatura = renderEjecutivoConSla;

  try { tarjetaCuadrillaRanking = tarjetaDetalladaConSla; } catch(_) {}
  try { mv239RenderRankingJefatura = renderEjecutivoConSla; } catch(_) {}

  window.MV411_RANKING_SLA_OK = true;
  window.MV412_RANKING_SLA_DIRECTO_OK = true;
  console.log("MI VISUAL V412: Ranking conserva detalle completo y muestra SLA en el renderer ejecutivo real.");
})();
