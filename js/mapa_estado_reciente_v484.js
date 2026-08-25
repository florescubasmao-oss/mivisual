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

  // Reemplaza solo el mensaje posterior al registro para exponer los
  // controles nuevos que devuelve el backend V484.
  if(typeof window.moRegistrarImportacion === "function"){
    window.moRegistrarImportacion = async function(){
      if(!window.moImportacion || !window.moImportacion.length) return;
      const btn=document.getElementById('moBtnImportar');
      const msg=document.getElementById('moImportMsg');
      if(btn) btn.disabled=true;
      if(msg){msg.className='mo-msg';msg.textContent='Registrando información...';}
      try{
        const d=await window.moApi({accion:'importarMapaOperativo',usuario:window.moUsuario(),registros:window.moImportacion});
        const c=d.catalogoCto||{};
        const cambios=Number(d.cambiosEstado||0);
        const antiguas=Number(d.versionesAntiguasIgnoradas||0);
        const confirmacion=`Registro confirmado: ${d.nuevos} nuevos, ${d.actualizados} actualizados, ${d.repetidosCarga||0} repetidos consolidados y ${d.omitidos||0} omitidos. Estados modificados: ${cambios}. Versiones antiguas protegidas: ${antiguas}.${d.consolidadosExistentes?` Se depuraron ${d.consolidadosExistentes} duplicados anteriores.`:''} Catálogo CTO: ${c.nuevos||0} nuevos, ${c.actualizados||0} actualizados, ${c.total||0} únicos.`;
        if(msg){msg.className='mo-msg mo-ok';msg.textContent=confirmacion;}
        if(typeof window.moPintarUltimaActualizacion === 'function') window.moPintarUltimaActualizacion(d.ultimaActualizacionTexto);
        window.moImportacion=[];
        try{
          if(typeof window.moCargarCatalogos === 'function') await window.moCargarCatalogos();
        }catch(errorCatalogos){
          if(msg){msg.className='mo-msg mo-ok';msg.textContent=confirmacion+' Los filtros se actualizarán al volver al mapa.';}
        }
      }catch(e){
        if(msg){msg.className='mo-msg mo-error';msg.textContent=e && e.message ? e.message : String(e);}
        if(btn) btn.disabled=false;
      }
    };
  }
})();
