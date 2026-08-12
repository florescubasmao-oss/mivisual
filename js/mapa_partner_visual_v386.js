/* ============================================================
   MI VISUAL V386 - Mapa Operativo: solo cuadrillas Visual P#
   OBJETIVO
   - Evitar cargar bases de otros partners por error.
   - Solo aceptar cuadrillas que comiencen con P + número:
     P1, P2, P3, P10, P 6, etc.
   - Si el archivo contiene una cuadrilla distinta (K, etc.),
     se rechaza TODA la carga antes de enviar a Apps Script.
   - Sin cambios de backend.
============================================================ */
(function(){
  "use strict";

  if(window.MV386_MAPA_SOLO_P_OK) return;

  function norm(v){
    return String(v||"")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esCuadrillaVisualP(valor){
    const t=norm(valor);
    return /^P\s*\d+(?:\s|$)/.test(t);
  }

  function validarImportacion(){
    let registros=[];
    try{
      if(typeof moImportacion!=="undefined" && Array.isArray(moImportacion)){
        registros=moImportacion;
      }
    }catch(_){}

    if(!registros.length){
      return {ok:true,total:0,invalidos:[]};
    }

    const invalidos=registros.filter(r=>!esCuadrillaVisualP(r && r.cuadrilla));

    return {
      ok:invalidos.length===0,
      total:registros.length,
      invalidos
    };
  }

  function bloquearCarga(resultado){
    try{ moImportacion=[]; }catch(_){}

    const btn=document.getElementById("moBtnImportar");
    if(btn) btn.disabled=true;

    const msg=document.getElementById("moImportMsg");
    if(!msg) return;

    const nombres=[...new Set(
      (resultado.invalidos||[])
        .map(r=>norm(r && r.cuadrilla) || "SIN CUADRILLA")
    )].slice(0,8);

    msg.className="mo-msg mo-error";
    msg.textContent=
      `Archivo rechazado: se detectaron ${resultado.invalidos.length} `+
      `registro(s) que no pertenecen a cuadrillas Visual P#.\n`+
      `Solo se aceptan cuadrillas como P1, P2, P3, P10, P 6, etc.`+
      (nombres.length
        ? `\nDetectadas: ${nombres.join(", ")}${resultado.invalidos.length>nombres.length?"…":""}`
        : "")+
      `\nNo se registró ningún dato.`;
  }

  function mensajeCargaValida(resultado){
    const msg=document.getElementById("moImportMsg");
    if(!msg || !resultado.total) return;

    const actual=String(msg.textContent||"");
    if(actual.includes("Validación partner: OK")) return;

    msg.className="mo-msg mo-ok";
    msg.textContent=
      actual+
      `\n✅ Validación partner: OK. ${resultado.total} registro(s) pertenecen a cuadrillas P#.`;
  }

  function instalar(){
    const leer=window.moLeerArchivo;
    const registrar=window.moRegistrarImportacion;

    if(typeof leer!=="function" || typeof registrar!=="function"){
      return false;
    }

    if(!leer.__mv386SoloP){
      const originalLeer=leer;

      const ajustadaLeer=async function(){
        const resultado=await originalLeer.apply(this,arguments);

        const control=validarImportacion();
        if(!control.ok){
          bloquearCarga(control);
        }else{
          mensajeCargaValida(control);
        }

        return resultado;
      };

      ajustadaLeer.__mv386SoloP=true;
      ajustadaLeer.__original=originalLeer;

      window.moLeerArchivo=ajustadaLeer;
      try{moLeerArchivo=ajustadaLeer;}catch(_){}
    }

    if(!registrar.__mv386SoloP){
      const originalRegistrar=registrar;

      const ajustadaRegistrar=async function(){
        const control=validarImportacion();

        if(!control.ok){
          bloquearCarga(control);
          return null;
        }

        return await originalRegistrar.apply(this,arguments);
      };

      ajustadaRegistrar.__mv386SoloP=true;
      ajustadaRegistrar.__original=originalRegistrar;

      window.moRegistrarImportacion=ajustadaRegistrar;
      try{moRegistrarImportacion=ajustadaRegistrar;}catch(_){}
    }

    return true;
  }

  let intentos=0;
  const timer=setInterval(()=>{
    intentos++;
    if(instalar() || intentos>80){
      clearInterval(timer);
    }
  },100);

  window.mv386EsCuadrillaVisualP=esCuadrillaVisualP;
  window.MV386_MAPA_SOLO_P_OK=true;
})();