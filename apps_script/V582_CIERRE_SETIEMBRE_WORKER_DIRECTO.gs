/* ============================================================
   MI VISUAL V582 - CIERRE SETIEMBRE / WORKER DIRECTO
   30/09/2026

   Uso manual de soporte:
   - Evita depender de procesarValidacionesTecnicasVencidas, que puede estar
     redefinida por otros archivos .gs del proyecto.
   - Llama directamente al worker V547 ya instalado.
   - No recarga Excel.
   - No crea triggers.
   - No cambia reglas de Produccion / Efectividad / Recableado / VTR-GAR /
     Ranking / Dashboard / SLA.
============================================================ */

function V582_PROCESAR_CIERRE_SETIEMBRE() {
  var antes = mv547LeerColaMapaIndicadores_();
  Logger.log(JSON.stringify({
    v582:"ANTES",
    cola:mv547ResumenEstadoCola_(antes)
  }, null, 2));

  var resultado = mv547ProcesarColaMapaIndicadores_();

  Logger.log(JSON.stringify({
    v582:"RESULTADO_WORKER",
    resultado:resultado
  }, null, 2));

  var despues = mv547LeerColaMapaIndicadores_();
  Logger.log(JSON.stringify({
    v582:"DESPUES",
    cola:mv547ResumenEstadoCola_(despues)
  }, null, 2));

  return resultado;
}

function V582_DIAGNOSTICO_CIERRE_SETIEMBRE() {
  var cola = mv547LeerColaMapaIndicadores_();
  var salida = {
    ok:true,
    version:"V582-CIERRE-SETIEMBRE-WORKER-DIRECTO-20260930",
    cola:mv547ResumenEstadoCola_(cola),
    workerDisponible:typeof mv547ProcesarColaMapaIndicadores_ === "function",
    publicadorDisponible:typeof publicarIndicadoresWinV517D === "function"
  };
  Logger.log(JSON.stringify(salida,null,2));
  return salida;
}
