/* ============================================================
   MI VISUAL V452 - BOTONES BONO SUPERVISOR EN FILA
   Capa únicamente visual.
   - PC/tablet: 4 acciones en una fila.
   - Móvil: 2 x 2.
   - No modifica cálculos, permisos, escalas ni habilitación de bonos.
============================================================ */
(function(){
  "use strict";
  if(window.MV452_BONO_LAYOUT_OK) return;
  window.MV452_BONO_LAYOUT_OK = true;

  function asegurarEstilo(){
    if(document.getElementById("mv452BonoLayoutStyle")) return;
    const style=document.createElement("style");
    style.id="mv452BonoLayoutStyle";
    style.textContent=`
      #mv325BonosPage .mv452-bono-actions{
        grid-column:1 / -1;
        width:100%;
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px!important;
        align-items:stretch!important;
      }
      #mv325BonosPage .mv452-bono-actions .mv321-config{
        width:100%!important;
        min-width:0!important;
        min-height:44px;
        margin:0!important;
        padding:9px 10px!important;
        white-space:normal;
        line-height:1.15;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
      }
      @media(max-width:700px){
        #mv325BonosPage .mv452-bono-actions{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
        #mv325BonosPage .mv452-bono-actions .mv321-config{
          font-size:12px!important;
          padding:9px 7px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function aplicar(){
    asegurarEstilo();
    const pagina=document.getElementById("mv325BonosPage");
    if(!pagina) return;
    const filtro=pagina.querySelector(".mv199-filtros-jefatura");
    if(!filtro) return;
    const contenedor=Array.from(filtro.children).find(el=>el.querySelector&&el.querySelector(".mv321-config"));
    if(contenedor) contenedor.classList.add("mv452-bono-actions");
  }

  const obs=new MutationObserver(aplicar);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("DOMContentLoaded",aplicar,{once:true});
  setTimeout(aplicar,0);
})();
