/* MI VISUAL V361 - Carga diferida del Informe Gerencial */
(function(){
  "use strict";
  if(window.MV361_INFORME_GERENCIAL_LAZY_OK) return;
  let promesa = null;

  function permitido(){
    const perfil=String(localStorage.getItem("perfil")||"").toUpperCase().trim();
    return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA"].includes(perfil);
  }

  function cargar(){
    if(window.MV355_INFORME_GERENCIAL_OK) return Promise.resolve();
    if(promesa) return promesa;
    promesa=new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src="./js/informe_gerencial_v355.js?v=V361-RESUMEN-CONSOLIDADO";
      script.async=true;
      script.onload=resolve;
      script.onerror=()=>{
        promesa=null;
        reject(new Error("No se pudo cargar el Informe Gerencial."));
      };
      document.head.appendChild(script);
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