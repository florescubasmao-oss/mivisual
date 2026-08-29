/* ============================================================
   MI VISUAL V517D F4W.2 - SEMAFORO GAR/VTR ROBUSTO
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - No cambia puntos, formulas, PRODUCCION_APP ni backend.
   - Solo reevalua el semaforo de un dia cuando ese dia contiene
     una fila GAR/VTR con BONO positivo integrada por F4T/F4T3.
   - Usa el TOTAL VISIBLE del dia: Produccion normal + BONO GAR/VTR.
   - Dias sin BONO GAR/VTR conservan exactamente su semaforo anterior.
   - No depende de la estructura antigua del punto/circulo del semaforo:
     reemplaza solo el contenido visible del total por icono + puntos.
   - Oculta en Produccion del Tecnico el bloque antiguo
     #mv515VtrGarDesempeno porque GAR/VTR ya se muestra dentro del dia.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4W2_TECNICO_OK) return;
  window.MV517D_F4W2_TECNICO_OK=true;

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

  function totalDiaEl(card){
    const h=card&&card.querySelector(".mv4-day-head");
    if(!h) return null;
    /* Mantiene la misma seleccion que F4T/F4T3 para no alterar estructura. */
    return h.querySelector("span:last-child")||h.lastElementChild;
  }

  function puntosVisibles(el){
    if(!el) return null;
    const actual=txt(el.textContent);
    const m=actual.match(/(-?\d+(?:[.,]\d+)?)\s*pts/i);
    return m?numero(m[1]):null;
  }

  function iconoHistorico(total){
    /* Meta diaria operativa vigente: 5 puntos.
       Verde: meta lograda. Amarillo: 4 a <5. Rojo: <4.
       Esta reevaluacion SOLO aplica a dias con BONO GAR/VTR positivo. */
    if(total>=5) return "🟢";
    if(total>=4) return "🟡";
    return "🔴";
  }

  function ajustarSemaforo(card){
    /* Regla estricta: nunca tocar dias normales ni NO BONO. */
    if(!filaBonoPositivo(card)) return;

    const el=totalDiaEl(card);
    if(!el) return;
    const total=puntosVisibles(el);
    if(total===null) return;

    const icono=iconoHistorico(total);
    const nuevo=`${icono} ${total.toFixed(1)} pts`;

    /* No crea hijos ni cambia clases: conserva el nodo original para que
       F4T/F4T3 puedan seguir recalculando el total sin interferencias. */
    if(txt(el.textContent)!==nuevo) el.textContent=nuevo;

    card.dataset.mv517dF4w2Semaforo="1";
    card.dataset.mv517dF4w2Total=String(total);
  }

  function ocultarBloqueDuplicado(){
    if(!esTecnico()||!enProduccion()) return;
    const viejo=document.getElementById("mv515VtrGarDesempeno");
    if(viejo){
      viejo.style.display="none";
      viejo.setAttribute("aria-hidden","true");
      viejo.dataset.mv517dF4w2Oculto="1";
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

  window.mv517dF4W2AjustarProduccionTecnico=aplicar;
  console.log("MI VISUAL V517D F4W.2: semaforo robusto con total visible + BONO GAR/VTR.");
})();
