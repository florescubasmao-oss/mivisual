/* ============================================================
   MI VISUAL V491 - RETIRO FLUJO LEGADO CALIFICAR VTR/GAR

   Motivo:
   - El acceso independiente "CALIFICAR VTR/GAR" pertenecía al flujo
     histórico ligado a Base Operativa / Partner.
   - La gestión vigente de VTR/GAR se realiza dentro de Validación Técnica
     y la detección/propuesta usa la data WIN definida para el proyecto.

   Alcance estricto:
   - Retira únicamente la tarjeta/acceso legado.
   - Neutraliza llamadas residuales a mostrarAsignacionesVtrGar().
   - Redirige esas llamadas a Validación Técnica > VTR/GAR.
   - NO borra hojas ni históricos.
   - NO modifica Producción, Efectividad, Recableado, Ranking ni porcentajes.
============================================================ */
(function(){
  "use strict";

  if(window.MV491_RETIRO_VTRGAR_LEGADO_OK) return;
  window.MV491_RETIRO_VTRGAR_LEGADO_OK = true;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esAccesoLegado(el){
    if(!el || el.nodeType !== 1) return false;
    const texto = norm(el.textContent || "");
    const onclick = norm(el.getAttribute && el.getAttribute("onclick") || "");
    return texto.includes("CALIFICAR VTR/GAR") ||
           texto.includes("CALIFICACION VTR/GAR") ||
           onclick.includes("MOSTRARASIGNACIONESVTRGAR");
  }

  function retirarTarjetas(){
    const candidatos = document.querySelectorAll(
      '[onclick],button,a,.card,.adm-card,.adm104-card,.adm104-option,.adm-option'
    );

    candidatos.forEach(function(el){
      if(!esAccesoLegado(el)) return;

      const objetivo = el.closest(
        '.adm104-card,.adm-card,.adm104-option,.adm-option,.card,[onclick],button,a'
      ) || el;

      if(objetivo && objetivo.id !== "cardVTRGAR"){
        objetivo.remove();
      }
    });
  }

  function abrirVigente(){
    if(typeof window.mostrarValidacionTecnica === "function"){
      window.mostrarValidacionTecnica();
      setTimeout(function(){
        if(typeof window.mv488AbrirVtrGar === "function"){
          window.mv488AbrirVtrGar();
        }else if(typeof window.mv489AbrirRegistroVtrGar === "function"){
          window.mv489AbrirRegistroVtrGar();
        }
      },500);
      return;
    }

    if(typeof window.volverInicio === "function") window.volverInicio();
  }

  function neutralizarFuncionLegada(){
    const actual = window.mostrarAsignacionesVtrGar;
    if(typeof actual !== "function" || actual.__mv491Retirada) return false;

    const reemplazo = function(){
      abrirVigente();
      return Promise.resolve({
        ok:true,
        retirado:true,
        version:"V491",
        destino:"VALIDACION_TECNICA_VTRGAR"
      });
    };
    reemplazo.__mv491Retirada = true;
    reemplazo.__mv491Base = actual;

    window.mostrarAsignacionesVtrGar = reemplazo;
    try{ mostrarAsignacionesVtrGar = reemplazo; }catch(_){}
    return true;
  }

  function aplicar(){
    retirarTarjetas();
    neutralizarFuncionLegada();
  }

  aplicar();
  setTimeout(aplicar,250);
  setTimeout(aplicar,900);
  setTimeout(aplicar,1800);

  if(document.documentElement){
    const obs = new MutationObserver(function(){
      aplicar();
    });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
