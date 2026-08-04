/* ==========================================================
   MI VISUAL V343 - Recepción rápida de actas
   - Ingreso por filas, sin textarea.
   - Validación automática por lote y estado al costado.
   - Selección explícita de las actas que se recibirán.
========================================================== */
(function(){
  "use strict";

  const MAX_ACTAS_V343 = 20;
  const FILAS_INICIALES_V343 = 6;
  let temporizadorValidacionV343 = null;
  let secuenciaValidacionV343 = 0;

  function normalizarV343(v){
    return String(v ?? "").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function escaparV343(v){
    if(typeof window.limpiarHtmlActas === "function") return window.limpiarHtmlActas(v);
    return String(v ?? "").replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function estadoHtmlV343(estado, detalle){
    const e = normalizarV343(estado);
    const mapa = {
      VALIDA:["ok","✅ Escaneada"],
      NO_REGISTRADA:["bad","❌ No escaneada"],
      YA_ENTREGADA:["info","🔵 Ya recibida"],
      OTRA_CUADRILLA:["warn","🟠 Otra cuadrilla"],
      DUPLICADA:["muted","⚪ Duplicada"],
      FECHA_PENDIENTE:["warn","🕒 Fecha pendiente"],
      BUSCANDO:["loading","⏳ Consultando"],
      VACIA:["empty","Pendiente"]
    };
    const cfg = mapa[e] || mapa.VACIA;
    return `<span class="ra343-status ${cfg[0]}">${cfg[1]}</span>${detalle?`<small class="ra343-detail">${escaparV343(detalle)}</small>`:""}`;
  }

  function estilosV343(){
    return `<style id="ra343Estilos">
      .ra343-card{background:#fff;border:1px solid #dbe3ee;border-radius:18px;padding:16px;box-shadow:0 8px 22px rgba(15,23,42,.10);color:#0f172a}
      .ra343-selects{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-bottom:14px}
      .ra343-field label{display:block;color:#334155!important;text-shadow:none!important;font-size:12px;font-weight:900;margin:0 0 5px}
      .ra343-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:11px;background:#fff;color:#0f172a;font-weight:800}
      .ra343-headrow{display:grid;grid-template-columns:42px minmax(150px,1fr) minmax(180px,1.45fr) 95px 42px;gap:8px;align-items:center;padding:0 8px 6px;color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}
      .ra343-list{display:grid;gap:8px}
      .ra343-row{display:grid;grid-template-columns:42px minmax(150px,1fr) minmax(180px,1.45fr) 95px 42px;gap:8px;align-items:center;border:1px solid #e2e8f0;border-radius:14px;padding:8px;background:#f8fafc}
      .ra343-num{width:34px;height:34px;border-radius:10px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:900;color:#334155}
      .ra343-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:11px;padding:10px;font-size:15px;font-weight:900;color:#0f172a;background:#fff}
      .ra343-input:focus{outline:3px solid rgba(37,99,235,.15);border-color:#2563eb}
      .ra343-state{min-height:42px;display:flex;flex-direction:column;justify-content:center}
      .ra343-status{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:900}
      .ra343-status.ok{background:#dcfce7;color:#166534}.ra343-status.bad{background:#fee2e2;color:#991b1b}
      .ra343-status.info{background:#dbeafe;color:#1d4ed8}.ra343-status.warn{background:#fef3c7;color:#92400e}
      .ra343-status.muted{background:#e5e7eb;color:#475569}.ra343-status.loading{background:#e0f2fe;color:#075985}
      .ra343-status.empty{background:#f1f5f9;color:#64748b}
      .ra343-detail{display:block;margin-top:4px;color:#64748b;line-height:1.25}
      .ra343-check{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:900;color:#334155}
      .ra343-check input{width:18px;height:18px;accent-color:#16a34a}
      .ra343-delete{border:0;border-radius:9px;width:34px;height:34px;background:#fee2e2;color:#b91c1c;font-size:18px;font-weight:900;cursor:pointer}
      .ra343-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .ra343-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}
      .ra343-kpi{border:1px solid #e2e8f0;border-radius:13px;padding:9px;text-align:center;background:#f8fafc}
      .ra343-kpi b{display:block;font-size:20px}.ra343-kpi span{font-size:10px;color:#64748b;font-weight:900}
      .ra343-help{margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.4}
      .ra343-result{margin-top:14px;border:1px solid #86efac;background:#f0fdf4;color:#166534;border-radius:14px;padding:14px}
      .ra343-error{margin-top:12px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:13px;padding:11px;font-weight:800}
      @media(max-width:720px){
        .ra343-selects{grid-template-columns:1fr}
        .ra343-headrow{display:none}
        .ra343-row{grid-template-columns:38px 1fr 38px;grid-template-areas:"num input del" ". state state" ". check check"}
        .ra343-num{grid-area:num}.ra343-input{grid-area:input}.ra343-state{grid-area:state}.ra343-check{grid-area:check;justify-content:flex-start}.ra343-delete{grid-area:del}
        .ra343-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
    </style>`;
  }

  function filaV343(indice, valor){
    return `<div class="ra343-row" data-fila="${indice}">
      <div class="ra343-num">${indice}</div>
      <input class="ra343-input" id="ra343Numero${indice}" value="${escaparV343(valor||"")}" inputmode="numeric"
        autocomplete="off" placeholder="Número de acta"
        oninput="ra343ProgramarValidacion()" onblur="ra343ValidarAhora()"
        onkeydown="ra343Tecla(event,${indice})" onpaste="ra343Pegar(event,${indice})">
      <div class="ra343-state" id="ra343Estado${indice}">${estadoHtmlV343("VACIA","")}</div>
      <label class="ra343-check"><input id="ra343Recibir${indice}" type="checkbox" disabled onchange="ra343ActualizarResumen()"> Recibir</label>
      <button class="ra343-delete" type="button" title="Quitar fila" onclick="ra343QuitarFila(${indice})">×</button>
    </div>`;
  }

  function renumerarV343(){
    const filas = Array.from(document.querySelectorAll("#ra343Lista .ra343-row"));
    filas.forEach((fila,i)=>{
      const nuevo=i+1;
      fila.dataset.fila=String(nuevo);
      fila.querySelector(".ra343-num").textContent=String(nuevo);
      const input=fila.querySelector(".ra343-input");
      const estado=fila.querySelector(".ra343-state");
      const check=fila.querySelector("input[type=checkbox]");
      const borrar=fila.querySelector(".ra343-delete");
      input.id=`ra343Numero${nuevo}`;
      input.setAttribute("onkeydown",`ra343Tecla(event,${nuevo})`);
      input.setAttribute("onpaste",`ra343Pegar(event,${nuevo})`);
      estado.id=`ra343Estado${nuevo}`;
      check.id=`ra343Recibir${nuevo}`;
      borrar.setAttribute("onclick",`ra343QuitarFila(${nuevo})`);
    });
  }

  function agregarFilaV343(valor, enfocar){
    const lista=document.getElementById("ra343Lista");
    if(!lista) return false;
    const cantidad=lista.querySelectorAll(".ra343-row").length;
    if(cantidad>=MAX_ACTAS_V343) return false;
    lista.insertAdjacentHTML("beforeend",filaV343(cantidad+1,valor||""));
    if(enfocar) document.getElementById(`ra343Numero${cantidad+1}`)?.focus();
    return true;
  }

  function quitarFilaV343(indice){
    const fila=document.querySelector(`#ra343Lista .ra343-row[data-fila="${indice}"]`);
    if(!fila) return;
    const total=document.querySelectorAll("#ra343Lista .ra343-row").length;
    if(total<=1){
      const input=fila.querySelector(".ra343-input"); if(input) input.value="";
      const estado=fila.querySelector(".ra343-state"); if(estado) estado.innerHTML=estadoHtmlV343("VACIA","");
      const check=fila.querySelector("input[type=checkbox]"); if(check){check.checked=false;check.disabled=true;}
    }else{
      fila.remove(); renumerarV343();
    }
    programarValidacionV343();
  }

  function numerosFilasV343(){
    return Array.from(document.querySelectorAll("#ra343Lista .ra343-row")).map(fila=>({
      fila,
      indice:Number(fila.dataset.fila),
      input:fila.querySelector(".ra343-input"),
      estado:fila.querySelector(".ra343-state"),
      check:fila.querySelector("input[type=checkbox]"),
      valor:(fila.querySelector(".ra343-input")?.value||"").trim()
    })).filter(x=>x.valor);
  }

  function limpiarEstadosV343(){
    Array.from(document.querySelectorAll("#ra343Lista .ra343-row")).forEach(fila=>{
      const estado=fila.querySelector(".ra343-state");
      const check=fila.querySelector("input[type=checkbox]");
      if(estado) estado.innerHTML=estadoHtmlV343("VACIA","");
      if(check){check.checked=false;check.disabled=true;}
      fila.dataset.estado="";
    });
    actualizarResumenV343();
  }

  function actualizarResumenV343(data){
    const filas=numerosFilasV343();
    const validas=filas.filter(x=>x.fila.dataset.estado==="VALIDA");
    const seleccionadas=validas.filter(x=>x.check?.checked);
    const invalidas=filas.length-validas.length;
    const datos=data?.resumen||{};
    const cont=document.getElementById("ra343Resumen");
    if(cont){
      cont.innerHTML=`
        <div class="ra343-kpi"><b>${filas.length}</b><span>INGRESADAS</span></div>
        <div class="ra343-kpi"><b>${validas.length}</b><span>ESCANEADAS</span></div>
        <div class="ra343-kpi"><b>${invalidas}</b><span>CON OBSERVACIÓN</span></div>
        <div class="ra343-kpi"><b>${seleccionadas.length}</b><span>PARA RECIBIR</span></div>`;
    }
    const btn=document.getElementById("ra343Confirmar");
    if(btn){
      btn.disabled=seleccionadas.length===0;
      btn.textContent=seleccionadas.length?`Confirmar recepción (${seleccionadas.length})`:"Confirmar recepción";
    }
  }

  async function validarAhoraV343(){
    clearTimeout(temporizadorValidacionV343);
    const filas=numerosFilasV343();
    const cuadrilla=document.getElementById("cargoActasCuadrilla")?.value||"";
    const mensaje=document.getElementById("ra343Mensaje");

    if(!filas.length){
      limpiarEstadosV343();
      if(mensaje) mensaje.innerHTML="";
      return;
    }
    if(!cuadrilla){
      filas.forEach(x=>{
        x.estado.innerHTML=estadoHtmlV343("VACIA","Seleccione primero la cuadrilla.");
        x.check.checked=false;x.check.disabled=true;x.fila.dataset.estado="";
      });
      actualizarResumenV343();
      return;
    }

    const secuencia=++secuenciaValidacionV343;
    filas.forEach(x=>{
      x.estado.innerHTML=estadoHtmlV343("BUSCANDO","");
      x.check.disabled=true;
      x.fila.dataset.estado="BUSCANDO";
    });
    if(mensaje) mensaje.innerHTML="";

    try{
      const u=window.usuarioActualActas();
      const data=await window.apiActas({
        accion:"validarRecepcionMasivaActas",
        usuario:u.usuario,
        cuadrilla,
        numerosActa:filas.map(x=>x.valor).join("\n")
      });
      if(secuencia!==secuenciaValidacionV343) return;
      const resultados=data.resultados||[];
      filas.forEach((x,i)=>{
        const r=resultados[i]||{estado:"NO_REGISTRADA",detalle:"No se recibió respuesta para este número."};
        x.estado.innerHTML=estadoHtmlV343(r.estado,r.detalle||"");
        x.fila.dataset.estado=normalizarV343(r.estado);
        x.fila.dataset.id=r.id||"";
        x.fila.dataset.numero=r.numeroActa||x.valor;
        const valida=normalizarV343(r.estado)==="VALIDA";
        x.check.disabled=!valida;
        x.check.checked=valida;
      });
      actualizarResumenV343(data);
    }catch(error){
      if(secuencia!==secuenciaValidacionV343) return;
      filas.forEach(x=>{
        x.estado.innerHTML=estadoHtmlV343("VACIA","No se pudo consultar.");
        x.check.checked=false;x.check.disabled=true;x.fila.dataset.estado="";
      });
      actualizarResumenV343();
      if(mensaje) mensaje.innerHTML=`<div class="ra343-error">❌ ${escaparV343(error.message)}</div>`;
    }
  }

  function programarValidacionV343(){
    clearTimeout(temporizadorValidacionV343);
    temporizadorValidacionV343=setTimeout(validarAhoraV343,550);
  }

  function teclaV343(event,indice){
    if(event.key!=="Enter") return;
    event.preventDefault();
    const siguiente=document.getElementById(`ra343Numero${indice+1}`);
    if(siguiente){siguiente.focus();return;}
    if(agregarFilaV343("",true)) return;
    validarAhoraV343();
  }

  function pegarV343(event,indice){
    const texto=event.clipboardData?.getData("text")||"";
    const partes=texto.split(/[\n,;|\t]+/).map(x=>x.trim()).filter(Boolean);
    if(partes.length<=1) return;
    event.preventDefault();
    while(document.querySelectorAll("#ra343Lista .ra343-row").length < Math.min(MAX_ACTAS_V343,indice+partes.length-1)){
      if(!agregarFilaV343("",false)) break;
    }
    partes.slice(0,MAX_ACTAS_V343-indice+1).forEach((valor,pos)=>{
      const input=document.getElementById(`ra343Numero${indice+pos}`);
      if(input) input.value=valor;
    });
    programarValidacionV343();
  }

  function actualizarCuadrillasV343(){
    const sede=normalizarV343(document.getElementById("cargoActasSede")?.value||"");
    const select=document.getElementById("cargoActasCuadrilla");
    const lista=(window._cuadrillasRecepcionActas||[]).filter(x=>normalizarV343(x.sede)===sede);
    if(select){
      select.innerHTML=`<option value="">Seleccione cuadrilla</option>`+
        lista.map(x=>`<option value="${escaparV343(x.cuadrilla)}">${escaparV343(x.cuadrilla)}</option>`).join("");
    }
    limpiarEstadosV343();
  }

  async function mostrarRecepcionV343(){
    const u=window.usuarioActualActas();
    if(!(window.esAlmacenActas(u.perfil)||window.esJefaturaAlmacenActas(u.perfil))){
      return alert("No tiene permiso para recibir varias actas.");
    }
    let cuadrillas=[];
    try{
      cuadrillas=(await window.apiActas({accion:"listarCuadrillasActasFaltantes",usuario:u.usuario})).cuadrillas||[];
    }catch(error){
      return alert("❌ "+error.message);
    }
    const sedes=[...new Set(cuadrillas.map(x=>x.sede).filter(Boolean))].sort();
    window._cuadrillasRecepcionActas=cuadrillas;
    window._validacionRecepcionActas=null;

    window.mostrarPantalla(`
      ${window.estiloActas()}
      ${estilosV343()}
      <div class="actas-wrap">
        <div class="actas-head" style="background:linear-gradient(135deg,#047857,#16a34a)">
          <h2>📦 Recibir actas</h2>
          <p>Ingrese cada número. El sistema comprobará al costado si fue escaneado y habilitará la opción Recibir.</p>
        </div>
        <div class="ra343-card">
          <div class="ra343-selects">
            <div class="ra343-field"><label>Sede</label>
              <select id="cargoActasSede" onchange="actualizarCuadrillasRecepcionActas()">
                ${sedes.map(s=>`<option value="${escaparV343(s)}">${escaparV343(s)}</option>`).join("")}
              </select>
            </div>
            <div class="ra343-field"><label>Cuadrilla</label>
              <select id="cargoActasCuadrilla" onchange="ra343ValidarAhora()"></select>
            </div>
          </div>
          <div class="ra343-headrow"><span>#</span><span>Número de acta</span><span>Consulta de escaneo</span><span>Acción</span><span></span></div>
          <div id="ra343Lista" class="ra343-list"></div>
          <div class="ra343-toolbar">
            <button class="actas-btn sec" type="button" onclick="ra343AgregarFila('',true)">+ Agregar número</button>
            <button class="actas-btn blue" type="button" onclick="ra343ValidarAhora()">🔎 Consultar todas</button>
            <button class="actas-btn ok" id="ra343Confirmar" type="button" disabled onclick="confirmarRecepcionMasivaActasFrontend(this)">Confirmar recepción</button>
            <button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Cancelar</button>
          </div>
          <div class="ra343-help">Puede pegar varios números separados por líneas o comas. Se distribuirán automáticamente hasta un máximo de 20.</div>
          <div id="ra343Resumen" class="ra343-summary"></div>
          <div id="ra343Mensaje"></div>
        </div>
      </div>`);

    const lista=document.getElementById("ra343Lista");
    if(lista){
      for(let i=1;i<=FILAS_INICIALES_V343;i++) lista.insertAdjacentHTML("beforeend",filaV343(i,""));
    }
    const sedeSel=document.getElementById("cargoActasSede");
    if(window.esAlmacenActas(u.perfil)&&sedeSel){
      sedeSel.value=u.sede;
      sedeSel.disabled=true;
    }
    actualizarCuadrillasV343();
    actualizarResumenV343();
    document.getElementById("ra343Numero1")?.focus();
  }

  function coincidenNumerosCargoV343(cargo,numeros){
    const disponibles=(cargo?.numerosActa||"").split(/[\s,;|]+/).map(normalizarV343).filter(Boolean);
    return numeros.every(n=>disponibles.includes(normalizarV343(n)));
  }

  function mostrarCargoV343(data,recuperado){
    const cont=document.getElementById("ra343Mensaje");
    if(!cont) return;
    const link=data.linkPdf||data.descargaPdf||"";
    cont.innerHTML=`<div class="ra343-result">
      <h3 style="margin:0 0 7px">✅ ${recuperado?"Recepción confirmada y recuperada":"Cargo generado correctamente"}</h3>
      <div><b>${escaparV343(data.idCargo||"")}</b> · ${Number(data.totalActas)||0} actas</div>
      <div class="ra343-toolbar">
        ${link?`<a class="actas-btn blue" href="${escaparV343(link)}" target="_blank" rel="noopener">Ver / descargar cargo</a>`:""}
        <button class="actas-btn ok" type="button" onclick="mostrarRecepcionMasivaActas()">Nueva recepción</button>
        <button class="actas-btn sec" type="button" onclick="mostrarGestionActas()">Volver a Gestión de Actas</button>
      </div>
    </div>`;
  }

  async function confirmarV343(btn){
    const u=window.usuarioActualActas();
    const cuadrilla=document.getElementById("cargoActasCuadrilla")?.value||"";
    const seleccionadas=numerosFilasV343().filter(x=>x.fila.dataset.estado==="VALIDA"&&x.check?.checked);
    const numeros=seleccionadas.map(x=>x.valor);
    if(!cuadrilla) return alert("Seleccione una cuadrilla.");
    if(!numeros.length) return alert("No existen actas escaneadas seleccionadas para recibir.");
    if(!confirm(`¿Confirmar la recepción física de ${numeros.length} acta(s) y generar el cargo?`)) return;

    const mensaje=document.getElementById("ra343Mensaje");
    try{
      if(btn){btn.disabled=true;btn.textContent="Confirmando y generando cargo...";}
      if(mensaje) mensaje.innerHTML=`<div class="actas-msg info">⏳ Confirmando ${numeros.length} acta(s). No cierre esta pantalla.</div>`;
      const data=await window.apiActas({
        accion:"confirmarRecepcionMasivaActas",
        usuario:u.usuario,
        cuadrilla,
        numerosActa:numeros.join("\n")
      });
      window.limpiarCacheActas?.();
      mostrarCargoV343(data,false);
    }catch(error){
      if(mensaje) mensaje.innerHTML=`<div class="actas-msg info">Verificando si el cargo llegó a generarse...</div>`;
      try{
        const historial=await window.apiActas({accion:"listarCargosActas",usuario:u.usuario,__forzar:true});
        const encontrado=(historial.cargos||[]).find(c=>
          normalizarV343(c.cuadrilla)===normalizarV343(cuadrilla)&&coincidenNumerosCargoV343(c,numeros)
        );
        if(encontrado){
          mostrarCargoV343({
            idCargo:encontrado.idCargo,
            totalActas:encontrado.totalActas,
            linkPdf:encontrado.linkPdf
          },true);
          return;
        }
      }catch(_){}
      if(mensaje) mensaje.innerHTML=`<div class="ra343-error">❌ ${escaparV343(error.message)}<br><small>La lista no se enviará nuevamente de forma automática para evitar duplicar el cargo.</small></div>`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Confirmar recepción";}
      actualizarResumenV343();
    }
  }

  function aplicarV343(){
    if(typeof window.apiActas!=="function"||typeof window.estiloActas!=="function"||typeof window.usuarioActualActas!=="function") return false;
    window.mostrarRecepcionMasivaActas=mostrarRecepcionV343;
    window.actualizarCuadrillasRecepcionActas=actualizarCuadrillasV343;
    window.validarRecepcionMasivaActasFrontend=function(){return validarAhoraV343();};
    window.confirmarRecepcionMasivaActasFrontend=confirmarV343;
    window.ra343AgregarFila=agregarFilaV343;
    window.ra343QuitarFila=quitarFilaV343;
    window.ra343ProgramarValidacion=programarValidacionV343;
    window.ra343ValidarAhora=validarAhoraV343;
    window.ra343ActualizarResumen=actualizarResumenV343;
    window.ra343Tecla=teclaV343;
    window.ra343Pegar=pegarV343;
    window.MV343_RECEPCION_ACTAS_OK=true;
    console.log("MI VISUAL V343: recepción rápida de actas habilitada.");
    return true;
  }

  window.mv343AplicarRecepcionActas=aplicarV343;

  if(aplicarV343()) return;

  const observador=new MutationObserver(cambios=>{
    cambios.forEach(cambio=>Array.from(cambio.addedNodes||[]).forEach(nodo=>{
      if(nodo?.tagName==="SCRIPT"&&String(nodo.src||"").includes("actas.js")){
        nodo.addEventListener("load",()=>{ if(aplicarV343()) observador.disconnect(); },{once:true});
      }
    }));
  });
  observador.observe(document.documentElement,{childList:true,subtree:true});

  const verificador=setInterval(()=>{
    if(aplicarV343()){
      clearInterval(verificador);
      observador.disconnect();
    }
  },350);
})();
