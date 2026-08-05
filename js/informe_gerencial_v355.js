/* ============================================================
   MI VISUAL V355 - Informe Gerencial del Dashboard
   - Disponible solo para Jefatura y Gerencia Lima.
   - PDF ejecutivo y Excel detallado.
   - Reutiliza los datos ya cargados en el Dashboard.
   - Las librerías pesadas se descargan solo al generar un archivo.
============================================================ */
(function(){
  "use strict";

  const MV355_LIBS = {
    jspdf:[
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js"
    ],
    autotable:[
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js",
      "https://unpkg.com/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"
    ],
    xlsx:[
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
      "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
    ]
  };

  const MV355_PROMESAS = new Map();

  function norm(valor){
    return String(valor || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function esc(valor){
    return String(valor ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function num(valor){
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  function red(valor, decimales=1){
    const factor = Math.pow(10,decimales);
    return Math.round((num(valor)+Number.EPSILON)*factor)/factor;
  }

  function pct(valor){
    return `${red(valor,1).toFixed(1)}%`;
  }

  function money(valor){
    return `S/ ${num(valor).toLocaleString("es-PE",{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    })}`;
  }

  function fechaVisible(valor){
    if(!valor) return "-";
    const texto = String(valor);
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    try{
      return new Intl.DateTimeFormat("es-PE",{
        timeZone:"America/Lima",
        day:"2-digit",
        month:"2-digit",
        year:"numeric"
      }).format(new Date(valor));
    }catch(_){
      return texto;
    }
  }

  function periodoNombre(periodo){
    const m = String(periodo || "").match(/^(\d{4})-(\d{2})$/);
    if(!m) return String(periodo || "PERIODO");
    const meses = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];
    return `${meses[Number(m[2])-1]} ${m[1]}`;
  }

  function clavePeriodo(valor){
    if(typeof window.mv276ClavePeriodo === "function"){
      return window.mv276ClavePeriodo(valor);
    }
    const texto = String(valor || "");
    const iso = texto.match(/^(\d{4})-(\d{2})/);
    if(iso) return `${iso[1]}-${iso[2]}`;
    const pe = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(pe) return `${pe[3]}-${String(Number(pe[2])).padStart(2,"0")}`;
    return "";
  }

  function perfilActual(){
    return norm(localStorage.getItem("perfil") || "");
  }

  function puedeUsarInforme(){
    return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA"].includes(perfilActual());
  }

  function usuarioVisible(){
    return (
      localStorage.getItem("nombresApellidos") ||
      localStorage.getItem("nombre") ||
      localStorage.getItem("usuario") ||
      "USUARIO"
    );
  }

  function datosDashboardActual(){
    if(typeof window.mv356ObtenerDatosDashboardGerencial === "function"){
      const datos = window.mv356ObtenerDatosDashboardGerencial() || {};
      return {
        lista:Array.isArray(datos.lista) ? datos.lista : [],
        periodo:datos.periodo || ""
      };
    }

    // Respaldo para una sesión con archivos mezclados durante la actualización.
    return {
      lista:Array.isArray(window.MV198_DASH_JEFATURA_LISTA)
        ? window.MV198_DASH_JEFATURA_LISTA
        : [],
      periodo:window.MV276_DASH_PERIODO || ""
    };
  }

  function listaActual(){
    return datosDashboardActual().lista.filter(x=>x && x.cuadrilla);
  }

  function periodoActual(){
    return datosDashboardActual().periodo || "";
  }

  function fechaCorteLista(lista){
    for(const item of lista){
      const corte = item?.mv353CumplimientoDia?.fechaCorte;
      if(corte) return corte;
    }
    return "";
  }

  function supervisorItem(item){
    return (
      item?.mv353CumplimientoDia?.supervisor ||
      item?.supervisor ||
      "NO REGISTRADO"
    );
  }

  function diasItem(item){
    const d = item?.mv353CumplimientoDia || {};
    return {
      campo:num(d.diasCampo),
      descanso:num(d.diasDescanso),
      vacaciones:num(d.diasVacaciones),
      bolsa:num(d.diasBolsa),
      meta:num(d.metaAcumulada),
      metaDiaria:num(d.metaDiaria || 5),
      fechaCorte:d.fechaCorte || ""
    };
  }

  function cumplimientoDiaItem(item){
    const d = diasItem(item);
    return d.meta > 0 ? num(item.produccion)/d.meta*100 : null;
  }

  function brechaDiaItem(item){
    return red(num(item.produccion)-diasItem(item).meta,1);
  }

  function resumen(lista){
    const cuadrillas = lista.length;
    const produccion = lista.reduce((s,x)=>s+num(x.produccion),0);
    const metaMensual = cuadrillas * 130;
    const efectividad = cuadrillas
      ? lista.reduce((s,x)=>s+num(x.efectividad),0)/cuadrillas
      : 0;
    const recableado = cuadrillas
      ? lista.reduce((s,x)=>s+num(x.recableado),0)/cuadrillas
      : 0;
    const vtrgar = cuadrillas
      ? lista.reduce((s,x)=>s+num(x.vtrgar),0)/cuadrillas
      : 0;

    let metaDia = 0;
    let diasCampo = 0;
    let diasDescanso = 0;
    let sobreMeta = 0;
    let bajoMeta = 0;

    let totalOrdenes = 0;
    let finalizadas = 0;
    let canceladas = 0;
    let reprogramadas = 0;
    let regestion = 0;
    let los = 0;
    let recableados = 0;
    let vtrFinalizadas = 0;
    let gar = 0;
    let vtr = 0;
    let incidencias = 0;
    let observaciones = 0;
    let obsPendientes = 0;
    let montoObs = 0;
    let montoAfectado = 0;

    lista.forEach(item=>{
      const d = diasItem(item);
      metaDia += d.meta;
      diasCampo += d.campo;
      diasDescanso += d.descanso+d.vacaciones+d.bolsa;

      const c = cumplimientoDiaItem(item);
      if(c !== null && c >= 100) sobreMeta++;
      else if(c !== null) bajoMeta++;

      const e = item.detEfectividad || {};
      totalOrdenes += num(e.total);
      finalizadas += num(e.finalizadas);
      canceladas += num(e.canceladas);
      reprogramadas += num(e.reprogramadas);
      regestion += num(e.regestion);

      const r = item.detRecableado || {};
      los += num(r.los);
      recableados += num(r.recableados);

      const vg = item.detVtrGar || {};
      vtrFinalizadas += num(vg.finalizadas);
      gar += num(vg.gar);
      vtr += num(vg.vtr);
      incidencias += num(vg.total);

      const o = item.detObservaciones || {};
      observaciones += num(o.total || item.observaciones);
      obsPendientes += num(o.pendientes);
      montoObs += num(o.montoTotal || item.montoTotalObs);
      montoAfectado += num(o.montoPendiente || item.montoAfectadoObs);
    });

    const cumplimientoDia = metaDia > 0 ? produccion/metaDia*100 : null;
    const avanceMensual = metaMensual > 0 ? produccion/metaMensual*100 : 0;

    const metasCumplidas = [
      produccion >= metaMensual,
      efectividad >= 70,
      recableado <= 42,
      vtrgar <= 3,
      montoAfectado <= 200
    ].filter(Boolean).length;

    return {
      cuadrillas,
      produccion:red(produccion,1),
      metaMensual,
      avanceMensual:red(avanceMensual,1),
      metaDia:red(metaDia,1),
      cumplimientoDia:cumplimientoDia===null?null:red(cumplimientoDia,1),
      brechaDia:red(produccion-metaDia,1),
      diasCampo,
      diasDescanso,
      sobreMeta,
      bajoMeta,
      efectividad:red(efectividad,1),
      recableado:red(recableado,1),
      vtrgar:red(vtrgar,1),
      totalOrdenes:red(totalOrdenes,0),
      finalizadas:red(finalizadas,0),
      canceladas:red(canceladas,0),
      reprogramadas:red(reprogramadas,0),
      regestion:red(regestion,0),
      los:red(los,0),
      recableados:red(recableados,0),
      vtrFinalizadas:red(vtrFinalizadas,0),
      gar:red(gar,0),
      vtr:red(vtr,0),
      incidencias:red(incidencias,0),
      observaciones:red(observaciones,0),
      obsPendientes:red(obsPendientes,0),
      montoObs:red(montoObs,2),
      montoAfectado:red(montoAfectado,2),
      metasCumplidas,
      cumplimientoGeneral:metasCumplidas*20
    };
  }

  function sedesOrdenadas(lista){
    const oficiales = ["CHICLAYO","PIURA","TRUJILLO"];
    const encontradas = Array.from(
      new Set(lista.map(x=>norm(x.sede)).filter(Boolean))
    );
    return oficiales
      .filter(s=>encontradas.includes(s))
      .concat(encontradas.filter(s=>!oficiales.includes(s)).sort());
  }

  function agruparPorSede(lista){
    const mapa = {};
    lista.forEach(item=>{
      const sede = norm(item.sede) || "SIN SEDE";
      if(!mapa[sede]) mapa[sede] = [];
      mapa[sede].push(item);
    });
    return mapa;
  }

  function estadoCuadrilla(item){
    const diario = cumplimientoDiaItem(item);
    const alertas = [];

    if(diario !== null && diario < 85) alertas.push("CUMPLIMIENTO DIARIO");
    if(num(item.efectividad) < 70) alertas.push("EFECTIVIDAD");
    if(num(item.recableado) > 42) alertas.push("RECABLEADO");
    if(num(item.vtrgar) > 3) alertas.push("VTR/GAR");
    if(num(item.montoAfectadoObs) > 200) alertas.push("OBSERVACIONES");

    const critico =
      (diario !== null && diario < 70) ||
      num(item.efectividad) < 60 ||
      num(item.recableado) > 55 ||
      num(item.vtrgar) > 6 ||
      num(item.montoAfectadoObs) > 500;

    return {
      estado:critico ? "CRITICO" : (alertas.length ? "ALERTA" : "CONFORME"),
      alertas
    };
  }

  function recomendacionItem(item){
    const estado = estadoCuadrilla(item);
    const recomendaciones = [];

    if(cumplimientoDiaItem(item) !== null && cumplimientoDiaItem(item) < 100){
      recomendaciones.push("recuperar la brecha productiva diaria");
    }
    if(num(item.efectividad) < 70){
      recomendaciones.push("revisar canceladas, reprogramadas y regestiones");
    }
    if(num(item.recableado) > 42){
      recomendaciones.push("controlar autorizaciones y causas de recableado");
    }
    if(num(item.vtrgar) > 3){
      recomendaciones.push("reforzar calidad para reducir VTR/GAR");
    }
    if(num(item.montoAfectadoObs) > 0){
      recomendaciones.push("dar seguimiento a observaciones y descargos");
    }

    if(!recomendaciones.length){
      return "Mantener el seguimiento y las prácticas actuales.";
    }

    return `Priorizar ${recomendaciones.join("; ")}.`;
  }

  function conclusiones(datos){
    const general = datos.general;
    const resumenesSede = datos.sedes.map(s=>({
      sede:s,
      resumen:resumen(datos.grupos[s] || [])
    }));

    const conDiario = resumenesSede.filter(x=>x.resumen.cumplimientoDia!==null);
    const mejor = conDiario.slice().sort(
      (a,b)=>b.resumen.cumplimientoDia-a.resumen.cumplimientoDia
    )[0];
    const menor = conDiario.slice().sort(
      (a,b)=>a.resumen.cumplimientoDia-b.resumen.cumplimientoDia
    )[0];

    const criticas = datos.lista.filter(x=>estadoCuadrilla(x).estado==="CRITICO");
    const alertas = datos.lista.filter(x=>estadoCuadrilla(x).estado==="ALERTA");

    const textos = [];

    if(general.cumplimientoDia!==null){
      textos.push(
        `Zona Norte registra ${pct(general.cumplimientoDia)} de cumplimiento productivo al día, ` +
        `con ${general.produccion.toFixed(1)} puntos frente a ${general.metaDia.toFixed(1)} esperados.`
      );
    }

    textos.push(
      `El avance mensual contra la meta de 130 puntos por cuadrilla es ${pct(general.avanceMensual)}.`
    );

    if(mejor){
      textos.push(
        `${mejor.sede} presenta el mayor cumplimiento al día con ${pct(mejor.resumen.cumplimientoDia)}.`
      );
    }

    if(menor && (!mejor || menor.sede!==mejor.sede)){
      textos.push(
        `${menor.sede} requiere mayor seguimiento, con ${pct(menor.resumen.cumplimientoDia)}.`
      );
    }

    textos.push(
      `${criticas.length} cuadrillas se encuentran en condición crítica y ` +
      `${alertas.length} presentan alertas operativas.`
    );

    if(general.efectividad<70){
      textos.push("La efectividad general se encuentra por debajo de la meta de 70%.");
    }
    if(general.recableado>42){
      textos.push("El recableado general supera la meta máxima de 42%.");
    }
    if(general.vtrgar>3){
      textos.push("El indicador VTR/GAR general supera la meta máxima de 3%.");
    }
    if(general.montoAfectado>200){
      textos.push(
        `El monto afectado por observaciones asciende a ${money(general.montoAfectado)}.`
      );
    }

    return textos;
  }

  async function cargarObservaciones(periodo){
    const api = window.MI_VISUAL_API_URL || (
      typeof window.MV58_API !== "undefined" ? window.MV58_API : ""
    );

    if(!api) return {lista:[],advertencia:"No se encontró la URL de la API."};

    try{
      const respuesta = await fetch(api,{
        method:"POST",
        body:JSON.stringify({
          accion:"listarObservaciones",
          usuario:localStorage.getItem("usuario") || ""
        })
      });

      const texto = (await respuesta.text()).trim();
      if(!texto || /^<!doctype|^<html|^MI VISUAL API OK$/i.test(texto)){
        throw new Error("La API no devolvió observaciones válidas.");
      }

      const data = JSON.parse(texto);
      if(!data.ok) throw new Error(data.error || "No se pudieron consultar las observaciones.");

      const lista = (data.observaciones || []).filter(item=>{
        const p = String(item.periodo || "").trim();
        return p===periodo || clavePeriodo(item.fechaRegistro)===periodo;
      });

      return {lista,advertencia:""};
    }catch(error){
      return {
        lista:[],
        advertencia:`No se pudo incorporar el detalle individual de observaciones: ${error.message}`
      };
    }
  }

  function prepararDatos(observaciones){
    const lista = listaActual();
    if(!lista.length){
      throw new Error("El Dashboard no tiene datos disponibles para generar el informe.");
    }

    const periodo = periodoActual();
    const grupos = agruparPorSede(lista);
    const sedes = sedesOrdenadas(lista);

    return {
      periodo,
      periodoNombre:periodoNombre(periodo),
      fechaCorte:fechaCorteLista(lista),
      generadoEn:new Date(),
      generadoPor:usuarioVisible(),
      perfil:perfilActual(),
      lista,
      grupos,
      sedes,
      general:resumen(lista),
      observaciones:Array.isArray(observaciones)?observaciones:[]
    };
  }

  function nombreArchivo(datos,extension){
    const periodo = String(datos.periodo || "periodo").replace(/[^0-9-]/g,"");
    return `Informe_Gerencial_MI_VISUAL_${periodo}.${extension}`;
  }

  function cargarScript(url){
    if(MV355_PROMESAS.has(url)) return MV355_PROMESAS.get(url);

    const promesa = new Promise((resolve,reject)=>{
      const existente = Array.from(document.scripts).find(s=>s.src===url);
      if(existente){
        if(existente.dataset.mv355Listo==="si") return resolve();
        existente.addEventListener("load",resolve,{once:true});
        existente.addEventListener("error",()=>reject(new Error("No se pudo cargar una librería.")),{once:true});
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = ()=>{
        script.dataset.mv355Listo = "si";
        resolve();
      };
      script.onerror = ()=>{
        script.remove();
        MV355_PROMESAS.delete(url);
        reject(new Error(`No se pudo cargar ${url}`));
      };
      document.head.appendChild(script);
    });

    MV355_PROMESAS.set(url,promesa);
    return promesa;
  }

  async function cargarConAlternativas(urls,comprobar){
    if(comprobar()) return true;
    let ultimoError = null;

    for(const url of urls){
      try{
        await cargarScript(url);
        if(comprobar()) return true;
      }catch(error){
        ultimoError = error;
      }
    }

    throw ultimoError || new Error("No se pudo cargar la librería requerida.");
  }

  async function asegurarPdf(){
    await cargarConAlternativas(
      MV355_LIBS.jspdf,
      ()=>!!window.jspdf?.jsPDF
    );
    await cargarConAlternativas(
      MV355_LIBS.autotable,
      ()=>{
        try{
          const {jsPDF} = window.jspdf || {};
          const doc = jsPDF ? new jsPDF() : null;
          return !!doc?.autoTable;
        }catch(_){
          return false;
        }
      }
    );
  }

  async function asegurarExcel(){
    await cargarConAlternativas(
      MV355_LIBS.xlsx,
      ()=>!!window.XLSX?.utils
    );
  }

  function mostrarCarga(texto){
    let overlay = document.getElementById("mv355Overlay");
    if(!overlay){
      overlay = document.createElement("div");
      overlay.id = "mv355Overlay";
      overlay.innerHTML = `
        <div style="width:min(360px,88vw);background:#10213b;color:#fff;padding:22px;border-radius:18px;text-align:center;box-shadow:0 18px 45px rgba(0,0,0,.45);">
          <div style="width:38px;height:38px;border:4px solid rgba(255,255,255,.24);border-top-color:#fff;border-radius:50%;animation:mv355Spin 1s linear infinite;margin:0 auto 12px;"></div>
          <b id="mv355OverlayTexto">Preparando informe...</b>
        </div>`;
      Object.assign(overlay.style,{
        position:"fixed",
        inset:"0",
        zIndex:"10050",
        display:"none",
        alignItems:"center",
        justifyContent:"center",
        background:"rgba(2,8,23,.72)"
      });
      const style = document.createElement("style");
      style.textContent = "@keyframes mv355Spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }

    const etiqueta = document.getElementById("mv355OverlayTexto");
    if(etiqueta) etiqueta.textContent = texto || "Preparando informe...";
    overlay.style.display = "flex";
  }

  function ocultarCarga(){
    const overlay = document.getElementById("mv355Overlay");
    if(overlay) overlay.style.display = "none";
  }

  function mensajeModal(texto,tipo){
    const cont = document.getElementById("mv355Mensaje");
    if(!cont) return;
    cont.textContent = texto || "";
    cont.style.color = tipo==="error" ? "#fecaca" : "#bbf7d0";
  }

  function cerrarModal(){
    document.getElementById("mv355Modal")?.remove();
  }

  function abrirModal(){
    if(!puedeUsarInforme()){
      alert("El Informe Gerencial está disponible únicamente para Jefatura y Gerencia.");
      return;
    }

    const lista = listaActual();
    if(!lista.length){
      alert("El Dashboard todavía no terminó de preparar sus datos. Espere unos segundos y vuelva a pulsar Informe gerencial.");
      return;
    }

    cerrarModal();

    const periodo = periodoActual();
    const corte = fechaCorteLista(lista);

    const modal = document.createElement("div");
    modal.id = "mv355Modal";
    modal.innerHTML = `
      <div class="mv355-caja">
        <div class="mv355-cabecera">
          <div>
            <h2>Informe Gerencial</h2>
            <p>${esc(periodoNombre(periodo))} · Corte ${esc(fechaVisible(corte))}</p>
          </div>
          <button type="button" onclick="mv355CerrarInformeGerencial()">×</button>
        </div>

        <div class="mv355-contenido">
          <div class="mv355-resumen">
            <b>Alcance completo</b>
            <span>Zona Norte, resumen por sede y detalle por cada cuadrilla.</span>
          </div>

          <label class="mv355-check">
            <input id="mv355IncluirObservaciones" type="checkbox" checked>
            <span>
              <b>Incluir detalle individual de observaciones</b>
              <small>Se consulta únicamente al generar el archivo.</small>
            </span>
          </label>

          <label class="mv355-check">
            <input id="mv355IncluirProduccion" type="checkbox" checked>
            <span>
              <b>Incluir producción por tipo de trabajo</b>
              <small>Agrega el detalle de órdenes, puntaje unitario y puntos.</small>
            </span>
          </label>

          <div class="mv355-nota">
            El informe utiliza la información ya cargada en el Dashboard.
            Las librerías de PDF y Excel se descargan solo al pulsar una opción,
            por lo que no aumentan el tiempo normal de ingreso.
          </div>

          <div id="mv355Mensaje"></div>

          <div class="mv355-acciones">
            <button type="button" class="pdf" onclick="mv355GenerarInformePDF()">Descargar PDF</button>
            <button type="button" class="excel" onclick="mv355GenerarInformeExcel()">Descargar Excel</button>
          </div>
        </div>
      </div>`;

    Object.assign(modal.style,{
      position:"fixed",
      inset:"0",
      zIndex:"10020",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:"18px",
      background:"rgba(2,8,23,.76)"
    });

    const style = document.createElement("style");
    style.textContent = `
      #mv355Modal .mv355-caja{width:min(720px,96vw);max-height:90vh;overflow:auto;background:#0d2037;color:#fff;border:1px solid #315577;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.48)}
      #mv355Modal .mv355-cabecera{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid #274566}
      #mv355Modal h2{margin:0;font-size:23px}
      #mv355Modal p{margin:5px 0 0;color:#9fc1e4;font-size:12px}
      #mv355Modal .mv355-cabecera button{border:0;border-radius:10px;background:#253b58;color:#fff;font-size:24px;width:40px;height:40px;cursor:pointer}
      #mv355Modal .mv355-contenido{padding:18px 20px}
      #mv355Modal .mv355-resumen{display:flex;flex-direction:column;gap:4px;padding:14px;border-radius:14px;background:#12304f;border:1px solid #315577}
      #mv355Modal .mv355-resumen span{font-size:12px;color:#c7dbef}
      #mv355Modal .mv355-check{display:flex;gap:11px;align-items:flex-start;margin-top:13px;padding:13px;border-radius:14px;background:#102844;border:1px solid #274566;cursor:pointer}
      #mv355Modal .mv355-check input{width:20px;height:20px;margin-top:1px}
      #mv355Modal .mv355-check span{display:flex;flex-direction:column;gap:4px}
      #mv355Modal .mv355-check small{color:#9fc1e4}
      #mv355Modal .mv355-nota{margin-top:13px;padding:12px;border-radius:12px;background:#172a43;color:#b9d2ea;font-size:12px;line-height:1.45}
      #mv355Modal #mv355Mensaje{min-height:20px;margin-top:10px;font-size:12px;font-weight:800}
      #mv355Modal .mv355-acciones{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
      #mv355Modal .mv355-acciones button{border:0;border-radius:12px;padding:13px;color:#fff;font-weight:900;cursor:pointer}
      #mv355Modal .mv355-acciones .pdf{background:#dc2626}
      #mv355Modal .mv355-acciones .excel{background:#15803d}
      .mv355-boton-dashboard{border:0;border-radius:12px;padding:11px 14px;background:#7c3aed;color:#fff;font-weight:900;cursor:pointer;margin:10px 0;box-shadow:0 6px 16px rgba(0,0,0,.2)}
      @media(max-width:620px){#mv355Modal .mv355-acciones{grid-template-columns:1fr}}
    `;
    modal.appendChild(style);
    document.body.appendChild(modal);
  }

  function botonInforme(){
    if(!puedeUsarInforme()) return "";

    return `<button
      type="button"
      class="mv355-boton-dashboard"
      onclick="mv355AbrirInformeGerencial()"
      style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        border:0;
        border-radius:13px;
        padding:12px 17px;
        margin:12px 0 4px;
        background:linear-gradient(135deg,#7c3aed,#4f46e5);
        color:#ffffff;
        font-weight:900;
        font-size:14px;
        cursor:pointer;
        box-shadow:0 8px 20px rgba(0,0,0,.24);
      "
    >📄 Informe gerencial PDF / Excel</button>`;
  }

  function datosFilaCuadrilla(item){
    const d = diasItem(item);
    const e = item.detEfectividad || {};
    const r = item.detRecableado || {};
    const vg = item.detVtrGar || {};
    const o = item.detObservaciones || {};
    const estado = estadoCuadrilla(item);

    return {
      sede:norm(item.sede),
      cuadrilla:item.cuadrilla || "",
      plataforma:item.plataforma || "",
      supervisor:supervisorItem(item),
      produccion:red(item.produccion,1),
      ordenes:red(item.detProduccion?.totalOrdenes,0),
      metaMensual:130,
      avanceMensual:red(num(item.produccion)/130*100,1),
      diasCampo:d.campo,
      diasDescanso:d.descanso,
      vacaciones:d.vacaciones,
      campoBolsa:d.bolsa,
      metaDia:red(d.meta,1),
      cumplimientoDia:cumplimientoDiaItem(item),
      brechaDia:brechaDiaItem(item),
      efectividad:red(item.efectividad,1),
      efTotal:red(e.total,0),
      finalizadas:red(e.finalizadas,0),
      canceladas:red(e.canceladas,0),
      reprogramadas:red(e.reprogramadas,0),
      regestion:red(e.regestion,0),
      los:red(r.los,0),
      recableados:red(r.recableados,0),
      recableado:red(item.recableado,1),
      vtrFinalizadas:red(vg.finalizadas,0),
      gar:red(vg.gar,0),
      vtr:red(vg.vtr,0),
      incidencias:red(vg.total,0),
      vtrgar:red(item.vtrgar,1),
      observaciones:red(o.total || item.observaciones,0),
      obsPendientes:red(o.pendientes,0),
      montoObs:red(o.montoTotal || item.montoTotalObs,2),
      montoAfectado:red(o.montoPendiente || item.montoAfectadoObs,2),
      estadosObs:Object.entries(o.estados || {}).map(([k,v])=>`${k}: ${v}`).join(" | "),
      puestoSede:num(item.puestoSede) || "",
      puestoRegion:num(item.puestoRegion) || "",
      puestoPlataforma:num(item.puestoPlataforma) || "",
      puntajeRanking:red(item.puntaje,1),
      estado:estado.estado,
      alertas:estado.alertas.join(", "),
      recomendacion:recomendacionItem(item)
    };
  }

  function pdfTexto(valor){
    return String(valor ?? "")
      .replace(/[^\x20-\x7E\u00C0-\u017F]/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function pdfTitulo(doc,texto,y){
    doc.setFont("helvetica","bold");
    doc.setFontSize(15);
    doc.setTextColor(15,39,71);
    doc.text(pdfTexto(texto),12,y);
    doc.setDrawColor(30,100,170);
    doc.line(12,y+2,285,y+2);
    return y+8;
  }

  function pdfAsegurarEspacio(doc,y,necesario=25){
    if(y+necesario>195){
      doc.addPage("a4","landscape");
      return 15;
    }
    return y;
  }

  function tablaGeneralRows(r){
    return [
      ["Cuadrillas",String(r.cuadrillas),"-","-"],
      ["Producción acumulada",`${r.produccion.toFixed(1)} pts`,`${r.metaMensual} pts`,pct(r.avanceMensual)],
      ["Cumplimiento productivo al día",`${r.produccion.toFixed(1)} pts`,`${r.metaDia.toFixed(1)} pts`,r.cumplimientoDia===null?"N/E":pct(r.cumplimientoDia)],
      ["Días en campo",String(r.diasCampo),`${r.diasCampo*5} pts esperados`,"-"],
      ["Efectividad",pct(r.efectividad),">= 70%",r.efectividad>=70?"CONFORME":"ALERTA"],
      ["Recableado",pct(r.recableado),"<= 42%",r.recableado<=42?"CONFORME":"ALERTA"],
      ["VTR/GAR",pct(r.vtrgar),"<= 3%",r.vtrgar<=3?"CONFORME":"ALERTA"],
      ["Observaciones",`${r.observaciones} registros`,money(r.montoAfectado),r.montoAfectado<=200?"CONFORME":"ALERTA"],
      ["Cumplimiento general",`${r.cumplimientoGeneral}%`,"5 indicadores",`${r.metasCumplidas}/5 metas`]
    ];
  }

  function pdfAutoTable(doc,opciones){
    doc.autoTable(Object.assign({
      margin:{left:12,right:12},
      styles:{
        font:"helvetica",
        fontSize:7,
        cellPadding:2,
        overflow:"linebreak",
        valign:"middle"
      },
      headStyles:{
        fillColor:[15,47,79],
        textColor:255,
        fontStyle:"bold"
      },
      alternateRowStyles:{fillColor:[241,246,251]},
      tableLineColor:[180,195,210],
      tableLineWidth:0.1
    },opciones));
  }

  async function generarPdf(){
    if(!puedeUsarInforme()) throw new Error("No tiene permiso para generar este informe.");

    const incluirObs = !!document.getElementById("mv355IncluirObservaciones")?.checked;
    const incluirProduccion = !!document.getElementById("mv355IncluirProduccion")?.checked;

    mostrarCarga("Preparando datos del informe...");
    mensajeModal("");

    try{
      const resultadoObs = incluirObs
        ? await cargarObservaciones(periodoActual())
        : {lista:[],advertencia:""};

      mostrarCarga("Cargando generador PDF...");
      await asegurarPdf();

      const datos = prepararDatos(resultadoObs.lista);
      const {jsPDF} = window.jspdf;
      const doc = new jsPDF({
        orientation:"landscape",
        unit:"mm",
        format:"a4",
        compress:true
      });

      doc.setProperties({
        title:`Informe Gerencial MI VISUAL - ${datos.periodoNombre}`,
        subject:"Indicadores operativos Zona Norte",
        author:datos.generadoPor,
        creator:"MI VISUAL"
      });

      // Portada
      doc.setFillColor(8,30,58);
      doc.rect(0,0,297,210,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold");
      doc.setFontSize(28);
      doc.text("MI VISUAL",148.5,56,{align:"center"});
      doc.setFontSize(21);
      doc.text("INFORME GERENCIAL DE INDICADORES",148.5,76,{align:"center"});
      doc.setFontSize(18);
      doc.text(pdfTexto(datos.periodoNombre),148.5,94,{align:"center"});
      doc.setFont("helvetica","normal");
      doc.setFontSize(11);
      doc.text(`Zona Norte - Corte ${pdfTexto(fechaVisible(datos.fechaCorte))}`,148.5,112,{align:"center"});
      doc.text(`Generado por: ${pdfTexto(datos.generadoPor)} (${pdfTexto(datos.perfil)})`,148.5,128,{align:"center"});
      doc.text(
        new Intl.DateTimeFormat("es-PE",{
          timeZone:"America/Lima",
          dateStyle:"long",
          timeStyle:"short"
        }).format(datos.generadoEn),
        148.5,
        143,
        {align:"center"}
      );

      // Resumen Zona Norte
      doc.addPage("a4","landscape");
      doc.setTextColor(20,35,55);
      let y = pdfTitulo(doc,`Resumen general Zona Norte - ${datos.periodoNombre}`,16);

      pdfAutoTable(doc,{
        startY:y,
        head:[["Indicador","Resultado","Meta / referencia","Estado"]],
        body:tablaGeneralRows(datos.general),
        columnStyles:{
          0:{cellWidth:78},
          1:{cellWidth:62},
          2:{cellWidth:62},
          3:{cellWidth:50}
        }
      });

      y = doc.lastAutoTable.finalY+8;
      y = pdfTitulo(doc,"Conclusiones ejecutivas",y);

      const conclusionesTexto = conclusiones(datos);
      doc.setFont("helvetica","normal");
      doc.setFontSize(9);
      doc.setTextColor(35,50,65);

      conclusionesTexto.forEach((texto,indice)=>{
        const lineas = doc.splitTextToSize(`${indice+1}. ${pdfTexto(texto)}`,270);
        doc.text(lineas,15,y);
        y += lineas.length*4.5+2;
      });

      if(resultadoObs.advertencia){
        y = pdfAsegurarEspacio(doc,y,16);
        doc.setTextColor(170,70,20);
        doc.setFontSize(8);
        doc.text(doc.splitTextToSize(pdfTexto(resultadoObs.advertencia),270),15,y);
      }

      // Resumen por sede
      doc.addPage("a4","landscape");
      y = pdfTitulo(doc,"Resumen por sede",16);

      const sedeRows = datos.sedes.map(sede=>{
        const r = resumen(datos.grupos[sede] || []);
        return [
          sede,
          r.cuadrillas,
          `${r.produccion.toFixed(1)} / ${r.metaMensual}`,
          pct(r.avanceMensual),
          r.cumplimientoDia===null?"N/E":pct(r.cumplimientoDia),
          pct(r.efectividad),
          pct(r.recableado),
          pct(r.vtrgar),
          r.observaciones,
          money(r.montoAfectado),
          `${r.metasCumplidas}/5`
        ];
      });

      pdfAutoTable(doc,{
        startY:y,
        head:[[
          "Sede","Cuadrillas","Producción / meta","Avance mensual",
          "Cumplimiento al día","Efectividad","Recableado","VTR/GAR",
          "Observaciones","Monto afectado","Metas"
        ]],
        body:sedeRows,
        styles:{fontSize:6.5,cellPadding:1.8},
        columnStyles:{
          0:{cellWidth:25},
          1:{cellWidth:16},
          2:{cellWidth:31},
          3:{cellWidth:24},
          4:{cellWidth:30},
          5:{cellWidth:22},
          6:{cellWidth:22},
          7:{cellWidth:20},
          8:{cellWidth:22},
          9:{cellWidth:26},
          10:{cellWidth:16}
        }
      });

      // Secciones por sede
      for(const sede of datos.sedes){
        const listaSede = (datos.grupos[sede] || []).slice().sort(
          (a,b)=>(num(a.puestoSede)||999)-(num(b.puestoSede)||999)
        );
        const r = resumen(listaSede);

        doc.addPage("a4","landscape");
        y = pdfTitulo(doc,`Sede ${sede}`,16);

        pdfAutoTable(doc,{
          startY:y,
          head:[["Indicador","Resultado","Referencia"]],
          body:[
            ["Cuadrillas",r.cuadrillas,"-"],
            ["Producción",`${r.produccion.toFixed(1)} pts`,`${r.metaMensual} pts mensuales`],
            ["Cumplimiento al día",r.cumplimientoDia===null?"N/E":pct(r.cumplimientoDia),`${r.metaDia.toFixed(1)} pts esperados`],
            ["Efectividad",pct(r.efectividad),">= 70%"],
            ["Recableado",pct(r.recableado),"<= 42%"],
            ["VTR/GAR",pct(r.vtrgar),"<= 3%"],
            ["Observaciones",`${r.observaciones} registros`,money(r.montoAfectado)]
          ],
          columnStyles:{0:{cellWidth:70},1:{cellWidth:70},2:{cellWidth:100}}
        });

        y = doc.lastAutoTable.finalY+7;
        y = pdfTitulo(doc,"Productividad y programación por cuadrilla",y);

        pdfAutoTable(doc,{
          startY:y,
          head:[[
            "Cuadrilla","Plataforma","Supervisor","Puntos","Órdenes",
            "Avance 130","Días campo","Meta al día","Cumpl. al día","Brecha"
          ]],
          body:listaSede.map(item=>{
            const f = datosFilaCuadrilla(item);
            return [
              f.cuadrilla,
              f.plataforma,
              f.supervisor,
              f.produccion.toFixed(1),
              f.ordenes,
              pct(f.avanceMensual),
              f.diasCampo,
              f.metaDia.toFixed(1),
              f.cumplimientoDia===null?"N/E":pct(f.cumplimientoDia),
              `${f.brechaDia>0?"+":""}${f.brechaDia.toFixed(1)}`
            ];
          }),
          styles:{fontSize:5.8,cellPadding:1.5},
          columnStyles:{
            0:{cellWidth:49},
            1:{cellWidth:24},
            2:{cellWidth:35},
            3:{cellWidth:18},
            4:{cellWidth:17},
            5:{cellWidth:23},
            6:{cellWidth:21},
            7:{cellWidth:23},
            8:{cellWidth:27},
            9:{cellWidth:20}
          }
        });

        doc.addPage("a4","landscape");
        y = pdfTitulo(doc,`Sede ${sede} - Calidad, efectividad y observaciones`,16);

        pdfAutoTable(doc,{
          startY:y,
          head:[[
            "Cuadrilla","Efect. total","Finalizadas","Canceladas","Reprogram.",
            "Regestión","Efectividad","LOS","Recableados","% Recab.",
            "GAR","VTR","% VTR/GAR","Obs.","Monto afectado","Estado"
          ]],
          body:listaSede.map(item=>{
            const f = datosFilaCuadrilla(item);
            return [
              f.cuadrilla,
              f.efTotal,
              f.finalizadas,
              f.canceladas,
              f.reprogramadas,
              f.regestion,
              pct(f.efectividad),
              f.los,
              f.recableados,
              pct(f.recableado),
              f.gar,
              f.vtr,
              pct(f.vtrgar),
              f.observaciones,
              money(f.montoAfectado),
              f.estado
            ];
          }),
          styles:{fontSize:5.1,cellPadding:1.25},
          columnStyles:{
            0:{cellWidth:43},
            1:{cellWidth:16},
            2:{cellWidth:16},
            3:{cellWidth:16},
            4:{cellWidth:17},
            5:{cellWidth:15},
            6:{cellWidth:19},
            7:{cellWidth:14},
            8:{cellWidth:17},
            9:{cellWidth:18},
            10:{cellWidth:13},
            11:{cellWidth:13},
            12:{cellWidth:19},
            13:{cellWidth:12},
            14:{cellWidth:24},
            15:{cellWidth:18}
          }
        });

        y = doc.lastAutoTable.finalY+7;
        y = pdfAsegurarEspacio(doc,y,25);
        y = pdfTitulo(doc,"Alertas y recomendaciones por cuadrilla",y);

        pdfAutoTable(doc,{
          startY:y,
          head:[["Cuadrilla","Ranking ZN","Alertas","Recomendación"]],
          body:listaSede.map(item=>{
            const f = datosFilaCuadrilla(item);
            return [
              f.cuadrilla,
              f.puestoRegion || "-",
              f.alertas || "SIN ALERTAS",
              f.recomendacion
            ];
          }),
          styles:{fontSize:6,cellPadding:1.6},
          columnStyles:{
            0:{cellWidth:55},
            1:{cellWidth:23},
            2:{cellWidth:75},
            3:{cellWidth:115}
          }
        });
      }

      // Detalle de producción por tipo
      if(incluirProduccion){
        doc.addPage("a4","landscape");
        y = pdfTitulo(doc,"Anexo - Producción por tipo de trabajo",16);

        const filasTipos = [];
        datos.lista
          .slice()
          .sort((a,b)=>norm(a.sede).localeCompare(norm(b.sede)) || String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true}))
          .forEach(item=>{
            const tipos = item.detProduccion?.tipos || {};
            Object.keys(tipos).sort().forEach(tipo=>{
              const t = tipos[tipo] || {};
              filasTipos.push([
                norm(item.sede),
                item.cuadrilla,
                tipo,
                red(t.cantidad,0),
                red(t.puntaje,1),
                red(t.puntos,1)
              ]);
            });
          });

        pdfAutoTable(doc,{
          startY:y,
          head:[["Sede","Cuadrilla","Tipo de trabajo","Cantidad","Puntaje unitario","Puntos"]],
          body:filasTipos.length?filasTipos:[["-","-","Sin detalle disponible","0","0","0"]],
          styles:{fontSize:6,cellPadding:1.5},
          columnStyles:{
            0:{cellWidth:27},
            1:{cellWidth:54},
            2:{cellWidth:115},
            3:{cellWidth:22},
            4:{cellWidth:30},
            5:{cellWidth:22}
          }
        });
      }

      // Detalle individual de observaciones
      if(incluirObs){
        doc.addPage("a4","landscape");
        y = pdfTitulo(doc,"Anexo - Observaciones del período",16);

        const obsRows = datos.observaciones.map(o=>[
          fechaVisible(o.fechaRegistro),
          norm(o.sede),
          o.cuadrilla || "",
          o.supervisor || "",
          o.fuente || "",
          o.codigo || "",
          o.tipoObservacion || "",
          o.descripcion || "",
          o.estado || "",
          money(o.monto),
          o.plazo || ""
        ]);

        pdfAutoTable(doc,{
          startY:y,
          head:[[
            "Fecha","Sede","Cuadrilla","Supervisor","Fuente","Código",
            "Tipo","Descripción","Estado","Monto","Plazo"
          ]],
          body:obsRows.length?obsRows:[["-","-","-","-","-","-","Sin observaciones detalladas","-","-","S/ 0.00","-"]],
          styles:{fontSize:4.8,cellPadding:1.1},
          columnStyles:{
            0:{cellWidth:18},
            1:{cellWidth:19},
            2:{cellWidth:40},
            3:{cellWidth:27},
            4:{cellWidth:17},
            5:{cellWidth:20},
            6:{cellWidth:25},
            7:{cellWidth:61},
            8:{cellWidth:19},
            9:{cellWidth:20},
            10:{cellWidth:18}
          }
        });
      }

      // Pie de página
      const totalPaginas = doc.getNumberOfPages();
      for(let pagina=1;pagina<=totalPaginas;pagina++){
        doc.setPage(pagina);
        doc.setFont("helvetica","normal");
        doc.setFontSize(7);
        doc.setTextColor(100,110,120);
        doc.text("Visual Connections SAC - Zona Norte",12,204);
        doc.text(`Página ${pagina} de ${totalPaginas}`,285,204,{align:"right"});
      }

      doc.save(nombreArchivo(datos,"pdf"));
      mensajeModal("PDF generado correctamente.","ok");
    }finally{
      ocultarCarga();
    }
  }

  function sheetDesdeAoa(XLSX,nombre,filas,anchos,headerRow){
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = anchos.map(w=>({wch:w}));

    if(Number.isInteger(headerRow) && filas[headerRow]){
      ws["!autofilter"] = {
        ref:XLSX.utils.encode_range({
          s:{r:headerRow,c:0},
          e:{r:filas.length-1,c:filas[headerRow].length-1}
        })
      };
    }

    return {nombre,ws};
  }

  function aplicarFormatosBasicos(ws,filas,headerRow,formatos){
    if(!ws || !Array.isArray(filas) || !formatos) return;

    for(let r=headerRow+1;r<filas.length;r++){
      Object.entries(formatos).forEach(([col,z])=>{
        const direccion = window.XLSX.utils.encode_cell({r,c:Number(col)});
        if(ws[direccion]) ws[direccion].z = z;
      });
    }
  }

  function generarExcelSheets(datos,incluirObs,incluirProduccion){
    const XLSX = window.XLSX;
    const sheets = [];

    const conclusionesLista = conclusiones(datos);
    const resumenGeneral = [
      ["MI VISUAL - INFORME GERENCIAL"],
      ["Periodo",datos.periodoNombre],
      ["Fecha de corte",fechaVisible(datos.fechaCorte)],
      ["Generado por",datos.generadoPor],
      ["Perfil",datos.perfil],
      ["Fecha de generación",new Intl.DateTimeFormat("es-PE",{
        timeZone:"America/Lima",
        dateStyle:"short",
        timeStyle:"short"
      }).format(datos.generadoEn)],
      [],
      ["INDICADOR","RESULTADO","META / REFERENCIA","ESTADO"],
      ...tablaGeneralRows(datos.general),
      [],
      ["CONCLUSIONES"],
      ...conclusionesLista.map((x,i)=>[`${i+1}. ${x}`])
    ];

    sheets.push(sheetDesdeAoa(
      XLSX,
      "RESUMEN_ZONA_NORTE",
      resumenGeneral,
      [34,28,28,22],
      7
    ));

    const sedeRows = [[
      "SEDE","CUADRILLAS","PRODUCCIÓN","META MENSUAL","AVANCE MENSUAL %",
      "META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA","DÍAS EN CAMPO",
      "EFECTIVIDAD %","RECABLEADO %","VTR/GAR %","OBSERVACIONES",
      "MONTO TOTAL OBS","MONTO AFECTADO","METAS CUMPLIDAS"
    ]];

    datos.sedes.forEach(sede=>{
      const r = resumen(datos.grupos[sede] || []);
      sedeRows.push([
        sede,r.cuadrillas,r.produccion,r.metaMensual,r.avanceMensual,
        r.metaDia,r.cumplimientoDia,r.brechaDia,r.diasCampo,
        r.efectividad,r.recableado,r.vtrgar,r.observaciones,
        r.montoObs,r.montoAfectado,`${r.metasCumplidas}/5`
      ]);
    });

    const sedeSheet = sheetDesdeAoa(
      XLSX,
      "RESUMEN_POR_SEDE",
      sedeRows,
      [16,12,14,14,16,14,19,12,14,15,15,13,15,17,17,16],
      0
    );
    aplicarFormatosBasicos(sedeSheet.ws,sedeRows,0,{
      2:'0.0',
      3:'0.0',
      4:'0.0"%"',
      5:'0.0',
      6:'0.0"%"',
      7:'0.0',
      9:'0.0"%"',
      10:'0.0"%"',
      11:'0.0"%"',
      13:'"S/ "0.00',
      14:'"S/ "0.00'
    });
    sheets.push(sedeSheet);

    const detalleRows = [[
      "SEDE","CUADRILLA","PLATAFORMA","SUPERVISOR",
      "PRODUCCIÓN PTS","ÓRDENES","META MENSUAL","AVANCE MENSUAL %",
      "DÍAS EN CAMPO","DÍAS DESCANSO","VACACIONES","CAMPO BOLSA",
      "META AL DÍA","CUMPLIMIENTO AL DÍA %","BRECHA PTS",
      "EFECTIVIDAD TOTAL","FINALIZADAS","CANCELADAS","REPROGRAMADAS","REGESTIÓN","EFECTIVIDAD %",
      "LOS","RECABLEADOS","RECABLEADO %",
      "FINALIZADAS VTR","GAR","VTR","INCIDENCIAS","VTR/GAR %",
      "OBSERVACIONES","OBS. PENDIENTES","MONTO TOTAL OBS","MONTO AFECTADO","ESTADOS OBS",
      "PUESTO SEDE","PUESTO REGIÓN","PUESTO PLATAFORMA","PUNTAJE RANKING",
      "ESTADO GENERAL","ALERTAS","RECOMENDACIÓN"
    ]];

    datos.lista
      .slice()
      .sort((a,b)=>norm(a.sede).localeCompare(norm(b.sede)) || String(a.cuadrilla).localeCompare(String(b.cuadrilla),undefined,{numeric:true}))
      .forEach(item=>{
        const f = datosFilaCuadrilla(item);
        detalleRows.push([
          f.sede,f.cuadrilla,f.plataforma,f.supervisor,
          f.produccion,f.ordenes,f.metaMensual,f.avanceMensual,
          f.diasCampo,f.diasDescanso,f.vacaciones,f.campoBolsa,
          f.metaDia,f.cumplimientoDia,f.brechaDia,
          f.efTotal,f.finalizadas,f.canceladas,f.reprogramadas,f.regestion,f.efectividad,
          f.los,f.recableados,f.recableado,
          f.vtrFinalizadas,f.gar,f.vtr,f.incidencias,f.vtrgar,
          f.observaciones,f.obsPendientes,f.montoObs,f.montoAfectado,f.estadosObs,
          f.puestoSede,f.puestoRegion,f.puestoPlataforma,f.puntajeRanking,
          f.estado,f.alertas,f.recomendacion
        ]);
      });

    const detalleSheet = sheetDesdeAoa(
      XLSX,
      "DETALLE_CUADRILLAS",
      detalleRows,
      [
        14,40,18,25,14,10,13,16,13,13,11,12,12,18,12,
        15,12,12,14,11,14,10,12,14,15,9,9,12,13,
        13,15,16,16,30,12,13,16,14,14,28,45
      ],
      0
    );
    aplicarFormatosBasicos(detalleSheet.ws,detalleRows,0,{
      4:'0.0',
      6:'0.0',
      7:'0.0"%"',
      12:'0.0',
      13:'0.0"%"',
      14:'0.0',
      20:'0.0"%"',
      23:'0.0"%"',
      28:'0.0"%"',
      31:'"S/ "0.00',
      32:'"S/ "0.00',
      37:'0.0'
    });
    sheets.push(detalleSheet);

    const rankingRows = [[
      "PUESTO ZONA NORTE","PUESTO SEDE","PUESTO PLATAFORMA",
      "SEDE","CUADRILLA","PLATAFORMA","PUNTAJE RANKING",
      "PRODUCCIÓN","EFECTIVIDAD %","RECABLEADO %","VTR/GAR %",
      "MONTO AFECTADO","ESTADO"
    ]];

    datos.lista
      .slice()
      .sort((a,b)=>(num(a.puestoRegion)||999)-(num(b.puestoRegion)||999))
      .forEach(item=>{
        const f = datosFilaCuadrilla(item);
        rankingRows.push([
          f.puestoRegion,f.puestoSede,f.puestoPlataforma,
          f.sede,f.cuadrilla,f.plataforma,f.puntajeRanking,
          f.produccion,f.efectividad,f.recableado,f.vtrgar,
          f.montoAfectado,f.estado
        ]);
      });

    sheets.push(sheetDesdeAoa(
      XLSX,
      "RANKING",
      rankingRows,
      [17,13,18,14,40,18,15,13,14,14,12,16,14],
      0
    ));

    const alertasRows = [[
      "SEDE","CUADRILLA","ESTADO","ALERTAS","RECOMENDACIÓN"
    ]];

    datos.lista
      .filter(item=>estadoCuadrilla(item).estado!=="CONFORME")
      .sort((a,b)=>{
        const orden = {CRITICO:0,ALERTA:1,CONFORME:2};
        return orden[estadoCuadrilla(a).estado]-orden[estadoCuadrilla(b).estado];
      })
      .forEach(item=>{
        const f = datosFilaCuadrilla(item);
        alertasRows.push([
          f.sede,f.cuadrilla,f.estado,f.alertas,f.recomendacion
        ]);
      });

    sheets.push(sheetDesdeAoa(
      XLSX,
      "ALERTAS",
      alertasRows,
      [15,40,14,38,60],
      0
    ));

    if(incluirProduccion){
      const prodRows = [[
        "SEDE","CUADRILLA","PLATAFORMA","GRUPO","TIPO DE TRABAJO",
        "CANTIDAD","PUNTAJE UNITARIO","PUNTOS"
      ]];

      datos.lista.forEach(item=>{
        const tipos = item.detProduccion?.tipos || {};
        Object.keys(tipos).sort().forEach(tipo=>{
          const t = tipos[tipo] || {};
          let grupo = "";
          const grupos = item.detProduccion?.grupos || {};
          for(const [nombreGrupo,valorGrupo] of Object.entries(grupos)){
            if(num(valorGrupo.puntos)>0 && !grupo) grupo = nombreGrupo;
          }
          prodRows.push([
            norm(item.sede),item.cuadrilla,item.plataforma||"",
            grupo,tipo,red(t.cantidad,0),red(t.puntaje,1),red(t.puntos,1)
          ]);
        });
      });

      sheets.push(sheetDesdeAoa(
        XLSX,
        "PRODUCCION_DETALLE",
        prodRows,
        [14,40,18,20,55,12,18,12],
        0
      ));
    }

    if(incluirObs){
      const obsRows = [[
        "FECHA","PERIODO","SEDE","PLATAFORMA","SUPERVISOR","CUADRILLA",
        "FUENTE","CÓDIGO","TIPO DE OBSERVACIÓN","DESCRIPCIÓN","ESTADO",
        "MONTO","FECHA DESCARGO","DESCARGO TÉCNICO","FECHA REVISIÓN","PLAZO"
      ]];

      datos.observaciones.forEach(o=>{
        obsRows.push([
          fechaVisible(o.fechaRegistro),
          o.periodo || datos.periodo,
          norm(o.sede),
          o.plataforma || "",
          o.supervisor || "",
          o.cuadrilla || "",
          o.fuente || "",
          o.codigo || "",
          o.tipoObservacion || "",
          o.descripcion || "",
          o.estado || "",
          num(o.monto),
          fechaVisible(o.fechaDescargo),
          o.descargoTecnico || "",
          fechaVisible(o.fechaRevision),
          o.plazo || ""
        ]);
      });

      const obsSheet = sheetDesdeAoa(
        XLSX,
        "OBSERVACIONES",
        obsRows,
        [14,12,14,17,25,40,14,16,28,60,16,14,16,60,16,18],
        0
      );
      aplicarFormatosBasicos(obsSheet.ws,obsRows,0,{11:'"S/ "0.00'});
      sheets.push(obsSheet);
    }

    const metodologia = [
      ["METODOLOGÍA Y METAS"],
      ["Indicador","Regla"],
      ["Producción mensual","130 puntos por cuadrilla."],
      ["Cumplimiento productivo al día","Puntos acumulados / (días EN CAMPO × 5 puntos)."],
      ["Descanso, vacaciones y Campo Bolsa","No generan meta productiva diaria."],
      ["Efectividad","Meta igual o mayor a 70%."],
      ["Recableado","Meta igual o menor a 42%."],
      ["VTR/GAR","Meta igual o menor a 3%."],
      ["Observaciones","Referencia de monto afectado igual o menor a S/ 200."],
      ["Consolidación Supervisor/Jefatura","Se suman puntos y metas; no se promedian los porcentajes individuales del cumplimiento diario."],
      ["Fecha de corte",fechaVisible(datos.fechaCorte)],
      ["Fuente","Dashboard MI VISUAL del período seleccionado."]
    ];

    sheets.push(sheetDesdeAoa(
      XLSX,
      "METODOLOGIA",
      metodologia,
      [34,90],
      1
    ));

    return sheets;
  }

  async function generarExcel(){
    if(!puedeUsarInforme()) throw new Error("No tiene permiso para generar este informe.");

    const incluirObs = !!document.getElementById("mv355IncluirObservaciones")?.checked;
    const incluirProduccion = !!document.getElementById("mv355IncluirProduccion")?.checked;

    mostrarCarga("Preparando datos del informe...");
    mensajeModal("");

    try{
      const resultadoObs = incluirObs
        ? await cargarObservaciones(periodoActual())
        : {lista:[],advertencia:""};

      mostrarCarga("Cargando generador Excel...");
      await asegurarExcel();

      const datos = prepararDatos(resultadoObs.lista);
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title:`Informe Gerencial MI VISUAL - ${datos.periodoNombre}`,
        Subject:"Indicadores operativos Zona Norte",
        Author:datos.generadoPor,
        Company:"Visual Connections SAC",
        CreatedDate:new Date()
      };

      const sheets = generarExcelSheets(datos,incluirObs,incluirProduccion);
      sheets.forEach(item=>XLSX.utils.book_append_sheet(wb,item.ws,item.nombre));

      XLSX.writeFile(wb,nombreArchivo(datos,"xlsx"),{
        compression:true,
        bookType:"xlsx"
      });

      if(resultadoObs.advertencia){
        mensajeModal(
          `Excel generado. ${resultadoObs.advertencia}`,
          "ok"
        );
      }else{
        mensajeModal("Excel generado correctamente.","ok");
      }
    }finally{
      ocultarCarga();
    }
  }

  async function ejecutarSeguro(funcion){
    try{
      await funcion();
    }catch(error){
      console.error("V355 Informe Gerencial",error);
      ocultarCarga();
      mensajeModal(error.message || "No se pudo generar el informe.","error");
    }
  }

  window.mv355RenderBotonInformeGerencial = botonInforme;
  window.mv355AbrirInformeGerencial = abrirModal;
  window.mv355CerrarInformeGerencial = cerrarModal;
  window.mv355GenerarInformePDF = ()=>ejecutarSeguro(generarPdf);
  window.mv355GenerarInformeExcel = ()=>ejecutarSeguro(generarExcel);
  window.MV355_INFORME_GERENCIAL_OK = true;

  console.log("MI VISUAL V355: Informe Gerencial PDF/Excel habilitado.");
})();