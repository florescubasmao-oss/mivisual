const ACTAS_EVID_API=URL+"/functions/v1/evidencias-pilot";
let ACTA_UPLOAD_REF=null;

async function actaEvidApi(data){
  const t=await tok();if(!t)throw Error("Inicie sesión en MI VISUAL.");
  const r=await fetch(ACTAS_EVID_API,{
    method:"POST",
    headers:{Authorization:"Bearer "+t,apikey:KEY,"Content-Type":"application/json"},
    body:JSON.stringify(data)
  });
  const x=await r.json();
  if(!r.ok||!x.ok)throw Error(x.error||"Error de archivo.");
  return x;
}
function actasStorageContextReady(){
  if(CTX?.permiso?.registrar && N(CTX?.usuario?.perfil)==="TECNICO"){
    E("uploadLauncher")?.classList.remove("hidden");
  }
}
function actaPdfCell(row,index){
  const ref=row?.archivo_storage_ref||row?.link_acta||"";
  if(!ref)return "-";
  const backend=row?.archivo_storage_backend||(/storage:\/\//i.test(ref)?"SUPABASE_STORAGE":"GOOGLE_DRIVE");
  return '<button class="sec" onclick="event.stopPropagation();abrirPdfActaByIndex('+index+')">'+(backend==="SUPABASE_STORAGE"?"Abrir PDF":"Ver PDF")+'</button>';
}
async function abrirPdfActaByIndex(i){
  const row=ROWS[Number(i)];if(!row)return;
  const ref=row.archivo_storage_ref||row.link_acta||"";
  if(!ref)return;
  try{
    if(String(ref).startsWith("storage://")){
      const d=await actaEvidApi({accion:"FIRMAR_EVIDENCIA",modulo:"ACTAS ESCANEADAS",storageRef:ref,expiresIn:900});
      window.open(d.signedUrl,"_blank","noopener");
    }else{
      window.open(ref,"_blank","noopener");
    }
  }catch(e){alert("No se pudo abrir el PDF: "+e.message)}
}
function actaPuedeSubirPdf(row){
  if(!CTX?.permiso?.registrar||N(CTX?.usuario?.perfil)!=="TECNICO")return false;
  if(!row)return true;
  if(N(row.estado)==="FINALIZADO"||N(row.resultado_jefatura)==="CORRECTO")return false;
  const faltante=N(row.origen_registro)==="ALMACEN"&&!row.link_acta;
  const observada=N(row.resultado_almacen)==="OBSERVADO"||N(row.resultado_jefatura)==="OBSERVADO";
  return faltante||observada;
}
function abrirActaUpload(row=null){
  if(!actaPuedeSubirPdf(row)&&row){alert("Esta acta no admite reemplazo en su estado actual.");return}
  ACTA_UPLOAD_REF=row||null;
  E("uploadCard").classList.remove("hidden");
  E("upTitle").textContent=row
    ? (row.link_acta?"Reemplazar PDF observado":"Completar acta faltante")
    : "Subir nueva acta";
  E("upOrden").value=row?.codigo_orden||"";
  E("upPedido").value=row?.codigo_pedido||"";
  E("upNumero").value=row?.numero_acta||"";
  E("upPdf").value="";
  E("upRef").textContent="";
  E("upMsg").textContent="";
  E("uploadCard").scrollIntoView({behavior:"smooth",block:"start"});
  if(row?.codigo_orden||row?.codigo_pedido)buscarActaMapa();
}
function cerrarActaUpload(){
  E("uploadCard").classList.add("hidden");
  ACTA_UPLOAD_REF=null;
}
async function buscarActaMapa(){
  try{
    const orden=E("upOrden").value.trim(),pedido=E("upPedido").value.trim();
    if(!orden&&!pedido)throw Error("Ingrese Código de Orden o Código de Pedido.");
    E("upRef").className="muted";E("upRef").textContent="Buscando...";
    const d=await api({accion:"resolverMapaActa",codigoOrden:orden,codigoPedido:pedido,cuadrilla:CTX?.usuario?.cuadrilla||""});
    const x=(d.lista||[])[0];
    if(!x)throw Error("Sin coincidencia en Mapa Operativo. Puede continuar si los códigos son correctos.");
    if(x.orden_id)E("upOrden").value=x.orden_id;
    if(x.codigo_cliente)E("upPedido").value=x.codigo_cliente;
    E("upRef").className="ok";
    E("upRef").textContent=[
      x.cliente||"",
      x.numero_documento?("DNI "+x.numero_documento):"",
      x.fecha_gestion?("Fecha "+x.fecha_gestion):"",
      x.tipo_partida||x.codigo_partida||""
    ].filter(Boolean).join(" · ");
  }catch(e){
    E("upRef").className="warn";
    E("upRef").textContent=e.message;
  }
}
async function leerPdfActasStorage(file){
  if(!file)throw Error("Debe seleccionar un PDF.");
  const name=String(file.name||"acta.pdf").trim()||"acta.pdf";
  const mime=String(file.type||"").toLowerCase();
  if(!(mime.includes("pdf")||/\.pdf$/i.test(name)))throw Error("Solo se permite PDF.");
  if(file.size>10*1024*1024)throw Error("El PDF supera 10 MB.");
  const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const sig=new TextDecoder().decode(head);
  if(!sig.includes("%PDF-")&&!mime.includes("pdf"))throw Error("El archivo seleccionado no se reconoce como PDF.");
  const base64=await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||"").split(",")[1]||"");
    r.onerror=()=>reject(Error("No se pudo leer el PDF."));
    r.readAsDataURL(file);
  });
  return {nombre:/\.pdf$/i.test(name)?name:name+".pdf",mime:"application/pdf",base64};
}
async function guardarActaPdfStorage(){
  let storageRef="";
  const btn=E("upSave");
  try{
    btn.disabled=true;
    E("upMsg").className="muted";E("upMsg").textContent="Validando PDF...";
    const codigoOrden=E("upOrden").value.trim(),codigoPedido=E("upPedido").value.trim(),numeroActa=E("upNumero").value.trim();
    if(!codigoOrden)throw Error("Ingrese Código de Orden.");
    if(!codigoPedido)throw Error("Ingrese Código de Pedido.");
    if(!numeroActa)throw Error("Ingrese Número de Acta.");

    const archivo=await leerPdfActasStorage(E("upPdf").files?.[0]);
    E("upMsg").textContent="Subiendo PDF a almacenamiento privado...";
    const up=await actaEvidApi({
      accion:"SUBIR_EVIDENCIA",
      modulo:"ACTAS ESCANEADAS",
      registroId:"ACTA-"+codigoOrden+"-"+numeroActa,
      categoria:"PDF-ACTA",
      archivo
    });
    storageRef=up.storageRef;

    E("upMsg").textContent="Registrando metadatos y versión...";
    const d=await api({
      accion:"registrarActaPdfStorage",
      codigoOrden,codigoPedido,numeroActa,
      nombreArchivo:archivo.nombre,
      storageRef
    },"POST");

    E("upMsg").className="ok";
    E("upMsg").textContent=(d.accion==="REEMPLAZAR"?"PDF reemplazado":"Acta registrada")+" correctamente · Versión "+(d.version||1)+
      (d.estadoFechaCarpeta==="PENDIENTE_MAPA"?" · fecha pendiente de conciliación con Mapa":"");
    ACTA_UPLOAD_REF=null;
    await listar();
    setTimeout(cerrarActaUpload,900);
  }catch(e){
    if(storageRef){
      try{await actaEvidApi({accion:"ELIMINAR_EVIDENCIA",modulo:"ACTAS ESCANEADAS",storageRef})}catch(_){}
    }
    E("upMsg").className="err";E("upMsg").textContent=e.message;
  }finally{btn.disabled=false}
}
