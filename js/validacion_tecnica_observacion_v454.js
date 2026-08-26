/* ============================================================
   MI VISUAL V454 - GAR/VTR: OBSERVAR Y REENVIAR
   CAPA INCREMENTAL:
   - Conserva validacion_tecnica_v173.js.
   - Conserva optimización V341 (caché 60 s + solicitud única).
   - Conserva datos V430 y su búsqueda bajo demanda.
   - Jefatura puede OBSERVAR GAR/VTR.
   - Solo el técnico propietario puede corregir el motivo y REENVIAR.
============================================================ */
(function(){
  "use strict";

  if(window.MV454_VT_OBSERVAR_REENVIAR_OK) return;
  window.MV454_VT_OBSERVAR_REENVIAR_OK = true;

  const botonesBase = window.botonesValidacion;
  const cargarBase = window.cargarValidacionesTecnicas;
  const historialBase = window.renderHistorialValidacionLocal;

  function txt(v){ return String(v ?? "").trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  }
  function js(v){ return txt(v).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\r?\n/g,"\\n"); }
  function usuarioActual(){
    return {
      usuario: localStorage.getItem("usuario") || "",
      perfil: norm(localStorage.getItem("perfil") || "")
    };
  }
  function buscarItem(id){
    return (window.vtValidacionesActuales || []).find(x=>txt(x?.id)===txt(id)) || null;
  }

  // Mantiene todos los botones históricos y agrega OBSERVAR solo a GAR/VTR.
  if(typeof botonesBase === "function"){
    window.botonesValidacion = function(item){
      const tipo = norm(item?.tipoValidacion);
      if(tipo === "GAR" || tipo === "VTR"){
        const id = js(item?.id || "");
        return `<button class="vt-btn money" onclick="abrirValidarTecnica('${id}','BONO')">Bono</button>
                <button class="vt-btn warn" onclick="abrirValidarTecnica('${id}','OBSERVADO')">Observar</button>
                <button class="vt-btn bad" onclick="abrirValidarTecnica('${id}','NO BONO')">No Bono</button>`;
      }
      return botonesBase.apply(this,arguments);
    };
    try{ botonesValidacion = window.botonesValidacion; }catch(_){}
  }

  function cerrarModal(){
    document.getElementById("vt454Modal")?.remove();
  }

  window.vt454CerrarReenvio = cerrarModal;

  window.vt454AbrirReenvio = function(id){
    const u = usuarioActual();
    const item = buscarItem(id);
    if(!item) return alert("No se encontró la validación. Pulse Actualizar.");
    if(u.perfil !== "TECNICO") return alert("Solo el técnico puede reenviar una validación observada.");
    if(norm(item.estado) !== "OBSERVADO") return alert("Esta validación ya no está observada.");
    if(!["GAR","VTR"].includes(norm(item.tipoValidacion))) return alert("El reenvío aplica solo a GAR/VTR.");
    if(norm(item.tecnico) !== norm(u.usuario)) return alert("Esta validación pertenece a otro técnico.");

    cerrarModal();
    const m = document.createElement("div");
    m.id = "vt454Modal";
    m.className = "vt-modal-backdrop";
    m.innerHTML = `
      <div class="vt-modal" role="dialog" aria-modal="true">
        <div class="vt-modal-head">
          <h3>↩️ Corregir y reenviar GAR/VTR</h3>
          <button class="vt-modal-close" type="button" onclick="vt454CerrarReenvio()">×</button>
        </div>

        <div class="vt-report-note" style="margin:0 0 10px;background:#fff7ed;border-color:#fdba74;color:#9a3412;">
          <b>Observación de Jefatura</b><br>${esc(item.motivoValidacion || "Sin detalle")}
        </div>

        <div class="vt-grid">
          <div class="vt-field"><label>Código</label><input value="${esc(item.codigo||"")}" disabled></div>
          <div class="vt-field"><label>Ticket</label><input value="${esc(item.ticketFinal||"")}" disabled></div>
          <div class="vt-field"><label>Tipo</label><input value="${esc(item.tipoValidacion||"")}" disabled></div>
          <div class="vt-field"><label>Origen</label><input value="${esc(item.origenOrden||"SIN REGISTRO")}" disabled></div>
        </div>

        <div class="vt-field">
          <label>Corrección / motivo técnico actualizado</label>
          <textarea id="vt454MotivoTecnico" placeholder="Explique la corrección antes de reenviar...">${esc(item.motivoTecnico||"")}</textarea>
        </div>

        <div id="vt454Estado" class="vt-report-note" style="display:none"></div>
        <div class="vt-actions" style="justify-content:flex-end">
          <button class="vt-btn secondary" type="button" onclick="vt454CerrarReenvio()">Cancelar</button>
          <button id="vt454Guardar" class="vt-btn ok" type="button" onclick="vt454GuardarReenvio('${js(item.id)}')">↩️ Reenviar a Jefatura</button>
        </div>
      </div>`;
    m.addEventListener("click",e=>{ if(e.target===m) cerrarModal(); });
    document.body.appendChild(m);
  };

  window.vt454GuardarReenvio = async function(id){
    const motivo = txt(document.getElementById("vt454MotivoTecnico")?.value);
    const estado = document.getElementById("vt454Estado");
    const btn = document.getElementById("vt454Guardar");
    if(!motivo){
      if(estado){ estado.style.display="block"; estado.textContent="Ingrese la corrección antes de reenviar."; }
      return;
    }

    try{
      if(btn){ btn.disabled=true; btn.textContent="Reenviando..."; }
      if(estado){ estado.style.display="block"; estado.textContent="Guardando corrección..."; }
      const r = await window.apiValidacionTecnica({
        accion:"reenviarValidacionTecnicaV454",
        usuario:localStorage.getItem("usuario") || "",
        id,
        motivoTecnico:motivo
      });
      if(!r || r.ok===false) throw new Error(r?.error || "No se pudo reenviar.");
      if(estado){ estado.textContent="✅ Reenviado a Jefatura. Vuelve a estado PENDIENTE."; }
      if(typeof window.vtLimpiarCacheValidacionTecnica === "function") window.vtLimpiarCacheValidacionTecnica();
      setTimeout(async function(){
        cerrarModal();
        try{
          if(typeof window.cargarValidacionesTecnicas === "function") await window.cargarValidacionesTecnicas(true);
        }catch(_){ }
      },500);
    }catch(e){
      if(estado){ estado.style.display="block"; estado.textContent="❌ "+(e?.message||"No se pudo reenviar."); }
      if(btn){ btn.disabled=false; btn.textContent="↩️ Reenviar a Jefatura"; }
    }
  };

  function instalarBotonesReenvio(){
    const u = usuarioActual();
    if(u.perfil !== "TECNICO") return;

    document.querySelectorAll(".vt-item").forEach(card=>{
      if(card.querySelector(".vt454-reenviar")) return;
      const id = txt(card.querySelector(".vt-id")?.textContent);
      const item = buscarItem(id);
      if(!item) return;
      if(norm(item.estado) !== "OBSERVADO") return;
      if(!["GAR","VTR"].includes(norm(item.tipoValidacion))) return;
      if(norm(item.tecnico) !== norm(u.usuario)) return;

      const acciones = card.querySelector(".vt-actions");
      if(!acciones) return;
      acciones.insertAdjacentHTML("beforeend",
        `<button class="vt-btn warn vt454-reenviar" type="button" onclick="vt454AbrirReenvio('${js(item.id)}')">↩️ Corregir y reenviar</button>`
      );
    });
  }

  // Los filtros del historial vuelven a renderizar tarjetas; reinstala el botón
  // sin nuevas consultas ni llamadas a Apps Script.
  if(typeof historialBase === "function"){
    window.renderHistorialValidacionLocal = function(){
      const r = historialBase.apply(this,arguments);
      setTimeout(instalarBotonesReenvio,0);
      return r;
    };
    try{ renderHistorialValidacionLocal = window.renderHistorialValidacionLocal; }catch(_){}
  }

  if(typeof cargarBase === "function"){
    window.cargarValidacionesTecnicas = async function(){
      const r = await cargarBase.apply(this,arguments);
      instalarBotonesReenvio();
      return r;
    };
    try{ cargarValidacionesTecnicas = window.cargarValidacionesTecnicas; }catch(_){}
  }

  setTimeout(instalarBotonesReenvio,0);
})();

