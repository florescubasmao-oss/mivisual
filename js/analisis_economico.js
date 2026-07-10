// MI VISUAL v68 - Módulo Análisis Económico
const API_ANALISIS_ECONOMICO = "https://script.google.com/macros/s/AKfycbzA-ehYX_BOJ0H0-BiHEcSVkAEHcyOIZBX3QXEtqvlqidJF8fdUSTmbTA-GkULf7uQA/exec";

function aePerfilPermitido(){
  const p=(localStorage.getItem("perfil")||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  return ["JEFATURA","ADMIN","ADMINISTRADOR"].includes(p);
}

function aeMoneda(v){
  return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",minimumFractionDigits:2}).format(Number(v)||0);
}

function aeNumero(v){
  return new Intl.NumberFormat("es-PE",{maximumFractionDigits:2}).format(Number(v)||0);
}

function aePorcentaje(v){
  return `${((Number(v)||0)*100).toFixed(1)}%`;
}

function aeClaseCumplimiento(v){
  const p=(Number(v)||0)*100;
  if(p>=100) return "ae-ok";
  if(p>=90) return "ae-alerta";
  return "ae-bajo";
}

function aePeriodoActual(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function aeOpcionesPeriodo(){
  const opciones=[];
  const base=new Date();
  for(let i=0;i<18;i++){
    const d=new Date(base.getFullYear(),base.getMonth()-i,1);
    const value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const label=d.toLocaleDateString("es-PE",{month:"long",year:"numeric"}).toUpperCase();
    opciones.push(`<option value="${value}">${label}</option>`);
  }
  return opciones.join("");
}

function mostrarAnalisisEconomico(){
  if(!aePerfilPermitido()){
    alert("Este módulo es exclusivo para Jefatura.");
    return;
  }
  if(typeof limpiarPantalla==="function") limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");
  if(menu) menu.style.display="none";
  if(typeof setBotonNavegacion==="function") setBotonNavegacion("modulo");
  const pantalla=document.getElementById("pantalla");
  pantalla.innerHTML=`
    <section class="ae-modulo">
      <div class="ae-encabezado">
        <div><div class="ae-etiqueta">JEFATURA · ZONA NORTE</div><h2>💰 Análisis Económico</h2><p>Valorización mensual de los trabajos ejecutados.</p></div>
      </div>
      <div class="ae-filtros">
        <label>Periodo mensual<select id="aePeriodo">${aeOpcionesPeriodo()}</select></label>
        <button id="aeConsultar" onclick="consultarAnalisisEconomico()">Consultar</button>
      </div>
      <div id="aeResultado"><div class="ae-cargando">Seleccione el periodo y pulse Consultar.</div></div>
    </section>`;
  document.getElementById("aePeriodo").value=aePeriodoActual();
  consultarAnalisisEconomico();
  window.scrollTo({top:0,behavior:"smooth"});
}

async function consultarAnalisisEconomico(){
  const periodo=document.getElementById("aePeriodo")?.value||aePeriodoActual();
  const resultado=document.getElementById("aeResultado");
  const boton=document.getElementById("aeConsultar");
  resultado.innerHTML='<div class="ae-cargando">Calculando valorización mensual...</div>';
  if(boton){boton.disabled=true;boton.textContent="Consultando...";}
  try{
    const r=await fetch(API_ANALISIS_ECONOMICO,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({accion:"obtenerAnalisisEconomico",usuario:localStorage.getItem("usuario"),periodo})});
    const data=await r.json();
    if(!data.ok) throw new Error(data.error||"No se pudo obtener el análisis económico");
    renderAnalisisEconomico(data);
  }catch(err){
    resultado.innerHTML=`<div class="ae-error"><b>No se pudo cargar el análisis económico.</b><br>${String(err.message||err)}</div>`;
  }finally{
    if(boton){boton.disabled=false;boton.textContent="Consultar";}
  }
}

function aeTarjeta(titulo,valor,subtexto,clase=""){
  return `<article class="ae-kpi ${clase}"><span>${titulo}</span><strong>${valor}</strong><small>${subtexto||""}</small></article>`;
}

function aeFilas(lista,tipo){
  if(!Array.isArray(lista)||!lista.length) return '<div class="ae-vacio">Sin información para este periodo.</div>';
  return lista.map((x,i)=>{
    const nombre=x.sede||x.cuadrilla||x.plataforma||x.tipoOrden||x.fecha||x.clave||"SIN DATO";
    const meta=x.meta>0?`<small>Meta ${aeMoneda(x.meta)} · ${aePorcentaje(x.cumplimiento)}</small>`:"";
    const detalle=tipo==="cuadrilla"?`<button class="ae-detalle-btn" onclick="aeToggleDetalle(this)">Ver detalle</button><div class="ae-detalle"><div>Órdenes: <b>${aeNumero(x.cantidad)}</b></div><div>Ticket promedio: <b>${aeMoneda(x.ticketPromedio)}</b></div><div>Plataforma: <b>${x.plataforma||"-"}</b></div><div>Sede: <b>${x.sede||"-"}</b></div></div>`:"";
    return `<div class="ae-fila ae-fila-${tipo} ${x.meta>0?aeClaseCumplimiento(x.cumplimiento):""}"><div class="ae-fila-pos">${i+1}</div><div class="ae-fila-info"><b class="ae-fila-titulo">${nombre}</b><span>${aeNumero(x.cantidad)} órdenes</span>${meta}</div><div class="ae-fila-monto">${aeMoneda(x.monto)}</div>${detalle}</div>`;
  }).join("");
}

function aeToggleDetalle(btn){
  const detalle=btn.nextElementSibling;
  const abierto=detalle.classList.toggle("visible");
  btn.textContent=abierto?"Ocultar detalle":"Ver detalle";
  btn.closest(".ae-fila")?.classList.toggle("detalle-abierto",abierto);
}

function renderAnalisisEconomico(data){
  const r=data.resumen||{};
  const pm=data.parametrosMeta||{};
  const faltante=Math.max(0,(Number(r.metaTotal)||0)-(Number(r.montoTotal)||0));
  const sinTarifa=(data.codigosSinTarifa||[]);
  document.getElementById("aeResultado").innerHTML=`
    <div class="ae-periodo"><b>${data.periodo}</b><span>Actualizado: ${data.fechaActualizacion}</span></div>
    <div class="ae-kpis">
      ${aeTarjeta("Monto generado",aeMoneda(r.montoTotal),`Meta ${aeMoneda(r.metaTotal)}`,aeClaseCumplimiento(r.cumplimiento))}
      ${aeTarjeta("Cumplimiento",aePorcentaje(r.cumplimiento),faltante>0?`Faltan ${aeMoneda(faltante)}`:"Meta alcanzada",aeClaseCumplimiento(r.cumplimiento))}
      ${aeTarjeta("Proyección de cierre",aeMoneda(r.proyeccionCierre),`${r.diasConProduccion||0} días con producción`,aeClaseCumplimiento((r.proyeccionCierre||0)/(r.metaTotal||1)))}
      ${aeTarjeta("Órdenes ejecutadas",aeNumero(r.ordenesEjecutadas),"Trabajos valorizados")}
      ${aeTarjeta("Ticket promedio",aeMoneda(r.ticketPromedio),"Monto promedio por orden")}
      ${aeTarjeta("Cuadrillas activas",aeNumero(pm.cuadrillasActivas),`${aeMoneda(pm.metaMensualCuadrilla)} por cuadrilla`)}
    </div>
    <div class="ae-regla-meta">Meta aplicada: <b>${aeMoneda(pm.metaDiariaCuadrilla)} diarios × ${pm.diasMetaMensual} días = ${aeMoneda(pm.metaMensualCuadrilla)} por cuadrilla.</b></div>
    ${sinTarifa.length?`<div class="ae-aviso"><b>Atención:</b> No se pudo valorizar ${sinTarifa.length} orden(es) porque el código no tiene tarifa activa.<div class="ae-aviso-codigos">${sinTarifa.map(c=>`<span>Código de orden: <b>${c}</b></span>`).join("")}</div></div>`:""}
    <div class="ae-seccion"><h3>🏢 Monto generado por sede</h3>${aeFilas(data.porSede,"sede")}</div>
    <div class="ae-seccion"><h3>👷 Monto generado por cuadrilla</h3>${aeFilas(data.porCuadrilla,"cuadrilla")}</div>
    <div class="ae-seccion"><h3>🧭 Monto generado por plataforma</h3>${aeFilas(data.porPlataforma,"plataforma")}</div>
    <div class="ae-seccion"><h3>📦 Monto generado por tipo de partida</h3>${aeFilas(data.porTipoPartida,"tipo")}</div>
    <div class="ae-seccion"><h3>📅 Monto generado por día</h3>${aeFilas(data.porDia,"dia")}</div>`;
}
