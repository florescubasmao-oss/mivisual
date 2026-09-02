/* ============================================================
   MI VISUAL V380 - Resumen rápido y sincronizado para Dashboard y Mi Desempeño
   - Memoria de sesión: 2 minutos.
   - Período actual: 3 minutos; períodos históricos: 30 minutos.
   - Actualización silenciosa en segundo plano.
   - Una sola solicitud simultánea por usuario y período.
   - Conserva el proceso anterior como respaldo.
============================================================ */
(function(){
  "use strict";

  if(window.MV366_RESUMEN_RAPIDO_OK) return;

  const CACHE = new Map();
  const PENDIENTES = new Map();
  // Prefijo nuevo: descarta respaldos antiguos que pudieron guardar un
  // resumen con cobertura completa pero indicadores todavía en cero.
  const PREFIJO_LOCAL = "mv380ResumenDashboard:";
  const TTL_MEMORIA = 2 * 60 * 1000;
  const TTL_LOCAL_ACTUAL = 3 * 60 * 1000;
  const TTL_LOCAL_HISTORICO = 30 * 60 * 1000;
  const TTL_RESPALDO = 24 * 60 * 60 * 1000;
  const URL_RESUMEN_PUBLICADO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1235020456&single=true&output=csv";
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
      "GERENCIA GENERAL",
      "GERENCIAL GENERAL",
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

  function validarCalidad(data){
    const lista = Array.isArray(data?.lista) ? data.lista : [];
    if(!lista.length) return {ok:false,motivo:"sin cuadrillas"};

    let produccion=0;
    let efectividadTotal=0;
    let efectividadFinalizadas=0;
    let vtrFinalizadas=0;

    lista.forEach(item=>{
      produccion += Number(item?.produccion)||0;
      efectividadTotal += Number(item?.detEfectividad?.total)||0;
      efectividadFinalizadas += Number(item?.detEfectividad?.finalizadas)||0;
      vtrFinalizadas += Number(item?.detVtrGar?.finalizadas)||0;
    });

    if(produccion>0 && efectividadTotal===0){
      return {ok:false,motivo:"efectividad sin sincronizar"};
    }
    if(efectividadFinalizadas>0 && vtrFinalizadas===0){
      return {ok:false,motivo:"VTR/GAR sin sincronizar"};
    }
    return {ok:true};
  }

  function ttlLocal(periodo){
    return periodoClave(periodo)===periodoActualLima()
      ? TTL_LOCAL_ACTUAL
      : TTL_LOCAL_HISTORICO;
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

  async function consultarResumenPublicado(periodo){
    const controlador = typeof AbortController==="function"
      ? new AbortController()
      : null;
    const temporizador = controlador
      ? setTimeout(()=>controlador.abort(),45000)
      : null;

    try{
      const respuesta = await fetch(
        `${URL_RESUMEN_PUBLICADO}&_mv380=${Date.now()}`,
        {
          method:"GET",
          cache:"no-store",
          redirect:"follow",
          signal:controlador ? controlador.signal : undefined
        }
      );

      if(!respuesta.ok){
        throw new Error(`No se pudo leer el resumen publicado (${respuesta.status}).`);
      }

      const texto = await respuesta.text();
      const filas = typeof mv4CSV==="function" ? mv4CSV(texto) : [];
      const registros=[];
      const periodos={};

      filas.slice(1).forEach(fila=>{
        const clave=String(fila?.[0]||"").trim();
        if(!/^\d{4}-\d{2}$/.test(clave)) return;
        periodos[clave]=true;
        try{
          const item=JSON.parse(String(fila?.[8]||"{}"));
          if(item?.cuadrilla) registros.push({periodo:clave,item,fila});
        }catch(_){}
      });

      const disponibles=Object.keys(periodos).sort().reverse();
      const solicitado=periodoClave(periodo);
      const elegido=periodos[solicitado] ? solicitado : (disponibles[0]||solicitado);
      const seleccion=registros.filter(x=>x.periodo===elegido);
      const lista=seleccion.map(x=>x.item);
      const sedes=Array.from(new Set(lista.map(x=>normalizar(x.sede)).filter(Boolean))).sort();

      const data={
        ok:true,
        modulo:"RESUMEN_DASHBOARD_RANKING",
        accion:"OBTENER_PUBLICADO",
        periodo:elegido,
        periodos:disponibles.map(clave=>({clave})),
        lista,
        totalGeneral:lista.length,
        cuadrillasEsperadas:lista.length,
        sedesGeneral:sedes,
        version:String(seleccion[0]?.fila?.[1]||""),
        desdeCache:false,
        fuente:"HOJA_RESUMEN_DASHBOARD_RANKING_PUBLICADA",
        calculadoEn:String(seleccion[0]?.fila?.[2]||""),
        _mv380DesdeResumenPublicado:true
      };

      const calidad=validarCalidad(data);
      if(!validarCobertura(data,false) || !calidad.ok){
        throw new Error(`El resumen publicado está incompleto: ${calidad.motivo||"cobertura"}.`);
      }

      prepararLista(data);
      return data;
    }finally{
      if(temporizador) clearTimeout(temporizador);
    }
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
      url.searchParams.set("_mv367",Date.now().toString());

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

        const calidad = validarCalidad(data);

        if((!validarCobertura(data,forzar) || !calidad.ok) && !forzar){
          console.warn(
            "V380: se reconstruye un resumen ejecutivo incompleto.",
            {
              esperadas:data.cuadrillasEsperadas,
              recibidas:Array.isArray(data.lista)
                ? data.lista.length
                : 0,
              periodo:data.periodo,
              motivo:calidad.motivo || "cobertura incompleta"
            }
          );

          return await consultarRed(
            data.periodo || solicitado,
            true
          );
        }

        if(!validarCalidad(data).ok){
          throw new Error(
            `El resumen recibido está pendiente de sincronización: ${validarCalidad(data).motivo}.`
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

      const local = leerLocal(solicitado,ttlLocal(solicitado));
      if(local){
        if(!validarCalidad(local.data).ok){
          try{ localStorage.removeItem(claveLocal(solicitado)); }catch(_){}
        }else{
          const data = {
            ...local.data,
            _mv366DesdeCacheLocal:true
          };

          prepararLista(data);
          guardarMemoria(solicitado,data);
          if(!data._mv380DesdeResumenPublicado){
            actualizarEnSegundoPlano(
              data.periodo || solicitado
            );
          }

          return data;
        }
      }

      // La hoja consolidada ya contiene una fila JSON por cuadrilla. Leerla
      // directamente evita ejecutar de nuevo todos los cruces del backend.
      try{
        const publicado=await consultarResumenPublicado(solicitado);
        guardarMemoria(solicitado,publicado);
        guardarLocal(solicitado,publicado);
        emitirActualizacion(publicado);
        return publicado;
      }catch(error){
        console.warn("V380: resumen publicado no disponible; se consulta la API.",error);
      }
    }

    try{
      return await consultarRed(solicitado,forzar);
    }catch(error){
      const respaldo = leerLocal(solicitado,TTL_RESPALDO);

      if(respaldo && validarCalidad(respaldo.data).ok){
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
    "MI VISUAL V380: carga rápida y sincronización de indicadores habilitadas."
  );
})();
