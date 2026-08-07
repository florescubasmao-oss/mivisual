/* MI VISUAL V363 - visibilidad de MI DESEMPEÑO */
(function(){
  "use strict";

  const OCULTA="mv363-oculto-desempeno";

  function perfilTecnico(){
    return String(localStorage.getItem("perfil")||"")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .trim()==="TECNICO";
  }

  function asegurarEstilo(){
    if(document.getElementById("mv363EstiloMenuDesempeno")) return;
    const style=document.createElement("style");
    style.id="mv363EstiloMenuDesempeno";
    style.textContent=`.${OCULTA}{display:none!important}`;
    document.head.appendChild(style);
  }

  function aplicar(){
    asegurarEstilo();
    const tecnico=perfilTecnico();
    const nueva=document.getElementById("cardMiDesempeno");

    if(nueva){
      nueva.classList.toggle(OCULTA,!tecnico);
      if(tecnico && nueva.style.display==="none") nueva.style.removeProperty("display");
    }

    ["cardProduccion","cardEfectividad","cardRecableado","cardVTRGAR","cardRanking"]
      .forEach(id=>{
        const elemento=document.getElementById(id);
        if(elemento) elemento.classList.toggle(OCULTA,tecnico);
      });
  }

  window.addEventListener("load",()=>{
    aplicar();
    [300,800,1600,3000].forEach(ms=>setTimeout(aplicar,ms));
  });

  const observer=new MutationObserver(()=>aplicar());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.mv363AplicarMenuDesempeno=aplicar;
})();