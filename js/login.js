// MI VISUAL - Login v4.0 Corporate

function togglePasswordLogin(){
    const clave = document.getElementById("clave");
    if(!clave) return;
    clave.type = clave.type === "password" ? "text" : "password";
}

async function login() {

    const identificador = document.getElementById("correo").value.trim();
    const identificadorNormalizado = identificador.toLowerCase();
    const clave = document.getElementById("clave").value.trim();
    const btn = document.getElementById("btnLogin");
    const msg = document.getElementById("loginMensaje");

    if(!identificador || !clave){
        if(msg){ msg.innerHTML = "⚠ Ingresa usuario y contraseña."; msg.style.color = "#dc2626"; }
        return;
    }

    if(btn){ btn.disabled = true; btn.innerHTML = "Conectando..."; }
    if(msg){ msg.innerHTML = "Validando credenciales..."; msg.style.color = "#2563eb"; }

    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=0&single=true&output=csv";

    try {
        // V635: login siempre consulta la publicación vigente; nunca usa
        // un respaldo de cache expirado para decidir "credenciales incorrectas".
        const urlVigente = url + "&mv_login_ts=" + Date.now();
        const respuesta = await fetch(urlVigente, {cache:"no-store",redirect:"follow"});
        if(!respuesta.ok) throw new Error("No se pudo consultar la lista de usuarios.");
        const texto = await respuesta.text();
        if(!texto || /<html[\\s>]/i.test(texto)) throw new Error("La fuente de usuarios no devolvió CSV válido.");
        const filas = texto.split("\n");

        for (let i = 1; i < filas.length; i++) {
            const datos = filas[i].split(",");
            const correoSheet = datos[1]?.replace(/"/g, "").trim();
            const claveSheet = datos[2]?.replace(/"/g, "").trim();

            const usuarioSheet = datos[0]?.replace(/"/g, "").trim() || "";
            // V641: acepta correo o código de usuario exacto, siempre con clave.
            // Nunca trata un correo vacío como coincidencia.
            const coincideIdentidad = (correoSheet && identificadorNormalizado === correoSheet.toLowerCase()) ||
                (usuarioSheet && identificadorNormalizado === usuarioSheet.toLowerCase());
            if (coincideIdentidad && clave === claveSheet) {
                const usuario = datos[0]?.replace(/"/g, "").trim();
                const cuadrilla = datos[3]?.replace(/"/g, "").trim();
                const sede = datos[4]?.replace(/"/g, "").trim();
                const plataforma = datos[5]?.replace(/"/g, "").trim();
                const perfil = datos[6]?.replace(/"/g, "").trim();
                const nivel = datos[7]?.replace(/"/g, "").trim();
                const estado = datos[8]?.replace(/"/g, "").trim();
                const nombresApellidos = datos[10]?.replace(/"/g, "").trim() || "";

                localStorage.setItem("usuario", usuario);
                localStorage.setItem("cuadrilla", cuadrilla);
                localStorage.setItem("sede", sede);
                localStorage.setItem("plataforma", plataforma);
                localStorage.setItem("perfil", perfil);
                localStorage.setItem("nivel", nivel);
                localStorage.setItem("estado", estado);
                localStorage.setItem("correo", correoSheet || "");
                localStorage.setItem("nombresApellidos", nombresApellidos);

                document.getElementById("usuarioInfo").innerHTML = "";
                document.getElementById("panelLogin").style.display = "none";
                if (typeof setBotonNavegacion === "function") setBotonNavegacion("menu");
                else document.getElementById("btnInicio").style.display = "inline-block";
                document.getElementById("menuPrincipal").style.display = "grid";

                if(msg) msg.innerHTML = "";
                configurarMenu();
                return;
            }
        }
        if(msg){ msg.innerHTML = "⚠ Usuario o contraseña incorrectos."; msg.style.color = "#dc2626"; }
    } catch (error) {
        console.error(error);
        if(msg){ msg.innerHTML = "❌ Error al conectar con Google Sheets."; msg.style.color = "#dc2626"; }
    } finally {
        if(btn){ btn.disabled = false; btn.innerHTML = "INICIAR SESIÓN"; }
    }
}

function construirInfoUsuarioLogin(data){
    const perfil = (data.perfil || "").toUpperCase().trim();
    const sede = (data.sede || "").toUpperCase().trim();
    const plataforma = (data.plataforma || "").toUpperCase().trim();
    const cuadrilla = (data.cuadrilla || "").trim();

    if(perfil === "JEFATURA" || perfil === "ADMIN" || perfil === "ADMINISTRADOR"){
        return "👔 <b>JEFATURA</b><br><span>Zona Norte</span>";
    }

    if(perfil === "SUPERVISOR"){
        return "👷 <b>SUPERVISOR</b><br>🏢 " + sede;
    }

    return "✅ <b>" + cuadrilla + "</b>" +
           "<br>🏢 " + sede +
           "<br>📚 " + plataforma +
           "<br>👤 " + perfil;
}
