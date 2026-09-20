(function(){
  const embedded=new URLSearchParams(location.search).get("embed")==="1";
  if(!embedded)return;
  document.documentElement.classList.add("mv-shell-embedded");
  const style=document.createElement("style");
  style.textContent=`
    html.mv-shell-embedded body{background:#f5f7fb!important;padding:10px!important}
    html.mv-shell-embedded .wrap,html.mv-shell-embedded main{max-width:none!important}
    html.mv-shell-embedded h1{color:#102033!important}
    html.mv-shell-embedded .lead{color:#64748b!important}
    html.mv-shell-embedded #loginForm,
    html.mv-shell-embedded a[href*="recuperar.html"],
    html.mv-shell-embedded button[onclick="login()"],
    html.mv-shell-embedded button[onclick="logout()"]{display:none!important}
    html.mv-shell-embedded #email,
    html.mv-shell-embedded #password{display:none!important}
  `;
  document.head.appendChild(style);
  addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll("button").forEach(b=>{
      const t=(b.textContent||"").trim().toLowerCase();
      if(t==="ingresar"||t==="iniciar sesión"||t==="cerrar sesión")b.style.display="none";
    });
    document.querySelectorAll("#loginForm").forEach(e=>e.setAttribute("hidden",""));
    window.parent?.postMessage({type:"mv-module-ready",title:document.title,path:location.pathname},"*");
  });
  addEventListener("error",e=>window.parent?.postMessage({type:"mv-module-error",message:String(e.message||e.error||"Error de módulo")},"*"));
})();