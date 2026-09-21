import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V7-LEGACY-LIVE-ACTAS-20260920";
const ALLOWED=new Set([
  "MAPA_OPERATIVO","CATALOGO_CTO","ACTAS","VALIDACION_TECNICA",
  "PROGRAMACION_DESCANSOS","OBSERVACIONES","USUARIOS","PERMISOS",
  "CONFIG_MODULOS","CATALOGO_ORDENES","CONFIGURACION_RANKING",
  "PARAMETROS_SLA","ACTIVIDAD_CAMPO","CHECKLIST_ALMACEN",
  "EQUIPOS_AVERIADOS","PEXT_CONJUNTA","MESA_AYUDA","ACCESOS",
  "BIBLIOTECA","CAPACITACION","CONTINUIDAD_CUADRILLAS","SEGURIDAD",
  "BONOS_SUPERVISORES","ASIGNACIONES_CAMPO","FACTURAS","MATERIALES"
]);
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){
  const direct=Deno.env.get(legacy||name);if(direct)return direct;
  const raw=Deno.env.get(name)||"";if(!raw)return "";
  try{const p=JSON.parse(raw);return p?.default||Object.values(p||{})[0]||""}catch(_){return raw}
}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
async function ctx(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
  if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const h=req.headers.get("Authorization")||"";
  if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();
  if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users").select("usuario,perfil,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("Usuario Auth no vinculado.");
  if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario MI VISUAL inactivo.");
  if(!["JEFATURA","JEFATURA GENERAL"].includes(norm(u.perfil)))throw new Error("Solo Jefatura puede operar sincronización.");
  return {admin,u};
}
async function body(req:Request){try{return await req.json()}catch(_){return {}}}
async function hashRow(value:unknown){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

const LEGACY_API="https://script.google.com/macros/s/AKfycbwugGpuEMcJYFsDNS1hkcdZXJ92PUvXNv5ttpktyhZWv2fWB7ceCZNkfIFYxAs5wsgN/exec";

function isoDate(v:unknown){
  const s=txt(v);if(!s)return "";
  let m=s.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if(m)return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})/);
  return m?m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"):"";
}
function isoTime(v:unknown){
  const s=txt(v),m=s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m?m[1].padStart(2,"0")+":"+m[2]+":"+(m[3]||"00"):"";
}
function isoDateTime(v:unknown){
  const s=txt(v);if(!s)return "";
  let m=s.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m)return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0")+"T"+(m[4]||"00").padStart(2,"0")+":"+(m[5]||"00")+":"+(m[6]||"00");
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0")+"T"+(m[4]||"00").padStart(2,"0")+":"+(m[5]||"00")+":"+(m[6]||"00");
  const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString().replace(/Z$/,""):"";
}
async function legacyGet(params:Record<string,unknown>){
  const u=new URL(LEGACY_API);
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)u.searchParams.set(k,txt(v));
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
  try{
    const r=await fetch(u.toString(),{method:"GET",headers:{"Accept":"application/json"},signal:ctl.signal});
    const body=await r.text();let x:any;
    try{x=JSON.parse(body)}catch(_){throw new Error("Legacy no devolvió JSON válido.");}
    if(!r.ok||!x?.ok)throw new Error(x?.error||("Legacy HTTP "+r.status));
    return x;
  }finally{clearTimeout(timer)}
}
async function existingOrderIds(admin:any,ids:string[]){
  const out=new Set<string>();
  for(let i=0;i<ids.length;i+=400){
    const part=ids.slice(i,i+400);
    const {data,error}=await admin.from("ordenes").select("orden_id").in("orden_id",part);
    if(error)throw error;
    for(const x of data||[])out.add(txt(x.orden_id));
  }
  return out;
}
function liveMapaRow(x:any,sourceAt:string,actor:string,isNew:boolean,sourceRow:number){
  const fecha=isoDate(x?.fechaSolicitud);
  if(!txt(x?.ordenId)||!fecha)throw new Error("Fila legacy de Mapa sin OrdenId/Fecha válida.");
  return {
    sourceKey:txt(x.ordenId),sourceRow,
    rowData:{
      orden_id:txt(x.ordenId),tipo_trabajo:txt(x.tipoTrabajo),fecha_solicitud:fecha,
      hora_solicitud:isoTime(x.horaSolicitud),cliente:txt(x.cliente),tipo:txt(x.tipo),
      producto_origen:txt(x.productoOrigen),cuadrilla:txt(x.cuadrilla),estado:txt(x.estado),
      direccion:txt(x.direccion),direccion_adicional:txt(x.direccionAdicional),
      fecha_ultimo_estado:isoDateTime(x.fechaUltimoEstado),producto_servicio:txt(x.productoServicio),
      sede:txt(x.region),codigo_cliente:txt(x.codigoCliente),numero_documento:txt(x.numeroDocumento),
      telefono_movil:txt(x.telefonoMovil),telefono_fijo:txt(x.telefonoFijo),
      fecha_fin_visita:isoDateTime(x.fechaFinVisita),fecha_inicio_visita:isoDateTime(x.fechaInicioVisita),
      motivo_cancelacion:txt(x.motivoCancelacion),motivo_finalizacion:txt(x.motivoFinalizacion),
      motivo_anulacion:txt(x.motivoAnulacion),
      latitud:x.latitud===null||x.latitud===undefined?"":txt(x.latitud),
      longitud:x.longitud===null||x.longitud===undefined?"":txt(x.longitud),
      detalle:txt(x.detalle),
      fecha_importacion:isNew?sourceAt:"",
      usuario_importacion:isNew?actor:"",
      cto_1:txt(x.cto1),coordenada_cto_1:txt(x.coordenadaCto1),
      cto_2:txt(x.cto2),coordenada_cto_2:txt(x.coordenadaCto2),
      cto_3:txt(x.cto3),coordenada_cto_3:txt(x.coordenadaCto3),
      cto:txt(x.cto),puerto:txt(x.puerto),codigo_seguimiento:txt(x.codigoSeguimiento)
    }
  };
}

