/* ============================================================
   MI VISUAL V513 - PARTIDAS WIN / REGLAS / BUSCADOR

   - Reemplaza visualmente V505 al abrir Partidas.
   - Carga liviana: no ejecuta previsualizacion mensual pesada.
   - Pendientes clasificados por confianza.
   - Validacion por lote con UNA sola publicacion por periodo.
   - Busqueda por OrdenId, Codigo cliente/pedido o DNI.
   - Edicion auditada de Partida efectiva y Cuadrilla efectiva.
   - Partner es evidencia auxiliar; WIN original se conserva.
   - SLA usa la partida efectiva y PARAMETROS_SLA_WIN vigente.
============================================================ */
(function(){
  "use strict";

  if(window.MV513_PARTIDAS_WIN_OK) return;
  window.MV513_PARTIDAS_WIN_OK = true;

  const VERSION="V513-PARTIDAS-20260827";
  const estado={periodo:"",tab:"pendientes",cargando:false,error:"",data:null,filtro:"",seleccion:new Set(),busqueda:"",resultados:[],seleccionada:null,guardando:false};

  const norm=v=>String(v==null?"":v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const fmt=v=>{const n=Number(v)||0;return Number.isInteger(n)?String(n):n.toFixed(1);};
  const usuario=()=>localStorage.getItem("usuario")||localStorage.getItem("correo")||"";
  const apiBase=()=>window.MI_VISUAL_API_URL||(typeof window.MV58_API!=="undefined"?window.MV58_API:"");

  function esJefatura(){
    const p=norm(localStorage.getItem("perfil"));
    return p==="JEFATURA"||p==="JEFATURA GENERAL"||p==="ADMINISTRADOR"||p==="ADMIN";
  }
  function periodoActual(){
    try{
      const x=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
      const y=x.find(a=>a.type==="year")?.value||"",m=x.find(a=>a.type==="month")?.value||"";
      return y&&m?`${y}-${m}`:"";
    }catch(_){return "";}
  }
  async function apiPost(payload){
    const base=apiBase();
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(base,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},body:JSON.stringify(payload),cache:"no-store",redirect:"follow"});
    const t=(await r.text()).trim(); let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio una respuesta valida para Partidas V513.");}
    if(!j||j.ok===false) throw new Error(j&&j.error?j.error:"No se pudo completar la operacion V513.");
    return j;
  }

  function cerrar(){document.getElementById("mv505PartidasModal")?.remove();estado.seleccion.clear();}
  window.mv505CerrarPartidas=cerrar;

  function colorEstado(e){
    e=norm(e);
    if(e==="CANDIDATA_ALTA") return ["#dcfce7","#166534","#86efac","🟢 Candidata alta"];
    if(e==="OBSERVACION") return ["#fef3c7","#92400e","#fcd34d","🟡 Observación"];
    if(e==="AMBIGUA") return ["#fee2e2","#991b1b","#fca5a5","🔴 Ambigua"];
    if(e==="REVISAR_CON_PARTNER") return ["#eff6ff","#1e40af","#93c5fd","🔎 Revisar con Partner"];
    return ["#f1f5f9","#475569","#cbd5e1",esc(e||"Pendiente")];
  }

  function listaPendientes(){
    const l=Array.isArray(estado.data?.pendientes)?estado.data.pendientes:[];
    const q=norm(estado.filtro);
    if(!q) return l;
    return l.filter(x=>norm([x.ordenId,x.codigoCliente,x.dni,x.cliente,x.cuadrillaWin,x.sede,x.direccion,x.predioPatron,x.partidaWin,x.partidaPartner,x.estadoDryRun].join(" ")).includes(q));
  }

  function cardPendiente(x){
    const c=colorEstado(x.estadoDryRun),id=esc(x.ordenId),prop=esc(x.partidaPropuesta||x.partidaPartner||"");
    const delta=(Number(x.puntosPropuesta)||0)-(Number(x.puntosWin)||0);
    const seleccionable=norm(x.estadoDryRun)==="CANDIDATA_ALTA"&&prop;
    return `<article style="background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:12px;box-shadow:0 3px 11px rgba(15,23,42,.07)">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <div style="font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase">Orden WIN</div>
          <div style="font-size:17px;font-weight:950;color:#0f172a">${id}</div>
          <div style="font-size:10px;color:#64748b">${esc(x.fecha||"")} · ${esc(x.sede||"")}</div>
        </div>
        <span style="background:${c[0]};color:${c[1]};border:1px solid ${c[2]};padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900">${c[3]}</span>
      </div>
      ${seleccionable?`<label style="display:flex;align-items:center;gap:7px;margin-top:9px;padding:7px 9px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;font-size:11px;font-weight:900;color:#166534;cursor:pointer"><input type="checkbox" data-mv513-select="${id}" ${estado.seleccion.has(String(x.ordenId))?"checked":""} style="width:18px;height:18px"> Seleccionar para lote</label>`:""}
      <div style="margin-top:9px;padding:9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <div style="font-size:11px;font-weight:900;color:#334155">${esc(x.cuadrillaWin||"")}</div>
        <div style="font-size:10px;color:#475569;margin-top:3px"><b>Predio/patrón:</b> ${esc(x.predioPatron||"Sin patrón repetido")}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;line-height:1.35"><b>Dirección:</b> ${esc(x.direccion||"-")}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:9px">
        <div style="padding:8px;border-radius:9px;background:#eff6ff;border:1px solid #bfdbfe"><div style="font-size:8px;font-weight:900;color:#1d4ed8">WIN</div><div style="font-size:18px;font-weight:950;color:#1e3a8a">${esc(x.partidaWin||"-")}</div><div style="font-size:10px">${fmt(x.puntosWin)} pts</div></div>
        <div style="padding:8px;border-radius:9px;background:#fff7ed;border:1px solid #fed7aa"><div style="font-size:8px;font-weight:900;color:#9a3412">PARTNER</div><div style="font-size:18px;font-weight:950;color:#9a3412">${esc(x.partidaPartner||"-")}</div><div style="font-size:10px">${fmt(x.puntosPartner)} pts</div></div>
        <div style="padding:8px;border-radius:9px;background:#f0fdf4;border:1px solid #bbf7d0"><div style="font-size:8px;font-weight:900;color:#166534">V513 PROPONE</div><div style="font-size:18px;font-weight:950;color:#166534">${prop||"-"}</div><div style="font-size:10px">${delta>=0?"+":""}${fmt(delta)} pts</div></div>
      </div>
      <div style="font-size:10px;color:#475569;margin-top:8px"><b>Soporte:</b> ${Number(x.soporteHistorico)||0} caso(s) · <b>Pureza:</b> ${Math.round((Number(x.pureza)||0)*100)}%</div>
      <div style="font-size:10px;color:#64748b;margin-top:4px;line-height:1.35">${esc(x.observacion||x.motivo||"")}</div>
      <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">
        ${prop?`<button type="button" onclick="mv513ValidarIndividual('${id}','${prop}')" style="flex:1;min-width:150px;border:0;border-radius:9px;padding:9px;background:#16a34a;color:#fff;font-weight:900;cursor:pointer">✅ Validar ${prop}</button>`:""}
        <button type="button" onclick="mv513AbrirOrden('${id}')" style="flex:1;min-width:150px;border:0;border-radius:9px;padding:9px;background:#334155;color:#fff;font-weight:900;cursor:pointer">🔎 Revisar / editar</button>
      </div>
    </article>`;
  }

  function toolbarLote(lista){
    const ids=lista.filter(x=>norm(x.estadoDryRun)==="CANDIDATA_ALTA"&&x.partidaPropuesta).map(x=>String(x.ordenId));
    if(!ids.length) return "";
    const todos=ids.every(id=>estado.seleccion.has(id));
    return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:10px">
      <label style="display:flex;gap:6px;align-items:center;font-size:11px;font-weight:900;color:#334155;cursor:pointer"><input type="checkbox" data-mv513-todos ${todos?"checked":""} style="width:18px;height:18px"> Todas candidatas altas visibles</label>
      <button type="button" onclick="mv513LimpiarSeleccion()" style="border:0;border-radius:8px;padding:8px 10px;background:#64748b;color:#fff;font-weight:900">Limpiar</button>
      <button type="button" onclick="mv513ValidarLote()" ${estado.seleccion.size?"":"disabled"} style="border:0;border-radius:8px;padding:8px 11px;background:#16a34a;color:#fff;font-weight:900;opacity:${estado.seleccion.size?1:.5}">✅ Validar lote (${estado.seleccion.size})</button>
      <span style="margin-left:auto;font-size:10px;color:#64748b">Una sola publicación al finalizar</span>
    </div>`;
  }

  function renderPendientes(){
    const d=estado.data||{},lista=listaPendientes();
    const r=d.resumen||{};
    return `
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-bottom:9px">
        ${[["Pendientes",r.pendientes,"#fff7ed","#9a3412"],["Alta",r.candidatasAltas,"#f0fdf4","#166534"],["Observar",r.observacion,"#fffbeb","#92400e"],["Ambigua",r.ambiguas,"#fef2f2","#991b1b"],["Partner",r.revisarPartner,"#eff6ff","#1e40af"]].map(a=>`<div style="padding:8px;border-radius:10px;background:${a[2]};color:${a[3]};border:1px solid #e2e8f0"><div style="font-size:8px;font-weight:900;text-transform:uppercase">${a[0]}</div><div style="font-size:20px;font-weight:950">${Number(a[1])||0}</div></div>`).join("")}
      </div>
      <div style="padding:9px 10px;margin-bottom:9px;border-radius:10px;background:#eff6ff;border:1px solid #93c5fd;color:#1e3a8a;font-size:10px;line-height:1.4"><b>V513:</b> WIN conserva el registro original. Las reglas y Partner solo sustentan propuestas; ninguna diferencia se aplica sin validación.</div>
      <input data-mv513-filtro type="search" value="${esc(estado.filtro)}" placeholder="Buscar orden, DNI, código cliente, cuadrilla o predio..." style="width:100%;box-sizing:border-box;border:1px solid #94a3b8;border-radius:9px;padding:9px 10px;margin-bottom:9px;font-weight:700">
      ${toolbarLote(lista)}
      ${lista.length?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:9px">${lista.map(cardPendiente).join("")}</div>`:`<div style="padding:24px;text-align:center;background:#f8fafc;border:1px dashed #94a3b8;border-radius:12px;color:#475569">✅ No hay pendientes con este filtro.</div>`}`;
  }

  function renderBusqueda(){
    const resultados=estado.resultados||[];
    return `<div style="background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:11px">
      <div style="font-size:12px;font-weight:950;color:#0f172a;margin-bottom:7px">🔎 Buscar / editar orden</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap"><input data-mv513-busqueda type="search" value="${esc(estado.busqueda)}" placeholder="OrderId, código cliente/pedido o DNI" style="flex:1;min-width:220px;border:1px solid #94a3b8;border-radius:9px;padding:9px 10px;font-weight:700"><button type="button" onclick="mv513BuscarOrden()" style="border:0;border-radius:9px;padding:9px 13px;background:#2563eb;color:#fff;font-weight:900">Buscar</button></div>
      <div style="font-size:9px;color:#64748b;margin-top:6px">La edición no altera MAPA_ORDENES. Se registra como ajuste validado con historial.</div>
    </div>
    <div style="margin-top:9px">${resultados.length?resultados.map(x=>`<button type="button" onclick="mv513SeleccionarResultado('${esc(x.ordenId)}')" style="width:100%;text-align:left;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:10px;margin-bottom:6px;cursor:pointer"><b>${esc(x.ordenId)}</b> · ${esc(x.fecha||"")} · ${esc(x.estado||"")}<br><span style="font-size:10px;color:#475569">${esc(x.cliente||"")} · DNI ${esc(x.dni||"-")} · ${esc(x.codigoCliente||"-")}</span><br><span style="font-size:10px;color:#64748b">${esc(x.cuadrillaWin||"")}</span></button>`).join(""):estado.busqueda?`<div style="padding:18px;text-align:center;color:#64748b">Sin resultados.</div>`:""}</div>
    ${estado.seleccionada?renderEditor(estado.seleccionada):""}`;
  }

  function renderEditor(x){
    const cat=Array.isArray(estado.data?.catalogo)?estado.data.catalogo:[];
    const crews=Array.isArray(estado.data?.cuadrillas)?estado.data.cuadrillas:[];
    const partidaActual=x.ajustePartida?.partidaPropuesta||x.partidaWin||"";
    const cuadrillaActual=x.ajusteCuadrilla?.cuadrillaEfectiva||x.cuadrillaWin||"";
    return `<div style="margin-top:10px;background:#fff;border:2px solid #93c5fd;border-radius:13px;padding:11px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-size:9px;color:#64748b;font-weight:900">ORDEN SELECCIONADA</div><div style="font-size:19px;font-weight:950">${esc(x.ordenId)}</div></div><span style="padding:5px 8px;border-radius:999px;background:#f1f5f9;font-size:10px;font-weight:900">${esc(x.estado||"")}</span></div>
      <div style="margin-top:8px;padding:9px;background:#f8fafc;border-radius:9px;font-size:10px;line-height:1.45"><b>Cliente:</b> ${esc(x.cliente||"-")} · <b>DNI:</b> ${esc(x.dni||"-")} · <b>Código:</b> ${esc(x.codigoCliente||"-")}<br><b>WIN:</b> ${esc(x.tipoWin||"-")} · ${esc(x.motivoFinalizacion||"-")}<br><b>Dirección:</b> ${esc(x.direccion||"-")}<br><b>Partner:</b> ${esc(x.partidaPartner||"Sin referencia")} · ${esc(x.cuadrillaPartner||"-")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px">
        <div><label style="font-size:10px;font-weight:900;color:#334155">Partida efectiva</label><select data-mv513-partida style="width:100%;margin-top:4px;border:1px solid #94a3b8;border-radius:8px;padding:9px">${cat.map(c=>`<option value="${esc(c.codigo)}" ${norm(c.codigo)===norm(partidaActual)?"selected":""}>${esc(c.codigo)} · ${esc(c.tipoOrden||c.descripcion||"")} · ${fmt(c.puntaje)} pts</option>`).join("")}</select></div>
        <div><label style="font-size:10px;font-weight:900;color:#334155">Cuadrilla efectiva</label><select data-mv513-cuadrilla style="width:100%;margin-top:4px;border:1px solid #94a3b8;border-radius:8px;padding:9px"><option value="${esc(cuadrillaActual)}">${esc(cuadrillaActual)}</option>${crews.filter(c=>norm(c)!==norm(cuadrillaActual)).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></div>
      </div>
      <label style="display:block;font-size:10px;font-weight:900;color:#334155;margin-top:9px">Motivo / sustento obligatorio</label><textarea data-mv513-motivo rows="3" placeholder="Ej.: validado con dirección, evidencia de campo o Base Partner..." style="width:100%;box-sizing:border-box;margin-top:4px;border:1px solid #94a3b8;border-radius:8px;padding:9px;resize:vertical"></textarea>
      <div style="display:flex;gap:7px;margin-top:8px;flex-wrap:wrap"><button type="button" onclick="mv513GuardarPartida()" style="flex:1;min-width:160px;border:0;border-radius:9px;padding:9px;background:#16a34a;color:#fff;font-weight:900">🎯 Guardar Partida</button><button type="button" onclick="mv513GuardarCuadrilla()" style="flex:1;min-width:160px;border:0;border-radius:9px;padding:9px;background:#7c3aed;color:#fff;font-weight:900">👷 Guardar Cuadrilla</button></div>
      <div style="font-size:9px;color:#64748b;margin-top:7px">Partida puede afectar Producción/Valorizada y el tipo SLA aplicable. Cuadrilla efectiva afecta Producción/Efectividad/Recableado/SLA; no reasigna automáticamente responsabilidad VTR/GAR.</div>
    </div>`;
  }

  function renderReglas(){
    const reglas=Array.isArray(estado.data?.reglas)?estado.data.reglas:[];
    return `<div style="padding:9px 10px;margin-bottom:9px;border-radius:10px;background:#f8fafc;border:1px solid #cbd5e1;font-size:10px;color:#475569">Matriz aprendida de WIN ↔ Partner y validaciones operativas. Las reglas nuevas permanecen auditables; una dirección ambigua no se convierte en automática.</div>
    <div style="display:grid;gap:7px">${reglas.map(r=>{const c=colorEstado(r.estado==="CANDIDATA"?"CANDIDATA_ALTA":r.estado);return `<div style="background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:9px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${esc(r.idRegla||"")} · ${esc(r.codigoPartida||"-")}</b><span style="font-size:9px;font-weight:900;color:${c[1]}">${esc(r.estado||"")}</span></div><div style="font-size:10px;color:#475569;margin-top:4px">${esc(r.tipoTrabaWin||"")} ${r.motivoFinalizacionWin?"· "+esc(r.motivoFinalizacionWin):""} ${r.tipoServicioWin?"· "+esc(r.tipoServicioWin):""}</div>${r.patronDireccion?`<div style="font-size:10px;color:#1e40af;margin-top:3px"><b>Dirección:</b> ${esc(r.patronDireccion)} ${r.patronReferencia?"· "+esc(r.patronReferencia):""}</div>`:""}<div style="font-size:9px;color:#64748b;margin-top:3px">Soporte ${Number(r.soporteHistorico)||0} · Pureza ${Math.round((Number(r.pureza)||0)*100)}% · ${esc(r.observacion||"")}</div></div>`;}).join("")}</div>`;
  }

  function render(){
    const modal=document.getElementById("mv505PartidasModal"); if(!modal) return;
    const body=modal.querySelector("[data-mv513-body]"); if(!body) return;
    if(estado.cargando){body.innerHTML=`<div style="padding:28px;text-align:center;color:#334155">⏳ Cargando Partidas V513...</div>`;return;}
    if(estado.error){body.innerHTML=`<div style="padding:12px;border-radius:10px;background:#fee2e2;border:1px solid #ef4444;color:#991b1b;font-weight:800">${esc(estado.error)}</div>`;return;}
    body.innerHTML=estado.tab==="buscar"?renderBusqueda():estado.tab==="reglas"?renderReglas():renderPendientes();
  }

  async function cargar(){
    estado.cargando=true;estado.error="";render();
    try{estado.data=await apiPost({accion:"listarPartidasV513",usuario:usuario(),periodo:estado.periodo});}
    catch(e){estado.error=e?.message||String(e);}finally{estado.cargando=false;render();}
  }

  function abrir(){
    if(!esJefatura()){alert("Partidas esta disponible para Jefatura / Administración autorizada.");return;}
    cerrar();estado.periodo=estado.periodo||periodoActual();estado.tab="pendientes";estado.filtro="";estado.busqueda="";estado.resultados=[];estado.seleccionada=null;
    const modal=document.createElement("div");modal.id="mv505PartidasModal";modal.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,.75);padding:10px;overflow:auto;display:flex;align-items:flex-start;justify-content:center";
    modal.innerHTML=`<div style="width:min(1050px,100%);margin:10px auto;background:#eef2f7;border-radius:17px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;color:#0f172a"><div style="position:sticky;top:0;z-index:5;background:#0f2743;color:#fff;padding:12px 13px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><div><div style="font-size:18px;font-weight:950">🎯 Partidas WIN · V513</div><div style="font-size:9px;color:#bfdbfe">Reglas + lote + buscador + ajustes auditados</div></div><div style="display:flex;gap:6px;align-items:center"><input type="month" min="2026-08" value="${esc(estado.periodo)}" data-mv513-periodo style="border:0;border-radius:7px;padding:7px;font-weight:800"><button type="button" onclick="mv513Recargar()" style="border:0;border-radius:7px;padding:8px;background:#2563eb;color:#fff;font-weight:900">↻</button><button type="button" onclick="mv505CerrarPartidas()" style="border:0;border-radius:7px;padding:8px;background:#475569;color:#fff;font-weight:900">✕</button></div></div><div style="display:flex;gap:6px;margin-top:9px;overflow:auto"><button data-mv513-tab="pendientes" class="mv513tab" style="border:0;border-radius:8px;padding:8px 10px;background:#fff;color:#0f2743;font-weight:900;white-space:nowrap">Pendientes / Lote</button><button data-mv513-tab="buscar" class="mv513tab" style="border:0;border-radius:8px;padding:8px 10px;background:#1e3a5f;color:#fff;font-weight:900;white-space:nowrap">🔎 Buscar / Editar</button><button data-mv513-tab="reglas" class="mv513tab" style="border:0;border-radius:8px;padding:8px 10px;background:#1e3a5f;color:#fff;font-weight:900;white-space:nowrap">🧠 Reglas</button></div></div><div data-mv513-body style="padding:11px"></div><div style="padding:8px 11px;border-top:1px solid #cbd5e1;background:#fff;color:#64748b;font-size:9px">${VERSION} · WIN original conservado · Partner auxiliar · SLA paramétrico</div></div>`;
    document.body.appendChild(modal);cargar();
  }

  window.mv505AbrirPartidas=abrir;
  window.mv513Recargar=cargar;
  window.mv505RecargarPartidas=cargar;

  document.addEventListener("click",e=>{
    const tab=e.target.closest?.("[data-mv513-tab]");
    if(tab){estado.tab=tab.getAttribute("data-mv513-tab")||"pendientes";document.querySelectorAll(".mv513tab").forEach(b=>{const on=b===tab;b.style.background=on?"#fff":"#1e3a5f";b.style.color=on?"#0f2743":"#fff";});render();return;}
  },true);
  document.addEventListener("input",e=>{
    if(e.target.matches?.("[data-mv513-filtro]")){estado.filtro=e.target.value||"";render();}
    if(e.target.matches?.("[data-mv513-busqueda]")) estado.busqueda=e.target.value||"";
  },true);
  document.addEventListener("change",e=>{
    if(e.target.matches?.("[data-mv513-periodo]")){const v=e.target.value||"";if(/^\d{4}-\d{2}$/.test(v)){estado.periodo=v;estado.seleccion.clear();cargar();}}
    const c=e.target.closest?.("[data-mv513-select]");if(c){const id=String(c.getAttribute("data-mv513-select")||"");c.checked?estado.seleccion.add(id):estado.seleccion.delete(id);render();}
    if(e.target.matches?.("[data-mv513-todos]")){const visibles=listaPendientes().filter(x=>norm(x.estadoDryRun)==="CANDIDATA_ALTA"&&x.partidaPropuesta).map(x=>String(x.ordenId));visibles.forEach(id=>e.target.checked?estado.seleccion.add(id):estado.seleccion.delete(id));render();}
  },true);

  window.mv513LimpiarSeleccion=()=>{estado.seleccion.clear();render();};

  window.mv513ValidarIndividual=async function(id,prop){
    const x=(estado.data?.pendientes||[]).find(o=>String(o.ordenId)===String(id));if(!x)return;
    const motivo=prompt(`Orden ${id}\n${x.partidaWin||"-"} → ${prop}\n\nIndique motivo/sustento de validación:`,x.observacion||"Validado con regla V513 y referencia Partner");
    if(motivo===null)return;if(!String(motivo).trim()){alert("El motivo es obligatorio.");return;}
    if(!confirm(`Aplicar ${prop} a la orden ${id}?\n\nSe conservará WIN original y se republicará ${estado.periodo}.`))return;
    try{const r=await apiPost({accion:"guardarAjustePartidaV513",usuario:usuario(),ordenId:id,partidaPropuesta:prop,motivo:String(motivo).trim(),origen:"PARTIDAS V513 / VALIDACION INDIVIDUAL"});alert(`✅ Partida validada\n\nOrden ${id}: ${r.partidaAnterior||x.partidaWin||"-"} → ${r.partidaNueva||prop}`);estado.seleccion.delete(String(id));await cargar();}
    catch(e){alert("No se pudo validar: "+(e?.message||String(e)));}
  };

  window.mv513ValidarLote=async function(){
    const items=(estado.data?.pendientes||[]).filter(x=>estado.seleccion.has(String(x.ordenId))&&norm(x.estadoDryRun)==="CANDIDATA_ALTA"&&x.partidaPropuesta).map(x=>({ordenId:String(x.ordenId),partidaPropuesta:String(x.partidaPropuesta)}));
    if(!items.length){alert("No hay candidatas altas seleccionadas.");return;}
    const motivo=prompt(`Se validarán ${items.length} orden(es) en un solo lote.\n\nIndique sustento común:`,`Regla V513 de alta confianza (3+ casos, 100% consistencia) validada por Jefatura`);if(motivo===null)return;if(!String(motivo).trim()){alert("El motivo es obligatorio.");return;}
    if(!confirm(`Validar ${items.length} orden(es)?\n\nSe registrarán todos los ajustes y se hará UNA sola publicación al final.`))return;
    try{const r=await apiPost({accion:"validarLotePartidasV513",usuario:usuario(),periodo:estado.periodo,items:items,motivo:String(motivo).trim(),origen:"PARTIDAS V513 / LOTE"});alert(`✅ Lote terminado\n\nAplicadas: ${r.aplicadas||0}\nOmitidas: ${r.omitidas||0}${r.publicacion?.produccion?.puntos!==undefined?`\nProducción publicada: ${r.publicacion.produccion.puntos} pts`:""}`);estado.seleccion.clear();await cargar();}
    catch(e){alert("No se pudo completar el lote: "+(e?.message||String(e)));}
  };

  window.mv513BuscarOrden=async function(){
    const input=document.querySelector("[data-mv513-busqueda]");estado.busqueda=(input?.value||estado.busqueda||"").trim();if(!estado.busqueda){alert("Ingresa OrderId, código cliente/pedido o DNI.");return;}
    try{const r=await apiPost({accion:"buscarOrdenPartidasV513",usuario:usuario(),periodo:estado.periodo,busqueda:estado.busqueda});estado.resultados=r.resultados||[];estado.seleccionada=null;render();}
    catch(e){alert("No se pudo buscar: "+(e?.message||String(e)));}
  };
  window.mv513SeleccionarResultado=function(id){estado.seleccionada=(estado.resultados||[]).find(x=>String(x.ordenId)===String(id))||null;render();setTimeout(()=>document.querySelector("[data-mv513-motivo]")?.scrollIntoView({behavior:"smooth",block:"center"}),50);};
  window.mv513AbrirOrden=async function(id){estado.tab="buscar";estado.busqueda=String(id);try{const r=await apiPost({accion:"buscarOrdenPartidasV513",usuario:usuario(),periodo:estado.periodo,busqueda:String(id)});estado.resultados=r.resultados||[];estado.seleccionada=estado.resultados.find(x=>String(x.ordenId)===String(id))||estado.resultados[0]||null;render();}catch(e){alert("No se pudo abrir la orden: "+(e?.message||String(e)));}};

  window.mv513GuardarPartida=async function(){
    const x=estado.seleccionada;if(!x)return;const p=document.querySelector("[data-mv513-partida]")?.value||"",m=(document.querySelector("[data-mv513-motivo]")?.value||"").trim();if(!p){alert("Selecciona una partida.");return;}if(!m){alert("El motivo/sustento es obligatorio.");return;}if(!confirm(`Orden ${x.ordenId}\n\nGuardar Partida efectiva: ${p}?`))return;
    try{const r=await apiPost({accion:"guardarAjustePartidaV513",usuario:usuario(),ordenId:x.ordenId,partidaPropuesta:p,motivo:m,origen:"PARTIDAS V513 / BUSCADOR MANUAL"});alert(`✅ Partida guardada\n${r.partidaAnterior||"-"} → ${r.partidaNueva||p}\n\nHistorial conservado.`);await window.mv513BuscarOrden();}
    catch(e){alert("No se pudo guardar Partida: "+(e?.message||String(e)));}
  };
  window.mv513GuardarCuadrilla=async function(){
    const x=estado.seleccionada;if(!x)return;const c=document.querySelector("[data-mv513-cuadrilla]")?.value||"",m=(document.querySelector("[data-mv513-motivo]")?.value||"").trim();if(!c){alert("Selecciona una cuadrilla.");return;}if(!m){alert("El motivo/sustento es obligatorio.");return;}if(!confirm(`Orden ${x.ordenId}\n\nCuadrilla WIN: ${x.cuadrillaWin||"-"}\nCuadrilla efectiva: ${c}\n\n¿Guardar ajuste?`))return;
    try{const r=await apiPost({accion:"guardarAjusteCuadrillaV513",usuario:usuario(),ordenId:x.ordenId,cuadrillaEfectiva:c,motivo:m,origen:"PARTIDAS V513 / BUSCADOR MANUAL"});alert(`✅ Cuadrilla efectiva guardada\n${r.cuadrillaAnterior||"-"} → ${r.cuadrillaNueva||c}\n\nVTR/GAR responsable no fue reasignado.`);await window.mv513BuscarOrden();}
    catch(e){alert("No se pudo guardar Cuadrilla: "+(e?.message||String(e)));}
  };
})();
