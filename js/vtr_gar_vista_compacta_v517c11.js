/* ============================================================
   MI VISUAL V517C.11 - VISTA COMPACTA GAR/VTR
   FRONTEND ADITIVO

   - Evita duplicar GAR/VTR actual y ultima FINALIZADA cuando son la misma orden.
   - Integra motivo + partida + puntos dentro de GAR/VTR ACTUAL.
   - Historial solo aparece si existen otras ordenes/movimientos del ticket.
   - Mueve Ver ficha / Gestionar caso al encabezado derecho del ticket.
   - No modifica backend, Sheets, Ranking, Dashboard ni Produccion.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C11_VISTA_COMPACTA_OK) return;
  window.MV517C11_VISTA_COMPACTA_OK=true;

  let timer=null;
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();

  function css(){
    if(document.getElementById("mv517c11-css")) return;
    const s=document.createElement("style");
    s.id="mv517c11-css";
    s.textContent=`
      .mv517c11-topactions{display:flex;gap:4px;align-items:center;justify-content:flex-end;flex-wrap:wrap;width:100%;margin-top:3px}
      .mv517c11-topactions .mv517c1-btn{padding:5px 7px;font-size:7.5px;border-radius:7px;white-space:nowrap}
      .mv517c11-topactions .detail{background:#2563eb}
      .mv517c11-actual-extra{margin-top:5px;display:grid;gap:4px}
      .mv517c11-finalinfo{background:#ddf3e5;border-left:3px solid #16a34a;border-radius:7px;padding:6px 7px;font-size:8px;line-height:1.35;color:#14532d}
      .mv517c11-finalinfo .partida{margin-top:3px;padding-top:3px;border-top:1px solid rgba(22,101,52,.16)}
      .mv517c11-finalinfo.warn{background:#fff0c9;border-left-color:#f59e0b;color:#7c5200}
      .mv517c11-history-note{font-size:7.5px;color:#64748b;margin-top:3px}
      @media(max-width:700px){.mv517c11-topactions{justify-content:flex-start}.mv517c11-topactions .mv517c1-btn{flex:0 0 auto}}
    `;
    document.head.appendChild(s);
  }

  function moverAcciones(card){
    const summary=card.querySelector(":scope > summary");
    const badges=summary&&summary.querySelector(".mv517c1-badges");
    if(!summary||!badges) return;

    let wrap=badges.querySelector(".mv517c11-topactions");
    if(!wrap){
      wrap=document.createElement("div");
      wrap.className="mv517c11-topactions";
      badges.appendChild(wrap);
    }

    const candidatos=Array.from(card.querySelectorAll("button.mv517c1-btn"));
    candidatos.forEach(btn=>{
      const t=norm(btn.textContent);
      if(!(t.includes("VER FICHA")||t.includes("GESTIONAR CASO"))) return;
      if(btn.parentElement===wrap) return;
      btn.addEventListener("click",function(e){e.stopPropagation();},{passive:true});
      wrap.appendChild(btn);
    });

    Array.from(card.querySelectorAll(".mv517c1-actions,.mv517c1-regbox")).forEach(el=>{
      if(el.querySelector("button")) return;
      const text=norm(el.textContent);
      if(!text && !el.children.length) el.remove();
    });
  }

  function valorCelda(sec,label){
    const cel=Array.from(sec.querySelectorAll(".mv517c10-cell")).find(c=>norm(c.querySelector("small")?.textContent)===norm(label));
    return txt(cel?.querySelector("b")?.textContent);
  }

  function renumerar(root){
    let n=1;
    Array.from(root.querySelectorAll(":scope > .mv517c10-sec")).forEach(sec=>{
      if(sec.style.display==="none") return;
      const title=sec.querySelector(".mv517c10-title span")||sec.querySelector(".mv517c10-title");
      if(!title) return;
      let t=txt(title.textContent).replace(/^\d+\.\s*/,"");
      if(sec.classList.contains("actual")) t="GAR/VTR ACTUAL";
      else if(sec.classList.contains("final")) t="ULTIMA ORDEN FINALIZADA DEL MISMO TICKET";
      else if(sec.classList.contains("mov")) t="HISTORIAL / MOVIMIENTOS DEL MISMO TICKET";
      else if(sec.classList.contains("ant")) t="ANTECEDENTE DEL SERVICIO · SOLO RESPONSABILIDAD";
      title.textContent=(n++)+". "+t;
    });
  }

  function compactarDetalle(card){
    if(!card.open) return;
    const root=card.querySelector(".mv517c10");
    if(!root) return;

    const actual=root.querySelector(".mv517c10-sec.actual");
    const fin=root.querySelector(".mv517c10-sec.final");
    const mov=root.querySelector(".mv517c10-sec.mov");
    if(!actual) return;

    const ordenActual=(valorCelda(actual,"Orden WIN actual").match(/\d+/)||[])[0]||"";
    const finalOrder=fin?.querySelector("[data-mv517c10-final]");
    const ordenFinal=txt(finalOrder?.getAttribute("data-mv517c10-final"));

    if(fin && ordenActual && ordenFinal && ordenActual===ordenFinal){
      let extra=actual.querySelector(".mv517c11-actual-extra");
      if(!extra){
        extra=document.createElement("div");
        extra.className="mv517c11-actual-extra";
        actual.appendChild(extra);
      }

      const motivo=fin.querySelector(".mv517c10-ob");
      const partida=fin.querySelector("[data-mv517c10-partida]");
      let caja=extra.querySelector(".mv517c11-finalinfo");
      if(!caja){caja=document.createElement("div");caja.className="mv517c11-finalinfo";extra.appendChild(caja);}
      const m=motivo?motivo.innerHTML:"";
      const p=partida?partida.innerHTML:"";
      caja.classList.toggle("warn",!!partida&&partida.classList.contains("warn"));
      caja.innerHTML=`${m||"<b>Motivo de finalizacion WIN:</b> -"}${p?`<div class="partida">${p}</div>`:""}`;
      fin.style.display="none";
    }else if(fin){
      fin.style.display="";
    }

    if(mov){
      const ordenes=mov.querySelectorAll(".mv517c10-order");
      if(!ordenes.length) mov.style.display="none";
      else mov.style.display="";
    }

    renumerar(root);
  }

  function ejecutar(){
    css();
    document.querySelectorAll(".mv517c1-case").forEach(card=>{
      moverAcciones(card);
      compactarDetalle(card);
    });
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(ejecutar,60);}
  const obs=new MutationObserver(schedule);
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open","class"]});
  setTimeout(ejecutar,400);
})();
