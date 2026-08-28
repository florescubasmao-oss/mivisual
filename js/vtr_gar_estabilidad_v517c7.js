/* ============================================================
   MI VISUAL V517C.17 - ESTABILIDAD + SNAPSHOT SINCRONIZADO
   Solo frontend. No modifica backend, hojas, Ranking, Dashboard o Producción.

   OBJETIVOS
   - Evitar reconstrucción bloqueante de toda la consolidación tras guardar.
   - Mantener la última respuesta JSON válida como snapshot de respaldo.
   - Sincronizar BONO / NO BONO sin registro dentro del snapshot local.
   - Descartar una sola vez caches anteriores a V517C.17.
   - Revalidar contra backend en segundo plano con reintento.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C7_ESTABILIDAD_OK) return;
  window.MV517C7_ESTABILIDAD_OK=true;

  const FETCH_PREV=window.fetch.bind(window);
  const PREF="MV517C7|LISTA|";
  const SCHEMA="V517C17-SYNC-EVALUACION-SIN-REGISTRO-20260828-1";
  const MARKER="MV517C7|SCHEMA";
  const TTL_RAPIDO=5*60*1000;
  const TTL_RESPALDO=30*60*1000;
  let toastTimer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function key(b,periodoReal){return PREF+norm(b&&b.usuario||usuario())+"|"+txt(periodoReal||b&&b.periodo||"AUTO");}
  function responseJson(obj){return Promise.resolve(new Response(JSON.stringify(obj),{status:200,headers:{"Content-Type":"application/json;charset=utf-8"}}));}

  function limpiarCachesObsoletos(){
    try{
      if(localStorage.getItem(MARKER)===SCHEMA)return;
      Object.keys(localStorage).filter(k=>k.startsWith(PREF)||k.startsWith("MV517C6|LISTA|")).forEach(k=>localStorage.removeItem(k));
      Object.keys(sessionStorage).filter(k=>k.startsWith("MV517C3|LISTA|")).forEach(k=>sessionStorage.removeItem(k));
      localStorage.setItem(MARKER,SCHEMA);
    }catch(_){}
  }
  limpiarCachesObsoletos();

  function limpiarCacheC3(user,periodo){
    const U=norm(user||usuario()),P=txt(periodo||"");
    try{
      Object.keys(sessionStorage).filter(k=>{
        if(!k.startsWith("MV517C3|LISTA|"+U+"|"))return false;
        return !P||k.endsWith("|"+P)||k.endsWith("|AUTO");
      }).forEach(k=>sessionStorage.removeItem(k));
    }catch(_){}
  }

  function getSnap(k,maxAge){
    try{const j=JSON.parse(localStorage.getItem(k)||"null");return j&&j.data&&Date.now()-Number(j.ts||0)<=maxAge?j:null;}catch(_){return null;}
  }
  function setSnap(k,data){
    if(!data||!data.ok)return;
    try{localStorage.setItem(k,JSON.stringify({ts:Date.now(),data:data}));}catch(_){}
  }
  function allSnaps(){
    const out=[];
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(PREF)){const s=getSnap(k,TTL_RESPALDO);if(s)out.push({k,s});}}}catch(_){}
    return out;
  }
  function matchingSnaps(user,periodo){
    const U=norm(user||usuario()),P=txt(periodo||"");
    return allSnaps().filter(x=>x.k.startsWith(PREF+U+"|")&&(!P||x.k.endsWith("|"+P)||x.k.endsWith("|AUTO")));
  }

  function toast(msg,kind){
    let el=document.getElementById("mv517c7-toast");
    if(!el){el=document.createElement("div");el.id="mv517c7-toast";el.style.cssText="position:fixed;right:16px;bottom:56px;z-index:20000;max-width:360px;padding:10px 12px;border-radius:10px;font:800 11px Arial;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:.2s";document.body.appendChild(el);}
    el.style.background=kind==="warn"?"#fff3cd":"#dcfce7";el.style.color=kind==="warn"?"#7c5200":"#166534";el.textContent=msg;el.style.display="block";
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(el)el.style.display="none";},3500);
  }

  async function leerRespuestaValida(r){
    if(!r)return null;
    try{const t=await r.clone().text();const j=JSON.parse(t);return j&&j.ok?j:null;}catch(_){return null;}
  }

  async function redConReintento(input,init,intentos){
    let ultima=null;
    for(let i=0;i<intentos;i++){
      try{
        const r=await FETCH_PREV(input,init);ultima=r;
        const j=await leerRespuestaValida(r);
        if(j)return {r,j};
      }catch(e){ultima=e;}
      if(i<intentos-1)await new Promise(res=>setTimeout(res,700*(i+1)));
    }
    return {r:ultima,j:null};
  }

  function ajustarNotificacion(data,antesPendienteBono,antesClasificacion){
    const n=data&&data.notificacionJefatura;if(!n||!n.detalle)return;
    if(antesPendienteBono&&Number(n.detalle.bono||0)>0)n.detalle.bono=Number(n.detalle.bono)-1;
    if(antesClasificacion&&Number(n.detalle.clasificacion||0)>0)n.detalle.clasificacion=Number(n.detalle.clasificacion)-1;
    n.totalPendientes=Math.max(0,Number(n.totalPendientes||0)-(antesPendienteBono?1:0)-(antesClasificacion?1:0));
  }

  function parchearData(data,b){
    if(!data||!data.ok||!b)return data;
    const accion=txt(b.accion);
    const inc=Array.isArray(data.incidencias)?data.incidencias:[];
    const nes=Array.isArray(data.noEstandar)?data.noEstandar:[];

    if(accion==="validarBonoVtrGarV515"||accion==="validarValidacionTecnica"){
      const x=inc.find(z=>txt(z.validacionId)===txt(b.id));
      if(x){
        const antes=!!x.requiereBono||norm(x.bono)==="PENDIENTE";
        const res=txt(b.resultado);
        x.bono=res;x.estadoRegistroTecnico=res;x.requiereBono=false;
        if(b.puntajeVtrGar!=null)x.puntajeVtrGar=Number(b.puntajeVtrGar)||0;
        x.comentarioJefatura=txt(b.motivo||b.motivoValidacion||x.comentarioJefatura);
        x.validadoPor=txt(b.usuario||x.validadoPor);
        ajustarNotificacion(data,antes,false);
      }
    }

    if(accion==="clasificarVtrGarV517A"){
      let x=null;
      if(b.ticket)x=inc.find(z=>norm(z.ticket)===norm(b.ticket));
      if(!x&&b.clave)x=nes.find(z=>norm(z.clave)===norm(b.clave));
      if(x){
        const antes=!!x.requiereClasificacion;
        const d=norm(b.decision);
        if(d==="CORRESPONDE"){
          x.estadoResponsabilidad="CONFIRMADO";x.estadoDecision="CONFIRMADO";x.responsabilidadDefinida=true;x.cuadrillaResponsable=x.cuadrillaEjecutora||x.cuadrillaResponsable;
        }else if(d==="REASIGNAR"){
          x.estadoResponsabilidad="REASIGNADO";x.estadoDecision="REASIGNADO";x.responsabilidadDefinida=true;x.cuadrillaResponsable=txt(b.cuadrillaResponsable||x.cuadrillaResponsable);
        }else if(d==="NO_ES_GAR_VTR"){
          x.estadoResponsabilidad="NO_ES_GAR_VTR";x.estadoDecision="NO_ES_GAR_VTR";x.responsabilidadDefinida=true;
        }else if(d==="ANULAR"){
          x.estadoResponsabilidad="ANULADO";x.estadoDecision="ANULADO";x.responsabilidadDefinida=true;
        }
        x.requiereClasificacion=false;x.decisionJefaturaValida=true;x.comentarioJefatura=txt(b.observacion||x.comentarioJefatura);
        ajustarNotificacion(data,false,antes);
      }
    }

    if(accion==="validarBonoExcepcionalVtrGarV517C5"){
      const x=inc.find(z=>norm(z.ticket)===norm(b.ticket));
      if(x){
        const r=norm(b.resultado);
        x.bono=r==="NO_BONO"?"NO BONO":txt(b.resultado);
        x.bonoExcepcional=r==="BONO";
        x.evaluacionJefaturaSinRegistro=true;
        x.bonoFuente="JEFATURA_SIN_REGISTRO";
        x.requiereBono=false;
        x.puntajeVtrGar=r==="BONO"?(Number(b.puntajeVtrGar)||0):0;
        x.comentarioJefatura=txt(b.motivo||"");
        x.validadoPor=txt(b.usuario||x.validadoPor);
      }
    }
    return data;
  }

  function parchearSnapshots(b){
    const snaps=matchingSnaps(b.usuario,b.periodo);
    snaps.forEach(({k,s})=>{
      const copia=JSON.parse(JSON.stringify(s.data));
      parchearData(copia,b);
      setSnap(k,copia);
      if(copia.periodo)setSnap(key({usuario:b.usuario},copia.periodo),copia);
    });
    limpiarCacheC3(b.usuario,b.periodo);
  }

  function refrescarSegundoPlano(input,init,b){
    setTimeout(async()=>{
      limpiarCacheC3(b.usuario,b.periodo);
      const z=await redConReintento(input,init,2);
      if(z.j){setSnap(key(b),z.j);if(z.j.periodo)setSnap(key(b,z.j.periodo),z.j);}
    },2200);
  }

  window.fetch=function(input,init){
    let b=null;
    try{if(norm(init&&init.method||"GET")==="POST"&&typeof (init&&init.body)==="string")b=JSON.parse(init.body);}catch(_){}

    if(b&&b.accion==="listarVtrGarV517A"){
      const k=key(b),fresh=getSnap(k,TTL_RAPIDO);
      if(fresh){refrescarSegundoPlano(input,init,b);return responseJson(fresh.data);}
      return (async()=>{
        limpiarCacheC3(b.usuario,b.periodo);
        const z=await redConReintento(input,init,2);
        if(z.j){setSnap(k,z.j);if(z.j.periodo)setSnap(key(b,z.j.periodo),z.j);return new Response(JSON.stringify(z.j),{status:200,headers:{"Content-Type":"application/json;charset=utf-8"}});}
        const backup=getSnap(k,TTL_RESPALDO)||matchingSnaps(b.usuario,b.periodo)[0]?.s||null;
        if(backup){toast("Backend temporalmente inestable. Se conserva la última vista válida mientras se reintenta.","warn");refrescarSegundoPlano(input,init,b);return new Response(JSON.stringify(backup.data),{status:200,headers:{"Content-Type":"application/json;charset=utf-8"}});}
        if(z.r instanceof Response)return z.r;
        throw (z.r instanceof Error?z.r:new Error("No se pudo consultar GAR/VTR."));
      })();
    }

    const escritura=b&&["clasificarVtrGarV517A","validarBonoVtrGarV515","validarValidacionTecnica","validarBonoExcepcionalVtrGarV517C5"].includes(b.accion);
    if(escritura){
      return FETCH_PREV(input,init).then(async r=>{
        const j=await leerRespuestaValida(r);
        if(j){
          parchearSnapshots(b);
          window.MV517C7_ULTIMO_GUARDADO={ts:Date.now(),accion:b.accion,id:b.id||b.ticket||b.clave||""};
          toast("✅ Guardado correctamente. El resultado quedó sincronizado.");
        }
        return r;
      });
    }
    return FETCH_PREV(input,init);
  };

  /* Solo reutiliza V517C6 si pertenece al esquema actual. La limpieza inicial elimina copias antiguas. */
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(!k||!k.startsWith("MV517C6|LISTA|"))continue;
      const raw=JSON.parse(localStorage.getItem(k)||"null");if(!raw||!raw.text)continue;
      const d=JSON.parse(raw.text);if(!d||!d.ok)continue;
      const partes=k.split("|");const u=partes[2]||usuario(),p=partes[3]||d.periodo||"AUTO";
      setSnap(PREF+u+"|"+p,d);if(d.periodo)setSnap(PREF+u+"|"+d.periodo,d);
    }
  }catch(_){}
})();
