import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const VERSION="V2-EQUIPOS-AVERIADOS-V399-V537-PILOT-20260919";
const BUCKET="mi-visual-evidencias";
const TIPOS=["ONT HUAWEI","ONT ZTE","MESH HUAWEI","MESH ZTE","WINBOX","TELEFONO"];
const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS"
};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}})}
function txt(v:unknown){return String(v??"").trim()}
function norm(v:unknown){return txt(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]+/g,"").trim()}
function escPdf(v:unknown){return txt(v).replace(/[\u2013\u2014]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')}
function envKey(name:string,legacy?:string){const d=Deno.env.get(legacy||name);if(d)return d;const raw=Deno.env.get(name)||"";if(!raw)return "";try{const p=JSON.parse(raw);return p?.default||Object.values(p||{})[0]||""}catch(_){return raw}}
function publicKey(){return Deno.env.get("SUPABASE_ANON_KEY")||envKey("SUPABASE_PUBLISHABLE_KEYS")}
function secretKey(){return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||envKey("SUPABASE_SECRET_KEYS")}
function esTecnico(p:unknown){return norm(p)==="TECNICO"}
function esResponsable(p:unknown){return ["ALMACEN","RESPONSABLEALMACEN","RESPONSABLEDEALMACEN"].includes(norm(p))}
function esJefAlmacen(p:unknown){return norm(p)==="JEFATURAALMACEN"}
function puedeGestionar(p:unknown){return esResponsable(p)||esJefAlmacen(p)}
function isoDate(v:unknown){const s=txt(v);if(!s)return "";return s.slice(0,10)}
function displayDate(v:unknown){const s=isoDate(v);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"/"+m[2]+"/"+m[1]:s}
function displayTime(v:unknown){return txt(v).slice(0,8)}
function requestId(v:unknown){let s=txt(v).toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,100);return s||("EAREQ-"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase())}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"",pub=publicKey(),sec=secretKey();
  if(!url||!pub||!sec)throw new Error("Configuración Supabase incompleta.");
  const h=req.headers.get("Authorization")||"";if(!h.toLowerCase().startsWith("bearer "))throw new Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:h}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser();if(ue||!ud?.user)throw new Error("Sesión no válida.");
  const {data:u,error}=await admin.from("app_users")
    .select("usuario,nombres_apellidos,perfil,sede,plataforma,cuadrilla,estado,auth_user_id")
    .eq("auth_user_id",ud.user.id).maybeSingle();
  if(error||!u)throw new Error("Usuario MI VISUAL no vinculado.");
  if(norm(u.estado)!=="ACTIVO")throw new Error("Usuario inactivo.");
  const {data:p,error:pe}=await admin.from("app_permissions")
    .select("activo,mostrar_modulo,ver,registrar,editar,observar,aprobar,validar,descargar,administrar,alcance_datos")
    .eq("perfil",u.perfil).eq("modulo","EQUIPOS AVERIADOS").maybeSingle();
  if(pe||!p||!p.activo||!p.ver||norm(p.alcance_datos)==="SINACCESO")throw new Error("No tienes acceso a Equipos Averiados.");
  return {admin,u,p};
}
async function input(req:Request){if(req.method==="GET"){const o:any={};new URL(req.url).searchParams.forEach((v,k)=>o[k]=v);return o}try{return await req.json()}catch(_){return {}}}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw new Error(error.message);return data}

