import { createClient } from "npm:@supabase/supabase-js@2";

const VERSION = "V3-SEGURIDAD-V442-PILOT-20260919";
const BUCKET = "mi-visual-evidencias";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
function txt(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) {
  return txt(v).toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function publicKey() {
  const direct = Deno.env.get("SUPABASE_ANON_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "";
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) { return raw; }
}
function secretKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) { return raw; }
}
function safePart(v: unknown, fallback="SIN-DATO") {
  const s = norm(v).replace(/[^A-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (s || fallback).slice(0, 90);
}
function decodeBase64(raw: string) {
  const value = raw.replace(/^data:[^;]+;base64,/i, "").replace(/\s+/g, "");
  if (!value) throw new Error("Firma vacía.");
  let binary = "";
  try { binary = atob(value); } catch (_) { throw new Error("Firma base64 no válida."); }
  if (binary.length > 2 * 1024 * 1024) throw new Error("La firma supera 2 MB.");
  const bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes;
}

async function context(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const pub = publicKey(), sec = secretKey();
  if (!url || !pub || !sec) throw new Error("Configuración Supabase incompleta.");

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) throw new Error("Sesión requerida.");

  const auth = createClient(url,pub,{
    global:{headers:{Authorization:authHeader}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const admin = createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});

  const {data:ud,error:ue}=await auth.auth.getUser();
  if(ue || !ud?.user) throw new Error("Sesión no válida.");

  const {data:appUser,error:ae}=await admin.from("app_users")
    .select("usuario,perfil,sede,cuadrilla,estado,auth_user_id,nombres_apellidos")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(ae || !appUser) throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
  if(norm(appUser.estado)!=="ACTIVO") throw new Error("Usuario MI VISUAL inactivo.");

  return {admin,appUser};
}

async function rpc(admin:any,fn:string,args:Record<string,unknown>) {
  const {data,error}=await admin.rpc(fn,args);
  if(error) throw new Error(error.message || String(error));
  return data;
}

function storagePathFromRef(v: unknown) {
  const s=txt(v), prefix=`storage://${BUCKET}/`;
  return s.startsWith(prefix) ? s.slice(prefix.length) : "";
}

async function signOne(admin:any, ref:string) {
  const path=storagePathFromRef(ref);
  if(!path) return ref;
  const {data,error}=await admin.storage.from(BUCKET).createSignedUrl(path,3600);
  if(error) return "";
  return data.signedUrl;
}

async function hydrateSignatures(admin:any, value:any):Promise<any> {
  if(Array.isArray(value)) {
    const out=[];
    for(const x of value) out.push(await hydrateSignatures(admin,x));
    return out;
  }
  if(value && typeof value==="object") {
    const out:any={};
    for(const [k,v] of Object.entries(value)) {
      if(typeof v==="string" && v.startsWith(`storage://${BUCKET}/`)) {
        out[k+"StorageRef"]=v;
        out[k]=await signOne(admin,v);
      } else {
        out[k]=await hydrateSignatures(admin,v);
      }
    }
    return out;
  }
  if(typeof value==="string" && value.startsWith(`storage://${BUCKET}/`)) {
    return await signOne(admin,value);
  }
  return value;
}

async function uploadFirma(admin:any,usuario:string,b64:string) {
  const bytes=decodeBase64(b64);
  const path=[
    "seguridad","firmas",safePart(usuario),
    new Date().toISOString().slice(0,10),
    `firma-${crypto.randomUUID()}.png`
  ].join("/");
  const {data,error}=await admin.storage.from(BUCKET)
    .upload(path,bytes,{contentType:"image/png",cacheControl:"3600",upsert:false});
  if(error) throw error;
  return {path:data.path,storageRef:`storage://${BUCKET}/${data.path}`};
}

async function readInput(req:Request) {
  if(req.method==="GET") {
    const o:any={}; const u=new URL(req.url);
    u.searchParams.forEach((v,k)=>o[k]=v);
    return o;
  }
  try { return await req.json(); } catch(_) { return {}; }
}

async function callSeguridadPdf(req:Request,accionPdf:string,data:any) {
  const url=(Deno.env.get("SUPABASE_URL")||"")+"/functions/v1/seguridad-pdf";
  const auth=req.headers.get("Authorization")||"";
  const r=await fetch(url,{
    method:"POST",
    headers:{
      "Authorization":auth,
      "apikey":publicKey(),
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      accion:accionPdf,
      id:txt(data.id),
      gps:txt(data.gps),
      motivo:txt(data.motivo)
    })
  });
  const tx=await r.text();
  let d:any;
  try { d=JSON.parse(tx); } catch(_) { throw new Error(tx||"Respuesta PDF inválida"); }
  if(!r.ok || !d.ok) throw new Error(d.error||"No se pudo generar el PDF de Seguridad");
  return d;
}


Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(!["GET","POST"].includes(req.method)) return json({ok:false,version:VERSION,error:"Método no permitido."},405);

  try {
    const ctx=await context(req);
    const data=await readInput(req);
    const accion=txt(data.accion);
    const usuario=ctx.appUser.usuario;

    if(accion==="obtenerContextoSeguridadV432") {
      const d=await rpc(ctx.admin,"mv_seguridad_obtener_contexto",{p_usuario:usuario});
      return json({...await hydrateSignatures(ctx.admin,d),version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(accion==="obtenerDocumentoSeguridadV432") {
      const d=await rpc(ctx.admin,"mv_seguridad_obtener_documento",{p_usuario:usuario,p_id:txt(data.id)});
      return json({...await hydrateSignatures(ctx.admin,d),version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(accion==="crearAtsDiaSeguridadV432") {
      const d=await rpc(ctx.admin,"mv_seguridad_crear_ats_dia",{
        p_usuario:usuario,p_gps:txt(data.gps)
      });
      return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO",sourceLogic:"V437/V432"});
    }

    if(accion==="guardarAtsSeguridadV432") {
      const petar=data.petar ?? null;
      const payload={
        trabajo:data.trabajo ?? "",
        lugarTrabajo:data.lugarTrabajo ?? "",
        horaInicio:data.horaInicio ?? "",
        horaFinal:data.horaFinal ?? "",
        herramientas:Array.isArray(data.herramientas)?data.herramientas:[],
        epp:Array.isArray(data.epp)?data.epp:[],
        tareas:Array.isArray(data.tareas)?data.tareas:[],
        petar,
      };
      const d=await rpc(ctx.admin,"mv_seguridad_guardar_ats",{
        p_usuario:usuario,p_id:txt(data.id),p_data:payload
      });
      return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(accion==="aceptarAtsSeguridadV432") {
      const d=await rpc(ctx.admin,"mv_seguridad_aceptar_ats",{
        p_usuario:usuario,p_id:txt(data.id),p_gps:txt(data.gps)
      });
      return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(accion==="revisarAtsSupervisorV432") {
      if(norm(data.resultado)==="AUTORIZAR") {
        const d=await callSeguridadPdf(req,"AUTORIZAR_SUPERVISOR",data);
        return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO",pdfPiloto:"V442"});
      }
      const d=await rpc(ctx.admin,"mv_seguridad_revisar_supervisor",{
        p_usuario:usuario,p_id:txt(data.id),
        p_resultado:txt(data.resultado),p_motivo:txt(data.motivo),p_gps:txt(data.gps)
      });
      return json({
        ...d,version:VERSION,fuente:"POSTGRESQL PILOTO",
        pdfPiloto:d?.requierePdf ? "PENDIENTE_IMPLEMENTACION" : "NO_REQUERIDO"
      });
    }

    if(accion==="validarAtsFinalV432") {
      if(norm(data.resultado)==="VALIDAR") {
        const d=await callSeguridadPdf(req,"VALIDAR_FINAL",data);
        return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO",pdfPiloto:"V442"});
      }
      const d=await rpc(ctx.admin,"mv_seguridad_validar_final",{
        p_usuario:usuario,p_id:txt(data.id),
        p_resultado:txt(data.resultado),p_motivo:txt(data.motivo),p_gps:txt(data.gps)
      });
      return json({
        ...d,version:VERSION,fuente:"POSTGRESQL PILOTO",
        pdfPiloto:d?.requierePdf ? "PENDIENTE_IMPLEMENTACION" : "NO_REQUERIDO"
      });
    }

    if(accion==="registrarFirmaSeguridadV432") {
      const b64=txt(data.firmaBase64);
      let uploaded:any=null;
      try {
        uploaded=await uploadFirma(ctx.admin,usuario,b64);
        const d=await rpc(ctx.admin,"mv_seguridad_registrar_firma",{
          p_usuario:usuario,p_dni:txt(data.dni),p_gps:txt(data.gps),
          p_url:uploaded.storageRef,p_archivo_id:uploaded.path,
          p_autorizacion_cambio_id:txt(data.autorizacionCambioId),
          p_reintento:norm(data.reintento)==="SI"
        });
        return json({
          ...await hydrateSignatures(ctx.admin,d),
          version:VERSION,fuente:"POSTGRESQL PILOTO"
        });
      } catch(e) {
        if(uploaded?.path) await ctx.admin.storage.from(BUCKET).remove([uploaded.path]).catch(()=>{});
        throw e;
      }
    }

    if(accion==="solicitarCambioFirmaSeguridadV432") {
      const d=await rpc(ctx.admin,"mv_seguridad_solicitar_cambio_firma",{
        p_usuario:usuario,p_motivo:txt(data.motivo)
      });
      return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(accion==="resolverCambioFirmaSeguridadV432") {
      const d=await rpc(ctx.admin,"mv_seguridad_resolver_cambio_firma",{
        p_usuario:usuario,p_id:txt(data.id),p_resultado:txt(data.resultado)
      });
      return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(accion==="reiniciarFirmaSeguridadV433") {
      const d=await rpc(ctx.admin,"mv_seguridad_reiniciar_firma_pruebas",{
        p_usuario:usuario,p_usuario_objetivo:txt(data.usuarioObjetivo)||null
      });
      return json({...d,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    return json({ok:false,version:VERSION,modulo:"SEGURIDAD",error:"Acción no soportada."},400);
  } catch(e) {
    const msg=e instanceof Error?e.message:String(e);
    const status=/Sesión|required|Auth/i.test(msg)?401:
      /No tiene permiso|Solo |no pertenece|no forma parte/i.test(msg)?403:400;
    return json({ok:false,version:VERSION,modulo:"SEGURIDAD",error:msg},status);
  }
});