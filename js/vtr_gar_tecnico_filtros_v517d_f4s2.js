/* ============================================================
   MI VISUAL V529A - TECNICO INTEGRADO ESTABLE / EVENTOS MOVIL
   04/09/2026

   ALCANCE: SOLO PERFIL TECNICO / SOLO FRONTEND.
   - Conserva los filtros Todos / Recableado / GAR / VTR / Otro.
   - Conserva AT-, VTEXT-, GAR-, VTR- y NO APLICA.
   - Respeta VALIDADO, MANUAL y MANUAL_TICKET de V430.
   - Evita el toque fantasma que puede activar Ingreso manual al cerrar
     el teclado movil despues de Buscar/Enter.
   - Refuerza la seleccion de un candidato usando la funcion oficial V430.
   - Reduce interferencia: sin setInterval y sin observar todo document.body;
     solo observa cambios dentro de #pantalla y no reconstruye el formulario.
   - No toca API, backend, permisos, Sheets, Produccion, Ranking ni otros perfiles.
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
        if(TIPOS_TICKET.includes(valor)&&select.value!==valor){
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
      const valores=Array.from(tipo.options||[]).map(o=>String(o.value||""));
      const correcto=valores.length===5&&
        valores[0]===""&&valores[1]==="RECABLEADO"&&valores[2]==="GAR"&&
        valores[3]==="VTR"&&valores[4]==="OTRO";
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

  document.addEventListener("pointerdown",function(ev){
    if(!esTecnico()) return;
    if(esBotonBuscar(ev.target)) marcar("BUSCAR");
    else if(esBotonManual(ev.target)) marcar("MANUAL");
    else if(ev.target&&ev.target.closest&&ev.target.closest("#vt430Resultados .vt430-candidato")) marcar("CANDIDATO");
  },true);

  document.addEventListener("keydown",function(ev){
    if(!esTecnico()) return;
    if(ev.key==="Enter"&&ev.target&&ev.target.id==="vt430Consulta"){
      marcar("BUSCAR");
    }
  },true);

  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;

    const manual=ev.target&&ev.target.closest?ev.target.closest("#vt430Busqueda button[onclick*='vt430ActivarManual']"):null;
    if(manual){
      const reciente=Date.now()-Number(ultimaAccion.ts||0)<1200;
      // Si el ultimo gesto real fue Buscar/Enter, un click sintetico que cae
      // sobre Manual al cerrarse el teclado no puede cambiar el estado V430.
      if(reciente&&ultimaAccion.tipo!=="MANUAL"){
        cancelarEvento(ev);
        return;
      }
      // Toque real sobre Manual: se deja pasar al onclick oficial de V430.
      programar(50);
      return;
    }

    const candidato=ev.target&&ev.target.closest?ev.target.closest("#vt430Resultados .vt430-candidato"):null;
    if(candidato&&typeof window.vt430SeleccionarCandidato==="function"){
      const lista=Array.from(document.querySelectorAll("#vt430Resultados .vt430-candidato"));
      const indice=lista.indexOf(candidato);
      if(indice>=0){
        cancelarEvento(ev);
        try{window.vt430SeleccionarCandidato(indice);}catch(error){console.error("V529A seleccionar V430",error);}
        setTimeout(function(){
          fijarFormularioTecnico();
          const tipo=document.getElementById("vtTipoTicket");
          if(tipo&&typeof tipo.scrollIntoView==="function"){
            try{tipo.scrollIntoView({behavior:"smooth",block:"center"});}catch(_){}
          }
        },40);
        return;
      }
    }

    programar(45);
  },true);

  document.addEventListener("change",function(ev){
    if(!esTecnico()) return;
    if(ev.target&&ev.target.id==="vtTipoTicket") programar(0);
  },true);

  function observarPantalla(){
    const raiz=document.getElementById("pantalla");
    if(!raiz||raiz.dataset.mv529aObs==="1") return;
    raiz.dataset.mv529aObs="1";
    const obs=new MutationObserver(function(){
      if(esTecnico()) programar(30);
    });
    obs.observe(raiz,{childList:true,subtree:true});
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){observarPantalla();programar(0);},{once:true});
  }else{
    observarPantalla();
    programar(0);
  }

  console.log("MI VISUAL V529A: eventos moviles V430 estabilizados sin capas repetitivas.");
})();