function limaDate(v:unknown){
  const s=txt(v);if(!s)return "";
  let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})/);
  if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
  m=s.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})(?!T)/);
  if(m)return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  const d=new Date(s);
  if(!Number.isFinite(d.getTime()))return "";
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
  const p:any={};for(const x of parts)p[x.type]=x.value;
  return p.year+"-"+p.month+"-"+p.day;
}
function limaTime(v:unknown){
  const s=txt(v);if(!s)return "";
  let m=s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(m)return m[1].padStart(2,"0")+":"+m[2]+":"+(m[3]||"00");
  const d=new Date(s);
  if(!Number.isFinite(d.getTime()))return "";
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Lima",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).formatToParts(d);
  const p:any={};for(const x of parts)p[x.type]=x.value;
  return p.hour+":"+p.minute+":"+p.second;
}
function limaTs(dateVal:unknown,timeVal?:unknown){
  const d=limaDate(dateVal);if(!d)return "";
  const t=limaTime(timeVal)||limaTime(dateVal)||"00:00:00";
  return d+"T"+t+"-05:00";
}
function liveActaRow(x:any,sourceRow:number){
  const id=txt(x?.id);if(!id)throw new Error("Acta legacy sin ID.");
  return {
    sourceKey:id,sourceRow,
    rowData:{
      id,
      registrado_at:limaTs(x.fechaRegistro,x.horaRegistro),
      sede:txt(x.sede),cuadrilla:txt(x.cuadrilla),supervisor:txt(x.supervisor),tecnico:txt(x.tecnico),
      fecha_gestion:limaDate(x.fechaGestion),
      tipo_ejecucion:txt(x.tipoEjecucion),tipo_partida:txt(x.tipoPartida),
      codigo_orden:txt(x.codigoOrden),codigo_pedido:txt(x.codigoPedido),numero_acta:txt(x.numeroActa),
      dni:txt(x.dni),cliente:txt(x.cliente),nombre_archivo:txt(x.nombreArchivo),link_acta:txt(x.linkActa),
      estado:txt(x.estado),
      resultado_almacen:txt(x.resultadoAlmacen),motivo_almacen:txt(x.motivoAlmacen),validado_almacen_por:txt(x.validadoAlmacenPor),
      validado_almacen_at:limaTs(x.fechaValidacionAlmacen,x.horaValidacionAlmacen),
      resultado_jefatura:txt(x.resultadoJefatura),motivo_jefatura:txt(x.motivoJefatura),validado_jefatura_por:txt(x.validadoJefaturaPor),
      validado_jefatura_at:limaTs(x.fechaValidacionJefatura,x.horaValidacionJefatura),
      version:Math.max(0,Number(x.version)||0),
      estado_entrega_fisica:txt(x.estadoEntregaFisica)||"PENDIENTE",
      confirmado_fisico_por:txt(x.confirmadoFisicoPor),perfil_confirmacion_fisica:txt(x.perfilConfirmacionFisica),
      confirmado_fisico_at:limaTs(x.fechaConfirmacionFisica,x.horaConfirmacionFisica),
      motivo_reversion_fisica:txt(x.motivoReversionFisica),
      origen_registro:txt(x.origenRegistro)||"TECNICO",
      motivo_acta_faltante:txt(x.motivoActaFaltante),registrado_faltante_por:txt(x.registradoFaltantePor),
      registrado_faltante_at:limaTs(x.fechaRegistroFaltante,x.horaRegistroFaltante),
      estado_fecha_carpeta:txt(x.estadoFechaCarpeta),
      fecha_limite_verificacion:limaTs(x.fechaLimiteVerificacion),
      ultimo_intento_fecha:limaTs(x.ultimoIntentoFecha),
      intentos_fecha:Math.max(0,Number(x.intentosFecha)||0),
      fecha_carpeta:limaDate(x.fechaCarpeta),
      fecha_confirmada_por:txt(x.fechaConfirmadaPor),perfil_confirmacion_fecha:txt(x.perfilConfirmacionFecha),
      origen_fecha_carpeta:txt(x.origenFechaCarpeta)
    }
  };
}
async function createValidatedRun(admin:any,u:any,modulo:string,sourceName:string,rows:any[],notes:string){
  const {data:run,error:re}=await admin.from("migration_sync_runs").insert({
    modulo,source_name:sourceName,source_snapshot_at:new Date().toISOString(),
    source_rows:rows.length,status:"STAGING",created_by:u.usuario,notes
  }).select("id").single();
  if(re)throw re;
  try{
    for(let i=0;i<rows.length;i+=500){
      const prepared=[];
      for(const item of rows.slice(i,i+500)){
        prepared.push({
          run_id:run.id,source_key:item.sourceKey,source_row:item.sourceRow,
          row_hash:await hashRow(item.rowData),row_data:item.rowData
        });
      }
      if(prepared.length){
        const {error}=await admin.from("migration_sync_staging").insert(prepared);
        if(error)throw error;
      }
    }
    const {count,error:ce}=await admin.from("migration_sync_staging").select("*",{count:"exact",head:true}).eq("run_id",run.id);
    if(ce)throw ce;
    const staged=count||0;
    if(staged!==rows.length)throw new Error("Conteo staging no coincide con la captura.");
    const {error:ue}=await admin.from("migration_sync_runs").update({
      staged_rows:staged,status:"VALIDATED",validated_at:new Date().toISOString()
    }).eq("id",run.id);
    if(ue)throw ue;
    return run.id;
  }catch(e){
    await admin.from("migration_sync_runs").update({
      status:"CANCELLED",notes:notes+" | Captura cancelada: "+(e instanceof Error?e.message:String(e))
    }).eq("id",run.id);
    throw e;
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const {admin,u}=await ctx(req);
    const d=req.method==="GET"?Object.fromEntries(new URL(req.url).searchParams.entries()):await body(req);
    const accion=txt(d.accion);

    if(accion==="estado"){
      const {data,error}=await admin.from("mv_migration_sync_status").select("*").limit(50);
      if(error)throw error;
      return json({ok:true,version:VERSION,runs:data||[]});
    }

    if(accion==="capturarMapaVivo"){
      const periodo=txt(d.periodo);
      if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(periodo))throw new Error("Periodo inválido.");
      const {data:pp,error:ppe}=await admin.from("produccion_periodos").select("periodo,protegido").eq("periodo",periodo).maybeSingle();
      if(ppe)throw ppe;
      if(pp?.protegido)throw new Error("El período "+periodo+" está protegido y no admite captura para APPLY.");

      const legacy=await legacyGet({
        accion:"listarMapaOperativo",usuario:u.usuario,periodo,
        sede:"",fecha:"",grupoTrabajo:"",estado:"",cuadrilla:"",codigo:""
      });
      const orders=Array.isArray(legacy.ordenes)?legacy.ordenes:[];
      if(Number(legacy.registros||orders.length)!==orders.length)throw new Error("Conteo legacy inconsistente.");
      const ids=orders.map((x:any)=>txt(x?.ordenId)).filter(Boolean);
      if(new Set(ids).size!==ids.length)throw new Error("Legacy devolvió OrdenId duplicados.");

      const existing=await existingOrderIds(admin,ids);
      const sourceAt=isoDateTime(legacy.ultimaActualizacionTexto||legacy.ultimaActualizacion)||new Date().toISOString().replace(/Z$/,"");
      const rows=orders.map((x:any,i:number)=>liveMapaRow(x,sourceAt,u.usuario,!existing.has(txt(x?.ordenId)),i+1));

      const {data:run,error:re}=await admin.from("migration_sync_runs").insert({
        modulo:"MAPA_OPERATIVO",
        source_name:"LEGACY_API_MAPA "+periodo,
        source_snapshot_at:new Date().toISOString(),
        source_rows:rows.length,status:"STAGING",created_by:u.usuario,
        notes:"Captura viva GET solo lectura. Corte legacy: "+txt(legacy.ultimaActualizacionTexto||legacy.ultimaActualizacion)+". Legacy continúa activo."
      }).select("id").single();
      if(re)throw re;

      try{
        for(let i=0;i<rows.length;i+=500){
          const prepared=[];
          for(const item of rows.slice(i,i+500)){
            prepared.push({
              run_id:run.id,source_key:item.sourceKey,source_row:item.sourceRow,
              row_hash:await hashRow(item.rowData),row_data:item.rowData
            });
          }
          if(prepared.length){
            const {error}=await admin.from("migration_sync_staging").insert(prepared);
            if(error)throw error;
          }
        }
        const {count,error:ce}=await admin.from("migration_sync_staging").select("*",{count:"exact",head:true}).eq("run_id",run.id);
        if(ce)throw ce;
        const staged=count||0;
        if(staged!==rows.length)throw new Error("Conteo staging vivo no coincide con la captura.");
        const {error:ue}=await admin.from("migration_sync_runs").update({
          staged_rows:staged,status:"VALIDATED",validated_at:new Date().toISOString()
        }).eq("id",run.id);
        if(ue)throw ue;
        const {data:preview,error:pe}=await admin.rpc("mv_sync_preview_mapa",{p_run_id:run.id});
        if(pe)throw pe;
        return json({
          ok:true,version:VERSION,accion:"CAPTURAR_MAPA_VIVO",periodo,
          runId:run.id,sourceRows:rows.length,legacyRowsEvaluated:Number(legacy.filasEvaluadas||0),
          legacyUpdatedAt:txt(legacy.ultimaActualizacionTexto||legacy.ultimaActualizacion),
          existingRows:existing.size,newRows:rows.length-existing.size,
          preview
        });
      }catch(e){
        await admin.from("migration_sync_runs").update({status:"CANCELLED",notes:"Captura viva cancelada por error: "+(e instanceof Error?e.message:String(e))}).eq("id",run.id);
        throw e;
      }
    }

    if(accion==="capturarActasVivas"){
      const legacy=await legacyGet({accion:"listarActasEscaneadas",usuario:u.usuario});
      const actas=Array.isArray(legacy.actas)?legacy.actas:[];
      if(Number(legacy.registros||actas.length)!==actas.length)throw new Error("Conteo legacy de Actas inconsistente.");
      const ids=actas.map((x:any)=>txt(x?.id)).filter(Boolean);
      if(ids.length!==actas.length)throw new Error("Legacy devolvió Actas sin ID.");
      if(new Set(ids).size!==ids.length)throw new Error("Legacy devolvió IDs de Acta duplicados.");

      const rows=actas.map((x:any,i:number)=>liveActaRow(x,i+2));
      const runId=await createValidatedRun(
        admin,u,"ACTAS","LEGACY_API_ACTAS",rows,
        "Captura viva GET solo lectura de Actas. Legacy continúa activo."
      );
      const {data:preview,error:pe}=await admin.rpc("mv_sync_preview_actas",{p_run_id:runId});
      if(pe)throw pe;
      return json({
        ok:true,version:VERSION,accion:"CAPTURAR_ACTAS_VIVAS",
        runId,sourceRows:rows.length,preview
      });
    }

    if(accion==="previewActas"){
      const runId=txt(d.runId);
      const {data,error}=await admin.rpc("mv_sync_preview_actas",{p_run_id:runId});
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="crearStaging"){
      const modulo=norm(d.modulo);
      if(!ALLOWED.has(modulo))throw new Error("Módulo no autorizado para staging.");
      const sourceName=txt(d.sourceName)||modulo;
      const sourceRows=Math.max(0,Number(d.sourceRows)||0);
      const rows=Array.isArray(d.rows)?d.rows:[];
      if(rows.length>1000)throw new Error("Máximo 1000 filas por bloque.");
      let runId=txt(d.runId);

      if(!runId){
        const {data:r,error}=await admin.from("migration_sync_runs").insert({
          modulo,source_name:sourceName,source_snapshot_at:d.sourceSnapshotAt||new Date().toISOString(),
          source_rows:sourceRows,source_checksum:txt(d.sourceChecksum)||null,status:"STAGING",
          created_by:u.usuario,notes:txt(d.notes)||null
        }).select("id").single();
        if(error)throw error; runId=r.id;
      }else{
        const {data:r,error}=await admin.from("migration_sync_runs").select("id,modulo,status").eq("id",runId).maybeSingle();
        if(error||!r)throw new Error("Run de staging no existe.");
        if(norm(r.modulo)!==modulo)throw new Error("El run pertenece a otro módulo.");
        if(!["STAGING","STAGED"].includes(r.status))throw new Error("El run ya no admite filas.");
      }

      const prepared=[];
      for(const item of rows){
        const key=txt(item?.sourceKey);
        if(!key)throw new Error("Cada fila requiere sourceKey.");
        const rowData=item?.rowData??{};
        prepared.push({
          run_id:runId,source_key:key,source_row:Number.isFinite(Number(item?.sourceRow))?Number(item.sourceRow):null,
          row_hash:await hashRow(rowData),row_data:rowData
        });
      }
      if(prepared.length){
        const {error}=await admin.from("migration_sync_staging").upsert(prepared,{onConflict:"run_id,source_key"});
        if(error)throw error;
      }
      const {count,error:ce}=await admin.from("migration_sync_staging").select("*",{count:"exact",head:true}).eq("run_id",runId);
      if(ce)throw ce;
      const staged=count||0;
      const status=staged>0?"STAGED":"STAGING";
      const {error:ue}=await admin.from("migration_sync_runs").update({staged_rows:staged,status}).eq("id",runId);
      if(ue)throw ue;
      return json({ok:true,version:VERSION,runId,modulo,stagedRows:staged,status});
    }

    if(accion==="validarStaging"){
      const runId=txt(d.runId);
      const {data:r,error}=await admin.from("migration_sync_runs").select("*").eq("id",runId).maybeSingle();
      if(error||!r)throw new Error("Run no encontrado.");
      const {count,error:ce}=await admin.from("migration_sync_staging").select("*",{count:"exact",head:true}).eq("run_id",runId);
      if(ce)throw ce;
      const staged=count||0;
      if(staged!==Number(r.source_rows))throw new Error("Conteo staging no coincide con la fuente.");
      const {error:ue}=await admin.from("migration_sync_runs").update({staged_rows:staged,status:"VALIDATED",validated_at:new Date().toISOString()}).eq("id",runId);
      if(ue)throw ue;
      return json({ok:true,version:VERSION,runId,status:"VALIDATED",sourceRows:r.source_rows,stagedRows:staged,aplicaDatos:false});
    }

    if(accion==="previewMapa"){
      const runId=txt(d.runId);
      const {data,error}=await admin.rpc("mv_sync_preview_mapa",{p_run_id:runId});
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="aplicarMapa"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="APLICAR_MAPA_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_apply_mapa",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"APLICAR_MAPA_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="rollbackMapa"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="ROLLBACK_MAPA_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_rollback_mapa",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"ROLLBACK_MAPA_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="previewCto"){
      const runId=txt(d.runId);
      const {data,error}=await admin.rpc("mv_sync_preview_cto",{p_run_id:runId});
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="aplicarCto"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="APLICAR_CTO_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_apply_cto",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"APLICAR_CTO_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="rollbackCto"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="ROLLBACK_CTO_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_rollback_cto",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"ROLLBACK_CTO_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="aplicarAsignacionesCampo"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="APLICAR_ASIGNACIONES_CAMPO_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_apply_asignaciones_campo",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"APLICAR_ASIGNACIONES_CAMPO_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="aplicarActas"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="APLICAR_ACTAS_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_apply_actas",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"APLICAR_ACTAS_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="aplicarDescansos"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="APLICAR_DESCANSOS_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_apply_descansos",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"APLICAR_DESCANSOS_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="aplicarValidacionTecnica"){
      const runId=txt(d.runId);
      if(txt(d.confirmacion)!=="APLICAR_VALIDACION_TECNICA_STAGING")throw new Error("Confirmación explícita requerida.");
      const {data,error}=await admin.rpc("mv_sync_apply_validacion_tecnica",{
        p_run_id:runId,p_actor:u.usuario,p_confirmacion:"APLICAR_VALIDACION_TECNICA_STAGING"
      });
      if(error)throw error;
      return json({...data,version:VERSION});
    }

    if(accion==="cancelarStaging"){
      const runId=txt(d.runId);
      const {error}=await admin.from("migration_sync_runs").update({status:"CANCELLED",notes:txt(d.notes)||"Cancelado desde piloto"}).eq("id",runId).in("status",["STAGING","STAGED","VALIDATED"]);
      if(error)throw error;
      return json({ok:true,version:VERSION,runId,status:"CANCELLED"});
    }

    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Solo Jefatura/i.test(m)?403:400);
  }
});
