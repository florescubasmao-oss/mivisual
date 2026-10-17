/* Ejecutar: node tests/asistencia_motor_v638.test.js
   Pruebas puras: no necesitan Apps Script ni credenciales. */
const assert=require("node:assert/strict");
const motor=require("../js/asistencia_motor_v638.js");
const r=(hora,estado="FINALIZADA",extra={})=>({
 cuadrilla:"P2 VISUAL SGI EJEMPLO",ordenId:"100",horaSolicitud:"08:00",
 fechaInicioVisita:"17/10/2026 "+hora,momentoCargaConfirmada:"17/10/2026 08:21:00",
 estado,...extra
});
function first(rows){return motor.calcular(rows,{fecha:"2026-10-17"}).registros[0];}
assert.equal(first([r("08:05:00")]).estado,"A");
assert.equal(first([r("08:05:01")]).estado,"T");
assert.equal(first([r("08:15:00")]).estado,"T");
assert.equal(first([r("08:15:01")]).estado,"TD");
for(const estado of ["FINALIZADA","CANCELADA","REPROGRAMADA","REGESTION","ANULADA","INICIADA"]){
 assert.equal(first([r("08:03:00",estado)]).estado,"A",estado);
}
assert.equal(motor.calcular([r("08:03:00","CANCELADA",{momentoCargaConfirmada:"17/10/2026 08:19:59"})]).registros.length,0);
assert.equal(motor.calcular([r("08:03:00","CANCELADA",{momentoCargaConfirmada:"17/10/2026 08:20:00"})]).registros.length,0);
assert.equal(first([r("08:03:00","CANCELADA",{momentoCargaConfirmada:"17/10/2026 08:20:01"})]).estado,"A");
assert.equal(motor.calcular([r("08:03:00","CANCELADA",{momentoCargaConfirmada:""})]).registros.length,0);
assert.equal(motor.calcular([r("08:03:00","CANCELADA",{horaSolicitud:"12:00"})]).registros.length,0);
assert.equal(motor.calcular([r("08:03:00","CANCELADA",{fechaInicioVisita:""})]).registros.length,0);
assert.equal(first([r("08:13:00"),r("08:01:00","CANCELADA",{ordenId:"101"})]).ordenId,"101");
assert.equal(motor.calcular([r("08:03:00"),r("08:03:00")]).ordenesAdmitidas,1);
assert.equal(motor.estadoVisual("DESCANSO",first([r("08:03:00")])).codigo,"D");
assert.equal(motor.estadoVisual("DESCANSO",first([r("08:03:00")])).discrepancia,true);
assert.equal(motor.estadoVisual("VACACIONES",first([r("08:03:00")])).codigo,"V");
assert.equal(motor.estadoVisual("SIN ACTIVIDAD",first([r("08:03:00")])).codigo,"SA");
assert.equal(motor.estadoVisual("EN CAMPO",null).codigo,"PV");
assert.equal(motor.estadoVisual("EN CAMPO",null,{estado:"F"}).codigo,"PV");
assert.equal(motor.estadoVisual("EN CAMPO",null,{estado:"F",validadoPorSupervisor:true}).codigo,"F");
assert.equal(motor.estadoVisual("EN CAMPO",first([r("08:03:00")]),{estado:"ASIGNACION TARDIA"}).codigo,"PV");
assert.equal(motor.perfilAmpliado("GERENCIA GENERAL"),true);
assert.equal(motor.perfilAmpliado("ALMACEN"),false);
console.log("V638: pruebas unitarias puras correctas.");
