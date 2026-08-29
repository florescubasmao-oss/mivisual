/* ============================================================
   MI VISUAL V517D F4S2 - FILTROS TECNICO ESTABLES
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Elimina el filtro de sede de la vista del Tecnico.
   - Evita que capas legacy restauren "Recableado y Otro".
   - Mantiene unicamente: Todos mis registros / Recableado / GAR / VTR / Otro.
   - No toca backend, permisos, Sheets ni otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4S2_FILTROS_TECNICO_OK) return;
  window.MV517D_F4S2_FILTROS_TECNICO_OK=true;

  function norm(v){
    return String(v==null?"":v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esTecnico(){
    return norm(localStorage.getItem("perfil")||"")==="TECNICO";
  }

  function fijar(){
    if(!esTecnico()) return;
    const hist=document.getElementById("vtHistorial");
    const tipo=document.getElementById("vtFiltroTipo");
    const sede=document.getElementById("vtFiltroSede");

    if(sede) sede.remove();

    if(tipo){
      const actual=tipo.value||"";
      const valores=Array.from(tipo.options||[]).map(function(o){return String(o.value||"");});
      const textoPrimero=tipo.options&&tipo.options.length?norm(tipo.options[0].textContent||""):"";
      const correcto=valores.length===5 &&
        valores[0]==="" && valores[1]==="RECABLEADO" && valores[2]==="GAR" &&
        valores[3]==="VTR" && valores[4]==="OTRO" && textoPrimero==="TODOS MIS REGISTROS";

      if(!correcto){
        tipo.innerHTML='<option value="">Todos mis registros</option>'+
          '<option value="RECABLEADO">Recableado</option>'+
          '<option value="GAR">GAR</option>'+
          '<option value="VTR">VTR</option>'+
          '<option value="OTRO">Otro</option>';
        tipo.value=["","RECABLEADO","GAR","VTR","OTRO"].includes(actual)?actual:"";
      }
    }

    const buscar=document.getElementById("vtBuscarCodigo");
    if(buscar) buscar.placeholder="🔍 Buscar por código, DNI o ticket";

    if(hist && hist.dataset.mv517dF4s!=="1" && typeof window.renderHistorialValidacionLocal==="function"){
      try{ window.renderHistorialValidacionLocal(); }catch(_){}
    }
  }

  let timer=null;
  function programar(){
    clearTimeout(timer);
    timer=setTimeout(fijar,20);
  }

  if(document.body){
    const obs=new MutationObserver(function(){ if(esTecnico()) programar(); });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){ if(esTecnico()) setTimeout(fijar,40); },true);
  [0,100,300,700,1400,2500].forEach(function(ms){setTimeout(fijar,ms);});
  setInterval(fijar,1500);

  console.log("MI VISUAL V517D F4S2: filtros del Tecnico restringidos y estables.");
})();