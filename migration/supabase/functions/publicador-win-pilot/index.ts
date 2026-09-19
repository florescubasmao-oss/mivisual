import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V1-PUBLICADOR-WIN-V497-PILOT-20260919";
const CONFIRMACION="PUBLICAR_V487_CONFIRMADO";
const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
};

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}});
}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){
  const direct=Deno.env.get(legacy||name);if(direct)return direct;
  const raw=Deno.env.get(name)||"";if(!raw)return "";
  try{const p=JSON.parse(raw);return p?.default||Object.values(p||{})[0]||""}catch(_){return raw}
}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
  if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const authHeader=req.headers.get("Authorization")||"";
  if(!authHeader.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();
  if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users")
    .select("usuario,nombres_apellidos,perfil,sede,estado,auth_user_id")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
  if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario MI VISUAL inactivo.");
  return {admin,u};
}
async function input(req:Request){
  if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}
  try{return await req.json()}catch(_){return {}}
}
async function rpc(admin:any,fn:string,args:any={}){
  const {data,error}=await admin.rpc(fn,args);if(error)throw new Error(error.message);return data;
}
function puedePublicar(perfil:unknown){
  return ["JEFATURA","JEFATURA GENERAL"].includes(norm(perfil));
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req),data=await input(req),accion=txt(data.accion);
    const periodo=txt(data.periodo);

    if(accion==="estadoPublicadorIndicadoresWinV487"){
      const {data:ult,error}=await ctx.admin.from("mv_publicador_win_ultima_v497")
        .select("id,periodo,version,estado,publicado_por,publicado_at,corte_estado,ultima_importacion,resumen")
        .order("periodo",{ascending:false});
      if(error)throw error;
      return json({
        ok:true,version:VERSION,modulo:"V497_PUBLICADOR_WIN",
        escrituraCompilada:true,periodoMinimo:"2026-08",
        julio2026Congelado:true,reconstruyeSoloPeriodo:true,rollbackAutomatico:true,
        estrategiaVtrGar:"Conservar validaciones existentes y agregar solo incidencias WIN nuevas como PENDIENTE",
        usuario:{usuario:ctx.u.usuario,perfil:ctx.u.perfil},
        puedePublicar:puedePublicar(ctx.u.perfil),
        publicaciones:ult||[],
        fuente:"POSTGRESQL PILOTO"
      });
    }

    if(accion==="previsualizarPublicacionIndicadoresWinV487"){
      const d=await rpc(ctx.admin,"mv_publicador_win_preview_v497",{p_periodo:periodo});
      return json({...d,version:VERSION,modulo:"V497_PUBLICADOR_WIN",calculadoPor:ctx.u.usuario,fuentePiloto:"POSTGRESQL"});
    }

    if(accion==="publicarIndicadoresWinV487"){
      if(!puedePublicar(ctx.u.perfil))throw new Error("Solo Jefatura puede publicar indicadores WIN.");
      if(txt(data.confirmacion)!==CONFIRMACION)throw new Error("Falta confirmación explícita para publicar.");
      const d=await rpc(ctx.admin,"mv_publicador_win_publicar_v497",{
        p_periodo:periodo,p_usuario:ctx.u.usuario,p_confirmacion:CONFIRMACION
      });
      return json({...d,version:VERSION,modulo:"V497_PUBLICADOR_WIN",fuentePiloto:"POSTGRESQL"});
    }

    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,modulo:"V497_PUBLICADOR_WIN",error:m},/Sesión|Auth/i.test(m)?401:/Solo Jefatura/i.test(m)?403:400);
  }
});