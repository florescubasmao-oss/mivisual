/* ============================================================
   MI VISUAL V556 - ACTAS / ESCRITURA UNICA + CONFIRMACION REAL
   17/09/2026

   Conserva V392/V524:
   - cola de escrituras por pestaña;
   - snapshot de carga de Gestión de Actas;
   - tolerancia a fallas transitorias solo en acciones idempotentes;
   - no repite subida/reemplazo de PDF ni generación de cargos.

   V556:
   - validarActaEscaneada se envía UNA SOLA VEZ;
   - CORRECTO y OBSERVADO se confirman por lectura real del acta;
   - compatible con ALMACEN y JEFATURA ALMACEN;
   - elimina el re-POST automático de una validación incierta;
   - reduce el tiempo máximo de una validación a 45 s;
   - no modifica backend, Drive, permisos, estados ni histórico.
============================================================ */
(function(){
"use strict";
if(window.MV556_ACTAS_ESTABLE_OK || window.MV392_ACTAS_REINTENTO_404_OK || window.MV524_ACTAS_SNAPSHOT_OK)return;

const original=window.apiActas;
if(typeof original!=="function")return;

try{
  if(typeof ACTAS_LECTURAS_GET!=="undefined" && ACTAS_LECTURAS_GET instanceof Set){
    ACTAS_LECTURAS_GET.add("validarRecepcionMasivaActas");
  }
}catch(_){}

/*
  Solo estas acciones conservan UN reintento automático porque son
  idempotentes en el backend vigente. La validación de Actas queda fuera:
  V556 la envía una sola vez y después únicamente consulta el resultado.
*/
const REINTENTABLES=new Set([
  "actualizarEntregaFisicaActa",
  "actualizarDatosAutomaticosActas",
  "procesarFechasPendientesActas"
]);

const HTTP_TRANSITORIOS=new Set([404,408,429,500,502,503,504]);
const V524_ACCION_SNAPSHOT="cargarGestionActas";
const V524_PREFIJO="MV524_ACTAS_CARGA|";
const V524_FRESCO_MS=90*1000;
const V524_MAX_MS=30*60*1000;
const V524_ESPERA_FORZADA_MS=12000;
const V524_EN_CURSO=new Map();

let cola=Promise.resolve();
const dormir=ms=>new Promise(r=>setTimeout(r,ms));

function txt(v){return String(v==null?"":v).trim();}
function norm(v){
  return txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim();
}

function esLectura(p){
  try{
    return typeof ACTAS_LECTURAS_GET!=="undefined" &&
      ACTAS_LECTURAS_GET instanceof Set &&
      ACTAS_LECTURAS_GET.has(p&&p.accion);
  }catch(_){return false;}
}

/* =========================
   V524 - SNAPSHOT DE LECTURA
========================= */
function contextoV524(s){
  let perfil="",sede="",cuadrilla="";
  try{
    perfil=norm(localStorage.getItem("perfil"));
    sede=norm(localStorage.getItem("sede"));
    cuadrilla=norm(localStorage.getItem("cuadrilla"));
  }catch(_){}
  return [txt(s&&s.usuario),perfil,sede,cuadrilla,txt(s&&s.periodo)].join("|");
}
function claveSnapshotV524(s){return V524_PREFIJO+contextoV524(s);}
function leerSnapshotV524(s){
  try{
    const raw=sessionStorage.getItem(claveSnapshotV524(s));
    if(!raw)return null;
    const item=JSON.parse(raw);
    const fecha=Number(item&&item.fecha)||0;
    const edad=Date.now()-fecha;
    if(!item||!item.data||edad<0||edad>V524_MAX_MS){
      sessionStorage.removeItem(claveSnapshotV524(s));
      return null;
    }
    return {data:item.data,edad,fecha};
  }catch(_){return null;}
}
function guardarSnapshotV524(s,data){
  if(!data||data.ok===false)return;
  try{
    sessionStorage.setItem(claveSnapshotV524(s),JSON.stringify({version:"V556",fecha:Date.now(),data}));
  }catch(_){}
}
function limpiarSnapshotsV524(){
  try{
    const borrar=[];
    for(let i=0;i<sessionStorage.length;i++){
      const k=sessionStorage.key(i);
      if(k&&k.startsWith(V524_PREFIJO))borrar.push(k);
    }
    borrar.forEach(k=>sessionStorage.removeItem(k));
  }catch(_){}
}
function marcarSnapshotV524(data,vencida){
  const salida=Object.assign({},data||{});
  salida.__snapshotV524=true;
  if(vencida)salida.__cacheVencida=true;
  return salida;
}
function refrescarSnapshotV524(s){
  const clave=claveSnapshotV524(s);
  if(V524_EN_CURSO.has(clave))return V524_EN_CURSO.get(clave);
  const solicitud=Object.assign({},s||{},{__forzar:true});
  const tarea=Promise.resolve()
    .then(()=>original(solicitud))
    .then(data=>{guardarSnapshotV524(s,data);return data;})
    .catch(error=>{console.warn("V556 Actas: refresco no disponible",error);return null;})
    .finally(()=>{if(V524_EN_CURSO.get(clave)===tarea)V524_EN_CURSO.delete(clave);});
  V524_EN_CURSO.set(clave,tarea);
  return tarea;
}
async function leerCargaActasV524(s){
  const forzar=!!s.__forzar;
  const snapshot=leerSnapshotV524(s);
  if(!forzar&&snapshot){
    const vencida=snapshot.edad>V524_FRESCO_MS;
    if(vencida)refrescarSnapshotV524(s);
    return marcarSnapshotV524(snapshot.data,vencida);
  }
  if(!snapshot){
    const data=await original(s);
    guardarSnapshotV524(s,data);
    return data;
  }
  const lectura=refrescarSnapshotV524(s);
  const ESPERA={v556:"espera"};
  const resultado=await Promise.race([
    lectura,
    dormir(V524_ESPERA_FORZADA_MS).then(()=>ESPERA)
  ]);
  if(resultado&&resultado!==ESPERA)return resultado;
  return marcarSnapshotV524(snapshot.data,true);
}

/* =========================
   API / EXEC
========================= */
async function comprobarExecV556(){
  try{
    const url=new URL(API_ACTAS);
    url.searchParams.set("accion","versionMiVisual");
    url.searchParams.set("_",Date.now());
    const c=typeof AbortController==="function"?new AbortController():null;
    const timer=c?setTimeout(()=>c.abort(),7000):null;
    try{
      const r=await fetch(url.toString(),{method:"GET",cache:"no-store",redirect:"follow",signal:c?c.signal:undefined});
      if(!r.ok)return false;
      const t=(await r.text()).trim();
      if(!t)return false;
      if(/^MI VISUAL API OK$/i.test(t))return true;
      try{const j=JSON.parse(t);return !!(j&&j.ok!==false);}catch(_){return !/<!doctype|<html/i.test(t);}
    }finally{if(timer)clearTimeout(timer);}
  }catch(_){return false;}
}

function timeoutEscrituraV556(accion){
  if(accion==="registrarActaEscaneada")return 105000;
  if(accion==="validarActaEscaneada")return 45000;
  return 60000;
}

async function postUnaVez(s){
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(()=>c.abort(),timeoutEscrituraV556(s&&s.accion)):null;
  try{
    const res=await fetch(API_ACTAS,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=UTF-8","Accept":"application/json"},
      body:JSON.stringify(s),
      cache:"no-store",
      redirect:"follow",
      signal:c?c.signal:undefined
    });
    const texto=(await res.text()).trim();
    if(!res.ok){
      const e=new Error(`Google Apps Script respondió temporalmente con HTTP ${res.status}.`);
      e.transitorio=HTTP_TRANSITORIOS.has(res.status);
      e.httpStatus=res.status;
      e.incierto=e.transitorio;
      throw e;
    }
    if(/^MI VISUAL API OK$/i.test(texto)){
      const e=new Error("No se recibió confirmación de la operación.");
      e.sinConfirmacionActa=true;
      e.incierto=true;
      throw e;
    }
    if(/<!doctype|<html|google drive|accounts\.google/i.test(texto)){
      const e=new Error("Google devolvió una página externa en lugar de la confirmación.");
      e.incierto=true;
      throw e;
    }
    let data;
    try{data=JSON.parse(texto);}catch(_){
      const e=new Error("La API devolvió una respuesta inválida.");
      e.incierto=true;
      throw e;
    }
    if(!data||data.ok===false)throw new Error((data&&data.error)||"Error en Gestión de Actas");
    try{if(typeof limpiarCacheActas==="function")limpiarCacheActas();}catch(_){}
    limpiarSnapshotsV524();
    return data;
  }catch(error){
    if(error&&error.name==="AbortError"){
      const e=new Error("La operación tardó demasiado.");
      e.transitorio=true;
      e.httpStatus=0;
      e.incierto=true;
      throw e;
    }
    if(error instanceof TypeError){
      error.transitorio=true;
      error.httpStatus=0;
      error.incierto=true;
    }
    throw error;
  }finally{if(timer)clearTimeout(timer);}
}

/* =========================
   V556 - CONFIRMACION DE VALIDACION SIN RE-POST
========================= */
async function leerActaPorIdV556(s){
  if(!txt(s&&s.id))return null;
  const payload={
    accion:"obtenerActaPorIdV532",
    usuario:s.usuario,
    id:s.id,
    _v556:Date.now()+"-"+Math.random().toString(36).slice(2)
  };
  try{
    if(typeof mv336ApiGet==="function"){
      const r=await mv336ApiGet(API_ACTAS,payload,{intentos:1,tiempoMs:6500});
      return r&&r.ok===true?r:null;
    }
    const u=new URL(API_ACTAS);
    Object.entries(payload).forEach(([k,v])=>u.searchParams.set(k,String(v)));
    const c=typeof AbortController==="function"?new AbortController():null;
    const timer=c?setTimeout(()=>c.abort(),6500):null;
    try{
      const res=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"},signal:c?c.signal:undefined});
      if(!res.ok)return null;
      const raw=(await res.text()).trim();
      if(!raw||/<!doctype|<html/i.test(raw))return null;
      const r=JSON.parse(raw);
      return r&&r.ok===true?r:null;
    }finally{if(timer)clearTimeout(timer);}
  }catch(_){return null;}
}

async function leerActaEnListadoV556(s){
  try{
    const payload={
      accion:"listarActasEscaneadas",
      usuario:s.usuario,
      _v556lista:Date.now()+"-"+Math.random().toString(36).slice(2)
    };
    let r;
    if(typeof mv336ApiGet==="function"){
      r=await mv336ApiGet(API_ACTAS,payload,{intentos:1,tiempoMs:7000});
    }else{
      const u=new URL(API_ACTAS);
      Object.entries(payload).forEach(([k,v])=>u.searchParams.set(k,String(v)));
      const c=typeof AbortController==="function"?new AbortController():null;
      const timer=c?setTimeout(()=>c.abort(),7000):null;
      try{
        const res=await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"},signal:c?c.signal:undefined});
        if(!res.ok)return null;
        const raw=(await res.text()).trim();
        if(!raw||/<!doctype|<html/i.test(raw))return null;
        r=JSON.parse(raw);
      }finally{if(timer)clearTimeout(timer);}
    }
    if(!r||r.ok!==true||!Array.isArray(r.actas))return null;
    const a=r.actas.find(x=>txt(x&&x.id)===txt(s.id));
    return a?{ok:true,acta:a,perfil:r.perfil||""}:null;
  }catch(_){return null;}
}

function validacionCoincideV556(s,r){
  if(!r||r.ok!==true||!r.acta)return false;
  const esperado=norm(s&&s.resultado);
  if(!["CORRECTO","OBSERVADO"].includes(esperado))return false;
  const perfil=norm(r.perfil||localStorage.getItem("perfil"));
  const a=r.acta;
  let resultado="",validador="";
  if(perfil==="ALMACEN"){
    resultado=norm(a.resultadoAlmacen);
    validador=txt(a.validadoAlmacenPor);
  }else if(perfil==="JEFATURA ALMACEN"){
    resultado=norm(a.resultadoJefatura);
    validador=txt(a.validadoJefaturaPor);
  }else return false;
  if(resultado!==esperado||!validador)return false;
  if(perfil==="JEFATURA ALMACEN"&&esperado==="CORRECTO"&&norm(a.estado)!=="FINALIZADO")return false;
  return true;
}

async function confirmarValidacionV556(s){
  const etapas=[
    {espera:0,lista:false},
    {espera:900,lista:false},
    {espera:1800,lista:true}
  ];
  for(const etapa of etapas){
    if(etapa.espera)await dormir(etapa.espera);
    const tareas=[leerActaPorIdV556(s)];
    if(etapa.lista)tareas.push(leerActaEnListadoV556(s));
    const rs=await Promise.allSettled(tareas);
    for(const x of rs){
      if(x.status==="fulfilled"&&validacionCoincideV556(s,x.value))return x.value;
    }
  }
  return null;
}

async function escribirValidacionV556(s){
  try{
    return await postUnaVez(s);
  }catch(error){
    if(!error||!error.incierto)throw error;
    const confirmado=await confirmarValidacionV556(s);
    if(confirmado){
      try{if(typeof limpiarCacheActas==="function")limpiarCacheActas();}catch(_){}
      limpiarSnapshotsV524();
      return {
        ok:true,
        modulo:"ACTAS",
        accion:"VALIDACION_CONFIRMADA_V556",
        id:s.id,
        resultado:norm(s.resultado),
        estado:(confirmado.acta&&confirmado.acta.estado)||"",
        estadoVerificado:true,
        verificacionPorId:true,
        escrituraRepetida:false
      };
    }
    throw new Error(
      "Google no confirmó todavía la validación. MI VISUAL no la repetirá automáticamente. Pulse Actualizar vista antes de volver a validar."
    );
  }
}

/* =========================
   ESCRITURAS GENERALES
========================= */
async function escribirGeneralV556(s){
  let intento=0;
  while(true){
    try{return await postUnaVez(s);}catch(error){
      const accion=s&&s.accion||"";
      const segura=REINTENTABLES.has(accion);
      const transitorio=!!(error&&error.transitorio);
      const puedeReintentar=intento===0&&segura&&transitorio;
      if(!puedeReintentar){
        if(error&&error.incierto&&!segura){
          throw new Error(
            `${error.message} La operación podría haberse registrado. `+
            `Pulse Actualizar vista antes de volver a ejecutarla.`
          );
        }
        throw error;
      }
      intento++;
      if(error.httpStatus===404){
        await dormir(700);
        const apiActiva=await comprobarExecV556();
        if(!apiActiva){
          throw new Error("La API de Gestión de Actas no respondió en la verificación. Actualice la vista e intente nuevamente en unos segundos.");
        }
        await dormir(700);
      }else{
        await dormir(900);
      }
    }
  }
}

async function apiV556(payload){
  const s=Object.assign({},payload||{});
  if(esLectura(s)){
    if(s.accion===V524_ACCION_SNAPSHOT)return await leerCargaActasV524(s);
    return await original(s);
  }

  const ejecutar=()=>s.accion==="validarActaEscaneada"
    ? escribirValidacionV556(s)
    : escribirGeneralV556(s);
  const p=cola.then(ejecutar,ejecutar);
  cola=p.catch(()=>{});
  return await p;
}

apiV556.__mv392=true;
apiV556.__mv524=true;
apiV556.__mv556=true;
apiV556.__original=original;
window.apiActas=apiV556;
try{apiActas=apiV556;}catch(_){}

window.MV392_ACTAS_REINTENTO_404_OK=true;
window.MV524_ACTAS_SNAPSHOT_OK=true;
window.MV556_ACTAS_ESTABLE_OK=true;
window.mv524LimpiarSnapshotActas=limpiarSnapshotsV524;
console.log("MI VISUAL V556: Actas con validación de escritura única y confirmación real habilitada.");
})();
