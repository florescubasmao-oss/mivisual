/* ============================================================
   MI VISUAL V577 - RECUPERACION / LIBERAR CON FEEDBACK
   Gestion segura.
============================================================ */
(function(){
  "use strict";

  const API = window.MI_VISUAL_API_URL || "";
  const LIMITE = 120;
  let modoActual="BUSCAR";
  function esTecnico(){ return perfil()==="TECNICO"; }

  function esc(v){
    return (v==null?"":String(v)).replace(/[&<>"]/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];
    });
  }
  function norm(v){ return (v==null?"":String(v)).trim(); }
  function usuario(){ return localStorage.getItem("usuario")||""; }
  function perfil(){ return norm(localStorage.getItem("perfil")).toUpperCase(); }
  function sede(){ return norm(localStorage.getItem("sede")).toUpperCase(); }

  async function apiGet(params){
    if(!API) throw new Error("API de MI VISUAL no disponible");

    async function intentarGet(){
      const url=new URL(API);
      Object.keys(params||{}).forEach(function(k){
        const v=params[k];
        if(v!==undefined&&v!==null&&v!=="") url.searchParams.set(k,String(v));
      });
      const ctrl=new AbortController();
      const timer=setTimeout(function(){ctrl.abort();},14000);
      try{
        const r=await fetch(url.toString(),{method:"GET",cache:"no-store",signal:ctrl.signal});
        const t=await r.text();
        let d;
        try{d=JSON.parse(t);}catch(_){throw new Error("RESPUESTA_NO_JSON");}
        if(!d.ok) throw new Error(d.error||"No se pudo consultar Recuperación de Órdenes");
        return d;
      }finally{clearTimeout(timer);}
    }

    try{
      return await intentarGet();
    }catch(e){
      // Respaldo seguro: si Apps Script devuelve HTML/no JSON o corta el GET,
      // repetir UNA sola vez por POST contra la misma función de solo lectura.
      const ctrl=new AbortController();
      const timer=setTimeout(function(){ctrl.abort();},14000);
      try{
        const r=await fetch(API,{
          method:"POST",
          headers:{"Content-Type":"text/plain;charset=utf-8"},
          body:JSON.stringify(params||{}),
          signal:ctrl.signal
        });
        const t=await r.text();
        let d;
        try{d=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del servidor");}
        if(!d.ok) throw new Error(d.error||"No se pudo consultar Recuperación de Órdenes");
        return d;
      }catch(err){
        if(err&&err.name==="AbortError") throw new Error("La consulta tardó demasiado. Intente nuevamente.");
        throw err;
      }finally{clearTimeout(timer);}
    }
  }

  async function apiPost(payload){
    if(!API) throw new Error("API de MI VISUAL no disponible");
    const ctrl=new AbortController();
    const timer=setTimeout(function(){ctrl.abort();},18000);
    try{
      const r=await fetch(API,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(payload||{}),
        signal:ctrl.signal
      });
      const t=await r.text();
      let d;
      try{d=JSON.parse(t);}catch(_){throw new Error("Respuesta no válida del servidor");}
      if(!d.ok) throw new Error(d.error||"No se pudo completar la gestión");
      return d;
    }catch(e){
      if(e&&e.name==="AbortError") throw new Error("La operación tardó demasiado. Actualice la lista antes de reintentar.");
      throw e;
    }finally{clearTimeout(timer);}
  }

  function hoyIso(){
    const d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }

  function hoyTexto(){
    const d=new Date();
    return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();
  }

  function puedeElegirSede(){
    return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES","JEFATURA DE OPERACIONES","OPERACIONES"].includes(perfil());
  }

  function puedeLiberar(){
    return ["SUPERVISOR","JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR","JEFATURA OPERACIONES","JEFATURA DE OPERACIONES","OPERACIONES"].includes(perfil());
  }

  function tarjeta(x){
    const clase=x.clasificacion==="REPROGRAMADO"?"mv568-repro":"mv568-cancel";
    const icono=x.tipoOrden==="INSTALACION"?"🛠️":"🔧";
    const tel=x.telefono
      ? '<a class="mv568-tel" href="tel:'+esc(x.telefono)+'">📞 '+esc(x.telefono)+'</a>'
      : '<span class="mv568-sin">Sin teléfono registrado</span>';

    let gestion='';
    if(x.estadoGestion==="EN GESTION"){
      if(x.gestionPropia){
        gestion='<div class="mv568-gestion propia">🟠 TU GESTIÓN</div>';
      }else{
        gestion='<div class="mv568-gestion ocupada">🔒 EN GESTIÓN</div>';
      }
    }else{
      gestion='<div class="mv568-gestion libre">🟢 LIBRE</div>';
    }

    let acciones='';
    if(x.estadoGestion!=="EN GESTION"){
      acciones='<button class="mv568-btn-tomar" data-orden="'+esc(x.ordenId)+'" type="button" onclick="mv568TomarOrden(\''+esc(x.ordenId)+'\',this)">PONER EN GESTIÓN</button>';
    }else if(puedeLiberar()){
      const quien=x.nombreGestion ? '<div class="mv568-quien">Gestiona: '+esc(x.nombreGestion)+'</div>' : '';
      acciones=quien+'<button class="mv568-btn-liberar" type="button" onclick="mv568LiberarOrden(\''+esc(x.ordenId)+'\',this)">LIBERAR GESTIÓN</button>';
    }

    return '<article class="mv568-card '+clase+'">'+
      '<div class="mv568-top"><span class="mv568-tipo">'+icono+' '+esc(x.tipoOrden)+'</span><span class="mv568-badge">'+esc(x.clasificacion)+'</span></div>'+
      '<h3>'+esc(x.cliente||"Cliente sin nombre")+'</h3>'+
      '<div class="mv568-codigo"><b>Código orden:</b> <span>'+esc(x.ordenId||"")+'</span></div>'+
      '<div class="mv568-codigo"><b>Código cliente:</b> <span>'+esc(x.codigoCliente||"NO DISPONIBLE")+'</span></div>'+
      '<div class="mv568-row">'+tel+'</div>'+
      '<div class="mv568-dir">📍 '+esc(x.direccion||"Dirección no registrada")+'</div>'+
      '<div class="mv568-motivo"><b>Motivo:</b> '+esc(x.motivo||"")+'</div>'+
      '<div class="mv568-fecha">'+esc(x.fechaSolicitud||"")+(x.horaSolicitud?' · '+esc(x.horaSolicitud):'')+'</div>'+
      gestion+
      '<div class="mv568-actions">'+acciones+'</div>'+
      '</article>';
  }

  async function cargar(){
    const msg=document.getElementById("mv568Msg");
    const lista=document.getElementById("mv568Lista");
    if(!msg||!lista)return;
    msg.textContent="Consultando órdenes recuperables...";
    lista.innerHTML="";

    const params={
      accion:"listarRecuperacionOrdenesV575",
      usuario:usuario(),
      tipo:document.getElementById("mv568Tipo")?.value||"",
      estadoRecuperacion:document.getElementById("mv568Estado")?.value||"",
      gestion:document.getElementById("mv568Gestion")?.value||"",
      fecha:esTecnico()?(document.getElementById("mv571Fecha")?.value||""):"",
      desde:esTecnico()?"":(document.getElementById("mv568Desde")?.value||hoyIso()),
      hasta:esTecnico()?"":(document.getElementById("mv568Hasta")?.value||hoyIso()),
      limite:LIMITE
    };
    if(puedeElegirSede()) params.sede=document.getElementById("mv568Sede")?.value||"";

    try{
      const d=await apiGet(params);
      const fechaConsultada=(d.desde&&d.desde===d.hasta)?(" · "+d.desde.split("-").reverse().join("/")):"";
      msg.textContent=d.totalCoincidencias
        ? (d.totalCoincidencias+" órdenes recuperables"+fechaConsultada+(d.truncado?" · mostrando "+d.registros:""))
        : ("No hay órdenes recuperables con estos filtros"+fechaConsultada+".");
      lista.innerHTML=(d.ordenes||[]).map(tarjeta).join("");
    }catch(e){
      msg.textContent="❌ "+(e.message||e);
    }
  }

  function activarModo(modo){
    modoActual=modo;
    const filtros=document.getElementById("mv568Filtros");
    const btnBuscar=document.getElementById("mv576TabBuscar");
    const btnGestion=document.getElementById("mv576TabGestion");

    if(btnBuscar) btnBuscar.classList.toggle("activo",modo==="BUSCAR");
    if(btnGestion) btnGestion.classList.toggle("activo",modo==="GESTION");

    if(filtros) filtros.style.display=modo==="BUSCAR"?"grid":"none";

    const msg=document.getElementById("mv568Msg");
    const lista=document.getElementById("mv568Lista");
    if(lista) lista.innerHTML="";

    if(modo==="GESTION"){
      if(msg) msg.textContent="Consultando órdenes actualmente en gestión...";
      cargarEnGestion();
    }else{
      if(msg) msg.textContent=esTecnico()
        ?"Seleccione una fecha y pulse Consultar."
        :"Seleccione los filtros y pulse Consultar.";
    }
  }

  async function cargarEnGestion(){
    const msg=document.getElementById("mv568Msg");
    const lista=document.getElementById("mv568Lista");
    if(!msg||!lista)return;

    msg.textContent=esTecnico()
      ?"Consultando tus gestiones..."
      :"Consultando órdenes actualmente en gestión...";
    lista.innerHTML="";

    const params={
      accion:"listarRecuperacionEnGestionV576",
      usuario:usuario()
    };

    if(puedeElegirSede()){
      params.sede=document.getElementById("mv568Sede")?.value||"";
    }

    try{
      const d=await apiGet(params);
      msg.textContent=d.registros
        ? (d.registros+(esTecnico()?" gestiones activas.":" órdenes actualmente en gestión."))
        : (esTecnico()?"No tienes órdenes actualmente en gestión.":"No hay órdenes actualmente en gestión.");
      lista.innerHTML=(d.ordenes||[]).map(tarjeta).join("");
    }catch(e){
      msg.textContent="❌ "+(e.message||e);
    }
  }

  async function verificarGestion(ordenId){
    try{
      return await apiGet({
        accion:"estadoRecuperacionOrdenV575",
        usuario:usuario(),
        ordenId:ordenId
      });
    }catch(_){
      return null;
    }
  }

  async function tomar(ordenId,boton){
    const msg=document.getElementById("mv568Msg");
    if(boton){
      boton.disabled=true;
      boton.dataset.textoOriginal=boton.textContent;
      boton.textContent="GUARDANDO...";
      boton.style.background="#f59e0b";
      boton.style.opacity="0.86";
      boton.style.cursor="wait";
    }
    if(msg) msg.textContent="Guardando gestión...";

    let confirmado=false;

    try{
      const d=await apiPost({
        accion:"tomarRecuperacionOrdenV568",
        usuario:usuario(),
        ordenId:ordenId
      });
      confirmado=!!(d&&d.ok);
    }catch(e){
      const estado=await verificarGestion(ordenId);
      confirmado=!!(
        estado &&
        estado.ok &&
        estado.estadoGestion==="EN GESTION" &&
        estado.gestionPropia
      );

      if(!confirmado){
        if(boton){
          boton.disabled=false;
          boton.textContent=boton.dataset.textoOriginal||"PONER EN GESTIÓN";
          boton.style.background="#f97316";
          boton.style.opacity="1";
          boton.style.cursor="pointer";
        }
        if(msg) msg.textContent="❌ "+(e.message||e);
        return;
      }
    }

    if(confirmado){
      if(boton){
        boton.textContent="✓ EN GESTIÓN";
        boton.style.background="#ea580c";
        boton.style.opacity="1";
        boton.style.cursor="default";
      }
      if(msg) msg.textContent="✅ Orden en gestión.";
      setTimeout(function(){ cargar().catch(function(){}); },300);
    }
  }

  async function liberar(ordenId,boton){
    const msg=document.getElementById("mv568Msg");
    const card=boton ? boton.closest(".mv568-card") : null;

    if(boton){
      boton.disabled=true;
      boton.dataset.textoOriginal=boton.textContent;
      boton.textContent="LIBERANDO...";
      boton.style.background="#f59e0b";
      boton.style.opacity="0.86";
      boton.style.cursor="wait";
    }

    if(msg) msg.textContent="Liberando gestión...";

    try{
      await apiPost({
        accion:"liberarRecuperacionOrdenV568",
        usuario:usuario(),
        ordenId:ordenId
      });

      if(boton){
        boton.textContent="✓ LIBERADO";
        boton.style.background="#16a34a";
        boton.style.opacity="1";
        boton.style.cursor="default";
      }

      if(msg) msg.textContent="✅ Gestión liberada.";

      if(modoActual==="GESTION"){
        if(card){
          card.style.transition="opacity .25s ease, transform .25s ease";
          card.style.opacity="0";
          card.style.transform="scale(.98)";
          setTimeout(function(){
            card.remove();
            const lista=document.getElementById("mv568Lista");
            if(lista && !lista.children.length && msg){
              msg.textContent=esTecnico()
                ?"No tienes órdenes actualmente en gestión."
                :"No hay órdenes actualmente en gestión.";
            }
          },260);
        }else{
          await cargarEnGestion();
        }
      }else{
        await cargar();
      }
    }catch(e){
      if(boton){
        boton.disabled=false;
        boton.textContent=boton.dataset.textoOriginal||"LIBERAR GESTIÓN";
        boton.style.background="#475569";
        boton.style.opacity="1";
        boton.style.cursor="pointer";
      }

      if(msg) msg.textContent="❌ "+(e.message||e);
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
      ? '<label>Sede<select id="mv568Sede"><option value="">Todas</option><option>CHICLAYO</option><option>PIURA</option><option>TRUJILLO</option></select></label>'
      : '<div class="mv568-sede-fija">🏢 '+esc(sede())+'</div>';

    p.innerHTML='<style>'+
      '.mv568-wrap{max-width:980px;margin:18px auto;padding:0 12px 28px;color:#0f172a}.mv576-tabs{display:flex;gap:8px;margin:14px 0 10px}.mv576-tab{border:0;border-radius:12px;padding:10px 14px;font-size:12px;font-weight:950;cursor:pointer;background:#334155;color:#fff}.mv576-tab.activo{background:#f97316;box-shadow:0 4px 12px rgba(249,115,22,.28)}.mv568-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.mv568-head h2{margin:0;color:#fff;font-size:22px}.mv568-aviso{font-size:11px;color:#94a3b8;margin-top:4px}.mv568-filtros{display:grid;grid-template-columns:repeat(6,minmax(115px,1fr));gap:8px;background:#fff;padding:12px;border-radius:16px;margin:12px 0;box-shadow:0 8px 24px rgba(15,23,42,.10)}.mv568-filtros label{font-size:11px;font-weight:800;color:#475569;display:flex;flex-direction:column;gap:4px}.mv568-filtros select,.mv568-filtros input{min-height:38px;border:1px solid #cbd5e1;border-radius:9px;padding:7px;background:#fff}.mv568-btn{border:0;border-radius:10px;background:#f97316;color:#fff;font-weight:900;padding:10px 14px;cursor:pointer;align-self:end}.mv568-sede-fija{display:flex;align-items:center;font-weight:900;padding:8px 10px;background:#fff7ed;border-radius:10px}.mv568-msg{font-size:13px;font-weight:800;margin:10px 2px;color:#e2e8f0}.mv568-lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mv568-card{background:#fff;border-radius:16px;padding:14px;box-shadow:0 8px 22px rgba(15,23,42,.10);border-left:5px solid #f97316}.mv568-repro{border-left-color:#2563eb}.mv568-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.mv568-tipo{font-weight:900;font-size:12px}.mv568-badge{font-size:10px;font-weight:900;background:#ffedd5;color:#9a3412;border-radius:999px;padding:5px 8px}.mv568-repro .mv568-badge{background:#dbeafe;color:#1d4ed8}.mv568-card h3{font-size:16px;margin:10px 0 8px}.mv568-tel{display:inline-block;color:#0f766e;font-weight:900;text-decoration:none}.mv568-codigo{font-size:12px;line-height:1.4;margin-top:4px;color:#334155}.mv568-dir,.mv568-motivo{font-size:12px;line-height:1.4;margin-top:7px}.mv568-fecha{margin-top:8px;font-size:11px;color:#64748b}.mv568-sin{font-size:12px;color:#94a3b8}.mv568-gestion{margin-top:10px;border-radius:9px;padding:7px 9px;font-size:11px;font-weight:900}.mv568-gestion.libre{background:#dcfce7;color:#166534}.mv568-gestion.propia{background:#ffedd5;color:#9a3412}.mv568-gestion.ocupada{background:#e2e8f0;color:#334155}.mv568-actions{margin-top:9px}.mv568-btn-tomar,.mv568-btn-liberar{width:100%;border:0;border-radius:9px;padding:10px;font-size:11px;font-weight:950;cursor:pointer}.mv568-btn-tomar{background:#f97316;color:#fff}.mv568-btn-liberar{background:#475569;color:#fff}.mv568-quien{font-size:10px;color:#475569;margin-bottom:6px;font-weight:800}@media(max-width:760px){.mv568-filtros{grid-template-columns:1fr 1fr}.mv568-lista{grid-template-columns:1fr}}'+
      '</style>'+
      '<div class="mv568-wrap">'+
        '<div class="mv568-head"><div><h2>🟧 Recuperación de Órdenes</h2><div class="mv568-aviso">Mapa Operativo es la fuente actual. Técnicos consultan una sola fecha por vez para respuesta rápida. Una orden finalizada deja de mostrarse automáticamente.</div></div>'+selectorSede+'</div>'+
        '<div class="mv576-tabs">'+
          '<button id="mv576TabBuscar" class="mv576-tab activo" type="button" onclick="mv576ModoBuscar()">🔎 BUSCAR ÓRDENES</button>'+
          '<button id="mv576TabGestion" class="mv576-tab" type="button" onclick="mv576ModoGestion()">'+(esTecnico()?'🟠 MIS GESTIONES':'🟠 EN GESTIÓN')+'</button>'+
        '</div>'+
        '<div id="mv568Filtros" class="mv568-filtros">'+
          '<label>Estado<select id="mv568Estado"><option value="">Todos</option><option value="CANCELADO">Cancelados</option><option value="REPROGRAMADO">Reprogramados</option></select></label>'+
          '<label>Tipo<select id="mv568Tipo"><option value="">Todos</option><option value="INSTALACION">Instalación</option><option value="VISITA TECNICA">Visita Técnica</option></select></label>'+
          '<label>Gestión<select id="mv568Gestion"><option value="">Todos</option><option value="LIBRE">Libres</option><option value="EN GESTION">En gestión</option></select></label>'+
          (esTecnico()
            ? '<label>Fecha<input id="mv571Fecha" type="date" value="'+hoyIso()+'" max="'+hoyIso()+'"></label>'
            : '<label>Desde<input id="mv568Desde" type="date" value="'+hoyIso()+'"></label><label>Hasta<input id="mv568Hasta" type="date" value="'+hoyIso()+'"></label>')+
          '<button class="mv568-btn" type="button" onclick="mv568CargarRecuperacion()">Consultar</button>'+
        '</div>'+
        '<div id="mv568Msg" class="mv568-msg">Listo para consultar.</div>'+
        '<div id="mv568Lista" class="mv568-lista"></div>'+
      '</div>';
    const msgInicial=document.getElementById("mv568Msg");
    if(msgInicial) msgInicial.textContent=esTecnico()?"Seleccione una fecha y pulse Consultar.":"Seleccione los filtros y pulse Consultar.";
  }

  window.mostrarRecuperacionOrdenes=mostrarRecuperacionOrdenes;
  window.mv568CargarRecuperacion=cargar;
  window.mv568TomarOrden=tomar;
  window.mv568LiberarOrden=liberar;
  window.mv576ModoBuscar=function(){activarModo("BUSCAR");};
  window.mv576ModoGestion=function(){activarModo("GESTION");};
  window.mv576CargarEnGestion=cargarEnGestion;
})();