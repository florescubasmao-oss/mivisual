/* MI VISUAL V517C.3 - UX CLARA + CARGA RAPIDA GAR/VTR */
(function(){
  "use strict";
  if(window.MV517C3_UX_RAPIDA_OK) return;
  window.MV517C3_UX_RAPIDA_OK=true;

  const API=window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";
  const VALIDADOR="JEFZNORTE",TTL=5*60*1000,BASE_FETCH=window.fetch.bind(window);
  let prefetchHecho=false,pendingSave=null,toastTimer=null;
  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function perfil(){return norm(localStorage.getItem("perfil")||"");}
  function esJefatura(){return norm(usuario())===VALIDADOR&&perfil()==="JEFATURA";}
  function esc(v){return txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function keyListado(b){return "MV517C3|LISTA|"+norm(b.usuario||usuario())+"|"+txt(b.periodo||"AUTO");}
  function leerCache(k){try{const j=JSON.parse(sessionStorage.getItem(k)||"null");return j&&j.text&&Date.now()-Number(j.ts||0)<TTL?j:null;}catch(_){return null;}}
  function guardarCache(k,t){try{sessionStorage.setItem(k,JSON.stringify({ts:Date.now(),text:String(t||"")}));}catch(_){}}
  function refrescar(k,input,init){BASE_FETCH(input,init).then(async r=>{try{if(r&&r.ok){const t=await r.clone().text(),j=JSON.parse(t);if(j&&j.ok)guardarCache(k,t);}}catch(_){}}).catch(()=>{});}

  window.fetch=function(input,init){
    try{
      if(norm(init&&init.method||"GET")==="POST"&&typeof init?.body==="string"){
        const b=JSON.parse(init.body);
        if(b&&b.accion==="listarVtrGarV517A"){
          const k=keyListado(b),hit=leerCache(k);
          if(hit){refrescar(k,input,init);return Promise.resolve(new Response(hit.text,{status:200,headers:{"Content-Type":"application/json"}}));}
          return BASE_FETCH(input,init).then(async r=>{try{if(r&&r.ok){const t=await r.clone().text(),j=JSON.parse(t);if(j&&j.ok)guardarCache(k,t);}}catch(_){}return r;});
        }
      }
    }catch(_){}
    return BASE_FETCH(input,init);
  };

  function prefetch(){
    if(prefetchHecho||!esJefatura())return;prefetchHecho=true;
    const b={accion:"listarVtrGarV517A",usuario:usuario()},k=keyListado(b);if(leerCache(k))return;
    refrescar(k,API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(b)});
  }
  let intentos=0;const pt=setInterval(()=>{intentos++;if(esJefatura()){clearInterval(pt);setTimeout(prefetch,500);}else if(intentos>=15)clearInterval(pt);},1000);
  document.addEventListener("pointerdown",e=>{if(e.target.closest("#cardValidacionTecnica"))prefetch();},true);

  function fecha(s){let m=txt(s).match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);m=txt(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]):null;}
  function ffecha(d){return d&&!isNaN(d)?String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear():"-";}
  function dias(a,b){return a&&b?Math.round((b-a)/86400000):null;}

  function quitarRepetido(c){
    const g=norm(c.closest(".mv517c1-estado")?.querySelector(":scope > summary")?.textContent||"");
    ["FINALIZADA","REPROGRAMADA","CANCELADA","ANULADA","POR REVISAR"].forEach(e=>{if(g.startsWith(e))c.querySelectorAll(":scope > summary .mv517c1-badge").forEach(b=>{if(norm(b.textContent)===e)b.remove();});});
  }
  function mejorarOrdenes(c){
    const box=Array.from(c.querySelectorAll(".mv517c1-detail .mv517c1-box")).find(b=>norm(b.querySelector("b")?.textContent).includes("ORDENES WIN ASOCIADAS"));
    if(!box||box.dataset.mv517c3)return;
    const rows=Array.from(box.children).filter(x=>x.tagName==="DIV");if(!rows.length)return;
    const arr=rows.map(r=>({r,p:txt(r.textContent).split("·").map(txt),f:fecha(r.textContent)})),base=arr.map(x=>x.f).filter(Boolean).sort((a,b)=>a-b)[0]||null;
    arr.forEach(x=>{const n=(x.p[0]||"Orden -").replace(/^Orden\s*/i,""),e=x.p[1]||"-",fc=x.f?ffecha(x.f):(x.p[2]||"-"),q=x.p.slice(3).join(" · ")||"-",d=dias(base,x.f);x.r.innerHTML=`<div class="mv517c3-order-main"><b>Orden ${esc(n)}</b><span class="mv517c3-order-state">${esc(e)}</span><span>📅 ${esc(fc)}</span>${d==null?"":`<span class="mv517c3-days">${d===0?"0 días":"+"+d+" días"}</span>`}</div><div class="mv517c3-order-cuad">${esc(q)}</div>`;});
    box.dataset.mv517c3="1";
  }

  function mejorarModal(m){
    if(!m||m.dataset.mv517c3)return;m.dataset.mv517c3="1";
    const nota=m.querySelector(".mv517c1-note");if(nota&&norm(nota.textContent).includes("CLASIFICACION Y LA VALIDACION"))nota.innerHTML="<b>Dos decisiones distintas:</b> 1) quién asume el GAR/VTR y 2) qué resultado tiene el registro/evidencia del técnico.";
    const dec=m.querySelector("#mv517c1Decision");
    if(dec){
      const sec=dec.closest(".mv517c1-section"),h=sec?.querySelector("h4");if(h)h.textContent="1. Definir quién asume la responsabilidad del GAR/VTR";
      const lab=dec.previousElementSibling;if(lab?.tagName==="LABEL")lab.textContent="Decisión de responsabilidad";
      const nombres={SIN_CAMBIO:"Sin cambiar responsabilidad",CORRESPONDE:"Confirmar responsabilidad en la cuadrilla ejecutora",REASIGNAR:"Asignar responsabilidad a otra cuadrilla",NO_ES_GAR_VTR:"No corresponde a GAR/VTR",ANULAR:"Anular caso por error o duplicidad"};Array.from(dec.options).forEach(o=>{if(nombres[o.value])o.textContent=nombres[o.value];});
      const a=document.createElement("div");a.className="mv517c3-help";a.innerHTML="<b>Responsabilidad:</b> define qué cuadrilla asumirá este GAR/VTR en el control e indicador. Confirma cuando corresponda a la cuadrilla que ejecutó esta orden; si corresponde a otra, usa la opción de asignación.";sec?.insertBefore(a,dec);
      const ta=sec?.querySelector("#mv517c1ComClas");if(ta)ta.placeholder="Sustento breve de por qué asignas esta responsabilidad";
    }
    const bono=m.querySelector("#mv517c1Bono");
    if(bono){
      const sec=bono.closest(".mv517c1-section"),h=sec?.querySelector("h4");if(h)h.textContent="2. Validar el registro enviado por el técnico";
      const lab=bono.previousElementSibling;if(lab?.tagName==="LABEL")lab.textContent="Resultado del registro";
      const nombres={SIN_CAMBIO:"Sin cambiar validación",BONO:"Aprobar BONO","NO BONO":"NO BONO",OBSERVADO:"OBSERVAR · falta evidencia o corrección"};Array.from(bono.options).forEach(o=>{if(nombres[o.value])o.textContent=nombres[o.value];});
      const a=document.createElement("div");a.className="mv517c3-help registro";a.innerHTML="<b>Registro técnico:</b> aquí evalúas lo que el técnico declaró y las evidencias enviadas. OBSERVAR devuelve el registro para completar/corregir evidencia; BONO o NO BONO lo resuelve.";sec?.insertBefore(a,bono);
    }
  }

  function estilos(){if(document.getElementById("mv517c3-css"))return;const s=document.createElement("style");s.id="mv517c3-css";s.textContent=`.mv517c3-order-main{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.mv517c3-order-main b{font-size:9px}.mv517c3-order-state{font-weight:900}.mv517c3-days{display:inline-flex;padding:2px 6px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-weight:900;font-size:8px}.mv517c3-order-cuad{margin-top:2px;color:#475569;font-size:8px}.mv517c3-help{background:#e8f1fb;border-radius:8px;padding:7px;margin:5px 0 7px;font-size:9px;line-height:1.35;color:#1e3a8a}.mv517c3-help.registro{background:#e4f5ea;color:#166534}.mv517c3-toast{position:fixed;right:16px;bottom:22px;z-index:16000;background:#0f766e;color:#fff;border-radius:10px;padding:9px 12px;font-size:10px;font-weight:800;box-shadow:0 8px 24px rgba(15,23,42,.22)}`;document.head.appendChild(s);}
  function toast(t){document.querySelector(".mv517c3-toast")?.remove();const d=document.createElement("div");d.className="mv517c3-toast";d.textContent=t;document.body.appendChild(d);clearTimeout(toastTimer);toastTimer=setTimeout(()=>d.remove(),2800);}
  document.addEventListener("click",e=>{const b=e.target.closest("#mv517c1Guardar");if(!b)return;const m=b.closest(".mv517c1-modal"),title=txt(m?.querySelector("h3")?.textContent),mm=title.match(/caso\s*·\s*(.+)$/i);pendingSave={id:txt(mm&&mm[1]),decision:txt(m?.querySelector("#mv517c1Decision")?.value),cuad:txt(m?.querySelector("#mv517c1Cuad")?.value),resultado:txt(m?.querySelector("#mv517c1Bono")?.value)};},true);
  function optimista(){
    if(!pendingSave?.id)return;const c=Array.from(document.querySelectorAll(".mv517c1-case")).find(x=>norm(x.querySelector(".mv517c1-ticket")?.textContent)===norm(pendingSave.id));if(!c)return;
    const bs=c.querySelector(".mv517c1-badges");if(bs){
      if(pendingSave.decision&&pendingSave.decision!=="SIN_CAMBIO"){Array.from(bs.querySelectorAll(".mv517c1-badge")).filter(b=>norm(b.textContent).startsWith("RESP.")||["NO ES GAR/VTR","ANULADO"].includes(norm(b.textContent))).forEach(b=>b.remove());const b=document.createElement("span");b.className="mv517c1-badge";if(pendingSave.decision==="CORRESPONDE"){b.classList.add("ok");b.textContent="RESP. CONFIRMADA";}else if(pendingSave.decision==="REASIGNAR"){b.classList.add("info");b.textContent="RESP. REASIGNADA";}else if(pendingSave.decision==="NO_ES_GAR_VTR"){b.classList.add("dark");b.textContent="NO ES GAR/VTR";}else{b.classList.add("bad");b.textContent="ANULADO";}bs.appendChild(b);}
      if(pendingSave.resultado&&pendingSave.resultado!=="SIN_CAMBIO"){Array.from(bs.querySelectorAll(".mv517c1-badge")).filter(b=>norm(b.textContent).includes("BONO")||norm(b.textContent).includes("OBSERV")).forEach(b=>b.remove());const b=document.createElement("span");b.className="mv517c1-badge";if(pendingSave.resultado==="BONO"){b.classList.add("ok");b.textContent="● BONO";}else if(pendingSave.resultado==="NO BONO"){b.classList.add("info");b.textContent="● NO BONO";}else{b.classList.add("obs");b.textContent="● OBSERVADO";}bs.appendChild(b);}
    }
    toast("✅ Guardado. Actualizando datos en segundo plano.");pendingSave=null;
  }
  function procesar(){estilos();document.querySelectorAll(".mv517c1-case").forEach(c=>{quitarRepetido(c);mejorarOrdenes(c);});document.querySelectorAll(".mv517c1-modal").forEach(mejorarModal);if(pendingSave&&!document.querySelector(".mv517c1-modalbg"))optimista();}
  new MutationObserver(()=>requestAnimationFrame(procesar)).observe(document.documentElement,{childList:true,subtree:true});setTimeout(procesar,200);
})();