/* ============================================================
   MI VISUAL V490 - LIMPIEZA Y SEGURIDAD VISUAL VALIDACION TECNICA

   - RECABLEADO: elimina VTR/GAR y Bono/No Bono de su historial/resumen.
   - VTR/GAR: elimina Recableado/Otro y Automáticos de su Registro.
   - VTR/GAR: solo Jefatura con permiso VALIDAR ve/ejecuta acciones.
   - Supervisor, Gerencia y demás perfiles autorizados quedan en lectura.
   - No consulta API, Sheets ni Drive.
   - No modifica cache V341 ni lógica de registro del técnico.
============================================================ */
(function(){
  "use strict";
  if(window.MV490_VT_LIMPIEZA_OK) return;
  window.MV490_VT_LIMPIEZA_OK = true;

  let observerHistorial = null;
  let historialObservado = null;
  let timer = null;
  let guardasInstaladas = false;

  function norm(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function perfil(){ return norm(localStorage.getItem("perfil") || ""); }
  function modo(){ return window.MV488_VT_MODO || ""; }

  function esJefaturaValidadora(){
    const p = perfil();
    const perfilOk = p === "JEFATURA" || p === "JEFATURA GENERAL";
    if(!perfilOk) return false;
    if(typeof window.pmPuede === "function"){
      return !!window.pmPuede("VALIDACION TECNICA","VALIDAR");
    }
    return true;
  }

  function limpiarGrupos(root){
    if(!root) return;
    const m = modo();
    root.querySelectorAll(".vt-group").forEach(function(g){
      const s = norm(g.querySelector("summary")?.textContent || "");
      if(m === "RECABLEADO" && (s.indexOf("VTR (") === 0 || s.indexOf("GAR (") === 0)) g.remove();
      if(m === "VTRGAR" && (s.indexOf("RECABLEADO (") === 0 || s.indexOf("OTRO (") === 0)) g.remove();
    });
  }

  function limpiarKpis(root){
    if(!root) return;
    const m = modo();
    root.querySelectorAll(".vt-kpi").forEach(function(k){
      const etiqueta = norm(k.querySelector("span")?.textContent || "");
      if(m === "RECABLEADO" && (etiqueta === "BONO" || etiqueta === "NO BONO")){
        k.style.display = "none";
      }else if(m === "VTRGAR" && etiqueta === "AUTOMATICOS"){
        k.style.display = "none";
      }else{
        k.style.display = "";
      }
    });
  }

  function asegurarSoloLecturaVtrGar(){
    if(!document.querySelector(".mv489-wrap")) return;
    if(esJefaturaValidadora()) return;

    document.querySelectorAll(".mv489-detail > .mv489-actions").forEach(function(a){
      a.remove();
    });

    document.querySelectorAll(".mv489-detail").forEach(function(d){
      if(d.querySelector(".mv490-readonly")) return;
      const n = document.createElement("div");
      n.className = "mv489-readonly mv490-readonly";
      n.innerHTML = "<b>Solo lectura.</b> La validación y decisión final corresponde únicamente a Jefatura.";
      d.appendChild(n);
    });
  }

  function limpiarVista(){
    const m = modo();
    if(m !== "RECABLEADO" && m !== "VTRGAR"){
      asegurarSoloLecturaVtrGar();
      return;
    }

    const hist = document.getElementById("vtHistorial");
    if(hist){
      limpiarGrupos(hist);
      limpiarKpis(hist);
      hist.querySelectorAll(".vt-origin-summary").forEach(function(x){
        if(m === "RECABLEADO") x.remove();
      });
    }

    if(m === "VTRGAR"){
      document.getElementById("mv48725EntradaVtrGar")?.remove();
    }

    asegurarSoloLecturaVtrGar();
  }

  function filtrarHtmlTipos(html){
    const m = modo();
    if(m !== "RECABLEADO" && m !== "VTRGAR") return html;
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    limpiarGrupos(tmp);
    return tmp.innerHTML;
  }

  function instalarRenderTipos(){
    const base = window.renderTiposHistorialValidacion;
    if(typeof base !== "function") return false;
    if(base.__mv490) return true;

    const fn = function(){
      return filtrarHtmlTipos(base.apply(this,arguments));
    };
    fn.__mv490 = true;
    fn.__mv490Base = base;
    window.renderTiposHistorialValidacion = fn;
    try{ renderTiposHistorialValidacion = fn; }catch(_){}
    return true;
  }

  function instalarRenderHistorial(){
    const base = window.renderHistorialValidacionLocal;
    if(typeof base !== "function") return false;
    if(base.__mv490) return true;

    const fn = function(){
      const r = base.apply(this,arguments);
      setTimeout(limpiarVista,0);
      return r;
    };
    fn.__mv490 = true;
    fn.__mv490Base = base;
    window.renderHistorialValidacionLocal = fn;
    try{ renderHistorialValidacionLocal = fn; }catch(_){}
    return true;
  }

  function instalarGuardasAccion(){
    if(guardasInstaladas) return true;
    const nombres = [
      "mv489Responsabilidad",
      "mv489AbrirReasignar",
      "mv489GuardarReasignacion",
      "mv489ValidarBono"
    ];
    if(!nombres.every(function(n){ return typeof window[n] === "function"; })) return false;

    nombres.forEach(function(nombre){
      const base = window[nombre];
      if(base.__mv490Guard) return;
      const fn = function(){
        if(!esJefaturaValidadora()){
          alert("Solo Jefatura puede validar o modificar casos VTR/GAR.");
          return;
        }
        return base.apply(this,arguments);
      };
      fn.__mv490Guard = true;
      fn.__mv490Base = base;
      window[nombre] = fn;
      try{ eval(nombre + " = window['" + nombre + "']"); }catch(_){}
    });

    guardasInstaladas = true;
    return true;
  }

  function observarHistorial(){
    const hist = document.getElementById("vtHistorial");
    if(!hist) return false;
    if(historialObservado === hist) return true;

    if(observerHistorial) observerHistorial.disconnect();
    historialObservado = hist;
    observerHistorial = new MutationObserver(function(){
      clearTimeout(timer);
      timer = setTimeout(limpiarVista,0);
    });
    observerHistorial.observe(hist,{childList:true,subtree:true});
    return true;
  }

  function instalar(){
    instalarRenderTipos();
    instalarRenderHistorial();
    instalarGuardasAccion();
    observarHistorial();
    limpiarVista();
  }

  const hookAnterior = window.mv339Antes_mostrarValidacionTecnica;
  window.mv339Antes_mostrarValidacionTecnica = function(){
    if(typeof hookAnterior === "function"){
      try{ hookAnterior.apply(this,arguments); }catch(_){}
    }
    setTimeout(instalar,450);
    setTimeout(instalar,900);
    setTimeout(instalar,1600);
  };

  const obsPantalla = new MutationObserver(function(){
    if(document.getElementById("vtHistorial") || document.querySelector(".mv489-wrap")) instalar();
  });
  if(document.body) obsPantalla.observe(document.body,{childList:true,subtree:true});
})();
