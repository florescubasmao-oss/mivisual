/* ============================================================
   MI VISUAL V413 - SLA visible en Ranking REAL
   - No reemplaza el cálculo ni la carga del Ranking.
   - Conserva ranking_informe_v358.js completo.
   - Después de que V358 dibuja cada tarjeta, agrega SLA usando
     los datos consolidados que ya existen en MI VISUAL.
   - Funciona para Jefatura/Gerencia y Supervisor.
============================================================ */
(function(){
  "use strict";
  if(window.MV413_RANKING_SLA_VISUAL_OK) return;

  const baseMostrarRanking = window.mostrarRanking;
  const baseRenderJefatura = window.mv239RenderRankingJefatura;
  const CACHE = new Map();

  if(typeof baseMostrarRanking !== "function"){
    console.warn("V413 Ranking SLA: mostrarRanking todavía no está disponible.");
    return;
  }

  function norm(v){
    return String(v || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function num(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function periodoActual(solicitado){
    const p = String(solicitado || window.MV276_RANKING_PERIODO || "").trim();
    return /^\d{4}-\d{2}$/.test(p) ? p : "";
  }

  function etiquetaPeriodo(periodo){
    if(typeof window.mv276EtiquetaPeriodo === "function"){
      return window.mv276EtiquetaPeriodo(periodo);
    }
    const m = String(periodo || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return periodo || "PERÍODO";
    const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    return `${meses[Number(m[2])-1] || ""} ${m[1]}`.trim();
  }

  function semaforoSla(valor){
    const x = num(valor);
    if(x < 60) return {icono:"🔴", texto:"CRÍTICO"};
    if(x < 80) return {icono:"🟠", texto:"BAJO"};
    if(x < 90) return {icono:"🟡", texto:"EN SEGUIMIENTO"};
    return {icono:"🟢", texto:"CONFORME"};
  }

  function listaLocalConSla(){
    const lista = Array.isArray(window.MV239_RANKING_JEFATURA_LISTA)
      ? window.MV239_RANKING_JEFATURA_LISTA
      : [];
    if(lista.some(x => x && (x.detSla || x.slaAjustado !== undefined || x.sla !== undefined))){
      return lista;
    }
    return null;
  }

  async function consultarConsolidado(periodo){
    const local = listaLocalConSla();
    if(local) return local;

    const key = periodo || "AUTO";
    const cache = CACHE.get(key);
    if(cache && Date.now() - cache.fecha < 120000) return cache.lista;

    const api = window.MI_VISUAL_API_URL || "";
    if(!api) return [];

    const url = new URL(api);
    url.searchParams.set("accion", "obtenerResumenDashboardRanking");
    url.searchParams.set("usuario", localStorage.getItem("usuario") || "");
    if(periodo) url.searchParams.set("periodo", periodo);
    url.searchParams.set("forzarActualizacion", "NO");
    url.searchParams.set("_v413", Date.now());

    const r = await fetch(url.toString(), {
      method:"GET",
      cache:"no-store",
      headers:{Accept:"application/json"}
    });
    const t = (await r.text()).trim();
    if(!r.ok || !t || /^<!doctype|^<html|^MI VISUAL API OK$/i.test(t)) return [];

    const d = JSON.parse(t);
    const lista = d && d.ok && Array.isArray(d.lista) ? d.lista : [];
    CACHE.set(key, {fecha:Date.now(), lista});
    return lista;
  }

  function buscarTarjetaCuadrilla(cuadrilla){
    const pantalla = document.getElementById("pantalla");
    if(!pantalla) return null;
    const objetivo = norm(cuadrilla);
    if(!objetivo) return null;

    const candidatos = Array.from(pantalla.querySelectorAll("div")).filter(el => {
      if(el.children.length) return false;
      return norm(el.textContent) === objetivo;
    });

    for(const titulo of candidatos){
      let nodo = titulo;
      for(let i=0; i<6 && nodo && nodo !== pantalla; i++, nodo=nodo.parentElement){
        const estilo = String(nodo.getAttribute("style") || "").replace(/\s+/g,"").toLowerCase();
        const bg = String(nodo.style?.backgroundColor || "").toLowerCase();
        if(estilo.includes("background:#1f2d48") || bg === "rgb(31, 45, 72)"){
          return nodo;
        }
      }
    }
    return null;
  }

  function gridIndicadores(card){
    if(!card) return null;
    const hijos = Array.from(card.children || []);
    return hijos.find(x => x.style && x.style.display === "grid") || null;
  }

  function crearIndicadorSla(r){
    const det = r.detSla || {};
    const ajustado = num(r.slaAjustado ?? r.sla ?? det.slaAjustado);
    const bruto = num(r.slaBruto ?? det.slaBruto);
    const evaluables = num(det.evaluables);
    const fuera = num(det.fueraAjustado ?? det.fueraBruto);
    const aprobadas = num(det.excepcionesAprobadas);
    const pendientes = num(det.excepcionesPendientes);
    const s = semaforoSla(ajustado);

    const el = document.createElement("div");
    el.dataset.mv413Sla = "1";
    el.style.background = "#0f172a";
    el.style.border = "1px solid rgba(255,255,255,.10)";
    el.style.borderRadius = "14px";
    el.style.padding = "12px";
    el.style.color = "white";
    el.style.minWidth = "0";
    el.style.gridColumn = "1 / -1";
    el.innerHTML = `
      <div style="font-size:12px;opacity:.80;">Tiempo de Gestión - SLA</div>
      <div style="display:flex;align-items:center;gap:7px;margin-top:4px;">
        <div style="font-size:18px;font-weight:900;">${ajustado.toFixed(2)}%</div>
        <span style="font-size:15px;">${s.icono}</span>
        <span style="font-size:10px;font-weight:900;opacity:.85;">${s.texto}</span>
      </div>
      <div style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.09);font-size:10px;line-height:1.4;color:#c8d8ed;">
        <div>Bruto ${bruto.toFixed(2)}% · Evaluables ${evaluables} · Fuera SLA ${fuera}</div>
        <div style="margin-top:3px;color:#8fb0d4;">Excepciones aprobadas ${aprobadas} · Pendientes ${pendientes}</div>
      </div>`;
    return el;
  }

  function corregirRotuloPeriodo(periodo){
    if(!periodo) return;
    const pantalla = document.getElementById("pantalla");
    if(!pantalla) return;
    Array.from(pantalla.querySelectorAll("div")).forEach(el => {
      if(el.children.length === 0 && norm(el.textContent) === "SIN PERIODO"){
        el.textContent = etiquetaPeriodo(periodo);
      }
    });
  }

  async function inyectarSla(periodoSolicitado){
    const periodo = periodoActual(periodoSolicitado);
    corregirRotuloPeriodo(periodo);

    let lista = [];
    try{
      lista = await consultarConsolidado(periodo);
    }catch(error){
      console.warn("V413 Ranking SLA: no se pudo consultar el consolidado", error);
      return;
    }

    if(!Array.isArray(lista) || !lista.length) return;

    lista.forEach(r => {
      if(!r || !r.cuadrilla) return;
      const det = r.detSla || {};
      const tieneSla = num(det.evaluables) > 0 || r.slaAjustado !== undefined || r.sla !== undefined;
      if(!tieneSla) return;

      const card = buscarTarjetaCuadrilla(r.cuadrilla);
      const grid = gridIndicadores(card);
      if(!grid || grid.querySelector('[data-mv413-sla="1"]')) return;
      grid.appendChild(crearIndicadorSla(r));
    });
  }

  async function mostrarRankingV413(){
    const args = Array.from(arguments);
    const resultado = await baseMostrarRanking.apply(window, args);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await inyectarSla(args[0]);
    return resultado;
  }

  function renderJefaturaV413(){
    const args = Array.from(arguments);
    const resultado = typeof baseRenderJefatura === "function"
      ? baseRenderJefatura.apply(window, args)
      : undefined;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      inyectarSla(window.MV276_RANKING_PERIODO).catch(()=>{});
    }));
    return resultado;
  }

  window.mostrarRanking = mostrarRankingV413;
  if(typeof baseRenderJefatura === "function"){
    window.mv239RenderRankingJefatura = renderJefaturaV413;
  }

  window.MV413_RANKING_SLA_VISUAL_OK = true;
  console.log("MI VISUAL V413: SLA insertado sobre el Ranking real sin reemplazar su lógica.");
})();
