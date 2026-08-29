/* ============================================================
   MI VISUAL V517D F4L - FINALIZADAS NORMALES -> GAR/VTR
   29/08/2026

   Solo JEFZNORTE.
   - Revisa FINALIZADAS que hoy estan en Produccion normal.
   - No mueve nada hasta validacion expresa de Jefatura.
   - SI ES GAR/VTR: retira solo la orden actual de Produccion.
   - NO ES GAR/VTR: la orden permanece en Produccion.
   - El trabajo/antecedente anterior nunca se toca.
   - BONO/NO BONO sigue en la gestion GAR/VTR existente.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4L_FINALIZADAS_OK) return;
  window.MV517D_F4L_FINALIZADAS_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VERSION="V517D-F4L-FRONT-FINALIZADAS-20260829-1";
  const VALIDADOR="JEFZNORTE";
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const perfil=()=>norm(localStorage.getItem("perfil")||"");
  const esValidador=()=>norm(usuario())===VALIDADOR && perfil()==="JEFATURA";

  let DATA=null;
  let BUSCAR="";

  async function post(payload){
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload||{})});
    const t=await r.text();let j;
    try{j=JSON.parse(t);}catch(_){throw new Error("Respuesta no valida del backend F4L.");}
    if(!j||!j.ok) throw new Error(j&&j.error||"No se pudo completar la operacion F4L.");
    return j;
  }

  function periodo(){
    return txt(document.getElementById("mv517c1Periodo")?.value||"") || new Date().toISOString().slice(0,7);
  }

  function css(){
    if(document.getElementById("mv517d-f4l-css")) return;
    const s=document.createElement("style");s.id="mv517d-f4l-css";
    s.textContent=`
      .mv517d-f4l-btn{border:0;border-radius:9px;padding:8px 10px;background:#7c3aed;color:#fff;font-size:9px;font-weight:900;cursor:pointer;margin-left:6px}
      .mv517d-f4l-bg{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:16000;display:flex;align-items:center;justify-content:center;padding:10px}
      .mv517d-f4l-modal{width:min(940px,100%);max-height:94vh;overflow:auto;background:#eef4f8;border-radius:15px;padding:12px;color:#0f172a;box-shadow:0 20px 55px rgba(15,23,42,.28)}
      .mv517d-f4l-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.mv517d-f4l-head h3{margin:0;font-size:18px}.mv517d-f4l-head p{margin:3px 0 0;font-size:9px;color:#475569}
      .mv517d-f4l-close{border:0;border-radius:8px;background:#475569;color:#fff;padding:7px 10px;font-weight:900;cursor:pointer}
      .mv517d-f4l-tools{display:grid;grid-template-columns:1fr auto auto;gap:6px;margin:10px 0}.mv517d-f4l-tools input{border:1px solid #b8c6d6;border-radius:8px;padding:8px;background:#fff}.mv517d-f4l-tools button{border:0;border-radius:8px;padding:8px 10px;font-size:9px;font-weight:900;color:#fff;background:#2563eb;cursor:pointer}.mv517d-f4l-tools button.alt{background:#64748b}
      .mv517d-f4l-note{background:#e7f2ff;border:1px solid #b9d6fa;border-radius:9px;padding:8px 9px;font-size:9px;line-height:1.45;margin:6px 0}
      .mv517d-f4l-count{font-size:10px;font-weight:900;margin:7px 0}.mv517d-f4l-list{display:grid;gap:7px}
      .mv517d-f4l-card{background:#fff;border:1px solid #c7d4e1;border-left:4px solid #7c3aed;border-radius:10px;padding:9px}.mv517d-f4l-top{display:grid;grid-template-columns:1fr 1.4fr auto;gap:8px;align-items:center}.mv517d-f4l-order{font-size:13px;font-weight:950}.mv517d-f4l-ticket{font-size:9px;color:#475569}.mv517d-f4l-cuad{font-size:9px;font-weight:900}.mv517d-f4l-badge{display:inline-block;border-radius:999px;padding:3px 7px;background:#ede9fe;color:#5b21b6;font-size:8px;font-weight:950}
      .mv517d-f4l-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}.mv517d-f4l-field{background:#eef3f8;border-radius:8px;padding:6px;min-width:0}.mv517d-f4l-field small{display:block;font-size:7px;font-weight:900;color:#64748b;text-transform:uppercase}.mv517d-f4l-field b{font-size:9px;overflow-wrap:anywhere}.mv517d-f4l-ant{background:#ecfdf5;border-radius:8px;padding:7px;margin-top:6px;font-size:9px;line-height:1.45}.mv517d-f4l-ant.manual{background:#fff7ed}
      .mv517d-f4l-actions{display:flex;justify-content:flex-end;margin-top:7px}.mv517d-f4l-actions button{border:0;border-radius:8px;background:#7c3aed;color:#fff;padding:7px 10px;font-size:9px;font-weight:900;cursor:pointer}
      .mv517d-f4l-form{background:#f8fafc;border-radius:10px;padding:9px;margin-top:9px}.mv517d-f4l-form label{display:block;font-size:9px;font-weight:900;margin:7px 0 3px}.mv517d-f4l-form select,.mv517d-f4l-form textarea{width:100%;box-sizing:border-box;border:1px solid #b8c6d6;border-radius:8px;padding:8px;background:#fff}.mv517d-f4l-form textarea{min-height:65px;resize:vertical}.mv517d-f4l-form-footer{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}.mv517d-f4l-form-footer button{border:0;border-radius:8px;padding:8px 10px;font-size:9px;font-weight:900;color:#fff;background:#64748b;cursor:pointer}.mv517d-f4l-form-footer button.save{background:#0f766e}.mv517d-f4l-empty{padding:18px;text-align:center;color:#64748b;background:#fff;border-radius:10px}
      .mv517d-f4l-win-original{display:block;margin-top:2px;font-size:7px;color:#7c3aed;font-weight:900}
      @media(max-width:650px){.mv517d-f4l-tools{grid-template-columns:1fr 1fr}.mv517d-f4l-tools input{grid-column:1/-1}.mv517d-f4l-top,.mv517d-f4l-grid{grid-template-columns:1fr}.mv517d-f4l-actions button{width:100%}}
    `;document.head.appendChild(s);
  }

  function nombreCuadrilla(v){
    if(typeof v==="string") return txt(v);
    if(!v||typeof v!=="object") return "";
    return txt(v.cuadrilla||v.nombre||v.valor||v.label||v.codigo||"");
  }

  function opcionesCuadrillas(seleccion){
    const arr=(DATA&&Array.isArray(DATA.cuadrillas)?DATA.cuadrillas:[]).map(nombreCuadrilla).filter(Boolean);
    if(seleccion&&!arr.some(x=>norm(x)===norm(seleccion))) arr.unshift(seleccion);
    return arr.filter((x,i,a)=>a.findIndex(y=>norm(y)===norm(x))===i).map(x=>`<option value="${esc(x)}" ${norm(x)===norm(seleccion)?"selected":""}>${esc(x)}</option>`).join("");
  }

  function antecedenteHtml(x){
    const a=x.antecedente||{};
    if(a.segura){
      return `<div class="mv517d-f4l-ant"><b>Antecedente encontrado:</b> ${esc(a.fechaOrigen||"")} · Orden ${esc(a.ordenOrigen||"")} · ${esc(a.tipoPartidaOrigen||"")}<br><b>${esc(a.dias||"")} dias</b> · Criterio: ${esc(a.criterio||"")}<br><b>Responsable propuesto:</b> ${esc(x.cuadrillaResponsablePropuesta||a.cuadrillaOrigen||"")}</div>`;
    }
    return `<div class="mv517d-f4l-ant manual"><b>Revision manual:</b> no se encontro un antecedente seguro de 1 a 30 dias. Jefatura puede definir GAR/VTR o confirmar que permanece como Produccion normal.</div>`;
  }

  function card(x,i){
    const p=x.partidaActual||{};
    return `<div class="mv517d-f4l-card" data-i="${i}">
      <div class="mv517d-f4l-top">
        <div><div class="mv517d-f4l-order">Orden ${esc(x.ordenId)}</div><div class="mv517d-f4l-ticket">${esc(x.ticketWinOriginal||"Sin ticket WIN")} · ${esc(x.fecha||"")}</div></div>
        <div class="mv517d-f4l-cuad">${esc(x.cuadrillaEjecutora||"")}</div>
        <div><span class="mv517d-f4l-badge">${esc(x.tipoPropuesto||"POR REVISAR")}</span></div>
      </div>
      <div class="mv517d-f4l-grid">
        <div class="mv517d-f4l-field"><small>Tipo trabajo actual</small><b>${esc(x.tipoTrabajoActual||"-")}</b></div>
        <div class="mv517d-f4l-field"><small>Motivo finalizacion</small><b>${esc(x.motivoFinalizacionActual||"-")}</b></div>
        <div class="mv517d-f4l-field"><small>Partida actual Produccion</small><b>${esc(p.codigo||"-")} · ${esc(p.puntos||0)} pts</b></div>
        <div class="mv517d-f4l-field"><small>Codigo pedido</small><b>${esc(x.codigoPedido||"-")}</b></div>
        <div class="mv517d-f4l-field"><small>DNI</small><b>${esc(x.numeroDocumento||"-")}</b></div>
        <div class="mv517d-f4l-field"><small>Estado actual</small><b>PRODUCCION NORMAL</b></div>
      </div>
      ${antecedenteHtml(x)}
      <div class="mv517d-f4l-actions"><button data-f4l-validar="${i}">Validar caso</button></div>
      <div class="mv517d-f4l-form" id="mv517d-f4l-form-${i}" style="display:none"></div>
    </div>`;
  }

  function renderLista(){
    const el=document.getElementById("mv517d-f4l-list");
    const count=document.getElementById("mv517d-f4l-count");
    if(!el||!DATA) return;
    const arr=DATA.candidatos||[];
    if(count) count.textContent=`${DATA.registros||arr.length} caso(s) para revision`;
    el.innerHTML=arr.length?arr.map(card).join(""):`<div class="mv517d-f4l-empty">No hay FINALIZADAS normales candidatas con este filtro.</div>`;
  }

  async function cargar(buscar){
    const p=periodo();
    const load=document.getElementById("mv517d-f4l-count");
    if(load) load.textContent="Buscando...";
    DATA=await post({accion:"listarCandidatosNormalGarVtrV517D4L",usuario:usuario(),periodo:p,buscar:txt(buscar)});
    BUSCAR=txt(buscar);
    renderLista();
  }

  function abrir(){
    if(!esValidador()) return;
    css();
    document.getElementById("mv517d-f4l-bg")?.remove();
    const bg=document.createElement("div");bg.className="mv517d-f4l-bg";bg.id="mv517d-f4l-bg";
    bg.innerHTML=`<div class="mv517d-f4l-modal">
      <div class="mv517d-f4l-head"><div><h3>Revisar FINALIZADAS normales para GAR/VTR</h3><p>Periodo ${esc(periodo())}. Ninguna orden sale de Produccion hasta que Jefatura la confirme.</p></div><button class="mv517d-f4l-close">Cerrar</button></div>
      <div class="mv517d-f4l-note"><b>Regla:</b> el trabajo anterior conserva siempre sus puntos. Si esta orden actual se confirma como GAR/VTR, solo esta orden sale de Produccion; luego BONO/NO BONO se valida en la gestion GAR/VTR habitual.</div>
      <div class="mv517d-f4l-tools"><input id="mv517d-f4l-buscar" placeholder="Orden, ticket, DNI, codigo de pedido o cuadrilla"><button id="mv517d-f4l-search">Buscar</button><button class="alt" id="mv517d-f4l-auto">Ver candidatas</button></div>
      <div class="mv517d-f4l-count" id="mv517d-f4l-count">Cargando...</div><div class="mv517d-f4l-list" id="mv517d-f4l-list"></div>
    </div>`;
    document.body.appendChild(bg);
    bg.querySelector(".mv517d-f4l-close")?.addEventListener("click",()=>bg.remove());
    bg.addEventListener("click",ev=>{if(ev.target===bg)bg.remove();});
    bg.querySelector("#mv517d-f4l-search")?.addEventListener("click",()=>cargar(bg.querySelector("#mv517d-f4l-buscar")?.value).catch(e=>alert(e.message||e)));
    bg.querySelector("#mv517d-f4l-auto")?.addEventListener("click",()=>{const q=bg.querySelector("#mv517d-f4l-buscar");if(q)q.value="";cargar("").catch(e=>alert(e.message||e));});
    bg.querySelector("#mv517d-f4l-buscar")?.addEventListener("keydown",ev=>{if(ev.key==="Enter")cargar(ev.target.value).catch(e=>alert(e.message||e));});
    cargar("").catch(e=>{const el=document.getElementById("mv517d-f4l-list");if(el)el.innerHTML=`<div class="mv517d-f4l-empty">${esc(e.message||e)}</div>`;});
  }

  function abrirForm(i){
    const x=DATA?.candidatos?.[i];if(!x)return;
    const form=document.getElementById(`mv517d-f4l-form-${i}`);if(!form)return;
    if(form.style.display!=="none"){form.style.display="none";return;}
    const a=x.antecedente||{};
    const tipo=(x.tipoPropuesto==="GAR"||x.tipoPropuesto==="VTR")?x.tipoPropuesto:"";
    const resp=x.cuadrillaResponsablePropuesta||a.cuadrillaOrigen||x.cuadrillaEjecutora||"";
    form.innerHTML=`
      <label>Tipo de caso</label><select id="mv517d-f4l-tipo-${i}"><option value="">Seleccione...</option><option value="GAR" ${tipo==="GAR"?"selected":""}>GAR</option><option value="VTR" ${tipo==="VTR"?"selected":""}>VTR</option></select>
      <label>Decision de Jefatura</label><select id="mv517d-f4l-dec-${i}"><option value="">Seleccione...</option><option value="SI_ES_GAR_VTR">SI ES GAR/VTR — retirar esta orden actual de Produccion</option><option value="NO_ES_GAR_VTR">NO ES GAR/VTR — mantener esta orden en Produccion</option></select>
      <div id="mv517d-f4l-respw-${i}"><label>Cuadrilla responsable del KPI GAR/VTR</label><select id="mv517d-f4l-resp-${i}"><option value="">Seleccione...</option>${opcionesCuadrillas(resp)}</select><div class="mv517d-f4l-note"><b>Ejecutora WIN:</b> ${esc(x.cuadrillaEjecutora||"")}<br>Si despues se valida BONO, el puntaje ira a esta cuadrilla ejecutora WIN, no necesariamente a la responsable.</div></div>
      <label>Sustento de Jefatura</label><textarea id="mv517d-f4l-sus-${i}" placeholder="Indique por que corresponde o no corresponde a GAR/VTR"></textarea>
      <div class="mv517d-f4l-form-footer"><button data-f4l-cancel="${i}">Cancelar</button><button class="save" data-f4l-save="${i}">Guardar validacion</button></div>`;
    form.style.display="block";
    form.querySelector(`#mv517d-f4l-dec-${i}`)?.addEventListener("change",ev=>{const w=form.querySelector(`#mv517d-f4l-respw-${i}`);if(w)w.style.display=ev.target.value==="NO_ES_GAR_VTR"?"none":"block";});
  }

  async function guardar(i,btn){
    const x=DATA?.candidatos?.[i];if(!x)return;
    const tipo=txt(document.getElementById(`mv517d-f4l-tipo-${i}`)?.value);
    const decision=txt(document.getElementById(`mv517d-f4l-dec-${i}`)?.value);
    const resp=txt(document.getElementById(`mv517d-f4l-resp-${i}`)?.value);
    const sus=txt(document.getElementById(`mv517d-f4l-sus-${i}`)?.value);
    if(!tipo){alert("Seleccione GAR o VTR.");return;}
    if(!decision){alert("Seleccione SI ES GAR/VTR o NO ES GAR/VTR.");return;}
    if(decision==="SI_ES_GAR_VTR"&&!resp){alert("Seleccione la cuadrilla responsable.");return;}
    if(!sus){alert("Ingrese el sustento de Jefatura.");return;}
    const old=btn.textContent;btn.disabled=true;btn.textContent="Guardando...";
    try{
      const r=await post({accion:"validarCandidatoNormalGarVtrV517D4L",usuario:usuario(),periodo:periodo(),ordenId:x.ordenId,tipo:tipo,decision:decision,cuadrillaResponsable:resp,observacion:sus});
      if(decision==="SI_ES_GAR_VTR"){
        alert(`Caso incorporado a GAR/VTR.\nOrden WIN: ${x.ordenId}\nTicket WIN: ${x.ticketWinOriginal||"-"}\nResponsable: ${r.cuadrillaResponsable||resp}\nEjecutora WIN: ${r.cuadrillaEjecutora||x.cuadrillaEjecutora}\n\nBONO/NO BONO queda pendiente de validacion en Gestion GAR/VTR.`);
      }else{
        alert(`Validacion guardada: NO ES GAR/VTR.\nLa orden ${x.ordenId} permanece en Produccion con su partida de finalizacion.`);
      }
      await cargar(BUSCAR);
      if(typeof window.mv517c1CambiarPeriodo==="function"){
        setTimeout(()=>window.mv517c1CambiarPeriodo(periodo()),80);
      }
    }catch(e){alert(e.message||e);btn.disabled=false;btn.textContent=old;}
  }

  document.addEventListener("click",ev=>{
    const v=ev.target?.closest?.("[data-f4l-validar]");if(v){abrirForm(Number(v.dataset.f4lValidar));return;}
    const c=ev.target?.closest?.("[data-f4l-cancel]");if(c){const f=document.getElementById(`mv517d-f4l-form-${c.dataset.f4lCancel}`);if(f)f.style.display="none";return;}
    const s=ev.target?.closest?.("[data-f4l-save]");if(s){guardar(Number(s.dataset.f4lSave),s);return;}
  },false);

  function inyectarBoton(){
    if(!esValidador()) return;
    if(!document.getElementById("mv517c1Periodo")||!document.querySelector(".mv517c1")) return;
    if(document.getElementById("mv517d-f4l-open")) return;
    css();
    const row=document.querySelector(".mv517c1-period-row")||document.querySelector(".mv517c1-head");
    if(!row)return;
    const b=document.createElement("button");b.id="mv517d-f4l-open";b.className="mv517d-f4l-btn";b.textContent="Revisar finalizadas";b.title="Buscar FINALIZADAS normales que puedan corresponder a GAR/VTR";b.addEventListener("click",abrir);row.appendChild(b);
  }

  function decorarTicketWin(){
    document.querySelectorAll(".mv517c1-case").forEach(card=>{
      const ticketEl=card.querySelector(".mv517c1-ticket");if(!ticketEl||card.dataset.mv517dF4lWin) return;
      if(!/^(?:GAR|VTR)-99\d+/i.test(txt(ticketEl.textContent))) return;
      const m=txt(card.textContent).match(/TICKET_WIN_ORIGINAL\s*:\s*([^|\s]+)/i);
      if(!m)return;
      const n=document.createElement("span");n.className="mv517d-f4l-win-original";n.textContent="Ticket WIN: "+m[1];ticketEl.appendChild(n);card.dataset.mv517dF4lWin="1";
    });
  }

  const obs=new MutationObserver(()=>{inyectarBoton();decorarTicketWin();});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  [0,200,700,1600].forEach(ms=>setTimeout(()=>{inyectarBoton();decorarTicketWin();},ms));
  console.log("MI VISUAL "+VERSION+": revision de FINALIZADAS normales GAR/VTR habilitada para JEFZNORTE.");
})();