/* ================================================================
   MI VISUAL V487.12 - Sincronizador automatico de indicadores WIN

   - Se ejecuta despues de una importacion WIN valida.
   - El backend V487.12 es la unica fuente del calculo oficial.
   - Publica SOLO desde agosto 2026.
   - Julio 2026 y periodos anteriores se omiten por cierre.
   - Produccion, Efectividad, Recableado y VTR/GAR se actualizan juntos.
   - Ranking y caches se reconstruyen en backend.
================================================================ */
(function(){
  "use strict";
  if(window.MV4879_INDICADORES_WIN_SYNC_OK)return;
  window.MV4879_INDICADORES_WIN_SYNC_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const PERIODO_MINIMO="2026-08";
  const CONFIRMACION="PUBLICAR_V487_CONFIRMADO";
  let timer=null;
  let pendientes=new Set();
  let ultima=null;

  function txt(v){return String(v==null?"":v).trim();}
  function usuario(){return localStorage.getItem("usuario")||localStorage.getItem("correo")||"";}
  function periodoValido(p){return /^\d{4}-\d{2}$/.test(txt(p));}

  function periodoActual(){
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const y=partes.find(x=>x.type==="year")?.value||"";
    const m=partes.find(x=>x.type==="month")?.value||"";
    return y&&m?`${y}-${m}`:"";
  }

  async function apiPost(payload){
    if(!API)throw new Error("No se encontro la URL de MI VISUAL.");
    const r=await fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload),
      cache:"no-store"
    });
    const t=await r.text();
    let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La API no devolvio JSON para V487.12.");}
    if(!j||j.ok===false)throw new Error(j&&j.error?j.error:"No se pudo completar V487.12.");
    return j;
  }

  function mostrarEstado(texto,esError){
    const msg=document.getElementById("moImportMsg");
    if(!msg)return;
    msg.className=esError?"mo-msg mo-error":"mo-msg mo-ok";
    msg.textContent=String(msg.textContent||"")+"\n"+texto;
  }

  async function previsualizarPeriodo(periodo){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p)throw new Error("No se pudo determinar el periodo WIN.");
    if(p<PERIODO_MINIMO){
      return {ok:true,version:"V487.12",periodo:p,omitidoPorCierre:true,julioCongelado:true};
    }
    return apiPost({
      accion:"previsualizarPublicacionIndicadoresWinV487",
      usuario:usuario(),
      periodo:p
    });
  }

  async function publicarPeriodo(periodo){
    const p=periodoValido(periodo)?periodo:periodoActual();
    if(!p)throw new Error("No se pudo determinar el periodo WIN.");
    if(p<PERIODO_MINIMO){
      return {ok:true,version:"V487.12",periodo:p,omitidoPorCierre:true,julioCongelado:true};
    }

    const preview=await previsualizarPeriodo(p);
    if(preview.produccion&&preview.produccion.ok===false){
      throw new Error(preview.produccion.error||"Produccion tiene casos pendientes de clasificar.");
    }

    const publicado=await apiPost({
      accion:"publicarIndicadoresWinV487",
      usuario:usuario(),
      periodo:p,
      confirmacion:CONFIRMACION
    });
    publicado.previsualizacion=preview;
    ultima=publicado;

    const ef=publicado.efectividad&&publicado.efectividad.control?publicado.efectividad.control:{};
    const rec=publicado.recableado||{};
    const vg=publicado.vtrGar||{};
    mostrarEstado(
      `📊 V487.12 actualizado: ${p} · Efectividad ${ef.totalEfectividad||0} orden(es) · LOS ROJO ${rec.losRojo||0} · VTR/GAR nuevos pendientes ${vg.pendientesNuevos&&vg.pendientesNuevos.agregados||0}.`,
      false
    );
    try{window.dispatchEvent(new CustomEvent("mv487IndicadoresPublicados",{detail:publicado}));}catch(_){}
    return publicado;
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
    const resultados=[];
    for(const p of lista){
      if(p<PERIODO_MINIMO){
        resultados.push({ok:true,periodo:p,omitidoPorCierre:true,julioCongelado:true});
        continue;
      }
      resultados.push(await publicarPeriodo(p));
    }
    return resultados.length===1?resultados[0]:resultados;
  }

  function sincronizar(periodos){
    (Array.isArray(periodos)?periodos:[periodos]).filter(Boolean).forEach(p=>pendientes.add(txt(p)));
    if(!pendientes.size)pendientes.add(periodoActual());
    if(timer)clearTimeout(timer);
    return new Promise((resolve,reject)=>{
      timer=setTimeout(async()=>{
        try{resolve(await ejecutarPendientes());}
        catch(e){
          mostrarEstado("⚠ V487.12: la carga WIN se guardo, pero los indicadores no se publicaron: "+(e&&e.message?e.message:String(e)),true);
          reject(e);
        }
      },900);
    });
  }

  window.mv4879CalcularIndicadoresWin=calcularPeriodo;
  window.mv4879PublicarIndicadoresWin=publicarPeriodo;
  window.mv4879SincronizarIndicadoresWin=sincronizar;
  window.mv4879UltimoResultado=()=>ultima;
})();
