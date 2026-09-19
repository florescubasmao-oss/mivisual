import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION="V1-PEXT-CONJUNTA-V152-V517D-PILOT-20260919";
const BUCKET="mi-visual-evidencias";
const MAX_BYTES=10*1024*1024;
const MIME_OK=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"]);
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
function safe(v:unknown,fallback="SIN-DATO"){const s=norm(v).replace(/[^A-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"");return (s||fallback).slice(0,100)}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const raw=Deno.env.get(name)||"";if(!raw)return "";try{const p=JSON.parse(raw);return p?.default||Object.values(p||{})[0]||""}catch(_){return raw}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function decodeBase64(raw:string){
  const s=raw.replace(/^data:[^;]+;base64,/i,"").replace(/\s+/g,"");if(!s)throw new Error("Evidencia vacía.");
  let b="";try{b=atob(s)}catch(_){throw new Error("Base64 de evidencia no válido.");}
  if(b.length>MAX_BYTES)throw new Error("Una evidencia supera 10 MB.");
  const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;
}
function ext(name:string,mime:string){
  const m=name.split("?")[0].match(/\.([a-zA-Z0-9]{1,8})$/);if(m)return m[1].toLowerCase();
  return ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif","application/pdf":"pdf"} as Record<string,string>)[mime]||"bin";
}
function fechaExacta(v:unknown){
  const s=txt(v);let y=0,m=0,d=0,mm=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(mm){y=+mm[1];m=+mm[2];d=+mm[3]}else{mm=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(!mm)throw new Error("Fecha de trabajo no válida. Use día/mes/año.");d=+mm[1];m=+mm[2];y=+mm[3]}
  const z=new Date(Date.UTC(y,m-1,d));if(z.getUTCFullYear()!==y||z.getUTCMonth()!==m-1||z.getUTCDate()!==d)throw new Error("La fecha de trabajo no existe.");
  return `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function hora(v:unknown){
  const s=txt(v);const m=s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!m)throw new Error("Hora no válida.");
  const h=+m[1],mi=+m[2],se=+(m[3]||0);if(h>23||mi>59||se>59)throw new Error("Hora no válida.");
  return `${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}:${String(se).padStart(2,"0")}`;
}
function limaParts(){
  const f=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const p:Record<string,string>={};f.forEach(x=>{if(x.type!=="literal")p[x.type]=x.value});
  return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}:${p.second}`,stamp:`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`};
}
function codes(v:unknown,n:number,label:string){
  if(n<0)throw new Error(label+" no puede ser negativo");if(n===0)return "";
  const arr=(Array.isArray(v)?v:txt(v).split(/[|,;\n]+/)).map(x=>txt(x)).filter(Boolean);
  if(arr.length!==n)throw new Error(`Debe ingresar ${n} código(s) para ${label}`);
  return arr.join(" | ");
}
function puntosCon(n:number){n=Math.max(0,Math.floor(n||0));if(!n)return 0;if(n<=2)return 1;if(n<=6)return 2;if(n<=12)return 3;return 4}
function puntosPext(c:number,r:number){return puntosCon(c)+Math.max(0,Math.floor(r||0))*2}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const h=req.headers.get("Authorization")||"";if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users").select("usuario,perfil,sede,cuadrilla,nivel_acceso,usuario_supervisor,estado,auth_user_id").eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("Usuario MI VISUAL no vinculado.");if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario inactivo.");
  const {data:p,error:pe}=await admin.from("app_permissions").select("activo,mostrar_modulo,ver,registrar,observar,validar,aprobar,descargar,alcance_datos").eq("perfil",u.perfil).eq("modulo","PEXT").maybeSingle();
  if(pe||!p||!p.activo||!p.ver||norm(p.alcance_datos)==="SIN ACCESO")throw new Error("Sin acceso a PEXT.");
  return {admin,u,p};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
