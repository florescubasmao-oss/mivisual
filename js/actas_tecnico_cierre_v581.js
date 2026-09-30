/* ============================================================
   MI VISUAL V581 - ACTAS TECNICO / CIERRE DE MES RESILIENTE
   30/09/2026

   Bundle exclusivo para perfil TECNICO.
   Reactiva capas ya probadas que quedaron fuera del loader dinamico:
   - ingreso rapido V455
   - guardado rapido V455
   - multiples trabajos V511
   - sincronizacion Guardar V510/V511
   - fuente WIN reciente F4Z/F4X
   - consulta automatica resiliente V543/V561
   - confirmacion sin repetir escritura V555
   - apertura/historial no bloqueante V563

   No modifica backend, Drive, permisos, estados ni reglas de Actas.
============================================================ */

/* ===== BUNDLE SOURCE: js/actas_ingreso_rapido_v455.js ===== */
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


/* ===== BUNDLE SOURCE: js/actas_guardado_rapido_v455.js ===== */
/* ============================================================
   MI VISUAL V455 - ACELERADOR SEGURO DEL GUARDADO DE ACTAS
   - Conserva TODAS las validaciones existentes.
   - Solo evita repetir en Guardar la prevalidación V396 que ya se ejecutó
     al resolver Código cliente/DNI unos segundos antes.
   - El backend registrarActaEscaneada vuelve a validar de todos modos.
============================================================ */
(function(){
  "use strict";
  if(window.MV455_GUARDADO_RAPIDO_OK) return;
  window.MV455_GUARDADO_RAPIDO_OK = true;

  let cache = null;
  let timer = null;

  function clave(v){
    return String(v == null ? "" : v).toUpperCase().replace(/[^A-Z0-9]/g,"");
  }

  function instalar(){
    if(window.MV455_GUARDADO_RAPIDO_HOOK) return true;
    if(!window.MV455_ACTAS_HOOK_INSTALADO) return false;
    if(typeof window.apiActas !== "function") return false;

    const base = window.apiActas;

    async function apiRapida(payload){
      const p = Object.assign({},payload || {});
      const accion = p.accion || "";

      if(accion === "validarCodigosActaV396" && cache){
        const mismaOrden = clave(p.codigoOrden || p.codigo_orden) === cache.orden;
        const mismoPedido = clave(p.codigoPedido || p.codigo_pedido) === cache.pedido;
        if(mismaOrden && mismoPedido && Date.now() - cache.fecha < 60000){
          return cache.data;
        }
      }

      const data = await base(p);

      if(accion === "validarCodigosActaV396" && data && data.ok !== false){
        cache = {
          orden:clave(p.codigoOrden || p.codigo_orden),
          pedido:clave(p.codigoPedido || p.codigo_pedido),
          fecha:Date.now(),
          data:data
        };
      }

      if(accion === "registrarActaEscaneada") cache = null;
      return data;
    }

    window.apiActas = apiRapida;
    try{ apiActas = apiRapida; }catch(_){}
    window.MV455_GUARDADO_RAPIDO_HOOK = true;
    console.log("MI VISUAL V455: acelerador seguro de guardado de actas habilitado.");
    return true;
  }

  if(!instalar()){
    timer = setInterval(function(){
      if(instalar()){
        clearInterval(timer);
        timer = null;
      }
    },150);
  }
})();


