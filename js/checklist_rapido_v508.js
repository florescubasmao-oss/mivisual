/* ============================================================
   MI VISUAL V508 - CHECKLIST ALMACEN RAPIDO
   Alcance estricto:
   - No cambia reglas, permisos, guardado ni validaciones.
   - Precarga la lista cuando el usuario tiene visible Checklist.
   - Reutiliza una lectura reciente para evitar consultas repetidas.
   - En vista Jefatura renderiza las tarjetas de cada sede solo al abrirla.
   - Invalida cache despues de cualquier escritura del Checklist.
============================================================ */
(function(){
  "use strict";
  if(window.MV508_CHECKLIST_RAPIDO_OK) return;
  window.MV508_CHECKLIST_RAPIDO_OK = true;

  const API = window.MI_VISUAL_API_URL || "";
  const TTL = 90 * 1000;
  const PREFETCH_DELAY = 2600;
  const STORE_PREFIX = "MV508_CK_LISTA|";
  let memoria = null;
  let memoriaFecha = 0;
  let usuarioCache = "";
  let peticion = null;
  let ckApiBase = null;
  let parcheado = false;
  let grupos = new Map();
  let secuencia = 0;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }
  function usuario(){ return txt(localStorage.getItem("usuario")); }
  function claveStore(){ return STORE_PREFIX + usuario(); }

  function guardar(data){
    if(!data || data.ok === false) return data;
    memoria = data;
    memoriaFecha = Date.now();
    usuarioCache = usuario();
    try{
      sessionStorage.setItem(claveStore(), JSON.stringify({t:memoriaFecha,d:data}));
    }catch(_){ }
    return data;
  }

  function leer(){
    const u = usuario();
    if(!u) return null;
    if(memoria && usuarioCache === u && Date.now()-memoriaFecha < TTL) return memoria;
    try{
      const item = JSON.parse(sessionStorage.getItem(claveStore()) || "null");
      if(item && item.d && Date.now()-Number(item.t||0) < TTL){
        memoria = item.d;
        memoriaFecha = Number(item.t||Date.now());
        usuarioCache = u;
        return memoria;
      }
    }catch(_){ }
    return null;
  }

  function invalidar(){
    memoria = null;
    memoriaFecha = 0;
    usuarioCache = "";
    peticion = null;
    try{ sessionStorage.removeItem(claveStore()); }catch(_){ }
  }

  async function fetchListaDirecta(){
    const u = usuario();
    if(!API || !u) return null;
    const cached = leer();
    if(cached) return cached;
    if(peticion) return peticion;

    peticion = (async()=>{
      const url = new URL(API);
      url.searchParams.set("accion","listarChecklistAlmacen");
      url.searchParams.set("usuario",u);
      url.searchParams.set("_mv508",String(Date.now()));
      const ctrl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(()=>ctrl.abort(),25000) : null;
      try{
        const r = await fetch(url.toString(),{
          method:"GET",cache:"no-store",redirect:"follow",
          headers:{"Accept":"application/json"},signal:ctrl?ctrl.signal:undefined
        });
        const t = txt(await r.text());
        if(!r.ok || !t || /^MI VISUAL API OK$/i.test(t) || /<!doctype|<html|google drive|accounts\.google/i.test(t)) return null;
        let d = null;
        try{ d = JSON.parse(t); }catch(_){ return null; }
        if(!d || d.ok === false) return null;
        return guardar(d);
      }finally{
        if(timer) clearTimeout(timer);
      }
    })().catch(()=>null).finally(()=>{ peticion = null; });
    return peticion;
  }

  function cardVisible(){
    const card = document.getElementById("cardChecklistAlmacen");
    if(!card) return false;
    const st = getComputedStyle(card);
    return st.display !== "none" && st.visibility !== "hidden";
  }

  function precargarCuandoCorresponda(){
    let intentos = 0;
    const revisar = ()=>{
      intentos++;
      if(usuario() && cardVisible()){
        const lanzar = ()=>fetchListaDirecta().catch(()=>{});
        if(typeof requestIdleCallback === "function") requestIdleCallback(lanzar,{timeout:2500});
        else setTimeout(lanzar,0);
        return;
      }
      if(intentos < 30) setTimeout(revisar,500);
    };
    setTimeout(revisar,PREFETCH_DELAY);
  }

  function envolverApi(){
    if(parcheado) return true;
    const actual = window.ckApi;
    if(typeof actual !== "function") return false;
    if(actual.__mv508Rapido){ parcheado = true; return true; }
    ckApiBase = actual;

    const wrapper = async function(payload){
      const p = payload || {};
      const accion = txt(p.accion);
      if(accion === "listarChecklistAlmacen"){
        const cached = leer();
        if(cached) return cached;
        if(peticion){
          const pref = await peticion;
          if(pref) return pref;
        }
        const d = await ckApiBase.apply(this,arguments);
        return guardar(d);
      }

      const lecturas = new Set([
        "obtenerCatalogoHerramientasChecklist",
        "obtenerConfiguracionChecklistAlmacen"
      ]);
      const d = await ckApiBase.apply(this,arguments);
      if(!lecturas.has(accion)) invalidar();
      return d;
    };
    wrapper.__mv508Rapido = true;
    window.ckApi = wrapper;
    parcheado = true;
    return true;
  }

  function instalarRenderLazy(){
    if(typeof window.ckRenderAgrupadoPorSede !== "function" || typeof window.ckActivarDesplegablesSede !== "function") return false;
    if(window.ckRenderAgrupadoPorSede.__mv508Lazy) return true;

    const render = function(arr){
      grupos = new Map();
      secuencia = 0;
      if(!Array.isArray(arr) || !arr.length) return '<div class="ck-no-results">No hay registros que coincidan con los filtros.</div>';
      const mapa = {};
      arr.forEach(x=>{
        const sede = typeof window.ckNorm === "function" ? window.ckNorm(x.sede) : norm(x.sede);
        const k = sede || "SIN SEDE";
        if(!mapa[k]) mapa[k] = [];
        mapa[k].push(x);
      });
      const orden = ["CHICLAYO","PIURA","TRUJILLO"];
      return Object.keys(mapa).sort((a,b)=>{
        const ia=orden.indexOf(a), ib=orden.indexOf(b);
        if(ia>=0 || ib>=0) return (ia<0?99:ia)-(ib<0?99:ib);
        return a.localeCompare(b);
      }).map(sede=>{
        const registros = mapa[sede];
        const token = `mv508ck${++secuencia}`;
        grupos.set(token,registros);
        const esc = typeof window.ckEsc === "function" ? window.ckEsc : (v=>txt(v));
        return `<details class="ck-sede-group" data-mv508-token="${token}"><summary class="ck-sede-summary"><span class="ck-sede-title">📍 ${esc(sede)}</span><span class="ck-sede-arrow"><span class="ck-sede-caret">▼</span><span class="ck-sede-label">Ver ${registros.length} registro(s)</span></span></summary><div class="ck-sede-body"><div class="mv508-ck-placeholder" style="padding:10px;text-align:center;color:#64748b;font-size:11px;font-weight:800">Abra la sede para cargar el detalle.</div></div></details>`;
      }).join("");
    };
    render.__mv508Lazy = true;

    const activar = function(){
      document.querySelectorAll('.ck-sede-group').forEach(det=>{
        if(det.dataset.mv508Activado === "1") return;
        det.dataset.mv508Activado = "1";
        const label = det.querySelector('.ck-sede-label');
        const token = det.dataset.mv508Token || "";
        const registros = grupos.get(token) || [];
        const cantidad = registros.length;
        const actualizarLabel = ()=>{ if(label) label.textContent=(det.open?'Ocultar ':'Ver ')+cantidad+' registro(s)'; };
        const renderDetalle = ()=>{
          if(det.dataset.mv508Renderizado === "1") return;
          const body = det.querySelector('.ck-sede-body');
          if(!body) return;
          const counts = typeof window.ckConteosLista === "function" ? window.ckConteosLista(registros) : {total:cantidad,pend:0,vb:0,ok:0};
          const kpis = typeof window.ckKpisHtml === "function" ? window.ckKpisHtml(counts,true) : "";
          const u = typeof window.ckUser === "function" ? window.ckUser() : {};
          const cards = typeof window.ckCard === "function" ? registros.map(x=>window.ckCard(x,u)).join('') : "";
          body.innerHTML = kpis + cards;
          det.dataset.mv508Renderizado = "1";
        };
        det.addEventListener('toggle',()=>{
          actualizarLabel();
          if(det.open) requestAnimationFrame(renderDetalle);
        });
        if(det.open) renderDetalle();
        actualizarLabel();
      });
    };

    window.ckRenderAgrupadoPorSede = render;
    window.ckActivarDesplegablesSede = activar;
    return true;
  }

  function intentarParchear(){
    const a = envolverApi();
    const b = instalarRenderLazy();
    return a && b;
  }

  function observarCargaModulo(){
    const revisar = ()=>{
      intentarParchear();
      if(!parcheado) setTimeout(revisar,120);
    };
    revisar();

    const obs = new MutationObserver(cambios=>{
      cambios.forEach(c=>c.addedNodes.forEach(n=>{
        if(n && n.tagName === "SCRIPT" && /checklist_almacen\.js/i.test(n.src||"")){
          n.addEventListener("load",()=>setTimeout(intentarParchear,0),{once:true});
        }
      }));
    });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }

  window.mv508InvalidarChecklistCache = invalidar;
  window.mv508PrecargarChecklist = fetchListaDirecta;

  precargarCuandoCorresponda();
  observarCargaModulo();
  console.log("MI VISUAL V508: Checklist rápido activo.");
})();