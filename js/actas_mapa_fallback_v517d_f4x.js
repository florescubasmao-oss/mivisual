/* ============================================================
   MI VISUAL V517D F4X.2 - ACTAS: RESPALDO WIN RECIENTE
   31/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Mantiene V455 + V396 como primera fuente de busqueda.
   - Solo actua cuando V455 no encuentra una orden FINALIZADA.
   - Usa buscarOrdenFinalizadaActaWinV517D, endpoint exclusivo de Actas.
   - NO usa permiso ni endpoint de Mapa Operativo.
   - El backend ya restringe Tecnico a su propia cuadrilla y cruza
     ACTAS_ESCANEADAS para conservar protecciones contra duplicados.
   - No cambia guardado, Drive, Produccion ni optimizaciones existentes.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4X2_ACTAS_WIN_OK) return;
  window.MV517D_F4X2_ACTAS_WIN_OK=true;

  const VERSION="V517D-F4X2-ACTAS-WIN-RECIENTE-20260831-1";
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

  function normalizarItem(x){
    return {
      codigoOrden:txt(x&&x.codigoOrden),
      codigoPedido:txt(x&&x.codigoPedido),
      dni:txt(x&&x.dni),
      cliente:txt(x&&x.cliente),
      fechaVisible:txt((x&&x.fechaVisible)||(x&&x.fecha)),
      tipoTrabajo:txt((x&&x.tipoTrabajo)||(x&&x.tipoPartida)),
      estadoControl:norm(x&&x.estadoControl)||"PENDIENTE_SUBIR",
      motivoObservacion:txt(x&&x.motivoObservacion),
      _mv517dOrigen:"ACTAS_WIN_F4X2"
    };
  }

  async function consultarWinActas(identificador){
    const base=api();
    if(!base) throw new Error("API de MI VISUAL no disponible");
    const u=new URL(base);
    u.searchParams.set("accion","buscarOrdenFinalizadaActaWinV517D");
    u.searchParams.set("usuario",usuario());
    u.searchParams.set("identificador",identificador);
    u.searchParams.set("_mv517df4x2",String(Date.now()));

    const r=await fetch(u.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",
      headers:{"Accept":"application/json"}
    });
    const raw=(await r.text()).trim();
    let data;
    try{data=JSON.parse(raw);}catch(_){throw new Error("Actas WIN no devolvio JSON valido");}
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
    const x=document.getElementById("mv517dF4x2SelectorWrap");
    if(x) x.remove();
  }

  function aplicar(item,identificador){
    const orden=document.getElementById("actaCodigoOrden");
    const pedido=document.getElementById("actaCodigoPedido");
    const estado=document.getElementById("mv455EstadoBusqueda");
    if(!orden||!pedido||!estado) return false;

    orden.value=txt(item.codigoOrden);
    pedido.value=txt(item.codigoPedido);
    window._mv455ActaResuelta={
      codigoOrden:txt(item.codigoOrden),
      codigoPedido:txt(item.codigoPedido),
      dni:txt(item.dni),
      cliente:txt(item.cliente),
      fecha:txt(item.fechaVisible),
      tipo:txt(item.tipoTrabajo),
      origen:"WIN_RECIENTE_F4X2"
    };

    limpiarSelector();
    const viejo=document.getElementById("mv455SelectorWrap");
    if(viejo) viejo.style.display="none";

    estado.className="mv455-estado ok";
    estado.innerHTML=`✅ Orden <b>${esc(item.codigoOrden)}</b> validada desde WIN · `+
      `${esc(item.cliente||"Cliente identificado")}`+
      `${item.fechaVisible?` · ${esc(item.fechaVisible)}`:""}`;
    estado.dataset.mv517dF4x2="1";

    const visible=document.getElementById("mv455Identificador");
    if(visible&&!visible.value) visible.value=identificador||item.codigoPedido;
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
    wrap.id="mv517dF4x2SelectorWrap";
    wrap.className="mv455-selector";
    wrap.innerHTML=`<label>Orden FINALIZADA encontrada en WIN</label>
      <select id="mv517dF4x2Selector">
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
    estado.innerHTML="La orden aún no está en el Control de Actas. Verificando la orden FINALIZADA reciente en WIN...";

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
      console.warn("F4X2 Actas WIN:",e);
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

  window.mv517dF4X2BuscarActaWin=intentar;
  console.log("MI VISUAL V517D F4X.2: respaldo exclusivo de Actas para orden WIN reciente activo.",VERSION);
})();
