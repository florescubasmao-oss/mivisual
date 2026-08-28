/* ============================================================
   MI VISUAL V517C.1 - GAR/VTR GESTION CONSOLIDADA LIMPIA

   ALCANCE
   - Gestión/Jefatura: GAR/VTR abre directamente la fuente consolidada V517A.
   - No usa la pantalla histórica de 127 registros como puerta de entrada.
   - Sin pestañas Registro | Validación para gestión.
   - Filtros: WIN, registro técnico, Bono/No Bono y estado de gestión.
   - Accesos rápidos: Con registro, Sin registro, Bono pendiente, Por validar.
   - Detalle técnico bajo demanda desde VALIDACION_TECNICA.
   - Un solo botón Gestionar caso para clasificación + Bono/No Bono.
   - Técnico: conserva registro e historial, sin PROPIA / ASIGNADA.
   - No modifica Ranking, Dashboard, Producción ni Recableado.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C1_GARVTR_GESTION_OK) return;
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
    return `<style id="mv517c1-css">
      .mv517c1{max-width:1180px;margin:0 auto;padding:12px;color:#0f172a}
      .mv517c1-head{background:linear-gradient(135deg,#1d4ed8,#0f766e);color:#fff;border-radius:18px;padding:16px;margin:8px 0 10px;box-shadow:0 10px 24px rgba(15,23,42,.13)}
      .mv517c1-head h2{margin:0;font-size:22px}.mv517c1-head p{margin:5px 0 0;font-size:11px;line-height:1.45;opacity:.95}
      .mv517c1-back{border:0;background:#475569;color:#fff;border-radius:9px;padding:8px 11px;font-size:10px;font-weight:900;cursor:pointer}
      .mv517c1-alert,.mv517c1-note{border-radius:12px;padding:10px 12px;font-size:10px;line-height:1.45;margin:8px 0}
      .mv517c1-alert{background:#fffbeb;border:1px solid #fbbf24;color:#78350f}.mv517c1-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a}
      .mv517c1-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin:10px 0}
      .mv517c1-kpi{background:#fff;border:1px solid #d8e1ec;border-radius:12px;padding:9px;text-align:center;box-shadow:0 2px 7px rgba(15,23,42,.05)}
      .mv517c1-kpi b{display:block;font-size:20px}.mv517c1-kpi span{font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase}
      .mv517c1-quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:8px 0 10px}
      .mv517c1-q{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:12px;padding:9px;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:10px;font-weight:900}
      .mv517c1-q b{font-size:16px}.mv517c1-q.active{background:#dbeafe;border-color:#60a5fa;color:#1d4ed8}
      .mv517c1-tools{display:grid;grid-template-columns:2fr repeat(4,1fr);gap:7px;margin:9px 0}
      .mv517c1-tools input,.mv517c1-tools select,.mv517c1-periodo{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:9px;background:#fff;color:#0f172a;font-size:11px}
      .mv517c1-period-row{display:flex;justify-content:flex-start;margin:8px 0}
      .mv517c1-periodo{width:auto;min-width:115px;font-weight:800}
      .mv517c1-sede{border:1px solid #b8c7d9;border-radius:14px;background:#f8fafc;margin:9px 0;overflow:hidden}
      .mv517c1-sede>summary{list-style:none;cursor:pointer;padding:11px 13px;background:#eaf2fb;font-weight:950;display:flex;justify-content:space-between;gap:8px}
      .mv517c1-sede>summary::-webkit-details-marker{display:none}.mv517c1-sede-body{padding:8px}
      .mv517c1-estado{border:1px solid #d3dde8;border-radius:12px;background:#fff;margin:7px 0;overflow:hidden}
      .mv517c1-estado>summary{list-style:none;cursor:pointer;padding:9px 11px;background:#f8fafc;font-weight:900;display:flex;justify-content:space-between}
      .mv517c1-estado>summary::-webkit-details-marker{display:none}.mv517c1-estado-body{display:grid;gap:8px;padding:8px}
      .mv517c1-case{background:#fff;border:2px solid #b5c4d6;border-radius:13px;overflow:hidden;box-shadow:0 2px 7px rgba(15,23,42,.06)}
      .mv517c1-case[open]{border-color:#7698ba;box-shadow:0 5px 14px rgba(15,23,42,.10)}
      .mv517c1-case>summary{list-style:none;cursor:pointer;padding:11px 12px;display:grid;grid-template-columns:1.1fr 1.8fr 1.2fr;gap:8px;align-items:center}
      .mv517c1-case>summary::-webkit-details-marker{display:none}
      .mv517c1-ticket{font-size:14px;font-weight:950}.mv517c1-sub{font-size:9px;color:#64748b;margin-top:2px}.mv517c1-cuad{font-size:10px;font-weight:900}
      .mv517c1-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
      .mv517c1-badge{display:inline-flex;border-radius:999px;padding:4px 7px;font-size:8px;font-weight:950;background:#e2e8f0;color:#334155}
      .mv517c1-badge.ok{background:#dcfce7;color:#166534}.mv517c1-badge.warn{background:#fef3c7;color:#92400e}.mv517c1-badge.bad{background:#fee2e2;color:#991b1b}.mv517c1-badge.info{background:#dbeafe;color:#1d4ed8}.mv517c1-badge.dark{background:#e2e8f0;color:#0f172a}
      .mv517c1-detail{border-top:2px solid #d6e0eb;background:#f8fafc;padding:10px}
      .mv517c1-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .mv517c1-field{background:#fff;border:1px solid #dbe3ee;border-radius:9px;padding:8px;min-width:0}.mv517c1-field small{display:block;font-size:8px;color:#64748b;font-weight:900;text-transform:uppercase;margin-bottom:2px}.mv517c1-field b{font-size:10px;overflow-wrap:anywhere}
      .mv517c1-box{background:#fff;border:1px solid #dbe3ee;border-radius:10px;padding:9px;margin-top:8px;font-size:10px;line-height:1.45}
      .mv517c1-regbox{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
      .mv517c1-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:9px}.mv517c1-btn{border:0;border-radius:9px;padding:9px 11px;color:#fff;background:#0f766e;font-size:10px;font-weight:900;cursor:pointer}.mv517c1-btn.detail{background:#2563eb}.mv517c1-btn.dark{background:#475569}.mv517c1-btn.bad{background:#b91c1c}.mv517c1-btn:disabled{opacity:.55;cursor:not-allowed}
      .mv517c1-empty{padding:22px;text-align:center;color:#64748b;background:#fff;border:1px solid #dbe3ee;border-radius:12px}
      .mv517c1-modalbg{position:fixed;inset:0;background:rgba(15,23,42,.60);z-index:14000;display:flex;align-items:center;justify-content:center;padding:12px}
      .mv517c1-modal{width:min(600px,100%);max-height:92vh;overflow:auto;background:#fff;color:#0f172a;border-radius:18px;padding:15px;box-shadow:0 22px 60px rgba(15,23,42,.28)}
      .mv517c1-modal h3{margin:0 0 7px;font-size:18px}.mv517c1-modal h4{margin:0 0 8px;font-size:12px}
      .mv517c1-section{background:#f8fafc;border:1px solid #dbe3ee;border-radius:12px;padding:10px;margin-top:10px}
      .mv517c1-modal label{display:block;font-size:10px;font-weight:900;margin:9px 0 4px}.mv517c1-modal select,.mv517c1-modal textarea,.mv517c1-modal input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:9px;background:#fff}.mv517c1-modal textarea{min-height:70px;resize:vertical}
      .mv517c1-footer{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
      @media(max-width:850px){.mv517c1-kpis{grid-template-columns:repeat(3,1fr)}.mv517c1-quick{grid-template-columns:repeat(2,1fr)}.mv517c1-tools{grid-template-columns:1fr 1fr}.mv517c1-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.mv517c1{padding:8px}.mv517c1-kpis{grid-template-columns:repeat(2,1fr)}.mv517c1-quick,.mv517c1-tools,.mv517c1-grid,.mv517c1-case>summary{grid-template-columns:1fr}.mv517c1-badges{justify-content:flex-start}.mv517c1-actions .mv517c1-btn,.mv517c1-footer .mv517c1-btn{flex:1}}
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
    if(norm(x.registroTecnico)==="REGISTRADA") return "PENDIENTE";
    return "SIN_REGISTRO";
  }
  function badgeBono(x){
    const b=estadoBono(x);
    if(b==="BONO") return badge("🟢 BONO","ok");
    if(b==="NO_BONO") return badge("🔵 NO BONO","info");
    if(b==="PENDIENTE") return badge("🟠 BONO PENDIENTE","warn");
    return "";
  }

  function porValidar(x){
    return norm(x.registroTecnico)==="REGISTRADA" && (!!x.requiereClasificacion || !!x.requiereBono || !x.responsabilidadDefinida || estadoBono(x)==="PENDIENTE");
  }

  function conteosRapidos(){
    const arr=(EST.data&&EST.data.incidencias)||[];
    return {
      conRegistro:arr.filter(x=>norm(x.registroTecnico)==="REGISTRADA").length,
      sinRegistro:arr.filter(x=>norm(x.registroTecnico)!=="REGISTRADA").length,
      bonoPendiente:arr.filter(x=>estadoBono(x)==="PENDIENTE").length,
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
      return `<div class="mv517c1-box mv517c1-regbox"><div><b>⚪ Registro técnico</b><br>El técnico no ha registrado este ticket.</div></div>`;
    }
    return `<div class="mv517c1-box mv517c1-regbox"><div><b>📝 Registro técnico disponible</b><br>ID: ${esc(x.validacionId)}</div><button class="mv517c1-btn detail" onclick="mv517c1VerRegistro('${esc(x.validacionId)}','${esc(x.ticket)}')">📋 Ver registro técnico</button></div>`;
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
      ${x.comentarioJefatura?`<div class="mv517c1-box"><b>Comentario de Jefatura:</b> ${esc(x.comentarioJefatura)}</div>`:""}
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

    const ne=(EST.data.noEstandar||[]);
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
    if(ges==="POR_VALIDAR")document.getElementById("mv517c1QValidar")?.classList.add("active");
  }
  window.mv517c1Render=render;

  function pantalla(){
    const d=EST.data||{}, r=d.resumen||{}, q=conteosRapidos(), ps=d.periodosDisponibles||[];
    const n=d.notificacionJefatura||{}, nd=n.detalle||{};
    return `${css()}<div class="mv517c1">
      <button class="mv517c1-back" onclick="mostrarValidacionTecnica()">⬅ Volver a Validación Técnica</button>
      <div class="mv517c1-head"><h2>📡 GAR / VTR · Gestión Consolidada</h2><p>Fuente operativa consolidada desde WIN. El registro del técnico se asocia al ticket real y no genera un caso adicional.</p></div>
      ${d.periodoCerrado?`<div class="mv517c1-note"><b>Período cerrado:</b> ${esc(d.periodo)}. Solo lectura.</div>`:""}
      ${esValidador()&&Number(n.totalPendientes||0)?`<div class="mv517c1-alert"><b>🔔 Pendientes de Jefatura: ${Number(n.totalPendientes||0)}</b><br>Clasificación: ${nd.clasificacion||0} · Bono: ${nd.bono||0} · Sin antecedente: ${nd.sinAntecedente||0} · No estándar: ${nd.noEstandar||0}</div>`:""}
      <div class="mv517c1-kpis">
        <div class="mv517c1-kpi"><b>${r.total||0}</b><span>Tickets reales</span></div>
        <div class="mv517c1-kpi"><b>${r.finalizadas||0}</b><span>Finalizadas</span></div>
        <div class="mv517c1-kpi"><b>${r.reprogramadas||0}</b><span>Reprogramadas</span></div>
        <div class="mv517c1-kpi"><b>${r.canceladas||0}</b><span>Canceladas</span></div>
        <div class="mv517c1-kpi"><b>${r.anuladas||0}</b><span>Anuladas</span></div>
        <div class="mv517c1-kpi"><b>${r.noEstandar||0}</b><span>No estándar</span></div>
      </div>
      <div class="mv517c1-quick">
        <button id="mv517c1QCon" class="mv517c1-q" onclick="mv517c1FiltroRegistro('CON_REGISTRO')"><span>📝 Con registro</span><b>${q.conRegistro}</b></button>
        <button id="mv517c1QSin" class="mv517c1-q" onclick="mv517c1FiltroRegistro('SIN_REGISTRO')"><span>⚪ Sin registro</span><b>${q.sinRegistro}</b></button>
        <button id="mv517c1QBono" class="mv517c1-q" onclick="mv517c1FiltroRegistro('BONO_PENDIENTE')"><span>🟠 Bono pendiente</span><b>${q.bonoPendiente}</b></button>
        <button id="mv517c1QValidar" class="mv517c1-q" onclick="mv517c1FiltroGestion('POR_VALIDAR')"><span>🔔 Por validar</span><b>${q.porValidar}</b></button>
      </div>
      <div class="mv517c1-tools">
        <input id="mv517c1Buscar" placeholder="Buscar ticket, código, DNI o cuadrilla" oninput="mv517c1Render()">
        <select id="mv517c1Tipo" onchange="mv517c1Render()"><option value="">GAR y VTR</option><option>GAR</option><option>VTR</option></select>
        <select id="mv517c1Estado" onchange="mv517c1Render()"><option value="">Todos estados WIN</option><option>FINALIZADA</option><option>REPROGRAMADA</option><option>CANCELADA</option><option>ANULADA</option><option>POR_REVISAR</option></select>
        <select id="mv517c1Registro" onchange="mv517c1Render()"><option value="">Todos los registros</option><option value="CON_REGISTRO">Con registro</option><option value="SIN_REGISTRO">Sin registro</option><option value="BONO_PENDIENTE">Bono pendiente</option><option value="BONO">Bono</option><option value="NO_BONO">No bono</option></select>
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
      const res=txt(item.resultadoFinal||item.estado||"PENDIENTE");
      bg.querySelector(".mv517c1-modal").innerHTML=`<h3>📋 Registro técnico · ${esc(ticket||item.ticketFinal||id)}</h3>
        <div class="mv517c1-section"><h4>Datos registrados por el técnico</h4><div class="mv517c1-grid">
          ${fcampo("ID validación",item.id)}${fcampo("Fecha",item.fechaRegistro)}${fcampo("Hora",item.horaRegistro)}${fcampo("Técnico",item.tecnico)}${fcampo("Cuadrilla",item.cuadrilla)}${fcampo("Sede",item.sede)}${fcampo("Código",item.codigo)}${fcampo("Ticket",item.ticketFinal)}${fcampo("DNI cliente",item.dniCliente)}
        </div><div class="mv517c1-box"><b>Motivo técnico</b><br>${esc(item.motivoTecnico||"-")}</div></div>
        <div class="mv517c1-section"><h4>Resultado de Jefatura</h4><div class="mv517c1-grid">${fcampo("Estado / resultado",res)}${fcampo("Validado por",item.validadoPor)}${fcampo("Fecha validación",item.fechaValidacion)}${fcampo("Hora validación",item.horaValidacion)}${fcampo("Puntaje VTR/GAR",item.puntajeVtrGar)}</div><div class="mv517c1-box"><b>Comentario de validación</b><br>${esc(item.motivoValidacion||"-")}</div></div>
        <div class="mv517c1-footer"><button class="mv517c1-btn dark" id="mv517c1CerrarReg">Cerrar</button></div>`;
      bg.querySelector("#mv517c1CerrarReg").onclick=()=>bg.remove();
    }catch(e){ bg.querySelector(".mv517c1-modal").innerHTML=`<h3>📋 Registro técnico</h3><div class="mv517c1-alert">${esc(e.message)}</div><div class="mv517c1-footer"><button class="mv517c1-btn dark" onclick="this.closest('.mv517c1-modalbg').remove()">Cerrar</button></div>`; }
  };

  window.mv517c1Gestionar=function(kind,id,validacionId,noEstandar){
    if(!EST.data?.puedeValidar || !esValidador()) return;
    const bg=document.createElement("div"); bg.className="mv517c1-modalbg";
    const opciones=(EST.data.cuadrillas||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
    const tieneRegistro=!noEstandar&&!!txt(validacionId);
    bg.innerHTML=`<div class="mv517c1-modal"><h3>⚙ Gestionar caso · ${esc(id)}</h3><div class="mv517c1-note">Clasificación y Bono/No Bono se gestionan en un solo flujo. Deja una sección en “Sin cambios” si no corresponde modificarla.</div>
      <div class="mv517c1-section"><h4>1. Clasificación GAR/VTR</h4><label>Decisión</label><select id="mv517c1Decision"><option value="SIN_CAMBIO">Sin cambios</option><option value="CORRESPONDE">Confirmar GAR/VTR</option><option value="REASIGNAR">Reasignar responsable</option><option value="NO_ES_GAR_VTR">NO ES GAR/VTR</option><option value="ANULAR">Anular clasificación</option></select><div id="mv517c1CuadWrap" style="display:none"><label>Cuadrilla responsable</label><select id="mv517c1Cuad"><option value="">Seleccione...</option>${opciones}</select></div><label>Comentario / sustento</label><textarea id="mv517c1ComClas" placeholder="Detalle de la decisión"></textarea><div id="mv517c1NoGar" class="mv517c1-alert" style="display:none">NO ES GAR/VTR no recupera Producción todavía. Esa conexión se realizará en una etapa posterior y controlada.</div></div>
      ${tieneRegistro?`<div class="mv517c1-section"><h4>2. Validación del registro técnico</h4><label>Resultado</label><select id="mv517c1Bono"><option value="SIN_CAMBIO">Sin cambios</option><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option></select><div id="mv517c1PuntWrap" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv517c1Punt" type="number" min="0" step="0.1"></div><label>Comentario de Jefatura</label><textarea id="mv517c1ComBono" placeholder="Motivo de Bono / No Bono"></textarea></div>`:`<div class="mv517c1-note">Este caso no tiene registro técnico asociado; Bono / No Bono no está habilitado.</div>`}
      <div class="mv517c1-footer"><button class="mv517c1-btn" id="mv517c1Guardar">Guardar cambios</button><button class="mv517c1-btn dark" id="mv517c1Cancelar">Cancelar</button></div></div>`;
    document.body.appendChild(bg);
    const dec=bg.querySelector("#mv517c1Decision"), bono=bg.querySelector("#mv517c1Bono");
    function sync(){ bg.querySelector("#mv517c1CuadWrap").style.display=dec.value==="REASIGNAR"?"block":"none"; bg.querySelector("#mv517c1NoGar").style.display=dec.value==="NO_ES_GAR_VTR"?"block":"none"; if(bono)bg.querySelector("#mv517c1PuntWrap").style.display=bono.value==="BONO"?"block":"none"; }
    dec.onchange=sync; if(bono)bono.onchange=sync; sync(); bg.querySelector("#mv517c1Cancelar").onclick=()=>bg.remove();
    bg.querySelector("#mv517c1Guardar").onclick=async function(){
      const decision=dec.value, resultado=bono?bono.value:"SIN_CAMBIO";
      if(decision==="SIN_CAMBIO"&&resultado==="SIN_CAMBIO"){alert("No has seleccionado cambios.");return;}
      const comentarioClas=txt(bg.querySelector("#mv517c1ComClas").value), cuad=txt(bg.querySelector("#mv517c1Cuad")?.value);
      if(decision==="REASIGNAR"&&!cuad){alert("Seleccione la cuadrilla responsable.");return;}
      if((decision==="ANULAR"||decision==="NO_ES_GAR_VTR")&&!comentarioClas){alert("Ingrese el motivo de la clasificación.");return;}
      const comentarioBono=txt(bg.querySelector("#mv517c1ComBono")?.value); let puntaje=0;
      if(resultado!=="SIN_CAMBIO"){
        if(!comentarioBono){alert("Ingrese el comentario de Bono / No Bono.");return;}
        if(resultado==="BONO"){puntaje=Number(bg.querySelector("#mv517c1Punt")?.value);if(!isFinite(puntaje)||puntaje<=0){alert("Ingrese un puntaje mayor a 0.");return;}}
      }
      const btn=bg.querySelector("#mv517c1Guardar"); btn.disabled=true; btn.textContent="Guardando...";
      try{
        if(decision!=="SIN_CAMBIO"){
          const p={accion:"clasificarVtrGarV517A",usuario:usuario(),periodo:EST.data.periodo,decision:decision,observacion:comentarioClas}; if(kind==="TICKET")p.ticket=id;else p.clave=id;if(cuad)p.cuadrillaResponsable=cuad; await apiPost(p);
        }
        if(resultado!=="SIN_CAMBIO") await apiPost({accion:"validarBonoVtrGarV515",usuario:usuario(),id:validacionId,resultado:resultado,puntajeVtrGar:puntaje,motivo:comentarioBono});
        EST.detalleRegistros=null; EST.detalleTs=0; bg.remove(); await cargar(EST.data.periodo);
      }catch(e){btn.disabled=false;btn.textContent="Guardar cambios";alert(e.message);}
    };
  };

  /* ===================== TECNICO: REGISTRO SIN ORIGEN ===================== */
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
  console.log("MI VISUAL V517C.1: gestión GAR/VTR consolidada limpia activa.");
})();
