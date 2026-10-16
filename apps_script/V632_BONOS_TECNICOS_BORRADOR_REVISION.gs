// V632: BORRADOR DE REVISION. NO INCORPORAR EN PRODUCCION TODAVIA.
// Cambios vigentes desde 2026-10-01; no afectan fechas anteriores.
// Uso previsto en Code.gs: sustituir la función calcularBonoDiaUtilidad_
// por el bloque indicado al final, y pasar dia.fecha en cargarBonosUtilidad_.
// No reemplazar el Code.gs desplegado con la versión histórica de GitHub.

function mv632ModalidadBonoTecnico_(cuadrilla, fecha) {
  const fechaClave = fecha instanceof Date
    ? Utilities.formatDate(fecha, "America/Lima", "yyyy-MM-dd")
    : String(fecha || "").slice(0, 10);
  if (fechaClave < "2026-10-01") return null;
  const s = normalizarTexto(normalizarCuadrilla(cuadrilla)).replace(/^P\s+(\d+)/, "P$1");
  const cambios = [
    { codigo:"P2", tipo:"SGI", nombre:"WILMER ANTONIO RACCHUMI SANTISTEBAN", modalidad:"ESPECIAL" },
    { codigo:"P9", tipo:"SGI", nombre:"ANTHONY JUNIOR CHAMBA VALVERDE", modalidad:"ESPECIAL" },
    { codigo:"P9", tipo:"SGA", nombre:"RONAL ENRIQUE TESEN CALDERON", modalidad:"ESPECIAL" },
    { codigo:"P12", tipo:"SGI", nombre:"LUIS ALEX FERNANDEZ CHANTA", modalidad:"REGULAR" },
    { codigo:"P15", tipo:"SGA", nombre:"JOSE SMITH RAMOS CHUNGA", modalidad:"TERCER_PUNTO" }
  ];
  for (let i=0;i<cambios.length;i++) {
    const c=cambios[i];
    if ((s.match(/^P\d+/)||[""])[0]!==c.codigo) continue;
    if (!s.includes(c.tipo) || !s.includes(c.nombre)) continue;
    return c.modalidad;
  }
  return null;
}

// Sustituir SOLO la funcion de nombre igual del Code.gs actual.
// Fecha se toma del agrupador diario; NO usar fecha actual del servidor.
function calcularBonoDiaUtilidad_(produccion, pext, cuadrilla, fecha) {
  const puntosProduccion=Math.max(0,Number(produccion)||0);
  const puntosPext=Math.max(0,Number(pext)||0);
  const total=puntosProduccion+puntosPext;
  const nuevaModalidad=mv632ModalidadBonoTecnico_(cuadrilla,fecha);
  const desdeTercer=nuevaModalidad==="TERCER_PUNTO";
  const umbral=desdeTercer?3:4.5;
  if (total+0.000001<umbral) return 0;
  const especial=nuevaModalidad==="ESPECIAL"
    ? true
    : nuevaModalidad==="REGULAR" || desdeTercer
      ? false
      : CUADRILLAS_BONO_ESPECIAL_UTILIDAD_.some(function(r){return cumpleReglaCuadrillaUtilidad_(cuadrilla,r);});
  const tarifaProduccion=especial?45:30;
  const base=desdeTercer?2:4;
  const puntosProduccionComisionables=Math.max(0,puntosProduccion-base);
  const basePendiente=Math.max(0,base-puntosProduccion);
  const puntosPextComisionables=Math.max(0,puntosPext-basePendiente);
  return Math.round((puntosProduccionComisionables*tarifaProduccion+puntosPextComisionables*30)*100)/100;
}

// INTEGRACION PENDIENTE (NO EJECUTAR COMO CODIGO SUELTO):
// En cargarBonosUtilidad_(periodo,mapa), al crear dias[clave], añadir fecha:
//    if (!dias[clave]) dias[clave]={cuadrilla,fecha:clave.split("|")[1],produccion:0,pext:0};
// Existen DOS lugares donde se crea dias[clave]: producción y PEXT.
// Sustituir la llamada:
//    item.bonos+=calcularBonoDiaUtilidad_(dia.produccion,dia.pext,dia.cuadrilla);
// por:
//    item.bonos+=calcularBonoDiaUtilidad_(dia.produccion,dia.pext,dia.cuadrilla,dia.fecha);
//
// VERIFICACIONES OBLIGATORIAS ANTES DE ACTIVAR:
//  - Septiembre: mismos importes que antes del cambio.
//  - Octubre: modalidades exactas para las 5 cuadrillas.
//  - P15 SGA: 2 puntos => S/0; 3 puntos => S/30 (sujeto a reglas PEXT).
//  - 1 y 5 actas PDF, ranking, producción y los demás módulos permanecen intactos.
//  - Se debe revisar qué función alimenta el módulo Bonos de Técnicos;
//    calcularBonoDiaUtilidad_ se usa en Utilidad/Económico y NO está
//    verificado que sea la única ruta del bono de técnicos.
