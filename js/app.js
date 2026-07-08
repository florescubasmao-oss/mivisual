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
    localStorage.clear();

    const panelLogin = document.getElementById("panelLogin");
    const usuarioInfo = document.getElementById("usuarioInfo");
    const menu = document.getElementById("menuPrincipal");
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    const btn = document.getElementById("btnInicio");

    if(panelLogin) panelLogin.style.display = "block";
    if(usuarioInfo) usuarioInfo.innerHTML = "";
    if(menu) menu.style.display = "none";
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
    const usuario = localStorage.getItem("usuario") || "USUARIO";
    const perfil = normalizarPerfilApp(localStorage.getItem("perfil"));
    const sede = normalizarPerfilApp(localStorage.getItem("sede"));
    const cuadrilla = localStorage.getItem("cuadrilla") || "";

    let detalle = perfil + " • " + (sede || "ZONA NORTE");
    if(perfil === "TECNICO" && cuadrilla){
        detalle = "TÉCNICO • " + sede;
    }
    if(perfil === "SUPERVISOR"){
        detalle = "SUPERVISOR • " + sede;
    }
    if(perfil === "JEFATURA" || perfil === "ADMIN" || perfil === "ADMINISTRADOR"){
        detalle = perfil + " • TODAS";
    }

    return { usuario, detalle };
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
        <div class="mv55-welcome-hi">👋 Bienvenido, ${info.usuario}</div>
        <div class="mv55-welcome-detail">${info.detalle}</div>
    `;

    return { menu, main, recursos, recursosTitle };
}

function configurarMenu(){

    console.log("CONFIGURAR MENU DESDE APP.JS");

    const perfil = normalizarPerfilApp(localStorage.getItem("perfil"));

    const menu = document.getElementById("menuPrincipal");
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");

    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = "";
    if (menu) menu.style.display = "grid";
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
        "cardAdministracion",
        "cardActividadCampo"
    ];

    todasLasCards.forEach(id => mostrarCardSeguro(id, false));

    const recursosIds = ["cardAccesos", "cardBiblioteca", "cardCapacitacion"];
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
            "cardActividadCampo"
        ],
        JEFATURA: [
            "cardRanking",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAdministracion",
            "cardActividadCampo"
        ],
        ADMIN: [
            "cardRanking",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAdministracion",
            "cardActividadCampo"
        ],
        ADMINISTRADOR: [
            "cardRanking",
            "cardObservaciones",
            "cardAccesos",
            "cardBiblioteca",
            "cardCapacitacion",
            "cardDashboardJefatura",
            "cardAdministracion",
            "cardActividadCampo"
        ]
    };

    const opciones = permisos[perfil] || [];
    opciones.forEach(id => mostrarCardSeguro(id, true));

    const tieneRecursos = recursosIds.some(id => opciones.includes(id));
    if(mv55.recursosTitle) mv55.recursosTitle.style.display = tieneRecursos ? "flex" : "none";
    if(mv55.recursos) mv55.recursos.style.display = tieneRecursos ? "grid" : "none";
}

window.addEventListener("load", function () {

    setTimeout(function () {

        document.getElementById("pantallaCarga").style.display = "none";
        document.getElementById("contenidoApp").style.display = "block";

    },2000);
});
