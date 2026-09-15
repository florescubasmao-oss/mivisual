/* ============================================================
   MI VISUAL V532 / V541 - CONFIRMACION PUNTUAL DE ACTAS

   Conserva V532:
   - Si una validacion CORRECTO se guarda en Apps Script pero la respuesta
     de red se pierde, verifica SOLO esa acta por ID.

   V541:
   - Refuerza V540 para el error comun HTTP 404/timeout al subir PDF.
   - NUNCA vuelve a ejecutar registrarActaEscaneada automaticamente.
   - Calcula exactamente el mismo ID deterministico que usa el backend:
     ACTA-{CODIGO_ORDEN}-{NUMERO_ACTA_NORMALIZADO}.
   - Si existe idActaOriginal (faltante/observada), usa ese ID estable.
   - Hace varias verificaciones SOLO LECTURA porque el POST puede seguir
     terminando en Apps Script despues de que el navegador pierda respuesta.
   - Solo confirma si coincide Orden + Numero de Acta, existe link PDF y el
     registro fue actualizado recientemente.
   - No modifica permisos, Drive, estados, reglas ni historico.
============================================================ */
(function(){
"use strict";
if(window.MV541_ACTAS_CONFIRMACION_ID_CARGADA)return;
window.MV541_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV540_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV532_ACTAS_CONFIRMACION_ID_CARGADA=true;

function txt(v){return String(v==null?"":v).trim();}
function norm(v){
  return txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}
function clave(v){return norm(v).replace(/[^A-Z0-9]/g,"");}
function limpiarNombre(v){return clave(v);}
function claveNumeroActa(v){
  let k=clave(v);
  if(/^\d+$/.test(k))k=k.replace(/^0+(?=\d)/,"");
  return k;
}
function dormir(ms){return new Promise(r=>setTimeout(r,ms));}
function esErrorIncierto(error){
  const m=norm(error&&error.message||error||"");
  return /NO RESPONDIO EN LA VERIFICACION|NO SE RECIBIO CONFIRMACION|NO SE PUDO CONFIRMAR LA SUBIDA|TARDO DEMASIADO|RESPUESTA INVALIDA|PAGINA EXTERNA|HTTP 404|HTTP 408|HTTP 429|HTTP 500|HTTP 502|HTTP 503|HTTP 504|FAILED TO FETCH|NO ESTA DISPONIBLE TEMPORALMENTE|PODRIA HABERSE REGISTRADO/.test(m);
}
function idEsperadoSubida(s){
  const original=txt(s.idActaOriginal||s.id_acta_original||"");
  if(original)return original;
  const orden=limpiarNombre(s.codigoOrden||s.codigo_orden||"");
  const acta=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  if(!orden)return "";
  return "ACTA-"+orden+(acta?"-"+acta:"");
}
async function consultarActaPorId(s,idOverride){
  const payload={
    accion:"obtenerActaPorIdV532",
    usuario:s.usuario,
    id:txt(idOverride||s.id),
    _v541:Date.now()+"-"+Math.random().toString(36).slice(2)
  };
  if(!payload.id)throw new Error("ID de acta no disponible");
  if(typeof window.mv336ApiGet==="function"){
    return await window.mv336ApiGet(window.API_ACTAS||window.MI_VISUAL_API_URL,payload,{intentos:1,tiempoMs:15000});
  }
  const base=window.API_ACTAS||window.MI_VISUAL_API_URL;
  const url=new URL(base);
  Object.keys(payload).forEach(k=>url.searchParams.set(k,String(payload[k])));
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(()=>c.abort(),15000):null;
  try{
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"},signal:c?c.signal:undefined});
    if(!r.ok)throw new Error("HTTP "+r.status);
    const t=(await r.text()).trim();
    const j=JSON.parse(t);
    if(!j||j.ok===false)throw new Error((j&&j.error)||"Consulta no disponible");
    return j;
  }finally{if(timer)clearTimeout(timer);}
}
function validacionConfirmada(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const a=r.acta;
  const perfil=norm(r.perfil||localStorage.getItem("perfil"));
  if(perfil==="ALMACEN"){
    return norm(a.resultadoAlmacen)==="CORRECTO" && !!txt(a.validadoAlmacenPor);
  }
  if(perfil==="JEFATURA ALMACEN"){
    return norm(a.resultadoJefatura)==="CORRECTO" && norm(a.estado)==="FINALIZADO" && !!txt(a.validadoJefaturaPor);
  }
  return false;
}
function fechaRegistroRecienteV541(a){
  const f=txt(a&&a.fechaRegistro), h=txt(a&&a.horaRegistro);
  if(!f)return true;
  let y,m,d;
  let x=f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(x){d=Number(x[1]);m=Number(x[2]);y=Number(x[3]);}
  else{
    x=f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(x){y=Number(x[1]);m=Number(x[2]);d=Number(x[3]);}
  }
  if(!y||!m||!d)return true;
  const hm=(h.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)||[]);
  const hh=Number(hm[1]||0), mm=Number(hm[2]||0), ss=Number(hm[3]||0);
  const ts=Date.UTC(y,m-1,d,hh+5,mm,ss);
  if(!isFinite(ts))return true;
  return Math.abs(Date.now()-ts)<=12*60*1000;
}
function subidaConfirmadaV541(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const a=r.acta;
  if(!txt(a.linkActa))return false;
  const ordenS=clave(s.codigoOrden||s.codigo_orden||"");
  const ordenA=clave(a.codigoOrden||"");
  const actaS=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  const actaA=claveNumeroActa(a.numeroActa||"");
  if(ordenS&&ordenA&&ordenS!==ordenA)return false;
  if(actaS&&actaA&&actaS!==actaA)return false;
  return fechaRegistroRecienteV541(a);
}
function limpiarCachesActasV541(){
  try{if(typeof window.limpiarCacheActas==="function")window.limpiarCacheActas();}catch(_){}
  try{if(typeof window.mv524LimpiarSnapshotActas==="function")window.mv524LimpiarSnapshotActas();}catch(_){}
}
async function confirmarConEsperaV541(s,id,modo){
  const esperas=modo==="SUBIDA" ? [0,1300,2200,3500] : [0,1200,2200];
  for(let i=0;i<esperas.length;i++){
    if(esperas[i])await dormir(esperas[i]);
    try{
      const r=await consultarActaPorId(s,id);
      if(modo==="SUBIDA" ? subidaConfirmadaV541(s,r) : validacionConfirmada(s,r))return r;
    }catch(_){ }
  }
  return null;
}
function instalar(){
  if(window.MV541_ACTAS_CONFIRMACION_ID_OK)return true;
  if(typeof window.apiActas!=="function")return false;
  if(!window.MV524_ACTAS_SNAPSHOT_OK && !window.MV392_ACTAS_REINTENTO_404_OK)return false;

  const original=window.apiActas;
  async function apiV541(payload){
    const s=Object.assign({},payload||{});
    try{
      return await original(s);
    }catch(error){
      if(!esErrorIncierto(error))throw error;

      const esValidacion=s.accion==="validarActaEscaneada" && norm(s.resultado)==="CORRECTO" && txt(s.id);
      if(esValidacion){
        const r=await confirmarConEsperaV541(s,s.id,"VALIDACION");
        if(r){
          limpiarCachesActasV541();
          return {
            ok:true,
            modulo:"ACTAS",
            accion:"VALIDACION_CONFIRMADA_V541",
            id:s.id,
            resultado:"CORRECTO",
            estado:r.acta.estado||"",
            estadoVerificado:true,
            verificacionPorId:true
          };
        }
        throw error;
      }

      const esSubida=s.accion==="registrarActaEscaneada";
      if(esSubida){
        const id=idEsperadoSubida(s);
        if(id){
          const r=await confirmarConEsperaV541(s,id,"SUBIDA");
          if(r){
            limpiarCachesActasV541();
            const a=r.acta||{};
            return {
              ok:true,
              modulo:"ACTAS",
              accion:"SUBIDA_CONFIRMADA_V541",
              id:a.id||id,
              nombreArchivo:a.nombreArchivo||"PDF registrado",
              linkActa:a.linkActa||"",
              estado:a.estado||"PENDIENTE",
              version:a.version||1,
              estadoFechaCarpeta:a.estadoFechaCarpeta||"",
              fechaCarpeta:a.fechaCarpeta||a.fechaGestion||"",
              datosAutomaticos:{
                fechaGestion:a.fechaGestion||"",
                tipoPartida:a.tipoPartida||"",
                dni:a.dni||"",
                cliente:a.cliente||""
              },
              tipoPartida:a.tipoPartida||"",
              dni:a.dni||"",
              cliente:a.cliente||"",
              subidaVerificada:true,
              verificacionPorId:true
            };
          }
        }
        throw new Error(
          "No se pudo confirmar todavía la subida del acta. El PDF NO se reenviará automáticamente. Pulse Actualizar vista y verifique el registro antes de volver a Guardar Acta."
        );
      }

      throw error;
    }
  }
  apiV541.__mv541=true;
  apiV541.__mv540=true;
  apiV541.__mv532=true;
  apiV541.__original=original;
  window.apiActas=apiV541;
  try{apiActas=apiV541;}catch(_){}
  window.MV532_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV540_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV541_ACTAS_CONFIRMACION_ID_OK=true;
  console.log("MI VISUAL V541: confirmacion robusta de validacion y subida de Actas habilitada.");
  return true;
}

if(!instalar()){
  const timer=setInterval(function(){
    if(instalar())clearInterval(timer);
  },1000);
}
})();
