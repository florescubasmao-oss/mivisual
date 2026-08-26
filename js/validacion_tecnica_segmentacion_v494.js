/* ============================================================
   MI VISUAL V495 - VALIDACION VTR/GAR SEGMENTADA

   Alcance:
   - En REGISTRO conserva la navegacion Registro / Validacion.
   - Dentro de VALIDACION oculta el boton Validacion porque ya es la vista activa.
   - Elimina el filtro manual de periodo.
   - Conserva filtros: busqueda, tipo y estado.
   - Ordena periodos por la fecha real mas reciente de sus casos.
   - Dentro de cada periodo segmenta por SEDE.
   - Periodo, sede y caso quedan cerrados por defecto.
   - No agrega llamadas API ni modifica backend, cache o reglas.
============================================================ */
(function(){
  "use strict";

  if(window.MV494_VTRGAR_SEGMENTACION_OK) return;
  window.MV494_VTRGAR_SEGMENTACION_OK = true;

  let timer = null;
  let observer = null;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

  function nombrePeriodoDesdeFecha(ts){
    if(!Number.isFinite(ts) || ts <= 0) return "";
    const d = new Date(ts);
    return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  }

  function nombrePeriodo(v){
    const t = String(v == null ? "" : v).trim();
    const m = t.match(/^(\d{4})[-\/]?(\d{2})$/);
    if(m){
      const n = Number(m[2]);
      return `${MESES[n-1] || m[2]} ${m[1]}`;
    }
    return t || "SIN PERIODO";
  }

  function instalarCss(){
    if(document.getElementById("mv494-css")) return;
    const style = document.createElement("style");
    style.id = "mv494-css";
    style.textContent = `
      .mv489-tools.mv494-tools{grid-template-columns:2fr 1fr 1fr !important}
      .mv494-sede{border:1px solid #d7e2ef;border-radius:12px;overflow:hidden;background:#fff;margin:7px 0}
      .mv494-sede>summary{cursor:pointer;list-style:none;padding:10px 12px;background:#f8fafc;font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#0f172a}
      .mv494-sede>summary::-webkit-details-marker{display:none}
      .mv494-sede-body{padding:8px;display:grid;gap:8px;background:#f1f5f9}
      .mv494-sede-cant{font-size:11px;color:#475569;font-weight:800}
      .mv489-month>summary .mv494-periodo{font-weight:900}
      @media(max-width:760px){.mv489-tools.mv494-tools{grid-template-columns:1fr !important}}
    `;
    document.head.appendChild(style);
  }

  function eliminarFiltroPeriodo(){
    const sel = document.getElementById("mv489Periodo");
    if(sel) sel.remove();
    const tools = document.querySelector(".mv489-tools");
    if(tools) tools.classList.add("mv494-tools");
  }

  function normalizarTabs(){
    const grupos = Array.from(document.querySelectorAll(".mv489-tabs"));
    if(grupos.length > 1){
      grupos.slice(1).forEach(function(g){ g.remove(); });
    }

    const tabs = document.getElementById("mv489Tabs") || grupos[0];
    if(!tabs) return;

    const enValidacion = !!document.querySelector(".mv489-wrap");
    const vistos = {};

    Array.from(tabs.querySelectorAll("button")).forEach(function(b){
      const t = norm(b.textContent).replace(/^[^A-Z0-9]+/,"");
      const clave = t.indexOf("VALIDACION") >= 0 ? "VALIDACION" : (t.indexOf("REGISTRO") >= 0 ? "REGISTRO" : t);

      if(enValidacion && clave === "VALIDACION"){
        b.remove();
        return;
      }

      if(vistos[clave]) b.remove();
      else vistos[clave] = true;
    });

    const sub = document.querySelector(".mv488-subnav");
    if(sub && sub !== tabs){
      const tx = norm(sub.textContent);
      if(tx.indexOf("REGISTRO") >= 0 && tx.indexOf("VALIDACION") >= 0){
        sub.remove();
      }
    }
  }

  function parseFecha(v){
    const t = String(v == null ? "" : v).trim();
    if(!t) return 0;

    let m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if(m){
      return new Date(Number(m[1]),Number(m[2])-1,Number(m[3])).getTime();
    }

    m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if(m){
      return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
    }

    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function fechaCaso(caso){
    if(!caso) return 0;
    const bloques = Array.from(caso.querySelectorAll(".mv489-detail .mv489-grid > div"));
    for(let i=0;i<bloques.length;i++){
      const lab = norm(bloques[i].querySelector(".mv489-label") && bloques[i].querySelector(".mv489-label").textContent);
      if(lab === "FECHA"){
        const val = bloques[i].querySelector(".mv489-value");
        const ts = parseFecha(val && val.textContent);
        if(ts) return ts;
      }
    }
    return 0;
  }

  function sedeDeCaso(caso){
    if(!caso) return "SIN SEDE";
    const summary = caso.querySelector(":scope > summary") || caso.querySelector("summary");
    if(!summary) return "SIN SEDE";

    const bloques = Array.from(summary.children || []);
    for(let i=0;i<bloques.length;i++){
      const etiquetaEl = bloques[i].querySelector && bloques[i].querySelector(".mv489-label");
      const etiqueta = norm(etiquetaEl && etiquetaEl.textContent);
      if(etiqueta === "SEDE"){
        const val = bloques[i].querySelector(".mv489-value");
        return norm(val && val.textContent) || "SIN SEDE";
      }
    }

    const vals = Array.from(summary.querySelectorAll(".mv489-value"));
    return norm(vals[1] && vals[1].textContent) || "SIN SEDE";
  }

  function ordenSedes(a,b){
    const orden = {"CHICLAYO":1,"PIURA":2,"TRUJILLO":3,"SIN SEDE":99};
    const na = orden[a] || 50;
    const nb = orden[b] || 50;
    return na !== nb ? na-nb : a.localeCompare(b);
  }

  function obtenerCasosDirectos(body){
    return Array.from(body.children).filter(function(x){
      return x.classList && x.classList.contains("mv489-case");
    });
  }

  function segmentarMes(mes){
    if(!mes) return;
    const body = mes.querySelector(":scope > .mv489-month-body");
    if(!body) return;

    const casos = obtenerCasosDirectos(body);
    if(!casos.length){
      mes.open = false;
      return;
    }

    casos.forEach(function(caso){ caso.open = false; });

    let ultima = 0;
    casos.forEach(function(caso){
      ultima = Math.max(ultima,fechaCaso(caso));
    });
    mes.dataset.mv495Fecha = String(ultima || 0);

    const grupos = {};
    casos.forEach(function(caso){
      const sede = sedeDeCaso(caso);
      if(!grupos[sede]) grupos[sede] = [];
      grupos[sede].push(caso);
    });

    const frag = document.createDocumentFragment();
    Object.keys(grupos).sort(ordenSedes).forEach(function(sede){
      const det = document.createElement("details");
      det.className = "mv494-sede";
      det.open = false;

      const sum = document.createElement("summary");
      sum.innerHTML = `<span>🏢 ${sede}</span><span class="mv494-sede-cant">${grupos[sede].length} caso${grupos[sede].length === 1 ? "" : "s"}</span>`;

      const inner = document.createElement("div");
      inner.className = "mv494-sede-body";
      grupos[sede].forEach(function(caso){
        caso.open = false;
        inner.appendChild(caso);
      });

      det.appendChild(sum);
      det.appendChild(inner);
      frag.appendChild(det);
    });

    body.innerHTML = "";
    body.appendChild(frag);
    mes.open = false;

    const resumen = mes.querySelector(":scope > summary");
    if(resumen){
      const spans = resumen.querySelectorAll("span");
      if(spans[0]){
        const original = spans[0].textContent;
        spans[0].textContent = nombrePeriodoDesdeFecha(ultima) || nombrePeriodo(original);
        spans[0].classList.add("mv494-periodo");
      }
    }
  }

  function asegurarTodoCerrado(cont){
    if(!cont) return;
    cont.querySelectorAll("details.mv489-month,details.mv494-sede,details.mv489-case").forEach(function(d){
      d.open = false;
    });
  }

  function ordenarPeriodos(cont){
    if(!cont) return;
    const meses = Array.from(cont.querySelectorAll(":scope > .mv489-month"));
    meses.sort(function(a,b){
      const fa = Number(a.dataset.mv495Fecha || 0);
      const fb = Number(b.dataset.mv495Fecha || 0);
      if(fa !== fb) return fb-fa;
      return norm(b.textContent).localeCompare(norm(a.textContent));
    });
    meses.forEach(function(m){ cont.appendChild(m); });
  }

  function segmentarContenido(){
    const cont = document.getElementById("mv489Contenido");
    if(!cont) return;
    Array.from(cont.querySelectorAll(":scope > .mv489-month")).forEach(segmentarMes);
    ordenarPeriodos(cont);
    asegurarTodoCerrado(cont);
  }

  function aplicar(){
    if(window.MV488_VT_MODO !== "VTRGAR") return;
    instalarCss();
    eliminarFiltroPeriodo();
    normalizarTabs();
    segmentarContenido();
  }

  function programar(){
    clearTimeout(timer);
    timer = setTimeout(aplicar,0);
  }

  const baseRender = window.mv489RenderValidacion;
  if(typeof baseRender === "function" && !baseRender.__mv494){
    const fn = function(){
      const r = baseRender.apply(this,arguments);
      setTimeout(aplicar,0);
      return r;
    };
    fn.__mv494 = true;
    fn.__mv494Base = baseRender;
    window.mv489RenderValidacion = fn;
    try{ mv489RenderValidacion = fn; }catch(_){}
  }

  if(document.body){
    observer = new MutationObserver(function(){
      if(document.getElementById("mv489Contenido") || document.getElementById("mv489Tabs")) programar();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  aplicar();
  setTimeout(aplicar,250);
  setTimeout(aplicar,900);
})();
