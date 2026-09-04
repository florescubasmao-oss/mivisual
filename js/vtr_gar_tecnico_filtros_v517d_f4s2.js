/* ============================================================
   MI VISUAL V522B - TECNICO INTEGRADO ESTABLE
   02/09/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Conserva filtros: Todos / Recableado / GAR / VTR / Otro.
   - Conserva el alcance por usuario/cuadrilla de F4S.
   - En la vista integrada RECABLEADOS GAR-VTR mantiene disponibles
     AT-, VTEXT-, GAR-, VTR- y NO APLICA para el registro del Tecnico.
   - Respeta los tres estados V430: VALIDADO, MANUAL y MANUAL_TICKET.
   - Si una capa anterior intenta volver a restringir el formulario a
     RECABLEADO, esta estabilizacion recupera el estado visible de V430.
   - No toca backend, permisos, Sheets, Produccion, Ranking ni otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4S2_FILTROS_TECNICO_OK) return;
  window.MV517D_F4S2_FILTROS_TECNICO_OK=true;

  const TIPOS_TICKET=["AT-","VTEXT-","GAR-","VTR-","NO APLICA"];

  function norm(v){
    return String(v==null?"":v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esTecnico(){
    return norm(localStorage.getItem("perfil")||"")==="TECNICO";
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

    // F4S integra Recableado + GAR + VTR para el Tecnico. V488 conserva
    // rutas separadas para otros perfiles, por eso aqui se corrige solo
    // la vista del Tecnico y no se modifica la regla general del portal.
    Array.from(select.options||[]).forEach(function(op){
      if(TIPOS_TICKET.includes(String(op.value||""))){
        op.hidden=false;
        op.disabled=false;
      }
    });

    const resultado=document.getElementById("vt430Resultados");
    const estadoVisible=norm(resultado && resultado.textContent || "");
    const numero=document.getElementById("vtNumeroTicket");
    const codigo=document.getElementById("vtCodigo");
    const dni=document.getElementById("vtDniCliente");

    // MANUAL: todos los campos originales del registro quedan editables.
    if(estadoVisible.indexOf("INGRESO MANUAL HABILITADO")>=0){
      desbloquearSelect(select);
      desbloquearInput(numero);
      desbloquearInput(codigo);
      desbloquearInput(dni);
      return;
    }

    // MANUAL_TICKET: identidad validada; solo Tipo/Nro. ticket se editan.
    if(estadoVisible.indexOf("CLIENTE Y CODIGO VALIDADOS")>=0){
      desbloquearSelect(select);
      desbloquearInput(numero);
      bloquearInput(codigo);
      bloquearInput(dni);
      return;
    }

    // VALIDADO: si V488 intento devolver el selector a AT-, recupera el
    // prefijo realmente elegido por V430 y mantiene los datos bloqueados.
    if(estadoVisible.indexOf("ATENCION VALIDADA POR MI VISUAL")>=0){
      const match=estadoVisible.match(/\b(VTEXT|GAR|VTR|AT)-/);
      if(match){
        const valor=match[1]+"-";
        if(TIPOS_TICKET.includes(valor) && select.value!==valor){
          select.value=valor;
          if(typeof window.actualizarTipoValidacionPorTicket==="function"){
            try{ window.actualizarTipoValidacionPorTicket(); }catch(_){}
          }
        }
      }
      bloquearSelect(select);
      bloquearInput(numero);
      bloquearInput(codigo);
      bloquearInput(dni);
    }
  }

  function fijar(){
    if(!esTecnico()) return;
    const hist=document.getElementById("vtHistorial");
    const tipo=document.getElementById("vtFiltroTipo");
    const sede=document.getElementById("vtFiltroSede");

    if(sede) sede.remove();

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

    if(hist && hist.dataset.mv517dF4s!=="1" && typeof window.renderHistorialValidacionLocal==="function"){
      try{ window.renderHistorialValidacionLocal(); }catch(_){}
    }
  }

  let timer=null;
  function programar(){
    clearTimeout(timer);
    timer=setTimeout(fijar,20);
  }

  if(document.body){
    const obs=new MutationObserver(function(){ if(esTecnico()) programar(); });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){ if(esTecnico()) setTimeout(fijar,40); },true);
  document.addEventListener("change",function(ev){
    if(!esTecnico()) return;
    if(ev.target && ev.target.id==="vtTipoTicket") setTimeout(fijarFormularioTecnico,0);
  },true);

  [0,100,300,700,1400,2500].forEach(function(ms){setTimeout(fijar,ms);});
  setInterval(fijar,1500);

  console.log("MI VISUAL V522B: filtros y formulario integrado del Tecnico estabilizados.");
})();