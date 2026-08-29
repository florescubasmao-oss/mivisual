/* ============================================================
   MI VISUAL V517D F4O - RESTAURA TECNICO VALIDACION ORIGINAL
   29/08/2026

   SOLO FRONTEND / PERFIL TECNICO:
   - El Tecnico vuelve a una sola pantalla: VALIDACION TECNICA original.
   - Oculta/elimina submodulos agregados Recableado y VTR/GAR.
   - No cambia el formulario original ni su historial.
   - GAR/VTR registrados por el Tecnico siguen guardandose en VALIDACION_TECNICA
     y son consumidos por la Gestion GAR/VTR de Jefatura.
   - No modifica Jefatura, Supervisor, Produccion, Ranking ni backend.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4O_TECNICO_RESTAURADO_OK) return;
  window.MV517D_F4O_TECNICO_RESTAURADO_OK=true;

  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esTecnico=()=>norm(localStorage.getItem("perfil")||"")==="TECNICO";

  const MOSTRAR_ORIGINAL=typeof window.mostrarValidacionTecnica==="function"
    ? window.mostrarValidacionTecnica
    : null;

  /* El flujo V517C.2 sustituyo el guardado del Tecnico y dejo origenOrden vacio.
     Restauramos exactamente el payload del formulario base V253. */
  async function guardarOriginalTecnico(btn){
    if(!esTecnico()) return;
    const u=typeof window.usuarioActualValidacion==="function"
      ? window.usuarioActualValidacion()
      : {usuario:localStorage.getItem("usuario")||""};
    const tipoValidacion=txt(document.getElementById("vtTipoValidacion")?.value);
    const codigo=txt(document.getElementById("vtCodigo")?.value);
    const tipoTicket=txt(document.getElementById("vtTipoTicket")?.value);
    const numeroTicket=txt(document.getElementById("vtNumeroTicket")?.value);
    const origenOrden=txt(document.getElementById("vtOrigenOrden")?.value);
    const dniCliente=txt(document.getElementById("vtDniCliente")?.value);
    const motivo=txt(document.getElementById("vtMotivo")?.value);

    if(!codigo||!tipoValidacion||!tipoTicket||!dniCliente||!motivo){
      alert("Completa todos los campos obligatorios.");return;
    }
    if(tipoTicket!=="NO APLICA"&&!numeroTicket){
      alert("Ingresa el número de ticket o selecciona NO APLICA.");return;
    }
    if((tipoValidacion==="GAR"||tipoValidacion==="VTR")&&!origenOrden){
      alert("Seleccione si la orden es PROPIA o ASIGNADA.");return;
    }

    try{
      if(btn){btn.disabled=true;btn.innerHTML="Guardando...";}
      if(typeof window.mostrarCargandoValidacion==="function")window.mostrarCargandoValidacion("Registrando solicitud...");
      if(typeof window.apiValidacionTecnica!=="function")throw new Error("No está disponible el registro de Validación Técnica.");
      const r=await window.apiValidacionTecnica({
        accion:"registrarValidacionTecnica",
        usuario:u.usuario,
        tipoValidacion,
        codigo,
        tipoTicket,
        numeroTicket,
        origenOrden,
        dniCliente,
        motivoTecnico:motivo
      });
      if(!r||!r.ok)throw new Error(r&&r.error||"No se pudo registrar");
      if(typeof window.mostrarConfirmacionValidacionTecnica==="function")window.mostrarConfirmacionValidacionTecnica(r);
    }catch(e){
      alert("❌ "+(e&&e.message?e.message:e));
    }finally{
      if(typeof window.ocultarCargandoValidacion==="function")window.ocultarCargandoValidacion();
      if(btn){btn.disabled=false;btn.innerHTML="Guardar solicitud";}
    }
  }

  function limpiarSegmentacion(){
    if(!esTecnico()) return;
    window.MV488_VT_MODO="";

    document.querySelectorAll([
      ".mv488-subnav",
      "#mv489Tabs",
      ".mv489-tabs",
      "#mv501VtrGarNav",
      ".mv501-vtrgar-nav",
      "#mv48725EntradaVtrGar"
    ].join(",")).forEach(el=>el.remove());

    const wrap=document.querySelector(".vt-wrap");
    if(wrap){
      const h2=wrap.querySelector(".vt-header h2");
      if(h2)h2.textContent="📋 VALIDACIÓN TÉCNICA";
      const p=wrap.querySelector(".vt-header p");
      if(p)p.textContent="Registro y control de recableados, GAR y VTR con trazabilidad operativa.";
    }
  }

  let abriendo=false;
  function abrirOriginal(){
    if(!esTecnico()) return false;
    if(abriendo) return true;
    abriendo=true;
    try{
      window.MV488_VT_MODO="";
      if(typeof MOSTRAR_ORIGINAL==="function") MOSTRAR_ORIGINAL();
      else if(typeof window.mostrarValidacionTecnica==="function" && window.mostrarValidacionTecnica!==abrirOriginal) window.mostrarValidacionTecnica();
      setTimeout(limpiarSegmentacion,0);
      setTimeout(limpiarSegmentacion,120);
      setTimeout(limpiarSegmentacion,500);
    }finally{
      setTimeout(()=>{abriendo=false;},650);
    }
    return true;
  }

  if(MOSTRAR_ORIGINAL){
    const mostrar=function(){
      if(esTecnico()) return abrirOriginal();
      return MOSTRAR_ORIGINAL.apply(this,arguments);
    };
    window.mostrarValidacionTecnica=mostrar;
    try{mostrarValidacionTecnica=mostrar;}catch(_){}
  }

  /* Restaurar el guardado base solo para Tecnico. Para otros perfiles no se toca. */
  const GUARDAR_ACTUAL=window.guardarValidacionTecnica;
  const guardar=function(btn){
    if(esTecnico()) return guardarOriginalTecnico(btn);
    if(typeof GUARDAR_ACTUAL==="function")return GUARDAR_ACTUAL.apply(this,arguments);
  };
  window.guardarValidacionTecnica=guardar;
  try{guardarValidacionTecnica=guardar;}catch(_){}

  /* Si alguna capa antigua intenta abrir uno de los submodulos en Tecnico,
     se redirige a la pantalla unica original. */
  function reforzarRutas(){
    if(!esTecnico()) return;
    window.MV488_VT_MODO="";
    window.mv488AbrirRecableado=abrirOriginal;
    window.mv488AbrirVtrGar=abrirOriginal;
    window.mv489AbrirRegistroVtrGar=abrirOriginal;
    window.mv489AbrirValidacionVtrGar=abrirOriginal;
    window.mv489AbrirRegistro=abrirOriginal;
    limpiarSegmentacion();
  }

  const obs=new MutationObserver(function(){
    if(!esTecnico())return;
    if(document.querySelector(".mv489-wrap")){
      abrirOriginal();
      return;
    }
    limpiarSegmentacion();
  });
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});

  /* V517C.2 reinyecta rutas periódicamente. F4O se reafirma sin tocar datos. */
  setInterval(reforzarRutas,700);
  [0,120,400,900,1600].forEach(ms=>setTimeout(reforzarRutas,ms));
  console.log("MI VISUAL V517D F4O: perfil Tecnico restaurado a Validacion Tecnica original.");
})();