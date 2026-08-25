/* ================================================================
   MI VISUAL V483 - Conciliacion Base Operativa (SOLO DIAGNOSTICO)
   - No modifica datos.
   - Compara MAPA_ORDENES vs BASE_OPERATIVA_HISTORICA.
   - Solo se muestra en Actualizar Base Operativa / Administracion.
================================================================ */
(function(){
  "use strict";

  const API = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const ID_PANEL = "mv483ConciliacionPanel";

  function esc(v){
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function usuario(){ return localStorage.getItem("usuario") || localStorage.getItem("correo") || ""; }
  function periodoEtiqueta(valor){
    const m=(valor||"").match(/^(\d{4})-(\d{2})$/);
    if(!m) return valor||"";
    const meses=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    return `${meses[Number(m[2])-1]} ${m[1]}`;
  }
  function periodos(){
    const d=new Date();
    const out=[];
    for(let i=0;i<6;i++){
      const x=new Date(d.getFullYear(), d.getMonth()-i, 1);
      const v=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`;
      out.push({v,t:periodoEtiqueta(v)});
    }
    return out;
  }
  async function apiGet(params){
    const q=new URLSearchParams(params);
    const r=await fetch(`${API}?${q.toString()}`,{method:"GET",cache:"no-store"});
    const t=await r.text();
    let j;
    try{ j=JSON.parse(t); }catch(e){ throw new Error("Respuesta inválida del servidor"); }
    if(!j.ok) throw new Error(j.error || "No se pudo ejecutar la conciliación");
    return j;
  }
  function kpi(n,txt){
    return `<div class="bo-kpi"><b>${esc(n)}</b><span>${esc(txt)}</span></div>`;
  }
  function tabla(filas, columnas){
    if(!filas || !filas.length) return `<div class="bo-msg bo-ok">Sin casos.</div>`;
    return `<div class="bo-table-wrap"><table class="bo-table"><thead><tr>${columnas.map(c=>`<th>${esc(c.t)}</th>`).join("")}</tr></thead><tbody>${filas.map(f=>`<tr>${columnas.map(c=>`<td>${esc(typeof c.v==="function"?c.v(f):(f[c.v]??""))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function renderResultado(j){
    const r=j.resumen||{}, d=j.detalle||{};
    return `<div class="bo-msg bo-ok"><b>Diagnóstico ${esc(periodoEtiqueta(j.periodo))}</b> · corte ${esc(j.corte)}<br>Solo lectura. No se modificó ninguna hoja.</div>
      <div class="bo-kpis">
        ${kpi(r.madreTotal||0,"Órdenes madre")}
        ${kpi(r.partnerRawTotal||0,"Partner actual")}
        ${kpi(r.madreFinalizadas||0,"Finalizadas madre")}
        ${kpi(r.partnerRawFinalizadas||0,"Finalizadas partner")}
        ${kpi(r.copiasDuplicadasExtras||0,"Copias duplicadas extra")}
        ${kpi(r.faltantes||0,"Faltantes en partner")}
        ${kpi(r.adicionales||0,"Adicionales sin madre")}
        ${kpi(r.cambiosCuadrilla||0,"Cambios de cuadrilla")}
      </div>
      <p class="bo-note">Los cambios de cuadrilla son informativos: una orden puede acreditarse a otra cuadrilla sin aumentar el total general. Duplicados, faltantes, adicionales y conflictos de estado requieren revisión.</p>
      <details class="bo-sede"><summary>⚠️ Duplicados históricos (${esc(r.duplicadosHistoricos||0)} grupos / ${esc(r.copiasDuplicadasExtras||0)} copias extra)</summary><div class="bo-sede-cuerpo">${tabla(d.duplicados,[
        {t:"Orden",v:"ordenId"},{t:"Estado madre",v:"estadoMadre"},{t:"Cuadrilla madre",v:"cuadrillaMadre"},{t:"Registros",v:"cantidad"},{t:"Extras",v:"extras"},{t:"Canónico",v:x=>x.canonico?`${x.canonico.codigoLiquidacion} · ${x.canonico.cuadrilla}`:""}
      ])}</div></details>
      <details class="bo-sede"><summary>❌ Faltantes en partner (${esc(r.faltantes||0)})</summary><div class="bo-sede-cuerpo">${tabla(d.faltantes,[
        {t:"Orden",v:"ordenId"},{t:"Fecha",v:"fecha"},{t:"Estado",v:"estado"},{t:"Cuadrilla madre",v:"cuadrilla"},{t:"DNI",v:"dni"},{t:"Ticket",v:"ticket"}
      ])}</div></details>
      <details class="bo-sede"><summary>➕ Adicionales sin coincidencia madre (${esc(r.adicionales||0)})</summary><div class="bo-sede-cuerpo">${tabla(d.adicionales,[
        {t:"Clave",v:"clave"},{t:"Fecha",v:"fecha"},{t:"Estado",v:"estado"},{t:"Cuadrilla",v:"cuadrilla"},{t:"Liq/Orden",v:"codigoLiquidacion"},{t:"Ticket",v:"ticket"},{t:"Archivo",v:"archivo"}
      ])}</div></details>
      <details class="bo-sede"><summary>🔁 Cambios de cuadrilla (${esc(r.cambiosCuadrilla||0)})</summary><div class="bo-sede-cuerpo">${tabla(d.cambiosCuadrilla,[
        {t:"Orden",v:"ordenId"},{t:"Fecha",v:"fecha"},{t:"Madre",v:"cuadrillaMadre"},{t:"Responsable partner",v:"cuadrillaPartner"},{t:"Estado",v:"estado"},{t:"Cruce",v:"modoCoincidencia"}
      ])}</div></details>
      <details class="bo-sede"><summary>🚨 Conflictos de estado (${esc(r.conflictosEstado||0)})</summary><div class="bo-sede-cuerpo">${tabla(d.conflictosEstado,[
        {t:"Orden",v:"ordenId"},{t:"Fecha",v:"fecha"},{t:"Estado madre",v:"estadoMadre"},{t:"Estado partner",v:"estadoPartner"},{t:"Cuadrilla partner",v:"cuadrillaPartner"}
      ])}</div></details>
      <details class="bo-sede"><summary>🧩 Errores estructurales detectados (${esc(r.erroresEstructurales||0)})</summary><div class="bo-sede-cuerpo">${tabla(d.erroresEstructurales,[
        {t:"Orden",v:"ordenId"},{t:"Motivo",v:"motivo"},{t:"Clave base",v:x=>x.base?x.base.clave:""},{t:"Liq/Orden base",v:x=>x.base?x.base.codigoLiquidacion:""},{t:"Ticket base",v:x=>x.base?x.base.ticket:""},{t:"Archivo",v:x=>x.base?x.base.archivo:""}
      ])}</div></details>`;
  }

  function montar(){
    if(document.getElementById(ID_PANEL)) return;
    const wrap=document.querySelector(".bo-wrap");
    if(!wrap) return;
    const cards=wrap.querySelectorAll(":scope > .bo-card");
    const ancla=cards && cards.length ? cards[0] : null;
    const opts=periodos().map(p=>`<option value="${p.v}">${p.t}</option>`).join("");
    const div=document.createElement("div");
    div.id=ID_PANEL;
    div.className="bo-card";
    div.innerHTML=`<h3 style="margin-top:0">🔎 Conciliación con Mapa Operativo</h3>
      <p class="bo-note">Diagnóstico preventivo. Compara la fuente madre contra la Base Operativa histórica sin modificar Producción, Efectividad, Ranking ni ninguna hoja.</p>
      <div class="bo-grid"><label><b>Período</b><select id="mv483Periodo" class="bo-select">${opts}</select></label><button id="mv483Btn" class="bo-btn" type="button">Diagnosticar</button></div>
      <div id="mv483Resultado" style="margin-top:12px"></div>`;
    if(ancla) wrap.insertBefore(div,ancla); else wrap.appendChild(div);
    const btn=document.getElementById("mv483Btn");
    if(btn) btn.onclick=diagnosticar;
  }

  async function diagnosticar(){
    const btn=document.getElementById("mv483Btn");
    const out=document.getElementById("mv483Resultado");
    const per=document.getElementById("mv483Periodo");
    if(!out) return;
    if(btn){btn.disabled=true;btn.textContent="Analizando...";}
    out.innerHTML=`<div class="bo-msg">⏳ Comparando Mapa Operativo y Base Operativa. No cierre esta pantalla.</div>`;
    try{
      const j=await apiGet({accion:"diagnosticarConciliacionBaseOperativaV483",usuario:usuario(),periodo:per?per.value:""});
      out.innerHTML=renderResultado(j);
    }catch(e){
      out.innerHTML=`<div class="bo-msg bo-error">❌ ${esc(e && e.message ? e.message : e)}</div>`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Diagnosticar";}
    }
  }

  const original=window.mostrarActualizarBaseOperativa;
  if(typeof original==="function"){
    window.mostrarActualizarBaseOperativa=function(){
      const r=original.apply(this,arguments);
      setTimeout(montar,0);
      return r;
    };
  }
  window.mv483DiagnosticarConciliacion=diagnosticar;
  setTimeout(montar,0);
})();
