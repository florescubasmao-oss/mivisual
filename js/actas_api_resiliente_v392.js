/* ============================================================
   MI VISUAL V392 / V524 - RESILIENCIA Y CARGA ESTABLE DE ACTAS

   Conserva V392:
   - Cola de escrituras V388.
   - Tolerancia a HTTP 404/429/502/503/504 solo en operaciones seguras.
   - Verificacion de /exec antes del unico reintento por 404.
   - NO reintenta subir/reemplazar PDF ni generar cargos.

   V524:
   - Conserva en sessionStorage la ultima carga exitosa de Gestion de Actas.
   - Snapshot aislado por usuario + perfil + sede + cuadrilla + periodo.
   - Apertura normal: usa inmediatamente snapshot reciente y refresca en
     segundo plano cuando corresponde.
   - Actualizar/Reintentar: espera hasta 12 s; si Google sigue lento, mantiene
     la ultima vista disponible mientras la lectura GET continua en segundo plano.
   - Nunca repite automaticamente una escritura por esta optimizacion.
   - Una escritura exitosa invalida snapshots para no mostrar datos obsoletos.
   - No modifica permisos, filtros, periodos, Drive, estados ni backend.
============================================================ */
(function(){
"use strict";
if(window.MV392_ACTAS_REINTENTO_404_OK || window.MV524_ACTAS_SNAPSHOT_OK)return;

const original=window.apiActas;
if(typeof original!=="function")return;

try{
  if(typeof ACTAS_LECTURAS_GET!=="undefined" && ACTAS_LECTURAS_GET instanceof Set){
    ACTAS_LECTURAS_GET.add("validarRecepcionMasivaActas");
  }
}catch(_){}

const REINTENTABLES=new Set([
  "validarActaEscaneada",
  "actualizarEntregaFisicaActa",
  "actualizarDatosAutomaticosActas",
  "procesarFechasPendientesActas"
]);

const HTTP_TRANSITORIOS=new Set([404,429,502,503,504]);

// V524: solo protege la carga principal. Las demas lecturas conservan V392/V340.
const V524_ACCION_SNAPSHOT="cargarGestionActas";
const V524_PREFIJO="MV524_ACTAS_CARGA|";
const V524_FRESCO_MS=90*1000;
const V524_MAX_MS=30*60*1000;
const V524_ESPERA_FORZADA_MS=12000;
const V524_EN_CURSO=new Map();

let cola=Promise.resolve();
const dormir=ms=>new Promise(r=>setTimeout(r,ms));

function txtV524(v){return String(v==null?"":v).trim();}
function normV524(v){
  return txtV524(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}

function esLectura(p){
  try{
    return typeof ACTAS_LECTURAS_GET!=="undefined" &&
      ACTAS_LECTURAS_GET instanceof Set &&
      ACTAS_LECTURAS_GET.has(p?.accion);
  }catch(_){return false;}
}

function contextoV524(s){
  let perfil="",sede="",cuadrilla="";
  try{
    perfil=normV524(localStorage.getItem("perfil"));
    sede=normV524(localStorage.getItem("sede"));
    cuadrilla=normV524(localStorage.getItem("cuadrilla"));
  }catch(_){}
  return [
    txtV524(s&&s.usuario),
    perfil,
    sede,
    cuadrilla,
    txtV524(s&&s.periodo)
  ].join("|");
}

function claveSnapshotV524(s){
  return V524_PREFIJO+contextoV524(s);
}

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
    return {data:item.data,edad:edad,fecha:fecha};
  }catch(_){return null;}
}

function guardarSnapshotV524(s,data){
  if(!data||data.ok===false)return;
  try{
    sessionStorage.setItem(claveSnapshotV524(s),JSON.stringify({
      version:"V524",
      fecha:Date.now(),
      data:data
    }));
  }catch(_){
    // Si el navegador no dispone de cuota suficiente, V340/V392 siguen
    // funcionando sin degradar ni bloquear Gestion de Actas.
  }
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

  const solicitud=Object.assign({},s||{}, {__forzar:true});
  const tarea=Promise.resolve()
    .then(()=>original(solicitud))
    .then(data=>{
      guardarSnapshotV524(s,data);
      return data;
    })
    .catch(error=>{
      console.warn("V524 Actas: refresco en segundo plano no disponible",error);
      return null;
    })
    .finally(()=>{
      if(V524_EN_CURSO.get(clave)===tarea)V524_EN_CURSO.delete(clave);
    });

  V524_EN_CURSO.set(clave,tarea);
  return tarea;
}

async function leerCargaActasV524(s){
  const forzar=!!s.__forzar;
  const snapshot=leerSnapshotV524(s);

  // Apertura normal: la ultima carga exitosa aparece de inmediato. Si ya
  // supera el TTL original de V340, se refresca por GET en segundo plano.
  if(!forzar&&snapshot){
    const vencida=snapshot.edad>V524_FRESCO_MS;
    if(vencida)refrescarSnapshotV524(s);
    return marcarSnapshotV524(snapshot.data,vencida);
  }

  // Primera carga de la sesion: no se inventan datos ni se amplian tiempos.
  // Se conserva exactamente la lectura GET vigente de V340/V392.
  if(!snapshot){
    const data=await original(s);
    guardarSnapshotV524(s,data);
    return data;
  }

  // Actualizar vista / Reintentar: se pide informacion real. Si Google tarda
  // mas de 12 s, no se destruye la vista ya disponible; la lectura sigue viva
  // en segundo plano y actualiza el snapshot cuando termine.
  const lectura=refrescarSnapshotV524(s);
  const ESPERA={v524:"espera"};
  const resultado=await Promise.race([
    lectura,
    dormir(V524_ESPERA_FORZADA_MS).then(()=>ESPERA)
  ]);

  if(resultado&&resultado!==ESPERA)return resultado;
  return marcarSnapshotV524(snapshot.data,true);
}

async function comprobarExecV392(){
  try{
    const url=new URL(API_ACTAS);
    url.searchParams.set("accion","versionMiVisual");
    url.searchParams.set("_",Date.now());

    const c=typeof AbortController==="function"?new AbortController():null;
    const timer=c?setTimeout(()=>c.abort(),12000):null;

    try{
      const r=await fetch(url.toString(),{
        method:"GET",
        cache:"no-store",
        redirect:"follow",
        signal:c?c.signal:undefined
      });
      if(!r.ok)return false;

      const t=(await r.text()).trim();
      if(!t)return false;

      if(/^MI VISUAL API OK$/i.test(t))return true;

      try{
        const j=JSON.parse(t);
        return !!(j && j.ok!==false);
      }catch(_){
        return !/<!doctype|<html/i.test(t);
      }
    }finally{
      if(timer)clearTimeout(timer);
    }
  }catch(_){
    return false;
  }
}

async function postUnaVez(s){
  const c=typeof AbortController==="function"?new AbortController():null;
  const timer=c?setTimeout(()=>c.abort(),105000):null;

  try{
    const res=await fetch(API_ACTAS,{
      method:"POST",
      headers:{
        "Content-Type":"text/plain;charset=UTF-8",
        "Accept":"application/json"
      },
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
      throw e;
    }

    if(/^MI VISUAL API OK$/i.test(texto)){
      const e=new Error(
        "No se recibió confirmación de la operación. Actualice la vista antes de repetirla."
      );
      e.transitorio=false;
      throw e;
    }

    if(/<!doctype|<html|google drive|accounts\.google/i.test(texto)){
      const e=new Error(
        "Google devolvió una página externa. Actualice la vista antes de repetir la operación."
      );
      e.transitorio=false;
      throw e;
    }

    let data;
    try{
      data=JSON.parse(texto);
    }catch(_){
      const e=new Error(
        "La API devolvió una respuesta inválida. Actualice la vista antes de repetir."
      );
      e.transitorio=false;
      throw e;
    }

    if(!data || data.ok===false){
      throw new Error((data&&data.error)||"Error en Gestión de Actas");
    }

    try{
      if(typeof limpiarCacheActas==="function")limpiarCacheActas();
    }catch(_){}
    limpiarSnapshotsV524();

    return data;

  }catch(error){
    if(error?.name==="AbortError"){
      const e=new Error(
        "La operación tardó demasiado. Actualice la vista antes de repetirla."
      );
      e.transitorio=true;
      e.httpStatus=0;
      throw e;
    }

    if(error instanceof TypeError){
      error.transitorio=true;
      error.httpStatus=0;
    }

    throw error;

  }finally{
    if(timer)clearTimeout(timer);
  }
}

async function escribirV392(s){
  let intento=0;

  while(true){
    try{
      return await postUnaVez(s);

    }catch(error){
      const accion=s?.accion||"";
      const segura=REINTENTABLES.has(accion);
      const transitorio=!!error.transitorio;
      const puedeReintentar=intento===0 && segura && transitorio;

      if(!puedeReintentar){
        if(transitorio && !segura){
          throw new Error(
            `${error.message} La operación podría haberse registrado. `+
            `Pulse Actualizar vista antes de volver a ejecutarla.`
          );
        }
        throw error;
      }

      intento++;

      // Caso reportado: HTTP 404 intermitente en POST.
      // Antes de repetir la operación segura comprobamos que /exec siga activo.
      if(error.httpStatus===404){
        await dormir(900);
        const apiActiva=await comprobarExecV392();

        if(!apiActiva){
          throw new Error(
            "La API de Gestión de Actas no respondió en la verificación. "+
            "Actualice la vista e intente nuevamente en unos segundos."
          );
        }

        await dormir(900);
      }else{
        await dormir(1200);
      }
    }
  }
}

async function apiV392(payload){
  const s=Object.assign({},payload||{});

  // V524 solo interviene en la carga principal, que es una lectura GET.
  // Las otras lecturas siguen exactamente la ruta V340/V392 existente.
  if(esLectura(s)){
    if(s.accion===V524_ACCION_SNAPSHOT){
      return await leerCargaActasV524(s);
    }
    return await original(s);
  }

  // Escrituras: una por vez dentro de la pestaña.
  const ejecutar=()=>escribirV392(s);
  const p=cola.then(ejecutar,ejecutar);
  cola=p.catch(()=>{});
  return await p;
}

apiV392.__mv392=true;
apiV392.__mv524=true;
apiV392.__original=original;

window.apiActas=apiV392;
try{apiActas=apiV392;}catch(_){}

window.MV392_ACTAS_REINTENTO_404_OK=true;
window.MV524_ACTAS_SNAPSHOT_OK=true;
window.mv524LimpiarSnapshotActas=limpiarSnapshotsV524;
console.log("MI VISUAL V392/V524: Actas resiliente con snapshot de sesion habilitado.");
})();