async function rpc(admin:any,fn:string,args:any={}){const {data,error}=await admin.rpc(fn,args);if(error)throw new Error(error.message);return data}
function allowScope(ctx:any,x:any,perm=ctx.p){
  const a=norm(perm.alcance_datos),sede=norm(x.sede),cuad=norm(x.cuadrilla_mostrada||x.cuadrilla),us=norm(ctx.u.usuario);
  if(a==="ZONA NORTE"||a==="TODOS")return true;
  if(a==="SEDE")return norm(ctx.u.sede)===sede;
  if(a==="CUADRILLA")return norm(ctx.u.cuadrilla)===cuad;
  if(a==="PERSONAL")return us===norm(x.supervisor_registra)||norm(ctx.u.cuadrilla)===cuad;
  if(a==="SEDE / PROPIOS"||a==="SEDE/PROPIOS")return norm(ctx.u.sede)===sede||us===norm(x.supervisor_registra);
  if(a==="SUPERVISOR / CUADRILLAS")return norm(ctx.u.sede)===sede;
  return false;
}
async function signEvidence(admin:any,v:any){
  const s=txt(v);if(!s)return "";
  const prefix=`storage://${BUCKET}/`;if(!s.startsWith(prefix))return s;
  const {data,error}=await admin.storage.from(BUCKET).createSignedUrl(s.slice(prefix.length),3600);if(error)return "";
  return data.signedUrl;
}
async function enrichEvidence(admin:any,x:any){
  return {...x,
    evidencia1Url:await signEvidence(admin,x.evidencia_1),
    evidencia2Url:await signEvidence(admin,x.evidencia_2),
    evidencia3Url:await signEvidence(admin,x.evidencia_3)
  };
}
async function uploadEvidence(ctx:any,ev:any,id:string,sede:string,cuad:string,fecha:string,idx:number,uploaded:string[]){
  const mime=txt(ev?.mime||"image/jpeg").toLowerCase(),name=txt(ev?.nombre||`evidencia_${idx}.jpg`),b64=txt(ev?.base64);
  if(!b64)throw new Error(`Evidencia ${idx} sin archivo.`);if(!MIME_OK.has(mime))throw new Error(`Tipo de evidencia ${idx} no permitido.`);
  const bytes=decodeBase64(b64);
  const path=["pext",safe(sede),safe(ctx.u.usuario),safe(cuad),fecha,safe(id),`EVIDENCIA-${String(idx).padStart(2,"0")}-${crypto.randomUUID()}.${ext(name,mime)}`].join("/");
  const {data,error}=await ctx.admin.storage.from(BUCKET).upload(path,bytes,{contentType:mime,cacheControl:"3600",upsert:false});if(error)throw error;
  uploaded.push(data.path);return `storage://${BUCKET}/${data.path}`;
}
async function bonusPermission(ctx:any){
  const {data:all,error}=await ctx.admin.from("app_permissions").select("modulo,activo,ver,alcance_datos").eq("perfil",ctx.u.perfil).in("modulo",["BONOS","DASHBOARD SUPERVISOR","DASHBOARD JEFATURA","PRODUCCION","RANKING"]);
  if(error)throw error;
  const bonos=(all||[]).find((x:any)=>norm(x.modulo)==="BONOS");
  if(bonos){if(!bonos.activo||!bonos.ver)throw new Error("No tienes permiso para ver en BONOS");return bonos}
  const order=["DASHBOARD SUPERVISOR","DASHBOARD JEFATURA","PRODUCCION","RANKING"];
  for(const m of order){const p=(all||[]).find((x:any)=>norm(x.modulo)===m);if(p?.activo&&p?.ver)return p}
  return ctx.p; // compatibilidad práctica si el perfil ve PEXT pero no tiene módulo BONOS explícito
}
async function listar(ctx:any){
  await rpc(ctx.admin,"mv_pext_aplicar_vistos_buenos_automaticos");
  const {data,error}=await ctx.admin.from("mv_pext_trabajos_v1").select("*").order("registro_at",{ascending:false});if(error)throw error;
  const list=(data||[]).filter((x:any)=>allowScope(ctx,x)).map((x:any)=>ctx.p.validar?x:{...x,jornada_validada:""});
  const out=[];for(const x of list)out.push(await enrichEvidence(ctx.admin,x));
  return {ok:true,version:VERSION,modulo:"TRABAJOS_CONJUNTA",accion:"LISTAR",perfil:ctx.u.perfil,registros:out.length,trabajos:out,fuente:"POSTGRESQL PILOTO"};
}
async function registrar(ctx:any,d:any){
  if(!ctx.p.registrar)throw new Error("No tienes permiso para registrar en PEXT.");
  const cuad=txt(d.cuadrilla);if(!cuad)throw new Error("Debe seleccionar una cuadrilla.");
  const {data:tech,error:te}=await ctx.admin.from("app_users").select("cuadrilla,sede").eq("perfil","TECNICO").eq("estado","ACTIVO").eq("cuadrilla",cuad).limit(1).maybeSingle();
  if(te||!tech)throw new Error("Cuadrilla no encontrada.");if(norm(tech.sede)!==norm(ctx.u.sede))throw new Error("Supervisor solo puede registrar cuadrillas de su sede.");
  const tipo=norm(d.tipoTrabajo);if(!["NORMALIZACION","CONJUNTA PEXT","ORDENAMIENTO"].includes(tipo))throw new Error("Tipo de trabajo no válido.");
  const f=fechaExacta(d.fechaTrabajo),ini=hora(d.horaInicio),fin=hora(d.horaFin);if(fin<=ini)throw new Error("La hora de fin debe ser posterior a la hora de inicio.");
  const comentario=txt(d.comentarioFinal);if(!comentario)throw new Error("El comentario final es obligatorio.");
  let desc="",cto="",cc=0,cr=0,codc="",codr="",cuadras=0,zona="",pts=0;
  if(tipo==="NORMALIZACION"){desc=txt(d.descripcionTrabajo);if(!desc)throw new Error("La descripción del trabajo es obligatoria.");pts=Number(d.puntosSolicitados);if(!Number.isFinite(pts)||pts<=0)throw new Error("Ingrese los puntos de Normalización.");}
  else if(tipo==="CONJUNTA PEXT"){cto=txt(d.cto);if(!cto)throw new Error("La CTO es obligatoria.");cc=Math.max(0,Math.floor(Number(d.cantidadConectorizados)||0));cr=Math.max(0,Math.floor(Number(d.cantidadRecableados)||0));codc=codes(d.codigosConectorizados,cc,"conectorizados");codr=codes(d.codigosRecableados,cr,"recableados");pts=puntosPext(cc,cr);if(pts<=0){pts=Number(d.puntosSolicitados);if(!Number.isFinite(pts)||pts<=0)throw new Error("Si no hubo recableados ni conectorizados, ingrese los puntos asignados por el Supervisor.");}}
  else{cuadras=Number(d.cantidadCuadras)||0;if(cuadras<=0)throw new Error("La cantidad de cuadras debe ser mayor a cero.");zona=txt(d.zonaReferencia);if(!zona)throw new Error("La zona o referencia es obligatoria.");pts=Number(d.puntosSolicitados);if(!Number.isFinite(pts)||pts<=0)throw new Error("Ingrese los puntos de Ordenamiento.");}
  const evs=Array.isArray(d.evidencias)?d.evidencias:[];if(evs.length<1)throw new Error("Debe adjuntar al menos una evidencia.");if(evs.length>3)throw new Error("Solo se permiten máximo 3 evidencias.");
  const lp=limaParts(),id=`TC-PG-${lp.date.replace(/-/g,"")}-${lp.time.replace(/:/g,"")}-${crypto.randomUUID().slice(0,6).toUpperCase()}`,uploaded:string[]=[];
  try{
    const refs:string[]=[];for(let i=0;i<evs.length;i++)refs.push(await uploadEvidence(ctx,evs[i],id,tech.sede,cuad,f,i+1,uploaded));
    const row={
      id,source_row:null,fecha_registro:lp.date,hora_registro:lp.time,registro_at:lp.stamp,supervisor_registra:ctx.u.usuario,
      cuadrilla:cuad,tipo_trabajo:tipo,fecha_trabajo:f,hora_inicio:ini,hora_fin:fin,descripcion_trabajo:desc||null,cto:cto||null,
      cantidad_conectorizados:cc,codigos_conectorizados:codc||null,cantidad_recableados:cr,codigos_recableados:codr||null,
      cantidad_cuadras:cuadras,zona_referencia:zona||null,trabajos_adicionales:txt(d.trabajosAdicionales)||null,
      evidencia_1:refs[0]||null,evidencia_2:refs[1]||null,evidencia_3:refs[2]||null,puntos_solicitados:pts,
      comentario_final:comentario,estado_general:"PENDIENTE DE VISTO BUENO TECNICO",version:1,source_kind:"POSTGRESQL_PILOT"
    };
    const {error}=await ctx.admin.from("pext_trabajos_migracion").insert(row);if(error)throw error;
    return {ok:true,version:VERSION,modulo:"TRABAJOS_CONJUNTA",accion:"REGISTRAR",id,fechaTrabajo:f,periodo:f.slice(0,7),estado:"PENDIENTE DE VISTO BUENO TECNICO",puntosSolicitados:pts};
  }catch(e){if(uploaded.length)await ctx.admin.storage.from(BUCKET).remove(uploaded);throw e}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req),d=await input(req),a=txt(d.accion);

    if(a==="obtenerConfiguracionPext"){
      const {data,error}=await ctx.admin.from("module_config").select("*").eq("modulo","PEXT").maybeSingle();if(error)throw error;
      return json({ok:true,version:VERSION,modulo:"PEXT",accion:"OBTENER_CONFIGURACION",perfil:ctx.u.perfil,configuracion:data||null,activoOperativo:true,nota:"Compatibilidad legacy: exigirPextActivo() no bloquea el módulo."});
    }
    if(a==="guardarConfiguracionPext"){
      if(!["JEFATURA","JEFATURA GENERAL","ADMIN","ADMINISTRADOR"].includes(norm(ctx.u.perfil)))throw new Error("Solo Jefatura puede habilitar o deshabilitar PEXT.");
      const est=norm(d.estado||"DESHABILITADO");if(!["HABILITADO","DESHABILITADO"].includes(est))throw new Error("Estado no válido.");
      const lp=limaParts();
      const {error}=await ctx.admin.from("module_config").upsert({modulo:"PEXT",estado:est,actualizado_por:ctx.u.usuario,fecha_actualizacion:lp.stamp,hora_actualizacion:lp.time},{onConflict:"modulo"});if(error)throw error;
      return json({ok:true,version:VERSION,modulo:"PEXT",accion:"GUARDAR_CONFIGURACION",estado:est,activoOperativo:true});
    }
    if(a==="listarCuadrillasTrabajosConjunta"){
      if(!ctx.p.registrar)throw new Error("No tienes permiso para registrar en PEXT.");
      const {data,error}=await ctx.admin.from("app_users").select("cuadrilla,sede,plataforma,nombres_apellidos").eq("perfil","TECNICO").eq("estado","ACTIVO").eq("sede",ctx.u.sede).order("cuadrilla");if(error)throw error;
      const seen=new Set<string>(),cuadrillas=(data||[]).filter((x:any)=>{const k=norm(x.cuadrilla);if(!k||seen.has(k))return false;seen.add(k);return true});
      return json({ok:true,version:VERSION,modulo:"TRABAJOS_CONJUNTA",accion:"LISTAR_CUADRILLAS",cuadrillas});
    }
    if(a==="registrarTrabajoConjunta")return json(await registrar(ctx,d));
    if(a==="listarTrabajosConjunta")return json(await listar(ctx));
    if(a==="listarBonosPextConjunta"){
      await rpc(ctx.admin,"mv_pext_aplicar_vistos_buenos_automaticos");
      const perm=await bonusPermission(ctx);
      const {data,error}=await ctx.admin.from("mv_pext_bonos_v1").select("*").order("fecha_trabajo",{ascending:false});if(error)throw error;
      const rows=(data||[]).filter((x:any)=>allowScope(ctx,x,perm));
      return json({ok:true,version:VERSION,modulo:"BONOS",accion:"LISTAR_PEXT",registros:rows.length,trabajos:rows});
    }
    if(a==="responderTrabajoConjuntaTecnico"){
      if(!ctx.p.observar)throw new Error("No tienes permiso para observar/revisar PEXT.");
      const res=await rpc(ctx.admin,"mv_pext_responder_tecnico",{p_id:txt(d.id),p_usuario:ctx.u.usuario,p_cuadrilla:ctx.u.cuadrilla,p_resultado:txt(d.resultado),p_observacion:txt(d.observacion)||null});
      return json({...res,version:VERSION});
    }
    if(a==="validarTrabajoConjuntaJefatura"){
      if(!ctx.p.validar)throw new Error("No tienes permiso para validar PEXT.");
      const res=await rpc(ctx.admin,"mv_pext_validar_jefatura",{p_id:txt(d.id),p_usuario:ctx.u.usuario,p_resultado:txt(d.resultado),p_observacion:txt(d.observacion)||null,p_jornada_validada:txt(d.jornadaValidada)||null});
      return json({...res,version:VERSION});
    }
    if(a==="conformidadFinalTrabajoConjunta"){
      if(!ctx.p.aprobar)throw new Error("No tienes permiso para dar conformidad final en PEXT.");
      const res=await rpc(ctx.admin,"mv_pext_conformidad_final",{p_id:txt(d.id),p_usuario:ctx.u.usuario,p_resultado:txt(d.resultado),p_observacion:txt(d.observacion)||null});
      return json({...res,version:VERSION});
    }
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);return json({ok:false,version:VERSION,modulo:"PEXT",error:m},/Sesión|vinculado/i.test(m)?401:/permiso|acceso/i.test(m)?403:400);
  }
});