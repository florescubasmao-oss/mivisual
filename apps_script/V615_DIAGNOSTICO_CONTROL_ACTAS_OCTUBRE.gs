/* V615 - diagnóstico seguro de Control de Actas.
 * Ejecutar desde Apps Script como usuario autorizado.
 * SOLO LECTURA. No invoca reconstruirControlActasPeriodoV396_.
 */
function diagnosticoV615ControlActasOctubre() {
  const periodo = "2026-10";
  const control = leerControlActasV396_().filas.filter(function(x){return x.periodo===periodo;});
  const historica = leerFinalizadasHistoricasPeriodoV397_(periodo);
  const mapa = leerFinalizadasMapaPeriodoV521_(periodo);
  const muestras = mapa.registros.slice(0,5).map(function(x){
    return {orden:x.codigoLiquidacion,fecha:String(x.fecha),sede:x.sede,cuadrilla:x.cuadrilla};
  });
  const salida = {
    ok:true, periodo:periodo,
    filasControl:control.length,
    historicasFinalizadas:historica.registros.length,
    mapaFinalizadas:mapa.registros.length,
    muestrasMapa:muestras,
    propuesta:control.length===0 && mapa.registros.length>0 ?
      "RECONSTRUIR_PERIODO_CON_PREVISUALIZACION" : "REVISAR_FUENTES"
  };
  Logger.log(JSON.stringify(salida));
  return salida;
}
