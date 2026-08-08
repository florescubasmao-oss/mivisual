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

  function inyectarSimulacroV383(){
    estilosV383();

    const seccion=document.getElementById("mv362CarpetaCertificacion");
    if(!seccion || document.getElementById("mv383SimulacroCertificacion")) return;

    const grid=seccion.querySelector(".mv55-resource-grid");
    if(!grid) return;

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
