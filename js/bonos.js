/* =====================================================
   MI VISUAL V250 - BONOS DE PRODUCCIÓN
   - Cálculo diario desde PRODUCCION_APP + CATALOGO_ORDENES
   - Semana de lunes a domingo
   - Fecha referencial: lunes de la semana subsiguiente
   - No registra ni valida pagos
===================================================== */

const MB242_URL_PRODUCCION = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1814992325&single=true&output=csv";
const MB242_URL_CATALOGO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=2013842388&single=true&output=csv";
const MB242_URL_RANKING = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpVkCmSvopgPByWsEX6nkuAT6mf3yD2_Cywpl9pFSZEqYpxmprDePPeV0KNgT14YpEP6gkVlvOAtZy/pub?gid=1269910675&single=true&output=csv";

const MB242_SEDES = ["CHICLAYO", "PIURA", "TRUJILLO"];
const MB242_MINIMO_BONO = 4.5;
const MB242_BASE_SIN_BONO = 4;
const MB242_VALOR_PUNTO_CUADRILLA = 30;
const MB242_VALOR_PUNTO_CUADRILLA_ESPECIAL = 45;

/*
  Cuadrillas PDG: no participan en el módulo Bonos.
  Su producción, puntaje y demás indicadores continúan funcionando sin cambios.
*/
const MB242_CUADRILLAS_PDG = [
  {codigo:"P8", terminos:["SGI"], nombres:["BASTIDAS","GONZALEZ","ALEX"]},
  {codigo:"P7", terminos:["SGI"], nombres:["PACHERRES","RUIZ","VICTOR"]}
];

/*
  Cuadrillas con tarifa especial:
  - S/ 45.00 por punto para la cuadrilla.
  - S/ 22.50 por cada medio punto para la cuadrilla.
  La identificación combina código, plataforma y apellidos para tolerar
  diferencias de orden o abreviación en el nombre registrado.
*/
const MB242_CUADRILLAS_TARIFA_ESPECIAL = [
  {codigo:"P5",  terminos:["SGI"],       nombres:["SANCHEZ","TUME","MAXIMO"]},
  {codigo:"P6",  terminos:["SGI"],       nombres:["ESPINOZA","ESTRADA","ROBERTO"]},
  {codigo:"P10", terminos:["TRASLADO"],  nombres:["VERGARA","TRELLES","ROBERTSON"]},
  {codigo:"P4",  terminos:["SGI"],       nombres:["INGOL","RODRIGUEZ","CESAR"]},
  {codigo:"P1",  terminos:["TRASLADO"],  nombres:["ATENCIO","RELUZ","DANY","DANI"]},
  {codigo:"P3",  terminos:["SGI"],       nombres:["ELERA","CUEVA","ROBERTO"]},
  {codigo:"P12", terminos:["SGI"],       nombres:["FERNANDEZ","MUNDACA","MOISES"]},
  {codigo:"P2",  terminos:["TRASLADO"],  nombres:["ESPIRE","CHIQUEZ","LUIS"]},
  {codigo:"P10", terminos:["SGI"],       nombres:["YNGA","MORE","JAIME"]},
  {codigo:"P16", terminos:["SGI"],       nombres:["AZABACHE","SANCHEZ","FRANK"]},
  {codigo:"P14", terminos:["SGI"],       nombres:["BARRANZUELA","ALEMAN","WILSON","RUBEN"]}
];

let MB242_DATOS = null;
let MB242_FILTROS = { periodo: "", sede: "TODAS", cuadrilla: "TODAS" };

