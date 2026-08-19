/* =====================================================
   MI VISUAL V411 - Carga dinámica + corrección SLA y Ranking
   - El inicio descarga solo el núcleo de la aplicación.
   - Cada opción carga su JavaScript al abrirse.
   - Evita descargas duplicadas y conserva funciones estables.
===================================================== */
(function(){
  "use strict";

  const VERSION = "V448-SESION-RECUPERABLE-20260819";
  const MODULOS = {
    dashboards_core: {
      archivos: [
        `./js/dashboards.js?v=V449-SIN-ACTIVIDAD-META`,
        `./js/resumen_dashboard_v361.js?v=V408-RESTAURA-V403`,
        `./js/sla_gestion_v363.js?v=V408-RESTAURA-V403`,
        `./js/sla_excepciones_v411.js?v=V411-SLA-EXCEPCIONES`,
        `./js/dashboard_consolidado_v365.js?v=V408-RESTAURA-V403`,
        `./js/dashboard_sla_tools_v366.js?v=V408-RESTAURA-V403`,
        `./js/informe_gerencial_lazy_v361.js?v=V408-RESTAURA-V403`
      ],
      entradas: [
        "mostrarProduccionV2",
        "mostrarDashboardSupervisor",
        "mostrarDashboardJefatura",
        "mostrarTiempoGestionSla"
      ]
    },
    mi_desempeno: {
      depende: ["dashboards_core", "indicadores", "ranking"],
      archivos: [`./js/mi_desempeno_v363.js?v=V408-RESTAURA-V403`],
      entradas: ["mostrarMiDesempeno"]
    },
    dashboard: {
      depende: ["dashboards_core"],
      archivos: [
        `./js/bono_supervisores.js?v=V408-RESTAURA-V403`,
        `./js/bono_supervisores_habilitados_v450.js?v=V450-HABILITACION-BONO`
      ],
      entradas: ["mostrarBonosSupervisores"]
    },
    indicadores: {
      archivos: [`./js/indicadores.js?v=${VERSION}`],
      entradas: ["mostrarEfectividad", "mostrarRecableado", "mostrarVTRGAR"]
    },
    ranking: {
      depende: ["dashboards_core"],
      archivos: [
        `./js/ranking.js?v=V408-RANKING-CORRECTO`,
        `./js/ranking_informe_v358.js?v=V415-RANKING-SLA-PRIMERA-CARGA`
      ],
      entradas: ["mostrarRanking"]
    },
    bonos: {
      archivos: [`./js/bonos.js?v=V408-RESTAURA-V403`],
      entradas: ["mostrarBonos"]
    },
    observaciones: {
      archivos: [
        `./js/observaciones.js?v=V447-OBS-GUARDADO-RAPIDO`,
        `./js/observaciones_informe_v357.js?v=V408-RESTAURA-V403`
      ],
      entradas: ["mostrarObservaciones"]
    },
    accesos: {
      archivos: [
        `./js/accesos.js?v=${VERSION}`,
        `./js/accesos_certificacion_v362.js?v=V408-RESTAURA-V403`,
        `./js/accesos_simulacro_v383.js?v=V408-RESTAURA-V403`
      ],
      entradas: ["mostrarAccesos", "mostrarBiblioteca", "mostrarCapacitacion"]
    },
    actividad: {
      depende: ["checklist"],
      archivos: [
        `./js/actividad_campo.js?v=V426-GENERAR-AUDITORIA`,
        `./js/actividad_galeria_v371.js?v=V408-RESTAURA-V403`,
        `./js/actividad_imagen_robusta_v384.js?v=V408-RESTAURA-V403`,
        `./js/asignaciones_campo_v424.js?v=V428-DESPLEGABLES`
      ],
      entradas: ["mostrarActividadCampo"]
    },
    validacion: {
      archivos: [
        `./js/validacion_tecnica_v173.js?v=${VERSION}`,
        `./js/validacion_tecnica_optimizacion_v341.js?v=${VERSION}`,
        `./js/validacion_tecnica_datos_v430.js?v=V430-DATOS-CORRECTOS`
      ],
      entradas: ["mostrarValidacionTecnica"]
    },
    actas: {
      archivos: [
        `./js/actas.js?v=V416-ACTAS-RESUMEN-FILTRO-PEDIDO`,
        `./js/actas_pdf_movil_v373.js?v=V408-RESTAURA-V403`,
        `./js/actas_correccion_v387.js?v=V408-RESTAURA-V403`,
        `./js/actas_api_resiliente_v392.js?v=V408-RESTAURA-V403`,
        `./js/actas_observaciones_v393.js?v=V408-RESTAURA-V403`,
        `./js/actas_control_finalizadas_v396.js?v=V408-RESTAURA-V403`,
        `./js/actas_mantenimiento_v402.js?v=V408-RESTAURA-V403`,
        `./js/actas_motivos_observacion_v403.js?v=V408-RESTAURA-V403`
      ],
      entradas: ["mostrarGestionActas"]
    },
    equipos: {
      archivos: [`./js/equipos_averiados.js?v=V408-RESTAURA-V403`],
      entradas: ["mostrarEquiposAveriados"]
    },
    analisis: {
      archivos: [`./js/analisis_economico.js?v=V449-META-PROGRAMADA`],
      entradas: ["mostrarAnalisisEconomico"]
    },
    checklist: {
      archivos: [
        `./js/checklist_almacen.js?v=V408-RESTAURA-V403`,
        `./js/checklist_confirmacion_v398.js?v=V408-RESTAURA-V403`
      ],
      entradas: ["mostrarChecklistAlmacen"]
    },
    descansos: {
      archivos: [`./js/programacion_descansos.js?v=V449-SIN-ACTIVIDAD`],
      entradas: ["mostrarProgramacionDescansos"]
    },
    pext: {
      archivos: [`./js/trabajos_conjunta.js?v=${VERSION}`],
      entradas: ["mostrarTrabajosConjunta"]
    },
    mesa: {
      archivos: [`./js/consultas_reclamos.js?v=V408-RESTAURA-V403`],
      entradas: ["mostrarConsultasReclamos"]
    },
    mapa: {
      archivos: [
        `./js/mapa_operativo.js?v=V419-MAPA-MULTIFILTRO-FIX`,
        `./js/mapa_partner_visual_v386.js?v=V408-RESTAURA-V403`,
        `./js/mapa_progreso_v393.js?v=V408-RESTAURA-V403`,
        `./js/mapa_rapido_v395.js?v=V408-RESTAURA-V403`,
        `./js/mapa_campo_v408.js?v=V408-MAPA-CAMPO`,
        `./js/mapa_auditoria_v421.js?v=V426-GENERAR-AUDITORIA`
      ],
      entradas: ["mostrarMapaOperativo"]
    },
    facturas: {
      archivos: [`./js/facturas_v380.js?v=V408-RESTAURA-V403`],
      entradas: ["mostrarFacturas"]
    },
    plantilla: {
      archivos: [`./js/plantilla_orden.js?v=V407-DOCUMENTO-VISIBLE`],
      entradas: ["mostrarPlantillaOrden"]
    },
    seguridad: {
      archivos: [`./js/seguridad_v443.js?v=V443-GUIA-SIN-PREMARCADO-FIX`],
      entradas: ["mostrarSeguridad"]
    },
    administracion: {
      depende: ["dashboards_core", "accesos", "checklist"],
      archivos: [
        `./js/base_operativa.js?v=V408-RESTAURA-V403`,
        `./js/base_operativa_lectura_v385.js?v=V408-RESTAURA-V403`,
        `./js/base_operativa_sync_v367.js?v=V408-RESTAURA-V403`,
        `./js/admin_checklist.js?v=${VERSION}`
      ],
      entradas: ["mostrarAdministracion"]
    }
  };

  const FUNCION_MODULO = {
    mostrarProduccionV2: "dashboards_core",
    mostrarMiDesempeno: "mi_desempeno",
    mostrarTiempoGestionSla: "dashboards_core",
    mostrarDashboardSupervisor: "dashboards_core",
    mostrarDashboardJefatura: "dashboards_core",
    mostrarBonosSupervisores: "dashboard",
    mostrarEfectividad: "indicadores",
    mostrarRecableado: "indicadores",
    mostrarVTRGAR: "indicadores",
    mostrarRanking: "ranking",
    mostrarBonos: "bonos",
    mostrarObservaciones: "observaciones",
    mostrarAccesos: "accesos",
    mostrarBiblioteca: "accesos",
    mostrarCapacitacion: "accesos",
    mostrarActividadCampo: "actividad",
    mostrarValidacionTecnica: "validacion",
    mostrarGestionActas: "actas",
    mostrarEquiposAveriados: "equipos",
    mostrarAnalisisEconomico: "analisis",
    mostrarChecklistAlmacen: "checklist",
    mostrarProgramacionDescansos: "descansos",
    mostrarTrabajosConjunta: "pext",
    mostrarConsultasReclamos: "mesa",
    mostrarMapaOperativo: "mapa",
    mostrarFacturas: "facturas",
    mostrarPlantillaOrden: "plantilla",
    mostrarSeguridad: "seguridad",
    mostrarAdministracion: "administracion"
  };

  const promesasScript = new Map();
  const promesasModulo = new Map();
  const modulosListos = new Set();
  const implementaciones = Object.create(null);
  const wrappers = Object.create(null);
  const metricas = [];

  // V420: evita que un script deje el módulo atrapado indefinidamente.
  const MV420_SCRIPT_TIMEOUT_MS = 12000;
  const fallosScript = new Map();

  function urlScriptV420(url){
    const fallos = Number(fallosScript.get(url) || 0);
    if(!fallos) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}mvretry=${Date.now()}-${fallos}`;
  }

  function nombreVisible(id){
    const nombres = {
      dashboards_core:"Datos operativos", dashboard:"Bono Supervisor", mi_desempeno:"Mi Desempeño", indicadores:"Indicadores",
      ranking:"Ranking", bonos:"Bonos", observaciones:"Observaciones", accesos:"Recursos",
      actividad:"Actividad en Campo", validacion:"Validación Técnica", actas:"Gestión de Actas",
      equipos:"Equipos Averiados", analisis:"Análisis Económico", checklist:"Checklist Almacén",
      descansos:"Programación de Descansos", pext:"PEXT", mesa:"Mesa de Ayuda",
      mapa:"Mapa Operativo", plantilla:"Plantilla de Orden", facturas:"Facturas", seguridad:"Seguridad ATS/PETAR", administracion:"Administración"
    };
    return nombres[id] || "módulo";
  }

  function mostrarCarga(id){
    const nombre = nombreVisible(id);
    const html = `<div style="max-width:760px;margin:24px auto;padding:18px;background:#fff;border-radius:18px;color:#0f172a;box-shadow:0 10px 28px rgba(15,23,42,.15);text-align:center">
      <div style="font-size:30px;margin-bottom:8px">⏳</div>
      <b style="font-size:17px">Abriendo ${nombre}...</b>
      <p style="margin:7px 0 0;color:#64748b;font-size:12px">La primera apertura puede tardar unos segundos. Si una descarga no responde, MI VISUAL la cancelará y permitirá reintentar.</p>
      <button type="button" onclick="volverInicio()" style="margin-top:12px;border:0;border-radius:10px;padding:9px 13px;background:#64748b;color:#fff;font-weight:800;cursor:pointer">Volver al menú</button>
    </div>`;
    if(typeof window.mostrarPantalla === "function") window.mostrarPantalla(html);
  }

  function mostrarError(id, error, funcion, args){
    const nombre = nombreVisible(id);
    const mensaje = (error && error.message) ? error.message : "No se pudo cargar el módulo.";
    const reintentoId = `mv339_reintento_${Date.now()}`;
    const html = `<div style="max-width:760px;margin:24px auto;padding:18px;background:#fff7ed;border:2px solid #fb923c;border-radius:18px;color:#9a3412;box-shadow:0 10px 28px rgba(15,23,42,.12)">
      <h3 style="margin:0 0 8px">No se pudo abrir ${nombre}</h3>
      <div style="font-size:13px;line-height:1.45">${String(mensaje).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px">
        <button id="${reintentoId}" type="button" style="border:0;border-radius:10px;padding:10px 14px;background:#ea580c;color:#fff;font-weight:800;cursor:pointer">Reintentar</button>
        <button type="button" onclick="volverInicio()" style="border:0;border-radius:10px;padding:10px 14px;background:#64748b;color:#fff;font-weight:800;cursor:pointer">Volver al menú</button>
      </div>
    </div>`;
    if(typeof window.mostrarPantalla === "function") window.mostrarPantalla(html);
    setTimeout(function(){
      const boton = document.getElementById(reintentoId);
      if(boton) boton.onclick = function(){ abrirFuncion(funcion, args || []); };
    }, 0);
  }

  function restaurarWrappers(){
    Object.keys(wrappers).forEach(nombre => {
      window[nombre] = wrappers[nombre];
    });
  }

  function cargarScript(url){
    if(promesasScript.has(url)) return promesasScript.get(url);

    const rutaBase = url.split("?")[0].replace(/^\.\//,"");
    const existente = Array.from(document.scripts).find(s => s.src && s.src.includes(rutaBase));
    if(existente && existente.dataset.mv339Listo === "si") return Promise.resolve();

    const inicio = performance.now();
    const promesa = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let terminado = false;
      let temporizador = null;

      function limpiar(){
        if(temporizador) clearTimeout(temporizador);
        script.onload = null;
        script.onerror = null;
      }

      function fallar(mensaje){
        if(terminado) return;
        terminado = true;
        limpiar();
        fallosScript.set(url, Number(fallosScript.get(url) || 0) + 1);
        promesasScript.delete(url);
        try{ script.remove(); }catch(_){}
        reject(new Error(mensaje));
      }

      script.src = urlScriptV420(url);
      script.async = true;
      script.dataset.mv339Modulo = "si";

      script.onload = function(){
        if(terminado) return;
        terminado = true;
        limpiar();
        script.dataset.mv339Listo = "si";
        fallosScript.delete(url);
        metricas.push({
          tipo:"script",
          recurso:url,
          ms:Math.round(performance.now()-inicio),
          fecha:Date.now()
        });
        resolve();
      };

      script.onerror = function(){
        fallar("No se pudo descargar un archivo del módulo. Verifique la conexión y pulse Reintentar.");
      };

      temporizador = setTimeout(function(){
        fallar("La carga del módulo superó 12 segundos y fue cancelada para evitar que MI VISUAL quede bloqueado. Pulse Reintentar.");
      }, MV420_SCRIPT_TIMEOUT_MS);

      document.head.appendChild(script);
    });

    promesasScript.set(url, promesa);
    return promesa;
  }

  async function cargarModulo(id){
    if(modulosListos.has(id)) return true;
    if(promesasModulo.has(id)) return promesasModulo.get(id);
    const config = MODULOS[id];
    if(!config) throw new Error(`Módulo no registrado: ${id}`);

    const inicio = performance.now();
    const promesa = (async function(){
      for(const dependencia of (config.depende || [])) await cargarModulo(dependencia);
      for(const archivo of (config.archivos || [])) await cargarScript(archivo);

      for(const nombre of (config.entradas || [])){
        const candidata = window[nombre];
        if(typeof candidata === "function" && candidata !== wrappers[nombre]){
          implementaciones[nombre] = candidata;
        }
      }
      restaurarWrappers();

      for(const nombre of (config.entradas || [])){
        if(typeof implementaciones[nombre] !== "function"){
          throw new Error(`El módulo se descargó, pero no expuso la función ${nombre}.`);
        }
      }

      modulosListos.add(id);
      metricas.push({tipo:"modulo", recurso:id, ms:Math.round(performance.now()-inicio), fecha:Date.now()});

      if(id === "descansos" && typeof window.actualizarIndicadorDescansoMenu === "function"){
        Promise.resolve(window.actualizarIndicadorDescansoMenu()).catch(() => {});
      }
      return true;
    })().catch(error => {
      promesasModulo.delete(id);
      modulosListos.delete(id);
      throw error;
    });

    promesasModulo.set(id, promesa);
    return promesa;
  }

  async function abrirFuncion(nombre, args){
    const modulo = FUNCION_MODULO[nombre];
    try{ if(typeof window.mv448RegistrarModuloActivo === "function") window.mv448RegistrarModuloActivo(modulo,nombre); }catch(_){}
    if(!modulo) throw new Error(`No se encontró el módulo para ${nombre}`);
    if(!modulosListos.has(modulo)) mostrarCarga(modulo);

    try{
      await cargarModulo(modulo);
      const antes = window[`mv339Antes_${nombre}`];
      if(typeof antes === "function"){
        try{ antes(); }catch(_){ }
      }
      const funcion = implementaciones[nombre];
      if(typeof funcion !== "function") throw new Error(`No está disponible la función ${nombre}.`);
      return await funcion.apply(window, Array.isArray(args) ? args : []);
    }catch(error){
      console.error(`V339: error al abrir ${nombre}`, error);
      mostrarError(modulo, error, nombre, args);
      return null;
    }
  }

  Object.keys(FUNCION_MODULO).forEach(nombre => {
    const wrapper = function(){ return abrirFuncion(nombre, Array.from(arguments)); };
    wrapper.__mv339Wrapper = true;
    wrappers[nombre] = wrapper;
    window[nombre] = wrapper;
  });

  function programarCarga(id, demora){
    const conexion = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(conexion && (conexion.saveData || /(^|-)2g$/.test(conexion.effectiveType || ""))) return;
    setTimeout(function(){
      const ejecutar = function(){ cargarModulo(id).catch(error => console.warn(`V339: precarga ${id}`, error)); };
      if(typeof requestIdleCallback === "function") requestIdleCallback(ejecutar, {timeout:2500});
      else ejecutar();
    }, Math.max(0, Number(demora)||0));
  }

  function prepararPerfil(perfil){
    const p = String(perfil || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
    if(p === "TECNICO"){
      programarCarga("dashboards_core",350);
      programarCarga("mi_desempeno",1300);
      programarCarga("validacion",2800);
      return;
    }
    if(p === "SUPERVISOR"){
      programarCarga("dashboards_core",250);
      programarCarga("validacion",1600);
      programarCarga("descansos",2600);
      return;
    }
    if(["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA","GERENCIA GENERAL","GERENCIAL GENERAL","ADMIN","ADMINISTRADOR"].includes(p)){
      programarCarga("dashboards_core",250);
      programarCarga("validacion",1700);
      programarCarga("descansos",2900);
      return;
    }
    if(["ALMACEN","JEFATURA ALMACEN"].includes(p)){
      programarCarga("checklist",700);
      programarCarga("actas",1700);
    }
  }

  window.MV339_LAZY_LOADER = true;
  window.mv339CargarModulo = cargarModulo;
  window.mv339AbrirFuncion = abrirFuncion;
  window.mv339PrepararPerfil = prepararPerfil;
  window.mv339Metricas = metricas;
})();


/* ============================================================
   MI VISUAL V448 - SESIÓN RECUPERABLE + BORRADOR VALIDACIÓN TÉCNICA
   Capa incremental. No modifica autenticación, permisos ni el flujo VT.
   - Si Android/iOS recarga la pestaña, recupera la sesión desde localStorage.
   - Si el usuario estaba en Validación Técnica, reabre ese módulo.
   - Guarda temporalmente el borrador del formulario durante 4 horas.
   - Un ticket previamente validado se vuelve a consultar al recuperar la
     pantalla; no se conserva como "validado" sin comprobarlo de nuevo.
============================================================ */
(function(){
  "use strict";
  if(window.MV448_SESION_RECUPERABLE) return;
  window.MV448_SESION_RECUPERABLE = true;

  const MODULO_KEY_PREFIX = "MV448_MODULO_ACTIVO|";
  const BORRADOR_KEY_PREFIX = "MV448_VT_BORRADOR|";
  const BORRADOR_TTL = 4 * 60 * 60 * 1000;
  const IDS = [
    "vt430Consulta","vtTipoTicket","vtNumeroTicket","vtTipoValidacion",
    "vtOrigenOrden","vtCodigo","vtDniCliente","vtClienteNombreV430","vtMotivo"
  ];

  function usuario(){ return (localStorage.getItem("usuario") || "").trim(); }
  function perfil(){ return (localStorage.getItem("perfil") || "").toUpperCase().trim(); }
  function moduloKey(){ return MODULO_KEY_PREFIX + usuario(); }
  function borradorKey(){ return BORRADOR_KEY_PREFIX + usuario(); }

  function guardarModulo(modulo){
    const u=usuario(); if(!u) return;
    try{
      if(modulo === "validacion"){
        localStorage.setItem(moduloKey(), JSON.stringify({modulo:"validacion",t:Date.now()}));
      }else{
        localStorage.removeItem(moduloKey());
      }
    }catch(_){ }
  }

  window.mv448RegistrarModuloActivo = function(modulo){ guardarModulo(modulo); };

  function estadoModoFormulario(){
    const codigo=document.getElementById("vtCodigo");
    const tipo=document.getElementById("vtTipoTicket");
    if(codigo && codigo.readOnly && tipo && !tipo.disabled) return "IDENTIDAD";
    if((codigo && codigo.readOnly) || (tipo && tipo.disabled)) return "VALIDADO";
    return "MANUAL";
  }

  function capturarBorrador(){
    if(perfil() !== "TECNICO") return;
    const existe=IDS.some(id=>document.getElementById(id));
    if(!existe) return;
    const valores={};
    IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(el) valores[id]=el.value || "";
    });
    const data={t:Date.now(),modo:estadoModoFormulario(),valores};
    try{ localStorage.setItem(borradorKey(),JSON.stringify(data)); }catch(_){ }
  }

  function leerBorrador(){
    try{
      const x=JSON.parse(localStorage.getItem(borradorKey()) || "null");
      if(!x || !x.t || Date.now()-Number(x.t)>BORRADOR_TTL){
        localStorage.removeItem(borradorKey());
        return null;
      }
      return x;
    }catch(_){ return null; }
  }

  function limpiarBorrador(){
    try{ localStorage.removeItem(borradorKey()); }catch(_){ }
  }
  window.mv448LimpiarBorradorVT = limpiarBorrador;

  async function restaurarBorradorEnFormulario(){
    if(perfil() !== "TECNICO") return;
    const b=leerBorrador();
    if(!b || !b.valores) return;

    const motivo=b.valores.vtMotivo || "";
    const origen=b.valores.vtOrigenOrden || "";
    const consulta=b.valores.vt430Consulta || b.valores.vtDniCliente || b.valores.vtCodigo || "";

    // Si el registro era manual, se restaura como manual.
    if(b.modo === "MANUAL" && typeof window.vt430ActivarManual === "function"){
      try{ window.vt430ActivarManual(); }catch(_){ }
      IDS.forEach(id=>{
        const el=document.getElementById(id);
        if(el && b.valores[id] !== undefined) el.value=b.valores[id];
      });
      if(typeof window.actualizarTipoValidacionPorTicket === "function"){
        try{ window.actualizarTipoValidacionPorTicket(); }catch(_){ }
      }
      return;
    }

    // Para datos previamente validados, nunca confiamos solo en localStorage:
    // se vuelve a ejecutar la búsqueda. Si hay varias atenciones, el técnico
    // selecciona nuevamente el ticket correcto.
    const q=document.getElementById("vt430Consulta");
    if(q && consulta){
      q.value=consulta;
      if(typeof window.vt430BuscarDatos === "function"){
        try{ await window.vt430BuscarDatos(); }catch(_){ }
      }
    }

    // Motivo y origen no alteran la identidad validada; se restauran al final.
    const motivoEl=document.getElementById("vtMotivo");
    if(motivoEl) motivoEl.value=motivo;
    const origenEl=document.getElementById("vtOrigenOrden");
    if(origenEl && origen) origenEl.value=origen;
  }

  let restauracionProgramada=false;
  function observarPantalla(){
    const pantalla=document.getElementById("pantalla");
    if(!pantalla) return;
    const obs=new MutationObserver(function(){
      if(document.querySelector(".vt-confirm")){
        limpiarBorrador();
        return;
      }
      if(!restauracionProgramada && document.getElementById("vtCodigo")){
        restauracionProgramada=true;
        setTimeout(async function(){
          try{ await restaurarBorradorEnFormulario(); }
          finally{ restauracionProgramada=false; }
        },140);
      }
    });
    obs.observe(pantalla,{childList:true,subtree:true});
  }

  document.addEventListener("input",function(e){
    if(e && e.target && IDS.includes(e.target.id)) capturarBorrador();
  },true);
  document.addEventListener("change",function(e){
    if(e && e.target && IDS.includes(e.target.id)) capturarBorrador();
  },true);

  async function restaurarSesion(){
    const u=usuario();
    const p=perfil();
    const estado=(localStorage.getItem("estado") || "ACTIVO").toUpperCase().trim();
    if(!u || !p || estado === "BAJA" || estado === "SUSPENDIDO") return;

    const panel=document.getElementById("panelLogin");
    const menu=document.getElementById("menuPrincipal");
    if(panel) panel.style.display="none";
    if(menu) menu.style.display="grid";
    if(typeof window.setBotonNavegacion === "function") window.setBotonNavegacion("menu");

    try{
      if(typeof window.configurarMenu === "function") await window.configurarMenu();
    }catch(error){
      console.warn("V448: no se pudo refrescar el menú durante la recuperación de sesión",error);
    }

    let activo=null;
    try{ activo=JSON.parse(localStorage.getItem(moduloKey()) || "null"); }catch(_){ }
    if(activo && activo.modulo === "validacion" && Date.now()-Number(activo.t||0)<BORRADOR_TTL){
      setTimeout(function(){
        if(typeof window.mostrarValidacionTecnica === "function") window.mostrarValidacionTecnica();
      },180);
    }
  }

  // Evita que una recarga posterior en el menú vuelva a abrir VT.
  const volverOriginal=window.volverInicio;
  if(typeof volverOriginal === "function"){
    window.volverInicio=function(){
      guardarModulo("");
      return volverOriginal.apply(this,arguments);
    };
    try{ volverInicio=window.volverInicio; }catch(_){ }
  }

  window.addEventListener("load",function(){
    observarPantalla();
    setTimeout(restaurarSesion,320);
  });
  window.addEventListener("pageshow",function(e){
    if(e && e.persisted) setTimeout(restaurarSesion,80);
  });
})();
