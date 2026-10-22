// Regresión de equivalencias: solo octubre de 2026.
// Ejecutar: node tests/homologacion_octubre_2026.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const archivo = fs.readFileSync('js/utilidades.js', 'utf8');
const inicio = archivo.lastIndexOf('function mvHomologarCuadrillaOctubre(');
assert.ok(inicio >= 0, 'Falta la función de homologación');
const fn = vm.runInNewContext(archivo.slice(inicio) + '\n;mvHomologarCuadrillaOctubre;');
const equivalencias = [
  ['P22 VISUAL SGI MARCELO JULIAN ARELLANO VALDIVIEZO', 'P22 VISUAL SGI ERICK GARY SAMAME HEREDIA'],
  ['P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO', 'P8 VISUAL SGA CARLOS EDUARDO COVEÑAS ASANZA'],
  ['P11 VISUAL SGI ANDRYK JEFFRY CARDENAS AGUILAR', 'P1 VISUAL SGA ANDRYK JEFFRY CARDENAS AGUILAR']
];
for (const [antes, despues] of equivalencias) {
  for (const periodo of ['2026-10', '22/10/2026', 'OCTUBRE 2026']) {
    assert.equal(fn(antes, periodo), despues, periodo);
  }
  for (const periodo of ['2026-07', '2026-08', '2026-09', '2026-11', '2025-10', 'OCTUBRE 2025']) {
    assert.equal(fn(antes, periodo), antes, periodo);
  }
}
console.log('Homologación octubre: 27 comprobaciones superadas');
