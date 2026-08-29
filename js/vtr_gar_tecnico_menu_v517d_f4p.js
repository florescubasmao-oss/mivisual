/* ============================================================
   MI VISUAL V517D F4Q - TECNICO DIRECTO A RECABLEADO
   29/08/2026

   Alcance ESTRICTO / SOLO FRONTEND:
   - Perfil TECNICO: al abrir Validacion Tecnica NO muestra selector intermedio.
   - Entra directamente al flujo actual de RECABLEADO.
   - Ese flujo conserva sus tipos actuales, incluidos GAR/VTR cuando corresponde.
   - No modifica formulario, guardado, API, Sheets, Produccion, Ranking ni permisos.
   - Jefatura, Supervisor, Gerencia y Admin conservan la pantalla de seleccion.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4Q_TECNICO_DIRECTO_OK) return;
  window.MV517D_F4Q_TECNICO_DIRECTO_OK = true;
  window.MV517D_F4P_TECNICO_MENU_OK = true;

  /* Evita que una copia antigua F4O vuelva a alterar la vista del Tecnico. */
  window.MV517D_F4O_TECNICO_RESTAURADO_OK = true;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esTecnico(){
    return norm(localStorage.getItem("perfil") || "") === "TECNICO";
  }

  function esSelectorValidacion(root){
    if(!root) return false;
    const t = norm(root.textContent || "");
    if(t.indexOf("VALIDACION TECNICA") < 0) return false;
    if(t.indexOf("RECABLEADO") < 0) return false;
    return t.indexOf("SELECCIONA EL TIPO DE GESTION") >= 0 ||
           t.indexOf("FLUJO ACTUAL CONSERVADO") >= 0 ||
           !!root.querySelector('[onclick*="mv488AbrirRecableado"]');
  }

  function botonRecableado(root){
    if(!root) return null;
    return root.querySelector('[onclick*="mv488AbrirRecableado"]') ||
           root.querySelector('[onclick*="AbrirRecableado"]');
  }

  let ultimoSalto = 0;
  let timer = null;

  function entrarDirecto(){
    if(!esTecnico()) return;
    const root = document.getElementById("pantalla");
    if(!esSelectorValidacion(root)) return;

    const ahora = Date.now();
    if(ahora - ultimoSalto < 1200) return;
    ultimoSalto = ahora;

    /* Oculta solo el selector durante el salto para que el Tecnico vea el
       formulario directamente y no la tarjeta intermedia. */
    root.style.visibility = "hidden";

    let ejecutado = false;
    const btn = botonRecableado(root);
    if(btn && typeof btn.click === "function"){
      try{
        btn.click();
        ejecutado = true;
      }catch(_){ }
    }

    if(!ejecutado && typeof window.mv488AbrirRecableado === "function"){
      try{
        window.mv488AbrirRecableado();
        ejecutado = true;
      }catch(_){ }
    }

    /* Si el modulo termino de cargar un instante despues, reintenta una vez. */
    if(!ejecutado){
      setTimeout(function(){
        if(!esTecnico()) return;
        const r = document.getElementById("pantalla");
        if(!esSelectorValidacion(r)) return;
        const b = botonRecableado(r);
        try{
          if(b && typeof b.click === "function") b.click();
          else if(typeof window.mv488AbrirRecableado === "function") window.mv488AbrirRecableado();
        }catch(_){ }
      },180);
    }

    [120,300,650].forEach(function(ms){
      setTimeout(function(){
        const r = document.getElementById("pantalla");
        if(r) r.style.visibility = "";
      },ms);
    });
  }

  function programar(ms){
    clearTimeout(timer);
    timer = setTimeout(entrarDirecto,ms == null ? 0 : ms);
  }

  if(document.body){
    const obs = new MutationObserver(function(){
      if(esTecnico()) programar(0);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;
    const card = ev.target && ev.target.closest ? ev.target.closest("#cardValidacionTecnica") : null;
    if(card){
      setTimeout(entrarDirecto,0);
      setTimeout(entrarDirecto,80);
      setTimeout(entrarDirecto,220);
      setTimeout(entrarDirecto,500);
    }
  },true);

  [0,80,220,500,1000].forEach(function(ms){
    setTimeout(entrarDirecto,ms);
  });

  console.log("MI VISUAL V517D F4Q: Tecnico entra directo al flujo Recableado desde Validacion Tecnica.");
})();
