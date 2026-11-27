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
      #mvEvaluacionesWin{grid-column:1/-1;border-radius:15px;background:#183961;color:white;border:1px solid #527baa}
      #mvEvaluacionesWin summary{padding:16px;cursor:pointer;font-size:16px}
      #mvEvaluacionesWin summary small{display:block;margin:5px 0 0 20px;color:#daeafb}
      .mv-win-panel{display:grid;gap:8px;padding:0 16px 16px}
      .mv-win-panel b{font-size:13px;margin-top:6px;color:#c8e4ff}
      .mv-win-panel a{display:block;background:#f1f7ff;color:#12365d;border-radius:8px;padding:10px 12px;text-decoration:underline;font-weight:600}
      .mv-win-bloques{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px}
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
    const link=(url,label)=>'<a target="_blank" rel="noopener noreferrer" href="'+url+'">'+label+' ↗</a>';
    panel.innerHTML='<summary><strong>📋 Evaluaciones WIN</strong><small>Bloques, certificación y seguimiento</small></summary>'+
      '<div class="mv-win-panel"><b>Evaluaciones modulares</b><div class="mv-win-bloques">'+[1,2,3,4].map(n=>link(base+'#/evaluacion/CERT%20BLOQ-0'+n,'Bloque '+n)).join('')+'</div>'+
      '<b>Evaluación de certificación</b>'+link(base+'#/evaluacion/CERT%20TEC%20UNIF','Certificación técnica unificada')+
      '<b>Aplicativos</b>'+link(base,'WIN Detector')+link('https://eval-tecnicos-staging.vercel.app/','Dashboard de seguimiento')+'</div>';
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
