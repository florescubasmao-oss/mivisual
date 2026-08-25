/* ================================================================
   MI VISUAL V485 - Conciliacion contra archivo base madre cargado
   - SOLO DIAGNOSTICO.
   - Usa BO_REGISTROS ya leidos en Actualizar Base Operativa.
   - No usa MAPA_ORDENES.
   - No modifica Produccion, Efectividad, Ranking ni hojas.
================================================================ */
(function(){
  "use strict";

  const API = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const ID_PANEL = "mv485ConciliacionPanel";

  function esc(v){
    return (v == null ? "" : String(v)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function usuario(){ return localStorage.getItem("usuario") || localStorage.getItem("correo") || ""; }
  function n(v){ return Number(v)||0; }
  function signo(v){ const x=n(v); return x>0?`+${x}`:String(x); }
  function kpi(valor,texto){ return `<div class="bo-kpi"><b>${esc(valor)}</b><span>${esc(texto)}</span></div>`; }
  function valor(f,claves){
    for(const k of claves){ if(f && f[k]!==undefined && f[k]!==null && String(f[k]).trim()!=="") return f[k]; }
    return "";
  }
  function tablaFinalizadas(filas,tipo){
    if(!filas || !filas.length) return `<div class="bo-msg bo-ok">Sin casos.</div>`;
    return `<div class="bo-table-wrap"><table class="bo-table"><thead><tr><th>Orden / Liq.</th><th>Fecha</th><th>Cuadrilla</th><th>Estado madre</th><th>Estado partner</th><th>Motivo</th></tr></thead><tbody>${filas.map(f=>{
      const orden=valor(f,["codigoLiquidacion","clave","ticket"]);
      const madre=valor(f,["estadoMadre","estado"]);
      const partner=valor(f,["estadoPartner","estado"]);
      const motivo=f.origen==="CONFLICTO_ESTADO"?"Estado diferente":(f.motivo==="COPIA_EXTRA_PARTNER"?"Copia histórica extra":(tipo==="FALTA"?"No está en partner":"Registro adicional"));
      return `<tr><td>${esc(orden)}</td><td>${esc(f.fecha||"")}</td><td>${esc(valor(f,["cuadrilla","cuadrillaPartner"]))}</td><td>${esc(madre)}</td><td>${esc(partner)}</td><td>${esc(motivo)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  async function apiPost(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
    const t=await r.text();
    let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta inválida del servidor");}
    if(!j.ok) throw new Error(j.error||"No se pudo ejecutar el diagnóstico");
    return j;
  }

  function datosCargados(){
    try{
      if(typeof BO_REGISTROS==="undefined" || !Array.isArray(BO_REGISTROS) || !BO_REGISTROS.length) return null;
      if(typeof BO_DUPLICADOS_REVISADOS!=="undefined" && BO_DUPLICADOS_REVISADOS!==true) return {pendienteDuplicados:true};
      return {
        registros:BO_REGISTROS.map(r=>({
          tipoTrabajo:r.tipoTrabajo||"",cuadrilla:r.cuadrilla||"",fecha:r.fecha||"",estado:r.estado||"",
          numeroDocumento:r.numeroDocumento||"",cliente:r.cliente||"",sede:r.sede||"",codigoPedido:r.codigoPedido||"",
          ticket:r.ticket||"",codigoLiquidacion:r.codigoLiquidacion||"",tipoAtencion:r.tipoAtencion||"",
          tipoPartida:r.tipoPartida||"",tipoPartidaAlterna:r.tipoPartidaAlterna||""
        })),
        archivo:(typeof BO_ARCHIVO!=="undefined"?BO_ARCHIVO:"")||"BASE MADRE CARGADA"
      };
    }catch(_){ return null; }
  }

  function renderResultado(j){
    const r=j.resumen||{},d=j.detalle||{};
    const dif=n(r.diferenciaFinalizadas);
    return `<div class="bo-msg bo-ok"><b>Comparación correcta · corte ${esc(j.corte)}</b><br>Fuente madre: ${esc(j.archivo)}. Solo lectura; no se modificó ninguna hoja.</div>
      <div class="bo-kpis">
        ${kpi(r.madreTotal||0,"Órdenes madre")}
        ${kpi(r.partnerTotal||0,"Órdenes partner")}
        ${kpi(r.madreFinalizadas||0,"Finalizadas madre")}
        ${kpi(r.partnerFinalizadas||0,"Finalizadas partner")}
        ${kpi(signo(r.diferenciaFinalizadas),"Diferencia finalizadas")}
        ${kpi(r.finalizadasExtras||0,"Finalizadas de más")}
        ${kpi(r.finalizadasFaltantes||0,"Finalizadas que faltan")}
        ${kpi(r.copiasExtraPartner||0,"Copias históricas extra")}
      </div>
      <div class="bo-msg ${dif===0?"bo-ok":"bo-warn"}"><b>Resultado:</b> ${esc(r.partnerFinalizadas||0)} - ${esc(r.madreFinalizadas||0)} = ${esc(signo(dif))}.<br>${esc(r.finalizadasExtras||0)} finalizadas de más - ${esc(r.finalizadasFaltantes||0)} finalizadas que faltan = ${esc(signo(dif))}.</div>
      <details class="bo-sede" open><summary>🔴 Finalizadas de más en partner (${esc(r.finalizadasExtras||0)})</summary><div class="bo-sede-cuerpo">${tablaFinalizadas(d.finalizadasExtras,"EXTRA")}</div></details>
      <details class="bo-sede" open><summary>🟡 Finalizadas que faltan en partner (${esc(r.finalizadasFaltantes||0)})</summary><div class="bo-sede-cuerpo">${tablaFinalizadas(d.finalizadasFaltantes,"FALTA")}</div></details>
      <details class="bo-sede"><summary>Otros hallazgos</summary><div class="bo-sede-cuerpo"><div class="bo-msg">Copias históricas extra: ${esc(r.copiasExtraPartner||0)} · Faltantes totales: ${esc(r.faltantes||0)} · Adicionales totales: ${esc(r.adicionales||0)} · Cambios de cuadrilla: ${esc(r.cambiosCuadrilla||0)} · Conflictos de estado: ${esc(r.conflictosEstado||0)} · Errores estructurales: ${esc(r.erroresEstructurales||0)}.</div></div></details>`;
  }

  async function diagnosticar(){
    const out=document.getElementById("mv485Resultado"),btn=document.getElementById("mv485Btn");
    if(!out) return;
    const base=datosCargados();
    if(!base){ out.innerHTML=`<div class="bo-msg bo-warn">Primero lea el archivo base madre en el cuadro de arriba.</div>`; return; }
    if(base.pendienteDuplicados){ out.innerHTML=`<div class="bo-msg bo-warn">Primero confirme la decisión de los duplicados detectados arriba.</div>`; return; }
    if(btn){btn.disabled=true;btn.textContent="Validando...";}
    out.innerHTML=`<div class="bo-msg">⏳ Comparando el archivo cargado contra la Base Operativa histórica. No se modificará nada.</div>`;
    try{
      const j=await apiPost({accion:"diagnosticarConciliacionArchivoBaseV485",usuario:usuario(),archivo:base.archivo,registros:base.registros});
      out.innerHTML=renderResultado(j);
    }catch(e){
      out.innerHTML=`<div class="bo-msg bo-error">❌ ${esc(e&&e.message?e.message:e)}</div>`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Validar diferencias";}
    }
  }

  function montar(){
    const viejo=document.getElementById("mv483ConciliacionPanel"); if(viejo) viejo.remove();
    if(document.getElementById(ID_PANEL)) return;
    const wrap=document.querySelector(".bo-wrap"); if(!wrap) return;
    const cards=wrap.querySelectorAll(":scope > .bo-card");
    const primera=cards&&cards.length?cards[0]:null;
    const div=document.createElement("div");
    div.id=ID_PANEL;div.className="bo-card";
    div.innerHTML=`<h3 style="margin-top:0">🔎 Validar diferencias del archivo cargado</h3>
      <p class="bo-note">1. Lea el archivo madre arriba. 2. Confirme los duplicados. 3. Pulse este botón. No necesita elegir período y no se modificará ningún dato.</p>
      <div class="bo-actions"><button id="mv485Btn" class="bo-btn" type="button">Validar diferencias</button></div>
      <div id="mv485Resultado" style="margin-top:12px"></div>`;
    if(primera) primera.insertAdjacentElement("afterend",div); else wrap.appendChild(div);
    document.getElementById("mv485Btn").onclick=diagnosticar;
  }

  const original=window.mostrarActualizarBaseOperativa;
  if(typeof original==="function"){
    window.mostrarActualizarBaseOperativa=function(){const r=original.apply(this,arguments);setTimeout(montar,0);return r;};
  }
  window.mv485DiagnosticarArchivo=diagnosticar;
  setTimeout(montar,0);
})();
