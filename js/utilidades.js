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
    if (typeof setBotonNavegacion === "function") setBotonNavegacion("modulo");

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

    const contenedor = btn ? btn.closest(".mv58-cuadrilla-card, .mv4-kpi-card, .mv4-sede-card") : null;

    const visible =
        window.getComputedStyle(div).display !== "none";

    if(visible){

        div.style.display = "none";
        if(contenedor) contenedor.classList.remove("detalle-abierto");

        if(btn){
            btn.classList.remove("detalle-abierto-btn");
            if(id.startsWith("puntos_")){
                btn.innerHTML = "⭐ Ver detalle de puntos";
            }else if(id.startsWith("kpi_")){
                btn.innerHTML = "▼ Ver cuadrillas";
            }else if(id.startsWith("sede_")){
                btn.innerHTML = "▼ Ver indicadores y cuadrillas";
            }else{
                btn.innerHTML = "▼ Ver detalle";
            }
        }

    }else{

        div.style.display = "block";
        if(contenedor) contenedor.classList.add("detalle-abierto");

        if(btn){
            btn.classList.add("detalle-abierto-btn");
            if(id.startsWith("puntos_")){
                btn.innerHTML = "⭐ Ocultar detalle de puntos";
            }else if(id.startsWith("kpi_")){
                btn.innerHTML = "▲ Ocultar cuadrillas";
            }else if(id.startsWith("sede_")){
                btn.innerHTML = "▲ Ocultar indicadores y cuadrillas";
            }else{
                btn.innerHTML = "▲ Ocultar detalle";
            }
        }

    }

}
