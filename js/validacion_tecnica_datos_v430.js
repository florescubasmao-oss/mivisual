/* ============================================================
   MI VISUAL V531 - Datos correctos en Validación Técnica
   ESTABILIZACIÓN MULTITICKET 05/09/2026:
   - Conserva íntegro el flujo V430B de búsqueda DNI/Código.
   - Conserva Ingreso manual y Cliente/Código validado + ticket manual.
   - Cuando existe UNA coincidencia mantiene la selección automática vigente.
   - Cuando existen DOS O MÁS coincidencias, las opciones ya no dependen de
     onclick inline ni de capas externas: cada opción es un botón real y llama
     directamente a seleccionarCandidato() dentro de esta misma capa V430.
   - Evita reiniciar el estado si la interfaz ya estaba instalada.
   - Descarta respuestas tardías de búsqueda si el técnico cambia a Manual.
   - Oculta la cuadrilla únicamente en resultados visibles del perfil TÉCNICO.
   - No modifica validacion_tecnica_v173.js.
   - No modifica validacion_tecnica_optimizacion_v341.js.
   - No modifica API, permisos, perfiles, historial, bonos ni otros módulos.
============================================================ */
(function(){
  "use strict";

  if(window.MV430_VALIDACION_DATOS_OK) return;
  window.MV430_VALIDACION_DATOS_OK = true;

  const CACHE_MS = 60 * 1000;
  const cacheBusqueda = new Map();
  let secuenciaBusqueda = 0;

  let estado = {
    modo: "VALIDADO",
    consulta: "",
    candidatos: [],
    candidato: null,
    identidad: null
  };

  const mostrarOriginal = window.mostrarValidacionTecnica;
  const guardarOriginal = window.guardarValidacionTecnica;
  const apiAnterior = window.apiValidacionTecnica;

  function texto(v){ return String(v ?? "").trim(); }

  function normal(v){
    return texto(v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(v){
    return texto(v).replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function usuario(){
    return localStorage.getItem("usuario") || "";
  }

  function esTecnico(){
    return normal(localStorage.getItem("perfil") || "") === "TECNICO";
  }

  function asegurarEstilos(){
    if(document.getElementById("vt430Styles")) return;
    const s=document.createElement("style");
    s.id="vt430Styles";
    s.textContent=`
      .vt430-busqueda{
        margin:0 0 14px;padding:12px;border:1px solid #bfdbfe;
        background:linear-gradient(135deg,#eff6ff,#f8fbff);
        border-radius:15px
      }
      .vt430-busqueda h4{margin:0 0 8px;color:#1e3a8a;font-size:14px}
      .vt430-search-grid{
        display:grid;grid-template-columns:minmax(0,1fr) auto auto;
        gap:8px;align-items:end
      }
      .vt430-search-grid input{
        width:100%;box-sizing:border-box;border:1px solid #93c5fd;
        border-radius:11px;padding:11px;font-size:14px;background:#fff
      }
      .vt430-search-label{
        display:block;font-size:11px;font-weight:900;color:#334155;
        text-transform:uppercase;margin-bottom:5px
      }
      .vt430-resultados{display:grid;gap:8px;margin-top:10px}
      .vt430-candidato{
        display:block;width:100%;box-sizing:border-box;text-align:left;
        border:1px solid #cbd5e1;background:#fff;border-radius:13px;
        padding:10px;cursor:pointer;transition:.15s ease;
        font:inherit;color:inherit;appearance:none;-webkit-appearance:none;
        touch-action:manipulation
      }
      .vt430-candidato:hover{border-color:#2563eb;box-shadow:0 5px 14px rgba(37,99,235,.12)}
      .vt430-candidato:focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:2px}
      .vt430-candidato strong{display:block;color:#0f172a;font-size:14px}
      .vt430-candidato small{display:block;color:#64748b;font-size:11px;line-height:1.4;margin-top:3px}
      .vt430-candidato.sel{border:2px solid #16a34a;background:#f0fdf4}
      .vt430-pill{
        display:inline-flex;margin:5px 5px 0 0;padding:4px 7px;border-radius:999px;
        font-size:10px;font-weight:900;background:#dbeafe;color:#1d4ed8
      }
      .vt430-validado{
        margin-top:10px;padding:10px 11px;border-radius:12px;
        background:#dcfce7;border:1px solid #86efac;color:#166534;
        font-size:12px;line-height:1.45
      }
      .vt430-warn{
        margin-top:10px;padding:10px 11px;border-radius:12px;
        background:#fff7ed;border:1px solid #fdba74;color:#9a3412;
        font-size:12px;line-height:1.45
      }
      .vt430-info{
        margin-top:10px;padding:10px 11px;border-radius:12px;
        background:#f8fafc;border:1px solid #dbe3ee;color:#475569;
        font-size:12px;line-height:1.45
      }
      .vt430-cliente input{background:#f1f5f9!important;font-weight:800;color:#0f172a}
      .vt430-locked{background:#f1f5f9!important;color:#334155!important;font-weight:700}
      @media(max-width:640px){
        .vt430-search-grid{grid-template-columns:1fr}
        .vt430-search-grid .vt-btn{width:100%}
      }
    `;
    document.head.appendChild(s);
  }

  async function apiGet430(consulta){
    const clave=normal(consulta);
    const cached=cacheBusqueda.get(clave);
    if(cached && Date.now()-cached.fecha<CACHE_MS) return cached.data;

    const payload={
      accion:"buscarDatosValidacionTecnicaV430",
      usuario:usuario(),
      consulta:texto(consulta)
    };

    let data;
    if(typeof window.mv336ApiGet==="function"){
      data=await window.mv336ApiGet(
        window.API_VALIDACION_TECNICA || window.MI_VISUAL_API_URL,
        payload,
        {intentos:2,tiempoMs:25000}
      );
    }else{
      const api=window.API_VALIDACION_TECNICA || window.MI_VISUAL_API_URL;
      const u=new URL(api);
      Object.entries(payload).forEach(([k,v])=>u.searchParams.set(k,String(v)));
      const controller=typeof AbortController==="function"?new AbortController():null;
      const timer=controller?setTimeout(()=>controller.abort(),25000):null;
      try{
        const r=await fetch(u.toString(),{
          method:"GET",cache:"no-store",
          signal:controller?controller.signal:undefined
        });
        const txt=await r.text();
        try{data=JSON.parse(txt);}catch(_){throw new Error("Respuesta inválida al consultar datos del cliente.");}
      }finally{
        if(timer)clearTimeout(timer);
      }
    }

    if(!data || data.ok===false) throw new Error(data?.error || "No se pudo consultar la atención.");
    cacheBusqueda.set(clave,{fecha:Date.now(),data});
    return data;
  }

  function limpiarEstado(){
    secuenciaBusqueda++;
    estado={
      modo:"VALIDADO",
      consulta:"",
      candidatos:[],
      candidato:null,
      identidad:null
    };
  }

  function campo(id){ return document.getElementById(id); }

  function bloquearDatos(bloquear){
    const tipo=campo("vtTipoTicket");
    const numero=campo("vtNumeroTicket");
    const codigo=campo("vtCodigo");
    const dni=campo("vtDniCliente");

    if(tipo){
      tipo.disabled=!!bloquear;
      tipo.classList.toggle("vt430-locked",!!bloquear);
    }
    [numero,codigo,dni].forEach(el=>{
      if(!el)return;
      el.readOnly=!!bloquear;
      el.classList.toggle("vt430-locked",!!bloquear);
    });
  }

  function bloquearSoloIdentidad(){
    const tipo=campo("vtTipoTicket");
    const numero=campo("vtNumeroTicket");
    const codigo=campo("vtCodigo");
    const dni=campo("vtDniCliente");

    if(tipo){
      tipo.disabled=false;
      tipo.classList.remove("vt430-locked");
    }
    if(numero){
      numero.readOnly=false;
      numero.classList.remove("vt430-locked");
    }
    [codigo,dni].forEach(el=>{
      if(!el)return;
      el.readOnly=true;
      el.classList.add("vt430-locked");
    });
  }

  function limpiarCampos(){
    const ids=["vtNumeroTicket","vtCodigo","vtDniCliente","vtClienteNombreV430","vtOrigenOrden"];
    ids.forEach(id=>{const el=campo(id);if(el)el.value="";});
    const tipo=campo("vtTipoTicket");
    if(tipo)tipo.value="AT-";
    if(typeof window.actualizarTipoValidacionPorTicket==="function"){
      window.actualizarTipoValidacionPorTicket();
    }
  }

  function resumenCandidato(c){
    return `
      <strong>${esc(c.ticketFinal)} · ${esc(c.tipoValidacion)}</strong>
      <small>
        Código: <b>${esc(c.codigo||"-")}</b>
        ${c.codigoOrden?` · Orden: ${esc(c.codigoOrden)}`:""}
        · Fecha: ${esc(c.fecha||"-")}<br>
        ${esc(c.cliente||"Cliente no informado")} · DNI ${esc(c.dni||"-")}
        ${!esTecnico() && c.cuadrilla?` · ${esc(c.cuadrilla)}`:""}
      </small>
      <span class="vt430-pill">${esc((c.fuentes||[]).join(" + ")||"Base operativa")}</span>
    `;
  }

  function enlazarCandidatos(){
    const cont=campo("vt430Resultados");
    if(!cont)return;

    cont.querySelectorAll(".vt430-candidato[data-vt430-index]").forEach(function(card){
      if(card.dataset.vt430Bound==="1") return;
      card.dataset.vt430Bound="1";
      card.addEventListener("click",function(){
        const indice=Number(card.dataset.vt430Index);
        if(!Number.isInteger(indice) || indice<0) return;
        seleccionarCandidato(indice);
      });
    });
  }

  function renderResultados(){
    const cont=campo("vt430Resultados");
    if(!cont)return;

    if(!estado.candidatos.length){
      const i=estado.identidad;
      if(i && (i.codigo||i.dni||i.cliente)){
        cont.innerHTML=`
          <div class="vt430-warn">
            <b>Cliente/orden encontrados, pero no existe un ticket validado en las fuentes consultadas.</b><br>
            ${esc(i.cliente||"")} ${i.dni?`· DNI ${esc(i.dni)}`:""} ${i.codigo?`· Código ${esc(i.codigo)}`:""}
          </div>
          <button class="vt-btn warn" type="button" onclick="vt430UsarIdentidadManual()" style="margin-top:8px">
            ✍️ Usar cliente validado y completar ticket manual
          </button>`;
      }else{
        cont.innerHTML=`
          <div class="vt430-warn">
            No se encontraron coincidencias exactas por DNI o Código.
            Puede revisar el dato o usar el ingreso manual si se trata de un caso excepcional.
          </div>`;
      }
      return;
    }

    if(estado.candidatos.length===1){
      seleccionarCandidato(0);
      return;
    }

    cont.innerHTML=`
      <div class="vt430-info">
        <b>Se encontraron ${estado.candidatos.length} atenciones.</b>
        Seleccione el ticket exacto que corresponde al trabajo que está validando.
      </div>
      ${estado.candidatos.map((c,i)=>`
        <button type="button" class="vt430-candidato" data-vt430-index="${i}">
          ${resumenCandidato(c)}
        </button>`).join("")}`;

    enlazarCandidatos();
  }

  function seleccionarCandidato(indice){
    const c=estado.candidatos[indice];
    if(!c)return;

    estado.candidato=c;
    estado.modo="VALIDADO";

    const tipo=campo("vtTipoTicket");
    const numero=campo("vtNumeroTicket");
    const codigo=campo("vtCodigo");
    const dni=campo("vtDniCliente");
    const cliente=campo("vtClienteNombreV430");

    if(tipo)tipo.value=c.tipoTicket||"AT-";
    if(numero)numero.value=c.numeroTicket||"";
    if(codigo)codigo.value=c.codigo||"";
    if(dni)dni.value=c.dni||"";
    if(cliente)cliente.value=c.cliente||"";

    bloquearDatos(true);

    if(typeof window.actualizarTipoValidacionPorTicket==="function"){
      window.actualizarTipoValidacionPorTicket();
    }

    const cont=campo("vt430Resultados");
    if(cont){
      cont.innerHTML=`
        <div class="vt430-validado">
          ✅ <b>Atención validada por MI VISUAL</b><br>
          ${esc(c.ticketFinal)} · Código ${esc(c.codigo)} · DNI ${esc(c.dni)}
          ${c.cliente?`<br>Cliente: <b>${esc(c.cliente)}</b>`:""}
          ${!esTecnico() && c.cuadrilla?` · Cuadrilla: ${esc(c.cuadrilla)}`:""}
          <br><button class="vt-btn secondary" type="button" onclick="vt430CambiarAtencion()" style="margin-top:8px">🔄 Cambiar atención</button>
        </div>`;
    }
  }

  async function buscar(){
    const q=texto(campo("vt430Consulta")?.value);
    const cont=campo("vt430Resultados");

    if(!q){
      if(cont)cont.innerHTML=`<div class="vt430-warn">Ingrese DNI o Código.</div>`;
      return;
    }

    if(q.length<5){
      if(cont)cont.innerHTML=`<div class="vt430-warn">Ingrese al menos 5 caracteres para realizar una búsqueda exacta.</div>`;
      return;
    }

    const secuencia=++secuenciaBusqueda;

    try{
      if(cont)cont.innerHTML=`<div class="vt430-info">⏳ Buscando coincidencias exactas...</div>`;
      const d=await apiGet430(q);

      if(secuencia!==secuenciaBusqueda) return;

      estado.consulta=q;
      estado.candidatos=Array.isArray(d.candidatos)?d.candidatos:[];
      estado.identidad=d.identidad||null;
      estado.candidato=null;
      estado.modo="VALIDADO";

      limpiarCampos();
      bloquearDatos(true);
      renderResultados();
    }catch(e){
      if(secuencia!==secuenciaBusqueda) return;
      if(cont)cont.innerHTML=`<div class="vt430-warn">❌ ${esc(e.message)}</div>`;
    }
  }

  function cambiarAtencion(){
    secuenciaBusqueda++;
    estado.candidato=null;
    estado.modo="VALIDADO";
    limpiarCampos();
    bloquearDatos(true);
    const cont=campo("vt430Resultados");
    if(cont){
      if(estado.candidatos.length>1){
        cont.innerHTML=estado.candidatos.map((c,i)=>`
          <button type="button" class="vt430-candidato" data-vt430-index="${i}">
            ${resumenCandidato(c)}
          </button>
        `).join("");
        enlazarCandidatos();
      }else{
        cont.innerHTML=`<div class="vt430-info">Pulse Buscar para seleccionar nuevamente la atención.</div>`;
      }
    }
  }

  function activarManual(){
    secuenciaBusqueda++;
    estado.modo="MANUAL";
    estado.candidato=null;
    estado.identidad=null;
    limpiarCampos();
    bloquearDatos(false);

    const cliente=campo("vtClienteNombreV430");
    if(cliente)cliente.value="";

    const cont=campo("vt430Resultados");
    if(cont)cont.innerHTML=`
      <div class="vt430-warn">
        ⚠️ <b>Ingreso manual habilitado.</b>
        Use esta opción solo cuando la atención no se encuentre en las fuentes operativas.
        MI VISUAL seguirá validando formato y campos obligatorios.
      </div>`;
  }

  function usarIdentidadManual(){
    const i=estado.identidad;
    if(!i)return;

    secuenciaBusqueda++;
    estado.modo="MANUAL_TICKET";
    estado.candidato=null;

    const codigo=campo("vtCodigo");
    const dni=campo("vtDniCliente");
    const cliente=campo("vtClienteNombreV430");

    if(codigo)codigo.value=i.codigo||"";
    if(dni)dni.value=i.dni||"";
    if(cliente)cliente.value=i.cliente||"";

    bloquearSoloIdentidad();

    const cont=campo("vt430Resultados");
    if(cont)cont.innerHTML=`
      <div class="vt430-validado">
        ✅ Cliente y Código validados. Complete únicamente el Tipo/Número de ticket.
        ${i.cliente?`<br>Cliente: <b>${esc(i.cliente)}</b>`:""}
        ${i.codigo?` · Código: ${esc(i.codigo)}`:""}
        ${i.dni?` · DNI: ${esc(i.dni)}`:""}
      </div>`;

    if(typeof window.actualizarTipoValidacionPorTicket==="function"){
      window.actualizarTipoValidacionPorTicket();
    }
  }

  function instalarInterfaz(){
    asegurarEstilos();

    const codigo=campo("vtCodigo");
    const dni=campo("vtDniCliente");
    if(!codigo || !dni)return;

    const cardNueva=codigo.closest(".vt-card");
    if(!cardNueva)return;

    if(document.getElementById("vt430Busqueda"))return;

    limpiarEstado();

    const titulo=cardNueva.querySelector("h3");
    if(titulo){
      titulo.insertAdjacentHTML("afterend",`
        <div class="vt430-busqueda" id="vt430Busqueda">
          <h4>🔎 Validar cliente, Código y Ticket antes de registrar</h4>
          <div class="vt430-search-grid">
            <div>
              <label class="vt430-search-label">DNI o Código</label>
              <input id="vt430Consulta" type="search"
                placeholder="Ingrese DNI o Código"
                onkeydown="if(event.key==='Enter'){event.preventDefault();vt430BuscarDatos();}">
            </div>
            <button class="vt-btn" type="button" onclick="vt430BuscarDatos()">🔎 Buscar</button>
            <button class="vt-btn secondary" type="button" onclick="vt430ActivarManual()">✍️ Ingreso manual</button>
          </div>
          <div id="vt430Resultados" class="vt430-resultados">
            <div class="vt430-info">
              MI VISUAL consultará las fuentes operativas solo cuando pulse Buscar.
              Si un DNI tiene varios tickets, podrá elegir la atención correcta.
            </div>
          </div>
        </div>`);
    }

    if(!document.getElementById("vtClienteNombreV430")){
      const dniField=dni.closest(".vt-field");
      if(dniField){
        dniField.insertAdjacentHTML("afterend",`
          <div class="vt-field vt430-cliente">
            <label>Nombre del cliente</label>
            <input id="vtClienteNombreV430" type="text" readonly aria-readonly="true" placeholder="Se completa al validar la atención">
          </div>`);
      }
    }

    bloquearDatos(true);
  }

  function validarAntesGuardar(){
    const tipo=campo("vtTipoTicket")?.value||"";
    const numero=texto(campo("vtNumeroTicket")?.value);

    if(estado.modo==="VALIDADO" && !estado.candidato){
      alert("Primero busque el DNI o Código y seleccione la atención correcta.");
      return false;
    }

    if(tipo!=="NO APLICA" && numero && !/^\d+$/.test(numero)){
      alert("El número de ticket debe contener solo números. El prefijo se selecciona en Tipo de ticket.");
      return false;
    }

    if(estado.candidato){
      const c=estado.candidato;
      if(
        normal(c.tipoTicket)!==normal(tipo) ||
        texto(c.numeroTicket)!==numero ||
        normal(c.codigo)!==normal(campo("vtCodigo")?.value) ||
        normal(c.dni)!==normal(campo("vtDniCliente")?.value)
      ){
        alert("Los datos validados fueron modificados. Vuelva a seleccionar la atención.");
        return false;
      }
    }

    return true;
  }

  if(typeof mostrarOriginal==="function"){
    window.mostrarValidacionTecnica=function(){
      const r=mostrarOriginal.apply(this,arguments);
      setTimeout(instalarInterfaz,40);
      return r;
    };
    try{mostrarValidacionTecnica=window.mostrarValidacionTecnica;}catch(_){}
  }

  if(typeof guardarOriginal==="function"){
    window.guardarValidacionTecnica=function(btn){
      if(!validarAntesGuardar())return;
      return guardarOriginal.call(this,btn);
    };
    try{guardarValidacionTecnica=window.guardarValidacionTecnica;}catch(_){}
  }

  if(typeof apiAnterior==="function"){
    window.apiValidacionTecnica=async function(payload){
      const solicitud=Object.assign({},payload||{});

      if(solicitud.accion==="registrarValidacionTecnica"){
        if(estado.candidato){
          solicitud.validacionFuenteV430="SI";
          solicitud.claveFuenteV430=estado.candidato.claveFuente||"";
          solicitud.clienteFuenteV430=estado.candidato.cliente||"";
        }else{
          solicitud.validacionFuenteV430=estado.modo==="MANUAL_TICKET"?"IDENTIDAD":"MANUAL";
          solicitud.clienteFuenteV430=texto(campo("vtClienteNombreV430")?.value);
        }
      }

      return apiAnterior(solicitud);
    };
  }

  window.vt430BuscarDatos=buscar;
  window.vt430SeleccionarCandidato=seleccionarCandidato;
  window.vt430CambiarAtencion=cambiarAtencion;
  window.vt430ActivarManual=activarManual;
  window.vt430UsarIdentidadManual=usarIdentidadManual;

  console.log("MI VISUAL V531: selección multiticket directa dentro de V430; sin onclick inline en candidatos.");
})();