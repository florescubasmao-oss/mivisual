/* ============================================================
   MI VISUAL V456 - MI DESEMPEÑO MÁS RÁPIDO Y SIN DOBLE CLIC

   Alcance estricto:
   - No cambia cálculos ni datos de Producción / Efectividad / Recableado / VTR-GAR / Ranking.
   - Muestra respuesta inmediata al pulsar un indicador de Mi Desempeño.
   - Bloquea clics repetidos mientras el indicador está cargando.
   - Precarga Producción + Catálogo mientras el técnico visualiza Mi Desempeño.
   - Reutiliza esas dos lecturas por 2 minutos para evitar descargarlas varias veces.
   - Precarga también la meta diaria cuando la función V353 está disponible.
============================================================ */
(function(){
  "use strict";

  if(window.MV456_MI_DESEMPENO_RAPIDO_OK) return;
  window.MV456_MI_DESEMPENO_RAPIDO_OK = true;

  const TTL = 2 * 60 * 1000;
  const URL_PRODUCCION = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1814992325&single=true&output=csv";
  const URL_CATALOGO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=2013842388&single=true&output=csv";
  const URLS_CACHE = new Set([URL_PRODUCCION, URL_CATALOGO]);

  const fetchOriginal = window.fetch.bind(window);
  const cacheTexto = new Map();
  const enCurso = new Map();
  let navegando = false;
  let ultimoPrefetch = 0;

  function urlDe(input){
    try{
      if(typeof input === "string") return input;
      if(input && typeof input.url === "string") return input.url;
    }catch(_){}
    return "";
  }

  function metodoGet(init){
    return !init || !init.method || String(init.method).toUpperCase() === "GET";
  }

  function respuestaDesdeTexto(texto){
    return new Response(texto,{
      status:200,
      headers:{"Content-Type":"text/csv; charset=utf-8"}
    });
  }

  async function obtenerTextoCacheado(url,input,init){
    const ahora = Date.now();
    const guardado = cacheTexto.get(url);
    if(guardado && ahora - guardado.fecha < TTL) return guardado.texto;

    if(enCurso.has(url)) return enCurso.get(url);

    const promesa = (async function(){
      const respuesta = await fetchOriginal(input || url,init);
      if(!respuesta || !respuesta.ok) return null;
      const texto = await respuesta.clone().text();
      cacheTexto.set(url,{fecha:Date.now(),texto});
      return texto;
    })();

    enCurso.set(url,promesa);
    try{
      return await promesa;
    }finally{
      enCurso.delete(url);
    }
  }

  // Intercepción acotada exclusivamente a los dos CSV usados por Producción.
  // Todo el resto de la aplicación sigue usando fetch nativo sin cambios.
  window.fetch = async function(input,init){
    const url = urlDe(input);
    if(URLS_CACHE.has(url) && metodoGet(init)){
      const guardado = cacheTexto.get(url);
      if(guardado && Date.now() - guardado.fecha < TTL){
        return respuestaDesdeTexto(guardado.texto);
      }

      const texto = await obtenerTextoCacheado(url,input,init);
      if(texto !== null) return respuestaDesdeTexto(texto);
    }
    return fetchOriginal(input,init);
  };

  function esMiDesempenoVisible(){
    const pantalla = document.getElementById("pantalla");
    if(!pantalla) return false;
    const titulo = pantalla.querySelector("h2");
    return !!(titulo && /MI\s+DESEMPEÑO/i.test(titulo.textContent || ""));
  }

  function periodoVisible(){
    const sel = document.getElementById("mv364PeriodoDesempeno");
    if(sel && sel.value) return sel.value;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }

  function precargarDatos(){
    if(!esMiDesempenoVisible()) return;
    const ahora = Date.now();
    if(ahora - ultimoPrefetch < 15000) return;
    ultimoPrefetch = ahora;

    // Hace las lecturas mientras el técnico ya está revisando Mi Desempeño.
    Promise.allSettled([
      window.fetch(URL_PRODUCCION),
      window.fetch(URL_CATALOGO)
    ]).catch(function(){});

    // La pantalla Producción vuelve a pedir esta meta; se deja lista en su caché V353.
    setTimeout(function(){
      try{
        if(typeof window.mv353ObtenerCumplimiento === "function"){
          Promise.resolve(window.mv353ObtenerCumplimiento(periodoVisible())).catch(function(){});
        }
      }catch(_){}
    },100);
  }

  function estilos(){
    if(document.getElementById("mv456DesempenoCss")) return;
    const s = document.createElement("style");
    s.id = "mv456DesempenoCss";
    s.textContent = `
      .mv456-cargando{
        position:fixed;inset:0;z-index:999999;
        display:flex;align-items:center;justify-content:center;
        background:rgba(7,22,47,.72);backdrop-filter:blur(2px);
        padding:18px;
      }
      .mv456-cargando-box{
        width:min(360px,92vw);background:#fff;color:#0f172a;
        border-radius:18px;padding:20px;text-align:center;
        box-shadow:0 22px 60px rgba(0,0,0,.35);
      }
      .mv456-spinner{
        width:34px;height:34px;margin:0 auto 12px;
        border-radius:50%;border:4px solid #dbeafe;border-top-color:#2563eb;
        animation:mv456spin .8s linear infinite;
      }
      .mv456-cargando-titulo{font-size:16px;font-weight:950}
      .mv456-cargando-sub{margin-top:6px;font-size:11px;color:#64748b;font-weight:750;line-height:1.35}
      @keyframes mv456spin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(s);
  }

  function nombreDesdeBoton(btn,nombreFuncion){
    const texto = String(btn?.innerText || btn?.textContent || "").replace(/\s+/g," ").trim();
    if(/PRODUCCI[ÓO]N/i.test(texto) || nombreFuncion === "mostrarProduccionV2") return "Producción";
    if(/EFECTIVIDAD/i.test(texto) || nombreFuncion === "mostrarEfectividad") return "Efectividad";
    if(/RECABLEADO/i.test(texto) || nombreFuncion === "mostrarRecableado") return "% Recableado";
    if(/VTR|GAR/i.test(texto) || nombreFuncion === "mostrarVTRGAR") return "% VTR / GAR";
    if(/RANKING|REGI[ÓO]N|SEDE|PLATAFORMA/i.test(texto) || nombreFuncion === "mostrarRanking") return "Ranking";
    if(/GESTI[ÓO]N|SLA/i.test(texto) || nombreFuncion === "mostrarTiempoGestionSla") return "Tiempo de Gestión";
    if(/BONO/i.test(texto) || nombreFuncion === "mostrarBonos") return "Bonos";
    return "indicador";
  }

  function mostrarCargando(nombre){
    estilos();
    let overlay = document.getElementById("mv456Cargando");
    if(!overlay){
      overlay = document.createElement("div");
      overlay.id = "mv456Cargando";
      overlay.className = "mv456-cargando";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="mv456-cargando-box">
        <div class="mv456-spinner"></div>
        <div class="mv456-cargando-titulo">Cargando ${String(nombre || "indicador")}...</div>
        <div class="mv456-cargando-sub">Espera un momento. No necesitas presionar nuevamente.</div>
      </div>`;
  }

  function ocultarCargando(){
    const overlay = document.getElementById("mv456Cargando");
    if(overlay) overlay.remove();
    navegando = false;
  }

  function extraerAccion(codigo){
    const m = String(codigo || "").match(/^\s*(mostrarProduccionV2|mostrarEfectividad|mostrarRecableado|mostrarVTRGAR|mostrarRanking|mostrarTiempoGestionSla|mostrarBonos)\s*\(([^)]*)\)/);
    if(!m) return null;
    let argumento = String(m[2] || "").trim();
    if(/^['\"].*['\"]$/.test(argumento)) argumento = argumento.slice(1,-1);
    if(!argumento) argumento = periodoVisible();
    return {nombre:m[1],argumento};
  }

  async function ejecutarAccion(btn,accion){
    const fn = window[accion.nombre];
    if(typeof fn !== "function"){
      ocultarCargando();
      return;
    }

    const inicio = Date.now();
    try{
      await Promise.resolve(fn(accion.argumento));
    }catch(error){
      console.warn("V456: no se pudo abrir el indicador",error);
    }finally{
      const espera = Math.max(0,350 - (Date.now()-inicio));
      setTimeout(ocultarCargando,espera);
    }
  }

  document.addEventListener("click",function(ev){
    if(!esMiDesempenoVisible()) return;

    const btn = ev.target && ev.target.closest ? ev.target.closest("button[onclick]") : null;
    if(!btn || !document.getElementById("pantalla")?.contains(btn)) return;

    const accion = extraerAccion(btn.getAttribute("onclick"));
    if(!accion) return;

    ev.preventDefault();
    ev.stopPropagation();
    if(typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();

    const nombre = nombreDesdeBoton(btn,accion.nombre);
    if(navegando){
      mostrarCargando(nombre);
      return;
    }

    navegando = true;
    mostrarCargando(nombre);
    setTimeout(function(){ ejecutarAccion(btn,accion); },0);
  },true);

  const observar = new MutationObserver(function(){
    if(esMiDesempenoVisible()) precargarDatos();
    else if(document.getElementById("mv456Cargando") && !navegando) ocultarCargando();
  });

  function iniciar(){
    estilos();
    const pantalla = document.getElementById("pantalla");
    if(pantalla) observar.observe(pantalla,{childList:true,subtree:true});
    precargarDatos();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  console.log("MI VISUAL V456: Mi Desempeño rápido y protegido contra doble clic.");
})();
