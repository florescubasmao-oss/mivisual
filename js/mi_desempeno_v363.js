/* ============================================================
   MI VISUAL V364 - MI DESEMPEÑO para Técnico
   Orden visual:
   1. Período actual/histórico.
   2. Ranking Región, Sede y Plataforma.
   3. Mi meta al día.
   4. Indicadores personales.
   Cada indicador conserva y abre su módulo actual.
============================================================ */
(function(){
  "use strict";

  function numero(valor){
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function escapar(valor){
    return String(valor ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function normalizarCuadrilla(valor){
    return String(valor || "")
      .replace(/^P\s+(\d+)/i,"P$1")
      .replace(/\s+/g," ")
      .trim()
      .toUpperCase();
  }

  function periodoActualLima(){
    const partes = new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Lima",
      year:"numeric",
      month:"2-digit"
    }).formatToParts(new Date());

    return [
      partes.find(x=>x.type==="year")?.value,
      partes.find(x=>x.type==="month")?.value
    ].join("-");
  }

  function nombrePeriodo(clave){
    const m = String(clave || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return String(clave || "PERÍODO");

    const meses = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];

    return `${meses[Number(m[2])-1]} ${m[1]}`;
  }

  function normalizarPeriodos(data){
    const mapa = new Map();

    (Array.isArray(data?.periodos) ? data.periodos : []).forEach(item=>{
      if(typeof item === "string"){
        mapa.set(item,{
          clave:item,
          etiqueta:nombrePeriodo(item),
          corte:""
        });
        return;
      }

      const clave = item?.clave || item?.periodo || "";
      if(!/^\d{4}-\d{2}$/.test(clave)) return;

      mapa.set(clave,{
        clave,
        etiqueta:item?.etiqueta || nombrePeriodo(clave),
        corte:item?.corte || ""
      });
    });

    if(data?.periodo && !mapa.has(data.periodo)){
      mapa.set(data.periodo,{
        clave:data.periodo,
        etiqueta:nombrePeriodo(data.periodo),
        corte:""
      });
    }

    return Array.from(mapa.values())
      .sort((a,b)=>b.clave.localeCompare(a.clave));
  }

  function etiquetaPeriodo(item){
    const actual = item.clave === periodoActualLima();
    const estado = actual ? "EN CURSO" : "HISTÓRICO";
    const corte = item.corte ? ` · al ${item.corte}` : "";
    return `${item.etiqueta || nombrePeriodo(item.clave)} — ${estado}${corte}`;
  }

  function seleccionarTecnico(data){
    const lista = Array.isArray(data?.lista) ? data.lista : [];
    const cuadrilla = normalizarCuadrilla(localStorage.getItem("cuadrilla"));

    return lista.find(item=>
      normalizarCuadrilla(item?.cuadrilla) === cuadrilla
    ) || lista[0] || {};
  }

  function puestoVisible(valor){
    const puesto = Number(valor) || 0;
    return puesto > 0 ? `#${puesto}` : "S/P";
  }

  function medalla(valor){
    const puesto = Number(valor) || 0;
    if(puesto === 1) return "🥇";
    if(puesto === 2) return "🥈";
    if(puesto === 3) return "🥉";
    return "🏅";
  }

  function estadoMeta(cumplimiento){
    if(cumplimiento >= 100) return {
      texto:"META SUPERADA",
      color:"#22c55e"
    };
    if(cumplimiento >= 85) return {
      texto:"CERCA DE LA META",
      color:"#f59e0b"
    };
    return {
      texto:"REQUIERE RECUPERACIÓN",
      color:"#ef4444"
    };
  }

  function tarjetaRanking(titulo,puesto,periodo){
    return `
      <button
        type="button"
        onclick="mostrarRanking('${escapar(periodo)}')"
        style="
          min-width:0;
          border:1px solid rgba(255,255,255,.10);
          border-radius:16px;
          padding:13px 7px;
          background:linear-gradient(180deg,#182b49,#101f36);
          color:#fff;
          cursor:pointer;
          text-align:center;
          box-shadow:0 8px 18px rgba(0,0,0,.18);
        "
      >
        <div style="font-size:24px;line-height:1;">${medalla(puesto)}</div>
        <div style="font-size:10px;color:#9fb7d8;font-weight:900;margin-top:6px;">
          ${escapar(titulo)}
        </div>
        <div style="font-size:25px;font-weight:950;margin-top:4px;">
          ${puestoVisible(puesto)}
        </div>
      </button>`;
  }

  function tarjetaIndicador(icono,titulo,valor,detalle,onclick,color){
    return `
      <button
        type="button"
        onclick="${onclick}"
        style="
          text-align:left;
          min-width:0;
          border:1px solid rgba(255,255,255,.10);
          border-radius:17px;
          padding:15px;
          background:${color || "#142844"};
          color:#fff;
          cursor:pointer;
          box-shadow:0 8px 18px rgba(0,0,0,.18);
        "
      >
        <div style="font-size:12px;color:#dbeafe;font-weight:900;">
          ${icono} ${escapar(titulo)}
        </div>
        <div style="font-size:25px;font-weight:950;margin-top:8px;overflow-wrap:anywhere;">
          ${valor}
        </div>
        <div style="font-size:11px;color:#a9c2df;margin-top:6px;line-height:1.35;">
          ${escapar(detalle || "")}
        </div>
      </button>`;
  }

  function renderCargando(){
    mostrarPantalla(`
      <div style="padding:20px;max-width:900px;margin:auto;color:#fff;">
        <h2 style="margin-bottom:8px;">📊 MI DESEMPEÑO</h2>
        <div style="padding:18px;border-radius:18px;background:#142844;">
          Cargando tu información del período...
        </div>
      </div>`);
  }

  function renderError(error,periodo){
    mostrarPantalla(`
      <div style="padding:20px;max-width:900px;margin:auto;color:#fff;">
        <h2>📊 MI DESEMPEÑO</h2>
        <div style="padding:16px;border-radius:16px;background:#7f1d1d;">
          No se pudo cargar Mi Desempeño.<br>
          <small>${escapar(error?.message || "Error no identificado.")}</small>
        </div>
        <button class="button_1" onclick="mostrarMiDesempeno('${escapar(periodo || "")}')">
          🔄 Reintentar
        </button>
        <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
      </div>`);
  }

  async function mostrar(periodoSeleccionado){
    const periodoSolicitado = periodoSeleccionado || periodoActualLima();
    renderCargando();

    try{
      const data = await mv361ConsultarResumenDashboardRanking(
        periodoSolicitado,
        false
      );

      const item = seleccionarTecnico(data);
      const periodo = data.periodo || periodoSolicitado;
      const periodos = normalizarPeriodos(data);
      const cumplimientoDia = item.mv353CumplimientoDia || {};
      const meta = numero(cumplimientoDia.metaAcumulada);
      const puntos = numero(item.produccion);
      const cumplimiento = meta > 0 ? puntos/meta*100 : 0;
      const brecha = puntos-meta;
      const estado = estadoMeta(cumplimiento);
      const slaSemaforo = typeof window.mv363SemaforoSla === "function"
        ? window.mv363SemaforoSla(item.slaAjustado)
        : {icono:""};

      const opcionesPeriodo = periodos.map(p=>`
        <option value="${escapar(p.clave)}" ${p.clave===periodo ? "selected" : ""}>
          ${escapar(etiquetaPeriodo(p))}
        </option>
      `).join("");

      const textoBrecha = Math.abs(brecha) < 0.01
        ? "Meta alcanzada"
        : brecha > 0
          ? `+${brecha.toFixed(1)} puntos sobre la meta`
          : `${brecha.toFixed(1)} puntos de brecha`;

      mostrarPantalla(`
        <div style="padding:18px;max-width:900px;margin:auto;color:#fff;">
          <div style="margin-bottom:14px;">
            <h2 style="margin:0;">📊 MI DESEMPEÑO</h2>
            <div style="color:#9fb7d8;font-size:12px;margin-top:5px;">
              ${escapar(item.cuadrilla || localStorage.getItem("cuadrilla") || "TÉCNICO")}
            </div>
          </div>

          <section style="
            padding:15px;
            border-radius:18px;
            background:#102844;
            border:1px solid rgba(255,255,255,.10);
            margin-bottom:12px;
          ">
            <label for="mv364PeriodoDesempeno" style="
              display:block;
              font-size:12px;
              font-weight:900;
              color:#dbeafe;
              margin-bottom:8px;
            ">📅 PERÍODO</label>

            <select
              id="mv364PeriodoDesempeno"
              onchange="mostrarMiDesempeno(this.value)"
              style="
                width:100%;
                min-height:46px;
                padding:0 12px;
                border:1px solid #60a5fa;
                border-radius:12px;
                background:#fff;
                color:#0f172a;
                font-size:14px;
                font-weight:900;
              "
            >${opcionesPeriodo}</select>
          </section>

          <section style="
            padding:15px;
            border-radius:20px;
            background:linear-gradient(135deg,#312e81,#1d4ed8);
            margin-bottom:12px;
            box-shadow:0 10px 24px rgba(29,78,216,.25);
          ">
            <div style="font-size:12px;color:#c7d2fe;font-weight:900;">
              🏆 MI POSICIÓN EN EL RANKING
            </div>

            <div style="
              display:grid;
              grid-template-columns:repeat(3,minmax(0,1fr));
              gap:8px;
              margin-top:12px;
            ">
              ${tarjetaRanking("REGIÓN",item.puestoRegion,periodo)}
              ${tarjetaRanking("SEDE",item.puestoSede,periodo)}
              ${tarjetaRanking("PLATAFORMA",item.puestoPlataforma,periodo)}
            </div>

            <button
              type="button"
              onclick="mostrarRanking('${escapar(periodo)}')"
              style="
                width:100%;
                margin-top:10px;
                border:1px solid rgba(255,255,255,.20);
                border-radius:12px;
                padding:10px;
                background:rgba(7,22,47,.42);
                color:#fff;
                font-weight:900;
                cursor:pointer;
              "
            >Ver Ranking completo</button>
          </section>

          <section style="
            padding:17px;
            border-radius:20px;
            background:linear-gradient(135deg,#0f766e,#1d4ed8);
            margin-bottom:12px;
            box-shadow:0 10px 24px rgba(15,118,110,.25);
          ">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <div>
                <div style="font-size:12px;color:#bfdbfe;font-weight:900;">🎯 MI META AL DÍA</div>
                <div style="font-size:34px;font-weight:950;margin-top:6px;">
                  ${cumplimiento.toFixed(1)}%
                </div>
              </div>
              <div style="
                padding:7px 9px;
                border-radius:999px;
                background:rgba(7,22,47,.38);
                color:${estado.color};
                font-size:9px;
                font-weight:950;
                text-align:center;
              ">${estado.texto}</div>
            </div>

            <div style="height:10px;background:rgba(7,22,47,.48);border-radius:999px;overflow:hidden;margin-top:10px;">
              <span style="
                display:block;
                width:${Math.max(0,Math.min(100,cumplimiento))}%;
                height:100%;
                background:#4ade80;
                border-radius:999px;
              "></span>
            </div>

            <div style="font-size:16px;font-weight:900;margin-top:11px;">
              ${puntos.toFixed(1)} de ${meta.toFixed(1)} puntos esperados
            </div>
            <div style="font-size:11px;color:#bfdbfe;margin-top:5px;">
              ${numero(cumplimientoDia.diasCampo)} días en campo ×
              ${numero(cumplimientoDia.metaDiaria || 5)} puntos ·
              ${escapar(textoBrecha)}
            </div>
          </section>

          <div style="
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:10px;
          ">
            ${tarjetaIndicador(
              "📈",
              "Producción",
              `${puntos.toFixed(1)} pts`,
              `${cumplimiento.toFixed(1)}% de la meta al día`,
              `mostrarProduccionV2('${escapar(periodo)}')`,
              "linear-gradient(135deg,#164eac,#1d78ff)"
            )}

            ${tarjetaIndicador(
              "🎯",
              "Efectividad",
              `${numero(item.efectividad).toFixed(1)}%`,
              "Abrir detalle de efectividad",
              `mostrarEfectividad('${escapar(periodo)}')`,
              "linear-gradient(135deg,#047857,#19b37a)"
            )}

            ${tarjetaIndicador(
              "🔧",
              "Recableado",
              `${numero(item.recableado).toFixed(1)}%`,
              "Abrir detalle de recableados",
              `mostrarRecableado('${escapar(periodo)}')`,
              "linear-gradient(135deg,#9a3412,#f97316)"
            )}

            ${tarjetaIndicador(
              "📡",
              "VTR / GAR",
              `${numero(item.vtrgar).toFixed(1)}%`,
              "Abrir detalle de VTR y GAR",
              `mostrarVTRGAR('${escapar(periodo)}')`,
              "linear-gradient(135deg,#854d0e,#eab308)"
            )}

            ${tarjetaIndicador(
              "⏱️",
              "Tiempo de Gestión – SLA",
              `${numero(item.slaAjustado).toFixed(1)}% ${slaSemaforo.icono || ""}`,
              `Bruto ${numero(item.slaBruto).toFixed(1)}% · ${numero(item.detSla?.evaluables)} códigos evaluables`,
              `mostrarTiempoGestionSla('${escapar(periodo)}')`,
              "linear-gradient(135deg,#3730a3,#7c3aed)"
            )}
          </div>

          <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>`);
    }catch(error){
      renderError(error,periodoSolicitado);
    }
  }

  window.mostrarMiDesempeno = mostrar;
})();