/* ============================================================
   MI VISUAL V357 - Informe Excel de Observaciones
   - Disponible para Jefatura, Gerencia Lima y Administrador.
   - Reutiliza observacionesCache; no realiza consultas adicionales.
   - Respeta el período seleccionado y permite aplicar filtros actuales.
   - SheetJS se descarga únicamente al generar el archivo.
============================================================ */
(function(){
  "use strict";

  if(window.MV357_INFORME_OBSERVACIONES_OK) return;

  const LIBRERIAS = [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];

  let promesaLibreria = null;
  let mostrarObservacionesOriginal = null;

  function normalizar(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function numero(valor){
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function redondear(valor,decimales=2){
    const factor = Math.pow(10,decimales);
    return Math.round((numero(valor)+Number.EPSILON)*factor)/factor;
  }

  function escapar(valor){
    return String(valor ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function perfilActual(){
    return normalizar(localStorage.getItem("perfil"));
  }

  function puedeDescargar(){
    return [
      "JEFATURA",
      "JEFATURA GENERAL",
      "GERENCIA LIMA",
      "ADMIN",
      "ADMINISTRADOR"
    ].includes(perfilActual());
  }

  function periodoSeleccionado(){
    const selector = document.getElementById("filtroPeriodoObs");
    if(selector?.value) return selector.value;
    if(typeof window.obsPeriodoActual === "function") return window.obsPeriodoActual();
    const partes = new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Lima",
      year:"numeric",
      month:"2-digit"
    }).formatToParts(new Date());
    return `${partes.find(x=>x.type==="year")?.value}-${partes.find(x=>x.type==="month")?.value}`;
  }

  function nombrePeriodo(clave){
    if(typeof window.obsNombrePeriodo === "function"){
      return window.obsNombrePeriodo(clave);
    }
    const m = String(clave || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return String(clave || "PERIODO");
    const meses = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];
    return `${meses[Number(m[2])-1]} ${m[1]}`;
  }

  function clavePeriodo(item){
    if(typeof window.obsClavePeriodo === "function"){
      return window.obsClavePeriodo(item);
    }
    const periodo = String(item?.periodo || "").trim();
    const directo = periodo.match(/^(\d{4})-(\d{2})/);
    if(directo) return `${directo[1]}-${directo[2]}`;

    const valor = String(
      item?.fechaRegistro ||
      item?.fecha ||
      item?.fechaAuditoria ||
      ""
    );
    let m = valor.match(/^(\d{4})-(\d{2})/);
    if(m) return `${m[1]}-${m[2]}`;
    m = valor.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})/);
    if(m) return `${m[2]}-${String(Number(m[1])).padStart(2,"0")}`;
    return "";
  }

  function cacheObservaciones(){
    try{
      return Array.isArray(observacionesCache) ? observacionesCache : [];
    }catch(_){
      return [];
    }
  }

  function listaPeriodoCompleto(){
    const periodo = periodoSeleccionado();
    return cacheObservaciones().filter(item=>clavePeriodo(item)===periodo);
  }

  function listaFiltradaActual(){
    try{
      if(typeof window.obtenerObservacionesFiltradas === "function"){
        return window.obtenerObservacionesFiltradas();
      }
    }catch(_){}
    return listaPeriodoCompleto();
  }

  function impacto(item){
    if(typeof window.importeImpactoObs === "function"){
      return numero(window.importeImpactoObs(item));
    }
    const estado = normalizar(item?.estado);
    const factor = ["SUBSANADO","ANULADO"].includes(estado) ? 0.20 : 1;
    return numero(item?.monto)*factor;
  }

  function fuente(item){
    return normalizar(item?.fuente) || "SIN FUENTE";
  }

  function tipo(item){
    return normalizar(item?.tipoObservacion) || "SIN TIPO";
  }

  function estado(item){
    return normalizar(item?.estado) || "SIN ESTADO";
  }

  function sede(item){
    return normalizar(item?.sede) || "SIN SEDE";
  }

  function cuadrilla(item){
    return String(item?.cuadrilla || "SIN CUADRILLA").trim();
  }

  function descripcion(item){
    return String(
      item?.descripcion ||
      item?.observacion ||
      item?.detalle ||
      "SIN DESCRIPCION"
    ).replace(/\s+/g," ").trim();
  }

  function claveCausistica(item){
    return `${tipo(item)}|${normalizar(descripcion(item))}`;
  }

  function fechaVisible(valor){
    if(!valor) return "";
    const texto = String(valor);
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const fecha = new Date(valor);
    if(!Number.isNaN(fecha.getTime())){
      return new Intl.DateTimeFormat("es-PE",{
        timeZone:"America/Lima",
        day:"2-digit",
        month:"2-digit",
        year:"numeric"
      }).format(fecha);
    }
    return texto;
  }

  function usuarioVisible(){
    return (
      localStorage.getItem("nombresApellidos") ||
      localStorage.getItem("nombre") ||
      localStorage.getItem("usuario") ||
      "USUARIO"
    );
  }

  function filtrosActivosTexto(){
    const campos = [
      ["Estado","filtroEstadoObs"],
      ["Fuente","filtroFuenteObs"],
      ["Código","filtroCodigoObs"],
      ["Cuadrilla","filtroCuadrillaObs"],
      ["Fecha desde","filtroFechaDesdeObs"],
      ["Fecha hasta","filtroFechaHastaObs"],
      ["Tipo","filtroTipoObs"],
      ["Sede","filtroSedeObs"]
    ];

    const activos = campos
      .map(([nombre,id])=>{
        const valor = document.getElementById(id)?.value;
        return valor ? `${nombre}: ${valor}` : "";
      })
      .filter(Boolean);

    return activos.length ? activos.join(" | ") : "Sin filtros adicionales";
  }

  function agrupar(lista,claveFn,camposFn){
    const mapa = new Map();

    lista.forEach(item=>{
      const clave = claveFn(item);
      if(!mapa.has(clave)){
        mapa.set(clave,Object.assign({
          clave,
          cantidad:0,
          montoNominal:0,
          impacto:0,
          estados:{},
          fuentes:new Set(),
          sedes:new Set(),
          cuadrillas:new Set()
        },camposFn ? camposFn(item) : {}));
      }

      const grupo = mapa.get(clave);
      grupo.cantidad++;
      grupo.montoNominal += numero(item.monto);
      grupo.impacto += impacto(item);
      grupo.estados[estado(item)] = (grupo.estados[estado(item)] || 0)+1;
      grupo.fuentes.add(fuente(item));
      grupo.sedes.add(sede(item));
      grupo.cuadrillas.add(cuadrilla(item));
    });

    return Array.from(mapa.values());
  }

  function resumenGeneral(lista){
    const estados = {};
    const fuentes = {};
    const tipos = {};
    let montoNominal = 0;
    let impactoCalculado = 0;

    lista.forEach(item=>{
      const e = estado(item);
      const f = fuente(item);
      const t = tipo(item);

      if(!estados[e]) estados[e] = {cantidad:0,monto:0,impacto:0};
      if(!fuentes[f]) fuentes[f] = {cantidad:0,monto:0,impacto:0};
      if(!tipos[t]) tipos[t] = {cantidad:0,monto:0,impacto:0};

      estados[e].cantidad++;
      estados[e].monto += numero(item.monto);
      estados[e].impacto += impacto(item);

      fuentes[f].cantidad++;
      fuentes[f].monto += numero(item.monto);
      fuentes[f].impacto += impacto(item);

      tipos[t].cantidad++;
      tipos[t].monto += numero(item.monto);
      tipos[t].impacto += impacto(item);

      montoNominal += numero(item.monto);
      impactoCalculado += impacto(item);
    });

    return {
      total:lista.length,
      montoNominal:redondear(montoNominal),
      impactoCalculado:redondear(impactoCalculado),
      estados,
      fuentes,
      tipos
    };
  }

  function cargarScript(url){
    return new Promise((resolve,reject)=>{
      const existente = Array.from(document.scripts).find(s=>s.src===url);
      if(existente){
        if(window.XLSX?.utils) return resolve();
        existente.addEventListener("load",resolve,{once:true});
        existente.addEventListener("error",reject,{once:true});
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = ()=>reject(new Error(`No se pudo cargar ${url}`));
      document.head.appendChild(script);
    });
  }

  async function asegurarExcel(){
    if(window.XLSX?.utils) return true;
    if(promesaLibreria) return promesaLibreria;

    promesaLibreria = (async()=>{
      let ultimoError = null;
      for(const url of LIBRERIAS){
        try{
          await cargarScript(url);
          if(window.XLSX?.utils) return true;
        }catch(error){
          ultimoError = error;
        }
      }
      throw ultimoError || new Error("No se pudo cargar el generador Excel.");
    })();

    try{
      return await promesaLibreria;
    }catch(error){
      promesaLibreria = null;
      throw error;
    }
  }

  function mostrarCarga(texto){
    let overlay = document.getElementById("mv357Overlay");
    if(!overlay){
      overlay = document.createElement("div");
      overlay.id = "mv357Overlay";
      overlay.innerHTML = `
        <div style="width:min(370px,88vw);padding:22px;border-radius:18px;background:#10213b;color:#fff;text-align:center;box-shadow:0 18px 45px rgba(0,0,0,.45)">
          <div style="width:38px;height:38px;margin:0 auto 12px;border:4px solid rgba(255,255,255,.22);border-top-color:#fff;border-radius:50%;animation:mv357Spin 1s linear infinite"></div>
          <b id="mv357OverlayTexto">Preparando informe...</b>
        </div>`;
      Object.assign(overlay.style,{
        position:"fixed",
        inset:"0",
        zIndex:"10100",
        display:"none",
        alignItems:"center",
        justifyContent:"center",
        background:"rgba(2,8,23,.76)"
      });
      const style = document.createElement("style");
      style.textContent = "@keyframes mv357Spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }

    const etiqueta = document.getElementById("mv357OverlayTexto");
    if(etiqueta) etiqueta.textContent = texto || "Preparando informe...";
    overlay.style.display = "flex";
  }

  function ocultarCarga(){
    const overlay = document.getElementById("mv357Overlay");
    if(overlay) overlay.style.display = "none";
  }

  function mensaje(texto,error=false){
    const cont = document.getElementById("mv357Mensaje");
    if(!cont) return;
    cont.textContent = texto || "";
    cont.style.color = error ? "#fecaca" : "#bbf7d0";
  }

  function hojaAoa(nombre,filas,anchos,encabezado=0){
    const XLSX = window.XLSX;
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = anchos.map(w=>({wch:w}));

    if(filas.length>encabezado+1 && filas[encabezado]){
      ws["!autofilter"] = {
        ref:XLSX.utils.encode_range({
          s:{r:encabezado,c:0},
          e:{r:filas.length-1,c:filas[encabezado].length-1}
        })
      };
    }

    return {nombre,ws,filas,encabezado};
  }

  function formatos(sheet,columnas){
    const XLSX = window.XLSX;
    for(let r=sheet.encabezado+1;r<sheet.filas.length;r++){
      Object.entries(columnas).forEach(([col,formato])=>{
        const celda = sheet.ws[XLSX.utils.encode_cell({r,c:Number(col)})];
        if(celda) celda.z = formato;
      });
    }
  }

  function construirLibro(lista,alcance){
    const XLSX = window.XLSX;
    const periodo = periodoSeleccionado();
    const resumen = resumenGeneral(lista);
    const libro = XLSX.utils.book_new();

    libro.Props = {
      Title:`Informe de Observaciones MI VISUAL - ${nombrePeriodo(periodo)}`,
      Subject:"Observaciones, estados, montos y causísticas",
      Author:usuarioVisible(),
      Company:"Visual Connections SAC",
      CreatedDate:new Date()
    };

    const generales = [
      ["MI VISUAL - INFORME DE OBSERVACIONES"],
      ["Periodo",nombrePeriodo(periodo)],
      ["Alcance",alcance==="filtradas" ? "Resultados filtrados en pantalla" : "Todo el periodo seleccionado"],
      ["Filtros",alcance==="filtradas" ? filtrosActivosTexto() : "Todo el periodo"],
      ["Generado por",usuarioVisible()],
      ["Fecha de generación",new Intl.DateTimeFormat("es-PE",{
        timeZone:"America/Lima",
        dateStyle:"short",
        timeStyle:"short"
      }).format(new Date())],
      [],
      ["INDICADOR","CANTIDAD","MONTO NOMINAL","IMPACTO CALCULADO"],
      ["TOTAL",resumen.total,resumen.montoNominal,resumen.impactoCalculado],
      ...Object.entries(resumen.estados)
        .sort((a,b)=>b[1].cantidad-a[1].cantidad)
        .map(([e,r])=>[e,r.cantidad,redondear(r.monto),redondear(r.impacto)]),
      [],
      ["RESUMEN POR FUENTE"],
      ["FUENTE","CANTIDAD","MONTO NOMINAL","IMPACTO CALCULADO"],
      ...Object.entries(resumen.fuentes)
        .sort((a,b)=>b[1].cantidad-a[1].cantidad)
        .map(([f,r])=>[f,r.cantidad,redondear(r.monto),redondear(r.impacto)]),
      [],
      ["RESUMEN POR TIPO DE OBSERVACION"],
      ["TIPO","CANTIDAD","MONTO NOMINAL","IMPACTO CALCULADO"],
      ...Object.entries(resumen.tipos)
        .sort((a,b)=>b[1].cantidad-a[1].cantidad)
        .map(([t,r])=>[t,r.cantidad,redondear(r.monto),redondear(r.impacto)])
    ];

    const resumenSheet = hojaAoa("RESUMEN_GENERAL",generales,[36,15,19,20],7);
    formatos(resumenSheet,{2:'"S/ "0.00',3:'"S/ "0.00'});
    XLSX.utils.book_append_sheet(libro,resumenSheet.ws,resumenSheet.nombre);

    const estadosOrden = [
      "DERIVADO","EN PROCESO","PENALIZADO","APELADO","SUBSANADO","ANULADO"
    ];

    const porSede = agrupar(
      lista,
      item=>sede(item),
      item=>({sede:sede(item)})
    ).sort((a,b)=>a.sede.localeCompare(b.sede));

    const sedeRows = [[
      "SEDE","TOTAL","DERIVADO","EN PROCESO","PENALIZADO",
      "APELADO","SUBSANADO","ANULADO","MONTO NOMINAL","IMPACTO CALCULADO",
      "FUENTES","CUADRILLAS"
    ]];

    porSede.forEach(g=>{
      sedeRows.push([
        g.sede,
        g.cantidad,
        g.estados["DERIVADO"]||0,
        g.estados["EN PROCESO"]||0,
        g.estados["PENALIZADO"]||0,
        g.estados["APELADO"]||0,
        g.estados["SUBSANADO"]||0,
        g.estados["ANULADO"]||0,
        redondear(g.montoNominal),
        redondear(g.impacto),
        Array.from(g.fuentes).sort().join(", "),
        g.cuadrillas.size
      ]);
    });

    const sedeSheet = hojaAoa(
      "RESUMEN_POR_SEDE",
      sedeRows,
      [16,10,11,13,13,10,12,10,17,19,22,12],
      0
    );
    formatos(sedeSheet,{8:'"S/ "0.00',9:'"S/ "0.00'});
    XLSX.utils.book_append_sheet(libro,sedeSheet.ws,sedeSheet.nombre);

    const porCuadrilla = agrupar(
      lista,
      item=>`${sede(item)}|${cuadrilla(item)}`,
      item=>({sede:sede(item),cuadrilla:cuadrilla(item)})
    ).sort((a,b)=>a.sede.localeCompare(b.sede) || a.cuadrilla.localeCompare(b.cuadrilla,undefined,{numeric:true}));

    const cuadrillaRows = [[
      "SEDE","CUADRILLA","TOTAL","DERIVADO","EN PROCESO","PENALIZADO",
      "APELADO","SUBSANADO","ANULADO","MONTO NOMINAL","IMPACTO CALCULADO",
      "FUENTES","TIPOS DE ESTADO"
    ]];

    porCuadrilla.forEach(g=>{
      cuadrillaRows.push([
        g.sede,
        g.cuadrilla,
        g.cantidad,
        g.estados["DERIVADO"]||0,
        g.estados["EN PROCESO"]||0,
        g.estados["PENALIZADO"]||0,
        g.estados["APELADO"]||0,
        g.estados["SUBSANADO"]||0,
        g.estados["ANULADO"]||0,
        redondear(g.montoNominal),
        redondear(g.impacto),
        Array.from(g.fuentes).sort().join(", "),
        Object.entries(g.estados).map(([k,v])=>`${k}: ${v}`).join(" | ")
      ]);
    });

    const cuadrillaSheet = hojaAoa(
      "RESUMEN_CUADRILLAS",
      cuadrillaRows,
      [16,42,10,11,13,13,10,12,10,17,19,24,36],
      0
    );
    formatos(cuadrillaSheet,{9:'"S/ "0.00',10:'"S/ "0.00'});
    XLSX.utils.book_append_sheet(libro,cuadrillaSheet.ws,cuadrillaSheet.nombre);

    const fuenteTipo = agrupar(
      lista,
      item=>`${fuente(item)}|${tipo(item)}`,
      item=>({fuente:fuente(item),tipo:tipo(item)})
    ).sort((a,b)=>b.cantidad-a.cantidad || a.fuente.localeCompare(b.fuente));

    const fuenteRows = [[
      "FUENTE","TIPO DE OBSERVACION","CANTIDAD","% DEL TOTAL",
      "MONTO NOMINAL","IMPACTO CALCULADO","ESTADOS","SEDES"
    ]];

    fuenteTipo.forEach(g=>{
      fuenteRows.push([
        g.fuente,
        g.tipo,
        g.cantidad,
        lista.length ? redondear(g.cantidad/lista.length*100,1) : 0,
        redondear(g.montoNominal),
        redondear(g.impacto),
        Object.entries(g.estados).map(([k,v])=>`${k}: ${v}`).join(" | "),
        Array.from(g.sedes).sort().join(", ")
      ]);
    });

    const fuenteSheet = hojaAoa(
      "FUENTES_Y_TIPOS",
      fuenteRows,
      [18,30,12,14,17,19,36,24],
      0
    );
    formatos(fuenteSheet,{3:'0.0"%"',4:'"S/ "0.00',5:'"S/ "0.00'});
    XLSX.utils.book_append_sheet(libro,fuenteSheet.ws,fuenteSheet.nombre);

    const causisticas = agrupar(
      lista,
      item=>claveCausistica(item),
      item=>({
        tipo:tipo(item),
        causistica:descripcion(item)
      })
    ).sort((a,b)=>b.cantidad-a.cantidad || b.impacto-a.impacto);

    const causisticaRows = [[
      "RANKING","TIPO DE OBSERVACION","CAUSISTICA / DESCRIPCION",
      "CANTIDAD","% DEL TOTAL","MONTO NOMINAL","IMPACTO CALCULADO",
      "FUENTES","SEDES","CUADRILLAS","ESTADOS"
    ]];

    causisticas.forEach((g,indice)=>{
      causisticaRows.push([
        indice+1,
        g.tipo,
        g.causistica,
        g.cantidad,
        lista.length ? redondear(g.cantidad/lista.length*100,1) : 0,
        redondear(g.montoNominal),
        redondear(g.impacto),
        Array.from(g.fuentes).sort().join(", "),
        Array.from(g.sedes).sort().join(", "),
        g.cuadrillas.size,
        Object.entries(g.estados).map(([k,v])=>`${k}: ${v}`).join(" | ")
      ]);
    });

    const causisticaSheet = hojaAoa(
      "CAUSISTICAS_REPETITIVAS",
      causisticaRows,
      [10,28,70,12,14,17,19,22,22,12,36],
      0
    );
    formatos(causisticaSheet,{4:'0.0"%"',5:'"S/ "0.00',6:'"S/ "0.00'});
    XLSX.utils.book_append_sheet(libro,causisticaSheet.ws,causisticaSheet.nombre);

    const detalleRows = [[
      "FECHA","PERIODO","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA",
      "FUENTE","CODIGO / TICKET","TIPO DE OBSERVACION","DESCRIPCION",
      "ESTADO","MONTO NOMINAL","IMPACTO CALCULADO","FECHA DESCARGO",
      "DESCARGO TECNICO","EVIDENCIA TECNICO","FECHA REVISION","PLAZO",
      "ID REGISTRO"
    ]];

    lista
      .slice()
      .sort((a,b)=>String(a.fechaRegistro||"").localeCompare(String(b.fechaRegistro||"")))
      .forEach(item=>{
        detalleRows.push([
          fechaVisible(item.fechaRegistro),
          clavePeriodo(item),
          sede(item),
          item.plataforma || "",
          item.supervisor || "",
          cuadrilla(item),
          fuente(item),
          item.codigo || "",
          tipo(item),
          descripcion(item),
          estado(item),
          redondear(item.monto),
          redondear(impacto(item)),
          fechaVisible(item.fechaDescargo),
          item.descargoTecnico || "",
          item.evidenciaTecnico || "",
          fechaVisible(item.fechaRevision),
          item.plazo || "",
          item.id || ""
        ]);
      });

    const detalleSheet = hojaAoa(
      "DETALLE_OBSERVACIONES",
      detalleRows,
      [14,12,15,18,25,42,16,18,30,70,16,17,19,16,65,55,16,18,28],
      0
    );
    formatos(detalleSheet,{11:'"S/ "0.00',12:'"S/ "0.00'});
    XLSX.utils.book_append_sheet(libro,detalleSheet.ws,detalleSheet.nombre);

    const metodologia = [
      ["METODOLOGIA DEL INFORME"],
      ["Campo","Criterio"],
      ["Periodo","Mes de origen de la observación."],
      ["Cantidad total","Número de registros incluidos en el alcance seleccionado."],
      ["Monto nominal","Suma del monto completo registrado en cada observación."],
      ["Impacto calculado","Estados SUBSANADO y ANULADO consideran 20% del monto; los demás estados consideran 100%, igual que el resumen visual del módulo."],
      ["Causísticas repetitivas","Agrupación por Tipo de observación + Descripción, ordenada de mayor a menor cantidad."],
      ["Alcance del archivo",alcance==="filtradas" ? `Filtros actuales: ${filtrosActivosTexto()}` : "Todo el periodo seleccionado."],
      ["Periodo generado",nombrePeriodo(periodoSeleccionado())],
      ["Fuente de datos","Información ya cargada en el módulo Observaciones de MI VISUAL."],
      ["Optimización","No se realizan consultas adicionales; el archivo se construye en el navegador usando observacionesCache."]
    ];

    const metodologiaSheet = hojaAoa("METODOLOGIA",metodologia,[34,100],1);
    XLSX.utils.book_append_sheet(libro,metodologiaSheet.ws,metodologiaSheet.nombre);

    return libro;
  }

  function nombreArchivo(alcance){
    const periodo = periodoSeleccionado().replace(/[^0-9-]/g,"");
    const sufijo = alcance==="filtradas" ? "_FILTRADO" : "";
    return `Informe_Observaciones_MI_VISUAL_${periodo}${sufijo}.xlsx`;
  }

  async function generar(){
    const alcance = document.querySelector('input[name="mv357Alcance"]:checked')?.value || "periodo";
    const lista = alcance==="filtradas" ? listaFiltradaActual() : listaPeriodoCompleto();

    if(!lista.length){
      mensaje("No existen observaciones para el alcance seleccionado.",true);
      return;
    }

    mostrarCarga("Cargando generador Excel...");
    mensaje("");

    try{
      await asegurarExcel();
      mostrarCarga("Construyendo resumen, causísticas y detalle...");

      const libro = construirLibro(lista,alcance);
      window.XLSX.writeFile(libro,nombreArchivo(alcance),{
        bookType:"xlsx",
        compression:true
      });

      mensaje(`Informe generado correctamente con ${lista.length} observaciones.`);
    }catch(error){
      console.error("V357 Informe Observaciones",error);
      mensaje(error.message || "No se pudo generar el informe.",true);
    }finally{
      ocultarCarga();
    }
  }

  function cerrarModal(){
    document.getElementById("mv357Modal")?.remove();
  }

  function abrirModal(){
    if(!puedeDescargar()){
      alert("El Informe Excel de Observaciones está disponible para Jefatura y Gerencia.");
      return;
    }

    const periodo = periodoSeleccionado();
    const totalPeriodo = listaPeriodoCompleto().length;
    const totalFiltrado = listaFiltradaActual().length;

    cerrarModal();

    const modal = document.createElement("div");
    modal.id = "mv357Modal";
    modal.innerHTML = `
      <div class="mv357-caja">
        <div class="mv357-cabecera">
          <div>
            <h2>Informe Excel de Observaciones</h2>
            <p>${escapar(nombrePeriodo(periodo))}</p>
          </div>
          <button type="button" onclick="mv357CerrarInformeObservaciones()">×</button>
        </div>

        <div class="mv357-contenido">
          <div class="mv357-resumen">
            <b>Contenido del archivo</b>
            <span>
              Resumen general, sedes, cuadrillas, fuentes, tipos, estados,
              montos, causísticas repetitivas y detalle completo.
            </span>
          </div>

          <label class="mv357-opcion">
            <input type="radio" name="mv357Alcance" value="periodo" checked>
            <span>
              <b>Todo el periodo seleccionado</b>
              <small>${totalPeriodo} observaciones</small>
            </span>
          </label>

          <label class="mv357-opcion">
            <input type="radio" name="mv357Alcance" value="filtradas">
            <span>
              <b>Solo los resultados filtrados en pantalla</b>
              <small>${totalFiltrado} observaciones · ${escapar(filtrosActivosTexto())}</small>
            </span>
          </label>

          <div class="mv357-nota">
            El informe se genera con la información ya cargada. No se realiza
            una nueva consulta y SheetJS se descarga solamente al pulsar Generar Excel.
          </div>

          <div id="mv357Mensaje"></div>

          <button type="button" class="mv357-generar" onclick="mv357GenerarInformeObservaciones()">
            📊 Generar Excel
          </button>
        </div>
      </div>`;

    Object.assign(modal.style,{
      position:"fixed",
      inset:"0",
      zIndex:"10060",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:"18px",
      background:"rgba(2,8,23,.78)"
    });

    const style = document.createElement("style");
    style.textContent = `
      #mv357Modal .mv357-caja{width:min(720px,96vw);max-height:90vh;overflow:auto;border:1px solid #315577;border-radius:20px;background:#0d2037;color:#fff;box-shadow:0 24px 60px rgba(0,0,0,.5)}
      #mv357Modal .mv357-cabecera{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid #274566}
      #mv357Modal h2{margin:0;font-size:23px}
      #mv357Modal p{margin:5px 0 0;color:#9fc1e4;font-size:12px}
      #mv357Modal .mv357-cabecera button{width:40px;height:40px;border:0;border-radius:10px;background:#253b58;color:#fff;font-size:24px;cursor:pointer}
      #mv357Modal .mv357-contenido{padding:18px 20px}
      #mv357Modal .mv357-resumen{display:flex;flex-direction:column;gap:5px;padding:14px;border:1px solid #315577;border-radius:14px;background:#12304f}
      #mv357Modal .mv357-resumen span{color:#c7dbef;font-size:12px;line-height:1.45}
      #mv357Modal .mv357-opcion{display:flex;gap:11px;align-items:flex-start;margin-top:13px;padding:13px;border:1px solid #274566;border-radius:14px;background:#102844;cursor:pointer}
      #mv357Modal .mv357-opcion input{width:20px;height:20px;margin-top:1px}
      #mv357Modal .mv357-opcion span{display:flex;flex-direction:column;gap:4px}
      #mv357Modal .mv357-opcion small{color:#9fc1e4}
      #mv357Modal .mv357-nota{margin-top:13px;padding:12px;border-radius:12px;background:#172a43;color:#b9d2ea;font-size:12px;line-height:1.45}
      #mv357Modal #mv357Mensaje{min-height:20px;margin-top:10px;font-size:12px;font-weight:900}
      #mv357Modal .mv357-generar{width:100%;margin-top:8px;padding:13px;border:0;border-radius:12px;background:#15803d;color:#fff;font-weight:900;cursor:pointer}
      .mv357-boton-informe{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-left:10px;padding:11px 15px;border:0;border-radius:12px;background:linear-gradient(135deg,#15803d,#059669);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 7px 18px rgba(0,0,0,.22)}
      @media(max-width:650px){.mv357-boton-informe{margin:10px 0 0;width:100%}}
    `;
    modal.appendChild(style);
    document.body.appendChild(modal);
  }

  function inyectarBoton(){
    if(!puedeDescargar()) return;
    if(document.getElementById("mv357BtnInformeObs")) return;

    const contenedor = document.querySelector(".obs-contenedor");
    if(!contenedor) return;

    const boton = document.createElement("button");
    boton.id = "mv357BtnInformeObs";
    boton.type = "button";
    boton.className = "mv357-boton-informe";
    boton.innerHTML = "📊 Informe Excel";
    boton.onclick = abrirModal;

    const botonNuevo = contenedor.querySelector(".btnObsPrincipal");
    if(botonNuevo){
      botonNuevo.insertAdjacentElement("afterend",boton);
    }else{
      const subtitulo = contenedor.querySelector(".obs-sub");
      if(subtitulo) subtitulo.insertAdjacentElement("afterend",boton);
      else contenedor.prepend(boton);
    }
  }

  function aplicarParche(){
    if(typeof window.mostrarObservaciones !== "function") return false;
    if(window.mostrarObservaciones.__mv357Informe) return true;

    mostrarObservacionesOriginal = window.mostrarObservaciones;

    const ajustada = function(){
      const resultado = mostrarObservacionesOriginal.apply(this,arguments);
      setTimeout(inyectarBoton,0);
      return resultado;
    };

    ajustada.__mv357Informe = true;
    ajustada.__mv357Original = mostrarObservacionesOriginal;
    window.mostrarObservaciones = ajustada;
    return true;
  }

  window.mv357AbrirInformeObservaciones = abrirModal;
  window.mv357CerrarInformeObservaciones = cerrarModal;
  window.mv357GenerarInformeObservaciones = generar;
  window.mv357InyectarBotonInformeObservaciones = inyectarBoton;

  aplicarParche();

  window.MV357_INFORME_OBSERVACIONES_OK = true;
  console.log("MI VISUAL V357: Informe Excel de Observaciones habilitado.");
})();