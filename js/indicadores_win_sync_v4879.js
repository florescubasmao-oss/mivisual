/* ================================================================
   MI VISUAL V551 - MAPA OPERATIVO -> INDICADORES SIN DUPLICAR COLA

   OBJETIVO
   - Una carga confirmada en Mapa Operativo impacta automáticamente
     Producción, Efectividad, Recableado, VTR/GAR, Ranking y Dashboard.
   - Respeta la cola del backend cuando el POST devuelve su confirmación.
   - Una respuesta incierta no dispara publicaciones ni repite escrituras.
   - NO ejecuta reconstrucciones pesadas al abrir Mapa Operativo ni al cambiar
     filtros. Esto evita competir con listarMapaOperativo y dejar el mapa en
     "Consultando órdenes...".
   - Solo en backend anterior sin cola, durante la sincronización bloquea el
     botón "Volver al mapa" de la vista de importación hasta terminar.
   - Mantiene una revisión manual de desfase para Jefatura/Admin.
   - Nunca reintenta la importación del Mapa.
   - Julio 2026 y anteriores permanecen congelados.
================================================================ */
(function(){
  "use strict";
  if(window.MV543_MAPA_INDICADORES_SYNC_OK)return;

  window.MV505_INDICADORES_WIN_SYNC_OK=true;
  window.MV4879_INDICADORES_WIN_SYNC_OK=true;
  window.MV512_INDICADORES_WIN_SYNC_OK=true;
  window.MV542_MAPA_INDICADORES_SYNC_OK=true;
  window.MV543_MAPA_INDICADORES_SYNC_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const PERIODO_MINIMO="2026-08";
  const CONFIRMACION="PUBLICAR_V487_CONFIRMADO";
  const publicacionesEnCurso=new Map();
  const catchupEnCurso=new Map();
  let ultima=null;
  let timerPendientes=null;
  let pendientes=new Set();
  let promesaPendiente=null;
  let resolverPendiente=null;
  let rechazarPendiente=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function puedePublicar(){return ["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(perfil());}
  function periodoValido(p){return /^\d{4}-\d{2}$/.test(txt(p));}
  function dormir(ms){return new Promise(r=>setTimeout(r,ms));}

  function periodoActual(){
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const y=partes.find(x=>x.type==="year")?.value||"";
    const m=partes.find(x=>x.type==="month")?.value||"";
    return y&&m?`${y}-${m}`:"";
  }

  function periodoMapa(){
    const p=txt(document.getElementById("moFiltroPeriodo")?.value||"");
    return periodoValido(p)?p:periodoActual();
  }

  function periodoDesdeFecha(v){
    const s=txt(v);
    let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if(m)return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}`;
    return "";
  }

  function periodosImportacion(){
    const out=new Set();
    try{
      if(typeof moImportacion!=="undefined" && Array.isArray(moImportacion)){
        moImportacion.forEach(r=>{
          const p=periodoDesdeFecha(r&&r.fechaSolicitud);
          if(periodoValido(p)&&p>=PERIODO_MINIMO)out.add(p);
        });
      }
    }catch(_){}
    if(!out.size){
      const p=periodoMapa();
      if(periodoValido(p)&&p>=PERIODO_MINIMO)out.add(p);
    }
    return Array.from(out).sort();
  }

  function fechaMs(v){
    const s=txt(v);
    if(!s)return 0;
    const n=Date.parse(s);
    return Number.isFinite(n)?n:0;
  }

  async function apiGet(payload,tiempoMs=30000){
    if(!API)throw new Error("No se encontró la URL de MI VISUAL.");
    if(typeof window.mv336ApiGet==="function"){
      return await window.mv336ApiGet(API,payload,{intentos:1,tiempoMs});
    }
    const url=new URL(API);
    Object.entries(payload||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v));
    });
    url.searchParams.set("_v543",Date.now()+"-"+Math.random().toString(36).slice(2));
    const c=typeof AbortController==="function"?new AbortController():null;
    const t=c?setTimeout(()=>c.abort(),tiempoMs):null;
    try{
      const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"},signal:c?c.signal:undefined});
      const texto=(await r.text()).trim();
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      if(/^MI VISUAL API OK$/i.test(texto)||/<!doctype|<html/i.test(texto))throw new Error("Respuesta no válida");
      const j=JSON.parse(texto);
      if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"Consulta no disponible");
      return j;
    }finally{if(t)clearTimeout(t);}
  }

  async function apiPost(payload,tiempoMs=320000){
    if(!API)throw new Error("No se encontró la URL de MI VISUAL.");
    const c=typeof AbortController==="function"?new AbortController():null;
    const t=c?setTimeout(()=>c.abort(),tiempoMs):null;
    try{
      const r=await fetch(API,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},
        body:JSON.stringify(payload),
        cache:"no-store",
        redirect:"follow",
        signal:c?c.signal:undefined
      });
      const texto=(await r.text()).trim();
      if(!r.ok){
        const e=new Error(`Google Apps Script respondió temporalmente con HTTP ${r.status}.`);
        e.httpStatus=r.status; throw e;
      }
      if(/^MI VISUAL API OK$/i.test(texto)||/<!doctype|<html/i.test(texto))throw new Error("La API no devolvió confirmación JSON.");
      let j;
      try{j=JSON.parse(texto);}catch(_){throw new Error("La API no devolvió JSON para sincronizar indicadores WIN.");}
      if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo completar la publicación WIN.");
      return j;
    }finally{if(t)clearTimeout(t);}
  }

  async function selloMapa(){
    try{
      const d=await apiGet({accion:"obtenerUltimaActualizacionMapaOperativo",usuario:usuario()},20000);
      return {
        iso:txt(d.ultimaActualizacionIso||d.ultimaActualizacion||""),
        usuario:txt(d.ultimaActualizacionUsuario||""),
        visible:txt(d.ultimaActualizacionVisible||d.ultimaActualizacionTexto||"")
      };
    }catch(_){return {iso:"",usuario:"",visible:""};}
  }

  async function selloIndicadores(periodo){
    try{
      const d=await apiGet({accion:"obtenerActualizacionIndicadoresWinV512",usuario:usuario(),periodo},20000);
      return {
        iso:txt(d.fechaPublicacion||""),
        visible:txt(d.fechaPublicacionTexto||""),
        usuario:txt(d.actualizadoPor||"")
      };
    }catch(_){return {iso:"",visible:"",usuario:""};}
  }

  function anexarEstado(texto,tipo){
    const msg=document.getElementById("moImportMsg");
    if(!msg)return;
    if(tipo==="ok")msg.className="mo-msg mo-ok";
    else if(tipo==="warn"&&!msg.classList.contains("mo-ok"))msg.className="mo-msg";
    const previo=txt(msg.textContent);
    if(previo.includes(texto))return;
    msg.textContent=(previo?previo+"\n":"")+texto;
  }

  function bloquearVolverMapa(bloquear){
    try{
      const boton=document.querySelector("#moVistaImportacion .mo-head button[onclick*='moVolverFiltros']");
      if(!boton)return;
      boton.disabled=!!bloquear;
      boton.style.opacity=bloquear?".55":"";
      boton.style.cursor=bloquear?"wait":"";
      boton.title=bloquear?"Espere a que termine la sincronización de indicadores":"";
    }catch(_){}
  }

  function invalidarCachesCliente(periodo){
    try{
      ["MV395_MAPA_CAT","MV395_MAPA_LIST"].forEach(k=>sessionStorage.removeItem(k));
    }catch(_){}
    try{
      if(typeof window.mv366InvalidarResumenDashboard==="function")window.mv366InvalidarResumenDashboard(periodo||"");
    }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent("mv505CachesIndicadoresInvalidadas",{detail:{periodo:periodo||"",version:"V543"}}));
    }catch(_){}
  }
  window.mv4879InvalidarCachesCliente=invalidarCachesCliente;

  async function confirmarPublicacionIncierta(periodo,inicioMs){
    /*
      V555: una desconexion/AbortError del navegador NO implica que Apps Script
      haya detenido el publicador. Durante hasta 150 s se consulta solo el sello
      V512. Nunca vuelve a ejecutar la publicacion desde este bucle.
    */
    const limite=Date.now()+150000;
    let intento=0;
    while(Date.now()<limite){
      if(intento++)await dormir(5000);
      const s=await selloIndicadores(periodo);
      const ms=fechaMs(s.iso);
      if(ms && ms>=inicioMs-5000){
        return {
          ok:true,periodo,
          fechaPublicacion:s.iso,
          fechaPublicacionTexto:s.visible,
          actualizadoPor:s.usuario,
          publicacionConfirmadaPorSello:true,
          sincronizador:"V555"
        };
      }
    }
    return null;
  }

  async function publicarPeriodo(periodo,origen="AUTOMATICO"){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p)throw new Error("No se pudo determinar el periodo WIN.");
    if(p<PERIODO_MINIMO)return {ok:true,periodo:p,omitidoPorCierre:true,julioCongelado:true,version:"V543"};
    if(!puedePublicar())throw new Error("La publicación requiere perfil Jefatura/Administrador.");
    if(publicacionesEnCurso.has(p))return publicacionesEnCurso.get(p);

    const tarea=(async()=>{
      const inicio=Date.now();
      let publicado;
      try{
        publicado=await apiPost({
          accion:"publicarIndicadoresWinV487",
          usuario:usuario(),
          periodo:p,
          confirmacion:CONFIRMACION
        },320000);
      }catch(error){
        const confirmado=await confirmarPublicacionIncierta(p,inicio);
        if(!confirmado)throw error;
        publicado=confirmado;
      }

      publicado.sincronizador="V543";
      publicado.origenSincronizacion=origen;
      ultima=publicado;
      invalidarCachesCliente(p);

      const prod=publicado.produccion||{};
      const ef=publicado.efectividad&&publicado.efectividad.control?publicado.efectividad.control:{};
      const resumenProd=(prod.ordenes!==undefined||prod.puntos!==undefined)
        ?` · Producción ${prod.ordenes||0} orden(es) / ${prod.puntos||0} pts`
        :"";
      const resumenEf=ef.totalEfectividad!==undefined?` · Efectividad ${ef.totalEfectividad||0} orden(es)`:"";
      anexarEstado(`✅ Datos sincronizados: ${p}${resumenProd}${resumenEf}.`,"ok");
      try{window.dispatchEvent(new CustomEvent("mv487IndicadoresPublicados",{detail:publicado}));}catch(_){}
      return publicado;
    })();

    publicacionesEnCurso.set(p,tarea);
    try{return await tarea;}
    finally{if(publicacionesEnCurso.get(p)===tarea)publicacionesEnCurso.delete(p);}
  }

  async function previsualizarPeriodo(periodo){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p)throw new Error("No se pudo determinar el periodo WIN.");
    if(p<PERIODO_MINIMO)return {ok:true,periodo:p,omitidoPorCierre:true,julioCongelado:true,version:"V543"};
    return apiPost({accion:"previsualizarPublicacionIndicadoresWinV487",usuario:usuario(),periodo:p},120000);
  }

  async function calcularPeriodo(periodo){
    const r=await previsualizarPeriodo(periodo);
    ultima=r;
    try{window.dispatchEvent(new CustomEvent("mv487IndicadoresCalculados",{detail:r}));}catch(_){}
    return r;
  }

  async function ejecutarPendientes(){
    const lista=Array.from(pendientes).filter(periodoValido).sort();
    pendientes=new Set();
    if(!lista.length)lista.push(periodoActual());
    const out=[];
    for(const p of lista){
      if(p<PERIODO_MINIMO)continue;
      out.push(await publicarPeriodo(p,"IMPORTACION_MAPA"));
    }
    return out.length===1?out[0]:out;
  }

  function sincronizar(periodos){
    (Array.isArray(periodos)?periodos:[periodos]).filter(periodoValido).forEach(p=>pendientes.add(txt(p)));
    if(!pendientes.size){
      const p=periodoActual();
      if(p)pendientes.add(p);
    }
    if(!promesaPendiente){
      promesaPendiente=new Promise((resolve,reject)=>{
        resolverPendiente=resolve; rechazarPendiente=reject;
      });
    }
    const salida=promesaPendiente;
    if(timerPendientes)clearTimeout(timerPendientes);
    timerPendientes=setTimeout(async()=>{
      const resolve=resolverPendiente,reject=rechazarPendiente;
      timerPendientes=null;promesaPendiente=null;resolverPendiente=null;rechazarPendiente=null;
      try{resolve(await ejecutarPendientes());}
      catch(e){
        anexarEstado("⚠ El Mapa quedó guardado, pero la sincronización de indicadores sigue pendiente: "+(e&&e.message?e.message:String(e)),"warn");
        reject(e);
      }
    },700);
    return salida;
  }

  async function catchupPeriodo(periodo,mostrarAviso){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p||p<PERIODO_MINIMO||!puedePublicar())return null;
    if(catchupEnCurso.has(p))return catchupEnCurso.get(p);

    const tarea=(async()=>{
      const [m,i]=await Promise.all([selloMapa(),selloIndicadores(p)]);
      const mapMs=fechaMs(m.iso), indMs=fechaMs(i.iso);
      if(!mapMs)return null;
      if(indMs && indMs>=mapMs)return {ok:true,periodo:p,alDia:true,mapa:m,indicadores:i};

      const llave=`MV543_CATCHUP|${p}|${m.iso}`;
      try{
        if(sessionStorage.getItem(llave)==="OK")return null;
        sessionStorage.setItem(llave,"OK");
      }catch(_){}

      if(mostrarAviso)anexarEstado(`⏳ ${p} está desfasado. Sincronizando indicadores...`,"warn");
      try{
        return await publicarPeriodo(p,"RECUPERACION_MAPA_DESFASADO");
      }catch(e){
        try{sessionStorage.removeItem(llave);}catch(_){}
        throw e;
      }
    })();

    catchupEnCurso.set(p,tarea);
    try{return await tarea;}
    finally{if(catchupEnCurso.get(p)===tarea)catchupEnCurso.delete(p);}
  }

  function instalarHookImportacion(){
    const actual=window.moRegistrarImportacion;
    if(typeof actual!=="function")return false;
    if(actual.__mv543MapaSync)return true;

    let original=actual;
    if(original.__mv542MapaSync && typeof original.__original==="function"){
      original=original.__original;
    }

    let registrando=false;
    const ajustada=async function(){
      if(registrando)return {ok:false,enCurso:true};
      registrando=true;
      try{
        const periodos=periodosImportacion();
        // V551: ninguna consulta remota antes de la barra y el bloqueo del botón.
        const r=await original.apply(this,arguments);
        // Un sello global o un mensaje verde de "Archivo leído" no confirman este POST.
        if(!r || r.ok!==true || r.sinCambios || r.confirmadoPorSello)return r;
        const cola=r.sincronizacionIndicadores;
        if(cola && (cola.programada || cola.estado==="SIN_CAMBIOS_PUBLICABLES")){
          anexarEstado(cola.programada
            ? "ℹ Mapa guardado. Indicadores pendientes de actualización automática; puede volver al mapa."
            : "ℹ Mapa guardado. No hay cambios publicables en indicadores.","warn");
          return r;
        }
        if(!puedePublicar()){
          anexarEstado("ℹ Mapa actualizado. La sincronización de indicadores requiere Jefatura/Administrador.","warn");
          return r;
        }
        // Compatibilidad con servidores anteriores que todavía no devuelven cola V547.
        bloquearVolverMapa(true);
        try{
          anexarEstado("⏳ Mapa guardado. Sincronizando indicadores...","warn");
          await sincronizar(periodos);
        }catch(e){console.warn("V551 Mapa -> indicadores",e);}
        finally{bloquearVolverMapa(false);}
        return r;
      }finally{registrando=false;}
    };

    ajustada.__mv543MapaSync=true;
    ajustada.__mv542MapaSync=true;
    ajustada.__mv505WinHook=true;
    ajustada.__mv512WinHook=true;
    ajustada.__original=original;
    window.moRegistrarImportacion=ajustada;
    try{moRegistrarImportacion=ajustada;}catch(_){}
    console.log("MI VISUAL V543: sincronización de importación activa sin catch-up al abrir Mapa.");
    return true;
  }

  function vigilarHookImportacion(){
    let intentos=0;
    const t=setInterval(()=>{
      intentos++;
      instalarHookImportacion();
      if(intentos>240)clearInterval(t);
    },500);

    const head=document.head||document.documentElement;
    if(head){
      const obs=new MutationObserver(()=>{
        setTimeout(()=>instalarHookImportacion(),50);
      });
      obs.observe(head,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),180000);
    }
  }

  window.mv4879CalcularIndicadoresWin=calcularPeriodo;
  window.mv4879PublicarIndicadoresWin=publicarPeriodo;
  window.mv4879SincronizarIndicadoresWin=sincronizar;
  window.mv4879UltimoResultado=()=>ultima;
  window.mv505InstalarHookWin=instalarHookImportacion;
  window.mv512PublicacionesEnCurso=()=>Array.from(publicacionesEnCurso.keys());
  window.mv542RevisarSincronizacionMapa=()=>catchupPeriodo(periodoActual(),true);
  window.mv543RevisarSincronizacionMapa=()=>catchupPeriodo(periodoActual(),true);

  vigilarHookImportacion();
})();
