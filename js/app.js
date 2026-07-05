console.log("APP.JS CARGADO");

async function login() {

    const correo = document.getElementById("correo").value.trim();
    const clave = document.getElementById("clave").value.trim();

    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=0&single=true&output=csv";

    try {

        console.log("Consultando Google Sheets...");

        const respuesta = await fetch(url);

        console.log("Estado:", respuesta.status);

        const texto = await respuesta.text();

        console.log(texto);

        const filas = texto.split("\n");

        for (let i = 1; i < filas.length; i++) {

            const datos = filas[i].split(",");

            const correoSheet = datos[1]?.replace(/"/g, "").trim();
            const claveSheet = datos[2]?.replace(/"/g, "").trim();

            if (correo === correoSheet && clave === claveSheet) {

                const usuario = datos[0];
                const cuadrilla = datos[3];
                const sede = datos[4];
                const plataforma = datos[5];
                const perfil = datos[6];
                const nivel = datos[7];
                const estado = datos[8];

                localStorage.setItem("usuario", usuario);
                localStorage.setItem("cuadrilla", cuadrilla);
                localStorage.setItem("sede", sede);
                localStorage.setItem("plataforma", plataforma);
                localStorage.setItem("perfil", perfil);
                localStorage.setItem("nivel", nivel);
                localStorage.setItem("estado", estado);
                localStorage.setItem("correo", correo);

                document.getElementById("usuarioInfo").innerHTML =
                    "✅ <b>" + cuadrilla + "</b>" +
                    "<br>🏢 " + sede +
                    "<br>📚 " + plataforma +
                    "<br>👤 " + perfil;

                document.getElementById("panelLogin").style.display = "none";
                document.getElementById("btnInicio").style.display = "inline-block";
                document.getElementById("menuPrincipal").style.display = "grid";

                configurarMenu();

                return;
            }

        }

        document.getElementById("usuarioInfo").innerHTML =
            "❌ Correo o clave incorrecta";

    } catch (error) {

        console.error(error);

        document.getElementById("usuarioInfo").innerHTML =
            "❌ Error al conectar con Google Sheets";

    }

}

function volverInicio(){

    const pantalla = document.getElementById("pantalla");
    const resultado = document.getElementById("resultadoProduccion");
    const menu = document.getElementById("menuPrincipal");

    if (pantalla) pantalla.innerHTML = "";
    if (resultado) resultado.innerHTML = "";
    if (menu) menu.style.display = "grid";

    configurarMenu();

    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
}


function mostrarCard(id, estado){
    const el = document.getElementById(id);
    if (el) el.style.display = estado;
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