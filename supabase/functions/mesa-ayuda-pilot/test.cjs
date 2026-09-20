const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(__dirname+'/index.ts','utf8').replace(/^import .*;\n/,'');
let handler,authValid=true,rpcError=null,rpcCalls=[],uploads=[],rpcData={ok:true},uploadError=null;
const actor='1495c92a-72a2-41f8-a592-0e4e9ed3e2b4';
const ctx={URL,Response,TextDecoder,Uint8Array,atob,crypto:webcrypto,Deno:{env:{get:()=> 'set'},serve:fn=>handler=fn},createClient:(_u,_k,o)=>o.global?{auth:{getUser:async()=>({data:{user:authValid?{id:actor}:null}})}}:{rpc:async(n,p)=>{rpcCalls.push(p);return {data:rpcData,error:rpcError}},storage:{from:()=>({upload:async(path,bytes,opt)=>{uploads.push({path,bytes,opt});return {error:uploadError}},createSignedUrl:async(path)=>({data:{signedUrl:'https://example.com/private'}})})}}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const payload={accion:'registrarConsultaReclamo',requestId:'be479a81-45a8-4b53-a7f3-e45b0b726093',categoria:'BONO, PRODUCCION Y PUNTAJE',subcategoria:'PUNTOS NO CONTABILIZADOS',descripcion:'QA',detalleDias:[{fecha:'2026-09-20',puntos:2,codigos:[{codigo:'0001',acta:{nombre:'test.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4\nQA').toString('base64')}}]}]};
async function call(p={accion:'listarConsultasReclamos'},token=true,method='POST'){return handler(new Request('https://example.invalid/',{method,headers:token?{Authorization:'Bearer test'}:{},...(method==='POST'?{body:JSON.stringify(p)}:{})}))}
(async()=>{
assert.equal((await call({},false)).status,401);authValid=false;assert.equal((await call()).status,401);authValid=true;
assert.equal((await call({},true,'GET')).status,405);assert.equal((await call({accion:'validarRegistro'})).status,400);
rpcData={ok:true,casos:[{detalleDias:[{codigos:[{actaUrl:'javascript:alert(1)'},{actaPath:'private'}]}]}]};
let r=await call({accion:'listarConsultasReclamos',usuario:'ADMIN',actor:'forged',perfil:'JEFATURA'});assert.equal(r.status,200);let d=await r.json();assert.equal(d.casos[0].detalleDias[0].codigos[0].actaUrl,'');assert.equal(d.casos[0].detalleDias[0].codigos[1].actaUrl,'https://example.com/private');assert.equal(rpcCalls.at(-1).actor,actor);assert.equal(rpcCalls.at(-1).p.usuario,undefined);
rpcError={code:'P0001',message:'Usuario no vinculado o inactivo'};assert.equal((await call(payload)).status,400);assert.equal(uploads.length,0);rpcError=null;rpcData={ok:true};
r=await call(payload);assert.equal(r.status,200);assert.equal(uploads.length,1);assert.ok(uploads[0].path.startsWith(actor+'/'+payload.requestId+'/'));assert.equal(uploads[0].opt.upsert,false);let stored=rpcCalls.at(-1).p;assert.equal(stored.detalleDias[0].codigos[0].acta,undefined);assert.ok(stored.detalleDias[0].codigos[0].actaPath);
await call(payload);assert.equal(uploads[0].path,uploads[1].path);
let bad=JSON.parse(JSON.stringify(payload));bad.detalleDias[0].codigos[0].acta.base64=Buffer.from('fake pdf').toString('base64');assert.equal((await call(bad)).status,400);
bad=JSON.parse(JSON.stringify(payload));bad.detalleDias[0].puntos=-1;assert.equal((await call(bad)).status,400);
assert.equal((await call({accion:'actualizarConsultaReclamo',requestId:payload.requestId,id:'QA'})).status,400);
rpcError={code:'XX000',message:'private database detail'};r=await call();assert.equal(r.status,500);assert.ok(!(await r.text()).includes('private database detail'));
console.log('Mesa edge auth, actor spoofing, validation, private URLs, upload format, deterministic retry, error handling: PASS (mock dependencies)');
})().catch(e=>{console.error(e);process.exit(1)});
