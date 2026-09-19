import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V1-AJUSTES-PARTIDA-V502-V503-PILOT-20260919";
const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS"
};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){const direct=Deno.env.get(legacy||name);if(direct)return direct;const raw=Deno.env.get(name)||"";if(!raw)return "";try{const p=JSON.parse(raw);return p?.default||Object.values(p||{})[0]||""}catch(_){return raw}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function esJefatura(p:unknown){return ["JEFATURA","JEFATURA GENERAL"].includes(norm(p))}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
  if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const h=req.headers.get("Authorization")||"";
  if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users").select("usuario,perfil,sede,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("Usuario MI VISUAL no vinculado.");
  if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario inactivo.");
  if(!esJefatura(u.perfil))throw new Error("Solo Jefatura puede gestionar ajustes de partida WIN.");
  return {admin,u};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw new Error(error.message);return data}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req),d=await input(req),accion=txt(d.accion);
    if(accion==="listarAjustesPartidaWinV502"){
      const periodo=/^20\d{2}-(0[1-9]|1[0-2])$/.test(txt(d.periodo))?txt(d.periodo):new Date().toISOString().slice(0,7);
      const {data:propuestas,error:pe}=await ctx.admin.from("mv_ajustes_partida_propuestas_v502").select("*").eq("periodo",periodo).order("fecha",{ascending:true});
      if(pe)throw pe;
      const {data:todos,error:te}=await ctx.admin.from("mv_ajustes_partida_todos_v502").select("*").eq("periodo",periodo).order("fecha_validacion",{ascending:false,nullsFirst:false}).order("fecha_solicitud",{ascending:false});
      if(te)throw te;
      const rows=todos||[];
      const vigentes:any[]=[];const seen=new Set<string>();
      for(const x of rows){if(["VALIDADO","APROBADO"].includes(norm(x.estado))&&!seen.has(x.orden_id)){seen.add(x.orden_id);vigentes.push(x)}}
      return json({
        ok:true,version:VERSION,modulo:"V502_AJUSTES_PARTIDA",periodo,
        propuestasPartner:propuestas||[],
        pendientes:rows.filter((x:any)=>norm(x.estado)==="PENDIENTE"),
        validados:vigentes,
        rechazados:rows.filter((x:any)=>norm(x.estado)==="RECHAZADO"),
        regla:"Partner propone; Jefatura valida; solo IR ↔ IC; ajuste validado tiene prioridad sobre la partida calculada WIN.",
        fuente:"POSTGRESQL PILOTO"
      });
    }
    if(accion==="validarAjustePartidaWinV502"){
      const res=await rpc(ctx.admin,"mv_ajuste_partida_validar_v502",{
        p_orden_id:txt(d.ordenId),
        p_partida_propuesta:txt(d.partidaPropuesta),
        p_usuario:ctx.u.usuario,
        p_motivo:txt(d.motivo)||null
      });
      return json({...res,version:VERSION,modulo:"V502_AJUSTES_PARTIDA",fuente:"POSTGRESQL PILOTO"});
    }
    if(accion==="rechazarAjustePartidaWinV502"){
      const res=await rpc(ctx.admin,"mv_ajuste_partida_rechazar_v502",{
        p_orden_id:txt(d.ordenId),
        p_partida_propuesta:txt(d.partidaPropuesta)||null,
        p_usuario:ctx.u.usuario,
        p_motivo:txt(d.motivo)||null,
        p_observacion:txt(d.observacion)||null
      });
      return json({...res,version:VERSION,modulo:"V502_AJUSTES_PARTIDA",fuente:"POSTGRESQL PILOTO"});
    }
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,modulo:"V502_AJUSTES_PARTIDA",error:m},/Sesión|vinculado/i.test(m)?401:/Solo Jefatura/i.test(m)?403:400);
  }
});