import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VERSION="V1-FACTURAS-INTEGRADO-20260920",MODULO="FACTURAS",BUCKET="mi-visual-evidencias";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function safe(v:unknown){return norm(v).replace(/[^A-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)||"SIN-DATO"}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const r=Deno.env.get(name)||"";if(!r)return "";try{const p=JSON.parse(r);return p?.default||Object.values(p||{})[0]||""}catch(_){return r}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function decode(raw:string){const value=raw.replace(/^data:[^;]+;base64,/i,"").replace(/\s+/g,"");let b="";try{b=atob(value)}catch(_){throw Error("Imagen base64 inválida.")}if(b.length>10*1024*1024)throw Error("La imagen supera 10 MB.");const bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);return bytes}
async function context(req:Request){
 const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey(),h=req.headers.get("Authorization")||"";
 if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");if(!h.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
 const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw Error("Sesión no válida.");
 const {data:u,error}=await admin.from("app_users").select("usuario,nombres_apellidos,perfil,sede,cuadrilla,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
 if(error||!u)throw Error("Usuario Auth no vinculado a MI VISUAL.");if(norm(u.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
 const {data:p,error:pe}=await admin.from("app_permissions").select("*").eq("perfil",u.perfil).eq("modulo",MODULO).maybeSingle();
 if(pe||!p||!p.activo||!p.mostrar_modulo||!p.ver)throw Error("Sin acceso a Facturas.");
 return {admin,u,p};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
async function rpc(a:any,f:string,args:any){const {data,error}=await a.rpc(f,args);if(error)throw Error(error.message);return data}
async function upload(admin:any,ctx:any,pendienteId:string,archivo:any){
 const mime=txt(archivo?.mime).toLowerCase();if(!["image/jpeg","image/png","image/webp"].includes(mime))throw Error("Solo imágenes JPEG/PNG/WEBP.");
 const bytes=decode(txt(archivo?.base64));const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
 const path=["facturas",safe(ctx.u.sede),safe(ctx.u.usuario),safe(pendienteId),crypto.randomUUID()+"."+ext].join("/");
 const {data,error}=await admin.storage.from(BUCKET).upload(path,bytes,{contentType:mime,cacheControl:"3600",upsert:false});if(error)throw error;
 return {path:data.path,storageRef:`storage://${BUCKET}/${data.path}`,nombreArchivo:txt(archivo?.nombre)||("factura."+ext)};
}
function storagePath(ref:string){const p=`storage://${BUCKET}/`;return ref.startsWith(p)?ref.slice(p.length):ref}
async function signed(admin:any,ref:string){const p=storagePath(ref);const {data,error}=await admin.storage.from(BUCKET).createSignedUrl(p,900);if(error)return "";return data.signedUrl}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const c=await context(req),d=await input(req),a=txt(d.accion);
  if(a==="obtenerContextoFacturas"){
    const x=await rpc(c.admin,"mv_facturas_contexto",{p_usuario:c.u.usuario,p_periodo:txt(d.periodoMes)||null});
    return json({...x,version:VERSION});
  }
  if(a==="crearPendienteFactura"){
    const x=await rpc(c.admin,"mv_facturas_crear_pendiente",{p_actor:c.u.usuario,p_usuario_responsable:txt(d.usuarioResponsable),p_fecha_desde:txt(d.fechaDesde),p_fecha_hasta:txt(d.fechaHasta),p_observacion:txt(d.observacion)});
    return json({...x,version:VERSION});
  }
  if(a==="obtenerDetalleFactura"){
    const x=await rpc(c.admin,"mv_facturas_detalle",{p_usuario:c.u.usuario,p_id:txt(d.id)});
    for(const item of x.detalles||[]){if(item.storageRef)item.url=await signed(c.admin,item.storageRef)}
    return json({...x,version:VERSION});
  }
  if(a==="presentarFacturas"){
    const id=txt(d.id),facturas=Array.isArray(d.facturas)?d.facturas:[];if(!id||!facturas.length)throw Error("Pendiente y facturas obligatorios.");
    const uploaded:any[]=[];
    try{
      for(const f of facturas){
        const up=await upload(c.admin,c,id,f);
        uploaded.push({...f,storageRef:up.storageRef,nombreArchivo:up.nombreArchivo,_path:up.path});
      }
      const payload=uploaded.map(({_path,...x})=>x);
      const x=await rpc(c.admin,"mv_facturas_presentar",{p_actor:c.u.usuario,p_id:id,p_facturas:payload});
      return json({...x,version:VERSION});
    }catch(e){
      if(uploaded.length)await c.admin.storage.from(BUCKET).remove(uploaded.map(x=>x._path));
      throw e;
    }
  }
  if(a==="observarDetalleFactura"){
    const x=await rpc(c.admin,"mv_facturas_observar_detalle",{p_actor:c.u.usuario,p_detalle_id:txt(d.idDetalle),p_observacion:txt(d.observacion)});
    return json({...x,version:VERSION});
  }
  if(a==="aprobarPresentacionFacturas"){
    const x=await rpc(c.admin,"mv_facturas_aprobar_presentacion",{p_actor:c.u.usuario,p_id:txt(d.id)});
    return json({...x,version:VERSION});
  }
  return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
 }catch(e){const m=e instanceof Error?e.message:String(e);return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:/Sin acceso|Solo |fuera de su alcance|no tiene acceso/i.test(m)?403:400)}
});