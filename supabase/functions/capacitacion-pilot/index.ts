import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// MI VISUAL - Capacitación v53 fix Jefatura

function normalizarDestinoAcceso(valor){return String(valor||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function categoriaCapacitacion(nombre,tipo){
 const n=normalizarDestinoAcceso(nombre),t=normalizarDestinoAcceso(tipo);
 if(n.includes('EVALU')||n.includes('EXAMEN'))return '📝 Evaluaciones';
 if(n.includes('CERTIFIC')||n.includes('RESULT'))return '🏆 Certificaciones';
 if(t.includes('VIDEO'))return '🎥 Videos';
 if(t.includes('PDF')||t.includes('PPT'))return '📚 Cursos y Materiales';
 return '🎓 Capacitaciones';
}
function recurso(row){const nombre=row.nombre.replace(/"/g,'').trim(),link=row.link.replace(/"/g,'').trim(),tipo=row.tipo.replace(/"/g,'').trim();if(!nombre||!link||!validLink(link))return null;return {id:row.id_legacy,nombre,tipo,link,categoria:categoriaCapacitacion(nombre,tipo)}}
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS","Cache-Control":"no-store"};
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
function validLink(value){try{return ["https:","http:"].includes(new URL(value).protocol)}catch{return false}}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="GET")return respond({ok:false,error:"Solo consulta GET."},405);
 try{
 const authorization=req.headers.get("Authorization")||"";
 if(!/^Bearer\s+\S+/i.test(authorization))return respond({ok:false,error:"Sesión requerida."},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!secret)throw Error("config");
 const auth=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await auth.auth.getUser();
 if(authError||!identity?.user)return respond({ok:false,error:"Sesión no válida."},401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:user,error:userError}=await admin.from("app_users").select("usuario,perfil,sede,cuadrilla,estado").eq("auth_user_id",identity.user.id).maybeSingle();
 if(userError)throw Error("user query");
 if(!user||normalizarDestinoAcceso(user.estado)!=="ACTIVO")return respond({ok:false,error:"Usuario no vinculado o inactivo."},403);
 const {data:permission,error:permissionError}=await admin.from("app_permissions").select("activo,ver,alcance_datos").eq("perfil",user.perfil).eq("modulo","CAPACITACION").maybeSingle();
 if(permissionError)throw Error("permission query");
 if(!permission?.activo||!permission.ver||normalizarDestinoAcceso(permission.alcance_datos)==="SIN ACCESO")return respond({ok:false,error:"Sin permiso para Capacitación."},403);
 const {data:rows,error:rowsError}=await admin.from("capacitacion_catalogo_migracion").select("source_row,id_legacy,nombre,tipo,link").order("source_row");
 if(rowsError)throw Error("catalog query");
 const recursos=(rows||[]).map(recurso).filter(Boolean);
 return respond({ok:true,version:"V1-CAPACITACION-PILOT",perfil:user.perfil,recursos,misFunciones:normalizarDestinoAcceso(user.perfil)==="TECNICO"});
 }catch{return respond({ok:false,error:"No se pudo consultar Capacitación. Reintenta."},500)}
});

