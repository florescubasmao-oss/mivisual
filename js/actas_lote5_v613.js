/* V613 - Subida segura de hasta cinco actas para PERFIL TECNICO.
   Solo interfaz: usa registrarActaEscaneada existente, sin tocar backend.
   Cola secuencial; no promete subir con navegador cerrado. */
(function(){
"use strict";
let filas=[], ocupado=false, catalogo=null;

function claveLote(t){return String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
async function resolverLote(i){
 const f=filas[i],id=document.getElementById("loteIdentificador"+i)?.value.trim()||"";
 f.identificador=id;f.opciones=[];f.seleccion="";f.mensaje="Buscando...";
 try{
  if(claveLote(id).length<6)throw Error("Ingresa el cliente o DNI.");
  if(!catalogo){
   const d=new Date(),e=new Date(d.getFullYear(),d.getMonth()-1,1),u=usuarioActualActas();
   const periodos=[d,e].map(x=>x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"));
   const arr=await Promise.all(periodos.map(periodo=>apiActas({accion:"listarControlActasFinalizadasV396",usuario:u.usuario,periodo})));
   catalogo=arr.flatMap(x=>Array.isArray(x.ordenes)?x.ordenes:[]);
  }
  const encontrados=catalogo.filter(x=>[x.codigoPedido,x.dni,x.codigoOrden].some(v=>claveLote(v)===claveLote(id)));
  const unicos=new Map();
  encontrados.forEach(x=>unicos.set(claveLote(x.codigoOrden)+"|"+claveLote(x.codigoPedido),x));
  f.opciones=[...unicos.values()].filter(x=>normalizarActas(x.estadoControl)==="PENDIENTE_SUBIR"&&x.codigoOrden&&x.codigoPedido);
  if(!f.opciones.length)throw Error("No se encontró una orden pendiente; utiliza carga individual si requiere ingreso manual.");
  if(f.opciones.length===1)f.seleccion="0";
  f.mensaje=f.opciones.length===1?"Orden encontrada. Confirma datos.":"Varias órdenes encontradas: selecciona la correcta.";
  f.estado="espera";
 }catch(e){f.estado="error";f.mensaje=e.message;}
 pintar();
}

function html(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function tecnico(){return typeof usuarioActualActas==="function"&&normalizarActas(usuarioActualActas().perfil)==="TECNICO";}
function estado(f){return f.estado==="ok"?"✅ Subida":f.estado==="error"?"❌ Error":f.estado==="procesando"?"⏳ Procesando":"En espera";}
function pintar(){
 const root=document.getElementById("actasLoteFilas");if(!root)return;
 root.innerHTML=filas.map((f,i)=>`<div class="actas-card" style="margin:9px 0;padding:12px;border:1px solid #dbe4ef">
 <b>${i+1}. ${html(f.archivo.name)}</b> <span id="loteEstado${i}" style="font-size:12px">${estado(f)}</span>
 <div class="actas-grid" style="margin-top:10px">
 <div class="actas-field"><label>Código cliente o DNI</label><input id="loteIdentificador${i}" value="${html(f.identificador)}" ${ocupado||f.estado==="ok"?"disabled":""}></div>
 <button class="actas-btn blue" type="button" onclick="window.mv613ResolverLote(${i})" ${ocupado||f.estado==="ok"?"disabled":""}>Buscar orden</button>
 ${f.opciones?.length ? `<div class="actas-field"><label>Orden correcta</label><select id="loteElegir${i}" onchange="window.mv613ElegirLote(${i},this.value)" ${ocupado||f.estado==="ok"?"disabled":""}><option value="">Seleccionar orden</option>${f.opciones.map((o,j)=>`<option value="${j}" ${f.seleccion===String(j)?"selected":""}>${html(o.codigoOrden)} · Pedido ${html(o.codigoPedido)} · ${html(o.fechaVisible||o.fecha)}</option>`).join("")}</select></div>` : ""}
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
 filas=selected.map(archivo=>({archivo,identificador:"",opciones:[],seleccion:"",orden:"",pedido:"",numero:"",estado:"espera",mensaje:""}));
 pintar();
}
function validar(){
 const datos=[],vistos=new Set();
 for(let i=0;i<filas.length;i++){
  const f=filas[i];if(f.estado==="ok")continue;
  const numero=document.getElementById("loteActa"+i)?.value.trim()||"";
  const identificador=document.getElementById("loteIdentificador"+i)?.value.trim()||"";
  if(identificador!==f.identificador||f.seleccion===""||!f.opciones?.[Number(f.seleccion)])throw Error("Busca y selecciona una orden válida para PDF "+(i+1)+".");
  const orden=String(f.opciones[Number(f.seleccion)].codigoOrden),pedido=String(f.opciones[Number(f.seleccion)].codigoPedido);
  if(!/^\d+$/.test(numero))throw Error("Número de acta inválido para PDF "+(i+1)+".");
  if(vistos.has("O"+orden)||vistos.has("A"+numero))throw Error("Existen códigos repetidos dentro del lote.");
  vistos.add("O"+orden);vistos.add("A"+numero);
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
window.mv613ResolverLote=resolverLote;
window.mv613ElegirLote=(i,v)=>{filas[i].seleccion=v;filas[i].estado="espera";pintar();};
})();
