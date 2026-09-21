import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V1-ADMINISTRACION-CONTROL-20260920";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS"
};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const r=Deno.env.get(name)||"";if(!r)return "";try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
  if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");
  if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();
  if(ue||!ud?.user)throw Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users")
    .select("id,usuario,nombres_apellidos,perfil,sede,estado,auth_user_id")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");
  if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
  const {data:ctx,error:ce}=await admin.rpc("mv_admin_contexto",{p_usuario:u.usuario});
  if(ce)throw Error(ce.message);
  return {admin,u,ctx};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw Error(error.message);return data}

async function catalogoPartidas(c:any,d:any){
  let q=c.admin.from("catalogo_partidas_migracion")
    .select("id,source_row,codigo,tipo_orden,plataforma_orden,puntaje,grupo,monto,estado_tarifa,imported_at")
    .order("source_row",{ascending:true}).limit(500);
  const s=txt(d.buscar);
  if(s)q=q.or(`codigo.ilike.%${s}%,tipo_orden.ilike.%${s}%,plataforma_orden.ilike.%${s}%,grupo.ilike.%${s}%`);
  if(txt(d.plataforma))q=q.eq("plataforma_orden",norm(d.plataforma));
  if(txt(d.grupo))q=q.eq("grupo",norm(d.grupo));
  const {data,error}=await q;if(error)throw error;
  return data||[];
}
async function listarPermisos(c:any,d:any){
  let q=c.admin.from("app_permissions").select("*").order("perfil").order("orden_menu").order("modulo").limit(1000);
  if(txt(d.perfil))q=q.eq("perfil",norm(d.perfil));
  if(txt(d.modulo))q=q.eq("modulo",norm(d.modulo));
  const {data,error}=await q;if(error)throw error;return data||[];
}
async function listarUsuarios(c:any,d:any){
  let q=c.admin.from("app_users")
    .select("id,usuario,correo,cuadrilla,sede,plataforma,perfil,nivel_acceso,estado,usuario_supervisor,nombres_apellidos,tiene_unidad,placa_unidad,frecuencia_combustible,facturas_activo,auth_user_id")
    .order("sede").order("perfil").order("usuario").limit(500);
  if(txt(d.perfil))q=q.eq("perfil",norm(d.perfil));
  if(txt(d.sede))q=q.eq("sede",norm(d.sede));
  if(txt(d.estado))q=q.eq("estado",norm(d.estado));
  const {data,error}=await q;if(error)throw error;
  const s=norm(d.buscar);
  return (data||[]).filter((x:any)=>{
    if(!s)return true;
    return norm([x.usuario,x.correo,x.cuadrilla,x.sede,x.plataforma,x.perfil,x.nombres_apellidos].join(" ")).includes(s);
  }).map((x:any)=>({...x,authVinculado:!!x.auth_user_id,auth_user_id:undefined}));
}
async function rankingConfig(c:any){
  const [{data:hist,error:he},{data:motor,error:me}]=await Promise.all([
    c.admin.from("ranking_configuracion_productiva_snapshot").select("*").order("periodo"),
    c.admin.from("ranking_configuracion_motor").select("*").order("periodo")
  ]);
  if(he)throw he;if(me)throw me;
  const map=new Map<string,any>();
  for(const x of hist||[])map.set(x.periodo,{...x,fuente:"SNAPSHOT_PRODUCTIVO",editable:false,proteccion:x.periodo<"2026-09"?"HISTORICO_PROTEGIDO":""});
  for(const x of motor||[])map.set(x.periodo,{...x,fuente:"MOTOR_POSTGRES",editable:x.periodo>="2026-09",proteccion:x.periodo<"2026-09"?"HISTORICO_PROTEGIDO":""});
  return [...map.values()].sort((a,b)=>String(a.periodo).localeCompare(String(b.periodo)));
}
async function catalogs(c:any){
  const {data:p,error}=await c.admin.from("app_permissions").select("perfil,modulo,alcance_datos,vista_perfil");
  if(error)throw error;
  const uniq=(a:any[])=>[...new Set(a.filter(Boolean).map(x=>String(x)))].sort();
  return {
    perfiles:uniq((p||[]).map((x:any)=>x.perfil)),
    modulos:uniq((p||[]).map((x:any)=>x.modulo)),
    alcances:uniq((p||[]).map((x:any)=>x.alcance_datos)),
    vistas:uniq((p||[]).map((x:any)=>x.vista_perfil))
  };
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const c=await context(req),d=await input(req),a=txt(d.accion);
    if(a==="contextoAdministracion")return json({ok:true,version:VERSION,contexto:c.ctx,catalogos:await catalogs(c),fuente:"POSTGRESQL"});
    if(a==="listarCatalogoPartidas"){const rows=await catalogoPartidas(c,d);return json({ok:true,version:VERSION,registros:rows.length,lista:rows})}
    if(a==="listarPermisos"){const rows=await listarPermisos(c,d);return json({ok:true,version:VERSION,registros:rows.length,lista:rows})}
    if(a==="actualizarPermiso"){
      const data={...(d.data||{})};
      const x=await rpc(c.admin,"mv_admin_actualizar_permiso",{p_usuario:c.u.usuario,p_permiso_id:Number(d.id),p_data:data});
      return json({...x,version:VERSION});
    }
    if(a==="listarRankingConfig"){const rows=await rankingConfig(c);return json({ok:true,version:VERSION,lista:rows})}
    if(a==="guardarRankingConfig"){
      const x=await rpc(c.admin,"mv_admin_guardar_ranking_config",{
        p_usuario:c.u.usuario,p_periodo:txt(d.periodo),
        p_produccion:Number(d.produccion),p_efectividad:Number(d.efectividad),
        p_sla:Number(d.sla),p_observaciones:Number(d.observaciones),
        p_recableado:Number(d.recableado),p_vtrgar:Number(d.vtrgar)
      });
      return json({...x,version:VERSION});
    }
    if(a==="listarUsuariosOperativos"){const rows=await listarUsuarios(c,d);return json({ok:true,version:VERSION,registros:rows.length,lista:rows})}
    if(a==="actualizarUsuarioOperativo"){
      const data={...(d.data||{})};
      const x=await rpc(c.admin,"mv_admin_actualizar_usuario",{p_usuario:c.u.usuario,p_target_id:Number(d.id),p_data:data});
      return json({...x,version:VERSION});
    }
    if(a==="listarEventosAdministracion"){
      const {data,error}=await c.admin.from("administracion_eventos_migracion")
        .select("id,actor_usuario,actor_perfil,evento,entidad,entidad_id,creado_at")
        .order("creado_at",{ascending:false}).limit(100);
      if(error)throw error;return json({ok:true,version:VERSION,lista:data||[]});
    }
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin permiso|administraci/i.test(m)?403:400);
  }
});