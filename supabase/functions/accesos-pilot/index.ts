import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// MI VISUAL - Accesos v53 fix Jefatura

function normalizarDestinoAcceso(valor){
  return (valor || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function leerFilaCSV(linea){
  const resultado = [];
  let actual = "";
  let entreComillas = false;

  for(let i = 0; i < linea.length; i++){
    const caracter = linea[i];
    const siguiente = linea[i + 1];

    if(caracter === '"' && entreComillas && siguiente === '"'){
      actual += '"';
      i++;
    } else if(caracter === '"'){
      entreComillas = !entreComillas;
    } else if(caracter === ',' && !entreComillas){
      resultado.push(actual);
      actual = "";
    } else {
      actual += caracter;
    }
  }

  resultado.push(actual);
  return resultado.map(x => x.trim());
}

function esPerfilJefaturaAcceso(perfil, usuario){
  const p = normalizarDestinoAcceso(perfil);
  const u = normalizarDestinoAcceso(usuario);
  return p.includes("JEFATURA") ||
         p.includes("ADMIN") ||
         p.includes("ADMINISTRADOR") ||
         u.startsWith("JEF");
}

function accesoVisiblePorDestino(destino, sede, cuadrilla, perfilUsuario, usuarioApp){
  const destinoNormalizado = normalizarDestinoAcceso(destino);
  const sedeNormalizada = normalizarDestinoAcceso(sede);
  const cuadrillaNormalizada = normalizarDestinoAcceso(cuadrilla);

  if(!destinoNormalizado) return false;

  // Jefatura/Admin tiene alcance Zona Norte.
  // No debe bloquearse por sede "TODAS" frente a destinos CHICLAYO,PIURA,TRUJILLO.
  if(esPerfilJefaturaAcceso(perfilUsuario, usuarioApp)){
    return true;
  }

  if(destinoNormalizado === "TODOS") return true;

  const destinosPermitidos = destinoNormalizado
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  return destinosPermitidos.includes(sedeNormalizada) ||
         destinosPermitidos.includes(cuadrillaNormalizada);
}

function accesoVisiblePorPerfil(perfilDestino, perfilUsuario, usuarioApp){
  const perfilDestinoNormalizado = normalizarDestinoAcceso(perfilDestino);
  const perfilUsuarioNormalizado = normalizarDestinoAcceso(perfilUsuario);

  if(!perfilDestinoNormalizado) return false;
  if(perfilDestinoNormalizado === "TODOS") return true;

  const perfilesPermitidos = perfilDestinoNormalizado
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  // Regla especial: usuario Jefatura/Admin.
  // Debe ver accesos con perfil JEFATURA/ADMIN y también los que indiquen SUPERVISOR,JEFATURA.
  if(esPerfilJefaturaAcceso(perfilUsuarioNormalizado, usuarioApp)){
    return perfilesPermitidos.includes("JEFATURA") ||
           perfilesPermitidos.includes("ADMIN") ||
           perfilesPermitidos.includes("ADMINISTRADOR") ||
           perfilDestinoNormalizado.includes("JEFATURA");
  }

  return perfilesPermitidos.includes(perfilUsuarioNormalizado);
}



const CERTIFICACIONES=[
    {
      nombre:"Examen de Seguridad",
      modulo:"MÓDULO 1",
      icono:"🛡️",
      link:"https://forms.cloud.microsoft/r/Aipf21LSuj"
    },
    {
      nombre:"Examen de Lineamientos",
      modulo:"MÓDULO 2",
      icono:"📋",
      link:"https://forms.cloud.microsoft/r/kZeZUUAgac"
    },
    {
      nombre:"Examen de Protocolos",
      modulo:"MÓDULO 3",
      icono:"🧭",
      link:"https://forms.cloud.microsoft/r/LQfnve4sVw"
    },
    {
      nombre:"Examen de Aplicativos",
      modulo:"MÓDULO 4",
      icono:"💻",
      link:"https://forms.cloud.microsoft/r/WuCY8CxCsv"
    },
    {
      nombre:"Certificación Unificada",
      modulo:"EVALUACIÓN INTEGRAL",
      icono:"🏆",
      destacado:true,
      link:"https://forms.cloud.microsoft/pages/responsepage.aspx?id=B1bL-kMKCUSswbHiafr3qJwY5T47pQtCtqjGvrus3WhUM1pJUkw4QUFGNU1WUUg0S0Q2N0ZVRlRFTi4u&route=shorturl"
    }
  ];
const SIMULACRO={nombre:"SIMULACRO DE CERTIFICACIÓN",link:"https://forms.gle/ieoFrBWSdaRyb7ydA"};
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS","Cache-Control":"no-store"};
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
function validLink(value){try{return ["https:","http:"].includes(new URL(value).protocol)}catch{return false}}
function visible(row,user){return Boolean(row.nombre.trim()&&row.link.trim())&&validLink(row.link)&&accesoVisiblePorDestino(row.destino,user.sede,user.cuadrilla,user.perfil,user.usuario)&&accesoVisiblePorPerfil(row.perfil,user.perfil,user.usuario)}
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
 const {data:permission,error:permissionError}=await admin.from("app_permissions").select("activo,ver,alcance_datos").eq("perfil",user.perfil).eq("modulo","ACCESOS").maybeSingle();
 if(permissionError)throw Error("permission query");
 if(!permission?.activo||!permission.ver||normalizarDestinoAcceso(permission.alcance_datos)==="SIN ACCESO")return respond({ok:false,error:"Sin permiso para Accesos."},403);
 const {data:rows,error:rowsError}=await admin.from("accesos_catalogo_migracion").select("source_row,id_legacy,destino,perfil,nombre,link").order("source_row");
 if(rowsError)throw Error("catalog query");
 const recursos=(rows||[]).filter(row=>visible(row,user)).map(row=>({id:row.id_legacy,nombre:row.nombre,link:row.link}));
 return respond({ok:true,version:"V1-ACCESOS-PILOT",perfil:user.perfil,recursos,certificaciones:CERTIFICACIONES,simulacro:SIMULACRO});
 }catch{return respond({ok:false,error:"No se pudo consultar Accesos. Reintenta."},500)}
});
