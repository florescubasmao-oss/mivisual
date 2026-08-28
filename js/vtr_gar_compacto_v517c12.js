/* ============================================================
   MI VISUAL V517C.16 - GAR/VTR COMPACTO SIN DUPLICADOS
   - Conserva vista compacta V517C.12.
   - Una sola capa dibuja Ver ficha / Corregir validacion / Gestionar caso.
   - No carga fixes antiguos de correccion.
   - Sin duplicar informacion de orden WIN.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C12_COMPACTO_OK) return;
  window.MV517C12_COMPACTO_OK=true;

  let timer=null;
  const VALIDADOR="JEFZNORTE";
  const txt=v=>String(v==null?"":v).trim();
  const norm=v=>txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const usuario=()=>txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");
  const esValidador=()=>norm(usuario())===VALIDADOR;

  function css(){
    if(document.getElementById("mv517c12-css")) return;
    const s=document.createElement("style");
    s.id="mv517c12-css";
    s.textContent=`
      .mv517c12-actions{display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 8px 2px;margin:0}
      .mv517c12-actions .mv517c1-btn{margin:0;padding:6px 9px;font-size:8px;border-radius:7px;white-space:nowrap}
      .mv517c12-actions .mv517c16-btn{background:#7c3aed!important;color:#fff!important}
      .mv517c12-actual-extra{display:grid;gap:5px;margin:5px 0 0}
      .mv517c12-motivo{padding:5px 7px;border-radius:7px;background:#e8f1fb;color:#1e3a5f;font-size:8px;line-height:1.35}
      .mv517c12-partida{padding:6px 8px;border-radius:8px;background:#e8f5ee;border-left:3px solid #16a34a;color:#14532d;font-size:8px;line-height:1.4}
      .mv517c12-partida.warn{background:#fff3d6;border-left-color:#f59e0b;color:#7c5200}
      .mv517c12-history-title{color:#334155}
      @media(max-width:700px){.mv517c12-actions{justify-content:flex-end;padding-left:5px;padding-right:5px}.mv517c12-actions .mv517c1-btn{font-size:7.5px;padding:6px 8px}}
    `;
    document.head.appendChild(s);
  }

  function boxPorTitulo(card,frase){
    return Array.from(card.querySelectorAll(".mv517c1-box")).find(b=>{
      const titulo=b.querySelector(":scope > b")||b.querySelector("b");
      return norm(titulo&&titulo.textContent).includes(norm(frase));
    })||null;
  }

  function filasOrden(box){
    if(!box) return [];
    return Array.from(box.children).filter(el=>el.tagName==="DIV"&&/^ORDEN\s+\d+/i.test(norm(el.textContent)));
  }

  function extraerFila(row){
    const bruto=txt(row&&row.textContent);
    const orden=(norm(bruto).match(/ORDEN\s+(\d+)/)||[])[1]||"";
    let fecha="",m=bruto.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if(m)fecha=m[1];
    if(!fecha){m=bruto.match(/\b(\d{4}-\d{2}-\d{2})\b/);if(m)fecha=m[1];}
    return {orden,fecha};
  }

  function ponerCampo(grid,key,label,value){
    if(!grid||!txt(value))return;
    let el=grid.querySelector(`[data-mv517c12-field="${key}"]`);
    if(!el){el=document.createElement("div");el.className="mv517c1-field";el.dataset.mv517c12Field=key;grid.appendChild(el);}
    el.innerHTML=`<small>${label}</small><b>${txt(value)}</b>`;
  }

  function tarjetaResuelta(card){
    const n=norm(card&&card.textContent);
    const bono=(n.includes("NO BONO")||n.includes("OBSERVADO")||(n.includes("BONO")&&!n.includes("BONO PENDIENTE")&&!n.includes("BONO POR VALIDAR")));
    const resp=n.includes("RESPONSABLE CONFIRMADO")||n.includes("RESPONSABLE REASIGNADO")||n.includes("RESP. CONFIRMADA")||n.includes("RESP. REASIGNADA")||n.includes("NO ES GAR/VTR")||n.includes("NO CORRESPONDE A GAR/VTR")||n.includes("ANULADO");
    return bono||resp;
  }

  function asegurarCorreccion(card,actions){
    Array.from(actions.querySelectorAll(".mv517c14-btn,.mv517c14a-btn,.mv517c15-btn")).forEach(b=>b.remove());
    const actual=actions.querySelector(".mv517c16-btn");
    if(!esValidador()||!tarjetaResuelta(card)){
      if(actual)actual.remove();
      return;
    }
    if(actual)return;
    const ticket=txt(card.querySelector(".mv517c1-ticket")?.textContent);
    if(!/^(GAR|VTR)-\d+/i.test(ticket))return;
    const b=document.createElement("button");
    b.type="button";b.className="mv517c1-btn mv517c16-btn";b.textContent="✏️ Corregir validación";
    b.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      if(typeof window.mv517c16Corregir==="function")window.mv517c16Corregir(ticket);
      else alert("La corrección todavía está cargando. Intente nuevamente en unos segundos.");
    };
    const gestionar=Array.from(actions.querySelectorAll("button")).find(z=>norm(z.textContent).includes("GESTIONAR CASO"));
    if(gestionar)actions.insertBefore(b,gestionar);else actions.appendChild(b);
  }

  function moverAcciones(card){
    const summary=card.querySelector(":scope > summary");if(!summary)return;
    let actions=card.querySelector(":scope > .mv517c12-actions");
    if(!actions){actions=document.createElement("div");actions.className="mv517c12-actions";summary.insertAdjacentElement("afterend",actions);}

    const botones=Array.from(card.querySelectorAll("button.mv517c1-btn")).filter(btn=>{
      const n=norm(btn.textContent);return n.includes("VER FICHA")||n.includes("GESTIONAR CASO");
    });
    botones.forEach(btn=>{if(btn.parentElement!==actions)actions.appendChild(btn);});
    asegurarCorreccion(card,actions);

    Array.from(card.querySelectorAll(".mv517c1-actions")).forEach(el=>{if(!el.querySelector("button"))el.style.display="none";});
    if(!actions.children.length)actions.remove();
  }

  function copiarDetalleOrden(card,row){
    const detail=card.querySelector(".mv517c1-detail");
    const grid=detail&&detail.querySelector(":scope > .mv517c1-grid");
    if(!detail||!grid||!row)return;
    const d=extraerFila(row);
    ponerCampo(grid,"orden","Orden WIN",d.orden);
    ponerCampo(grid,"fechaOrden","Fecha orden",d.fecha);

    let extra=detail.querySelector(":scope > .mv517c12-actual-extra");
    if(!extra){extra=document.createElement("div");extra.className="mv517c12-actual-extra";grid.insertAdjacentElement("afterend",extra);}

    const motivo=row.querySelector(".mv517c5-motivo");
    let mot=extra.querySelector(".mv517c12-motivo");
    if(motivo){if(!mot){mot=document.createElement("div");mot.className="mv517c12-motivo";extra.appendChild(mot);}mot.innerHTML=motivo.innerHTML;}else if(mot)mot.remove();

    const partida=row.querySelector(".mv517c9-partida");
    let part=extra.querySelector(".mv517c12-partida");
    if(partida){
      if(!part){part=document.createElement("div");part.className="mv517c12-partida";extra.appendChild(part);}
      part.innerHTML=partida.innerHTML;
      const n=norm(partida.textContent);part.classList.toggle("warn",n.includes("POR REVISAR")||n.includes("NO DISPONIBLE"));
    }else if(part)part.remove();
    extra.style.display=extra.children.length?"grid":"none";
  }

  function compactarOrdenes(card){
    const box=boxPorTitulo(card,"ORDENES WIN ASOCIADAS")||boxPorTitulo(card,"HISTORIAL / ORDENES WIN DEL MISMO TICKET");
    if(!box)return;
    const filas=filasOrden(box);
    if(filas.length===1){copiarDetalleOrden(card,filas[0]);box.style.display="none";box.dataset.mv517c12Compacta="1";return;}
    box.style.display="";box.dataset.mv517c12Compacta="0";
    const titulo=box.querySelector(":scope > b")||box.querySelector("b");
    if(titulo&&filas.length>1){titulo.textContent="📋 Historial / órdenes WIN del mismo ticket";titulo.classList.add("mv517c12-history-title");}
  }

  function ejecutar(){
    css();
    document.querySelectorAll(".mv517c1-case").forEach(card=>{moverAcciones(card);compactarOrdenes(card);});
  }

  window.mv517c12Ejecutar=ejecutar;
  function schedule(){clearTimeout(timer);timer=setTimeout(ejecutar,50);}
  const obs=new MutationObserver(schedule);
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["open"]});
  setTimeout(ejecutar,250);
})();