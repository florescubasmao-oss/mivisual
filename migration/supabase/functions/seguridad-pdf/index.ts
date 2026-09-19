import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, degrees } from "npm:pdf-lib@1.17.1";

const VERSION="V2-SEGURIDAD-PDF-V442-20260919";
const BUCKET="mi-visual-evidencias";
const LOGO="https://florescubasmao-oss.github.io/mivisual/img/logo-visual-connections.png?v=V438";
const W=841.89,H=595.28,M=8;
const DARK=rgb(.07,.10,.15),BLUE=rgb(.09,.24,.45),LINE=rgb(.28,.33,.41),HEAD=rgb(.93,.95,.97),RED=rgb(.84,.07,.10),TRACE=rgb(.49,.18,.07);
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};

function out(v:any,s=200){return new Response(JSON.stringify(v),{status:s,headers:{...CORS,"Content-Type":"application/json; charset=utf-8"}})}
function t(v:any){return String(v??"").trim()}
function n(v:any){return t(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function key(which:string){
  const direct=Deno.env.get(which); if(direct)return direct;
  const raw=Deno.env.get(which==="SUPABASE_ANON_KEY"?"SUPABASE_PUBLISHABLE_KEYS":"SUPABASE_SECRET_KEYS")||"";
  try{const x=JSON.parse(raw);return x.default||Object.values(x)[0]||""}catch(_){return raw}
}
async function ctx(req:Request){
  const url=Deno.env.get("SUPABASE_URL")||"", pub=key("SUPABASE_ANON_KEY"), sec=key("SUPABASE_SERVICE_ROLE_KEY");
  const ah=req.headers.get("Authorization")||"";
  if(!url||!pub||!sec)throw Error("Configuración Supabase incompleta.");
  if(!ah.toLowerCase().startsWith("bearer "))throw Error("Sesión requerida.");
  const auth=createClient(url,pub,{global:{headers:{Authorization:ah}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:e}=await auth.auth.getUser(); if(e||!u?.user)throw Error("Sesión no válida.");
  const {data:au,error:ae}=await admin.from("app_users").select("usuario,estado,auth_user_id").eq("auth_user_id",u.user.id).maybeSingle();
  if(ae||!au)throw Error("El usuario Auth no está vinculado a MI VISUAL.");
  if(n(au.estado)!=="ACTIVO")throw Error("Usuario MI VISUAL inactivo.");
  return {admin,usuario:au.usuario};
}
async function rpc(admin:any,fn:string,args:any){const {data,error}=await admin.rpc(fn,args);if(error)throw Error(error.message);return data}
function pathRef(v:any){const s=t(v),p="storage://"+BUCKET+"/";return s.startsWith(p)?s.slice(p.length):""}
async function signed(admin:any,ref:string){const p=pathRef(ref);if(!p)return ref;const {data}=await admin.storage.from(BUCKET).createSignedUrl(p,3600);return data?.signedUrl||""}
function num(v:any){return String(Number(t(v).replace(/\D/g,""))||0).padStart(6,"0")}
function safe(s:string){return s.replace(/[\/\\?#%:*|"<>]+/g,"-").replace(/\s+/g," ").trim().slice(0,180)}
function fileName(tipo:string,d:any){return tipo+" N° "+num(d.numero)+" - "+t(d.fecha).replace(/\//g,"-")+" - "+t(d.cuadrilla)+" - C. VISUAL SAC.pdf"}
function y(top:number,h:number){return H-top-h}
function box(p:any,x:number,top:number,w:number,h:number,fill?:any){p.drawRectangle({x,y:y(top,h),width:w,height:h,borderColor:LINE,borderWidth:.65,...(fill?{color:fill}:{})})}
function width(f:any,s:string,z:number){try{return f.widthOfTextAtSize(s,z)}catch(_){return s.length*z*.5}}
function wrap(f:any,s:any,z:number,mw:number){
  const a:string[]=[]; for(const para of String(s??"").split(/\n/)){let line="";for(const word of (para.trim()?para.trim().split(/\s+/):[""])){const q=line?line+" "+word:word;if(line&&width(f,q,z)>mw){a.push(line);line=word}else line=q}a.push(line)} return a;
}
function text(p:any,f:any,s:any,x:number,top:number,w:number,h:number,o:any={}){
  const z=o.z||6,c=o.c||DARK,pad=2,lh=z*1.12,ls=wrap(f,s,z,w-pad*2),max=Math.max(1,Math.floor((h-pad*2)/lh));
  const q=ls.slice(0,max); let yy=H-top-pad-z;
  if(o.mid)yy=H-top-(h-q.length*lh)/2-z;
  for(const line of q){let xx=x+pad;if(o.center)xx=x+(w-width(f,line,z))/2;p.drawText(line,{x:xx,y:yy,size:z,font:f,color:c});yy-=lh}
}
function cell(p:any,f:any,s:any,x:number,top:number,w:number,h:number,o:any={}){box(p,x,top,w,h,o.fill);text(p,o.font||f,s,x,top,w,h,o)}
function X(p:any,x:number,top:number,w:number,h:number){const yy=y(top,h),d=Math.min(5,w*.18,h*.18);p.drawLine({start:{x:x+d,y:yy+d},end:{x:x+w-d,y:yy+h-d},thickness:1.1,color:BLUE});p.drawLine({start:{x:x+d,y:yy+h-d},end:{x:x+w-d,y:yy+d},thickness:1.1,color:BLUE})}
function check(p:any,x:number,top:number,w:number,h:number){const yy=y(top,h),cx=x+w/2,cy=yy+h/2;p.drawLine({start:{x:cx-5,y:cy},end:{x:cx-1,y:cy-4},thickness:1.4,color:BLUE});p.drawLine({start:{x:cx-1,y:cy-4},end:{x:cx+6,y:cy+5},thickness:1.4,color:BLUE})}
async function bytes(admin:any,ref:string){
  if(!ref)return null; const sp=pathRef(ref);
  try{
    if(sp){const {data}=await admin.storage.from(BUCKET).download(sp);return data?new Uint8Array(await data.arrayBuffer()):null}
    let u=ref; const m=ref.match(/[-\w]{25,}/); if(ref.includes("drive.google.com")&&m)u="https://drive.google.com/uc?export=download&id="+m[0];
    const r=await fetch(u,{redirect:"follow"});return r.ok?new Uint8Array(await r.arrayBuffer()):null;
  }catch(_){return null}
}
async function img(pdf:any,admin:any,ref:string,cache:Map<string,any>){
  if(!ref)return null;if(cache.has(ref))return cache.get(ref);const b=await bytes(admin,ref);let im=null;
  try{if(b)im=(b[0]===0x89&&b[1]===0x50)?await pdf.embedPng(b):await pdf.embedJpg(b)}catch(_){}
  cache.set(ref,im);return im;
}
function fit(p:any,im:any,x:number,top:number,w:number,h:number){if(!im)return;const s=Math.min(w/im.width,h/im.height),dw=im.width*s,dh=im.height*s;p.drawImage(im,{x:x+(w-dw)/2,y:y(top,h)+(h-dh)/2,width:dw,height:dh})}
async function setup(pdf:any,admin:any,a:any){
  const f={r:await pdf.embedFont(StandardFonts.Helvetica),b:await pdf.embedFont(StandardFonts.HelveticaBold),i:await pdf.embedFont(StandardFonts.HelveticaOblique)};
  const cache=new Map<string,any>(); let logo=null;try{const b=await bytes(admin,LOGO);if(b)logo=await pdf.embedPng(b)}catch(_){}
  return {f,cache,logo};
}
function header(p:any,f:any,logo:any,tipo:string,d:any,title:string,code:string){
  const x=M,top=M,w=W-M*2,h=48,a=w*.18,b=w*.64,c=w-a-b;
  cell(p,f.r,"",x,top,a,h);if(logo)fit(p,logo,x+4,top+3,a-8,h-6);else text(p,f.b,"CORPORACIÓN\nVISUAL Connections",x,top,a,h,{z:8,center:true,mid:true});
  cell(p,f.b,title,x+a,top,b,h,{z:12,center:true,mid:true});
  cell(p,f.r,"",x+a+b,top,c,h);text(p,f.b,tipo+" N°",x+a+b,top+3,c,8,{z:6,center:true});text(p,f.b,num(d.numero),x+a+b,top+11,c,13,{z:11,c:RED,center:true});text(p,f.b,code,x+a+b,top+25,c,7,{z:5.5,center:true});text(p,f.r,"Versión: "+(d.version||1),x+a+b,top+33,c,7,{z:5.3,center:true});text(p,f.r,"Vigencia: 02/10/2023",x+a+b,top+40,c,7,{z:5,center:true});
  return top+h;
}
function metaATS(p:any,f:any,a:any,pet:any,top:number){
  const x=M,w=W-M*2,r=15,c1=w*.18,c2=w*.32,c3=w*.18,c4=w-c1-c2-c3,rows=[["TRABAJO A REALIZAR",a.trabajo||"","PERMISO PETAR N°",pet?num(pet.numero):""],["FECHA",a.fecha||"","LUGAR DE TRABAJO",a.lugarTrabajo||""],["HORA DE INICIO",a.horaInicio||"","HORA FINAL",a.horaFinal||""]];
  rows.forEach((z:any[],i:number)=>{const q=top+i*r;cell(p,f.b,z[0],x,q,c1,r,{z:5.8});cell(p,f.i,z[1],x+c1,q,c2,r,{z:7,c:BLUE});cell(p,f.b,z[2],x+c1+c2,q,c3,r,{z:5.8});cell(p,f.i,z[3],x+c1+c2+c3,q,c4,r,{z:7,c:BLUE})});return top+r*3;
}
const RISKS=[["ELECTROCUCION","Electrocución"],["CAIDA DE OBJETOS","Caída objetos"],["CAIDA A DESNIVEL","Caída desnivel"],["CAIDA A NIVEL","Caída nivel"],["GOLPES","Golpes"],["CORTES","Cortes"],["ATRAPAMIENTO","Atrapamiento"],["LESIONES EN MANOS","Lesiones manos"],["CONTACTO CON SUSTANCIAS PELIGROSAS","Sust. peligrosas"],["PROYECCION DE PARTICULAS","Proyección"],["OTROS","Otros"]];
function taskList(a:any){return (a.tareas||[]).filter((q:any)=>t(q.tarea)&&((q.danos||[]).length||t(q.controles)))}
function matrix(p:any,f:any,a:any,top:number,h:number){
  const tasks=taskList(a),x=M,w=W-M*2,tw=w*.20,cw=w*.36,rw=(w-tw-cw)/11,h1=15,h2=42,bt=top+h1+h2,bh=h-h1-h2,rh=bh/Math.max(1,tasks.length);
  cell(p,f.b,"LISTA DE TAREAS",x,top,tw,h1+h2,{z:6,center:true,mid:true,fill:HEAD});cell(p,f.b,"POSIBILIDAD DE DAÑO",x+tw,top,rw*11,h1,{z:6,center:true,fill:HEAD});cell(p,f.b,"MEDIDAS DE CONTROL",x+tw+rw*11,top,cw,h1+h2,{z:6,center:true,mid:true,fill:HEAD});
  RISKS.forEach((r:any[],i:number)=>{const xx=x+tw+i*rw;box(p,xx,top+h1,rw,h2,HEAD);p.drawText(r[1],{x:xx+rw/2+2,y:y(top+h1,h2)+3,size:4.1,font:f.r,color:DARK,rotate:degrees(90)})});
  tasks.forEach((q:any,ri:number)=>{const rt=bt+ri*rh,set=new Set((q.danos||[]).map(n));cell(p,f.i,q.tarea+(set.has("OTROS")&&q.otrosDano?"\nOTRO RIESGO: "+q.otrosDano:""),x,rt,tw,rh,{z:tasks.length>7?4.6:5.8,c:BLUE,mid:true});RISKS.forEach((r:any[],i:number)=>{const xx=x+tw+i*rw;box(p,xx,rt,rw,rh);if(set.has(r[0]))X(p,xx,rt,rw,rh)});cell(p,f.i,String(q.controles||"").split(/\n+/).filter(Boolean).map((s:string)=>"• "+s).join("\n"),x+tw+rw*11,rt,cw,rh,{z:tasks.length>7?4.1:5.1,c:BLUE,mid:true})});
  return top+h;
}
function eppTools(p:any,f:any,a:any,cat:any,top:number){
  const x=M,w=W-M*2,h=50,l=w*.42,r=w-l,hh=13;cell(p,f.b,"EQUIPOS DE PROTECCIÓN PERSONAL",x,top,l,hh,{z:6,center:true,fill:HEAD});cell(p,f.b,"HERRAMIENTAS Y EQUIPOS",x+l,top,r,hh,{z:6,center:true,fill:HEAD});box(p,x,top+hh,l,h-hh);box(p,x+l,top+hh,r,h-hh);
  (a.epp||[]).forEach((v:string,i:number)=>text(p,f.i,"× "+v,x+4+(i%2)*(l-8)/2,top+hh+3+Math.floor(i/2)*8,(l-8)/2,8,{z:5.8,c:BLUE}));
  const mp=new Map((cat.herramientas||[]).map((z:any)=>[n(z.herramienta),n(z.categoria)||"OTROS"])),g:any={};(a.herramientas||[]).forEach((v:string)=>{const c=mp.get(n(v))||"OTROS";(g[c]||(g[c]=[])).push(v)});
  Object.keys(g).slice(0,6).forEach((c,i)=>{const cw=(r-8)/3,xx=x+l+4+(i%3)*cw,tt=top+hh+2+Math.floor(i/3)*17;text(p,f.b,c,xx,tt,cw-2,6,{z:4.9});text(p,f.i,g[c].map((z:string)=>"× "+z).join(" · "),xx,tt+6,cw-2,11,{z:4.6,c:BLUE})});return top+h;
}
async function signatures(p:any,pdf:any,admin:any,f:any,a:any,top:number,cache:Map<string,any>,petar=false){
  const x=M,w=W-M*2,hh=11,row=petar?25:28,c1=w*(petar?.12:.40),c2=w*(petar?.42:.06),c3=w-c1-c2;
  cell(p,f.b,petar?"PERSONAS ENCARGADAS DE LA EJECUCIÓN DEL TRABAJO":"HE LEÍDO Y ENTENDIDO ESTE DOCUMENTO",x,top,w,hh,{z:5.7,center:true,fill:HEAD});top+=hh;
  cell(p,f.b,petar?"OCUPACIÓN O CARGO":"NOMBRE Y APELLIDOS",x,top,c1,hh,{z:5.3,center:true,fill:HEAD});cell(p,f.b,petar?"NOMBRES Y APELLIDOS":"CARGO",x+c1,top,c2,hh,{z:5.3,center:true,fill:HEAD});cell(p,f.b,"FIRMA",x+c1+c2,top,c3,hh,{z:5.3,center:true,fill:HEAD});top+=hh;
  for(const m of a.integrantes||[]){const ac=(a.aceptaciones||[]).find((z:any)=>n(z.usuario)===n(m.usuario));cell(p,f.i,petar?m.cargo:m.nombre,x,top,c1,row,{z:5.8,c:BLUE,center:petar,mid:true});cell(p,f.i,petar?m.nombre:m.cargo,x+c1,top,c2,row,{z:5.8,c:BLUE,center:!petar,mid:true});box(p,x+c1+c2,top,c3,row);if(ac?.firma?.url){const im=await img(pdf,admin,ac.firma.url,cache);fit(p,im,x+c1+c2+4,top+2,c3-8,row-(ac.autocompletada?9:4))}if(n(ac?.autocompletada)==="SI")text(p,f.b,"AUTORIZADA POR "+(ac.autorizadaPerfil||"RESPONSABLE")+": "+(ac.autorizadaNombre||ac.autorizadaPor||""),x+c1+c2+2,top+row-7,c3-4,6,{z:4,c:TRACE,center:true});top+=row}
  const resp=a.supervisorFirma||a.validadorFirma;if(resp){top+=2;const r1=w*.18,r2=w*.38,r3=w-r1-r2;cell(p,f.b,"AUTORIZACIÓN Y SUPERVISIÓN",x,top,w,hh,{z:5.7,center:true,fill:HEAD});top+=hh;cell(p,f.b,"CARGO",x,top,r1,hh,{z:5.2,center:true,fill:HEAD});cell(p,f.b,"NOMBRES Y APELLIDOS",x+r1,top,r2,hh,{z:5.2,center:true,fill:HEAD});cell(p,f.b,"FIRMA",x+r1+r2,top,r3,hh,{z:5.2,center:true,fill:HEAD});top+=hh;cell(p,f.i,resp.perfil||"",x,top,r1,row,{z:5.6,c:BLUE,center:true,mid:true});cell(p,f.i,resp.nombre||"",x+r1,top,r2,row,{z:5.6,c:BLUE,mid:true});box(p,x+r1+r2,top,r3,row);if(resp?.firma?.url){const im=await img(pdf,admin,resp.firma.url,cache);fit(p,im,x+r1+r2+4,top+2,r3-8,row-4)}top+=row}return top;
}
async function renderATS(admin:any,a:any,pet:any,cat:any){
  const pdf=await PDFDocument.create(),p=pdf.addPage([W,H]),s=await setup(pdf,admin,a),f=s.f;let top=header(p,f,s.logo,"ATS",a,"ANÁLISIS DE TRABAJO SEGURO (ATS)","SGSST_ATS_01");top=metaATS(p,f,a,pet,top+2);top=eppTools(p,f,a,cat,top+2);
  const sig=24+(a.integrantes||[]).length*28+(a.supervisorFirma||a.validadorFirma?52:0),mh=Math.max(120,H-M-sig-top-6);top=matrix(p,f,a,top+2,mh);await signatures(p,pdf,admin,f,a,top+2,s.cache,false);return new Uint8Array(await pdf.save());
}
function metaPET(p:any,f:any,d:any,top:number){const x=M,w=W-M*2,r=14,c1=w*.16,c2=w*.34,c3=w*.16,c4=w-c1-c2-c3,rows=[["TRABAJO",d.trabajo||"","FECHA",d.fecha||""],["UBICACIÓN",d.ubicacion||"","HORA INICIO",d.horaInicio||""],["","", "HORA FINAL",d.horaFinal||""]];rows.forEach((z:any[],i:number)=>{const q=top+i*r;if(i<2){cell(p,f.b,z[0],x,q,c1,r,{z:5.7});cell(p,f.i,z[1],x+c1,q,c2,r,{z:6.6,c:BLUE})}cell(p,f.b,z[2],x+c1+c2,q,c3,r,{z:5.7});cell(p,f.i,z[3],x+c1+c2+c3,q,c4,r,{z:6.6,c:BLUE})});return top+r*3}
function checklist(p:any,f:any,d:any,top:number,h:number){const x=M,w=W-M*2,nw=w*.04,vw=w*.14,ow=w*.24,qw=w-nw-vw-ow,hh=17,cs=(d.checklist||[]).filter((z:any)=>n(z.estado)),rh=(h-hh)/Math.max(1,cs.length);cell(p,f.b,"N°",x,top,nw,hh,{z:5.5,center:true,fill:HEAD});cell(p,f.b,"LISTA DE VERIFICACIÓN",x+nw,top,qw,hh,{z:5.5,center:true,fill:HEAD});cell(p,f.b,"VERIFICACIÓN",x+nw+qw,top,vw,hh,{z:5.5,center:true,fill:HEAD});cell(p,f.b,"OBSERVACIONES",x+nw+qw+vw,top,ow,hh,{z:5.5,center:true,fill:HEAD});cs.forEach((z:any,i:number)=>{const q=top+hh+i*rh,e=n(z.estado);cell(p,f.b,String(i+1),x,q,nw,rh,{z:5.2,center:true,mid:true});cell(p,f.r,z.texto||"",x+nw,q,qw,rh,{z:5.1,mid:true});box(p,x+nw+qw,q,vw,rh);if(e==="CUMPLE")check(p,x+nw+qw,q,vw,rh);else if(e==="NO CUMPLE")X(p,x+nw+qw,q,vw,rh);else text(p,f.i,"N/A",x+nw+qw,q,vw,rh,{z:6.5,c:BLUE,center:true,mid:true});cell(p,f.i,z.observacion||"",x+nw+qw+vw,q,ow,rh,{z:5,c:BLUE,mid:true})});return top+h}
async function renderPET(admin:any,a:any,d:any){
  const pdf=await PDFDocument.create(),p=pdf.addPage([W,H]),s=await setup(pdf,admin,a),f=s.f;let top=header(p,f,s.logo,"PETAR",d,"PERMISO ESCRITO PARA TRABAJOS DE ALTO RIESGO (PETAR) - ALTURA","SGSST_PTAR_01");top=metaPET(p,f,d,top+2);
  text(p,f.r,"INSTRUCCIONES: 1. Tomar como referencia el procedimiento para Trabajo en Altura. 2. El PETAR debe permanecer en el área de trabajo. 3. Válido solo para turno y fecha indicados. 4. Todo NO CUMPLE debe sustentarse en OBSERVACIONES. 5. Si un requerimiento crítico no se cumple, la autorización NO PROCEDE.",M,top+2,W-M*2,27,{z:5.1});top+=29;
  const sig=22+(a.integrantes||[]).length*25+(a.supervisorFirma||a.validadorFirma?49:0),eppH=40,ch=Math.max(180,H-M-top-sig-eppH-10);top=checklist(p,f,d,top+2,ch);
  cell(p,f.b,"EQUIPO DE PROTECCIÓN REQUERIDO",M,top+2,W-M*2,12,{z:5.7,center:true,fill:HEAD});box(p,M,top+14,W-M*2,28);(d.epp||[]).forEach((v:string,i:number)=>text(p,f.i,"× "+v,M+5+(i%3)*(W-M*2-10)/3,top+17+Math.floor(i/3)*7,(W-M*2-10)/3,7,{z:5.4,c:BLUE}));top+=42;
  await signatures(p,pdf,admin,f,a,top+2,s.cache,true);return new Uint8Array(await pdf.save());
}
async function upload(admin:any,a:any,tipo:string,d:any,b:Uint8Array){const name=fileName(tipo,d),m=t(d.fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/),folder=m?m[3]+"/"+m[2]:"SIN-FECHA/00",path="seguridad/pdf/"+folder+"/"+safe(a.id)+"/"+crypto.randomUUID()+"/"+safe(name);const {data,error}=await admin.storage.from(BUCKET).upload(path,b,{contentType:"application/pdf",cacheControl:"3600",upsert:false});if(error)throw error;return {path:data.path,ref:"storage://"+BUCKET+"/"+data.path,name}}
async function close(admin:any,usuario:string,mode:string,d:any){
  const prep=await rpc(admin,mode==="SUPERVISOR"?"mv_seguridad_preparar_cierre_supervisor":"mv_seguridad_preparar_cierre_final",{p_usuario:usuario,p_id:t(d.id),p_gps:t(d.gps),p_motivo:t(d.motivo)}),a=prep.ats,pet=prep.petar,cat=await rpc(admin,"mv_seguridad_catalogo",{}),up:any[]=[];
  try{
    const ao=t(a.pdfUrl)?{ref:a.pdfUrl,path:t(a.pdfId),name:fileName("ATS",a)}:await upload(admin,a,"ATS",a,await renderATS(admin,a,pet,cat));if(!t(a.pdfUrl))up.push(ao);
    let po:any=null;if(pet){po=t(pet.pdfUrl)?{ref:pet.pdfUrl,path:t(pet.pdfId),name:fileName("PETAR",pet)}:await upload(admin,a,"PETAR",pet,await renderPET(admin,a,pet));if(!t(pet.pdfUrl))up.push(po)}
    const conf=await rpc(admin,mode==="SUPERVISOR"?"mv_seguridad_confirmar_cierre_supervisor":"mv_seguridad_confirmar_cierre_final",{p_usuario:usuario,p_id:t(d.id),p_expected_updated_at:prep.expectedUpdatedAt,p_pdf_ats_url:ao.ref,p_pdf_ats_id:ao.path||"",p_pdf_petar_url:po?.ref||"",p_pdf_petar_id:po?.path||"",p_gps:t(d.gps),p_motivo:t(d.motivo)});
    return {...conf,version:VERSION,renderer:"PDF-LIB-V442",pdfStorageRef:conf.pdfUrl||ao.ref,petarPdfStorageRef:conf.petarPdfUrl||po?.ref||"",pdfUrl:await signed(admin,conf.pdfUrl||ao.ref),petarPdfUrl:po?await signed(admin,conf.petarPdfUrl||po.ref):"",pdfNombre:ao.name,petarPdfNombre:po?.name||""};
  }catch(e){const ps=up.map(z=>z.path).filter(Boolean);if(ps.length)try{await admin.storage.from(BUCKET).remove(ps)}catch(_){}throw e}
}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return out({ok:false,error:"Método no permitido.",version:VERSION},405);try{const c=await ctx(req),d=await req.json(),a=n(d.accion);if(a==="AUTORIZAR_SUPERVISOR")return out(await close(c.admin,c.usuario,"SUPERVISOR",d));if(a==="VALIDAR_FINAL")return out(await close(c.admin,c.usuario,"FINAL",d));return out({ok:false,error:"Acción PDF no soportada.",version:VERSION},400)}catch(e){const m=e instanceof Error?e.message:String(e);return out({ok:false,modulo:"SEGURIDAD",error:m,version:VERSION},/Sesión|Auth/i.test(m)?401:/Solo |No puede|Fuera/i.test(m)?403:400)}});