// MI VISUAL - archivo modularizado

console.log("APP.JS CARGADO");

function setBotonNavegacion(modo){
    const btn = document.getElementById("btnInicio");
    if(!btn) return;

    btn.style.display = localStorage.getItem("usuario") ? "inline-block" : "none";

    if(modo === "modulo"){
        btn.innerHTML = "⬅️ Volver al menú";
        btn.dataset.modo = "modulo";
        btn.classList.remove("mv55-logout");
        btn.classList.add("mv55-back");
    }else{
        btn.innerHTML = "🚪 Cerrar sesión";
        btn.dataset.modo = "menu";
        btn.classList.remove("mv55-back");
        btn.classList.add("mv55-logout");
    }
}

function accionBotonNavegacion(){
    const btn = document.getElementById("btnInicio");
    const modo = btn ? btn.dataset.modo : "menu";

    if(modo === "modulo"){
        volverInicio();
        return;
    }

    cerrarSesion();
}

function cerrarSesion(){
    if (typeof pmLimpiarSesion === 'function') pmLimpiarSesion();
    // Conserva únicamente la caché no sensible de permisos para acelerar el próximo ingreso.
    const cachePermisos = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('permisosModulos:') || key.startsWith('permisosModulosFecha:'))) {
            cachePermisos[key] = localStorage.getItem(key);
        }
    }
    localStorage.clear();
    Object.keys(cachePermisos).forEach(key => localStorage.setItem(key, cachePermisos[key]));

    const panelLogin = document.getElementById("panelLogin");
    const usuarioInfo = document.getElementById("usuarioInfo");
    const menu = document.getElementById("menuPrincipal");
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    const btn = document.getElementById("btnInicio");

    if(panelLogin) panelLogin.style.display = "block";
    if(usuarioInfo) usuarioInfo.innerHTML = "";
    if(menu) {
        menu.classList.remove("mv196-tecnico-menu", "mv224-jefatura-operaciones-menu");
        menu.style.display = "none";
    }
    if(pantalla) pantalla.innerHTML = "";
    if(resultado) resultado.innerHTML = "";
    if(btn) btn.style.display = "none";

    const correo = document.getElementById("correo");
    const clave = document.getElementById("clave");
    const msg = document.getElementById("loginMensaje");
    if(correo) correo.value = "";
    if(clave) clave.value = "";
    if(msg) msg.innerHTML = "";

    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
}

function volverInicio(){
    limpiarPantalla();
    configurarMenu();
    setBotonNavegacion("menu");
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
}

