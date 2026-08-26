/* ============================================================
   MI VISUAL V496 - CONTINUIDAD / CAMBIO DE CUADRILLA

   Objetivo:
   - Consolidar una cuadrilla anterior dentro de su nueva identidad.
   - Mantener intactos los registros historicos originales.
   - Mostrar la herramienta de gestion SOLO a Jefatura.
   - Aplicar la continuidad a la visualizacion del Dashboard.

   La persistencia oficial se realiza en CONTINUIDAD_CUADRILLAS mediante
   el backend V496. Mientras el backend nuevo aun no este publicado se
   conserva el caso inicial P12 -> P13 como respaldo de visualizacion.
============================================================ */
(function(){
  "use strict";

  if(window.MV496_CONTINUIDAD_CUADRILLAS_OK) return;
  window.MV496_CONTINUIDAD_CUADRILLAS_OK = true;

  const FALLBACK = [{
    id:"CONT-20260826-001",
    cuadrillaAnterior:"P12 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA",
    cuadrillaNueva:"P13 VISUAL SGI CESAR MOISES FERNANDEZ MUNDACA",
    fechaEfectiva:"26/08/2026",
    motivo:"CAMBIO DE NOMENCLATURA / CONTINUIDAD",
    estado:"ACTIVO"
  }];

  let cache = null;
  let cacheFecha = 0;
  let listaRawUltima = [];
  const TTL = 60 * 1000;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/^P\s+(\d+)/i,"P$1")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(v){
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function num(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function perfil(){ return norm(localStorage.getItem("perfil")); }

  function esJefatura(){
    const p = perfil();
    if(p !== "JEFATURA" && p !== "JEFATURA GENERAL") return false;
    if(typeof window.pmPuede === "function"){
      try{
        return !!window.pmPuede("CONTINUIDAD CUADRILLAS","ADMINISTRAR");
      }catch(_){}
    }
    return true;
  }

  function apiBase(){
    return window.MI_VISUAL_API_URL ||
      (typeof window.MV58_API !== "undefined" ? window.MV58_API : "");
  }

  function periodoFecha(v){
    if(v instanceof Date && !Number.isNaN(v.getTime())){
      return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}`;
    }
    const t = String(v || "").trim();
    let m = t.match(/^(\d{4})-(\d{2})/);
    if(m) return `${m[1]}-${m[2]}`;
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m) return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}`;
    return "";
  }

  function normalizarContinuidad(x){
    return {
      id:String(x?.id || x?.ID || ""),
      cuadrillaAnterior:norm(x?.cuadrillaAnterior ?? x?.CUADRILLA_ANTERIOR),
      cuadrillaNueva:norm(x?.cuadrillaNueva ?? x?.CUADRILLA_NUEVA),
      fechaEfectiva:String(x?.fechaEfectiva ?? x?.FECHA_EFECTIVA ?? ""),
      motivo:String(x?.motivo ?? x?.MOTIVO ?? ""),
      estado:norm(x?.estado ?? x?.ESTADO ?? "ACTIVO") || "ACTIVO"
    };
  }

  function unirContinuidades(remotas){
    const mapa = new Map();
    [...FALLBACK,...(Array.isArray(remotas)?remotas:[])].forEach(x=>{
      const r = normalizarContinuidad(x);
      if(!r.cuadrillaAnterior || !r.cuadrillaNueva) return;
      const k = `${r.cuadrillaAnterior}|${r.fechaEfectiva}`;
      mapa.set(k,r);
    });
    return Array.from(mapa.values());
  }

  async function obtenerContinuidades(forzar=false){
    if(!forzar && cache && Date.now()-cacheFecha<TTL) return cache;
    const base = apiBase();
    if(!base){
      cache = unirContinuidades([]);
      cacheFecha = Date.now();
      return cache;
    }
    try{
      const url = new URL(base);
      url.searchParams.set("accion","listarContinuidadCuadrillas");
      url.searchParams.set("usuario",localStorage.getItem("usuario") || "");
      url.searchParams.set("_mv496",Date.now());
      const r = await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}});
      const txt = (await r.text()).trim();
      const data = JSON.parse(txt);
      if(!data?.ok) throw new Error(data?.error || "Backend V496 no publicado");
      cache = unirContinuidades(data.lista || []);
    }catch(e){
      console.warn("V496: se usa continuidad local mientras se publica backend.",e);
      cache = unirContinuidades([]);
    }
    cacheFecha = Date.now();
    return cache;
  }

  function aplicables(lista,periodo){
    const p = periodoFecha(periodo) || periodoFecha(new Date());
    return (lista||[]).filter(x=>{
      if(norm(x.estado)!=="ACTIVO") return false;
      const pe = periodoFecha(x.fechaEfectiva);
      return !pe || !p || p>=pe;
    });
  }

  function canon(nombre,continuidades,periodo){
    let actual = norm(nombre);
    const reglas = aplicables(continuidades,periodo);
    const vistos = new Set();
    while(actual && !vistos.has(actual)){
      vistos.add(actual);
      const r = reglas.find(x=>norm(x.cuadrillaAnterior)===actual);
      if(!r) break;
      actual = norm(r.cuadrillaNueva);
    }
    return actual;
  }

  function sumaObjNumerico(dest,src){
    const out = dest && typeof dest==="object" ? dest : {};
    Object.keys(src||{}).forEach(k=>{
      const v = src[k];
      if(typeof v === "number" && Number.isFinite(v)) out[k] = num(out[k])+v;
      else if(v && typeof v === "object" && !Array.isArray(v)) out[k] = sumaObjNumerico(out[k]||{},v);
      else if(out[k] == null || out[k] === "") out[k] = v;
    });
    return out;
  }

  function mergeGrupo(grupo,nueva){
    const preferida = grupo.find(x=>norm(x.cuadrilla)===norm(nueva)) || grupo[0] || {};
    const out = JSON.parse(JSON.stringify(preferida));
    out.cuadrilla = nueva;

    out.produccion = grupo.reduce((s,x)=>s+num(x.produccion),0);

    const e = {finalizadas:0,canceladas:0,regestion:0,reprogramadas:0,total:0};
    grupo.forEach(x=>{
      const d=x.detEfectividad||{};
      ["finalizadas","canceladas","regestion","reprogramadas","total"].forEach(k=>e[k]+=num(d[k]));
    });
    e.efectividad = e.total>0 ? e.finalizadas/e.total*100 : 0;
    out.detEfectividad=e;
    out.efectividad=e.efectividad;

    const r={los:0,rojoAsignadas:0,recableados:0};
    grupo.forEach(x=>{
      const d=x.detRecableado||{};
      r.los += num(d.los ?? d.rojoAsignadas);
      r.rojoAsignadas = r.los;
      r.recableados += num(d.recableados);
    });
    r.porcentaje = r.los>0 ? r.recableados/r.los*100 : 0;
    r.porcentajeRecableado=r.porcentaje;
    out.detRecableado=r;
    out.recableado=r.porcentaje;

    const v={finalizadas:0,gar:0,vtr:0,total:0,totalGarVtr:0};
    grupo.forEach(x=>{
      const d=x.detVtrGar||{};
      v.finalizadas+=num(d.finalizadas);
      v.gar+=num(d.gar);
      v.vtr+=num(d.vtr);
      v.total+=num(d.total ?? d.totalGarVtr);
    });
    v.totalGarVtr=v.total;
    v.porcentaje = v.finalizadas>0 ? v.total/v.finalizadas*100 : 0;
    v.porcentajeVtrGar=v.porcentaje;
    out.detVtrGar=v;
    out.vtrgar=v.porcentaje;

    const o={total:0,pendientes:0,montoTotal:0,montoPendiente:0,montoAfectado:0,estados:{}};
    grupo.forEach(x=>{
      const d=x.detObservaciones||{};
      o.total+=num(d.total ?? x.observaciones);
      o.pendientes+=num(d.pendientes);
      o.montoTotal+=num(d.montoTotal ?? x.montoTotalObs ?? x.montoTotalObservaciones);
      o.montoPendiente+=num(d.montoPendiente ?? x.montoAfectadoObs ?? x.montoAfectadoObservaciones);
      o.montoAfectado+=num(d.montoAfectado ?? d.montoPendiente ?? x.montoAfectadoObs ?? x.montoAfectadoObservaciones);
      o.estados=sumaObjNumerico(o.estados,d.estados||{});
    });
    out.detObservaciones=o;
    out.observaciones=o.total;
    out.montoTotalObs=o.montoTotal;
    out.montoTotalObservaciones=o.montoTotal;
    out.montoAfectadoObs=o.montoAfectado;
    out.montoAfectadoObservaciones=o.montoAfectado;

    const slaBase = grupo.map(x=>x.detSla).filter(Boolean);
    if(slaBase.length){
      let s={};
      slaBase.forEach(d=>{ s=sumaObjNumerico(s,d); });
      const ev=num(s.evaluables);
      s.slaBruto=ev>0 ? num(s.cumplenBruto)/ev*100 : 0;
      s.slaAjustado=ev>0 ? num(s.cumplenAjustado)/ev*100 : 0;
      out.detSla=s;
      out.slaBruto=s.slaBruto;
      out.slaAjustado=s.slaAjustado;
    }else{
      const ev=grupo.reduce((a,x)=>a+num(x.slaEvaluables),0);
      out.slaEvaluables=ev;
      out.slaBruto=ev>0?grupo.reduce((a,x)=>a+num(x.slaBruto)*num(x.slaEvaluables),0)/ev:0;
      out.slaAjustado=ev>0?grupo.reduce((a,x)=>a+num(x.slaAjustado)*num(x.slaEvaluables),0)/ev:0;
    }

    const dias = grupo.map(x=>x.mv353CumplimientoDia).filter(Boolean);
    if(dias.length){
      let d={};
      dias.forEach(x=>{d=sumaObjNumerico(d,x);});
      out.mv353CumplimientoDia=d;
    }

    out.mv496Continuidad = {
      vigente:true,
      cuadrillaVisible:nueva,
      origenes:grupo.map(x=>x.cuadrilla).filter(Boolean)
    };
    return out;
  }

  function consolidarLista(lista,continuidades,periodo){
    const src=Array.isArray(lista)?lista:[];
    const grupos=new Map();
    src.forEach(item=>{
      const c=canon(item?.cuadrilla,continuidades,periodo) || norm(item?.cuadrilla);
      if(!grupos.has(c)) grupos.set(c,[]);
      grupos.get(c).push(item);
    });
    return Array.from(grupos.entries()).map(([c,g])=>mergeGrupo(g,c));
  }

  async function guardarContinuidad(data){
    if(!esJefatura()) throw new Error("Solo Jefatura puede registrar cambios de cuadrilla.");
    const base=apiBase();
    if(!base) throw new Error("No se encontro la URL de MI VISUAL.");
    const payload={
      accion:"guardarContinuidadCuadrilla",
      usuario:localStorage.getItem("usuario")||"",
      cuadrillaAnterior:data.cuadrillaAnterior,
      cuadrillaNueva:data.cuadrillaNueva,
      fechaEfectiva:data.fechaEfectiva,
      motivo:data.motivo||"CAMBIO DE NOMENCLATURA / CONTINUIDAD"
    };
    const r=await fetch(base,{method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},body:JSON.stringify(payload)});
    const txt=(await r.text()).trim();
    const res=JSON.parse(txt);
    if(!res?.ok) throw new Error(res?.error||"No se pudo guardar la continuidad.");
    cache=null; cacheFecha=0;
    await obtenerContinuidades(true);
    if(typeof window.mv366InvalidarResumenDashboard==="function"){
      try{ window.mv366InvalidarResumenDashboard(window.MV276_DASH_PERIODO||""); }catch(_){}
    }
    return res;
  }

  function opcionesCuadrilla(lista,seleccionada){
    const unicas=Array.from(new Set((lista||[]).map(x=>norm(x.cuadrilla)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    return `<option value="">Seleccione...</option>`+unicas.map(c=>`<option value="${esc(c)}" ${norm(seleccionada)===c?"selected":""}>${esc(c)}</option>`).join("");
  }

  function cerrarModal(){ document.getElementById("mv496Modal")?.remove(); }
  window.mv496CerrarContinuidad=cerrarModal;

  async function abrirModal(){
    if(!esJefatura()) return;
    const cont=await obtenerContinuidades();
    const raw=listaRawUltima.length?listaRawUltima:(window.MV198_DASH_JEFATURA_LISTA||[]);
    cerrarModal();
    const hoy=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const modal=document.createElement("div");
    modal.id="mv496Modal";
    modal.style.cssText="position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto";
    modal.innerHTML=`<div style="width:min(780px,100%);margin-top:20px;background:#fff;color:#0f172a;border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div><h3 style="margin:0">🔄 Cambio / Continuidad de Cuadrilla</h3><div style="font-size:12px;color:#64748b;margin-top:5px">Consolida indicadores bajo la nueva cuadrilla sin reescribir los registros historicos.</div></div>
        <button onclick="mv496CerrarContinuidad()" style="border:0;background:#e2e8f0;border-radius:10px;padding:8px 11px;cursor:pointer">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-top:16px">
        <label style="font-size:12px;font-weight:800">Cuadrilla anterior<select id="mv496Anterior" style="width:100%;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px">${opcionesCuadrilla(raw,"")}</select></label>
        <label style="font-size:12px;font-weight:800">Nueva cuadrilla<input id="mv496Nueva" placeholder="Ej. P13 VISUAL SGI ..." style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px"></label>
        <label style="font-size:12px;font-weight:800">Fecha efectiva<input id="mv496Fecha" type="date" value="${hoy}" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px"></label>
        <label style="font-size:12px;font-weight:800">Motivo<input id="mv496Motivo" value="CAMBIO DE NOMENCLATURA / CONTINUIDAD" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px"></label>
      </div>
      <div id="mv496Preview" style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:12px;font-size:12px;color:#475569">Seleccione la cuadrilla anterior y escriba la nueva para ver la vista previa.</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px">
        <button onclick="mv496CerrarContinuidad()" style="border:0;border-radius:10px;padding:10px 14px;background:#64748b;color:#fff;font-weight:800;cursor:pointer">Cancelar</button>
        <button id="mv496Guardar" style="border:0;border-radius:10px;padding:10px 14px;background:#0f766e;color:#fff;font-weight:900;cursor:pointer">Confirmar cambio</button>
      </div>
      <div style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:12px"><b style="font-size:13px">Continuidades activas</b>${cont.filter(x=>norm(x.estado)==="ACTIVO").map(x=>`<div style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:11px"><b>${esc(x.cuadrillaAnterior)}</b><br>→ <b>${esc(x.cuadrillaNueva)}</b> · desde ${esc(x.fechaEfectiva)}</div>`).join("")||'<div style="font-size:12px;color:#64748b;margin-top:8px">Sin registros.</div>'}</div>
    </div>`;
    document.body.appendChild(modal);

    const actualizarPreview=()=>{
      const a=norm(document.getElementById("mv496Anterior")?.value);
      const n=norm(document.getElementById("mv496Nueva")?.value);
      const p=document.getElementById("mv496Preview");
      if(!a||!n){p.textContent="Complete cuadrilla anterior y nueva.";return;}
      const antiguos=raw.filter(x=>norm(x.cuadrilla)===a);
      const nuevos=raw.filter(x=>norm(x.cuadrilla)===n);
      const prod=[...antiguos,...nuevos].reduce((s,x)=>s+num(x.produccion),0);
      p.innerHTML=`<b>Vista previa:</b><br>${esc(a)} → ${esc(n)}<br><b>Produccion acumulada visible:</b> ${prod.toFixed(1)} pts.<br>Los registros originales conservaran el nombre con el que fueron ejecutados.`;
    };
    document.getElementById("mv496Anterior").onchange=actualizarPreview;
    document.getElementById("mv496Nueva").oninput=actualizarPreview;
    document.getElementById("mv496Guardar").onclick=async function(){
      const btn=this;
      const data={
        cuadrillaAnterior:norm(document.getElementById("mv496Anterior").value),
        cuadrillaNueva:norm(document.getElementById("mv496Nueva").value),
        fechaEfectiva:document.getElementById("mv496Fecha").value,
        motivo:document.getElementById("mv496Motivo").value.trim()
      };
      if(!data.cuadrillaAnterior||!data.cuadrillaNueva){alert("Complete ambas cuadrillas.");return;}
      if(data.cuadrillaAnterior===data.cuadrillaNueva){alert("La cuadrilla anterior y la nueva no pueden ser iguales.");return;}
      if(!data.fechaEfectiva){alert("Ingrese la fecha efectiva.");return;}
      if(!confirm(`¿Confirmar continuidad?\n\n${data.cuadrillaAnterior}\n→ ${data.cuadrillaNueva}\n\nNo se reescribira el historico.`)) return;
      btn.disabled=true; btn.textContent="Guardando...";
      try{
        await guardarContinuidad(data);
        cerrarModal();
        alert("Continuidad registrada correctamente.");
        if(typeof window.mostrarDashboardJefatura==="function") await window.mostrarDashboardJefatura(window.MV276_DASH_PERIODO||"");
      }catch(e){ alert(e.message||String(e)); }
      finally{btn.disabled=false;btn.textContent="Confirmar cambio";}
    };
  }
  window.mv496AbrirContinuidad=abrirModal;

  function insertarHerramienta(){
    if(!esJefatura()) return;
    if(document.getElementById("mv496Herramienta")) return;
    const page=document.querySelector(".mv4-page");
    if(!page) return;
    const box=document.createElement("div");
    box.id="mv496Herramienta";
    box.style.cssText="margin:10px 0 14px;padding:12px 14px;border-radius:14px;background:#ecfeff;border:1px solid #a5f3fc;color:#164e63;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap";
    box.innerHTML=`<div><b>🔄 Cambio / Continuidad de Cuadrilla</b><div style="font-size:11px;margin-top:3px">Consolida una cuadrilla anterior dentro de su nueva identidad.</div></div><button onclick="mv496AbrirContinuidad()" style="border:0;border-radius:10px;padding:9px 12px;background:#0e7490;color:#fff;font-weight:900;cursor:pointer">Gestionar</button>`;
    const titulo=page.querySelector(".mv4-title,h2");
    if(titulo?.nextSibling) page.insertBefore(box,titulo.nextSibling); else page.prepend(box);
  }

  function instalarWrappers(){
    if(typeof window.mv4ObtenerRanking==="function" && !window.mv4ObtenerRanking.__mv496){
      const base=window.mv4ObtenerRanking;
      const fn=async function(periodo){
        const raw=await base.apply(this,arguments);
        listaRawUltima=Array.isArray(raw)?raw.map(x=>JSON.parse(JSON.stringify(x))):[];
        const c=await obtenerContinuidades();
        return consolidarLista(raw,c,periodo||window.MV276_DASH_PERIODO||"");
      };
      fn.__mv496=true; fn.__mv496Base=base;
      window.mv4ObtenerRanking=fn;
      try{ mv4ObtenerRanking=fn; }catch(_){}
    }

    if(typeof window.mv199RenderJefatura==="function" && !window.mv199RenderJefatura.__mv496){
      const base=window.mv199RenderJefatura;
      const fn=function(){
        const r=base.apply(this,arguments);
        setTimeout(insertarHerramienta,0);
        return r;
      };
      fn.__mv496=true; fn.__mv496Base=base;
      window.mv199RenderJefatura=fn;
      try{ mv199RenderJefatura=fn; }catch(_){}
    }
  }

  async function aplicarActual(){
    instalarWrappers();
    if(Array.isArray(window.MV198_DASH_JEFATURA_LISTA) && window.MV198_DASH_JEFATURA_LISTA.length){
      const c=await obtenerContinuidades();
      if(!listaRawUltima.length) listaRawUltima=window.MV198_DASH_JEFATURA_LISTA.map(x=>JSON.parse(JSON.stringify(x)));
      window.MV198_DASH_JEFATURA_LISTA=consolidarLista(listaRawUltima,c,window.MV276_DASH_PERIODO||"");
      try{ MV198_DASH_JEFATURA_LISTA=window.MV198_DASH_JEFATURA_LISTA; }catch(_){}
      if(typeof window.mv199RenderJefatura==="function") window.mv199RenderJefatura();
    }else{
      insertarHerramienta();
    }
  }

  instalarWrappers();
  setTimeout(()=>{aplicarActual().catch(console.warn);},50);
  setTimeout(()=>{instalarWrappers();insertarHerramienta();},800);
})();
