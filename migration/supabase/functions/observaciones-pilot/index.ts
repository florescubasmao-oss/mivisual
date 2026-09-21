import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION="V2-OBSERVACIONES-EVIDENCIAS-20260920",MODULO="OBSERVACIONES";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const r=Deno.env.get(name)||"";if(!r)return "";try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function scopeKind(v:unknown){const a=norm(v);if(a.includes("CUADRILLA")||a==="PERSONAL")return "CUADRILLA";if(a==="SEDE"||a.includes("SEDE"))return "SEDE";return "ZONA"}
async function context(req:Request){
 const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
 if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
 const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw Error("Sesión no válida.");
 const {data:u,error}=await admin.from("app_users").select("usuario,nombres_apellidos,perfil,sede,cuadrilla,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
 if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
 const {data:p,error:pe}=await admin.from("app_permissions").select("activo,mostrar_modulo,ver,registrar,editar,observar,descargar,alcance_datos").eq("perfil",u.perfil).eq("modulo",MODULO).maybeSingle();
 if(pe||!p||!p.activo||!p.mostrar_modulo||!p.ver)throw Error("Sin acceso a Observaciones.");
 return {admin,u,p};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
function applyScope(q:any,c:any){const k=scopeKind(c.p.alcance_datos),p=norm(c.u.perfil);if(p==="TECNICO"||k==="CUADRILLA"){if(!txt(c.u.cuadrilla))throw Error("Usuario sin cuadrilla.");return q.eq("cuadrilla",c.u.cuadrilla)}if(p==="SUPERVISOR"||k==="SEDE"){if(!txt(c.u.sede))throw Error("Usuario sin sede.");return q.eq("sede",norm(c.u.sede))}return q}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw Error(error.message);return data}
async function listar(c:any,d:any){
 let q=c.admin.from("observaciones_migracion").select("*").order("fecha_registro",{ascending:false}).limit(500);q=applyScope(q,c);
 const periodo=txt(d.periodo);if(/^20\d{2}-\d{2}$/.test(periodo))q=q.eq("periodo",periodo);
 const estado=norm(d.estado);if(estado)q=q.eq("estado",estado);
 const sede=norm(d.sede);if(sede&&scopeKind(c.p.alcance_datos)==="ZONA")q=q.eq("sede",sede);
 const buscar=txt(d.buscar);if(buscar)q=q.or(`codigo_ticket.ilike.%${buscar}%,descripcion.ilike.%${buscar}%,cuadrilla.ilike.%${buscar}%`);
 const {data,error}=await q;if(error)throw error;const rows=data||[],ids=rows.map((x:any)=>x.id);
 let ev:any[]=[];if(ids.length){const {data:e,error:ee}=await c.admin.from("observaciones_evidencias_migracion").select("observacion_id,orden,url,drive_file_id,storage_backend,storage_ref").in("observacion_id",ids).order("orden");if(!ee)ev=e||[]}
 const lista=rows.map((x:any)=>({...x,evidencias:ev.filter((e:any)=>e.observacion_id===x.id)}));
 const affected=(x:any)=>Number(x.monto||0)*(["SUBSANADO","ANULADO"].includes(norm(x.estado))?.2:1);
 return {ok:true,version:VERSION,lista,resumen:{registros:rows.length,montoTotal:rows.reduce((a:number,x:any)=>a+Number(x.monto||0),0),montoAfectado:rows.reduce((a:number,x:any)=>a+affected(x),0),penalizadas:rows.filter((x:any)=>norm(x.estado)==="PENALIZADO").length,subsanadas:rows.filter((x:any)=>norm(x.estado)==="SUBSANADO").length},fuente:"POSTGRESQL PILOTO"};
}
async function cuadrillas(c:any){
 let q=c.admin.from("app_users").select("cuadrilla,sede,plataforma,usuario,estado,perfil").eq("perfil","TECNICO").eq("estado","ACTIVO").not("cuadrilla","is",null).order("sede").order("cuadrilla");
 if(norm(c.u.perfil)==="SUPERVISOR")q=q.eq("sede",c.u.sede);
 const {data,error}=await q;if(error)throw error;const seen=new Set(),out=[];for(const x of data||[]){const k=norm(x.cuadrilla);if(!k||seen.has(k))continue;seen.add(k);out.push(x)}return out;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const c=await context(req),d=await input(req),a=txt(d.accion);
  if(a==="contextoObservaciones")return json({ok:true,version:VERSION,usuario:c.u,permiso:c.p,cuadrillas:await cuadrillas(c),evidencias:{historicos:"GOOGLE DRIVE",nuevos:"SUPABASE STORAGE PRIVADO",maximo:5},fuente:"POSTGRESQL PILOTO"});
  if(a==="listarObservaciones")return json(await listar(c,d));
  if(a==="registrarObservacion"){if(!c.p.registrar)throw Error("Sin permiso para registrar.");const x=await rpc(c.admin,"mv_observaciones_registrar",{p_usuario:c.u.usuario,p_cuadrilla:txt(d.cuadrilla),p_fuente:txt(d.fuente),p_codigo_ticket:txt(d.codigoTicket),p_tipo_observacion:txt(d.tipoObservacion),p_descripcion:txt(d.descripcion),p_estado:txt(d.estado)||"DERIVADO",p_monto:Number(d.monto||0),p_id_solicitud:txt(d.idSolicitud)||null});return json({...x,version:VERSION})}
  if(a==="actualizarEstadoObservacion"){if(!c.p.editar)throw Error("Sin permiso para editar.");const x=await rpc(c.admin,"mv_observaciones_actualizar_estado",{p_usuario:c.u.usuario,p_observacion_id:txt(d.id),p_estado:txt(d.estado),p_monto:d.monto===""||d.monto==null?null:Number(d.monto)});return json({...x,version:VERSION})}
  if(a==="registrarDescargoObservacion"){if(!c.p.observar&&norm(c.u.perfil)!=="TECNICO")throw Error("Sin permiso para descargo.");const x=await rpc(c.admin,"mv_observaciones_registrar_descargo",{p_usuario:c.u.usuario,p_observacion_id:txt(d.id),p_descargo:txt(d.descargo),p_evidencias:Array.isArray(d.evidencias)?d.evidencias:[]});return json({...x,version:VERSION})}
  return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
 }catch(e){const m=e instanceof Error?e.message:String(e);return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin acceso|Sin permiso|Solo |No tienes permiso/i.test(m)?403:400)}
});