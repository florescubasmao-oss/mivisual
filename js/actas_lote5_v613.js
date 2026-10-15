/* V613 - Subida segura de hasta cinco actas para PERFIL TECNICO.
   Solo interfaz: usa registrarActaEscaneada existente, sin tocar backend.
   Cola secuencial; no promete subir con navegador cerrado. */
(function(){
"use strict";
let filas=[], ocupado=false;
function html(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function tecnico(){return typeof usuarioActualActas==="function"&&normalizarActas(usuarioActualActas().perfil)==="TECNICO";}
function estado(f){return f.estado==="ok"?"✅ Subida":f.estado==="error"?"❌ Error":f.estado==="procesando"?"⏳ Procesando":"En espera";}
function pintar(){
 const root=document.getElementById("actasLoteFilas");if(!root)return;
 root.innerHTML=filas.map((f,i)=>`<div class="actas-card" style="margin:9px 0;padding:12px;border:1px solid #dbe4ef">
 <b>${i+1}. ${html(f.archivo.name)}</b> <span id="loteEstado${i}" style="font-size:12px">${estado(f)}</span>
 <div class="actas-grid" style="margin-top:10px">
 <div class="actas-field"><label>Código de orden</label><input id="loteOrden${i}" inputmode="numeric" value="${html(f.orden)}" ${ocupado||f.estado==="ok"?"disabled":""}></div>
 <div class="actas-field"><label>Código de pedido</label><input id="lotePedido${i}" inputmode="numeric" value="${html(f.pedido)}" ${ocupado||f.estado==="ok"?"disabled":""}></div>
 <div class="actas-field"><label>Número de acta</label><input id="loteActa${i}" inputmode="numeric" value="${html(f.numero)}" ${ocupado||f.estado==="ok"?"disabled":""}></div>
 </div><div style="font-size:12px;color:${f.estado==="error"?"#b91c1c":"#475569"}">${html(f.mensaje)}</div>
 </div>`).join("");
 const btn=document.getElementById("actasLoteEnviar");if(btn){btn.disabled=ocupado||!filas.length||filas.every(f=>f.estado==="ok");btn.textContent=ocupado?"Procesando actas...":filas.some(f=>f.estado==="error")?"Reintentar pendientes / fallidas":"Subir actas";}
 const pick=document.getElementById("actasLoteArchivos");if(pick)pick.disabled=ocupado;
 const back=document.getElementById("actasLoteVolver");if(back)back.disabled=ocupado;
}
function seleccionar(e){
 if(ocupado)return;
 const selected=Array.from(e.target.files||[]);
 if(!selected.length)return;
 if(selected.length>5){alert("Solo se permiten hasta 5 PDF por lote.");e.target.value="";return;}
 if(selected.some(f=>!f.name.toLowerCase().endsWith(".pdf")&&f.type!=="application/pdf")){alert("Selecciona solo archivos PDF.");e.target.value="";return;}
 filas=selected.map(archivo=>({archivo,orden:"",pedido:"",numero:"",estado:"espera",mensaje:""}));
 pintar();
}
function validar(){
 const datos=[],vistos=new Set();
 for(let i=0;i<filas.length;i++){
  const f=filas[i];if(f.estado==="ok")continue;
  const orden=document.getElementById("loteOrden"+i)?.value.trim()||"";
  const pedido=document.getElementById("lotePedido"+i)?.value.trim()||"";
  const numero=document.getElementById("loteActa"+i)?.value.trim()||"";
  if(!/^\d+$/.test(orden)||!/^\d+$/.test(pedido)||!/^\d+$/.test(numero))throw Error("Completa los tres códigos numéricos del PDF "+(i+1)+".");
  if(vistos.has(pedido)||vistos.has("A"+numero))throw Error("Existen códigos repetidos dentro del lote.");
  vistos.add(pedido);vistos.add("A"+numero);
  f.orden=orden;f.pedido=pedido;f.numero=numero;
  datos.push({f,i});
 }
 return datos;
}
async function ejecutar(){
 if(!tecnico()||ocupado||!filas.length)return;
 let pendientes;
 try{pendientes=validar();}catch(e){alert(e.message);return;}
 ocupado=true;pintar();
 try{
  const u=usuarioActualActas();
  // Comprobación preventiva; ante una consulta fallida, no subir a ciegas.
  const prev=await apiActas({accion:"listarActasEscaneadas",usuario:u.usuario,__forzar:true});
  if(!Array.isArray(prev.actas))throw Error("No se pudo comprobar si las actas ya existen.");
  const existentes=prev.actas;
  for(const {f,i} of pendientes){
   if(existentes.some(a=>normalizarActas(a.codigoPedido)===normalizarActas(f.pedido)||normalizarActas(a.numeroActa)===normalizarActas(f.numero))){
    f.estado="error";f.mensaje="Ya existe un acta con este pedido o número. Revísala en el historial o usa Reemplazar PDF.";pintar();continue;
   }
   f.estado="procesando";f.mensaje="Mantén esta pantalla abierta hasta finalizar.";pintar();
   try{
    const pdf=await leerPdfActa(f.archivo);
    const data=await apiActas({accion:"registrarActaEscaneada",usuario:u.usuario,codigoOrden:f.orden,codigoPedido:f.pedido,numeroActa:f.numero,archivoBase64:pdf.base64,archivoNombre:pdf.nombre,archivoMimeType:pdf.mime});
    f.estado="ok";f.mensaje="Registrada"+(data.nombreArchivo?" como "+data.nombreArchivo:"")+".";
    existentes.push({codigoPedido:f.pedido,numeroActa:f.numero});
   }catch(e){f.estado="error";f.mensaje=e.message||"No se pudo confirmar la subida. Verifica el historial antes de reintentar.";}
   pintar();
  }
 }catch(e){alert("No se inició la carga: "+e.message);}
 finally{ocupado=false;pintar();}
}
function abrir(){
 if(!tecnico())return;
 filas=[];ocupado=false;
 mostrarPantalla(`${estiloActas()}<div class="actas-wrap">
 <div class="actas-head"><h2>📄 Subida múltiple (máximo 5 PDF)</h2><p>Registra cada PDF con sus códigos propios. Se envían uno por uno.</p></div>
 <div class="actas-card"><label><b>Seleccionar entre 1 y 5 PDF</b></label><input id="actasLoteArchivos" type="file" accept="application/pdf,.pdf" multiple>
 <p style="font-size:12px;color:#475569">Mantén abierta esta pantalla durante la carga. Al cerrar la aplicación, no se garantiza la continuación.</p>
 <div id="actasLoteFilas"></div>
 <div class="actas-actions"><button id="actasLoteEnviar" class="actas-btn ok" disabled>Subir actas</button><button id="actasLoteVolver" class="actas-btn sec">Volver</button></div>
 </div></div>`);
 document.getElementById("actasLoteArchivos").addEventListener("change",seleccionar);
 document.getElementById("actasLoteEnviar").addEventListener("click",ejecutar);
 document.getElementById("actasLoteVolver").addEventListener("click",()=>{if(!ocupado)mostrarGestionActas();});
}
window.mv613MostrarLoteActas=abrir;
})();
