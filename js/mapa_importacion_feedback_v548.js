/* ================================================================
   MI VISUAL V549 - FEEDBACK GARANTIZADO AL REGISTRAR MAPA

   OBJETIVO
   - Mostrar avance visible desde el clic en "Registrar información".
   - No depender del orden interno V386/V393/V395 para mostrar actividad.
   - No modificar datos, no repetir POST y no alterar importarMapaOperativo.
   - Si V393 muestra su barra, este panel cede el control automáticamente.
================================================================ */
(function(){
  "use strict";
  if(window.MV549_MAPA_FEEDBACK_OK)return;
  window.MV549_MAPA_FEEDBACK_OK=true;

  let relojDirecto=null;
  let obsDirecto=null;
  let inicioDirecto=0;

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
      <div class="mv548-mapa-feedback-copy" data-mv548-copy>Comparando los estados WIN existentes. No cierre esta pantalla ni vuelva a pulsar Registrar información.</div>`;
    msg.parentElement.insertBefore(p,msg);
    return p;
  }

  function limpiarSeguimiento(){
    if(relojDirecto){clearInterval(relojDirecto);relojDirecto=null;}
    if(obsDirecto){obsDirecto.disconnect();obsDirecto=null;}
  }

  function actualizarDesdeMensaje(p){
    const msg=document.getElementById("moImportMsg");
    if(!p||!msg)return false;
    const t=texto(msg.textContent);
    const titulo=p.querySelector("[data-mv548-titulo]");
    const copy=p.querySelector("[data-mv548-copy]");

    if(/Registro confirmado|No hay estados mas recientes|No hay estados más recientes/i.test(t)){
      p.classList.remove("is-error");
      p.classList.add("is-ok","is-visible");
      if(titulo)titulo.textContent="Registro completado";
      if(copy)copy.textContent=t;
      limpiarSeguimiento();
      return true;
    }

    if(msg.classList.contains("mo-error")){
      p.classList.remove("is-ok");
      p.classList.add("is-error","is-visible");
      if(titulo)titulo.textContent="El registro no pudo completarse";
      if(copy)copy.textContent=t||"Revise el mensaje mostrado por MI VISUAL.";
      limpiarSeguimiento();
      return true;
    }

    if(/Registrando información/i.test(t)){
      if(titulo)titulo.textContent="Registrando información en MI VISUAL...";
      if(copy)copy.textContent="La validación terminó y la carga ya fue enviada al servidor. Espere la confirmación antes de salir.";
    }else if(/Control WIN/i.test(t)){
      if(titulo)titulo.textContent="Validación WIN completada. Preparando registro...";
      if(copy)copy.textContent=t;
    }
    return false;
  }

  function iniciarFeedbackDirecto(){
    const p=panel();
    if(!p)return;

    limpiarSeguimiento();
    inicioDirecto=Date.now();
    p.className="mv548-mapa-feedback is-visible";

    const titulo=p.querySelector("[data-mv548-titulo]");
    const copy=p.querySelector("[data-mv548-copy]");
    const tiempo=p.querySelector("[data-mv548-tiempo]");
    if(titulo)titulo.textContent="Validando la carga antes de registrar...";
    if(copy)copy.textContent="Comparando los estados WIN existentes. No cierre esta pantalla ni vuelva a pulsar Registrar información.";
    if(tiempo)tiempo.textContent="0 s";

    /*
      Este reloj nace desde el evento click, antes de ejecutar el onclick del
      botón. Por eso el usuario siempre ve actividad aunque una validación
      previa tarde varios segundos.
    */
    relojDirecto=setInterval(()=>{
      const t=p.querySelector("[data-mv548-tiempo]");
      if(t)t.textContent=Math.floor((Date.now()-inicioDirecto)/1000)+" s";

      const v393=document.getElementById("mv393MapaProgreso");
      if(v393&&v393.classList.contains("is-visible")){
        p.classList.remove("is-visible");
      }else{
        actualizarDesdeMensaje(p);
      }
    },400);

    const msg=document.getElementById("moImportMsg");
    if(msg&&typeof MutationObserver!=="undefined"){
      obsDirecto=new MutationObserver(()=>{
        const v393=document.getElementById("mv393MapaProgreso");
        if(v393&&v393.classList.contains("is-visible")){
          p.classList.remove("is-visible");
          return;
        }
        actualizarDesdeMensaje(p);
      });
      obsDirecto.observe(msg,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
    }
  }

  /*
    Captura el clic ANTES del onclick="moRegistrarImportacion()" del botón.
    Es únicamente visual: no cancela, no sustituye ni repite la función real.
  */
  document.addEventListener("click",function(e){
    const btn=e.target&&e.target.closest?e.target.closest("#moBtnImportar"):null;
    if(!btn||btn.disabled)return;
    iniciarFeedbackDirecto();
  },true);

  /* Respaldo: cuando se abra la vista de importación, prepara el panel oculto. */
  const vigilar=setInterval(()=>{
    if(document.getElementById("moImportMsg"))panel();
  },1000);
  setTimeout(()=>clearInterval(vigilar),30000);

  console.log("MI VISUAL V549: feedback de importación desde el clic activo");
})();
