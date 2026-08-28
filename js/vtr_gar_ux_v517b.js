/* ============================================================
   MI VISUAL V517B - UX GAR/VTR
   Alcance estricto de frontend:
   - Corrige Registro <-> Validacion.
   - Agrupa acciones en un solo "Gestionar caso".
   - Delinea mejor cada tarjeta.
   - Cachea por 2 min las consultas V517A y notificaciones.
   - Precalienta la consolidacion al abrir GAR/VTR.
   - NO modifica backend, Ranking, Dashboard ni Produccion.
============================================================ */
(function(){
  "use strict";
  if(window.MV517B_VTRGAR_UX_OK) return;
  window.MV517B_VTRGAR_UX_OK=true;

  const TTL=2*60*1000;
  const CACHE=new Map();
  const BASE_FETCH=window.fetch.bind(window);
  let registroHook=false;
  let timer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function perfil(){return norm(localStorage.getItem("perfil")||"");}
  function esJefatura(){return norm(usuario())==="JEFZNORTE"&&perfil()==="JEFATURA";}
  function api(){return window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";}

  function css(){
    if(document.getElementById("mv517b-ux-css"))return;
    const s=document.createElement("style");
    s.id="mv517b-ux-css";
    s.textContent=`
      .mv517a-case{border:2px solid #b8c7d9!important;box-shadow:0 2px 7px rgba(15,23,42,.07)!important;margin-bottom:9px!important}
      .mv517a-case[open]{border-color:#86a5c7!important;box-shadow:0 4px 12px rgba(15,23,42,.10)!important}
      .mv517a-case>summary{padding:11px 12px!important}
      .mv517a-detail{border-top:2px solid #d6e0eb!important}
      .mv517b-manage{display:flex;justify-content:flex-end;width:100%}
      .mv517b-manage-btn{border:0;border-radius:9px;padding:9px 13px;background:#0f766e;color:#fff;font-size:10px;font-weight:900;cursor:pointer}
      .mv517b-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:12000;display:flex;align-items:center;justify-content:center;padding:12px}
      .mv517b-modal{width:min(540px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:15px;color:#0f172a}
      .mv517b-modal h3{margin:0 0 6px}.mv517b-modal label{display:block;font-size:10px;font-weight:900;margin:10px 0 4px}
      .mv517b-modal select,.mv517b-modal textarea,.mv517b-modal input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:9px;background:#fff}
      .mv517b-modal textarea{min-height:70px;resize:vertical}
      .mv517b-block{border:1px solid #dbe3ee;border-radius:12px;padding:10px;margin-top:10px;background:#f8fafc}
      .mv517b-note{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:10px;padding:8px;font-size:10px;margin-top:8px}
      .mv517b-warn{border:1px solid #fbbf24;background:#fffbeb;color:#78350f;border-radius:10px;padding:8px;font-size:10px;margin-top:8px}
      .mv517b-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
      .mv517b-btn{border:0;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:900;color:#fff;background:#15803d;cursor:pointer}
      .mv517b-btn.alt{background:#475569}
      @media(max-width:520px){.mv517b-modal{padding:12px}.mv517b-actions .mv517b-btn{flex:1}}
    `;
    document.head.appendChild(s);
  }

  function cacheKey(input,init){
    try{
      const method=norm(init&&init.method||"GET");
      const url=String(typeof input==="string"?input:(input&&input.url)||"");
      if(method==="GET"&&url.includes("accion=notificacionVtrGarV517A")) return "GET|"+url;
      if(method==="POST"&&typeof init?.body==="string"){
        const b=JSON.parse(init.body);
        if(b&&b.accion==="listarVtrGarV517A") return "POST|listar|"+norm(b.usuario)+"|"+txt(b.periodo||"AUTO");
      }
    }catch(_){}
    return "";
  }

  window.fetch=function(input,init){
    const key=cacheKey(input,init);
    if(!key) return BASE_FETCH(input,init);
    const c=CACHE.get(key);
    if(c&&Date.now()-c.ts<TTL){
      return Promise.resolve(new Response(c.text,{status:200,headers:{"Content-Type":"application/json"}}));
    }
    return BASE_FETCH(input,init).then(async r=>{
      try{
        if(r.ok){
          const t=await r.clone().text();
          CACHE.set(key,{ts:Date.now(),text:t});
        }
      }catch(_){}
      return r;
    });
  };

  function limpiarCache(){CACHE.clear();}
  window.mv517bLimpiarCache=limpiarCache;

  function preCalentar(){
    const u=usuario();
    if(!u||perfil()==="TECNICO")return;
    const periodo=txt(document.getElementById("mv517aPeriodo")?.value||"");
    const body={accion:"listarVtrGarV517A",usuario:u};
    if(periodo)body.periodo=periodo;
    window.fetch(api(),{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)}).catch(()=>{});
  }

  function hookRegistro(){
    if(registroHook||!window.MV517A_VTRGAR_UI_OK||typeof window.mv488AbrirVtrGar!=="function")return;
    registroHook=true;
    const abrirBase=window.mv488AbrirVtrGar;
    window.mv488AbrirVtrGar=function(){
      const r=abrirBase.apply(this,arguments);
      setTimeout(preCalentar,80);
      return r;
    };
    window.mv489AbrirRegistroVtrGar=function(){
      window.MV488_VT_MODO="VTRGAR";
      return window.mv488AbrirVtrGar();
    };
  }

  function datosAccion(box){
    const botones=Array.from(box.querySelectorAll("button"));
    let kind="",id="",validacionId="";
    botones.forEach(b=>{
      const oc=txt(b.getAttribute("onclick"));
      let m=oc.match(/mv517aDecision\('([^']+)','([^']+)','([^']+)'\)/);
      if(m&&!id){kind=m[1];id=m[2];}
      m=oc.match(/mv517aBono\('([^']+)','BONO'\)/);
      if(m)validacionId=m[1];
    });
    return {kind,id,validacionId};
  }

  function transformarAcciones(){
    css();
    document.querySelectorAll(".mv517a-detail > .mv517a-actions").forEach(box=>{
      if(box.dataset.mv517b==="1")return;
      const meta=datosAccion(box);
      if(!meta.id)return;
      box.dataset.mv517b="1";
      box.innerHTML=`<div class="mv517b-manage"><button type="button" class="mv517b-manage-btn">⚙ Gestionar caso</button></div>`;
      box.querySelector("button").onclick=function(){abrirGestion(meta,box.closest(".mv517a-case"));};
    });
  }

  function valorPeriodo(){return txt(document.getElementById("mv517aPeriodo")?.value||"2026-08");}

  function abrirGestion(meta,card){
    if(!esJefatura())return;
    const titulo=txt(card?.querySelector(".mv517a-ticket")?.textContent||meta.id);
    const etiquetas=norm(card?.querySelector(".mv517a-badges")?.textContent||"");
    const tieneRegistro=!etiquetas.includes("NO REGISTRADA")&&!!meta.validacionId;
    const opcionesCuadrilla=Array.from(document.querySelectorAll("#mv517aContenido .mv517a-case")).map(c=>txt(c.querySelector("summary div:nth-child(2)")?.textContent)).filter(Boolean);
    const cuadUnicas=Array.from(new Set(opcionesCuadrilla)).sort();

    const bg=document.createElement("div");
    bg.className="mv517b-modal-bg";
    bg.innerHTML=`<div class="mv517b-modal">
      <h3>⚙ Gestionar ${esc(titulo)}</h3>
      <div class="mv517b-note">Las decisiones se guardan en un solo flujo. Si no quieres cambiar una sección, déjala en <b>Sin cambios</b>.</div>

      <div class="mv517b-block">
        <b>1. Clasificación GAR/VTR</b>
        <label>Decisión</label>
        <select id="mv517bClas"><option value="SIN_CAMBIO">Sin cambios</option><option value="CORRESPONDE">Confirmar GAR/VTR</option><option value="REASIGNAR">Reasignar responsable</option><option value="NO_ES_GAR_VTR">NO ES GAR/VTR</option><option value="ANULAR">Anular clasificación</option></select>
        <div id="mv517bCuadWrap" style="display:none"><label>Cuadrilla responsable</label><select id="mv517bCuad"><option value="">Seleccione...</option>${cuadUnicas.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></div>
        <label>Comentario / sustento</label><textarea id="mv517bComClas" placeholder="Motivo de la clasificación"></textarea>
        <div id="mv517bNoGarWarn" class="mv517b-warn" style="display:none">Si está FINALIZADA y eliges <b>NO ES GAR/VTR</b>, quedará identificada para recuperar Producción en la etapa posterior. V517B todavía no modifica PRODUCCION_APP.</div>
      </div>

      ${tieneRegistro?`<div class="mv517b-block"><b>2. Validación del registro técnico</b><label>Resultado</label><select id="mv517bBono"><option value="SIN_CAMBIO">Sin cambios</option><option value="BONO">BONO</option><option value="NO BONO">NO BONO</option></select><div id="mv517bPuntWrap" style="display:none"><label>Puntaje VTR/GAR</label><input id="mv517bPunt" type="number" min="0" step="0.1"></div><label>Comentario Bono / No Bono</label><textarea id="mv517bComBono" placeholder="Motivo de la validación"></textarea></div>`:`<div class="mv517b-note">No hay registro técnico asociado; Bono / No Bono no se habilita para este caso.</div>`}

      <div class="mv517b-actions"><button class="mv517b-btn" id="mv517bGuardar">Guardar cambios</button><button class="mv517b-btn alt" id="mv517bCancelar">Cancelar</button></div>
    </div>`;
    document.body.appendChild(bg);

    const clas=bg.querySelector("#mv517bClas");
    const cuadWrap=bg.querySelector("#mv517bCuadWrap");
    const warn=bg.querySelector("#mv517bNoGarWarn");
    const bono=bg.querySelector("#mv517bBono");
    function sync(){
      cuadWrap.style.display=clas.value==="REASIGNAR"?"block":"none";
      warn.style.display=clas.value==="NO_ES_GAR_VTR"?"block":"none";
      if(bono)bg.querySelector("#mv517bPuntWrap").style.display=bono.value==="BONO"?"block":"none";
    }
    clas.onchange=sync;if(bono)bono.onchange=sync;sync();
    bg.querySelector("#mv517bCancelar").onclick=()=>bg.remove();

    bg.querySelector("#mv517bGuardar").onclick=async function(){
      const decision=clas.value;
      const resultado=bono?bono.value:"SIN_CAMBIO";
      if(decision==="SIN_CAMBIO"&&resultado==="SIN_CAMBIO"){alert("No has seleccionado cambios.");return;}
      const comentarioClas=txt(bg.querySelector("#mv517bComClas").value);
      const cuadrilla=txt(bg.querySelector("#mv517bCuad")?.value);
      if(decision==="REASIGNAR"&&!cuadrilla){alert("Seleccione la cuadrilla responsable.");return;}
      if((decision==="ANULAR"||decision==="NO_ES_GAR_VTR")&&!comentarioClas){alert("Ingrese el motivo de la clasificación.");return;}
      const comentarioBono=txt(bg.querySelector("#mv517bComBono")?.value);
      let puntaje=0;
      if(resultado!=="SIN_CAMBIO"){
        if(!comentarioBono){alert("Ingrese el comentario de Bono / No Bono.");return;}
        if(resultado==="BONO"){
          puntaje=Number(bg.querySelector("#mv517bPunt")?.value);
          if(!isFinite(puntaje)||puntaje<=0){alert("Ingrese un puntaje mayor a 0.");return;}
        }
      }

      const btn=bg.querySelector("#mv517bGuardar");btn.disabled=true;btn.textContent="Guardando...";
      try{
        if(decision!=="SIN_CAMBIO"){
          const p={accion:"clasificarVtrGarV517A",usuario:usuario(),periodo:valorPeriodo(),decision:decision,observacion:comentarioClas};
          if(meta.kind==="TICKET")p.ticket=meta.id;else p.clave=meta.id;
          if(cuadrilla)p.cuadrillaResponsable=cuadrilla;
          const r=await BASE_FETCH(api(),{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(p)}).then(x=>x.json());
          if(!r||!r.ok)throw new Error(r?.error||"No se pudo guardar la clasificación.");
        }
        if(resultado!=="SIN_CAMBIO"){
          const p={accion:"validarBonoVtrGarV515",usuario:usuario(),id:meta.validacionId,resultado:resultado,puntajeVtrGar:puntaje,motivo:comentarioBono};
          const r=await BASE_FETCH(api(),{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(p)}).then(x=>x.json());
          if(!r||!r.ok)throw new Error(r?.error||"No se pudo guardar Bono / No Bono.");
        }
        limpiarCache();
        bg.remove();
        if(typeof window.mv489AbrirValidacionVtrGar==="function")window.mv489AbrirValidacionVtrGar();
      }catch(e){btn.disabled=false;btn.textContent="Guardar cambios";alert(e.message);}
    };
  }

  function aplicar(){
    hookRegistro();
    transformarAcciones();
  }

  function iniciar(){
    if(!window.MV517A_VTRGAR_UI_OK){setTimeout(iniciar,120);return;}
    aplicar();
    const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(aplicar,60);});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener("click",()=>setTimeout(aplicar,80),true);
    setInterval(aplicar,1200);
    console.log("MI VISUAL V517B: navegación, acciones agrupadas y cache GAR/VTR activos.");
  }

  css();
  iniciar();
})();
