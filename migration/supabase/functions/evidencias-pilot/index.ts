import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "V2-EVIDENCIAS-PILOT-20260920";
const BUCKET = "mi-visual-evidencias";
const TZ = "America/Lima";
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_OK = new Set([
  "image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
function envKey(name: string, legacy?: string) {
  const direct = Deno.env.get(legacy || name);
  if (direct) return direct;
  const raw = Deno.env.get(name);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) { return raw; }
}
function publicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || envKey("SUPABASE_PUBLISHABLE_KEYS");
}
function secretKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || envKey("SUPABASE_SECRET_KEYS");
}
function moduleInfo(v: unknown) {
  const n = norm(v).replace(/_/g, " ");
  if (n === "ACTIVIDAD CAMPO" || n === "ACTIVIDAD EN CAMPO") {
    return { module: "ACTIVIDAD CAMPO", slug: "actividad-campo" };
  }
  if (n === "CHECKLIST ALMACEN") {
    return { module: "CHECKLIST ALMACEN", slug: "checklist-almacen" };
  }
  throw new Error("Módulo de evidencia no válido.");
}
function safePart(v: unknown, fallback = "SIN-DATO") {
  const s = norm(v).replace(/[^A-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (s || fallback).slice(0, 90);
}
function limaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const p: Record<string,string> = {};
  parts.forEach(x => { if (x.type !== "literal") p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day}`;
}
function extensionFor(name: string, mime: string) {
  const clean = name.split("?")[0];
  const i = clean.lastIndexOf(".");
  if (i >= 0 && i < clean.length - 1) {
    const e = clean.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (e) return e.slice(0, 8);
  }
  const map: Record<string,string> = {
    "image/jpeg":"jpg","image/png":"png","image/webp":"webp",
    "image/heic":"heic","image/heif":"heif","application/pdf":"pdf"
  };
  return map[mime] || "bin";
}
function decodeBase64(raw: string) {
  const value = raw.replace(/^data:[^;]+;base64,/i, "").replace(/\s+/g, "");
  if (!value) throw new Error("Archivo vacío.");
  let binary = "";
  try { binary = atob(value); } catch (_) { throw new Error("Base64 no válido."); }
  if (binary.length > MAX_BYTES) throw new Error("El archivo supera 10 MB.");
  const bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function parseStorageRef(v: unknown) {
  const s = txt(v);
  const prefix = `storage://${BUCKET}/`;
  if (s.startsWith(prefix)) return s.slice(prefix.length);
  return s.replace(/^\/+/, "");
}
async function context(req: Request, moduloRaw: unknown) {
  const info = moduleInfo(moduloRaw);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const pub = publicKey(), sec = secretKey();
  if (!url || !pub || !sec) throw new Error("Configuración Supabase incompleta.");

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) throw new Error("Sesión requerida.");

  const auth = createClient(url, pub, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession:false, autoRefreshToken:false },
  });
  const admin = createClient(url, sec, { auth:{ persistSession:false, autoRefreshToken:false } });

  const { data:ud, error:ue } = await auth.auth.getUser();
  if (ue || !ud?.user) throw new Error("Sesión no válida.");

  const { data:appUser, error:ae } = await admin.from("app_users")
    .select("usuario,perfil,sede,cuadrilla,estado,auth_user_id")
    .eq("auth_user_id", ud.user.id).maybeSingle();
  if (ae || !appUser) throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
  if (norm(appUser.estado) !== "ACTIVO") throw new Error("Usuario MI VISUAL inactivo.");

  const { data:perm, error:pe } = await admin.from("app_permissions")
    .select("perfil,modulo,activo,mostrar_modulo,ver,registrar,validar,alcance_datos")
    .eq("perfil", appUser.perfil).eq("modulo", info.module).maybeSingle();
  if (pe || !perm || !perm.activo || !perm.mostrar_modulo || !perm.ver) {
    throw new Error("Sin acceso al módulo solicitado.");
  }
  return { admin, appUser, perm, info };
}
async function cuadrillaSede(admin:any, cuadrilla:string) {
  const { data, error } = await admin.from("mv_actividad_cuadrilla_ultima")
    .select("cuadrilla,sede").eq("cuadrilla",cuadrilla).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cuadrilla no encontrada.");
  return data;
}
async function assertUploadScope(ctx:any, data:any) {
  const perfil = norm(ctx.appUser.perfil);
  let cuadrilla = txt(data.cuadrilla);
  if (ctx.info.slug === "actividad-campo") {
    if (!["SUPERVISOR","JEFATURA","ADMIN","ADMINISTRADOR"].includes(perfil)) {
      throw new Error("Perfil no autorizado para subir evidencias de Actividad en Campo.");
    }
    if (!cuadrilla) throw new Error("Cuadrilla obligatoria.");
    const dc = await cuadrillaSede(ctx.admin, cuadrilla);
    if (perfil === "SUPERVISOR" && norm(dc.sede) !== norm(ctx.appUser.sede)) {
      throw new Error("Supervisor solo puede subir evidencias de su sede.");
    }
    return { cuadrilla:dc.cuadrilla, sede:dc.sede };
  }

  if (!["TECNICO","SUPERVISOR"].includes(perfil)) {
    throw new Error("Solo Técnico o Supervisor pueden subir evidencias de Checklist.");
  }
  if (perfil === "TECNICO") cuadrilla = txt(ctx.appUser.cuadrilla);
  if (!cuadrilla) throw new Error("Cuadrilla obligatoria.");
  const dc = await cuadrillaSede(ctx.admin, cuadrilla);
  if (perfil === "SUPERVISOR" && norm(dc.sede) !== norm(ctx.appUser.sede)) {
    throw new Error("Supervisor solo puede subir evidencias de su sede.");
  }
  return { cuadrilla:dc.cuadrilla, sede:dc.sede };
}
function assertReadScope(ctx:any, path:string) {
  const p = path.split("/");
  if (p.length < 4 || p[0] !== ctx.info.slug) throw new Error("Referencia de evidencia inválida.");
  const sede = p[1], owner = p[2], cuadrilla = p[3];
  const perfil = norm(ctx.appUser.perfil);

  if (ctx.info.slug === "actividad-campo") {
    if (perfil === "SUPERVISOR" && owner !== safePart(ctx.appUser.usuario)) {
      throw new Error("Sin acceso a esta evidencia.");
    }
    if (!["SUPERVISOR","JEFATURA","ADMIN","ADMINISTRADOR","GERENCIA LIMA","OPERACIONES LIMA"].includes(perfil)) {
      throw new Error("Sin acceso a evidencias de Actividad en Campo.");
    }
    return;
  }

  if (perfil === "TECNICO" && cuadrilla !== safePart(ctx.appUser.cuadrilla)) {
    throw new Error("Sin acceso a esta evidencia.");
  }
  if (["ALMACEN","SUPERVISOR"].includes(perfil) && sede !== safePart(ctx.appUser.sede)) {
    throw new Error("Sin acceso a esta evidencia.");
  }
  if (!["TECNICO","ALMACEN","SUPERVISOR","JEFATURA ALMACEN","JEFATURA","ADMIN","ADMINISTRADOR"].includes(perfil)) {
    throw new Error("Sin acceso a evidencias de Checklist.");
  }
}
async function upload(ctx:any, data:any) {
  const scope = await assertUploadScope(ctx, data);
  const archivo = data.archivo || {};
  const nombre = txt(archivo.nombre || data.nombre);
  const mime = txt(archivo.mime || data.mime).toLowerCase();
  const b64 = txt(archivo.base64 || data.base64);
  if (!nombre) throw new Error("Nombre de archivo obligatorio.");
  if (!MIME_OK.has(mime)) throw new Error("Tipo de archivo no permitido.");
  const bytes = decodeBase64(b64);
  if (bytes.byteLength > MAX_BYTES) throw new Error("El archivo supera 10 MB.");

  const fecha = /^20\d{2}-\d{2}-\d{2}$/.test(txt(data.fechaGestion))
    ? txt(data.fechaGestion) : limaDate();
  const owner = safePart(ctx.appUser.usuario);
  const carpeta = safePart(data.registroId || data.id || `BORRADOR-${crypto.randomUUID()}`);
  const categoria = safePart(data.categoria || "EVIDENCIA");
  const ext = extensionFor(nombre,mime);
  const path = [
    ctx.info.slug,
    safePart(scope.sede),
    owner,
    safePart(scope.cuadrilla),
    fecha,
    carpeta,
    `${categoria}-${crypto.randomUUID()}.${ext}`
  ].join("/");

  const { data:up, error:upErr } = await ctx.admin.storage.from(BUCKET)
    .upload(path, bytes, { contentType:mime, cacheControl:"3600", upsert:false });
  if (upErr) throw upErr;

  const { data:signed, error:signErr } = await ctx.admin.storage.from(BUCKET)
    .createSignedUrl(up.path, 3600);
  if (signErr) throw signErr;

  return {
    ok:true, version:VERSION, accion:"SUBIR_EVIDENCIA",
    modulo:ctx.info.module, bucket:BUCKET, path:up.path,
    storageRef:`storage://${BUCKET}/${up.path}`,
    signedUrl:signed.signedUrl, expiresIn:3600,
    bytes:bytes.byteLength, mime
  };
}
async function sign(ctx:any, data:any) {
  const path = parseStorageRef(data.storageRef || data.path);
  if (!path) throw new Error("Referencia de evidencia obligatoria.");
  assertReadScope(ctx,path);
  const seconds = Math.min(3600, Math.max(60, Number(data.expiresIn || 900)));
  const { data:signed, error } = await ctx.admin.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw error;
  return {
    ok:true, version:VERSION, accion:"FIRMAR_EVIDENCIA",
    modulo:ctx.info.module, storageRef:`storage://${BUCKET}/${path}`,
    signedUrl:signed.signedUrl, expiresIn:seconds
  };
}
async function removeEvidence(ctx:any, data:any) {
  const path = parseStorageRef(data.storageRef || data.path);
  if (!path) throw new Error("Referencia de evidencia obligatoria.");
  assertReadScope(ctx,path);
  const parts=path.split("/");
  const owner=parts[2]||"";
  if(owner!==safePart(ctx.appUser.usuario)){
    throw new Error("Solo el propietario puede eliminar esta evidencia temporal.");
  }
  const { error }=await ctx.admin.storage.from(BUCKET).remove([path]);
  if(error) throw error;
  return {
    ok:true,version:VERSION,accion:"ELIMINAR_EVIDENCIA",
    modulo:ctx.info.module,storageRef:`storage://${BUCKET}/${path}`
  };
}

Deno.serve(async (req:Request) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (req.method !== "POST") return json({ok:false,version:VERSION,error:"Método no permitido."},405);
  try {
    const data = await req.json();
    const ctx = await context(req,data.modulo);
    const accion = norm(data.accion);
    if (accion === "SUBIR EVIDENCIA" || accion === "SUBIR_EVIDENCIA") return json(await upload(ctx,data));
    if (accion === "FIRMAR EVIDENCIA" || accion === "FIRMAR_EVIDENCIA") return json(await sign(ctx,data));
    if (accion === "ELIMINAR EVIDENCIA" || accion === "ELIMINAR_EVIDENCIA") return json(await removeEvidence(ctx,data));
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  } catch(e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ok:false,version:VERSION,error:msg},401);
  }
});