function mb242Normalizar(texto){
  return (texto || "").toString().toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function mb242Cuadrilla(texto){
  return mb242Normalizar(texto).replace(/^P\s+(\d+)/, "P$1");
}

function mb242Escapar(texto){
  return (texto == null ? "" : String(texto))
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function mb242Numero(valor){
  if(typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const t = (valor || "").toString().trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function mb242LeerLineaCSV(linea){
  const salida = [];
  let actual = "";
  let comillas = false;
  for(let i=0; i<linea.length; i++){
    const ch = linea[i];
    if(ch === '"'){
      if(comillas && linea[i+1] === '"'){
        actual += '"'; i++;
      }else{
        comillas = !comillas;
      }
    }else if(ch === "," && !comillas){
      salida.push(actual.trim()); actual = "";
    }else{
      actual += ch;
    }
  }
  salida.push(actual.trim());
  return salida;
}

function mb242CSV(texto){
  return (texto || "").replace(/^\uFEFF/, "").split(/\r?\n/)
    .filter(linea => linea.trim() !== "")
    .map(mb242LeerLineaCSV);
}

function mb242ParseFecha(valor){
  if(valor instanceof Date && !isNaN(valor.getTime())){
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12, 0, 0, 0);
  }
  const texto = (valor || "").toString().trim();
  if(!texto) return null;
  let m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m){
    const d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m){
    const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function mb242SumarDias(fecha, dias){
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

function mb242InicioSemana(fecha){
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0, 0);
  const dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  return d;
}

function mb242ClaveFecha(fecha){
  return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}-${String(fecha.getDate()).padStart(2,"0")}`;
}

function mb242FormatoFecha(fecha){
  if(!(fecha instanceof Date) || isNaN(fecha.getTime())) return "-";
  return `${String(fecha.getDate()).padStart(2,"0")}/${String(fecha.getMonth()+1).padStart(2,"0")}/${fecha.getFullYear()}`;
}

function mb242Moneda(valor){
  return `S/ ${Number(valor || 0).toLocaleString("es-PE", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}

function mb242Redondear(valor){
  return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
}

function mb242EsCuadrillaPDG(cuadrilla){
  const nombre = mb242Cuadrilla(cuadrilla);
  if(!nombre) return false;
  const codigo = (nombre.match(/^P\d+/) || [""])[0];
  return MB242_CUADRILLAS_PDG.some(regla => {
    if(codigo !== regla.codigo) return false;
    if(!(regla.terminos || []).every(t => nombre.includes(t))) return false;
    return (regla.nombres || []).some(t => nombre.includes(t));
  });
}

function mb242EsTarifaEspecial(cuadrilla){
  const nombre = mb242Cuadrilla(cuadrilla);
  if(!nombre) return false;
  const codigo = (nombre.match(/^P\d+/) || [""])[0];
  return MB242_CUADRILLAS_TARIFA_ESPECIAL.some(regla => {
    if(codigo !== regla.codigo) return false;
    if(!(regla.terminos || []).every(t => nombre.includes(t))) return false;
    return (regla.nombres || []).some(t => nombre.includes(t));
  });
}

function mb242ValorPuntoCuadrilla(cuadrilla){
  return mb242EsTarifaEspecial(cuadrilla)
    ? MB242_VALOR_PUNTO_CUADRILLA_ESPECIAL
    : MB242_VALOR_PUNTO_CUADRILLA;
}

function mb250EtiquetaBonoEspecial(cuadrilla, claseExtra){
  if(!mb242EsTarifaEspecial(cuadrilla)) return "";
  return `<span class="mb250-bono-especial-etiqueta ${claseExtra || ""}" title="Tarifa especial de bono">⭐ BONO ESPECIAL</span>`;
}

function mb242CalcularBonoDiario(puntos, cuadrillaNombre){
  const p = Number(puntos || 0);
  const tarifa = mb242ValorPuntoCuadrilla(cuadrillaNombre);
  if(p + 0.000001 < MB242_MINIMO_BONO){
    return { puntos:p, genera:false, cuadrilla:0, tecnico:0, tarifa };
  }
  const cuadrilla = mb242Redondear((p - MB242_BASE_SIN_BONO) * tarifa);
  return {
    puntos:p,
    genera:true,
    cuadrilla,
    tecnico:mb242Redondear(cuadrilla / 2),
    tarifa
  };
}

function mb242EstadoPeriodo(periodo, hoy){
  const h = hoy || new Date();
  const dia = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12, 0, 0, 0);
  if(dia < periodo.inicio) return "SEMANA PROGRAMADA";
  if(dia <= periodo.fin) return "SEMANA EN CURSO";
  return "SEMANA CERRADA";
}

function mb242CrearPeriodo(inicio){
  const fin = mb242SumarDias(inicio, 6);
  return {
    clave: mb242ClaveFecha(inicio),
    inicio,
    fin,
    fechaReferencial: mb242SumarDias(inicio, 14),
    cuadrillas: {}
  };
}

function mb242AsegurarCuadrilla(periodo, cuadrilla, meta){
  if(!periodo.cuadrillas[cuadrilla]){
    periodo.cuadrillas[cuadrilla] = {
      cuadrilla,
      sede: meta?.sede || "SIN SEDE",
      plataforma: meta?.plataforma || "",
      dias: {},
      puntos:0,
      bonoCuadrilla:0,
      bonoTecnico:0,
      diasConBono:0,
      trabajos:0
    };
  }
  return periodo.cuadrillas[cuadrilla];
}

function mb242CerrarResumenCuadrilla(item){
  item.puntos = 0;
  item.bonoCuadrilla = 0;
  item.bonoTecnico = 0;
  item.diasConBono = 0;
  item.trabajos = 0;
  Object.values(item.dias).forEach(dia => {
    const bono = mb242CalcularBonoDiario(dia.puntos, item.cuadrilla);
    dia.bonoCuadrilla = bono.cuadrilla;
    dia.bonoTecnico = bono.tecnico;
    dia.genera = bono.genera;
    item.puntos += dia.puntos;
    item.trabajos += dia.trabajos;
    item.bonoCuadrilla += bono.cuadrilla;
    item.bonoTecnico += bono.tecnico;
    if(bono.genera) item.diasConBono++;
  });
  item.puntos = mb242Redondear(item.puntos);
  item.bonoCuadrilla = mb242Redondear(item.bonoCuadrilla);
  item.bonoTecnico = mb242Redondear(item.bonoTecnico);
  return item;
}

async function mb242FetchCSV(url){
  const respuesta = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), {cache:"no-store"});
  if(!respuesta.ok) throw new Error(`No se pudo leer la fuente de datos (${respuesta.status})`);
  return mb242CSV(await respuesta.text());
}

async function mb242CargarDatos(forzar){
  if(MB242_DATOS && !forzar) return MB242_DATOS;
  const [produccion, catalogoFilas, rankingFilas] = await Promise.all([
    mb242FetchCSV(MB242_URL_PRODUCCION),
    mb242FetchCSV(MB242_URL_CATALOGO),
    mb242FetchCSV(MB242_URL_RANKING)
  ]);

  const catalogo = {};
  catalogoFilas.slice(1).forEach(fila => {
    const codigo = (fila[0] || "").toString().trim();
    if(!codigo) return;
    catalogo[codigo] = {
      tipo: fila[1] || codigo,
      plataforma: fila[2] || "",
      puntaje: mb242Numero(fila[3]),
      grupo: fila[4] || ""
    };
  });

  const metaCuadrillas = {};
  rankingFilas.slice(1).forEach(fila => {
    const cuadrilla = mb242Cuadrilla(fila[1]);
    if(!cuadrilla) return;
    metaCuadrillas[cuadrilla] = {
      sede: mb242Normalizar(fila[4]) || "SIN SEDE",
      plataforma: mb242Normalizar(fila[5])
    };
  });

  const periodos = {};
  const codigosSinPuntaje = {};

  produccion.slice(1).forEach(fila => {
    const cuadrilla = mb242Cuadrilla(fila[1]);
    const fecha = mb242ParseFecha(fila[2]);
    const codigo = (fila[3] || "").toString().trim();
    const cantidad = mb242Numero(fila[4]);
    if(!cuadrilla || !fecha || !codigo || cantidad <= 0) return;
    // V246: las cuadrillas PDG conservan Producción y puntaje, pero no forman parte de Bonos.
    if(mb242EsCuadrillaPDG(cuadrilla)) return;

    const partida = catalogo[codigo];
    const puntajeUnitario = partida ? mb242Numero(partida.puntaje) : 0;
    if(!partida || puntajeUnitario <= 0) codigosSinPuntaje[codigo] = true;
    const puntos = cantidad * puntajeUnitario;

    const inicio = mb242InicioSemana(fecha);
    const clavePeriodo = mb242ClaveFecha(inicio);
    if(!periodos[clavePeriodo]) periodos[clavePeriodo] = mb242CrearPeriodo(inicio);
    const meta = metaCuadrillas[cuadrilla] || {sede:"SIN SEDE", plataforma:""};
    const item = mb242AsegurarCuadrilla(periodos[clavePeriodo], cuadrilla, meta);
    const claveDia = mb242ClaveFecha(fecha);
    if(!item.dias[claveDia]){
      item.dias[claveDia] = {fecha, puntos:0, trabajos:0, partidas:{}, bonoCuadrilla:0, bonoTecnico:0, genera:false};
    }
    const dia = item.dias[claveDia];
    dia.puntos += puntos;
    dia.trabajos += cantidad;
    const nombrePartida = partida?.tipo || codigo;
    if(!dia.partidas[nombrePartida]) dia.partidas[nombrePartida] = {cantidad:0, puntos:0};
    dia.partidas[nombrePartida].cantidad += cantidad;
    dia.partidas[nombrePartida].puntos += puntos;
  });

  const hoy = new Date();
  const actual = mb242InicioSemana(hoy);
  const claveActual = mb242ClaveFecha(actual);
  if(!periodos[claveActual]) periodos[claveActual] = mb242CrearPeriodo(actual);

  Object.values(periodos).forEach(periodo => {
    Object.values(periodo.cuadrillas).forEach(mb242CerrarResumenCuadrilla);
    periodo.estado = mb242EstadoPeriodo(periodo, hoy);
  });

  const listaPeriodos = Object.values(periodos).sort((a,b) => b.inicio - a.inicio);
  MB242_DATOS = {periodos, listaPeriodos, metaCuadrillas, codigosSinPuntaje:Object.keys(codigosSinPuntaje)};
  return MB242_DATOS;
}

function mb242PeriodoEtiqueta(periodo){
  return `${mb242FormatoFecha(periodo.inicio)} al ${mb242FormatoFecha(periodo.fin)} · ${periodo.estado}`;
}

function mb242BuscarPeriodoProximo(datos){
  const hoy = new Date();
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0, 0);
  const cerrados = datos.listaPeriodos.filter(p => p.fin < h && Object.keys(p.cuadrillas).length);
  const futurosPago = cerrados.filter(p => p.fechaReferencial >= h).sort((a,b) => a.fechaReferencial - b.fechaReferencial);
  if(futurosPago.length) return futurosPago[0];
  return cerrados.sort((a,b) => b.inicio - a.inicio)[0] || null;
}

function mb242BuscarPeriodoActual(datos){
  const clave = mb242ClaveFecha(mb242InicioSemana(new Date()));
  return datos.periodos[clave] || datos.listaPeriodos[0] || null;
}

function mb242ObtenerCuadrilla(periodo, cuadrilla, meta){
  const clave = mb242Cuadrilla(cuadrilla);
  if(periodo?.cuadrillas?.[clave]) return periodo.cuadrillas[clave];
  return {
    cuadrilla:clave || "SIN CUADRILLA",
    sede:meta?.sede || "SIN SEDE",
    plataforma:meta?.plataforma || "",
    dias:{}, puntos:0, bonoCuadrilla:0, bonoTecnico:0, diasConBono:0, trabajos:0
  };
}

function mb242ResumenPeriodoTecnico(titulo, periodo, item, clase){
  if(!periodo) return `<section class="mb242-bloque"><h3>${titulo}</h3><div class="mb242-vacio">No existe información para este periodo.</div></section>`;
  return `<section class="mb242-bloque ${clase || ""}">
    <div class="mb242-bloque-head">
      <div><h3>${titulo}</h3><p>${mb242FormatoFecha(periodo.inicio)} al ${mb242FormatoFecha(periodo.fin)}</p></div>
      <span class="mb242-estado ${periodo.estado === "SEMANA EN CURSO" ? "curso" : "cerrada"}">${periodo.estado}</span>
    </div>
    <div class="mb242-kpis mb242-kpis-tecnico">
      ${mb242Kpi("⭐", "Puntos semanales", Number(item.puntos||0).toFixed(1), "La medición del bono es diaria")}
      ${mb242Kpi("🎁", "Bono cuadrilla", mb242Moneda(item.bonoCuadrilla), `${item.diasConBono||0} días con bono`)}
      ${mb242Kpi("👤", "Monto por técnico", mb242Moneda(item.bonoTecnico), "La mitad del bono de la cuadrilla")}
      ${mb242Kpi("📅", "Fecha referencial", mb242FormatoFecha(periodo.fechaReferencial), "MI VISUAL no valida el pago")}
    </div>
    ${mb242DetalleDiario(item)}
  </section>`;
}

function mb242Kpi(icono, titulo, valor, detalle){
  return `<div class="mb242-kpi"><div class="mb242-kpi-titulo"><span>${icono}</span>${titulo}</div><div class="mb242-kpi-valor">${valor}</div><div class="mb242-kpi-detalle">${detalle || ""}</div></div>`;
}

function mb242DetalleDiario(item){
  const dias = Object.values(item?.dias || {}).sort((a,b) => a.fecha - b.fecha);
  if(!dias.length) return `<div class="mb242-vacio">No hay producción registrada para esta cuadrilla durante la semana.</div>`;
  return `<div class="mb242-dias">${dias.map(dia => {
    const partidas = Object.entries(dia.partidas || {}).sort((a,b)=>b[1].puntos-a[1].puntos)
      .map(([nombre,v])=>`<li>${mb242Escapar(nombre)}: ${Number(v.cantidad||0).toFixed(0)} · ${Number(v.puntos||0).toFixed(1)} pts</li>`).join("");
    return `<details class="mb242-dia" ${dias.length <= 3 ? "open" : ""}>
      <summary><span>📅 ${mb242FormatoFecha(dia.fecha)}</span><b>${Number(dia.puntos||0).toFixed(1)} pts</b><em class="${dia.genera ? "genera" : "no-genera"}">${dia.genera ? mb242Moneda(dia.bonoTecnico)+" c/u" : "Sin bono"}</em></summary>
      <div class="mb242-dia-contenido">
        <div><b>Bono cuadrilla:</b> ${mb242Moneda(dia.bonoCuadrilla)}</div>
        <div><b>Por técnico:</b> ${mb242Moneda(dia.bonoTecnico)}</div>
        <div><b>Trabajos:</b> ${Number(dia.trabajos||0).toFixed(0)}</div>
        ${partidas ? `<ul>${partidas}</ul>` : ""}
      </div>
    </details>`;
  }).join("")}</div>`;
}

function mb242OpcionesPeriodo(datos, seleccionado, incluirPlaceholder){
  const placeholder = incluirPlaceholder
    ? `<option value="" ${seleccionado ? "" : "selected"}>SELECCIONAR PERIODO</option>`
    : "";
  return placeholder + datos.listaPeriodos.map(p => `<option value="${p.clave}" ${p.clave===seleccionado?"selected":""}>${mb242PeriodoEtiqueta(p)}</option>`).join("");
}

function mb242RenderTecnico(datos){
  const cuadrilla = mb242Cuadrilla(localStorage.getItem("cuadrilla"));
  const meta = datos.metaCuadrillas[cuadrilla] || {};
  const actual = mb242BuscarPeriodoActual(datos);
  const proximo = mb242BuscarPeriodoProximo(datos);
  const itemActual = mb242ObtenerCuadrilla(actual, cuadrilla, meta);
  const itemProximo = mb242ObtenerCuadrilla(proximo, cuadrilla, meta);
  const periodoConsulta = MB242_FILTROS.periodo ? datos.periodos[MB242_FILTROS.periodo] : null;
  const itemConsulta = periodoConsulta ? mb242ObtenerCuadrilla(periodoConsulta, cuadrilla, meta) : null;
  const etiquetaEspecial = mb250EtiquetaBonoEspecial(cuadrilla, "mb250-bono-especial-tecnico");

  const html = `<div class="mb242-pagina">
    <div class="mb242-cabecera"><div><h2 class="mb250-bonos-titulo">🎁 Bonos ${etiquetaEspecial}</h2><p>${mb242Escapar(cuadrilla)}</p></div><button class="button_1" onclick="volverInicio()">⬅ Volver</button></div>
    ${mb242ResumenPeriodoTecnico("Avance de la semana actual", actual, itemActual, "mb242-actual")}
    ${mb242ResumenPeriodoTecnico("Bono referencial próximo", proximo, itemProximo, "mb242-proximo")}
    <section class="mb242-bloque">
      <div class="mb242-bloque-head"><div><h3>Historial de bonos</h3><p>Consulta cualquier semana registrada.</p></div></div>
      <label class="mb242-filtro-unico">Periodo semanal<select onchange="mb242CambiarPeriodoTecnico(this.value)">${mb242OpcionesPeriodo(datos, periodoConsulta?.clave || "", true)}</select></label>
      <div id="mb242HistorialTecnico">${periodoConsulta ? mb242ResumenConsultaTecnico(periodoConsulta, itemConsulta) : ""}</div>
    </section>
    <div class="mb242-nota">La fecha indicada es referencial. MI VISUAL calcula el bono desde Producción, pero no registra ni valida pagos.</div>
  </div>`;
  mostrarPantalla(html);
}

function mb242ResumenConsultaTecnico(periodo, item){
  if(!periodo) return `<div class="mb242-vacio">No existen periodos disponibles.</div>`;
  return `<div class="mb242-consulta-resumen">
    <div><b>${mb242FormatoFecha(periodo.inicio)} al ${mb242FormatoFecha(periodo.fin)}</b><span>${periodo.estado}</span></div>
    <div class="mb242-consulta-montos"><b>${mb242Moneda(item.bonoTecnico)} por técnico</b><span>${mb242Moneda(item.bonoCuadrilla)} por cuadrilla</span></div>
  </div>${mb242DetalleDiario(item)}`;
}

function mb242CambiarPeriodoTecnico(clave){
  MB242_FILTROS.periodo = clave || "";
  const cont = document.getElementById("mb242HistorialTecnico");
  if(!cont) return;
  if(!clave){
    cont.innerHTML = "";
    return;
  }
  const periodo = MB242_DATOS?.periodos?.[clave];
  const cuadrilla = mb242Cuadrilla(localStorage.getItem("cuadrilla"));
  const item = mb242ObtenerCuadrilla(periodo, cuadrilla, MB242_DATOS?.metaCuadrillas?.[cuadrilla]);
  cont.innerHTML = mb242ResumenConsultaTecnico(periodo, item);
}

function mb242PerfilEsJefatura(perfil){
  return ["JEFATURA","JEFATURA GENERAL","GERENCIA LIMA","ADMIN","ADMINISTRADOR"].includes(perfil);
}

function mb242ListaAlcance(datos, perfil){
  const periodo = datos.periodos[MB242_FILTROS.periodo];
  if(!periodo) return [];
  let lista = Object.values(periodo.cuadrillas || {});
  if(perfil === "SUPERVISOR"){
    const sede = mb242Normalizar(localStorage.getItem("sede"));
    lista = lista.filter(x => mb242Normalizar(x.sede) === sede);
  }else if(mb242PerfilEsJefatura(perfil)){
    lista = lista.filter(x => MB242_SEDES.includes(mb242Normalizar(x.sede)));
    if(MB242_FILTROS.sede !== "TODAS") lista = lista.filter(x => mb242Normalizar(x.sede) === MB242_FILTROS.sede);
  }
  if(MB242_FILTROS.cuadrilla !== "TODAS") lista = lista.filter(x => x.cuadrilla === MB242_FILTROS.cuadrilla);
  return lista;
}

function mb242OpcionesSede(perfil){
  if(perfil === "SUPERVISOR"){
    const sede = mb242Normalizar(localStorage.getItem("sede")) || "SIN SEDE";
    return `<option value="${mb242Escapar(sede)}">${mb242Escapar(sede)}</option>`;
  }
  return `<option value="TODAS">TODAS LAS SEDES</option>` + MB242_SEDES.map(s => `<option value="${s}" ${MB242_FILTROS.sede===s?"selected":""}>${s}</option>`).join("");
}

function mb242CuadrillasDisponibles(datos, perfil){
  const periodo = datos.periodos[MB242_FILTROS.periodo];
  if(!periodo) return [];
  let lista = Object.values(periodo.cuadrillas || {});
  if(perfil === "SUPERVISOR"){
    const sede = mb242Normalizar(localStorage.getItem("sede"));
    lista = lista.filter(x => mb242Normalizar(x.sede) === sede);
  }else if(MB242_FILTROS.sede !== "TODAS"){
    lista = lista.filter(x => mb242Normalizar(x.sede) === MB242_FILTROS.sede);
  }
  return [...new Set(lista.map(x=>x.cuadrilla))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}

function mb242OpcionesCuadrilla(datos, perfil){
  const cuadrillas = mb242CuadrillasDisponibles(datos, perfil);
  return `<option value="TODAS">TODAS LAS CUADRILLAS</option>` + cuadrillas.map(c => `<option value="${mb242Escapar(c)}" ${MB242_FILTROS.cuadrilla===c?"selected":""}>${mb242Escapar(c)}</option>`).join("");
}

function mb242ResumenGestion(lista, periodo){
  const conBono = lista.filter(x => Number(x.bonoCuadrilla||0) > 0).length;
  const puntos = lista.reduce((s,x)=>s+Number(x.puntos||0),0);
  const total = lista.reduce((s,x)=>s+Number(x.bonoCuadrilla||0),0);
  const dias = lista.reduce((s,x)=>s+Number(x.diasConBono||0),0);
  return `<div class="mb242-kpis">
    ${mb242Kpi("👷", "Cuadrillas con bono", `${conBono} / ${lista.length}`, "Según los filtros aplicados")}
    ${mb242Kpi("⭐", "Puntos acumulados", puntos.toFixed(1), "Suma semanal de las cuadrillas")}
    ${mb242Kpi("🎁", "Bono total cuadrillas", mb242Moneda(total), `${dias} jornadas con bono`)}
    ${mb242Kpi("📅", "Fecha referencial", mb242FormatoFecha(periodo?.fechaReferencial), "MI VISUAL no valida el pago")}
  </div>`;
}

function mb242FilaCuadrilla(item){
  const esEspecial = mb242EsTarifaEspecial(item.cuadrilla);
  const etiquetaEspecial = mb250EtiquetaBonoEspecial(item.cuadrilla, "mb250-bono-especial-gestion");
  return `<details class="mb242-cuadrilla-detalle ${esEspecial ? "mb250-bono-especial-marco" : ""}">
    <summary>
      <div><b class="mb250-cuadrilla-nombre">${mb242Escapar(item.cuadrilla)} ${etiquetaEspecial}</b><span>${mb242Escapar(item.plataforma || "")}</span></div>
      <div><b>${Number(item.puntos||0).toFixed(1)} pts</b><span>${item.diasConBono||0} días con bono</span></div>
      <div><b>${mb242Moneda(item.bonoCuadrilla)}</b><span>${mb242Moneda(item.bonoTecnico)} por técnico</span></div>
    </summary>
    <div class="mb242-cuadrilla-contenido">${mb242DetalleDiario(item)}</div>
  </details>`;
}

function mb242AgrupadoSedes(lista, perfil){
  if(!lista.length) return `<div class="mb242-vacio">No existe producción para los filtros seleccionados.</div>`;
  const grupos = {};
  lista.forEach(x => {
    const sede = perfil === "SUPERVISOR" ? mb242Normalizar(localStorage.getItem("sede")) : mb242Normalizar(x.sede || "SIN SEDE");
    if(!grupos[sede]) grupos[sede] = [];
    grupos[sede].push(x);
  });
  const orden = perfil === "SUPERVISOR" ? Object.keys(grupos) : MB242_SEDES.filter(s=>grupos[s]);
  return orden.map(sede => {
    const items = grupos[sede].sort((a,b)=>b.bonoCuadrilla-a.bonoCuadrilla || a.cuadrilla.localeCompare(b.cuadrilla,undefined,{numeric:true}));
    const total = items.reduce((s,x)=>s+Number(x.bonoCuadrilla||0),0);
    return `<section class="mb242-sede"><div class="mb242-sede-head"><div><h3>🏢 ${mb242Escapar(sede)}</h3><p>${items.length} cuadrillas</p></div><b>${mb242Moneda(total)}</b></div>${items.map(mb242FilaCuadrilla).join("")}</section>`;
  }).join("");
}

function mb242RenderGestion(){
  const perfil = mb242Normalizar(localStorage.getItem("perfil"));
  const datos = MB242_DATOS;
  const periodo = datos?.periodos?.[MB242_FILTROS.periodo];
  const lista = mb242ListaAlcance(datos, perfil);
  const titulo = perfil === "SUPERVISOR" ? "Bonos · Supervisor" : (perfil === "GERENCIA LIMA" ? "Bonos · Gerencia Lima" : "Bonos · Jefatura");

  const html = `<div class="mb242-pagina">
    <div class="mb242-cabecera"><div><h2>🎁 ${titulo}</h2><p>Cálculo diario y consulta semanal desde Producción.</p></div><button class="button_1" onclick="volverInicio()">⬅ Volver</button></div>
    <div class="mb242-filtros ${perfil === "SUPERVISOR" ? "supervisor" : ""}">
      <label>📅 Periodo semanal<select onchange="mb242CambiarFiltroGestion('periodo',this.value)">${mb242OpcionesPeriodo(datos, MB242_FILTROS.periodo)}</select></label>
      <label>🏢 Sede<select ${perfil === "SUPERVISOR" ? "disabled" : ""} onchange="mb242CambiarFiltroGestion('sede',this.value)">${mb242OpcionesSede(perfil)}</select></label>
      <label>🔎 Cuadrilla<select onchange="mb242CambiarFiltroGestion('cuadrilla',this.value)">${mb242OpcionesCuadrilla(datos, perfil)}</select></label>
    </div>
    <div class="mb242-periodo-info"><b>${periodo ? `${mb242FormatoFecha(periodo.inicio)} al ${mb242FormatoFecha(periodo.fin)}` : "Sin periodo"}</b><span>${periodo?.estado || ""}</span><em>Fecha referencial: ${mb242FormatoFecha(periodo?.fechaReferencial)}</em></div>
    <div id="mb242GestionContenido">${mb242ResumenGestion(lista, periodo)}${mb242AgrupadoSedes(lista, perfil)}</div>
    <div class="mb242-nota">La fecha indicada es referencial. MI VISUAL calcula el bono desde Producción, pero no registra ni valida pagos.</div>
  </div>`;
  mostrarPantalla(html);
}

function mb242CambiarFiltroGestion(campo, valor){
  if(!["periodo","sede","cuadrilla"].includes(campo)) return;
  MB242_FILTROS[campo] = valor;
  if(campo === "periodo" || campo === "sede") MB242_FILTROS.cuadrilla = "TODAS";
  mb242RenderGestion();
}

async function mostrarBonos(){
  try{
    const menu = document.getElementById("menuPrincipal");
    if(menu) menu.style.display = "none";
    mostrarPantalla(`<div class="mb242-pagina"><div class="mb242-cargando">⏳ Calculando bonos desde Producción...</div></div>`);
    const datos = await mb242CargarDatos(true);
    const perfil = mb242Normalizar(localStorage.getItem("perfil"));
    const actual = mb242BuscarPeriodoActual(datos) || datos.listaPeriodos[0];
    MB242_FILTROS = {periodo:actual?.clave || "", sede:"TODAS", cuadrilla:"TODAS"};

    if(perfil === "TECNICO"){
      const cuadrillaTecnico = mb242Cuadrilla(localStorage.getItem("cuadrilla"));
      if(mb242EsCuadrillaPDG(cuadrillaTecnico)){
        mostrarPantalla(`<div class="mb242-pagina"><div class="mb242-vacio">La opción Bonos no está disponible para esta cuadrilla.</div><button class="button_1" onclick="volverInicio()">Volver</button></div>`);
        return;
      }
      // El historial inicia cerrado: solo se muestra el desplegable.
      // El detalle se carga después de seleccionar un periodo.
      MB242_FILTROS.periodo = "";
      mb242RenderTecnico(datos);
      return;
    }
    if(perfil === "SUPERVISOR" || mb242PerfilEsJefatura(perfil)){
      mb242RenderGestion();
      return;
    }
    mostrarPantalla(`<div class="mb242-pagina"><div class="mb242-vacio">Tu perfil no tiene acceso a la opción Bonos.</div><button class="button_1" onclick="volverInicio()">Volver</button></div>`);
  }catch(error){
    console.error("BONOS V246", error);
    mostrarPantalla(`<div class="mb242-pagina"><div class="mb242-error"><b>No se pudo calcular Bonos.</b><span>${mb242Escapar(error.message || error)}</span></div><button class="button_1" onclick="volverInicio()">Volver</button></div>`);
  }
}

window.mostrarBonos = mostrarBonos;
window.mb242CambiarPeriodoTecnico = mb242CambiarPeriodoTecnico;
window.mb242CambiarFiltroGestion = mb242CambiarFiltroGestion;
window.mb242CalcularBonoDiario = mb242CalcularBonoDiario;
window.mb242EsTarifaEspecial = mb242EsTarifaEspecial;
window.mb250EtiquetaBonoEspecial = mb250EtiquetaBonoEspecial;
window.mb242EsCuadrillaPDG = mb242EsCuadrillaPDG;
