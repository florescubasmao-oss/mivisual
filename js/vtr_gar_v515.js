/* ============================================================
   MI VISUAL V515B - VTR/GAR: PUNTAJE JEFATURA + MI DESEMPEÑO

   Frontend incremental y compatible con backend anterior:
   - Solo se activa cuando detecta backend V515.
   - Jefatura define BONO/NO BONO + puntaje + comentario.
   - Técnico ve sus VTR/GAR en Producción > detalle por día.
   - Reengancha el detalle tras la carga dinámica de módulos.
   - NO altera puntos ni totales de PRODUCCION_APP.
   - Dashboard queda intacto.
============================================================ */
(function(){
  "use strict";
  if(window.MV515_VTRGAR_FRONT_OK) return;
  window.MV515_VTRGAR_FRONT_OK = true;

  const API = window.MI_VISUAL_API_URL || "https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VERSION = "V515B-VTRGAR-FRONT-20260828";
  let backendEstado = null;
  let backendChequeado = 0;
  let validacionEnvuelta = false;
  let validarBonoBase = null;
  let tokenDetalle = 0;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function usuario(){ return txt(localStorage.getItem("usuario") || localStorage.getItem("correo") || ""); }
  function perfil(){ return norm(localStorage.getItem("perfil") || ""); }
  function cuadrilla(){ return txt(localStorage.getItem("cuadrilla") || ""); }
  function esTecnico(){ return perfil() === "TECNICO"; }
  function esJefatura(){ return perfil().indexOf("JEFATURA") === 0; }

  function periodoActual(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function periodoValido(p){
    const s = txt(p);
    return /^\d{4}-\d{2}$/.test(s) ? s : periodoActual();
  }

  async function leerJson(res){
    const t = (await res.text()).trim();
    if(!t || /^MI VISUAL API OK$/i.test(t) || /^<!doctype|^<html/i.test(t)){
      throw new Error("Backend V515 no disponible");
    }
    let j;
    try{ j = JSON.parse(t); }catch(_){ throw new Error("Respuesta V515 no válida"); }
    return j;
  }

  async function getApi(params){
    const u = new URL(API);
    Object.keys(params || {}).forEach(k=>u.searchParams.set(k,params[k] == null ? "" : String(params[k])));
    u.searchParams.set("_mv515",String(Date.now()));
    const r = await fetch(u.toString(),{method:"GET",cache:"no-store",redirect:"follow",headers:{"Accept":"application/json"}});
    const j = await leerJson(r);
    if(!j || !j.ok) throw new Error((j && j.error) || "No se pudo completar la consulta V515");
    return j;
  }

  async function postApi(payload){
    const r = await fetch(API,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload || {})
    });
    const j = await leerJson(r);
    if(!j || !j.ok) throw new Error((j && j.error) || "No se pudo completar la operación V515");
    return j;
  }

  async function backendDisponible(forzar){
    const ahora = Date.now();
    if(!forzar && backendEstado !== null && ahora-backendChequeado < 60000) return backendEstado;
    backendChequeado = ahora;
    try{
      const r = await getApi({accion:"diagnosticoV515VtrGar"});
      backendEstado = !!(r && r.ok && r.activo && r.versionV515);
    }catch(_){
      backendEstado = false;
    }
    return backendEstado;
  }

  function css(){
    if(document.getElementById("mv515-vtrgar-css")) return;
    const s=document.createElement("style");
    s.id="mv515-vtrgar-css";
    s.textContent=`
      .mv515-vtr-wrap{margin:14px 0 8px;border:1px solid #bfdbfe;border-radius:16px;background:#f8fbff;overflow:hidden;color:#0f172a}
      .mv515-vtr-head{padding:13px 14px;background:#eaf2ff;border-bottom:1px solid #bfdbfe}
      .mv515-vtr-head h4{margin:0;font-size:16px}.mv515-vtr-head p{margin:5px 0 0;color:#475569;font-size:11px;line-height:1.4}
      .mv515-vtr-total{display:inline-flex;margin-top:7px;padding:5px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900}
      .mv515-vtr-body{padding:10px;display:grid;gap:10px}
      .mv515-vtr-day{border:1px solid #dbe3ee;border-radius:13px;background:#fff;overflow:hidden}
      .mv515-vtr-day>summary{cursor:pointer;padding:10px 12px;font-weight:900;background:#f8fafc;display:flex;justify-content:space-between;gap:10px}
      .mv515-vtr-items{padding:8px;display:grid;gap:8px}
      .mv515-vtr-item{border:1px solid #e2e8f0;border-radius:11px;padding:10px;background:#fff}
      .mv515-vtr-line{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      .mv515-vtr-title{font-weight:900;font-size:13px}.mv515-vtr-meta{font-size:11px;color:#475569;margin-top:4px;line-height:1.45}
      .mv515-vtr-score{font-weight:900;font-size:13px;color:#0f172a}
      .mv515-vtr-badge{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#e2e8f0;color:#334155}
      .mv515-vtr-badge.bono{background:#dcfce7;color:#166534}.mv515-vtr-badge.nobono{background:#fee2e2;color:#991b1b}.mv515-vtr-badge.pend{background:#fef3c7;color:#92400e}
      .mv515-vtr-reason{margin-top:8px;border-top:1px dashed #cbd5e1;padding-top:7px}
      .mv515-vtr-reason summary{cursor:pointer;color:#2563eb;font-size:11px;font-weight:900}
      .mv515-vtr-reason div{margin-top:7px;background:#f8fafc;border-radius:9px;padding:8px;font-size:11px;line-height:1.45;color:#334155;white-space:pre-wrap}
    `;
    document.head.appendChild(s);
  }

  function claseResultado(r){
    const x=norm(r);
    if(x === "BONO") return "bono";
    if(x === "NO BONO") return "nobono";
    return "pend";
  }

  function etiquetaResultado(r){
    const x=norm(r);
    if(x === "BONO") return "BONO";
    if(x === "NO BONO") return "NO BONO";
    return "PENDIENTE";
  }

  function scoreItem(x){
    const r=norm(x && x.resultado);
    if(r === "NO BONO") return "0";
    if(r === "BONO" && x && x.puntajeVtrGar != null && Number.isFinite(Number(x.puntajeVtrGar))) return String(Number(x.puntajeVtrGar));
    if(r === "BONO") return "Pendiente de puntaje";
    return "0";
  }

  function htmlDetalleVtrGar(lista){
    const grupos={};
    (lista||[]).forEach(x=>{
      const f=txt(x.fechaISO)||"SIN-FECHA";
      (grupos[f]||(grupos[f]=[])).push(x);
    });
    const totalBono=(lista||[]).reduce((a,x)=>{
      if(norm(x && x.resultado)!=="BONO") return a;
      const n=Number(x && x.puntajeVtrGar);
      return a+(Number.isFinite(n)?n:0);
    },0);
    const dias=Object.keys(grupos).sort().reverse();
    if(!dias.length) return "";

    return `<section id="mv515VtrGarDesempeno" class="mv515-vtr-wrap" data-version="${VERSION}">
      <div class="mv515-vtr-head">
        <h4>📡 VTR / GAR realizados</h4>
        <p>Detalle complementario del técnico. El puntaje lo define Jefatura y se mantiene separado de los puntos de producción ordinaria.</p>
        <span class="mv515-vtr-total">Puntaje VTR/GAR validado: ${totalBono}</span>
      </div>
      <div class="mv515-vtr-body">
        ${dias.map(fecha=>{
          const items=grupos[fecha];
          const fechaVisible=txt(items[0] && items[0].fecha) || fecha;
          return `<details class="mv515-vtr-day" open>
            <summary><span>📅 ${esc(fechaVisible)}</span><span>${items.length} VTR/GAR</span></summary>
            <div class="mv515-vtr-items">
              ${items.map(x=>{
                const resultado=etiquetaResultado(x.resultado);
                const razon=txt(x.motivoValidacion) || "Sin comentario de Jefatura todavía.";
                return `<div class="mv515-vtr-item">
                  <div class="mv515-vtr-line">
                    <div>
                      <div class="mv515-vtr-title">${esc(x.tipo)} · ${esc(x.codigo || "Sin código")}</div>
                      <div class="mv515-vtr-meta">Ticket: <b>${esc(x.ticket || "-")}</b></div>
                    </div>
                    <span class="mv515-vtr-badge ${claseResultado(resultado)}">${esc(resultado)}</span>
                  </div>
                  <div class="mv515-vtr-meta">Puntaje VTR/GAR: <span class="mv515-vtr-score">${esc(scoreItem(x))}</span></div>
                  <details class="mv515-vtr-reason">
                    <summary>Ver razón / comentario</summary>
                    <div>${esc(razon)}</div>
                  </details>
                </div>`;
              }).join("")}
            </div>
          </details>`;
        }).join("")}
      </div>
    </section>`;
  }

  async function anexarDesempeno(periodo, token){
    if(!esTecnico()) return;
    if(!(await backendDisponible(false))) return;
    if(token !== tokenDetalle) return;
    try{
      const r=await getApi({
        accion:"listarDesempenoVtrGarV515",
        usuario:usuario(),
        cuadrilla:cuadrilla(),
        periodo:periodoValido(periodo)
      });
      if(token !== tokenDetalle) return;
      const lista=Array.isArray(r.registros)?r.registros:[];
      const html=htmlDetalleVtrGar(lista);
      if(!html) return;
      css();
      document.getElementById("mv515VtrGarDesempeno")?.remove();
      const pantalla=document.getElementById("pantalla");
      if(pantalla) pantalla.insertAdjacentHTML("beforeend",html);
    }catch(e){
      console.warn("MI VISUAL V515B Mi Desempeño:",e && e.message ? e.message : e);
    }
  }

  function envolverProduccion(){
    const actual=window.mostrarProduccionV2;
    if(typeof actual !== "function") return false;
    if(actual.__mv515) return true;

    const base=actual;
    const envuelta=async function(periodoSeleccionado){
      const token=++tokenDetalle;
      const r=await base.apply(this,arguments);
      setTimeout(()=>anexarDesempeno(periodoSeleccionado,token),20);
      return r;
    };
    envuelta.__mv515=true;
    envuelta.__mv515Base=base;
    window.mostrarProduccionV2=envuelta;
    try{ mostrarProduccionV2=envuelta; }catch(_){}
    return true;
  }

  async function obtenerCasoGestion(clave){
    const r=await postApi({accion:"listarGestionVtrGar",usuario:usuario()});
    const lista=Array.isArray(r.incidencias)?r.incidencias:[];
    return lista.find(x=>txt(x && x.clave)===txt(clave)) || null;
  }

  async function validarBonoV515(clave,resultado){
    try{
      if(!esJefatura()) return validarBonoBase ? validarBonoBase(clave,resultado) : undefined;
      if(!(await backendDisponible(true))) return validarBonoBase ? validarBonoBase(clave,resultado) : alert("Backend V515 aún no está desplegado.");

      const x=await obtenerCasoGestion(clave);
      const v=x && x.validacionBono;
      if(!v || !v.id) return alert("Este caso no tiene un registro de Validación Técnica asociado.");

      const r=norm(resultado);
      let puntaje=0;
      if(r === "BONO"){
        const entrada=prompt("Puntaje VTR/GAR definido por Jefatura:","");
        if(entrada === null) return;
        puntaje=Number(String(entrada).replace(",","."));
        if(!Number.isFinite(puntaje) || puntaje<=0) return alert("Ingrese un puntaje VTR/GAR mayor a 0.");
      }

      const motivo=prompt(`Razón / comentario de Jefatura para ${r}:`,"");
      if(motivo === null) return;
      if(!txt(motivo)) return alert("La razón / comentario es obligatorio.");
      if(!confirm(`¿Confirmar ${r}${r==="BONO"?` con ${puntaje} punto(s)`:""} para ${txt(x.ticket)||"este caso"}?`)) return;

      await postApi({
        accion:"validarBonoVtrGarV515",
        usuario:usuario(),
        id:v.id,
        resultado:r,
        puntajeVtrGar:puntaje,
        motivoValidacion:motivo
      });

      alert(r==="BONO" ? `BONO validado con ${puntaje} punto(s).` : "NO BONO validado. Puntaje: 0.");
      if(typeof window.mv489AbrirValidacionVtrGar === "function") window.mv489AbrirValidacionVtrGar();
    }catch(e){
      alert(e && e.message ? e.message : "No se pudo validar VTR/GAR.");
    }
  }

  async function envolverValidacion(){
    if(validacionEnvuelta || typeof window.mv489ValidarBono !== "function") return false;
    if(!(await backendDisponible(false))) return false;
    validarBonoBase=window.mv489ValidarBono;
    const fn=function(clave,resultado){ return validarBonoV515(clave,resultado); };
    fn.__mv515=true;
    window.mv489ValidarBono=fn;
    validacionEnvuelta=true;
    return true;
  }

  function instalar(){
    envolverProduccion();
    envolverValidacion().catch(()=>{});
  }

  document.addEventListener("click",function(){ setTimeout(instalar,80); },true);
  if(document.body){
    const obs=new MutationObserver(function(){ instalar(); });
    obs.observe(document.body,{childList:true,subtree:true});
  }
  setInterval(instalar,1500);
  setTimeout(instalar,100);
  setTimeout(instalar,600);
})();
