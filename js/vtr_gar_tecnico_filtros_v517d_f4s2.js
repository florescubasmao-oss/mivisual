/* ============================================================
   MI VISUAL V530 - TECNICO INTEGRADO / V430 COMO CONTROLADOR
   05/09/2026

   ALCANCE ESTRICTO: SOLO PERFIL TECNICO / SOLO FRONTEND.

   OBJETIVO
   - V430 queda como responsable de Buscar, seleccionar candidato,
     autocompletar, bloquear/desbloquear campos e Ingreso manual.
   - Esta capa conserva SOLO la compatibilidad de la vista integrada:
       * AT-, VTEXT-, GAR-, VTR- y NO APLICA disponibles.
       * Protege unicamente el TIPO de ticket ya elegido por V430 frente al
         ajuste tardio de V488 mientras termina de cargar el historial.
       * Filtros Todos / Recableado / GAR / VTR / Otro.
       * Sin filtro de sede para el Tecnico.
       * Busqueda de historial por codigo, DNI o ticket.
   - No intercepta click, pointer, teclado ni tarjetas .vt430-candidato.
   - No llama vt430SeleccionarCandidato ni repite una seleccion.
   - No modifica vtNumeroTicket, vtCodigo ni vtDniCliente.
   - No toca API, backend, Sheets, permisos, Produccion, Ranking, Bonos,
     Efectividad, Recableado, Actas, Mapa ni vistas de otros perfiles.
============================================================ */
(function(){
  "use strict";

  if(window.MV517D_F4S2_FILTROS_TECNICO_OK) return;
  window.MV517D_F4S2_FILTROS_TECNICO_OK = true;
  window.MV530_V430_CONTROL_UNICO_OK = true;

  const TIPOS_TICKET = ["AT-","VTEXT-","GAR-","VTR-","NO APLICA"];
  const TIPOS_HISTORIAL = ["","RECABLEADO","GAR","VTR","OTRO"];
  let timer = null;

  function norm(v){
    return String(v == null ? "" : v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil") || "") === "TECNICO";
  }

  function habilitarTiposTicketTecnico(){
    if(!esTecnico()) return;

    const buscador = document.getElementById("vt430Busqueda");
    const select = document.getElementById("vtTipoTicket");
    if(!buscador || !select) return;

    Array.from(select.options || []).forEach(function(op){
      if(!TIPOS_TICKET.includes(String(op.value || ""))) return;
      if(op.hidden) op.hidden = false;
      if(op.disabled) op.disabled = false;
    });
  }

  function protegerTipoConfirmadoPorV430(){
    if(!esTecnico()) return;

    const resultado = document.getElementById("vt430Resultados");
    const select = document.getElementById("vtTipoTicket");
    if(!resultado || !select) return;

    const visible = norm(resultado.textContent || "");
    if(!visible.includes("ATENCION VALIDADA POR MI VISUAL")) return;

    const match = visible.match(/\b(VTEXT|GAR|VTR|AT)-/);
    if(!match) return;

    const valor = match[1] + "-";
    if(!TIPOS_TICKET.includes(valor) || select.value === valor) return;

    select.value = valor;
    if(typeof window.actualizarTipoValidacionPorTicket === "function"){
      try{ window.actualizarTipoValidacionPorTicket(); }catch(_){}
    }
  }

  function fijarFiltrosTecnico(){
    if(!esTecnico()) return;

    const sede = document.getElementById("vtFiltroSede");
    if(sede) sede.remove();

    const tipo = document.getElementById("vtFiltroTipo");
    if(tipo){
      const actual = String(tipo.value || "");
      const valores = Array.from(tipo.options || []).map(function(o){
        return String(o.value || "");
      });
      const primero = tipo.options && tipo.options.length
        ? norm(tipo.options[0].textContent || "")
        : "";

      const correcto = valores.length === 5 &&
        TIPOS_HISTORIAL.every(function(v,i){ return valores[i] === v; }) &&
        primero === "TODOS MIS REGISTROS";

      if(!correcto){
        tipo.innerHTML =
          '<option value="">Todos mis registros</option>' +
          '<option value="RECABLEADO">Recableado</option>' +
          '<option value="GAR">GAR</option>' +
          '<option value="VTR">VTR</option>' +
          '<option value="OTRO">Otro</option>';
        tipo.value = TIPOS_HISTORIAL.includes(actual) ? actual : "";
      }
    }

    const buscar = document.getElementById("vtBuscarCodigo");
    if(buscar) buscar.placeholder = "🔍 Buscar por código, DNI o ticket";
  }

  function aplicar(){
    if(!esTecnico()) return;
    habilitarTiposTicketTecnico();
    protegerTipoConfirmadoPorV430();
    fijarFiltrosTecnico();
  }

  function programar(ms){
    clearTimeout(timer);
    timer = setTimeout(aplicar, ms == null ? 25 : ms);
  }

  function estaDentroV430(el){
    return !!(el && el.closest && el.closest("#vt430Busqueda"));
  }

  function observarPantalla(){
    const raiz = document.getElementById("pantalla");
    if(!raiz || raiz.dataset.mv530F4s2Obs === "1") return;
    raiz.dataset.mv530F4s2Obs = "1";

    const obs = new MutationObserver(function(muts){
      if(!esTecnico()) return;

      let requiere = false;
      for(const m of (muts || [])){
        if(m.type === "attributes"){
          const el = m.target && m.target.nodeType === 1 ? m.target : null;
          if(el && el.tagName === "OPTION" && el.closest("#vtTipoTicket")){
            requiere = true;
            break;
          }
          continue;
        }

        if(m.type === "childList"){
          const t = m.target && m.target.nodeType === 1 ? m.target : m.target?.parentElement;

          if(estaDentroV430(t)){
            setTimeout(protegerTipoConfirmadoPorV430,0);
            continue;
          }

          requiere = true;
          break;
        }
      }

      if(requiere) programar(20);
    });

    obs.observe(raiz,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["hidden","disabled"]
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",function(){
      observarPantalla();
      [0,80,280,650].forEach(function(ms){ setTimeout(aplicar,ms); });
    },{once:true});
  }else{
    observarPantalla();
    [0,80,280,650].forEach(function(ms){ setTimeout(aplicar,ms); });
  }

  console.log("MI VISUAL V530: V430 controla seleccion/autocompletado; F4S2 queda como compatibilidad visual del Tecnico.");
})();

