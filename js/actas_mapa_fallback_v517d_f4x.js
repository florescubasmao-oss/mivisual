/* ============================================================
   MI VISUAL V517D F4X - ACTAS: RESPALDO WIN/MAPA
   31/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Mantiene V455 + V396 como primera fuente de busqueda.
   - Solo actua cuando V455 indica que no encontro una orden FINALIZADA.
   - Consulta MAPA_ORDENES mediante listarMapaOperativo, ya existente.
   - Exige misma cuadrilla + estado FINALIZADA + coincidencia exacta por
     Codigo Cliente, DNI u Orden.
   - Si hay una sola finalizada, completa Orden + Codigo Cliente.
   - Si hay varias, obliga a seleccionar; nunca adivina.
   - No cambia guardado, Drive, permisos, validaciones V396 ni backend.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4X_ACTAS_MAPA_OK) return;
  window.MV517D_F4X_ACTAS_MAPA_OK=true;

  const VERSION="V517D-F4X-ACTAS-MAPA-20260831-1";
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
  function cuadrilla(){return txt(localStorage.getItem("cuadrilla")||"");}
  function api(){return window.MI_VISUAL_API_URL||"";}

  function fechaVisible(v){
    const s=txt(v);
    let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if(m) return `${String(Number(m[1])).padStart(2,"0")}/${String(Number(m[2])).padStart(2,"0")}/${m[3]}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m) return `${String(Number(m[3])).padStart(2,"0")}/${String(Number(m[2])).padStart(2,"0")}/${m[1]}`;
    return s;
  }

  function fechaOrden(x){
    return fechaVisible(
      x?.fechaFinVisita||x?.fechaInicioVisita||x?.fechaUltimoEstado||x?.fechaSolicitud||""
    );
  }

  function esFinalizada(x){return norm(x?.estado).includes("FINALIZ");}

  async function consultarMapa(identificador){
    const base=api();
    if(!base) throw new Error("API de MI VISUAL no disponible");
    const u=new URL(base);
    u.searchParams.set("accion","listarMapaOperativo");
    u.searchParams.set("usuario",usuario());
    u.searchParams.set("cuadrilla",cuadrilla());
    u.searchParams.set("_mv517df4x",String(Date.now()));

    const r=await fetch(u.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",
      headers:{"Accept":"application/json"}
    });
    const raw=(await r.text()).trim();
    let data;
    try{data=JSON.parse(raw);}catch(_){throw new Error("MAPA no devolvio JSON valido");}
    if(!data?.ok) throw new Error(data?.error||"No se pudo consultar MAPA_ORDENES");

    const q=clave(identificador);
    const cuad=norm(cuadrilla());
    const vistos=new Set();
    const salida=[];

    (Array.isArray(data.ordenes)?data.ordenes:[]).forEach(function(x){
      if(!esFinalizada(x)) return;
      if(cuad && norm(x?.cuadrilla)!==cuad) return;
      const coincide=[x?.codigoCliente,x?.numeroDocumento,x?.ordenId]
        .some(function(v){return clave(v)===q;});
      if(!coincide) return;

      const codigoOrden=txt(x?.ordenId);
      const codigoPedido=txt(x?.codigoCliente);
      if(!codigoOrden||!codigoPedido) return;
      const k=codigoOrden+"|"+codigoPedido;
      if(vistos.has(k)) return;
      vistos.add(k);

      salida.push({
        codigoOrden:codigoOrden,
        codigoPedido:codigoPedido,
        dni:txt(x?.numeroDocumento),
        cliente:txt(x?.cliente),
        fechaVisible:fechaOrden(x),
        tipoTrabajo:txt(x?.tipoTrabajo||x?.tipo||x?.productoServicio),
        estadoControl:"PENDIENTE_SUBIR",
        _mv517dOrigen:"MAPA_ORDENES"
      });
    });

    salida.sort(function(a,b){
      const fa=a.fechaVisible.split("/").reverse().join("");
      const fb=b.fechaVisible.split("/").reverse().join("");
      return fb.localeCompare(fa)||b.codigoOrden.localeCompare(a.codigoOrden);
    });
    return salida;
  }

  function habilitarGuardar(){
    const b=document.querySelector("#formActa [data-guardar]");
    if(!b) return;
    b.disabled=false;
    b.removeAttribute("aria-disabled");
  }

  function limpiarSelector(){
    document.getElementById("mv517dF4xSelectorWrap")?.remove();
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
      origen:"MAPA_ORDENES_F4X"
    };

    limpiarSelector();
    const viejo=document.getElementById("mv455SelectorWrap");
    if(viejo) viejo.style.display="none";

    estado.className="mv455-estado ok";
    estado.innerHTML=`✅ Orden <b>${esc(item.codigoOrden)}</b> validada desde WIN/MAPA · `+
      `${esc(item.cliente||"Cliente identificado")}`+
      `${item.fechaVisible?` · ${esc(item.fechaVisible)}`:""}`;
    estado.dataset.mv517dF4x="1";

    const visible=document.getElementById("mv455Identificador");
    if(visible&&!visible.value) visible.value=identificador||item.codigoPedido;

    habilitarGuardar();
    return true;
  }

  function mostrarSelector(items,identificador){
    limpiarSelector();
    const estado=document.getElementById("mv455EstadoBusqueda");
    if(!estado) return;
    estado.className="mv455-estado warn";
    estado.innerHTML="WIN/MAPA encontró varias órdenes FINALIZADAS para ese dato. Selecciona la atención correcta.";

    const wrap=document.createElement("div");
    wrap.id="mv517dF4xSelectorWrap";
    wrap.className="mv455-selector";
    wrap.innerHTML=`<label>Orden FINALIZADA encontrada en WIN/MAPA</label>
      <select id="mv517dF4xSelector">
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
    const t=norm(estado?.textContent||"");
    return t.includes("NO SE ENCONTRO TODAVIA UNA ORDEN FINALIZADA");
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
    if(q===ultimoIntento&&ahora-ultimoIntentoTs<15000) return;
    ultimoIntento=q;
    ultimoIntentoTs=ahora;
    const miToken=++token;

    estado.className="mv455-estado info";
    estado.innerHTML="La orden aún no está en el Control de Actas. Verificando directamente en WIN/MAPA...";

    try{
      const items=await consultarMapa(input.value);
      if(miToken!==token||clave(input.value)!==q) return;
      if(items.length===1){
        aplicar(items[0],input.value);
        return;
      }
      if(items.length>1){
        mostrarSelector(items,input.value);
        return;
      }
      estado.className="mv455-estado warn";
      estado.innerHTML="No se encontró todavía una orden FINALIZADA con ese dato ni en Control de Actas ni en WIN/MAPA. Puedes usar Ingreso manual.";
    }catch(e){
      if(miToken!==token) return;
      estado.className="mv455-estado warn";
      estado.innerHTML="No se encontró en Control de Actas y WIN/MAPA no pudo validarse en este momento. El Ingreso manual sigue disponible.";
      console.warn("F4X Actas MAPA:",e);
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

  window.mv517dF4XBuscarActaEnMapa=intentar;
  console.log("MI VISUAL V517D F4X: respaldo WIN/MAPA para busqueda rapida de Actas activo.",VERSION);
})();
