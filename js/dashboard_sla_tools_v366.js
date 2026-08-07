/* ============================================================
   MI VISUAL V367 - Acceso directo a SLA desde Dashboard
   - Supervisor: revisar tiempos y solicitar excepciones.
   - Jefatura/Admin: validar excepciones pendientes.
   - Gerencia: visualizar SLA y excepciones.
   - Regresa directamente al Dashboard de origen.
   - Refresca una pantalla que abrió con caché local.
============================================================ */
(function(){
  "use strict";

  if(window.MV366_DASHBOARD_SLA_TOOLS_OK) return;

  let actualizandoPantalla = false;
  let ultimoRefresco = 0;

  function norm(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function perfil(){
    return norm(localStorage.getItem("perfil"));
  }

  function periodoActualLima(){
    const partes = new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Lima",
      year:"numeric",
      month:"2-digit"
    }).formatToParts(new Date());

    return `${partes.find(x=>x.type==="year")?.value}-${partes.find(x=>x.type==="month")?.value}`;
  }

  function periodoPantalla(){
    const selectores = [
      "mv276PeriodoJefatura",
      "mv276PeriodoSupervisor",
      "mv364PeriodoDesempeno"
    ];

    for(const id of selectores){
      const valor = document.getElementById(id)?.value;
      if(valor) return valor;
    }

    if(typeof window.mv356ObtenerDatosDashboardGerencial==="function"){
      const datos = window.mv356ObtenerDatosDashboardGerencial() || {};
      if(datos.periodo) return datos.periodo;
    }

    return periodoActualLima();
  }

  function configuracion(){
    const p = perfil();

    if(p==="SUPERVISOR"){
      return {
        tipo:"SUPERVISOR",
        modo:"FUERA",
        texto:"⏱️ Revisar tiempos y excepciones",
        ayuda:"Ver códigos fuera del SLA y solicitar excepciones."
      };
    }

    if(p==="GERENCIA LIMA"){
      return {
        tipo:"JEFATURA",
        modo:"EXCEPCIONES",
        texto:"⏱️ Ver SLA y excepciones",
        ayuda:"Consulta consolidada de excepciones y tiempos."
      };
    }

    if([
      "JEFATURA",
      "JEFATURA GENERAL",
      "ADMIN",
      "ADMINISTRADOR"
    ].includes(p)){
      return {
        tipo:"JEFATURA",
        modo:"PENDIENTES",
        texto:"✅ Validar excepciones SLA",
        ayuda:"Aprobar o rechazar solicitudes de los Supervisores."
      };
    }

    return null;
  }

  function abrir(){
    const cfg = configuracion();
    if(!cfg) return;

    const periodo = periodoPantalla();

    window.MV366_ORIGEN_SLA = {
      tipo:cfg.tipo,
      periodo
    };

    window.MV366_SLA_MODO = cfg.modo;

    return window.mostrarTiempoGestionSla(
      periodo,
      cfg.modo
    );
  }

  function volver(){
    const origen = window.MV366_ORIGEN_SLA;
    window.MV366_ORIGEN_SLA = null;

    if(!origen){
      volverInicio();
      return;
    }

    if(origen.tipo==="SUPERVISOR"){
      mostrarDashboardSupervisor(origen.periodo);
      return;
    }

    mostrarDashboardJefatura(origen.periodo);
  }

  function puedeVerBonoSupervisor(){
    return [
      "SUPERVISOR",
      "JEFATURA",
      "JEFATURA GENERAL",
      "GERENCIA LIMA",
      "ADMIN",
      "ADMINISTRADOR"
    ].includes(perfil());
  }

  function abrirBonoSupervisor(){
    if(typeof window.mostrarBonosSupervisores === "function"){
      return window.mostrarBonosSupervisores();
    }

    alert("La opción Bono Supervisor todavía no está disponible.");
  }

  function normalizarTituloBonoSupervisor(){
    const recorrer = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const cambios = [];

    while(recorrer.nextNode()){
      const nodo = recorrer.currentNode;
      const texto = (nodo.nodeValue || "").trim();

      if(!texto) continue;

      if(/BONOS\s+SUPERVISORES/iu.test(texto)){
        cambios.push(nodo);
      }
    }

    cambios.forEach(nodo=>{
      nodo.nodeValue = nodo.nodeValue.replace(
        /BONOS\s+SUPERVISORES/giu,
        "BONO SUPERVISOR"
      );
    });
  }

  function inyectar(){
    const cfg = configuracion();
    if(!cfg) return;

    const pagina = document.querySelector(".mv4-page");
    if(!pagina) return;

    const esDashboard = Boolean(
      document.getElementById("mv276PeriodoJefatura") ||
      document.getElementById("mv276PeriodoSupervisor")
    );

    if(!esDashboard) return;
    if(document.getElementById("mv368AccionesDashboard")) return;

    const filtros =
      pagina.querySelector(".mv199-filtros-jefatura") ||
      pagina.querySelector(".mv239-filtros-supervisor") ||
      pagina.querySelector(".mv4-top-card");

    if(!filtros) return;

    const bloque = document.createElement("div");
    bloque.id = "mv368AccionesDashboard";

    const botonBono = puedeVerBonoSupervisor()
      ? `
        <button
          type="button"
          onclick="mv368AbrirBonoSupervisor()"
          title="${perfil()==="SUPERVISOR" ? "Ver mi bono y avance del período" : "Ver bonos y avance por supervisor"}"
          style="
            min-width:170px;
            max-width:220px;
            border:0;
            border-radius:11px;
            padding:9px 14px;
            background:#0f7acb;
            color:#fff;
            font-size:12px;
            font-weight:950;
            cursor:pointer;
            box-shadow:0 5px 14px rgba(15,122,203,.20);
          "
        >🎁 BONO SUPERVISOR</button>
      `
      : "";

    bloque.innerHTML = `
      <div style="
        display:flex;
        gap:8px;
        align-items:center;
        justify-content:flex-end;
        flex-wrap:wrap;
      ">
        <button
          type="button"
          onclick="mv366AbrirSlaDesdeDashboard()"
          style="
            min-width:170px;
            max-width:230px;
            border:0;
            border-radius:11px;
            padding:9px 14px;
            background:linear-gradient(135deg,#7c3aed,#2563eb);
            color:#fff;
            font-size:12px;
            font-weight:950;
            cursor:pointer;
            box-shadow:0 5px 14px rgba(37,99,235,.20);
          "
        >${cfg.texto}</button>

        ${botonBono}
      </div>
    `;

    bloque.style.margin = "9px 0 12px";
    filtros.insertAdjacentElement("afterend",bloque);
  }
  function programarInyeccion(){
    requestAnimationFrame(()=>{
      inyectar();
      normalizarTituloBonoSupervisor();
    });
  }

  const observer = new MutationObserver(programarInyeccion);
  observer.observe(document.documentElement,{
    childList:true,
    subtree:true
  });

  window.addEventListener("mv366ResumenActualizado",event=>{
    const ahora = Date.now();

    if(
      actualizandoPantalla ||
      ahora-ultimoRefresco<5000
    ){
      return;
    }

    const periodo = event?.detail?.periodo || "";
    const boton = document.getElementById(
      "mv366BotonSlaDashboard"
    );
    const desempeno = document.getElementById(
      "mv364PeriodoDesempeno"
    );

    if(!boton && !desempeno) return;

    actualizandoPantalla = true;
    ultimoRefresco = ahora;

    setTimeout(async()=>{
      try{
        if(desempeno){
          await mostrarMiDesempeno(
            periodo || desempeno.value
          );
        }else if(perfil()==="SUPERVISOR"){
          await mostrarDashboardSupervisor(
            periodo || periodoPantalla()
          );
        }else{
          await mostrarDashboardJefatura(
            periodo || periodoPantalla()
          );
        }
      }catch(error){
        console.warn(
          "V366: no se pudo refrescar la pantalla",
          error
        );
      }finally{
        actualizandoPantalla = false;
      }
    },100);
  });

  window.mv366AbrirSlaDesdeDashboard = abrir;
  window.mv366VolverDesdeSla = volver;
  window.mv368AbrirBonoSupervisor = abrirBonoSupervisor;

  window.MV366_DASHBOARD_SLA_TOOLS_OK = true;
  window.MV368_BONO_SUPERVISOR_UI_OK = true;
  console.log(
    "MI VISUAL V370: Bono Supervisor habilitado también en Dashboard Supervisor."
  );
})();