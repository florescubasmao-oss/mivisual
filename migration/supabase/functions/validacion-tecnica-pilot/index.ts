import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "V2-VALIDACION-TECNICA-V490-PILOT-20260919";
const MODULO = "VALIDACION TECNICA";
const TZ = "America/Lima";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function key(v: unknown) {
  return norm(v).replace(/[^A-Z0-9]/g, "");
}
function bool(v: unknown) {
  return v === true || norm(v) === "SI" || norm(v) === "TRUE" || String(v) === "1";
}
function envKey(name: string, legacy?: string) {
  const direct = Deno.env.get(legacy || name);
  if (direct) return direct;
  const raw = Deno.env.get(name);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.default || Object.values(parsed || {})[0] || "";
  } catch (_) {
    return raw;
  }
}
function publicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || envKey("SUPABASE_PUBLISHABLE_KEYS");
}
function secretKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || envKey("SUPABASE_SECRET_KEYS");
}
function limaTimestamp(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const p: Record<string,string> = {};
  parts.forEach(x => { if (x.type !== "literal") p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
function periodNow() {
  return limaTimestamp().slice(0,7);
}
function ticketCanonGarVtr(v: unknown, tipo?: unknown) {
  const t = norm(v).replace(/\s+/g,"");
  const m = t.match(/(VTR|GAR)-?(\d+)/);
  if (m) return `${m[1]}-${m[2]}`;
  let k = norm(tipo);
  if (k === "REITERADA") k = "VTR";
  if (k === "GARANTIA") k = "GAR";
  if (!["VTR","GAR"].includes(k)) return "";
  const dig = t.replace(/\D/g,"");
  return dig ? `${k}-${dig}` : "";
}
function construirTicket(data: any) {
  const tf = norm(data.ticketFinal || data.ticket_final);
  if (tf === "NO APLICA" || tf === "NOAPLICA") return { tipoTicket:"NO APLICA", numeroTicket:"", ticketFinal:"NO APLICA", tipoValidacion:"OTRO" };
  const raw = tf || [data.tipoTicket || data.tipo_ticket, data.numeroTicket || data.numero_ticket].filter(Boolean).join("");
  const s = norm(raw).replace(/\s+/g,"");
  const m = s.match(/^(VTEXT|AT|GAR|VTR)-?([0-9]+)$/);
  if (!m) throw new Error("Ticket no válido. Use AT-, VTEXT-, GAR- o VTR- con su número.");
  const pref = m[1], num = m[2];
  return {
    tipoTicket: pref + "-",
    numeroTicket: num,
    ticketFinal: pref + "-" + num,
    tipoValidacion: pref === "GAR" ? "GAR" : pref === "VTR" ? "VTR" : "RECABLEADO"
  };
}
function telegram(sede: unknown) {
  const s = norm(sede);
  if (s === "CHICLAYO") return "https://t.me/+fAxAapb0OKpiNzM5";
  if (s === "PIURA") return "https://t.me/+XZbC8DlbbC9jMmQx";
  if (s === "TRUJILLO") return "https://t.me/+iGfBdqznjoAxMmJh";
  return "";
}
function pilotId(codigo: string, tipo: string, ticketFinal: string) {
  const tk = key(ticketFinal);
  if (!tk || tk === "NOAPLICA") return `${codigo}-${tipo}`;
  return `${codigo}-${tipo}-${tk}`;
}
function isJefaturaPerfil(perfil: unknown) {
  // V490: GAR/VTR solo puede ser modificado por JEFATURA / JEFATURA GENERAL.
  // ADMIN, SUPERVISOR y GERENCIA pueden conservar VER según app_permissions,
  // pero no escriben decisiones GAR/VTR.
  return ["JEFATURA","JEFATURA GENERAL"].includes(norm(perfil));
}
function scopeKind(alcance: unknown) {
  const a = norm(alcance);
  if (a.includes("CUADRILLA")) return "CUADRILLA";
  if (a === "SEDE" || a.includes(" SEDE")) return "SEDE";
  return "ZONA";
}

async function context(req: Request) {
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
    .select("usuario,correo,perfil,nivel_acceso,sede,cuadrilla,plataforma,estado,nombres_apellidos,auth_user_id")
    .eq("auth_user_id", ud.user.id).maybeSingle();
  if (ae || !appUser) throw new Error("El usuario Auth no está vinculado a MI VISUAL.");
  if (norm(appUser.estado) !== "ACTIVO") throw new Error("Usuario MI VISUAL inactivo.");

  const { data:perm, error:pe } = await admin.from("app_permissions")
    .select("perfil,modulo,activo,mostrar_modulo,ver,registrar,validar,descargar,alcance_datos")
    .eq("perfil", appUser.perfil).eq("modulo", MODULO).maybeSingle();
  if (pe || !perm || !perm.activo || !perm.mostrar_modulo || !perm.ver) throw new Error("Sin acceso a Validación Técnica.");
  return { admin, appUser, perm, authUser:ud.user };
}

function applyScope(q:any, ctx:any) {
  const k = scopeKind(ctx.perm.alcance_datos);
  if (k === "CUADRILLA") {
    if (!txt(ctx.appUser.cuadrilla)) throw new Error("El usuario no tiene cuadrilla configurada.");
    return q.eq("cuadrilla",ctx.appUser.cuadrilla);
  }
  if (k === "SEDE") {
    if (!txt(ctx.appUser.sede)) throw new Error("El usuario no tiene sede configurada.");
    return q.eq("sede",ctx.appUser.sede);
  }
  return q;
}

async function aplicarVencidos(admin:any) {
  const { data, error } = await admin.rpc("mv_vt_aplicar_vencidos");
  if (error) throw error;
  return Number(data || 0);
}

async function contextoAccion(ctx:any) {
  return {
    ok:true, version:VERSION, modulo:MODULO,
    usuario:{
      usuario:ctx.appUser.usuario, perfil:ctx.appUser.perfil, sede:ctx.appUser.sede,
      cuadrilla:ctx.appUser.cuadrilla, nivel:ctx.appUser.nivel_acceso
    },
    permiso:{
      ver:!!ctx.perm.ver, registrar:!!ctx.perm.registrar, validar:!!ctx.perm.validar,
      descargar:!!ctx.perm.descargar, alcance:ctx.perm.alcance_datos
    },
    reglas:{
      recableadoAutoMinutos:15,
      garVtrAuto:false,
      garVtrValidador:"JEFATURA",
      garVtrResultados:["BONO","NO BONO"],
      registro:"TECNICO",
      duplicado:"CODIGO + TIPO + TICKET"
    },
    fuente:"POSTGRESQL PILOTO"
  };
}

async function listar(ctx:any, data:any) {
  await aplicarVencidos(ctx.admin);
  let q = ctx.admin.from("validacion_tecnica_migracion")
    .select("id,registro_at,sede,tecnico,cuadrilla,tipo_validacion,codigo,tipo_ticket,numero_ticket,ticket_final,dni_cliente,motivo_tecnico,estado,resultado_final,validado_por,perfil_validador,validado_at,motivo_validacion,link_telegram,hora_limite,origen_orden,periodo,puntaje_vtr_gar,fuente")
    .order("registro_at",{ascending:false}).limit(1000);
  q = applyScope(q,ctx);
  const periodo = txt(data.periodo);
  if (periodo) {
    if (!/^20\d{2}-\d{2}$/.test(periodo)) throw new Error("Periodo no válido.");
    q=q.eq("periodo",periodo);
  }
  const tipo=norm(data.tipoValidacion||data.tipo_validacion);
  if (tipo) q=q.eq("tipo_validacion",tipo);
  const estado=norm(data.estado);
  if (estado) q=q.eq("estado",estado);
  const sede=norm(data.sede);
  if (sede && scopeKind(ctx.perm.alcance_datos)==="ZONA") q=q.eq("sede",sede);
  const {data:rows,error}=await q;
  if(error) throw error;
  return {ok:true,version:VERSION,registros:rows?.length||0,lista:rows||[],fuente:"POSTGRESQL PILOTO"};
}

async function buscar(ctx:any,data:any) {
  if (norm(ctx.appUser.perfil)!=="TECNICO" || !ctx.perm.registrar) throw new Error("La búsqueda para registro corresponde al perfil Técnico.");
  const codigo=txt(data.codigo), dni=txt(data.dni||data.dniCliente), ticket=txt(data.ticketFinal||data.ticket);
  if(!codigo && !dni && !ticket) throw new Error("Ingrese Código, DNI o Ticket.");
  let q=ctx.admin.from("ordenes")
    .select("orden_id,codigo_cliente,numero_documento,codigo_seguimiento,tipo_trabajo,estado,cuadrilla,sede,cliente,fecha_solicitud,fecha_ultimo_estado")
    .eq("cuadrilla",ctx.appUser.cuadrilla)
    .order("fecha_ultimo_estado",{ascending:false,nullsFirst:false}).limit(100);
  if(codigo) q=q.eq("codigo_cliente",codigo);
  if(dni) q=q.eq("numero_documento",dni);
  if(ticket) q=q.eq("codigo_seguimiento",ticket);
  const {data:rows,error}=await q;
  if(error) throw error;
  return {
    ok:true,version:VERSION,registros:rows?.length||0,
    lista:(rows||[]).map((x:any)=>({
      ...x, codigo:x.codigo_cliente, dni:x.numero_documento, ticketFinal:x.codigo_seguimiento,
      fuenteValidadaV430:"SI"
    })),
    fuente:"ORDENES POSTGRESQL"
  };
}

async function revalidarV430(ctx:any,codigo:string,dni:string,ticketFinal:string) {
  const {data:rows,error}=await ctx.admin.from("ordenes")
    .select("orden_id,codigo_cliente,numero_documento,codigo_seguimiento,cuadrilla,estado")
    .eq("cuadrilla",ctx.appUser.cuadrilla)
    .eq("codigo_cliente",codigo)
    .eq("numero_documento",dni)
    .eq("codigo_seguimiento",ticketFinal)
    .limit(20);
  if(error) throw error;
  if(!rows?.length) throw new Error("La atención seleccionada cambió o ya no coincide con Código + DNI + Ticket. Vuelva a buscarla antes de registrar.");
  return rows;
}

async function registrar(ctx:any,data:any) {
  if (norm(ctx.appUser.perfil)!=="TECNICO" || !ctx.perm.registrar) throw new Error("Solo Técnico puede registrar una Validación Técnica.");
  if (!txt(ctx.appUser.cuadrilla)) throw new Error("El técnico no tiene cuadrilla configurada.");
  const t=construirTicket(data);
  const codigo=txt(data.codigo);
  const dni=txt(data.dni||data.dniCliente);
  const motivo=txt(data.motivoTecnico||data.motivo);
  if(!codigo) throw new Error("Código obligatorio.");
  if(!dni) throw new Error("DNI del cliente obligatorio.");
  if(!motivo) throw new Error("Motivo técnico obligatorio.");
  let origen=norm(data.origenOrden||data.origen_orden);
  if(["GAR","VTR"].includes(t.tipoValidacion) && !["PROPIA","ASIGNADA"].includes(origen)) {
    throw new Error("GAR/VTR exige ORIGEN_ORDEN PROPIA o ASIGNADA.");
  }
  if(!["GAR","VTR"].includes(t.tipoValidacion)) origen="";
  if(bool(data.fuenteValidadaV430||data.fuente_validada_v430)) {
    await revalidarV430(ctx,codigo,dni,t.ticketFinal);
  }
  const now=new Date(), registro=limaTimestamp(now);
  const deadline=t.tipoValidacion==="RECABLEADO" ? limaTimestamp(new Date(now.getTime()+15*60000)) : null;
  const id=pilotId(codigo,t.tipoValidacion,t.ticketFinal);
  const row={
    id,source_row:null,registro_at:registro,sede:ctx.appUser.sede,tecnico:ctx.appUser.usuario,
    cuadrilla:ctx.appUser.cuadrilla,tipo_validacion:t.tipoValidacion,codigo,
    tipo_ticket:t.tipoTicket,numero_ticket:t.numeroTicket,ticket_final:t.ticketFinal,
    dni_cliente:dni,motivo_tecnico:motivo,estado:"PENDIENTE",resultado_final:null,
    validado_por:null,perfil_validador:null,validado_at:null,motivo_validacion:null,
    link_telegram:telegram(ctx.appUser.sede),hora_limite:deadline,origen_orden:origen||null,
    periodo:registro.slice(0,7),fuente:"PILOT_POSTGRESQL",puntaje_vtr_gar:0
  };
  const {data:inserted,error}=await ctx.admin.from("validacion_tecnica_migracion").insert(row).select("*").single();
  if(error) {
    if(String(error.code)==="23505") throw new Error("Ya existe una validación para este Código + Tipo + Ticket.");
    throw error;
  }
  return {ok:true,version:VERSION,mensaje:"Validación registrada en piloto PostgreSQL.",registro:inserted};
}

async function validar(ctx:any,data:any) {
  if(!ctx.perm.validar) throw new Error("El perfil no tiene permiso VALIDAR.");
  await aplicarVencidos(ctx.admin);
  const id=txt(data.id);
  const resultado=norm(data.resultado);
  const motivo=txt(data.motivoValidacion||data.motivo);
  if(!id) throw new Error("ID obligatorio.");
  const {data:row,error:re}=await ctx.admin.from("validacion_tecnica_migracion").select("*").eq("id",id).maybeSingle();
  if(re||!row) throw new Error("No se encontró la Validación Técnica.");
  if(norm(row.estado)!=="PENDIENTE") throw new Error("La validación ya no está PENDIENTE.");

  const tipo=norm(row.tipo_validacion), perfil=norm(ctx.appUser.perfil);
  let puntaje=0;
  if(["GAR","VTR"].includes(tipo)) {
    if(!isJefaturaPerfil(perfil)) throw new Error("Solo Jefatura puede validar o modificar casos VTR/GAR.");
    if(!["BONO","NO BONO"].includes(resultado)) throw new Error("GAR/VTR solo permite BONO o NO BONO.");
    if(!motivo) throw new Error("El comentario de Jefatura es obligatorio.");
    const ticket=ticketCanonGarVtr(row.ticket_final,tipo);
    const {data:gv,error:ge}=await ctx.admin.from("mv_vt_gar_vtr_contexto_ticket")
      .select("periodo,ticket,estado_responsabilidad,estado_win,bono_habilitado,ordenes_win")
      .eq("periodo",row.periodo).eq("ticket",ticket).maybeSingle();
    if(ge||!gv) throw new Error("No se pudo resolver el contexto GAR/VTR del ticket.");
    if(norm(gv.estado_win)!=="FINALIZADA") throw new Error("BONO / NO BONO solo se evalúa cuando la orden WIN está FINALIZADA.");
    if(!gv.bono_habilitado) throw new Error(`BONO / NO BONO solo se habilita cuando el caso está confirmado como SI ES GAR/VTR. Estado actual: ${gv.estado_responsabilidad}.`);
    if(resultado==="BONO") {
      puntaje=Number(data.puntajeVtrGar??data.puntaje_vtr_gar);
      if(!Number.isFinite(puntaje)||puntaje<=0) throw new Error("Jefatura debe ingresar un puntaje VTR/GAR mayor a 0 cuando corresponde BONO.");
    } else puntaje=0;
  } else {
    if(!["RECABLEADO","OTRO"].includes(tipo)) throw new Error("Tipo de validación no soportado.");
    if(!["APROBADO","RECHAZADO","OBSERVADO"].includes(resultado)) throw new Error("Resultado no válido.");
    if(perfil==="SUPERVISOR" && norm(ctx.appUser.sede)!==norm(row.sede)) throw new Error("El Supervisor solo puede validar su sede.");
    if(!["SUPERVISOR","JEFATURA","ADMIN","ADMINISTRADOR"].includes(perfil)) throw new Error("Perfil no autorizado para validar.");
  }

  const now=limaTimestamp();
  const update={
    estado:resultado,resultado_final:resultado,validado_por:ctx.appUser.usuario,
    perfil_validador:ctx.appUser.perfil,validado_at:now,motivo_validacion:motivo||null,
    puntaje_vtr_gar:puntaje,updated_at:new Date().toISOString()
  };
  const {data:updated,error:ue}=await ctx.admin.from("validacion_tecnica_migracion")
    .update(update).eq("id",id).eq("estado","PENDIENTE").select("*").maybeSingle();
  if(ue) throw ue;
  if(!updated) throw new Error("La validación cambió de estado antes de guardar. Actualice la lista.");
  return {ok:true,version:VERSION,mensaje:"Validación actualizada en piloto PostgreSQL.",registro:updated};
}

Deno.serve(async (req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req);
    let data:any={};
    if(req.method==="GET") {
      const u=new URL(req.url);
      u.searchParams.forEach((v,k)=>data[k]=v);
    } else {
      try { data=await req.json(); } catch(_) { data={}; }
    }
    const accion=txt(data.accion||new URL(req.url).searchParams.get("accion"));
    if(accion==="contextoValidacionTecnica") return json(await contextoAccion(ctx));
    if(accion==="listarValidacionTecnica") return json(await listar(ctx,data));
    if(accion==="buscarDatosValidacionTecnica") return json(await buscar(ctx,data));
    if(accion==="registrarValidacionTecnica") return json(await registrar(ctx,data));
    if(accion==="validarValidacionTecnica") return json(await validar(ctx,data));
    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const msg=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,error:msg},401);
  }
});
