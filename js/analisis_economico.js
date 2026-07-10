// MI VISUAL v70 - Módulo Análisis Económico
const API_ANALISIS_ECONOMICO = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";

function aePerfilPermitido(){
  const p=(localStorage.getItem("perfil")||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  return ["JEFATURA","ADMIN","ADMINISTRADOR"].includes(p);
}
function aeMoneda(v){return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",minimumFractionDigits:2}).format(Number(v)||0)}
function aeNumero(v){return new Intl.NumberFormat("es-PE",{maximumFractionDigits:2}).format(Number(v)||0)}
function aePorcentaje(v){return `${((Number(v)||0)*100).toFixed(1)}%`}
function aeClaseCumplimiento(v){const p=(Number(v)||0)*100;if(p>=100)return"ae-ok";if(p>=90)return"ae-alerta";return"ae-bajo"}
function aePeriodoActual(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function aeOpcionesPeriodo(){const o=[],b=new Date();for(let i=0;i<18;i++){const d=new Date(b.getFullYear(),b.getMonth()-i,1),v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,l=d.toLocaleDateString("es-PE",{month:"long",year:"numeric"}).toUpperCase();o.push(`<option value="${v}">${l}</option>`)}return o.join("")}

function mostrarAnalisisEconomico(){
  if(!aePerfilPermitido()){alert("Este módulo es exclusivo para Jefatura.");return}
  if(typeof limpiarPantalla==="function")limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");if(menu)menu.style.display="none";
  if(typeof setBotonNavegacion==="function")setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");
  pantalla.innerHTML=`<section class="ae-modulo"><div class="ae-encabezado"><div><div class="ae-etiqueta">JEFATURA · ZONA NORTE</div><h2>💰 Análisis Económico</h2><p>Valorización mensual de los trabajos ejecutados.</p></div></div><div class="ae-filtros"><label>Periodo mensual<select id="aePeriodo">${aeOpcionesPeriodo()}</select></label><button id="aeConsultar" onclick="consultarAnalisisEconomico()">Consultar</button></div><div id="aeResultado"><div class="ae-cargando">Seleccione el periodo y pulse Consultar.</div></div></section>`;
  document.getElementById("aePeriodo").value=aePeriodoActual();consultarAnalisisEconomico();window.scrollTo({top:0,behavior:"smooth"});
}

async function consultarAnalisisEconomico(){
  const periodo=document.getElementById("aePeriodo")?.value||aePeriodoActual(),resultado=document.getElementById("aeResultado"),boton=document.getElementById("aeConsultar");
  resultado.innerHTML='<div class="ae-cargando">Calculando valorización mensual...</div>';if(boton){boton.disabled=true;boton.textContent="Consultando..."}
  try{const r=await fetch(API_ANALISIS_ECONOMICO,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({accion:"obtenerAnalisisEconomico",usuario:localStorage.getItem("usuario"),periodo})});const data=await r.json();if(!data.ok)throw new Error(data.error||"No se pudo obtener el análisis económico");renderAnalisisEconomico(data)}catch(err){resultado.innerHTML=`<div class="ae-error"><b>No se pudo cargar el análisis económico.</b><br>${String(err.message||err)}</div>`}finally{if(boton){boton.disabled=false;boton.textContent="Consultar"}}
}

function aeTarjeta(titulo,valor,subtexto,clase=""){return`<article class="ae-kpi ${clase}"><span>${titulo}</span><strong>${valor}</strong><small>${subtexto||""}</small></article>`}
function aeNombreFila(x,tipo){if(tipo==="sede")return x.sede||"SIN SEDE";if(tipo==="cuadrilla")return x.cuadrilla||"SIN CUADRILLA";if(tipo==="plataforma")return x.plataforma||"SIN PLATAFORMA";if(tipo==="tipo")return x.tipoOrden||"SIN PARTIDA";if(tipo==="dia")return x.fecha||x.fechaClave||"SIN FECHA";return x.clave||"SIN DATO"}
function aeDetalleFila(x,tipo){
  const partes=[`<div><span>Órdenes</span><b>${aeNumero(x.cantidad)}</b></div>`,`<div><span>Ticket promedio</span><b>${aeMoneda(x.ticketPromedio)}</b></div>`];
  if(x.meta>0){partes.push(`<div><span>Meta</span><b>${aeMoneda(x.meta)}</b></div>`,`<div><span>Cumplimiento</span><b>${aePorcentaje(x.cumplimiento)}</b></div>`)}
  if(tipo==="cuadrilla"){partes.push(`<div><span>Plataforma</span><b>${x.plataforma||"-"}</b></div>`,`<div><span>Sede</span><b>${x.sede||"-"}</b></div>`)}
  if(tipo==="tipo"&&x.plataforma)partes.push(`<div><span>Plataforma</span><b>${x.plataforma}</b></div>`);
  if(tipo==="dia")partes.push(`<div><span>Fecha</span><b>${x.fecha||"-"}</b></div>`);
  return partes.join("");
}
function aeFilas(lista,tipo){
  if(!Array.isArray(lista)||!lista.length)return'<div class="ae-vacio">Sin información para este periodo.</div>';
  return lista.map((x,i)=>{const nombre=aeNombreFila(x,tipo),meta=x.meta>0?`<small>Meta ${aeMoneda(x.meta)} · ${aePorcentaje(x.cumplimiento)}</small>`:"";return`<div class="ae-fila ae-fila-${tipo} ${x.meta>0?aeClaseCumplimiento(x.cumplimiento):""}"><div class="ae-fila-pos">${i+1}</div><div class="ae-fila-info"><b class="ae-fila-titulo">${nombre}</b><span>${aeNumero(x.cantidad)} órdenes</span>${meta}</div><div class="ae-fila-monto">${aeMoneda(x.monto)}</div><button class="ae-detalle-btn" onclick="aeToggleDetalle(this)">Ver detalle</button><div class="ae-detalle">${aeDetalleFila(x,tipo)}</div></div>`}).join("")
}
function aeToggleDetalle(btn){const detalle=btn.nextElementSibling,abierto=detalle.classList.toggle("visible");btn.textContent=abierto?"Ocultar detalle":"Ver detalle";btn.closest(".ae-fila")?.classList.toggle("detalle-abierto",abierto)}
function aeToggleSeccion(btn){const cuerpo=btn.closest(".ae-seccion")?.querySelector(".ae-seccion-cuerpo"),abierto=cuerpo?.classList.toggle("visible");btn.textContent=abierto?"Ocultar":"Mostrar";btn.closest(".ae-seccion")?.classList.toggle("seccion-abierta",!!abierto)}
function aeSeccion(titulo,contenido,abierta=true){return`<div class="ae-seccion ${abierta?"seccion-abierta":""}"><div class="ae-seccion-cabecera"><h3>${titulo}</h3><button onclick="aeToggleSeccion(this)">${abierta?"Ocultar":"Mostrar"}</button></div><div class="ae-seccion-cuerpo ${abierta?"visible":""}">${contenido}</div></div>`}
function aeAlertaSinTarifa(data){
  const detalles=Array.isArray(data.codigosSinTarifaDetalles)?data.codigosSinTarifaDetalles:[],codigos=Array.isArray(data.codigosSinTarifa)?data.codigosSinTarifa:[];
  if(!detalles.length&&!codigos.length)return"";
  const filas=detalles.length?detalles.map(d=>`<div class="ae-sin-tarifa-item"><b>Código: ${d.codigo||"-"}</b><span>Fecha: ${d.fecha||"-"}</span><span>Cuadrilla: ${d.cuadrilla||"-"}</span><span>Sede: ${d.sede||"-"}</span><span>Cantidad: ${aeNumero(d.cantidad)}</span></div>`).join(""):codigos.map(c=>`<div class="ae-sin-tarifa-item"><b>Código: ${c}</b></div>`).join("");
  const total=detalles.length||codigos.length;
  return`<div class="ae-alerta-compacta"><button type="button" class="ae-alerta-toggle" onclick="aeToggleAlerta(this)">⚠ Alerta <span>${total}</span></button><div class="ae-alerta-detalle"><p>No se pudo valorizar ${total} registro(s) porque el código no tiene tarifa activa.</p><div class="ae-aviso-codigos">${filas}</div></div></div>`
}
function aeToggleAlerta(btn){
  const detalle=btn.nextElementSibling;
  const abierto=detalle.classList.toggle("visible");
  btn.classList.toggle("abierta",abierto);
}
function renderAnalisisEconomico(data){
  const r=data.resumen||{},pm=data.parametrosMeta||{},faltante=Math.max(0,(Number(r.metaTotal)||0)-(Number(r.montoTotal)||0));
  document.getElementById("aeResultado").innerHTML=`<div class="ae-periodo"><b>${data.periodo}</b><span>Actualizado: ${data.fechaActualizacion}</span></div><div class="ae-kpis">${aeTarjeta("Monto generado",aeMoneda(r.montoTotal),`Meta ${aeMoneda(r.metaTotal)}`,aeClaseCumplimiento(r.cumplimiento))}${aeTarjeta("Cumplimiento",aePorcentaje(r.cumplimiento),faltante>0?`Faltan ${aeMoneda(faltante)}`:"Meta alcanzada",aeClaseCumplimiento(r.cumplimiento))}${aeTarjeta("Proyección de cierre",aeMoneda(r.proyeccionCierre),`${r.diasConProduccion||0} días con producción`,aeClaseCumplimiento((r.proyeccionCierre||0)/(r.metaTotal||1)))}${aeTarjeta("Órdenes ejecutadas",aeNumero(r.ordenesEjecutadas),"Trabajos valorizados")}${aeTarjeta("Ticket promedio",aeMoneda(r.ticketPromedio),"Monto promedio por orden")}${aeTarjeta("Cuadrillas activas",aeNumero(pm.cuadrillasActivas),`${aeMoneda(pm.metaMensualCuadrilla)} por cuadrilla`)}</div>${aeSeccion("🏢 Monto generado por sede",aeFilas((data.porSede||[]).filter(x=>String(x.sede||"").toUpperCase()!=="TODAS"),"sede"),true)}${aeSeccion("👷 Monto generado por cuadrilla",aeFilas((data.porCuadrilla||[]).filter(x=>/^P\d+\b/i.test(String(x.cuadrilla||""))),"cuadrilla"),true)}${aeSeccion("🧭 Monto generado por plataforma",aeFilas(data.porPlataforma,"plataforma"),false)}${aeSeccion("📦 Monto generado por tipo de partida",aeFilas(data.porTipoPartida,"tipo"),false)}${aeSeccion("📅 Monto generado por día",aeFilas(data.porDia,"dia"),false)}${aeAlertaSinTarifa(data)}`;
}