function normalizarPerfilApp(valor){
    return (valor || "")
        .toString()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function mostrarCardSeguro(id, visible){
    const el = document.getElementById(id);
    if (!el) return;
    if (visible) {
        el.style.setProperty("display", "flex", "important");
    } else {
        el.style.setProperty("display", "none", "important");
    }
}


function obtenerNombrePerfilMenu(){
    const perfil = normalizarPerfilApp(localStorage.getItem("perfil"));
    const sede = normalizarPerfilApp(localStorage.getItem("sede"));
    const cuadrilla = localStorage.getItem("cuadrilla") || "";
    const nombresApellidos = (localStorage.getItem("nombresApellidos") || "").trim();

    let detalle = perfil + " • " + (sede || "ZONA NORTE");
    if(perfil === "TECNICO" && cuadrilla){
        detalle = "TÉCNICO • " + sede;
    }
    if(perfil === "SUPERVISOR"){
        detalle = "SUPERVISOR • " + sede;
    }
    if(perfil === "ALMACEN"){
        detalle = "RESPONSABLE DE ALMACÉN • " + sede;
    }
    if(perfil === "JEFATURA" || perfil === "JEFATURA GENERAL" || perfil === "GERENCIA LIMA" || perfil === "ADMIN" || perfil === "ADMINISTRADOR"){
        detalle = perfil + " • TODAS";
    }

    return { nombresApellidos, detalle };
}

function prepararMenuVisual(){
    const menu = document.getElementById("menuPrincipal");
    if(!menu) return {};

    let welcome = document.getElementById("mv55Welcome");
    let main = document.getElementById("mv55MainModules");
    let recursosTitle = document.getElementById("mv55RecursosTitle");
    let recursos = document.getElementById("mv55Recursos");

    if(!welcome){
        welcome = document.createElement("div");
        welcome.id = "mv55Welcome";
        welcome.className = "mv55-welcome";
        menu.prepend(welcome);
    }

    if(!main){
        main = document.createElement("div");
        main.id = "mv55MainModules";
        main.className = "mv55-main-modules";
        welcome.after(main);
    }

    if(!recursosTitle){
        recursosTitle = document.createElement("div");
        recursosTitle.id = "mv55RecursosTitle";
        recursosTitle.className = "mv55-section-title";
        recursosTitle.innerHTML = "Recursos";
        main.after(recursosTitle);
    }

    if(!recursos){
        recursos = document.createElement("div");
        recursos.id = "mv55Recursos";
        recursos.className = "mv55-recursos";
        recursosTitle.after(recursos);
    }

    const info = obtenerNombrePerfilMenu();
    welcome.innerHTML = `
        <div class="mv55-welcome-hi">👋 Bienvenido${info.nombresApellidos ? ", " + info.nombresApellidos : ""}</div>
        <div class="mv55-welcome-detail">${info.detalle}</div>
    `;

    return { menu, welcome, main, recursos, recursosTitle };
}


/* =====================================================
   V218 - Menú categorizado para Jefatura y Supervisor
   Técnico y demás perfiles conservan su visualización.
   ===================================================== */
function configurarBotonAdministracionJefatura(perfil){
    const perfilNormalizado = normalizarPerfilApp(perfil);
    const mostrar = ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfilNormalizado);
    const topbar = document.querySelector(".mv55-topbar");
    const cardAdministracion = document.getElementById("cardAdministracion");
    let boton = document.getElementById("btnAdministracionJefatura");

    if(!mostrar){
        if(boton) boton.remove();
        return;
    }

    if(!topbar || !cardAdministracion) return;

    if(!boton){
        boton = document.createElement("button");
        boton.id = "btnAdministracionJefatura";
        boton.type = "button";
        boton.className = "mv218-admin-top-btn";
        boton.innerHTML = '<span aria-hidden="true">⚙️</span><span class="mv218-admin-top-text">Administración</span>';
        boton.addEventListener("click", function(){
            if(typeof mostrarAdministracion === "function") mostrarAdministracion();
        });
        const nav = document.getElementById("btnInicio");
        if(nav && nav.parentElement === topbar) topbar.insertBefore(boton, nav);
        else topbar.appendChild(boton);
    }

    // La tarjeta grande deja de mostrarse para Jefatura; el acceso queda en la cabecera.
    cardAdministracion.style.setProperty("display", "none", "important");
}

function limpiarAgrupacionMenuV218(mv55){
    const menu = document.getElementById("menuPrincipal");
    const panelJefatura = document.getElementById("mv213JefaturaSections");
    const panelSupervisor = document.getElementById("mv218SupervisorSections");
    const panelGerencia = document.getElementById("mv221GerenciaSections");
    const recursosIds = ["cardAccesos","cardBiblioteca","cardCapacitacion","cardConsultasReclamos"];

    // Antes de retirar los paneles, devolver las tarjetas a sus contenedores originales.
    [panelJefatura, panelSupervisor, panelGerencia].forEach(panel => {
        if(!panel) return;
        Array.from(panel.querySelectorAll(".card")).forEach(card => {
            card.classList.remove("mv213-card", "mv218-supervisor-card");
            if(recursosIds.includes(card.id) && mv55 && mv55.recursos){
                card.classList.add("mv55-resource-card");
                mv55.recursos.appendChild(card);
            }else if(mv55 && mv55.main){
                card.classList.add("mv55-main-card");
                mv55.main.appendChild(card);
            }
        });
        panel.remove();
    });

    if(mv55 && mv55.main) mv55.main.style.removeProperty("display");
    if(mv55 && mv55.recursosTitle) mv55.recursosTitle.style.removeProperty("display");
    if(mv55 && mv55.recursos) mv55.recursos.style.removeProperty("display");
    if(menu) menu.classList.remove("mv213-menu-jefatura", "mv218-menu-supervisor");
}

function crearSeccionesMenuV218(panel, secciones, claseCard){
    secciones.forEach(sec => {
        const bloque = document.createElement("section");
        bloque.className = "mv213-section";
        bloque.innerHTML = `<div class="mv213-section-title"><span>${sec.titulo}</span></div><div class="mv213-grid ${sec.clase}"></div>`;
        const grid = bloque.querySelector(".mv213-grid");
        sec.ids.forEach(id => {
            const card = document.getElementById(id);
            if(!card || getComputedStyle(card).display === "none") return;
            card.classList.remove("mv55-main-card", "mv55-resource-card", "mv213-card", "mv218-supervisor-card");
            card.classList.add(claseCard);
            grid.appendChild(card);
        });
        if(grid.children.length) panel.appendChild(bloque);
    });
}

