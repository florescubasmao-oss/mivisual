import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V5-LEGACY-SYNC-ASIGNACIONES-20260920";
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
