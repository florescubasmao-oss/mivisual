/* ============================================================
   MI VISUAL V393 / V527A - Mapa Operativo: avance de registro
   - No cambia importarMapaOperativo ni la estructura enviada.
   - Muestra etapas reales: preparación -> servidor -> filtros.
   - Cronómetro visible durante el registro.
   - Conserva validación V386 de cuadrillas P#.
   - Conserva V518.2: reconoce la confirmación real del backend sin esperar
     la recarga posterior de catálogos/filtros.
   - Conserva V523: HTML/texto anómalo nunca se muestra completo.
   - Conserva V527: "Failed to fetch" y fallas de transporte se consideran
     respuesta incierta de una ESCRITURA. MI VISUAL NO repite el POST.
   - V527A: al abrir una nueva importación o elegir otro archivo se limpia
     únicamente el panel visual anterior; no toca datos, backend ni cachés.
============================================================ */
(function(){
  "use strict";
  if(window.MV393_MAPA_PROGRESO_OK) return;

  const registrarBase = window.moRegistrarImportacion;
  const mostrarImportacionBase = window.moMostrarImportacion;
  const seleccionarArchivoBase = window.moSeleccionarArchivoMapa;
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
      .mv393-map-progress.is-warning{border-color:#fcd34d;background:#fffbeb}
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
      .mv393-map-progress.is-warning .mv393-map-progress-fill{
        width:100%!important;background:#d97706;animation:none;
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

  function limpiarPanelAnterior(){
    const p=document.getElementById("mv393MapaProgreso");
    if(!p) return;
    p.className="mv393-map-progress";
    const e=document.getElementById("mv393MapaEtapa");
    const t=document.getElementById("mv393MapaTiempo");
    const d=document.getElementById("mv393MapaDetalle");
    const f=document.getElementById("mv393MapaFill");
    if(e)e.textContent="Preparando registro...";
    if(t)t.textContent="0 s";
    if(d)d.textContent="";
    if(f)f.style.width="28%";
  }

  function mostrarImportacionV527A(){
    limpiarPanelAnterior();
    return mostrarImportacionBase.apply(this,arguments);
  }

  function seleccionarArchivoV527A(){
    limpiarPanelAnterior();
    return seleccionarArchivoBase.apply(this,arguments);
  }

  function cantidad(){
    try{
      return Array.isArray(moImportacion) ? moImportacion.length : 0;
    }catch(_){ return 0; }
  }

  function estado(etapa,detalle,ancho){
    const p=panel(); if(!p) return;
    p.classList.add("is-visible");
    p.classList.remove("is-ok","is-warning","is-error");

    const e=document.getElementById("mv393MapaEtapa");
    const d=document.getElementById("mv393MapaDetalle");
    const f=document.getElementById("mv393MapaFill");
    if(e)e.textContent=etapa;
    if(d)d.textContent=detalle||"";
    if(f && ancho) f.style.width=ancho;
  }

  function mensajeConfirmado(){
    const msg=document.getElementById("moImportMsg");
    return !!msg && (
      msg.classList.contains("mo-ok") ||
      /Registro confirmado/i.test(msg.textContent||"")
    );
  }

  function texto(v){ return String(v==null?"":v).trim(); }
  function dormir(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function pareceHtml(v){
    const t=texto(v).slice(0,1200).toLowerCase();
    return t.startsWith("<!doctype") || t.startsWith("<html") ||
      t.includes("<head") || t.includes("<body") ||
      t.includes("script nonce=") || t.includes("window['_ppconfig']") ||
      t.includes("window[\"_ppconfig\"]");
  }

  function esFalloTransporte(v){
    const t=texto(v).toLowerCase();
    return t.includes("failed to fetch") ||
      t.includes("networkerror") ||
      t.includes("network error") ||
      t.includes("load failed") ||
      t.includes("fetch failed") ||
      t.includes("the network connection was lost") ||
      t.includes("connection reset") ||
      t.includes("err_network") ||
      t.includes("err_connection");
  }

  function respuestaIncierta(v){
    return pareceHtml(v) || esFalloTransporte(v) ||
      /no se recibi[oó] la confirmaci[oó]n/i.test(texto(v));
  }

  function mensajeBreveError(error){
    const t=texto(error&&error.message?error.message:error);
    if(!t) return "Revise la conexión e intente nuevamente.";
    if(pareceHtml(t)) return "Google devolvió una respuesta temporal en lugar de la confirmación de MI VISUAL.";
    if(esFalloTransporte(t)) return "La conexión con Google se interrumpió después de enviar la información.";
    if(t.length>500) return t.slice(0,500)+"…";
    return t;
  }

  function fechaSelloMs(sello){
    const t=texto(sello);
    if(!t) return 0;
    let m=t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[^\d]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(m){
      const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0));
      return Number.isNaN(d.getTime())?0:d.getTime();
    }
    m=t.match(/(\d{4})-(\d{2})-(\d{2})[^\d]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(m){
      const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0));
      return Number.isNaN(d.getTime())?0:d.getTime();
    }
    return 0;
  }

  async function ultimaActualizacionSegura(){
    try{
      if(typeof moApiLectura!=="function") return "";
      const d=await moApiLectura({
        accion:"catalogosMapaOperativo",
        usuario:typeof moUsuario==="function"?moUsuario():""
      });
      const sello=texto(d&&d.ultimaActualizacionTexto);
      if(sello && typeof moPintarUltimaActualizacion==="function"){
        moPintarUltimaActualizacion(sello);
      }
      return sello;
    }catch(_){
      return "";
    }
  }

  async function ultimaActualizacionConReintento(){
    let sello=await ultimaActualizacionSegura();
    if(sello) return sello;
    await dormir(900);
    return ultimaActualizacionSegura();
  }

  function pintarMensajeSeguro(detalle){
    const msg=document.getElementById("moImportMsg");
    if(!msg) return;
    msg.className="mo-msg mo-error";
    msg.textContent=detalle;
  }

  function pintarMensajeAviso(detalle){
    const msg=document.getElementById("moImportMsg");
    if(!msg) return;
    msg.className="mo-msg";
    msg.textContent=detalle;
  }

  function pintarMensajeOk(detalle){
    const msg=document.getElementById("moImportMsg");
    if(!msg) return;
    msg.className="mo-msg mo-ok";
    msg.textContent=detalle;
  }

  async function resolverRespuestaIncierta(inicio,total,p){
    estado(
      "Verificando confirmación del registro",
      `La conexión se interrumpió después de enviar ${total} registros. MI VISUAL verificará la última actualización sin repetir la escritura.`,
      "86%"
    );

    const sello=await ultimaActualizacionConReintento();
    const selloMs=fechaSelloMs(sello);
    const correspondeCarga=!!selloMs && selloMs >= (inicio-5000);

    if(correspondeCarga){
      const detalle=`✅ Registro confirmado por última actualización (${sello}). Los ${total} registros fueron recibidos; los indicadores pueden continuar su sincronización normal.`;
      pintarMensajeOk(detalle);
      estado("3 de 3 · Registro confirmado",detalle,"100%");
      if(p){p.classList.remove("is-warning","is-error");p.classList.add("is-ok");}
      return {confirmado:true,sello:sello};
    }

    const detalle="La comunicación con Google se interrumpió después de enviar la información. MI VISUAL no repetirá automáticamente el registro para evitar duplicidades."+
      (sello?` Última actualización detectada: ${sello}.`:" No fue posible consultar la última actualización en este momento.")+
      " Vuelva al mapa y verifique la fecha. Si no corresponde a esta carga, puede presionar Registrar información nuevamente; el Excel leído se conserva.";

    pintarMensajeAviso(detalle);
    estado("Registro pendiente de confirmación",detalle,"100%");
    if(p){p.classList.remove("is-ok","is-error");p.classList.add("is-warning");}
    return {confirmado:false,sello:sello};
  }

  async function registrarV393(){
    const total=cantidad();
    if(!total) return await registrarBase.apply(this,arguments);

    const p=panel();
    const inicio=Date.now();
    let timer=null;
    let observador=null;
    let confirmadoAnticipado=false;

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

    const marcarConfirmado=()=>{
      if(confirmadoAnticipado || !mensajeConfirmado()) return false;
      confirmadoAnticipado=true;
      estado(
        "3 de 3 · Registro completado",
        "Información registrada. Los filtros se están actualizando en segundo plano; puede volver al mapa.",
        "100%"
      );
      if(p)p.classList.add("is-ok");
      if(timer){clearInterval(timer);timer=null;}
      const e=document.getElementById("mv393MapaTiempo");
      if(e)e.textContent=`${Math.floor((Date.now()-inicio)/1000)} s`;
      return true;
    };

    const msg=document.getElementById("moImportMsg");
    if(msg && typeof MutationObserver!=="undefined"){
      observador=new MutationObserver(()=>marcarConfirmado());
      observador.observe(msg,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
    }

    try{
      // Incluye la protección V386: si hay una cuadrilla que no comienza por P#,
      // esa función bloquea la carga antes de llegar al servidor.
      const resultado=await registrarBase.apply(this,arguments);

      const correcto=mensajeConfirmado();

      if(correcto){
        estado(
          "3 de 3 · Registro completado",
          "Información registrada. Los filtros y la última actualización quedaron sincronizados.",
          "100%"
        );
        if(p)p.classList.add("is-ok");
      }else{
        const mensaje=document.getElementById("moImportMsg");
        const original=texto(mensaje?.textContent||"");

        // V527: el flujo base puede capturar Failed to fetch y dejarlo solamente
        // en moImportMsg, sin lanzar excepción. También se verifica este camino.
        if(respuestaIncierta(original)){
          const verificacion=await resolverRespuestaIncierta(inicio,total,p);
          if(verificacion.confirmado){
            return resultado || {ok:true,confirmadoPorSello:true,ultimaActualizacionTexto:verificacion.sello};
          }
          return resultado;
        }

        const detalle=mensajeBreveError(original||"Revise el mensaje mostrado y vuelva a intentar.");
        if(mensaje && pareceHtml(original)) pintarMensajeSeguro(detalle);
        estado("Registro no completado",detalle,"100%");
        if(p)p.classList.add("is-error");
      }

      return resultado;
    }catch(error){
      // Si el backend ya confirmó la escritura, un fallo posterior de refresco
      // no debe convertir el registro real en un falso error visual.
      if(confirmadoAnticipado || mensajeConfirmado()){
        estado(
          "3 de 3 · Registro completado",
          "Información registrada. Los filtros terminarán de actualizarse al volver al mapa.",
          "100%"
        );
        if(p)p.classList.add("is-ok");
        return;
      }

      const original=texto(error&&error.message?error.message:error);

      // V527: Failed to fetch / HTML / pérdida de confirmación son estados
      // inciertos de escritura. Nunca se hace un segundo POST automático.
      if(respuestaIncierta(original)){
        const verificacion=await resolverRespuestaIncierta(inicio,total,p);
        if(verificacion.confirmado){
          return {ok:true,confirmadoPorSello:true,ultimaActualizacionTexto:verificacion.sello};
        }
        return;
      }

      const detalle=mensajeBreveError(error);
      pintarMensajeSeguro(detalle);
      estado("No se pudo completar el registro",detalle,"100%");
      if(p)p.classList.add("is-error");
      const seguro=new Error(detalle);
      seguro.name="MapaOperativoRespuestaSegura";
      throw seguro;
    }finally{
      if(observador)observador.disconnect();
      if(timer)clearInterval(timer);
      const e=document.getElementById("mv393MapaTiempo");
      if(e)e.textContent=`${Math.floor((Date.now()-inicio)/1000)} s`;
    }
  }

  if(typeof mostrarImportacionBase==="function"){
    mostrarImportacionV527A.__mv527a=true;
    mostrarImportacionV527A.__original=mostrarImportacionBase;
    window.moMostrarImportacion=mostrarImportacionV527A;
    try{moMostrarImportacion=mostrarImportacionV527A}catch(_){}
  }

  if(typeof seleccionarArchivoBase==="function"){
    seleccionarArchivoV527A.__mv527a=true;
    seleccionarArchivoV527A.__original=seleccionarArchivoBase;
    window.moSeleccionarArchivoMapa=seleccionarArchivoV527A;
    try{moSeleccionarArchivoMapa=seleccionarArchivoV527A}catch(_){}
  }

  registrarV393.__mv393=true;
  registrarV393.__mv5182=true;
  registrarV393.__mv523=true;
  registrarV393.__mv527=true;
  registrarV393.__mv527a=true;
  registrarV393.__original=registrarBase;
  window.moRegistrarImportacion=registrarV393;
  try{moRegistrarImportacion=registrarV393}catch(_){}

  window.MV393_MAPA_PROGRESO_OK=true;
  window.MV523_MAPA_RESPUESTA_SEGURA_OK=true;
  window.MV527_MAPA_FAILED_FETCH_OK=true;
  window.MV527A_MAPA_PANEL_RESET_OK=true;
})();
