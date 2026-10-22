/* V642 - Alias economico de octubre 2026. No altera identidades de otros meses.
 * No modifica fuente de ordenes, catalogos, usuarios ni historicos.
 * Integrar en el Apps Script V632 vigente sustituyendo SOLO
 * mv632PrepararPoblacionEconomica_ y agregando mv642AliasEconomicoOctubre_.
 */
function mv642AliasEconomicoOctubre_(nombre, periodoClave) {
  var n = normalizarCuadrilla(nombre);
  if (String(periodoClave || '') !== '2026-10') return n;
  var k = normalizarTexto(n);
  var tabla = {
    'P22 VISUAL SGI MARCELO JULIAN ARELLANO VALDIVIEZO': 'P22 VISUAL SGI ERICK GARY SAMAME HEREDIA',
    'P8 VISUAL SGA BRUNO ANGELO ATARAMA OROZCO': 'P8 VISUAL SGA CARLOS EDUARDO COVEÑAS ASANZA',
    'P11 VISUAL SGI ANDRYK JEFFRY CARDENAS AGUILAR': 'P1 VISUAL SGA ANDRYK JEFFRY CARDENAS AGUILAR'
  };
  return tabla[k] || n;
}

function mv632PrepararPoblacionEconomica_(periodo, matriz, usuarios, referencia) {
  var exactos = {}, porIdentidad = {}, grupos = {}, alias = {};
  function registrar(nombre, sede, plataforma) {
    nombre = mv642AliasEconomicoOctubre_(nombre, periodo.clave);
    sede = normalizarTexto(sede);
    var id = mv632IdentidadEconomica_(nombre);
    if (!id || !sede || sede === 'TODAS' || sede === 'SIN SEDE') return;
    var dato = {sede:sede, plataforma:plataforma, identidad:id};
    if (exactos[nombre] && exactos[nombre].sede !== sede) throw new Error('V632: sede historica ambigua para ' + nombre);
    exactos[nombre] = dato;
    if (!porIdentidad[id]) porIdentidad[id] = {};
    porIdentidad[id][sede] = dato;
  }
  (referencia || []).forEach(function(f) {
    if (String(f[0]) === periodo.clave) registrar(f[3], f[4], f[5]);
  });
  // USUARIOS solo aporta sede al mes vigente/futuro. Nunca define la poblacion.
  var actual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
  if (periodo.clave >= actual) Object.keys(usuarios || {}).forEach(function(n) {
    var u = usuarios[n] || {};
    if (!exactos[mv642AliasEconomicoOctubre_(n, periodo.clave)]) registrar(n, u.sede, u.plataforma);
  });
  var filas = [];
  for (var i=1; i<(matriz || []).length; i++) {
    var f = matriz[i], original = normalizarCuadrilla(f[1]), n = mv642AliasEconomicoOctubre_(original, periodo.clave), fecha = convertirFechaAnalisisEconomico(f[2]);
    if (!fecha || fecha.getFullYear() !== periodo.anio || fecha.getMonth()+1 !== periodo.mes || !String(f[3] || '').trim() || numeroProduccion(f[4]) <= 0) continue;
    var id = mv632IdentidadEconomica_(n);
    if (!id) throw new Error('V632: cuadrilla sin identidad operativa: ' + n);
    var dato = exactos[n], opciones = porIdentidad[id] || {};
    if (!dato && Object.keys(opciones).length === 1) dato = opciones[Object.keys(opciones)[0]];
    if (!dato) throw new Error('V632: falta sede historica unica para ' + n + ' en ' + periodo.clave);
    var clave = dato.sede + '|' + id;
    if (!grupos[clave]) grupos[clave] = {cuadrilla:n, sede:dato.sede, plataforma:dato.plataforma, identidad:id, fecha:-1, aliases:{}};
    var g = grupos[clave];
    g.aliases[n] = true;
    g.aliases[original] = true;
    if (fecha.getTime() > g.fecha || (fecha.getTime() === g.fecha && n < g.cuadrilla)) {g.fecha=fecha.getTime(); g.cuadrilla=n;}
    filas.push({fila:f, grupo:g});
  }
  var lista = Object.keys(grupos).sort().map(function(k) {
    var g = grupos[k];
    Object.keys(g.aliases).forEach(function(n) {alias[n]=g.cuadrilla;});
    // Incluye nombres de referencia para leer descansos, sin darles una meta adicional.
    Object.keys(exactos).forEach(function(n) {
      if (exactos[n].sede === g.sede && exactos[n].identidad === g.identidad) alias[n]=g.cuadrilla;
    });
    return {cuadrilla:g.cuadrilla, sede:g.sede, plataforma:g.plataforma};
  });
  var copia = [matriz && matriz[0] ? matriz[0].slice() : []];
  filas.forEach(function(x) {var f=x.fila.slice(); f[1]=x.grupo.cuadrilla; copia.push(f);});
  return {matriz:copia, cuadrillas:lista, alias:alias};
}
