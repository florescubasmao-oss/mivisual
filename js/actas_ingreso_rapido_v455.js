/* ============================================================
   MI VISUAL V455 - INGRESO RÁPIDO DE ACTAS DEL TÉCNICO

   Alcance estricto:
   - Solo transforma "Subir Acta Escaneada" (acta nueva) del Técnico.
   - El Técnico ingresa Código cliente o DNI + Número de acta + PDF.
   - Código de Orden y Código cliente se resuelven desde el control V396.
   - Si hay varias órdenes del mismo DNI, obliga a seleccionar la correcta.
   - Si no se puede resolver, permite volver al ingreso manual vigente.
   - Reemplazo de acta observada / acta faltante NO se modifica.
   - El guardado, Drive, nombre del PDF, validaciones, estados y permisos
     continúan usando exactamente las funciones vigentes.
   - Prepara el PDF en memoria al seleccionarlo para reducir espera al Guardar.
============================================================ */
(function(){
  "use strict";

  if(window.MV455_ACTAS_INGRESO_RAPIDO_OK) return;
  window.MV455_ACTAS_INGRESO_RAPIDO_OK = true;

  const CACHE_MS = 2 * 60 * 1000;
  const cachePeriodos = new Map();
  const cachePdf = new WeakMap();
  let temporizadorInstalacion = null;

  function norm(v){
    return (v == null ? "" : String(v))
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clave(v){
    return norm(v).replace(/[^A-Z0-9]/g, "");
  }

  function esc(v){
    if(typeof window.limpiarHtmlActas === "function") return window.limpiarHtmlActas(v || "");
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function periodoActual(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function periodoAnterior(periodo){
    const m = String(periodo || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return "";
    const d = new Date(Number(m[1]), Number(m[2]) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function css(){
    if(document.getElementById("mv455ActasRapidasCss")) return;
    const s = document.createElement("style");
    s.id = "mv455ActasRapidasCss";
    s.textContent = `
      .mv455-busqueda{
        grid-column:1/-1;
        background:#eff6ff;
        border:1px solid #93c5fd;
        border-radius:14px;
        padding:12px;
        color:#0f172a;
      }
      .mv455-busqueda label{
        display:block;
        color:#0f172a!important;
        text-shadow:none!important;
        font-size:13px;
        font-weight:900;
        margin-bottom:6px;
      }
      .mv455-busqueda input,.mv455-busqueda select{
        width:100%;box-sizing:border-box;
        border:1px solid #93c5fd;border-radius:11px;
        padding:11px 12px;background:#fff;color:#111827;
        font-size:15px;font-weight:850;
      }
      .mv455-ayuda{font-size:10px;color:#475569;font-weight:750;margin-top:5px;line-height:1.35}
      .mv455-estado{margin-top:8px;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:850;line-height:1.4}
      .mv455-estado.info{background:#dbeafe;color:#1e3a8a}
      .mv455-estado.ok{background:#dcfce7;color:#166534}
      .mv455-estado.warn{background:#fef3c7;color:#92400e}
      .mv455-estado.err{background:#fee2e2;color:#991b1b}
      .mv455-selector{margin-top:8px}
      .mv455-selector label{font-size:11px!important;margin-bottom:4px!important}
      .mv455-manual{margin-top:8px;border:0;border-radius:9px;padding:7px 9px;background:#e2e8f0;color:#334155;font-weight:850;font-size:10px;cursor:pointer}
      .mv455-pdf-estado{margin-top:5px;font-size:10px;font-weight:800;color:#475569}
      .mv455-pdf-estado.ok{color:#166534}
      .mv455-pdf-estado.warn{color:#92400e}
      .mv455-resuelto{margin-top:6px;font-size:10px;color:#166534;font-weight:850}
      @media(max-width:480px){.mv455-busqueda{padding:10px}.mv455-busqueda input{font-size:16px}}
    `;
    document.head.appendChild(s);
  }

  function botonGuardar(){
    return document.querySelector("#formActa [data-guardar]");
  }

  function habilitarGuardar(si){
    const b = botonGuardar();
    if(!b) return;
    b.disabled = !si;
    if(!si) b.setAttribute("aria-disabled","true");
    else b.removeAttribute("aria-disabled");
  }

  function ponerEstado(texto, clase){
    const e = document.getElementById("mv455EstadoBusqueda");
    if(!e) return;
    e.className = `mv455-estado ${clase || "info"}`;
    e.innerHTML = texto;
  }

  function ocultarSelector(){
    const w = document.getElementById("mv455SelectorWrap");
    if(w) w.style.display = "none";
  }

  function mostrarSelector(items){
    const wrap = document.getElementById("mv455SelectorWrap");
    const sel = document.getElementById("mv455SelectorOrden");
    if(!wrap || !sel) return;
    const unicos = [];
    const vistos = new Set();
    (items || []).forEach(x => {
      const k = clave(x.codigoOrden) + "|" + clave(x.codigoPedido);
      if(!k || vistos.has(k)) return;
      vistos.add(k);
      unicos.push(x);
    });
    window._mv455OpcionesOrden = unicos;
    sel.innerHTML = `<option value="">Seleccione la orden correcta...</option>` + unicos.map((x,i) => {
      const tipo = x.tipoTrabajo || x.tipoPartida || "";
      const fecha = x.fechaVisible || x.fecha || "";
      return `<option value="${i}">Orden ${esc(x.codigoOrden || "-")} · ${esc(fecha)} · ${esc(tipo)}</option>`;
    }).join("");
    wrap.style.display = "block";
  }

  function estadoBloqueado(matches){
    if(!matches || !matches.length) return "";
    const estados = matches.map(x => norm(x.estadoControl));
    if(estados.includes("OBSERVADA")) return "OBSERVADA";
    if(estados.includes("FALTANTE")) return "FALTANTE";
    if(estados.includes("CODIGOS_INVERTIDOS")) return "CODIGOS_INVERTIDOS";
    if(estados.includes("SUBIDA")) return "SUBIDA";
    if(estados.includes("FINALIZADA")) return "FINALIZADA";
    return estados[0] || "";
  }

  function mensajeEstadoExistente(estado){
    switch(estado){
      case "OBSERVADA":
        return "Esta acta ya está <b>OBSERVADA</b>. Para corregirla usa <b>Reemplazar PDF</b> desde Gestión de Actas; ese flujo se mantiene sin cambios.";
      case "FALTANTE":
        return "Esta orden ya tiene una <b>ACTA FALTANTE</b> registrada por Almacén. Complétala desde la alerta correspondiente en Gestión de Actas.";
      case "CODIGOS_INVERTIDOS":
        return "La orden tiene una alerta de <b>códigos invertidos</b>. Corrígela desde <b>Validar pendientes</b> antes de continuar.";
      case "SUBIDA":
        return "El acta de esta orden ya fue <b>SUBIDA / ESTÁ EN REVISIÓN</b>. No se generará un duplicado.";
      case "FINALIZADA":
        return "El acta de esta orden ya está <b>FINALIZADA</b>. No es necesario volver a subirla.";
      default:
        return "La orden ya tiene un registro previo en Gestión de Actas.";
    }
  }

  async function cargarPeriodo(periodo){
    if(!periodo) return {ordenes:[]};
    const ahora = Date.now();
    const guardado = cachePeriodos.get(periodo);
    if(guardado && ahora - guardado.fecha < CACHE_MS) return guardado.data;

    if(window._mv396ControlActasData && window._mv396ControlActasData.periodo === periodo){
      const data = window._mv396ControlActasData;
      cachePeriodos.set(periodo,{fecha:ahora,data});
      return data;
    }

    if(typeof window.apiActas !== "function" || typeof window.usuarioActualActas !== "function"){
      throw new Error("Gestión de Actas aún no está lista");
    }

    const u = window.usuarioActualActas();
    const data = await window.apiActas({
      accion:"listarControlActasFinalizadasV396",
      usuario:u.usuario,
      periodo:periodo
    });
    cachePeriodos.set(periodo,{fecha:Date.now(),data:data || {ordenes:[]}});
    return data || {ordenes:[]};
  }

  function buscarEnDatos(data, identificador){
    const q = clave(identificador);
    if(!q) return [];
    return (data && Array.isArray(data.ordenes) ? data.ordenes : []).filter(x => {
      return [x.codigoPedido, x.dni, x.codigoOrden].some(v => clave(v) === q);
    });
  }

  async function resolverBusqueda(identificador){
    const q = clave(identificador);
    if(q.length < 6){
      window._mv455ActaResuelta = null;
      ocultarSelector();
      habilitarGuardar(false);
      ponerEstado("Ingresa el <b>código cliente</b> o el <b>DNI</b> para identificar la orden.","info");
      return;
    }

    ponerEstado("Buscando la orden de tu cuadrilla...","info");
    ocultarSelector();
    habilitarGuardar(false);

    try{
      const actual = periodoActual();
      const anterior = periodoAnterior(actual);
      const resultados = await Promise.all([
        cargarPeriodo(actual),
        anterior ? cargarPeriodo(anterior) : Promise.resolve({ordenes:[]})
      ]);
      let matches = buscarEnDatos(resultados[0], q).concat(buscarEnDatos(resultados[1], q));

      // Un código cliente o DNI puede tener más de una atención histórica.
      // Nunca se adivina: se quitan duplicados exactos y, si quedan varias
      // órdenes pendientes, el técnico debe seleccionar la correcta.
      const vistos = new Set();
      matches = matches.filter(x => {
        const k = [clave(x.codigoOrden),clave(x.codigoPedido),String(x.fechaVisible||x.fecha||"")].join("|");
        if(vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });

      const pendientes = matches.filter(x => norm(x.estadoControl) === "PENDIENTE_SUBIR");

      if(pendientes.length === 1){
        aplicarOrdenResuelta(pendientes[0], identificador, "BUSQUEDA");
        return;
      }

      if(pendientes.length > 1){
        window._mv455ActaResuelta = null;
        habilitarGuardar(false);
        mostrarSelector(pendientes);
        ponerEstado("Se encontraron varias órdenes para ese DNI/código. Selecciona la atención correcta antes de guardar.","warn");
        return;
      }

      if(matches.length){
        window._mv455ActaResuelta = null;
        const estado = estadoBloqueado(matches);
        ponerEstado(mensajeEstadoExistente(estado),"warn");
        habilitarGuardar(false);
        return;
      }

      window._mv455ActaResuelta = null;
      ponerEstado(
        `No se encontró todavía una orden FINALIZADA con ese dato. `+
        `Puedes esperar a que la base se actualice o usar <b>Ingreso manual</b> sin perder el flujo anterior.`,
        "warn"
      );
      habilitarGuardar(false);
    }catch(error){
      window._mv455ActaResuelta = null;
      ponerEstado(
        `No se pudo validar automáticamente ahora. `+
        `El flujo anterior sigue disponible mediante <b>Ingreso manual</b>.`,
        "err"
      );
      habilitarGuardar(false);
    }
  }

  function precalentarValidacionCodigos(codigoOrden,codigoPedido){
    try{
      if(typeof window.apiActas !== "function" || typeof window.usuarioActualActas !== "function") return;
      const u = window.usuarioActualActas();
      Promise.resolve(window.apiActas({
        accion:"validarCodigosActaV396",
        usuario:u.usuario,
        codigoOrden:codigoOrden,
        codigoPedido:codigoPedido
      })).catch(function(){});
    }catch(_){}
  }

  function aplicarOrdenResuelta(item, identificador, origen){
    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    if(!orden || !pedido) return;

    const codigoOrden = String(item && item.codigoOrden || "").trim();
    const codigoPedido = String(item && item.codigoPedido || "").trim();
    if(!codigoOrden || !codigoPedido){
      ponerEstado("La referencia encontrada no tiene ambos códigos completos. Usa Ingreso manual para conservar el flujo anterior.","warn");
      habilitarGuardar(false);
      return;
    }

    orden.value = codigoOrden;
    pedido.value = codigoPedido;
    window._mv455ActaResuelta = {
      codigoOrden,
      codigoPedido,
      dni:String(item.dni || ""),
      cliente:String(item.cliente || ""),
      fecha:String(item.fechaVisible || item.fecha || ""),
      tipo:String(item.tipoTrabajo || item.tipoPartida || ""),
      origen:origen || "BUSQUEDA"
    };

    const visible = document.getElementById("mv455Identificador");
    if(visible && !visible.value) visible.value = identificador || codigoPedido;

    ocultarSelector();
    ponerEstado(
      `✅ Orden <b>${esc(codigoOrden)}</b> validada · ${esc(item.cliente || "Cliente identificado")}`+
      `${item.fechaVisible ? ` · ${esc(item.fechaVisible)}` : ""}`,
      "ok"
    );
    habilitarGuardar(true);

    // Deja en caché la misma validación que V396 volverá a pedir al Guardar.
    // No elimina ninguna barrera: solo evita esperar por una lectura repetida.
    precalentarValidacionCodigos(codigoOrden,codigoPedido);

    // Completa los datos informativos sin bloquear al técnico.
    try{
      if(typeof window.consultarDatosAutomaticosFormularioActa === "function"){
        Promise.resolve(window.consultarDatosAutomaticosFormularioActa()).catch(function(){});
      }
    }catch(_){}
  }

  function seleccionarOrden(){
    const sel = document.getElementById("mv455SelectorOrden");
    const idx = Number(sel && sel.value);
    if(!sel || sel.value === "" || !Number.isInteger(idx)){
      habilitarGuardar(false);
      return;
    }
    const item = (window._mv455OpcionesOrden || [])[idx];
    if(!item) return;
    aplicarOrdenResuelta(item, document.getElementById("mv455Identificador")?.value || "", "SELECCION");
  }

  function restaurarEvento(input, nombre){
    if(!input) return;
    const guardado = input.dataset[`mv455${nombre}`];
    if(guardado) input.setAttribute(nombre.toLowerCase(), guardado);
  }

  function guardarYQuitarEvento(input, nombre){
    if(!input) return;
    const attr = nombre.toLowerCase();
    const actual = input.getAttribute(attr);
    if(actual) input.dataset[`mv455${nombre}`] = actual;
    input.removeAttribute(attr);
  }

  function activarIngresoManual(){
    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    const bloque = document.getElementById("mv455BusquedaRapida");
    const guia = document.getElementById("guiaCodigosActa");
    const visible = document.getElementById("mv455Identificador");

    window._mv455ModoManual = true;
    window._mv455ActaResuelta = null;

    [orden,pedido].forEach(input => {
      if(!input) return;
      const campo = input.closest(".actas-field");
      if(campo) campo.style.display = "";
      input.required = true;
      restaurarEvento(input,"Oninput");
      restaurarEvento(input,"Onblur");
    });

    if(pedido && !pedido.value && visible && visible.value) pedido.value = visible.value.trim();
    if(guia) guia.style.display = "";
    if(bloque) bloque.style.display = "none";
    if(visible) visible.required = false;
    habilitarGuardar(true);
  }

  function sincronizarDesdeCamposOriginales(){
    if(window._mv455ModoManual) return;
    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    if(!orden || !pedido || !orden.value.trim() || !pedido.value.trim()) return;

    const visible = document.getElementById("mv455Identificador");
    if(visible && !visible.value) visible.value = pedido.value.trim();

    window._mv455ActaResuelta = {
      codigoOrden:orden.value.trim(),
      codigoPedido:pedido.value.trim(),
      origen:"CONTROL_V396"
    };
    ponerEstado(`✅ Orden <b>${esc(orden.value.trim())}</b> seleccionada desde Validar pendientes.`,"ok");
    ocultarSelector();
    habilitarGuardar(true);
  }

  function prepararPdf(input){
    if(!input) return;
    let estado = document.getElementById("mv455PdfEstado");
    if(!estado){
      estado = document.createElement("div");
      estado.id = "mv455PdfEstado";
      estado.className = "mv455-pdf-estado";
      input.insertAdjacentElement("afterend",estado);
    }

    const file = input.files && input.files[0];
    if(!file){ estado.textContent = ""; return; }
    estado.className = "mv455-pdf-estado";
    estado.textContent = "Preparando PDF...";

    if(typeof window.leerPdfActa !== "function") return;
    Promise.resolve(window.leerPdfActa(file)).then(function(){
      estado.className = "mv455-pdf-estado ok";
      estado.textContent = "✓ PDF listo para enviar.";
    }).catch(function(){
      estado.className = "mv455-pdf-estado warn";
      estado.textContent = "El PDF se validará al guardar.";
    });
  }

  function instalarCachePdf(){
    if(window.MV455_PDF_CACHE_OK) return;
    if(typeof window.leerPdfActa !== "function") return;
    const base = window.leerPdfActa;

    function leerPdfRapido(file){
      if(!file) return base(file);
      if(cachePdf.has(file)) return cachePdf.get(file);
      const promesa = Promise.resolve(base(file));
      cachePdf.set(file,promesa);
      promesa.catch(function(){ try{ cachePdf.delete(file); }catch(_){} });
      return promesa;
    }

    window.leerPdfActa = leerPdfRapido;
    try{ leerPdfActa = leerPdfRapido; }catch(_){}
    window.MV455_PDF_CACHE_OK = true;
  }

  function activarFormularioRapido(){
    css();
    const form = document.getElementById("formActa");
    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    const numero = document.getElementById("actaNumeroActa");
    const pdf = document.getElementById("actaPdf");
    const guia = document.getElementById("guiaCodigosActa");
    if(!form || !orden || !pedido || !numero || !pdf || form.dataset.mv455Rapido === "si") return;

    form.dataset.mv455Rapido = "si";
    window._mv455ModoManual = false;
    window._mv455ActaResuelta = null;

    [orden,pedido].forEach(input => {
      const campo = input.closest(".actas-field");
      if(campo) campo.style.display = "none";
      input.required = false;
      guardarYQuitarEvento(input,"Oninput");
      guardarYQuitarEvento(input,"Onblur");
      input.addEventListener("input",sincronizarDesdeCamposOriginales);
    });
    if(guia) guia.style.display = "none";

    const bloque = document.createElement("div");
    bloque.id = "mv455BusquedaRapida";
    bloque.className = "mv455-busqueda";
    bloque.innerHTML = `
      <label for="mv455Identificador">Código cliente o DNI</label>
      <input id="mv455Identificador" inputmode="numeric" autocomplete="off" required placeholder="Ej.: 3051897 o 47733382">
      <div class="mv455-ayuda">MI VISUAL buscará la orden de tu cuadrilla y completará internamente el Código de Orden. No necesitas escribirlo.</div>
      <div id="mv455EstadoBusqueda" class="mv455-estado info">Ingresa el código cliente o DNI.</div>
      <div id="mv455SelectorWrap" class="mv455-selector" style="display:none">
        <label for="mv455SelectorOrden">Se encontraron varias órdenes</label>
        <select id="mv455SelectorOrden"><option value="">Seleccione la orden correcta...</option></select>
      </div>
      <button type="button" id="mv455BtnManual" class="mv455-manual">No aparece mi orden · usar ingreso manual</button>
    `;

    const primerCampo = orden.closest(".actas-field");
    if(primerCampo) primerCampo.insertAdjacentElement("beforebegin",bloque);

    const input = document.getElementById("mv455Identificador");
    const selector = document.getElementById("mv455SelectorOrden");
    const manual = document.getElementById("mv455BtnManual");
    let debounce = null;

    input.addEventListener("input",function(){
      clearTimeout(debounce);
      const valor = input.value.trim();
      window._mv455ActaResuelta = null;
      ocultarSelector();
      habilitarGuardar(false);
      debounce = setTimeout(function(){ resolverBusqueda(valor); },260);
    });
    selector.addEventListener("change",seleccionarOrden);
    manual.addEventListener("click",activarIngresoManual);
    pdf.addEventListener("change",function(){ prepararPdf(pdf); });

    habilitarGuardar(false);

    // Precarga del período actual y anterior para que Código/DNI se resuelva
    // sin adivinar entre atenciones históricas del mismo cliente.
    try{
      const actual = periodoActual();
      const anterior = periodoAnterior(actual);
      Promise.all([
        cargarPeriodo(actual),
        anterior ? cargarPeriodo(anterior) : Promise.resolve({ordenes:[]})
      ]).catch(function(){});
    }catch(_){}

    // Compatibilidad con "+ Subir acta" de Validar pendientes V396,
    // que rellena los dos campos originales unos milisegundos después.
    setTimeout(sincronizarDesdeCamposOriginales,80);
    setTimeout(sincronizarDesdeCamposOriginales,180);
  }

  function adjuntarPreparacionPdf(){
    const pdf = document.getElementById("actaPdf");
    if(!pdf || pdf.dataset.mv455Pdf === "si") return;
    pdf.dataset.mv455Pdf = "si";
    pdf.addEventListener("change",function(){ prepararPdf(pdf); });
  }

  function instalar(){
    if(window.MV455_ACTAS_HOOK_INSTALADO) return true;
    if(!window.MV396_CONTROL_ACTAS_OK) return false;
    if(!window.MV403_MOTIVOS_OBSERVACION_OK) return false;
    if(typeof window.mostrarFormularioActa !== "function") return false;

    instalarCachePdf();
    const base = window.mostrarFormularioActa;

    async function mostrarFormularioV455(){
      const args = Array.prototype.slice.call(arguments);
      const codigoPedidoPrefill = args[0];
      const r = await base.apply(this,args);

      // Reemplazo de PDF observado y completar faltante quedan 100% en el flujo vigente.
      if(codigoPedidoPrefill){
        adjuntarPreparacionPdf();
        return r;
      }

      const u = typeof window.usuarioActualActas === "function" ? window.usuarioActualActas() : null;
      if(!u || norm(u.perfil) !== "TECNICO") return r;

      activarFormularioRapido();
      return r;
    }

    window.mostrarFormularioActa = mostrarFormularioV455;
    try{ mostrarFormularioActa = mostrarFormularioV455; }catch(_){}
    window.MV455_ACTAS_HOOK_INSTALADO = true;
    console.log("MI VISUAL V455: ingreso rápido de actas habilitado.");
    return true;
  }

  function iniciarInstalacion(){
    if(instalar()) return;
    temporizadorInstalacion = setInterval(function(){
      if(instalar() && temporizadorInstalacion){
        clearInterval(temporizadorInstalacion);
        temporizadorInstalacion = null;
      }
    },400);
  }

  iniciarInstalacion();
})();
