/* Carga por responsable. Usa POST sin reenvío del PDF; consulta por orden ante respuesta perdida. */
(()=>{
'use strict';
function mount(){
 const list=document.getElementById('actasLista'),bar=list?.closest('.actas-wrap')?.querySelector('.actas-actions');
 if(!bar||bar.querySelector('[data-delegada]')||typeof usuarioActualActas!=='function')return;
 const u=usuarioActualActas();if(!['ALMACEN','SUPERVISOR'].includes(u.perfil))return;
 const b=document.createElement('button');b.className='actas-btn blue';b.dataset.delegada='1';b.textContent='Subir acta por cuadrilla';b.onclick=()=>openForm(u);bar.prepend(b);
}
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});mount();
function openForm(u){
 mostrarPantalla(estiloActas()+'<div class="actas-wrap"><h2>Subir acta por cuadrilla</h2><form id="mv648form"><p><label>Número de acta <input name="numero" required maxlength="35"></label></p><p><label>Código de cliente, orden o DNI <input name="ident" autocomplete="off" required></label></p><button name="buscar" class="actas-btn blue" type="button">Buscar orden</button><p><label>Orden <select name="orden"></select></label></p><p name="detalle"></p><label>Acta escaneada <input name="pdf" type="file" accept="application/pdf,.pdf"></label><p><button name="enviar" class="actas-btn ok" disabled>Guardar para validación</button> <button name="check" class="actas-btn sec" type="button" hidden>Comprobar guardado</button> <button name="volver" type="button" class="actas-btn sec">Volver</button></p><p role="status"></p></form></div>');
 const f=document.querySelector('#mv648form'),e=f.elements,status=f.querySelector('[role=status]'),detalle=f.querySelector('[name=detalle]');
 let options=[],busy=false,uncertain=false,submitted=null,done=false;
 const state=msg=>{status.textContent=msg;};
 async function post(accion,extra){
  if(window.mv649Ingreso)await window.mv649Ingreso; const token=localStorage.getItem("actas649token");if(!token)throw Error("Cierra sesión e ingresa nuevamente a MI VISUAL para habilitar Actas.");
  const res=await fetch("https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec",{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...extra,accion,usuario:u.usuario,sesionActas:token})});
  const j=await res.json();if(!res.ok||j.ok!==true)throw Error(j.error||'El servidor no confirmó la operación.');return j;
 }
 function paint(){const o=options.find(x=>x.codigoOrden===e.orden.value);detalle.textContent=o?[o.cliente,o.dni,o.fechaGestion,o.tipoPartida||o.tipoEjecucion].filter(Boolean).join(' · '):'';e.enviar.disabled=busy||uncertain||done||!o||!e.pdf.files.length;e.buscar.disabled=busy||uncertain||done;e.check.hidden=!uncertain;e.check.disabled=busy;for(const k of ['numero','ident','orden','pdf'])e[k].disabled=busy||uncertain||done;}
 e.ident.oninput=()=>{options=[];e.orden.replaceChildren();paint();};e.orden.onchange=e.pdf.onchange=paint;
 e.volver.onclick=()=>{if(!busy)mostrarGestionActas();};
 e.buscar.onclick=async()=>{if(busy||!f.reportValidity())return;options=[];e.orden.replaceChildren();busy=true;paint();state('Buscando…');try{
  const j=await post('buscarActaDelegada648',{identificador:e.ident.value.trim()});options=j.opciones;
  e.orden.add(new Option('Seleccione una orden',''));options.forEach(o=>e.orden.add(new Option([o.codigoOrden,o.fechaGestion,o.sede,o.cuadrilla].join(' · '),o.codigoOrden)));if(options.length===1)e.orden.selectedIndex=1;
  state(options.length?'Verifique la orden y adjunte el PDF.':'No hay órdenes finalizadas de su ámbito con ese dato.');
 }catch(x){state(x.message);}finally{busy=false;paint();}};
 e.check.onclick=async()=>{busy=true;paint();try{let j=await post('estadoActaDelegada648',submitted);if(j.confirmada){uncertain=false;done=true;state('LISTO. Acta guardada.');}else state('Aún no se confirma. Consulte de nuevo antes de repetir la carga.');}catch(x){state(x.message);}finally{busy=false;paint();}};
 f.onsubmit=async ev=>{ev.preventDefault();if(busy||uncertain||done||!e.orden.value||!e.pdf.files.length)return;
 submitted={numeroActa:e.numero.value.trim(),identificador:e.ident.value.trim(),codigoOrden:e.orden.value};const file=e.pdf.files[0];busy=true;paint();state('Guardando…');let uploaded=false;
 try{const b64=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('No se pudo leer el PDF.'));r.readAsDataURL(file);});if(!b64.startsWith('JVBERi0'))throw Error('Seleccione un archivo PDF válido.');
 uploaded=true;await post('guardarActaDelegada648',{...submitted,archivoBase64:b64});done=true;state('LISTO. Acta guardada en el historial de la cuadrilla, pendiente de validación.');
 }catch(x){uncertain=uploaded;state(uncertain?'No se confirmó el guardado. '+x.message+' Compruebe el estado antes de reintentar.':x.message);}finally{busy=false;paint();}};
}
})();
