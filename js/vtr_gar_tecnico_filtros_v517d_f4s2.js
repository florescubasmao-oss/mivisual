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
    AT-. V530 NO vuelve a seleccionar el candidato ni reconstruye campos: solo
    restaura el prefijo que V430 ya dejo confirmado en su mensaje de validacion.
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

          /*
            Mostrar candidatos, confirmar seleccion o habilitar Manual no debe
            activar ningun segundo manejador de seleccion. Si cambia V430 solo
            comprobamos el tipo confirmado, sin tocar sus demas campos.
          */
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

  /*
    No existen listeners globales de click/pointer/keydown en V530.
    Buscar -> elegir -> autocompletar y Manual permanecen en las funciones
    oficiales de validacion_tecnica_datos_v430.js.
  */
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
