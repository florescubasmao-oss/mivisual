import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION="V1-RANKING-DASHBOARD-INTEGRADO-20260920";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const r=Deno.env.get(name)||"";if(!r)return "";try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function scopeKind(v:unknown){const a=norm(v);if(a.includes("CUADRILLA")||a==="PERSONAL")return "CUADRILLA";if(a==="SEDE"||a.includes("SEDE"))return "SEDE";return "ZONA"}
async function ctx(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
  if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users").select("usuario,nombres_apellidos,perfil,sede,cuadrilla,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
  const {data:p,error:pe}=await admin.from("app_permissions")
    .select("modulo,activo,mostrar_modulo,ver,descargar,alcance_datos")
    .eq("perfil",u.perfil).in("modulo",["RANKING","DASHBOARD JEFATURA","DASHBOARD SUPERVISOR"]);
  if(pe)throw pe;
  const perms=p||[];
  return {admin,u,perms};
}
function perm(ctx:any,kind:"RANKING"|"DASHBOARD"){
  const p=kind==="RANKING"
    ? ctx.perms.find((x:any)=>x.modulo==="RANKING"&&x.activo&&x.mostrar_modulo&&x.ver)
    : ctx.perms.find((x:any)=>x.modulo.startsWith("DASHBOARD ")&&x.activo&&x.mostrar_modulo&&x.ver);
  if(!p)throw Error("Sin acceso a "+(kind==="RANKING"?"Ranking":"Dashboard")+".");
  return p;
}
function applyScope(q:any,ctx:any,p:any){
  const k=scopeKind(p.alcance_datos),perfil=norm(ctx.u.perfil);
  if(perfil==="TECNICO"||k==="CUADRILLA"){if(!txt(ctx.u.cuadrilla))throw Error("Usuario sin cuadrilla.");return q.eq("cuadrilla",ctx.u.cuadrilla)}
  if(perfil==="SUPERVISOR"||k==="SEDE"){if(!txt(ctx.u.sede))throw Error("Usuario sin sede.");return q.eq("sede",norm(ctx.u.sede))}
  return q;
}
async function freshness(admin:any){
  const mods=["MAPA_OPERATIVO","PRODUCCION","EFECTIVIDAD","RECABLEADO","OBSERVACIONES","VALIDACION_TECNICA","PROGRAMACION_DESCANSOS","CONFIGURACION_RANKING","PARAMETROS_SLA"];
  const {data,error}=await admin.from("mv_migration_live_source_status").select("modulo,status,requires_final_resync,sheet_rows,postgres_rows,content_match,last_audit_at").in("modulo",mods);
  if(error)return [];
  return data||[];
}
async function listarRanking(ctx:any,d:any){
  const p=perm(ctx,"RANKING"),periodo=/^20\d{2}-\d{2}$/.test(txt(d.periodo))?txt(d.periodo):"2026-09";
  let q=ctx.admin.from("mv_ranking_migracion").select("*").eq("periodo",periodo).order("puesto_region",{ascending:true});
  q=applyScope(q,ctx,p);const {data,error}=await q;if(error)throw error;
  return {ok:true,version:VERSION,periodo,usuario:ctx.u,permiso:p,lista:data||[],freshness:await freshness(ctx.admin),fuente:"POSTGRESQL PILOTO"};
}
async function listarDashboard(ctx:any,d:any){
  const p=perm(ctx,"DASHBOARD"),periodo=/^20\d{2}-\d{2}$/.test(txt(d.periodo))?txt(d.periodo):"2026-09";
  let q=ctx.admin.from("mv_dashboard_migracion").select("*").eq("periodo",periodo).order("puesto_region",{ascending:true});
  q=applyScope(q,ctx,p);const {data,error}=await q;if(error)throw error;
  const rows=data||[];
  const sum=(k:string)=>rows.reduce((a:number,x:any)=>a+Number(x[k]||0),0);
  const avg=(k:string)=>rows.length?rows.reduce((a:number,x:any)=>a+Number(x[k]||0),0)/rows.length:0;
  return {ok:true,version:VERSION,periodo,usuario:ctx.u,permiso:p,lista:rows,resumen:{
    cuadrillas:rows.length,produccion:sum("produccion"),efectividadProm:avg("efectividad"),recableadoProm:avg("recableado"),
    vtrgarProm:avg("vtrgar"),observaciones:sum("observaciones"),montoAfectado:sum("monto_afectado_obs"),slaProm:avg("sla_ajustado")
  },freshness:await freshness(ctx.admin),fuente:"POSTGRESQL PILOTO"};
}
async function detalle(ctx:any,d:any){
  const p=perm(ctx,"DASHBOARD"),periodo=txt(d.periodo),cuadrilla=txt(d.cuadrilla),tipo=norm(d.tipo);
  if(!/^20\d{2}-\d{2}$/.test(periodo)||!cuadrilla)throw Error("Periodo y cuadrilla obligatorios.");
  const views:any={
    PRODUCCION:"mv_dashboard_produccion_detalle",EFECTIVIDAD:"mv_dashboard_efectividad_detalle",
    RECABLEADO:"mv_dashboard_recableado_detalle","VTR/GAR":"mv_dashboard_vtrgar_detalle",
    VTRGAR:"mv_dashboard_vtrgar_detalle",OBSERVACIONES:"mv_dashboard_observaciones_detalle",SLA:"mv_dashboard_sla_detalle"
  };
  const view=views[tipo];if(!view)throw Error("Detalle no soportado.");
  let gate=ctx.admin.from("mv_dashboard_migracion").select("cuadrilla,sede").eq("periodo",periodo).eq("cuadrilla",cuadrilla);
  gate=applyScope(gate,ctx,p);const {data:g,error:ge}=await gate.limit(1);if(ge)throw ge;if(!g?.length)throw Error("Cuadrilla fuera de su alcance.");
  const {data,error}=await ctx.admin.from(view).select("*").eq("periodo",periodo).eq("cuadrilla",cuadrilla).maybeSingle();if(error)throw error;
  return {ok:true,version:VERSION,tipo,detalle:data||null};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
   const c=await ctx(req),u=new URL(req.url),d=Object.fromEntries(u.searchParams.entries()),a=txt(d.accion);
   if(a==="listarRanking")return json(await listarRanking(c,d));
   if(a==="listarDashboard")return json(await listarDashboard(c,d));
   if(a==="detalleDashboard")return json(await detalle(c,d));
   return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
 }catch(e){const m=e instanceof Error?e.message:String(e);return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin acceso|fuera de su alcance/i.test(m)?403:400)}
});