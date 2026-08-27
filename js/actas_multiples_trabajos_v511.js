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
