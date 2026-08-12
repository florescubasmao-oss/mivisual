/* ============================================================
   MI VISUAL V396 - CONTROL DE ACTAS FINALIZADAS

   - Botón separado: "Validar pendientes".
   - Cruza órdenes FINALIZADAS con Gestión de Actas.
   - Técnico: solo su cuadrilla.
   - Supervisor: sus técnicos/cuadrillas.
   - Responsable Almacén: su sede.
   - Jefatura Almacén / Jefatura / Gerencia: vista global.
   - Solo Almacén y Jefatura Almacén conservan la validación documental.
   - Detecta códigos Orden/Pedido invertidos antes de guardar.
============================================================ */
(function(){
  "use strict";

  if(window.MV396_CONTROL_ACTAS_OK) return;

  try{
    if(
      typeof ACTAS_LECTURAS_GET!=="undefined" &&
      ACTAS_LECTURAS_GET instanceof Set
    ){
      ACTAS_LECTURAS_GET.add("listarControlActasFinalizadasV396");
      ACTAS_LECTURAS_GET.add("validarCodigosActaV396");
    }
  }catch(_){}

  const mostrarGestionBase = window.mostrarGestionActas;
  const guardarActaBase = window.guardarActa;
  const apiActasBase = window.apiActas;

  function esc(v){
    if(typeof limpiarHtmlActas==="function"){
      return limpiarHtmlActas(v||"");
    }
    return String(v||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function norm(v){
    return typeof normalizarActas==="function"
      ? normalizarActas(v||"")
      : String(v||"").toUpperCase().trim();
  }

  function periodoActual(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function etiquetaPeriodo(p){
    const meses=[
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];
    const m=String(p||"").match(/^(\d{4})-(\d{2})$/);
    if(!m) return p||"";
    return `${meses[Number(m[2])-1]} ${m[1]}${p===periodoActual()?" — EN CURSO":""}`;
  }

  function estilosV396(){
    if(document.getElementById("mv396ControlActasCss")) return;

    const s=document.createElement("style");
    s.id="mv396ControlActasCss";
    s.textContent=`
      .mv396-control-head{
        background:linear-gradient(135deg,#0f172a,#1e40af);
        color:#fff;border-radius:18px;padding:16px;margin-bottom:12px;
      }
      .mv396-control-head h2{margin:0 0 5px;font-size:22px}
      .mv396-control-head p{margin:0;opacity:.9;font-size:12px}
      .mv396-control-filtros{
        display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;margin:10px 0 12px
      }
      .mv396-control-filtros label{
        display:block;font-size:11px;font-weight:900;color:#cbd5e1;margin-bottom:4px
      }
      .mv396-control-filtros select{
        width:100%;border:1px solid #cbd5e1;border-radius:10px;
        padding:9px;background:#fff;color:#111827;font-weight:800
      }
      .mv396-kpis{
        display:grid;grid-template-columns:repeat(6,minmax(0,1fr));
        gap:8px;margin:12px 0
      }
      .mv396-kpi{
        background:#fff;border:1px solid #e5e7eb;border-radius:13px;
        padding:10px;text-align:center;color:#0f172a
      }
      .mv396-kpi b{display:block;font-size:20px}
      .mv396-kpi span{font-size:10px;font-weight:900;color:#64748b}
      .mv396-lista{display:grid;gap:9px}
      .mv396-card{
        background:#fff;border:1px solid #e5e7eb;border-radius:14px;
        padding:11px;color:#111827;box-shadow:0 4px 12px rgba(15,23,42,.06);
        content-visibility:auto;contain-intrinsic-size:auto 150px;
      }
      .mv396-card-top{
        display:flex;justify-content:space-between;gap:8px;align-items:flex-start
      }
      .mv396-card h4{margin:0;font-size:14px}
      .mv396-meta{
        display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
        gap:6px;margin-top:8px
      }
      .mv396-meta div{
        background:#f8fafc;border:1px solid #e5e7eb;border-radius:9px;
        padding:7px;font-size:11px;min-width:0
      }
      .mv396-meta span{display:block;color:#64748b;font-size:9px;font-weight:900}
      .mv396-meta b{word-break:break-word}
      .mv396-estado{
        padding:5px 8px;border-radius:999px;font-weight:900;font-size:10px;
        white-space:nowrap
      }
      .mv396-pendiente{background:#fee2e2;color:#991b1b}
      .mv396-subida{background:#dbeafe;color:#1e40af}
      .mv396-observada{background:#ffedd5;color:#9a3412}
      .mv396-finalizada{background:#dcfce7;color:#166534}
      .mv396-faltante{background:#fef3c7;color:#92400e}
      .mv396-invertidos{background:#ede9fe;color:#6d28d9}
      .mv396-control-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
      .mv396-msg{
        padding:10px;border-radius:11px;background:#eff6ff;color:#1e3a8a;
        font-weight:800;font-size:12px;margin:9px 0
      }
      .mv396-empty{
        padding:20px;text-align:center;background:#f8fafc;
        border-radius:14px;color:#64748b;font-weight:900
      }
      @media(max-width:820px){
        .mv396-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
        .mv396-control-filtros{grid-template-columns:repeat(2,minmax(0,1fr))}
        .mv396-meta{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:480px){
        .mv396-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
        .mv396-control-filtros{grid-template-columns:1fr}
        .mv396-meta{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(s);
  }

  function insertarBotonControl(){
    const wrap=document.querySelector(".actas-wrap");
    const acciones=wrap?.querySelector(".actas-actions");
    if(!acciones) return;
    if(document.getElementById("mv396BtnControlActas")) return;

    const btn=document.createElement("button");
    btn.id="mv396BtnControlActas";
    btn.className="actas-btn blue";
    btn.type="button";
    btn.innerHTML="📋 Validar pendientes";
    btn.onclick=()=>mostrarControlActasFinalizadasV396();
    acciones.appendChild(btn);
  }

  function mostrarGestionV396(){
    const r=mostrarGestionBase.apply(this,arguments);
    setTimeout(()=>{
      estilosV396();
      insertarBotonControl();
    },0);
    return r;
  }

  function claseEstado(estado){
    switch(norm(estado)){
      case "SUBIDA": return "mv396-subida";
      case "OBSERVADA": return "mv396-observada";
      case "FINALIZADA": return "mv396-finalizada";
      case "FALTANTE": return "mv396-faltante";
      case "CODIGOS_INVERTIDOS": return "mv396-invertidos";
      default: return "mv396-pendiente";
    }
  }

  function textoEstado(estado){
    switch(norm(estado)){
      case "PENDIENTE_SUBIR": return "PENDIENTE DE SUBIR";
      case "SUBIDA": return "SUBIDA / EN REVISIÓN";
      case "OBSERVADA": return "OBSERVADA";
      case "FINALIZADA": return "FINALIZADA";
      case "FALTANTE": return "ACTA FALTANTE";
      case "CODIGOS_INVERTIDOS": return "CÓDIGOS INVERTIDOS";
      default: return estado||"PENDIENTE";
    }
  }

  function opciones(lista,actual,todas){
    const base=todas!==false
      ? `<option value="">${esc(todas||"Todos")}</option>`
      : "";
    return base+(lista||[]).map(v=>
      `<option value="${esc(v)}" ${String(v)===String(actual)?"selected":""}>${esc(v)}</option>`
    ).join("");
  }

  function esPendienteAccion(estado){
    return [
      "PENDIENTE_SUBIR","OBSERVADA","FALTANTE","CODIGOS_INVERTIDOS"
    ].includes(norm(estado));
  }

  function renderControlV396(){
    const data=window._mv396ControlActasData;
    if(!data) return;

    const cont=document.getElementById("mv396ControlLista");
    const contador=document.getElementById("mv396ControlContador");
    if(!cont) return;

    const estado=document.getElementById("mv396FiltroEstado")?.value||"PENDIENTES";
    const sede=document.getElementById("mv396FiltroSede")?.value||"";
    const cuadrilla=document.getElementById("mv396FiltroCuadrilla")?.value||"";

    let lista=(data.ordenes||[]).slice();

    if(estado==="PENDIENTES"){
      lista=lista.filter(x=>esPendienteAccion(x.estadoControl));
    }else if(estado){
      lista=lista.filter(x=>norm(x.estadoControl)===norm(estado));
    }

    if(sede){
      lista=lista.filter(x=>norm(x.sede)===norm(sede));
    }

    if(cuadrilla){
      lista=lista.filter(x=>norm(x.cuadrilla)===norm(cuadrilla));
    }

    if(contador){
      contador.textContent=`${lista.length} registros mostrados de ${data.registros||0}.`;
    }

    if(!lista.length){
      cont.innerHTML=`<div class="mv396-empty">No hay registros para los filtros seleccionados.</div>`;
      return;
    }

    const u=usuarioActualActas();

    cont.innerHTML=lista.map(x=>{
      let acciones="";

      if(u.perfil==="TECNICO" && norm(x.estadoControl)==="PENDIENTE_SUBIR"){
        acciones+=`
          <button class="actas-btn ok" onclick='mv396SubirActaPendiente(${JSON.stringify(String(x.codigoOrden||""))},${JSON.stringify(String(x.codigoPedido||""))})'>
            + Subir acta
          </button>`;
      }

      if(
        u.perfil==="TECNICO" &&
        norm(x.estadoControl)==="CODIGOS_INVERTIDOS" &&
        x.actaId
      ){
        acciones+=`
          <button class="actas-btn warn" onclick='mv396CorregirActaInvertida(${JSON.stringify(String(x.actaId||""))})'>
            Corregir códigos
          </button>`;
      }

      if(x.linkActa){
        acciones+=`
          <a class="actas-btn sec" href="${esc(x.linkActa)}" target="_blank" rel="noopener">
            Ver PDF
          </a>`;
      }

      const observacion=x.motivoObservacion
        ? `<div class="mv396-msg">⚠ ${esc(x.motivoObservacion)}</div>`
        : "";

      return `
        <div class="mv396-card">
          <div class="mv396-card-top">
            <h4>${esc(x.cuadrilla||"")} · ${esc(x.fechaVisible||"")}</h4>
            <span class="mv396-estado ${claseEstado(x.estadoControl)}">${esc(textoEstado(x.estadoControl))}</span>
          </div>

          <div class="mv396-meta">
            <div><span>CÓDIGO DE ORDEN</span><b>${esc(x.codigoOrden||"SIN DATO")}</b></div>
            <div><span>CÓDIGO DE PEDIDO</span><b>${esc(x.codigoPedido||"SIN DATO")}</b></div>
            <div><span>DNI</span><b>${esc(x.dni||"-")}</b></div>
            <div><span>CLIENTE</span><b>${esc(x.cliente||"-")}</b></div>
            <div><span>SEDE</span><b>${esc(x.sede||"-")}</b></div>
            <div><span>TIPO DE TRABAJO</span><b>${esc(x.tipoTrabajo||x.tipoPartida||"-")}</b></div>
            <div><span>N.º ACTA</span><b>${esc(x.numeroActa||"-")}</b></div>
            <div><span>ENTREGA FÍSICA</span><b>${esc(x.estadoEntregaFisica||"PENDIENTE")}</b></div>
          </div>

          ${norm(x.estadoControl)==="CODIGOS_INVERTIDOS"
            ? `<div class="mv396-msg">
                MI VISUAL detectó que el acta fue registrada con:
                Orden <b>${esc(x.codigoOrdenActa||"")}</b> /
                Pedido <b>${esc(x.codigoPedidoActa||"")}</b>,
                pero la Base Operativa indica:
                Orden <b>${esc(x.codigoOrden||"")}</b> /
                Pedido <b>${esc(x.codigoPedido||"")}</b>.
              </div>`
            : ""}

          ${observacion}

          ${acciones?`<div class="mv396-control-actions">${acciones}</div>`:""}
        </div>`;
    }).join("");
  }

  async function cargarControlV396(periodo){
    const u=usuarioActualActas();
    const cont=document.getElementById("mv396ControlLista");
    if(cont) cont.innerHTML=`<div class="mv396-empty">Consultando órdenes FINALIZADAS...</div>`;

    try{
      const data=await apiActas({
        accion:"listarControlActasFinalizadasV396",
        usuario:u.usuario,
        periodo:periodo||periodoActual(),
        __forzar:true
      });

      window._mv396ControlActasData=data;

      const per=document.getElementById("mv396FiltroPeriodo");
      const sede=document.getElementById("mv396FiltroSede");
      const cuad=document.getElementById("mv396FiltroCuadrilla");

      if(per){
        per.innerHTML=(data.periodos||[]).map(p=>
          `<option value="${esc(p)}" ${p===data.periodo?"selected":""}>${esc(etiquetaPeriodo(p))}</option>`
        ).join("");
      }

      if(sede){
        sede.innerHTML=opciones(data.sedes||[],"","Todas las sedes");
      }

      if(cuad){
        cuad.innerHTML=opciones(data.cuadrillas||[],"","Todas las cuadrillas");
      }

      const r=data.resumen||{};
      const set=(id,v)=>{
        const e=document.getElementById(id);
        if(e)e.textContent=String(v||0);
      };

      set("mv396KpiTotal",r.totalFinalizadas);
      set("mv396KpiPend",r.pendientesSubir);
      set("mv396KpiSub",r.subidas);
      set("mv396KpiObs",r.observadas);
      set("mv396KpiFin",r.finalizadas);
      set("mv396KpiInv",r.codigosInvertidos);

      renderControlV396();

    }catch(error){
      if(cont){
        cont.innerHTML=`<div class="actas-msg err">❌ ${esc(error.message)}</div>`;
      }
    }
  }

  function mostrarControlActasFinalizadasV396(){
    estilosV396();
    if(typeof limpiarPantalla==="function") limpiarPantalla();
    if(typeof setBotonNavegacion==="function") setBotonNavegacion("modulo");

    const pantalla=document.getElementById("pantalla");
    if(!pantalla) return;

    pantalla.innerHTML=`
      ${typeof estiloActas==="function"?estiloActas():""}
      <div class="actas-wrap">
        <div class="mv396-control-head">
          <h2>📋 Validar pendientes de Actas</h2>
          <p>
            Cruce automático entre órdenes FINALIZADAS de la Base Operativa y Gestión de Actas.
            La validación documental sigue correspondiendo únicamente a Almacén y Jefatura de Almacén.
          </p>
        </div>

        <div class="actas-actions">
          <button class="actas-btn sec" onclick="mostrarGestionActas()">← Volver a Gestión de Actas</button>
          <button class="actas-btn blue" onclick="cargarControlV396(document.getElementById('mv396FiltroPeriodo')?.value)">🔄 Actualizar</button>
        </div>

        <div class="mv396-control-filtros">
          <div>
            <label>PERÍODO</label>
            <select id="mv396FiltroPeriodo" onchange="cargarControlV396(this.value)">
              <option value="${periodoActual()}">${esc(etiquetaPeriodo(periodoActual()))}</option>
            </select>
          </div>
          <div>
            <label>ESTADO</label>
            <select id="mv396FiltroEstado" onchange="renderControlV396()">
              <option value="PENDIENTES">Pendientes / requieren acción</option>
              <option value="">Todos</option>
              <option value="PENDIENTE_SUBIR">Pendientes de subir</option>
              <option value="SUBIDA">Subidas / en revisión</option>
              <option value="OBSERVADA">Observadas</option>
              <option value="FINALIZADA">Finalizadas</option>
              <option value="FALTANTE">Acta faltante</option>
              <option value="CODIGOS_INVERTIDOS">Códigos invertidos</option>
            </select>
          </div>
          <div>
            <label>SEDE</label>
            <select id="mv396FiltroSede" onchange="renderControlV396()">
              <option value="">Todas las sedes</option>
            </select>
          </div>
          <div>
            <label>CUADRILLA</label>
            <select id="mv396FiltroCuadrilla" onchange="renderControlV396()">
              <option value="">Todas las cuadrillas</option>
            </select>
          </div>
        </div>

        <div class="mv396-kpis">
          <div class="mv396-kpi"><b id="mv396KpiTotal">0</b><span>FINALIZADAS BASE</span></div>
          <div class="mv396-kpi"><b id="mv396KpiPend">0</b><span>PENDIENTES DE SUBIR</span></div>
          <div class="mv396-kpi"><b id="mv396KpiSub">0</b><span>SUBIDAS / REVISIÓN</span></div>
          <div class="mv396-kpi"><b id="mv396KpiObs">0</b><span>OBSERVADAS</span></div>
          <div class="mv396-kpi"><b id="mv396KpiFin">0</b><span>FINALIZADAS</span></div>
          <div class="mv396-kpi"><b id="mv396KpiInv">0</b><span>CÓDIGOS INVERTIDOS</span></div>
        </div>

        <div id="mv396ControlContador" class="mv396-msg"></div>
        <div id="mv396ControlLista" class="mv396-lista"></div>
      </div>`;

    cargarControlV396(periodoActual());
  }

  function mv396SubirActaPendiente(codigoOrden,codigoPedido){
    if(typeof mostrarFormularioActa!=="function") return;

    mostrarFormularioActa();

    setTimeout(async()=>{
      const orden=document.getElementById("actaCodigoOrden");
      const pedido=document.getElementById("actaCodigoPedido");

      if(orden){
        orden.value=codigoOrden||"";
        orden.dispatchEvent(new Event("input",{bubbles:true}));
      }

      if(pedido){
        pedido.readOnly=false;
        pedido.removeAttribute("readonly");
        pedido.value=codigoPedido||"";
        pedido.dispatchEvent(new Event("input",{bubbles:true}));
      }

      try{
        if(typeof consultarDatosAutomaticosFormularioActa==="function"){
          await consultarDatosAutomaticosFormularioActa();
        }
      }catch(_){}
    },40);
  }

  function mv396CorregirActaInvertida(id){
    if(typeof mv387AbrirCorreccionActa==="function"){
      mv387AbrirCorreccionActa(id,"OBSERVADA");
      return;
    }

    alert("Actualice la aplicación para habilitar la corrección de esta acta.");
  }

  async function validarCodigosFormularioV396(){
    const u=usuarioActualActas();
    const orden=document.getElementById("actaCodigoOrden")?.value?.trim()||"";
    const pedido=document.getElementById("actaCodigoPedido")?.value?.trim()||"";

    if(!orden || !pedido){
      return {estado:"INCOMPLETO"};
    }

    return await apiActas({
      accion:"validarCodigosActaV396",
      usuario:u.usuario,
      codigoOrden:orden,
      codigoPedido:pedido,
      __forzar:true
    });
  }

  async function guardarActaV396(btn){
    let validacion=null;

    try{
      validacion=await validarCodigosFormularioV396();
    }catch(_){
      // Si el control preventivo no responde, no se rompe el flujo
      // tradicional de Gestión de Actas.
      return await guardarActaBase.apply(this,arguments);
    }

    const estado=norm(validacion?.estado);

    if(estado==="INVERTIDOS"){
      const mensaje=
        `⚠ POSIBLE INVERSIÓN DE CÓDIGOS\n\n`+
        `Ingresado:\n`+
        `Código de Orden: ${validacion.codigoOrdenIngresado}\n`+
        `Código de Pedido: ${validacion.codigoPedidoIngresado}\n\n`+
        `Según la Base Operativa:\n`+
        `Código de Orden correcto: ${validacion.codigoOrdenCorrecto}\n`+
        `Código de Pedido correcto: ${validacion.codigoPedidoCorrecto}\n\n`+
        `¿Desea corregirlos automáticamente antes de guardar?`;

      if(!confirm(mensaje)){
        return;
      }

      const orden=document.getElementById("actaCodigoOrden");
      const pedido=document.getElementById("actaCodigoPedido");

      if(orden) orden.value=validacion.codigoOrdenCorrecto||"";
      if(pedido){
        pedido.readOnly=false;
        pedido.removeAttribute("readonly");
        pedido.value=validacion.codigoPedidoCorrecto||"";
      }

      window._mv396CorreccionCodigosPendiente={
        accion:"CORRECCION_AUTOMATICA_INVERTIDOS",
        codigoOrdenIngresado:validacion.codigoOrdenIngresado,
        codigoPedidoIngresado:validacion.codigoPedidoIngresado,
        codigoOrdenCorrecto:validacion.codigoOrdenCorrecto,
        codigoPedidoCorrecto:validacion.codigoPedidoCorrecto,
        periodo:validacion.periodo||"",
        detalle:"MI VISUAL detectó una inversión exacta entre Código de Orden y Código de Pedido."
      };

      try{
        if(typeof consultarDatosAutomaticosFormularioActa==="function"){
          await consultarDatosAutomaticosFormularioActa();
        }
      }catch(_){}

      return await guardarActaBase.apply(this,arguments);
    }

    if(estado==="NO_COINCIDE"){
      const continuar=confirm(
        `⚠ LOS CÓDIGOS NO COINCIDEN CON LA BASE OPERATIVA\n\n`+
        `Ingresado:\n`+
        `Orden: ${validacion.codigoOrdenIngresado}\n`+
        `Pedido: ${validacion.codigoPedidoIngresado}\n\n`+
        `Referencia encontrada:\n`+
        `Orden: ${validacion.codigoOrdenCorrecto||"-"}\n`+
        `Pedido: ${validacion.codigoPedidoCorrecto||"-"}\n\n`+
        `No se realizará una corrección automática porque no es una inversión exacta.\n`+
        `¿Desea continuar con los códigos ingresados?`
      );

      if(!continuar) return;

      window._mv396CorreccionCodigosPendiente={
        accion:"ALERTA_NO_COINCIDE_CONTINUADA",
        codigoOrdenIngresado:validacion.codigoOrdenIngresado,
        codigoPedidoIngresado:validacion.codigoPedidoIngresado,
        codigoOrdenCorrecto:validacion.codigoOrdenCorrecto,
        codigoPedidoCorrecto:validacion.codigoPedidoCorrecto,
        periodo:validacion.periodo||"",
        detalle:"El usuario continuó luego de una alerta de códigos no coincidentes."
      };

      return await guardarActaBase.apply(this,arguments);
    }

    window._mv396CorreccionCodigosPendiente=null;
    return await guardarActaBase.apply(this,arguments);
  }

  async function apiActasV396(payload){
    const solicitud=Object.assign({},payload||{});

    if(
      solicitud.accion==="registrarActaEscaneada" &&
      window._mv396CorreccionCodigosPendiente
    ){
      solicitud.mv396CorreccionCodigos=
        Object.assign({},window._mv396CorreccionCodigosPendiente);
    }

    const data=await apiActasBase(solicitud);

    if(solicitud.accion==="registrarActaEscaneada"){
      window._mv396CorreccionCodigosPendiente=null;
    }

    return data;
  }

  estilosV396();

  if(typeof mostrarGestionBase==="function"){
    window.mostrarGestionActas=mostrarGestionV396;
    try{mostrarGestionActas=mostrarGestionV396}catch(_){}
  }

  if(typeof guardarActaBase==="function"){
    window.guardarActa=guardarActaV396;
    try{guardarActa=guardarActaV396}catch(_){}
  }

  if(typeof apiActasBase==="function"){
    window.apiActas=apiActasV396;
    try{apiActas=apiActasV396}catch(_){}
  }

  window.mostrarControlActasFinalizadasV396=mostrarControlActasFinalizadasV396;
  window.cargarControlV396=cargarControlV396;
  window.renderControlV396=renderControlV396;
  window.mv396SubirActaPendiente=mv396SubirActaPendiente;
  window.mv396CorregirActaInvertida=mv396CorregirActaInvertida;

  window.MV396_CONTROL_ACTAS_OK=true;
  console.log("MI VISUAL V396: Control de Actas FINALIZADAS habilitado.");
})();