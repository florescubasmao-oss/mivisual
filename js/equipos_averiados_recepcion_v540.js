/* ============================================================
   MI VISUAL V540 - EQUIPOS AVERIADOS / RECEPCION RESILIENTE
   16/09/2026

   Corrige respuestas HTTP 404 temporales al confirmar recepción.
   - NO repite automáticamente la escritura.
   - Conserva el mismo solicitudId de la operación.
   - Verifica varias veces aunque una verificación también responda 404.
   - Usa el listado como segunda comprobación de solo lectura.
   - Evita dobles cargos / dobles recepciones.
   - No modifica permisos, reglas, estados ni backend.
============================================================ */
(function(){
  "use strict";

  if(window.MV540_EA_RECEPCION_OK) return;
  window.MV540_EA_RECEPCION_OK = true;

  function txt(v){ return String(v == null ? "" : v).trim(); }
  function norm(v){
    return txt(v).toUpperCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }
  function dormir(ms){ return new Promise(function(resolve){ setTimeout(resolve,ms); }); }

  function esTransitorio(error){
    const m = String(error && error.message || error || "");
    return /HTTP\s*404|HTTP\s*408|HTTP\s*429|HTTP\s*500|HTTP\s*502|HTTP\s*503|HTTP\s*504|404|tard|timeout|abort|fetch|network|servidor|respuesta valida|respuesta válida|temporalmente/i.test(m);
  }

  function recogerEquipos(){
    return Array.from(document.querySelectorAll("#eaModal tbody tr")).map(function(tr){
      return {
        serie: txt(tr.dataset.serie),
        estado: tr.querySelector(".ea-rec-estado") ? tr.querySelector(".ea-rec-estado").value : "PENDIENTE",
        observacion: tr.querySelector(".ea-rec-obs") ? tr.querySelector(".ea-rec-obs").value : ""
      };
    });
  }

  function coincideConDecision(item,equipos){
    if(!item || !Array.isArray(item.equipos) || !Array.isArray(equipos) || !equipos.length) return false;

    const mapa = Object.create(null);
    item.equipos.forEach(function(e){ mapa[norm(e && e.serie)] = e || {}; });

    const todasCoinciden = equipos.every(function(dec){
      const e = mapa[norm(dec && dec.serie)];
      if(!e) return false;
      return norm(e.estadoRecepcion || "PENDIENTE") === norm(dec.estado || "PENDIENTE");
    });

    if(!todasCoinciden) return false;

    return !!txt(item.validadoPor || item.fechaValidacion || item.horaValidacion || item.idCargo || item.linkCargo);
  }

  async function verificarPorId(id,solicitudId){
    let ultimoError = null;
    const pausas = [900,1400,1900,2600,3400,4300];

    for(let intento=0; intento<pausas.length; intento++){
      await dormir(pausas[intento]);
      try{
        const ver = await window.eaApi({
          accion:"verificarRecepcionEquiposAveriadosV399",
          usuario:window.eaUsuario().usuario,
          id:id,
          solicitudId:solicitudId,
          _v540:Date.now()+"-"+intento
        });
        if(ver && ver.confirmado) return {confirmado:true,respuesta:ver,metodo:"ID"};
      }catch(error){
        ultimoError = error;
        if(!esTransitorio(error)) break;
      }
    }

    return {confirmado:false,error:ultimoError};
  }

  async function verificarPorListado(id,equipos){
    try{
      const d = await window.eaApi({
        accion:"listarEquiposAveriados",
        usuario:window.eaUsuario().usuario,
        _v540:Date.now()
      });
      const lista = Array.isArray(d && d.solicitudes) ? d.solicitudes : [];
      const item = lista.find(function(x){ return txt(x && x.id) === txt(id); });
      if(item && coincideConDecision(item,equipos)){
        return {confirmado:true,respuesta:{ok:true,id:id,estado:item.estado,cargo:null},metodo:"LISTADO"};
      }
    }catch(_){ }
    return {confirmado:false};
  }

  async function finalizarConfirmada(respuesta,metodo){
    try{
      if(respuesta && respuesta.cargo && typeof window.eaAbrirCargoV399 === "function"){
        window.eaAbrirCargoV399(respuesta.cargo);
      }
    }catch(_){ }

    try{ if(typeof window.eaCacheLimpiarV539 === "function") window.eaCacheLimpiarV539(); }catch(_){ }
    try{ if(typeof window.eaCerrarModal === "function") window.eaCerrarModal(); }catch(_){ }

    try{
      await window.mostrarEquiposAveriados();
      if(typeof window.eaAvisoV539 === "function"){
        window.eaAvisoV539(
          metodo === "DIRECTO"
            ? "Recepción registrada correctamente."
            : "Recepción confirmada correctamente después de verificar la respuesta del servidor.",
          "ok"
        );
      }
    }catch(_){
      alert("Recepción confirmada correctamente. Actualice la pantalla para ver el estado final.");
    }
  }

  function instalar(){
    if(typeof window.eaConfirmarRecepcion !== "function" ||
       typeof window.eaApi !== "function" ||
       typeof window.eaUsuario !== "function" ||
       typeof window.eaSolicitudIdV399 !== "function") return false;

    if(window.eaConfirmarRecepcion.__mv540) return true;

    const confirmarV540 = async function(id){
      const equipos = recogerEquipos();
      const obs = document.getElementById("eaRecObsGeneral");
      const observacionGeneral = obs ? obs.value : "";
      const solicitudId = window.eaSolicitudIdV399();
      const btn = document.querySelector("#eaModal .ea-btn.green");
      const textoOriginal = btn && btn.textContent ? btn.textContent : "Confirmar recepción";
      let incertidumbre = false;

      try{
        if(btn){
          btn.disabled = true;
          btn.textContent = "Confirmando recepción...";
        }

        const d = await window.eaApi({
          accion:"validarRecepcionEquiposAveriados",
          usuario:window.eaUsuario().usuario,
          id:id,
          equipos:equipos,
          observacionGeneral:observacionGeneral,
          solicitudId:solicitudId
        });

        await finalizarConfirmada(d,"DIRECTO");
        return;

      }catch(error){
        if(!esTransitorio(error)){
          alert(error && error.message ? error.message : String(error));
          return;
        }

        incertidumbre = true;
        if(btn) btn.textContent = "Verificando registro...";

        const porId = await verificarPorId(id,solicitudId);
        if(porId.confirmado){
          incertidumbre = false;
          await finalizarConfirmada(porId.respuesta,"ID");
          return;
        }

        const porListado = await verificarPorListado(id,equipos);
        if(porListado.confirmado){
          incertidumbre = false;
          await finalizarConfirmada(porListado.respuesta,"LISTADO");
          return;
        }

        alert(
          "Google Apps Script no permitió confirmar todavía la respuesta del servidor.\n\n"+
          "NO vuelva a presionar Confirmar. Cierre este aviso y actualice la pantalla. "+
          "Si el equipo ya figura como RECIBIDO, la operación quedó registrada y no debe repetirse."
        );

      }finally{
        if(btn && document.body.contains(btn)){
          if(incertidumbre){
            btn.disabled = true;
            btn.textContent = "Actualizar para verificar";
          }else{
            btn.disabled = false;
            btn.textContent = textoOriginal;
          }
        }
      }
    };

    confirmarV540.__mv540 = true;
    window.eaConfirmarRecepcion = confirmarV540;
    try{ eaConfirmarRecepcion = confirmarV540; }catch(_){ }

    console.log("MI VISUAL V540: recepción de Equipos Averiados resiliente habilitada.");
    return true;
  }

  const previo = window.mv339Antes_mostrarEquiposAveriados;
  window.mv339Antes_mostrarEquiposAveriados = function(){
    if(typeof previo === "function"){
      try{ previo.apply(this,arguments); }catch(_){ }
    }
    setTimeout(instalar,0);
    setTimeout(instalar,350);
  };

  setTimeout(instalar,2500);
  setTimeout(instalar,6000);
  window.addEventListener("load",function(){ setTimeout(instalar,1800); });
})();
