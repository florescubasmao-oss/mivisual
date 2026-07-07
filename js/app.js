// MI VISUAL - archivo modularizado

console.log("APP.JS CARGADO");

function setBotonNavegacion(modo){
    const btn = document.getElementById("btnInicio");
    if(!btn) return;

    btn.style.display = localStorage.getItem("usuario") ? "inline-block" : "none";

    if(modo === "modulo"){
        btn.innerHTML = "⬅️ Volver al menú";
        btn.dataset.modo = "modulo";
        btn.style.background = "#0d6efd";
    }else{
        btn.innerHTML = "🚪 Cerrar sesión";
        btn.dataset.modo = "menu";
        btn.style.background = "#dc3545";
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


function asegurarCardActividadCampo(){
    const menu = document.getElementById("menuPrincipal");
    if(!menu) return;
    if(document.getElementById("cardActividadCampo")) return;

    const card = document.createElement("div");
    card.id = "cardActividadCampo";
    card.className = "card card-dash";
    card.setAttribute("onclick", "mostrarActividadCampo()");
    card.innerHTML = "<span>📍</span><b>Actividad en Campo</b>";

    const dashboardSupervisor = document.getElementById("cardDashboardSupervisor");
    const dashboardJefatura = document.getElementById("cardDashboardJefatura");
    const administracion = document.getElementById("cardAdministracion");

    if(administracion){
        menu.insertBefore(card, administracion);
    }else if(dashboardJefatura && dashboardJefatura.nextSibling){
        menu.insertBefore(card, dashboardJefatura.nextSibling);
    }else if(dashboardSupervisor && dashboardSupervisor.nextSibling){
        menu.insertBefore(card, dashboardSupervisor.nextSibling);
    }else{
        menu.appendChild(card);
    }
}

function configurarMenu(){

    console.log("CONFIGURAR MENU DESDE APP.JS");

    const perfil = normalizarPerfilApp(localStorage.getItem("perfil"));
    asegurarCardActividadCampo();

    const menu = document.getElementById("menuPrincipal");
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");

    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = "";
    if (menu) menu.style.display = "grid";
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

    if((perfil === "SUPERVISOR" || perfil === "JEFATURA" || perfil === "ADMIN" || perfil === "ADMINISTRADOR") && typeof mostrarActividadCampo === "function"){
        mostrarCardSeguro("cardActividadCampo", true);
    }
}

window.addEventListener("load", function () {

    setTimeout(function () {

        document.getElementById("pantallaCarga").style.display = "none";
        document.getElementById("contenidoApp").style.display = "block";

    },2000);
});
