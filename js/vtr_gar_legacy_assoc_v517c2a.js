/* ============================================================
   MI VISUAL V517C.2A - COMPATIBILIDAD HISTORICA VALIDACION_TECNICA
   Solo lectura. No modifica Google Sheets.
   Normaliza al leer tickets historicos con prefijo repetido, por ejemplo:
   GAR-GAR-46271308 -> GAR-46271308.
============================================================ */
(function(){
  "use strict";
  if(window.MV517C2A_LEGACY_ASSOC_OK) return;
  window.MV517C2A_LEGACY_ASSOC_OK=true;

  const BASE_FETCH=window.fetch.bind(window);
  const TTL=2*60*1000;
  let cache={ts:0,usuario:"",lista:null,promise:null};

  function txt(v){return String(v==null?"":v).trim();}
  function norm(v){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
  function api(){return window.MI_VISUAL_API_URL||"https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";}

  function ticketCanon(v){
    let s=norm(v).replace(/\s+/g,"").replace(/:/g,"-");
    const m=s.match(/^(GAR|VTR)-?(.+)$/);
    if(!m)return "";
    const p=m[1];
    let resto=m[2];
    while(resto.startsWith(p+"-")) resto=resto.slice(p.length+1);
    resto=resto.replace(/^-+/,"");
    const d=resto.match(/^(\d{5,12})$/);
    return d?p+"-"+d[1]:"";
  }

  function ticketRegistro(x){
    return ticketCanon(x&&x.ticketFinal)||
      ticketCanon((x&&x.tipoTicket||"")+(x&&x.numeroTicket||""))||
      ticketCanon(x&&x.numeroTicket);
  }

  function estadoRegistro(x){
    const e=norm(x&&x.resultadoFinal||x&&x.estado||"PENDIENTE");
    if(e==="BONO")return "BONO";
    if(e==="NO BONO"||e==="NO_BONO")return "NO BONO";
    if(e==="OBSERVADO")return "OBSERVADO";
    return "PENDIENTE";
  }

  function cargarValidaciones(usuario){
    usuario=txt(usuario);
    if(cache.lista&&cache.usuario===usuario&&Date.now()-cache.ts<TTL) return Promise.resolve(cache.lista);
    if(cache.promise&&cache.usuario===usuario)return cache.promise;
    cache.usuario=usuario;
    cache.promise=BASE_FETCH(api(),{
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({accion:"listarValidacionTecnica",usuario:usuario})
    }).then(r=>r.text()).then(t=>{
      let j;try{j=JSON.parse(t);}catch(_){return []}
      const l=j&&j.ok&&Array.isArray(j.validaciones)?j.validaciones:[];
      cache={ts:Date.now(),usuario:usuario,lista:l,promise:null};
      return l;
    }).catch(()=>{cache.promise=null;return []});
    return cache.promise;
  }

  function enriquecer(data,lista){
    if(!data||!Array.isArray(data.incidencias)||!Array.isArray(lista))return data;
    const mapa=new Map();
    lista.forEach(x=>{
      const tipo=norm(x&&x.tipoValidacion);
      if(tipo!=="GAR"&&tipo!=="VTR")return;
      const t=ticketRegistro(x);if(!t)return;
      mapa.set(t,x);
    });
    data.incidencias.forEach(x=>{
      const t=ticketCanon(x&&x.ticket);if(!t)return;
      const v=mapa.get(t);if(!v)return;
      const estado=estadoRegistro(v);
      x.registroTecnico="REGISTRADA";
      x.validacionId=txt(v.id);
      x.bono=estado;
      x.estadoRegistroTecnico=estado;
      x.puntajeVtrGar=(v.puntajeVtrGar===undefined||v.puntajeVtrGar==="")?null:v.puntajeVtrGar;
      x.comentarioJefatura=txt(v.motivoValidacion);
      x.validadoPor=txt(v.validadoPor);
      x.requiereBono=estado==="PENDIENTE";
      x.requiereIntervencion=!!(x.requiereClasificacion||x.requiereBono);
    });
    return data;
  }

  window.fetch=function(input,init){
    let body=null;
    try{
      const method=norm(init&&init.method||"GET");
      if(method!=="POST"||typeof init?.body!=="string")return BASE_FETCH(input,init);
      body=JSON.parse(init.body);
      if(!body||body.accion!=="listarVtrGarV517A")return BASE_FETCH(input,init);
    }catch(_){return BASE_FETCH(input,init);}

    return Promise.all([BASE_FETCH(input,init),cargarValidaciones(body.usuario)]).then(async ([res,lista])=>{
      if(!res||!res.ok)return res;
      try{
        const text=await res.clone().text();
        const data=JSON.parse(text);
        enriquecer(data,lista);
        return new Response(JSON.stringify(data),{
          status:res.status,
          statusText:res.statusText,
          headers:{"Content-Type":"application/json;charset=utf-8"}
        });
      }catch(_){return res;}
    });
  };

  window.mv517c2aLimpiarCache=function(){cache={ts:0,usuario:"",lista:null,promise:null};};
  console.log("MI VISUAL V517C.2A: compatibilidad historica de registros activa.");
})();