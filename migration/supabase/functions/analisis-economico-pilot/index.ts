import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION="V2-ANALISIS-ECONOMICO-INTEGRADO-20260920",MODULO="ANALISIS ECONOMICO";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const r=Deno.env.get(name)||"";if(!r)return "";try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
async function context(req:Request){
 const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
 if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
 const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw Error("Sesión no válida.");
 const {data:u,error}=await admin.from("app_users").select("usuario,nombres_apellidos,perfil,sede,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
 if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
 const {data:p,error:pe}=await admin.from("app_permissions").select("*").eq("perfil",u.perfil).eq("modulo",MODULO).maybeSingle();
 if(pe||!p||!p.activo||!p.mostrar_modulo||!p.ver)throw Error("Sin acceso a Análisis Económico.");
 return {admin,u,p};
}
async function fresh(admin:any){
 const {data}=await admin.from("mv_migration_live_source_status").select("modulo,status,requires_final_resync,sheet_rows,postgres_rows,content_match,last_audit_at")
 .in("modulo",["ANALISIS_ECONOMICO","MATERIALES","UTILIDAD_CUADRILLA","PRODUCCION","OBSERVACIONES"]);
 return data||[];
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const c=await context(req),q=Object.fromEntries(new URL(req.url).searchParams.entries()),a=txt(q.accion),periodo=/^20\d{2}-\d{2}$/.test(txt(q.periodo))?txt(q.periodo):"2026-09";
  if(a==="contextoEconomico")return json({ok:true,version:VERSION,usuario:c.u,permiso:c.p,freshness:await fresh(c.admin),fuente:"POSTGRESQL PILOTO"});
  if(a==="resumenEconomico"){
    const {data:pp,error:ppe}=await c.admin.from("produccion_periodos").select("periodo,estado,protegido,motivo").eq("periodo",periodo).maybeSingle();if(ppe)throw ppe;
    const {data,error}=await c.admin.from("mv_economico_resumen_periodo").select("*").eq("periodo",periodo).maybeSingle();if(error)throw error;
    const {data:conc,error:ce}=await c.admin.from("mv_economico_conciliacion_periodo").select("*").eq("periodo",periodo).maybeSingle();if(ce)throw ce;
    return json({
      ok:true,version:VERSION,periodo,resumen:data||null,conciliacion:conc||null,
      periodoEstado:pp||null,
      detalleCuadrillaAutoritativo:!pp?.protegido,
      advertencia:pp?.protegido
        ?"Periodo protegido: el resumen está congelado. El detalle monetario por cuadrilla no se expone hasta contar con snapshot inmutable por cuadrilla."
        :"Periodo activo: detalle calculado por el motor PostgreSQL actual.",
      freshness:await fresh(c.admin),fuente:pp?.protegido?"SNAPSHOT PROTEGIDO":"POSTGRESQL PILOTO"
    });
  }
  if(a==="utilidadEconomica"){
    const {data:pp,error:ppe}=await c.admin.from("produccion_periodos").select("protegido,estado,motivo").eq("periodo",periodo).maybeSingle();if(ppe)throw ppe;
    if(pp?.protegido){
      return json({
        ok:true,version:VERSION,periodo,lista:[],detalleCuadrillaAutoritativo:false,
        advertencia:"Detalle monetario por cuadrilla bloqueado para periodo protegido hasta disponer de snapshot inmutable.",
        fuente:"SNAPSHOT PROTEGIDO"
      });
    }
    let rq=c.admin.from("mv_economico_utilidad_migracion").select("*").eq("periodo",periodo).order("sede").order("cuadrilla");
    const sede=norm(q.sede);if(sede&&sede!=="TODAS")rq=rq.eq("sede",sede);
    const {data,error}=await rq;if(error)throw error;return json({ok:true,version:VERSION,periodo,lista:data||[],detalleCuadrillaAutoritativo:true,fuente:"POSTGRESQL PILOTO"});
  }
  if(a==="materialesEconomicos"){
    let rq=c.admin.from("mv_economico_materiales_cuadrilla").select("*").eq("periodo",periodo).order("materiales",{ascending:false});
    const sede=norm(q.sede);if(sede&&sede!=="TODAS")rq=rq.eq("sede",sede);
    const {data,error}=await rq;if(error)throw error;return json({ok:true,version:VERSION,periodo,lista:data||[],fuente:"POSTGRESQL PILOTO"});
  }
  return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
 }catch(e){const m=e instanceof Error?e.message:String(e);return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin acceso/i.test(m)?403:400)}
});