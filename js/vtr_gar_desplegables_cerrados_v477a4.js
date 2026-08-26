/* ==========================================================
   MI VISUAL V477A4 - DESPLEGABLES VTR/GAR CERRADOS
   - Periodos y sedes inician siempre contraidos.
   - Solo se despliegan cuando el usuario hace clic.
   - Solo presentacion: no consulta ni modifica backend.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V477A4_FRONT_ACTIVO)return;
  window.MI_VISUAL_V477A4_FRONT_ACTIVO=true;

  let instalado=false;

  function instalar(){
    if(instalado)return true;
    if(!window.MI_VISUAL_V477A3 || typeof boAgruparIndicesVg!=="function")return false;

    instalado=true;
    const base=boAgruparIndicesVg;

    boAgruparIndicesVg=function(){
      const html=String(base.apply(this,arguments)||"");
      // Quita solo el atributo HTML 'open'. No altera clases, contenido ni eventos.
      return html.replace(/\sopen(?=\s|>)/gi,"");
    };

    window.MI_VISUAL_V477A4={
      version:"V477A4-DESPLEGABLES-CERRADOS",
      soloPresentacion:true
    };

    return true;
  }

  function intentar(n){
    if(instalar())return;
    if(n>60)return;
    setTimeout(function(){intentar(n+1);},75);
  }

  intentar(0);

  const obs=new MutationObserver(function(){
    if(instalar())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();

/* ==========================================================
   MI VISUAL V487.24 - CACHE BREVE DETALLE VTR/GAR
   - Optimiza SOLO listarDetalleVtrGarTecnico.
   - No cambia cálculos, reglas, fuentes ni hojas.
   - WIN/Partner se resuelven en backend antes de esta capa.
   - Memoria 2 min; una sola solicitud simultánea por clave.
   - Respaldo en memoria hasta 15 min solo si falla la red.
   - Invalida caché tras escrituras relacionadas con VTR/GAR.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V48724_VTRGAR_CACHE_ACTIVO)return;
  window.MI_VISUAL_V48724_VTRGAR_CACHE_ACTIVO=true;

  const fetchBase = window.fetch.bind(window);
  const cache = new Map();
  const pendientes = new Map();
  const TTL_FRESCO = 2 * 60 * 1000;
  const TTL_RESPALDO = 15 * 60 * 1000;

  function normalizar(v){
    return String(v || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^A-Z0-9]/g,"");
  }

  function leerPayload(init){
    try{
      if(!init || typeof init.body !== "string")return null;
      const x = JSON.parse(init.body);
      return x && typeof x === "object" ? x : null;
    }catch(_){
      return null;
    }
  }

  function claveDetalle(data){
    return [
      String(data.usuario || "").trim().toUpperCase(),
      String(data.periodo || "").trim(),
      String(data.cuadrilla || "").trim().toUpperCase()
    ].join("|");
  }

  function respuestaDesdeRegistro(registro, origen){
    const headers = new Headers(registro.headers || {});
    headers.set("X-MI-VISUAL-CACHE", origen || "MEMORIA");
    return new Response(registro.texto,{
      status:registro.status || 200,
      statusText:registro.statusText || "OK",
      headers
    });
  }

  function invalidar(){
    cache.clear();
    pendientes.clear();
  }

  function esEscrituraRelacionada(accion){
    const a = normalizar(accion);
    if(!a)return false;
    if(a === "LISTARDETALLEVTRGARTECNICO")return false;
    if(a.startsWith("LISTAR") || a.startsWith("CONSULTAR") || a.startsWith("OBTENER") || a.startsWith("BUSCAR") || a.startsWith("PREVISUALIZAR"))return false;
    return a.includes("VTRGAR") || a.includes("VALIDACIONTECNICA");
  }

  async function consultarDetalle(input, init, data){
    const clave = claveDetalle(data);
    const ahora = Date.now();
    const previo = cache.get(clave);

    if(previo && ahora - previo.guardadoEn <= TTL_FRESCO){
      return respuestaDesdeRegistro(previo,"MEMORIA_FRESCA");
    }

    if(pendientes.has(clave)){
      const compartido = await pendientes.get(clave);
      return respuestaDesdeRegistro(compartido,"SOLICITUD_COMPARTIDA");
    }

    const promesa = (async function(){
      try{
        const respuesta = await fetchBase(input,init);
        const copia = respuesta.clone();
        const texto = await copia.text();

        let valido = respuesta.ok;
        if(valido){
          try{
            const json = JSON.parse(texto);
            valido = !!(json && json.ok);
          }catch(_){
            valido = false;
          }
        }

        if(valido){
          const headers = {};
          respuesta.headers.forEach(function(valor, nombre){
            headers[nombre] = valor;
          });

          const registro = {
            texto,
            status:respuesta.status,
            statusText:respuesta.statusText,
            headers,
            guardadoEn:Date.now()
          };
          cache.set(clave,registro);
          return registro;
        }

        if(previo && ahora - previo.guardadoEn <= TTL_RESPALDO){
          return previo;
        }

        return {
          texto,
          status:respuesta.status,
          statusText:respuesta.statusText,
          headers:{},
          guardadoEn:Date.now()
        };
      }catch(error){
        if(previo && ahora - previo.guardadoEn <= TTL_RESPALDO){
          return previo;
        }
        throw error;
      }finally{
        pendientes.delete(clave);
      }
    })();

    pendientes.set(clave,promesa);
    const registro = await promesa;
    const origen = registro === previo ? "RESPALDO_POR_ERROR" : "RED";
    return respuestaDesdeRegistro(registro,origen);
  }

  window.fetch = function(input, init){
    const data = leerPayload(init);
    const accion = data && data.accion ? String(data.accion) : "";

    if(normalizar(accion) === "LISTARDETALLEVTRGARTECNICO"){
      return consultarDetalle(input,init,data);
    }

    if(esEscrituraRelacionada(accion)){
      // Se invalida antes de la escritura. Si la operación falla, el único
      // efecto es que la próxima lectura vuelva a consultar al backend.
      invalidar();
    }

    return fetchBase(input,init);
  };

  window.mv48724InvalidarDetalleVtrGar = invalidar;
  window.MI_VISUAL_V48724_VTRGAR_CACHE = {
    version:"V487.24-DETALLE-VTRGAR-CACHE",
    alcance:"SOLO_LECTURA_DETALLE",
    ttlFrescoMs:TTL_FRESCO,
    ttlRespaldoMs:TTL_RESPALDO,
    persistencia:"MEMORIA_DE_PAGINA",
    cambiaCalculo:false,
    cambiaFuentes:false,
    winPrincipal:true,
    partnerSoloRespaldoBackend:true
  };

  console.log("MI VISUAL V487.24: cache breve de detalle VTR/GAR habilitada.");
})();