/* ============================================================
   MI VISUAL V517C.4 - DIAS ENTRE ANTECEDENTE Y GAR/VTR
   Solo frontend / solo lectura.

   - Calcula días desde cada antecedente al GAR/VTR actual.
   - Destaca el último antecedente FINALIZADO.
   - No modifica backend, Google Sheets, Ranking, Dashboard ni Producción.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C4_ANTECEDENTE_DIAS_OK) return;
  window.MV517C4_ANTECEDENTE_DIAS_OK=true;

  function parseFecha(t){
    t=String(t||"");
    let m=t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if(m) return new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
    m=t.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
    if(m) return new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
    return null;
  }
  function fmt(d){
    if(!d) return "-";
    return String(d.getUTCDate()).padStart(2,"0")+"/"+
      String(d.getUTCMonth()+1).padStart(2,"0")+"/"+d.getUTCFullYear();
  }
  function dias(a,b){
    if(!a||!b) return null;
    return Math.max(0,Math.round((b.getTime()-a.getTime())/86400000));
  }
  function css(){
    if(document.getElementById("mv517c4-css")) return;
    const s=document.createElement("style");
    s.id="mv517c4-css";
    s.textContent=`
      .mv517c4-resumen{margin:5px 0 2px;padding:6px 8px;border-radius:8px;background:#dbeafe;color:#1e3a8a;font-size:9px;font-weight:800;line-height:1.35}
      .mv517c4-dias{display:inline-flex;margin-left:5px;padding:2px 5px;border-radius:999px;background:#e8eef6;color:#334155;font-size:8px;font-weight:900;white-space:nowrap}
      .mv517c4-ultimo{background:#dff4e8!important;border-radius:6px;padding:5px!important;color:#14532d}
      .mv517c4-ultimo .mv517c4-dias{background:#bbf7d0;color:#166534}
    `;
    document.head.appendChild(s);
  }

  function procesarCaso(caso){
    if(!caso || caso.dataset.mv517c4==="1") return;
    const sub=caso.querySelector(":scope > summary .mv517c1-sub") || caso.querySelector(".mv517c1-sub");
    const fechaActual=parseFecha(sub&&sub.textContent);
    if(!fechaActual) return;

    const cajas=Array.from(caso.querySelectorAll(".mv517c1-detail .mv517c1-box"));
    const box=cajas.find(b=>/ANTECEDENTES DETECTADOS/i.test(b.textContent||""));
    if(!box) return;

    const filas=Array.from(box.children).filter(el=>el.tagName==="DIV");
    const datos=[];
    filas.forEach((fila,idx)=>{
      if(fila.dataset.mv517c4==="1") return;
      const f=parseFecha(fila.textContent);
      if(!f) return;
      const d=dias(f,fechaActual);
      if(d==null) return;
      fila.dataset.mv517c4="1";
      const chip=document.createElement("span");
      chip.className="mv517c4-dias";
      chip.textContent=d+" día"+(d===1?"":"s")+" antes";
      fila.appendChild(chip);
      datos.push({fila,fecha:f,dias:d,finalizada:/\bFINALIZADA\b/i.test(fila.textContent||""),idx});
    });

    const finalizados=datos.filter(x=>x.finalizada).sort((a,b)=>b.fecha-a.fecha);
    if(finalizados.length){
      const ult=finalizados[0];
      ult.fila.classList.add("mv517c4-ultimo");
      const resumen=document.createElement("div");
      resumen.className="mv517c4-resumen";
      resumen.innerHTML="<b>Último antecedente FINALIZADO:</b> "+fmt(ult.fecha)+
        " · <b>"+ult.dias+" día"+(ult.dias===1?"":"s")+"</b> antes del GAR/VTR del "+fmt(fechaActual);
      const titulo=box.querySelector("b");
      if(titulo && titulo.nextSibling) box.insertBefore(resumen,titulo.nextSibling);
      else if(titulo) titulo.insertAdjacentElement("afterend",resumen);
      else box.prepend(resumen);
    }
    caso.dataset.mv517c4="1";
  }

  function procesar(){
    css();
    document.querySelectorAll(".mv517c1-case").forEach(procesarCaso);
  }

  const obs=new MutationObserver(()=>requestAnimationFrame(procesar));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("toggle",e=>{
    if(e.target && e.target.matches && e.target.matches(".mv517c1-case")) setTimeout(procesar,0);
  },true);
  setTimeout(procesar,100);
})();
