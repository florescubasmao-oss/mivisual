/* ============================================================
   MI VISUAL V519A - APERTURA MENSUAL SEGURA
   31/08/2026

   SOLO FRONTEND / CAPA DE PERÍODOS
   - El mes vigente aparece aunque todavía no tenga registros.
   - Desde 01/09/2026, SETIEMBRE abre como período actual.
   - AGOSTO continúa disponible para consulta/corrección según permisos.
   - JULIO y anteriores conservan el cierre definido por el backend.
   - GAR/VTR: fuerza el período vigente después de abrir la vista si el
     backend aún toma como referencia el último corte del Ranking.
   - Validación Técnica: agrega filtro mensual explícito para Jefatura.
   - Actas: separa vista/resumen por mes de gestión y conserva descarga.
   - No modifica Sheets, Apps Script, Producción, Ranking, SLA ni cálculos.
============================================================ */
(function(){
  "use strict";
  if(window.MV519A_PERIODOS_MENSUALES_OK) return;
  window.MV519A_PERIODOS_MENSUALES_OK = true;

  const MESES = [
    "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
    "JULIO","AGOSTO","SETIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
  ];
  const PERIODO_CERRADO_HASTA = "2026-07";

  let periodoBase = periodoActualLima();
  let periodoGarVtr = periodoBase;
  let periodoVt = periodoBase;
  let periodoActas = periodoBase;
  let ultimoGarVtrForzado = "";
  let timer = null;
  let observador = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function esTecnico(){ return norm(localStorage.getItem("perfil")) === "TECNICO"; }

  function periodoActualLima(){
    try{
      const partes = new Intl.DateTimeFormat("en-CA",{
        timeZone:"America/Lima", year:"numeric", month:"2-digit"
      }).formatToParts(new Date());
      const y = partes.find(x=>x.type==="year")?.value || "";
      const m = partes.find(x=>x.type==="month")?.value || "";
      return y && m ? `${y}-${m}` : "";
    }catch(_){
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }
  }

  function sumarMes(periodo, desplazamiento){
    const m = txt(periodo).match(/^(\d{4})-(\d{2})$/);
    if(!m) return "";
    const d = new Date(Number(m[1]), Number(m[2])-1 + Number(desplazamiento||0), 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function nombrePeriodo(periodo){
    const m = txt(periodo).match(/^(\d{4})-(\d{2})$/);
    if(!m) return txt(periodo) || "SIN PERÍODO";
    return `${MESES[Number(m[2])-1] || m[2]} ${m[1]}`;
  }

  function estadoPeriodo(periodo){
    const actual = periodoActualLima();
    if(periodo === actual) return "EN CURSO";
    if(periodo && periodo <= PERIODO_CERRADO_HASTA) return "HISTÓRICO · CERRADO";
    return "HISTÓRICO";
  }

  function etiquetaPeriodo(periodo){
    return `${nombrePeriodo(periodo)} — ${estadoPeriodo(periodo)}`;
  }

  function periodoDesdeFecha(valor){
    if(valor instanceof Date && !Number.isNaN(valor.getTime())){
      try{
        const partes = new Intl.DateTimeFormat("en-CA",{
          timeZone:"America/Lima", year:"numeric", month:"2-digit"
        }).formatToParts(valor);
        const y = partes.find(x=>x.type==="year")?.value || "";
        const m = partes.find(x=>x.type==="month")?.value || "";
        return y && m ? `${y}-${m}` : "";
      }catch(_){}
    }

    const t = txt(valor);
    if(!t) return "";
    let m = t.match(/^(\d{4})[-\/](\d{1,2})(?:[-\/]\d{1,2})?/);
    if(m) return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}`;
    m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if(m) return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}`;

    const d = new Date(t);
    if(Number.isNaN(d.getTime())) return "";
    try{
      const partes = new Intl.DateTimeFormat("en-CA",{
        timeZone:"America/Lima", year:"numeric", month:"2-digit"
      }).formatToParts(d);
      const y = partes.find(x=>x.type==="year")?.value || "";
      const mm = partes.find(x=>x.type==="month")?.value || "";
      return y && mm ? `${y}-${mm}` : "";
    }catch(_){ return ""; }
  }

  function periodosOrdenados(valores){
    const set = new Set();
    const actual = periodoActualLima();
    if(actual) set.add(actual);
    const anterior = sumarMes(actual,-1);
    if(anterior) set.add(anterior);
    (valores || []).forEach(v=>{
      const p = /^\d{4}-\d{2}$/.test(txt(v)) ? txt(v) : periodoDesdeFecha(v);
      if(p) set.add(p);
    });
    return Array.from(set).sort().reverse();
  }

  function sincronizarCambioMes(){
    const actual = periodoActualLima();
    if(!actual || actual === periodoBase) return;
    if(periodoGarVtr === periodoBase) periodoGarVtr = actual;
    if(periodoVt === periodoBase) periodoVt = actual;
    if(periodoActas === periodoBase) periodoActas = actual;
    periodoBase = actual;
    ultimoGarVtrForzado = "";
  }

  function instalarCss(){
    if(document.getElementById("mv519aPeriodosCss")) return;
    const s = document.createElement("style");
    s.id = "mv519aPeriodosCss";
    s.textContent = `
      .mv519a-periodo-actas{display:flex;align-items:end;gap:9px;flex-wrap:wrap;padding:10px 11px;margin:0 0 10px;border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;color:#0f172a}
      .mv519a-periodo-actas label{display:flex;flex-direction:column;gap:4px;min-width:210px;font-size:10px;font-weight:900;color:#475569;text-transform:uppercase}
      .mv519a-periodo-actas select{width:100%;box-sizing:border-box;border:1px solid #93c5fd;border-radius:10px;padding:9px 10px;background:#fff;color:#0f172a;font-weight:900}
      .mv519a-periodo-actas span{font-size:10px;font-weight:800;color:#475569;padding-bottom:9px}
      @media(max-width:600px){.mv519a-periodo-actas label{width:100%;min-width:0}.mv519a-periodo-actas span{width:100%;padding-bottom:0}}
    `;
    document.head.appendChild(s);
  }

  /* ----------------------------------------------------------
     GAR / VTR
     No reemplaza el motor existente. Solo corrige el período visible y,
     si la primera carga quedó en el corte anterior, solicita el mes vigente.
  ---------------------------------------------------------- */
  function prepararSelectorGarVtr(id, funcionCambio){
    const sel = document.getElementById(id);
    if(!sel || typeof window[funcionCambio] !== "function") return false;

    const valorAntes = txt(sel.value);
    const valores = Array.from(sel.options || []).map(o=>txt(o.value)).filter(v=>/^\d{4}-\d{2}$/.test(v));
    const periodos = periodosOrdenados(valores);
    const deseado = periodos.includes(periodoGarVtr) ? periodoGarVtr : periodoActualLima();

    const firma = periodos.join("|") + "|" + deseado;
    if(sel.dataset.mv519aFirma !== firma){
      sel.innerHTML = periodos.map(p=>`<option value="${esc(p)}" ${p===deseado?"selected":""}>${esc(etiquetaPeriodo(p))}</option>`).join("");
      sel.dataset.mv519aFirma = firma;
    }
    sel.value = deseado;

    if(sel.dataset.mv519aPeriodo !== "1"){
      sel.dataset.mv519aPeriodo = "1";
      sel.addEventListener("change",function(){
        periodoGarVtr = txt(sel.value) || periodoActualLima();
        ultimoGarVtrForzado = periodoGarVtr;
      });
    }

    const actual = periodoActualLima();
    if(deseado === actual && valorAntes !== actual && ultimoGarVtrForzado !== actual){
      ultimoGarVtrForzado = actual;
      setTimeout(function(){
        if(typeof window[funcionCambio] === "function") window[funcionCambio](actual);
      },0);
    }
    return true;
  }

  function prepararGarVtr(){
    if(esTecnico()) return;
    prepararSelectorGarVtr("mv517c1Periodo","mv517c1CambiarPeriodo");
    prepararSelectorGarVtr("mv517aPeriodo","mv517aCambiarPeriodo");
  }

  function detectarEntradaGarVtr(ev){
    if(esTecnico()) return;
    const el = ev && ev.target && ev.target.closest ? ev.target.closest("button,[onclick]") : null;
    if(!el) return;
    const codigo = txt(el.getAttribute && el.getAttribute("onclick"));
    if(/mv489AbrirValidacionVtrGar|mv488AbrirVtrGar|mv489AbrirRegistroVtrGar/.test(codigo)){
      periodoGarVtr = periodoActualLima();
      ultimoGarVtrForzado = "";
    }
  }

  /* ----------------------------------------------------------
     VALIDACIÓN TÉCNICA
     Jefatura conserva HOY/7 DÍAS/TODO y suma meses explícitos.
     El bloque superior de pendientes no se altera para no ocultar pendientes
     de agosto cuando ya estemos en setiembre.
  ---------------------------------------------------------- */
  function instalarFiltroMesVT(){
    const fn = window.cumplePeriodoFiltroVT;
    if(typeof fn === "function" && !fn.__mv519aPeriodo){
      const base = fn;
      const nuevo = function(item,periodo){
        const p = txt(periodo).toUpperCase();
        if(/^\d{4}-\d{2}$/.test(p)){
          return periodoDesdeFecha(item && item.fechaRegistro) === p;
        }
        return base.apply(this,arguments);
      };
      nuevo.__mv519aPeriodo = true;
      nuevo.__mv519aBase = base;
      window.cumplePeriodoFiltroVT = nuevo;
      try{ cumplePeriodoFiltroVT = nuevo; }catch(_){}
    }
  }

  function prepararSelectorVT(){
    const sel = document.getElementById("vtFiltroPeriodo");
    if(!sel) return;
    const mesesDatos = (Array.isArray(window.vtValidacionesActuales) ? window.vtValidacionesActuales : [])
      .map(x=>periodoDesdeFecha(x && x.fechaRegistro)).filter(Boolean);
    const periodos = periodosOrdenados(mesesDatos);
    const especiales = ["TODO","HOY","SEMANA"];
    let deseado = periodoVt;
    if(!periodos.includes(deseado) && !especiales.includes(deseado)) deseado = periodoActualLima();

    const nuevaFirma = periodos.join("|");
    const necesitaReconstruir = sel.dataset.mv519aFirma !== nuevaFirma || sel.dataset.mv519aPeriodo !== "1";
    if(necesitaReconstruir){
      sel.innerHTML = periodos.map(p=>`<option value="${esc(p)}">${esc(etiquetaPeriodo(p))}</option>`).join("") +
        `<option value="TODO">Todos los períodos</option>` +
        `<option value="HOY">Hoy</option>` +
        `<option value="SEMANA">Últimos 7 días</option>`;
      sel.dataset.mv519aFirma = nuevaFirma;
      sel.dataset.mv519aPeriodo = "1";
      sel.addEventListener("change",function(){ periodoVt = txt(sel.value) || periodoActualLima(); });
      sel.value = deseado;
      periodoVt = deseado;
      setTimeout(function(){
        if(typeof window.renderHistorialValidacionLocal === "function") window.renderHistorialValidacionLocal();
      },0);
    }else if(sel.value !== deseado){
      sel.value = deseado;
    }
  }

  function prepararValidacionTecnica(){
    instalarFiltroMesVT();
    prepararSelectorVT();
  }

  /* ----------------------------------------------------------
     ACTAS
     Mes de vista = FECHA_GESTION. Solo si falta usa fecha de carpeta/registro.
     Se reutiliza el mismo listado ya cargado: no hace consultas adicionales.
  ---------------------------------------------------------- */
  function periodoActa(a){
    return periodoDesdeFecha(a && (a.fechaGestion || a.fechaCarpeta || a.fechaRegistro));
  }

  function actasDelPeriodo(lista,periodo){
    return (lista || []).filter(a=>periodoActa(a) === periodo);
  }

  function resumenActasLocal(lista){
    const base = ()=>({
      escaneadas:0,finalizadas:0,observadas:0,pendientes:0,
      correctasAlmacen:0,observadasAlmacen:0,correctasJefatura:0,observadasJefatura:0,
      entregadasFisicas:0,pendientesEntregaFisica:0,pendientesFecha:0,requierenConfirmacionFecha:0
    });
    const general = base(), sedes = {}, cuadrillas = {};

    (lista || []).forEach(a=>{
      const sede = norm(a && a.sede) || "SIN SEDE";
      const cuad = txt(a && a.cuadrilla) || "SIN CUADRILLA";
      const claveCuad = norm(cuad) || "SIN CUADRILLA";
      const estado = norm(a && a.estado);
      const ra = norm(a && a.resultadoAlmacen);
      const rj = norm(a && a.resultadoJefatura);
      const ef = norm(a && (a.estadoEntregaFisica || "PENDIENTE"));
      const observado = ra === "OBSERVADO" || rj === "OBSERVADO";
      const estadoFecha = norm(a && a.estadoFechaCarpeta);

      function sumar(o){
        o.escaneadas++;
        if(estado === "FINALIZADO" || rj === "CORRECTO") o.finalizadas++;
        if(observado) o.observadas++;
        if(estado === "PENDIENTE") o.pendientes++;
        if(ra === "CORRECTO") o.correctasAlmacen++;
        if(ra === "OBSERVADO") o.observadasAlmacen++;
        if(rj === "CORRECTO") o.correctasJefatura++;
        if(rj === "OBSERVADO") o.observadasJefatura++;
        if(ef === "ENTREGADA") o.entregadasFisicas++; else o.pendientesEntregaFisica++;
        if(estadoFecha === "PENDIENTE_MAPA") o.pendientesFecha++;
        if(estadoFecha === "REQUIERE_CONFIRMACION") o.requierenConfirmacionFecha++;
      }

      sumar(general);
      if(!sedes[sede]) sedes[sede] = Object.assign({sede:sede},base());
      if(!cuadrillas[claveCuad]) cuadrillas[claveCuad] = Object.assign({sede:sede,cuadrilla:cuad},base());
      sumar(sedes[sede]);
      sumar(cuadrillas[claveCuad]);
    });

    return {
      general:general,
      sedes:Object.keys(sedes).sort().map(k=>sedes[k]),
      cuadrillas:Object.keys(cuadrillas).sort().map(k=>cuadrillas[k])
    };
  }

  function pintarResumenActasMes(lista){
    if(typeof window.pintarResumenActas !== "function") return;
    try{ window.pintarResumenActas(resumenActasLocal(lista)); }catch(_){}
  }

  function instalarFiltroActas(){
    const fn = window.aplicarFiltrosActas;
    if(typeof fn !== "function" || fn.__mv519aPeriodo) return;
    const base = fn;
    const nuevo = function(){
      const completo = Array.isArray(window._actasTodas) ? window._actasTodas : [];
      const mes = periodoActas || periodoActualLima();
      const mensual = actasDelPeriodo(completo,mes);
      window._actasTodas = mensual;
      try{
        return base.apply(this,arguments);
      }finally{
        window._actasTodas = completo;
        pintarResumenActasMes(mensual);
        const r = document.getElementById("actasFiltroResultado");
        if(r) r.textContent = `${mensual.length} acta${mensual.length===1?"":"s"} · ${nombrePeriodo(mes)}`;
      }
    };
    nuevo.__mv519aPeriodo = true;
    nuevo.__mv519aBase = base;
    window.aplicarFiltrosActas = nuevo;
    try{ aplicarFiltrosActas = nuevo; }catch(_){}
  }

  function periodosActasDisponibles(){
    const lista = Array.isArray(window._actasTodas) ? window._actasTodas : [];
    return periodosOrdenados(lista.map(periodoActa).filter(Boolean));
  }

  function ejecutarFiltroActas(){
    if(typeof window.aplicarFiltrosActas === "function"){
      try{ window.aplicarFiltrosActas(); }catch(_){}
    }
  }

  function prepararSelectorActasTecnico(){
    if(!esTecnico()) return false;
    const cont = document.getElementById("actasFiltros");
    if(!cont || !Array.isArray(window._actasTodas)) return false;
    instalarCss();

    let bar = document.getElementById("mv519aActasPeriodoBar");
    if(!bar){
      bar = document.createElement("div");
      bar.id = "mv519aActasPeriodoBar";
      bar.className = "mv519a-periodo-actas";
      cont.insertBefore(bar,cont.firstChild);
    }

    const periodos = periodosActasDisponibles();
    if(!periodos.includes(periodoActas)) periodoActas = periodoActualLima();
    const firma = periodos.join("|") + "|" + periodoActas;
    if(bar.dataset.mv519aFirma !== firma){
      bar.innerHTML = `<label>📅 Período de gestión<select id="mv519aActasPeriodo">${periodos.map(p=>`<option value="${esc(p)}" ${p===periodoActas?"selected":""}>${esc(etiquetaPeriodo(p))}</option>`).join("")}</select></label><span>Las actas se muestran por su mes de gestión.</span>`;
      bar.dataset.mv519aFirma = firma;
      const sel = bar.querySelector("#mv519aActasPeriodo");
      if(sel) sel.addEventListener("change",function(){
        periodoActas = txt(sel.value) || periodoActualLima();
        const fecha = document.getElementById("filtroActaFecha");
        if(fecha) fecha.value = "";
        ejecutarFiltroActas();
      });
      ejecutarFiltroActas();
    }
    return true;
  }

  function prepararSelectorActasGestion(){
    if(esTecnico()) return false;
    const sel = document.getElementById("mv480PeriodoActas");
    if(!sel || !Array.isArray(window._actasTodas)) return false;
    const periodos = periodosActasDisponibles();
    if(!periodos.includes(periodoActas)) periodoActas = periodoActualLima();
    const firma = periodos.join("|");

    if(sel.dataset.mv519aFirma !== firma){
      sel.innerHTML = periodos.map(p=>`<option value="${esc(p)}" ${p===periodoActas?"selected":""}>${esc(etiquetaPeriodo(p))}</option>`).join("");
      sel.dataset.mv519aFirma = firma;
    }
    sel.value = periodoActas;

    if(sel.dataset.mv519aPeriodo !== "1"){
      sel.dataset.mv519aPeriodo = "1";
      sel.addEventListener("change",function(){
        periodoActas = txt(sel.value) || periodoActualLima();
        const fecha = document.getElementById("filtroActaFecha");
        if(fecha) fecha.value = "";
        ejecutarFiltroActas();
      });
    }

    const titulo = document.querySelector("#mv480DescargaActas .mv480-descarga-titulo");
    if(titulo && titulo.textContent !== "📅 Vista y descarga de actas por período") titulo.textContent = "📅 Vista y descarga de actas por período";
    return true;
  }

  function prepararActas(){
    instalarFiltroActas();
    const listo = prepararSelectorActasGestion() || prepararSelectorActasTecnico();
    if(listo){
      const filtro = window.aplicarFiltrosActas;
      if(typeof filtro === "function" && !document.getElementById("actasLista")?.dataset.mv519aPeriodoInicial){
        const lista = document.getElementById("actasLista");
        if(lista) lista.dataset.mv519aPeriodoInicial = "1";
        ejecutarFiltroActas();
      }
    }
  }

  function revisar(){
    sincronizarCambioMes();
    prepararGarVtr();
    prepararValidacionTecnica();
    prepararActas();
  }

  function programar(ms){
    if(timer) clearTimeout(timer);
    timer = setTimeout(function(){ timer=null; revisar(); }, ms == null ? 70 : ms);
  }

  function iniciar(){
    instalarCss();
    revisar();
    const objetivo = document.getElementById("pantalla") || document.body;
    if(objetivo && typeof MutationObserver === "function" && !observador){
      observador = new MutationObserver(function(){ programar(90); });
      observador.observe(objetivo,{childList:true,subtree:true});
    }
    document.addEventListener("click",function(ev){
      detectarEntradaGarVtr(ev);
      programar(80);
      setTimeout(revisar,260);
    },true);
    [120,350,800,1600,3200,6000].forEach(ms=>setTimeout(revisar,ms));
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  window.MV519A_PERIODO_ACTUAL = periodoActualLima;
  console.log("MI VISUAL V519A: apertura mensual segura activa.");
})();
