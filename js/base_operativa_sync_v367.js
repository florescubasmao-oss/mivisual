/* ============================================================
   MI VISUAL V367 - Sincronización posterior a Base Operativa
   - Limpia la caché local de Dashboard, Ranking y Mi Desempeño.
   - Precalienta el periodo recién actualizado.
   - No modifica el lector ni las validaciones existentes.
============================================================ */
(function(){
  "use strict";

  if(window.MV367_BASE_OPERATIVA_SYNC_OK) return;

  function limpiarCacheLocal(){
    try{
      const eliminar=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(
          key &&
          (
            key.startsWith("mv366ResumenDashboard:") ||
            key.startsWith("mv367ResumenDashboard:")
          )
        ){
          eliminar.push(key);
        }
      }
      eliminar.forEach(key=>localStorage.removeItem(key));
    }catch(_){}
  }

  function periodoClaveDesdeRespuesta(respuesta){
    const valor=String(respuesta?.periodoClave||respuesta?.periodo||"").trim();

    if(/^\d{4}-\d{2}$/.test(valor)) return valor;

    const meses={
      ENERO:"01",FEBRERO:"02",MARZO:"03",ABRIL:"04",
      MAYO:"05",JUNIO:"06",JULIO:"07",AGOSTO:"08",
      SEPTIEMBRE:"09",OCTUBRE:"10",NOVIEMBRE:"11",DICIEMBRE:"12"
    };
    const mes=meses[valor.toUpperCase()];
    const corte=String(respuesta?.actualizadoAl||"");
    const anio=(corte.match(/(\d{4})/)||[])[1];

    return mes&&anio?`${anio}-${mes}`:"";
  }

  function sincronizar(respuesta){
    limpiarCacheLocal();

    const periodo=periodoClaveDesdeRespuesta(respuesta);

    if(
      periodo &&
      typeof window.mv366InvalidarResumenDashboard==="function"
    ){
      window.mv366InvalidarResumenDashboard(periodo);
    }

    setTimeout(()=>{
      if(
        periodo &&
        typeof window.mv361ConsultarResumenDashboardRanking==="function"
      ){
        window.mv361ConsultarResumenDashboardRanking(periodo,false)
          .catch(error=>console.warn(
            "V367: no se pudo precalentar el resumen actualizado",
            error
          ));
      }
    },250);

    setTimeout(()=>{
      const mensaje=document.getElementById("boMensaje");
      if(!mensaje || !respuesta?.ok) return;

      const estado=respuesta.resumenActualizado
        ? `Resumen sincronizado: ${Number(respuesta.resumenCuadrillas||0)} cuadrillas.`
        : `Las hojas fueron actualizadas. El resumen se reconstruirá al abrir el Dashboard.${respuesta.resumenError?` Detalle: ${respuesta.resumenError}`:""}`;

      if(!mensaje.textContent.includes("Resumen sincronizado")){
        mensaje.textContent += `\n${estado}`;
      }
    },100);
  }

  function aplicar(){
    if(typeof window.boApi!=="function"&&typeof boApi!=="function"){
      return false;
    }

    const original=window.boApi||boApi;

    if(original.__mv367Sync) return true;

    const ajustada=async function(payload){
      const respuesta=await original.apply(this,arguments);

      if(payload?.accion==="procesarBaseOperativa"&&respuesta?.ok){
        sincronizar(respuesta);
      }

      return respuesta;
    };

    ajustada.__mv367Sync=true;
    ajustada.__mv367Original=original;

    window.boApi=ajustada;
    try{boApi=ajustada;}catch(_){}

    return true;
  }

  let intentos=0;
  const temporizador=setInterval(()=>{
    intentos++;
    if(aplicar()||intentos>40){
      clearInterval(temporizador);
    }
  },100);

  window.MV367_BASE_OPERATIVA_SYNC_OK=true;
})();