/* ============================================================
   MI VISUAL V459 - Ranking: Observaciones 60/40 + WIN/VISUAL separados

   - Se activa solo cuando RANKING trae las columnas V459 agregadas al final.
   - Si backend V459 aún no está desplegado, usa exactamente la vista anterior.
   - No recalcula el ranking en el navegador; solo presenta el cálculo oficial
     generado por Apps Script.
============================================================ */
(function(){
  "use strict";
  if(window.MV459_RANKING_OBS_OK) return;
  window.MV459_RANKING_OBS_OK=true;

  function n(v){
    const x=Number(v);
    return Number.isFinite(x)?x:0;
  }

  function instalar(){
    if(window.MV459_RANKING_OBS_INSTALADO) return true;
    if(typeof window.filaRanking!=="function" ||
       typeof window.tarjetaCuadrillaRanking!=="function" ||
       typeof window.indicadorMiniRanking!=="function") return false;

    const filaBase=window.filaRanking;
    const tarjetaBase=window.tarjetaCuadrillaRanking;

    window.filaRanking=function(datos){
      const r=filaBase(datos);
      const tieneV459=Array.isArray(datos) && datos.length>=36 && String(datos[35]||"").includes("V459");
      r.mv459=tieneV459;
      if(tieneV459){
        r.obsWinV459=n(datos[27]);
        r.montoPenalizadoWinV459=n(datos[28]);
        r.obsVisualV459=n(datos[29]);
        r.montoPenalizadoVisualV459=n(datos[30]);
        r.scoreCantidadObsV459=n(datos[31]);
        r.scoreMontoObsV459=n(datos[32]);
        r.scoreObservacionesV459=n(datos[33]);
        r.aporteObservacionesV459=n(datos[34]);
        r.reglaObservacionesV459=datos[35]||"";
        r.obsTotalV459=r.obsWinV459+r.obsVisualV459;
        r.montoPenalizadoTotalV459=r.montoPenalizadoWinV459+r.montoPenalizadoVisualV459;
      }
      return r;
    };

    window.tarjetaCuadrillaRanking=function(r,tipoPuesto){
      if(!r || !r.mv459) return tarjetaBase(r,tipoPuesto);

      let puesto=r.puestoRegion;
      let medalla=typeof medallaRanking==="function" ? medallaRanking(r.puestoRegion) : "";
      if(tipoPuesto==="sede"){
        puesto=r.puestoSede;
        medalla=typeof medallaRanking==="function" ? medallaRanking(r.puestoSede) : "";
      }
      if(tipoPuesto==="plataforma"){
        puesto=r.puestoPlataforma;
        medalla=typeof medallaRanking==="function" ? medallaRanking(r.puestoPlataforma) : "";
      }

      const soles=typeof formatoSolesRanking==="function"
        ? formatoSolesRanking
        : v=>`S/ ${n(v).toFixed(2)}`;
      const porcentaje=typeof formatoPorcentajeRanking==="function"
        ? formatoPorcentajeRanking
        : v=>`${n(v).toFixed(2)}%`;
      const semaforo=typeof colorSemaforoRanking==="function"
        ? colorSemaforoRanking
        : ()=>"";

      return `
        <div style="background:#1f2d48;border-radius:18px;padding:15px;margin:12px 0;color:white;box-shadow:0 6px 16px rgba(0,0,0,.18);">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="background:#16a34a;color:white;border-radius:14px;min-width:54px;height:54px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;">
              ${medalla || ("#"+puesto)}
            </div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:800;line-height:1.25;">${r.cuadrilla}</div>
              <div style="font-size:12px;opacity:.78;margin-top:4px;">${r.sede||"-"} · ${r.plataforma||"-"}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;">
            ${indicadorMiniRanking("Producción",r.produccion,"")}
            ${indicadorMiniRanking("Efectividad",porcentaje(r.efectividad),semaforo("efectividad",r.efectividad))}
            ${indicadorMiniRanking("% Recableado",porcentaje(r.recableado),semaforo("recableado",r.recableado))}
            ${indicadorMiniRanking("% VTR/GAR",porcentaje(r.vtrgar),semaforo("vtrgar",r.vtrgar))}
            ${indicadorMiniRanking("Observaciones",r.obsTotalV459,`60% cantidad · Score ${r.scoreCantidadObsV459.toFixed(1)}%`)}
            ${indicadorMiniRanking("Monto penalizado",soles(r.montoPenalizadoTotalV459),`40% monto · Score ${r.scoreMontoObsV459.toFixed(1)}%`)}
            ${indicadorMiniRanking("WIN",`${r.obsWinV459} obs`,`Penalizado ${soles(r.montoPenalizadoWinV459)}`)}
            ${indicadorMiniRanking("VISUAL",`${r.obsVisualV459} obs`,`Penalizado ${soles(r.montoPenalizadoVisualV459)}`)}
          </div>

          <div style="margin-top:10px;padding:9px 11px;border-radius:12px;background:rgba(15,23,42,.65);font-size:11px;line-height:1.4;color:#dbeafe;">
            🚨 Puntaje Observaciones: <b>${r.scoreObservacionesV459.toFixed(1)}%</b> ·
            aporte al ranking: <b>${r.aporteObservacionesV459.toFixed(2)} pts</b>.
            Subsanado mantiene la incidencia en cantidad; Anulado no cuenta.
          </div>
        </div>
      `;
    };

    window.MV459_RANKING_OBS_INSTALADO=true;
    return true;
  }

  const reloj=setInterval(()=>{
    if(instalar()) clearInterval(reloj);
  },400);
  instalar();
})();

