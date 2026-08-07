/* ============================================================
   MI VISUAL V366 - Resumen rápido para Dashboard y Mi Desempeño
   - Memoria de sesión: 2 minutos.
   - Último resumen local: 15 minutos.
   - Actualización silenciosa en segundo plano.
   - Una sola solicitud simultánea por usuario y período.
   - Conserva el proceso anterior como respaldo.
============================================================ */
(function(){
  "use strict";

  if(window.MV366_RESUMEN_RAPIDO_OK) return;

  const CACHE = new Map();
  const PENDIENTES = new Map();
  const PREFIJO_LOCAL = "mv366ResumenDashboard:";
  const TTL_MEMORIA = 2 * 60 * 1000;
  const TTL_LOCAL = 15 * 60 * 1000;
  const TTL_RESPALDO = 24 * 60 * 60 * 1000;
  const obtenerRankingAnterior = window.mv4ObtenerRanking;

  function normalizar(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function periodoActualLima(){
    const partes = new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Lima",
      year:"numeric",
      month:"2-digit"
    }).formatToParts(new Date());

    return `${partes.find(x=>x.type==="year")?.value}-${partes.find(x=>x.type==="month")?.value}`;
  }

  function periodoClave(periodo){
    return String(periodo || "").trim() || periodoActualLima();
  }

  function identidad(){
    return [
      localStorage.getItem("usuario") || "SIN_USUARIO",
      normalizar(localStorage.getItem("perfil")),
      normalizar(localStorage.getItem("sede"))
    ].join("|");
  }

  function claveMemoria(periodo){
    return `${identidad()}|${periodoClave(periodo)}`;
  }

  function claveLocal(periodo){
    return `${PREFIJO_LOCAL}${encodeURIComponent(claveMemoria(periodo))}`;
  }

  function normalizarPeriodos(periodos){
    const lista = Array.isArray(periodos) ? periodos : [];

    return lista.map(item=>{
      if(typeof item === "string"){
        return {
          clave:item,
          etiqueta:typeof mv276EtiquetaPeriodo==="function"
            ? mv276EtiquetaPeriodo(item)
            : item,
          corte:""
        };
      }

      const clave = item?.clave || item?.periodo || "";
      return {
        clave,
        etiqueta:item?.etiqueta || (
          typeof mv276EtiquetaPeriodo==="function"
            ? mv276EtiquetaPeriodo(clave)
            : clave
        ),
        corte:item?.corte || ""
      };
    }).filter(x=>/^\d{4}-\d{2}$/.test(x.clave));
  }

  function limpiarLocales(){
    try{
      const registros = [];

      for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if(!key || !key.startsWith(PREFIJO_LOCAL)) continue;

        try{
          const valor = JSON.parse(localStorage.getItem(key) || "null");
          registros.push({
            key,
            fecha:Number(valor?.fecha || 0)
          });
        }catch(_){
          localStorage.removeItem(key);
        }
      }

      registros
        .sort((a,b)=>b.fecha-a.fecha)
        .slice(6)
        .forEach(x=>localStorage.removeItem(x.key));
    }catch(_){}
  }

  function guardarLocal(periodo,data){
    try{
      const valor = {
        fecha:Date.now(),
        data
      };

      localStorage.setItem(
        claveLocal(periodo),
        JSON.stringify(valor)
      );

      if(data?.periodo){
        localStorage.setItem(
          claveLocal(data.periodo),
          JSON.stringify(valor)
        );
      }

      limpiarLocales();
    }catch(error){
      try{
        limpiarLocales();
      }catch(_){}
      console.warn("V366: no se pudo guardar el resumen local",error);
    }
  }

  function leerLocal(periodo,ttl){
    try{
      const valor = JSON.parse(
        localStorage.getItem(claveLocal(periodo)) || "null"
      );

      if(!valor?.data || !valor.fecha) return null;
      if(Date.now()-Number(valor.fecha)>ttl) return null;

      return {
        fecha:Number(valor.fecha),
        data:valor.data
      };
    }catch(_){
      return null;
    }
  }

  function guardarMemoria(periodo,data){
    const registro = {
      fecha:Date.now(),
      data
    };

    CACHE.set(claveMemoria(periodo),registro);

    if(data?.periodo){
      CACHE.set(claveMemoria(data.periodo),registro);
    }
  }

  function leerMemoria(periodo){
    const registro = CACHE.get(claveMemoria(periodo));
    if(!registro) return null;
    if(Date.now()-registro.fecha>TTL_MEMORIA) return null;
    return registro.data;
  }

  function emitirActualizacion(data){
    try{
      window.dispatchEvent(new CustomEvent("mv366ResumenActualizado",{
        detail:{
          periodo:data?.periodo || "",
          data
        }
      }));
    }catch(_){}
  }

  function validarCobertura(data,forzar){
    const perfil = normalizar(localStorage.getItem("perfil"));
    const ejecutivo = [
      "JEFATURA",
      "JEFATURA GENERAL",
      "GERENCIA LIMA",
      "ADMIN",
      "ADMINISTRADOR"
    ].includes(perfil);

    if(!ejecutivo || forzar) return true;

    const esperadas = Number(
      data?.cuadrillasEsperadas ||
      data?.totalGeneral ||
      0
    );
    const recibidas = Array.isArray(data?.lista)
      ? data.lista.length
      : 0;

    return !(esperadas>0 && recibidas<esperadas);
  }

  function prepararLista(data){
    const lista = Array.isArray(data?.lista)
      ? data.lista
      : [];

    lista.forEach(item=>{
      if(typeof mv4Norm==="function"){
        item.sede = mv4Norm(item.sede);
        item.plataforma = mv4Norm(item.plataforma);
      }
    });

    return lista;
  }

  async function consultarRed(periodo,forzar=false){
    const solicitado = String(periodo || "");
    const clave = `${claveMemoria(solicitado)}|${forzar?"F":"N"}`;

    if(PENDIENTES.has(clave)){
      return PENDIENTES.get(clave);
    }

    const promesa = (async()=>{
      const base = window.MI_VISUAL_API_URL ||
        (typeof MV58_API!=="undefined" ? MV58_API : "");

      if(!base){
        throw new Error("No se encontró la URL de MI VISUAL.");
      }

      const url = new URL(base);
      url.searchParams.set("accion","obtenerResumenDashboardRanking");
      url.searchParams.set(
        "usuario",
        localStorage.getItem("usuario") || ""
      );

      if(solicitado){
        url.searchParams.set("periodo",solicitado);
      }

      url.searchParams.set(
        "forzarActualizacion",
        forzar ? "SI" : "NO"
      );
      url.searchParams.set("_mv366",Date.now().toString());

      const controlador = typeof AbortController==="function"
        ? new AbortController()
        : null;

      const temporizador = controlador
        ? setTimeout(()=>controlador.abort(),90000)
        : null;

      try{
        const respuesta = await fetch(url.toString(),{
          method:"GET",
          cache:"no-store",
          redirect:"follow",
          headers:{"Accept":"application/json"},
          signal:controlador ? controlador.signal : undefined
        });

        const texto = (await respuesta.text()).trim();

        if(!respuesta.ok){
          throw new Error(
            `No se pudo consultar el resumen (${respuesta.status}).`
          );
        }

        if(
          !texto ||
          /^MI VISUAL API OK$/i.test(texto) ||
          /^<!doctype|^<html/i.test(texto)
        ){
          throw new Error(
            "Apps Script todavía no tiene publicada la versión vigente."
          );
        }

        const data = JSON.parse(texto);

        if(!data?.ok){
          throw new Error(
            data?.error || "No se pudo obtener el resumen operativo."
          );
        }

        if(!validarCobertura(data,forzar)){
          console.warn(
            "V366: se reconstruye un resumen ejecutivo incompleto.",
            {
              esperadas:data.cuadrillasEsperadas,
              recibidas:Array.isArray(data.lista)
                ? data.lista.length
                : 0,
              periodo:data.periodo
            }
          );

          return await consultarRed(
            data.periodo || solicitado,
            true
          );
        }

        prepararLista(data);
        guardarMemoria(solicitado,data);
        guardarLocal(solicitado,data);
        emitirActualizacion(data);

        return data;
      }catch(error){
        if(error?.name==="AbortError"){
          throw new Error(
            "La actualización continúa demorando. Se mostrará el último resumen disponible cuando exista."
          );
        }
        throw error;
      }finally{
        if(temporizador){
          clearTimeout(temporizador);
        }
      }
    })().finally(()=>{
      PENDIENTES.delete(clave);
    });

    PENDIENTES.set(clave,promesa);
    return promesa;
  }

  function actualizarEnSegundoPlano(periodo){
    const clave = claveMemoria(periodo);

    if(PENDIENTES.has(`${clave}|N`)){
      return;
    }

    consultarRed(periodo,false).catch(error=>{
      console.warn(
        "V366: no se pudo actualizar el resumen en segundo plano",
        error
      );
    });
  }

  async function consultar(periodo,forzar=false){
    const solicitado = String(periodo || "");

    if(!forzar){
      const memoria = leerMemoria(solicitado);
      if(memoria) return memoria;

      const local = leerLocal(solicitado,TTL_LOCAL);
      if(local){
        const data = {
          ...local.data,
          _mv366DesdeCacheLocal:true
        };

        prepararLista(data);
        guardarMemoria(solicitado,data);
        actualizarEnSegundoPlano(
          data.periodo || solicitado
        );

        return data;
      }
    }

    try{
      return await consultarRed(solicitado,forzar);
    }catch(error){
      const respaldo = leerLocal(solicitado,TTL_RESPALDO);

      if(respaldo){
        console.warn(
          "V366: se utiliza el último resumen disponible",
          error
        );

        const data = {
          ...respaldo.data,
          _mv366DesdeCacheLocal:true,
          _mv366RespaldoPorError:true
        };

        prepararLista(data);
        guardarMemoria(solicitado,data);
        return data;
      }

      throw error;
    }
  }

  async function obtenerConsolidado(periodoSeleccionado){
    try{
      const data = await consultar(
        periodoSeleccionado,
        false
      );

      MV276_DASH_PERIODOS = normalizarPeriodos(
        data.periodos
      );

      MV276_DASH_PERIODO =
        data.periodo ||
        (
          typeof mv276PeriodoPredeterminado==="function"
            ? mv276PeriodoPredeterminado(
                MV276_DASH_PERIODOS,
                periodoSeleccionado
              )
            : periodoClave(periodoSeleccionado)
        );

      return prepararLista(data);
    }catch(error){
      console.warn(
        "V366: resumen consolidado no disponible; se utiliza el proceso anterior.",
        error
      );

      if(typeof obtenerRankingAnterior === "function"){
        return await obtenerRankingAnterior(
          periodoSeleccionado
        );
      }

      throw error;
    }
  }

  function invalidar(periodo){
    const clave = periodoClave(periodo);

    Array.from(CACHE.keys())
      .filter(x=>x.endsWith(`|${clave}`))
      .forEach(x=>CACHE.delete(x));

    try{
      localStorage.removeItem(claveLocal(clave));
    }catch(_){}
  }

  window.mv361ConsultarResumenDashboardRanking = consultar;
  window.mv366InvalidarResumenDashboard = invalidar;
  window.mv4ObtenerRanking = obtenerConsolidado;

  try{
    mv4ObtenerRanking = obtenerConsolidado;
  }catch(_){}

  window.MV361_RESUMEN_CONSOLIDADO_OK = true;
  window.MV366_RESUMEN_RAPIDO_OK = true;

  console.log(
    "MI VISUAL V366: carga rápida de Dashboard y Mi Desempeño habilitada."
  );
})();