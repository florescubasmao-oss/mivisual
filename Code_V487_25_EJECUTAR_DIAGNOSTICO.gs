/* ==========================================================
   MI VISUAL V487.25 - EJECUTOR DE DIAGNOSTICO SOLO LECTURA
   Requiere Code_V487_25_VTRGAR_VALIDACION_TECNICA_WIN_PATCH.gs
   No escribe ni modifica hojas.
========================================================== */

function EJECUTAR_DIAGNOSTICO_V48725() {
  var resultado = DIAGNOSTICO_V48725_VTRGAR_WIN();
  var texto = JSON.stringify(resultado, null, 2);
  console.log(texto);
  Logger.log(texto);
  return resultado;
}