/* ============================================================
   MI VISUAL V488 - PORTAL VALIDACION TECNICA

   OBJETIVO
   - Separar visualmente Validacion Tecnica en dos submodulos:
       1) RECABLEADO / OTRO
       2) VTR / GAR
   - Conservar una sola fuente oficial: VALIDACION_TECNICA.
   - Conservar optimizacion V341: cache breve + solicitud unica.
   - Conservar V430, V454, historial mensual, informe y permisos.
   - VTR/GAR mantiene la gestion WIN V487.25 de forma independiente.
   - No agrega llamadas a Apps Script al mostrar el portal.
============================================================ */
(function(){
  "use strict";

  if(window.MV488_VT_PORTAL_ACTIVO) return;
  window.MV488_VT_PORTAL_ACTIVO = true;
  window.MV488_VT_MODO = "";

  const mostrarBase = window.mostrarValidacionTecnica;
  const cargarBase = window.cargarValidacionesTecnicas;
  const historialBase = window.renderHistorialValidacionLocal;
  const informeBase = window.abrirInformeValidacionTecnica;
  const filtrarInformeBase = window.filtrarInformeValidacionTecnica;
  let promesaVtrGar = null;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function puedeVer(){
    if(typeof window.pmPuedeVer === "function") return !!window.pmPuedeVer("VALIDACION TECNICA");
    return true;
  }

  function puedeGestionarVtrGar(){
    const perfil = norm(localStorage.getItem("perfil") || "");
    const perfilOk = ["SUPERVISOR","JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfil);
    if(typeof window.pmPuede === "function"){
      return perfilOk && !!window.pmPuede("VALIDACION TECNICA","VALIDAR");
    }
    return perfilOk;
  }

  function listaModo(lista){
    const modo = window.MV488_VT_MODO;
    const origen = Array.isArray(lista) ? lista : [];
    if(modo === "RECABLEADO"){
      return origen.filter(function(x){
        const t = norm(x && (x.tipoValidacion || x.tipo));
        return t !== "VTR" && t !== "GAR";
      });
    }
    if(modo === "VTRGAR"){
      return origen.filter(function(x){
        const t = norm(x && (x.tipoValidacion || x.tipo));
        return t === "VTR" || t === "GAR";
      });
    }
    return origen.slice();
  }

  function estilosPortal(){
    return `<style id="mv488-vt-portal-css">
      .mv488-home{max-width:1000px;margin:auto;padding:18px;color:#fff}
      .mv488-head{background:linear-gradient(110deg,#0f766e,#2563eb);padding:20px;border-radius:20px;margin-bottom:16px;box-shadow:0 12px 28px rgba(15,23,42,.18)}
      .mv488-head h2{margin:0 0 4px;font-size:24px}.mv488-head p{margin:0;opacity:.94;font-size:13px;line-height:1.45}
      .mv488-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
      .mv488-option{background:#fff;color:#0f172a;border:2px solid #bfdbfe;border-radius:18px;padding:22px;cursor:pointer;box-shadow:0 10px 22px rgba(2,6,23,.18);min-height:165px;text-align:left;transition:.18s ease}
      .mv488-option:hover{border-color:#2563eb;transform:translateY(-2px)}
      .mv488-option .ico{font-size:40px;display:block;margin-bottom:8px}.mv488-option b{font-size:21px}.mv488-option p{font-size:13px;color:#475569;line-height:1.45;margin:7px 0 0}
      .mv488-tag{display:inline-flex;margin-top:11px;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;border:1px solid #cbd5e1;background:#f8fafc;color:#475569}
      .mv488-tag.win{background:#dcfce7;color:#166534;border-color:#86efac}
      .mv488-subnav{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 10px}
      .mv488-back{border:0;border-radius:11px;padding:10px 13px;background:#64748b;color:#fff;font-weight:900;cursor:pointer}
      .mv488-mode{display:inline-flex;border-radius:999px;padding:6px 10px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:11px;font-weight:900}
      @media(max-width:700px){.mv488-grid{grid-template-columns:1fr}.mv488-home{padding:10px}.mv488-option{min-height:145px}}
    </style>`;
  }

  function prepararPantallaModulo(){
    if(typeof window.limpiarPantalla === "function"){
      try{ window.limpiarPantalla(); }catch(_){}
    }
    const menu = document.getElementById("menuPrincipal");
    if(menu) menu.style.display = "none";
    if(typeof window.setBotonNavegacion === "function"){
      try{ window.setBotonNavegacion("modulo"); }catch(_){}
    }
  }

  function mostrarPortal(){
    window.MV488_VT_MODO = "";
    if(!puedeVer()){
      if(typeof window.mostrarPantalla === "function"){
        window.mostrarPantalla(`${estilosPortal()}<section class="mv488-home"><div class="mv488-head"><h2>📋 Validación Técnica</h2></div><div class="mv488-option">No tienes permiso para ver Validación Técnica.</div></section>`);
      }
      return;
    }

    prepararPantallaModulo();
    const html = `${estilosPortal()}
      <section class="mv488-home">
        <div class="mv488-head">
          <h2>📋 Validación Técnica</h2>
          <p>Selecciona el tipo de gestión. Cada submódulo conserva su registro, pendientes, historial, permisos y trazabilidad.</p>
        </div>
        <div class="mv488-grid">
          <button type="button" class="mv488-option" onclick="mv488AbrirRecableado()">
            <span class="ico">🔧</span>
            <b>Recableado</b>
            <p>Registro de solicitudes, autorizaciones, validaciones pendientes, observaciones e historial de Recableado/Otro.</p>
            <span class="mv488-tag">FLUJO ACTUAL CONSERVADO</span>
          </button>
          <button type="button" class="mv488-option" onclick="mv488AbrirVtrGar()">
            <span class="ico">📡</span>
            <b>VTR / GAR</b>
            <p>Registro e historial VTR/GAR. Supervisor y Jefatura gestionan responsabilidad con antecedentes WIN y Bono/No Bono por separado.</p>
            <span class="mv488-tag win">FUENTE PRINCIPAL: WIN</span>
          </button>
        </div>
      </section>`;

    if(typeof window.mostrarPantalla === "function") window.mostrarPantalla(html);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function ponerOpcionesSelect(select, opciones, etiquetaTodos){
    if(!select) return;
    const anterior = select.value || "";
    select.innerHTML = `<option value="">${etiquetaTodos}</option>` + opciones.map(function(x){
      return `<option value="${x[0]}">${x[1]}</option>`;
    }).join("");
    const permitidos = opciones.map(function(x){ return x[0]; });
    if(anterior && permitidos.includes(anterior)) select.value = anterior;
  }

  function ajustarFormularioModo(){
    const select = document.getElementById("vtTipoTicket");
    if(!select) return;

    const modo = window.MV488_VT_MODO;
    const valorAnterior = select.value || "";
    const permitidos = modo === "VTRGAR"
      ? ["GAR-","VTR-"]
      : ["AT-","VTEXT-","NO APLICA"];

    Array.from(select.options).forEach(function(op){
      op.hidden = !permitidos.includes(op.value);
      op.disabled = !permitidos.includes(op.value);
    });

    if(!permitidos.includes(valorAnterior)) select.value = permitidos[0];
    if(typeof window.actualizarTipoValidacionPorTicket === "function"){
      try{ window.actualizarTipoValidacionPorTicket(); }catch(_){}
    }
  }

  function ajustarFiltrosModo(){
    const tipo = document.getElementById("vtFiltroTipo");
    if(window.MV488_VT_MODO === "VTRGAR"){
      ponerOpcionesSelect(tipo,[["VTR","VTR"],["GAR","GAR"]],"VTR y GAR");
    }else if(window.MV488_VT_MODO === "RECABLEADO"){
      ponerOpcionesSelect(tipo,[["RECABLEADO","Recableado"],["OTRO","Otro"]],"Recableado y Otro");
    }

    const origen = document.getElementById("vtFiltroOrigen");
    if(origen) origen.style.display = window.MV488_VT_MODO === "VTRGAR" ? "" : "none";
  }

  function actualizarCuadrillasModo(){
    if(typeof window.actualizarOpcionesFiltroCuadrillaVT !== "function") return;
    const original = window.vtValidacionesActuales;
    if(!Array.isArray(original)) return;
    try{
      window.vtValidacionesActuales = listaModo(original);
      window.actualizarOpcionesFiltroCuadrillaVT();
    }catch(_){}
    finally{
      window.vtValidacionesActuales = original;
    }
  }

  function renderPendientesModo(){
    const el = document.getElementById("vtPendientes");
    if(!el || typeof window.renderListaValidaciones !== "function") return;

    if(window.MV488_VT_MODO === "VTRGAR" && puedeGestionarVtrGar()){
      const card = el.closest(".vt-card");
      if(card) card.style.display = "none";
      return;
    }

    const lista = listaModo(window.vtValidacionesActuales || []).filter(function(x){
      return norm(x && x.estado) === "PENDIENTE";
    });

    el.innerHTML = lista.length
      ? window.renderListaValidaciones(lista,true)
      : `<div class="vt-sub">No hay validaciones pendientes en este submódulo.</div>`;
  }

  function agregarSubnav(titulo, icono){
    const wrap = document.querySelector(".vt-wrap");
    if(!wrap || wrap.querySelector(".mv488-subnav")) return;
    const header = wrap.querySelector(".vt-header");
    if(!header) return;

    header.insertAdjacentHTML("beforebegin",`${estilosPortal()}<div class="mv488-subnav">
      <button type="button" class="mv488-back" onclick="mostrarValidacionTecnica()">⬅ Volver a Validación Técnica</button>
      <span class="mv488-mode">${icono} ${titulo}</span>
    </div>`);

    const h2 = header.querySelector("h2");
    const p = header.querySelector("p");
    if(h2) h2.textContent = `${icono} ${titulo.toUpperCase()}`;
    if(p){
      p.textContent = window.MV488_VT_MODO === "VTRGAR"
        ? "Registro, historial y gestión VTR/GAR con trazabilidad. La responsabilidad se analiza con WIN y Bono/No Bono se mantiene como decisión independiente."
        : "Registro, autorización, pendientes e historial de Recableado/Otro. Se conserva el flujo y la aprobación automática vigente.";
    }
  }

  function aplicarVistaModo(){
    if(!window.MV488_VT_MODO) return;
    ajustarFormularioModo();
    ajustarFiltrosModo();
    actualizarCuadrillasModo();
    renderPendientesModo();

    if(typeof window.renderHistorialValidacionLocal === "function"){
      try{ window.renderHistorialValidacionLocal(); }catch(_){}
    }
  }

  function cargarVtrGar(){
    if(window.MI_VISUAL_V48725_VTRGAR_VT_ACTIVO && typeof window.mv48725MontarVtrGarValidacion === "function"){
      return Promise.resolve();
    }
    if(promesaVtrGar) return promesaVtrGar;

    promesaVtrGar = new Promise(function(resolve,reject){
      const inicio = Date.now();
      const existente = Array.from(document.scripts).find(function(s){
        return s.src && s.src.includes("validacion_tecnica_vtrgar_v48725.js");
      });

      if(existente){
        const espera = setInterval(function(){
          if(window.MI_VISUAL_V48725_VTRGAR_VT_ACTIVO && typeof window.mv48725MontarVtrGarValidacion === "function"){
            clearInterval(espera);
            resolve();
          }else if(Date.now() - inicio > 12000){
            clearInterval(espera);
            promesaVtrGar = null;
            reject(new Error("No se pudo terminar de cargar Gestión VTR/GAR."));
          }
        },80);
        return;
      }

      const s = document.createElement("script");
      s.src = `./js/validacion_tecnica_vtrgar_v48725.js?v=V488-${Date.now()}`;
      s.async = true;
      s.onload = function(){ resolve(); };
      s.onerror = function(){
        promesaVtrGar = null;
        reject(new Error("No se pudo cargar Gestión VTR/GAR."));
      };
      document.head.appendChild(s);
    });

    return promesaVtrGar;
  }

  window.mv488AbrirRecableado = function(){
    if(typeof mostrarBase !== "function") return;
    window.MV488_VT_MODO = "RECABLEADO";
    mostrarBase();
    setTimeout(function(){
      agregarSubnav("Recableado","🔧");
      aplicarVistaModo();
    },260);
  };

  window.mv488AbrirVtrGar = function(){
    if(typeof mostrarBase !== "function") return;
    window.MV488_VT_MODO = "VTRGAR";
    mostrarBase();

    setTimeout(function(){
      agregarSubnav("VTR / GAR","📡");
      aplicarVistaModo();
    },260);

    if(puedeGestionarVtrGar()){
      cargarVtrGar().then(function(){
        if(window.MV488_VT_MODO !== "VTRGAR") return;
        if(typeof window.mv48725MontarVtrGarValidacion === "function"){
          window.mv48725MontarVtrGarValidacion();
          setTimeout(function(){
            renderPendientesModo();
          },120);
        }
      }).catch(function(error){
        console.warn("MI VISUAL V488:",error && error.message ? error.message : error);
      });
    }
  };

  if(typeof historialBase === "function"){
    window.renderHistorialValidacionLocal = function(){
      if(!window.MV488_VT_MODO) return historialBase.apply(this,arguments);

      const original = window.vtValidacionesActuales;
      if(!Array.isArray(original)) return historialBase.apply(this,arguments);

      let r;
      try{
        window.vtValidacionesActuales = listaModo(original);
        r = historialBase.apply(this,arguments);
      }finally{
        window.vtValidacionesActuales = original;
      }

      if(window.MV488_VT_MODO === "RECABLEADO"){
        document.querySelectorAll("#vtHistorial .vt-origin-summary").forEach(function(el){ el.remove(); });
      }
      return r;
    };
    try{ renderHistorialValidacionLocal = window.renderHistorialValidacionLocal; }catch(_){}
  }

  if(typeof cargarBase === "function"){
    window.cargarValidacionesTecnicas = async function(){
      const r = await cargarBase.apply(this,arguments);
      if(window.MV488_VT_MODO) aplicarVistaModo();
      return r;
    };
    try{ cargarValidacionesTecnicas = window.cargarValidacionesTecnicas; }catch(_){}
  }

  if(typeof filtrarInformeBase === "function"){
    window.filtrarInformeValidacionTecnica = function(){
      const lista = filtrarInformeBase.apply(this,arguments);
      return listaModo(lista);
    };
    try{ filtrarInformeValidacionTecnica = window.filtrarInformeValidacionTecnica; }catch(_){}
  }

  if(typeof informeBase === "function"){
    window.abrirInformeValidacionTecnica = function(){
      const r = informeBase.apply(this,arguments);
      setTimeout(function(){
        const select = document.getElementById("vtInformeTipo");
        if(!select || !window.MV488_VT_MODO) return;
        if(window.MV488_VT_MODO === "VTRGAR"){
          ponerOpcionesSelect(select,[["VTR","VTR"],["GAR","GAR"]],"VTR y GAR");
        }else{
          ponerOpcionesSelect(select,[["RECABLEADO","Recableado"],["OTRO","Otro"]],"Recableado y Otro");
        }
      },0);
      return r;
    };
    try{ abrirInformeValidacionTecnica = window.abrirInformeValidacionTecnica; }catch(_){}
  }

  window.mostrarValidacionTecnica = mostrarPortal;
  try{ mostrarValidacionTecnica = mostrarPortal; }catch(_){}
})();
