import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V2-PLANTILLA-ORDEN-PERMISOS-PROPIOS-20260919";
const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS"
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
function permitidoPerfil(p:unknown){
  return ["TECNICO","SUPERVISOR","JEFATURA","JEFATURA GENERAL","GERENCIA LIMA","JEFATURA OPERACIONES","JEFATURA DE OPERACIONES","OPERACIONES","ADMIN","ADMINISTRADOR"].includes(norm(p));
}
function fecha(v:any){
  if(!v)return "";
  const s=String(v);
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:s;
}
function hora(v:any){
  if(!v)return "";
  const s=String(v);const m=s.match(/(\d{1,2}):(\d{2})/);
  return m?`${m[1].padStart(2,"0")}:${m[2]}`:s;
}
function add(lines:string[],label:string,value:any){
  const t=txt(value);if(t)lines.push(`${label}: ${t}`);
}
function plantilla(o:any){
  const l:string[]=[];
  add(l,"FECHA",fecha(o.fecha_solicitud));
  add(l,"TRAMO",hora(o.hora_solicitud));
  add(l,"CÓDIGO DE ORDEN",o.orden_id);
  add(l,"CÓDIGO DE PEDIDO",o.codigo_pedido_relacion);
  add(l,"CÓDIGO DE CLIENTE",o.codigo_cliente);
  add(l,"TICKET / CÓDIGO DE SEGUIMIENTO",o.codigo_seguimiento);
  add(l,"ESTADO",o.estado);
  add(l,"CUADRILLA",o.cuadrilla);
  l.push("","DATOS DEL CLIENTE");
  add(l,"Cliente",o.cliente);add(l,"Documento",o.numero_documento);
  add(l,"Teléfono móvil",o.telefono_movil);add(l,"Teléfono fijo",o.telefono_fijo);
  add(l,"Dirección",o.direccion);add(l,"Referencia",o.direccion_adicional);add(l,"Región",o.sede);
  if(o.latitud!==null&&o.latitud!==undefined&&o.longitud!==null&&o.longitud!==undefined)l.push(`Coordenadas: ${o.latitud},${o.longitud}`);
  l.push("","DATOS DEL SERVICIO / TRABAJO");
  add(l,"Servicio / origen",o.producto_origen);add(l,"Tipo de trabajo",o.tipo_trabajo);add(l,"Tipo de predio / cliente",o.tipo);
  txt(o.producto_servicio).split("|").map(x=>x.trim()).filter(Boolean).forEach(x=>l.push(x));
  const ctos=[o.cto,o.cto_1,o.cto_2,o.cto_3].map(txt).filter(Boolean);
  const vistos=new Set<string>();const unicos=ctos.filter(x=>{const k=norm(x);if(vistos.has(k))return false;vistos.add(k);return true});
  if(unicos.length||txt(o.puerto)){l.push("","DATOS DE RED");if(unicos.length)l.push("CTO: "+unicos.join(" / "));add(l,"Puerto",o.puerto)}
  const g:string[]=[];
  add(g,"Inicio de visita",o.fecha_inicio_visita);add(g,"Fin de visita",o.fecha_fin_visita);
  add(g,"Motivo de cancelación",o.motivo_cancelacion);add(g,"Motivo de finalización",o.motivo_finalizacion);
  add(g,"Motivo de anulación",o.motivo_anulacion);add(g,"Detalle",o.detalle);
  if(g.length)l.push("","GESTIÓN / RESULTADO",...g);
  return l.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
  if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const h=req.headers.get("Authorization")||"";
  if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users")
    .select("usuario,correo,cuadrilla,sede,perfil,nivel_acceso,estado,usuario_supervisor,nombres_apellidos")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("Usuario MI VISUAL no vinculado.");
  if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario inactivo.");
  if(!permitidoPerfil(u.perfil))throw new Error("No tienes permiso para consultar plantillas de órdenes.");

  const {data:p,error:pe}=await admin.from("app_permissions")
    .select("activo,ver,alcance_datos").eq("perfil",u.perfil).eq("modulo","PLANTILLA ORDEN").maybeSingle();
  if(pe||!p||!p.activo||!p.ver||norm(p.alcance_datos)==="SIN ACCESO")throw new Error("Sin acceso a Plantilla de Orden.");

  let cuadrillas:string[]|null=null;
  if(norm(u.perfil)==="TECNICO"){
    cuadrillas=txt(u.cuadrilla)?[txt(u.cuadrilla)]:[];
  }else if(norm(u.perfil)==="SUPERVISOR"){
    let sup=norm(u.usuario),q=admin.from("app_users").select("cuadrilla,sede").eq("perfil","TECNICO").eq("estado","ACTIVO");
    const nivel=norm(u.nivel_acceso),ref=norm(u.usuario_supervisor);
    if(nivel==="SEDE"&&ref)sup=ref;
    q=q.eq("usuario_supervisor",sup);
    if(nivel==="SEDE"&&txt(u.sede))q=q.eq("sede",u.sede);
    const {data:t,error:te}=await q;if(te)throw te;
    cuadrillas=[...new Set((t||[]).map((x:any)=>txt(x.cuadrilla)).filter(Boolean))];
  }
  return {admin,u,p,cuadrillas};
}
async function input(req:Request){
  if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}
  try{return await req.json()}catch(_){return {}}
}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw new Error(error.message);return data}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req),d=await input(req),accion=txt(d.accion);
    if(accion==="consultarPlantillaOrden"){
      const consulta=txt(d.consulta||d.codigoCliente);
      if(!consulta)throw new Error("Ingrese Código de cliente, DNI, Código de orden o Código de pedido válido.");
      const rows=await rpc(ctx.admin,"mv_plantilla_buscar_ordenes",{p_consulta:consulta,p_cuadrillas:ctx.cuadrillas});
      if(!rows?.length){
        if(norm(ctx.u.perfil)==="TECNICO")throw new Error("No se encontró una orden con ese dato asociada a su cuadrilla.");
        if(norm(ctx.u.perfil)==="SUPERVISOR")throw new Error("No se encontró una orden con ese dato asociada a sus cuadrillas.");
        throw new Error("No se encontró una orden por Código de cliente, DNI, Código de orden o Código de pedido.");
      }
      const o=rows[0];
      return json({ok:true,version:VERSION,modulo:"PLANTILLA_ORDEN",accion:"CONSULTAR",coincidencias:rows.length,criterioBusqueda:o.criterio_busqueda,orden:o,plantilla:plantilla(o),fuente:"POSTGRESQL"});
    }
    if(accion==="buscarCtosCercanasPlantillaOrden"){
      const lat=Number(String(d.latitud??"").replace(",",".")),lng=Number(String(d.longitud??"").replace(",","."));
      if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180)throw new Error("Coordenadas no válidas.");
      const radio=Math.min(Math.max(Number(d.radio)||400,50),1000),limite=Math.min(Math.max(Number(d.limite)||20,1),50);
      const rows=await rpc(ctx.admin,"mv_plantilla_ctos_cercanas",{p_latitud:lat,p_longitud:lng,p_radio:radio,p_limite:limite});
      return json({ok:true,version:VERSION,modulo:"PLANTILLA_ORDEN",accion:"CTO_CERCANAS",radioMetros:radio,totalCoincidencias:rows?.length||0,ctos:(rows||[]).map((x:any)=>({...x,distanciaMetros:x.distancia_metros,ultimaActualizacion:x.ultima_actualizacion,ordenReferencia:x.orden_referencia,codigoCliente:x.codigo_cliente,tipoTrabajo:x.tipo_trabajo,vecesDetectada:x.veces_detectada})),fuente:"POSTGRESQL"});
    }
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,modulo:"PLANTILLA_ORDEN",error:m},/Sesión|vinculado/i.test(m)?401:/permiso|acceso/i.test(m)?403:400);
  }
});