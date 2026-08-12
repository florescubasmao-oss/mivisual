/* =====================================================
   MI VISUAL V341 - Carga dinámica de módulos
   - El inicio descarga solo el núcleo de la aplicación.
   - Cada opción carga su JavaScript al abrirse.
   - Evita descargas duplicadas y conserva funciones estables.
===================================================== */
(function(){
  "use strict";

  const VERSION = "V341-VALIDACION-20260803";
  const MODULOS = {
    dashboards_core: {
      archivos: [
        `./js/dashboards.js?v=V378-GERENCIA-GENERAL-DASHBOARD`,
        `./js/resumen_dashboard_v361.js?v=V378-GERENCIA-GENERAL-DASHBOARD`,
        `./js/sla_gestion_v363.js?v=V378-GERENCIA-GENERAL-DASHBOARD`,
        `./js/dashboard_consolidado_v365.js?v=V378-GERENCIA-GENERAL-DASHBOARD`,
        `./js/dashboard_sla_tools_v366.js?v=V378-GERENCIA-GENERAL-DASHBOARD`,
        `./js/informe_gerencial_lazy_v361.js?v=V378-GERENCIA-GENERAL-DASHBOARD`
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
      archivos: [`./js/mi_desempeno_v363.js?v=V373-PDF-ACTAS-MOVIL`],
      entradas: ["mostrarMiDesempeno"]
    },
    dashboard: {
      depende: ["dashboards_core"],
      archivos: [`./js/bono_supervisores.js?v=V373-PDF-ACTAS-MOVIL`],
      entradas: ["mostrarBonosSupervisores"]
    },
    indicadores: {
      archivos: [`./js/indicadores.js?v=${VERSION}`],
      entradas: ["mostrarEfectividad", "mostrarRecableado", "mostrarVTRGAR"]
    },
    ranking: {
      depende: ["dashboards_core"],
      archivos: [
        `./ranking.js?v=V373-PDF-ACTAS-MOVIL`,
        `./js/ranking_informe_v358.js?v=V373-PDF-ACTAS-MOVIL`
      ],
      entradas: ["mostrarRanking"]
    },
    bonos: {
      archivos: [`./js/bonos.js?v=V379-GERENCIA-GENERAL`],
      entradas: ["mostrarBonos"]
    },
    observaciones: {
      archivos: [
        `./js/observaciones.js?v=${VERSION}`,
        `./js/observaciones_informe_v357.js?v=V357-INFORME-OBSERVACIONES`
      ],
      entradas: ["mostrarObservaciones"]
    },
    accesos: {
      archivos: [
        `./js/accesos.js?v=${VERSION}`,
        `./js/accesos_certificacion_v362.js?v=V383-SIMULACRO-CERTIFICACION`,
        `./js/accesos_simulacro_v383.js?v=V383-SIMULACRO-CERTIFICACION`
      ],
      entradas: ["mostrarAccesos", "mostrarBiblioteca", "mostrarCapacitacion"]
    },
    actividad: {
      archivos: [
        `./js/actividad_campo.js?v=V384-ACTIVIDAD-IMAGEN-ROBUSTA`,
        `./js/actividad_galeria_v371.js?v=V384-ACTIVIDAD-IMAGEN-ROBUSTA`,
        `./js/actividad_imagen_robusta_v384.js?v=V384-ACTIVIDAD-IMAGEN-ROBUSTA`
      ],
      entradas: ["mostrarActividadCampo"]
    },
    validacion: {
      archivos: [
        `./js/validacion_tecnica_v173.js?v=${VERSION}`,
        `./js/validacion_tecnica_optimizacion_v341.js?v=${VERSION}`
      ],
      entradas: ["mostrarValidacionTecnica"]
    },
    actas: {
      archivos: [
        `./js/actas.js?v=V373-PDF-ACTAS-MOVIL`,
        `./js/actas_pdf_movil_v373.js?v=V373-PDF-ACTAS-MOVIL`
      ],
      entradas: ["mostrarGestionActas"]
    },
    equipos: {
      archivos: [`./js/equipos_averiados.js?v=${VERSION}`],
      entradas: ["mostrarEquiposAveriados"]
    },
    analisis: {
      archivos: [`./js/analisis_economico.js?v=V376-API-CENTRALIZADA`],
      entradas: ["mostrarAnalisisEconomico"]
    },
    checklist: {
      archivos: [`./js/checklist_almacen.js?v=${VERSION}`],
      entradas: ["mostrarChecklistAlmacen"]
    },
    descansos: {
      archivos: [`./js/programacion_descansos.js?v=${VERSION}`],
      entradas: ["mostrarProgramacionDescansos"]
    },
    pext: {
      archivos: [`./js/trabajos_conjunta.js?v=${VERSION}`],
      entradas: ["mostrarTrabajosConjunta"]
    },
    mesa: {
      archivos: [`./js/consultas_reclamos.js?v=V379-GERENCIA-GENERAL`],
      entradas: ["mostrarConsultasReclamos"]
    },
    mapa: {
      archivos: [
        `./js/mapa_operativo.js?v=V386-MAPA-SOLO-CUADRILLAS-P`,
        `./js/mapa_partner_visual_v386.js?v=V386-MAPA-SOLO-CUADRILLAS-P`
      ],
      entradas: ["mostrarMapaOperativo"]
    },
    facturas: {
      archivos: [`./js/facturas_v380.js?v=V382-FACTURAS-ICONO-CABECERA`],
      entradas: ["mostrarFacturas"]
    },
    plantilla: {
      archivos: [`./js/plantilla_orden.js?v=${VERSION}`],
      entradas: ["mostrarPlantillaOrden"]
    },
    administracion: {
      depende: ["dashboards_core", "accesos", "checklist"],
      archivos: [
        `./js/base_operativa.js?v=V385-BASE-OPERATIVA-SIN-BLOQUEO`,
        `./js/base_operativa_lectura_v385.js?v=V385-BASE-OPERATIVA-SIN-BLOQUEO`,
        `./js/base_operativa_sync_v367.js?v=V385-BASE-OPERATIVA-SIN-BLOQUEO`,
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
    mostrarAdministracion: "administracion"
  };

  const promesasScript = new Map();
  const promesasModulo = new Map();
  const modulosListos = new Set();
  const implementaciones = Object.create(null);
  const wrappers = Object.create(null);
  const metricas = [];

  function nombreVisible(id){
    const nombres = {
      dashboards_core:"Datos operativos", dashboard:"Bono Supervisor", mi_desempeno:"Mi Desempeño", indicadores:"Indicadores",
      ranking:"Ranking", bonos:"Bonos", observaciones:"Observaciones", accesos:"Recursos",
      actividad:"Actividad en Campo", validacion:"Validación Técnica", actas:"Gestión de Actas",
      equipos:"Equipos Averiados", analisis:"Análisis Económico", checklist:"Checklist Almacén",
      descansos:"Programación de Descansos", pext:"PEXT", mesa:"Mesa de Ayuda",
      mapa:"Mapa Operativo", facturas:"Facturas", plantilla:"Plantilla de Orden", administracion:"Administración"
    };
    return nombres[id] || "módulo";
  }

  function mostrarCarga(id){
    const nombre = nombreVisible(id);
    const html = `<div style="max-width:760px;margin:24px auto;padding:18px;background:#fff;border-radius:18px;color:#0f172a;box-shadow:0 10px 28px rgba(15,23,42,.15);text-align:center">
      <div style="font-size:30px;margin-bottom:8px">⏳</div>
      <b style="font-size:17px">Abriendo ${nombre}...</b>
      <p style="margin:7px 0 0;color:#64748b;font-size:12px">La primera apertura puede tardar unos segundos. Las siguientes serán más rápidas.</p>
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
      <button id="${reintentoId}" type="button" style="margin-top:12px;border:0;border-radius:10px;padding:10px 14px;background:#ea580c;color:#fff;font-weight:800;cursor:pointer">Reintentar</button>
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

    const existente = Array.from(document.scripts).find(s => s.src && s.src.includes(url.split("?")[0].replace(/^\.\//,"")));
    if(existente && existente.dataset.mv339Listo === "si") return Promise.resolve();

    const inicio = performance.now();
    const promesa = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.mv339Modulo = "si";
      script.onload = function(){
        script.dataset.mv339Listo = "si";
        metricas.push({tipo:"script", recurso:url, ms:Math.round(performance.now()-inicio), fecha:Date.now()});
        resolve();
      };
      script.onerror = function(){
        promesasScript.delete(url);
        script.remove();
        reject(new Error("No se pudo descargar el archivo del módulo. Verifique la conexión y vuelva a intentar."));
      };
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

  function conexionLenta(){
    const conexion = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(
      conexion &&
      (
        conexion.saveData ||
        /(^|-)2g$/.test(conexion.effectiveType || "")
      )
    );
  }

  function programarCarga(id, demora){
    if(conexionLenta()) return;

    setTimeout(function(){
      const ejecutar = function(){
        cargarModulo(id).catch(error =>
          console.warn(`V366: precarga ${id}`, error)
        );
      };

      if(typeof requestIdleCallback === "function"){
        requestIdleCallback(ejecutar,{timeout:2500});
      }else{
        ejecutar();
      }
    },Math.max(0,Number(demora)||0));
  }

  function programarResumen(demora){
    if(conexionLenta()) return;

    setTimeout(function(){
      const ejecutar = async function(){
        try{
          await cargarModulo("dashboards_core");

          if(
            typeof window.mv361ConsultarResumenDashboardRanking === "function"
          ){
            await window.mv361ConsultarResumenDashboardRanking(
              "",
              false
            );
          }
        }catch(error){
          console.warn(
            "V366: no se pudo precalentar el resumen",
            error
          );
        }
      };

      if(typeof requestIdleCallback === "function"){
        requestIdleCallback(ejecutar,{timeout:3500});
      }else{
        ejecutar();
      }
    },Math.max(0,Number(demora)||0));
  }

  function prepararPerfil(perfil){
    const p = String(perfil || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
    if(p === "TECNICO"){
      programarCarga("dashboards_core",350);
      programarResumen(700);
      programarCarga("mi_desempeno",1300);
      programarCarga("validacion",2800);
      return;
    }

    if(p === "SUPERVISOR"){
      programarCarga("dashboards_core",250);
      programarResumen(550);
      programarCarga("validacion",1600);
      programarCarga("descansos",2600);
      return;
    }

    if([
      "JEFATURA",
      "JEFATURA GENERAL",
      "GERENCIA LIMA",
      "ADMIN",
      "ADMINISTRADOR"
    ].includes(p)){
      programarCarga("dashboards_core",250);
      programarResumen(500);
      programarCarga("validacion",1700);
      programarCarga("descansos",2900);
      return;
    }
    if(["ALMACEN","JEFATURA ALMACEN"].includes(p)){
      programarCarga("checklist", 700);
      programarCarga("actas", 1700);
    }
  }

  window.MV339_LAZY_LOADER = true;
  window.mv339CargarModulo = cargarModulo;
  window.mv339AbrirFuncion = abrirFuncion;
  window.mv339PrepararPerfil = prepararPerfil;
  window.mv339Metricas = metricas;
})();
