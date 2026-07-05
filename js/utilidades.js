console.log("UTILIDADES.JS CARGADO");

window.addEventListener("load", function () {

    setTimeout(function () {

        document.getElementById("pantallaCarga").style.display = "none";
        document.getElementById("contenidoApp").style.display = "block";

    },2000);
});

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