function organizarMenuPorPerfilV218(mv55, perfil){
    const menu = document.getElementById("menuPrincipal");
    if(!menu || !mv55 || !mv55.welcome) return;

    const perfilNormalizado = normalizarPerfilApp(perfil);
    const esJefatura = ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfilNormalizado);
    const esGerencia = perfilNormalizado === "GERENCIA LIMA";
    const esSupervisor = perfilNormalizado === "SUPERVISOR";

    // Alcance estricto V219: solo Jefatura General y Supervisor.
    // Los demás perfiles conservan exactamente su estructura y tamaños existentes.
    if(!esJefatura && !esGerencia && !esSupervisor){
        const botonAdministracion = document.getElementById("btnAdministracionJefatura");
        if(botonAdministracion) botonAdministracion.remove();
        return;
    }

    limpiarAgrupacionMenuV218(mv55);
    configurarBotonAdministracionJefatura(esGerencia ? "GERENCIA LIMA" : perfilNormalizado);

    if(mv55.main) mv55.main.style.setProperty("display", "none", "important");
    if(mv55.recursosTitle) mv55.recursosTitle.style.setProperty("display", "none", "important");
    if(mv55.recursos) mv55.recursos.style.setProperty("display", "none", "important");

    const panel = document.createElement("div");
    panel.className = "mv213-sections";
    mv55.welcome.after(panel);

    if(esJefatura || esGerencia){
        menu.classList.add("mv213-menu-jefatura");
        panel.id = esGerencia ? "mv221GerenciaSections" : "mv213JefaturaSections";
        crearSeccionesMenuV218(panel, [
            { titulo:"📊 Gestión", clase:"mv213-grid-4", ids:["cardDashboardJefatura","cardRanking","cardBonos","cardAnalisisEconomico"] },
            { titulo:"📋 Control Operativo", clase:"mv213-grid-4", ids:["cardActividadCampo","cardValidacionTecnica","cardActas","cardObservaciones"] },
            { titulo:"🏢 Operación", clase:"mv213-grid-4", ids:["cardChecklistAlmacen","cardProgramacionDescansos","cardTrabajosConjunta","cardMapaOperativo"] },
            { titulo:"📚 Recursos", clase:"mv213-grid-3", ids:["cardAccesos","cardBiblioteca","cardCapacitacion"] },
            { titulo:"💬 Soporte", clase:"mv213-grid-support", ids:["cardConsultasReclamos"] }
        ], "mv213-card");
        return;
    }

    menu.classList.add("mv218-menu-supervisor");
    panel.id = "mv218SupervisorSections";
    crearSeccionesMenuV218(panel, [
        { titulo:"📊 Gestión", clase:"mv218-grid-3", ids:["cardDashboardSupervisor","cardRanking","cardBonos"] },
        { titulo:"📋 Control Operativo", clase:"mv218-grid-3", ids:["cardActividadCampo","cardValidacionTecnica","cardActas","cardObservaciones"] },
        { titulo:"🏢 Operación", clase:"mv218-grid-2", ids:["cardChecklistAlmacen","cardProgramacionDescansos","cardTrabajosConjunta","cardMapaOperativo"] },
        { titulo:"📚 Recursos", clase:"mv218-grid-3", ids:["cardAccesos","cardBiblioteca","cardCapacitacion"] },
        { titulo:"💬 Soporte", clase:"mv213-grid-support", ids:["cardConsultasReclamos"] }
    ], "mv218-supervisor-card");
}

