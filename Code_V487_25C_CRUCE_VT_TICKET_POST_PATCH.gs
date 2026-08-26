/* ==========================================================
   MI VISUAL V487.25C - CRUCE VALIDACION TECNICA POR TICKET WIN

   USO
   - Pegar DESPUES de V487.25 y V487.25B.
   - Solo reemplaza el enriquecimiento de BONO/NO BONO en la lectura
     de Gestion VTR/GAR.

   OBJETIVO
   - Cruzar incidencia VTR/GAR con VALIDACION_TECNICA por ticket exacto.
   - Prioridad: TICKET_FINAL (columna K).
   - Respaldo: TIPO_TICKET + NUMERO_TICKET (I + J).
   - Si hay mas de un registro con el mismo ticket, gana el mas reciente.

   NO CAMBIA
   - Responsabilidad VTR/GAR.
   - Produccion.
   - Efectividad.
   - Recableados.
   - Ranking.
   - Historicos.
   - No escribe ninguna hoja durante la lectura.
========================================================== */

var MV48725C_VERSION_ = "V487.25C-CRUCE-VT-TICKET-20260826";

function mv48725cTicket_(v) {
  return String(v == null ? "" : v)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function mv48725cFechaHora_(fecha, hora) {
  if (typeof mv48725FechaHora_ === "function") {
    return mv48725FechaHora_(fecha, hora);
  }
  var d = null;
  if (fecha instanceof Date && !isNaN(fecha.getTime())) {
    d = new Date(fecha.getTime());
  } else {
    var t = String(fecha == null ? "" : fecha).trim();
    var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  if (!d || isNaN(d.getTime())) return null;
  if (hora instanceof Date && !isNaN(hora.getTime())) {
    d.setHours(hora.getHours(), hora.getMinutes(), hora.getSeconds(), 0);
  } else {
    var h = String(hora == null ? "" : hora).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (h) d.setHours(Number(h[1]) || 0, Number(h[2]) || 0, Number(h[3]) || 0, 0);
  }
  return d;
}

function mv48725cIndiceValidacionTecnica_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName("VALIDACION_TECNICA");
  var indice = {};
  if (!hoja || hoja.getLastRow() <= 1) return indice;

  var n = hoja.getLastRow() - 1;
  var columnas = Math.min(Math.max(25, hoja.getLastColumn()), hoja.getMaxColumns());
  var datos = hoja.getRange(2, 1, n, columnas).getValues();

  datos.forEach(function(f) {
    var tipo = normalizarTexto(f[6]);
    if (tipo !== "VTR" && tipo !== "GAR") return;

    var ticket = String(f[10] || "").trim();
    if (!ticket) ticket = String(f[8] || "") + String(f[9] || "");
    var clave = mv48725cTicket_(ticket);
    if (!clave) return;

    var estado = normalizarTexto(f[13] || "");
    var resultado = normalizarTexto(f[14] || "");
    var estadoBono = "REGISTRADO";
    var etiquetaBono = "Registrado VT";

    if (resultado === "BONO") {
      estadoBono = "VALIDADA_BONO";
      etiquetaBono = "BONO";
    } else if (resultado === "NO BONO" || resultado === "NO_BONO") {
      estadoBono = "VALIDADA_NO_BONO";
      etiquetaBono = "NO BONO";
    } else if (estado === "PENDIENTE") {
      estadoBono = "PENDIENTE";
      etiquetaBono = "BONO PENDIENTE";
    } else if (estado === "OBSERVADO") {
      estadoBono = "OBSERVADO";
      etiquetaBono = "VT OBSERVADO";
    }

    var item = {
      id:String(f[0] || ""),
      tipo:tipo,
      ticket:ticket,
      codigoPedido:String(f[7] || ""),
      cuadrilla:normalizarCuadrilla(f[5]),
      fechaRegistro:f[1],
      horaRegistro:f[2],
      numeroDocumento:String(f[11] || "").replace(/\D/g, ""),
      estado:estado,
      resultado:resultado,
      estadoBono:estadoBono,
      etiquetaBono:etiquetaBono,
      validadoPor:String(f[15] || ""),
      perfilValidador:String(f[16] || ""),
      fechaValidacion:f[17],
      horaValidacion:f[18],
      motivoValidacion:String(f[19] || ""),
      momento:mv48725cFechaHora_(f[1], f[2])
    };

    var anterior = indice[clave];
    if (!anterior) {
      indice[clave] = item;
      return;
    }
    var nuevoMs = item.momento ? item.momento.getTime() : 0;
    var anteriorMs = anterior.momento ? anterior.momento.getTime() : 0;
    if (nuevoMs >= anteriorMs) indice[clave] = item;
  });

  return indice;
}

function mv48725cAplicarCruceVT_(lista) {
  var indice = mv48725cIndiceValidacionTecnica_();
  return (lista || []).map(function(item) {
    var salida = Object.assign({}, item);
    var ticket = String(salida.ticket || salida.codigoSeguimiento || "").trim();
    var v = indice[mv48725cTicket_(ticket)] || null;

    if (!v) {
      salida.estadoBono = "SIN_REGISTRO";
      salida.etiquetaBono = "SIN REGISTRO VT";
      salida.validacionBono = null;
      salida.coincidenciaBono = "SIN_REGISTRO";
      return salida;
    }

    salida.estadoBono = v.estadoBono;
    salida.etiquetaBono = v.etiquetaBono;
    salida.validacionBono = {
      id:v.id,
      tipo:v.tipo,
      ticket:v.ticket,
      codigoPedido:v.codigoPedido,
      cuadrilla:v.cuadrilla,
      numeroDocumento:v.numeroDocumento,
      estado:v.estado,
      resultado:v.resultado,
      validadoPor:v.validadoPor,
      perfilValidador:v.perfilValidador,
      fechaValidacion:v.fechaValidacion,
      horaValidacion:v.horaValidacion,
      motivoValidacion:v.motivoValidacion
    };
    salida.coincidenciaBono = "TICKET_EXACTO";
    return salida;
  });
}

// V487.25C: fuerza el cruce validado por ticket exacto.
mv48725AgregarBonoGestion_ = function(lista) {
  return mv48725cAplicarCruceVT_(lista || []);
};

function DIAGNOSTICO_V48725C_CRUCE_VT_SOLO_LECTURA() {
  var gestion = mv48725LeerGestionVtrGar_();
  var lista = mv48725cAplicarCruceVT_((gestion && gestion.lista) || []);
  var pendientes = lista.filter(function(x){ return normalizarTexto(x.estadoCalificacion) === "PENDIENTE"; });
  var resumen = {total:pendientes.length, registradosVT:0, sinRegistroVT:0, bono:0, noBono:0, pendientes:0, observados:0};
  pendientes.forEach(function(x){
    var e = normalizarTexto(x.estadoBono);
    if (e === "SIN_REGISTRO") resumen.sinRegistroVT++; else resumen.registradosVT++;
    if (e === "VALIDADA_BONO") resumen.bono++;
    else if (e === "VALIDADA_NO_BONO") resumen.noBono++;
    else if (e === "PENDIENTE") resumen.pendientes++;
    else if (e === "OBSERVADO") resumen.observados++;
  });
  var salida = {ok:true, version:MV48725C_VERSION_, modo:"SOLO_LECTURA", resumen:resumen, seguridad:{escribeHojas:false,recalculaIndicadores:false,modificaRecableados:false}};
  console.log(JSON.stringify(salida, null, 2));
  Logger.log(JSON.stringify(salida, null, 2));
  return salida;
}
