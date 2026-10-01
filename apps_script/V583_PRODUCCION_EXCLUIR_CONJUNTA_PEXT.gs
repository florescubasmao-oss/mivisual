/* ============================================================
   MI VISUAL V583 - PRODUCCION / EXCLUSION CONJUNTA PEXT
   30/09/2026

   PROBLEMA:
   - V517D F4L bloquea toda la publicación si una orden queda DUDOSA.
   - Orden 3476682 es TIPO_TRABAJO = CONJUNTA PEXT y
     PRODUCTO_ORIGEN = PLANTA EXTERNA.
   - CATALOGO_ORDENES no tiene partida para CONJUNTA PEXT.
   - Ese trabajo pertenece al módulo PEXT, no a Producción normal.

   ALCANCE:
   - Excluye SOLO órdenes cuyo TIPO_TRABAJO sea exactamente CONJUNTA PEXT
     y cuya fuente sea PLANTA EXTERNA / cliente CONJUNTA PEXT.
   - NO excluye averías normales cuyo MOTIVO_FINALIZACION contenga
     "CONJUNTA PEXT AVERIA".
   - NO cambia puntajes PEXT, GAR/VTR, Efectividad, Recableado, Ranking,
     SLA, Actas ni Mapa.
============================================================ */

var MV583_VERSION_ = "V583-PRODUCCION-EXCLUIR-CONJUNTA-PEXT-20260930";

function mv583EsConjuntaPextOperativa_(orden) {
  if (!orden) return false;

  var tipo = mv487pNorm_(orden.tipoTrabajo || "");
  var origen = mv487pNorm_(orden.productoOrigen || "");
  var cliente = mv487pNorm_(orden.cliente || "");

  return (
    tipo === "CONJUNTA PEXT" &&
    (
      origen === "PLANTA EXTERNA" ||
      cliente === "CONJUNTA PEXT"
    )
  );
}

