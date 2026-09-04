/* ============================================================
   MI VISUAL V529C - TECNICO INTEGRADO / SELECCION V430 AISLADA
   04/09/2026

   ALCANCE: SOLO PERFIL TECNICO / SOLO FRONTEND.
   - Conserva filtros Todos / Recableado / GAR / VTR / Otro.
   - Conserva AT-, VTEXT-, GAR-, VTR- y NO APLICA.
   - Respeta VALIDADO, MANUAL y MANUAL_TICKET de V430.
   - Ingreso manual solo responde a un gesto real del usuario.
   - V529C: la seleccion de candidatos deja de depender del listener global.
     Se atiende dentro de #vt430Resultados y usa la funcion oficial V430.
   - Verifica el autocompletado y realiza un unico reintento local si una
     actualizacion concurrente de la vista interrumpe el primer intento.
   - Las mutaciones propias del buscador V430 ya no disparan reprocesamiento
     completo de esta capa; solo revalidan el enlace local de seleccion.
   - Sin setInterval. No toca API, backend, permisos, Sheets, Produccion,
     Ranking, Bonos ni otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4S2_FILTROS_TECNICO_OK) return;
  window.MV517D_F4S2_FILTROS_TECNICO_OK=true;

  const TIPOS_TICKET=["AT-","VTEXT-","GAR-","VTR-","NO APLICA"];
  let timer=null;
  let ultimaAccion={tipo:"",ts:0};

  function norm(v){
    return String(v==null?"":v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil")||"")==="TECNICO";
  }

  function marcar(tipo){
    ultimaAccion={tipo:String(tipo||""),ts:Date.now()};
  }

  function desbloquearSelect(el){
    if(!el) return;
    el.disabled=false;
    el.classList.remove("vt430-locked");
  }

  function desbloquearInput(el){
    if(!el) return;
    el.readOnly=false;
    el.classList.remove("vt430-locked");
  }

  function bloquearSelect(el){
    if(!el) return;
    el.disabled=true;
    el.classList.add("vt430-locked");
  }

  function bloquearInput(el){
    if(!el) return;
    el.readOnly=true;
    el.classList.add("vt430-locked");
  }

  function fijarFormularioTecnico(){
    if(!esTecnico()) return;

    const buscador=document.getElementById("vt430Busqueda");
    const select=document.getElementById("vtTipoTicket");
    if(!buscador || !select) return;

    Array.from(select.options||[]).forEach(function(op){
      if(TIPOS_TICKET.includes(String(op.value||""))){
        op.hidden=false;
        op.disabled=false;
      }
    });

    const resultado=document.getElementById("vt430Resultados");
    const estadoVisible=norm(resultado&&resultado.textContent||"");
    const numero=document.getElementById("vtNumeroTicket");
    const codigo=document.getElementById("vtCodigo");
    const dni=document.getElementById("vtDniCliente");

    if(estadoVisible.includes("INGRESO MANUAL HABILITADO")){
      desbloquearSelect(select);
      desbloquearInput(numero);
      desbloquearInput(codigo);
      desbloquearInput(dni);
      return;
    }

    if(estadoVisible.includes("CLIENTE Y CODIGO VALIDADOS")){
      desbloquearSelect(select);
      desbloquearInput(numero);
      bloquearInput(codigo);
      bloquearInput(dni);
      return;
    }

    if(estadoVisible.includes("ATENCION VALIDADA POR MI VISUAL")){
      const match=estadoVisible.match(/\b(VTEXT|GAR|VTR|AT)-/);
      if(match){
        const valor=match[1]+"-";
        if(TIPOS_TICKET.includes(valor) && select.value!==valor){
          select.value=valor;
          if(typeof window.actualizarTipoValidacionPorTicket==="function"){
            try{window.actualizarTipoValidacionPorTicket();}catch(_){}
          }
        }
      }
      bloquearSelect(select);
      bloquearInput(numero);
      bloquearInput(codigo);
      bloquearInput(dni);
    }
  }

  function fijarFiltros(){
    if(!esTecnico()) return;

    const sede=document.getElementById("vtFiltroSede");
    if(sede) sede.remove();

    const tipo=document.getElementById("vtFiltroTipo");
    if(tipo){
      const actual=tipo.value||"";
      const valores=Array.from(tipo.options||[]).map(function(o){return String(o.value||"");});
      const textoPrimero=tipo.options&&tipo.options.length?norm(tipo.options[0].textContent||""):"";
      const correcto=valores.length===5 &&
        valores[0]==="" && valores[1]==="RECABLEADO" && valores[2]==="GAR" &&
        valores[3]==="VTR" && valores[4]==="OTRO" && textoPrimero==="TODOS MIS REGISTROS";

      if(!correcto){
        tipo.innerHTML='<option value="">Todos mis registros</option>'+ 
          '<option value="RECABLEADO">Recableado</option>'+ 
          '<option value="GAR">GAR</option>'+ 
          '<option value="VTR">VTR</option>'+ 
          '<option value="OTRO">Otro</option>';
        tipo.value=["","RECABLEADO","GAR","VTR","OTRO"].includes(actual)?actual:"";
      }
    }

    const buscar=document.getElementById("vtBuscarCodigo");
    if(buscar) buscar.placeholder="🔍 Buscar por código, DNI o ticket";

    fijarFormularioTecnico();
    asegurarSeleccionLocalV430();
  }

  function programar(ms){
    clearTimeout(timer);
    timer=setTimeout(fijarFiltros,ms==null?25:ms);
  }

  function cancelarEvento(ev){
    try{ev.preventDefault();}catch(_){}
    try{ev.stopPropagation();}catch(_){}
    try{ev.stopImmediatePropagation();}catch(_){}
  }

  function esBotonBuscar(el){
    return !!(el&&el.closest&&el.closest("#vt430Busqueda button[onclick*='vt430BuscarDatos']"));
  }

  function esBotonManual(el){
    return !!(el&&el.closest&&el.closest("#vt430Busqueda button[onclick*='vt430ActivarManual']"));
  }

  function seleccionAplicada(){
    const resultado=norm(document.getElementById("vt430Resultados")?.textContent||"");
    const tipo=document.getElementById("vtTipoTicket")?.value||"";
    const numero=String(document.getElementById("vtNumeroTicket")?.value||"").trim();
    const codigo=String(document.getElementById("vtCodigo")?.value||"").trim();
    const dni=String(document.getElementById("vtDniCliente")?.value||"").trim();
    return resultado.includes("ATENCION VALIDADA POR MI VISUAL") &&
      !!tipo && !!numero && !!codigo && !!dni;
  }

  function aplicarCandidatoDesdeContenedor(cont,candidato){
    if(!cont || !candidato) return false;
    if(typeof window.vt430SeleccionarCandidato!=="function") return false;

    const lista=Array.from(cont.querySelectorAll(".vt430-candidato"));
    const indice=lista.indexOf(candidato);
    if(indice<0) return false;

    try{
      window.vt430SeleccionarCandidato(indice);
    }catch(error){
      console.error("MI VISUAL V529C - seleccionar candidato V430",error);
      return false;
    }

    // Un solo reintento local. No consulta API ni duplica reglas; vuelve a
    // ejecutar la misma seleccion oficial si una capa concurrente la interrumpe.
    setTimeout(function(){
      if(seleccionAplicada()){
        fijarFormularioTecnico();
        return;
      }
      const vigente=document.getElementById("vt430Resultados");
      if(!vigente || typeof window.vt430SeleccionarCandidato!=="function") return;
      const actuales=Array.from(vigente.querySelectorAll(".vt430-candidato"));
      if(indice>=actuales.length) return;
      try{window.vt430SeleccionarCandidato(indice);}catch(_){}
      setTimeout(fijarFormularioTecnico,35);
    },90);

    return true;
  }

  function asegurarSeleccionLocalV430(){
    const cont=document.getElementById("vt430Resultados");
    if(!cont || cont.dataset.mv529cSeleccion==="1") return;
    cont.dataset.mv529cSeleccion="1";

    cont.addEventListener("pointerup",function(ev){
      if(!esTecnico()) return;
      const candidato=ev.target&&ev.target.closest?ev.target.closest(".vt430-candidato"):null;
      if(!candidato || !cont.contains(candidato)) return;
      cancelarEvento(ev);
      aplicarCandidatoDesdeContenedor(cont,candidato);
    },true);

    cont.addEventListener("keydown",function(ev){
      if(!esTecnico()) return;
      if(ev.key!=="Enter" && ev.key!==" ") return;
      const candidato=ev.target&&ev.target.closest?ev.target.closest(".vt430-candidato"):null;
      if(!candidato || !cont.contains(candidato)) return;
      cancelarEvento(ev);
      aplicarCandidatoDesdeContenedor(cont,candidato);
    },true);

    Array.from(cont.querySelectorAll(".vt430-candidato")).forEach(function(card){
      if(!card.hasAttribute("tabindex")) card.setAttribute("tabindex","0");
      card.setAttribute("role","button");
    });
  }

  document.addEventListener("pointerdown",function(ev){
    if(!esTecnico()) return;
    if(esBotonBuscar(ev.target)) marcar("BUSCAR");
    else if(esBotonManual(ev.target)) marcar("MANUAL");
  },true);

  document.addEventListener("keydown",function(ev){
    if(!esTecnico()) return;
    if(ev.key==="Enter" && ev.target && ev.target.id==="vt430Consulta"){
      marcar("BUSCAR");
      return;
    }
    if((ev.key==="Enter"||ev.key===" ") && esBotonManual(ev.target)){
      marcar("MANUAL");
    }
  },true);

  // Solo protege Manual. La seleccion de tickets ya NO se intercepta aqui.
  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;

    const manual=ev.target&&ev.target.closest?ev.target.closest("#vt430Busqueda button[onclick*='vt430ActivarManual']"):null;
    if(manual){
      const reciente=Date.now()-Number(ultimaAccion.ts||0)<1200;
      if(!reciente || ultimaAccion.tipo!=="MANUAL"){
        cancelarEvento(ev);
        return;
      }
      marcar("");
      programar(50);
      return;
    }

    // Si el click corresponde al buscador/resultados V430, no se reprocesan
    // filtros ni formulario desde esta capa.
    if(ev.target&&ev.target.closest&&ev.target.closest("#vt430Busqueda")) return;
    programar(45);
  },true);

  document.addEventListener("change",function(ev){
    if(!esTecnico()) return;
    if(ev.target&&ev.target.id==="vtTipoTicket") programar(0);
  },true);

  function mutacionSoloV430(m){
    const t=m&&m.target;
    const el=t&&t.nodeType===1?t:t&&t.parentElement;
    return !!(el&&el.closest&&el.closest("#vt430Busqueda"));
  }

  function observarPantalla(){
    const raiz=document.getElementById("pantalla");
    if(!raiz || raiz.dataset.mv529cObs==="1") return;
    raiz.dataset.mv529cObs="1";

    const obs=new MutationObserver(function(muts){
      if(!esTecnico()) return;
      const soloV430=(muts||[]).length>0 && (muts||[]).every(mutacionSoloV430);
      if(soloV430){
        setTimeout(asegurarSeleccionLocalV430,0);
        return;
      }
      programar(30);
    });
    obs.observe(raiz,{childList:true,subtree:true});
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){
      observarPantalla();
      programar(0);
    },{once:true});
  }else{
    observarPantalla();
    programar(0);
  }

  console.log("MI VISUAL V529C: seleccion V430 local, verificada y aislada de capas globales.");
})();