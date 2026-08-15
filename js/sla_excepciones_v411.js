/* ============================================================
   MI VISUAL V411 - SLA / Excepciones
   CORRIGE:
   1) La vista PENDIENTES lee directamente SLA_EXCEPCIONES.
   2) Al volver al detalle SLA, no conserva PENDIENTES como modo oculto.
   3) "Ver códigos y excepciones" vuelve a mostrar códigos por cuadrilla.
============================================================ */
(function(){
  "use strict";
  if(window.MV411_SLA_EXCEPCIONES_OK) return;
  if(typeof window.mostrarTiempoGestionSla !== "function") return;

  const baseMostrar = window.mostrarTiempoGestionSla;
  let estado = {periodo:"",data:null};

  function norm(v){
    return String(v||"")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }
  function esc(v){
    return String(v??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }
  function api(){return window.MI_VISUAL_API_URL || "";}
  function usuario(){return localStorage.getItem("usuario")||"";}

  async function getPendientes(periodo){
    const url=new URL(api());
    url.searchParams.set("accion","listarExcepcionesSlaV411");
    url.searchParams.set("usuario",usuario());
    if(periodo) url.searchParams.set("periodo",periodo);
    url.searchParams.set("estado","PENDIENTE");
    url.searchParams.set("_v411",Date.now());

    const r=await fetch(url.toString(),{
      method:"GET",
      cache:"no-store",
      headers:{Accept:"application/json"}
    });
    const t=(await r.text()).trim();
    if(!r.ok||!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t)){
      throw new Error("Apps Script aún no tiene publicada la actualización V411.");
    }
    const d=JSON.parse(t);
    if(!d.ok) throw new Error(d.error||"No se pudieron consultar las excepciones SLA.");
    return d;
  }

  async function postResolver(periodo,codigo,resultado,comentario){
    const r=await fetch(api(),{
      method:"POST",
      body:JSON.stringify({
        accion:"resolverExcepcionSla",
        usuario:usuario(),
        periodo,codigo,resultado,
        comentarioJefatura:comentario||""
      })
    });
    const t=(await r.text()).trim();
    if(!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t)){
      throw new Error("No se recibió confirmación de Apps Script.");
    }
    const d=JSON.parse(t);
    if(!d.ok) throw new Error(d.error||"No se pudo resolver la excepción.");
    return d;
  }

  function periodoValor(p){
    return typeof p==="string"?p:String(p?.clave||p?.periodo||"");
  }
  function periodoEtiqueta(p){
    return typeof p==="string"?p:String(p?.etiqueta||p?.nombre||p?.clave||p?.periodo||"");
  }
  function opcionesPeriodo(periodos,actual){
    const arr=Array.isArray(periodos)?periodos:[];
    const vistos=new Set();
    return arr.map(function(p){
      const v=periodoValor(p);
      if(!v||vistos.has(v))return "";
      vistos.add(v);
      return `<option value="${esc(v)}" ${v===actual?"selected":""}>${esc(periodoEtiqueta(p)||v)}</option>`;
    }).join("");
  }
  function evidenciaHtml(v){
    const t=String(v||"").trim();
    if(!t)return '<span style="opacity:.65">Sin evidencia adjunta</span>';
    if(/^https?:\/\//i.test(t)){
      return `<a href="${esc(t)}" target="_blank" rel="noopener" style="color:#60a5fa;font-weight:800">🔗 Ver evidencia</a>`;
    }
    return `<span>${esc(t)}</span>`;
  }

  function estilos(){return `<style id="mv411SlaCss">
    .mv411-sla-page{padding:16px;max-width:1120px;margin:auto;color:#fff}
    .mv411-sla-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
    .mv411-sla-head h2{margin:0;font-size:24px}.mv411-sla-sub{font-size:11px;color:#9fb7d8;margin-top:4px}
    .mv411-sla-filter{margin:14px 0;background:#102844;border:1px solid #315577;border-radius:15px;padding:12px}
    .mv411-sla-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .mv411-sla-field label{display:block;font-size:10px;font-weight:900;color:#cbd5e1;margin-bottom:4px}
    .mv411-sla-field input,.mv411-sla-field select{width:100%;box-sizing:border-box;min-height:42px;border:1px solid #60a5fa;border-radius:10px;padding:0 9px;background:#fff;color:#0f172a;font-weight:800}
    .mv411-sla-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
    .mv411-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer;background:#2563eb;color:#fff}.mv411-btn.sec{background:#475569}.mv411-btn.ok{background:#15803d}.mv411-btn.no{background:#b91c1c}
    .mv411-sla-count{font-size:11px;color:#cbd5e1;margin:8px 0}
    .mv411-sla-item{border:1px solid #315577;border-radius:13px;background:#0d2037;margin:9px 0;overflow:hidden}
    .mv411-sla-item summary{cursor:pointer;list-style:none;padding:12px;background:#102844;display:flex;justify-content:space-between;gap:10px;align-items:center}.mv411-sla-item summary::-webkit-details-marker{display:none}
    .mv411-sla-code{font-size:14px;font-weight:950}.mv411-sla-mini{font-size:10px;color:#9fb7d8;margin-top:3px}.mv411-pend{background:#78350f;color:#fde68a;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:950;white-space:nowrap}
    .mv411-sla-body{padding:12px}.mv411-sla-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mv411-sla-info div{background:#132845;border-radius:10px;padding:9px}.mv411-sla-info small{display:block;color:#9fb7d8;font-size:9px}.mv411-sla-info b{display:block;margin-top:3px;font-size:12px;word-break:break-word}
    .mv411-sla-text{margin-top:9px;background:#132845;border-radius:10px;padding:10px;font-size:11px;line-height:1.45}.mv411-sla-empty{padding:24px;text-align:center;border:1px dashed #315577;border-radius:14px;color:#cbd5e1}
    @media(max-width:760px){.mv411-sla-grid{grid-template-columns:1fr 1fr}.mv411-sla-info{grid-template-columns:1fr}.mv411-sla-head h2{font-size:21px}}
    @media(max-width:480px){.mv411-sla-grid{grid-template-columns:1fr}}
  </style>`;}

  function tarjeta(x,puedeResolver){
    return `<details class="mv411-sla-item" data-codigo="${esc(norm(x.codigo))}" data-pedido="${esc(norm(x.codigoPedido))}" data-fecha="${esc(x.fechaSolicitudISO||"")}">
      <summary>
        <div>
          <div class="mv411-sla-code">Orden ${esc(x.codigo||"-")}</div>
          <div class="mv411-sla-mini">Pedido ${esc(x.codigoPedido||"-")} · ${esc(x.sede||"-")} · ${esc(x.fechaSolicitud||"-")}</div>
        </div>
        <span class="mv411-pend">PENDIENTE</span>
      </summary>
      <div class="mv411-sla-body">
        <div class="mv411-sla-info">
          <div><small>Cuadrilla</small><b>${esc(x.cuadrilla||"-")}</b></div>
          <div><small>Supervisor</small><b>${esc(x.supervisor||x.solicitadoPor||"-")}</b></div>
          <div><small>Tipo</small><b>${esc(x.tipoGeneral||"-")}</b></div>
          <div><small>Tiempo / SLA</small><b>${Number(x.minutos)||0} min / ${Number(x.slaMinutos)||0} min</b></div>
          <div><small>Solicitado por</small><b>${esc(x.solicitadoPor||"-")}</b></div>
          <div><small>Fecha solicitud</small><b>${esc(x.fechaSolicitud||"-")}</b></div>
        </div>
        <div class="mv411-sla-text">
          <b>Motivo:</b> ${esc(x.motivo||"-")}<br>
          <b>Sustento:</b> ${esc(x.comentario||"-")}<br>
          ${evidenciaHtml(x.evidencia)}
        </div>
        ${puedeResolver?`<div class="mv411-sla-actions"><button class="mv411-btn ok" onclick="mv411ResolverSla('${esc(x.codigo)}','APROBADA')">✅ Aprobar</button><button class="mv411-btn no" onclick="mv411ResolverSla('${esc(x.codigo)}','RECHAZADA')">❌ Rechazar</button></div>`:""}
      </div>
    </details>`;
  }

  function aplicarFiltro(){
    const codigo=norm(document.getElementById("mv411FiltroOrden")?.value||"");
    const pedido=norm(document.getElementById("mv411FiltroPedido")?.value||"");
    const fecha=document.getElementById("mv411FiltroFecha")?.value||"";
    let visibles=0;
    document.querySelectorAll(".mv411-sla-item").forEach(function(el){
      const ok=(!codigo||el.dataset.codigo.includes(codigo))&&
               (!pedido||el.dataset.pedido.includes(pedido))&&
               (!fecha||el.dataset.fecha===fecha);
      el.style.display=ok?"block":"none";
      if(ok){visibles++;el.open=false;}
    });
    const c=document.getElementById("mv411ConteoVisible");
    if(c)c.textContent=`${visibles} solicitud(es) visible(s)`;
  }

  function limpiarFiltro(){
    ["mv411FiltroOrden","mv411FiltroPedido","mv411FiltroFecha"].forEach(function(id){
      const e=document.getElementById(id);if(e)e.value="";
    });
    aplicarFiltro();
  }

  function volverSla(){
    // Clave V411: no dejar PENDIENTES como estado global de la siguiente vista.
    window.MV366_SLA_MODO="TODOS";
    if(typeof window.mv366VolverDesdeSla==="function"&&window.MV366_ORIGEN_SLA){
      return window.mv366VolverDesdeSla();
    }
    if(typeof window.volverInicio==="function") return window.volverInicio();
  }

  function render(d){
    estado={periodo:d.periodo||estado.periodo,data:d};
    const lista=Array.isArray(d.excepciones)?d.excepciones:[];
    const cards=lista.length
      ?lista.map(x=>tarjeta(x,!!d.puedeResolver)).join("")
      :'<div class="mv411-sla-empty">✅ No hay excepciones SLA pendientes para este período.</div>';

    mostrarPantalla(`${estilos()}<div class="mv411-sla-page">
      <div class="mv411-sla-head">
        <div>
          <h2>✅ Validar excepciones SLA</h2>
          <div class="mv411-sla-sub">Las solicitudes se muestran contraídas. Abra solo la que necesite revisar.</div>
        </div>
        <button class="mv411-btn sec" onclick="mv411VolverSla()">⬅️ Volver al menú</button>
      </div>
      <div class="mv411-sla-filter">
        <div class="mv411-sla-grid">
          <div class="mv411-sla-field"><label>PERÍODO</label><select id="mv411Periodo" onchange="mostrarExcepcionesSla(this.value)">${opcionesPeriodo(d.periodos,d.periodo)}</select></div>
          <div class="mv411-sla-field"><label>CÓDIGO DE ORDEN</label><input id="mv411FiltroOrden" inputmode="numeric" placeholder="Ej. 3356421" oninput="mv411FiltrarSla()"></div>
          <div class="mv411-sla-field"><label>CÓDIGO DE PEDIDO</label><input id="mv411FiltroPedido" inputmode="numeric" placeholder="Ej. 2077632" oninput="mv411FiltrarSla()"></div>
          <div class="mv411-sla-field"><label>FECHA DE SOLICITUD</label><input id="mv411FiltroFecha" type="date" onchange="mv411FiltrarSla()"></div>
        </div>
        <div class="mv411-sla-actions">
          <button class="mv411-btn" onclick="mv411FiltrarSla()">🔎 Aplicar filtros</button>
          <button class="mv411-btn sec" onclick="mv411LimpiarFiltroSla()">Limpiar</button>
        </div>
      </div>
      <div id="mv411ConteoVisible" class="mv411-sla-count">${lista.length} solicitud(es) visible(s)</div>
      <div id="mv411ListaSla">${cards}</div>
    </div>`);
  }

  async function mostrarPendientes(periodo){
    window.MV366_SLA_MODO="PENDIENTES";
    estado.periodo=periodo||estado.periodo||"";
    mostrarPantalla(`${estilos()}<div class="mv411-sla-page"><h2>✅ Validar excepciones SLA</h2><div class="mv411-sla-empty">⏳ Consultando solicitudes pendientes...</div></div>`);
    try{
      render(await getPendientes(estado.periodo));
    }catch(e){
      mostrarPantalla(`${estilos()}<div class="mv411-sla-page"><h2>✅ Validar excepciones SLA</h2><div class="mv411-sla-empty">❌ ${esc(e.message)}</div><br><button class="mv411-btn sec" onclick="mv411VolverSla()">⬅️ Volver</button></div>`);
    }
  }

  async function resolver(codigo,resultado){
    if(!estado.periodo)return;
    const verbo=resultado==="APROBADA"?"aprobar":"rechazar";
    const comentario=prompt(`Comentario de Jefatura para ${verbo} la excepción:`);
    if(comentario===null)return;
    try{
      await postResolver(estado.periodo,codigo,resultado,comentario);
      if(typeof window.mv366InvalidarResumenDashboard==="function"){
        window.mv366InvalidarResumenDashboard(estado.periodo);
      }
      await mostrarPendientes(estado.periodo);
    }catch(e){alert(e.message);}
  }

  const patched=function(periodo,modo){
    const modoExplicito=norm(modo||"");

    // SOLO una llamada explícita a PENDIENTES abre la pantalla de validación.
    if(modoExplicito==="PENDIENTES"){
      return mostrarPendientes(periodo);
    }

    // Si el botón "Ver códigos y excepciones" no envía modo, debe abrir TODOS.
    // V410 heredaba PENDIENTES desde una pantalla anterior y ocultaba los códigos.
    const modoReal=modoExplicito||"TODOS";
    window.MV366_SLA_MODO=modoReal;
    return baseMostrar.call(this,periodo,modoReal);
  };

  patched.__mv411Sla=true;
  window.mostrarTiempoGestionSla=patched;
  try{mostrarTiempoGestionSla=patched;}catch(_){}

  window.mostrarExcepcionesSla=function(periodo){
    return mostrarPendientes(periodo);
  };
  window.mv411FiltrarSla=aplicarFiltro;
  window.mv411LimpiarFiltroSla=limpiarFiltro;
  window.mv411ResolverSla=resolver;
  window.mv411VolverSla=volverSla;
  window.MV411_SLA_EXCEPCIONES_OK=true;

  console.log("MI VISUAL V411: excepciones y detalle SLA corregidos.");
})();
