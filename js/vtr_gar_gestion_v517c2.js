/* ============================================================
   MI VISUAL V517C.2 - GAR/VTR GESTION + HISTORICO + OBSERVADO

   ALCANCE
   - Gestión/Jefatura: GAR/VTR abre directamente la fuente consolidada V517A.
   - No usa la pantalla histórica de 127 registros como puerta de entrada.
   - Sin pestañas Registro | Validación para gestión.
   - Filtros: WIN, registro técnico, Bono/No Bono y estado de gestión.
   - Accesos rápidos: Con registro, Sin registro, Bono pendiente, Observado y Registros por validar.
   - Detalle técnico bajo demanda desde VALIDACION_TECNICA, incluyendo validaciones ya realizadas.
   - Conserva y muestra BONO / NO BONO / OBSERVADO + comentario histórico de Jefatura.
   - Un solo botón Gestionar caso para clasificación + validación del registro.
   - Técnico: conserva registro e historial, sin PROPIA / ASIGNADA.
   - No modifica Ranking, Dashboard, Producción ni Recableado.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C2_GARVTR_GESTION_OK) return;
  window.MV517C2_GARVTR_GESTION_OK = true;
  /* Evita que una copia anterior V517C.1 vuelva a tomar el control. */
  window.MV517C1_GARVTR_GESTION_OK = true;

  const API = window.MI_VISUAL_API_URL ||
    "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR = "JEFZNORTE";
  const EST = {data:null,periodo:"",detalleRegistros:null,detalleTs:0};
  const TTL_DETALLE = 2*60*1000;

  const BASE_ABRIR_VTR = typeof window.mv488AbrirVtrGar === "function" ? window.mv488AbrirVtrGar : null;

  function txt(v){ return String(v==null?"":v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function usuario(){ return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||""); }
  function perfil(){ return norm(localStorage.getItem("perfil")||""); }
  function esTecnico(){ return perfil()==="TECNICO"; }
  function esValidador(){ return norm(usuario())===VALIDADOR && perfil()==="JEFATURA"; }

  function apiPost(payload){
    return fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload||{})
    }).then(r=>r.text()).then(t=>{
      let j; try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del backend.");}
      if(!j||!j.ok) throw new Error((j&&j.error)||"No se pudo completar la consulta.");
      return j;
    });
  }

  function mostrar(html){
    if(typeof window.mostrarPantalla==="function") return window.mostrarPantalla(html);
    const p=document.getElementById("pantalla");
    if(p) p.innerHTML=html;
  }

  function css(){
    return `<style id="mv517c2-css">
      .mv517c1{max-width:1180px;margin:0 auto;padding:8px;color:#0f172a}
      .mv517c1-head{background:linear-gradient(135deg,#1e4f93,#147d75);color:#fff;border-radius:14px;padding:12px 14px;margin:6px 0 8px;box-shadow:0 7px 18px rgba(15,23,42,.12)}
      .mv517c1-head h2{margin:0;font-size:20px}.mv517c1-head p{margin:3px 0 0;font-size:10px;line-height:1.35;opacity:.96}
      .mv517c1-back{border:0;background:#475569;color:#fff;border-radius:8px;padding:7px 10px;font-size:9px;font-weight:900;cursor:pointer}
      .mv517c1-alert,.mv517c1-note{border-radius:10px;padding:7px 9px;font-size:9px;line-height:1.35;margin:6px 0}
      .mv517c1-alert{background:#fff3d6;border:1px solid #f0bd4d;color:#713f12}.mv517c1-note{background:#e7f2ff;border:1px solid #a9cdf8;color:#1e3a8a}
      .mv517c1-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin:7px 0}
      .mv517c1-kpi{border:0;border-radius:10px;padding:7px;text-align:center;box-shadow:none;background:#e8eef6}
      .mv517c1-kpi:nth-child(1){background:#e1ecf8}.mv517c1-kpi:nth-child(2){background:#def4e8}.mv517c1-kpi:nth-child(3){background:#fff0c9}.mv517c1-kpi:nth-child(4){background:#fde2e2}.mv517c1-kpi:nth-child(5){background:#e7e8ee}.mv517c1-kpi:nth-child(6){background:#f4e5fb}
      .mv517c1-kpi b{display:block;font-size:18px}.mv517c1-kpi span{font-size:7px;font-weight:900;color:#475569;text-transform:uppercase}
      .mv517c1-quick{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:6px 0 8px}
      .mv517c1-q{border:0;color:#0f172a;border-radius:10px;padding:7px 8px;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:5px;font-size:9px;font-weight:900;background:#e8eef6}
      .mv517c1-q:nth-child(1){background:#ddf4e7}.mv517c1-q:nth-child(2){background:#edf0f4}.mv517c1-q:nth-child(3){background:#fff0c7}.mv517c1-q:nth-child(4){background:#ffe2c5}.mv517c1-q:nth-child(5){background:#dfeeff}
      .mv517c1-q b{font-size:15px}.mv517c1-q.active{outline:2px solid #2563eb;outline-offset:-2px;color:#1d4ed8}
      .mv517c1-tools{display:grid;grid-template-columns:2fr repeat(4,1fr);gap:5px;margin:7px 0}
      .mv517c1-tools input,.mv517c1-tools select,.mv517c1-periodo{width:100%;box-sizing:border-box;border:1px solid #b9c7d8;border-radius:8px;padding:8px;background:#f8fbff;color:#0f172a;font-size:10px}
      .mv517c1-period-row{display:flex;justify-content:flex-start;margin:6px 0}.mv517c1-periodo{width:auto;min-width:110px;font-weight:800}
      .mv517c1-sede{border:0;border-radius:12px;background:#dfe9f4;margin:7px 0;overflow:hidden}
      .mv517c1-sede>summary{list-style:none;cursor:pointer;padding:9px 11px;background:#d1e0f0;font-weight:950;display:flex;justify-content:space-between;gap:8px}
      .mv517c1-sede>summary::-webkit-details-marker{display:none}.mv517c1-sede-body{padding:6px}
      .mv517c1-estado{border:0;border-radius:10px;background:#eef3f8;margin:5px 0;overflow:hidden}
      .mv517c1-estado>summary{list-style:none;cursor:pointer;padding:7px 9px;background:#e6edf5;font-weight:900;display:flex;justify-content:space-between}
      .mv517c1-estado>summary::-webkit-details-marker{display:none}.mv517c1-estado-body{display:grid;gap:6px;padding:6px}
      .mv517c1-case{background:#f8fbfd;border:1px solid #aebfd1;border-left:4px solid #7c9dbc;border-radius:10px;overflow:hidden;box-shadow:none}
      .mv517c1-case[open]{border-color:#7898ba;background:#f4f9fc;box-shadow:0 3px 9px rgba(15,23,42,.07)}
      .mv517c1-case>summary{list-style:none;cursor:pointer;padding:8px 9px;display:grid;grid-template-columns:1.05fr 1.75fr 1.3fr;gap:7px;align-items:center}
      .mv517c1-case>summary::-webkit-details-marker{display:none}
      .mv517c1-ticket{font-size:13px;font-weight:950}.mv517c1-sub{font-size:8px;color:#64748b;margin-top:1px}.mv517c1-cuad{font-size:9px;font-weight:900}
      .mv517c1-badges{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end}
      .mv517c1-badge{display:inline-flex;border-radius:999px;padding:3px 6px;font-size:7px;font-weight:950;background:#dfe6ee;color:#334155}
      .mv517c1-badge.ok{background:#d3f1df;color:#166534}.mv517c1-badge.warn{background:#ffefbb;color:#854d0e}.mv517c1-badge.bad{background:#f9d8d8;color:#991b1b}.mv517c1-badge.info{background:#d9e9fb;color:#1d4ed8}.mv517c1-badge.dark{background:#dfe2e8;color:#0f172a}.mv517c1-badge.obs{background:#ffe0bd;color:#9a3412}
      .mv517c1-detail{border-top:1px solid #c8d5e2;background:#eaf1f6;padding:7px}
      .mv517c1-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
      .mv517c1-field{background:#f8fbfd;border:0;border-radius:8px;padding:6px;min-width:0}.mv517c1-field small{display:block;font-size:7px;color:#64748b;font-weight:900;text-transform:uppercase;margin-bottom:1px}.mv517c1-field b{font-size:9px;overflow-wrap:anywhere}
      .mv517c1-box{background:#f7fafc;border:0;border-radius:8px;padding:7px;margin-top:6px;font-size:9px;line-height:1.4}
      .mv517c1-box.hist{background:#e8f1fb}.mv517c1-box.obs{background:#fff0dc;color:#7c2d12}.mv517c1-box.ok{background:#e4f5ea}.mv517c1-box.neutral{background:#edf1f5}
      .mv517c1-regbox{display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;background:#e4edf7}
      .mv517c1-actions{display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap;margin-top:6px}.mv517c1-btn{border:0;border-radius:8px;padding:7px 9px;color:#fff;background:#0f766e;font-size:9px;font-weight:900;cursor:pointer}.mv517c1-btn.detail{background:#2563eb}.mv517c1-btn.dark{background:#475569}.mv517c1-btn.bad{background:#b91c1c}.mv517c1-btn:disabled{opacity:.55;cursor:not-allowed}
      .mv517c1-empty{padding:16px;text-align:center;color:#64748b;background:#e9eff5;border:0;border-radius:10px}
      .mv517c1-modalbg{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:14000;display:flex;align-items:center;justify-content:center;padding:10px}
      .mv517c1-modal{width:min(590px,100%);max-height:92vh;overflow:auto;background:#eef4f8;color:#0f172a;border-radius:15px;padding:12px;box-shadow:0 18px 48px rgba(15,23,42,.24)}
      .mv517c1-modal h3{margin:0 0 5px;font-size:17px}.mv517c1-modal h4{margin:0 0 6px;font-size:11px}
      .mv517c1-section{background:#e5edf4;border:0;border-radius:10px;padding:8px;margin-top:7px}.mv517c1-section.registro{background:#e4f0fb}.mv517c1-section.gestion{background:#e6f3ec}.mv517c1-section.observacion{background:#fff0dc}
      .mv517c1-modal label{display:block;font-size:9px;font-weight:900;margin:7px 0 3px}.mv517c1-modal select,.mv517c1-modal textarea,.mv517c1-modal input{width:100%;box-sizing:border-box;border:1px solid #b9c7d8;border-radius:8px;padding:8px;background:#fbfdff}.mv517c1-modal textarea{min-height:62px;resize:vertical}
      .mv517c1-footer{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;margin-top:9px}
      @media(max-width:850px){.mv517c1-kpis{grid-template-columns:repeat(3,1fr)}.mv517c1-quick{grid-template-columns:repeat(3,1fr)}.mv517c1-tools{grid-template-columns:1fr 1fr}.mv517c1-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.mv517c1{padding:6px}.mv517c1-kpis{grid-template-columns:repeat(2,1fr)}.mv517c1-quick{grid-template-columns:1fr 1fr}.mv517c1-tools,.mv517c1-grid,.mv517c1-case>summary{grid-template-columns:1fr}.mv517c1-badges{justify-content:flex-start}.mv517c1-actions .mv517c1-btn,.mv517c1-footer .mv517c1-btn{flex:1}}
    </style>`;
  }

  function badge(t,c){ return `<span class="mv517c1-badge ${c||""}">${esc(t)}</span>`; }
  function badgeWin(e){
    e=norm(e);
    if(e==="FINALIZADA") return badge("FINALIZADA","ok");
    if(e==="REPROGRAMADA") return badge("REPROGRAMADA","warn");
    if(e==="CANCELADA") return badge("CANCELADA","bad");
    if(e==="ANULADA") return badge("ANULADA","dark");
    return badge(e||"POR REVISAR","info");
  }
  function badgeRegistro(x){ return norm(x.registroTecnico)==="REGISTRADA"?badge("📝 CON REGISTRO","ok"):badge("⚪ SIN REGISTRO","bad"); }
  function badgeDecision(x){
    const e=norm(x.estadoResponsabilidad||x.estadoDecision||"PENDIENTE");
    if(e==="CONFIRMADO") return badge("RESP. CONFIRMADA","ok");
    if(e==="REASIGNADO") return badge("RESP. REASIGNADA","info");
    if(e==="NO_ES_GAR_VTR") return badge("NO ES GAR/VTR","dark");
    if(e==="ANULADO") return badge("ANULADO","bad");
    return badge("RESP. PENDIENTE","warn");
  }
  function estadoBono(x){
    const b=norm(x.bono);
    if(b==="BONO") return "BONO";
    if(b==="NO BONO"||b==="NO_BONO") return "NO_BONO";
    if(b==="OBSERVADO") return "OBSERVADO";
    if(norm(x.registroTecnico)==="REGISTRADA") return "PENDIENTE";
    return "SIN_REGISTRO";
  }
  function badgeBono(x){
    const b=estadoBono(x);
    if(b==="BONO") return badge("🟢 BONO","ok");
    if(b==="NO_BONO") return badge("🔵 NO BONO","info");
    if(b==="OBSERVADO") return badge("🟠 OBSERVADO","obs");
    if(b==="PENDIENTE") return badge("🟡 BONO PENDIENTE","warn");
    return "";
  }

  function porValidar(x){
    return norm(x.registroTecnico)==="REGISTRADA" && estadoBono(x)==="PENDIENTE";
  }

  function noEstandarActivos(){
    return (EST.data?.noEstandar||[]).filter(x=>{
      const decision=norm(x.estadoResponsabilidad||x.estadoDecision||"PENDIENTE");
      const estadoWin=norm(x.estadoWin||"POR_REVISAR");
      return estadoWin==="FINALIZADA" && !["CONFIRMADO","REASIGNADO","NO_ES_GAR_VTR","ANULADO"].includes(decision);
    });
  }

  function conteosRapidos(){
    const arr=(EST.data&&EST.data.incidencias)||[];
    return {
      conRegistro:arr.filter(x=>norm(x.registroTecnico)==="REGISTRADA").length,
      sinRegistro:arr.filter(x=>norm(x.registroTecnico)!=="REGISTRADA").length,
      bonoPendiente:arr.filter(x=>estadoBono(x)==="PENDIENTE").length,
      observados:arr.filter(x=>estadoBono(x)==="OBSERVADO").length,
      porValidar:arr.filter(porValidar).length
    };
  }

  function setFiltroRegistro(v){
    const s=document.getElementById("mv517c1Registro"); if(s)s.value=v||"";
    const g=document.getElementById("mv517c1Gestion"); if(g)g.value="";
    render();
  }
  function setFiltroGestion(v){
    const g=document.getElementById("mv517c1Gestion"); if(g)g.value=v||"";
    const s=document.getElementById("mv517c1Registro"); if(s)s.value="";
    render();
  }
  window.mv517c1FiltroRegistro=setFiltroRegistro;
  window.mv517c1FiltroGestion=setFiltroGestion;

  function filtros(){
    const arr=(EST.data&&EST.data.incidencias)||[];
    const q=norm(document.getElementById("mv517c1Buscar")?.value);
    const tipo=norm(document.getElementById("mv517c1Tipo")?.value);
    const estado=norm(document.getElementById("mv517c1Estado")?.value);
    const reg=norm(document.getElementById("mv517c1Registro")?.value);
    const gestion=norm(document.getElementById("mv517c1Gestion")?.value);

    return arr.filter(x=>{
      if(tipo&&norm(x.tipo)!==tipo) return false;
      if(estado&&norm(x.estadoWin)!==estado) return false;
      if(reg==="CON_REGISTRO"&&norm(x.registroTecnico)!=="REGISTRADA")return false;
      if(reg==="SIN_REGISTRO"&&norm(x.registroTecnico)==="REGISTRADA")return false;
      if(reg==="BONO_PENDIENTE"&&estadoBono(x)!=="PENDIENTE")return false;
      if(reg==="BONO"&&estadoBono(x)!=="BONO")return false;
      if(reg==="NO_BONO"&&estadoBono(x)!=="NO_BONO")return false;
      if(reg==="OBSERVADO"&&estadoBono(x)!=="OBSERVADO")return false;
      if(gestion==="POR_VALIDAR"&&!porValidar(x))return false;
      if(gestion==="CLASIFICACION_PENDIENTE"&&!x.requiereClasificacion)return false;
      if(gestion==="RESUELTOS"&&(x.requiereClasificacion||x.requiereBono||porValidar(x)))return false;
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
    if(norm(a.estado)==="NO") return `<div class="mv517c1-box"><b>⚠️ Sin antecedente detectado.</b> Es una señal de revisión; no determina automáticamente que no sea GAR/VTR.</div>`;
    if(!arr.length) return `<div class="mv517c1-box"><b>Antecedentes:</b> sin información disponible.</div>`;
    return `<div class="mv517c1-box"><b>🔎 Antecedentes detectados</b>${arr.map(z=>`<div style="margin-top:5px;border-top:1px solid #e2e8f0;padding-top:5px">${esc(z.fecha||"-")} · Orden ${esc(z.ordenId||"-")} · ${esc(z.estado||"-")} · ${esc(z.tipoTrabajo||"-")} · ${esc(z.cuadrilla||"-")}</div>`).join("")}</div>`;
  }

  function registroBox(x){
    if(norm(x.registroTecnico)!=="REGISTRADA" || !x.validacionId){
      return `<div class="mv517c1-box mv517c1-regbox neutral"><div><b>⚪ Registro técnico</b><br>El técnico no ha registrado este ticket.</div></div>`;
    }
    const eb=estadoBono(x);
    const estadoTxt=eb==="NO_BONO"?"NO BONO":eb;
    const clase=eb==="OBSERVADO"?"obs":(eb==="BONO"?"ok":"hist");
    const comentario=txt(x.comentarioJefatura);
    return `<div class="mv517c1-box mv517c1-regbox ${clase}"><div><b>📝 Registro técnico · ${esc(estadoTxt||"PENDIENTE")}</b><br>ID: ${esc(x.validacionId)}${comentario?`<br><span style="font-weight:700">${esc(comentario.length>120?comentario.slice(0,120)+"…":comentario)}</span>`:""}</div><button class="mv517c1-btn detail" onclick="mv517c1VerRegistro('${esc(x.validacionId)}','${esc(x.ticket)}')">📋 Ver ficha</button></div>`;
  }

  function detalle(x,noEstandar){
    if(noEstandar){
      return `<div class="mv517c1-detail"><div class="mv517c1-grid">
        <div class="mv517c1-field"><small>Orden WIN</small><b>${esc(x.ordenId||"-")}</b></div>
        <div class="mv517c1-field"><small>Código / pedido</small><b>${esc(x.codigoPedido||"-")}</b></div>
        <div class="mv517c1-field"><small>DNI</small><b>${esc(x.dni||"-")}</b></div>
        <div class="mv517c1-field"><small>Estado WIN</small><b>${esc(x.estadoWin||"-")}</b></div>
        <div class="mv517c1-field"><small>Tipo base</small><b>${esc(x.tipoBase||"-")}</b></div>
        <div class="mv517c1-field"><small>Decisión</small><b>${esc(x.estadoDecision||"PENDIENTE")}</b></div>
      </div><div class="mv517c1-box"><b>Motivo WIN:</b> ${esc(x.motivoWin||"-")}<br>No existe ticket GAR/VTR canónico; se conserva para revisión manual.</div>
      ${EST.data?.puedeValidar?`<div class="mv517c1-actions"><button class="mv517c1-btn" onclick="mv517c1Gestionar('CLAVE','${esc(x.clave)}',null,true)">⚙ Gestionar caso</button></div>`:`<div class="mv517c1-note">Solo lectura.</div>`}</div>`;
    }

    return `<div class="mv517c1-detail">
      <div class="mv517c1-grid">
        <div class="mv517c1-field"><small>Estado WIN</small><b>${esc(x.estadoWin||"-")}</b></div>
        <div class="mv517c1-field"><small>Código / pedido</small><b>${esc(x.codigoPedido||"-")}</b></div>
        <div class="mv517c1-field"><small>DNI</small><b>${esc(x.dni||"-")}</b></div>
        <div class="mv517c1-field"><small>Cuadrilla ejecutora</small><b>${esc(x.cuadrillaEjecutora||"-")}</b></div>
        <div class="mv517c1-field"><small>Responsable</small><b>${esc(x.cuadrillaResponsable||"POR VALIDAR")}</b></div>
        <div class="mv517c1-field"><small>Bono</small><b>${esc(estadoBono(x).replace("_"," "))}${x.puntajeVtrGar!=null?` · ${esc(x.puntajeVtrGar)} pts`:""}</b></div>
      </div>
      ${antecedentes(x)}
      ${(x.ordenesWin||[]).length?`<div class="mv517c1-box"><b>📋 Órdenes WIN asociadas</b>${x.ordenesWin.map(o=>`<div style="margin-top:5px;border-top:1px solid #e2e8f0;padding-top:5px">Orden ${esc(o.ordenId||"-")} · ${esc(o.estado||"-")} · ${esc(o.fechaSolicitud||"-")} · ${esc(o.cuadrilla||"-")}</div>`).join("")}</div>`:""}
      ${registroBox(x)}
      ${x.comentarioJefatura?`<div class="mv517c1-box hist"><b>Histórico / comentario de Jefatura:</b> ${esc(x.comentarioJefatura)}</div>`:""}
      ${EST.data?.puedeValidar?`<div class="mv517c1-actions"><button class="mv517c1-btn" onclick="mv517c1Gestionar('TICKET','${esc(x.ticket)}','${esc(x.validacionId||"")}',false)">⚙ Gestionar caso</button></div>`:`<div class="mv517c1-note">Solo lectura. La decisión final corresponde a JEFZNORTE.</div>`}
    </div>`;
  }

  function caso(x,noEstandar){
    const titulo=noEstandar?(x.ticketMostrar||("ORDEN "+x.ordenId)):x.ticket;
    return `<details class="mv517c1-case"><summary>
      <div><div class="mv517c1-ticket">${esc(titulo||"SIN TICKET")}</div><div class="mv517c1-sub">${esc(x.fechaIncidencia||"-")} · ${esc(x.sedeEjecutora||"-")}</div></div>
      <div class="mv517c1-cuad">${esc(x.cuadrillaEjecutora||"-")}</div>
      <div class="mv517c1-badges">${badgeWin(x.estadoWin)}${noEstandar?badgeDecision(x):badgeRegistro(x)+badgeDecision(x)+badgeBono(x)}</div>
    </summary>${detalle(x,noEstandar)}</details>`;
  }

  function render(){
    const cont=document.getElementById("mv517c1Contenido");
    if(!cont||!EST.data)return;
    const lista=filtros();
    const sedes={};
    lista.forEach(x=>{
      const s=x.sedeEjecutora||"SIN SEDE", e=x.estadoWin||"POR_REVISAR";
      if(!sedes[s])sedes[s]={}; if(!sedes[s][e])sedes[s][e]=[]; sedes[s][e].push(x);
    });
    const ordenEstados=["FINALIZADA","REPROGRAMADA","CANCELADA","ANULADA","POR_REVISAR"];
    let html=Object.keys(sedes).sort().map(s=>{
      const total=Object.values(sedes[s]).reduce((n,a)=>n+a.length,0);
      const grupos=ordenEstados.filter(e=>sedes[s][e]?.length).map(e=>{
        const arr=sedes[s][e].sort((a,b)=>txt(b.fechaIncidencia).localeCompare(txt(a.fechaIncidencia)));
        return `<details class="mv517c1-estado" ${e==="FINALIZADA"?"open":""}><summary><span>${esc(e.replace("_"," "))}</span><span>${arr.length}</span></summary><div class="mv517c1-estado-body">${arr.map(x=>caso(x,false)).join("")}</div></details>`;
      }).join("");
      return `<details class="mv517c1-sede"><summary><span>${esc(s)}</span><span>${total} casos</span></summary><div class="mv517c1-sede-body">${grupos}</div></details>`;
    }).join("");

    const ne=noEstandarActivos();
    if(ne.length){
      html+=`<details class="mv517c1-sede"><summary><span>⚠️ NO ESTÁNDAR / REVISIÓN MANUAL</span><span>${ne.length}</span></summary><div class="mv517c1-sede-body"><div class="mv517c1-estado-body">${ne.map(x=>caso(x,true)).join("")}</div></div></details>`;
    }
    cont.innerHTML=html||`<div class="mv517c1-empty">No hay casos con los filtros seleccionados.</div>`;

    const reg=norm(document.getElementById("mv517c1Registro")?.value);
    const ges=norm(document.getElementById("mv517c1Gestion")?.value);
    document.querySelectorAll(".mv517c1-q").forEach(b=>b.classList.remove("active"));
    if(reg==="CON_REGISTRO")document.getElementById("mv517c1QCon")?.classList.add("active");
    if(reg==="SIN_REGISTRO")document.getElementById("mv517c1QSin")?.classList.add("active");
    if(reg==="BONO_PENDIENTE")document.getElementById("mv517c1QBono")?.classList.add("active");
    if(reg==="OBSERVADO")document.getElementById("mv517c1QObs")?.classList.add("active");
    if(ges==="POR_VALIDAR")document.getElementById("mv517c1QValidar")?.classList.add("active");
  }
  window.mv517c1Render=render;

  function pantalla(){
    const d=EST.data||{}, r=d.resumen||{}, q=conteosRapidos(), ps=d.periodosDisponibles||[];
    const n=d.notificacionJefatura||{}, nd=n.detalle||{};
    const totalNoEstandar=noEstandarActivos().length;
    const totalPendientes=Math.max(0,Number(n.totalPendientes||0)-Number(nd.noEstandar||0)+totalNoEstandar);
    return `${css()}<div class="mv517c1">
      <button class="mv517c1-back" onclick="mostrarValidacionTecnica()">⬅ Volver a Validación Técnica</button>
      <div class="mv517c1-head"><h2>📡 GAR / VTR · Gestión Consolidada</h2><p>Fuente operativa consolidada desde WIN. El registro del técnico se asocia al ticket real y no genera un caso adicional.</p></div>
      ${d.periodoCerrado?`<div class="mv517c1-note"><b>Período cerrado:</b> ${esc(d.periodo)}. Solo lectura.</div>`:""}
      ${esValidador()&&totalPendientes?`<div class="mv517c1-alert"><b>🔔 Pendientes de Jefatura: ${totalPendientes}</b><br>Clasificación: ${nd.clasificacion||0} · Bono: ${nd.bono||0} · Sin antecedente: ${nd.sinAntecedente||0} · No estándar: ${totalNoEstandar}</div>`:""}
      <div class="mv517c1-kpis">
        <div class="mv517c1-kpi"><b>${r.total||0}</b><span>Tickets reales</span></div>
        <div class="mv517c1-kpi"><b>${r.finalizadas||0}</b><span>Finalizadas</span></div>
        <div class="mv517c1-kpi"><b>${r.reprogramadas||0}</b><span>Reprogramadas</span></div>
        <div class="mv517c1-kpi"><b>${r.canceladas||0}</b><span>Canceladas</span></div>
        <div class="mv517c1-kpi"><b>${r.anuladas||0}</b><span>Anuladas</span></div>
        <div class="mv517c1-kpi"><b>${totalNoEstandar}</b><span>No estándar</span></div>
      </div>
      <div class="mv517c1-quick">
        <button id="mv517c1QCon" class="mv517c1-q" onclick="mv517c1FiltroRegistro('CON_REGISTRO')"><span>📝 Con registro</span><b>${q.conRegistro}</b></button>
        <button id="mv517c1QSin" class="mv517c1-q" onclick="mv517c1FiltroRegistro('SIN_REGISTRO')"><span>⚪ Sin registro</span><b>${q.sinRegistro}</b></button>
        <button id="mv517c1QBono" class="mv517c1-q" onclick="mv517c1FiltroRegistro('BONO_PENDIENTE')"><span>🟡 Bono pendiente</span><b>${q.bonoPendiente}</b></button>
        <button id="mv517c1QObs" class="mv517c1-q" onclick="mv517c1FiltroRegistro('OBSERVADO')"><span>🟠 Observados</span><b>${q.observados}</b></button>
        <button id="mv517c1QValidar" class="mv517c1-q" onclick="mv517c1FiltroGestion('POR_VALIDAR')"><span>🔔 Registros por validar</span><b>${q.porValidar}</b></button>
      </div>
      <div class="mv517c1-tools">
        <input id="mv517c1Buscar" placeholder="Buscar ticket, código, DNI o cuadrilla" oninput="mv517c1Render()">
        <select id="mv517c1Tipo" onchange="mv517c1Render()"><option value="">GAR y VTR</option><option>GAR</option><option>VTR</option></select>
        <select id="mv517c1Estado" onchange="mv517c1Render()"><option value="">Todos estados WIN</option><option>FINALIZADA</option><option>REPROGRAMADA</option><option>CANCELADA</option><option>ANULADA</option><option>POR_REVISAR</option></select>
        <select id="mv517c1Registro" onchange="mv517c1Render()"><option value="">Todos los registros</option><option value="CON_REGISTRO">Con registro</option><option value="SIN_REGISTRO">Sin registro</option><option value="BONO_PENDIENTE">Bono pendiente</option><option value="BONO">Bono</option><option value="NO_BONO">No bono</option><option value="OBSERVADO">Observado</option></select>
        <select id="mv517c1Gestion" onchange="mv517c1Render()"><option value="">Toda la gestión</option><option value="POR_VALIDAR">Por validar</option><option value="CLASIFICACION_PENDIENTE">Clasificación pendiente</option><option value="RESUELTOS">Resueltos</option></select>
      </div>
      <div class="mv517c1-period-row"><select class="mv517c1-periodo" id="mv517c1Periodo" onchange="mv517c1CambiarPeriodo(this.value)">${ps.map(p=>`<option value="${esc(p)}" ${p===d.periodo?"selected":""}>${esc(p)}</option>`).join("")}</select></div>
      <div id="mv517c1Contenido"></div>
    </div>`;
  }

  function cargar(periodo){
    const p={accion:"listarVtrGarV517A",usuario:usuario()}; if(periodo)p.periodo=periodo;
    mostrar(`${css()}<div class="mv517c1"><div class="mv517c1-note">Cargando gestión consolidada GAR/VTR...</div></div>`);
    return apiPost(p).then(r=>{
      EST.data=r; EST.periodo=r.periodo; window.MV488_VT_MODO="VTRGAR";
      mostrar(pantalla()); render();
    }).catch(e=>mostrar(`${css()}<div class="mv517c1"><div class="mv517c1-alert"><b>No se pudo cargar GAR/VTR.</b><br>${esc(e.message)}</div></div>`));
  }
  window.mv517c1CambiarPeriodo=p=>cargar(p);

  async function cargarRegistrosTecnicos(){
    if(EST.detalleRegistros && Date.now()-EST.detalleTs<TTL_DETALLE) return EST.detalleRegistros;
    const r=await apiPost({accion:"listarValidacionTecnica",usuario:usuario()});
    EST.detalleRegistros=Array.isArray(r.validaciones)?r.validaciones:[]; EST.detalleTs=Date.now();
    return EST.detalleRegistros;
  }

  function fcampo(l,v){ return `<div class="mv517c1-field"><small>${esc(l)}</small><b>${esc(v||"-")}</b></div>`; }
  window.mv517c1VerRegistro=async function(id,ticket){
    const bg=document.createElement("div"); bg.className="mv517c1-modalbg";
    bg.innerHTML=`<div class="mv517c1-modal"><h3>📋 Registro técnico</h3><div class="mv517c1-note">Cargando detalle...</div></div>`; document.body.appendChild(bg);
    try{
      const arr=await cargarRegistrosTecnicos();
      const item=arr.find(x=>txt(x.id)===txt(id)) || arr.find(x=>norm(x.ticketFinal)===norm(ticket));
      if(!item) throw new Error("No se encontró el detalle del registro técnico.");
      const res=norm(item.resultadoFinal||item.estado||"PENDIENTE");
      const esObs=res==="OBSERVADO"||norm(item.estado)==="OBSERVADO";
      const esCerrado=res==="BONO"||res==="NO BONO";
      const estadoClase=esObs?"observacion":(esCerrado?"gestion":"registro");
      const link=txt(item.linkTelegram);
      bg.querySelector(".mv517c1-modal").innerHTML=`<h3>📋 Ficha de registro · ${esc(ticket||item.ticketFinal||id)}</h3>
        <div class="mv517c1-section registro"><h4>Datos registrados por el técnico</h4><div class="mv517c1-grid">
          ${fcampo("ID validación",item.id)}${fcampo("Fecha",item.fechaRegistro)}${fcampo("Hora",item.horaRegistro)}${fcampo("Técnico",item.tecnico)}${fcampo("Cuadrilla",item.cuadrilla)}${fcampo("Sede",item.sede)}${fcampo("Código",item.codigo)}${fcampo("Ticket",item.ticketFinal)}${fcampo("DNI cliente",item.dniCliente)}
        </div><div class="mv517c1-box"><b>Motivo / sustento técnico</b><br>${esc(item.motivoTecnico||"-")}</div></div>
        <div class="mv517c1-section ${estadoClase}"><h4>Validación de Jefatura · histórico conservado</h4>
          ${esObs?`<div class="mv517c1-alert"><b>🟠 OBSERVADO.</b> El técnico debe completar/corregir la evidencia y reenviar el mismo registro. El comentario queda conservado en esta ficha.</div>`:""}
          <div class="mv517c1-grid">${fcampo("Estado",item.estado||"PENDIENTE")}${fcampo("Resultado",item.resultadoFinal||"PENDIENTE")}${fcampo("Validado por",item.validadoPor)}${fcampo("Perfil validador",item.perfilValidador)}${fcampo("Fecha validación",item.fechaValidacion)}${fcampo("Hora validación",item.horaValidacion)}${fcampo("Puntaje VTR/GAR",item.puntajeVtrGar)}</div>
          <div class="mv517c1-box hist"><b>Comentario / trazabilidad de validación</b><br>${esc(item.motivoValidacion||"Sin comentario registrado")}</div>
        </div>
        <div class="mv517c1-footer">${link?`<button class="mv517c1-btn detail" id="mv517c1Telegram">📨 Abrir Telegram</button>`:""}<button class="mv517c1-btn dark" id="mv517c1CerrarReg">Cerrar</button></div>`;
      bg.querySelector("#mv517c1CerrarReg").onclick=()=>bg.remove();
      if(link){ const bt=bg.querySelector("#mv517c1Telegram"); if(bt)bt.onclick=()=>window.open(link,"_blank"); }
    }catch(e){ bg.querySelector(".mv517c1-modal").innerHTML=`<h3>📋 Registro técnico</h3><div class="mv517c1-alert">${esc(e.message)}</div><div class="mv517c1-footer"><button class="mv517c1-btn dark" onclick="this.closest('.mv517c1-modalbg').remove()">Cerrar</button></div>`; }
  };

  function casoActual(kind,id){
    if(!EST.data) return null;
    if(kind==="TICKET") return (EST.data.incidencias||[]).find(x=>norm(x.ticket)===norm(id))||null;
    return (EST.data.noEstandar||[]).find(x=>norm(x.clave)===norm(id))||null;
  }

  window.mv517c1Gestionar=function(kind,id,validacionId,noEstandar){
    if(!EST.data?.puedeValidar || !esValidador()) return;
    const caso=casoActual(kind,id);
    const bg=document.createElement("div"); bg.className="mv517c1-modalbg";
    const opciones=(EST.data.cuadrillas||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
    const tieneRegistro=!noEstandar&&!!txt(validacionId);
    const estadoReg=caso?estadoBono(caso):"SIN_REGISTRO";
    const pendienteRegistro=tieneRegistro && estadoReg==="PENDIENTE";
    const comentarioPrevio=txt(caso&&caso.comentarioJefatura);
    const estadoVisible=estadoReg==="NO_BONO"?"NO BONO":estadoReg;
    bg.innerHTML=`<div class="mv517c1-modal"><h3>⚙ Gestionar caso · ${esc(id)}</h3><div class="mv517c1-note">La clasificación y la validación del registro están integradas, pero cada dato histórico se conserva en su fuente original.</div>
      <div class="mv517c1-section"><h4>1. Clasificación GAR/VTR</h4><label>Decisión</label><select id="mv517c1Decision"><option value="SIN_CAMBIO">Sin cambios</option><option value="CORRESPONDE">Confirmar GAR/VTR</option><option value="REASIGNAR">Reasignar responsable</option><option value="NO_ES_GAR_VTR">NO ES GAR/VTR</option><option value="ANULAR">Anular clasificación</option></select><div id="mv517c1CuadWrap" style="display:none"><label>Cuadrilla responsable</label><select id="mv517c1Cuad"><option value="">Seleccione...</option>${opciones}</select></div><label>Comentario / sustento</label><textarea id="mv517c1ComClas" placeholder="Detalle de la decisión"></textarea><div id="mv517c1NoGar" class="mv517c1-alert" style="display:none">NO ES GAR/VTR no recupera Producción todavía. Esa conexión se realizará en una etapa posterior y controlada.</div></div>
      ${tieneRegistro?`<div class="mv517c1-section ${estadoReg==="OBSERVADO"?"observacion":"registro"}"><h4>2. Validación del registro técnico</h4>
        <div class="mv517c1-box hist"><b>Resultado actual:</b> ${esc(estadoVisible)}${comentarioPrevio?`<br><b>Comentario ya registrado:</b> ${esc(comentarioPrevio)}`:""}</div>
        ${estadoReg==="OBSERVADO"?`<div class="mv517c1-alert"><b>Esperando reenvío del técnico.</b> La observación y el comentario ya están guardados; no se sobreescriben.</div>`:""}
        ${pendienteRegistro?`<label>Resultado</label><select id="mv517c1Bono"><option value="SIN_CAMBIO">Sin cambios</option><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option><option value="OBSERVADO">OBSERVADO · falta evidencia/corrección</option></select><div id="mv517c1PuntWrap" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv517c1Punt" type="number" min="0" step="0.1"></div><label>Comentario de Jefatura</label><textarea id="mv517c1ComBono" placeholder="Motivo de Bono / No Bono u observación"></textarea>`:`<div class="mv517c1-note">Este registro ya tiene una respuesta de Jefatura. Para proteger el histórico se muestra en modo lectura. Si fue OBSERVADO, el técnico debe reenviar el mismo registro para volver a PENDIENTE.</div>`}
      </div>`:`<div class="mv517c1-note">Este caso no tiene registro técnico asociado; la validación Bono / No Bono / Observado no está habilitada.</div>`}
      <div class="mv517c1-footer"><button class="mv517c1-btn" id="mv517c1Guardar">Guardar cambios</button><button class="mv517c1-btn dark" id="mv517c1Cancelar">Cancelar</button></div></div>`;
    document.body.appendChild(bg);
    const dec=bg.querySelector("#mv517c1Decision"), bono=bg.querySelector("#mv517c1Bono");
    function sync(){
      bg.querySelector("#mv517c1CuadWrap").style.display=dec.value==="REASIGNAR"?"block":"none";
      bg.querySelector("#mv517c1NoGar").style.display=dec.value==="NO_ES_GAR_VTR"?"block":"none";
      if(bono){ const pw=bg.querySelector("#mv517c1PuntWrap"); if(pw)pw.style.display=bono.value==="BONO"?"block":"none"; }
    }
    dec.onchange=sync; if(bono)bono.onchange=sync; sync(); bg.querySelector("#mv517c1Cancelar").onclick=()=>bg.remove();
    bg.querySelector("#mv517c1Guardar").onclick=async function(){
      const decision=dec.value, resultado=bono?bono.value:"SIN_CAMBIO";
      if(decision==="SIN_CAMBIO"&&resultado==="SIN_CAMBIO"){alert("No has seleccionado cambios.");return;}
      const comentarioClas=txt(bg.querySelector("#mv517c1ComClas").value), cuad=txt(bg.querySelector("#mv517c1Cuad")?.value);
      if(decision==="REASIGNAR"&&!cuad){alert("Seleccione la cuadrilla responsable.");return;}
      if((decision==="ANULAR"||decision==="NO_ES_GAR_VTR")&&!comentarioClas){alert("Ingrese el motivo de la clasificación.");return;}
      const comentarioBono=txt(bg.querySelector("#mv517c1ComBono")?.value); let puntaje=0;
      if(resultado!=="SIN_CAMBIO"){
        if(!comentarioBono){alert(resultado==="OBSERVADO"?"Ingrese el motivo de la observación.":"Ingrese el comentario de Bono / No Bono.");return;}
        if(resultado==="BONO"){puntaje=Number(bg.querySelector("#mv517c1Punt")?.value);if(!isFinite(puntaje)||puntaje<=0){alert("Ingrese un puntaje mayor a 0.");return;}}
      }
      const btn=bg.querySelector("#mv517c1Guardar"); btn.disabled=true; btn.textContent="Guardando...";
      try{
        if(decision!=="SIN_CAMBIO"){
          const p={accion:"clasificarVtrGarV517A",usuario:usuario(),periodo:EST.data.periodo,decision:decision,observacion:comentarioClas}; if(kind==="TICKET")p.ticket=id;else p.clave=id;if(cuad)p.cuadrillaResponsable=cuad; await apiPost(p);
        }
        if(resultado==="OBSERVADO"){
          await apiPost({accion:"validarValidacionTecnica",usuario:usuario(),id:validacionId,resultado:"OBSERVADO",motivoValidacion:comentarioBono});
        }else if(resultado!=="SIN_CAMBIO"){
          await apiPost({accion:"validarBonoVtrGarV515",usuario:usuario(),id:validacionId,resultado:resultado,puntajeVtrGar:puntaje,motivo:comentarioBono});
        }
        EST.detalleRegistros=null; EST.detalleTs=0; bg.remove(); await cargar(EST.data.periodo);
      }catch(e){btn.disabled=false;btn.textContent="Guardar cambios";alert(e.message);}
    };
  };

  function limpiarOrigenTecnico(){
    if(!esTecnico()||window.MV488_VT_MODO!=="VTRGAR")return;
    document.querySelectorAll("#vtOrigenOrdenWrap,#vtFiltroOrigen,.vt-origin-badge,.vt-origin-summary").forEach(x=>x.remove());
    document.querySelectorAll(".vt-resumen-row").forEach(row=>{if(norm(row.querySelector("span")?.textContent).includes("ORIGEN DE LA ORDEN"))row.remove();});
    const rep=document.getElementById("vtTextoReporte"); if(rep)rep.textContent=rep.textContent.split(/\r?\n/).filter(line=>!norm(line).startsWith("ORIGEN:")).join("\n");
  }

  let guardarInstalado=false;
  function instalarGuardarTecnico(){
    if(guardarInstalado||typeof window.guardarValidacionTecnica!=="function")return;
    guardarInstalado=true;
    window.guardarValidacionTecnica=async function(btn){
      const u=typeof usuarioActualValidacion==="function"?usuarioActualValidacion():{usuario:usuario()};
      const tipoValidacion=txt(document.getElementById("vtTipoValidacion")?.value),codigo=txt(document.getElementById("vtCodigo")?.value),tipoTicket=txt(document.getElementById("vtTipoTicket")?.value),numeroTicket=txt(document.getElementById("vtNumeroTicket")?.value),dniCliente=txt(document.getElementById("vtDniCliente")?.value),motivo=txt(document.getElementById("vtMotivo")?.value);
      if(!codigo||!tipoValidacion||!tipoTicket||!dniCliente||!motivo){alert("Completa todos los campos obligatorios.");return;} if(tipoTicket!=="NO APLICA"&&!numeroTicket){alert("Ingresa el número de ticket o selecciona NO APLICA.");return;}
      try{if(btn){btn.disabled=true;btn.innerHTML="Guardando...";}if(typeof mostrarCargandoValidacion==="function")mostrarCargandoValidacion("Registrando solicitud...");const r=await apiValidacionTecnica({accion:"registrarValidacionTecnica",usuario:u.usuario,tipoValidacion,codigo,tipoTicket,numeroTicket,origenOrden:"",dniCliente,motivoTecnico:motivo});if(!r||!r.ok)throw new Error(r?.error||"No se pudo registrar");mostrarConfirmacionValidacionTecnica(r);setTimeout(limpiarOrigenTecnico,20);}
      catch(e){alert("❌ "+e.message);}finally{if(typeof ocultarCargandoValidacion==="function")ocultarCargandoValidacion();if(btn){btn.disabled=false;btn.innerHTML="Guardar solicitud";}}
    };
    try{guardarValidacionTecnica=window.guardarValidacionTecnica;}catch(_){}
  }

  function abrirGestion(){ if(esTecnico()){ if(BASE_ABRIR_VTR)return BASE_ABRIR_VTR(); return; } return cargar(EST.periodo||""); }
  function abrirRegistro(){ if(esTecnico()){ if(BASE_ABRIR_VTR){const r=BASE_ABRIR_VTR();setTimeout(limpiarOrigenTecnico,100);setTimeout(limpiarOrigenTecnico,350);return r;}return;} return abrirGestion(); }

  function asegurarRutas(){
    window.mv488AbrirVtrGar=abrirRegistro;
    window.mv489AbrirValidacionVtrGar=abrirGestion;
    window.mv489AbrirRegistroVtrGar=abrirRegistro;
    instalarGuardarTecnico();
    if(esTecnico())limpiarOrigenTecnico();
  }

  const obs=new MutationObserver(()=>{setTimeout(asegurarRutas,20);});
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  setInterval(asegurarRutas,900);
  setTimeout(asegurarRutas,50);setTimeout(asegurarRutas,300);setTimeout(asegurarRutas,900);
  console.log("MI VISUAL V517C.2: histórico + OBSERVADO + gestión compacta activa.");
})();