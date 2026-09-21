import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V3-ACTAS-LISTADO-COMPLETO-20260921";
const MODULO="ACTAS ESCANEADAS";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function envKey(name:string,legacy?:string){
  const direct=Deno.env.get(legacy||name);if(direct)return direct;
  const raw=Deno.env.get(name)||"";if(!raw)return "";
  try{const p=JSON.parse(raw);return p?.default||Object.values(p||{})[0]||""}catch(_){return raw}
}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function scopeKind(v:unknown){
  const a=norm(v);
  if(a.includes("CUADRILLA")||a==="PERSONAL")return "CUADRILLA";
  if(a==="SEDE"||a.includes("SEDE"))return "SEDE";
  return "ZONA";
}
async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
  if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const h=req.headers.get("Authorization")||"";
  if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();
  if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users")
    .select("usuario,nombres_apellidos,perfil,sede,cuadrilla,estado,auth_user_id")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("Usuario Auth no vinculado a MI VISUAL.");
  if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario MI VISUAL inactivo.");
  const {data:p,error:pe}=await admin.from("app_permissions")
    .select("activo,mostrar_modulo,ver,registrar,editar,observar,aprobar,validar,descargar,administrar,alcance_datos")
    .eq("perfil",u.perfil).eq("modulo",MODULO).maybeSingle();
  if(pe||!p||!p.activo||!p.mostrar_modulo||!p.ver)throw new Error("Sin acceso a Gestión de Actas.");
  return {admin,u,p};
}
async function input(req:Request){
  if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}
  try{return await req.json()}catch(_){return {}}
}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw new Error(error.message);return data}
function nextMonth(periodo:string){
  const [y,m]=periodo.split("-").map(Number);const d=new Date(Date.UTC(y,m,1));return d.toISOString().slice(0,10);
}
function applyScope(q:any,ctx:any){
  const perfil=norm(ctx.u.perfil),k=scopeKind(ctx.p.alcance_datos);
  if(perfil==="TECNICO"||k==="CUADRILLA"){
    if(!txt(ctx.u.cuadrilla))throw new Error("Usuario sin cuadrilla configurada.");
    return q.eq("cuadrilla",ctx.u.cuadrilla);
  }
  if(["SUPERVISOR","ALMACEN"].includes(perfil)||k==="SEDE"){
    if(!txt(ctx.u.sede))throw new Error("Usuario sin sede configurada.");
    return q.eq("sede",norm(ctx.u.sede));
  }
  return q;
}
async function listar(ctx:any,d:any){
  let q=ctx.admin.from("actas_migracion")
    .select("id,legacy_id,registrado_at,sede,cuadrilla,supervisor,tecnico,fecha_gestion,tipo_ejecucion,tipo_partida,codigo_orden,codigo_pedido,numero_acta,dni,cliente,nombre_archivo,link_acta,drive_file_id,archivo_storage_backend,archivo_storage_ref,estado,resultado_almacen,motivo_almacen,validado_almacen_por,validado_almacen_at,resultado_jefatura,motivo_jefatura,validado_jefatura_por,validado_jefatura_at,version,estado_entrega_fisica,confirmado_fisico_por,confirmado_fisico_at,origen_registro,motivo_acta_faltante,estado_fecha_carpeta,fecha_limite_verificacion,fecha_carpeta,fecha_confirmada_por,perfil_confirmacion_fecha,origen_fecha_carpeta,updated_at",{count:"exact"})
    .order("registrado_at",{ascending:false}).limit(5000);
  q=applyScope(q,ctx);
  const periodo=txt(d.periodo);
  if(/^20\d{2}-\d{2}$/.test(periodo)){
    q=q.gte("fecha_gestion",periodo+"-01").lt("fecha_gestion",nextMonth(periodo));
  }
  const estado=norm(d.estado);if(estado)q=q.eq("estado",estado);
  const sede=norm(d.sede);if(sede&&scopeKind(ctx.p.alcance_datos)==="ZONA")q=q.eq("sede",sede);
  const codigo=txt(d.codigo).replace(/[^0-9A-Za-z-]/g,"");
  if(codigo)q=q.or(`codigo_orden.ilike.%${codigo}%,codigo_pedido.ilike.%${codigo}%,numero_acta.ilike.%${codigo}%,dni.ilike.%${codigo}%`);
  const {data,error,count}=await q;if(error)throw error;
  const rows=data||[];
  return {ok:true,version:VERSION,registros:rows.length,totalCoincidencias:count??rows.length,truncado:(count??rows.length)>rows.length,limiteConsulta:5000,lista:rows,
    resumen:{
      pendientes:rows.filter((x:any)=>norm(x.estado)==="PENDIENTE").length,
      finalizadas:rows.filter((x:any)=>norm(x.estado)==="FINALIZADO").length,
      observadas:rows.filter((x:any)=>norm(x.resultado_almacen)==="OBSERVADO"||norm(x.resultado_jefatura)==="OBSERVADO").length,
      entregaPendiente:rows.filter((x:any)=>norm(x.estado_entrega_fisica)!=="ENTREGADA").length,
      fechaPorConfirmar:rows.filter((x:any)=>norm(x.estado_fecha_carpeta)==="REQUIERE_CONFIRMACION").length
    },fuente:"POSTGRESQL PILOTO"};
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const ctx=await context(req),d=await input(req),accion=txt(d.accion);
    if(accion==="contextoActas")return json({ok:true,version:VERSION,usuario:ctx.u,permiso:ctx.p,fuente:"POSTGRESQL PILOTO",archivos:{historicos:"GOOGLE DRIVE",nuevos:"SUPABASE STORAGE PRIVADO"}});
    if(accion==="listarActas")return json(await listar(ctx,d));
    if(accion==="resolverMapaActa"){
      const data=await rpc(ctx.admin,"mv_actas_resolver_mapa_v344",{p_codigo_orden:txt(d.codigoOrden),p_codigo_pedido:txt(d.codigoPedido),p_cuadrilla:txt(d.cuadrilla||ctx.u.cuadrilla)});
      return json({ok:true,version:VERSION,lista:data||[]});
    }
    if(accion==="registrarActaPdfStorage"){
      if(!ctx.p.registrar)throw new Error("Sin permiso para registrar Actas.");
      const data=await rpc(ctx.admin,"mv_actas_registrar_storage_v1",{
        p_usuario:ctx.u.usuario,
        p_codigo_orden:txt(d.codigoOrden),
        p_codigo_pedido:txt(d.codigoPedido),
        p_numero_acta:txt(d.numeroActa),
        p_nombre_archivo:txt(d.nombreArchivo),
        p_storage_ref:txt(d.storageRef)
      });
      return json({...data,version:VERSION});
    }
    if(accion==="registrarFaltanteActa"){
      const data=await rpc(ctx.admin,"mv_actas_registrar_faltante_v344",{
        p_usuario:ctx.u.usuario,p_cuadrilla:txt(d.cuadrilla),p_fecha_gestion:txt(d.fechaGestion),
        p_tipo_ejecucion:txt(d.tipoEjecucion),p_tipo_partida:txt(d.tipoPartida),
        p_codigo_orden:txt(d.codigoOrden),p_codigo_pedido:txt(d.codigoPedido),
        p_numero_acta:txt(d.numeroActa),p_motivo:txt(d.motivo)
      }); return json({...data,version:VERSION});
    }
    if(accion==="validarActa"){
      const data=await rpc(ctx.admin,"mv_actas_validar_v344",{p_usuario:ctx.u.usuario,p_acta_id:txt(d.id),p_resultado:txt(d.resultado),p_motivo:txt(d.motivo)||null});
      return json({...data,version:VERSION});
    }
    if(accion==="entregaFisicaActa"){
      const data=await rpc(ctx.admin,"mv_actas_entrega_fisica_v344",{p_usuario:ctx.u.usuario,p_acta_id:txt(d.id),p_estado:txt(d.estado),p_motivo:txt(d.motivo)||null});
      return json({...data,version:VERSION});
    }
    if(accion==="confirmarFechaActa"){
      const data=await rpc(ctx.admin,"mv_actas_confirmar_fecha_v344",{p_usuario:ctx.u.usuario,p_acta_id:txt(d.id),p_fecha_gestion:txt(d.fechaGestion)});
      return json({...data,version:VERSION});
    }
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin acceso|Solo |permiso/i.test(m)?403:400);
  }
});