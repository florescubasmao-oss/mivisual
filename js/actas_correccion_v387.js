/* ============================================================
   MI VISUAL V387 - Actas observadas: corregir códigos + PDF
   - Identifica la fila original por ID interno.
   - Código de Orden editable.
   - Código de Pedido editable.
   - Número de Acta editable.
   - Reemplazo obligatorio del PDF.
   - Código de Pedido continúa admitiendo repetidos.
   - Código de Orden y Número de Acta continúan siendo únicos.
============================================================ */
(function(){
  "use strict";

  if(window.MV387_ACTAS_CORRECCION_OK) return;

  const abrirBase = window.mostrarFormularioActa;
  const guardarBase = window.guardarActa;

  function esc(v){
    if(typeof limpiarHtmlActas==="function") return limpiarHtmlActas(v||"");
    return String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function norm(v){
    return typeof normalizarActas==="function"
      ? normalizarActas(v||"")
      : String(v||"").toUpperCase().trim();
  }

  function exactaPorId(lista,id){
    const clave=String(id||"").trim();
    return (lista||[]).find(a=>String(a?.id||"").trim()===clave)||null;
  }

  function prepararFormularioExacto(acta,modo){
    const form=document.getElementById("formActa");
    if(!form || !acta) return;

    form.dataset.actaIdOriginal=String(acta.id||"");
    form.dataset.codigoOrdenOriginal=String(acta.codigoOrden||"");
    form.dataset.codigoPedidoOriginal=String(acta.codigoPedido||"");
    form.dataset.numeroActaOriginal=String(acta.numeroActa||"");
    form.dataset.modoCorreccion=modo||"OBSERVADA";

    const orden=document.getElementById("actaCodigoOrden");
    const pedido=document.getElementById("actaCodigoPedido");
    const numero=document.getElementById("actaNumeroActa");

    if(orden){
      orden.value=String(acta.codigoOrden||"");
      orden.readOnly=false;
      orden.removeAttribute("readonly");
    }
    if(pedido){
      pedido.value=String(acta.codigoPedido||"");
      pedido.readOnly=false;
      pedido.removeAttribute("readonly");
    }
    if(numero){
      numero.value=String(acta.numeroActa||"");
      numero.readOnly=false;
      numero.removeAttribute("readonly");
    }

    // La base automática debe corresponder exactamente al acta seleccionada,
    // incluso cuando un Código de Pedido se repita para el mismo cliente.
    const u=typeof usuarioActualActas==="function"
      ? usuarioActualActas()
      : {sede:"",cuadrilla:""};

    window._actaAutomaticosBase={
      sede:acta.sede||u.sede||"",
      cuadrilla:acta.cuadrilla||u.cuadrilla||"",
      fechaGestion:acta.fechaGestion||"",
      tipoEjecucion:acta.tipoEjecucion||"",
      tipoPartida:acta.tipoPartida||"",
      dni:acta.dni||"",
      cliente:acta.cliente||"",
      codigoPedidoOriginal:String(acta.codigoPedido||""),
      codigoOrdenOriginal:String(acta.codigoOrden||"")
    };
    window._actaAutomaticosActuales=Object.assign({},window._actaAutomaticosBase);

    const cabecera=document.querySelector(".actas-head h2");
    if(cabecera){
      cabecera.textContent = modo==="FALTANTE"
        ? "📄 Completar Acta Faltante"
        : "📄 Corregir Acta Observada";
    }

    const guardar=form.querySelector("[data-guardar]");
    if(guardar){
      guardar.textContent = modo==="FALTANTE"
        ? "Completar acta"
        : "Corregir códigos y reemplazar acta";
    }

    // Nota clara para el Técnico.
    if(!document.getElementById("mv387NotaCorreccionActa")){
      const nota=document.createElement("div");
      nota.id="mv387NotaCorreccionActa";
      nota.className="actas-msg";
      nota.style.cssText="margin:8px 0 12px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;border-radius:11px;padding:9px 10px;font-weight:800;font-size:12px;line-height:1.35";
      nota.innerHTML = modo==="FALTANTE"
        ? "Puede corregir los códigos antes de completar el acta. Debe adjuntar el PDF."
        : "Puede corregir <b>Código de Orden</b>, <b>Código de Pedido</b> y <b>Número de Acta</b>. Luego debe volver a adjuntar el PDF corregido.";
      const grid=form.querySelector(".actas-grid");
      if(grid) grid.parentElement.insertBefore(nota,grid);
    }
  }

  async function abrirCorreccion(id,modo){
    const u=typeof usuarioActualActas==="function"
      ? usuarioActualActas()
      : {usuario:localStorage.getItem("usuario")||""};

    try{
      const data=await apiActas({
        accion:"listarActasEscaneadas",
        usuario:u.usuario,
        __forzar:true
      });

      const acta=exactaPorId(data.actas||[],id);
      if(!acta) throw new Error("No se encontró el acta seleccionada. Actualice la vista.");

      // Se usa el formulario existente para no duplicar diseño ni lógica.
      await abrirBase(acta.codigoPedido||"");
      prepararFormularioExacto(acta,modo);

    }catch(error){
      if(typeof mostrarPantalla==="function" && typeof estiloActas==="function"){
        mostrarPantalla(
          `${estiloActas()}<div class="actas-wrap"><div class="actas-msg err">❌ ${esc(error.message)}</div></div>`
        );
      }else{
        alert(error.message);
      }
    }
  }

  function botonesV387(a){
    const u=usuarioActualActas();
    let html=`${botonDetalleActa(a)} ${botonPdfActa(a)}`;

    if(u.perfil==="TECNICO" && esActaFaltantePendiente(a)){
      html += ` <button class="actas-btn orange" onclick="mv387AbrirCorreccionActa('${esc(a.id||"")}','FALTANTE')">Completar acta faltante</button>`;
    }else if(u.perfil==="TECNICO" && estaObservadaActa(a) && !estaFinalizadaActa(a)){
      html += ` <button class="actas-btn danger" onclick="mv387AbrirCorreccionActa('${esc(a.id||"")}','OBSERVADA')">Corregir acta</button>`;
    }
    return html;
  }

  async function guardarV387(btn){
    const form=document.getElementById("formActa");
    const idOriginal=form?.dataset?.actaIdOriginal||"";

    // Alta normal: conserva exactamente la función existente.
    if(!idOriginal){
      return await guardarBase.apply(this,arguments);
    }

    const u=usuarioActualActas();
    const msg=document.getElementById("actaMsg");
    const textoBtn=form?.dataset?.modoCorreccion==="FALTANTE"
      ? "Completar acta"
      : "Corregir códigos y reemplazar acta";

    try{
      if(btn){
        btn.disabled=true;
        btn.textContent="Guardando corrección...";
      }

      const archivo=document.getElementById("actaPdf")?.files?.[0];
      const pdf=await leerPdfActa(archivo);

      const payload={
        accion:"registrarActaEscaneada",
        usuario:u.usuario,

        // ID estable de la fila que debe ser reemplazada.
        idActaOriginal:idOriginal,

        // Valores originales únicamente para trazabilidad/diagnóstico.
        codigoOrdenOriginal:form.dataset.codigoOrdenOriginal||"",
        codigoPedidoOriginal:form.dataset.codigoPedidoOriginal||"",
        numeroActaOriginal:form.dataset.numeroActaOriginal||"",

        // Valores corregidos por el Técnico.
        codigoOrden:document.getElementById("actaCodigoOrden").value,
        codigoPedido:document.getElementById("actaCodigoPedido").value,
        numeroActa:document.getElementById("actaNumeroActa").value,

        archivoBase64:pdf.base64,
        archivoNombre:pdf.nombre,
        archivoMimeType:pdf.mime
      };

      const data=await apiActas(payload);

      const pendientes=(data.datosAutomaticos?.pendientes||[]).filter(Boolean);
      const nota=pendientes.length
        ? `<br><small>Datos pendientes de actualización automática: ${esc(pendientes.join(", "))}.</small>`
        : "";

      const notaFecha=norm(data.estadoFechaCarpeta)==="PENDIENTE_MAPA"
        ? `<br><small>Fecha: PENDIENTE. El sistema buscará la fecha real en Mapa Operativo durante 24 horas.</small>`
        : `<br><small>Fecha de atención: ${fechaVisibleActas(data.fechaCarpeta||data.datosAutomaticos?.fechaGestion||"")}</small>`;

      if(msg){
        msg.innerHTML=
          `<div class="actas-msg ok">`+
          `✅ Acta corregida y reemplazada correctamente.`+
          `<br>Código de orden: ${esc(data.codigoOrden)}`+
          `<br>Código de pedido: ${esc(data.codigoPedido)}`+
          `<br>Número de acta: ${esc(data.numeroActa)}`+
          `<br>Archivo: ${esc(data.nombreArchivo)}`+
          `<br>Estado: PENDIENTE`+
          `<br>Versión: ${data.version||1}`+
          `${notaFecha}${nota}</div>`;
      }

      setTimeout(mostrarGestionActas,1300);

    }catch(error){
      if(msg){
        msg.innerHTML=`<div class="actas-msg err">❌ ${esc(error.message)}</div>`;
      }
    }finally{
      if(btn){
        btn.disabled=false;
        btn.textContent=textoBtn;
      }
    }
  }

  window.mv387AbrirCorreccionActa=abrirCorreccion;
  window.botonesLecturaActa=botonesV387;
  window.guardarActa=guardarV387;

  try{botonesLecturaActa=botonesV387;}catch(_){}
  try{guardarActa=guardarV387;}catch(_){}

  window.MV387_ACTAS_CORRECCION_OK=true;
  console.log("MI VISUAL V387: corrección integral de actas observadas habilitada.");
})();