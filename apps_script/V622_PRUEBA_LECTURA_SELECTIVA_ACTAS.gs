/**
 * MI VISUAL V622 - PRUEBA DE LECTURA SELECTIVA DE MAPA PARA ACTAS
 * SOLO LECTURA. No modifica Code.gs ni hojas ni archivos de Drive.
 * Ejecutar manualmente v622ProbarBusquedaMapaActas() desde Apps Script.
 * Requiere las funciones vigentes buscarRegistroMapaParaActa y
 * filaMapaOperativoAObjeto, sin sustituirlas.
 */
function v622ProbarBusquedaMapaActas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("MAPA_ORDENES");
  if (!hoja) throw new Error("No existe MAPA_ORDENES");
  const fin = hoja.getLastRow();
  if (fin <= 1) throw new Error("MAPA_ORDENES vacia");
  const inicio = Math.max(2, fin - 299);
  const recientes = hoja.getRange(inicio, 1, fin - inicio + 1, 15).getDisplayValues();
  const muestras = [];
  const vistos = {};
  for (let i = recientes.length - 1; i >= 0 && muestras.length < 5; i--) {
    const f = recientes[i], orden = String(f[0] || "").trim();
    const cuadrilla = String(f[7] || "").trim();
    const estado = String(f[8] || "").trim().toUpperCase();
    const pedido = String(f[14] || "").trim();
    if (orden && cuadrilla && pedido && estado === "FINALIZADA" && !vistos[orden]) {
      muestras.push({orden:orden, pedido:pedido, cuadrilla:cuadrilla});
      vistos[orden] = true;
    }
  }
  if (!muestras.length) throw new Error("No hay muestras FINALIZADAS recientes");
  const detalle = [];
  let antiguoMs = 0, selectivoMs = 0, coincidencias = 0;
  muestras.forEach(function(x) {
    const a = Date.now();
    const antes = buscarRegistroMapaParaActa(x.pedido, x.orden, x.cuadrilla);
    const b = Date.now();
    const despues = v622BuscarMapaSelectivo_(hoja, x.pedido, x.orden, x.cuadrilla);
    const c = Date.now();
    const igual = v622IdentidadMapa_(antes) === v622IdentidadMapa_(despues);
    if (igual) coincidencias++;
    antiguoMs += b-a; selectivoMs += c-b;
    detalle.push({orden:x.orden,coincide:igual,lecturaCompletaMs:b-a,lecturaSelectivaMs:c-b});
  });
  const salida = {ok:true,version:"V622",modo:"SOLO_LECTURA",muestras:detalle.length,
    coincidencias:coincidencias,lecturaCompletaTotalMs:antiguoMs,
    lecturaSelectivaTotalMs:selectivoMs,detalle:detalle,
    aptaParaSiguienteFase:coincidencias===detalle.length};
  Logger.log("V622 DIAGNOSTICO " + JSON.stringify(salida));
  return salida;
}
function v622IdentidadMapa_(x) {
  if (!x) return "SIN_COINCIDENCIA";
  return [x.ordenId,x.codigoCliente,x.cuadrilla,x.region,x.fechaSolicitud,x.fechaFinVisita]
    .map(function(v) { return v instanceof Date ? v.getTime() : String(v == null ? "" : v); }).join("|");
}
function v622Clave_(v) {
  return String(v == null ? "" : v).toUpperCase().replace(/[^A-Z0-9]/g,"");
}
function v622BuscarMapaSelectivo_(hoja, codigoPedido, codigoOrden, cuadrilla) {
  const ultimo = hoja.getLastRow();
  if (ultimo <= 1) return null;
  const pedido = v622Clave_(codigoPedido), orden = v622Clave_(codigoOrden);
  const claveCuadrilla = claveCuadrillaActa(cuadrilla);
  if (!pedido && !orden) return null;
  // A:O contiene ORDEN_ID, CUADRILLA y CODIGO_CLIENTE.
  // Solo se leen completas las filas cuyos codigos podrian coincidir.
  const filtro = hoja.getRange(2, 1, ultimo - 1, 15).getDisplayValues();
  const candidatas = [];
  for (let i = filtro.length - 1; i >= 0; i--) {
    const f = filtro[i];
    if (claveCuadrilla && claveCuadrillaActa(f[7]) !== claveCuadrilla) continue;
    const o = v622Clave_(f[0]), p = v622Clave_(f[14]);
    if ((orden && (o === orden || p === orden)) ||
        (pedido && (p === pedido || o === pedido))) candidatas.push(i + 2);
  }
  let mejor = null, mejorPuntaje = -1;
  for (let i = 0; i < candidatas.length; i++) {
    const fila = hoja.getRange(candidatas[i], 1, 1, 26).getValues()[0];
    const item = filaMapaOperativoAObjeto(fila);
    const ordenMapa = v622Clave_(item.ordenId);
    const pedidoMapa = v622Clave_(item.codigoCliente);
    let puntaje = 0;
    if (orden && ordenMapa === orden) puntaje += 120;
    if (pedido && pedidoMapa === pedido) puntaje += 110;
    if (orden && pedidoMapa === orden) puntaje += 45;
    if (pedido && ordenMapa === pedido) puntaje += 40;
    if (!puntaje) continue;
    if (orden && pedido && ordenMapa === orden && pedidoMapa === pedido) puntaje += 100;
    if (puntaje > mejorPuntaje) {
      mejor = item; mejorPuntaje = puntaje;
      if (puntaje >= 330) break;
    }
  }
  return mejor;
}
