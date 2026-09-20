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

function validEmail(v: unknown) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(norm(v));
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

async function resolveAdminContext(admin: any, authClient: any) {
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData?.user) throw new Error("AUTH_INVALID");

  const { data: appUser, error: userError } = await admin
    .from("app_users")
    .select("id,auth_user_id,usuario,correo,perfil,nivel_acceso,sede,estado,nombres_apellidos")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (userError) throw userError;
  if (!appUser) throw new Error("USER_NOT_LINKED");
  if (normUpper(appUser.estado) !== "ACTIVO") throw new Error("USER_INACTIVE");

  const { data: permiso, error: permError } = await admin
    .from("app_permissions")
    .select("activo,ver,editar,administrar,alcance_datos")
    .eq("perfil", appUser.perfil)
    .eq("modulo", "ADMINISTRACION")
    .maybeSingle();

  if (permError) throw permError;
  if (!permiso || !permiso.activo || !permiso.ver || !permiso.administrar) {
    throw new Error("ADMIN_FORBIDDEN");
  }

  return { authUser: authData.user, appUser, permiso };
}

async function audit(admin: any, ctx: any, data: Record<string, unknown>) {
  try {
    await admin.from("auth_access_audit").insert({
      actor_auth_user_id: ctx?.authUser?.id || null,
      actor_usuario: ctx?.appUser?.usuario || null,
      actor_perfil: ctx?.appUser?.perfil || null,
      accion: data.accion || "SIN_ACCION",
      target_app_user_id: data.target_app_user_id || null,
      target_usuario: data.target_usuario || null,
      target_correo: data.target_correo || null,
      target_auth_user_id: data.target_auth_user_id || null,
      resultado: data.resultado || "SIN_RESULTADO",
      detalle: data.detalle || {},
    });
  } catch (_) {
    // La auditoría nunca debe exponer secretos ni bloquear la respuesta principal.
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let admin: any = null;
  let ctx: any = null;

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const publicKey = getPublicKey();
    const secretKey = getSecretKey();
    if (!url || !publicKey || !secretKey) {
      return json({ ok:false, error:"Configuración incompleta del servidor." }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return json({ ok:false, error:"Sesión requerida." }, 401);
    }

    const authClient = createClient(url, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession:false, autoRefreshToken:false },
    });

    admin = createClient(url, secretKey, {
      auth: { persistSession:false, autoRefreshToken:false },
    });

    ctx = await resolveAdminContext(admin, authClient);

    let payload: Record<string, any> = {};
    if (req.method === "GET") {
      const u = new URL(req.url);
      u.searchParams.forEach((value, key) => payload[key] = value);
    } else {
      payload = await req.json().catch(() => ({}));
    }

    const accion = norm(payload.accion);

    if (accion === "contextoAuthAdmin") {
      return json({
        ok:true,
        modulo:"ADMINISTRACION",
        accion:"CONTEXTO_AUTH_ADMIN",
        usuario:ctx.appUser.usuario,
        perfil:ctx.appUser.perfil,
        sede:ctx.appUser.sede || "",
        nivelAcceso:ctx.appUser.nivel_acceso || "",
        permiso:{
          activo:!!ctx.permiso.activo,
          ver:!!ctx.permiso.ver,
          editar:!!ctx.permiso.editar,
          administrar:!!ctx.permiso.administrar,
          alcanceDatos:ctx.permiso.alcance_datos || "",
        }
      });
    }

    const { data: allUsers, error: usersError } = await admin
      .from("app_users")
      .select("id,auth_user_id,usuario,correo,perfil,nivel_acceso,sede,estado,usuario_supervisor,nombres_apellidos,cuadrilla")
      .order("perfil", { ascending:true })
      .order("sede", { ascending:true })
      .order("usuario", { ascending:true });

    if (usersError) throw usersError;

    const users = allUsers || [];

    if (accion === "resumenAuthMigracion") {
      const resumen = {
        total: users.length,
        activos: users.filter((u:any)=>normUpper(u.estado)==="ACTIVO").length,
        authVinculados: users.filter((u:any)=>!!u.auth_user_id).length,
        sinCorreo: users.filter((u:any)=>!norm(u.correo)).length,
        correoInvalido: users.filter((u:any)=>!!norm(u.correo) && !validEmail(u.correo)).length,
        elegiblesPendientes: users.filter((u:any)=>
          normUpper(u.estado)==="ACTIVO" &&
          validEmail(u.correo) &&
          !u.auth_user_id
        ).length,
      };
      return json({
        ok:true,
        modulo:"ADMINISTRACION",
        accion:"RESUMEN_AUTH_MIGRACION",
        resumen,
      });
    }

    if (accion === "listarUsuariosAuth") {
      const filtroEstado = normUpper(payload.estado);
      const filtroPerfil = normUpper(payload.perfil);
      const filtroSede = normUpper(payload.sede);
      const q = normUpper(payload.q);
      const estadoAuth = normUpper(payload.estadoAuth);

      const lista = users.filter((u:any)=>{
        if (filtroEstado && normUpper(u.estado) !== filtroEstado) return false;
        if (filtroPerfil && normUpper(u.perfil) !== filtroPerfil) return false;
        if (filtroSede && normUpper(u.sede) !== filtroSede) return false;
        if (estadoAuth === "VINCULADO" && !u.auth_user_id) return false;
        if (estadoAuth === "PENDIENTE" && u.auth_user_id) return false;
        if (q) {
          const bolsa = normUpper([
            u.usuario,u.correo,u.nombres_apellidos,u.perfil,u.sede,u.cuadrilla
          ].join(" "));
          if (!bolsa.includes(q)) return false;
        }
        return true;
      }).map((u:any)=>({
        id:u.id,
        usuario:u.usuario,
        correo:u.correo || "",
        correoValido:validEmail(u.correo),
        perfil:u.perfil || "",
        nivelAcceso:u.nivel_acceso || "",
        sede:u.sede || "",
        estado:u.estado || "",
        usuarioSupervisor:u.usuario_supervisor || "",
        nombresApellidos:u.nombres_apellidos || "",
        cuadrilla:u.cuadrilla || "",
        authVinculado:!!u.auth_user_id,
      }));

      return json({
        ok:true,
        modulo:"ADMINISTRACION",
        accion:"LISTAR_USUARIOS_AUTH",
        registros:lista.length,
        usuarios:lista,
      });
    }

    if (accion === "previsualizarProvisionAuth") {
      const perfil = normUpper(payload.perfil || "");
      const sede = normUpper(payload.sede || "");
      const permitidos = new Set(["SUPERVISOR","TECNICO","ALMACEN","JEFATURA ALMACEN"]);
      if (perfil && !permitidos.has(perfil)) {
        return json({ok:false,error:"Perfil no habilitado para provisión gradual."},400);
      }
      const candidatos = users.filter((u:any)=>{
        if (normUpper(u.estado)!=="ACTIVO" || u.auth_user_id || !validEmail(u.correo)) return false;
        if (perfil && normUpper(u.perfil)!==perfil) return false;
        if (sede && normUpper(u.sede)!==sede) return false;
        return permitidos.has(normUpper(u.perfil));
      }).map((u:any)=>({
        id:u.id,usuario:u.usuario,correo:u.correo,perfil:u.perfil,sede:u.sede||"",
        nombresApellidos:u.nombres_apellidos||"",cuadrilla:u.cuadrilla||""
      }));
      return json({ok:true,modulo:"ADMINISTRACION",accion:"PREVISUALIZAR_PROVISION_AUTH",registros:candidatos.length,usuarios:candidatos});
    }

    if (accion === "crearAccesoAuthSinPassword") {
      const targetUsuario = norm(payload.usuarioObjetivo);
      const confirmacion = norm(payload.confirmacion);
      if (!targetUsuario) return json({ok:false,error:"Debe indicar usuario objetivo."},400);
      if (confirmacion !== "PROVISIONAR_AUTH_SIN_PASSWORD") {
        return json({ok:false,error:"Confirmación explícita inválida."},400);
      }

      const objetivo = users.find((u:any)=>normUpper(u.usuario)===normUpper(targetUsuario));
      if (!objetivo) return json({ok:false,error:"El usuario no existe en app_users."},404);
      if (normUpper(objetivo.estado)!=="ACTIVO") return json({ok:false,error:"El usuario objetivo está inactivo."},400);
      if (!validEmail(objetivo.correo)) return json({ok:false,error:"El usuario no tiene un correo válido."},400);
      if (objetivo.auth_user_id) {
        return json({ok:true,modulo:"ADMINISTRACION",accion:"CREAR_ACCESO_AUTH_SIN_PASSWORD",yaExistia:true,usuario:objetivo.usuario,correo:objetivo.correo,perfil:objetivo.perfil,sede:objetivo.sede||"",authVinculado:true});
      }

      const perfilObjetivo=normUpper(objetivo.perfil);
      const permitidos = new Set(["SUPERVISOR","TECNICO","ALMACEN","JEFATURA ALMACEN"]);
      if (!permitidos.has(perfilObjetivo)) {
        return json({ok:false,error:"El perfil requiere alta manual controlada."},400);
      }

      const { data: creado, error: crearError } = await admin.auth.admin.createUser({
        email: norm(objetivo.correo).toLowerCase(),
        email_confirm: true,
        user_metadata: {
          source:"MI_VISUAL_AUTH_ROLLING_MIGRATION",
          usuario:objetivo.usuario,
          requiere_configurar_password:true,
        },
        app_metadata: {
          mi_visual_usuario:objetivo.usuario,
          mi_visual_perfil:objetivo.perfil,
        }
      });

      if (crearError || !creado?.user) {
        await audit(admin,ctx,{accion:"CREAR_ACCESO_AUTH_SIN_PASSWORD",target_app_user_id:objetivo.id,target_usuario:objetivo.usuario,target_correo:objetivo.correo,resultado:"ERROR",detalle:{mensaje:crearError?.message||"No se pudo crear Auth."}});
        return json({ok:false,error:crearError?.message||"No se pudo crear el acceso Auth."},400);
      }

      const { data: vinculado, error: vinculoError } = await admin
        .from("app_users")
        .select("id,auth_user_id,usuario,correo,perfil,nivel_acceso,sede,estado")
        .eq("id", objetivo.id)
        .maybeSingle();
      if (vinculoError) throw vinculoError;

      if (!vinculado?.auth_user_id || String(vinculado.auth_user_id)!==String(creado.user.id)) {
        await admin.auth.admin.deleteUser(creado.user.id).catch(()=>{});
        await audit(admin,ctx,{accion:"CREAR_ACCESO_AUTH_SIN_PASSWORD",target_app_user_id:objetivo.id,target_usuario:objetivo.usuario,target_correo:objetivo.correo,resultado:"REVERTIDO",detalle:{motivo:"Auth creado sin vínculo consistente; alta revertida."}});
        return json({ok:false,error:"Auth fue creado pero no se vinculó correctamente; el alta fue revertida."},500);
      }

      await audit(admin,ctx,{accion:"CREAR_ACCESO_AUTH_SIN_PASSWORD",target_app_user_id:vinculado.id,target_usuario:vinculado.usuario,target_correo:vinculado.correo,target_auth_user_id:vinculado.auth_user_id,resultado:"OK",detalle:{perfil:vinculado.perfil,sede:vinculado.sede||"",sinPassword:true,emailEnviado:false}});
      return json({
        ok:true,modulo:"ADMINISTRACION",accion:"CREAR_ACCESO_AUTH_SIN_PASSWORD",
        yaExistia:false,usuario:vinculado.usuario,correo:vinculado.correo,perfil:vinculado.perfil,
        sede:vinculado.sede||"",authVinculado:true,requiereConfigurarPassword:true,emailEnviado:false
      });
    }

    if (accion === "crearAccesoAuth") {
      const targetUsuario = norm(payload.usuarioObjetivo);
      const targetCorreo = norm(payload.correoObjetivo).toLowerCase();
      const passwordTemporal = String(payload.passwordTemporal ?? "");

      if (!targetUsuario && !targetCorreo) {
        return json({ok:false,error:"Debe indicar usuario o correo objetivo."},400);
      }
      if (passwordTemporal.length < 8) {
        return json({ok:false,error:"La contraseña temporal debe tener al menos 8 caracteres."},400);
      }

      const objetivo = users.find((u:any)=>
        (targetUsuario && normUpper(u.usuario) === normUpper(targetUsuario)) ||
        (targetCorreo && norm(u.correo).toLowerCase() === targetCorreo)
      );

      if (!objetivo) return json({ok:false,error:"El usuario no existe en app_users."},404);
      if (normUpper(objetivo.estado) !== "ACTIVO") {
        return json({ok:false,error:"El usuario objetivo está inactivo."},400);
      }
      if (!validEmail(objetivo.correo)) {
        return json({ok:false,error:"El usuario no tiene un correo válido para Supabase Auth."},400);
      }
      if (objetivo.auth_user_id) {
        return json({
          ok:true,
          modulo:"ADMINISTRACION",
          accion:"CREAR_ACCESO_AUTH",
          yaExistia:true,
          usuario:objetivo.usuario,
          correo:objetivo.correo,
          perfil:objetivo.perfil,
          sede:objetivo.sede || "",
          authVinculado:true,
        });
      }

      const { data: creado, error: crearError } = await admin.auth.admin.createUser({
        email: objetivo.correo,
        password: passwordTemporal,
        email_confirm: true,
        user_metadata: {
          source:"MI_VISUAL_AUTH_MIGRATION",
          usuario:objetivo.usuario,
        }
      });

      if (crearError || !creado?.user) {
        await audit(admin,ctx,{
          accion:"CREAR_ACCESO_AUTH",
          target_app_user_id:objetivo.id,
          target_usuario:objetivo.usuario,
          target_correo:objetivo.correo,
          resultado:"ERROR",
          detalle:{ mensaje:crearError?.message || "No se pudo crear el acceso Auth." }
        });
        return json({ok:false,error:crearError?.message || "No se pudo crear el acceso Auth."},400);
      }

      const { data: vinculado, error: vinculoError } = await admin
        .from("app_users")
        .select("id,auth_user_id,usuario,correo,perfil,nivel_acceso,sede,estado")
        .eq("id", objetivo.id)
        .maybeSingle();

      if (vinculoError) throw vinculoError;

      if (!vinculado?.auth_user_id || String(vinculado.auth_user_id) !== String(creado.user.id)) {
        await admin.auth.admin.deleteUser(creado.user.id).catch(()=>{});
        await audit(admin,ctx,{
          accion:"CREAR_ACCESO_AUTH",
          target_app_user_id:objetivo.id,
          target_usuario:objetivo.usuario,
          target_correo:objetivo.correo,
          resultado:"REVERTIDO",
          detalle:{ motivo:"Auth creado sin vínculo consistente; alta revertida." }
        });
        return json({ok:false,error:"Auth fue creado pero no se vinculó correctamente; el alta fue revertida."},500);
      }

      await audit(admin,ctx,{
        accion:"CREAR_ACCESO_AUTH",
        target_app_user_id:vinculado.id,
        target_usuario:vinculado.usuario,
        target_correo:vinculado.correo,
        target_auth_user_id:vinculado.auth_user_id,
        resultado:"OK",
        detalle:{ perfil:vinculado.perfil, sede:vinculado.sede || "" }
      });

      return json({
        ok:true,
        modulo:"ADMINISTRACION",
        accion:"CREAR_ACCESO_AUTH",
        yaExistia:false,
        usuario:vinculado.usuario,
        correo:vinculado.correo,
        perfil:vinculado.perfil,
        nivelAcceso:vinculado.nivel_acceso || "",
        sede:vinculado.sede || "",
        authVinculado:true,
      });
    }

    return json({ok:false,error:"Acción no implementada."},400);

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AUTH_INVALID") return json({ok:false,error:"Sesión inválida o vencida."},401);
    if (msg === "USER_NOT_LINKED") return json({ok:false,error:"Usuario no vinculado a Supabase Auth."},403);
    if (msg === "USER_INACTIVE") return json({ok:false,error:"Usuario inactivo."},403);
    if (msg === "ADMIN_FORBIDDEN") return json({ok:false,error:"No tiene permiso de administración de usuarios."},403);
    return json({ok:false,error:msg || "Error interno."},500);
  }
});
