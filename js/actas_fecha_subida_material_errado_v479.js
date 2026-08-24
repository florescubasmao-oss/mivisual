/* ============================================================
   MI VISUAL V479 - ACTAS / FECHA DE SUBIDA + MATERIAL ERRADO

   Alcance estricto:
   - Solo presentación/interacción del frontend de Gestión de Actas.
   - Muestra FECHA_REGISTRO como etiqueta "SUBIDA" separada de FECHA_GESTION.
   - Añade "MATERIAL ERRADO" al selector V403 de motivos de observación.
   - No agrega consultas, no escribe datos por sí mismo y no modifica Apps Script.
   - Conserva V392/V393/V396/V402/V403 y optimizaciones V455.
============================================================ */
(function(){
  "use strict";

  if(window.MV479_ACTAS_FECHA_MATERIAL_CARGADO) return;
  window.MV479_ACTAS_FECHA_MATERIAL_CARGADO = true;

  let instalado = false;
  let intentos = 0;
  let timer = null;

  function esc(v){
    if(typeof window.limpiarHtmlActas === "function") return window.limpiarHtmlActas(v || "");
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function normalizar(v){
    return String(v == null ? "" : v)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function fechaSubidaVisible(a){
    const valor = a && a.fechaRegistro;
    if(!valor) return "";
    try{
      if(typeof window.fechaVisibleActas === "function"){
        return window.fechaVisibleActas(valor) || "";
      }
    }catch(_){}
    return String(valor || "").trim();
  }

  function etiquetaSubida(a){
    const fecha = fechaSubidaVisible(a);
    if(!fecha) return "";
    const hora = String(a && a.horaRegistro || "").trim();
    const titulo = hora ? `Fecha de subida: ${fecha} · ${hora}` : `Fecha de subida: ${fecha}`;
    return `<span class="mv479-acta-subida" title="${esc(titulo)}">⬆ SUBIDA ${esc(fecha)}</span>`;
  }

  function instalarEstilos(){
    if(document.getElementById("mv479ActasCss")) return;
    const s = document.createElement("style");
    s.id = "mv479ActasCss";
    s.textContent = `
      .mv479-acta-subida{
        display:inline-flex;align-items:center;gap:4px;
        margin:4px 0 0 5px;padding:4px 8px;
        border:1px solid #93c5fd;border-radius:999px;
        background:#eff6ff;color:#1e3a8a;
        font-size:10px;font-weight:900;line-height:1.1;
        white-space:nowrap;vertical-align:middle;
      }
      @media(max-width:520px){
        .mv479-acta-subida{font-size:9px;padding:4px 7px;margin-left:3px}
      }
    `;
    document.head.appendChild(s);
  }

  function insertarMaterialErrado(){
    const modal = document.getElementById("mv403ObservacionModal");
    if(!modal || modal.querySelector('input[name="mv403Motivo"][value="MATERIAL ERRADO"]')) return !!modal;

    const radioOtro = modal.querySelector("#mv403RadioOtro");
    const etiquetaOtro = radioOtro && radioOtro.closest(".mv403-motivo");
    const contenedor = etiquetaOtro && etiquetaOtro.parentElement;
    if(!radioOtro || !etiquetaOtro || !contenedor) return false;

    const label = document.createElement("label");
    label.className = "mv403-motivo";
    label.innerHTML = '<input type="radio" name="mv403Motivo" value="MATERIAL ERRADO"><span>MATERIAL ERRADO</span>';
    contenedor.insertBefore(label, etiquetaOtro);

    const radio = label.querySelector("input");
    radio.addEventListener("change", function(){
      const otroWrap = modal.querySelector("#mv403OtroWrap");
      const error = modal.querySelector("#mv403Error");
      if(otroWrap) otroWrap.style.display = "none";
      if(error) error.style.display = "none";
    });
    return true;
  }

  function envolverValidacion(){
    const base = window.validarActa;
    if(typeof base !== "function") return false;
    if(base.__mv479MaterialErrado) return true;

    async function validarActaV479(id, resultado){
      if(normalizar(resultado) !== "OBSERVADO"){
        return base.apply(this, arguments);
      }

      let observador = null;
      try{
        observador = new MutationObserver(function(){
          if(insertarMaterialErrado() && observador){
            observador.disconnect();
            observador = null;
          }
        });
        observador.observe(document.body,{childList:true,subtree:true});

        const promesa = base.apply(this, arguments);
        insertarMaterialErrado();
        return await promesa;
      }finally{
        if(observador) observador.disconnect();
      }
    }

    validarActaV479.__mv479MaterialErrado = true;
    window.validarActa = validarActaV479;
    try{ validarActa = validarActaV479; }catch(_){}
    return true;
  }

  function envolverBadge(){
    const base = window.badgeActa;
    if(typeof base !== "function") return false;
    if(base.__mv479FechaSubida) return true;

    function badgeActaV479(a){
      const htmlBase = base.apply(this, arguments);
      const subida = etiquetaSubida(a);
      if(!subida) return htmlBase;

      // V393 puede añadir un <details> con el motivo observado. La etiqueta
      // SUBIDA debe quedar en la zona superior de estados, antes de ese detalle.
      const marcador = '<details class="mv393-acta-obs">';
      if(String(htmlBase).includes(marcador)){
        return String(htmlBase).replace(marcador, subida + marcador);
      }
      return String(htmlBase) + subida;
    }
    badgeActaV479.__mv479FechaSubida = true;

    window.badgeActa = badgeActaV479;
    try{ badgeActa = badgeActaV479; }catch(_){}
    return true;
  }

  function instalar(){
    if(instalado) return true;

    // Espera a que terminen de cargar las capas vigentes de Actas.
    if(!window.MV403_MOTIVOS_OBSERVACION_OK ||
       typeof window.badgeActa !== "function" ||
       typeof window.validarActa !== "function"){
      return false;
    }

    instalarEstilos();
    if(!envolverBadge()) return false;
    if(!envolverValidacion()) return false;

    instalado = true;
    window.MV479_ACTAS_FECHA_MATERIAL_OK = true;
    console.log("MI VISUAL V479: fecha de subida y motivo MATERIAL ERRADO habilitados.");
    return true;
  }

  function reintentar(){
    if(instalar()){
      if(timer) clearInterval(timer);
      timer = null;
      return;
    }
    intentos++;
    if(intentos >= 120 && timer){
      clearInterval(timer);
      timer = null;
    }
  }

  reintentar();
  if(!instalado) timer = setInterval(reintentar,100);

  // Gestión de Actas es lazy: si se abre después, se instala al terminar V403.
  const observer = new MutationObserver(function(muts){
    muts.forEach(function(m){
      Array.from(m.addedNodes || []).forEach(function(n){
        if(!n || n.tagName !== "SCRIPT") return;
        const src = String(n.src || "");
        if(src.includes("actas_motivos_observacion_v403.js")){
          n.addEventListener("load",function(){
            intentos = 0;
            setTimeout(function(){
              if(!instalado && !timer) timer = setInterval(reintentar,100);
              reintentar();
            },0);
          },{once:true});
        }
      });
    });
  });

  function iniciarObserver(){
    if(!document.documentElement) return;
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",iniciarObserver,{once:true});
  else iniciarObserver();
})();