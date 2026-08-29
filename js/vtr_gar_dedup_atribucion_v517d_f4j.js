/* ============================================================
   MI VISUAL V517D F4J - DEDUP + ATRIBUCION RESPONSABLE/PUNTAJE
   29/08/2026

   SOLO FRONTEND:
   - Si F4H ya muestra BONO/NO BONO, elimina el bloque legacy duplicado.
   - Aclara que la responsabilidad GAR/VTR pertenece a la cuadrilla responsable.
   - Aclara que el puntaje BONO se acredita a la cuadrilla ejecutora.
   - No modifica backend, Produccion, Ranking, Bono ni hojas.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4J_DEDUP_ATRIBUCION_OK) return;
  window.MV517D_F4J_DEDUP_ATRIBUCION_OK=true;

  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function snapshot(){
    if(window.MV517C5_DATA&&window.MV517C5_DATA.ok)return window.MV517C5_DATA;
    try{
      let best=null;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(!k||!k.startsWith("MV517C7|LISTA|"))continue;
        const o=JSON.parse(localStorage.getItem(k)||"null");
        if(o&&o.data&&o.data.ok&&(!best||Number(o.ts||0)>Number(best.ts||0)))best=o;
      }
      return best&&best.data||null;
    }catch(_){return null;}
  }

  function caso(ticket){
    const d=snapshot()||{};
    return (d.incidencias||[]).find(x=>norm(x.ticket)===norm(ticket))||null;
  }

  function ticketModal(modal){
    const m=txt(modal?.querySelector("h3")?.textContent).match(/(?:VTR|GAR)-\d+/i);
    return m?m[0].toUpperCase():"";
  }

  function aplicarModal(modal){
    if(!modal)return;
    const integrado=modal.querySelector("#mv517dF4HSinRegistro");
    if(!integrado||integrado.style.display==="none")return;

    /* F4H sustituye funcionalmente este bloque legacy: evitar doble evaluación. */
    modal.querySelectorAll("#mv517c5Excepcion").forEach(el=>el.remove());

    const ticket=ticketModal(modal);
    const x=caso(ticket);
    if(!x)return;

    const ejecutora=txt(x.cuadrillaEjecutora||x.cuadrillaRegistro||"");
    const responsable=txt(x.cuadrillaResponsable||"");
    if(!ejecutora&&!responsable)return;

    let nota=integrado.querySelector("#mv517dF4JDestinoPuntaje");
    if(!nota){
      nota=document.createElement("div");
      nota.id="mv517dF4JDestinoPuntaje";
      nota.style.cssText="margin:7px 0;padding:7px 9px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d;font-size:8px;line-height:1.45";
      const baseNota=integrado.querySelector(".mv517c1-note");
      if(baseNota)baseNota.insertAdjacentElement("afterend",nota);else integrado.prepend(nota);
    }

    const partes=[];
    if(responsable)partes.push(`<b>Responsable GAR/VTR:</b> ${esc(responsable)}`);
    if(ejecutora)partes.push(`<b>Puntaje BONO se acredita a la cuadrilla ejecutora:</b> ${esc(ejecutora)}`);
    nota.innerHTML=partes.join("<br>");
  }

  function run(){document.querySelectorAll(".mv517c1-modal").forEach(aplicarModal);}
  let timer=null;
  function schedule(ms){clearTimeout(timer);timer=setTimeout(run,ms==null?30:ms);}

  const obs=new MutationObserver(()=>schedule(25));
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["style"]});
  document.addEventListener("click",()=>{schedule(20);setTimeout(run,100);setTimeout(run,250);},true);
  document.addEventListener("change",()=>{schedule(10);setTimeout(run,80);},true);
  setTimeout(run,100);setTimeout(run,500);

  console.log("MI VISUAL V517D F4J: sin doble BONO/NO BONO; responsabilidad y puntaje separados visualmente.");
})();
