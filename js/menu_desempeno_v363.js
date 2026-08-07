/* ============================================================
   MI VISUAL V364 - Menú Técnico: MI DESEMPEÑO
   - MI DESEMPEÑO se ubica al inicio del bloque operativo.
   - Conserva el mismo tamaño de Observaciones.
   - Oculta únicamente en Técnico las tarjetas individuales:
     Producción, Efectividad, Recableado, VTR/GAR y Ranking.
============================================================ */
(function(){
  "use strict";

  const CLASE_OCULTA = "mv364-oculto-desempeno";
  const IDS_OCULTAR = [
    "cardProduccion",
    "cardEfectividad",
    "cardRecableado",
    "cardVTRGAR",
    "cardRanking"
  ];

  let aplicando = false;
  let pendiente = false;

  function normalizar(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esTecnico(){
    return normalizar(localStorage.getItem("perfil")) === "TECNICO";
  }

  function asegurarEstilo(){
    if(document.getElementById("mv364EstiloMenuDesempeno")) return;

    const style = document.createElement("style");
    style.id = "mv364EstiloMenuDesempeno";
    style.textContent = `
      .${CLASE_OCULTA}{
        display:none!important;
      }

      #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno{
        grid-column:span 6!important;
        min-width:0!important;
        min-height:78px!important;
        height:78px!important;
        padding:8px 8px!important;
        border-radius:16px!important;
        gap:5px!important;
        box-sizing:border-box!important;
        background:linear-gradient(135deg,#1d4ed8,#7c3aed)!important;
        box-shadow:0 10px 24px rgba(37,99,235,.30)!important;
      }

      #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno span{
        font-size:25px!important;
        line-height:1!important;
        margin:0!important;
      }

      #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno b{
        font-size:11px!important;
        line-height:1.1!important;
        text-align:center!important;
      }

      #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno:hover{
        transform:translateY(-1px);
        filter:brightness(1.06);
      }

      @media(max-width:420px){
        #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno{
          min-height:78px!important;
          height:78px!important;
          padding:7px 6px!important;
        }
        #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno span{
          font-size:23px!important;
        }
        #menuPrincipal.mv196-tecnico-menu #cardMiDesempeno b{
          font-size:10px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function moverMiDesempenoAlInicio(){
    const card = document.getElementById("cardMiDesempeno");
    const main = document.getElementById("mv55MainModules");
    const observaciones = document.getElementById("cardObservaciones");

    if(!card || !main) return;

    card.classList.remove("mv55-resource-card");
    card.classList.add("mv55-main-card");

    if(observaciones && observaciones.parentElement === main){
      if(card.parentElement !== main || card.nextElementSibling !== observaciones){
        main.insertBefore(card, observaciones);
      }
    }else if(card.parentElement !== main || main.firstElementChild !== card){
      main.insertBefore(card, main.firstElementChild);
    }
  }

  function aplicar(){
    if(aplicando) return;
    aplicando = true;

    try{
      asegurarEstilo();

      const tecnico = esTecnico();
      const card = document.getElementById("cardMiDesempeno");

      if(card){
        card.classList.toggle(CLASE_OCULTA,!tecnico);

        if(tecnico){
          moverMiDesempenoAlInicio();
          card.style.setProperty("display","flex","important");
        }else{
          card.style.setProperty("display","none","important");
        }
      }

      IDS_OCULTAR.forEach(id=>{
        const elemento = document.getElementById(id);
        if(!elemento) return;

        elemento.classList.toggle(CLASE_OCULTA,tecnico);

        if(tecnico){
          elemento.style.setProperty("display","none","important");
        }else{
          elemento.classList.remove(CLASE_OCULTA);
        }
      });
    }finally{
      aplicando = false;
    }
  }

  function programar(){
    if(pendiente) return;
    pendiente = true;

    requestAnimationFrame(()=>{
      pendiente = false;
      aplicar();
    });
  }

  window.addEventListener("load",()=>{
    aplicar();
    [150,400,900,1600,3000].forEach(ms=>setTimeout(aplicar,ms));
  });

  const observer = new MutationObserver(programar);
  observer.observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["style","class"]
  });

  window.mv364AplicarMenuDesempeno = aplicar;
})();