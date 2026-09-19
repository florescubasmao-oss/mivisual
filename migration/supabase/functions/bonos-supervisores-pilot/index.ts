import { createClient } from "npm:@supabase/supabase-js@2";

const VERSION = "V1-BONOS-SUPERVISORES-PILOT-20260919";
const MODULO = "BONO_SUPERVISORES";

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

function txt(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return txt(v)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bool(v: unknown) {
  const n = norm(v);
  return v === true || n === "SI" || n === "TRUE" || String(v) === "1";
}

function publicKey() {
  const direct = Deno.env.get("SUPABASE_ANON_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "";
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) {
    return raw;
  }
}

function secretKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) {
    return raw;
  }
}

function perfilPuedeVer(perfil: unknown) {
  return ["SUPERVISOR", "JEFATURA", "ADMIN", "ADMINISTRADOR", "GERENCIA LIMA"].includes(norm(perfil));
}

function perfilJefatura(perfil: unknown) {
  return ["JEFATURA", "ADMIN", "ADMINISTRADOR"].includes(norm(perfil));
}

async function context(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const pub = publicKey();
  const sec = secretKey();
  if (!url || !pub || !sec) throw new Error("Configuración Supabase incompleta.");

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Sesión requerida.");
  }

  const auth = createClient(url, pub, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, sec, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ud, error: ue } = await auth.auth.getUser();
  if (ue || !ud?.user) throw new Error("Sesión no válida.");

  const { data: appUser, error: ae } = await admin
    .from("app_users")
    .select("id,auth_user_id,usuario,correo,perfil,nivel_acceso,sede,cuadrilla,estado,nombres_apellidos")
    .eq("auth_user_id", ud.user.id)
    .maybeSingle();

  if (ae || !appUser) throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
  if (norm(appUser.estado) !== "ACTIVO") throw new Error("Usuario MI VISUAL inactivo.");
  if (!perfilPuedeVer(appUser.perfil)) {
    throw new Error("El bono de supervisores solo está disponible en los dashboards autorizados.");
  }

  return { admin, appUser, authUser: ud.user };
}

async function rpc(admin: any, fn: string, args: Record<string, unknown>) {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(error.message || String(error));
  return data;
}

function respuestasNumericas(data: any) {
  const lista = Array.isArray(data.respuestas) ? data.respuestas : [];
  return lista.map((r: any) => {
    if (r && typeof r === "object" && !Array.isArray(r)) return r.puntaje;
    return r;
  });
}

async function obtener(ctx: any, data: any) {
  const periodo = txt(data.periodo) || null;
  let refresco: any = null;

  if (bool(data.forzarActualizacion)) {
    refresco = await rpc(ctx.admin, "mv_bono_sup_refrescar_periodo", {
      p_usuario: ctx.appUser.usuario,
      p_periodo: periodo,
    });
  }

  const resultado = await rpc(ctx.admin, "mv_bono_sup_obtener", {
    p_usuario: ctx.appUser.usuario,
    p_periodo: periodo,
  });

  return {
    ...(resultado || {}),
    version: VERSION,
    fuente: "POSTGRESQL PILOTO",
    refresco: refresco || undefined,
  };
}

