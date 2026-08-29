/* ============================================================
   MI VISUAL V517D F4V - MI DESEMPENO TECNICO SNAPSHOT RAPIDO
   29/08/2026

   SOLO FRONTEND / SOLO PERFIL TECNICO
   - Usa obtenerMiDesempenoTecnicoRapidoV517D.
   - Muestra el ultimo snapshot de su cuadrilla sin esperar
     la reconstruccion de todas las cuadrillas.
   - Refresca el consolidado V361 en segundo plano.
   - Fallback automatico al flujo anterior si F4V aun no esta publicado.
   - No modifica formulas, puntos ni hojas.
============================================================ */
(function(){
  "use strict";
  if(window.MV517D_F4V_DESEMPENO_RAPIDO_OK) return;
  window.MV517D_F4V_DESEMPENO_RAPIDO_OK=true;

  const API=window.MI_VISUAL_API_URL||"";
  const PREFIJO="mv517dF4VDesempeno:";
  const TTL_LOCAL=24*60*60*1000;
  const MEM=new Map();
  const PEND=new Map();
  let instalado=false;
  let precarga=false;

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function esTecnico(){return norm(localStorage.getItem("perfil")||"")==="TECNICO";}
  function usuario(){return txt(localStorage.getItem("usuario")||localStorage.getItem("correo")||"");}
  function cuadrilla(){return norm(localStorage.getItem("cuadrilla")||"");}
  function periodoActual(){
    try{
      const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit"}).formatToParts(new Date());
      return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}`;
    }catch(_){
      const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }
  }
  function key(periodo){return [usuario(),cuadrilla(),periodo].join("|");}
  function localKey(periodo){return PREFIJO+encodeURIComponent(key(periodo));}

  function leerLocal(periodo){
    try{
      const x=JSON.parse(localStorage.getItem(localKey(periodo))||"null");
      if(!x||!x.data||!x.ts) return null;
      const edad=Date.now()-Number(x.ts||0);
      if(edad<0||edad>TTL_LOCAL) return null;
      return {ts:Number(x.ts),edad,data:x.data};
    }catch(_){return null;}
  }
  function guardar(periodo,data){
    const x={ts:Date.now(),data};
    MEM.set(key(periodo),x);
    try{localStorage.setItem(localKey(periodo),JSON.stringify(x));}catch(_){}
  }
  function inmediato(periodo){
    const m=MEM.get(key(periodo));
    if(m) return m.data;
    const l=leerLocal(periodo);
    if(l){MEM.set(key(periodo),{ts:l.ts,data:l.data});return l.data;}
    return null;
  }

  async function json(res){
    const t=(await res.text()).trim();
    if(!res.ok) throw new Error(`Mi Desempeno rapido ${res.status}`);
    if(!t||/^MI VISUAL API OK$/i.test(t)||/^<!doctype|^<html/i.test(t)) throw new Error("F4V no publicado");
    const j=JSON.parse(t);
    if(!j||!j.ok) throw new Error(j&&j.error||"F4V no disponible");
    return j;
  }

  async function red(periodo){
    if(!API||!usuario()) throw new Error("F4V sin usuario/API");
    const k=key(periodo);
    if(PEND.has(k)) return PEND.get(k);

    const p=(async()=>{
      const u=new URL(API);
      u.searchParams.set("accion","obtenerMiDesempenoTecnicoRapidoV517D");
      u.searchParams.set("usuario",usuario());
      u.searchParams.set("periodo",periodo);
      u.searchParams.set("_f4v",String(Date.now()));

      const ctrl=typeof AbortController==="function"?new AbortController():null;
      const to=ctrl?setTimeout(()=>ctrl.abort(),12000):null;
      try{
        const r=await fetch(u.toString(),{
          method:"GET",cache:"no-store",redirect:"follow",
          headers:{"Accept":"application/json"},
          signal:ctrl?ctrl.signal:undefined
        });
        const data=await json(r);
        guardar(periodo,data);
        try{
          window.dispatchEvent(new CustomEvent("mv366ResumenActualizado",{
            detail:{periodo:data.periodo||periodo,data}
          }));
        }catch(_){}
        return data;
      }finally{
        if(to) clearTimeout(to);
      }
    })().finally(()=>PEND.delete(k));

    PEND.set(k,p);
    return p;
  }

  function instalar(){
    if(instalado||!esTecnico()) return false;
    const actual=window.mv361ConsultarResumenDashboardRanking;
    if(typeof actual!=="function") return false;
    if(actual.__mv517dF4V){instalado=true;return true;}

    const base=actual;
    const fn=async function(periodo,forzar){
      const p=/^\d{4}-\d{2}$/.test(txt(periodo))?txt(periodo):periodoActual();
      if(!esTecnico()||forzar) return base.apply(this,arguments);

      const local=inmediato(p);
      if(local){
        red(p).catch(()=>{});
        Promise.resolve(base.call(this,p,false)).catch(()=>{});
        return Object.assign({},local,{_mv517dF4VSnapshot:true});
      }

      try{
        const rapido=await red(p);
        Promise.resolve(base.call(this,p,false)).catch(()=>{});
        return rapido;
      }catch(e){
        console.warn("F4V: snapshot rapido no disponible; usa flujo anterior.",e);
        return base.apply(this,arguments);
      }
    };
    fn.__mv517dF4V=true;
    fn.__mv517dF4VBase=base;
    window.mv361ConsultarResumenDashboardRanking=fn;
    try{mv361ConsultarResumenDashboardRanking=fn;}catch(_){}
    instalado=true;
    return true;
  }

  function iniciarPrecarga(){
    if(precarga||!esTecnico()||!usuario()) return;
    precarga=true;
    const lanzar=()=>{
      if(!instalar()){precarga=false;return;}
      const p=periodoActual();
      red(p).catch(()=>{});
    };
    if(typeof window.mv339CargarModulo==="function"){
      Promise.resolve(window.mv339CargarModulo("mi_desempeno"))
        .then(lanzar)
        .catch(()=>{precarga=false;});
    }else{
      precarga=false;
    }
  }

  let i=0;
  const poll=setInterval(function(){
    i++;
    if(esTecnico()&&usuario()){
      instalar();
      iniciarPrecarga();
      if(instalado&&precarga){clearInterval(poll);}
    }
    if(i>120) clearInterval(poll);
  },250);

  document.addEventListener("click",function(ev){
    if(!esTecnico()) return;
    const c=ev.target&&ev.target.closest?ev.target.closest("#cardMiDesempeno"):null;
    if(c){
      instalar();
      iniciarPrecarga();
      const p=periodoActual(),local=inmediato(p);
      if(!local) red(p).catch(()=>{});
    }
  },true);

  [300,800,1500,3000].forEach(ms=>setTimeout(function(){
    if(esTecnico()&&usuario()){instalar();iniciarPrecarga();}
  },ms));

  window.mv517dF4VPrecargarMiDesempeno=iniciarPrecarga;
  console.log("MI VISUAL V517D F4V: Mi Desempeno Tecnico usa snapshot rapido con fallback.");
})();