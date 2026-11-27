/* ============================================================
   MI VISUAL V383 - SIMULACRO CERTIFICACIÓN WIN
   - Agrega una tarjeta junto a MI CERTIFICACIÓN WIN.
   - Visible para todos los perfiles que acceden a ACCESOS.
   - Abre Google Forms en pestaña nueva.
   - No realiza consultas adicionales ni modifica backend.
============================================================ */
(function(){
  "use strict";

  if(window.MV383_SIMULACRO_CERTIFICACION_OK) return;

  const LINK_SIMULACRO =
    "https://forms.gle/ieoFrBWSdaRyb7ydA";

  function estilosV383(){
    if(document.getElementById("mv383EstilosSimulacro")) return;

    const style=document.createElement("style");
    style.id="mv383EstilosSimulacro";
    style.textContent=`
      #mv362CarpetaCertificacion .mv55-resource-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #mv362CarpetaCertificacion .mv383-simulacro-card,#mvEvaluacionesWin,#mvEvaluacionesWin *{box-sizing:border-box;min-width:0}
      #mvEvaluacionesWin{grid-column:1/-1;background:#0f243b;color:#f6f9fc;border:1px solid #416078;border-radius:16px;overflow:hidden;text-align:left}
      #mvEvaluacionesWin summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:14px;padding:20px;background:linear-gradient(110deg,#103c50,#162b46);border-left:4px solid #58decb}
      #mvEvaluacionesWin summary::-webkit-details-marker{display:none}
      #mvEvaluacionesWin .mv-win-copy{display:grid;gap:4px;flex:1}
      #mvEvaluacionesWin .mv-win-kicker{color:#92e5d9;font:700 10px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase}
      #mvEvaluacionesWin strong{font:700 clamp(19px,3vw,25px)/1.2 system-ui}
      #mvEvaluacionesWin small{font:400 13px/1.45 system-ui;color:#cee0ed}
      #mvEvaluacionesWin .mv-win-toggle{border:1px solid #638395;border-radius:50%;width:32px;height:32px;display:grid;place-items:center;font:20px system-ui}
      #mvEvaluacionesWin[open] .mv-win-toggle{transform:rotate(180deg)}
      .mv-win-panel{display:grid;gap:16px;padding:18px}
      .mv-win-panel h3{margin:0 0 8px;color:#b9d2df;font:650 13px/1.3 system-ui}
      .mv-win-bloques,.mv-win-tools{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}
      .mv-win-tools{grid-template-columns:repeat(2,minmax(0,1fr))}
      #mvEvaluacionesWin a{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:44px;padding:10px 14px;border-radius:9px;border:1px solid #47647b;background:#1a344e;color:#fff;font:650 14px/1.4 system-ui;text-decoration:none}
      #mvEvaluacionesWin .mv-win-primary{background:#a5eadb;color:#103b38;border-color:#a5eadb}
      #mvEvaluacionesWin a:hover{filter:brightness(1.15);text-decoration:underline}
      #mvEvaluacionesWin :focus-visible{outline:3px solid #ffc66c;outline-offset:-3px}
      @media(max-width:600px){#mvEvaluacionesWin summary{padding:14px}.mv-win-panel{padding:13px}.mv-win-bloques{grid-template-columns:repeat(2,minmax(0,1fr))}.mv-win-tools{grid-template-columns:1fr}}
      @media(max-width:450px){#mv362CarpetaCertificacion .mv55-resource-grid{grid-template-columns:minmax(0,1fr)}}
      .mv383-simulacro-card{
        width:100%;
        min-height:112px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        padding:16px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:15px;
        background:linear-gradient(135deg,#6d28d9,#4c1d95);
        color:#fff;
        text-decoration:none;
        font:inherit;
        cursor:pointer;
        box-shadow:0 8px 18px rgba(0,0,0,.18);
        transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;
      }
      .mv383-simulacro-card:hover{
        transform:translateY(-2px);
        box-shadow:0 12px 24px rgba(0,0,0,.25);
        filter:brightness(1.05);
      }
      .mv383-simulacro-card span{
        font-size:30px;
        line-height:1;
      }
      .mv383-simulacro-card b{
        font-size:14px;
        text-align:center;
      }
      .mv383-simulacro-card small{
        font-size:10px;
        color:#ede9fe;
        text-align:center;
      }
    `;
    document.head.appendChild(style);
  }

  function puedeVerEvaluaciones(perfil){
    return ["SUPERVISOR","JEFATURA","JEFATURA GENERAL"].includes(String(perfil||"").trim().toUpperCase());
  }

  function tarjetaEvaluaciones(grid){
    const anterior=grid.querySelector("#mvEvaluacionesWin");
    if(!puedeVerEvaluaciones(localStorage.getItem("perfil"))){
      if(anterior) anterior.remove();
      return;
    }
    if(anterior) return;
    const panel=document.createElement("details");
    panel.id="mvEvaluacionesWin";
    panel.setAttribute("data-resource-item","");
    panel.setAttribute("data-search","EVALUACIONES WIN DETECTOR CERTIFICACION TECNICA UNIFICADA BLOQUES DASHBOARD SEGUIMIENTO");
    const base="https://windetector.vercel.app/";
    const link=(url,label,primary=false)=>'<a class="'+(primary?'mv-win-primary':'mv-win-link')+'" target="_blank" rel="noopener noreferrer" href="'+url+'">'+label+'<span aria-hidden="true">↗</span></a>';
    panel.innerHTML='<summary><span class="mv-win-copy"><span class="mv-win-kicker">Certificación técnica · Zona Norte</span><strong>Evaluaciones WIN</strong><small>Acceso a los exámenes y al seguimiento por sede.</small></span><span class="mv-win-toggle" aria-hidden="true">⌄</span></summary>'+
      '<div class="mv-win-panel"><section><h3>Evaluaciones modulares</h3><div class="mv-win-bloques">'+[1,2,3,4].map(n=>link(base+'#/evaluacion/CERT%20BLOQ-0'+n,'Bloque '+n)).join('')+'</div></section>'+
      '<section><h3>Evaluación final</h3>'+link(base+'#/evaluacion/CERT%20TEC%20UNIF','Certificación técnica unificada',true)+'</section>'+
      '<section><h3>Plataformas de gestión</h3><div class="mv-win-tools">'+link(base,'WIN Detector')+link('https://eval-tecnicos-staging.vercel.app/','Dashboard de seguimiento')+'</div></section></div>';
    grid.appendChild(panel);
  }

  function inyectarSimulacroV383(){
    estilosV383();

    const seccion=document.getElementById("mv362CarpetaCertificacion");
    if(!seccion) return;

    const grid=seccion.querySelector(".mv55-resource-grid");
    if(!grid) return;
    if(document.getElementById("mv383SimulacroCertificacion")){ tarjetaEvaluaciones(grid); return; }

    const card=document.createElement("a");
    card.id="mv383SimulacroCertificacion";
    card.className="mv383-simulacro-card";
    card.href=LINK_SIMULACRO;
    card.target="_blank";
    card.rel="noopener noreferrer";
    card.setAttribute("data-resource-item","");
    card.setAttribute(
      "data-search",
      "SIMULACRO CERTIFICACION WIN PRACTICA EVALUACION EXAMEN"
    );
    card.innerHTML=`
      <span>📝</span>
      <b>SIMULACRO DE CERTIFICACIÓN</b>
      <small>Práctica previa a la evaluación · Disponible para todos</small>
    `;

    grid.appendChild(card);
    const guia=card.cloneNode(false);
    guia.id="mv383BalotarioWin";
    guia.href="https://drive.google.com/file/d/1ntQwUACbf0xLbOYK3ISrIFSZVgf_Bi-q/view?usp=sharing";
    guia.style.background="linear-gradient(135deg,#0f766e,#115e59)";
    guia.setAttribute("data-search","BALOTARIO WIN 2026 CERTIFICACION PREGUNTAS RESPUESTAS PDF");
    guia.innerHTML="<span>📖</span><b>BALOTARIO WIN 2026</b><small>Preguntas y respuestas correctas · PDF</small>";
    grid.appendChild(guia);
    tarjetaEvaluaciones(grid);
  }

  const mostrarAccesosBaseV383=window.mostrarAccesos;

  async function mostrarAccesosV383(){
    if(typeof mostrarAccesosBaseV383!=="function"){
      throw new Error("No se encontró el módulo base de Accesos.");
    }

    const resultado=await mostrarAccesosBaseV383.apply(this,arguments);
    inyectarSimulacroV383();
    requestAnimationFrame(inyectarSimulacroV383);
    setTimeout(inyectarSimulacroV383,80);
    return resultado;
  }

  window.mostrarAccesos=mostrarAccesosV383;
  try{ mostrarAccesos=mostrarAccesosV383; }catch(_){}

  // Respaldo para aperturas donde el DOM ya se encuentre construido.
  const observer=new MutationObserver(()=>{
    if(document.getElementById("mv362CarpetaCertificacion")){
      inyectarSimulacroV383();
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(inyectarSimulacroV383,150);

  window.MV383_SIMULACRO_CERTIFICACION_OK=true;
  console.log("MI VISUAL V383: simulacro de certificación habilitado.");
})();