function aplicarPermisosMenuActualizados(){
    const todasLasCards = [
        'cardProduccion','cardEfectividad','cardRecableado','cardVTRGAR','cardRanking','cardBonos',
        'cardObservaciones','cardAccesos','cardBiblioteca','cardCapacitacion',
        'cardDashboardSupervisor','cardDashboardJefatura','cardAnalisisEconomico',
        'cardAdministracion','cardActividadCampo','cardValidacionTecnica','cardActas',
        'cardChecklistAlmacen','cardProgramacionDescansos','cardTrabajosConjunta','cardMapaOperativo','cardConsultasReclamos'
    ];
    todasLasCards.forEach(id => mostrarCardSeguro(id, false));
    const dinamicos = typeof pmModulosMenu === 'function' ? pmModulosMenu() : null;
    const opciones = Array.isArray(dinamicos)
        ? dinamicos.map(x => PM_CARD_MAP[pmNorm(x.modulo)]).filter(Boolean)
        : [];
    const perfilActual = (localStorage.getItem("perfil") || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    // V190: Jefatura de Almacén accede a Análisis Económico únicamente para Materiales.
    if (perfilActual === "JEFATURA ALMACEN" && !opciones.includes("cardAnalisisEconomico")) {
        opciones.push("cardAnalisisEconomico");
    }
    if(!opciones.includes("cardConsultasReclamos")) opciones.push("cardConsultasReclamos");
    // V242: Bonos es una vista derivada de Producción. Se habilita para Supervisor,
    // Jefatura General, Gerencia Lima y Administración sin crear una hoja adicional.
    if (["SUPERVISOR","JEFATURA","JEFATURA GENERAL","GERENCIA LIMA","ADMIN","ADMINISTRADOR"].includes(perfilActual)
        && !opciones.includes("cardBonos")) {
        opciones.push("cardBonos");
    }
    // El Técnico accede a Bonos únicamente desde el botón ubicado dentro de Producción.
    if (perfilActual === "TECNICO") {
        const indiceBonos = opciones.indexOf("cardBonos");
        if (indiceBonos >= 0) opciones.splice(indiceBonos, 1);
    }
    opciones.forEach(id => mostrarCardSeguro(id, true));
    const recursosIds = ['cardAccesos','cardBiblioteca','cardCapacitacion','cardConsultasReclamos'];
    const recursosTitle = document.getElementById('mv55RecursosTitle');
    const recursos = document.getElementById('mv55Recursos');
    const tieneRecursos = recursosIds.some(id => opciones.includes(id));
    if(recursosTitle) recursosTitle.style.display = tieneRecursos ? 'flex' : 'none';
    if(recursos) recursos.style.display = tieneRecursos ? 'grid' : 'none';
}
window.aplicarPermisosMenuActualizados = aplicarPermisosMenuActualizados;

async function configurarMenu(){

    console.log("CONFIGURAR MENU DESDE APP.JS");

    const perfil = normalizarPerfilApp(localStorage.getItem("perfil"));

    const menu = document.getElementById("menuPrincipal");
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");

    if (!menu) {
        console.error("No existe el contenedor menuPrincipal. Se cancela la construcción del menú.");
        return;
    }

    // V196: ajuste visual exclusivo del perfil Técnico.
    // Se aplica durante la construcción real del menú, sin alterar cargas ni módulos.
    menu.classList.toggle("mv196-tecnico-menu", perfil === "TECNICO");
    menu.classList.toggle(
        "mv224-jefatura-operaciones-menu",
        ["JEFATURA OPERACIONES", "JEFATURA DE OPERACIONES", "OPERACIONES"].includes(perfil)
    );

    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = "";
    // Ocultar el menú mientras se consultan permisos y módulos habilitados.
    if (menu) menu.style.setProperty("display", "none", "important");
    const mv55 = prepararMenuVisual();
    setBotonNavegacion("menu");

    const todasLasCards = [
        "cardProduccion",
        "cardEfectividad",
        "cardRecableado",
        "cardVTRGAR",
        "cardRanking",
        "cardBonos",
        "cardObservaciones",
        "cardAccesos",
        "cardBiblioteca",
        "cardCapacitacion",
        "cardDashboardSupervisor",
        "cardDashboardJefatura",
        "cardAnalisisEconomico",
        "cardAdministracion",
        "cardActividadCampo",
        "cardValidacionTecnica",
        "cardActas",
        "cardChecklistAlmacen",
        "cardProgramacionDescansos",
        "cardTrabajosConjunta",
        "cardMapaOperativo",
        "cardConsultasReclamos"
    ];

    todasLasCards.forEach(id => mostrarCardSeguro(id, false));

    const recursosIds = ["cardAccesos", "cardBiblioteca", "cardCapacitacion", "cardConsultasReclamos"];
    if(mv55.main && mv55.recursos){
        todasLasCards.forEach(id => {
            const card = document.getElementById(id);
            if(!card) return;
            card.classList.remove("mv55-resource-card", "mv55-main-card");
            if(recursosIds.includes(id)){
                card.classList.add("mv55-resource-card");
                mv55.recursos.appendChild(card);
            }else{
                card.classList.add("mv55-main-card");
                mv55.main.appendChild(card);
            }
        });
    }

    const permisos = {
        TECNICO: [
            "cardProduccion",
            "cardEfectividad",
            "cardRecableado",
            "cardVTRGAR",
            "cardRanking",
            "cardObservaciones",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardTrabajosConjunta",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion"
        ],
        SUPERVISOR: [
            "cardRanking",
            "cardBonos",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardSupervisor",
            "cardActividadCampo",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardProgramacionDescansos",
            "cardTrabajosConjunta",
            "cardMapaOperativo"
        ],
        JEFATURA: [
            "cardRanking",
            "cardBonos",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAnalisisEconomico",
            "cardAdministracion",
            "cardActividadCampo",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardProgramacionDescansos",
            "cardTrabajosConjunta",
            "cardMapaOperativo"
        ],
        "JEFATURA GENERAL": [
            "cardRanking",
            "cardBonos",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAnalisisEconomico",
            "cardAdministracion",
            "cardActividadCampo",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardProgramacionDescansos",
            "cardTrabajosConjunta",
            "cardMapaOperativo"
        ],
        "GERENCIA LIMA": [
            "cardRanking",
            "cardBonos",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAnalisisEconomico",
            "cardActividadCampo",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardProgramacionDescansos",
            "cardTrabajosConjunta",
            "cardMapaOperativo"
        ],
        ADMIN: [
            "cardRanking",
            "cardBonos",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAnalisisEconomico",
            "cardAdministracion",
            "cardActividadCampo",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardProgramacionDescansos",
            "cardTrabajosConjunta",
            "cardMapaOperativo"
        ],
        ADMINISTRADOR: [
            "cardRanking",
            "cardBonos",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAnalisisEconomico",
            "cardAdministracion",
            "cardActividadCampo",
            "cardValidacionTecnica",
            "cardActas",
            "cardChecklistAlmacen",
            "cardProgramacionDescansos",
            "cardTrabajosConjunta",
            "cardMapaOperativo"
        ],
        ALMACEN: [
            "cardActas",
            "cardChecklistAlmacen"
        ],
        "JEFATURA ALMACEN": [
            "cardActas",
            "cardChecklistAlmacen",
            "cardAnalisisEconomico"
        ]
    };

    let opciones = [...(permisos[perfil] || [])];
    try {
        if (typeof pmCargarPermisosActuales === "function") {
            await pmCargarPermisosActuales(false);
            const dinamicos = pmModulosMenu();
            // Si la hoja PERMISOS_MODULOS fue leída, su resultado es autoritativo,
            // incluso cuando devuelve cero módulos. No se mezclan permisos antiguos.
            if (Array.isArray(dinamicos)) {
                opciones = dinamicos.map(x => PM_CARD_MAP[pmNorm(x.modulo)]).filter(Boolean);
            }
            if (perfil === "JEFATURA ALMACEN" && !opciones.includes("cardAnalisisEconomico")) {
                opciones.push("cardAnalisisEconomico");
            }
        }
    } catch(e) { console.warn("Se conserva menú anterior", e); }

    // V168: el menú se construye exclusivamente desde PERMISOS_MODULOS.

    // La visibilidad depende únicamente de PERMISOS_MODULOS.

    aplicarPermisosMenuActualizados();
    organizarMenuPorPerfilV218(mv55, perfil);

    if (menu) menu.style.setProperty("display", "grid", "important");

    if (typeof actualizarIndicadorDescansoMenu === "function" && document.getElementById("mv55Welcome")) {
        Promise.resolve(actualizarIndicadorDescansoMenu()).catch(function(error){
            console.warn("No se pudo actualizar el indicador de descansos", error);
        });
    }
}

window.addEventListener("load", function () {
    setTimeout(function () {
        const pantallaCarga = document.getElementById("pantallaCarga");
        const contenidoApp = document.getElementById("contenidoApp");
        if (pantallaCarga) pantallaCarga.style.display = "none";
        if (contenidoApp) contenidoApp.style.display = "block";
    }, 250);
});


// V196: exposición explícita para los botones HTML.
window.accionBotonNavegacion = accionBotonNavegacion;
window.cerrarSesion = cerrarSesion;
