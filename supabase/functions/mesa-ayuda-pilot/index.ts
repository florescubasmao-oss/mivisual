import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store"};
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actions=['listarConsultasReclamos','listarHistorialReclamo','registrarConsultaReclamo','actualizarConsultaReclamo','agregarComentarioReclamo','restablecerConsultaReclamo'];
const readActions=actions.slice(0,2);
const bucket='mesa-ayuda-pilot';
const safeURL=value=>{try{return ['https:','http:'].includes(new URL(value).protocol)?value:''}catch{return ''}};
async function sha(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')}
function clean(input){
 if(!actions.includes(input?.accion))throw Error('Acción no válida');
 const p={accion:input.accion};
 for(const key of ['id','estado','area','sede','categoria','subcategoria','urgencia','descripcion','codigoPedido','ticket','cliente','evidencias','comentario','motivo'])if(input[key]!==undefined){if(typeof input[key]!=='string'||input[key].length>20000)throw Error('Campo no válido');p[key]=input[key]}
 if(!readActions.includes(p.accion)){if(!uuid.test(input.requestId||''))throw Error('Identificador de operación no válido');p.requestId=input.requestId;if(p.accion!=='registrarConsultaReclamo'){if(!Number.isSafeInteger(input.version)||input.version<0)throw Error('Actualice el caso antes de continuar');p.version=input.version}}
 return p;
}
async function prepareDays(input,p,actor){
 const uploads=[];if(!/BONO|PRODUCCION|PUNTAJE/.test((p.categoria||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()))return uploads;
 if(!Array.isArray(input.detalleDias)||input.detalleDias.length<1||input.detalleDias.length>31)throw Error('Ingrese entre 1 y 31 días');
 p.detalleDias=[];
 for(const [di,day] of input.detalleDias.entries()){
  if(typeof day.fecha!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day.fecha)||!Number.isFinite(Number(day.puntos))||Number(day.puntos)<0||!Array.isArray(day.codigos)||day.codigos.length<1||day.codigos.length>6)throw Error('Día, puntos o códigos no válidos');
  const next={fecha:day.fecha,puntos:Number(day.puntos),codigos:[]};
  for(const [ci,c] of day.codigos.entries()){
   if(typeof c.codigo!=='string'||!c.codigo.trim()||c.codigo.length>200)throw Error('Código no válido');
   const item={codigo:c.codigo.trim(),actaUrl:'',actaNombre:''};
   if(c.acta){
    const f=c.acta;if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(f.mime)||typeof f.base64!=='string'||f.base64.length>6990508||typeof f.nombre!=='string'||f.nombre.length>255)throw Error('Acta: use PDF, JPG, PNG o WEBP de hasta 5 MB');
    let bytes;try{bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0))}catch{throw Error('Acta no válida')}
    if(!bytes.length||bytes.length>5242880)throw Error('Acta demasiado grande o vacía');
    const signature=Array.from(bytes.slice(0,12));const valid=f.mime==='application/pdf'?new TextDecoder().decode(bytes.slice(0,5))==='%PDF-':f.mime==='image/jpeg'?signature[0]===255&&signature[1]===216&&signature[2]===255:f.mime==='image/png'?signature.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
    if(!valid)throw Error('El contenido del acta no coincide con su formato');
    const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[f.mime];
    item.actaPath=actor+'/'+p.requestId+'/'+di+'-'+ci+'-'+await sha(bytes)+'.'+ext;item.actaNombre=f.nombre;uploads.push({path:item.actaPath,bytes,mime:f.mime});
   }
   next.codigos.push(item);
  }
  p.detalleDias.push(next);
 }
 return uploads;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({ok:false,error:'Use POST'},405);
 try{
  const authorization=req.headers.get('Authorization')||'';if(!/^Bearer\s+\S+/i.test(authorization))return respond({ok:false,error:'Sesión requerida'},401);
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!secret)throw Error('config');
  const auth=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await auth.auth.getUser();if(authError||!identity?.user)return respond({ok:false,error:'Sesión no válida'},401);
  if(Number(req.headers.get('content-length'))>10485760)return respond({ok:false,error:'Máximo 10 MB por envío'},413);
  const reader=req.body?.getReader();let size=0;const chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>10485760){await reader.cancel();return respond({ok:false,error:'Máximo 10 MB por envío'},413)}chunks.push(value)}}
  const bytes=new Uint8Array(size);let offset=0;for(const x of chunks){bytes.set(x,offset);offset+=x.length}
  let input,p,uploads;try{input=JSON.parse(new TextDecoder().decode(bytes));p=clean(input);uploads=p.accion==='registrarConsultaReclamo'?await prepareDays(input,p,identity.user.id):[]}catch(e){return respond({ok:false,error:e.message||'Datos no válidos'},400)}
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  if(p.accion==='registrarConsultaReclamo'){
   const {error}=await admin.rpc('mesa_pilot_rpc',{actor:identity.user.id,p:{...p,accion:'validarRegistro'}});if(error)return respond({ok:false,error:error.code==='P0001'?error.message:'Datos no válidos'},400);
   for(const f of uploads){const {error}=await admin.storage.from(bucket).upload(f.path,f.bytes,{contentType:f.mime,upsert:false});if(error&&String(error.statusCode)!=='409'&&error.error!=='Duplicate')throw Error('upload')}
  }
  const {data,error}=await admin.rpc('mesa_pilot_rpc',{actor:identity.user.id,p});
  if(error)return respond({ok:false,error:error.code==='P0001'?error.message:'No se pudo procesar la operación'},error.code==='P0001'?409:500);
  for(const c of data.casos||[]){for(const day of c.detalleDias||[]){for(const item of day.codigos||[]){if(item.actaPath){const {data:signed,error}=await admin.storage.from(bucket).createSignedUrl(item.actaPath,600);if(error)throw Error('sign');item.actaUrl=signed.signedUrl}else item.actaUrl=safeURL(item.actaUrl)}}}
  return respond(data);
 }catch{return respond({ok:false,error:'No se pudo completar. Reintente la misma operación.'},500)}
});
