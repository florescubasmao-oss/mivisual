/* ============================================================
   MI VISUAL V532 / V540 - CONFIRMACION PUNTUAL DE ACTAS

   Conserva V532:
   - Si una validacion CORRECTO se guarda en Apps Script pero la respuesta
     de red se pierde, verifica SOLO esa acta por ID.

   V540:
   - Si el Tecnico sube un PDF y el POST termina en 404/timeout/respuesta
     incierta, NO vuelve a subir el PDF automaticamente.
   - Calcula el ID deterministico del acta y consulta SOLO ese registro.
   - Solo considera la subida confirmada si coincide Orden + Numero de Acta,
     existe link PDF y la fecha/hora del registro es reciente.
   - Evita duplicar PDFs o repetir una escritura incierta.
   - No modifica permisos, estados, Drive ni reglas de validacion.
============================================================ */
(function(){
"use strict";
if(window.MV540_ACTAS_CONFIRMACION_ID_CARGADA)return;
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
function esErrorIncierto(error){
  const m=norm(error&&error.message||error||"");
  return /NO RESPONDIO EN LA VERIFICACION|NO SE RECIBIO CONFIRMACION|TARDO DEMASIADO|RESPUESTA INVALIDA|PAGINA EXTERNA|HTTP 404|HTTP 408|HTTP 429|HTTP 500|HTTP 502|HTTP 503|HTTP 504|FAILED TO FETCH|NO ESTA DISPONIBLE TEMPORALMENTE|PODRIA HABERSE REGISTRADO/.test(m);
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
    _v540:Date.now()+"-"+Math.random().toString(36).slice(2)
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
function fechaRegistroRecienteV540(a){
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
  // America/Lima = UTC-5. Construimos UTC sumando 5 h.
  const ts=Date.UTC(y,m-1,d,hh+5,mm,ss);
  if(!isFinite(ts))return true;
  const edad=Math.abs(Date.now()-ts);
  return edad<=8*60*1000;
}
function subidaConfirmadaV540(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const a=r.acta;
  if(!txt(a.linkActa))return false;
  const ordenS=clave(s.codigoOrden||s.codigo_orden||"");
  const ordenA=clave(a.codigoOrden||"");
  const actaS=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  const actaA=claveNumeroActa(a.numeroActa||"");
  if(ordenS&&ordenA&&ordenS!==ordenA)return false;
  if(actaS&&actaA&&actaS!==actaA)return false;
  return fechaRegistroRecienteV540(a);
}
function limpiarCachesActasV540(){
  try{if(typeof window.limpiarCacheActas==="function")window.limpiarCacheActas();}catch(_){}
  try{if(typeof window.mv524LimpiarSnapshotActas==="function")window.mv524LimpiarSnapshotActas();}catch(_){}
}
function instalar(){
  if(window.MV540_ACTAS_CONFIRMACION_ID_OK)return true;
  if(typeof window.apiActas!=="function")return false;
  if(!window.MV524_ACTAS_SNAPSHOT_OK && !window.MV392_ACTAS_REINTENTO_404_OK)return false;

  const original=window.apiActas;
  async function apiV540(payload){
    const s=Object.assign({},payload||{});
    try{
      return await original(s);
    }catch(error){
      if(!esErrorIncierto(error))throw error;

      const esValidacion=s.accion==="validarActaEscaneada" && norm(s.resultado)==="CORRECTO" && txt(s.id);
      if(esValidacion){
        try{
          const r=await consultarActaPorId(s,s.id);
          if(validacionConfirmada(s,r)){
            limpiarCachesActasV540();
            return {
              ok:true,
              modulo:"ACTAS",
              accion:"VALIDACION_CONFIRMADA_V540",
              id:s.id,
              resultado:"CORRECTO",
              estado:r.acta.estado||"",
              estadoVerificado:true,
              verificacionPorId:true
            };
          }
        }catch(_){ }
        throw error;
      }

      const esSubida=s.accion==="registrarActaEscaneada";
      if(esSubida){
        const id=idEsperadoSubida(s);
        if(id){
          for(let intento=0;intento<2;intento++){
            try{
              if(intento)await new Promise(r=>setTimeout(r,1200));
              const r=await consultarActaPorId(s,id);
              if(subidaConfirmadaV540(s,r)){
                limpiarCachesActasV540();
                const a=r.acta||{};
                return {
                  ok:true,
                  modulo:"ACTAS",
                  accion:"SUBIDA_CONFIRMADA_V540",
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
            }catch(_){ }
          }
        }
        // Regla de seguridad: una subida incierta JAMAS se repite automaticamente.
        throw new Error(
          "No se pudo confirmar la subida del acta. Pulse Actualizar vista antes de volver a presionar Guardar Acta."
        );
      }

      throw error;
    }
  }
  apiV540.__mv540=true;
  apiV540.__mv532=true;
  apiV540.__original=original;
  window.apiActas=apiV540;
  try{apiActas=apiV540;}catch(_){}
  window.MV532_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV540_ACTAS_CONFIRMACION_ID_OK=true;
  console.log("MI VISUAL V540: confirmacion puntual de validacion y subida de Actas habilitada.");
  return true;
}

if(!instalar()){
  const timer=setInterval(function(){
    if(instalar())clearInterval(timer);
  },1000);
}
})();
