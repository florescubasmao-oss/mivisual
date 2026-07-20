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
        menu.classList.remove("mv196-tecnico-menu");
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
    if(perfil === "JEFATURA" || perfil === "JEFATURA GENERAL" || perfil === "ADMIN" || perfil === "ADMINISTRADOR"){
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
   V216 - Dashboard categorizado exclusivo para Jefatura
   ===================================================== */
function organizarMenuJefaturaV213(mv55, perfil){
    const menu = document.getElementById("menuPrincipal");
    if(!menu || !mv55 || !mv55.welcome) return;

    const perfilNormalizado = normalizarPerfilApp(perfil);
    const esJefaturaGeneral = (
        perfilNormalizado === "JEFATURA" ||
        perfilNormalizado === "JEFATURA GENERAL" ||
        perfilNormalizado === "ADMIN" ||
        perfilNormalizado === "ADMINISTRADOR"
    );

    let panel = document.getElementById("mv213JefaturaSections");

    if(!esJefaturaGeneral){
        if(panel) panel.remove();
        if(mv55.main) mv55.main.style.removeProperty("display");
        if(mv55.recursosTitle) mv55.recursosTitle.style.removeProperty("display");
        if(mv55.recursos) mv55.recursos.style.removeProperty("display");
        menu.classList.remove("mv213-menu-jefatura");
        return;
    }

    menu.classList.add("mv213-menu-jefatura");
    if(mv55.main) mv55.main.style.setProperty("display", "none", "important");
    if(mv55.recursosTitle) mv55.recursosTitle.style.setProperty("display", "none", "important");
    if(mv55.recursos) mv55.recursos.style.setProperty("display", "none", "important");

    if(panel) panel.remove();
    panel = document.createElement("div");
    panel.id = "mv213JefaturaSections";
    panel.className = "mv213-sections";
    mv55.welcome.after(panel);

    const secciones = [
        { titulo:"📊 Gestión", clase:"mv213-grid-4", ids:["cardDashboardJefatura","cardRanking","cardAnalisisEconomico","cardAdministracion"] },
        { titulo:"📋 Control Operativo", clase:"mv213-grid-4", ids:["cardActividadCampo","cardValidacionTecnica","cardActas","cardObservaciones"] },
        { titulo:"🏢 Operación", clase:"mv213-grid-4", ids:["cardChecklistAlmacen","cardProgramacionDescansos","cardTrabajosConjunta","cardMapaOperativo"] },
        { titulo:"📚 Recursos", clase:"mv213-grid-3", ids:["cardAccesos","cardBiblioteca","cardCapacitacion"] },
        { titulo:"💬 Soporte", clase:"mv213-grid-support", ids:["cardConsultasReclamos"] }
    ];

    secciones.forEach(sec => {
        const bloque = document.createElement("section");
        bloque.className = "mv213-section";
        bloque.innerHTML = `<div class="mv213-section-title"><span>${sec.titulo}</span></div><div class="mv213-grid ${sec.clase}"></div>`;
        const grid = bloque.querySelector(".mv213-grid");
        sec.ids.forEach(id => {
            const card = document.getElementById(id);
            if(!card) return;
            card.classList.remove("mv55-main-card", "mv55-resource-card");
            card.classList.add("mv213-card");
            grid.appendChild(card);
        });
        panel.appendChild(bloque);
    });
}

function aplicarPermisosMenuActualizados(){
    const todasLasCards = [
        'cardProduccion','cardEfectividad','cardRecableado','cardVTRGAR','cardRanking',
        'cardObservaciones','cardAccesos','cardBiblioteca','cardCapacitacion',
        'cardDashboardSupervisor','cardDashboardJefatura','cardAnalisisEconomico',
        'cardAdministracion','cardActividadCampo','cardValidacionTecnica','cardActas',
        'cardChecklistAlmacen','cardProgramacionDescansos','cardTrabajosConjunta','cardConsultasReclamos'
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
        ADMIN: [
            "cardRanking",
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
    organizarMenuJefaturaV213(mv55, perfil);

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
