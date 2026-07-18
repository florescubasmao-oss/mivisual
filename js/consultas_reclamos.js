
const API_CONSULTAS_RECLAMOS = "https://script.google.com/macros/s/AKfycbzcbjCLweJNgZXDerdzmMN7Lwotc1G8NWdzoPkaLNGDivAgpYxDkq78xZwPRioSB4XY/exec";
async function crApi(payload){const r=await fetch(API_CONSULTAS_RECLAMOS,{method:"POST",body:JSON.stringify(payload)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Error en Consultas y Reclamos");return d;}
function crEsc(v){return String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]));}
function crPerfil(){return (localStorage.getItem("perfil")||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function crCategorias(){return {
 "BONO, PRODUCCION Y PUNTAJE":["PUNTOS NO CONTABILIZADOS","BONO INCORRECTO","TRABAJO MAL REGISTRADO"],
 "DEMORA O FALTA DE RESPUESTA DE BACK":["BACK NO RESPONDE","DEMORA EXCESIVA","NO RESPONDE EN EL GRUPO"],
 "SUPERVISOR":["SUPERVISOR NO RESPONDE","DEMORA EN VALIDACION","FALTA DE APOYO OPERATIVO"],
 "CLIENTE REVISITADO":["VISITADO POR OTRA CONTRATA","CLIENTE MOLESTO","TRABAJO ANTERIOR INCOMPLETO"],
 "ALMACEN":["FALTA DE EQUIPOS","FALTA DE MATERIALES","SERIES O ENTREGAS","ACTAS O DOCUMENTACION","DEMORA DE ATENCION"],
 "OTRO CASO OPERATIVO":["OTRO"]};}

function crEsCasoProduccion(){
  return (document.getElementById("crCategoria")?.value||"")==="BONO, PRODUCCION Y PUNTAJE";
}
function crBloqueDiaHtml(indice){
  return `<div class="cr-dia" data-dia="${indice}">
    <div class="cr-dia-head"><b>Día ${indice+1}</b><span>Máximo 6 códigos</span></div>
    <label>Fecha<input type="date" class="cr-fecha-dia"></label>
    <div class="cr-codigos" data-cantidad="1">${crCodigoHtml(indice,0)}</div>
    <button type="button" class="cr-add-code" onclick="crAgregarCodigo(${indice})">＋ Agregar otro código</button>
    <label>Puntos a considerar ese día<input type="number" class="cr-puntos-dia" min="0" step="0.01" placeholder="Ejemplo: 8.5"></label>
  </div>`;
}
function crCodigoHtml(dia,indice){
  return `<div class="cr-codigo-row" data-codigo="${indice}">
    <label>Código ${indice+1}<input type="text" class="cr-codigo-dia" inputmode="numeric" placeholder="Ingrese código"></label>
    <label>Acta opcional<input type="file" class="cr-acta-dia" accept="application/pdf,image/*"></label>
  </div>`;
}
function crRenderDias(){
  const cantidad=Math.max(1,Math.min(31,Number(document.getElementById("crCantidadDias")?.value||1)));
  const box=document.getElementById("crDiasContainer");
  if(!box)return;
  box.innerHTML=Array.from({length:cantidad},(_,i)=>crBloqueDiaHtml(i)).join("");
}
function crAgregarCodigo(dia){
  const bloque=document.querySelector(`.cr-dia[data-dia="${dia}"] .cr-codigos`);
  if(!bloque)return;
  const cantidad=bloque.querySelectorAll('.cr-codigo-row').length;
  if(cantidad>=6){alert("Solo se permiten hasta 6 códigos por fecha");return;}
  bloque.insertAdjacentHTML('beforeend',crCodigoHtml(dia,cantidad));
}
function crActualizarFormularioEspecial(){
  const especial=crEsCasoProduccion();
  const general=document.getElementById("crCamposGenerales");
  const dias=document.getElementById("crCamposDias");
  if(general)general.style.display=especial?"none":"grid";
  if(dias)dias.style.display=especial?"block":"none";
  if(especial&&!document.querySelector('#crDiasContainer .cr-dia'))crRenderDias();
}
function crArchivoBase64(file){
  return new Promise((resolve,reject)=>{
    if(!file){resolve(null);return;}
    const lector=new FileReader();
    lector.onload=()=>resolve({nombre:file.name,mime:file.type||"application/octet-stream",base64:String(lector.result||"").split(',')[1]||""});
    lector.onerror=()=>reject(new Error("No se pudo leer el archivo "+file.name));
    lector.readAsDataURL(file);
  });
}
async function crObtenerDetalleDias(){
  const dias=[];
  const bloques=[...document.querySelectorAll('#crDiasContainer .cr-dia')];
  for(let i=0;i<bloques.length;i++){
    const bloque=bloques[i],fecha=bloque.querySelector('.cr-fecha-dia')?.value||"",puntos=Number(bloque.querySelector('.cr-puntos-dia')?.value||0);
    if(!fecha)throw new Error(`Ingrese la fecha del día ${i+1}`);
    const filas=[...bloque.querySelectorAll('.cr-codigo-row')],codigos=[];
    for(let j=0;j<filas.length;j++){
      const codigo=(filas[j].querySelector('.cr-codigo-dia')?.value||"").trim();
      const archivo=filas[j].querySelector('.cr-acta-dia')?.files?.[0]||null;
      if(!codigo&&!archivo)continue;
      if(!codigo)throw new Error(`Ingrese el código ${j+1} del día ${i+1}`);
      codigos.push({codigo,acta:await crArchivoBase64(archivo)});
    }
    if(!codigos.length)throw new Error(`Ingrese al menos un código para el día ${i+1}`);
    if(codigos.length>6)throw new Error(`El día ${i+1} supera el máximo de 6 códigos`);
    dias.push({fecha,puntos,codigos});
  }
  return dias;
}

function mostrarConsultasReclamos(){
  limpiarPantalla();
  const menu=document.getElementById("menuPrincipal");if(menu)menu.style.setProperty("display","none","important");
  setBotonNavegacion("modulo");
  const p=document.getElementById("pantalla"),cats=crCategorias();
  p.innerHTML=`<div class="cr-wrap"><div class="cr-title">💬 CONSULTAS Y RECLAMOS</div><div class="cr-tabs"><button onclick="crMostrarSeccion('lista')">Mis casos</button><button onclick="crMostrarSeccion('nuevo')">Registrar caso</button></div><section id="crNuevo" class="cr-panel" style="display:none"><h3>Registrar consulta o reclamo</h3><div class="cr-grid"><label>Categoría<select id="crCategoria" onchange="crActualizarSubcategoria();crActualizarFormularioEspecial()"><option value="">SELECCIONE</option>${Object.keys(cats).map(x=>`<option>${x}</option>`).join("")}</select></label><label>Subcategoría<select id="crSubcategoria"><option value="">SELECCIONE</option></select></label><label>Urgencia<select id="crUrgencia"><option>NORMAL</option><option>URGENTE</option></select></label></div><div id="crCamposGenerales" class="cr-grid cr-general-fields"><label>Código de pedido<input id="crCodigo" placeholder="Opcional"></label><label>Ticket<input id="crTicket" placeholder="Opcional"></label><label>Cliente<input id="crCliente" placeholder="Opcional"></label></div><div id="crCamposDias" class="cr-special" style="display:none"><label class="cr-cantidad-dias">Cantidad de días afectados<input id="crCantidadDias" type="number" min="1" max="31" value="1" onchange="crRenderDias()"></label><div id="crDiasContainer"></div></div><label>Descripción<textarea id="crDescripcion" rows="5" placeholder="Explique claramente lo ocurrido"></textarea></label><label id="crEvidenciaGeneralLabel">Evidencias o enlaces<textarea id="crEvidencias" rows="2" placeholder="Pegue enlaces de capturas, fotos o documentos"></textarea></label><button class="cr-primary" onclick="crRegistrar()">Registrar caso</button><div id="crMsg"></div></section><section id="crLista" class="cr-panel"><div id="crResumen" class="cr-resumen"></div><div class="cr-filtros"><select id="crFiltroEstado" onchange="crCargar()"><option value="">TODOS LOS ESTADOS</option><option>REGISTRADO</option><option>EN REVISION</option><option>EN PROCESO</option><option>PENDIENTE DE INFORMACION</option><option>SOLUCIONADO</option><option>CERRADO</option></select><select id="crFiltroArea" onchange="crCargar()"><option value="">TODAS LAS AREAS</option><option>JEFATURA GENERAL</option><option>JEFATURA DE OPERACIONES</option><option>JEFATURA DE ALMACEN</option></select></div><div id="crCasos">Cargando...</div></section></div>`;
  window.scrollTo({top:0,behavior:"smooth"});crCargar();
}
function crMostrarSeccion(s){document.getElementById("crNuevo").style.display=s==="nuevo"?"block":"none";document.getElementById("crLista").style.display=s==="lista"?"block":"none";if(s==="lista")crCargar();}
function crActualizarSubcategoria(){const c=document.getElementById("crCategoria").value,l=crCategorias()[c]||[],s=document.getElementById("crSubcategoria");s.innerHTML='<option value="">SELECCIONE</option>'+l.map(x=>`<option>${x}</option>`).join("");}
async function crRegistrar(){
  const msg=document.getElementById("crMsg");msg.textContent="Registrando...";
  const boton=msg.previousElementSibling;if(boton)boton.disabled=true;
  try{
    const especial=crEsCasoProduccion();
    const payload={accion:"registrarConsultaReclamo",usuario:localStorage.getItem("usuario"),categoria:document.getElementById('crCategoria').value,subcategoria:document.getElementById('crSubcategoria').value,urgencia:document.getElementById('crUrgencia').value,descripcion:document.getElementById('crDescripcion').value,evidencias:document.getElementById('crEvidencias').value};
    if(especial){payload.detalleDias=await crObtenerDetalleDias();payload.cantidadDias=payload.detalleDias.length;}
    else{payload.codigoPedido=document.getElementById('crCodigo').value;payload.ticket=document.getElementById('crTicket').value;payload.cliente=document.getElementById('crCliente').value;}
    const d=await crApi(payload);
    msg.innerHTML=`<b>Caso ${crEsc(d.id)} registrado y derivado a ${crEsc(d.areaResponsable)}.</b>`;
    document.getElementById('crDescripcion').value="";document.getElementById('crEvidencias').value="";
    if(especial){document.getElementById('crCantidadDias').value=1;crRenderDias();}
    else{['crCodigo','crTicket','crCliente'].forEach(id=>document.getElementById(id).value="");}
  }catch(e){msg.textContent=e.message;}finally{if(boton)boton.disabled=false;}
}
async function crCargar(){const box=document.getElementById("crCasos");if(!box)return;box.textContent="Cargando casos...";try{const d=await crApi({accion:"listarConsultasReclamos",usuario:localStorage.getItem("usuario"),estado:crFiltroEstado?.value||"",area:crFiltroArea?.value||""});const r=d.resumen;document.getElementById("crResumen").innerHTML=`<div><b>${r.total}</b><span>Total</span></div><div><b>${r.registrados}</b><span>Registrados</span></div><div><b>${r.enProceso+r.enRevision}</b><span>En atención</span></div><div><b>${r.pendienteInformacion}</b><span>Pendiente info.</span></div><div><b>${r.solucionados}</b><span>Solucionados</span></div>`;box.innerHTML=d.casos.length?d.casos.map(x=>`<article class="cr-card ${x.urgencia==='URGENTE'?'cr-urgente':''}"><div class="cr-card-head"><b>${crEsc(x.id)} · ${crEsc(x.categoria)}</b><span>${crEsc(x.estado)}</span></div><div class="cr-meta">${crEsc(x.sede)} · ${crEsc(x.cuadrilla||x.tecnico)} · ${crEsc(x.areaResponsable)}</div><p>${crEsc(x.descripcion)}</p><button onclick="crDetalle('${crEsc(x.id)}')">Ver detalle</button></article>`).join(""):'<div class="cr-empty">No hay casos para este filtro.</div>';}catch(e){box.textContent=e.message;}}
async function crDetalle(id){try{const d=await crApi({accion:"listarConsultasReclamos",usuario:localStorage.getItem("usuario")}),x=d.casos.find(c=>c.id===id);if(!x)return;const h=await crApi({accion:"listarHistorialReclamo",usuario:localStorage.getItem("usuario"),id});const p=crPerfil(),areaPerfil=d.areaPerfil||"",puede=(areaPerfil&&areaPerfil===x.areaResponsable)||(p.includes("JEFATURA")&&x.areaResponsable==="JEFATURA GENERAL")||(x.tecnico===localStorage.getItem("usuario")&&x.estado==="SOLUCIONADO");document.getElementById("crCasos").innerHTML=`<button onclick="crCargar()">← Volver</button><article class="cr-detail"><h3>${crEsc(x.id)} — ${crEsc(x.subcategoria)}</h3><div class="cr-detail-grid"><div><b>Área</b><br>${crEsc(x.areaResponsable)}</div><div><b>Estado</b><br>${crEsc(x.estado)}</div><div><b>Sede</b><br>${crEsc(x.sede)}</div><div><b>Cuadrilla</b><br>${crEsc(x.cuadrilla)}</div>${x.detalleDias&&x.detalleDias.length?`<div><b>Días reportados</b><br>${x.detalleDias.length}</div><div><b>Puntos solicitados</b><br>${crEsc(x.totalPuntos||0)}</div>`:`<div><b>Código</b><br>${crEsc(x.codigoPedido||'-')}</div><div><b>Ticket</b><br>${crEsc(x.ticket||'-')}</div>`}</div>${x.detalleDias&&x.detalleDias.length?`<h4>Detalle por fecha</h4><div class="cr-days-detail">${x.detalleDias.map((d,i)=>`<div><b>Día ${i+1}: ${crEsc(d.fecha)} · ${crEsc(d.puntos)} puntos</b>${(d.codigos||[]).map((c,j)=>`<p>Código ${j+1}: ${crEsc(c.codigo)} ${c.actaUrl?`· <a href="${crEsc(c.actaUrl)}" target="_blank" rel="noopener">Ver acta</a>`:''}</p>`).join('')}</div>`).join('')}</div>`:''}<h4>Descripción</h4><p>${crEsc(x.descripcion)}</p>${x.evidencias?`<h4>Evidencias</h4><p>${crEsc(x.evidencias)}</p>`:''}<h4>Historial</h4><div class="cr-history">${h.historial.map(y=>`<div><b>${crEsc(y.accion)} · ${crEsc(y.usuario)}</b><br>${crEsc(y.comentario||'')}<small>${crEsc(y.estadoAnterior)} → ${crEsc(y.estadoNuevo)}</small></div>`).join('')}</div><textarea id="crComentario" rows="3" placeholder="Comentario o respuesta"></textarea><div class="cr-actions"><button onclick="crComentar('${id}')">Agregar comentario</button>${puede?`<select id="crNuevoEstado"><option>EN REVISION</option><option>EN PROCESO</option><option>PENDIENTE DE INFORMACION</option><option>SOLUCIONADO</option><option>RECHAZADO</option><option>CERRADO</option></select><button class="cr-primary" onclick="crActualizar('${id}')">Guardar estado</button>`:''}</div></article>`;}catch(e){alert(e.message);}}
async function crComentar(id){try{await crApi({accion:"agregarComentarioReclamo",usuario:localStorage.getItem("usuario"),id,comentario:crComentario.value});crDetalle(id);}catch(e){alert(e.message);}}
async function crActualizar(id){try{await crApi({accion:"actualizarConsultaReclamo",usuario:localStorage.getItem("usuario"),id,estado:crNuevoEstado.value,comentario:crComentario.value});crDetalle(id);}catch(e){alert(e.message);}}
window.mostrarConsultasReclamos=mostrarConsultasReclamos;
