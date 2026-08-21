/* ============================================================
   MI VISUAL V455 - ACELERADOR SEGURO DEL GUARDADO DE ACTAS
   - Conserva TODAS las validaciones existentes.
   - Solo evita repetir en Guardar la prevalidación V396 que ya se ejecutó
     al resolver Código cliente/DNI unos segundos antes.
   - El backend registrarActaEscaneada vuelve a validar de todos modos.
============================================================ */
(function(){
  "use strict";
  if(window.MV455_GUARDADO_RAPIDO_OK) return;
  window.MV455_GUARDADO_RAPIDO_OK = true;

  let cache = null;
  let timer = null;

  function clave(v){
    return String(v == null ? "" : v).toUpperCase().replace(/[^A-Z0-9]/g,"");
  }

  function instalar(){
    if(window.MV455_GUARDADO_RAPIDO_HOOK) return true;
    if(!window.MV455_ACTAS_HOOK_INSTALADO) return false;
    if(typeof window.apiActas !== "function") return false;

    const base = window.apiActas;

    async function apiRapida(payload){
      const p = Object.assign({},payload || {});
      const accion = p.accion || "";

      if(accion === "validarCodigosActaV396" && cache){
        const mismaOrden = clave(p.codigoOrden || p.codigo_orden) === cache.orden;
        const mismoPedido = clave(p.codigoPedido || p.codigo_pedido) === cache.pedido;
        if(mismaOrden && mismoPedido && Date.now() - cache.fecha < 60000){
          return cache.data;
        }
      }

      const data = await base(p);

      if(accion === "validarCodigosActaV396" && data && data.ok !== false){
        cache = {
          orden:clave(p.codigoOrden || p.codigo_orden),
          pedido:clave(p.codigoPedido || p.codigo_pedido),
          fecha:Date.now(),
          data:data
        };
      }

      if(accion === "registrarActaEscaneada") cache = null;
      return data;
    }

    window.apiActas = apiRapida;
    try{ apiActas = apiRapida; }catch(_){}
    window.MV455_GUARDADO_RAPIDO_HOOK = true;
    console.log("MI VISUAL V455: acelerador seguro de guardado de actas habilitado.");
    return true;
  }

  if(!instalar()){
    timer = setInterval(function(){
      if(instalar()){
        clearInterval(timer);
        timer = null;
      }
    },150);
  }
})();
