/* ============================================================
   MI VISUAL V411 - Ranking con SLA desde API operativa
   - Ya no depende de que el CSV público entregue columnas U:Z.
   - Usa la misma fuente consolidada del Dashboard.
   - Conserva diseño, filtros, puestos y demás indicadores.
============================================================ */
(function(){
  "use strict";
  if(window.MV411_RANKING_SLA_OK) return;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function api(){return window.MI_VISUAL_API_URL || "";}

  async function consultar(periodo){
    const url=new URL(api());
    url.searchParams.set("accion","obtenerResumenDashboardRanking");
    url.searchParams.set("usuario",localStorage.getItem("usuario")||"");
    if(periodo)url.searchParams.set("periodo",periodo);
    url.searchParams.set("forzarActualizacion","NO");
    url.searchParams.set("_mv411",Date.now());

    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",headers:{Accept:"application/json"}});
    const t=(await r.text()).trim();
    if(!r.ok||!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t)){
      throw new Error("No se pudo leer el Ranking consolidado.");
    }
    const d=JSON.parse(t);
    if(!d.ok)throw new Error(d.error||"No se pudo obtener el Ranking.");
    return d;
  }

  function semaforoSla(valor){
    const x=n(valor);
    if(x>=90)return "🟢";
    if(x>=80)return "🟡";
    return "🔴";
  }

  function normalizarPeriodos(data){
    const arr=Array.isArray(data?.periodos)?data.periodos:[];
    const salida=[];
    const vistos=new Set();
    arr.forEach(function(p){
      const clave=typeof p==="string"?p:String(p?.clave||p?.periodo||"");
      if(!/^\d{4}-\d{2}$/.test(clave)||vistos.has(clave))return;
      vistos.add(clave);
      salida.push({
        clave,
        etiqueta:typeof p==="string"
          ?(typeof mv276EtiquetaPeriodo==="function"?mv276EtiquetaPeriodo(clave):clave)
          :(p.etiqueta||p.nombre||(typeof mv276EtiquetaPeriodo==="function"?mv276EtiquetaPeriodo(clave):clave)),
        corte:typeof p==="string"?"":(p.corte||"")
      });
    });
    const actual=String(data?.periodo||"");
    if(/^\d{4}-\d{2}$/.test(actual)&&!vistos.has(actual)){
      salida.push({clave:actual,etiqueta:typeof mv276EtiquetaPeriodo==="function"?mv276EtiquetaPeriodo(actual):actual,corte:""});
    }
    return salida.sort((a,b)=>b.clave.localeCompare(a.clave));
  }

  function convertir(item,data){
    const det=item?.detSla||{};
    const pesoSla=n(data?.configuracionRanking?.pesos?.SLA);
    const sla=n(item?.slaAjustado ?? item?.sla ?? det?.slaAjustado);
    return {
      id:item?.id||"",
      cuadrilla:normalizarCuadrillaRanking(item?.cuadrilla||""),
      actualizacion:item?.actualizacion||"",
      usuario:item?.usuario||"",
      sede:normalizarTextoRanking(item?.sede||""),
      plataforma:normalizarTextoRanking(item?.plataforma||""),
      produccion:n(item?.produccion),
      efectividad:n(item?.efectividad),
      recableado:n(item?.recableado),
      vtrgar:n(item?.vtrgar),
      observaciones:n(item?.observaciones),
      montoTotalObs:n(item?.montoTotalObs),
      montoAfectadoObs:n(item?.montoAfectadoObs),
      puntaje:n(item?.puntaje ?? item?.puntajeFinal),
      puestoSede:n(item?.puestoSede),
      puestoRegion:n(item?.puestoRegion),
      puestoPlataforma:n(item?.puestoPlataforma),
      slaDisponible:n(det?.evaluables)>0 || n(item?.slaBruto)>0 || sla>0,
      slaBruto:n(item?.slaBruto ?? det?.slaBruto),
      slaAjustado:sla,
      slaEvaluables:n(det?.evaluables),
      slaFuera:n(det?.fueraAjustado),
      slaExcepcionesAprobadas:n(det?.excepcionesAprobadas),
      aporteSla:pesoSla>0 ? (sla*pesoSla/100) : 0
    };
  }

  function tarjetaConSla(r,tipoPuesto){
    let puesto=r.puestoRegion;
    let medalla=medallaRanking(r.puestoRegion);
    if(tipoPuesto==="sede"){
      puesto=r.puestoSede;medalla=medallaRanking(r.puestoSede);
    }
    if(tipoPuesto==="plataforma"){
      puesto=r.puestoPlataforma;medalla=medallaRanking(r.puestoPlataforma);
    }

    const slaCards=r.slaDisponible?`
      ${indicadorMiniRanking("SLA",formatoPorcentajeRanking(r.slaAjustado),`${semaforoSla(r.slaAjustado)} · Bruto ${formatoPorcentajeRanking(r.slaBruto)}`)}
      ${indicadorMiniRanking("Detalle SLA",r.slaEvaluables||0,`Evaluables · Fuera ${r.slaFuera||0} · Aprobadas ${r.slaExcepcionesAprobadas||0}`)}
    `:"";

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
          ${indicadorMiniRanking("Efectividad",formatoPorcentajeRanking(r.efectividad),colorSemaforoRanking("efectividad",r.efectividad))}
          ${indicadorMiniRanking("% Recableado",formatoPorcentajeRanking(r.recableado),colorSemaforoRanking("recableado",r.recableado))}
          ${indicadorMiniRanking("% VTR/GAR",formatoPorcentajeRanking(r.vtrgar),colorSemaforoRanking("vtrgar",r.vtrgar))}
          ${indicadorMiniRanking("Observaciones",r.observaciones||0,"")}
          ${indicadorMiniRanking("Monto Afectado",formatoSolesRanking(r.montoAfectadoObs),"")}
          ${slaCards}
        </div>
      </div>`;
  }

  async function mostrarRankingV411(periodoSeleccionado){
    const perfil=normalizarTextoRanking(localStorage.getItem("perfil"));
    const cuadrillaUsuario=normalizarCuadrillaRanking(localStorage.getItem("cuadrilla"));
    const sedeUsuario=normalizarTextoRanking(localStorage.getItem("sede"));

    mostrarPantalla(`<div style="padding:20px;max-width:900px;margin:auto;"><h2>🏆 RANKING</h2>Cargando ranking...</div>`);

    try{
      const d=await consultar(periodoSeleccionado||"");
      MV276_RANKING_PERIODOS=normalizarPeriodos(d);
      MV276_RANKING_PERIODO=d.periodo || (typeof mv276PeriodoPredeterminado==="function"?mv276PeriodoPredeterminado(MV276_RANKING_PERIODOS,periodoSeleccionado):periodoSeleccionado||"");
      const lista=(Array.isArray(d.lista)?d.lista:[]).map(x=>convertir(x,d)).filter(x=>x.cuadrilla);

      if(!lista.length){
        mostrarPantalla(`<div style="padding:20px;"><h2>🏆 RANKING</h2>No hay datos de ranking.<br><br><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`);
        return;
      }

      if(perfil==="TECNICO"){
        const item=lista.find(x=>normalizarCuadrillaRanking(x.cuadrilla)===cuadrillaUsuario);
        if(!item){
          mostrarPantalla(`<div style="padding:20px;"><h2>🏆 MI RANKING</h2>No se encontró ranking para tu cuadrilla.<br><br><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`);
          return;
        }
        mostrarPantalla(vistaTecnicoRanking(item));
        return;
      }

      if(mv239EsVistaJefaturaRanking(perfil)){
        MV239_RANKING_JEFATURA_LISTA=lista.slice();
        MV239_RANKING_JEFATURA_SEDE="TODAS";
        mv239RenderRankingJefatura();
        return;
      }

      let listaFiltrada=lista;
      let titulo="🌎 RANKING ZONA NORTE";
      let tipoPuesto="region";
      if(perfil==="SUPERVISOR"){
        listaFiltrada=lista.filter(x=>norm(x.sede)===norm(sedeUsuario));
        titulo="👨‍💼 RANKING SEDE "+sedeUsuario;
        tipoPuesto="sede";
      }

      const referencia=listaFiltrada[0]||lista[0];
      mostrarPantalla(`
        <div style="padding:18px;max-width:980px;margin:auto;">
          <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>
          ${encabezadoPeriodoRanking(referencia)}
          ${listaTarjetasRanking(listaFiltrada,tipoPuesto)}
          <br><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>`);
    }catch(err){
      console.error("V411 Ranking",err);
      mostrarPantalla(`<div style="padding:20px;"><h2>🏆 RANKING</h2>❌ ${String(err?.message||"Error al cargar ranking.").replace(/</g,"&lt;").replace(/>/g,"&gt;")}<br><br><button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button></div>`);
    }
  }

  // Reemplaza la tarjeta para que cualquier render ejecutivo use SLA.
  window.tarjetaCuadrillaRanking=tarjetaConSla;
  try{tarjetaCuadrillaRanking=tarjetaConSla;}catch(_){}

  // Reemplaza la lectura del Ranking por la API consolidada del Dashboard.
  window.mostrarRanking=mostrarRankingV411;
  try{mostrarRanking=mostrarRankingV411;}catch(_){}

  window.MV411_RANKING_SLA_OK=true;
  console.log("MI VISUAL V411: SLA visible en Ranking desde API consolidada.");
})();
