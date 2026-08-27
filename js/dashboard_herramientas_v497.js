/* ============================================================
   MI VISUAL V505 - HERRAMIENTAS COMPACTAS DASHBOARD JEFATURA

   - Conserva Continuidad de Cuadrilla.
   - Agrega Partidas WIN (validacion IR <-> IC).
   - Conserva Partner como respaldo/correccion auxiliar.
   - WIN mantiene prioridad.
   - No modifica SLA.
============================================================ */
(function(){
  "use strict";
  if(window.MV505_HERRAMIENTAS_DASHBOARD_OK) return;
  window.MV505_HERRAMIENTAS_DASHBOARD_OK=true;
  window.MV497_HERRAMIENTAS_DASHBOARD_OK=true;

  function norm(v){
    return String(v||"").toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }

  function esJefatura(){
    const p=norm(localStorage.getItem("perfil"));
    return p==="JEFATURA" || p==="JEFATURA GENERAL";
  }

  function periodoActual(){
    try{
      const partes=new Intl.DateTimeFormat("en-CA",{
        timeZone:"America/Lima",year:"numeric",month:"2-digit"
      }).formatToParts(new Date());
      const y=partes.find(x=>x.type==="year")?.value||"";
      const m=partes.find(x=>x.type==="month")?.value||"";
      return y&&m?`${y}-${m}`:"";
    }catch(_){ return ""; }
  }

  function htmlBarra(){
    return `<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:7px 9px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:11px;margin:7px 0 10px;box-shadow:none">
      <span style="font-size:11px;font-weight:900;color:#475569;margin-right:2px">⚙️ Herramientas</span>
      <button type="button" onclick="mv496AbrirContinuidad()" style="border:0;border-radius:8px;padding:7px 9px;background:#1d4ed8;color:white;font-size:11px;font-weight:800;cursor:pointer">🔄 Cuadrilla</button>
      <button type="button" onclick="mv505AbrirPartidas()" style="border:0;border-radius:8px;padding:7px 9px;background:#d97706;color:white;font-size:11px;font-weight:800;cursor:pointer">🎯 Partidas</button>
      <button type="button" onclick="mv497AbrirPartner()" style="border:0;border-radius:8px;padding:7px 9px;background:#475569;color:white;font-size:11px;font-weight:800;cursor:pointer">🛠 Partner</button>
      <span style="font-size:10px;color:#64748b">Solo Jefatura · WIN mantiene prioridad</span>
    </div>`;
  }

  function compactar(){
    if(!esJefatura()) return;
    const box=document.getElementById("mv496Herramienta");
    if(!box) return;
    if(box.dataset.mv505Compacto==="si") return;
    box.dataset.mv497Compacto="si";
    box.dataset.mv505Compacto="si";
    box.style.cssText="margin:0;padding:0;background:transparent;border:0;box-shadow:none;";
    box.innerHTML=htmlBarra();
  }

  function cargarScript(url){
    const base=url.split("?")[0].replace(/^\.\//,"");
    if(Array.from(document.scripts).some(s=>s.src&&s.src.includes(base))) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src=url;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error("No se pudo cargar "+base));
      document.head.appendChild(s);
    });
  }

  async function cargarBasePartner(){
    if(typeof window.mostrarActualizarBaseOperativa==="function") return;
    if(typeof window.mv339CargarModulo==="function"){
      await window.mv339CargarModulo("administracion");
      if(typeof window.mostrarActualizarBaseOperativa==="function") return;
    }
    await cargarScript("./js/base_operativa.js?v=V505-PARTNER-LAZY");
  }

  function rotularPartner(){
    const wrap=document.querySelector(".bo-wrap");
    if(!wrap) return;
    const h=wrap.querySelector(".bo-head h2");
    const p=wrap.querySelector(".bo-head p");
    if(h) h.textContent="🛠 Respaldo / corrección Base Partner";
    if(p) p.textContent="Partner complementa y propone correcciones puntuales. WIN continúa siendo la fuente principal de órdenes, estados e indicadores.";

    const nota=wrap.querySelector(".bo-card .bo-note");
    if(nota){
      nota.innerHTML="<b>Regla:</b> Partner es auxiliar. Las diferencias IR/IC deben validarse en <b>🎯 Partidas</b>. WIN mantiene la cuadrilla ejecutora y el estado oficial.";
    }

    const btn=document.getElementById("boProcesar");
    if(btn) btn.textContent="Aplicar respaldo Partner";
  }

  function instalarSincronizacionPartner(){
    const original=window.boProcesarBase;
    if(typeof original!=="function" || original.__mv505Partner) return;
    const ajustada=async function(){
      const r=await original.apply(this,arguments);
      if(window.MV497_PARTNER_MODO_ACTIVO){
        try{
          const p=periodoActual();
          if(typeof window.mv4879SincronizarIndicadoresWin==="function"){
            await window.mv4879SincronizarIndicadoresWin(p?[p]:[]);
          }
        }catch(e){
          console.warn("V505 Partner: respaldo aplicado; publicacion WIN pendiente",e);
          const msg=document.getElementById("boMensaje");
          if(msg){
            msg.className="bo-msg bo-warn";
            msg.textContent=String(msg.textContent||"")+"\n⚠ Respaldo Partner guardado. La republicacion WIN quedo pendiente: "+(e?.message||e);
          }
        }
      }
      return r;
    };
    ajustada.__mv505Partner=true;
    ajustada.__original=original;
    window.boProcesarBase=ajustada;
    try{boProcesarBase=ajustada;}catch(_){}
  }

  async function abrirPartner(){
    if(!esJefatura()) return;
    window.MV497_PARTNER_MODO_ACTIVO=true;
    try{
      await cargarBasePartner();
      instalarSincronizacionPartner();
      if(typeof window.mostrarActualizarBaseOperativa!=="function") throw new Error("No se pudo abrir Base Partner.");
      window.mostrarActualizarBaseOperativa();
      setTimeout(rotularPartner,40);
      setTimeout(rotularPartner,180);
    }catch(e){
      alert(e?.message||String(e));
    }
  }
  window.mv497AbrirPartner=abrirPartner;

  const obs=new MutationObserver(()=>compactar());
  function iniciar(){
    compactar();
    const p=document.getElementById("pantalla")||document.body;
    if(p) obs.observe(p,{childList:true,subtree:true});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();
})();
