/* ==========================================================
   MI VISUAL V477A4 - DESPLEGABLES VTR/GAR CERRADOS
   - Periodos y sedes inician siempre contraidos.
   - Solo se despliegan cuando el usuario hace clic.
   - Solo presentacion: no consulta ni modifica backend.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V477A4_FRONT_ACTIVO)return;
  window.MI_VISUAL_V477A4_FRONT_ACTIVO=true;

  let instalado=false;

  function instalar(){
    if(instalado)return true;
    if(!window.MI_VISUAL_V477A3 || typeof boAgruparIndicesVg!=="function")return false;

    instalado=true;
    const base=boAgruparIndicesVg;

    boAgruparIndicesVg=function(){
      const html=String(base.apply(this,arguments)||"");
      // Quita solo el atributo HTML 'open'. No altera clases, contenido ni eventos.
      return html.replace(/\sopen(?=\s|>)/gi,"");
    };

    window.MI_VISUAL_V477A4={
      version:"V477A4-DESPLEGABLES-CERRADOS",
      soloPresentacion:true
    };

    return true;
  }

  function intentar(n){
    if(instalar())return;
    if(n>60)return;
    setTimeout(function(){intentar(n+1);},75);
  }

  intentar(0);

  const obs=new MutationObserver(function(){
    if(instalar())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
