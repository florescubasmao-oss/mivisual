import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function normUpper(v: unknown) {
  return norm(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function normId(v: unknown) {
  return normUpper(v).replace(/[^A-Z0-9]/g, "");
}

function listParam(v: unknown): string[] {
  if (Array.isArray(v)) return [...new Set(v.map(norm).filter(Boolean))];
  const t = norm(v);
  if (!t || t === "__TODOS_V419__") return [];
  if (t.startsWith("[")) {
    try {
      const x = JSON.parse(t);
      if (Array.isArray(x)) return [...new Set(x.map(norm).filter(Boolean))];
    } catch (_) {}
  }
  const parts = t.includes("||") ? t.split("||") : t.includes(",") ? t.split(",") : [t];
  return [...new Set(parts.map(norm).filter(Boolean))];
}

function getPublicKey() {
  try {
    const obj = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (obj.default) return obj.default;
  } catch (_) {}
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

function getSecretKey() {
  try {
    const obj = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (obj.default) return obj.default;
  } catch (_) {}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function mapOrden(o: Record<string, unknown>) {
  return {
    ordenId: o.orden_id ?? "",
    tipoTrabajo: o.tipo_trabajo ?? "",
    fechaSolicitud: o.fecha_solicitud ?? "",
    horaSolicitud: o.hora_solicitud ?? "",
    cliente: o.cliente ?? "",
    tipo: o.tipo ?? "",
    productoOrigen: o.producto_origen ?? "",
    cuadrilla: o.cuadrilla ?? "",
    estado: o.estado ?? "",
    direccion: o.direccion ?? "",
    direccionAdicional: o.direccion_adicional ?? "",
    fechaUltimoEstado: o.fecha_ultimo_estado ?? "",
    productoServicio: o.producto_servicio ?? "",
    region: o.sede ?? "",
    codigoCliente: o.codigo_cliente ?? "",
    numeroDocumento: o.numero_documento ?? "",
    telefonoMovil: o.telefono_movil ?? "",
    telefonoFijo: o.telefono_fijo ?? "",
    fechaFinVisita: o.fecha_fin_visita ?? "",
    fechaInicioVisita: o.fecha_inicio_visita ?? "",
    motivoCancelacion: o.motivo_cancelacion ?? "",
    motivoFinalizacion: o.motivo_finalizacion ?? "",
    motivoAnulacion: o.motivo_anulacion ?? "",
    latitud: o.latitud ?? "",
    longitud: o.longitud ?? "",
    detalle: o.detalle ?? "",
    cto1: o.cto_1 ?? "",
    coordenadaCto1: o.coordenada_cto_1 ?? "",
    cto2: o.cto_2 ?? "",
    coordenadaCto2: o.coordenada_cto_2 ?? "",
    cto3: o.cto_3 ?? "",
    coordenadaCto3: o.coordenada_cto_3 ?? "",
    cto: o.cto ?? "",
    puerto: o.puerto ?? "",
    codigoSeguimiento: o.codigo_seguimiento ?? "",
  };
}

async function resolveContext(admin: any, authClient: any) {
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData?.user) throw new Error("AUTH_INVALID");

  const { data: appUser, error: userError } = await admin
    .from("app_users")
    .select("auth_user_id,usuario,correo,cuadrilla,sede,plataforma,perfil,nivel_acceso,estado,usuario_supervisor,nombres_apellidos")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (userError) throw userError;
  if (!appUser) throw new Error("USER_NOT_LINKED");
  if (normUpper(appUser.estado) !== "ACTIVO") throw new Error("USER_INACTIVE");

  const { data: permiso, error: permError } = await admin
    .from("app_permissions")
    .select("activo,ver,registrar,alcance_datos")
    .eq("perfil", appUser.perfil)
    .eq("modulo", "MAPA OPERATIVO")
    .maybeSingle();

  if (permError) throw permError;
  if (!permiso || !permiso.activo || !permiso.ver || normUpper(permiso.alcance_datos) === "SIN ACCESO") {
    throw new Error("MAP_FORBIDDEN");
  }

  let permitidas: string[] | null = null;
  if (normUpper(appUser.perfil) === "SUPERVISOR") {
    let supervisorAsignacion = normUpper(appUser.usuario);
    const nivel = normUpper(appUser.nivel_acceso);
    const sedeSupervisor = normUpper(appUser.sede);
    const referencia = normUpper(appUser.usuario_supervisor);
    if (nivel === "SEDE" && referencia) supervisorAsignacion = referencia;

    let q = admin
      .from("app_users")
      .select("cuadrilla,sede")
      .eq("perfil", "TECNICO")
      .eq("estado", "ACTIVO")
      .eq("usuario_supervisor", supervisorAsignacion);

    if (nivel === "SEDE" && sedeSupervisor) q = q.eq("sede", sedeSupervisor);

    const { data: tecnicos, error: techError } = await q;
    if (techError) throw techError;
    permitidas = [...new Set((tecnicos || []).map((x: any) => norm(x.cuadrilla)).filter(Boolean))];
  }

  return { authUser: authData.user, appUser, permiso, permitidas };
}

async function lastUpdate(admin: any) {
  const { data } = await admin
    .from("ordenes")
    .select("fecha_importacion")
    .not("fecha_importacion", "is", null)
    .order("fecha_importacion", { ascending: false })
    .limit(1);
  const value = data?.[0]?.fecha_importacion || null;
  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const publicKey = getPublicKey();
    const secretKey = getSecretKey();
    if (!url || !publicKey || !secretKey) return json({ ok:false, error:"Configuración incompleta del servidor." }, 500);

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ ok:false, error:"Sesión requerida." }, 401);

    const authClient = createClient(url, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession:false, autoRefreshToken:false },
    });
    const admin = createClient(url, secretKey, {
      auth: { persistSession:false, autoRefreshToken:false },
    });

    const ctx = await resolveContext(admin, authClient);

    let payload: Record<string, any> = {};
    if (req.method === "GET") {
      const u = new URL(req.url);
      u.searchParams.forEach((value, key) => payload[key] = value);
    } else {
      payload = await req.json().catch(() => ({}));
    }

    const accion = norm(payload.accion);

    if (accion === "contextoMapaOperativo") {
      return json({
        ok:true,
        modulo:"MAPA_OPERATIVO",
        accion:"CONTEXTO",
        motor:"POSTGRESQL",
        usuario:ctx.appUser.usuario || "",
        nombresApellidos:ctx.appUser.nombres_apellidos || "",
        correo:ctx.appUser.correo || "",
        perfil:ctx.appUser.perfil || "",
        nivelAcceso:ctx.appUser.nivel_acceso || "",
        sede:ctx.appUser.sede || "",
        permiso:{
          activo:!!ctx.permiso.activo,
          ver:!!ctx.permiso.ver,
          registrar:!!ctx.permiso.registrar,
          alcanceDatos:ctx.permiso.alcance_datos || ""
        },
        cuadrillasPermitidas:Array.isArray(ctx.permitidas) ? ctx.permitidas : null,
        totalCuadrillasPermitidas:Array.isArray(ctx.permitidas) ? ctx.permitidas.length : null
      });
    }

    if (accion === "catalogosMapaOperativo") {
      const { data, error } = await admin.rpc("mv_mapa_catalogos", { p_permitidas: ctx.permitidas });
      if (error) throw error;
      return json(data);
    }

    if (accion === "listarMapaOperativo") {
      const periodo = norm(payload.periodo);
      const sede = normUpper(payload.sede);
      const fecha = norm(payload.fecha);
      const grupos = listParam(payload.gruposTrabajo ?? payload.grupoTrabajo);
      const estados = listParam(payload.estados ?? payload.estado);
      const cuadrillas = listParam(payload.cuadrillas ?? payload.cuadrilla);
      const codigo = norm(payload.codigo);

      if (periodo && !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
        return json({ok:false,error:"El período seleccionado no es válido"},400);
      }
      if (fecha && periodo && !fecha.startsWith(periodo + "-")) {
        return json({ok:false,error:"La fecha no pertenece al período seleccionado"},400);
      }
      if (!(periodo || sede || fecha || grupos.length || estados.length || cuadrillas.length || codigo)) {
        return json({ok:false,error:"Debe seleccionar al menos un filtro para consultar el mapa"},400);
      }

      const { data, error } = await admin.rpc("mv_mapa_listar", {
        p_periodo: periodo || null,
        p_sede: sede || null,
        p_fecha: fecha || null,
        p_grupos: grupos.length ? grupos : null,
        p_estados: estados.length ? estados : null,
        p_cuadrillas: cuadrillas.length ? cuadrillas : null,
        p_codigo: codigo || null,
        p_permitidas: ctx.permitidas,
      });
      if (error) throw error;

      const rows = data || [];
      const q = normId(codigo);
      let criterioBusqueda = "";
      if (q && rows.length) {
        const first = rows[0] || {};
        if (normId(first.orden_id) === q) criterioBusqueda = "Código de orden";
        else if (normId(first.codigo_cliente) === q) criterioBusqueda = "Código de pedido";
        else if (normId(first.numero_documento) === q) criterioBusqueda = "DNI";
      }

      const ultima = await lastUpdate(admin);
      return json({
        ok:true,
        modulo:"MAPA_OPERATIVO",
        accion:"LISTAR",
        perfil:ctx.appUser.perfil,
        registros:rows.length,
        ordenes:rows.map(mapOrden),
        ultimaActualizacion:ultima,
        ultimaActualizacionTexto:ultima ? (() => {
          const raw = String(ultima);
          const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
          return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : raw;
        })() : "",
        motor:"POSTGRESQL",
        busquedaV408:true,
        multifiltroV418:true,
        criterioBusqueda,
        filasEvaluadas:rows.length,
        filasCompletasLeidas:rows.length,
        pedidoRelacionLegacyPendiente:true
      });
    }

    if (accion === "listarCtosCercanasMapaOperativo") {
      let sur = Number(payload.sur), norte = Number(payload.norte), oeste = Number(payload.oeste), este = Number(payload.este);
      if (![sur,norte,oeste,este].every(Number.isFinite)) return json({ok:false,error:"No se recibió el área visible del mapa"},400);
      if (sur > norte) [sur,norte] = [norte,sur];
      if (oeste > este) [oeste,este] = [este,oeste];
      const sede = normUpper(payload.sede);
      const limite = Math.min(Math.max(Number(payload.limite)||600,1),1000);

      let base = admin
        .from("catalogo_cto")
        .select("codigo_cto,latitud,longitud,coordenada,sede,ultima_actualizacion,orden_referencia,codigo_cliente,tipo_trabajo,puerto_referencia,veces_detectada", { count:"exact" })
        .gte("latitud",sur).lte("latitud",norte)
        .gte("longitud",oeste).lte("longitud",este);
      if (sede) base = base.eq("sede",sede);
      const { data, error, count } = await base
        .order("ultima_actualizacion",{ascending:false})
        .order("codigo_cto",{ascending:true})
        .limit(limite);
      if (error) throw error;

      const ctos = (data || []).map((x:any)=>({
        codigo:x.codigo_cto,
        latitud:x.latitud,
        longitud:x.longitud,
        coordenada:x.coordenada || (x.latitud + "," + x.longitud),
        sede:x.sede || "",
        ultimaActualizacion:x.ultima_actualizacion || "",
        ordenReferencia:x.orden_referencia || "",
        codigoCliente:x.codigo_cliente || "",
        tipoTrabajo:x.tipo_trabajo || "",
        puerto:x.puerto_referencia || "",
        vecesDetectada:Number(x.veces_detectada)||1
      }));
      return json({
        ok:true,modulo:"MAPA_OPERATIVO",accion:"LISTAR_CTO_CERCANAS",
        ctos,totalCoincidencias:count||0,mostradas:ctos.length,truncado:(count||0)>ctos.length,
        motor:"POSTGRESQL"
      });
    }

    return json({ok:false,error:"Acción no implementada en el piloto."},400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AUTH_INVALID") return json({ok:false,error:"Sesión inválida o vencida."},401);
    if (msg === "USER_NOT_LINKED") return json({ok:false,error:"El usuario todavía no está vinculado a la nueva autenticación."},403);
    if (msg === "USER_INACTIVE") return json({ok:false,error:"Usuario inactivo."},403);
    if (msg === "MAP_FORBIDDEN") return json({ok:false,error:"No tienes permiso para visualizar el Mapa Operativo."},403);
    return json({ok:false,error:msg},500);
  }
});
