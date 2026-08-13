/* ============================================================
   MI VISUAL V398 - Checklist Almacén: confirmación segura

   Problema corregido:
   el navegador podía mostrar "La operación tardó demasiado" aunque
   Apps Script sí terminara registrando el checklist.

   Solución:
   - Espera de escritura ampliada a 85 segundos.
   - NO reintenta automáticamente el POST.
   - Ante demora/error transitorio verifica por GET si el checklist
     ya quedó registrado.
   - Si existe, devuelve éxito al flujo normal y evita confundir al Técnico.
============================================================ */
(function(){
  "use strict";

  if(window.CK398_CONFIRMACION_SEGURA_OK) return;

  const apiBase = window.ckApi;
  const guardarBase = window.ckGuardar;

  if(typeof apiBase!=="function") return;

  const HTTP_TRANSITORIOS = new Set([404,408,429,500,502,503,504]);

  function fechaClave(v){
    const s=String(v||"").trim();

    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return `${m[1]}-${m[2]}-${m[3]}`;

    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m){
      return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
    }

    return s;
  }

  async function getV398(payload){
    if(typeof mv336ApiGet==="function"){
      return await mv336ApiGet(
        API_CHECKLIST_ALMACEN,
        payload,
        {intentos:2,tiempoMs:20000}
      );
    }

    const url=new URL(API_CHECKLIST_ALMACEN);

    Object.entries(payload||{}).forEach(([k,v])=>{
      if(v!==undefined && v!==null && v!==""){
        url.searchParams.set(k,String(v));
      }
    });

    url.searchParams.set("_",Date.now());

    const r=await fetch(url.toString(),{
      method:"GET",
      cache:"no-store",
      redirect:"follow"
    });

    const t=(await r.text()).trim();

    if(!r.ok){
      throw new Error(
        `No se pudo verificar Checklist (${r.status}).`
      );
    }

    const d=JSON.parse(t);

    if(!d.ok){
      throw new Error(d.error||"No se pudo verificar Checklist.");
    }

    return d;
  }

  async function verificarGuardado(payload){
    const u=typeof ckUser==="function"
      ? ckUser()
      : {
          usuario:localStorage.getItem("usuario")||"",
          cuadrilla:localStorage.getItem("cuadrilla")||""
        };

    const consulta={
      accion:"verificarChecklistRegistradoV398",
      usuario:payload.usuario||u.usuario,
      cuadrilla:payload.cuadrilla||u.cuadrilla||"",
      fechaGestion:payload.fechaGestion||payload.fecha_gestion||"",
      tipoChecklist:payload.tipoChecklist||"MATERIALES"
    };

    for(let intento=0; intento<4; intento++){
      try{
        const d=await getV398(consulta);

        if(d && d.registrado){
          return d;
        }
      }catch(_){}

      if(intento<3){
        await new Promise(r=>setTimeout(r,1800));
      }
    }

    return null;
  }

  async function registrarConConfirmacionV398(payload){
    const controlador =
      typeof AbortController==="function"
        ? new AbortController()
        : null;

    const temporizador = controlador
      ? setTimeout(()=>controlador.abort(),85000)
      : null;

    try{
      const r=await fetch(API_CHECKLIST_ALMACEN,{
        method:"POST",
        headers:{
          "Content-Type":"text/plain;charset=UTF-8",
          "Accept":"application/json"
        },
        body:JSON.stringify(payload||{}),
        cache:"no-store",
        redirect:"follow",
        signal:controlador?controlador.signal:undefined
      });

      const texto=(await r.text()).trim();

      if(!r.ok){
        const error=new Error(
          `Checklist respondió temporalmente con HTTP ${r.status}.`
        );
        error.transitorio=HTTP_TRANSITORIOS.has(r.status);
        throw error;
      }

      if(/^MI VISUAL API OK$/i.test(texto)){
        const error=new Error(
          "No se recibió la confirmación del Checklist."
        );
        error.transitorio=true;
        throw error;
      }

      if(
        typeof mv336EsHtmlExterno==="function" &&
        mv336EsHtmlExterno(texto)
      ){
        const error=new Error(
          "Google devolvió una respuesta externa."
        );
        error.transitorio=true;
        throw error;
      }

      let d;

      try{
        d=JSON.parse(texto);
      }catch(_){
        const error=new Error(
          "Checklist no devolvió una respuesta válida."
        );
        error.transitorio=true;
        throw error;
      }

      if(!d.ok){
        const msg=d.error||"Error en Checklist";

        // Si el servidor indica duplicado o envío en proceso, primero
        // verificamos si el registro ya existe antes de mostrar error.
        if(
          /ya existe un checklist|ya se está guardando|ya se esta guardando/i.test(msg)
        ){
          const verificado=await verificarGuardado(payload);

          if(verificado){
            return {
              ok:true,
              modulo:"CHECKLIST_ALMACEN",
              accion:"REGISTRAR",
              id:verificado.id||"",
              tipoChecklist:
                verificado.tipoChecklist||
                payload.tipoChecklist||
                "MATERIALES",
              estadoGeneral:verificado.estadoGeneral||"",
              cuadrilla:verificado.cuadrilla||"",
              fechaGestion:verificado.fechaGestion||"",
              confirmadoPorVerificacionV398:true
            };
          }
        }

        throw new Error(msg);
      }

      return d;

    }catch(error){
      const esDemora =
        error?.name==="AbortError" ||
        error?.transitorio ||
        error instanceof TypeError;

      if(esDemora){
        const verificado=await verificarGuardado(payload);

        if(verificado){
          return {
            ok:true,
            modulo:"CHECKLIST_ALMACEN",
            accion:"REGISTRAR",
            id:verificado.id||"",
            tipoChecklist:
              verificado.tipoChecklist||
              payload.tipoChecklist||
              "MATERIALES",
            estadoGeneral:verificado.estadoGeneral||"",
            cuadrilla:verificado.cuadrilla||"",
            fechaGestion:verificado.fechaGestion||"",
            confirmadoPorVerificacionV398:true
          };
        }

        throw new Error(
          "La respuesta está demorando y todavía no se pudo confirmar el registro. " +
          "No vuelva a presionar Guardar de inmediato; espere unos segundos y actualice el historial."
        );
      }

      throw error;

    }finally{
      if(temporizador) clearTimeout(temporizador);
    }
  }

  async function ckApiV398(payload){
    const solicitud=Object.assign({},payload||{});

    if(solicitud.accion!=="registrarChecklistAlmacen"){
      return await apiBase(solicitud);
    }

    return await registrarConConfirmacionV398(solicitud);
  }

  async function ckGuardarV398(ev){
    const btn=ev?.currentTarget||ev?.target;
    let t1=null;
    let t2=null;

    if(btn){
      t1=setTimeout(()=>{
        if(btn.disabled && document.body.contains(btn)){
          btn.textContent="Guardando evidencias...";
        }
      },25000);

      t2=setTimeout(()=>{
        if(btn.disabled && document.body.contains(btn)){
          btn.textContent="Confirmando registro...";
        }
      },55000);
    }

    try{
      return await guardarBase.apply(this,arguments);
    }finally{
      if(t1)clearTimeout(t1);
      if(t2)clearTimeout(t2);
    }
  }

  window.ckApi=ckApiV398;
  try{ckApi=ckApiV398}catch(_){}

  if(typeof guardarBase==="function"){
    window.ckGuardar=ckGuardarV398;
    try{ckGuardar=ckGuardarV398}catch(_){}
  }

  window.CK398_CONFIRMACION_SEGURA_OK=true;
  console.log(
    "MI VISUAL V398: confirmación segura de Checklist habilitada."
  );
})();