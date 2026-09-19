import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "V1-CONTINUIDAD-CUADRILLAS-V496-PILOT-20260919";
const MODULO = "CONTINUIDAD CUADRILLAS";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
function txt(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) {
  return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function envKey(name: string, legacy?: string) {
  const direct = Deno.env.get(legacy || name);
  if (direct) return direct;
  const raw = Deno.env.get(name);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) { return raw; }
}
function publicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || envKey("SUPABASE_PUBLISHABLE_KEYS");
}
function secretKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || envKey("SUPABASE_SECRET_KEYS");
}
function fechaIso(v: unknown) {
  const s = txt(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  throw new Error("Fecha efectiva no válida. Use DD/MM/YYYY o YYYY-MM-DD.");
}
function periodoFechaIso(v: string) { return v.slice(0,7); }

async function context(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const pub = publicKey(), sec = secretKey();
  if (!url || !pub || !sec) throw new Error("Configuración Supabase incompleta.");

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) throw new Error("Sesión requerida.");

  const auth = createClient(url, pub, {
    global:{headers:{Authorization:authHeader}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const admin = createClient(url, sec, {auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue} = await auth.auth.getUser();
  if (ue || !ud?.user) throw new Error("Sesión no válida.");

  const {data:appUser,error:ae} = await admin.from("app_users")
    .select("usuario,correo,perfil,sede,cuadrilla,estado,nombres_apellidos,auth_user_id")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if (ae || !appUser) throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
  if (norm(appUser.estado)!=="ACTIVO") throw new Error("Usuario MI VISUAL inactivo.");

  const {data:perm,error:pe} = await admin.from("app_permissions")
    .select("perfil,modulo,activo,mostrar_modulo,ver,registrar,validar,descargar,alcance_datos")
    .eq("perfil",appUser.perfil).eq("modulo",MODULO).maybeSingle();
  if (pe || !perm || !perm.activo || !perm.ver) throw new Error("Sin acceso a Continuidad de Cuadrillas.");

  return {admin,appUser,perm,authUser:ud.user};
}

async function input(req: Request) {
  if (req.method==="GET") {
    const out:any={}; const u=new URL(req.url);
    u.searchParams.forEach((v,k)=>out[k]=v); return out;
  }
  try { return await req.json(); } catch (_) { return {}; }
}

async function contextoAccion(ctx:any) {
  const perfil=norm(ctx.appUser.perfil);
  return {
    ok:true,version:VERSION,modulo:"CONTINUIDAD_CUADRILLAS",
    usuario:{usuario:ctx.appUser.usuario,perfil:ctx.appUser.perfil,sede:ctx.appUser.sede},
    permiso:{ver:!!ctx.perm.ver,administrar:!!ctx.perm.registrar,alcance:ctx.perm.alcance_datos},
    reglas:{
      soloJefatura:true,
      perfilesAdministran:["JEFATURA","JEFATURA GENERAL"],
      historicoNoSeReescribe:true,
      aplicaDesdeMesFechaEfectiva:true,
      loginNoCambia:true,
      rankingDashboardConsolidados:true
    },
    fuente:"POSTGRESQL PILOTO"
  };
}

async function listar(ctx:any) {
  const {data,error}=await ctx.admin.from("mv_continuidad_cuadrillas_v496")
    .select("id,source_row,cuadrilla_anterior,cuadrilla_nueva,fecha_efectiva,periodo_efectivo,motivo,estado,creado_por,fecha_registro,fuente")
    .order("fecha_efectiva",{ascending:true})
    .order("source_row",{ascending:true,nullsFirst:false});
  if(error) throw error;
  return {ok:true,version:VERSION,modulo:"CONTINUIDAD_CUADRILLAS",registros:data?.length||0,lista:data||[],fuente:"POSTGRESQL PILOTO"};
}

async function guardar(ctx:any,data:any) {
  const perfil=norm(ctx.appUser.perfil);
  if(!["JEFATURA","JEFATURA GENERAL"].includes(perfil)) {
    throw new Error("Solo Jefatura puede administrar la continuidad de cuadrillas.");
  }
  if(!ctx.perm.registrar) throw new Error("Jefatura no tiene habilitado ADMINISTRAR/REGISTRAR en Continuidad Cuadrillas.");

  const anterior=txt(data.cuadrillaAnterior||data.cuadrilla_anterior);
  const nueva=txt(data.cuadrillaNueva||data.cuadrilla_nueva);
  const fecha=fechaIso(data.fechaEfectiva||data.fecha_efectiva);
  const motivo=txt(data.motivo)||"CAMBIO DE NOMENCLATURA / CONTINUIDAD";
  if(!anterior||!nueva) throw new Error("Debe indicar cuadrilla anterior y cuadrilla nueva.");

  const {data:res,error}=await ctx.admin.rpc("mv_continuidad_guardar_v496",{
    p_anterior:anterior,p_nueva:nueva,p_fecha:fecha,p_motivo:motivo,p_creado_por:ctx.appUser.usuario
  });
  if(error) throw error;

  const periodo=periodoFechaIso(fecha);
  const {data:periodos,error:pe}=await ctx.admin.from("ranking_configuracion_motor")
    .select("periodo").eq("estado","ACTIVO").gte("periodo",periodo);
  if(pe) throw pe;

  const refrescos:any[]=[];
  for(const p of periodos||[]) {
    const pr=String(p.periodo||"");
    const {data:r1,error:e1}=await ctx.admin.rpc("mv_dashboard_refrescar_ranking_cache",{p_periodo:pr});
    if(e1) throw e1;
    const {data:r2,error:e2}=await ctx.admin.rpc("mv_dashboard_refrescar_cumplimiento_cache",{p_periodo:pr});
    if(e2) throw e2;
    refrescos.push({periodo:pr,ranking:r1,cumplimiento:r2});
  }

  return {ok:true,version:VERSION,modulo:"CONTINUIDAD_CUADRILLAS",...res,refrescos,fuente:"POSTGRESQL PILOTO"};
}

Deno.serve(async (req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req);
    const data=await input(req);
    const accion=txt(data.accion);
    if(accion==="contextoContinuidadCuadrillas") return json(await contextoAccion(ctx));
    if(accion==="listarContinuidadCuadrillas") return json(await listar(ctx));
    if(accion==="guardarContinuidadCuadrilla") return json(await guardar(ctx,data));
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    return json({ok:false,version:VERSION,error:e instanceof Error?e.message:String(e)},400);
  }
});
