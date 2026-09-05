/* ============================================================
   MI VISUAL V530B - TECNICO INTEGRADO / TOQUE V430 ROBUSTO
   05/09/2026

   ALCANCE ESTRICTO: SOLO PERFIL TECNICO / SOLO FRONTEND.

   OBJETIVO
   - V430 sigue siendo la unica fuente de verdad para seleccionar candidato,
     autocompletar, bloquear/desbloquear campos e Ingreso manual.
   - Esta capa conserva SOLO compatibilidad de la vista integrada:
       * AT-, VTEXT-, GAR-, VTR- y NO APLICA disponibles.
       * Protege el TIPO ya confirmado por V430 frente al ajuste tardio V488.
       * Filtros Todos / Recableado / GAR / VTR / Otro.
       * Sin filtro de sede para Tecnico.
       * Busqueda de historial por codigo, DNI o ticket.
   - V530B agrega un puente de gesto MOVIL en window/capture SOLO sobre
     .vt430-candidato. No reconstruye datos ni replica reglas: llama a la
     funcion oficial window.vt430SeleccionarCandidato(indice).
   - No bloquea propagacion, no hace preventDefault y no repite consultas API.
   - No modifica vtNumeroTicket, vtCodigo ni vtDniCliente directamente.
   - No toca API, backend, Sheets, permisos, Produccion, Ranking, Bonos,
     Efectividad, Recableado, Actas, Mapa ni vistas de otros perfiles.
============================================================ */
(function(){
  "use strict";

  if(window.MV517D_F4S2_FILTROS_TECNICO_OK) return;
  window.MV517D_F4S2_FILTROS_TECNICO_OK = true;
  window.MV530_V430_CONTROL_UNICO_OK = true;
  window.MV530B_V430_TOUCH_BRIDGE_OK = true;

  const TIPOS_TICKET = ["AT-","VTEXT-","GAR-","VTR-","NO APLICA"];
  const TIPOS_HISTORIAL = ["","RECABLEADO","GAR","VTR","OTRO"];
  let timer = null;
  let gestoV430 = null;
  let ultimaSeleccionV430 = 0;

  function norm(v){
    return String(v == null ? "" : v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil") || "") === "TECNICO";
  }

  function candidatoEvento(ev){
    if(!esTecnico()) return null;
    const target = ev && ev.target;
    const card = target && target.closest ? target.closest(".vt430-candidato") : null;
    if(!card) return null;
    const cont = card.closest("#vt430Resultados");
    if(!cont) return null;
    return {card,cont};
  }

  function seleccionarCardV430(card,cont){
    if(!card || !cont || typeof window.vt430SeleccionarCandidato !== "function") return false;
    if(!document.documentElement.contains(cont)) return false;

    const cards = Array.from(cont.querySelectorAll(".vt430-candidato"));
    const indice = cards.indexOf(card);
    if(indice < 0) return false;

    try{
      window.vt430SeleccionarCandidato(indice);
      ultimaSeleccionV430 = Date.now();
      setTimeout(protegerTipoConfirmadoPorV430,0);
      return true;
    }catch(error){
      console.warn("MI VISUAL V530B: no se pudo aplicar candidato V430",error);
      return false;
    }
  }

  /*
    El video del Tecnico confirma que la tarjeta visible recibe el toque pero
    el onclick inline puede no llegar al target en algunos moviles. Capturamos
    el gesto antes de listeners de document, sin detenerlo. Solo se acepta un
    toque corto; un desplazamiento vertical no selecciona accidentalmente.
  */
  window.addEventListener("pointerdown",function(ev){
    const r = candidatoEvento(ev);
    if(!r){ gestoV430 = null; return; }
    gestoV430 = {
      card:r.card,
      cont:r.cont,
      pointerId:ev.pointerId,
      x:Number(ev.clientX || 0),
      y:Number(ev.clientY || 0),
      ts:Date.now()
    };
  },true);

  window.addEventListener("pointerup",function(ev){
    const g = gestoV430;
    gestoV430 = null;
    if(!g || !esTecnico()) return;
    if(g.pointerId != null && ev.pointerId != null && g.pointerId !== ev.pointerId) return;

    const dx = Number(ev.clientX || 0) - g.x;
    const dy = Number(ev.clientY || 0) - g.y;
    if(Math.sqrt(dx*dx + dy*dy) > 18) return;
    if(Date.now() - g.ts > 1600) return;

    const r = candidatoEvento(ev);
    if(!r || r.card !== g.card || r.cont !== g.cont) return;
    seleccionarCardV430(g.card,g.cont);
  },true);

  window.addEventListener("pointercancel",function(){ gestoV430 = null; },true);

  // Fallback para navegadores donde PointerEvent no se emite correctamente.
  // Va en window/capture para ejecutarse antes de posibles listeners antiguos.
  window.addEventListener("click",function(ev){
    if(Date.now() - ultimaSeleccionV430 < 700) return;
    const r = candidatoEvento(ev);
    if(!r) return;
    seleccionarCardV430(r.card,r.cont);
  },true);

  /*
    V488 mantiene el modo RECABLEADO para la entrada directa del Tecnico y,
    por diseño historico, oculta GAR/VTR en ese modo. La vista F4S integra los
    tres tipos en una sola pantalla. Aqui solo hacemos visibles las opciones.
  */
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

  /*
    Carrera asincrona protegida:
    mostrar la pantalla inicia en paralelo la carga del historial. V430 puede
    validar un candidato GAR/VTR antes de que esa lectura termine. Cuando V488
    finaliza la lectura, su modo RECABLEADO historico puede volver a seleccionar
    AT-. V530B no reconstruye campos: solo restaura el prefijo confirmado.
  */
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

  console.log("MI VISUAL V530B: toque movil V430 capturado antes de capas globales; seleccion oficial conservada.");
})();