/* ================================================================
   MI VISUAL V548 - FEEDBACK INMEDIATO AL REGISTRAR MAPA

   OBJETIVO
   - Mostrar actividad visible desde el primer clic en "Registrar información".
   - Cubrir la validación previa V487.8, que puede tardar antes de que el
     registrador base cambie el mensaje o desactive el botón.
   - No modifica datos, no repite POST y no altera importarMapaOperativo.
   - Cuando la barra V393 aparece, este aviso cede el control para no duplicar UI.
================================================================ */
(function(){
  "use strict";
  if(window.MV548_MAPA_FEEDBACK_OK)return;
  window.MV548_MAPA_FEEDBACK_OK=true;

  let instalado=false;

  function texto(v){return String(v==null?"":v).trim();}

  function estilos(){
    if(document.getElementById("mv548MapaFeedbackCss"))return;
    const s=document.createElement("style");
    s.id="mv548MapaFeedbackCss";
    s.textContent=`
      .mv548-mapa-feedback{display:none;margin:10px 0 5px;padding:10px 12px;border:1px solid #93c5fd;border-radius:12px;background:#eff6ff;color:#0f172a}
      .mv548-mapa-feedback.is-visible{display:block}
      .mv548-mapa-feedback.is-ok{border-color:#86efac;background:#f0fdf4}
      .mv548-mapa-feedback.is-error{border-color:#fca5a5;background:#fef2f2}
      .mv548-mapa-feedback-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:900}
      .mv548-mapa-feedback-time{font-size:11px;color:#64748b;white-space:nowrap}
      .mv548-mapa-feedback-track{height:8px;margin-top:8px;border-radius:999px;overflow:hidden;background:#dbeafe}
      .mv548-mapa-feedback-fill{height:100%;width:34%;border-radius:999px;background:linear-gradient(90deg,#2563eb,#06b6d4,#2563eb);background-size:200% 100%;animation:mv548Mover 1.1s linear infinite}
      .mv548-mapa-feedback.is-ok .mv548-mapa-feedback-fill{width:100%;background:#16a34a;animation:none}
      .mv548-mapa-feedback.is-error .mv548-mapa-feedback-fill{width:100%;background:#dc2626;animation:none}
      .mv548-mapa-feedback-copy{margin-top:7px;font-size:11px;font-weight:700;color:#475569;line-height:1.35}
      @keyframes mv548Mover{from{background-position:0 0}to{background-position:200% 0}}
    `;
    document.head.appendChild(s);
  }

  function panel(){
    estilos();
    let p=document.getElementById("mv548MapaFeedback");
    if(p)return p;
    const msg=document.getElementById("moImportMsg");
    if(!msg||!msg.parentElement)return null;
    p=document.createElement("div");
    p.id="mv548MapaFeedback";
    p.className="mv548-mapa-feedback";
    p.innerHTML=`
      <div class="mv548-mapa-feedback-head">
        <span data-mv548-titulo>Validando la carga antes de registrar...</span>
        <span class="mv548-mapa-feedback-time" data-mv548-tiempo>0 s</span>
      </div>
      <div class="mv548-mapa-feedback-track"><div class="mv548-mapa-feedback-fill"></div></div>
      <div class="mv548-mapa-feedback-copy" data-mv548-copy>Comparando estados WIN existentes. No cierre esta pantalla ni vuelva a pulsar Registrar información.</div>`;
    msg.parentElement.insertBefore(p,msg);
    return p;
  }

  function actualizarDesdeMensaje(p){
    const msg=document.getElementById("moImportMsg");
    if(!p||!msg)return false;
    const t=texto(msg.textContent);
    const titulo=p.querySelector("[data-mv548-titulo]");
    const copy=p.querySelector("[data-mv548-copy]");

    if(/Registro confirmado|No hay estados mas recientes|No hay estados más recientes/i.test(t)){
      p.classList.remove("is-error");p.classList.add("is-ok","is-visible");
      if(titulo)titulo.textContent="Registro completado";
      if(copy)copy.textContent=t;
      return true;
    }
    if(msg.classList.contains("mo-error")){
      p.classList.remove("is-ok");p.classList.add("is-error","is-visible");
      if(titulo)titulo.textContent="El registro no pudo confirmarse";
      if(copy)copy.textContent=t||"Revise el mensaje mostrado por MI VISUAL.";
      return true;
    }
    if(/Registrando información/i.test(t)){
      if(titulo)titulo.textContent="Registrando información en MI VISUAL...";
      if(copy)copy.textContent="La carga ya fue enviada al servidor. Espere la confirmación antes de salir.";
    }else if(/Control WIN/i.test(t)){
      if(titulo)titulo.textContent="Validación WIN completada. Preparando registro...";
      if(copy)copy.textContent=t;
    }
    return false;
  }

  async function registrarConFeedback(){
    const original=registrarConFeedback.__original;
    if(typeof original!=="function")return;

    const p=panel();
    const inicio=Date.now();
    let reloj=null,obs=null;
    if(p){
      p.className="mv548-mapa-feedback is-visible";
      const titulo=p.querySelector("[data-mv548-titulo]");
      const copy=p.querySelector("[data-mv548-copy]");
      const tiempo=p.querySelector("[data-mv548-tiempo]");
      if(titulo)titulo.textContent="Validando la carga antes de registrar...";
      if(copy)copy.textContent="Comparando estados WIN existentes. No cierre esta pantalla ni vuelva a pulsar Registrar información.";
      if(tiempo)tiempo.textContent="0 s";
      reloj=setInterval(()=>{
        const t=p.querySelector("[data-mv548-tiempo]");
        if(t)t.textContent=Math.floor((Date.now()-inicio)/1000)+" s";
        const v393=document.getElementById("mv393MapaProgreso");
        if(v393&&v393.classList.contains("is-visible"))p.classList.remove("is-visible");
      },400);
      const msg=document.getElementById("moImportMsg");
      if(msg&&typeof MutationObserver!=="undefined"){
        obs=new MutationObserver(()=>{
          const v393=document.getElementById("mv393MapaProgreso");
          if(v393&&v393.classList.contains("is-visible")){p.classList.remove("is-visible");return;}
          actualizarDesdeMensaje(p);
        });
        obs.observe(msg,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
      }
    }

    try{
      return await original.apply(this,arguments);
    }finally{
      if(obs)obs.disconnect();
      if(reloj)clearInterval(reloj);
      const v393=document.getElementById("mv393MapaProgreso");
      if(p&&!(v393&&v393.classList.contains("is-visible"))){
        actualizarDesdeMensaje(p);
        const t=p.querySelector("[data-mv548-tiempo]");
        if(t)t.textContent=Math.floor((Date.now()-inicio)/1000)+" s";
      }
    }
  }

  function instalar(){
    if(instalado)return true;
    const actual=window.moRegistrarImportacion;
    if(typeof actual!=="function")return false;

    /* Espera a que V487.8 quede como capa externa; así V548 será la última capa
       y mostrará feedback ANTES de la comparación temporal. */
    if(!actual.__mv386SoloP)return false;
    if(actual.__mv548Feedback){instalado=true;return true;}

    registrarConFeedback.__mv548Feedback=true;
    registrarConFeedback.__original=actual;
    window.moRegistrarImportacion=registrarConFeedback;
    try{moRegistrarImportacion=registrarConFeedback;}catch(_){}
    instalado=true;
    console.log("MI VISUAL V548: feedback inmediato de importación Mapa activo");
    return true;
  }

  const timer=setInterval(()=>{if(instalar())clearInterval(timer);},200);
  document.addEventListener("click",()=>setTimeout(instalar,60),true);
  setTimeout(instalar,250);
})();