/* ===== BUNDLE SOURCE: js/actas_multiples_trabajos_v511.js ===== */
/* ============================================================
   MI VISUAL V511 - ACTAS CON UN MISMO PEDIDO Y VARIOS TRABAJOS

   Regla operativa:
   - Un Codigo de Pedido puede repetirse en distintas Ordenes.
   - Si el identificador conduce a mas de una Orden, el Tecnico elige
     explicitamente el trabajo antes de subir el acta.
   - Trabajos con acta ya SUBIDA/FINALIZADA se muestran como referencia,
     pero no se pueden seleccionar para generar un duplicado.
   - Si el nuevo trabajo aun no aparece en Mapa/WIN, se conserva el ingreso
     manual vigente: mismo Codigo de Pedido + nuevo Codigo de Orden.

   Alcance:
   - Solo alta nueva del perfil TECNICO.
   - No modifica backend, Drive, estados, validacion documental ni permisos.
============================================================ */
(function(){
  "use strict";
  if(window.MV511_ACTAS_MULTIPLES_TRABAJOS_OK) return;
  window.MV511_ACTAS_MULTIPLES_TRABAJOS_OK = true;

  const CACHE_MS = 2 * 60 * 1000;
  const cache = new Map();
  let formularioActual = null;
  let debounce = null;
  let obsPantalla = null;
  let obsEstado = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function clave(v){ return norm(v).replace(/[^A-Z0-9]/g,""); }
  function esc(v){
    if(typeof window.limpiarHtmlActas === "function") return window.limpiarHtmlActas(v || "");
    return txt(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function esTecnico(){ return norm(localStorage.getItem("perfil")) === "TECNICO"; }
  function periodoActual(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function periodoAnterior(periodo){
    const m = txt(periodo).match(/^(\d{4})-(\d{2})$/);
    if(!m) return "";
    const d = new Date(Number(m[1]), Number(m[2])-2, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function botonGuardar(){ return document.querySelector("#formActa [data-guardar]"); }
  function habilitarGuardar(si){
    const b = botonGuardar();
    if(!b) return;
    b.disabled = !si;
    if(si) b.removeAttribute("aria-disabled");
    else b.setAttribute("aria-disabled","true");
  }
  function estadoPendiente(item){ return norm(item && item.estadoControl) === "PENDIENTE_SUBIR"; }
  function textoEstado(item){
    const e = norm(item && item.estadoControl);
    if(e === "PENDIENTE_SUBIR") return "PENDIENTE DE SUBIR";
    if(e === "SUBIDA") return "ACTA SUBIDA";
    if(e === "FINALIZADA") return "ACTA FINALIZADA";
    if(e === "OBSERVADA") return "OBSERVADA";
    if(e === "FALTANTE") return "ACTA FALTANTE";
    if(e === "CODIGOS_INVERTIDOS") return "CODIGOS INVERTIDOS";
    return e || "REGISTRADO";
  }

  async function cargarPeriodo(periodo){
    if(!periodo) return {ordenes:[]};
    const ahora = Date.now();
    const guardado = cache.get(periodo);
    if(guardado && ahora - guardado.fecha < CACHE_MS) return guardado.data;

    if(window._mv396ControlActasData && window._mv396ControlActasData.periodo === periodo){
      const data = window._mv396ControlActasData;
      cache.set(periodo,{fecha:ahora,data:data});
      return data;
    }

    if(typeof window.apiActas !== "function" || typeof window.usuarioActualActas !== "function"){
      throw new Error("Gestion de Actas aun no esta lista");
    }
    const u = window.usuarioActualActas();
    const data = await window.apiActas({
      accion:"listarControlActasFinalizadasV396",
      usuario:u.usuario,
      periodo:periodo
    });
    const seguro = data || {ordenes:[]};
    cache.set(periodo,{fecha:Date.now(),data:seguro});
    return seguro;
  }

  function buscar(data, identificador){
    const q = clave(identificador);
    if(!q) return [];
    return (data && Array.isArray(data.ordenes) ? data.ordenes : []).filter(function(x){
      return [x.codigoPedido,x.dni,x.codigoOrden].some(function(v){ return clave(v) === q; });
    });
  }

  function trabajosUnicos(lista){
    const mapa = new Map();
    (lista || []).forEach(function(x){
      const orden = clave(x.codigoOrden);
      const pedido = clave(x.codigoPedido);
      if(!orden) return;
      const k = orden + "|" + pedido;
      const anterior = mapa.get(k);
      if(!anterior){
        mapa.set(k,x);
        return;
      }
      // Si hubiera dos registros del mismo trabajo, conserva el que tenga
      // el estado mas util para evitar habilitar un duplicado por error.
      const prioridad = {FINALIZADA:6,SUBIDA:5,OBSERVADA:4,FALTANTE:3,CODIGOS_INVERTIDOS:2,PENDIENTE_SUBIR:1};
      if((prioridad[norm(x.estadoControl)]||0) > (prioridad[norm(anterior.estadoControl)]||0)) mapa.set(k,x);
    });
    return Array.from(mapa.values()).sort(function(a,b){
      return txt(b.fechaVisible || b.fecha).localeCompare(txt(a.fechaVisible || a.fecha));
    });
  }

  function quitarPanel(){
    const p = document.getElementById("mv511TrabajosWrap");
    if(p) p.remove();
    window._mv511TrabajosActuales = null;
  }

  function mensajeMultiple(trabajos){
    const pendientes = trabajos.filter(estadoPendiente).length;
    if(pendientes){
      return `Este codigo tiene <b>${trabajos.length} trabajos</b>. `+
        `Selecciona el trabajo al que corresponde esta acta. Los trabajos ya atendidos se muestran solo como referencia.`;
    }
    return `Los <b>${trabajos.length} trabajos</b> encontrados para este codigo ya tienen registro. `+
      `Si existe un trabajo nuevo que aun no aparece en WIN/Mapa, usa <b>ingreso manual</b> e ingresa su nuevo Codigo de Orden.`;
  }

  function asegurarSeleccion(){
    if(window._mv511RequiereSeleccion !== true) return;
    const panel = document.getElementById("mv511TrabajosWrap");
    const sel = document.getElementById("mv511SelectorTrabajo");
    if(!panel || !sel || sel.value) return;
    habilitarGuardar(false);
    window._mv455ActaResuelta = null;
    const e = document.getElementById("mv455EstadoBusqueda");
    const trabajos = window._mv511TrabajosActuales || [];
    if(e && trabajos.length){
      e.className = "mv455-estado warn";
      e.innerHTML = mensajeMultiple(trabajos);
    }
  }

  function aplicarTrabajo(item){
    if(!item || !estadoPendiente(item)) return;
    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    if(!orden || !pedido) return;

    const codigoOrden = txt(item.codigoOrden);
    const codigoPedido = txt(item.codigoPedido);
    if(!codigoOrden || !codigoPedido) return;

    orden.value = codigoOrden;
    pedido.value = codigoPedido;
    window._mv511RequiereSeleccion = false;
    window._mv455ActaResuelta = {
      codigoOrden:codigoOrden,
      codigoPedido:codigoPedido,
      dni:txt(item.dni),
      cliente:txt(item.cliente),
      fecha:txt(item.fechaVisible || item.fecha),
      tipo:txt(item.tipoTrabajo || item.tipoPartida),
      origen:"SELECCION_MULTIPLE_V511"
    };
    habilitarGuardar(true);

    const e = document.getElementById("mv455EstadoBusqueda");
    if(e){
      e.className = "mv455-estado ok";
      e.innerHTML = `✅ Trabajo seleccionado · Orden <b>${esc(codigoOrden)}</b>`+
        `${item.fechaVisible ? ` · ${esc(item.fechaVisible)}` : ""}`+
        `${item.tipoTrabajo || item.tipoPartida ? ` · ${esc(item.tipoTrabajo || item.tipoPartida)}` : ""}`;
    }

    try{
      if(typeof window.apiActas === "function" && typeof window.usuarioActualActas === "function"){
        const u = window.usuarioActualActas();
        Promise.resolve(window.apiActas({
          accion:"validarCodigosActaV396",
          usuario:u.usuario,
          codigoOrden:codigoOrden,
          codigoPedido:codigoPedido
        })).catch(function(){});
      }
    }catch(_){ }

    try{
      if(typeof window.consultarDatosAutomaticosFormularioActa === "function"){
        Promise.resolve(window.consultarDatosAutomaticosFormularioActa()).catch(function(){});
      }
    }catch(_){ }
  }

  function pintarSelector(trabajos){
    const bloque = document.getElementById("mv455BusquedaRapida");
    const estado = document.getElementById("mv455EstadoBusqueda");
    const manual = document.getElementById("mv455BtnManual");
    if(!bloque || !estado) return;

    quitarPanel();
    const selectorV455 = document.getElementById("mv455SelectorWrap");
    if(selectorV455) selectorV455.style.display = "none";

    const panel = document.createElement("div");
    panel.id = "mv511TrabajosWrap";
    panel.className = "mv455-selector";
    panel.style.display = "block";
    panel.innerHTML = `
      <label for="mv511SelectorTrabajo">Este codigo tiene varios trabajos</label>
      <select id="mv511SelectorTrabajo">
        <option value="">Selecciona el trabajo de esta acta...</option>
        ${trabajos.map(function(x,i){
          const disponible = estadoPendiente(x);
          const tipo = txt(x.tipoTrabajo || x.tipoPartida || "Trabajo");
          const fecha = txt(x.fechaVisible || x.fecha || "");
          const etiqueta = `Orden ${txt(x.codigoOrden) || "-"} · ${fecha || "Sin fecha"} · ${tipo} · ${textoEstado(x)}`;
          return `<option value="${i}" ${disponible ? "" : "disabled"}>${esc(etiqueta)}</option>`;
        }).join("")}
      </select>
      <div class="mv455-ayuda">El Codigo de Pedido puede ser el mismo; la Orden identifica cada trabajo. Los trabajos con acta ya registrada no se pueden volver a seleccionar.</div>
    `;

    if(manual) bloque.insertBefore(panel,manual);
    else bloque.appendChild(panel);

    window._mv511TrabajosActuales = trabajos;
    window._mv511RequiereSeleccion = true;
    window._mv455ActaResuelta = null;
    habilitarGuardar(false);
    estado.className = "mv455-estado warn";
    estado.innerHTML = mensajeMultiple(trabajos);

    const sel = document.getElementById("mv511SelectorTrabajo");
    if(sel){
      sel.addEventListener("change",function(){
        if(sel.value === ""){
          window._mv511RequiereSeleccion = true;
          asegurarSeleccion();
          return;
        }
        const idx = Number(sel.value);
        const item = trabajos[idx];
        if(!item || !estadoPendiente(item)){
          sel.value = "";
          window._mv511RequiereSeleccion = true;
          asegurarSeleccion();
          return;
        }
        aplicarTrabajo(item);
      });
    }
  }

  function aclararPedidoYaUsado(trabajos, identificador){
    if(trabajos.length !== 1) return;
    const item = trabajos[0];
    if(estadoPendiente(item)) return;
    if(clave(identificador) !== clave(item.codigoPedido)) return;
    const e = document.getElementById("mv455EstadoBusqueda");
    const manual = document.getElementById("mv455BtnManual");
    if(!e || !manual) return;
    e.className = "mv455-estado warn";
    e.innerHTML = `Este Codigo de Pedido ya tiene un trabajo con estado <b>${esc(textoEstado(item))}</b>. `+
      `Si corresponde a una <b>segunda Orden</b> y aun no aparece en WIN/Mapa, usa el ingreso manual e ingresa el nuevo Codigo de Orden.`;
    manual.textContent = "Segundo trabajo no aparece · ingresar Orden manualmente";
  }

  async function revisarIdentificador(){
    if(!esTecnico() || window._mv455ModoManual) return;
    const input = document.getElementById("mv455Identificador");
    if(!input) return;
    const identificador = txt(input.value);
    if(clave(identificador).length < 6){
      window._mv511RequiereSeleccion = false;
      quitarPanel();
      return;
    }

    try{
      const actual = periodoActual();
      const anterior = periodoAnterior(actual);
      const datos = await Promise.all([
        cargarPeriodo(actual),
        anterior ? cargarPeriodo(anterior) : Promise.resolve({ordenes:[]})
      ]);
      if(!document.getElementById("mv455Identificador") || txt(document.getElementById("mv455Identificador").value) !== identificador) return;

      const trabajos = trabajosUnicos(buscar(datos[0],identificador).concat(buscar(datos[1],identificador)));
      if(trabajos.length > 1){
        pintarSelector(trabajos);
      }else{
        window._mv511RequiereSeleccion = false;
        quitarPanel();
        aclararPedidoYaUsado(trabajos,identificador);
      }
    }catch(_){
      // No rompe el flujo V455. Si la base aun no responde, el boton manual
      // vigente sigue disponible para registrar la nueva Orden.
    }
  }

  function conectarFormulario(){
    const form = document.getElementById("formActa");
    const input = document.getElementById("mv455Identificador");
    if(!form || !input || form === formularioActual) return;
    formularioActual = form;
    window._mv511RequiereSeleccion = false;
    quitarPanel();

    input.addEventListener("input",function(){
      clearTimeout(debounce);
      window._mv511RequiereSeleccion = false;
      quitarPanel();
      const manual = document.getElementById("mv455BtnManual");
      if(manual) manual.textContent = "No aparece mi orden · usar ingreso manual";
      debounce = setTimeout(revisarIdentificador,520);
    });

    const manual = document.getElementById("mv455BtnManual");
    if(manual){
      manual.addEventListener("click",function(){
        window._mv511RequiereSeleccion = false;
        quitarPanel();
      });
    }

    if(obsEstado){ try{ obsEstado.disconnect(); }catch(_){ } }
    const estado = document.getElementById("mv455EstadoBusqueda");
    if(estado){
      obsEstado = new MutationObserver(function(){
        if(window._mv511RequiereSeleccion === true) setTimeout(asegurarSeleccion,0);
      });
      obsEstado.observe(estado,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
    }

    setTimeout(revisarIdentificador,650);
  }

  function iniciar(){
    const objetivo = document.getElementById("pantalla") || document.body;
    if(!objetivo) return;
    conectarFormulario();
    obsPantalla = new MutationObserver(function(){ conectarFormulario(); });
    obsPantalla.observe(objetivo,{childList:true,subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  console.log("MI VISUAL V511: selector de multiples trabajos por pedido activo.");
})();


/* ===== BUNDLE SOURCE: js/actas_guardar_sync_v510.js ===== */
/* ============================================================
   MI VISUAL V510/V511 - SINCRONIZACION GUARDAR ACTA

   Corrige una carrera entre:
   - actas.js: resuelve datos desde Mapa Operativo + Produccion.
   - actas_ingreso_rapido_v455.js: mantiene su propio estado de orden resuelta.
   - V511: si un pedido tiene varias Ordenes, espera seleccion explicita.

   SEGURIDAD
   - NO salta validaciones del backend.
   - NO habilita si V455 detecto un bloqueo explicito: acta observada,
     faltante, ya subida/finalizada, codigos invertidos o varias ordenes.
   - NO habilita mientras V511 requiera elegir el trabajo correcto.
   - Solo sincroniza cuando el flujo base confirma datos y existen ambos
     codigos necesarios para guardar.
============================================================ */
(function(){
  "use strict";
  if(window.MV510_ACTAS_GUARDAR_SYNC_OK) return;
  window.MV510_ACTAS_GUARDAR_SYNC_OK = true;

  let formularioActual = null;
  let observadorPantalla = null;
  let observadorEstado = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil")) === "TECNICO";
  }

  function boton(){
    return document.querySelector("#formActa [data-guardar]");
  }

  function bloqueoExplicitoV455(){
    const e = document.getElementById("mv455EstadoBusqueda");
    if(!e) return false;
    const t = norm(e.textContent || "");
    if(!t) return false;

    const bloqueos = [
      "OBSERVADA",
      "ACTA FALTANTE",
      "CODIGOS INVERTIDOS",
      "CODIGOS_INVERTIDOS",
      "YA FUE SUBIDA",
      "SUBIDA / ESTA EN REVISION",
      "YA ESTA FINALIZADA",
      "YA ESTA FINALIZADO",
      "VARIAS ORDENES",
      "SELECCIONA LA ATENCION CORRECTA"
    ];
    return bloqueos.some(x => t.indexOf(x) >= 0);
  }

  function baseConfirmada(){
    const estado = document.getElementById("actaAutoEstado");
    if(!estado) return false;
    const t = norm(estado.textContent || "");
    const esOk = estado.classList.contains("ok") || /DATOS ENCONTRADOS/.test(t);
    return esOk && /MAPA OPERATIVO/.test(t) && /PRODUCCION/.test(t);
  }

  function sincronizar(){
    if(!esTecnico()) return false;
    const form = document.getElementById("formActa");
    if(!form || form.dataset.mv510Guardando === "1") return false;

    // V511 tiene prioridad: cuando un mismo pedido tiene varias Ordenes,
    // Guardar permanece bloqueado hasta que el tecnico elija el trabajo.
    if(window._mv511RequiereSeleccion === true) return false;

    // V455 solo transforma el alta nueva de Tecnico. En reemplazo/faltante
    // no interferimos con el flujo vigente.
    if(bloqueoExplicitoV455()) return false;
    if(!baseConfirmada()) return false;

    const orden = document.getElementById("actaCodigoOrden");
    const pedido = document.getElementById("actaCodigoPedido");
    const b = boton();
    if(!orden || !pedido || !b) return false;

    const codigoOrden = txt(orden.value);
    const codigoPedido = txt(pedido.value);
    if(!codigoOrden || !codigoPedido) return false;

    // Sincroniza el estado que V455 espera sin modificar los datos oficiales.
    if(!window._mv455ActaResuelta ||
       txt(window._mv455ActaResuelta.codigoOrden) !== codigoOrden ||
       txt(window._mv455ActaResuelta.codigoPedido) !== codigoPedido){
      window._mv455ActaResuelta = {
        codigoOrden: codigoOrden,
        codigoPedido: codigoPedido,
        origen: "SINCRONIZACION_BASE_V510"
      };
    }

    b.disabled = false;
    b.removeAttribute("aria-disabled");

    // Conserva la prevalidacion rapida existente; el backend vuelve a validar
    // registrarActaEscaneada al guardar.
    try{
      if(typeof window.apiActas === "function" && typeof window.usuarioActualActas === "function"){
        const u = window.usuarioActualActas();
        Promise.resolve(window.apiActas({
          accion:"validarCodigosActaV396",
          usuario:u.usuario,
          codigoOrden:codigoOrden,
          codigoPedido:codigoPedido
        })).catch(function(){});
      }
    }catch(_){ }
    return true;
  }

  function conectarFormulario(){
    const form = document.getElementById("formActa");
    if(!form || form === formularioActual) return;
    formularioActual = form;

    form.addEventListener("submit", function(){
      form.dataset.mv510Guardando = "1";
    }, true);

    const pdf = document.getElementById("actaPdf");
    if(pdf) pdf.addEventListener("change", function(){ setTimeout(sincronizar, 0); });

    ["actaCodigoOrden","actaCodigoPedido"].forEach(function(id){
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("input", function(){ setTimeout(sincronizar,0); });
      el.addEventListener("change", function(){ setTimeout(sincronizar,0); });
    });

    const estado = document.getElementById("actaAutoEstado");
    if(observadorEstado){ try{ observadorEstado.disconnect(); }catch(_){ } }
    if(estado){
      observadorEstado = new MutationObserver(function(){ setTimeout(sincronizar,0); });
      observadorEstado.observe(estado,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["class"]});
    }

    setTimeout(sincronizar, 40);
    setTimeout(sincronizar, 250);
  }

  function iniciar(){
    const objetivo = document.getElementById("pantalla") || document.body;
    if(!objetivo) return;
    conectarFormulario();
    observadorPantalla = new MutationObserver(function(){ conectarFormulario(); });
    observadorPantalla.observe(objetivo,{childList:true,subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  console.log("MI VISUAL V510/V511: sincronizacion Guardar Acta activa.");
})();


/* ===== BUNDLE SOURCE: js/actas_win_reciente_v517d_f4z.js ===== */
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


/* ===== BUNDLE SOURCE: js/actas_mapa_fallback_v517d_f4x.js ===== */
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


/* ===== BUNDLE SOURCE: js/actas_tecnico_resiliente_v543.js ===== */
/* ============================================================
   MI VISUAL V561 - ACTAS TECNICO / CONSULTA AUTOMATICA FUENTE VIVA
   16/09/2026

   Alcance estricto:
   - SOLO perfil TECNICO y SOLO la lectura consultarDatosAutomaticosActa.
   - Mantiene el mismo endpoint, payload y respuesta vigente.
   - Evita esperas acumuladas de varios intentos largos del GET general.
   - Una misma Orden/Pedido comparte la consulta en curso y caché breve.
   - Evita consultas repetidas por input + blur cuando ya hay datos completos.
   - Hace como máximo un reintento visual adicional si Google falla.
   - NUNCA repite Guardar Acta ni ninguna escritura.
   - No modifica permisos, Drive, estados, periodos ni reglas de Actas.
============================================================ */
(function(){
  "use strict";
  if(window.MV544_ACTAS_TECNICO_RESILIENTE_OK)return;
  window.MV544_ACTAS_TECNICO_RESILIENTE_OK=true;
  window.MV543_ACTAS_TECNICO_RESILIENTE_OK=true;

  const CACHE_AUTO_MS=90*1000;
  const COOLDOWN_ERROR_MS=7000;
  const cacheAuto=new Map();
  const enCursoAuto=new Map();
  const ultimoError=new Map();
  const reintentosVisuales=new Map();
  const timers=new Map();

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esTecnico(){return norm(localStorage.getItem("perfil"))==="TECNICO";}
  function claveCodigos(orden,pedido){return norm(orden)+"|"+norm(pedido);}
  function clavePayload(p){return [txt(p&&p.usuario),claveCodigos(p&&p.codigoOrden,p&&p.codigoPedido)].join("|");}
  function claveActual(){
    return claveCodigos(
      document.getElementById("actaCodigoOrden")?.value,
      document.getElementById("actaCodigoPedido")?.value
    );
  }
  function datosCompletos(){
    const ids=["actaAutoTipoEjecucion","actaAutoTipoPartida","actaAutoDni","actaAutoCliente"];
    return ids.every(id=>{
      const t=norm(document.getElementById(id)?.textContent);
      return !!t && t!=="PENDIENTE DE ACTUALIZACION" && t!=="-";
    });
  }
  function resueltaCoincide(){
    try{
      const r=window._mv455ActaResuelta;
      if(!r)return false;
      return claveActual()===claveCodigos(r.codigoOrden,r.codigoPedido);
    }catch(_){return false;}
  }
  function errorTransitorioVisible(){
    const t=norm(document.getElementById("actaAutoEstado")?.textContent);
    return /NO SE PUDO CONSULTAR AHORA|TARDO DEMASIADO|TEMPORAL|NO RESPONDIO|INTENTE NUEVAMENTE|CONEXION|HTTP 404|HTTP 408|HTTP 429|HTTP 5|RESPUESTA INVALIDA/.test(t);
  }
  function cancelarTimer(k){
    const t=timers.get(k);
    if(t)clearTimeout(t);
    timers.delete(k);
  }
  function pintarReintento(){
    const el=document.getElementById("actaAutoEstado");
    if(!el)return;
    el.className="actas-auto-status warn";
    el.textContent="La consulta está demorando. MI VISUAL hará una verificación automática sin repetir el guardado.";
  }
  function dormir(ms){return new Promise(r=>setTimeout(r,ms));}

  async function getDirecto(payload,tiempoMs){
    const base=window.API_ACTAS||window.MI_VISUAL_API_URL;
    if(!base)throw new Error("API de Gestión de Actas no disponible");
    const p=Object.assign({},payload||{});
    delete p.__forzar;
    p._v544=Date.now()+"-"+Math.random().toString(36).slice(2);

    if(typeof window.mv336ApiGet==="function"){
      return await window.mv336ApiGet(base,p,{intentos:1,tiempoMs:tiempoMs});
    }

    const u=new URL(base);
    Object.entries(p).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v));
    });
    const c=typeof AbortController==="function"?new AbortController():null;
    const timer=c?setTimeout(()=>c.abort(),tiempoMs):null;
    try{
      const r=await fetch(u.toString(),{
        method:"GET",cache:"no-store",redirect:"follow",
        headers:{"Accept":"application/json"},signal:c?c.signal:undefined
      });
      const raw=(await r.text()).trim();
      if(!r.ok)throw new Error("HTTP "+r.status);
      if(!raw||/<!doctype|<html|accounts\.google|google drive/i.test(raw))throw new Error("Respuesta inválida");
      const d=JSON.parse(raw);
      if(!d||d.ok===false)throw new Error((d&&d.error)||"No se pudo consultar los datos automáticos");
      return d;
    }finally{if(timer)clearTimeout(timer);}
  }

  async function consultarAutoRapido(payload){
    const k=clavePayload(payload);
    const ahora=Date.now();
    const forzar=!!(payload&&payload.__forzar);
    const guardado=cacheAuto.get(k);
    if(!forzar&&guardado&&ahora-guardado.t<CACHE_AUTO_MS)return guardado.data;
    if(!forzar&&enCursoAuto.has(k))return enCursoAuto.get(k);

    const tarea=(async function(){
      let ultimo=null;
      const tiempos=[9500,7500];
      for(let i=0;i<tiempos.length;i++){
        if(i)await dormir(700);
        try{
          const d=await getDirecto(payload,tiempos[i]);
          cacheAuto.set(k,{t:Date.now(),data:d});
          ultimoError.delete(k);
          return d;
        }catch(e){ultimo=e;}
      }
      ultimoError.set(k,Date.now());
      throw ultimo||new Error("La consulta automática no respondió.");
    })().finally(function(){
      if(enCursoAuto.get(k)===tarea)enCursoAuto.delete(k);
    });

    enCursoAuto.set(k,tarea);
    return tarea;
  }

  function instalarApi(){
    if(!esTecnico())return false;
    if(typeof window.apiActas!=="function")return false;
    if(window.apiActas.__mv544Auto)return true;

    const original=window.apiActas;
    const apiV544=async function(payload){
      const p=Object.assign({},payload||{});
      if(esTecnico()&&p.accion==="consultarDatosAutomaticosActa"){
        return await consultarAutoRapido(p);
      }
      return await original(p);
    };
    apiV544.__mv544Auto=true;
    apiV544.__base=original;
    window.apiActas=apiV544;
    try{apiActas=apiV544;}catch(_){}
    return true;
  }

  function programarReintento(base,k){
    if(!k||k==="|"||!esTecnico()||!errorTransitorioVisible()||datosCompletos())return;
    if(Number(reintentosVisuales.get(k)||0)>=1||timers.has(k))return;
    reintentosVisuales.set(k,1);
    pintarReintento();
    const timer=setTimeout(async function(){
      timers.delete(k);
      if(claveActual()!==k)return;
      try{await base.apply(window,[]);}catch(_){}
      if(claveActual()===k&&datosCompletos())ultimoError.delete(k);
    },2500);
    timers.set(k,timer);
  }

  function instalarUi(){
    if(!esTecnico())return false;
    if(typeof window.consultarDatosAutomaticosFormularioActa!=="function")return false;
    if(window.consultarDatosAutomaticosFormularioActa.__mv544)return true;

    const base=window.consultarDatosAutomaticosFormularioActa;
    const wrap=async function(){
      const k=claveActual();
      if(!k||k==="|")return await base.apply(this,arguments);

      if(datosCompletos()&&resueltaCoincide()){
        cancelarTimer(k);
        return;
      }

      const tError=Number(ultimoError.get([txt(localStorage.getItem("usuario")),k].join("|"))||0);
      if(tError&&Date.now()-tError<COOLDOWN_ERROR_MS&&errorTransitorioVisible()){
        programarReintento(base,k);
        return;
      }

      const r=await base.apply(this,arguments);
      if(claveActual()!==k)return r;
      if(datosCompletos()){
        cancelarTimer(k);
        reintentosVisuales.delete(k);
      }else if(errorTransitorioVisible()){
        programarReintento(base,k);
      }
      return r;
    };
    wrap.__mv544=true;
    wrap.__mv543=true;
    wrap.__base=base;
    window.consultarDatosAutomaticosFormularioActa=wrap;
    try{consultarDatosAutomaticosFormularioActa=wrap;}catch(_){}
    return true;
  }

  function instalar(){
    const a=instalarApi();
    const b=instalarUi();
    if(a&&b){
      console.log("MI VISUAL V544: consulta automática de Actas Técnico optimizada y sin escrituras duplicadas.");
      return true;
    }
    return false;
  }

  const previo=window.mv339Antes_mostrarGestionActas;
  window.mv339Antes_mostrarGestionActas=function(){
    if(typeof previo==="function"){
      try{previo.apply(this,arguments);}catch(_){}
    }
    instalar();
  };

  document.addEventListener("input",function(e){
    if(!e||!e.target)return;
    if(e.target.id!=="actaCodigoOrden"&&e.target.id!=="actaCodigoPedido")return;
    for(const k of Array.from(timers.keys()))cancelarTimer(k);
  },true);

  if(!instalar()){
    const timer=setInterval(function(){if(instalar())clearInterval(timer);},700);
    setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
  }
})();


/* ===== BUNDLE SOURCE: js/actas_confirmacion_id_v532.js ===== */
/* ============================================================
   MI VISUAL V555 - CONFIRMACION RESILIENTE DE ACTAS
   17/09/2026

   Objetivo:
   - Conservar V545 para subida de PDF sin repetir escrituras.
   - Corregir validaciones de ALMACEN / JEFATURA ALMACEN cuando
     Google pierde la respuesta del POST.
   - Confirmar tanto CORRECTO como OBSERVADO por lectura puntual.
   - NUNCA repetir automaticamente validarActaEscaneada.
   - No modifica backend, Drive, permisos, estados ni historico.
============================================================ */
(function(){
"use strict";

if(window.MV555_ACTAS_CONFIRMACION_CARGADA)return;
window.MV555_ACTAS_CONFIRMACION_CARGADA=true;
window.MV545_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV542_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV541_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV540_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV532_ACTAS_CONFIRMACION_ID_CARGADA=true;

function txt(v){return String(v==null?"":v).trim();}
function norm(v){
  return txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim();
}
function clave(v){return norm(v).replace(/[^A-Z0-9]/g,"");}
function claveNumeroActa(v){
  let k=clave(v);
  if(/^\d+$/.test(k))k=k.replace(/^0+(?=\d)/,"");
  return k;
}
function dormir(ms){return new Promise(function(r){setTimeout(r,ms);});}
function apiBase(){return window.API_ACTAS||window.MI_VISUAL_API_URL||"";}

function esErrorIncierto(error){
  const m=norm(error&&error.message||error||"");
  return /NO RESPONDIO EN LA VERIFICACION|NO SE RECIBIO CONFIRMACION|NO SE PUDO CONFIRMAR LA SUBIDA|TARDO DEMASIADO|RESPUESTA INVALIDA|PAGINA EXTERNA|HTTP 404|HTTP 408|HTTP 429|HTTP 500|HTTP 502|HTTP 503|HTTP 504|FAILED TO FETCH|NO ESTA DISPONIBLE TEMPORALMENTE|PODRIA HABERSE REGISTRADO|ACTUALICE LA VISTA ANTES DE REPETIR/.test(m);
}

function idEsperadoSubida(s){
  const original=txt(s.idActaOriginal||s.id_acta_original||"");
  if(original)return original;
  const orden=clave(s.codigoOrden||s.codigo_orden||"");
  const acta=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  if(!orden)return "";
  return "ACTA-"+orden+(acta?"-"+acta:"");
}

async function consultarActaPorIdV555(s,idOverride){
  const id=txt(idOverride||s.id);
  if(!id)throw new Error("ID de acta no disponible");
  const base=apiBase();
  if(!base)throw new Error("API de Gestión de Actas no disponible");
  const payload={
    accion:"obtenerActaPorIdV532",
    usuario:s.usuario,
    id:id,
    _v555:Date.now()+"-"+Math.random().toString(36).slice(2)
  };

  if(typeof window.mv336ApiGet==="function"){
    return await window.mv336ApiGet(base,payload,{intentos:1,tiempoMs:5500});
  }

  const url=new URL(base);
  Object.keys(payload).forEach(function(k){url.searchParams.set(k,String(payload[k]));});
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(function(){c.abort();},5500):null;
  try{
    const r=await fetch(url.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",
      headers:{"Accept":"application/json"},signal:c?c.signal:undefined
    });
    if(!r.ok)throw new Error("HTTP "+r.status);
    const t=(await r.text()).trim();
    if(!t||/<!doctype|<html/i.test(t))throw new Error("Respuesta inválida");
    const j=JSON.parse(t);
    if(!j||j.ok===false)throw new Error((j&&j.error)||"Consulta no disponible");
    return j;
  }finally{
    if(timer)clearTimeout(timer);
  }
}

async function consultarActaEnListadoV555(s,id){
  const base=apiBase();
  if(!base)return null;
  const payload={
    accion:"listarActasEscaneadas",
    usuario:s.usuario,
    _v555lista:Date.now()+"-"+Math.random().toString(36).slice(2)
  };
  try{
    let r;
    if(typeof window.mv336ApiGet==="function"){
      r=await window.mv336ApiGet(base,payload,{intentos:1,tiempoMs:6500});
    }else{
      const u=new URL(base);
      Object.keys(payload).forEach(function(k){u.searchParams.set(k,String(payload[k]));});
      const c=typeof AbortController==="function"?new AbortController():null;
      const timer=c?setTimeout(function(){c.abort();},6500):null;
      try{
        const res=await fetch(u.toString(),{
          method:"GET",cache:"no-store",redirect:"follow",
          headers:{"Accept":"application/json"},signal:c?c.signal:undefined
        });
        if(!res.ok)throw new Error("HTTP "+res.status);
        const raw=(await res.text()).trim();
        if(!raw||/<!doctype|<html/i.test(raw))throw new Error("Respuesta inválida");
        r=JSON.parse(raw);
      }finally{
        if(timer)clearTimeout(timer);
      }
    }
    if(!r||r.ok!==true||!Array.isArray(r.actas))return null;
    const a=r.actas.find(function(x){return txt(x&&x.id)===txt(id);});
    return a?{ok:true,acta:a,perfil:r.perfil||""}:null;
  }catch(_){
    return null;
  }
}

function validacionConfirmadaV555(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const esperado=norm(s.resultado||"");
  if(["CORRECTO","OBSERVADO"].indexOf(esperado)<0)return false;

  const a=r.acta;
  const perfil=norm(r.perfil||localStorage.getItem("perfil")||"");

  if(perfil==="ALMACEN"){
    return norm(a.resultadoAlmacen)===esperado && !!txt(a.validadoAlmacenPor);
  }

  if(perfil==="JEFATURA ALMACEN"){
    const estadoEsperado=esperado==="CORRECTO"?"FINALIZADO":"PENDIENTE";
    return norm(a.resultadoJefatura)===esperado &&
      norm(a.estado)===estadoEsperado &&
      !!txt(a.validadoJefaturaPor);
  }

  return false;
}

function fechaRegistroRecienteV555(a){
  const pares=[
    [a&&a.fechaActualizacion,a&&a.horaActualizacion],
    [a&&a.fechaRegistro,a&&a.horaRegistro],
    [a&&a.fechaSubida,a&&a.horaSubida]
  ];
  for(const par of pares){
    const f=txt(par[0]),h=txt(par[1]);
    if(!f)continue;
    let y,m,d;
    let x=f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(x){d=Number(x[1]);m=Number(x[2]);y=Number(x[3]);}
    else{
      x=f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if(x){y=Number(x[1]);m=Number(x[2]);d=Number(x[3]);}
    }
    if(!y||!m||!d)continue;
    const hm=(h.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)||[]);
    const hh=Number(hm[1]||0),mm=Number(hm[2]||0),ss=Number(hm[3]||0);
    const ts=Date.UTC(y,m-1,d,hh+5,mm,ss);
    if(isFinite(ts))return Math.abs(Date.now()-ts)<=15*60*1000;
  }
  return true;
}

function subidaConfirmadaV555(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const a=r.acta;
  if(!txt(a.linkActa))return false;
  const ordenS=clave(s.codigoOrden||s.codigo_orden||"");
  const ordenA=clave(a.codigoOrden||"");
  const actaS=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  const actaA=claveNumeroActa(a.numeroActa||"");
  if(ordenS&&ordenA&&ordenS!==ordenA)return false;
  if(actaS&&actaA&&actaS!==actaA)return false;
  return fechaRegistroRecienteV555(a);
}

function limpiarCachesActasV555(){
  try{if(typeof window.limpiarCacheActas==="function")window.limpiarCacheActas();}catch(_){}
  try{if(typeof window.mv524LimpiarSnapshotActas==="function")window.mv524LimpiarSnapshotActas();}catch(_){}
  try{
    for(let i=sessionStorage.length-1;i>=0;i--){
      const k=sessionStorage.key(i)||"";
      if(k.indexOf("MV524_ACTAS_CARGA|")===0)sessionStorage.removeItem(k);
    }
  }catch(_){}
}

function coincideV555(modo,s,r){
  return modo==="SUBIDA"?subidaConfirmadaV555(s,r):validacionConfirmadaV555(s,r);
}

async function etapaVerificacionV555(s,id,modo,usarListado){
  const tareas=[consultarActaPorIdV555(s,id)];
  if(usarListado)tareas.push(consultarActaEnListadoV555(s,id));
  const resultados=await Promise.allSettled(tareas);
  for(const x of resultados){
    if(x.status==="fulfilled"&&x.value&&coincideV555(modo,s,x.value))return x.value;
  }
  return null;
}

async function confirmarConEsperaV555(s,id,modo){
  const etapas=modo==="SUBIDA"
    ? [{espera:0,lista:false},{espera:1100,lista:true},{espera:2200,lista:true}]
    : [{espera:0,lista:false},{espera:800,lista:true},{espera:1600,lista:true}];

  for(const e of etapas){
    if(e.espera)await dormir(e.espera);
    const r=await etapaVerificacionV555(s,id,modo,e.lista);
    if(r)return r;
  }
  return null;
}

function mostrarVerificacionSubidaV555(){
  const msg=document.getElementById("actaMsg");
  if(msg){
    msg.innerHTML='<div class="actas-msg" style="background:#eff6ff;color:#1e3a8a">⏳ Google demoró en responder. MI VISUAL está verificando si el acta ya quedó registrada. No vuelva a pulsar Guardar.</div>';
  }
  const btn=document.querySelector("#formActa [data-guardar]");
  if(btn){btn.disabled=true;btn.innerHTML="Verificando registro...";}
}

function instalar(){
  if(window.MV555_ACTAS_CONFIRMACION_OK)return true;
  if(typeof window.apiActas!=="function")return false;
  if(!window.MV524_ACTAS_SNAPSHOT_OK&&!window.MV392_ACTAS_REINTENTO_404_OK)return false;

  const original=window.apiActas;

  async function apiV555(payload){
    const s=Object.assign({},payload||{});
    try{
      return await original(s);
    }catch(error){
      if(!esErrorIncierto(error))throw error;

      const resultado=norm(s.resultado||"");
      const esValidacion=s.accion==="validarActaEscaneada" &&
        ["CORRECTO","OBSERVADO"].indexOf(resultado)>=0 && !!txt(s.id);

      if(esValidacion){
        const r=await confirmarConEsperaV555(s,s.id,"VALIDACION");
        if(r){
          limpiarCachesActasV555();
          return {
            ok:true,
            modulo:"ACTAS",
            accion:"VALIDACION_CONFIRMADA_V555",
            id:s.id,
            resultado:resultado,
            estado:r.acta&&r.acta.estado?r.acta.estado:"",
            estadoVerificado:true,
            verificacionPorId:true,
            noRepetida:true
          };
        }
        limpiarCachesActasV555();
        throw new Error(
          "Google no confirmó todavía la validación. MI VISUAL no la repetirá automáticamente. Pulse Actualizar vista y revise el estado del acta antes de volver a validar."
        );
      }

      if(s.accion==="registrarActaEscaneada"){
        mostrarVerificacionSubidaV555();
        const id=idEsperadoSubida(s);
        if(id){
          const r=await confirmarConEsperaV555(s,id,"SUBIDA");
          if(r){
            limpiarCachesActasV555();
            const a=r.acta||{};
            return {
              ok:true,
              modulo:"ACTAS",
              accion:"SUBIDA_CONFIRMADA_V555",
              id:a.id||id,
              nombreArchivo:a.nombreArchivo||"PDF registrado",
              linkActa:a.linkActa||"",
              estado:a.estado||"PENDIENTE",
              version:a.version||1,
              estadoFechaCarpeta:a.estadoFechaCarpeta||"",
              fechaCarpeta:a.fechaCarpeta||a.fechaGestion||"",
              datosAutomaticos:{
                fechaGestion:a.fechaGestion||"",
                tipoPartida:a.tipoPartida||"",
                dni:a.dni||"",
                cliente:a.cliente||""
              },
              tipoPartida:a.tipoPartida||"",
              dni:a.dni||"",
              cliente:a.cliente||"",
              subidaVerificada:true,
              verificacionPorId:true
            };
          }
        }
        throw new Error(
          "Google no confirmó todavía la subida. El PDF NO se reenviará automáticamente. Pulse Actualizar vista antes de volver a Guardar Acta."
        );
      }

      throw error;
    }
  }

  apiV555.__mv555=true;
  apiV555.__mv545=true;
  apiV555.__mv542=true;
  apiV555.__mv541=true;
  apiV555.__mv540=true;
  apiV555.__mv532=true;
  apiV555.__original=original;

  window.apiActas=apiV555;
  try{apiActas=apiV555;}catch(_){}

  window.MV532_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV540_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV541_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV542_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV545_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV555_ACTAS_CONFIRMACION_OK=true;

  console.log("MI VISUAL V555: validación Actas CORRECTO/OBSERVADO verificada sin repetir escrituras.");
  return true;
}

const previoAntes=window.mv339Antes_mostrarGestionActas;
window.mv339Antes_mostrarGestionActas=function(){
  if(typeof previoAntes==="function"){
    try{previoAntes.apply(this,arguments);}catch(_){}
  }
  instalar();
};

if(!instalar()){
  const timer=setInterval(function(){if(instalar())clearInterval(timer);},700);
  setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
}

})();


/* ===== BUNDLE SOURCE: js/actas_tecnico_apertura_rapida_v557.js ===== */
/* ============================================================
   MI VISUAL V563 - ACTAS TECNICO / HISTORIAL RESILIENTE
   22/09/2026

   Alcance estricto:
   - SOLO perfil TECNICO y SOLO la carga visual del historial de Actas.
   - El boton "+ Subir Acta PDF" queda operativo de inmediato.
   - Usa listarActasEscaneadas (lectura) en lugar de cargarGestionActas
     para evitar que un resumen pesado bloquee la apertura del modulo.
   - Si Google demora, muestra un aviso no bloqueante: la subida sigue disponible.
   - NO modifica guardar/reemplazar PDF, validaciones, Drive, permisos,
     estados, periodos, backend ni otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV557_ACTAS_TECNICO_APERTURA_OK)return;
  window.MV557_ACTAS_TECNICO_APERTURA_OK=true;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esTecnico(){return norm(localStorage.getItem("perfil"))==="TECNICO";}
  function apiBase(){return window.API_ACTAS||window.MI_VISUAL_API_URL||"";}
  function htmlSeguro(v){
    if(typeof window.limpiarHtmlActas==="function"){
      try{return window.limpiarHtmlActas(v);}catch(_){}
    }
    return txt(v).replace(/[&<>"']/g,function(c){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
    });
  }

  async function listarTecnicoRapido(usuario,forzar){
    const payload={
      accion:"listarActasEscaneadas",
      usuario:usuario,
      _v557:Date.now()+"-"+Math.random().toString(36).slice(2)
    };
    const base=apiBase();
    if(!base)throw new Error("API de Gestión de Actas no disponible");

    if(typeof window.mv336ApiGet==="function"){
      // V563: 7 segundos era insuficiente para el arranque en frío de
      // Apps Script + lectura de ACTAS_ESCANEADAS. Se mantiene una sola
      // consulta para no duplicar carga, pero se permite completar hasta 30 s.
      return await window.mv336ApiGet(base,payload,{
        intentos:1,
        tiempoMs:forzar?30000:25000
      });
    }

    if(typeof window.apiActas==="function"){
      return await window.apiActas(payload);
    }

    throw new Error("Gestión de Actas no está disponible temporalmente");
  }

  function mensajeNoBloqueante(lista,error){
    if(!lista)return;
    const detalle=htmlSeguro(error&&error.message?error.message:"La consulta no respondió a tiempo.");
    lista.innerHTML=`
      <div class="actas-msg" style="background:#fffbeb;color:#92400e;border:1px solid #f59e0b;line-height:1.45">
        ⚠️ No se pudo cargar el historial de actas en este momento.<br>
        <b>Esto no impide subir tu acta PDF.</b><br>
        <span style="font-size:11px;opacity:.85">${detalle}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="actas-btn ok" type="button" onclick="mostrarFormularioActa()">+ Subir Acta PDF</button>
          <button class="actas-btn sec" type="button" onclick="cargarActas({forzar:true})">Reintentar historial</button>
        </div>
      </div>`;
  }

  function instalar(){
    if(!esTecnico())return false;
    if(typeof window.cargarActas!=="function")return false;
    if(window.cargarActas.__mv557)return true;

    const base=window.cargarActas;
    const nuevo=async function(opciones){
      if(!esTecnico())return await base.apply(this,arguments);

      const opts=opciones||{};
      const lista=document.getElementById("actasLista");
      const resumen=document.getElementById("actasResumen");
      if(lista){
        lista.innerHTML=`<div class="actas-card actas-empty">⏳ Cargando tu historial...<br><span style="font-size:11px;font-weight:700;color:#64748b">Puedes pulsar <b>+ Subir Acta PDF</b> sin esperar esta consulta.</span></div>`;
      }
      if(resumen)resumen.innerHTML="";

      try{
        const usuario=txt(localStorage.getItem("usuario"));
        const data=await listarTecnicoRapido(usuario,!!opts.forzar);
        if(!data||data.ok===false)throw new Error((data&&data.error)||"No se pudo consultar el historial de actas");

        const actas=Array.isArray(data.actas)?data.actas:[];
        window._actasTodas=actas;

        if(typeof window.construirFiltrosActas==="function"){
          window.construirFiltrosActas(actas);
        }

        if(actas.length===0){
          if(lista)lista.innerHTML=`<div class="actas-card actas-empty">No hay actas registradas en tu historial. Puedes subir una nueva acta con el botón superior.</div>`;
          const r=document.getElementById("actasFiltroResultado");
          if(r)r.textContent="0 actas visibles.";
          return;
        }

        if(typeof window.aplicarFiltrosActas==="function"){
          window.aplicarFiltrosActas(opts);
        }else if(lista){
          lista.innerHTML=`<div class="actas-card actas-empty">${actas.length} acta${actas.length===1?"":"s"} encontrada${actas.length===1?"":"s"}. Pulse Actualizar vista para volver a mostrarlas.</div>`;
        }
      }catch(error){
        mensajeNoBloqueante(lista,error);
      }
    };

    nuevo.__mv557=true;
    nuevo.__mv563=true;
    nuevo.__base=base;
    window.cargarActas=nuevo;
    try{cargarActas=nuevo;}catch(_){}
    console.log("MI VISUAL V563: historial Técnico con espera resiliente habilitado.");
    return true;
  }

  const previo=window.mv339Antes_mostrarGestionActas;
  window.mv339Antes_mostrarGestionActas=function(){
    if(typeof previo==="function"){
      try{previo.apply(this,arguments);}catch(_){}
    }
    instalar();
  };

  if(!instalar()){
    const timer=setInterval(function(){if(instalar())clearInterval(timer);},700);
    setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
  }
})();
