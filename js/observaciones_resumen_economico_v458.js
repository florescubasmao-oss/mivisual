/* ============================================================
   MI VISUAL V458 - RESUMEN ECONOMICO DE OBSERVACIONES

   Alcance estricto:
   - SOLO cambia la presentacion del resumen de Observaciones.
   - NO modifica OBSERVACIONES, RESUMEN_OBSERVACIONES ni Apps Script.
   - NO modifica factorImpactoObs / importeImpactoObs existentes.
   - Ranking, Dashboard, Analisis Economico y Bonos conservan exactamente
     sus calculos y campos actuales.

   Lectura de gestion mostrada en Observaciones:
   WIN observado acumulado = monto nominal WIN no anulado.
   WIN en gestion          = DERIVADO + EN PROCESO + APELADO.
   WIN penalizado          = PENALIZADO.
   WIN subsanado           = SUBSANADO.
   VISUAL                  = cantidad y monto nominal no anulado, separado.
============================================================ */
(function(){
  "use strict";

  if(window.MV458_OBSERVACIONES_RESUMEN_ECONOMICO_OK) return;
  window.MV458_OBSERVACIONES_RESUMEN_ECONOMICO_OK = true;

  function texto(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function monto(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function soles(v){
    return "S/ " + monto(v).toLocaleString("es-PE",{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    });
  }

  function fuente(o){
    const f = texto(o && o.fuente);
    if(f.includes("WIN")) return "WIN";
    if(f.includes("VISUAL")) return "VISUAL";
    return "";
  }

  function estado(o){
    return texto(o && o.estado);
  }

  function resumen(lista){
    const r = {
      total:0, derivadas:0, proceso:0, penalizadas:0, apeladas:0, subsanadas:0,
      win:{cantidad:0, observado:0, gestion:0, penalizado:0, subsanado:0},
      visual:{cantidad:0, monto:0}
    };

    (Array.isArray(lista) ? lista : []).forEach(function(o){
      const e = estado(o);
      const f = fuente(o);
      const m = monto(o && o.monto);

      r.total++;
      if(e === "DERIVADO") r.derivadas++;
      else if(e === "EN PROCESO") r.proceso++;
      else if(e === "PENALIZADO") r.penalizadas++;
      else if(e === "APELADO") r.apeladas++;
      else if(e === "SUBSANADO") r.subsanadas++;

      // ANULADO no forma parte de la exposicion economica vigente.
      if(e === "ANULADO") return;

      if(f === "WIN"){
        r.win.cantidad++;
        r.win.observado += m;
        if(e === "DERIVADO" || e === "EN PROCESO" || e === "APELADO") r.win.gestion += m;
        if(e === "PENALIZADO") r.win.penalizado += m;
        if(e === "SUBSANADO") r.win.subsanado += m;
      }else if(f === "VISUAL"){
        r.visual.cantidad++;
        r.visual.monto += m;
      }
    });

    return r;
  }

  function css(){
    if(document.getElementById("mv458ObservacionesCss")) return;
    const s = document.createElement("style");
    s.id = "mv458ObservacionesCss";
    s.textContent = `
      #resumenObservaciones.mv458-resumen-economico{display:block!important;width:100%;}
      .mv458-titulo-bloque{font-size:12px;font-weight:950;letter-spacing:.35px;color:#dbeafe;margin:14px 0 8px;}
      .mv458-grid-estados{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
      .mv458-grid-economico{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
      .mv458-grid-visual{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .mv458-money{min-width:0;border-radius:16px;padding:14px 10px;text-align:center;color:#fff;background:#142844;border:1px solid rgba(255,255,255,.10);box-shadow:0 5px 14px rgba(0,0,0,.16);}
      .mv458-money b{display:block;font-size:19px;line-height:1.15;overflow-wrap:anywhere;}
      .mv458-money span{display:block;font-size:10px;font-weight:900;margin-top:6px;color:#dbeafe;line-height:1.2;}
      .mv458-money small{display:block;font-size:8.5px;margin-top:4px;color:#9fb7d8;line-height:1.25;}
      .mv458-observado{background:linear-gradient(135deg,#1e3a8a,#1d4ed8);}
      .mv458-gestion{background:linear-gradient(135deg,#92400e,#d97706);}
      .mv458-penalizado{background:linear-gradient(135deg,#991b1b,#dc2626);}
      .mv458-subsanado{background:linear-gradient(135deg,#166534,#16a34a);}
      .mv458-visual{background:linear-gradient(135deg,#334155,#475569);}
      .mv458-sede-card{background:#fff;color:#0f172a;border-radius:13px;padding:11px 12px;border-left:5px solid #06b6d4;box-shadow:0 3px 10px rgba(0,0,0,.10);min-width:0;}
      .mv458-sede-card b{font-size:13px;}
      .mv458-sede-cantidad{font-size:10px;margin-top:2px;color:#475569;}
      .mv458-sede-linea{font-size:10px;font-weight:850;margin-top:4px;line-height:1.25;}
      .mv458-win{color:#047857}.mv458-pen{color:#b91c1c}.mv458-vis{color:#334155}
      @media(max-width:700px){
        .mv458-grid-estados{grid-template-columns:repeat(2,minmax(0,1fr));}
        .mv458-grid-economico{grid-template-columns:repeat(2,minmax(0,1fr));}
      }
      @media(max-width:420px){
        .mv458-money{padding:12px 7px}.mv458-money b{font-size:17px}.mv458-money span{font-size:9px}
      }
    `;
    document.head.appendChild(s);
  }

  function tarjetaEstado(clase, valor, rotulo){
    return `<div class="obs-kpi ${clase}"><b>${valor}</b><span>${rotulo}</span></div>`;
  }

  function tarjetaMonto(clase, valor, rotulo, detalle){
    return `<div class="mv458-money ${clase}">
      <b>${soles(valor)}</b>
      <span>${rotulo}</span>
      ${detalle ? `<small>${detalle}</small>` : ""}
    </div>`;
  }

  function pintarResumen(lista){
    const cont = document.getElementById("resumenObservaciones");
    if(!cont) return;
    css();
    const r = resumen(lista);

    cont.classList.add("mv458-resumen-economico");
    cont.innerHTML = `
      <div class="mv458-titulo-bloque">📋 ESTADO DE OBSERVACIONES</div>
      <div class="mv458-grid-estados">
        ${tarjetaEstado("obs-total",r.total,"Total")}
        ${tarjetaEstado("obs-der",r.derivadas,"Derivadas")}
        ${tarjetaEstado("obs-pro",r.proceso,"En proceso")}
        ${tarjetaEstado("obs-pen",r.penalizadas,"Penalizadas")}
        ${tarjetaEstado("obs-ape",r.apeladas,"Apeladas")}
        ${tarjetaEstado("obs-subsa",r.subsanadas,"Subsanadas")}
      </div>

      <div class="mv458-titulo-bloque">💰 CONTROL ECONÓMICO WIN</div>
      <div class="mv458-grid-economico">
        ${tarjetaMonto("mv458-observado",r.win.observado,"OBSERVADO ACUMULADO","Monto nominal WIN a la fecha")}
        ${tarjetaMonto("mv458-gestion",r.win.gestion,"EN GESTIÓN","Derivado + En proceso + Apelado")}
        ${tarjetaMonto("mv458-penalizado",r.win.penalizado,"PENALIZADO","Monto confirmado como penalidad")}
        ${tarjetaMonto("mv458-subsanado",r.win.subsanado,"SUBSANADO","Monto levantado / subsanado")}
      </div>

      <div class="mv458-titulo-bloque">🏢 OBSERVACIONES INTERNAS VISUAL</div>
      <div class="mv458-grid-visual">
        <div class="mv458-money mv458-visual"><b>${r.visual.cantidad}</b><span>OBSERVACIONES VISUAL</span></div>
        ${tarjetaMonto("mv458-visual",r.visual.monto,"MONTO VISUAL","Separado del control económico WIN")}
      </div>
    `;
  }

  function ordenSede(nombre){
    const orden = {"CHICLAYO":1,"PIURA":2,"TRUJILLO":3};
    return orden[texto(nombre)] || 99;
  }

  function datosPorSede(lista){
    const mapa = {};
    (Array.isArray(lista) ? lista : []).forEach(function(o){
      const sede = texto(o && o.sede) || "SIN SEDE";
      if(!mapa[sede]) mapa[sede] = [];
      mapa[sede].push(o);
    });
    return Object.keys(mapa).map(function(sede){
      return {sede:sede, lista:mapa[sede], r:resumen(mapa[sede])};
    }).sort(function(a,b){
      const oa=ordenSede(a.sede), ob=ordenSede(b.sede);
      return oa===ob ? a.sede.localeCompare(b.sede) : oa-ob;
    });
  }

  function pintarPorSede(lista){
    const cont = document.getElementById("resumenObservacionesSede");
    if(!cont) return;
    css();
    const grupos = datosPorSede(lista);
    cont.innerHTML = grupos.map(function(g){
      return `<div class="mv458-sede-card">
        <b>${g.sede}</b>
        <div class="mv458-sede-cantidad">${g.r.total} observación${g.r.total===1?"":"es"}</div>
        <div class="mv458-sede-linea mv458-win">WIN observado: ${soles(g.r.win.observado)}</div>
        <div class="mv458-sede-linea mv458-pen">WIN penalizado: ${soles(g.r.win.penalizado)}</div>
        <div class="mv458-sede-linea mv458-vis">VISUAL: ${soles(g.r.visual.monto)}</div>
      </div>`;
    }).join("");
  }

  function resumenGrupoSede(sede, lista){
    const r = resumen(lista);
    return `${r.total} observación${r.total===1?"":"es"} · WIN observado ${soles(r.win.observado)} · WIN penalizado ${soles(r.win.penalizado)} · VISUAL ${soles(r.visual.monto)}`;
  }

  function instalar(){
    if(window.MV458_OBSERVACIONES_PATCH_INSTALADO) return true;
    if(typeof window.pintarResumenObservaciones !== "function") return false;
    if(typeof window.pintarResumenObservacionesPorSede !== "function") return false;

    css();
    window.pintarResumenObservaciones = pintarResumen;
    window.pintarResumenObservacionesPorSede = pintarPorSede;
    if(typeof window.resumenGrupoSedeObs === "function"){
      window.resumenGrupoSedeObs = resumenGrupoSede;
    }
    try{ pintarResumenObservaciones = pintarResumen; }catch(_){}
    try{ pintarResumenObservacionesPorSede = pintarPorSede; }catch(_){}
    try{ resumenGrupoSedeObs = resumenGrupoSede; }catch(_){}

    window.MV458_OBSERVACIONES_PATCH_INSTALADO = true;
    return true;
  }

  // Observaciones es un módulo lazy. Espera hasta que observaciones.js exista
  // y reemplaza únicamente sus funciones de renderizado del resumen.
  let intentos = 0;
  const reloj = setInterval(function(){
    intentos++;
    if(instalar() || intentos > 1200) clearInterval(reloj);
  },50);

  instalar();
})();
