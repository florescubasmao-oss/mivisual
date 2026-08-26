/* ============================================================
   MI VISUAL V487.8 - Mapa Operativo: Visual P# + estado WIN reciente

   OBJETIVO
   - Mantener la validacion existente: solo cuadrillas Visual P#.
   - OrdenId es la llave unica de una carga WIN.
   - Dentro del mismo archivo conserva la version con FECHA_ULTIMO_ESTADO
     mas reciente de cada OrdenId.
   - Antes de registrar compara contra MAPA_ORDENES ya guardado y evita que
     una descarga antigua haga retroceder un estado mas nuevo.
   - Si la fecha/hora de estado empata, la nueva carga SI puede completar
     otros campos; FECHA_IMPORTACION la asigna el backend al registrar.
   - Las ordenes ausentes en una carga nueva no se eliminan: esa proteccion
     ya la conserva importarMapaOperativo en Apps Script.
   - Despues de una importacion valida emite mv487WinImportado para que el
     motor de indicadores pueda actualizar Produccion, Efectividad,
     Recableado y VTR/GAR sin tocar las pantallas consumidoras.
============================================================ */
(function(){
  "use strict";

  if(window.MV386_MAPA_SOLO_P_OK) return;

  const MOTOR_ESTADO="./js/win_estado_historico_v4877.js?v=V4878-ESTADO-RECIENTE";
  let promesaMotor=null;

  function norm(v){
    return String(v||"")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function valor(obj){
    for(let i=1;i<arguments.length;i++){
      const k=arguments[i];
      if(obj && obj[k]!==undefined && obj[k]!==null && String(obj[k]).trim()!=="") return obj[k];
    }
    return "";
  }

  function esCuadrillaVisualP(valor){
    const t=norm(valor);
    return /^P\s*\d+(?:\s|$)/.test(t);
  }

  function registrosImportacion(){
    try{
      if(typeof moImportacion!=="undefined" && Array.isArray(moImportacion)) return moImportacion;
    }catch(_){}
    return [];
  }

  function reemplazarImportacion(lista){
    try{ moImportacion=Array.isArray(lista)?lista:[]; }catch(_){}
  }

  function validarImportacion(){
    const registros=registrosImportacion();
    if(!registros.length) return {ok:true,total:0,invalidos:[]};
    const invalidos=registros.filter(r=>!esCuadrillaVisualP(r && r.cuadrilla));
    return {ok:invalidos.length===0,total:registros.length,invalidos};
  }

  function bloquearCarga(resultado){
    reemplazarImportacion([]);
    const btn=document.getElementById("moBtnImportar");
    if(btn) btn.disabled=true;
    const msg=document.getElementById("moImportMsg");
    if(!msg) return;
    const nombres=[...new Set((resultado.invalidos||[]).map(r=>norm(r&&r.cuadrilla)||"SIN CUADRILLA"))].slice(0,8);
    msg.className="mo-msg mo-error";
    msg.textContent=
      `Archivo rechazado: se detectaron ${resultado.invalidos.length} registro(s) que no pertenecen a cuadrillas Visual P#.\n`+
      `Solo se aceptan cuadrillas como P1, P2, P3, P10, P 6, etc.`+
      (nombres.length?`\nDetectadas: ${nombres.join(", ")}${resultado.invalidos.length>nombres.length?"…":""}`:"")+
      `\nNo se registro ningun dato.`;
  }

  function mensajeCargaValida(resultado){
    const msg=document.getElementById("moImportMsg");
    if(!msg||!resultado.total) return;
    const actual=String(msg.textContent||"");
    if(actual.includes("Validacion partner: OK")) return;
    msg.className="mo-msg mo-ok";
    msg.textContent=actual+`\n✅ Validacion partner: OK. ${resultado.total} registro(s) pertenecen a cuadrillas P#.`;
  }

  function cargarMotorEstado(){
    if(window.MV4877_WIN_ESTADO_HISTORICO) return Promise.resolve(window.MV4877_WIN_ESTADO_HISTORICO);
    if(promesaMotor) return promesaMotor;
    promesaMotor=new Promise((resolve,reject)=>{
      const existente=Array.from(document.scripts).find(s=>s.src&&s.src.includes("win_estado_historico_v4877.js"));
      if(existente){
        const limite=Date.now()+8000;
        const timer=setInterval(()=>{
          if(window.MV4877_WIN_ESTADO_HISTORICO){clearInterval(timer);resolve(window.MV4877_WIN_ESTADO_HISTORICO);}
          else if(Date.now()>limite){clearInterval(timer);reject(new Error("No se pudo iniciar el control de fecha/hora WIN."));}
        },50);
        return;
      }
      const s=document.createElement("script");
      s.src=MOTOR_ESTADO;
      s.async=true;
      s.onload=()=>window.MV4877_WIN_ESTADO_HISTORICO?resolve(window.MV4877_WIN_ESTADO_HISTORICO):reject(new Error("El motor WIN no quedo disponible."));
      s.onerror=()=>reject(new Error("No se pudo cargar el control de estado WIN."));
      document.head.appendChild(s);
    }).catch(error=>{promesaMotor=null;throw error;});
    return promesaMotor;
  }

  function periodoDesdeValor(v){
    if(v instanceof Date&&!isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}`;
    const s=String(v||"").trim();
    let m=s.match(/^(\d{4})[-/](\d{1,2})/);
    if(m) return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}`;
    m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if(m) return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}`;
    return "";
  }

  function periodoOrden(o){
    return periodoDesdeValor(valor(o,"fechaSolicitud","FECHA_SOLICITUD","F.Soli")) ||
      periodoDesdeValor(valor(o,"fechaInicioVisita","FECHA_INICIO_VISITA","FechaIniVisi")) ||
      periodoDesdeValor(valor(o,"fechaFinVisita","FECHA_FIN_VISITA","FechaFinVisi")) ||
      periodoDesdeValor(valor(o,"fechaUltimoEstado","FECHA_ULTIMO_ESTADO","FechaUltiEsta"));
  }

  function listaRespuestaMapa(d){
    if(Array.isArray(d&&d.ordenes)) return d.ordenes;
    if(Array.isArray(d&&d.registros)) return d.registros;
    return [];
  }

  function deduplicarNuevaCarga(lista,motor){
    const porId=new Map();
    let repetidos=0;
    (lista||[]).forEach((r,indice)=>{
      const k=motor.ordenId(r);
      if(!k){porId.set(`__SIN_ID_${indice}`,r);return;}
      const previo=porId.get(k);
      if(!previo){porId.set(k,r);return;}
      repetidos++;
      const fNuevo=motor.fechaEstadoMs(r),fPrevio=motor.fechaEstadoMs(previo);
      if(fNuevo>fPrevio || fNuevo===fPrevio) porId.set(k,r);
    });
    return {lista:Array.from(porId.values()),repetidos};
  }

  async function protegerContraRetroceso(lista,motor){
    const periodos=[...new Set((lista||[]).map(periodoOrden).filter(Boolean))];
    const existentes=new Map();
    for(const periodo of periodos){
      try{
        const d=await moApiLectura({accion:"listarMapaOperativo",usuario:moUsuario(),periodo});
        listaRespuestaMapa(d).forEach(o=>{
          const k=motor.ordenId(o);if(!k)return;
          const previo=existentes.get(k);
          if(!previo || motor.fechaEstadoMs(o)>=motor.fechaEstadoMs(previo)) existentes.set(k,o);
        });
      }catch(error){
        console.warn("V487.8: no se pudo comparar el periodo antes de importar",periodo,error);
      }
    }

    let antiguas=0;
    const aceptadas=(lista||[]).filter(nueva=>{
      const k=motor.ordenId(nueva);if(!k)return true;
      const anterior=existentes.get(k);if(!anterior)return true;
      const fn=motor.fechaEstadoMs(nueva),fa=motor.fechaEstadoMs(anterior);
      if(fn>0&&fa>0&&fn<fa){antiguas++;return false;}
      return true;
    });
    return {lista:aceptadas,antiguas,periodos};
  }

  function mensajeControlTemporal(repetidos,antiguas,totalFinal){
    const msg=document.getElementById("moImportMsg");
    if(!msg)return;
    const partes=[];
    if(repetidos) partes.push(`${repetidos} duplicado(s) del archivo resueltos por OrdenId/ultima fecha-hora`);
    if(antiguas) partes.push(`${antiguas} version(es) antiguas ignoradas para no retroceder estados`);
    if(!partes.length)return;
    msg.className="mo-msg mo-ok";
    msg.textContent=String(msg.textContent||"")+`\n🕒 Control WIN: ${partes.join(" · ")}. Quedan ${totalFinal} registro(s) para actualizar.`;
  }

  function notificarImportacion(periodos,control){
    try{
      window.dispatchEvent(new CustomEvent("mv487WinImportado",{detail:{periodos:periodos||[],control:control||{},fecha:Date.now()}}));
    }catch(_){}
    try{
      if(typeof window.mv4879SincronizarIndicadoresWin==="function"){
        window.mv4879SincronizarIndicadoresWin(periodos||[]).catch(error=>console.warn("V487: sincronizacion de indicadores pendiente",error));
      }
    }catch(_){}
  }

  function instalar(){
    const leer=window.moLeerArchivo;
    const registrar=window.moRegistrarImportacion;
    if(typeof leer!=="function"||typeof registrar!=="function") return false;

    if(!leer.__mv386SoloP){
      const originalLeer=leer;
      const ajustadaLeer=async function(){
        const resultado=await originalLeer.apply(this,arguments);
        const control=validarImportacion();
        if(!control.ok) bloquearCarga(control); else mensajeCargaValida(control);
        return resultado;
      };
      ajustadaLeer.__mv386SoloP=true;
      ajustadaLeer.__original=originalLeer;
      window.moLeerArchivo=ajustadaLeer;
      try{moLeerArchivo=ajustadaLeer;}catch(_){}
    }

    if(!registrar.__mv386SoloP){
      const originalRegistrar=registrar;
      const ajustadaRegistrar=async function(){
        const control=validarImportacion();
        if(!control.ok){bloquearCarga(control);return null;}

        let controlTemporal={repetidos:0,antiguas:0,periodos:[]};
        try{
          const motor=await cargarMotorEstado();
          const dedup=deduplicarNuevaCarga(registrosImportacion(),motor);
          const protegido=await protegerContraRetroceso(dedup.lista,motor);
          controlTemporal={repetidos:dedup.repetidos,antiguas:protegido.antiguas,periodos:protegido.periodos};
          reemplazarImportacion(protegido.lista);
          mensajeControlTemporal(dedup.repetidos,protegido.antiguas,protegido.lista.length);
          if(!protegido.lista.length){
            const msg=document.getElementById("moImportMsg");
            if(msg){msg.className="mo-msg mo-ok";msg.textContent=String(msg.textContent||"")+"\n✅ No hay estados mas recientes para registrar.";}
            return {ok:true,sinCambios:true,control:controlTemporal};
          }
        }catch(error){
          console.warn("V487.8: se continua con la carga normal porque el control temporal no pudo completarse",error);
        }

        const resultado=await originalRegistrar.apply(this,arguments);
        notificarImportacion(controlTemporal.periodos,controlTemporal);
        return resultado;
      };
      ajustadaRegistrar.__mv386SoloP=true;
      ajustadaRegistrar.__mv4878EstadoReciente=true;
      ajustadaRegistrar.__original=originalRegistrar;
      window.moRegistrarImportacion=ajustadaRegistrar;
      try{moRegistrarImportacion=ajustadaRegistrar;}catch(_){}
    }
    return true;
  }

  let intentos=0;
  const timer=setInterval(()=>{intentos++;if(instalar()||intentos>80)clearInterval(timer);},100);

  window.mv386EsCuadrillaVisualP=esCuadrillaVisualP;
  window.mv4878ProtegerCargaWin=async function(lista){
    const motor=await cargarMotorEstado();
    const d=deduplicarNuevaCarga(lista||[],motor);
    const p=await protegerContraRetroceso(d.lista,motor);
    return {lista:p.lista,repetidos:d.repetidos,antiguas:p.antiguas,periodos:p.periodos};
  };
  window.MV386_MAPA_SOLO_P_OK=true;
  window.MV4878_MAPA_ESTADO_RECIENTE_OK=true;
})();
