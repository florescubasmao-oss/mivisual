/* ============================================================
   MI VISUAL V369 - Sincronización rápida posterior a Base Operativa
   OBJETIVO:
   - Producción, Efectividad, Recableado, VTR/GAR y Ranking quedan visibles
     sin esperar la reconstrucción completa del SLA.
   - SLA se recalcula en segundo plano una sola vez.
   - No es necesario volver a subir el mismo archivo.
============================================================ */
(function(){
  "use strict";

  if(window.MV369_BASE_OPERATIVA_SYNC_OK) return;

  const SLA_EN_CURSO = new Map();

  function limpiarCacheLocal(){
    try{
      const eliminar=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(
          key &&
          (
            key.startsWith("mv366ResumenDashboard:") ||
            key.startsWith("mv367ResumenDashboard:") ||
            key.startsWith("mv369ResumenDashboard:")
          )
        ){
          eliminar.push(key);
        }
      }
      eliminar.forEach(key=>localStorage.removeItem(key));
    }catch(_){}
  }

  function periodoClaveDesdeRespuesta(respuesta){
    const valor=String(
      respuesta?.periodoClave ||
      respuesta?.periodo ||
      ""
    ).trim();

    if(/^\d{4}-\d{2}$/.test(valor)) return valor;

    const meses={
      ENERO:"01",FEBRERO:"02",MARZO:"03",ABRIL:"04",
      MAYO:"05",JUNIO:"06",JULIO:"07",AGOSTO:"08",
      SEPTIEMBRE:"09",OCTUBRE:"10",NOVIEMBRE:"11",DICIEMBRE:"12"
    };

    const mes=meses[valor.toUpperCase()];
    const corte=String(respuesta?.actualizadoAl||"");
    const anio=(corte.match(/(\d{4})/)||[])[1];

    return mes&&anio ? `${anio}-${mes}` : "";
  }

  function mensajeAgregar(texto){
    const mensaje=document.getElementById("boMensaje");
    if(!mensaje || !texto) return;

    const actual=String(mensaje.textContent||"");
    if(actual.includes(texto)) return;

    mensaje.textContent = actual
      ? `${actual}\n${texto}`
      : texto;
  }

  function invalidarPeriodo(periodo){
    limpiarCacheLocal();

    if(
      periodo &&
      typeof window.mv366InvalidarResumenDashboard==="function"
    ){
      window.mv366InvalidarResumenDashboard(periodo);
    }
  }

  async function precalentar(periodo,forzar){
    if(
      !periodo ||
      typeof window.mv361ConsultarResumenDashboardRanking!=="function"
    ) return null;

    try{
      return await window.mv361ConsultarResumenDashboardRanking(
        periodo,
        !!forzar
      );
    }catch(error){
      console.warn(
        "V369: no se pudo precalentar el resumen",
        error
      );
      return null;
    }
  }

  function reconstruirSlaSegundoPlano(periodo,apiOriginal){
    if(!periodo || typeof apiOriginal!=="function") return;
    if(SLA_EN_CURSO.has(periodo)) return;

    const trabajo=(async()=>{
      try{
        mensajeAgregar(
          "⏱️ SLA: sincronizando en segundo plano. No vuelva a subir el archivo."
        );

        await apiOriginal({
          accion:"reconstruirSlaPeriodo",
          usuario:(
            localStorage.getItem("usuario") ||
            localStorage.getItem("correo") ||
            ""
          ),
          periodo
        });

        invalidarPeriodo(periodo);
        await precalentar(periodo,false);

        mensajeAgregar(
          "✅ SLA sincronizado con la nueva base."
        );

        try{
          window.dispatchEvent(new CustomEvent(
            "mv369SlaSincronizado",
            {detail:{periodo}}
          ));
        }catch(_){}
      }catch(error){
        console.warn(
          "V369: la base quedó actualizada, pero SLA no pudo recalcularse en segundo plano",
          error
        );

        mensajeAgregar(
          "ℹ️ Producción y demás indicadores ya están actualizados. SLA se recalculará al abrirlo."
        );
      }
    })().finally(()=>{
      SLA_EN_CURSO.delete(periodo);
    });

    SLA_EN_CURSO.set(periodo,trabajo);
  }

  async function sincronizar(respuesta,apiOriginal){
    const periodo=periodoClaveDesdeRespuesta(respuesta);

    invalidarPeriodo(periodo);

    mensajeAgregar(
      `✅ Indicadores actualizados al ${respuesta?.actualizadoAl||"nuevo corte"}.`
    );
    mensajeAgregar(
      "Producción, Efectividad, Recableado y VTR/GAR ya pueden consultarse. No repita la carga."
    );

    // La ruta rápida ya fue escrita por Apps Script. Se precalienta de inmediato
    // y no se espera la reconstrucción completa del SLA.
    setTimeout(()=>{
      precalentar(periodo,false);
    },100);

    // SLA se procesa aparte para que la carga principal no quede detenida.
    setTimeout(()=>{
      reconstruirSlaSegundoPlano(periodo,apiOriginal);
    },350);
  }

  function aplicar(){
    if(
      typeof window.boApi!=="function" &&
      typeof boApi!=="function"
    ){
      return false;
    }

    const original=window.boApi||boApi;

    if(original.__mv369Sync) return true;

    const ajustada=async function(payload){
      const respuesta=await original.apply(this,arguments);

      if(
        payload?.accion==="procesarBaseOperativa" &&
        respuesta?.ok
      ){
        sincronizar(respuesta,original);
      }

      return respuesta;
    };

    ajustada.__mv369Sync=true;
    ajustada.__mv369Original=original;

    window.boApi=ajustada;
    try{boApi=ajustada;}catch(_){}

    return true;
  }

  let intentos=0;
  const temporizador=setInterval(()=>{
    intentos++;
    if(aplicar()||intentos>50){
      clearInterval(temporizador);
    }
  },100);

  window.MV369_BASE_OPERATIVA_SYNC_OK=true;
})();