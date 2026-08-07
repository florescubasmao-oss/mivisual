/* ============================================================
   MI VISUAL V363 - Ranking detallado + SLA
   - Jefatura y Gerencia Lima.
   - Reutiliza el enriquecimiento analítico del Dashboard.
   - Carga datos en paralelo y conserva caché corta por período.
   - SheetJS se descarga solo al generar el Excel.
============================================================ */
(function(){
  "use strict";

  if(window.MV358_RANKING_DETALLADO_OK) return;

  const CACHE = new Map();
  const XLSX_URLS = [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];
  let promesaXlsx = null;

  const MV359_ESTADO = {
    lista:[],
    sede:"TODAS",
    periodo:"",
    periodos:[]
  };

  function norm(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(valor){
    return String(valor ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function num(valor){
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function pctNumero(valor){
    const n = num(valor);
    return n <= 1 ? n*100 : n;
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

  function red(valor,decimales=2){
    const factor = Math.pow(10,decimales);
    return Math.round((num(valor)+Number.EPSILON)*factor)/factor;
  }

  function perfilActual(){
    return norm(localStorage.getItem("perfil"));
  }

  function esVistaEjecutiva(){
    return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA"].includes(perfilActual());
  }

  function periodoNombre(periodo){
    const m = String(periodo || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return String(periodo || "PERIODO");
    const meses = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];
    return `${meses[Number(m[2])-1]} ${m[1]}`;
  }

  function mv359PeriodoDesdeFecha(valor){
    if(typeof window.mv276ClavePeriodo==="function"){
      const clave = window.mv276ClavePeriodo(valor);
      if(clave) return clave;
    }

    const texto = String(valor || "");
    let m = texto.match(/^(\d{4})-(\d{2})/);
    if(m) return `${m[1]}-${m[2]}`;

    m = texto.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})/);
    if(m) return `${m[2]}-${String(Number(m[1])).padStart(2,"0")}`;

    return "";
  }

  function mv360CorteVisible(valor){
    if(!valor) return "";
    const texto = String(valor).trim();

    let m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) return texto;

    m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;

    return texto;
  }

  function mv360NormalizarPeriodos(valores,periodoActual,lista){
    const mapa = new Map();

    function agregar(clave,etiqueta,corte){
      const periodo = String(clave || "").trim();
      if(!/^\d{4}-\d{2}$/.test(periodo)) return;

      const anterior = mapa.get(periodo) || {
        clave:periodo,
        etiqueta:periodoNombre(periodo),
        corte:""
      };

      if(etiqueta) anterior.etiqueta = String(etiqueta);
      if(corte) anterior.corte = mv360CorteVisible(corte);

      mapa.set(periodo,anterior);
    }

    (Array.isArray(valores) ? valores : []).forEach(item=>{
      if(typeof item==="string"){
        agregar(item,periodoNombre(item),"");
        return;
      }

      if(item && typeof item==="object"){
        const clave = item.clave || item.periodo || item.value || "";
        agregar(
          clave,
          item.etiqueta || item.label || periodoNombre(clave),
          item.corte || item.actualizacion || ""
        );
      }
    });

    (Array.isArray(lista) ? lista : []).forEach(item=>{
      const clave = mv359PeriodoDesdeFecha(item?.actualizacion);
      if(clave) agregar(clave,periodoNombre(clave),item?.actualizacion || "");
    });

    if(periodoActual){
      agregar(periodoActual,periodoNombre(periodoActual),"");
    }

    return Array.from(mapa.values())
      .sort((a,b)=>b.clave.localeCompare(a.clave));
  }

  function mv360PeriodoEnCurso(clave){
    const partes = new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Lima",
      year:"numeric",
      month:"2-digit"
    }).formatToParts(new Date());

    const actual = `${partes.find(x=>x.type==="year")?.value}-${partes.find(x=>x.type==="month")?.value}`;
    return clave===actual;
  }

  function mv360EtiquetaPeriodo(item){
    const clave = item?.clave || "";
    const estado = mv360PeriodoEnCurso(clave) ? "EN CURSO" : "HISTÓRICO";
    const corte = item?.corte ? ` · al ${item.corte}` : "";
    return `${item?.etiqueta || periodoNombre(clave)} — ${estado}${corte}`;
  }

  function mv359SelectorPeriodo(){
    const periodos = Array.isArray(MV359_ESTADO.periodos)
      ? MV359_ESTADO.periodos
      : [];

    if(!periodos.length) return "";

    return `
      <div style="
        margin:12px 0 18px;
        padding:14px;
        border-radius:16px;
        background:#142844;
        border:1px solid rgba(255,255,255,.10);
        color:#fff;
      ">
        <label style="display:block;font-size:12px;font-weight:900;margin-bottom:7px;">
          📅 Seleccionar período
        </label>
        <select
          id="mv360PeriodoRanking"
          onchange="mostrarRanking(this.value)"
          style="
            width:100%;
            padding:12px;
            border-radius:11px;
            border:1px solid #6ea8e5;
            background:#fff;
            color:#0f172a;
            font-weight:900;
          "
        >
          ${periodos.map(item=>`
            <option
              value="${esc(item.clave)}"
              ${item.clave===MV359_ESTADO.periodo ? "selected" : ""}
            >
              ${esc(mv360EtiquetaPeriodo(item))}
            </option>
          `).join("")}
        </select>
      </div>`;
  }

  function mv359EncabezadoPeriodo(referencia){
    const actualizado = referencia?.actualizacion || "";
    return `
      <div style="
        background:linear-gradient(135deg,#0f172a,#1e3a8a);
        border-radius:18px;
        padding:16px;
        margin:12px 0 8px;
        color:white;
        box-shadow:0 8px 20px rgba(0,0,0,.20);
      ">
        <div style="font-size:13px;opacity:.85;">📅 PERÍODO</div>
        <div style="font-size:22px;font-weight:900;margin-top:4px;">
          ${esc(periodoNombre(MV359_ESTADO.periodo))}
        </div>
        <div style="font-size:14px;margin-top:8px;opacity:.95;">
          Actualizado al: <b>${esc(actualizado || "-")}</b>
        </div>
      </div>
      ${mv359SelectorPeriodo()}
    `;
  }

  function mv359Sedes(lista){
    const oficiales = ["CHICLAYO","PIURA","TRUJILLO"];
    const presentes = Array.from(
      new Set((lista || []).map(x=>norm(x.sede)).filter(Boolean))
    );
    return oficiales
      .filter(s=>presentes.includes(s))
      .concat(presentes.filter(s=>!oficiales.includes(s)).sort());
  }

  function mv359FiltroSede(lista,seleccionada){
    return `
      <div style="
        margin:12px 0;
        padding:14px;
        border-radius:16px;
        background:#142844;
        border:1px solid rgba(255,255,255,.10);
        color:#fff;
      ">
        <label style="display:block;font-size:12px;font-weight:900;margin-bottom:7px;">
          🏢 Filtrar por sede
        </label>
        <select
          onchange="mv359CambiarSedeRanking(this.value)"
          style="
            width:100%;
            padding:11px;
            border-radius:10px;
            border:1px solid #6ea8e5;
            background:#fff;
            color:#0f172a;
            font-weight:800;
          "
        >
          <option value="TODAS" ${seleccionada==="TODAS" ? "selected" : ""}>TODAS LAS SEDES</option>
          ${mv359Sedes(lista).map(s=>`
            <option value="${esc(s)}" ${seleccionada===s ? "selected" : ""}>${esc(s)}</option>
          `).join("")}
        </select>
      </div>`;
  }

  function mv359CambiarSedeRanking(valor){
    MV359_ESTADO.sede = norm(valor || "TODAS") || "TODAS";
    renderEjecutivo();
  }

  function mv359VistaTecnico(item){
    return `
      <div style="padding:18px;max-width:760px;margin:auto;">
        <h2 style="text-align:center;margin-bottom:6px;">🏆 MI RANKING</h2>
        ${mv359EncabezadoPeriodo(item)}

        <div style="
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
          margin:14px 0;
        ">
          ${tarjetaPuestoRanking("REGIÓN",item.puestoRegion,medallaRanking(item.puestoRegion),"🌎")}
          ${tarjetaPuestoRanking("SEDE",item.puestoSede,medallaRanking(item.puestoSede),"🏢")}
          ${tarjetaPuestoRanking("PLATAFORMA",item.puestoPlataforma,medallaRanking(item.puestoPlataforma),"🛠️")}
        </div>

        ${tarjetaDetallada(item,"region")}

        <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
      </div>`;
  }

  function fechaActualizacion(lista){
    return lista?.[0]?.actualizacion || "";
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
      linea2:grupos || `Meta mensual: 130 pts`
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
      linea2:`Meta máxima: 42%`
    };
  }

  function detalleVtrGar(r){
    const d = r.detVtrGar || {};
    return {
      linea1:`${num(d.total)} incidencias / ${num(d.finalizadas)} finalizadas`,
      linea2:`GAR ${num(d.gar)} · VTR ${num(d.vtr)}`
    };
  }

  function detalleSla(r){
    const d = r.detSla || {};
    return {
      linea1:`Ajustado ${n(r.slaAjustado).toFixed(1)}% · Bruto ${n(r.slaBruto).toFixed(1)}%`,
      linea2:`${n(d.cumplenAjustado)} dentro / ${n(d.evaluables)} evaluables · Excepciones ${n(d.excepcionesAprobadas)}`
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

  function indicador(titulo,valor,semaforo,detalle){
    return `
      <div style="
        background:#0f172a;
        border:1px solid rgba(255,255,255,.10);
        border-radius:14px;
        padding:12px;
        color:white;
        min-width:0;
      ">
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

  function tarjetaDetallada(r,tipoPuesto){
    let puesto = r.puestoRegion;
    if(tipoPuesto==="sede") puesto = r.puestoSede;
    if(tipoPuesto==="plataforma") puesto = r.puestoPlataforma;

    const medalla = typeof medallaRanking==="function"
      ? medallaRanking(puesto)
      : "";

    const prod = detalleProduccion(r);
    const ef = detalleEfectividad(r);
    const rec = detalleRecableado(r);
    const vg = detalleVtrGar(r);
    const sla = detalleSla(r);
    const obs = detalleObservaciones(r);
    const monto = detalleMonto(r);

    return `
      <div style="
        background:#1f2d48;
        border-radius:18px;
        padding:15px;
        margin:12px 0;
        color:white;
        box-shadow:0 6px 16px rgba(0,0,0,.18);
      ">
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="
            background:#16a34a;
            color:white;
            border-radius:14px;
            min-width:64px;
            height:64px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:23px;
            font-weight:900;
          ">${medalla || `#${puesto || 0}`}</div>

          <div style="flex:1;min-width:0;">
            <div style="font-size:16px;font-weight:900;line-height:1.25;overflow-wrap:anywhere;">
              ${esc(r.cuadrilla)}
            </div>
            <div style="font-size:12px;opacity:.78;margin-top:4px;">
              ${esc(r.sede || "-")} · ${esc(r.plataforma || "-")}
            </div>
            <div style="font-size:11px;color:#9fc1e4;margin-top:5px;">
              Ranking ZN #${num(r.puestoRegion)} · Sede #${num(r.puestoSede)} · Plataforma #${num(r.puestoPlataforma)}
            </div>
          </div>
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
          margin-top:14px;
        ">
          ${indicador("Producción",num(r.produccion).toFixed(1),"",prod)}
          ${indicador("Efectividad",pct(r.efectividad),colorSemaforoRanking("efectividad",r.efectividad),ef)}
          ${indicador("% Recableado",pct(r.recableado),colorSemaforoRanking("recableado",r.recableado),rec)}
          ${indicador("% VTR/GAR",pct(r.vtrgar),colorSemaforoRanking("vtrgar",r.vtrgar),vg)}
          ${indicador("Tiempo de Gestión - SLA",`${num(r.slaAjustado).toFixed(1)}%`,(window.mv363SemaforoSla?mv363SemaforoSla(r.slaAjustado).icono:""),sla)}
          ${indicador("Observaciones",num(r.observaciones).toFixed(0),"",obs)}
          ${indicador("Monto afectado",money(r.montoAfectadoObs),"",monto)}
        </div>
      </div>`;
  }

  function listaTarjetas(lista,tipoPuesto){
    if(!lista?.length) return `<div class="card">No hay datos para mostrar.</div>`;
    return ordenarRankingPorPuesto(lista,tipoPuesto)
      .map(r=>tarjetaDetallada(r,tipoPuesto))
      .join("");
  }

  function botonExcel(){
    return `
      <button
        type="button"
        onclick="mv358AbrirInformeRanking()"
        style="
          width:100%;
          margin:12px 0 4px;
          padding:12px 16px;
          border:0;
          border-radius:13px;
          background:linear-gradient(135deg,#15803d,#059669);
          color:#fff;
          font-size:14px;
          font-weight:900;
          cursor:pointer;
          box-shadow:0 8px 18px rgba(0,0,0,.22);
        "
      >📊 Descargar informe Excel</button>`;
  }

  function renderEjecutivo(){
    const listaCompleta = MV359_ESTADO.lista || [];
    const sedeFiltro = MV359_ESTADO.sede || "TODAS";
    const listaFiltrada = sedeFiltro==="TODAS"
      ? listaCompleta
      : listaCompleta.filter(x=>norm(x.sede)===sedeFiltro);

    const tipoPuesto = sedeFiltro==="TODAS" ? "region" : "sede";
    const ordenada = ordenarRankingPorPuesto(listaFiltrada,tipoPuesto);
    const referencia = ordenada[0] || listaCompleta[0];
    const titulo = sedeFiltro==="TODAS"
      ? "🌎 RANKING ZONA NORTE"
      : `🏢 RANKING SEDE ${esc(sedeFiltro)}`;
    const rotulo = typeof mv240RotuloRankingEjecutivo==="function"
      ? mv240RotuloRankingEjecutivo()
      : "JEFATURA";

    mostrarPantalla(`
      <div style="padding:18px;max-width:980px;margin:auto;">
        <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>
        <div style="text-align:center;font-size:12px;font-weight:800;opacity:.72;margin-bottom:8px;">
          VISTA ${esc(rotulo)}
        </div>
        ${mv359EncabezadoPeriodo(referencia)}
        ${mv359FiltroSede(listaCompleta,sedeFiltro)}
        ${botonExcel()}
        ${listaTarjetas(ordenada,tipoPuesto)}
        <br>
        <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
      </div>
    `);
  }

  function datosDashboardReutilizables(periodoSolicitado){
    if(typeof window.mv356ObtenerDatosDashboardGerencial!=="function") return null;

    const datos = window.mv356ObtenerDatosDashboardGerencial() || {};
    if(datos.periodo!==periodoSolicitado) return null;
    if(!Array.isArray(datos.lista) || !datos.lista.length) return null;
    if(!datos.lista.some(x=>x.detProduccion || x.detEfectividad)) return null;

    return {
      lista:datos.lista.slice(),
      periodo:datos.periodo || periodoSolicitado || "",
      periodos:Array.isArray(datos.periodos) ? datos.periodos.slice() : []
    };
  }

  async function obtenerLista(periodoSolicitado){
    const reutilizada = datosDashboardReutilizables(periodoSolicitado);
    if(reutilizada) return reutilizada;

    const clave = periodoSolicitado || "AUTO";
    const cache = CACHE.get(clave);
    if(cache && Date.now()-cache.fecha<120000) return cache.datos;

    if(typeof mv4ObtenerRanking!=="function"){
      throw new Error("No se pudo cargar el detalle analítico del Ranking.");
    }

    const lista = await mv4ObtenerRanking(periodoSolicitado);
    const puente = typeof window.mv356ObtenerDatosDashboardGerencial==="function"
      ? (window.mv356ObtenerDatosDashboardGerencial() || {})
      : {};

    const periodoDetectado =
      puente.periodo ||
      periodoSolicitado ||
      mv359PeriodoDesdeFecha(lista?.[0]?.actualizacion) ||
      "";

    const periodosDetectados = Array.isArray(puente.periodos) && puente.periodos.length
      ? puente.periodos.slice()
      : [periodoDetectado].filter(Boolean);

    const datos = {
      lista:Array.isArray(lista) ? lista : [],
      periodo:periodoDetectado,
      periodos:periodosDetectados
    };

    CACHE.set(clave,{fecha:Date.now(),datos});
    return datos;
  }

  async function mostrarRankingDetallado(periodoSeleccionado){
    const perfil = norm(localStorage.getItem("perfil"));
    const cuadrillaUsuario = normalizarCuadrillaRanking(localStorage.getItem("cuadrilla"));
    const sedeUsuario = norm(localStorage.getItem("sede"));

    mostrarPantalla(`
      <div style="padding:20px;max-width:900px;margin:auto;">
        <h2>🏆 RANKING</h2>
        Cargando ranking y detalle de indicadores...
      </div>
    `);

    try{
      const datos = await obtenerLista(periodoSeleccionado);
      const lista = datos.lista;

      MV359_ESTADO.periodo =
        datos.periodo ||
        periodoSeleccionado ||
        mv359PeriodoDesdeFecha(lista?.[0]?.actualizacion) ||
        "";

      MV359_ESTADO.periodos = mv360NormalizarPeriodos(
        datos.periodos,
        MV359_ESTADO.periodo,
        lista
      );

      if(!lista.length){
        mostrarPantalla(`
          <div style="padding:20px;">
            <h2>🏆 RANKING</h2>
            No hay datos de ranking.
            <br><br>
            <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
          </div>
        `);
        return;
      }

      if(perfil==="TECNICO"){
        const item = lista.find(
          x=>normalizarCuadrillaRanking(x.cuadrilla)===cuadrillaUsuario
        );

        if(!item){
          mostrarPantalla(`
            <div style="padding:20px;">
              <h2>🏆 MI RANKING</h2>
              No se encontró ranking para tu cuadrilla.
              <br><br>
              <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
            </div>
          `);
          return;
        }

        mostrarPantalla(mv359VistaTecnico(item));
        return;
      }

      if(typeof mv239EsVistaJefaturaRanking==="function" && mv239EsVistaJefaturaRanking(perfil)){
        MV359_ESTADO.lista = lista.slice();
        MV359_ESTADO.sede = "TODAS";
        renderEjecutivo();
        return;
      }

      let listaFiltrada = lista;
      let titulo = "🌎 RANKING ZONA NORTE";
      let tipoPuesto = "region";

      if(perfil==="SUPERVISOR"){
        listaFiltrada = lista.filter(x=>norm(x.sede)===sedeUsuario);
        titulo = `👨‍💼 RANKING SEDE ${esc(sedeUsuario)}`;
        tipoPuesto = "sede";
      }

      const referencia = listaFiltrada[0] || lista[0];

      mostrarPantalla(`
        <div style="padding:18px;max-width:980px;margin:auto;">
          <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>
          ${mv359EncabezadoPeriodo(referencia)}
          ${listaTarjetasRanking(listaFiltrada,tipoPuesto)}
          <br>
          <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>
      `);
    }catch(error){
      console.error("V358 Ranking",error);
      mostrarPantalla(`
        <div style="padding:20px;">
          <h2>🏆 RANKING</h2>
          ❌ ${esc(error.message || "Error al cargar el ranking.")}
          <br><br>
          <button class="button_1" onclick="mostrarRanking('${esc(periodoSeleccionado || "")}')">🔄 Reintentar</button>
          <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>
      `);
    }
  }

  function cargarScript(url){
    return new Promise((resolve,reject)=>{
      const existente = Array.from(document.scripts).find(s=>s.src===url);
      if(existente){
        if(window.XLSX?.utils) return resolve();
        existente.addEventListener("load",resolve,{once:true});
        existente.addEventListener("error",reject,{once:true});
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = ()=>reject(new Error(`No se pudo cargar ${url}`));
      document.head.appendChild(script);
    });
  }

  async function asegurarXlsx(){
    if(window.XLSX?.utils) return true;
    if(promesaXlsx) return promesaXlsx;

    promesaXlsx = (async()=>{
      let ultimo = null;
      for(const url of XLSX_URLS){
        try{
          await cargarScript(url);
          if(window.XLSX?.utils) return true;
        }catch(error){
          ultimo = error;
        }
      }
      throw ultimo || new Error("No se pudo cargar el generador Excel.");
    })();

    try{
      return await promesaXlsx;
    }catch(error){
      promesaXlsx = null;
      throw error;
    }
  }

  function mostrarCarga(texto){
    let overlay = document.getElementById("mv358Overlay");
    if(!overlay){
      overlay = document.createElement("div");
      overlay.id = "mv358Overlay";
      overlay.innerHTML = `
        <div style="width:min(380px,88vw);padding:22px;border-radius:18px;background:#10213b;color:#fff;text-align:center;box-shadow:0 18px 45px rgba(0,0,0,.45);">
          <div style="width:38px;height:38px;margin:0 auto 12px;border:4px solid rgba(255,255,255,.22);border-top-color:#fff;border-radius:50%;animation:mv358Spin 1s linear infinite;"></div>
          <b id="mv358OverlayTexto">Preparando informe...</b>
        </div>`;
      Object.assign(overlay.style,{
        position:"fixed",
        inset:"0",
        zIndex:"10150",
        display:"none",
        alignItems:"center",
        justifyContent:"center",
        background:"rgba(2,8,23,.76)"
      });
      const style = document.createElement("style");
      style.textContent = "@keyframes mv358Spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }
    const etiqueta = document.getElementById("mv358OverlayTexto");
    if(etiqueta) etiqueta.textContent = texto || "Preparando informe...";
    overlay.style.display = "flex";
  }

  function ocultarCarga(){
    const overlay = document.getElementById("mv358Overlay");
    if(overlay) overlay.style.display = "none";
  }

  function mensaje(texto,error=false){
    const cont = document.getElementById("mv358Mensaje");
    if(!cont) return;
    cont.textContent = texto || "";
    cont.style.color = error ? "#fecaca" : "#bbf7d0";
  }

  function cerrarModal(){
    document.getElementById("mv358Modal")?.remove();
  }

  function abrirModal(){
    if(!esVistaEjecutiva()){
      alert("El informe Excel del Ranking está disponible para Jefatura y Gerencia.");
      return;
    }

    const total = (MV359_ESTADO.lista || []).length;
    const sede = MV359_ESTADO.sede || "TODAS";
    const filtradas = sede==="TODAS"
      ? total
      : (MV359_ESTADO.lista || []).filter(x=>norm(x.sede)===sede).length;

    cerrarModal();

    const modal = document.createElement("div");
    modal.id = "mv358Modal";
    modal.innerHTML = `
      <div class="mv358-caja">
        <div class="mv358-cabecera">
          <div>
            <h2>Informe Excel del Ranking</h2>
            <p>${esc(periodoNombre(MV359_ESTADO.periodo))}</p>
          </div>
          <button type="button" onclick="mv358CerrarInformeRanking()">×</button>
        </div>

        <div class="mv358-contenido">
          <div class="mv358-resumen">
            <b>Informe completo e ilustrativo</b>
            <span>
              Incluye resumen ejecutivo, posiciones, indicadores, detalle operativo,
              producción por tipo, sedes y metodología.
            </span>
          </div>

          <label class="mv358-opcion">
            <input type="radio" name="mv358Alcance" value="zona" checked>
            <span>
              <b>Zona Norte completa</b>
              <small>${total} cuadrillas</small>
            </span>
          </label>

          <label class="mv358-opcion">
            <input type="radio" name="mv358Alcance" value="filtro">
            <span>
              <b>Solo el filtro visible: ${esc(sede==="TODAS" ? "TODAS LAS SEDES" : sede)}</b>
              <small>${filtradas} cuadrillas</small>
            </span>
          </label>

          <div class="mv358-nota">
            El archivo se construye con los datos que ya están cargados en Ranking.
            No se vuelve a consultar cada cuadrilla y SheetJS se descarga solamente
            al pulsar Generar Excel.
          </div>

          <div id="mv358Mensaje"></div>

          <button type="button" class="mv358-generar" onclick="mv358GenerarInformeRanking()">
            📊 Generar Excel
          </button>
        </div>
      </div>`;

    Object.assign(modal.style,{
      position:"fixed",
      inset:"0",
      zIndex:"10120",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:"18px",
      background:"rgba(2,8,23,.78)"
    });

    const style = document.createElement("style");
    style.textContent = `
      #mv358Modal .mv358-caja{width:min(720px,96vw);max-height:90vh;overflow:auto;border:1px solid #315577;border-radius:20px;background:#0d2037;color:#fff;box-shadow:0 24px 60px rgba(0,0,0,.5)}
      #mv358Modal .mv358-cabecera{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid #274566}
      #mv358Modal h2{margin:0;font-size:23px}
      #mv358Modal p{margin:5px 0 0;color:#9fc1e4;font-size:12px}
      #mv358Modal .mv358-cabecera button{width:40px;height:40px;border:0;border-radius:10px;background:#253b58;color:#fff;font-size:24px;cursor:pointer}
      #mv358Modal .mv358-contenido{padding:18px 20px}
      #mv358Modal .mv358-resumen{display:flex;flex-direction:column;gap:5px;padding:14px;border:1px solid #315577;border-radius:14px;background:#12304f}
      #mv358Modal .mv358-resumen span{color:#c7dbef;font-size:12px;line-height:1.45}
      #mv358Modal .mv358-opcion{display:flex;gap:11px;align-items:flex-start;margin-top:13px;padding:13px;border:1px solid #274566;border-radius:14px;background:#102844;cursor:pointer}
      #mv358Modal .mv358-opcion input{width:20px;height:20px;margin-top:1px}
      #mv358Modal .mv358-opcion span{display:flex;flex-direction:column;gap:4px}
      #mv358Modal .mv358-opcion small{color:#9fc1e4}
      #mv358Modal .mv358-nota{margin-top:13px;padding:12px;border-radius:12px;background:#172a43;color:#b9d2ea;font-size:12px;line-height:1.45}
      #mv358Modal #mv358Mensaje{min-height:20px;margin-top:10px;font-size:12px;font-weight:900}
      #mv358Modal .mv358-generar{width:100%;margin-top:8px;padding:13px;border:0;border-radius:12px;background:#15803d;color:#fff;font-weight:900;cursor:pointer}
    `;
    modal.appendChild(style);
    document.body.appendChild(modal);
  }

  function estadoGeneral(r){
    const alertas = [];
    if(num(r.produccion)<130) alertas.push("PRODUCCIÓN");
    if(pctNumero(r.efectividad)<70) alertas.push("EFECTIVIDAD");
    if(pctNumero(r.recableado)>42) alertas.push("RECABLEADO");
    if(pctNumero(r.vtrgar)>3) alertas.push("VTR/GAR");
    if(num(r.montoAfectadoObs)>200) alertas.push("OBSERVACIONES");
    return alertas.length ? `ALERTA: ${alertas.join(", ")}` : "CONFORME";
  }

  function resumen(lista){
    const total = lista.length;
    const suma = campo=>lista.reduce((s,x)=>s+num(x[campo]),0);
    const promedio = campo=>total ? lista.reduce((s,x)=>s+pctNumero(x[campo]),0)/total : 0;
    const slaEvaluables=lista.reduce((s,x)=>s+num(x.detSla?.evaluables),0);
    const slaCumplenBruto=lista.reduce((s,x)=>s+num(x.detSla?.cumplenBruto),0);
    const slaCumplenAjustado=lista.reduce((s,x)=>s+num(x.detSla?.cumplenAjustado),0);
    return {
      total,
      produccion:suma("produccion"),
      ordenes:lista.reduce((s,x)=>s+num(x.detProduccion?.totalOrdenes),0),
      efectividad:promedio("efectividad"),
      recableado:promedio("recableado"),
      vtrgar:promedio("vtrgar"),
      slaEvaluables,
      slaCumplenBruto,
      slaCumplenAjustado,
      slaAjustado:slaEvaluables ? slaCumplenAjustado/slaEvaluables*100 : 0,
      slaBruto:slaEvaluables ? slaCumplenBruto/slaEvaluables*100 : 0,
      observaciones:suma("observaciones"),
      montoTotal:suma("montoTotalObs"),
      montoAfectado:suma("montoAfectadoObs")
    };
  }

  function crearHoja(nombre,filas,anchos,encabezado=0){
    const XLSX = window.XLSX;
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = anchos.map(w=>({wch:w}));
    if(filas.length>encabezado+1 && filas[encabezado]){
      ws["!autofilter"] = {
        ref:XLSX.utils.encode_range({
          s:{r:encabezado,c:0},
          e:{r:filas.length-1,c:filas[encabezado].length-1}
        })
      };
    }
    return {nombre,ws,filas,encabezado};
  }

  function aplicarFormatos(hoja,columnas){
    const XLSX = window.XLSX;
    for(let r=hoja.encabezado+1;r<hoja.filas.length;r++){
      Object.entries(columnas).forEach(([col,formato])=>{
        const celda = hoja.ws[XLSX.utils.encode_cell({r,c:Number(col)})];
        if(celda) celda.z = formato;
      });
    }
  }

  function filaCompleta(r){
    const p = r.detProduccion || {};
    const e = r.detEfectividad || {};
    const rec = r.detRecableado || {};
    const vg = r.detVtrGar || {};
    const o = r.detObservaciones || {};
    const diario = r.mv353CumplimientoDia || {};
    const metaDia = num(diario.metaAcumulada);
    const cumplimientoDia = metaDia>0 ? num(r.produccion)/metaDia*100 : null;

    return [
      r.puestoRegion || "",
      r.puestoSede || "",
      r.puestoPlataforma || "",
      norm(r.sede),
      r.cuadrilla || "",
      norm(r.plataforma),
      red(r.puntaje,1),
      red(r.produccion,1),
      red(p.totalOrdenes,0),
      130,
      red(num(r.produccion)/130*100,2),
      red(diario.diasCampo,0),
      red(metaDia,1),
      cumplimientoDia===null ? "" : red(cumplimientoDia,2),
      red(num(r.produccion)-metaDia,1),
      red(e.total,0),
      red(e.finalizadas,0),
      red(e.canceladas,0),
      red(e.reprogramadas,0),
      red(e.regestion,0),
      red(pctNumero(r.efectividad),2),
      red(rec.los,0),
      red(rec.recableados,0),
      red(pctNumero(r.recableado),2),
      red(vg.finalizadas,0),
      red(vg.gar,0),
      red(vg.vtr,0),
      red(vg.total,0),
      red(pctNumero(r.vtrgar),2),
      red(r.slaBruto,2),red(r.slaAjustado,2),red(r.detSla?.evaluables,0),red(r.detSla?.fueraAjustado,0),red(r.detSla?.excepcionesAprobadas,0),red(r.aporteSla,2),
      red(o.total ?? r.observaciones,0),
      red(o.pendientes,0),
      red(o.estados?.DERIVADO,0),
      red(o.estados?.["EN PROCESO"],0),
      red(o.estados?.PENALIZADO,0),
      red(o.estados?.APELADO,0),
      red(o.estados?.SUBSANADO,0),
      red(o.montoTotal ?? r.montoTotalObs,2),
      red(o.montoPendiente ?? r.montoAfectadoObs,2),
      estadoGeneral(r)
    ];
  }

  function construirLibro(lista,alcance){
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const periodo = MV359_ESTADO.periodo;
    const res = resumen(lista);
    const orden = ordenarRankingPorPuesto(lista,"region");

    wb.Props = {
      Title:`Informe Ranking MI VISUAL - ${periodoNombre(periodo)}`,
      Subject:"Ranking e indicadores operativos por cuadrilla",
      Author:localStorage.getItem("usuario") || "MI VISUAL",
      Company:"Visual Connections SAC",
      CreatedDate:new Date()
    };

    const top = orden.slice(0,3);
    const resumenRows = [
      ["MI VISUAL - INFORME DE RANKING"],
      ["Periodo",periodoNombre(periodo)],
      ["Actualizado al",fechaActualizacion(lista)],
      ["Alcance",alcance],
      ["Generado por",localStorage.getItem("usuario") || ""],
      [],
      ["RESUMEN EJECUTIVO","RESULTADO"],
      ["Cuadrillas",res.total],
      ["Producción total",red(res.produccion,1)],
      ["Órdenes ejecutadas",res.ordenes],
      ["Meta mensual total",res.total*130],
      ["Avance mensual",res.total ? red(res.produccion/(res.total*130)*100,2) : 0],
      ["Efectividad promedio",red(res.efectividad,2)],
      ["Recableado promedio",red(res.recableado,2)],
      ["VTR/GAR promedio",red(res.vtrgar,2)],
      ["SLA ajustado",red(res.slaAjustado,2)],
      ["SLA bruto",red(res.slaBruto,2)],
      ["SLA códigos evaluables",res.slaEvaluables],
      ["SLA cumplen ajustado",res.slaCumplenAjustado],
      ["Observaciones",res.observaciones],
      ["Monto total observaciones",red(res.montoTotal,2)],
      ["Monto afectado",red(res.montoAfectado,2)],
      [],
      ["TOP 3 ZONA NORTE","CUADRILLA","SEDE","PLATAFORMA","PUNTAJE","PRODUCCIÓN","EFECTIVIDAD"],
      ...top.map((r,i)=>[
        i+1,r.cuadrilla,r.sede,r.plataforma,
        red(r.puntaje,1),red(r.produccion,1),red(pctNumero(r.efectividad),2)
      ])
    ];

    const resumenSheet = crearHoja("RESUMEN_EJECUTIVO",resumenRows,[28,42,17,20,14,14,16],6);
    aplicarFormatos(resumenSheet,{1:'0.00',5:'0.0',6:'0.00"%"'});
    XLSX.utils.book_append_sheet(wb,resumenSheet.ws,resumenSheet.nombre);

    const sedes = Array.from(new Set(lista.map(x=>norm(x.sede)).filter(Boolean)));
    const sedeRows = [[
      "SEDE","CUADRILLAS","PRODUCCIÓN","ÓRDENES","META MENSUAL",
      "AVANCE %","EFECTIVIDAD %","RECABLEADO %","VTR/GAR %",
      "OBSERVACIONES","MONTO TOTAL","MONTO AFECTADO","MEJOR CUADRILLA"
    ]];

    sedes.sort().forEach(sede=>{
      const grupo = lista.filter(x=>norm(x.sede)===sede);
      const r = resumen(grupo);
      const mejor = ordenarRankingPorPuesto(grupo,"sede")[0];
      sedeRows.push([
        sede,r.total,red(r.produccion,1),r.ordenes,r.total*130,
        r.total ? red(r.produccion/(r.total*130)*100,2) : 0,
        red(r.efectividad,2),red(r.recableado,2),red(r.vtrgar,2),
        r.observaciones,red(r.montoTotal,2),red(r.montoAfectado,2),
        mejor?.cuadrilla || ""
      ]);
    });

    const sedeSheet = crearHoja(
      "RESUMEN_POR_SEDE",
      sedeRows,
      [16,12,14,12,14,13,15,15,13,15,16,17,42],
      0
    );
    aplicarFormatos(sedeSheet,{
      2:'0.0',4:'0.0',5:'0.00"%"',6:'0.00"%"',7:'0.00"%"',
      8:'0.00"%"',10:'"S/ "0.00',11:'"S/ "0.00'
    });
    XLSX.utils.book_append_sheet(wb,sedeSheet.ws,sedeSheet.nombre);

    const headers = [[
      "PUESTO ZONA NORTE","PUESTO SEDE","PUESTO PLATAFORMA",
      "SEDE","CUADRILLA","PLATAFORMA","PUNTAJE RANKING",
      "PRODUCCIÓN PTS","ÓRDENES EJECUTADAS","META MENSUAL","AVANCE MENSUAL %",
      "DÍAS EN CAMPO","META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA PTS",
      "EFECTIVIDAD TOTAL","FINALIZADAS","CANCELADAS","REPROGRAMADAS","REGESTIÓN","EFECTIVIDAD %",
      "ÓRDENES VT (LOS)","RECABLEADOS","RECABLEADO %",
      "FINALIZADAS VTR/GAR","GAR","VTR","INCIDENCIAS","VTR/GAR %",
      "SLA BRUTO %","SLA AJUSTADO %","SLA EVALUABLES","SLA FUERA","EXCEPCIONES APROBADAS","APORTE SLA",
      "OBSERVACIONES","PENDIENTES","DERIVADAS","EN PROCESO","PENALIZADAS","APELADAS","SUBSANADAS",
      "MONTO TOTAL OBS","MONTO AFECTADO","ESTADO GENERAL"
    ]];

    const generalRows = headers.concat(
      orden.map(filaCompleta)
    );
    const generalSheet = crearHoja(
      "RANKING_GENERAL",
      generalRows,
      [
        18,13,18,15,43,18,15,14,18,14,16,14,14,20,13,
        17,13,13,15,11,15,16,13,14,18,9,9,13,13,
        15,13,12,13,13,11,13,17,17,35
      ],
      0
    );
    aplicarFormatos(generalSheet,{
      6:'0.0',7:'0.0',9:'0.0',10:'0.00"%"',12:'0.0',
      13:'0.00"%"',14:'0.0',20:'0.00"%"',23:'0.00"%"',
      28:'0.00"%"',36:'"S/ "0.00',37:'"S/ "0.00'
    });
    XLSX.utils.book_append_sheet(wb,generalSheet.ws,generalSheet.nombre);

    sedes.sort().forEach(sede=>{
      const grupo = ordenarRankingPorPuesto(
        lista.filter(x=>norm(x.sede)===sede),
        "sede"
      );
      const filas = headers.concat(grupo.map(filaCompleta));
      const hoja = crearHoja(
        `SEDE_${sede}`.slice(0,31),
        filas,
        generalSheet.ws["!cols"].map(x=>x.wch),
        0
      );
      aplicarFormatos(hoja,{
        6:'0.0',7:'0.0',9:'0.0',10:'0.00"%"',12:'0.0',
        13:'0.00"%"',14:'0.0',20:'0.00"%"',23:'0.00"%"',
        28:'0.00"%"',36:'"S/ "0.00',37:'"S/ "0.00'
      });
      XLSX.utils.book_append_sheet(wb,hoja.ws,hoja.nombre);
    });

    const tiposRows = [[
      "SEDE","CUADRILLA","PLATAFORMA","GRUPO","TIPO DE TRABAJO",
      "CANTIDAD","PUNTAJE UNITARIO","PUNTOS"
    ]];

    orden.forEach(r=>{
      const tipos = r.detProduccion?.tipos || {};
      Object.entries(tipos).forEach(([tipo,d])=>{
        let grupo = "";
        for(const [nombre,g] of Object.entries(r.detProduccion?.grupos || {})){
          if(num(g?.cantidad)>0 && !grupo) grupo = nombre;
        }
        tiposRows.push([
          norm(r.sede),r.cuadrilla,norm(r.plataforma),grupo,tipo,
          red(d?.cantidad,0),red(d?.puntaje,1),red(d?.puntos,1)
        ]);
      });
    });

    const tiposSheet = crearHoja(
      "PRODUCCION_POR_TIPO",
      tiposRows,
      [15,43,18,24,60,12,18,12],
      0
    );
    aplicarFormatos(tiposSheet,{5:'0',6:'0.0',7:'0.0'});
    XLSX.utils.book_append_sheet(wb,tiposSheet.ws,tiposSheet.nombre);

    const metodologia = [
      ["METODOLOGÍA DEL RANKING"],
      ["INDICADOR","DETALLE"],
      ["Producción","Puntos acumulados y cantidad total de órdenes ejecutadas. Meta mensual: 130 puntos por cuadrilla."],
      ["Cumplimiento al día","Producción acumulada / (días EN CAMPO × 5 puntos)."],
      ["Efectividad","Finalizadas / Total de órdenes. Incluye canceladas, reprogramadas y regestión."],
      ["Recableado","Recableados / Órdenes VT (LOS). Meta máxima: 42%."],
      ["VTR/GAR","Incidencias GAR + VTR / Finalizadas. Meta máxima: 3%."],
      ["Observaciones","Cantidad, estados, monto total y monto afectado."],
      ["Orden del ranking","Zona Norte por puesto regional; hojas de sede por puesto de sede."],
      ["Fuente","Información ya cargada por Ranking y el detalle analítico del Dashboard."],
      ["Optimización","Los cinco archivos operativos se leen en paralelo, se procesan en memoria y se reutilizan durante dos minutos."]
    ];

    const metodoSheet = crearHoja("METODOLOGIA",metodologia,[35,105],1);
    XLSX.utils.book_append_sheet(wb,metodoSheet.ws,metodoSheet.nombre);

    return wb;
  }

  async function generarExcel(){
    const alcanceSeleccionado = document.querySelector(
      'input[name="mv358Alcance"]:checked'
    )?.value || "zona";

    const sede = MV359_ESTADO.sede || "TODAS";
    let lista = (MV359_ESTADO.lista || []).slice();
    let alcance = "Zona Norte completa";

    if(alcanceSeleccionado==="filtro" && sede!=="TODAS"){
      lista = lista.filter(x=>norm(x.sede)===sede);
      alcance = `Sede ${sede}`;
    }

    if(!lista.length){
      mensaje("No existen cuadrillas para el alcance seleccionado.",true);
      return;
    }

    mostrarCarga("Cargando generador Excel...");
    mensaje("");

    try{
      await asegurarXlsx();
      mostrarCarga("Construyendo resumen, sedes y detalle operativo...");
      const wb = construirLibro(lista,alcance);
      const sufijo = alcanceSeleccionado==="filtro" && sede!=="TODAS"
        ? `_${sede.replace(/\s+/g,"_")}`
        : "";
      window.XLSX.writeFile(
        wb,
        `Informe_Ranking_MI_VISUAL_${MV359_ESTADO.periodo}${sufijo}.xlsx`,
        {bookType:"xlsx",compression:true}
      );
      mensaje(`Informe generado correctamente con ${lista.length} cuadrillas.`);
    }catch(error){
      console.error("V358 Excel Ranking",error);
      mensaje(error.message || "No se pudo generar el informe.",true);
    }finally{
      ocultarCarga();
    }
  }

  window.mostrarRanking = mostrarRankingDetallado;
  window.mv239RenderRankingJefatura = renderEjecutivo;
  window.mv359CambiarSedeRanking = mv359CambiarSedeRanking;
  window.mv239CambiarSedeRanking = mv359CambiarSedeRanking;
  window.mv358AbrirInformeRanking = abrirModal;
  window.mv358CerrarInformeRanking = cerrarModal;
  window.mv358GenerarInformeRanking = generarExcel;

  window.MV363_RANKING_SLA_OK = true;
  console.log("MI VISUAL V363: SLA incorporado al Ranking.");
})();