/* ============================================================
   MI VISUAL V532 / F4AE - ESTABILIDAD RANKING + SLA EN INFORME
   - Conserva la estabilización actual de porcentajes y SLA del Ranking.
   - Añade SLA exclusivamente al Excel descargado desde Ranking.
   - No recalcula ni modifica Ranking, Dashboard, Apps Script ni indicadores.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4AE_RANKING_ESTABILIDAD_OK) return;
  window.MV517D_F4AE_RANKING_ESTABILIDAD_OK=true;

  function numeroFlexible(valor){
    if(typeof valor==="number") return Number.isFinite(valor)?valor:0;
    const s=String(valor??"")
      .replace(/S\//gi,"")
      .replace(/%/g,"")
      .replace(/\s+/g,"")
      .replace(/,/g,".");
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  }

  function porcentajeFraccion(valor){
    const texto=String(valor??"").trim();
    const n=numeroFlexible(valor);
    if(texto.includes("%")) return n/100;
    return Math.abs(n)>1 ? n/100 : n;
  }

  function porcentajeNumero(valor){
    const n=numeroFlexible(valor);
    return Math.abs(n)<=1 ? n*100 : n;
  }

  function normalizarClave(valor){
    return String(valor||"")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function instalarFilaF4AE(){
    if(window.MV517D_F4AE_FILA_OK) return true;
    if(!window.MV459_RANKING_OBS_INSTALADO || typeof window.filaRanking!=="function") return false;

    const baseFila=window.filaRanking;
    window.filaRanking=function(datos){
      const r=baseFila(datos);
      if(!Array.isArray(datos)) return r;

      // Columnas porcentuales oficiales del Ranking se normalizan a fraccion.
      // Así 0.96% => 0.0096 y se visualiza como 0.96%, no como 96%.
      r.efectividad=porcentajeFraccion(datos[7]);
      r.recableado=porcentajeFraccion(datos[8]);
      r.vtrgar=porcentajeFraccion(datos[9]);

      // Columnas U:Z del Ranking: SLA Bruto, Ajustado, Evaluables, Fuera,
      // Excepciones aprobadas y Aporte SLA.
      if(datos.length>=26){
        r.slaBruto=numeroFlexible(datos[20]);
        r.slaAjustado=numeroFlexible(datos[21]);
        r.slaEvaluables=numeroFlexible(datos[22]);
        r.slaFuera=numeroFlexible(datos[23]);
        r.slaExcepcionesAprobadas=numeroFlexible(datos[24]);
        r.aporteSla=numeroFlexible(datos[25]);
        r.detSla={
          slaBruto:r.slaBruto,
          slaAjustado:r.slaAjustado,
          evaluables:r.slaEvaluables,
          fueraBruto:r.slaFuera,
          fueraAjustado:r.slaFuera,
          excepcionesAprobadas:r.slaExcepcionesAprobadas,
          excepcionesPendientes:0
        };
      }
      return r;
    };

    window.MV517D_F4AE_FILA_OK=true;
    return true;
  }

  function instalarRankingFrescoF4AE(){
    if(window.MV517D_F4AE_FRESCO_OK) return true;
    if(!window.MV358_RANKING_DETALLADO_OK || typeof window.mostrarRanking!=="function") return false;

    const baseMostrar=window.mostrarRanking;
    window.mostrarRanking=async function(){
      // V415 reutilizaba datos del Dashboard aunque fueran de un corte anterior.
      // Invalidamos solo esa reutilizacion; mv4ObtenerRanking vuelve a fijar
      // inmediatamente el periodo correcto con el CSV oficial y cache-busting.
      try{
        if(typeof MV276_DASH_PERIODO!=="undefined"){
          MV276_DASH_PERIODO="__F4AE_RANKING_FRESCO__";
        }
      }catch(_){}
      return baseMostrar.apply(window,arguments);
    };

    window.MV517D_F4AE_FRESCO_OK=true;
    return true;
  }

  function datosSla(item){
    const r=item||{};
    const d=r.detSla||{};
    const evaluables=numeroFlexible(d.evaluables ?? r.slaEvaluables);
    const bruto=porcentajeNumero(r.slaBruto ?? d.slaBruto);
    const ajustado=porcentajeNumero(r.slaAjustado ?? r.sla ?? d.slaAjustado);
    const fuera=numeroFlexible(d.fueraAjustado ?? d.fueraBruto ?? r.slaFuera);
    const dentro=(d.cumplenAjustado!==undefined && d.cumplenAjustado!==null)
      ? numeroFlexible(d.cumplenAjustado)
      : Math.max(0,evaluables-fuera);
    const cumplenBruto=(d.cumplenBruto!==undefined && d.cumplenBruto!==null)
      ? numeroFlexible(d.cumplenBruto)
      : Math.max(0,Math.round(evaluables*bruto/100));
    const aprobadas=numeroFlexible(d.excepcionesAprobadas ?? r.slaExcepcionesAprobadas);
    const pendientes=numeroFlexible(d.excepcionesPendientes);
    const aporte=numeroFlexible(r.aporteSla ?? d.aporteSla);
    return {bruto,ajustado,evaluables,dentro,cumplenBruto,fuera,aprobadas,pendientes,aporte};
  }

  function resumenSlaInforme(lista){
    const total={evaluables:0,dentro:0,cumplenBruto:0,fuera:0,aprobadas:0,pendientes:0};
    (lista||[]).forEach(item=>{
      const s=datosSla(item);
      total.evaluables+=s.evaluables;
      total.dentro+=s.dentro;
      total.cumplenBruto+=s.cumplenBruto;
      total.fuera+=s.fuera;
      total.aprobadas+=s.aprobadas;
      total.pendientes+=s.pendientes;
    });
    total.ajustado=total.evaluables ? total.dentro/total.evaluables*100 : 0;
    total.bruto=total.evaluables ? total.cumplenBruto/total.evaluables*100 : 0;
    return total;
  }

  function alcanceInforme(){
    const alcance=document.querySelector('input[name="mv358Alcance"]:checked')?.value||"zona";
    const sede=window.MV239_RANKING_JEFATURA_SEDE||"TODAS";
    let lista=(window.MV239_RANKING_JEFATURA_LISTA||[]).slice();
    if(alcance==="filtro" && sede!=="TODAS"){
      lista=lista.filter(x=>normalizarClave(x.sede)===normalizarClave(sede));
    }
    return lista;
  }

  function ampliarAutofiltro(ws){
    if(!ws || !ws["!ref"]) return;
    const rango=window.XLSX.utils.decode_range(ws["!ref"]);
    ws["!autofilter"]={ref:window.XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rango.e.r,c:rango.e.c}})};
  }

  function agregarColumnasSla(ws,lista){
    if(!ws) return;
    const XLSX=window.XLSX;
    const filas=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
    if(!filas.length) return;
    const inicio=filas[0].length;
    const headers=[
      "SLA BRUTO %","SLA AJUSTADO %","SLA EVALUABLES","DENTRO SLA",
      "FUERA SLA","EXCEPCIONES APROBADAS","EXCEPCIONES PENDIENTES","APORTE SLA"
    ];
    XLSX.utils.sheet_add_aoa(ws,[headers],{origin:{r:0,c:inicio}});

    const mapa=new Map();
    (lista||[]).forEach(item=>{
      const clave=normalizarClave(item.sede)+"|"+normalizarClave(item.cuadrilla);
      mapa.set(clave,item);
    });

    for(let i=1;i<filas.length;i++){
      const clave=normalizarClave(filas[i][3])+"|"+normalizarClave(filas[i][4]);
      const item=mapa.get(clave);
      const s=datosSla(item);
      XLSX.utils.sheet_add_aoa(ws,[item ? [
        Number(s.bruto.toFixed(2)),Number(s.ajustado.toFixed(2)),s.evaluables,s.dentro,
        s.fuera,s.aprobadas,s.pendientes,Number(s.aporte.toFixed(2))
      ] : ["","","","","","","",""]],{origin:{r:i,c:inicio}});
    }
    ws["!cols"]=(ws["!cols"]||[]).concat([
      {wch:14},{wch:16},{wch:15},{wch:13},{wch:12},{wch:21},{wch:22},{wch:12}
    ]);
    ampliarAutofiltro(ws);
  }

  function agregarResumenSla(ws,lista){
    if(!ws) return;
    const XLSX=window.XLSX;
    const filas=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
    const inicio=filas.length+1;
    const s=resumenSlaInforme(lista);
    XLSX.utils.sheet_add_aoa(ws,[
      [],
      ["TIEMPO DE GESTIÓN - SLA","RESULTADO"],
      ["SLA ajustado %",Number(s.ajustado.toFixed(2))],
      ["SLA bruto %",Number(s.bruto.toFixed(2))],
      ["Evaluables",s.evaluables],
      ["Dentro SLA",s.dentro],
      ["Fuera SLA",s.fuera],
      ["Excepciones aprobadas",s.aprobadas],
      ["Excepciones pendientes",s.pendientes]
    ],{origin:{r:inicio,c:0}});
  }

  function agregarSlaPorSede(ws,lista){
    if(!ws) return;
    const XLSX=window.XLSX;
    const filas=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
    if(!filas.length) return;
    const inicio=filas[0].length;
    XLSX.utils.sheet_add_aoa(ws,[
      ["SLA AJUSTADO %","SLA BRUTO %","SLA EVALUABLES","DENTRO SLA","FUERA SLA","EXC. APROBADAS"]
    ],{origin:{r:0,c:inicio}});
    for(let i=1;i<filas.length;i++){
      const sede=normalizarClave(filas[i][0]);
      const grupo=(lista||[]).filter(x=>normalizarClave(x.sede)===sede);
      const s=resumenSlaInforme(grupo);
      XLSX.utils.sheet_add_aoa(ws,[grupo.length ? [
        Number(s.ajustado.toFixed(2)),Number(s.bruto.toFixed(2)),s.evaluables,s.dentro,s.fuera,s.aprobadas
      ] : ["","","","","",""]],{origin:{r:i,c:inicio}});
    }
    ws["!cols"]=(ws["!cols"]||[]).concat([
      {wch:16},{wch:14},{wch:15},{wch:13},{wch:12},{wch:16}
    ]);
    ampliarAutofiltro(ws);
  }

  function agregarHojaSla(wb,lista){
    const XLSX=window.XLSX;
    if(wb.Sheets.SLA_POR_CUADRILLA) return;
    const filas=[[
      "PUESTO ZONA NORTE","SEDE","CUADRILLA","PLATAFORMA",
      "SLA BRUTO %","SLA AJUSTADO %","EVALUABLES","DENTRO SLA","FUERA SLA",
      "EXCEPCIONES APROBADAS","EXCEPCIONES PENDIENTES","APORTE SLA"
    ]];
    (lista||[]).slice().sort((a,b)=>numeroFlexible(a.puestoRegion)-numeroFlexible(b.puestoRegion)).forEach(r=>{
      const s=datosSla(r);
      filas.push([
        r.puestoRegion||"",r.sede||"",r.cuadrilla||"",r.plataforma||"",
        Number(s.bruto.toFixed(2)),Number(s.ajustado.toFixed(2)),s.evaluables,s.dentro,s.fuera,
        s.aprobadas,s.pendientes,Number(s.aporte.toFixed(2))
      ]);
    });
    const ws=XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"]=[
      {wch:18},{wch:16},{wch:44},{wch:18},{wch:14},{wch:16},{wch:12},{wch:13},{wch:12},{wch:21},{wch:22},{wch:12}
    ];
    if(filas.length>1) ws["!autofilter"]={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:filas.length-1,c:11}})};
    XLSX.utils.book_append_sheet(wb,ws,"SLA_POR_CUADRILLA");
  }

  function agregarMetodologiaSla(ws){
    if(!ws) return;
    const XLSX=window.XLSX;
    const filas=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
    const yaExiste=filas.some(f=>normalizarClave(f[0])==="TIEMPO DE GESTION - SLA");
    if(yaExiste) return;
    XLSX.utils.sheet_add_aoa(ws,[[
      "Tiempo de Gestión - SLA",
      "Se reportan SLA bruto y ajustado, códigos evaluables, dentro/fuera de SLA y excepciones aprobadas. Meta: ≥ 90% en SLA ajustado."
    ]],{origin:{r:filas.length,c:0}});
  }

  function enriquecerLibroConSla(wb){
    if(!wb || !window.XLSX?.utils) return wb;
    const lista=alcanceInforme();
    agregarResumenSla(wb.Sheets.RESUMEN_EJECUTIVO,lista);
    agregarSlaPorSede(wb.Sheets.RESUMEN_POR_SEDE,lista);
    agregarColumnasSla(wb.Sheets.RANKING_GENERAL,lista);
    Object.keys(wb.Sheets).filter(n=>n.startsWith("SEDE_")).forEach(nombre=>{
      agregarColumnasSla(wb.Sheets[nombre],lista);
    });
    agregarHojaSla(wb,lista);
    agregarMetodologiaSla(wb.Sheets.METODOLOGIA);
    return wb;
  }

  async function asegurarXlsxInforme(){
    if(window.XLSX?.utils) return true;
    const urls=[
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
      "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
    ];
    for(const url of urls){
      try{
        await new Promise((resolve,reject)=>{
          const existente=Array.from(document.scripts).find(s=>s.src===url);
          if(existente){
            if(window.XLSX?.utils) return resolve();
            existente.addEventListener("load",resolve,{once:true});
            existente.addEventListener("error",reject,{once:true});
            return;
          }
          const script=document.createElement("script");
          script.src=url;
          script.async=true;
          script.crossOrigin="anonymous";
          script.onload=resolve;
          script.onerror=reject;
          document.head.appendChild(script);
        });
        if(window.XLSX?.utils) return true;
      }catch(_){ }
    }
    return false;
  }

  function instalarInformeSlaF4AE(){
    if(window.MV532_RANKING_INFORME_SLA_OK) return true;
    if(!window.MV358_RANKING_DETALLADO_OK || typeof window.mv358GenerarInformeRanking!=="function") return false;

    const baseGenerar=window.mv358GenerarInformeRanking;
    window.mv358GenerarInformeRanking=async function(){
      const listo=await asegurarXlsxInforme();
      if(!listo || !window.XLSX?.writeFile){
        return baseGenerar.apply(window,arguments);
      }

      const XLSX=window.XLSX;
      const writeFileBase=XLSX.writeFile;
      let interceptado=false;
      XLSX.writeFile=function(wb,nombre,opciones){
        try{
          enriquecerLibroConSla(wb);
        }catch(error){
          console.warn("V532 SLA informe",error);
        }finally{
          XLSX.writeFile=writeFileBase;
        }
        interceptado=true;
        return writeFileBase.call(XLSX,wb,nombre,opciones);
      };

      try{
        return await baseGenerar.apply(window,arguments);
      }finally{
        if(!interceptado && XLSX.writeFile!==writeFileBase){
          XLSX.writeFile=writeFileBase;
        }
      }
    };

    window.MV532_RANKING_INFORME_SLA_OK=true;
    return true;
  }

  const reloj=setInterval(()=>{
    const filaOk=instalarFilaF4AE();
    const frescoOk=instalarRankingFrescoF4AE();
    const informeOk=instalarInformeSlaF4AE();
    if(filaOk && frescoOk && informeOk) clearInterval(reloj);
  },150);

  instalarFilaF4AE();
  instalarRankingFrescoF4AE();
  instalarInformeSlaF4AE();
  console.log("MI VISUAL V532/F4AE: Ranking estable y SLA incorporado solo al informe Excel.");
})();
