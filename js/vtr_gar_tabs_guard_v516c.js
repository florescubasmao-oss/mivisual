/* ============================================================
   MI VISUAL V516C - GUARDA DE NAVEGACION VTR/GAR

   Alcance estricto de interfaz:
   - En la pantalla Registro VTR/GAR garantiza una sola barra
     Registro | Validacion para perfiles autorizados.
   - No reemplaza el registro existente.
   - No modifica API, datos, Ranking, Dashboard, Produccion ni backend.
============================================================ */
(function(){
  "use strict";
  if(window.MV516C_VTRGAR_TABS_OK) return;
  window.MV516C_VTRGAR_TABS_OK = true;

  let timer=null;

  function txt(v){ return String(v==null?"":v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function perfil(){ return norm(localStorage.getItem("perfil")||""); }
  function puedeValidar(){
    const p=perfil();
    return p==="SUPERVISOR" || p==="ADMIN" || p==="ADMINISTRADOR" ||
      p.indexOf("JEFATURA")===0 || p.indexOf("GERENCIA")===0;
  }

  function css(){
    if(document.getElementById("mv516c-tabs-css")) return;
    const s=document.createElement("style");
    s.id="mv516c-tabs-css";
    s.textContent=`
      .mv516c-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      .mv516c-tab{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer;min-width:135px}
      .mv516c-tab.active{background:#2563eb;color:#fff;border-color:#2563eb;box-shadow:0 7px 18px rgba(37,99,235,.20)}
      @media(max-width:520px){.mv516c-tab{flex:1;min-width:0}}
    `;
    document.head.appendChild(s);
  }

  function abrirValidacion(){
    if(typeof window.mv489AbrirValidacionVtrGar === "function"){
      window.mv489AbrirValidacionVtrGar();
      return;
    }
    alert("La vista Validación VTR/GAR todavía se está cargando. Intente nuevamente en un momento.");
  }
  window.mv516cAbrirValidacionVtrGar=abrirValidacion;

  function montar(){
    css();
    if(window.MV488_VT_MODO!=="VTRGAR" || !puedeValidar()) return;

    const wrap=document.querySelector(".vt-wrap");
    if(!wrap || document.querySelector(".mv489-wrap")) return;

    /* Si V489 ya dejó una barra correcta, no se duplica. */
    const existente=wrap.querySelector(".mv489-tabs");
    if(existente){
      const extras=Array.from(wrap.querySelectorAll(".mv489-tabs")).slice(1);
      extras.forEach(x=>x.remove());
      document.getElementById("mv516cTabs")?.remove();
      return;
    }

    let nav=document.getElementById("mv516cTabs");
    if(!nav){
      nav=document.createElement("div");
      nav.id="mv516cTabs";
      nav.className="mv516c-tabs";
      nav.innerHTML=`
        <button type="button" class="mv516c-tab active">📝 Registro</button>
        <button type="button" class="mv516c-tab" onclick="mv516cAbrirValidacionVtrGar()">✅ Validación</button>`;

      const sub=wrap.querySelector(".mv488-subnav");
      const header=wrap.querySelector(".vt-header");
      if(sub) sub.insertAdjacentElement("afterend",nav);
      else if(header) header.insertAdjacentElement("afterend",nav);
      else wrap.insertBefore(nav,wrap.firstChild);
    }
  }

  function programar(){ clearTimeout(timer); timer=setTimeout(montar,30); }

  if(document.body){
    const obs=new MutationObserver(function(muts){
      for(const m of muts){
        if(m.addedNodes && m.addedNodes.length){ programar(); return; }
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(){ setTimeout(montar,80); },false);
  setInterval(montar,1000);
  setTimeout(montar,80);
  setTimeout(montar,350);
  setTimeout(montar,900);
  console.log("MI VISUAL V516C: guarda de navegación VTR/GAR habilitada.");
})();
