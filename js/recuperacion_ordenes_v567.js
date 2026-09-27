/* ============================================================
   MI VISUAL V567 - RECUPERACION DE ORDENES / FASE 1
   SOLO LECTURA
============================================================ */
(function(){
  "use strict";

  const API = window.MI_VISUAL_API_URL || "";
  const LIMITE = 250;

  function esc(v){
    return (v==null?"":String(v)).replace(/[&<>"]/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];
    });
  }
  function norm(v){ return (v==null?"":String(v)).trim(); }
  function usuario(){ return localStorage.getItem("usuario")||""; }
  function perfil(){ return norm(localStorage.getItem("perfil")).toUpperCase(); }
  function sede(){ return norm(localStorage.getItem("sede")).toUpperCase(); }

  async function apiLectura(params){
    if(!API) throw new Error("API de MI VISUAL no disponible");
    const url=new URL(API);
    Object.keys(params||{}).forEach(function(k){
      const v=params[k];
      if(v!==undefined&&v!==null&&v!=="") url.searchParams.set(k,String(v));
    });
    const controlador=new AbortController();
    const timer=setTimeout(function(){controlador.abort();},18000);
    try{
      const r=await fetch(url.toString(),{method:"GET",cache:"no-store",signal:controlador.signal});
      const t=await r.text();
      let d;
      try{d=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del servidor");}
      if(!d.ok) throw new Error(d.error||"No se pudo consultar Recuperación de Órdenes");
      return d;
    }catch(e){
      if(e&&e.name==="AbortError") throw new Error("La consulta tardó demasiado. Intente nuevamente.");
      throw e;
    }finally{clearTimeout(timer);}
  }

  function hoyIso(){
    const d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function hace30DiasIso(){
    const d=new Date();
    d.setDate(d.getDate()-30);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }

  function puedeElegirSede(){
    return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES","JEFATURA DE OPERACIONES","OPERACIONES"].includes(perfil());
  }

  function tarjeta(x){
    const clase=x.clasificacion==="REPROGRAMADO"?"mv567-repro":"mv567-cancel";
    const icono=x.tipoOrden==="INSTALACION"?"🛠️":"🔧";
    const tel=x.telefono
      ? '<a class="mv567-tel" href="tel:'+esc(x.telefono)+'">📞 '+esc(x.telefono)+'</a>'
      : '<span class="mv567-sin">Sin teléfono registrado</span>';
    return '<article class="mv567-card '+clase+'">'+
      '<div class="mv567-top"><span class="mv567-tipo">'+icono+' '+esc(x.tipoOrden)+'</span><span class="mv567-badge">'+esc(x.clasificacion)+'</span></div>'+
      '<h3>'+esc(x.cliente||"Cliente sin nombre")+'</h3>'+
      '<div class="mv567-row">'+tel+'</div>'+
      '<div class="mv567-dir">📍 '+esc(x.direccion||"Dirección no registrada")+'</div>'+
      '<div class="mv567-motivo"><b>Motivo:</b> '+esc(x.motivo||"")+'</div>'+
      '<div class="mv567-fecha">'+esc(x.fechaSolicitud||"")+(x.horaSolicitud?' · '+esc(x.horaSolicitud):'')+'</div>'+
      '</article>';
  }

  async function cargar(){
    const msg=document.getElementById("mv567Msg");
    const lista=document.getElementById("mv567Lista");
    if(!msg||!lista)return;
    msg.textContent="Consultando órdenes recuperables...";
    lista.innerHTML="";

    const params={
      accion:"listarRecuperacionOrdenesV567",
      usuario:usuario(),
      tipo:document.getElementById("mv567Tipo")?.value||"",
      estadoRecuperacion:document.getElementById("mv567Estado")?.value||"",
      desde:document.getElementById("mv567Desde")?.value||"",
      hasta:document.getElementById("mv567Hasta")?.value||"",
      limite:LIMITE
    };
    if(puedeElegirSede()) params.sede=document.getElementById("mv567Sede")?.value||"";

    try{
      const d=await apiLectura(params);
      msg.textContent=d.totalCoincidencias
        ? (d.totalCoincidencias+" órdenes recuperables"+(d.truncado?" · mostrando "+d.registros:""))
        : "No hay órdenes recuperables con estos filtros.";
      lista.innerHTML=(d.ordenes||[]).map(tarjeta).join("");
    }catch(e){
      msg.textContent="❌ "+(e.message||e);
    }
  }

  function mostrarRecuperacionOrdenes(){
    if(typeof limpiarPantalla==="function") limpiarPantalla();
    if(typeof setBotonNavegacion==="function") setBotonNavegacion("modulo");
    const menu=document.getElementById("menuPrincipal");
    if(menu) menu.style.setProperty("display","none","important");
    const p=document.getElementById("pantalla");
    if(!p)return;

    const selectorSede=puedeElegirSede()
      ? '<label>Sede<select id="mv567Sede"><option value="">Todas / según acceso</option><option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option></select></label>'
      : '<div class="mv567-sede-fija">🏢 '+esc(sede())+'</div>';

    p.innerHTML='<style>'+
      '.mv567-wrap{max-width:900px;margin:18px auto;padding:0 12px 28px;color:#0f172a}.mv567-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.mv567-head h2{margin:0;font-size:22px}.mv567-filtros{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:8px;background:#fff;padding:12px;border-radius:16px;margin:12px 0;box-shadow:0 8px 24px rgba(15,23,42,.10)}.mv567-filtros label{font-size:11px;font-weight:800;color:#475569;display:flex;flex-direction:column;gap:4px}.mv567-filtros select,.mv567-filtros input{min-height:38px;border:1px solid #cbd5e1;border-radius:9px;padding:7px;background:#fff}.mv567-btn{border:0;border-radius:10px;background:#f97316;color:#fff;font-weight:900;padding:10px 14px;cursor:pointer;align-self:end}.mv567-sede-fija{display:flex;align-items:center;font-weight:900;padding:8px 10px;background:#fff7ed;border-radius:10px}.mv567-msg{font-size:13px;font-weight:800;margin:10px 2px}.mv567-lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mv567-card{background:#fff;border-radius:16px;padding:14px;box-shadow:0 8px 22px rgba(15,23,42,.10);border-left:5px solid #f97316}.mv567-repro{border-left-color:#2563eb}.mv567-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.mv567-tipo{font-weight:900;font-size:12px}.mv567-badge{font-size:10px;font-weight:900;background:#ffedd5;color:#9a3412;border-radius:999px;padding:5px 8px}.mv567-repro .mv567-badge{background:#dbeafe;color:#1d4ed8}.mv567-card h3{font-size:16px;margin:10px 0 8px}.mv567-tel{display:inline-block;color:#0f766e;font-weight:900;text-decoration:none}.mv567-dir,.mv567-motivo{font-size:12px;line-height:1.4;margin-top:7px}.mv567-fecha{margin-top:8px;font-size:11px;color:#64748b}.mv567-sin{font-size:12px;color:#94a3b8}.mv567-aviso{font-size:11px;color:#64748b;margin-top:4px}@media(max-width:700px){.mv567-filtros{grid-template-columns:1fr 1fr}.mv567-lista{grid-template-columns:1fr}}'+
      '</style>'+
      '<div class="mv567-wrap">'+
        '<div class="mv567-head"><div><h2>🟧 Recuperación de Órdenes</h2><div class="mv567-aviso">Fase 1 · solo lectura · no modifica Mapa Operativo ni cambia tramos.</div></div>'+selectorSede+'</div>'+
        '<div class="mv567-filtros">'+
          '<label>Estado<select id="mv567Estado"><option value="">Todos</option><option value="CANCELADO">Cancelados</option><option value="REPROGRAMADO">Reprogramados</option></select></label>'+
          '<label>Tipo<select id="mv567Tipo"><option value="">Todos</option><option value="INSTALACION">Instalación</option><option value="VISITA TECNICA">Visita Técnica</option></select></label>'+
          '<label>Desde<input id="mv567Desde" type="date" value="'+hace30DiasIso()+'"></label>'+
          '<label>Hasta<input id="mv567Hasta" type="date" value="'+hoyIso()+'"></label>'+
          '<button class="mv567-btn" type="button" onclick="mv567CargarRecuperacion()">Consultar</button>'+
        '</div>'+
        '<div id="mv567Msg" class="mv567-msg">Listo para consultar.</div>'+
        '<div id="mv567Lista" class="mv567-lista"></div>'+
      '</div>';
    cargar();
  }

  window.mostrarRecuperacionOrdenes=mostrarRecuperacionOrdenes;
  window.mv567CargarRecuperacion=cargar;
})();