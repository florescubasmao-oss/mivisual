import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION="V2-ACTIVIDAD-CAMPO-INTEGRADO-20260920",MODULO="ACTIVIDAD CAMPO";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
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
 const {data:u,error}=await admin.from("app_users").select("usuario,nombres_apellidos,perfil,sede,cuadrilla,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
 if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
 const {data:p,error:pe}=await admin.from("app_permissions").select("activo,mostrar_modulo,ver,registrar,editar,observar,aprobar,validar,descargar,administrar,alcance_datos").eq("perfil",u.perfil).eq("modulo",MODULO).maybeSingle();
 if(pe||!p||!p.activo||!p.mostrar_modulo||!p.ver)throw Error("Sin acceso a Actividad en Campo.");
 return {admin,u,p};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
async function rpc(a:any,f:string,args:any){const {data,error}=await a.rpc(f,args);if(error)throw Error(error.message);return data}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const c=await context(req),d=await input(req),a=txt(d.accion);
  if(a==="contextoActividadCampo"){
    const q=await rpc(c.admin,"mv_actividad_listar_cuadrillas",{p_usuario:c.u.usuario});
    return json({ok:true,version:VERSION,usuario:c.u,permiso:c.p,cuadrillas:q?.cuadrillas||[],fuente:"POSTGRESQL PILOTO"});
  }
  if(a==="listarActividadCampo"||a==="resumenActividadCampo"){
    const filtros={...(d.filtros||{})};
    const periodo=txt(filtros.periodo);
    if(/^20\d{2}-\d{2}$/.test(periodo)){
      const [y,m]=periodo.split("-").map(Number);
      const next=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
      filtros.fechaDesde=periodo+"-01";
      const nd=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
      filtros.fechaHasta=nd;
      delete filtros.periodo;
    }
    const fn=a==="listarActividadCampo"?"mv_actividad_listar":"mv_actividad_resumen";
    const x=await rpc(c.admin,fn,{p_usuario:c.u.usuario,p_filtros:filtros});
    return json({...x,version:VERSION,fuente:"POSTGRESQL PILOTO"});
  }
  if(a==="buscarDatosAuditoriaCampo"){
    const x=await rpc(c.admin,"mv_actividad_buscar_datos_auditoria",{p_usuario:c.u.usuario,p_codigo:txt(d.codigoPedido||d.codigo),p_cuadrilla:txt(d.cuadrilla)});
    return json({...x,version:VERSION});
  }
  if(a==="registrarActividadCampo"){
    if(!c.p.registrar)throw Error("Sin permiso para registrar.");
    const data={...d};delete data.accion;delete data.usuario;
    const x=await rpc(c.admin,"mv_actividad_registrar",{p_usuario:c.u.usuario,p_data:data});
    return json({...x,version:VERSION});
  }
  return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
 }catch(e){const m=e instanceof Error?e.message:String(e);return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin acceso|Sin permiso|Solo /i.test(m)?403:400)}
});