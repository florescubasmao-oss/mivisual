import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION="V1-BASE-OPERATIVA-STAGING-20260920";
const MODULO="ADMINISTRACION";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const r=Deno.env.get(name)||"";if(!r)return "";try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function context(req:Request){
 const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
 if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");
 if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
 const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw Error("Sesión no válida.");
 const {data:u,error}=await admin.from("app_users").select("id,usuario,nombres_apellidos,perfil,sede,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
 if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");
 if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
 const {data:p,error:pe}=await admin.from("app_permissions").select("activo,ver,administrar,alcance_datos").eq("perfil",u.perfil).eq("modulo",MODULO).maybeSingle();
 if(pe||!p||!p.activo||!p.ver||!p.administrar)throw Error("Sin permiso para administrar Base Operativa.");
 return {admin,u,p};
}
async function input(req:Request){try{return req.method==="GET"?Object.fromEntries(new URL(req.url).searchParams.entries()):await req.json()}catch(_){return {}}}
function cleanRow(r:any){
 return {
   fecha:txt(r?.fecha),cuadrilla:txt(r?.cuadrilla),estado:txt(r?.estado),
   tipoTrabajo:txt(r?.tipoTrabajo??r?.tipo_trabajo),
   numeroDocumento:txt(r?.numeroDocumento??r?.numero_documento),
   cliente:txt(r?.cliente),sede:txt(r?.sede),
   codigoPedido:txt(r?.codigoPedido??r?.codigo_pedido),
   ticket:txt(r?.ticket),
   codigoLiquidacion:txt(r?.codigoLiquidacion??r?.codigo_liquidacion),
   tipoAtencion:txt(r?.tipoAtencion??r?.tipo_atencion),
   tipoPartida:txt(r?.tipoPartida??r?.tipo_partida),
   tipoPartidaAlterna:txt(r?.tipoPartidaAlterna??r?.tipo_partida_alterna)
 };
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const c=await context(req),d:any=await input(req),a=txt(d.accion);
  if(a==="estado"){
    const {data,error}=await c.admin.from("migration_sync_runs").select("id,source_name,source_rows,staged_rows,status,created_by,created_at,validated_at,notes").eq("modulo","BASE_OPERATIVA").order("created_at",{ascending:false}).limit(20);
    if(error)throw error;return json({ok:true,version:VERSION,registros:(data||[]).length,cargas:data||[]});
  }
  if(a==="iniciarCarga"){
    const archivo=txt(d.archivo)||"BASE_OPERATIVA";
    const total=Number(d.sourceRows||0);
    if(!Number.isInteger(total)||total<1||total>30000)throw Error("Cantidad de filas inválida.");
    const {data,error}=await c.admin.from("migration_sync_runs").insert({
      modulo:"BASE_OPERATIVA",source_name:archivo,source_rows:total,staged_rows:0,applied_rows:0,
      status:"STAGING",created_by:c.u.usuario,notes:"Carga iniciada desde piloto integrado. Sin aplicación operativa."
    }).select("id,source_name,source_rows,status,created_at").single();
    if(error)throw error;return json({ok:true,version:VERSION,carga:data});
  }
  if(a==="cargarBloque"){
    const runId=txt(d.runId),rows=Array.isArray(d.registros)?d.registros:[];
    if(!runId||!rows.length)throw Error("runId y registros son obligatorios.");
    if(rows.length>800)throw Error("Máximo 800 filas por bloque.");
    const {data:run,error:re}=await c.admin.from("migration_sync_runs").select("id,status,source_rows,created_by").eq("id",runId).eq("modulo","BASE_OPERATIVA").maybeSingle();
    if(re||!run)throw Error("Carga no encontrada.");
    if(run.status!=="STAGING")throw Error("La carga ya no admite bloques.");
    if(run.created_by!==c.u.usuario)throw Error("La carga pertenece a otro usuario.");
    const payload=[];
    for(const item of rows){
      const sourceRow=Number(item?.sourceRow);
      if(!Number.isInteger(sourceRow)||sourceRow<1)throw Error("Cada fila debe tener sourceRow válido.");
      const row=cleanRow(item);
      const raw=JSON.stringify(row);
      payload.push({run_id:runId,source_key:String(sourceRow),source_row:sourceRow,row_hash:await sha256(raw),row_data:row});
    }
    const {error}=await c.admin.from("migration_sync_staging").upsert(payload,{onConflict:"run_id,source_key"});if(error)throw error;
    const {count,error:ce}=await c.admin.from("migration_sync_staging").select("*",{count:"exact",head:true}).eq("run_id",runId);if(ce)throw ce;
    const staged=Number(count||0);
    if(staged>Number(run.source_rows||0))throw Error("La carga recibió más filas que las declaradas.");
    await c.admin.from("migration_sync_runs").update({staged_rows:staged}).eq("id",runId);
    return json({ok:true,version:VERSION,runId,stagedRows:staged,sourceRows:run.source_rows,completo:staged===Number(run.source_rows)});
  }
  if(a==="previsualizarCarga"){
    const runId=txt(d.runId);if(!runId)throw Error("runId obligatorio.");
    const {data:run,error:re}=await c.admin.from("migration_sync_runs").select("id,status,source_rows,staged_rows,created_by").eq("id",runId).eq("modulo","BASE_OPERATIVA").maybeSingle();
    if(re||!run)throw Error("Carga no encontrada.");
    if(run.created_by!==c.u.usuario)throw Error("La carga pertenece a otro usuario.");
    const {count,error:ce}=await c.admin.from("migration_sync_staging").select("*",{count:"exact",head:true}).eq("run_id",runId);if(ce)throw ce;
    const staged=Number(count||0);
    if(staged!==Number(run.source_rows||0))throw Error(`Carga incompleta: esperadas ${run.source_rows}, recibidas ${staged}`);
    if(run.status==="STAGING"){
      const {error:ue}=await c.admin.from("migration_sync_runs").update({status:"STAGED",staged_rows:staged,notes:"Carga completa; en previsualización. No aplicada."}).eq("id",runId);
      if(ue)throw ue;
    }
    const {data,error}=await c.admin.rpc("mv_base_operativa_preview_staging",{p_run_id:runId,p_actor:c.u.usuario});if(error)throw error;
    return json({...data,version:VERSION});
  }
  if(a==="cancelarCarga"){
    const runId=txt(d.runId);if(!runId)throw Error("runId obligatorio.");
    const {data:run,error:re}=await c.admin.from("migration_sync_runs").select("id,status,created_by").eq("id",runId).eq("modulo","BASE_OPERATIVA").maybeSingle();
    if(re||!run)throw Error("Carga no encontrada.");
    if(run.created_by!==c.u.usuario)throw Error("La carga pertenece a otro usuario.");
    if(run.status==="APPLIED")throw Error("Una carga aplicada no puede cancelarse.");
    await c.admin.from("migration_sync_staging").delete().eq("run_id",runId);
    const {error}=await c.admin.from("migration_sync_runs").update({status:"CANCELLED",staged_rows:0,notes:"Carga cancelada por el usuario. Sin aplicación operativa."}).eq("id",runId);if(error)throw error;
    return json({ok:true,version:VERSION,runId,mensaje:"Carga cancelada. No se modificó información operativa."});
  }
  return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
 }catch(e){
   const m=e instanceof Error?e.message:String(e);
   return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin permiso|pertenece a otro/i.test(m)?403:400);
 }
});