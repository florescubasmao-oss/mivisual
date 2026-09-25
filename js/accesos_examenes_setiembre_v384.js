/* ============================================================
   MI VISUAL V384 - EXÁMENES WIN SETIEMBRE EN CERTIFICACIÓN
   - Reubica visualmente los accesos existentes de la hoja ACCESOS.
   - No duplica enlaces ni modifica backend.
   - Instalaciones y Visita Técnica quedan dentro de Certificación WIN.
============================================================ */
(function(){
  "use strict";
  if(window.MV384_EXAMENES_SETIEMBRE_OK) return;

  function estilosV384(){
    if(document.getElementById("mv384EstilosExamenes")) return;
    const s=document.createElement("style");
    s.id="mv384EstilosExamenes";
    s.textContent=`
      .mv384-examen-card{
        min-height:112px;
        display:flex!important;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        padding:16px;
        border:1px solid rgba(255,255,255,.12)!important;
        border-radius:15px!important;
        color:#fff!important;
        text-decoration:none!important;
        box-shadow:0 8px 18px rgba(0,0,0,.18);
        transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;
      }
      .mv384-examen-card:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,0,0,.24);filter:brightness(1.05)}
      .mv384-examen-card.instalaciones{background:linear-gradient(135deg,#0f766e,#115e59)!important}
      .mv384-examen-card.visita{background:linear-gradient(135deg,#b45309,#92400e)!important}
      .mv384-examen-card span{font-size:30px!important;line-height:1}
      .mv384-examen-card b{font-size:13px!important;text-align:center}
      .mv384-examen-card small{font-size:10px!important;color:#f8fafc!important;text-align:center}
    `;
    document.head.appendChild(s);
  }

  function moverExamenesV384(){
    estilosV384();
    const seccion=document.getElementById("mv362CarpetaCertificacion");
    if(!seccion) return false;
    const grid=seccion.querySelector(".mv55-resource-grid");
    if(!grid) return false;

    const items=Array.from(document.querySelectorAll(".mv55-resource-item[data-resource-item]"));
    items.forEach(card=>{
      const nombre=(card.querySelector("b")?.textContent||"").trim().toUpperCase();
      if(nombre==="EXAMEN WIN - INSTALACIONES (SETIEMBRE)"){
        card.className="mv384-examen-card instalaciones";
        card.innerHTML="<span>🛠️</span><b>EXAMEN WIN · INSTALACIONES</b><small>Evaluación oficial · Setiembre</small>";
        card.setAttribute("data-search","EXAMEN WIN INSTALACIONES SETIEMBRE CERTIFICACION");
        grid.appendChild(card);
      }else if(nombre==="EXAMEN WIN - VISITA TÉCNICA (SETIEMBRE)" || nombre==="EXAMEN WIN - VISITA TECNICA (SETIEMBRE)"){
        card.className="mv384-examen-card visita";
        card.innerHTML="<span>🔧</span><b>EXAMEN WIN · VISITA TÉCNICA</b><small>Evaluación oficial · Setiembre</small>";
        card.setAttribute("data-search","EXAMEN WIN VISITA TECNICA SETIEMBRE CERTIFICACION");
        grid.appendChild(card);
      }
    });

    document.querySelectorAll("[data-resource-group]").forEach(grupo=>{
      if(grupo.id==="mv362CarpetaCertificacion") return;
      const visibles=grupo.querySelectorAll("[data-resource-item]");
      if(!visibles.length) grupo.style.display="none";
    });
    return true;
  }

  const mostrarAccesosBaseV384=window.mostrarAccesos;
  async function mostrarAccesosV384(){
    const r=typeof mostrarAccesosBaseV384==="function"
      ? await mostrarAccesosBaseV384.apply(this,arguments)
      : undefined;
    moverExamenesV384();
    requestAnimationFrame(moverExamenesV384);
    setTimeout(moverExamenesV384,100);
    return r;
  }

  window.mostrarAccesos=mostrarAccesosV384;
  try{mostrarAccesos=mostrarAccesosV384}catch(_){}

  const obs=new MutationObserver(()=>{
    if(document.getElementById("mv362CarpetaCertificacion")) moverExamenesV384();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(moverExamenesV384,180);

  window.MV384_EXAMENES_SETIEMBRE_OK=true;
})();