function visible(ctx:any,x:any){
  if(esTecnico(ctx.u.perfil))return norm(x.usuario_tecnico)===norm(ctx.u.usuario)||(ctx.u.cuadrilla&&norm(x.cuadrilla)===norm(ctx.u.cuadrilla));
  if(esResponsable(ctx.u.perfil))return norm(x.sede)===norm(ctx.u.sede);
  return true;
}
function mapSolicitud(x:any){
  return {
    fila:x.source_row||0,id:x.id,
    fechaRegistro:x.fecha_registro||"",horaRegistro:x.hora_registro||"",
    fechaRegistroVisible:displayDate(x.fecha_registro),horaRegistroVisible:displayTime(x.hora_registro),
    origenRegistro:x.origen_registro||"",registradoPor:x.registrado_por||"",perfilRegistro:x.perfil_registro||"",
    sede:x.sede||"",plataforma:x.plataforma||"",cuadrilla:x.cuadrilla||"",
    usuarioTecnico:x.usuario_tecnico||"",tecnico:x.tecnico||"",estado:x.estado||"",
    cantidadReferencial:Number(x.cantidad_referencial||0),equipos:Array.isArray(x.equipos)?x.equipos:[],
    fechaCompletadoTecnico:x.fecha_completado_tecnico||"",horaCompletadoTecnico:x.hora_completado_tecnico||"",
    validadoPor:x.validado_por||"",perfilValidacion:x.perfil_validacion||"",
    fechaValidacion:x.fecha_validacion||"",horaValidacion:x.hora_validacion||"",
    fechaValidacionVisible:displayDate(x.fecha_validacion),horaValidacionVisible:displayTime(x.hora_validacion),
    observacionAlmacen:x.observacion_almacen||"",idCargo:x.id_cargo||"",linkCargo:x.link_cargo||"",
    estadoWin:x.estado_win||"",fechaEntregaWin:x.fecha_entrega_win||"",horaEntregaWin:x.hora_entrega_win||"",
    recibidoWinPor:x.recibido_win_por||"",documentoWin:x.documento_win||"",observacionWin:x.observacion_win||"",
    ultimaActualizacion:x.ultima_actualizacion||"",historial:Array.isArray(x.historial)?x.historial:[],
    ultimaSolicitudRecepcion:x.ultima_solicitud_id_recepcion||"",
    sourceKind:x.source_kind||""
  };
}
async function signed(admin:any,v:any){
  const s=txt(v),prefix="storage://"+BUCKET+"/";if(!s.startsWith(prefix))return s;
  const {data,error}=await admin.storage.from(BUCKET).createSignedUrl(s.slice(prefix.length),3600);
  return error?"":data.signedUrl;
}
async function mapCargo(admin:any,x:any){
  const link=await signed(admin,x.link_pdf);
  return {
    idCargo:x.id_cargo,idSolicitud:x.id_solicitud,fechaCargo:x.fecha_cargo||"",horaCargo:x.hora_cargo||"",
    fechaCargoVisible:displayDate(x.fecha_cargo),horaCargoVisible:displayTime(x.hora_cargo),
    sede:x.sede||"",plataforma:x.plataforma||"",cuadrilla:x.cuadrilla||"",
    usuarioTecnico:x.usuario_tecnico||"",tecnico:x.tecnico||"",recibidoPor:x.recibido_por||"",
    perfilRecibe:x.perfil_recibe||"",totalEquipos:Number(x.total_equipos||0),equipos:Array.isArray(x.equipos)?x.equipos:[],
    linkPdf:link,nombrePdf:x.nombre_pdf||"",estado:x.estado||"GENERADO",
    solicitudIdCliente:x.solicitud_id_cliente||""
  };
}
async function listar(ctx:any,d:any){
  const t0=Date.now();
  const {data,error}=await ctx.admin.from("mv_ea_solicitudes_v1").select("*").order("fecha_registro",{ascending:false}).order("hora_registro",{ascending:false});
  if(error)throw error;
  const fs=norm(d.sede),fc=norm(d.cuadrilla),ft=norm(d.usuarioTecnico||d.tecnico),fe=norm(d.estado),
        fTipo=norm(d.tipoEquipo),fSerie=norm(d.serie),fCodigo=norm(d.codigoCliente),desde=txt(d.desde),hasta=txt(d.hasta);
  const rows=(data||[]).filter((x:any)=>{
    if(!visible(ctx,x))return false;
    if(fs&&norm(x.sede)!==fs)return false;
    if(fc&&norm(x.cuadrilla)!==fc)return false;
    if(ft&&norm(x.usuario_tecnico)!==ft&&!norm(x.tecnico).includes(ft))return false;
    if(fe&&norm(x.estado)!==fe)return false;
    const f=isoDate(x.fecha_registro);if(desde&&f&&f<desde)return false;if(hasta&&f&&f>hasta)return false;
    const eq=Array.isArray(x.equipos)?x.equipos:[];
    if(fTipo&&!eq.some((e:any)=>norm(e.tipo)===fTipo))return false;
    if(fSerie&&!eq.some((e:any)=>norm(e.serie).includes(fSerie)))return false;
    if(fCodigo&&!eq.some((e:any)=>norm(e.codigoCliente).includes(fCodigo)))return false;
    return true;
  }).map(mapSolicitud);
  const resumen={total:rows.length,pendienteRegistro:0,pendienteEntrega:0,parcial:0,recibido:0,observado:0,rechazado:0,totalEquipos:0};
  for(const x of rows){
    resumen.totalEquipos+=x.equipos.length;const e=norm(x.estado);
    if(e==="PENDIENTEDEREGISTROPORTECNICO")resumen.pendienteRegistro++;
    else if(e==="PENDIENTEDEENTREGA")resumen.pendienteEntrega++;
    else if(e==="RECIBIDOPARCIALMENTE")resumen.parcial++;
    else if(e==="RECIBIDOPORALMACEN")resumen.recibido++;
    else if(e==="OBSERVADO")resumen.observado++;
    else if(e==="RECHAZADO")resumen.rechazado++;
  }
  return {ok:true,version:VERSION,modulo:"EQUIPOS_AVERIADOS",accion:"LISTAR",perfil:ctx.u.perfil,resumen,solicitudes:rows,registros:rows.length,optimizadoV537:true,lecturaSelectivaTecnico:esTecnico(ctx.u.perfil),duracionMs:Date.now()-t0,fuente:"POSTGRESQL PILOTO"};
}
async function listarCargos(ctx:any){
  const t0=Date.now();
  const {data,error}=await ctx.admin.from("mv_ea_cargos_v1").select("*").order("fecha_cargo",{ascending:false}).order("hora_cargo",{ascending:false});if(error)throw error;
  const rows=(data||[]).filter((x:any)=>visible(ctx,x));
  const out=[];for(const x of rows)out.push(await mapCargo(ctx.admin,x));
  return {ok:true,version:VERSION,modulo:"EQUIPOS_AVERIADOS",accion:"LISTAR_CARGOS",cargos:out,registros:out.length,optimizadoV537:true,lecturaSelectivaTecnico:esTecnico(ctx.u.perfil),duracionMs:Date.now()-t0,fuente:"POSTGRESQL PILOTO"};
}
async function catalogos(ctx:any){
  let tecnicos:any[]=[];
  if(puedeGestionar(ctx.u.perfil)){
    let q=ctx.admin.from("app_users").select("usuario,nombres_apellidos,cuadrilla,sede,plataforma").eq("perfil","TECNICO").eq("estado","ACTIVO").order("sede").order("cuadrilla");
    if(esResponsable(ctx.u.perfil))q=q.eq("sede",ctx.u.sede);
    const {data,error}=await q;if(error)throw error;
    tecnicos=(data||[]).map((x:any)=>({usuario:x.usuario,tecnico:x.nombres_apellidos||x.usuario,cuadrilla:x.cuadrilla||"",sede:x.sede||"",plataforma:x.plataforma||""}));
  }
  return {ok:true,version:VERSION,modulo:"EQUIPOS_AVERIADOS",accion:"CATALOGOS",perfil:ctx.u.perfil,tipos:TIPOS,tecnicos};
}
function wrapText(text:string,font:any,size:number,max:number){
  const words=escPdf(text).split(/\s+/);const lines:string[]=[];let line="";
  for(const w of words){const test=line?line+" "+w:w;if(font.widthOfTextAtSize(test,size)<=max)line=test;else{if(line)lines.push(line);line=w}}
  if(line)lines.push(line);return lines;
}
async function cargoPdf(meta:any,equipos:any[]){
  const pdf=await PDFDocument.create(),page=pdf.addPage([595.28,841.89]);
  const reg=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const W=page.getWidth();
  function textAt(t:string,x:number,y:number,size=8,b=false){page.drawText(escPdf(t),{x,y,size,font:b?bold:reg})}
  function line(x1:number,y1:number,x2:number,y2:number){page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:.6})}
  function copy(top:number,label:string){
    const left=24,right=W-24,bottom=top-375;page.drawRectangle({x:left,y:bottom,width:right-left,height:365,borderWidth:1});
    textAt("VISUAL CONNECTIONS",left+10,top-24,11,true);
    textAt("CARGO DE ENTREGA DE EQUIPOS AVERIADOS",160,top-22,10,true);
    textAt(label,right-95,top-22,7,true);textAt(meta.idCargo,right-135,top-35,7,true);
    line(left+6,top-44,right-6,top-44);
    textAt("SEDE: "+meta.sede,left+10,top-61,8,true);textAt("PLATAFORMA: "+meta.plataforma,left+125,top-61,8,true);
    textAt("FECHA: "+meta.fecha+" "+meta.hora,left+330,top-61,8,true);
    textAt("CUADRILLA:",left+10,top-78,7,true);textAt(meta.cuadrilla,left+75,top-78,7);
    textAt("TECNICO:",left+10,top-94,7,true);textAt(meta.tecnico,left+75,top-94,7);
    textAt("SOLICITUD: "+meta.idSolicitud,left+340,top-94,7);
    let y=top-117;const cols=[left+8,left+35,left+150,left+315,right-8];
    for(let i=0;i<cols.length-1;i++)page.drawRectangle({x:cols[i],y:y-18,width:cols[i+1]-cols[i],height:18,borderWidth:.5});
    textAt("N",cols[0]+8,y-12,7,true);textAt("TIPO",cols[1]+5,y-12,7,true);textAt("SERIE / SN",cols[2]+5,y-12,7,true);textAt("MAC",cols[3]+5,y-12,7,true);
    y-=18;
    const list=[...equipos].slice(0,8);while(list.length<8)list.push({});
    list.forEach((e:any,i)=>{for(let j=0;j<cols.length-1;j++)page.drawRectangle({x:cols[j],y:y-20,width:cols[j+1]-cols[j],height:20,borderWidth:.5});
      textAt(String(i+1),cols[0]+9,y-13,6);textAt(e.tipo||"",cols[1]+4,y-13,6);textAt(e.serie||"",cols[2]+4,y-13,6);textAt(e.codigoCliente||"",cols[3]+4,y-13,6);y-=20});
    y-=32;line(left+55,y,left+205,y);line(left+330,y,right-45,y);textAt("TECNICO",left+115,y-12,7,true);textAt("RESPONSABLE DE ALMACEN",left+355,y-12,7,true);textAt(meta.recibidoPor,left+370,y-24,6);
    const note="El presente cargo acredita únicamente la recepción física de los equipos averiados detallados.";
    wrapText(note,reg,6,right-left-25).forEach((l:string,k:number)=>textAt(l,left+10,bottom+12+k*8,6));
  }
  copy(820,"COPIA TECNICO");line(24,421,W-24,421);textAt("CORTE AQUI",265,414,6);copy(405,"COPIA ALMACEN");
  return await pdf.save();
}
async function ensureCargoPdf(ctx:any,prep:any){
  const cargo=prep?.cargo;if(!cargo?.idCargo)return null;
  const {data:c,error:ce}=await ctx.admin.from("equipos_averiados_cargos_migracion").select("*").eq("id_cargo",cargo.idCargo).maybeSingle();if(ce||!c)throw new Error("No se encontró el cargo preparado.");
  if(c.estado==="GENERADO"&&c.link_pdf)return await mapCargo(ctx.admin,c);
  const {data:s,error:se}=await ctx.admin.from("equipos_averiados_solicitudes_migracion").select("*").eq("id",c.id_solicitud).maybeSingle();if(se||!s)throw new Error("No se encontró la solicitud del cargo.");
  const fecha=displayDate(c.fecha_cargo),hora=displayTime(c.hora_cargo);
  const bytes=await cargoPdf({idCargo:c.id_cargo,idSolicitud:c.id_solicitud,sede:c.sede||"",plataforma:c.plataforma||"",cuadrilla:c.cuadrilla||"",tecnico:c.tecnico||"",recibidoPor:c.recibido_por||"",fecha,hora},c.equipos||[]);
  const path=["equipos-averiados","cargos",norm(c.sede)||"SINSEDE",c.id_cargo+".pdf"].join("/");
  const {error:up}=await ctx.admin.storage.from(BUCKET).upload(path,bytes,{contentType:"application/pdf",upsert:true,cacheControl:"3600"});if(up)throw up;
  const uri="storage://"+BUCKET+"/"+path;
  const fin=await rpc(ctx.admin,"mv_ea_finalizar_recepcion_v399",{p_solicitud_id:c.solicitud_id_cliente,p_link_pdf:uri,p_nombre_pdf:c.id_cargo+".pdf",p_storage_path:path});
  if(fin?.cargo)fin.cargo.linkPdf=await signed(ctx.admin,uri);
  return fin;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const ctx=await context(req),d=await input(req),a=txt(d.accion);

    if(a==="catalogosEquiposAveriados")return json(await catalogos(ctx));
    if(a==="listarEquiposAveriados")return json(await listar(ctx,d));
    if(a==="listarCargosEquiposAveriados")return json(await listarCargos(ctx));

    if(a==="registrarEquiposAveriadosTecnico"){
      if(!esTecnico(ctx.u.perfil)||!ctx.p.registrar)throw new Error("Solo el técnico puede registrar sus equipos averiados.");
      const res=await rpc(ctx.admin,"mv_ea_registrar_tecnico",{
        p_usuario:ctx.u.usuario,p_perfil:ctx.u.perfil,p_sede:ctx.u.sede||"",p_plataforma:ctx.u.plataforma||"",
        p_cuadrilla:ctx.u.cuadrilla||"",p_tecnico:ctx.u.nombres_apellidos||ctx.u.usuario,p_equipos:d.equipos||[]
      });return json({...res,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(a==="crearSolicitudEquiposAveriadosAlmacen"){
      if(!puedeGestionar(ctx.u.perfil)||!ctx.p.registrar)throw new Error("Solo Responsable o Jefatura de Almacén puede crear la solicitud pendiente.");
      const ut=txt(d.usuarioTecnico);if(!ut)throw new Error("Seleccione el técnico.");
      const {data:t,error}=await ctx.admin.from("app_users").select("usuario,nombres_apellidos,perfil,sede,plataforma,cuadrilla,estado").eq("usuario",ut).maybeSingle();
      if(error||!t||norm(t.perfil)!=="TECNICO"||norm(t.estado)!=="ACTIVO")throw new Error("El usuario seleccionado no es técnico activo.");
      const res=await rpc(ctx.admin,"mv_ea_crear_solicitud_almacen",{
        p_usuario:ctx.u.usuario,p_perfil:ctx.u.perfil,p_sede_actor:ctx.u.sede||"",p_usuario_tecnico:t.usuario,
        p_tecnico:t.nombres_apellidos||t.usuario,p_sede_tecnico:t.sede||"",p_plataforma:t.plataforma||"",p_cuadrilla:t.cuadrilla||"",
        p_cantidad:Number(d.cantidadReferencial||1),p_observacion:txt(d.observacion)
      });return json({...res,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(a==="completarSolicitudEquiposAveriadosTecnico"){
      if(!esTecnico(ctx.u.perfil)||!ctx.p.editar)throw new Error("Solo el técnico puede completar esta solicitud.");
      const res=await rpc(ctx.admin,"mv_ea_completar_tecnico",{p_id:txt(d.id),p_usuario:ctx.u.usuario,p_perfil:ctx.u.perfil,p_equipos:d.equipos||[]});
      return json({...res,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(a==="validarRecepcionEquiposAveriados"){
      if(!puedeGestionar(ctx.u.perfil)||!ctx.p.validar)throw new Error("Solo Responsable o Jefatura de Almacén puede validar la recepción.");
      const sid=requestId(d.solicitudId||d.solicitud_id);
      const prep=await rpc(ctx.admin,"mv_ea_preparar_recepcion_v399",{
        p_id:txt(d.id),p_solicitud_id:sid,p_usuario:ctx.u.usuario,p_nombre_actor:ctx.u.nombres_apellidos||ctx.u.usuario,
        p_perfil:ctx.u.perfil,p_sede_actor:ctx.u.sede||"",p_decisiones:d.equipos||[],p_observacion_general:txt(d.observacionGeneral)
      });
      if(prep?.requierePdf||prep?.requiereFinalizar){
        const fin=await ensureCargoPdf(ctx,prep);
        return json({...fin,version:VERSION,solicitudId:sid,yaExistia:!!prep.yaExistia,fuente:"POSTGRESQL PILOTO"});
      }
      if(prep?.cargo?.linkPdf)prep.cargo.linkPdf=await signed(ctx.admin,prep.cargo.linkPdf);
      return json({...prep,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(a==="verificarRecepcionEquiposAveriadosV399"){
      if(!puedeGestionar(ctx.u.perfil))throw new Error("Solo Responsable o Jefatura de Almacén puede verificar la recepción.");
      const sid=requestId(d.solicitudId||d.solicitud_id);
      const id=txt(d.id||d.idSolicitud);
      const {data:sol,error:solError}=await ctx.admin.from("equipos_averiados_solicitudes_migracion").select("id,sede").eq("id",id).maybeSingle();
      if(solError||!sol)throw new Error("No se encontró la solicitud de equipos averiados.");
      if(esResponsable(ctx.u.perfil)&&norm(sol.sede)!==norm(ctx.u.sede))throw new Error("Sin acceso a solicitudes de otra sede.");
      const res=await rpc(ctx.admin,"mv_ea_verificar_recepcion_v399",{p_id:id,p_solicitud_id:sid});
      if(res?.cargo?.linkPdf)res.cargo.linkPdf=await signed(ctx.admin,res.cargo.linkPdf);
      return json({...res,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    if(a==="volverPendienteEquiposAveriados"){
      if(!esJefAlmacen(ctx.u.perfil)||!ctx.p.aprobar)throw new Error("Solo Jefatura de Almacén puede volver una recepción a pendiente.");
      const res=await rpc(ctx.admin,"mv_ea_volver_pendiente",{p_id:txt(d.id),p_usuario:ctx.u.usuario,p_perfil:ctx.u.perfil});
      return json({...res,version:VERSION,fuente:"POSTGRESQL PILOTO"});
    }

    return json({ok:false,version:VERSION,error:"Acción no soportada."},400);
  }catch(e){
    const m=e instanceof Error?e.message:String(e);
    return json({ok:false,version:VERSION,modulo:"EQUIPOS_AVERIADOS",error:m},/Sesión|vinculado/i.test(m)?401:/Solo |acceso|permiso/i.test(m)?403:400);
  }
});