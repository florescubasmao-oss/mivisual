/* ============================================================
   MI VISUAL V517D F4S - TECNICO INTEGRADO + ALCANCE RESTRINGIDO
   29/08/2026

   Alcance ESTRICTO / SOLO FRONTEND:
   - Perfil TECNICO: Validacion Tecnica entra directo al flujo actual.
   - Encabezado tecnico: RECABLEADOS GAR-VTR.
   - Historial tecnico: Recableado + GAR + VTR + Otro en una sola vista.
   - El filtro de sede NO se muestra al Tecnico.
   - Los registros se restringen adicionalmente a su usuario/cuadrilla local.
   - Muestra conteos visibles de Recableado, GAR y VTR para evitar confusiones.
   - Cada registro muestra estado/resultado actualizado del registro tecnico.
   - Al pulsar Actualizar se vuelve a leer el origen vigente y se refleja lo
     validado/corregido por Supervisor o Jefatura en VALIDACION_TECNICA.
   - No modifica API, Sheets, Produccion, Ranking, permisos ni vistas de otros perfiles.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4S_TECNICO_ALCANCE_OK) return;
  window.MV517D_F4S_TECNICO_ALCANCE_OK = true;
  window.MV517D_F4R_TECNICO_INTEGRADO_OK = true;
  window.MV517D_F4Q_TECNICO_DIRECTO_OK = true;
  window.MV517D_F4P_TECNICO_MENU_OK = true;
  window.MV517D_F4O_TECNICO_RESTAURADO_OK = true;

  const MESES=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  let ultimoSalto=0;
  let timerSalto=null;
  let timerVista=null;
  let renderizando=false;

  function txt(v){ return String(v==null?"":v).trim(); }
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
  function esTecnico(){ return norm(localStorage.getItem("perfil")||"")==="TECNICO"; }
  function usuarioTecnico(){ return norm(localStorage.getItem("usuario")||""); }
  function cuadrillaTecnico(){ return norm(localStorage.getItem("cuadrilla")||""); }
  function sedeTecnico(){ return txt(localStorage.getItem("sede")||""); }

  function esSelectorValidacion(root){
    if(!root) return false;
    const t=norm(root.textContent||"");
    if(t.indexOf("VALIDACION TECNICA")<0 || t.indexOf("RECABLEADO")<0) return false;
    return t.indexOf("SELECCIONA EL TIPO DE GESTION")>=0 ||
      t.indexOf("FLUJO ACTUAL CONSERVADO")>=0 ||
      !!root.querySelector('[onclick*="mv488AbrirRecableado"]');
  }

  function botonRecableado(root){
    if(!root) return null;
    return root.querySelector('[onclick*="mv488AbrirRecableado"]') ||
      root.querySelector('[onclick*="AbrirRecableado"]');
  }

  function entrarDirecto(){
    if(!esTecnico()) return;
    const root=document.getElementById("pantalla");
    if(!esSelectorValidacion(root)) return;
    const ahora=Date.now();
    if(ahora-ultimoSalto<1200) return;
    ultimoSalto=ahora;
    root.style.visibility="hidden";

    let ejecutado=false;
    const btn=botonRecableado(root);
    if(btn && typeof btn.click==="function"){
      try{ btn.click(); ejecutado=true; }catch(_){}
    }
    if(!ejecutado && typeof window.mv488AbrirRecableado==="function"){
      try{ window.mv488AbrirRecableado(); ejecutado=true; }catch(_){}
    }
    if(!ejecutado){
      setTimeout(function(){
        if(!esTecnico()) return;
        const r=document.getElementById("pantalla");
        if(!esSelectorValidacion(r)) return;
        const b=botonRecableado(r);
        try{
          if(b && typeof b.click==="function") b.click();
          else if(typeof window.mv488AbrirRecableado==="function") window.mv488AbrirRecableado();
        }catch(_){}
      },180);
    }
    [120,300,650].forEach(function(ms){
      setTimeout(function(){
        const r=document.getElementById("pantalla");
        if(r) r.style.visibility="";
        programarVista(0);
      },ms);
    });
  }

  function instalarCss(){
    if(document.getElementById("mv517d-f4s-tech-css")) return;
    const s=document.createElement("style");
    s.id="mv517d-f4s-tech-css";
    s.textContent=`
      .mv517d-tech-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px;margin:10px 0 12px}
      .mv517d-tech-kpi{background:#f8fafc;border:1px solid #dbe3ee;border-radius:14px;padding:10px;text-align:center}
      .mv517d-tech-kpi b{display:block;font-size:19px;color:#0f172a}.mv517d-tech-kpi span{font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase}
      .mv517d-tech-month{border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#fff;margin:10px 0}
      .mv517d-tech-month>summary{cursor:pointer;list-style:none;padding:12px 14px;background:linear-gradient(90deg,#1e3a8a,#2563eb);color:#fff;font-weight:900;display:flex;justify-content:space-between;gap:8px;align-items:center}
      .mv517d-tech-month>summary::-webkit-details-marker{display:none}.mv517d-tech-month-body{padding:10px;display:grid;gap:9px;background:#f8fafc}
      .mv517d-tech-month-count{font-size:11px;text-align:right;line-height:1.35}
      .mv517d-tech-item{border:1px solid #dbe3ee;border-radius:13px;background:#fff;overflow:hidden}.mv517d-tech-item>summary{cursor:pointer;list-style:none;padding:11px 12px;display:grid;grid-template-columns:1fr 1.2fr auto;gap:9px;align-items:center}
      .mv517d-tech-item>summary::-webkit-details-marker{display:none}.mv517d-tech-id{font-size:13px;font-weight:900;color:#0f172a}.mv517d-tech-sub{font-size:11px;color:#64748b;margin-top:3px;line-height:1.4}
      .mv517d-tech-type{display:inline-flex;padding:3px 7px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:9px;font-weight:900;margin-right:4px}
      .mv517d-tech-type.gar{background:#ede9fe;color:#5b21b6}.mv517d-tech-type.vtr{background:#fce7f3;color:#9d174d}
      .mv517d-tech-state{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap;background:#e2e8f0;color:#334155}
      .mv517d-tech-state.pending{background:#fef3c7;color:#92400e}.mv517d-tech-state.ok{background:#dcfce7;color:#166534}.mv517d-tech-state.info{background:#dbeafe;color:#1d4ed8}.mv517d-tech-state.warn{background:#ffedd5;color:#9a3412}.mv517d-tech-state.bad{background:#fee2e2;color:#991b1b}
      .mv517d-tech-detail{border-top:1px solid #e2e8f0;background:#f8fafc;padding:11px;font-size:12px;line-height:1.6;color:#334155}.mv517d-tech-detail b{color:#0f172a}
      .mv517d-tech-note{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:11px;padding:9px 11px;font-size:11px;margin:8px 0 10px;line-height:1.45}
      @media(max-width:700px){.mv517d-tech-kpis{grid-template-columns:repeat(2,1fr)}.mv517d-tech-item>summary{grid-template-columns:1fr}.mv517d-tech-state{justify-self:start}.mv517d-tech-month>summary{align-items:flex-start}.mv517d-tech-month-count{max-width:45%}}
    `;
    document.head.appendChild(s);
  }

  function parseFecha(item){
    const raw=txt(item && (item.fechaRegistro||item.fecha||item.fechaISO));
    if(!raw) return null;
    let m=raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3]);
    m=raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if(m) return new Date(+m[3],+m[2]-1,+m[1]);
    const d=new Date(raw);
    return Number.isNaN(d.getTime())?null:d;
  }
  function fechaVisible(item){
    const d=parseFecha(item);
    if(!d) return txt(item && item.fechaRegistro)||"-";
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  function periodoItem(item){
    const d=parseFecha(item);
    if(!d) return "SIN FECHA";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
  function periodoVisible(clave){
    const m=String(clave).match(/^(\d{4})-(\d{2})$/);
    if(!m) return clave;
    return `${MESES[Number(m[2])-1]||m[2]} ${m[1]}`;
  }
  function tsItem(item){ const d=parseFecha(item); return d?d.getTime():0; }

  function estadoVisible(item){
    const e=norm(item && (item.estadoVisibleTecnico||item.estado)||"PENDIENTE");
    const r=norm(item && (item.resultadoVisibleTecnico||item.resultadoFinal)||"");
    if(r==="BONO" || r==="NO BONO") return `VALIDADO · ${r}`;
    if(e==="BONO" || e==="NO BONO") return `VALIDADO · ${e}`;
    if(e==="APROBADO") return "VALIDADO · APROBADO";
    if(e==="SIN RESPUESTA") return "APROBADO AUTOMÁTICO";
    if(e==="PENDIENTE" || !e) return "PENDIENTE DE VALIDACIÓN";
    return e;
  }
  function claseEstado(item){
    const e=estadoVisible(item);
    if(e.indexOf("PENDIENTE")>=0) return "pending";
    if(e.indexOf("BONO")>=0 || e.indexOf("APROBADO")>=0) return "ok";
    if(e.indexOf("OBSERVADO")>=0) return "warn";
    if(e.indexOf("RECHAZADO")>=0) return "bad";
    return "info";
  }

  function estaEnAlcanceTecnico(item){
    const u=usuarioTecnico();
    const c=cuadrillaTecnico();
    if(!u && !c) return true;
    const iu=norm(item && item.tecnico);
    const ic=norm(item && item.cuadrilla);
    if(u && iu===u) return true;
    if(c && ic===c) return true;
    return false;
  }

  function filtrosTecnico(lista){
    const tipo=norm(document.getElementById("vtFiltroTipo")?.value||"");
    const estado=norm(document.getElementById("vtFiltroEstado")?.value||"");
    const q=norm(document.getElementById("vtBuscarCodigo")?.value||"");
    return (lista||[]).filter(function(x){
      if(!estaEnAlcanceTecnico(x)) return false;
      const t=norm(x && x.tipoValidacion||"OTRO");
      if(tipo && t!==tipo) return false;
      if(estado){
        const e=norm(x && x.estado);
        const ev=norm(x && x.estadoVisibleTecnico);
        const r=norm(x && (x.resultadoVisibleTecnico||x.resultadoFinal));
        if(e!==estado && ev!==estado && r!==estado) return false;
      }
      if(q){
        const bolsa=norm([
          x && x.codigo,x && x.dniCliente,x && x.ticketFinal,x && x.id,
          x && x.tipoValidacion,x && x.motivoTecnico
        ].join(" "));
        if(bolsa.indexOf(q)<0) return false;
      }
      return true;
    });
  }

  function contarTipos(lista){
    const c={rec:0,gar:0,vtr:0,otro:0};
    (lista||[]).forEach(function(x){
      const t=norm(x && x.tipoValidacion||"OTRO");
      if(t==="RECABLEADO") c.rec++;
      else if(t==="GAR") c.gar++;
      else if(t==="VTR") c.vtr++;
      else c.otro++;
    });
    return c;
  }

  function resumenHtml(lista){
    const c={pend:0,ok:0,obs:0,bono:0,noBono:0};
    const tipos=contarTipos(lista);
    (lista||[]).forEach(function(x){
      const e=estadoVisible(x);
      if(e.indexOf("PENDIENTE")>=0) c.pend++;
      if(e.indexOf("VALIDADO")>=0 || e.indexOf("APROBADO")>=0) c.ok++;
      if(e.indexOf("OBSERVADO")>=0) c.obs++;
      if(e.indexOf("NO BONO")>=0) c.noBono++;
      else if(e.indexOf("BONO")>=0) c.bono++;
    });
    return `<div class="mv517d-tech-kpis">
      <div class="mv517d-tech-kpi"><b>${lista.length}</b><span>Total</span></div>
      <div class="mv517d-tech-kpi"><b>${tipos.rec}</b><span>Recableados</span></div>
      <div class="mv517d-tech-kpi"><b>${tipos.gar}</b><span>GAR</span></div>
      <div class="mv517d-tech-kpi"><b>${tipos.vtr}</b><span>VTR</span></div>
      <div class="mv517d-tech-kpi"><b>${c.pend}</b><span>Pendientes</span></div>
      <div class="mv517d-tech-kpi"><b>${c.ok}</b><span>Validados</span></div>
      <div class="mv517d-tech-kpi"><b>${c.obs}</b><span>Observados</span></div>
      <div class="mv517d-tech-kpi"><b>${c.bono}</b><span>Bono</span></div>
      <div class="mv517d-tech-kpi"><b>${c.noBono}</b><span>No bono</span></div>
    </div>`;
  }

  function itemHtml(x,idx){
    const tipo=norm(x && x.tipoValidacion||"OTRO")||"OTRO";
    const estado=estadoVisible(x);
    const hora=txt(x && x.horaRegistro);
    const resultado=txt(x && (x.resultadoVisibleTecnico||x.resultadoFinal))||"-";
    const validadoPor=txt(x && x.validadoPor)||"-";
    const fechaVal=txt(x && x.fechaValidacion);
    const horaVal=txt(x && x.horaValidacion);
    const tipoClase=tipo==="GAR"?"gar":tipo==="VTR"?"vtr":"";
    return `<details class="mv517d-tech-item">
      <summary>
        <div><span class="mv517d-tech-type ${tipoClase}">${esc(tipo)}</span><span class="mv517d-tech-id">${esc(x && x.id||"REGISTRO")}</span>
          <div class="mv517d-tech-sub">${esc(fechaVisible(x))}${hora?` · ${esc(hora)}`:""} · ${esc(x && x.cuadrilla||"")}</div></div>
        <div class="mv517d-tech-sub"><b>Código:</b> ${esc(x && x.codigo||"-")}<br><b>Ticket:</b> ${esc(x && x.ticketFinal||"-")}</div>
        <span class="mv517d-tech-state ${claseEstado(x)}">${esc(estado)}</span>
      </summary>
      <div class="mv517d-tech-detail">
        <b>Tipo:</b> ${esc(tipo)}<br>
        <b>Código:</b> ${esc(x && x.codigo||"-")}<br>
        <b>Ticket:</b> ${esc(x && x.ticketFinal||"-")}<br>
        <b>DNI:</b> ${esc(x && x.dniCliente||"-")}<br>
        ${tipo==="GAR"||tipo==="VTR"?`<b>Origen:</b> ${esc(x && x.origenOrden||"SIN REGISTRO")}<br>`:""}
        <b>Motivo técnico:</b> ${esc(x && x.motivoTecnico||"-")}<br>
        <b>Estado:</b> ${esc(estado)}<br>
        <b>Resultado:</b> ${esc(resultado)}<br>
        <b>Validado por:</b> ${esc(validadoPor)}<br>
        ${fechaVal||horaVal?`<b>Fecha de validación:</b> ${esc([fechaVal,horaVal].filter(Boolean).join(" · "))}<br>`:""}
        <b>Motivo de validación:</b> ${esc(x && x.motivoValidacion||"-")}
      </div>
    </details>`;
  }

  function resumenMes(items){
    const t=contarTipos(items);
    const partes=[`${items.length} registro${items.length===1?"":"s"}`];
    if(t.rec) partes.push(`REC ${t.rec}`);
    if(t.gar) partes.push(`GAR ${t.gar}`);
    if(t.vtr) partes.push(`VTR ${t.vtr}`);
    if(t.otro) partes.push(`OTRO ${t.otro}`);
    return partes.join(" · ");
  }

  function renderHistorialTecnico(){
    if(!esTecnico() || renderizando) return;
    const hist=document.getElementById("vtHistorial");
    if(!hist) return;
    const base=Array.isArray(window.vtValidacionesActuales)?window.vtValidacionesActuales.slice():[];
    const todas=base.filter(estaEnAlcanceTecnico);
    if(!todas.length){
      hist.innerHTML='<div class="vt-sub">Sin registros dentro de tu alcance.</div>';
      hist.dataset.mv517dF4s="1";
      return;
    }
    renderizando=true;
    try{
      const lista=filtrosTecnico(todas).sort(function(a,b){return tsItem(b)-tsItem(a);});
      const grupos={};
      lista.forEach(function(x){ const p=periodoItem(x); (grupos[p]||(grupos[p]=[])).push(x); });
      const periodos=Object.keys(grupos).sort().reverse();
      const tipos=contarTipos(todas);
      const sede=sedeTecnico();
      let html=resumenHtml(todas)+`<div class="mv517d-tech-note"><b>Mis registros:</b> ${tipos.rec} Recableado(s) · ${tipos.gar} GAR · ${tipos.vtr} VTR${tipos.otro?` · ${tipos.otro} Otro`:""}. ${sede?`Alcance: ${esc(sede)} · `:""}solo se muestran registros de tu usuario/cuadrilla. Los cambios de validación realizados por Supervisor o Jefatura se reflejan al pulsar <b>Actualizar</b>.</div>`;
      if(!lista.length){
        html+='<div class="vt-sub">No hay registros para los filtros seleccionados.</div>';
      }else{
        html+=periodos.map(function(p,i){
          const items=grupos[p];
          return `<details class="mv517d-tech-month" ${i===0?"open":""}>
            <summary><span>📅 ${esc(periodoVisible(p))}</span><span class="mv517d-tech-month-count">${esc(resumenMes(items))}</span></summary>
            <div class="mv517d-tech-month-body">${items.map(itemHtml).join("")}</div>
          </details>`;
        }).join("");
      }
      hist.innerHTML=html;
      hist.dataset.mv517dF4s="1";
    }finally{
      renderizando=false;
    }
  }

  function configurarFiltros(){
    if(!esTecnico()) return;

    const sede=document.getElementById("vtFiltroSede");
    if(sede) sede.remove();

    const tipo=document.getElementById("vtFiltroTipo");
    if(tipo && tipo.dataset.mv517dF4s!=="1"){
      const actual=tipo.value||"";
      tipo.innerHTML=`<option value="">Todos mis registros</option><option value="RECABLEADO">Recableado</option><option value="GAR">GAR</option><option value="VTR">VTR</option><option value="OTRO">Otro</option>`;
      if(["","RECABLEADO","GAR","VTR","OTRO"].includes(actual)) tipo.value=actual;
      else tipo.value="";
      tipo.dataset.mv517dF4s="1";
    }

    const buscar=document.getElementById("vtBuscarCodigo");
    if(buscar) buscar.placeholder="🔍 Buscar por código, DNI o ticket";
  }

  function decorarVistaTecnico(){
    if(!esTecnico()) return;
    instalarCss();
    const root=document.getElementById("pantalla");
    if(!root || !root.querySelector(".vt-wrap")) return;

    const h2=root.querySelector(".vt-header h2");
    if(h2) h2.textContent="🔧 RECABLEADOS GAR-VTR";
    const p=root.querySelector(".vt-header p");
    if(p) p.textContent="Registro, pendientes e historial de Recableados, GAR y VTR en una sola gestión.";

    root.querySelectorAll("button,span").forEach(function(el){
      if(norm(el.textContent)==="RECABLEADO" && (el.closest(".mv488-subnav") || el.className.toString().indexOf("mv488")>=0)){
        el.textContent="🔧 Recableados GAR-VTR";
      }
    });

    root.querySelectorAll("button").forEach(function(b){
      if(norm(b.textContent).indexOf("VOLVER A VALIDACION TECNICA")>=0){
        b.style.display="none";
      }
    });

    configurarFiltros();
    const hist=document.getElementById("vtHistorial");
    if(hist && hist.dataset.mv517dF4s!=="1") renderHistorialTecnico();
  }

  function instalarHookHistorial(){
    if(!esTecnico()) return;
    const actual=window.renderHistorialValidacionLocal;
    if(typeof actual!=="function" || actual.__mv517dF4s) return;
    const base=actual;
    const fn=function(){
      if(esTecnico()){
        renderHistorialTecnico();
        return;
      }
      return base.apply(this,arguments);
    };
    fn.__mv517dF4s=true;
    fn.__mv517dF4sBase=base;
    window.renderHistorialValidacionLocal=fn;
    try{ renderHistorialValidacionLocal=fn; }catch(_){}
  }

  function instalarHookCarga(){
    if(!esTecnico()) return;
    const actual=window.cargarValidacionesTecnicas;
    if(typeof actual!=="function" || actual.__mv517dF4s) return;
    const base=actual;
    const fn=async function(){
      const r=await base.apply(this,arguments);
      if(esTecnico()){
        configurarFiltros();
        renderHistorialTecnico();
      }
      return r;
    };
    fn.__mv517dF4s=true;
    fn.__mv517dF4sBase=base;
    window.cargarValidacionesTecnicas=fn;
    try{ cargarValidacionesTecnicas=fn; }catch(_){}
  }

  function programarVista(ms){
    clearTimeout(timerVista);
    timerVista=setTimeout(function(){
      instalarHookHistorial();
      instalarHookCarga();
      decorarVistaTecnico();
    },ms==null?0:ms);
  }
  function programarSalto(ms){
    clearTimeout(timerSalto);
    timerSalto=setTimeout(entrarDirecto,ms==null?0:ms);
  }

  if(document.body){
    const obs=new MutationObserver(function(){
      if(!esTecnico()) return;
      programarSalto(0);
      programarVista(25);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;
    const card=ev.target&&ev.target.closest?ev.target.closest("#cardValidacionTecnica"):null;
    if(card){
      [0,80,220,500].forEach(function(ms){setTimeout(entrarDirecto,ms);});
    }
    setTimeout(function(){programarVista(0);},60);
  },true);

  document.addEventListener("change",function(ev){
    if(!esTecnico()) return;
    if(ev.target && ["vtFiltroTipo","vtFiltroEstado"].includes(ev.target.id)){
      setTimeout(renderHistorialTecnico,0);
    }
  },true);
  document.addEventListener("input",function(ev){
    if(!esTecnico()) return;
    if(ev.target && ev.target.id==="vtBuscarCodigo") setTimeout(renderHistorialTecnico,0);
  },true);

  [0,80,220,500,1000,1600,2500].forEach(function(ms){
    setTimeout(function(){entrarDirecto(); instalarHookHistorial(); instalarHookCarga(); decorarVistaTecnico();},ms);
  });
  setInterval(function(){
    if(esTecnico()){
      instalarHookHistorial();
      instalarHookCarga();
      configurarFiltros();
    }
  },1800);

  console.log("MI VISUAL V517D F4S: Tecnico integrado con alcance restringido y GAR/VTR visibles por periodo.");
})();