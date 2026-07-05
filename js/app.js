console.log("APP.JS CARGADO");

function volverInicio(){
    limpiarPantalla();
    configurarMenu();
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
}


function mostrarCard(id, estado){
    const el = document.getElementById(id);
    if (el) el.style.display = estado;
}


function mostrarPantalla(html){
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    const menu = document.getElementById("menuPrincipal");

    if (resultado) resultado.innerHTML = "";
    if (menu) menu.style.display = "none";
    if (pantalla) pantalla.innerHTML = html;

    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
}

function limpiarPantalla(){
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = "";
}

function configurarMenu(){

    console.log("CONFIGURAR MENU DESDE APP.JS");

    const perfil = localStorage.getItem("perfil");

    const menu = document.getElementById("menuPrincipal");
    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");

    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = ""; 
    if (menu) menu.style.display = "grid";

    // ocultar todo primero
    mostrarCard("cardProduccion", "none");
    mostrarCard("cardEfectividad", "none");
    mostrarCard("cardRecableado", "none");
    mostrarCard("cardVTRGAR", "none");
    mostrarCard("cardRanking", "none");
    mostrarCard("cardAccesos", "none");
    mostrarCard("cardBiblioteca", "none");
    mostrarCard("cardCapacitacion", "none");
    mostrarCard("cardDashboardSupervisor", "none");
    mostrarCard("cardDashboardJefatura", "none");
    mostrarCard("cardAdministracion", "none");

    if (perfil == "TECNICO") {
        mostrarCard("cardProduccion", "block");
        mostrarCard("cardEfectividad", "block");
        mostrarCard("cardRecableado", "block");
        mostrarCard("cardVTRGAR", "block");
        mostrarCard("cardRanking", "block");
        mostrarCard("cardAccesos", "block");
        mostrarCard("cardBiblioteca", "block");
        mostrarCard("cardCapacitacion", "block");
    }

    if (perfil == "SUPERVISOR") {
        mostrarCard("cardRanking", "block");
        mostrarCard("cardAccesos", "block");
        mostrarCard("cardBiblioteca", "block");
        mostrarCard("cardCapacitacion", "block");
        mostrarCard("cardDashboardSupervisor", "block");
    }

    if (perfil == "JEFATURA") {
        mostrarCard("cardRanking", "block");
        mostrarCard("cardAccesos", "block");
        mostrarCard("cardBiblioteca", "block");
        mostrarCard("cardCapacitacion", "block");
        mostrarCard("cardDashboardSupervisor", "block");
        mostrarCard("cardDashboardJefatura", "block");
        mostrarCard("cardAdministracion", "block");
    }
}