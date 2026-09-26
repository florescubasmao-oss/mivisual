/* ============================================================
   MI VISUAL V566 - SINCRONIZACION SEGURA DE SESION POR CORREO
   - Mantiene la logica de ingreso actual.
   - Si USUARIOS cambia la cuadrilla/usuario de una persona ya logueada,
     refresca localStorage usando el CORREO de la sesion como identidad.
   - No reasigna una sesion por codigo de usuario reciclado.
============================================================ */
(function(){
  "use strict";
  if(window.MV566_SYNC_SESION_OK) return;

  const URL_USUARIOS="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=0&single=true&output=csv";
  let ultimoIntento=0;

  function limpiar(v){ return (v==null?"":String(v)).replace(/^"|"$/g,"").trim(); }

  function parseCsv(linea){
    const out=[]; let cur="",q=false;
    for(let i=0;i<linea.length;i++){
      const ch=linea[i];
      if(ch==='"'){
        if(q && linea[i+1]==='"'){cur+='"';i++;}
        else q=!q;
      }else if(ch==="," && !q){out.push(cur);cur="";}
      else cur+=ch;
    }
    out.push(cur);
    return out.map(limpiar);
  }

  async function mv566SincronizarSesionActual(forzar){
    const ahora=Date.now();
    if(!forzar && ahora-ultimoIntento<60000) return {ok:true,omitido:true};
    ultimoIntento=ahora;

    const correo=(localStorage.getItem("correo")||"").trim().toLowerCase();
    const usuarioActual=(localStorage.getItem("usuario")||"").trim();
    if(!correo || !usuarioActual) return {ok:true,sinSesion:true};

    try{
      const texto=typeof mv336FetchTextoCache==="function"
        ? await mv336FetchTextoCache(URL_USUARIOS,15000)
        : await fetch(URL_USUARIOS,{cache:"no-store"}).then(r=>{
            if(!r.ok) throw new Error("No se pudo leer USUARIOS");
            return r.text();
          });

      const filas=String(texto||"").split(/\r?\n/).filter(Boolean);
      let encontrada=null;

      for(let i=1;i<filas.length;i++){
        const d=parseCsv(filas[i]);
        const correoFila=(d[1]||"").trim().toLowerCase();
        if(correoFila && correoFila===correo){ encontrada=d; break; }
      }

      // Si el correo ya no existe en USUARIOS no se transforma la sesion
      // en la identidad de otra persona. Se deja intacta y se registra aviso.
      if(!encontrada){
        console.warn("V566: correo de sesion no encontrado en USUARIOS; sesion no modificada.");
        return {ok:false,noEncontrado:true};
      }

      const nuevo={
        usuario:encontrada[0]||"",
        cuadrilla:encontrada[3]||"",
        sede:encontrada[4]||"",
        plataforma:encontrada[5]||"",
        perfil:encontrada[6]||"",
        nivel:encontrada[7]||"",
        estado:encontrada[8]||"",
        nombresApellidos:encontrada[10]||""
      };

      let cambio=false;
      Object.keys(nuevo).forEach(k=>{
        const anterior=localStorage.getItem(k)||"";
        if(anterior!==nuevo[k]){
          localStorage.setItem(k,nuevo[k]);
          cambio=true;
        }
      });

      if(cambio){
        window.MV566_SESION_ACTUALIZADA=true;
        try{ if(typeof configurarMenu==="function") configurarMenu(); }catch(_){}
        console.info("V566: sesion actualizada desde USUARIOS por correo.");
      }
      return {ok:true,cambio:cambio,usuario:nuevo.usuario,cuadrilla:nuevo.cuadrilla};
    }catch(e){
      console.warn("V566: no se pudo sincronizar sesion",e);
      return {ok:false,error:e&&e.message?e.message:String(e)};
    }
  }

  window.mv566SincronizarSesionActual=mv566SincronizarSesionActual;

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>mv566SincronizarSesionActual(true),250),{once:true});
  }else{
    setTimeout(()=>mv566SincronizarSesionActual(true),250);
  }

  window.addEventListener("focus",()=>mv566SincronizarSesionActual(false));
  window.MV566_SYNC_SESION_OK=true;
})();