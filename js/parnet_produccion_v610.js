/* ============================================================
   MI VISUAL V610 - CONCILIACION PARNET OCTUBRE
   Frontend aislado. Requiere backend V610 instalado.
============================================================ */
(function(){
  "use strict";
  if(window.MV610_PARNET_UI) return;
  window.MV610_PARNET_UI=true;

  let registros=[];
  let archivo="";
  let preview=null;

  function esc(v){return typeof boEsc==="function"?boEsc(v):String(v==null?"":v);}
  function api(payload){
    if(typeof boApi!=="function") return Promise.reject(new Error("Base Operativa no está disponible."));
    return boApi(payload);
  }
  function usuario(){return typeof boUsuario==="function"?boUsuario():(localStorage.getItem("usuario")||"");}

  function leerComoTexto(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onload=()=>resolve(String(fr.result||"")); fr.onerror=()=>reject(new Error("No se pudo leer el archivo")); fr.readAsText(file);
    });
  }
  function leerComoArray(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=()=>reject(new Error("No se pudo leer el archivo")); fr.readAsArrayBuffer(file);
    });
  }
  async function extraer(file){
    if(!file) throw new Error("Seleccione la base PARNET.");
    archivo=file.name||"BASE PARNET";
    const texto=await leerComoTexto(file);
    if(/<html|<table/i.test(texto.slice(0,50000))){
      if(typeof boResultadoHtmlDirecto!=="function") throw new Error("El lector HTML de Base Operativa no está disponible.");
      return boResultadoHtmlDirecto(texto).registros||[];
    }
    await boCargarXlsx();
    const buf=await leerComoArray(file);
    const wb=XLSX.read(buf,{type:"array",cellDates:true});
    const sel=boBuscarHojaValida(wb);
    return (boExtraerRegistros(sel.rows,sel.filaEnc,sel.heads).registros)||[];
  }

  function resumenHtml(r){
    const s=r.resumen||{}, b=r.bloqueos||{}, d=r.detalle||{};
    const bloqueado=Object.keys(b).some(k=>b[k]);
    const cambios=(d.cambiosPorCuadrilla||[]).slice(0,80);
    return `
      <div class="bo-kpis">
        <div class="bo-kpi"><b>${s.finalizadasParnet||0}</b><span>Finalizadas PARNET</span></div>
        <div class="bo-kpi"><b>${s.produccionParnetOrdenes||0}</b><span>Órdenes Producción PARNET</span></div>
        <div class="bo-kpi"><b>${Number(s.puntosParnet||0).toFixed(1)}</b><span>Puntos PARNET</span></div>
        <div class="bo-kpi"><b>${s.diferenciaOrdenes>0?"+":""}${s.diferenciaOrdenes||0}</b><span>Diferencia vs actual</span></div>
      </div>
      <div class="bo-msg ${bloqueado?"bo-warn":"bo-ok"}">
        ${bloqueado
          ? "PREVISUALIZACIÓN CON BLOQUEOS. No se permitirá aplicar hasta resolverlos."
          : "PREVISUALIZACIÓN CORRECTA. No se ha modificado ninguna hoja."}
        <br>Actual: ${s.produccionActualOrdenes||0} órdenes / ${Number(s.puntosActuales||0).toFixed(1)} pts
        <br>PARNET: ${s.produccionParnetOrdenes||0} órdenes / ${Number(s.puntosParnet||0).toFixed(1)} pts
        <br>Diferencia puntos: ${Number(s.diferenciaPuntos||0).toFixed(1)}
      </div>
      ${(s.finalizadasSinLiquidacion||0)?`<div class="bo-msg bo-error">Finalizadas sin Código de Liquidación: <b>${s.finalizadasSinLiquidacion}</b></div>`:""}
      ${(s.duplicadosCodigoLiquidacion||0)?`<div class="bo-msg bo-error">Códigos de Liquidación duplicados: <b>${s.duplicadosCodigoLiquidacion}</b></div>`:""}
      ${(s.partidasNoCatalogadas||0)?`<div class="bo-msg bo-error">Finalizadas con partida no configurada: <b>${s.partidasNoCatalogadas}</b></div>`:""}
      ${(s.cuadrillasNoEncontradas||0)?`<div class="bo-msg bo-error">Cuadrillas no reconocidas: <b>${s.cuadrillasNoEncontradas}</b></div>`:""}
      ${s.parnetDesactualizado?`<div class="bo-msg bo-error"><b>Corte PARNET desactualizado.</b> PARNET llega hasta ${esc(s.corteParnet||"-")}, mientras los indicadores actuales llegan hasta ${esc(s.corteActual||"-")}. No se permite retroceder octubre.</div>`:""}
      <p class="bo-note">Regla V610.1: PARNET manda sobre FINALIZADAS de octubre solo si su corte es igual o posterior al corte actual. Efectividad conserva canceladas/regestión/reprogramadas WIN; Recableado conserva LOS ROJO asignadas; VTR/GAR conserva GAR y VTR. Septiembre y anteriores están protegidos.</p>
      ${cambios.length?`
      <h3>Cambios por cuadrilla</h3>
      <div class="bo-table-wrap"><table class="bo-table"><thead><tr><th>Cuadrilla</th><th>Órd. actual</th><th>Órd. PARNET</th><th>Dif.</th><th>Pts actual</th><th>Pts PARNET</th><th>Dif. pts</th></tr></thead><tbody>
        ${cambios.map(x=>`<tr><td>${esc(x.cuadrilla)}</td><td>${x.ordenesActual}</td><td>${x.ordenesParnet}</td><td>${x.diferenciaOrdenes}</td><td>${Number(x.puntosActual).toFixed(1)}</td><td>${Number(x.puntosParnet).toFixed(1)}</td><td><b>${Number(x.diferenciaPuntos).toFixed(1)}</b></td></tr>`).join("")}
      </tbody></table></div>`:""}
      <div class="bo-actions">
        <button id="mv610Aplicar" class="bo-btn warn" ${bloqueado?"disabled":""} onclick="mv610AplicarParnet()">Aplicar conciliación octubre</button>
        <button class="bo-btn alt" onclick="mostrarActualizarBaseOperativa()">⬅️ Volver</button>
      </div>`;
  }

  window.mostrarConciliacionParnetV610=function(){
    registros=[];archivo="";preview=null;
    mostrarPantalla(boCss()+`<div class="bo-wrap">
      <div class="bo-head"><h2>🧾 Conciliar Producción PARNET · Octubre 2026</h2>
      <p>PARNET será la fuente de verdad únicamente para órdenes FINALIZADAS de octubre.</p></div>
      <div class="bo-card">
        <div class="bo-msg bo-warn"><b>Protección activa:</b> septiembre y meses anteriores no pueden modificarse con esta opción. MAPA_ORDENES tampoco se modifica.</div>
        <div class="bo-grid" style="margin-top:12px"><div><label><b>Base PARNET</b></label><input id="mv610Archivo" class="bo-file" type="file" accept=".xlsx,.xls,.csv,.htm,.html"></div>
        <button class="bo-btn" onclick="mv610PrevisualizarParnet()">Previsualizar</button></div>
        <div id="mv610Resultado" class="bo-msg">Seleccione la base PARNET de octubre. Primero se realizará una comparación sin escritura.</div>
        <div class="bo-actions"><button class="bo-btn alt" onclick="mostrarActualizarBaseOperativa()">⬅️ Volver</button></div>
      </div></div>`);
  };

  window.mv610PrevisualizarParnet=async function(){
    const out=document.getElementById("mv610Resultado");
    try{
      out.className="bo-msg"; out.textContent="Leyendo PARNET y comparando con octubre actual...";
      const file=document.getElementById("mv610Archivo").files[0];
      registros=await extraer(file);
      if(!registros.length) throw new Error("No se encontraron registros válidos.");
      preview=await api({accion:"previsualizarParnetOctubreV610",usuario:usuario(),archivo,registros});
      out.className=""; out.innerHTML=resumenHtml(preview);
    }catch(e){
      preview=null; out.className="bo-msg bo-error"; out.textContent=e.message||String(e);
    }
  };

  window.mv610AplicarParnet=async function(){
    if(!preview || !registros.length) return alert("Primero ejecute la previsualización.");
    if(!confirm("Se reemplazarán SOLO los indicadores de OCTUBRE según las FINALIZADAS PARNET.\n\nSeptiembre y meses anteriores permanecerán intactos.\n\n¿Continuar?")) return;
    const btn=document.getElementById("mv610Aplicar"); if(btn) btn.disabled=true;
    try{
      const r=await api({accion:"aplicarParnetOctubreV610",usuario:usuario(),archivo,registros,confirmacion:"APLICAR_PARNET_OCTUBRE_V610"});
      alert("Conciliación PARNET aplicada correctamente.\nFinalizadas: "+(r.finalizadasParnet||0)+"\nÓrdenes de Producción: "+((r.produccion&&r.produccion.ordenes)||0)+"\nPuntos: "+((r.produccion&&r.produccion.puntos)||0));
      mostrarConciliacionParnetV610();
    }catch(e){
      alert(e.message||String(e)); if(btn) btn.disabled=false;
    }
  };
})();