/*
   Se redefine únicamente el preparador final de Producción F4L.
   Todo lo demás conserva exactamente la lógica F4L vigente.
*/
mv517D3CPrepararProduccion_ = function(base,usuarioSesion) {
  if (typeof previsualizarProduccionWinParalelaV487 !== "function") {
    throw new Error("V517D F4L: no esta disponible Produccion WIN V487.");
  }

  var preview=previsualizarProduccionWinParalelaV487({
    usuario:usuarioSesion,
    periodo:base.periodo
  });
  if (!preview || preview.ok===false) {
    throw new Error(preview && preview.error ? preview.error : "V517D F4L: no se pudo calcular Produccion.");
  }

  var porOrden={};
  (base.ordenes||[]).forEach(function(o){
    porOrden[mv487pId_(o.ordenId)]=o;
  });

  var gestion=mv487sGestionVtrGar_();
  var manuales=mv517D4LManualesPorOrden_(base.periodo);
  var mapa={}, dudosas=[];
  var excluidasVtrGar=0, recuperadasNoEsGarVtr=0;
  var excluidasManualF4L=0;
  var excluidasPextV583=0;
  var detalleRecuperadas=[], detalleManual=[], detallePext=[];
  var ordenes=0, puntos=0;

  (preview.detalle||[]).forEach(function(x){
    var ordenId=mv487pId_(x.ordenId);
    var orden=porOrden[ordenId] || null;

    /*
       V583: una CONJUNTA PEXT operativa no debe intentar traducirse a una
       partida de Producción normal. Se conserva en Mapa y en el módulo PEXT.
    */
    if (orden && mv583EsConjuntaPextOperativa_(orden)) {
      excluidasPextV583++;
      detallePext.push({
        ordenId:ordenId,
        cuadrilla:String(orden.cuadrilla || ""),
        fecha:String(orden.fechaSolicitud || ""),
        tipoTrabajo:String(orden.tipoTrabajo || ""),
        productoOrigen:String(orden.productoOrigen || ""),
        codigoSeguimiento:String(orden.codigoSeguimiento || "")
      });
      return;
    }

    var tipoWin=orden ? mv487sTipoVtrGar_(orden) : "";
    var manual=manuales[ordenId] || null;

    if (orden && tipoWin) {
      var control=mv517D3CDecisionProduccion_(orden,gestion);
      if (!control.recuperar) {
        excluidasVtrGar++;
        return;
      }
      recuperadasNoEsGarVtr++;
      detalleRecuperadas.push({
        ordenId:ordenId,
        ticket:String(orden.codigoSeguimiento || ""),
        decision:control.decision,
        criterio:control.criterio,
        codigoPartida:String(x.codigoPartida || ""),
        puntos:Number(x.puntos)||0,
        cuadrilla:String(orden.cuadrilla || ""),
        calificadoPor:control.calificadoPor
      });
    } else if (orden && manual) {
      var em=mv517D4LNorm_(manual.estado);
      if (em==="CONFIRMADO" || em==="REASIGNADO") {
        excluidasVtrGar++;
        excluidasManualF4L++;
        detalleManual.push({
          ordenId:ordenId,
          ticketInterno:manual.ticket,
          ticketWinOriginal:String(orden.codigoSeguimiento || ""),
          decision:em,
          responsable:manual.responsable,
          codigoPartida:String(x.codigoPartida || ""),
          puntos:Number(x.puntos)||0
        });
        return;
      }
    }

    if (!x.codigoPartida || mv487pNorm_(x.clasificacion)==="DUDOSA") {
      dudosas.push({
        ordenId:x.ordenId,
        cuadrilla:x.cuadrillaWin || x.cuadrillaEjecutora,
        codigoPartida:x.codigoPartida || "",
        motivo:x.motivoIntervencion || x.regla || "Sin clasificacion confiable"
      });
      return;
    }

    var cuad=orden
      ? orden.cuadrilla
      : normalizarCuadrilla(x.cuadrillaWin || x.cuadrillaEjecutora || "");
    var fecha=mv487pFecha_(x.fecha);
    if (!cuad || !fecha) {
      dudosas.push({
        ordenId:x.ordenId,
        cuadrilla:cuad||"",
        codigoPartida:x.codigoPartida,
        motivo:"Cuadrilla o fecha no valida"
      });
      return;
    }

    var codigo=mv487pTexto_(x.codigoPartida);
    var clave=[cuad,mv487pFechaIso_(fecha),codigo].join("|");
    if (!mapa[clave]) {
      mapa[clave]={
        usuario:usuarioSesion || "ADMIN",
        cuadrilla:cuad,
        fecha:fecha,
        codigo:codigo,
        cantidad:0,
        puntosUnitarios:Number(x.puntos)||0
      };
    }

    mapa[clave].cantidad++;
    ordenes++;
    puntos+=Number(x.puntos)||0;
  });

  if (dudosas.length) {
    throw new Error(
      "V517D F4L: Produccion no se puede publicar. Existen " +
      dudosas.length + " orden(es) sin clasificacion confiable. Ejemplos: " +
      dudosas.slice(0,8).map(function(x){
        return x.ordenId+" ("+x.motivo+")";
      }).join(", ")
    );
  }

  var registros=Object.keys(mapa).sort().map(function(k){
    return mapa[k];
  });

  return {
    preview:preview,
    registros:registros,
    ordenes:ordenes,
    puntos:puntos,
    excluidasVtrGar:excluidasVtrGar,
    versionRecuperacionNoEsGarVtr:MV517D_F3C_VERSION_,
    versionGestionNormalGarVtr:MV517D_F4L_VERSION_,
    recuperadasNoEsGarVtr:recuperadasNoEsGarVtr,
    detalleRecuperadasNoEsGarVtr:detalleRecuperadas,
    excluidasManualF4L:excluidasManualF4L,
    detalleExcluidasManualF4L:detalleManual,
    versionExclusionPextV583:MV583_VERSION_,
    excluidasPextV583:excluidasPextV583,
    detalleExcluidasPextV583:detallePext
  };
};

function V583_DIAGNOSTICO_PEXT_SETIEMBRE() {
  var base=mv546LeerMapaCanonicoPublicacion_({
    periodo:"2026-09"
  });

  var lista=(base.ordenes||[]).filter(mv583EsConjuntaPextOperativa_).map(function(o){
    return {
      ordenId:o.ordenId,
      fecha:o.fechaSolicitud,
      cuadrilla:o.cuadrilla,
      tipoTrabajo:o.tipoTrabajo,
      productoOrigen:o.productoOrigen,
      motivoFinalizacion:o.motivoFinalizacion,
      codigoSeguimiento:o.codigoSeguimiento
    };
  });

  var salida={
    ok:true,
    version:MV583_VERSION_,
    periodo:"2026-09",
    registros:lista.length,
    ordenes:lista
  };

  Logger.log(JSON.stringify(salida,null,2));
  return salida;
}
