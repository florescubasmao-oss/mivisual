/* MI VISUAL V475 - Carga diferida del Informe Gerencial + Excel por sede */
(function(){
  "use strict";
  if(window.MV361_INFORME_GERENCIAL_LAZY_OK) return;
  let promesa = null;

  function permitido(){
    const perfil=String(localStorage.getItem("perfil")||"").toUpperCase().trim();
    return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA"].includes(perfil);
  }

  function cargarScript(src,comprobar,mensaje){
    if(comprobar()) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const ruta=src.split("?")[0];
      const existente=Array.from(document.scripts).find(s=>s.src && s.src.includes(ruta.replace(/^\.\//,"")));
      if(existente){
        if(comprobar()) return resolve();
        existente.addEventListener("load",resolve,{once:true});
        existente.addEventListener("error",()=>reject(new Error(mensaje)),{once:true});
        return;
      }
      const script=document.createElement("script");
      script.src=src;
      script.async=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(mensaje));
      document.head.appendChild(script);
    });
  }

  function cargar(){
    if(window.MV355_INFORME_GERENCIAL_OK && window.MV475_INFORME_EXCEL_OK) return Promise.resolve();
    if(promesa) return promesa;

    promesa=(async()=>{
      await cargarScript(
        "./js/informe_gerencial_v355.js?v=V361-RESUMEN-CONSOLIDADO",
        ()=>!!window.MV355_INFORME_GERENCIAL_OK,
        "No se pudo cargar el Informe Gerencial."
      );

      await cargarScript(
        "./js/informe_gerencial_excel_v475.js?v=V475-PERIODO-SEDE-TODOS-INDICADORES",
        ()=>!!window.MV475_INFORME_EXCEL_OK,
        "No se pudo cargar la mejora Excel del Dashboard."
      );
    })().catch(error=>{
      promesa=null;
      throw error;
    });

    return promesa;
  }

  window.mv355RenderBotonInformeGerencial=function(){
    if(!permitido()) return "";
    return `<button type="button" onclick="mv361AbrirInformeGerencialLazy()" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:13px;padding:12px 17px;margin:12px 0 4px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.24);">📄 Informe gerencial PDF / Excel</button>`;
  };

  window.mv361AbrirInformeGerencialLazy=async function(){
    try{
      await cargar();
      if(typeof window.mv355AbrirInformeGerencial==="function") {
        window.mv355AbrirInformeGerencial();
      }
    }catch(error){
      alert(error.message || "No se pudo abrir el informe.");
    }
  };

  window.MV361_INFORME_GERENCIAL_LAZY_OK=true;
})();