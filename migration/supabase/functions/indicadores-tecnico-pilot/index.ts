import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V1-INDICADORES-TECNICO-20260920";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, OPTIONS"
};

function json(x:unknown,status=200){
  return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){
  return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}
function normKey(v:unknown){
  return txt(v).toUpperCase()
    .replace(/[Áá]/g,"A").replace(/[Éé]/g,"E").replace(/[Íí]/g,"I")
    .replace(/[Óó]/g,"O").replace(/[ÚúÜü]/g,"U").replace(/[Ññ]/g,"N")
    .replace(/[^A-Z0-9]+/g,"");
}
function envKey(name:string,legacy?:string){
  const d=Deno.env.get(legacy||name);if(d)return d;
  const r=Deno.env.get(name)||"";if(!r)return "";
  try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}
}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}

const CFG:any={
  PRODUCCION:{
    modulo:"PRODUCCION",
    view:"mv_dashboard_produccion_detalle",
    freshness:["MAPA_OPERATIVO","PRODUCCION","VALIDACION_TECNICA"]
  },
  EFECTIVIDAD:{
    modulo:"EFECTIVIDAD",
    view:"mv_dashboard_efectividad_detalle",
    freshness:["MAPA_OPERATIVO","EFECTIVIDAD"]
  },
  RECABLEADO:{
    modulo:"PORCENTAJE RECABLEADO",
    view:"mv_dashboard_recableado_detalle",
    freshness:["MAPA_OPERATIVO","RECABLEADO"]
  },
  VTRGAR:{
    modulo:"VTR GAR",
    view:"mv_dashboard_vtrgar_detalle",
    freshness:["MAPA_OPERATIVO","VTR_GAR","VALIDACION_TECNICA"]
  }
};

async function ctx(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
  if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");
  if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");

  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});

  const {data:ud,error:ue}=await auth.auth.getUser();
  if(ue||!ud?.user)throw Error("Sesión no válida.");

  const {data:u,error}=await admin.from("app_users")
    .select("usuario,nombres_apellidos,perfil,sede,plataforma,cuadrilla,estado,auth_user_id")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");
  if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
  if(norm(u.perfil)!=="TECNICO")throw Error("Este API es exclusivo para perfil Técnico.");
  if(!txt(u.cuadrilla))throw Error("Usuario Técnico sin cuadrilla asociada.");

  return {admin,u};
}

async function permiso(c:any,tipo:string){
  const cfg=CFG[tipo];if(!cfg)throw Error("Indicador no soportado.");
  const {data:p,error}=await c.admin.from("app_permissions")
    .select("modulo,activo,mostrar_modulo,ver,alcance_datos")
    .eq("perfil",c.u.perfil).eq("modulo",cfg.modulo).maybeSingle();
  if(error)throw error;
  if(!p||!p.activo||!p.mostrar_modulo||!p.ver)throw Error("Sin acceso a "+cfg.modulo+".");
  if(norm(p.alcance_datos)!=="CUADRILLA")throw Error("Alcance de permiso inválido para Técnico.");
  return p;
}

async function periods(admin:any){
  const {data,error}=await admin.from("mv_dashboard_produccion_detalle").select("periodo").order("periodo",{ascending:false});
  if(error)throw error;
  return [...new Set((data||[]).map((x:any)=>txt(x.periodo)).filter(Boolean))];
}

async function freshness(admin:any,mods:string[]){
  const {data,error}=await admin.from("mv_migration_live_source_status")
    .select("modulo,status,requires_final_resync,sheet_rows,postgres_rows,content_match,last_audit_at")
    .in("modulo",mods);
  if(error)return [];
  return data||[];
}

async function resumen(c:any,d:any){
  const tipo=norm(d.tipo).replace(/[^A-Z]/g,"");
  const cfg=CFG[tipo];if(!cfg)throw Error("Indicador no soportado.");
  const p=await permiso(c,tipo);
  const periodo=/^20\d{2}-\d{2}$/.test(txt(d.periodo))?txt(d.periodo):"2026-09";

  const {data,error}=await c.admin.from(cfg.view).select("*").eq("periodo",periodo);
  if(error)throw error;

  const crewKey=normKey(c.u.cuadrilla);
  const rows=(data||[]).filter((x:any)=>normKey(x.cuadrilla)===crewKey);
  const row=rows[0]||null;

  return {
    ok:true,version:VERSION,tipo,periodo,
    usuario:{
      usuario:c.u.usuario,nombre:c.u.nombres_apellidos||c.u.usuario,
      sede:c.u.sede||"",plataforma:c.u.plataforma||"",cuadrilla:c.u.cuadrilla
    },
    permiso:p,
    resumen:row,
    freshness:await freshness(c.admin,cfg.freshness),
    fuente:"POSTGRESQL PILOTO"
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const c=await ctx(req);
    const u=new URL(req.url),d=Object.fromEntries(u.searchParams.entries()),a=txt(d.accion);
    if(a==="contexto"){
      return json({ok:true,version:VERSION,usuario:c.u,periodos:await periods(c.admin)});
    }
    if(a==="resumen"){
      return json(await resumen(c,d));
    }
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,error:m},
      /Sesión|Auth|vinculado/i.test(m)?401:/exclusivo|Sin acceso|Alcance|sin cuadrilla/i.test(m)?403:400);
  }
});