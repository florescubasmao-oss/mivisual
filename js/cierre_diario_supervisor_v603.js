/* ============================================================
   MI VISUAL V603 - CIERRE DIARIO SUPERVISOR / FASE 1 SOLO LECTURA
   - Botón dentro del Dashboard Supervisor.
   - Calcula cierre diario sin escribir en Sheets ni Apps Script.
   - Fuentes publicadas: PRODUCCION_APP, CATALOGO_ORDENES,
     BASE_OPERATIVA_HISTORICA, BASE_VTR_GAR_DETECTADA,
     PROGRAMACION_DESCANSOS y USUARIOS.
   - No modifica Ranking, Producción, Descansos, PEXT, GAR/VTR ni Mapa.
============================================================ */
(function(){
  "use strict";
  if(window.MV603_CIERRE_DIARIO_SUPERVISOR) return;
  window.MV603_CIERRE_DIARIO_SUPERVISOR = true;

  const PUB="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub";
  const GID={
    usuarios:"0",
    produccion:"1814992325",
    catalogo:"2013842388",
    base:"1976252550",
    vtrgar:"428033617",
    descansos:"1028257832"
  };

  function norm(v){
    return String(v==null?"":v).trim().toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ");
  }
  function esc(v){
    return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function num(v){ return Number(String(v==null?"":v).replace(",", ".")) || 0; }
  function hoyISO(){
    const d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dia=String(d.getDate()).padStart(2,"0");
    return y+"-"+m+"-"+dia;
  }
  function fechaISO(v){
    const t=String(v||"").trim();
    let m=t.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+"-"+m[2]+"-"+m[3];
    m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0");
    return "";
  }
  function periodoISO(iso){ return String(iso||"").slice(0,7); }

  function parseCSV(texto){
    const filas=[]; let fila=[], campo="", comillas=false;
    for(let i=0;i<texto.length;i++){
      const c=texto[i], n=texto[i+1];
      if(c==='"' && comillas && n==='"'){ campo+='"'; i++; continue; }
      if(c==='"'){ comillas=!comillas; continue; }
      if(c==="," && !comillas){ fila.push(campo); campo=""; continue; }
      if((c==="\n" || c==="\r") && !comillas){
        if(c==="\r" && n==="\n") i++;
        fila.push(campo); campo="";
        if(fila.some(x=>String(x).trim()!=="")) filas.push(fila);
        fila=[]; continue;
      }
      campo+=c;
    }
    if(campo!=="" || fila.length){ fila.push(campo); if(fila.some(x=>String(x).trim()!=="")) filas.push(fila); }
    return filas;
  }

  async function csv(gid){
    const u=PUB+"?gid="+encodeURIComponent(gid)+"&single=true&output=csv&_mv603="+Date.now();
    const r=await fetch(u,{cache:"no-store"});
    if(!r.ok) throw new Error("No se pudo leer una fuente del cierre diario.");
    return parseCSV(await r.text());
  }
  function mapaHeaders(fila){
    const m={}; (fila||[]).forEach((h,i)=>m[norm(h).replace(/[^A-Z0-9]+/g,"_")]=i); return m;
  }
  function col(m,...nombres){
    for(const n of nombres){ const k=norm(n).replace(/[^A-Z0-9]+/g,"_"); if(m[k]!==undefined) return m[k]; }
    return -1;
  }
  function valor(f,i){ return i>=0 ? (f[i]||"") : ""; }

  function cuadrillasDashboard(){
    try{
      if(typeof MV198_DASH_SUPERVISOR_LISTA!=="undefined" && Array.isArray(MV198_DASH_SUPERVISOR_LISTA)){
        return [...new Set(MV198_DASH_SUPERVISOR_LISTA.map(x=>String(x.cuadrilla||"").trim()).filter(Boolean))];
      }
    }catch(_){}
    return [];
  }

  async function cuadrillasSupervisor(){
    const desdeDash=cuadrillasDashboard();
    if(desdeDash.length) return desdeDash;
    const sede=norm(localStorage.getItem("sede"));
    const t=await csv(GID.usuarios), h=mapaHeaders(t[0]||[]);
    const iCuad=col(h,"CUADRILLA"), iSede=col(h,"SEDE"), iPerfil=col(h,"PERFIL"), iEstado=col(h,"ESTADO");
    const out=[];
    t.slice(1).forEach(f=>{
      if(norm(valor(f,iSede))!==sede) return;
      if(norm(valor(f,iPerfil))!=="TECNICO") return;
      if(iEstado>=0 && norm(valor(f,iEstado)||"ACTIVO")!=="ACTIVO") return;
      const c=String(valor(f,iCuad)||"").trim(); if(c && /^P\s*\d+/i.test(c)) out.push(c);
    });
    return [...new Set(out)];
  }

  function estadosDescanso(tabla, cuadrillas, fecha){
    const set=new Set(cuadrillas.map(norm)), h=mapaHeaders(tabla[0]||[]);
    const iFecha=col(h,"FECHA"), iCuad=col(h,"CUADRILLA"), iEstadoDia=col(h,"ESTADO_DIA"),
      iEstadoProg=col(h,"ESTADO_PROGRAMACION"), iEstadoVal=col(h,"ESTADO_VALIDACION"),
      iResJef=col(h,"RESULTADO_JEFATURA"), iNuevo=col(h,"ESTADO_NUEVO"), iVersion=col(h,"VERSION");
    const mapa={};
    tabla.slice(1).forEach((f,idx)=>{
      const c=String(valor(f,iCuad)||"").trim(), k=norm(c);
      if(!set.has(k) || fechaISO(valor(f,iFecha))!==fecha) return;
      const ev=norm(valor(f,iEstadoVal)||valor(f,iEstadoProg));
      const rj=norm(valor(f,iResJef));
      if(!["APROBADO","APLICADO"].includes(ev) && rj!=="APROBADO") return;
      const ver=num(valor(f,iVersion)), anterior=mapa[k];
      if(!anterior || ver>anterior.ver || (ver===anterior.ver && idx>anterior.idx)){
        mapa[k]={ver,idx,estado:norm(valor(f,iNuevo)||valor(f,iEstadoDia)||"EN CAMPO")};
      }
    });
    const out={};
    cuadrillas.forEach(c=>{ out[norm(c)] = (mapa[norm(c)]&&mapa[norm(c)].estado)||"EN CAMPO"; });
    return out;
  }

  async function calcular(fecha){
    const cuadrillas=await cuadrillasSupervisor();
    if(!cuadrillas.length) throw new Error("No se encontraron cuadrillas activas para el Supervisor.");
    const set=new Set(cuadrillas.map(norm));

    const [prod,cat,base,vtrg,desc]=await Promise.all([
      csv(GID.produccion),csv(GID.catalogo),csv(GID.base),csv(GID.vtrgar),csv(GID.descansos)
    ]);

    const hc=mapaHeaders(cat[0]||[]), iCodCat=col(hc,"CODIGO","CÓDIGO"), iPtsCat=col(hc,"PUNTAJE");
    const puntosCodigo={};
    cat.slice(1).forEach(f=>{ const c=norm(valor(f,iCodCat)); if(c && puntosCodigo[c]===undefined) puntosCodigo[c]=num(valor(f,iPtsCat)); });

    const hp=mapaHeaders(prod[0]||[]), iPCuad=col(hp,"CUADRILLA"), iPFecha=col(hp,"FECHA"), iPCod=col(hp,"CODIGO","CÓDIGO"), iPCant=col(hp,"CANTIDAD");
    let puntos=0, ordenesProduccion=0; const actividadProd=new Set();
    prod.slice(1).forEach(f=>{
      const c=norm(valor(f,iPCuad)); if(!set.has(c) || fechaISO(valor(f,iPFecha))!==fecha) return;
      const cant=num(valor(f,iPCant)); if(cant<=0) return;
      actividadProd.add(c); ordenesProduccion+=cant;
      const cod=norm(valor(f,iPCod)); puntos+=cant*(puntosCodigo[cod]!==undefined?puntosCodigo[cod]:1);
    });

    const hb=mapaHeaders(base[0]||[]), iBCuad=col(hb,"CUADRILLA"), iBFecha=col(hb,"FECHA"), iBEstado=col(hb,"ESTADO"), iBClave=col(hb,"CLAVE_REGISTRO","CODIGO_LIQUIDACION");
    const laboraronSet=new Set(actividadProd), finalizadas=new Set();
    base.slice(1).forEach((f,idx)=>{
      const c=norm(valor(f,iBCuad)); if(!set.has(c) || fechaISO(valor(f,iBFecha))!==fecha) return;
      laboraronSet.add(c);
      if(norm(valor(f,iBEstado))==="FINALIZADA") finalizadas.add(String(valor(f,iBClave)||("F"+idx)).trim());
    });

    const hv=mapaHeaders(vtrg[0]||[]), iVFecha=col(hv,"FECHA_INCIDENCIA"), iVTipo=col(hv,"TIPO"),
      iVResp=col(hv,"CUADRILLA_RESPONSABLE"), iVEjec=col(hv,"CUADRILLA_EJECUTORA"), iVClave=col(hv,"CLAVE");
    const vtrKeys=new Set(), garKeys=new Set();
    vtrg.slice(1).forEach((f,idx)=>{
      if(fechaISO(valor(f,iVFecha))!==fecha) return;
      const c=norm(valor(f,iVResp)||valor(f,iVEjec)); if(!set.has(c)) return;
      const key=String(valor(f,iVClave)||("V"+idx)).trim(), tipo=norm(valor(f,iVTipo));
      if(tipo==="VTR") vtrKeys.add(key); else if(tipo==="GAR") garKeys.add(key);
    });

    const estados=estadosDescanso(desc,cuadrillas,fecha);
    const descanso=[], otrosProgramados=[], candidatos=[];
    cuadrillas.forEach(c=>{
      const k=norm(c), e=estados[k]||"EN CAMPO";
      if(e==="DESCANSO") descanso.push(c);
      else if(["VACACIONES","EN CAMPO BOLSA","SIN ACTIVIDAD"].includes(e)) otrosProgramados.push({cuadrilla:c,estado:e});
      else if(!laboraronSet.has(k)) candidatos.push(c);
    });

    const laboraron=cuadrillas.filter(c=>laboraronSet.has(norm(c)));
    const ticketsFinalizados=finalizadas.size || Math.round(ordenesProduccion);
    return {
      fecha, sede:localStorage.getItem("sede")||"", cuadrillas,
      laboraron, descanso, otrosProgramados, candidatos,
      puntos:Math.round(puntos*100)/100,
      vtr:vtrKeys.size, gar:garKeys.size,
      totalVtrGar:vtrKeys.size+garKeys.size,
      ticketsFinalizados,
      promedioTicket:ticketsFinalizados?Math.round((puntos/ticketsFinalizados)*100)/100:0,
      promedioCuadrilla:laboraron.length?Math.round((puntos/laboraron.length)*100)/100:0
    };
  }

  function listaHtml(lista){
    if(!lista || !lista.length) return '<div class="mv603-vacio">Sin registros</div>';
    return '<div class="mv603-lista">'+lista.map(x=>'<span>'+esc(typeof x==="string"?x:(x.cuadrilla+" · "+x.estado))+'</span>').join("")+'</div>';
  }
  function renderResultado(r){
    return '<div class="mv603-grid">'+
      kpi("👷","Cuadrillas laboraron",r.laboraron.length,"de "+r.cuadrillas.length+" activas")+
      kpi("😴","Cuadrillas descanso",r.descanso.length,"programadas")+
      kpi("⚠️","Faltas / quiebres",r.candidatos.length,"candidatas por validar")+
      kpi("⭐","Puntos efectuados",r.puntos.toFixed(1),"jornada")+
      kpi("📡","VTR / Garantías",r.totalVtrGar,"VTR "+r.vtr+" · GAR "+r.gar)+
      kpi("🎫","Promedio ticket",r.promedioTicket.toFixed(2),"pts / orden finalizada")+
      kpi("📊","Promedio por cuadrilla",r.promedioCuadrilla.toFixed(2),"pts / cuadrilla laborada")+
      '</div>'+
      '<div class="mv603-detalles">'+
      detalle("👷 Laboraron",listaHtml(r.laboraron))+
      detalle("😴 Descanso",listaHtml(r.descanso))+
      detalle("⚠️ Posibles faltas / quiebres",listaHtml(r.candidatos),true)+
      (r.otrosProgramados.length?detalle("📌 Otros estados programados",listaHtml(r.otrosProgramados)):"")+
      '</div>'+
      '<div class="mv603-nota">Faltas/quiebres se marcan como <b>candidatas</b> cuando una cuadrilla estaba programada EN CAMPO y no tiene actividad registrada en la base del día. En la siguiente fase el Supervisor confirmará el motivo antes de cerrar la jornada.</div>';
  }
  function kpi(i,t,v,s){ return '<div class="mv603-kpi"><small>'+i+' '+esc(t)+'</small><b>'+esc(v)+'</b><span>'+esc(s)+'</span></div>'; }
  function detalle(t,c,alerta){ return '<div class="mv603-det '+(alerta?"mv603-alerta":"")+'"><b>'+t+'</b>'+c+'</div>'; }

  async function ejecutar(){
    const fecha=document.getElementById("mv603Fecha").value;
    const cont=document.getElementById("mv603Resultado");
    if(!fecha) return;
    cont.innerHTML='<div class="mv603-cargando">Calculando cierre diario...</div>';
    try{ cont.innerHTML=renderResultado(await calcular(fecha)); }
    catch(e){ cont.innerHTML='<div class="mv603-error">'+esc(e.message||e)+'</div>'; }
  }

  function abrir(){
    if(norm(localStorage.getItem("perfil"))!=="SUPERVISOR") return;
    cerrar();
    const o=document.createElement("div"); o.id="mv603Overlay"; o.className="mv603-overlay";
    o.innerHTML='<div class="mv603-modal">'+
      '<div class="mv603-head"><div><small>📋 CIERRE DIARIO</small><h2>Resumen de jornada del Supervisor</h2><span>'+esc(localStorage.getItem("sede")||"")+' · Vista previa V603</span></div><button id="mv603Cerrar">✕</button></div>'+
      '<div class="mv603-toolbar"><label>Fecha <input id="mv603Fecha" type="date" max="'+hoyISO()+'" value="'+hoyISO()+'"></label><button id="mv603Calcular">↻ Calcular cierre</button><span class="mv603-solo">SOLO LECTURA</span></div>'+
      '<div id="mv603Resultado"><div class="mv603-cargando">Preparando cierre...</div></div>'+
      '</div>';
    document.body.appendChild(o);
    document.getElementById("mv603Cerrar").onclick=cerrar;
    document.getElementById("mv603Calcular").onclick=ejecutar;
    o.addEventListener("click",e=>{if(e.target===o)cerrar();});
    ejecutar();
  }
  function cerrar(){ const x=document.getElementById("mv603Overlay"); if(x)x.remove(); }

  function estilo(){
    if(document.getElementById("mv603Style"))return;
    const s=document.createElement("style"); s.id="mv603Style"; s.textContent=`
      .mv603-boton-wrap{margin:12px 0 4px;display:flex;justify-content:flex-end}
      .mv603-boton{border:0;border-radius:13px;padding:11px 16px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(37,99,235,.25)}
      .mv603-overlay{position:fixed;inset:0;background:rgba(2,6,23,.78);z-index:999999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}
      .mv603-modal{width:min(1050px,100%);background:#0b1f39;color:#fff;border-radius:20px;border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.45);padding:18px}
      .mv603-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mv603-head h2{margin:3px 0 4px;font-size:22px}.mv603-head small,.mv603-head span{color:#9fc2e7;font-weight:800}.mv603-head button{border:0;border-radius:10px;background:#334155;color:#fff;padding:8px 11px;cursor:pointer}
      .mv603-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:18px 0}.mv603-toolbar label{font-size:11px;color:#9fc2e7;font-weight:900}.mv603-toolbar input{display:block;margin-top:5px;padding:9px 10px;border-radius:10px;border:1px solid #64748b}.mv603-toolbar button{border:0;border-radius:10px;padding:10px 14px;background:#16a34a;color:#fff;font-weight:900;cursor:pointer}.mv603-solo{padding:9px 11px;border-radius:999px;background:#1e3a8a;color:#dbeafe;font-size:10px;font-weight:900}
      .mv603-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.mv603-kpi{background:#102844;border:1px solid rgba(148,163,184,.2);border-radius:15px;padding:13px}.mv603-kpi small{display:block;color:#9fc2e7;font-weight:900}.mv603-kpi b{display:block;font-size:25px;margin:6px 0}.mv603-kpi span{font-size:11px;color:#b8cbe0}
      .mv603-detalles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.mv603-det{background:#102844;border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:12px}.mv603-alerta{border-color:#f59e0b}.mv603-lista{display:flex;flex-direction:column;gap:5px;margin-top:8px}.mv603-lista span,.mv603-vacio{font-size:11px;color:#cbd5e1;padding:6px 8px;border-radius:8px;background:#0b1f39}.mv603-nota{margin-top:12px;padding:11px;border-radius:12px;background:#172554;color:#dbeafe;font-size:11px;line-height:1.45}.mv603-error{background:#7f1d1d;padding:12px;border-radius:12px}.mv603-cargando{padding:24px;text-align:center;color:#bfdbfe}
      @media(max-width:760px){.mv603-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mv603-detalles{grid-template-columns:1fr}.mv603-overlay{padding:10px}.mv603-modal{padding:13px}}
    `; document.head.appendChild(s);
  }

  function inyectar(){
    if(norm(localStorage.getItem("perfil"))!=="SUPERVISOR") return;
    const page=document.querySelector(".mv4-page"), top=document.querySelector(".mv4-top-card");
    if(!page||!top||document.getElementById("mv603Boton")) return;
    const w=document.createElement("div"); w.className="mv603-boton-wrap";
    w.innerHTML='<button id="mv603Boton" class="mv603-boton">📋 CIERRE DIARIO</button>';
    top.insertAdjacentElement("afterend",w);
    document.getElementById("mv603Boton").onclick=abrir;
  }

  estilo();
  const obs=new MutationObserver(()=>setTimeout(inyectar,0));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("load",()=>{inyectar();setTimeout(inyectar,800);});
  window.mv603AbrirCierreDiario=abrir;
})();