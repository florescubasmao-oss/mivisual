/* ==========================================================
   MI VISUAL V477A3 - PERIODOS + REVISAR COINCIDENCIAS GAR/VTR
   - Agrupa la gestion por periodo (mes/año) y luego por sede.
   - Permite reconsultar coincidencias de casos ya calificados.
   - La reconsulta es GET / solo lectura.
   - No cambia el veredicto; para corregir se usa Validar nuevamente.
========================================================== */
(function(){
  "use strict";

  if(window.MI_VISUAL_V477A3_FRONT_ACTIVO)return;
  window.MI_VISUAL_V477A3_FRONT_ACTIVO=true;

  const VERSION="V477A3-PERIODOS-REVISAR-COINCIDENCIAS";
  let instalado=false;
  const revisando=new Set();

  function norm(v){
    return (v==null?"":String(v)).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  function esc(v){
    return (v==null?"":String(v)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function periodoClave(x){
    const iso=String(x&&x.fechaISO||"").trim();
    let m=iso.match(/^(\d{4})-(\d{2})/);
    if(m)return `${m[1]}-${m[2]}`;
    const vis=String(x&&x.fecha||"").trim();
    m=vis.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if(m)return `${m[3]}-${String(m[2]).padStart(2,"0")}`;
    return "SIN-PERIODO";
  }

  function periodoTitulo(clave){
    if(clave==="SIN-PERIODO")return "SIN PERÍODO";
    const m=String(clave).match(/^(\d{4})-(\d{2})$/);
    if(!m)return clave;
    const meses=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    return `${meses[Math.max(0,Math.min(11,Number(m[2])-1))]} ${m[1]}`;
  }

  function css(){
    if(document.getElementById("mv477a3-css"))return;
    const s=document.createElement("style");
    s.id="mv477a3-css";
    s.textContent=`
      .mv477a3-periodo{border:1px solid #64748b;border-radius:15px;margin:14px 0;overflow:hidden;background:#0b1220}
      .mv477a3-periodo>summary{cursor:pointer;padding:13px 15px;background:#1e293b;color:#f8fafc;font-weight:900;letter-spacing:.2px}
      .mv477a3-periodo-cuerpo{padding:8px 10px 10px}
      .mv477a3-revisar{background:#0369a1!important}
      .mv477a3-result{margin:10px 0 2px;padding:11px 12px;border-radius:11px;border:1px solid #93c5fd;background:#eff6ff;color:#1e3a8a;font-size:11px;line-height:1.5}
      .mv477a3-result.ok{border-color:#86efac;background:#f0fdf4;color:#14532d}
      .mv477a3-result.warn{border-color:#fdba74;background:#fff7ed;color:#9a3412}
      .mv477a3-result.error{border-color:#fecaca;background:#fef2f2;color:#991b1b}
      .mv477a3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px;margin-top:7px}
      @media(max-width:760px){.mv477a3-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function urlApi(){
    return (typeof API_BASE_OPERATIVA!=="undefined"&&API_BASE_OPERATIVA)
      ? API_BASE_OPERATIVA
      : (window.MI_VISUAL_API_URL||"");
  }

  async function revisarApi(clave){
    const base=urlApi();
    if(!base)throw new Error("No se encontró la URL de MI VISUAL.");
    const url=new URL(base);
    url.searchParams.set("accion","revisarCoincidenciaVtrGarV477A3");
    url.searchParams.set("usuario",typeof boUsuario==="function"?boUsuario():"");
    url.searchParams.set("clave",clave||"");
    url.searchParams.set("_",String(Date.now()));
    const r=await fetch(url.toString(),{method:"GET",cache:"no-store"});
    const t=await r.text();
    let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("La versión V477A3 todavía no está desplegada en Apps Script.");}
    if(!j||j.accion!=="REVISAR_COINCIDENCIA_V477A3"){
      if(j&&j.ok===false)throw new Error(j.error||"No se pudo revisar la coincidencia.");
      throw new Error("La versión V477A3 todavía no está desplegada en Apps Script.");
    }
    if(!j.ok)throw new Error(j.error||"No se pudo revisar la coincidencia.");
    return j;
  }

  function veredictoVisible(x){
    const estado=norm(x&&x.estadoCalificacion||"PENDIENTE");
    if(estado==="ANULADO")return "ANULADA";
    const responsable=norm(x&&x.cuadrillaResponsable||"");
    const ejecutora=norm(x&&x.cuadrillaEjecutora||"");
    if(estado==="REASIGNADO"||(responsable&&ejecutora&&responsable!==ejecutora))return "ASIGNADA";
    if(estado==="CONFIRMADO")return "PROPIA";
    return estado||"PENDIENTE";
  }

  function renderResultado(i,j){
    const host=document.getElementById(`mv477a3Coinc_${i}`);
    if(!host)return;
    const x=(typeof BO_INCIDENCIAS!=="undefined"&&BO_INCIDENCIAS[i])||{};
    const d=j&&j.deteccion||{};
    const actual=veredictoVisible(x);

    if(!d.segura){
      host.className="mv477a3-result warn";
      host.innerHTML=`<b>🔎 Revisión realizada contra la base histórica actualizada.</b><br>
        Veredicto actual: <b>${esc(actual)}</b>.<br>
        No se encontró una nueva coincidencia segura dentro de los 30 días: ${esc(d.motivo||"requiere revisión manual")}.
        <div class="bo-actions"><button class="bo-mini-btn mv477a-revalidar" onclick="boAbrirEditorVtrGar(${i})">🔄 Validar nuevamente</button></div>`;
      return;
    }

    const propuesta=norm(d.propuesta||d.origenOrden||"");
    const coincide=propuesta===actual;
    host.className=`mv477a3-result ${coincide?"ok":"warn"}`;
    host.innerHTML=`<b>${coincide?"✅ La nueva revisión coincide con el veredicto actual.":"⚠️ Se encontró una coincidencia que puede justificar revisar el veredicto."}</b>
      <div class="mv477a3-grid">
        <div>Veredicto actual: <b>${esc(actual)}</b></div>
        <div>Nueva propuesta: <b>${esc(propuesta||"-")}</b></div>
        <div>Trabajo anterior: <b>${esc(d.tipoTrabajoOrigen||"-")}</b></div>
        <div>Fecha anterior: <b>${esc(d.fechaOrigen||"-")}</b></div>
        <div>Cuadrilla origen: <b>${esc(d.cuadrillaOrigen||"-")}</b></div>
        <div>Atendió ${esc(x.tipo||"GAR/VTR")}: <b>${esc(x.cuadrillaEjecutora||"-")}</b></div>
        <div>Días transcurridos: <b>${esc(d.diasTranscurridos==null?"-":d.diasTranscurridos)}</b></div>
        <div>Históricos revisados: <b>${Number(j&&j.rendimiento&&j.rendimiento.historicosEvaluados||0)}</b></div>
      </div>
      <div style="margin-top:7px"><b>La revisión no cambió ningún dato.</b> Si corresponde corregir el caso, use Validar nuevamente.</div>
      <div class="bo-actions"><button class="bo-mini-btn mv477a-revalidar" onclick="boAbrirEditorVtrGar(${i})">🔄 Validar nuevamente</button></div>`;
  }

  window.mv477a3RevisarCoincidencia=async function(i,boton){
    if(revisando.has(i))return;
    const x=(typeof BO_INCIDENCIAS!=="undefined"&&BO_INCIDENCIAS[i])||null;
    if(!x)return;
    revisando.add(i);
    const original=boton?boton.innerHTML:"";
    if(boton){boton.disabled=true;boton.innerHTML="⏳ Revisando coincidencias...";}
    const host=document.getElementById(`mv477a3Coinc_${i}`);
    if(host){host.className="mv477a3-result";host.innerHTML="Consultando nuevamente el DNI contra la base histórica actualizada...";}
    try{
      const r=await revisarApi(x.clave);
      renderResultado(i,r);
    }catch(e){
      if(host){host.className="mv477a3-result error";host.innerHTML=`<b>No se pudo revisar la coincidencia.</b><br>${esc(e&&e.message||e)}`;}
    }finally{
      revisando.delete(i);
      if(boton){boton.disabled=false;boton.innerHTML=original||"🔎 Revisar nuevamente coincidencias";}
    }
  };

  function instalar(){
    if(instalado)return true;
    if(!window.MI_VISUAL_V477A ||
       typeof boAgruparIndicesVg!=="function" ||
       typeof boTarjetaVg!=="function" ||
       typeof boAbrirEditorVtrGar!=="function")return false;

    instalado=true;
    css();

    const agruparSede=boAgruparIndicesVg;
    boAgruparIndicesVg=function(indices,historial){
      const grupos={};
      (indices||[]).forEach(i=>{
        const x=BO_INCIDENCIAS[i]||{};
        const p=periodoClave(x);
        (grupos[p]||(grupos[p]=[])).push(i);
      });
      const claves=Object.keys(grupos).sort((a,b)=>b.localeCompare(a));
      return claves.map(p=>`<details class="mv477a3-periodo" open>
        <summary>📅 ${esc(periodoTitulo(p))} · ${grupos[p].length} registro(s)</summary>
        <div class="mv477a3-periodo-cuerpo">${agruparSede(grupos[p],historial)}</div>
      </details>`).join("")||`<div class="bo-msg">No hay registros.</div>`;
    };

    const tarjetaBase=boTarjetaVg;
    boTarjetaVg=function(i,historial){
      let html=tarjetaBase.apply(this,arguments);
      if(!historial)return html;
      const bloque=`<div class="bo-inc-actions">
        <button class="bo-mini-btn mv477a3-revisar" onclick="mv477a3RevisarCoincidencia(${i},this)">🔎 Revisar nuevamente coincidencias</button>
      </div><div id="mv477a3Coinc_${i}"></div>`;
      const pos=html.lastIndexOf("</div>");
      return pos>=0?html.slice(0,pos)+bloque+html.slice(pos):html+bloque;
    };

    window.MI_VISUAL_V477A3={version:VERSION,modo:"REVISION_SOLO_LECTURA",periodos:true};
    return true;
  }

  function intentar(n){
    if(instalar())return;
    if(n>40)return;
    setTimeout(()=>intentar(n+1),75);
  }

  intentar(0);

  const obs=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of Array.from(m.addedNodes||[])){
        if(n&&n.tagName==="SCRIPT"&&String(n.src||"").includes("base_operativa.js")){
          setTimeout(()=>intentar(0),0);
        }
      }
    }
    if(instalado)obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
