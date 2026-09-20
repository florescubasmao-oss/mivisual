import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V2-MI-VISUAL-SHELL-20260920";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, OPTIONS",
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

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
    if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
    const h=req.headers.get("Authorization")||"";
    if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");

    const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:ud,error:ue}=await auth.auth.getUser();
    if(ue||!ud?.user)throw new Error("Sesión no válida.");

    const {data:u,error}=await admin.from("app_users")
      .select("usuario,nombres_apellidos,perfil,sede,cuadrilla,estado,supervisor,auth_user_id")
      .eq("auth_user_id",ud.user.id).maybeSingle();
    if(error||!u)throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
    if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario MI VISUAL inactivo.");

    const {data:p,error:pe}=await admin.from("app_permissions")
      .select("modulo,activo,orden_menu,mostrar_modulo,ver,registrar,editar,observar,aprobar,validar,descargar,administrar,alcance_datos,vista_perfil")
      .eq("perfil",u.perfil)
      .order("orden_menu",{ascending:true,nullsFirst:false});
    if(pe)throw pe;

    const permisos=(p||[]).map((x:any)=>({
      modulo:norm(x.modulo),
      activo:!!x.activo,
      ordenMenu:x.orden_menu,
      mostrarModulo:!!x.mostrar_modulo,
      ver:!!x.ver,
      registrar:!!x.registrar,
      editar:!!x.editar,
      observar:!!x.observar,
      aprobar:!!x.aprobar,
      validar:!!x.validar,
      descargar:!!x.descargar,
      administrar:!!x.administrar,
      alcanceDatos:txt(x.alcance_datos),
      vistaPerfil:txt(x.vista_perfil)
    }));

    return json({
      ok:true,version:VERSION,
      usuario:{
        usuario:u.usuario,
        nombre:u.nombres_apellidos,
        perfil:norm(u.perfil),
        sede:txt(u.sede),
        cuadrilla:txt(u.cuadrilla),
        supervisor:txt(u.supervisor)
      },
      permisos,
      arquitectura:"AUTH_EDGE_POSTGRESQL",
      reglaMenu:"ACTIVO && MOSTRAR_MODULO && VER && ALCANCE_DATOS != SIN ACCESO"
    });
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,error:m},/Sesión|Auth|vinculado/i.test(m)?401:403);
  }
});