// MI VISUAL - archivo modularizado

console.log("APP.JS CARGADO");

function volverInicio(){
    limpiarPantalla();
    configurarMenu();
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
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

window.addEventListener("load", function () {

    setTimeout(function () {

        document.getElementById("pantallaCarga").style.display = "none";
        document.getElementById("contenidoApp").style.display = "block";

    },2000);
});
