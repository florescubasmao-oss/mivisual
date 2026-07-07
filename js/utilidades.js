// MI VISUAL - archivo modularizado

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

function toggleDetalle(id, btn){

    const div = document.getElementById(id);

    if(!div) return;

    const visible =
        window.getComputedStyle(div).display !== "none";

    if(visible){

        div.style.display = "none";

        if(btn){
            if(id.startsWith("puntos_")){
                btn.innerHTML = "⭐ Ver detalle de puntos";
            }else{
                btn.innerHTML = "▼ Ver detalle diario";
            }
        }

    }else{

        div.style.display = "block";

        if(btn){
            if(id.startsWith("puntos_")){
                btn.innerHTML = "⭐ Ocultar detalle de puntos";
            }else{
                btn.innerHTML = "▲ Ocultar detalle diario";
            }
        }

    }

}
