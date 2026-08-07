/* ============================================================
   MI VISUAL V363 - Tiempo de Gestión SLA
   Dashboard, Mi Desempeño, excepciones y configuración Ranking.
============================================================ */
(function(){
  "use strict";
  if(window.MV363_SLA_GESTION_OK) return;
  const CACHE = new Map();

  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function norm(v){return String(v||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function perfil(){return norm(localStorage.getItem("perfil"));}
  function semaforo(p){const x=n(p);if(x<60)return{icono:"🔴",texto:"CRÍTICO",color:"#ef4444"};if(x<80)return{icono:"🟠",texto:"BAJO",color:"#f97316"};if(x<90)return{icono:"🟡",texto:"EN SEGUIMIENTO",color:"#eab308"};return{icono:"🟢",texto:"CONFORME",color:"#22c55e"};}
  function fecha(v){if(!v)return"-";try{return new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));}catch(_){return String(v);}}
  function api(){return window.MI_VISUAL_API_URL || (typeof MV58_API!=="undefined"?MV58_API:"");}

  async function get(accion,params={}){
    const url=new URL(api());url.searchParams.set("accion",accion);url.searchParams.set("usuario",localStorage.getItem("usuario")||"");
    Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v));});
    url.searchParams.set("_v363",Date.now());
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store",headers:{Accept:"application/json"}});const t=(await r.text()).trim();
    if(!r.ok||!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t))throw new Error("Apps Script todavía no tiene publicada la V363.");
    const d=JSON.parse(t);if(!d.ok)throw new Error(d.error||"No se pudo consultar SLA.");return d;
  }
  async function post(accion,payload={}){
    const r=await fetch(api(),{method:"POST",body:JSON.stringify({accion,usuario:localStorage.getItem("usuario")||"",...payload})});const t=(await r.text()).trim();
    if(!t||/^<!doctype|^<html|^MI VISUAL API OK$/i.test(t))throw new Error("Apps Script todavía no tiene publicada la V363.");
    const d=JSON.parse(t);if(!d.ok)throw new Error(d.error||"No se pudo completar la operación.");return d;
  }
  async function consultar(periodo,forzar=false){
    const key=periodo||"AUTO";const c=CACHE.get(key);if(!forzar&&c&&Date.now()-c.fecha<120000)return c.data;
    const d=await get("obtenerSlaGestion",{periodo});CACHE.set(key,{fecha:Date.now(),data:d});return d;
  }

  function resumenSlaLista(lista){
    const r={evaluables:0,cumplenBruto:0,cumplenAjustado:0,fueraAjustado:0,excepcionesPendientes:0,excepcionesAprobadas:0,instalacionesTotal:0,instalacionesCumplenBruto:0,instalacionesCumplenAjustado:0,visitasTecnicasTotal:0,visitasTecnicasCumplenBruto:0,visitasTecnicasCumplenAjustado:0,noEvaluables:0};
    (lista||[]).forEach(x=>{const d=x.detSla||{};Object.keys(r).forEach(k=>r[k]+=n(d[k]));});
    r.slaBruto=r.evaluables?r.cumplenBruto/r.evaluables*100:0;r.slaAjustado=r.evaluables?r.cumplenAjustado/r.evaluables*100:0;
    r.instalacionesBruto=r.instalacionesTotal?r.instalacionesCumplenBruto/r.instalacionesTotal*100:0;r.instalacionesAjustado=r.instalacionesTotal?r.instalacionesCumplenAjustado/r.instalacionesTotal*100:0;
    r.visitasTecnicasBruto=r.visitasTecnicasTotal?r.visitasTecnicasCumplenBruto/r.visitasTecnicasTotal*100:0;r.visitasTecnicasAjustado=r.visitasTecnicasTotal?r.visitasTecnicasCumplenAjustado/r.visitasTecnicasTotal*100:0;
    return r;
  }

  function detalleSla(d={}){const s=semaforo(d.slaAjustado);return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
    ${mv58KpiMini("SLA ajustado",`${n(d.slaAjustado).toFixed(1)}% ${s.icono}`)}${mv58KpiMini("SLA bruto",`${n(d.slaBruto).toFixed(1)}%`)}
    ${mv58KpiMini("Evaluables",n(d.evaluables))}${mv58KpiMini("Fuera del SLA",n(d.fueraAjustado))}
    ${mv58KpiMini("Instalaciones",`${n(d.instalacionesAjustado).toFixed(1)}%`)}${mv58KpiMini("Visitas técnicas",`${n(d.visitasTecnicasAjustado).toFixed(1)}%`)}
    ${mv58KpiMini("Excepciones aprobadas",n(d.excepcionesAprobadas))}${mv58KpiMini("Excepciones pendientes",n(d.excepcionesPendientes))}
    </div><button type="button" class="mv4-link-btn" style="margin-top:10px" onclick="mostrarTiempoGestionSla(MV276_DASH_PERIODO)">⏱️ Ver códigos y excepciones</button>`;}

  // Parches del Dashboard: incorporan SLA sin cambiar las funciones base.
  const baseResumen=window.mv4Resumen;
  if(typeof baseResumen==="function") window.mv4Resumen=function(lista){const r=baseResumen(lista);const s=resumenSlaLista(lista);r.sla=s.slaAjustado;r.slaBruto=s.slaBruto;r.detSla=s;r.ok=(r.ok||0)+(s.evaluables>0&&s.slaAjustado>=90?1:0);r.cumplimiento=Math.round(r.ok/6*100);return r;};
  const baseDetalleKpi=window.mv4DetalleKpi;
  if(typeof baseDetalleKpi==="function") window.mv4DetalleKpi=function(lista,tipo){if(tipo!=="sla")return baseDetalleKpi(lista,tipo);return (lista||[]).slice().sort((a,b)=>n(b.slaAjustado)-n(a.slaAjustado)).map((x,i)=>mv58CuadrillaAnalitica(x,"sla",i+1)).join("");};
  const baseCab=window.mv58CabeceraCuadrilla;
  if(typeof baseCab==="function") window.mv58CabeceraCuadrilla=function(x,tipo,puesto){if(tipo!=="sla")return baseCab(x,tipo,puesto);const s=semaforo(x.slaAjustado);return `<div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font-size:12px;color:#facc15;font-weight:900">${puesto}°</div><div style="font-size:14px;font-weight:900">${esc(x.cuadrilla)}</div><div style="font-size:18px;font-weight:900;margin-top:6px">${n(x.slaAjustado).toFixed(1)}%</div></div><div style="color:${s.color};font-weight:900">${s.icono} ${s.texto}</div></div>`;};
  const baseDet=window.mv58DetalleCuadrilla;
  if(typeof baseDet==="function") window.mv58DetalleCuadrilla=function(x,tipo){if(tipo!=="sla")return baseDet(x,tipo);return detalleSla(x.detSla||{});};
  const baseKpis=window.mv4DashboardKpis;
  if(typeof baseKpis==="function") window.mv4DashboardKpis=function(lista){const r=mv4Resumen(lista),s=semaforo(r.sla);let html=baseKpis(lista);html=html.replace(/\d+ de 5 metas cumplidas/,`${r.ok} de 6 metas cumplidas`);return html+mv4KpiCard({icono:"⏱️",titulo:"Tiempo de Gestión - SLA",valor:`${n(r.sla).toFixed(1)}%`,meta:"≥ 90% (SLA ajustado)",estado:s.icono,detalle:mv4DetalleKpi(lista,"sla")});};

  const baseResumenCuadrilla=window.mv198ResumenCuadrilla;
  if(typeof baseResumenCuadrilla==="function") window.mv198ResumenCuadrilla=function(x){let html=baseResumenCuadrilla(x);if(!x)return html;const s=semaforo(x.slaAjustado);const card=mv591MiniResumenCard("⏱️","Tiempo de Gestión - SLA",`${n(x.slaAjustado).toFixed(1)}%`,`Bruto ${n(x.slaBruto).toFixed(1)}% · ${n(x.detSla?.evaluables)} códigos`,s.icono);html=html.replace(/(<div class="mv198-resumen-grid">)/,`$1${card}`);html=html.replace(/(<div class="mv198-detalle-bloque"><h4>🏆 Ranking)/,`<div class="mv198-detalle-bloque"><h4>⏱️ Tiempo de Gestión - SLA</h4>${detalleSla(x.detSla||{})}</div>$1`);return html;};
  const baseZona=window.mv591ResumenEjecutivoZona;
  if(typeof baseZona==="function") window.mv591ResumenEjecutivoZona=function(lista){let html=baseZona(lista);const d=resumenSlaLista(lista),s=semaforo(d.slaAjustado);const card=mv591MiniResumenCard("⏱️","Tiempo de Gestión - SLA",`${d.slaAjustado.toFixed(1)}%`,`Bruto ${d.slaBruto.toFixed(1)}% · ${d.evaluables} códigos`,s.icono);return html.replace(/(<\/div>\s*<\/div>\s*$)/,`${card}$1`);};
  const baseSede=window.mv4SedeCard;
  if(typeof baseSede==="function") window.mv4SedeCard=function(sede,lista){let html=baseSede(sede,lista);const d=resumenSlaLista(lista);return html.replace(/(<span>Metas:)/,`<span>SLA: <b>${d.slaAjustado.toFixed(1)}%</b></span>$1`);};

  function selectorPeriodos(data,actual){return `<select onchange="mostrarTiempoGestionSla(this.value)" style="width:100%;padding:11px;border-radius:10px">${(data.periodos||[]).map(p=>`<option value="${esc(p.clave||p)}" ${(p.clave||p)===actual?"selected":""}>${esc(p.etiqueta||p)}</option>`).join("")}</select>`;}
  function tarjeta(titulo,valor,sub,icono){return `<div style="padding:13px;border-radius:14px;background:#102844;border:1px solid rgba(255,255,255,.1)"><div style="font-size:11px;color:#9fb7d8;font-weight:900">${icono} ${esc(titulo)}</div><div style="font-size:24px;font-weight:900;margin-top:6px">${valor}</div><div style="font-size:11px;color:#9fb7d8;margin-top:4px">${esc(sub||"")}</div></div>`;}
  function filaOrden(o,puedeSolicitar,puedeResolver,periodo){const s=semaforo(o.cumpleAjustado?100:0);const fuera=o.evaluable&&!o.cumpleAjustado;return `<div style="padding:12px;border-radius:14px;background:#102844;border-left:4px solid ${o.cumpleAjustado?'#22c55e':(o.evaluable?'#ef4444':'#64748b')};margin-top:10px;color:#fff"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>Código ${esc(o.codigo)}</b><div style="font-size:11px;color:#9fb7d8;margin-top:3px">${esc(o.cuadrilla)} · ${esc(o.tipoGeneral)} · ${esc(o.partida||o.resultado)}</div></div><b>${esc(o.resultado)}</b></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px;font-size:12px"><span>Tiempo: <b>${n(o.minutosGestion)} min</b></span><span>Parámetro: <b>${n(o.slaMinutos)} min</b></span><span>Exceso: <b>${n(o.excesoMinutos)} min</b></span></div><div style="font-size:11px;color:#9fb7d8;margin-top:7px">Excepción: ${esc(o.excepcionEstado||'SIN SOLICITUD')}</div>${fuera&&puedeSolicitar&&!['PENDIENTE','APROBADA'].includes(o.excepcionEstado)?`<button class="mv4-link-btn" onclick="mv363AbrirSolicitud('${esc(periodo)}','${esc(o.codigo)}')">Solicitar excepción</button>`:""}${o.excepcionEstado==='PENDIENTE'&&puedeResolver?`<div style="display:flex;gap:8px;margin-top:8px"><button class="mv4-link-btn" onclick="mv363Resolver('${esc(periodo)}','${esc(o.codigo)}','APROBADA')">✅ Aprobar</button><button class="mv4-link-btn" onclick="mv363Resolver('${esc(periodo)}','${esc(o.codigo)}','RECHAZADA')">❌ Rechazar</button></div>`:""}</div>`;}

  async function mostrar(periodo){
    mostrarPantalla(`
      <div style="padding:20px;color:#fff">
        <h2>⏱️ TIEMPO DE GESTIÓN - SLA</h2>
        Cargando información consolidada...
      </div>
    `);

    try{
      const d=await consultar(periodo);
      const r=d.resumen||{};
      const s=semaforo(r.slaAjustado);

      mostrarPantalla(`
        <div style="padding:18px;max-width:1050px;margin:auto;color:#fff">
          <h2>⏱️ TIEMPO DE GESTIÓN - SLA</h2>

          <div style="margin:12px 0">
            ${selectorPeriodos(d,d.periodo)}
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
            ${tarjeta(
              "SLA ajustado",
              `${n(r.slaAjustado).toFixed(1)}% ${s.icono}`,
              s.texto,
              "⏱️"
            )}
            ${tarjeta(
              "SLA bruto",
              `${n(r.slaBruto).toFixed(1)}%`,
              "Sin excepciones",
              "📏"
            )}
            ${tarjeta(
              "Instalaciones",
              `${n(r.instalacionesAjustado).toFixed(1)}%`,
              `${n(r.instalacionesTotal)} códigos`,
              "🏠"
            )}
            ${tarjeta(
              "Visitas técnicas",
              `${n(r.visitasTecnicasAjustado).toFixed(1)}%`,
              `${n(r.visitasTecnicasTotal)} códigos`,
              "🔧"
            )}
            ${tarjeta(
              "Fuera del SLA",
              n(r.fueraAjustado),
              `${n(r.excepcionesPendientes)} excepciones pendientes`,
              "🚨"
            )}
            ${tarjeta(
              "Excepciones aprobadas",
              n(r.excepcionesAprobadas),
              "Incluidas en SLA ajustado",
              "✅"
            )}
          </div>

          ${d.puedeConfigurarRanking ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
              <button class="mv4-link-btn" onclick="mv363AbrirConfigRanking('${esc(d.periodo)}')">
                ⚙️ Configurar pesos Ranking
              </button>
              <button class="mv4-link-btn" onclick="mv363Reconstruir('${esc(d.periodo)}')">
                🔄 Reconstruir resumen SLA
              </button>
            </div>
          ` : ""}

          <h3 style="margin-top:18px">Detalle por Código</h3>
          ${(d.ordenes||[]).map(o=>
            filaOrden(o,d.puedeSolicitar,d.puedeResolver,d.periodo)
          ).join("") || '<div class="card">Sin códigos para el período.</div>'}

          <br>
          <button class="button_1" onclick="volverInicio()">⬅️ Volver al menú</button>
        </div>
      `);
    }catch(e){
      mostrarPantalla(`
        <div style="padding:20px">
          <h2>⏱️ TIEMPO DE GESTIÓN - SLA</h2>
          ❌ ${esc(e.message)}
          <br><br>
          <button class="button_1" onclick="volverInicio()">⬅️ Volver</button>
        </div>
      `);
    }
  }

  function modal(html){document.getElementById('mv363Modal')?.remove();const x=document.createElement('div');x.id='mv363Modal';x.innerHTML=`<div style="width:min(650px,94vw);max-height:90vh;overflow:auto;background:#0d2037;color:#fff;border-radius:18px;padding:18px;border:1px solid #315577">${html}</div>`;Object.assign(x.style,{position:'fixed',inset:'0',zIndex:11000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(2,8,23,.78)',padding:'16px'});document.body.appendChild(x);}
  function cerrar(){document.getElementById('mv363Modal')?.remove();}
  function abrirSolicitud(periodo,codigo){modal(`<h3>Solicitar excepción SLA</h3><p>Código <b>${esc(codigo)}</b></p><label>Motivo<select id="mv363Motivo" style="width:100%;padding:10px;margin:5px 0 10px"><option>METRAJE ELEVADO</option><option>DEMORA SOPORTE WIN</option><option>CAIDA DE SISTEMA O APLICATIVO</option><option>PROBLEMA DE RED O PLATAFORMA</option><option>ACCESO RESTRINGIDO</option><option>OTRA CAUSA</option></select></label><label>Comentario<textarea id="mv363Comentario" style="width:100%;min-height:100px;padding:10px;margin-top:5px"></textarea></label><label>Evidencia / enlace<input id="mv363Evidencia" style="width:100%;padding:10px;margin-top:5px"></label><div style="display:flex;gap:8px;margin-top:12px"><button class="button_1" onclick="mv363EnviarSolicitud('${esc(periodo)}','${esc(codigo)}')">Enviar</button><button class="button_1" onclick="mv363CerrarModal()">Cancelar</button></div><div id="mv363Msg"></div>`);}
  async function enviarSolicitud(periodo,codigo){const msg=document.getElementById('mv363Msg');try{if(msg)msg.textContent='Guardando...';await post('solicitarExcepcionSla',{periodo,codigo,motivo:document.getElementById('mv363Motivo').value,comentario:document.getElementById('mv363Comentario').value,evidencia:document.getElementById('mv363Evidencia').value});CACHE.delete(periodo);cerrar();await mostrar(periodo);}catch(e){if(msg)msg.textContent='❌ '+e.message;}}
  async function resolver(periodo,codigo,resultado){const comentario=prompt(`Comentario de Jefatura para ${resultado.toLowerCase()}:`)||'';try{await post('resolverExcepcionSla',{periodo,codigo,resultado,comentarioJefatura:comentario});CACHE.delete(periodo);await mostrar(periodo);}catch(e){alert(e.message);}}
  async function reconstruir(periodo){if(!confirm('¿Reconstruir el resumen SLA del período?'))return;try{await post('reconstruirSlaPeriodo',{periodo});CACHE.clear();await mostrar(periodo);}catch(e){alert(e.message);}}
  async function abrirConfig(periodo){try{const d=await get('obtenerConfiguracionRanking',{periodo});const c=d.configuracion,p=c.pesos;modal(`<h3>Pesos del Ranking - ${esc(periodo)}</h3>${['PRODUCCION','EFECTIVIDAD','SLA','OBSERVACIONES','RECABLEADO','VTRGAR'].map(k=>`<label style="display:grid;grid-template-columns:1fr 130px;gap:10px;margin-top:9px"><span>${esc(k)}</span><input id="mv363Peso_${k}" type="number" min="0" max="100" step="0.5" value="${n(p[k])}" style="padding:9px"></label>`).join('')}<div style="margin-top:12px;color:#9fb7d8">La suma debe ser 100%. Julio 2026 permanece cerrado.</div><div style="display:flex;gap:8px;margin-top:12px"><button class="button_1" onclick="mv363GuardarConfig('${esc(periodo)}')">Guardar</button><button class="button_1" onclick="mv363CerrarModal()">Cancelar</button></div><div id="mv363Msg"></div>`);}catch(e){alert(e.message);}}
  async function guardarConfig(periodo){const pesos={};['PRODUCCION','EFECTIVIDAD','SLA','OBSERVACIONES','RECABLEADO','VTRGAR'].forEach(k=>pesos[k]=n(document.getElementById('mv363Peso_'+k).value));const msg=document.getElementById('mv363Msg');try{if(msg)msg.textContent='Guardando...';await post('guardarConfiguracionRanking',{periodo,pesos,estado:periodo==='2026-07'?'CERRADO':'ACTIVO'});cerrar();alert('Configuración guardada. Actualice el Ranking del período para aplicar los nuevos pesos.');}catch(e){if(msg)msg.textContent='❌ '+e.message;}}

  window.mv363ResumenSlaLista=resumenSlaLista;window.mv363DetalleSla=detalleSla;window.mv363SemaforoSla=semaforo;
  window.mostrarTiempoGestionSla=mostrar;window.mv363AbrirSolicitud=abrirSolicitud;window.mv363EnviarSolicitud=enviarSolicitud;window.mv363Resolver=resolver;window.mv363Reconstruir=reconstruir;window.mv363AbrirConfigRanking=abrirConfig;window.mv363GuardarConfig=guardarConfig;window.mv363CerrarModal=cerrar;
  window.MV363_SLA_GESTION_OK=true;console.log('MI VISUAL V363: Tiempo de Gestión SLA habilitado.');
})();
