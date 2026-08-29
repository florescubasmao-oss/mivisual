/* ============================================================
   MI VISUAL V517D F4W.3 - SEMAFORO GAR/VTR POR BLOQUE DERECHO
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - No cambia puntos, formulas, PRODUCCION_APP ni backend.
   - Solo reevalua el semaforo de un dia cuando ese dia contiene
     una fila GAR/VTR con BONO positivo integrada por F4T/F4T3.
   - Usa el TOTAL VISIBLE del dia: Produccion normal + BONO GAR/VTR.
   - Dias sin BONO GAR/VTR conservan exactamente su semaforo anterior.
   - Reconstruye SOLO el bloque derecho del encabezado del dia
     (circulo + total), evitando depender de la estructura historica.
   - Oculta en Produccion del Tecnico el bloque antiguo
     #mv515VtrGarDesempeno porque GAR/VTR ya se muestra dentro del dia.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4W3_TECNICO_OK) return;
  window.MV517D_F4W3_TECNICO_OK=true;

  let timer=null;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function numero(v){
    const n=Number(String(v==null?"":v).replace(",",".").replace(/[^0-9.\-]/g,""));
    return Number.isFinite(n)?n:0;
  }
  function esTecnico(){return norm(localStorage.getItem("perfil")||"")==="TECNICO";}
  function enProduccion(){return !!document.querySelector(".mv59-produccion-page");}

  function filaBonoPositivo(card){
    return Array.from(card.querySelectorAll(".mv517d-f4t-garvtr")).find(function(row){
      const t=norm(row.textContent||"");
      if(t.includes("NO BONO")) return false;
      if(!t.includes("BONO")) return false;
      const b=row.querySelector("b:last-child");
      return numero(b?b.textContent:0)>0;
    })||null;
  }

  function bloqueDerecho(card){
    const head=card&&card.querySelector(".mv4-day-head");
    if(!head) return null;

    const hijos=Array.from(head.children||[]);
    const conPuntos=hijos.find(function(el){
      return /-?\d+(?:[.,]\d+)?\s*pts/i.test(txt(el.textContent));
    });
    return conPuntos || head.lastElementChild || null;
  }

  function totalVisible(card,bloque){
    const textos=[
      txt(bloque&&bloque.textContent),
      txt(card&&card.querySelector(".mv4-day-head")?.textContent)
    ];
    for(const t of textos){
      const ms=Array.from(t.matchAll(/(-?\d+(?:[.,]\d+)?)\s*pts/ig));
      if(ms.length){
        /* En encabezado puede haber otros textos; el ultimo valor visible
           corresponde al total del dia ya ajustado por F4T/F4T3. */
        return numero(ms[ms.length-1][1]);
      }
    }
    return null;
  }

  function colorSemaforo(total){
    if(total>=5) return "#22c55e";
    if(total>=4) return "#facc15";
    return "#ef4444";
  }

  function ajustarSemaforo(card){
    /* Regla estricta: nunca tocar dias normales ni NO BONO. */
    if(!filaBonoPositivo(card)) return;

    const lado=bloqueDerecho(card);
    if(!lado) return;
    const total=totalVisible(card,lado);
    if(total===null) return;

    const color=colorSemaforo(total);

    /* Mantiene el nodo original del bloque derecho para no alterar
       estructura ni selectores de Produccion/F4T. Solo reemplaza sus hijos.
       No se insertan SPAN internos, evitando interferir con el selector
       historico span:last-child usado por otras capas. */
    const punto=document.createElement("i");
    punto.setAttribute("aria-hidden","true");
    punto.style.cssText=`display:inline-block;width:14px;height:14px;min-width:14px;border-radius:50%;background:${color};box-shadow:0 0 0 1px rgba(0,0,0,.25);`;

    const valor=document.createElement("b");
    valor.textContent=`${total.toFixed(1)} pts`;
    valor.style.cssText="font:inherit;font-weight:900;color:inherit;white-space:nowrap;";

    lado.replaceChildren(punto,valor);
    lado.style.display="inline-flex";
    lado.style.alignItems="center";
    lado.style.justifyContent="flex-end";
    lado.style.gap="8px";
    lado.style.whiteSpace="nowrap";

    card.dataset.mv517dF4w3Semaforo="1";
    card.dataset.mv517dF4w3Total=String(total);
  }

  function ocultarBloqueDuplicado(){
    if(!esTecnico()||!enProduccion()) return;
    const viejo=document.getElementById("mv515VtrGarDesempeno");
    if(viejo){
      viejo.style.display="none";
      viejo.setAttribute("aria-hidden","true");
      viejo.dataset.mv517dF4w3Oculto="1";
    }
  }

  function aplicar(){
    if(!esTecnico()||!enProduccion()) return;
    ocultarBloqueDuplicado();
    const detalle=document.querySelector("#mv59_detalle_diario");
    if(!detalle) return;
    detalle.querySelectorAll(".mv4-day-card").forEach(ajustarSemaforo);
  }

  function programar(ms){
    clearTimeout(timer);
    timer=setTimeout(aplicar,ms||0);
  }

  function instalar(){
    const objetivo=document.getElementById("pantalla")||document.body;
    if(typeof MutationObserver==="function"&&objetivo){
      const obs=new MutationObserver(function(){programar(10);});
      obs.observe(objetivo,{childList:true,subtree:true,characterData:true});
    }

    document.addEventListener("click",function(){
      if(esTecnico()){
        [0,50,150,350,800,1600,3000].forEach(function(ms){setTimeout(aplicar,ms);});
      }
    },true);

    document.addEventListener("change",function(ev){
      if(esTecnico()&&ev.target&&ev.target.id==="mv276ProduccionPeriodo"){
        [0,80,250,600,1200].forEach(function(ms){setTimeout(aplicar,ms);});
      }
    },true);

    [0,150,500,1000,2000,3500].forEach(function(ms){setTimeout(aplicar,ms);});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",instalar,{once:true});
  else instalar();

  window.mv517dF4W3AjustarProduccionTecnico=aplicar;
  console.log("MI VISUAL V517D F4W.3: semaforo del bloque derecho usa total visible con BONO GAR/VTR.");
})();
