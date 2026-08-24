/* ============================================================
   MI VISUAL V480 - GESTIÓN DE ACTAS / DESCARGA POR PERÍODO

   Alcance estricto:
   - Exporta a CSV compatible con Excel usando SOLO window._actasTodas.
   - No realiza consultas adicionales a Apps Script.
   - No modifica datos, filtros, validaciones, Drive ni Sheets.
   - Conserva V392/V393/V396/V402/V403, V455 y V479.
   - El período se determina por FECHA_GESTION.
============================================================ */
(function(){
  "use strict";

  if(window.MV480_ACTAS_DESCARGA_CARGADO) return;
  window.MV480_ACTAS_DESCARGA_CARGADO = true;

  const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  let timer = null;
  let observer = null;
  let ultimaLista = null;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(v){
    if(typeof window.limpiarHtmlActas === "function") return window.limpiarHtmlActas(v || "");
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function fechaPartes(v){
    if(v instanceof Date && !isNaN(v.getTime())){
      return {y:v.getFullYear(),m:v.getMonth()+1,d:v.getDate()};
    }
    const t = String(v == null ? "" : v).trim();
    if(!t) return null;
    let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m) return {y:Number(m[3]),m:Number(m[2]),d:Number(m[1])};
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m) return {y:Number(m[1]),m:Number(m[2]),d:Number(m[3])};
    const d = new Date(t);
    if(!isNaN(d.getTime())){
      try{
        const partes = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).format(d).split("-");
        return {y:Number(partes[0]),m:Number(partes[1]),d:Number(partes[2])};
      }catch(_){}
    }
    return null;
  }

  function clavePeriodo(v){
    const p = fechaPartes(v);
    if(!p || !p.y || !p.m) return "";
    return `${p.y}-${String(p.m).padStart(2,"0")}`;
  }

  function etiquetaPeriodo(clave){
    const m = String(clave || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return clave || "SIN PERÍODO";
    return `${MESES[Number(m[2])-1] || m[2]} ${m[1]}`;
  }

  function fechaVisible(v){
    if(!v) return "";
    try{
      if(typeof window.fechaVisibleActas === "function"){
        const r = window.fechaVisibleActas(v);
        if(r && r !== "-") return r;
      }
    }catch(_){}
    const p = fechaPartes(v);
    if(!p) return String(v || "").trim();
    return `${String(p.d).padStart(2,"0")}/${String(p.m).padStart(2,"0")}/${p.y}`;
  }

  function estadoEscaneada(a){
    if(!a || !a.linkActa) return "NO SUBIDA";
    const j = norm(a.resultadoJefatura);
    const alm = norm(a.resultadoAlmacen);
    const est = norm(a.estado);
    const visible = norm(a.estadoVisibleTecnico);
    if(j === "OBSERVADO") return "OBSERVADO JEFATURA";
    if(j === "CORRECTO" || est === "FINALIZADO" || visible === "FINALIZADO" || visible === "CORRECTO") return "CORRECTO";
    if(alm === "OBSERVADO") return "OBSERVADO ALMACÉN";
    if(alm === "CORRECTO") return "CORRECTO ALMACÉN";
    return "PENDIENTE";
  }

  function estadoEntregada(a){
    const e = norm(a && a.estadoEntregaFisica || "PENDIENTE");
    return e || "PENDIENTE";
  }

  function estadoActa(a){
    try{
      if(typeof window.estadoFiltroActas === "function") return window.estadoFiltroActas(a) || "PENDIENTE";
    }catch(_){}
    const j = norm(a && a.resultadoJefatura);
    const alm = norm(a && a.resultadoAlmacen);
    const est = norm(a && a.estado);
    const origen = norm(a && a.origenRegistro);
    if(origen === "ALMACEN" && !a.linkActa) return "FALTANTE";
    if(est === "FINALIZADO" || j === "CORRECTO") return "FINALIZADA";
    if(j === "OBSERVADO" || alm === "OBSERVADO") return "OBSERVADA";
    return "PENDIENTE";
  }

  function periodosDisponibles(){
    const actas = Array.isArray(window._actasTodas) ? window._actasTodas : [];
    const set = new Set();
    actas.forEach(function(a){
      const k = clavePeriodo(a && a.fechaGestion);
      if(k) set.add(k);
    });
    return Array.from(set).sort().reverse();
  }

  function actasPeriodo(clave){
    const lista = Array.isArray(window._actasTodas) ? window._actasTodas.slice() : [];
    return lista.filter(function(a){ return clavePeriodo(a && a.fechaGestion) === clave; })
      .sort(function(a,b){
        const s = norm(a.sede).localeCompare(norm(b.sede),"es");
        if(s) return s;
        const c = norm(a.cuadrilla).localeCompare(norm(b.cuadrilla),"es",{numeric:true});
        if(c) return c;
        const fa = fechaPartes(a.fechaGestion), fb = fechaPartes(b.fechaGestion);
        const ka = fa ? fa.y*10000+fa.m*100+fa.d : 0;
        const kb = fb ? fb.y*10000+fb.m*100+fb.d : 0;
        if(ka !== kb) return ka-kb;
        return String(a.numeroActa||"").localeCompare(String(b.numeroActa||""),"es",{numeric:true});
      });
  }

  function celdaCsv(v){
    let t = String(v == null ? "" : v);
    // Evita que Excel interprete contenido textual como fórmula.
    if(/^[=+\-@]/.test(t)) t = "'" + t;
    return `"${t.replace(/"/g,'""')}"`;
  }

  function descargarPeriodo(){
    const select = document.getElementById("mv480PeriodoActas");
    const clave = select && select.value || "";
    if(!clave){
      alert("Seleccione un período para descargar.");
      return;
    }
    const actas = actasPeriodo(clave);
    if(!actas.length){
      alert("No existen actas para el período seleccionado.");
      return;
    }

    const cabecera = [
      "SEDE","CUADRILLA","FECHA DE GESTIÓN","FECHA DE SUBIDA","N.° DE ACTA",
      "CÓDIGO DE PEDIDO","CÓDIGO DE ORDEN","ESTADO ESCANEADA","ESTADO ENTREGADA",
      "TIPO DE PARTIDA","ESTADO DEL ACTA"
    ];

    const filas = actas.map(function(a){
      return [
        a.sede || "",
        a.cuadrilla || "",
        fechaVisible(a.fechaGestion),
        fechaVisible(a.fechaRegistro),
        a.numeroActa || "",
        a.codigoPedido || "",
        a.codigoOrden || "",
        estadoEscaneada(a),
        estadoEntregada(a),
        a.tipoPartida || "",
        estadoActa(a)
      ];
    });

    const csv = "\uFEFFsep=;\r\n" + [cabecera].concat(filas)
      .map(function(f){ return f.map(celdaCsv).join(";"); })
      .join("\r\n");

    const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ACTAS_${etiquetaPeriodo(clave).replace(/\s+/g,"_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); },1000);
  }

  function actualizarConteo(){
    const select = document.getElementById("mv480PeriodoActas");
    const info = document.getElementById("mv480ConteoActas");
    if(!select || !info) return;
    const n = actasPeriodo(select.value).length;
    info.textContent = `${n} acta${n===1?"":"s"} en el período`;
  }

  function instalarEstilos(){
    if(document.getElementById("mv480ActasDescargaCss")) return;
    const s = document.createElement("style");
    s.id = "mv480ActasDescargaCss";
    s.textContent = `
      .mv480-descarga{
        display:flex;align-items:end;gap:9px;flex-wrap:wrap;
        padding:11px 12px;margin:0 0 12px;
        border:1px solid #bfdbfe;border-radius:14px;
        background:#eff6ff;color:#0f172a;
      }
      .mv480-descarga-titulo{font-size:12px;font-weight:900;margin-right:auto;align-self:center}
      .mv480-descarga-campo{display:flex;flex-direction:column;gap:4px;min-width:190px}
      .mv480-descarga-campo label{font-size:10px;font-weight:900;color:#475569}
      .mv480-descarga select{border:1px solid #93c5fd;border-radius:10px;padding:8px 10px;background:#fff;color:#0f172a;font-weight:800}
      .mv480-descarga button{border:0;border-radius:10px;padding:9px 12px;background:#166534;color:#fff;font-weight:900;cursor:pointer}
      .mv480-descarga button:disabled{opacity:.55;cursor:not-allowed}
      .mv480-conteo{font-size:10px;color:#475569;font-weight:800;align-self:center}
      @media(max-width:600px){
        .mv480-descarga{align-items:stretch}
        .mv480-descarga-titulo{width:100%;margin:0}
        .mv480-descarga-campo{width:100%;min-width:0}
        .mv480-descarga button{width:100%}
        .mv480-conteo{width:100%}
      }
    `;
    document.head.appendChild(s);
  }

  function construirPanel(){
    const wrap = document.querySelector("#pantalla .actas-wrap");
    const head = wrap && wrap.querySelector(".actas-head");
    const listaActual = Array.isArray(window._actasTodas) ? window._actasTodas : null;
    if(!wrap || !head || !listaActual) return false;

    let panel = document.getElementById("mv480DescargaActas");

    // El observador escucha toda la pantalla. Si el panel ya corresponde a
    // la misma carga de Actas, no lo reconstruye al reaccionar a su propio DOM.
    if(panel && ultimaLista === listaActual) return true;

    const periodos = periodosDisponibles();
    const actual = panel && panel.querySelector("#mv480PeriodoActas") ? panel.querySelector("#mv480PeriodoActas").value : "";

    if(!panel){
      instalarEstilos();
      panel = document.createElement("div");
      panel.id = "mv480DescargaActas";
      panel.className = "mv480-descarga";
      head.insertAdjacentElement("afterend",panel);
    }

    const hoy = new Date();
    const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
    const seleccionado = periodos.includes(actual) ? actual : (periodos.includes(claveHoy) ? claveHoy : (periodos[0] || ""));

    panel.innerHTML = `
      <div class="mv480-descarga-titulo">⬇ Descarga de actas por período</div>
      <div class="mv480-descarga-campo">
        <label>PERÍODO DE GESTIÓN</label>
        <select id="mv480PeriodoActas">
          ${periodos.length ? periodos.map(function(k){return `<option value="${esc(k)}" ${k===seleccionado?"selected":""}>${esc(etiquetaPeriodo(k))}</option>`;}).join("") : '<option value="">SIN PERÍODOS</option>'}
        </select>
      </div>
      <button type="button" id="mv480BtnDescargar" ${periodos.length?"":"disabled"}>Descargar Excel (CSV)</button>
      <div id="mv480ConteoActas" class="mv480-conteo"></div>`;

    const select = panel.querySelector("#mv480PeriodoActas");
    const boton = panel.querySelector("#mv480BtnDescargar");
    if(select) select.onchange = actualizarConteo;
    if(boton) boton.onclick = descargarPeriodo;
    actualizarConteo();
    ultimaLista = listaActual;
    return true;
  }

  function programar(){
    if(timer) return;
    timer = setTimeout(function(){
      timer = null;
      construirPanel();
    },80);
  }

  function iniciar(){
    programar();
    if(observer) return;
    observer = new MutationObserver(programar);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  window.mv480DescargarActasPeriodo = descargarPeriodo;
  window.MV480_ACTAS_DESCARGA_OK = true;
})();
