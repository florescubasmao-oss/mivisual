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

    document.getElementById("resultadoProduccion").innerHTML="";

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

}

function configurarMenu(){

    console.log("CONFIGURAR MENU DESDE APP.JS");

    const perfil = localStorage.getItem("perfil");

    // ocultar todo primero
    cardProduccion.style.display = "none";
    cardEfectividad.style.display = "none";
    cardRecableado.style.display = "none";
    cardVTRGAR.style.display = "none";
    cardRanking.style.display = "none";
    cardAccesos.style.display = "none";
    cardBiblioteca.style.display = "none";
    cardCapacitacion.style.display = "none";
    cardDashboardSupervisor.style.display = "none";
    cardDashboardJefatura.style.display = "none";
    cardAdministracion.style.display = "none";

    if (perfil == "TECNICO") {
    cardProduccion.style.display = "block";
    cardEfectividad.style.display = "block";
    cardRecableado.style.display = "block";
    cardVTRGAR.style.display = "block";
    cardRanking.style.display = "block";
    cardAccesos.style.display = "block";
    cardBiblioteca.style.display = "block";
    cardCapacitacion.style.display = "block";
}

if (perfil == "SUPERVISOR") {
    cardRanking.style.display = "block";
    cardAccesos.style.display = "block";
    cardBiblioteca.style.display = "block";
    cardCapacitacion.style.display = "block";
    cardDashboardSupervisor.style.display = "block";
}

if (perfil == "JEFATURA") {
    cardRanking.style.display = "block";
    cardAccesos.style.display = "block";
    cardBiblioteca.style.display = "block";
    cardCapacitacion.style.display = "block";
    cardDashboardSupervisor.style.display = "block";
    cardDashboardJefatura.style.display = "block";
    cardAdministracion.style.display = "block";
}
}
