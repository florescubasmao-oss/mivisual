/* ============================================================
   MI VISUAL V393 - Mapa Operativo: avance de registro
   - No cambia importarMapaOperativo ni la estructura enviada.
   - Muestra etapas reales: preparación -> servidor -> filtros.
   - Cronómetro visible durante el registro.
   - Conserva validación V386 de cuadrillas P#.
============================================================ */
(function(){
  "use strict";
  if(window.MV393_MAPA_PROGRESO_OK) return;

  const registrarBase = window.moRegistrarImportacion;
  if(typeof registrarBase !== "function") return;

  function estilos(){
    if(document.getElementById("mv393MapaProgresoCss")) return;
    const s=document.createElement("style");
    s.id="mv393MapaProgresoCss";
    s.textContent=`
      .mv393-map-progress{
        margin:12px 0 4px;
        border:1px solid #bfdbfe;
        background:#eff6ff;
        color:#0f172a;
        border-radius:13px;
        padding:11px 12px;
        display:none;
      }
      .mv393-map-progress.is-visible{display:block}
      .mv393-map-progress.is-ok{border-color:#86efac;background:#f0fdf4}
      .mv393-map-progress.is-error{border-color:#fca5a5;background:#fef2f2}
      .mv393-map-progress-head{
        display:flex;justify-content:space-between;gap:10px;align-items:center;
        font-weight:900;font-size:13px;
      }
      .mv393-map-progress-head small{font-size:11px;color:#64748b}
      .mv393-map-progress-bar{
        height:8px;background:#dbeafe;border-radius:999px;overflow:hidden;margin:9px 0;
        position:relative;
      }
      .mv393-map-progress-fill{
        height:100%;width:28%;border-radius:999px;
        background:linear-gradient(90deg,#2563eb,#06b6d4,#2563eb);
        background-size:200% 100%;
        animation:mv393MapaMover 1.2s linear infinite;
        transition:width .25s ease;
      }
      .mv393-map-progress.is-ok .mv393-map-progress-fill{
        width:100%!important;background:#16a34a;animation:none;
      }
      .mv393-map-progress.is-error .mv393-map-progress-fill{
        width:100%!important;background:#dc2626;animation:none;
      }
      .mv393-map-progress-copy{
        font-size:12px;font-weight:800;color:#334155;line-height:1.4;
      }
      @keyframes mv393MapaMover{
        from{background-position:0 0}to{background-position:200% 0}
      }
    `;
    document.head.appendChild(s);
  }

  function panel(){
    estilos();
    let p=document.getElementById("mv393MapaProgreso");
    if(p) return p;

    const msg=document.getElementById("moImportMsg");
    if(!msg || !msg.parentElement) return null;

    p=document.createElement("div");
    p.id="mv393MapaProgreso";
    p.className="mv393-map-progress";
    p.innerHTML=`
      <div class="mv393-map-progress-head">
        <span id="mv393MapaEtapa">Preparando registro...</span>
        <small id="mv393MapaTiempo">0 s</small>
      </div>
      <div class="mv393-map-progress-bar">
        <div id="mv393MapaFill" class="mv393-map-progress-fill"></div>
      </div>
      <div id="mv393MapaDetalle" class="mv393-map-progress-copy"></div>
    `;
    msg.parentElement.insertBefore(p,msg);
    return p;
  }

  function cantidad(){
    try{
      return Array.isArray(moImportacion) ? moImportacion.length : 0;
    }catch(_){ return 0; }
  }

  function estado(etapa,detalle,ancho){
    const p=panel(); if(!p) return;
    p.classList.add("is-visible");
    p.classList.remove("is-ok","is-error");

    const e=document.getElementById("mv393MapaEtapa");
    const d=document.getElementById("mv393MapaDetalle");
    const f=document.getElementById("mv393MapaFill");
    if(e)e.textContent=etapa;
    if(d)d.textContent=detalle||"";
    if(f && ancho) f.style.width=ancho;
  }

  async function registrarV393(){
    const total=cantidad();
    if(!total) return await registrarBase.apply(this,arguments);

    const p=panel();
    const inicio=Date.now();
    let timer=null;

    estado(
      "1 de 3 · Preparando información",
      `${total} registros listos. Validando la carga antes de enviarla.`,
      "18%"
    );

    await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,40)));

    timer=setInterval(()=>{
      const e=document.getElementById("mv393MapaTiempo");
      if(e)e.textContent=`${Math.floor((Date.now()-inicio)/1000)} s`;
    },500);

    estado(
      "2 de 3 · Registrando información",
      `Enviando ${total} registros a MI VISUAL. No cierre esta pantalla.`,
      "52%"
    );

    try{
      // Incluye la protección V386: si hay una cuadrilla que no comienza por P#,
      // esa función bloquea la carga antes de llegar al servidor.
      const resultado=await registrarBase.apply(this,arguments);

      const msg=document.getElementById("moImportMsg");
      const correcto=!!msg && (
        msg.classList.contains("mo-ok") ||
        /Registro confirmado/i.test(msg.textContent||"")
      );

      if(correcto){
        estado(
          "3 de 3 · Registro completado",
          "Información registrada. Los filtros y la última actualización quedaron sincronizados.",
          "100%"
        );
        if(p)p.classList.add("is-ok");
      }else{
        estado(
          "Registro no completado",
          (msg?.textContent||"Revise el mensaje mostrado y vuelva a intentar."),
          "100%"
        );
        if(p)p.classList.add("is-error");
      }

      return resultado;
    }catch(error){
      estado(
        "No se pudo completar el registro",
        error?.message||"Revise la conexión e intente nuevamente.",
        "100%"
      );
      if(p)p.classList.add("is-error");
      throw error;
    }finally{
      if(timer)clearInterval(timer);
      const e=document.getElementById("mv393MapaTiempo");
      if(e)e.textContent=`${Math.floor((Date.now()-inicio)/1000)} s`;
    }
  }

  registrarV393.__mv393=true;
  registrarV393.__original=registrarBase;
  window.moRegistrarImportacion=registrarV393;
  try{moRegistrarImportacion=registrarV393}catch(_){}

  window.MV393_MAPA_PROGRESO_OK=true;
})();