/* ============================================================
   MI VISUAL V517D F4Z - ACTAS WIN RECIENTE INTEGRAL
   31/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - V455/V396 siguen siendo la primera fuente.
   - Solo actua cuando Control de Actas aun no tiene la orden FINALIZADA.
   - Usa buscarOrdenFinalizadaActaWinV517D.
   - La misma respuesta trae Orden + Código cliente + DNI + Cliente + Fecha
     + Tipo de ejecución + Tipo de partida.
   - Pinta los datos con pintarDatosAutomaticosActa(), función ORIGINAL.
   - Si los datos vinieran incompletos, recién allí usa la consulta original
     como fallback. En el caso normal F4Z no genera una segunda lectura.
   - No cambia guardado, Drive, Producción, Mi Desempeño ni permisos.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4Z_ACTAS_INTEGRAL_OK) return;
  window.MV517D_F4Z_ACTAS_INTEGRAL_OK=true;

  const VERSION="V517D-F4Z-ACTAS-INTEGRAL-20260831-1";
  let ultimoIntento="";
  let ultimoIntentoTs=0;
  let token=0;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function clave(v){return norm(v).replace(/[^A-Z0-9]/g,"");}
  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function esTecnico(){return norm(localStorage.getItem("perfil")||"")==="TECNICO";}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function api(){return window.MI_VISUAL_API_URL||"";}

  function normalizarAutomaticos(a,x){
    a=a||{};x=x||{};
    return {
      sede:txt(a.sede),
      cuadrilla:txt(a.cuadrilla),
      fechaGestion:txt(a.fechaGestion),
      tipoEjecucion:txt(a.tipoEjecucion),
      tipoPartida:txt(a.tipoPartida),
      dni:txt(a.dni||x.dni),
      cliente:txt(a.cliente||x.cliente),
      encontradoMapa:a.encontradoMapa===true,
      encontradoProduccion:a.encontradoProduccion===true,
      fuenteMapa:txt(a.fuenteMapa),
      fuentePartida:txt(a.fuentePartida)
    };
  }

  function normalizarItem(x){
    x=x||{};
    return {
      codigoOrden:txt(x.codigoOrden),
      codigoPedido:txt(x.codigoPedido),
      dni:txt(x.dni),
      cliente:txt(x.cliente),
      fechaVisible:txt(x.fechaVisible||x.fecha),
      tipoTrabajo:txt(x.tipoTrabajo||x.tipoPartida),
      estadoControl:norm(x.estadoControl)||"PENDIENTE_SUBIR",
      motivoObservacion:txt(x.motivoObservacion),
      automaticos:normalizarAutomaticos(x.automaticos,x),
      _mv517dOrigen:"ACTAS_WIN_F4Z"
    };
  }

  function automaticosCompletos(a){
    return !!(a&&a.sede&&a.cuadrilla&&a.fechaGestion&&
      a.tipoEjecucion&&a.tipoPartida&&a.dni&&a.cliente);
  }

  async function consultarWinActas(identificador){
    const base=api();
    if(!base) throw new Error("API de MI VISUAL no disponible");
    const u=new URL(base);
    u.searchParams.set("accion","buscarOrdenFinalizadaActaWinV517D");
    u.searchParams.set("usuario",usuario());
    u.searchParams.set("identificador",identificador);
    u.searchParams.set("_mv517df4z",String(Date.now()));

    const r=await fetch(u.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",
      headers:{"Accept":"application/json"}
    });
    const raw=(await r.text()).trim();
    let data;
    try{data=JSON.parse(raw);}catch(_){throw new Error("Actas WIN no devolvió JSON válido");}
    if(!data||data.ok!==true) throw new Error((data&&data.error)||"No se pudo consultar la orden reciente");
    return (Array.isArray(data.ordenes)?data.ordenes:[]).map(normalizarItem);
  }

  function habilitarGuardar(si){
    const b=document.querySelector("#formActa [data-guardar]");
    if(!b) return;
    b.disabled=!si;
    if(si) b.removeAttribute("aria-disabled");
    else b.setAttribute("aria-disabled","true");
  }

  function limpiarSelector(){
    const x=document.getElementById("mv517dF4zSelectorWrap");
    if(x) x.remove();
  }

  function pintarAutomaticos(item){
    const base=window._actaAutomaticosBase||{};
    const a=Object.assign({},base,item&&item.automaticos||{});
    if(!a.dni) a.dni=txt(item&&item.dni);
    if(!a.cliente) a.cliente=txt(item&&item.cliente);

    window._actaAutomaticosActuales=a;

    if(typeof window.pintarDatosAutomaticosActa==="function"){
      let mensaje="Datos encontrados en WIN/MAPA y Producción.";
      let clase="ok";
      if(!a.encontradoProduccion||!a.tipoPartida){
        mensaje="Orden encontrada en WIN/MAPA. La partida queda pendiente de actualización.";
        clase="warn";
      }
      window.pintarDatosAutomaticosActa(a,mensaje,clase);
    }

    const completos=automaticosCompletos(a);

    /* Fallback excepcional: solo si F4Z no recibió todo completo.
       No se ejecuta en el flujo normal aprobado. */
    if(!completos&&typeof window.consultarDatosAutomaticosFormularioActa==="function"){
      Promise.resolve(window.consultarDatosAutomaticosFormularioActa()).catch(function(){});
    }
    return completos;
  }

  function aplicar(item,identificador){
    const orden=document.getElementById("actaCodigoOrden");
    const pedido=document.getElementById("actaCodigoPedido");
    const estado=document.getElementById("mv455EstadoBusqueda");
    if(!orden||!pedido||!estado) return false;

    const codigoOrden=txt(item.codigoOrden);
    const codigoPedido=txt(item.codigoPedido);
    if(!codigoOrden||!codigoPedido) return false;

    orden.value=codigoOrden;
    pedido.value=codigoPedido;

    window._mv455ActaResuelta={
      codigoOrden:codigoOrden,
      codigoPedido:codigoPedido,
      dni:txt(item.dni),
      cliente:txt(item.cliente),
      fecha:txt(item.fechaVisible),
      tipo:txt(item.tipoTrabajo),
      origen:"WIN_RECIENTE_F4Z"
    };

    limpiarSelector();
    const viejo=document.getElementById("mv455SelectorWrap");
    if(viejo) viejo.style.display="none";

    estado.className="mv455-estado ok";
    estado.innerHTML=`✅ Orden <b>${esc(codigoOrden)}</b> validada desde WIN · `+
      `${esc(item.cliente||"Cliente identificado")}`+
      `${item.fechaVisible?` · ${esc(item.fechaVisible)}`:""}`;
    estado.dataset.mv517dF4z="1";

    const visible=document.getElementById("mv455Identificador");
    if(visible&&!visible.value) visible.value=identificador||codigoPedido;

    pintarAutomaticos(item);
    habilitarGuardar(true);
    return true;
  }

  function mensajeEstadoExistente(item){
    const e=norm(item&&item.estadoControl);
    if(e==="OBSERVADA") return "Esta acta ya está <b>OBSERVADA</b>. Corrígela desde el flujo vigente de Gestión de Actas.";
    if(e==="FALTANTE") return "Esta orden ya tiene una <b>ACTA FALTANTE</b>. Complétala desde la alerta correspondiente.";
    if(e==="CODIGOS_INVERTIDOS") return "La orden tiene una alerta de <b>códigos invertidos</b>. Corrígela desde Validar pendientes.";
    if(e==="SUBIDA") return "El acta de esta orden ya fue <b>SUBIDA / ESTÁ EN REVISIÓN</b>. No se generará un duplicado.";
    if(e==="FINALIZADA") return "El acta de esta orden ya está <b>FINALIZADA</b>. No es necesario volver a subirla.";
    return "La orden ya tiene un registro previo en Gestión de Actas.";
  }

  function mostrarSelector(items,identificador){
    limpiarSelector();
    const estado=document.getElementById("mv455EstadoBusqueda");
    if(!estado) return;
    estado.className="mv455-estado warn";
    estado.innerHTML="WIN encontró varias órdenes FINALIZADAS pendientes para ese dato. Selecciona la atención correcta.";

    const wrap=document.createElement("div");
    wrap.id="mv517dF4zSelectorWrap";
    wrap.className="mv455-selector";
    wrap.innerHTML=`<label>Orden FINALIZADA encontrada en WIN</label>
      <select id="mv517dF4zSelector">
        <option value="">Seleccione la orden correcta...</option>
        ${items.map(function(x,i){
          return `<option value="${i}">Orden ${esc(x.codigoOrden)} · ${esc(x.fechaVisible||"")} · ${esc(x.tipoTrabajo||"")}</option>`;
        }).join("")}
      </select>`;
    estado.insertAdjacentElement("afterend",wrap);
    wrap.querySelector("select").addEventListener("change",function(){
      const i=Number(this.value);
      if(!Number.isInteger(i)||!items[i]) return;
      aplicar(items[i],identificador);
    });
  }

  function esAvisoNoEncontrado(estado){
    const t=norm(estado&&estado.textContent);
    return t.includes("NO SE ENCONTRO TODAVIA UNA ORDEN FINALIZADA") ||
      t.includes("NO SE ENCONTRO EN CONTROL DE ACTAS") ||
      t.includes("WIN/MAPA NO PUDO VALIDARSE");
  }

  async function intentar(){
    if(!esTecnico()) return;
    const input=document.getElementById("mv455Identificador");
    const estado=document.getElementById("mv455EstadoBusqueda");
    if(!input||!estado||!esAvisoNoEncontrado(estado)) return;
    if(window._mv455ActaResuelta) return;

    const q=clave(input.value);
    if(q.length<6) return;
    const ahora=Date.now();
    if(q===ultimoIntento&&ahora-ultimoIntentoTs<12000) return;
    ultimoIntento=q;
    ultimoIntentoTs=ahora;
    const miToken=++token;

    estado.className="mv455-estado info";
    estado.innerHTML="La orden aún no está en el Control de Actas. Verificando la atención FINALIZADA reciente en WIN...";

    try{
      const items=await consultarWinActas(input.value);
      if(miToken!==token||clave(input.value)!==q) return;
      const pendientes=items.filter(function(x){return norm(x.estadoControl)==="PENDIENTE_SUBIR";});

      if(pendientes.length===1){aplicar(pendientes[0],input.value);return;}
      if(pendientes.length>1){mostrarSelector(pendientes,input.value);return;}
      if(items.length){
        estado.className="mv455-estado warn";
        estado.innerHTML=mensajeEstadoExistente(items[0]);
        habilitarGuardar(false);
        return;
      }

      estado.className="mv455-estado warn";
      estado.innerHTML="No se encontró una orden FINALIZADA pendiente con ese dato ni en Control de Actas ni en la consulta reciente de WIN. El Ingreso manual sigue disponible.";
    }catch(e){
      if(miToken!==token) return;
      estado.className="mv455-estado warn";
      estado.innerHTML="No se encontró en Control de Actas y la consulta reciente de WIN no pudo validarse en este momento. El Ingreso manual sigue disponible.";
      console.warn("F4Z Actas WIN:",e);
    }
  }

  function instalar(){
    const objetivo=document.getElementById("pantalla")||document.body;
    if(!objetivo||typeof MutationObserver!=="function") return;
    const obs=new MutationObserver(function(){setTimeout(intentar,20);});
    obs.observe(objetivo,{childList:true,subtree:true,characterData:true});

    document.addEventListener("input",function(ev){
      if(ev.target&&ev.target.id==="mv455Identificador"){
        token++;
        limpiarSelector();
      }
    },true);

    setTimeout(intentar,300);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",instalar,{once:true});
  else instalar();

  window.mv517dF4ZBuscarActaWin=intentar;
  console.log("MI VISUAL V517D F4Z: Actas reciente integral y desacoplada activa.",VERSION);
})();
