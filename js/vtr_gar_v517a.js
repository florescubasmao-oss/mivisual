/* ==========================================================
   MI VISUAL V517A - VTR/GAR CONSOLIDADO
   FRONTEND PREPARADO - ACTIVAR DESPUES DE DESPLEGAR BACKEND V517A

   - Mini dashboard: Finalizadas / Reprogramadas / Canceladas / Anuladas.
   - Ticket limpio: VTR-xxxx / GAR-xxxx.
   - Registro tecnico: REGISTRADA / NO REGISTRADA.
   - Antecedentes como apoyo, no decision automatica.
   - Casos no estandar separados.
   - Notificacion exclusiva JEFZNORTE.
   - Solo JEFZNORTE ve acciones de decision.
========================================================== */
(function(){
  "use strict";
  if(window.MV517A_VTRGAR_UI_OK) return;
  window.MV517A_VTRGAR_UI_OK = true;

  const API = window.MI_VISUAL_API_URL ||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR = "JEFZNORTE";
  const EST = {data:null,periodo:"",timer:null};

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function perfil(){return norm(localStorage.getItem("perfil")||"");}
  function esValidador(){return norm(usuario())===VALIDADOR && perfil()==="JEFATURA";}

  function apiPost(payload){
    return fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload||{})
    }).then(r=>r.text()).then(t=>{
      let j; try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida del backend.");}
      if(!j||!j.ok) throw new Error((j&&j.error)||"No se pudo completar la consulta.");
      return j;
    });
  }

  function apiGet(params){
    const q=new URLSearchParams(params||{});
    return fetch(API+"?"+q.toString(),{cache:"no-store"})
      .then(r=>r.text()).then(t=>{
        let j; try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida del backend.");}
        if(!j||!j.ok) throw new Error((j&&j.error)||"No se pudo completar la consulta.");
        return j;
      });
  }

  function badge(t,c){
    return `<span class="mv517a-badge ${c||""}">${esc(t)}</span>`;
  }
  function badgeWin(e){
    e=norm(e);
    if(e==="FINALIZADA") return badge("FINALIZADA","ok");
    if(e==="REPROGRAMADA") return badge("REPROGRAMADA","warn");
    if(e==="CANCELADA") return badge("CANCELADA","bad");
    if(e==="ANULADA") return badge("ANULADA","dark");
    return badge(e||"POR REVISAR","info");
  }
  function badgeRegistro(x){
    return x.registroTecnico==="REGISTRADA"
      ? badge("REGISTRADA","ok")
      : badge("NO REGISTRADA","bad");
  }
  function badgeDecision(x){
    const e=norm(x.estadoResponsabilidad||x.estadoDecision||"PENDIENTE");
    if(e==="CONFIRMADO") return badge("CONFIRMADA","ok");
    if(e==="REASIGNADO") return badge("REASIGNADA","info");
    if(e==="NO_ES_GAR_VTR") return badge("NO ES GAR/VTR","dark");
    if(e==="ANULADO") return badge("ANULADA","bad");
    return badge("RESP. PENDIENTE","warn");
  }
  function badgeBono(x){
    const b=norm(x.bono);
    if(b==="BONO") return badge("BONO","ok");
    if(b==="NO BONO") return badge("NO BONO","info");
    if(x.registroTecnico==="REGISTRADA") return badge("BONO PENDIENTE","warn");
    return "";
  }

  function css(){
    return `<style id="mv517a-css">
      .mv517a{max-width:1160px;margin:0 auto;padding:12px;color:#0f172a}
      .mv517a-head{background:linear-gradient(135deg,#1e3a8a,#0f766e);color:#fff;border-radius:18px;padding:16px;margin-bottom:10px}
      .mv517a-head h2{margin:0;font-size:21px}.mv517a-head p{margin:5px 0 0;font-size:12px;line-height:1.45}
      .mv517a-tabs{display:flex;gap:8px;margin:0 0 10px}.mv517a-tab{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:12px;padding:10px 15px;font-weight:900;cursor:pointer}
      .mv517a-tab.active{background:#2563eb;color:#fff}
      .mv517a-note{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;padding:10px 12px;border-radius:12px;font-size:11px;margin:8px 0}
      .mv517a-alert{border:1px solid #fbbf24;background:#fffbeb;color:#78350f;padding:10px 12px;border-radius:12px;font-size:11px;margin:8px 0}
      .mv517a-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin:10px 0}
      .mv517a-kpi{background:#fff;border:1px solid #dbe3ee;border-radius:12px;padding:9px;text-align:center}
      .mv517a-kpi b{display:block;font-size:19px}.mv517a-kpi span{font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase}
      .mv517a-tools{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:8px;margin:10px 0}
      .mv517a-tools input,.mv517a-tools select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff}
      .mv517a-sede,.mv517a-estado{border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;margin:9px 0;overflow:hidden}
      .mv517a-sede>summary{padding:11px 13px;background:#eaf2fb;font-weight:900;cursor:pointer;display:flex;justify-content:space-between}
      .mv517a-sede-body{padding:8px}.mv517a-estado>summary{padding:9px 11px;background:#f8fafc;font-weight:900;cursor:pointer;display:flex;justify-content:space-between}
      .mv517a-estado-body{padding:7px;display:grid;gap:7px}
      .mv517a-case{background:#fff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden}
      .mv517a-case>summary{list-style:none;cursor:pointer;padding:10px 11px;display:grid;grid-template-columns:1.2fr 2fr 1fr;gap:8px;align-items:center}
      .mv517a-case>summary::-webkit-details-marker{display:none}
      .mv517a-ticket{font-weight:950}.mv517a-sub{font-size:10px;color:#64748b}.mv517a-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
      .mv517a-badge{display:inline-flex;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;background:#e2e8f0;color:#334155}
      .mv517a-badge.ok{background:#dcfce7;color:#166534}.mv517a-badge.warn{background:#fef3c7;color:#92400e}.mv517a-badge.bad{background:#fee2e2;color:#991b1b}.mv517a-badge.info{background:#dbeafe;color:#1d4ed8}.mv517a-badge.dark{background:#e2e8f0;color:#0f172a}
      .mv517a-detail{border-top:1px solid #e2e8f0;background:#f8fafc;padding:10px}
      .mv517a-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .mv517a-field{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:8px}.mv517a-field small{display:block;color:#64748b;font-weight:900;font-size:8px;text-transform:uppercase;margin-bottom:2px}.mv517a-field b{font-size:10px;overflow-wrap:anywhere}
      .mv517a-box{background:#fff;border:1px solid #dbe3ee;border-radius:10px;padding:9px;margin-top:8px;font-size:10px}
      .mv517a-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.mv517a-btn{border:0;border-radius:9px;padding:8px 10px;color:#fff;background:#2563eb;font-size:10px;font-weight:900;cursor:pointer}.mv517a-btn.ok{background:#15803d}.mv517a-btn.warn{background:#b45309}.mv517a-btn.bad{background:#b91c1c}.mv517a-btn.dark{background:#334155}.mv517a-btn.money{background:#0f766e}
      .mv517a-tab-notif{display:inline-flex;min-width:19px;height:19px;align-items:center;justify-content:center;background:#dc2626;color:#fff;border-radius:999px;font-size:10px;margin-left:5px;padding:0 5px}
      .mv517a-empty{padding:18px;text-align:center;color:#64748b}
      .mv517a-modalbg{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:11000;display:flex;align-items:center;justify-content:center;padding:12px}.mv517a-modal{width:min(520px,100%);background:#fff;border-radius:17px;padding:14px}.mv517a-modal textarea,.mv517a-modal select,.mv517a-modal input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:9px;margin-top:5px}.mv517a-modal label{font-size:10px;font-weight:900;display:block;margin-top:9px}
      @media(max-width:760px){.mv517a-kpis{grid-template-columns:repeat(3,1fr)}.mv517a-tools{grid-template-columns:1fr 1fr}.mv517a-grid{grid-template-columns:1fr 1fr}.mv517a-case>summary{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){.mv517a-kpis{grid-template-columns:repeat(2,1fr)}.mv517a-tools,.mv517a-grid,.mv517a-case>summary{grid-template-columns:1fr}.mv517a-badges{justify-content:flex-start}}
    </style>`;
  }

  function tabs(){
    const n=EST.data&&EST.data.notificacionJefatura&&esValidador()
      ? Number(EST.data.notificacionJefatura.totalPendientes||0):0;
    return `<div class="mv517a-tabs">
      <button class="mv517a-tab" onclick="mv489AbrirRegistroVtrGar()">📝 Registro</button>
      <button class="mv517a-tab active">✅ Validación${n?` <span class="mv517a-tab-notif">${n}</span>`:""}</button>
    </div>`;
  }

  function kpis(r){
    r=r||{};
    return `<div class="mv517a-kpis">
      <div class="mv517a-kpi"><b>${r.total||0}</b><span>Tickets reales</span></div>
      <div class="mv517a-kpi"><b>${r.finalizadas||0}</b><span>Finalizadas</span></div>
      <div class="mv517a-kpi"><b>${r.reprogramadas||0}</b><span>Reprogramadas</span></div>
      <div class="mv517a-kpi"><b>${r.canceladas||0}</b><span>Canceladas</span></div>
      <div class="mv517a-kpi"><b>${r.anuladas||0}</b><span>Anuladas</span></div>
      <div class="mv517a-kpi"><b>${r.noEstandar||0}</b><span>No estándar</span></div>
    </div>`;
  }

  function alerta(){
    if(!EST.data||!esValidador()) return "";
    const n=EST.data.notificacionJefatura||{};
    const d=n.detalle||{};
    if(!Number(n.totalPendientes||0)) return `<div class="mv517a-note">✅ No tienes casos VTR/GAR pendientes de intervención en este período.</div>`;
    return `<div class="mv517a-alert"><b>🔔 Pendientes de Jefatura: ${Number(n.totalPendientes||0)}</b><br>
      Clasificación: ${d.clasificacion||0} · Bono: ${d.bono||0} · Sin antecedente dentro de pendientes: ${d.sinAntecedente||0} · No estándar: ${d.noEstandar||0} · Por revisar: ${d.porRevisar||0}</div>`;
  }

  function filtros(){
    if(!EST.data) return [];
    const q=norm(document.getElementById("mv517aBuscar")?.value);
    const tipo=norm(document.getElementById("mv517aTipo")?.value);
    const est=norm(document.getElementById("mv517aEstado")?.value);
    const reg=norm(document.getElementById("mv517aRegistro")?.value);
    return (EST.data.incidencias||[]).filter(x=>{
      if(tipo&&norm(x.tipo)!==tipo)return false;
      if(est&&norm(x.estadoWin)!==est)return false;
      if(reg&&norm(x.registroTecnico)!==reg)return false;
      if(q){
        const bolsa=norm([x.ticket,x.codigoPedido,x.dni,x.cuadrillaEjecutora,x.cuadrillaResponsable,x.sedeEjecutora].join(" "));
        if(!bolsa.includes(q))return false;
      }
      return true;
    });
  }

  function antecedentes(x){
    const a=x.antecedente||{};
    const arr=Array.isArray(a.antecedentes)?a.antecedentes:[];
    if(a.estado==="NO") return `<div class="mv517a-box"><b>⚠️ Sin antecedente detectado.</b> Esto es una alerta de revisión, no una decisión automática. Jefatura define si corresponde GAR/VTR.</div>`;
    if(!arr.length) return `<div class="mv517a-box">Sin información de antecedente disponible.</div>`;
    return `<div class="mv517a-box"><b>🔎 Antecedentes detectados</b>${arr.map(z=>`<div style="margin-top:5px;border-top:1px solid #e2e8f0;padding-top:5px">
      ${esc(z.fecha||"-")} · Orden ${esc(z.ordenId||"-")} · ${esc(z.estado||"-")} · ${esc(z.tipoTrabajo||"-")} · ${esc(z.cuadrilla||"-")}
    </div>`).join("")}</div>`;
  }

  function acciones(x,noEstandar){
    if(!EST.data||!EST.data.puedeValidar) return `<div class="mv517a-note">Solo lectura. La decisión final corresponde a JEFZNORTE.</div>`;
    const id=noEstandar?x.clave:x.ticket;
    const kind=noEstandar?"CLAVE":"TICKET";
    return `<div class="mv517a-actions">
      <button class="mv517a-btn ok" onclick="mv517aDecision('${kind}','${esc(id)}','CORRESPONDE')">Confirmar GAR/VTR</button>
      <button class="mv517a-btn warn" onclick="mv517aDecision('${kind}','${esc(id)}','REASIGNAR')">Reasignar</button>
      <button class="mv517a-btn dark" onclick="mv517aDecision('${kind}','${esc(id)}','NO_ES_GAR_VTR')">NO ES GAR/VTR</button>
      <button class="mv517a-btn bad" onclick="mv517aDecision('${kind}','${esc(id)}','ANULAR')">Anular</button>
      ${!noEstandar&&x.validacionId&&norm(x.bono)!=="BONO"&&norm(x.bono)!=="NO BONO"
        ? `<button class="mv517a-btn money" onclick="mv517aBono('${esc(x.validacionId)}','BONO')">BONO</button><button class="mv517a-btn bad" onclick="mv517aBono('${esc(x.validacionId)}','NO BONO')">NO BONO</button>`
        : ""}
    </div>`;
  }

  function detalle(x,noEstandar){
    if(noEstandar){
      return `<div class="mv517a-detail">
        <div class="mv517a-grid">
          <div class="mv517a-field"><small>Orden WIN</small><b>${esc(x.ordenId||"-")}</b></div>
          <div class="mv517a-field"><small>Código / cliente</small><b>${esc(x.codigoPedido||"-")}</b></div>
          <div class="mv517a-field"><small>DNI</small><b>${esc(x.dni||"-")}</b></div>
          <div class="mv517a-field"><small>Estado WIN</small><b>${esc(x.estadoWin||"-")}</b></div>
          <div class="mv517a-field"><small>Tipo base</small><b>${esc(x.tipoBase||"-")}</b></div>
          <div class="mv517a-field"><small>Decisión</small><b>${esc(x.estadoDecision||"PENDIENTE")}</b></div>
        </div>
        <div class="mv517a-box"><b>Motivo WIN:</b> ${esc(x.motivoWin||"-")}<br><b>Nota:</b> No existe ticket VTR/GAR canónico. Requiere decisión manual.</div>
        ${x.recuperacionProduccionPendiente?`<div class="mv517a-alert">Marcado NO ES GAR/VTR y FINALIZADO. La recuperación a Producción está pendiente de la siguiente etapa; todavía no se modificó PRODUCCION_APP.</div>`:""}
        ${acciones(x,true)}
      </div>`;
    }

    return `<div class="mv517a-detail">
      <div class="mv517a-grid">
        <div class="mv517a-field"><small>Estado WIN</small><b>${esc(x.estadoWin||"-")}</b></div>
        <div class="mv517a-field"><small>Registro técnico</small><b>${esc(x.registroTecnico||"-")}</b></div>
        <div class="mv517a-field"><small>Bono</small><b>${esc(x.bono||"-")}${x.puntajeVtrGar!=null?` · ${esc(x.puntajeVtrGar)} pts`:""}</b></div>
        <div class="mv517a-field"><small>Código / pedido</small><b>${esc(x.codigoPedido||"-")}</b></div>
        <div class="mv517a-field"><small>DNI</small><b>${esc(x.dni||"-")}</b></div>
        <div class="mv517a-field"><small>Responsable</small><b>${esc(x.cuadrillaResponsable||"POR VALIDAR")}</b></div>
      </div>
      ${antecedentes(x)}
      ${(x.ordenesWin||[]).length?`<div class="mv517a-box"><b>📋 Órdenes WIN del ticket</b>${x.ordenesWin.map(o=>`<div style="margin-top:5px;border-top:1px solid #e2e8f0;padding-top:5px">Orden ${esc(o.ordenId)} · ${esc(o.estado)} · ${esc(o.fechaSolicitud||"-")} · ${esc(o.cuadrilla||"-")}</div>`).join("")}</div>`:""}
      ${x.comentarioJefatura?`<div class="mv517a-box"><b>Comentario validación técnica:</b> ${esc(x.comentarioJefatura)}</div>`:""}
      ${acciones(x,false)}
    </div>`;
  }

  function caso(x,noEstandar){
    const titulo=noEstandar
      ? (x.ticketMostrar||("ORDEN "+x.ordenId))
      : x.ticket;
    return `<details class="mv517a-case">
      <summary>
        <div><div class="mv517a-ticket">${esc(titulo||"SIN TICKET")}</div><div class="mv517a-sub">${esc(x.fechaIncidencia||"-")} · ${esc(x.sedeEjecutora||"-")}</div></div>
        <div><b style="font-size:10px">${esc(x.cuadrillaEjecutora||"-")}</b></div>
        <div class="mv517a-badges">${badgeWin(x.estadoWin)}${noEstandar?badgeDecision(x):badgeRegistro(x)+badgeDecision(x)+badgeBono(x)}</div>
      </summary>
      ${detalle(x,noEstandar)}
    </details>`;
  }

  function render(){
    const cont=document.getElementById("mv517aContenido");
    if(!cont||!EST.data)return;
    const lista=filtros();
    const sedes={};
    lista.forEach(x=>{
      const s=x.sedeEjecutora||"SIN SEDE";
      if(!sedes[s])sedes[s]={};
      const e=x.estadoWin||"POR_REVISAR";
      if(!sedes[s][e])sedes[s][e]=[];
      sedes[s][e].push(x);
    });
    const ordenEstados=["FINALIZADA","REPROGRAMADA","CANCELADA","ANULADA","POR_REVISAR"];
    let html=Object.keys(sedes).sort().map(s=>{
      let dentro=ordenEstados.filter(e=>sedes[s][e]?.length).map(e=>{
        const arr=sedes[s][e].sort((a,b)=>txt(b.fechaIncidencia).localeCompare(txt(a.fechaIncidencia)));
        return `<details class="mv517a-estado" ${e==="FINALIZADA"?"open":""}><summary><span>${esc(e)}</span><span>${arr.length}</span></summary><div class="mv517a-estado-body">${arr.map(x=>caso(x,false)).join("")}</div></details>`;
      }).join("");
      return `<details class="mv517a-sede"><summary><span>${esc(s)}</span><span>${Object.values(sedes[s]).reduce((n,a)=>n+a.length,0)} casos</span></summary><div class="mv517a-sede-body">${dentro}</div></details>`;
    }).join("");

    const ne=(EST.data.noEstandar||[]);
    if(ne.length){
      html+=`<details class="mv517a-sede"><summary><span>⚠️ NO ESTÁNDAR / REVISIÓN MANUAL</span><span>${ne.length}</span></summary><div class="mv517a-sede-body"><div class="mv517a-estado-body">${ne.map(x=>caso(x,true)).join("")}</div></div></details>`;
    }
    cont.innerHTML=html||`<div class="mv517a-empty">No hay casos con estos filtros.</div>`;
  }

  function pantalla(){
    const d=EST.data||{}, ps=d.periodosDisponibles||[];
    return `${css()}<div class="mv517a">
      <div style="margin-bottom:9px"><button class="mv517a-btn dark" onclick="mostrarValidacionTecnica()">⬅ Volver a Validación Técnica</button></div>
      <div class="mv517a-head"><h2>📡 GAR / VTR</h2><p>Consolidación oficial desde WIN. Solo las FINALIZADAS pueden impactar el indicador. Canceladas, reprogramadas y anuladas se conservan para trazabilidad.</p></div>
      ${tabs()}
      ${d.periodoCerrado?`<div class="mv517a-note"><b>Período cerrado:</b> ${esc(d.periodo)}. Solo lectura.</div>`:""}
      ${alerta()}
      ${kpis(d.resumen)}
      <div class="mv517a-tools">
        <input id="mv517aBuscar" placeholder="Buscar ticket, código, DNI o cuadrilla" oninput="mv517aRender()">
        <select id="mv517aTipo" onchange="mv517aRender()"><option value="">GAR y VTR</option><option>GAR</option><option>VTR</option></select>
        <select id="mv517aEstado" onchange="mv517aRender()"><option value="">Todos estados WIN</option><option>FINALIZADA</option><option>REPROGRAMADA</option><option>CANCELADA</option><option>ANULADA</option><option>POR_REVISAR</option></select>
        <select id="mv517aRegistro" onchange="mv517aRender()"><option value="">Registradas y no registradas</option><option value="REGISTRADA">REGISTRADA</option><option value="NO_REGISTRADA">NO REGISTRADA</option></select>
      </div>
      <div style="margin:8px 0"><select id="mv517aPeriodo" onchange="mv517aCambiarPeriodo(this.value)" style="border:1px solid #cbd5e1;border-radius:9px;padding:8px">${ps.map(p=>`<option value="${esc(p)}" ${p===d.periodo?"selected":""}>${esc(p)}</option>`).join("")}</select></div>
      <div id="mv517aContenido"></div>
    </div>`;
  }

  function cargar(periodo){
    const payload={accion:"listarVtrGarV517A",usuario:usuario()};
    if(periodo)payload.periodo=periodo;
    if(typeof window.mostrarPantalla==="function"){
      window.mostrarPantalla(`${css()}<div class="mv517a"><div class="mv517a-note">Cargando consolidación GAR/VTR...</div></div>`);
    }
    return apiPost(payload).then(r=>{
      EST.data=r; EST.periodo=r.periodo;
      window.MV488_VT_MODO="VTRGAR";
      window.mostrarPantalla(pantalla());
      render();
      decorarBadge();
    }).catch(e=>{
      window.mostrarPantalla(`${css()}<div class="mv517a"><div class="mv517a-alert"><b>No se pudo cargar GAR/VTR.</b><br>${esc(e.message)}</div></div>`);
    });
  }

  window.mv517aRender=render;
  window.mv517aCambiarPeriodo=function(p){cargar(p);};

  window.mv489AbrirValidacionVtrGar=function(){
    if(perfil()==="TECNICO")return;
    cargar(EST.periodo||"");
  };

  function modalDecision(kind,id,decision){
    if(!EST.data?.puedeValidar)return;
    const reas=decision==="REASIGNAR";
    const motivoReq=decision==="ANULAR"||decision==="NO_ES_GAR_VTR";
    const opciones=(EST.data.cuadrillas||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
    const bg=document.createElement("div");
    bg.className="mv517a-modalbg";
    bg.innerHTML=`<div class="mv517a-modal">
      <h3 style="margin:0">${esc(decision.replaceAll("_"," "))}</h3>
      ${reas?`<label>Cuadrilla responsable</label><select id="mv517aModalCuad"><option value="">Seleccione...</option>${opciones}</select>`:""}
      <label>Motivo / comentario${motivoReq?" *":""}</label><textarea id="mv517aModalMotivo" placeholder="Detalle de la decisión de Jefatura"></textarea>
      ${decision==="NO_ES_GAR_VTR"?`<div class="mv517a-alert">Si la orden está FINALIZADA, quedará marcada para recuperar Producción en la etapa siguiente. En V517A todavía no se modifica PRODUCCION_APP.</div>`:""}
      <div class="mv517a-actions"><button class="mv517a-btn ok" id="mv517aModalOk">Guardar</button><button class="mv517a-btn dark" id="mv517aModalCancel">Cancelar</button></div>
    </div>`;
    document.body.appendChild(bg);
    bg.querySelector("#mv517aModalCancel").onclick=()=>bg.remove();
    bg.querySelector("#mv517aModalOk").onclick=()=>{
      const motivo=txt(bg.querySelector("#mv517aModalMotivo").value);
      const cuad=reas?txt(bg.querySelector("#mv517aModalCuad").value):"";
      if(reas&&!cuad){alert("Seleccione la cuadrilla responsable.");return;}
      if(motivoReq&&!motivo){alert("Ingrese el motivo de la decisión.");return;}
      const p={accion:"clasificarVtrGarV517A",usuario:usuario(),periodo:EST.data.periodo,decision:decision,observacion:motivo};
      if(kind==="TICKET")p.ticket=id;else p.clave=id;
      if(cuad)p.cuadrillaResponsable=cuad;
      const btn=bg.querySelector("#mv517aModalOk");btn.disabled=true;btn.textContent="Guardando...";
      apiPost(p).then(r=>{
        bg.remove();
        if(r.recuperacionProduccionPendiente) alert("Decisión guardada. La recuperación a Producción queda pendiente para la siguiente etapa.");
        return cargar(EST.data.periodo);
      }).catch(e=>{btn.disabled=false;btn.textContent="Guardar";alert(e.message);});
    };
  }
  window.mv517aDecision=modalDecision;

  window.mv517aBono=function(id,resultado){
    if(!EST.data?.puedeValidar)return;
    let puntaje=0;
    if(resultado==="BONO"){
      const p=prompt("Puntaje VTR/GAR definido por Jefatura:");
      if(p===null)return;
      puntaje=Number(p);
      if(!isFinite(puntaje)||puntaje<=0){alert("Ingrese un puntaje mayor a 0.");return;}
    }
    const motivo=prompt("Motivo / comentario de Jefatura:");
    if(motivo===null)return;
    if(!txt(motivo)){alert("El comentario es obligatorio.");return;}
    apiPost({accion:"validarBonoVtrGarV515",usuario:usuario(),id:id,resultado:resultado,puntajeVtrGar:puntaje,motivo:motivo})
      .then(()=>cargar(EST.data.periodo))
      .catch(e=>alert(e.message));
  };

  function decorarBadge(){
    if(!esValidador())return;
    apiGet({accion:"notificacionVtrGarV517A",usuario:usuario(),periodo:EST.periodo||""})
      .then(r=>{
        const n=Number(r.notificacionJefatura?.totalPendientes||0);
        document.querySelectorAll(".mv489-tabs,.mv517a-tabs,#mv516cTabs").forEach(nav=>{
          const btn=Array.from(nav.querySelectorAll("button")).find(b=>norm(b.textContent).includes("VALIDACION"));
          if(!btn)return;
          btn.querySelectorAll(".mv517a-tab-notif").forEach(x=>x.remove());
          if(n){
            const s=document.createElement("span");s.className="mv517a-tab-notif";s.textContent=n;btn.appendChild(s);
          }
        });
      }).catch(()=>{});
  }

  function observar(){
    if(!esValidador())return;
    if(window.MV488_VT_MODO==="VTRGAR")decorarBadge();
  }
  const obs=new MutationObserver(()=>{clearTimeout(EST.timer);EST.timer=setTimeout(observar,100);});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("click",()=>setTimeout(observar,180),true);
  setTimeout(observar,600);
  console.log("MI VISUAL V517A: interfaz GAR/VTR preparada.");
})();