/* ============================================================
   MI VISUAL V531C - RESULTADO GAR/VTR VISIBLE PARA EL TECNICO
   14/09/2026

   ALCANCE ESTRICTO / SOLO FRONTEND / SOLO PERFIL TECNICO
   - Refuerza el historial del Tecnico con la lectura V515 creada
     especificamente para Mi Desempeno GAR/VTR.
   - BONO y NO BONO quedan visibles despues de la validacion de Jefatura.
   - Conserva puntaje, motivo y validador cuando vienen del backend.
   - NO escribe Sheets, NO cambia Produccion, Ranking ni formulas.
   - NO usa esta lectura para sumar puntos: el puntaje activo sigue bajo F4G.
============================================================ */
(function(){
  "use strict";
  if(window.MV531C_TECNICO_GARVTR_VISIBLE_OK) return;
  window.MV531C_TECNICO_GARVTR_VISIBLE_OK = true;

  const API = window.MI_VISUAL_API_URL ||
    (typeof API_VALIDACION_TECNICA !== "undefined" ? API_VALIDACION_TECNICA : "");
  const TTL = 30000;
  let ultimaConsulta = 0;
  let consulta = null;
  let timer = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esTecnico(){ return norm(localStorage.getItem("perfil") || "") === "TECNICO"; }
  function usuario(){ return txt(localStorage.getItem("usuario") || localStorage.getItem("correo") || ""); }

  function periodoActualLima(){
    try{
      const p = new Intl.DateTimeFormat("en-CA",{
        timeZone:"America/Lima", year:"numeric", month:"2-digit"
      }).formatToParts(new Date());
      return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}`;
    }catch(_){
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }
  }

  function ticketItem(x){
    return norm(x && (x.ticketFinal || x.ticket || x.numeroTicket || ""));
  }

  function esResultadoFinal(v){
    const r = norm(v);
    return r === "BONO" || r === "NO BONO";
  }

  function aplicarDatosV515(registros){
    if(!esTecnico() || !Array.isArray(registros)) return 0;

    const base = Array.isArray(window.vtValidacionesActuales)
      ? window.vtValidacionesActuales.slice()
      : [];
    const porId = new Map();
    const porTicket = new Map();

    base.forEach(function(x,idx){
      const id = norm(x && x.id);
      const ticket = ticketItem(x);
      if(id) porId.set(id,idx);
      if(ticket) porTicket.set(ticket,idx);
    });

    let cambios = 0;
    registros.forEach(function(r){
      const resultado = norm(r && r.resultado);
      if(!esResultadoFinal(resultado)) return;

      const id = norm(r && r.id);
      const ticket = norm(r && r.ticket);
      let idx = id && porId.has(id) ? porId.get(id) :
        (ticket && porTicket.has(ticket) ? porTicket.get(ticket) : -1);

      const datos = {
        id: txt(r && r.id),
        fechaRegistro: txt(r && (r.fecha || r.fechaISO)),
        fechaISO: txt(r && r.fechaISO),
        tecnico: txt(r && r.tecnico) || usuario(),
        cuadrilla: txt(r && r.cuadrilla),
        tipoValidacion: norm(r && r.tipo),
        codigo: txt(r && r.codigo),
        ticketFinal: txt(r && r.ticket),
        estado: resultado,
        resultadoFinal: resultado,
        estadoVisibleTecnico: resultado,
        resultadoVisibleTecnico: resultado,
        puntajeVtrGar: Number(r && r.puntajeVtrGar || 0),
        motivoValidacion: txt(r && r.motivoValidacion),
        validadoPor: txt(r && r.validadoPor),
        fechaValidacion: txt(r && r.fechaValidacion)
      };

      if(idx >= 0){
        const anterior = base[idx] || {};
        base[idx] = Object.assign({}, anterior, datos, {
          fechaRegistro: anterior.fechaRegistro || datos.fechaRegistro,
          tecnico: anterior.tecnico || datos.tecnico,
          cuadrilla: anterior.cuadrilla || datos.cuadrilla,
          codigo: anterior.codigo || datos.codigo,
          ticketFinal: anterior.ticketFinal || datos.ticketFinal,
          motivoTecnico: anterior.motivoTecnico || ""
        });
      }else{
        base.push(datos);
        idx = base.length - 1;
        if(id) porId.set(id,idx);
        if(ticket) porTicket.set(ticket,idx);
      }
      cambios++;
    });

    if(cambios){
      window.vtValidacionesActuales = base;
      if(typeof window.renderHistorialValidacionLocal === "function"){
        try{ window.renderHistorialValidacionLocal(); }catch(e){
          console.warn("V531C: no se pudo repintar historial tecnico",e);
        }
      }
      corregirNoBonoVisual();
    }
    return cambios;
  }

  function corregirNoBonoVisual(){
    if(!esTecnico()) return;
    document.querySelectorAll("#vtHistorial .mv517d-tech-state").forEach(function(el){
      if(norm(el.textContent).includes("NO BONO")){
        el.classList.remove("ok");
        el.classList.add("info");
        el.style.background = "#e5e7eb";
        el.style.color = "#111827";
      }
    });
  }

  async function consultar(forzar){
    if(!esTecnico() || !usuario() || !API || !document.getElementById("vtHistorial")) return null;
    if(consulta) return consulta;
    if(!forzar && Date.now() - ultimaConsulta < TTL) return null;
    ultimaConsulta = Date.now();

    consulta = (async function(){
      const u = new URL(API);
      u.searchParams.set("accion","listarDesempenoVtrGarV515");
      u.searchParams.set("usuario",usuario());
      u.searchParams.set("periodo",periodoActualLima());
      u.searchParams.set("_v531c",String(Date.now()));

      const ctrl = typeof AbortController === "function" ? new AbortController() : null;
      const to = ctrl ? setTimeout(function(){ ctrl.abort(); },18000) : null;
      try{
        const res = await fetch(u.toString(),{
          method:"GET", cache:"no-store", redirect:"follow",
          headers:{"Accept":"application/json"},
          signal:ctrl ? ctrl.signal : undefined
        });
        const texto = (await res.text()).trim();
        if(!res.ok || !texto || /^<!doctype|^<html/i.test(texto)) return null;
        const data = JSON.parse(texto);
        if(!data || data.ok !== true || !Array.isArray(data.registros)) return null;
        const cambios = aplicarDatosV515(data.registros);
        window.MV531C_TECNICO_GARVTR_ULTIMO = {
          periodo:data.periodo || periodoActualLima(),
          registros:data.registros.length,
          cambios:cambios,
          fecha:new Date().toISOString()
        };
        return data;
      }catch(e){
        if(e && e.name !== "AbortError") console.warn("V531C: lectura GAR/VTR tecnico",e);
        return null;
      }finally{
        if(to) clearTimeout(to);
        consulta = null;
      }
    })();
    return consulta;
  }

  function programar(ms,forzar){
    clearTimeout(timer);
    timer = setTimeout(function(){
      corregirNoBonoVisual();
      consultar(!!forzar);
    },ms == null ? 80 : ms);
  }

  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;
    const actualizar = ev.target && ev.target.closest
      ? ev.target.closest("button[onclick*='cargarValidacionesTecnicas'], #cardValidacionTecnica")
      : null;
    if(actualizar) programar(250,true);
  },true);

  if(document.body){
    const obs = new MutationObserver(function(){
      if(!esTecnico() || !document.getElementById("vtHistorial")) return;
      corregirNoBonoVisual();
      programar(120,false);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  [500,1200,2500].forEach(function(ms){
    setTimeout(function(){
      if(esTecnico() && document.getElementById("vtHistorial")) consultar(false);
    },ms);
  });

  window.mv531cRefrescarGarVtrTecnico = function(){ return consultar(true); };
  console.log("MI VISUAL V531C: BONO/NO BONO GAR-VTR reforzado en historial del Tecnico sin alterar puntajes.");
})();