async function listarSla(ctx: any, data: any) {
  const periodo = txt(data.periodo) || null;
  const [vigentes, configurables] = await Promise.all([
    rpc(ctx.admin, "mv_bono_sup_parametros_sla", { p_periodo: periodo }),
    rpc(ctx.admin, "mv_bono_sup_parametros_sla_configurables", { p_periodo: periodo }),
  ]);

  return {
    ok: true,
    version: VERSION,
    modulo: MODULO,
    accion: "LISTAR_PARAMETROS_SLA",
    periodo: periodo || "",
    parametros: vigentes || [],
    parametrosConfiguracion: configurables || [],
    puedeEditar: perfilJefatura(ctx.appUser.perfil),
    fuente: "POSTGRESQL PILOTO",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await context(req);

    let data: any = {};
    if (req.method === "GET") {
      const u = new URL(req.url);
      u.searchParams.forEach((v, k) => data[k] = v);
    } else {
      try { data = await req.json(); } catch (_) { data = {}; }
    }

    const accion = txt(data.accion || new URL(req.url).searchParams.get("accion"));

    if (accion === "contextoBonoSupervisores") {
      return json({
        ok: true,
        version: VERSION,
        modulo: MODULO,
        accion: "CONTEXTO",
        usuario: {
          usuario: ctx.appUser.usuario,
          perfil: ctx.appUser.perfil,
          sede: ctx.appUser.sede || "",
          nombresApellidos: ctx.appUser.nombres_apellidos || "",
        },
        puedeEditar: perfilJefatura(ctx.appUser.perfil),
        fuente: "POSTGRESQL PILOTO",
      });
    }

    if (accion === "obtenerBonosSupervisores") {
      return json(await obtener(ctx, data));
    }

    if (accion === "refrescarBonosSupervisores") {
      const resultado = await rpc(ctx.admin, "mv_bono_sup_refrescar_periodo", {
        p_usuario: ctx.appUser.usuario,
        p_periodo: txt(data.periodo) || null,
      });
      return json({ ...(resultado || {}), version: VERSION, fuente: "POSTGRESQL PILOTO" });
    }

    if (accion === "estadoBonosSupervisores") {
      const estado = await rpc(ctx.admin, "mv_bono_sup_estado_operativo", {
        p_periodo: txt(data.periodo) || null,
      });
      return json({
        ok: true,
        version: VERSION,
        modulo: MODULO,
        accion: "ESTADO_CACHE",
        estado,
        fuente: "POSTGRESQL PILOTO",
      });
    }

    if (accion === "listarParametrosSlaWin") {
      return json(await listarSla(ctx, data));
    }

    if (accion === "guardarEvaluacionBonoSupervisor") {
      const resultado = await rpc(ctx.admin, "mv_bono_sup_guardar_evaluacion", {
        p_usuario: ctx.appUser.usuario,
        p_periodo: txt(data.periodo),
        p_supervisor: txt(data.supervisor),
        p_respuestas: respuestasNumericas(data),
      });
      return json({ ...(resultado || {}), version: VERSION, fuente: "POSTGRESQL PILOTO" });
    }

    if (accion === "guardarSatisfaccionBonoSupervisor") {
      const resultado = await rpc(ctx.admin, "mv_bono_sup_guardar_satisfaccion", {
        p_usuario: ctx.appUser.usuario,
        p_periodo: txt(data.periodo),
        p_supervisor: txt(data.supervisor),
        p_clientes_llamados: Number(data.clientesLlamados),
        p_conformes: Number(data.conformes),
        p_no_conformes: Number(data.noConformes),
        p_observacion: txt(data.observacion),
      });
      return json({ ...(resultado || {}), version: VERSION, fuente: "POSTGRESQL PILOTO" });
    }

    if (accion === "guardarActasSinPendientesBonoSupervisor") {
      const resultado = await rpc(ctx.admin, "mv_bono_sup_guardar_actas", {
        p_usuario: ctx.appUser.usuario,
        p_periodo: txt(data.periodo),
        p_supervisor: txt(data.supervisor),
        p_respuesta: txt(data.respuesta),
      });
      return json({ ...(resultado || {}), version: VERSION, fuente: "POSTGRESQL PILOTO" });
    }

    if (accion === "guardarConfiguracionBonoSupervisores") {
      const resultado = await rpc(ctx.admin, "mv_bono_sup_guardar_configuracion", {
        p_usuario: ctx.appUser.usuario,
        p_periodo: txt(data.periodo),
        p_monto_total: Number(data.montoTotal),
        p_escalas: data.escalas ?? null,
      });
      return json({ ...(resultado || {}), version: VERSION, fuente: "POSTGRESQL PILOTO" });
    }

    if (accion === "guardarParametrosSlaWin") {
      const parametros = Array.isArray(data.parametros) ? data.parametros : [];
      const resultado = await rpc(ctx.admin, "mv_bono_sup_guardar_parametros_sla", {
        p_usuario: ctx.appUser.usuario,
        p_periodo: txt(data.periodo),
        p_parametros: parametros,
      });
      return json({ ...(resultado || {}), version: VERSION, fuente: "POSTGRESQL PILOTO" });
    }

    return json({
      ok: false,
      version: VERSION,
      modulo: MODULO,
      error: "Acción no soportada.",
    }, 400);

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status =
      /Sesión|required|Auth/i.test(msg) ? 401 :
      /Solo Jefatura|no está disponible|Sin acceso|no tiene acceso/i.test(msg) ? 403 :
      400;
    return json({ ok: false, version: VERSION, modulo: MODULO, error: msg }, status);
  }
});
