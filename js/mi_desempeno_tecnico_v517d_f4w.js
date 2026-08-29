/* ============================================================
   MI VISUAL V517D F4W - SEMAFORO GAR/VTR + SIN BLOQUE DUPLICADO
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - No cambia puntos, formulas, PRODUCCION_APP ni backend.
   - Solo reevalua el color del semaforo de un dia cuando ese dia
     contiene una fila GAR/VTR BONO integrada por F4T/F4T3.
   - Usa el TOTAL VISIBLE del dia: Produccion normal + BONO GAR/VTR.
   - Dias sin BONO GAR/VTR conservan exactamente su semaforo anterior.
   - Oculta en Produccion del Tecnico el bloque antiguo
     #mv515VtrGarDesempeno porque GAR/VTR ya se muestra dentro del dia.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4W_TECNICO_OK) return;
  window.MV517D_F4W_TECNICO_OK=true;

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

  function tieneBonoGarVtr(card){
    return Array.from(card.querySelectorAll(".mv517d-f4t-garvtr")).some(function(row){
      const t=norm(row.textContent||"");
      if(t.includes("NO BONO")) return false;
      if(!t.includes("BONO")) return false;
      const b=row.querySelector("b:last-child");
      return numero(b?b.textContent:0)>0;
    });
  }

  function totalDiaEl(card){
    const h=card&&card.querySelector(".mv4-day-head");
    if(!h) return null;
    return h.querySelector("span:last-child")||h.lastElementChild;
  }

  function ajustarSemaforo(card){
    /* Regla estricta: no tocar dias normales ni NO BONO. */
    if(!tieneBonoGarVtr(card)) return;

    const el=totalDiaEl(card);
    if(!el) return;
    const actual=txt(el.textContent);
    const m=actual.match(/(-?\d+(?:[.,]\d+)?)\s*pts/i);
    if(!m) return;

    const total=numero(m[1]);
    /* Meta diaria vigente: 5 pts. Se conserva amarillo desde 4 pts,
       igual que la visualizacion actual de Produccion. */
    const icono=total>=5?"🟢":(total>=4?"🟡":"🔴");
    if(/[🟢🟡🔴]/u.test(actual)){
      const nuevo=actual.replace(/[🟢🟡🔴]/u,icono);
      if(nuevo!==actual) el.textContent=nuevo;
    }
  }

  function ocultarBloqueDuplicado(){
    if(!esTecnico()||!enProduccion()) return;
    const viejo=document.getElementById("mv515VtrGarDesempeno");
    if(viejo){
      viejo.style.display="none";
      viejo.setAttribute("aria-hidden","true");
      viejo.dataset.mv517dF4wOculto="1";
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
      const obs=new MutationObserver(function(){programar(20);});
      obs.observe(objetivo,{childList:true,subtree:true,characterData:true});
    }

    document.addEventListener("click",function(){
      if(esTecnico()){
        [0,80,250,700,1500].forEach(function(ms){setTimeout(aplicar,ms);});
      }
    },true);

    document.addEventListener("change",function(ev){
      if(esTecnico()&&ev.target&&ev.target.id==="mv276ProduccionPeriodo"){
        [0,100,400,1000].forEach(function(ms){setTimeout(aplicar,ms);});
      }
    },true);

    [0,300,900,1800,3000].forEach(function(ms){setTimeout(aplicar,ms);});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",instalar,{once:true});
  else instalar();

  window.mv517dF4WAjustarProduccionTecnico=aplicar;
  console.log("MI VISUAL V517D F4W: semaforo incluye BONO GAR/VTR y bloque duplicado oculto solo para Tecnico.");
})();
