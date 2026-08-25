/* ================================================================
   MI VISUAL V484 - Estado mas reciente en Mapa Operativo
   Capa incremental sobre mapa_operativo.js
   - Reconoce FechaUltiEsta como Fecha Ultimo Estado.
   - Muestra cambios de estado y versiones antiguas protegidas.
   - La proteccion real de recencia se valida tambien en backend V484.
================================================================ */
(function(){
  "use strict";
  if(window.MV484_MAPA_ESTADO_RECIENTE) return;
  window.MV484_MAPA_ESTADO_RECIENTE = true;

  function normCab(v){
    return (v == null ? "" : String(v)).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
  }

  // V484: el reporte madre usa "FechaUltiEsta". El lector anterior
  // buscaba solo "FechaUltimoEstado" / "Fecha Ultimo Estado".
  const valorOriginal = window.moValor;
  if(typeof valorOriginal === "function"){
    window.moValor = function(row,map){
      const nombres = Array.prototype.slice.call(arguments,2);
      const valor = valorOriginal.apply(this,arguments);
      if(valor !== null && valor !== undefined && String(valor).trim() !== "") return valor;

      const buscaFechaUltimoEstado = nombres.some(function(n){
        return normCab(n) === "FECHAULTIMOESTADO";
      });
      if(!buscaFechaUltimoEstado || !map || !row) return valor;

      const alias = ["FECHAULTIESTA","FECHAULTIESTADO","FECHAULTIMOESTADO"];
      for(let i=0;i<alias.length;i++){
        if(Object.prototype.hasOwnProperty.call(map,alias[i])){
          const v = row[map[alias[i]]];
          if(v !== null && v !== undefined && String(v).trim() !== "") return v;
        }
      }
      return valor;
    };
  }

  // Conservamos intacta la funcion original de registro. Solo capturamos
  // la respuesta de importarMapaOperativo para ampliar el mensaje final.
  let ultimoResultadoImportacion = null;
  const apiOriginal = window.moApi;
  if(typeof apiOriginal === "function"){
    window.moApi = async function(payload){
      const d = await apiOriginal.apply(this,arguments);
      if(payload && payload.accion === "importarMapaOperativo") ultimoResultadoImportacion = d;
      return d;
    };
  }

  const registrarOriginal = window.moRegistrarImportacion;
  if(typeof registrarOriginal === "function"){
    window.moRegistrarImportacion = async function(){
      ultimoResultadoImportacion = null;
      const r = await registrarOriginal.apply(this,arguments);
      const d = ultimoResultadoImportacion;
      const msg = document.getElementById("moImportMsg");
      if(d && msg && msg.classList.contains("mo-ok")){
        const cambios = Number(d.cambiosEstado || 0);
        const antiguas = Number(d.versionesAntiguasIgnoradas || 0);
        const extra = ` Estados modificados: ${cambios}. Versiones antiguas protegidas: ${antiguas}.`;
        if(!msg.textContent.includes("Versiones antiguas protegidas")) msg.textContent += extra;
      }
      return r;
    };
  }
})();
