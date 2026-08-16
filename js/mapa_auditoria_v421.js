/* ============================================================
   MI VISUAL V422 - Auditoría integrada + alertas operativas
   CAPA INCREMENTAL:
   - No modifica Mapa V419 ni optimización V395.
   - Añade "Mostrar órdenes auditadas".
   - Añade botón "Auditar orden" en el popup.
   - Ficha unificada: cliente, servicio, acta, ubicación, historial y materiales.
   - Registro reutiliza Actividad en Campo / AUDITORIA EN FRIO.
============================================================ */
(function(){
  "use strict";
  if(window.MV421_MAPA_AUDITORIA_OK) return;

  const API = window.MI_VISUAL_API_URL || "";
  const mostrarMapaBase = window.mostrarMapaOperativo;
  const popupBase = window.moPopup;
  const renderMarcadoresBase = window.moRenderMarcadores;

  let capaAuditorias = null;
  let indiceAuditorias = null;
  let indicePeriodo = "";
  let cargandoIndice = null;
  let estadoRetorno = null;
  const fichaCache = Object.create(null);
  const resumenIndicadoresCacheV422 = Object.create(null);
  const resumenIndicadoresPromesaV422 = Object.create(null);
  let integracionActividadLista = false;
  let mostrarActividadOriginal = null;
  let construirAuditoriaOriginal = null;

  function norm(v){return String(v ?? "").trim();}
  function normId(v){return norm(v).replace(/\.0+$/,"").replace(/[^\dA-Za-z_-]/g,"").toUpperCase();}
  function normTxt(v){return norm(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");}
  function esc(v){return norm(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function perfil(){return normTxt(localStorage.getItem("perfil")||"");}
  function usuario(){return localStorage.getItem("usuario")||"";}
  function puedeRegistrar(){return perfil()==="SUPERVISOR";}
  function periodoActualMapa(){return norm(document.getElementById("moFiltroPeriodo")?.value);}

  async function apiGet(accion, params){
    if(!API) throw new Error("No está configurada la API de MI VISUAL.");
    const url = new URL(API);
    const payload = Object.assign({accion,usuario:usuario()},params||{});
    Object.keys(payload).forEach(k=>{
      const v=payload[k];
      if(v!==undefined&&v!==null&&String(v)!=="") url.searchParams.set(k,String(v));
    });
    const controller=typeof AbortController==="function"?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),20000):null;
    try{
      const r=await fetch(url.toString(),{method:"GET",cache:"no-store",signal:controller?controller.signal:undefined});
      const t=await r.text();
      let d;
      try{d=JSON.parse(t);}catch(_){throw new Error("La API devolvió una respuesta inválida.");}
      if(!d.ok)throw new Error(d.error||"No se pudo completar la consulta.");
      return d;
    }catch(e){
      if(e&&e.name==="AbortError") throw new Error("La consulta tardó demasiado. Intente nuevamente.");
      throw e;
    }finally{
      if(timer)clearTimeout(timer);
    }
  }

  function instalarEstilos(){
    if(document.getElementById("mv421AuditStyle"))return;
    const s=document.createElement("style");
    s.id="mv421AuditStyle";
    s.textContent=`
      .mv421-audit-opcion em{background:#dcfce7!important;color:#166534!important}
      .mv421-audit-badge-wrap{width:24px;height:24px;pointer-events:none}
      .mv421-audit-badge{width:22px;height:22px;border-radius:999px;background:#16a34a;color:#fff;border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;transform:translate(13px,-16px)}
      .mv421-popup-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      .mv421-popup-btn{border:0;border-radius:9px;padding:8px 10px;background:#0d6efd;color:#fff;font-size:12px;font-weight:900;cursor:pointer}
      .mv421-popup-auditada{display:inline-flex;align-items:center;gap:5px;background:#dcfce7;color:#166534;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900;margin-top:7px}
      .mv421-wrap{max-width:980px;margin:0 auto;padding:14px 14px 90px;color:#fff}
      .mv421-head{background:linear-gradient(135deg,#172946,#203a63);border-radius:18px;padding:16px;border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(0,0,0,.24)}
      .mv421-head h2{margin:0 0 5px;font-size:24px}
      .mv421-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .mv421-btn{border:0;border-radius:11px;padding:11px 14px;background:#0d6efd;color:#fff;font-weight:900;cursor:pointer}
      .mv421-btn.sec{background:#53657e}.mv421-btn.ok{background:#16a34a}.mv421-btn.warn{background:#d97706}
      .mv421-card{background:#f8fafc;color:#0f172a;border-radius:16px;padding:14px;margin:12px 0;border:1px solid #dbe5f0;box-shadow:0 7px 18px rgba(0,0,0,.16)}
      .mv421-card h3{margin:0 0 11px;font-size:17px}
      .mv421-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 16px}
      .mv421-dato{border-bottom:1px dashed #d7e0eb;padding:7px 0;min-width:0}.mv421-dato b{display:block;font-size:10px;color:#64748b;text-transform:uppercase}.mv421-dato span{display:block;margin-top:3px;font-weight:800;overflow-wrap:anywhere}
      .mv421-note{padding:10px;border-radius:11px;background:#e0f2fe;color:#075985;font-size:12px;line-height:1.4}
      .mv421-ok{background:#dcfce7;color:#166534}.mv421-warn{background:#fff7ed;color:#9a3412}.mv421-muted{background:#f1f5f9;color:#475569}
      .mv422-alertas{display:grid;gap:7px;margin-top:9px}
      .mv422-alerta{padding:9px 10px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:12px;line-height:1.4;border-left:4px solid #f59e0b}
      .mv422-alerta b{color:#7c2d12}
      .mv422-alerta-ok{padding:9px 10px;border-radius:10px;background:#dcfce7;color:#166534;font-size:12px;line-height:1.4;border-left:4px solid #22c55e}
      .mv422-subtitulo{font-size:12px;font-weight:900;color:#334155;margin:12px 0 6px}
      .mv421-acta{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
      .mv421-history-item{border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin:8px 0;background:#fff}
      .mv421-history-item strong{color:#0f172a}.mv421-history-item small{color:#64748b}
      .mv421-reasons{display:flex;gap:8px;flex-wrap:wrap}.mv421-reasons label{display:flex;gap:6px;align-items:center;background:#eef2ff;border-radius:999px;padding:7px 9px;font-size:12px;font-weight:800;cursor:pointer}
      .mv421-pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:12px;font-size:12px;line-height:1.45;max-height:360px;overflow:auto}
      @media(max-width:700px){.mv421-grid{grid-template-columns:1fr}.mv421-wrap{padding:10px 8px 80px}.mv421-head h2{font-size:21px}}
    `;
    document.head.appendChild(s);
  }

  function instalarControl(){
    instalarEstilos();
    const controles=document.querySelector("#moVistaFiltros .mo-controles-visibilidad");
    if(!controles||document.getElementById("moMostrarAuditadas"))return;
    const label=document.createElement("label");
    label.className="mo-cto-cercanas-opcion mv421-audit-opcion";
    label.innerHTML='<input id="moMostrarAuditadas" type="checkbox"><span>Mostrar órdenes auditadas</span><em id="moAuditadasEstado">Ocultas</em>';
    controles.appendChild(label);
    const c=label.querySelector("#moMostrarAuditadas");
    c?.addEventListener("change",()=>alternarAuditadas(c));
  }

  function estadoControl(texto,error){
    const e=document.getElementById("moAuditadasEstado");if(!e)return;
    e.textContent=texto||"Ocultas";
    e.style.background=error?"#fee2e2":"#dcfce7";
    e.style.color=error?"#b91c1c":"#166534";
  }

  function mismaCuadrilla(a,b){return !a||!b||normTxt(a)===normTxt(b);}
  function encontrarResumenAuditoria(orden){
    if(!indiceAuditorias||!Array.isArray(indiceAuditorias.auditorias))return null;
    const oid=normId(orden?.ordenId),cliente=normId(orden?.codigoCliente),cuad=orden?.cuadrilla||"";
    const candidatos=indiceAuditorias.auditorias.filter(a=>{
      const co=normId(a.codigoOrden),cp=normId(a.codigoPedido);
      if(!mismaCuadrilla(a.cuadrilla,cuad))return false;
      if(co&&co===oid)return true;
      if(!co&&cp&&(cp===oid||cp===cliente))return true;
      return false;
    });
    if(!candidatos.length)return null;
    candidatos.sort((a,b)=>(Number(b.ultimaTs)||0)-(Number(a.ultimaTs)||0));
    return candidatos[0];
  }

  async function cargarIndice(forzar=false){
    const p=periodoActualMapa();
    if(!forzar&&indiceAuditorias&&indicePeriodo===p)return indiceAuditorias;
    if(cargandoIndice)return cargandoIndice;
    cargandoIndice=(async()=>{
      const d=await apiGet("indiceAuditoriasMapaV421",{periodo:p});
      indiceAuditorias=d;
      indicePeriodo=p;
      return d;
    })();
    try{return await cargandoIndice;}finally{cargandoIndice=null;}
  }

  function limpiarCapa(){
    try{
      if(capaAuditorias&&typeof capaAuditorias.clearLayers==="function")capaAuditorias.clearLayers();
      if(capaAuditorias&&typeof moMapa!=="undefined"&&moMapa&&moMapa.hasLayer(capaAuditorias))moMapa.removeLayer(capaAuditorias);
    }catch(_){}
    capaAuditorias=null;
  }

  function pintarMarcasAuditadas(){
    const check=document.getElementById("moMostrarAuditadas");
    if(!check?.checked||typeof moMapa==="undefined"||!moMapa||typeof L==="undefined")return;
    limpiarCapa();
    capaAuditorias=L.layerGroup().addTo(moMapa);
    let visibles=0;
    (typeof moRegistros!=="undefined"?moRegistros:[]).forEach(x=>{
      const aud=encontrarResumenAuditoria(x);if(!aud)return;
      const lat=Number(x.latitud),lng=Number(x.longitud);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
      const icon=L.divIcon({className:"mv421-audit-badge-wrap",html:'<div class="mv421-audit-badge">✓</div>',iconSize:[24,24],iconAnchor:[12,12]});
      L.marker([lat,lng],{icon,interactive:false,zIndexOffset:1200}).addTo(capaAuditorias);
      visibles++;
    });
    estadoControl(`${visibles} visibles`,false);
  }

  async function alternarAuditadas(check){
    if(!check?.checked){
      limpiarCapa();
      estadoControl("Ocultas",false);
      return;
    }
    check.disabled=true;estadoControl("Consultando...",false);
    try{
      await cargarIndice(false);
      pintarMarcasAuditadas();
    }catch(e){
      check.checked=false;limpiarCapa();estadoControl("No disponible",true);
      console.warn("V421 auditorías:",e);
    }finally{check.disabled=false;}
  }

  function popupV421(x){
    let html=typeof popupBase==="function"?popupBase(x):"";
    const aud=encontrarResumenAuditoria(x);
    const badge=aud?`<div class="mv421-popup-auditada">✓ Auditada${Number(aud.cantidad)>1?` · ${Number(aud.cantidad)} veces`:""}</div>`:"";
    const id=normId(x?.ordenId);
    const acciones=`${badge}<div class="mv421-popup-actions"><button type="button" class="mv421-popup-btn" onclick="mv421AbrirFichaAuditoria('${id}')">🔎 Auditar orden</button></div>`;
    if(!html)return `<div class="mo-popup">${acciones}</div>`;
    return html.replace(/<\/div>\s*$/,acciones+"</div>");
  }

  function renderV421(lista){
    const r=typeof renderMarcadoresBase==="function"?renderMarcadoresBase.apply(this,arguments):undefined;
    const check=document.getElementById("moMostrarAuditadas");
    if(check?.checked){
      if(indiceAuditorias)pintarMarcasAuditadas();
      else cargarIndice(false).then(pintarMarcasAuditadas).catch(()=>{});
    }
    return r;
  }

  function leerMulti(tipo){
    try{
      if(typeof MO_MULTI_FILTROS_V418!=="undefined"&&Array.isArray(MO_MULTI_FILTROS_V418[tipo]))return MO_MULTI_FILTROS_V418[tipo].slice();
    }catch(_){}
    return [];
  }

  function guardarEstadoMapa(){
    let centro=null,zoom=null;
    try{
      if(typeof moMapa!=="undefined"&&moMapa){const c=moMapa.getCenter();centro={lat:c.lat,lng:c.lng};zoom=moMapa.getZoom();}
    }catch(_){}
    estadoRetorno={
      periodo:norm(document.getElementById("moFiltroPeriodo")?.value),
      sede:norm(document.getElementById("moFiltroSede")?.value),
      fecha:norm(document.getElementById("moFiltroFecha")?.value),
      codigo:norm(document.getElementById("moBuscarCodigo")?.value),
      grupos:leerMulti("grupoTrabajo"),
      estados:leerMulti("estado"),
      cuadrillas:leerMulti("cuadrilla"),
      auditadas:!!document.getElementById("moMostrarAuditadas")?.checked,
      centro,zoom
    };
    window.MV421_MAPA_ESTADO_RETORNO=estadoRetorno;
  }

  async function restaurarEstado(){
    const st=estadoRetorno||window.MV421_MAPA_ESTADO_RETORNO;if(!st)return;
    const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!==undefined)e.value=v;};
    set("moFiltroPeriodo",st.periodo);try{moActualizarRangoFecha();}catch(_){}
    set("moFiltroSede",st.sede);set("moFiltroFecha",st.fecha);set("moBuscarCodigo",st.codigo);
    try{
      if(typeof MO_MULTI_FILTROS_V418!=="undefined"){
        MO_MULTI_FILTROS_V418.grupoTrabajo=(st.grupos||[]).slice();
        MO_MULTI_FILTROS_V418.estado=(st.estados||[]).slice();
        MO_MULTI_FILTROS_V418.cuadrilla=(st.cuadrillas||[]).slice();
        ["grupoTrabajo","estado","cuadrilla"].forEach(t=>{try{moMultiRefrescarV418(t);}catch(_){}});
      }
    }catch(_){}
    try{await moConsultarMapa();}catch(_){}
    if(st.centro&&typeof moMapa!=="undefined"&&moMapa){
      try{moMapa.setView([st.centro.lat,st.centro.lng],Number(st.zoom)||moMapa.getZoom());}catch(_){}
    }
    const c=document.getElementById("moMostrarAuditadas");
    if(c&&st.auditadas){c.checked=true;await alternarAuditadas(c);}
  }

  async function mostrarV421(){
    limpiarCapa();indiceAuditorias=null;indicePeriodo="";cargandoIndice=null;
    const r=typeof mostrarMapaBase==="function"?await mostrarMapaBase.apply(this,arguments):undefined;
    setTimeout(async()=>{
      instalarControl();
      if(window.MV421_RESTAURAR_MAPA_PENDIENTE){
        window.MV421_RESTAURAR_MAPA_PENDIENTE=false;
        await restaurarEstado();
      }
    },30);
    return r;
  }

  function fechaPeriodo(fecha){
    const m=norm(fecha).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m?`${m[3]}-${String(m[2]).padStart(2,"0")}`:periodoActualMapa();
  }

  function dato(label,valor){
    if(!norm(valor))return "";
    return `<div class="mv421-dato"><b>${esc(label)}</b><span>${esc(valor)}</span></div>`;
  }

  function ctoTexto(o){
    const vals=[o.cto1,o.cto2,o.cto3,o.cto].filter(Boolean);
    return vals.length?vals.join(" / "):"";
  }

  function motivosSeleccionados(){
    return Array.from(document.querySelectorAll('input[name="mv421Motivo"]:checked')).map(x=>x.value);
  }

  function historialHtml(lista){
    if(!Array.isArray(lista)||!lista.length)return `<div class="mv421-note mv421-muted">Esta orden todavía no tiene auditorías registradas.</div>`;
    return lista.map(a=>`<div class="mv421-history-item"><strong>${esc(a.tipoActividad||"AUDITORÍA")}</strong> · ${esc(a.clasificacion||a.estadoAuditoria||"")}${a.puntajeTotal!==""&&a.puntajeTotal!==undefined?` · <b>${esc(a.puntajeTotal)} pts</b>`:""}<br><small>${esc(a.fecha||"")} ${esc(a.hora||"")} · ${esc(a.supervisor||"")} · ${esc(a.cuadrilla||"")}</small>${a.motivoSeleccion?.length?`<br><small>Motivo: ${esc(a.motivoSeleccion.join(", "))}</small>`:""}</div>`).join("");
  }

  function actaHtml(acta){
    if(!acta||!acta.linkActa)return `<div class="mv421-note mv421-warn">⚠️ Acta aún no cargada para esta orden.</div>`;
    return `<div class="mv421-acta"><div><b>Acta ${esc(acta.numeroActa||"")}</b><br><small>${esc(acta.estadoVisibleTecnico||acta.estado||"")} · ${esc(acta.resultadoValidacion||"")}</small></div><a class="mv421-btn ok" href="${esc(acta.linkActa)}" target="_blank" rel="noopener noreferrer">📄 Ver acta</a></div>`;
  }

  async function cargarMaterialesFicha(ordenId,orden){
    const cont=document.getElementById("mv421Materiales");if(!cont)return;
    cont.innerHTML=`<div class="mv421-note mv421-muted">Consultando comparación de materiales...</div>`;
    try{
      const d=await apiGet("obtenerAlertaMaterialesAuditoriaV421",{
        cuadrilla:orden.cuadrilla||"",
        sede:orden.region||"",
        periodo:fechaPeriodo(orden.fechaSolicitud||"")
      });
      if(!d.disponible){
        cont.innerHTML=`<div class="mv421-note mv421-muted">${esc(d.mensaje||"Sin datos de materiales para comparar.")}</div>`;return;
      }
      const dif=Number(d.diferenciaPct)||0;
      const clase=dif>0?"mv421-warn":"mv421-ok";
      const frase=dif>0
        ?`${dif.toFixed(1)}% por encima del promedio de ${esc(d.sede||"la sede")}`
        :`${Math.abs(dif).toFixed(1)}% por debajo del promedio de ${esc(d.sede||"la sede")}`;

      cont.innerHTML=`
        <div class="mv421-note ${clase}"><b>Consumo de materiales:</b> ${frase}.</div>
        <div class="mv421-grid" style="margin-top:8px">
          ${dato("Costo promedio / orden",`S/ ${Number(d.promedioCuadrilla||0).toFixed(2)}`)}
          ${dato("Promedio sede / orden",`S/ ${Number(d.promedioSede||0).toFixed(2)}`)}
        </div>
        ${Array.isArray(d.materialesPrincipales)&&d.materialesPrincipales.length
          ?`<div class="mv421-note mv421-muted" style="margin-top:8px"><b>Detalle de materiales:</b> ${d.materialesPrincipales.map(x=>`${esc(x.material)} (${Number(x.cantidad||0).toFixed(1)})`).join(" · ")}</div>`
          :""
        }`;
    }catch(e){
      cont.innerHTML=`<div class="mv421-note mv421-muted">Comparación de materiales no disponible: ${esc(e.message)}</div>`;
    }
  }

  function pctV422(v){
    const n=Number(v)||0;
    return n<=1?n*100:n;
  }

  function moneyV422(v){
    return `S/ ${(Number(v)||0).toFixed(2)}`;
  }

  async function resumenIndicadoresV422(periodo){
    const p=norm(periodo)||fechaPeriodo("");
    if(resumenIndicadoresCacheV422[p])return resumenIndicadoresCacheV422[p];
    if(resumenIndicadoresPromesaV422[p])return resumenIndicadoresPromesaV422[p];

    resumenIndicadoresPromesaV422[p]=apiGet("obtenerResumenDashboardRanking",{periodo:p})
      .then(d=>{
        resumenIndicadoresCacheV422[p]=d;
        delete resumenIndicadoresPromesaV422[p];
        return d;
      })
      .catch(e=>{
        delete resumenIndicadoresPromesaV422[p];
        throw e;
      });
    return resumenIndicadoresPromesaV422[p];
  }

  function alertasIndicadoresHtmlV422(item){
    if(!item)return `<div class="mv421-note mv421-muted">No se encontró resumen operativo de esta cuadrilla para el período.</div>`;

    // Metas vigentes del sistema.
    const META_EFECTIVIDAD=70;
    const META_RECABLEADO=42;
    const META_VTRGAR=3;
    const META_SLA=95;

    const alertas=[];
    const diario=item.mv353CumplimientoDia||{};
    const metaAcumulada=Number(diario.metaAcumulada)||0;
    const produccion=Number(item.produccion)||0;

    if(metaAcumulada>0 && produccion<metaAcumulada){
      const cumplimiento=(produccion/metaAcumulada)*100;
      alertas.push(`<div class="mv422-alerta"><b>Producción al día:</b> ${produccion.toFixed(1)} pts frente a meta acumulada de ${metaAcumulada.toFixed(1)} pts (${cumplimiento.toFixed(1)}% de cumplimiento).</div>`);
    }

    const ef=pctV422(item.efectividad);
    const totalEf=Number(item.detEfectividad?.total)||0;
    if(totalEf>0 && ef<META_EFECTIVIDAD){
      alertas.push(`<div class="mv422-alerta"><b>Efectividad:</b> ${ef.toFixed(2)}%, por debajo de la meta de ${META_EFECTIVIDAD}%.</div>`);
    }

    const rec=pctV422(item.recableado);
    const los=Number(item.detRecableado?.los)||0;
    if(los>0 && rec>META_RECABLEADO){
      alertas.push(`<div class="mv422-alerta"><b>Recableado:</b> ${rec.toFixed(2)}%, por encima del máximo de ${META_RECABLEADO}% (${Number(item.detRecableado?.recableados)||0} recableados / ${los} órdenes VT).</div>`);
    }

    const vg=pctV422(item.vtrgar);
    const finVg=Number(item.detVtrGar?.finalizadas)||0;
    if(finVg>0 && vg>META_VTRGAR){
      alertas.push(`<div class="mv422-alerta"><b>VTR/GAR:</b> ${vg.toFixed(2)}%, por encima del máximo de ${META_VTRGAR}% (${Number(item.detVtrGar?.total)||0} incidencia(s)).</div>`);
    }

    const sla=pctV422(item.slaAjustado??item.sla);
    const evalSla=Number(item.detSla?.evaluables)||0;
    if(evalSla>0 && sla<META_SLA){
      alertas.push(`<div class="mv422-alerta"><b>Tiempo de Gestión - SLA:</b> ${sla.toFixed(2)}%, por debajo de la meta de ${META_SLA}%. Fuera de SLA: ${Number(item.detSla?.fueraAjustado??item.detSla?.fueraBruto)||0}.</div>`);
    }

    const obs=Number(item.observaciones)||0;
    if(obs>0){
      const d=item.detObservaciones||{};
      const estados=d.estados||{};
      const pendientes=Number(d.pendientes)||0;
      const penalizadas=Number(estados.PENALIZADO)||0;
      const derivadas=Number(estados.DERIVADO)||0;
      alertas.push(`<div class="mv422-alerta"><b>Observaciones:</b> ${obs} registrada(s). Pendientes: ${pendientes} · Penalizadas: ${penalizadas} · Derivadas: ${derivadas} · Monto afectado: ${moneyV422(item.montoAfectadoObs)}.</div>`);
    }

    return alertas.length
      ?`<div class="mv422-alertas">${alertas.join("")}</div>`
      :`<div class="mv422-alerta-ok">✓ Los indicadores disponibles de la cuadrilla se encuentran dentro de las metas operativas.</div>`;
  }

  async function cargarIndicadoresFichaV422(orden){
    const cont=document.getElementById("mv422Indicadores");if(!cont)return;
    cont.innerHTML=`<div class="mv421-note mv421-muted">Consultando indicadores de la cuadrilla...</div>`;
    try{
      const periodo=fechaPeriodo(orden.fechaSolicitud||"");
      const d=await resumenIndicadoresV422(periodo);
      const cuad=normTxt(orden.cuadrilla||"");
      const item=(d.lista||[]).find(x=>normTxt(x.cuadrilla||"")===cuad);
      cont.innerHTML=alertasIndicadoresHtmlV422(item);
    }catch(e){
      cont.innerHTML=`<div class="mv421-note mv421-muted">Indicadores no disponibles temporalmente: ${esc(e.message)}</div>`;
    }
  }

  function renderFicha(d){
    const o=d.orden||{},acta=d.acta||null,hist=d.auditorias||[];
    fichaCache[normId(o.ordenId)]=d;
    const lat=Number(o.latitud),lng=Number(o.longitud);
    const maps=Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+","+lng)}`:"";
    const puede=puedeRegistrar();
    const auditada=hist.length>0;
    const servicio=[o.tipoTrabajo,o.tipo,o.productoServicio||o.productoOrigen].filter(Boolean).join(" · ");
    return `<div class="mv421-wrap">
      <div class="mv421-head">
        <h2>🔎 Auditoría de orden ${esc(o.ordenId||"")}</h2>
        <div>${auditada?`<span class="mv421-popup-auditada">✓ Auditada · ${hist.length} registro(s)</span>`:`<span style="color:#cbd5e1">Orden aún no auditada</span>`}</div>
        <div class="mv421-actions"><button class="mv421-btn sec" onclick="mv421VolverMapa()">🗺️ Volver al mapa</button><button class="mv421-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(o.ordenId||"")}')">📋 Copiar código</button>${maps?`<a class="mv421-btn sec" href="${maps}" target="_blank" rel="noopener noreferrer">📍 Ir al cliente</a>`:""}</div>
      </div>

      <div class="mv421-card"><h3>👤 Orden y cliente</h3><div class="mv421-grid">
        ${dato("Fecha",o.fechaSolicitud)}${dato("Tramo",o.horaSolicitud)}${dato("Código de orden",o.ordenId)}${dato("Código de cliente / pedido",o.codigoPedido||o.codigoCliente)}
        ${dato("Estado",o.estado)}${dato("Cuadrilla",o.cuadrilla)}${dato("Cliente",o.cliente)}${dato("Documento",o.numeroDocumento)}
        ${dato("Teléfono móvil",o.telefonoMovil)}${dato("Teléfono fijo",o.telefonoFijo)}${dato("Dirección",o.direccion)}${dato("Referencia",o.direccionAdicional)}
        ${dato("Región",o.region)}${dato("Coordenadas",Number.isFinite(lat)&&Number.isFinite(lng)?`${lat},${lng}`:"")}
      </div></div>

      <div class="mv421-card"><h3>🌐 Datos del servicio</h3><div class="mv421-note mv421-muted">${esc(servicio||"Sin detalle de servicio")}</div><div class="mv421-grid" style="margin-top:8px">
        ${dato("Código de seguimiento",o.codigoSeguimiento)}${dato("CTO",ctoTexto(o))}${dato("Puerto",o.puerto)}${dato("Inicio visita",o.fechaInicioVisita)}${dato("Fin visita",o.fechaFinVisita)}${dato("Detalle",o.detalle)}
      </div><details style="margin-top:10px"><summary style="cursor:pointer;font-weight:900">Ver plantilla completa</summary><pre class="mv421-pre">${esc(d.plantilla||"")}</pre></details></div>

      <div class="mv421-card"><h3>📄 Acta registrada</h3>${actaHtml(acta)}</div>

      <div class="mv421-card"><h3>⚠️ Alertas para orientar la auditoría</h3><div id="mv421Materiales"></div><div class="mv422-subtitulo">Indicadores de la cuadrilla</div><div id="mv422Indicadores"></div><div class="mv421-note mv421-muted" style="margin-top:8px">Estas alertas orientan la revisión; no significan por sí solas una irregularidad.</div></div>

      <div class="mv421-card"><h3>🕘 Historial de auditorías de esta orden</h3>${historialHtml(hist)}</div>

      <div class="mv421-card"><h3>🎯 Motivo de selección de la auditoría</h3><div class="mv421-reasons">
        ${["ALTO CONSUMO DE MATERIALES","OBSERVACIONES / REINCIDENCIA","RECABLEADO / CALIDAD TECNICA","VTR / GAR","SELECCION ALEATORIA","OTRO"].map(x=>`<label><input type="checkbox" name="mv421Motivo" value="${esc(x)}"> ${esc(x)}</label>`).join("")}
      </div></div>

      <div class="mv421-card"><h3>📝 Registrar resultado en Actividad en Campo</h3>${puede?`<div class="mv421-note mv421-ok">El registro se guardará en <b>Actividad en Campo → Auditoría en Frío</b>. La orden y la cuadrilla se cargarán automáticamente.</div><button class="mv421-btn ok" style="margin-top:10px" onclick="mv421RegistrarAuditoriaDesdeFicha('${normId(o.ordenId)}')">✅ Registrar auditoría en frío</button>`:`<div class="mv421-note mv421-muted">La consulta está habilitada, pero el registro de auditorías queda reservado al perfil Supervisor.</div>`}</div>
    </div>`;
  }

  async function abrirFicha(orderId,forzar=false){
    guardarEstadoMapa();
    const id=normId(orderId);
    if(!id)return;
    instalarEstilos();
    if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
    if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv421-wrap"><div class="mv421-head"><h2>🔎 Auditoría de orden ${esc(id)}</h2><div style="color:#cbd5e1">Cargando cliente, servicio, acta e historial...</div><div class="mv421-actions"><button class="mv421-btn sec" onclick="mv421VolverMapa()">🗺️ Volver al mapa</button></div></div></div>`);
    try{
      const d=!forzar&&fichaCache[id]?fichaCache[id]:await apiGet("obtenerFichaAuditoriaMapaV421",{ordenId:id});
      fichaCache[id]=d;
      if(typeof mostrarPantalla==="function")mostrarPantalla(renderFicha(d));
      cargarMaterialesFicha(id,d.orden||{});
      cargarIndicadoresFichaV422(d.orden||{});
    }catch(e){
      if(typeof mostrarPantalla==="function")mostrarPantalla(`<div class="mv421-wrap"><div class="mv421-card"><h3>❌ No se pudo abrir la auditoría</h3><div class="mv421-note mv421-warn">${esc(e.message)}</div><button class="mv421-btn sec" style="margin-top:10px" onclick="mv421VolverMapa()">🗺️ Volver al mapa</button></div></div>`);
    }
  }

  function instalarIntegracionActividad(){
    if(integracionActividadLista)return;
    if(typeof window.construirAuditoriaCampo!=="function"||typeof window.mostrarFormularioActividadCampo!=="function")throw new Error("Actividad en Campo no terminó de cargar.");

    construirAuditoriaOriginal=window.construirAuditoriaCampo;
    window.construirAuditoriaCampo=function(tipo){
      const a=construirAuditoriaOriginal.apply(this,arguments);
      const pre=window.MV421_AUDITORIA_PREFILL;
      if(pre){
        a.codigoOrden=pre.ordenId||"";
        a.codigoCliente=pre.codigoCliente||"";
        a.codigoPedido=pre.codigoCliente||a.codigoPedido||"";
        a.motivoSeleccion=Array.isArray(pre.motivos)?pre.motivos:[];
        a.origenAuditoria="MAPA_OPERATIVO";
      }
      return a;
    };
    try{construirAuditoriaCampo=window.construirAuditoriaCampo;}catch(_){}

    mostrarActividadOriginal=window.mostrarActividadCampo;
    window.mostrarActividadCampo=function(){
      const pre=window.MV421_AUDITORIA_PREFILL;
      if(pre&&pre.retornoFicha){
        const id=pre.ordenId;
        window.MV421_AUDITORIA_PREFILL=null;
        indiceAuditorias=null;indicePeriodo="";
        delete fichaCache[normId(id)];
        return abrirFicha(id,true);
      }
      return mostrarActividadOriginal.apply(this,arguments);
    };
    try{mostrarActividadCampo=window.mostrarActividadCampo;}catch(_){}
    integracionActividadLista=true;
  }

  async function registrarDesdeFicha(orderId){
    const id=normId(orderId),d=fichaCache[id];
    if(!d||!d.orden)throw new Error("No se encontró la orden seleccionada.");
    if(!puedeRegistrar()){alert("El registro de auditorías está habilitado para Supervisores.");return;}
    const o=d.orden;
    const motivos=motivosSeleccionados();
    try{
      if(typeof window.mv339CargarModulo==="function")await window.mv339CargarModulo("actividad");
      instalarIntegracionActividad();
      window.MV421_AUDITORIA_PREFILL={ordenId:id,codigoCliente:o.codigoPedido||o.codigoCliente||"",cuadrilla:o.cuadrilla||"",motivos,retornoFicha:true};
      await window.mostrarFormularioActividadCampo();

      const select=document.getElementById("actCuadrilla");
      if(select){select.value=o.cuadrilla||"";select.dispatchEvent(new Event("change"));}
      const tipo=document.getElementById("actTipoActividad");
      if(tipo){tipo.value="AUDITORIA EN FRIO";if(typeof window.renderFormularioTipoActividad==="function")window.renderFormularioTipoActividad();}

      const codigo=document.getElementById("audCodigoPedido");
      if(codigo){
        codigo.value=id;
        const label=codigo.closest(".act-field")?.querySelector("label");
        if(label)label.textContent="Código de orden";
      }
      const msg=document.getElementById("audAutoMsg");
      if(msg)msg.textContent="Orden seleccionada desde Mapa Operativo. Los datos del cliente se completarán automáticamente.";
      const wrap=document.querySelector(".act-wrap");
      const head=wrap?.querySelector(".act-head");
      if(head&&!document.getElementById("mv421OrigenMapa")){
        const n=document.createElement("div");
        n.id="mv421OrigenMapa";n.className="act-note";
        n.innerHTML=`🗺️ <b>Origen: Mapa Operativo</b> · Orden ${esc(id)} · ${esc(o.cliente||"")}<br>Al guardar o cancelar regresará a la ficha de esta orden.`;
        head.insertAdjacentElement("afterend",n);
      }
      if(typeof window.buscarDatosAuditoriaCampo==="function")await window.buscarDatosAuditoriaCampo();
    }catch(e){
      alert("No se pudo abrir Actividad en Campo: "+(e?.message||e));
    }
  }

  async function volverMapa(){
    window.MV421_RESTAURAR_MAPA_PENDIENTE=true;
    if(typeof window.mostrarMapaOperativo==="function")return window.mostrarMapaOperativo();
  }

  window.mostrarMapaOperativo=mostrarV421;
  try{mostrarMapaOperativo=mostrarV421;}catch(_){}
  window.moPopup=popupV421;
  try{moPopup=popupV421;}catch(_){}
  window.moRenderMarcadores=renderV421;
  try{moRenderMarcadores=renderV421;}catch(_){}

  window.mv421AbrirFichaAuditoria=abrirFicha;
  window.mv421RegistrarAuditoriaDesdeFicha=registrarDesdeFicha;
  window.mv421VolverMapa=volverMapa;
  window.MV421_MAPA_AUDITORIA_OK=true;
})();
