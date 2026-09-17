/* ============================================================
   MI VISUAL V555 - CONFIRMACION RESILIENTE DE ACTAS
   17/09/2026

   Objetivo:
   - Conservar V545 para subida de PDF sin repetir escrituras.
   - Corregir validaciones de ALMACEN / JEFATURA ALMACEN cuando
     Google pierde la respuesta del POST.
   - Confirmar tanto CORRECTO como OBSERVADO por lectura puntual.
   - NUNCA repetir automaticamente validarActaEscaneada.
   - No modifica backend, Drive, permisos, estados ni historico.
============================================================ */
(function(){
"use strict";

if(window.MV555_ACTAS_CONFIRMACION_CARGADA)return;
window.MV555_ACTAS_CONFIRMACION_CARGADA=true;
window.MV545_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV542_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV541_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV540_ACTAS_CONFIRMACION_ID_CARGADA=true;
window.MV532_ACTAS_CONFIRMACION_ID_CARGADA=true;

function txt(v){return String(v==null?"":v).trim();}
function norm(v){
  return txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim();
}
function clave(v){return norm(v).replace(/[^A-Z0-9]/g,"");}
function claveNumeroActa(v){
  let k=clave(v);
  if(/^\d+$/.test(k))k=k.replace(/^0+(?=\d)/,"");
  return k;
}
function dormir(ms){return new Promise(function(r){setTimeout(r,ms);});}
function apiBase(){return window.API_ACTAS||window.MI_VISUAL_API_URL||"";}

function esErrorIncierto(error){
  const m=norm(error&&error.message||error||"");
  return /NO RESPONDIO EN LA VERIFICACION|NO SE RECIBIO CONFIRMACION|NO SE PUDO CONFIRMAR LA SUBIDA|TARDO DEMASIADO|RESPUESTA INVALIDA|PAGINA EXTERNA|HTTP 404|HTTP 408|HTTP 429|HTTP 500|HTTP 502|HTTP 503|HTTP 504|FAILED TO FETCH|NO ESTA DISPONIBLE TEMPORALMENTE|PODRIA HABERSE REGISTRADO|ACTUALICE LA VISTA ANTES DE REPETIR/.test(m);
}

function idEsperadoSubida(s){
  const original=txt(s.idActaOriginal||s.id_acta_original||"");
  if(original)return original;
  const orden=clave(s.codigoOrden||s.codigo_orden||"");
  const acta=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  if(!orden)return "";
  return "ACTA-"+orden+(acta?"-"+acta:"");
}

async function consultarActaPorIdV555(s,idOverride){
  const id=txt(idOverride||s.id);
  if(!id)throw new Error("ID de acta no disponible");
  const base=apiBase();
  if(!base)throw new Error("API de Gestión de Actas no disponible");
  const payload={
    accion:"obtenerActaPorIdV532",
    usuario:s.usuario,
    id:id,
    _v555:Date.now()+"-"+Math.random().toString(36).slice(2)
  };

  if(typeof window.mv336ApiGet==="function"){
    return await window.mv336ApiGet(base,payload,{intentos:1,tiempoMs:5500});
  }

  const url=new URL(base);
  Object.keys(payload).forEach(function(k){url.searchParams.set(k,String(payload[k]));});
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(function(){c.abort();},5500):null;
  try{
    const r=await fetch(url.toString(),{
      method:"GET",cache:"no-store",redirect:"follow",
      headers:{"Accept":"application/json"},signal:c?c.signal:undefined
    });
    if(!r.ok)throw new Error("HTTP "+r.status);
    const t=(await r.text()).trim();
    if(!t||/<!doctype|<html/i.test(t))throw new Error("Respuesta inválida");
    const j=JSON.parse(t);
    if(!j||j.ok===false)throw new Error((j&&j.error)||"Consulta no disponible");
    return j;
  }finally{
    if(timer)clearTimeout(timer);
  }
}

async function consultarActaEnListadoV555(s,id){
  const base=apiBase();
  if(!base)return null;
  const payload={
    accion:"listarActasEscaneadas",
    usuario:s.usuario,
    _v555lista:Date.now()+"-"+Math.random().toString(36).slice(2)
  };
  try{
    let r;
    if(typeof window.mv336ApiGet==="function"){
      r=await window.mv336ApiGet(base,payload,{intentos:1,tiempoMs:6500});
    }else{
      const u=new URL(base);
      Object.keys(payload).forEach(function(k){u.searchParams.set(k,String(payload[k]));});
      const c=typeof AbortController==="function"?new AbortController():null;
      const timer=c?setTimeout(function(){c.abort();},6500):null;
      try{
        const res=await fetch(u.toString(),{
          method:"GET",cache:"no-store",redirect:"follow",
          headers:{"Accept":"application/json"},signal:c?c.signal:undefined
        });
        if(!res.ok)throw new Error("HTTP "+res.status);
        const raw=(await res.text()).trim();
        if(!raw||/<!doctype|<html/i.test(raw))throw new Error("Respuesta inválida");
        r=JSON.parse(raw);
      }finally{
        if(timer)clearTimeout(timer);
      }
    }
    if(!r||r.ok!==true||!Array.isArray(r.actas))return null;
    const a=r.actas.find(function(x){return txt(x&&x.id)===txt(id);});
    return a?{ok:true,acta:a,perfil:r.perfil||""}:null;
  }catch(_){
    return null;
  }
}

function validacionConfirmadaV555(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const esperado=norm(s.resultado||"");
  if(["CORRECTO","OBSERVADO"].indexOf(esperado)<0)return false;

  const a=r.acta;
  const perfil=norm(r.perfil||localStorage.getItem("perfil")||"");

  if(perfil==="ALMACEN"){
    return norm(a.resultadoAlmacen)===esperado && !!txt(a.validadoAlmacenPor);
  }

  if(perfil==="JEFATURA ALMACEN"){
    const estadoEsperado=esperado==="CORRECTO"?"FINALIZADO":"PENDIENTE";
    return norm(a.resultadoJefatura)===esperado &&
      norm(a.estado)===estadoEsperado &&
      !!txt(a.validadoJefaturaPor);
  }

  return false;
}

function fechaRegistroRecienteV555(a){
  const pares=[
    [a&&a.fechaActualizacion,a&&a.horaActualizacion],
    [a&&a.fechaRegistro,a&&a.horaRegistro],
    [a&&a.fechaSubida,a&&a.horaSubida]
  ];
  for(const par of pares){
    const f=txt(par[0]),h=txt(par[1]);
    if(!f)continue;
    let y,m,d;
    let x=f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(x){d=Number(x[1]);m=Number(x[2]);y=Number(x[3]);}
    else{
      x=f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if(x){y=Number(x[1]);m=Number(x[2]);d=Number(x[3]);}
    }
    if(!y||!m||!d)continue;
    const hm=(h.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)||[]);
    const hh=Number(hm[1]||0),mm=Number(hm[2]||0),ss=Number(hm[3]||0);
    const ts=Date.UTC(y,m-1,d,hh+5,mm,ss);
    if(isFinite(ts))return Math.abs(Date.now()-ts)<=15*60*1000;
  }
  return true;
}

function subidaConfirmadaV555(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const a=r.acta;
  if(!txt(a.linkActa))return false;
  const ordenS=clave(s.codigoOrden||s.codigo_orden||"");
  const ordenA=clave(a.codigoOrden||"");
  const actaS=claveNumeroActa(s.numeroActa||s.numero_acta||"");
  const actaA=claveNumeroActa(a.numeroActa||"");
  if(ordenS&&ordenA&&ordenS!==ordenA)return false;
  if(actaS&&actaA&&actaS!==actaA)return false;
  return fechaRegistroRecienteV555(a);
}

function limpiarCachesActasV555(){
  try{if(typeof window.limpiarCacheActas==="function")window.limpiarCacheActas();}catch(_){}
  try{if(typeof window.mv524LimpiarSnapshotActas==="function")window.mv524LimpiarSnapshotActas();}catch(_){}
  try{
    for(let i=sessionStorage.length-1;i>=0;i--){
      const k=sessionStorage.key(i)||"";
      if(k.indexOf("MV524_ACTAS_CARGA|")===0)sessionStorage.removeItem(k);
    }
  }catch(_){}
}

function coincideV555(modo,s,r){
  return modo==="SUBIDA"?subidaConfirmadaV555(s,r):validacionConfirmadaV555(s,r);
}

async function etapaVerificacionV555(s,id,modo,usarListado){
  const tareas=[consultarActaPorIdV555(s,id)];
  if(usarListado)tareas.push(consultarActaEnListadoV555(s,id));
  const resultados=await Promise.allSettled(tareas);
  for(const x of resultados){
    if(x.status==="fulfilled"&&x.value&&coincideV555(modo,s,x.value))return x.value;
  }
  return null;
}

async function confirmarConEsperaV555(s,id,modo){
  const etapas=modo==="SUBIDA"
    ? [{espera:0,lista:false},{espera:1100,lista:true},{espera:2200,lista:true}]
    : [{espera:0,lista:false},{espera:800,lista:true},{espera:1600,lista:true}];

  for(const e of etapas){
    if(e.espera)await dormir(e.espera);
    const r=await etapaVerificacionV555(s,id,modo,e.lista);
    if(r)return r;
  }
  return null;
}

function mostrarVerificacionSubidaV555(){
  const msg=document.getElementById("actaMsg");
  if(msg){
    msg.innerHTML='<div class="actas-msg" style="background:#eff6ff;color:#1e3a8a">⏳ Google demoró en responder. MI VISUAL está verificando si el acta ya quedó registrada. No vuelva a pulsar Guardar.</div>';
  }
  const btn=document.querySelector("#formActa [data-guardar]");
  if(btn){btn.disabled=true;btn.innerHTML="Verificando registro...";}
}

function instalar(){
  if(window.MV555_ACTAS_CONFIRMACION_OK)return true;
  if(typeof window.apiActas!=="function")return false;
  if(!window.MV524_ACTAS_SNAPSHOT_OK&&!window.MV392_ACTAS_REINTENTO_404_OK)return false;

  const original=window.apiActas;

  async function apiV555(payload){
    const s=Object.assign({},payload||{});
    try{
      return await original(s);
    }catch(error){
      if(!esErrorIncierto(error))throw error;

      const resultado=norm(s.resultado||"");
      const esValidacion=s.accion==="validarActaEscaneada" &&
        ["CORRECTO","OBSERVADO"].indexOf(resultado)>=0 && !!txt(s.id);

      if(esValidacion){
        const r=await confirmarConEsperaV555(s,s.id,"VALIDACION");
        if(r){
          limpiarCachesActasV555();
          return {
            ok:true,
            modulo:"ACTAS",
            accion:"VALIDACION_CONFIRMADA_V555",
            id:s.id,
            resultado:resultado,
            estado:r.acta&&r.acta.estado?r.acta.estado:"",
            estadoVerificado:true,
            verificacionPorId:true,
            noRepetida:true
          };
        }
        limpiarCachesActasV555();
        throw new Error(
          "Google no confirmó todavía la validación. MI VISUAL no la repetirá automáticamente. Pulse Actualizar vista y revise el estado del acta antes de volver a validar."
        );
      }

      if(s.accion==="registrarActaEscaneada"){
        mostrarVerificacionSubidaV555();
        const id=idEsperadoSubida(s);
        if(id){
          const r=await confirmarConEsperaV555(s,id,"SUBIDA");
          if(r){
            limpiarCachesActasV555();
            const a=r.acta||{};
            return {
              ok:true,
              modulo:"ACTAS",
              accion:"SUBIDA_CONFIRMADA_V555",
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
          "Google no confirmó todavía la subida. El PDF NO se reenviará automáticamente. Pulse Actualizar vista antes de volver a Guardar Acta."
        );
      }

      throw error;
    }
  }

  apiV555.__mv555=true;
  apiV555.__mv545=true;
  apiV555.__mv542=true;
  apiV555.__mv541=true;
  apiV555.__mv540=true;
  apiV555.__mv532=true;
  apiV555.__original=original;

  window.apiActas=apiV555;
  try{apiActas=apiV555;}catch(_){}

  window.MV532_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV540_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV541_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV542_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV545_ACTAS_CONFIRMACION_ID_OK=true;
  window.MV555_ACTAS_CONFIRMACION_OK=true;

  console.log("MI VISUAL V555: validación Actas CORRECTO/OBSERVADO verificada sin repetir escrituras.");
  return true;
}

const previoAntes=window.mv339Antes_mostrarGestionActas;
window.mv339Antes_mostrarGestionActas=function(){
  if(typeof previoAntes==="function"){
    try{previoAntes.apply(this,arguments);}catch(_){}
  }
  instalar();
};

if(!instalar()){
  const timer=setInterval(function(){if(instalar())clearInterval(timer);},700);
  setTimeout(function(){try{clearInterval(timer);}catch(_){}},15000);
}

})();
