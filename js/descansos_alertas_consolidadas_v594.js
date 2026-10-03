/* ============================================================
   MI VISUAL V594 - DESCANSOS / ALERTAS CONSOLIDADAS
   03/10/2026

   Alcance:
   - Consolida duplicados visuales del contador de pendientes.
   - La alerta del menú abre directamente "Cambios pendientes".
   - Evita doble envío por clic repetido.
   - Omite reenvíos idénticos que ya están PENDIENTE/OBSERVADO.
   - No borra historial ni modifica descansos aprobados.
   - No modifica backend, hojas, permisos ni reglas de validación.
============================================================ */
(function(){
  "use strict";
  if(window.MV594_DESCANSOS_ALERTAS_OK)return;
  window.MV594_DESCANSOS_ALERTAS_OK=true;

  let guardadoEnCurso=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/_/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function claveNotificacion(x){
    return [
      norm(x&&x.cuadrilla),
      txt(x&&x.fecha),
      norm(x&&x.solicitudCambio),
      norm(x&&x.tipoRegistro)
    ].join("|");
  }

  function contarConsolidados(respuesta){
    const lista=Array.isArray(respuesta&&respuesta.solicitudes)?respuesta.solicitudes:[];
    if(!lista.length)return Math.max(0,Number(respuesta&&respuesta.pendientes)||0);
    const claves=new Set();
    lista.forEach(x=>claves.add(claveNotificacion(x)));
    return claves.size;
  }

  async function actualizarNotificaciones(){
    if(typeof window.pdUser!=="function" || typeof window.pdApi!=="function")return 0;
    const u=window.pdUser();
    if(typeof window.pdEsRevisorDescansos==="function" && !window.pdEsRevisorDescansos(u.perfil)){
      if(typeof window.pdQuitarNotificacionDescansosMenu==="function")window.pdQuitarNotificacionDescansosMenu();
      return 0;
    }
    try{
      const r=await window.pdApi({accion:"obtenerNotificacionesDescansos",usuario:u.usuario});
      let total=contarConsolidados(r);

      // Si V595 ya verificó la programación vigente, ese estado tiene prioridad
      // sobre pendientes históricos que todavía permanezcan en la hoja.
      if(window.MV595_DESCANSOS_DATA_VERIFICADA){
        const d=window.PD_DATA;
        const lista=d&&Array.isArray(d.programacion)?d.programacion:[];
        total=lista.filter(function(x){
          const e=norm(x&&(x.estadoValidacion||x.estadoProgramacion));
          return ["PENDIENTE JEFATURA","PENDIENTE SUPERVISOR","OBSERVADO"].includes(e);
        }).length;
      }

      if(typeof window.pdAplicarNotificacionDescansosMenu==="function")window.pdAplicarNotificacionDescansosMenu(total);
      return total;
    }catch(e){
      console.warn("V594: no se pudo actualizar notificaciones de descansos",e);
      return 0;
    }
  }

  function abrirPendientes(){
    window.PD_ABRIR_PENDIENTES_DESDE_MENU=true;
    return Promise.resolve(
      typeof window.mostrarProgramacionDescansos==="function"
        ? window.mostrarProgramacionDescansos()
        : null
    ).finally(function(){
      setTimeout(function(){
        const body=document.getElementById("pdPendientesBody");
        if(!body)return;
        body.classList.add("abierto");
        const btn=document.querySelector('[data-pd-toggle="pdPendientesBody"]');
        if(btn)btn.textContent="▲ Ocultar";
        const card=body.closest(".pd-card");
        if(card)card.scrollIntoView({behavior:"smooth",block:"start"});
        window.PD_ABRIR_PENDIENTES_DESDE_MENU=false;
      },180);
    });
  }

  function instalarAviso(){
    if(typeof window.pdAplicarNotificacionDescansosMenu!=="function")return false;
    if(window.pdAplicarNotificacionDescansosMenu.__mv594)return true;
    const base=window.pdAplicarNotificacionDescansosMenu;
    const nuevo=function(cantidad){
      const r=base.apply(this,arguments);
      const aviso=document.getElementById("pdAvisoPendientesDescansos");
      if(aviso)aviso.onclick=abrirPendientes;
      return r;
    };
    nuevo.__mv594=true;
    nuevo.__base=base;
    window.pdAplicarNotificacionDescansosMenu=nuevo;
    try{pdAplicarNotificacionDescansosMenu=nuevo;}catch(_){}
    return true;
  }

  function estadoPropuesto(x){
    if(typeof window.pdNormalizarEstado==="function"){
      return window.pdNormalizarEstado(x&&(
        x.estadoNuevo||x.solicitudCambio||x.estadoDia||"EN CAMPO"
      ));
    }
    return norm(x&&(x.estadoNuevo||x.solicitudCambio||x.estadoDia||"EN CAMPO"));
  }

  function existePendienteIgual(registro){
    const data=window.PD_DATA;
    const lista=data&&Array.isArray(data.programacion)?data.programacion:[];
    return lista.some(function(x){
      const estado=norm(x&&(x.estadoValidacion||x.estadoProgramacion));
      return norm(x&&x.cuadrilla)===norm(registro&&registro.cuadrilla) &&
        txt(x&&x.fecha)===txt(registro&&registro.fecha) &&
        ["PENDIENTE JEFATURA","PENDIENTE SUPERVISOR","OBSERVADO"].includes(estado) &&
        estadoPropuesto(x)===estadoPropuesto(registro);
    });
  }

  function filtrarCambiosDuplicados(){
    if(typeof window.pdUser!=="function")return {omitidos:0,total:0};
    const u=window.pdUser();
    if(norm(u.perfil)!=="SUPERVISOR")return {omitidos:0,total:0};
    const cambios=window.PD_CAMBIOS||{};
    const keys=Object.keys(cambios);
    let omitidos=0;
    keys.forEach(function(k){
      const i=k.lastIndexOf("|");
      if(i<0)return;
      const registro={cuadrilla:k.slice(0,i),fecha:k.slice(i+1),estadoDia:cambios[k]};
      if(existePendienteIgual(registro)){
        delete cambios[k];
        omitidos++;
      }
    });
    return {omitidos,total:keys.length};
  }

  function instalarGuardado(){
    if(typeof window.pdGuardarCambios!=="function")return false;
    if(window.pdGuardarCambios.__mv594)return true;
    const base=window.pdGuardarCambios;
    const nuevo=async function(){
      if(guardadoEnCurso)return;
      const btn=document.getElementById("pdBtnGuardarCambios");
      try{
        guardadoEnCurso=true;
        if(btn){btn.disabled=true;btn.dataset.mv594Texto=btn.textContent;btn.textContent="Guardando...";}
        const f=filtrarCambiosDuplicados();
        if(f.total>0 && f.omitidos===f.total){
          alert("Estos cambios ya están pendientes de validación de Jefatura. No se enviarán duplicados.");
          if(typeof window.pdActualizarBotonCambios==="function")window.pdActualizarBotonCambios();
          return;
        }
        if(f.omitidos>0){
          console.warn("V594: cambios de descanso duplicados omitidos",f.omitidos);
        }
        return await base.apply(this,arguments);
      }finally{
        guardadoEnCurso=false;
        if(btn){
          btn.disabled=false;
          if(typeof window.pdActualizarBotonCambios==="function")window.pdActualizarBotonCambios();
          else if(btn.dataset.mv594Texto)btn.textContent=btn.dataset.mv594Texto;
        }
      }
    };
    nuevo.__mv594=true;
    nuevo.__base=base;
    window.pdGuardarCambios=nuevo;
    try{pdGuardarCambios=nuevo;}catch(_){}
    return true;
  }

  function instalar(){
    let ok=false;
    if(typeof window.pdActualizarNotificacionesDescansosMenu==="function"){
      window.pdActualizarNotificacionesDescansosMenu=actualizarNotificaciones;
      try{pdActualizarNotificacionesDescansosMenu=actualizarNotificaciones;}catch(_){}
      ok=true;
    }
    instalarAviso();
    instalarGuardado();
    return ok;
  }

  window.mv594AbrirPendientesDescansos=abrirPendientes;

  if(!instalar()){
    const t=setInterval(function(){if(instalar())clearInterval(t);},300);
    setTimeout(function(){try{clearInterval(t);}catch(_){}},12000);
  }
})();